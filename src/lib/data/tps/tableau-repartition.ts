/**
 * TP · Tableau de répartition tertiaire (scène tertiaire, 400 V tri + N).
 *
 * Tableau divisionnaire d'un plateau de bureaux alimenté en 3 × 400 V + N + PE :
 *  - Q0 disjoncteur général tétrapolaire, organe de séparation et de condamnation ;
 *  - ID1 interrupteur différentiel 4P 300 mA type S (sélectif) en tête ;
 *  - ID2 différentiel 30 mA type A instantané sur la rangée des circuits terminaux
 *    → sélectivité différentielle verticale (rapport 10 sur la sensibilité, temporisation amont) ;
 *  - trois départs : éclairage des circulations (contacteur KM1), prises de bureaux, commande.
 *
 * Correspondances imposées par le moteur de simulation (identifiants `q1`, `f2`, `f3`, `f1`, `km1`) :
 *  q1 = Q0 général 4P · f2 = ID1 300 mA type S · f1 = Q1 départ éclairage 16 A ·
 *  f3 = Q3 circuit de commande 2 A · km1 = KM1 contacteur d'éclairage.
 *  Les boutons du coffret de porte sont la commande d'éclairage des circulations
 *  (S2 vert = marche, S1 rouge = arrêt, H1 = éclairage en service).
 */
