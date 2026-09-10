'use client';

/**
 * Zone de travail zoomable autour de la platine (voir SPEC-v3 §5).
 * Port de `Z` / `applyZoom` / `zoomFit` / molette / glisser de
 * `docs/reference/illustration-v4.tpl.html`, enrichi du pincement à deux doigts.
 *
 * - zoom 30 % → 300 % par boutons, Ctrl + molette, pincement ;
 * - « Ajuster » : échelle qui fait tenir la platine + le bloc récepteurs dans le conteneur ;
 * - déplacement par glisser quand le contenu déborde, sans capturer les clics sur les
 *   bornes, appareils, fils et boutons ;
 * - échelle mémorisée par zone de travail dans `localStorage`.
 */
import React from 'react';
import { PANEL_H, PANEL_W } from '@/lib/scene/geometry';
import './workspace.css';

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 3;
/** Marge autour de la platine dans la zone de travail (padding du calque zoomé). */
const PAD = 20;

/** Sélecteur des éléments interactifs : un glisser ne doit pas leur voler le clic. */
const INTERACTIVE = 'button, a, input, select, textarea, [data-t], [data-w], [data-btn], .se-term, .se-hit, .se-dev, .se-tbox, .se-wires, .at-zone';

const clamp = (v: number): number => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));

function readStored(key: string): number | null {
  try {
    const v = window.localStorage.getItem(`simulelec.zoom.${key}`);
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? clamp(n) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, z: number): void {
  try {
    window.localStorage.setItem(`simulelec.zoom.${key}`, String(z));
  } catch {
    /* stockage indisponible (navigation privée) : le zoom reste en mémoire */
  }
}

export interface WorkspaceProps {
  children: React.ReactNode;
  /** Clé de mémorisation du zoom (`simulelec.zoom.<storageKey>`). */
  storageKey?: string;
  /** Hauteur logique du contenu (par défaut la platine complète, 920). */
  contentHeight?: number;
  className?: string;
}

export default function Workspace({
  children, storageKey = 'panel', contentHeight = PANEL_H, className,
}: WorkspaceProps) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);
  /** Zoom courant lisible dans les écouteurs sans les ré-attacher (pincement). */
  const zoomRef = React.useRef(1);
  const [dragging, setDragging] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  /** Échelle qui fait tenir la platine entière dans le conteneur. */
  const fit = React.useCallback((): number => {
    const el = wrap.current;
    if (!el) return 1;
    const w = el.clientWidth - 2 * PAD;
    const h = el.clientHeight - 2 * PAD;
    if (w <= 0 || h <= 0) return 1;
    return clamp(Math.min(w / PANEL_W, h / contentHeight));
  }, [contentHeight]);

  const apply = React.useCallback((z: number) => {
    const c = clamp(z);
    setZoom(c);
    zoomRef.current = c;
    writeStored(storageKey, c);
  }, [storageKey]);

  // échelle initiale : celle mémorisée, sinon « Ajuster »
  React.useEffect(() => {
    const stored = readStored(storageKey) ?? fit();
    setZoom(stored);
    zoomRef.current = stored;
    setReady(true);
  }, [storageKey, fit]);

  // Ctrl + molette (listener non passif : `preventDefault` interdit en React onWheel)
  React.useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => {
        const c = clamp(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
        zoomRef.current = c;
        writeStored(storageKey, c);
        return c;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [storageKey]);

  // glisser (souris / doigt) + pincement à deux doigts
  React.useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; l: number; t: number } | null = null;
    let pinch: { d: number; z: number } | null = null;

    const dist = (): number => {
      const [a, b] = Array.from(pts.values());
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        drag = null;
        setDragging(false);
        pinch = { d: dist(), z: zoomRef.current };
        return;
      }
      if (t && t.closest(INTERACTIVE)) return;
      drag = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
      setDragging(true);
    };

    const move = (e: PointerEvent) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const d = dist();
        if (pinch.d > 0) {
          const c = clamp(pinch.z * (d / pinch.d));
          setZoom(c);
          zoomRef.current = c;
          writeStored(storageKey, c);
        }
        return;
      }
      if (!drag) return;
      el.scrollLeft = drag.l - (e.clientX - drag.x);
      el.scrollTop = drag.t - (e.clientY - drag.y);
    };

    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) { drag = null; setDragging(false); }
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [storageKey]);

  const pct = Math.round(zoom * 100);

  return (
    <div className={`se-ws${className ? ` ${className}` : ''}`}>
      <div className="se-ztool" role="group" aria-label="Zoom de la zone de travail">
        <button type="button" data-z="-" aria-label="Dézoomer" onClick={() => apply(zoom / 1.2)}>−</button>
        <span className="zval" data-testid="zoom-value" aria-live="polite">{pct} %</span>
        <button type="button" data-z="+" aria-label="Zoomer" onClick={() => apply(zoom * 1.2)}>+</button>
        <button type="button" data-z="fit" onClick={() => apply(fit())}>Ajuster</button>
        <button type="button" data-z="1" onClick={() => apply(1)}>100 %</button>
        <span className="hint">Ctrl + molette ou pincement pour zoomer · glisser pour déplacer</span>
      </div>
      <div className={`se-wswrap${dragging ? ' drag' : ''}`} ref={wrap} data-testid="workspace">
        <div className="se-wszoom" style={{ transform: `scale(${zoom})`, visibility: ready ? 'visible' : 'hidden' }}>
          <div className="se-wsinner" style={{ width: PANEL_W, height: contentHeight }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
