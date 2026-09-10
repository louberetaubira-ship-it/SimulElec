/**
 * TP · Démarrage direct un sens de marche (platine industrielle, commande 24 V).
 * Liaisons, borniers et table des réseaux portés de `docs/reference/illustration-v3.tpl.html`
 * (`TPS[0]`, `LIAIS`, `netOf`).
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, X1, X2 } from './common';

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
    { k: 'Commande', v: '24 V~ par transformateur T1 400/24 V · 63 VA, protégé par F2 (primaire) et F3 (secondaire)' },
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
        { key: 'trafo', ref: 'ABL6TS02U', spec: '400/24 V · 25 VA', half: true, why: 'Puissance juste : appel de bobine mal absorbé, chute de tension à l\'enclenchement.' },
        { key: 'trafo', ref: 'ABL6TS06U', spec: '400/24 V · 63 VA', ok: true, why: 'Primaire 400 V, secondaire 24 V, 63 VA couvrent largement la bobine et les voyants.' },
        { key: 'trafo', ref: 'ABL6TS10U', spec: '230/12 V · 100 VA', why: 'Ni le primaire (230 V) ni le secondaire (12 V) ne correspondent au cahier des charges.' },
      ],
    },
    {
      id: 'f2',
      name: 'F2 · Protection du primaire',
      need: 'Protéger le primaire 400 V de T1 (I1 ≈ 0,16 A) et les conducteurs 1,5 mm²',
      options: [
        { key: 'mcb2p', ref: 'iC60N 2P C2', spec: '2 A · courbe C · 2 pôles', ok: true, why: 'Bipolaire pour couper les deux phases du primaire, calibre adapté au transformateur.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · courbe C · 1 pôle', why: 'Un seul pôle coupé : la seconde phase du primaire reste sous tension.' },
        { key: 'mcb2p', ref: 'iC60N 2P C20', spec: '20 A · courbe C', why: 'Calibre sans rapport avec le primaire : ni le transformateur ni les fils ne sont protégés.' },
      ],
    },
    {
      id: 'f3',
      name: 'F3 · Protection du secondaire',
      need: 'Protéger le circuit de commande 24 V (bobine + voyants ≈ 0,5 A)',
      options: [
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · courbe C · 1 pôle', ok: true, why: 'Un seul pôle : le 0 V est relié à la terre, on ne coupe que le conducteur actif.' },
        { key: 'mcb1p', ref: 'iC60N 1P C16', spec: '16 A · courbe C', why: 'Trop élevé pour du 1,5 mm² de commande.' },
        { key: 'mcb2p', ref: 'iC60N 2P C2', spec: '2 A · 2 pôles', half: true, why: 'Fonctionne, mais couper le 0 V mis à la terre n\'a pas d\'intérêt et coûte un module.' },
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
    { id: 'km1', label: 'KM1 · Contacteur', key: 'kontakt', rail: 0, x: 112, rep: 'KM1' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 0, x: 180, rep: 'F1' },
    { id: 'f2', label: 'F2 · Primaire T1', key: 'mcb2p', rail: 1, x: 52, rep: 'F2' },
    { id: 't1', label: 'T1 · Transformateur 400/24 V', key: 'trafo', rail: 1, x: 116, rep: 'T1' },
    { id: 'f3', label: 'F3 · Secondaire 24 V', key: 'mcb1p', rail: 1, x: 204, rep: 'F3' },
    ...X1(52),
    ...X2(238, 6),
  ],
  annexItems: [],
  liaisons: [
    // ---- puissance ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),
    // ---- commande : primaire, transformateur, secondaire 24 V ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.N', 'L2'),
    L('f2.2', 't1.400', 'L1'), L('f2.N', 't1.0', 'L2'),
    L('t1.24', 'f3.1', 'C'), L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_1.a', 'C'),
    L('x2_2.a', 'km1.13', 'C'), L('x2_3.a', 'km1.A1', 'C'), L('km1.14', 'km1.A1', 'C'),
    L('t1.0V', 'x2_6.a', 'C0'), L('x2_6.a', 'x1_5.a', 'PE'), L('km1.A2', 'x2_6.a', 'C0'),
    L('km1.14', 'x2_4.a', 'C'), L('f1.97', 'f3.2', 'C'), L('f1.98', 'x2_5.a', 'C'),
    // ---- porte : boutons et voyants ----
    L('x2_1.b', 'S1.21', 'C', 'door'), L('S1.22', 'S2.13', 'C', 'door'), L('S1.22', 'x2_2.b', 'C', 'door'),
    L('S2.14', 'x2_3.b', 'C', 'door'), L('x2_4.b', 'H1.X1', 'C', 'door'), L('x2_5.b', 'H2.X1', 'C', 'door'),
    L('x2_6.b', 'H1.X2', 'C0', 'door'), L('H1.X2', 'H2.X2', 'C0', 'door'),
    // ---- câblage installateur (réseau et câble moteur) ----
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.L2', 'x1_2.b', 'L2', 'pre'), L('RES.L3', 'x1_3.b', 'L3', 'pre'),
    L('RES.N', 'x1_4.b', 'N', 'pre'), L('RES.PE', 'x1_5.b', 'PE', 'pre'),
    L('x1_6.b', 'M.U1', 'L1', 'pre'), L('x1_7.b', 'M.V1', 'L2', 'pre'), L('x1_8.b', 'M.W1', 'L3', 'pre'),
    L('x1_9.b', 'M.PE', 'PE', 'pre'),
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
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'L1', live: 'f2' },
    // transformateur
    't1.400': { net: 'L1', live: 'f2' }, 't1.0': { net: 'L2', live: 'f2' }, 't1.230': { net: 'C0', live: 'always' },
    't1.24': { net: 'C', live: 'f2' }, 't1.0V': { net: 'C0', live: 'always' }, 't1.48': { net: 'C0', live: 'always' },
    // protection du secondaire
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
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
    'H1.X1': { net: 'C', live: 'ctl' }, 'H1.X2': { net: 'C', live: 'ctl' },
    'H2.X1': { net: 'C', live: 'ctl' }, 'H2.X2': { net: 'C', live: 'ctl' },
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
      how: 'Multimètre en Ω entre M.U1 et M.W2, barrettes retirées : les trois enroulements doivent être équilibrés.',
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
      id: 'renr', title: 'Résistance d\'un enroulement (U1 – W2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.W2', min: 3, max: 6, unit: 'Ω',
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
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>f1.1', min: 2.5, max: 4, unit: 'A', when: 'run',
    },
    {
      id: 'n', title: 'Vitesse de rotation au tachymètre', stage: 'sousTension',
      instrument: 'tach', dial: 'tr/min', min: 1300, max: 1500, unit: 'tr/min', when: 'run',
    },
  ],
  faults: [
    { id: 'a2', title: 'Fil A2 de la bobine KM1 desserré', symptom: 'KM1 vibre et ne tient pas à l\'appui sur S2.', fix: 'Resserrer A2 et refaire la continuité A2 – X2:6.' },
    { id: 's1', title: 'Contact NC de S1 (21-22) resté ouvert', symptom: 'Rien ne se passe à l\'appui sur S2, 24 V présents sur X2:1.', fix: 'Remplacer le bloc de contact de S1.' },
    { id: 'l2', title: 'Phase L2 coupée entre F1 et X1:7', symptom: 'Le moteur ronfle, ne démarre pas, courant anormal sur L1 et L3, F1 finit par déclencher.', fix: 'Refaire la liaison F1:4 → X1:7 et réarmer F1.' },
    { id: 'x2', title: 'Fil X2:3 → KM1 A1 débranché', symptom: 'Rien ne se passe à l\'appui sur S2, mais 24 V présents sur X2:3.', fix: 'Reconnecter X2:3 sur A1.' },
    { id: 'f3', title: 'F3 déclenché (court-circuit sur le 24 V)', symptom: 'Aucun voyant, 0 V entre X2:1 et X2:6, 24 V au secondaire de T1.', fix: 'Chercher le défaut d\'isolement du 24 V, puis réarmer F3.' },
  ],
  quiz: [
    { q: 'Quel contact assure l\'auto-maintien après relâchement de S2 ?', options: ['F1 95-96', 'KM1 13-14', 'S1 21-22'], answer: 1 },
    { q: 'Pourquoi le bouton d\'arrêt S1 est-il à contact NC ?', options: ['Pour économiser un fil', 'Pour qu\'une coupure de fil provoque l\'arrêt (sécurité positive)', 'Parce que le contacteur l\'impose'], answer: 1 },
    { q: 'Pourquoi la commande est-elle alimentée en 24 V par T1 plutôt qu\'en 400 V ?', options: ['Pour réduire le prix des fils', 'Pour limiter le risque électrique sur les organes accessibles en porte', 'Pour que le moteur démarre plus vite'], answer: 1 },
  ],
  motor: { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 },
  station: true,
  hasMotor: true,
};
