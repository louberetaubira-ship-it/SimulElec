/**
 * TP · Perceuse radiale — démarrage direct un sens de marche, commande 24 V.
 *
 * Porté du « Chantier 1 : Perceuse radiale » de l'établissement : voir le dossier technique
 * relevé page par page dans `docs/reference/chantier1-perceuse-radiale.md` (présentation p. 9,
 * schéma électrique p. 10, implantation du coffret p. 11, préparation p. 20-26).
 *
 * Ce qui distingue ce TP du démarrage direct de référence, et qui fait tout son intérêt :
 * - le sectionnement est assuré par un SECTIONNEUR PORTE-FUSIBLES, organe de consignation,
 *   et non par un disjoncteur moteur ;
 * - la chaîne d'arrêt comporte DEUX contacts NC en série — un coup de poing à verrouillage et
 *   un bouton d'arrêt — plus un INTERRUPTEUR DE POSITION qui interdit la rotation tant que
 *   l'écran de protection n'est pas en place ;
 * - le voyant H1 est INCOLORE et signale la mise sous tension, pas la marche : il s'allume dès
 *   que le sectionneur est fermé, avant même toute commande.
 *
 * Repérage des bornes de commande : les identifiants internes `x2_n` ne suivent pas la
 * numérotation XC du livre. Ils sont choisis pour coller à la topologie que reconnaît le moteur
 * de simulation (`x2_1` amont de la chaîne d'arrêt, `x2_2` aval, `x2_3` aval du bouton de
 * marche, `x2_4` conducteur de retour). Le repère lu par l'élève sur la platine reste bien
 * « XC:1 » à « XC:7 », conforme au schéma.
 */
import type { TpDefinition, Slot } from '@/lib/types';
import { BASE_TESTS, L, X1 } from './common';

/** Bornier de commande XC : 7 bornes au pas de 18 px, repérées comme au folio 1/1. */
const XC: Slot[] = ([
  ['x2_1', '1', 'H1'],
  ['x2_5', '2', 'S1'],
  ['x2_6', '3', 'S1'],
  ['x2_7', '4', 'S2'],
  ['x2_2', '5', 'S4'],
  ['x2_3', '6', 'KM1'],
  ['x2_4', '7', 'com'],
] as const).map(([id, mark, sub], i) => ({
  id,
  label: `XC:${mark}`,
  key: 'termgrey',
  rail: 2,
  x: 244 + i * 18,
  mark,
  sub,
  group: 'XC',
  ...(i === 0 ? { groupLabel: 'XC · bornier commande' } : {}),
}));

