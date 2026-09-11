'use client';

/**
 * Bandeau « Ce qui est évalué ici » : les compétences du référentiel de l'élève mobilisées
 * par l'étape en cours, avec leurs critères de réussite.
 *
 * Déplié la première fois, replié ensuite : l'état d'ouverture est mémorisé dans le
 * `localStorage` (clé `simulelec.competences.ouvert`).
 */

import React from 'react';
import {
  competencesForStage, DOMAIN_LABEL, domainsOfStage, type DiplomaId,
} from '@/lib/data/competences';
import { diplomaShort } from '@/lib/student';

const KEY = 'simulelec.competences.ouvert';

/** Lecture tolérante de la préférence d'ouverture (stockage indisponible : déplié). */
function readOpen(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw == null ? null : raw === '1';
  } catch {
    return null;
  }
}

function writeOpen(v: boolean): void {
  try {
    window.localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* stockage indisponible : on continue sans mémoriser */
  }
}

interface Props {
  diploma: DiplomaId;
  /** Nature du parcours : platine (11 étapes) ou dimensionnement (11 étapes PV). */
  kind?: 'platine' | 'dimensionnement';
  stage: number;
  /** Libellé de l'étape, affiché en tête du bandeau. */
  stageLabel?: string;
  /** Rendu compact (tiroir du mode atelier). */
  compact?: boolean;
  className?: string;
}

export default function CompetencesStage({
  diploma, kind = 'platine', stage, stageLabel, compact, className = '',
}: Props) {
  const [open, setOpen] = React.useState(true);

  // première étape : déplié ; ensuite, l'état mémorisé (replié par défaut).
  React.useEffect(() => {
    const saved = readOpen();
    if (stage === 0) { setOpen(saved ?? true); return; }
    setOpen(saved ?? false);
  }, [stage]);

  const comps = React.useMemo(() => competencesForStage(diploma, kind, stage), [diploma, kind, stage]);
  const domains = React.useMemo(() => domainsOfStage(kind, stage), [kind, stage]);

  if (comps.length === 0) return null;

  const toggle = () => {
    setOpen(v => { writeOpen(!v); return !v; });
  };

  return (
    <section
      data-competences-stage
      data-open={open ? '1' : '0'}
      className={`border-b border-[var(--line)] bg-[var(--surface)] ${className}`}
    >
      <button
        type="button"
        data-competences-toggle
        onClick={toggle}
        aria-expanded={open}
        className="flex min-h-touch w-full flex-wrap items-center gap-2 px-3 py-2 text-left"
      >
        <span aria-hidden className="text-[12px] text-muted">{open ? '▾' : '▸'}</span>
        <span className="font-title text-[11px] font-semibold uppercase tracking-[.14em] text-accent">
          Ce qui est évalué ici
        </span>
        <span className="flex flex-wrap gap-1">
          {comps.map(c => (
            <span
              key={c.code}
              className="rounded-md bg-ink px-1.5 py-0.5 font-mono-num text-[10.5px] font-semibold text-[var(--app)]"
            >
              {c.code}
            </span>
          ))}
        </span>
        <span className="ml-auto text-[11px] text-muted">
          {diplomaShort(diploma)}{stageLabel ? ` · ${stageLabel}` : ''}
        </span>
      </button>

      {open && (
        <div className={`grid gap-2 px-3 pb-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
          {comps.map(c => (
            <article key={c.code} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
              <h3 className="m-0 flex flex-wrap items-baseline gap-1.5 text-[12.5px] font-semibold leading-snug">
                <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono-num text-[10.5px] text-[var(--app)]">
                  {c.code}
                </span>
                {c.label}
                {c.unit && <span className="text-[10.5px] font-normal text-muted">({c.unit})</span>}
              </h3>
              <p className="m-0 mt-1 text-[10.5px] uppercase tracking-[.06em] text-muted">
                Critères de réussite
              </p>
              <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                {c.criteria.map(x => (
                  <li key={x} className="flex gap-1.5 text-[11.5px] leading-relaxed">
                    <span aria-hidden className="text-good">✓</span><span>{x}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <p className="m-0 text-[11px] text-muted sm:col-span-2">
            Domaines travaillés : {domains.map(d => DOMAIN_LABEL[d]).join(' · ')}. Ces compétences sont
            celles du référentiel {diplomaShort(diploma)}.
          </p>
        </div>
      )}
    </section>
  );
}
