'use client';

/**
 * Zone de travail zoomable autour de la platine (voir SPEC-v3 §5) et « mode atelier »
 * plein écran (SPEC-v4 §2).
 *
 * - zoom 30 % → 300 % par boutons, Ctrl + molette, pincement ;
 * - « Ajuster » : échelle qui fait tenir la platine + le bloc récepteurs dans le conteneur ;
 * - déplacement par glisser quand le contenu déborde, sans capturer les clics sur les
 *   bornes, appareils, fils et boutons ;
 * - échelle et préférences de confort mémorisées dans `localStorage` ;
 * - mode atelier : la platine occupe tout l'écran (`requestFullscreen()`, repli sur un
 *   calque `position:fixed`), les outils flottent au-dessus et s'estompent après 4 s.
 *
 * Le sous-arbre de la platine est monté une seule fois : passer en plein écran ne fait
 * que changer les classes du conteneur, jamais l'arbre React (sinon le câblage en cours
 * serait perdu).
 */
import React from 'react';
import { PANEL_H, PANEL_W } from '@/lib/scene/geometry';
import './workspace.css';

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 3;
/** Marge autour de la platine dans la zone de travail (padding du calque zoomé). */
const PAD = 20;
/** Délai d'estompage des barres flottantes en mode atelier. */
const IDLE_MS = 4000;

/** Sélecteur des éléments interactifs : un glisser ne doit pas leur voler le clic. */
const INTERACTIVE = 'button, a, input, select, textarea, [data-t], [data-w], [data-btn], .se-term, .se-hit, .se-dev, .se-tbox, .se-wires, .at-zone';

const clamp = (v: number): number => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(`simulelec.${key}`);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(`simulelec.${key}`, value);
  } catch {
    /* stockage indisponible (navigation privée) : la préférence reste en mémoire */
  }
}

function readStored(key: string): number | null {
  const v = read(`zoom.${key}`);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? clamp(n) : null;
}

/** Le focus est-il dans un champ de saisie ? (on ne capture alors aucune touche) */
function typing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/* -------------------------------------------------- API plein écran / veille */

interface FsElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface FsDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
}
/** `WakeLockSentinel` n'existe pas partout : on n'en garde que ce qu'on utilise. */
interface Sentinel { release: () => Promise<void> }

const fullscreenElement = (): Element | null => {
  const d = document as FsDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
};

/* ------------------------------------------------------------------- props */

/** Un appareil de mesure du rail vertical du mode atelier. */
export interface WorkspaceTool {
  id: string;
  /** Nom complet, affiché en infobulle au survol. */
  name: string;
  /** Photo (bibliothèque) ; à défaut `icon` est utilisé. */
  src?: string | null;
  icon?: string;
}

export interface WorkspaceProps {
  children: React.ReactNode;
  /** Clé de mémorisation du zoom (`simulelec.zoom.<storageKey>`). */
  storageKey?: string;
  /** Hauteur logique du contenu (par défaut la platine complète, 920). */
  contentHeight?: number;
  className?: string;
  /** Mode atelier — titre affiché dans la barre haute (titre du TP). */
  title?: string;
  /** Mode atelier — étape en cours, ex. « Étape 5 / 11 · Câblage ». */
  subtitle?: string;
  /** Mode atelier — indicateur contextuel, ex. « 7 / 14 liaisons ». */
  indicator?: React.ReactNode;
  /**
   * Mode atelier — actions de l'étape en cours (Annuler / Rétablir / Supprimer le fil…),
   * placées dans la barre haute. Optionnel : l'API existante est inchangée sans lui.
   */
  actions?: React.ReactNode;
  /** Mode atelier — contenu du tiroir de droite (énoncé + professeur virtuel). */
  drawer?: React.ReactNode;
  drawerTitle?: string;
  /** Mode atelier — appareils de mesure disponibles à l'étape en cours. */
  tools?: WorkspaceTool[];
  activeTool?: string | null;
  onTool?: (id: string) => void;
}

