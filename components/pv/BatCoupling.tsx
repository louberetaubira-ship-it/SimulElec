'use client';

/**
 * Couplage du parc de batteries, dessiné en SVG (port de `batSvg` de la référence).
 * Bns batteries en série par branche, Bnp branches en parallèle vers le fusible principal.
 */

import React from 'react';
import type { PvBattery } from '@/lib/data/pv/catalogue';

interface Props {
  bat: PvBattery;
  bns: number;
  bnp: number;
  /** Ligne de synthèse affichée sous le dessin. */
  caption: string;
}

function Bloc({ x, y, bat }: { x: number; y: number; bat: PvBattery }) {
  const plomb = bat.tech === 'Plomb';
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="74" height="46" rx="5" fill={plomb ? '#3A4047' : '#F4F5F7'} stroke="#4E555C" />
      <rect x="10" y="-6" width="12" height="8" rx="2" fill="#D93A3A" />
      <rect x="52" y="-6" width="12" height="8" rx="2" fill="#20262D" />
      <text x="37" y="20" textAnchor="middle" fontSize="8" fontWeight="700" fill={plomb ? '#fff' : '#141A21'}>
        {bat.U} V
      </text>
      <text x="37" y="32" textAnchor="middle" fontSize="7" fill={plomb ? '#DDE1E5' : '#66717F'}>
        {bat.Ah} Ah {bat.tech}
      </text>
    </g>
  );
}

export default function BatCoupling({ bat, bns, bnp, caption }: Props) {
  const W = Math.max(380, bns * 96 + 120);
  const H = bnp * 74 + 70;
  const bx = W - 60;

  const rows = Array.from({ length: bnp }, (_, r) => r);
  const cols = Array.from({ length: bns }, (_, c) => c);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="h-auto max-w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)]"
      role="img"
      aria-label={`Couplage du parc : ${bns} batteries en série, ${bnp} branches en parallèle`}
    >
      {rows.map(r => {
        const y = 20 + r * 74;
        return (
          <g key={`row${r}`}>
            {cols.map(c => {
              const x = 16 + c * 96;
              return (
                <g key={`b${r}-${c}`}>
                  <Bloc x={x} y={y} bat={bat} />
                  {c < bns - 1 && (
                    <path d={`M${x + 58} ${y - 6} v-8 h34 v8`} fill="none" stroke="#20262D" strokeWidth="2.2" />
                  )}
                </g>
              );
            })}
            <path d={`M${16 + 16} ${y - 6} v-12 H${bx - 10} V${H - 40}`} fill="none" stroke="#D93A3A" strokeWidth="2.4" />
            <path d={`M${16 + (bns - 1) * 96 + 58} ${y + 40} v14 H${bx + 10} V${H - 40}`} fill="none" stroke="#20262D" strokeWidth="2.4" />
          </g>
        );
      })}
      <circle cx={bx - 10} cy={H - 40} r="5" fill="#D93A3A" stroke="#fff" />
      <circle cx={bx + 10} cy={H - 40} r="5" fill="#20262D" stroke="#fff" />
      <text x={bx} y={H - 24} textAnchor="middle" fontSize="7" fontWeight="700">vers fusible principal · onduleur</text>
      <text x="16" y={H - 8} fontSize="10" fontFamily="IBM Plex Mono, monospace" fontWeight="700">{caption}</text>
    </svg>
  );
}
