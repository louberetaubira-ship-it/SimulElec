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

export type DcKind = 'sw' | 'spd' | 'fuse' | 'swbat' | 'fusebat';

export function DcModSvg({ kind: k }: { kind: DcKind }) {
  const lab = k === 'sw' ? ['SECT. DC', '1000 V', '2P 32 A']
    : k === 'swbat' ? ['SECT. BAT', '80 V DC', '2P 250 A']
      : k === 'spd' ? ['PARAF. DC', 'Type 2', 'Y']
        : k === 'fusebat' ? ['FUS. BAT.', 'NH00', '250 A'] : ['FUSIBLE DC', 'gPV 15 A', '10×38'];
  // le dessin (manette, cartouches) ne dépend que de la famille de l'appareil
  const kind = k === 'swbat' ? 'sw' : k === 'fusebat' ? 'fuse' : k;
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

/**
 * Onduleur hybride triphasé IMEON 9.12, vu de face. Entrées continues en haut
 * (« Entrée PV string 1 / 2 », « ENTRÉE BATTERIES »), borniers alternatifs en bas
 * (« E/S réseau AC », « SORTIE AC ») — les libellés du folio 01. L'écran ne
 * s'allume qu'en service. Les bornes suivent les fractions du catalogue (`imeon912`).
 */
export function Imeon912Svg({ running = false }: { running?: boolean }) {
  const gid = React.useId();
  const lcd = running ? '#7CD8FF' : '#2E4A66';
  const top = [0.08, 0.18, 0.32, 0.42, 0.72, 0.86];
  const bot = [0.06, 0.15, 0.24, 0.33, 0.42, 0.58, 0.67, 0.76, 0.85, 0.94];
  const W = 180, H = 200;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5B6570" /><stop offset=".5" stopColor="#77818C" /><stop offset="1" stopColor="#56606B" />
        </linearGradient>
      </defs>
      <rect x="3" y="14" width={W - 6} height={H - 28} rx="7" fill={`url(#${gid})`} stroke="#3A4047" strokeWidth="1.5" />
      {/* borniers : continu en haut, alternatif en bas */}
      <rect x="6" y="2" width="76" height="14" rx="2" fill="#2A2E33" />
      <rect x="120" y="2" width="44" height="14" rx="2" fill="#2A2E33" />
      <rect x="4" y={H - 16} width="76" height="14" rx="2" fill="#2A2E33" />
      <rect x="98" y={H - 16} width="80" height="14" rx="2" fill="#2A2E33" />
      {top.map((f, i) => (
        <circle key={`t${i}`} cx={W * f} cy={H * 0.03} r="3.2" fill={i % 2 === 0 ? '#D93A3A' : '#E8EAEC'} stroke="#111" strokeWidth=".6" />
      ))}
      {bot.map((f, i) => (
        <circle key={`b${i}`} cx={W * f} cy={H * 0.97} r="3" fill={i % 5 === 4 ? '#37B34A' : '#C9CED4'} stroke="#111" strokeWidth=".6" />
      ))}
      {/* libellés des borniers */}
      <g fontFamily={SANS} fontSize="5.4" fontWeight="700" fill="#F4F5F7">
        <text x="6" y="24">Entrées PV · strings 1 et 2</text>
        <text x="118" y="24">ENTRÉE BATTERIES</text>
        <text x="6" y={H - 20}>E/S réseau AC</text>
        <text x="100" y={H - 20}>SORTIE AC</text>
      </g>
      {/* façade : logo, écran, voyants */}
      <text x={W / 2} y="44" textAnchor="middle" fontFamily={COND} fontSize="15" fontWeight="700" fill="#fff" letterSpacing=".04em">IMEON 9.12</text>
      <text x={W / 2} y="55" textAnchor="middle" fontFamily={SANS} fontSize="6" fill="#DCE3EA">onduleur hybride · 3/N/PE 230/400 V</text>
      {/* le repère de la platine se pose au milieu : l'écran est dessous */}
      <rect x="44" y="114" width="92" height="34" rx="4" fill="#0B1726" stroke="#1C2B3C" />
      <text x="52" y="128" fontFamily={MONO} fontSize="8" fill={lcd}>{running ? 'EN SERVICE' : 'VEILLE'}</text>
      <text x="52" y="141" fontFamily={MONO} fontSize="7" fill={lcd}>{running ? 'PV 384 V · BAT 49,6 V' : 'réglages à faire'}</text>
      <circle cx="70" cy="157" r="3.2" fill={running ? '#35E36A' : '#3A4047'} />
      <circle cx="90" cy="157" r="3.2" fill={running ? '#FFB020' : '#3A4047'} />
      <circle cx="110" cy="157" r="3.2" fill="#3A4047" />
      <text x={W / 2} y="171" textAnchor="middle" fontFamily={SANS} fontSize="5.5" fill="#DCE3EA">2 MPPT 280–700 V · 48 V · 9 kW</text>
    </svg>
  );
}

/**
 * Module batterie lithium Pylontech US2000C, en façade de rack 19" : interrupteur,
 * ports RS485 / CAN, voyants d'état, puis les deux bornes de puissance à droite —
 * + (orange) et − (noire), alignées sur `recvTerminals` (86 % et 95 %).
 */
export function Us2000cSvg() {
  return (
    <svg viewBox="0 0 300 26" preserveAspectRatio="none" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="0.5" y="0.5" width="299" height="25" rx="2" fill="#1B1F24" stroke="#000" />
      <rect x="4" y="4" width="6" height="18" rx="1" fill="#2E343B" /><rect x="290" y="4" width="6" height="18" rx="1" fill="#2E343B" />
      <circle cx="20" cy="13" r="3.5" fill="#D93A3A" />
      <g fill="#E8EAEC">
        <rect x="32" y="7" width="12" height="12" rx="1" /><rect x="48" y="7" width="12" height="12" rx="1" /><rect x="64" y="7" width="12" height="12" rx="1" />
      </g>
      <g fontFamily={MONO} fontSize="4.2" fill="#9AA3AD"><text x="32" y="24">RS485</text><text x="64" y="24">CAN</text></g>
      {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={96 + i * 7} cy="17" r="1.8" fill="#35E36A" />)}
      <text x="150" y="16" fontFamily={COND} fontSize="10" fontWeight="700" fill="#F4F5F7">US2000C</text>
      <text x="196" y="16" fontFamily={MONO} fontSize="5.5" fill="#9AA3AD">48 V · 50 Ah</text>
      <rect x="252" y="5" width="12" height="16" rx="2" fill="#E0761A" stroke="#7A3A00" />
      <rect x="279" y="5" width="12" height="16" rx="2" fill="#20262D" stroke="#555" />
    </svg>
  );
}

/** Module photovoltaïque en PORTRAIT (72 cellules, 6 × 12), cadre aluminium. */
export function PvModulePortraitSvg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 50 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B2C5E" /><stop offset=".5" stopColor="#0E1A3C" /><stop offset="1" stopColor="#25407A" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="49" height="99" rx="2" fill="#B9BEC4" stroke="#5E656D" />
      <rect x="3" y="3" width="44" height="94" fill={`url(#${gid})`} />
      <g fill="none" stroke="#9FB3D9" strokeWidth=".7" opacity=".8">
        {Array.from({ length: 13 }, (_, i) => <path key={`h${i}`} d={`M3 ${3 + i * (94 / 12)}h44`} />)}
        {Array.from({ length: 7 }, (_, i) => <path key={`v${i}`} d={`M${3 + i * (44 / 6)} 3v94`} />)}
      </g>
      <rect x="5" y="5" width="14" height="22" fill="#fff" opacity=".07" />
    </svg>
  );
}

/**
 * Boîte de jonction d'un string en toiture : presse-étoupes MC4 à gauche (+ rouge,
 * − noir), bornier de départ à droite (P+, M−, PE vert-jaune) vers le coffret.
 */
export function JbStringSvg() {
  return (
    <svg viewBox="0 0 70 64" preserveAspectRatio="none" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <rect x="1" y="1" width="68" height="62" rx="4" fill="#D5D9DE" stroke="#7E8790" strokeWidth="1.5" />
      <rect x="1" y="1" width="68" height="10" rx="4" fill="#C1C6CC" />
      <text x="35" y="8.5" textAnchor="middle" fontFamily={SANS} fontSize="5.4" fontWeight="700" fill="#3A4047">BOÎTE DE JONCTION</text>
      <rect x="0" y="16" width="9" height="7" rx="2" fill="#D93A3A" /><rect x="0" y="36" width="9" height="7" rx="2" fill="#20262D" />
      <path d="M9 19.2H52" stroke="#D93A3A" strokeWidth="1.6" /><path d="M9 39.7H52" stroke="#20262D" strokeWidth="1.6" />
      {/* départs vers la gaine du coffret : P+ à 25 %, M− à 50 %, PE à 75 % (à 80 % de la hauteur) */}
      <path d="M52 19.2H17.5V51" stroke="#D93A3A" strokeWidth="1.6" fill="none" />
      <path d="M52 39.7H35V51" stroke="#20262D" strokeWidth="1.6" fill="none" />
      <path d="M52.5 44V51" stroke="#37B34A" strokeWidth="1.6" strokeDasharray="3 2" />
      <text x="40" y="31" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#3A4047">MC4</text>
      <text x="40" y="47" fontFamily={MONO} fontSize="4" fill="#1E7A33">cadres</text>
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
 * Actionneur de commutation REG-K 8 × 230 V / 16 A (MTN647893, chantier Écobike).
 *
 * Face avant de l'appareil réel (schéma C.3.2, DT 50) : huit basculeurs de commande
 * manuelle avec leur LED d'état et, en bas, HUIT
 * PAIRES de bornes — l'entrée de phase « L » de chaque voie et sa sortie « n ». Les
 * phases se pontent de voie en voie : voies 1 à 4 sur Q13, voies 5 à 8 sur Q14. Le
 * connecteur de bus est ramené en bas à droite (il est en haut sur l'appareil) : le câble
 * de bus descend vers sa gaine sans traverser la face avant. Les x des bornes suivent
 * exactement `catalogue.ts` (pas de 15,4 à partir de 11).
 */
export function KnxAct8Svg() {
  const gid = React.useId();
  const PAS = 15.4;
  const bx = (k: number) => 11 + k * PAS;
  return (
    <svg viewBox="0 0 280 123" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7F8F9" /><stop offset="1" stopColor="#D7DBE0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="278" height="121" rx="4" fill={`url(#${gid})`} stroke="#6E7780" />
      <rect x="1" y="1" width="278" height="16" rx="4" fill="#C3C8CE" />
      <rect x="1" y="100" width="278" height="22" rx="4" fill="#C3C8CE" />
      <text x="12" y="30" fontFamily={SANS} fontSize="7.5" fontWeight="700" fill="#2E7D4F">Schneider</text>
      <text x="62" y="30" fontFamily={SANS} fontSize="8" fontWeight="700" fill="#3A4047">ACTIONNEUR DE COMMUTATION 8 × 16 A</text>
      <text x="62" y="40" fontFamily={MONO} fontSize="6.5" fill="#66717F">MTN647893 · REG-K/8x230/16</text>
      <text x="268" y="30" textAnchor="end" fontFamily={SANS} fontSize="7" fontWeight="800" fill="#3A4047">KNX</text>
      {/* commande manuelle : un basculeur et une LED d'état par voie */}
      {Array.from({ length: 8 }, (_, i) => {
        const cx = (bx(2 * i) + bx(2 * i + 1)) / 2;
        return (
          <g key={i}>
            <rect x={cx - 9} y="52" width="18" height="24" rx="2.5" fill="#20262D" />
            <rect x={cx - 6.5} y="55" width="13" height="10" rx="1.5" fill="#3FA65C" />
            <circle cx={cx} cy="71" r="2.3" fill="#3DFF7A" />
            <text x={cx} y="86" textAnchor="middle" fontFamily={MONO} fontSize="7" fontWeight="700" fill="#3A4047">{i + 1}</text>
          </g>
        );
      })}
      {/* sérigraphie des bornes : L et n de chaque voie, comme sur l'appareil */}
      {Array.from({ length: 16 }, (_, k) => (
        <g key={k}>
          <rect x={bx(k) - 5.5} y="110" width="11" height="8" rx="1.5" fill="#3A4047" />
          <text x={bx(k)} y="106.5" textAnchor="middle" fontFamily={MONO} fontSize="5.2" fill="#3A4047">
            {k % 2 === 0 ? 'L' : String(k / 2 + 0.5)}
          </text>
        </g>
      ))}
      {[4, 8, 12].map((k) => (
        <line key={k} x1={bx(k) - PAS / 2} y1="101" x2={bx(k) - PAS / 2} y2="121" stroke="#8F979F" strokeWidth=".6" />
      ))}
      <text x="263" y="106" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#3A4047">BUS</text>
      <BusConn x={248} y={108} w={30} h={13} />
    </svg>
  );
}

/** Interface IP/KNX REG-K (MTN6502-0105) : accès au bus depuis le réseau local. */
export function KnxIpSvg() {
  return (
    <svg viewBox="0 0 52 123" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="50" height="121" rx="4" fill="#F4F5F7" stroke="#6E7780" />
      <rect x="1" y="1" width="50" height="16" rx="4" fill="#C3C8CE" />
      <rect x="10" y="110" width="32" height="4" fill="#2E7D4F" />
      <text x="26" y="34" textAnchor="middle" fontFamily={SANS} fontSize="6" fontWeight="700" fill="#3A4047">INTERFACE</text>
      <text x="26" y="43" textAnchor="middle" fontFamily={SANS} fontSize="6" fontWeight="700" fill="#3A4047">IP</text>
      {/* prise RJ45, face avant : 8 petits contacts */}
      <rect x="13" y="54" width="26" height="20" rx="1.5" fill="#20262D" />
      <rect x="16" y="58" width="20" height="10" fill="#4A5058" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={17.2 + i * 2.3} y="58" width="1.4" height="4" fill="#C3C8CE" />
      ))}
      <circle cx="26" cy="86" r="3" fill="#3DFF7A" />
      <text x="26" y="101" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#66717F">MTN6502-0105</text>
      {/* connecteur de bus en haut : c'est lui, et non le 230 V, qui l'alimente */}
      <BusConn x={7} y={2} w={38} h={13} />
    </svg>
  );
}

