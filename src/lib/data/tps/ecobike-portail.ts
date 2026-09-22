/**
 * TP 2 · Portail coulissant de l'Écobike piloté par M221 — v2, démarche en deux temps.
 *
 * Tiré du sujet CGM MELEC 2023, partie B (corrigé B.1 à B.3). Même démarche que les TP 1
 * (`ecobike-pv.ts`), 3 (`ecobike-knx.ts`) et 4 (`ecobike-reseau.ts`), validée sur maquette :
 *
 *  - Temps A · COMPRENDRE (préparation) : sept blocs appuyés sur les DOCUMENTS RÉELS du
 *    dossier, affichés dans le TP (`preparation.documents`) — ① principe DTR 1 et
 *    nomenclature DTR 7 ; ② Grafcet (préliminaire, puis grafcet fonctionnel DTR 8) ;
 *    ③ capteurs et sécurités (DTR 9-10, DT 32 à 37) ; ④ moteur et protection (B.2, DT 38-39) ;
 *    ⑤ couplage et plaque à bornes À COMPLÉTER (outil interactif, corrigé B.2.8) ;
 *    ⑥ automate (DTR 12-13, DT 40, table d'adressage WAGO → M221) ; ⑦ grafcet de
 *    programmation B.3.7 (les 8 cases du Grafcet du portail).
 *  - Temps B · RÉALISER comme sur chantier : le matériel du corrigé et ses pièges, le câblage
 *    des folios 01 (puissance) et 02 (commande), la consignation, les mesures, la mise en
 *    service du M221 (`MiseEnServiceM221.tsx` : adressage, %TM1 / %TM3 / %TM5, transfert) et
 *    le banc d'essai animé (`EssaisPortail.tsx`), qui exécute le programme TRANSFÉRÉ.
 *
 * ------------------------------------------------------------ adaptations assumées
 *  - L'automate reste le Modicon M221 TM221CE16R que les élèves connaissent : le sujet utilise
 *    un WAGO 750-891 (bornes 750-430 / 750-504 / 750-600). Son folio 02 est montré tel quel
 *    en document et transposé avec l'élève (%IX0.0 → %I0.0, %QX0.0 → %Q0.0 ;
 *    `SchemaAutomate.tsx`). Le M221 est alimenté en 230 V (L / N) par Q3.
 *  - La commande est en 24 V CONTINU, comme le sujet l'impose : alimentation à découpage AL1
 *    WAGO 787-1012 (230 V~ → 24 V⎓ 2,5 A, DT 40), derrière Q3. Le + 24 V passe par le contact
 *    auxiliaire GV-AE1 13-14 de Q2 (folio 01) avant d'alimenter les capteurs, le commun COM0
 *    des sorties relais, les bobines LC2D09BD (24 V⎓) et le feu H1. Le COM des entrées est au
 *    0 V de AL1 : logique positive, capteurs PNP. Le transformateur T1 et ses protections Q4 /
 *    Q5 de la v1 (24 V~) disparaissent.
 *  - Verrouillage électrique croisé du folio 02 : %Q0.0 → KM1.2 21-22 (NF) → A1 de KM1.1, et
 *    %Q0.1 → KM1.1 21-22 → A1 de KM1.2, en plus du verrouillage mécanique de l'inverseur.
 *  - S0 est câblé par son contact NF (sécurité positive) : %I0.0 vaut 1 AU relâché. Le folio du
 *    sujet câble le NO et teste /S0 ; la question ca-nf fait écrire la différence.
 *  - H1 : feu 0 413 92 (grand modèle, 7 cd) sur base 0 413 81 (12/24 V, IP 65), d'après le
 *    DT 36 (le corrigé cite les deux références sans dire laquelle est la base).
 *
 * ------------------------------------------------------------ topologie / moteur
 * Le moteur de simulation connaît `q1`, `f2`, `f3`, `km1`. Correspondance retenue :
 *   · `q1`  = Q1, interrupteur-sectionneur 4P cadenassable, organe de consignation ;
 *   · `f2`  = Q3, disjoncteur 1P+N C2 : alimente AL1 et l'automate (« commande alimentée ») ;
 *   · `f3`  = Q2, disjoncteur moteur GV2-ME06 ET son GV-AE1 (slot `ae1`, `auxDe: 'f3'`) : la
 *     commande 24 V n'est vivante que Q2 fermé et non déclenché — exactement le rôle du
 *     13-14 en série sur le + 24 V. La panne `f3` (Q2 déclenché, thermique réglé trop bas)
 *     s'en déduit, et se mesure sur le 13-14 ;
 *   · `km1` = KM1.1 (ouverture, sens animé), `km2` = KM1.2 (au repos), `plc` = A1.
 *
 * Documents (`public/tp/ecobike-portail/`) : fichiers nommés d'après leur DTR réel —
 * dt33_34 (lecteur RFID + interrupteurs de position), dt35 (détecteurs photoélectriques),
 * dt36 (signalisation), dt37 (arrêt d'urgence), dt38 (disjoncteurs moteurs), dt39
 * (contacteurs-inverseurs), dt40 (alimentations WAGO), dt41_43 (contrôleur WAGO).
 * `grafcet_sujet.jpg` et `grafcet_prog_sujet.jpg` sont les corrigés B.3.1 / B.3.7 dont on a
 * effacé les réponses (en rouge) ; les corrigés restent servis pour le professeur et montrés
 * au dépannage (`schemaImage.suite`), avec les deux folios corrigés et la plaque B.2.8.
 */
import type { Fault, Liaison, PrepQuestion, Slot, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, X1 } from './common';

/** Documents du dossier, servis depuis `public/tp/ecobike-portail/`. */
const DOC = (f: string) => `/tp/ecobike-portail/${f}`;

/* ------------------------------------------------------------ bornier X2 */

/** Bornier de commande X2 : 11 bornes au pas de 18 px (rail 3, à droite de X1). */
const X2_ROWS: [string, string][] = [
  ['+24', '+24 V⎓ (après Q2 13-14)'], ['S0', 'S0 → %I0.0'], ['S1', 'S1 → %I0.1'], ['S2', 'S2 → %I0.2'],
  ['S3', 'S3 → %I0.3'], ['S4', 'S4 → %I0.4'], ['S5', 'S5 → %I0.5'], ['S6', 'S6 → %I0.6'],
  ['0V', '0 V⎓ de AL1'], ['H1', '%Q0.2 → H1'], ['+24', '+24 V⎓ terrain'],
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
  ...(i === 0 ? { groupLabel: 'X2 · bornier commande 24 V⎓' } : {}),
}));

/* ------------------------------------------------------------ liaisons */

/** Liaisons de l'installateur (câble moteur, câbles des capteurs du portail, en gaines). */
const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

const LIAISONS: Liaison[] = [
  // ======== folio 01 · PUISSANCE ========
  // ---- arrivée depuis le pupitre d'alimentation (cordons) ----
  L('RES.L1', 'x1_1.b', 'L1'), L('RES.L2', 'x1_2.b', 'L2'), L('RES.L3', 'x1_3.b', 'L3'),
  L('RES.N', 'x1_4.b', 'N'), L('RES.PE', 'x1_5.b', 'PE'),
  // ---- X1 → Q1 (4 pôles, neutre compris) ----
  L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'), L('x1_4.a', 'q1.N', 'N'),
  // ---- Q1 → Q2 disjoncteur moteur ----
  L('q1.2', 'f3.1', 'L1'), L('q1.4', 'f3.3', 'L2'), L('q1.6', 'f3.5', 'L3'),
  // ---- inverseur : KM1.1 phases dans l'ordre, KM1.2 L1 et L3 croisées ----
  L('f3.2', 'km1.1', 'L1'), L('f3.4', 'km1.3', 'L2'), L('f3.6', 'km1.5', 'L3'),
  L('f3.2', 'km2.5', 'L1'), L('f3.4', 'km2.3', 'L2'), L('f3.6', 'km2.1', 'L3'),
  L('km2.2', 'km1.2', 'L1'), L('km2.4', 'km1.4', 'L2'), L('km2.6', 'km1.6', 'L3'),
  L('km1.2', 'x1_6.a', 'L1'), L('km1.4', 'x1_7.a', 'L2'), L('km1.6', 'x1_8.a', 'L3'),
  L('x1_5.a', 'x1_9.a', 'PE'),
  // ---- moteur : câble posé, barrettes étoile à poser (B.2.8) ----
  PRE('x1_6.b', 'M.U1', 'L1'), PRE('x1_7.b', 'M.V1', 'L2'), PRE('x1_8.b', 'M.W1', 'L3'), PRE('x1_9.b', 'M.PE', 'PE'),
  L('M.W2', 'M.U2', 'BAR'), L('M.U2', 'M.V2', 'BAR'),
  // ---- Q3 (1P+N sous Q1) → AL1 et l'automate, en 230 V ----
  L('q1.2', 'f2.1', 'L1'), L('q1.N2', 'f2.N', 'N'),
  L('f2.2', 'al1.L', 'L1'), L('f2.N2', 'al1.N', 'N'),
  L('f2.2', 'plc.L', 'L1'), L('f2.N2', 'plc.N', 'N'),
  // ======== folio 02 · COMMANDE 24 V⎓ ========
  // ---- + 24 V de AL1 par le contact GV-AE1 13-14 de Q2, puis X2:1 ----
  L('al1.+24', 'ae1.13', 'C'), L('ae1.14', 'x2_1.a', 'C'), L('x2_1.a', 'x2_11.a', 'C'),
  L('x2_1.a', 'plc.COM0', 'C'),
  // ---- 0 V de AL1 : bornier, COM des entrées (logique positive) ----
  L('al1.0V', 'x2_9.a', 'C0'), L('al1.0V', 'plc.COM', 'C0'),
  // ---- entrées : X2 → %I0.0 à %I0.6 ----
  L('x2_2.a', 'plc.I0.0', 'C'), L('x2_3.a', 'plc.I0.1', 'C'), L('x2_4.a', 'plc.I0.2', 'C'),
  L('x2_5.a', 'plc.I0.3', 'C'), L('x2_6.a', 'plc.I0.4', 'C'), L('x2_7.a', 'plc.I0.5', 'C'),
  L('x2_8.a', 'plc.I0.6', 'C'),
  // ---- sorties relais, verrouillage électrique croisé (folio 02) ----
  L('plc.Q0.0', 'km2.21', 'C'), L('km2.22', 'km1.A1', 'C'),
  L('plc.Q0.1', 'km1.21', 'C'), L('km1.22', 'km2.A1', 'C'),
  L('plc.Q0.2', 'x2_10.a', 'C'),
  L('x2_9.a', 'km1.A2', 'C0'), L('km1.A2', 'km2.A2', 'C0'),
  // ---- porte : S0 arrêt d'urgence à clé (NF) et S2 ouverture intérieure (NO) ----
  L('x2_1.b', 'S0.21', 'C', 'door'), L('S0.22', 'x2_2.b', 'C', 'door'),
  L('x2_1.b', 'S2.13', 'C', 'door'), L('S2.14', 'x2_4.b', 'C', 'door'),
  // ---- terrain (installateur) : capteurs du portail et feu ----
  PRE('x2_11.b', 'S1.X1', 'C'), PRE('S1.X2', 'x2_3.b', 'C'),
  PRE('x2_11.b', 'S3.X1', 'C'), PRE('S3.X2', 'x2_5.b', 'C'),
  PRE('x2_11.b', 'S4.X1', 'C'), PRE('S4.X2', 'x2_6.b', 'C'),
  PRE('x2_11.b', 'S5.X1', 'C'), PRE('S5.X2', 'x2_9.b', 'C0'), PRE('S5.X3', 'x2_7.b', 'C'),
  PRE('x2_11.b', 'S6.X1', 'C'), PRE('S6.X2', 'x2_8.b', 'C'),
  PRE('x2_10.b', 'H1.X1', 'C'), PRE('H1.X2', 'x2_9.b', 'C0'),
];

