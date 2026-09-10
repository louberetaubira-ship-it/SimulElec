/**
 * Géométrie de la platine v3 (560 × 720 unités logiques).
 * Port fidèle de `docs/reference/illustration-v3.tpl.html` (section « platine geometry »).
 * Aucune dépendance React : ce module est purement calculatoire.
 */
import type { AnnexKind, CatalogueItem, NetKind, SceneKind, Slot, TerminalDef, TpDefinition } from '@/lib/types';

export interface Point { x: number; y: number }
export interface Box extends Point { w: number; h: number }

/* ---------------------------------------------------------------- platine */

export const PANEL_W = 560;
export const PANEL_H = 720;

/** y du haut de chaque rail DIN ; le centre du rail est à y + 14. */
export const RAILS: readonly number[] = [150, 346, 542];
export const RAIL_H = 28;
/** x de début / fin des rails. */
export const RAIL_X: readonly [number, number] = [48, 384];

/** Goulottes horizontales : [y0, y1] de haut en bas (4 rangées). */
export const DUCTS_H: readonly (readonly [number, number])[] = [
  [46, 74], [242, 270], [438, 466], [634, 662],
];
/** Goulotte verticale gauche : [x0, x1]. */
export const DUCT_L: readonly [number, number] = [12, 38];
/** Goulotte verticale droite : [x0, x1]. */
export const DUCT_R: readonly [number, number] = [392, 418];

/** Axe (centre) de chaque goulotte horizontale. */
export const DUCT_YS: number[] = DUCTS_H.map((d) => (d[0] + d[1]) / 2);
/** Axe (centre) des deux goulottes verticales [gauche, droite]. */
export const DUCT_XS: [number, number] = [
  (DUCT_L[0] + DUCT_L[1]) / 2,
  (DUCT_R[0] + DUCT_R[1]) / 2,
];

export const ductY = (i: number): number => (DUCTS_H[i][0] + DUCTS_H[i][1]) / 2;

/* ------------------------------------------------- colonne de droite */

/** Colonne « porte / annexe » : x ∈ [432, 550]. */
export const ANNEX_X = 432;
export const ANNEX_Y = 20;
export const ANNEX_W = 118;
export const ANNEX_H = 680;

/** Coffret de porte XALD (scène industrielle). */
export const ST: Box = { x: 452, y: 100, w: 78, h: 190 };
/** Bord droit du coffret : x des bornes de la station. */
export const SR = ST.x + ST.w + 2;

/** Bornes du coffret de porte (voyants H1/H2, boutons S2/S1). */
export const STERM: Record<string, Point> = {
  'H1.X1': { x: SR, y: ST.y + 16 },
  'H1.X2': { x: SR, y: ST.y + 30 },
  'H2.X1': { x: SR, y: ST.y + 58 },
  'H2.X2': { x: SR, y: ST.y + 72 },
  'S2.13': { x: SR, y: ST.y + 106 },
  'S2.14': { x: SR, y: ST.y + 120 },
  'S1.21': { x: SR, y: ST.y + 150 },
  'S1.22': { x: SR, y: ST.y + 164 },
};

/** Moteur (hors armoire) et sa boîte à bornes. */
export const MOTOR: Point = { x: 436, y: 462 };
export const MOTOR_W = 112;
export const MOTOR_H = 112;
export const TB: Box = { x: 436, y: 592, w: 112, h: 112 };
const TT = (cx: number, cy: number): Point => ({ x: TB.x + cx, y: TB.y + cy });

/** Bornes basses de la boîte à bornes (U1 V1 W1 + PE). */
export const MTERM: Record<string, Point> = {
  'M.U1': TT(30, 74), 'M.V1': TT(58, 74), 'M.W1': TT(86, 74), 'M.PE': TT(14, 98),
};
/** Bornes hautes (W2 U2 V2). */
export const MT2: Record<string, Point> = {
  'M.W2': TT(30, 40), 'M.U2': TT(58, 40), 'M.V2': TT(86, 40),
};

