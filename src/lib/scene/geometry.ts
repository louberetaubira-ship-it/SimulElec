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
/**
 * Sur la scène PV, le champ (toiture) est un BLOC DISTINCT au-dessus du coffret :
 * le cadre `.se-cab` ne part donc pas de y=0 mais de `TOIT_TOP`, en laissant un espace
 * franc sous le bloc PV. Les rails du TP sont placés sous cette valeur (rail 0 ≥ TOIT_TOP+104
 * pour que la goulotte de tête reste dans le coffret). Nul sur les autres scènes.
 */
export const TOIT_TOP = 244;
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

/* ------------------------------------------------------- scène d'un TP
 *
 * L'armoire n'a pas toujours la même hauteur. Un appareil de 325 mm — un
 * variateur format book, par exemple — occupe 471 px à l'échelle de la platine :
 * il ne rentre pas dans les 720 px d'origine avec un rail de tête et deux
 * borniers. Plutôt que de le dessiner hors échelle, le TP déclare la hauteur
 * d'armoire dont il a besoin, et tout le reste suit : le bloc récepteurs
 * descend, la scène s'allonge, et les goulottes se replacent sur les rails.
 *
 * Les goulottes ne sont plus des constantes : une goulotte se pose AU-DESSUS de
 * chaque rail, à 104 px de son sommet, et une dernière sous le rail du bas. Des
 * rails écartés emmènent donc leurs goulottes avec eux.
 */

/** Écart entre le sommet d'un rail et le haut de sa goulotte. */
const DUCT_AVANT = 104;
/** Hauteur d'une goulotte. */
const DUCT_EP = 28;
/** Écart entre le sommet du dernier rail et la goulotte de pied. */
const DUCT_PIED = 92;
/** Jeu entre le bas de l'armoire et le haut du bloc récepteurs. */
const JEU_RECV = 14;
/**
 * Jeu quand la platine a des GAINES : il faut la place de les voir.
 *
 * Presse-étoupe + tube + de quoi lire le repère. Sans cela le conduit tomberait
 * dans le bloc récepteurs et passerait derrière le moteur — on ne verrait ni la
 * gaine ni ce qu'elle transporte.
 */
const JEU_GAINE = 78;

export interface SceneGeom {
  /** Hauteur de l'armoire (cadre `.se-cab`). */
  cabH: number;
  /** y du haut du bloc récepteurs, et sa hauteur. */
  recvY: number;
  recvH: number;
  /** Hauteur totale de la scène : armoire + jeu + récepteurs. */
  panelH: number;
  /** y du haut de chaque rail DIN. */
  rails: readonly number[];
  /** Goulottes horizontales, déduites des rails. */
  ducts: readonly (readonly [number, number])[];
}

/**
 * Goulottes d'une platine : une par rail, plus celle de pied.
 *
 * `pied = false` supprime la dernière : sur une platine dont toutes les sorties
 * passent par une gaine déclarée, elle ne dessert plus aucun conducteur.
 */
export function ductsOf(rails: readonly number[], pied = true): [number, number][] {
  const d: [number, number][] = rails.map((r) => [r - DUCT_AVANT, r - DUCT_AVANT + DUCT_EP]);
  if (!pied) return d;
  const bas = rails[rails.length - 1] + DUCT_PIED;
  d.push([bas, bas + DUCT_EP]);
  return d;
}

/** Échelle de la platine : 1 mm d'appareil vaut 1,45 px. */
export const ECHELLE_PX_PAR_MM = 1.45;
/** Largeur à l'écran d'un conduit, à l'échelle des appareils. */
export const gaineW = (diam: number): number => Math.round(diam * ECHELLE_PX_PAR_MM);
/** Hauteur du presse-étoupe, entre la sous-face du coffret et le haut du tube. */
export const GAINE_TETE = 10;
/** Longueur visible du tube sous le presse-étoupe. */
export const GAINE_LEN = 44;

/**
 * Géométrie de la scène d'un TP. Sans déclaration, c'est la platine d'origine :
 * armoire de 720 px, récepteurs à 734, scène de 920.
 */
export function sceneOf(
  tp: Pick<TpDefinition, 'rails' | 'armoire' | 'goulotteDePied' | 'gaines'>,
): SceneGeom {
  const rails = tp.rails && tp.rails.length ? tp.rails : RAILS;
  const cabH = tp.armoire ?? CAB_H;
  const recvY = cabH + (tp.gaines?.length ? JEU_GAINE : JEU_RECV);
  const ducts = ductsOf(rails, tp.goulotteDePied !== false);
  return { cabH, recvY, recvH: RECV_H, panelH: recvY + RECV_H, rails, ducts };
}



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
/*
 * Tout ce qui est HORS ARMOIRE suit la scène, pas une constante.
 *
 * Le moteur, sa plaque à bornes, les presse-étoupes et l'arrivée réseau étaient
 * figés sur l'armoire de 720 px. Dès qu'un TP relève son armoire, ils restaient
 * en arrière et se retrouvaient DANS la platine, tandis que le bloc récepteurs
 * descendait, vide. Les décalages ci-dessous sont ceux de la scène de référence ;
 * ce sont eux qui font foi, pas les ordonnées absolues.
 */
