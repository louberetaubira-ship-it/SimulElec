/**
 * TP · Chantier Écobike (lycée L. Couffignal) — éclairage KNX du local à vélos.
 *
 * Tiré du sujet CGM MELEC 2023, partie C. Suite technique directe du TP « Plateau
 * tertiaire KNX » (1 actionneur 2 voies, 1 poussoir 4 touches) : ici 9 participants
 * sur une seule ligne, six détecteurs de présence ET de luminosité, un actionneur
 * 8 voies à deux bancs de 4 canaux, et une interface IP/KNX qui prépare le TP4
 * Réseau. Deux nouveautés que le tertiaire ne demandait pas :
 *
 *  - une vraie MISE EN SERVICE simulée (wizard ETS à 5 onglets), pendant l'étape
 *    « Déconsignation & mise en service » — voir `MiseEnServiceKnx.tsx` et
 *    `src/lib/sim/knxMiseEnService.ts` ;
 *  - un ESSAI DE TRAVERSÉE DU LOCAL animé, pendant les « Mesures sous tension » —
 *    voir `EssaiKnxLocal.tsx`. La carte zone ↔ détecteur ↔ canal ↔ luminaire
 *    (`knxZones`, plus bas) est PARTAGÉE entre le wizard (onglet Liaisons) et cet
 *    essai : un seul endroit à corriger si elle devait changer.
 *
 * Le piège pédagogique du chantier : L9, le projecteur extérieur du portail, porte
 * SON PROPRE détecteur intégré et n'est PAS piloté par le bus — câblé en direct sur
 * Q14, il n'a ni adresse individuelle, ni sortie d'actionneur. C'est ce que
 * `fn-l9`/`id-l9` (préparation) et la panne `neutreL9` font découvrir.
 *
 * Correspondance avec le moteur de simulation (protections) :
 *  q1 = Q11 (différentiel 30 mA, tête, organe de consignation) ·
 *  f2 = Q12 (protection de l'alimentation de bus) ·
 *  f3 = Q13 (protection éclairage L1 à L4, canaux 1 à 4) ·
 *  q14 = Q14 (protection éclairage L5 à L9, canaux 5 à 8 + L9 en direct) — comme
 *  les disjoncteurs Q2/Q3 du portail Écobike, Q14 n'a pas de déclenchement simulé
 *  indépendant : le moteur de simulation n'en modélise que TROIS (q1, f2, f3).
 *  Ses bornes avales sont donc déclarées vives dès Q11 fermé (`live: 'q1'`), ce qui
 *  reste exact : rien à voir avec le bus, Q14 fournit directement le 230 V.
 *
 * Cette dissymétrie Q13 / Q14 sert justement le piège L9 : les luminaires L5 à L8
 * (pilotés par l'actionneur) restent gatés par le bus (`live: 'f2'`, donc coupés
 * si Q12 saute), alors que L9 (`live: 'q1'`) reste vivant même bus coupé — la seule
 * chose qui compte pour lui est que Q11 ET Q14 soient fermés.
 *
 * Câblage réel du tableau vs câblage du local : l'élève câble l'INTÉRIEUR du
 * coffret (arrivée, Q11 à Q14, alimentation de bus, interface, actionneur,
 * bornier X1). Les câbles du local — luminaires 3G1,5 depuis X1, et bus vers les
 * détecteurs et le poussoir depuis l'actionneur — sont posés par l'installateur
 * jusqu'aux borniers (liaisons `PRE`), comme le câble moteur du TP « Portail ».
 */
import type { KnxZone, Liaison, Slot, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Marque une liaison comme posée par l'installateur (câbles du local, déjà tirés jusqu'au bornier). */
const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

/**
 * Bornier X1 des départs : arrivée (L · N · PE) puis NEUF départs d'éclairage,
 * chacun avec sa phase coupée, son neutre et SA TERRE — 3 + 9 × 3 = 30 bornes.
 * Trop large pour un seul rail (30 × 18 px ≈ 540 px) : réparti sur deux rails,
 * comme le X2 du portail Écobike. Le classement en deux groupes est purement
 * visuel ; l'identifiant reste continu de x1_1 à x1_30.
 */
const X1_ROWS: [string, string, string][] = [
  ['termred', 'L', 'Arrivée phase'], ['termblue', 'N', 'Arrivée neutre'], ['earth', 'PE', 'Arrivée terre'],
  ...Array.from({ length: 9 }, (_, i) => i + 1).flatMap((n): [string, string, string][] => [
    ['termred', `L${n}`, `L${n} · phase coupée`],
    ['termblue', `N${n}`, `L${n} · neutre`],
    ['earth', `PE${n}`, `L${n} · terre`],
  ]),
];
const X1_KNX: Slot[] = X1_ROWS.map(([key, sub, label], i) => {
  const rail = i < 18 ? 2 : 3;
  const col = i < 18 ? i : i - 18;
  return {
    id: `x1_${i + 1}`,
    label: `X1:${i + 1} · ${label}`,
    key,
    rail,
    x: 46 + col * 18,
    mark: String(i + 1),
    sub,
    group: 'X1',
    ...(i === 0 ? { groupLabel: 'X1 · arrivée + départs L1 à L5' } : {}),
    ...(i === 18 ? { groupLabel: 'X1 · départs L6 à L9' } : {}),
  };
});

