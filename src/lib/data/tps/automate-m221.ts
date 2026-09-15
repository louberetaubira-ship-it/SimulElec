/**
 * TP · Câblage d'un automate Modicon M221 (départ moteur piloté par API).
 * Puissance identique au démarrage direct ; commande 24 V : T1 → Q3 → automate,
 * entrées S2 / S1 / F1 par le bornier X2, sorties relais vers KM1, H1 et H2.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, POSTE_T1_OPTIONS, TRAFO_REF, X1, X2, liaisonsT1, netsT1 } from './common';

export const TP_AUTOMATE_M221: TpDefinition = {
  id: 'automate-m221',
  title: 'Câblage d\'un automate M221',
  level: 'Tle Bac Pro MELEC / BTS',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'TM221CE16R alimenté en 24 V par T1 et Q3 : entrées I0.0 marche, I0.1 arrêt, I0.2 défaut thermique ; sorties relais Q0.0 bobine KM1, Q0.1 voyant marche, Q0.2 voyant défaut.',
  situation:
    'Le départ moteur de l\'extracteur doit être repris par un automate programmable pour préparer une future gestion horaire. Tu remplaces la logique câblée par un M221 : la puissance reste identique, mais les boutons et le contact thermique deviennent des entrées, et la bobine et les voyants des sorties relais. Tu câbles, tu repères, puis tu mets en service.',
  plaque: {
    Automate: 'TM221CE16R',
    Entrées: '9 TOR 24 V DC',
    Sorties: '7 relais 2 A',
    Alimentation: '24 V DC · 250 mA',
    P: '1,5 kW',
    U: '400 V Y · 50 Hz',
    In: '3,3 A',
    n: '1440 tr/min',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE sur bornier X1' },
    { k: 'Puissance', v: 'Q1 GV2 · KM1 LC1D bobine 24 V · F1 LRD, identique au démarrage direct' },
    { k: 'Alimentation automate', v: 'T1 400/24 V, Q2 au primaire, Q3 phase + neutre au secondaire, puis bornes +24 / 0V du M221' },
    { k: 'Entrée I0.0', v: 'S2 marche NO, contact 13-14, par X2:3' },
    { k: 'Entrée I0.1', v: 'S1 arrêt NC, contact 21-22, par X2:2' },
    { k: 'Entrée I0.2', v: 'F1 défaut thermique 95-96, par X2:7' },
    { k: 'Sortie Q0.0', v: 'bobine KM1 A1 (commun COM0 relié au + 24 V)' },
    { k: 'Sortie Q0.1', v: 'voyant H1 marche, par X2:4' },
    { k: 'Sortie Q0.2', v: 'voyant H2 défaut, par X2:5 (même commun COM0 : il porte Q0.0 à Q0.3)' },
    { k: '0 V', v: 'commun 0 V sur X2:6, relié à la terre sur X1:5' },
    { k: 'Avant mise en service', v: 'consignation · VAT · continuité PE · isolement 500 V · essai du programme' },
  ],
  postes: [
    {
      id: 'plc',
      name: 'A1 · Automate programmable',
      need: '3 entrées TOR, 3 sorties capables de commander une bobine 24 V~ et 2 voyants',
      options: [
        { key: 'plc', ref: 'TM221CE16R', spec: '9 entrées 24 V DC · 7 sorties relais 2 A · Ethernet', ok: true, why: 'Sorties relais : elles commandent indifféremment du 24 V~ ou du 230 V~, et les E/S sont en nombre suffisant.' },
        { key: 'plc', ref: 'TM221CE16T', spec: '9 entrées · 7 sorties transistor PNP', why: 'Sorties transistor 24 V DC : elles ne peuvent pas alimenter une bobine 24 V alternative.' },
        { key: 'plc', ref: 'TM221C40R', spec: '24 entrées · 16 sorties relais', half: true, why: 'Convient, mais très surdimensionné pour 3 entrées et 3 sorties.' },
      ],
    },
    {
      id: 'q1',
      name: 'Q1 · Disjoncteur moteur',
      need: 'Protection magnéto-thermique du moteur, In = 3,3 A',
      options: [
        { key: 'motorcb', ref: 'GV2ME06', spec: '1 – 1,6 A', why: 'Plage trop basse : déclenchera au démarrage.' },
        { key: 'motorcb', ref: 'GV2ME08', spec: '2,5 – 4 A', ok: true, why: 'In = 3,3 A dans la plage 2,5 – 4 A.' },
        { key: 'motorcb', ref: 'GV2ME14', spec: '6 – 10 A', why: 'Plage trop haute : le moteur n\'est pas protégé.' },
      ],
    },
    {
      id: 'km1',
      name: 'KM1 · Contacteur',
      need: 'Bobine pilotée par une sortie relais de l\'automate, sous 24 V',
      options: [
        { key: 'kontakt', ref: 'LC1D09B7', spec: '9 A AC-3 · bobine 24 V~', ok: true, why: 'Bobine 24 V~ compatible avec la sortie relais et le secondaire de T1.' },
        { key: 'kontakt', ref: 'LC1D09P7', spec: '9 A AC-3 · bobine 230 V~', why: 'Bobine 230 V : incompatible avec le 24 V du secondaire.' },
        { key: 'kontakt', ref: 'LC1D09BD', spec: '9 A AC-3 · bobine 24 V DC', half: true, why: 'Fonctionnerait avec une alimentation continue, mais le secondaire de T1 est alternatif.' },
      ],
    },
    {
      id: 't1',
      name: 'T1 · Alimentation de commande',
      need: 'Alimenter l\'automate (250 mA), la bobine et les voyants en 24 V',
      options: [
        ...POSTE_T1_OPTIONS,
      ],
    },
    {
      id: 'f3',
      name: 'Q3 · Protection du 24 V',
      need: 'Protéger le secondaire et les conducteurs de commande (automate 250 mA + bobine + voyants)',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C2 · A9F74602', spec: '2 A · courbe C · phase + neutre', ok: true, why: 'Le pôle protégé coupe le 24 V, le pôle neutre sectionne le 0 V : les deux conducteurs de la commande s\'ouvrent d\'un seul geste, et l\'automate n\'est plus alimenté par aucun des deux.' },
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C10 · A9F74610', spec: '10 A · courbe C · phase + neutre', why: 'Calibre trop élevé : les fils 1,5 mm² de commande ne sont pas protégés, et le secondaire 100 VA de T1 ne fournit pas 10 A.' },
        { key: 'mcb1p', ref: 'Acti9 iC60N 1P C2', spec: '2 A · courbe C · 1 pôle', half: true, why: 'Protège bien, mais laisse le 0 V raccordé au secondaire pendant l\'intervention.' },
      ],
    },
    {
      id: 'x',
      name: 'X2 · Bornier de commande',
      need: '8 bornes : + 24 V, entrées, sorties voyants et 0 V vers la porte',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 · 8 bornes + repérage', spec: 'bornes 2,5 mm² repérées 1 à 8', ok: true, why: 'Toutes les liaisons de porte passent par un bornier repéré : dépannage et remplacement facilités.' },
        { key: 'termgrey', ref: 'UT 2,5 · 4 bornes', spec: '4 bornes seulement', why: 'Insuffisant : il faut au minimum le + 24 V, 3 entrées, 2 voyants et le 0 V.' },
        { key: 'termgrey', ref: 'Liaisons directes', spec: 'fils soudés jusqu\'aux boutons', why: 'Sans bornier, la porte ne peut plus être déposée : interdit en armoire.' },
      ],
    },
  ],
  // Quatre rails : l'automate fait 200 px de large, il occupe son rail à lui.
  rails: [150, 350, 550, 750],
  armoire: 920,
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur moteur', key: 'motorcb', rail: 0, x: 46, rep: 'Q1' },
    { id: 'km1', label: 'KM1 · Contacteur', key: 'kontakt', rail: 0, x: 114, rep: 'KM1' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 0, x: 182, rep: 'F1' },
    { id: 'f2', label: 'Q2 · Primaire T1', key: 'mcb2ph', rail: 0, x: 250, rep: 'Q2' },
    { id: 't1', label: 'T1 · Transformateur Legrand 100 VA · 230-400 / 24-48 V', key: 'trafoleg', rail: 1, x: 46, rep: 'T1' },
    { id: 'f3', label: 'Q3 · Secondaire 24 V · phase + neutre', key: 'mcb1pn', rail: 2, x: 46, rep: 'Q3' },
    { id: 'plc', label: 'A1 · Automate M221', key: 'plc', rail: 2, x: 104, rep: 'A1' },
    ...X1(52, 3),
    ...X2(238, 8, 3),
  ],
  annexItems: [],
  recvItems: [],
  liaisons: [
    // ---- puissance (identique au démarrage direct) ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),
    // ---- alimentation de commande 24 V ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.3', 'L2'),
    ...liaisonsT1({ retour: 'x2_6.a', terre: 'x1_5.a' }),
   
    L('f3.2', 'plc.+24', 'C'), L('x2_6.a', 'plc.0V', 'C0'),
    L('x2_6.a', 'x1_5.a', 'PE'),
    // ---- entrées ----
    L('f3.2', 'x2_1.a', 'C'), L('x2_1.b', 'S1.21', 'C', 'door'),
    L('S1.22', 'S2.13', 'C', 'door'), L('S1.22', 'x2_2.b', 'C', 'door'), L('S2.14', 'x2_3.b', 'C', 'door'),
    L('x2_3.a', 'plc.I0.0', 'C'), L('x2_2.a', 'plc.I0.1', 'C'),
    L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_7.a', 'C'), L('x2_7.b', 'plc.I0.2', 'C'),
    // ---- sorties relais ----
    L('f3.2', 'plc.COM0', 'C'),
    L('plc.Q0.0', 'x2_8.a', 'C'), L('x2_8.b', 'km1.A1', 'C'), L('km1.A2', 'x2_6.a', 'C0'),
    L('plc.Q0.1', 'x2_4.a', 'C'), L('x2_4.b', 'H1.X1', 'C', 'door'),
    L('plc.Q0.2', 'x2_5.a', 'C'), L('x2_5.b', 'H2.X1', 'C', 'door'),
    L('x2_6.b', 'H1.X2', 'C0', 'door'), L('H1.X2', 'H2.X2', 'C0', 'door'),
    // ---- câblage installateur ----
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.L2', 'x1_2.b', 'L2', 'pre'), L('RES.L3', 'x1_3.b', 'L3', 'pre'),
    L('RES.N', 'x1_4.b', 'N', 'pre'), L('RES.PE', 'x1_5.b', 'PE', 'pre'),
    L('x1_6.b', 'M.U1', 'L1', 'pre'), L('x1_7.b', 'M.V1', 'L2', 'pre'), L('x1_8.b', 'M.W1', 'L3', 'pre'),
    L('x1_9.b', 'M.PE', 'PE', 'pre'),
  ],
  nets: {
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'L2', live: 'always' }, 'x1_2.b': { net: 'L2', live: 'always' },
    'x1_3.a': { net: 'L3', live: 'always' }, 'x1_3.b': { net: 'L3', live: 'always' },
    'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
    'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
    'x1_6.a': { net: 'U', live: 'run' }, 'x1_6.b': { net: 'U', live: 'run' },
    'x1_7.a': { net: 'V', live: 'run' }, 'x1_7.b': { net: 'V', live: 'run' },
    'x1_8.a': { net: 'W', live: 'run' }, 'x1_8.b': { net: 'W', live: 'run' },
    'x1_9.a': { net: 'PE', live: 'always' }, 'x1_9.b': { net: 'PE', live: 'always' },
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'L2', live: 'always' }, 'q1.5': { net: 'L3', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'L2', live: 'q1' }, 'q1.6': { net: 'L3', live: 'q1' },
    'km1.1': { net: 'L1', live: 'q1' }, 'km1.3': { net: 'L2', live: 'q1' }, 'km1.5': { net: 'L3', live: 'q1' },
    'km1.2': { net: 'U', live: 'run' }, 'km1.4': { net: 'V', live: 'run' }, 'km1.6': { net: 'W', live: 'run' },
    'km1.13': { net: 'C', live: 'ctl' }, 'km1.14': { net: 'C', live: 'km1' },
    'km1.A1': { net: 'Q0', live: 'km1' }, 'km1.A2': { net: 'C0', live: 'always' },
    'f1.1': { net: 'U', live: 'run' }, 'f1.3': { net: 'V', live: 'run' }, 'f1.5': { net: 'W', live: 'run' },
    'f1.2': { net: 'U', live: 'run' }, 'f1.4': { net: 'V', live: 'run' }, 'f1.6': { net: 'W', live: 'run' },
    'f1.95': { net: 'C', live: 'f3' }, 'f1.96': { net: 'I2', live: 'ctl' },
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.3': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.4': { net: 'L2', live: 'f2' },
    ...netsT1('f2'),
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    'f3.N': { net: 'C0', live: 'always' }, 'f3.N2': { net: 'C0', live: 'always' },
    // automate
    'plc.+24': { net: 'C', live: 'f3' }, 'plc.0V': { net: 'C0', live: 'always' },
    'plc.COM0': { net: 'C', live: 'f3' },
    'plc.I0.0': { net: 'I0', live: 'ctl' }, 'plc.I0.1': { net: 'I1', live: 'ctl' }, 'plc.I0.2': { net: 'I2', live: 'ctl' },
    'plc.Q0.0': { net: 'Q0', live: 'km1' }, 'plc.Q0.1': { net: 'Q1', live: 'km1' }, 'plc.Q0.2': { net: 'Q2', live: 'off' },
    // bornier de commande
    'x2_1.a': { net: 'C', live: 'f3' }, 'x2_1.b': { net: 'C', live: 'f3' },
    'x2_2.a': { net: 'I1', live: 'ctl' }, 'x2_2.b': { net: 'I1', live: 'ctl' },
    'x2_3.a': { net: 'I0', live: 'ctl' }, 'x2_3.b': { net: 'I0', live: 'ctl' },
    'x2_4.a': { net: 'Q1', live: 'km1' }, 'x2_4.b': { net: 'Q1', live: 'km1' },
    'x2_5.a': { net: 'Q2', live: 'off' }, 'x2_5.b': { net: 'Q2', live: 'off' },
    'x2_6.a': { net: 'C0', live: 'always' }, 'x2_6.b': { net: 'C0', live: 'always' },
    'x2_7.a': { net: 'I2', live: 'ctl' }, 'x2_7.b': { net: 'I2', live: 'ctl' },
    'x2_8.a': { net: 'Q0', live: 'km1' }, 'x2_8.b': { net: 'Q0', live: 'km1' },
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S1.21': { net: 'C', live: 'f3' }, 'S1.22': { net: 'I1', live: 'ctl' },
    'S2.13': { net: 'I1', live: 'ctl' }, 'S2.14': { net: 'I0', live: 'ctl' },
    'H1.X1': { net: 'Q1', live: 'km1' }, 'H1.X2': { net: 'C0', live: 'always' },
    'H2.X1': { net: 'Q2', live: 'off' }, 'H2.X2': { net: 'C0', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'entrees',
      title: 'Contrôle des entrées automate',
      how: 'Hors programme, multimètre en V⎓ entre chaque entrée I0.0 / I0.1 / I0.2 et le 0 V, en manœuvrant S2, S1 et le bouton test de F1.',
      expected: '24 V à l\'état 1, 0 V à l\'état 0',
    },
    {
      id: 'sorties',
      title: 'Contrôle des communs de sortie',
      how: 'Multimètre en Ω, automate hors tension : vérifie l\'arrivée du + 24 V sur COM0, le commun des sorties Q0.0 à Q0.3.',
      expected: '< 1 Ω sur le pont, continuité jusqu\'à Q3:2',
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
      id: 'renr', title: 'Résistance d\'un enroulement (U1 – U2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.U2', min: 5, max: 9, unit: 'Ω',
    },
    {
      id: 'u400', title: 'Tension composée en aval de Q1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'run',
    },
    {
      id: 'u24', title: 'Alimentation 24 V de l\'automate', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'plc.+24', b: 'plc.0V', min: 22, max: 26, unit: 'V', when: 'ctl',
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
  plcIo: [
    { io: 'I0.0', label: 'S2 marche (NO), contact 13-14 par X2:3', device: 'coffret de porte' },
    { io: 'I0.1', label: 'S1 arrêt (NC), contact 21-22 par X2:2', device: 'coffret de porte' },
    { io: 'I0.2', label: 'F1 défaut thermique 95-96 par X2:7', device: 'relais thermique' },
    { io: 'Q0.0', label: 'Bobine KM1 A1 par X2:8 (commun COM0 = + 24 V)', device: 'contacteur' },
    { io: 'Q0.1', label: 'Voyant H1 marche par X2:4', device: 'coffret de porte' },
    { io: 'Q0.2', label: 'Voyant H2 défaut par X2:5 (commun COM0)', device: 'coffret de porte' },
    { io: '+24 / 0V', label: 'Alimentation de l\'automate par T1 et Q3', device: 'transformateur de commande' },
  ],
  faults: [
    { id: 'com', title: 'Commun COM0 non alimenté', symptom: 'Le programme passe bien à l\'état 1 mais aucune sortie ne colle.', fix: 'Relier COM0 au + 24 V (Q3:2) : ce commun porte les trois sorties utilisées.', coupe: 'f3.2>plc.COM0', action: 'Relier le commun COM0 au + 24 V' },
    { id: 'i2', title: 'Entrée I0.2 non câblée', symptom: 'Le défaut thermique n\'allume jamais H2 et n\'arrête pas le moteur.', fix: 'Câbler F1:96 → X2:7 → I0.2.', coupe: 'f1.96>x2_7.a', action: 'Câbler F1:96 → X2:7 → I0.2' },
    { id: 'a1', title: 'Fil X2:8 → KM1 A1 débranché', symptom: 'Q0.0 est active (LED allumée) mais KM1 ne colle pas.', fix: 'Reconnecter X2:8 sur A1.', coupe: 'x2_8.b>km1.A1', action: 'Reconnecter le fil de X2:8 sur la borne A1 de KM1' },
    { id: 's1', title: 'S1 câblé en NO au lieu de NC', symptom: 'Le moteur ne démarre que si l\'on maintient le bouton d\'arrêt enfoncé.', fix: 'Utiliser le contact 21-22 (NC) et corriger la logique du programme.', ouvre: 'S1', action: 'Reprendre le câblage sur le contact 21-22 à ouverture du bouton d\'arrêt' },
    { id: 'v0', title: '0 V de l\'automate non relié à X2:6', symptom: 'Entrées instables, automate qui redémarre.', fix: 'Relier la borne 0V de l\'automate au 0 V commun (X2:6).', coupe: 'x2_6.a>plc.0V', action: 'Relier la borne 0V de l\'automate au 0 V commun' },
  ],
  quiz: [
    { q: 'Pourquoi les sorties relais conviennent-elles mieux ici que des sorties transistor ?', options: ['Elles sont plus rapides', 'Elles commutent indifféremment du continu ou de l\'alternatif, donc la bobine 24 V~', 'Elles consomment moins'], answer: 1 },
    { q: 'À quoi sert le commun COM0 de l\'automate ?', options: ['À amener le potentiel + 24 V sur les contacts des sorties Q0.0 à Q0.3', 'À mettre l\'automate à la terre', 'À alimenter les entrées'], answer: 0 },
    { q: 'Le contact d\'arrêt S1 est câblé en NC sur I0.1. Que fait le programme ?', options: ['Il démarre quand I0.1 passe à 1', 'Il maintient la marche tant que I0.1 est à 1 et arrête quand elle retombe à 0', 'Il ignore I0.1'], answer: 1 },
  ],
  motor: { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 },
  // Transformateur de commande à prises : le rapport de transformation est fixé par
  // les spires, donc se tromper de prise ne bloque rien — ça se paie au secondaire.
  // Voir `src/lib/sim/trafo.ts`.
  trafo: { slot: 't1', ...TRAFO_REF },
  // PAS ENCORE DE FOLIO — et c'est délibéré.
  //
  // Un premier folio a été écrit sur le câblage ci-dessus, puis retiré : il
  // aurait enseigné une faute. Ce TP alimente aujourd'hui l'automate par les
  // bornes +24 / 0V, qui sont sa SORTIE d'alimentation capteurs (24 V DC,
  // 250 mA) et non son entrée — le TM221CE16R s'alimente en 100-240 V
  // alternatif sur L / N — et il alimente des entrées TOR 24 V CONTINU avec le
  // secondaire alternatif de T1.
  //
  // La correction décidée est de montrer les DEUX sources comme sur la vraie
  // platine : 230 V protégé par Q4 vers L / N de l'appareil, le + 24 V DC de
  // l'automate pour ses entrées, et T1 24 V~ réservé aux sorties (bobine et
  // voyants). Elle demande deux réseaux de commande distincts — donc deux
  // folios — et se fait dans un second temps.
  station: true,
  hasMotor: true,
};
