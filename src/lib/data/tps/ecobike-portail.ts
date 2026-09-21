/**
 * TP · Chantier Écobike (lycée L. Couffignal) — portail coulissant piloté par automate M221.
 *
 * Tiré du sujet CGM MELEC 2023, partie B, avec deux adaptations assumées :
 *  - le contrôleur WAGO du sujet est remplacé par le Modicon M221 que les élèves ont déjà
 *    câblé (TP « Câblage d'un automate M221 ») : même appareil, même photo, mêmes bornes ;
 *  - ses sorties RELAIS sont alimentées en 24 V~ par T1 (commun COM0) : l'inverseur devient
 *    donc un LC2D09B7 (bobines 24 V~) au lieu du LC2D09BD (24 V⎓) du sujet ;
 *  - le disjoncteur moteur est un GV2-ME05 (0,63 à 1 A) réglé à 0,82 A. Le corrigé officiel
 *    donne un GV2-ME06 réglé à 1 A : sa plage commence au-dessus de In, le moteur n'y serait
 *    pas protégé d'une petite surcharge. Il reste proposé, noté à moitié juste.
 *
 * Alimentations :
 *  - le M221 (TM221CE16R) est alimenté en 230 V par Q3 (1P+N) sur ses bornes L / N ;
 *  - sa sortie capteurs + 24 V⎓ / 0 V (250 mA) alimente les entrées et la cellule PNP. Le COM
 *    des entrées est relié au 0 V : logique positive, capteurs PNP ;
 *  - T1 (Q4 au primaire, Q5 au secondaire) fournit le 24 V~ du commun COM0, donc des bobines
 *    KM1.1 / KM1.2 et du feu orange H1.
 *
 * Correspondance avec le moteur de simulation (il ne connaît que ces repères techniques) :
 *  q1 = Q1 interrupteur-sectionneur 4P (consignation) · gv = Q2 disjoncteur moteur ·
 *  q3 = Q3 alimentation de l'automate · f2 / f3 = Q4 / Q5 · km1 = KM1.1 (ouverture, sens
 *  animé) · km2 = KM1.2 (fermeture, au repos) · plc = A1.
 *
 * Les capteurs du portail (S1 lecteur RFID, S3 / S4 fins de course, S5 cellule, S6 barre
 * palpeuse) et le feu H1 sont posés et câblés jusqu'au bornier X2 par l'installateur. L'élève
 * câble l'arrivée depuis le pupitre d'alimentation, la puissance, l'automate et la porte.
 */
import type { Liaison, Slot, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, POSTE_T1_OPTIONS, TRAFO_REF, X1, liaisonsT1, netsT1 } from './common';

/** Bornier de commande X2 : 12 bornes au pas de 18 px (rail 3, à droite de X1). */
const X2_ROWS: [string, string][] = [
  ['+24', '+24 V⎓ porte'], ['S0', 'S0 → I0.0'], ['S1', 'S1 → I0.1'], ['S2', 'S2 → I0.2'],
  ['S3', 'S3 → I0.3'], ['S4', 'S4 → I0.4'], ['S5', 'S5 → I0.5'], ['S6', 'S6 → I0.6'],
  ['0V', '0 V⎓'], ['H1', 'Q0.2 → H1'], ['0V~', '0 V~'], ['+24', '+24 V⎓ terrain'],
];
const X2E: Slot[] = X2_ROWS.map(([sub, what], i) => ({
  id: `x2_${i + 1}`,
  label: `X2:${i + 1} · ${what}`,
  key: 'termgrey',
  rail: 3,
  x: 232 + i * 18,
  mark: String(i + 1),
  sub,
  group: 'X2',
  ...(i === 0 ? { groupLabel: 'X2 · bornier commande' } : {}),
}));

/** Liaisons de l'installateur (câbles des capteurs du portail, en gaines). */
const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

const LIAISONS: Liaison[] = [
  // ---- arrivée depuis le pupitre d'alimentation (cordons) ----
  L('RES.L1', 'x1_1.b', 'L1'), L('RES.L2', 'x1_2.b', 'L2'), L('RES.L3', 'x1_3.b', 'L3'),
  L('RES.N', 'x1_4.b', 'N'), L('RES.PE', 'x1_5.b', 'PE'),
  // ---- X1 → Q1 (4 pôles, neutre compris) ----
  L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'), L('x1_4.a', 'q1.N', 'N'),
  // ---- Q1 → Q2 disjoncteur moteur ----
  L('q1.2', 'gv.1', 'L1'), L('q1.4', 'gv.3', 'L2'), L('q1.6', 'gv.5', 'L3'),
  // ---- inverseur : KM1.1 phases dans l'ordre, KM1.2 L1 et L3 croisées ----
  L('gv.2', 'km1.1', 'L1'), L('gv.4', 'km1.3', 'L2'), L('gv.6', 'km1.5', 'L3'),
  L('gv.2', 'km2.5', 'L1'), L('gv.4', 'km2.3', 'L2'), L('gv.6', 'km2.1', 'L3'),
  L('km2.2', 'km1.2', 'L1'), L('km2.4', 'km1.4', 'L2'), L('km2.6', 'km1.6', 'L3'),
  L('km1.2', 'x1_6.a', 'L1'), L('km1.4', 'x1_7.a', 'L2'), L('km1.6', 'x1_8.a', 'L3'),
  L('x1_5.a', 'x1_9.a', 'PE'),
  // ---- moteur : câble posé, barrettes étoile à poser ----
  PRE('x1_6.b', 'M.U1', 'L1'), PRE('x1_7.b', 'M.V1', 'L2'), PRE('x1_8.b', 'M.W1', 'L3'), PRE('x1_9.b', 'M.PE', 'PE'),
  L('M.W2', 'M.U2', 'BAR'), L('M.U2', 'M.V2', 'BAR'),
  // ---- alimentation 230 V de l'automate par Q3 ----
  L('q1.2', 'q3.1', 'L1'), L('q1.N2', 'q3.N', 'N'),
  L('q3.2', 'plc.L', 'L1'), L('q3.N2', 'plc.N', 'N'),
  // ---- 24 V~ des sorties : Q1 → Q4 → T1 → Q5 → COM0 ----
  L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.3', 'L2'),
  ...liaisonsT1({ retour: 'x2_11.a', terre: 'x1_5.a' }),
  L('x2_11.a', 'x1_5.a', 'PE'),
  L('f3.2', 'plc.COM0', 'C'),
  // ---- sorties relais ----
  L('plc.Q0.0', 'km1.A1', 'C'), L('plc.Q0.1', 'km2.A1', 'C'), L('plc.Q0.2', 'x2_10.a', 'C'),
  L('km1.A2', 'x2_11.a', 'C0'), L('km2.A2', 'km1.A2', 'C0'),
  // ---- 24 V⎓ capteurs du M221 : COM des entrées au 0 V (logique positive) ----
  L('plc.0V', 'plc.COM', 'DC-'), L('plc.0V', 'x2_9.a', 'DC-'),
  L('plc.+24', 'x2_1.a', 'DC+'), L('x2_1.a', 'x2_12.a', 'DC+'),
  // ---- entrées : X2 → I0.0 à I0.6 ----
  L('x2_2.a', 'plc.I0.0', 'DC+'), L('x2_3.a', 'plc.I0.1', 'DC+'), L('x2_4.a', 'plc.I0.2', 'DC+'),
  L('x2_5.a', 'plc.I0.3', 'DC+'), L('x2_6.a', 'plc.I0.4', 'DC+'), L('x2_7.a', 'plc.I0.5', 'DC+'),
  L('x2_8.a', 'plc.I0.6', 'DC+'),
  // ---- porte : S0 arrêt d'urgence à clé (NF) et S2 ouverture intérieure (NO) ----
  L('x2_1.b', 'S0.21', 'DC+', 'door'), L('S0.22', 'x2_2.b', 'DC+', 'door'),
  L('x2_1.b', 'S2.13', 'DC+', 'door'), L('S2.14', 'x2_4.b', 'DC+', 'door'),
  // ---- terrain (installateur) : capteurs du portail et feu ----
  PRE('x2_12.b', 'S1.X1', 'DC+'), PRE('S1.X2', 'x2_3.b', 'DC+'),
  PRE('x2_12.b', 'S3.X1', 'DC+'), PRE('S3.X2', 'x2_5.b', 'DC+'),
  PRE('x2_12.b', 'S4.X1', 'DC+'), PRE('S4.X2', 'x2_6.b', 'DC+'),
  PRE('x2_12.b', 'S5.X1', 'DC+'), PRE('S5.X2', 'x2_9.b', 'DC-'), PRE('S5.X3', 'x2_7.b', 'DC+'),
  PRE('x2_12.b', 'S6.X1', 'DC+'), PRE('S6.X2', 'x2_8.b', 'DC+'),
  PRE('x2_10.b', 'H1.X1', 'C'), PRE('x2_11.b', 'H1.X2', 'C0'),
];

