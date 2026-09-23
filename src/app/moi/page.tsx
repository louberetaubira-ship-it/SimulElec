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
import { listTps, resolveDefinition, type TpSummary } from '@/lib/db/tps';
import { createClient } from '@/lib/supabase/client';
import { competenceTps, eleveStats } from '@/lib/eleve-stats';
import { liveBilan, liveEvaluation, liveNotes } from '@/lib/sim/live';
import {
  COMPETENCES, DIPLOMAS, masteryOf, niveauOfEval, NIVEAU_COLOR, NIVEAU_ON, NIVEAU_TP,
  type CompetenceEval, type DiplomaId,
} from '@/lib/data/competences';
import type { AttemptRow, ClassRow, ProfileRow } from '@/lib/db/types';
import type { TpDefinition } from '@/lib/types';
import { metaSujet as sujetById } from '@/lib/sujet/meta';
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

/** Note formatée à la française (14,5). */
const fr = (n: number) => n.toFixed(1).replace('.', ',');

/** Barre pleine d'une compétence (vue élève, pendant le TP) — vocabulaire « maîtrise ». */
function CompBar({ c }: { c: CompetenceEval }) {
  const n = niveauOfEval(c);
  const w = n === 'nonEvalue' ? 4 : Math.max(6, Math.round(c.score * 100));
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[13px]"><b className="font-semibold">{c.code} · {c.label}</b></span>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: NIVEAU_COLOR[n], color: NIVEAU_ON[n] }}>{NIVEAU_TP[n]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: NIVEAU_COLOR[n] }} />
      </div>
    </div>
  );
}

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
  // Définitions des TP en cours, pour afficher notes provisoire / projetée et compétences pendant le TP.
  const [defs, setDefs] = useState<Record<string, TpDefinition | null>>({});

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

  useEffect(() => {
    const ids = Array.from(
      new Set(attempts.filter((a) => a.status === 'en_cours' && !sujetById(a.tp_id)).map((a) => a.tp_id)),
    );
    const missing = ids.filter((id) => !(id in defs));
    if (missing.length === 0) return;
    let alive = true;
    Promise.all(
      missing.map(async (id) => [id, await resolveDefinition(id).catch(() => null)] as const),
    ).then((pairs) => {
      if (alive) setDefs((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      alive = false;
    };
  }, [attempts, defs]);

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
  const clotures = attempts.filter((a) => a.status === 'cloture');
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

  // Un sujet numérique n'est pas un TP : son titre et sa route viennent de `SUJETS`.
  const titre = (id: string) => titres.get(id) ?? sujetById(id)?.titre ?? id;
  const lien = (id: string) => (sujetById(id) ? `/sujet/${id}` : `/tp/${id}`);

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
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">Ma progression</h3>
            <div className="mb-4 space-y-4">
              {enCours.map((a) => {
                const sujet = sujetById(a.tp_id);
                if (sujet) {
                  return (
                    <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4" data-sujet-en-cours={a.tp_id}>
                      <Link href={lien(a.tp_id)} className="font-[var(--font-title)] text-[18px] font-bold">{sujet.titre}</Link>
                      <span className="rounded-full bg-good/10 px-2.5 py-1 text-[11px] font-bold text-good">
                        Sujet numérique en cours · {a.stage}/{sujet.questions} réponses
                      </span>
                      <span className="ml-auto text-[11px] text-muted">Mis à jour {dateCourte(a.updated_at)}</span>
                      <Link href={lien(a.tp_id)} className="rounded-[10px] bg-[#141A21] px-4 py-2 text-[13px] font-bold text-white">
                        Reprendre ma copie
                      </Link>
                    </div>
                  );
                }
                const def = defs[a.tp_id];
                const notes = def ? liveNotes(def, a.state) : null;
                const ev = def && diploma ? liveEvaluation(def, a.state, diploma) : null;
                const bilan = def ? liveBilan(def, a.state) : null;
                const restantes = Math.max(0, ETAPES - a.stage);
                const acquisesTp = ev ? ev.filter((c) => c.mastery === 'acquis').length : 0;
                return (
                  <div key={a.id} className="space-y-4 rounded-2xl border border-line bg-surface p-4">
                    {/* En-tête de la carte */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={lien(a.tp_id)} className="font-[var(--font-title)] text-[18px] font-bold">
                        {titre(a.tp_id)}
                      </Link>
                      <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-good/10 px-2.5 py-1 text-[11px] font-bold text-good">
                        <span className="h-1.5 w-1.5 rounded-full bg-good" /> TP en cours · étape {a.stage}/{ETAPES}
                      </span>
                    </div>

                    {/* Deux notes */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-line bg-app p-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.06em] text-muted">
                          Ma note provisoire
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-accent-ink">LIVE</span>
                        </div>
                        <div className="mt-1 font-mono text-[26px] font-bold text-good">
                          {notes && notes.provisoire != null ? fr(notes.provisoire) : '—'}
                          <span className="text-[13px] font-semibold text-muted"> / 20</span>
                        </div>
                        <div className="text-[12px] text-muted">qualité de ce que j&apos;ai déjà réalisé</div>
                      </div>
                      <div className="rounded-xl border border-line bg-app p-4">
                        <div className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Ma note projetée</div>
                        <div className="mt-1 font-mono text-[26px] font-bold text-accent-ink">
                          {notes ? fr(notes.projetee) : '—'}
                          <span className="text-[13px] font-semibold text-muted"> / 20</span>
                        </div>
                        <div className="text-[12px] text-muted">si je m&apos;arrêtais maintenant ({a.stage}/{ETAPES})</div>
                      </div>
                    </div>

                    {/* Avancement + encouragement */}
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <b className="text-[13px]">Avancement du TP</b>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-ink">Étape {a.stage} / {ETAPES}</span>
                      </div>
                      <Barre value={Math.min(1, a.stage / ETAPES)} tone="accent" />
                      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                        Il te reste <b>{restantes} étape{restantes > 1 ? 's' : ''}</b>. Chaque étape réussie fait{' '}
                        <b className="text-accent-ink">monter ta note projetée</b> vers ta note provisoire. 💪
                      </p>
                    </div>

                    {/* Mes compétences */}
                    {ev && ev.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-baseline justify-between">
                          <h4 className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Mes compétences</h4>
                          <span className="text-[11px] font-bold text-muted">{acquisesTp} acquise{acquisesTp > 1 ? 's' : ''} / {ev.length}</span>
                        </div>
                        {ev.map((c) => <CompBar key={c.code} c={c} />)}
                      </div>
                    )}

                    {/* Mes points forts */}
                    {bilan && bilan.forces.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.06em] text-muted">
                          <span className="h-2.5 w-2.5 rounded-sm bg-good" /> Mes points forts
                        </h4>
                        <div className="space-y-1.5">
                          {bilan.forces.map((f) => (
                            <div key={f.key} className="flex gap-2.5 rounded-[11px] border border-good/25 bg-good/[.06] p-2.5 text-[13px]">
                              <span className="mt-px grid h-5 w-5 flex-none place-items-center rounded-md bg-good text-[12px] font-bold text-white">✓</span>
                              <span><b className="font-semibold">{f.label}</b><span className="text-muted"> — {f.detail}</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pour progresser */}
                    {bilan && bilan.vigilances.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.06em] text-muted">
                          <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Pour progresser
                        </h4>
                        <div className="space-y-1.5">
                          {bilan.vigilances.map((v) => (
                            <div key={v.key} className="flex gap-2.5 rounded-[11px] border border-accent/30 bg-accent/[.08] p-2.5 text-[13px]">
                              <span className="mt-px grid h-5 w-5 flex-none place-items-center rounded-md bg-accent text-[12px] font-bold text-[#3D2C00]">!</span>
                              <span>
                                <b className="font-semibold">{v.label}</b><span className="text-muted"> — {v.detail}</span>
                                {v.remediation && v.remediation.length > 0 && (
                                  <span className="mt-1 block text-[12px] font-semibold text-accent-ink">→ À revoir : {v.remediation.join(' · ')}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-muted">Mis à jour {dateCourte(a.updated_at)}</span>
                      <Link href={lien(a.tp_id)} className="rounded-[10px] bg-[#141A21] px-4 py-2 text-[13px] font-bold text-white">
                        Reprendre le TP
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    href={lien(id)}
                    className="inline-flex min-h-touch items-center rounded-[10px] border border-accent bg-accent/10 px-3 text-[13px] font-semibold"
                  >
                    {titre(id)}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {clotures.length > 0 && (
          <>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
              Clôturés par le professeur
            </h3>
            <ul className="mb-4 space-y-2">
              {clotures.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3"
                  style={{ background: 'repeating-linear-gradient(135deg,#fff,#fff 10px,#F3F5F8 10px,#F3F5F8 20px)' }}
                >
                  <Link href={lien(a.tp_id)} className="text-[15px] font-semibold underline">
                    {titre(a.tp_id)}
                  </Link>
                  <span className="rounded-full border border-[#1D6FE0]/40 bg-[#1D6FE0]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1D6FE0]">
                    🔒 Clôturé
                  </span>
                  <span className="ml-auto font-mono text-[13px] text-[#1D6FE0]">
                    {a.score != null ? `${Math.round((a.score / 5) * 10) / 10}/20` : '—'}
                  </span>
                  <span className="w-full text-[11px] text-muted sm:w-auto">
                    projetée · sous réserve · réactivation par le professeur requise
                  </span>
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
                <Link href={lien(a.tp_id)} className="text-[15px] font-semibold underline">
                  {titre(a.tp_id)}
                </Link>
                <span className="rounded-full border border-good/50 bg-good/10 px-2 py-0.5 text-[11px] font-semibold text-good">
                  ✓ Terminé — validé
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
