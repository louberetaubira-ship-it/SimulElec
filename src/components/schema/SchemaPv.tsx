'use client';

/**
 * FOLIO DE MAINTENANCE de l'installation solaire autonome (off-grid), affiché à
 * l'étape de dépannage à la place du folio de commande (qui n'existe pas pour ce TP).
 *
 * Schéma unifilaire conforme aux conventions NF C 15-712 / installations off-grid
 * (Victron MultiPlus + régulateur MPPT + parc) : coffret DC et coffret AC en cadres
 * pointillés, symboles normalisés (interrupteur-sectionneur, différentiel à tore,
 * parafoudre en dérivation, onduleur = / ~), réseau de terre et régime TT.
 *
 * Chaque POINT DE TEST porte l'identifiant réel d'une borne : cliquer un point pose
 * la pointe de touche, exactement comme sur la platine. Les repères affichés sont
 * ceux de la platine (`repereBorne`), pas les identifiants internes.
 */
import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { repereBorne } from '@/lib/sim/reperes';

const DC = '#C8641C';
const AC = '#1663C7';
const PE = '#159A52';
const BOX = '#0A84FF';
const INK = '#141A21';
const MUTED = '#66717F';
const LINE = '#C8CED6';
const ACCENT = '#E39A00';

interface Node { id: string; rep: string; label: string; x: number; y: number; w: number; h: number; sym?: React.ReactNode; }

/** Point de test : une borne réelle, cliquable pour poser une pointe. */
interface TestPt { id: string; x: number; y: number; pol: '+' | '-' | '~'; node: string }

const NODES: Node[] = [
  { id: 'Q2', rep: 'Q2', label: 'sect. DC champ', x: 60, y: 96, w: 90, h: 44 },
  { id: 'PF1', rep: 'PF1', label: 'parafoudre DC', x: 60, y: 152, w: 90, h: 40 },
  { id: 'F1', rep: 'F1', label: 'fusible principal', x: 60, y: 204, w: 90, h: 40 },
  { id: 'MPPT', rep: 'MPPT', label: 'régulateur 150/70', x: 320, y: 206, w: 110, h: 56 },
  { id: 'Q1', rep: 'Q1', label: 'sect. parc · consignation', x: 560, y: 178, w: 150, h: 46 },
  { id: 'FB', rep: 'FB', label: 'MEGA 125 A', x: 640, y: 120, w: 60, h: 40 },
  { id: 'BAT', rep: 'Parc 24 V', label: 'extérieur · 1200 Ah', x: 620, y: 56, w: 140, h: 48 },
  { id: 'ONDU', rep: 'ONDU', label: 'MultiPlus 24/3000', x: 250, y: 372, w: 130, h: 66 },
  { id: 'Q3', rep: 'Q3', label: 'différentiel 30 mA type A', x: 470, y: 372, w: 140, h: 56 },
  { id: 'X1', rep: 'X1', label: 'tableau de répartition', x: 560, y: 440, w: 90, h: 48 },
];

/** Bornes réelles rattachées à chaque organe, avec leur position sur le folio. */
const TESTPTS: TestPt[] = [
  // amont / aval Q2 (champ PV, ≈72 V continu)
  { id: 'f2.1+', x: 96, y: 92, pol: '+', node: 'Q2' }, { id: 'f2.3−', x: 114, y: 92, pol: '-', node: 'Q2' },
  { id: 'f2.2+', x: 96, y: 144, pol: '+', node: 'Q2' }, { id: 'f2.4−', x: 114, y: 144, pol: '-', node: 'Q2' },
  // entrée régulateur
  { id: 'mppt.PV+', x: 320, y: 224, pol: '+', node: 'MPPT' }, { id: 'mppt.PV−', x: 320, y: 250, pol: '-', node: 'MPPT' },
  // parc 24 V
  { id: 'BT1.X1', x: 648, y: 100, pol: '+', node: 'BAT' }, { id: 'BT2.X2', x: 724, y: 100, pol: '-', node: 'BAT' },
  // aval Q1 (bus consigné)
  { id: 'q1.2+', x: 566, y: 196, pol: '+', node: 'Q1' }, { id: 'q1.4−', x: 584, y: 196, pol: '-', node: 'Q1' },
  // fusible MEGA
  { id: 'megafuse.1', x: 662, y: 120, pol: '+', node: 'FB' }, { id: 'megafuse.2', x: 678, y: 158, pol: '+', node: 'FB' },
  // onduleur : entrée DC + sortie AC + PE
  { id: 'km1.B+', x: 256, y: 372, pol: '+', node: 'ONDU' }, { id: 'km1.B−', x: 274, y: 372, pol: '-', node: 'ONDU' },
  { id: 'km1.PE', x: 300, y: 440, pol: '~', node: 'ONDU' },
  // tableau 230 V (L / N / PE)
  { id: 'x1_1.a', x: 604, y: 448, pol: '~', node: 'X1' }, { id: 'x1_4.a', x: 620, y: 448, pol: '~', node: 'X1' },
  { id: 'x1_5.a', x: 636, y: 448, pol: '~', node: 'X1' },
];

