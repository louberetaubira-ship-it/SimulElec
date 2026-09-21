'use client';

/**
 * Banc de mesure : l'installation dessinée, ses bornes cliquables, les
 * préparations à faire et les cordons posés par l'élève.
 * Clic sur un cordon (contrôleur) puis sur une borne : le cordon s'y pose ;
 * reclic avec le même cordon : il est retiré.
 */

import React from 'react';
import { BANCS, CORDONS, type CordId } from '@/lib/mes/banc';
import { MES } from '@/lib/mes/miseEnService';
import { useMesParcours } from '@/app/tp/[id]/mesStore';

/** Dessin de fond de chaque banc (viewBox 640 × 340). */
function Fond({ step, prep }: { step: number; prep: string[] }) {
  const trait = '#6b7684';
  switch (step) {
    case MES.CONT:
      return (
        <g>
          <rect x="150" y="40" width="230" height="250" rx="6" fill="#dfe4ea" stroke={trait} />
          <text x="160" y="58" fontSize="11" fill="#5d6878">armoire</text>
          <rect x="190" y="170" width="160" height="60" fill="#cfd6df" stroke="#8a95a3" />
          <rect x="308" y="100" width="44" height="50" rx="4" fill="#fff" stroke="#1b222c" />
          <rect x="308" y="236" width="44" height="30" rx="4" fill="#fff" stroke="#1b222c" />
          <rect x="30" y="286" width="110" height="28" rx="4" fill="#9aa5b3" />
          <path d="M80 286V240H190" stroke="#1e9e5a" strokeWidth="3" fill="none" />
          <rect x="400" y="260" width="230" height="70" fill="#9fb4c7" opacity=".45" />
          <text x="410" y="324" fontSize="10" fill="#34495e">fosse</text>
          <circle cx="470" cy="290" r="30" fill="#cfd6df" stroke="#1b222c" />
          <path d="M470 260V175H600" stroke="#4b5563" strokeWidth="7" fill="none" />
          <path d="M480 60h80M480 95h80M490 60v200M550 60v200" stroke={trait} strokeWidth="4" />
          <circle cx="430" cy="150" r="14" fill="#fff" stroke="#1b222c" />
        </g>
      );
    case MES.ISO_I:
    case MES.TENS:
    case MES.PHASES:
      return (
        <g>
          <text x="190" y="40" fontSize="11" fill="#5d6878">Arrivée · Q0 · départs</text>
          <rect x="190" y="60" width="240" height="70" rx="6" fill="#1b222c" />
          <text x="300" y="100" fontSize="13" fontWeight="700" fill="#f2b705">Q0</text>
          <text x="345" y="100" fontSize="10" fill="#fff">{step === MES.ISO_I ? 'ouvert · consigné' : 'fermé'}</text>
          {['L1', 'L2', 'L3', 'N'].map((b, i) => <path key={b} d={`M${220 + i * 60} 130V178M${220 + i * 60} 202V300`} stroke={b === 'N' ? '#2c6fd6' : '#1b222c'} strokeWidth="3" />)}
          <text x="200" y="320" fontSize="10" fill="#5d6878">bornes en aval de Q0 → départs (KM1 ouvert, Q2, Q3)</text>
          {step === MES.ISO_I && (
            <g>
              <path d="M220 250H470M280 262H470" stroke="#1b222c" strokeWidth="2" strokeDasharray={prep.includes('t1') ? '4 4' : undefined} opacity={prep.includes('t1') ? 0.4 : 1} />
              <circle cx="520" cy="180" r="22" fill="#fff" stroke="#1b222c" /><circle cx="520" cy="215" r="22" fill="#fff" stroke="#1b222c" />
              <text x="550" y="200" fontSize="12" fontWeight="700">T1</text>
            </g>
          )}
        </g>
      );
    case MES.ISO_M:
      return (
        <g>
          <rect x="180" y="90" width="260" height="190" rx="10" fill="#dfe4ea" stroke={trait} />
          <text x="190" y="108" fontSize="11" fill="#5d6878">boîte à bornes de la pompe M1</text>
          <circle cx="500" cy="185" r="62" fill="#cfd6df" stroke="#1b222c" opacity=".6" />
          {!prep.includes('barrettes') && [220, 300, 380].map((x) => (
            <rect key={x} x={x - 9} y="124" width="18" height="122" rx="4" fill="#b98300" stroke="#7a5600" opacity=".9" />
          ))}
          <text x="190" y="300" fontSize="11" fontWeight="700" fill={prep.includes('barrettes') ? '#1e9e5a' : '#b98300'}>
            {prep.includes('barrettes') ? '✓ Barrettes retirées' : 'Barrettes de couplage en place (étoile)'}
          </text>
        </g>
      );
    case MES.TERRE:
      return (
        <g>
          <rect x="20" y="280" width="600" height="50" fill="#b9a27a" opacity=".45" />
          <text x="30" y="324" fontSize="10" fill="#5b4a2b">sol</text>
          <path d="M110 110V160M110 204V280" stroke="#1e9e5a" strokeWidth="4" />
          <rect x="80" y="160" width="60" height="44" rx="4" fill={prep.includes('bc1') ? '#fff' : '#9aa5b3'} stroke="#1b222c" />
          <text x="150" y="186" fontSize="11" fontWeight="700">BC1 {prep.includes('bc1') ? 'ouverte' : 'fermée'}</text>
          <path d="M110 280v40M350 280v30M560 280v30" stroke="#4b5563" strokeWidth="6" />
          <path d="M150 300H540" stroke="#5b4a2b" strokeDasharray="6 5" />
          <text x="210" y="296" fontSize="10" fill="#5b4a2b">20 m</text>
          <text x="440" y="296" fontSize="10" fill="#5b4a2b">20 m</text>
        </g>
      );
    case MES.DDR:
      return (
        <g>
          <rect x="120" y="60" width="150" height="190" rx="8" fill="#fff" stroke="#1b222c" />
          <text x="180" y="90" fontSize="14" fontWeight="700">Q2</text>
          <text x="150" y="115" fontSize="11" fill="#5d6878">30 mA · type A</text>
          <rect x="178" y="200" width="34" height="30" rx="4" fill="#1b222c" />
          <path d="M270 150H420V210" stroke="#1b222c" strokeWidth="3" fill="none" />
          <rect x="390" y="210" width="60" height="50" rx="6" fill="#fff" stroke="#1b222c" />
          <path d="M450 112H510" stroke="#9aa5b3" strokeWidth="3" />
          <rect x="500" y="90" width="60" height="44" rx="6" fill="#fff" stroke="#9aa5b3" />
          <text x="480" y="155" fontSize="10" fill="#5d6878">autre circuit (hors Q2)</text>
        </g>
      );
    default:
      return null;
  }
}

