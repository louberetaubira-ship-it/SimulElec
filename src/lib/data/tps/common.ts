/**
 * Briques communes aux 13 TP : borniers X1 / X2, constructeur de liaison,
 * garnitures d'annexe (pièce, local, toiture) et tests hors tension récurrents.
 * Positions portées de `docs/reference/illustration-v3.tpl.html` (`X1`, `X2`, `ANNEX`).
 */
import type { AnnexItem, Liaison, NetKind, Slot, TerminalNet, TestHorsTension } from '@/lib/types';

/** Bornier de puissance X1 : 9 bornes (L1 L2 L3 N PE · U V W PE), pas de 18 px, jeu de 8 px après le PE. */
export function X1(x0: number, rail = 2): Slot[] {
  const rows: [string, string, string, string][] = [
    ['x1_1', 'termred', '1', 'L1'], ['x1_2', 'termred', '2', 'L2'], ['x1_3', 'termred', '3', 'L3'],
    ['x1_4', 'termblue', '4', 'N'], ['x1_5', 'earth', '5', 'PE'], ['x1_6', 'termred', '6', 'U'],
    ['x1_7', 'termred', '7', 'V'], ['x1_8', 'termred', '8', 'W'], ['x1_9', 'earth', '9', 'PE'],
  ];
  return rows.map(([id, key, mark, sub], i) => ({
    id,
    label: `X1:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18 + (i >= 5 ? 8 : 0),
    mark,
    sub,
    group: 'X1',
    ...(i === 0 ? { groupLabel: 'X1 · bornier puissance' } : {}),
  }));
}

/** Repérages par défaut des bornes de commande (référence). */
const X2_SUBS = ['S1', 'S1/S2', 'S2', 'H1', 'H2', '0V'];

export interface X2Options {
  /** Bornier d'appartenance (« X2 » par défaut ; « X1 » pour les scènes habitat / tertiaire / PV). */
  group?: string;
  /** Repérages sous chaque borne (remplace les repérages par défaut). */
  subs?: string[];
  groupLabel?: string;
}

/** Bornier compact : n bornes de 16 px au pas de 18 px à partir de `x0`. */
export function X2(x0: number, n: number, rail = 2, opts: X2Options = {}): Slot[] {
  const group = opts.group ?? 'X2';
  const subs = opts.subs ?? X2_SUBS;
  const label = opts.groupLabel ?? (group === 'X2' ? 'X2 · bornier commande' : 'X1 · bornier');
  return Array.from({ length: n }, (_, i) => ({
    id: `x2_${i + 1}`,
    label: `${group}:${i + 1}`,
    key: 'termgrey',
    rail,
    x: x0 + i * 18,
    mark: String(i + 1),
    sub: subs[i] ?? '',
    group,
    ...(i === 0 ? { groupLabel: label } : {}),
  }));
}

/** Constructeur de liaison : `L('a', 'b', 'L1')`, `'door'` = en porte, `'pre'` = câblage installateur. */
export function L(a: string, b: string, net: NetKind, flag?: 'door' | 'pre'): Liaison {
  return { a, b, net, door: flag === 'door', prewired: flag === 'pre' };
}

/* --------------------------------------------------------------- annexes */

/**
 * Pièce d'habitation (scène `hab`) : colonne de droite.
 * Les récepteurs (hublot, chauffe-eau, VMC) sont descendus dans `ROOM_RECV`.
 */
export const ROOM_ITEMS: AnnexItem[] = [
  { key: 'l_commande_interrupteur_va_et_vient', rep: 'S1', name: 'interrupteur va-et-vient', x: 452, y: 60, w: 44, h: 44 },
  { key: 'l_commande_interrupteur_va_et_vient', rep: 'S2', name: 'interrupteur va-et-vient', x: 502, y: 60, w: 44, h: 44 },
  { key: 'l_commande_prise_de_courant', rep: 'PC1', name: 'prise 16 A 2P+T', x: 452, y: 210, w: 44, h: 44 },
  { key: 'l_commande_prise_de_courant', rep: 'PC2', name: 'prise 16 A 2P+T', x: 502, y: 210, w: 44, h: 44 },
  { key: 'l_commande_interrupteur', rep: 'BP', name: 'bouton poussoir télérupteur', x: 502, y: 520, w: 40, h: 40 },
];

/**
 * Local tertiaire (scène `ter`) : colonne de droite.
 * Les récepteurs (réglettes, BAES) sont descendus dans `LOCAL_RECV`.
 */
export const LOCAL_ITEMS: AnnexItem[] = [
  { key: 'l_commande_detecteur', rep: 'B1', name: 'détecteur de présence', x: 470, y: 170, w: 40, h: 48 },
  { key: 'l_commande_interrupteur', rep: 'S1', name: 'interrupteur dérogation', x: 470, y: 330, w: 40, h: 40 },
  { key: 'l_alarmes_detecteur_manuel', rep: 'DM', name: 'déclencheur manuel', x: 474, y: 400, w: 36, h: 36 },
];

/* ------------------------------------------------- bloc récepteurs (bas) */

/** Marque un élément comme récepteur du bloc du bas (x / y relatifs au bloc). */
const R = (it: Omit<AnnexItem, 'recv'>): AnnexItem => ({ ...it, recv: true });

/** Récepteurs d'une pièce d'habitation (scène `hab`). */
export const ROOM_RECV: AnnexItem[] = [
  R({ key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'point lumineux DCL', x: 40, y: 34, w: 60, h: 60 }),
  R({ key: 'l_recepteu_chauffe_eau', rep: 'CE', name: 'chauffe-eau 2000 W', x: 150, y: 22, w: 50, h: 104 }),
  R({ key: 'l_recepteu_vmc2', rep: 'VMC', name: 'VMC simple flux', x: 250, y: 30, w: 70, h: 86 }),
  R({ key: 'l_recepteu_convecteur', rep: 'R1', name: 'convecteur 1500 W', x: 360, y: 50, w: 150, h: 70 }),
];

/** Récepteurs d'un local tertiaire (scène `ter`). */
export const LOCAL_RECV: AnnexItem[] = [
  R({ key: 'l_architec_tube_fluorescent_x2', rep: 'E1', name: 'réglette LED 2×36 W', x: 30, y: 40, w: 150, h: 40 }),
  R({ key: 'l_architec_tube_fluorescent_x2', rep: 'E2', name: 'réglette LED 2×36 W', x: 200, y: 40, w: 150, h: 40 }),
  R({ key: 'l_alarmes_baes', rep: 'E3', name: 'BAES 45 lm', x: 380, y: 36, w: 110, h: 56 }),
];

/** Charges du logement alimentées par l'installation PV (scène `pv`). */
export const ROOF_RECV: AnnexItem[] = [
  R({ key: 'l_recepteu_chauffe_eau', rep: 'CE', name: 'chauffe-eau', x: 60, y: 22, w: 50, h: 104 }),
  R({ key: 'l_recepteu_convecteur', rep: 'R1', name: 'convecteur', x: 160, y: 50, w: 150, h: 70 }),
  R({ key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'éclairage', x: 360, y: 34, w: 60, h: 60 }),
];

/** Toiture : 2 strings de 4 modules (scène `pv`). */
export const ROOF_ITEMS: AnnexItem[] = [
  ...[0, 1].flatMap((r) => [0, 1].map((c) => ({
    key: 'pvpanel', rep: `PV${r * 2 + c + 1}`, name: 'module 375 Wc mono',
    x: 446 + c * 52, y: 40 + r * 88, w: 48, h: 80,
  }))),
  { key: 'pvpanel', rep: 'PV5', name: 'module 375 Wc mono', x: 446, y: 216, w: 48, h: 80 },
  { key: 'pvpanel', rep: 'PV6', name: 'module 375 Wc mono', x: 498, y: 216, w: 48, h: 80 },
  { key: 'pvpanel', rep: 'PV7', name: 'module 375 Wc mono', x: 446, y: 304, w: 48, h: 80 },
  { key: 'pvpanel', rep: 'PV8', name: 'module 375 Wc mono', x: 498, y: 304, w: 48, h: 80 },
];

/* ----------------------------------------------------------------- tests */

/** Contrôle visuel et serrage : commun à tous les TP. */
export const TEST_VISU: TestHorsTension = {
  id: 'visu',
  title: 'Contrôle visuel et serrage',
  how: 'Vérifie le repérage des conducteurs, les sections (2,5 mm² puissance / 1,5 mm² commande), le vert-jaune réservé au PE, puis contrôle le serrage de chaque borne au tournevis dynamométrique.',
  expected: 'aucun conducteur mobile, repérage conforme',
};

/** VAT avant travaux. */
export const TEST_VAT: TestHorsTension = {
  id: 'vat',
  title: 'VAT · vérification d\'absence de tension',
  how: 'Après séparation et condamnation, vérifie le VAT sur une source connue, mesure entre phases et phase-neutre à l\'arrivée, puis re-vérifie le VAT.',
  expected: '0 V sur toutes les paires',
};

/** Continuité du conducteur de protection. */
export const TEST_PE: TestHorsTension = {
  id: 'pe',
  title: 'Continuité du conducteur de protection',
  how: 'Contrôleur d\'installation, calibre RPE 200 mA, entre la borne PE du bornier et la masse du récepteur.',
  expected: '< 2 Ω',
};

/** Isolement 500 V. */
export const TEST_ISO: TestHorsTension = {
  id: 'iso',
  title: 'Isolement 500 V',
  how: 'Contrôleur d\'installation, calibre RISO 500 V, entre chaque conducteur actif et le PE, récepteur raccordé.',
  expected: '≥ 0,5 MΩ',
};

/** Jeu de tests hors tension standard. */
export const BASE_TESTS: TestHorsTension[] = [TEST_VAT, TEST_VISU, TEST_PE, TEST_ISO];

/* ------------------------------------- alimentation de commande 24 V (référence) */

/**
 * ALIMENTATION DE COMMANDE DE RÉFÉRENCE — la même sur toute la platine.
 *
 * C'est le montage réellement posé à l'établissement, et il vaut désormais pour
 * TOUT TP qui a besoin d'un 24 V de commande :
 *
 *   · protection du primaire  — Acti9 iC60N 2P C2 (A9F74202), PHASE / PHASE :
 *     bornes 1-3 en haut, 2-4 en bas. Pas de borne N : le primaire est pris
 *     entre deux phases, pas entre phase et neutre ;
 *   · protection du secondaire — Acti9 iC60N 1P+N C2 (A9F74602) : le pôle
 *     protégé coupe le 24 V, le pôle neutre SECTIONNE le 0 V. Les deux
 *     conducteurs de la commande s'ouvrent d'un seul geste, ce qu'un
 *     unipolaire ne sait pas faire ;
 *   · transformateur — Legrand 042872, 100 VA. Primaire à prises 0 · 230 · 400.
 *     Secondaire BI-TENSION : deux enroulements de 24 V, quatre bornes marquées
 *     0 · 0 · 24 · 24 (0a · 0b · 24a · 24b au simulateur, sans quoi deux bornes
 *     porteraient le même identifiant) et une borne de terre.
 *
 * Le couplage n'est pas déclaré, il est CÂBLÉ : deux barrettes 0a-0b et 24a-24b
 * mettent les enroulements en parallèle et donnent 24 V ; une seule barrette
 * 0b-24a les mettrait en série et donnerait 48 V — la bobine n'y survivrait pas.
 * `src/lib/sim/trafo.ts` résout le graphe réel, il ne lit pas une constante.
 */
export const TRAFO_REF = {
  reseau: 400,
  primaire: { '0': 0, '230': 230, '400': 400 },
  secondaire: { '0a': 0, '0b': 0, '24a': 24, '24b': 24 },
  enroulements: [
    { bornes: ['0a', '24a'] as [string, string], u: 24 },
    { bornes: ['0b', '24b'] as [string, string], u: 24 },
  ],
  sortie: ['0a', '24b'] as [string, string],
  bobine: 24,
};

/** Réseaux des bornes de T1 (référence). `live` est le repère du disjoncteur de primaire. */
export function netsT1(livePri: TerminalNet['live'] = 'f2'): Record<string, TerminalNet> {
  return {
    't1.400': { net: 'L1', live: livePri }, 't1.0': { net: 'L2', live: livePri },
    't1.230': { net: 'TAP-PRI-230', live: livePri },
    't1.24a': { net: 'C', live: livePri }, 't1.24b': { net: 'C', live: livePri },
    't1.0a': { net: 'C0', live: 'always' }, 't1.0b': { net: 'C0', live: 'always' },
    't1.PE': { net: 'PE', live: 'always' },
  };
}

/**
 * Liaisons de l'alimentation de commande de référence.
 *
 * `pri` = disjoncteur du primaire, `sec` = disjoncteur du secondaire (phase +
 * neutre), `retour` = borne du bornier X2 qui reçoit le 0 V, `terre` = borne PE
 * du bornier X1.
 */
export function liaisonsT1(
  { pri = 'f2', sec = 'f3', retour, terre }: { pri?: string; sec?: string; retour: string; terre: string },
): Liaison[] {
  return [
    // primaire : deux phases en aval du disjoncteur de tête
    L(`${pri}.2`, 't1.400', 'L1'), L(`${pri}.4`, 't1.0', 'L2'),
    // barrettes de couplage : enroulements en PARALLÈLE, donc 24 V
    L('t1.0a', 't1.0b', 'BAR'), L('t1.24a', 't1.24b', 'BAR'),
    // secondaire : le 24 V par le pôle protégé, le 0 V par le pôle neutre
    L('t1.24b', `${sec}.1`, 'C'),
    L('t1.0a', `${sec}.N`, 'C0'), L(`${sec}.N2`, retour, 'C0'),
    // masse du transformateur
    L('t1.PE', terre, 'PE'),
  ];
}

/** Options du poste « transformateur de commande » à l'étape matériel. */
export const POSTE_T1_OPTIONS = [
  {
    key: 'trafoleg', ref: 'Legrand 042872', spec: '230-400 / 24-48 V · 100 VA', ok: true,
    why: 'Primaire à prises 0 · 230 · 400 pris entre deux phases, secondaire bi-tension couplé en 24 V par ses barrettes, 100 VA : la bobine et les voyants passent sans chute de tension.',
  },
  {
    key: 'trafoleg', ref: 'Legrand 042852', spec: '230-400 / 24-48 V · 40 VA', half: true,
    why: 'Puissance trop juste : l\'appel de la bobine fait chuter la tension à l\'enclenchement.',
  },
  {
    key: 'trafo', ref: 'ABL6TS10U', spec: '230-400 / 230 V · 100 VA',
    why: 'Secondaire 230 V : ce n\'est pas une TBT, la bobine 24 V grillerait et le pupitre ne serait plus en très basse tension de sécurité.',
  },
];
