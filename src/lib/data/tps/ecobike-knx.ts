/**
 * TP 3 · Éclairage KNX de l'Écobike (lycée L. Couffignal) — v2, démarche en deux temps.
 *
 * Tiré du sujet CGM MELEC 2023, partie C (corrigé C.1 à C.4). Local à vélos : 8 zones de
 * recharge, 2 circulations, 9 luminaires. L1 à L8 sont commandés par KNX (6 détecteurs de
 * présence et de luminosité, 1 poussoir 2 touches, actionneur 8 voies) ; L9, projecteur
 * extérieur à détecteur intégré, reste en technologie « Traditionnelle », en direct sur Q14.
 * Même démarche que le TP 1 (`ecobike-pv.ts`), validée sur maquette :
 *
 *  - Temps A · COMPRENDRE (préparation) : six blocs appuyés sur les DOCUMENTS RÉELS du
 *    dossier, affichés dans le TP (`preparation.documents`) — plan d'implantation DTR 1,
 *    fonctionnement DTR 15, symboles et tableau de répartition DTR 17-18, affectation des
 *    sorties et adresses DTR 19-20, fiches DT 47 à 51, schéma C.3.2 à compléter, exemple
 *    de raccordement constructeur (DT 50), schéma fonctionnel C.4.2 à compléter.
 *  - Temps B · RÉALISER comme sur chantier : le matériel du corrigé (calibres du DTR 18),
 *    le câblage du schéma C.3.2, la consignation, les mesures, la mise en service ETS
 *    (wizard `MiseEnServiceKnx.tsx`, DTR 21, table réelle des interfaces C.4.7 avec IP et
 *    MAC) et l'essai de traversée du local (`EssaiKnxLocal.tsx`, DEL d'état du BP).
 *
 * Le schéma C.3.2 corrigé est le schéma de dépannage (`schemaImage`), comme le folio 01
 * du TP 1 ; le schéma à compléter est un document de préparation. Le corrigé du schéma
 * fonctionnel C.4.2 reste servi pour le professeur (`/tp/ecobike-knx/symboles_corrige.jpg`),
 * l'élève en voit la version à compléter (adresses et symboles des capteurs effacés).
 *
 * ------------------------------------------------------------ câblage (schéma C.3.2)
 *  - Q11 (interrupteur différentiel 25 A 30 mA) alimente Q12, Q13 et Q14 ;
 *  - Q12 (2 A) → L N de l'alimentation de bus, PE depuis X1:3 ;
 *  - l'actionneur porte HUIT PAIRES de bornes L / n (clé `knxact8`) : Q13 alimente la L de
 *    la voie 1, pontée de voie en voie jusqu'à la voie 4 ; Q14 fait de même pour les voies
 *    5 à 8. Les sorties n (violet, réseau `LC`) partent au bornier X1 ;
 *  - L9 est câblé EN DIRECT sur Q14 (L N PE), sans passer par l'actionneur ;
 *  - neutres de Q13 / Q14 et PE vers le bornier ; les câbles 3G1,5 du local sont posés par
 *    l'installateur du bornier aux luminaires (liaisons `PRE`) ;
 *  - bus en GUIRLANDE : alimentation → interface → actionneur → BP → D1 → D2 → … → D6.
 *    Les participants d'annexe n'ont que deux bornes (X1 +, X2 −) : la guirlande se fait
 *    par liaisons successives Dn.X1 → Dn+1.X1 et Dn.X2 → Dn+1.X2, comme les connecteurs de
 *    bus du sujet. Seul le tronçon actionneur → BP franchit la paroi (gaine G2) ; le reste
 *    est câblé par l'élève dans le local.
 *
 * ------------------------------------------------------------ topologie / moteur
 * Le moteur ne connaît que trois organes (`q1`, `f2`, `f3`). Correspondance retenue :
 *   · `q1` = Q11, différentiel de tête, organe de consignation ;
 *   · `f2` = Q12, protection de l'alimentation de bus (aval `f2` = q1 ET Q12) ;
 *   · `f3` = Q14, départ L5 à L9 : c'est l'organe dont le moteur sait simuler le
 *     DÉCLENCHEMENT (panne `f3`, « Q14 déclenché », comme D2 au TP 1). Son aval se déclare
 *     `live: 'q1f3'` (q1 fermé ET f3 fermé non déclenché) : il ne dépend PAS de Q12, et L9
 *     reste allumé bus coupé ;
 *   · Q13 est un organe SUPPLÉMENTAIRE (`sectionneurs: ['q13']`) : son état dans `sim.aux`,
 *     manœuvrable au clic, refermé à la remise sous tension ; son aval se déclare
 *     `live: 'q1&aux:q13'` (sous le différentiel de tête).
 * Les sorties de l'actionneur exigent en plus le bus (`f2&…`) : sans bus, les détecteurs ne
 * commandent plus rien — seule la commande manuelle de l'actionneur le ferait.
 */
import type {
  KnxZone, Liaison, PrepQuestion, Slot, TerminalNet, TpDefinition,
} from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Documents du dossier, servis depuis `public/tp/ecobike-knx/`. */
const DOC = (f: string) => `/tp/ecobike-knx/${f}`;

/** Marque une liaison comme posée par l'installateur (câbles du local, déjà tirés jusqu'au bornier). */
const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

/* ------------------------------------------------------------ bornier X1 */

/**
 * Bornier X1 des départs : arrivée (L · N · PE) puis NEUF départs d'éclairage,
 * chacun avec sa phase (commandée pour L1 à L8), son neutre et SA TERRE — 3 + 9 × 3 = 30
 * bornes, réparties sur deux rails. L'identifiant reste continu de x1_1 à x1_30.
 */