export default function Banc() {
  const { s, cord, conn, placeCord, prepBanc } = useMesParcours();
  const b = BANCS[s.step];
  if (!b) return null;
  const m = s.mesures[s.step];
  const c = conn[s.step] ?? {};
  const surBorne = (id: string) => (Object.keys(c) as CordId[]).filter((k) => c[k] === id);

  return (
    <div data-banc className="rounded-xl border border-[var(--line)] bg-[#e9edf2] p-1.5">
      <svg viewBox="0 0 640 340" className="block h-auto w-full" role="img" aria-label="Banc de mesure">
        <Fond step={s.step} prep={m.prep} />
        {/* cordons : du contrôleur (hors dessin, à droite) vers la borne */}
        {(Object.keys(c) as CordId[]).map((k, i) => {
          const bo = b.bornes.find((x) => x.id === c[k]);
          if (!bo) return null;
          return <path key={k} d={`M${bo.x} ${bo.y} Q ${(bo.x + 640) / 2} ${bo.y + 90} 640 ${40 + i * 30}`} stroke={CORDONS[k].couleur} strokeWidth="3" fill="none" opacity=".75" pointerEvents="none" />;
        })}
        {b.actions.map((a) => {
          const fait = m.prep.includes(a.id) || (a.id === 'testq2' && !!m.lectures.test);
          return (
            <g key={a.id} data-action={a.id} onClick={() => prepBanc(a.id)} style={{ cursor: 'pointer' }}>
              <rect x={a.x} y={a.y} width={a.w} height={a.h} rx="8" fill={fait ? 'rgba(30,158,90,.10)' : 'rgba(227,154,0,.14)'} stroke={fait ? '#1e9e5a' : '#e39a00'} strokeWidth="2" strokeDasharray={fait ? undefined : '5 4'} />
              <text x={a.x + a.w / 2} y={a.y + a.h + 14} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={fait ? '#1e9e5a' : '#9a6400'}>{fait ? `✓ ${a.fait}` : a.label}</text>
            </g>
          );
        })}
        {b.bornes.map((bo) => {
          const cs = surBorne(bo.id);
          return (
            <g key={bo.id} data-borne={bo.id} onClick={() => placeCord(bo.id)} style={{ cursor: 'pointer' }}>
              <circle cx={bo.x} cy={bo.y} r="12" fill="#fff" stroke={cs.length ? CORDONS[cs[0]].couleur : '#1b222c'} strokeWidth={cs.length ? 3 : 1.5} />
              {cs.map((k, i) => <circle key={k} cx={bo.x - (cs.length - 1) * 4 + i * 8} cy={bo.y} r="5" fill={CORDONS[k].couleur} pointerEvents="none" />)}
              <text x={bo.x + 16} y={bo.y + 4} fontSize="11" fontWeight="600" fill="#1b222c" pointerEvents="none">{bo.label}</text>
            </g>
          );
        })}
        <text x="10" y="18" fontSize="11" fill="#5d6878">Cordon en main : {CORDONS[cord]?.label}</text>
      </svg>
    </div>
  );
}
