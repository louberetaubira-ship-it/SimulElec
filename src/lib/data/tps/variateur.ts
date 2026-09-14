/**
 * TP · Câblage et mise en service d'un variateur de vitesse.
 *
 * Premier TP du catalogue où l'élève ne câble pas seulement : il **paramètre**.
 * Un moteur piloté par un variateur ne démarre pas parce que le câblage est juste,
 * il démarre parce que la plaque signalétique a été entrée dans l'appareil.
 *
 * Matériel : Altivar ATV320U07N4B — 45 × 325 × 245 mm, 0,75 kW, 380-500 V triphasé,
 * 3,6 A en ligne sous 380 V, 2,3 A de sortie à 4 kHz, sortie 0,1 à 599 Hz
 * (fiche produit Schneider). L'ATV312 de la littérature d'atelier est arrêté depuis
 * décembre 2017 ; c'est l'ATV320 qui le remplace, et c'est lui que mobilise la
 * progression MELEC de l'établissement.
 *
 * Ce qui distingue ce TP d'un démarrage direct :
 * - **aucune pointe de démarrage** : le variateur part à fréquence nulle et monte
 *   en rampe (`ACC`). Le moteur ne voit jamais 6 × In ;
 * - **aucun relais thermique** : le courant de sortie n'est pas sinusoïdal et sa
 *   fréquence varie, un bilame ne sait pas le mesurer. C'est la protection I²t
 *   interne du variateur, réglée par `ItH`, qui protège le moteur ;
 * - **aucun organe de coupure entre le variateur et le moteur** : ouvrir en charge
 *   la sortie d'un onduleur, c'est le détruire ;
 * - le **bus continu** reste chargé après coupure : 15 minutes d'attente, puis
 *   contrôle de moins de 42 V continus entre PA/+ et PC/− avant toute intervention.
 *
 * Choix de conception de cette première version, à assumer devant l'élève :
 * l'ordre de marche LI1 est donné par un contact auxiliaire du contacteur de ligne
 * (bloc LADN11, contact 53-54), circuit galvaniquement séparé du 24 V de T1. La
 * conséquence est volontairement laissée visible : l'arrêt se fait en **roue libre**
 * par coupure de l'alimentation (catégorie 0), et non sur la rampe `dEC`. C'est
 * exactement la question de conception posée dans le quiz.
 */
import type { Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, X1, X2 } from './common';

/** Bornier de commande X2 : 7 bornes, repérées comme au folio. */
const X2B: Slot[] = X2(244, 7, 2, {
  subs: ['24V', 'KM1', 'A1', '0V', 'H1', 'H2', 'rés.'],
  groupLabel: 'X2 · bornier commande',
});

