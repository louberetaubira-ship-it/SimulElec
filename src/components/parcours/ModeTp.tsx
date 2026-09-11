'use client';

/**
 * Mode de passage d'un TP : entraînement ou évaluation.
 *
 * — `ModeChooser` : choix au lancement (ou annonce du mode imposé par le professeur) ;
 * — `ModeBadge`   : rappel permanent dans l'en-tête, avec le chronomètre en évaluation.
 */

import React from 'react';
import type { AttemptState, EvaluationMode } from '@/lib/types';
import { AIDE_MAX_EVALUATION, aideLeft, elapsedSeconds, formatChrono, modeOf } from '@/lib/sim/progress';

export const MODE_LABEL: Record<EvaluationMode, string> = {
  entrainement: 'Entraînement',
  evaluation: 'Évaluation',
};

const CARDS: { id: EvaluationMode; titre: string; puces: string[] }[] = [
  {
    id: 'entrainement',
    titre: 'Entraînement',
    puces: [
      'Aide et rappels de cours illimités',
      'Tu peux recommencer autant de fois que tu veux',
      'Pas de chronomètre',
      'Note indicative, pour te situer',
    ],
  },
  {
    id: 'evaluation',
    titre: 'Évaluation',
    puces: [
      `Aide comptée et limitée à ${AIDE_MAX_EVALUATION} ouvertures`,
      'Une seule tentative : pas de remise à zéro du TP',
      'Chronomètre affiché',
      'Note retenue par ton professeur',
    ],
  },
];

interface ChooserProps {
  /** Mode imposé par le professeur (l'élève ne choisit pas). */
  impose?: EvaluationMode | null;
  onPick: (m: EvaluationMode, impose: boolean) => void;
}

export function ModeChooser({ impose, onPick }: ChooserProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choix du mode de passage"
    >
      <div
        data-mode-chooser
        className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl sm:max-w-[640px] sm:rounded-2xl"
      >
        <div className="font-title text-[11px] font-semibold uppercase tracking-[.14em] text-accent">
          Avant de commencer
        </div>
        <h2 className="m-0 mt-1 text-[19px] font-bold leading-tight">
          {impose ? `Ton professeur a imposé le mode « ${MODE_LABEL[impose]} »` : 'Comment veux-tu passer ce TP ?'}
        </h2>
        <p className="m-0 mt-1 text-[12.5px] text-muted">
          {impose
            ? 'Lis les conditions, puis lance le TP.'
            : 'Tu peux t’entraîner librement, ou te mettre en situation d’évaluation.'}
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CARDS.filter(c => !impose || c.id === impose).map(c => (
            <button
              key={c.id}
              type="button"
              data-mode={c.id}
              onClick={() => onPick(c.id, !!impose)}
              className={`flex min-h-touch flex-col gap-1.5 rounded-xl border-2 p-3 text-left ${c.id === 'evaluation' ? 'border-accent bg-accent/10' : 'border-[var(--line)] bg-[var(--surface-2)]'}`}
            >
              <b className="text-[14px]">{c.titre}</b>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {c.puces.map(x => (
                  <li key={x} className="flex gap-1.5 text-[11.5px] leading-snug">
                    <span aria-hidden className="text-muted">•</span><span>{x}</span>
                  </li>
                ))}
              </ul>
              <span className="mt-1 text-[11.5px] font-semibold text-accent">
                {impose ? 'Commencer →' : `Choisir « ${c.titre} » →`}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Badge permanent de l'en-tête : mode, chronomètre et aides restantes. */
export function ModeBadge({ st }: { st: AttemptState }) {
  const mode = modeOf(st);
  const evaluation = mode === 'evaluation';
  const [sec, setSec] = React.useState(() => elapsedSeconds(st));

  React.useEffect(() => {
    if (!evaluation) return;
    setSec(elapsedSeconds(st));
    const id = setInterval(() => setSec(elapsedSeconds(st)), 1000);
    return () => clearInterval(id);
  }, [evaluation, st]);

  return (
    <span
      data-mode-badge={mode}
      className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${evaluation ? 'bg-crit/15 text-crit' : 'bg-good/15 text-good'}`}
    >
      {MODE_LABEL[mode]}
      {evaluation && (
        <>
          <span data-chrono className="font-mono-num">⏱ {formatChrono(sec)}</span>
          <span className="font-normal opacity-80">💡 {aideLeft(st)}</span>
        </>
      )}
    </span>
  );
}
