/**
 * TP · Tableau de répartition d'un logement (scène habitat, 230 V mono).
 *
 * Deux rangées sous AGCP : rangée 1 protégée par un différentiel 30 mA type AC
 * (prises, éclairage par télérupteur, commande), rangée 2 protégée par un différentiel
 * 30 mA type A (plaque de cuisson, lave-linge). Tous les départs sont ramenés sur le
 * bornier X1 qui reçoit les gaines ICTA du logement.
 *
 * Correspondances avec le moteur de simulation (identifiants imposés) :
 *  q1 = AGCP · f2 = ID1 différentiel 30 mA type AC · f3 = Q3 disjoncteur 2 A de commande ·
 *  f1 = Q2 disjoncteur 10 A éclairage · km1 = télérupteur TL1. Le bouton vert S2 du bloc
 *  de commande représente le poussoir de l'entrée, le rouge S1 celui du couloir.
 */
import type { AnnexItem, Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Bornier X1 de l'habitat : bornes étroites au pas de 18 px sur le dernier rail. */
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
    ...(i === 0 ? { groupLabel: 'X1 · bornier de raccordement (gaines ICTA)' } : {}),
  }));
}

/** Pièce : deux prises 16 A et le bouton poussoir de l'éclairage. */
const ROOM: AnnexItem[] = [
  { key: 'l_commande_prise_de_courant', rep: 'PC1', name: 'prise 16 A 2P+T · séjour', x: 444, y: 300, w: 44, h: 44 },
  { key: 'l_commande_prise_de_courant', rep: 'PC2', name: 'prise 16 A 2P+T · séjour', x: 444, y: 370, w: 44, h: 44 },
  { key: 'l_commande_bouton_poussoir', rep: 'SB2', name: 'bouton poussoir du séjour', x: 444, y: 448, w: 44, h: 44 },
];

/** Récepteurs du logement, sous la platine. */
const RECV: AnnexItem[] = [
  { key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'point lumineux DCL · séjour', x: 34, y: 34, w: 58, h: 58, recv: true },
  { key: 'l_architec_plaque_de_cuisson', rep: 'PLQ', name: 'plaque de cuisson 32 A', x: 160, y: 30, w: 80, h: 80, recv: true },
  { key: 'l_architec_lave_linge', rep: 'LL', name: 'lave-linge 20 A', x: 320, y: 30, w: 72, h: 80, recv: true },
];

