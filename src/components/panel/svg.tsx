'use client';

/**
 * Appareils dessinés en vectoriel (pas de photo dans le pack) : modules PV, onduleur,
 * batterie, AGCP, automate M221, moteur et boîte à bornes.
 * Port de `pvPanelSvg`, `onduleurSvg`, `dcModSvg`, `batterySvg`, `agcpSvg`, `plcSvg`, `tboxSvg`
 * de `docs/reference/illustration-v3.tpl.html`.
 */
import React from 'react';

const SHADOW2 = { filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' } as const;
const SHADOW3 = { filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.35))' } as const;
const MONO = 'var(--font-mono), monospace';
const SANS = 'var(--font-sans), sans-serif';
const COND = 'var(--font-title), sans-serif';

/**
 * Module PV en format PAYSAGE (viewBox 100 × 80, ratio 1.25 = celui d'une cellule du
 * bandeau toiture 40 × 32) : il remplit la case sans marges. Grille de cellules 6 × 3.
 */
export function PvPanelSvg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 100 80" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B2C5E" /><stop offset=".5" stopColor="#0E1A3C" /><stop offset="1" stopColor="#25407A" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="98" height="78" rx="3" fill="#B9BEC4" stroke="#5E656D" />
      <rect x="4" y="4" width="92" height="72" fill={`url(#${gid})`} />
      <g fill="none" stroke="#9FB3D9" strokeWidth=".8" opacity=".8">
        {[0, 1, 2, 3].map((i) => <path key={`h${i}`} d={`M4 ${4 + i * 24}h92`} />)}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={`v${i}`} d={`M${4 + i * (92 / 6)} 4v72`} />)}
      </g>
      <g stroke="#DCE6F5" strokeWidth=".4" opacity=".6">
        {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M4 ${4 + i * 12}h92`} />)}
      </g>
      <rect x="6" y="6" width="26" height="14" fill="#fff" opacity=".08" />
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
  // Batterie individuelle 12 V · 600 Ah, en PAYSAGE (le parc est assemblé à partir de
  // plusieurs). Bornes + (rouge) en haut-gauche et − (noir) en haut-droite, alignées sur
  // les fractions de `recvTerminals` (battery : X1 à 16 %, X2 à 84 %).
  return (
    <svg viewBox="0 0 100 56" preserveAspectRatio="none" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <rect x="2" y="8" width="96" height="46" rx="6" fill="#F4F5F7" stroke="#6E7780" strokeWidth="1.5" />
      {/* plots de raccordement sur le dessus */}
      <rect x="12" y="2" width="12" height="9" rx="2" fill="#D93A3A" stroke="#7A1F1F" />
      <rect x="76" y="2" width="12" height="9" rx="2" fill="#20262D" stroke="#000" />
      {/* cellules */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x="12" y={16 + i * 9} width="76" height="6" rx="1.5" fill="#1E9E63" />
      ))}
      <text x="50" y="50" textAnchor="middle" fontFamily={MONO} fontSize="7" fontWeight="700" fill="#3A4047">12 V · 600 Ah</text>
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

/**
 * Plaque à bornes du moteur. Elle n'annonce plus le couplage : c'est l'élève qui le réalise
 * en posant les barrettes d'après la plaque signalétique (400 V Y · 230 V Δ) et la tension
 * du réseau. Le simulateur constate ensuite ce qui a été ponté.
 */
export function TerminalBoxSvg() {
  return (
    <svg viewBox="0 0 112 112">
      <rect x="2" y="10" width="108" height="100" rx="6" fill="#3A4047" stroke="#1F2429" />
      <rect x="8" y="16" width="96" height="88" rx="4" fill="#5B626A" />
      <text x="56" y="8" textAnchor="middle" fontFamily={COND} fontSize="9" fontWeight="700" fill="#20262D">
        M1 · PLAQUE À BORNES
      </text>
      {/*
        Plus de barrettes dessinées d'office : c'est l'ÉLÈVE qui les pose, en reliant les
        bornes entre elles d'après la plaque signalétique. Le couplage se déduit ensuite de
        ce qu'il a ponté — il n'est plus donné par un bouton.
      */}
      <g fill="#D9DEE3" stroke="#20262D">
        <circle cx="30" cy="40" r="6" /><circle cx="58" cy="40" r="6" /><circle cx="86" cy="40" r="6" />
        <circle cx="30" cy="74" r="6" /><circle cx="58" cy="74" r="6" /><circle cx="86" cy="74" r="6" />
        <circle cx="14" cy="98" r="5" fill="#37B34A" />
      </g>
      <text x="56" y="60" textAnchor="middle" fontFamily={MONO} fontSize="6.5" fill="#C3CBD2">
        barrettes à poser
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

/** Rendu vectoriel associé à une clé de catalogue, s'il y en a un. */
/* ------------------------------------------------------ appareils du TD wagonnet
 *
 * Quatre organes de commande industrielle que le pack photo ne contient pas.
 * Chaque dessin est tracé dans un viewBox aux PROPORTIONS RÉELLES de l'appareil
 * (les mêmes millimètres que `dims` dans le catalogue), pour que la platine reste
 * à l'échelle et que les bornes tombent en face des vis.
 */

/** Sectionneur porte-fusibles GK1 ES — 3 cartouches 14 × 51, 2 précoupures. 97 × 97 mm. */
export function Gk1Svg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 97 97" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A5058" /><stop offset=".5" stopColor="#32383F" /><stop offset="1" stopColor="#23282E" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="95" height="95" rx="3" fill={`url(#${gid})`} stroke="#171B20" />
      {/* trois tiroirs porte-cartouches, un par pôle */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={9 + i * 27} y="20" width="22" height="57" rx="2.5" fill="#20252B" stroke="#12151A" />
          <rect x={12 + i * 27} y="27" width="16" height="43" rx="8" fill="#C9CDD2" stroke="#8B9197" />
          <rect x={12 + i * 27} y="27" width="16" height="6" fill="#8E949B" />
          <rect x={12 + i * 27} y="64" width="16" height="6" fill="#8E949B" />
          <path d={`M${16 + i * 27} 44h8`} stroke="#6E747B" strokeWidth="1.2" />
        </g>
      ))}
      {/* bornes de puissance, vis-étrier */}
      {[0, 1, 2].map((i) => (
        <g key={`b${i}`} fill="#D7B36A" stroke="#8E7635">
          <rect x={13 + i * 27} y="5" width="14" height="10" rx="1.5" />
          <rect x={13 + i * 27} y="82" width="14" height="10" rx="1.5" />
        </g>
      ))}
      {/* contacts de précoupure : ils coupent la commande AVANT la puissance */}
      <rect x="86" y="20" width="8" height="57" rx="2" fill="#1B1F24" stroke="#12151A" />
      <text x="90" y="49" textAnchor="middle" fill="#9AA1A8" fontSize="6" fontFamily={COND}>13</text>
    </svg>
  );
}

