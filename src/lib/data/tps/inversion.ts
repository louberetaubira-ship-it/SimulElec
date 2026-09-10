/**
 * TP · Inversion de sens de rotation (deux contacteurs verrouillés).
 * Prévu : implanté et documenté, câblage non encore jouable (liaisons à venir).
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, X1, X2 } from './common';

export const TP_INVERSION: TpDefinition = {
  id: 'inversion',
  title: 'Inversion de sens de rotation',
  level: 'Tle Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Deux contacteurs KM1 / KM2 croisant deux phases, verrouillage électrique et mécanique, commande 24 V par T1, trois boutons (arrêt, avant, arrière).',
  situation:
    'Un convoyeur de l\'atelier doit pouvoir avancer et reculer. Tu réalises un départ moteur à deux sens de marche : KM1 pour la marche avant, KM2 pour la marche arrière, avec un croisement de deux phases et un double verrouillage interdisant l\'appel simultané des deux contacteurs.',
  plaque: {
    P: '1,5 kW', U: '400 V Y · 50 Hz', In: '3,3 A', n: '1440 tr/min',
    'cos φ': '0,80', Service: 'S4 · démarrages fréquents',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE sur X1' },
    { k: 'Puissance', v: 'Q1 GV2 · KM1 avant · KM2 arrière (L1 et L3 croisées) · F1 LRD' },
    { k: 'Commande', v: '24 V par T1 400/24 V, F2 au primaire, F3 au secondaire' },
    { k: 'Verrouillage', v: 'électrique par contacts NC croisés + verrouillage mécanique entre KM1 et KM2' },
    { k: 'Boutons', v: 'S1 arrêt NC · S2 avant NO · S3 arrière NO' },
    { k: 'Bornier X2', v: '8 bornes vers la porte' },
  ],
  postes: [
    {
      id: 'km',
      name: 'KM1 / KM2 · Contacteurs',
      need: 'Deux contacteurs identiques, bobines 24 V, aptes au verrouillage mécanique',
      options: [
        { key: 'kontakt', ref: '2 × LC1D09B7 + LAD4CM', spec: '9 A AC-3 · bobines 24 V~ · bloc de verrouillage', ok: true, why: 'Paire identique verrouillable mécaniquement, bobines à la tension de commande.' },
        { key: 'kontakt', ref: '2 × LC1D09P7', spec: 'bobines 230 V~', why: 'Bobines 230 V incompatibles avec la commande 24 V.' },
        { key: 'kontakt', ref: 'LC1D09B7 + LC1D32B7', spec: 'calibres différents', why: 'Deux calibres différents interdisent le bloc de verrouillage mécanique.' },
      ],
    },
    {
      id: 'aux',
      name: 'Contacts auxiliaires de verrouillage',
      need: 'Un contact NC par contacteur pour le verrouillage électrique',
      options: [
        { key: 'kontakt', ref: '2 × LADN11', spec: '1 NO + 1 NC additionnel', ok: true, why: 'Le contact NC de chaque contacteur ouvre la bobine de l\'autre.' },
        { key: 'kontakt', ref: '2 × LADN20', spec: '2 NO', why: 'Aucun contact NC : le verrouillage électrique est impossible.' },
        { key: 'kontakt', ref: 'Aucun bloc additif', spec: 'contacts intégrés seulement', why: 'Le 13-14 intégré sert déjà à l\'auto-maintien.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur moteur', key: 'motorcb', rail: 0, x: 52, rep: 'Q1' },
    { id: 'km1', label: 'KM1 · Marche avant', key: 'kontakt', rail: 0, x: 112, rep: 'KM1' },
    { id: 'km2', label: 'KM2 · Marche arrière', key: 'kontakt', rail: 0, x: 180, rep: 'KM2' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 0, x: 248, rep: 'F1' },
    { id: 'f2', label: 'F2 · Primaire T1', key: 'mcb2p', rail: 1, x: 52, rep: 'F2' },
    { id: 't1', label: 'T1 · Transformateur 400/24 V', key: 'trafo', rail: 1, x: 116, rep: 'T1' },
    { id: 'f3', label: 'F3 · Secondaire 24 V', key: 'mcb1p', rail: 1, x: 204, rep: 'F3' },
    ...X1(52),
    ...X2(238, 8),
  ],
  annexItems: [],
  liaisons: [],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'verr', title: 'Verrouillage électrique absent', symptom: 'Un appui simultané fait coller les deux contacteurs : court-circuit entre phases.', fix: 'Insérer le contact NC de KM2 dans la bobine de KM1 et réciproquement.' },
    { id: 'croise', title: 'Phases non croisées sur KM2', symptom: 'Le moteur tourne dans le même sens sur les deux boutons.', fix: 'Croiser L1 et L3 à l\'entrée de KM2.' },
  ],
  quiz: [
    { q: 'Comment obtient-on l\'inversion du sens de rotation d\'un moteur triphasé ?', options: ['En inversant deux phases', 'En inversant les trois phases', 'En changeant le neutre'], answer: 0 },
    { q: 'Pourquoi doubler le verrouillage électrique par un verrouillage mécanique ?', options: ['Pour aller plus vite', 'Pour interdire le collage simultané même en cas de contact soudé', 'Pour économiser un contact'], answer: 1 },
    { q: 'Où place-t-on le relais thermique F1 ?', options: ['En amont de Q1', 'En aval des deux contacteurs, sur le départ moteur commun', 'Sur la commande 24 V'], answer: 1 },
  ],
  motor: { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 },
  station: true,
  hasMotor: true,
};
