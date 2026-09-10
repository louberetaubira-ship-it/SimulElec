/**
 * TP · Éclairage de sécurité par blocs autonomes (scène tertiaire, 230 V mono).
 *
 * Local d'un ERP : l'éclairage normal (deux zones de réglettes LED) est commandé par
 * le contacteur KM1 ; deux BAES d'évacuation SATI sont alimentés EN PERMANENCE en aval
 * de la protection du circuit d'éclairage qu'ils secourent (Q1) mais EN AMONT de sa
 * commande (KM1), et une télécommande de mise au repos TC1, sur circuit dédié protégé,
 * les met au repos par deux fils sans jamais couper leur alimentation.
 *
 * Correspondances imposées par le moteur de simulation (identifiants `q1`, `f2`, `f3`, `f1`, `km1`) :
 *  q1 = Q0 disjoncteur général du local · f2 = ID1 différentiel 30 mA type A ·
 *  f1 = Q1 circuit d'éclairage 16 A (éclairage normal + alimentation des BAES) ·
 *  f3 = Q2 circuit dédié commande et télécommande 2 A · km1 = KM1 contacteur d'éclairage normal.
 *  Les boutons du coffret de porte sont la commande d'éclairage du local
 *  (S2 vert = marche, S1 rouge = arrêt, H1 = éclairage normal en service).
 */
import type { AnnexItem, Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Bornier X1 du coffret : bornes étroites au pas de 18 px sur le dernier rail. */
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
    ...(i === 0 ? { groupLabel: 'X1 · bornier de départ (éclairage · sécurité)' } : {}),
  }));
}

/** Local ERP : détecteur de présence et déclencheur manuel du SSI (décor, hors tableau). */
const LOCAL: AnnexItem[] = [
  { key: 'l_commande_detecteur', rep: 'B1', name: 'détecteur de présence (contact NO)', x: 448, y: 320, w: 40, h: 48 },
  { key: 'l_alarmes_detecteur_manuel', rep: 'DM', name: 'déclencheur manuel du SSI (hors périmètre du tableau)', x: 450, y: 420, w: 36, h: 36 },
];

/** Récepteurs : éclairage normal, blocs autonomes et leurs bornes de télécommande. */
const RECV: AnnexItem[] = [
  { key: 'l_architec_tube_fluorescent_x2', rep: 'E1', name: 'zone 1 · réglettes LED 2 × 28 W', x: 20, y: 22, w: 140, h: 36, recv: true },
  { key: 'l_architec_tube_fluorescent_x2', rep: 'E2', name: 'zone 2 · réglettes LED 2 × 28 W', x: 20, y: 106, w: 140, h: 36, recv: true },
  { key: 'l_alarmes_baes', rep: 'E3', name: 'BAES 1 · 45 lm 1 h SATI (bornes L / N)', x: 200, y: 20, w: 100, h: 50, recv: true },
  { key: 'l_borniers_wago_x2', rep: 'E3T', name: 'BAES 1 · bornes de télécommande (2 fils)', x: 214, y: 104, w: 34, h: 22, recv: true },
  { key: 'l_alarmes_baes', rep: 'E4', name: 'BAES 2 · 45 lm 1 h SATI (bornes L / N)', x: 350, y: 20, w: 100, h: 50, recv: true },
  { key: 'l_borniers_wago_x2', rep: 'E4T', name: 'BAES 2 · bornes de télécommande (2 fils)', x: 364, y: 104, w: 34, h: 22, recv: true },
];

