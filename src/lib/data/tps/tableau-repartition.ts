/**
 * TP · Tableau de répartition logement (interrupteurs différentiels et divisionnaires).
 * Prévu : implanté et documenté, câblage non encore jouable.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, ROOM_ITEMS, ROOM_RECV } from './common';

export const TP_TABLEAU_REPARTITION: TpDefinition = {
  id: 'tableau-repartition',
  title: 'Tableau de répartition logement',
  level: '2de Bac Pro MELEC',
  family: 'hab',
  scene: 'hab',
  annex: 'room',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service'],
  summary:
    'Deux interrupteurs différentiels 30 mA alimentés par un bornier de répartition, six disjoncteurs divisionnaires, bornier de terre : la structure NF C 15-100 d\'un tableau de logement.',
  situation:
    'Tu équipes le tableau d\'un T3 : l\'arrivée du disjoncteur de branchement alimente un bornier de répartition, puis deux interrupteurs différentiels 30 mA qui protègent chacun trois circuits. Tu répartis les circuits, tu repères chaque départ et tu contrôles la sélectivité.',
  plaque: {
    Branchement: '230 V mono · 45 A', Différentiels: '2 × 40 A 30 mA',
    Circuits: '6 divisionnaires', Section: '1,5 et 2,5 mm²', Régime: 'TT',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE depuis l\'AGCP' },
    { k: 'Répartition', v: 'bornier X0 alimentant les deux différentiels' },
    { k: 'DDR1', v: 'type AC 40 A 30 mA : éclairage, prises, VMC' },
    { k: 'DDR2', v: 'type A 40 A 30 mA : plaque, lave-linge, chauffe-eau' },
    { k: 'Terre', v: 'bornier PE, conducteur principal 6 mm²' },
    { k: 'Repérage', v: 'étiquette de circuit sur chaque disjoncteur' },
  ],
  postes: [
    {
      id: 'ddr',
      name: 'DDR1 / DDR2 · Interrupteurs différentiels',
      need: 'Protection des personnes 30 mA, types adaptés aux circuits protégés',
      options: [
        { key: 'rcd2p', ref: '1 × type AC + 1 × type A · 40 A 30 mA', spec: '30 mA · 40 A', ok: true, why: 'Le type A est obligatoire pour la plaque de cuisson et le lave-linge, le type AC couvre le reste.' },
        { key: 'rcd2p', ref: '2 × type AC 40 A 30 mA', spec: '30 mA · 40 A', why: 'Aucun type A : composantes continues non détectées sur les circuits spécialisés.' },
        { key: 'rcd2p', ref: '2 × type AC 25 A 300 mA', spec: '300 mA', why: '300 mA ne protège pas les personnes.' },
      ],
    },
    {
      id: 'div',
      name: 'Q1 à Q6 · Disjoncteurs divisionnaires',
      need: 'Calibres cohérents avec les sections et le nombre de points',
      options: [
        { key: 'mcb2p', ref: '16 A / 20 A selon circuit', spec: '1,5 mm² → 16 A · 2,5 mm² → 20 A', ok: true, why: 'Calibre lié à la section : 16 A maximum en 1,5 mm², 20 A en 2,5 mm².' },
        { key: 'mcb2p', ref: 'Tous en 20 A', spec: '20 A partout', why: 'Le 1,5 mm² d\'éclairage n\'est plus protégé.' },
        { key: 'mcb2p', ref: 'Tous en 10 A', spec: '10 A partout', half: true, why: 'Sûr, mais les circuits de prises déclencheront en usage normal.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q', label: 'Q · Arrivée', key: 'mcb2p', rail: 0, x: 52, rep: 'Q' },
    { id: 'bus', label: 'X0 · Bornier de répartition', key: 'bus4', rail: 0, x: 120, rep: 'X0' },
    { id: 'dd1', label: 'DDR1 · type AC 30 mA', key: 'rcd2p', rail: 1, x: 52, rep: 'DDR1' },
    { id: 'd1', label: 'Q1 · Éclairage', key: 'mcb2p', rail: 1, x: 112, rep: 'Q1' },
    { id: 'd2', label: 'Q2 · Prises', key: 'mcb2p', rail: 1, x: 170, rep: 'Q2' },
    { id: 'd3', label: 'Q3 · VMC', key: 'mcb2p', rail: 1, x: 228, rep: 'Q3' },
    { id: 'dd2', label: 'DDR2 · type A 30 mA', key: 'rcd2p', rail: 2, x: 52, rep: 'DDR2' },
    { id: 'd4', label: 'Q4 · Plaque', key: 'mcb2p', rail: 2, x: 112, rep: 'Q4' },
    { id: 'd5', label: 'Q5 · Lave-linge', key: 'mcb2p', rail: 2, x: 170, rep: 'Q5' },
    { id: 'd6', label: 'Q6 · Chauffe-eau', key: 'mcb2p', rail: 2, x: 228, rep: 'Q6' },
    { id: 'pe', label: 'PE · Bornier de terre', key: 'earth', rail: 2, x: 300, rep: 'PE' },
  ],
  annexItems: ROOM_ITEMS,
  recvItems: ROOM_RECV,
  liaisons: [],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'n', title: 'Neutres croisés entre les deux différentiels', symptom: 'Un différentiel déclenche dès la mise sous tension d\'un circuit de l\'autre.', fix: 'Rendre chaque neutre à son différentiel d\'origine.' },
    { id: 'type', title: 'Plaque de cuisson protégée par un type AC', symptom: 'Non-conformité NF C 15-100 relevée au contrôle.', fix: 'Basculer le circuit sur le différentiel type A.' },
  ],
  quiz: [
    { q: 'Pourquoi ne peut-on pas mélanger les neutres de deux différentiels ?', options: ['Parce que la somme des courants n\'est plus nulle dans le tore : déclenchement', 'Parce que le neutre est interdit', 'Parce que la tension change'], answer: 0 },
    { q: 'Quel type de différentiel protège le lave-linge et la plaque de cuisson ?', options: ['Type AC', 'Type A', 'Type B'], answer: 1 },
    { q: 'Quel calibre maximal protège un circuit en 1,5 mm² ?', options: ['10 A', '16 A', '20 A'], answer: 1 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