export const TP_TABLEAU_LOGEMENT: TpDefinition = {
  id: 'tableau-logement',
  title: 'Tableau logement · prises, éclairage, plaque, lave-linge',
  level: '2de / 1re Bac Pro MELEC',
  family: 'hab',
  scene: 'hab',
  annex: 'room',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Tableau de répartition complet : AGCP 15/45 A, parafoudre type 2, deux rangées protégées par des différentiels 30 mA (type AC et type A), départs prises 16 A, éclairage 10 A par télérupteur, plaque 32 A et lave-linge 20 A, commande 2 A et bornier X1 de raccordement.',
  situation:
    'Tu équipes le tableau de répartition d\'un logement neuf. Depuis le disjoncteur de branchement, tu poses le parafoudre, les deux interrupteurs différentiels 30 mA, les divisionnaires de chaque rangée, le télérupteur de l\'éclairage, puis tu ramènes chaque départ sur le bornier X1 d\'où partent les gaines ICTA. Tu contrôles, tu consignes, tu mesures et tu mets en service.',
  plaque: {
    Branchement: '230 V mono · 15/45 A · 500 mA sélectif',
    Différentiels: '40 A 30 mA type AC (rangée 1) + type A (rangée 2)',
    Circuits: 'prises 16 A · éclairage 10 A · commande 2 A · plaque 32 A · lave-linge 20 A',
    Sections: '1,5 mm² éclairage · 2,5 mm² prises et lave-linge · 6 mm² plaque',
    Régime: 'TT · parafoudre type 2 · Up 1,5 kV',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE sur X1:1 · X1:2 · X1:3, en aval de l\'AGCP 15/45 A 500 mA sélectif' },
    { k: 'Parafoudre', v: 'F0 type 2 entre la phase en aval de l\'AGCP et le bornier de terre, conducteur le plus court possible (< 50 cm)' },
    { k: 'Rangée 1 · ID1 type AC', v: 'Q1 prises 16 A (2,5 mm², 8 socles maximum) · Q2 éclairage 10 A (1,5 mm², 8 points maximum) · Q3 commande 2 A' },
    { k: 'Rangée 2 · ID2 type A', v: 'Q4 plaque de cuisson 32 A (6 mm²) · Q5 lave-linge 20 A (2,5 mm²)' },
    { k: 'Type A obligatoire', v: 'plaque de cuisson et lave-linge : composantes continues possibles' },
    { k: 'Éclairage', v: 'télérupteur TL1 (bornes 1-3 bobine, 2-4 contact) commandé par trois boutons poussoirs en parallèle' },
    { k: 'Bornier X1', v: '16 bornes étroites repérées L · N · PE puis un couple phase / neutre par départ' },
    { k: 'Repérage', v: 'une étiquette de circuit par appareil, schéma unifilaire glissé dans la porte' },
    { k: 'Avant mise en service', v: 'contrôle visuel · consignation · VAT · continuité PE · isolement 500 V' },
  ],
  postes: [
    {
      id: 'agcp',
      name: 'Q0 · Disjoncteur de branchement (AGCP)',
      need: 'Appareil général de commande et de protection, à l\'origine de l\'installation',
      options: [
        { key: 'agcp', ref: 'Disjoncteur de branchement 15/45 A · 500 mA sélectif', spec: 'réglable · différentiel sélectif', ok: true, why: 'Le 500 mA sélectif laisse déclencher d\'abord les 30 mA du tableau : c\'est la sélectivité verticale exigée.' },
        { key: 'agcp', ref: 'Disjoncteur de branchement 30 mA instantané', spec: '30 mA', why: 'Sans sélectivité : le branchement coupe tout le logement au moindre défaut sur un circuit.' },
        { key: 'agcp', ref: 'Interrupteur-sectionneur 63 A', spec: 'sans protection', why: 'Aucune protection différentielle ni de surintensité à l\'origine de l\'installation.' },
      ],
    },
    {
      id: 'ddr',
      name: 'ID1 / ID2 · Différentiels 30 mA',
      need: 'Protection des personnes, un type adapté aux circuits de chaque rangée',
      options: [
        { key: 'rcd2p', ref: '1 × type AC + 1 × type A · 40 A 30 mA', spec: '30 mA', ok: true, why: 'Type A obligatoire pour la plaque et le lave-linge, type AC admis pour les prises et l\'éclairage.' },
        { key: 'rcd2p', ref: '2 × type AC 40 A 30 mA', spec: '30 mA', why: 'Les composantes continues de la plaque et du lave-linge ne seraient pas détectées.' },
        { key: 'rcd2eaton', ref: '2 × type A 25 A 30 mA', spec: '25 A', half: true, why: 'Types corrects, mais 25 A est insuffisant pour la somme des départs d\'une rangée.' },
      ],
    },
    {
      id: 'pf',
      name: 'F0 · Parafoudre',
      need: 'Limiter les surtensions atmosphériques (zone AQ2 ou alimentation aérienne)',
      options: [
        { key: 'l_modulair_parafoudre', ref: 'Parafoudre type 2 · Iimp 20 kA · Up 1,5 kV', spec: 'type 2', ok: true, why: 'Type 2 en tête de tableau, avec un conducteur de terre court et rectiligne.' },
        { key: 'l_modulair_parafoudre', ref: 'Parafoudre type 3 seul', spec: 'type 3', why: 'Le type 3 se place en aval, près des équipements sensibles, jamais seul en tête.' },
        { key: 'l_modulair_parafoudre', ref: 'Aucun parafoudre', spec: '—', why: 'Obligatoire en zone AQ2 ou en alimentation aérienne basse tension.' },
      ],
    },
    {
      id: 'dep',
      name: 'Q1 / Q4 · Calibres et sections des départs',
      need: 'Associer chaque circuit à sa section et à son calibre (NF C 15-100)',
      options: [
        { key: 'mcb2p', ref: 'Prises 2,5 mm² / 16 A · plaque 6 mm² / 32 A', spec: '8 socles maximum par circuit de prises', ok: true, why: 'Association normalisée : 2,5 mm² protégé à 16 A (20 A admis), plaque de cuisson en 6 mm² protégée à 32 A.' },
        { key: 'mcb2p', ref: 'Prises 1,5 mm² / 16 A · plaque 2,5 mm² / 32 A', spec: 'sections réduites', why: 'Le 1,5 mm² est réservé à l\'éclairage (16 A max) et le 2,5 mm² ne supporte pas 32 A.' },
        { key: 'mcb2p', ref: 'Prises 2,5 mm² / 25 A · plaque 6 mm² / 40 A', spec: 'calibres majorés', why: 'Calibres supérieurs aux valeurs admises : les conducteurs ne sont plus protégés.' },
      ],
    },
    {
      id: 'tl',
      name: 'TL1 · Télérupteur d\'éclairage',
      need: 'Commander le point lumineux du séjour depuis trois boutons poussoirs',
      options: [
        { key: 'timer', ref: 'Télérupteur 16 A · bobine 230 V', spec: '1 module · silencieux', ok: true, why: 'Un seul module pour un nombre quelconque de boutons poussoirs câblés en parallèle.' },
        { key: 'timer', ref: 'Minuterie 16 A', spec: 'extinction temporisée', why: 'Éteint toute seule : ce n\'est pas la fonction attendue dans un séjour.' },
        { key: 'timer', ref: 'Contacteur jour-nuit 20 A', spec: 'contact maintenu', why: 'Un contacteur suit un contact maintenu (heures creuses), pas des impulsions.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q0 · AGCP 15/45 A', key: 'agcp', rail: 0, x: 52, rep: 'Q0' },
    { id: 'pf', label: 'F0 · Parafoudre type 2', key: 'l_modulair_parafoudre', rail: 0, x: 128, rep: 'F0' },
    { id: 'f2', label: 'ID1 · Différentiel 40 A 30 mA type AC', key: 'l_protecti_disjoncteur_diff_ac', rail: 0, x: 160, rep: 'ID1' },
    { id: 'qpc', label: 'Q1 · Prises 16 A', key: 'l_protecti_disjoncteur_16a', rail: 0, x: 220, rep: 'Q1' },
    { id: 'f1', label: 'Q2 · Éclairage 10 A', key: 'l_protecti_disjoncteur_10a', rail: 0, x: 252, rep: 'Q2' },
    { id: 'f3', label: 'Q3 · Commande 2 A', key: 'l_protecti_disjoncteur_2a', rail: 0, x: 284, rep: 'Q3' },
    { id: 'km1', label: 'TL1 · Télérupteur 16 A', key: 'timer', rail: 0, x: 316, rep: 'TL1' },
    { id: 'dd2', label: 'ID2 · Différentiel 40 A 30 mA type A', key: 'l_protecti_disjoncteur_diff_a', rail: 1, x: 52, rep: 'ID2' },
    { id: 'qpl', label: 'Q4 · Plaque de cuisson 32 A', key: 'l_protecti_disjoncteur_32a', rail: 1, x: 112, rep: 'Q4' },
    { id: 'qll', label: 'Q5 · Lave-linge 20 A', key: 'l_protecti_disjoncteur_20a', rail: 1, x: 146, rep: 'Q5' },
    { id: 'h3', label: 'H3 · Voyant présence tension', key: 'lampG', rail: 1, x: 190, rep: 'H3' },
    ...bornier(52, [
      ['termred', '1', 'L'], ['termblue', '2', 'N'], ['earth', '3', 'PE'],
      ['termred', '4', 'PC-L'], ['termblue', '5', 'PC-N'], ['earth', '6', 'PC-PE'],
      ['termred', '7', 'ECL-L'], ['termblue', '8', 'ECL-N'],
      ['termred', '9', 'CMD'], ['termred', '10', 'RET-C'],
      ['termred', '11', 'PL-L'], ['termblue', '12', 'PL-N'],
      ['termred', '13', 'LL-L'], ['termblue', '14', 'LL-N'],
      ['termred', '15', 'H1'], ['termblue', '16', 'N-H'],
    ]),
  ],
  annexItems: ROOM,
  recvItems: RECV,
  liaisons: [
    // ---- arrivée branchement (câblage installateur)
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.N', 'x1_2.b', 'N', 'pre'), L('RES.PE', 'x1_3.b', 'PE', 'pre'),
    // ---- tête d'installation et parafoudre
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'N'),
    L('q1.2', 'pf.1', 'L1'), L('pf.2', 'x1_3.a', 'PE'),
    // ---- alimentation des deux rangées
    L('q1.2', 'f2.3', 'L1'), L('q1.4', 'f2.1', 'N'),
    L('q1.2', 'dd2.3', 'L1'), L('q1.4', 'dd2.1', 'N'),
    // ---- rangée 1 : peigne de phase
    L('f2.4', 'qpc.1', 'L1'), L('qpc.1', 'f1.1', 'L1'), L('f1.1', 'f3.1', 'L1'),
    // ---- départ prises (2,5 mm²)
    L('qpc.2', 'x1_4.a', 'L1'), L('f2.2', 'x1_5.a', 'N'), L('x1_3.a', 'x1_6.a', 'PE'),
    L('x1_4.b', 'PC1.X1', 'L1'), L('x1_5.b', 'PC1.X2', 'N'),
    L('x1_4.b', 'PC2.X1', 'L1'), L('x1_5.b', 'PC2.X2', 'N'),
    // ---- départ éclairage par le télérupteur (1,5 mm²)
    L('f1.2', 'km1.2', 'L1'), L('km1.4', 'x1_7.a', 'L1'), L('x1_7.b', 'E1.X1', 'L1'),
    L('f2.2', 'x1_8.a', 'N'), L('x1_8.b', 'E1.X2', 'N'),
    // ---- commande : trois boutons poussoirs en parallèle sur la bobine
    L('f3.2', 'x1_9.a', 'L1'),
    L('x1_9.b', 'S2.13', 'L1', 'door'), L('S2.14', 'x1_10.b', 'L1', 'door'),
    L('x1_9.b', 'S1.21', 'L1', 'door'), L('S1.22', 'x1_10.b', 'L1', 'door'),
    L('x1_9.b', 'SB2.X1', 'L1'), L('SB2.X2', 'x1_10.b', 'L1'),
    L('x1_10.a', 'km1.1', 'L1'), L('km1.3', 'f2.2', 'N'),
    // ---- rangée 2 : peigne de phase et départs spécialisés
    L('dd2.4', 'qpl.1', 'L1'), L('qpl.1', 'qll.1', 'L1'),
    L('qpl.2', 'x1_11.a', 'L1'), L('dd2.2', 'x1_12.a', 'N'),
    L('x1_11.b', 'PLQ.X1', 'L1'), L('x1_12.b', 'PLQ.X2', 'N'),
    L('qll.2', 'x1_13.a', 'L1'), L('dd2.2', 'x1_14.a', 'N'),
    L('x1_13.b', 'LL.X1', 'L1'), L('x1_14.b', 'LL.X2', 'N'),
    // ---- signalisation
    L('km1.4', 'x1_15.a', 'L1'), L('x1_15.b', 'H1.X1', 'L1', 'door'),
    L('f2.2', 'x1_16.a', 'N'), L('x1_16.b', 'H1.X2', 'N', 'door'),
    L('f2.4', 'h3.X1', 'L1'), L('h3.X2', 'f2.2', 'N'),
  ],
  nets: {
    // amont de l'AGCP
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'N', live: 'always' }, 'x1_2.b': { net: 'N', live: 'always' },
    'x1_3.a': { net: 'PE', live: 'always' }, 'x1_3.b': { net: 'PE', live: 'always' },
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'N', live: 'always' },
    // aval de l'AGCP : parafoudre et têtes de rangée
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'N', live: 'q1' },
    'pf.1': { net: 'L1', live: 'q1' }, 'pf.2': { net: 'PE', live: 'always' },
    'f2.3': { net: 'L1', live: 'q1' }, 'f2.1': { net: 'N', live: 'q1' },
    'dd2.3': { net: 'L1', live: 'q1' }, 'dd2.1': { net: 'N', live: 'q1' },
    // rangée 1 (aval ID1)
    'f2.4': { net: 'L1', live: 'f2' }, 'f2.2': { net: 'N', live: 'f2' },
    'qpc.1': { net: 'L1', live: 'f2' }, 'qpc.2': { net: 'L1', live: 'f2' },
    'f1.1': { net: 'L1', live: 'f2' }, 'f1.2': { net: 'L1', live: 'f2' },
    'f3.1': { net: 'L1', live: 'f2' },
    'h3.X1': { net: 'L1', live: 'f2' }, 'h3.X2': { net: 'N', live: 'f2' },
    // départ prises
    'x1_4.a': { net: 'L1', live: 'f2' }, 'x1_4.b': { net: 'L1', live: 'f2' },
    'x1_5.a': { net: 'N', live: 'f2' }, 'x1_5.b': { net: 'N', live: 'f2' },
    'PC1.X1': { net: 'L1', live: 'f2' }, 'PC1.X2': { net: 'N', live: 'f2' },
    'PC2.X1': { net: 'L1', live: 'f2' }, 'PC2.X2': { net: 'N', live: 'f2' },
    'x1_6.a': { net: 'PE', live: 'always' }, 'x1_6.b': { net: 'PE', live: 'always' },
    // circuit de commande du télérupteur
    'f3.2': { net: 'L1', live: 'ctl' },
    'x1_9.a': { net: 'L1', live: 'ctl' }, 'x1_9.b': { net: 'L1', live: 'ctl' },
    'S1.21': { net: 'L1', live: 'ctl' }, 'S2.13': { net: 'L1', live: 'ctl' },
    'SB2.X1': { net: 'L1', live: 'ctl' },
    'S1.22': { net: 'L1', live: 'off' }, 'S2.14': { net: 'L1', live: 'off' },
    'SB2.X2': { net: 'L1', live: 'off' },
    'x1_10.a': { net: 'L1', live: 'off' }, 'x1_10.b': { net: 'L1', live: 'off' },
    'km1.1': { net: 'L1', live: 'off' }, 'km1.3': { net: 'N', live: 'f2' },
    // éclairage : entrée et sortie du contact du télérupteur
    'km1.2': { net: 'L1', live: 'f2' }, 'km1.4': { net: 'L1', live: 'run' },
    'x1_7.a': { net: 'L1', live: 'run' }, 'x1_7.b': { net: 'L1', live: 'run' },
    'E1.X1': { net: 'L1', live: 'run' }, 'E1.X2': { net: 'N', live: 'f2' },
    'x1_8.a': { net: 'N', live: 'f2' }, 'x1_8.b': { net: 'N', live: 'f2' },
    // rangée 2 (aval ID2)
    'dd2.4': { net: 'L1', live: 'q1' }, 'dd2.2': { net: 'N', live: 'q1' },
    'qpl.1': { net: 'L1', live: 'q1' }, 'qpl.2': { net: 'L1', live: 'q1' },
    'qll.1': { net: 'L1', live: 'q1' }, 'qll.2': { net: 'L1', live: 'q1' },
    'x1_11.a': { net: 'L1', live: 'q1' }, 'x1_11.b': { net: 'L1', live: 'q1' },
    'x1_12.a': { net: 'N', live: 'q1' }, 'x1_12.b': { net: 'N', live: 'q1' },
    'PLQ.X1': { net: 'L1', live: 'q1' }, 'PLQ.X2': { net: 'N', live: 'q1' },
    'x1_13.a': { net: 'L1', live: 'q1' }, 'x1_13.b': { net: 'L1', live: 'q1' },
    'x1_14.a': { net: 'N', live: 'q1' }, 'x1_14.b': { net: 'N', live: 'q1' },
    'LL.X1': { net: 'L1', live: 'q1' }, 'LL.X2': { net: 'N', live: 'q1' },
    // signalisation
    'x1_15.a': { net: 'L1', live: 'run' }, 'x1_15.b': { net: 'L1', live: 'run' },
    'H1.X1': { net: 'L1', live: 'run' }, 'H1.X2': { net: 'N', live: 'f2' },
    'x1_16.a': { net: 'N', live: 'f2' }, 'x1_16.b': { net: 'N', live: 'f2' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'peigne',
      title: 'Contrôle des peignes et de la séparation des rangées',
      how: 'Vérifie que le peigne de phase de la rangée 1 s\'arrête au dernier divisionnaire de la rangée et qu\'aucun pontage ne relie les deux différentiels en aval.',
      expected: 'aucune continuité entre les sorties des deux différentiels',
    },
    {
      id: 'etiq',
      title: 'Repérage des circuits',
      how: 'Contrôle l\'étiquette de chaque disjoncteur, le repérage des bornes de X1 et la présence du schéma dans la porte du tableau.',
      expected: 'tous les départs identifiés',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du conducteur de protection des prises', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'x1_6.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement du circuit prises sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_4.a', b: 'x1_3.a', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'cont', title: 'Continuité de la phase du départ prises jusqu\'à PC1', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'x1_4.a', b: 'PC1.X1', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'u230', title: 'Tension d\'arrivée au bornier X1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_1.a', b: 'x1_2.a', min: 225, max: 240, unit: 'V',
    },
    {
      id: 'upc', title: 'Tension à la prise PC1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'PC1.X1', b: 'PC1.X2', min: 225, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'upl', title: 'Tension au départ plaque de cuisson (rangée 2)', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_11.a', b: 'x1_12.a', min: 225, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'uecl', title: 'Tension au point lumineux, télérupteur enclenché', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'E1.X1', b: 'E1.X2', min: 225, max: 240, unit: 'V', when: 'run',
    },
  ],
  faults: [
    { id: 'x2', title: 'Fil X1:10 → TL1 borne 1 débranché', symptom: 'Aucun bouton poussoir n\'allume l\'éclairage, pourtant la commande est sous tension en X1:9.', fix: 'Reconnecter le retour des poussoirs sur la borne 1 (bobine) du télérupteur.' },
    { id: 'a2', title: 'Neutre de la bobine du télérupteur mal serré', symptom: 'Le télérupteur claque sans basculer, le point lumineux clignote.', fix: 'Resserrer le neutre de la bobine sur la sortie neutre de ID1.' },
    { id: 'f3', title: 'Q3 (commande 2 A) déclenché', symptom: 'Les poussoirs sont sans effet et aucune tension n\'est mesurée en X1:9.', fix: 'Rechercher le défaut du circuit de commande, puis réarmer Q3.' },
  ],
  quiz: [
    { q: 'Pourquoi l\'AGCP est-il différentiel 500 mA sélectif ?', options: ['Pour protéger les personnes', 'Pour laisser déclencher d\'abord les 30 mA du tableau', 'Pour limiter la puissance souscrite'], answer: 1 },
    { q: 'Quels circuits imposent un différentiel de type A ?', options: ['L\'éclairage et les prises', 'La plaque de cuisson et le lave-linge', 'La commande du télérupteur'], answer: 1 },
    { q: 'Quelle section et quel calibre pour un circuit de prises 16 A ?', options: ['1,5 mm² et 16 A', '2,5 mm² et 16 ou 20 A', '6 mm² et 32 A'], answer: 1 },
  ],
  motor: null,
  station: true,
  hasMotor: false,
};
