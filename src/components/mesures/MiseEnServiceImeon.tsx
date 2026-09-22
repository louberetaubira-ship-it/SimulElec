'use client';

/**
 * Écran de mise en service d'un onduleur hybride (IMEON), pendant la déconsignation.
 *
 * Sur le modèle de `MiseEnServiceKnx.tsx` : tout ce que l'écran propose vient du TP
 * (`tp.imeonMiseEnService` — priorités, types de batterie, réglages attendus et leurs
 * justifications). Les réponses de l'élève sont commises dans `st.imeon` par deux
 * actions du store (`imeonSet`, `imeonAppliquer`) ; ce composant ne garde en local
 * que le message du professeur virtuel.
 *
 * L'écran ne valide rien tout seul : c'est « Appliquer » qui confronte les réglages
 * au cahier des charges. Une priorité mal ordonnée est REFUSÉE, et l'onduleur reste
 * en veille — il ne démarre qu'avec des réglages conformes.
 */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { imeonReglagesFaux, imeonState, LIBELLE_REGLAGE, type ImeonReglage } from '@/lib/sim/imeonMiseEnService';

export interface MiseEnServiceImeonProps {
  tp: TpDefinition;
  st: AttemptState;
  /** L'écran ne s'allume que si l'onduleur est alimenté. */
  alimente: boolean;
  onSet: (reglage: ImeonReglage, value: string | boolean) => void;
  onAppliquer: () => void;
}

export default function MiseEnServiceImeon({ tp, st, alimente, onSet, onAppliquer }: MiseEnServiceImeonProps) {
  const def = tp.imeonMiseEnService;
  const m = imeonState(st);
  const [msg, setMsg] = React.useState(
    'Règle les trois paramètres d’après le cahier des charges, puis applique : l’écran refusera une configuration non conforme.',
  );
  if (!def) return null;

  const choix = (active: boolean, onClick: () => void, label: React.ReactNode, key: React.Key, data?: string) => (
    <button
      key={key}
      type="button"
      data-imeon={data}
      disabled={!alimente}
      onClick={onClick}
      className={`min-h-touch rounded-lg border px-2.5 py-1 text-left text-[11.5px] font-semibold disabled:opacity-40 ${
        active ? 'border-[#7CD8FF] bg-[#123A5A] text-white' : 'border-[#2E4A66] bg-[#0F2236] text-[#CFE3FF]'
      }`}
    >
      {label}
    </button>
  );

  const appliquer = () => {
    const faux = imeonReglagesFaux(tp, st);
    if (faux.length) {
      setMsg(faux.map(f => `${LIBELLE_REGLAGE[f]} : ${def.pourquoi[f]}`).join(' '));
    } else {
      setMsg(`Réglages acceptés. ${def.pourquoi.priorite}`);
    }
    onAppliquer();
  };

  return (
    <div className="mt-1.5 flex flex-col gap-2 rounded-[12px] border border-[#1C2B3C] bg-[#0B1726] p-2 text-[#CFE3FF]" data-imeon-ecran>
      <div className="flex items-center justify-between rounded-lg bg-[#123A5A] px-2 py-1 text-[11px] font-bold text-white">
        <span>{def.appareil} · paramétrage</span>
        <span data-imeon-statut>{!alimente ? 'éteint' : m.applique ? 'réglages appliqués ✓' : 'non appliqué'}</span>
      </div>
      {!alimente && (
        <div className="rounded-lg border border-crit bg-crit/20 px-2 py-1.5 text-[11.5px] text-white">
          Écran éteint : l&apos;onduleur n&apos;est pas encore alimenté.
        </div>
      )}

      <div className="flex flex-col gap-1">
        <b className="text-[11.5px]">1 · Priorité des sources (qui alimente d&apos;abord l&apos;Écobike)</b>
        <div className="flex flex-wrap gap-1">
          {def.priorites.map((p, i) => choix(m.priorite === p, () => onSet('priorite', p), p, p, `prio-${i}`))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <b className="text-[11.5px]">2 · Injection du surplus sur le réseau public</b>
        <div className="flex flex-wrap gap-1">
          {choix(m.injection === true, () => onSet('injection', true), 'Oui (réglage usine)', 'oui', 'inj-oui')}
          {choix(m.injection === false, () => onSet('injection', false), 'Non · autoconsommation', 'non', 'inj-non')}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <b className="text-[11.5px]">3 · Type de batterie raccordée à l&apos;entrée batteries</b>
        <div className="flex flex-wrap gap-1">
          {def.batteries.map((b, i) => choix(m.batterie === b, () => onSet('batterie', b), b, b, `bat-${i}`))}
        </div>
      </div>

      <button
        type="button"
        data-imeon-appliquer
        disabled={!alimente || m.priorite == null || m.injection == null || m.batterie == null}
        onClick={appliquer}
        className="min-h-touch self-start rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-[#141A21] disabled:opacity-40"
      >
        Appliquer les réglages
      </button>

      <div className="flex items-start gap-2 rounded-xl bg-[#1B222C] p-2 text-[11.5px] text-[#E9EEF5]">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-accent text-[11px] font-bold text-[#141A21]">P</span>
        <span data-imeon-msg>{msg}</span>
      </div>
    </div>
  );
}
