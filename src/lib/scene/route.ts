/**
 * Cheminement des conducteurs (goulottes, peignes, nappes ordonnées).
 * Port fidèle de `route0raw` / `simplify` / `planLanes` / `route` / `pathD` / `stubs` / `wireLen`
 * de `docs/reference/illustration-v3.tpl.html` (voir SPEC-v3 §3).
 *
 * Règles :
 *  - sortie de borne verticale vers la goulotte la plus proche (borne haute → goulotte du dessus) ;
 *  - changement de rangée par la goulotte verticale la plus courte ;
 *  - dans chaque goulotte, les nappes sont ordonnées par profondeur d'imbrication
 *    (fils courts près du bord, fils longs au fond) : aucun croisement dans le groupe ;
 *  - fils extérieurs : porte (trunk `SR+20`), moteur (presse-étoupe), réseau (goulotte 4).
 */
import type { AnnexKind, AnnexItem, CatalogueItem, Slot, TerminalDef, TpDefinition } from '@/lib/types';
import {
  DUCTS_H, DUCT_L, DUCT_R, DUCT_XS, PX_MM, SR, ST,
  mt2Of, mtermOf, pupitreOf, pupitreTerminals, recvBoxOf, resOf, sceneOf, slotGeom, tbOf,
  term, type Box, type Point, type SceneGeom,
} from './geometry';

/* ------------------------------------------------------------- contexte */

/** Un appareil posé, avec sa géométrie résolue et ses bornes. */
export interface ResolvedSlot extends Box {
  id: string;
  key: string;
  rail: number | null;
  terminals: TerminalDef[];
  slot: Slot;
  item: CatalogueItem;
}

export type ExtKind = 'door' | 'motor' | 'res' | 'recv';

/** Borne extérieure à la platine (coffret de porte, moteur, réseau, annexe). */
export interface ExtPoint extends Point {
  ext: ExtKind;
  /** Élément libre en annexe (pièce / local / toiture) : trunk à x = 546. */
  free?: boolean;
  /** Borne du bandeau toiture (module PV ou boîte de jonction) : routage dédié
   *  (série en saut court, départs/retours rangés en couloirs), pas de trunk droit. */
  roof?: boolean;
}

export interface SceneCtx {
  slots: ResolvedSlot[];
  annex: AnnexKind;
  extra: Record<string, ExtPoint>;
  /**
   * Géométrie de CETTE scène : rails, goulottes, hauteur d'armoire. Le cheminement
   * s'y réfère au lieu des constantes — sur une armoire relevée, les goulottes ne
   * sont plus là où les constantes les plaçaient.
   */
  geo: SceneGeom;
}

/** Position résolue d'une borne. */
export interface TPos extends Point {
  ext?: ExtKind;
  free?: boolean;
  roof?: boolean;
  top?: boolean;
  slot?: ResolvedSlot;
}

/** Liaison à router : couple d'identifiants de bornes. */
export type WirePair = [string, string];

export interface LanePlan {
  /** clé « idx:segment » → décalage de nappe dans la goulotte. */
  lanes: Record<string, { x?: number; y?: number }>;
  /** longueur développée en px par index de liaison. */
  len: Record<number, number>;
}

export const emptyPlan = (): LanePlan => ({ lanes: {}, len: {} });

/* ---------------------------------------------------- résolution du décor */

