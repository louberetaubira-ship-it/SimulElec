'use client';

/**
 * Réglage du barème d'un TP par le professeur.
 *
 * La valeur produite est une surcharge partielle (`BaremeOverride`) destinée à
 * `tps.definition.bareme` : un TP sans surcharge garde exactement la notation par défaut
 * (`DEFAULT_BAREME`, documenté dans `src/lib/sim/progress.ts`).
 */

import React from 'react';
import type { Bareme, BaremeOverride } from '@/lib/types';
import { BAREME_LABELS, baremeTotal, DEFAULT_BAREME, resolveBareme } from '@/lib/sim/progress';

const COUTS: { key: keyof Omit<Bareme, 'poids'>; label: string; aide: string; step: number }[] = [
  { key: 'coutErreurPose', label: 'Erreur de pose', aide: 'points retirés par appareil mal posé', step: 0.5 },
  { key: 'coutErreurCablage', label: 'Liaison refusée', aide: 'points retirés par erreur de câblage', step: 0.5 },
  { key: 'coutFilRetire', label: 'Fil retiré', aide: 'se reprendre n’est pas une faute : garder un coût faible', step: 0.25 },
  { key: 'coutReset', label: 'Réinitialisation', aide: 'points retirés par remise à zéro du câblage', step: 0.25 },
  { key: 'coutCorrectionMax', label: 'Plafond des corrections', aide: 'pénalité maximale des gestes de correction', step: 0.5 },
  { key: 'coutAide', label: 'Ouverture d’un rappel de cours', aide: 'retiré au score 0..1 de l’étape', step: 0.05 },
];

interface Props {
  value?: BaremeOverride | null;
  onChange: (v: BaremeOverride) => void;
  className?: string;
}

export default function BaremeEditor({ value, onChange, className = '' }: Props) {
  const b = React.useMemo(() => resolveBareme(value), [value]);
  const total = baremeTotal(b);

  const setPoids = (k: keyof Bareme['poids'], v: number) =>
    onChange({ ...(value ?? {}), poids: { ...(value?.poids ?? {}), [k]: v } });
  const setCout = (k: keyof Omit<Bareme, 'poids'>, v: number) => onChange({ ...(value ?? {}), [k]: v });

  const champ =
    'min-h-touch w-[74px] rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2 text-right font-mono-num text-[12px]';

  return (
    <section
      data-bareme-editor
      className={`flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 ${className}`}
    >
      <header className="flex flex-wrap items-baseline gap-2">
        <h3 className="m-0 font-title text-[15px] font-semibold uppercase tracking-wide">Barème du TP</h3>
        <span
          data-bareme-total
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${total === 100 ? 'bg-good/15 text-good' : 'bg-warn/15 text-warn'}`}
        >
          total {Math.round(total * 10) / 10} points
        </span>
        <button
          type="button"
          data-bareme-reset
          onClick={() => onChange({})}
          className="ml-auto min-h-touch rounded-[10px] border border-[var(--line)] px-3 text-[11.5px] font-semibold"
        >
          Barème par défaut
        </button>
      </header>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {(Object.keys(BAREME_LABELS) as (keyof Bareme['poids'])[]).map(k => (
          <label key={k} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5">
            <span className="flex-1 text-[12px]">{BAREME_LABELS[k]}</span>
            <input
              type="number"
              min={0}
              step={1}
              data-poids={k}
              value={b.poids[k]}
              onChange={e => setPoids(k, Number(e.target.value))}
              className={champ}
            />
            <span className="text-[11px] text-muted">pts</span>
          </label>
        ))}
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {COUTS.map(c => (
          <label key={c.key} className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-2.5 py-1.5">
            <span className="flex-1 text-[12px]">
              {c.label}
              <small className="block text-[10.5px] text-muted">{c.aide}</small>
            </span>
            <input
              type="number"
              min={0}
              step={c.step}
              data-cout={c.key}
              value={b[c.key]}
              onChange={e => setCout(c.key, Number(e.target.value))}
              className={champ}
            />
          </label>
        ))}
      </div>

      <p className="m-0 text-[11px] leading-relaxed text-muted">
        Sans réglage, le barème par défaut s&apos;applique : {DEFAULT_BAREME.poids.materiel} points pour le
        choix du matériel, {DEFAULT_BAREME.poids.cablage} pour le câblage,{' '}
        {DEFAULT_BAREME.poids.epi} pour les EPI et la consignation…, une liaison refusée coûtant{' '}
        {DEFAULT_BAREME.coutErreurCablage} points et un fil retiré {DEFAULT_BAREME.coutFilRetire} point.
        Les pénalités appliquées au score par compétence suivent automatiquement ces coûts.
      </p>
    </section>
  );
}
