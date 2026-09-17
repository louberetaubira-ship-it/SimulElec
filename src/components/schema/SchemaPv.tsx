'use client';

/**
 * Schéma UNIFILAIRE de l'installation solaire autonome (off-grid), pour la
 * PRÉPARATION du TP photovoltaïque.
 *
 * Le schéma de puissance générique (`SchemaPuissance`) est bâti pour un départ
 * moteur triphasé : il ne sait pas dessiner une chaîne PV → régulateur → parc →
 * onduleur → tableau. On dessine donc ici la chaîne off-grid, du champ PV aux
 * récepteurs, en continu (orange) puis en alternatif 230 V (bleu), avec le parc
 * batterie EXTÉRIEUR au coffret. L'organe visé par la question en cours
 * (`focus`, un repère) s'entoure d'un cadre, comme sur les autres schémas.
 */
import React from 'react';
import type { TpDefinition } from '@/lib/types';

const DC = '#D9711E';
const AC = '#1D6FE0';
const GOOD = '#1E9E63';
const INK = '#141A21';
const MUTED = '#66717F';
const LINE = '#E3E7EC';
const ACCENT = '#E39A00';

interface Node {
  id: string;            // repère servant de cible au focus
  rep: string;           // repère affiché
  label: string;         // fonction courte
  x: number; y: number; w: number; h: number;
  side: 'dc' | 'ac' | 'bat';
  sym?: React.ReactNode; // symbole dessiné à l'intérieur
}

/** Un sectionneur (lame ouverte) dessiné dans le cadre d'un nœud. */
function Sect(x: number, y: number, c: string) {
  return (
    <g>
      <circle cx={x} cy={y} r={3} fill={c} />
      <line x1={x} y1={y} x2={x + 16} y2={y + 20} stroke={c} strokeWidth={2.4} />
      <circle cx={x} cy={y + 28} r={3} fill={c} />
    </g>
  );
}

const NODES: Node[] = [
  { id: 'PV', rep: 'Champ PV', label: '12 × 125 Wc · 3S4P', x: 40, y: 24, w: 104, h: 52, side: 'dc',
    sym: <path d="M56 40 h72 v22 h-72 z M74 40 v22 M92 40 v22 M110 40 v22 M56 51 h72" fill="none" stroke={DC} strokeWidth={1.5} /> },
  { id: 'Q2', rep: 'Q2', label: 'sectionneur DC PV', x: 40, y: 98, w: 104, h: 52, side: 'dc',
    sym: Sect(64, 112, DC) },
  { id: 'PF1', rep: 'PF1', label: 'parafoudre DC T2', x: 40, y: 172, w: 104, h: 46, side: 'dc',
    sym: <path d="M64 180 v14 M56 194 h16 l-8 12 z" fill="none" stroke={DC} strokeWidth={2} /> },
  { id: 'F1', rep: 'F1', label: 'fusibles gPV', x: 40, y: 240, w: 104, h: 46, side: 'dc',
    sym: <rect x={58} y={248} width={12} height={30} rx={2} fill="none" stroke={DC} strokeWidth={2} /> },
  { id: 'MPPT', rep: 'MPPT', label: 'régulateur 150/70', x: 200, y: 240, w: 150, h: 52, side: 'dc',
    sym: <path d="M220 278 q14 -26 28 0" fill="none" stroke={DC} strokeWidth={2} /> },
  { id: 'Q1', rep: 'Q1', label: 'sect. parc · consignation', x: 380, y: 240, w: 150, h: 52, side: 'dc',
    sym: Sect(400, 254, DC) },
  { id: 'FB', rep: 'FB', label: 'fusible MEGA 125 A', x: 452, y: 120, w: 92, h: 44, side: 'dc',
    sym: <rect x={470} y={128} width={12} height={28} rx={2} fill="none" stroke={DC} strokeWidth={2} /> },
  { id: 'BAT', rep: 'Parc 24 V', label: 'extérieur · 1200 Ah', x: 452, y: 172, w: 92, h: 60, side: 'bat',
    sym: <path d="M474 196 v16 M474 200 h-6 M494 192 v24 M494 192 h16 M510 192 v24" fill="none" stroke={GOOD} strokeWidth={2} /> },
  { id: 'ONDU', rep: 'ONDU', label: 'MultiPlus 24/3000', x: 200, y: 330, w: 150, h: 52, side: 'ac',
    sym: <path d="M222 356 h10 l6 -12 v24 l6 -12 h10" fill="none" stroke={AC} strokeWidth={2} /> },
  { id: 'Q3', rep: 'Q3', label: 'différentiel 30 mA', x: 380, y: 330, w: 120, h: 52, side: 'ac',
    sym: <g>{Sect(400, 344, AC)}<ellipse cx={404} cy={372} rx={9} ry={5} fill="none" stroke={AC} strokeWidth={1.5} /></g> },
  { id: 'X1', rep: 'X1', label: 'tableau (GTL)', x: 40, y: 330, w: 140, h: 52, side: 'ac',
    sym: <path d="M150 340 v32 M158 340 v32 M166 340 v32" stroke={AC} strokeWidth={2} /> },
];

