'use client';

/**
 * Platine v3 : DOM absolu 560 × 720 mis à l'échelle par CSS selon la largeur disponible.
 * Port du rendu de `docs/reference/illustration-v3.tpl.html` (voir SPEC-v3 §2 et §5).
 */
import React from 'react';
import type { CatalogueItem, NetKind, TpDefinition } from '@/lib/types';
import {
  DUCTS_H, DUCT_R, MTERM, MT2, NET_COLOR, PANEL_H, PANEL_W, RES, STERM,
  resIds, resLabel, term, type Point,
} from '@/lib/scene/geometry';
import { annexTerminals, planLanes, route, sceneContext, tpos, type LanePlan, type SceneCtx } from '@/lib/scene/route';
import { Ducts, Rails } from './Ducts';
import Device, { type DeviceState } from './Device';
import Terminals, { type TerminalMark } from './Terminals';
import { WiresOver, WiresUnder, type RoutedWire } from './Wires';
import Station from './Station';
import { Motor, TerminalBox } from './Motor';
import Annex from './Annex';
import Overlays from './Overlays';
import './panel.css';

export interface PanelWire {
  a: string;
  b: string;
  net: NetKind;
  /** Réalisée par l'installateur (réseau → X1, câble moteur). */
  prewired?: boolean;
  /** Liaison en porte. */
  door?: boolean;
  /** Hors tension : tracé estompé. */
  dead?: boolean;
}

export interface PanelProps {
  tp: TpDefinition;
  /** Catalogue résolu par clé (fourni par l'appelant : pack + bibliothèque). */
  items: Record<string, CatalogueItem>;
  wires: PanelWire[];
  cover: boolean;
  marks: boolean;
  /** État des appareils : q1, f2, f3, km1, f1… */
  deviceState?: Record<string, DeviceState>;
  lamps?: { h1: boolean; h2: boolean };
  motorRpm?: number;
  coupling?: 'Y' | 'D';
  /** Index de la liaison surlignée. */
  highlight?: number | null;
  probes?: { r?: string | null; k?: string | null };
  clamp?: number | null;
  lock?: boolean;
  pickTerminals?: boolean;
  pickWires?: boolean;
  onTerminal?: (id: string) => void;
  onWire?: (idx: number) => void;
  onDevice?: (slotId: string) => void;
  onButton?: (b: 's1' | 's2', down: boolean) => void;
  onCoupling?: () => void;
  className?: string;
}

const LEGEND: { net: NetKind; label: string }[] = [
  { net: 'L1', label: 'L1' }, { net: 'L2', label: 'L2' }, { net: 'L3', label: 'L3' },
  { net: 'N', label: 'N' }, { net: 'PE', label: 'PE' }, { net: 'C', label: '24 V' }, { net: 'C0', label: '0 V' },
];

/** Décalage du repère d'une borne (95/96 à gauche, 97/98 à droite). */
function markOffset(id: string, fy: number): { dx: number; dy: number } {
  const dx = id === '95' || id === '96' ? -8 : id === '97' || id === '98' ? 8 : 0;
  return { dx, dy: fy < 0.5 ? -9 : 9 };
}

