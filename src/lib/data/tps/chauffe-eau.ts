/**
 * TP · Chauffe-eau heures pleines / heures creuses (contacteur jour-nuit).
 * Prévu : implanté et documenté, câblage non encore jouable.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, ROOM_ITEMS, X2 } from './common';

export const TP_CHAUFFE_EAU: TpDefinition = {
  id: 'chauffe-eau',
  title: 'Chauffe-eau HP / HC · contacteur jour-nuit',
  level: '2de Bac Pro MELEC',
  family: 'hab',
  scene: 'hab',
  annex: 'room',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service'],
  summary:
    'Circuit spécialisé chauffe-eau 2000 W : Q1 20 A, contacteur jour-nuit KM1 piloté par le contact du compteur, Q2 2 A pour la commande, télécommande marche forcée / auto / arrêt.',
  situation:
    'Le chauffe-eau du logement doit chauffer pendant les heures creuses. Tu câbles le circuit spécialisé : le contact heures creuses du compteur pilote la bobine du contacteur jour-nuit, protégée par Q2, et le contacteur alimente la résistance. Une télécommande à trois positions permet la marche forcée.',
  plaque: {
    Récepteur: 'chauffe-eau 200 L · 2000 W', U: '230 V mono', I: '8,7 A',
    Circuit: '2,5 mm² · Q1 20 A', Commande: 'contact HC du compteur',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE, différentiel type A en amont' },
    { k: 'Puissance', v: 'Q1 20 A courbe C, câble 2,5 mm² jusqu\'au chauffe-eau' },
    { k: 'Commande', v: 'Q2 2 A protégeant la bobine et le contact HC du compteur' },
    { k: 'Contacteur', v: 'KM1 jour-nuit 20 A, contact 1-2' },
    { k: 'Télécommande', v: 'position auto (HC), marche forcée, arrêt' },
    { k: 'Terre', v: 'PE obligatoire jusqu\'à la carcasse du chauffe-eau' },
  ],
  postes: [
    {
      id: 'km',
      name: 'KM1 · Contacteur jour-nuit',
      need: 'Alimenter une résistance de 2000 W pendant les heures creuses',
      options: [
        { key: 'kontakt', ref: 'Contacteur J/N 20 A 1NO · bobine 230 V', spec: '20 A · 1 module', ok: true, why: '20 A ≥ 8,7 A, contact NO piloté par le signal heures creuses du compteur.' },
        { key: 'kontakt', ref: 'Contacteur 16 A 1NO', spec: '16 A', half: true, why: 'Passe en calibre, mais sans marge pour une résistance en service quotidien.' },
        { key: 'kontakt', ref: 'Télérupteur 16 A', spec: 'bistable à impulsion', why: 'Un télérupteur bascule sur impulsion : il ne suit pas un contact maintenu.' },
      ],
    },
    {
      id: 'q',
      name: 'Q1 · Protection du circuit',
      need: 'Protéger un circuit spécialisé 2,5 mm² pour 8,7 A',
      options: [
        { key: 'mcb2p', ref: 'iC60N 1P+N C20', spec: '20 A · 2,5 mm²', ok: true, why: 'Calibre normalisé du circuit chauffe-eau, cohérent avec la section 2,5 mm².' },
        { key: 'mcb2p', ref: 'iC60N 1P+N C32', spec: '32 A', why: 'Le 2,5 mm² n\'est plus protégé.' },
        { key: 'mcb2p', ref: 'iC60N 1P+N C10', spec: '10 A', why: 'Déclenchera à chaque chauffe : 8,7 A en continu sur un calibre 10 A.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q', label: 'Q1 · Chauffe-eau', key: 'mcb2p', rail: 0, x: 52, rep: 'Q1' },
    { id: 'q2', label: 'Q2 · Commande', key: 'mcb1p', rail: 0, x: 112, rep: 'Q2' },
    { id: 'km', label: 'KM1 · Contacteur J/N', key: 'kontakt', rail: 0, x: 146, rep: 'KM1' },
    { id: 'x', label: 'X1 · Borne de passage', key: 'termgrey', rail: 1, x: 52, rep: 'X1' },
    ...X2(52, 5, 2, { group: 'X1', groupLabel: 'X1 · bornier de départ' }),
  ],
  annexItems: ROOM_ITEMS,
  liaisons: [],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'hc', title: 'Contact HC câblé sur la puissance', symptom: 'Le compteur disjoncte ou le contact du compteur grille.', fix: 'Le contact HC ne pilote que la bobine, protégée par Q2.' },
    { id: 'pe', title: 'PE non raccordé au chauffe-eau', symptom: 'Le différentiel ne déclenche pas en cas de défaut : danger.', fix: 'Raccorder le PE à la borne de terre de la cuve.' },
  ],
  quiz: [
    { q: 'Que pilote le contact heures creuses du compteur ?', options: ['La résistance directement', 'La bobine du contacteur jour-nuit', 'Le différentiel'], answer: 1 },
    { q: 'Quelle est la position « marche forcée » de la télécommande ?', options: ['Elle court-circuite le contact HC pour chauffer immédiatement', 'Elle coupe le circuit', 'Elle inverse le contacteur'], answer: 0 },
    { q: 'Quelle section pour un circuit chauffe-eau de 2000 W ?', options: ['1,5 mm²', '2,5 mm²', '6 mm²'], answer: 1 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
