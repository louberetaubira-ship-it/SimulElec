'use client';

/**
 * Appareils dessinés en vectoriel (pas de photo dans le pack) : modules PV, onduleur,
 * batterie, AGCP, automate M221, moteur et boîte à bornes.
 * Port de `pvPanelSvg`, `onduleurSvg`, `dcModSvg`, `batterySvg`, `agcpSvg`, `plcSvg`, `tboxSvg`
 * de `docs/reference/illustration-v3.tpl.html`.
 */
import React from 'react';
import { PLC, PLC_IN, PLC_OUT } from '@/lib/scene/geometry';

const SHADOW2 = { filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' } as const;
const SHADOW3 = { filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.35))' } as const;
const MONO = 'var(--font-mono), monospace';
const SANS = 'var(--font-sans), sans-serif';
const COND = 'var(--font-title), sans-serif';

export function PvPanelSvg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 60 100" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B2C5E" /><stop offset=".5" stopColor="#0E1A3C" /><stop offset="1" stopColor="#25407A" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="58" height="98" rx="2" fill="#B9BEC4" stroke="#5E656D" />
      <rect x="3" y="3" width="54" height="94" fill={`url(#${gid})`} />
      <g fill="none" stroke="#9FB3D9" strokeWidth=".8" opacity=".8">
        {[0, 1, 2, 3, 4, 5].map((i) => <path key={`h${i}`} d={`M3 ${3 + i * 15.7}h54`} />)}
        {[0, 1, 2, 3].map((i) => <path key={`v${i}`} d={`M${3 + i * 13.5} 3v94`} />)}
      </g>
      <g stroke="#DCE6F5" strokeWidth=".5" opacity=".7">
        {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${5 + i * 4.5} 3v94`} />)}
      </g>
      <rect x="4" y="4" width="20" height="30" fill="#fff" opacity=".08" />
    </svg>
  );
}

export function OnduleurSvg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 110 130" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4F5F7" /><stop offset="1" stopColor="#C9CED4" />
        </linearGradient>
      </defs>
      <rect x="4" y="6" width="102" height="112" rx="8" fill={`url(#${gid})`} stroke="#6E7780" strokeWidth="1.5" />
      <rect x="12" y="14" width="86" height="34" rx="4" fill="#20262D" />
      <rect x="18" y="20" width="52" height="22" rx="2" fill="#0F2E1E" />
      <text x="22" y="35" fontFamily={MONO} fontSize="9" fill="#5CFF9A">2.94 kW</text>
      <circle cx="86" cy="24" r="3.5" fill="#3DFF7A" /><circle cx="86" cy="36" r="3.5" fill="#444" />
      <text x="12" y="60" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#3A4047">ONDULEUR STRING 3 kVA</text>
      <text x="12" y="70" fontFamily={SANS} fontSize="6" fill="#66717F">MPPT 1 · MPPT 2 · 1000 V DC</text>
      <g fill="#2A2E33">
        <rect x="58" y="118" width="12" height="10" rx="2" /><rect x="74" y="118" width="12" height="10" rx="2" /><rect x="90" y="118" width="12" height="10" rx="2" />
      </g>
      <g fontFamily={MONO} fontSize="5.5" fontWeight="700" fill="#141A21">
        <text x="11" y="112">DC+</text><text x="31" y="112">DC−</text><text x="60" y="112">L</text><text x="77" y="112">N</text><text x="93" y="112">PE</text>
      </g>
      <rect x="10" y="118" width="16" height="10" rx="2" fill="#D93A3A" opacity=".85" />
      <rect x="30" y="118" width="16" height="10" rx="2" fill="#20262D" />
      <path d="M14 80h82" stroke="#AEB4BA" />
      <rect x="12" y="84" width="86" height="20" rx="3" fill="#E5E8EB" />
      <text x="16" y="97" fontFamily={MONO} fontSize="6" fill="#3A4047">Uac 230 V · f 50 Hz · Ia 12.8 A</text>
    </svg>
  );
}

