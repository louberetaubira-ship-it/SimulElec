/**
 * Contexte imposé au modèle pour la génération d'un TP.
 *
 * Tout ce que le modèle a le droit d'utiliser est décrit ici, en texte compact :
 * référentiel du diplôme, catalogue d'appareils (clé, désignation, bornes, largeur),
 * géométrie de la platine, exemple de maquette et listes fermées (pannes, instruments).
 * Module PUR : aucune entrée / sortie, donc testable sans réseau.
 */
import type { CatalogueItem, SceneKind } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import { COMPETENCES, DIPLOMAS } from '@/lib/data/competences';
import { CATALOGUE } from '@/lib/data/catalogue';
import { INSTRUMENTS } from '@/lib/sim/mesures';
import { isFaultId, type FaultId } from '@/lib/sim/engine';
import {
  ANNEX_TITLE, DUCTS_H, DUCT_L, DUCT_R, PANEL_H, PANEL_W, RAILS, RAIL_H, RAIL_X,
  RECV_Y, ROW_LABELS, STERM, MTERM, MT2, resIds,
} from '@/lib/scene/geometry';

/** Nombre maximal de lignes d'appareils envoyées au modèle. */
export const LIGNES_CATALOGUE_MAX = 150;

/* ------------------------------------------------------------------ pannes */

/** Liste FERMÉE des pannes injectables par le simulateur (voir `pickFault` / `isFaultId`). */
export const PANNES: { id: FaultId; titre: string; symptome: string; fix: string }[] = [
  {
    id: 'a2',
    titre: 'Fil A2 de la bobine du contacteur desserré',
    symptome: 'Le contacteur vibre et ne tient pas à l’appui sur le bouton marche.',
    fix: 'Resserrer A2 et refaire la continuité A2 – 0 V du bornier X2.',
  },
  {
    id: 's1',
    titre: 'Contact NC du bouton d’arrêt (21-22) resté ouvert',
    symptome: 'Rien ne se passe à l’appui sur marche, la commande est pourtant sous tension.',
    fix: 'Remplacer le bloc de contact du bouton d’arrêt.',
  },
  {
    id: 'l2',
    titre: 'Phase L2 coupée entre le relais thermique et le bornier',
    symptome: 'Le moteur ronfle, ne démarre pas, le thermique finit par déclencher.',
    fix: 'Refaire la liaison de la phase L2 vers le bornier et réarmer le thermique.',
  },
  {
    id: 'x2',
    titre: 'Fil du bornier de commande vers A1 débranché',
    symptome: 'Rien ne se passe à l’appui sur marche, la tension de commande est présente sur le bornier.',
    fix: 'Reconnecter la borne de commande sur A1.',
  },
  {
    id: 'f3',
    titre: 'Protection du secondaire déclenchée',
    symptome: 'Aucun voyant, pas de tension de commande en aval de la protection.',
    fix: 'Chercher le défaut d’isolement du circuit de commande, puis réarmer la protection.',
  },
];

/** La panne est-elle dans la liste fermée ? */
export const panneConnue = (id: string): id is FaultId => isFaultId(id);

/** Panne de la liste fermée, par identifiant. */
export const panneParId = (id: string) => PANNES.find((p) => p.id === id) ?? null;

/* ------------------------------------------------------------ référentiel */

/** Codes de compétences autorisés pour un diplôme. */
export const codesCompetences = (diploma: DiplomaId): string[] =>
  (COMPETENCES[diploma] ?? []).map((c) => c.code);

/** Référentiel du diplôme : `code — libellé` + critères. */
export function contexteReferentiel(diploma: DiplomaId): string {
  const dip = DIPLOMAS.find((d) => d.id === diploma);
  const lignes = (COMPETENCES[diploma] ?? []).map(
    (c) => `${c.code} — ${c.label}${c.unit ? ` (${c.unit})` : ''}\n    critères : ${c.criteria.join(' ; ')}`,
  );
  return [
    `RÉFÉRENTIEL : ${dip?.name ?? diploma}`,
    'Codes de compétences autorisés (aucun autre code n’est accepté) :',
    ...lignes.map((l) => `  ${l}`),
  ].join('\n');
}

/* -------------------------------------------------------------- catalogue */

const bornes = (item: CatalogueItem): string =>
  item.terminals.length ? item.terminals.map((t) => t.id).join(' ') : 'aucune borne';

const ligneAppareil = (item: CatalogueItem): string =>
  `${item.key} | ${item.name} | ${bornes(item)} | ${Math.round(item.w)} px`;

export interface OptionsCatalogue {
  scene: SceneKind;
  /** Appareils de bibliothèque déjà chargés pour cette scène (facultatif). */
  bibliotheque?: CatalogueItem[];
  /** Matériel coché par le professeur : restreint la liste (clés ou fragments de nom). */
  materielDisponible?: string[];
  /** Nombre maximal de lignes (défaut : `LIGNES_CATALOGUE_MAX`). */
  limite?: number;
}