/** Contacteur tripolaire LC1 D50 — 75 × 127 mm. Deux accouplés font l'inverseur LC2 D50. */
export function Lc1D50Svg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 75 127" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3C424A" /><stop offset=".45" stopColor="#2A3037" /><stop offset="1" stopColor="#1E2329" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="73" height="125" rx="3" fill={`url(#${gid})`} stroke="#14181D" />
      {/* bornes de puissance 1/3/5 en haut, 2/4/6 en bas */}
      {[0, 1, 2].map((i) => (
        <g key={i} fill="#D7B36A" stroke="#8E7635">
          <rect x={8 + i * 21} y="5" width="15" height="11" rx="1.5" />
          <rect x={8 + i * 21} y="111" width="15" height="11" rx="1.5" />
        </g>
      ))}
      {/* fenêtre centrale : bloc de contacts auxiliaires */}
      <rect x="10" y="44" width="55" height="40" rx="2" fill="#171B20" stroke="#0E1115" />
      <rect x="14" y="49" width="47" height="14" rx="1.5" fill="#2E343B" />
      <text x="37.5" y="59" textAnchor="middle" fill="#9AA1A8" fontSize="8" fontFamily={COND}>LC1 D50</text>
      <rect x="14" y="67" width="20" height="12" rx="1.5" fill="#D7B36A" stroke="#8E7635" />
      <rect x="41" y="67" width="20" height="12" rx="1.5" fill="#D7B36A" stroke="#8E7635" />
      {/* bornes de bobine A1 / A2, en angle */}
      <rect x="4" y="22" width="12" height="10" rx="1.5" fill="#D7B36A" stroke="#8E7635" />
      <rect x="59" y="95" width="12" height="10" rx="1.5" fill="#D7B36A" stroke="#8E7635" />
    </svg>
  );
}

