/**
 * TP · Pompe de relevage à flotteurs (marche auto / manu).
 * Prévu : implanté et documenté, câblage non encore jouable.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, X1, X2 } from './common';

export const TP_POMPE_RELEVAGE: TpDefinition = {
  id: 'pompe-relevage',
  title: 'Pompe de relevage à flotteurs',
  level: '1re Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Départ moteur avec commutateur auto / manu, flotteur haut de démarrage, flotteur bas d\'arrêt, relais KA1 de mémorisation et alarme de niveau très haut.',
  situation:
    'La fosse de relevage des eaux usées du lycée doit être vidée automatiquement. Tu câbles le départ de la pompe : en position auto, le flotteur haut démarre la pompe, le flotteur bas l\'arrête ; en position manu, la pompe tourne tant que le bouton est maintenu. Un défaut thermique ou un niveau très haut déclenche l\'alarme.',
  plaque: {
    P: '1,1 kW', U: '400 V Y · 50 Hz', In: '2,6 A', n: '2850 tr/min',
    'cos φ': '0,82', Protection: 'IP 68 · immergée',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE sur X1' },
    { k: 'Puissance', v: 'Q1 GV2 réglé à 2,6 A · KM1 · F1' },
    { k: 'Commande', v: '24 V par T1, F2 primaire, F3 secondaire' },
    { k: 'Auto', v: 'flotteur haut → marche, flotteur bas → arrêt, mémorisation par KA1' },
    { k: 'Manu', v: 'marche par impulsion maintenue, sans mémorisation' },
    { k: 'Alarme', v: 'flotteur de niveau très haut et défaut thermique → voyant H2' },
    { k: 'Bornier X2', v: '7 bornes vers la porte et les flotteurs' },
  ],
  postes: [
    {
      id: 'q1',
      name: 'Q1 · Disjoncteur moteur',
      need: 'Protection réglable autour de In = 2,6 A',
      options: [
        { key: 'motorcb', ref: 'GV2ME08', spec: '2,5 – 4 A', ok: true, why: 'In = 2,6 A se règle en début de plage.' },
        { key: 'motorcb', ref: 'GV2ME06', spec: '1 – 1,6 A', why: 'Plage trop basse : déclenchement au démarrage.' },
        { key: 'motorcb', ref: 'GV2ME10', spec: '4 – 6,3 A', why: 'Réglage minimal supérieur à In : pas de protection.' },
      ],
    },
    {
      id: 'ka1',
      name: 'KA1 · Relais de mémorisation',
      need: 'Mémoriser la demande du flotteur haut jusqu\'à l\'ouverture du flotteur bas',
      options: [
        { key: 'timer', ref: 'RXM2 · 24 V + embase', spec: '2 RT · bobine 24 V', ok: true, why: 'Deux contacts inverseurs : un pour l\'auto-maintien, un pour la signalisation.' },
        { key: 'timer', ref: 'RXM2 · 230 V', spec: 'bobine 230 V', why: 'Bobine hors tension de commande (24 V).' },
        { key: 'timer', ref: 'Relais 1 contact NO', spec: '1 NO seulement', half: true, why: 'Suffit pour l\'auto-maintien mais ne laisse rien pour la signalisation.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur moteur', key: 'motorcb', rail: 0, x: 52, rep: 'Q1' },
    { id: 'km1', label: 'KM1 · Contacteur pompe', key: 'kontakt', rail: 0, x: 112, rep: 'KM1' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 0, x: 180, rep: 'F1' },
    { id: 'f2', label: 'F2 · Primaire T1', key: 'mcb2p', rail: 1, x: 52, rep: 'F2' },
    { id: 't1', label: 'T1 · Transformateur 400/24 V', key: 'trafo', rail: 1, x: 116, rep: 'T1' },
    { id: 'f3', label: 'F3 · Secondaire 24 V', key: 'mcb1p', rail: 1, x: 204, rep: 'F3' },
    { id: 'ka1', label: 'KA1 · Relais de mémorisation', key: 'timer', rail: 1, x: 244, rep: 'KA1' },
    ...X1(52),
    ...X2(238, 7),
  ],
  annexItems: [],
  liaisons: [],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'flot', title: 'Flotteurs inversés', symptom: 'La pompe démarre à vide et s\'arrête quand la fosse est pleine.', fix: 'Permuter les entrées des flotteurs haut et bas sur X2.' },
    { id: 'mem', title: 'Auto-maintien de KA1 absent', symptom: 'La pompe s\'arrête dès que le flotteur haut retombe : cycles courts et échauffement.', fix: 'Câbler le contact de maintien de KA1 en parallèle du flotteur haut.' },
  ],
  quiz: [
    { q: 'Pourquoi mémoriser la demande du flotteur haut ?', options: ['Pour vider la fosse jusqu\'au niveau bas au lieu de battre autour du niveau haut', 'Pour économiser un flotteur', 'Pour protéger le moteur'], answer: 0 },
    { q: 'En position manu, quel est le risque principal ?', options: ['Faire tourner la pompe à sec', 'Déclencher le différentiel', 'Inverser le sens de rotation'], answer: 0 },
    { q: 'Quel appareil protège la pompe contre les surcharges prolongées ?', options: ['Le flotteur bas', 'Le relais thermique F1', 'Le transformateur T1'], answer: 1 },
  ],
  motor: { P: 1100, U: 400, In: 2.6, n: 2850, ns: 3000, cosPhi: 0.82 },
  station: true,
  hasMotor: true,
};
