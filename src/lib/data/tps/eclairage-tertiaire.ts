/**
 * TP · Éclairage d'un plateau de bureaux (scène tertiaire, 230 V mono).
 *
 * Un tableau divisionnaire d'étage alimente trois zones d'éclairage (open space,
 * salle de réunion, circulation) commandées par un contacteur KM1 :
 *  - commande centralisée par boutons marche / arrêt du coffret de porte, avec auto-maintien ;
 *  - autorisation horaire par l'horloge programmable KA1, en série avec la commande ;
 *  - détecteur de présence B1 et interrupteur de dérogation SD, en parallèle du bouton marche.
 *
 * Correspondances imposées par le moteur de simulation (identifiants `q1`, `f2`, `f3`, `f1`, `km1`) :
 *  q1 = Q0 disjoncteur général du tableau divisionnaire (organe de séparation et de condamnation) ·
 *  f2 = ID1 interrupteur différentiel 30 mA · f1 = Q1 départ éclairage 16 A ·
 *  f3 = Q2 circuit de commande 2 A · km1 = KM1 contacteur d'éclairage.
 *  Les boutons du coffret de porte représentent la commande centralisée de l'étage
 *  (S2 vert = marche générale, S1 rouge = arrêt général, H1 = éclairage en service).
 */
import type { AnnexItem, Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Bornier X1 du tableau divisionnaire : bornes étroites au pas de 18 px sur le dernier rail. */
function bornier(x0: number, rows: [string, string, string][], rail = 2): Slot[] {
  return rows.map(([key, mark, sub], i) => ({
    id: `x1_${i + 1}`,
    label: `X1:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18,
    mark,
    sub,
    group: 'X1',
    ...(i === 0 ? { groupLabel: 'X1 · bornier de départ (chemin de câbles)' } : {}),
  }));
}

/** Local tertiaire : organes de commande locaux, sous le coffret de porte. */
const LOCAL: AnnexItem[] = [
  { key: 'l_commande_detecteur', rep: 'B1', name: 'détecteur de présence 360° (contact NO)', x: 448, y: 320, w: 40, h: 48 },
  { key: 'l_commande_interrupteur', rep: 'SD', name: 'interrupteur de dérogation (forçage local)', x: 448, y: 410, w: 40, h: 40 },
];

/** Récepteurs : les trois zones d'éclairage du plateau. */
const RECV: AnnexItem[] = [
  { key: 'l_architec_tube_fluorescent_x2', rep: 'E1', name: 'zone 1 · open space, 12 réglettes LED 2 × 28 W', x: 30, y: 30, w: 150, h: 38, recv: true },
  { key: 'l_architec_tube_fluorescent_x2', rep: 'E2', name: 'zone 2 · salle de réunion, 12 réglettes LED 2 × 28 W', x: 210, y: 30, w: 150, h: 38, recv: true },
  { key: 'l_ampoule_plexo_hublot', rep: 'E3', name: 'zone 3 · circulation, hublots LED', x: 400, y: 24, w: 60, h: 60, recv: true },
];

export const TP_ECLAIRAGE_TERTIAIRE: TpDefinition = {
  id: 'eclairage-tertiaire',
  title: 'Éclairage tertiaire · horloge et détecteur',
  level: '1re Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Tableau divisionnaire d\'un plateau de bureaux : trois zones d\'éclairage LED commandées par le contacteur KM1, autorisation horaire KA1, détecteur de présence et dérogation locale, commande centralisée marche / arrêt avec auto-maintien, bornier X1 de départ.',
  situation:
    'Le plateau de bureaux du deuxième étage est découpé en trois zones : l\'open space, la salle de réunion et la circulation. Le maître d\'ouvrage veut un éclairage qui ne reste jamais allumé la nuit : l\'horloge KA1 n\'autorise la commande que pendant les heures d\'ouverture, le détecteur de présence B1 rallume la zone en cas de présence et un interrupteur de dérogation SD permet un forçage local. La marche et l\'arrêt généraux se font depuis le coffret de commande centralisée du palier. Tu câbles le tableau divisionnaire, tu réalises les tests, la consignation, les mesures, puis la mise en service.',
  plaque: {
    Alimentation: '230 V ~ 50 Hz mono, depuis le TGBT',
    Zones: '3 zones · 12 réglettes LED 2 × 28 W par zone',
    'Puissance installée': '3 × 672 W ≈ 2,0 kW',
    'Courant par zone': '≈ 2,9 A',
    Protection: 'Q1 16 A courbe C · ID1 40 A 30 mA type A',
    Commande: 'KM1 25 A AC-7a bobine 230 V · KA1 horloge hebdomadaire',
    Section: '3G2,5 mm² départs · 1,5 mm² commande',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE du TGBT sur X1:1 · X1:2 · X1:3 (câblage installateur)' },
    { k: 'Rail 1', v: 'Q0 général 32 A · ID1 différentiel 40 A 30 mA type A · Q1 éclairage 16 A · Q2 commande 2 A · H3 présence tension' },
    { k: 'Rail 2', v: 'KM1 contacteur 25 A AC-7a bobine 230 V · KA1 horloge programmable hebdomadaire' },
    { k: 'Rail 3', v: 'X1 · bornier de départ, 14 bornes étroites repérées' },
    { k: 'Zones', v: 'zone 1 sur KM1 1-2, zone 2 sur KM1 3-4, zone 3 sur KM1 5-6, neutre commun X1:7' },
    { k: 'Autorisation horaire', v: 'contact 2-4 de KA1 EN SÉRIE avec la commande : hors plage, aucune commande n\'agit' },
    { k: 'Commande centralisée', v: 'S1 arrêt NC puis S2 marche NO, auto-maintien par le contact KM1 13-14' },
    { k: 'Dérogation', v: 'détecteur B1 et interrupteur SD EN PARALLÈLE du bouton marche, sur X1:10 / X1:11' },
    { k: 'Choix des LED', v: 'contacteur de catégorie AC-7a : le courant d\'appel des drivers atteint plusieurs dizaines d\'ampères pendant quelques millisecondes' },
    { k: 'Signalisation', v: 'H1 en porte indique l\'éclairage en service, H3 la présence de tension au tableau' },
    { k: 'Avant mise en service', v: 'contrôle visuel · consignation · VAT · continuité PE · isolement 500 V' },
  ],
  postes: [
    {
      id: 'q1',
      name: 'Q1 · Protection du départ éclairage',
      need: 'Protéger 2,0 kW d\'éclairage LED câblé en 2,5 mm², fort courant d\'appel',
      options: [
        { key: 'mcb2p', ref: 'iC60N 1P+N C16', spec: '16 A · courbe C · 2,5 mm²', ok: true, why: '8,7 A absorbés : 16 A protège le 2,5 mm² et la courbe C encaisse l\'appel des drivers LED.' },
        { key: 'mcb2p', ref: 'iC60N 1P+N C32', spec: '32 A · courbe C', why: 'Le 2,5 mm² (21 A admissibles) n\'est plus protégé : 20 A est le calibre maximal pour cette section.' },
        { key: 'mcb1p', ref: 'iC60N 1P B10', spec: '10 A · courbe B', half: true, why: 'Section protégée, mais 8,7 A sous 10 A ne laisse aucune marge et la courbe B déclenche à l\'appel des drivers.' },
      ],
    },
    {
      id: 'id',
      name: 'ID1 · Interrupteur différentiel',
      need: 'Protection des personnes en tête de tableau divisionnaire, charges à découpage',
      options: [
        { key: 'rcd2p', ref: 'iID 2P 40 A 30 mA type A', spec: '40 A · 30 mA · type A', ok: true, why: '30 mA pour les circuits terminaux, et le type A détecte les composantes continues des alimentations LED à découpage.' },
        { key: 'rcd2eaton', ref: 'HNC-25/2/003 type AC', spec: '25 A · 30 mA · type AC', half: true, why: 'Bonne sensibilité, mais le type AC est aveugle aux composantes continues et 25 A est juste pour l\'ensemble du tableau.' },
        { key: 'rcd2p', ref: 'iID 2P 40 A 300 mA', spec: '40 A · 300 mA', why: '300 mA protège contre l\'incendie, pas les personnes : interdit en tête de circuits terminaux.' },
      ],
    },
    {
      id: 'km',
      name: 'KM1 · Contacteur d\'éclairage',
      need: 'Commander trois zones de luminaires LED depuis une commande 230 V',
      options: [
        { key: 'kontakt', ref: 'Contacteur 25 A AC-7a · bobine 230 V', spec: '3 pôles · 25 A AC-7a', ok: true, why: 'La catégorie AC-7a est prévue pour les charges d\'éclairage : les contacts tiennent la pointe d\'appel des drivers.' },
        { key: 'kontakt', ref: 'Contacteur 16 A AC-1 · bobine 230 V', spec: '16 A · usage résistif', why: 'AC-1 vise les charges résistives : sur des drivers LED, les contacts se soudent au bout de quelques manœuvres.' },
        { key: 'kontakt', ref: 'LC1D09B7 · bobine 24 V', spec: '9 A AC-3 · bobine 24 V', why: 'Bobine 24 V alors que la commande est en 230 V : le contacteur ne collera jamais.' },
      ],
    },
    {
      id: 'ih',
      name: 'KA1 · Horloge programmable',
      need: 'Autoriser l\'éclairage sur des plages horaires hebdomadaires',
      options: [
        { key: 'timer', ref: 'IH hebdomadaire · réserve 100 h', spec: 'programme 7 jours · 1 contact', ok: true, why: 'Programmation distincte semaine / week-end et réserve de marche : l\'heure survit à une coupure.' },
        { key: 'timer', ref: 'IH journalière sans réserve', spec: 'programme 24 h', half: true, why: 'Ne distingue pas le week-end et perd l\'heure à chaque coupure du tableau.' },
        { key: 'timer', ref: 'Minuterie d\'escalier 6 min', spec: 'temporisation d\'extinction', why: 'Une minuterie temporise une extinction : ce n\'est pas une autorisation horaire.' },
      ],
    },
    {
      id: 'sect',
      name: 'Conducteurs des départs et de la commande',
      need: 'Trois départs de 2,9 A et une boucle de commande de quelques dizaines de milliampères',
      options: [
        { key: 'termred', ref: 'H07V-U 2,5 mm² départs · 1,5 mm² commande', spec: 'phase brun · neutre bleu · PE vert-jaune', ok: true, why: 'Section des départs cohérente avec le 16 A, commande en 1,5 mm², vert-jaune strictement réservé au PE.' },
        { key: 'termred', ref: 'H07V-U 1,5 mm² partout', spec: 'tout en 1,5 mm²', why: 'Le 1,5 mm² (15,5 A admissibles) n\'est pas protégé par un disjoncteur 16 A sur un départ chargé à 8,7 A en permanence.' },
        { key: 'termred', ref: 'H07V-U 4 mm² partout', spec: 'tout en 4 mm²', half: true, why: 'Fonctionne, mais le 4 mm² ne se serre pas correctement dans les bornes de commande et coûte inutilement cher.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q0 · Disjoncteur général 32 A', key: 'mcb2p', rail: 0, x: 52, rep: 'Q0' },
    { id: 'f2', label: 'ID1 · Différentiel 40 A 30 mA type A', key: 'rcd2p', rail: 0, x: 110, rep: 'ID1' },
    { id: 'f1', label: 'Q1 · Départ éclairage 16 A', key: 'mcb2p', rail: 0, x: 168, rep: 'Q1' },
    { id: 'f3', label: 'Q2 · Circuit de commande 2 A', key: 'mcb1p', rail: 0, x: 226, rep: 'Q2' },
    { id: 'h3', label: 'H3 · Voyant présence tension', key: 'lampY', rail: 0, x: 258, rep: 'H3' },
    { id: 'km1', label: 'KM1 · Contacteur 25 A AC-7a', key: 'kontakt', rail: 1, x: 52, rep: 'KM1' },
    { id: 'ih', label: 'KA1 · Horloge programmable', key: 'timer', rail: 1, x: 120, rep: 'KA1' },
    ...bornier(52, [
      ['termred', '1', 'L'], ['termblue', '2', 'N'], ['earth', '3', 'PE'],
      ['termred', '4', 'Z1'], ['termred', '5', 'Z2'], ['termred', '6', 'Z3'],
      ['termblue', '7', 'N-ECL'], ['termred', '8', 'CMD'], ['termred', '9', 'A1'],
      ['termred', '10', 'DER'], ['termred', '11', 'RET'], ['termred', '12', 'H1'],
      ['termblue', '13', 'N-C'], ['earth', '14', 'PE'],
    ]),
  ],
  annexItems: LOCAL,
  recvItems: RECV,
  liaisons: [
    // ---- arrivée du TGBT (câblage installateur)
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.N', 'x1_2.b', 'N', 'pre'), L('RES.PE', 'x1_3.b', 'PE', 'pre'),
    // ---- tête du tableau divisionnaire
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.N', 'N'),
    L('q1.2', 'f2.1', 'L1'), L('q1.N2', 'f2.N', 'N'),
    L('f2.2', 'f1.1', 'L1'), L('f2.N2', 'f1.N', 'N'),
    L('f2.2', 'f3.1', 'L1'),
    L('f2.2', 'h3.X1', 'L1'), L('h3.X2', 'f2.N2', 'N'),
    L('x1_3.a', 'x1_14.a', 'PE'),
    // ---- puissance : les trois zones sur les trois pôles de KM1
    L('f1.2', 'km1.1', 'L1'), L('f1.2', 'km1.3', 'L1'), L('f1.2', 'km1.5', 'L1'),
    L('km1.2', 'x1_4.a', 'L1'), L('km1.4', 'x1_5.a', 'L1'), L('km1.6', 'x1_6.a', 'L1'),
    L('f1.N2', 'x1_7.a', 'N'),
    L('x1_4.b', 'E1.X1', 'L1'), L('x1_5.b', 'E2.X1', 'L1'), L('x1_6.b', 'E3.X1', 'L1'),
    L('x1_7.b', 'E1.X2', 'N'), L('x1_7.b', 'E2.X2', 'N'), L('x1_7.b', 'E3.X2', 'N'),
    // ---- horloge : alimentation et contact d'autorisation horaire, en série avec la commande
    L('f3.2', 'ih.1', 'L1'), L('ih.3', 'f2.N2', 'N'),
    L('f3.2', 'ih.2', 'L1'), L('ih.4', 'x1_8.a', 'L1'),
    // ---- commande centralisée : arrêt NC, marche NO, auto-maintien
    L('x1_8.b', 'S1.21', 'L1', 'door'), L('S1.22', 'S2.13', 'L1', 'door'),
    L('S1.22', 'x1_10.b', 'L1', 'door'), L('S2.14', 'x1_9.b', 'L1', 'door'),
    L('x1_10.a', 'km1.13', 'L1'), L('km1.14', 'km1.A1', 'L1'),
    L('x1_9.a', 'km1.A1', 'L1'), L('km1.A2', 'x1_13.a', 'N'), L('f2.N2', 'x1_13.a', 'N'),
    // ---- détecteur de présence et dérogation, en parallèle du bouton marche
    L('x1_10.a', 'B1.X1', 'L1'), L('B1.X2', 'x1_11.b', 'L1'),
    L('x1_10.a', 'SD.X1', 'L1'), L('SD.X2', 'x1_11.b', 'L1'),
    L('x1_11.a', 'x1_9.a', 'L1'),
    // ---- signalisation de l'éclairage en service
    L('x1_9.a', 'x1_12.a', 'L1'), L('x1_12.b', 'H1.X1', 'L1', 'door'), L('x1_13.b', 'H1.X2', 'N', 'door'),
  ],
  nets: {
    // arrivée, amont du disjoncteur général
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'N', live: 'always' }, 'x1_2.b': { net: 'N', live: 'always' },
    'x1_3.a': { net: 'PE', live: 'always' }, 'x1_3.b': { net: 'PE', live: 'always' },
    'q1.1': { net: 'L1', live: 'always' }, 'q1.N': { net: 'N', live: 'always' },
    // aval du disjoncteur général
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.N2': { net: 'N', live: 'q1' },
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'N', live: 'q1' },
    // aval du différentiel
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'N', live: 'f2' },
    'f1.1': { net: 'L1', live: 'f2' }, 'f1.N': { net: 'N', live: 'f2' },
    'f1.2': { net: 'L1', live: 'f2' }, 'f1.N2': { net: 'N', live: 'f2' },
    'f3.1': { net: 'L1', live: 'f2' }, 'f3.2': { net: 'L1', live: 'ctl' },
    'h3.X1': { net: 'L1', live: 'f2' }, 'h3.X2': { net: 'N', live: 'f2' },
    // contacteur d'éclairage
    'km1.1': { net: 'L1', live: 'f2' }, 'km1.3': { net: 'L1', live: 'f2' }, 'km1.5': { net: 'L1', live: 'f2' },
    'km1.2': { net: 'L1', live: 'run' }, 'km1.4': { net: 'L1', live: 'run' }, 'km1.6': { net: 'L1', live: 'run' },
    'km1.13': { net: 'L1', live: 'ctl' }, 'km1.14': { net: 'L1', live: 'km1' },
    'km1.A1': { net: 'L1', live: 'km1' }, 'km1.A2': { net: 'N', live: 'f2' },
    // horloge programmable
    'ih.1': { net: 'L1', live: 'ctl' }, 'ih.3': { net: 'N', live: 'f2' },
    'ih.2': { net: 'L1', live: 'ctl' }, 'ih.4': { net: 'L1', live: 'ctl' },
    // départs des trois zones
    'x1_4.a': { net: 'L1', live: 'run' }, 'x1_4.b': { net: 'L1', live: 'run' },
    'x1_5.a': { net: 'L1', live: 'run' }, 'x1_5.b': { net: 'L1', live: 'run' },
    'x1_6.a': { net: 'L1', live: 'run' }, 'x1_6.b': { net: 'L1', live: 'run' },
    'x1_7.a': { net: 'N', live: 'f2' }, 'x1_7.b': { net: 'N', live: 'f2' },
    'E1.X1': { net: 'L1', live: 'run' }, 'E1.X2': { net: 'N', live: 'f2' },
    'E2.X1': { net: 'L1', live: 'run' }, 'E2.X2': { net: 'N', live: 'f2' },
    'E3.X1': { net: 'L1', live: 'run' }, 'E3.X2': { net: 'N', live: 'f2' },
    // boucle de commande
    'x1_8.a': { net: 'L1', live: 'ctl' }, 'x1_8.b': { net: 'L1', live: 'ctl' },
    'S1.21': { net: 'L1', live: 'ctl' }, 'S1.22': { net: 'L1', live: 'ctl' },
    'S2.13': { net: 'L1', live: 'ctl' }, 'S2.14': { net: 'L1', live: 'km1' },
    'x1_10.a': { net: 'L1', live: 'ctl' }, 'x1_10.b': { net: 'L1', live: 'ctl' },
    'B1.X1': { net: 'L1', live: 'ctl' }, 'SD.X1': { net: 'L1', live: 'ctl' },
    'B1.X2': { net: 'L1', live: 'km1' }, 'SD.X2': { net: 'L1', live: 'km1' },
    'x1_11.a': { net: 'L1', live: 'km1' }, 'x1_11.b': { net: 'L1', live: 'km1' },
    'x1_9.a': { net: 'L1', live: 'km1' }, 'x1_9.b': { net: 'L1', live: 'km1' },
    // signalisation et neutre de commande
    'x1_12.a': { net: 'L1', live: 'km1' }, 'x1_12.b': { net: 'L1', live: 'km1' },
    'H1.X1': { net: 'L1', live: 'km1' }, 'H1.X2': { net: 'N', live: 'f2' },
    'x1_13.a': { net: 'N', live: 'f2' }, 'x1_13.b': { net: 'N', live: 'f2' },
    // conducteur de protection
    'x1_14.a': { net: 'PE', live: 'always' }, 'x1_14.b': { net: 'PE', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'zones',
      title: 'Repérage des trois zones',
      how: 'Multimètre en Ω, KM1 manœuvré à la main : vérifie que X1:4 sort bien du pôle 1-2, X1:5 du pôle 3-4 et X1:6 du pôle 5-6, et que chaque borne porte l\'étiquette de sa zone.',
      expected: 'un départ par pôle, repérage conforme au schéma',
    },
    {
      id: 'horl',
      title: 'Contrôle de l\'autorisation horaire',
      how: 'Multimètre en Ω entre KA1:2 et KA1:4 : le contact doit être fermé pendant la plage programmée et ouvert en dehors ; vérifie que ce contact est bien EN SÉRIE avec la commande et non en parallèle.',
      expected: 'continuité en plage horaire, circuit ouvert hors plage',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du conducteur de protection', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'x1_14.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement du départ zone 1 sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_4.a', b: 'x1_3.a', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'cont', title: 'Continuité de la commande, de Q2 au bornier (via KA1)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'f3.2', b: 'x1_8.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'u230', title: 'Tension d\'arrivée au bornier X1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_1.a', b: 'x1_2.a', min: 225, max: 240, unit: 'V',
    },
    {
      id: 'uid', title: 'Tension en aval du différentiel ID1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'f2.2', b: 'f2.N2', min: 225, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'uz1', title: 'Tension aux réglettes de la zone 1, KM1 enclenché', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'E1.X1', b: 'E1.X2', min: 225, max: 240, unit: 'V', when: 'run',
    },
    {
      id: 'iz1', title: 'Courant du départ zone 1 à la pince (KM1:2 → X1:4)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>x1_4.a', min: 2.4, max: 3.6, unit: 'A', when: 'run',
    },
  ],
  faults: [
    { id: 'x2', title: 'Fil X1:9 → KM1 A1 débranché', symptom: 'L\'appui sur le bouton marche reste sans effet, alors que 230 V sont bien présents sur X1:9.', fix: 'Reconnecter le retour de commande sur la borne A1 de la bobine de KM1.' },
    { id: 'a2', title: 'Neutre de la bobine (KM1 A2) mal serré', symptom: 'KM1 claque sans rester collé, l\'éclairage clignote à chaque appui.', fix: 'Resserrer A2 sur X1:13 et refaire la continuité A2 – neutre du différentiel.' },
    { id: 's1', title: 'Contact NC du bouton d\'arrêt général S1 (21-22) resté ouvert', symptom: 'Aucune commande n\'agit — ni le bouton marche, ni le détecteur, ni la dérogation — mais 230 V sont présents sur X1:8.', fix: 'Remplacer le bloc de contact NC de S1 : la boucle de commande est coupée en amont de tous les organes.' },
  ],
  quiz: [
    { q: 'Pourquoi choisir un contacteur de catégorie AC-7a pour des luminaires LED ?', options: ['Pour supporter le courant d\'appel des drivers', 'Pour réduire la consommation', 'Pour éviter le bruit de la bobine'], answer: 0 },
    { q: 'Où se place le contact d\'autorisation horaire de KA1 ?', options: ['En parallèle du détecteur, pour forcer la marche', 'En série avec la boucle de commande, pour interdire tout allumage hors plage', 'Sur le circuit de puissance, entre KM1 et les réglettes'], answer: 1 },
    { q: 'Quel type de différentiel exige un éclairage LED à alimentations à découpage ?', options: ['Type AC', 'Type A', 'Type B obligatoire'], answer: 1 },
  ],
  motor: null,
  station: true,
  hasMotor: false,
};
