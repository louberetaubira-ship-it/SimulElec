'use client';

/**
 * Calques de mesure et de consignation : pointes de touche (rouge / noire) avec leur cordon,
 * mâchoire de pince ampèremétrique sur un fil, cadenas + étiquette « NE PAS MANŒUVRER ».
 * Port de `mesOverlay` de `docs/reference/illustration-v3.tpl.html`.
 */
import React from 'react';
import type { Point } from '@/lib/scene/geometry';
import { LockSvg } from './svg';

export interface OverlaysProps {
  /** Position des pointes de touche (null si non posée). */
  probes?: { r?: Point | null; k?: Point | null };
  /** Position de la mâchoire de pince sur le fil choisi. */
  clamp?: Point | null;
  /** Boîte(s) de l'appareil consigné : un cadenas + macaron par organe (Q1, Q2…). */
  lock?: { x: number; y: number; w: number; h: number } | Array<{ x: number; y: number; w: number; h: number }> | null;
}

export default function Overlays({ probes, clamp, lock }: OverlaysProps) {
  const date = React.useMemo(() => new Date().toLocaleDateString('fr-FR'), []);
  const boxes = lock ? (Array.isArray(lock) ? lock : [lock]) : [];
  return (
    <>
      {boxes.map((b, i) => (
        <React.Fragment key={`lock${i}`}>
          <div className="se-lock" style={{ left: b.x + b.w / 2, top: b.y + b.h / 2 + 6 }}>
            <LockSvg />
          </div>
          <div className="se-tagc" style={{ left: b.x + b.w / 2, top: b.y - 30 }}>
            NE PAS MANŒUVRER<br />consigné · {date}
          </div>
        </React.Fragment>
      ))}
      {probes?.r ? <div className="se-probe r" style={{ left: probes.r.x, top: probes.r.y }} /> : null}
      {probes?.k ? <div className="se-probe k" style={{ left: probes.k.x, top: probes.k.y }} /> : null}
      {clamp ? <div className="se-clamp" style={{ left: clamp.x, top: clamp.y }} /> : null}
    </>
  );
}
