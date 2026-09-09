'use client';

import React from 'react';
import { STAGES } from '@/lib/sim/progress';

interface Props {
  stage: number;
  done: Record<number, boolean>;
  onGo: (i: number) => void;
}

export default function Stepper({ stage, done, onGo }: Props) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2.5" aria-label="Étapes du TP">
      {STAGES.map((label, i) => {
        const isDone = !!done[i];
        const locked = i > stage && !done[i - 1];
        return (
          <button
            key={label}
            type="button"
            disabled={locked}
            onClick={() => onGo(i)}
            aria-current={stage === i ? 'step' : undefined}
            className={`flex min-h-touch min-w-[118px] flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left ${stage === i ? 'bg-accent/15 text-ink' : 'bg-[var(--surface-2)] text-muted'} ${locked ? 'cursor-default opacity-55' : ''}`}
          >
            <span className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-full font-title text-[13px] font-bold ${isDone ? 'bg-good text-white' : stage === i ? 'bg-accent text-[var(--accent-ink)]' : 'bg-[var(--line)] text-ink'}`}>
              {isDone ? '✓' : i + 1}
            </span>
            <span className="text-[12px] leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
