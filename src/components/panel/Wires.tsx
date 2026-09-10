'use client';

/**
 * Fils : une couche sous les couvercles (cheminement complet) et une couche au-dessus
 * (brins de raccordement + parties extérieures : porte, moteur, réseau).
 */
import React from 'react';
import type { NetKind } from '@/lib/types';
import { NET_COLOR, PANEL_H, PANEL_W, type Point } from '@/lib/scene/geometry';
import { externalPart, pathD, stubs } from '@/lib/scene/route';

export { NET_COLOR };

export interface RoutedWire {
  index: number;
  pts: Point[];
  net: NetKind;
  /** Liaison en porte ou pré-câblée : sa partie extérieure reste visible couvercles fermés. */
  external: boolean;
  dead?: boolean;
}

export interface WiresProps {
  wires: RoutedWire[];
  highlight?: number | null;
  pick?: boolean;
  onWire?: (index: number) => void;
}

const cls = (w: RoutedWire, highlight?: number | null): string =>
  [w.net === 'PE' ? 'pe' : '', highlight === w.index ? 'hl' : '', w.dead ? 'dead' : ''].filter(Boolean).join(' ');

/** Couche sous les couvercles : tout le cheminement. */
export function WiresUnder({ wires, highlight, pick, onWire }: WiresProps) {
  return (
    <svg className={`se-wires${pick ? ' pick' : ''}`} viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}>
      {wires.map((w) => (
        <path
          key={w.index}
          d={pathD(w.pts)}
          data-w={w.index}
          stroke={NET_COLOR[w.net]}
          className={cls(w, highlight)}
          onClick={onWire ? () => onWire(w.index) : undefined}
        />
      ))}
    </svg>
  );
}

/** Couche au-dessus des couvercles : brins visibles + parties hors platine. */
export function WiresOver({ wires, highlight, pick, onWire }: WiresProps) {
  return (
    <svg className={`se-wires over${pick ? ' pick' : ''}`} viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}>
      {wires.map((w) => (
        <React.Fragment key={w.index}>
          {stubs(w.pts).map(([a, b], k) => (
            <path
              key={`s${k}`}
              d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
              data-w={w.index}
              stroke={NET_COLOR[w.net]}
              className={cls(w, highlight)}
              onClick={onWire ? () => onWire(w.index) : undefined}
            />
          ))}
          {w.external && externalPart(w.pts).length > 1 ? (
            <path
              d={pathD(externalPart(w.pts))}
              data-w={w.index}
              stroke={NET_COLOR[w.net]}
              className={cls(w, highlight)}
              onClick={onWire ? () => onWire(w.index) : undefined}
            />
          ) : null}
        </React.Fragment>
      ))}
    </svg>
  );
}
