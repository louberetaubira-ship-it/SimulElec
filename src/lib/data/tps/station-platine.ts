/**
 * Coffret de la station de relevage SR1, dessiné avec le moteur de scène des
 * TP de platine : platine à 3 rails, borniers, pupitre en porte, bloc
 * récepteurs (pompe, luminaire, prise, poire de niveau) et ensemble terre.
 * Tout est câblé par l'installateur (`'pre'`) : l'élève ne câble pas, il mesure.
 */
import type { Liaison, Slot } from '@/lib/types';
import { L, X1, X2, liaisonsT1 } from './common';

const P = (a: string, b: string, net: Parameters<typeof L>[2], door = false): Liaison =>
  ({ ...L(a, b, net, door ? 'door' : 'pre'), prewired: true });
const g = (l: Liaison, gaine: string): Liaison => ({ ...l, gaine });

const X2S: Slot[] = X2(244, 7, 2, {
  subs: ['24V', 'S1', 'S2', '0V', 'H2', 'B1', 'B1'],
  groupLabel: 'X2 · bornier commande',
});

export const STATION_SLOTS: Slot[] = [
  { id: 'q0', label: 'Q0 · Interrupteur-sectionneur 4P cadenassable', key: 'mcb4p', rail: 0, x: 46, rep: 'Q0' },
  { id: 'q2', label: 'Q2 · Disjoncteur différentiel 30 mA · circuits 230 V fosse', key: 'rcd2p', rail: 0, x: 136, rep: 'Q2' },
  { id: 'f2', label: 'Q3 · Primaire T1', key: 'mcb2ph', rail: 0, x: 196, rep: 'Q3' },
  { id: 'f3', label: 'Q4 · Secondaire 24 V · phase + neutre', key: 'mcb1pn', rail: 0, x: 256, rep: 'Q4' },
  { id: 'q1', label: 'Q1 · Disjoncteur moteur GV2 · 4,9 A', key: 'motorcb', rail: 1, x: 46, rep: 'Q1' },
  { id: 'km1', label: 'KM1 · Contacteur de la pompe · bobine 24 V', key: 'kontaktaux', rail: 1, x: 110, rep: 'KM1' },
  { id: 't1', label: 'T1 · Transformateur 400 / 24 V', key: 'trafoleg', rail: 1, x: 196, rep: 'T1' },
  ...X1(46),
  ...X2S,
];

export const STATION_PUPITRE = [
  { rep: 'H2', kind: 'lamp' as const, color: 'green' as const, signals: 'run' as const, label: 'voyant vert · pompe en marche' },
  { rep: 'S0', kind: 'nc' as const, color: 'red' as const, latching: true, label: 'arrêt d\'urgence à verrouillage' },
  { rep: 'S1', kind: 'nc' as const, color: 'red' as const, label: 'arrêt de la pompe' },
  { rep: 'S2', kind: 'no' as const, color: 'green' as const, label: 'marche de la pompe (manuel)' },
];

export const STATION_RECV = [
  { key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'luminaire étanche · fosse', x: 330, y: 30, w: 64, h: 60, recv: true, pe: true },
  { key: 'l_commande_prise_de_courant', rep: 'PC1', name: 'prise de service 2P+T · fosse', x: 410, y: 34, w: 52, h: 52, recv: true, pe: true },
  { key: 'l_developp_capteur_niveau_nc', rep: 'B1', name: 'poire de niveau haut', x: 485, y: 22, w: 38, h: 84, recv: true },
];

export const STATION_TERRE = {
  sol: 96,
  items: [
    { key: 'barrcoupure', rep: 'BC1', name: 'barrette de coupure · borne principale de terre', x: 150, y: 44, w: 84, h: 40 },
    { key: 'piquet', rep: 'PT1', name: 'piquet de terre PT1', x: 300, y: 100, w: 26, h: 96 },
  ],
};

export const STATION_GAINES = [
  { id: 'g1', rep: 'G1', x: 84, diam: 25, nature: 'force' as const, contenu: '5 conducteurs · L1 L2 L3 N PE', vers: 'TGBT du lycée', dessert: ['RES.'] },
  { id: 'g2', rep: 'G2', x: 150, diam: 20, nature: 'force' as const, contenu: '4 conducteurs · U1 V1 W1 PE', vers: 'pompe M1 · fosse', dessert: ['M.'] },
  { id: 'g3', rep: 'G3', x: 210, diam: 20, nature: 'force' as const, contenu: 'circuits 230 V · E1 et PC1', vers: 'fosse', dessert: ['E1.', 'PC1.'] },
  { id: 'g4', rep: 'G4', x: 270, diam: 16, nature: 'tbts' as const, contenu: 'poire de niveau B1', vers: 'fosse', dessert: ['B1.'] },
  { id: 'g5', rep: 'G5', x: 330, diam: 20, nature: 'tbts' as const, contenu: 'pupitre', vers: 'porte', dessert: ['H2.', 'S0.', 'S1.', 'S2.'] },
  { id: 'g6', rep: 'G6', x: 390, diam: 25, nature: 'pe' as const, contenu: 'conducteur de terre 16 mm²', vers: 'barrette BC1 et piquet', dessert: ['BC1.'] },
];