/** Relais thermique LRD 3357 — zone 37…50 A, classe 10 A. 75 × 123 mm. */
export function Lrd3357Svg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 75 123" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A4048" /><stop offset="1" stopColor="#1F242A" />
        </linearGradient>
      </defs>
      <rect x="1" y="14" width="73" height="95" rx="3" fill={`url(#${gid})`} stroke="#14181D" />
      {/* barrettes d'enfichage sous le contacteur */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={12 + i * 21} y="1" width="10" height="16" rx="1.5" fill="#C08A3E" stroke="#7E5A24" />
      ))}
      {/* bornes de sortie vers le moteur */}
      {[0, 1, 2].map((i) => (
        <rect key={`b${i}`} x={9 + i * 21} y="99" width="15" height="11" rx="1.5" fill="#D7B36A" stroke="#8E7635" />
      ))}
      {/* molette de réglage du courant, bouton test et bouton de réarmement */}
      <circle cx="24" cy="48" r="13" fill="#20252B" stroke="#12151A" />
      <circle cx="24" cy="48" r="8.5" fill="#2F6FB5" stroke="#1B4A80" />
      <path d="M24 41v7" stroke="#DCE6F5" strokeWidth="1.6" />
      <text x="24" y="70" textAnchor="middle" fill="#9AA1A8" fontSize="7" fontFamily={MONO}>37-50A</text>
      <rect x="45" y="38" width="9" height="9" rx="1.5" fill="#B33A32" stroke="#7C2620" />
      <rect x="58" y="38" width="9" height="9" rx="1.5" fill="#2F8F5B" stroke="#1D6640" />
      {/* contacts auxiliaires 95-96 (O) et 97-98 (F) */}
      <rect x="3" y="112" width="12" height="9" rx="1.5" fill="#D7B36A" stroke="#8E7635" />
      <rect x="60" y="112" width="12" height="9" rx="1.5" fill="#D7B36A" stroke="#8E7635" />
    </svg>
  );
}

/** Contacteur auxiliaire CAD 32 — 3 F + 2 O, bobine 24 V, + bloc temporisé LAD T0. 45 × 77 mm. */
export function Cad32Svg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 45 77" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3C424A" /><stop offset=".5" stopColor="#2A3037" /><stop offset="1" stopColor="#1E2329" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="43" height="75" rx="2.5" fill={`url(#${gid})`} stroke="#14181D" />
      {/* cinq voies de contacts, bornes en haut et en bas */}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} fill="#D7B36A" stroke="#8E7635">
          <rect x={4 + i * 8} y="4" width="6" height="8" rx="1" />
          <rect x={4 + i * 8} y="65" width="6" height="8" rx="1" />
        </g>
      ))}
      {/* bloc temporisé clipsé en face avant : molette de réglage 0,1…3 s */}
      <rect x="7" y="24" width="31" height="28" rx="2" fill="#171B20" stroke="#0E1115" />
      <circle cx="22.5" cy="38" r="8.5" fill="#20252B" stroke="#12151A" />
      <circle cx="22.5" cy="38" r="5.5" fill="#C9A227" stroke="#8C7018" />
      <path d="M22.5 33v5" stroke="#1B1F24" strokeWidth="1.4" />
      <text x="22.5" y="57" textAnchor="middle" fill="#9AA1A8" fontSize="6" fontFamily={MONO}>0,1-3s</text>
      <text x="22.5" y="20" textAnchor="middle" fill="#9AA1A8" fontSize="6" fontFamily={COND}>CAD 32</text>
    </svg>
  );
}