export type DcKind = 'sw' | 'spd' | 'fuse';

export function DcModSvg({ kind }: { kind: DcKind }) {
  const lab = kind === 'sw' ? ['SECT. DC', '1000 V', '2P 32 A']
    : kind === 'spd' ? ['PARAF. DC', 'Type 2', 'Y'] : ['FUSIBLE DC', 'gPV 15 A', '10×38'];
  const w = 52;
  return (
    <svg viewBox={`0 0 ${w} 120`} style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width={w - 2} height="118" rx="3" fill="#EDEFF2" stroke="#7E8790" />
      <rect x="1" y="1" width={w - 2} height="16" rx="3" fill="#D5D9DE" />
      <rect x="1" y="103" width={w - 2} height="16" rx="3" fill="#D5D9DE" />
      <g fill="#3A4047">
        <circle cx={w * .3} cy="9" r="3.5" /><circle cx={w * .7} cy="9" r="3.5" />
        <circle cx={w * .3} cy="111" r="3.5" /><circle cx={w * .7} cy="111" r="3.5" />
      </g>
      <rect x="6" y="24" width={w - 12} height="14" rx="2" fill="#20262D" />
      <text x={w / 2} y="34" textAnchor="middle" fontFamily={SANS} fontSize="6" fontWeight="700" fill="#fff">{lab[0]}</text>
      <text x={w / 2} y="50" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#3A4047">{lab[1]}</text>
      <text x={w / 2} y="60" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#3A4047">{lab[2]}</text>
      {kind === 'sw' ? (
        <>
          <rect x={w / 2 - 9} y="66" width="18" height="28" rx="3" fill="#D93A3A" stroke="#7A1F1F" />
          <rect x={w / 2 - 5} y="70" width="10" height="10" rx="1" fill="#fff" opacity=".7" />
        </>
      ) : kind === 'spd' ? (
        <>
          <rect x="8" y="66" width={w / 2 - 10} height="26" rx="2" fill="#3DFF7A" stroke="#1E9E63" />
          <rect x={w / 2 + 2} y="66" width={w / 2 - 10} height="26" rx="2" fill="#3DFF7A" stroke="#1E9E63" />
          <text x={w / 2} y="99" textAnchor="middle" fontFamily={SANS} fontSize="5" fill="#3A4047">état OK</text>
        </>
      ) : (
        <>
          <rect x="8" y="64" width={w / 2 - 10} height="34" rx="2" fill="#8E969E" stroke="#4E555C" />
          <rect x={w / 2 + 2} y="64" width={w / 2 - 10} height="34" rx="2" fill="#8E969E" stroke="#4E555C" />
          <text x={w * .3} y="82" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">+</text>
          <text x={w * .7} y="82" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">−</text>
        </>
      )}
      <text x={w * .3} y="20" textAnchor="middle" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#D93A3A">+</text>
      <text x={w * .7} y="20" textAnchor="middle" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#141A21">−</text>
    </svg>
  );
}

export function BatterySvg() {
  return (
    <svg viewBox="0 0 100 130" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <rect x="6" y="4" width="88" height="122" rx="10" fill="#F4F5F7" stroke="#6E7780" strokeWidth="1.5" />
      <rect x="14" y="14" width="72" height="8" rx="4" fill="#DDE1E5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="18" y={30 + i * 13} width="64" height="9" rx="2" fill={i < 4 ? '#1E9E63' : '#DDE1E5'} />
      ))}
      <text x="50" y="106" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#3A4047">BATTERIE LiFePO₄</text>
      <text x="50" y="116" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#66717F">48 V · 5 kWh · 80 %</text>
      <rect x="26" y="120" width="14" height="8" rx="2" fill="#D93A3A" />
      <rect x="60" y="120" width="14" height="8" rx="2" fill="#20262D" />
    </svg>
  );
}