/** Un appareil correspond-il au matériel déclaré disponible par le professeur ? */
function disponible(item: CatalogueItem, filtres: string[]): boolean {
  if (filtres.length === 0) return true;
  const foin = `${item.key} ${item.name} ${item.ref} ${item.family}`.toLowerCase();
  return filtres.some((f) => foin.includes(f));
}

/** L'appareil a-t-il un intérêt pour la scène demandée ? (tri de pertinence) */
function pertinence(item: CatalogueItem, scene: SceneKind, base: boolean): number {
  let score = base ? 0 : 10;
  if (item.terminals.length === 0) score += 30;
  if (scene === 'ind' && ['contactor', 'thermal', 'motorcb', 'trafo', 'button', 'lamp', 'terminal'].includes(item.kind)) score -= 3;
  if (scene === 'hab' && ['mcb', 'rcd', 'main', 'terminal', 'misc'].includes(item.kind)) score -= 3;
  if (scene === 'ter' && ['mcb', 'rcd', 'lamp', 'button', 'misc', 'terminal'].includes(item.kind)) score -= 3;
  if (scene === 'pv' && ['pv', 'inverter', 'battery', 'dc', 'main', 'terminal'].includes(item.kind)) score -= 3;
  return score;
}

/**
 * Catalogue d'appareils autorisé : catalogue de base d'abord, puis les familles de
 * bibliothèque pertinentes, limité à `limite` lignes pour ne pas gonfler le contexte.
 */
export function contexteCatalogue(o: OptionsCatalogue): string {
  const filtres = (o.materielDisponible ?? []).map((m) => m.trim().toLowerCase()).filter(Boolean);
  const limite = o.limite ?? LIGNES_CATALOGUE_MAX;

  const candidats = [
    ...CATALOGUE.map((item) => ({ item, base: true })),
    ...(o.bibliotheque ?? []).map((item) => ({ item, base: false })),
  ]
    .filter(({ item }) => disponible(item, filtres))
    .map((c) => ({ ...c, score: pertinence(c.item, o.scene, c.base) }));

  const vus = new Set<string>();
  const retenus = candidats
    .sort((a, b) => a.score - b.score)
    .filter(({ item }) => (vus.has(item.key) ? false : (vus.add(item.key), true)))
    .slice(0, limite);

  const tete = filtres.length
    ? `CATALOGUE D’APPAREILS AUTORISÉ (restreint au matériel déclaré disponible, ${retenus.length} références)`
    : `CATALOGUE D’APPAREILS AUTORISÉ (${retenus.length} références)`;

  return [
    tete,
    'Format : clé | désignation | bornes | largeur. N’utilise QUE ces clés dans `slots` et `postes`.',
    ...retenus.map(({ item }) => `  ${ligneAppareil(item)}`),
  ].join('\n');
}

/* --------------------------------------------------------------- géométrie */

/** Géométrie de la platine : rails, goulottes, dimensions, zones annexe et récepteurs. */
export function contexteGeometrie(scene: SceneKind): string {
  const rails = RAILS.map((y, i) => `rail ${i} à y = ${y} (hauteur ${RAIL_H})`).join(', ');
  const goulottes = DUCTS_H.map((d, i) => `${ROW_LABELS[scene][i]} : y ${d[0]}–${d[1]}`).join(' ; ');
  return [
    'GÉOMÉTRIE DE LA SCÈNE (unités logiques)',
    `  Platine ${PANEL_W} × ${PANEL_H} : armoire de 0 à 720, bloc récepteurs à partir de y = ${RECV_Y}.`,
    `  Rails DIN : ${rails}. Un appareil se pose avec { rail: 0|1|2, x } ; x va de ${RAIL_X[0]} à ${RAIL_X[1]}.`,
    `  Goulottes horizontales — ${goulottes}.`,
    `  Goulottes verticales : gauche x ${DUCT_L[0]}–${DUCT_L[1]}, droite x ${DUCT_R[0]}–${DUCT_R[1]}.`,
    `  Colonne « ${ANNEX_TITLE[scene === 'ind' ? 'door' : scene === 'hab' ? 'room' : scene === 'ter' ? 'local' : 'roof']} » : x 432 à 550, y 20 à 700 — boutons, voyants, prises, modules.`,
    '  Bloc récepteurs (sous l’armoire) : moteur, hublot, chauffe-eau, réglettes… x 40 à 540.',
    `  Arrivée réseau : ${resIds(scene).join(', ')}.`,
    `  Moteur : ${[...Object.keys(MTERM), ...Object.keys(MT2)].join(', ')}.`,
    `  Coffret de porte (scène industrielle) : ${Object.keys(STERM).join(', ')}.`,
    '  Une borne de liaison s’écrit « slot.borne » : « q1.2 », « km1.A1 », « x1_5.a », « RES.L1 », « M.U1 », « S1.21 », « H1.X1 ».',
  ].join('\n');
}

