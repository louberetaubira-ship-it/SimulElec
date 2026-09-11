'use client';

/**
 * Auto-évaluation avant correction : à la dernière étape, l'élève se place lui-même
 * sur chaque compétence travaillée. Son estimation est ensuite confrontée au résultat
 * calculé dans le bilan (deux colonnes côte à côte).
 */

import React from 'react';
import { COMPETENCES, type DiplomaId, type Mastery } from '@/lib/data/competences';
import { diplomaShort } from '@/lib/student';

/** Niveaux proposés à l'élève (le « non évalué » n'est pas un choix). */
export const NIVEAUX: { id: Exclude<Mastery, 'nonEvalue'>; label: string; tone: string }[] = [
  { id: 'acquis', label: 'Acquis', tone: 'border-good bg-good/15 text-good' },
  { id: 'enCours', label: 'En cours', tone: 'border-accent bg-accent/15 text-warn' },
  { id: 'nonAcquis', label: 'Non acquis', tone: 'border-crit bg-crit/15 text-crit' },
];

interface Props {
  diploma: DiplomaId;
  /** Codes des compétences travaillées pendant le TP. */
  codes: string[];
  value: Record<string, Mastery>;
  onSet: (code: string, level: Mastery) => void;
  onSubmit: () => void;
}

export default function AutoEvaluation({ diploma, codes, value, onSet, onSubmit }: Props) {
  const liste = React.useMemo(
    () => COMPETENCES[diploma].filter(c => codes.includes(c.code)),
    [diploma, codes],
  );
  const reste = liste.filter(c => !value[c.code]).length;

  return (
    <section
      data-auto-eval
      className="flex w-full max-w-[860px] flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
    >
      <header>
        <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
          Avant la correction
        </div>
        <h2 className="m-0 mt-1 text-[20px] font-bold leading-tight">Où te situes-tu ?</h2>
        <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-muted">
          Place-toi toi-même sur chaque compétence travaillée dans ce TP, référentiel{' '}
          {diplomaShort(diploma)}. Tu verras ensuite ton estimation à côté du résultat calculé :
          l&apos;écart est aussi intéressant que la note.
        </p>
      </header>

      <div className="flex flex-col gap-1.5">
        {liste.map(c => (
          <div
            key={c.code}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5"
          >
            <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono-num text-[11px] font-semibold text-[var(--app)]">
              {c.code}
            </span>
            <span className="min-w-[12ch] flex-1 text-[12.5px] font-medium leading-snug">{c.label}</span>
            <div className="flex w-full gap-1.5 sm:w-auto">
              {NIVEAUX.map(n => {
                const on = value[c.code] === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    data-self={`${c.code}:${n.id}`}
                    aria-pressed={on}
                    onClick={() => onSet(c.code, n.id)}
                    className={`min-h-touch flex-1 rounded-[10px] border px-2.5 py-1.5 text-[11.5px] font-semibold sm:flex-none ${on ? n.tone : 'border-[var(--line)] bg-[var(--surface)] text-muted'}`}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        data-auto-eval-submit
        disabled={reste > 0}
        onClick={onSubmit}
        className="min-h-touch rounded-[10px] border border-good bg-good px-3 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
      >
        {reste > 0
          ? `Place-toi encore sur ${reste} compétence${reste > 1 ? 's' : ''}`
          : 'Voir mon bilan'}
      </button>
    </section>
  );
}
