'use client';

/**
 * Pastille d'un domaine professionnel : point de couleur + code (« IND »), et
 * éventuellement le libellé court. La couleur vient de `DOMAINE_BY_CODE[code].couleur`
 * (style en ligne : la palette des domaines n'est pas dans la config Tailwind).
 */

import { DOMAINE_BY_CODE, type DomainePro } from '@/lib/taxonomy/domaines';

export interface DomaineBadgeProps {
  code: DomainePro;
  /** `sm` pour les cartes et les tableaux, `md` pour les titres de section. */
  taille?: 'sm' | 'md';
  /** Affiche le libellé court après le code (« IND · Industrie »). */
  avecLibelle?: boolean;
  /** Préfixe devant le code, par exemple `+` pour un domaine secondaire. */
  prefixe?: string;
  className?: string;
}

export default function DomaineBadge({
  code, taille = 'sm', avecLibelle = false, prefixe = '', className = '',
}: DomaineBadgeProps) {
  const d = DOMAINE_BY_CODE[code];
  if (!d) return null;
  const tailles = taille === 'md'
    ? 'gap-1.5 px-2.5 py-1 text-[12.5px]'
    : 'gap-1 px-2 py-0.5 text-[10.5px]';
  const point = taille === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';
  return (
    <span
      data-domaine={code}
      title={d.label}
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-semibold ${tailles} ${className}`}
      // Fond teinté à ~10 % et bordure à ~40 % de la couleur du domaine (hex + alpha).
      style={{ borderColor: `${d.couleur}66`, background: `${d.couleur}1A` }}
    >
      <span aria-hidden className={`${point} flex-none rounded-full`} style={{ background: d.couleur }} />
      <span className="font-mono tracking-[.04em]" style={{ color: d.couleur }}>{prefixe}{code}</span>
      {avecLibelle && <span className="text-[var(--text)]">{d.court}</span>}
    </span>
  );
}