/* ------------------------------------------------------------ réseaux */

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
  // Q1
  set(['q1.1'], 'L1', 'always'); set(['q1.3'], 'L2', 'always'); set(['q1.5'], 'L3', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2'], 'L1', 'q1'); set(['q1.4'], 'L2', 'q1'); set(['q1.6'], 'L3', 'q1'); set(['q1.N2'], 'N', 'q1');
  // Q2 (`f3`) : aval vif si Q1 fermé ET Q2 fermé, non déclenché
  set(['f3.1'], 'L1', 'q1'); set(['f3.3'], 'L2', 'q1'); set(['f3.5'], 'L3', 'q1');
  set(['f3.2', 'km1.1', 'km2.5'], 'L1', 'q1f3'); set(['f3.4', 'km1.3', 'km2.3'], 'L2', 'q1f3');
  set(['f3.6', 'km1.5', 'km2.1'], 'L3', 'q1f3');
  // inverseur : sorties vers le moteur
  set(['km1.2', 'km2.2'], 'U', 'run'); set(['km1.4', 'km2.4'], 'V', 'run'); set(['km1.6', 'km2.6'], 'W', 'run');
  // Q3 (`f2`), AL1 et automate en 230 V
  set(['f2.1'], 'L1', 'q1'); set(['f2.N'], 'N', 'q1');
  set(['f2.2', 'al1.L', 'plc.L'], 'L1', 'f2'); set(['f2.N2', 'al1.N', 'plc.N'], 'N', 'f2');
  // 24 V⎓ : sortie de AL1 dès Q3 fermé ; après le 13-14 de Q2, seulement commande vivante
  set(['al1.+24', 'ae1.13'], 'C', 'f2');
  set(['ae1.14', ...ab('x2_1'), ...ab('x2_11'), 'plc.COM0'], 'C', 'ctl');
  set(['al1.0V', 'plc.COM', ...ab('x2_9'), 'km1.A2', 'km2.A2'], 'C0', 'always');
  // entrées au repos, portail FERMÉ : S0 (NF) passant, S3 actionné ; les autres ouverts
  set(['S0.21', 'S0.22', ...ab('x2_2'), 'plc.I0.0'], 'C', 'ctl');
  set(['S3.X1', 'S3.X2', ...ab('x2_5'), 'plc.I0.3'], 'C', 'ctl');
  set(['S1.X1', 'S2.13', 'S4.X1', 'S5.X1', 'S6.X1'], 'C', 'ctl');
  set(['S1.X2', ...ab('x2_3'), 'plc.I0.1'], 'C', 'off');
  set(['S2.14', ...ab('x2_4'), 'plc.I0.2'], 'C', 'off');
  set(['S4.X2', ...ab('x2_6'), 'plc.I0.4'], 'C', 'off');
  set(['S5.X3', ...ab('x2_7'), 'plc.I0.5'], 'C', 'off');
  set(['S6.X2', ...ab('x2_8'), 'plc.I0.6'], 'C', 'off');
  set(['S5.X2', 'H1.X2'], 'C0', 'always');
  // sorties : Q0.0 (ouverture, sens animé) et Q0.2 (feu) suivent KM1.1 ; Q0.1 au repos
  set(['plc.Q0.0', 'km2.21', 'km2.22', 'km1.A1'], 'C', 'km1');
  set(['plc.Q0.1', 'km1.21', 'km1.22', 'km2.A1'], 'C', 'off');
  set(['plc.Q0.2', ...ab('x2_10'), 'H1.X1'], 'C', 'km1');
  // moteur
  set(['M.U1'], 'U', 'run'); set(['M.V1'], 'V', 'run'); set(['M.W1'], 'W', 'run'); set(['M.PE'], 'PE', 'run');
  set(['M.U2', 'M.V2', 'M.W2'], 'M2', 'run');
  return n;
}

/** Bornes qui ne reçoivent plus rien quand la panne les a isolées. */
const hors = (ids: string[]): Record<string, Partial<TerminalNet>> =>
  Object.fromEntries(ids.map(id => [id, { live: 'off' as const }]));

/* ------------------------------------------------------------ pannes */

const FAULTS: Fault[] = [
  {
    id: 'sens', title: 'KM1.1 et KM1.2 permutés sur %Q0.0 / %Q0.1',
    symptom: 'Au badge, le feu clignote 3 s, puis c’est KM1.2 qui colle : le moteur force en fermeture contre la butée, le portail ne s’ouvre pas. Le voyant %Q0.0 est pourtant allumé.',
    fix: 'Consigner, puis remettre la sortie %Q0.0 sur la chaîne de KM1.1 (par le NF 21-22 de KM1.2) et %Q0.1 sur celle de KM1.2. Refaire l’essai d’ouverture.',
    croise: ['plc.Q0.0>km2.21', 'plc.Q0.1>km1.21'],
    // %Q0.0 alimente désormais la chaîne de KM1.2, %Q0.1 celle de KM1.1
    nets: { ...hors(['km2.21', 'km2.22', 'km1.A1']), 'km1.21': { live: 'km1' }, 'km1.22': { live: 'km1' }, 'km2.A1': { live: 'km1' } },
    action: 'Remettre %Q0.0 sur la chaîne de KM1.1 et %Q0.1 sur celle de KM1.2',
  },
  {
    id: 'a1', title: 'Fil KM1.2:22 → A1 de KM1.1 débranché',
    symptom: 'Au badge, le feu clignote 3 s puis rien : le voyant %Q0.0 est allumé, mais KM1.1 ne colle pas et le portail ne s’ouvre pas.',
    fix: 'Reconnecter le fil du NF 22 de KM1.2 sur la borne A1 de KM1.1, puis refaire l’essai.',
    coupe: 'km2.22>km1.A1', nets: hors(['km1.A1']),
    action: 'Reconnecter le fil KM1.2:22 sur A1 de KM1.1',
  },
  {
    id: 'barrette', title: 'Barrette de couplage U2–V2 absente sur la plaque à bornes',
    symptom: 'Au badge, le moteur ronfle, le portail avance à peine puis Q2 déclenche au bout de quelques secondes. Les trois phases sont pourtant présentes au bornier X1.',
    fix: 'Consigner, ouvrir la plaque à bornes, reposer la barrette U2–V2 (étoile : W2-U2-V2 réunies), contrôler les enroulements à l’ohmmètre, réarmer Q2.',
    coupe: 'M.U2>M.V2', monophase: true,
    action: 'Reposer la barrette U2–V2 sur la plaque à bornes du moteur',
  },
  {
    id: 'l2', title: 'Phase L2 coupée entre Q2 et KM1.1',
    symptom: 'À l’ouverture, le moteur ronfle sans entraîner le portail, puis Q2 déclenche. La fermeture, elle, démarre normalement.',
    fix: 'Refaire la liaison Q2:4 → KM1.1:3 et réarmer Q2.',
    coupe: 'f3.4>km1.3', nets: hors(['km1.3']),
    action: 'Refaire la liaison Q2:4 → KM1.1:3',
  },
  {
    id: 'au', title: 'Contact NF de S0 débranché',
    symptom: 'Rien ne démarre, ni au badge ni au bouton : le voyant %I0.0 est éteint alors que l’arrêt d’urgence est déverrouillé.',
    fix: 'Resserrer le fil S0:22 → X2:2 en porte, vérifier le contact NF de S0 à l’ohmmètre (≈ 0 Ω relâché).',
    coupe: 'S0.22>x2_2.b', nets: hors(['S0.22', 'x2_2.a', 'x2_2.b', 'plc.I0.0']),
    action: 'Resserrer le fil S0:22 → X2:2',
  },
  {
    id: 'cell', title: 'Fil noir de la cellule S5 desserré au bornier',
    symptom: 'Pendant la fermeture, passer devant la cellule ne fait pas rouvrir le portail ; le voyant %I0.5 reste éteint.',
    fix: 'Resserrer le fil X2:7 → %I0.5 et refaire l’essai de réouverture.',
    coupe: 'x2_7.a>plc.I0.5',
    action: 'Resserrer la liaison X2:7 → %I0.5',
  },
  {
    id: 'comin', title: 'COM des entrées non relié au 0 V de AL1',
    symptom: 'Aucun voyant d’entrée ne s’allume, même AU relâché et portail fermé. Le portail ne réagit à rien ; AL1 donne pourtant ses 24 V.',
    fix: 'Relier la borne COM des entrées au 0 V de AL1 : sans lui, aucun courant ne traverse les entrées.',
    coupe: 'al1.0V>plc.COM', nets: { 'plc.COM': { net: 'C', live: 'ctl' } },
    action: 'Relier le COM des entrées au 0 V de AL1',
  },
  {
    id: 'com0', title: 'Commun COM0 non relié au + 24 V',
    symptom: 'Au badge, le voyant de la sortie %Q0.0 s’allume sur l’automate, mais ni KM1.1 ni le feu ne s’enclenchent.',
    fix: 'Relier COM0 à X2:1 (+ 24 V après Q2 13-14) : ce commun porte %Q0.0 à %Q0.3.',
    coupe: 'x2_1.a>plc.COM0',
    nets: hors(['plc.COM0', 'plc.Q0.0', 'km2.21', 'km2.22', 'km1.A1', 'plc.Q0.2', 'x2_10.a', 'x2_10.b', 'H1.X1']),
    action: 'Relier le commun COM0 au + 24 V (X2:1)',
  },
  {
    id: 'f3', title: 'Q2 réglé à 0,63 A : un GV2-ME05 posé à la place du GV2-ME06',
    symptom: 'À chaque ouverture, le portail démarre puis Q2 déclenche peu après : le moteur s’arrête, le feu s’éteint, plus aucun voyant d’entrée. Le moteur n’est pas chaud ; réarmé, Q2 redéclenche.',
    fix: 'Lire la plaque et la molette de Q2 : GV2-ME05 réglé à 0,63 A, sous In = 0,82 A. Poser le GV2-ME06 du dossier, régler le thermique à 1 A, réarmer.',
    ouvre: 'f3',
    action: 'Remplacer Q2 par le GV2-ME06, régler le thermique à 1 A et réarmer',
  },
  {
    id: 'tm3', title: '%TM3 réglé à 5 s au lieu de 20 s',
    symptom: 'Le portail s’ouvre normalement au badge, puis se referme au bout de 5 s au lieu de 20 : un cycliste n’a pas le temps de passer. Toutes les mesures sont conformes.',
    fix: 'Aucune mesure ne la montre : éliminer une à une les pannes de câblage, puis lire la présélection de %TM3 dans le programme. La régler à 20 s (DTR 8) et transférer.',
    reglage: '%TM3 = 5 s',
    action: 'Régler la présélection de %TM3 à 20 s et transférer le programme',
  },
];

/* ------------------------------------------------------------ préparation */

/** Question de préparation : la bonne réponse est toujours la première (l'ordre est mélangé à l'affichage). */
const Q = (id: string, rep: string, doc: string, invite: string, options: string[], why: string): PrepQuestion =>
  ({ id, rep, doc, invite, options, answer: 0, why });

/** Case du Grafcet de programmation à compléter. */
const C = (id: string, invite: string, options: string[], why: string): PrepQuestion =>
  ({ id, rep: 'Grafcet', invite, options, answer: 0, why, doc: 'prog' });

/** Table d'adressage : entrées et sorties, WAGO (DTR 12-13) → M221. */
const ADRESSES: [string, string, string][] = [
  ['S0', 'Arrêt d’urgence à clef', '%IX0.0'], ['S1', 'Lecteur de badge', '%IX0.1'], ['S2', 'BP ouverture', '%IX0.2'],
  ['S3', 'Fin de course fermeture', '%IX0.3'], ['S4', 'Fin de course ouverture', '%IX0.4'],
  ['S5', 'Cellule photoélectrique', '%IX0.5'], ['S6', 'Barre palpeuse', '%IX0.6'],
  ['KM1.1', 'Contacteur ouverture', '%QX0.0'], ['KM1.2', 'Contacteur fermeture', '%QX0.1'], ['H1', 'Feu clignotant', '%QX0.2'],
];