export const STATION_LIAISONS: Liaison[] = [
  // arrivée TGBT
  g(P('RES.L1', 'x1_1.b', 'L1'), 'G1'), g(P('RES.L2', 'x1_2.b', 'L2'), 'G1'), g(P('RES.L3', 'x1_3.b', 'L3'), 'G1'),
  g(P('RES.N', 'x1_4.b', 'N'), 'G1'), g(P('RES.PE', 'x1_5.b', 'PE'), 'G1'),
  // ensemble terre
  g(P('x1_5.b', 'BC1.X1', 'PE'), 'G6'), P('BC1.X1', 'BC1.X2', 'PE'), P('BC1.X2', 'PT1.X1', 'PE'),
  // tête : X1 → Q0
  P('x1_1.a', 'q0.1', 'L1'), P('x1_2.a', 'q0.3', 'L2'), P('x1_3.a', 'q0.5', 'L3'), P('x1_4.a', 'q0.N', 'N'),
  // départ pompe : Q0 → Q1 → KM1 → X1 → M1
  P('q0.2', 'q1.1', 'L1'), P('q0.4', 'q1.3', 'L2'), P('q0.6', 'q1.5', 'L3'),
  P('q1.2', 'km1.1', 'L1'), P('q1.4', 'km1.3', 'L2'), P('q1.6', 'km1.5', 'L3'),
  P('km1.2', 'x1_6.a', 'L1'), P('km1.4', 'x1_7.a', 'L2'), P('km1.6', 'x1_8.a', 'L3'),
  P('x1_5.a', 'x1_9.a', 'PE'),
  g(P('x1_6.b', 'M.U1', 'L1'), 'G2'), g(P('x1_7.b', 'M.V1', 'L2'), 'G2'), g(P('x1_8.b', 'M.W1', 'L3'), 'G2'),
  g(P('x1_9.b', 'M.PE', 'PE'), 'G2'),
  P('M.W2', 'M.U2', 'BAR'), P('M.U2', 'M.V2', 'BAR'),
  // circuits 230 V de la fosse : Q0 → Q2 (30 mA) → E1 et PC1
  P('q0.2', 'q2.1', 'L1'), P('q0.N2', 'q2.N', 'N'),
  g(P('q2.2', 'E1.X1', 'L1'), 'G3'), g(P('q2.N2', 'E1.X2', 'N'), 'G3'), g(P('x1_9.a', 'E1.PE', 'PE'), 'G3'),
  g(P('q2.2', 'PC1.X1', 'L1'), 'G3'), g(P('q2.N2', 'PC1.X2', 'N'), 'G3'), g(P('x1_9.a', 'PC1.PE', 'PE'), 'G3'),
  // commande 24 V : Q0 → Q3 → T1 → Q4
  P('q0.2', 'f2.1', 'L1'), P('q0.4', 'f2.3', 'L2'),
  ...liaisonsT1({ retour: 'x2_4.a', terre: 'x1_5.a' }).map((l) => ({ ...l, prewired: true })),
  P('f3.2', 'x2_1.a', 'C'),
  P('x2_2.a', 'km1.13', 'C'), P('x2_3.a', 'km1.A1', 'C'), P('km1.14', 'km1.A1', 'C'), P('km1.A2', 'x2_4.a', 'C0'),
  P('x2_3.a', 'x2_6.a', 'C'), P('km1.14', 'x2_5.a', 'C'),
  // pupitre en porte
  P('x2_1.b', 'S0.21', 'C', true), P('S0.22', 'S1.21', 'C', true),
  P('S1.22', 'S2.13', 'C', true), P('S1.22', 'x2_2.b', 'C', true), P('S2.14', 'x2_3.b', 'C', true),
  P('x2_5.b', 'H2.X1', 'C', true), P('x2_4.b', 'H2.X2', 'C0', true),
  // poire de niveau (automatique)
  g(P('x2_6.b', 'B1.X1', 'C'), 'G4'), g(P('x2_7.b', 'B1.X2', 'C'), 'G4'),
];
