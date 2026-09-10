/**
 * TP · Démarrage étoile-triangle (KM1 ligne, KM2 étoile, KM3 triangle, KA1 temporisé).
 * Prévu : implanté et documenté, câblage non encore jouable.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, X1, X2 } from './common';

export const TP_ETOILE_TRIANGLE: TpDefinition = {
  id: 'etoile-triangle',
  title: 'Démarrage étoile-triangle',
  level: 'Tle Bac Pro MELEC / BTS',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Démarrage à tension réduite : KM1 ligne, KM2 étoile, KM3 triangle, temporisation KA1, six conducteurs jusqu\'à la boîte à bornes du moteur.',
  situation:
    'Un compresseur d\'atelier appelle un courant de démarrage trop élevé pour l\'installation. Tu réalises un démarrage étoile-triangle : le moteur démarre en étoile sous 230 V par enroulement, puis bascule en triangle après temporisation. Les six bornes du moteur sont ramenées sur le bornier X1, barrettes retirées.',
  plaque: {
    P: '4 kW', U: '400 V Δ / 690 V Y · 50 Hz', In: '8,1 A', 'Id/In': '6,5',
    n: '1450 tr/min', 'cos φ': '0,84', Couplage: 'triangle en régime',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE sur X1' },
    { k: 'Puissance', v: 'Q1 · KM1 ligne · KM2 étoile · KM3 triangle · F1 sur le départ' },
    { k: 'Temporisation', v: 'KA1 réglée à 3 s (fin d\'accélération)' },
    { k: 'Verrouillage', v: 'KM2 et KM3 verrouillés électriquement et mécaniquement' },
    { k: 'Moteur', v: 'six conducteurs U1 V1 W1 / U2 V2 W2, barrettes retirées' },
    { k: 'Commande', v: '24 V par T1, F2 primaire, F3 secondaire' },
  ],
  postes: [
    {
      id: 'km',
      name: 'KM1 / KM2 / KM3 · Contacteurs',
      need: 'Ligne et triangle au courant de phase, étoile réduit (≈ In/3)',
      options: [
        { key: 'kontakt', ref: 'LC1D12B7 ×2 + LC1D09B7', spec: 'ligne et triangle 12 A, étoile 9 A · 24 V~', ok: true, why: 'Le contacteur étoile ne voit que le courant de couplage, il peut être plus petit.' },
        { key: 'kontakt', ref: '3 × LC1D09B7', spec: 'tous en 9 A', why: '9 A < 8,1 A × √3 : ligne et triangle sont sous-dimensionnés en régime établi.' },
        { key: 'kontakt', ref: '3 × LC1D32B7', spec: 'tous en 32 A', half: true, why: 'Fonctionne mais coûteux et encombrant.' },
      ],
    },
    {
      id: 'ka1',
      name: 'KA1 · Temporisation',
      need: 'Basculer étoile → triangle en fin d\'accélération, avec un temps mort',
      options: [
        { key: 'timer', ref: 'LADT2 · 0,1 – 30 s', spec: 'temporisé au travail, réglable', ok: true, why: 'Réglable autour de 3 s, avec temps mort entre l\'ouverture de KM2 et la fermeture de KM3.' },
        { key: 'timer', ref: 'Temporisé au repos', spec: 'action à la coupure', why: 'Mauvais mode : la bascule doit se faire après un délai à l\'enclenchement.' },
        { key: 'timer', ref: 'Fixe 30 s', spec: 'non réglable', why: 'Trop long : le moteur reste en étoile bien après la fin de l\'accélération.' },
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
    { id: 'f2', label: 'F2 · Primaire T1', key: 'mcb2p', rail: 1, x: 52, rep: 'F2' },
    { id: 't1', label: 'T1 · Transformateur 400/24 V', key: 'trafo', rail: 1, x: 116, rep: 'T1' },
    { id: 'f3', label: 'F3 · Secondaire 24 V', key: 'mcb1p', rail: 1, x: 204, rep: 'F3' },
    { id: 'ka1', label: 'KA1 · Temporisation', key: 'timer', rail: 1, x: 244, rep: 'KA1' },
    ...X1(52),
    ...X2(238, 7),
  ],
  annexItems: [],
  recvItems: [],
  liaisons: [],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'court', title: 'KM2 et KM3 collés ensemble', symptom: 'Déclenchement instantané de Q1 : court-circuit entre phases.', fix: 'Rétablir le verrouillage et vérifier le temps mort de KA1.' },
    { id: 'tempo', title: 'Temporisation trop courte', symptom: 'Fort appel de courant à la bascule, le moteur « broute ».', fix: 'Allonger KA1 jusqu\'à la fin de l\'accélération (≈ 3 s).' },
  ],
  quiz: [
    { q: 'Quelle est la tension appliquée à chaque enroulement pendant la phase étoile ?', options: ['400 V', '230 V', '690 V'], answer: 1 },
    { q: 'Dans quel rapport le courant de démarrage est-il réduit en étoile ?', options: ['Divisé par 3', 'Divisé par √3', 'Inchangé'], answer: 0 },
    { q: 'Pourquoi retirer les barrettes de la boîte à bornes ?', options: ['Pour pouvoir amener les six conducteurs et réaliser les deux couplages', 'Pour isoler le moteur', 'Pour mesurer les enroulements'], answer: 0 },
  ],
  motor: { P: 4000, U: 400, In: 8.1, n: 1450, ns: 1500, cosPhi: 0.84 },
  station: true,
  hasMotor: true,
};
