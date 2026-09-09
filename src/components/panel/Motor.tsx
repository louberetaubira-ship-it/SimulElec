'use client';

import React from 'react';
import { MOTOR_BOX } from '@/lib/data/tp-demarrage-direct';
import type { TpDefinition } from '@/lib/types';

/** Moteur asynchrone vectoriel, ventilateur tournant à la vitesse simulée. */
export default function Motor({ tp, n }: { tp: TpDefinition; n: number }) {
  const spin = n > 40 ? `se-spin ${(1500 / n) * 0.5}s linear infinite` : undefined;
  return (
    <div className="pointer-events-none absolute" style={{ left: MOTOR_BOX.x, top: MOTOR_BOX.y, width: MOTOR_BOX.w, height: MOTOR_BOX.h }}>
      <svg viewBox="0 0 150 150" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="se-mb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#B9C0C8" /><stop offset=".5" stopColor="#7E8790" /><stop offset="1" stopColor="#4E555C" />
          </linearGradient>
          <linearGradient id="se-mf" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#9AA2AA" /><stop offset="1" stopColor="#5B626A" />
          </linearGradient>
          <radialGradient id="se-cap"><stop offset="0" stopColor="#C9D0D7" /><stop offset="1" stopColor="#5E656D" /></radialGradient>
        </defs>
        <rect x="14" y="118" width="120" height="12" rx="3" fill="#3A4047" />
        <rect x="30" y="40" width="88" height="80" rx="10" fill="url(#se-mb)" />
        <g stroke="#464D55" strokeWidth="2">
          <path d="M40 44v72M50 44v72M60 44v72M70 44v72M80 44v72M90 44v72M100 44v72M110 44v72" />
        </g>
        <rect x="52" y="22" width="44" height="26" rx="4" fill="#8E969E" stroke="#4E555C" />
        <rect x="118" y="60" width="18" height="40" rx="4" fill="url(#se-mf)" />
        <circle cx="21" cy="80" r="21" fill="url(#se-cap)" stroke="#4E555C" />
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: spin }}>
          <path d="M21 62v36M3 80h36M8 67l26 26M34 67L8 93" stroke="#2F353B" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx="21" cy="80" r="5" fill="#2F353B" />
        <text x="74" y="140" textAnchor="middle" fontSize="10" fontWeight="700" fill="#20262D" className="font-title">
          {`M1 · ${(tp.motor.P / 1000).toLocaleString('fr-FR')} kW`}
        </text>
        <text x="74" y="150" textAnchor="middle" fontSize="8" fontWeight="600" fill="#5B6670" className="font-mono-num">
          {`${tp.motor.U} V · ${tp.motor.n} tr/min`}
        </text>
      </svg>
    </div>
  );
}
