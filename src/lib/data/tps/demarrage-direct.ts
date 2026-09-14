/**
 * TP · Démarrage direct un sens de marche (platine industrielle, commande 24 V).
 * Liaisons, borniers et table des réseaux portés de `docs/reference/illustration-v3.tpl.html`
 * (`TPS[0]`, `LIAIS`, `netOf`).
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, POSTE_T1_OPTIONS, TRAFO_REF, X1, X2, liaisonsT1, netsT1 } from './common';

export const TP_DEMARRAGE_DIRECT: TpDefinition = {
  id: 'demarrage-direct',
  title: 'Démarrage direct un sens de marche',
  level: '1re Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Ventilateur d\'extraction 1,5 kW. Q1 GV2 + KM1 LC1D bobine 24 V + F1 LRD, commande 24 V par transformateur T1 400/24 V, boîte à boutons et voyants en porte, borniers X1 / X2.',
  situation:
    'L\'atelier de soudure du lycée est équipé d\'un extracteur d\'air entraîné par un moteur asynchrone triphasé. Tu dois réaliser dans l\'armoire le départ moteur en démarrage direct, un seul sens de marche, avec une commande en très basse tension 24 V, des boutons marche / arrêt et une signalisation marche / défaut dans le coffret de porte, puis mettre l\'ensemble en service.',
  plaque: {
    P: '1,5 kW',
    U: '400 V Y · 50 Hz',
    In: '3,3 A',
    n: '1440 tr/min',
    'cos φ': '0,80',
    Pôles: '4',
    Classe: 'F · IP 55',
    Service: 'S1 continu',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE, arrivée sur bornier X1' },
    { k: 'Commande', v: '24 V~ par le transformateur T1 Legrand 042872 (100 VA, primaire à prises 0 · 230 · 400, secondaire bi-tension), protégé par F2 au primaire et F3 au secondaire' },
    { k: 'Primaire de T1', v: 'alimentation en 400 V ENTRE DEUX PHASES : raccorder sur 0 et 400, la prise 230 reste libre.' },
    { k: 'Secondaire de T1', v: 'DEUX enroulements de 24 V, bornes 0 · 0 · 24 · 24 (0a · 0b · 24a · 24b au simulateur) et une borne de terre. Pour 24 V : deux barrettes, 0a-0b et 24a-24b, enroulements en PARALLÈLE. Une seule barrette 0b-24a les mettrait en SÉRIE et donnerait 48 V. La sortie se prend sur 0a et 24b.' },
    { k: 'F3', v: 'disjoncteur PHASE + NEUTRE : le pôle protégé coupe le 24 V, le pôle neutre sectionne le 0 V. Les deux conducteurs de la commande s\'ouvrent d\'un seul geste.' },
    { k: 'Platine', v: '3 rails DIN · coffret de porte XALD' },
    { k: 'Rail 1', v: 'Q1 · KM1 · F1' },
    { k: 'Rail 2', v: 'F2 · T1 · F3' },
    { k: 'Rail 3', v: 'X1 bornier puissance (9 bornes) · X2 bornier commande (6 bornes)' },
    { k: 'Porte', v: 'H1 marche · H2 défaut · S2 marche NO · S1 arrêt NC, raccordés sur X2' },
    { k: 'Protection moteur', v: 'GV2 magnéto-thermique réglé à In + relais thermique classe 10' },
    { k: 'Auto-maintien', v: 'contact KM1 13-14' },
    { k: 'Défaut thermique', v: 'F1 95-96 coupe la bobine, F1 97-98 allume H2' },
    { k: '0 V', v: 'point neutre du secondaire relié à la terre sur X1:5' },
    { k: 'Avant mise en service', v: 'consignation · VAT · continuité PE · isolement 500 V' },
  ],
  postes: [
    {
      id: 'q1',
      name: 'Q1 · Disjoncteur moteur',
      need: 'Protection magnéto-thermique du moteur, réglable autour de In = 3,3 A',
      options: [
        { key: 'motorcb', ref: 'GV2ME06', spec: '1 – 1,6 A', why: 'Plage trop basse : déclenchera au démarrage.' },
        { key: 'motorcb', ref: 'GV2ME08', spec: '2,5 – 4 A', ok: true, why: 'In = 3,3 A se règle dans la plage 2,5 – 4 A.' },
        { key: 'motorcb', ref: 'GV2ME14', spec: '6 – 10 A', why: 'Plage trop haute : ne protège pas le moteur.' },
      ],
    },
    {
      id: 'km1',
      name: 'KM1 · Contacteur',
      need: 'Commande de puissance, bobine alimentée par la commande 24 V',
      options: [
        { key: 'kontakt', ref: 'LC1D09P7', spec: '9 A AC-3 · bobine 230 V~', why: 'Bobine 230 V alors que la commande est en 24 V : le contacteur ne collera pas.' },
        { key: 'kontakt', ref: 'LC1D09B7', spec: '9 A AC-3 · bobine 24 V~', ok: true, why: '9 A ≥ 3,3 A et bobine 24 V~, cohérente avec le secondaire de T1.' },
        { key: 'kontakt', ref: 'LC1D32B7', spec: '32 A AC-3 · bobine 24 V~', half: true, why: 'Fonctionne, mais surdimensionné : coût, encombrement et consommation de bobine inutiles.' },
      ],
    },
    {
      id: 'f1',
      name: 'F1 · Relais thermique',
      need: 'Protection contre les surcharges, réglé à In = 3,3 A',
      options: [
        { key: 'therm', ref: 'LRD06', spec: '1 – 1,6 A', why: 'Plage trop basse : déclenchement intempestif.' },
        { key: 'therm', ref: 'LRD08', spec: '2,5 – 4 A', ok: true, why: '3,3 A se règle dans la plage, classe 10 adaptée au démarrage direct.' },
        { key: 'therm', ref: 'LRD12', spec: '5,5 – 8 A', why: 'Réglage minimal 5,5 A > In : le moteur n\'est pas protégé.' },
      ],
    },
    {
      id: 't1',
      name: 'T1 · Transformateur de commande',
      need: 'Abaisser 400 V en 24 V pour la commande (bobine 7 VA + 2 voyants)',
      options: [
        ...POSTE_T1_OPTIONS,
      ],
    },
    {
      id: 'f2',
      name: 'F2 · Protection du primaire',
      need: 'Protéger le primaire 400 V de T1 (I1 ≈ 0,16 A) et les conducteurs 1,5 mm²',
      options: [
        { key: 'mcb2ph', ref: 'Acti9 iC60N 2P C2 · A9F74202', spec: '2 A · courbe C · 2 pôles', ok: true, why: 'Bipolaire pour couper les deux phases du primaire, calibre adapté au transformateur.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · courbe C · 1 pôle', why: 'Un seul pôle coupé : la seconde phase du primaire reste sous tension.' },
        { key: 'mcb2ph', ref: 'iC60N 2P C20', spec: '20 A · courbe C', why: 'Calibre sans rapport avec le primaire : ni le transformateur ni les fils ne sont protégés.' },
      ],
    },
    {
      id: 'f3',
      name: 'F3 · Protection du secondaire',
      need: 'Protéger le circuit de commande 24 V (bobine + voyants ≈ 0,5 A)',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C2 · A9F74602', spec: '2 A · courbe C · phase + neutre', ok: true, why: 'Le pôle protégé coupe le 24 V, le pôle neutre sectionne le 0 V : les deux conducteurs de la commande s\'ouvrent d\'un seul geste, et l\'intervention se fait sur un circuit réellement isolé.' },
        { key: 'mcb1p', ref: 'Acti9 iC60N 1P C2', spec: '2 A · courbe C · 1 pôle', half: true, why: 'Protège bien, mais laisse le 0 V raccordé : on intervient sur un circuit dont un conducteur reste relié au secondaire.' },
        { key: 'mcb1p', ref: 'Acti9 iC60N 1P C16', spec: '16 A · courbe C', why: 'Trop élevé pour du 1,5 mm² de commande.' },
      ],
    },
    {
      id: 'h',
      name: 'H1 / H2 · Voyants de porte',
      need: 'Signalisation marche (vert) et défaut thermique (rouge), en 24 V',
      options: [
        { key: 'lampG', ref: 'XB4BVB3 + XB4BVB4', spec: 'vert + rouge · 230 V', why: 'Tension de commande 24 V : les voyants resteront éteints.' },
        { key: 'lampG', ref: 'XB4BVB3 + XB4BVB4 · 24 V', spec: 'vert + rouge · 24 V LED', ok: true, why: 'Bonne tension et bon code couleur (NF EN 60073 : vert = marche, rouge = défaut).' },
        { key: 'lampR', ref: 'Voyants 24 V inversés', spec: 'rouge = marche, vert = défaut', why: 'Code couleur inversé : interdit par la NF EN 60073.' },
      ],
    },
    {
      id: 'x',
      name: 'X1 / X2 · Borniers',
      need: 'X1 : arrivée réseau et départ moteur (2,5 mm²) ; X2 : liaison commande vers la porte (1,5 mm²)',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE', spec: 'bornes 2,5 mm² · PE vert-jaune · X2 en 2,5', ok: true, why: 'Sections et repérage PE conformes ; une borne 2,5 accepte le 1,5 mm² de commande.' },
        { key: 'termgrey', ref: 'UT 1,5 partout', spec: 'bornes 1,5 mm²', why: 'La puissance est en 2,5 mm² : les bornes 1,5 ne conviennent pas pour X1.' },
        { key: 'termgrey', ref: 'Dominos', spec: 'connecteurs à vis', why: 'Interdit en armoire : bornes sur rail obligatoires.' },
      ],
    },
    {
      id: 'box',
      name: 'S1 / S2 · Coffret de porte',
      need: 'Arrêt à contact NC, marche à contact NO, 2 voyants',
      options: [
        { key: 'stopstart', ref: 'XALD 4 trous', spec: 'S1 arrêt NC · S2 marche NO · H1 · H2', ok: true, why: 'Arrêt NC (sécurité positive), marche NO et emplacements pour les deux voyants.' },
        { key: 'stopstart', ref: 'XALD211', spec: '2 × NO', why: 'Arrêt NO : la coupure d\'un fil n\'arrête plus le moteur.' },
        { key: 'stopstart', ref: 'XALK178', spec: 'arrêt d\'urgence seul', why: 'Pas de bouton marche ni de signalisation.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur moteur', key: 'motorcb', rail: 0, x: 52, rep: 'Q1' },
    { id: 'km1', label: 'KM1 · Contacteur', key: 'kontakt', rail: 0, x: 125, rep: 'KM1' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 0, x: 193, rep: 'F1' },
    { id: 'f2', label: 'F2 · Primaire T1', key: 'mcb2ph', rail: 1, x: 52, rep: 'F2' },
    { id: 't1', label: 'T1 · Transformateur Legrand 100 VA · 230-400 / 24-48 V', key: 'trafoleg', rail: 1, x: 116, rep: 'T1' },
    { id: 'f3', label: 'F3 · Secondaire 24 V · phase + neutre', key: 'mcb1pn', rail: 1, x: 250, rep: 'F3' },
    ...X1(52),
    ...X2(238, 6),
  ],
  annexItems: [],
  recvItems: [],
  liaisons: [
    // ---- puissance ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),
    // ---- commande : primaire, transformateur, secondaire 24 V ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.3', 'L2'),
    ...liaisonsT1({ retour: 'x2_6.a', terre: 'x1_5.a' }),
    L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_1.a', 'C'),
    L('x2_2.a', 'km1.13', 'C'), L('x2_3.a', 'km1.A1', 'C'), L('km1.14', 'km1.A1', 'C'),
    L('x2_6.a', 'x1_5.a', 'PE'), L('km1.A2', 'x2_6.a', 'C0'),
    L('km1.14', 'x2_4.a', 'C'), L('f1.97', 'f3.2', 'C'), L('f1.98', 'x2_5.a', 'C'),
    // ---- porte : boutons et voyants ----
    L('x2_1.b', 'S1.21', 'C', 'door'), L('S1.22', 'S2.13', 'C', 'door'), L('S1.22', 'x2_2.b', 'C', 'door'),
    L('S2.14', 'x2_3.b', 'C', 'door'), L('x2_4.b', 'H1.X1', 'C', 'door'), L('x2_5.b', 'H2.X1', 'C', 'door'),
    L('x2_6.b', 'H1.X2', 'C0', 'door'), L('H1.X2', 'H2.X2', 'C0', 'door'),
    // ---- barrettes de couplage : l'élève les pose d'après la plaque (400 V → étoile) ----
    L('M.U2', 'M.V2', 'BAR'), L('M.V2', 'M.W2', 'BAR'),
    // ---- arrivée réseau et câble moteur : câblés par l'élève, comme le reste ----
    L('RES.L1', 'x1_1.b', 'L1'), L('RES.L2', 'x1_2.b', 'L2'), L('RES.L3', 'x1_3.b', 'L3'),
    L('RES.N', 'x1_4.b', 'N'), L('RES.PE', 'x1_5.b', 'PE'),
    L('x1_6.b', 'M.U1', 'L1'), L('x1_7.b', 'M.V1', 'L2'), L('x1_8.b', 'M.W1', 'L3'),
    L('x1_9.b', 'M.PE', 'PE'),
  ],
  nets: {
    // bornier de puissance
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'L2', live: 'always' }, 'x1_2.b': { net: 'L2', live: 'always' },
    'x1_3.a': { net: 'L3', live: 'always' }, 'x1_3.b': { net: 'L3', live: 'always' },
    'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
    'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
    'x1_6.a': { net: 'U', live: 'run' }, 'x1_6.b': { net: 'U', live: 'run' },
    'x1_7.a': { net: 'V', live: 'run' }, 'x1_7.b': { net: 'V', live: 'run' },
    'x1_8.a': { net: 'W', live: 'run' }, 'x1_8.b': { net: 'W', live: 'run' },
    'x1_9.a': { net: 'PE', live: 'always' }, 'x1_9.b': { net: 'PE', live: 'always' },
    // disjoncteur moteur
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
    // protection du primaire
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.3': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.4': { net: 'L2', live: 'f2' },
    // transformateur de référence (voir `netsT1` dans common.ts)
    // Le primaire est pris ENTRE DEUX PHASES sur 0 et 400 ; la prise 230 reste
    // LIBRE et porte son propre réseau : la déclarer sur le 0 V de commande la
    // rendrait équipotentielle à la terre, et une faute de câblage dessus
    // passerait inaperçue alors que c'est un court-circuit phase-terre.
    ...netsT1('f2'),
    // protection du secondaire, PHASE + NEUTRE : le pôle protégé coupe le 24 V,
    // le pôle neutre sectionne le 0 V.
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    'f3.N': { net: 'C0', live: 'always' }, 'f3.N2': { net: 'C0', live: 'always' },
    // bornier de commande
    'x2_1.a': { net: 'C', live: 'ctl' }, 'x2_1.b': { net: 'C', live: 'ctl' },
    'x2_2.a': { net: 'C', live: 'ctl' }, 'x2_2.b': { net: 'C', live: 'ctl' },
    'x2_3.a': { net: 'C', live: 'ctl' }, 'x2_3.b': { net: 'C', live: 'ctl' },
    'x2_4.a': { net: 'C', live: 'ctl' }, 'x2_4.b': { net: 'C', live: 'ctl' },
    'x2_5.a': { net: 'C', live: 'ctl' }, 'x2_5.b': { net: 'C', live: 'ctl' },
    'x2_6.a': { net: 'C0', live: 'always' }, 'x2_6.b': { net: 'C0', live: 'always' },
    // moteur et coffret de porte
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S1.21': { net: 'C', live: 'ctl' }, 'S1.22': { net: 'C', live: 'ctl' },
    'S2.13': { net: 'C', live: 'ctl' }, 'S2.14': { net: 'C', live: 'ctl' },
    // X2 des voyants : c'est le conducteur de RETOUR 0 V, pas le 24 V — l'élève doit
    // pouvoir le distinguer au repérage comme à la mesure.
    'H1.X1': { net: 'C', live: 'ctl' }, 'H1.X2': { net: 'C0', live: 'always' },
    'H2.X1': { net: 'C', live: 'ctl' }, 'H2.X2': { net: 'C0', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'cont',
      title: 'Continuité du circuit de commande',
      how: 'Multimètre en Ω entre F3:2 et KM1 A1, S2 maintenu appuyé : le chemin passe par F1 95-96, X2:1, S1, S2 et X2:3.',
      expected: '≈ 100 Ω (bobine 24 V)',
    },
    {
      id: 'renr',
      title: 'Résistance des enroulements',
      how: 'Multimètre en Ω, barrettes retirées : mesure U1–U2, puis V1–V2, puis W1–W2. Les trois valeurs doivent être égales. Entre deux enroulements différents, l\'appareil doit afficher OL.',
      expected: '3 à 6 Ω, écart < 5 % entre phases',
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
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.U2', min: 3, max: 6, unit: 'Ω',
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
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>f1.1', min: 2.5, max: 4, unit: 'A', when: 'run',
    },
    {
      id: 'n', title: 'Vitesse de rotation au tachymètre', stage: 'sousTension',
      instrument: 'tach', dial: 'tr/min', min: 1300, max: 1500, unit: 'tr/min', when: 'run',
    },
  ],
  // `coupe` / `ouvre` : ce que la panne fait au réseau, pour que le solveur du
  // circuit de commande la rende mesurable. `action` : la remise en état attendue,
  // proposée à l'élève au milieu d'autres à l'étape de dépannage.
  faults: [
    {
      id: 'a2', title: 'Fil A2 de la bobine KM1 desserré',
      symptom: 'KM1 vibre et ne tient pas à l\'appui sur S2.',
      fix: 'Resserrer A2 et refaire la continuité A2 – X2:6.',
      coupe: 'km1.A2>x2_6.a', action: 'Resserrer le fil sur A2 et contrôler la continuité jusqu\'au 0 V',
    },
    {
      id: 's1', title: 'Contact NC de S1 (21-22) resté ouvert',
      symptom: 'Rien ne se passe à l\'appui sur S2, 24 V présents sur X2:1.',
      fix: 'Remplacer le bloc de contact de S1.',
      ouvre: 'S1', action: 'Remplacer le bloc de contact du bouton d\'arrêt',
    },
    {
      id: 'l2', title: 'Phase L2 coupée entre F1 et X1:7',
      symptom: 'Le moteur ronfle, ne démarre pas, courant anormal sur L1 et L3, F1 finit par déclencher.',
      fix: 'Refaire la liaison F1:4 → X1:7 et réarmer F1.',
      coupe: 'f1.4>x1_7.a', action: 'Refaire la liaison F1:4 → X1:7 et réarmer F1',
    },
    {
      id: 'x2', title: 'Fil X2:3 → KM1 A1 débranché',
      symptom: 'Rien ne se passe à l\'appui sur S2, mais 24 V présents sur X2:3.',
      fix: 'Reconnecter X2:3 sur A1.',
      coupe: 'x2_3.a>km1.A1', action: 'Reconnecter le fil de X2:3 sur la borne A1 de KM1',
    },
    {
      id: 'f3', title: 'F3 déclenché (court-circuit sur le 24 V)',
      symptom: 'Aucun voyant, 0 V entre X2:1 et X2:6, 24 V au secondaire de T1.',
      fix: 'Chercher le défaut d\'isolement du 24 V, puis réarmer F3.',
      ouvre: 'f3', action: 'Chercher le défaut d\'isolement du 24 V, puis réarmer F3',
    },
  ],
  quiz: [
    { q: 'Quel contact assure l\'auto-maintien après relâchement de S2 ?', options: ['F1 95-96', 'KM1 13-14', 'S1 21-22'], answer: 1 },
    { q: 'Pourquoi le bouton d\'arrêt S1 est-il à contact NC ?', options: ['Pour économiser un fil', 'Pour qu\'une coupure de fil provoque l\'arrêt (sécurité positive)', 'Parce que le contacteur l\'impose'], answer: 1 },
    { q: 'Pourquoi la commande est-elle alimentée en 24 V par T1 plutôt qu\'en 400 V ?', options: ['Pour réduire le prix des fils', 'Pour limiter le risque électrique sur les organes accessibles en porte', 'Pour que le moteur démarre plus vite'], answer: 1 },
  ],
  motor: { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 },
  // Transformateur de commande de référence (Legrand 042872) : prises au primaire
  // et secondaire BI-TENSION couplé par barrettes. Le rapport de transformation est
  // fixé par les spires, donc se tromper de prise ne bloque rien — ça se paie au
  // secondaire. Voir `src/lib/sim/trafo.ts`.
  trafo: { slot: 't1', ...TRAFO_REF },
  // Folio du circuit de commande. Seul l'ORDRE des organes est écrit : les
  // ordonnées viennent du moteur de mise en page, l'état des contacts du réseau.
  folio: {
    railHaut: '24 V — secondaire de T1',
    railBas: 'com — retour 0 V, relié à la terre',
    source: 't1.24b', repSource: 'T1:24b',
    retour: 't1.0a', repRetour: 'T1:0a',
    tete: {
      type: 'disjoncteur', a: 'f3.1', b: 'f3.2',
      rep: 'F3', legende: 'protection du 24 V', conducteur: '2',
    },
    // Pôle NEUTRE de F3, sur le rail de retour : il sectionne le 0 V en même
    // temps que le pôle protégé coupe le 24 V. Sans lui au folio, l'élève ne
    // verrait pas que les DEUX conducteurs de la commande s'ouvrent ensemble.
    pied: {
      type: 'disjoncteur', a: 'f3.N', b: 'f3.N2',
      rep: 'F3', legende: 'pôle neutre · sectionnement du 0 V',
    },
    // Ordre important : une dérivation vient APRÈS la colonne d'où elle part,
    // sinon son point de branchement n'est pas encore placé.
    colonnes: [
      {
        id: 'chaine', dx: 0,
        elements: [
          { type: 'contactNF', a: 'f1.95', b: 'f1.96', rep: 'F1', bornes: ['95', '96'],
            actionneur: 'bilame', legende: 'relais thermique', conducteur: '3' },
          { type: 'borne', a: 'x2_1.a', rep: 'X2:1' },
          { type: 'contactNF', a: 'S1.21', b: 'S1.22', rep: 'S1', bornes: ['21', '22'],
            actionneur: 'poussoir', legende: 'arrêt', conducteur: '4' },
          { type: 'contactNO', a: 'S2.13', b: 'S2.14', rep: 'S2', bornes: ['13', '14'],
            actionneur: 'poussoir', legende: 'marche', conducteur: '5' },
          { type: 'borne', a: 'x2_3.a', rep: 'X2:3' },
          { type: 'bobine', a: 'km1.A1', b: 'km1.A2', rep: 'KM1', legende: 'bobine 24 V' },
          { type: 'borne', a: 'x2_6.a', rep: 'X2:6' },
        ],
      },
      {
        id: 'defaut', dx: -2,
        elements: [
          // Contact à FERMETURE du thermique : fermé seulement quand F1 a
          // déclenché, c'est lui qui allume le voyant de défaut.
          { type: 'contactNO', a: 'f1.97', b: 'f1.98', rep: 'F1', bornes: ['97', '98'],
            actionneur: 'bilame', legende: 'contact de défaut' },
          { type: 'borne', a: 'x2_5.a', rep: 'X2:5' },
          { type: 'voyant', a: 'H2.X1', b: 'H2.X2', rep: 'H2', legende: 'défaut' },
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
      {
        id: 'voyants', dx: -1, depuis: 'km1.14',
        elements: [
          { type: 'borne', a: 'x2_4.a', rep: 'X2:4' },
          { type: 'voyant', a: 'H1.X1', b: 'H1.X2', rep: 'H1', legende: 'marche' },
        ],
      },
    ],
    cadres: [
      { titre: 'Coffret de porte', de: 'S1.21', a: 'S2.14',
        couleur: 'porte', colonnes: ['chaine', 'voyants', 'defaut'] },
    ],
  },
  station: true,
  hasMotor: true,
};
