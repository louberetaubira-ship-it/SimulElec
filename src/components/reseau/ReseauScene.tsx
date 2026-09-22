'use client';

/**
 * Scène « courant faible » : loge du gardien, local courant faible (armoire 19"), entrée,
 * local à vélos et armoire onduleur — le synoptique DTR 1 mis en situation.
 *
 * Purement déclarative : elle dessine l'armoire telle que l'élève l'a composée, les liaisons
 * posées (fibre jaune pointillée, câbles F/UTP rouges, cordons bleus), les LED des ports
 * du switch quand on les lui donne, l'état du PDU, et rend cliquables les points de
 * raccordement qu'on lui demande. Aucun gestionnaire : lecture seule (rejeu professeur).
 */
import React from 'react';
import type { ReseauDef } from '@/lib/types';
import { familleLiaison } from '@/lib/sim/reseau';
import {
  portX, portY, RACK, SCENE_H, SCENE_W, TERMINAUX, U_SWITCH, uY,
} from './geometrie';

export interface SceneWire { a: string; b: string; net: string; prewired?: boolean }

export interface ReseauSceneProps {
  def: ReseauDef;
  /** Armoire composée (élément → U de départ). Absent : la composition du corrigé. */
  rack?: Record<string, number>;
  wires: SceneWire[];
  /** Borne sélectionnée (premier clic d'une liaison, pointe posée). */
  sel?: string[];
  /** Bornes montrées du doigt (liaison visée dans le tableau). */
  aimed?: string[];
  /** Bornes cliquables : `true` = toutes les bornes réseau, ou une liste. */
  clickable?: boolean | string[];
  onTerminal?: (id: string) => void;
  /** LED des ports du switch (port → 0 / 100 / 1000 Mbit/s). */
  leds?: Record<number, 0 | 100 | 1000>;
  /** Port du switch cliquable pour lire sa LED. */
  onPort?: (n: number) => void;
  /** PDU fermé (switch sous tension). */
  pduOn?: boolean;
  /** Cadenas posé sur le PDU. */
  lock?: boolean;
  onPdu?: () => void;
  /** Points du PDU affichés (VAT de consignation). */
  pduPoints?: boolean;
  className?: string;
}

const COUL = { fibre: '#D4A017', cable: '#D6453D', cordon: '#2F6FD1' } as const;

function chemin(a: { x: number; y: number }, b: { x: number; y: number }, famille: 'fibre' | 'cable' | 'cordon'): string {
  if (famille === 'cable' && (a.y > 300 || b.y > 300) && Math.abs(a.y - b.y) > 80) {
    // les câbles vers le local à vélos descendent sous l'armoire avant de filer vers la prise
    const bas = a.y > b.y ? a : b;
    const haut = a.y > b.y ? b : a;
    return `M${haut.x},${haut.y} C${haut.x + 40},${Math.max(haut.y, 455)} ${bas.x},${450} ${bas.x},${bas.y}`;
  }
  const dy = Math.abs(a.y - b.y);
  const dx = Math.abs(a.x - b.x);
  if (dx < 4) return `M${a.x},${a.y} L${b.x},${b.y}`;
  const k = Math.max(30, Math.min(120, dy * 0.5 + dx * 0.15));
  return `M${a.x},${a.y} C${a.x},${a.y + (b.y >= a.y ? k : -k)} ${b.x},${b.y + (b.y >= a.y ? -k : k)} ${b.x},${b.y}`;
}

function Boite({ x, y, w, h, titre, sous, fond = '#FFFFFF' }: {
  x: number; y: number; w: number; h: number; titre: string; sous?: string; fond?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fond} stroke="#6B7684" strokeWidth={1.4} />
      <text x={x + w / 2} y={y + h / 2 - (sous ? 3 : -4)} textAnchor="middle" fontSize={12} fontWeight={700} fill="#141A21">{titre}</text>
      {sous && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize={10} fill="#5D6878">{sous}</text>}
    </g>
  );
}