/** Bornes d'un élément d'annexe, sur son bord droit (X1 / X2), ou bornes propres au combiner. */
export function annexTerminals(it: AnnexItem): Record<string, ExtPoint> {
  // Boîte de jonction (combiner) : entrées sur le bord GAUCHE (face aux modules) —
  // 4 fusibles F1..F4 puis le bus M (retour −) ; sortie bus P+ sur le bord droit,
  // qui redescend vers Q2 (coffret dessous).
  if (it.key === 'combiner') {
    return {
      [`${it.rep}.F1`]: { x: it.x, y: it.y + it.h * 0.16, ext: 'door', free: true, roof: true },
      [`${it.rep}.F2`]: { x: it.x, y: it.y + it.h * 0.34, ext: 'door', free: true, roof: true },
      [`${it.rep}.F3`]: { x: it.x, y: it.y + it.h * 0.52, ext: 'door', free: true, roof: true },
      [`${it.rep}.F4`]: { x: it.x, y: it.y + it.h * 0.70, ext: 'door', free: true, roof: true },
      [`${it.rep}.M`]: { x: it.x, y: it.y + it.h * 0.88, ext: 'door', free: true, roof: true },
      [`${it.rep}.P`]: { x: it.x + it.w, y: it.y + it.h * 0.5, ext: 'door', free: true },
    };
  }
  // Module PV : + (X1) en HAUT-GAUCHE, − (X2) en HAUT-DROITE (disposition réelle d'un
  // module, plus pratique au câblage). La série relie le − d'un module au + du suivant
  // par un saut court le long du HAUT, et les départs/retours remontent au-dessus.
  if (it.key === 'pvpanel') {
    return {
      [`${it.rep}.X1`]: { x: it.x + it.w * 0.14, y: it.y, ext: 'door', free: true, roof: true },
      [`${it.rep}.X2`]: { x: it.x + it.w * 0.86, y: it.y, ext: 'door', free: true, roof: true },
    };
  }
  // Parc batterie (et autres annexes) : bornes X1 / X2 sur le bord droit.
  return {
    [`${it.rep}.X1`]: { x: it.x + it.w, y: it.y + it.h * 0.35, ext: 'door', free: true },
    [`${it.rep}.X2`]: { x: it.x + it.w, y: it.y + it.h * 0.7, ext: 'door', free: true },
  };
}

/** Bornes X1 / X2 d'un récepteur du bloc du bas, sur son bord haut. */
export function recvTerminals(geo: Pick<SceneGeom, 'recvY'>, it: AnnexItem): Record<string, ExtPoint> {
  const b = recvBoxOf(geo, it);
  // Batteries du parc (bloc du bas, hors coffret) : + (X1) au bord haut-GAUCHE, − (X2)
  // au bord haut-DROIT → la mise en série (− d'une → + de la voisine) est un saut court.
  if (it.key === 'battery') {
    return {
      [`${it.rep}.X1`]: { x: b.x + b.w * 0.16, y: b.y, ext: 'recv' },
      [`${it.rep}.X2`]: { x: b.x + b.w * 0.84, y: b.y, ext: 'recv' },
    };
  }
  // Récepteur de classe I : la masse se raccorde. Trois bornes réparties sur le
  // bord haut — phase coupée, neutre, terre — au lieu des deux habituelles.
  if (it.pe) {
    return {
      [`${it.rep}.X1`]: { x: b.x + b.w * 0.25, y: b.y, ext: 'recv' },
      [`${it.rep}.X2`]: { x: b.x + b.w * 0.5, y: b.y, ext: 'recv' },
      [`${it.rep}.PE`]: { x: b.x + b.w * 0.75, y: b.y, ext: 'recv' },
    };
  }
  return {
    [`${it.rep}.X1`]: { x: b.x + b.w * 0.34, y: b.y, ext: 'recv' },
    [`${it.rep}.X2`]: { x: b.x + b.w * 0.66, y: b.y, ext: 'recv' },
  };
}

/** x du presse-étoupe qui dessert une borne du bloc récepteurs (bas de l'armoire). */
export const recvGlandX = (x: number): number => Math.max(46, Math.min(536, Math.round(x)));

/** Bornes extérieures d'un TP : coffret de porte, moteur, réseau, éléments d'annexe. */
export function externalPoints(
  tp: Pick<TpDefinition, 'station' | 'pupitre' | 'hasMotor' | 'annexItems' | 'recvItems'>,
  geo: SceneGeom,
): Record<string, ExtPoint> {
  const out: Record<string, ExtPoint> = {};
  if (tp.station) {
    for (const [id, p] of Object.entries(pupitreTerminals(pupitreOf(tp)))) out[id] = { ...p, ext: 'door' };
  }
  if (tp.hasMotor) {
    for (const [id, p] of Object.entries(mtermOf(geo))) out[id] = { ...p, ext: 'motor' };
    for (const [id, p] of Object.entries(mt2Of(geo))) out[id] = { ...p, ext: 'motor' };
  }
  for (const [id, p] of Object.entries(resOf(geo))) out[id] = { ...p, ext: 'res' };
  for (const it of tp.annexItems ?? []) Object.assign(out, annexTerminals(it));
  for (const it of tp.recvItems ?? []) Object.assign(out, recvTerminals(geo, it));
  return out;
}