export const TP_ECLAIRAGE_BAES: TpDefinition = {
  id: 'eclairage-baes',
  title: 'Éclairage de sécurité · BAES et télécommande',
  level: '1re Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Éclairage normal d\'un local d\'ERP commandé par le contacteur KM1 et deux blocs autonomes d\'éclairage de sécurité SATI alimentés en permanence en aval de Q1 et en amont de KM1, avec télécommande de mise au repos TC1 sur circuit dédié protégé par Q2.',
  situation:
    'Le local de reprographie d\'un ERP doit recevoir un éclairage de sécurité. Tu câbles l\'éclairage normal en deux zones, commandé depuis le coffret de porte et par un détecteur de présence, puis les deux BAES d\'évacuation : leur alimentation est prise en aval de la protection du circuit d\'éclairage qu\'ils secourent, en amont de sa commande, pour qu\'ils restent chargés en permanence et ne s\'allument qu\'en cas de disparition du réseau. La télécommande TC1, sur son circuit dédié, permet de les mettre au repos pendant les périodes de fermeture, par deux fils qui ne coupent jamais leur alimentation.',
  plaque: {
    Établissement: 'ERP · local de reprographie',
    'Éclairage normal': '2 zones · réglettes LED 2 × 28 W',
    BAES: '2 blocs 45 lm · 1 h · SATI, évacuation',
    Protection: 'Q1 16 A courbe C · ID1 40 A 30 mA type A',
    Télécommande: 'TC1 de mise au repos · circuit dédié Q2 2 A',
    Section: '3G2,5 mm² éclairage · 1,5 mm² commande et télécommande',
    Vérification: 'essai SATI automatique, autonomie 1 h',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE sur X1:1 · X1:2 · X1:3 (câblage installateur)' },
    { k: 'Rail 1', v: 'Q0 général 32 A · ID1 différentiel 40 A 30 mA type A · Q1 éclairage 16 A · Q2 commande et télécommande 2 A · H3 présence tension' },
    { k: 'Rail 2', v: 'KM1 contacteur 25 A AC-7a bobine 230 V · TC1 télécommande de mise au repos · H4 voyant blocs au repos' },
    { k: 'Rail 3', v: 'X1 · bornier de départ, 16 bornes étroites repérées' },
    { k: 'Éclairage normal', v: 'zone 1 sur KM1 1-2 (X1:4), zone 2 sur KM1 3-4 (X1:5), neutre commun X1:6' },
    { k: 'Alimentation des BAES', v: 'RÈGLE NF C 71-800 : en aval de Q1, protection du circuit d\'éclairage secouru, mais EN AMONT de KM1 — X1:7 / X1:8, jamais coupée par la commande' },
    { k: 'Télécommande', v: 'TC1 alimentée par Q2 ; deux fils de télécommande X1:9 / X1:10 vers les borniers E3T et E4T des blocs' },
    { k: 'Interdit', v: 'couper l\'alimentation des blocs pour les éteindre : ils passeraient en secours et se déchargeraient' },
    { k: 'Commande de l\'éclairage', v: 'S1 arrêt NC, S2 marche NO, auto-maintien KM1 13-14, détecteur B1 en parallèle du bouton marche' },
    { k: 'SSI', v: 'le déclencheur manuel DM relève du système de sécurité incendie : il n\'est pas raccordé sur ce tableau' },
    { k: 'Avant mise en service', v: 'contrôle visuel · consignation · VAT · continuité PE · isolement 500 V · essai des blocs' },
  ],
  postes: [
    {
      id: 'baes',
      name: 'E3 / E4 · Blocs autonomes d\'éclairage de sécurité',
      need: 'Éclairage d\'évacuation d\'un local d\'ERP de moins de 300 m²',
      options: [
        { key: 'lampY', ref: 'BAES 45 lm · 1 h · SATI', spec: 'évacuation · autotest', ok: true, why: '45 lm et 1 h d\'autonomie sont le minimum réglementaire d\'un bloc d\'évacuation ; le SATI réalise seul les essais périodiques.' },
        { key: 'lampY', ref: 'BAEH 8 lm · 5 h', spec: 'habitation', why: 'Le BAEH est réservé aux locaux à sommeil : il n\'assure pas l\'évacuation d\'un ERP.' },
        { key: 'lampY', ref: 'Bloc d\'ambiance 360 lm', spec: 'anti-panique', half: true, why: 'Obligatoire au-delà de 300 m² ou 100 personnes, mais il complète les blocs d\'évacuation sans les remplacer.' },
      ],
    },
    {
      id: 'tc',
      name: 'TC1 · Télécommande de mise au repos',
      need: 'Éteindre les blocs pendant les périodes de fermeture, sans les décharger',
      options: [
        { key: 'timer', ref: 'Télécommande de mise au repos 1 module', spec: '2 fils · compatible SATI', ok: true, why: 'La mise au repos passe par deux fils dédiés : l\'alimentation des blocs n\'est jamais coupée, les batteries restent chargées.' },
        { key: 'timer', ref: 'Interrupteur sur l\'alimentation des blocs', spec: 'coupure directe', why: 'Couper l\'alimentation fait justement passer les blocs en secours : c\'est ce que la mise au repos doit éviter.' },
        { key: 'timer', ref: 'Horloge coupant le circuit des BAES', spec: 'programme hebdomadaire', why: 'Même erreur, automatisée : les blocs se déchargeraient toutes les nuits.' },
      ],
    },
    {
      id: 'q2',
      name: 'Q2 · Protection du circuit dédié',
      need: 'Protéger le circuit de commande et de télécommande en 1,5 mm² (quelques dizaines de mA)',
      options: [
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · courbe C · 1 pôle', ok: true, why: 'Calibre adapté à un circuit de commande en 1,5 mm² et circuit dédié, indépendant de l\'éclairage.' },
        { key: 'mcb1p', ref: 'iC60N 1P C16', spec: '16 A · courbe C', why: 'Bien trop élevé pour du 1,5 mm² de commande : un défaut ne serait pas éliminé assez vite.' },
        { key: 'mcb2p', ref: 'iC60N 2P C2', spec: '2 A · 2 pôles', half: true, why: 'Fonctionne, mais couper le neutre du circuit de commande n\'apporte rien et consomme un module de plus.' },
      ],
    },
    {
      id: 'id',
      name: 'ID1 · Interrupteur différentiel de tête',
      need: 'Protection des personnes sur un local à alimentations à découpage',
      options: [
        { key: 'rcd2p', ref: 'iID 2P 40 A 30 mA type A', spec: '40 A · 30 mA · type A', ok: true, why: '30 mA pour les circuits terminaux, type A pour les composantes continues des drivers LED et des chargeurs de blocs.' },
        { key: 'rcd2eaton', ref: 'HNC-25/2/003 type AC', spec: '25 A · 30 mA · type AC', half: true, why: 'Sensibilité correcte, mais le type AC ne voit pas les composantes continues et 25 A est juste pour le tableau.' },
        { key: 'rcd2p', ref: 'iID 2P 40 A 300 mA', spec: '40 A · 300 mA', why: '300 mA ne protège pas les personnes : c\'est une protection contre l\'incendie.' },
      ],
    },
    {
      id: 'km',
      name: 'KM1 · Contacteur d\'éclairage normal',
      need: 'Commander deux zones de réglettes LED en 230 V',
      options: [
        { key: 'kontakt', ref: 'Contacteur 25 A AC-7a · bobine 230 V', spec: '25 A AC-7a', ok: true, why: 'Catégorie d\'emploi prévue pour l\'éclairage : les contacts tiennent l\'appel des drivers LED.' },
        { key: 'kontakt', ref: 'Contacteur 16 A AC-1 · bobine 230 V', spec: '16 A · usage résistif', why: 'AC-1 ne couvre pas les pointes d\'appel des drivers : les contacts se soudent.' },
        { key: 'kontakt', ref: 'LC1D09B7 · bobine 24 V', spec: '9 A AC-3 · bobine 24 V', why: 'Bobine 24 V : elle ne collera pas sur une commande 230 V.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q0 · Disjoncteur général 32 A', key: 'mcb2p', rail: 0, x: 52, rep: 'Q0' },
    { id: 'f2', label: 'ID1 · Différentiel 40 A 30 mA type A', key: 'rcd2p', rail: 0, x: 110, rep: 'ID1' },
    { id: 'f1', label: 'Q1 · Éclairage et alimentation des BAES 16 A', key: 'mcb2p', rail: 0, x: 168, rep: 'Q1' },
    { id: 'f3', label: 'Q2 · Commande et télécommande 2 A', key: 'mcb1p', rail: 0, x: 226, rep: 'Q2' },
    { id: 'h3', label: 'H3 · Voyant présence tension', key: 'lampG', rail: 0, x: 258, rep: 'H3' },
    { id: 'km1', label: 'KM1 · Contacteur 25 A AC-7a', key: 'kontakt', rail: 1, x: 52, rep: 'KM1' },
    { id: 'tc', label: 'TC1 · Télécommande de mise au repos', key: 'timer', rail: 1, x: 120, rep: 'TC1' },
    { id: 'h4', label: 'H4 · Voyant blocs au repos', key: 'lampR', rail: 1, x: 180, rep: 'H4' },
    ...bornier(52, [
      ['termred', '1', 'L'], ['termblue', '2', 'N'], ['earth', '3', 'PE'],
      ['termred', '4', 'Z1'], ['termred', '5', 'Z2'], ['termblue', '6', 'N-ECL'],
      ['termred', '7', 'L-BAES'], ['termblue', '8', 'N-BAES'],
      ['termyellow', '9', 'TC+'], ['termyellow', '10', 'TC−'],
      ['termred', '11', 'CMD'], ['termred', '12', 'MRC'], ['termred', '13', 'A1'],
      ['termred', '14', 'H1'], ['termblue', '15', 'N-C'], ['earth', '16', 'PE'],
    ]),
  ],
  annexItems: LOCAL,
  recvItems: RECV,
  liaisons: [
    // ---- arrivée (câblage installateur)
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.N', 'x1_2.b', 'N', 'pre'), L('RES.PE', 'x1_3.b', 'PE', 'pre'),
    // ---- tête de coffret
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.N', 'N'),
    L('q1.2', 'f2.1', 'L1'), L('q1.N2', 'f2.N', 'N'),
    L('f2.2', 'f1.1', 'L1'), L('f2.N2', 'f1.N', 'N'),
    L('f2.2', 'f3.1', 'L1'),
    L('f2.2', 'h3.X1', 'L1'), L('h3.X2', 'f2.N2', 'N'),
    L('x1_3.a', 'x1_16.a', 'PE'),
    // ---- éclairage normal : deux zones commandées par KM1
    L('f1.2', 'km1.1', 'L1'), L('f1.2', 'km1.3', 'L1'),
    L('km1.2', 'x1_4.a', 'L1'), L('km1.4', 'x1_5.a', 'L1'),
    L('f1.N2', 'x1_6.a', 'N'),
    L('x1_4.b', 'E1.X1', 'L1'), L('x1_5.b', 'E2.X1', 'L1'),
    L('x1_6.b', 'E1.X2', 'N'), L('x1_6.b', 'E2.X2', 'N'),
    // ---- BAES : alimentation permanente, en aval de Q1 et EN AMONT de KM1
    L('f1.2', 'x1_7.a', 'L1'), L('f1.N2', 'x1_8.a', 'N'),
    L('x1_7.b', 'E3.X1', 'L1'), L('x1_8.b', 'E3.X2', 'N'),
    L('x1_7.b', 'E4.X1', 'L1'), L('x1_8.b', 'E4.X2', 'N'),
    // ---- télécommande de mise au repos : deux fils dédiés, aucune coupure d'alimentation
    L('f3.2', 'tc.1', 'L1'), L('f2.N2', 'tc.3', 'N'),
    L('tc.2', 'x1_9.a', 'C'), L('tc.4', 'x1_10.a', 'C'),
    L('x1_9.b', 'E3T.X1', 'C'), L('x1_10.b', 'E3T.X2', 'C'),
    L('x1_9.b', 'E4T.X1', 'C'), L('x1_10.b', 'E4T.X2', 'C'),
    L('tc.2', 'h4.X1', 'C'), L('h4.X2', 'tc.4', 'C'),
    // ---- commande de l'éclairage normal : arrêt NC, marche NO, auto-maintien
    L('f3.2', 'x1_11.a', 'L1'), L('x1_11.b', 'S1.21', 'L1', 'door'),
    L('S1.22', 'S2.13', 'L1', 'door'), L('S1.22', 'x1_12.b', 'L1', 'door'),
    L('S2.14', 'x1_13.b', 'L1', 'door'),
    L('x1_12.a', 'km1.13', 'L1'), L('km1.14', 'km1.A1', 'L1'), L('x1_13.a', 'km1.A1', 'L1'),
    L('km1.A2', 'x1_15.a', 'N'), L('f2.N2', 'x1_15.a', 'N'),
    // ---- détecteur de présence, en parallèle du bouton marche
    L('x1_12.b', 'B1.X1', 'L1'), L('B1.X2', 'x1_13.b', 'L1'),
    // ---- signalisation de l'éclairage normal en service
    L('x1_13.a', 'x1_14.a', 'L1'), L('x1_14.b', 'H1.X1', 'L1', 'door'), L('x1_15.b', 'H1.X2', 'N', 'door'),
  ],
  nets: {
    // arrivée
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'N', live: 'always' }, 'x1_2.b': { net: 'N', live: 'always' },
    'x1_3.a': { net: 'PE', live: 'always' }, 'x1_3.b': { net: 'PE', live: 'always' },
    'q1.1': { net: 'L1', live: 'always' }, 'q1.N': { net: 'N', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.N2': { net: 'N', live: 'q1' },
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'N', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'N', live: 'f2' },
    'f1.1': { net: 'L1', live: 'f2' }, 'f1.N': { net: 'N', live: 'f2' },
    'f1.2': { net: 'L1', live: 'f2' }, 'f1.N2': { net: 'N', live: 'f2' },
    'f3.1': { net: 'L1', live: 'f2' }, 'f3.2': { net: 'L1', live: 'ctl' },
    'h3.X1': { net: 'L1', live: 'f2' }, 'h3.X2': { net: 'N', live: 'f2' },
    // contacteur d'éclairage normal
    'km1.1': { net: 'L1', live: 'f2' }, 'km1.3': { net: 'L1', live: 'f2' },
    'km1.2': { net: 'L1', live: 'run' }, 'km1.4': { net: 'L1', live: 'run' },
    'km1.13': { net: 'L1', live: 'ctl' }, 'km1.14': { net: 'L1', live: 'km1' },
    'km1.A1': { net: 'L1', live: 'km1' }, 'km1.A2': { net: 'N', live: 'f2' },
    // zones d'éclairage normal
    'x1_4.a': { net: 'L1', live: 'run' }, 'x1_4.b': { net: 'L1', live: 'run' },
    'x1_5.a': { net: 'L1', live: 'run' }, 'x1_5.b': { net: 'L1', live: 'run' },
    'x1_6.a': { net: 'N', live: 'f2' }, 'x1_6.b': { net: 'N', live: 'f2' },
    'E1.X1': { net: 'L1', live: 'run' }, 'E1.X2': { net: 'N', live: 'f2' },
    'E2.X1': { net: 'L1', live: 'run' }, 'E2.X2': { net: 'N', live: 'f2' },
    // alimentation permanente des blocs autonomes
    'x1_7.a': { net: 'L1', live: 'f2' }, 'x1_7.b': { net: 'L1', live: 'f2' },
    'x1_8.a': { net: 'N', live: 'f2' }, 'x1_8.b': { net: 'N', live: 'f2' },
    'E3.X1': { net: 'L1', live: 'f2' }, 'E3.X2': { net: 'N', live: 'f2' },
    'E4.X1': { net: 'L1', live: 'f2' }, 'E4.X2': { net: 'N', live: 'f2' },
    // télécommande de mise au repos (deux fils dédiés, 230 V)
    'tc.1': { net: 'L1', live: 'ctl' }, 'tc.3': { net: 'N', live: 'f2' },
    'tc.2': { net: 'L1', live: 'ctl' }, 'tc.4': { net: 'N', live: 'f2' },
    'x1_9.a': { net: 'L1', live: 'ctl' }, 'x1_9.b': { net: 'L1', live: 'ctl' },
    'x1_10.a': { net: 'N', live: 'f2' }, 'x1_10.b': { net: 'N', live: 'f2' },
    'E3T.X1': { net: 'L1', live: 'ctl' }, 'E3T.X2': { net: 'N', live: 'f2' },
    'E4T.X1': { net: 'L1', live: 'ctl' }, 'E4T.X2': { net: 'N', live: 'f2' },
    'h4.X1': { net: 'L1', live: 'ctl' }, 'h4.X2': { net: 'N', live: 'f2' },
    // boucle de commande
    'x1_11.a': { net: 'L1', live: 'ctl' }, 'x1_11.b': { net: 'L1', live: 'ctl' },
    'S1.21': { net: 'L1', live: 'ctl' }, 'S1.22': { net: 'L1', live: 'ctl' },
    'S2.13': { net: 'L1', live: 'ctl' }, 'S2.14': { net: 'L1', live: 'km1' },
    'x1_12.a': { net: 'L1', live: 'ctl' }, 'x1_12.b': { net: 'L1', live: 'ctl' },
    'B1.X1': { net: 'L1', live: 'ctl' }, 'B1.X2': { net: 'L1', live: 'km1' },
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
      id: 'amont',
      title: 'Origine de l\'alimentation des blocs',
      how: 'Multimètre en Ω, KM1 au repos : vérifie que X1:7 est bien relié à la sortie de Q1 et NON à la sortie de KM1 ; ouvre KM1 à la main, la continuité Q1 → X1:7 doit subsister.',
      expected: 'continuité maintenue KM1 ouvert : les blocs restent alimentés',
    },
    {
      id: 'tcom',
      title: 'Contrôle de la ligne de télécommande',
      how: 'Multimètre en Ω entre X1:9 et le bornier E3T, puis entre X1:10 et E3T : les deux fils doivent être continus, distincts de l\'alimentation des blocs et repérés TC+ / TC−.',
      expected: '< 2 Ω sur chaque fil, aucun contact avec L-BAES ou N-BAES',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du conducteur de protection', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'x1_16.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement du circuit des BAES sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_7.a', b: 'x1_3.a', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'ctc', title: 'Continuité du fil de télécommande TC+ (X1:9 → E3T)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'x1_9.a', b: 'E3T.X1', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'u230', title: 'Tension d\'arrivée au bornier X1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_1.a', b: 'x1_2.a', min: 225, max: 240, unit: 'V',
    },
    {
      id: 'ubaes', title: 'Tension aux bornes du BAES 1, éclairage normal éteint', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'E3.X1', b: 'E3.X2', min: 225, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'utc', title: 'Tension sur la ligne de télécommande TC+ / TC−', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_9.a', b: 'x1_10.a', min: 225, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'uecl', title: 'Tension aux réglettes de la zone 1, KM1 enclenché', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'E1.X1', b: 'E1.X2', min: 225, max: 240, unit: 'V', when: 'run',
    },
  ],
  faults: [
    { id: 'x2', title: 'Fil X1:13 → KM1 A1 débranché', symptom: 'L\'éclairage normal ne s\'allume plus, ni au bouton marche ni au détecteur, alors que 230 V sont présents sur X1:13. Les BAES, eux, restent éteints et chargés.', fix: 'Reconnecter le retour de commande sur la borne A1 de la bobine de KM1.' },
    { id: 'a2', title: 'Neutre de la bobine (KM1 A2) mal serré', symptom: 'KM1 claque sans tenir : l\'éclairage normal clignote à chaque appui sur le bouton marche.', fix: 'Resserrer A2 sur X1:15 et contrôler la continuité A2 – neutre du différentiel.' },
    { id: 'f3', title: 'Q2 (commande et télécommande) déclenché', symptom: 'Plus aucune commande d\'éclairage et 0 V sur la ligne de télécommande, mais les blocs restent alimentés et chargés par Q1.', fix: 'Chercher le défaut du circuit dédié (télécommande ou bobine en court-circuit), puis réarmer Q2.' },
  ],
  quiz: [
    { q: 'Où prend-on l\'alimentation d\'un BAES ?', options: ['En aval de la protection du circuit d\'éclairage qu\'il secourt, en amont de sa commande', 'Sur le circuit des prises de courant', 'Directement en amont du disjoncteur général'], answer: 0 },
    { q: 'Pourquoi passer par une télécommande de mise au repos plutôt que couper l\'alimentation des blocs ?', options: ['Parce que c\'est moins cher', 'Parce que couper l\'alimentation les fait passer en secours et décharge les batteries', 'Parce que la coupure est interdite par la NF C 15-100 sur tout circuit'], answer: 1 },
    { q: 'Quelle autonomie et quel flux minimaux pour un bloc d\'évacuation ?', options: ['30 min et 45 lm', '1 h et 45 lm', '3 h et 360 lm'], answer: 1 },
  ],
  motor: null,
  station: true,
  hasMotor: false,
};
