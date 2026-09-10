'use client';

/**
 * Briques d'interface du parcours de dimensionnement : chaîne énergétique, messages de contrôle,
 * champs « réponse élève », cartes de fiches techniques, compteurs ± et formules.
 * Mobile-first : cibles tactiles ≥ 40 px, tableaux dans un conteneur défilant.
 */

import React from 'react';
import {
  chainState, PV_CHAIN, type PvMessage, type PvState,
} from '@/lib/pv/dimensionnement';

/** Chaîne énergétique : un bloc par maillon, vert / rouge / en cours. */
export function ChainBar({ s }: { s: PvState }) {
  const state = chainState(s);
  return (
    <div
      className="flex items-stretch gap-1.5 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5"
      aria-label="Chaîne énergétique de l'installation"
    >
      {PV_CHAIN.map((b, i) => {
        const st = state[i];
        const cur = s.step === b.step;
        const tone =
          st === 'ok' ? 'border-good bg-good/10'
            : st === 'bad' ? 'border-crit bg-crit/10'
              : 'border-[var(--line)] bg-[var(--surface)]';
        return (
          <React.Fragment key={b.title}>
            <div
              data-chain={b.title}
              data-state={st}
              className={`relative min-w-[92px] flex-1 rounded-xl border-2 px-2 py-1.5 text-center text-[11px] leading-tight ${tone} ${cur ? 'ring-2 ring-accent/40' : ''}`}
            >
              {st === 'ok' && <span aria-hidden className="absolute right-1.5 top-0.5 font-bold text-good">✓</span>}
              <b className="block font-title text-[13px] font-bold">{b.title}</b>
              <small className="text-muted">{b.sub}</small>
            </div>
            {i < PV_CHAIN.length - 1 && <span aria-hidden className="self-center text-[15px] text-muted">→</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Messages de contrôle d'une étape (bloquant, vigilance, validation). */
export function Messages({ list }: { list: PvMessage[] }) {
  return (
    <div data-messages className="flex flex-col gap-1.5">
      {list.map((m, i) => {
        const tone =
          m.kind === 'bad' ? 'border-l-crit bg-crit/10'
            : m.kind === 'warn' ? 'border-l-warn bg-warn/10'
              : 'border-l-good bg-good/10';
        const prefix = m.kind === 'bad' ? '🔴 ERREUR — ' : m.kind === 'warn' ? '🟠 ATTENTION — ' : '🟢 ';
        return (
          <div key={`${m.kind}-${i}-${m.title}`} data-msg={m.kind} className={`rounded-r-xl border-l-4 px-2.5 py-2 text-[12.5px] leading-relaxed ${tone}`}>
            <b className="block">{prefix}{m.title}</b>
            {m.detail}
          </div>
        );
      })}
    </div>
  );
}

/** Formule ou règle de calcul, en police à chasse fixe sur fond sombre. */
export function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-[#20262D] px-3 py-2 font-mono-num text-[12px] leading-relaxed text-[#E8ECF0]">
      {children}
    </pre>
  );
}

/** Champ « réponse de l'élève » : le résultat n'est jamais affiché, seulement contrôlé. */
export function AnsBox({
  id, question, unit, value, onChange, onCheck,
}: {
  id: string;
  question: string;
  unit: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  onCheck: () => void;
}) {
  return (
    <div className="my-2 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-accent bg-accent/5 px-2.5 py-2">
      <label htmlFor={`ans_${id}`} className="text-[12.5px] font-semibold">{question}</label>
      <input
        id={`ans_${id}`}
        data-ans={id}
        type="number"
        step="any"
        inputMode="decimal"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        onBlur={onCheck}
        className="min-h-touch w-[130px] rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 font-mono-num text-[13px]"
      />
      <span className="text-[12px] text-muted">{unit}</span>
    </div>
  );
}

/** Cartes de choix de matériel (fiches techniques). */
export function OptionCards<T extends { id: string }>({
  list, selected, onPick, render, name,
}: {
  list: T[];
  selected: string;
  onPick: (id: string) => void;
  render: (o: T) => React.ReactNode;
  name: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={name}>
      {list.map(o => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === selected}
          data-pick={o.id}
          onClick={() => onPick(o.id)}
          className={`min-h-touch rounded-xl border bg-[var(--surface)] px-2.5 py-2 text-left ${o.id === selected ? 'border-accent ring-2 ring-accent/25' : 'border-[var(--line)]'}`}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

/** Compteur − valeur + (Ns, Np, Bns, Bnp). */
export function NumStepper({
  label, value, onStep, name,
}: {
  label: string;
  value: number;
  onStep: (d: number) => void;
  name: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-step={`${name}-`}
          aria-label={`${label} : diminuer`}
          onClick={() => onStep(-1)}
          className="min-h-touch min-w-[40px] rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[16px] font-bold"
        >
          −
        </button>
        <span data-value={name} className="min-w-[26px] text-center font-mono-num text-[16px] font-bold">{value}</span>
        <button
          type="button"
          data-step={`${name}+`}
          aria-label={`${label} : augmenter`}
          onClick={() => onStep(1)}
          className="min-h-touch min-w-[40px] rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[16px] font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Tableau défilant horizontalement sur mobile. */
export function Scroller({ children }: { children: React.ReactNode }) {
  return <div className="-mx-1 overflow-x-auto px-1">{children}</div>;
}

/** Ligne clé / valeur du résumé. */
export function Kv({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12.5px]">
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt className="m-0 text-muted">{k}</dt>
          <dd className="m-0 text-right font-mono-num">{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