/** Construit le contexte de scène à partir d'un TP et de son catalogue résolu. */
export function sceneContext(tp: TpDefinition, items: Record<string, CatalogueItem>): SceneCtx {
  const slots: ResolvedSlot[] = [];
  for (const s of tp.slots) {
    const item = items[s.key];
    if (!item) continue;
    const g = slotGeom(tp, s, item);
    slots.push({ ...g, id: s.id, key: s.key, rail: s.rail, terminals: item.terminals, slot: s, item });
  }
  const geo = sceneOf(tp);
  return { slots, annex: tp.annex, extra: externalPoints(tp, geo), geo };
}

/* ------------------------------------------------------------- position */

/** Position d'une borne « slot.borne » ou d'une borne extérieure (RES.L1, M.U1, S1.21, PV1.X1…). */
export function tpos(ctx: SceneCtx, id: string): TPos | null {
  const e = ctx.extra[id];
  if (e) return { x: e.x, y: e.y, ext: e.ext, free: e.free, roof: e.roof };
  const dot = id.indexOf('.');
  if (dot < 0) return null;
  const sid = id.slice(0, dot), tid = id.slice(dot + 1);
  const s = ctx.slots.find((x) => x.id === sid);
  if (!s) return null;
  const t = s.terminals.find((x) => x.id === tid);
  if (!t) return null;
  const p = term(s, t.fx, t.fy);
  if (s.rail === null || s.rail === undefined || s.rail >= ctx.geo.rails.length) {
    return { ...p, ext: 'door', free: true };
  }
  return { ...p, top: t.fy < 0.5, slot: s };
}

/** Index de la goulotte horizontale desservant une borne (haut du rail → goulotte du dessus). */
function ductFor(p: TPos): number | null {
  if (!p.slot || p.slot.rail === null || p.slot.rail === undefined) return null;
  const r = p.slot.rail;
  return p.top ? r : r + 1;
}

/* --------------------------------------------------------- cheminement */

type Pt = [number, number];

/** Supprime les points confondus puis les points alignés (colinéaires). */
export function simplify(pts: Pt[]): Pt[] {
  const o: Pt[] = [];
  for (const p of pts) {
    const l = o[o.length - 1];
    if (l && Math.abs(l[0] - p[0]) < 0.01 && Math.abs(l[1] - p[1]) < 0.01) continue;
    o.push([p[0], p[1]]);
  }
  for (let i = 1; i < o.length - 1;) {
    const a = o[i - 1], b = o[i], c = o[i + 1];
    if ((Math.abs(a[0] - b[0]) < 0.01 && Math.abs(b[0] - c[0]) < 0.01)
      || (Math.abs(a[1] - b[1]) < 0.01 && Math.abs(b[1] - c[1]) < 0.01)) o.splice(i, 1);
    else i++;
  }
  return o;
}

/** Axe d'une goulotte horizontale de CETTE scène. */
const dY = (ctx: SceneCtx, i: number): number => {
  const d = ctx.geo.ducts[Math.min(i, ctx.geo.ducts.length - 1)];
  return (d[0] + d[1]) / 2;
};
/** Goulotte de pied : la dernière, celle qui dessert les presse-étoupes. */
const dPied = (ctx: SceneCtx): number => dY(ctx, ctx.geo.ducts.length - 1);

/**
 * Cheminement dans le bandeau TOITURE (module ↔ module ou module ↔ boîte de jonction).
 * Ne funnel PLUS tout au bord droit : la série est un saut court dans l'écart entre
 * panneaux, et les départs (+ → fusible) / retours (− → bus M) sont rangés dans des
 * couloirs au-dessus (+) et en dessous (−) de la rangée, décalés pour ne pas se croiser.
 */
