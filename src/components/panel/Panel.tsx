'use client';

import React from 'react';
import type { NetKind, TpDefinition } from '@/lib/types';
import { EXTERNAL_POINTS } from '@/lib/data/tp-demarrage-direct';
import { isControlSupplied, isRunning, type SimState } from '@/lib/sim/engine';
import {
  CABINET_RIGHT, PANEL_H, PANEL_W, RAIL_H, RAIL_W, RAIL_X,
  slotBoxes, terminalIds, terminalLabel, terminalPos, slotIdOfTerminal,
} from '@/lib/sim/layout';
import Device, { type DeviceStatus } from './Device';
import Wires, { NET_COLOR, type DrawnWire } from './Wires';
import Motor from './Motor';

export type PanelMode = 'pose' | 'cablage' | 'hors-tension' | 'service';

export interface PanelProps {
  tp: TpDefinition;
  state: SimState;
  mode: PanelMode;
  placed: Record<string, boolean>;
  wires: DrawnWire[];
  selectedTerminal?: string | null;
  doneTerminals?: (id: string) => boolean;
  onSlotClick?: (slotId: string) => void;
  onDeviceClick?: (slotId: string) => void;
  onTerminalClick?: (terminalId: string) => void;
  onButton?: (b: 's1' | 's2') => void;
  selectedSlot?: string | null;
}

const LEGEND: { net: NetKind; label: string }[] = [
  { net: 'L1', label: 'L1' }, { net: 'L2', label: 'L2' }, { net: 'L3', label: 'L3' },
  { net: 'N', label: 'N' }, { net: 'PE', label: 'PE' }, { net: 'C', label: 'commande' },
];

