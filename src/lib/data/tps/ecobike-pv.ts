/**
 * TP 1 · Énergie photovoltaïque de l'Écobike (lycée L. Couffignal).
 *
 * Tiré du sujet CGM MELEC 2023, partie A (corrigé A.1 à A.3), troisième TP du chantier
 * Écobike après le portail (partie B) et l'éclairage KNX (partie C). L'Écobike recharge
 * 13 VAE par jour (40 % du parc) en AUTOCONSOMMATION : 20 modules Victron SPM043602402
 * (360 Wc) sur la toiture de 10,1 × 4,1 m, un onduleur HYBRIDE triphasé IMEON 9.12, cinq
 * modules lithium Pylontech US2000C en parallèle, et le réseau public 3 × 400 V + N en
 * secours. Démarche en deux temps, validée sur maquette :
 *
 *  - Temps A · COMPRENDRE (préparation) : six blocs appuyés sur les DOCUMENTS RÉELS du
 *    dossier, affichés dans le TP (`preparation.documents`) — synoptique DTR 2,
 *    technologies DTR 3, tableau CALSOL DTR 4 (l'IGP 3,22 se LIT, il n'est pas donné),
 *    toiture DTR 1, bilan A.1.6, fiches DTR 27 à 29, folio 01 et DTR 30.
 *  - Temps B · RÉALISER comme sur chantier (matériel → validation) : les appareils du
 *    sujet, le câblage du folio 01, la consignation des TROIS sources, les mesures, la
 *    mise en service de l'IMEON (`MiseEnServiceImeon.tsx`) et l'essai des quatre
 *    situations de fonctionnement (`EssaiImeon.tsx`).
 *
 * ------------------------------------------------------------ topologie / moteur
 * Le moteur de simulation ne connaît que trois organes (`q1`, `f2`, `f3`) et un organe
 * « en service » (`km1`). Une installation hybride en a davantage : trois SOURCES
 * (réseau, champ PV sur deux strings, parc batterie) et deux protections alternatives.
 * Correspondance retenue, comme les autres TP le documentent :
 *   · `q1`  = D1, disjoncteur tétrapolaire de l'E/S réseau AC — organe de consignation
 *     principal (cadenas), le 400 V~ du réseau se mesure en aval ;
 *   · `f2`  = Q5, sectionneur DC du string 1 — la « source champ » historique du moteur
 *     (`consignationVat.champ`, bornes avales `live: 'q2'`, vives dès Q5 fermé, que D1
 *     le soit ou non) ;
 *   · `f3`  = D2, disjoncteur tétrapolaire de la SORTIE AC vers le tableau de l'Écobike :
 *     son déclenchement est la panne `f3` historique (`live: 'q3'` = onduleur en service
 *     ET D2 fermé) ;
 *   · `km1` = IMEON 9.12 « en service » (clic sur l'appareil, après réglages conformes).
 * Les deux organes qui manquent au moteur — Q6 (string 2) et Q4 (parc batterie) — sont
 * déclarés en `sectionneurs` : chacun a SON état dans `sim.aux`, se manœuvre au clic, porte
 * son cadenas, doit être ouvert à la séparation et refermé à la remise sous tension, et ses
 * bornes avales se déclarent `live: 'aux:q6'` / `'aux:q4'`. C'est ce qui rend la
 * consignation à trois sources réelle, et non racontée.
 *
 * Tensions continues : une seule constante ne suffit plus (474 V à vide sur un string,
 * 49,6 V sur le parc). Chaque borne DC porte sa tension (`TerminalNet.u`) ; le multimètre
 * en V⎓ affiche le SIGNE (pointe rouge sur un −, il lit une tension négative), ce qui rend
 * la panne de polarité inversée visible. Limite assumée : la tension d'un string est celle
 * À VIDE (474 V), y compris onduleur en service — l'écran de supervision de l'essai affiche,
 * lui, les 384 V du point de puissance maximale.
 *
 * Le parc batterie est dans un RACK hors coffret (bloc du bas), le champ en toiture (bandeau
 * du haut) avec une boîte de jonction par string ; le 400 V arrive du pupitre d'alimentation
 * de l'atelier, comme sur les deux autres TP du chantier.
 */
import type { AnnexItem, Fault, Liaison, PrepQuestion, Slot, TerminalNet, TpDefinition } from '@/lib/types';
import { L, TEST_ISO, TEST_PE, TEST_VAT } from './common';

/* ------------------------------------------------------------ données du chantier */

/** Tension à vide d'un string : 10 × Voc = 10 × 47,4 V. */
const VOC_STRING = 474;
/** Tension du parc US2000C (15 cellules LiFePO₄, état de charge courant). */
const U_PARC = 49.6;
/** Documents du dossier, servis depuis `public/tp/ecobike-pv/`. */
const DOC = (f: string) => `/tp/ecobike-pv/${f}`;

/* ------------------------------------------------------------ toiture & rack */

/** Deux rangées de 10 modules au format portrait (1,002 m le long des 10,1 m) : une rangée = un string. */
const MOD_W = 28;
const MOD_H = 56;
const MOD_PAS = 40;
const RANGEE_Y = [58, 162];

const ROOF: AnnexItem[] = [
  ...[0, 1].flatMap(r => Array.from({ length: 10 }, (_, c) => ({
    key: 'pvmodule',
    rep: `PV${r * 10 + c + 1}`,
    name: `SPM043602402 · 360 Wc · string ${r + 1}`,
    x: 14 + c * MOD_PAS,
    y: RANGEE_Y[r],
    w: MOD_W,
    h: MOD_H,
  }))),
  // Une boîte de jonction par string, à droite du champ. Celle du string 2 est la plus
  // proche des modules : les conducteurs de la rangée basse n'ont pas à passer sous
  // la boîte du string 1. Départs par le bas, vers les deux gaines d'entrée du coffret.
  { key: 'jbstring', rep: 'JB2', name: 'boîte de jonction · string 2', x: 422, y: 50, w: 48, h: 60 },
  { key: 'jbstring', rep: 'JB1', name: 'boîte de jonction · string 1', x: 488, y: 50, w: 48, h: 60 },
];

/** Rack du parc : cinq US2000C empilés, raccordés en parallèle par l'élève. */
const RACK: AnnexItem[] = Array.from({ length: 5 }, (_, i) => ({
  key: 'us2000c',
  rep: `BAT${i + 1}`,
  name: 'Pylontech US2000C · 48 V · 50 Ah',
  x: 130,
  y: 14 + i * 34,
  w: 300,
  h: 22,
  recv: true,
}));

/* ------------------------------------------------------------ bornier X1 */

/**
 * X1 : arrivée réseau (1 à 5), départ vers le tableau de l'Écobike (6 à 10), et une
 * borne de terre (11) qui reçoit les masses du champ (cadres des modules via les boîtes
 * de jonction) et les parafoudres DC.
 */
const X1_ROWS: [string, string, string][] = [
  ['termred', 'L1', 'Arrivée L1'], ['termred', 'L2', 'Arrivée L2'], ['termred', 'L3', 'Arrivée L3'],
  ['termblue', 'N', 'Arrivée N'], ['earth', 'PE', 'Arrivée PE · terre'],
  ['termred', 'L1', 'Départ L1'], ['termred', 'L2', 'Départ L2'], ['termred', 'L3', 'Départ L3'],
  ['termblue', 'N', 'Départ N'], ['earth', 'PE', 'Départ PE'],
  ['earth', 'PE', 'Masses du champ PV · parafoudres'],
];
// La borne 11 est sur le rail des protections DC, à côté des parafoudres et sous
// les gaines du champ : les masses du champ n'ont pas à traverser tout le coffret.
const X1_PV: Slot[] = X1_ROWS.map(([key, sub, label], i) => ({
  id: `x1_${i + 1}`,
  label: `X1:${i + 1} · ${label}`,
  key,
  rail: i === 10 ? 0 : 2,
  x: i === 10 ? 374 : 60 + i * 20 + (i >= 5 ? 10 : 0),
  mark: String(i + 1),
  sub,
  group: 'X1',
  ...(i === 0 ? { groupLabel: 'X1 · arrivée réseau · départ tableau Écobike' } : {}),
}));

/* ------------------------------------------------------------ liaisons */

/** Mise en série d'une rangée : − d'un module → + du suivant. */
const serie = (premier: number): Liaison[] =>
  Array.from({ length: 9 }, (_, i) => L(`PV${premier + i}.X2`, `PV${premier + i + 1}.X1`, 'DC+'));