function roofRoute(A: TPos, B: TPos, aId: string, bId: string): Pt[] {
  const isPV = (id: string) => /^PV\d+\./.test(id);
  // Série module ↔ module : Z court, le segment vertical tombe dans l'écart entre les deux.
  if (isPV(aId) && isPV(bId)) {
    const mx = (A.x + B.x) / 2;
    return [[A.x, A.y], [mx, A.y], [mx, B.y], [B.x, B.y]];
  }
  // Départ / retour module ↔ boîte de jonction.
  const pvA = isPV(aId);
  const P = pvA ? A : B;                 // borne du module
  const J = pvA ? B : A;                 // borne de la boîte de jonction
  const pId = pvA ? aId : bId;
  const plus = /\.X1$/.test(pId);        // X1 = + (haut-gauche) ; X2 = − (haut-droite)
  // Les DEUX bornes sont en haut du module : + et − remontent AU-DESSUS de la rangée,
  // puis filent vers la boîte de jonction (fusible pour +, bus M pour −). Couloirs
  // distincts (− un cran plus haut que +), décalés pour ne pas se croiser.
  const side = plus ? P.x - 6 : P.x + 6; // sortie latérale (+ à gauche, − à droite)
  const base = plus ? 16 : 30;
  const spread = plus ? (J.y - 40) * 0.05 : (P.x - 40) * 0.03;
  const laneY = P.y - (base + Math.max(0, spread));
  const full: Pt[] = [[P.x, P.y], [side, P.y], [side, laneY], [J.x, laneY], [J.x, J.y]];
  return pvA ? full : full.reverse();
}

/** Cheminement brut, orthogonal, avant ordonnancement des nappes. */
function route0raw(ctx: SceneCtx, a: string, b: string): Pt[] | null {
  const A = tpos(ctx, a), B = tpos(ctx, b);
  if (!A || !B) return null;
  // Bandeau toiture : les deux bornes y sont libres → routage dédié (jamais le trunk droit).
  if (A.roof && B.roof) return roofRoute(A, B, a, b);
  const pts: Pt[] = [];
  const push = (x: number, y: number) => { pts.push([x, y]); };
  const pickVx = (x: number, ax: number | null, bx: number): number => {
    const l = DUCT_XS[0], rr = DUCT_XS[1];
    if (ax == null) return x > 210 ? rr : l;
    return (Math.abs(ax - l) + Math.abs(bx - l)) <= (Math.abs(ax - rr) + Math.abs(bx - rr)) ? l : rr;
  };

  // deux bornes extérieures : liaison directe en fond de porte
  if (A.ext && B.ext) {
    const tx = (A.free || B.free) ? 546 : A.x + 12;
    push(A.x, A.y); push(tx, A.y); push(tx, B.y); push(B.x, B.y);
    return pts;
  }

  // une borne extérieure
  if (A.ext || B.ext) {
    const P = A.ext ? B : A, E = A.ext ? A : B;
    const ext = E.ext;
    const d = ductFor(P);
    if (d === null) return null;
    const y = dY(ctx, d);
    if (ext === 'res') {
      push(P.x, P.y); push(P.x, dPied(ctx)); push(E.x, dPied(ctx)); push(E.x, E.y);
      return A.ext ? pts.reverse() : pts;
    }
    if (ext === 'motor' || ext === 'recv') {
      // borne → goulotte la plus proche → goulotte 4 → descente par le presse-étoupe → récepteur
      push(P.x, P.y); push(P.x, y);
      const xin = ext === 'motor'
        ? tbOf(ctx.geo).x - 30 + Math.round((E.x - tbOf(ctx.geo).x) / 28) * 4
        : recvGlandX(E.x);
      if (Math.abs(y - dPied(ctx)) > 0.5) {
        const vxr = DUCT_XS[1];
        push(vxr, y); push(vxr, dPied(ctx));
      }
      push(xin, dPied(ctx)); push(xin, E.y); push(E.x, E.y);
      return A.ext ? pts.reverse() : pts;
    }
    // 'door' : coffret de porte et éléments d'annexe (free)
    push(P.x, P.y); push(P.x, y);
    const vxr = DUCT_XS[1];
    push(vxr, y);
    const hy = E.free ? dPied(ctx) : ST.y + ST.h + 20;
    const tx = E.free ? 546 : SR + 20;
    push(vxr, hy); push(tx, hy); push(tx, E.y); push(E.x, E.y);
    return A.ext ? pts.reverse() : pts;
  }

  // deux bornes sur la platine
  const da = ductFor(A), db = ductFor(B);
  if (da === null || db === null) return null;
  push(A.x, A.y); push(A.x, dY(ctx, da));
  if (da === db) {
    push(B.x, dY(ctx, db));
  } else {
    const x = pickVx((A.x + B.x) / 2, A.x, B.x);
    push(x, dY(ctx, da)); push(x, dY(ctx, db)); push(B.x, dY(ctx, db));
  }
  push(B.x, B.y);
  return pts;
}