const LIAISONS: Liaison[] = [
  // ---- arrivée depuis le pupitre d'alimentation de l'atelier ----
  L('RES.L1', 'x1_1.b', 'L1'), L('RES.N', 'x1_2.b', 'N'), L('RES.PE', 'x1_3.b', 'PE'),
  // ---- X1 → Q11 ----
  L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.N', 'N'),
  // ---- Q11 → Q12 / Q13 / Q14 : trois départs depuis la tête ----
  L('q1.2', 'f2.1', 'L1'), L('q1.N2', 'f2.N', 'N'),
  L('q1.2', 'f3.1', 'L1'), L('q1.N2', 'f3.N', 'N'),
  L('q1.2', 'q14.1', 'L1'), L('q1.N2', 'q14.N', 'N'),
  // ---- Q12 → alimentation de bus A1 (230 V en entrée, masse à la terre) ----
  L('f2.2', 'a1.L', 'L1'), L('f2.N2', 'a1.N', 'N'), L('x1_3.a', 'a1.PE', 'PE'),
  // ---- bus KNX en guirlande : alimentation → interface → actionneur ----
  L('a1.+', 'k1.+', 'DC+'), L('a1.−', 'k1.−', 'DC-'),
  L('k1.+', 'k2.+', 'DC+'), L('k1.−', 'k2.−', 'DC-'),
  // ---- Q13 → commun L1 de l'actionneur (canaux 1 à 4) ; neutre direct au bornier ----
  L('f3.2', 'k2.L1', 'L1'),
  L('f3.N2', 'x1_5.a', 'N'), L('f3.N2', 'x1_8.a', 'N'), L('f3.N2', 'x1_11.a', 'N'), L('f3.N2', 'x1_14.a', 'N'),
  // ---- Q14 → commun L2 de l'actionneur (canaux 5 à 8) ET L9 EN DIRECT (pas d'actionneur) ----
  L('q14.2', 'k2.L2', 'L1'),
  L('q14.N2', 'x1_17.a', 'N'), L('q14.N2', 'x1_20.a', 'N'), L('q14.N2', 'x1_23.a', 'N'), L('q14.N2', 'x1_26.a', 'N'),
  L('q14.2', 'x1_28.a', 'L1'), L('q14.N2', 'x1_29.a', 'N'),
  // ---- sorties de l'actionneur → bornier : canal i → Li (i = 1 à 8) ----
  L('k2.1', 'x1_4.a', 'L1'), L('k2.2', 'x1_7.a', 'L1'), L('k2.3', 'x1_10.a', 'L1'), L('k2.4', 'x1_13.a', 'L1'),
  L('k2.5', 'x1_16.a', 'L1'), L('k2.6', 'x1_19.a', 'L1'), L('k2.7', 'x1_22.a', 'L1'), L('k2.8', 'x1_25.a', 'L1'),
  // ---- conducteur de protection : de l'arrivée à chaque départ luminaire ----
  ...[6, 9, 12, 15, 18, 21, 24, 27, 30].map((n) => L('x1_3.a', `x1_${n}.a`, 'PE')),
  // ---- terrain (installateur) : départs vers les luminaires, posés jusqu'au bornier ----
  ...Array.from({ length: 9 }, (_, i) => i + 1).flatMap((i) => {
    const base = 3 + (i - 1) * 3;
    return [
      PRE(`x1_${base + 1}.b`, `L${i}.X1`, 'L1'),
      PRE(`x1_${base + 2}.b`, `L${i}.X2`, 'N'),
      PRE(`x1_${base + 3}.b`, `L${i}.PE`, 'PE'),
    ];
  }),
  // ---- terrain (installateur) : bus vers les participants du local, posé jusqu'à l'actionneur ----
  ...['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'BP'].flatMap((d) => [
    PRE('k2.+', `${d}.X1`, 'DC+'), PRE('k2.−', `${d}.X2`, 'DC-'),
  ]),
];

/** Réseaux des bornes (nature et condition de présence de tension). */
function netsEcobikeKnx(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live']) => {
    for (const id of ids) n[id] = { net, live };
  };
  const ab = (b: string) => [`${b}.a`, `${b}.b`];

  // bornier X1 : arrivée toujours vive, PE toujours au potentiel de terre
  set(ab('x1_1'), 'L1', 'always'); set(ab('x1_2'), 'N', 'always'); set(ab('x1_3'), 'PE', 'always');
  for (const i of [1, 2, 3, 4]) {
    const base = 3 + (i - 1) * 3;
    set(ab(`x1_${base + 1}`), 'L1', 'f3'); set(ab(`x1_${base + 2}`), 'N', 'f3'); set(ab(`x1_${base + 3}`), 'PE', 'always');
  }
  for (const i of [5, 6, 7, 8]) {
    const base = 3 + (i - 1) * 3;
    set(ab(`x1_${base + 1}`), 'L1', 'f2'); set(ab(`x1_${base + 2}`), 'N', 'f2'); set(ab(`x1_${base + 3}`), 'PE', 'always');
  }
  // L9 : direct sur Q14, indépendant du bus — le piège pédagogique du chantier
  set(ab('x1_28'), 'L1', 'q1'); set(ab('x1_29'), 'N', 'q1'); set(ab('x1_30'), 'PE', 'always');

  // Q11 : différentiel de tête (organe de consignation)
  set(['q1.1'], 'L1', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2'], 'L1', 'q1'); set(['q1.N2'], 'N', 'q1');
  // Q12 : protection de l'alimentation de bus
  set(['f2.1'], 'L1', 'q1'); set(['f2.N'], 'N', 'always');
  set(['f2.2'], 'L1', 'f2'); set(['f2.N2'], 'N', 'f2');
  // Q13 : protection éclairage L1 à L4
  set(['f3.1'], 'L1', 'q1'); set(['f3.N'], 'N', 'always');
  set(['f3.2'], 'L1', 'f3'); set(['f3.N2'], 'N', 'f3');
  // Q14 : protection éclairage L5 à L9 — pas de déclenchement simulé (le moteur n'en
  // modélise que trois) : toujours vive dès Q11 fermé, comme Q2/Q3 du portail Écobike.
  set(['q14.1'], 'L1', 'q1'); set(['q14.N'], 'N', 'always');
  set(['q14.2'], 'L1', 'q1'); set(['q14.N2'], 'N', 'q1');

  // A1 : alimentation de bus, 230 V en entrée (protégée par Q12), 29 V DC en sortie
  set(['a1.L'], 'L1', 'f2'); set(['a1.N'], 'N', 'f2'); set(['a1.PE'], 'PE', 'always');
  set(['a1.+'], 'DC+', 'f2'); set(['a1.−'], 'DC-', 'f2');
  // K1 : interface IP/KNX, alimentée par le bus
  set(['k1.+'], 'DC+', 'f2'); set(['k1.−'], 'DC-', 'f2');
  // K2 : actionneur 8 voies — deux communs, chacun sous SA propre protection
  set(['k2.+'], 'DC+', 'f2'); set(['k2.−'], 'DC-', 'f2');
  set(['k2.L1'], 'L1', 'f3'); for (const i of [1, 2, 3, 4]) set([`k2.${i}`], 'L1', 'f3');
  set(['k2.L2'], 'L1', 'f2'); for (const i of [5, 6, 7, 8]) set([`k2.${i}`], 'L1', 'f2');

  // participants d'annexe du local (bus)
  for (const d of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'BP']) {
    set([`${d}.X1`], 'DC+', 'f2'); set([`${d}.X2`], 'DC-', 'f2');
  }
  // luminaires : phase coupée, neutre, terre
  for (let i = 1; i <= 9; i += 1) {
    const cond: TerminalNet['live'] = i <= 4 ? 'f3' : i === 9 ? 'q1' : 'f2';
    set([`L${i}.X1`], 'L1', cond); set([`L${i}.X2`], 'N', cond); set([`L${i}.PE`], 'PE', 'always');
  }
  return n;
}

