'use client';

/**
 * Barre de puces des domaines professionnels : « Tous » en tête, puis un bouton par
 * domaine dans l'ordre de `DOMAINES` (couleur, code, libellé court, compteur).
 *
 * - Côté élève (`montrerVides` faux) : un domaine sans TP n'apparaît pas.
 * - Côté professeur (`montrerVides` vrai) : tous les domaines sont visibles ; un domaine
 *   vide est dessiné en pointillé avec son compteur à 0 et, si `lienVide` est fourni,
 *   devient un lien « créer un TP dans ce domaine ».
 *
 * Les puces passent à la ligne (flex-wrap) et gardent une cible tactile de 40 px.
 */

import Link from 'next/link';
import { DOMAINES, type DomainePro } from '@/lib/taxonomy/domaines';

export interface DomaineChipsProps {
  /** Nombre de TP par domaine (un domaine absent compte 0). */
  counts: Partial<Record<DomainePro, number>>;
  /** Domaine choisi, `null` pour « Tous ». */
  value: DomainePro | null;
  onChange: (code: DomainePro | null) => void;
  /** Afficher aussi les domaines sans TP (vue professeur). */
  montrerVides?: boolean;
  /** Adresse proposée sur un domaine vide (par ex. `/prof/tp/nouveau?domaine=CODE`). */
  lienVide?: (code: DomainePro) => string;
  /** Compteur de « Tous » ; par défaut la somme des compteurs. */
  total?: number;
  /** Libellé accessible du groupe. */
  label?: string;
  className?: string;
}

const PUCE = 'inline-flex min-h-touch items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors';

export default function DomaineChips({
  counts, value, onChange, montrerVides = false, lienVide, total, label = 'Filtrer par domaine', className = '',
}: DomaineChipsProps) {
  const somme = total ?? DOMAINES.reduce((s, d) => s + (counts[d.code] ?? 0), 0);
  const tousActif = value === null;

  return (
    <div role="group" aria-label={label} data-testid="domaine-chips" className={`flex flex-wrap gap-1.5 ${className}`}>
      <button
        type="button"
        aria-pressed={tousActif}
        data-chip="tous"
        onClick={() => onChange(null)}
        className={`${PUCE} ${tousActif
          ? 'border-[var(--text)] bg-[var(--text)] text-[var(--surface)]'
          : 'border-[var(--line)] bg-[var(--surface)] text-muted hover:bg-[var(--surface-2)]'}`}
      >
        Tous
        <span className="font-mono text-[11.5px] tabular-nums opacity-80">{somme}</span>
      </button>

      {DOMAINES.map((d) => {
        const n = counts[d.code] ?? 0;
        if (n === 0 && !montrerVides) return null;
        const pastille = <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: d.couleur }} />;
        const contenu = (
          <>
            {pastille}
            <span className="font-mono text-[12px] tracking-[.04em]" style={{ color: d.couleur }}>{d.code}</span>
            <span>{d.court}</span>
            <span className="font-mono text-[11.5px] tabular-nums text-muted">{n}</span>
          </>
        );

        // Domaine vide (vue professeur) : pointillé, et lien de création s'il est prévu.
        if (n === 0) {
          const classes = `${PUCE} border-dashed border-[var(--line)] bg-transparent text-muted`;
          return lienVide ? (
            <Link
              key={d.code}
              href={lienVide(d.code)}
              data-chip={d.code}
              data-vide="1"
              title={`${d.label} — aucun TP : créer un TP dans ce domaine`}
              className={`${classes} hover:bg-[var(--surface-2)]`}
            >
              {contenu}
              <span aria-hidden className="text-[14px] leading-none">+</span>
            </Link>
          ) : (
            <span key={d.code} data-chip={d.code} data-vide="1" title={`${d.label} — aucun TP`} className={classes}>
              {contenu}
            </span>
          );
        }

        const actif = value === d.code;
        return (
          <button
            key={d.code}
            type="button"
            aria-pressed={actif}
            data-chip={d.code}
            title={d.label}
            onClick={() => onChange(actif ? null : d.code)}
            className={`${PUCE} ${actif ? 'text-[var(--text)]' : 'bg-[var(--surface)] text-muted hover:bg-[var(--surface-2)]'}`}
            style={actif
              ? { borderColor: d.couleur, background: `${d.couleur}1F`, boxShadow: `inset 0 0 0 1px ${d.couleur}` }
              : { borderColor: 'var(--line)' }}
          >
            {contenu}
          </button>
        );
      })}
    </div>
  );
}