export const TP_VARIATEUR: TpDefinition = {
  id: 'variateur',
  title: 'Variateur de vitesse · câblage et mise en service',
  level: 'Tle Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Régler, paramétrer', 'C7 Maintenir', 'C8 Communiquer'],
  diplomas: ['bacpro', 'bts'],
  summary:
    'Convoyeur à vitesse variable. Q1 disjoncteur de tête + KM1 contacteur de ligne + variateur Altivar ATV320 0,75 kW, commande TBT 24 V par T1 400/24 V, pupitre arrêt d\'urgence / arrêt / marche, voyants « sous tension » et « variateur prêt ». Pas de relais thermique : la protection du moteur est le réglage ItH du variateur.',
  situation:
    'Le convoyeur de l\'atelier doit changer de cadence selon les pièces transportées. Tu remplaces son démarrage direct par un variateur de vitesse Altivar ATV320. Tu câbles la puissance jusqu\'au moteur en câble blindé, la commande 24 V du contacteur de ligne, l\'ordre de marche sur l\'entrée logique LI1, puis tu entres la plaque signalétique du moteur dans le variateur et tu mets en service.',
  plaque: {
    P: '0,75 kW',
    U: '400 V Y · 50 Hz',
    In: '1,9 A',
    n: '1395 tr/min',
    'cos φ': '0,78',
    Rendement: 'IE3 · 80,7 %',
    Pôles: '4',
    Classe: 'F · IP 55',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + PE, 50 Hz, arrivée sur bornier X1' },
    { k: 'Variateur', v: 'Altivar ATV320U07N4B · 0,75 kW · 380-500 V triphasé · sortie 0,1 à 599 Hz' },
    { k: 'Force motrice', v: 'moteur asynchrone triphasé 0,75 kW, 4 pôles, couplage étoile sur 400 V' },
    { k: 'Commande', v: 'TBT 24 V ~ par transformateur T1, primaire protégé par Q2 Schneider C60N C2 bipolaire PHASE / PHASE (bornes 1-3 / 2-4, pas de neutre), secondaire par Q3 Schneider C60N C2 PHASE + NEUTRE : le pôle protégé coupe le 24 V, le pôle neutre sectionne le 0 V. Les deux conducteurs de la commande s\'ouvrent d\'un seul geste.' },
    { k: 'Transformateur T1', v: 'Legrand 042872 · 100 VA · 50/60 Hz · classe I · IP2X · EN 61558-2-6. Primaire à prises 0 · 230 · 400, secondaire BI-TENSION livré avec ses barrettes de couplage.' },
    { k: 'Primaire de T1', v: 'trois bornes marquées 0 · 230 · 400 (la face en compte cinq, deux logements restent borgnes). Alimentation en 400 V ENTRE DEUX PHASES : raccorder sur 0 et 400, la prise 230 reste libre.' },
    { k: 'Secondaire de T1', v: 'DEUX enroulements de 24 V, quatre bornes marquées 0 · 0 · 24 · 24 (0a · 0b · 24a · 24b au simulateur) et une borne de terre. Pour 24 V : deux barrettes, 0a-0b et 24a-24b — les enroulements sont en PARALLÈLE. Pour 48 V il n\'en faudrait qu\'une, 0b-24a, en SÉRIE. Dans les deux cas la sortie se prend sur 0a et 24b.' },
    { k: 'Calibre de Q3', v: 'le circuit de commande appelle environ 0,4 A (bobine 24 V et deux voyants) : un calibre 2 A protège le 1,5 mm² sans déclencher. À ne pas confondre avec le fusible gravé sur T1 — T4A en 24 V — qui, lui, protège le transformateur et non le départ.' },
    { k: 'Contacteur de ligne', v: 'KM1 alimente le variateur. Moins d\'UNE manœuvre par minute : ce n\'est pas lui qui sert à démarrer et arrêter la machine au quotidien.' },
    { k: 'Ordre de marche', v: 'LI1 reçoit le 24 V du VARIATEUR (borne +24) par le contact auxiliaire 53-54 de KM1. Ne jamais mélanger ce 24 V avec celui de T1 : ce sont deux sources distinctes.' },
    { k: 'Sortie moteur', v: 'câble blindé, blindage repris à la terre aux DEUX extrémités. AUCUN organe de coupure entre le variateur et le moteur.' },
    { k: 'Protection de tête', v: 'Q1 disjoncteur moteur magnétothermique GV2ME08, réglé sur le courant de LIGNE du variateur, soit 3,6 A. Un seul appareil pour trois fonctions : sectionnement cadenassable, protection contre les courts-circuits (magnétique) et contre les surcharges de la ligne (thermique). Il remplace à lui seul le sectionneur porte-fusibles et le relais thermique d\'une platine classique.' },
    { k: 'Protection du moteur', v: 'AUCUN relais thermique en sortie. Le thermique de Q1 ne voit que l\'entrée du variateur ; le moteur est protégé par le paramètre ItH, réglé à In = 1,9 A, qui assure la protection I²t.' },
    { k: 'Bus continu', v: 'après coupure : attendre 15 minutes, puis vérifier moins de 42 V continus entre PA/+ et PC/− avant d\'intervenir.' },
    { k: 'Rail 1', v: 'Q1 disjoncteur moteur · Q2 · Q3 · T1' },
    { k: 'Rail 2', v: 'KM1 (avec bloc de contacts auxiliaires) · U1 variateur' },
    { k: 'Rail 3', v: 'X1 bornier puissance · X2 bornier commande (7 bornes)' },
    { k: 'Pupitre', v: 'S0 arrêt d\'urgence à verrouillage · S1 arrêt · S2 marche · H1 voyant incolore « sous tension » · H2 voyant blanc « variateur prêt », piloté par le relais R1' },
    { k: 'Paramétrage', v: 'bFr 50 · nPr 0,75 · UnS 400 · nCr 1,9 · FrS 50 · nSP 1395 · ItH 1,9 · ACC 5 · dEC 5 · LSP 10 · HSP 50' },
    { k: 'Avant mise en service', v: 'consignation sur Q1 · VAT · décharge du bus continu · continuité PE · isolement 500 V côté moteur seulement, JAMAIS sur les bornes du variateur' },
  ],
  pupitre: [
    { rep: 'H1', kind: 'lamp', color: 'clear', signals: 'ctl', label: 'voyant incolore · armoire sous tension' },
    { rep: 'H2', kind: 'lamp', color: 'white', signals: 'run', label: 'voyant blanc · variateur prêt (relais R1 fermé)' },
    { rep: 'S0', kind: 'nc', color: 'red', latching: true, label: 'arrêt d\'urgence à verrouillage · coupe le contacteur de ligne' },
    { rep: 'S1', kind: 'nc', color: 'red', label: 'arrêt du convoyeur' },
    { rep: 'S2', kind: 'no', color: 'green', label: 'marche du convoyeur' },
  ],
  postes: [
    {
      id: 'u1',
      name: 'U1 · Variateur de vitesse',
      need: 'Faire varier la vitesse d\'un moteur asynchrone de 0,75 kW alimenté en 3 × 400 V',
      options: [
        { key: 'atv320', ref: 'ATV320U07N4B', spec: '0,75 kW · 380-500 V triphasé · format book', ok: true, why: 'Calibre et tension conformes, et c\'est l\'appareil de la progression de l\'établissement. Sa protection I²t remplace le relais thermique.' },
        { key: 'atv320', ref: 'ATV312H075N4', spec: '0,75 kW · 380-500 V triphasé', half: true, why: 'Électriquement équivalent et les paramètres portent les mêmes noms, mais l\'ATV312 est arrêté commercialement depuis décembre 2017 : il est remplacé par l\'ATV320.' },
        { key: 'atv320', ref: 'ATV320U07M2C', spec: '0,75 kW · 200-240 V monophasé', why: 'Alimentation monophasée 230 V : elle ne correspond pas au réseau triphasé 400 V de l\'atelier.' },
      ],
    },
    {
      id: 'q1',
      name: 'Q1 · Protection et sectionnement de tête',
      need: 'Sectionner la platine et protéger l\'alimentation du variateur, qui appelle 3,6 A en ligne sous 380 V',
      options: [
        { key: 'motorcb', ref: 'GV2ME08 réglé à 3,6 A', spec: 'disjoncteur moteur magnétothermique · plage 2,5 – 4 A · Icc 100 kA', ok: true, why: 'Un disjoncteur moteur réunit dans un seul appareil ce qui demandait autrefois deux organes : le déclencheur magnétique remplace le sectionneur porte-fusibles, le déclencheur thermique remplace le relais thermique — et il est cadenassable, donc consignable. Réglé sur le courant de LIGNE du variateur (3,6 A), il protège le câble d\'alimentation.' },
        { key: 'motorcb', ref: 'GV2ME08 réglé à 1,9 A', spec: 'réglé sur le courant du moteur', why: 'La faute classique. Le thermique de Q1 mesure ce qui entre dans le VARIATEUR, pas ce qui sort vers le moteur : 3,6 A d\'un côté, 1,9 A de l\'autre. Réglé à 1,9 A il déclencherait en pleine charge. Le moteur, lui, est protégé par le paramètre ItH.' },
        { key: 'motorcb', ref: 'GV2L08', spec: 'disjoncteur moteur magnétique SEUL · Irm 51 A', half: true, why: 'C\'est la référence du tableau des associations du guide d\'installation ATV320, où seul un dispositif de protection contre les courts-circuits est exigé. Elle convient, mais sans déclencheur thermique elle ne protège pas le câble d\'alimentation contre une surcharge.' },
      ],
    },
    {
      id: 'km1',
      name: 'KM1 · Contacteur de ligne',
      need: 'Alimenter le variateur, et fournir un contact auxiliaire libre pour l\'ordre de marche LI1',
      options: [
        { key: 'kontaktaux', ref: 'LC1D09B7 + LADN11', spec: '9 A AC-3 · bobine 24 V~ · contact additif 53-54', ok: true, why: 'Bobine 24 V accordée au secondaire de T1, et le bloc additif donne un contact 53-54 INDÉPENDANT de l\'auto-maintien 13-14 : les deux 24 V ne se mélangent pas.' },
        { key: 'kontaktaux', ref: 'LC1D09B7 seul', spec: '9 A AC-3 · bobine 24 V~ · 1 NO 13-14', why: 'Un seul contact auxiliaire, déjà pris par l\'auto-maintien. Câbler LI1 sur la borne 14 mettrait en commun le 24 V du transformateur et celui du variateur.' },
        { key: 'kontaktaux', ref: 'LC1D09P7 + LADN11', spec: 'bobine 230 V~', why: 'Bobine 230 V alors que la commande est en TBT 24 V : le contacteur ne collera jamais.' },
      ],
    },
    {
      id: 't1',
      name: 'T1 · Transformateur de commande',
      need: 'Abaisser 400 V en 24 V pour la bobine de KM1 et les deux voyants',
      options: [
        { key: 'trafoleg', ref: 'Legrand 042872', spec: '100 VA · primaire 230/400 V · secondaire bi-tension 24/48 V', ok: true, why: 'C\'est le transformateur de la platine de l\'établissement. Primaire pris entre deux phases sur 0 et 400 ; secondaire à DEUX enroulements de 24 V, qu\'on couple en parallèle avec les deux barrettes livrées. 100 VA sont largement suffisants pour une bobine et deux voyants.' },
        { key: 'trafoleg', ref: 'Legrand 042857', spec: '100 VA · secondaire 24 V seulement', half: true, why: 'Fonctionne et évite l\'erreur de couplage, puisqu\'il n\'y a qu\'un secondaire. Mais ce n\'est pas l\'appareil du plateau, et l\'élève n\'apprendrait pas à poser des barrettes de couplage.' },
        { key: 'trafoleg', ref: 'Legrand 042842', spec: '100 VA · secondaire 12/24 V', why: 'Secondaire 12/24 V : mal couplé il donne 12 V, et le contacteur ne collera pas. Le cahier des charges demande 24 V sûrs.' },
      ],
    },
    {
      id: 'protection-moteur',
      name: 'Protection du moteur',
      need: 'Protéger un moteur de 0,75 kW alimenté par un variateur',
      options: [
        { key: 'atv320', ref: 'Paramètre ItH réglé à 1,9 A', spec: 'protection I²t interne au variateur', ok: true, why: 'Le courant de sortie d\'un variateur n\'est pas sinusoïdal et sa fréquence varie : seul le variateur sait le mesurer. Le moteur doit rester entre 20 % et 115 % du calibre de l\'appareil.' },
        { key: 'therm', ref: 'LRD07 en sortie du variateur', spec: 'relais thermique 1,6 – 2,5 A', why: 'Un bilame mesure une valeur efficace sinusoïdale à 50 Hz. Sur la sortie d\'un onduleur MLI il déclenche à tort ou ne déclenche pas du tout — et il ajoute un organe de coupure là où il est interdit d\'en mettre.' },
        { key: 'motorcb', ref: 'GV2ME entre variateur et moteur', spec: 'disjoncteur moteur magnétothermique', why: 'Même faute, en pire : ouvrir en charge la sortie de l\'onduleur détruit les transistors de puissance.' },
      ],
    },
    {
      id: 'f3',
      name: 'Q3 · Protection et sectionnement du 24 V',
      need: 'Protéger le circuit de commande 24 V — bobine et deux voyants, environ 0,4 A — et pouvoir le sectionner',
      options: [
        { key: 'mcb1pn', ref: 'Schneider C60N 1P+N C2', spec: 'disjoncteur phase + neutre · 2 A · courbe C · 1 module', ok: true, why: 'Le pôle protégé coupe le 24 V, le pôle neutre sectionne le 0 V : les deux conducteurs de la commande s\'ouvrent d\'un seul geste. 2 A protègent le 1,5 mm² sans déclencher sur les 0,4 A du circuit.' },
        { key: 'mcb1p', ref: 'Schneider C60N 1P C2', spec: 'disjoncteur unipolaire · 2 A', half: true, why: 'Protège bien le conducteur actif, mais ne sectionne pas le 0 V : pour intervenir il reste un conducteur raccordé au secondaire du transformateur.' },
        { key: 'fuse1pn', ref: 'Merlin Gerin Multi 9 STI 10,3 × 38', spec: 'sectionneur porte-fusibles phase + neutre · cartouche 4 A', half: true, why: 'Protège et sectionne les deux conducteurs, et c\'est un appareil qu\'on rencontre sur les platines d\'atelier. Mais une cartouche ne se réarme pas : elle fond, on la remplace, et le dépannage s\'en trouve rallongé.' },
      ],
    },
    {
      id: 'x',
      name: 'X1 / X2 · Borniers et câble moteur',
      need: 'X1 : réseau et départ moteur ; X2 : commande vers le pupitre',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE + câble moteur blindé', spec: 'bornes 2,5 mm² · câble 4 G 1,5 blindé', ok: true, why: 'Le blindage du câble moteur, repris à la terre aux deux extrémités, canalise les courants de mode commun engendrés par la commutation de l\'onduleur.' },
        { key: 'termgrey', ref: 'UT 2,5 + câble moteur non blindé', spec: 'câble U-1000 R2V 4 G 1,5', why: 'Sans blindage, le câble moteur rayonne : perturbations sur les appareils voisins et non-conformité à la directive CEM.' },
        { key: 'termgrey', ref: 'Dominos', spec: 'connecteurs à vis', why: 'Interdit en armoire : bornes sur rail obligatoires.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur moteur GV2ME08', key: 'motorcb', rail: 0, x: 46, rep: 'Q1' },
    { id: 'f2', label: 'Q2 · Primaire T1', key: 'mcb2ph', rail: 0, x: 140, rep: 'Q2' },
    { id: 'f3', label: 'Q3 · Disjoncteur phase + neutre 2 A', key: 'mcb1pn', rail: 0, x: 200, rep: 'Q3' },
    { id: 't1', label: 'T1 · Transformateur Legrand 100 VA · 230-400 / 24-48 V', key: 'trafoleg', rail: 0, x: 240, rep: 'T1' },
    { id: 'km1', label: 'KM1 · Contacteur de ligne', key: 'kontaktaux', rail: 1, x: 46, rep: 'KM1' },
    { id: 'u1', label: 'U1 · Variateur ATV320', key: 'atv320', rail: 1, x: 150, rep: 'U1' },
    ...X1(46),
    ...X2B,
  ],
  annexItems: [],
  recvItems: [],
  liaisons: [
    // ---- puissance : réseau → Q1 → KM1 → variateur → moteur ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    L('km1.2', 'u1.R/L1', 'L1'), L('km1.4', 'u1.S/L2', 'L2'), L('km1.6', 'u1.T/L3', 'L3'),
    L('u1.U/T1', 'x1_6.a', 'L1'), L('u1.V/T2', 'x1_7.a', 'L2'), L('u1.W/T3', 'x1_8.a', 'L3'),
    // ---- terre : première borne câblée, masse du variateur comprise ----
    L('x1_5.a', 'x1_9.a', 'PE'), L('x1_5.a', 'u1.PE', 'PE'),
    // ---- alimentation TBT : deux phases en aval de Q1 → Q2 → T1 → Q3 ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.3', 'L2'),
    L('f2.2', 't1.400', 'L1'), L('f2.4', 't1.0', 'L2'),
    // Secondaire bi-tension : DEUX barrettes de couplage mettent les deux
    // enroulements de 24 V en PARALLÈLE. Une seule barrette 0b-24a les mettrait
    // en série et donnerait 48 V — la bobine de KM1 n'y survivrait pas.
    L('t1.0a', 't1.0b', 'BAR'), L('t1.24a', 't1.24b', 'BAR'),
    L('t1.24b', 'f3.1', 'C'),
    L('t1.0a', 'f3.N', 'C0'), L('f3.N2', 'x2_4.a', 'C0'), L('x2_4.a', 'x1_5.a', 'PE'),
    L('t1.PE', 'x1_5.a', 'PE'),
    // ---- commande 24 V : chaîne d'arrêt, auto-maintien, bobine ----
    L('f3.2', 'x2_1.a', 'C'), L('f3.2', 'x2_5.a', 'C'),
    L('x2_2.a', 'km1.13', 'C'), L('x2_3.a', 'km1.A1', 'C'), L('km1.14', 'km1.A1', 'C'),
    L('km1.A2', 'x2_4.a', 'C0'),
    // ---- ordre de marche : 24 V DU VARIATEUR, par le contact additif 53-54 ----
    // Circuit séparé de celui de T1 : c'est pour cela qu'il faut un second contact.
    L('u1.+24', 'km1.53', 'DC+'), L('km1.54', 'u1.LI1', 'DC+'),
    // ---- signalisation : relais de défaut R1 du variateur → voyant H2 ----
    L('f3.2', 'u1.R1A', 'C'), L('u1.R1C', 'x2_6.a', 'C'),
    // ---- pupitre déporté ----
    L('x2_1.b', 'S0.21', 'C', 'door'), L('S0.22', 'S1.21', 'C', 'door'),
    L('S1.22', 'S2.13', 'C', 'door'), L('S1.22', 'x2_2.b', 'C', 'door'),
    L('S2.14', 'x2_3.b', 'C', 'door'),
    L('x2_5.b', 'H1.X1', 'C', 'door'), L('x2_4.b', 'H1.X2', 'C0', 'door'),
    L('x2_6.b', 'H2.X1', 'C', 'door'), L('x2_4.b', 'H2.X2', 'C0', 'door'),
    // ---- barrettes de couplage : étoile sur 400 V, d'après la plaque ----
    L('M.W2', 'M.U2', 'BAR'), L('M.U2', 'M.V2', 'BAR'),
    // ---- arrivée réseau et câble moteur blindé ----
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
    // disjoncteur de tête
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'L2', live: 'always' }, 'q1.5': { net: 'L3', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'L2', live: 'q1' }, 'q1.6': { net: 'L3', live: 'q1' },
    // contacteur de ligne
    'km1.1': { net: 'L1', live: 'q1' }, 'km1.3': { net: 'L2', live: 'q1' }, 'km1.5': { net: 'L3', live: 'q1' },
    'km1.2': { net: 'VAR1', live: 'run' }, 'km1.4': { net: 'VAR2', live: 'run' }, 'km1.6': { net: 'VAR3', live: 'run' },
    'km1.13': { net: 'C', live: 'ctl' }, 'km1.14': { net: 'C', live: 'km1' },
    // contact additif : 24 V DU VARIATEUR, réseau à part
    'km1.53': { net: 'P24', live: 'run' }, 'km1.54': { net: 'LI1', live: 'km1' },
    'km1.A1': { net: 'C', live: 'km1' }, 'km1.A2': { net: 'C0', live: 'always' },
    // variateur
    'u1.R/L1': { net: 'VAR1', live: 'run' }, 'u1.S/L2': { net: 'VAR2', live: 'run' }, 'u1.T/L3': { net: 'VAR3', live: 'run' },
    'u1.U/T1': { net: 'U', live: 'run' }, 'u1.V/T2': { net: 'V', live: 'run' }, 'u1.W/T3': { net: 'W', live: 'run' },
    'u1.PE': { net: 'PE', live: 'always' },
    'u1.PA+': { net: 'BUS+', live: 'run' }, 'u1.PC-': { net: 'BUS-', live: 'run' },
    'u1.+24': { net: 'P24', live: 'run' }, 'u1.COM': { net: 'P0', live: 'run' },
    'u1.LI1': { net: 'LI1', live: 'km1' }, 'u1.LI2': { net: 'LI2', live: 'run' },
    'u1.AI1': { net: 'AI1', live: 'run' },
    'u1.R1A': { net: 'C', live: 'ctl' }, 'u1.R1C': { net: 'C', live: 'ctl' },
    // protection du primaire (Q2)
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.3': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.4': { net: 'L2', live: 'f2' },
    // transformateur de commande : chaque prise libre a son propre réseau
    't1.400': { net: 'L1', live: 'f2' }, 't1.0': { net: 'L2', live: 'f2' },
    't1.230': { net: 'TAP-PRI-230', live: 'f2' },
    't1.24a': { net: 'C', live: 'f2' }, 't1.24b': { net: 'C', live: 'f2' },
    't1.0a': { net: 'C0', live: 'always' }, 't1.0b': { net: 'C0', live: 'always' },
    't1.PE': { net: 'PE', live: 'always' },
    // protection du secondaire (Q3)
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    'f3.N': { net: 'C0', live: 'always' }, 'f3.N2': { net: 'C0', live: 'always' },
    // bornier de commande X2
    'x2_1.a': { net: 'C', live: 'ctl' }, 'x2_1.b': { net: 'C', live: 'ctl' },
    'x2_2.a': { net: 'C', live: 'ctl' }, 'x2_2.b': { net: 'C', live: 'ctl' },
    'x2_3.a': { net: 'C', live: 'ctl' }, 'x2_3.b': { net: 'C', live: 'ctl' },
    'x2_4.a': { net: 'C0', live: 'always' }, 'x2_4.b': { net: 'C0', live: 'always' },
    'x2_5.a': { net: 'C', live: 'ctl' }, 'x2_5.b': { net: 'C', live: 'ctl' },
    'x2_6.a': { net: 'C', live: 'ctl' }, 'x2_6.b': { net: 'C', live: 'ctl' },
    'x2_7.a': { net: 'RES-X2', live: 'ctl' }, 'x2_7.b': { net: 'RES-X2', live: 'ctl' },
    // moteur et pupitre
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S0.21': { net: 'C', live: 'ctl' }, 'S0.22': { net: 'C', live: 'ctl' },
    'S1.21': { net: 'C', live: 'ctl' }, 'S1.22': { net: 'C', live: 'ctl' },
    'S2.13': { net: 'C', live: 'ctl' }, 'S2.14': { net: 'C', live: 'ctl' },
    'H1.X1': { net: 'C', live: 'ctl' }, 'H1.X2': { net: 'C0', live: 'always' },
    'H2.X1': { net: 'C', live: 'ctl' }, 'H2.X2': { net: 'C0', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'bus',
      title: 'Décharge du bus continu',
      how: 'Après ouverture de Q1, attendre 15 minutes, puis mesurer en tension continue entre PA/+ et PC/− du variateur. Ne JAMAIS court-circuiter ces deux bornes pour « décharger plus vite ».',
      expected: 'moins de 42 V continus avant toute intervention',
    },
    {
      id: 'iso',
      title: 'Isolement — et ce qu\'il ne faut pas mesurer',
      how: 'Isolement 500 V entre chaque phase du MOTEUR et sa carcasse, câble moteur débranché du variateur. Ne jamais appliquer la tension d\'essai sur les bornes du variateur : elle détruirait les composants électroniques.',
      expected: '> 0,5 MΩ côté moteur · aucune mesure sur U1',
    },
    {
      id: 'ordre',
      title: 'Continuité de l\'ordre de marche',
      how: 'Multimètre en Ω entre la borne +24 du variateur et LI1, KM1 enfoncé à la main : le chemin passe par le contact additif 53-54.',
      expected: '≈ 0 Ω contacteur enfoncé · circuit ouvert au repos',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du PE jusqu\'à la carcasse moteur', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'M.PE', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement U1 / PE du moteur sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'M.U1', b: 'M.PE', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'renr', title: 'Résistance de l\'enroulement U (U1 – U2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.U2', min: 6, max: 26, unit: 'Ω',
    },
    {
      id: 'u400', title: 'Tension composée en aval de Q1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'run',
    },
    {
      id: 'u24', title: 'Tension de commande en sortie du couplage de T1 (0a – 24b)', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 't1.24b', b: 't1.0a', min: 22, max: 26, unit: 'V', when: 'ctl',
    },
    {
      id: 'iL', title: 'Courant de ligne à la pince (KM1:2 → U1 R/L1)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>u1.R/L1', min: 0.8, max: 2.6, unit: 'A', when: 'run',
    },
    {
      id: 'n', title: 'Vitesse de rotation au tachymètre, consigne HSP = 50 Hz', stage: 'sousTension',
      instrument: 'tach', dial: 'tr/min', min: 1300, max: 1450, unit: 'tr/min', when: 'run',
    },
  ],
  faults: [
    {
      id: 'a2', title: 'Fil A2 de la bobine KM1 desserré',
      symptom: 'KM1 vibre et ne tient pas à l\'appui sur S2, le variateur ne s\'allume pas.',
      fix: 'Resserrer A2 et refaire la continuité A2 – X2:4.',
      coupe: 'km1.A2>x2_4.a', action: 'Resserrer le fil sur A2 et contrôler la continuité jusqu\'au 0 V',
    },
    {
      id: 'x2', title: 'Fil X2:3 → KM1 A1 débranché',
      symptom: 'Rien ne se passe à l\'appui sur S2, pourtant 24 V sont bien présents sur X2:3.',
      fix: 'Reconnecter X2:3 sur la borne A1 de KM1.',
      coupe: 'x2_3.a>km1.A1', action: 'Reconnecter le fil de X2:3 sur la borne A1 de KM1',
    },
    {
      id: 's1', title: 'Contact d\'arrêt S1 resté ouvert',
      symptom: 'Rien ne se passe à l\'appui sur S2, H1 est pourtant allumé et aucun arrêt n\'est actionné.',
      fix: 'Contrôler puis remplacer le contact NC 21-22 de S1.',
      ouvre: 'S1', action: 'Remplacer le contact à ouverture 21-22 du bouton d\'arrêt',
    },
    {
      id: 'l2', title: 'Phase V coupée entre le variateur et X1:7',
      symptom: 'Le moteur ronfle sans démarrer et le variateur finit par signaler un défaut de sortie.',
      fix: 'Refaire la liaison U1 V/T2 → X1:7, puis acquitter le défaut du variateur.',
      coupe: 'u1.V/T2>x1_7.a', action: 'Refaire la liaison U1 V/T2 → X1:7 et acquitter le défaut',
    },
    {
      id: 'f3', title: 'Q3 déclenché (défaut sur le 24 V)',
      symptom: 'H1 éteint alors que Q1 est fermé, 0 V sur tout le bornier X2, 24 V au secondaire de T1.',
      fix: 'Chercher le défaut d\'isolement du circuit 24 V, puis réarmer Q3. Réarmer sans chercher, c\'est provoquer un second déclenchement.',
      ouvre: 'f3', action: 'Chercher le défaut d\'isolement du 24 V, puis réarmer Q3',
    },
  ],
  quiz: [
    {
      q: 'Pourquoi ne met-on pas de relais thermique entre le variateur et le moteur ?',
      options: [
        'Parce qu\'il coûte trop cher',
        'Parce que le courant de sortie n\'est ni sinusoïdal ni à fréquence fixe, et parce qu\'aucun organe de coupure n\'est admis à cet endroit',
        'Parce que le moteur ne peut pas être en surcharge avec un variateur',
      ],
      answer: 1,
    },
    {
      q: 'Après avoir ouvert Q1, au bout de combien de temps peut-on intervenir sur les bornes du variateur, et que doit-on vérifier ?',
      options: [
        'Tout de suite, la coupure suffit',
        'Après 15 minutes, en vérifiant moins de 42 V continus entre PA/+ et PC/−',
        'Après 1 minute, en court-circuitant PA/+ et PC/− pour décharger',
      ],
      answer: 1,
    },
    {
      q: 'L\'entrée logique LI1 est alimentée en 24 V. D\'où doit venir ce 24 V ?',
      options: [
        'Du secondaire du transformateur T1',
        'De la borne +24 du variateur lui-même',
        'De n\'importe laquelle des deux sources, elles font toutes les deux 24 V',
      ],
      answer: 1,
    },
    {
      q: 'Le moteur porte 0,75 kW · 400 V Y · 1,9 A · 1395 tr/min. Quelle valeur entres-tu dans le paramètre ItH ?',
      options: ['0,75', '1,9', '400'],
      answer: 1,
    },
    {
      q: 'Le moteur appelle 1,9 A, le variateur appelle 3,6 A en ligne. Sur quelle valeur règles-tu le thermique du disjoncteur moteur Q1 ?',
      options: [
        '1,9 A, le courant du moteur',
        '3,6 A, le courant de ligne du variateur — c\'est le seul courant que Q1 traverse',
        'La moyenne des deux',
      ],
      answer: 1,
    },
    {
      q: 'Le secondaire de T1 porte deux enroulements de 24 V. Quelles barrettes poses-tu pour obtenir 24 V ?',
      options: [
        'Une seule, entre 0b et 24a',
        'Deux : 0a-0b et 24a-24b — les enroulements sont mis en parallèle',
        'Aucune, les 24 V sont déjà disponibles',
      ],
      answer: 1,
    },
    {
      q: 'Tu poses une seule barrette, entre 0b et 24a. Que mesures-tu entre 0a et 24b, et qu\'arrive-t-il à la bobine ?',
      options: [
        '24 V, rien de particulier',
        '48 V : les enroulements sont en série, la bobine reçoit le double de sa tension assignée et finit par griller',
        '0 V, le circuit est ouvert',
      ],
      answer: 1,
    },
    {
      q: 'Quelles fonctions un disjoncteur moteur réunit-il dans un seul appareil ?',
      options: [
        'La commande et la signalisation',
        'Le sectionnement cadenassable, la protection contre les courts-circuits et la protection contre les surcharges — ce que faisaient le sectionneur porte-fusibles et le relais thermique',
        'La variation de vitesse et la protection',
      ],
      answer: 1,
    },
    {
      q: 'Dans ce montage, l\'arrêt du convoyeur ouvre le contacteur de ligne. Quel type d\'arrêt obtient-on ?',
      options: [
        'Un arrêt sur la rampe de décélération dEC',
        'Un arrêt en roue libre, catégorie 0 : le moteur n\'est plus alimenté et s\'arrête sur son inertie',
        'Un arrêt par injection de courant continu',
      ],
      answer: 1,
    },
    {
      q: 'Combien de manœuvres par minute le contacteur de ligne d\'un variateur peut-il faire au maximum ?',
      options: ['autant qu\'on veut', 'moins d\'une', 'une dizaine'],
      answer: 1,
    },
  ],
  motor: { P: 750, U: 400, In: 1.9, n: 1395, ns: 1500, cosPhi: 0.78 },
  // Legrand 042872 : 100 VA, primaire à prises 0 · 230 · 400, secondaire
  // BI-TENSION à deux enroulements de 24 V et barrettes de couplage.
  trafo: {
    slot: 't1',
    reseau: 400,
    primaire: { '0': 0, '230': 230, '400': 400 },
    secondaire: { '0a': 0, '0b': 0, '24a': 24, '24b': 24 },
    enroulements: [
      { bornes: ['0a', '24a'], u: 24 },
      { bornes: ['0b', '24b'], u: 24 },
    ],
    sortie: ['0a', '24b'],
    bobine: 24,
  },
  // Paramètres de mise en service entrés par l'élève sur l'afficheur du variateur.
  // La consigne de vitesse est donnée par HSP : pas de potentiomètre sur AI1 dans
  // cette première version, l'entrée analogique reste libre.
  variateur: { slot: 'u1', frs: 50, lsp: 10, hsp: 50, acc: 5, dec: 5 },
  folio: {
    railHaut: '24 V — secondaire de T1',
    railBas: 'com — retour 0 V, relié à la terre',
    source: 't1.24b', repSource: 'T1:24b',
    retour: 't1.0a', repRetour: 'T1:0a',
    tete: {
      type: 'disjoncteur', a: 'f3.1', b: 'f3.2',
      rep: 'Q3', legende: 'pôle protégé · 2 A courbe C', conducteur: '2',
    },
    // Q3 est un PHASE + NEUTRE : son second pôle sectionne le 0 V. Sans ce
    // dessin, l'élève croirait le retour raccordé en permanence au secondaire.
    pied: {
      type: 'disjoncteur', a: 'f3.N', b: 'f3.N2',
      rep: 'Q3', legende: 'pôle neutre · sectionnement du 0 V',
    },
    colonnes: [
      {
        id: 'chaine', dx: 0,
        elements: [
          { type: 'borne', a: 'x2_1.a', rep: 'X2:1' },
          { type: 'contactNF', a: 'S0.21', b: 'S0.22', rep: 'S0', bornes: ['21', '22'],
            actionneur: 'champignon', legende: 'arrêt d\'urgence', conducteur: '3' },
          { type: 'contactNF', a: 'S1.21', b: 'S1.22', rep: 'S1', bornes: ['21', '22'],
            actionneur: 'poussoir', legende: 'arrêt', conducteur: '4' },
          { type: 'contactNO', a: 'S2.13', b: 'S2.14', rep: 'S2', bornes: ['13', '14'],
            actionneur: 'poussoir', legende: 'marche', conducteur: '5' },
          { type: 'borne', a: 'x2_3.a', rep: 'X2:3' },
          { type: 'bobine', a: 'km1.A1', b: 'km1.A2', rep: 'KM1', legende: 'bobine 24 V · contacteur de ligne' },
          { type: 'borne', a: 'x2_4.a', rep: 'X2:4' },
        ],
      },
      {
        id: 'voyant', dx: -1,
        elements: [
          { type: 'borne', a: 'x2_5.a', rep: 'X2:5' },
          { type: 'fil', a: 'x2_5.a', b: 'H1.X1', h: 170 },
          { type: 'voyant', a: 'H1.X1', b: 'H1.X2', rep: 'H1', legende: 'incolore · sous tension' },
        ],
      },
      {
        id: 'pret', dx: -2,
        elements: [
          { type: 'contactNO', a: 'u1.R1A', b: 'u1.R1C', rep: 'U1', bornes: ['R1A', 'R1C'],
            legende: 'relais de défaut R1 du variateur' },
          { type: 'borne', a: 'x2_6.a', rep: 'X2:6' },
          { type: 'voyant', a: 'H2.X1', b: 'H2.X2', rep: 'H2', legende: 'blanc · variateur prêt' },
        ],
      },
      {
        id: 'maintien', dx: 1, depuis: 'S1.22', vers: 'km1.A1',
        elements: [
          { type: 'borne', a: 'x2_2.a', rep: 'X2:2' },
          { type: 'contactNO', a: 'km1.13', b: 'km1.14', rep: 'KM1', bornes: ['13', '14'],
            legende: 'auto-maintien' },
        ],
      },
    ],
    cadres: [
      { titre: 'Pupitre (en porte)', de: 'S0.21', a: 'S2.14',
        couleur: 'porte', colonnes: ['chaine', 'voyant', 'pret'] },
    ],
  },
  station: true,
  hasMotor: true,
};
