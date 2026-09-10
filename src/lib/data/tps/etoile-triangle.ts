/**
 * TP · Démarrage étoile-triangle (KM1 ligne, KM2 étoile, KM3 triangle, KA1 temporisé).
 *
 * Puissance : Q1 → KM1 (ligne) → F1 → U1 V1 W1 ; KM3 (triangle) ramène les phases
 * croisées sur W2 U2 V2 ; KM2 (étoile) court-circuite W2 U2 V2 par un pontage 2-4-6.
 * Les six conducteurs du moteur (barrettes de couplage retirées) et le PE sont ramenés
 * sur le bornier X1 (12 bornes).
 *
 * Commande 24 V par T1 (F2 primaire, F3 secondaire) : KA1 est un bloc temporisé LADT2
 * clipsé sur KM1 (contact inverseur temporisé au travail : borne 1 = commun, borne 2 = NF,
 * borne 3 = NO). Le passage étoile → triangle se fait avec temps mort, KM2 et KM3 étant
 * verrouillés par les contacts NF 21-22 de leurs blocs auxiliaires LADN11 (`kx2`, `kx3`).
 *
 * Correspondances avec le moteur de simulation (identifiants imposés) :
 *  q1 = disjoncteur moteur · f2 = primaire · f3 = secondaire · f1 = relais thermique ·
 *  km1 = contacteur de ligne (celui que S2 enclenche). La bascule étoile → triangle est
 *  câblée et contrôlée, mais le simulateur ne restitue que la marche établie.
 */