const MOTOR_DY = MOTOR.y - RECV_Y;      //  +26 sous le haut du bloc récepteurs
const TB_DY = TB.y - RECV_Y;            //  +36
const GLAND_DY = PE_GLAND.y - CAB_H;    //   -8 : le presse-étoupe mord le bas de l'armoire
const RES_DY = RES['RES.L1'].y - CAB_H; //  -16 : l'arrivée réseau juste au-dessus

/** Moteur hors armoire, à sa place dans le bloc récepteurs de CETTE scène. */
export const motorOf = (geo: Pick<SceneGeom, 'recvY'>): Point =>
  ({ x: MOTOR.x, y: geo.recvY + MOTOR_DY });
/** Plaque à bornes du moteur, idem. */
export const tbOf = (geo: Pick<SceneGeom, 'recvY'>): Box =>
  ({ ...TB, y: geo.recvY + TB_DY });
/** Presse-étoupe de sortie du câble moteur, en bas de l'armoire de CETTE scène. */
export const glandOf = (geo: Pick<SceneGeom, 'cabH'>): Point =>
  ({ x: PE_GLAND.x, y: geo.cabH + GLAND_DY });
/** Arrivée réseau, en bas de l'armoire de CETTE scène. */
export function resOf(geo: Pick<SceneGeom, 'cabH'>): Record<string, Point> {
  const y = geo.cabH + RES_DY;
  return Object.fromEntries(Object.entries(RES).map(([id, p]) => [id, { x: p.x, y }]));
}
const ttOf = (tb: Box, cx: number, cy: number): Point => ({ x: tb.x + cx, y: tb.y + cy });
/** Bornes basses de la plaque (U1 V1 W1 + PE) dans CETTE scène. */
export function mtermOf(geo: Pick<SceneGeom, 'recvY'>): Record<string, Point> {
  const tb = tbOf(geo);
  return { 'M.U1': ttOf(tb, 30, 74), 'M.V1': ttOf(tb, 58, 74), 'M.W1': ttOf(tb, 86, 74), 'M.PE': ttOf(tb, 14, 98) };
}
/** Bornes hautes (W2 U2 V2) dans CETTE scène. */
export function mt2Of(geo: Pick<SceneGeom, 'recvY'>): Record<string, Point> {
  const tb = tbOf(geo);
  return { 'M.W2': ttOf(tb, 30, 40), 'M.U2': ttOf(tb, 58, 40), 'M.V2': ttOf(tb, 86, 40) };
}

/**
 * Bornes réseau visibles selon la scène (mono pour hab / pv).
 *
 * `mono` force l'arrivée monophasée sur une scène qui ne l'est pas d'office —
 * un tableau d'étage tertiaire, par exemple (voir `TpDefinition.arriveeMono`).
 * `sansPe` retire le presse-étoupe PE : en régime TT la terre vient du piquet de
 * l'usager, pas du réseau (voir `TpDefinition.sansPeReseau`).
 */
export function resIds(scene: SceneKind, mono = false, sansPe = false): string[] {
  const ids = mono || scene === 'pv' || scene === 'hab'
    ? ['RES.L1', 'RES.N', 'RES.PE']
    : Object.keys(RES);
  // Régime TT : le distributeur n'amène pas de PE (voir `TpDefinition.sansPeReseau`).
  return sansPe ? ids.filter((id) => id !== 'RES.PE') : ids;
}
/** Étiquette d'une borne réseau (L au lieu de L1 en monophasé). */
export function resLabel(id: string, scene: SceneKind): string {
  if (id === 'RES.L1' && (scene === 'pv' || scene === 'hab')) return 'L';
  return id.split('.')[1];
}

/* ----------------------------------------------------------- automate */

// Empreinte de l'automate : photo réelle du TM221CE16R (format « book », quasi carré),
// et non plus le dessin large d'avant. Le ratio de la boîte suit celui de la photo pour
// qu'elle la remplisse exactement (object-fit: contain), sans déformation.
export const PLC: Box = { x: 96, y: 304, w: 160, h: 174 };
/**
 * Bornes de l'automate, dans l'ordre de l'appareil.
 *
 * Rangée du haut : les neuf entrées TOR, puis l'alimentation capteurs 24 V / 250 mA.
 * Rangée du bas : l'alimentation 100-240 V, puis les sorties relais GROUPÉES PAR
 * COMMUN — COM0 porte Q0.0 à Q0.3, COM1 porte Q0.4 à Q0.6, et les deux communs ne
 * sont PAS reliés entre eux à l'intérieur de l'appareil (fiche TM221CE16R). C'est
 * l'ordre gravé sur le bornier : un élève qui compte les bornes de gauche à droite
 * doit retrouver sur l'écran ce qu'il a sous les doigts, et le folio doit pouvoir
 * dire de quel commun vient chaque sortie.
 */