/** Régulateur de charge MPPT : entrée PV en haut, sortie batterie en bas. */
export function MpptSvg() {
  return (
    <svg viewBox="0 0 90 120" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <rect x="3" y="4" width="84" height="112" rx="8" fill="#0A84FF" stroke="#0A5AB0" strokeWidth="1.5" />
      <rect x="12" y="14" width="66" height="26" rx="3" fill="#08213F" />
      <text x="45" y="31" textAnchor="middle" fontFamily={MONO} fontSize="9" fill="#5CFF9A">MPPT</text>
      <text x="45" y="56" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#EAF4FF">150 / 70</text>
      <text x="45" y="68" textAnchor="middle" fontFamily={SANS} fontSize="6" fill="#Bcdcff">régulateur solaire</text>
      <circle cx="45" cy="86" r="9" fill="none" stroke="#EAF4FF" strokeWidth="1.5" /><text x="45" y="90" textAnchor="middle" fontFamily={MONO} fontSize="8" fill="#EAF4FF">☀</text>
      <g fontFamily={MONO} fontSize="5.5" fontWeight="700" fill="#EAF4FF"><text x="20" y="12">PV+</text><text x="58" y="12">PV−</text><text x="19" y="114">B+</text><text x="59" y="114">B−</text></g>
    </svg>
  );
}
/**
 * Convertisseur/chargeur MultiPlus : entrée batterie (DC) + sortie 230 V (AC).
 * L'écran ne s'allume (puissance + conversion en vert) que lorsque l'onduleur est EN MARCHE.
 * À l'arrêt, il est en veille : afficheur sombre, sortie 230 V coupée.
 */
export function MultiplusSvg({ running = false }: { running?: boolean }) {
  const lcd = running ? '#5CFF9A' : '#2E5C86';
  return (
    <svg viewBox="0 0 110 130" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <rect x="4" y="6" width="102" height="112" rx="8" fill="#0A84FF" stroke="#0A5AB0" strokeWidth="1.5" />
      <rect x="12" y="14" width="86" height="30" rx="4" fill="#08213F" />
      <text x="18" y="33" fontFamily={MONO} fontSize="8" fill={lcd}>{running ? '2400 W' : 'veille'}</text>
      <text x="12" y="60" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#EAF4FF">MULTIPLUS 24/3000</text>
      <text x="12" y="70" fontFamily={SANS} fontSize="6" fill="#Bcdcff">convertisseur · chargeur</text>
      <rect x="12" y="82" width="86" height="20" rx="3" fill="#08213F" />
      <text x="16" y="95" fontFamily={MONO} fontSize="6" fill={lcd}>{running ? 'DC 24 V → AC 230 V · 50 Hz' : 'sortie 230 V coupée'}</text>
      <g fontFamily={MONO} fontSize="5.5" fontWeight="700" fill="#EAF4FF"><text x="10" y="114">B+</text><text x="28" y="114">B−</text><text x="60" y="114">L</text><text x="77" y="114">N</text><text x="90" y="114">PE</text></g>
    </svg>
  );
}
/** Fusible batterie MEGA (forte intensité) : deux bornes à boulon. */
export function MegaFuseSvg() {
  return (
    <svg viewBox="0 0 52 60" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="2" y="10" width="48" height="40" rx="6" fill="#3A2A00" stroke="#E39A00" strokeWidth="1.5" />
      <circle cx="26" cy="8" r="4" fill="#8E969E" stroke="#4E555C" /><circle cx="26" cy="52" r="4" fill="#8E969E" stroke="#4E555C" />
      <text x="26" y="28" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#FFD54A">MEGA</text>
      <text x="26" y="40" textAnchor="middle" fontFamily={MONO} fontSize="7" fill="#FFD54A">125 A</text>
    </svg>
  );
}
/** Interrupteur différentiel 30 mA (tête de groupe du tableau). */
export function IddrSvg() {
  return (
    <svg viewBox="0 0 72 120" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="70" height="118" rx="4" fill="#F4F5F7" stroke="#6E7780" />
      <rect x="1" y="1" width="70" height="14" rx="4" fill="#C9CED4" />
      <rect x="1" y="105" width="70" height="14" rx="4" fill="#C9CED4" />
      <g fill="#3A4047"><circle cx="22" cy="8" r="3.5" /><circle cx="50" cy="8" r="3.5" /><circle cx="22" cy="112" r="3.5" /><circle cx="50" cy="112" r="3.5" /></g>
      <rect x="26" y="30" width="20" height="30" rx="3" fill="#20262D" />
      <rect x="30" y="34" width="12" height="10" rx="1" fill="#3DFF7A" />
      <text x="36" y="74" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#3A4047">30 mA</text>
      <text x="36" y="86" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#66717F">type A</text>
      <rect x="26" y="92" width="20" height="9" rx="2" fill="#D93A3A" /><text x="36" y="99" textAnchor="middle" fontFamily={SANS} fontSize="5" fill="#fff">TEST</text>
    </svg>
  );
}