/** Chaîne d'un string, de la boîte de jonction à l'entrée PV de l'onduleur. */
const chaineString = (jb: string, fus: string, sect: string, pf: string, entree: 'PV1' | 'PV2'): Liaison[] => [
  L(`${jb}.P`, `${fus}.1+`, 'DC+'), L(`${jb}.M`, `${fus}.3−`, 'DC-'), L(`${jb}.PE`, 'x1_11.a', 'PE'),
  L(`${fus}.2+`, `${sect}.1+`, 'DC+'), L(`${fus}.4−`, `${sect}.3−`, 'DC-'),
  L(`${sect}.2+`, `km1.${entree}+`, 'DC+'), L(`${sect}.4−`, `km1.${entree}−`, 'DC-'),
  L(`${sect}.2+`, `${pf}.+`, 'DC+'), L(`${sect}.4−`, `${pf}.−`, 'DC-'), L(`${pf}.PE`, 'x1_11.b', 'PE'),
];

const LIAISONS: Liaison[] = [
  // ---- toiture : deux strings de 10 modules en série (colonnes M et P du folio 01) ----
  ...serie(1), L('PV1.X1', 'JB1.+', 'DC+'), L('PV10.X2', 'JB1.−', 'DC-'),
  ...serie(11), L('PV11.X1', 'JB2.+', 'DC+'), L('PV20.X2', 'JB2.−', 'DC-'),
  // ---- coffret DC : fusibles gPV → sectionneur → entrée PV (parafoudres en dérivation) ----
  ...chaineString('JB1', 'fs1', 'f2', 'pf1', 'PV1'),
  ...chaineString('JB2', 'fs2', 'q6', 'pf2', 'PV2'),
  // ---- rack : cinq US2000C en PARALLÈLE (+ ensemble, − ensemble) ----
  ...[1, 2, 3, 4].map(i => L(`BAT${i}.X1`, `BAT${i + 1}.X1`, 'DC+')),
  ...[1, 2, 3, 4].map(i => L(`BAT${i}.X2`, `BAT${i + 1}.X2`, 'DC-')),
  // ---- parc → fusibles F4 → sectionneur Q4 → ENTRÉE BATTERIES ----
  // Le parc monte du rack par le BAS du coffret : il entre sur le bas des fusibles F4.
  L('BAT1.X1', 'fb.2+', 'DC+'), L('BAT1.X2', 'fb.4−', 'DC-'),
  L('fb.1+', 'q4.1+', 'DC+'), L('fb.3−', 'q4.3−', 'DC-'),
  L('q4.2+', 'km1.BAT+', 'DC+'), L('q4.4−', 'km1.BAT−', 'DC-'),
  // ---- arrivée réseau depuis le pupitre d'alimentation → X1 → D1 → E/S réseau AC ----
  L('RES.L1', 'x1_1.b', 'L1'), L('RES.L2', 'x1_2.b', 'L2'), L('RES.L3', 'x1_3.b', 'L3'),
  L('RES.N', 'x1_4.b', 'N'), L('RES.PE', 'x1_5.b', 'PE'),
  L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'), L('x1_4.a', 'q1.N', 'N'),
  L('q1.2', 'km1.L1', 'L1'), L('q1.4', 'km1.L2', 'L2'), L('q1.6', 'km1.L3', 'L3'), L('q1.N2', 'km1.N', 'N'),
  L('x1_5.a', 'km1.PE', 'PE'),
  // ---- SORTIE AC → D2 → X1 (départ vers le tableau électrique de l'Écobike) ----
  L('km1.L1\'', 'f3.1', 'L1'), L('km1.L2\'', 'f3.3', 'L2'), L('km1.L3\'', 'f3.5', 'L3'), L('km1.N\'', 'f3.N', 'N'),
  L('f3.2', 'x1_6.a', 'L1'), L('f3.4', 'x1_7.a', 'L2'), L('f3.6', 'x1_8.a', 'L3'), L('f3.N2', 'x1_9.a', 'N'),
  L('km1.PE\'', 'x1_10.a', 'PE'),
  // ---- barrette de terre : masses du champ reliées à la terre de l'arrivée ----
  L('x1_5.a', 'x1_11.b', 'PE'),
];

/* ------------------------------------------------------------ réseaux */

function netsEcobikePv(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live'], u?: number) => {
    for (const id of ids) n[id] = { net, live, ...(u != null ? { u } : {}) };
  };
  const ab = (b: string) => [`${b}.a`, `${b}.b`];

  // ---- champ : vif tant qu'il fait jour, quoi qu'on ouvre en aval ----
  for (const premier of [1, 11]) {
    const dernier = premier + 9;
    set([`PV${premier}.X1`], 'DC+', 'always', VOC_STRING);
    // points intermédiaires de la série : un même conducteur (− d'un module, + du suivant)
    for (let i = premier; i < dernier; i++) set([`PV${i}.X2`, `PV${i + 1}.X1`], 'DC+', 'always');
    set([`PV${dernier}.X2`], 'DC-', 'always', VOC_STRING);
  }
  for (const [jb, fus] of [['JB1', 'fs1'], ['JB2', 'fs2']]) {
    set([`${jb}.+`, `${jb}.P`, `${fus}.1+`, `${fus}.2+`], 'DC+', 'always', VOC_STRING);
    set([`${jb}.−`, `${jb}.M`, `${fus}.3−`, `${fus}.4−`], 'DC-', 'always', VOC_STRING);
    set([`${jb}.PE`], 'PE', 'always');
  }
  // ---- string 1 : Q5 (organe `f2` du moteur) ----
  set(['f2.1+'], 'DC+', 'always', VOC_STRING); set(['f2.3−'], 'DC-', 'always', VOC_STRING);
  set(['f2.2+', 'pf1.+', 'km1.PV1+'], 'DC+', 'q2', VOC_STRING);
  set(['f2.4−', 'pf1.−', 'km1.PV1−'], 'DC-', 'q2', VOC_STRING);
  set(['pf1.PE'], 'PE', 'always');
  // ---- string 2 : Q6 (organe supplémentaire) ----
  set(['q6.1+'], 'DC+', 'always', VOC_STRING); set(['q6.3−'], 'DC-', 'always', VOC_STRING);
  set(['q6.2+', 'pf2.+', 'km1.PV2+'], 'DC+', 'aux:q6', VOC_STRING);
  set(['q6.4−', 'pf2.−', 'km1.PV2−'], 'DC-', 'aux:q6', VOC_STRING);
  set(['pf2.PE'], 'PE', 'always');
  // ---- parc : cinq modules en parallèle, toujours chargés ----
  for (let i = 1; i <= 5; i++) {
    set([`BAT${i}.X1`], 'DC+', 'always', U_PARC); set([`BAT${i}.X2`], 'DC-', 'always', U_PARC);
  }
  set(['fb.1+', 'fb.2+', 'q4.1+'], 'DC+', 'always', U_PARC);
  set(['fb.3−', 'fb.4−', 'q4.3−'], 'DC-', 'always', U_PARC);
  set(['q4.2+', 'km1.BAT+'], 'DC+', 'aux:q4', U_PARC);
  set(['q4.4−', 'km1.BAT−'], 'DC-', 'aux:q4', U_PARC);
  // ---- réseau : amont de D1 toujours sous tension, aval si D1 fermé ----
  set(ab('x1_1'), 'L1', 'always'); set(ab('x1_2'), 'L2', 'always'); set(ab('x1_3'), 'L3', 'always');
  set(ab('x1_4'), 'N', 'always'); set(ab('x1_5'), 'PE', 'always');
  set(['q1.1'], 'L1', 'always'); set(['q1.3'], 'L2', 'always'); set(['q1.5'], 'L3', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2', 'km1.L1'], 'L1', 'q1'); set(['q1.4', 'km1.L2'], 'L2', 'q1'); set(['q1.6', 'km1.L3'], 'L3', 'q1');
  set(['q1.N2', 'km1.N'], 'N', 'q1');
  set(['km1.PE', 'km1.PE\''], 'PE', 'always');
  // ---- sortie AC : présente quand l'IMEON est en service, au tableau si D2 est fermé ----
  set(['km1.L1\'', 'f3.1'], 'L1', 'run'); set(['km1.L2\'', 'f3.3'], 'L2', 'run'); set(['km1.L3\'', 'f3.5'], 'L3', 'run');
  set(['km1.N\'', 'f3.N'], 'N', 'run');
  set(['f3.2', ...ab('x1_6')], 'L1', 'q3'); set(['f3.4', ...ab('x1_7')], 'L2', 'q3'); set(['f3.6', ...ab('x1_8')], 'L3', 'q3');
  set(['f3.N2', ...ab('x1_9')], 'N', 'q3');
  set(ab('x1_10'), 'PE', 'always'); set(ab('x1_11'), 'PE', 'always');
  return n;
}

/** Bornes du string 1 qui ne reçoivent plus rien quand sa chaîne est ouverte en amont. */
const STRING1_AVAL = ['fs1.2+', 'fs1.4−', 'f2.1+', 'f2.3−', 'f2.2+', 'f2.4−', 'pf1.+', 'pf1.−', 'km1.PV1+', 'km1.PV1−'];
const hors = (ids: string[]): Record<string, Partial<TerminalNet>> =>
  Object.fromEntries(ids.map(id => [id, { live: 'off' as const }]));