/** Question de préparation (raccourci d'écriture : la bonne réponse est toujours la première). */
const Q = (
  id: string, rep: string, invite: string, options: string[], why: string,
  schema: 'puissance' | 'commande' = 'commande', focus?: string,
) => ({ id, rep, invite, options, answer: 0, why, schema, focus: focus ?? (rep.includes(' ') || rep.includes('/') ? undefined : rep) });

/** Zones du local : détecteur → canal(aux) de l'actionneur → luminaire(s). */
const KNX_ZONES: KnzZonesType = [
  { id: 'z12', label: 'Z1-2', detecteur: 'D1', canaux: [1], luminaires: ['L1'] },
  { id: 'z34', label: 'Z3-4', detecteur: 'D2', canaux: [2], luminaires: ['L2'] },
  { id: 'z56', label: 'Z5-6', detecteur: 'D3', canaux: [3], luminaires: ['L3'] },
  { id: 'z78', label: 'Z7-8', detecteur: 'D4', canaux: [4], luminaires: ['L4'] },
  // Circulation 2 et Circulation 1 partagent le canal 6 → le luminaire L6 est COMMUN
  // aux deux : un point lumineux unique, jamais dupliqué, allumé par D5 OU D6.
  { id: 'circ2', label: 'Circulation 2', detecteur: 'D5', canaux: [5, 6], luminaires: ['L5', 'L6'] },
  { id: 'circ1', label: 'Circulation 1', detecteur: 'D6', canaux: [6, 7], luminaires: ['L6', 'L7'] },
];
type KnzZonesType = KnxZone[];