/**
 * Boîte de jonction (combiner) PV : 4 porte-fusibles gPV repérés F1..F4 en haut
 * (une chaîne de 3 modules par fusible), reliés au bus + ; deux barrettes bus
 * + (rouge, repère P+) et − (noir, repère M−) sortent à droite vers le sectionneur.
 * viewBox proportionné à la boîte réelle (100 × 74).
 */
export function CombinerSvg() {
  // Boîte agrandie : entrées sur le bord GAUCHE (face aux modules) — 4 porte-fusibles
  // F1..F4 puis le bus M ; bus + vertical qui sort à droite en P+ (vers Q2). Les repères
  // suivent les fractions de `annexTerminals` (combiner) : F1..F4 à 16/34/52/70 %, M à 88 %.
  const fy = [16, 34, 52, 70];
  return (
    <svg viewBox="0 0 112 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <rect x="1" y="1" width="110" height="98" rx="4" fill="#D5D9DE" stroke="#7E8790" strokeWidth="1.5" />
      <rect x="1" y="1" width="110" height="11" rx="4" fill="#C1C6CC" />
      <text x="56" y="9" textAnchor="middle" fontFamily={SANS} fontSize="6" fontWeight="700" fill="#3A4047">BOÎTE DE JONCTION</text>
      {/* bus + (rouge) vertical : relie les 4 fusibles, sort à droite en P+ */}
      <rect x="70" y={fy[0]} width="4" height={fy[3] - fy[0]} rx="2" fill="#D93A3A" />
      {fy.map((cy, i) => (
        <g key={i}>
          {/* porte-fusible horizontal, depuis le bord gauche */}
          <rect x="3" y={cy - 6} width="34" height="12" rx="2" fill="#8E969E" stroke="#4E555C" />
          <rect x="7" y={cy - 3.5} width="18" height="7" rx="3" fill="#EDEFF2" stroke="#B9BEC4" />
          <text x="46" y={cy + 2.5} textAnchor="middle" fontFamily={MONO} fontSize="5.5" fontWeight="700" fill="#141A21">{`F${i + 1}`}</text>
          <path d={`M37 ${cy}H72`} stroke="#D93A3A" strokeWidth="1.5" />
        </g>
      ))}
      {/* sortie P+ à droite (vers Q2) */}
      <path d="M74 50H112" stroke="#D93A3A" strokeWidth="2" />
      <text x="104" y="46" textAnchor="middle" fontFamily={MONO} fontSize="6" fontWeight="700" fill="#D93A3A">P+</text>
      {/* bus − (noir) : M en bas gauche, reçoit les 4 retours puis part vers Q2 */}
      <rect x="3" y="86" width="66" height="4" rx="2" fill="#20262D" />
      <text x="20" y="84" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fontWeight="700" fill="#20262D">M −</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ KNX
 *
 * Les quatre appareils du banc DOMO-KNX de l'établissement. Aucune photo dans le
 * pack : ils sont dessinés, comme les modules photovoltaïques et l'automate.
 *
 * Le code couleur des bornes suit la sérigraphie des platines Langlois : bus (+)
 * ROUGE, bus (−) NOIR, 230 V sur bornes de sécurité classiques. C'est le même
 * repérage que l'élève a sous les yeux en atelier.
 */

/** Alimentation de bus KNX REG-K 320 mA (MTN684032) : 230 V AC en haut, bus 29 V DC en bas. */
/**
 * Connecteur de bus KNX : le bloc enfichable ROUGE (+) et NOIR (−) à quatre trous.
 *
 * C'est l'objet que l'élève a dans la main au banc. Le dessiner comme deux
 * rectangles gris anonymes, identiques aux bornes 230 V, obligeait à traduire
 * l'écran vers l'appareil ; avec le connecteur réel, il n'y a plus rien à
 * traduire — on cherche le rouge, on trouve le (+).
 */
function BusConn({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const hw = w / 2 - 0.5;
  const r = Math.min(h * 0.155, 1.9);
  const trous = (x0: number, fill: string) => (
    <g fill={fill}>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x0 + hw * (0.22 + i * 0.28)} cy={y + h * 0.33} r={r} />
      ))}
      <circle cx={x0 + hw * 0.5} cy={y + h * 0.74} r={r} />
    </g>
  );
  return (
    <g>
      <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} rx="2" fill="#E7EAEE" stroke="#9AA3AC" strokeWidth=".7" />
      <rect x={x} y={y} width={hw} height={h} rx="1.5" fill="#C62828" stroke="#8E1B16" strokeWidth=".7" />
      <rect x={x + hw + 1} y={y} width={hw} height={h} rx="1.5" fill="#26292E" stroke="#111" strokeWidth=".7" />
      {trous(x, '#4A100E')}
      {trous(x + hw + 1, '#000')}
    </g>
  );
}