function route0(ctx: SceneCtx, a: string, b: string): Pt[] | null {
  const r = route0raw(ctx, a, b);
  return r ? simplify(r) : r;
}

interface Seg { i: number; k: number; x0: number; x1: number }

/** Profondeur d'imbrication : fils courts près du bord, fils longs au fond. */
function depth(list: Seg[]): Record<string, number> {
  const sorted = [...list].sort((a, b) => (a.x1 - a.x0) - (b.x1 - b.x0));
  const D: Record<string, number> = {};
  for (const w of sorted) {
    let d = 0;
    for (const o of sorted) {
      if (o === w) continue;
      const dv = D[`${o.i}:${o.k}`];
      if (dv == null) continue;
      if (o.x0 < w.x1 && w.x0 < o.x1) d = Math.max(d, dv + 1);
    }
    D[`${w.i}:${w.k}`] = d;
  }
  return D;
}

/** Calcule les nappes de toutes les liaisons ainsi que leur longueur développée. */
export function planLanes(ctx: SceneCtx, wires: WirePair[]): LanePlan {
  const plan = emptyPlan();
  const H = ctx.geo.ducts.map(() => ({ top: [] as Seg[], bot: [] as Seg[], mid: [] as Seg[] }));
  const V: [Seg[], Seg[]] = [[], []];
  const dy = ctx.geo.ducts.map((d) => (d[0] + d[1]) / 2), vx = DUCT_XS;

  wires.forEach((w, i) => {
    const r = route0(ctx, w[0], w[1]);
    if (!r || r.length < 2) return;
    plan.len[i] = r.reduce((acc, p, k) => (k ? acc + Math.hypot(p[0] - r[k - 1][0], p[1] - r[k - 1][1]) : 0), 0);
    for (let k = 0; k < r.length - 1; k++) {
      const p = r[k], q = r[k + 1];
      if (Math.abs(p[1] - q[1]) < 0.01) {
        const d = dy.findIndex((y) => Math.abs(y - p[1]) < 0.5);
        if (d < 0) continue;
        const prev = r[k - 1], next = r[k + 2];
        const ft = prev ? prev[1] < p[1] : null;
        const tt = next ? next[1] < q[1] : null;
        const side: 'top' | 'bot' | 'mid' =
          (ft === true && tt !== false) || (tt === true && ft !== false) ? 'top'
            : (ft === false && tt !== true) || (tt === false && ft !== true) ? 'bot' : 'mid';
        H[d][side].push({ i, k, x0: Math.min(p[0], q[0]), x1: Math.max(p[0], q[0]) });
      } else if (Math.abs(p[0] - q[0]) < 0.01) {
        const sd = vx.findIndex((x) => Math.abs(x - p[0]) < 0.5);
        if (sd < 0) continue;
        V[sd].push({ i, k, x0: Math.min(p[1], q[1]), x1: Math.max(p[1], q[1]) });
      }
    }
  });

  const lane = (key: string) => (plan.lanes[key] = plan.lanes[key] || {});
  const step = 3.2, pad = 4.5;

  H.forEach((g, d) => {
    const h = ctx.geo.ducts[d][1] - ctx.geo.ducts[d][0];
    const cap = Math.floor((h - 2 * pad) / step);
    for (const [key, dd] of Object.entries(depth(g.top))) {
      lane(key).y = ctx.geo.ducts[d][0] + pad + Math.min(dd, cap) * step;
    }
    for (const [key, dd] of Object.entries(depth(g.bot))) {
      lane(key).y = ctx.geo.ducts[d][1] - pad - Math.min(dd, cap) * step;
    }
    const md = depth(g.mid);
    const nm = Object.keys(md).length;
    for (const [key, dd] of Object.entries(md)) {
      lane(key).y = dy[d] + (dd - (nm - 1) / 2) * step;
    }
  });

  V.forEach((list, sd) => {
    const dd = depth(list);
    const n = Object.keys(dd).length;
    for (const [key, d] of Object.entries(dd)) {
      lane(key).x = vx[sd] + (Math.min(d, 5) - Math.min(n - 1, 5) / 2) * 3;
    }
  });

  return plan;
}