/**
 * Détecteur de présence et de luminosité (MTN630860, boîte saillie MTN550619), posé en
 * annexe au mur ou au plafond du local. La lentille dôme signale la détection de
 * mouvement ; le petit disque clair, la cellule de mesure de luminosité — c'est elle qui
 * distingue ce détecteur d'un simple détecteur de présence, et qui rend l'essai « il fait
 * jour, rien ne s'allume » possible.
 */
export function KnxDetSvg() {
  return (
    <svg viewBox="0 0 48 48" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="46" height="46" rx="6" fill="#FAFAFA" stroke="#B9BEC4" />
      <circle cx="20" cy="20" r="13" fill="#EDEFF2" stroke="#B9BEC4" />
      <circle cx="20" cy="20" r="8.5" fill="#DDE6EC" stroke="#8FA6B3" strokeWidth="1" />
      <circle cx="20" cy="20" r="4.5" fill="#B9D6E8" opacity="0.8" />
      {/* petite cellule de luminosité, en haut à droite du corps */}
      <circle cx="33" cy="10" r="4.4" fill="#FFF6C9" stroke="#B39500" strokeWidth="1" />
      {/* connecteur de bus AU DOS, aux hauteurs des bornes X1 (+) et X2 (−) */}
      <g>
        <rect x="39" y="12" width="8" height="10" rx="1.3" fill="#C62828" stroke="#8E1B16" strokeWidth=".6" />
        <circle cx="43" cy="15" r="1.1" fill="#4A100E" /><circle cx="43" cy="19" r="1.1" fill="#4A100E" />
        <rect x="39" y="30" width="8" height="10" rx="1.3" fill="#26292E" stroke="#111" strokeWidth=".6" />
        <circle cx="43" cy="33" r="1.1" fill="#000" /><circle cx="43" cy="37" r="1.1" fill="#000" />
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
      {/* Pas de sol ici : c'est le BLOC « ensemble terre » qui porte la ligne de sol
          et la hachure. Un appareil ne dessine pas le terrain dans lequel il est posé. */}
      <rect x="9.5" y="4" width="7" height="80" rx="2" fill="#B87333" stroke="#8A5A26" strokeWidth=".8" />
      <path d="M9.5 84l3.5 8 3.5-8z" fill="#8A5A26" />
      {/* cosse de raccordement du conducteur de terre, en tête */}
      <rect x="6" y="0" width="14" height="6" rx="2" fill="#DDE1E5" stroke="#7E858C" strokeWidth=".8" />
    </svg>
  );
}


/** Feu orange clignotant de portail sur sa base (vue de face). */
export function FeuOrangeSvg() {
  return (
    <svg viewBox="0 0 36 84" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="10" y="40" width="16" height="42" rx="2" fill="#8C96A3" stroke="#5B6573" strokeWidth=".8" />
      <rect x="6" y="30" width="24" height="12" rx="3" fill="#2B2F36" />
      <path d="M8 30 Q8 6 18 6 Q28 6 28 30 Z" fill="#FF9D00" stroke="#B36B00" strokeWidth="1" />
      <path d="M12 26 Q12 12 18 11" fill="none" stroke="#FFE0A3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Lecteur de badge RFID sur son poteau. */
export function LecteurRfidSvg() {
  return (
    <svg viewBox="0 0 36 64" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="15" y="34" width="6" height="30" fill="#8C96A3" />
      <rect x="5" y="4" width="26" height="34" rx="4" fill="#1B222C" stroke="#0B0F14" />
      <circle cx="18" cy="18" r="7" fill="none" stroke="#6FD3FF" strokeWidth="1.6" />
      <circle cx="18" cy="18" r="3.5" fill="none" stroke="#6FD3FF" strokeWidth="1.2" />
      <circle cx="18" cy="31" r="1.8" fill="#35E36A" />
    </svg>
  );
}

/** Cellule photoélectrique reflex et son câble 3 fils. */
export function CelluleSvg() {
  return (
    <svg viewBox="0 0 40 56" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <path d="M8 2 V14 M20 2 V14 M32 2 V14" stroke="#8B4A2B" strokeWidth="0" />
      <path d="M8 0 V12" stroke="#8B4A2B" strokeWidth="2" /><path d="M20 0 V12" stroke="#2C7BE5" strokeWidth="2" /><path d="M32 0 V12" stroke="#20262D" strokeWidth="2" />
      <rect x="4" y="12" width="32" height="10" rx="3" fill="#5B6573" />
      <rect x="6" y="22" width="28" height="30" rx="3" fill="#DDE3EA" stroke="#7E858C" />
      <circle cx="20" cy="37" r="8" fill="#2F6FD1" stroke="#1B3F7A" />
      <circle cx="20" cy="37" r="3" fill="#BFD9FF" />
      <circle cx="30" cy="27" r="1.6" fill="#FF9D00" />
    </svg>
  );
}

/** Barre palpeuse (profil caoutchouc jaune et noir) en bout de portail. */
export function BarrePalpeuseSvg() {
  return (
    <svg viewBox="0 0 30 92" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="8" y="6" width="14" height="84" rx="6" fill="#20262D" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x="8" y={10 + i * 14} width="14" height="7" fill="#F2C94C" />)}
      <rect x="11" y="0" width="8" height="8" rx="1" fill="#5B6573" />
    </svg>
  );
}

/**
 * Alimentation à découpage WAGO 787-1012 (DTR 40) : boîtier gris clair, entrée L / N en
 * haut, sortie + / − en bas, voyant « DC OK ». Le repère de slot se pose au centre.
 */
export function Alim24dcSvg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 104 129" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4F5F6" /><stop offset="1" stopColor="#D5D9DE" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="102" height="127" rx="4" fill={`url(#${gid})`} stroke="#6E7780" />
      <rect x="1" y="1" width="102" height="17" rx="4" fill="#C3C8CE" />
      <rect x="1" y="111" width="102" height="17" rx="4" fill="#C3C8CE" />
      <g fill="#E39A00"><rect x="25" y="5" width="12" height="9" rx="1.5" /><rect x="46" y="5" width="12" height="9" rx="1.5" /></g>
      <text x="31" y="24" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fill="#3A4047">L</text>
      <text x="52" y="24" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fill="#3A4047">N</text>
      <text x="52" y="34" textAnchor="middle" fontFamily={SANS} fontSize="8.5" fontWeight="800" fill="#6CB33F">WAGO</text>
      <text x="52" y="44" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#66717F">787-1012</text>
      <text x="52" y="84" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#3A4047">IN 100-240 V~</text>
      <text x="52" y="93" textAnchor="middle" fontFamily={MONO} fontSize="6.5" fontWeight="700" fill="#3A4047">OUT 24 V⎓ 2,5 A</text>
      <circle cx="84" cy="44" r="3" fill="#3DFF7A" /><text x="84" y="53" textAnchor="middle" fontFamily={MONO} fontSize="4.5" fill="#66717F">DC OK</text>
      <rect x="25" y="115" width="12" height="9" rx="1.5" fill="#D93A3A" />
      <rect x="67" y="115" width="12" height="9" rx="1.5" fill="#2C7BE5" />
      <text x="31" y="108" textAnchor="middle" fontFamily={MONO} fontSize="6" fontWeight="700" fill="#D93A3A">+</text>
      <text x="73" y="108" textAnchor="middle" fontFamily={MONO} fontSize="6" fontWeight="700" fill="#2C7BE5">−</text>
    </svg>
  );
}