export function KnxAlimSvg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 104 123" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7F8F9" /><stop offset="1" stopColor="#D7DBE0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="102" height="121" rx="4" fill={`url(#${gid})`} stroke="#6E7780" />
      <rect x="1" y="1" width="102" height="16" rx="4" fill="#C3C8CE" />
      <rect x="1" y="106" width="102" height="16" rx="4" fill="#C3C8CE" />
      {/* Le repère de slot (« A1 ») se pose au CENTRE de l'appareil : la sérigraphie
          laisse donc la bande médiane libre, sinon la référence passe dessous. */}
      <text x="52" y="30" textAnchor="middle" fontFamily={SANS} fontSize="8" fontWeight="700" fill="#2E7D4F">Schneider</text>
      <text x="52" y="42" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#3A4047">ALIMENTATION KNX</text>
      <rect x="22" y="76" width="60" height="18" rx="3" fill="#20262D" />
      <text x="40" y="89" textAnchor="middle" fontFamily={MONO} fontSize="7" fill="#9AA1A8">320 mA</text>
      <circle cx="66" cy="85" r="3" fill="#3DFF7A" /><circle cx="76" cy="85" r="3" fill="#FFD479" />
      <text x="52" y="72" textAnchor="middle" fontFamily={MONO} fontSize="6.5" fill="#66717F">MTN684032</text>
      {/* bornes : 230 V en haut, bus en bas (rouge / noir comme sur la platine) */}
      <g fill="#3A4047"><rect x="17" y="5" width="12" height="8" rx="1.5" /><rect x="46" y="5" width="12" height="8" rx="1.5" /></g>
      <rect x="75" y="5" width="12" height="8" rx="1.5" fill="#2E7D32" />
      <BusConn x={30} y={104} w={44} h={16} />
      <text x="52" y="100" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fill="#66717F">BUS 29 V DC</text>
    </svg>
  );
}

/** Interface USB KNX REG-K (MTN681829) : la prise par laquelle ETS5 adresse les participants. */
export function KnxUsbSvg() {
  return (
    <svg viewBox="0 0 52 123" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="50" height="121" rx="4" fill="#F4F5F7" stroke="#6E7780" />
      <rect x="1" y="1" width="50" height="16" rx="4" fill="#C3C8CE" />
      <rect x="10" y="110" width="32" height="4" fill="#2E7D4F" />
      <text x="26" y="34" textAnchor="middle" fontFamily={SANS} fontSize="6" fontWeight="700" fill="#3A4047">INTERFACE</text>
      <text x="26" y="43" textAnchor="middle" fontFamily={SANS} fontSize="6" fontWeight="700" fill="#3A4047">USB</text>
      {/* prise USB type B, face avant */}
      <rect x="14" y="54" width="24" height="22" rx="2" fill="#20262D" />
      <rect x="18" y="59" width="16" height="12" rx="1" fill="#4A5058" />
      <circle cx="26" cy="86" r="3" fill="#3DFF7A" />
      <text x="26" y="101" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#66717F">MTN681829</text>
      {/* connecteur de bus en haut */}
      <BusConn x={7} y={2} w={38} h={13} />
    </svg>
  );
}

