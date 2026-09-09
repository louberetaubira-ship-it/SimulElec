'use client';

import React from 'react';
import type { NetKind, TpDefinition } from '@/lib/types';
import { netLive, type SimState } from '@/lib/sim/engine';
import { PANEL_H, PANEL_W, terminalPos, wirePath } from '@/lib/sim/layout';

export const NET_COLOR: Record<NetKind, string> = {
  L1: 'var(--l1)', L2: 'var(--l2)', L3: 'var(--l3)', N: 'var(--wn)', PE: 'var(--pe)', C: 'var(--ctl)',
};

export interface DrawnWire { a: string; b: string; net: NetKind }

interface Props {
  tp: TpDefinition;
  wires: DrawnWire[];
  sim: SimState | null;
  /** affiche l'étiquette de courant sur L1 */
  showCurrent: boolean;
}

const fr = (v: number, d = 1) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function Wires({ tp, wires, sim, showCurrent }: Props) {
  const currentTag = React.useMemo(() => {
    if (!sim || !showCurrent || sim.I <= 0.05) return null;
    const a = terminalPos(tp, 'f1.2');
    const b = terminalPos(tp, 'x1_6.a');
    if (!a || !b) return null;
    return { x: (a.x + b.x) / 2 - 4, y: (a.y + b.y) / 2, text: `${fr(sim.I, 1)} A` };
  }, [tp, sim, showCurrent]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[2]"
      width={PANEL_W}
      height={PANEL_H}
      viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
      aria-hidden
    >
      {wires.map((w, i) => {
        const a = terminalPos(tp, w.a);
        const b = terminalPos(tp, w.b);
        if (!a || !b) return null;
        // hors mise en service (`sim === null`) rien n'est sous tension : on dessine
        // tous les fils à pleine opacité, `dead` ne sert qu'à distinguer les circuits
        // hors tension quand la platine est alimentée.
        const dead = sim ? !netLive(w, sim) : false;
        return (
          <path
            key={`${w.a}~${w.b}~${i}`}
            className={`se-wire${w.net === 'PE' ? ' pe' : ''}${dead ? ' dead' : ''}`}
            stroke={NET_COLOR[w.net]}
            d={wirePath(a, b)}
          />
        );
      })}

      {currentTag && (
        <g>
          <rect x={currentTag.x} y={currentTag.y - 10} width={currentTag.text.length * 6 + 10} height={14} rx={3} fill="#141A21" />
          <text x={currentTag.x + 5} y={currentTag.y} className="font-mono-num" fontSize={9} fontWeight={600} fill="#fff">
            {currentTag.text}
          </text>
        </g>
      )}
    </svg>
  );
}
