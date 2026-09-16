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
import { BASE_TESTS, L, POSTE_T1_OPTIONS, TRAFO_REF, X1, liaisonsT1, netsT1 } from './common';

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
    { k: 'Commande', v: 'TBT 24 V ~ par le transformateur T1 Legrand 042872 (100 VA), primaire protégé par Q2 bipolaire PHASE / PHASE, secondaire par Q3 PHASE + NEUTRE' },
    { k: 'Primaire de T1', v: 'prises 0 · 230 · 400. Alimentation en 400 V ENTRE DEUX PHASES : raccorder sur 0 et 400, la prise 230 reste libre. En 230 V on utiliserait 0 et 230, avec le NEUTRE sur la borne 0 — ici il n\'y a pas de neutre à la machine.' },
    { k: 'Secondaire de T1', v: 'BI-TENSION : deux enroulements de 24 V, bornes marquées 0 · 0 · 24 · 24 (0a · 0b · 24a · 24b au simulateur) et une borne de terre. Pour 24 V, deux barrettes — 0a-0b et 24a-24b — mettent les enroulements en PARALLÈLE ; une seule, 0b-24a, les mettrait en SÉRIE et donnerait 48 V. La sortie se prend sur 0a et 24b, et le 0a est relié à la terre.' },
    { k: 'Q3', v: 'disjoncteur PHASE + NEUTRE : le pôle protégé coupe le 24 V, le pôle neutre sectionne le « com ». Les deux conducteurs de la commande s\'ouvrent d\'un seul geste.' },
    { k: 'Sectionnement', v: 'Q1 sectionneur porte-fusibles cadenassable : c\'est LUI qui assure la consignation' },
    { k: 'Rail 1', v: 'Q1 · Q2 · Q3 · T1' },
    { k: 'Rail 2', v: 'KM1 · F1' },
    { k: 'Rail 3', v: 'X1 bornier puissance · XC bornier commande (7 bornes)' },
    { k: 'Pupitre', v: 'H1 voyant incolore « sous tension » · S2 coup de poing à verrouillage · S3 arrêt · S4 marche, raccordés sur XC' },
    { k: 'Sécurité machine', v: 'S1 interrupteur de position à galet sur l\'écran de protection, contact NF 11-12 en série dans la chaîne d\'arrêt entre XC:2 et XC:3' },
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
  preparation: {
    identification: [
      {
        id: 'id-q1', focus: 'Q1', schema: 'puissance', rep: 'Q1',
        invite: 'Quel organe porte ce repère en tête de la platine ?',
        options: ['Un sectionneur porte-fusibles', 'Un disjoncteur moteur', 'Un contacteur', 'Un relais thermique'],
        answer: 0,
        why: 'Q1 est un sectionneur porte-fusibles : il sépare, se cadenasse (consignation) et protège du court-circuit par ses cartouches aM.',
      },
      {
        id: 'id-km1', focus: 'KM1', schema: 'puissance', rep: 'KM1',
        invite: 'Quel appareil établit et coupe le courant du moteur sur ordre de la commande ?',
        options: ['Un contacteur', 'Un sectionneur', 'Un relais thermique', 'Un transformateur'],
        answer: 0,
        why: 'KM1 est un contacteur : sa bobine 24 V ferme ses pôles de puissance et laisse passer le courant du moteur.',
      },
      {
        id: 'id-f1', focus: 'F1', schema: 'puissance', rep: 'F1',
        invite: 'Quel appareil est monté entre le contacteur et le moteur ?',
        options: ['Un relais thermique', 'Un transformateur', 'Un parafoudre', 'Un bloc temporisé'],
        answer: 0,
        why: 'F1 est le relais thermique : il surveille le courant du moteur et coupe la commande par son contact 95-96 en cas de surcharge.',
      },
      {
        id: 'id-s1', focus: 'S1', schema: 'commande', rep: 'S1',
        invite: 'Sur l\'écran de protection, ce repère désigne :',
        options: ['Un interrupteur de position (fin de course)', 'Un bouton du pupitre', 'Un voyant', 'Un détecteur de fumée'],
        answer: 0,
        why: 'S1 est un interrupteur de position à contact NF : tant que l\'écran n\'est pas en place, il ouvre la chaîne de commande.',
      },
      {
        id: 'id-s2', focus: 'S2', schema: 'commande', rep: 'S2',
        invite: 'Le bouton rouge « coup de poing » à verrouillage est :',
        options: ['Un arrêt d\'urgence', 'Un bouton de marche', 'Un voyant de signalisation', 'Un fin de course'],
        answer: 0,
        why: 'S2 est l\'arrêt d\'urgence : contact NF à accrochage, il coupe et reste verrouillé jusqu\'au déverrouillage manuel.',
      },
      {
        id: 'id-h1', focus: 'H1', schema: 'commande', rep: 'H1',
        invite: 'Le repère H1 sur le pupitre désigne :',
        options: ['Un voyant de signalisation', 'Un bouton d\'arrêt', 'Un contacteur', 'Un fusible'],
        answer: 0,
        why: 'H1 est un voyant : incolore, il signale simplement la mise sous tension de la commande.',
      },
    ],
    fonctions: [
      {
        id: 'fn-q1', focus: 'Q1', schema: 'puissance', rep: 'Q1',
        invite: 'Quelles fonctions Q1 assure-t-il ?',
        options: [
          'Sectionner, consigner et protéger contre les courts-circuits',
          'Protéger le moteur contre les surcharges',
          'Établir et couper le courant du moteur',
          'Abaisser la tension de commande',
        ],
        answer: 0,
        why: 'Sectionnement cadenassable + protection court-circuit par cartouches aM. La surcharge, elle, est l\'affaire du relais thermique.',
      },
      {
        id: 'fn-f1', focus: 'F1', schema: 'commande', rep: 'F1 · 95-96',
        invite: 'Que fait le contact 95-96 du relais thermique en cas de surcharge ?',
        options: [
          'Il ouvre le circuit de commande et fait retomber KM1',
          'Il coupe directement les phases du moteur',
          'Il allume un voyant sans rien couper',
          'Il ferme la bobine du contacteur',
        ],
        answer: 0,
        why: 'Le thermique n\'ouvre pas la puissance : son contact 95-96, en série dans la commande, coupe la bobine de KM1 qui ouvre alors la puissance.',
      },
      {
        id: 'fn-s4', focus: 'S4', schema: 'commande', rep: 'S4',
        invite: 'Quelle est la fonction du bouton vert S4 ?',
        options: [
          'Mettre le mandrin en rotation (marche)',
          'Arrêter la rotation',
          'Signaler la mise sous tension',
          'Protéger le moteur',
        ],
        answer: 0,
        why: 'S4 est un bouton-poussoir NO de marche : appuyé, il alimente la bobine de KM1 qui se maintient ensuite par son auto-maintien.',
      },
      {
        id: 'fn-s1', focus: 'S1', schema: 'commande', rep: 'S1',
        invite: 'À quoi sert l\'interrupteur de position S1 ?',
        options: [
          'Interdire la rotation tant que l\'écran de protection n\'est pas en place',
          'Démarrer le moteur',
          'Signaler un défaut thermique',
          'Abaisser le 400 V en 24 V',
        ],
        answer: 0,
        why: 'À ouverture positive et NF : écran retiré, la chaîne de commande s\'ouvre et le mandrin ne peut pas tourner. C\'est une sécurité de personne.',
      },
      {
        id: 'fn-t1', schema: 'commande', rep: 'T1',
        invite: 'Quel est le rôle du transformateur T1 ?',
        options: [
          'Abaisser le 400 V en 24 V pour alimenter la commande',
          'Protéger le moteur contre les surcharges',
          'Établir le courant du moteur',
          'Sectionner et consigner l\'installation',
        ],
        answer: 0,
        why: 'T1 fournit la TBT 24 V de la commande (bobine + voyant) à partir du réseau 400 V : la commande n\'est pas au potentiel du réseau.',
      },
      {
        id: 'fn-s2', focus: 'S2', schema: 'commande', rep: 'S2',
        invite: 'Rôle du coup de poing S2 à verrouillage ?',
        options: [
          'Arrêt d\'urgence : couper et rester verrouillé jusqu\'au déverrouillage',
          'Mettre en marche le mandrin',
          'Signaler la mise sous tension',
          'Protéger contre les surcharges',
        ],
        answer: 0,
        why: 'Contact NF à accrochage en tête de la chaîne d\'arrêt : il ouvre la commande et se verrouille, le redémarrage exige un déverrouillage volontaire.',
      },
    ],
  },
  puissance: {
    phases: ['L1', 'L2', 'L3'],
    reseau: '3 × 400 V + PE',
    organes: [
      { type: 'bornier', rep: 'X1', legende: 'arrivée réseau', bornes: [['1', ''], ['2', ''], ['3', '']] },
      { type: 'sectionneur', rep: 'Q1', legende: 'séparation · cartouches aM', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      { type: 'contacteur', rep: 'KM1', legende: 'commande du moteur', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      { type: 'thermique', rep: 'F1', legende: 'surcharges', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      { type: 'bornier', rep: 'X1', legende: 'départ moteur', bornes: [['6', ''], ['7', ''], ['8', '']] },
    ],
    moteur: { rep: 'M', legende: '1,1 kW · 400 V · 2,6 A' },
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
        ...POSTE_T1_OPTIONS,
      ],
    },
    {
      id: 'q2',
      name: 'Q2 · Protection du primaire',
      need: 'Protéger le primaire 400 V de T1 (I₁ ≈ 0,16 A) et ses conducteurs',
      options: [
        { key: 'mcb2ph', ref: 'C60N 2P C2', spec: '2 A · courbe C · 2 pôles', ok: true, why: 'Bipolaire : le primaire est pris entre DEUX phases, il faut couper les deux.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · 1 pôle', why: 'Un seul pôle coupé : la seconde phase du primaire reste sous tension, le transformateur reste dangereux.' },
        { key: 'mcb2ph', ref: 'iC60N 2P C20', spec: '20 A · courbe C', why: 'Calibre sans rapport avec un primaire de 0,16 A.' },
      ],
    },
    {
      id: 'q3',
      name: 'Q3 · Protection du secondaire',
      need: 'Protéger le circuit de commande 24 V (bobine + voyant ≈ 0,4 A)',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C2 · A9F74602', spec: '2 A · courbe C · phase + neutre', ok: true, why: 'Le pôle protégé coupe le 24 V, le pôle neutre sectionne le « com » : les deux conducteurs de la commande s\'ouvrent d\'un seul geste.' },
        { key: 'mcb1p', ref: 'Acti9 iC60N 1P C2', spec: '2 A · courbe C · 1 pôle', half: true, why: 'Protège bien, mais laisse le « com » raccordé au secondaire pendant l\'intervention.' },
        { key: 'mcb2p', ref: 'C60N 2P C2', spec: '2 A · 2 pôles', half: true, why: 'Fonctionne, mais couper le « com » mis à la terre ne sert à rien et coûte un module.' },
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
        { key: 'limitswitch', ref: 'XCKJ à galet · contact NF 11-12', spec: 'NF à ouverture positive', ok: true, why: 'À ouverture positive : l\'ouverture de l\'écran ARRACHE mécaniquement le contact, même s\'il est collé. C\'est l\'exigence des protecteurs mobiles.' },
        { key: 'limitswitch', ref: 'XCKJ à galet · contact NO 11-14', spec: 'NO à fermeture', why: 'Contact NO : une rupture de fil laisserait la perceuse démarrer écran ouvert. Le même appareil, mais la mauvaise borne.' },
        { key: 'limitswitch', ref: 'Détecteur inductif', spec: 'détection sans contact', why: 'Un détecteur peut rester collé ou être leurré par une pièce métallique : il ne convient pas seul pour un protecteur mobile.' },
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
    { id: 'f2', label: 'Q2 · Primaire T1', key: 'mcb2ph', rail: 0, x: 140, rep: 'Q2' },
    { id: 'f3', label: 'Q3 · Secondaire 24 V · phase + neutre', key: 'mcb1pn', rail: 0, x: 200, rep: 'Q3' },
    { id: 't1', label: 'T1 · Transformateur Legrand 100 VA · 230-400 / 24-48 V', key: 'trafoleg', rail: 0, x: 262, rep: 'T1' },
    { id: 'km1', label: 'KM1 · Contacteur', key: 'kontakt', rail: 1, x: 60, rep: 'KM1' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 1, x: 150, rep: 'F1' },
    ...X1(46),
    ...XC,
  ],
  annexItems: [],
  // S1 est sur la MACHINE, pas dans l'armoire : il est posé dans le bloc récepteurs, à côté
  // du moteur, et l'élève le raccorde par le presse-étoupe comme le câble moteur.
  recvItems: [
    {
      key: 'limitswitch', rep: 'S1', name: 'interrupteur de position · écran de protection',
      x: 330, y: 20, w: 40, h: 92, recv: true,
    },
  ],
  liaisons: [
    // ---- puissance : réseau → Q1 → KM1 → F1 → moteur ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),
    // ---- alimentation TBT : deux phases en aval de Q1 → Q2 → T1 → Q3 ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.3', 'L2'),
    ...liaisonsT1({ retour: 'x2_4.a', terre: 'x1_5.a' }),
    L('x2_4.a', 'x1_5.a', 'PE'),
    // ---- commande : conducteur « 2 », défaut thermique, chaîne d'arrêt ----
    L('f3.2', 'x2_1.a', 'C'), L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_5.a', 'C'),
    // S1 interrupteur de position : contact NF (11-12) en série dans la chaîne d'arrêt.
    // Le contact NO 14 reste libre — c'est le piège : câbler sur 14 laisserait la perceuse
    // démarrer écran ouvert et interdirait le démarrage écran fermé.
    L('x2_5.b', 'S1.X1', 'C'), L('S1.X2', 'x2_6.b', 'C'),
    L('x2_6.a', 'x2_7.a', 'C'),
    // ---- commande : auto-maintien et bobine ----
    L('x2_2.a', 'km1.13', 'C'), L('x2_3.a', 'km1.A1', 'C'), L('km1.14', 'km1.A1', 'C'),
    L('km1.A2', 'x2_4.a', 'C0'),
    // ---- pupitre déporté : S2 coup de poing → S3 arrêt → S4 marche → bobine ----
    L('x2_7.b', 'S2.21', 'C', 'door'), L('S2.22', 'S3.21', 'C', 'door'),
    L('S3.22', 'S4.13', 'C', 'door'), L('S3.22', 'x2_2.b', 'C', 'door'),
    L('S4.14', 'x2_3.b', 'C', 'door'),
    L('x2_1.b', 'H1.X1', 'C', 'door'), L('x2_4.b', 'H1.X2', 'C0', 'door'),
    // ---- barrettes de couplage : l'élève les pose d'après la plaque (400 V → étoile) ----
    L('M.W2', 'M.U2', 'BAR'), L('M.U2', 'M.V2', 'BAR'),
    // ---- arrivée réseau et câble moteur : câblés par l'élève, comme le reste ----
    L('RES.L1', 'x1_1.b', 'L1'), L('RES.L2', 'x1_2.b', 'L2'), L('RES.L3', 'x1_3.b', 'L3'),
    L('RES.N', 'x1_4.b', 'N'), L('RES.PE', 'x1_5.b', 'PE'),
    L('x1_6.b', 'M.U1', 'L1'), L('x1_7.b', 'M.V1', 'L2'), L('x1_8.b', 'M.W1', 'L3'),
    L('x1_9.b', 'M.PE', 'PE'),
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
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.3': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.4': { net: 'L2', live: 'f2' },
    // transformateur de commande
    // Primaire à prises 0 · 230 · 400. Le TP alimente en 400 V ENTRE DEUX PHASES, donc sur
    // 0 et 400 ; la prise 230 reste LIBRE. Elle était déclarée sur le 0 V de commande, donc
    // équipotentielle à la terre : un élève qui y raccordait un retour de bobine obtenait un
    // montage « cohérent » pour le simulateur, alors que c'est un court-circuit phase-terre.
    // Même faute sur la prise 48 V du secondaire. Chacune a désormais son propre réseau.
    ...netsT1('f2'),
    // protection du secondaire (Q3)
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    'f3.N': { net: 'C0', live: 'always' }, 'f3.N2': { net: 'C0', live: 'always' },
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
    'S1.X1': { net: 'C', live: 'ctl' }, 'S1.X2': { net: 'C', live: 'ctl' },
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
      how: 'Multimètre en Ω, barrettes de couplage retirées : mesure U1–U2, puis V1–V2, puis W1–W2. Les trois valeurs doivent être égales. Entre deux enroulements différents (U1–V1 par exemple), l\'appareil doit afficher OL.',
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
      id: 'renr', title: 'Résistance de l\'enroulement U (U1 – U2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.U2', min: 5, max: 9, unit: 'Ω',
    },
    {
      id: 'u400', title: 'Tension composée en aval de Q1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'run',
    },
    {
      id: 'u24', title: 'Tension de commande au secondaire de T1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 't1.24b', b: 't1.0a', min: 22, max: 26, unit: 'V', when: 'ctl',
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
  // `coupe` / `ouvre` : ce que la panne fait au réseau, pour que le solveur du
  // circuit de commande la rende mesurable. `action` : la remise en état attendue,
  // proposée à l'élève au milieu d'autres à l'étape de dépannage.
  faults: [
    {
      id: 'a2', title: 'Fil A2 de la bobine KM1 desserré',
      symptom: 'KM1 vibre et ne tient pas à l\'appui sur S4.',
      fix: 'Resserrer A2 et refaire la continuité A2 – XC:7.',
      coupe: 'km1.A2>x2_4.a', action: 'Resserrer le fil sur A2 et contrôler la continuité jusqu\'au 0 V',
    },
    {
      id: 's1', title: 'Contact NF de l\'interrupteur de position S1 resté ouvert',
      symptom: 'Rien ne se passe à l\'appui sur S4, pourtant H1 est allumé et l\'écran de protection est bien en place.',
      fix: 'Contrôler le réglage de la came de S1, puis remplacer le contact NF à ouverture positive.',
      ouvre: 'S1', action: 'Régler la came de S1 et remplacer le contact NF à ouverture positive',
    },
    {
      id: 'l2', title: 'Phase L2 coupée entre F1 et X1:7',
      symptom: 'Le moteur ronfle sans tourner, courant anormal sur L1 et L3, F1 finit par déclencher.',
      fix: 'Refaire la liaison F1:4 → X1:7 et réarmer F1.',
      coupe: 'f1.4>x1_7.a', action: 'Refaire la liaison F1:4 → X1:7 et réarmer F1',
    },
    {
      id: 'x2', title: 'Fil XC:6 → KM1 A1 débranché',
      symptom: 'Rien ne se passe à l\'appui sur S4, mais 24 V présents sur XC:6.',
      fix: 'Reconnecter XC:6 sur A1.',
      coupe: 'x2_3.a>km1.A1', action: 'Reconnecter le fil de XC:6 sur la borne A1 de KM1',
    },
    {
      id: 'f3', title: 'Q3 déclenché (défaut sur le 24 V)',
      symptom: 'H1 éteint alors que Q1 est fermé, 0 V sur tout le bornier XC, 24 V au secondaire de T1.',
      fix: 'Chercher le défaut d\'isolement du circuit 24 V, puis réarmer Q3.',
      ouvre: 'f3', action: 'Chercher le défaut d\'isolement du 24 V, puis réarmer Q3',
    },
  ],
  quiz: [
    {
      q: 'Le primaire de T1 porte trois prises : 0, 230 et 400. L\'alimentation se fait en 400 V entre deux phases. Sur quelles bornes raccordes-tu ?',
      options: ['0 et 230', '0 et 400', '230 et 400', '0, 230 et 400 en même temps', 'Pour limiter l\'usure du contact'],
      answer: 1,
    },
    {
      q: 'Si ce transformateur était alimenté en 230 V au lieu de 400 V, que faudrait-il amener sur la borne 0 ?',
      options: ['une deuxième phase', 'le neutre', 'le conducteur de protection', 'une troisième phase'],
      answer: 1,
    },
    {
      q: 'Le moteur a une intensité nominale In = 2,6 A. Entre quelles valeurs se situe la pointe de courant au démarrage direct ?',
      options: ['entre 2,6 A et 5,2 A', 'entre 13 A et 20,8 A', 'entre 26 A et 52 A', 'entre 5,2 A et 7,8 A'],
      answer: 1,
    },
    {
      q: 'Quel appareil assure le sectionnement et la consignation de la perceuse ?',
      options: ['le contacteur KM1', 'le sectionneur porte-fusibles Q1', 'le relais thermique F1', 'le transformateur T1'],
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
      options: ['que le mandrin tourne', 'que la perceuse est sous tension', 'qu\'un défaut thermique est apparu', 'que le mandrin tourne dans le bon sens'],
      answer: 1,
    },
  ],
  motor: { P: 1100, U: 400, In: 2.6, n: 1430, ns: 1500, cosPhi: 0.79 },
  // Transformateur de commande à prises : le rapport de transformation est fixé par
  // les spires, donc se tromper de prise ne bloque rien — ça se paie au secondaire.
  // Voir `src/lib/sim/trafo.ts`.
  trafo: { slot: 't1', ...TRAFO_REF },
  // Folio du circuit de commande. On n'écrit que l'ORDRE des organes : le moteur
  // de mise en page (`src/lib/schema/folio.ts`) place les ordonnées, et l'état de
  // chaque contact se lit dans le réseau, pas ici.
  folio: {
    railHaut: '24 V — secondaire de T1',
    railBas: 'com — retour 0 V, relié à la terre',
    source: 't1.24b', repSource: 'T1:24b',
    retour: 't1.0a', repRetour: 'T1:0a',
    tete: {
      type: 'disjoncteur', a: 'f3.1', b: 'f3.2',
      rep: 'Q3', legende: 'protection du 24 V', conducteur: '2',
    },
    // Pôle NEUTRE de Q3, sur le rail de retour : il sectionne le 0 V en même temps
    // que le pôle protégé coupe le 24 V.
    pied: {
      type: 'disjoncteur', a: 'f3.N', b: 'f3.N2',
      rep: 'Q3', legende: 'pôle neutre · sectionnement du 0 V',
    },
    colonnes: [
      {
        id: 'chaine', dx: 0,
        elements: [
          { type: 'contactNF', a: 'f1.95', b: 'f1.96', rep: 'F1', bornes: ['95', '96'],
            actionneur: 'bilame', legende: 'relais thermique', conducteur: '3' },
          { type: 'borne', a: 'x2_5.a', rep: 'XC:2' },
          { type: 'contactNF', a: 'S1.X1', b: 'S1.X2', rep: 'S1', bornes: ['11', '12'],
            actionneur: 'came', legende: 'écran de protection', conducteur: '4' },
          { type: 'borne', a: 'x2_6.b', rep: 'XC:3' },
          { type: 'borne', a: 'x2_7.a', rep: 'XC:4' },
          { type: 'contactNF', a: 'S2.21', b: 'S2.22', rep: 'S2', bornes: ['21', '22'],
            actionneur: 'champignon', legende: 'arrêt d\'urgence', conducteur: '5' },
          { type: 'contactNF', a: 'S3.21', b: 'S3.22', rep: 'S3', bornes: ['21', '22'],
            actionneur: 'poussoir', legende: 'arrêt', conducteur: '6' },
          { type: 'contactNO', a: 'S4.13', b: 'S4.14', rep: 'S4', bornes: ['13', '14'],
            actionneur: 'poussoir', legende: 'marche', conducteur: '7' },
          { type: 'borne', a: 'x2_3.a', rep: 'XC:6' },
          { type: 'bobine', a: 'km1.A1', b: 'km1.A2', rep: 'KM1', legende: 'bobine 24 V' },
          { type: 'borne', a: 'x2_4.a', rep: 'XC:7' },
        ],
      },
      {
        id: 'voyant', dx: -1,
        elements: [
          { type: 'borne', a: 'x2_1.a', rep: 'XC:1' },
          { type: 'fil', a: 'x2_1.a', b: 'H1.X1', h: 170 },
          { type: 'voyant', a: 'H1.X1', b: 'H1.X2', rep: 'H1', legende: 'incolore' },
        ],
      },
      {
        id: 'maintien', dx: 1, depuis: 'S3.22', vers: 'km1.A1',
        elements: [
          { type: 'borne', a: 'x2_2.a', rep: 'XC:5' },
          { type: 'contactNO', a: 'km1.13', b: 'km1.14', rep: 'KM1', bornes: ['13', '14'],
            legende: 'auto-maintien' },
        ],
      },
    ],
    cadres: [
      { titre: 'Sur le capot', de: 'S1.X1', a: 'S1.X2', couleur: 'capot' },
      // Le voyant est en porte lui aussi ; le contact d'auto-maintien, non :
      // il est sur le contacteur, dans l'armoire.
      { titre: 'Boîtier de commande (en porte)', de: 'S2.21', a: 'S4.14',
        couleur: 'porte', colonnes: ['chaine', 'voyant'] },
    ],
  },
  station: true,
  hasMotor: true,
};