import type { AnnexItem, Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Bornier X1 du tableau : bornes étroites au pas de 18 px sur le dernier rail. */
function bornier(x0: number, rows: [string, string, string][], rail = 2): Slot[] {
  return rows.map(([key, mark, sub], i) => ({
    id: `x1_${i + 1}`,
    label: `X1:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18,
    mark,
    sub,
    group: 'X1',
    ...(i === 0 ? { groupLabel: 'X1 · bornier de départ (chemin de câbles)' } : {}),
  }));
}

/** Local tertiaire : prise de courant des bureaux, alimentée par le départ Q2. */
const LOCAL: AnnexItem[] = [
  { key: 'l_commande_prise_de_courant', rep: 'PC1', name: 'prise 2P+T 16 A · poste de travail', x: 448, y: 330, w: 44, h: 44 },
];

/** Récepteurs : les deux zones d'éclairage des circulations. */
const RECV: AnnexItem[] = [
  { key: 'l_architec_tube_fluorescent_x2', rep: 'E1', name: 'circulation nord · réglettes LED 2 × 28 W', x: 40, y: 30, w: 150, h: 38, recv: true },
  { key: 'l_architec_tube_fluorescent_x2', rep: 'E2', name: 'circulation sud · réglettes LED 2 × 28 W', x: 240, y: 30, w: 150, h: 38, recv: true },
];

export const TP_TABLEAU_REPARTITION: TpDefinition = {
  id: 'tableau-repartition',
  title: 'Tableau de répartition tertiaire',
  level: 'Tle Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Tableau divisionnaire tertiaire 400 V tri + N : disjoncteur général tétrapolaire, interrupteur différentiel 300 mA type S en tête, différentiel 30 mA type A sur les circuits terminaux (sélectivité verticale), départs éclairage par contacteur, prises de bureaux et commande, bornier X1 repéré.',
  situation:
    'Le tableau divisionnaire du troisième étage est alimenté en 3 × 400 V + N + PE depuis le TGBT. Tu dois l\'équiper : un disjoncteur général tétrapolaire, un interrupteur différentiel de tête 300 mA type S qui doit rester fermé lorsqu\'un défaut apparaît sur un circuit terminal, un différentiel 30 mA type A qui protège les personnes sur les départs, puis les départs eux-mêmes — l\'éclairage des circulations commandé par un contacteur, les prises des postes de travail et le circuit de commande. Tu réalises ensuite les tests, la consignation, les mesures et la mise en service.',
  plaque: {
    Alimentation: '3 × 400 V + N + PE ~ 50 Hz, depuis le TGBT',
    Général: 'Q0 tétrapolaire 40 A courbe C',
    'Différentiel de tête': 'ID1 4P 40 A 300 mA type S (sélectif)',
    'Différentiel aval': 'ID2 2P 40 A 30 mA type A (instantané)',
    Départs: 'Q1 éclairage 16 A · Q2 prises 20 A · Q3 commande 2 A',
    Éclairage: '2 circulations · réglettes LED 2 × 28 W · ≈ 2,9 A',
    Régime: 'TT · sections 2,5 mm² départs, 1,5 mm² commande',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '3 × 400 V + N + PE sur X1:1 à X1:5 (câblage installateur)' },
    { k: 'Rail 1', v: 'Q0 disjoncteur général 4P 40 A · ID1 différentiel 4P 40 A 300 mA type S · H3 présence tension' },
    { k: 'Rail 2', v: 'ID2 différentiel 2P 40 A 30 mA type A · Q1 éclairage 16 A · Q2 prises 20 A · Q3 commande 2 A · KM1 contacteur' },
    { k: 'Rail 3', v: 'X1 · bornier de départ, 16 bornes étroites repérées' },
    { k: 'Sélectivité différentielle', v: 'ID1 300 mA type S en amont, ID2 30 mA instantané en aval : rapport de sensibilité ≥ 3 et retard du type S — un défaut sur un départ n\'ouvre que ID2' },
    { k: 'Équilibrage', v: 'les départs monophasés sont pris sur L1 ; L2 et L3 restent disponibles en aval d\'ID1 pour les extensions' },
    { k: 'Circuit de commande', v: 'Q3 pris en aval d\'ID1, en amont d\'ID2 : un déclenchement du 30 mA ne prive pas le tableau de sa commande' },
    { k: 'Éclairage', v: 'Q1 16 A courbe C en 2,5 mm², contacteur KM1 AC-7a, deux zones (X1:6 et X1:7), neutre commun X1:8' },
    { k: 'Prises', v: 'Q2 20 A courbe C en 2,5 mm² (8 socles maximum par circuit), départ X1:9 / X1:10' },
    { k: 'Commande', v: 'S1 arrêt NC puis S2 marche NO, auto-maintien par le contact KM1 13-14' },
    { k: 'Repérage', v: 'étiquette de circuit sur chaque appareil, repère de conducteur à chaque extrémité' },
    { k: 'Avant mise en service', v: 'contrôle visuel · consignation · VAT · continuité PE · isolement 500 V · essai des différentiels au bouton test' },
  ],
  postes: [
    {
      id: 'q0',
      name: 'Q0 · Disjoncteur général du tableau',
      need: 'Séparer et protéger un tableau divisionnaire alimenté en 3 × 400 V + N, 40 A',
      options: [
        { key: 'mcb4p', ref: 'iC60N 4P C40', spec: '40 A · courbe C · tétrapolaire', ok: true, why: 'Quatre pôles pour couper les trois phases ET le neutre : c\'est la condition d\'une séparation complète et d\'une consignation sûre.' },
        { key: 'mcb3p', ref: 'iC60N 3P C40', spec: '40 A · tripolaire', why: 'Le neutre n\'est pas coupé : la platine reste reliée au neutre du TGBT, la séparation est incomplète.' },
        { key: 'mcb4p', ref: 'iC60N 4P C63', spec: '63 A · courbe C', why: 'Calibre supérieur au courant admissible de la canalisation d\'alimentation : elle n\'est plus protégée.' },
      ],
    },
    {
      id: 'id1',
      name: 'ID1 · Différentiel de tête',
      need: 'Protéger le tableau sans déclencher lorsqu\'un défaut apparaît en aval du 30 mA',
      options: [
        { key: 'rcd4p', ref: 'iID 4P 40 A 300 mA type S', spec: '300 mA · sélectif (retardé)', ok: true, why: 'Sensibilité 10 fois supérieure au 30 mA aval et retard intentionnel du type S : la sélectivité verticale est assurée.' },
        { key: 'rcd4p', ref: 'iID 4P 40 A 30 mA type AC', spec: '30 mA · instantané', why: 'Même sensibilité et même temps de coupure que le différentiel aval : les deux déclenchent ensemble, tout le tableau tombe.' },
        { key: 'rcd4p', ref: 'iID 4P 40 A 300 mA instantané', spec: '300 mA · non retardé', half: true, why: 'Le rapport de sensibilité est bon, mais sans retard le déclenchement simultané reste possible : le type S est exigé.' },
      ],
    },
    {
      id: 'id2',
      name: 'ID2 · Différentiel des circuits terminaux',
      need: 'Protection des personnes sur les départs éclairage et prises',
      options: [
        { key: 'rcd2p', ref: 'iID 2P 40 A 30 mA type A', spec: '40 A · 30 mA · type A', ok: true, why: '30 mA obligatoire sur les circuits terminaux ; le type A voit les composantes continues des drivers LED et des chargeurs des postes de travail.' },
        { key: 'rcd2eaton', ref: 'HNC-25/2/003 type AC', spec: '25 A · 30 mA · type AC', half: true, why: 'Sensibilité correcte, mais le type AC est aveugle aux composantes continues et 25 A est juste pour la somme des départs.' },
        { key: 'rcd2p', ref: 'iID 2P 40 A 300 mA', spec: '40 A · 300 mA', why: '300 mA ne protège pas les personnes et supprime toute sélectivité avec ID1.' },
      ],
    },
    {
      id: 'div',
      name: 'Q1 / Q2 · Calibres des départs',
      need: 'Éclairage 2,0 kW en 2,5 mm² et prises de bureaux en 2,5 mm²',
      options: [
        { key: 'mcb2p', ref: 'Q1 = 16 A courbe C · Q2 = 20 A courbe C', spec: '2,5 mm² · courbe C', ok: true, why: 'Calibres liés à la section (20 A maximum en 2,5 mm²), courbe C pour l\'appel des drivers LED et des alimentations de bureau.' },
        { key: 'mcb2p', ref: 'Q1 = Q2 = 32 A courbe C', spec: '32 A partout', why: 'Le 2,5 mm² (21 A admissibles) n\'est plus protégé : échauffement de la canalisation avant déclenchement.' },
        { key: 'mcb2p', ref: 'Q1 = Q2 = 10 A courbe B', spec: '10 A partout', half: true, why: 'Sûr pour les conducteurs, mais 8,7 A d\'éclairage sous 10 A courbe B : déclenchements intempestifs à chaque allumage.' },
      ],
    },
    {
      id: 'x',
      name: 'X1 · Bornier de départ et conducteur de protection',
      need: 'Raccorder les départs (2,5 mm²), la commande (1,5 mm²) et la terre du tableau',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE · PE 6 mm²', spec: 'bornes 2,5 mm² · bornes de terre vert-jaune', ok: true, why: 'Bornes acceptant 2,5 et 1,5 mm², bornes de terre repérées, conducteur de protection principal en 6 mm² pour un tableau divisionnaire.' },
        { key: 'termgrey', ref: 'UT 1,5 partout · PE 1,5 mm²', spec: 'bornes 1,5 mm²', why: 'Les départs sont en 2,5 mm² : ni les bornes ni le conducteur de protection principal ne sont dimensionnés.' },
        { key: 'termgrey', ref: 'Dominos et barrettes de terre improvisées', spec: 'connecteurs à vis', why: 'Interdit en tableau : le raccordement des départs se fait sur des bornes montées sur rail, repérées.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q0 · Disjoncteur général 4P 40 A', key: 'mcb4p', rail: 0, x: 52, rep: 'Q0' },
    { id: 'f2', label: 'ID1 · Différentiel 4P 40 A 300 mA type S', key: 'rcd4p', rail: 0, x: 164, rep: 'ID1' },
    { id: 'h3', label: 'H3 · Voyant présence tension', key: 'lampG', rail: 0, x: 276, rep: 'H3' },
    { id: 'id2', label: 'ID2 · Différentiel 2P 40 A 30 mA type A', key: 'rcd2p', rail: 1, x: 52, rep: 'ID2' },
    { id: 'f1', label: 'Q1 · Départ éclairage 16 A', key: 'mcb2p', rail: 1, x: 110, rep: 'Q1' },
    { id: 'q2', label: 'Q2 · Départ prises 20 A', key: 'mcb2p', rail: 1, x: 168, rep: 'Q2' },
    { id: 'f3', label: 'Q3 · Circuit de commande 2 A', key: 'mcb1p', rail: 1, x: 226, rep: 'Q3' },
    { id: 'km1', label: 'KM1 · Contacteur d\'éclairage 25 A AC-7a', key: 'kontakt', rail: 1, x: 258, rep: 'KM1' },
    ...bornier(52, [
      ['termred', '1', 'L1'], ['termred', '2', 'L2'], ['termred', '3', 'L3'],
      ['termblue', '4', 'N'], ['earth', '5', 'PE'],
      ['termred', '6', 'ECL1'], ['termred', '7', 'ECL2'], ['termblue', '8', 'N-ECL'],
      ['termred', '9', 'PC-L'], ['termblue', '10', 'PC-N'],
      ['termred', '11', 'CMD'], ['termred', '12', 'MRC'], ['termred', '13', 'A1'],
      ['termred', '14', 'H1'], ['termblue', '15', 'N-C'], ['earth', '16', 'PE'],
    ]),
  ],
  annexItems: LOCAL,
  recvItems: RECV,
  liaisons: [
    // ---- arrivée du TGBT (câblage installateur)
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.L2', 'x1_2.b', 'L2', 'pre'), L('RES.L3', 'x1_3.b', 'L3', 'pre'),
    L('RES.N', 'x1_4.b', 'N', 'pre'), L('RES.PE', 'x1_5.b', 'PE', 'pre'),
    // ---- disjoncteur général tétrapolaire
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'), L('x1_4.a', 'q1.N', 'N'),
    // ---- différentiel de tête 300 mA type S
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.3', 'L2'), L('q1.6', 'f2.5', 'L3'), L('q1.N2', 'f2.N', 'N'),
    L('f2.2', 'h3.X1', 'L1'), L('h3.X2', 'f2.N2', 'N'),
    L('x1_5.a', 'x1_16.a', 'PE'),
    // ---- différentiel 30 mA des circuits terminaux (sélectivité verticale)
    L('f2.2', 'id2.1', 'L1'), L('f2.N2', 'id2.N', 'N'),
    L('id2.2', 'f1.1', 'L1'), L('id2.N2', 'f1.N', 'N'),
    L('id2.2', 'q2.1', 'L1'), L('id2.N2', 'q2.N', 'N'),
    // ---- circuit de commande, pris en amont d'ID2
    L('f2.2', 'f3.1', 'L1'),
    // ---- départ éclairage des circulations par KM1
    L('f1.2', 'km1.1', 'L1'), L('f1.2', 'km1.3', 'L1'),
    L('km1.2', 'x1_6.a', 'L1'), L('km1.4', 'x1_7.a', 'L1'), L('f1.N2', 'x1_8.a', 'N'),
    L('x1_6.b', 'E1.X1', 'L1'), L('x1_7.b', 'E2.X1', 'L1'),
    L('x1_8.b', 'E1.X2', 'N'), L('x1_8.b', 'E2.X2', 'N'),
    // ---- départ prises des postes de travail
    L('q2.2', 'x1_9.a', 'L1'), L('q2.N2', 'x1_10.a', 'N'),
    L('x1_9.b', 'PC1.X1', 'L1'), L('x1_10.b', 'PC1.X2', 'N'),
    // ---- commande de l'éclairage : arrêt NC, marche NO, auto-maintien
    L('f3.2', 'x1_11.a', 'L1'), L('x1_11.b', 'S1.21', 'L1', 'door'),
    L('S1.22', 'S2.13', 'L1', 'door'), L('S1.22', 'x1_12.b', 'L1', 'door'),
    L('S2.14', 'x1_13.b', 'L1', 'door'),
    L('x1_12.a', 'km1.13', 'L1'), L('km1.14', 'km1.A1', 'L1'), L('x1_13.a', 'km1.A1', 'L1'),
    L('km1.A2', 'x1_15.a', 'N'), L('f2.N2', 'x1_15.a', 'N'),
    // ---- signalisation de l'éclairage en service
    L('x1_13.a', 'x1_14.a', 'L1'), L('x1_14.b', 'H1.X1', 'L1', 'door'), L('x1_15.b', 'H1.X2', 'N', 'door'),
  ],
  nets: {
    // arrivée triphasée
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'L2', live: 'always' }, 'x1_2.b': { net: 'L2', live: 'always' },
    'x1_3.a': { net: 'L3', live: 'always' }, 'x1_3.b': { net: 'L3', live: 'always' },
    'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
    'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
    // disjoncteur général
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'L2', live: 'always' },
    'q1.5': { net: 'L3', live: 'always' }, 'q1.N': { net: 'N', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'L2', live: 'q1' },
    'q1.6': { net: 'L3', live: 'q1' }, 'q1.N2': { net: 'N', live: 'q1' },
    // différentiel de tête
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.3': { net: 'L2', live: 'q1' },
    'f2.5': { net: 'L3', live: 'q1' }, 'f2.N': { net: 'N', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.4': { net: 'L2', live: 'f2' },
    'f2.6': { net: 'L3', live: 'f2' }, 'f2.N2': { net: 'N', live: 'f2' },
    'h3.X1': { net: 'L1', live: 'f2' }, 'h3.X2': { net: 'N', live: 'f2' },
    // différentiel 30 mA et départs
    'id2.1': { net: 'L1', live: 'f2' }, 'id2.N': { net: 'N', live: 'f2' },
    'id2.2': { net: 'L1', live: 'f2' }, 'id2.N2': { net: 'N', live: 'f2' },
    'f1.1': { net: 'L1', live: 'f2' }, 'f1.N': { net: 'N', live: 'f2' },
    'f1.2': { net: 'L1', live: 'f2' }, 'f1.N2': { net: 'N', live: 'f2' },
    'q2.1': { net: 'L1', live: 'f2' }, 'q2.N': { net: 'N', live: 'f2' },
    'q2.2': { net: 'L1', live: 'f2' }, 'q2.N2': { net: 'N', live: 'f2' },
    'f3.1': { net: 'L1', live: 'f2' }, 'f3.2': { net: 'L1', live: 'ctl' },
    // contacteur d'éclairage
    'km1.1': { net: 'L1', live: 'f2' }, 'km1.3': { net: 'L1', live: 'f2' },
    'km1.2': { net: 'L1', live: 'run' }, 'km1.4': { net: 'L1', live: 'run' },
    'km1.13': { net: 'L1', live: 'ctl' }, 'km1.14': { net: 'L1', live: 'km1' },
    'km1.A1': { net: 'L1', live: 'km1' }, 'km1.A2': { net: 'N', live: 'f2' },
    // départ éclairage
    'x1_6.a': { net: 'L1', live: 'run' }, 'x1_6.b': { net: 'L1', live: 'run' },
    'x1_7.a': { net: 'L1', live: 'run' }, 'x1_7.b': { net: 'L1', live: 'run' },
    'x1_8.a': { net: 'N', live: 'f2' }, 'x1_8.b': { net: 'N', live: 'f2' },
    'E1.X1': { net: 'L1', live: 'run' }, 'E1.X2': { net: 'N', live: 'f2' },
    'E2.X1': { net: 'L1', live: 'run' }, 'E2.X2': { net: 'N', live: 'f2' },
    // départ prises
    'x1_9.a': { net: 'L1', live: 'f2' }, 'x1_9.b': { net: 'L1', live: 'f2' },
    'x1_10.a': { net: 'N', live: 'f2' }, 'x1_10.b': { net: 'N', live: 'f2' },
    'PC1.X1': { net: 'L1', live: 'f2' }, 'PC1.X2': { net: 'N', live: 'f2' },
    // boucle de commande
    'x1_11.a': { net: 'L1', live: 'ctl' }, 'x1_11.b': { net: 'L1', live: 'ctl' },
    'S1.21': { net: 'L1', live: 'ctl' }, 'S1.22': { net: 'L1', live: 'ctl' },
    'S2.13': { net: 'L1', live: 'ctl' }, 'S2.14': { net: 'L1', live: 'km1' },
    'x1_12.a': { net: 'L1', live: 'ctl' }, 'x1_12.b': { net: 'L1', live: 'ctl' },
    'x1_13.a': { net: 'L1', live: 'km1' }, 'x1_13.b': { net: 'L1', live: 'km1' },
    // signalisation et neutre de commande
    'x1_14.a': { net: 'L1', live: 'km1' }, 'x1_14.b': { net: 'L1', live: 'km1' },
    'H1.X1': { net: 'L1', live: 'km1' }, 'H1.X2': { net: 'N', live: 'f2' },
    'x1_15.a': { net: 'N', live: 'f2' }, 'x1_15.b': { net: 'N', live: 'f2' },
    // conducteur de protection
    'x1_16.a': { net: 'PE', live: 'always' }, 'x1_16.b': { net: 'PE', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'sel',
      title: 'Essai de sélectivité différentielle',
      how: 'Appuie sur le bouton test d\'ID2 (30 mA) : seul ID2 doit s\'ouvrir, ID1 (300 mA type S) reste fermé et le circuit de commande garde sa tension. Recommence ensuite sur le bouton test d\'ID1.',
      expected: 'ID2 seul au test aval, tout le tableau au test amont',
    },
    {
      id: 'neutres',
      title: 'Séparation des neutres',
      how: 'Multimètre en Ω, appareils ouverts : vérifie que le neutre de chaque départ revient bien au différentiel qui protège sa phase, et qu\'aucun neutre ne passe d\'un différentiel à l\'autre.',
      expected: 'aucune continuité entre le neutre d\'ID2 et un autre départ',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du conducteur de protection', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'x1_16.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement du départ prises sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_9.a', b: 'x1_5.a', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'cn', title: 'Continuité du neutre, arrivée → entrée d\'ID2', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'x1_4.a', b: 'id2.N', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'u400', title: 'Tension composée à l\'arrivée (L1 – L2)', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_1.a', b: 'x1_2.a', min: 380, max: 420, unit: 'V',
    },
    {
      id: 'u230', title: 'Tension simple en aval d\'ID1 (L1 – N)', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'f2.2', b: 'f2.N2', min: 225, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'upc', title: 'Tension à la prise du poste de travail', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'PC1.X1', b: 'PC1.X2', min: 225, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'iecl', title: 'Courant du départ éclairage à la pince (KM1:2 → X1:6)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>x1_6.a', min: 2.4, max: 3.6, unit: 'A', when: 'run',
    },
  ],
  faults: [
    { id: 'x2', title: 'Fil X1:13 → KM1 A1 débranché', symptom: 'L\'éclairage des circulations ne démarre plus, alors que 230 V sont présents sur X1:13 et que les prises fonctionnent.', fix: 'Reconnecter le retour de commande sur la borne A1 de la bobine de KM1.' },
    { id: 's1', title: 'Contact NC du bouton d\'arrêt S1 (21-22) resté ouvert', symptom: 'Aucun appui sur le bouton marche n\'agit, pourtant 230 V sont bien mesurés sur X1:11 en sortie de Q3.', fix: 'Remplacer le bloc de contact NC de S1 : la boucle de commande est coupée dès son origine.' },
    { id: 'f3', title: 'Q3 (circuit de commande) déclenché', symptom: 'Plus aucune commande d\'éclairage et 0 V sur X1:11, alors que les prises et le reste du tableau restent alimentés.', fix: 'Rechercher le défaut du circuit de commande (bobine ou conducteur en court-circuit), puis réarmer Q3.' },
  ],
  quiz: [
    { q: 'Quelles conditions assurent la sélectivité entre deux différentiels en cascade ?', options: ['Même sensibilité pour les deux appareils', 'Sensibilité amont au moins 3 fois plus grande ET appareil amont retardé (type S)', 'Un calibre amont plus élevé suffit'], answer: 1 },
    { q: 'Pourquoi le disjoncteur général d\'un tableau alimenté en 400 V + N est-il tétrapolaire ?', options: ['Pour couper aussi le neutre et permettre une séparation complète', 'Pour équilibrer les phases', 'Parce que le PE doit être coupé lui aussi'], answer: 0 },
    { q: 'Quel calibre maximal protège un circuit câblé en 2,5 mm² ?', options: ['16 A', '20 A', '32 A'], answer: 1 },
  ],
  motor: null,
  station: true,
  hasMotor: false,
};
