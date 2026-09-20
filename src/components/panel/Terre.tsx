'use client';

/**
 * Bloc « ensemble terre », sous la platine et HORS du coffret.
 *
 * Une prise de terre n'est pas de l'appareillage : c'est un ouvrage, en partie
 * enterré. Le bloc lui donne ce qui manquait au dessin — une ligne de sol. Au
 * -dessus, la barrette de coupure, qu'on doit pouvoir atteindre sans creuser ;
 * en dessous, le conducteur nu et le piquet, avec la cote de profondeur mesurée
 * depuis le sol, puisque c'est la longueur en contact avec la terre qui fait la
 * résistance.
 */
import React from 'react';
import type { AnnexItem, CatalogueItem } from '@/lib/types';
import { svgForKey } from './svg';

export interface TerreProps {
  items: AnnexItem[];
  catalogue: Record<string, CatalogueItem>;
  /** y du haut du bloc et sa hauteur, dans la scène. */
  y: number;
  h: number;
  /** y de la ligne de sol, relatif au bloc. */
  sol: number;
}

export default function Terre({ items, catalogue, y, h, sol }: TerreProps) {
  return (
    <div className="se-terre" style={{ top: y, height: h }}>
      <span className="t">Ensemble terre · hors coffret</span>
      <div className="sol" style={{ top: sol, height: h - sol }}>
        <span className="niv">niveau du sol</span>
      </div>
      {items.map((it) => {
        const item = catalogue[it.key];
        const vector = svgForKey(it.key);
        return (
          <div key={it.rep} className="item" style={{ left: it.x, top: it.y, width: it.w, height: it.h }}>
            {vector ?? <img src={item?.src ?? `/sprites/${it.key}.png`} alt={it.name} />}
            <div className="rep">{it.rep}</div>
          </div>
        );
      })}
    </div>
  );
}