const WIRES: { d: string; side: 'dc' | 'ac' }[] = [
  { d: 'M92 76 V98', side: 'dc' },               // PV -> Q2
  { d: 'M92 150 V172', side: 'dc' },             // Q2 -> PF1
  { d: 'M92 218 V240', side: 'dc' },             // PF1 -> F1
  { d: 'M92 286 V266 H200', side: 'dc' },        // F1 -> MPPT
  { d: 'M350 266 H380', side: 'dc' },            // MPPT -> Q1
  { d: 'M498 164 V172', side: 'dc' },            // MEGA -> parc
  { d: 'M498 232 V266 H530', side: 'dc' },       // parc -> Q1 (retour bus)
  { d: 'M455 266 H470 M470 240 V164', side: 'dc' }, // Q1 -> MEGA branch
  { d: 'M275 292 V330', side: 'ac' },            // ONDU DC in (visual link to Q1 bus) simplified
  { d: 'M350 356 H380', side: 'ac' },            // ONDU -> Q3
  { d: 'M380 356 H360 M360 356 H180', side: 'ac' }, // Q3 -> tableau (feed)
];

export default function SchemaPv({
  focus, className = '',
}: { tp?: TpDefinition; focus?: string | null; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 ${className}`}>
      <div className="mb-1 font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
        Schéma — installation solaire autonome
      </div>
      <p className="m-0 mb-2 text-[11.5px] text-muted">
        Du champ PV aux récepteurs : continu (orange), puis 230&nbsp;V alternatif (bleu). Le parc
        batterie est à l&apos;extérieur du coffret. L&apos;organe demandé s&apos;encadre.
      </p>
      <svg viewBox="0 0 600 400" className="block h-auto w-full" role="img" aria-label="Schéma de l'installation solaire autonome">
        {/* fils */}
        {WIRES.map((w, i) => (
          <path key={i} d={w.d} fill="none" stroke={w.side === 'ac' ? AC : DC} strokeWidth={2.2} strokeLinejoin="round" />
        ))}
        {/* étiquettes de nature */}
        <text x={188} y={262} fontSize={9} fontWeight={700} fill={DC}>DC</text>
        <text x={188} y={352} fontSize={9} fontWeight={700} fill={AC}>230 V</text>

        {/* organes */}
        {NODES.map((n) => {
          const on = focus === n.id;
          return (
            <g key={n.id}>
              <rect
                x={n.x} y={n.y} width={n.w} height={n.h} rx={9}
                fill={on ? ACCENT : '#fff'} fillOpacity={on ? 0.14 : 1}
                stroke={on ? ACCENT : (n.side === 'bat' ? GOOD : LINE)}
                strokeWidth={on ? 2.4 : 1.4}
                strokeDasharray={n.side === 'bat' ? '4 3' : undefined}
              />
              {n.sym}
              <text x={n.x + n.w - 8} y={n.y + 18} textAnchor="end"
                fontSize={12} fontWeight={800} fontFamily="ui-monospace, monospace" fill={INK}>
                {n.rep}
              </text>
              <text x={n.x + n.w - 8} y={n.y + n.h - 8} textAnchor="end"
                fontSize={10} fill={MUTED}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