/**
 * Actionneur de commutation REG-K 2 × 230 V / 10 A (MTN649202).
 *
 * Les deux basculeurs verts sont sa COMMANDE MANUELLE locale : l'appareil ferme
 * ses contacts sans télégramme. C'est ce qui rend le diagnostic possible — un
 * actionneur qui répond à la main mais pas au bouton désigne le bus, pas lui.
 */
export function KnxActSvg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 104 123" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7F8F9" /><stop offset="1" stopColor="#D7DBE0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="102" height="121" rx="4" fill={`url(#${gid})`} stroke="#6E7780" />
      <rect x="1" y="1" width="102" height="16" rx="4" fill="#C3C8CE" />
      <rect x="1" y="106" width="102" height="16" rx="4" fill="#C3C8CE" />
      <text x="52" y="36" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#3A4047">ACTIONNEUR 2 × 10 A</text>
      <text x="52" y="47" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#66717F">MTN649202</text>
      {/* commande manuelle : deux basculeurs + LED d'état par voie */}
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={22 + i * 34} y="56" width="22" height="30" rx="3" fill="#20262D" />
          <rect x={25 + i * 34} y="60" width="16" height="12" rx="2" fill="#3FA65C" />
          <circle cx={33 + i * 34} cy="80" r="3" fill="#3DFF7A" />
          <text x={33 + i * 34} y="98" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#3A4047">{i + 1}</text>
        </g>
      ))}
      {/* bornes : L commun et deux sorties en haut, bus en bas */}
      <g fill="#3A4047"><rect x="15" y="5" width="12" height="8" rx="1.5" /><rect x="46" y="5" width="12" height="8" rx="1.5" /><rect x="77" y="5" width="12" height="8" rx="1.5" /></g>
      <BusConn x={30} y={104} w={44} h={16} />
    </svg>
  );
}

/**
 * Bouton-poussoir Unica KNX 2 touches / 4 poussoirs (MGU3.531.18), posé en annexe.
 *
 * Quatre poussoirs et une LED d'état par touche : c'est cette LED qui rend le
 * RETOUR D'ÉTAT visible, et le TP 1.1 ne s'en servait pas.
 */
export function KnxBpSvg() {
  return (
    <svg viewBox="0 0 60 60" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="58" height="58" rx="4" fill="#FAFAFA" stroke="#B9BEC4" />
      <rect x="7" y="7" width="46" height="46" rx="2" fill="#F1F2F4" stroke="#CDD2D8" />
      {[0, 1].map((c) => (
        <g key={c}>
          <rect x={9 + c * 23} y="9" width="21" height="20" rx="1.5" fill="#fff" stroke="#DDE1E5" />
          <rect x={9 + c * 23} y="31" width="21" height="20" rx="1.5" fill="#fff" stroke="#DDE1E5" />
          <path d={`M${15 + c * 23} 21l4-5 4 5`} fill="none" stroke="#8A94A0" strokeWidth="1.2" />
          <path d={`M${15 + c * 23} 39l4 5 4-5`} fill="none" stroke="#8A94A0" strokeWidth="1.2" />
          <circle cx={19.5 + c * 23} cy="30" r="1.6" fill="#3FA65C" />
        </g>
      ))}
      {/* Connecteur de bus AU DOS du mécanisme : il affleure le bord droit, aux
          hauteurs exactes des bornes X1 (+) et X2 (−) que déclare `annexTerminals`.
          Sans lui, l'élève raccordait deux fils sur un appareil sans bornes visibles. */}
      <g>
        <rect x="51" y="16" width="9" height="11" rx="1.5" fill="#C62828" stroke="#8E1B16" strokeWidth=".7" />
        <circle cx="55.5" cy="19.5" r="1.3" fill="#4A100E" /><circle cx="55.5" cy="23.5" r="1.3" fill="#4A100E" />
        <rect x="51" y="37" width="9" height="11" rx="1.5" fill="#26292E" stroke="#111" strokeWidth=".7" />
        <circle cx="55.5" cy="40.5" r="1.3" fill="#000" /><circle cx="55.5" cy="44.5" r="1.3" fill="#000" />
      </g>
    </svg>
  );
}

