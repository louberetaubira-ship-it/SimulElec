'use client';

/**
 * Consignation NF C 18-510 : séparation, condamnation, identification, VAT.
 * Port de `mesTasks` étape 1 de la référence.
 */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import type { SimState } from '@/lib/sim/engine';
import { repereSlot, repereBorne, schemaDeLOrgane } from '@/lib/sim/reperes';
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
  // Seconde source indépendante (champ PV) : double coupure Q1 + Q2.
  const q2 = cfg?.champ ? repereSlot(tp, cfg.champ) : null;
  const organes = q2 ? `${q1} et ${q2}` : q1;
  const champOuvert = q2 ? !sim.f2 : true;

  return (
    <div className="flex flex-col gap-1.5">
      {q2 && (
        <div className="rounded-[10px] border border-[#e8cfa0] bg-[#fdf3e3] p-2 text-[12.5px] text-[#6b4300]">
          <b>Installation à deux sources.</b> Le parc batteries (isolé par {q1}) <b>et</b> le champ PV
          (isolé par {q2}) sont deux sources. Ouvrir {q1} ne coupe pas le champ : <b>tant qu&apos;il fait
          jour, l&apos;amont du régulateur reste sous tension</b>. Il faut donc consigner {q1} <b>et</b> {q2}.
        </div>
      )}

      <Step done={c.sep} n="1">
        <b>Séparation</b> — ouvre {organes} sur la platine{q2 ? ' (les deux sectionneurs DC : parc et champ)' : ''}.
        {sim.q1 ? <span className="block text-muted">{q1} est encore fermé.</span> : null}
        {q2 && !champOuvert ? <span className="block text-muted">{q2} (champ PV) est encore fermé.</span> : null}
      </Step>

      <Step done={c.lock} n="2">
        <b>Condamnation</b> — cadenas et étiquette « NE PAS MANŒUVRER » sur {organes}.
        {!c.lock && (
          <Button size="sm" className="mt-1.5" data-act="lock" disabled={!c.sep} onClick={() => onAct('lock')}>
            Poser le cadenas + l&apos;étiquette
          </Button>
        )}
      </Step>

      <Step done={c.ident} n="3">
        <b>Identification</b> — platine du TP, repère {organes}, {schemaDeLOrgane(tp, q1)}.
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
          <b>VAT sur source connue</b> — prends le VAT, pointe rouge sur <span className="font-mono-num">{repereBorne(tp, source[0])}</span>,
          pointe noire sur <span className="font-mono-num">{repereBorne(tp, source[1])}</span> : il doit indiquer une présence de tension.
        </Step>
      )}

      <Step done={nVat >= need} n="4b">
        <b>VAT en aval de {organes}</b> — {avalPairs
          ? (
            <>vérifie l&apos;absence de tension : <span className="font-mono-num">{avalPairs.map(p => `${repereBorne(tp, p[0])} / ${repereBorne(tp, p[1])}`).join(', ')}</span>.</>
          )
          : (
            <>vérifie l&apos;absence de tension entre phases et phase / neutre :
              <span className="font-mono-num"> {repereBorne(tp, 'q1.2')} / {repereBorne(tp, 'q1.4')}</span>,
              <span className="font-mono-num"> {repereBorne(tp, 'q1.4')} / {repereBorne(tp, 'q1.6')}</span>,
              <span className="font-mono-num"> {repereBorne(tp, 'q1.2')} / {repereBorne(tp, 'q1.6')}</span>.</>
          )}
        <span className="block text-muted">{Math.min(nVat, need)} paire{nVat > 1 ? 's' : ''} contrôlée{nVat > 1 ? 's' : ''} sur {need}.</span>
        {source === null && c.vatRef2 ? <span className="block font-semibold text-good">Installation consignée.</span> : null}
      </Step>

      {source !== null && (
        <Step done={c.vatRef2} n="4c">
          <b>Re-vérification du VAT</b> — repose les pointes sur <span className="font-mono-num">{repereBorne(tp, source[0])} / {repereBorne(tp, source[1])}</span>
          {' '}pour prouver que l&apos;appareil fonctionne toujours.
          {c.vatRef2 ? <span className="block font-semibold text-good">Installation consignée.</span> : null}
        </Step>
      )}
    </div>
  );
}
