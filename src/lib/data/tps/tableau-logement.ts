/**
 * TP · Tableau de logement complet (AGCP, différentiels, peignes, télérupteur, contacteur J/N).
 * Liaisons complètes : arrivée mono, deux rangées peignées, départs vers la pièce.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, ROOM_ITEMS, X2 } from './common';

export const TP_TABLEAU_LOGEMENT: TpDefinition = {
  id: 'tableau-logement',
  title: 'Tableau logement · prises, éclairage, chauffe-eau',
  level: '2de / 1re Bac Pro MELEC',
  family: 'hab',
  scene: 'hab',
  annex: 'room',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service'],
  summary:
    'AGCP, parafoudre, deux différentiels 40 A (type AC et type A), peignes d\'alimentation, huit divisionnaires, télérupteur, contacteur jour-nuit et sonnerie, bornier de départ X1.',
  situation:
    'Tu équipes le tableau complet d\'un logement neuf : depuis le disjoncteur de branchement, tu poses le parafoudre, deux interrupteurs différentiels de types adaptés, les divisionnaires peignés, le télérupteur d\'éclairage et le contacteur jour-nuit du chauffe-eau, puis tu ramènes chaque départ sur le bornier X1.',
  plaque: {
    Branchement: '230 V mono · 15/45 A · 500 mA sélectif', Différentiels: '40 A 30 mA type AC + type A',
    Circuits: '8 divisionnaires', Régime: 'TT', Parafoudre: 'type 2 · Up 1,5 kV',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: 'AGCP 15/45 A 500 mA sélectif, puis parafoudre F0 entre phase et terre' },
    { k: 'DDR1 · type AC', v: 'Q1 et Q2 prises 16 A · Q3 éclairage 10 A · Q4 sonnerie 20 A' },
    { k: 'DDR2 · type A', v: 'Q5 plaque 32 A · Q6 lave-linge 20 A · Q7 commande 2 A · Q8 VMC 10 A' },
    { k: 'Éclairage', v: 'télérupteur TL1 commandé par le bouton BP de la pièce' },
    { k: 'Chauffe-eau', v: 'contacteur jour-nuit KM1 alimenté par Q6' },
    { k: 'Bornier X1', v: '8 bornes repérées L · N · PE · PC · ECL · CE · VMC · BP, plus deux bornes de terre' },
    { k: 'Repérage', v: 'étiquette de circuit sur chaque appareil, schéma dans la porte' },
  ],
  postes: [
    {
      id: 'agcp',
      name: 'AGCP · Disjoncteur de branchement',
      need: 'Appareil général de commande et de protection, à l\'origine de l\'installation',
      options: [
        { key: 'agcp', ref: 'Disjoncteur de branchement 15/45 A · 500 mA sélectif', spec: 'réglable · différentiel sélectif', ok: true, why: 'Le 500 mA sélectif laisse déclencher d\'abord les 30 mA du tableau : c\'est la sélectivité verticale exigée.' },
        { key: 'agcp', ref: 'Disjoncteur de branchement 30 mA instantané', spec: '30 mA', why: 'Sans sélectivité : le branchement coupe tout le logement au moindre défaut.' },
        { key: 'agcp', ref: 'Interrupteur-sectionneur 63 A', spec: 'sans protection', why: 'Aucune protection différentielle ni de surintensité à l\'origine.' },
      ],
    },
    {
      id: 'ddr',
      name: 'DDR1 / DDR2 · Différentiels 30 mA',
      need: 'Protection des personnes, types adaptés aux circuits',
      options: [
        { key: 'l_protecti_disjoncteur_diff_a', ref: '1 type AC + 1 type A · 40 A 30 mA', spec: '30 mA', ok: true, why: 'Type A obligatoire pour la plaque et le lave-linge ; type AC pour le reste.' },
        { key: 'l_protecti_disjoncteur_diff_ac', ref: '2 × type AC 40 A', spec: '30 mA', why: 'Composantes continues non détectées sur les circuits spécialisés.' },
        { key: 'l_protecti_disjoncteur_diff_a', ref: '2 × type A 25 A', spec: '25 A', half: true, why: 'Types corrects, mais 25 A est insuffisant pour la somme des circuits d\'une rangée.' },
      ],
    },
    {
      id: 'pf',
      name: 'F0 · Parafoudre',
      need: 'Limiter les surtensions atmosphériques (AQ2 ou alimentation aérienne)',
      options: [
        { key: 'l_modulair_parafoudre', ref: 'Parafoudre type 2 · Iimp 20 kA · Up 1,5 kV', spec: 'type 2', ok: true, why: 'Type 2 en tête de tableau, avec un conducteur de terre court et rectiligne.' },
        { key: 'l_modulair_parafoudre', ref: 'Parafoudre type 3 seul', spec: 'type 3', why: 'Le type 3 se place en aval, près des équipements sensibles, jamais seul en tête.' },
        { key: 'l_modulair_parafoudre', ref: 'Aucun parafoudre', spec: '—', why: 'Obligatoire en zone AQ2 ou en alimentation aérienne.' },
      ],
    },
    {
      id: 'tl',
      name: 'TL1 · Télérupteur d\'éclairage',
      need: 'Commande de l\'éclairage depuis plusieurs boutons poussoirs',
      options: [
        { key: 'l_modulair_telerupteur', ref: 'Télérupteur 16 A bobine 230 V', spec: '1 module', ok: true, why: 'Un seul module pour un nombre quelconque de boutons poussoirs.' },
        { key: 'l_modulair_minuterie', ref: 'Minuterie 16 A', spec: 'extinction temporisée', why: 'Éteint toute seule : ce n\'est pas la fonction attendue dans un logement.' },
        { key: 'l_protecti_schneider_clic_contacteur', ref: 'Contacteur 20 A', spec: 'contact maintenu', why: 'Un contacteur suit un contact maintenu, pas des impulsions.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'agcp', label: 'AGCP · Disjoncteur de branchement', key: 'agcp', rail: 0, x: 52, rep: 'AGCP' },
    { id: 'dd1', label: 'DDR1 · type AC 30 mA', key: 'l_protecti_disjoncteur_diff_ac', rail: 0, x: 140, rep: 'DDR1' },
    { id: 'q1', label: 'Q1 · Prises séjour', key: 'l_protecti_disjoncteur_16a', rail: 0, x: 200, rep: 'Q1' },
    { id: 'q2', label: 'Q2 · Prises cuisine', key: 'l_protecti_disjoncteur_16a', rail: 0, x: 232, rep: 'Q2' },
    { id: 'q3', label: 'Q3 · Éclairage', key: 'l_protecti_disjoncteur_10a', rail: 0, x: 264, rep: 'Q3' },
    { id: 'q4', label: 'Q4 · Sonnerie', key: 'l_protecti_disjoncteur_20a', rail: 0, x: 296, rep: 'Q4' },
    { id: 'pf', label: 'F0 · Parafoudre', key: 'l_modulair_parafoudre', rail: 0, x: 340, rep: 'F0' },
    { id: 'dd2', label: 'DDR2 · type A 30 mA', key: 'l_protecti_disjoncteur_diff_a', rail: 1, x: 52, rep: 'DDR2' },
    { id: 'q5', label: 'Q5 · Plaque de cuisson', key: 'l_protecti_disjoncteur_32a', rail: 1, x: 112, rep: 'Q5' },
    { id: 'q6', label: 'Q6 · Chauffe-eau', key: 'l_protecti_disjoncteur_20a', rail: 1, x: 144, rep: 'Q6' },
    { id: 'q7', label: 'Q7 · Commande', key: 'l_protecti_disjoncteur_2a', rail: 1, x: 176, rep: 'Q7' },
    { id: 'km', label: 'KM1 · Contacteur jour-nuit', key: 'l_protecti_schneider_clic_contacteur', rail: 1, x: 208, rep: 'KM1' },
    { id: 'tl', label: 'TL1 · Télérupteur', key: 'l_modulair_telerupteur', rail: 1, x: 244, rep: 'TL1' },
    { id: 'q8', label: 'Q8 · VMC', key: 'l_protecti_disjoncteur_10a', rail: 1, x: 276, rep: 'Q8' },
    { id: 'son', label: 'T2 · Sonnerie', key: 'l_protecti_schneider_clic_sonnette', rail: 1, x: 308, rep: 'T2' },
    ...X2(52, 8, 2, {
      group: 'X1',
      groupLabel: 'X1 · bornier de départ',
      subs: ['L', 'N', 'PE', 'PC', 'ECL', 'CE', 'VMC', 'BP'],
    }),
    { id: 'pe', label: 'PE · Bornier de terre', key: 'earth', rail: 2, x: 220, rep: 'PE', mark: 'PE', sub: 'terre', group: 'X1' },
    { id: 'pe2', label: 'PE · Bornier de terre', key: 'earth', rail: 2, x: 238, rep: 'PE', mark: 'PE', sub: '', group: 'X1' },
  ],
  annexItems: ROOM_ITEMS,
  liaisons: [
    // arrivée branchement
    L('RES.L1', 'agcp.1', 'L1', 'pre'), L('RES.N', 'agcp.3', 'N', 'pre'), L('RES.PE', 'pe.b', 'PE', 'pre'),
    // parafoudre et terre
    L('agcp.2', 'pf.1', 'L1'), L('pf.2', 'pe.a', 'PE'), L('pe.a', 'x2_3.a', 'PE'), L('pe.a', 'pe2.a', 'PE'),
    // alimentation des deux différentiels
    L('agcp.2', 'dd1.1', 'L1'), L('agcp.4', 'dd1.3', 'N'),
    L('agcp.2', 'dd2.1', 'L1'), L('agcp.4', 'dd2.3', 'N'),
    L('dd1.4', 'x2_2.a', 'N'), L('dd2.4', 'x2_2.a', 'N'),
    // rangée 1 : peigne de phase
    L('dd1.2', 'q1.1', 'L1'), L('q1.1', 'q2.1', 'L1'), L('q2.1', 'q3.1', 'L1'), L('q3.1', 'q4.1', 'L1'),
    // départs rangée 1
    L('q1.2', 'x2_4.a', 'L1'), L('x2_4.b', 'PC1.X1', 'L1'), L('PC1.X2', 'x2_2.b', 'N'),
    L('q2.2', 'x2_4.a', 'L1'), L('x2_4.b', 'PC2.X1', 'L1'), L('PC2.X2', 'x2_2.b', 'N'),
    L('q3.2', 'tl.1', 'L1'), L('tl.2', 'x2_5.a', 'L1'),
    L('x2_5.b', 'E1.X1', 'L1'), L('E1.X2', 'x2_2.b', 'N'),
    L('q4.2', 'son.1', 'L1'), L('son.2', 'x2_2.a', 'N'),
    // rangée 2 : peigne de phase
    L('dd2.2', 'q5.1', 'L1'), L('q5.1', 'q6.1', 'L1'), L('q6.1', 'q7.1', 'L1'), L('q7.1', 'q8.1', 'L1'),
    // départs rangée 2
    L('q6.2', 'km.1', 'L1'), L('km.2', 'x2_6.a', 'L1'),
    L('x2_6.b', 'CE.X1', 'L1'), L('CE.X2', 'x2_2.b', 'N'),
    L('q8.2', 'x2_7.a', 'L1'), L('x2_7.b', 'VMC.X1', 'L1'), L('VMC.X2', 'x2_2.b', 'N'),
    // boucle du bouton poussoir de télérupteur
    L('q7.2', 'x2_8.a', 'L1'), L('x2_8.b', 'BP.X1', 'L1'), L('BP.X2', 'x2_5.b', 'L1'),
  ],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'peigne', title: 'Peigne de phase engagé sur les deux rangées', symptom: 'Le différentiel type A déclenche dès qu\'un circuit de la rangée 1 est chargé.', fix: 'Couper le peigne entre les deux différentiels : chaque rangée a le sien.' },
    { id: 'nk', title: 'Neutre du chauffe-eau repris sur l\'autre rangée', symptom: 'DDR2 déclenche à chaque chauffe.', fix: 'Ramener le neutre sur le différentiel qui protège le circuit.' },
    { id: 'pf', title: 'Conducteur de terre du parafoudre trop long', symptom: 'Surtensions non écrêtées, matériel sensible endommagé.', fix: 'Raccourcir le conducteur du parafoudre (< 50 cm) jusqu\'au bornier de terre.' },
  ],
  quiz: [
    { q: 'Pourquoi l\'AGCP est-il différentiel 500 mA sélectif ?', options: ['Pour protéger les personnes', 'Pour laisser déclencher d\'abord les 30 mA du tableau', 'Pour limiter la puissance'], answer: 1 },
    { q: 'Quels circuits imposent un différentiel de type A ?', options: ['L\'éclairage et les prises', 'La plaque de cuisson et le lave-linge', 'La VMC'], answer: 1 },
    { q: 'Que doit-on respecter pour le conducteur de terre du parafoudre ?', options: ['Le plus court et le plus rectiligne possible', 'Une longueur d\'au moins 1 m', 'Une section de 1,5 mm²'], answer: 0 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