/** Réseaux des bornes (nature et condition de présence de tension). */
function netsEcobike(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live']) => {
    for (const id of ids) n[id] = { net, live };
  };
  const ab = (b: string) => [`${b}.a`, `${b}.b`];
  // bornier X1
  set(ab('x1_1'), 'L1', 'always'); set(ab('x1_2'), 'L2', 'always'); set(ab('x1_3'), 'L3', 'always');
  set(ab('x1_4'), 'N', 'always'); set(ab('x1_5'), 'PE', 'always'); set(ab('x1_9'), 'PE', 'always');
  set(ab('x1_6'), 'U', 'run'); set(ab('x1_7'), 'V', 'run'); set(ab('x1_8'), 'W', 'run');
  // Q1 et Q2
  set(['q1.1'], 'L1', 'always'); set(['q1.3'], 'L2', 'always'); set(['q1.5'], 'L3', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2', 'gv.1', 'gv.2'], 'L1', 'q1'); set(['q1.4', 'gv.3', 'gv.4'], 'L2', 'q1');
  set(['q1.6', 'gv.5', 'gv.6'], 'L3', 'q1'); set(['q1.N2'], 'N', 'q1');
  // inverseur
  set(['km1.1', 'km2.5'], 'L1', 'q1'); set(['km1.3', 'km2.3'], 'L2', 'q1'); set(['km1.5', 'km2.1'], 'L3', 'q1');
  set(['km1.2', 'km2.2'], 'U', 'run'); set(['km1.4', 'km2.4'], 'V', 'run'); set(['km1.6', 'km2.6'], 'W', 'run');
  set(['km1.13', 'km1.14', 'km2.13', 'km2.14'], 'C', 'off');
  set(['km1.A1'], 'C', 'km1'); set(['km2.A1'], 'C', 'off'); set(['km1.A2', 'km2.A2'], 'C0', 'always');
  // Q3 et automate (230 V)
  set(['q3.1', 'q3.2', 'plc.L'], 'L1', 'q1'); set(['q3.N', 'q3.N2', 'plc.N'], 'N', 'q1');
  // Q4, T1, Q5
  set(['f2.1'], 'L1', 'q1'); set(['f2.3'], 'L2', 'q1'); set(['f2.2'], 'L1', 'f2'); set(['f2.4'], 'L2', 'f2');
  Object.assign(n, netsT1('f2'));
  n['f3.1'] = { net: 'C', live: 'f2' }; n['f3.2'] = { net: 'C', live: 'f3' };
  n['f3.N'] = { net: 'C0', live: 'always' }; n['f3.N2'] = { net: 'C0', live: 'always' };
  set(['plc.COM0'], 'C', 'ctl'); set(['plc.COM1'], 'C', 'off');
  set(['plc.Q0.0'], 'C', 'km1'); set(['plc.Q0.1'], 'C', 'off'); set(['plc.Q0.2'], 'C', 'km1');
  set(['plc.Q0.3', 'plc.Q0.4', 'plc.Q0.5', 'plc.Q0.6'], 'C', 'off');
  set(ab('x2_10'), 'C', 'km1'); set(ab('x2_11'), 'C0', 'always');
  set(['H1.X1'], 'C', 'km1'); set(['H1.X2'], 'C0', 'always');
  // 24 V⎓ capteurs : présent dès que l'automate est alimenté (Q1 et Q3 fermés)
  set(['plc.+24', ...ab('x2_1'), ...ab('x2_12')], 'DC+', 'q1');
  set(['plc.0V', 'plc.COM', ...ab('x2_9')], 'DC-', 'q1');
  // entrées au repos, portail FERMÉ : S0 (NF) passant, S3 actionné ; les autres ouverts
  set(['plc.I0.0', ...ab('x2_2'), 'S0.21', 'S0.22'], 'DC+', 'q1');
  set(['plc.I0.3', ...ab('x2_5'), 'S3.X1', 'S3.X2'], 'DC+', 'q1');
  set(['plc.I0.1', ...ab('x2_3'), 'S1.X2'], 'DC+', 'off');
  set(['plc.I0.2', ...ab('x2_4'), 'S2.14'], 'DC+', 'off');
  set(['plc.I0.4', ...ab('x2_6'), 'S4.X2'], 'DC+', 'off');
  set(['plc.I0.5', ...ab('x2_7'), 'S5.X3'], 'DC+', 'off');
  set(['plc.I0.6', ...ab('x2_8'), 'S6.X2'], 'DC+', 'off');
  set(['plc.I0.7', 'plc.I0.8'], 'DC+', 'off');
  set(['S1.X1', 'S2.13', 'S4.X1', 'S5.X1', 'S6.X1'], 'DC+', 'q1');
  set(['S5.X2'], 'DC-', 'q1');
  // moteur
  set(['M.U1'], 'U', 'run'); set(['M.V1'], 'V', 'run'); set(['M.W1'], 'W', 'run'); set(['M.PE'], 'PE', 'run');
  set(['M.U2', 'M.V2', 'M.W2'], 'M2', 'run');
  return n;
}

/** Question de préparation (raccourci d'écriture : la bonne réponse est toujours la première). */
const Q = (
  id: string, rep: string, invite: string, options: string[], why: string,
  schema: 'puissance' | 'commande' = 'puissance', focus?: string,
) => ({ id, rep, invite, options, answer: 0, why, schema, focus: focus ?? (rep.includes(' ') ? undefined : rep) });

/** Case du Grafcet à compléter. */
const C = (id: string, invite: string, options: string[], why: string) =>
  ({ id, rep: 'Grafcet', invite, options, answer: 0, why });

const GF_ETIQUETTES = [
  '%I0.0 · %I0.3 · (%I0.1 + %I0.2)', '%Q0.2', '%TM1.Q', '%Q0.0', '%I0.4', '%TM3.Q · %I0.0',
  '%I0.2 + %I0.5 + %I0.6', '%I0.3', '%Q0.1', '%TM3.Q', '%I0.5', '%I0.1 · %I0.2',
];
/** Options d'une case : la bonne d'abord, puis trois leurres pris dans les étiquettes. */
const opts = (bonne: string, ...leurres: string[]) => [bonne, ...leurres];