/** Arrivée réseau, en bas de la platine (presse-étoupes). */
export const RES: Record<string, Point> = {
  'RES.L1': { x: 70, y: 704 },
  'RES.L2': { x: 98, y: 704 },
  'RES.L3': { x: 126, y: 704 },
  'RES.N': { x: 154, y: 704 },
  'RES.PE': { x: 182, y: 704 },
};
/** Bornes réseau visibles selon la scène (mono pour hab / pv). */
export function resIds(scene: SceneKind): string[] {
  return scene === 'pv' || scene === 'hab'
    ? ['RES.L1', 'RES.N', 'RES.PE']
    : Object.keys(RES);
}
/** Étiquette d'une borne réseau (L au lieu de L1 en monophasé). */
export function resLabel(id: string, scene: SceneKind): string {
  if (id === 'RES.L1' && (scene === 'pv' || scene === 'hab')) return 'L';
  return id.split('.')[1];
}

/* ----------------------------------------------------------- automate */

export const PLC: Box = { x: 96, y: 304, w: 200, h: 112 };
export const PLC_IN = ['I0.0', 'I0.1', 'I0.2', 'I0.3', 'I0.4', 'I0.5', 'I0.6', 'I0.7', 'I0.8', '+24', '0V'];
export const PLC_OUT = ['L', 'N', 'COM0', 'Q0.0', 'Q0.1', 'COM1', 'Q0.2', 'Q0.3', 'Q0.4', 'Q0.5', 'Q0.6'];
/** Bornes de l'automate en fractions de sa boîte. */
export const PLC_TERMINALS: TerminalDef[] = [
  ...PLC_IN.map((id, i) => ({ id, fx: (14 + i * 17) / PLC.w, fy: 0.05 })),
  ...PLC_OUT.map((id, i) => ({ id, fx: (14 + i * 17) / PLC.w, fy: 0.95 })),
];

/* ------------------------------------------------------------ couleurs */

export const NET_COLOR: Record<NetKind, string> = {
  L1: '#8B4A2B', L2: '#2B2F36', L3: '#8E979F', N: '#2C7BE5', PE: '#37B34A',
  C: '#E4312B', C0: '#7A3AB8', 'DC+': '#D93A3A', 'DC-': '#20262D',
};

/** Étiquettes des rangées (goulottes) selon la scène. */
export const ROW_LABELS: Record<SceneKind, string[]> = {
  ind: ['goulotte 1', 'goulotte 2', 'goulotte 3', 'goulotte 4'],
  ter: ['goulotte 1', 'goulotte 2', 'goulotte 3', 'goulotte 4'],
  pv: ['coffret DC · 1000 V', 'onduleur · coffret AC', 'AGCP · comptage', 'départ réseau'],
  hab: ['rangée 1 · AGCP · DDR', 'rangée 2 · circuits', 'rangée 3 · bornier', 'arrivée branchement'],
};

/** Titre de la colonne de droite. */
export const ANNEX_TITLE: Record<AnnexKind, string> = {
  door: 'PORTE', room: 'PIÈCE', local: 'LOCAL', roof: 'TOITURE',
};

/* ------------------------------------------------------------ helpers */

/** Position absolue d'une borne d'un appareil posé. */
export const term = (slot: Box, fx: number, fy: number): Point => ({
  x: slot.x + slot.w * fx,
  y: slot.y + slot.h * fy,
});

/** Largeur d'une borne de bornier (échelle réelle, pas de 6 mm). */
export const SMALL_W = 16;

/**
 * Boîte d'un appareil posé.
 * - borne étroite (`small`) : 16 px de large, hauteur proportionnelle ;
 * - annexe (`rail === null` ou position imposée) : x / y / w / h du slot ;
 * - rail : centré sur le rail (`RAILS[rail] + 14 - h / 2`).
 */
export function slotGeom(tp: Pick<TpDefinition, 'rails'>, slot: Slot, item: CatalogueItem): Box {
  const rails = tp.rails && tp.rails.length ? tp.rails : RAILS;
  const small = item.small === true;
  const w = slot.w ?? (small ? SMALL_W : item.w);
  const h = slot.h ?? (small ? Math.round((item.h * SMALL_W) / item.w) : item.h);
  const onRail = slot.rail !== null && slot.rail !== undefined && slot.rail < rails.length;
  const y = onRail ? rails[slot.rail as number] + RAIL_H / 2 - h / 2 : (slot.y ?? ANNEX_Y);
  return { x: slot.x, y, w, h };
}

/** 1 px ≈ 1,1 mm (platine réelle 600 × 800 mm). */
export const PX_MM = 1.1;
