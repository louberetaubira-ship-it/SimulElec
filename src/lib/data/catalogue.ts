import type { CatalogueItem, TerminalDef } from '../types';
import { PLC, PLC_TERMINALS } from '../scene/geometry';
import sprites from './sprites.json';

type SpriteMeta = Record<string, { w: number; h: number; states: boolean }>;
const S = sprites as SpriteMeta;

const top3 = (ids: string[]): TerminalDef[] => ids.map((id, i) => ({ id, fx: 0.2 + i * 0.3, fy: 0.06 }));
const bot3 = (ids: string[]): TerminalDef[] => ids.map((id, i) => ({ id, fx: 0.2 + i * 0.3, fy: 0.94 }));
const one = (): TerminalDef[] => [{ id: '1', fx: 0.5, fy: 0.05 }, { id: '2', fx: 0.5, fy: 0.95 }];

function item(p: Omit<CatalogueItem, 'w' | 'h' | 'switchable'>): CatalogueItem {
  const m = S[p.key];
  return { ...p, w: m.w, h: m.h, switchable: m.states };
}

/**
 * ÉCHELLE DE LA PLATINE — une seule règle pour tout le catalogue.
 *
 * 1 millimètre réel = 1,45 pixel de platine. La valeur n'est pas choisie au
 * hasard : la platine dessinait déjà un disjoncteur de 3 modules sur 78 px, soit
 * 26 px par module, et un module Acti9 mesure 18 mm — 26 / 18 = 1,44.
 *
 * Ce sont les MILLIMÈTRES qui font foi, jamais le nombre de modules. Un GV2ME
 * de 45 mm fait 65 px, qu'on le compte 2,5 modules ou non ; le champ `modules`
 * ne sert plus qu'à l'inventaire et au repérage sur le rail.
 *
 * `npx tsx scripts/audit-echelle.ts` vérifie que chaque sprite respecte la règle
 * et liste les appareils dont les cotes n'ont pas encore été relevées.
 */
export const ECHELLE_PX_PAR_MM = 1.45;

/** Taille du sprite déduite des cotes constructeur. */
export const tailleSprite = (largeurMm: number, hauteurMm: number): { w: number; h: number } => ({
  w: Math.round(largeurMm * ECHELLE_PX_PAR_MM),
  h: Math.round(hauteurMm * ECHELLE_PX_PAR_MM),
});

/** Appareil modulaire : pas de 18 mm, hauteur 85 mm (relevé sur la fiche iC60N). */
export const dimsModulaire = (modules: number) =>
  ({ largeur: Math.round(modules * 18), hauteur: 85, profondeur: 78.5, source: 'norme' as const });

/** Appareil dessiné en SVG (photovoltaïque, automate, AGCP) : pas de sprite photo. */
function vector(
  p: Omit<CatalogueItem, 'switchable' | 'svg' | 'modules'> & { modules?: number },
): CatalogueItem {
  return { modules: Math.max(1, Math.round(p.w / 18)), ...p, switchable: false, svg: true };
}