export const TP_ECOBIKE_PORTAIL: TpDefinition = {
  id: 'ecobike-portail',
  title: 'Écobike · Portail coulissant piloté par automate M221',
  level: 'Tle Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C1 Analyser', 'C3 Concevoir', 'C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  diplomas: ['bacpro'],
  summary:
    'Chantier Écobike (sujet CGM MELEC 2023, partie B). Portail coulissant d\'accès au local à vélos : ouverture par badge RFID, fermeture automatique après 20 s, sécurités cellule, barre palpeuse et arrêt d\'urgence à clé. Moteur 0,37 kW sur inverseur, automate M221, Grafcet à programmer.',
  situation:
    'Le lycée Louis Couffignal construit l\'Écobike, un local qui accueille et recharge 32 vélos à assistance électrique. L\'accès est réservé aux 100 membres du personnel équipés d\'un badge. Le coffret du portail est posé, les capteurs sont montés sur le portail et câblés jusqu\'au bornier X2. Tu identifies le matériel, tu câbles le coffret depuis le pupitre d\'alimentation, tu programmes le Grafcet dans le M221, puis tu livres le portail après les essais de sécurité.',
  plaque: {
    P: '0,37 kW',
    U: '230 / 400 V · Y sur 400 V',
    In: '0,82 A',
    η: '83,6 %',
    'cos φ': '0,78',
    Automate: 'TM221CE16R',
    Portail: '3 m · coulissant',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE depuis le pupitre d\'alimentation, arrivée sur X1' },
    { k: 'Tête', v: 'Q1 interrupteur-sectionneur 4P cadenassable : organe de consignation' },
    { k: 'Moteur', v: 'motoréducteur asynchrone 0,37 kW, 230 / 400 V, couplé en étoile' },
    { k: 'Protection moteur', v: 'Q2 disjoncteur moteur, réglé au courant nominal calculé' },
    { k: 'Deux sens', v: 'inverseur LC2D09B7 : KM1.1 ouverture, KM1.2 fermeture (L1 et L3 croisées), verrouillage mécanique' },
    { k: 'Automate', v: 'M221 TM221CE16R alimenté en 230 V par Q3 ; 24 V⎓ capteurs ; COM des entrées au 0 V' },
    { k: 'Sorties', v: 'COM0 au 24 V~ de T1 (Q4 primaire, Q5 secondaire) : Q0.0 KM1.1 · Q0.1 KM1.2 · Q0.2 feu H1' },
    { k: 'Entrées', v: 'I0.0 S0 AU à clé (NF) · I0.1 S1 badge · I0.2 S2 BP intérieur · I0.3 S3 fermé · I0.4 S4 ouvert · I0.5 S5 cellule PNP · I0.6 S6 barre palpeuse' },
    { k: 'Fonctionnement', v: 'badge ou BP → feu 3 s → ouverture → 20 s → fermeture ; cellule, barre ou BP pendant la fermeture → feu 3 s → réouverture' },
    { k: 'Avant mise en service', v: 'consignation · VAT · continuité PE · isolement 500 V · essais fonctionnels de toutes les sécurités' },
  ],
  pupitre: [
    { rep: 'S0', kind: 'nc', color: 'red', latching: true, label: 'arrêt d\'urgence à clé' },
    { rep: 'S2', kind: 'no', color: 'green', label: 'ouverture depuis l\'intérieur' },
  ],
  preparation: {
    identification: [
      Q('id-pup', 'Pupitre', 'Que désigne le bloc à gauche du coffret ?', [
        'Le pupitre d\'alimentation de l\'atelier', 'Le tableau général basse tension du lycée', 'Un coffret de chantier', 'L\'onduleur de l\'Écobike',
      ], 'C\'est le pupitre d\'alimentation de l\'atelier : un départ 3 × 400 V + N + PE verrouillable, et cinq douilles d\'où partent les cordons vers X1.', 'puissance', 'X1'),
      Q('id-q1', 'Q1', 'Quel appareil porte le repère Q1 ?', [
        'Un interrupteur-sectionneur 4P cadenassable', 'Un disjoncteur différentiel', 'Un contacteur', 'Un sectionneur porte-fusibles',
      ], 'Q1 est l\'interrupteur-sectionneur de tête imposé par le sujet (B.2) : il coupe les 4 conducteurs actifs et se cadenasse.'),
      Q('id-q2', 'Q2', 'Quel appareil porte le repère Q2 ?', [
        'Un disjoncteur moteur magnétothermique', 'Un relais thermique seul', 'Un interrupteur différentiel', 'Un fusible gG',
      ], 'Q2 est un disjoncteur moteur (GV2) : il réunit protection magnétique et thermique dans un seul appareil.'),
      Q('id-km11', 'KM1.1', 'Que représente KM1.1 ?', [
        'Le contacteur « ouverture » de l\'inverseur', 'Un relais temporisé', 'Un disjoncteur moteur', 'Un télérupteur',
      ], 'KM1.1 et KM1.2 sont les deux contacteurs accouplés du contacteur-inverseur LC2D09B7.', 'puissance', 'KM1'),
      Q('id-km12', 'KM1.2', 'Que représente KM1.2 ?', [
        'Le contacteur « fermeture » de l\'inverseur', 'Un contacteur étoile-triangle', 'Un relais de sécurité', 'Un sectionneur',
      ], 'KM1.2 est le second contacteur de l\'inverseur, câblé avec deux phases croisées.', 'puissance', 'KM2'),
      Q('id-m1', 'M1', 'Que désigne M1 ?', [
        'Le motoréducteur asynchrone triphasé 0,37 kW', 'Un moteur à courant continu', 'Un vérin électrique', 'Un moteur pas à pas',
      ], 'M1 est le motoréducteur du portail : moteur asynchrone triphasé et réducteur à pignon sur crémaillère.', 'puissance', 'M'),
      Q('id-q3', 'Q3', 'Quel appareil porte le repère Q3 ?', [
        'Un disjoncteur 1P+N', 'Un disjoncteur moteur', 'Un interrupteur différentiel 4P', 'Un parafoudre',
      ], 'Q3 est un disjoncteur phase + neutre : il alimente et protège l\'automate en 230 V.', 'commande', 'Q3'),
      Q('id-t1', 'T1', 'Que désigne T1 ?', [
        'Le transformateur de commande 400 / 24 V', 'Une alimentation à découpage 24 V⎓', 'Un autotransformateur', 'Un variateur',
      ], 'T1 abaisse 400 V en 24 V~, protégé par Q4 au primaire et Q5 au secondaire.', 'commande', 'T1'),
      Q('id-a1', 'A1', 'Que désigne A1 ?', [
        'L\'automate programmable M221', 'Un relais de sécurité', 'Une centrale d\'alarme', 'Une horloge programmable',
      ], 'A1 est le Modicon M221 TM221CE16R : 9 entrées, 7 sorties relais. Le même que dans ton TP précédent.', 'commande', 'A1'),
      Q('id-h1', 'H1', 'Que désigne H1 ?', [
        'Le feu orange clignotant', 'Un voyant de défaut', 'Un projecteur à détection', 'Un gyrophare d\'alarme incendie',
      ], 'H1 est le feu orange clignotant posé sur le pilier du portail.', 'commande', 'H1'),
      Q('id-s0', 'S0', 'Que désigne S0 ?', [
        'Un arrêt d\'urgence à clé', 'Un bouton marche', 'Un interrupteur de position', 'Un contact de porte',
      ], 'S0 est l\'arrêt d\'urgence à clé (XB5AS9445) : une fois enfoncé, il reste verrouillé jusqu\'au déverrouillage à clé.', 'commande', 'S0'),
      Q('id-s1', 'S1', 'Que désigne S1 ?', [
        'Un lecteur de badge RFID 125 kHz', 'Un digicode', 'Un détecteur de présence', 'Un récepteur radio',
      ], 'S1 est le lecteur RFID basse fréquence (LP ROX) : son contact sec se ferme quand un badge autorisé est présenté.', 'commande', 'S1'),
      Q('id-s2', 'S2', 'Que désigne S2 ?', [
        'Un bouton-poussoir à contact NO', 'Un bouton coup de poing', 'Un interrupteur à clé', 'Un fin de course',
      ], 'S2 est le bouton d\'ouverture placé à l\'intérieur du local.', 'commande', 'S2'),
      Q('id-s3', 'S3', 'Que désigne S3 ?', [
        'Un interrupteur de position (fin de course)', 'Un détecteur inductif', 'Un bouton-poussoir', 'Une cellule',
      ], 'S3 est un fin de course à galet XCKL115, actionné par le portail quand il est fermé.', 'commande', 'S3'),
      Q('id-s4', 'S4', 'Que désigne S4 ?', [
        'Un interrupteur de position (fin de course)', 'Une barre palpeuse', 'Un capteur de niveau', 'Un contacteur',
      ], 'S4 est le même fin de course, actionné quand le portail est ouvert.', 'commande', 'S4'),
      Q('id-s5', 'S5', 'Que désigne S5 ?', [
        'Un détecteur photoélectrique reflex PNP', 'Un détecteur inductif NPN', 'Un lecteur de badge', 'Un interrupteur crépusculaire',
      ], 'S5 est la cellule reflex XUB1BPANL2 et son réflecteur XUZC50 : 3 fils, sortie PNP, portée 4 m.', 'commande', 'S5'),
      Q('id-s6', 'S6', 'Que désigne S6 ?', [
        'Une barre palpeuse', 'Un joint d\'étanchéité', 'Un fin de course', 'Une butée mécanique',
      ], 'S6 est la barre palpeuse CMM200/J fixée sur le bord d\'attaque du portail.', 'commande', 'S6'),
    ],
    fonctions: [
      Q('fn-q1', 'Q1', 'À quoi sert Q1 dans cette installation ?', [
        'Isoler toute l\'installation et permettre la consignation', 'Protéger le moteur des surcharges', 'Inverser le sens de rotation', 'Alimenter l\'automate',
      ], 'Q1 sépare le coffret du réseau et se cadenasse : c\'est l\'organe de consignation.'),
      Q('fn-q2', 'Q2', 'À quoi sert Q2 ?', [
        'Protéger le moteur contre les courts-circuits et les surcharges', 'Commander la marche du moteur', 'Détecter un défaut d\'isolement 30 mA', 'Couper la commande 24 V',
      ], 'Le déclencheur magnétique coupe le court-circuit, le thermique la surcharge (B.2.2).'),
      Q('fn-km11', 'KM1.1', 'Quelle est la fonction de KM1.1 ?', [
        'Établir et couper le courant du moteur dans le sens ouverture', 'Protéger contre les surcharges', 'Mémoriser l\'état du portail', 'Signaler le mouvement',
      ], 'Un contacteur établit, supporte et interrompt le courant en service normal (B.2.4).', 'puissance', 'KM1'),
      Q('fn-km12', 'KM1.2', 'Comment KM1.2 fait-il tourner le moteur dans l\'autre sens ?', [
        'Il l\'alimente avec deux phases croisées (L1 et L3)', 'Il inverse les trois phases', 'Il coupe une phase', 'Il change la fréquence',
      ], 'On inverse le sens en permutant DEUX des trois phases (B.2.5).', 'puissance', 'KM2'),
      Q('fn-a1', 'A1', 'Quelle est la fonction de l\'automate dans le portail ?', [
        'Lire les capteurs et commander le portail selon le Grafcet', 'Protéger le moteur', 'Transformer le 400 V en 24 V', 'Enregistrer la vidéo',
      ], 'Le M221 exécute le programme : il lit I0.0 à I0.6 et commande Q0.0 à Q0.2.', 'commande', 'A1'),
      Q('fn-t1', 'T1', 'À quoi sert le 24 V~ fourni par T1 ?', [
        'À alimenter le commun COM0 des sorties, donc les bobines et le feu', 'À alimenter l\'automate', 'À alimenter les capteurs', 'À charger une batterie',
      ], 'Les sorties relais sont des contacts secs : le 24 V~ arrive par COM0 et repart vers la charge commandée.', 'commande', 'T1'),
      Q('fn-h1', 'H1', 'Pourquoi le feu orange H1 ?', [
        'Prévenir les passants que le portail va bouger ou bouge', 'Éclairer l\'entrée la nuit', 'Signaler un défaut thermique', 'Indiquer la présence du 400 V',
      ], 'Obligatoire sur un portail automatique en domaine public : il clignote avant et pendant chaque mouvement.', 'commande', 'H1'),
      Q('fn-s0', 'S0', 'À quoi sert S0 ?', [
        'Interdire tout mouvement du portail jusqu\'au déverrouillage à clé', 'Ouvrir le portail', 'Détecter le portail fermé', 'Réarmer le disjoncteur',
      ], 'Contact NF : l\'entrée I0.0 est à 1 quand S0 est relâché. Le Grafcet exige I0.0 pour démarrer ou refermer.', 'commande', 'S0'),
      Q('fn-s1', 'S1', 'À quoi sert S1 ?', [
        'Autoriser l\'ouverture aux badges du personnel', 'Compter les vélos', 'Détecter un obstacle', 'Allumer l\'éclairage',
      ], 'Seuls les 100 badges attribués ferment le contact du lecteur.', 'commande', 'S1'),
      Q('fn-s3s4', 'S3 / S4', 'À quoi servent S3 et S4 ?', [
        'Informer l\'automate que le portail est fermé (S3) ou ouvert (S4)', 'Arrêter le portail en urgence', 'Détecter une personne', 'Compter les passages',
      ], 'Les fins de course donnent les deux positions extrêmes : ce sont des réceptivités du Grafcet.', 'commande', 'S3'),
      Q('fn-s5s6', 'S5 / S6', 'À quoi servent S5 et S6 pendant la fermeture ?', [
        'Détecter un obstacle et faire rouvrir le portail', 'Arrêter le portail en fin de course', 'Mesurer la vitesse', 'Éclairer le passage',
      ], 'La cellule détecte sans contact, la barre palpeuse au contact : dans les deux cas, le portail repasse en ouverture.', 'commande', 'S5'),
    ],
    calculs: [
      Q('ca-pa', 'Pa', 'Puissance absorbée par le moteur (Pu = 370 W, η = 83,6 %) :', [
        'Pa = Pu / η ≈ 443 W', 'Pa = Pu × η ≈ 309 W', 'Pa = Pu ≈ 370 W', 'Pa = Pu / cos φ ≈ 474 W',
      ], 'Le rendement fait perdre de la puissance : on en absorbe plus qu\'on n\'en restitue. 370 / 0,836 = 443 W.', 'puissance', 'M'),
      Q('ca-in', 'In', 'Intensité nominale absorbée sous 400 V (cos φ = 0,78) :', [
        'I = Pa / (√3 × U × cos φ) ≈ 0,82 A', 'I = Pa / (U × cos φ) ≈ 1,42 A', 'I = Pu / (√3 × U) ≈ 0,53 A', 'I = Pa / (3 × U) ≈ 0,37 A',
      ], '443 / (1,732 × 400 × 0,78) = 0,82 A.', 'puissance', 'M'),
      Q('ca-coup', 'Couplage', 'Plaque 230 / 400 V sur un réseau 400 V : quel couplage ?', [
        'Étoile : chaque enroulement reçoit 230 V', 'Triangle : chaque enroulement reçoit 400 V', 'Étoile-triangle au démarrage', 'Peu importe',
      ], 'La petite tension de la plaque (230 V) est celle d\'un enroulement : sur 400 V, l\'étoile lui donne 400 / √3 = 230 V.', 'puissance', 'M'),
      Q('ca-gv', 'Q2', 'Quel disjoncteur moteur et quel réglage pour In = 0,82 A ?', [
        'GV2-ME05 (0,63 à 1 A) réglé à 0,82 A', 'GV2-ME06 (1 à 1,6 A) réglé à 1 A', 'GV2-ME07 (1,6 à 2,5 A) réglé à 1,6 A', 'GV2-ME04 (0,4 à 0,63 A) réglé à 0,63 A',
      ], 'On règle le thermique à In, et In doit être dans la plage. Avec le ME06 (réponse du corrigé officiel), le réglage minimal de 1 A dépasse In : le moteur ne serait pas protégé d\'une petite surcharge.', 'puissance', 'Q2'),
      Q('ca-sens', 'KM1.2', 'Pour changer de sens, combien de phases faut-il permuter ?', [
        'Deux', 'Une', 'Trois', 'Aucune, on inverse le neutre',
      ], 'Permuter deux phases inverse le champ tournant. Permuter les trois revient au même ordre.', 'puissance', 'KM2'),
    ],
    adressage: [
      Q('ad-s3', '%I0.3', 'Le fin de course S3 est câblé sur l\'entrée I0.3. Quelle adresse dans le programme ?', [
        '%I0.3', '%Q0.3', '%M3', '%IW0.3',
      ], '%I = entrée TOR, module 0, voie 3.', 'commande', 'S3'),
      Q('ad-km11', '%Q0.0', 'KM1.1 est commandé par la sortie Q0.0. Quelle adresse ?', [
        '%Q0.0', '%I0.0', '%QW0', '%M0',
      ], '%Q = sortie TOR.', 'commande', 'A1'),
      Q('ad-type', 'Type', 'Quel type de donnée pour ces entrées et sorties ?', [
        'Booléen (0 ou 1) : tout ou rien', 'Entier 16 bits', 'Réel', 'Chaîne de caractères',
      ], 'Un contact est ouvert ou fermé : c\'est un bit, donc un booléen.', 'commande', 'A1'),
      Q('ad-com', 'COM', 'La cellule S5 est PNP. Où doit être relié le COM des entrées du M221 ?', [
        'Au 0 V : logique positive, le capteur renvoie le + 24 V sur l\'entrée', 'Au + 24 V', 'À la terre', 'Nulle part',
      ], 'Un capteur PNP « source » le + 24 V : l\'entrée doit donc se refermer sur le 0 V par son COM.', 'commande', 'S5'),
      Q('ad-tm', '%TM1', 'Comment l\'automate compte-t-il les 3 s de l\'étape 1 ?', [
        'Avec un temporisateur %TM1 lancé par l\'étape, sa sortie %TM1.Q passe à 1 au bout de 3 s', 'Avec un compteur %C1', 'Avec une entrée %I0.7', 'Il ne peut pas',
      ], 'Le bloc temporisateur %TMi a une valeur de présélection (3 s) et une sortie .Q.', 'commande', 'A1'),
    ],
    grafcetQuiz: [
      { id: 'gq-init', rep: 'Grafcet', invite: 'Quelle(s) étape(s) sont actives au démarrage ?', options: [
        'L\'étape initiale, dessinée en carré double', 'Toutes les étapes', 'Aucune', 'La dernière étape',
      ], answer: 0, why: 'L\'étape initiale est active à la mise en route ; toutes les autres sont inactives.' },
      { id: 'gq-fran', rep: 'Grafcet', invite: 'La réceptivité est vraie mais l\'étape au-dessus est inactive. Que se passe-t-il ?', options: [
        'Rien : la transition n\'est pas franchie', 'L\'étape suivante s\'active quand même', 'Le Grafcet redémarre', 'Toutes les étapes s\'activent',
      ], answer: 0, why: 'Règle 1 : il faut l\'étape amont ACTIVE et la réceptivité VRAIE.' },
      { id: 'gq-act', rep: 'Grafcet', invite: 'Où écrit-on ce que commande une étape ?', options: [
        'Dans le rectangle d\'action, à sa droite', 'Sur la transition', 'Dans le carré de l\'étape', 'Sous la liaison',
      ], answer: 0, why: 'L\'action est dans un rectangle relié à l\'étape : elle dure tant que l\'étape est active.' },
      { id: 'gq-pdv', rep: 'Grafcet', invite: 'Dans le Grafcet de programmation, comment s\'écrit « portail fermé » ?', options: [
        '%I0.3', '« Portail fermé »', '%Q0.3', 'S3 = fermé',
      ], answer: 0, why: 'Point de vue partie commande : on écrit les adresses de l\'automate, ici l\'entrée du fin de course S3.' },
    ],
    grafcet: {
      cases: [
        C('t01', 'Transition 0 → 1 : conditions de départ du cycle', opts(GF_ETIQUETTES[0], GF_ETIQUETTES[11], '%I0.1 + %I0.2', '%I0.0 · %I0.4'),
          'AU relâché (%I0.0), portail fermé (%I0.3), ET badge OU bouton (%I0.1 + %I0.2).'),
        C('a1', 'Action de l\'étape 1', opts('%Q0.2', '%Q0.0', '%Q0.1', '%I0.2'),
          'L\'étape 1 ne fait que clignoter le feu (Q0.2) pendant 3 s, avant tout mouvement.'),
        C('t12', 'Transition 1 → 2', opts('%TM1.Q', '%TM3.Q', '%I0.4', '%I0.3'),
          '%TM1 est lancé par l\'étape 1 et vaut 3 s : sa sortie %TM1.Q valide la transition.'),
        C('a2', 'Première action de l\'étape 2', opts('%Q0.0', '%Q0.1', '%Q0.2', '%I0.0'),
          'Étape 2 : ouverture, donc KM1.1 sur la sortie Q0.0, avec le feu.'),
        C('t23', 'Transition 2 → 3', opts('%I0.4', '%I0.3', '%I0.5', '%TM1.Q'),
          'On attend le portail ouvert : fin de course S4, entrée I0.4.'),
        C('t34', 'Transition 3 → 4', opts('%TM3.Q · %I0.0', '%TM3.Q', '%I0.0', '%TM1.Q · %I0.0'),
          'Deux conditions : les 20 s de %TM3 sont écoulées ET l\'arrêt d\'urgence est relâché.'),
        C('t45', 'Transition 4 → 5 (réouverture)', opts('%I0.2 + %I0.5 + %I0.6', '%I0.5', '%I0.2 · %I0.5 · %I0.6', '%I0.3'),
          'BP intérieur OU cellule OU barre palpeuse : une seule suffit à faire rouvrir.'),
        C('t40', 'Transition 4 → 0 (fin de fermeture)', opts('%I0.3', '%I0.4', '%TM5.Q', '%I0.0'),
          'Le portail est fermé quand S3 (I0.3) est actionné : retour à l\'étape initiale.'),
      ],
    },
  },
  puissance: {
    phases: ['L1', 'L2', 'L3'],
    reseau: '3 × 400 V + N + PE',
    organes: [
      { type: 'bornier', rep: 'X1', legende: 'arrivée pupitre', bornes: [['1', ''], ['2', ''], ['3', '']] },
      { type: 'sectionneur', rep: 'Q1', legende: 'interrupteur-sectionneur 4P', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      { type: 'disjoncteur', rep: 'Q2', legende: 'disjoncteur moteur · 0,82 A', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      {
        type: 'contacteur', rep: 'KM1', legende: 'KM1.1 ouverture · Q0.0', bornes: [['1', '2'], ['3', '4'], ['5', '6']],
        paire: { rep: 'KM2', legende: 'KM1.2 fermeture · L1 et L3 croisées', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      },
      { type: 'bornier', rep: 'X1', legende: 'départ moteur', bornes: [['6', ''], ['7', ''], ['8', '']] },
    ],
    moteur: { rep: 'M', legende: '0,37 kW · 400 V Y · 0,82 A' },
  },
  postes: [
    {
      id: 'q1', name: 'Q1 · Organe de tête',
      need: 'Isoler les 4 conducteurs actifs du coffret et permettre la consignation',
      options: [
        { key: 'mcb4p', ref: 'Interrupteur-sectionneur 4P 20 A cadenassable', spec: '4 pôles · poignée cadenassable', ok: true, why: 'Coupure pleinement apparente des 4 pôles et condamnation par cadenas : c\'est l\'organe de consignation demandé.' },
        { key: 'mcb4p', ref: 'Disjoncteur 4P C16 non cadenassable', spec: '4 pôles · courbe C', half: true, why: 'Il coupe les 4 pôles, mais sans dispositif de condamnation la consignation n\'est pas possible.' },
        { key: 'fuseswitch', ref: 'Sectionneur porte-fusibles 3P', spec: '3 pôles · cartouches', why: 'Le neutre n\'est pas coupé : l\'automate, alimenté en phase + neutre, ne serait pas totalement isolé.' },
      ],
    },
    {
      id: 'gv', name: 'Q2 · Disjoncteur moteur',
      need: 'Protéger le moteur, In = 0,82 A',
      options: [
        { key: 'motorcb', ref: 'GV2-ME05', spec: '0,63 – 1 A · magnétique 13 A', ok: true, why: 'In = 0,82 A est dans la plage : on règle le thermique exactement à 0,82 A.' },
        { key: 'motorcb', ref: 'GV2-ME06', spec: '1 – 1,6 A · magnétique 22,5 A', half: true, why: 'Réponse du corrigé officiel, mais le réglage minimal (1 A) dépasse In : une surcharge de 20 % passerait sans déclencher.' },
        { key: 'motorcb', ref: 'GV2-ME08', spec: '2,5 – 4 A', why: 'Plage trois fois trop haute : le moteur n\'est pas protégé.' },
      ],
    },
    {
      id: 'km', name: 'KM1.1 / KM1.2 · Contacteur-inverseur',
      need: '0,37 kW en AC-3, bobines commandées par les sorties relais en 24 V~, verrouillage mécanique',
      options: [
        { key: 'kontakt', ref: 'LC2D09B7', spec: '9 A AC-3 · bobines 24 V~ · 1 NO + 1 NF · verrouillage mécanique', ok: true, why: 'Bobines 24 V~ comme le COM0, calibre largement suffisant, verrouillage mécanique intégré.' },
        { key: 'kontakt', ref: 'LC2D09BD', spec: '9 A AC-3 · bobines 24 V⎓', half: true, why: 'Référence du sujet, prévue pour le WAGO en 24 V⎓. Avec le 24 V~ de T1 sur les sorties relais, les bobines continues ne tiennent pas correctement.' },
        { key: 'kontakt', ref: 'LC2D09P7', spec: '9 A AC-3 · bobines 230 V~', why: 'Bobines 230 V : elles ne colleront pas sous 24 V.' },
      ],
    },
    {
      id: 'plc', name: 'A1 · Automate programmable',
      need: '7 entrées TOR 24 V⎓ et 3 sorties capables de commander des bobines 24 V~',
      options: [
        { key: 'plc', img: '/sprites/plc16r.png', ref: 'TM221CE16R', spec: '9 entrées 24 V⎓ · 7 sorties relais 2 A · 100-240 V~', ok: true, why: 'Sorties relais (contacts secs) : elles commutent le 24 V~ des bobines. 9 entrées pour 7 capteurs.' },
        { key: 'plc', img: '/sprites/plc16t.png', ref: 'TM221CE16T', spec: '9 entrées · 7 sorties transistor 24 V⎓', why: 'Sorties transistor : elles ne commutent que du continu, pas le 24 V~ des bobines.' },
        { key: 'plc', img: '/sprites/plc40r.png', ref: 'TM221C40R', spec: '24 entrées · 16 sorties relais', half: true, why: 'Convient, mais très surdimensionné pour 7 entrées et 3 sorties.' },
      ],
    },
    {
      id: 'q3', name: 'Q3 · Protection de l\'automate',
      need: 'Alimenter et protéger le M221 en 230 V (phase + neutre)',
      options: [
        { key: 'mcb1pn', ref: 'iC60N 1P+N C2', spec: '2 A · phase + neutre', ok: true, why: 'L\'automate consomme quelques dizaines de VA : 2 A protège ses conducteurs et coupe phase et neutre.' },
        { key: 'mcb1pn', ref: 'iC60N 1P+N C16', spec: '16 A · phase + neutre', why: 'Calibre sans rapport avec la consommation de l\'automate et ses conducteurs 1,5 mm².' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · 1 pôle', half: true, why: 'Protège, mais laisse le neutre raccordé pendant l\'intervention.' },
      ],
    },
    { id: 't1', name: 'T1 · Alimentation des sorties', need: 'Fournir le 24 V~ des deux bobines et du feu par le commun COM0', options: [...POSTE_T1_OPTIONS] },
    {
      id: 'rfid', name: 'S1 · Contrôle d\'accès',
      need: 'Lecteur basse fréquence et 100 badges pour le personnel',
      options: [
        { key: 'lecteurrfid', ref: 'LP ROX + 100 badges ICB-CRF-EM42', spec: '125 kHz · contact sec', ok: true, why: 'Basse fréquence 125 kHz, badges EM compatibles, contact sec vers l\'entrée I0.1 (B.1.5).' },
        { key: 'lecteurrfid', ref: 'Lecteur 13,56 MHz + badges EM', spec: 'haute fréquence', why: 'Fréquences différentes : le lecteur ne lit pas les badges EM 125 kHz.' },
        { key: 'lecteurrfid', ref: 'Digicode à 4 chiffres', spec: 'clavier', half: true, why: 'Fonctionne, mais un code se transmet : le cahier des charges demande un badge par personne.' },
      ],
    },
    {
      id: 'cell', name: 'S5 · Cellule du passage',
      need: 'Détecter une personne ou un vélo, sortie compatible avec le COM des entrées au 0 V',
      options: [
        { key: 'cellule', ref: 'XUB1BPANL2 + réflecteur XUZC50', spec: 'reflex · 3 fils · PNP NO · 4 m', ok: true, why: 'Reflex pour un objet volumineux à moyenne distance, sortie PNP : elle renvoie le + 24 V sur l\'entrée (B.1.9).' },
        { key: 'cellule', ref: 'XUB1BNANL2', spec: 'reflex · 3 fils · NPN NO', why: 'Sortie NPN : elle commute le 0 V, alors que les entrées sont en logique positive. La cellule ne serait jamais vue.' },
        { key: 'cellule', ref: 'Détecteur inductif Ø 18', spec: 'portée 8 mm', why: 'Un inductif ne détecte que du métal, à quelques millimètres : inutilisable pour un passage de 3 m.' },
      ],
    },
    {
      id: 'fc', name: 'S3 / S4 · Fins de course',
      need: 'Galet, 2 sens d\'attaque, action brusque, IP 66 en extérieur',
      options: [
        { key: 'limitswitch', ref: 'XCKL115', spec: 'galet · NO + NF brusque · IP 66', ok: true, why: 'Tête angulaire à 2 sens, contacts à action brusque et indice adapté à l\'extérieur (B.1.7).' },
        { key: 'limitswitch', ref: 'XCKJ plastique IP 54', spec: 'IP 54', half: true, why: 'Fonctionne, mais l\'indice IP 54 est juste pour un portail exposé aux intempéries.' },
        { key: 'limitswitch', ref: 'Détecteur inductif', spec: 'sans contact', why: 'Pas de galet à 2 sens d\'attaque : ce n\'est pas l\'appareil demandé.' },
      ],
    },
    {
      id: 'secu', name: 'H1 / S6 / S0 · Sécurité du portail',
      need: 'Feu 7 cd extérieur, barre palpeuse 2 contacts, arrêt d\'urgence à clé',
      options: [
        { key: 'feuorange', ref: 'Feu 0 413 81 + base 0 413 92 · CMM200/J · XB5AS9445', spec: 'feu 24 V · barre 2 contacts · AU à clé NF', ok: true, why: 'Les trois références du dossier (B.1.11 à B.1.13).' },
        { key: 'feuorange', ref: 'Voyant Ø 22 orange · joint caoutchouc · coup de poing NO', spec: 'voyant de pupitre', why: 'Un voyant de pupitre ne se voit pas de la rue, et un arrêt d\'urgence à contact NO n\'est pas une sécurité positive.' },
        { key: 'feuorange', ref: 'Gyrophare 230 V · barre 1 contact · AU sans clé', spec: '230 V', half: true, why: 'Le gyrophare 230 V ne peut pas être commandé par le COM0 en 24 V, et l\'AU sans clé peut être réarmé par n\'importe qui.' },
      ],
    },
  ],
  rails: [150, 350, 550, 750],
  armoire: 920,
  gaines: [
    { id: 'g1', rep: 'G1', x: 70, diam: 25, nature: 'force', contenu: '5 conducteurs 2,5 mm² · L1 L2 L3 N PE', vers: 'pupitre d’alimentation de l’atelier', dessert: ['RES.'] },
    { id: 'g2', rep: 'G2', x: 140, diam: 20, nature: 'force', contenu: '4 conducteurs 1,5 mm² · U1 V1 W1 PE', vers: 'motoréducteur du portail', dessert: ['M.'] },
    { id: 'g3', rep: 'G3', x: 300, diam: 20, nature: 'tbts', contenu: '4 conducteurs 1,5 mm² · fins de course S3 et S4', vers: 'rail du portail', dessert: ['S3.', 'S4.'] },
    { id: 'g4', rep: 'G4', x: 380, diam: 20, nature: 'tbts', contenu: '5 conducteurs 1,5 mm² · cellule S5 (3 fils) et barre palpeuse S6', vers: 'passage du portail', dessert: ['S5.', 'S6.'] },
    { id: 'g5', rep: 'G5', x: 460, diam: 20, nature: 'tbts', contenu: '4 conducteurs 1,5 mm² · lecteur RFID S1 et feu H1', vers: 'pilier du portail', dessert: ['S1.', 'H1.'] },
    { id: 'g6', rep: 'G6', x: 520, diam: 16, nature: 'tbts', contenu: '4 conducteurs 1,5 mm² · porte : S0 et S2', vers: 'porte du coffret', dessert: ['S0.', 'S2.'] },
  ],
  goulotteDePied: false,
  slots: [
    { id: 'q1', label: 'Q1 · Interrupteur-sectionneur 4P cadenassable', key: 'mcb4p', rail: 0, x: 46, rep: 'Q1' },
    { id: 'gv', label: 'Q2 · Disjoncteur moteur GV2-ME05 · réglé 0,82 A', key: 'motorcb', rail: 0, x: 164, rep: 'Q2' },
    { id: 'q3', label: 'Q3 · Alimentation 230 V de l\'automate · 1P+N', key: 'mcb1pn', rail: 0, x: 244, rep: 'Q3' },
    { id: 'f2', label: 'Q4 · Primaire T1', key: 'mcb2ph', rail: 0, x: 310, rep: 'Q4' },
    { id: 'f3', label: 'Q5 · Secondaire 24 V~ · phase + neutre', key: 'mcb1pn', rail: 0, x: 376, rep: 'Q5' },
    { id: 't1', label: 'T1 · Transformateur 100 VA · 400 / 24 V', key: 'trafoleg', rail: 1, x: 46, rep: 'T1' },
    { id: 'km1', label: 'KM1.1 · Contacteur ouverture', key: 'kontakt', rail: 1, x: 200, rep: 'KM1.1' },
    { id: 'km2', label: 'KM1.2 · Contacteur fermeture', key: 'kontakt', rail: 1, x: 272, rep: 'KM1.2' },
    { id: 'plc', label: 'A1 · Automate M221 TM221CE16R', key: 'plc', rail: 2, x: 46, rep: 'A1' },
    ...X1(46, 3),
    ...X2E,
  ],
  annexItems: [],
  recvItems: [
    { key: 'lecteurrfid', rep: 'S1', name: 'lecteur de badge RFID · pilier', x: 318, y: 36, w: 30, h: 56, recv: true },
    { key: 'feuorange', rep: 'H1', name: 'feu orange clignotant · pilier', x: 352, y: 22, w: 30, h: 72, recv: true },
    { key: 'limitswitch', rep: 'S3', name: 'fin de course · portail fermé', x: 386, y: 32, w: 30, h: 70, recv: true },
    { key: 'limitswitch', rep: 'S4', name: 'fin de course · portail ouvert', x: 420, y: 32, w: 30, h: 70, recv: true },
    { key: 'cellule', rep: 'S5', name: 'cellule reflex PNP · passage', x: 454, y: 40, w: 36, h: 50, recv: true },
    { key: 'barrepalpeuse', rep: 'S6', name: 'barre palpeuse · bord du portail', x: 496, y: 18, w: 26, h: 84, recv: true },
  ],
  liaisons: LIAISONS,
  nets: netsEcobike(),
  plcIo: [
    { io: 'I0.0', label: 'S0 arrêt d\'urgence à clé (NF), par X2:2', device: 'porte du coffret' },
    { io: 'I0.1', label: 'S1 lecteur de badge RFID (contact sec), par X2:3', device: 'pilier du portail' },
    { io: 'I0.2', label: 'S2 bouton d\'ouverture intérieur (NO), par X2:4', device: 'porte du coffret' },
    { io: 'I0.3', label: 'S3 fin de course portail fermé, par X2:5', device: 'rail du portail' },
    { io: 'I0.4', label: 'S4 fin de course portail ouvert, par X2:6', device: 'rail du portail' },
    { io: 'I0.5', label: 'S5 cellule reflex PNP (fil noir), par X2:7', device: 'passage' },
    { io: 'I0.6', label: 'S6 barre palpeuse, par X2:8', device: 'portail' },
    { io: 'Q0.0', label: 'KM1.1 ouverture (bobine A1)', device: 'inverseur' },
    { io: 'Q0.1', label: 'KM1.2 fermeture (bobine A1)', device: 'inverseur' },
    { io: 'Q0.2', label: 'H1 feu orange, par X2:10', device: 'pilier du portail' },
    { io: 'COM', label: 'commun des entrées relié au 0 V (logique positive)', device: 'automate' },
    { io: 'COM0', label: 'commun des sorties Q0.0 à Q0.3 au 24 V~ de T1 (Q5:2)', device: 'transformateur' },
  ],
  plcSorties: { 'Q0.0': 'km1', 'Q0.1': 'off', 'Q0.2': 'km1' },
  essaisPortail: true,
  tests: [
    ...BASE_TESTS,
    {
      id: 'verr',
      title: 'Verrouillage mécanique de l\'inverseur',
      how: 'Consigné, pousse à la main les équipages mobiles de KM1.1 et KM1.2 : le verrouillage mécanique doit interdire de fermer les deux ensemble.',
      expected: 'jamais les deux contacteurs fermés ensemble',
    },
    {
      id: 'entrees',
      title: 'Continuité des entrées',
      how: 'Multimètre en Ω entre X2:1 et chaque borne X2:2 à X2:8, en actionnant le capteur concerné : le contact doit se fermer puis s\'ouvrir.',
      expected: '≈ 0 Ω actionné · OL au repos (sauf S0, NF)',
    },
  ],
  mesures: [
    { id: 'rpe', title: 'Continuité du PE jusqu\'à la carcasse du moteur', stage: 'horsTension', instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'M.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'riso', title: 'Isolement U1 / PE sous 500 V', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'M.U1', b: 'M.PE', min: 0.5, max: 9999, unit: 'MΩ' },
    { id: 'renr', title: 'Résistance de l\'enroulement U (U1 – U2)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.U2', min: 15, max: 28, unit: 'Ω' },
    { id: 'u400', title: 'Tension composée en aval de Q1', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'ctl' },
    { id: 'u230', title: 'Alimentation 230 V de l\'automate (L – N)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'plc.L', b: 'plc.N', min: 220, max: 240, unit: 'V', when: 'ctl' },
    { id: 'u24dc', title: 'Alimentation capteurs du M221 (+24 / 0V)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'plc.+24', b: 'plc.0V', min: 22, max: 26, unit: 'V', when: 'ctl' },
    { id: 'u24', title: '24 V~ au secondaire de T1', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 't1.24b', b: 't1.0a', min: 22, max: 26, unit: 'V', when: 'ctl' },
    { id: 'iL', title: 'Courant de ligne à la pince, portail en ouverture (KM1.1:2 → X1:6)', stage: 'sousTension', instrument: 'clamp', dial: 'A~', wire: 'km1.2>x1_6.a', min: 0.6, max: 1.0, unit: 'A', when: 'run' },
  ],
  faults: [
    {
      id: 'com0', title: 'Commun COM0 non relié au 24 V~',
      symptom: 'Au badge, le voyant de la sortie Q0.0 s\'allume sur l\'automate, mais ni KM1.1 ni le feu ne s\'enclenchent.',
      fix: 'Relier COM0 à Q5:2 (24 V~ de T1) : ce commun porte Q0.0 à Q0.3.',
      coupe: 'f3.2>plc.COM0', action: 'Relier le commun COM0 au 24 V~ (Q5:2)',
    },
    {
      id: 'comin', title: 'COM des entrées non relié au 0 V',
      symptom: 'Aucun voyant d\'entrée ne s\'allume, même S0 relâché et portail fermé. Le portail ne réagit à rien.',
      fix: 'Relier la borne COM des entrées au 0 V du M221 : sans lui, aucun courant ne traverse les entrées.',
      coupe: 'plc.0V>plc.COM', action: 'Relier le COM des entrées au 0 V',
    },
    {
      id: 'a1', title: 'Fil Q0.0 → A1 de KM1.1 débranché',
      symptom: 'Q0.0 est active (voyant allumé), le feu clignote, mais KM1.1 ne colle pas : le portail ne s\'ouvre pas.',
      fix: 'Reconnecter le fil de Q0.0 sur la borne A1 de KM1.1.',
      coupe: 'plc.Q0.0>km1.A1', action: 'Reconnecter la sortie Q0.0 sur A1 de KM1.1',
    },
    {
      id: 'l2', title: 'Phase L2 coupée entre Q2 et l\'inverseur',
      symptom: 'Le moteur ronfle sans entraîner le portail, puis Q2 déclenche.',
      fix: 'Refaire la liaison Q2:4 → KM1.1:3 et réarmer Q2.',
      coupe: 'gv.4>km1.3', action: 'Refaire la liaison Q2:4 → KM1.1:3',
    },
    {
      id: 'cell', title: 'Fil noir de la cellule S5 desserré au bornier',
      symptom: 'Pendant la fermeture, passer devant la cellule ne fait pas rouvrir le portail ; le voyant I0.5 reste éteint.',
      fix: 'Resserrer le fil X2:7 → I0.5 et refaire l\'essai de réouverture.',
      coupe: 'x2_7.a>plc.I0.5', action: 'Resserrer la liaison X2:7 → I0.5',
    },
    {
      id: 'f3', title: 'Q5 déclenché (défaut sur le 24 V~)',
      symptom: 'L\'automate est en RUN et ses voyants de sortie s\'allument, mais rien ne bouge : 0 V sur COM0, 24 V au secondaire de T1.',
      fix: 'Chercher le défaut d\'isolement sur le 24 V~, puis réarmer Q5.',
      ouvre: 'f3', action: 'Chercher le défaut sur le 24 V~ puis réarmer Q5',
    },
  ],
  quiz: [
    { q: 'Quel appareil assure la consignation du coffret ?', options: ['Q2 disjoncteur moteur', 'Q1 interrupteur-sectionneur 4P cadenassable', 'KM1.1', 'L\'automate'], answer: 1 },
    { q: 'Pourquoi le COM des entrées est-il relié au 0 V ?', options: ['Pour la terre', 'Parce que la cellule est PNP : elle renvoie le + 24 V sur l\'entrée', 'Pour alimenter les sorties', 'Par habitude'], answer: 1 },
    { q: 'Que fait le portail si la cellule est coupée pendant la fermeture ?', options: ['Il s\'arrête définitivement', 'Il repasse par le feu 3 s puis se rouvre', 'Il accélère', 'Rien'], answer: 1 },
    { q: 'Quelle adresse commande le feu orange ?', options: ['%I0.2', '%Q0.2', '%Q0.0', '%TM1'], answer: 1 },
    { q: 'Pourquoi un LC2D09B7 et pas un LC2D09BD ici ?', options: ['Il est moins cher', 'Les sorties relais sont alimentées en 24 V~ : il faut des bobines alternatives', 'Il est plus petit', 'Il n\'y a aucune différence'], answer: 1 },
    { q: 'Quel réglage pour le disjoncteur moteur ?', options: ['1 A', '0,82 A, le courant nominal', '1,6 A', '22,5 A'], answer: 1 },
  ],
  motor: { P: 370, U: 400, In: 0.82, n: 1380, ns: 1500, cosPhi: 0.78 },
  trafo: { slot: 't1', ...TRAFO_REF },
  uContinu: 24,
  station: true,
  hasMotor: true,
};