export default function Panel(props: PanelProps) {
  const {
    tp, items, wires, cover, marks, deviceState, lamps, motorRpm = 0, coupling = 'Y',
    highlight = null, probes, clamp = null, lock = false, pickTerminals, pickWires,
    onTerminal, onWire, onDevice, onButton, onCoupling, className,
  } = props;

  const hostRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const apply = () => {
      const w = host.clientWidth;
      if (w > 0) setScale(Math.min(1, w / PANEL_W));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const ctx: SceneCtx = React.useMemo(() => sceneContext(tp, items), [tp, items]);
  const plan: LanePlan = React.useMemo(
    () => planLanes(ctx, wires.map((w) => [w.a, w.b] as [string, string])),
    [ctx, wires],
  );

  const routed: RoutedWire[] = React.useMemo(() => {
    const out: RoutedWire[] = [];
    wires.forEach((w, i) => {
      const pts = route(ctx, plan, w.a, w.b, i);
      if (!pts) return;
      out.push({ index: i, pts, net: w.net, external: Boolean(w.door || w.prewired), dead: w.dead });
    });
    return out;
  }, [ctx, plan, wires]);

  const hlTerminals = React.useMemo(() => {
    const s = new Set<string>();
    if (highlight != null && wires[highlight]) { s.add(wires[highlight].a); s.add(wires[highlight].b); }
    return s;
  }, [highlight, wires]);

  // ---- bornes des appareils posés
  const slotTerminals: TerminalMark[] = React.useMemo(() => {
    const out: TerminalMark[] = [];
    for (const s of ctx.slots) {
      for (const t of s.terminals) {
        const p = term(s, t.fx, t.fy);
        const { dx, dy } = markOffset(t.id, t.fy);
        out.push({ id: `${s.id}.${t.id}`, pos: p, label: s.slot.group ? undefined : t.id, dx, dy });
      }
    }
    return out;
  }, [ctx]);

  // ---- bornes extérieures (porte, moteur, réseau, annexe)
  const stationTerminals: TerminalMark[] = React.useMemo(
    () => (tp.station ? Object.entries(STERM).map(([id, p]) => ({ id, pos: p })) : []),
    [tp.station],
  );
  const motorTerminals: TerminalMark[] = React.useMemo(() => {
    if (!tp.hasMotor) return [];
    return Object.entries({ ...MTERM, ...MT2 }).map(([id, p]) => ({
      id, pos: p, label: id.split('.')[1], dy: id.endsWith('2') ? -9 : 9,
    }));
  }, [tp.hasMotor]);
  const annexTerms: TerminalMark[] = React.useMemo(() => {
    const out: TerminalMark[] = [];
    for (const it of tp.annexItems ?? []) {
      for (const [id, p] of Object.entries(annexTerminals(it))) {
        out.push({ id, pos: { x: p.x, y: p.y }, label: id.split('.')[1], dx: 8, dy: 0 });
      }
    }
    return out;
  }, [tp.annexItems]);
  const netTerminals: TerminalMark[] = React.useMemo(
    () => resIds(tp.scene).map((id) => ({ id, pos: RES[id] })),
    [tp.scene],
  );

  // ---- étiquettes de groupe (X1 / X2)
  const groupLabels = React.useMemo(() => {
    const groups: Record<string, typeof ctx.slots> = {};
    for (const s of ctx.slots) {
      const g = s.slot.group;
      if (!g) continue;
      (groups[g] = groups[g] || []).push(s);
    }
    return Object.entries(groups).map(([g, arr]) => {
      const x0 = Math.min(...arr.map((s) => s.x));
      const x1 = Math.max(...arr.map((s) => s.x + s.w));
      const y = arr[0].y + arr[0].h + 26;
      const custom = arr.find((s) => s.slot.groupLabel)?.slot.groupLabel;
      const label = custom ?? (g === 'X1'
        ? tp.scene === 'pv' ? 'X1 · bornier DC / AC'
          : tp.scene === 'hab' ? 'X1 · bornier de raccordement (gaines ICTA)'
            : 'X1 · bornier puissance'
        : 'X2 · commande / porte');
      return { g, x: (x0 + x1) / 2, y, label };
    });
  }, [ctx, tp.scene]);

  // ---- calques de mesure
  const probePos = React.useMemo(() => {
    const at = (id?: string | null): Point | null => {
      if (!id) return null;
      const p = tpos(ctx, id);
      return p ? { x: p.x, y: p.y } : null;
    };
    return { r: at(probes?.r), k: at(probes?.k) };
  }, [ctx, probes]);

  const clampPos = React.useMemo(() => {
    if (clamp == null) return null;
    const w = routed.find((r) => r.index === clamp);
    if (!w || w.pts.length < 2) return null;
    const [a, b] = [w.pts[0], w.pts[1]];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }, [clamp, routed]);

  const lockBox = React.useMemo(() => {
    if (!lock) return null;
    const q = ctx.slots.find((s) => s.id === 'q1');
    return q ? { x: q.x, y: q.y, w: q.w, h: q.h } : null;
  }, [lock, ctx]);

  const mono = tp.scene === 'pv' || tp.scene === 'hab';

  return (
    <div className={`se-panelwrap${className ? ` ${className}` : ''}`} ref={hostRef}>
      <div style={{ width: PANEL_W * scale, height: PANEL_H * scale }}>
        <div className={`se-panel ${tp.scene}`} style={{ transform: `scale(${scale})` }}>
          {tp.scene === 'hab' ? <div className="se-tab" /> : null}
          <div className="se-legend">
            {LEGEND.map((l) => (
              <span key={l.net}><span style={{ color: NET_COLOR[l.net] }}>■</span> {l.label} </span>
            ))}
          </div>

          <Ducts scene={tp.scene} cover={cover} />
          <Rails rails={tp.rails && tp.rails.length ? tp.rails : undefined} />
          <Annex annex={tp.annex} items={tp.annexItems ?? []} catalogue={items} />

          {/* fils sous les couvercles : masqués par les goulottes quand les couvercles sont fermés */}
          <WiresUnder wires={routed} highlight={highlight} pick={pickWires} onWire={onWire} />

          {/* appareils */}
          {ctx.slots.map((s) => (
            <Device key={s.id} slot={s} state={deviceState?.[s.id]} onClick={onDevice} />
          ))}
          <Terminals
            terminals={slotTerminals}
            marks={marks}
            highlighted={hlTerminals}
            pick={pickTerminals}
            onTerminal={pickTerminals ? onTerminal : undefined}
          />
          {groupLabels.map((g) => (
            <div key={g.g} className="se-group" style={{ left: g.x, top: g.y }}>{g.label}</div>
          ))}

          {/* coffret de porte */}
          {tp.station ? (
            <>
              <Station h1={Boolean(lamps?.h1)} h2={Boolean(lamps?.h2)} onButton={onButton} />
              <Terminals
                terminals={stationTerminals}
                marks={false}
                highlighted={hlTerminals}
                pick={pickTerminals}
                onTerminal={pickTerminals ? onTerminal : undefined}
              />
            </>
          ) : null}

          {/* moteur */}
          {tp.hasMotor ? (
            <>
              <Motor rpm={motorRpm} />
              <TerminalBox coupling={coupling} onCoupling={onCoupling} />
              <Terminals
                terminals={motorTerminals}
                marks={marks}
                highlighted={hlTerminals}
                pick={pickTerminals}
                onTerminal={pickTerminals ? onTerminal : undefined}
              />
              <div className="se-res" style={{ left: DUCT_R[1] + 22, top: DUCTS_H[3][1] + 4 }}>presse-étoupe</div>
            </>
          ) : null}

          {/* éléments d'annexe */}
          {annexTerms.length ? (
            <Terminals
              terminals={annexTerms}
              marks={marks}
              highlighted={hlTerminals}
              pick={pickTerminals}
              onTerminal={pickTerminals ? onTerminal : undefined}
            />
          ) : null}

          {/* arrivée réseau */}
          <Terminals
            terminals={netTerminals}
            marks={false}
            highlighted={hlTerminals}
            pick={pickTerminals}
            onTerminal={pickTerminals ? onTerminal : undefined}
          />
          {netTerminals.map((t) => (
            <div key={`lab${t.id}`} className="se-res" style={{ left: t.pos.x, top: t.pos.y + 6 }}>
              {resLabel(t.id, tp.scene)}
            </div>
          ))}
          {mono ? (
            <div className="se-res" style={{ left: 200, top: RES['RES.L1'].y + 6 }}>
              arrivée réseau mono 230 V · AGCP
            </div>
          ) : null}

          {/* fils au-dessus des couvercles (brins + parties extérieures) */}
          <WiresOver wires={routed} highlight={highlight} pick={pickWires} onWire={onWire} />

          <Overlays probes={probePos} clamp={clampPos} lock={lockBox} />
        </div>
      </div>
    </div>
  );
}
