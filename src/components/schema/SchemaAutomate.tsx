'use client';

/**
 * Schéma de câblage de l'AUTOMATE : capteurs sur les entrées, charges sur les sorties.
 *
 * Il sert la préparation des TP pilotés par automate qui n'ont pas de folio de commande
 * en logique câblée : c'est ce schéma que l'élève lit pour identifier S0 à S6, H1, T1, Q3
 * et l'automate lui-même. Il se déduit de `tp.plcIo` : une ligne par entrée ou sortie.
 * L'organe visé par la question en cours s'entoure d'un cadre orange.
 */
import React from 'react';
import type { TpDefinition } from '@/lib/types';

const ACC = '#E39A00';

export default function SchemaAutomate({ tp, focus }: { tp: TpDefinition; focus?: string | null }) {
  const io = tp.plcIo ?? [];
  const entrees = io.filter(r => /^I\d/.test(r.io));
  const sorties = io.filter(r => /^Q\d/.test(r.io));
  /** Repère d'appareil en tête du libellé : « S5 cellule… » → « S5 », « KM1.1 … » → « KM1.1 ». */
  const repOf = (label: string) => /^([A-Z]+\d+(?:\.\d+)?)/.exec(label)?.[1] ?? '';
  const fo = focus ?? '';
  const vise = (rep: string) => !!fo && (rep === fo || (fo === 'KM1' && rep === 'KM1.1') || (fo === 'KM2' && rep === 'KM1.2'));
  const H = Math.max(entrees.length * 34, sorties.length * 34 + 120) + 150;
  const plcY = 70, plcH = H - 110;
  const box = (x: number, y: number, w: number, h: number, rep: string, sub: string, on: boolean) => (
    <g key={`${rep}-${y}`}>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={on ? '#FFF3DB' : '#fff'} stroke={on ? ACC : '#8A94A3'} strokeWidth={on ? 3 : 1.3} />
      <text x={x + 7} y={y + h / 2 + 4} fontSize={12} fontWeight={800} fill="#141A21">{rep}</text>
      <text x={x + (rep.length > 3 ? 52 : 34)} y={y + h / 2 + 3.5} fontSize={9} fill="#5D6878">{sub}</text>
    </g>
  );
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="mb-1 font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
        Schéma — câblage de l&apos;automate
      </div>
      <p className="m-0 mb-2 text-[11.5px] text-muted">
        Capteurs sur les entrées (COM au 0 V, logique positive), charges sur les sorties relais (COM0 au 24 V~).
      </p>
      <svg viewBox={`0 0 620 ${H}`} className="block h-auto w-full" role="img" aria-label="Schéma de câblage de l'automate">
        {/* alimentations */}
        <line x1={20} y1={24} x2={250} y2={24} stroke="#D93A3A" strokeWidth={2} />
        <text x={22} y={18} fontSize={10} fill="#D93A3A">+ 24 V⎓ capteurs du M221</text>
        <line x1={20} y1={H - 16} x2={600} y2={H - 16} stroke="#2C7BE5" strokeWidth={2} />
        <text x={22} y={H - 22} fontSize={10} fill="#2C7BE5">0 V⎓ (COM) · 0 V~ (T1)</text>
        {box(440, 6, 170, 38, 'T1', '400 / 24 V~ · Q4 · Q5', vise('T1'))}
        <line x1={500} y1={44} x2={500} y2={plcY + 30} stroke="#8A5A00" strokeWidth={2} />
        <text x={505} y={plcY + 18} fontSize={9} fill="#8A5A00">24 V~ → COM0</text>
        {box(250, 6, 170, 38, 'Q3', '230 V → L / N automate', vise('Q3'))}
        <line x1={325} y1={44} x2={325} y2={plcY} stroke="#8B4A2B" strokeWidth={2} />
        {/* automate */}
        <g>
          <rect x={250} y={plcY} width={150} height={plcH} rx={8} fill={vise('A1') ? '#FFF3DB' : '#F4F5F6'} stroke={vise('A1') ? ACC : '#6B7684'} strokeWidth={vise('A1') ? 3 : 1.5} />
          <text x={325} y={plcY + 22} textAnchor="middle" fontSize={13} fontWeight={800} fill="#1E9E5A">A1 · M221</text>
          <text x={325} y={plcY + 37} textAnchor="middle" fontSize={9.5} fill="#5D6878">TM221CE16R</text>
        </g>
        {entrees.map((r, i) => {
          const y = plcY + 60 + i * 34;
          const rep = repOf(r.label);
          const on = vise(rep);
          return (
            <g key={r.io}>
              <line x1={16} y1={24} x2={16} y2={y} stroke="#E8B4B4" /><line x1={16} y1={y} x2={24} y2={y} stroke="#E8B4B4" />
              {box(24, y - 13, 170, 26, rep, r.label.replace(rep, '').replace(/, par X2:\d+/, '').replace(/\(.*?\)/, '').trim().slice(0, 26), on)}
              <line x1={194} y1={y} x2={250} y2={y} stroke={on ? ACC : '#8A94A3'} strokeWidth={on ? 3 : 1.4} />
              <text x={256} y={y + 4} fontSize={10.5} fontFamily="ui-monospace,monospace">{r.io}</text>
            </g>
          );
        })}
        {sorties.map((r, i) => {
          const y = plcY + 90 + i * 40;
          const rep = repOf(r.label);
          const on = vise(rep);
          return (
            <g key={r.io}>
              <text x={394} y={y + 4} textAnchor="end" fontSize={10.5} fontFamily="ui-monospace,monospace">{r.io}</text>
              <line x1={400} y1={y} x2={450} y2={y} stroke={on ? ACC : '#8A94A3'} strokeWidth={on ? 3 : 1.4} />
              {box(450, y - 14, 160, 28, rep, r.label.replace(rep, '').replace(/, par X2:\d+/, '').replace(/\(.*?\)/, '').trim().slice(0, 18), on)}
              <line x1={520} y1={y + 14} x2={520} y2={H - 16} stroke="#C7D3E6" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
