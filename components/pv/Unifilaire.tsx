'use client';

/**
 * Schéma unifilaire de l'installation : le SVG est produit par le moteur pur
 * (`unifilaire()` de `src/lib/pv/dimensionnement.ts`), sans donnée saisie par l'élève.
 */

import React from 'react';
import { unifilaire, type PvState } from '@/lib/pv/dimensionnement';

export default function Unifilaire({ s }: { s: PvState }) {
  const svg = React.useMemo(() => unifilaire(s), [s]);
  return (
    <figure data-unifilaire className="m-0 w-full">
      <figcaption className="mb-1 font-title text-[11px] font-semibold uppercase tracking-[.12em] text-muted">
        Schéma unifilaire
      </figcaption>
      <div
        className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 [&>svg]:h-auto [&>svg]:max-w-full"
        // contenu généré par le moteur : libellés fixes et valeurs numériques uniquement
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </figure>
  );
}
