/**
 * Contexte imposé au modèle pour la génération d'un TP.
 *
 * Tout ce que le modèle a le droit d'utiliser est décrit ici, en texte compact :
 * référentiel du diplôme, index COMPLET de la bibliothèque (premier temps de la sélection
 * du matériel), détail des seuls appareils retenus (second temps), géométrie de la platine,
 * exemple de maquette et listes fermées (pannes, instruments).
 * Module PUR : aucune entrée / sortie, donc testable sans réseau.
 */
import type { CatalogueItem, SceneKind } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import { COMPETENCES, DIPLOMAS } from '@/lib/data/competences';
import { INSTRUMENTS } from '@/lib/sim/mesures';
import { isFaultId, type FaultId } from '@/lib/sim/engine';
import {
  ANNEX_TITLE, DUCTS_H, DUCT_L, DUCT_R, PANEL_H, PANEL_W, RAILS, RAIL_H, RAIL_X,
  RECV_Y, ROW_LABELS, STERM, MTERM, MT2, resIds,
} from '@/lib/scene/geometry';

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

/* -------------------------------------------------------------- appareils */

/** Bornes raccordables d'un appareil, en clair. */
const bornes = (item: CatalogueItem): string =>
  item.terminals.length ? item.terminals.map((t) => t.id).join(' ') : 'aucune borne';

/* ------------------------------------------------- index complet (1er temps) */

/** Une ligne de l'index complet : le strict nécessaire pour choisir un appareil. */
export interface EntreeIndex {
  key: string;
  nom: string;
  famille: string;
  /** Nombre de bornes raccordables (0 = élément décoratif ou support). */
  bornes: number;
}

/** Désignation débarrassée du numéro de planche : « Disjoncteur · pl. 10 n°3 » → « Disjoncteur ». */
const designation = (nom: string): string => {
  const net = nom.replace(/\s*·?\s*pl\.\s*\d+\s*n°\s*\d+\s*$/i, '').trim();
  return net || nom.trim() || 'élément';
};

/**
 * INDEX COMPLET de la bibliothèque, compressé : regroupé par famille, puis par
 * désignation (les doublons de désignation sont fusionnés), chaque clé suivie de son
 * nombre de bornes. Rien n'est tronqué : tout appareil simulable y figure.
 *
 * Module PUR : la lecture des planches est faite par `index-bibliotheque.ts`.
 */
export function contexteIndexComplet(entrees: EntreeIndex[]): string {
  const familles = new Map<string, Map<string, string[]>>();
  for (const e of entrees) {
    const parDesignation = familles.get(e.famille) ?? new Map<string, string[]>();
    const nom = designation(e.nom);
    const cles = parDesignation.get(nom) ?? [];
    cles.push(`${e.key}(${e.bornes})`);
    parDesignation.set(nom, cles);
    familles.set(e.famille, parDesignation);
  }

  const lignes: string[] = [];
  for (const [famille, parDesignation] of Array.from(familles.entries())) {
    lignes.push(`# ${famille}`);
    for (const [nom, cles] of Array.from(parDesignation.entries())) {
      lignes.push(`  ${nom} : ${cles.join(' ')}`);
    }
  }

  return [
    `BIBLIOTHÈQUE COMPLÈTE DES APPAREILS SIMULABLES (${entrees.length} références, ${familles.size} familles)`,
    'Lecture : « # famille », puis « désignation : clé(nombre de bornes) clé(nombre de bornes)… ».',
    'Un appareil sans borne (0) ne se câble pas : il sert de repère, de support ou de décor.',
    'Aucune autre clé n’existe : une clé inventée rend le TP injouable.',
    ...lignes,
  ].join('\n');
}

/* ------------------------------------------- détail des appareils (2e temps) */

/** Détail d'un appareil retenu : bornes nommées, largeur, hauteur, pose. */
function ligneDetail(item: CatalogueItem, rep?: string): string {
  const pose = item.door ? 'porte / annexe' : item.terminals.length ? 'rail DIN' : 'décor';
  return [
    `  ${item.key}${rep ? ` [repère envisagé ${rep}]` : ''} | ${item.name} | ${item.family}`,
    `      bornes : ${bornes(item)}`,
    `      encombrement : ${Math.round(item.w)} × ${Math.round(item.h)} px, ${item.modules} module(s), pose ${pose}`,
  ].join('\n');
}

/** Appareil retenu par l'appel « choix du matériel », avec le repère envisagé. */
export interface AppareilRetenu {
  item: CatalogueItem;
  rep?: string;
}

/**
 * Détail COMPLET des seuls appareils retenus : c'est tout ce dont l'appel « maquette »
 * a besoin pour poser les rails, tirer les liaisons et placer les mesures.
 */
export function contexteDetailAppareils(retenus: AppareilRetenu[]): string {
  return [
    `APPAREILS RETENUS POUR CE TP (${retenus.length} références — liste fermée)`,
    'Format : clé | désignation | famille, puis bornes, encombrement et mode de pose.',
    'N’utilise QUE ces clés dans `slots` et dans les options de `postes`.',
    ...retenus.map((r) => ligneDetail(r.item, r.rep)),
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

export interface OptionsContexte {
  diploma: DiplomaId;
  scene: SceneKind;
  /** Appareils retenus au premier temps : seul leur détail part au modèle. */
  retenus: AppareilRetenu[];
}

/** Contexte complet imposé au modèle pour l'appel « maquette » (et sa réparation). */
export function construireContexte(o: OptionsContexte): string {
  return [
    contexteReferentiel(o.diploma),
    '',
    contexteDetailAppareils(o.retenus),
    '',
    contexteGeometrie(o.scene),
    '',
    EXEMPLE_MAQUETTE,
    '',
    contexteListesFermees(),
  ].join('\n');
}
