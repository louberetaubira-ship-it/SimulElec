'use client';

/**
 * Écran de mise en service d'un automate (logiciel de programmation), pendant la
 * déconsignation — sur le modèle de `MiseEnServiceImeon.tsx`.
 *
 * Tout ce que l'écran propose vient du TP (`tp.automateMiseEnService` : variables et
 * adresses, temporisations, valeurs livrées). Les saisies de l'élève sont commises dans
 * `st.automate` par deux actions du store (`automateSet`, `automateTransferer`).
 *
 * Le programme livré vient d'un autre portail : temporisations fausses, sorties KM1.1 /
 * KM1.2 permutées. L'élève relit chaque réglage d'après le DTR 8 et sa table d'adressage,
 * puis transfère. Le transfert n'est jamais refusé — un automate exécute ce qu'on lui
 * donne — mais un programme non conforme se VOIT à l'essai devant le portail, ouvert d'ici.
 */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import {
  automateBlocsFaux, automateErreurs, automateState, LIBELLE_BLOC, programmeTransfere,
} from '@/lib/sim/automateMiseEnService';
import EssaisPortail from './EssaisPortail';

export interface MiseEnServiceM221Props {
  tp: TpDefinition;
  st: AttemptState;
  /** L'écran ne répond que si l'automate est alimenté. */
  alimente: boolean;
  /** Le 24 V de commande est présent : l'essai devant le portail est possible. */
  commande: boolean;
  onSet: (kind: 'adresse' | 'tempo', id: string, value: string | number) => void;
  onTransferer: () => void;
  onEssai: (id: string) => void;
}

const fr = (v: number) => String(v).replace('.', ',');

export default function MiseEnServiceM221({ tp, st, alimente, commande, onSet, onTransferer, onEssai }: MiseEnServiceM221Props) {
  const def = tp.automateMiseEnService;
  const [msg, setMsg] = React.useState(
    'Le programme chargé vient d’un autre portail. Relis chaque adresse (table B.3.5-6) et chaque temporisation (DTR 8), puis transfère.',
  );
  const [essai, setEssai] = React.useState(false);
  if (!def) return null;
  const m = automateState(def, st);
  const erreurs = automateErreurs(tp, st);
  const transfereOk = m.transfere != null && erreurs.length === 0;

  const transferer = () => {
    const faux = automateBlocsFaux(def, m);
    setMsg(faux.length
      ? `Programme transféré, mais non conforme (${faux.map(f => LIBELLE_BLOC[f]).join(', ')}) : l’essai devant le portail va le montrer.`
      : `RUN · programme conforme au DTR 8 : ${def.tempos.map(t => `${t.label.split(' ')[0]} = ${fr(t.attendu)} s`).join(', ')}, KM1.1 à l’ouverture. ${def.pourquoiAdresses}`);
    onTransferer();
  };

  const entrees = def.variables.filter(v => def.entrees.includes(v.attendu));
  const sorties = def.variables.filter(v => def.sorties.includes(v.attendu));
  const ligne = (v: typeof def.variables[number], choix: string[]) => {
    const val = m.adresses[v.mnemo];
    return (
      <div key={v.mnemo} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-1.5" data-m221-var={v.mnemo}>
        <b className="font-mono-num text-[11.5px] text-white">{v.mnemo}</b>
        <span className="truncate text-[10.5px] text-[#9FB6D1]">{v.role}</span>
        <select
          value={val}
          disabled={!alimente}
          onChange={e => onSet('adresse', v.mnemo, e.target.value)}
          data-m221-adr={v.mnemo}
          className="rounded border border-[#2E4A66] bg-[#0F2236] px-1 py-0.5 font-mono-num text-[11.5px] text-[#CFE3FF] disabled:opacity-40"
        >
          {choix.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    );
  };

  return (
    <div className="mt-1.5 flex flex-col gap-2 rounded-[12px] border border-[#1C2B3C] bg-[#0B1726] p-2 text-[#CFE3FF]" data-m221-ecran>
      <div className="flex items-center justify-between gap-2 rounded-lg bg-[#123A5A] px-2 py-1 text-[11px] font-bold text-white">
        <span>{def.appareil}</span>
        <span data-m221-statut>
          {!alimente ? 'hors tension' : !m.transfere ? 'STOP · programme livré' : transfereOk ? 'RUN · conforme ✓' : 'RUN · non conforme'}
        </span>
      </div>
      <div className="text-[10.5px] text-[#9FB6D1]">{def.logiciel}</div>
      {!alimente && (
        <div className="rounded-lg border border-crit bg-crit/20 px-2 py-1.5 text-[11.5px] text-white">
          Automate hors tension : referme d&apos;abord la platine.
        </div>
      )}

      <div className="flex flex-col gap-1">
        <b className="text-[11.5px]">1 · Adressage des entrées (%I)</b>
        {entrees.map(v => ligne(v, def.entrees))}
      </div>
      <div className="flex flex-col gap-1">
        <b className="text-[11.5px]">2 · Adressage des sorties (%Q) · sens de marche</b>
        {sorties.map(v => ligne(v, def.sorties))}
      </div>
      <div className="flex flex-col gap-1">
        <b className="text-[11.5px]">3 · Temporisations (présélection)</b>
        {def.tempos.map(t => (
          <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5" data-m221-tm={t.id}>
            <span className="text-[11px]">{t.label}</span>
            <span className="flex items-center gap-1">
              <select
                value={m.tempos[t.id]}
                disabled={!alimente}
                onChange={e => onSet('tempo', t.id, Number(e.target.value))}
                data-m221-tempo={t.id}
                className="rounded border border-[#2E4A66] bg-[#0F2236] px-1 py-0.5 font-mono-num text-[11.5px] text-[#CFE3FF] disabled:opacity-40"
              >
                {def.valeurs.map(v => <option key={v} value={v}>{fr(v)}</option>)}
              </select>
              <span className="text-[11px]">s</span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          data-m221-transferer
          disabled={!alimente}
          onClick={transferer}
          className="min-h-touch rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-[#141A21] disabled:opacity-40"
        >
          Transférer dans l&apos;automate
        </button>
        <button
          type="button"
          data-m221-essai
          disabled={!alimente || !commande || !m.transfere}
          onClick={() => setEssai(true)}
          className="min-h-touch rounded-lg border border-[#7CD8FF] px-3 py-1.5 text-[12px] font-semibold text-[#CFE3FF] disabled:opacity-40"
        >
          Essayer devant le portail
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-[#1B222C] p-2 text-[11.5px] text-[#E9EEF5]">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-accent text-[11px] font-bold text-[#141A21]">P</span>
        <span data-m221-msg>{msg}</span>
      </div>
      {essai && (
        <EssaisPortail
          titre="Essai du programme transféré · portail de l’Écobike"
          faits={st.essais}
          programme={programmeTransfere(tp, st)}
          onReussi={onEssai}
          onClose={() => setEssai(false)}
        />
      )}
    </div>
  );
}