/* ----------------------------------------------------------------- exemple */

/** Extrait commenté du TP de référence « Démarrage direct » : forme attendue de la maquette. */
export const EXEMPLE_MAQUETTE = `EXEMPLE DE MAQUETTE (extrait commenté du TP « Démarrage direct un sens de marche »)
  scene : "ind", annex : "door", motor : { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 }

  slots (appareils posés) :
    { "id": "q1",  "label": "Q1 · Disjoncteur moteur",  "key": "motorcb", "rail": 0, "x": 52,  "rep": "Q1" }
    { "id": "km1", "label": "KM1 · Contacteur",         "key": "kontakt", "rail": 0, "x": 112, "rep": "KM1" }
    { "id": "f1",  "label": "F1 · Relais thermique",    "key": "therm",   "rail": 0, "x": 180, "rep": "F1" }
    -- bornier : une borne par slot, « mark » = repère imprimé, « sub » = conducteur, « group » = X1 ou X2
    { "id": "x1_1", "label": "X1:1 · L1", "key": "termred", "rail": 2, "x": 52, "mark": "1", "sub": "L1", "group": "X1" }

  liaisons (fils attendus ; "prewired" = fait par l'installateur, "door" = liaison en porte) :
    { "a": "x1_1.a", "b": "q1.1",   "net": "L1" }
    { "a": "q1.2",   "b": "km1.1",  "net": "L1" }
    { "a": "km1.14", "b": "km1.A1", "net": "C" }              -- auto-maintien 13-14
    { "a": "RES.L1", "b": "x1_1.b", "net": "L1", "prewired": true }
    { "a": "x2_1.b", "b": "S1.21",  "net": "C",  "door": true }

  postes (étape « matériel » : une seule bonne référence, deux pièges justifiés) :
    { "id": "q1", "name": "Q1 · Disjoncteur moteur", "need": "Protection magnéto-thermique réglable autour de In",
      "options": [
        { "key": "motorcb", "ref": "GV2ME06", "spec": "1 – 1,6 A",  "why": "Plage trop basse : déclenchera au démarrage." },
        { "key": "motorcb", "ref": "GV2ME08", "spec": "2,5 – 4 A",  "ok": true, "why": "In se règle dans la plage." },
        { "key": "motorcb", "ref": "GV2ME14", "spec": "6 – 10 A",   "why": "Plage trop haute : le moteur n’est pas protégé." } ] }

  mesures (SANS min ni max : le simulateur calcule la valeur) :
    { "id": "rpe",  "title": "Continuité du PE jusqu’à la carcasse moteur", "stage": "horsTension",
      "instrument": "ctrl", "dial": "RPE 200 mA", "a": "x1_5.a", "b": "M.PE", "unit": "Ω" }
    { "id": "u400", "title": "Tension composée en aval de Q1", "stage": "sousTension",
      "instrument": "mm", "dial": "V~", "a": "q1.2", "b": "q1.4", "unit": "V", "when": "run" }
    { "id": "iL",   "title": "Courant de ligne à la pince", "stage": "sousTension",
      "instrument": "clamp", "dial": "A~", "wire": "km1.2>f1.1", "unit": "A", "when": "run" }`;

/* ------------------------------------------------- pannes et instruments */

/** Listes fermées : pannes injectables et instruments de mesure. */
export function contexteListesFermees(): string {
  const pannes = PANNES.map((p) => `  ${p.id} — ${p.titre} (${p.symptome})`);
  const inst = INSTRUMENTS.map((i) => `  ${i.id} — ${i.name} ; positions du sélecteur : ${i.dials.join(', ')}`);
  return [
    'PANNES INJECTABLES (liste fermée : aucun autre identifiant n’est accepté)',
    ...pannes,
    '',
    'INSTRUMENTS DE MESURE (liste fermée)',
    ...inst,
    '',
    'CONDITIONS DE MESURE (`when`) : "off" platine consignée, "ctl" commande sous tension, "run" moteur en marche, absent = puissance sous tension.',
  ].join('\n');
}

/* ------------------------------------------------------------- assemblage */

export interface OptionsContexte extends OptionsCatalogue {
  diploma: DiplomaId;
}

/** Contexte complet imposé au modèle. */
export function construireContexte(o: OptionsContexte): string {
  return [
    contexteReferentiel(o.diploma),
    '',
    contexteCatalogue(o),
    '',
    contexteGeometrie(o.scene),
    '',
    EXEMPLE_MAQUETTE,
    '',
    contexteListesFermees(),
  ].join('\n');
}
