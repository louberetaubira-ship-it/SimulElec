'use client';

/**
 * Schéma de la partie PUISSANCE, du réseau jusqu'au récepteur.
 *
 * C'est le schéma que l'élève a sous les yeux pendant la préparation : on ne
 * peut pas lui demander de reconnaître un organe sous son repère sans le lui
 * montrer. L'organe visé par la question en cours s'entoure d'un cadre.
 *
 * Le composant ne décide de rien : le tracé vient de `lib/schema/puissance.ts`
 * et les symboles de `lib/schema/symboles.ts` — les mêmes que sur le folio de
 * commande et sur les maquettes.
 */
import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { rendrePuissance } from '@/lib/schema/puissance';
import { STYLE_SYMBOLES } from '@/lib/schema/symboles';

export default function SchemaPuissance({
  tp, focus, className = '',
}: { tp: TpDefinition; focus?: string | null; className?: string }) {
  const rendu = React.useMemo(() => rendrePuissance(tp.puissance, { focus }), [tp.puissance, focus]);
  if (!rendu) return null;

  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 ${className}`}>
      <div className="mb-1 font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
        Schéma — circuit de puissance
      </div>
      <p className="m-0 mb-2 text-[11.5px] text-muted">
        Du réseau au récepteur, symboles normalisés et numéros de bornes le long des conducteurs.
      </p>
      <svg
        viewBox={`0 0 ${rendu.largeur} ${rendu.hauteur}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Schéma du circuit de puissance"
      >
        <style>{STYLE_SYMBOLES}</style>
        <g dangerouslySetInnerHTML={{ __html: rendu.svg }} />
      </svg>
    </div>
  );
}