const FAULTS: Fault[] = [
  {
    id: 'gpv1',
    title: 'Fusibles gPV du string 1 fondus',
    symptom: 'L’écran de l’IMEON affiche PV1 = 0 V alors que PV2 donne ses 384 V : la production a chuté de moitié en plein soleil.',
    fix: 'Chercher la cause (courant de retour, défaut d’isolement du string 1), remplacer les cartouches gPV 15 A de F5, refermer Q5.',
    ouvre: 'fs1',
    nets: hors(['fs1.2+', 'fs1.4−', 'f2.1+', 'f2.3−', 'f2.2+', 'f2.4−', 'pf1.+', 'pf1.−', 'km1.PV1+', 'km1.PV1−']),
    action: 'Remplacer les cartouches gPV 15 A du string 1 (F5) après avoir cherché la cause',
  },
  {
    id: 'mc4',
    title: 'Connecteur MC4 débranché entre deux modules du string 1',
    symptom: 'PV1 = 0 V à l’écran de l’IMEON ; à vide, le string 1 ne donne plus ses 474 V, ni au coffret ni à sa boîte de jonction.',
    fix: 'Contrôler la continuité de la série module par module, reconnecter et verrouiller le connecteur MC4 défaillant.',
    coupe: 'PV5.X2>PV6.X1',
    nets: hors(['PV1.X1', 'PV10.X2', 'JB1.+', 'JB1.−', 'JB1.P', 'JB1.M', 'fs1.1+', 'fs1.3−', ...STRING1_AVAL]),
    action: 'Reconnecter et verrouiller le connecteur MC4 ouvert dans le string 1',
  },
  {
    id: 'polbat',
    title: 'Polarité inversée sur l’entrée batteries de l’IMEON',
    symptom: 'L’IMEON affiche un défaut « batterie » et refuse de démarrer, alors que le parc donne bien ses 48 V au rack.',
    fix: 'Consigner, puis remettre le conducteur rouge (+) sur BAT+ et le noir (−) sur BAT− de l’entrée batteries ; contrôler la polarité avant de refermer Q4.',
    croise: ['q4.2+>km1.BAT+', 'q4.4−>km1.BAT−'],
    action: 'Remettre + rouge sur BAT+ et − noir sur BAT− à l’entrée batteries de l’IMEON',
  },
  {
    id: 'bat5',
    title: 'Un module US2000C du rack non raccordé',
    symptom: 'L’IMEON n’annonce que 200 Ah de capacité au lieu de 250 Ah ; la tension du parc est pourtant normale.',
    fix: 'Reprendre la liaison + du module BAT5 dans le rack (et son câble de communication), contrôler la continuité du parallèle.',
    coupe: 'BAT4.X1>BAT5.X1',
    action: 'Raccorder le + du module BAT5 au parallèle du rack',
  },
  {
    id: 'd1',
    title: 'Phase L1 absente sur l’E/S réseau AC de l’IMEON',
    symptom: 'La nuit, l’Écobike n’est plus secouru par le réseau : l’IMEON signale une phase absente sur son E/S réseau AC, alors que D1 est fermé.',
    fix: 'Contrôler la présence des trois phases en aval de D1, puis reprendre le conducteur L1 entre D1 et l’E/S réseau AC.',
    coupe: 'q1.2>km1.L1',
    nets: hors(['km1.L1']),
    action: 'Reprendre le conducteur L1 entre D1 et l’E/S réseau AC de l’IMEON',
  },
  {
    id: 'f3',
    title: 'D2 déclenché (sortie AC vers le tableau)',
    symptom: 'Plus rien au tableau de l’Écobike, alors que l’IMEON est en service et affiche sa production et sa sortie AC.',
    fix: 'Chercher le défaut sur le départ vers le tableau de l’Écobike, puis réarmer D2.',
    ouvre: 'f3',
    action: 'Chercher le défaut en aval puis réarmer D2',
  },
];

/* ------------------------------------------------------------ préparation */

/** Question de préparation : la bonne réponse est toujours la première (l'ordre est mélangé à l'affichage). */
const Q = (id: string, rep: string, doc: string, invite: string, options: string[], why: string): PrepQuestion =>
  ({ id, rep, doc, invite, options, answer: 0, why });

