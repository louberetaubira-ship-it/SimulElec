'use client';

/**
 * Parcours de lecture d'un TP documentaire rédigé par un professeur (table `tps`).
 * Aucune platine, aucun câblage : l'élève lit la situation, le cahier des charges et les
 * compétences visées, puis déclare sa lecture terminée — ce qui termine la tentative et
 * fait apparaître le TP dans sa progression comme dans le suivi du professeur.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { docDefinitionOf, getTpRow, type TpDocDefinition, type TpRow } from '@/lib/db/tps';
import { finishAttempt, getOrCreateAttempt, listMyAttempts } from '@/lib/db/attempts';
import { COMPETENCES, type Competence, type DiplomaId } from '@/lib/data/competences';
import { diplomaShort } from '@/lib/student';
import { useStudent } from '@/lib/useStudent';
import { Message, PageTitle, Panneau } from '@/components/gestion/ui';

const FAMILY_LABEL: Record<string, string> = {
  ind: 'Industriel · départs moteur',
  hab: 'Habitat · NF C 15-100',
  ter: 'Tertiaire · éclairage et sécurité',
  pv: 'Photovoltaïque',
};

/** Libellés du référentiel pour les codes cochés par le professeur. */
function competencesVisees(diploma: DiplomaId, codes: string[]): Competence[] {
  const referentiel = COMPETENCES[diploma];
  return codes.map(
    (code) => referentiel.find((c) => c.code === code) ?? { code, label: 'Compétence hors référentiel', criteria: [] },
  );
}

export default function LectureClient({ id }: { id: string }) {
  const { student } = useStudent();
  const [row, setRow] = useState<TpRow | null>(null);
  const [doc, setDoc] = useState<TpDocDefinition | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [introuvable, setIntrouvable] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tp = await getTpRow(id);
        if (!alive) return;
        if (!tp) {
          setIntrouvable(true);
          return;
        }
        setRow(tp);
        setDoc(docDefinitionOf(tp));
        // Tentative : on reprend celle en cours, sans en recréer une si le TP est déjà terminé.
        try {
          const miennes = await listMyAttempts();
          if (!alive) return;
          const pourCeTp = miennes.filter((a) => a.tp_id === id);
          if (pourCeTp.some((a) => a.status === 'termine')) {
            setTermine(true);
            return;
          }
          const attempt = await getOrCreateAttempt(id);
          if (alive) setAttemptId(attempt.id);
        } catch {
          // hors-ligne ou session expirée : la lecture reste possible, sans enregistrement
          if (alive) setAttemptId(null);
        }
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : 'Chargement impossible.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const diploma: DiplomaId = doc?.diploma ?? student.diploma;
  const competences = useMemo(
    () => (row ? competencesVisees(diploma, row.competences ?? []) : []),
    [row, diploma],
  );

  const terminer = useCallback(async () => {
    if (!row) return;
    setErr(null);
    setBusy(true);
    try {
      const attempt = attemptId ?? (await getOrCreateAttempt(row.id)).id;
      setAttemptId(attempt);
      await finishAttempt(
        attempt,
        {
          kind: 'lecture',
          tp: row.title,
          competences: row.competences ?? [],
          lignes: doc?.cahierDesCharges.length ?? 0,
          lu_le: new Date().toISOString(),
        },
        1,
        null,
        diploma,
      );
      setTermine(true);
      setOk('Lecture enregistrée : ce TP apparaît maintenant dans ta progression.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Enregistrement impossible : reconnecte-toi.');
    } finally {
      setBusy(false);
    }
  }, [attemptId, diploma, doc, row]);

  if (loading) {
    return <main className="mx-auto max-w-3xl px-4 py-8 text-[14px] text-muted">Chargement du TP…</main>;
  }

  if (introuvable || !row) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageTitle>TP introuvable</PageTitle>
        <Message error={err ?? "Ce TP n'existe pas ou n'est pas publié."} />
        <Link href="/tp" className="mt-3 inline-block text-[13px] font-semibold underline">
          ← Retour au catalogue
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <PageTitle sub={row.summary ?? undefined}>{row.title}</PageTitle>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">
          TP du professeur
        </span>
        {row.level && (
          <span className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-muted">
            {row.level}
          </span>
        )}
        {row.family && (
          <span className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-muted">
            {FAMILY_LABEL[row.family] ?? row.family}
          </span>
        )}
        <span className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-muted">
          {diplomaShort(diploma)}
        </span>
      </div>

      <Panneau title="Situation">
        {doc?.situation ? (
          <p className="whitespace-pre-line text-[14.5px] leading-relaxed">{doc.situation}</p>
        ) : (
          <p className="text-[13px] text-muted">Le professeur n&apos;a pas encore rédigé l&apos;énoncé.</p>
        )}
      </Panneau>

      {doc && doc.cahierDesCharges.length > 0 && (
        <Panneau title="Cahier des charges">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[420px] text-[13.5px]">
              <thead className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-[.06em] text-muted">
                <tr>
                  <th className="px-3 py-2.5">Exigence</th>
                  <th className="px-3 py-2.5">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {doc.cahierDesCharges.map((l, i) => (
                  <tr key={`${l.k}-${i}`} className="border-t border-line align-top">
                    <td className="px-3 py-2.5 font-semibold">{l.k}</td>
                    <td className="px-3 py-2.5 font-mono text-[13px]">{l.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panneau>
      )}

      <Panneau title="Compétences visées">
        {competences.length === 0 ? (
          <p className="text-[13px] text-muted">Aucune compétence n&apos;a été rattachée à ce TP.</p>
        ) : (
          <ul className="space-y-2">
            {competences.map((c) => (
              <li key={c.code} className="rounded-xl border border-line bg-surface p-2.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[12px] font-semibold">{c.code}</span>
                  <span className="flex-1 text-[13.5px] leading-snug">{c.label}</span>
                  {c.unit && (
                    <span className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">
                      {c.unit}
                    </span>
                  )}
                </div>
                {c.criteria.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12.5px] text-muted">
                    {c.criteria.map((crit) => (
                      <li key={crit}>{crit}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panneau>

      <Panneau title="Fin de la lecture">
        {termine ? (
          <p className="rounded-[10px] border border-good/50 bg-good/10 px-3 py-2 text-[13px] text-good">
            Lecture terminée ✓ — ce TP est enregistré dans ta progression.
          </p>
        ) : (
          <>
            <p className="mb-3 text-[13px] text-muted">
              Quand tu as lu la situation, le cahier des charges et les compétences visées, clique ci-dessous :
              ton professeur verra ce TP comme terminé dans son suivi.
            </p>
            <button
              type="button"
              onClick={terminer}
              disabled={busy}
              className="min-h-touch rounded-[10px] border border-accent bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"
            >
              {busy ? 'Enregistrement…' : 'J’ai terminé la lecture'}
            </button>
          </>
        )}
        <Message error={err} ok={ok} />
      </Panneau>

      <Link href="/tp" className="inline-block text-[13px] font-semibold underline">
        ← Retour au catalogue
      </Link>
    </main>
  );
}