import type { Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Bornier X1 : 5 bornes d'arrivée + 6 conducteurs moteur + PE, bornes étroites au pas de 18 px. */
function bornierX1(x0: number, rail = 2): Slot[] {
  const rows: [string, string, string][] = [
    ['termred', '1', 'L1'], ['termred', '2', 'L2'], ['termred', '3', 'L3'],
    ['termblue', '4', 'N'], ['earth', '5', 'PE'],
    ['termred', '6', 'U1'], ['termred', '7', 'V1'], ['termred', '8', 'W1'],
    ['termred', '9', 'W2'], ['termred', '10', 'U2'], ['termred', '11', 'V2'],
    ['earth', '12', 'PE'],
  ];
  return rows.map(([key, mark, sub], i) => ({
    id: `x1_${i + 1}`,
    label: `X1:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18 + (i >= 5 ? 6 : 0),
    mark,
    sub,
    group: 'X1',
    ...(i === 0 ? { groupLabel: 'X1 · puissance et six conducteurs moteur' } : {}),
  }));
}

/** Bornier X2 : 6 bornes de commande vers la porte, au pas de 17 px. */
function bornierX2(x0: number, rail = 2): Slot[] {
  const subs = ['S1', 'S1/S2', 'S2', 'H1', 'H2', '0V'];
  return subs.map((sub, i) => ({
    id: `x2_${i + 1}`,
    label: `X2:${i + 1}`,
    key: 'termgrey',
    rail,
    x: x0 + i * 17,
    mark: String(i + 1),
    sub,
    group: 'X2',
    ...(i === 0 ? { groupLabel: 'X2 · bornier commande' } : {}),
  }));
}

export const TP_ETOILE_TRIANGLE: TpDefinition = {
  id: 'etoile-triangle',
  title: 'Démarrage étoile-triangle',
  level: 'Tle Bac Pro MELEC / BTS',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Démarrage à tension réduite : KM1 ligne, KM2 étoile, KM3 triangle, bloc temporisé KA1 réglé à 3 s, six conducteurs jusqu\'à la boîte à bornes du moteur, barrettes de couplage retirées.',
  situation:
    'Un compresseur d\'atelier appelle un courant de démarrage trop élevé pour l\'installation. Tu réalises un démarrage étoile-triangle : le moteur démarre en étoile sous 230 V par enroulement, puis bascule en triangle après temporisation. Les six bornes du moteur sont ramenées sur le bornier X1, barrettes de couplage retirées : le couplage est réalisé par les contacteurs.',
  plaque: {
    P: '4 kW',
    U: '400 V Δ / 690 V Y · 50 Hz',
    In: '8,1 A',
    'Id/In': '6,5',
    n: '1450 tr/min',
    'cos φ': '0,84',
    Pôles: '4',
    Couplage: 'triangle en régime établi',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE, arrivée sur bornier X1' },
    { k: 'Plaque', v: '400 V Δ / 690 V Y : sur réseau 400 V, régime établi en triangle' },
    { k: 'Puissance', v: 'Q1 GV2 · KM1 ligne · KM2 étoile · KM3 triangle · F1 LRD sur le départ, réglé à In = 8,1 A' },
    { k: 'Temporisation', v: 'KA1 · bloc temporisé au travail LADT2 clipsé sur KM1, réglé à 3 s' },
    { k: 'Verrouillage', v: 'contacts NF 21-22 des blocs LADN11 de KM2 et KM3 croisés, plus verrouillage mécanique' },
    { k: 'Moteur', v: 'six conducteurs U1 V1 W1 / W2 U2 V2 + PE sur X1, barrettes retirées' },
    { k: 'Couplage étoile', v: 'KM2 court-circuite W2 U2 V2 (pontage 2-4-6) : 230 V par enroulement' },
    { k: 'Couplage triangle', v: 'KM3 relie U1-W2, V1-U2, W1-V2 : 400 V par enroulement' },
    { k: 'Commande', v: '24 V~ par T1 400/24 V · 63 VA, F2 au primaire, F3 au secondaire' },
    { k: 'Rail 1', v: 'Q1 · KM1 · KM2 · KM3 · F1' },
    { k: 'Rail 2', v: 'F2 · T1 · F3 · KA1 · blocs auxiliaires de KM2 et KM3' },
    { k: 'Rail 3', v: 'X1 (12 bornes) · X2 (6 bornes)' },
    { k: 'Avant mise en service', v: 'consignation · VAT · continuité PE · isolement 500 V · vérification du couplage' },
  ],
  postes: [
    {
      id: 'q1',
      name: 'Q1 · Disjoncteur moteur',
      need: 'Protection magnéto-thermique de la ligne, réglable autour de In = 8,1 A',
      options: [
        { key: 'motorcb', ref: 'GV2ME14', spec: '6 – 10 A', ok: true, why: 'In = 8,1 A se règle au milieu de la plage 6 – 10 A.' },
        { key: 'motorcb', ref: 'GV2ME08', spec: '2,5 – 4 A', why: 'Plage très inférieure à In : déclenchement immédiat.' },
        { key: 'motorcb', ref: 'GV2ME20', spec: '13 – 18 A', why: 'Réglage minimal 13 A > In : aucune protection du moteur.' },
      ],
    },
    {
      id: 'km',
      name: 'KM1 / KM2 / KM3 · Contacteurs',
      need: 'Ligne et triangle au courant de phase (In/√3 ≈ 4,7 A), étoile au courant de couplage (≈ In/3)',
      options: [
        { key: 'kontakt', ref: '2 × LC1D09B7 (ligne, triangle) + LC1D09B7 (étoile)', spec: '9 A AC-3 · bobines 24 V~', ok: true, why: 'En étoile-triangle chaque contacteur ne voit que le courant de phase (8,1 / √3 ≈ 4,7 A) : le calibre 9 A AC-3 convient aux trois.' },
        { key: 'kontakt', ref: '3 × LC1D09P7', spec: '9 A AC-3 · bobines 230 V~', why: 'Bobines 230 V incompatibles avec la commande 24 V du cahier des charges.' },
        { key: 'kontakt', ref: '3 × LC1D32B7', spec: '32 A AC-3 · bobines 24 V~', half: true, why: 'Fonctionne, mais très surdimensionné : encombrement, prix et consommation de bobine inutiles.' },
      ],
    },
    {
      id: 'f1',
      name: 'F1 · Relais thermique',
      need: 'Protéger le moteur en régime établi, relais placé sur la ligne',
      options: [
        { key: 'therm', ref: 'LRD14', spec: '7 – 10 A · classe 10', ok: true, why: 'Placé sur la ligne, le relais voit In = 8,1 A : la plage 7 – 10 A l\'encadre.' },
        { key: 'therm', ref: 'LRD12', spec: '5,5 – 8 A · classe 10', half: true, why: 'Le réglage maximal (8 A) est juste sous In : réglage possible mais sans marge, déclenchements probables.' },
        { key: 'therm', ref: 'LRD08', spec: '2,5 – 4 A · classe 10', why: 'Plage adaptée au courant de phase, pas au courant de ligne : le relais déclencherait dès la mise en marche.' },
      ],
    },
    {
      id: 'ka1',
      name: 'KA1 · Temporisation',
      need: 'Basculer étoile → triangle en fin d\'accélération, avec un temps mort',
      options: [
        { key: 'timer', ref: 'LADT2 · 0,1 – 30 s', spec: 'bloc temporisé au travail, contact inverseur', ok: true, why: 'Temporisé au travail et réglable autour de 3 s ; l\'inverseur ouvre l\'étoile avant de fermer le triangle, ce qui crée le temps mort.' },
        { key: 'timer', ref: 'LADR2 · temporisé au repos', spec: 'action à la coupure', why: 'Mauvais mode : la bascule doit se faire après un délai à l\'enclenchement, pas au relâchement.' },
        { key: 'timer', ref: 'Bloc fixe 30 s', spec: 'non réglable', why: 'Trop long : le moteur resterait en étoile bien après la fin de l\'accélération, sous couple réduit.' },
      ],
    },
    {
      id: 't1',
      name: 'T1 · Transformateur de commande',
      need: 'Alimenter en 24 V deux bobines simultanées (KM1 + KM2 ou KM1 + KM3) et deux voyants',
      options: [
        { key: 'trafo', ref: 'ABL6TS06U', spec: '400/24 V · 63 VA', ok: true, why: 'Primaire 400 V, secondaire 24 V, réserve suffisante pour deux bobines enclenchées en même temps.' },
        { key: 'trafo', ref: 'ABL6TS02U', spec: '400/24 V · 25 VA', why: 'Insuffisant : deux appels de bobine simultanés font chuter la tension et lâcher le contacteur.' },
        { key: 'trafo', ref: 'ABL6TS10U', spec: '230/12 V · 100 VA', why: 'Primaire et secondaire non conformes au cahier des charges.' },
      ],
    },
    {
      id: 'cond',
      name: 'Section des conducteurs de puissance',
      need: 'Six conducteurs jusqu\'au moteur, chacun parcouru par le courant de phase (≈ 4,7 A)',
      options: [
        { key: 'termred', ref: 'Câble 6 G 2,5 mm² + PE', spec: '2,5 mm² · U-1000 R2V', ok: true, why: '2,5 mm² supporte largement 4,7 A et respecte la section minimale de puissance en armoire.' },
        { key: 'termred', ref: 'Câble 6 G 1,5 mm²', spec: '1,5 mm²', why: 'Section inférieure au minimum admis pour un départ moteur de puissance.' },
        { key: 'termred', ref: 'Câble 4 G 2,5 mm²', spec: 'quatre conducteurs', why: 'Quatre conducteurs ne permettent pas de ramener les six bornes du moteur : le démarrage étoile-triangle est impossible.' },
      ],
    },
    {
      id: 'x',
      name: 'X1 / X2 · Borniers',
      need: 'X1 : arrivée + six conducteurs moteur + PE ; X2 : liaisons de porte',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 · 12 bornes X1 + 6 bornes X2', spec: 'repérage 1 à 12 et PE vert-jaune', ok: true, why: 'Toutes les liaisons sortant de l\'armoire sont repérées, y compris les six conducteurs du moteur.' },
        { key: 'termgrey', ref: 'UT 2,5 · 9 bornes X1', spec: 'comme un démarrage direct', why: 'Neuf bornes ne suffisent pas : il faut cinq bornes d\'arrivée, six conducteurs moteur et un PE.' },
        { key: 'termgrey', ref: 'Raccordement direct au moteur', spec: 'sans bornier', why: 'Sans bornier, plus de repérage ni de possibilité de déconnecter le moteur pour l\'isolement.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur moteur', key: 'motorcb', rail: 0, x: 52, rep: 'Q1' },
    { id: 'km1', label: 'KM1 · Ligne', key: 'kontakt', rail: 0, x: 112, rep: 'KM1' },
    { id: 'km2', label: 'KM2 · Étoile', key: 'kontakt', rail: 0, x: 180, rep: 'KM2' },
    { id: 'km3', label: 'KM3 · Triangle', key: 'kontakt', rail: 0, x: 248, rep: 'KM3' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 0, x: 316, rep: 'F1' },
    { id: 'f2', label: 'F2 · Primaire T1', key: 'mcb2p', rail: 1, x: 48, rep: 'F2' },
    { id: 't1', label: 'T1 · Transformateur 400/24 V', key: 'trafo', rail: 1, x: 102, rep: 'T1' },
    { id: 'f3', label: 'F3 · Secondaire 24 V', key: 'mcb1p', rail: 1, x: 178, rep: 'F3' },
    { id: 'ka1', label: 'KA1 · Bloc temporisé LADT2 (1 commun · 2 NF · 3 NO)', key: 'timer', rail: 1, x: 206, rep: 'KA1' },
    { id: 'kx2', label: 'KM2 · Bloc auxiliaire LADN11 (NF 21-22)', key: 'stopstart', rail: 1, x: 260, rep: 'KM2' },
    { id: 'kx3', label: 'KM3 · Bloc auxiliaire LADN11 (NF 21-22)', key: 'stopstart', rail: 1, x: 322, rep: 'KM3' },
    ...bornierX1(48),
    ...bornierX2(282),
  ],
  annexItems: [],
  recvItems: [],
  liaisons: [
    // ---- puissance : arrivée, disjoncteur, contacteur de ligne, relais thermique ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    // ---- KM3 : couplage triangle, U1-W2 / V1-U2 / W1-V2 ----
    L('f1.2', 'km3.1', 'L1'), L('f1.4', 'km3.3', 'L2'), L('f1.6', 'km3.5', 'L3'),
    L('km3.2', 'x1_9.a', 'L1'), L('km3.4', 'x1_10.a', 'L2'), L('km3.6', 'x1_11.a', 'L3'),
    // ---- KM2 : couplage étoile, W2 U2 V2 court-circuités ----
    L('km2.1', 'km3.2', 'L1'), L('km2.3', 'km3.4', 'L2'), L('km2.5', 'km3.6', 'L3'),
    L('km2.2', 'km2.4', 'L1'), L('km2.4', 'km2.6', 'L1'),
    // ---- PE ----
    L('x1_5.a', 'x1_12.a', 'PE'),
    // ---- alimentation de la commande 24 V ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.N', 'L2'),
    L('f2.2', 't1.400', 'L1'), L('f2.N', 't1.0', 'L2'),
    L('t1.24', 'f3.1', 'C'), L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_1.a', 'C'),
    // ---- commande : marche et auto-maintien de KM1 ----
    L('x2_2.a', 'km1.13', 'C'), L('km1.14', 'x2_3.a', 'C'), L('x2_3.a', 'km1.A1', 'C'),
    // ---- temporisation : commun du contact inverseur sur le nœud de marche ----
    L('km1.A1', 'ka1.1', 'C'),
    // ---- étoile : contact NF temporisé → verrouillage par KM3 → bobine KM2 ----
    L('ka1.2', 'kx3.21', 'C'), L('kx3.22', 'km2.A1', 'C'),
    // ---- triangle : contact NO temporisé → verrouillage par KM2 → bobine KM3 ----
    L('ka1.3', 'kx2.21', 'C'), L('kx2.22', 'km3.A1', 'C'),
    // ---- 0 V des trois bobines ----
    L('km1.A2', 'x2_6.a', 'C0'), L('km2.A2', 'km1.A2', 'C0'), L('km3.A2', 'km2.A2', 'C0'),
    // ---- signalisation ----
    L('km1.14', 'x2_4.a', 'C'), L('f1.97', 'f3.2', 'C'), L('f1.98', 'x2_5.a', 'C'),
    // ---- 0 V et mise à la terre du secondaire ----
    L('t1.0V', 'x2_6.a', 'C0'), L('x2_6.a', 'x1_5.a', 'PE'),
    // ---- porte : arrêt, marche, voyants ----
    L('x2_1.b', 'S1.21', 'C', 'door'), L('S1.22', 'S2.13', 'C', 'door'), L('S1.22', 'x2_2.b', 'C', 'door'),
    L('S2.14', 'x2_3.b', 'C', 'door'),
    L('x2_4.b', 'H1.X1', 'C', 'door'), L('x2_5.b', 'H2.X1', 'C', 'door'),
    L('x2_6.b', 'H1.X2', 'C0', 'door'), L('H1.X2', 'H2.X2', 'C0', 'door'),
    // ---- câblage installateur : arrivée réseau et câble moteur 6 conducteurs + PE ----
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.L2', 'x1_2.b', 'L2', 'pre'), L('RES.L3', 'x1_3.b', 'L3', 'pre'),
    L('RES.N', 'x1_4.b', 'N', 'pre'), L('RES.PE', 'x1_5.b', 'PE', 'pre'),
    L('x1_6.b', 'M.U1', 'L1', 'pre'), L('x1_7.b', 'M.V1', 'L2', 'pre'), L('x1_8.b', 'M.W1', 'L3', 'pre'),
    L('x1_9.b', 'M.W2', 'L1', 'pre'), L('x1_10.b', 'M.U2', 'L2', 'pre'), L('x1_11.b', 'M.V2', 'L3', 'pre'),
    L('x1_12.b', 'M.PE', 'PE', 'pre'),
  ],
  nets: {
    // bornier de puissance : arrivée
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'L2', live: 'always' }, 'x1_2.b': { net: 'L2', live: 'always' },
    'x1_3.a': { net: 'L3', live: 'always' }, 'x1_3.b': { net: 'L3', live: 'always' },
    'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
    'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
    // bornier de puissance : six conducteurs moteur
    'x1_6.a': { net: 'U', live: 'run' }, 'x1_6.b': { net: 'U', live: 'run' },
    'x1_7.a': { net: 'V', live: 'run' }, 'x1_7.b': { net: 'V', live: 'run' },
    'x1_8.a': { net: 'W', live: 'run' }, 'x1_8.b': { net: 'W', live: 'run' },
    'x1_9.a': { net: 'M2', live: 'run' }, 'x1_9.b': { net: 'M2', live: 'run' },
    'x1_10.a': { net: 'M2', live: 'run' }, 'x1_10.b': { net: 'M2', live: 'run' },
    'x1_11.a': { net: 'M2', live: 'run' }, 'x1_11.b': { net: 'M2', live: 'run' },
    'x1_12.a': { net: 'PE', live: 'always' }, 'x1_12.b': { net: 'PE', live: 'always' },
    // disjoncteur moteur
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'L2', live: 'always' }, 'q1.5': { net: 'L3', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'L2', live: 'q1' }, 'q1.6': { net: 'L3', live: 'q1' },
    // KM1 · ligne
    'km1.1': { net: 'L1', live: 'q1' }, 'km1.3': { net: 'L2', live: 'q1' }, 'km1.5': { net: 'L3', live: 'q1' },
    'km1.2': { net: 'U', live: 'run' }, 'km1.4': { net: 'V', live: 'run' }, 'km1.6': { net: 'W', live: 'run' },
    'km1.13': { net: 'C', live: 'ctl' }, 'km1.14': { net: 'C', live: 'km1' },
    'km1.A1': { net: 'C', live: 'km1' }, 'km1.A2': { net: 'C0', live: 'always' },
    // KM2 · étoile (point neutre)
    'km2.1': { net: 'M2', live: 'run' }, 'km2.3': { net: 'M2', live: 'run' }, 'km2.5': { net: 'M2', live: 'run' },
    'km2.2': { net: 'M2', live: 'off' }, 'km2.4': { net: 'M2', live: 'off' }, 'km2.6': { net: 'M2', live: 'off' },
    'km2.13': { net: 'C', live: 'off' }, 'km2.14': { net: 'C', live: 'off' },
    'km2.A1': { net: 'C', live: 'off' }, 'km2.A2': { net: 'C0', live: 'always' },
    // KM3 · triangle
    'km3.1': { net: 'U', live: 'run' }, 'km3.3': { net: 'V', live: 'run' }, 'km3.5': { net: 'W', live: 'run' },
    'km3.2': { net: 'M2', live: 'run' }, 'km3.4': { net: 'M2', live: 'run' }, 'km3.6': { net: 'M2', live: 'run' },
    'km3.13': { net: 'C', live: 'km1' }, 'km3.14': { net: 'C', live: 'km1' },
    'km3.A1': { net: 'C', live: 'km1' }, 'km3.A2': { net: 'C0', live: 'always' },
    // KA1 · bloc temporisé (1 commun, 2 NF, 3 NO)
    'ka1.1': { net: 'C', live: 'km1' }, 'ka1.2': { net: 'C', live: 'off' },
    'ka1.3': { net: 'C', live: 'km1' }, 'ka1.4': { net: 'C', live: 'off' },
    // blocs auxiliaires de verrouillage
    'kx2.21': { net: 'C', live: 'km1' }, 'kx2.22': { net: 'C', live: 'km1' },
    'kx2.13': { net: 'C', live: 'off' }, 'kx2.14': { net: 'C', live: 'off' },
    'kx3.21': { net: 'C', live: 'off' }, 'kx3.22': { net: 'C', live: 'off' },
    'kx3.13': { net: 'C', live: 'off' }, 'kx3.14': { net: 'C', live: 'off' },
    // relais thermique
    'f1.1': { net: 'U', live: 'run' }, 'f1.3': { net: 'V', live: 'run' }, 'f1.5': { net: 'W', live: 'run' },
    'f1.2': { net: 'U', live: 'run' }, 'f1.4': { net: 'V', live: 'run' }, 'f1.6': { net: 'W', live: 'run' },
    'f1.95': { net: 'C', live: 'f3' }, 'f1.96': { net: 'C', live: 'ctl' },
    'f1.97': { net: 'C', live: 'f3' }, 'f1.98': { net: 'C', live: 'off' },
    // protections et transformateur de commande
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'L1', live: 'f2' },
    't1.400': { net: 'L1', live: 'f2' }, 't1.0': { net: 'L2', live: 'f2' }, 't1.230': { net: 'C0', live: 'always' },
    't1.24': { net: 'C', live: 'f2' }, 't1.0V': { net: 'C0', live: 'always' }, 't1.48': { net: 'C0', live: 'always' },
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    // bornier de commande
    'x2_1.a': { net: 'C', live: 'ctl' }, 'x2_1.b': { net: 'C', live: 'ctl' },
    'x2_2.a': { net: 'C', live: 'ctl' }, 'x2_2.b': { net: 'C', live: 'ctl' },
    'x2_3.a': { net: 'C', live: 'ctl' }, 'x2_3.b': { net: 'C', live: 'ctl' },
    'x2_4.a': { net: 'C', live: 'km1' }, 'x2_4.b': { net: 'C', live: 'km1' },
    'x2_5.a': { net: 'C', live: 'off' }, 'x2_5.b': { net: 'C', live: 'off' },
    'x2_6.a': { net: 'C0', live: 'always' }, 'x2_6.b': { net: 'C0', live: 'always' },
    // moteur et coffret de porte
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S1.21': { net: 'C', live: 'ctl' }, 'S1.22': { net: 'C', live: 'ctl' },
    'S2.13': { net: 'C', live: 'ctl' }, 'S2.14': { net: 'C', live: 'ctl' },
    'H1.X1': { net: 'C', live: 'km1' }, 'H1.X2': { net: 'C0', live: 'always' },
    'H2.X1': { net: 'C', live: 'off' }, 'H2.X2': { net: 'C0', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'coupl',
      title: 'Vérification du couplage à la boîte à bornes',
      how: 'Boîte à bornes ouverte : contrôle que les trois barrettes de couplage sont retirées et que les six conducteurs repérés U1 V1 W1 / W2 U2 V2 arrivent bien sur les bornes 6 à 11 de X1.',
      expected: 'aucune barrette en place, six conducteurs repérés, PE sur X1:12',
    },
    {
      id: 'etoile',
      title: 'Essai du couplage étoile',
      how: 'Multimètre en Ω : enfonce à la main l\'armature de KM2 et mesure entre X1:9, X1:10 et X1:11. Les trois bornes doivent être court-circuitées deux à deux par le pontage 2-4-6.',
      expected: '< 1 Ω entre X1:9, X1:10 et X1:11, KM2 enfoncé ; OL au repos',
    },
    {
      id: 'verr',
      title: 'Essai du verrouillage étoile / triangle',
      how: 'Multimètre en Ω sur la bobine de KM2 (kx3:22 – KM2 A1) : enfonce l\'armature de KM3, le contact NF 21-22 de son bloc doit ouvrir le circuit. Recommence en croisant.',
      expected: 'circuit ouvert dès que l\'autre contacteur est enfoncé',
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
      id: 'renr', title: 'Résistance de l\'enroulement 1 au moteur (U1 – W2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.W2', min: 3, max: 6, unit: 'Ω',
    },
    {
      id: 'rbornier', title: 'Même enroulement contrôlé au bornier (X1:6 – X1:9)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'x1_6.a', b: 'x1_9.a', min: 3, max: 6, unit: 'Ω',
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
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>f1.1', min: 6, max: 9, unit: 'A', when: 'run',
    },
    {
      id: 'n', title: 'Vitesse de rotation au tachymètre', stage: 'sousTension',
      instrument: 'tach', dial: 'tr/min', min: 1350, max: 1500, unit: 'tr/min', when: 'run',
    },
  ],
  faults: [
    { id: 'f3', title: 'F3 déclenché (court-circuit sur le 24 V)', symptom: 'Aucun voyant, aucune bobine ne colle, 0 V entre X2:1 et X2:6 alors que le secondaire de T1 est bien à 24 V.', fix: 'Chercher le défaut d\'isolement du circuit de commande, puis réarmer F3.' },
    { id: 'a2', title: 'Fil A2 de la bobine KM1 desserré', symptom: 'KM1 vibre et retombe à l\'appui sur S2 : ni l\'étoile ni le triangle ne peuvent s\'établir.', fix: 'Resserrer A2 et refaire la continuité KM1 A2 – X2:6.' },
    { id: 'l2', title: 'Phase L2 coupée entre F1:4 et X1:7', symptom: 'Le moteur ronfle et n\'accélère pas, courant déséquilibré, F1 déclenche après quelques secondes.', fix: 'Refaire la liaison F1:4 → X1:7 (conducteur V1), puis réarmer F1.' },
  ],
  quiz: [
    { q: 'Quelle est la tension appliquée à chaque enroulement pendant la phase étoile, sur un réseau 400 V ?', options: ['400 V', '230 V', '690 V'], answer: 1 },
    { q: 'Dans quel rapport le courant de démarrage est-il réduit par le couplage étoile ?', options: ['Divisé par 3', 'Divisé par √3', 'Inchangé'], answer: 0 },
    { q: 'Pourquoi retirer les barrettes de la boîte à bornes du moteur ?', options: ['Pour pouvoir ramener les six conducteurs et laisser les contacteurs réaliser les deux couplages', 'Pour isoler le moteur du réseau', 'Pour mesurer plus facilement les enroulements'], answer: 0 },
  ],
  motor: { P: 4000, U: 400, In: 8.1, n: 1450, ns: 1500, cosPhi: 0.84 },
  station: true,
  hasMotor: true,
};