const X1_ROWS: [string, string, string][] = [
  ['termred', 'L', 'Arrivée phase'], ['termblue', 'N', 'Arrivée neutre'], ['earth', 'PE', 'Arrivée terre'],
  ...Array.from({ length: 9 }, (_, i) => i + 1).flatMap((n): [string, string, string][] => [
    ['termred', `L${n}`, n === 9 ? 'L9 · phase (direct Q14)' : `L${n} · phase commandée`],
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
/** Borne X1 de la phase, du neutre et de la terre du luminaire Li. */
const xL = (i: number) => `x1_${3 + (i - 1) * 3 + 1}`;
const xN = (i: number) => `x1_${3 + (i - 1) * 3 + 2}`;
const xPE = (i: number) => `x1_${3 + (i - 1) * 3 + 3}`;

/* ------------------------------------------------------------ liaisons */

/** Guirlande du bus dans le local : BP → D1 → D2 → … → D6, chaque participant traversé une fois. */
const GUIRLANDE = ['BP', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'];

const LIAISONS: Liaison[] = [
  // ---- arrivée 230 V depuis le pupitre d'alimentation de l'atelier ----
  L('RES.L1', 'x1_1.b', 'L1'), L('RES.N', 'x1_2.b', 'N'), L('RES.PE', 'x1_3.b', 'PE'),
  // ---- X1 → Q11 ----
  L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.N', 'N'),
  // ---- Q11 → Q12 / Q13 / Q14 ----
  L('q1.2', 'f2.1', 'L1'), L('q1.N2', 'f2.N', 'N'),
  L('q1.2', 'q13.1', 'L1'), L('q1.N2', 'q13.N', 'N'),
  L('q1.2', 'f3.1', 'L1'), L('q1.N2', 'f3.N', 'N'),
  // ---- Q12 → alimentation de bus : L N PE ----
  L('f2.2', 'a1.L', 'L1'), L('f2.N2', 'a1.N', 'N'), L('x1_3.a', 'a1.PE', 'PE'),
  // ---- bus en guirlande dans le tableau : alimentation → interface → actionneur ----
  L('a1.+', 'k1.+', 'DC+'), L('a1.−', 'k1.−', 'DC-'),
  L('k1.+', 'k2.+', 'DC+'), L('k1.−', 'k2.−', 'DC-'),
  // ---- actionneur → BP : le seul tronçon du bus qui sort du tableau (gaine G2) ----
  { ...L('k2.+', 'BP.X1', 'DC+'), gaine: 'G2' }, { ...L('k2.−', 'BP.X2', 'DC-'), gaine: 'G2' },
  // ---- guirlande dans le local : BP → D1 → … → D6 ----
  ...GUIRLANDE.slice(0, -1).flatMap((d, i) => [
    L(`${d}.X1`, `${GUIRLANDE[i + 1]}.X1`, 'DC+'), L(`${d}.X2`, `${GUIRLANDE[i + 1]}.X2`, 'DC-'),
  ]),
  // ---- Q13 → L de la voie 1, pontée jusqu'à la voie 4 ----
  L('q13.2', 'k2.L1', 'L1'), L('k2.L1', 'k2.L2', 'L1'), L('k2.L2', 'k2.L3', 'L1'), L('k2.L3', 'k2.L4', 'L1'),
  // ---- Q14 → L de la voie 5, pontée jusqu'à la voie 8 ; et L9 EN DIRECT ----
  L('f3.2', 'k2.L5', 'L1'), L('k2.L5', 'k2.L6', 'L1'), L('k2.L6', 'k2.L7', 'L1'), L('k2.L7', 'k2.L8', 'L1'),
  L('f3.2', `${xL(9)}.a`, 'L1'),
  // ---- neutres : Q13 → L1 à L4, Q14 → L5 à L9 ----
  ...[1, 2, 3, 4].map(i => L('q13.N2', `${xN(i)}.a`, 'N')),
  ...[5, 6, 7, 8, 9].map(i => L('f3.N2', `${xN(i)}.a`, 'N')),
  // ---- sorties commandées de l'actionneur (violet) : sortie i → phase de Li ----
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => L(`k2.${i}`, `${xL(i)}.a`, 'LC')),
  // ---- conducteur de protection : de l'arrivée à chaque départ luminaire ----
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => L('x1_3.a', `${xPE(i)}.a`, 'PE')),
  // ---- terrain (installateur) : câbles 3G1,5 vers les luminaires, posés jusqu'au bornier ----
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(i => [
    PRE(`${xL(i)}.b`, `L${i}.X1`, i === 9 ? 'L1' : 'LC'),
    PRE(`${xN(i)}.b`, `L${i}.X2`, 'N'),
    PRE(`${xPE(i)}.b`, `L${i}.PE`, 'PE'),
  ]),
];

/* ------------------------------------------------------------ réseaux */

/** Aval de Q13 (organe supplémentaire, sous Q11) et de Q14 (`f3`, sous Q11). */
const Q13: TerminalNet['live'] = 'q1&aux:q13';
const Q14: TerminalNet['live'] = 'q1f3';
/** Sorties de l'actionneur : leur protection ET le bus (sans bus, aucun ordre n'arrive). */
const S13: TerminalNet['live'] = 'f2&aux:q13';
const S14: TerminalNet['live'] = 'f2&q1f3';

function netsEcobikeKnx(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live']) => {
    for (const id of ids) n[id] = { net, live };
  };
  const ab = (b: string) => [`${b}.a`, `${b}.b`];

  // bornier X1 : arrivée toujours vive, PE toujours au potentiel de terre
  set(ab('x1_1'), 'L1', 'always'); set(ab('x1_2'), 'N', 'always'); set(ab('x1_3'), 'PE', 'always');
  for (let i = 1; i <= 9; i += 1) {
    const [ph, ne] = i <= 4 ? [S13, Q13] : i <= 8 ? [S14, Q14] : [Q14, Q14];
    set(ab(xL(i)), i === 9 ? 'L1' : 'LC', ph); set(ab(xN(i)), 'N', ne); set(ab(xPE(i)), 'PE', 'always');
    set([`L${i}.X1`], i === 9 ? 'L1' : 'LC', ph); set([`L${i}.X2`], 'N', ne); set([`L${i}.PE`], 'PE', 'always');
  }

  // Q11 : différentiel de tête (organe de consignation) — coupe la phase ET le neutre
  set(['q1.1'], 'L1', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2'], 'L1', 'q1'); set(['q1.N2'], 'N', 'q1');
  // Q12 : protection de l'alimentation de bus
  set(['f2.1'], 'L1', 'q1'); set(['f2.N'], 'N', 'q1');
  set(['f2.2'], 'L1', 'f2'); set(['f2.N2'], 'N', 'f2');
  // Q13 : éclairage L1 à L4 (organe supplémentaire)
  set(['q13.1'], 'L1', 'q1'); set(['q13.N'], 'N', 'q1');
  set(['q13.2'], 'L1', Q13); set(['q13.N2'], 'N', Q13);
  // Q14 (`f3`) : éclairage L5 à L9 — déclenchement simulé (panne `f3`)
  set(['f3.1'], 'L1', 'q1'); set(['f3.N'], 'N', 'q1');
  set(['f3.2'], 'L1', Q14); set(['f3.N2'], 'N', Q14);

  // A1 : alimentation de bus, 230 V en entrée (Q12), 29 V DC en sortie
  set(['a1.L'], 'L1', 'f2'); set(['a1.N'], 'N', 'f2'); set(['a1.PE'], 'PE', 'always');
  set(['a1.+'], 'DC+', 'f2'); set(['a1.−'], 'DC-', 'f2');
  // K1 : interface IP/KNX, alimentée par le bus ; K2 : actionneur, électronique sur le bus
  set(['k1.+', 'k2.+'], 'DC+', 'f2'); set(['k1.−', 'k2.−'], 'DC-', 'f2');
  // K2 : huit paires L / n — phase de la voie, sortie commandée
  for (let i = 1; i <= 8; i += 1) {
    set([`k2.L${i}`], 'L1', i <= 4 ? Q13 : Q14);
    set([`k2.${i}`], 'LC', i <= 4 ? S13 : S14);
  }
  // participants du local, en guirlande sur le bus
  for (const d of GUIRLANDE) { set([`${d}.X1`], 'DC+', 'f2'); set([`${d}.X2`], 'DC-', 'f2'); }
  return n;
}

/* ------------------------------------------------------------ zones */

/** Zones du local : détecteur → canal(aux) de l'actionneur → luminaire(s) (DTR 15, DTR 19). */
const KNX_ZONES: KnxZone[] = [
  { id: 'z12', label: 'Z1-2', detecteur: 'D1', canaux: [1], luminaires: ['L1'] },
  { id: 'z34', label: 'Z3-4', detecteur: 'D2', canaux: [2], luminaires: ['L2'] },
  { id: 'z56', label: 'Z5-6', detecteur: 'D3', canaux: [3], luminaires: ['L3'] },
  { id: 'z78', label: 'Z7-8', detecteur: 'D4', canaux: [4], luminaires: ['L4'] },
  // Circulation 2 et Circulation 1 partagent le canal 6 → le luminaire L6 est COMMUN
  // aux deux : un point lumineux unique, jamais dupliqué, allumé par D5 OU D6.
  { id: 'circ2', label: 'Circulation 2', detecteur: 'D5', canaux: [5, 6], luminaires: ['L5', 'L6'] },
  { id: 'circ1', label: 'Circulation 1', detecteur: 'D6', canaux: [6, 7], luminaires: ['L6', 'L7'] },
];

/* ------------------------------------------------------------ pannes */

/** Bornes qui ne reçoivent plus rien quand la panne les a isolées. */
const hors = (ids: string[]): Record<string, Partial<TerminalNet>> =>
  Object.fromEntries(ids.map(id => [id, { live: 'off' as const }]));

/* ------------------------------------------------------------ préparation */

/** Question de préparation : la bonne réponse est toujours la première (l'ordre est mélangé à l'affichage). */
const Q = (id: string, rep: string, doc: string, invite: string, options: string[], why: string): PrepQuestion =>
  ({ id, rep, doc, invite, options, answer: 0, why });

export const TP_ECOBIKE_KNX: TpDefinition = {
  id: 'ecobike-knx',
  title: 'Écobike · Éclairage KNX du local à vélos (TP 3)',
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
    'Chantier Écobike (sujet CGM MELEC 2023, partie C). Local à vélos : 8 zones de recharge, 2 circulations, '
    + '9 luminaires. L1 à L8 sont commandés par KNX — 6 détecteurs de présence et de luminosité MTN630860, '
    + 'poussoir 2 touches MTN617119, actionneur 8 voies MTN647893, alimentation MTN684032, interface IP/KNX '
    + 'MTN6502-0105 — et L9, projecteur à détecteur intégré, reste en traditionnel sur Q14. Temps A : '
    + 'comprendre sur les documents réels du dossier (plan, DTR 15 à 20, fiches DT 47 à 51). Temps B : câbler '
    + 'd’après le schéma C.3.2 (bus en guirlande), consigner, mesurer, mettre en service sous ETS et traverser '
    + 'le local pour l’essai.',
  situation:
    'Le lycée Louis Couffignal termine l’Écobike : reste à équiper le local à vélos de son éclairage. Pour '
    + 'économiser l’énergie, chaque zone ne s’allume que si quelqu’un y est ET qu’il n’y a pas assez de lumière '
    + 'naturelle ; le local électrique s’allume au poussoir ; le projecteur de l’entrée a son propre détecteur. '
    + 'Tu étudies d’abord l’installation sur les documents du dossier — plan d’implantation, fonctionnement, '
    + 'symboles et tableau de répartition, fiches constructeur. Puis tu réalises le tableau comme sur le '
    + 'chantier : choix du matériel, câblage d’après le schéma C.3.2, consignation, mesures, programmation des '
    + 'neuf participants dans ETS et essai en traversant le local.',
  plaqueTitre: 'ÉCLAIRAGE KNX · LOCAL À VÉLOS ÉCOBIKE',
  plaque: {
    'Tête': 'Q11 · interrupteur différentiel 25 A · 30 mA · type AC',
    'Protections': 'Q12 2 A C (bus) · Q13 16 A C (L1-L4) · Q14 16 A C (L5-L9)',
    'Bus KNX': '29 V DC · paire torsadée · guirlande',
    'Alimentation': '230 V AC → 320 mA · 90,5 mA consommés',
    'Participants': '9 sur la ligne 1.1',
    'Actionneur': '8 × 16 A · 230 V AC · 8 paires L / n',
    'Détecteurs': '6 × présence + luminosité · 8 mA chacun',
    'Poussoir': '2 touches · canal 8 · DEL d’état',
    'Logiciel': 'ETS5 · interface 1.1.1 · 192.168.0.3',
    'Câble luminaires': '3G1,5',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '230 V + N + PE depuis le tableau de l’Écobike (pupitre d’alimentation de l’atelier), arrivée sur X1' },
    { k: 'Tête', v: 'Q11 interrupteur différentiel 25 A, type AC, 30 mA : protection des personnes et organe de consignation' },
    { k: 'Bus KNX', v: 'paire torsadée 29 V DC issue de l’alimentation MTN684032, protégée par Q12 (2 A courbe C)' },
    { k: 'Éclairage', v: 'Q13 (16 A courbe C) alimente les voies 1 à 4 de l’actionneur, Q14 (16 A courbe C) les voies 5 à 8 et L9 en direct' },
    { k: 'Zones de recharge', v: 'Z1-2 → D1 → canal 1 → L1 · Z3-4 → D2 → canal 2 → L2 · Z5-6 → D3 → canal 3 → L3 · Z7-8 → D4 → canal 4 → L4' },
    { k: 'Circulations', v: 'Circulation 2 → D5 → canaux 5 et 6 → L5 et L6 · Circulation 1 → D6 → canaux 6 et 7 → L6 et L7 (L6 COMMUN)' },
    { k: 'Local électrique', v: 'canal 8 → L8, commandé UNIQUEMENT par BP : touche 1 = ON, touche 2 = OFF, DEL d’état sur l’objet d’acquittement' },
    { k: 'Paramétrage', v: 'canaux 1 à 7 en commutation AVEC MINUTERIE · canal 8 en COMMUTATION simple' },
    { k: 'L9', v: 'projecteur extérieur à détecteur intégré, technologie traditionnelle, câblé EN DIRECT sur Q14 : pas d’adresse KNX' },
    { k: 'Adressage', v: 'ligne 1.1 : interface 1.1.1 · actionneur 1.1.2 · D6 1.1.3 · D5 1.1.4 · BP 1.1.5 · D4 1.1.6 · D3 1.1.7 · D2 1.1.8 · D1 1.1.9' },
    { k: 'Câblage', v: 'schéma C.3.2 : bus en guirlande alimentation → actionneur → BP → D1 … D6, jamais en boucle · couleurs imposées : phase marron, neutre bleu, PE vert-jaune, sorties commandées violet, bus + rouge / − noir' },
    { k: 'Câble', v: '3G1,5 pour les neuf luminaires ; le bus reste dans sa propre gaine, séparé du 230 V' },
    { k: 'Avant mise en service', v: 'consignation sur Q11 · VAT en aval de Q11, Q13 et Q14 · continuité PE · polarité du bus · absence de boucle' },
  ],
  libelles: { recv: 'Luminaires L1 à L9 · 3G1,5 · L9 direct Q14' },
  schemaImage: {
    src: DOC('schema_corrige.jpg'),
    legende: 'Schéma de câblage C.3.2 des circuits d’éclairage de l’Écobike (corrigé)',
  },
  preparation: {
    documents: [
      { id: 'plan', titre: 'DTR 1 · plan', src: DOC('plan.jpg'), legende: 'DTR 1 : plan d’implantation du local à vélos — zones de recharge, circulations, local électrique, 230 V (rouge) et bus KNX (vert)', enonce: true },
      { id: 'dtr15', titre: 'DTR 15', src: DOC('dtr15.jpg'), legende: 'DTR 15 : fonctionnement du système d’éclairage — luminaire, zone, type de commande, repère capteur, technologie', enonce: true },
      { id: 'dtr1718', titre: 'DTR 17-18', src: DOC('dtr17_18.jpg'), legende: 'DTR 17 : symboles KNX · DTR 18 : tableau de répartition et nomenclature (calibres de Q11 à Q14)' },
      { id: 'dtr1920', titre: 'DTR 19-20', src: DOC('dtr19_20.jpg'), legende: 'DTR 19 : affectation des sorties de l’actionneur · DTR 20 : identification des participants (position sur la ligne 1)' },
      { id: 'c42', titre: 'C.4.2 · symboles', src: DOC('symboles_sujet.jpg'), legende: 'C.4.2 : schéma fonctionnel KNX de l’Écobike à compléter — symboles des capteurs et adresses individuelles (l’interface IP/KNX est 1.1.1)' },
      { id: 'dt47', titre: 'DT 47 · alim.', src: DOC('dt_alim.jpg'), legende: 'DTR 47 : alimentations KNX — MTN683832 160 mA, MTN684032 320 mA (64 participants, bobine intégrée)' },
      { id: 'dt48', titre: 'DT 48 · BP', src: DOC('dt_bp.jpg'), legende: 'DTR 48 : boutons-poussoirs multifonctions — 2 touches brillant blanc MTN617119, 1 LED par touche, consommation 10 mA' },
      { id: 'dt49', titre: 'DT 49 · détecteurs', src: DOC('dt_det.jpg'), legende: 'DTR 49 : détecteurs de présence — MTN630860 (finition Alu), boîte saillie MTN550619, détection de mouvement et mesure de luminosité, 8 mA' },
      { id: 'dt50', titre: 'DT 50 · actionneurs', src: DOC('dt_act.jpg'), legende: 'DTR 50 : actionneurs de commutation 16 A — 2, 4, 8 ou 12 sorties (MTN647893 : 8 sorties), commande manuelle, 12,5 mA' },
      { id: 'dt51', titre: 'DT 51 · interfaces', src: DOC('dt_ip.jpg'), legende: 'DTR 51 : interfaces KNX — USB MTN681829, IP/KNX MTN6502-0105 (programmation et accès au bus via Internet), 20 mA' },
      {
        id: 'c22', titre: 'C.2.2 · sorties', legende: 'C.2.2 : points lumineux du local à vélos et sorties TOR KNX nécessaires — à compléter',
        tableau: {
          entetes: ['Zone', 'Points lumineux', 'Sorties TOR KNX'],
          lignes: [
            ['Zones de recharge n°1 et 2', '1', '1'],
            ['Zones de recharge n°3 et 4', '1', '?'],
            ['Zones de recharge n°5 et 6', '1', '?'],
            ['Zones de recharge n°7 et 8', '1', '?'],
            ['Local électrique', '1', '?'],
            ['Zones de circulation n°1 et 2', '?', '?'],
            ['Total', '', '?'],
          ],
        },
      },
      {
        id: 'c29', titre: 'C.2.8-9 · commande', legende: 'C.2.8 : consommation du bus · C.2.9 : bon de commande du matériel KNX — à compléter',
        tableau: {
          entetes: ['Désignation', 'Qté', 'Référence', 'Conso. bus', 'P.U. (€)', 'Total (€)'],
          lignes: [
            ['Alimentation de bus', '1', 'MTN684032', '—', '372,42', '372,42'],
            ['Actionneur de commutation', '1', 'MTN647893', '12,5 mA', '749,87', '749,87'],
            ['Bouton-poussoir multifonction', '1', 'MTN617119', '10 mA', '241,57', '241,57'],
            ['Détecteur de présence', '6', 'MTN630860', '6 × 8 mA', '374,33', '?'],
            ['Boîtier saillie pour détecteur', '6', 'MTN550619', '—', '34,52', '?'],
            ['Interface de communication', '1', 'MTN6502-0105', '20 mA', '471,01', '471,01'],
            ['Total · consommation ? mA', '', '', '', 'HT / TTC', '? / ?'],
          ],
        },
      },
      { id: 'c32', titre: 'Schéma C.3.2', src: DOC('schema_sujet.jpg'), legende: 'C.3.2 : schéma de câblage à compléter — Q12 à Q14, alimentation KNX, actionneur, BP, D1 à D6, L1 à L9 · phase marron, neutre bleu, PE vert-jaune, sorties commandées violet, bus + rouge / − noir' },
      { id: 'racc', titre: 'DT 50 · raccordement', src: DOC('dt_act_racc.jpg'), legende: 'Exemple de raccordement constructeur d’un actionneur 4 sorties (sans protection) : la phase entre sur la borne L de chaque voie, pontée de voie en voie, la sortie repart vers la lampe' },
      { id: 'ets', titre: 'C.4.7 · ETS', src: DOC('ets_interfaces.jpg'), legende: 'C.4.7 : interfaces trouvées par ETS sur le réseau — adresse individuelle, IP:port, adresse MAC' },
    ],
    intitules: {
      identification: {
        titre: '① Implantation · le plan (DTR 1)',
        consigne: 'Le plan d’implantation est affiché à gauche. Repère chaque participant, chaque luminaire et le local électrique.',
      },
      fonctions: {
        titre: '② Fonctionnement · DTR 15',
        consigne: 'Le DTR 15 dit quel capteur commande quel luminaire, et avec quelle technologie. Lis ses colonnes.',
      },
    },
    identification: [
      Q('im-d1', 'D1', 'plan', 'Sur le plan, où est placé le détecteur D1, et quel luminaire l’accompagne ?', [
        'Entre les zones de recharge n°1 et 2, à côté de L1',
        'Dans la zone de circulation n°1, à côté de L7',
        'Dans le local électrique, à côté de L8',
        'À l’entrée du local, au-dessus du portail',
      ], 'D1 surveille les zones de recharge 1 et 2, qu’éclaire L1. Chaque paire de zones de recharge a son détecteur et son luminaire : D2 / L2, D3 / L3, D4 / L4.'),
      Q('im-det', 'D1 à D6', 'plan', 'Combien de détecteurs de présence compte le local à vélos, et où ?', [
        'Six : quatre pour les zones de recharge (D1 à D4), deux pour les circulations (D5, D6)',
        'Huit, un par zone de recharge',
        'Neuf, un par luminaire',
        'Deux, un par zone de circulation',
      ], 'Quatre paires de zones de recharge et deux circulations : six détecteurs. C’est le « 6 × 8 mA » du calcul de consommation.'),
      Q('im-bp', 'BP', 'plan', 'Où se trouve le poussoir BP, et que commande-t-il ?', [
        'Dans le local électrique : il commande L8',
        'À l’entrée du local : il commande L9',
        'Dans la circulation n°2 : il commande L5 et L6',
        'Au tableau, sur le rail : il commande tous les luminaires',
      ], 'Le local électrique n’a pas de détecteur : on y entre pour intervenir, l’éclairage doit rester allumé tant qu’on y travaille. D’où un poussoir, et L8.'),
      Q('im-l6', 'L6', 'plan', 'Le luminaire L6 est placé…', [
        'Entre les deux zones de circulation : il est commun aux circulations n°1 et 2',
        'Dans la zone de recharge n°8',
        'Dans le local électrique, à côté de L8',
        'À l’extérieur, au-dessus du portail',
      ], 'Un seul point lumineux entre les deux circulations : il doit s’allumer quand on passe dans l’une OU l’autre. C’est ce qui lui donne deux capteurs au DTR 15.'),
      Q('im-l9', 'L9', 'plan', 'Où est installé L9 ?', [
        'À l’extérieur, à l’entrée du local à vélos, devant le portail coulissant',
        'Dans le local électrique',
        'Au centre du local, entre les circulations',
        'Dans la zone de recharge n°4',
      ], 'L9 éclaire l’entrée, dehors : c’est le projecteur à détecteur intégré du DTR 15, le seul luminaire qui ne passe pas par le bus.'),
      Q('im-local', 'Local élec.', 'plan', 'Que contient le local électrique, repéré en bleu sur le plan ?', [
        'Le tableau d’éclairage : départ 230 V vers les luminaires et départ du bus KNX',
        'Le parc de batteries du TP 1 uniquement',
        'Le compteur du fournisseur d’énergie',
        'Rien de l’éclairage : il ne contient que le portail',
      ], 'Le cartouche « 230V · Bus KNX » : tout part de là. C’est le tableau que tu câbles au temps B, avec Q11 à Q14, l’alimentation, l’interface et l’actionneur.'),
      Q('im-reseaux', 'Rouge / vert', 'plan', 'Sur le plan, que représentent les tracés rouges et verts ?', [
        'Rouge : le 230 V vers les luminaires · vert : le bus KNX vers les détecteurs et le poussoir',
        'Rouge : le bus KNX · vert : la terre',
        'Rouge : la phase · vert : le neutre',
        'Deux circuits d’éclairage de secours',
      ], 'Deux réseaux dans le local, qui ne se croisent qu’au tableau : la puissance (230 V, câbles 3G1,5) et la communication (bus 29 V DC). Ils ne partagent ni gaine ni borne.'),
    ],
    fonctions: [
      Q('fo-type', 'L1 à L7', 'dtr15', 'Quel est le type de commande des luminaires L1 à L7 ?', [
        'Par détection : chacun est commandé par un détecteur de présence',
        'Par bouton-poussoir deux touches',
        'Par horloge',
        'Par détection intégrée au luminaire',
      ], 'Colonne « Type de commande » : « Détection », capteurs D1 à D6. Le poussoir ne concerne que L8, la détection intégrée que L9.'),
      Q('fo-l6', 'L6', 'dtr15', 'Quel capteur commande L6 ?', [
        'D5 et D6', 'D5', 'D6', 'BP',
      ], 'Ligne « Luminaire 6 » : deux repères capteur, D5 - D6. L6 est dans les deux circulations : D5 et D6 publient tous les deux sur le canal 6.'),
      Q('fo-l8', 'L8', 'dtr15', 'Comment est commandé L8, l’éclairage du local électrique ?', [
        'Par le bouton-poussoir deux touches BP, sans détecteur',
        'Par le détecteur D6, le plus proche',
        'Par le détecteur intégré du projecteur',
        'Il reste allumé en permanence',
      ], '« Par bouton poussoir deux touches », repère BP : une touche allume, l’autre éteint. Pas de minuterie — on ne veut pas se retrouver dans le noir en pleine intervention.'),
      Q('fo-l9', 'L9', 'dtr15', 'Pourquoi L9 n’est-il pas dans l’installation KNX ?', [
        'Son détecteur est intégré : commande traditionnelle, alimenté en direct par Q14',
        'Il est trop loin du bus',
        'Il consomme trop pour l’actionneur',
        'C’est un oubli du bureau d’études',
      ], 'C’est la seule ligne « Traditionnelle » du DTR 15 : le projecteur détecte et s’allume tout seul. Il n’a ni adresse individuelle, ni sortie d’actionneur — il reste alimenté même bus coupé.'),
      Q('fo-lum', 'Détection', 'dtr15', 'À quelles conditions l’éclairage d’une zone s’allume-t-il ?', [
        'Présence détectée ET luminosité insuffisante dans la zone',
        'Présence détectée, quelle que soit la lumière du jour',
        'Luminosité insuffisante, même sans personne',
        'À heure fixe, le soir',
      ], 'La mise en situation le dit : par zone, en cas de présence ET en fonction de la luminosité. C’est ce qui justifie des détecteurs qui mesurent AUSSI la luminosité.'),
    ],
    blocs: [
      {
        id: 'techno',
        titre: '③ Technologie KNX · symboles (DTR 16, DTR 17)',
        consigne: 'Ce que le bus apporte, ce qui le transporte, et comment on le dessine. Le DTR 17 est affiché quand la question porte sur un symbole.',
        questions: [
          Q('fn-avantages', 'C.1.1', 'dtr1718', 'Parmi ces propositions, laquelle est un avantage de la solution KNX (C.1.1) ?', [
            'Flexibilité : on modifie le fonctionnement par logiciel, sans travaux ni recâblage',
            'Il faut plus de câble qu’une installation classique',
            'Chaque fabricant a son propre protocole, incompatible avec les autres',
            'Le bus ne fonctionne qu’avec des capteurs Schneider',
          ], 'Flexibilité, économies d’énergie et financières, confort, sécurité (corrigé C.1.1). KNX est multi-constructeur : c’est une norme ouverte.'),
          Q('fn-media', 'C.1.2', 'dtr1718', 'Quel média de communication utilise le bus de l’Écobike (C.1.2) ?', [
            'TP, la paire torsadée : câble bus, conducteurs rouge (+) et noir (−)',
            'PL, le courant porteur sur le réseau 230 V',
            'RF, la radio 868 MHz',
            'IP, l’Ethernet, pour tous les participants',
          ], 'TP = Twisted Pair, PL = Power Line, RF = Radio Fréquence, IP = Ethernet. Ici la paire torsadée ; IP n’est que le média de l’INTERFACE, côté réseau du lycée.'),
          Q('fn-ubus', 'C.1.3', 'dtr1718', 'Quelle tension mesure-t-on sur le bus, aux bornes des détecteurs et du poussoir (C.1.3) ?', [
            '29 V, continue (DC), polarisée',
            '24 V alternative, non polarisée',
            '230 V alternative',
            '12 V continue, non polarisée',
          ], '29 V DC polarisé : la borne + (rouge) et la borne − (noire) ne sont pas interchangeables. Une pointe rouge sur le − lit −29 V.'),
          Q('fn-sym', 'DTR 17', 'dtr1718', 'Quel symbole du DTR 17 représente un détecteur D1 à D6 ?', [
            'Le détecteur de mouvement : front montant et mention PIR',
            'L’actionneur de commutation : un contact',
            'Le bouton-poussoir : front montant et un rond',
            'L’interface IP/KNX : deux flèches et « IP »',
          ], 'PIR, pour Passive InfraRed : le capteur voit le rayonnement infrarouge d’une personne. C’est ce symbole qui se place six fois dans le schéma fonctionnel C.4.2.'),
          Q('fn-sym-bp', 'DTR 17', 'dtr1718', 'Et le symbole du poussoir BP ?', [
            'Front montant et un rond (le bouton)',
            'Front montant et PIR',
            'Un contact ouvert, comme l’actionneur',
            'Un transformateur avec une bobine',
          ], 'Capteur lui aussi — d’où le front montant — mais actionné à la main : le rond figure le bouton. L’alimentation, elle, porte la bobine de self.'),
          Q('fn-alim', 'Alim.', 'dtr1718', 'Quelle est la fonction de l’alimentation KNX (C.1.4) ?', [
            'Alimenter le bus (l’électronique des participants) et assurer le fonctionnement de l’installation',
            'Alimenter directement les luminaires en 230 V',
            'Programmer les participants depuis ETS',
            'Mesurer la consommation du bus',
          ], 'Elle fournit le 29 V DC, avec une self qui laisse passer les télégrammes. Les luminaires, eux, sont alimentés en 230 V par Q13 et Q14 à travers l’actionneur.'),
          Q('fn-bus', 'Bus', 'dtr1718', 'Quelle est la fonction du bus (C.1.4) ?', [
            'Transmettre l’alimentation 29 V et transporter les informations (télégrammes) entre participants',
            'Transporter le 230 V vers les luminaires',
            'Relier le tableau au réseau Ethernet',
            'Protéger les participants contre les surtensions',
          ], 'Une seule paire pour l’énergie de l’électronique ET les télégrammes : c’est l’économie de câblage du KNX.'),
          Q('fn-boucle', 'Guirlande', 'c32', 'Au schéma C.3.2, comment relie-t-on le bus de l’alimentation aux participants ?', [
            'En guirlande : alimentation → actionneur → BP → D1 → D2 → … → D6, sans jamais refermer de boucle',
            'En boucle : D6 revient sur l’alimentation, pour doubler la liaison',
            'Chaque détecteur sur sa propre alimentation',
            'Par le 230 V des luminaires, en courant porteur',
          ], 'Guirlande, étoile ou arbre — jamais l’anneau : une boucle crée des chemins multiples et perturbe la transmission. Chaque participant est traversé une seule fois.'),
        ],
      },
      {
        id: 'choix',
        titre: '④ Fonctions et choix · fiches DT 47 à 51, DTR 18',
        consigne: 'Chaque référence se lit sur sa fiche, chaque calibre sur le tableau de répartition. La fiche concernée s’affiche à gauche.',
        questions: [
          Q('ch-act', 'C.2.1', 'dt50', 'Quelle est la fonction d’un actionneur dans le bus KNX (C.2.1) ?', [
            'Recevoir une information du bus et la convertir en action (commutation, variation, montée / descente…)',
            'Détecter la présence dans une zone',
            'Alimenter le bus en 29 V',
            'Transférer le programme depuis ETS',
          ], 'L’actionneur est abonné à des adresses de groupe : quand un télégramme arrive, il ferme ou ouvre le contact de la voie concernée.'),
          Q('ch-capt', 'C.2.4', 'dt49', 'Quelle est la fonction d’un capteur (C.2.4) ?', [
            'Transmettre des informations sur le bus : présence, appui sur une touche, niveau d’éclairement…',
            'Allumer directement la lampe, sans passer par l’actionneur',
            'Couper le 230 V du luminaire',
            'Alimenter l’actionneur',
          ], 'Un capteur n’agit sur rien : il publie. C’est l’actionneur, abonné à la même adresse de groupe, qui convertit l’information en action.'),
          Q('ch-actref', 'C.2.3', 'dt50', 'Quel actionneur de commutation choisir dans le DT 50 (C.2.3) ?', [
            'MTN647893 : 8 sorties',
            'MTN647593 : 4 sorties',
            'MTN647393 : 2 sorties',
            'MTN648493 : 12 sorties',
          ], '8 points lumineux à commander indépendamment → 8 sorties. 12 sorties laisseraient 4 voies payées pour rien, 4 sorties obligeraient à marier des zones.'),
          Q('ch-bpref', 'C.2.5', 'dt48', 'Quel poussoir choisir pour le local électrique (blanc brillant, C.2.5) ?', [
            'MTN617119 : 2 touches, brillant blanc',
            'MTN617219 : 4 touches, brillant blanc',
            'MTN627514 : 2 touches, mat anthracite',
            'MTN617519 : 8 touches avec récepteur infrarouge',
          ], 'Une fonction, deux ordres (ON / OFF) : deux touches suffisent, et la finition demandée est blanc brillant — ligne « Brillant Blanc », colonne « 2 touches ».'),
          Q('ch-det', 'C.2.6', 'dt49', 'Quels détecteurs et quelles boîtes (finition Alu, montage en saillie) ?', [
            'MTN630860 + boîte saillie MTN550619 : détection de mouvement ET mesure de luminosité',
            'MTN630860 seul, encastré : détection de mouvement seulement',
            'Détecteur 230 V à relais intégré, comme L9',
            'MTN550619 seul : c’est lui qui détecte',
          ], 'Le détecteur ET sa boîte saillie (deux références, six de chaque au bon de commande). Il mesure la luminosité : c’est ce qui évite d’allumer en plein jour.'),
          Q('ch-ip', 'C.2.7', 'dt51', 'Pourquoi l’interface IP/KNX MTN6502-0105 plutôt que l’interface USB (C.1.4, C.2.7) ?', [
            'Elle programme les participants ET donne accès au bus via le réseau, voire Internet et un VPN',
            'Elle est moins chère',
            'Elle alimente le bus',
            'L’USB ne fonctionne pas avec ETS5',
          ], 'Les deux transfèrent le programme depuis ETS ; seule l’IP/KNX permet d’accéder au bus à distance. C’est elle, 1.1.1 sur 192.168.0.3, que le TP 4 raccorde au réseau local.'),
          Q('ch-q11', 'Q11', 'dtr1718', 'D’après le DTR 18, quelles sont les caractéristiques de Q11 ?', [
            'Interrupteur différentiel 30 mA, 25 A, type AC',
            'Disjoncteur 2 A courbe C',
            'Interrupteur différentiel 300 mA, 40 A',
            'Disjoncteur différentiel 16 A, 30 mA, type A',
          ], 'Q11 protège les personnes (30 mA) en tête du tableau ; 25 A de courant assigné couvre les trois départs. C’est aussi l’organe de consignation.'),
          Q('ch-q1314', 'Q13 / Q14', 'dtr1718', 'D’après le DTR 18, quel calibre pour Q13 et Q14 ?', [
            '16 A courbe C chacun',
            '10 A courbe C chacun',
            '2 A courbe C chacun',
            '32 A courbe D chacun',
          ], 'Le tableau de répartition dit 16 A courbe C : autant que le courant assigné d’une voie de l’actionneur (8 × 16 A). 2 A est le calibre de Q12, pour l’alimentation de bus.'),
        ],
      },
      {
        id: 'calculs',
        titre: '⑤ Calculs · C.2.2, C.2.8, C.2.9, C.3.1',
        consigne: 'Complète les tableaux affichés à gauche : sorties TOR, consommation du bus, bon de commande (TVA 20 %), câble.',
        questions: [
          Q('ca-sorties', 'C.2.2', 'c22', 'Combien de sorties TOR KNX faut-il au total ?', [
            '8 : quatre pour les zones de recharge, une pour le local électrique, trois pour les circulations (L5, L6, L7)',
            '9 : une par luminaire, L9 compris',
            '6 : une par détecteur',
            '7 : L6 compte pour rien, il est partagé',
          ], 'Circulations n°1 et 2 : trois points lumineux (L5, L6, L7), donc trois sorties — L6 est UN luminaire, sur UNE sortie, commandée par deux détecteurs. L9 n’est pas KNX : il ne compte pas.'),
          Q('ca-conso', 'C.2.8', 'c29', 'Consommation totale du bus : interface 20 mA, actionneur 12,5 mA, BP 10 mA, 6 détecteurs à 8 mA ?', [
            '90,5 mA', '50,5 mA', '42,5 mA', '132 mA',
          ], '20 + 12,5 + 10 + 6 × 8 = 90,5 mA. 50,5 mA oublie cinq détecteurs sur six ; 42,5 mA oublie l’interface — elle aussi est alimentée par le bus.'),
          Q('ca-alim', 'C.2.8', 'dt47', 'Quelle alimentation retenir, et pourquoi (DT 47) ?', [
            'MTN684032 : 90,5 mA < 320 mA, avec la marge d’une extension',
            'MTN683832 : 90,5 mA < 160 mA, c’est suffisant et moins cher',
            'Une alimentation à découpage 24 V DC 3 A',
            'Deux alimentations 160 mA en parallèle',
          ], 'Le corrigé justifie 90,5 mA < 320 mA. La 160 mA suffirait aujourd’hui, mais ne laisse presque rien au TP 4 et aux extensions ; une alimentation ordinaire n’a ni le 29 V ni la self du bus.'),
          Q('ca-bdc', 'C.2.9', 'c29', 'Total du bon de commande, puis TTC avec une TVA de 20 % ?', [
            '4 287,97 € HT → 5 145,56 € TTC',
            '2 250,72 € HT → 2 700,86 € TTC',
            '4 287,97 € TTC, la TVA est déjà comprise',
            '5 145,56 € HT → 6 174,67 € TTC',
          ], '372,42 + 749,87 + 241,57 + 6 × 374,33 + 6 × 34,52 + 471,01 = 4 287,97 € HT ; TVA 857,59 € ; 5 145,56 € TTC. 2 250,72 € compte un seul détecteur et une seule boîte.'),
          Q('ca-cable', 'C.3.1', 'c32', 'Quel câble pour l’alimentation des luminaires (C.3.1) ?', [
            '3G1,5 : circuits d’éclairage en 1,5 mm² (NF C 15-100), puissance et bus séparés',
            '3G2,5, comme les prises de courant',
            '3X1,5 : sans vert-jaune, l’éclairage n’en a pas besoin',
            'Un câble bus KNX, pour tout faire passer ensemble',
          ], '« G » : un conducteur vert-jaune dans le câble — les luminaires de classe I se raccordent à la terre. 1,5 mm² pour l’éclairage, et le bus reste dans son propre câble.'),
        ],
      },
      {
        id: 'adressage',
        titre: '⑥ Adressage et paramétrage · DTR 19, DTR 20, C.4',
        consigne: 'Le DTR 20 donne la position de chaque participant sur la ligne 1 ; le schéma fonctionnel C.4.2 est à compléter. L’interface IP/KNX est 1.1.1.',
        questions: [
          Q('ad-d1', 'D1', 'dtr1920', 'Quelle adresse individuelle pour le détecteur D1 (C.4.1) ?', [
            '1.1.9', '1.1.1', '1.1.3', '1.9.1',
          ], 'Zone 1, ligne 1, participant 9 (colonne « Position sur la ligne ») : 1.1.9. 1.1.1 est l’interface — deux participants ne partagent jamais une adresse.'),
          Q('ad-act', 'Actionneur', 'dtr1920', 'Et l’actionneur de commutation ?', [
            '1.1.2', '1.1.8', '1.1.1', '1.2.1',
          ], 'Position 2 sur la ligne 1 : 1.1.2. La notation est Zone . Ligne . Participant.'),
          Q('ad-bp', 'BP', 'dtr1920', 'Et le poussoir BP ?', [
            '1.1.5', '1.1.8', '1.1.9', '1.5.1',
          ], 'Position 5 : 1.1.5, entre D4 (1.1.6) et D5 (1.1.4).'),
          Q('ad-d6', 'D6', 'c42', 'Sur le schéma fonctionnel C.4.2, quelle adresse écrire sous D6 ?', [
            '1.1.3', '1.1.6', '1.1.9', '1.1.4',
          ], 'D6 est en position 3 : 1.1.3. Les détecteurs ne sont pas numérotés dans l’ordre des adresses — on lit le DTR 20, on ne devine pas.'),
          Q('ad-c42', 'C.4.2', 'c42', 'Dans le schéma fonctionnel C.4.2, quel symbole compléter dans les blocs D1 à D6 ?', [
            'Celui du détecteur de mouvement : front montant et PIR',
            'Celui de l’actionneur de commutation',
            'Celui de l’alimentation',
            'Aucun : un détecteur n’a pas de symbole KNX',
          ], 'Même symbole que DTR 17 : les six détecteurs sont des capteurs PIR. Le bloc BP reçoit le front montant et le rond du poussoir.'),
          Q('ad-canal8', 'C.4.5', 'dtr1920', 'Quel canal de l’actionneur pour l’éclairage du local électrique, et quelle fonction ?', [
            'Canal 8, en commutation simple (sans minuterie)',
            'Canal 8, en commutation avec minuterie',
            'Canal 1, en variation',
            'Canal 6, partagé avec les circulations',
          ], 'DTR 19 : luminaire 8 → sortie 8, « Commutation ». Les canaux 1 à 7 sont en commutation AVEC minuterie — la temporisation d’escalier éteint les zones vides.'),
          Q('ad-touches', 'C.4.3', 'dtr1920', 'Comment configurer les touches du poussoir BP (C.4.3, DTR 21) ?', [
            'Touche 1 : commutation ON (télégramme 1) · touche 2 : commutation OFF (télégramme 0) · DEL d’état selon l’objet d’acquittement',
            'Touche 1 : ON / OFF alterné · touche 2 : minuterie · DEL toujours allumée',
            'Les deux touches en variation · DEL désactivée',
            'Touche 1 : scénario · touche 2 : store · DEL clignotante',
          ], 'La DEL suit la RÉPONSE de l’actionneur (objet d’acquittement) : elle s’allume quand le canal 8 a vraiment commuté à ON. C’est ce que tu vérifieras à l’essai.'),
        ],
      },
    ],
  },
  postes: [
    {
      id: 'q11', name: 'Q11 · Protection de tête', need: 'Interrupteur différentiel du DTR 18 : protéger les personnes, consigner le tableau',
      options: [
        { key: 'rcd2p', ref: 'Acti9 iID 2P 25 A 30 mA type AC', spec: 'interrupteur différentiel 30 mA · 25 A', ok: true, why: 'Exactement le DTR 18 : 30 mA pour la protection des personnes, 25 A, type AC ; cadenassable, c’est l’organe de consignation.' },
        { key: 'rcd2p', ref: 'Acti9 iID 2P 40 A 300 mA', spec: 'différentiel 300 mA', why: '300 mA protège contre l’incendie, pas les personnes : insuffisant en tête d’un tableau terminal.' },
        { key: 'mcb2p', ref: 'Disjoncteur 2P C32', spec: 'sans différentiel', why: 'Un disjoncteur protège les conducteurs, pas les personnes : plus de détection de courant de défaut.' },
      ],
    },
    {
      id: 'q12', name: 'Q12 · Protection de l’alimentation de bus', need: 'DTR 18 : protéger l’alimentation KNX, phase + neutre',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C2', spec: 'phase + neutre · 2 A courbe C', ok: true, why: '2 A courbe C, comme au DTR 18 : l’alimentation n’appelle que quelques dizaines de milliampères, et le neutre s’ouvre avec la phase.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: 'unipolaire', half: true, why: 'Protège correctement mais laisse le neutre raccordé pendant l’intervention.' },
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C16', spec: 'phase + neutre · 16 A', why: 'Calibre des départs d’éclairage : sans rapport avec une alimentation de bus, qui ne serait plus protégée.' },
      ],
    },
    {
      id: 'q1314', name: 'Q13 / Q14 · Protections éclairage', need: 'DTR 18 : protéger L1 à L4 (Q13) et L5 à L9 (Q14), phase + neutre',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C16 (× 2)', spec: 'phase + neutre · 16 A courbe C', ok: true, why: '16 A courbe C, comme au DTR 18 : le calibre d’une voie de l’actionneur (8 × 16 A), phase et neutre coupés ensemble.' },
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C10 (× 2)', spec: 'phase + neutre · 10 A', half: true, why: '10 A protégerait des luminaires en 1,5 mm², mais ce n’est pas le calibre du tableau de répartition : le DTR 18 impose 16 A courbe C.' },
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C32 (× 2)', spec: 'phase + neutre · 32 A', why: 'Au-delà des 16 A d’une voie de l’actionneur et des conducteurs de 1,5 mm² : plus rien ne serait protégé d’une surcharge.' },
      ],
    },
    {
      id: 'a1', name: 'Alimentation de bus KNX', need: 'Fournir le 29 V DC du bus : 90,5 mA consommés (C.2.8)',
      options: [
        { key: 'knxalim', img: DOC('dt_alim.jpg'), ref: 'Schneider MTN684032', spec: '230 V AC → bus 320 mA · 64 participants · bobine intégrée', ok: true, why: '90,5 mA < 320 mA : la justification du corrigé, avec de la marge pour les extensions et le TP 4.' },
        { key: 'knxalim', ref: 'Schneider MTN683832', spec: '230 V AC → bus 160 mA', half: true, why: '160 mA suffiraient aux 90,5 mA consommés, mais ne laissent presque aucune extension. On prend la 320 mA.' },
        { key: 'knxalim', ref: 'Phaseo ABL8RPS24030', spec: 'alimentation 230 V AC → 24 V DC · 3 A', why: 'Alimentation à découpage ordinaire : ni les 29 V du bus, ni la bobine d’inductance qui laisse circuler les télégrammes.' },
      ],
    },
    {
      id: 'k1', name: 'Interface de communication', need: 'Transférer le programme ETS5 ET accéder au bus depuis le réseau (C.2.7)',
      options: [
        { key: 'knxip', img: DOC('dt_ip.jpg'), ref: 'Schneider MTN6502-0105', spec: 'interface IP/KNX · alimentée par le bus · 20 mA', ok: true, why: 'Interface de programmation ET accès au bus via Internet et un VPN : les deux « oui » du corrigé C.2.7.' },
        { key: 'knxusb', ref: 'Schneider MTN681829', spec: 'interface USB KNX', half: true, why: 'Elle programmerait tout aussi bien les participants, mais seulement depuis un PC branché au tableau : pas d’accès distant.' },
        { key: 'knxusb', ref: 'Convertisseur USB / RS485', spec: 'adaptateur série générique', why: 'Ne parle pas le protocole KNX : ETS5 ne verrait aucun participant.' },
      ],
    },
    {
      id: 'k2', name: 'Actionneur de commutation', need: 'Commuter 8 points lumineux indépendants (C.2.2), 16 A par voie',
      options: [
        { key: 'knxact8', img: DOC('dt_act.jpg'), ref: 'Schneider MTN647893', spec: 'actionneur KNX 8 × 16 A · 230 V AC · commande manuelle · 12,5 mA', ok: true, why: '8 sorties pour 8 points lumineux commandés indépendamment (C.2.3, C.4.4).' },
        { key: 'knxact8', ref: 'Schneider MTN647593', spec: 'actionneur 4 × 16 A', why: '4 sorties : il en manque quatre. Doubler les luminaires par voie marierait des zones qui doivent s’allumer seules.' },
        { key: 'knxact8', ref: 'Schneider MTN648493', spec: 'actionneur 12 × 16 A', half: true, why: 'Fonctionnerait, mais quatre voies payées pour rien : le besoin est de 8 sorties TOR.' },
      ],
    },
    {
      id: 'bp', name: 'Poussoir du local électrique', need: 'Commander le canal 8 (ON / OFF), blanc brillant (C.2.5)',
      options: [
        { key: 'knxbp', img: DOC('dt_bp.jpg'), ref: 'Schneider MTN617119', spec: 'KNX · 2 touches brillant blanc · 1 LED par touche · 10 mA', ok: true, why: 'Deux touches, deux ordres : touche 1 ON, touche 2 OFF, et une DEL d’état par touche. La référence du bon de commande.' },
        { key: 'knxbp', ref: 'Schneider MGU3.531.18', spec: 'Unica KNX · 2 touches, 4 poussoirs', half: true, why: 'Fonctionnerait électriquement, mais ce n’est pas la référence imposée (MTN617119) : quatre poussoirs pour une seule fonction.' },
        { key: 'knxbp', ref: 'Interrupteur va-et-vient 10 A', spec: 'appareillage classique 230 V', why: 'Coupe le 230 V dans le mur : aucun télégramme, pas sa place sur un bus 29 V.' },
      ],
    },
    {
      id: 'det', name: 'D1 à D6 · Détecteurs de présence', need: 'Détecter la présence ET mesurer la luminosité, finition Alu, en saillie (C.2.6)',
      options: [
        { key: 'knxdet', img: DOC('dt_det.jpg'), ref: 'Schneider MTN630860 + boîte saillie MTN550619', spec: 'détection + luminosité · finition Alu · 8 mA', ok: true, why: 'Les deux fonctionnalités exigées : présence ET luminosité, et la boîte pour le montage en saillie.' },
        { key: 'knxdet', ref: 'Détecteur de présence, sans mesure de luminosité', spec: 'détection seule', why: 'Sans mesure de luminosité, les lampes s’allumeraient même en plein jour : le cahier des charges n’est pas tenu.' },
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
    { id: 'g1', rep: 'G1', x: 70, diam: 20, nature: 'force', contenu: '3 conducteurs · L, N, PE', vers: 'tableau de l’Écobike (pupitre d’alimentation de l’atelier)', dessert: ['RES.'] },
    { id: 'g2', rep: 'G2', x: 150, diam: 20, nature: 'tbts', contenu: '1 câble de bus KNX · paire rouge / noir', vers: 'poussoir BP du local électrique, puis D1 à D6 en guirlande' },
    { id: 'g3', rep: 'G3', x: 240, diam: 25, nature: 'force', contenu: '4 câbles 3G1,5 · zones de recharge 1 à 8', vers: 'luminaires L1 à L4', dessert: ['L1.', 'L2.', 'L3.', 'L4.'] },
    { id: 'g4', rep: 'G4', x: 340, diam: 25, nature: 'force', contenu: '4 câbles 3G1,5 · circulations et local électrique', vers: 'luminaires L5 à L8', dessert: ['L5.', 'L6.', 'L7.', 'L8.'] },
    { id: 'g5', rep: 'G5', x: 420, diam: 16, nature: 'force', contenu: '1 câble 3G1,5 · projecteur à détecteur intégré', vers: 'L9 · entrée du local, direct sur Q14', dessert: ['L9.'] },
  ],
  goulotteDePied: false,
  sectionneurs: ['q13'],
  slots: [
    { id: 'q1', label: 'Q11 · Interrupteur différentiel 25 A 30 mA type AC (consignation)', key: 'rcd2p', rail: 0, x: 46, rep: 'Q11' },
    { id: 'f2', label: 'Q12 · Disjoncteur 2 A courbe C · alimentation KNX', key: 'mcb1pn', rail: 0, x: 112, rep: 'Q12' },
    { id: 'q13', label: 'Q13 · Disjoncteur 16 A courbe C · éclairage L1 à L4', key: 'mcb1pn', rail: 0, x: 178, rep: 'Q13' },
    { id: 'f3', label: 'Q14 · Disjoncteur 16 A courbe C · éclairage L5 à L9', key: 'mcb1pn', rail: 0, x: 244, rep: 'Q14' },
    { id: 'a1', label: 'Alimentation de bus KNX 320 mA · MTN684032', key: 'knxalim', rail: 0, x: 310, rep: 'A1' },
    { id: 'k1', label: 'Interface IP/KNX · MTN6502-0105 · 1.1.1', key: 'knxip', rail: 1, x: 46, rep: 'K1' },
    { id: 'k2', label: 'Actionneur de commutation 8 × 16 A · MTN647893 · 1.1.2', key: 'knxact8', rail: 1, x: 120, rep: 'K2' },
    ...X1_KNX,
  ],
  // Local : une colonne, dans l'ordre de la guirlande — BP, puis D1 à D6.
  annexItems: [
    { key: 'knxbp', rep: 'BP', name: 'poussoir 2 touches · local électrique · 1.1.5', x: 466, y: 64, w: 56, h: 56 },
    { key: 'knxdet', rep: 'D1', name: 'détecteur · zones 1-2 · 1.1.9', x: 472, y: 138, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D2', name: 'détecteur · zones 3-4 · 1.1.8', x: 472, y: 196, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D3', name: 'détecteur · zones 5-6 · 1.1.7', x: 472, y: 254, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D4', name: 'détecteur · zones 7-8 · 1.1.6', x: 472, y: 312, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D5', name: 'détecteur · circulation 2 · 1.1.4', x: 472, y: 370, w: 44, h: 44 },
    { key: 'knxdet', rep: 'D6', name: 'détecteur · circulation 1 · 1.1.3', x: 472, y: 428, w: 44, h: 44 },
  ],
  recvItems: [
    { key: 'l_ampoule_plexo_hublot', rep: 'L1', name: 'luminaire · zones 1-2', x: 15, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L2', name: 'luminaire · zones 3-4', x: 75, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L3', name: 'luminaire · zones 5-6', x: 135, y: 26, w: 50, h: 60, recv: true, pe: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L4', name: 'luminaire · zones 7-8', x: 195, y: 26, w: 50, h: 60, recv: true, pe: true },
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
    // Table réelle C.4.7 : l'interface de l'Écobike n'a PAS de nom — l'élève la reconnaît
    // à son adresse individuelle (1.1.1) et à son réseau (192.168.0.x, routeur du TP 4).
    interfaces: [
      { individuelle: '1.5.119', nom: 'domovea basic', ip: '10.129.140.3', mac: '00:24:C6:F1:C8:6D' },
      { individuelle: '1.1.1', ip: '192.168.0.3', mac: '48:33:DD:00:95:5D' },
      { individuelle: '1.8.1', nom: 'Interface IP KNX', ip: '10.129.130.80', mac: '00:22:D1:04:1A:D0' },
      { individuelle: '1.1.15', nom: 'KNX IP Interface', ip: '10.129.6.13', mac: 'D0:76:50:00:07:EB' },
      { individuelle: '15.15.0', nom: 'KNX IP Routeur', ip: '169.254.178.8', mac: '00:22:D1:04:08:B1' },
    ],
    bonneInterface: 1,
    autres: ['KNX-USB Data Interface', 'Realtek PCIe GBE Family Controller'],
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
    rappelAdresses:
      'DTR 21 · ETS5 : renseigner et paramétrer les participants, puis les lier. Pour l’adresse individuelle : '
      + '« Programmer l’adresse individuelle », puis appui sur le bouton de programmation du participant (sa DEL '
      + 'rouge s’allume, puis s’éteint quand l’adresse est écrite). Adresses du DTR 20 : Zone . Ligne . Position.',
    rappelParametres:
      'C.4.3 · BP : touche 1 = commutation ON, télégramme 1, DEL d’état allumée · touche 2 = commutation OFF, '
      + 'télégramme 0, DEL d’état éteinte — la DEL suit l’objet d’acquittement de l’actionneur (canal 8).',
    modesCanal8: ['Commutation', 'Minuterie', 'Variation', 'Store', 'Scénario'],
  },
  essaisKnxLocal: true,
  tests: [
    ...BASE_TESTS,
    {
      id: 'polarite',
      title: 'Contrôle de polarité du bus KNX',
      how: 'Multimètre en V⎓ aux bornes de bus du dernier participant de la guirlande (D6), pointe rouge sur (+). Une lecture négative signale deux conducteurs croisés en amont.',
      expected: '+29 V DC, jamais −29 V',
    },
    {
      id: 'boucle',
      title: 'Absence de boucle sur le bus',
      how: 'Suis la paire rouge / noir de l’alimentation à D6 : alimentation → interface → actionneur → BP → D1 → … → D6, chaque participant traversé une seule fois, D6 ne revient nulle part.',
      expected: 'guirlande ouverte, jamais d’anneau',
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
    { id: 'rpeL9', title: 'Continuité du PE jusqu’au projecteur L9', stage: 'horsTension', instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'L9.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'riso', title: 'Isolement du départ L1 (phase / PE)', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_4.a', b: 'x1_6.a', min: 0.5, max: 9999, unit: 'MΩ' },
    { id: 'risoL9', title: 'Isolement du départ L9, direct sur Q14 (phase / PE)', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_28.a', b: 'x1_30.a', min: 0.5, max: 9999, unit: 'MΩ' },
    { id: 'ubus', title: 'Tension du bus KNX en sortie d’alimentation', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'a1.+', b: 'a1.−', min: 28, max: 30, unit: 'V', when: 'ctl' },
    { id: 'ubusD4', title: 'Tension et polarité du bus sur D4', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'D4.X1', b: 'D4.X2', min: 28, max: 30, unit: 'V', when: 'ctl' },
    { id: 'ubusD6', title: 'Bus sur D6, fin de guirlande : tension et polarité', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'D6.X1', b: 'D6.X2', min: 28, max: 30, unit: 'V', when: 'ctl' },
    { id: 'uL5', title: 'Borne L de la voie 5 de l’actionneur (aval Q14)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'k2.L5', b: 'f3.N2', min: 220, max: 240, unit: 'V', when: 'ctl' },
    { id: 'u230c8', title: 'Tension en sortie de la voie 8 (local électrique)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'k2.8', b: 'f3.N2', min: 220, max: 240, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'guirlande', title: 'Guirlande du bus coupée entre D3 et D4',
      symptom: 'Au téléchargement, D4, D5 et D6 ne répondent pas ; D1 à D3, le poussoir et l’actionneur, si. Les zones 7-8 et les deux circulations ne s’allument jamais.',
      fix: 'Mesurer le bus de proche en proche : 29 V sur D3, 0 V sur D4. Reprendre le conducteur (+) de la guirlande entre D3 et D4, puis contrôler D6 en fin de ligne.',
      coupe: 'D3.X1>D4.X1',
      nets: hors(['D4.X1', 'D5.X1', 'D6.X1']),
      action: 'Reprendre le conducteur (+) de la guirlande entre D3 et D4',
    },
    {
      id: 'busD4', title: 'Paire du bus croisée à l’arrivée sur D4',
      symptom: 'Même constat qu’une guirlande coupée : D4, D5 et D6 absents d’ETS, zones 7-8 et circulations dans le noir. Pourtant le bus n’est pas coupé : il y a bien 29 V… mesurés à l’envers.',
      fix: 'Pointe rouge sur (+) : −29 V sur D4 à D6, +29 V sur D3. Remettre le rouge sur (+) et le noir sur (−) au connecteur de D4.',
      croise: ['D3.X1>D4.X1', 'D3.X2>D4.X2'],
      // D4 reçoit la paire croisée ; D5 et D6, alimentés par ses bornes, sont inversés avec lui.
      nets: { 'D5.X1': { net: 'DC-' }, 'D5.X2': { net: 'DC+' }, 'D6.X1': { net: 'DC-' }, 'D6.X2': { net: 'DC+' } },
      action: 'Remettre le rouge sur (+) et le noir sur (−) au connecteur de bus de D4',
    },
    {
      id: 'f3', title: 'Q14 déclenché',
      symptom: 'L5 à L8 et le projecteur L9 restent éteints, de jour comme de nuit ; L1 à L4 fonctionnent normalement, et tous les participants répondent dans ETS.',
      fix: 'Chercher la cause en aval de Q14 (voies 5 à 8, départ L9), puis réarmer Q14.',
      ouvre: 'f3',
      action: 'Chercher le défaut en aval de Q14, puis le réarmer',
    },
    {
      id: 'sortie5', title: 'Sortie de la voie 5 non raccordée au bornier',
      symptom: 'La Circulation 2 (D5) déclenche normalement — le relais de la voie 5 claque et sa LED s’allume — mais L5 ne s’allume jamais. L6 s’allume.',
      fix: 'Refaire la liaison K2:5 → X1:16 et contrôler le serrage des deux bornes.',
      coupe: 'k2.5>x1_16.a',
      nets: hors(['x1_16.a', 'x1_16.b', 'L5.X1']),
      action: 'Refaire la liaison K2:5 → X1:16',
    },
    {
      id: 'terreL3', title: 'Conducteur de protection du luminaire L3 non raccordé',
      symptom: 'Tout fonctionne normalement : L3 s’allume comme les autres au passage devant D3. Seule la mesure de continuité du PE de L3 révèle le défaut.',
      fix: 'Reprendre le vert-jaune entre X1:3 et X1:12 (terre de L3), puis refaire la mesure de continuité.',
      coupe: 'x1_3.a>x1_12.a',
      action: 'Reprendre le conducteur de protection de L3',
    },
    {
      id: 'q12', title: 'Phase coupée entre Q12 et l’alimentation de bus',
      symptom: 'Aucun détecteur, aucun appui sur BP ne commande plus rien, le bus est à 0 V — pourtant Q12 est fermé et, en basculant à la main les leviers de l’actionneur (commande manuelle), L1 à L8 s’allument normalement.',
      fix: 'Contrôler la présence du 230 V sur les bornes L N de l’alimentation, puis reprendre le conducteur de phase depuis Q12.',
      coupe: 'f2.2>a1.L',
      nets: hors(['a1.L', 'a1.+', 'a1.−', 'k1.+', 'k1.−', 'k2.+', 'k2.−', ...GUIRLANDE.flatMap(d => [`${d}.X1`, `${d}.X2`])]),
      action: 'Reprendre le conducteur de phase entre Q12 et l’alimentation de bus',
    },
    {
      id: 'neutreL9', title: 'Neutre du projecteur L9 coupé',
      symptom: 'L9, câblé en direct sur Q14, ne s’allume jamais — de jour comme de nuit — alors que le bus et les huit voies de l’actionneur fonctionnent normalement.',
      fix: 'Reprendre le conducteur bleu entre Q14 et la borne de neutre de L9 au bornier.',
      coupe: 'f3.N2>x1_29.a',
      nets: hors(['x1_29.a', 'x1_29.b', 'L9.X2']),
      action: 'Reprendre le neutre entre Q14 et L9',
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
    {
      q: 'Quelle est la différence entre une guirlande et une boucle sur le bus ?',
      options: [
        'La guirlande traverse chaque participant une fois et reste ouverte au dernier ; la boucle referme le bus sur lui-même — interdit',
        'Aucune : les deux sont autorisées',
        'La boucle est obligatoire au-delà de six participants',
        'La guirlande est interdite, seule l’étoile est permise',
      ],
      answer: 0,
    },
    {
      q: 'À quoi sert la DEL d’état du poussoir BP ?',
      options: [
        'À signaler l’état de L8 : elle suit l’acquittement de l’actionneur (canal 8 à ON → DEL allumée)',
        'À montrer que le bouton est alimenté en 230 V',
        'À indiquer que le poussoir est en mode programmation',
        'À rien : elle reste toujours allumée',
      ],
      answer: 0,
    },
    {
      q: 'Pourquoi L9 n’est-il pas piloté par le bus KNX ?',
      options: ['C’est un projecteur à détecteur intégré, câblé en direct sur Q14', 'Le bus n’a plus d’adresse disponible', 'L9 est trop puissant pour l’actionneur', 'Le bureau d’études l’a oublié'],
      answer: 0,
    },
    {
      q: 'Quel calibre pour Q13 et Q14, d’après le tableau de répartition ?',
      options: ['2 A courbe C', '10 A courbe C', '16 A courbe C', '25 A type AC'],
      answer: 2,
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
    avalPairs: [['q1.2', 'q1.N2'], ['q13.2', 'q13.N2'], ['f3.2', 'f3.N2']],
  },
};