/** Appareillages disponibles (photos du pack, détourées). */
export const CATALOGUE: CatalogueItem[] = [
  // ---- Disjoncteurs modulaires ----
  item({ key: 'mcb1p', name: 'Disjoncteur 1P C2', ref: 'iC60N 1P C2', brand: 'Schneider', kind: 'mcb', family: 'Disjoncteurs', modules: 1, poles: 1, In: 2, terminals: one() }),
  // Disjoncteur PHASE + NEUTRE Schneider, 1 module, courbe C 2 A. Le pôle protégé
  // coupe l'actif, le pôle neutre sectionne le retour : les deux conducteurs de la
  // commande s'ouvrent d'un seul geste. Bornes N et 1 en haut, N et 2 en bas,
  // comme sur l'appareil.
  item({ key: 'mcb1pn', dims: { largeur: 18, hauteur: 85, profondeur: 78.5, source: 'fiche' }, name: 'Disjoncteur phase + neutre 2 A · courbe C', ref: 'Schneider C60N 1P+N C2', brand: 'Schneider', kind: 'mcb', family: 'Disjoncteurs', modules: 1, poles: 2, In: 2,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 },
      { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  // Sectionneur porte-fusibles PHASE + NEUTRE, 1 module, cartouche 10,3 × 38 — c'est
  // l'appareil réellement posé sur la platine de l'établissement (Multi 9 STI). Un
  // fusible ne se réarme pas : il fond et se remplace, et c'est ce que l'élève doit
  // comprendre. Bornes N et 1 en haut, N et 2 en bas, comme sur l'appareil.
  item({ key: 'fuse1pn', name: 'Sectionneur porte-fusibles phase + neutre · 10,3 × 38', ref: 'Multi 9 STI 10,3 × 38', brand: 'Merlin Gerin', kind: 'mcb', family: 'Disjoncteurs', modules: 1, poles: 2,
    terminals: [{ id: 'N', fx: 0.28, fy: 0.06 }, { id: '1', fx: 0.72, fy: 0.06 },
      { id: 'N2', fx: 0.28, fy: 0.94 }, { id: '2', fx: 0.72, fy: 0.94 }] }),
  item({ key: 'mcb2p', name: 'Disjoncteur 2P C16', ref: 'Genrod 1P+N C16', brand: 'Genrod', kind: 'mcb', family: 'Disjoncteurs', modules: 2, poles: 2, In: 16,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  // Bipolaire PHASE / PHASE : bornes 1-3 / 2-4, comme sur un primaire de transformateur pris
  // entre deux phases. Le 1P+N ci-dessus a des bornes N : elles induiraient l'élève en erreur.
  item({ key: 'mcb2ph', dims: { largeur: 36, hauteur: 85, profondeur: 78.5, source: 'fiche' }, name: 'Disjoncteur bipolaire 2 A · phase / phase', ref: 'C60N 2P C2', brand: 'Schneider', kind: 'mcb', family: 'Disjoncteurs', modules: 2, poles: 2, In: 2,
    terminals: [{ id: '1', fx: 0.3, fy: 0.06 }, { id: '3', fx: 0.7, fy: 0.06 }, { id: '2', fx: 0.3, fy: 0.94 }, { id: '4', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'mcb3p', name: 'Disjoncteur 3P C20', ref: 'Genrod 3P C20', brand: 'Genrod', kind: 'mcb', family: 'Disjoncteurs', modules: 3, poles: 3, In: 20, terminals: [...top3(['1', '3', '5']), ...bot3(['2', '4', '6'])] }),
  item({ key: 'mcb4p', name: 'Disjoncteur 4P C40', ref: 'Genrod 4P C40', brand: 'Genrod', kind: 'main', family: 'Disjoncteurs', modules: 4, poles: 4, In: 40,
    terminals: ['1', '3', '5', 'N'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.06 })).concat(['2', '4', '6', 'N2'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.94 }))) }),
  item({ key: 'steck2p', name: 'Disjoncteur 2P C25', ref: 'Steck SD 2P C25', brand: 'Steck', kind: 'mcb', family: 'Disjoncteurs', modules: 2, poles: 2, In: 25,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  // ---- Sectionnement et consignation ----
  // Photo reprise de la bibliothèque (famille « Fusibles · sectionneurs »), redimensionnée au
  // pas modulaire et renommée : c'est bien un sectionneur porte-fusibles tripolaire à
  // cartouches, l'organe de sectionnement ET de consignation d'un départ-moteur.
  item({
    key: 'fuseswitch', name: 'Sectionneur porte-fusibles 3P · cartouches aM 10 × 38', ref: 'LS1-D2531 + aM 4 A',
    brand: 'Telemecanique', kind: 'main', family: 'Sectionnement', modules: 3, poles: 3, In: 32,
    terminals: [...top3(['1', '3', '5']), ...bot3(['2', '4', '6'])],
  }),
  // ---- Capteurs de position ----
  // Interrupteur de position à galet, contacts NO / NF : protège un carter ou un écran mobile.
  // Bornes nommées comme sur l'appareil : 11 commun, 12 contact NF, 14 contact NO.
  item({
    key: 'limitswitch', name: 'Interrupteur de position à galet · NO + NF', ref: 'XCKJ à ouverture positive',
    brand: 'Schneider', kind: 'misc', family: 'Capteurs', modules: 0, poles: 1,
    terminals: [
      { id: '11', fx: 0.25, fy: 0.9 }, { id: '12', fx: 0.5, fy: 0.9 }, { id: '14', fx: 0.75, fy: 0.9 },
    ],
  }),
  // ---- Disjoncteurs moteur ----
  item({ key: 'motorcb', dims: { largeur: 45, hauteur: 89, profondeur: 78.5, source: 'fiche' }, name: 'Disjoncteur moteur GV2ME08', ref: 'GV2ME08', brand: 'Schneider', kind: 'motorcb', family: 'Disjoncteurs', modules: 2.5, poles: 3, range: [2.5, 4], terminals: [...top3(['1', '3', '5']), ...bot3(['2', '4', '6'])] }),
  // ---- Différentiels ----
  item({ key: 'rcd2p', name: 'Interrupteur différentiel 2P 40 A 30 mA', ref: 'iID 2P 40A 30mA', brand: 'Schneider', kind: 'rcd', family: 'Différentiels', modules: 2, poles: 2, In: 40,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'rcd2eaton', name: 'Interrupteur différentiel 2P 25 A 30 mA', ref: 'HNC-25/2/003', brand: 'Eaton', kind: 'rcd', family: 'Différentiels', modules: 2, poles: 2, In: 25,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'rcd4p', name: 'Interrupteur différentiel 4P 40 A 30 mA', ref: 'iID 4P 40A 30mA', brand: 'Schneider', kind: 'rcd', family: 'Différentiels', modules: 4, poles: 4, In: 40,
    terminals: ['1', '3', '5', 'N'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.06 })).concat(['2', '4', '6', 'N2'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.94 }))) }),
  // ---- Industriel ----
  item({ key: 'kontakt', name: 'Contacteur LC1D09 bobine 230 V', ref: 'LC1D09P7', brand: 'Schneider', kind: 'contactor', family: 'Industriel', modules: 2.5, poles: 3, In: 9, coil: 230,
    terminals: [{ id: 'A1', fx: 0.08, fy: 0.07 }, { id: '1', fx: 0.3, fy: 0.07 }, { id: '3', fx: 0.52, fy: 0.07 }, { id: '5', fx: 0.74, fy: 0.07 }, { id: '13', fx: 0.93, fy: 0.07 },
      { id: 'A2', fx: 0.08, fy: 0.93 }, { id: '2', fx: 0.3, fy: 0.93 }, { id: '4', fx: 0.52, fy: 0.93 }, { id: '6', fx: 0.74, fy: 0.93 }, { id: '14', fx: 0.93, fy: 0.93 }] }),
  item({ key: 'kontaktaux', name: 'Contacteur LC1D09 bobine 24 V + bloc LADN11', ref: 'LC1D09B7 + LADN11', brand: 'Schneider', kind: 'contactor', family: 'Industriel', modules: 2.5, poles: 3, In: 9, coil: 24,
    terminals: [{ id: 'A1', fx: 0.08, fy: 0.07 }, { id: '1', fx: 0.3, fy: 0.07 }, { id: '3', fx: 0.52, fy: 0.07 }, { id: '5', fx: 0.74, fy: 0.07 }, { id: '13', fx: 0.93, fy: 0.07 }, { id: '53', fx: 0.93, fy: 0.3 },
      { id: 'A2', fx: 0.08, fy: 0.93 }, { id: '2', fx: 0.3, fy: 0.93 }, { id: '4', fx: 0.52, fy: 0.93 }, { id: '6', fx: 0.74, fy: 0.93 }, { id: '14', fx: 0.93, fy: 0.93 }, { id: '54', fx: 0.93, fy: 0.7 }] }),
  item({ key: 'therm', name: 'Relais thermique LRD08', ref: 'LRD08', brand: 'Schneider', kind: 'thermal', family: 'Industriel', modules: 2.5, poles: 3, range: [2.5, 4],
    terminals: [{ id: '1', fx: 0.3, fy: 0.08 }, { id: '3', fx: 0.52, fy: 0.08 }, { id: '5', fx: 0.74, fy: 0.08 },
      { id: '95', fx: 0.08, fy: 0.92 }, { id: '96', fx: 0.2, fy: 0.6 }, { id: '2', fx: 0.3, fy: 0.92 }, { id: '4', fx: 0.52, fy: 0.92 }, { id: '6', fx: 0.74, fy: 0.92 }, { id: '97', fx: 0.92, fy: 0.92 }, { id: '98', fx: 0.8, fy: 0.6 }] }),
  item({ key: 'timer', name: 'Horloge programmable', ref: 'IH 24h', brand: 'Schneider', kind: 'misc', family: 'Industriel', modules: 2, poles: 2, terminals: [{ id: '1', fx: 0.3, fy: 0.06 }, { id: '2', fx: 0.7, fy: 0.06 }, { id: '3', fx: 0.3, fy: 0.94 }, { id: '4', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'stopstart', name: 'Boîte à boutons arrêt NC / marche NO', ref: 'XALD213', brand: 'Schneider', kind: 'button', family: 'Industriel', modules: 0, poles: 0,
    terminals: [{ id: '13', fx: 0.1, fy: 0.34 }, { id: '14', fx: 0.9, fy: 0.34 }, { id: '21', fx: 0.1, fy: 0.69 }, { id: '22', fx: 0.9, fy: 0.69 }] }),
  // ---- Mesure ----
  item({ key: 'meter', name: 'Compteur V / A', ref: 'Sinotimer DDS', kind: 'meter', family: 'Mesure', modules: 2, poles: 2, terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'volt3', name: 'Voltmètre 3 phases', ref: 'DIN 1 module', kind: 'misc', family: 'Mesure', modules: 1, poles: 1, terminals: one() }),
  item({ key: 'smart', name: 'Compteur d\'énergie WiFi', ref: 'Tuya', kind: 'misc', family: 'Mesure', modules: 3, poles: 2, terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  // ---- Borniers (X1 puissance, X2 commande…) ----
  item({ key: 'termred', name: 'Borne de passage phase', ref: 'UT 2,5 rouge', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] , small: true }),
  item({ key: 'termgrey', name: 'Borne de passage', ref: 'UT 2,5 grise', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] , small: true }),
  item({ key: 'termblue', name: 'Borne de passage neutre', ref: 'UT 2,5 bleue', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] , small: true }),
  item({ key: 'termyellow', name: 'Borne de passage jaune', ref: 'UT 2,5 jaune', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] , small: true }),
  item({ key: 'earth', name: 'Borne de terre', ref: 'UT 2,5-PE', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] , small: true }),
  item({ key: 'bus4', name: 'Bornier de répartition 4 pôles', ref: 'CNC 4P', kind: 'bus', family: 'Borniers', modules: 6, poles: 2, terminals: [{ id: 'N', fx: 0.15, fy: 0.05 }, { id: 'L', fx: 0.28, fy: 0.05 }] }),
  item({ key: 'bus6', name: 'Bornier de répartition long', ref: 'CNC 4P long', kind: 'bus', family: 'Borniers', modules: 7.5, poles: 2, terminals: [{ id: 'N', fx: 0.12, fy: 0.05 }, { id: 'L', fx: 0.22, fy: 0.05 }] }),
  // ---- Voyants ----
  item({ key: 'lampG', name: 'Voyant vert 230 V', ref: 'iIL vert', kind: 'lamp', family: 'Voyants', modules: 1, poles: 1, terminals: [{ id: 'X1', fx: 0.5, fy: 0.06 }, { id: 'X2', fx: 0.5, fy: 0.94 }] }),
  item({ key: 'lampR', name: 'Voyant rouge 230 V', ref: 'iIL rouge', kind: 'lamp', family: 'Voyants', modules: 1, poles: 1, terminals: [{ id: 'X1', fx: 0.5, fy: 0.06 }, { id: 'X2', fx: 0.5, fy: 0.94 }] }),
  item({ key: 'lampY', name: 'Voyant jaune 230 V', ref: 'iIL jaune', kind: 'lamp', family: 'Voyants', modules: 1, poles: 1, terminals: [{ id: 'X1', fx: 0.5, fy: 0.06 }, { id: 'X2', fx: 0.5, fy: 0.94 }] }),
  // ---- Signalétique ----
  item({ key: 'sign', name: 'Étiquette ON / OFF', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  item({ key: 'signstop', name: 'Étiquette ON / OFF (verte)', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  item({ key: 'danger', name: 'Risque électrique', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  item({ key: 'v230', name: 'Pictogramme 230 V', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  item({ key: 'pe', name: 'Pictogramme terre', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  // ---- Transformateur de commande (photo /sprites/trafo.png) ----
  {
    key: 'trafo', name: 'Transformateur de commande 400/24 V · 63 VA', ref: 'ABL6TS06U', brand: 'Schneider',
    kind: 'trafo', family: 'Industriel', modules: 4, poles: 0, switchable: false, w: 74, h: 100,
    terminals: [
      { id: '0', fx: 0.31, fy: 0.28 }, { id: '230', fx: 0.59, fy: 0.28 }, { id: '400', fx: 0.85, fy: 0.28 },
      { id: '0V', fx: 0.41, fy: 0.72 }, { id: '24', fx: 0.70, fy: 0.72 }, { id: '48', fx: 0.85, fy: 0.72 },
    ],
  },
  // ---- Automate programmable (dessin SVG) ----
  vector({
    key: 'plc', name: 'Automate Modicon M221 · 16 E/S relais', ref: 'TM221CE16R', brand: 'Schneider',
    kind: 'plc', family: 'Automatisme', modules: 11, poles: 0, w: PLC.w, h: PLC.h, terminals: PLC_TERMINALS,
  }),
  // Transformateur de commande Legrand 042872 — celui de la platine de
  // l'établissement. 100 VA, 50/60 Hz, classe I, IP2X, IK04, uk 4,6 %,
  // EN 61558-2-6, 84 x 104 x 98 mm.
  //
  // Primaire : trois bornes marquées 0 · 230 · 400 (la face en compte cinq,
  // deux logements restent borgnes). 400 V entre deux phases : 0 et 400.
  //
  // Secondaire BI-TENSION, livré avec ses barrettes de couplage : DEUX
  // enroulements de 24 V, quatre bornes marquées 0 · 0 · 24 · 24, plus une borne
  // de terre. Le simulateur les distingue en 0a / 0b / 24a / 24b, sans quoi deux
  // bornes porteraient le même identifiant.
  //   · 24 V — enroulements en PARALLÈLE : deux barrettes, 0a-0b et 24a-24b ;
  //   · 48 V — enroulements en SÉRIE : une seule barrette, 0b-24a.
  // Dans les deux cas la sortie se prend sur 0a et 24b. La face porte le calibre
  // du fusible correspondant : T4A en 24 V, T2A en 48 V (100 VA / 24 V = 4,17 A).
  item({ key: 'trafoleg', dims: { largeur: 84, hauteur: 104, profondeur: 98, source: 'fiche' }, name: 'Transformateur de commande Legrand 100 VA · 230-400 / 24-48 V', ref: '042872', brand: 'Legrand',
    kind: 'trafo', family: 'Alimentation', modules: 5, poles: 2,
    terminals: [
      { id: '0', fx: 0.306, fy: 0.28 }, { id: '230', fx: 0.625, fy: 0.28 }, { id: '400', fx: 0.833, fy: 0.28 },
      { id: 'PE', fx: 0.133, fy: 0.90 },
      { id: '0a', fx: 0.361, fy: 0.90 }, { id: '0b', fx: 0.511, fy: 0.90 },
      { id: '24a', fx: 0.667, fy: 0.90 }, { id: '24b', fx: 0.822, fy: 0.90 },
    ] }),
  // ---- Variation de vitesse ----
  // ATV320U07N4B : 45 x 325 x 245 mm, 0,75 kW, 380-500 V triphase, 3,6 A en ligne
  // sous 380 V, 2,3 A de sortie a 4 kHz, sortie 0,1 a 599 Hz (fiche produit Schneider).
  vector({
    key: 'atv320', dims: { largeur: 45, hauteur: 325, profondeur: 245, source: 'fiche' }, name: 'Variateur de vitesse Altivar ATV320 · 0,75 kW', ref: 'ATV320U07N4B',
    brand: 'Schneider', kind: 'misc', family: 'Variation de vitesse', modules: 7, poles: 3, w: 190, h: 180,
    // Dessiné plus large que l'échelle stricte (45 mm de façade) : à l'échelle, les
    // dix-sept bornes se chevauchent et l'élève ne lit plus ni les repères ni les
    // points de connexion. Pas de 25 px en haut, 27 px en bas — les étiquettes de
    // quatre caractères (R/L1, U/T1) font 22 px de large. Même compromis que l'automate.
    terminals: [
      // bornier de contrôle, en haut
      { id: '+24', fx: 0.0947, fy: 0.035 }, { id: 'COM', fx: 0.2263, fy: 0.035 }, { id: 'LI1', fx: 0.3579, fy: 0.035 }, { id: 'LI2', fx: 0.4895, fy: 0.035 },
      { id: 'AI1', fx: 0.6211, fy: 0.035 }, { id: 'R1A', fx: 0.7895, fy: 0.035 }, { id: 'R1C', fx: 0.9211, fy: 0.035 },
      // bus continu, sur le flanc gauche
      { id: 'PA+', fx: 0.058, fy: 0.42 }, { id: 'PC-', fx: 0.058, fy: 0.58 },
      // bornier de puissance, en bas
      { id: 'R/L1', fx: 0.0842, fy: 0.965 }, { id: 'S/L2', fx: 0.2263, fy: 0.965 }, { id: 'T/L3', fx: 0.3684, fy: 0.965 }, { id: 'PE', fx: 0.5105, fy: 0.965 },
      { id: 'U/T1', fx: 0.6526, fy: 0.965 }, { id: 'V/T2', fx: 0.7947, fy: 0.965 }, { id: 'W/T3', fx: 0.9368, fy: 0.965 },
    ],
  }),
  // ---- Photovoltaïque et branchement (dessins SVG) ----
  vector({
    key: 'pvpanel', name: 'Module photovoltaïque 375 Wc monocristallin', ref: 'PV-375M', kind: 'pv',
    family: 'Photovoltaïque', poles: 2, w: 48, h: 80,
    terminals: [{ id: '+', fx: 0.25, fy: 0.97 }, { id: '−', fx: 0.75, fy: 0.97 }],
  }),
  vector({
    key: 'onduleur', name: 'Onduleur string 3 kVA · 2 MPPT', ref: 'ONDU-3000-2M', kind: 'inverter',
    family: 'Photovoltaïque', poles: 2, w: 110, h: 130,
    terminals: [
      { id: 'DC+', fx: 0.16, fy: 0.95 }, { id: 'DC−', fx: 0.34, fy: 0.95 },
      { id: 'L', fx: 0.58, fy: 0.95 }, { id: 'N', fx: 0.73, fy: 0.95 }, { id: 'PE', fx: 0.87, fy: 0.95 },
    ],
  }),
  vector({
    key: 'dcswitch', name: 'Sectionneur DC 1000 V · 2P 32 A', ref: 'SECT-DC-32', kind: 'dc',
    family: 'Photovoltaïque', poles: 2, w: 52, h: 120,
    terminals: [
      { id: '1+', fx: 0.3, fy: 0.07 }, { id: '3−', fx: 0.7, fy: 0.07 },
      { id: '2+', fx: 0.3, fy: 0.93 }, { id: '4−', fx: 0.7, fy: 0.93 },
    ],
  }),
  vector({
    key: 'dcfuse', name: 'Porte-fusible DC gPV 15 A · 10 × 38', ref: 'PF-gPV-15', kind: 'dc',
    family: 'Photovoltaïque', poles: 2, w: 52, h: 120,
    terminals: [
      { id: '1+', fx: 0.3, fy: 0.07 }, { id: '3−', fx: 0.7, fy: 0.07 },
      { id: '2+', fx: 0.3, fy: 0.93 }, { id: '4−', fx: 0.7, fy: 0.93 },
    ],
  }),
  vector({
    key: 'dcspd', name: 'Parafoudre DC type 2 · 1000 V', ref: 'SPD-DC-T2', kind: 'dc',
    family: 'Photovoltaïque', poles: 2, w: 52, h: 120,
    terminals: [{ id: '+', fx: 0.3, fy: 0.07 }, { id: '−', fx: 0.7, fy: 0.07 }, { id: 'PE', fx: 0.5, fy: 0.93 }],
  }),
  vector({
    key: 'battery', name: 'Batterie LiFePO₄ 48 V · 5 kWh', ref: 'BAT-48-5K', kind: 'battery',
    family: 'Photovoltaïque', poles: 2, w: 100, h: 130,
    terminals: [{ id: '+', fx: 0.33, fy: 0.96 }, { id: '−', fx: 0.67, fy: 0.96 }],
  }),
  vector({
    key: 'agcp', name: 'Disjoncteur de branchement 15/45 A · 500 mA sélectif', ref: 'AGCP-500', kind: 'main',
    family: 'Branchement', poles: 2, w: 70, h: 120,
    terminals: [
      { id: '1', fx: 0.26, fy: 0.07 }, { id: '3', fx: 0.74, fy: 0.07 },
      { id: '2', fx: 0.26, fy: 0.93 }, { id: '4', fx: 0.74, fy: 0.93 },
    ],
  }),
];

export const CATALOGUE_BY_KEY: Record<string, CatalogueItem> = Object.fromEntries(CATALOGUE.map(c => [c.key, c]));
export const FAMILIES = Array.from(new Set(CATALOGUE.map(c => c.family)));

export function spriteUrl(key: string, state?: 'on' | 'off'): string {
  const m = S[key];
  if (state && m?.states) return `/sprites/${key}-${state}.png`;
  return `/sprites/${key}.png`;
}
