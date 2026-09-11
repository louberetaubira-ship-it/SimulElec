'use client';

/**
 * Espace élève : page d'atterrissage après la connexion (tutoiement).
 * Identité, chiffres, TP terminés / en cours / à faire, bilan de compétences cumulé.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getMyProfile } from '@/lib/db/profiles';
import { listMyAttempts } from '@/lib/db/attempts';
import { listAssignments } from '@/lib/db/classes';
import { listTps, type TpSummary } from '@/lib/db/tps';
import { createClient } from '@/lib/supabase/client';
import { competenceTps, eleveStats } from '@/lib/eleve-stats';
import { COMPETENCES, DIPLOMAS, masteryOf, type CompetenceEval, type DiplomaId } from '@/lib/data/competences';
import type { AttemptRow, ClassRow, ProfileRow } from '@/lib/db/types';
import BilanExport from '@/components/parcours/BilanExport';
import {
  Barre,
  BilanCompetences,
  Chiffre,
  Message,
  PageTitle,
  Panneau,
  dateCourte,
} from '@/components/gestion/ui';

/** Nombre d'étapes d'un parcours. */
const ETAPES = 11;

/** Bilan complet : toutes les compétences du diplôme, celles non travaillées comprises. */
function bilanComplet(diploma: DiplomaId | null, acquis: CompetenceEval[]): CompetenceEval[] {
  if (!diploma) return acquis;
  const parCode = new Map(acquis.map((c) => [c.code, c]));
  return COMPETENCES[diploma].map(
    (c) =>
      parCode.get(c.code) ?? {
        code: c.code,
        label: c.label,
        domains: [],
        score: 0,
        mastery: masteryOf(0, false),
      },
  );
}

export default function MoiPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [tps, setTps] = useState<TpSummary[]>([]);
  const [aFaire, setAFaire] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!alive) return;
        setProfile(p);
        const [mine, catalogue] = await Promise.all([listMyAttempts(), listTps()]);
        if (!alive) return;
        setAttempts(mine);
        setTps(catalogue);
        if (p?.class_id) {
          const supabase = createClient();
          const { data } = await supabase
            .from('classes')
            .select('id, name, level, teacher_id, join_code, diploma, archived')
            .eq('id', p.class_id)
            .maybeSingle();
          if (!alive) return;
          setKlass((data as ClassRow | null) ?? null);
          const devoirs = await listAssignments(p.class_id);
          if (!alive) return;
          setAFaire(Array.from(new Set(devoirs.map((d) => d.tp_id))));
        }
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => eleveStats(attempts), [attempts]);
  const titres = useMemo(() => new Map(tps.map((t) => [t.id, t.title])), [tps]);
  const tpsParCode = useMemo(() => {
    const brut = competenceTps(attempts);
    const out: Record<string, string[]> = {};
    Object.entries(brut).forEach(([code, ids]) => {
      out[code] = ids.map((id) => titres.get(id) ?? id);
    });
    return out;
  }, [attempts, titres]);

  const termines = attempts.filter((a) => a.status === 'termine');
  const enCours = attempts.filter((a) => a.status === 'en_cours');
  const dejaVus = new Set(attempts.map((a) => a.tp_id));
  const restants = aFaire.filter((id) => !dejaVus.has(id));

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8 text-[14px] text-muted">Chargement…</main>;

  if (!profile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageTitle>Mon espace</PageTitle>
        <Message error="Tu n'es pas connecté." />
        <Link href="/login" className="mt-3 inline-block text-[13px] font-semibold underline">
          Se connecter
        </Link>
      </main>
    );
  }

  const diploma = profile.diploma ?? klass?.diploma ?? null;
  const diplome = DIPLOMAS.find((d) => d.id === diploma);
  const bilan = bilanComplet(diploma, stats.competences);
  const acquises = bilan.filter((c) => c.mastery === 'acquis').length;
  const encoursComp = bilan.filter((c) => c.mastery === 'enCours').length;

  const titre = (id: string) => titres.get(id) ?? id;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <PageTitle
        sub={
          <>
            {klass?.name ?? 'Sans classe'} · {diplome?.short ?? 'Diplôme non renseigné'}
          </>
        }
      >
        {profile.full_name ?? 'Mon espace'}
      </PageTitle>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Chiffre label="TP terminés" value={stats.tpDone} />
        <Chiffre label="Moyenne" value={stats.moyenne != null ? stats.moyenne : '—'} unit="/20" />
        <Chiffre label="Compétences acquises" value={acquises} />
        <Chiffre label="Compétences en cours" value={encoursComp} />
      </div>

      <Panneau title="Mes TP">
        {enCours.length > 0 && (
          <>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">En cours</h3>
            <ul className="mb-4 space-y-2">
              {enCours.map((a) => (
                <li key={a.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link href={`/tp/${a.tp_id}`} className="text-[15px] font-semibold underline">
                      {titre(a.tp_id)}
                    </Link>
                    <span className="ml-auto text-[11px] text-muted">{dateCourte(a.updated_at)}</span>
                  </div>
                  <Barre
                    className="mt-2"
                    value={Math.min(1, a.stage / ETAPES)}
                    tone="accent"
                    label={`étape ${a.stage}/${ETAPES}`}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {restants.length > 0 && (
          <>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
              À faire (donnés par ton professeur)
            </h3>
            <ul className="mb-4 flex flex-wrap gap-2">
              {restants.map((id) => (
                <li key={id}>
                  <Link
                    href={`/tp/${id}`}
                    className="inline-flex min-h-touch items-center rounded-[10px] border border-accent bg-accent/10 px-3 text-[13px] font-semibold"
                  >
                    {titre(id)}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">Terminés</h3>
        {termines.length === 0 ? (
          <p className="text-[13px] text-muted">
            Tu n&apos;as encore terminé aucun TP. Ouvre le{' '}
            <Link href="/tp" className="font-semibold underline">
              catalogue
            </Link>{' '}
            pour commencer.
          </p>
        ) : (
          <ul className="space-y-2">
            {termines.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3"
              >
                <Link href={`/tp/${a.tp_id}`} className="text-[15px] font-semibold underline">
                  {titre(a.tp_id)}
                </Link>
                <span className="rounded-full border border-good/50 bg-good/10 px-2 py-0.5 text-[11px] font-semibold text-good">
                  terminé
                </span>
                <span className="ml-auto font-mono text-[13px]">
                  {a.score != null ? `${Math.round((a.score / 5) * 10) / 10}/20` : '—'}
                </span>
                <span className="w-full text-[11px] text-muted sm:w-auto">
                  {dateCourte(a.finished_at ?? a.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panneau>

      <Panneau title="Mon bilan de compétences" className="bilan-sheet">
        <p className="no-print mb-3 text-[13px] text-muted">
          Référentiel {diplome?.name ?? 'de ton diplôme'} : chaque compétence est évaluée à partir de tes TP
          terminés.
        </p>
        <BilanExport
          className="mb-3"
          competences={bilan}
          tpsParCode={tpsParCode}
          fichier={`bilan-${(profile.full_name ?? 'eleve').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          identite={{
            eleve: profile.full_name ?? 'Élève',
            etablissement: profile.etablissement,
            classe: klass?.name ?? null,
            diplome: diplome?.short ?? null,
          }}
        />
        <BilanCompetences competences={bilan} />
      </Panneau>

      <Message error={err} />
    </main>
  );
}