function Camera({ x, y, w, titre, ip }: { x: number; y: number; w: number; titre: string; ip: string }) {
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={74} rx={6} fill="#FFFFFF" stroke="#6B7684" strokeWidth={1.4} />
      <path d={`M${cx - 18},${y + 30} a18,16 0 0 1 36,0 z`} fill="#E6E9EE" stroke="#8E969E" />
      <circle cx={cx} cy={y + 26} r={5} fill="#20262D" />
      <text x={cx} y={y + 50} textAnchor="middle" fontSize={11.5} fontWeight={700}>{titre}</text>
      <text x={cx} y={y + 64} textAnchor="middle" fontSize={10} fill="#5D6878">{ip}</text>
    </g>
  );
}

/** Rendu d'un élément de l'armoire, du U `debut` sur `u` U. */
function ElementRack({ id, label, debut, u, pduOn, lock, onPdu }: {
  id: string; label: string; debut: number; u: number; pduOn?: boolean; lock?: boolean; onPdu?: () => void;
}) {
  const y = uY(debut) + 1;
  const h = u * RACK.u - 2;
  const x = RACK.x + 12;
  const w = RACK.w - 24;
  if (id === 'sw' || id === 'pp') {
    const sw = id === 'sw';
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={2} fill={sw ? '#1F2A36' : '#2B3340'} />
        {Array.from({ length: 24 }, (_, i) => i + 1).map(k => (
          <rect key={k} x={portX(k) - 6} y={portY(debut, k) - 4} width={12} height={9} rx={1.5}
            fill={k <= 10 ? '#0B0F14' : '#3A4452'} stroke="#8E969E" strokeWidth={0.6} />
        ))}
        <text x={x + 3} y={y + 11} fontSize={7.5} fill="#CFD6DE">{sw ? 'SW' : 'PP'}</text>
        <text x={x + 3} y={y + 23} fontSize={6.5} fill="#E39A00" fontWeight={700}>{sw ? 'PoE+' : 'LCS³'}</text>
      </g>
    );
  }
  if (id === 'pdu') {
    return (
      <g onClick={onPdu} style={onPdu ? { cursor: 'pointer' } : undefined} data-pdu>
        <rect x={x} y={y} width={w} height={h} rx={2} fill="#20262D" />
        {Array.from({ length: 6 }, (_, i) => (
          <circle key={i} cx={RACK.x + 150 + i * 22} cy={y + h / 2} r={6.5} fill="#11151A" stroke="#6B7684" />
        ))}
        {/* disjoncteur différentiel : levier */}
        <rect x={RACK.x + 70} y={y + 3} width={34} height={h - 6} rx={2} fill="#F2F4F7" />
        <rect x={RACK.x + 80} y={pduOn ? y + 5 : y + h / 2} width={14} height={h / 2 - 5} rx={2} fill={pduOn ? '#1E9E63' : '#D93A3A'} />
        <text x={RACK.x + 120} y={y + h / 2 + 3} fontSize={7.5} fill="#CFD6DE">30 mA</text>
        {lock && <text x={RACK.x + 58} y={y + h / 2 + 5} fontSize={14} data-cadenas>🔒</text>}
      </g>
    );
  }
  const fond = id === 'tab' ? '#3A4452' : id.startsWith('res') ? '#E6E9EE' : '#4A5563';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill={fond} stroke={id.startsWith('res') ? '#8E969E' : 'none'} strokeDasharray={id.startsWith('res') ? '4 3' : undefined} />
      {id !== 'tab' && (
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={10} fill={id.startsWith('res') ? '#5D6878' : '#FFFFFF'} fontWeight={600}>{label}</text>
      )}
    </g>
  );
}

