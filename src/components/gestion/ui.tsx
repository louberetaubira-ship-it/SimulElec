'use client';

/**
 * Briques d'interface communes aux écrans de gestion (administration, classes, fiche élève,
 * espace élève, éditeur de TP). Palette et cibles tactiles conformes à CLAUDE.md.
 */

import React, { useCallback, useState } from 'react';
import type { CompetenceEval, Mastery } from '@/lib/data/competences';

// ------------------------------------------------------------------ structure

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="font-title text-[32px] font-bold uppercase leading-tight tracking-wide sm:text-[40px]">
        {children}
      </h1>
      {sub && <p className="mt-1 max-w-[70ch] text-[14px] text-muted">{sub}</p>}
    </header>
  );
}

export function Panneau({
  title,
  aside,
  children,
  className = '',
}: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {title && (
            <h2 className="font-title text-[19px] font-semibold uppercase tracking-wide">{title}</h2>
          )}
          {aside && <div className="ml-auto flex flex-wrap items-center gap-2">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Un chiffre clé (établissement, élève…). */
export function Chiffre({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[.08em] text-muted">{label}</div>
      <div className="font-mono text-[22px] font-semibold leading-tight">
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-muted">{unit}</span>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ barres

export type Tone = 'accent' | 'good' | 'warn' | 'crit' | 'muted';

const TONE_BG: Record<Tone, string> = {
  accent: 'bg-accent',
  good: 'bg-good',
  warn: 'bg-warn',
  crit: 'bg-crit',
  muted: 'bg-[var(--line)]',
};

/** Barre d'avancement 0..1, avec libellé facultatif à droite. */
export function Barre({
  value,
  tone = 'accent',
  label,
  className = '',
}: {
  value: number;
  tone?: Tone;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 min-w-[64px] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]"
      >
        <div className={`h-full rounded-full ${TONE_BG[tone]}`} style={{ width: `${pct}%` }} />
      </div>
      {label && <span className="font-mono text-[11px] text-muted">{label}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ compétences

export const MASTERY_LABEL: Record<Mastery, string> = {
  acquis: 'acquis',
  enCours: 'en cours',
  nonAcquis: 'non acquis',
  nonEvalue: 'non évalué',
};

export const MASTERY_CLASS: Record<Mastery, string> = {
  acquis: 'border-good/60 bg-good/10 text-good',
  enCours: 'border-warn/60 bg-warn/10 text-warn',
  nonAcquis: 'border-crit/60 bg-crit/10 text-crit',
  nonEvalue: 'border-line bg-[var(--surface-2)] text-muted',
};

export const MASTERY_TONE: Record<Mastery, Tone> = {
  acquis: 'good',
  enCours: 'warn',
  nonAcquis: 'crit',
  nonEvalue: 'muted',
};

/** Pastilles compactes : un jeton par compétence (code + pourcentage). */
export function PastillesCompetences({ competences }: { competences: CompetenceEval[] }) {
  if (competences.length === 0) return <span className="text-[12px] text-muted">—</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {competences.map((c) => (
        <li
          key={c.code}
          title={`${c.label} — ${MASTERY_LABEL[c.mastery]} (${Math.round(c.score * 100)} %)`}
          className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${MASTERY_CLASS[c.mastery]}`}
        >
          {c.code}
          <span className="ml-1 font-normal opacity-80">{Math.round(c.score * 100)} %</span>
        </li>
      ))}
    </ul>
  );
}

/** Bilan détaillé : une ligne par compétence, libellé du référentiel + barre + niveau. */
export function BilanCompetences({ competences }: { competences: CompetenceEval[] }) {
  if (competences.length === 0) {
    return <p className="text-[13px] text-muted">Aucune compétence évaluée pour le moment.</p>;
  }
  return (
    <ul className="space-y-2">
      {competences.map((c) => (
        <li key={c.code} className="rounded-xl border border-line bg-surface p-2.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-[12px] font-semibold">{c.code}</span>
            <span className="flex-1 text-[13px] leading-snug">{c.label}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${MASTERY_CLASS[c.mastery]}`}
            >
              {MASTERY_LABEL[c.mastery]}
            </span>
          </div>
          <Barre
            className="mt-2"
            value={c.score}
            tone={MASTERY_TONE[c.mastery]}
            label={`${Math.round(c.score * 100)} %`}
          />
        </li>
      ))}
    </ul>
  );
}

/** Part de compétences acquises (barre + pourcentage) pour un tableau. */
export function ResumeCompetences({ competences }: { competences: CompetenceEval[] }) {
  const evaluees = competences.filter((c) => c.mastery !== 'nonEvalue');
  if (evaluees.length === 0) return <span className="text-[12px] text-muted">—</span>;
  const moyenne = evaluees.reduce((s, c) => s + c.score, 0) / evaluees.length;
  const acquises = evaluees.filter((c) => c.mastery === 'acquis').length;
  return (
    <div className="min-w-[140px]">
      <Barre
        value={moyenne}
        tone={moyenne >= 0.75 ? 'good' : moyenne >= 0.4 ? 'warn' : 'crit'}
        label={`${Math.round(moyenne * 100)} %`}
      />
      <div className="mt-1 text-[11px] text-muted">
        {acquises}/{evaluees.length} acquise{acquises > 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ divers

/** Bouton « Copier » : copie une valeur dans le presse-papiers et le confirme. */
export function CopierBouton({ value, label = 'Copier' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(() => {
    const ok = () => {
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(ok).catch(() => setDone(false));
      return;
    }
    ok();
  }, [value]);
  return (
    <button
      type="button"
      onClick={copy}
      className="min-h-touch rounded-[10px] border border-line bg-surface px-3 text-[12.5px] font-semibold hover:bg-[var(--surface-2)]"
    >
      {done ? 'Copié ✓' : label}
    </button>
  );
}

/** Champ de formulaire étiqueté, empilé sur mobile. */
export function Champ({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'min-h-touch w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-[14px] text-ink';

/** Message d'erreur / de confirmation. */
export function Message({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (!error && !ok) return null;
  return (
    <p
      aria-live="polite"
      className={`rounded-[10px] border px-3 py-2 text-[13px] ${
        error ? 'border-crit/50 bg-crit/10 text-crit' : 'border-good/50 bg-good/10 text-good'
      }`}
    >
      {error ?? ok}
    </p>
  );
}

/** Pastille « en direct » du suivi Realtime. */
export function PastilleDirect({ actif }: { actif: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        actif ? 'border-good/50 bg-good/10 text-good' : 'border-line bg-[var(--surface-2)] text-muted'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${actif ? 'animate-pulse bg-good' : 'bg-[var(--muted)]'}`} />
      {actif ? 'en direct' : 'hors ligne'}
    </span>
  );
}

/** Date courte en français. */
export function dateCourte(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