/**
 * Barrette de coupure (borne principale de terre).
 *
 * Deux bornes reliées par une barrette DÉMONTABLE. Fermée, c'est un simple
 * conducteur ; ouverte, elle isole la prise de terre du reste de l'installation
 * — la seule façon de mesurer sa résistance sans la fausser par les masses. Le
 * dessin la montre fermée, position d'exploitation ; c'est l'oublier ouverte
 * après un contrôle qui laisse une installation sans terre, et c'est la panne
 * que ce TP fait chercher.
 */
export function BarrCoupureSvg() {
  return (
    <svg viewBox="0 0 84 40" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="82" height="38" rx="4" fill="#F4F5F7" stroke="#8A929B" />
      <rect x="6" y="6" width="72" height="28" rx="3" fill="#FFFFFF" stroke="#C3CAD3" />
      {/* les deux bornes et la barrette qui les ponte */}
      <rect x="18" y="16" width="48" height="7" rx="2" fill="#B9BEC4" stroke="#7E858C" strokeWidth=".8" />
      {[20, 64].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="19.5" r="6" fill="#DDE1E5" stroke="#7E858C" strokeWidth="1" />
          <path d={`M${cx - 3.4} 19.5h6.8`} stroke="#5A6169" strokeWidth="1.4" />
        </g>
      ))}
      <text x="42" y="12" textAnchor="middle" fontFamily={SANS} fontSize="4.6" fontWeight="700" fill="#3A4047">BARRETTE DE COUPURE</text>
      <text x="42" y="32" textAnchor="middle" fontFamily={MONO} fontSize="4.2" fill="#66717F">borne principale de terre</text>
    </svg>
  );
}

/**
 * Piquet de terre — acier cuivré ⌀ 16, enfoncé sur 1 m au minimum.
 *
 * C'est la prise de terre elle-même. Sa résistance ne se décrète pas : elle
 * dépend du sol, et c'est pour cela qu'on la mesure.
 */
export function PiquetSvg() {
  return (
    <svg viewBox="0 0 26 96" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      {/* le sol, hachuré : le piquet est le seul appareil du TP qui est enterré */}
      <rect x="0" y="14" width="26" height="82" fill="#F0EBE2" />
      <path d="M0 14H26" stroke="#B9AD98" strokeWidth="1.4" />
      {[0, 6, 12, 18, 24].map((x) => (
        <path key={x} d={`M${x} 14l-5 6`} stroke="#CFC4B0" strokeWidth="1" />
      ))}
      <rect x="9.5" y="8" width="7" height="76" rx="2" fill="#B87333" stroke="#8A5A26" strokeWidth=".8" />
      <path d="M9.5 84l3.5 8 3.5-8z" fill="#8A5A26" />
      {/* cosse de raccordement du conducteur de terre, en tête */}
      <rect x="6" y="4" width="14" height="6" rx="2" fill="#DDE1E5" stroke="#7E858C" strokeWidth=".8" />
    </svg>
  );
}

export function svgForKey(key: string, running = false): React.ReactNode | null {
  switch (key) {
    case 'pvpanel': return <PvPanelSvg />;
    case 'combiner': return <CombinerSvg />;
    case 'onduleur': return <OnduleurSvg />;
    case 'dcswitch': return <DcModSvg kind="sw" />;
    case 'dcspd': return <DcModSvg kind="spd" />;
    case 'dcfuse': return <DcModSvg kind="fuse" />;
    case 'battery': return <BatterySvg />;
    case 'agcp': return <AgcpSvg />;
    case 'mppt': return <MpptSvg />;
    case 'multiplus': return <MultiplusSvg running={running} />;
    case 'megafuse': return <MegaFuseSvg />;
    case 'iddr': return <IddrSvg />;
    case 'knxalim': return <KnxAlimSvg />;
    case 'knxusb': return <KnxUsbSvg />;
    case 'knxact': return <KnxActSvg />;
    case 'knxbp': return <KnxBpSvg />;
    case 'barrcoupure': return <BarrCoupureSvg />;
    case 'piquet': return <PiquetSvg />;
    case 'gk1es': return <Gk1Svg />;
    case 'lc1d50': return <Lc1D50Svg />;
    case 'lrd3357': return <Lrd3357Svg />;
    case 'cad32': return <Cad32Svg />;
    default: return null;
  }
}
