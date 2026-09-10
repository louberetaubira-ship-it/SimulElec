'use client';

/** Déconsignation et remise sous tension (port de `mesTasks` étape 3). */
import React from 'react';
import type { AttemptState } from '@/lib/types';
import type { SimState } from '@/lib/sim/engine';
import { Button } from '@/components/ui';

export interface DeconsignationProps {
  st: AttemptState;
  sim: SimState;
  onAct: (a: 'unlock') => void;
}

function Step({ done, n, children }: { done: boolean; n: string; children: React.ReactNode }) {
  return (
    <div className={`flex gap-2 rounded-[10px] border p-2 text-[12.5px] ${done ? 'border-good bg-good/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}>
      <span className={`grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold ${done ? 'bg-good text-white' : 'bg-[var(--surface-2)] text-muted'}`}>
        {done ? '✓' : n}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function Deconsignation({ st, sim, onAct }: DeconsignationProps) {
  const d = st.decons;
  return (
    <div className="flex flex-col gap-1.5">
      <Step done={d.unlock} n="1">
        <b>Retirer les pointes, l&apos;étiquette et le cadenas</b> de Q1.
        {!d.unlock && (
          <Button size="sm" className="mt-1.5" data-act="unlock" onClick={() => onAct('unlock')}>
            Retirer le cadenas
          </Button>
        )}
      </Step>
      <Step done={d.close} n="2">
        <b>Remise sous tension</b> — referme Q1, F2 puis F3 en les cliquant sur la platine.
        <span className="block font-mono-num text-[11px] text-muted">
          Q1 {sim.q1 ? 'fermé' : 'ouvert'} · F2 {sim.f2 ? 'fermé' : 'ouvert'} · F3 {sim.f3 ? 'fermé' : 'ouvert'}
        </span>
      </Step>
      <Step done={d.essai} n="3">
        <b>Essai de fonctionnement</b> — appuie sur S2 (bouton vert en porte) : KM1 s&apos;enclenche, H1 s&apos;allume.
        {d.essai ? <span className="block font-semibold text-good">Déconsignée, essais concluants.</span> : null}
      </Step>
    </div>
  );
}
