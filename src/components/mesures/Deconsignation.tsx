'use client';

/** Déconsignation et remise sous tension (port de `mesTasks` étape 3). */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { startButtons, type SimState } from '@/lib/sim/engine';
import { reperesMiseSousTension, repereSlot } from '@/lib/sim/reperes';
import { Button } from '@/components/ui';
import { aParametrage, paramConforme } from '@/lib/sim/parametrage';
import Parametrage from './Parametrage';

export interface DeconsignationProps {
  /** Le TP fournit les repères : « F2 » ici, « Q2 » là — jamais écrits en dur. */
  tp: TpDefinition;
  st: AttemptState;
  sim: SimState;
  onAct: (a: 'unlock') => void;
  /** Réglage d'un paramètre du variateur (TP à variateur seulement). */
  onParam?: (code: string, value: number | string) => void;
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

export default function Deconsignation({ tp, st, sim, onAct, onParam }: DeconsignationProps) {
  const d = st.decons;
  const [q1, pri, sec] = reperesMiseSousTension(tp);
  const marche = startButtons(tp)[0];
  const km1 = repereSlot(tp, 'km1');
  const voyant = (tp.pupitre ?? []).find(p => p.kind === 'lamp')?.rep ?? 'H1';
  return (
    <div className="flex flex-col gap-1.5">
      <Step done={d.unlock} n="1">
        <b>Retirer les pointes, l&apos;étiquette et le cadenas</b> de {q1}.
        {!d.unlock && (
          <Button size="sm" className="mt-1.5" data-act="unlock" onClick={() => onAct('unlock')}>
            Retirer le cadenas
          </Button>
        )}
      </Step>
      <Step done={d.close} n="2">
        <b>Remise sous tension</b> — referme {q1}, {pri} puis {sec} en les cliquant sur la platine.
        <span className="block font-mono-num text-[11px] text-muted">
          {q1} {sim.q1 ? 'fermé' : 'ouvert'} · {pri} {sim.f2 ? 'fermé' : 'ouvert'} · {sec} {sim.f3 ? 'fermé' : 'ouvert'}
        </span>
      </Step>
      {aParametrage(tp) && onParam && (
        <Step done={d.close && paramConforme(tp, st)} n="3">
          <b>Paramétrer {repereSlot(tp, tp.variateur!.slot)}</b> au clavier, d&apos;après la plaque du moteur et le
          cahier des charges, <b>avant</b> tout ordre de marche. Le variateur part de ses réglages usine.
          <Parametrage tp={tp} st={st} alimente={d.close} onParam={onParam} />
        </Step>
      )}
      <Step done={d.essai} n={aParametrage(tp) ? '4' : '3'}>
        <b>Essai de fonctionnement</b>
        {marche ? (
          <> — appuie sur {marche.rep} ({marche.label}) en porte : {km1} s&apos;enclenche, {voyant} s&apos;allume.</>
        ) : (
          <> — mets {km1} en marche en le cliquant sur la platine : l&apos;installation se met en service (le 230 V apparaît au tableau).</>
        )}
        {d.essai ? <span className="block font-semibold text-good">Déconsignée, essais concluants.</span> : null}
      </Step>
    </div>
  );
}
