/**
 * Géométrie de la platine v3 (560 × 920 unités logiques : armoire 0..720 + bloc récepteurs 734..920).
 * Port fidèle de `docs/reference/illustration-v4.tpl.html` (section « platine geometry »).
 * Aucune dépendance React : ce module est purement calculatoire.
 */
import type {
  AnnexKind, CatalogueItem, NetKind, PupitreItem, SceneKind, Slot, TerminalDef, TpDefinition,
} from '@/lib/types';

export interface Point { x: number; y: number }
export interface Box extends Point { w: number; h: number }

/* ---------------------------------------------------------------- platine */

export const PANEL_W = 560;
/** Hauteur totale de la scène : armoire + bloc récepteurs. */
export const PANEL_H = 920;
/** Hauteur de l'armoire (cadre `.se-cab`), en haut de la scène. */
export const CAB_H = 720;
/** y du haut du bloc récepteurs (pointillés) et sa hauteur. */
export const RECV_Y = 734;
export const RECV_H = PANEL_H - RECV_Y;

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

/* ------------------------------------------------------- coffret de porte */

/**
 * Pupitre historique : voyant vert de marche, voyant rouge de défaut,
 * bouton vert de marche (NO) et bouton rouge d'arrêt (NC).
 * C'est le pupitre de tous les TP qui ne déclarent pas `pupitre`.
 */
export const DEFAULT_PUPITRE: readonly PupitreItem[] = [
  { rep: 'H1', kind: 'lamp', color: 'green', signals: 'run', label: 'voyant de marche' },
  { rep: 'H2', kind: 'lamp', color: 'red', signals: 'trip', label: 'voyant de défaut' },
  { rep: 'S2', kind: 'no', color: 'green', label: 'bouton marche' },
  { rep: 'S1', kind: 'nc', color: 'red', label: 'bouton arrêt' },
];

/** Composition du coffret de porte d'un TP (pupitre historique par défaut). */
export function pupitreOf(tp: Pick<TpDefinition, 'pupitre'>): readonly PupitreItem[] {
  return tp.pupitre && tp.pupitre.length ? tp.pupitre : DEFAULT_PUPITRE;
}

/** Identifiants des deux bornes d'un organe, selon sa nature. */
export function pupitreTermIds(it: PupitreItem): [string, string] {
  if (it.kind === 'lamp') return [`${it.rep}.X1`, `${it.rep}.X2`];
  if (it.kind === 'no') return [`${it.rep}.13`, `${it.rep}.14`];
  return [`${it.rep}.21`, `${it.rep}.22`];
}

/** Hauteur du trou d'un organe (diamètre percé + collerette). */
const PU_H = (it: PupitreItem): number => (it.kind === 'lamp' ? 30 : it.latching ? 40 : 34);
/** Entraxe : hauteur de l'organe + le jeu de perçage habituel. */
const PU_PITCH = (it: PupitreItem): number => (it.kind === 'lamp' ? 42 : it.latching ? 48 : 44);
/** Premier trou, sous le bord haut du coffret. */
const PU_TOP = 14;
/** Respiration entre le groupe des voyants et le groupe des boutons. */
const PU_GAP = 6;
/** Bas utile du coffret : les organes sont comprimés pour y tenir (jusqu'à 5). */
const PU_BOTTOM = ST.h - 8;

/** Un organe du pupitre, placé : `top` et bornes en coordonnées relatives au coffret. */
export interface PupitrePlace {
  item: PupitreItem;
  /** y du haut de l'organe, relatif au coffret. */
  top: number;
  /** Diamètre apparent de l'organe. */
  h: number;
  /** Identifiants et y (relatifs) des deux bornes. */
  terms: [{ id: string; y: number }, { id: string; y: number }];
}

/**
 * Répartit les organes sur la hauteur du coffret, dans l'ordre de la liste.
 * Les entraxes reproduisent exactement le perçage historique à quatre trous ;
 * au-delà, la colonne est comprimée pour rester dans le coffret.
 */
export function pupitreLayout(pupitre: readonly PupitreItem[]): PupitrePlace[] {
  const tops: number[] = [];
  let y = PU_TOP;
  pupitre.forEach((it, i) => {
    tops.push(y);
    const next = pupitre[i + 1];
    y += PU_PITCH(it) + (next && it.kind === 'lamp' && next.kind !== 'lamp' ? PU_GAP : 0);
  });
  const last = pupitre.length - 1;
  const bottom = last < 0 ? PU_TOP : tops[last] + PU_H(pupitre[last]);
  const k = bottom > PU_BOTTOM ? (PU_BOTTOM - PU_TOP) / (bottom - PU_TOP) : 1;
  return pupitre.map((item, i) => {
    const top = Math.round(PU_TOP + (tops[i] - PU_TOP) * k);
    const [a, b] = pupitreTermIds(item);
    return {
      item, top, h: PU_H(item),
      terms: [{ id: a, y: top + 2 }, { id: b, y: top + 16 }],
    };
  });
}

/** Bornes du coffret de porte, sur son bord droit, d'après la composition du pupitre. */
export function pupitreTerminals(pupitre: readonly PupitreItem[]): Record<string, Point> {
  const out: Record<string, Point> = {};
  for (const p of pupitreLayout(pupitre)) {
    for (const t of p.terms) out[t.id] = { x: SR, y: ST.y + t.y };
  }
  return out;
}

/** Bornes du pupitre historique (H1, H2, S2, S1) : référence du studio et du générateur. */
export const STERM: Record<string, Point> = pupitreTerminals(DEFAULT_PUPITRE);

/** Moteur (hors armoire) et sa boîte à bornes : dans le bloc récepteurs, sous la platine. */
export const MOTOR: Point = { x: 40, y: 760 };
export const MOTOR_W = 112;
export const MOTOR_H = 112;
export const TB: Box = { x: 200, y: 770, w: 112, h: 112 };
/** Presse-étoupe de sortie du câble moteur, en bas de l'armoire. */
export const PE_GLAND: Point = { x: TB.x - 30, y: 712 };
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

/** Titre du bloc récepteurs (sous la platine), par scène / annexe. */
export const RECV_TITLE: Record<AnnexKind, string> = {
  door: 'Récepteurs · moteur M1 hors armoire',
  room: 'Récepteurs · pièce',
  local: 'Récepteurs · local',
  roof: 'Récepteurs · charges du logement (autoconsommation)',
};

/**
 * Position absolue d'un élément du bloc récepteurs.
 * Les `RecvItem.x/y` sont relatifs au bloc (comme dans la référence v4).
 */
export const recvBox = (it: { x: number; y: number; w: number; h: number }): Box =>
  ({ x: it.x, y: RECV_Y + it.y, w: it.w, h: it.h });

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
