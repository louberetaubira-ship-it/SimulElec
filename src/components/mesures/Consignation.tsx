'use client';

/**
 * Consignation NF C 18-510 : séparation, condamnation, identification, VAT.
 * Port de `mesTasks` étape 1 de la référence.
 */
import React from 'react';
import type { AttemptState } from '@/lib/types';
import type { SimState } from '@/lib/sim/engine';
import { Button } from '@/components/ui';

export interface ConsignationProps {
  st: AttemptState;
  sim: SimState;
  onAct: (a: 'lock' | 'ident') => void;
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

export default function Consignation({ st, sim, onAct }: ConsignationProps) {
  const c = st.cons;
  const nVat = c.vat.length;

  return (
    <div className="flex flex-col gap-1.5">
      <Step done={c.sep} n="1">
        <b>Séparation</b> — ouvre Q1 sur la platine (clique le disjoncteur moteur).
        {sim.q1 ? <span className="block text-muted">Q1 est encore fermé.</span> : null}
      </Step>

      <Step done={c.lock} n="2">
        <b>Condamnation</b> — cadenas et étiquette « NE PAS MANŒUVRER » sur Q1.
        {!c.lock && (
          <Button size="sm" className="mt-1.5" data-act="lock" disabled={!c.sep} onClick={() => onAct('lock')}>
            Poser le cadenas + l&apos;étiquette
          </Button>
        )}
      </Step>

      <Step done={c.ident} n="3">
        <b>Identification</b> — platine du TP, repère Q1, schéma folio 2.
        {!c.ident && (
          <Button size="sm" className="mt-1.5" data-act="ident" disabled={!c.lock} onClick={() => onAct('ident')}>
            Confirmer l&apos;identification
          </Button>
        )}
      </Step>

      <Step done={c.vatRef} n="4a">
        <b>VAT sur source connue</b> — prends le VAT, pointe rouge sur <span className="font-mono-num">RES.L1</span>,
        pointe noire sur <span className="font-mono-num">RES.N</span> : il doit indiquer une présence de tension.
      </Step>

      <Step done={nVat >= 3} n="4b">
        <b>VAT en aval de Q1</b> — vérifie l&apos;absence de tension entre phases et phase / neutre :
        <span className="font-mono-num"> q1.2 / q1.4</span>, <span className="font-mono-num">q1.4 / q1.6</span>,
        <span className="font-mono-num"> q1.2 / q1.6</span>.
        <span className="block text-muted">{Math.min(nVat, 3)} paire{nVat > 1 ? 's' : ''} contrôlée{nVat > 1 ? 's' : ''} sur 3.</span>
      </Step>

      <Step done={c.vatRef2} n="4c">
        <b>Re-vérification du VAT</b> — repose les pointes sur <span className="font-mono-num">RES.L1 / RES.N</span>
        {' '}pour prouver que l&apos;appareil fonctionne toujours.
        {c.vatRef2 ? <span className="block font-semibold text-good">Installation consignée.</span> : null}
      </Step>
    </div>
  );
}