export default function Panel(props: PanelProps) {
  const { tp, state, mode, placed, wires, selectedTerminal, onSlotClick, onDeviceClick, onTerminalClick, onButton, selectedSlot } = props;
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1.05, Math.max(0.42, w / PANEL_W)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // cibles tactiles agrandies sur téléphone (la platine est fortement réduite)
  const [touch, setTouch] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px), (pointer: coarse)');
    const apply = () => setTouch(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // sur téléphone : points de bornes à 14 px et cible tactile élargie, sans mordre
  // sur la borne voisine (les bornes du bornier sont espacées de 28 unités).
  const dotSize = touch ? 14 : 11;
  const hitSize = touch ? 30 : 26;

  const live = mode === 'service';
  const showTerminals = mode === 'cablage';
  const boxes = React.useMemo(() => slotBoxes(tp), [tp]);
  const allPlaced = mode !== 'pose';

  /** Étiquettes de bornier : « X1 · bornier puissance » centrée sous le groupe. */
  const groups = React.useMemo(() => {
    const acc = new Map<string, { label: string; x0: number; x1: number; y: number }>();
    for (const b of boxes) {
      const g = b.slot.group;
      if (!g) continue;
      const cur = acc.get(g);
      if (!cur) acc.set(g, { label: b.slot.groupLabel ?? g, x0: b.x, x1: b.x + b.w, y: b.y + b.h });
      else {
        cur.x0 = Math.min(cur.x0, b.x);
        cur.x1 = Math.max(cur.x1, b.x + b.w);
        cur.y = Math.max(cur.y, b.y + b.h);
        if (b.slot.groupLabel) cur.label = b.slot.groupLabel;
      }
    }
    return Array.from(acc.entries()).map(([id, g]) => ({ id, ...g }));
  }, [boxes]);

  const terminals = React.useMemo(() => {
    if (!showTerminals) return [];
    return terminalIds(tp)
      .map(id => ({ id, pos: terminalPos(tp, id), slotId: slotIdOfTerminal(id) }))
      .filter((t): t is { id: string; pos: { x: number; y: number }; slotId: string | null } => t.pos !== null)
      .filter(t => t.slotId === null || placed[t.slotId] || allPlaced);
  }, [tp, showTerminals, placed, allPlaced]);

  const statusOf = (id: string): DeviceStatus => {
    if (!live) return null;
    switch (id) {
      case 'q1': return state.q1 ? 'on' : 'off';
      case 'f2': return state.f2 ? 'on' : 'off';
      case 'km1': return state.km1 ? 'on' : 'off';
      case 'f1': return state.f1trip ? 'trip' : 'on';
      default: return null;
    }
  };

  const glowOf = (id: string): 'green' | 'red' | null => {
    if (!live) return null;
    if (id === 'h1') return isRunning(state) ? 'green' : null;
    if (id === 'h2') return state.f1trip && isControlSupplied(state) ? 'red' : null;
    return null;
  };

  const spriteStateOf = (id: string): 'on' | 'off' | undefined => {
    if (id === 'q1') return state.q1 ? 'on' : 'off';
    if (id === 'f2') return state.f2 ? 'on' : 'off';
    return undefined;
  };

  return (
    <div ref={hostRef} className="w-full" style={{ maxWidth: PANEL_W * 1.05 }}>
      {/* la platine est mise à l'échelle par `transform` : on réserve la place réelle
          pour éviter tout défilement horizontal de la page sur téléphone */}
      <div style={{ width: PANEL_W * scale, height: PANEL_H * scale + 8 }}>
        <div
          className="relative select-none overflow-hidden rounded-lg border border-[#C9D0D8] bg-[var(--panel)]"
          style={{
            width: PANEL_W, height: PANEL_H, transform: `scale(${scale})`, transformOrigin: 'top left',
            boxShadow: 'inset 0 0 0 6px #F2F4F6, inset 0 0 0 7px #D8DEE5, 0 6px 18px rgba(0,0,0,.14)',
          }}
        >
          {/* rails DIN — ils s'arrêtent au flanc droit de l'armoire */}
          {tp.rails.map((y, i) => (
            <div key={i} className="se-rail absolute rounded-[2px]" style={{ left: RAIL_X, top: y, width: RAIL_W, height: RAIL_H }} />
          ))}

          {/* flanc droit de l'armoire : la porte et le moteur sont au-delà.
              Le trait s'arrête au-dessus du passage du câble moteur. */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: CABINET_RIGHT, top: 14, width: 0, height: 448,
              borderLeft: '1px dashed #A9B2BC',
            }}
          />
          <div
            className="pointer-events-none absolute font-title text-[7.5px] font-semibold uppercase tracking-[.1em] text-[#8B94A0]"
            style={{ left: CABINET_RIGHT + 5, top: 18 }}
          >
            porte
          </div>
          <div
            className="pointer-events-none absolute font-title text-[7.5px] font-semibold uppercase tracking-[.1em] text-[#8B94A0]"
            style={{ left: CABINET_RIGHT + 5, top: 448 }}
          >
            hors armoire
          </div>

          {/* légende des conducteurs */}
          <div className="absolute left-[18px] top-[8px] flex gap-2 text-[8px] font-bold tracking-[.06em] text-[#20262D]">
            {LEGEND.map(l => (
              <span key={l.net}><span style={{ color: NET_COLOR[l.net] }}>■</span> {l.label}</span>
            ))}
          </div>

          <Wires tp={tp} wires={wires} sim={live ? state : null} showCurrent={live} />

          {/* arrivée réseau et bornes du moteur */}
          {Object.entries(EXTERNAL_POINTS).map(([id, p]) => (
            <div
              key={id}
              className="pointer-events-none absolute -translate-x-1/2 font-mono-num text-[7.5px] font-bold text-[#20262D]"
              style={{ left: p.x, top: p.y + (id.startsWith('RES') ? 6 : -14) }}
            >
              {p.label}
            </div>
          ))}

          {/* appareils et emplacements */}
          {boxes.map(box => {
            const id = box.slot.id;
            const isPlaced = allPlaced || placed[id];
            if (!isPlaced) {
              return (
                <button
                  key={id}
                  type="button"
                  data-slot={id}
                  onClick={() => onSlotClick?.(id)}
                  className={`absolute grid place-items-center rounded border-2 border-dashed bg-white/40 font-mono-num text-[11px] font-bold ${selectedSlot === id ? 'border-accent text-accent' : 'border-[#9AA3AD] text-[#66717F]'}`}
                  style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                  aria-label={`Emplacement ${box.slot.label}`}
                >
                  {box.slot.label.split(' · ')[0]}
                </button>
              );
            }
            return (
              <Device
                key={id}
                box={box}
                status={statusOf(id)}
                spriteState={spriteStateOf(id)}
                glow={glowOf(id)}
                interactive={live || mode === 'pose'}
                onClick={() => onDeviceClick?.(id)}
                onButton={onButton}
                showButtons={live && id === 'box'}
              />
            );
          })}

          {/* repérage des borniers, centré sous chaque groupe de bornes */}
          {allPlaced && groups.map(g => (
            <div
              key={g.id}
              className="pointer-events-none absolute z-[3] -translate-x-1/2 whitespace-nowrap rounded border border-[#CBD2DA] bg-white/95 px-1.5 py-[1px] font-title text-[8px] font-semibold uppercase tracking-[.08em] text-[#3A434D]"
              style={{ left: (g.x0 + g.x1) / 2, top: g.y + 30 }}
            >
              {g.label}
            </div>
          ))}

          <Motor tp={tp} n={live ? state.n : 0} />

          {/* bornes cliquables */}
          {terminals.map(t => {
            const sel = selectedTerminal === t.id;
            const done = props.doneTerminals?.(t.id) ?? false;
            return (
              <button
                key={t.id}
                type="button"
                title={terminalLabel(tp, t.id)}
                aria-label={terminalLabel(tp, t.id)}
                onClick={() => onTerminalClick?.(t.id)}
                className="absolute z-[4] grid -translate-x-1/2 -translate-y-1/2 place-items-center bg-transparent"
                style={{ left: t.pos.x, top: t.pos.y, width: hitSize, height: hitSize, cursor: 'crosshair' }}
              >
                <span
                  className={`block rounded-full border-[1.5px] transition-transform ${sel
                    ? 'scale-150 border-[#6B5A00] bg-accent'
                    : done ? 'border-[#5B6670] bg-[#BFC6CE]' : 'border-[#6B5A00] bg-[#FFD54A]'}`}
                  style={{
                    width: dotSize, height: dotSize,
                    boxShadow: sel ? '0 0 0 4px rgba(227,154,0,.4)' : '0 0 0 2px rgba(255,255,255,.7)',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