/** Contact auxiliaire frontal GV-AE1 : petit bloc noir, bornes 13 en haut et 14 en bas. */
export function Gvae1Svg() {
  return (
    <svg viewBox="0 0 22 90" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="20" height="88" rx="3" fill="#2B2F36" stroke="#15181C" />
      <rect x="5" y="3" width="12" height="9" rx="1.5" fill="#8E969E" />
      <rect x="5" y="78" width="12" height="9" rx="1.5" fill="#8E969E" />
      <text x="11" y="21" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fill="#DDE3EA">13</text>
      <text x="11" y="74" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fill="#DDE3EA">14</text>
      <text x="11" y="46" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#9FD" transform="rotate(-90 11 46)">GV-AE1 · NO</text>
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
    case 'dcswitchbat': return <DcModSvg kind="swbat" />;
    case 'dcfusebat': return <DcModSvg kind="fusebat" />;
    case 'imeon912': return <Imeon912Svg running={running} />;
    case 'us2000c': return <Us2000cSvg />;
    case 'jbstring': return <JbStringSvg />;
    case 'pvmodule': return <PvModulePortraitSvg />;
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
    case 'knxact8': return <KnxAct8Svg />;
    case 'knxip': return <KnxIpSvg />;
    case 'knxdet': return <KnxDetSvg />;
    case 'barrcoupure': return <BarrCoupureSvg />;
    case 'piquet': return <PiquetSvg />;
    case 'feuorange': return <FeuOrangeSvg />;
    case 'lecteurrfid': return <LecteurRfidSvg />;
    case 'cellule': return <CelluleSvg />;
    case 'barrepalpeuse': return <BarrePalpeuseSvg />;
    case 'alim24dc': return <Alim24dcSvg />;
    case 'gvae1': return <Gvae1Svg />;
    case 'gk1es': return <Gk1Svg />;
    case 'lc1d50': return <Lc1D50Svg />;
    case 'lrd3357': return <Lrd3357Svg />;
    case 'cad32': return <Cad32Svg />;
    case 't4planete': return <TableauT4Svg />; // chevrerie-a4-ssi
    case 'dmmds3000': return <DmS3000Svg />; // chevrerie-a4-ssi
    case 'dmbges3000': return <DmS3000Svg etanche />; // chevrerie-a4-ssi
    case 'diffsonore': return <DiffuseurSonoreSvg />; // chevrerie-a4-ssi
    case 'rfl39k': return <ResistanceFdlSvg />; // chevrerie-a4-ssi
    case 'ion20eu': return <CentraleIon20Svg />; // chevrerie-b4
    case 'ikp01': return <ClavierIkp01Svg />; // chevrerie-b4
    case 'simax': return <SireneSimaxSvg />; // chevrerie-b4
    case 'sca00001': return <BatterieCentraleSvg raccordee={running} />; // chevrerie-b4
    case 'xcelwpt': return <DetecteurIrSvg />; // chevrerie-b4
    case 'fr400': return <ContactMagSvg />; // chevrerie-b4
    case 'reol4k7': return <ResistanceEolSvg bandes={['#F2C200', '#7B3FA0', '#D12B2B']} />; // chevrerie-b4
    case 'reol2k2': return <ResistanceEolSvg bandes={['#D12B2B', '#D12B2B', '#D12B2B']} />; // chevrerie-b4
    case 'eolienne': return <EolienneSvg />; // chevrerie-e222
    case 'wbpbox': return <WbpBoxSvg />; // chevrerie-e222
    case 'windyboy': return <WindyBoySvg />; // chevrerie-e222
    case 'bw155': return <Bw155Svg />; // chevrerie-e222
    case 'isw4p': return <Isw4pSvg on={running} />; // chevrerie-e222
    case 'dx3diff32f': return <Dx3Diff32FSvg on={running} />; // chevrerie-e222
    case 'repart4p': return <Repart4pSvg />; // chevrerie-e222
    case 'pfac3pn': return <PfAc3pnSvg />; // chevrerie-e222
    case 'barrterre': return <BarrTerreSvg />; // chevrerie-e222
    case 'akiapu2m': return <AkiaPu2mSvg />; // chevrerie-g5
    case 'gsm800': return <Gsm800Svg />; // chevrerie-g5
    case 'celrx': return <CelluleEmaSvg recepteur />; // chevrerie-g5
    case 'celtx': return <CelluleEmaSvg recepteur={false} />; // chevrerie-g5
    case 'febolight': return <FeboLightSvg />; // chevrerie-g5
    case 'motstar24': return <MotStar24Svg />; // chevrerie-g5
    default: return null;
  }
}

/* ═══ chevrerie-g5 : début ═══ */

/**
 * Carte de gestion AKIA PU2M du boîtier STAR 24 (DTR 45, « schéma de la carte ») : circuit
 * vert, potentiomètres, boutons BP1 / BP2, voyants L1 à L6, relais ; barrette verte 1 à 19 en
 * bas, borniers moteur 1 (20 −, 21 +) et moteur 2 (22 −, 23 +) à droite ; arrivée secteur du
 * boîtier (L, N) en haut à gauche. Positions des bornes : voir `akiapu2m` au catalogue.
 */
export function AkiaPu2mSvg() {
  const pas = 12.6;
  const bx = (i: number) => 14 + i * pas;
  return (
    <svg viewBox="0 0 340 176" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="338" height="174" rx="4" fill="#2F7D3B" stroke="#1D5227" />
      {/* arrivée secteur du boîtier */}
      <rect x="8" y="4" width="28" height="12" rx="1.5" fill="#D5D9DE" stroke="#6E7780" />
      <circle cx="16" cy="14" r="2.6" fill="#8E969E" /><circle cx="30" cy="14" r="2.6" fill="#8E969E" />
      <text x="16" y="24" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#E8F5EA">L</text>
      <text x="30" y="24" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#E8F5EA">N</text>
      <text x="42" y="12" fontFamily={MONO} fontSize="5.5" fill="#E8F5EA">230 V~ · transfo. et batteries</text>
      {/* potentiomètres, boutons de programmation */}
      {[46, 70].map((y, i) => (
        <g key={y}>
          <circle cx="24" cy={y} r="7" fill="#20262D" /><circle cx="24" cy={y} r="3" fill="#C9CED4" />
          <text x="35" y={y + 2} fontFamily={MONO} fontSize="6" fill="#E8F5EA">Pot.{i + 1}</text>
        </g>
      ))}
      {[['BP1', 78], ['BP2', 108]].map(([t, x]) => (
        <g key={t as string}>
          <rect x={(x as number) - 7} y="36" width="14" height="14" rx="1.5" fill="#B8BEC5" stroke="#5B6573" />
          <circle cx={x as number} cy="43" r="3.6" fill="#20262D" />
          <text x={x as number} y="32" textAnchor="middle" fontFamily={MONO} fontSize="6" fontWeight="700" fill="#E8F5EA">{t}</text>
        </g>
      ))}
      {/* voyants L1 à L6 */}
      {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((t, i) => (
        <g key={t}>
          <rect x={60 + i * 16} y="68" width="6" height="9" rx="1" fill={i === 0 ? '#FFD34D' : '#E8ECEF'} stroke="#5B6573" strokeWidth=".6" />
          <text x={63 + i * 16} y="86" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fill="#E8F5EA">{t}</text>
        </g>
      ))}
      {/* relais de commande et relais des moteurs */}
      <rect x="160" y="18" width="44" height="30" rx="2" fill="#20262D" />
      <text x="182" y="36" textAnchor="middle" fontFamily={MONO} fontSize="7" fill="#C9CED4">12 V</text>
      <rect x="160" y="54" width="20" height="34" rx="2" fill="#2F6FD1" /><rect x="184" y="54" width="20" height="34" rx="2" fill="#2F6FD1" />
      <rect x="248" y="8" width="40" height="80" rx="3" fill="#C9CED4" opacity=".85" stroke="#5B6573" />
      <rect x="292" y="8" width="40" height="80" rx="3" fill="#C9CED4" opacity=".85" stroke="#5B6573" />
      <text x="170" y="112" textAnchor="middle" fontFamily={COND} fontSize="11" fontWeight="700" fill="#E8F5EA">AKIA PU2M</text>
      {/* borniers moteurs */}
      {[[262, 276, 'Moteur 1', '20', '21'], [304, 318, 'Moteur 2', '22', '23']].map(([a, b, t, na, nb]) => (
        <g key={t as string}>
          <rect x={(a as number) - 7} y="120" width="28" height="22" rx="1.5" fill="#3E9A4B" stroke="#1D5227" />
          <circle cx={a as number} cy="134" r="3" fill="#8E969E" /><circle cx={b as number} cy="134" r="3" fill="#8E969E" />
          <text x={a as number} y="116" textAnchor="middle" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#E8F5EA">{na}−</text>
          <text x={b as number} y="116" textAnchor="middle" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#E8F5EA">{nb}+</text>
          <text x={((a as number) + (b as number)) / 2} y="152" textAnchor="middle" fontFamily={MONO} fontSize="6" fill="#E8F5EA">{t}</text>
        </g>
      ))}
      {/* barrette verte 1 à 19 */}
      <rect x="6" y="148" width={pas * 19 + 2} height="20" rx="2" fill="#3E9A4B" stroke="#1D5227" />
      {Array.from({ length: 19 }, (_, i) => (
        <g key={i}>
          <rect x={bx(i) - 4.5} y="152" width="9" height="12" rx="1" fill="#20262D" />
          <circle cx={bx(i)} cy="158.4" r="2.6" fill="#8E969E" />
          <text x={bx(i)} y="144" textAnchor="middle" fontFamily={MONO} fontSize="6" fontWeight="700" fill="#FFFFFF">{i + 1}</text>
        </g>
      ))}
      <text x={bx(5)} y="174" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#E8F5EA">commun + 12 V (4, 8)</text>
      <text x={bx(15)} y="174" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#E8F5EA">0 V (13, 17, 19)</text>
    </svg>
  );
}

/**
 * Récepteur GSM 2 sorties sur rail DIN (DTR 48) : alimentation L N, Sortie 1 (NC C NA),
 * Sortie 2 (NA C NC) en haut ; LED GSM, bouton P1, tiroir SIM ; entrées C IN1 IN2 en bas.
 */
