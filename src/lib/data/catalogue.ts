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
  // Un des deux contacteurs de l'inverseur TeSys LC2D09BD (sujet CGM 2023, B.2.6) : même
  // corps que le LC1D09 — la photo est la sienne — mais bobine 24 V CONTINU (repère BD)
  // et ses deux contacts auxiliaires intégrés, 13-14 à fermeture ET 21-22 à ouverture.
  // Le 21-22 sert au verrouillage électrique croisé du folio 02 : KM1.2 NF en série
  // avec la bobine de KM1.1, et réciproquement. Bornes placées sur celles de la photo.
  item({ key: 'lc2d09bd', dims: { largeur: 45, hauteur: 77, profondeur: 95, source: 'fiche' }, name: 'Contacteur-inverseur LC2D09BD · un contacteur · bobine 24 V⎓', ref: 'LC2D09BD', brand: 'Schneider', kind: 'contactor', family: 'Industriel', modules: 2.5, poles: 3, In: 9, coil: 24,
    terminals: [{ id: '1', fx: 0.2, fy: 0.07 }, { id: '3', fx: 0.49, fy: 0.07 }, { id: '5', fx: 0.78, fy: 0.07 },
      { id: '13', fx: 0.36, fy: 0.3 }, { id: '21', fx: 0.62, fy: 0.3 }, { id: 'A1', fx: 0.86, fy: 0.3 },
      { id: '14', fx: 0.36, fy: 0.76 }, { id: '22', fx: 0.62, fy: 0.76 }, { id: 'A2', fx: 0.86, fy: 0.76 },
      { id: '2', fx: 0.2, fy: 0.93 }, { id: '4', fx: 0.49, fy: 0.93 }, { id: '6', fx: 0.78, fy: 0.93 }] }),
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
    // les deux cartouches : une par polarité
    passes: [['1+', '2+'], ['3−', '4−']],
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
  // ---- Installation hybride raccordée (chantier Écobike, CGM 2023) ----
  //
  // Onduleur hybride triphasé IMEON 9.12 (DTR 28), format « book » : les ENTRÉES
  // CONTINUES en haut (strings 1 et 2 sur deux MPPT, parc batterie 48 V), les deux
  // borniers ALTERNATIFS en bas — l'entrée/sortie réseau (E/S réseau AC) et la sortie
  // vers l'utilisation (SORTIE AC), repérée prime comme au folio 01.
  vector({
    key: 'imeon912', name: 'Onduleur hybride triphasé IMEON 9.12 · 9 kW · 2 MPPT · 48 V', ref: 'IMEON 9.12',
    brand: 'IMEON Energy', kind: 'inverter', family: 'Photovoltaïque', poles: 5, w: 180, h: 200,
    terminals: [
      { id: 'PV1+', fx: 0.08, fy: 0.03 }, { id: 'PV1−', fx: 0.18, fy: 0.03 },
      { id: 'PV2+', fx: 0.32, fy: 0.03 }, { id: 'PV2−', fx: 0.42, fy: 0.03 },
      { id: 'BAT+', fx: 0.72, fy: 0.03 }, { id: 'BAT−', fx: 0.86, fy: 0.03 },
      { id: 'L1', fx: 0.06, fy: 0.97 }, { id: 'L2', fx: 0.15, fy: 0.97 }, { id: 'L3', fx: 0.24, fy: 0.97 },
      { id: 'N', fx: 0.33, fy: 0.97 }, { id: 'PE', fx: 0.42, fy: 0.97 },
      { id: 'L1\'', fx: 0.58, fy: 0.97 }, { id: 'L2\'', fx: 0.67, fy: 0.97 }, { id: 'L3\'', fx: 0.76, fy: 0.97 },
      { id: 'N\'', fx: 0.85, fy: 0.97 }, { id: 'PE\'', fx: 0.94, fy: 0.97 },
    ],
  }),
  // Module de batterie lithium Pylontech US2000C (DTR 29) : 48 V · 50 Ah · 2,4 kWh,
  // boîtier 19" noir. Dessiné vu de face dans son rack (bornes de puissance en façade).
  vector({
    key: 'us2000c', name: 'Module batterie lithium Pylontech US2000C · 48 V · 50 Ah · 2,4 kWh', ref: 'US2000C',
    brand: 'Pylontech', kind: 'battery', family: 'Photovoltaïque', poles: 2, w: 300, h: 26,
    terminals: [{ id: '+', fx: 0.86, fy: 0.5 }, { id: '−', fx: 0.95, fy: 0.5 }],
  }),
  // Module Victron SPM043602402 (DTR 27) posé en PORTRAIT, comme au calepinage du
  // corrigé (1,002 m le long des 10,1 m) : + en haut à gauche, − en haut à droite.
  vector({
    key: 'pvmodule', name: 'Module monocristallin Victron SPM043602402 · 360 Wc · 24 V', ref: 'SPM043602402',
    brand: 'Victron Energy', kind: 'pv', family: 'Photovoltaïque', poles: 2, w: 28, h: 56, door: true,
    terminals: [{ id: '+', fx: 0.14, fy: 0 }, { id: '−', fx: 0.86, fy: 0 }],
  }),
  // Boîte de jonction d'un string, en toiture : raccordement MC4 du string et départ
  // en câble solaire 6 mm² vers le coffret, avec la liaison équipotentielle des cadres.
  vector({
    key: 'jbstring', name: 'Boîte de jonction de string · MC4 → câble solaire 6 mm² + PE des cadres', ref: 'JB-STRING',
    kind: 'pv', family: 'Photovoltaïque', poles: 3, w: 70, h: 64, door: true,
    terminals: [
      { id: '+', fx: 0, fy: 0.3 }, { id: '−', fx: 0, fy: 0.62 },
      { id: 'P', fx: 0.25, fy: 0.8 }, { id: 'M', fx: 0.5, fy: 0.8 }, { id: 'PE', fx: 0.75, fy: 0.8 },
    ],
    passes: [['+', 'P'], ['−', 'M']],
  }),
  // Sectionneur DC du PARC BATTERIE : il doit tenir le courant de décharge de
  // l'onduleur (200 A pour l'IMEON 9.12), pas les 32 A d'un sectionneur de string.
  vector({
    key: 'dcswitchbat', name: 'Sectionneur DC batterie 2P 250 A · cadenassable', ref: 'SECT-DC-250',
    kind: 'dc', family: 'Photovoltaïque', poles: 2, w: 52, h: 120,
    terminals: [
      { id: '1+', fx: 0.3, fy: 0.07 }, { id: '3−', fx: 0.7, fy: 0.07 },
      { id: '2+', fx: 0.3, fy: 0.93 }, { id: '4−', fx: 0.7, fy: 0.93 },
    ],
  }),
  vector({
    key: 'dcfusebat', name: 'Porte-fusibles batterie NH00 · 250 A DC', ref: 'PF-NH00-250',
    kind: 'dc', family: 'Photovoltaïque', poles: 2, w: 52, h: 120,
    terminals: [
      { id: '1+', fx: 0.3, fy: 0.07 }, { id: '3−', fx: 0.7, fy: 0.07 },
      { id: '2+', fx: 0.3, fy: 0.93 }, { id: '4−', fx: 0.7, fy: 0.93 },
    ],
    passes: [['1+', '2+'], ['3−', '4−']],
  }),
  vector({
    key: 'megafuse', name: 'Fusible batterie MEGA 125 A', ref: 'MEGA-125', kind: 'dc',
    family: 'Photovoltaïque', poles: 1, w: 52, h: 60,
    terminals: [{ id: '1', fx: 0.5, fy: 0.1 }, { id: '2', fx: 0.5, fy: 0.9 }],
  }),
  // ---- KNX : les quatre appareils du banc DOMO-KNX de l'établissement ----
  //
  // Cotes : « 8 pas de 9 mm » à la fiche pour l'alimentation (72 mm), pas modulaire
  // normalisé pour les deux autres. Le bus sort sur deux bornes repérées + et −,
  // comme sur la platine Langlois ; le 230 V reste sur des bornes L / N / PE.
  vector({
    key: 'knxalim', name: 'Alimentation de bus KNX REG-K 320 mA', ref: 'MTN684032', brand: 'Schneider',
    kind: 'dc', family: 'KNX', poles: 2, w: 104, h: 123,
    dims: { largeur: 72, hauteur: 85, profondeur: 78.5, source: 'norme' },
    terminals: [
      { id: 'L', fx: 0.22, fy: 0.07 }, { id: 'N', fx: 0.5, fy: 0.07 }, { id: 'PE', fx: 0.78, fy: 0.07 },
      // + et − tombent sur les deux moitiés du connecteur de bus dessiné en bas
      // de l'appareil (rouge à gauche, noir à droite) : le fil arrive sur le trou.
      { id: '+', fx: 0.392, fy: 0.91 }, { id: '−', fx: 0.608, fy: 0.91 },
    ],
  }),
  vector({
    key: 'knxusb', name: 'Interface USB KNX REG-K', ref: 'MTN681829', brand: 'Schneider',
    kind: 'dc', family: 'KNX', poles: 2, w: 52, h: 123,
    dims: { largeur: 36, hauteur: 85, profondeur: 78.5, source: 'norme' },
    // Connecteur de bus en haut : + sur la moitié rouge, − sur la moitié noire.
    terminals: [{ id: '+', fx: 0.313, fy: 0.069 }, { id: '−', fx: 0.688, fy: 0.069 }],
  }),
  vector({
    key: 'knxact', name: 'Actionneur de commutation KNX REG-K 2 × 230 V / 10 A', ref: 'MTN649202', brand: 'Schneider',
    kind: 'dc', family: 'KNX', poles: 2, w: 104, h: 123,
    dims: { largeur: 72, hauteur: 85, profondeur: 78.5, source: 'norme' },
    terminals: [
      { id: 'L', fx: 0.2, fy: 0.07 }, { id: '1', fx: 0.5, fy: 0.07 }, { id: '2', fx: 0.8, fy: 0.07 },
      { id: '+', fx: 0.392, fy: 0.91 }, { id: '−', fx: 0.608, fy: 0.91 },
    ],
  }),
  // Posé en ANNEXE (mur du local) : ses deux bornes de bus sont X1 (+) et X2 (−),
  // convention commune à tous les éléments d'annexe (voir `annexTerminals`).
  vector({
    key: 'knxbp', name: 'Bouton-poussoir Unica KNX 2 touches · 4 poussoirs', ref: 'MGU3.531.18', brand: 'Schneider',
    kind: 'button', family: 'KNX', poles: 2, w: 60, h: 60,
    dims: { largeur: 86, hauteur: 86, profondeur: 32, source: 'norme' },
    terminals: [{ id: 'X1', fx: 1, fy: 0.35 }, { id: 'X2', fx: 1, fy: 0.7 }],
    door: true,
  }),
  // ---- KNX · chantier Écobike (TP « Éclairage KNX ») ----
  //
  // Trois appareils de plus, au même gabarit que ceux du plateau tertiaire :
  //  - l'actionneur passe de 2 à 8 voies (MTN647893), pour piloter L1 à L8. Comme sur
  //    l'appareil réel (schéma C.3.2 du sujet, raccordement constructeur DT 50), CHAQUE
  //    voie porte sa paire de bornes : une entrée de phase « L » et une sortie « n ». Les
  //    phases des voies 1 à 4 viennent de Q13, celles des voies 5 à 8 de Q14, pontées de
  //    voie en voie ; le bus arrive en haut à droite, sur le connecteur rouge / noir ;
  //  - l'interface change de nature (USB → IP/KNX, MTN6502-0105) mais garde le gabarit
  //    et les bornes de bus (+ / −) de la précédente : elle est alimentée PAR LE BUS,
  //    jamais en 230 V, exactement comme l'interface USB qu'elle remplace ici ;
  //  - le détecteur de présence + luminosité (MTN630860, boîte saillie MTN550619) est un
  //    élément d'ANNEXE de plus, au même gabarit compact que le poussoir, avec les mêmes
  //    bornes X1 (+) / X2 (−) au dos.
  vector({
    key: 'knxact8', name: 'Actionneur de commutation KNX REG-K 8 × 230 V / 16 A', ref: 'MTN647893', brand: 'Schneider',
    kind: 'dc', family: 'KNX', poles: 2, w: 280, h: 123,
    dims: { largeur: 193, hauteur: 85, profondeur: 78.5, source: 'norme' },
    // Huit paires L / n en bas (phase de la voie, sortie commandée). Le connecteur de bus
    // est ramené en bas à droite, du côté des gaines — sur l'appareil réel il est en haut à
    // droite, mais le câble de bus qui descend vers sa gaine traverserait alors toute la face
    // avant (voir `KnxAct8Svg`). Même convention que `knxact` et `knxalim`.
    terminals: [
      { id: 'L1', fx: 0.0393, fy: 0.93 }, { id: '1', fx: 0.0943, fy: 0.93 }, { id: 'L2', fx: 0.1493, fy: 0.93 }, { id: '2', fx: 0.2043, fy: 0.93 },
      { id: 'L3', fx: 0.2593, fy: 0.93 }, { id: '3', fx: 0.3143, fy: 0.93 }, { id: 'L4', fx: 0.3693, fy: 0.93 }, { id: '4', fx: 0.4243, fy: 0.93 },
      { id: 'L5', fx: 0.4793, fy: 0.93 }, { id: '5', fx: 0.5343, fy: 0.93 }, { id: 'L6', fx: 0.5893, fy: 0.93 }, { id: '6', fx: 0.6443, fy: 0.93 },
      { id: 'L7', fx: 0.6993, fy: 0.93 }, { id: '7', fx: 0.7543, fy: 0.93 }, { id: 'L8', fx: 0.8093, fy: 0.93 }, { id: '8', fx: 0.8643, fy: 0.93 },
      { id: '+', fx: 0.9116, fy: 0.93 }, { id: '−', fx: 0.9652, fy: 0.93 },
    ],
  }),
  vector({
    key: 'knxip', name: 'Interface IP/KNX REG-K', ref: 'MTN6502-0105', brand: 'Schneider',
    kind: 'dc', family: 'KNX', poles: 2, w: 52, h: 123,
    dims: { largeur: 36, hauteur: 85, profondeur: 78.5, source: 'norme' },
    // Connecteur de bus en haut, comme l'interface USB qu'elle remplace ici.
    terminals: [{ id: '+', fx: 0.313, fy: 0.069 }, { id: '−', fx: 0.688, fy: 0.069 }],
  }),
  vector({
    key: 'knxdet', name: 'Détecteur de présence et de luminosité KNX', ref: 'MTN630860 + boîte saillie MTN550619', brand: 'Schneider',
    kind: 'button', family: 'KNX', poles: 2, w: 48, h: 48,
    dims: { largeur: 92, hauteur: 92, profondeur: 52, source: 'norme' },
    terminals: [{ id: 'X1', fx: 1, fy: 0.35 }, { id: 'X2', fx: 1, fy: 0.7 }],
    door: true,
  }),
  // ---- Ensemble terre (hors tableau) ----
  //
  // Ni l'un ni l'autre ne se pose sur un rail : ce sont des éléments d'annexe,
  // dans le local. Leurs bornes suivent la convention des annexes — X1 puis X2 sur
  // le bord droit (voir `annexTerminals`). Le piquet n'en utilise qu'une : rien ne
  // repart d'une prise de terre.
  vector({
    key: 'barrcoupure', name: 'Barrette de coupure · borne principale de terre', ref: 'BPT-16',
    kind: 'terminal', family: 'Terre', poles: 1, w: 84, h: 40,
    dims: { largeur: 58, hauteur: 28, profondeur: 22, source: 'norme' },
    terminals: [{ id: 'X1', fx: 1, fy: 0.35 }, { id: 'X2', fx: 1, fy: 0.7 }],
    door: true,
  }),
  vector({
    key: 'piquet', name: 'Piquet de terre acier cuivré ⌀ 16 · 1 m', ref: 'PIQ-16-1000',
    kind: 'terminal', family: 'Terre', poles: 1, w: 26, h: 96,
    dims: { largeur: 16, hauteur: 1000, profondeur: 16, source: 'norme' },
    terminals: [{ id: 'X1', fx: 1, fy: 0.35 }, { id: 'X2', fx: 1, fy: 0.7 }],
    door: true,
  }),
  // ---- Terrain d'un portail automatique (bloc récepteurs du TP Écobike) ----
  vector({
    key: 'feuorange', name: 'Feu orange clignotant 24 V · grand modèle 7 cd', ref: 'Legrand 0 413 81 + base 0 413 92',
    brand: 'Legrand', kind: 'lamp', family: 'Portail', poles: 2, w: 36, h: 84,
    terminals: [{ id: 'X1', fx: 0.34, fy: 0 }, { id: 'X2', fx: 0.66, fy: 0 }],
  }),
  vector({
    key: 'lecteurrfid', name: 'Lecteur de badge RFID 125 kHz · contact sec', ref: 'LP ROX',
    kind: 'button', family: 'Portail', poles: 2, w: 36, h: 64,
    terminals: [{ id: 'X1', fx: 0.34, fy: 0 }, { id: 'X2', fx: 0.66, fy: 0 }],
  }),
  vector({
    key: 'cellule', name: 'Détecteur photoélectrique reflex 3 fils PNP NO · 4 m', ref: 'XUB1BPANL2 + réflecteur XUZC50',
    brand: 'Schneider', kind: 'button', family: 'Portail', poles: 3, w: 40, h: 56,
    terminals: [{ id: 'X1', fx: 0.2, fy: 0 }, { id: 'X2', fx: 0.5, fy: 0 }, { id: 'X3', fx: 0.8, fy: 0 }],
  }),
  vector({
    key: 'barrepalpeuse', name: 'Barre palpeuse de sécurité · 2 contacts', ref: 'CMM200/J',
    kind: 'button', family: 'Portail', poles: 2, w: 30, h: 92,
    terminals: [{ id: 'X1', fx: 0.34, fy: 0 }, { id: 'X2', fx: 0.66, fy: 0 }],
  }),
  // ---- Portail Écobike v2 : commande en 24 V continu (sujet CGM 2023, folios 01 et 02) ----
  //
  // Alimentation à découpage WAGO 787-1012 (DTR 40) : 100-240 V~ → 24 V⎓ 2,5 A, 72 × 89 ×
  // 55 mm. Entrée L / N en haut, sortie + / − en bas, comme sur la face de l'appareil.
  vector({
    key: 'alim24dc', name: 'Alimentation à découpage 230 V~ → 24 V⎓ · 2,5 A', ref: 'WAGO 787-1012',
    brand: 'WAGO', kind: 'dc', family: 'Alimentation', poles: 2, w: 104, h: 129,
    dims: { largeur: 72, hauteur: 89, profondeur: 55, source: 'fiche' },
    terminals: [
      { id: 'L', fx: 0.3, fy: 0.07 }, { id: 'N', fx: 0.5, fy: 0.07 },
      { id: '+24', fx: 0.3, fy: 0.93 }, { id: '0V', fx: 0.7, fy: 0.93 },
    ],
  }),
  // Contact auxiliaire instantané GV-AE1, à montage FRONTAL sur le disjoncteur moteur GV2ME
  // (DTR 38, B.2.3). Il suit l'appareil qui le porte (`Slot.auxDe`) : 13-14 fermé quand
  // le GV2 est enclenché, ouvert s'il est ouvert ou déclenché. Au folio 01, il est en série
  // sur le + 24 V de commande. Dessiné comme un bloc rapporté de 9 mm, à côté du GV2.
  vector({
    key: 'gvae1', name: 'Contact auxiliaire instantané frontal GV-AE1 · NO', ref: 'GVAE1',
    brand: 'Schneider', kind: 'misc', family: 'Disjoncteurs', poles: 1, w: 22, h: 90,
    dims: { largeur: 15, hauteur: 62, profondeur: 30, source: 'arelever' },
    terminals: [{ id: '13', fx: 0.5, fy: 0.08 }, { id: '14', fx: 0.5, fy: 0.92 }],
  }),
  vector({
    key: 'iddr', name: 'Interrupteur différentiel 30 mA · type A · 2P', ref: 'IDDR-30A-2P', kind: 'mcb',
    family: 'Différentiels', poles: 2, w: 72, h: 120,
    terminals: [
      { id: 'L1', fx: 0.3, fy: 0.07 }, { id: 'N1', fx: 0.7, fy: 0.07 },
      { id: 'L2', fx: 0.3, fy: 0.93 }, { id: 'N2', fx: 0.7, fy: 0.93 },
    ],
  }),
  // ---- CGM 2021 · EIP du lycée Mireille Grenet (TP platine des questions Q13, Q58, Q67) ----
  //
  // Sprites dessinés d'après les documents du sujet (DTR 5, DTR 6, DTR 20, schémas corrigés) :
  // la face et le repérage des bornes sont ceux du dossier, la photo constructeur n'étant pas
  // dans le pack. Les appareils modulaires suivent le pas normalisé (18 mm, 85 mm).
  //
  // Disjoncteur Legrand DX3 phase + neutre, 1 module (4 067 71 en 2 A, 4 067 74 en 16 A) :
  // mêmes bornes que l'iC60N 1P+N — N et 1 en haut, N et 2 en bas.
  item({ key: 'dx3pn', dims: dimsModulaire(1), name: 'Disjoncteur Legrand DX3 phase + neutre · 1 module', ref: 'Legrand DX3 1P+N · 4 067 71 (2 A) / 4 067 74 (16 A)', brand: 'Legrand', kind: 'mcb', family: 'Disjoncteurs', modules: 1, poles: 2, In: 16,
    terminals: [{ id: 'N', fx: 0.28, fy: 0.06 }, { id: '1', fx: 0.72, fy: 0.06 }, { id: 'N2', fx: 0.28, fy: 0.94 }, { id: '2', fx: 0.72, fy: 0.94 }] }),
  // Disjoncteur différentiel de tête du tableau MyHOME (Q56 : 40 A, 30 mA).
  item({ key: 'dx3diff', dims: dimsModulaire(2), name: 'Disjoncteur différentiel Legrand DX3 40 A 30 mA · phase + neutre', ref: 'Legrand DX3 ID 1P+N 40 A 30 mA', brand: 'Legrand', kind: 'rcd', family: 'Différentiels', modules: 2, poles: 2, In: 40,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  // Contacteur « heures creuses » 25 A avec manette I / AUTO / 0 (DTR 5, Legrand 4 125 01) :
  // puissance 1-2 et 3-4, bobine 230 V~ A1-A2 sous les bornes 2 et 4, comme sur la face avant.
  item({ key: 'contacthc', dims: dimsModulaire(1), name: 'Contacteur « heures creuses » 25 A avec manette I / AUTO / 0', ref: 'Legrand 4 125 01 · 25 A · Ue 250 V~', brand: 'Legrand', kind: 'contactor', family: 'Domestique', modules: 1, poles: 2, In: 25, coil: 230,
    terminals: [{ id: '1', fx: 0.28, fy: 0.06 }, { id: '3', fx: 0.72, fy: 0.06 }, { id: '2', fx: 0.28, fy: 0.8 }, { id: '4', fx: 0.72, fy: 0.8 },
      { id: 'A1', fx: 0.28, fy: 0.94 }, { id: 'A2', fx: 0.72, fy: 0.94 }] }),
  // Interrupteur horaire Legrand MicroRex (DTR 6) : moteur U1-U2, contact inverseur 1 (commun),
  // 4 (fermeture) et 2 (ouverture), toutes les bornes en bas comme sur le schéma constructeur.
  item({ key: 'horlogelg', dims: dimsModulaire(3), name: 'Interrupteur horaire (horloge programmable) · contact inverseur 16 A', ref: 'Legrand MicroRex · 4128 11', brand: 'Legrand', kind: 'misc', family: 'Domestique', modules: 3, poles: 2,
    terminals: [{ id: 'U1', fx: 0.12, fy: 0.94 }, { id: 'U2', fx: 0.31, fy: 0.94 }, { id: '1', fx: 0.5, fy: 0.94 }, { id: '4', fx: 0.69, fy: 0.94 }, { id: '2', fx: 0.88, fy: 0.94 }] }),
  // Alimentation du bus MyHOME / SCS : primaire 230 V~ (L N), bus 27 V⎓ 1,2 A (DTR 20).
  item({ key: 'scsalim', dims: dimsModulaire(8), name: 'Alimentation bus MyHOME / SCS · 27 V⎓ 1,2 A', ref: 'BTicino E46ADCN', brand: 'Legrand / BTicino', kind: 'dc', family: 'MyHOME', modules: 8, poles: 2,
    terminals: [{ id: 'L', fx: 0.07, fy: 0.94 }, { id: 'N', fx: 0.15, fy: 0.94 }, { id: '+', fx: 0.62, fy: 0.94 }, { id: '−', fx: 0.72, fy: 0.94 }] }),
  // Actionneurs MyHOME (DTR 21) : les bornes de puissance en haut, le bus (2 fils) en bas.
  item({ key: 'f411n', dims: dimsModulaire(2), name: 'Actionneur MyHOME 1 relais', ref: 'BTicino F411/1N', brand: 'Legrand / BTicino', kind: 'dc', family: 'MyHOME', modules: 2, poles: 2,
    terminals: [{ id: '1', fx: 0.22, fy: 0.06 }, { id: '2', fx: 0.5, fy: 0.06 }, { id: '3', fx: 0.78, fy: 0.06 }, { id: '+', fx: 0.18, fy: 0.94 }, { id: '−', fx: 0.38, fy: 0.94 }] }),
  item({ key: 'f411x4', dims: dimsModulaire(2), name: 'Actionneur MyHOME 4 relais · commun 1', ref: 'BTicino F411/4', brand: 'Legrand / BTicino', kind: 'dc', family: 'MyHOME', modules: 2, poles: 2,
    terminals: [1, 2, 3, 4, 5].map((n, i) => ({ id: String(n), fx: 0.12 + i * 0.19, fy: 0.06 })).concat([{ id: '+', fx: 0.18, fy: 0.94 }, { id: '−', fx: 0.38, fy: 0.94 }]) }),
  item({ key: 'f411v', dims: dimsModulaire(2), name: 'Actionneur MyHOME volet roulant (CAD) · L 1 N 2 3', ref: 'BTicino F411U2', brand: 'Legrand / BTicino', kind: 'dc', family: 'MyHOME', modules: 2, poles: 2,
    terminals: ['L', '1', 'N', '2', '3'].map((id, i) => ({ id, fx: 0.12 + i * 0.19, fy: 0.06 })).concat([{ id: '+', fx: 0.18, fy: 0.94 }, { id: '−', fx: 0.38, fy: 0.94 }]) }),
  // Contrôle d'accès VIGIK (partie 4 du sujet) : alimentation 12 V⎓ de la centrale (AL2),
  // transformateur 230 V~ / 12 V~ de la gâche (AL3), centrale et appareils de la porte.
  item({ key: 'al12dc', dims: dimsModulaire(2), name: 'Alimentation modulaire 230 V~ → 12 V⎓', ref: 'Legrand 1 467 11', brand: 'Legrand', kind: 'dc', family: 'Alimentation', modules: 2, poles: 2,
    terminals: [{ id: '+V', fx: 0.3, fy: 0.06 }, { id: '−V', fx: 0.7, fy: 0.06 }, { id: 'L', fx: 0.3, fy: 0.94 }, { id: 'N', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'trsonn', dims: dimsModulaire(4), name: 'Transformateur modulaire 230 V~ / 12 V~ 1,5 A', ref: 'Legrand 336842', brand: 'Legrand', kind: 'trafo', family: 'Alimentation', modules: 4, poles: 2,
    terminals: [{ id: 'S1', fx: 0.15, fy: 0.06 }, { id: 'S2', fx: 0.85, fy: 0.06 }, { id: 'P1', fx: 0.15, fy: 0.94 }, { id: 'P2', fx: 0.85, fy: 0.94 }] }),
  // Centrale VIGIK autonome : AC AC (alimentation), BP (−), L+ L− (tête de lecture),
  // relais C (commun), R (repos), T (travail). Placée dans le coffret (cahier des charges).
  item({ key: 'cenvigik', name: 'Centrale de contrôle d\'accès VIGIK · 1 porte', ref: 'BTicino BT348043', brand: 'Legrand / BTicino', kind: 'misc', family: 'VIGIK', modules: 0, poles: 2,
    terminals: ['AC1', 'AC2', 'BP', '−', 'L+', 'L−', 'C', 'R', 'T'].map((id, i) => ({ id, fx: 0.08 + i * 0.105, fy: 0.84 })) }),
  // Appareils de terrain, posés dans la colonne annexe : bornes sur le bord droit.
  item({ key: 'lectvigik', name: 'Tête de lecture VIGIK encastrée', ref: 'BTicino BT348704', brand: 'Legrand / BTicino', kind: 'button', family: 'VIGIK', modules: 0, poles: 2, door: true,
    terminals: [{ id: 'L+', fx: 1, fy: 0.35 }, { id: 'L−', fx: 1, fy: 0.7 }] }),
  item({ key: 'bpsortie', name: 'Bouton poussoir anti-vandale · ouverture sortie', ref: 'Legrand 005522', brand: 'Legrand', kind: 'button', family: 'VIGIK', modules: 0, poles: 2, door: true,
    terminals: [{ id: '13', fx: 1, fy: 0.35 }, { id: '14', fx: 1, fy: 0.7 }] }),
  item({ key: 'gache12', name: 'Gâche électrique à émission de courant 12 V', ref: 'Legrand 003033', brand: 'Legrand', kind: 'misc', family: 'VIGIK', modules: 0, poles: 2, door: true,
    terminals: [{ id: '1', fx: 1, fy: 0.35 }, { id: '2', fx: 1, fy: 0.7 }] }),
  item({ key: 'motvolet', name: 'Moteur tubulaire de volet roulant 230 V~ · montée L1, descente L2, neutre N', ref: 'moteur de volet', kind: 'misc', family: 'MyHOME', modules: 0, poles: 3, door: true,
    terminals: [{ id: 'L1', fx: 1, fy: 0.25 }, { id: 'L2', fx: 1, fy: 0.5 }, { id: 'N', fx: 1, fy: 0.75 }] }),
];

export const CATALOGUE_BY_KEY: Record<string, CatalogueItem> = Object.fromEntries(CATALOGUE.map(c => [c.key, c]));
export const FAMILIES = Array.from(new Set(CATALOGUE.map(c => c.family)));

export function spriteUrl(key: string, state?: 'on' | 'off'): string {
  const m = S[key];
  if (state && m?.states) return `/sprites/${key}-${state}.png`;
  return `/sprites/${key}.png`;
}