/** Interrupteur-sectionneur (lame ouverte) dans le cadre d'un nœud. */
function Sect(x: number, y: number, c: string) {
  return (<g><circle cx={x} cy={y} r={3} fill={c} /><line x1={x} y1={y} x2={x + 20} y2={y - 16} stroke={c} strokeWidth={2.2} /><circle cx={x + 24} cy={y - 18} r={3} fill={c} /></g>);
}

export interface SchemaPvProps {
  tp: TpDefinition;
  /** Organe visé par l'hypothèse en cours (repère de nœud, encadré). */
  focus?: string | null;
  /** Bornes mises en évidence (zone de l'hypothèse). */
  zone?: readonly string[];
  /** Pointes de touche posées. */
  probes?: { r?: string | null; k?: string | null };
  /** Pose une pointe sur la borne cliquée. */
  onBorne?: (id: string) => void;
  className?: string;
}

export default function SchemaPv({ tp, focus, zone, probes, onBorne, className = '' }: SchemaPvProps) {
  const zoneSet = React.useMemo(() => new Set(zone ?? []), [zone]);
  // Un organe est mis en évidence par la question (focus) ou parce que l'un de ses points
  // de test appartient à la zone de l'hypothèse en cours.
  const nodesOn = React.useMemo(() => {
    const s = new Set<string>();
    if (focus) s.add(focus);
    for (const t of TESTPTS) if (zoneSet.has(t.id)) s.add(t.node);
    return s;
  }, [focus, zoneSet]);
  const colPol = (p: TestPt['pol']) => (p === '+' ? DC : p === '-' ? '#20262D' : AC);

  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 ${className}`}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
          Folio de maintenance — installation solaire autonome
        </span>
        <span className="text-[10px] text-muted">Régime TT</span>
      </div>
      <p className="m-0 mb-2 text-[11.5px] text-muted">
        Coffret DC / coffret AC (pointillés), réseau de terre en{' '}
        <span className="font-semibold" style={{ color: PE }}>vert</span>, symboles normalisés. Les{' '}
        <span className="font-semibold" style={{ color: DC }}>points de test</span> portent le repère
        de la platine : clique deux points pour y poser tes pointes.
      </p>

      <svg viewBox="0 0 800 520" className="block h-auto w-full touch-manipulation" role="img"
        aria-label="Folio unifilaire de l'installation solaire autonome, points de test cliquables">

        {/* coffret DC */}
        <rect x={40} y={70} width={140} height={190} rx={6} fill="none" stroke={MUTED} strokeDasharray="5 4" />
        <text x={46} y={86} fontSize={9.5} fontWeight={700} fill={MUTED}>COFFRET DC · classe II</text>
        {/* coffret AC */}
        <rect x={450} y={362} width={230} height={110} rx={6} fill="none" stroke={MUTED} strokeDasharray="5 4" />
        <text x={458} y={378} fontSize={9.5} fontWeight={700} fill={MUTED}>COFFRET AC · 230 V</text>

        {/* champ PV + JB (hors coffret) */}
        <g stroke={INK} strokeWidth={1.5} fill="none">
          <rect x={70} y={10} width={26} height={18} /><path d="M70 19 h26 M83 10 v18" />
          <rect x={112} y={10} width={26} height={18} /><path d="M112 19 h26 M125 10 v18" />
          <rect x={154} y={10} width={26} height={18} /><path d="M154 19 h26 M167 10 v18" />
        </g>
        <g fill="none" stroke={DC} strokeWidth={1.5}>
          <rect x={80} y={38} width={6} height={14} rx={1} /><rect x={122} y={38} width={6} height={14} rx={1} /><rect x={164} y={38} width={6} height={14} rx={1} />
        </g>
        <text x={192} y={22} fontSize={9} fill={MUTED}>Champ PV</text>
        <text x={192} y={33} fontSize={8} fill={MUTED}>3S4P · Voc≈72 V</text>
        <path d="M188 18 h16" stroke={PE} strokeWidth={1.3} strokeDasharray="3 2" />

        {/* conducteurs DC */}
        <g fill="none" stroke={INK} strokeWidth={1.7}>
          <path d="M105 52 V96" /><path d="M105 140 V152" /><path d="M105 192 V204" />
          <path d="M105 244 V300 H375 V262" />          {/* F1 -> MPPT */}
          <path d="M430 234 H470" />                     {/* MPPT -> bus */}
        </g>

        {/* busbar 24 V */}
        <line x1={490} y1={140} x2={490} y2={320} stroke={DC} strokeWidth={5} />
        <line x1={520} y1={140} x2={520} y2={320} stroke="#20262D" strokeWidth={5} />
        <text x={484} y={136} fontSize={9} fontWeight={700} fill={DC} textAnchor="end">+</text>
        <text x={526} y={136} fontSize={9} fontWeight={700} fill="#20262D">−</text>
        <text x={505} y={334} fontSize={8.5} fill={MUTED} textAnchor="middle">busbar 24 V</text>
        <path d="M470 234 H490" stroke={INK} strokeWidth={1.7} fill="none" />
        <path d="M490 200 H560" stroke={INK} strokeWidth={1.7} fill="none" />  {/* bus -> Q1 */}
        <path d="M520 300 V330 H320 V300" stroke={INK} strokeWidth={1.7} fill="none" /> {/* bus- vers onduleur */}

        {/* Q1 -> FB -> parc */}
        <path d="M710 194 H640" stroke={INK} strokeWidth={1.7} fill="none" />
        <path d="M640 140 V120 M640 120 H690 V104" stroke={INK} strokeWidth={1.7} fill="none" />

        {/* conducteurs AC */}
        <g fill="none" stroke={AC} strokeWidth={1.7}>
          <path d="M380 405 H470" />                     {/* ONDU -> Q3 */}
          <path d="M610 400 H650 V440" />                {/* Q3 -> X1 */}
        </g>
        <text x={330} y={300} fontSize={8.5} fontWeight={700} fill={DC}>DC 24 V</text>
        <text x={392} y={398} fontSize={8.5} fontWeight={700} fill={AC}>230 V</text>

        {/* réseau de terre */}
        <rect x={50} y={498} width={600} height={9} rx={2} fill="none" stroke={PE} strokeWidth={1.5} />
        <text x={56} y={493} fontSize={9} fontWeight={700} fill={PE}>Répartiteur de terre — liaison équipotentielle</text>
        <g stroke={PE} strokeWidth={1.7}><path d="M350 507 V520 M340 520 H360 M344 525 H356 M347 530 H353" /></g>
        <g stroke={PE} strokeWidth={1.4} fill="none" strokeDasharray="4 3">
          <path d="M90 160 V498" /><path d="M315 438 V498" /><path d="M690 104 V44 H720 V498" /><path d="M650 488 V498" />
        </g>
        <text x={96} y={486} fontSize={7.5} fill={PE}>10 mm²</text>
        <text x={700} y={486} fontSize={7.5} fill={PE}>16 mm²</text>

        {/* organes (nœuds) */}
        {NODES.map((n) => {
          const on = nodesOn.has(n.id);
          const bat = n.id === 'BAT';
          const acN = n.id === 'ONDU' || n.id === 'Q3' || n.id === 'X1';
          const col = bat ? PE : acN ? AC : DC;
          return (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={7}
                fill={on ? ACCENT : '#fff'} fillOpacity={on ? 0.14 : 1}
                stroke={on ? ACCENT : (bat ? PE : LINE)} strokeWidth={on ? 2.2 : 1.3}
                strokeDasharray={bat ? '4 3' : undefined} />
              {/* symbole */}
              {(n.id === 'Q1' || n.id === 'Q2') && Sect(n.x + 16, n.y + n.h - 12, DC)}
              {n.id === 'Q3' && <g>{Sect(n.x + 16, n.y + n.h - 14, AC)}<ellipse cx={n.x + 22} cy={n.y + n.h - 8} rx={9} ry={4} fill="none" stroke={AC} strokeWidth={1.3} /></g>}
              {n.id === 'PF1' && <path d={`M${n.x + 16} ${n.y + 10} v12 M${n.x + 10} ${n.y + 22} h12 l-6 9 z`} fill="none" stroke={DC} strokeWidth={1.5} />}
              {n.id === 'F1' && <rect x={n.x + 12} y={n.y + 8} width={11} height={24} rx={2} fill="none" stroke={DC} strokeWidth={1.6} />}
              {n.id === 'FB' && <rect x={n.x + 10} y={n.y + 6} width={11} height={24} rx={2} fill="none" stroke={DC} strokeWidth={1.6} />}
              {n.id === 'MPPT' && <><path d={`M${n.x + 14} ${n.y + 34} q9 -16 18 0`} fill="none" stroke={DC} strokeWidth={1.6} /><text x={n.x + 12} y={n.y + 16} fontSize={9} fill={MUTED}>=</text></>}
              {n.id === 'ONDU' && <><line x1={n.x} y1={n.y} x2={n.x + n.w} y2={n.y + n.h} stroke={BOX} strokeWidth={1} /><text x={n.x + 12} y={n.y + 24} fontSize={13} fontWeight={700} fill={DC}>=</text><path d={`M${n.x + n.w - 40} ${n.y + n.h - 16} q5 -9 10 0 q5 9 10 0`} fill="none" stroke={AC} strokeWidth={1.5} /></>}
              {n.id === 'BAT' && <path d={`M${n.x + 20} ${n.y + 16} v14 M${n.x + 20} ${n.y + 20} h-6 M${n.x + 40} ${n.y + 12} v22 M${n.x + 40} ${n.y + 12} h14`} fill="none" stroke={PE} strokeWidth={1.7} />}
              {n.id === 'X1' && <path d={`M${n.x + 14} ${n.y + 10} v${n.h - 20} M${n.x + 24} ${n.y + 10} v${n.h - 20} M${n.x + 34} ${n.y + 10} v${n.h - 20}`} stroke={AC} strokeWidth={1.5} />}
              <text x={n.x + n.w - 6} y={n.y + 15} textAnchor="end" fontSize={11} fontWeight={800} fontFamily="ui-monospace, monospace" fill={col}>{n.rep}</text>
              <text x={n.x + n.w - 6} y={n.y + n.h - 5} textAnchor="end" fontSize={8.5} fill={MUTED}>{n.label}</text>
            </g>
          );
        })}

        {/* onduleur box outline (redessiné pour porter le cadre) */}
        <rect x={250} y={372} width={130} height={66} rx={7} fill="none" stroke={nodesOn.has('ONDU') ? ACCENT : BOX} strokeWidth={nodesOn.has('ONDU') ? 2.2 : 1.6} />
        <rect x={320} y={206} width={110} height={56} rx={7} fill="none" stroke={nodesOn.has('MPPT') ? ACCENT : BOX} strokeWidth={nodesOn.has('MPPT') ? 2.2 : 1.6} />

        {/* points de test cliquables */}
        {TESTPTS.map((t) => {
          const isR = probes?.r === t.id, isK = probes?.k === t.id;
          const inZone = zoneSet.has(t.id);
          const base = colPol(t.pol);
          return (
            <g key={t.id} data-noeud={t.id} style={{ cursor: onBorne ? 'pointer' : 'default' }}
              onClick={onBorne ? () => onBorne(t.id) : undefined}>
              {inZone && <circle cx={t.x} cy={t.y} r={8} fill={ACCENT} fillOpacity={0.25} />}
              <circle cx={t.x} cy={t.y} r={4.5}
                fill={isR ? '#D93A3A' : isK ? '#20262D' : '#fff'}
                stroke={isR ? '#D93A3A' : isK ? '#20262D' : base} strokeWidth={1.8} />
              <title>{repereBorne(tp, t.id)}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