export const PLC_IN = ['I0.0', 'I0.1', 'I0.2', 'I0.3', 'I0.4', 'I0.5', 'I0.6', 'I0.7', 'I0.8', '+24', '0V', 'COM'];
export const PLC_OUT = ['L', 'N', 'COM0', 'Q0.0', 'Q0.1', 'Q0.2', 'Q0.3', 'COM1', 'Q0.4', 'Q0.5', 'Q0.6'];
/**
 * Bornes de l'automate en fractions de sa boîte, calées sur les vis RÉELLES de la
 * photo du TM221CE16R (rangée du haut : alim capteurs + entrées ; connecteur vert bas
 * gauche : L/N ; rangée du bas : sorties relais par commun). L'ordre logique des ids
 * ne change pas — seules les positions suivent l'appareil réel.
 */
const PLC_FX: Record<string, [number, number]> = {
  // rangée du haut (ordre gravé : 24V 0V COM I0…I8) — COM non câblé sur ce TP
  '+24': [0.280, 0.095], '0V': [0.342, 0.095], 'COM': [0.405, 0.095],
  'I0.0': [0.467, 0.095], 'I0.1': [0.529, 0.095], 'I0.2': [0.592, 0.095], 'I0.3': [0.654, 0.095],
  'I0.4': [0.716, 0.095], 'I0.5': [0.778, 0.095], 'I0.6': [0.841, 0.095], 'I0.7': [0.903, 0.095], 'I0.8': [0.965, 0.095],
  // alimentation 100-240 V : connecteur vert en bas à gauche
  'L': [0.075, 0.965], 'N': [0.150, 0.965],
  // rangée du bas (ordre gravé : COM0 Q0…Q3 COM1 Q4…Q6)
  'COM0': [0.425, 0.928], 'Q0.0': [0.494, 0.928], 'Q0.1': [0.562, 0.928], 'Q0.2': [0.631, 0.928], 'Q0.3': [0.700, 0.928],
  'COM1': [0.769, 0.928], 'Q0.4': [0.837, 0.928], 'Q0.5': [0.906, 0.928], 'Q0.6': [0.975, 0.928],
};
export const PLC_TERMINALS: TerminalDef[] = [...PLC_IN, ...PLC_OUT].map((id) => {
  const [fx, fy] = PLC_FX[id] ?? [0.5, 0.5];
  return { id, fx, fy };
});

/* ------------------------------------------------------------ couleurs */

export const NET_COLOR: Record<NetKind, string> = {
  L1: '#8B4A2B', L2: '#2B2F36', L3: '#8E979F', N: '#2C7BE5', PE: '#37B34A',
  C: '#E4312B', C0: '#7A3AB8', 'DC+': '#D93A3A', 'DC-': '#20262D', BAR: '#C9A34A',
};

/** Étiquettes des rangées (goulottes) selon la scène. */
export const ROW_LABELS: Record<SceneKind, string[]> = {
  ind: ['goulotte 1', 'goulotte 2', 'goulotte 3', 'goulotte 4'],
  ter: ['goulotte 1', 'goulotte 2', 'goulotte 3', 'goulotte 4'],
  pv: ['Coffret DC · Q2·PF1·F1·MPPT·Q1·FB', 'Onduleur MultiPlus · différentiel Q3', 'Tableau de répartition X1', 'Pied de coffret · presse-étoupes (arrivées par le bas)'],
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
  roof: 'Parc batteries · 4 × 12 V couplées 2S2P → 24 V · 1200 Ah (hors coffret)',
};

/**
 * Position absolue d'un élément du bloc récepteurs.
 * Les `RecvItem.x/y` sont relatifs au bloc (comme dans la référence v4).
 */
export const recvBox = (it: { x: number; y: number; w: number; h: number }): Box =>
  ({ x: it.x, y: RECV_Y + it.y, w: it.w, h: it.h });

/** Idem, mais dans le bloc récepteurs de CETTE scène (armoire de hauteur variable). */
export const recvBoxOf = (
  geo: Pick<SceneGeom, 'recvY'>,
  it: { x: number; y: number; w: number; h: number },
): Box => ({ x: it.x, y: geo.recvY + it.y, w: it.w, h: it.h });

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
  const y = onRail
    ? rails[slot.rail as number] + RAIL_H / 2 - h / 2 + (slot.dy ?? 0)
    : (slot.y ?? ANNEX_Y);
  return { x: slot.x, y, w, h };
}

/** 1 px ≈ 1,1 mm (platine réelle 600 × 800 mm). */
export const PX_MM = 1.1;