export default function Workspace({
  children, storageKey = 'panel', contentHeight = PANEL_H, className,
  title, subtitle, indicator, actions, drawer, drawerTitle = 'Énoncé', tools, activeTool = null, onTool,
}: WorkspaceProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const wrap = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);
  /** Zoom courant lisible dans les écouteurs sans les ré-attacher (pincement). */
  const zoomRef = React.useRef(1);
  const [dragging, setDragging] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  /* mode atelier */
  const [fs, setFs] = React.useState(false);
  /** Vrai quand l'API `requestFullscreen` a été acceptée (sinon calque `position:fixed`). */
  const nativeFs = React.useRef(false);
  const [idle, setIdle] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [prefsOpen, setPrefsOpen] = React.useState(false);
  const [dark, setDark] = React.useState(true);
  const [autoHide, setAutoHide] = React.useState(true);
  const [portrait, setPortrait] = React.useState(false);
  const sentinel = React.useRef<Sentinel | null>(null);

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
    write(`zoom.${storageKey}`, String(c));
  }, [storageKey]);

  // échelle initiale : celle mémorisée, sinon « Ajuster » ; puis les préférences de confort
  React.useEffect(() => {
    const stored = readStored(storageKey) ?? fit();
    setZoom(stored);
    zoomRef.current = stored;
    setReady(true);
    setDark(read('ws.bg') !== 'light');
    setAutoHide(read('ws.autohide') !== '0');
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
        write(`zoom.${storageKey}`, String(c));
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
          write(`zoom.${storageKey}`, String(c));
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

  /* ------------------------------------------------- entrée / sortie atelier */

  /** Le zoom et le défilement doivent survivre au changement de cadre. */
  const keepView = React.useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const l = el.scrollLeft;
    const t = el.scrollTop;
    requestAnimationFrame(() => {
      const w = wrap.current;
      if (!w) return;
      w.scrollLeft = l;
      w.scrollTop = t;
    });
  }, []);

  const enter = React.useCallback(() => {
    keepView();
    setFs(true);
    setIdle(false);
    setPortrait(typeof window !== 'undefined' && window.innerHeight > window.innerWidth
      && window.matchMedia('(pointer: coarse)').matches);

    const el = root.current as FsElement | null;
    const req = el?.requestFullscreen?.bind(el) ?? el?.webkitRequestFullscreen?.bind(el);
    if (el && req && document.fullscreenEnabled !== false) {
      Promise.resolve()
        .then(() => req())
        .then(() => { nativeFs.current = true; })
        .catch(() => { nativeFs.current = false; });
    }

    void (async () => {
      try {
        const api: unknown = (navigator as { wakeLock?: unknown }).wakeLock;
        const request = (api as { request?: (t: 'screen') => Promise<Sentinel> } | undefined)?.request;
        sentinel.current = request ? await request.call(api, 'screen') : null;
      } catch {
        /* Wake Lock absent ou refusé : sans effet sur le mode atelier */
      }
    })();

    void (async () => {
      try {
        const o: unknown = window.screen?.orientation;
        const lock = (o as { lock?: (t: string) => Promise<void> } | undefined)?.lock;
        if (lock) await lock.call(o, 'landscape');
      } catch {
        /* verrouillage d'orientation refusé : simple invitation à tourner l'appareil */
      }
    })();
  }, [keepView]);

  const leave = React.useCallback(() => {
    keepView();
    setFs(false);
    setDrawerOpen(false);
    setPrefsOpen(false);
    setPortrait(false);
    setIdle(false);
    if (nativeFs.current && fullscreenElement()) {
      const d = document as FsDocument;
      const exit = d.exitFullscreen?.bind(d) ?? d.webkitExitFullscreen?.bind(d);
      try { void Promise.resolve(exit?.()).catch(() => undefined); } catch { /* ignoré */ }
    }
    nativeFs.current = false;
    const s = sentinel.current;
    sentinel.current = null;
    if (s) void s.release().catch(() => undefined);
  }, [keepView]);

  // sortie déclenchée par le navigateur (Échap natif, changement d'onglet…)
  React.useEffect(() => {
    const onChange = () => {
      if (nativeFs.current && !fullscreenElement()) leave();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [leave]);

  // raccourcis clavier : F entre/sort, Échap sort, + / − zooment, 0 ajuste
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing()) return;
      const k = e.key;
      if (k === 'f' || k === 'F') { e.preventDefault(); if (fs) leave(); else enter(); return; }
      if (!fs) return;
      if (k === 'Escape') { e.preventDefault(); leave(); return; }
      if (k === '+' || k === '=') { e.preventDefault(); apply(zoomRef.current * 1.2); return; }
      if (k === '-' || k === '_') { e.preventDefault(); apply(zoomRef.current / 1.2); return; }
      if (k === '0') { e.preventDefault(); apply(fit()); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fs, enter, leave, apply, fit]);

  // libération de la veille si le composant disparaît
  React.useEffect(() => () => {
    const s = sentinel.current;
    sentinel.current = null;
    if (s) void s.release().catch(() => undefined);
  }, []);

  // estompage des barres après 4 s sans geste
  React.useEffect(() => {
    if (!fs || !autoHide) { setIdle(false); return; }
    const el = root.current;
    if (!el) return;
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    const events: (keyof HTMLElementEventMap)[] = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown'];
    events.forEach((n) => el.addEventListener(n, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((n) => el.removeEventListener(n, wake));
    };
  }, [fs, autoHide]);

  const setBg = (isDark: boolean) => { setDark(isDark); write('ws.bg', isDark ? 'dark' : 'light'); };
  const setHide = (on: boolean) => { setAutoHide(on); write('ws.autohide', on ? '1' : '0'); };

  const pct = Math.round(zoom * 100);
  const hidden = fs && idle;
  const list = tools ?? [];

  return (
    <div
      ref={root}
      className={`se-ws${fs ? ' se-ws-fs' : ''}${fs && !nativeFs.current ? ' se-ws-overlay' : ''}${dark ? ' dark' : ' light'}${className ? ` ${className}` : ''}`}
      data-testid="workspace-root"
      data-atelier={fs ? 'on' : 'off'}
    >
      {!fs && (
        <div className="se-ztool" role="group" aria-label="Zoom de la zone de travail">
          <button type="button" data-z="-" aria-label="Dézoomer" onClick={() => apply(zoom / 1.2)}>−</button>
          <span className="zval" data-testid="zoom-value" aria-live="polite">{pct} %</span>
          <button type="button" data-z="+" aria-label="Zoomer" onClick={() => apply(zoom * 1.2)}>+</button>
          <button type="button" data-z="fit" onClick={() => apply(fit())}>Ajuster</button>
          <button type="button" data-z="1" onClick={() => apply(1)}>100 %</button>
          <button type="button" data-z="fs" data-testid="enter-atelier" onClick={enter} title="Mode atelier — plein écran (F)">
            ⤢ Plein écran
          </button>
          <span className="hint">Ctrl + molette ou pincement pour zoomer · glisser pour déplacer</span>
        </div>
      )}

      {fs && (
        <>
          <div className="se-fsbar" data-hidden={hidden ? 'on' : 'off'} data-testid="atelier-bar">
            <b className="ttl">{title ?? 'Zone de travail'}</b>
            {subtitle && <span className="stp">{subtitle}</span>}
            {indicator != null && <span className="ind">{indicator}</span>}
            {actions != null && <span className="acts">{actions}</span>}
            <div className="sp" />
            <button type="button" className="prefs" onClick={() => setPrefsOpen((v) => !v)} aria-expanded={prefsOpen} title="Confort d'affichage">⚙</button>
            {drawer && (
              <button type="button" data-testid="atelier-drawer-toggle" onClick={() => setDrawerOpen((v) => !v)} aria-expanded={drawerOpen}>
                {drawerTitle}
              </button>
            )}
            <button type="button" className="quit" data-testid="atelier-quit" onClick={leave}>Quitter</button>
            {prefsOpen && (
              <div className="se-fsprefs" role="group" aria-label="Confort d'affichage">
                <button type="button" onClick={() => setBg(!dark)}>
                  Fond : <b>{dark ? 'sombre' : 'clair'}</b>
                </button>
                <button type="button" onClick={() => setHide(!autoHide)}>
                  Masquer les outils : <b>{autoHide ? 'oui' : 'non'}</b>
                </button>
                <span className="k">F : plein écran · Échap : quitter · + / − : zoom · 0 : ajuster</span>
              </div>
            )}
          </div>

          {list.length > 0 && (
            <div className="se-fsrail" data-hidden={hidden ? 'on' : 'off'} role="group" aria-label="Appareils de mesure">
              {list.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-tool={t.id}
                  title={t.name}
                  aria-label={t.name}
                  aria-pressed={activeTool === t.id}
                  className={activeTool === t.id ? 'sel' : undefined}
                  onClick={() => onTool?.(t.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- photos de bibliothèque en data URI */}
                  {t.src ? <img src={t.src} alt="" /> : <span className="ico">{t.icon ?? '🔧'}</span>}
                  <span className="tip">{t.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="se-fszoom" data-hidden={hidden ? 'on' : 'off'} role="group" aria-label="Zoom">
            <button type="button" aria-label="Dézoomer" onClick={() => apply(zoom / 1.2)}>−</button>
            <span className="zval" data-testid="zoom-value" aria-live="polite">{pct} %</span>
            <button type="button" aria-label="Zoomer" onClick={() => apply(zoom * 1.2)}>+</button>
            <button type="button" onClick={() => apply(fit())}>Ajuster</button>
          </div>

          {portrait && (
            <div className="se-fsrotate" role="status">
              Tourne ton téléphone en paysage : tu verras toute la platine.
              <button type="button" onClick={() => setPortrait(false)} aria-label="Fermer">×</button>
            </div>
          )}
        </>
      )}

      <div className={`se-wswrap${dragging ? ' drag' : ''}`} ref={wrap} data-testid="workspace">
        {/* la boîte porte la taille *affichée* : le contenu reste centré et défilable à tout zoom */}
        <div className="se-wsbox" style={{ width: PANEL_W * zoom, height: contentHeight * zoom }}>
          <div className="se-wszoom" style={{ transform: `scale(${zoom})`, visibility: ready ? 'visible' : 'hidden' }}>
            <div className="se-wsinner" style={{ width: PANEL_W, height: contentHeight }}>
              {children}
            </div>
          </div>
        </div>
      </div>

      {fs && drawer && (
        <aside className={`se-fsdrawer${drawerOpen ? ' open' : ''}`} data-testid="atelier-drawer" aria-hidden={!drawerOpen}>
          <div className="hd">
            <b>{drawerTitle}</b>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Fermer le tiroir">×</button>
          </div>
          <div className="bd">{drawer}</div>
        </aside>
      )}
    </div>
  );
}
