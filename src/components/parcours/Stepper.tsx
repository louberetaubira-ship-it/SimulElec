'use client';

import React from 'react';
import { STAGES, STAGES_SHORT } from '@/lib/sim/progress';

interface Props {
  stage: number;
  done: Record<number, boolean>;
  onGo: (i: number) => void;
  /** Dernière étape accessible (TP non jouable). */
  maxStage?: number;
  /** Libellés des étapes ; par défaut le parcours platine (`STAGES`). */
  labels?: readonly string[];
  /** Libellés courts (mobile) ; par défaut `STAGES_SHORT`. */
  shortLabels?: readonly string[];
  /** Nombre de compétences évaluées à chaque étape (pastille discrète). */
  competenceCounts?: number[];
}

export default function Stepper({
  stage, done, onGo, maxStage, labels = STAGES, shortLabels = STAGES_SHORT, competenceCounts,
}: Props) {
  const last = maxStage ?? labels.length - 1;
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)] px-2 py-2"
      aria-label="Étapes du TP"
    >
      {labels.map((label, i) => {
        const isDone = !!done[i];
        const locked = i > last || (i > stage && !done[i - 1]);
        const nComp = competenceCounts?.[i] ?? 0;
        return (
          <button
            key={label}
            type="button"
            data-stage={i}
            disabled={locked}
            onClick={() => onGo(i)}
            aria-current={stage === i ? 'step' : undefined}
            title={nComp > 0 ? `${label} — ${nComp} compétence${nComp > 1 ? 's' : ''} évaluée${nComp > 1 ? 's' : ''}` : label}
            className={`flex min-h-touch flex-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-left sm:min-w-[104px] ${stage === i ? 'bg-accent/15 text-ink' : 'bg-[var(--surface-2)] text-muted'} ${locked ? 'cursor-default opacity-50' : ''}`}
          >
            <span className={`grid h-[20px] w-[20px] flex-none place-items-center rounded-full font-title text-[12px] font-bold ${isDone ? 'bg-good text-white' : stage === i ? 'bg-accent text-[var(--accent-ink)]' : 'bg-[var(--line)] text-ink'}`}>
              {isDone ? '✓' : i + 1}
            </span>
            <span className="hidden text-[11.5px] leading-tight sm:inline">{shortLabels[i] ?? label}</span>
            {nComp > 0 && (
              <span
                data-comp-count={i}
                aria-label={`${nComp} compétence${nComp > 1 ? 's' : ''} évaluée${nComp > 1 ? 's' : ''}`}
                className="ml-auto grid h-[15px] min-w-[15px] flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-1 font-mono-num text-[9.5px] font-semibold text-muted"
              >
                {nComp}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
