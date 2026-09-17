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
  // Disjoncteur PHASE + NEUTRE Acti9 iC60N, courbe C 2 A (A9F74602). Le pôle protégé
  // coupe l'actif, le pôle neutre sectionne le retour : les deux conducteurs de la
  // commande s'ouvrent d'un seul geste. Bornes N et 1 en haut, N et 2 en bas,
  // comme sur l'appareil.
  //
  // Il occupe DEUX modules, pas un : 36 mm — « 4 pas de 9 mm » sur la fiche. Le
  // pôle neutre est un vrai pôle et il prend la place d'un pôle.
  item({ key: 'mcb1pn', dims: { largeur: 36, hauteur: 85, profondeur: 78.5, source: 'fiche' }, name: 'Disjoncteur phase + neutre 2 A · courbe C', ref: 'Acti9 iC60N 1P+N C2 · A9F74602', brand: 'Schneider', kind: 'mcb', family: 'Disjoncteurs', modules: 2, poles: 2, In: 2,
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
  item({ key: 'mcb2ph', dims: { largeur: 36, hauteur: 85, profondeur: 78.5, source: 'fiche' }, name: 'Disjoncteur bipolaire 2 A · phase / phase', ref: 'Acti9 iC60N 2P C2 · A9F74202', brand: 'Schneider', kind: 'mcb', family: 'Disjoncteurs', modules: 2, poles: 2, In: 2,
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
  // Disjoncteur moteur à déclencheur MAGNÉTIQUE SEUL (GV2L08, 4 A). Ce n'est pas un
  // GV2ME au rabais : devant un variateur, le thermique n'a rien à protéger — le
  // courant de sortie n'est ni sinusoïdal ni à fréquence fixe, et c'est la protection
  // I²t du variateur qui garde le moteur. Il ne reste au SCPD qu'à couper le
  // court-circuit côté réseau. 45 × 89 × 97 mm (fiche Schneider).
  item({ key: 'gv2l', dims: { largeur: 45, hauteur: 89, profondeur: 97, source: 'fiche' }, name: 'Disjoncteur moteur magnétique GV2L08 · 4 A', ref: 'GV2L08', brand: 'Schneider', kind: 'motorcb', family: 'Disjoncteurs', modules: 2.5, poles: 3, In: 4, terminals: [...top3(['1', '3', '5']), ...bot3(['2', '4', '6'])] }),
  // ---- Départ-moteur de forte puissance (TD wagonnet, M1 de 22 kW) ----
  //
  // Ces quatre appareils sont DESSINÉS : le pack photo n'en contient aucun, et
  // aucune photo approchante ne conviendrait — un corps de sectionneur GK1 ne
  // ressemble pas à un porte-fusible modulaire, et l'élève doit voir le bon
  // organe. Les proportions du dessin sont celles de la fiche constructeur.
  //
  // Sectionneur porte-fusibles TeSys GK1 ES : 3 pôles 50 A, cartouches 14 × 51,
  // DEUX contacts de précoupure — ce sont eux qui coupent la commande avant la
  // puissance quand on ouvre le sectionneur. 97 × 97 × 89,5 mm (fiche Schneider).
  vector({
    key: 'gk1es', name: 'Sectionneur porte-fusibles 3P 50 A · cartouches 14 × 51 · 2 précoupures',
    ref: 'GK1 ES', brand: 'Schneider', kind: 'main', family: 'Sectionnement',
    dims: { largeur: 97, hauteur: 97, profondeur: 89.5, source: 'fiche' },
    poles: 3, In: 50, ...tailleSprite(97, 97),
    terminals: [
      { id: '1', fx: 0.206, fy: 0.10 }, { id: '3', fx: 0.485, fy: 0.10 }, { id: '5', fx: 0.763, fy: 0.10 },
      { id: '2', fx: 0.206, fy: 0.90 }, { id: '4', fx: 0.485, fy: 0.90 }, { id: '6', fx: 0.763, fy: 0.90 },
      { id: '13', fx: 0.93, fy: 0.24 }, { id: '14', fx: 0.93, fy: 0.42 },
      { id: '23', fx: 0.93, fy: 0.60 }, { id: '24', fx: 0.93, fy: 0.78 },
    ],
  }),
  // Contacteur LC1 D50, bobine 24 V. Deux exemplaires accouplés et verrouillés
  // mécaniquement forment le contacteur-INVERSEUR LC2 D50 : la fonction inverseur
  // vient du câblage croisé de deux phases, pas d'un appareil particulier.
  // 75 × 127 × 119 mm (fiche LC1D50M7).
  vector({
    key: 'lc1d50', name: 'Contacteur tripolaire 22 kW · bobine 24 V', ref: 'LC1 D50 B7',
    brand: 'Schneider', kind: 'contactor', family: 'Industriel',
    dims: { largeur: 75, hauteur: 127, profondeur: 119, source: 'fiche' },
    poles: 3, In: 50, coil: 24, ...tailleSprite(75, 127),
    terminals: [
      { id: '1', fx: 0.207, fy: 0.08 }, { id: '3', fx: 0.487, fy: 0.08 }, { id: '5', fx: 0.767, fy: 0.08 },
      { id: '2', fx: 0.207, fy: 0.92 }, { id: '4', fx: 0.487, fy: 0.92 }, { id: '6', fx: 0.767, fy: 0.92 },
      { id: 'A1', fx: 0.133, fy: 0.21 }, { id: 'A2', fx: 0.867, fy: 0.79 },
      { id: '13', fx: 0.32, fy: 0.55 }, { id: '14', fx: 0.32, fy: 0.63 },
      { id: '21', fx: 0.68, fy: 0.55 }, { id: '22', fx: 0.68, fy: 0.63 },
    ],
  }),
  // Le même, équipé du bloc additif LAD N11 (1 F + 1 O) clipsé en face avant :
  // il n'élargit pas l'appareil, il occupe la fenêtre centrale. 26 × 48 × 42 mm.
  vector({
    key: 'lc1d50n', name: 'Contacteur tripolaire 22 kW · bobine 24 V + bloc LAD N11', ref: 'LC1 D50 B7 + LAD N11',
    brand: 'Schneider', kind: 'contactor', family: 'Industriel',
    dims: { largeur: 75, hauteur: 127, profondeur: 119, source: 'fiche' },
    poles: 3, In: 50, coil: 24, ...tailleSprite(75, 127),
    terminals: [
      { id: '1', fx: 0.207, fy: 0.08 }, { id: '3', fx: 0.487, fy: 0.08 }, { id: '5', fx: 0.767, fy: 0.08 },
      { id: '2', fx: 0.207, fy: 0.92 }, { id: '4', fx: 0.487, fy: 0.92 }, { id: '6', fx: 0.767, fy: 0.92 },
      { id: 'A1', fx: 0.133, fy: 0.21 }, { id: 'A2', fx: 0.867, fy: 0.79 },
      { id: '13', fx: 0.32, fy: 0.55 }, { id: '14', fx: 0.32, fy: 0.63 },
      { id: '21', fx: 0.68, fy: 0.55 }, { id: '22', fx: 0.68, fy: 0.63 },
      { id: '53', fx: 0.50, fy: 0.42 }, { id: '54', fx: 0.50, fy: 0.50 },
    ],
  }),
  // Relais thermique LRD 3357, zone 37…50 A, classe 10 A : il se monte SOUS le
  // contacteur et s'enfiche dessus par trois barrettes. 75 × 123 × 121 mm (fiche).
  vector({
    key: 'lrd3357', name: 'Relais de protection thermique 37…50 A · classe 10 A', ref: 'LRD 3357',
    brand: 'Schneider', kind: 'thermal', family: 'Industriel',
    dims: { largeur: 75, hauteur: 123, profondeur: 121, source: 'fiche' },
    poles: 3, range: [37, 50], ...tailleSprite(75, 123),
    terminals: [
      { id: '1', fx: 0.227, fy: 0.07 }, { id: '3', fx: 0.507, fy: 0.07 }, { id: '5', fx: 0.787, fy: 0.07 },
      { id: '2', fx: 0.22, fy: 0.85 }, { id: '4', fx: 0.50, fy: 0.85 }, { id: '6', fx: 0.78, fy: 0.85 },
      { id: '95', fx: 0.12, fy: 0.95 }, { id: '96', fx: 0.26, fy: 0.95 },
      { id: '97', fx: 0.88, fy: 0.95 }, { id: '98', fx: 0.74, fy: 0.95 },
    ],
  }),
  // Contacteur auxiliaire CAD 32 (3 F + 2 O), bobine 24 V, équipé de son bloc
  // temporisé LAD T0 (travail, 0,1 à 3 s) clipsé en face avant. Repérage EN 50005 :
  // les unités 5-6 désignent le contact à OUVERTURE retardé, 7-8 le contact à
  // FERMETURE retardé — c'est 67-68 qui se ferme à la fin de la temporisation.
  // 45 × 77 × 84 mm (fiche CAD32B7) ; le LAD T0 n'a pas de cote publiée.
  vector({
    key: 'cad32', name: 'Contacteur auxiliaire 3 F + 2 O · bobine 24 V + bloc temporisé LAD T0', ref: 'CAD 32 B7 + LAD T0',
    brand: 'Schneider', kind: 'contactor', family: 'Industriel',
    dims: { largeur: 45, hauteur: 77, profondeur: 84, source: 'fiche' },
    poles: 0, coil: 24, ...tailleSprite(45, 77),
    terminals: [
      { id: 'A1', fx: 0.156, fy: 0.10 }, { id: 'A2', fx: 0.156, fy: 0.90 },
      { id: '11', fx: 0.333, fy: 0.10 }, { id: '12', fx: 0.333, fy: 0.90 },
      { id: '21', fx: 0.511, fy: 0.10 }, { id: '22', fx: 0.511, fy: 0.90 },
      { id: '33', fx: 0.689, fy: 0.10 }, { id: '34', fx: 0.689, fy: 0.90 },
      { id: '43', fx: 0.867, fy: 0.10 }, { id: '44', fx: 0.867, fy: 0.90 },
      { id: '53', fx: 0.06, fy: 0.42 }, { id: '54', fx: 0.06, fy: 0.58 },
      { id: '55', fx: 0.94, fy: 0.27 }, { id: '56', fx: 0.94, fy: 0.73 },
      { id: '67', fx: 0.94, fy: 0.43 }, { id: '68', fx: 0.94, fy: 0.57 },
    ],
  }),
  // ---- Différentiels ----
  item({ key: 'rcd2p', dims: { largeur: 36, hauteur: 85, profondeur: 44, source: 'fiche' }, name: 'Interrupteur différentiel 2P 40 A 30 mA', ref: 'Acti9 iID 2P 40A 30mA type AC · A9R11240', brand: 'Schneider', kind: 'rcd', family: 'Différentiels', modules: 2, poles: 2, In: 40,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'rcd2eaton', name: 'Interrupteur différentiel 2P 25 A 30 mA', ref: 'HNC-25/2/003', brand: 'Eaton', kind: 'rcd', family: 'Différentiels', modules: 2, poles: 2, In: 25,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'rcd4p', name: 'Interrupteur différentiel 4P 40 A 30 mA', ref: 'iID 4P 40A 30mA', brand: 'Schneider', kind: 'rcd', family: 'Différentiels', modules: 4, poles: 4, In: 40,
    terminals: ['1', '3', '5', 'N'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.06 })).concat(['2', '4', '6', 'N2'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.94 }))) }),
  // ---- Industriel ----
  item({ key: 'kontakt', dims: { largeur: 45, hauteur: 77, profondeur: 95, source: 'fiche' }, name: 'Contacteur LC1D09 bobine 230 V', ref: 'LC1D09P7', brand: 'Schneider', kind: 'contactor', family: 'Industriel', modules: 2.5, poles: 3, In: 9, coil: 230,
    terminals: [{ id: 'A1', fx: 0.08, fy: 0.07 }, { id: '1', fx: 0.3, fy: 0.07 }, { id: '3', fx: 0.52, fy: 0.07 }, { id: '5', fx: 0.74, fy: 0.07 }, { id: '13', fx: 0.93, fy: 0.07 },
      { id: 'A2', fx: 0.08, fy: 0.93 }, { id: '2', fx: 0.3, fy: 0.93 }, { id: '4', fx: 0.52, fy: 0.93 }, { id: '6', fx: 0.74, fy: 0.93 }, { id: '14', fx: 0.93, fy: 0.93 }] }),
  // Le bloc LADN11 se monte SUR LA FACE du contacteur : il n'élargit pas
  // l'appareil, il occupe la fenêtre centrale — c'est ce que montre le sprite.
  item({ key: 'kontaktaux', dims: { largeur: 45, hauteur: 77, profondeur: 95, source: 'fiche' }, name: 'Contacteur LC1D09 bobine 24 V + bloc LADN11', ref: 'LC1D09B7 + LADN11', brand: 'Schneider', kind: 'contactor', family: 'Industriel', modules: 2.5, poles: 3, In: 9, coil: 24,
    terminals: [{ id: 'A1', fx: 0.08, fy: 0.07 }, { id: '1', fx: 0.3, fy: 0.07 }, { id: '3', fx: 0.52, fy: 0.07 }, { id: '5', fx: 0.74, fy: 0.07 }, { id: '13', fx: 0.93, fy: 0.07 }, { id: '53', fx: 0.93, fy: 0.3 },
      { id: 'A2', fx: 0.08, fy: 0.93 }, { id: '2', fx: 0.3, fy: 0.93 }, { id: '4', fx: 0.52, fy: 0.93 }, { id: '6', fx: 0.74, fy: 0.93 }, { id: '14', fx: 0.93, fy: 0.93 }, { id: '54', fx: 0.93, fy: 0.7 }] }),
  // Le LRD08 se monte SOUS le contacteur : le sprite montre le corps seul, sans
  // les trois barrettes de raccordement qui s'enfichent dans le LC1D.
  item({ key: 'therm', dims: { largeur: 45, hauteur: 45, profondeur: 70, source: 'fiche' }, name: 'Relais thermique LRD08', ref: 'LRD08', brand: 'Schneider', kind: 'thermal', family: 'Industriel', modules: 2.5, poles: 3, range: [2.5, 4],
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
    // Phaseo ABL6TS06B — 78 × 90 × 80 mm (fiche Schneider), soit 113 × 131 px.
    // Il ne figure plus sur aucune platine : depuis que l'alimentation de commande
    // de référence est le Legrand bi-tension, il ne sert qu'à illustrer une OPTION
    // à l'étape matériel. C'est pourquoi ses bornes restent celles du modèle à
    // prises : personne ne s'y raccorde.
    key: 'trafo', name: 'Transformateur de commande 230-400 / 24 V · 63 VA', ref: 'ABL6TS06B', brand: 'Schneider',
    dims: { largeur: 78, hauteur: 90, profondeur: 80, source: 'fiche' },
    kind: 'trafo', family: 'Industriel', modules: 4, poles: 0, switchable: false, w: 113, h: 131,
    terminals: [
      { id: '0', fx: 0.31, fy: 0.28 }, { id: '230', fx: 0.59, fy: 0.28 }, { id: '400', fx: 0.85, fy: 0.28 },
      { id: '0V', fx: 0.41, fy: 0.72 }, { id: '24', fx: 0.70, fy: 0.72 }, { id: '48', fx: 0.85, fy: 0.72 },
    ],
  },
  // ---- Automate programmable (photo réelle du TM221CE16R, /sprites/plc.png) ----
  {
    key: 'plc', name: 'Automate Modicon M221 · TM221CE16R', ref: 'TM221CE16R', brand: 'Schneider',
    kind: 'plc', family: 'Automatisme', modules: 6, poles: 0, w: PLC.w, h: PLC.h,
    terminals: PLC_TERMINALS, switchable: false, svg: false,
  },
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
  // ATV320U07N4C, format COMPACT : 105 x 142 x 158 mm, 0,75 kW, 380-500 V
  // triphase, 2,3 A de sortie, sortie 0,1 a 599 Hz (fiche produit Schneider).
  //
  // C'est le compact et non le book qui est retenu : a l'echelle, le book fait
  // 471 px de haut et mange toute une armoire, alors que le compact en fait 206
  // pour 152 de large. Meme appareil, meme calibre, meme raccordement — seule
  // la forme change, et c'est celle qu'on trouve sur un plateau d'atelier.
  //
  // Bornier de puissance en deux blocs, comme sur l'appareil : l'entree reseau
  // et la terre en haut, le bus continu puis la sortie moteur en bas. Le bloc
  // de commande est en face avant, sous le capot, sur deux rangees — 152 px de
  // large laissent quatre etiquettes lisibles par rangee.
  item({
    key: 'atv320', name: 'Variateur de vitesse Altivar ATV320 · 0,75 kW · compact', ref: 'ATV320U07N4C',
    dims: { largeur: 105, hauteur: 142, profondeur: 158, source: 'fiche' },
    brand: 'Schneider', kind: 'misc', family: 'Variation de vitesse', modules: 6, poles: 3,
    terminals: [
      // bloc de puissance haut : entree reseau + terre
      { id: 'R/L1', fx: 0.14, fy: 0.025 }, { id: 'S/L2', fx: 0.34, fy: 0.025 },
      { id: 'T/L3', fx: 0.54, fy: 0.025 }, { id: 'PE', fx: 0.80, fy: 0.025 },
      // bloc de commande, en face avant, deux rangees
      { id: 'R1A', fx: 0.14, fy: 0.56 }, { id: 'R1C', fx: 0.38, fy: 0.56 },
      { id: '+24', fx: 0.62, fy: 0.56 }, { id: 'COM', fx: 0.86, fy: 0.56 },
      { id: 'LI1', fx: 0.14, fy: 0.70 }, { id: 'LI2', fx: 0.38, fy: 0.70 },
      { id: 'AI1', fx: 0.62, fy: 0.70 },
      // bloc de puissance bas : bus continu puis sortie moteur
      { id: 'PA+', fx: 0.09, fy: 0.975 }, { id: 'PC-', fx: 0.27, fy: 0.975 },
      { id: 'U/T1', fx: 0.50, fy: 0.975 }, { id: 'V/T2', fx: 0.68, fy: 0.975 },
      { id: 'W/T3', fx: 0.86, fy: 0.975 },
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
  // ---- Off-grid 24 V : régulateur, convertisseur, protection batterie, tableau ----
  vector({
    key: 'mppt', name: 'Régulateur MPPT 150/70 · 24 V', ref: 'MPPT-150-70', kind: 'dc',
    family: 'Photovoltaïque', poles: 2, w: 90, h: 120,
    terminals: [
      { id: 'PV+', fx: 0.3, fy: 0.06 }, { id: 'PV−', fx: 0.7, fy: 0.06 },
      { id: 'B+', fx: 0.3, fy: 0.94 }, { id: 'B−', fx: 0.7, fy: 0.94 },
    ],
  }),
  vector({
    key: 'multiplus', name: 'Convertisseur/chargeur MultiPlus 24/3000', ref: 'MULTI-24-3000', kind: 'inverter',
    family: 'Photovoltaïque', poles: 2, w: 110, h: 130,
    terminals: [
      { id: 'B+', fx: 0.16, fy: 0.95 }, { id: 'B−', fx: 0.34, fy: 0.95 },
      { id: 'L', fx: 0.58, fy: 0.95 }, { id: 'N', fx: 0.73, fy: 0.95 }, { id: 'PE', fx: 0.87, fy: 0.95 },
    ],
  }),
  vector({
    key: 'megafuse', name: 'Fusible batterie MEGA 125 A', ref: 'MEGA-125', kind: 'dc',
    family: 'Photovoltaïque', poles: 1, w: 52, h: 60,
    terminals: [{ id: '1', fx: 0.5, fy: 0.1 }, { id: '2', fx: 0.5, fy: 0.9 }],
  }),
  vector({
    key: 'iddr', name: 'Interrupteur différentiel 30 mA · type A · 2P', ref: 'IDDR-30A-2P', kind: 'mcb',
    family: 'Différentiels', poles: 2, w: 72, h: 120,
    terminals: [
      { id: 'L1', fx: 0.3, fy: 0.07 }, { id: 'N1', fx: 0.7, fy: 0.07 },
      { id: 'L2', fx: 0.3, fy: 0.93 }, { id: 'N2', fx: 0.7, fy: 0.93 },
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