export default function ReseauScene({
  def, rack, wires, sel = [], aimed = [], clickable = false, onTerminal, leds, onPort, pduOn, lock, onPdu, pduPoints, className,
}: ReseauSceneProps) {
  const pos = rack ?? Object.fromEntries(def.rack.map(r => [r.id, r.debut[0]]));
  // les réserves interchangeables : si la composition n'en donne qu'une partie, on complète
  const placeTab = pos.tab;
  const cliquable = (id: string) => (clickable === true ? !id.startsWith('q1.') || !!pduPoints : Array.isArray(clickable) && clickable.includes(id));
  const eq = (id: string) => def.equipements.find(e => e.id === id);

  return (
    <svg
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      className={className ?? 'block h-auto w-full shrink-0 rounded-xl border border-[var(--line)] bg-[#F7F9FC]'}
      style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
      role="img"
      aria-label="Scène courant faible : loge, local courant faible, local à vélos"
      data-scene-reseau
    >
      {/* ① loge */}
      <rect x={10} y={10} width={220} height={300} rx={10} fill="#FBE9DC" />
      <text x={20} y={30} fontSize={12} fontWeight={700} fill="#3C4654">① LOGE DU GARDIEN</text>
      <Boite x={30} y={58} w={180} h={80} titre="Ordinateur" sous="PC_LOGE · 192.168.0.10" />
      <Boite x={30} y={214} w={180} h={60} titre="Convertisseur" sous="cuivre / fibre" />

      {/* ② local courant faible */}
      <rect x={240} y={10} width={750} height={400} rx={10} fill="#DFF0D8" />
      <text x={980} y={30} textAnchor="end" fontSize={12} fontWeight={700} fill="#3C4654">② LOCAL COURANT FAIBLE</text>
      <g>
        <ellipse cx={335} cy={22} rx={42} ry={11} fill="#FFFFFF" stroke="#8E969E" />
        <text x={335} y={26} textAnchor="middle" fontSize={9.5} fill="#5D6878">Internet · FAI</text>
      </g>
      <Boite x={260} y={58} w={150} h={56} titre="Routeur" sous="192.168.0.1" />
      <Boite x={260} y={272} w={150} h={56} titre="Convertisseur" sous="fibre · armoire" />
      <Boite x={800} y={62} w={170} h={60} titre="Passerelle IP/KNX" sous="192.168.0.3 · 1.1.1" />
      <Boite x={800} y={172} w={170} h={60} titre="Automate M221" sous={`${def.automate.ref.split('·').pop()?.trim()} · .4`} />

      {/* armoire 19" */}
      <rect x={RACK.x} y={RACK.y - 22} width={RACK.w} height={def.rackU * RACK.u + 26} rx={6} fill="#3C4654" />
      <text x={RACK.x + RACK.w / 2} y={RACK.y - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="#FFFFFF">ARMOIRE DE BRASSAGE {def.rackU} U</text>
      {Array.from({ length: def.rackU }, (_, i) => (
        <g key={i}>
          <rect x={RACK.x + 12} y={uY(i + 1) + 1} width={RACK.w - 24} height={RACK.u - 2} rx={2} fill="#2B3340" opacity={0.35} />
          <text x={RACK.x + 5} y={uY(i + 1) + 18} fontSize={7.5} fill="#AEB7C2">{i + 1}</text>
        </g>
      ))}
      {def.rack.map(r => (pos[r.id] != null
        ? <ElementRack key={r.id} id={r.id} label={r.label} debut={pos[r.id]} u={r.u} pduOn={pduOn} lock={lock} onPdu={onPdu} />
        : null))}
      {placeTab != null && (
        <g>
          <rect x={560} y={uY(placeTab) + 6} width={112} height={48} rx={4} fill="#20262D" stroke="#8E969E" />
          <text x={616} y={uY(placeTab) + 28} textAnchor="middle" fontSize={11} fontWeight={700} fill="#FFFFFF">NAS</text>
          <text x={616} y={uY(placeTab) + 42} textAnchor="middle" fontSize={9} fill="#CFD6DE">192.168.0.2</text>
          <text x={RACK.x + 20} y={uY(placeTab) + 34} fontSize={9} fill="#CFD6DE">tablette</text>
        </g>
      )}
      {/* LED des ports du switch */}
      {leds && pos.sw === U_SWITCH && Object.entries(leds).map(([n, v]) => (
        <circle key={n} cx={portX(Number(n)) + 5} cy={uY(U_SWITCH) + 3} r={2.6}
          fill={v === 1000 ? '#35E36A' : v === 100 ? '#FFA41B' : '#56606C'} data-led={n} data-led-v={v} />
      ))}
      {onPort && pos.sw === U_SWITCH && Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <rect key={n} x={portX(n) - 8} y={uY(U_SWITCH) - 2} width={16} height={18} fill="transparent"
          style={{ cursor: 'pointer' }} onClick={() => onPort(n)} data-port={n} />
      ))}
      {/* arrière du panneau */}
      <text x={765} y={200} textAnchor="middle" fontSize={8} fill="#3C4654" fontWeight={700}>arrière</text>
      <text x={765} y={210} textAnchor="middle" fontSize={8} fill="#3C4654" fontWeight={700}>panneau</text>
      {Array.from({ length: 8 }, (_, i) => (
        <text key={i} x={776} y={TERMINAUX[`PPR.${i + 1}`].y + 3} fontSize={8.5} fill="#3C4654">{i + 1}</text>
      ))}

      {/* ③ entrée, local à vélos, armoire onduleur */}
      <rect x={10} y={420} width={220} height={230} rx={10} fill="#F4F0B8" />
      <text x={20} y={440} fontSize={12} fontWeight={700} fill="#3C4654">③ ENTRÉE</text>
      <rect x={240} y={420} width={480} height={230} rx={10} fill="#DBE7F7" />
      <text x={250} y={440} fontSize={12} fontWeight={700} fill="#3C4654">LOCAL À VÉLOS</text>
      <rect x={730} y={420} width={260} height={230} rx={10} fill="#FBEFD0" />
      <text x={740} y={440} fontSize={12} fontWeight={700} fill="#3C4654">ARMOIRE ONDULEUR</text>
      <Camera x={45} y={500} w={150} titre="Caméra 1" ip={eq('CAM1')?.ip ?? ''} />
      <Camera x={270} y={500} w={130} titre="Caméra 2" ip={eq('CAM2')?.ip ?? ''} />
      <Camera x={420} y={500} w={130} titre="Caméra 3" ip={eq('CAM3')?.ip ?? ''} />
      <Camera x={570} y={500} w={130} titre="Caméra 4" ip={eq('CAM4')?.ip ?? ''} />
      <Boite x={770} y={490} w={190} h={80} titre="Onduleur IMEON 9.12" sous="192.168.0.5" />
      <text x={20} y={640} fontSize={10} fill="#5D6878">Câble F/UTP cat. 6 rouge · cordon 0,5 m bleu · fibre monomode jaune · caméras alimentées par le câble (PoE)</text>

      {/* liaisons */}
      {wires.map((w, i) => {
        const a = TERMINAUX[w.a];
        const b = TERMINAUX[w.b];
        if (!a || !b) return null;
        const f = familleLiaison(w);
        return (
          <path key={`${w.a}-${w.b}-${i}`} d={chemin(a, b, f)} fill="none" stroke={COUL[f]}
            strokeWidth={f === 'fibre' ? 3 : f === 'cordon' ? 2.2 : 2.4}
            strokeDasharray={f === 'fibre' ? '8 4' : undefined} strokeLinecap="round" opacity={0.92}
            data-wire={`${w.a}~${w.b}`} />
        );
      })}

      {/* points de raccordement */}
      {Object.entries(TERMINAUX).map(([id, p]) => {
        if (id.startsWith('q1.') && !pduPoints) return null;
        if ((id.startsWith('SW.') || id.startsWith('PP.')) && Number(id.split('.')[1]) > 12 && !cliquable(id)) return null;
        const on = sel.includes(id);
        const vise = aimed.includes(id);
        const c = cliquable(id);
        const pdu = id.startsWith('q1.');
        return (
          <g key={id} data-terminal={id} onClick={c && onTerminal ? () => onTerminal(id) : undefined}
            style={c && onTerminal ? { cursor: 'pointer' } : { pointerEvents: 'none' }}>
            <title>{p.label}</title>
            {c && <circle cx={p.x} cy={p.y} r={9} fill="transparent" />}
            <circle cx={p.x} cy={p.y} r={on || vise ? 5.5 : pdu ? 3.6 : id.startsWith('SW.') || id.startsWith('PP.') ? 2.6 : 4.2}
              fill={on ? '#E39A00' : vise ? '#FFD84D' : pdu ? (id.endsWith('N') ? '#2C7BE5' : '#8B4A2B') : '#FFFFFF'}
              stroke={on || vise ? '#141A21' : '#3C4654'} strokeWidth={1.2} />
          </g>
        );
      })}
    </svg>
  );
}
