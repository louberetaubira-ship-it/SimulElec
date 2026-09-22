'use client';

/** Goulottes (horizontales et verticales) et rails DIN. */
import React from 'react';
import type { SceneKind } from '@/lib/types';
import { DUCTS_H, DUCT_L, DUCT_R, RAILS, RAIL_X, ROW_LABELS } from '@/lib/scene/geometry';

export function Ducts(
  { scene, cover, ducts = DUCTS_H, labels: propres }:
  {
    scene: SceneKind; cover: boolean; ducts?: readonly (readonly [number, number])[];
    /** Libellés propres au TP (sinon ceux de la scène). */
    labels?: string[];
  },
) {
  const open = cover ? '' : ' open';
  const labels = propres ?? ROW_LABELS[scene] ?? ROW_LABELS.ind;
  return (
    <>
      {ducts.map((d, i) => (
        <div
          key={`h${i}`}
          className={`se-duct h${open}`}
          style={{ left: DUCT_L[1], top: d[0], width: DUCT_R[0] - DUCT_L[1], height: d[1] - d[0] }}
        >
          <span className="lbl">{labels[i]}</span>
        </div>
      ))}
      <div
        className={`se-duct v${open}`}
        style={{ left: DUCT_L[0], top: ducts[0][0], width: DUCT_L[1] - DUCT_L[0], height: ducts[ducts.length - 1][1] - ducts[0][0] }}
      />
      <div
        className={`se-duct v${open}`}
        style={{ left: DUCT_R[0], top: ducts[0][0], width: DUCT_R[1] - DUCT_R[0], height: ducts[ducts.length - 1][1] - ducts[0][0] }}
      />
    </>
  );
}

export function Rails({ rails = RAILS }: { rails?: readonly number[] }) {
  return (
    <>
      {rails.map((y) => (
        <div key={y} className="se-rail" style={{ left: RAIL_X[0], top: y, width: RAIL_X[1] - RAIL_X[0] }} />
      ))}
    </>
  );
}

export default Ducts;