export function AgcpSvg() {
  return (
    <svg viewBox="0 0 70 120" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="68" height="118" rx="4" fill="#F4F5F7" stroke="#6E7780" />
      <rect x="1" y="1" width="68" height="14" rx="4" fill="#C9CED4" />
      <rect x="1" y="105" width="68" height="14" rx="4" fill="#C9CED4" />
      <g fill="#3A4047">
        <circle cx="18" cy="8" r="3.5" /><circle cx="52" cy="8" r="3.5" />
        <circle cx="18" cy="112" r="3.5" /><circle cx="52" cy="112" r="3.5" />
      </g>
      <rect x="8" y="22" width="54" height="18" rx="2" fill="#1F4E9C" />
      <text x="35" y="34" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#fff">AGCP 500 mA</text>
      <text x="35" y="52" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#3A4047">15/45 A · sélectif</text>
      <rect x="22" y="60" width="26" height="30" rx="4" fill="#2A2E33" />
      <rect x="26" y="64" width="18" height="12" rx="2" fill="#F4F5F7" />
      <text x="35" y="98" textAnchor="middle" fontFamily={SANS} fontSize="6" fill="#66717F">disj. de branchement</text>
    </svg>
  );
}

/** Automate Modicon M221 (TM221CE16R). */
export function PlcSvg() {
  return (
    <svg viewBox={`0 0 ${PLC.w} ${PLC.h}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <rect x="2" y="10" width="196" height="92" rx="4" fill="#3A4047" stroke="#1F2429" />
      <rect x="8" y="16" width="184" height="80" rx="3" fill="#EDEFF2" />
      <rect x="8" y="16" width="184" height="12" fill="#5A9E3A" />
      <text x="14" y="25" fontFamily={COND} fontSize="8" fontWeight="700" fill="#fff">Modicon M221 · TM221CE16R</text>
      <text x="120" y="42" fontFamily={MONO} fontSize="6" fill="#141A21">RUN ● ERR ○ ETH ●</text>
      <rect x="14" y="32" width="90" height="10" rx="2" fill="#fff" stroke="#9AA3AD" />
      <text x="16" y="39" fontFamily={MONO} fontSize="5" fill="#141A21">IN 0-8 · 24 V DC</text>
      {Array.from({ length: 9 }, (_, i) => <rect key={`li${i}`} x={20 + i * 9} y="24" width="5" height="4" rx="1" fill={i < 3 ? '#3DFF7A' : '#2F353B'} />)}
      {Array.from({ length: 7 }, (_, i) => <rect key={`lo${i}`} x={20 + i * 9} y="82" width="5" height="4" rx="1" fill={i < 2 ? '#FFB400' : '#2F353B'} />)}
      <rect x="14" y="60" width="60" height="16" rx="2" fill="#C9CFD5" stroke="#9AA3AD" />
      <text x="17" y="70" fontFamily={MONO} fontSize="6" fill="#141A21">USB · RJ45</text>
      <text x="16" y="94" fontFamily={MONO} fontSize="5" fill="#141A21">OUT 0-6 · relais 2 A</text>
      {PLC_IN.map((n, i) => (
        <g key={`in${n}`}>
          <circle cx={14 + i * 17} cy="6" r="4" fill="#D9DEE3" stroke="#20262D" />
          <text x={14 + i * 17} y="-3" textAnchor="middle" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#141A21">{n}</text>
        </g>
      ))}
      {PLC_OUT.map((n, i) => (
        <g key={`out${n}`}>
          <circle cx={14 + i * 17} cy="106" r="4" fill="#D9DEE3" stroke="#20262D" />
          <text x={14 + i * 17} y="118" textAnchor="middle" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#141A21">{n}</text>
        </g>
      ))}
    </svg>
  );
}

/** Moteur asynchrone 3~ hors armoire (ventilateur animé au-delà de 40 tr/min). */
export function MotorSvg({ rpm = 0, label = 'M1 · 1,5 kW · 400 V Y' }: { rpm?: number; label?: string }) {
  const mb = React.useId(), cap = React.useId();
  return (
    <svg viewBox="0 0 150 150">
      <defs>
        <linearGradient id={mb} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9C0C8" /><stop offset=".5" stopColor="#7E8790" /><stop offset="1" stopColor="#4E555C" />
        </linearGradient>
        <radialGradient id={cap}><stop offset="0" stopColor="#C9D0D7" /><stop offset="1" stopColor="#5E656D" /></radialGradient>
      </defs>
      <rect x="14" y="118" width="120" height="12" rx="3" fill="#3A4047" />
      <rect x="30" y="40" width="88" height="80" rx="10" fill={`url(#${mb})`} />
      <g stroke="#464D55" strokeWidth="2">
        <path d="M40 44v72M50 44v72M60 44v72M70 44v72M80 44v72M90 44v72M100 44v72M110 44v72" />
      </g>
      <rect x="52" y="20" width="44" height="24" rx="4" fill="#8E969E" stroke="#4E555C" />
      <circle cx="21" cy="80" r="21" fill={`url(#${cap})`} stroke="#4E555C" />
      <g style={{
        transformBox: 'fill-box', transformOrigin: 'center',
        animation: rpm > 40 ? `se-spin ${(1500 / rpm) * 0.5}s linear infinite` : 'none',
      }}>
        <path d="M21 62v36M3 80h36M8 67l26 26M34 67L8 93" stroke="#2F353B" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="21" cy="80" r="5" fill="#2F353B" />
      <text x="74" y="10" textAnchor="middle" fontFamily={COND} fontSize="11" fontWeight="700" fill="#20262D">{label}</text>
    </svg>
  );
}

/** Boîte à bornes du moteur, barrettes étoile ou triangle. */
export function TerminalBoxSvg({ coupling }: { coupling: 'Y' | 'D' }) {
  const Y = coupling === 'Y';
  return (
    <svg viewBox="0 0 112 112">
      <rect x="2" y="10" width="108" height="100" rx="6" fill="#3A4047" stroke="#1F2429" />
      <rect x="8" y="16" width="96" height="88" rx="4" fill="#5B626A" />
      <text x="56" y="8" textAnchor="middle" fontFamily={COND} fontSize="9" fontWeight="700" fill="#20262D">
        {`M1 · BOÎTE À BORNES · ${Y ? 'ÉTOILE Y' : 'TRIANGLE Δ'}`}
      </text>
      {Y ? (
        <rect x="22" y="34" width="72" height="12" rx="3" fill="#C9A34A" stroke="#6B5A00" />
      ) : (
        <>
          <rect x="24" y="34" width="12" height="46" rx="3" fill="#C9A34A" stroke="#6B5A00" />
          <rect x="52" y="34" width="12" height="46" rx="3" fill="#C9A34A" stroke="#6B5A00" />
          <rect x="80" y="34" width="12" height="46" rx="3" fill="#C9A34A" stroke="#6B5A00" />
        </>
      )}
      <g fill="#D9DEE3" stroke="#20262D">
        <circle cx="30" cy="40" r="6" /><circle cx="58" cy="40" r="6" /><circle cx="86" cy="40" r="6" />
        <circle cx="30" cy="74" r="6" /><circle cx="58" cy="74" r="6" /><circle cx="86" cy="74" r="6" />
        <circle cx="14" cy="98" r="5" fill="#37B34A" />
      </g>
      <text x="56" y="58" textAnchor="middle" fontFamily={MONO} fontSize="7" fill="#fff">
        {Y ? 'W2–U2–V2 pontés' : 'U1-W2 · V1-U2 · W1-V2'}
      </text>
      <text x="98" y="102" textAnchor="end" fontFamily={MONO} fontSize="6.5" fill="#fff">400 V Y · 230 V Δ</text>
    </svg>
  );
}

/** Cadenas de consignation. */
export function LockSvg() {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40">
      <path d="M9 18v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#3A4047" strokeWidth="3" />
      <rect x="4" y="18" width="26" height="20" rx="3" fill="#D93A3A" stroke="#7A1F1F" />
      <circle cx="17" cy="27" r="3" fill="#fff" />
    </svg>
  );
}

/**
 * Sectionneur porte-fusibles tripolaire (type GK1, 3 modules).
 *
 * C'est l'organe de SECTIONNEMENT ET DE CONSIGNATION d'un départ-moteur : il coupe en charge
 * nulle, se cadenasse en position ouverte et porte trois cartouches aM qui assurent la
 * protection contre les courts-circuits. Il se dessine ouvert ou fermé, parce que l'élève doit
 * lire sa position d'un coup d'œil avant toute intervention.
 */
export function FuseSwitchSvg({ state }: { state?: 'on' | 'off' | 'trip' }) {
  const gid = React.useId();
  const ferme = state === 'on';
  return (
    <svg viewBox="0 0 78 120" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2F3F5" /><stop offset=".5" stopColor="#DDE0E4" /><stop offset="1" stopColor="#C2C7CD" />
        </linearGradient>
      </defs>
      {/* corps modulaire */}
      <rect x="2" y="10" width="74" height="100" rx="3" fill={`url(#${gid})`} stroke="#6E7780" strokeWidth="1.5" />
      {/* bornes à cage, en haut et en bas */}
      <g fill="#2A2E33">
        {[0, 1, 2].map((i) => <rect key={`t${i}`} x={10 + i * 24} width="16" y="2" height="10" rx="2" />)}
        {[0, 1, 2].map((i) => <rect key={`b${i}`} x={10 + i * 24} width="16" y="108" height="10" rx="2" />)}
      </g>
      {/* trois tiroirs porte-cartouche : basculés vers l'avant quand le sectionneur est ouvert */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${10 + i * 24} ${ferme ? 30 : 34})`}>
          <rect x="0" y="0" width="16" height="58" rx="2" fill={ferme ? '#3A4047' : '#8A9299'} stroke="#20262D" />
          <rect x="3" y={ferme ? 8 : 12} width="10" height="34" rx="1.5" fill="#C8A24B" stroke="#8A6D22" />
          <text x="8" y={ferme ? 30 : 34} textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#3A2E0C">aM</text>
        </g>
      ))}
      {/* étiquette et repère de position, lus avant consignation */}
      <text x="39" y="24" textAnchor="middle" fontFamily={COND} fontSize="9" fontWeight="700" fill="#3A4047">
        {ferme ? 'I' : 'O'}
      </text>
      <text x="39" y="103" textAnchor="middle" fontFamily={SANS} fontSize="6" fill="#66717F">3P · 400 V · aM</text>
      {/* anneau de cadenassage, accessible uniquement en position ouverte */}
      <circle cx="70" cy="99" r="3" fill="none" stroke={ferme ? '#9AA1A8' : '#D93A3A'} strokeWidth="1.5" />
    </svg>
  );
}

/** Rendu vectoriel associé à une clé de catalogue, s'il y en a un. */
export function svgForKey(key: string, state?: 'on' | 'off' | 'trip'): React.ReactNode | null {
  switch (key) {
    case 'fuseswitch': return <FuseSwitchSvg state={state} />;
    case 'pvpanel': return <PvPanelSvg />;
    case 'onduleur': return <OnduleurSvg />;
    case 'dcswitch': return <DcModSvg kind="sw" />;
    case 'dcspd': return <DcModSvg kind="spd" />;
    case 'dcfuse': return <DcModSvg kind="fuse" />;
    case 'battery': return <BatterySvg />;
    case 'agcp': return <AgcpSvg />;
    case 'plc': return <PlcSvg />;
    default: return null;
  }
}
