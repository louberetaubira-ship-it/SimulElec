'use client';

/**
 * Couplage du champ photovoltaïque, dessiné en SVG (port de `panelSvg` de la référence).
 * Ns modules en série par chaîne, Np chaînes en parallèle, remontée vers la boîte DC.
 */

import React from 'react';
import type { PvPanel } from '@/lib/data/pv/catalogue';

interface Props {
  panel: PvPanel;
  ns: number;
  np: number;
  /** Ligne de synthèse affichée sous le dessin. */
  caption: string;
}

function Module({ x, y, panel }: { x: number; y: number; panel: PvPanel }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="62" height="88" rx="3" fill="#0E1A3C" stroke="#8E969E" />
      <g stroke="#9FB3D9" strokeWidth=".7" opacity=".8">
        {[1, 2, 3, 4, 5].map(k => <path key={`h${k}`} d={`M0 ${k * 14.6}h62`} />)}
        {[1, 2, 3].map(k => <path key={`v${k}`} d={`M${k * 15.5} 0v88`} />)}
      </g>
      <circle cx="16" cy="94" r="5" fill="#fff" stroke="#20262D" />
      <text x="16" y="97" textAnchor="middle" fontSize="8" fontWeight="700">−</text>
      <circle cx="46" cy="94" r="5" fill="#fff" stroke="#D93A3A" />
      <text x="46" y="97" textAnchor="middle" fontSize="8" fontWeight="700" fill="#D93A3A">+</text>
      <text x="31" y="50" textAnchor="middle" fontSize="7" fill="#fff">{panel.P} Wc</text>
      <text x="31" y="60" textAnchor="middle" fontSize="6.5" fill="#BFD0F0">{panel.Vmp} V · {panel.Imp} A</text>
    </g>
  );
}

export default function PanelCoupling({ panel, ns, np, caption }: Props) {
  const W = Math.max(420, ns * 84 + 150);
  const H = np * 118 + 90;
  const bx = W - 60;
  const by = H - 48;

  const rows = Array.from({ length: np }, (_, r) => r);
  const cols = Array.from({ length: ns }, (_, c) => c);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="h-auto max-w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)]"
      role="img"
      aria-label={`Couplage du champ : ${ns} modules en série, ${np} chaînes en parallèle`}
    >
      {rows.map(r => {
        const y = 14 + r * 118;
        const xm = 20 + 16;
        const xp = 20 + (ns - 1) * 84 + 46;
        const xl = 8 + 4 * r;
        const xr = 20 + ns * 84 - 20 + 6 + r * 5;
        return (
          <g key={`row${r}`}>
            {cols.map(c => {
              const x = 20 + c * 84;
              return (
                <g key={`m${r}-${c}`}>
                  <Module x={x} y={y} panel={panel} />
                  {c < ns - 1 && (
                    <path d={`M${x + 46} ${y + 99} v10 h38 v-10`} fill="none" stroke="#20262D" strokeWidth="2" />
                  )}
                </g>
              );
            })}
            <path d={`M${xm} ${y + 99} v6 H${xl} V${by + 4 + r * 4} H${bx - 8}`} fill="none" stroke="#20262D" strokeWidth="2.2" />
            <path d={`M${xp} ${y + 99} v6 H${xr} V${by - 16 - r * 4} H${bx + 8}`} fill="none" stroke="#D93A3A" strokeWidth="2.2" />
          </g>
        );
      })}

      <rect x={bx - 22} y={by - 8} width="44" height="34" rx="4" fill="#3A4047" />
      <circle cx={bx - 8} cy={by - 4} r="4" fill="#20262D" stroke="#fff" />
      <circle cx={bx + 8} cy={by - 16} r="4" fill="#D93A3A" stroke="#fff" />
      <text x={bx} y={by + 14} textAnchor="middle" fontSize="6.5" fill="#fff" fontWeight="700">BOÎTE DC</text>
      <text x={bx - 8} y={by + 30} textAnchor="middle" fontSize="7" fontWeight="700">PV−</text>
      <text x={bx + 8} y={by - 22} textAnchor="middle" fontSize="7" fill="#D93A3A" fontWeight="700">PV+</text>

      <text x="20" y={H - 8} fontSize="10" fontFamily="IBM Plex Mono, monospace" fontWeight="700">{caption}</text>
    </svg>
  );
}
