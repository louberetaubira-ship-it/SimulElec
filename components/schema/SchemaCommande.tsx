'use client';

/**
 * Folio du circuit de commande, affiché à l'étape de dépannage.
 *
 * L'élève y lit le montage avec les symboles normalisés qu'il retrouvera sur un
 * dossier technique, et c'est là qu'il pose ses pointes de touche : chaque borne
 * du schéma est un point de mesure. Passer du schéma à la mesure sans changer de
 * représentation, c'est ce qui rend le dépannage lisible.
 *
 * Le composant ne décide de rien : le tracé vient de `lib/schema/folio.ts`, les
 * symboles de `lib/schema/symboles.ts`, et l'état des contacts du réseau de
 * `lib/sim/commande.ts`.
 */
import React from 'react';
import type { TpDefinition } from '@/lib/types';
import type { Arete } from '@/lib/sim/commande';
import { rendreFolio, STYLE_FOLIO } from '@/lib/schema/folio';
import { STYLE_SYMBOLES } from '@/lib/schema/symboles';

export interface SchemaCommandeProps {
  tp: TpDefinition;
  /** Réseau de commande dans l'état courant. */
  reseau: readonly Arete[];
  /** Bornes de la zone à mettre en évidence (l'hypothèse visée). */
  zone?: readonly string[];
  /** Repère de l'organe à encadrer (question de préparation en cours). */
  focusRep?: string | null;
  /** Pointes de touche posées. */
  probes?: { r?: string | null; k?: string | null };
  onBorne?: (id: string) => void;
}

export default function SchemaCommande({
  tp, reseau, zone, focusRep, probes, onBorne,
}: SchemaCommandeProps) {
  const rendu = React.useMemo(
    () => rendreFolio(tp, reseau, { zone, focusRep, r: probes?.r, k: probes?.k }),
    [tp, reseau, zone, focusRep, probes?.r, probes?.k],
  );

  const svgRef = React.useRef<SVGSVGElement>(null);

  // Les points de mesure sont produits avec le tracé : on écoute au niveau du
  // SVG plutôt que d'attacher un gestionnaire à chacun.
  const clic = React.useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    if (!onBorne) return;
    const cible = (e.target as Element).closest('[data-noeud]');
    const id = cible?.getAttribute('data-noeud');
    if (id) onBorne(id);
  }, [onBorne]);

  if (!rendu) {
    return (
      <p className="m-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-[12.5px] text-muted">
        Ce TP n&apos;a pas encore de folio de commande : le dépannage se fait sur la platine.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="mb-1 font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
        Schéma développé — circuit de commande
      </div>
      <p className="m-0 mb-2 text-[11.5px] text-muted">
        Symboles normalisés, repérage équipotentiel des conducteurs en{' '}
        <span className="font-semibold text-accent">orange</span>, numéros de bornes le long des
        contacts. Les cadres pointillés disent ce qui n&apos;est pas dans l&apos;armoire. Un organe
        qui coupe est tracé en rouge. Clique deux bornes pour y poser tes pointes.
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${rendu.largeur} ${rendu.hauteur}`}
        className="block h-auto w-full touch-manipulation"
        role="img"
        aria-label="Schéma développé du circuit de commande, bornes cliquables"
        onClick={clic}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clic(e); } }}
      >
        <style>{STYLE_SYMBOLES + STYLE_FOLIO}</style>
        <g dangerouslySetInnerHTML={{ __html: rendu.svg }} />
      </svg>
    </div>
  );
}