export const TP_ECOBIKE_PORTAIL: TpDefinition = {
  id: 'ecobike-portail',
  title: 'Écobike · Portail coulissant piloté par M221 (TP 2)',
  level: 'Tle Bac Pro MELEC',
  family: 'ind',
  classement: {
    domaine: 'IND',
    domainesSecondaires: ['INF'],
    sousDomaine: 'IND.api',
    activites: [], // déduites par classementDe()
    motsCles: ['M221', 'portail', 'CGM 2023', 'Écobike'],
  },
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C1 Analyser', 'C3 Concevoir', 'C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  diplomas: ['bacpro'],
  summary:
    'Chantier Écobike (sujet CGM MELEC 2023, partie B). Portail coulissant de 3 m du local à vélos : ouverture '
    + 'par badge RFID ou bouton intérieur, fermeture automatique après 20 s, sécurités cellule, barre palpeuse et '
    + 'arrêt d’urgence à clé. Moteur 0,37 kW sur inverseur LC2D09BD, GV2-ME06 + GV-AE1, commande 24 V⎓ par AL1, '
    + 'automate M221 (transposé du WAGO du sujet). Temps A : comprendre sur les documents réels (principe, DTR 7 à '
    + '13, fiches DT 32 à 40), compléter la plaque à bornes et le grafcet de programmation. Temps B : câbler '
    + 'd’après les folios 01 et 02, consigner, mesurer, mettre le M221 en service et essayer le portail.',
  situation:
    'Le lycée Louis Couffignal construit l’Écobike, un local qui accueille et recharge 32 vélos à assistance '
    + 'électrique. L’accès est réservé aux 100 membres du personnel équipés d’un badge. Tu étudies d’abord le '
    + 'portail sur les documents du dossier — dessin de principe, nomenclature, grafcet fonctionnel, fiches '
    + 'constructeur — pour choisir chaque capteur, calculer la protection du moteur et préparer le programme. Puis '
    + 'tu réalises le coffret comme sur le chantier : choix du matériel, câblage d’après les folios 01 et 02, '
    + 'consignation, mesures, mise en service du M221 (adresses, temporisations) et essais de sécurité devant le '
    + 'portail.',
  plaqueTitre: 'PORTAIL COULISSANT · MOTORÉDUCTEUR M1',
  plaque: {
    P: '0,37 kW',
    U: '230 / 400 V',
    η: '83,6 %',
    'cos φ': '0,78',
    In: 'à calculer (B.2.1)',
    Réseau: '3 × 400 V + N + PE',
    Commande: '24 V⎓ · AL1',
    Automate: 'TM221CE16R',
    Portail: '3 m · coulissant',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE depuis le pupitre d’alimentation de l’atelier, arrivée sur X1' },
    { k: 'Tête', v: 'Q1 interrupteur-sectionneur 4P cadenassable : organe de consignation' },
    { k: 'Moteur', v: 'motoréducteur asynchrone 0,37 kW, 230 / 400 V, η = 83,6 %, cos φ = 0,78 — couplage à déterminer (B.2.7)' },
    { k: 'Protection moteur', v: 'Q2 disjoncteur moteur GV2-ME06 (DT 38), thermique réglé à 1 A, contact auxiliaire GV-AE1 en série sur le + 24 V' },
    { k: 'Deux sens', v: 'contacteur-inverseur LC2D09BD (bobines 24 V⎓) : KM1.1 ouverture, KM1.2 fermeture (L1 et L3 croisées), verrouillages mécanique et électrique' },
    { k: 'Commande', v: 'Q3 1P+N C2 → AL1 WAGO 787-1012 : 230 V~ → 24 V⎓ 2,5 A · le M221 est alimenté en 230 V par Q3' },
    { k: 'Automate', v: 'M221 TM221CE16R à la place du WAGO 750-891 du sujet : COM des entrées au 0 V (logique positive), COM0 au + 24 V⎓' },
    { k: 'Entrées', v: '%I0.0 S0 AU à clé (NF) · %I0.1 S1 badge · %I0.2 S2 BP intérieur · %I0.3 S3 fermé · %I0.4 S4 ouvert · %I0.5 S5 cellule PNP · %I0.6 S6 barre palpeuse' },
    { k: 'Sorties', v: '%Q0.0 KM1.1 ouverture · %Q0.1 KM1.2 fermeture · %Q0.2 feu H1' },
    { k: 'Fonctionnement', v: 'DTR 8 : badge ou BP → feu 3 s → ouverture → attente 20 s → fermeture ; cellule, barre ou BP pendant la fermeture → feu 3 s → réouverture' },
    { k: 'Avant mise en service', v: 'consignation · VAT · continuité PE · isolement 500 V · enroulements · essais fonctionnels de toutes les sécurités' },
  ],
  libelles: { recv: 'Terrain du portail · S1 S3 S4 S5 S6 H1 câblés jusqu’à X2 · M1 et sa plaque à bornes (hors armoire)' },
  pupitre: [
    { rep: 'S0', kind: 'nc', color: 'red', latching: true, label: 'arrêt d\'urgence à clé' },
    { rep: 'S2', kind: 'no', color: 'green', label: 'ouverture depuis l\'intérieur' },
  ],
  schemaImage: {
    titre: 'Folio 01 · puissance',
    src: DOC('puissance_corrige.jpg'),
    legende: 'Folio 01 : schéma du circuit de puissance du portail (corrigé B.2.9) — Q1, Q2 + GV-AE1, KM1.1 / KM1.2, M1, Q3 → AL1',
    suite: [
      { titre: 'Folio 02 · commande', src: DOC('commande_corrige.jpg'), legende: 'Folio 02 : circuit de commande 24 V⎓ (corrigé B.2.10, contrôleur WAGO du sujet) — transposé M221 : %I0.0 à %I0.6, %Q0.0 à %Q0.2' },
      { titre: 'Grafcet B.3.7', src: DOC('grafcet_prog.jpg'), legende: 'B.3.7 : grafcet de programmation (corrigé, adresses WAGO)' },
      { titre: 'Grafcet B.3.1', src: DOC('grafcet_corrige.jpg'), legende: 'B.3.1 : grafcet du point de vue partie commande (corrigé)' },
      { titre: 'Plaque B.2.8', src: DOC('plaque_bornes.jpg'), legende: 'B.2.8 : plaque à bornes du moteur, couplage étoile (corrigé)' },
    ],
  },
  preparation: {
    documents: [
      { id: 'principe', titre: 'DTR 1 · principe', src: DOC('principe.jpg'), legende: 'DTR 1 : dessin de principe du portail coulissant — S0 à S6, feu H1', enonce: true },
      { id: 'dtr7', titre: 'DTR 7', src: DOC('dtr7.jpg'), legende: 'DTR 7 : nomenclature — S0 à S6, KM1.1 ; le portail est piloté par un contrôleur WAGO alimenté en 24 V DC', enonce: true },
      { id: 'dtr8', titre: 'DTR 8 · grafcet', src: DOC('dtr8.jpg'), legende: 'DTR 8 : grafcet fonctionnel du portail coulissant automatisé' },
      { id: 'grafcetpc', titre: 'B.3.1', src: DOC('grafcet_sujet.jpg'), legende: 'B.3.1 : grafcet du point de vue partie commande — à compléter à l’aide du grafcet fonctionnel' },
      { id: 'dtr9', titre: 'DTR 9 · RFID', src: DOC('dtr9.jpg'), legende: 'DTR 9 : lecteurs et badges RFID — principe, composants, fréquences' },
      { id: 'dtr1011', titre: 'DTR 10-11', src: DOC('dtr10_11.jpg'), legende: 'DTR 10 : choix d’un détecteur photoélectrique · DTR 11 : programmation du contrôleur WAGO (CODESYS, langages CEI 61131-3)' },
      { id: 'dt32', titre: 'DT 32 · barre', src: DOC('dt32.jpg'), legende: 'DTR 32 : barres palpeuses CMM200, CMM200/J, CMO200' },
      { id: 'dt3334', titre: 'DT 33-34', src: DOC('dt33_34.jpg'), legende: 'DTR 33 : lecteur de badge LP ROX · DTR 34 : interrupteurs de position XCKM / XCKL' },
      { id: 'dt35', titre: 'DT 35 · cellules', src: DOC('dt35.jpg'), legende: 'DTR 35 : détecteurs photoélectriques Schneider gamme XU (reflex, barrage, PNP / NPN)' },
      { id: 'dt36', titre: 'DT 36 · feu', src: DOC('dt36.jpg'), legende: 'DTR 36 : signalisation lumineuse Legrand — bases et feux à LED' },
      { id: 'dt37', titre: 'DT 37 · AU', src: DOC('dt37.jpg'), legende: 'DTR 37 : arrêt d’urgence Harmony XB5' },
      { id: 'dt38', titre: 'DT 38 · GV2', src: DOC('dt38.jpg'), legende: 'DTR 38 : disjoncteurs moteurs GV2ME et blocs de contacts GVAE' },
      { id: 'dt39', titre: 'DT 39 · inverseur', src: DOC('dt39.jpg'), legende: 'DTR 39 : contacteurs-inverseurs TeSys LC2D et repères de tension des bobines' },
      { id: 'dt40', titre: 'DT 40 · alim.', src: DOC('dt40.jpg'), legende: 'DTR 40 : alimentations WAGO série 787 (entrée 100-240 V AC)' },
      { id: 'dt4143', titre: 'DT 41-43 · WAGO', src: DOC('dt41_43.jpg'), legende: 'DTR 41 à 43 : configuration d’un contrôleur WAGO 750-891 et borne d’extrémité 750-600' },
      { id: 'folio01', titre: 'Folio 01', src: DOC('puissance_sujet.jpg'), legende: 'Folio 01 à compléter (B.2.9) : Q2, KM1.1, KM1.2 et leurs liaisons — Q1, Q3, AL1 et M1 sont donnés' },
      { id: 'dtr1213', titre: 'DTR 12-13', src: DOC('dtr12_13.jpg'), legende: 'DTR 12-13 : adressage des cartes d’entrées (750-430) et de sorties (750-504) du WAGO' },
      {
        id: 'adr', titre: 'B.3.5-6 · M221', legende: 'Tableau d’adressage B.3.5-6 : adresses WAGO du corrigé, transposées sur le M221 — à compléter',
        tableau: {
          entetes: ['Mnémonique', 'Appareil', 'WAGO (DTR 12-13)', 'M221', 'Type'],
          lignes: ADRESSES.map(([m, a, w], i) => [m, a, w, i === 0 ? '%I0.0' : '?', 'BOOL']),
        },
      },
      { id: 'automate', titre: 'Câblage M221', schema: 'automate', legende: 'Transposition du folio 02 sur le M221 : chaque capteur sur son entrée, chaque charge sur sa sortie relais' },
      { id: 'folio02', titre: 'Folio 02', src: DOC('commande_sujet.jpg'), legende: 'Folio 02 à compléter (B.2.10) : raccorder la borne d’entrées 750-430 et la borne de sorties 750-504 du WAGO' },
      { id: 'prog', titre: 'B.3.7', src: DOC('grafcet_prog_sujet.jpg'), legende: 'B.3.7 : grafcet de programmation à compléter — ici avec les adresses du M221' },
    ],
    ordre: ['identification', 'grafcetQuiz', 'fonctions', 'calculs', 'bloc:couplage', 'adressage', 'grafcet'],
    intitules: {
      identification: {
        titre: '① Principe · DTR 1 et nomenclature DTR 7',
        consigne: 'Le dessin de principe est affiché à gauche. Retrouve chaque repère sur le portail, puis dans la nomenclature.',
      },
      grafcetQuiz: {
        titre: '② Grafcet · découvrir, puis lire le DTR 8',
        consigne: 'Quatre questions sur les règles, puis le grafcet fonctionnel réel du portail (DTR 8) et sa traduction en partie commande (B.3.1).',
      },
      fonctions: {
        titre: '③ Capteurs et sécurités · DTR 9, DTR 10, DT 32 à 37',
        consigne: 'Chaque capteur se choisit sur son document : la fiche concernée s’affiche à gauche. C’est ce que tu retrouveras à l’étape matériel.',
      },
      calculs: {
        titre: '④ Moteur et protection · B.2.1 à B.2.6, DT 38-39',
        consigne: 'Plaque du motoréducteur : Pu = 0,37 kW, η = 83,6 %, cos φ = 0,78, 230 / 400 V. Réseau 3 × 400 V.',
      },
      adressage: {
        titre: '⑥ Automate · DTR 12-13, DT 40, transposition M221',
        consigne: 'Le sujet adresse un WAGO ; on programme un M221. Complète la table d’adressage (colonne M221) : la notion est la même, la notation change.',
      },
      grafcet: {
        titre: '⑦ Programme · grafcet de programmation B.3.7',
        consigne: 'Complète les 8 cases avec les adresses du M221 (le document B.3.7 est à gauche). Le sujet écrit « Etape1.t > T#3s » sous CODESYS ; sur le M221, c’est la sortie %TM1.Q d’un temporisateur réglé à 3 s.',
      },
    },
    identification: [
      Q('id-h1', 'H1', 'principe', 'Sur le dessin de principe, quel élément est posé au sommet du pilier, à droite ?', [
        'Le feu orange clignotant H1', 'Le lecteur de badge S1', 'La cellule photoélectrique S5', 'L’arrêt d’urgence S0',
      ], 'H1 prévient les passants : il clignote avant et pendant chaque mouvement. Il doit se voir de la rue, d’où sa place en haut du pilier.'),
      Q('id-s0', 'S0', 'dtr7', 'D’après la nomenclature DTR 7, que désigne S0 ?', [
        'Le bouton d’arrêt d’urgence à clef', 'Le bouton poussoir d’ouverture', 'Le fin de course fermeture', 'Le lecteur de badge',
      ], 'S0 : arrêt d’urgence à clef, sur le pilier. Une fois enfoncé il reste verrouillé : seul le détenteur de la clé remet le portail en service.'),
      Q('id-s1', 'S1', 'principe', 'Le boîtier S1 fixé sur le pilier, côté rue, est…', [
        'Le lecteur de badge RFID (entrée)', 'Un interphone', 'Un détecteur de mouvement', 'Le bouton d’ouverture intérieur',
      ], 'Les membres du personnel présentent leur badge devant S1 ; le lecteur signale alors à l’automate qu’un badge autorisé est lu.'),
      Q('id-s2', 'S2', 'dtr7', 'Et S2, à côté de S0 ?', [
        'Le bouton poussoir d’ouverture', 'Un second arrêt d’urgence', 'Le réarmement de Q2', 'La commande de fermeture',
      ], 'S2 ouvre le portail sans badge. Pendant la fermeture, il le fait aussi rouvrir (réceptivité 4 → 5).'),
      Q('id-s3s4', 'S3 / S4', 'principe', 'En bas du dessin, S3 (à droite) et S4 (à gauche) sont…', [
        'Les fins de course : S3 portail fermé, S4 portail ouvert', 'Deux cellules photoélectriques', 'Deux barres palpeuses', 'Des butées mécaniques sans contact électrique',
      ], 'DTR 7 : S3 fin de course fermeture, S4 fin de course ouverture. Ce sont les deux positions que le grafcet attend.'),
      Q('id-s5', 'S5', 'principe', 'Que représentent les flèches rouges qui partent de S5 ?', [
        'Le faisceau de la cellule photoélectrique, renvoyé par un réflecteur', 'Le câble d’alimentation du moteur', 'Le sens d’ouverture du portail', 'Le champ du lecteur RFID',
      ], 'S5 émet et reçoit : le faisceau traverse le passage, rebondit sur le réflecteur et revient. Une personne ou un vélo le coupe : c’est un détecteur reflex.'),
      Q('id-s6', 'S6', 'principe', 'La bande hachurée S6, sur le bord du vantail côté pilier, est…', [
        'La barre palpeuse : un profil de sécurité qui détecte le contact', 'Un joint d’étanchéité', 'Une bande réfléchissante', 'Un fin de course',
      ], 'Si le vantail touche quelqu’un en fermant, la barre palpeuse s’écrase et ouvre son contact : le portail rouvre.'),
      Q('id-km', 'KM1.1 / KM1.2', 'dtr7', 'Que désignent KM1.1 et KM1.2 ?', [
        'Le contacteur-inverseur : KM1.1 ouverture, KM1.2 fermeture', 'Un démarreur étoile-triangle', 'Deux relais de l’automate', 'Deux disjoncteurs moteur',
      ], 'Un moteur, deux sens : deux contacteurs accouplés, verrouillés pour ne jamais coller ensemble.'),
      Q('id-m1', 'M1', 'principe', 'Le motoréducteur M1 n’apparaît pas sur le principe. Que fait-il ?', [
        'Il entraîne le vantail dans les deux sens, par un pignon sur une crémaillère fixée au portail', 'Il enroule un câble dans le pilier', 'Il pousse un vérin hydraulique', 'Il alimente le feu H1',
      ], 'Moteur asynchrone triphasé 0,37 kW et réducteur : c’est lui que l’inverseur fait tourner dans un sens puis dans l’autre.'),
    ],
    grafcetQuiz: [
      { id: 'gq-init', rep: 'Grafcet', invite: 'Quelle(s) étape(s) sont actives au démarrage ?', options: [
        'L’étape initiale, dessinée en carré double', 'Toutes les étapes', 'Aucune', 'La dernière étape',
      ], answer: 0, why: 'L’étape initiale est active à la mise en route ; toutes les autres sont inactives.' },
      { id: 'gq-fran', rep: 'Grafcet', invite: 'La réceptivité est vraie mais l’étape au-dessus est inactive. Que se passe-t-il ?', options: [
        'Rien : la transition n’est pas franchie', 'L’étape suivante s’active quand même', 'Le Grafcet redémarre', 'Toutes les étapes s’activent',
      ], answer: 0, why: 'Règle 1 : il faut l’étape amont ACTIVE et la réceptivité VRAIE.' },
      { id: 'gq-act', rep: 'Grafcet', invite: 'Où écrit-on ce que commande une étape ?', options: [
        'Dans le rectangle d’action, à sa droite', 'Sur la transition', 'Dans le carré de l’étape', 'Sous la liaison',
      ], answer: 0, why: 'L’action est dans un rectangle relié à l’étape : elle dure tant que l’étape est active.' },
      { id: 'gq-pdv', rep: 'Grafcet', invite: 'Dans le Grafcet de programmation, comment s’écrit « portail fermé » ?', options: [
        '%I0.3', '« Portail fermé »', '%Q0.3', 'S3 = fermé',
      ], answer: 0, why: 'Point de vue partie commande : on écrit les adresses de l’automate, ici l’entrée du fin de course S3.' },
      Q('gf-01', '0 → 1', 'dtr8', 'D’après le DTR 8, quelle est la réceptivité de la transition 0 → 1 ?', [
        'Portail fermé · AU non actionné · (badge + BP ouverture)', 'Badge + BP ouverture', 'Portail fermé · badge', 'Portail ouvert · AU non actionné',
      ], 'Trois conditions ET : le portail est fermé (on n’ouvre pas un portail ouvert), l’arrêt d’urgence n’est pas enfoncé, et quelqu’un le demande (badge OU bouton). B.3.1 : /S0 · S3 · (S1 + S2).'),
      Q('gf-45', '4 → 5', 'dtr8', 'Pendant la fermeture (étape 4), qu’est-ce qui fait passer à l’étape 5 ?', [
        'Détecteur photoélectrique + barre palpeuse + BP ouverture', 'Portail fermé', 'Arrêt d’urgence', 'Tempo étape 3',
      ], 'Une seule suffit (OU) : quelqu’un dans le passage, un contact avec le vantail, ou une demande d’ouverture. B.3.1 : S2 + S5 + S6. « Portail fermé » (S3), lui, ramène à l’étape 0.'),
      Q('gf-tempo', 'Tempos', 'dtr8', 'Quelles temporisations le DTR 8 impose-t-il ?', [
        '3 s de feu avant d’ouvrir (étape 1), 20 s d’attente portail ouvert (étape 3), 3 s de feu après un obstacle (étape 5)',
        '20 s de feu, 3 s d’attente, 3 s de feu', '3 s partout', 'Aucune : le portail se ferme à la demande',
      ], 'Ce sont les trois valeurs à régler à la mise en service : %TM1 = 3 s, %TM3 = 20 s, %TM5 = 3 s. Un %TM3 trop court referme le portail sur un cycliste.'),
      Q('gf-5', 'Étape 5', 'dtr8', 'Après l’étape 5 (feu 3 s), le grafcet remonte à…', [
        'L’étape 2 : le portail se rouvre', 'L’étape 0 : il attend un badge', 'L’étape 4 : il reprend la fermeture', 'L’étape 1',
      ], 'Un obstacle pendant la fermeture fait ROUVRIR : on repart en étape 2 (ouverture), puis 3 (attente), puis 4 (nouvelle fermeture).'),
      Q('gf-au', 'AU', 'dtr8', 'Où l’arrêt d’urgence intervient-il dans le DTR 8 ?', [
        'Pour démarrer un cycle (0 → 1) et pour lancer la fermeture (étape 4) : AU enfoncé, le portail ne part pas',
        'Nulle part : il coupe seulement le 400 V', 'Uniquement pendant l’ouverture', 'Il remplace le badge',
      ], '« Arrêt d’urgence » barré figure deux fois : à la transition 0 → 1 et comme condition de la fermeture. Sur la platine, S0 ouvre en plus physiquement l’entrée %I0.0.'),
      Q('gf-pc', 'B.3.1', 'grafcetpc', 'Au point de vue partie commande (B.3.1), quelles actions porte l’étape 2 ?', [
        'KM1.1 et H1', 'KM1.2 et H1', 'H1 seul', 'S4',
      ], 'Ouvrir le portail = KM1.1 (contacteur ouverture) ; le feu clignote pendant tout mouvement. S4 n’est pas une action : c’est la réceptivité qui suit.'),
    ],
    fonctions: [
      Q('ca-rfid', 'B.1.1', 'dtr9', 'Que signifie l’acronyme RFID ?', [
        'Radio Frequency IDentification', 'Remote Frequency Infrared Detection', 'Radio Field Integrated Device', 'Reader For IDentity',
      ], 'Identification par radiofréquence : mémoriser et lire des données à distance, sans contact (DTR 9).'),
      Q('ca-tag', 'B.1.2', 'dtr9', 'De quoi est composée l’étiquette RFID d’un badge ?', [
        'D’une puce reliée à une antenne', 'D’une pile et d’un émetteur', 'D’une piste magnétique', 'D’un code-barres',
      ], 'Le champ du lecteur apporte l’énergie à l’antenne, qui active la puce : le badge n’a pas de pile (B.1.3).'),
      Q('ca-freq', 'B.1.4', 'dtr9', 'Quelles fréquences utilisent les puces RFID ?', [
        'Basse fréquence 125 kHz, haute fréquence 13,56 MHz, très haute fréquence (UHF)', '50 Hz, 60 Hz et 400 Hz', '2,4 GHz uniquement', '125 MHz, 13,56 GHz et 868 kHz',
      ], 'Plus la fréquence est élevée, plus la distance de lecture s’agrandit. Le contrôle d’accès de l’Écobike travaille en basse fréquence, 125 kHz.'),
      Q('ca-lprox', 'S1', 'dt3334', 'Quel lecteur et quels badges, en basse fréquence (B.1.5) ?', [
        'Lecteur LP ROX (125 kHz) et 100 badges ICB-CRF-EM42', 'Lecteur LP ROX et un seul badge partagé', 'Lecteur 13,56 MHz et badges EM42', 'Un digicode à 4 chiffres',
      ], 'LP ROX : « Lecteur RFID 125 KHz (EM/HID) », alimenté en 9-24 V DC. Un badge par membre du personnel : 100.'),
      Q('ca-fc', 'S3 / S4', 'dt3334', 'Quels interrupteurs de position : une entrée de câble, tête angulaire à 2 sens, action brusque (B.1.7) ?', [
        'XCKL115 : NO + NF, IP 66, métallique', 'XCKM115H29 : trois entrées de câble', 'XCKL102 : poussoir à galet, mouvement rectiligne', 'XCKL106 : tige souple multidirections',
      ], 'XCKL = une entrée de câble avec presse-étoupe ; 115 = levier à galet, mouvement angulaire. Corps métallique, IP 66 : il tient dehors.'),
      Q('ca-reflex', 'S5', 'dtr1011', 'Quel système pour détecter une personne ou un vélo, portée < 15 m, ambiance propre (B.1.8) ?', [
        'Système reflex : émetteur-récepteur et réflecteur', 'Système barrage : émetteur et récepteur séparés', 'Système de proximité : quelques centimètres', 'Fibres optiques',
      ], 'DTR 10, ligne ② : objet opaque non réfléchissant, portée moyenne < 15 m, objet volumineux, ambiance propre → reflex. Un seul boîtier à câbler, le réflecteur en face.'),
      Q('ca-xub', 'S5', 'dt35', 'Quelle cellule reflex, métallique, à câble, en logique positive (B.1.9) ?', [
        'XUB1BPANL2 + réflecteur XUZC50 : PNP NO, DC 3 fils, 4 m', 'XUB1BNANL2 : NPN NO', 'XUB1APANL2 : boîtier plastique', 'XUB2BPANL2R : barrage 15 m',
      ], '1 = reflex, B = boîtier métal Ø 18, P = PNP (logique positive), A = NO, NL2 = câble. Le réflecteur XUZC50 est l’accessoire du reflex.'),
      Q('ca-fn', 'B.1.10', 'dt32', 'Quelle est la fonction de la barre palpeuse (B.1.10) ?', [
        'Profil de sécurité : prévenir les collisions entre des personnes et le portail en mouvement', 'Guider le vantail sur son rail', 'Assurer l’étanchéité du local', 'Compter les passages',
      ], 'DTR 32 : « profil de sécurité indispensable ». Le feu, lui, prévient les passants ; l’arrêt d’urgence garantit la sécurité de l’utilisateur et du matériel.'),
      Q('ca-barre', 'S6', 'dt32', 'Quelle barre palpeuse, 2 contacts, noir et jaune (B.1.12) ?', [
        'CMM200/J', 'CMM200', 'CMO200', 'XCKL115',
      ], 'CMM = 2 micro-switchs ; /J = noir et jaune. Le CMO200 a un 3ᵉ contact redondant, le CMM200 est tout noir.'),
      Q('ca-feu', 'H1', 'dt36', 'Quelles références pour le feu orange grand modèle 7 cd et sa base IP 65 en 24 V (B.1.11) ?', [
        'Feu 0 413 92 (grand modèle, 7 cd) sur base 0 413 81 (12/24 V, IP 65)', 'Feu 0 413 90 (petit modèle, 5 cd) sur base 0 413 80', 'Feu 0 413 92 sur base 0 413 83 (120/240 V~)', 'Feu 0 413 94 (80 cd) sur base 0 413 82',
      ], 'DT 36 : 0 413 92 = feu à LED grand modèle, fixe ou clignotant, 7 candelas ; 0 413 81 = base 12/24 V, IP 65, câblage latéral. Le corrigé les cite ensemble pour H1.'),
      Q('ca-au', 'S0', 'dt37', 'Quel arrêt d’urgence complet, à clef, avec au moins un contact NO (B.1.13) ?', [
        'XB5AS9445 : déverrouillage par clé, contacts « F » + « O »', 'XB5AT845 : pousser-tirer', 'XB5AS8445 : tourner pour déverrouiller', 'ZB5AS944 : la tête seule',
      ], 'Ligne « Déverrouillage par clé n° 455 » avec un contact F et un contact O : XB5AS9445. ZB5AS944 n’est que la tête, sans bloc de contacts.'),
      Q('ca-nf', 'S0', 'dt37', 'Sur la platine, pourquoi câble-t-on le contact NF (« O ») de S0 sur %I0.0 ?', [
        'Sécurité positive : AU enfoncé OU fil coupé, l’entrée passe à 0 et le portail s’arrête', 'Parce que le contact NO est réservé au voyant', 'Pour économiser une entrée', 'Parce que l’automate ne lit que des NF',
      ], 'Le folio du sujet câble le NO et teste /S0. Avec le NF, %I0.0 vaut 1 AU relâché : le programme écrit %I0.0 sans barre, et un conducteur coupé bloque le portail au lieu de passer inaperçu.'),
    ],
    calculs: [
      Q('ca-pa', 'Pa', 'folio01', 'Puissance absorbée par le moteur (Pu = 370 W, η = 83,6 %) :', [
        'Pa = Pu / η = 370 / 0,836 ≈ 443 W', 'Pa = Pu × η ≈ 309 W', 'Pa = Pu = 370 W', 'Pa = Pu / cos φ ≈ 474 W',
      ], 'Le rendement fait perdre de la puissance : on en absorbe plus qu’on n’en restitue sur l’arbre. 370 / 0,836 = 443 W (B.2.1).'),
      Q('ca-in', 'In', 'folio01', 'Intensité nominale absorbée sous 400 V (cos φ = 0,78) :', [
        'I = Pa / (√3 × U × cos φ) = 443 / (√3 × 400 × 0,78) ≈ 0,82 A', 'I = Pa / (U × cos φ) ≈ 1,42 A', 'I = Pu / (√3 × U) ≈ 0,53 A', 'I = Pa / (3 × U) ≈ 0,37 A',
      ], 'Moteur triphasé : √3 × U × I × cos φ. 443 / (1,732 × 400 × 0,78) = 0,82 A.'),
      Q('mo-role', 'B.2.2', 'dt38', 'Quelle protection assure un disjoncteur moteur magnétothermique ?', [
        'Contre les courts-circuits (magnétique) et les surcharges (thermique)', 'Contre les défauts d’isolement 30 mA', 'Contre les surtensions de foudre', 'Contre l’inversion des phases',
      ], 'Le magnétique coupe le court-circuit, le thermique la surcharge : un seul appareil à la place du fusible et du relais thermique.'),
      Q('mo-gv', 'Q2', 'dt38', 'Quel disjoncteur moteur pour ce moteur de 0,37 kW sous 400 V (B.2.3) ?', [
        'GV2-ME06 : plage 1 à 1,6 A, magnétique 22,5 A', 'GV2-ME05 : plage 0,63 à 1 A, magnétique 13 A', 'GV2-ME07 : plage 1,6 à 2,5 A, magnétique 33,5 A', 'GV2-ME04 : plage 0,4 à 0,63 A',
      ], 'DT 38 : la ligne « 0,37 kW · 400/415 V » donne le GV2ME06. Le ME07 commence à 1,6 A : il ne protégerait pas un moteur de 0,82 A d’une surcharge.'),
      Q('mo-reglage', 'Q2', 'dt38', 'À quelle valeur régler le thermique du GV2-ME06 ?', [
        '1 A : le bas de sa plage, au plus près de In = 0,82 A', '0,82 A', '1,6 A', '22,5 A',
      ], 'Réponse du corrigé : 1 A. 0,82 A n’existe pas sur un ME06 (plage 1-1,6 A), 22,5 A est le seuil MAGNÉTIQUE, non réglable. Un thermique réglé SOUS In — 0,63 A — déclencherait en service normal.'),
      Q('mo-mag', 'Q2', 'dt38', 'Et l’intensité de déclenchement magnétique du GV2-ME06 ?', [
        '22,5 A (± 20 %)', '1 A', '13 A', '33,5 A',
      ], 'Colonne « Courant de déclenchement magnétique » : 22,5 A. C’est lui qui coupe un court-circuit, instantanément.'),
      Q('mo-ae1', 'GV-AE1', 'dt38', 'Quel bloc de contact auxiliaire instantané à montage frontal (B.2.3) ?', [
        'GV-AE1 : un contact « F » ou « O », réversible', 'GVAN11 : latéral, F + O', 'GVAD1010 : signalisation de défaut', 'GVAM11 : signalisation de court-circuit',
      ], 'GVAE1, montage frontal, contact réversible. Au folio 01, son 13-14 est en série sur le + 24 V : Q2 ouvert ou déclenché, toute la commande tombe.'),
      Q('mo-km', 'B.2.4', 'dt39', 'Quel est le rôle d’un contacteur ?', [
        'Établir, supporter et interrompre les courants dans les conditions normales du circuit', 'Protéger contre les courts-circuits', 'Isoler l’installation pour la consigner', 'Mesurer le courant du moteur',
      ], 'Il commute le moteur des milliers de fois. Il ne protège rien : c’est le rôle de Q2.'),
      Q('ca-sens', 'B.2.5', 'folio01', 'Comment inverse-t-on le sens de rotation du moteur ?', [
        'En permutant deux des trois phases', 'En permutant les trois phases', 'En coupant une phase', 'En inversant le neutre',
      ], 'Permuter deux phases inverse le champ tournant. Au folio 01, KM1.2 reçoit L1 et L3 croisées ; permuter les trois reviendrait au même ordre.'),
      Q('mo-lc2', 'KM1.1 / KM1.2', 'dt39', 'Quel contacteur-inverseur (B.2.6) ?', [
        'LC2D09BD : AC-3, 9 A, 1 NO + 1 NC par contacteur, bobines 24 V⎓', 'LC2D09B7 : bobines 24 V~', 'LC1D09BD : un seul contacteur', 'LC2D12BD : 12 A',
      ], 'LC2D09 : 4 kW sous 400 V en AC-3, largement assez pour 0,37 kW. BD = 24 V courant continu : la commande est alimentée en 24 V⎓ par AL1.'),
    ],
    blocs: [
      {
        id: 'couplage',
        titre: '⑤ Couplage · B.2.7 et plaque à bornes B.2.8',
        consigne: 'Compare la tension du réseau (400 V entre phases) à la tension d’un enroulement (230 V), puis pose toi-même les barrettes sur la plaque à bornes.',
        questions: [
          Q('cp-coup', 'B.2.7', 'folio01', 'Réseau 400 V, plaque 230 / 400 V : quel couplage ?', [
            'Étoile : chaque enroulement reçoit 400 / √3 = 230 V', 'Triangle : chaque enroulement reçoit 400 V', 'Étoile-triangle au démarrage', 'Peu importe, le moteur s’adapte',
          ], 'L’enroulement supporte 230 V (la petite tension de la plaque). En étoile sur 400 V, il reçoit 230 V ; en triangle, 400 V : il chaufferait et Q2 déclencherait.'),
          {
            ...Q('cp-plaque', 'B.2.8', 'folio01', 'Complète la plaque à bornes : pose les barrettes du couplage étoile.', [
              'Étoile : barrettes W2-U2 et U2-V2', 'Triangle : barrettes U1-W2, V1-U2, W1-V2', 'Barrettes incomplètes : un enroulement reste en l’air', 'Barrettes mélangées : court-circuit entre phases',
            ], 'Étoile = les trois extrémités W2, U2, V2 réunies en un point neutre : deux barrettes horizontales. L1 L2 L3 arrivent sur U1 V1 W1, le PE sur la borne de masse.'),
            vue: 'plaque',
            corrige: DOC('plaque_bornes.jpg'),
          },
          Q('cp-bars', 'Plaque', 'folio01', 'Quels conducteurs du réseau arrivent sur la plaque à bornes ?', [
            'L1, L2, L3 sur U1, V1, W1, et le PE sur la borne de masse — pas de neutre', 'L1, L2, L3 et N', 'L1 et N seulement', 'L1, L2, L3 sur W2, U2, V2',
          ], 'Le moteur est un récepteur triphasé équilibré : le point neutre de l’étoile est fait sur la plaque par les barrettes, le neutre du réseau n’y va pas.'),
          Q('cp-renr', 'Ω', 'folio01', 'Barrettes retirées, que doit-on lire à l’ohmmètre entre U1-U2, V1-V2 et W1-W2 ?', [
            'Trois valeurs identiques (une vingtaine d’ohms) : les trois enroulements sont sains', 'Trois valeurs nulles', 'OL sur les trois', 'Des valeurs très différentes : c’est normal',
          ], 'Un moteur triphasé a trois enroulements identiques. Un écart signale des spires en court-circuit, OL un enroulement coupé. Tu le mesureras hors tension.'),
        ],
      },
    ],
    adressage: [
      Q('ad-e', 'B.1.15', 'dtr1213', 'Combien d’entrées TOR, et pour quels appareils (B.1.15-17) ?', [
        '7 : S0 à S6', '9 : toutes les entrées du M221', '3 : S1, S2 et S5', '8 : S0 à S6 et H1',
      ], 'Sept capteurs, sept entrées tout ou rien. H1 est un récepteur : il est sur une SORTIE. La carte WAGO 750-430 en offre 8, le M221 en a 9 (%I0.0 à %I0.8).'),
      Q('ad-s', 'B.1.18', 'dtr1213', 'Et combien de sorties TOR (B.1.18-20) ?', [
        '3 : KM1.1, KM1.2 et H1', '2 : KM1.1 et KM1.2', '4 : les quatre de la carte 750-504', '7 : toutes celles du M221',
      ], 'Deux bobines et un feu. La 750-504 en a 4, le TM221CE16R 7 relais : il en reste en réserve.'),
      Q('ad-type', 'B.1.16', 'dtr1213', 'Quel type de signal, et quel type de donnée ?', [
        'Tout ou rien (TOR) : un booléen, BOOL', 'Analogique : un entier 16 bits', 'Numérique : un réel', 'Une chaîne de caractères',
      ], 'Un contact est ouvert ou fermé : 0 ou 1. DTR 12-13 : colonne « Type » = BOOL.'),
      Q('ad-al1', 'AL1', 'dt40', 'Quelle alimentation : 230 V AC en entrée, 24 V DC, 2,5 A (B.1.14) ?', [
        'WAGO 787-1012 : 100-240 V~ → 24 V⎓ 2,5 A', 'WAGO 787-1002 : 24 V⎓ 1,3 A', 'WAGO 787-1001 : 12 V⎓ 2 A', 'Un transformateur 230 / 24 V~',
      ], 'Ligne « 1-phase ; 24 VDC output voltage » : 2,5 A → 787-1012. Le sujet impose du CONTINU : bobines LC2D09BD et capteurs PNP sont en 24 V⎓.'),
      Q('ad-s0', '%I0.0', 'adr', 'Le WAGO adresse S0 en %IX0.0 (DTR 12). Quelle adresse sur le M221 ?', [
        '%I0.0', '%IX0.0', '%Q0.0', '%MW0',
      ], 'Même logique, notation différente : le X (bit) de CODESYS disparaît sous Machine Expert Basic. S0 sur la première entrée : %I0.0.'),
      Q('ad-s3', '%I0.3', 'adr', 'Et le fin de course S3 (portail fermé), %IX0.3 au WAGO ?', [
        '%I0.3', '%I0.4', '%Q0.3', '%IW0.3',
      ], 'S3 est la 4ᵉ entrée : %I0.3. C’est elle qui doit être à 1, portail fermé, pour démarrer un cycle.'),
      Q('ad-km11', '%Q0.0', 'adr', 'KM1.1 (ouverture), %QX0.0 au WAGO (DTR 13), devient sur le M221…', [
        '%Q0.0', '%Q0.1', '%I0.0', '%QW0',
      ], 'KM1.1 sur la première sortie, KM1.2 sur la deuxième, H1 sur la troisième. Permuter KM1.1 et KM1.2 fait FERMER au badge : tu le vérifieras à la mise en service.'),
      Q('ad-h1', '%Q0.2', 'adr', 'Et le feu H1 ?', [
        '%Q0.2', '%Q0.3', '%I0.2', '%M2',
      ], '%QX0.2 → %Q0.2 : troisième sortie.'),
      Q('ad-com', 'COM', 'automate', 'La cellule S5 est PNP. Où relier le COM des entrées du M221 ?', [
        'Au 0 V de AL1 : logique positive, le capteur renvoie le + 24 V sur l’entrée', 'Au + 24 V', 'À la terre', 'Nulle part',
      ], 'Un capteur PNP « source » le + 24 V : l’entrée se referme sur le 0 V par son COM. Le commun des SORTIES relais, COM0, reçoit lui le + 24 V.'),
      Q('ad-log', 'B.3.2', 'dtr1011', 'Le WAGO se programme sous CODESYS, en SFC. Et le M221 ?', [
        'Sous Machine Expert Basic, en Grafcet (SFC) : même langage, même grafcet', 'Sous CODESYS, en Ladder uniquement', 'Il ne se programme pas en Grafcet', 'Sous ETS5',
      ], 'SFC (Sequential Function Chart) est le Grafcet de la CEI 61131-3. Le logiciel change, le grafcet de programmation reste celui du B.3.7.'),
      Q('ad-tm', '%TM1', 'dtr8', 'Comment le M221 compte-t-il les 3 s de l’étape 1 ?', [
        'Avec un temporisateur %TM1 lancé par l’étape : %TM1.Q passe à 1 au bout de 3 s', 'Avec un compteur %C1', 'Avec une entrée %I0.7', 'Il ne peut pas',
      ], 'Sous CODESYS : Etape1.t > T#3s. Sur le M221 : un bloc %TM1 de présélection 3 s. Tu régleras %TM1, %TM3 et %TM5 à la mise en service.'),
    ],
    grafcet: {
      cases: [
        C('t01', 'Transition 0 → 1 : conditions de départ du cycle', ['%I0.0 · %I0.3 · (%I0.1 + %I0.2)', '%I0.1 · %I0.2', '%I0.1 + %I0.2', '%I0.0 · %I0.4'],
          'AU relâché (%I0.0, contact NF : le corrigé écrit /S0), portail fermé (%I0.3), ET badge OU bouton (%I0.1 + %I0.2).'),
        C('a1', 'Action de l’étape 1', ['%Q0.2', '%Q0.0', '%Q0.1', '%I0.2'],
          'L’étape 1 ne fait que clignoter le feu (%Q0.2) pendant 3 s, avant tout mouvement.'),
        C('t12', 'Transition 1 → 2', ['%TM1.Q', '%TM3.Q', '%I0.4', '%I0.3'],
          '%TM1 est lancé par l’étape 1 et réglé à 3 s : sa sortie %TM1.Q valide la transition (CODESYS : Etape1.t > T#3s).'),
        C('a2', 'Première action de l’étape 2', ['%Q0.0', '%Q0.1', '%Q0.2', '%I0.0'],
          'Étape 2 : ouverture, donc KM1.1 sur la sortie %Q0.0, avec le feu.'),
        C('t23', 'Transition 2 → 3', ['%I0.4', '%I0.3', '%I0.5', '%TM1.Q'],
          'On attend le portail ouvert : fin de course S4, entrée %I0.4.'),
        C('t34', 'Transition 3 → 4', ['%TM3.Q · %I0.0', '%TM3.Q', '%I0.0', '%TM1.Q · %I0.0'],
          'Deux conditions : les 20 s de %TM3 sont écoulées ET l’arrêt d’urgence est relâché (CODESYS : Etape3.t > T#20s, /%IX0.0).'),
        C('t45', 'Transition 4 → 5 (réouverture)', ['%I0.2 + %I0.5 + %I0.6', '%I0.5', '%I0.2 · %I0.5 · %I0.6', '%I0.3'],
          'BP intérieur OU cellule OU barre palpeuse : une seule suffit à faire rouvrir.'),
        C('t40', 'Transition 4 → 0 (fin de fermeture)', ['%I0.3', '%I0.4', '%TM5.Q', '%I0.0'],
          'Le portail est fermé quand S3 (%I0.3) est actionné : retour à l’étape initiale.'),
      ],
    },
  },
  puissance: {
    phases: ['L1', 'L2', 'L3'],
    reseau: '3 × 400 V + N + PE',
    organes: [
      { type: 'bornier', rep: 'X1', legende: 'arrivée pupitre', bornes: [['1', ''], ['2', ''], ['3', '']] },
      { type: 'sectionneur', rep: 'Q1', legende: 'interrupteur-sectionneur 4P', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      { type: 'disjoncteur', rep: 'Q2', legende: 'GV2-ME06 · 1 A · GV-AE1', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      {
        type: 'contacteur', rep: 'KM1.1', legende: 'ouverture · %Q0.0', bornes: [['1', '2'], ['3', '4'], ['5', '6']],
        paire: { rep: 'KM1.2', legende: 'fermeture · L1 et L3 croisées', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      },
      { type: 'bornier', rep: 'X1', legende: 'départ moteur', bornes: [['6', ''], ['7', ''], ['8', '']] },
    ],
    moteur: { rep: 'M1', legende: '0,37 kW · 400 V Y · 0,82 A' },
  },
  postes: [
    {
      id: 'q1', name: 'Q1 · Organe de tête',
      need: 'Isoler les 4 conducteurs actifs du coffret et permettre la consignation',
      options: [
        { key: 'mcb4p', ref: 'Interrupteur-sectionneur 4P 20 A cadenassable', spec: '4 pôles · poignée cadenassable', ok: true, why: 'Coupure pleinement apparente des 4 pôles et condamnation par cadenas : c’est l’organe de consignation demandé (B.2).' },
        { key: 'mcb4p', ref: 'Disjoncteur 4P C16 non cadenassable', spec: '4 pôles · courbe C', half: true, why: 'Il coupe les 4 pôles, mais sans dispositif de condamnation la consignation n’est pas possible.' },
        { key: 'fuseswitch', ref: 'Sectionneur porte-fusibles 3P', spec: '3 pôles · cartouches', why: 'Le neutre n’est pas coupé : l’automate et AL1, alimentés en phase + neutre, ne seraient pas totalement isolés.' },
      ],
    },
    {
      id: 'gv', name: 'Q2 · Disjoncteur moteur et contact auxiliaire',
      need: 'Protéger le moteur de 0,37 kW (In = 0,82 A) et couper la commande 24 V s’il déclenche (DT 38)',
      options: [
        { key: 'motorcb', img: DOC('dt38.jpg'), ref: 'GV2-ME06 + GV-AE1', spec: '1 – 1,6 A · réglé 1 A · magnétique 22,5 A · contact frontal', ok: true, why: 'La ligne 0,37 kW / 400 V du DT 38 ; thermique réglé à 1 A, magnétique 22,5 A. Le GV-AE1 frontal coupe le + 24 V quand Q2 déclenche (B.2.3).' },
        { key: 'motorcb', ref: 'GV2-ME07 + GV-AE1', spec: '1,6 – 2,5 A · magnétique 33,5 A', why: 'Réglage minimal 1,6 A, deux fois In : une surcharge de 0,82 × 1,5 A passerait sans déclencher. Le moteur n’est pas protégé.' },
        { key: 'motorcb', ref: 'GV2-ME06 seul', spec: '1 – 1,6 A · sans contact auxiliaire', half: true, why: 'Le moteur est protégé, mais sans GV-AE1 rien ne coupe la commande quand Q2 déclenche : l’automate continuerait de commander un moteur hors service.' },
      ],
    },
    {
      id: 'km', name: 'KM1.1 / KM1.2 · Contacteur-inverseur',
      need: '0,37 kW en AC-3, deux sens avec verrouillages, bobines commandées en 24 V⎓ (DT 39)',
      options: [
        { key: 'lc2d09bd', img: DOC('dt39.jpg'), ref: 'LC2D09BD', spec: '9 A AC-3 · bobines 24 V⎓ · 1 NO + 1 NC par contacteur · condamnation mécanique', ok: true, why: 'Inverseur précâblé, bobines BD = 24 V continu comme AL1, et un NF par contacteur pour le verrouillage électrique croisé du folio 02.' },
        { key: 'lc2d09bd', ref: 'LC1D09BD', spec: 'un seul contacteur 9 A · 24 V⎓', why: 'Un contacteur simple ne fait qu’un sens : il en faut deux, accouplés et verrouillés mécaniquement, pour inverser sans jamais court-circuiter deux phases.' },
        { key: 'lc2d09bd', ref: 'LC2D09B7', spec: 'inverseur 9 A · bobines 24 V~', why: 'Bobines ALTERNATIVES : la commande de l’Écobike est en 24 V continu (AL1). Elles ne tiendraient pas correctement.' },
      ],
    },
    {
      id: 'al1', name: 'AL1 · Alimentation de la commande',
      need: '230 V AC en entrée, 24 V DC en sortie, 2,5 A (B.1.14, DT 40)',
      options: [
        { key: 'alim24dc', img: DOC('dt40.jpg'), ref: 'WAGO 787-1012', spec: '100-240 V~ → 24 V⎓ · 2,5 A · 72 × 89 × 55 mm', ok: true, why: 'Exactement le besoin : 24 V continu, 2,5 A. Elle alimente les capteurs, le commun des sorties, les bobines et le feu.' },
        { key: 'trafoleg', ref: 'Transformateur 230 / 24 V~ · 100 VA', spec: 'sortie ALTERNATIVE', why: 'Le sujet impose une commande en 24 V DC : bobines LC2D09BD et cellule PNP ne fonctionnent pas en alternatif.' },
        { key: 'alim24dc', ref: 'WAGO 787-1002', spec: '100-240 V~ → 24 V⎓ · 1,3 A', half: true, why: 'Bonne tension, mais 1,3 A au lieu des 2,5 A demandés : pas de réserve pour les deux bobines au démarrage, le feu et les capteurs.' },
      ],
    },
    {
      id: 'plc', name: 'A1 · Automate programmable',
      need: '7 entrées TOR 24 V⎓, 3 sorties, port Ethernet (supervision du TP 4)',
      options: [
        { key: 'plc', img: '/sprites/plc16r.png', ref: 'TM221CE16R', spec: '9 entrées 24 V⎓ · 7 sorties relais 2 A · Ethernet · 100-240 V~', ok: true, why: '9 entrées pour 7 capteurs, 7 sorties relais pour 3 charges, et le port Ethernet par lequel la loge supervise le portail en 192.168.0.4 (TP 4).' },
        { key: 'plc', img: '/sprites/plc16r.png', ref: 'TM221C16R', spec: '9 entrées · 7 sorties relais · SANS Ethernet', half: true, why: 'Il piloterait le portail, mais sans port Ethernet : la supervision du TP 4 est impossible.' },
        { key: 'plc', img: '/sprites/plc40r.png', ref: 'TM3DI8 seul', spec: 'module d’extension 8 entrées', why: 'Un module d’extension n’a pas d’unité centrale : il ne contient aucun programme, il ne pilote rien seul.' },
      ],
    },
    {
      id: 'q3', name: 'Q3 · Protection de l’automate et de AL1',
      need: 'Alimenter et protéger le M221 et AL1 en 230 V (phase + neutre)',
      options: [
        { key: 'mcb1pn', ref: 'iC60N 1P+N C2', spec: '2 A · phase + neutre', ok: true, why: 'L’automate et AL1 consomment ensemble moins de 100 VA : 2 A protège leurs conducteurs et coupe phase et neutre.' },
        { key: 'mcb1pn', ref: 'iC60N 1P+N C16', spec: '16 A · phase + neutre', why: 'Calibre sans rapport avec la consommation et les conducteurs de 1,5 mm² : plus rien ne serait protégé.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · 1 pôle', half: true, why: 'Protège, mais laisse le neutre raccordé pendant l’intervention.' },
      ],
    },
    {
      id: 'rfid', name: 'S1 · Contrôle d’accès',
      need: 'Lecteur basse fréquence et 100 badges pour le personnel (B.1.5, DT 33)',
      options: [
        { key: 'lecteurrfid', img: DOC('dt33_34.jpg'), ref: 'LP ROX + 100 badges ICB-CRF-EM42', spec: '125 kHz · 9-24 V DC', ok: true, why: 'Basse fréquence 125 kHz, badges EM compatibles, alimentation 24 V DC (B.1.5).' },
        { key: 'lecteurrfid', ref: 'Lecteur 13,56 MHz + badges EM42', spec: 'haute fréquence', why: 'Fréquences différentes : le lecteur ne lit pas les badges EM 125 kHz.' },
        { key: 'lecteurrfid', ref: 'Digicode à 4 chiffres', spec: 'clavier', half: true, why: 'Fonctionne, mais un code se transmet : le cahier des charges demande un badge par personne.' },
      ],
    },
    {
      id: 'cell', name: 'S5 · Cellule du passage',
      need: 'Détecteur reflex, métallique, câble, logique positive (B.1.8-9, DT 35)',
      options: [
        { key: 'cellule', img: DOC('dt35.jpg'), ref: 'XUB1BPANL2 + réflecteur XUZC50', spec: 'reflex 4 m · M18 métal · PNP NO · DC 3 fils', ok: true, why: 'Reflex pour un objet volumineux à moyenne distance, sortie PNP : elle renvoie le + 24 V sur l’entrée (logique positive).' },
        { key: 'cellule', ref: 'XUB1BNANL2 + XUZC50', spec: 'reflex · NPN NO', why: 'Sortie NPN : elle commute le 0 V, alors que les entrées sont en logique positive (COM au 0 V). La cellule ne serait jamais vue.' },
        { key: 'cellule', ref: 'XUB2BPANL2R + XUB2BKSNL2T', spec: 'barrage 15 m · émetteur + récepteur', half: true, why: 'Elle détecterait aussi, mais deux boîtiers à câbler de part et d’autre du passage : le DTR 10 conseille le reflex pour une portée < 15 m en ambiance propre.' },
      ],
    },
    {
      id: 'fc', name: 'S3 / S4 · Fins de course',
      need: 'Une entrée de câble, tête angulaire à 2 sens, action brusque, métallique IP 66 (B.1.7, DT 34)',
      options: [
        { key: 'limitswitch', img: DOC('dt33_34.jpg'), ref: 'XCKL115 (× 2)', spec: 'levier à galet · NO + NF brusque · métallique IP 66', ok: true, why: 'Tête angulaire à 2 sens, contacts à action brusque, corps métallique : il tient dehors (B.1.7).' },
        { key: 'limitswitch', ref: 'XCKN2118P20 (× 2)', spec: 'plastique · IP 65', half: true, why: 'Il fonctionnerait, mais le sujet impose un corps métallique IP 66 pour un portail exposé aux chocs et aux intempéries.' },
        { key: 'limitswitch', ref: 'Détecteur inductif Ø 18', spec: 'sans contact · 8 mm', why: 'Pas de galet ni d’action brusque : ce n’est pas l’appareil demandé.' },
      ],
    },
    {
      id: 'feu', name: 'H1 · Feu orange clignotant',
      need: 'Grand modèle 7 cd, base IP 65 en 24 V (B.1.11, DT 36)',
      options: [
        { key: 'feuorange', img: DOC('dt36.jpg'), ref: 'Feu 0 413 92 + base 0 413 81', spec: 'LED grand modèle 7 cd · base 12/24 V IP 65', ok: true, why: 'Grand modèle clignotant 7 candelas, base 12/24 V⎓ et IP 65 pour l’extérieur.' },
        { key: 'feuorange', ref: 'Feu 0 413 90 + base 0 413 81', spec: 'petit modèle · 5 cd', why: 'Petit modèle, 5 candelas : le sujet impose le grand modèle à 7 cd, visible de la rue.' },
        { key: 'feuorange', ref: 'Feu 0 413 92 + base 0 413 83', spec: 'base 120/240 V~', why: 'La base 0 413 83 est prévue pour 120/240 V~ : elle ne fonctionne pas sur la sortie 24 V⎓ de l’automate.' },
      ],
    },
    {
      id: 'barre', name: 'S6 · Barre palpeuse',
      need: '2 contacts, noir et jaune (B.1.12, DT 32)',
      options: [
        { key: 'barrepalpeuse', img: DOC('dt32.jpg'), ref: 'CMM200/J', spec: '2 micro-switchs · noir / jaune · IP 54', ok: true, why: 'Deux contacts, profil noir et jaune bien visible : la référence du corrigé.' },
        { key: 'barrepalpeuse', ref: 'CMM200', spec: '2 contacts · noir', half: true, why: 'Même barre, mais tout noire : le sujet demande le profil noir et jaune.' },
        { key: 'barrepalpeuse', ref: 'Joint caoutchouc de bord de vantail', spec: 'passif · sans contact', why: 'Un joint amortit mais ne signale rien : l’automate ne saurait pas qu’il y a eu contact.' },
      ],
    },
    {
      id: 'au', name: 'S0 · Arrêt d’urgence',
      need: 'Coup de poing à verrouillage, déverrouillage par clé, au moins un contact NO (B.1.13, DT 37)',
      options: [
        { key: 'stopstart', img: DOC('dt37.jpg'), ref: 'XB5AS9445', spec: 'Ø 40 · déverrouillage par clé · F + O', ok: true, why: 'Déverrouillage à clé : seul le responsable remet le portail en service. Un contact F et un contact O.' },
        { key: 'stopstart', ref: 'XB5AT845', spec: 'Ø 40 · pousser-tirer · F + O', why: 'Arrêt d’urgence à TIRER : n’importe quel passant le réarme. Le sujet impose une clé.' },
        { key: 'stopstart', ref: 'XB5AS8445', spec: 'Ø 40 · tourner pour déverrouiller', half: true, why: 'Coup de poing conforme, mais il se réarme d’un quart de tour, sans clé.' },
      ],
    },
  ],
  rails: [150, 340, 560, 780],
  armoire: 920,
  gaines: [
    { id: 'g1', rep: 'G1', x: 70, diam: 25, nature: 'force', contenu: '5 conducteurs 2,5 mm² · L1 L2 L3 N PE', vers: 'pupitre d’alimentation de l’atelier', dessert: ['RES.'] },
    { id: 'g2', rep: 'G2', x: 140, diam: 20, nature: 'force', contenu: '4 conducteurs 1,5 mm² · U1 V1 W1 PE', vers: 'motoréducteur du portail', dessert: ['M.'] },
    { id: 'g3', rep: 'G3', x: 300, diam: 20, nature: 'tbts', contenu: '4 conducteurs · fins de course S3 et S4 (24 V⎓)', vers: 'rail du portail', dessert: ['S3.', 'S4.'] },
    { id: 'g4', rep: 'G4', x: 380, diam: 20, nature: 'tbts', contenu: '5 conducteurs · cellule S5 (3 fils) et barre palpeuse S6', vers: 'passage du portail', dessert: ['S5.', 'S6.'] },
    { id: 'g5', rep: 'G5', x: 460, diam: 20, nature: 'tbts', contenu: '4 conducteurs · lecteur RFID S1 et feu H1', vers: 'pilier du portail', dessert: ['S1.', 'H1.'] },
    { id: 'g6', rep: 'G6', x: 520, diam: 16, nature: 'tbts', contenu: '4 conducteurs · porte : S0 et S2', vers: 'porte du coffret', dessert: ['S0.', 'S2.'] },
  ],
  goulotteDePied: false,
  slots: [
    { id: 'q1', label: 'Q1 · Interrupteur-sectionneur 4P cadenassable', key: 'mcb4p', rail: 0, x: 46, rep: 'Q1' },
    { id: 'f3', label: 'Q2 · Disjoncteur moteur GV2-ME06 · thermique réglé 1 A', key: 'motorcb', rail: 0, x: 164, rep: 'Q2' },
    { id: 'ae1', label: 'Q2 · Contact auxiliaire GV-AE1 · 13-14 en série sur le + 24 V⎓', key: 'gvae1', rail: 0, x: 232, rep: 'Q2', auxDe: 'f3' },
    { id: 'f2', label: 'Q3 · Disjoncteur 1P+N C2 · automate et AL1', key: 'mcb1pn', rail: 0, x: 270, rep: 'Q3' },
    { id: 'al1', label: 'AL1 · Alimentation WAGO 787-1012 · 230 V~ → 24 V⎓ 2,5 A', key: 'alim24dc', rail: 0, x: 336, rep: 'AL1' },
    { id: 'km1', label: 'KM1.1 · Contacteur-inverseur LC2D09BD · ouverture', key: 'lc2d09bd', rail: 1, x: 150, rep: 'KM1.1' },
    { id: 'km2', label: 'KM1.2 · Contacteur-inverseur LC2D09BD · fermeture', key: 'lc2d09bd', rail: 1, x: 226, rep: 'KM1.2' },
    { id: 'plc', label: 'A1 · Automate M221 TM221CE16R', key: 'plc', rail: 2, x: 46, rep: 'A1' },
    ...X1(46, 3),
    ...X2E,
  ],
  annexItems: [],
  recvItems: [
    { key: 'lecteurrfid', rep: 'S1', name: 'lecteur de badge RFID LP ROX · pilier', x: 318, y: 36, w: 30, h: 56, recv: true },
    { key: 'feuorange', rep: 'H1', name: 'feu orange 7 cd · pilier', x: 352, y: 22, w: 30, h: 72, recv: true },
    { key: 'limitswitch', rep: 'S3', name: 'fin de course XCKL115 · portail fermé', x: 386, y: 32, w: 30, h: 70, recv: true },
    { key: 'limitswitch', rep: 'S4', name: 'fin de course XCKL115 · portail ouvert', x: 420, y: 32, w: 30, h: 70, recv: true },
    { key: 'cellule', rep: 'S5', name: 'cellule reflex PNP XUB1BPANL2 · passage', x: 454, y: 40, w: 36, h: 50, recv: true },
    { key: 'barrepalpeuse', rep: 'S6', name: 'barre palpeuse CMM200/J · bord du portail', x: 496, y: 18, w: 26, h: 84, recv: true },
  ],
  liaisons: LIAISONS,
  nets: netsEcobike(),
  commandeContinue: true,
  uContinu: 24,
  plcIo: [
    { io: 'I0.0', label: 'S0 arrêt d\'urgence à clé (NF), par X2:2', device: 'porte du coffret' },
    { io: 'I0.1', label: 'S1 lecteur de badge RFID, par X2:3', device: 'pilier du portail' },
    { io: 'I0.2', label: 'S2 bouton d\'ouverture intérieur (NO), par X2:4', device: 'porte du coffret' },
    { io: 'I0.3', label: 'S3 fin de course portail fermé, par X2:5', device: 'rail du portail' },
    { io: 'I0.4', label: 'S4 fin de course portail ouvert, par X2:6', device: 'rail du portail' },
    { io: 'I0.5', label: 'S5 cellule reflex PNP (fil noir), par X2:7', device: 'passage' },
    { io: 'I0.6', label: 'S6 barre palpeuse, par X2:8', device: 'portail' },
    { io: 'Q0.0', label: 'KM1.1 ouverture (par le NF 21-22 de KM1.2)', device: 'inverseur' },
    { io: 'Q0.1', label: 'KM1.2 fermeture (par le NF 21-22 de KM1.1)', device: 'inverseur' },
    { io: 'Q0.2', label: 'H1 feu orange, par X2:10', device: 'pilier du portail' },
    { io: 'COM', label: 'commun des entrées relié au 0 V de AL1 (logique positive)', device: 'automate' },
    { io: 'COM0', label: 'commun des sorties Q0.0 à Q0.3 au + 24 V⎓ (X2:1, après Q2 13-14)', device: 'alimentation AL1' },
  ],
  plcSorties: { 'Q0.0': 'km1', 'Q0.1': 'off', 'Q0.2': 'km1' },
  automateMiseEnService: {
    appareil: 'TM221CE16R · Ecobike_portail.smbp',
    logiciel: 'Machine Expert Basic · programme en Grafcet (SFC) · transposé du grafcet de programmation B.3.7',
    variables: [
      { mnemo: 'S0', role: 'arrêt d’urgence à clef (NF)', attendu: '%I0.0', usine: '%I0.0' },
      { mnemo: 'S1', role: 'lecteur de badge', attendu: '%I0.1', usine: '%I0.1' },
      { mnemo: 'S2', role: 'BP ouverture', attendu: '%I0.2', usine: '%I0.2' },
      { mnemo: 'S3', role: 'fin de course fermeture', attendu: '%I0.3', usine: '%I0.3' },
      { mnemo: 'S4', role: 'fin de course ouverture', attendu: '%I0.4', usine: '%I0.4' },
      { mnemo: 'S5', role: 'cellule photoélectrique', attendu: '%I0.5', usine: '%I0.5' },
      { mnemo: 'S6', role: 'barre palpeuse', attendu: '%I0.6', usine: '%I0.6' },
      { mnemo: 'KM1.1', role: 'contacteur OUVERTURE', attendu: '%Q0.0', usine: '%Q0.1' },
      { mnemo: 'KM1.2', role: 'contacteur FERMETURE', attendu: '%Q0.1', usine: '%Q0.0' },
      { mnemo: 'H1', role: 'feu clignotant', attendu: '%Q0.2', usine: '%Q0.2' },
    ],
    entrees: ['%I0.0', '%I0.1', '%I0.2', '%I0.3', '%I0.4', '%I0.5', '%I0.6', '%I0.7', '%I0.8'],
    sorties: ['%Q0.0', '%Q0.1', '%Q0.2', '%Q0.3'],
    tempos: [
      { id: 'tm1', label: '%TM1 · feu avant mouvement (étape 1)', attendu: 3, usine: 1, why: 'DTR 8 : « Tempo étape 1 = 3 s » — le feu prévient 3 s avant tout mouvement.' },
      { id: 'tm3', label: '%TM3 · attente portail ouvert (étape 3)', attendu: 20, usine: 5, why: 'DTR 8 : « Tempo étape 3 = 20 s » — le temps de passer avec un vélo.' },
      { id: 'tm5', label: '%TM5 · feu après obstacle (étape 5)', attendu: 3, usine: 1, why: 'DTR 8 : « Tempo étape 5 = 3 s » avant la réouverture.' },
    ],
    valeurs: [1, 2, 3, 5, 10, 15, 20, 30],
    pourquoiAdresses: 'Les adresses suivent le câblage de la platine et la table B.3.5-6 : S0 à S6 sur %I0.0 à %I0.6, KM1.1 (ouverture) sur %Q0.0, KM1.2 sur %Q0.1, H1 sur %Q0.2.',
  },
  essaisPortail: true,
  tests: [
    ...BASE_TESTS,
    {
      id: 'verr',
      title: 'Verrouillages de l’inverseur',
      how: 'Consigné, pousse à la main les équipages mobiles de KM1.1 et KM1.2 : la condamnation mécanique doit interdire de fermer les deux ensemble. Puis, à l’ohmmètre, vérifie le NF 21-22 de chaque contacteur (≈ 0 Ω au repos, OL équipage enfoncé).',
      expected: 'jamais les deux contacteurs fermés ensemble · 21-22 fermé au repos',
    },
    {
      id: 'entrees',
      title: 'Contacts des capteurs (NO / NF)',
      how: 'Multimètre en Ω entre X2:11 (+ 24 V terrain) et X2:3, X2:5, X2:6, X2:8 en actionnant le capteur concerné ; entre X2:1 et X2:2 (S0, NF) puis X2:4 (S2, NO).',
      expected: 'S3 fermé portail fermé · S4 ouvert · S0 ≈ 0 Ω relâché · S2 et S6 OL au repos',
    },
    {
      id: 'cc24',
      title: 'Absence de court-circuit sur le 24 V⎓',
      how: 'AL1 hors tension, multimètre en Ω entre X2:1 (+ 24 V) et X2:9 (0 V), puis aux bornes A1-A2 de chaque bobine LC2D09BD (2,4 W sous 24 V⎓) : on ne doit trouver que des charges, jamais un conducteur.',
      expected: 'bobine ≈ 240 Ω, jamais ≈ 0 Ω entre + 24 V et 0 V',
    },
  ],
  mesures: [
    { id: 'rpe', title: 'Continuité du PE jusqu’à la carcasse du moteur', stage: 'horsTension', instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'M.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'riso', title: 'Isolement U1 / PE sous 500 V', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'M.U1', b: 'M.PE', min: 0.5, max: 9999, unit: 'MΩ' },
    { id: 'renr', title: 'Résistance de l’enroulement U (U1 – U2)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.U2', min: 15, max: 28, unit: 'Ω' },
    { id: 'renrV', title: 'Résistance de l’enroulement V (V1 – V2) : identique à U', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'M.V1', b: 'M.V2', min: 15, max: 28, unit: 'Ω' },
    { id: 'renrW', title: 'Résistance de l’enroulement W (W1 – W2) : identique à U', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'M.W1', b: 'M.W2', min: 15, max: 28, unit: 'Ω' },
    { id: 'u400', title: 'Tension composée en aval de Q1 (L1 – L2)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'ctl' },
    { id: 'u230', title: 'Alimentation 230 V de l’automate (L – N)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'plc.L', b: 'plc.N', min: 220, max: 240, unit: 'V', when: 'ctl' },
    { id: 'u24dc', title: 'Sortie de AL1 (+ 24 / 0 V)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'al1.+24', b: 'al1.0V', min: 22, max: 26, unit: 'V', when: 'ctl' },
    { id: 'uI03', title: 'Entrée %I0.3, portail fermé (%I0.3 / COM)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'plc.I0.3', b: 'plc.COM', min: 22, max: 26, unit: 'V', when: 'ctl' },
    { id: 'iL', title: 'Courant de ligne à la pince, portail en ouverture (KM1.1:2 → X1:6) : ≈ 0,8 A', stage: 'sousTension', instrument: 'clamp', dial: 'A~', wire: 'km1.2>x1_6.a', min: 0.6, max: 1.0, unit: 'A', when: 'run' },
  ],
  faults: FAULTS,
  quiz: [
    { q: 'Quel appareil assure la consignation du coffret ?', options: ['Q2 disjoncteur moteur', 'Q1 interrupteur-sectionneur 4P cadenassable', 'KM1.1', 'L’automate'], answer: 1 },
    { q: 'Que signifie RFID ?', options: ['Remote Frequency Infrared Detection', 'Radio Frequency IDentification', 'Radio Field Integrated Device', 'Reader For IDentity'], answer: 1 },
    { q: 'Réseau 400 V, moteur 230 / 400 V : quel couplage, et quelles barrettes ?', options: ['Triangle : U1-W2, V1-U2, W1-V2', 'Étoile : W2-U2 et U2-V2', 'Étoile : U1-V1-W1', 'Aucune barrette'], answer: 1 },
    { q: 'À quelle valeur régler le thermique du GV2-ME06 (In = 0,82 A) ?', options: ['0,63 A', '1 A', '1,6 A', '22,5 A'], answer: 1 },
    { q: 'À quoi sert le contact GV-AE1 13-14 en série sur le + 24 V ?', options: ['À alimenter le moteur', 'À couper toute la commande quand Q2 est ouvert ou déclenché', 'À réarmer Q2', 'À rien'], answer: 1 },
    { q: 'Pourquoi un LC2D09BD ?', options: ['Il est moins cher', 'La commande est en 24 V continu (AL1) : il faut des bobines BD', 'Il est plus petit', 'Pour le couplage étoile'], answer: 1 },
    { q: 'Pourquoi le COM des entrées est-il relié au 0 V ?', options: ['Pour la terre', 'La cellule est PNP : elle renvoie le + 24 V sur l’entrée (logique positive)', 'Pour alimenter les sorties', 'Par habitude'], answer: 1 },
    { q: 'Quelle adresse commande le feu orange ?', options: ['%I0.2', '%Q0.2', '%Q0.0', '%TM1'], answer: 1 },
    { q: 'Que fait le portail si la cellule est coupée pendant la fermeture ?', options: ['Il s’arrête définitivement', 'Il repasse par le feu 3 s puis se rouvre', 'Il accélère', 'Rien'], answer: 1 },
    { q: '%TM3 a été réglé à 5 s. Que constate-t-on à l’essai ?', options: ['Le feu clignote 5 s', 'Le portail se referme 5 s après son ouverture au lieu de 20 s', 'Le portail ne s’ouvre plus', 'Rien'], answer: 1 },
  ],
  motor: { P: 370, U: 400, In: 0.82, n: 1380, ns: 1500, cosPhi: 0.78 },
  station: true,
  hasMotor: true,
};