export const TP_PERCEUSE_RADIALE: TpDefinition = {
  id: 'perceuse-radiale',
  title: 'Perceuse radiale · démarrage direct',
  level: '1re Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  diplomas: ['cap', 'bacpro'],
  summary:
    'Machine-outil 1,1 kW IE3. Q1 sectionneur porte-fusibles + KM1 bobine 24 V + F1, commande TBT 24 V par T1 400/24 V, pupitre S2 coup de poing / S3 arrêt / S4 marche et voyant H1 incolore, interrupteur de position S1 sur l\'écran de protection.',
  situation:
    'L\'atelier de production du lycée met en service une perceuse radiale. Le foret, serré dans le mandrin, est entraîné par un moteur asynchrone triphasé. Tu dois câbler le coffret de démarrage direct un sens de marche, avec une commande en très basse tension 24 V, un pupitre déporté (coup de poing, arrêt, marche, voyant sous tension) et un interrupteur de position qui interdit la rotation tant que l\'écran de protection n\'est pas en place, puis mettre la machine en service.',
  plaque: {
    P: '1,1 kW',
    U: '400 V Y · 50 Hz',
    In: '2,6 A',
    n: '1430 tr/min',
    'cos φ': '0,79',
    Rendement: 'IE3 · 84 %',
    Pôles: '4',
    Classe: 'F · IP 55',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + PE, 50 Hz, arrivée sur bornier X1' },
    { k: 'Force motrice', v: 'moteur asynchrone triphasé 1,1 kW, 1 500 tr/min, 4 pôles, couplage étoile' },
    { k: 'Commande', v: 'TBT 24 V ~ par transformateur T1 400/24 V · 63 VA, primaire protégé par Q2, secondaire par Q3' },
    { k: 'Sectionnement', v: 'Q1 sectionneur porte-fusibles cadenassable : c\'est LUI qui assure la consignation' },
    { k: 'Rail 1', v: 'Q1 · Q2 · Q3 · T1' },
    { k: 'Rail 2', v: 'KM1 · F1' },
    { k: 'Rail 3', v: 'X1 bornier puissance · XC bornier commande (7 bornes)' },
    { k: 'Pupitre', v: 'H1 voyant incolore « sous tension » · S2 coup de poing à verrouillage · S3 arrêt · S4 marche, raccordés sur XC' },
    { k: 'Sécurité machine', v: 'S1 interrupteur de position sur l\'écran de protection, en série dans la chaîne d\'arrêt entre XC:2 et XC:3' },
    { k: 'Auto-maintien', v: 'contact KM1 13-14 en parallèle sur S4' },
    { k: 'Défaut thermique', v: 'F1 95-96 en tête de la chaîne de commande : un déclenchement coupe tout' },
    { k: 'X1:4 · N', v: 'neutre amené au bornier mais NON utilisé : la machine est alimentée en 3 × 400 V + PE' },
    { k: 'Avant mise en service', v: 'consignation sur Q1 · VAT · continuité PE · isolement 500 V · contrôle de l\'ordre des phases' },
  ],
  pupitre: [
    { rep: 'H1', kind: 'lamp', color: 'clear', signals: 'ctl', label: 'voyant incolore · perceuse sous tension' },
    { rep: 'S2', kind: 'nc', color: 'red', latching: true, label: 'coup de poing à verrouillage · arrêt en cas de problème' },
    { rep: 'S3', kind: 'nc', color: 'red', label: 'arrêt de la rotation du mandrin' },
    { rep: 'S4', kind: 'no', color: 'green', label: 'mise en rotation du mandrin' },
  ],
  interPosition: {
    rep: 'S1',
    label: 'interrupteur de position de l\'écran de protection',
    etat: 'écran de protection en place',
  },
  postes: [
    {
      id: 'q1',
      name: 'Q1 · Sectionneur porte-fusibles',
      need: 'Sectionner, consigner et protéger contre les courts-circuits un moteur de 1,1 kW (In = 2,6 A)',
      options: [
        { key: 'fuseswitch', ref: 'GK1EK + cartouches aM 4 A', spec: '3 pôles · 400 V · aM 10 × 38', ok: true, why: 'Cadenassable en position ouverte : c\'est l\'organe de consignation. Les cartouches aM laissent passer la pointe de démarrage (5 à 8 × In) et coupent le court-circuit.' },
        { key: 'fuseswitch', ref: 'GK1EK + cartouches gG 4 A', spec: '3 pôles · fusibles gG', why: 'Les cartouches gG protègent les conducteurs, pas les moteurs : elles fondront à chaque démarrage.' },
        { key: 'mcb3p', ref: 'iC60N 3P C20', spec: 'disjoncteur 3 pôles 20 A', why: 'Un disjoncteur modulaire n\'est pas un organe de sectionnement à coupure pleinement apparente et cadenassable : le cahier des charges impose un sectionneur.' },
      ],
    },
    {
      id: 'km1',
      name: 'KM1 · Contacteur',
      need: 'Établir et interrompre le courant du moteur, bobine alimentée en 24 V',
      options: [
        { key: 'kontakt', ref: 'LC1D09P7', spec: '9 A AC-3 · bobine 230 V~', why: 'Bobine 230 V alors que la commande est en TBT 24 V : le contacteur ne collera jamais.' },
        { key: 'kontakt', ref: 'LC1D09B7', spec: '9 A AC-3 · bobine 24 V~', ok: true, why: '9 A en AC-3 couvrent largement les 2,6 A du moteur, et la bobine 24 V correspond au secondaire de T1.' },
        { key: 'kontakt', ref: 'LC1D25B7', spec: '25 A AC-3 · bobine 24 V~', half: true, why: 'Fonctionne, mais très surdimensionné pour 1,1 kW : encombrement et coût inutiles.' },
      ],
    },
    {
      id: 'f1',
      name: 'F1 · Relais thermique',
      need: 'Protéger le moteur contre les surcharges, réglé à In = 2,6 A',
      options: [
        { key: 'therm', ref: 'LRD07', spec: '1,6 – 2,5 A', why: 'Le réglage maximal 2,5 A est inférieur à In = 2,6 A : déclenchements intempestifs en charge.' },
        { key: 'therm', ref: 'LRD08', spec: '2,5 – 4 A', ok: true, why: 'In = 2,6 A tombe dans la plage, classe 10 adaptée au démarrage direct d\'une machine-outil.' },
        { key: 'therm', ref: 'LRD12', spec: '5,5 – 8 A', why: 'Réglage minimal 5,5 A, soit plus du double de In : le moteur n\'est pas protégé.' },
      ],
    },
    {
      id: 't1',
      name: 'T1 · Transformateur de commande',
      need: 'Abaisser 400 V en 24 V pour la commande (bobine + voyant)',
      options: [
        { key: 'trafo', ref: 'ABL6TS02U', spec: '400/24 V · 25 VA', half: true, why: 'Puissance juste : l\'appel de la bobine fait chuter la tension à l\'enclenchement.' },
        { key: 'trafo', ref: 'ABL6TS06U', spec: '400/24 V · 63 VA', ok: true, why: 'Primaire 400 V pris entre deux phases, secondaire 24 V, 63 VA largement suffisants.' },
        { key: 'trafo', ref: 'ABL6TS10U', spec: '230/12 V · 100 VA', why: 'Ni le primaire ni le secondaire ne correspondent au cahier des charges.' },
      ],
    },
    {
      id: 'q2',
      name: 'Q2 · Protection du primaire',
      need: 'Protéger le primaire 400 V de T1 (I₁ ≈ 0,16 A) et ses conducteurs',
      options: [
        { key: 'mcb2p', ref: 'iC60N 2P C2', spec: '2 A · courbe C · 2 pôles', ok: true, why: 'Bipolaire : le primaire est pris entre DEUX phases, il faut couper les deux.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · 1 pôle', why: 'Un seul pôle coupé : la seconde phase du primaire reste sous tension, le transformateur reste dangereux.' },
        { key: 'mcb2p', ref: 'iC60N 2P C20', spec: '20 A · courbe C', why: 'Calibre sans rapport avec un primaire de 0,16 A.' },
      ],
    },
    {
      id: 'q3',
      name: 'Q3 · Protection du secondaire',
      need: 'Protéger le circuit de commande 24 V (bobine + voyant ≈ 0,4 A)',
      options: [
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · courbe C · 1 pôle', ok: true, why: 'Le conducteur « com » est relié à la terre : on ne coupe que le conducteur actif.' },
        { key: 'mcb1p', ref: 'iC60N 1P C16', spec: '16 A · courbe C', why: 'Beaucoup trop élevé pour du 1,5 mm² de commande.' },
        { key: 'mcb2p', ref: 'iC60N 2P C2', spec: '2 A · 2 pôles', half: true, why: 'Fonctionne, mais couper le « com » mis à la terre ne sert à rien et coûte un module.' },
      ],
    },
    {
      id: 'pupitre',
      name: 'Pupitre · S2 S3 S4 H1',
      need: 'Coup de poing à verrouillage, arrêt, marche, et voyant de mise sous tension',
      options: [
        { key: 'stopstart', ref: 'XALK178 + XB4BA31 + XB4BVM1', spec: 'coup de poing NC verrouillable · arrêt NC · marche NO · voyant incolore 24 V', ok: true, why: 'Les deux arrêts sont à contact NC (sécurité positive), la marche à contact NO, et le voyant incolore signale la mise sous tension sans annoncer une marche.' },
        { key: 'stopstart', ref: 'Coup de poing à contact NO', spec: 'coup de poing NO', why: 'Un arrêt d\'urgence à contact NO ne coupe plus rien si un fil se rompt : c\'est exactement ce que la sécurité positive interdit.' },
        { key: 'stopstart', ref: 'S2 S3 S4 + voyant vert', spec: 'voyant vert 24 V', half: true, why: 'Fonctionne, mais un voyant vert annonce « machine en marche » selon la NF EN 60073 ; ici il signale la mise sous tension.' },
      ],
    },
    {
      id: 's1',
      name: 'S1 · Interrupteur de position',
      need: 'Interdire la rotation du mandrin tant que l\'écran de protection n\'est pas en place',
      options: [
        { key: 'stopstart', ref: 'XCKJ + contact NF à manœuvre positive', spec: 'contact NF à ouverture positive', ok: true, why: 'À ouverture positive : l\'ouverture du carter ARRACHE mécaniquement le contact, même s\'il est collé. C\'est l\'exigence des protecteurs mobiles.' },
        { key: 'stopstart', ref: 'Détecteur inductif', spec: 'détection sans contact', why: 'Un détecteur peut rester collé ou être leurré par une pièce métallique : il ne convient pas seul pour un protecteur mobile.' },
        { key: 'stopstart', ref: 'Contact NO simple', spec: 'contact à fermeture', why: 'Contact NO : une rupture de fil laisserait la machine démarrer carter ouvert.' },
      ],
    },
    {
      id: 'x',
      name: 'X1 / XC · Borniers',
      need: 'X1 : réseau et départ moteur (2,5 mm²) ; XC : commande vers le pupitre et l\'interrupteur de position (1,5 mm²)',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE', spec: 'bornes 2,5 mm² · PE vert-jaune', ok: true, why: 'Sections et repérage PE conformes ; une borne 2,5 accepte sans peine le 1,5 mm² de commande.' },
        { key: 'termgrey', ref: 'UT 1,5 partout', spec: 'bornes 1,5 mm²', why: 'La puissance est en 2,5 mm² : les bornes 1,5 ne conviennent pas pour X1.' },
        { key: 'termgrey', ref: 'Dominos', spec: 'connecteurs à vis', why: 'Interdit en armoire : bornes sur rail obligatoires.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Sectionneur porte-fusibles', key: 'fuseswitch', rail: 0, x: 46, rep: 'Q1' },
    { id: 'f2', label: 'Q2 · Primaire T1', key: 'mcb2p', rail: 0, x: 140, rep: 'Q2' },
    { id: 'f3', label: 'Q3 · Secondaire 24 V', key: 'mcb1p', rail: 0, x: 200, rep: 'Q3' },
    { id: 't1', label: 'T1 · Transformateur 400/24 V', key: 'trafo', rail: 0, x: 240, rep: 'T1' },
    { id: 'km1', label: 'KM1 · Contacteur', key: 'kontakt', rail: 1, x: 60, rep: 'KM1' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 1, x: 150, rep: 'F1' },
    ...X1(46),
    ...XC,
  ],
  annexItems: [],
  recvItems: [],
  liaisons: [
    // ---- puissance : réseau → Q1 → KM1 → F1 → moteur ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),
    // ---- alimentation TBT : deux phases en aval de Q1 → Q2 → T1 → Q3 ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.N', 'L2'),
    L('f2.2', 't1.400', 'L1'), L('f2.N', 't1.0', 'L2'),
    L('t1.24', 'f3.1', 'C'),
    L('t1.0V', 'x2_4.a', 'C0'), L('x2_4.a', 'x1_5.a', 'PE'),
    // ---- commande : conducteur « 2 », défaut thermique, chaîne d'arrêt ----
    L('f3.2', 'x2_1.a', 'C'), L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_5.a', 'C'),
    // S1 interrupteur de position : câble vers le carter, posé par l'installateur
    L('x2_5.b', 'x2_6.b', 'C', 'pre'),
    L('x2_6.a', 'x2_7.a', 'C'),
    // ---- commande : auto-maintien et bobine ----
    L('x2_2.a', 'km1.13', 'C'), L('x2_3.a', 'km1.A1', 'C'), L('km1.14', 'km1.A1', 'C'),
    L('km1.A2', 'x2_4.a', 'C0'),
    // ---- pupitre déporté : S2 coup de poing → S3 arrêt → S4 marche → bobine ----
    L('x2_7.b', 'S2.21', 'C', 'door'), L('S2.22', 'S3.21', 'C', 'door'),
    L('S3.22', 'S4.13', 'C', 'door'), L('S3.22', 'x2_2.b', 'C', 'door'),
    L('S4.14', 'x2_3.b', 'C', 'door'),
    L('x2_1.b', 'H1.X1', 'C', 'door'), L('x2_4.b', 'H1.X2', 'C0', 'door'),
    // ---- câblage installateur : arrivée réseau et câble moteur ----
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.L2', 'x1_2.b', 'L2', 'pre'), L('RES.L3', 'x1_3.b', 'L3', 'pre'),
    L('RES.N', 'x1_4.b', 'N', 'pre'), L('RES.PE', 'x1_5.b', 'PE', 'pre'),
    L('x1_6.b', 'M.U1', 'L1', 'pre'), L('x1_7.b', 'M.V1', 'L2', 'pre'), L('x1_8.b', 'M.W1', 'L3', 'pre'),
    L('x1_9.b', 'M.PE', 'PE', 'pre'),
  ],
  nets: {
    // bornier de puissance X1
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'L2', live: 'always' }, 'x1_2.b': { net: 'L2', live: 'always' },
    'x1_3.a': { net: 'L3', live: 'always' }, 'x1_3.b': { net: 'L3', live: 'always' },
    'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
    'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
    'x1_6.a': { net: 'U', live: 'run' }, 'x1_6.b': { net: 'U', live: 'run' },
    'x1_7.a': { net: 'V', live: 'run' }, 'x1_7.b': { net: 'V', live: 'run' },
    'x1_8.a': { net: 'W', live: 'run' }, 'x1_8.b': { net: 'W', live: 'run' },
    'x1_9.a': { net: 'PE', live: 'always' }, 'x1_9.b': { net: 'PE', live: 'always' },
    // sectionneur porte-fusibles
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'L2', live: 'always' }, 'q1.5': { net: 'L3', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'L2', live: 'q1' }, 'q1.6': { net: 'L3', live: 'q1' },
    // contacteur
    'km1.1': { net: 'L1', live: 'q1' }, 'km1.3': { net: 'L2', live: 'q1' }, 'km1.5': { net: 'L3', live: 'q1' },
    'km1.2': { net: 'U', live: 'run' }, 'km1.4': { net: 'V', live: 'run' }, 'km1.6': { net: 'W', live: 'run' },
    'km1.13': { net: 'C', live: 'ctl' }, 'km1.14': { net: 'C', live: 'km1' },
    'km1.A1': { net: 'C', live: 'km1' }, 'km1.A2': { net: 'C0', live: 'always' },
    // relais thermique
    'f1.1': { net: 'U', live: 'run' }, 'f1.3': { net: 'V', live: 'run' }, 'f1.5': { net: 'W', live: 'run' },
    'f1.2': { net: 'U', live: 'run' }, 'f1.4': { net: 'V', live: 'run' }, 'f1.6': { net: 'W', live: 'run' },
    'f1.95': { net: 'C', live: 'ctl' }, 'f1.96': { net: 'C', live: 'ctl' },
    // protection du primaire (Q2)
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'L1', live: 'f2' },
    // transformateur de commande
    't1.400': { net: 'L1', live: 'f2' }, 't1.0': { net: 'L2', live: 'f2' }, 't1.230': { net: 'C0', live: 'always' },
    't1.24': { net: 'C', live: 'f2' }, 't1.0V': { net: 'C0', live: 'always' }, 't1.48': { net: 'C0', live: 'always' },
    // protection du secondaire (Q3)
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    // bornier de commande XC
    'x2_1.a': { net: 'C', live: 'ctl' }, 'x2_1.b': { net: 'C', live: 'ctl' },
    'x2_5.a': { net: 'C', live: 'ctl' }, 'x2_5.b': { net: 'C', live: 'ctl' },
    'x2_6.a': { net: 'C', live: 'ctl' }, 'x2_6.b': { net: 'C', live: 'ctl' },
    'x2_7.a': { net: 'C', live: 'ctl' }, 'x2_7.b': { net: 'C', live: 'ctl' },
    'x2_2.a': { net: 'C', live: 'ctl' }, 'x2_2.b': { net: 'C', live: 'ctl' },
    'x2_3.a': { net: 'C', live: 'ctl' }, 'x2_3.b': { net: 'C', live: 'ctl' },
    'x2_4.a': { net: 'C0', live: 'always' }, 'x2_4.b': { net: 'C0', live: 'always' },
    // moteur et pupitre
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S2.21': { net: 'C', live: 'ctl' }, 'S2.22': { net: 'C', live: 'ctl' },
    'S3.21': { net: 'C', live: 'ctl' }, 'S3.22': { net: 'C', live: 'ctl' },
    'S4.13': { net: 'C', live: 'ctl' }, 'S4.14': { net: 'C', live: 'ctl' },
    'H1.X1': { net: 'C', live: 'ctl' }, 'H1.X2': { net: 'C0', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'arret',
      title: 'Continuité de la chaîne d\'arrêt',
      how: 'Multimètre en Ω entre XC:2 et XC:5, écran de protection en place, aucun bouton actionné : le chemin doit passer par S1, S2 21-22 et S3 21-22.',
      expected: '≈ 0 Ω · puis circuit ouvert dès qu\'on actionne S2, S3, ou qu\'on ouvre l\'écran',
    },
    {
      id: 'cont',
      title: 'Continuité du circuit de commande',
      how: 'Multimètre en Ω entre Q3:2 et XC:7, S4 maintenu appuyé : le chemin traverse F1 95-96, la chaîne d\'arrêt, S4 et la bobine de KM1.',
      expected: '≈ 100 Ω (bobine 24 V)',
    },
    {
      id: 'renr',
      title: 'Résistance des enroulements',
      how: 'Multimètre en Ω entre M.U1 et M.W2, barrettes de couplage retirées : les trois enroulements doivent être équilibrés.',
      expected: '5 à 9 Ω, écart < 5 % entre phases',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du PE jusqu\'à la carcasse moteur', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'M.PE', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement U1 / PE sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'M.U1', b: 'M.PE', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'renr', title: 'Résistance d\'un enroulement (U1 – W2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.W2', min: 5, max: 9, unit: 'Ω',
    },
    {
      id: 'u400', title: 'Tension composée en aval de Q1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'run',
    },
    {
      id: 'u24', title: 'Tension de commande au secondaire de T1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 't1.24', b: 't1.0V', min: 22, max: 26, unit: 'V', when: 'ctl',
    },
    {
      id: 'iL', title: 'Courant de ligne à la pince (KM1:2 → F1:1)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>f1.1', min: 2, max: 3.2, unit: 'A', when: 'run',
    },
    {
      id: 'n', title: 'Vitesse de rotation au tachymètre', stage: 'sousTension',
      instrument: 'tach', dial: 'tr/min', min: 1350, max: 1480, unit: 'tr/min', when: 'run',
    },
  ],
  faults: [
    { id: 'a2', title: 'Fil A2 de la bobine KM1 desserré', symptom: 'KM1 vibre et ne tient pas à l\'appui sur S4.', fix: 'Resserrer A2 et refaire la continuité A2 – XC:7.' },
    { id: 's1', title: 'Contact NF de l\'interrupteur de position S1 resté ouvert', symptom: 'Rien ne se passe à l\'appui sur S4, pourtant H1 est allumé et l\'écran de protection est bien en place.', fix: 'Contrôler le réglage de la came de S1, puis remplacer le contact NF à ouverture positive.' },
    { id: 'l2', title: 'Phase L2 coupée entre F1 et X1:7', symptom: 'Le moteur ronfle sans tourner, courant anormal sur L1 et L3, F1 finit par déclencher.', fix: 'Refaire la liaison F1:4 → X1:7 et réarmer F1.' },
    { id: 'x2', title: 'Fil XC:6 → KM1 A1 débranché', symptom: 'Rien ne se passe à l\'appui sur S4, mais 24 V présents sur XC:6.', fix: 'Reconnecter XC:6 sur A1.' },
    { id: 'f3', title: 'Q3 déclenché (défaut sur le 24 V)', symptom: 'H1 éteint alors que Q1 est fermé, 0 V sur tout le bornier XC, 24 V au secondaire de T1.', fix: 'Chercher le défaut d\'isolement du circuit 24 V, puis réarmer Q3.' },
  ],
  quiz: [
    {
      q: 'Le moteur a une intensité nominale In = 2,6 A. Entre quelles valeurs se situe la pointe de courant au démarrage direct ?',
      options: ['entre 2,6 A et 5,2 A', 'entre 13 A et 20,8 A', 'entre 26 A et 52 A'],
      answer: 1,
    },
    {
      q: 'Quel appareil assure le sectionnement et la consignation de la perceuse ?',
      options: ['le contacteur KM1', 'le sectionneur porte-fusibles Q1', 'le relais thermique F1'],
      answer: 1,
    },
    {
      q: 'Pourquoi l\'interrupteur de position S1 doit-il être à contact NF à ouverture positive ?',
      options: [
        'Pour consommer moins de courant',
        'Pour que l\'ouverture de l\'écran arrache mécaniquement le contact, même s\'il est collé',
        'Pour que la machine démarre plus vite',
      ],
      answer: 1,
    },
    {
      q: 'Le voyant H1 est incolore et non vert. Que signale-t-il ?',
      options: ['que le mandrin tourne', 'que la perceuse est sous tension', 'qu\'un défaut thermique est apparu'],
      answer: 1,
    },
  ],
  motor: { P: 1100, U: 400, In: 2.6, n: 1430, ns: 1500, cosPhi: 0.79 },
  station: true,
  hasMotor: true,
};