export function Gsm800Svg() {
  const haut: [string, number][] = [['L', 0.1], ['N', 0.19], ['NC', 0.42], ['C', 0.51], ['NA', 0.6], ['NA', 0.72], ['C', 0.81], ['NC', 0.9]];
  const bas: [string, number][] = [['C', 0.12], ['IN1', 0.21], ['IN2', 0.3]];
  return (
    <svg viewBox="0 0 104 123" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="102" height="121" rx="3" fill="#F2F3F4" stroke="#6E7780" />
      <rect x="1" y="1" width="102" height="24" rx="3" fill="#E2E5E8" />
      <rect x="1" y="98" width="102" height="24" rx="3" fill="#E2E5E8" />
      {haut.map(([t, fx], i) => (
        <g key={i}>
          <rect x={fx * 104 - 4.5} y="3" width="9" height="11" rx="1" fill="#C9CED4" stroke="#6E7780" strokeWidth=".6" />
          <circle cx={fx * 104} cy="8.6" r="2.6" fill="#8E969E" />
          <text x={fx * 104} y="20" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fontWeight="700" fill="#3A4047">{t}</text>
        </g>
      ))}
      <text x={0.51 * 104} y="30" textAnchor="middle" fontFamily={SANS} fontSize="5.5" fontWeight="700" fill="#3A4047">Sortie 1</text>
      <text x={0.81 * 104} y="30" textAnchor="middle" fontFamily={SANS} fontSize="5.5" fontWeight="700" fill="#3A4047">Sortie 2</text>
      <text x={0.145 * 104} y="30" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fill="#66717F">230 V~</text>
      <rect x="10" y="36" width="84" height="56" rx="2" fill="#FFFFFF" stroke="#8E969E" />
      <circle cx="20" cy="46" r="3" fill="#D93A3A" /><text x="26" y="48" fontFamily={MONO} fontSize="4.6" fill="#66717F">GSM</text>
      <circle cx="58" cy="46" r="4" fill="#DDE1E5" stroke="#6E7780" /><text x="66" y="48" fontFamily={MONO} fontSize="4.6" fill="#66717F">P1</text>
      <path d="M38 58 H70 V84 H44 L38 78 Z" fill="#F7F8F9" stroke="#6E7780" strokeWidth=".8" />
      <text x="54" y="74" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#66717F">SIM</text>
      <text x="52" y="96" textAnchor="middle" fontFamily={COND} fontSize="7" fontWeight="700" fill="#3A4047">GSM800</text>
      {bas.map(([t, fx]) => (
        <g key={t}>
          <rect x={fx * 104 - 4.5} y="109" width="9" height="11" rx="1" fill="#C9CED4" stroke="#6E7780" strokeWidth=".6" />
          <circle cx={fx * 104} cy="114.4" r="2.6" fill="#8E969E" />
          <text x={fx * 104} y="106" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fontWeight="700" fill="#3A4047">{t}</text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Cellule infrarouge EMA-15L (DTR 46), capot retiré : boîtier ovale noir, carte rouge,
 * lentille. Récepteur R : bornier − + COM OUT ; émetteur T : bornes 1 (−) et 2 (+).
 */
export function CelluleEmaSvg({ recepteur }: { recepteur: boolean }) {
  const bornes: [string, number][] = recepteur
    ? [['−', 0.25], ['+', 0.42], ['COM', 0.59], ['OUT', 0.76]]
    : [['1 −', 0.42], ['2 +', 0.58]];
  const x0 = bornes[0][1] * 71 - 6;
  const x1 = bornes[bornes.length - 1][1] * 71 + 6;
  return (
    <svg viewBox="0 0 71 110" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <ellipse cx="35.5" cy="55" rx="34" ry="53" fill="#15181C" />
      <ellipse cx="35.5" cy="55" rx="28" ry="46" fill="#2B2F36" />
      <circle cx="35.5" cy="8" r="3" fill="#0B0D10" /><circle cx="35.5" cy="102" r="4" fill="#0B0D10" />
      <rect x="11" y="18" width="49" height="72" rx="8" fill="#C8322B" stroke="#7E1A15" />
      <circle cx="35.5" cy="44" r="12" fill="#101216" /><circle cx="31" cy="40" r="3" fill="#4A515A" />
      {recepteur && <rect x="48" y="30" width="9" height="14" rx="1" fill="#20262D" />}
      <text x="16" y="28" fontFamily={COND} fontSize="8" fontWeight="700" fill="#FFE3E0">{recepteur ? 'R' : 'T'}</text>
      <rect x={x0} y="75" width={x1 - x0} height="13" rx="1.5" fill="#2F6FD1" stroke="#1B3F7A" />
      {bornes.map(([t, fx]) => (
        <g key={t}>
          <circle cx={fx * 71} cy="81.4" r="3" fill="#C9CED4" stroke="#5B6573" strokeWidth=".6" />
          <text x={fx * 71} y="95" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fontWeight="700" fill="#FFFFFF">{t}</text>
        </g>
      ))}
      <text x="35.5" y="67" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fill="#FFE3E0">12-24 V AC/DC</text>
    </svg>
  );
}

/**
 * Lampe flash FEBO-LIGHT (DTR 47) vue sur sa face étroite, capot ouvert : dôme, embase noire,
 * carte d'alimentation avec les bornes 1-2 (230 V~) et 3-4-5 (12 / 24 V) et le cavalier JP1.
 */
export function FeboLightSvg() {
  const bornes: [string, number][] = [['1', 0.17], ['2', 0.29], ['3', 0.5], ['4', 0.63], ['5', 0.76]];
  return (
    <svg viewBox="0 0 112 247" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <path d="M14 112 Q10 8 56 4 Q102 8 98 112 Z" fill="#FFD9A0" stroke="#B36B00" strokeWidth="1.2" opacity=".95" />
      <path d="M26 100 Q24 26 50 16" fill="none" stroke="#FFF3DD" strokeWidth="3" strokeLinecap="round" />
      <rect x="44" y="30" width="24" height="76" rx="3" fill="#E6E9EC" stroke="#8E969E" />
      {Array.from({ length: 6 }, (_, i) => <circle key={i} cx="56" cy={38 + i * 12} r="3" fill="#FFFFFF" stroke="#B8BEC5" />)}
      <rect x="4" y="110" width="104" height="133" rx="6" fill="#20262D" />
      <rect x="10" y="150" width="92" height="84" rx="3" fill="#C9D6A3" stroke="#6E7A4C" />
      <rect x="14" y="156" width="30" height="16" rx="2" fill="#F2D675" stroke="#9C8A3A" />
      <text x="29" y="167" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#5A4F1E">230 V</text>
      {/* cavalier JP1 : 3 broches, fixe / clignotant */}
      <g>
        {[62, 70, 78].map((x) => <circle key={x} cx={x} cy="164" r="1.6" fill="#20262D" />)}
        <rect x="59" y="160" width="14" height="8" rx="1" fill="none" stroke="#20262D" strokeWidth="1.2" />
        <text x="70" y="178" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#3A4047">JP1</text>
      </g>
      <circle cx="92" cy="170" r="6" fill="#20262D" />
      {/* borniers : 1-2 (230 V~), 3-4-5 (12 / 24 V) */}
      <rect x="12" y="206" width="27" height="17" rx="1.5" fill="#3E9A4B" stroke="#1D5227" />
      <rect x="49" y="206" width="43" height="17" rx="1.5" fill="#3E9A4B" stroke="#1D5227" />
      {bornes.map(([t, fx]) => (
        <g key={t}>
          <circle cx={fx * 112} cy="214.9" r="3.2" fill="#C9CED4" stroke="#5B6573" strokeWidth=".6" />
          <text x={fx * 112} y="202" textAnchor="middle" fontFamily={MONO} fontSize="6" fontWeight="700" fill="#20262D">{t}</text>
        </g>
      ))}
      <text x="56" y="232" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fill="#3A4047">3-4 : 12 V · 3-5 : 24 V</text>
      <text x="56" y="128" textAnchor="middle" fontFamily={COND} fontSize="9" fontWeight="700" fill="#C9CED4">FEBO-LIGHT</text>
      <text x="56" y="140" textAnchor="middle" fontFamily={MONO} fontSize="4.8" fill="#8E969E">12 / 24 V AC/DC · 230 V~</text>
    </svg>
  );
}

/**
 * Motoréducteur 24 V⎓ à roue du kit STAR 24 : moteur, réducteur et roue d'entraînement ;
 * les deux fils de puissance, rouge et bleu, sortent à gauche.
 */
export function MotStar24Svg() {
  return (
    <svg viewBox="0 0 110 100" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <path d="M7 20 H30" stroke="#D93A3A" strokeWidth="2.4" /><path d="M7 32 H30" stroke="#2C7BE5" strokeWidth="2.4" />
      <circle cx="7" cy="20" r="2.4" fill="#D93A3A" /><circle cx="7" cy="32" r="2.4" fill="#2C7BE5" />
      <text x="12" y="16" fontFamily={MONO} fontSize="5" fill="#3A4047">rouge</text>
      <text x="12" y="41" fontFamily={MONO} fontSize="5" fill="#3A4047">bleu</text>
      <rect x="28" y="10" width="10" height="56" rx="1" fill="#8E969E" stroke="#5B6573" />
      <rect x="38" y="16" width="30" height="40" rx="3" fill="#B8BEC5" stroke="#5B6573" />
      <rect x="66" y="8" width="38" height="24" rx="8" fill="#C9CED4" stroke="#5B6573" />
      <rect x="100" y="14" width="6" height="12" rx="1" fill="#5B6573" />
      <circle cx="56" cy="72" r="25" fill="#5B6168" stroke="#2B2F36" strokeWidth="2" />
      <circle cx="56" cy="72" r="15" fill="#8E969E" /><circle cx="56" cy="72" r="4" fill="#2B2F36" />
      <text x="84" y="50" textAnchor="middle" fontFamily={MONO} fontSize="6" fontWeight="700" fill="#3A4047">24 V⎓</text>
    </svg>
  );
}

/* ═══ chevrerie-g5 : fin ═══ */

/* ═══ chevrerie-e222 : début ═══ */
/*
 * Installation éolienne raccordée au réseau (sujet « Chèvrerie », E.2.2.2) : dessins d'après
 * les notices du DTR (28 à 32). Chaque viewBox a la taille du sprite en unités de platine, pour
 * que les bornes dessinées tombent sur les fractions déclarées au catalogue.
 */

/** Vis de borne (tête fendue), centrée en (x, y). */
function VisE222({ x, y, r = 4.5 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#B8BEC5" stroke="#4E555C" strokeWidth="0.8" />
      <path d={`M${x - r * 0.65} ${y + r * 0.65}L${x + r * 0.65} ${y - r * 0.65}`} stroke="#4E555C" strokeWidth="1" />
    </g>
  );
}

/**
 * Petite éolienne ANTARIS 3,5 kW (DTR 28), 104 × 200 : mât, nacelle, rotor tripale, et au
 * pied l'interrupteur de freinage (court-circuit) d'où sortent les trois conducteurs
 * L1 L2 L3 (bornes au bord droit, 62 / 72 / 82 % de la hauteur). Hors échelle, assumé.
 */
export function EolienneSvg() {
  const gid = React.useId();
  const bornes = [124, 144, 164];
  return (
    <svg viewBox="0 0 104 200" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9AA3AC" /><stop offset=".5" stopColor="#E3E7EB" /><stop offset="1" stopColor="#9AA3AC" />
        </linearGradient>
      </defs>
      {/* mât (12 m) */}
      <path d="M33 58 L37 58 L39 196 L31 196 Z" fill={`url(#${gid})`} stroke="#6E7780" strokeWidth=".6" />
      <rect x="22" y="194" width="26" height="5" rx="1" fill="#8E969E" />
      {/* nacelle + dérive */}
      <path d="M26 50 h22 l4 5 l-4 5 h-22 z" fill="#E9ECEF" stroke="#5E656D" strokeWidth=".8" />
      <path d="M48 55 L66 46 L68 50 L52 57 Z" fill="#D5DAE0" stroke="#5E656D" strokeWidth=".6" />
      {/* rotor tripale (Ø 3,5 m) */}
      <g fill="#F6F7F8" stroke="#5E656D" strokeWidth=".8">
        <path d="M26 55 C 24 36, 22 18, 21 6 C 25 18, 29 38, 28 55 Z" />
        <path d="M26 55 C 12 62, 4 70, 2 76 C 8 72, 18 66, 28 58 Z" />
        <path d="M26 55 C 36 64, 46 74, 50 80 C 44 76, 32 66, 25 58 Z" />
      </g>
      <g fill="#D93A3A"><path d="M21 6 l1 7 l2 -1 z" /><path d="M2 76 l6 -3 l-1 2 z" /><path d="M50 80 l-5 -4 l2 -1 z" /></g>
      <circle cx="26" cy="56" r="3.5" fill="#C9CED4" stroke="#4E555C" />
      {/* conducteurs vers l'interrupteur de freinage */}
      <g stroke="#2C7BE5" strokeWidth="2" fill="none">
        {bornes.map((y, i) => <path key={y} d={`M${37 + i * 0.6} ${y - 6} C 44 ${y - 6}, 48 ${y}, 56 ${y}`} />)}
      </g>
      <rect x="56" y="112" width="46" height="64" rx="3" fill="#EEF0F2" stroke="#5E656D" />
      <text x="79" y="109" textAnchor="middle" fontFamily={SANS} fontSize="5.2" fontWeight="700" fill="#3A4047">FREIN</text>
      {bornes.map((y) => (
        <g key={y}>
          <circle cx="62" cy={y} r="2" fill="#3A4047" />
          <path d={`M62 ${y} L74 ${y - 5}`} stroke="#3A4047" strokeWidth="1.4" />
          <circle cx="78" cy={y} r="2" fill="#3A4047" />
          <path d={`M78 ${y}H100`} stroke="#3A4047" strokeWidth="1.2" />
        </g>
      ))}
      <g fontFamily={MONO} fontSize="5.5" fontWeight="700" fill="#141A21">
        {['L1', 'L2', 'L3'].map((t, i) => <text key={t} x="86" y={bornes[i] - 2.5}>{t}</text>)}
      </g>
      <text x="4" y="104" fontFamily={COND} fontSize="8" fontWeight="700" fill="#3A4047">ANTARIS</text>
      <text x="4" y="112" fontFamily={MONO} fontSize="5.5" fill="#66717F">3,5 kW · 350 V~</text>
    </svg>
  );
}

/**
 * Windy Boy Protection Box 600-11 (DTR 29, vue intérieure), 350 × 150 : couvercle du
 * redresseur et de la protection contre les surtensions en haut, rangée de bornes A à E en
 * bas (bornes à 86 % de la hauteur) : L1 L2 L3 « Alternator », DC+, DC−, LR+ LR−, PE.
 */
export function WbpBoxSvg() {
  const gid = React.useId();
  const y = 129;
  const blocs: { x0: number; x1: number; label: string; bornes: number[] }[] = [
    { x0: 12, x1: 72, label: 'Alternator', bornes: [0.07, 0.12, 0.17] },
    { x0: 82, x1: 142, label: 'DC+', bornes: [0.27, 0.32, 0.37] },
    { x0: 152, x1: 212, label: 'DC−', bornes: [0.47, 0.52, 0.57] },
    { x0: 236, x1: 272, label: 'LR+ LR−', bornes: [0.7, 0.75] },
    { x0: 285, x1: 340, label: 'PE', bornes: [0.84, 0.89, 0.94] },
  ];
  return (
    <svg viewBox="0 0 350 150" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9DDE1" /><stop offset="1" stopColor="#B7BDC4" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="348" height="148" rx="6" fill={`url(#${gid})`} stroke="#5E656D" strokeWidth="1.2" />
      {/* platine interne et couvercle de l'électronique */}
      <rect x="8" y="6" width="334" height="92" rx="3" fill="#8E969E" opacity=".35" />
      <rect x="112" y="12" width="126" height="54" rx="5" fill="#2B2F36" />
      <text x="175" y="30" textAnchor="middle" fontFamily={SANS} fontSize="8" fontWeight="700" fill="#E8ECEF">Windy Boy Protection Box</text>
      <text x="175" y="42" textAnchor="middle" fontFamily={MONO} fontSize="6.5" fill="#B9C2CA">WBP-Box 600-11 · redresseur B6</text>
      <text x="175" y="54" textAnchor="middle" fontFamily={MONO} fontSize="6.5" fill="#FFB84D">limitation à 560 V⎓</text>
      <g fill="#F4F5F7" stroke="#6E7780" strokeWidth=".6">
        <rect x="14" y="12" width="40" height="14" rx="1" /><rect x="14" y="30" width="40" height="14" rx="1" />
        <rect x="296" y="12" width="40" height="14" rx="1" /><rect x="296" y="30" width="40" height="14" rx="1" />
      </g>
      <text x="316" y="58" textAnchor="middle" fontFamily={SANS} fontSize="6" fontWeight="700" fill="#3A4047">SMA</text>
      {blocs.map((b) => (
        <g key={b.label}>
          <rect x={b.x0} y="100" width={b.x1 - b.x0} height="44" rx="2" fill="#E8EBEE" stroke="#4E555C" strokeWidth=".8" />
          <text x={(b.x0 + b.x1) / 2} y="112" textAnchor="middle" fontFamily={MONO} fontSize="6" fontWeight="700" fill="#141A21">{b.label}</text>
          {b.bornes.map((fx) => <VisE222 key={fx} x={fx * 350} y={y} />)}
        </g>
      ))}
      <g fontFamily={COND} fontSize="8" fontWeight="700" fill="#3A4047">
        <text x="6" y="96">A</text><text x="84" y="96">B</text><text x="154" y="96">C</text><text x="238" y="96">D</text><text x="287" y="96">E</text>
      </g>
    </svg>
  );
}

/**
 * Onduleur Windy Boy 5000A (DTR 30), zone de raccordement, 110 × 150 : écran texte en haut
 * (l'afficheur du mode câblage réel s'y pose), connecteurs SUNCLIX + / − et bornes AC N L PE
 * en bas (90 % de la hauteur).
 */
export function WindyBoySvg() {
  const gid = React.useId();
  return (
    <svg viewBox="0 0 110 150" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A5058" /><stop offset="1" stopColor="#2B2F36" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="108" height="148" rx="7" fill={`url(#${gid})`} stroke="#15181C" />
      <rect x="10" y="12" width="90" height="38" rx="3" fill="#C9CED4" />
      <rect x="13" y="15" width="84" height="32" rx="2" fill="#1B2A22" />
      <circle cx="100" cy="58" r="2.2" fill="#3DFF7A" /><circle cx="100" cy="65" r="2.2" fill="#555" /><circle cx="100" cy="72" r="2.2" fill="#555" />
      <text x="8" y="62" fontFamily={SANS} fontSize="7.5" fontWeight="700" fill="#E8ECEF">Windy Boy</text>
      <text x="8" y="71" fontFamily={MONO} fontSize="6" fill="#B9C2CA">WB 5000A · 5 kW</text>
      <text x="8" y="80" fontFamily={MONO} fontSize="5" fill="#8E969E">DC 250-600 V · AC 230 V</text>
      <rect x="4" y="96" width="102" height="50" rx="3" fill="#D9DDE1" stroke="#4E555C" strokeWidth=".6" />
      <g fontFamily={MONO} fontSize="6" fontWeight="700">
        <text x="15.4" y="110" textAnchor="middle" fill="#D93A3A">+</text>
        <text x="33" y="110" textAnchor="middle" fill="#141A21">−</text>
        <text x="66" y="110" textAnchor="middle" fill="#2C7BE5">N</text>
        <text x="83.6" y="110" textAnchor="middle" fill="#141A21">L</text>
        <text x="101.2" y="110" textAnchor="middle" fill="#1E9E63">PE</text>
      </g>
      <text x="24" y="146" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fill="#3A4047">SUNCLIX DC</text>
      <text x="84" y="146" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fill="#3A4047">AC · câble 3G6</text>
      <rect x="10" y="114" width="11" height="15" rx="2" fill="#D93A3A" stroke="#6B1111" />
      <rect x="27.5" y="114" width="11" height="15" rx="2" fill="#20262D" stroke="#000" />
      <rect x="58" y="116" width="50" height="15" rx="1.5" fill="#F4F5F7" stroke="#6E7780" strokeWidth=".6" />
      <VisE222 x={66} y={135} r={4} /><VisE222 x={83.6} y={135} r={4} /><VisE222 x={101.2} y={135} r={4} />
    </svg>
  );
}

/**
 * Résistance de charge BW 155 combination (DTR 31), 104 × 96 : trois blocs à ailettes et la
 * boîte de raccordement ; câble de sortie + / − / PE au bord droit (50, 65, 80 %).
 */
export function Bw155Svg() {
  return (
    <svg viewBox="0 0 104 96" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      {[0, 1, 2].map((b) => (
        <g key={b}>
          <rect x={4 + b * 22} y="6" width="20" height="62" rx="2" fill="#2B2F36" stroke="#15181C" />
          {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${7 + b * 22 + i * 3.6} 8v58`} stroke="#6E7780" strokeWidth=".9" />)}
        </g>
      ))}
      <rect x="18" y="70" width="44" height="22" rx="3" fill="#3A4047" stroke="#15181C" />
      <text x="40" y="80" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#E8ECEF">BW 155</text>
      <text x="40" y="88" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fill="#B9C2CA">10000 · IP65</text>
      <g fill="none" strokeWidth="1.6">
        <path d="M62 76 C 80 76, 84 48, 104 48" stroke="#D93A3A" />
        <path d="M62 80 C 82 80, 86 62.4, 104 62.4" stroke="#20262D" />
        <path d="M62 84 C 84 84, 88 76.8, 104 76.8" stroke="#37B34A" strokeDasharray="3 2" />
      </g>
      <g fontFamily={MONO} fontSize="5.5" fontWeight="700">
        <text x="92" y="45" fill="#D93A3A">+</text><text x="92" y="59.5" fill="#141A21">−</text><text x="88" y="74" fill="#1E9E63">PE</text>
      </g>
      <text x="70" y="12" fontFamily={SANS} fontSize="5.5" fontWeight="700" fill="#3A4047">≈ 30 Ω</text>
    </svg>
  );
}

/** Face d'un appareil modulaire : fond, bandeaux de bornes, vis aux fractions données. */
function ModE222({ w, vis, children }: { w: number; vis: number[]; children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${w} 123`} style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width={w - 2} height="121" rx="4" fill="#F4F5F7" stroke="#6E7780" />
      <rect x="1" y="1" width={w - 2} height="16" rx="4" fill="#DCE0E4" />
      <rect x="1" y="106" width={w - 2} height="16" rx="4" fill="#DCE0E4" />
      {vis.map((fx) => <VisE222 key={`h${fx}`} x={fx * w} y={7.4} r={4} />)}
      {vis.map((fx) => <VisE222 key={`b${fx}`} x={fx * w} y={115.6} r={4} />)}
      {children}
    </svg>
  );
}

/** Interrupteur-sectionneur 4P 40 A (Q3), 104 × 123 : N 1 3 5 / N 2 4 6, manette commune. */
export function Isw4pSvg({ on = false }: { on?: boolean }) {
  const vis = [0.14, 0.38, 0.62, 0.86];
  return (
    <ModE222 w={104} vis={vis}>
      <g fontFamily={MONO} fontSize="5.5" fill="#3A4047" textAnchor="middle">
        {['N', '1', '3', '5'].map((t, i) => <text key={t} x={vis[i] * 104} y="24">{t}</text>)}
        {['N', '2', '4', '6'].map((t, i) => <text key={`b${t}`} x={vis[i] * 104} y="103">{t}</text>)}
      </g>
      <rect x="10" y="44" width="84" height="16" rx="2" fill="#20262D" transform={on ? 'translate(0 -6)' : 'translate(0 10)'} />
      <text x="52" y="33" textAnchor="middle" fontFamily={SANS} fontSize="6" fontWeight="700" fill={on ? '#1E9E63' : '#D93A3A'}>{on ? 'I · ON' : 'O · OFF'}</text>
      <text x="52" y="82" textAnchor="middle" fontFamily={SANS} fontSize="6.5" fontWeight="700" fill="#3A4047">iSW 4P 40 A</text>
      <text x="52" y="91" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#66717F">interrupteur-sectionneur</text>
    </ModE222>
  );
}

/** Disjoncteur différentiel DX³ 1P+N 32 A 30 mA type F (Od), 52 × 123 : N 1 en haut, N 2 en bas. */
export function Dx3Diff32FSvg({ on = false }: { on?: boolean }) {
  return (
    <ModE222 w={52} vis={[0.3, 0.7]}>
      <g fontFamily={MONO} fontSize="5" fill="#3A4047" textAnchor="middle">
        <text x="15.6" y="24">N</text><text x="36.4" y="24">1</text><text x="15.6" y="103">N</text><text x="36.4" y="103">2</text>
      </g>
      <rect x="18" y="30" width="16" height="30" rx="2" fill="#E8EBEE" stroke="#8E969E" />
      <rect x="20" y={on ? 32 : 44} width="12" height="14" rx="1.5" fill="#20262D" />
      <text x="26" y="68" textAnchor="middle" fontFamily={SANS} fontSize="5.5" fontWeight="700" fill="#3A4047">DX³ C32</text>
      <text x="26" y="76" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#66717F">30 mA · F</text>
      <rect x="6" y="80" width="40" height="5" fill="#D93A3A" />
      <rect x="20" y="88" width="12" height="7" rx="1.5" fill="#E39A00" />
      <text x="26" y="93.5" textAnchor="middle" fontFamily={SANS} fontSize="3.8" fill="#fff">T</text>
    </ModE222>
  );
}

/** Répartiteur tétrapolaire, 116 × 123 : barreaux L1 L2 L3 N (borne à gauche de chaque barreau). */
export function Repart4pSvg() {
  const couleurs = ['#8B4A2B', '#2B2F36', '#8E979F', '#2C7BE5'];
  return (
    <svg viewBox="0 0 116 123" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="114" height="121" rx="4" fill="#EEF0F2" stroke="#6E7780" />
      <text x="58" y="12" textAnchor="middle" fontFamily={SANS} fontSize="6.5" fontWeight="700" fill="#3A4047">Répartiteur 4P</text>
      {['L1', 'L2', 'L3', 'N'].map((t, i) => {
        const y = 24.6 * (i + 1);
        return (
          <g key={t}>
            <rect x="6" y={y - 7} width="104" height="14" rx="2" fill="#C9A45C" stroke="#7A5B20" strokeWidth=".7" />
            {Array.from({ length: 7 }, (_, k) => <circle key={k} cx={30 + k * 11} cy={y} r="3" fill="#8E7336" />)}
            <VisE222 x={11.6} y={y} r={4.2} />
            <rect x="100" y={y - 5} width="8" height="10" rx="1" fill={couleurs[i]} />
            <text x="104" y={y + 2.2} textAnchor="middle" fontFamily={MONO} fontSize="4.4" fontWeight="700" fill="#fff">{t}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Parafoudre AC type 2 3P+N, 174 × 123 : N L1 L2 L3 en haut à gauche, borne de terre en bas à droite. */
export function PfAc3pnSvg() {
  const vis = [0.1, 0.2, 0.3, 0.4];
  return (
    <svg viewBox="0 0 174 123" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="172" height="121" rx="4" fill="#F4F5F7" stroke="#6E7780" />
      <rect x="1" y="1" width="86" height="16" rx="4" fill="#DCE0E4" />
      {vis.map((fx) => <VisE222 key={fx} x={fx * 174} y={7.4} r={4} />)}
      <g fontFamily={MONO} fontSize="5" fill="#3A4047" textAnchor="middle">
        {['N', 'L1', 'L2', 'L3'].map((t, i) => <text key={t} x={vis[i] * 174} y="24">{t}</text>)}
      </g>
      {/* déconnecteur associé */}
      <rect x="10" y="32" width="68" height="22" rx="2" fill="#20262D" />
      <text x="44" y="64" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#66717F">déconnecteur</text>
      {/* cartouches */}
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <rect x={92 + k * 19} y="10" width="17" height="86" rx="2" fill="#E8EBEE" stroke="#8E969E" />
          <rect x={96 + k * 19} y="22" width="9" height="6" rx="1" fill="#3DFF7A" />
        </g>
      ))}
      <text x="44" y="80" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="700" fill="#3A4047">Parafoudre T2</text>
      <text x="44" y="90" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fill="#66717F">3P+N · 40 kA</text>
      <VisE222 x={160} y={110.7} r={4.2} />
      <text x="146" y="113" textAnchor="middle" fontFamily={MONO} fontSize="5.5" fontWeight="700" fill="#1E9E63">⏚</text>
    </svg>
  );
}

/** Barrette de terre du tableau, 260 × 36 : borne de raccordement à gauche (8 %, 30 %). */
export function BarrTerreSvg() {
  return (
    <svg viewBox="0 0 260 36" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="4" width="258" height="28" rx="3" fill="#3A4047" />
      <rect x="6" y="8" width="248" height="20" rx="2" fill="#D9B36A" stroke="#7A5B20" />
      <VisE222 x={20.8} y={10.8} r={5} />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={42 + i * 17} cy="18" r="3.6" fill="#9C7A36" stroke="#6B5220" strokeWidth=".6" />)}
      <text x="246" y="23" textAnchor="middle" fontFamily={MONO} fontSize="9" fontWeight="700" fill="#1E9E63">⏚</text>
    </svg>
  );
}
/* ═══ chevrerie-e222 : fin ═══ */

/* ═══ chevrerie-b4 : début ═══ */
/*
 * Alarme intrusion du sujet Chèvrerie (B.4) : centrale I-ON20EU, clavier I-KP01, sirène
 * SIMAX, batterie SCA00001, détecteur IR XCELWPT, contact 400-FR, résistances d'équilibrage.
 * Chaque dessin est à l'échelle de la platine (viewBox = taille du sprite en px) et place ses
 * vis sur les bornes déclarées au catalogue : il relit leurs positions, il ne les recopie pas.
 */
// Import en fin de fichier pour garder ce bloc d'un seul tenant (les imports sont remontés).
import { CATALOGUE_BY_KEY as CATALOGUE_B4 } from '@/lib/data/catalogue';

/** Bornes d'un appareil du catalogue, en px du dessin. */
function bornesB4(key: string): { id: string; x: number; y: number }[] {
  const it = CATALOGUE_B4[key];
  if (!it) return [];
  return it.terminals.map(t => ({ id: t.id, x: t.fx * it.w, y: t.fy * it.h }));
}

/** Vis de borne à cage (tête fendue). */
function VisB4({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#D5DADF" stroke="#4B535B" strokeWidth=".8" />
      <path d={`M${x - r * 0.65} ${y + r * 0.65} L${x + r * 0.65} ${y - r * 0.65}`} stroke="#4B535B" strokeWidth=".9" />
    </g>
  );
}

/** Repère vertical d'une borne (texte tourné, lu de bas en haut). */
function RepVB4({ x, y, t, fill = '#F2F5F7', size = 5.2 }: { x: number; y: number; t: string; fill?: string; size?: number }) {
  return (
    <text x={x} y={y} transform={`rotate(-90 ${x} ${y})`} fontSize={size} fontFamily={MONO} fill={fill} dominantBaseline="middle">{t}</text>
  );
}

/** Libellé affiché sous une borne (au lieu de l'identifiant interne). */
const LIB_B4: Record<string, string> = {
  AUXT1: 'AUX TAMP', AUXT2: 'AUX TAMP', '12VBELL': '12V BELL', '0VB': '0V',
  '0V1': '0V', '0V2': '0V', '12VAUX1': '12V AUX', '12VAUX2': '12V AUX',
  COM01: '⊥', COM23: '⊥', COM45: '⊥', COM67: '⊥', COM89: '⊥', '12V': '+12V',
};

/** Centrale I-ON20EU, coffret ouvert sur son circuit imprimé (DTR 12, figure 16). */
export function CentraleIon20Svg() {
  const b = bornesB4('ion20eu');
  const at = (id: string) => b.find(t => t.id === id) ?? { id, x: 0, y: 0 };
  const haut = b.filter(t => t.y < 60 && t.x > 150);
  const rangA = b.filter(t => t.y > 280 && t.y < 320);
  const rangB = b.filter(t => t.y > 320 && !t.id.startsWith('BAT'));
  const bloc = (ids: string[], y: number) => {
    const xs = ids.map(id => at(id).x);
    return <rect x={Math.min(...xs) - 8} y={y - 10} width={Math.max(...xs) - Math.min(...xs) + 16} height={20} rx="2" fill="#1F2429" />;
  };
  return (
    <svg viewBox="0 0 347 363" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      {/* coffret métallique et circuit imprimé */}
      <rect x=".5" y=".5" width="346" height="362" rx="4" fill="#DADDE1" stroke="#8A939C" />
      <rect x="12" y="12" width="323" height="339" rx="2" fill="#2E6A4E" stroke="#1D4734" />
      <text x="173" y="22" textAnchor="middle" fontSize="7" fontFamily={COND} fill="#CFE8DA" letterSpacing=".08em">i-on20EU · CENTRALE 10 ZONES</text>
      {/* bornier secteur à fusible (L, N, terre du coffret) et transformateur */}
      {bloc(['L', 'N', 'PE'], at('L').y)}
      {['L', 'N', 'PE'].map((t, i) => (
        <text key={t} x={at(['L', 'N', 'PE'][i]).x} y={at('L').y + 16} textAnchor="middle" fontSize="6" fontFamily={MONO} fill="#F2F5F7">{t}</text>
      ))}
      <text x={at('N').x} y={at('L').y - 13} textAnchor="middle" fontSize="5.5" fontFamily={SANS} fill="#F2F5F7">230 V~ · fusible</text>
      <rect x="86" y="27" width="22" height="9" rx="2" fill="#EEE" stroke="#777" strokeWidth=".6" />
      <path d="M89 31.5 H105" stroke="#B08A2E" strokeWidth="1.6" />
      <rect x="22" y="66" width="72" height="58" rx="3" fill="#6E757D" stroke="#454B51" />
      <rect x="40" y="72" width="36" height="46" rx="2" fill="#B87333" opacity=".85" />
      <text x="58" y="62" textAnchor="middle" fontSize="5.5" fontFamily={SANS} fill="#F2F5F7">transfo 230 / 16,5 V~</text>
      {/* entrée 16,5 V~ (liaison d'usine) */}
      <path d="M44 124 C 44 200, 34 240, 34 290 M52 124 C 52 200, 44 240, 44 290" fill="none" stroke="#1B1B1B" strokeWidth="1.4" />
      <rect x="26" y="288" width="26" height="18" rx="2" fill="#E9E9E9" stroke="#555" strokeWidth=".6" />
      <text x="39" y="283" textAnchor="middle" fontSize="5" fontFamily={SANS} fill="#F2F5F7">16,5 V~</text>
      {/* processeur, voyants HB / LNK, port réseau */}
      <rect x="120" y="120" width="60" height="44" rx="2" fill="#1A1D21" />
      <circle cx="198" cy="130" r="3" fill="#3BD16F" /><text x="205" y="132" fontSize="5.5" fontFamily={MONO} fill="#CFE8DA">HB</text>
      <circle cx="198" cy="142" r="3" fill="#E3A21A" /><text x="205" y="144" fontSize="5.5" fontFamily={MONO} fill="#CFE8DA">LNK</text>
      <rect x="120" y="196" width="40" height="36" rx="2" fill="#C9CDD2" stroke="#6A7178" />
      <text x="140" y="240" textAnchor="middle" fontSize="5" fontFamily={SANS} fill="#CFE8DA">RJ45</text>
      {/* transmetteur enfichable : aucune borne */}
      <rect x="236" y="116" width="88" height="112" rx="3" fill="#1E5A86" stroke="#123A57" />
      <rect x="244" y="206" width="72" height="14" rx="1.5" fill="#0F2E45" />
      <rect x="298" y="124" width="18" height="14" rx="1.5" fill="#D4AF37" />
      <text x="280" y="160" textAnchor="middle" fontSize="7" fontFamily={COND} fill="#FFF">COM-DATA-4G</text>
      <text x="280" y="170" textAnchor="middle" fontSize="5" fontFamily={SANS} fill="#D6E6F2">transmetteur enfiché</text>
      <text x="280" y="178" textAnchor="middle" fontSize="5" fontFamily={SANS} fill="#D6E6F2">IP · 4G (sans borne)</text>
      {/* bornier sirène / haut-parleur (haut) */}
      {bloc(haut.map(t => t.id), at('LS-').y)}
      {haut.map(t => <RepVB4 key={t.id} x={t.x} y={t.y + 40} t={LIB_B4[t.id] ?? t.id} />)}
      {/* bus, sorties, zones (bas) */}
      {bloc(['0V', '12V', 'A', 'B'], at('0V').y)}
      {bloc(['OP1', '0V1', '0V2', '12VAUX1', '12VAUX2'], at('OP1').y)}
      {bloc(['Z0', 'COM01', 'Z1', 'Z2', 'COM23', 'Z3'], at('Z0').y)}
      {bloc(['Z4', 'COM45', 'Z5', 'Z6', 'COM67', 'Z7', 'Z8', 'COM89', 'Z9'], at('Z4').y)}
      {rangA.map(t => <RepVB4 key={t.id} x={t.x} y={t.y - 13} t={LIB_B4[t.id] ?? t.id} />)}
      {rangB.map(t => (
        <text key={t.id} x={t.x} y={t.y + 15} textAnchor="middle" fontSize="5.2" fontFamily={MONO} fill="#F2F5F7">{LIB_B4[t.id] ?? t.id}</text>
      ))}
      <text x={at('0V').x - 6} y={at('0V').y + 17} fontSize="5" fontFamily={SANS} fill="#CFE8DA">bus RS485</text>
      <text x={at('Z0').x - 6} y={at('Z0').y + 17} fontSize="5" fontFamily={SANS} fill="#CFE8DA">zones 0 à 3</text>
      {/* cordons de la batterie */}
      <path d={`M${at('BAT+').x} ${at('BAT+').y} V360`} stroke="#D12B2B" strokeWidth="2" />
      <path d={`M${at('BAT-').x} ${at('BAT-').y} V360`} stroke="#1B1B1B" strokeWidth="2" />
      <text x={at('BAT+').x - 6} y={at('BAT+').y - 8} fontSize="5.2" fontFamily={MONO} fill="#F2F5F7">BAT+ BAT−</text>
      {b.map(t => <VisB4 key={t.id} x={t.x} y={t.y} />)}
    </svg>
  );
}

/** Clavier I-KP01 : écran LCD, touches, lecteur de badges, bornier en bas à droite. */
export function ClavierIkp01Svg() {
  const b = bornesB4('ikp01');
  const lib: Record<string, string> = { ET1: 'ET', ET2: 'ET' };
  return (
    <svg viewBox="0 0 232 174" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x=".5" y=".5" width="231" height="173" rx="12" fill="#F4F5F2" stroke="#A9AFB5" />
      <rect x="10" y="10" width="146" height="54" rx="4" fill="#DCE0E3" />
      <rect x="18" y="16" width="130" height="40" rx="2" fill="#9DB38A" stroke="#6F8560" />
      {[0, 1, 2, 3].map(r => [0, 1, 2].map(c => (
        <rect key={`${r}-${c}`} x={34 + c * 32} y={72 + r * 18} width="24" height="13" rx="3" fill="#FFF" stroke="#9AA1A8" />
      )))}
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', '0', 'B'].map((k, i) => (
        <text key={k} x={46 + (i % 3) * 32} y={81 + Math.floor(i / 3) * 18} textAnchor="middle" fontSize="7" fontFamily={MONO} fill="#333">{k}</text>
      ))}
      <circle cx="192" cy="42" r="24" fill="none" stroke="#B8BEC4" strokeDasharray="3 2" />
      <text x="192" y="44" textAnchor="middle" fontSize="6" fontFamily={SANS} fill="#7A838C">badge</text>
      {['#3BD16F', '#E3A21A', '#D12B2B', '#2C7BE5'].map((c, i) => <circle key={c} cx={176 + i * 11} cy={84} r="3" fill={c} />)}
      <text x="192" y="100" textAnchor="middle" fontSize="7" fontFamily={COND} fill="#555">I-KP01</text>
      <rect x={b[0].x - 9} y={b[0].y - 9} width={b[b.length - 1].x - b[0].x + 18} height="18" rx="2" fill="#23282D" />
      {b.map(t => (
        <text key={t.id} x={t.x} y={t.y - 12} textAnchor="middle" fontSize="6" fontFamily={MONO} fill="#333">{lib[t.id] ?? t.id}</text>
      ))}
      <text x={(b[2].x + b[3].x) / 2} y={b[0].y - 20} textAnchor="middle" fontSize="5" fontFamily={SANS} fill="#666">RS485</text>
      {b.map(t => <VisB4 key={t.id} x={t.x} y={t.y} />)}
    </svg>
  );
}

/** Sirène SIMAX, capot déposé : haut-parleur, batterie 2 Ah, bornier (DTR 13). */
export function SireneSimaxSvg() {
  const b = bornesB4('simax');
  const at = (id: string) => b.find(t => t.id === id) ?? { id, x: 0, y: 0 };
  const lib: Record<string, string> = { '12V': '+12V', I1: '1', I2: '2', AP1: '', AP2: '', 'BAT+': '+', 'BAT-': '−' };
  const sous = (a: string, z: string, t: string) => (
    <text x={(at(a).x + at(z).x) / 2} y={at(a).y + 22} textAnchor="middle" fontSize="5" fontFamily={SANS} fill="#20262D">{t}</text>
  );
  return (
    <svg viewBox="0 0 278 264" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <rect x=".5" y=".5" width="277" height="263" rx="6" fill="#E4E7EA" stroke="#8A939C" />
      <text x="140" y="24" textAnchor="middle" fontSize="10" fontFamily={COND} fill="#20262D" letterSpacing=".1em">SIMAX · SIRÈNE</text>
      {/* haut-parleur */}
      <circle cx="196" cy="100" r="56" fill="#C9CED3" stroke="#7A838C" />
      {[0, 1, 2, 3].map(i => <circle key={i} cx="196" cy="100" r={48 - i * 11} fill="none" stroke="#8E979F" strokeWidth=".8" />)}
      <rect x="18" y="36" width="16" height="22" rx="2" fill="#1F2429" /><text x="38" y="50" fontSize="5.5" fontFamily={SANS} fill="#333">HP</text>
      {/* interrupteurs de configuration */}
      {[0, 1, 2, 3, 4].map(i => <rect key={i} x={70 + i * 9} y="36" width="6" height="12" rx="1" fill="#2B5FB5" />)}
      {/* batterie interne 12 V 2 Ah, raccordée sur BAT + − */}
      <rect x="18" y="118" width="112" height="56" rx="3" fill="#2B2F33" />
      <text x="74" y="144" textAnchor="middle" fontSize="8" fontFamily={COND} fill="#F2F5F7">12 V · 2 Ah</text>
      <text x="74" y="156" textAnchor="middle" fontSize="5.5" fontFamily={SANS} fill="#C9CED3">batterie interne SCA00002</text>
      <path d={`M28 174 C 28 196, ${at('BAT+').x} 196, ${at('BAT+').x} ${at('BAT+').y}`} fill="none" stroke="#D12B2B" strokeWidth="2" />
      <path d={`M118 174 C 118 200, ${at('BAT-').x} 196, ${at('BAT-').x} ${at('BAT-').y}`} fill="none" stroke="#1B1B1B" strokeWidth="2" />
      {/* autoprotection (vis à l'arrachement, interrupteur à l'ouverture) */}
      <rect x="236" y="190" width="22" height="30" rx="2" fill="#F7F7F7" stroke="#6A7178" />
      <text x="247" y="230" textAnchor="middle" fontSize="5" fontFamily={SANS} fill="#333">TAMPER</text>
      {/* borniers */}
      <rect x={at('BAT+').x - 9} y={at('BAT+').y - 9} width={at('BAT-').x - at('BAT+').x + 18} height="18" rx="2" fill="#23282D" />
      <rect x={at('0V').x - 9} y={at('0V').y - 9} width={at('AP2').x - at('0V').x + 18} height="18" rx="2" fill="#23282D" />
      {b.map(t => (
        <text key={t.id} x={t.x} y={t.y - 12} textAnchor="middle" fontSize="6" fontFamily={MONO} fill="#20262D">{lib[t.id] ?? t.id}</text>
      ))}
      {sous('BAT+', 'BAT-', 'BAT')}
      {sous('0V', '12V', 'CHARGE')}
      {sous('I1', 'I2', 'INPUTS')}
      {sous('O1', 'O2', 'OUTPUTS')}
      {sous('AP1', 'AP2', 'A.P. TAMPER')}
      {b.map(t => <VisB4 key={t.id} x={t.x} y={t.y} />)}
    </svg>
  );
}

/** Batterie 12 V 7 Ah de la centrale ; cosses raccordées ou non (organe de la mise sous tension). */
export function BatterieCentraleSvg({ raccordee = false }: { raccordee?: boolean }) {
  const b = bornesB4('sca00001');
  return (
    <svg viewBox="0 0 219 138" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <rect x=".5" y="8" width="218" height="129.5" rx="4" fill="#2C3136" stroke="#111" />
      <rect x="10" y="30" width="199" height="40" rx="2" fill="#3C434A" />
      <text x="109.5" y="56" textAnchor="middle" fontSize="16" fontFamily={COND} fill="#F2F5F7">12 V · 7 Ah</text>
      <text x="109.5" y="88" textAnchor="middle" fontSize="7" fontFamily={SANS} fill="#C9CED3">batterie plomb étanche · SCA00001</text>
      <text x="109.5" y="118" textAnchor="middle" fontSize="7" fontFamily={SANS} fill={raccordee ? '#3BD16F' : '#E3A21A'}>
        {raccordee ? 'cosses raccordées' : 'cosses débranchées'}
      </text>
      {b.map(t => (
        <g key={t.id}>
          <rect x={t.x - 7} y={t.y - 6} width="14" height="10" rx="1.5" fill={t.id === '+' ? '#D12B2B' : '#1B1B1B'} stroke="#999" strokeWidth=".6" />
          <text x={t.x} y={t.y + 16} textAnchor="middle" fontSize="9" fontFamily={MONO} fill="#F2F5F7">{t.id === '+' ? '+' : '−'}</text>
        </g>
      ))}
    </svg>
  );
}

/** Détecteur IR XCELWPT, capot déposé : borniers 12 VDC et ALARM / LED / TAMPER. */
export function DetecteurIrSvg() {
  const b = bornesB4('xcelwpt');
  const at = (id: string) => b.find(t => t.id === id) ?? { id, x: 0, y: 0 };
  const lib: Record<string, string> = { '-': '−', A1: '', A2: '', T1: '', T2: '', LED: 'L' };
  return (
    <svg viewBox="0 0 93 138" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <path d="M4 2 H89 V104 Q89 136 46.5 136 Q4 136 4 104 Z" fill="#F7F8F8" stroke="#A9AFB5" />
      <rect x={at('+').x - 7} y={at('+').y - 6} width={at('-').x - at('+').x + 14} height="12" rx="1.5" fill="#23282D" />
      <rect x={at('A1').x - 6} y={at('A1').y - 6} width={at('T2').x - at('A1').x + 12} height="12" rx="1.5" fill="#23282D" />
      <text x={(at('+').x + at('-').x) / 2} y={at('+').y - 14} textAnchor="middle" fontSize="4.6" fontFamily={MONO} fill="#333">12VDC</text>
      <text x={(at('A1').x + at('A2').x) / 2} y={at('A1').y - 14} textAnchor="middle" fontSize="4.6" fontFamily={MONO} fill="#333">ALARM</text>
      <text x={(at('T1').x + at('T2').x) / 2} y={at('T1').y - 14} textAnchor="middle" fontSize="4.6" fontFamily={MONO} fill="#333">TAMPER</text>
      <text x={(at('A1').x + at('T2').x) / 2} y={at('A1').y - 20} textAnchor="middle" fontSize="4.2" fontFamily={MONO} fill="#666">NC · LED · NC</text>
      {b.map(t => (lib[t.id] === '' ? null : (
        <text key={t.id} x={t.x} y={t.y - 8} textAnchor="middle" fontSize="5" fontFamily={MONO} fill="#333">{lib[t.id] ?? t.id}</text>
      )))}
      {/* capteur pyroélectrique et lentille */}
      <rect x="38" y="62" width="17" height="12" rx="2" fill="#6E757D" />
      <circle cx="46.5" cy="112" r="14" fill="#DDE3E8" stroke="#A9AFB5" />
      <rect x="70" y="56" width="10" height="14" rx="1.5" fill="#FFF" stroke="#6A7178" />
      <text x="75" y="78" textAnchor="middle" fontSize="4" fontFamily={SANS} fill="#666">AP</text>
      <circle cx="18" cy="70" r="2.4" fill="#D12B2B" />
      {b.map(t => <VisB4 key={t.id} x={t.x} y={t.y} r={3.2} />)}
    </svg>
  );
}

/** Contact magnétique 400-FR posé à plat : AP TAMPER puis ALARME. */
export function ContactMagSvg() {
  const b = bornesB4('fr400');
  const at = (id: string) => b.find(t => t.id === id) ?? { id, x: 0, y: 0 };
  return (
    <svg viewBox="0 0 90 34" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x=".5" y=".5" width="89" height="33" rx="3" fill="#F7F8F8" stroke="#A9AFB5" />
      <circle cx="84" cy="8" r="2.6" fill="#FFF" stroke="#8A939C" />
      <circle cx="40" cy="8" r="2.6" fill="#FFF" stroke="#8A939C" />
      <path d="M48 8 H78" stroke="#B8BEC4" strokeWidth="2.4" strokeLinecap="round" />
      <rect x={at('T1').x - 5.5} y={at('T1').y - 5} width={at('T2').x - at('T1').x + 11} height="10" rx="1.5" fill="#23282D" />
      <rect x={at('A1').x - 5.5} y={at('A1').y - 5} width={at('A2').x - at('A1').x + 11} height="10" rx="1.5" fill="#23282D" />
      <text x={(at('T1').x + at('T2').x) / 2} y="16" textAnchor="middle" fontSize="4.2" fontFamily={MONO} fill="#333">AP TAMPER</text>
      <text x={(at('A1').x + at('A2').x) / 2} y="16" textAnchor="middle" fontSize="4.2" fontFamily={MONO} fill="#333">ALARME</text>
      {b.map(t => <VisB4 key={t.id} x={t.x} y={t.y} r={3.2} />)}
    </svg>
  );
}

/** Résistance d'équilibrage, pattes dépliées, code couleur (hors échelle, cote à relever). */
export function ResistanceEolSvg({ bandes }: { bandes: [string, string, string] }) {
  return (
    <svg viewBox="0 0 36 12" style={{ width: '100%', height: '100%' }}>
      <path d="M1 6 H35" stroke="#8E979F" strokeWidth="1.2" />
      <rect x="9" y="2" width="18" height="8" rx="3" fill="#D8C49A" stroke="#8C7A55" strokeWidth=".6" />
      {bandes.map((c, i) => <rect key={i} x={12 + i * 3.4} y="2" width="1.9" height="8" fill={c} />)}
      <rect x="23" y="2" width="1.9" height="8" fill="#C9A227" />
    </svg>
  );
}
/* ═══ chevrerie-b4 : fin ═══ */

/* ═══ chevrerie-a4-ssi : début ═══ */

/**
 * Tableau d'alarme incendie Type 4 · 2 boucles (DTR 8), 240 × 160 mm, capot déposé sur le
 * bornier : grille du signal d'évacuation intégré, voyants sous tension / dérangement / feu,
 * bouton essai-réarmement. Bornier au pas 0,085 × largeur, rangée haute (Secteur, Entrée
 * alim. ext.) à 66 %, rangée basse à 90 % — comme au schéma du sujet.
 */
export function TableauT4Svg() {
  const gid = React.useId();
  const col = (i: number) => 28.8 + i * 20.4;
  const haut: [number, string][] = [[0, 'P'], [1, 'N'], [6, '+'], [7, '−']];
  const bas = ['+', '−', 'C', 'O/F', '+', '−', '+', '−', 'C', 'O/F'];
  const groupes: [number, string][] = [[0.5, 'Diffuseur'], [2.5, 'Aux.'], [4.5, 'Boucle 1'], [6.5, 'Boucle 2'], [8.5, 'Dérang.']];
  return (
    <svg viewBox="0 0 240 160" style={{ width: '100%', height: '100%', ...SHADOW3 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7F8F9" /><stop offset="1" stopColor="#DADFE4" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="238" height="158" rx="5" fill={`url(#${gid})`} stroke="#7E868F" />
      {/* bandeau et grille du diffuseur intégré */}
      <rect x="1" y="1" width="238" height="14" rx="5" fill="#C8102E" />
      <text x="8" y="11" fontFamily={COND} fontSize="8.5" fontWeight="700" fill="#FFFFFF">ALARME INCENDIE · TYPE 4 · 2 BOUCLES</text>
      {[0, 1, 2, 3].map((i) => <rect key={i} x="150" y={22 + i * 6} width="78" height="3" rx="1.5" fill="#9AA2AB" />)}
      <text x="189" y="52" textAnchor="middle" fontFamily={MONO} fontSize="4.5" fill="#66717F">signal d’évacuation</text>
      {/* voyants et bouton essai / réarmement */}
      {([['#1E9E63', 'SOUS TENSION'], ['#E3B400', 'DÉRANGEMENT'], ['#D93A3A', 'FEU']] as const).map(([c, t], i) => (
        <g key={t}>
          <circle cx={14} cy={26 + i * 11} r="3.4" fill={c} stroke="#3A4047" strokeWidth=".6" />
          <text x={21} y={28 + i * 11} fontFamily={MONO} fontSize="5.2" fill="#3A4047">{t}</text>
        </g>
      ))}
      <rect x="86" y="22" width="48" height="28" rx="3" fill="#2B2F36" />
      <circle cx="110" cy="33" r="6" fill="#5B6573" stroke="#15181C" />
      <text x="110" y="47" textAnchor="middle" fontFamily={MONO} fontSize="4" fill="#DDE3EA">essai / réarm.</text>
      {/* plaque du bornier */}
      <rect x="14" y="94" width="212" height="62" rx="2" fill="#E9ECEF" stroke="#9AA2AB" />
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i} fill="#C9CED3" stroke="#6E7780" strokeWidth=".6">
          <rect x={col(i) - 8} y="99" width="16" height="13" rx="2" />
          <rect x={col(i) - 8} y="137" width="16" height="13" rx="2" />
          <circle cx={col(i)} cy="105.6" r="4.2" fill="#F2F4F6" />
          <circle cx={col(i)} cy="144" r="4.2" fill="#F2F4F6" />
          <path d={`M${col(i) - 3} ${105.6 + 3}L${col(i) + 3} ${105.6 - 3}M${col(i) - 3} ${144 + 3}L${col(i) + 3} ${144 - 3}`} stroke="#6E7780" strokeWidth="1" />
        </g>
      ))}
      {haut.map(([i, t]) => (
        <text key={`h${i}`} x={col(i)} y="118" textAnchor="middle" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#141A21">{t}</text>
      ))}
      <text x={(col(0) + col(1)) / 2} y="123.5" textAnchor="middle" fontFamily={SANS} fontSize="4" fill="#3A4047">Secteur</text>
      <text x={(col(6) + col(7)) / 2} y="123.5" textAnchor="middle" fontFamily={SANS} fontSize="4" fill="#3A4047">Alim. ext.</text>
      {bas.map((t, i) => (
        <text key={`b${i}`} x={col(i)} y="134.5" textAnchor="middle" fontFamily={MONO} fontSize={t.length > 1 ? 4 : 5} fontWeight="700" fill="#141A21">{t}</text>
      ))}
      {groupes.map(([c, t]) => (
        <text key={t} x={28.8 + c * 20.4} y="129" textAnchor="middle" fontFamily={SANS} fontSize="4" fill="#3A4047">{t}</text>
      ))}
    </svg>
  );
}

/**
 * Déclencheur manuel conventionnel S3000 (DTR 7), 87 × 87 mm : boîtier rouge, membrane
 * déformable, bornier 3A / 3 · 1A / 1 · 2A / 2 à gauche (doubles bornes reliées). La version
 * étanche IP66 porte son joint et son capot transparent.
 */
export function DmS3000Svg({ etanche = false }: { etanche?: boolean }) {
  const bornes = ['3A', '3', '1A', '1', '2A', '2'];
  const y = (i: number) => 87 * (0.2 + i * 0.13);
  return (
    <svg viewBox="0 0 87 87" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="85" height="85" rx="5" fill="#C8102E" stroke={etanche ? '#5B6573' : '#7A0A1C'} strokeWidth={etanche ? 2.2 : 1} />
      {/* bornier */}
      <rect x="3" y="12" width="21" height="70" rx="2" fill="#2B2F36" />
      {bornes.map((b, i) => (
        <g key={b}>
          <circle cx="8.7" cy={y(i)} r="3.2" fill="#C9CED3" stroke="#15181C" strokeWidth=".6" />
          <path d={`M6.6 ${y(i) + 2}L10.8 ${y(i) - 2}`} stroke="#15181C" strokeWidth=".8" />
          <text x="13.5" y={y(i) + 1.8} fontFamily={MONO} fontSize="4.6" fill="#DDE3EA">{b}</text>
        </g>
      ))}
      {[0, 2, 4].map((i) => (
        <path key={`p${i}`} d={`M20.5 ${y(i)}h1.8v${87 * 0.13}h-1.8`} fill="none" stroke="#DDE3EA" strokeWidth=".6" />
      ))}
      {/* face : membrane et fenêtre */}
      <rect x="30" y="18" width="50" height="46" rx="2" fill="#F4F5F6" stroke="#7A0A1C" />
      <text x="55" y="27" textAnchor="middle" fontFamily={COND} fontSize="6" fontWeight="700" fill="#141A21">ALARME</text>
      <text x="55" y="34" textAnchor="middle" fontFamily={COND} fontSize="6" fontWeight="700" fill="#141A21">INCENDIE</text>
      <path d="M36 43h9l-3 -3M36 43l6 3" fill="none" stroke="#141A21" strokeWidth="1.4" />
      <path d="M74 43h-9l3 -3M74 43l-6 3" fill="none" stroke="#141A21" strokeWidth="1.4" />
      <circle cx="55" cy="43" r="4.2" fill="#141A21" />
      <text x="55" y="57" textAnchor="middle" fontFamily={SANS} fontSize="3.8" fill="#3A4047">APPUYEZ ICI</text>
      <text x="55" y="76" textAnchor="middle" fontFamily={MONO} fontSize="5" fill="#FFFFFF">{etanche ? 'BGES3000 · IP66' : 'MDS3000 · IP24'}</text>
      {etanche && <rect x="27" y="15" width="56" height="52" rx="3" fill="#BFD9FF" fillOpacity=".18" stroke="#DDE3EA" strokeWidth=".8" />}
    </svg>
  );
}

/** Diffuseur sonore de classe B, 24 V⎓ : pavillon, grille, bornes + / − en bas à gauche. */
export function DiffuseurSonoreSvg() {
  return (
    <svg viewBox="0 0 64 84" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <rect x="1" y="1" width="62" height="82" rx="6" fill="#C8102E" stroke="#7A0A1C" />
      <circle cx="36" cy="28" r="18" fill="#2B2F36" />
      {[5, 10, 15].map((r) => <circle key={r} cx="36" cy="28" r={r} fill="none" stroke="#6E7780" strokeWidth="1.2" />)}
      <text x="40" y="56" textAnchor="middle" fontFamily={COND} fontSize="6" fontWeight="700" fill="#FFFFFF">classe B</text>
      <rect x="2" y="46" width="14" height="24" rx="2" fill="#2B2F36" />
      <circle cx="6.4" cy="52.1" r="2.8" fill="#C9CED3" /><circle cx="6.4" cy="67.2" r="2.8" fill="#C9CED3" />
      <text x="11.5" y="54" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#FF8A8A">+</text>
      <text x="11.5" y="69" fontFamily={MONO} fontSize="5" fontWeight="700" fill="#8FC1FF">−</text>
      <text x="40" y="76" textAnchor="middle" fontFamily={MONO} fontSize="4.6" fill="#FFFFFF">24 V⎓</text>
    </svg>
  );
}

/** Résistance de fin de ligne 3,9 kΩ : orange (3), blanc (9), rouge (× 100), or. */
export function ResistanceFdlSvg() {
  return (
    <svg viewBox="0 0 48 18" style={{ width: '100%', height: '100%', ...SHADOW2 }}>
      <path d="M2 9H46" stroke="#8E969E" strokeWidth="1.4" />
      <rect x="12" y="3" width="24" height="12" rx="5" fill="#E8D3A8" stroke="#9C8458" strokeWidth=".6" />
      <rect x="16" y="3" width="2.4" height="12" fill="#F28C28" />
      <rect x="21" y="3" width="2.4" height="12" fill="#FFFFFF" stroke="#C9CED3" strokeWidth=".3" />
      <rect x="26" y="3" width="2.4" height="12" fill="#D93A3A" />
      <rect x="31.5" y="3" width="2" height="12" fill="#C9A227" />
    </svg>
  );
}
/* ═══ chevrerie-a4-ssi : fin ═══ */
