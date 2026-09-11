'use client';

/**
 * Fils : une couche sous les couvercles (cheminement complet) et une couche au-dessus
 * (brins de raccordement + parties extérieures : porte, moteur, réseau).
 *
 * Chaque tracé est doublé d'un tracé transparent large (`HIT_W`) qui capte le clic sans
 * changer le rendu : sur un fil de 3,2 px, viser au doigt serait sinon impossible.
 */
import React from 'react';
import type { NetKind } from '@/lib/types';
import { NET_COLOR, PANEL_H, PANEL_W, type Point } from '@/lib/scene/geometry';
import { externalPart, pathD, stubs } from '@/lib/scene/route';

export { NET_COLOR };

/** Épaisseur de la zone cliquable transparente posée sous chaque fil (unités platine). */
export const HIT_W = 16;
/** Durée d'un appui long avant l'ouverture du menu contextuel (ms). */
export const LONG_PRESS_MS = 500;

export interface RoutedWire {
  index: number;
  pts: Point[];
  net: NetKind;
  /** Liaison en porte ou pré-câblée : sa partie extérieure reste visible couvercles fermés. */
  external: boolean;
  dead?: boolean;
  /** Posée par l'installateur : ni sélectionnable pour suppression, ni supprimable. */
  locked?: boolean;
}

export interface WiresProps {
  wires: RoutedWire[];
  highlight?: number | null;
  /** Fil sélectionné par l'élève : trait épaissi + halo. */
  selected?: number | null;
  pick?: boolean;
  onWire?: (index: number) => void;
  /** Appui long (≈ 500 ms) sur un fil : ouvre le menu contextuel tactile. */
  onWireLongPress?: (index: number, x: number, y: number) => void;
}

const cls = (w: RoutedWire, highlight?: number | null, selected?: number | null): string =>
  [
    w.net === 'PE' ? 'pe' : '',
    highlight === w.index ? 'hl' : '',
    selected === w.index ? 'sel' : '',
    w.dead ? 'dead' : '',
    w.locked ? 'locked' : '',
  ].filter(Boolean).join(' ');

/** Gestion commune du clic et de l'appui long sur un tracé. */
function useWireGestures(onWire?: (i: number) => void, onLong?: (i: number, x: number, y: number) => void) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = React.useRef(false);

  const cancel = React.useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  React.useEffect(() => cancel, [cancel]);

  const down = React.useCallback((i: number) => (e: React.PointerEvent<SVGPathElement>) => {
    if (!onLong || e.pointerType === 'mouse') return;
    fired.current = false;
    const { clientX, clientY } = e;
    cancel();
    timer.current = setTimeout(() => {
      fired.current = true;
      onLong(i, clientX, clientY);
    }, LONG_PRESS_MS);
  }, [cancel, onLong]);

  const click = React.useCallback((i: number) => (e: React.MouseEvent<SVGPathElement>) => {
    cancel();
    if (fired.current) { fired.current = false; e.preventDefault(); return; }
    onWire?.(i);
  }, [cancel, onWire]);

  return { down, click, cancel };
}

/** Tracé transparent large : cible confortable au doigt, invisible à l'écran. */
function Hit(props: {
  d: string; index: number; interactive: boolean; locked?: boolean;
  onDown: (e: React.PointerEvent<SVGPathElement>) => void;
  onUp: () => void;
  onClick: (e: React.MouseEvent<SVGPathElement>) => void;
}) {
  const { d, index, interactive, locked, onDown, onUp, onClick } = props;
  if (!interactive) return null;
  return (
    <path
      d={d}
      className={locked ? 'hit locked' : 'hit'}
      data-w={index}
      data-hit="1"
      strokeWidth={HIT_W}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      onClick={onClick}
    />
  );
}

function Layer({ over, wires, highlight, selected, pick, onWire, onWireLongPress }: WiresProps & { over: boolean }) {
  const { down, click, cancel } = useWireGestures(onWire, onWireLongPress);
  const interactive = Boolean(onWire || onWireLongPress);

  const segments = (w: RoutedWire): { key: string; d: string }[] => {
    if (!over) return [{ key: 'u', d: pathD(w.pts) }];
    const out = stubs(w.pts).map(([a, b], k) => ({ key: `s${k}`, d: `M${a.x} ${a.y} L${b.x} ${b.y}` }));
    if (w.external && externalPart(w.pts).length > 1) out.push({ key: 'x', d: pathD(externalPart(w.pts)) });
    return out;
  };

  return (
    <svg className={`se-wires${over ? ' over' : ''}${pick ? ' pick' : ''}`} viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}>
      {wires.map((w) => (
        <React.Fragment key={w.index}>
          {segments(w).map((seg) => (
            <React.Fragment key={seg.key}>
              <Hit
                d={seg.d}
                index={w.index}
                interactive={interactive}
                locked={w.locked}
                onDown={down(w.index)}
                onUp={cancel}
                onClick={click(w.index)}
              />
              <path
                d={seg.d}
                data-w={w.index}
                stroke={NET_COLOR[w.net]}
                className={cls(w, highlight, selected)}
              />
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </svg>
  );
}

/** Couche sous les couvercles : tout le cheminement. */
export function WiresUnder(props: WiresProps) {
  return <Layer {...props} over={false} />;
}

/** Couche au-dessus des couvercles : brins visibles + parties hors platine. */
export function WiresOver(props: WiresProps) {
  return <Layer {...props} over />;
}
