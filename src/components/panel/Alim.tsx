'use client';

/**
 * Pupitre d'alimentation de l'atelier : la colonne verticale à gauche de la platine.
 *
 * Avant, l'énergie sortait de cinq presse-étoupes anonymes en bas de la platine,
 * déjà câblés. L'élève ne voyait pas d'où venait le courant et ne raccordait
 * jamais l'arrivée. Le pupitre lui donne une origine : un départ triphasé
 * verrouillable, cinq douilles repérées, et des cordons à tirer jusqu'au bornier.
 */
import React from 'react';
import { ALIM_W } from '@/lib/scene/geometry';

/** Repère, couleur de douille et couleur d'étiquette, dans l'ordre du pupitre. */
const DOUILLES: [string, string, string][] = [
  ['L1', '#20262D', '#20262D'],
  ['L2', '#20262D', '#20262D'],
  ['L3', '#20262D', '#20262D'],
  ['N', '#2C7BE5', '#2C7BE5'],
  ['PE', '#37B34A', '#1F7A34'],
];

export interface AlimProps {
  /** Hauteur de l'armoire : le pupitre l'accompagne sur toute sa hauteur. */
  h: number;
  /** y de la première douille (les suivantes descendent au pas de 46). */
  y0?: number;
}

export default function Alim({ h, y0 = 232 }: AlimProps) {
  return (
    <div className="se-alim" style={{ left: -ALIM_W, width: ALIM_W - 14, height: h }}>
      <div className="face">
        <span className="t">Pupitre</span>

        {/* départ triphasé : disjoncteur tétrapolaire et verrouillage à clé */}
        <div className="mod" style={{ top: 44 }}>
          {[0, 1, 2, 3].map((i) => <i key={i} />)}
        </div>
        <div className="serrure" style={{ top: 86 }}><span /></div>
        <div className="lbl" style={{ top: 116 }}>3×400V + N + T</div>
        <div className="voyant" style={{ top: 134 }} />

        {/* les cinq douilles, repérées : c'est ce que l'élève doit lire */}
        {DOUILLES.map(([rep, col, txt], i) => (
          <div key={rep} className="douille" style={{ top: y0 + i * 46 - 11 }}>
            <span className="d" style={{ background: col }} />
            <span className="r" style={{ color: txt }}>{rep}</span>
          </div>
        ))}

        {/* départ 230 V, en pied de pupitre */}
        <div className="lbl" style={{ bottom: 92 }}>230V / 10A</div>
        <div className="voyant" style={{ bottom: 62 }} />
        <div className="prise" style={{ bottom: 14 }}><span /></div>
      </div>
    </div>
  );
}