/** Cheminement final d'une liaison, nappes appliquées. */
export function route(ctx: SceneCtx, plan: LanePlan, a: string, b: string, idx = 0): Point[] | null {
  const r = route0(ctx, a, b);
  if (!r) return null;
  if (r.length < 3) return r.map(([x, y]) => ({ x, y }));
  const dy = ctx.geo.ducts.map((d) => (d[0] + d[1]) / 2), vx = DUCT_XS;
  const out: Pt[] = r.map((p) => [p[0], p[1]]);
  for (let k = 0; k < r.length - 1; k++) {
    const p = r[k], q = r[k + 1];
    const L = plan.lanes[`${idx}:${k}`];
    if (!L) continue;
    if (Math.abs(p[1] - q[1]) < 0.01 && L.y != null && dy.some((y) => Math.abs(y - p[1]) < 0.5)) {
      out[k][1] = L.y; out[k + 1][1] = L.y;
    }
    if (Math.abs(p[0] - q[0]) < 0.01 && L.x != null && vx.some((x) => Math.abs(x - p[0]) < 0.5)) {
      out[k][0] = L.x; out[k + 1][0] = L.x;
    }
  }
  out[0] = [r[0][0], r[0][1]];
  out[out.length - 1] = [r[r.length - 1][0], r[r.length - 1][1]];
  // les brins d'entrée / sortie restent verticaux (peigne)
  if (out.length > 2) {
    if (r[1][0] === r[0][0]) out[1][0] = r[0][0];
    if (r[r.length - 2][0] === r[r.length - 1][0]) out[out.length - 2][0] = r[r.length - 1][0];
  }
  return out.map(([x, y]) => ({ x, y }));
}

/** Chemin SVG avec angles adoucis. */
export function pathD(pts: Point[] | null): string {
  if (!pts || !pts.length) return '';
  let d = '';
  const r = 6;
  for (let i = 0; i < pts.length; i++) {
    const { x, y } = pts[i];
    if (i === 0) { d += `M${x} ${y}`; continue; }
    const prev = pts[i - 1];
    const nxt = pts[i + 1];
    if (nxt) {
      const dx1 = Math.sign(x - prev.x), dy1 = Math.sign(y - prev.y);
      const dx2 = Math.sign(nxt.x - x), dy2 = Math.sign(nxt.y - y);
      const l1 = Math.hypot(x - prev.x, y - prev.y), l2 = Math.hypot(nxt.x - x, nxt.y - y);
      const rr = Math.min(r, l1 / 2, l2 / 2);
      d += ` L${x - dx1 * rr} ${y - dy1 * rr} Q${x} ${y} ${x + dx2 * rr} ${y + dy2 * rr}`;
    } else d += ` L${x} ${y}`;
  }
  return d;
}

/** Brins visibles couvercles fermés : premier et dernier segment. */
export function stubs(pts: Point[] | null): [Point, Point][] {
  if (!pts || pts.length < 2) return [];
  return [[pts[0], pts[1]], [pts[pts.length - 2], pts[pts.length - 1]]];
}

/**
 * Portion du cheminement hors platine (porte, moteur, réseau, bloc récepteurs) :
 * dessinée au-dessus des couvercles. Le point d'entrée dans la goulotte est conservé
 * pour que la descente vers le presse-étoupe reste raccordée.
 */
export function externalPart(pts: Point[] | null, pied = DUCTS_H[3][1]): Point[] {
  if (!pts) return [];
  const out = (p: Point) => p.x > DUCT_R[1] || p.y > pied;
  return pts.filter((p, i) => out(p) || (i > 0 && out(pts[i - 1])) || (i < pts.length - 1 && out(pts[i + 1])));
}

/** Longueur d'une liaison, en mètres (1 px ≈ 1,1 mm). */
export function wireLength(plan: LanePlan, idx: number): number {
  return ((plan.len[idx] || 0) * PX_MM) / 1000;
}

/** Longueur totale des liaisons planifiées, en mètres. */
export function totalLength(plan: LanePlan): number {
  return Object.keys(plan.len).reduce((a, k) => a + wireLength(plan, Number(k)), 0);
}

export { DUCT_L, DUCT_R };
