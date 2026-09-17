'use client';

/**
 * Consignation NF C 18-510 : séparation, condamnation, identification, VAT.
 * Port de `mesTasks` étape 1 de la référence.
 */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import type { SimState } from '@/lib/sim/engine';
import { repereSlot } from '@/lib/sim/reperes';
import { Button } from '@/components/ui';

export interface ConsignationProps {
  /** Le TP fournit le repère de l'appareil de séparation : « Q1 » ici, autre chose ailleurs. */
  tp: TpDefinition;
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

export default function Consignation({ tp, st, sim, onAct }: ConsignationProps) {
  const q1 = repereSlot(tp, 'q1');
  const c = st.cons;
  const nVat = c.vat.length;

  // Bornes du VAT paramétrées par le TP. Défaut (TP moteur, champ absent) : source
  // connue RES.L1/RES.N et les trois paires en aval de Q1 — comportement historique.
  const cfg = tp.consignationVat;
  const source: [string, string] | null =
    cfg && cfg.sourceConnue !== undefined ? cfg.sourceConnue : ['RES.L1', 'RES.N'];
  const avalPairs = cfg?.avalPairs;
  const need = avalPairs ? avalPairs.length : 3;

  return (
    <div className="flex flex-col gap-1.5">
      <Step done={c.sep} n="1">
        <b>Séparation</b> — ouvre {q1} sur la platine (clique le disjoncteur moteur).
        {sim.q1 ? <span className="block text-muted">{q1} est encore fermé.</span> : null}
      </Step>

      <Step done={c.lock} n="2">
        <b>Condamnation</b> — cadenas et étiquette « NE PAS MANŒUVRER » sur {q1}.
        {!c.lock && (
          <Button size="sm" className="mt-1.5" data-act="lock" disabled={!c.sep} onClick={() => onAct('lock')}>
            Poser le cadenas + l&apos;étiquette
          </Button>
        )}
      </Step>

      <Step done={c.ident} n="3">
        <b>Identification</b> — platine du TP, repère {q1}, schéma folio 2.
        {!c.ident && (
          <Button size="sm" className="mt-1.5" data-act="ident" disabled={!c.lock} onClick={() => onAct('ident')}>
            Confirmer l&apos;identification
          </Button>
        )}
      </Step>

      {source === null && (
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-2 text-[12.5px] text-muted">
          Installation autonome : pas de source réseau à contrôler. La preuve du VAT
          se fait sur la seule absence de tension en aval de {q1}.
        </div>
      )}

      {source !== null && (
        <Step done={c.vatRef} n="4a">
          <b>VAT sur source connue</b> — prends le VAT, pointe rouge sur <span className="font-mono-num">{source[0]}</span>,
          pointe noire sur <span className="font-mono-num">{source[1]}</span> : il doit indiquer une présence de tension.
        </Step>
      )}

      <Step done={nVat >= need} n="4b">
        <b>VAT en aval de {q1}</b> — {avalPairs
          ? (
            <>vérifie l&apos;absence de tension : <span className="font-mono-num">{avalPairs.map(p => `${p[0]} / ${p[1]}`).join(', ')}</span>.</>
          )
          : (
            <>vérifie l&apos;absence de tension entre phases et phase / neutre :
              <span className="font-mono-num"> q1.2 / q1.4</span>, <span className="font-mono-num">q1.4 / q1.6</span>,
              <span className="font-mono-num"> q1.2 / q1.6</span>.</>
          )}
        <span className="block text-muted">{Math.min(nVat, need)} paire{nVat > 1 ? 's' : ''} contrôlée{nVat > 1 ? 's' : ''} sur {need}.</span>
        {source === null && c.vatRef2 ? <span className="block font-semibold text-good">Installation consignée.</span> : null}
      </Step>

      {source !== null && (
        <Step done={c.vatRef2} n="4c">
          <b>Re-vérification du VAT</b> — repose les pointes sur <span className="font-mono-num">{source[0]} / {source[1]}</span>
          {' '}pour prouver que l&apos;appareil fonctionne toujours.
          {c.vatRef2 ? <span className="block font-semibold text-good">Installation consignée.</span> : null}
        </Step>
      )}
    </div>
  );
}