export const TP_ECOBIKE_KNX: TpDefinition = {
  id: 'ecobike-knx',
  title: 'Écobike · Éclairage KNX du local à vélos',
  level: 'Tle Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  competences: ['C1 Analyser', 'C3 Concevoir', 'C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  diplomas: ['bacpro'],
  uContinu: 29,
  arriveeMono: true,
  summary:
    'Chantier Écobike (sujet CGM MELEC 2023, partie C). Local à vélos, 8 zones de recharge et 2 zones de '
    + 'circulation : l’éclairage s’allume par zone, à la détection de présence ET à la luminosité. '
    + 'Alimentation de bus MTN684032, interface IP/KNX MTN6502-0105, actionneur de commutation 8 voies '
    + 'MTN647893, 6 détecteurs de présence et de luminosité MTN630860, poussoir 2 touches MTN617119 pour '
    + 'le local électrique. Mise en service KNX simulée (wizard ETS) puis essai de traversée du local.',
  situation:
    'Le lycée Louis Couffignal termine l’Écobike : reste à équiper le local à vélos de son éclairage. '
    + 'Le bureau d’études a choisi le bus KNX, déjà connu du plateau tertiaire, pour économiser l’énergie '
    + '— l’éclairage d’une zone ne s’allume que si quelqu’un y est ET qu’il n’y a pas assez de lumière '
    + 'naturelle. Tu identifies le matériel, tu câbles le tableau depuis le pupitre d’alimentation, tu '
    + 'programmes les neuf participants dans ETS, puis tu vérifies l’installation en traversant le local.',
  plaque: {
    'Bus KNX': '29 V DC · paire torsadée',
    'Alimentation': '230 V AC → 320 mA · 90,5 mA consommés',
    'Participants': '9 sur la ligne 1.1',
    'Actionneur': '8 × 230 V · 16 A par voie, deux communs',
    'Détecteurs': '6 × présence + luminosité · 8 mA chacun',
    'Poussoir': '2 touches · canal 8 uniquement',
    'Logiciel': 'ETS5 Professional',
    'Câble luminaires': '3G1,5',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '230 V + N + PE depuis le pupitre d’alimentation de l’atelier, arrivée sur X1' },
    { k: 'Tête', v: 'Q11 interrupteur différentiel 30 mA : organe de consignation' },
    { k: 'Bus KNX', v: 'paire torsadée 29 V DC issue de l’alimentation MTN684032, protégée par Q12' },
    { k: 'Éclairage', v: 'Q13 protège L1 à L4 (canaux 1 à 4), Q14 protège L5 à L9 (canaux 5 à 8 et L9 en direct)' },
    { k: 'Zones de recharge', v: 'Z1-2 → D1 → canal 1 → L1 · Z3-4 → D2 → canal 2 → L2 · Z5-6 → D3 → canal 3 → L3 · Z7-8 → D4 → canal 4 → L4' },
    { k: 'Circulations', v: 'Circulation 2 → D5 → canaux 5 et 6 → L5 et L6 · Circulation 1 → D6 → canaux 6 et 7 → L6 et L7 (L6 COMMUN)' },
    { k: 'Local électrique', v: 'canal 8 → L8, commandé UNIQUEMENT par BP : touche 1 = ON, touche 2 = OFF, pas de détecteur' },
    { k: 'Paramétrage', v: 'canaux 1 à 7 en MINUTERIE (temporisation d’escalier) · canal 8 en COMMUTATION simple' },
    { k: 'L9', v: 'projecteur extérieur à détecteur intégré, câblé EN DIRECT sur Q14 : pas d’adresse KNX' },
    { k: 'Adressage', v: 'ligne 1.1 : interface 1.1.1 (fixe) · actionneur 1.1.2 · BP 1.1.5 · D1 à D6 : 1.1.9 à 1.1.3' },
    { k: 'Câble', v: '3G1,5 pour les neuf luminaires ; le bus reste dans sa propre gaine, séparé du 230 V' },
    { k: 'Avant mise en service', v: 'consignation sur Q11 · VAT · continuité PE · contrôle de polarité et d’absence de boucle sur le bus' },
  ],
  puissance: {
    phases: ['L'],
    reseau: '230 V + N + PE · 50 Hz',
    organes: [
      { type: 'bornier', rep: 'X1', legende: 'arrivée réseau · borne 1', bornes: [['1', '']] },
      { type: 'disjoncteur', rep: 'Q11', legende: 'différentiel 30 mA · coupe la phase ET le neutre' },
      { type: 'disjoncteur', rep: 'Q13', legende: 'éclairage L1 à L4 · phase + neutre (Q14 identique → L5 à L9)' },
      { type: 'contacteur', rep: 'K2', legende: 'actionneur KNX · canal 1 → L1 (les 7 autres canaux identiques)', bornes: [['L1', '1']] },
      { type: 'bornier', rep: 'X1', legende: 'départ · phase coupée vers L1', bornes: [['4', '']] },
    ],
  },
  folio: {
    railHaut: 'BUS KNX (+) · 29 V DC · conducteur rouge',
    railBas: 'BUS KNX (−) · conducteur noir',
    source: 'a1.+', repSource: 'A1:+',
    retour: 'a1.−', repRetour: 'A1:−',
    retourALaTerre: false,
    colonnes: [
      { id: 'k1', dx: 0, elements: [{ type: 'voyant', a: 'k1.+', b: 'k1.−', rep: 'K1', legende: 'interface IP/KNX' }] },
      { id: 'k2', dx: 1, elements: [{ type: 'voyant', a: 'k2.+', b: 'k2.−', rep: 'K2', legende: 'actionneur 8 sorties' }] },
      { id: 'd1', dx: 2, elements: [{ type: 'voyant', a: 'D1.X1', b: 'D1.X2', rep: 'D1', legende: 'détecteur · zone 1-2' }] },
      { id: 'bp', dx: 3, elements: [{ type: 'voyant', a: 'BP.X1', b: 'BP.X2', rep: 'BP', legende: 'poussoir · local électrique' }] },
    ],
  },
  preparation: {
    identification: [
      Q('id-q11', 'Q11', 'Quel appareil porte le repère Q11 ?', [
        'Un interrupteur différentiel 30 mA', 'Un disjoncteur moteur', 'Un sectionneur porte-fusibles', 'Un contacteur de puissance',
      ], 'Q11 est l’interrupteur différentiel 30 mA de tête : protection des personnes et organe de consignation du tableau.', 'puissance'),
      Q('id-q12', 'Q12', 'Que protège le disjoncteur Q12 ?', [
        'L’alimentation de bus KNX', 'Les luminaires L1 à L4', 'Les luminaires L5 à L9', 'Le poussoir BP',
      ], 'Q12 (1P+N C2) protège l’alimentation de bus : sans lui, plus de 29 V sur le câble rouge / noir.', 'puissance'),
      Q('id-q1314', 'Q13 / Q14', 'Que protègent Q13 et Q14 ?', [
        'Les départs d’éclairage : Q13 → L1 à L4, Q14 → L5 à L9', 'Le bus KNX', 'L’alimentation générale du tableau', 'Les détecteurs de présence',
      ], 'Deux disjoncteurs 1P+N C10 distincts : chacun protège son propre banc de luminaires, comme l’actionneur qui a deux bornes communes séparées.', 'puissance', 'Q13'),
      Q('id-a1', 'A1', 'Quel appareil porte ce repère, entre le 230 V et la paire torsadée ?', [
        'L’alimentation de bus KNX', 'Un transformateur de commande 24 V', 'Un variateur d’éclairage', 'Un parafoudre',
      ], 'MTN684032 : elle transforme le 230 V AC en 29 V DC pour le bus et alimente jusqu’à 64 participants.'),
      Q('id-k1', 'K1', 'Ce module à connecteur RJ45 sert à :', [
        'Relier ETS5 au bus KNX par le réseau local, ou à distance via Internet', 'Alimenter le bus', 'Commander l’éclairage', 'Mesurer la consommation du bus',
      ], 'MTN6502-0105 : interface IP/KNX. Elle transfère le programme comme le ferait une interface USB, et permet en plus l’accès au bus depuis le réseau.'),
      Q('id-k2', 'K2', 'Cet appareil à huit voies en façade est :', [
        'L’actionneur de commutation, à deux communs et huit sorties 230 V', 'Un contacteur de puissance', 'Un détecteur de présence', 'Un coupleur de ligne',
      ], 'MTN647893, actionneur 8 × 230 V / 16 A. Deux bornes communes (L1 pour les canaux 1 à 4, L2 pour les canaux 5 à 8), chacune sous sa propre protection.', 'puissance'),
      Q('id-det', 'D1 à D6', 'Que désignent D1 à D6 ?', [
        'Des détecteurs de présence et de luminosité', 'Des boutons-poussoirs', 'Des actionneurs', 'Des interfaces de communication',
      ], 'MTN630860 + boîte saillie MTN550619 : ils mesurent à la fois la présence ET le niveau de luminosité, sur les six zones du local.'),
      Q('id-bp', 'BP', 'Combien de fonctions ce poussoir peut-il commander ?', [
        'Une seule : l’éclairage du local électrique', 'Quatre', 'Huit, une par canal', 'Deux, dont l’extinction générale',
      ], 'MTN617119 : deux touches seulement, touche 1 = ON, touche 2 = OFF du canal 8. Contrairement au poussoir 4 touches du plateau tertiaire.'),
      Q('id-x1', 'X1', 'Que désigne le bornier X1 ?', [
        'Le bornier des départs d’éclairage : arrivée, puis L1 à L9', 'Le bornier du bus KNX', 'Le bornier de terre', 'Le tableau général du lycée',
      ], 'Trente bornes : trois pour l’arrivée (L, N, PE), puis trois par luminaire (phase coupée, neutre, terre) pour L1 à L9.'),
      Q('id-l9', 'L9', 'Pourquoi L9 n’a-t-il pas d’adresse KNX ?', [
        'C’est un projecteur à détecteur intégré, câblé en direct sur Q14', 'C’est un oubli du bureau d’études', 'Le bus est saturé', 'Il est trop loin du tableau',
      ], 'Le projecteur extérieur porte son propre détecteur : il s’allume et s’éteint tout seul, sans dialoguer avec le bus. Câblé en direct sur Q14, il n’a ni adresse individuelle ni sortie d’actionneur.', 'puissance', 'Q14'),
    ],
    fonctions: [
      Q('fn-avantages', 'KNX', 'Donne un avantage de la solution KNX pour l’Écobike.', [
        'Une grande flexibilité : reconfigurer une fonction se fait par logiciel, sans recâblage', 'Il faut plus de câble qu’une installation classique', 'Chaque fabricant a son propre protocole, incompatible avec les autres', 'Le bus ne fonctionne qu’avec des capteurs Schneider',
      ], 'Changer une fonction (quelle zone commande quel canal) se fait dans ETS, pas au fer à souder. On y ajoute l’économie de câblage et l’interopérabilité entre fabricants (norme ouverte).'),
      Q('fn-media', 'Médias KNX', 'Quel média de communication utilise le bus de ce chantier ?', [
        'TP, la paire torsadée', 'PL, le courant porteur', 'RF, la radio', 'IP, systématiquement pour tous les participants',
      ], 'La paire torsadée (TP) relie l’alimentation, l’actionneur, le poussoir et les détecteurs. PL utilise le réseau électrique, RF la radio, IP l’Ethernet — c’est le média de l’INTERFACE seule ici.'),
      Q('fn-ubus', 'Bus', 'Quelle tension et quelle nature mesure-t-on sur le bus, aux bornes des détecteurs ?', [
        '29 V continu, polarisé', '24 V alternatif', '230 V continu', '12 V continu, non polarisé',
      ], '29 V DC polarisé : la borne + et la borne − ne sont pas interchangeables, comme sur le plateau tertiaire.'),
      Q('fn-ip', 'K1', 'Pourquoi une interface IP/KNX plutôt qu’une interface USB, ici ?', [
        'Pour accéder au bus depuis le réseau local, voire par Internet via un VPN', 'Parce qu’elle est moins chère', 'Parce qu’elle alimente le bus', 'Parce que l’USB ne fonctionne pas avec ETS5',
      ], 'La fonction ajoutée est l’accès à distance : utile pour reprogrammer ou surveiller l’installation sans se déplacer jusqu’au tableau — ce que prépare le TP4 Réseau.'),
      Q('fn-q1314', 'Q13 / Q14', 'Pourquoi deux disjoncteurs distincts plutôt qu’un seul pour les 8 canaux ?', [
        'Chaque banc de 4 sorties de l’actionneur a son propre commun : une protection par commun', 'Pour respecter l’ordre alphabétique des repères', 'Un seul disjoncteur ne suffirait pas en calibre', 'Q13 protège le bus et Q14 les luminaires',
      ], 'L’actionneur MTN647893 porte DEUX bornes communes (une par banc de 4 canaux) : chacune se protège séparément, comme sur l’appareil réel.', 'puissance'),
      Q('fn-det', 'D', 'Que transmet un détecteur D1 à D6 sur le bus ?', [
        'La présence détectée et le niveau de luminosité mesuré', 'Directement l’ordre d’allumer la lampe, sans passer par l’actionneur', 'Le courant consommé par la zone', 'Rien : il agit en direct sur le luminaire',
      ], 'Un capteur transmet une INFORMATION sur le bus. C’est l’actionneur, abonné à la même adresse de groupe, qui la convertit en action.'),
      Q('fn-bp', 'BP', 'Que commande le poussoir BP de ce chantier ?', [
        'Uniquement le canal 8, éclairage du local électrique : touche 1 allume, touche 2 éteint', 'Les huit canaux de l’actionneur', 'L’extinction générale de tout le bus', 'Le passage jour / nuit des détecteurs',
      ], 'Contrairement au poussoir 4 touches du plateau tertiaire, ce modèle 2 touches ne commande qu’une seule fonction.'),
      Q('fn-boucle', 'BUS', 'Pourquoi le bus ne doit-il jamais être câblé en boucle ?', [
        'La boucle perturbe la transmission des télégrammes et fausse la topologie', 'Elle provoque un court-circuit immédiat', 'Elle double la tension du bus', 'Elle empêche l’alimentation de démarrer',
      ], 'Guirlande, étoile ou arbre : jamais l’anneau. Une boucle crée des chemins multiples et rend la transmission aléatoire.'),
      Q('fn-alim', 'A1', 'Quelle est la fonction de l’alimentation de bus A1 ?', [
        'Alimenter la partie électronique des participants et assurer le fonctionnement de l’installation', 'Alimenter directement les luminaires en 230 V', 'Programmer les participants', 'Mesurer la consommation du bus',
      ], 'Elle alimente le bus (partie électronique des participants) et assure le fonctionnement de l’installation. Les luminaires, eux, restent alimentés en 230 V par Q13 / Q14.'),
    ],
    calculs: [
      Q('ca-sorties', 'K2', 'Combien de points lumineux sont réellement pilotés par le bus, et quel actionneur choisir ?', [
        '8 points lumineux (L1 à L8) → actionneur 8 voies MTN647893', '9 points lumineux → actionneur 9 voies', '8 points lumineux → actionneur 4 voies, en doublant les canaux', '6 points lumineux, un par détecteur → actionneur 6 voies',
      ], '8 zones ou circulations comptent chacune un point lumineux (L6 est commun aux deux circulations mais reste UN seul luminaire) : 8 sorties TOR, donc un actionneur 8 voies. L9 n’est pas KNX : il ne compte pas.'),
      Q('ca-conso', 'A1', 'Consommation totale du bus (interface 20 mA, actionneur 12,5 mA, BP 10 mA, 6 détecteurs à 8 mA) et alimentation à choisir ?', [
        '90,5 mA < 320 mA → MTN684032 convient largement', '90,5 mA > 320 mA → il faut une deuxième alimentation', '48 mA, l’alimentation 160 mA suffit', '132 mA, calibre trop juste pour 320 mA',
      ], '20 + 12,5 + 10 + 6 × 8 = 90,5 mA. Trois fois moins que les 320 mA de la MTN684032, déjà celle du plateau tertiaire.'),
      Q('ca-cable', 'Câble', 'Quelle section de câble pour l’alimentation des luminaires L1 à L9 ?', [
        '3G1,5 : la puissance de l’éclairage n’exige pas plus, et le bus reste un câble séparé', '3G2,5, comme pour les prises de courant', '5G1,5, en prévoyant un neutre de secours', '1,5 mm² sans PE, l’éclairage n’en a pas besoin',
      ], 'Circuits d’éclairage selon la NF C 15-100 : 1,5 mm² suffit, et puissance et bus restent deux câbles séparés — d’où le 3G1,5 (phase, neutre, PE).'),
      Q('ca-bdc', 'Bon de commande', 'Total du bon de commande (alim. 372,42 € · actionneur 749,87 € · BP 241,57 € · 6 détecteurs à 374,33 € · 6 boîtes saillie à 34,52 € · interface 471,01 €) ?', [
        '4 287,97 € HT → 5 145,56 € TTC', '3 500,00 € HT → 4 200,00 € TTC', '4 287,97 € TTC, sans TVA', '5 145,56 € HT → 6 174,67 € TTC',
      ], '372,42 + 749,87 + 241,57 + (6 × 374,33) + (6 × 34,52) + 471,01 = 4 287,97 € HT. TVA 20 % = 857,59 € → 5 145,56 € TTC.'),
    ],
  },
  postes: [
    {
      id: 'q11', name: 'Q11 · Protection de tête', need: 'Protéger les personnes et assurer la consignation du tableau',
      options: [
        { key: 'rcd2p', ref: 'Acti9 iID 2P 40 A 30 mA type AC', spec: 'interrupteur différentiel 30 mA', ok: true, why: '30 mA pour la protection des personnes, cadenassable : c’est l’organe de consignation du TP.' },
        { key: 'rcd2p', ref: 'Acti9 iID 2P 40 A 300 mA', spec: 'différentiel 300 mA', why: '300 mA protège contre l’incendie, pas les personnes : insuffisant en tête d’un tableau terminal.' },
        { key: 'mcb2p', ref: 'Disjoncteur 2P C32', spec: 'sans différentiel', why: 'Un disjoncteur protège les conducteurs, pas les personnes : plus de détection de courant de défaut.' },
      ],
    },
    {
      id: 'q12', name: 'Q12 · Protection de l’alimentation de bus', need: 'Protéger l’alimentation de bus KNX (90,5 mA consommés), phase + neutre',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C2', spec: 'phase + neutre · 2 A', ok: true, why: '2 A largement suffisant pour 90,5 mA consommés, et le neutre s’ouvre en même temps que la phase pour intervenir.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: 'unipolaire', half: true, why: 'Protège correctement mais laisse le neutre raccordé pendant l’intervention.' },
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C20', spec: 'phase + neutre · 20 A', why: 'Calibre sans rapport avec une consommation de quelques dizaines de milliampères.' },
      ],
    },
    {
      id: 'q1314', name: 'Q13 / Q14 · Protections éclairage', need: 'Protéger les deux départs d’éclairage (L1 à L4 et L5 à L9), phase + neutre, 1,5 mm²',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C10 (× 2)', spec: 'phase + neutre · 10 A', ok: true, why: '10 A convient à des luminaires en 1,5 mm², phase + neutre pour couper les deux conducteurs de chaque départ.' },
        { key: 'mcb1p', ref: 'iC60N 1P C10 (× 2)', spec: 'unipolaire', half: true, why: 'Protège correctement, mais laisse le neutre raccordé pendant l’intervention.' },
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C32 (× 2)', spec: 'phase + neutre · 32 A', why: 'Calibre bien trop élevé pour des luminaires en 1,5 mm² : ils ne seraient plus protégés d’une surcharge.' },
      ],
    },
    {
      id: 'a1', name: 'A1 · Alimentation de bus KNX', need: 'Fournir le 29 V DC du bus, pour 9 participants (90,5 mA)',
      options: [
        { key: 'knxalim', ref: 'Schneider MTN684032', spec: '230 V AC → bus 320 mA · 64 participants · bobine d’inductance intégrée', ok: true, why: '320 mA couvrent très largement les 90,5 mA des 9 participants du bus, et la bobine d’inductance est intégrée.' },
        { key: 'knxalim', ref: 'Schneider MTN683832', spec: '230 V AC → bus 160 mA', half: true, why: '160 mA suffiraient aux 90,5 mA consommés, mais interdisent toute extension du local. On prend la 320 mA.' },
        { key: 'knxalim', ref: 'Phaseo ABL8RPS24030', spec: 'alimentation 230 V AC → 24 V DC · 3 A', why: 'Alimentation à découpage ordinaire : ni les 29 V du bus, ni la bobine d’inductance qui laisse circuler les télégrammes.' },
      ],
    },
    {
      id: 'k1', name: 'K1 · Interface de communication', need: 'Transférer le programme ETS5 aux participants ET permettre l’accès au bus depuis le réseau',
      options: [
        { key: 'knxip', ref: 'Schneider MTN6502-0105', spec: 'interface IP/KNX · alimentée par le bus', ok: true, why: 'Interface de programmation ET passerelle réseau : elle permet d’accéder au bus via Internet et un VPN.' },
        { key: 'knxusb', ref: 'Schneider MTN681829', spec: 'interface USB KNX', half: true, why: 'Elle programmerait tout aussi bien les participants, mais seulement depuis un PC branché en USB au tableau : pas d’accès depuis le réseau.' },
        { key: 'knxusb', ref: 'Convertisseur USB / RS485', spec: 'adaptateur série générique', why: 'Ne parle pas le protocole KNX : ETS5 ne verrait aucun participant.' },
      ],
    },
    {
      id: 'k2', name: 'K2 · Actionneur de commutation', need: 'Commuter 8 points lumineux indépendants (L1 à L8), deux bancs de 4 canaux',
      options: [
        { key: 'knxact8', ref: 'Schneider MTN647893', spec: 'actionneur KNX 8 × 230 V / 16 A · commande manuelle', ok: true, why: '8 voies pour 8 points lumineux à commander indépendamment.' },
        { key: 'knxact', ref: 'Schneider MTN649202', spec: 'actionneur KNX 2 × 230 V / 10 A', why: '2 voies seulement : il manquerait 6 sorties pour piloter les 8 points lumineux.' },
        { key: 'knxact8', ref: 'Actionneur 4 voies, en doublant les canaux', spec: '4 × 230 V / 16 A', half: true, why: '4 voies, en pilotant deux luminaires par canal : cela marierait des zones qui doivent s’allumer indépendamment.' },
      ],
    },
    {
      id: 'bp', name: 'BP · Poussoir du local électrique', need: 'Commander le canal 8 (ON / OFF) depuis le local électrique',
      options: [
        { key: 'knxbp', ref: 'Schneider MTN617119', spec: 'Mosaic KNX · 2 touches blanc brillant · touche 1 ON, touche 2 OFF', ok: true, why: 'Deux touches suffisent : une seule fonction, deux ordres. Blanc brillant, comme demandé au dossier technique.' },
        { key: 'knxbp', ref: 'Schneider MGU3.531.18', spec: 'Unica KNX · 2 touches, 4 poussoirs', half: true, why: 'Fonctionnerait électriquement (mêmes bornes X1 / X2), mais ce n’est pas la référence du bon de commande : quatre poussoirs pour une seule fonction, c’est plus que nécessaire.' },
        { key: 'knxbp', ref: 'Interrupteur va-et-vient 10 A', spec: 'appareillage classique 230 V', why: 'Coupe le 230 V dans le mur : aucun télégramme, pas sa place sur un bus 29 V.' },
      ],
    },
    {
      id: 'det', name: 'D1 à D6 · Détecteurs de présence', need: 'Détecter la présence ET mesurer la luminosité, finition Alu',
      options: [
        { key: 'knxdet', ref: 'Schneider MTN630860 + boîte saillie MTN550619', spec: 'détection + luminosité · finition Alu · 8 mA', ok: true, why: 'Les deux fonctionnalités sont exigées : présence ET luminosité, pour économiser l’énergie le jour.' },
        { key: 'knxdet', ref: 'Détecteur de présence, sans mesure de luminosité', spec: 'détection seule', half: true, why: 'Détecterait bien la présence, mais sans mesure de luminosité les lampes s’allumeraient même en plein jour.' },
        { key: 'knxdet', ref: 'Détecteur inductif Ø 18', spec: 'portée 8 mm', why: 'Ne détecte que du métal à quelques millimètres : inutilisable pour une présence humaine.' },
      ],
    },
    {
      id: 'x1', name: 'X1 · Bornier des départs', need: 'Arrivée L / N / PE et neuf départs d’éclairage en 1,5 mm²',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE', spec: 'bornes sur rail · PE vert-jaune', ok: true, why: 'Bornes sur rail, borne PE identifiée : le repérage de chaque départ reste lisible pour la maintenance.' },
        { key: 'termgrey', ref: 'Bornes automatiques en fond de coffret', spec: 'sans rail', half: true, why: 'Admis en logement, mais en tertiaire on veut un bornier repéré, contrôlable au tournevis dynamométrique.' },
        { key: 'termgrey', ref: 'Dominos', spec: 'connecteurs à vis', why: 'Interdit en armoire : bornes sur rail obligatoires.' },
      ],
    },
  ],
  rails: [150, 350, 550, 720],
  armoire: 900,
  gaines: [
    { id: 'g1', rep: 'G1', x: 70, diam: 20, nature: 'force', contenu: '3 conducteurs 6 mm² · L, N, PE', vers: 'pupitre d’alimentation de l’atelier', dessert: ['RES.'] },
    { id: 'g2', rep: 'G2', x: 150, diam: 20, nature: 'tbts', contenu: '1 câble de bus KNX · paire torsadée rouge / noir', vers: 'détecteurs D1 à D6 et poussoir du local', dessert: ['D1.', 'D2.', 'D3.', 'D4.', 'D5.', 'D6.', 'BP.'] },
    { id: 'g3', rep: 'G3', x: 240, diam: 25, nature: 'force', contenu: '4 câbles 3G1,5 · zones de recharge 1 à 4', vers: 'luminaires L1 à L4', dessert: ['L1.', 'L2.', 'L3.', 'L4.'] },
    { id: 'g4', rep: 'G4', x: 340, diam: 25, nature: 'force', contenu: '4 câbles 3G1,5 · circulations et local électrique', vers: 'luminaires L5 à L8', dessert: ['L5.', 'L6.', 'L7.', 'L8.'] },
    { id: 'g5', rep: 'G5', x: 420, diam: 16, nature: 'force', contenu: '1 câble 3G1,5 · projecteur à détecteur intégré', vers: 'L9 · pilier extérieur, direct sur Q14', dessert: ['L9.'] },
  ],
  goulotteDePied: false,
  slots: [
    { id: 'q1', label: 'Q11 · Interrupteur différentiel 30 mA (consignation)', key: 'rcd2p', rail: 0, x: 46, rep: 'Q11' },
    { id: 'f2', label: 'Q12 · Protection de l’alimentation de bus', key: 'mcb1pn', rail: 0, x: 112, rep: 'Q12' },
    { id: 'f3', label: 'Q13 · Protection éclairage L1 à L4', key: 'mcb1pn', rail: 0, x: 178, rep: 'Q13' },
    { id: 'q14', label: 'Q14 · Protection éclairage L5 à L9', key: 'mcb1pn', rail: 0, x: 244, rep: 'Q14' },
    { id: 'a1', label: 'A1 · Alimentation de bus KNX 320 mA · MTN684032', key: 'knxalim', rail: 0, x: 310, rep: 'A1' },
    { id: 'k1', label: 'K1 · Interface IP/KNX · MTN6502-0105', key: 'knxip', rail: 1, x: 46, rep: 'K1' },
    { id: 'k2', label: 'K2 · Actionneur de commutation 8 × 16 A · MTN647893', key: 'knxact8', rail: 1, x: 120, rep: 'K2' },
    ...X1_KNX,
  ],
  annexItems: [
    { key: 'knxdet', rep: 'D1', name: 'détecteur · zone 1-2', x: 440, y: 90, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D2', name: 'détecteur · zone 3-4', x: 492, y: 90, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D3', name: 'détecteur · zone 5-6', x: 440, y: 150, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D4', name: 'détecteur · zone 7-8', x: 492, y: 150, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D5', name: 'détecteur · circulation 2', x: 440, y: 210, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D6', name: 'détecteur · circulation 1', x: 492, y: 210, w: 44, h: 44 },
    { key: 'knxbp', rep: 'BP', name: 'poussoir 2 touches · local électrique', x: 464, y: 280, w: 56, h: 56 },
  ],
  recvItems: [
    { key: 'l_ampoule_plexo_hublot', rep: 'L1', name: 'luminaire · zone 1-2', x: 15, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L2', name: 'luminaire · zone 3-4', x: 75, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L3', name: 'luminaire · zone 5-6', x: 135, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L4', name: 'luminaire · zone 7-8', x: 195, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L5', name: 'luminaire · circulation 2', x: 255, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L6', name: 'luminaire commun · circulations 1 et 2', x: 315, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L7', name: 'luminaire · circulation 1', x: 375, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L8', name: 'luminaire · local électrique', x: 435, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L9', name: 'projecteur extérieur à détecteur intégré · direct sur Q14', x: 495, y: 26, w: 50, h: 60, recv: true, pe: true },
  ],
  liaisons: LIAISONS,
  nets: netsEcobikeKnx(),
  knxZones: KNX_ZONES,
  knxMiseEnService: {
    interfaces: [
      { individuelle: '1.5.119', nom: 'domovea basic', ip: '10.129.140.3' },
      { individuelle: '1.1.1', nom: 'Interface IP KNX Écobike', ip: '192.168.0.3' },
      { individuelle: '1.8.1', nom: 'Interface IP KNX', ip: '10.129.130.80' },
      { individuelle: '1.1.15', nom: 'KNX IP Interface', ip: '10.129.6.13' },
      { individuelle: '15.15.0', nom: 'KNX IP Routeur', ip: '169.254.178.8' },
    ],
    bonneInterface: 1,
    participants: [
      { id: 'ACT', rep: 'Actionneur 8 voies', adresse: '1.1.2' },
      { id: 'BP', rep: 'BP · local électrique', adresse: '1.1.5' },
      { id: 'D1', rep: 'D1', adresse: '1.1.9' },
      { id: 'D2', rep: 'D2', adresse: '1.1.8' },
      { id: 'D3', rep: 'D3', adresse: '1.1.7' },
      { id: 'D4', rep: 'D4', adresse: '1.1.6' },
      { id: 'D5', rep: 'D5', adresse: '1.1.4' },
      { id: 'D6', rep: 'D6', adresse: '1.1.3' },
    ],
  },
  essaisKnxLocal: true,
  tests: [
    ...BASE_TESTS,
    {
      id: 'polarite',
      title: 'Contrôle de polarité du bus KNX',
      how: 'Multimètre en V⎓ aux bornes de bus d’un détecteur, pointe rouge sur (+). Une lecture négative signale deux conducteurs croisés dans la guirlande.',
      expected: '+29 V DC, jamais −29 V',
    },
    {
      id: 'boucle',
      title: 'Absence de boucle sur le bus',
      how: 'Suis la paire torsadée de l’alimentation au dernier participant : chaque appareil doit être traversé une seule fois.',
      expected: 'guirlande ou étoile, jamais d’anneau',
    },
    {
      id: 'diff',
      title: 'Test du différentiel Q11',
      how: 'Installation sous tension, appuie sur le bouton T (test) de Q11.',
      expected: 'Q11 déclenche',
    },
  ],
  mesures: [
    { id: 'rpe', title: 'Continuité du PE jusqu’au luminaire L1', stage: 'horsTension', instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'L1.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'riso', title: 'Isolement du départ L1 (phase / PE)', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_4.a', b: 'x1_6.a', min: 0.5, max: 9999, unit: 'MΩ' },
    { id: 'risoL9', title: 'Isolement du départ L9, direct sur Q14 (phase / PE)', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_28.a', b: 'x1_30.a', min: 0.5, max: 9999, unit: 'MΩ' },
    { id: 'ubus', title: 'Tension du bus KNX en sortie d’alimentation', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'a1.+', b: 'a1.−', min: 28, max: 30, unit: 'V', when: 'ctl' },
    { id: 'ubusD4', title: 'Tension et polarité du bus sur D4', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'D4.X1', b: 'D4.X2', min: 28, max: 30, unit: 'V', when: 'ctl' },
    { id: 'u230c8', title: 'Tension en sortie du canal 8 (local électrique)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'k2.8', b: 'q14.N2', min: 220, max: 240, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'busD4', title: 'Fil (+) du bus débranché sur D4',
      symptom: 'D4 ne détecte plus rien : la zone Z7-8 (L4) ne s’allume jamais, même dans le noir. Les autres détecteurs, le poussoir et l’actionneur répondent normalement.',
      fix: 'Reprendre le conducteur (+) du bus entre l’actionneur K2 et D4, puis contrôler sa continuité.',
      coupe: 'k2.+>D4.X1', action: 'Reprendre le conducteur (+) du bus entre K2 et D4',
    },
    {
      id: 'sortie5', title: 'Sortie du canal 5 non raccordée au bornier',
      symptom: 'La Circulation 2 (D5) déclenche normalement — le relais du canal 5 claque à chaque détection — mais L5 ne s’allume jamais.',
      fix: 'Refaire la liaison K2:5 → X1:16 et contrôler le serrage des deux bornes.',
      coupe: 'k2.5>x1_16.a', action: 'Refaire la liaison K2:5 → X1:16',
    },
    {
      id: 'terreL3', title: 'Conducteur de protection du luminaire L3 non raccordé',
      symptom: 'Tout fonctionne normalement : L3 s’allume comme les autres au passage devant D3. Seule la mesure de continuité du PE de L3 révèle le défaut.',
      fix: 'Reprendre le vert-jaune entre X1:12 et la borne de terre de L3, puis refaire la mesure de continuité.',
      coupe: 'x1_3.a>x1_12.a', action: 'Reprendre le conducteur de protection de L3',
    },
    {
      id: 'q12', title: 'Phase coupée entre Q12 et l’alimentation de bus A1',
      symptom: 'Aucun détecteur, aucun appui sur BP ne commande plus rien, le bus est à 0 V — pourtant Q12 est fermé et, en basculant à la main les leviers de l’actionneur (commande manuelle), L1 à L8 s’allument normalement.',
      fix: 'Contrôler la continuité entre Q12 et l’alimentation de bus A1, reprendre le conducteur de phase.',
      coupe: 'f2.2>a1.L', action: 'Reprendre le conducteur de phase entre Q12 et A1',
    },
    {
      id: 'neutreL9', title: 'Neutre du projecteur L9 coupé',
      symptom: 'L9, câblé en direct sur Q14, ne s’allume jamais — de jour comme de nuit — alors que le bus et les huit canaux de l’actionneur fonctionnent normalement.',
      fix: 'Reprendre le conducteur bleu entre Q14 et le projecteur L9.',
      coupe: 'q14.N2>x1_29.a', action: 'Reprendre le neutre entre Q14 et L9',
    },
  ],
  quiz: [
    { q: 'Quelle est la tension du bus KNX ?', options: ['50 V continu', '29 V continu', '230 V alternatif', '24 V alternatif'], answer: 1 },
    { q: 'Quelle tension alimente les sorties de l’actionneur ?', options: ['29 V continu', '24 V alternatif', '230 V alternatif', '12 V continu'], answer: 2 },
    { q: 'Combien de participants peut-on raccorder sur une ligne KNX ?', options: ['12', '28', '64', '255'], answer: 2 },
    { q: 'Quel module est indispensable pour adresser les participants depuis ETS5 ?', options: ['L’alimentation de bus', 'L’interface de communication', 'L’actionneur de commutation', 'Le poussoir'], answer: 1 },
    {
      q: 'Quelle est la différence entre une adresse individuelle et une adresse de groupe ?',
      options: [
        'L’adresse individuelle identifie un appareil, l’adresse de groupe relie une fonction entre plusieurs appareils',
        'Ce sont deux noms pour la même chose',
        'L’adresse de groupe identifie un appareil, l’individuelle une fonction',
        'L’adresse de groupe ne sert qu’au téléchargement',
      ],
      answer: 0,
    },
    { q: 'Comment le bus doit-il être câblé ?', options: ['En boucle fermée', 'En guirlande ou en étoile, jamais en boucle', 'Uniquement en étoile', 'Peu importe, le protocole corrige'], answer: 1 },
    {
      q: 'Un appareil KNX peut-il être reconfiguré après son installation ?',
      options: ['Non, la configuration est définitive', 'Oui, mais seulement certains produits', 'Oui, tous les produits se reconfigurent depuis ETS5 sans toucher au câblage', 'Seulement en remplaçant l’alimentation'],
      answer: 2,
    },
    {
      q: 'Pourquoi L9 n’est-il pas piloté par le bus KNX ?',
      options: ['C’est un projecteur à détecteur intégré, câblé en direct sur Q14', 'Le bus n’a plus d’adresse disponible', 'L9 est trop puissant pour l’actionneur', 'Le bureau d’études l’a oublié'],
      answer: 0,
    },
    {
      q: 'Pourquoi une interface IP/KNX plutôt qu’une interface USB pour ce chantier ?',
      options: ['Pour permettre un accès au bus depuis le réseau, utile pour un futur TP réseau', 'Parce que l’USB ne marche pas avec ETS5', 'Parce qu’elle est moins chère', 'Parce qu’elle alimente le bus en 230 V'],
      answer: 0,
    },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2']],
  },
};