export const TP_ECOBIKE_PV: TpDefinition = {
  id: 'ecobike-pv',
  title: 'Écobike · Énergie photovoltaïque (TP 1)',
  level: 'Tle Bac Pro MELEC',
  family: 'pv',
  scene: 'pv',
  annex: 'roof',
  playable: true,
  competences: ['C1 Analyser', 'C3 Concevoir', 'C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  diplomas: ['bacpro'],
  arriveeMono: false,
  summary:
    'Chantier Écobike (sujet CGM MELEC 2023, partie A). Alimentation photovoltaïque en autoconsommation du '
    + 'local à vélos : 20 modules Victron 360 Wc en 2 strings de 10, onduleur hybride triphasé IMEON 9.12, '
    + '5 batteries Pylontech US2000C en parallèle, réseau public 3 × 400 V + N en secours. Temps A : '
    + 'comprendre et dimensionner sur les documents réels du dossier (synoptique, CALSOL, toiture, fiches). '
    + 'Temps B : câbler d’après le folio 01, consigner les trois sources, mettre l’IMEON en service et '
    + 'vérifier les quatre situations de fonctionnement.',
  situation:
    'Le lycée Louis Couffignal veut un Écobike sobre en énergie : le local à vélos doit recharger 13 vélos '
    + 'à assistance électrique par jour avec sa propre production solaire, stockée dans des batteries, le '
    + 'réseau public ne servant que de secours. Tu étudies d’abord l’installation sur les documents du '
    + 'dossier — synoptique, irradiation de Strasbourg, toiture, fiches constructeur — pour retrouver le '
    + 'dimensionnement du bureau d’études. Puis tu réalises l’installation comme sur le chantier : choix '
    + 'des appareils, câblage des strings, du rack et du coffret d’après le folio 01, consignation des trois '
    + 'sources, mesures, paramétrage de l’IMEON et essai des quatre situations.',
  plaqueTitre: 'INSTALLATION PV HYBRIDE · ÉCOBIKE',
  plaque: {
    'Besoin Ec': '10 326 Wh/j · 13 VAE',
    'Champ PV': '20 × 360 Wc = 7 200 Wc',
    Strings: '2 × 10 série · 384 V MPP · 474 V à vide',
    Onduleur: 'IMEON 9.12 · 9 kW · 3/N/PE 400 V',
    Parc: '5 × US2000C en parallèle · 48 V · 250 Ah',
    Réseau: '3 × 400 V + N · secours',
    Lieu: 'Strasbourg · Sud · 30° · IGP 3,22',
  },
  cahierDesCharges: [
    { k: 'Usage', v: '13 VAE rechargés par jour (40 % des 32 places), éclairage, portail, vidéosurveillance : Ec = 10 326 Wh/j' },
    { k: 'Principe', v: 'autoconsommation : le PV alimente d’abord, les batteries stockent le surplus, le réseau ne sert que de secours — pas d’injection' },
    { k: 'Champ PV', v: '20 modules SPM043602402 (360 Wc, 24 V, série 4b) sur la toiture 10,1 × 4,1 m, orientés Sud à 30°' },
    { k: 'Strings', v: '2 strings de 10 modules en série (384 V MPP, 474 V à vide) sur les deux entrées MPPT de l’IMEON' },
    { k: 'Protections DC', v: 'par string : fusibles gPV 15 A (F5 / F6), sectionneur DC 1000 V (Q5 / Q6), parafoudres DC type 2 (PF5 / PF6)' },
    { k: 'Stockage', v: '5 × Pylontech US2000C en PARALLÈLE : 48 V, 250 Ah ≥ 230 Ah — rack hors coffret, communication CAN' },
    { k: 'Batteries', v: 'fusibles F4 et sectionneur DC Q4 dimensionnés sur les 200 A de décharge de l’IMEON' },
    { k: 'Onduleur', v: 'IMEON 9.12 hybride triphasé : E/S réseau AC par D1, SORTIE AC par D2 vers le tableau de l’Écobike' },
    { k: 'Réseau', v: '3 × 400 V + N + PE depuis le pupitre d’alimentation de l’atelier, arrivée sur X1' },
    { k: 'Couleurs', v: '+ rouge · − noir · PE vert-jaune (imposées par le folio 01)' },
    { k: 'Consignation', v: 'TROIS sources : réseau (D1), champ PV (Q5 et Q6), parc batterie (Q4) — VAT sur les entrées de l’IMEON' },
    { k: 'Mise en service', v: 'priorité PV › Stockage › Réseau, injection désactivée, batterie Lithium (CAN), puis essai des 4 situations' },
  ],
  libelles: {
    toiture: '① CHAMP PV · 2 strings × 10 modules SPM043602402 · toiture 10,1 × 4,1 m (hors coffret)',
    recv: 'Rack batteries · 5 × Pylontech US2000C en parallèle → 48 V · 250 Ah (hors coffret)',
    rangees: [
      'Coffret DC · F5 Q5 PF5 (string 1) · F6 Q6 PF6 (string 2) · X1:11 terre · F4 Q4 (batteries)',
      'D1 E/S réseau · IMEON 9.12 · D2 sortie AC',
      'X1 · arrivée réseau · départ tableau Écobike',
    ],
  },
  schemaImage: {
    src: DOC('schema_corrige.jpg'),
    legende: 'Folio 01 · schéma d’alimentation des panneaux photovoltaïques de l’Écobike (dossier de l’installation)',
  },
  preparation: {
    documents: [
      { id: 'dtr2', titre: 'DTR 2 · synoptique', src: DOC('dtr2.jpg'), legende: 'DTR 2 : synoptique de l’installation — panneaux, onduleur hybride, batteries, réseau public, utilisation', enonce: true },
      { id: 'dtr1', titre: 'DTR 1 · toiture', src: DOC('toiture.jpg'), legende: 'DTR 1 : toiture du garage à vélos, 10,1 × 4,1 m', enonce: true },
      { id: 'dtr3', titre: 'DTR 3 · silicium', src: DOC('dtr3.jpg'), legende: 'DTR 3 : trois technologies de modules au silicium et leur puissance surfacique' },
      { id: 'dtr4', titre: 'DTR 4 · CALSOL', src: DOC('dtr4.jpg'), legende: 'DTR 4 : irradiation à Strasbourg, plan incliné à 30° orienté plein Sud (kWh/m²/j) — CALSOL' },
      {
        id: 'a16', titre: 'A.1.6 · bilan', legende: 'A.1.6 : bilan des consommations journalières de l’Écobike (13 VAE rechargés) — à compléter',
        tableau: {
          entetes: ['Appareils', 'P nominale', 'Nombre', 'P totale', 'Durée (h/j)', 'Énergie (Wh/j)'],
          lignes: [
            ['Éclairage', '11 W', '10', '110 W', '4', '?'],
            ['Portail coulissant', '370 W', '1', '370 W', '1', '370'],
            ['Onduleur (veille)', '1,5 W', '1', '1,5 W', '24', '36'],
            ['Kit vidéosurveillance', '50 W', '1', '50 W', '24', '?'],
            ['Caméras', '5 W', '4', '20 W', '24', '?'],
            ['Recharge VAE', '75 W', '13', '975 W', '8', '?'],
            ['Énergie totale consommée Ec', '', '', '', '', '? Wh/j'],
          ],
        },
      },
      { id: 'dtr27', titre: 'DTR 27 · modules', src: DOC('victron.jpg'), legende: 'DTR 27 : modules monocristallins Victron — SPM043602402 : 360 Wc, 24 V, VMPP 38,4 V, Voc 47,4 V, Isc 10,24 A, 1980 × 1002 × 40 mm (série 4b, remplace la 4a)' },
      { id: 'dtr28', titre: 'DTR 28 · IMEON', src: DOC('imeon.jpg'), legende: 'DTR 28 : IMEON 9.12 — 9 kW, 3/N/PE 230/400 V, 2 MPPT 280–700 V, 850 V max, 2 × 18 A, batterie 48 V (42–62 V), décharge 200 A. IMEON 3.6 : 230 V monophasé, 1 MPPT' },
      { id: 'dtr29', titre: 'DTR 29 · US2000C', src: DOC('pylontech.jpg'), legende: 'DTR 29 : Pylontech US2000C — 48 V, 50 Ah, 2 400 Wh, profondeur de décharge 95 %, RS485 / CAN, 16 modules au plus par groupe' },
      { id: 'folio', titre: 'Folio 01', src: DOC('schema_sujet.jpg'), legende: 'Folio 01 à compléter (A.3.4) : batteries → entrée batteries, strings 1 et 2 → entrées PV — + rouge, − noir, PE vert' },
      { id: 'dtr30', titre: 'Raccordement IMEON', src: DOC('dtr30.jpg'), legende: 'Schéma de raccordement constructeur : compteur, D1 (entrée réseau AC), D2 (sortie utilisation), fusibles et coupures des strings et de la batterie, barrette de terre' },
      { id: 'symb', titre: 'Symboles', src: DOC('symboles.jpg'), legende: 'Symboles du sujet : batterie, panneau photovoltaïque, PE' },
    ],
    intitules: {
      identification: {
        titre: '① Identifier · le synoptique (DTR 2)',
        consigne: 'Le synoptique du dossier est affiché à gauche. Pour chaque bloc, choisis la fonction qu’il assure (A.1.1).',
      },
      fonctions: {
        titre: '② Fonctionner · les quatre situations',
        consigne: 'L’onduleur hybride décide où va l’énergie. Relie chaque situation à la gestion attendue (A.1.2).',
      },
    },
    identification: [
      Q('id-pv', 'Panneaux', 'dtr2', 'Sur le synoptique, quelle est la fonction des panneaux photovoltaïques ?', [
        'Produire l’énergie électrique, en courant continu, à partir du rayonnement solaire',
        'Stocker l’énergie produite pendant la journée',
        'Convertir le courant continu en courant alternatif',
        'Protéger l’installation contre la foudre',
      ], 'Les modules transforment le rayonnement en énergie électrique continue. Ils ne stockent rien : la nuit, ils ne produisent plus.'),
      Q('id-ond', 'Onduleur hybride', 'dtr2', 'Quelle est la fonction de l’onduleur hybride ?', [
        'Gérer la charge et la décharge des batteries et convertir le continu en alternatif',
        'Produire l’énergie à partir du réseau public',
        'Stocker l’énergie du champ photovoltaïque',
        'Compter l’énergie injectée sur le réseau',
      ], 'Trois appareils dans un boîtier : régulateur MPPT, chargeur de batteries et onduleur. C’est lui qui décide si l’énergie est consommée, stockée ou prise au réseau.'),
      Q('id-bat', 'Batteries', 'dtr2', 'Quelle est la fonction des batteries ?', [
        'Stocker l’énergie produite et non consommée, pour la restituer plus tard',
        'Produire l’énergie la nuit',
        'Filtrer les harmoniques de l’onduleur',
        'Alimenter directement les vélos en 230 V',
      ], 'Elles stockent le surplus de la journée pour le soir ou une coupure du réseau. Parc 48 V, raccordé à l’entrée batteries de l’onduleur.'),
      Q('id-res', 'Réseau public', 'dtr2', 'Quel est le rôle du réseau public dans cette installation ?', [
        'Un secours en 3 × 400 V + N, quand le champ et les batteries ne suffisent pas',
        'La source principale : le PV n’est qu’un appoint',
        'Il reçoit toute la production, rachetée par le fournisseur',
        'Aucun : l’Écobike est un site isolé',
      ], 'Le cahier des charges le dit : sobriété énergétique, le réseau public n’est qu’une « alimentation de secours » par l’intermédiaire de l’onduleur.'),
      Q('id-util', 'Utilisation', 'dtr2', 'Que désigne « Utilisation » sur le synoptique ?', [
        'Le tableau électrique de l’Écobike : recharge des VAE, éclairage, portail, vidéosurveillance',
        'Le compteur du fournisseur d’énergie',
        'Le parc de batteries',
        'La boîte de jonction de la toiture',
      ], 'C’est la sortie AC de l’onduleur vers le tableau de l’Écobike : elle alimente aussi le portail et l’éclairage KNX des autres TP du chantier.'),
      Q('id-mppt', 'MPPT', 'dtr28', 'Que signifie MPPT, et à quoi sert cette fonction ?', [
        'Maximum Power Point Tracking : rechercher en temps réel le point de puissance maximale du champ',
        'Multi Phase Power Transfer : répartir la puissance sur les trois phases',
        'Maximum Protection Photovoltaic Terminal : protéger les entrées PV',
        'Minimum Power Point Test : tester la puissance minimale au démarrage',
      ], 'Le MPPT ajuste en permanence la tension du string pour tirer le maximum de puissance. L’IMEON 9.12 en a DEUX : un par string.'),
    ],
    fonctions: [
      Q('fo-nuit', 'Nuit', 'dtr2', 'La nuit, sans aucune production solaire, qui alimente l’Écobike ?', [
        'Le réseau public ; les batteries restent en réserve pour une coupure',
        'Le champ photovoltaïque, à puissance réduite',
        'Personne : l’Écobike est coupé jusqu’au matin',
        'Les batteries, puis le réseau les recharge en même temps',
      ], 'Pas de production : l’onduleur soutire au réseau. Les batteries sont gardées pour le cas où le réseau disparaît.'),
      Q('fo-ilot', 'Site isolé', 'dtr2', 'Le réseau public est défaillant (ou le site est isolé). Que fait l’onduleur ?', [
        'Les batteries alimentent l’Écobike, avec le champ s’il produit',
        'Il s’arrête : sans réseau, un onduleur ne fonctionne pas',
        'Il injecte la production sur le réseau pour le relancer',
        'Il ne garde que l’éclairage',
      ], 'C’est tout l’intérêt de l’onduleur HYBRIDE : il sait fonctionner en îlot, sur ses batteries.'),
      Q('fo-def', 'Déficit', 'dtr2', 'Moins de production que de consommation (journée nuageuse, recharges en cours) :', [
        'Le champ alimente une partie des besoins, les batteries fournissent le complément',
        'Le réseau fournit tout, le champ est déconnecté',
        'Les batteries se chargent sur le réseau',
        'L’onduleur délestera la recharge des VAE',
      ], 'L’énergie solaire est consommée en priorité ; le complément vient des batteries, puis du réseau seulement si elles ne suffisent pas.'),
      Q('fo-sur', 'Surplus', 'dtr2', 'Plus de production que de consommation (plein soleil, peu de recharges) :', [
        'Le champ alimente l’Écobike et charge les batteries avec le surplus',
        'Le surplus est injecté sur le réseau public',
        'Le champ est bridé pour ne produire que le nécessaire',
        'Les batteries alimentent l’Écobike pour se vider',
      ], 'En autoconsommation, le surplus va dans les batteries pour le soir. L’injection sur le réseau est désactivée à la mise en service.'),
    ],
    blocs: [
      {
        id: 'techno',
        titre: '③ Technologie et climat (DTR 3, DTR 4)',
        consigne: 'Le choix des modules dépend de leur technologie ; leur production, du lieu et de l’orientation. Lis les valeurs sur les documents.',
        questions: [
          Q('te-mono', 'DTR 3', 'dtr3', 'Parmi les trois technologies au silicium, laquelle est la plus performante ?', [
            'Le monocristallin : 130 à 190 W/m²',
            'Le polycristallin : 120 à 140 W/m²',
            'L’amorphe : 50 à 70 W/m²',
            'Elles se valent, seul le prix change',
          ], 'Le monocristallin produit le plus par m² : sur une toiture de 41,4 m², c’est la surface qui limite. Les modules Victron du DTR 27 sont monocristallins.'),
          Q('te-orient', 'Orientation', 'dtr4', 'Quelle orientation et quelle inclinaison retenir pour les modules ?', [
            'Plein Sud, inclinés à 30° environ',
            'Plein Est, pour produire dès le matin',
            'Plein Nord, pour éviter la surchauffe',
            'À plat, l’orientation ne compte pas',
          ], 'L’orientation plein Sud donne le meilleur rendement hiver comme été (DTR 6). Le tableau CALSOL est d’ailleurs calculé pour 30°, orientation 0° (Sud).'),
          Q('te-dcac', 'DC / AC', 'dtr2', 'Quel type de courant circule entre panneaux et onduleur, entre batteries et onduleur, puis entre onduleur et utilisation ?', [
            'Continu · continu · alternatif',
            'Alternatif · continu · alternatif',
            'Continu · alternatif · alternatif',
            'Continu · continu · continu',
          ], 'Modules et batteries sont des sources CONTINUES : c’est l’onduleur qui fabrique l’alternatif de l’utilisation et du réseau. D’où du matériel DC (sectionneurs, fusibles gPV) côté champ et batteries.'),
          Q('te-igp', 'IGP', 'dtr4', 'Quelle valeur d’irradiation globale IGP retiens-tu pour Strasbourg ?', [
            '3,22 kWh/m²/j', '1,58 kWh/m²/j', '5,42 kWh/m²/j', '2,23 kWh/m²/j',
          ], 'Ligne « Globale (IGP) », colonne « année » : 3,22. 1,58 est la composante DIRECTE seule — le dimensionnement se fait sur la globale. 5,42 est juillet : dimensionner sur le meilleur mois, c’est manquer d’énergie neuf mois sur douze. 2,23 est une valeur mensuelle (directe de mai, globale d’octobre) : prends la colonne « année ».'),
          Q('te-dec', 'Hiver', 'dtr4', 'En décembre, l’IGP tombe à 0,9. Qu’en conclure ?', [
            'La production d’hiver ne couvre pas le besoin : stockage et secours réseau sont indispensables',
            'Il faut tripler le nombre de modules',
            'Les modules ne produisent plus du tout en hiver',
            'Rien : on dimensionne sur la moyenne, donc tout est couvert',
          ], 'La moyenne annuelle dimensionne le champ ; l’hiver, la production est trois fois plus faible. C’est pourquoi l’installation garde batteries ET réseau en secours.'),
        ],
      },
      {
        id: 'besoins',
        titre: '④ Besoins · le bilan A.1.6',
        consigne: 'Complète le tableau affiché à gauche : énergie = puissance totale × durée d’utilisation journalière (13 VAE, soit 40 % des 32 places).',
        questions: [
          Q('be-ecl', 'Éclairage', 'a16', 'Éclairage : 10 luminaires de 11 W, 4 h par jour. Énergie consommée ?', [
            '440 Wh/j', '110 Wh/j', '44 Wh/j', '4 400 Wh/j',
          ], '10 × 11 W = 110 W, pendant 4 h : 440 Wh/j. 110 est une puissance, pas une énergie.'),
          Q('be-video', 'Vidéo', 'a16', 'Kit de vidéosurveillance : 50 W, 24 h sur 24. Énergie consommée ?', [
            '1 200 Wh/j', '50 Wh/j', '120 Wh/j', '2 400 Wh/j',
          ], '50 W × 24 h = 1 200 Wh/j : un petit appareil permanent pèse lourd dans le bilan.'),
          Q('be-cam', 'Caméras', 'a16', 'Quatre caméras de 5 W, 24 h sur 24. Énergie consommée ?', [
            '480 Wh/j', '120 Wh/j', '20 Wh/j', '240 Wh/j',
          ], '4 × 5 W = 20 W, pendant 24 h : 480 Wh/j.'),
          Q('be-vae', 'Recharge VAE', 'a16', 'Recharge de 13 VAE à 75 W, 8 h par jour. Énergie consommée ?', [
            '7 800 Wh/j', '975 Wh/j', '19 200 Wh/j', '9 750 Wh/j',
          ], '13 × 75 W = 975 W, pendant 8 h : 7 800 Wh/j — les trois quarts du besoin. 19 200 Wh correspondrait aux 32 places occupées.'),
          Q('be-ec', 'Ec', 'a16', 'Énergie totale consommée par jour, Ec ?', [
            '10 326 Wh/j', '10 290 Wh/j', '9 526 Wh/j', '12 960 Wh/j',
          ], '440 + 370 + 36 + 1 200 + 480 + 7 800 = 10 326 Wh/j. 10 290 oublie les 36 Wh de veille de l’onduleur : il consomme aussi.'),
        ],
      },
      {
        id: 'dimension',
        titre: '⑤ Dimensionner · le champ (DTR 5, DTR 4, DTR 27, DTR 1)',
        consigne: 'Ep = Ec / k (k = 0,65 avec batteries) · Pc = Ep / IGP · puis le calepinage sur la toiture.',
        questions: [
          Q('di-ep', 'Ep', 'dtr4', 'Énergie à produire : Ep = Ec / k, avec k = 0,65 ?', [
            '15 886 Wh', '6 712 Wh', '10 326 Wh', '1 589 Wh',
          ], '10 326 / 0,65 = 15 886 Wh. Le coefficient k (0,65 avec batteries) couvre la météo, l’usure, les rendements du stockage et de l’onduleur, les pertes en ligne : on produit plus qu’on ne consomme.'),
          Q('di-pc', 'Pc', 'dtr4', 'Puissance crête nécessaire : Pc = Ep / IGP ?', [
            '4 934 W', '51 153 W', '2 931 W', '10 054 W',
          ], '15 886 / 3,22 = 4 934 W. Avec 5,42 (juillet) on trouverait 2 931 W : un champ bien trop petit neuf mois sur douze.'),
          Q('di-surf', 'Toiture', 'dtr1', 'Surface de la toiture disponible (DTR 1) ?', [
            '41,4 m²', '28,4 m²', '14,2 m²', '4,1 m²',
          ], '10,1 × 4,1 = 41,4 m². 28,4 m est le périmètre, pas une surface.'),
          Q('di-module', 'Module', 'dtr27', 'Quel module retenir dans le DTR 27 (le plus puissant, aux nouvelles dimensions) ?', [
            'SPM043602402 · 360 Wc · 24 V · 1980 × 1002 mm · série 4b',
            'SPM043602400 · 360 Wc · 24 V · 1956 × 992 mm · série 4a',
            'SPM043052002 · 305 Wc · 20 V · série 4b',
            'SPM041751200 · 175 Wc · 12 V · série 4a',
          ], 'La série 4b remplace la 4a (« nouvelle dimension remplace le modèle 4a ») : on commande la 402. Même puissance, mais la 400 n’est plus au catalogue.'),
          Q('di-calep', 'Calepinage', 'dtr1', 'Quel calepinage retiens-tu, cohérent avec les deux strings de 10 du folio 01 ?', [
            '10 modules de 1,002 m le long des 10,1 m, sur 2 rangées de 1,98 m : 20 modules',
            '5 modules de 1,98 m le long des 10,1 m, sur 4 rangées de 1,002 m : 20 modules',
            '41,4 / 1,984 = 20,8, arrondi à 21 modules',
            '10 modules le long, sur 4 rangées : 40 modules',
          ], 'Méthode 2 du corrigé : 10 × 2 = 20 modules, et chaque rangée forme un string — câblage court, comme au folio 01. Le sens 5 × 4 donne aussi 20 modules (vérifie toujours les deux sens !) mais chaque string serait réparti sur deux rangées. On n’arrondit jamais au-dessus : 0,8 module ne tient pas sur le toit.'),
          Q('di-pci', 'Pc installée', 'dtr27', 'Puissance crête installée, et est-elle suffisante ?', [
            '20 × 360 = 7 200 Wc ≥ 4 934 W : suffisante',
            '7 200 Wc < 15 886 Wh : insuffisante',
            '20 × 38,4 = 768 W : insuffisante',
            '4 934 Wc exactement : juste suffisante',
          ], '7 200 Wc couvrent les 4 934 W nécessaires. On ne compare pas une puissance (Wc) à une énergie (Wh).'),
        ],
      },
      {
        id: 'stockage',
        titre: '⑥ Stocker et convertir (DTR 29, DTR 28)',
        consigne: 'C = Ec · N / (D · U) avec Ec = 10 500 Wh, N = 1 jour, D = 0,95, U = 48 V. Puis l’onduleur et l’association des modules.',
        questions: [
          Q('st-c', 'C', 'dtr29', 'Capacité nécessaire du parc : C = (10 500 × 1) / (0,95 × 48) ?', [
            '230 Ah', '219 Ah', '208 Ah', '11 053 Ah',
          ], '10 500 / (0,95 × 48) = 230 Ah. 219 Ah oublie la profondeur de décharge : on ne vide jamais une batterie à 100 %.'),
          Q('st-n', 'US2000C', 'dtr29', 'Combien de modules US2000C de 50 Ah ?', [
            '230 / 50 = 4,6 : 5 modules', '4 modules (arrondi au plus proche)', '16 modules, le maximum d’un groupe', '46 modules',
          ], 'On arrondit TOUJOURS à l’unité supérieure : 4 modules ne donneraient que 200 Ah < 230 Ah.'),
          Q('st-assoc', 'Montage', 'dtr29', 'Comment associer les 5 modules, et pourquoi ?', [
            'En parallèle : 48 V = tension de l’entrée batteries, et 5 × 50 = 250 Ah ≥ 230 Ah',
            'En série : 5 × 48 = 240 V, pour réduire le courant',
            'En série-parallèle : 2 séries de 2, plus un module seul',
            'Indifférent, l’onduleur s’adapte',
          ], 'L’entrée batteries de l’IMEON est en 48 V (plage 42 à 62 V) : chaque US2000C est déjà un 48 V. Le parallèle additionne les capacités, la série additionnerait les tensions — 240 V détruiraient l’entrée.'),
          Q('st-ond', 'IMEON', 'dtr28', 'Pourquoi l’IMEON 9.12 plutôt que l’IMEON 3.6 ?', [
            'Le réseau de l’Écobike est triphasé 3 × 400 V + N : l’IMEON 9.12 est 3/N/PE, le 3.6 monophasé',
            'L’IMEON 3.6 est trop cher',
            'L’IMEON 3.6 ne se raccorde pas aux batteries',
            'Aucune raison, les deux conviennent',
          ], 'Justification du corrigé (A.3.1) : tension AC 3 phases + N 230 / 400 V. Le 9.12 a aussi 2 MPPT pour les 2 strings, et 12 000 Wc d’entrée PV pour les 7 200 Wc du champ.'),
          Q('st-str', '2 × 10', 'dtr28', 'Deux strings de 10 modules en série : quelle tension MPP par string, et convient-elle ?', [
            '10 × 38,4 = 384 V : dans la plage MPPT 280 – 700 V',
            '10 × 47,4 = 474 V : c’est la tension à retenir pour le MPPT',
            '5 × 38,4 = 192 V : dans la plage',
            '20 × 38,4 = 768 V : dans la plage',
          ], 'Tableau A.3.2 : 2 × 10 → 384 V ✓ ; 4 × 5 → 192 V, trop bas (et 4 strings pour 2 entrées) ; 20 en série → 768 V, au-delà des 700 V du MPPT. La plage MPPT se compare à VMPP ; Voc (474 V) se compare aux 850 V maximum.'),
          Q('st-4x5', '4 × 5', 'dtr28', 'Pourquoi refuser 4 strings de 5 modules ?', [
            '192 V < 280 V : sous la plage MPPT, et 4 strings pour seulement 2 entrées',
            '192 V > 700 V : au-dessus de la plage',
            'Parce qu’il faut un nombre pair de modules par string',
            'Parce que le courant serait trop faible',
          ], '5 × 38,4 = 192 V : le MPPT ne démarre même pas (350 V de démarrage). Et l’IMEON n’a que deux entrées.'),
          Q('st-20', '20 série', 'dtr28', 'Et 20 modules en un seul string ?', [
            '768 V > 700 V : hors plage, et 948 V à vide > 850 V maximum — l’entrée serait détruite',
            'C’est la meilleure solution : moins de câbles',
            'Impossible car il n’y a pas assez de modules',
            'Acceptable si on utilise une seule entrée',
          ], '20 × 47,4 = 948 V à vide dépasse la tension d’entrée maximale de 850 V. Deux strings de 10 : 474 V à vide, large marge.'),
        ],
      },
    ],
  },
  postes: [
    {
      id: 'modules', name: 'Modules photovoltaïques (× 20)',
      need: 'Le plus puissant du DTR 27, aux nouvelles dimensions, pour 2 strings de 10 sur 10,1 × 4,1 m',
      options: [
        { key: 'pvmodule', img: DOC('victron.jpg'), ref: 'Victron SPM043602402', spec: '360 Wc · 24 V · VMPP 38,4 V · Voc 47,4 V · 1980 × 1002 mm · série 4b', ok: true, why: 'Le plus puissant du catalogue, aux nouvelles dimensions : 10 modules de 1,002 m tiennent dans les 10,1 m, 2 rangées de 1,98 m dans les 4,1 m.' },
        { key: 'pvmodule', ref: 'Victron SPM043602400', spec: '360 Wc · 24 V · 1956 × 992 mm · série 4a', half: true, why: 'Mêmes caractéristiques électriques, mais la série 4a est remplacée par la 4b (DTR 27) : on ne commande pas une référence arrêtée.' },
        { key: 'pvpanel', ref: 'Victron SPM041151200', spec: '115 Wc · 12 V · 1015 × 668 mm', why: 'Module 12 V de 115 Wc : il en faudrait plus de 40 pour les 4 934 W, qui ne tiennent pas sur la toiture, et 10 en série ne donneraient que 190 V, sous la plage MPPT.' },
      ],
    },
    {
      id: 'onduleur', name: 'Onduleur hybride',
      need: 'Réseau 3 × 400 V + N, 2 strings de 384 V, parc 48 V, 7 200 Wc',
      options: [
        { key: 'imeon912', img: DOC('imeon.jpg'), ref: 'IMEON 9.12', spec: '9 kW · 3/N/PE 230/400 V · 2 MPPT 280–700 V · batterie 48 V · 200 A', ok: true, why: 'Triphasé comme le réseau de l’Écobike, deux entrées MPPT pour les deux strings, 12 000 Wc admissibles, entrée batteries 48 V.' },
        { key: 'imeon912', ref: 'IMEON 3.6', spec: '3 kW · 230 V monophasé · 1 MPPT 120–480 V', why: 'Monophasé et un seul MPPT : il ne se raccorde pas au réseau triphasé, et 4 000 Wc maximum pour un champ de 7 200 Wc.' },
        { key: 'multiplus', ref: 'Victron MultiPlus 24/3000', spec: 'convertisseur / chargeur 24 V · 2 400 W · sans MPPT', why: 'Appareil d’installation autonome en 24 V : ni entrée PV, ni triphasé, ni 48 V. Il faudrait des régulateurs à part, et la puissance ne suit pas.' },
      ],
    },
    {
      id: 'batteries', name: 'Batteries de stockage',
      need: '48 V, au moins 230 Ah utiles, communication avec l’onduleur',
      options: [
        { key: 'us2000c', img: DOC('pylontech.jpg'), ref: '5 × Pylontech US2000C en parallèle', spec: '48 V · 5 × 50 Ah = 250 Ah · DoD 95 % · RS485 / CAN', ok: true, why: '250 Ah ≥ 230 Ah, 48 V comme l’entrée batteries, lithium compatible IMEON avec communication CAN.' },
        { key: 'battery', ref: 'Batteries plomb 12 V · 230 Ah', spec: '12 V · 230 Ah', why: 'Une batterie 12 V seule n’atteint pas les 42 V minimum de l’entrée : il en faudrait quatre en série par branche (schéma constructeur), et le plomb ne tolère pas 95 % de décharge.' },
        { key: 'us2000c', ref: '16 × Pylontech US2000C en parallèle', spec: '48 V · 800 Ah', half: true, why: 'Techniquement possible (16 modules au plus par groupe), mais trois fois le besoin : le calcul demande 5 modules, pas le maximum.' },
      ],
    },
    {
      id: 'strings', name: 'Protection des strings (F5 / Q5 / PF5 et F6 / Q6 / PF6)',
      need: 'Par string : 474 V à vide, Isc 10,24 A — protéger, sectionner, écrêter les surtensions',
      options: [
        { key: 'dcswitch', ref: 'Sectionneur DC 1000 V 2P 32 A + fusibles gPV 15 A + parafoudre DC type 2', spec: 'matériel continu · 1000 V', ok: true, why: 'Tension assignée 1000 V au-dessus des 474 V à vide (et du froid), fusibles gPV à 1,5 × Isc, parafoudre type 2 entre chaque polarité et la terre.' },
        { key: 'dcswitch', ref: 'Sectionneur DC 600 V 2P 32 A + fusibles gPV 15 A, sans parafoudre', spec: '600 V · pas de parafoudre', half: true, why: '600 V passe à 20 °C, mais à –10 °C la tension à vide monte au-delà de 540 V : marge trop juste. Et sans parafoudre, une surtension de foudre remonte jusqu’à l’onduleur.' },
        { key: 'dcswitch', ref: 'Interrupteur modulaire AC 230 V 2P 32 A', spec: 'matériel alternatif', why: 'Un appareil alternatif ne coupe pas un arc continu de 474 V : il se détruit à la première ouverture en charge.' },
      ],
    },
    {
      id: 'sectbat', name: 'Protection du parc (F4 / Q4)',
      need: 'Isoler et protéger la liaison parc ↔ entrée batteries : jusqu’à 200 A de décharge (IMEON 9.12)',
      options: [
        { key: 'dcswitchbat', ref: 'Sectionneur DC 2P 250 A cadenassable + fusibles NH00 250 A', spec: '250 A DC', ok: true, why: '250 A au-dessus des 200 A de décharge maximale de l’IMEON, et cadenassable : c’est l’organe de consignation de la source batteries.' },
        { key: 'dcswitchbat', ref: 'Sectionneur DC 2P 125 A + fusibles 125 A', spec: '125 A DC', half: true, why: '125 A suffisent au courant recommandé (5 × 25 A), mais pas aux 200 A que l’IMEON peut demander au parc : les fusibles fondraient en pointe.' },
        { key: 'dcswitch', ref: 'Sectionneur DC 2P 32 A + fusibles gPV 15 A', spec: 'matériel de string', why: 'Calibre de string : il ne tient pas le courant d’un parc batterie, qui se compte en centaines d’ampères.' },
      ],
    },
    {
      id: 'd1d2', name: 'D1 et D2 · protections alternatives',
      need: 'E/S réseau AC (D1) et SORTIE AC (D2) en 3 × 400 V + N : 13 A par phase, 17,5 A au maximum',
      options: [
        { key: 'mcb4p', ref: 'Disjoncteur tétrapolaire 4P C20 (× 2)', spec: '3 phases + neutre · 20 A', ok: true, why: 'Coupe les trois phases ET le neutre, calibre juste au-dessus des 17,5 A par phase : c’est ce que montre le schéma de raccordement constructeur.' },
        { key: 'mcb4p', ref: 'Interrupteur-sectionneur 4P 40 A (× 2)', spec: 'sans déclencheur', half: true, why: 'Il sépare bien les quatre conducteurs, mais ne protège pas contre les surintensités : il faut un disjoncteur.' },
        { key: 'mcb2p', ref: 'Disjoncteur 1P+N C20 (× 2)', spec: 'monophasé', why: 'Un seul pôle protégé : l’IMEON 9.12 est triphasé, deux phases resteraient sans protection ni coupure.' },
      ],
    },
    {
      id: 'bornier', name: 'X1 · bornier et terre',
      need: 'Arrivée et départ 3 × 400 V + N + PE, barrette de terre pour les masses du champ',
      options: [
        { key: 'termgrey', ref: 'Bornes UT 6 + UT 6-PE sur rail', spec: '6 mm² · PE vert-jaune sur le rail', ok: true, why: 'Bornes repérées sur rail, borne PE identifiée qui relie les masses du champ à la terre de l’arrivée.' },
        { key: 'termgrey', ref: 'Bornes UT 2,5 sur rail', spec: '2,5 mm²', half: true, why: 'Le bornier convient, mais pas la section : les conducteurs de 6 mm² n’y entrent pas.' },
        { key: 'termgrey', ref: 'Dominos à vis', spec: 'connecteurs volants', why: 'Interdits en coffret : bornes sur rail repérées obligatoires.' },
      ],
    },
  ],
  // Coffret sous la toiture : rail 0 = protections DC (strings et parc), rail 1 = D1 ·
  // IMEON (format book, décalé sous son rail) · D2, rail 2 = bornier X1.
  rails: [352, 560, 810],
  armoire: 900,
  gaines: [
    { id: 'g1', rep: 'G1', x: 70, diam: 32, nature: 'force', contenu: '5 conducteurs 6 mm² · L1 L2 L3 N PE', vers: 'pupitre d’alimentation de l’atelier (réseau public)', dessert: ['RES.'] },
    // Le champ descend de la toiture : ses deux gaines entrent par le DESSUS du coffret.
    { id: 'g2', rep: 'G2', x: 512, diam: 25, nature: 'force', cote: 'haut', contenu: '3 conducteurs 6 mm² · + rouge, − noir, PE des cadres', vers: 'boîte de jonction JB1 · string 1', dessert: ['JB1.'] },
    { id: 'g3', rep: 'G3', x: 446, diam: 25, nature: 'force', cote: 'haut', contenu: '3 conducteurs 6 mm² · + rouge, − noir, PE des cadres', vers: 'boîte de jonction JB2 · string 2', dessert: ['JB2.'] },
    { id: 'g4', rep: 'G4', x: 404, diam: 32, nature: 'force', contenu: '2 conducteurs 25 mm² · + rouge et − noir du parc', vers: 'rack batteries · 5 × US2000C', dessert: ['BAT'] },
  ],
  goulotteDePied: false,
  sectionneurs: ['q6', 'q4'],
  slots: [
    // ① coffret DC (rail 0) : string 1, string 2, puis le parc
    { id: 'fs1', label: 'F5 · Fusibles gPV 15 A · string 1', key: 'dcfuse', rail: 0, x: 40, rep: 'F5' },
    { id: 'f2', label: 'Q5 · Sectionneur DC string 1 (consignation champ)', key: 'dcswitch', rail: 0, x: 94, rep: 'Q5' },
    { id: 'pf1', label: 'PF5 · Parafoudre DC type 2 · string 1', key: 'dcspd', rail: 0, x: 148, rep: 'PF5' },
    { id: 'fs2', label: 'F6 · Fusibles gPV 15 A · string 2', key: 'dcfuse', rail: 0, x: 204, rep: 'F6' },
    { id: 'q6', label: 'Q6 · Sectionneur DC string 2 (consignation champ)', key: 'dcswitch', rail: 0, x: 258, rep: 'Q6' },
    { id: 'pf2', label: 'PF6 · Parafoudre DC type 2 · string 2', key: 'dcspd', rail: 0, x: 312, rep: 'PF6' },
    // Le parc, à l'aplomb de sa gaine : ses conducteurs descendent au rack à droite de D2.
    { id: 'fb', label: 'F4 · Fusibles batterie NH00 250 A', key: 'dcfusebat', rail: 0, x: 440, rep: 'F4' },
    { id: 'q4', label: 'Q4 · Sectionneur DC batteries 250 A (consignation parc)', key: 'dcswitchbat', rail: 0, x: 496, rep: 'Q4' },
    // ② rail 1 : D1 réseau · IMEON 9.12 · D2 sortie
    { id: 'q1', label: 'D1 · Disjoncteur 4P C20 · E/S réseau AC (consignation réseau)', key: 'mcb4p', rail: 1, x: 40, rep: 'D1' },
    { id: 'km1', label: 'IMEON 9.12 · onduleur hybride triphasé', key: 'imeon912', rail: 1, x: 152, dy: 22, rep: 'IMEON' },
    { id: 'f3', label: 'D2 · Disjoncteur 4P C20 · sortie AC vers le tableau Écobike', key: 'mcb4p', rail: 1, x: 342, rep: 'D2' },
    // ③ rail 2 : bornier X1
    ...X1_PV,
  ],
  annexItems: ROOF,
  recvItems: RACK,
  liaisons: LIAISONS,
  nets: netsEcobikePv(),
  imeonMiseEnService: {
    appareil: 'IMEON 9.12',
    priorites: ['PV › Stockage › Réseau', 'Réseau › PV › Stockage', 'PV › Réseau › Stockage', 'Stockage › PV › Réseau'],
    priorite: 'PV › Stockage › Réseau',
    injection: false,
    batteries: ['Lithium · Pylontech (CAN)', 'Plomb AGM', 'Plomb gel'],
    batterie: 'Lithium · Pylontech (CAN)',
    pourquoi: {
      priorite: 'autoconsommation : le solaire d’abord, puis le stockage, le réseau en dernier secours (priorités paramétrables, DTR 28).',
      injection: 'le cahier des charges est en autoconsommation, sans contrat de rachat : l’injection, « oui » par défaut, doit être désactivée.',
      batterie: 'des modules lithium US2000C, qui dialoguent avec l’onduleur par le bus CAN ; un profil plomb les chargerait avec la mauvaise courbe.',
    },
  },
  essaisPv: { pc: 7200, pMax: 3000, umpp: 384, ubat: U_PARC, decharge: 2000, charge: 2500 },
  tests: [
    TEST_VAT,
    {
      id: 'visu-pv',
      title: 'Contrôle visuel, couleurs et serrage',
      how: 'Vérifie les couleurs imposées (+ rouge, − noir, PE vert-jaune), le verrouillage de chaque connecteur MC4, le calibre des cartouches (gPV 15 A sur les strings, 250 A sur le parc), puis le serrage au tournevis dynamométrique.',
      expected: 'couleurs conformes, MC4 verrouillés, aucun conducteur mobile',
    },
    TEST_PE,
    TEST_ISO,
    {
      id: 'polarite-pv',
      title: 'Polarité des strings et du parc avant raccordement',
      how: 'Sectionneurs ouverts, multimètre en V⎓, pointe rouge sur le + : amont de Q5 et de Q6 (champ), puis amont de Q4 (parc).',
      expected: '+474 V environ sur chaque string, +48 à 53,5 V sur le parc, jamais une valeur négative',
    },
  ],
  mesures: [
    { id: 'rpeJb', title: 'Continuité PE des cadres du string 1 (JB1 → X1)', stage: 'horsTension', instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_11.a', b: 'JB1.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'rpeImeon', title: 'Continuité PE de l’IMEON (E/S réseau AC → X1)', stage: 'horsTension', instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'km1.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'riso1', title: 'Isolement du string 1 (+ / PE) sous 500 V', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'JB1.P', b: 'JB1.PE', min: 1, max: 9999, unit: 'MΩ' },
    { id: 'voc1', title: 'Tension à vide du string 1, Q5 ouvert, côté champ', stage: 'horsTension', instrument: 'mm', dial: 'V⎓', a: 'f2.1+', b: 'f2.3−', min: 460, max: 490, unit: 'V' },
    { id: 'uparc', title: 'Tension du parc en amont de Q4', stage: 'horsTension', instrument: 'mm', dial: 'V⎓', a: 'q4.1+', b: 'q4.3−', min: 46, max: 54, unit: 'V' },
    { id: 'upolbat', title: 'Polarité et tension à l’entrée batteries de l’IMEON', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'km1.BAT+', b: 'km1.BAT−', min: 46, max: 54, unit: 'V', when: 'run' },
    { id: 'ureseauLL', title: 'Tension composée sur l’E/S réseau AC (L1 – L2)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'km1.L1', b: 'km1.L2', min: 380, max: 420, unit: 'V', when: 'run' },
    { id: 'ureseauLN', title: 'Tension simple sur l’E/S réseau AC (L1 – N)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'km1.L1', b: 'km1.N', min: 220, max: 240, unit: 'V', when: 'run' },
    { id: 'usortieLN', title: 'Sortie AC vers le tableau, IMEON en service (X1 : L1 – N)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'x1_6.a', b: 'x1_9.a', min: 220, max: 240, unit: 'V', when: 'run' },
    { id: 'usortieLL', title: 'Sortie AC vers le tableau (X1 : L1 – L2)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'x1_6.a', b: 'x1_7.a', min: 380, max: 420, unit: 'V', when: 'run' },
  ],
  faults: FAULTS,
  quiz: [
    { q: 'Quelle tension continue mesure-t-on sur l’entrée batteries de l’IMEON ?', options: ['24 V', '48 V environ (42 à 62 V)', '230 V', '384 V'], answer: 1 },
    { q: 'Quelle est la plage de tension MPPT de l’IMEON 9.12 ?', options: ['120 à 480 V', '280 à 700 V', '42 à 62 V', '350 à 850 V'], answer: 1 },
    { q: 'Pourquoi deux strings de 10 modules en série ?', options: ['Pour avoir un nombre pair', '384 V par string : dans la plage MPPT, un string par entrée MPPT', 'Pour dépasser 700 V', 'Parce que la toiture fait 10 m'], answer: 1 },
    { q: 'Pourquoi les cinq US2000C sont-ils en parallèle ?', options: ['Pour obtenir 240 V', 'Chacun fait déjà 48 V : le parallèle additionne les capacités (250 Ah)', 'Pour réduire la capacité', 'Parce que la série est interdite en lithium'], answer: 1 },
    { q: 'Quel est le rôle de l’onduleur hybride ?', options: ['Seulement convertir le continu en alternatif', 'Gérer la charge / décharge des batteries et convertir le continu en alternatif, avec le réseau en secours', 'Compter l’énergie injectée', 'Protéger contre la foudre'], answer: 1 },
    { q: 'Quelle irradiation IGP retient-on pour Strasbourg (30°, Sud) ?', options: ['1,58 : la directe', '3,22 : la globale annuelle', '5,42 : juillet', '0,9 : décembre'], answer: 1 },
    { q: 'À quoi sert le coefficient k = 0,65 dans Ep = Ec / k ?', options: ['À convertir des Wh en Wc', 'À tenir compte de la météo, de l’usure, des rendements et des pertes : on produit plus que le besoin', 'À réduire le nombre de modules', 'À calculer la capacité des batteries'], answer: 1 },
    { q: 'Combien de sources faut-il consigner avant d’intervenir dans le coffret ?', options: ['Une : le réseau', 'Deux : le réseau et les batteries', 'Trois : le réseau, le champ PV (qui reste sous tension au soleil) et le parc batterie', 'Aucune : l’onduleur s’arrête seul'], answer: 2 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  // Consignation à TROIS sources : réseau (D1 = `q1`), champ (Q5 = `f2`, et Q6), parc (Q4).
  // Source CONNUE pour prouver le VAT : l'amont de Q5, côté champ — toujours sous tension le
  // jour, et c'est justement la leçon. Absence contrôlée sur les TROIS entrées de l'IMEON
  // (E/S réseau AC, entrées PV 1 et 2, entrée batteries) : l'élève doit avoir tout ouvert.
  consignationVat: {
    sourceConnue: ['f2.1+', 'f2.3−'],
    avalPairs: [['km1.L1', 'km1.N'], ['km1.PV1+', 'km1.PV1−'], ['km1.PV2+', 'km1.PV2−'], ['km1.BAT+', 'km1.BAT−']],
    champ: 'f2',
    sources: ['q6', 'q4'],
    explication:
      'Le réseau public (séparé par D1), le champ photovoltaïque (Q5 pour le string 1, Q6 pour le string 2) et le '
      + 'parc batterie (Q4) sont trois sources indépendantes. Ouvrir D1 ne coupe ni le champ ni le parc : tant qu’il '
      + 'fait jour, les strings restent sous tension côté toiture, jusqu’à l’amont de Q5 et Q6. On ouvre, on '
      + 'cadenasse et on vérifie l’absence de tension sur CHAQUE entrée de l’IMEON.',
  },
};
