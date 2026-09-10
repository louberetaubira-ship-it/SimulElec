/**
 * TP · Éclairage tertiaire commandé par horloge et détecteur.
 * Prévu : implanté et documenté, câblage non encore jouable.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, LOCAL_ITEMS, LOCAL_RECV, X2 } from './common';

export const TP_ECLAIRAGE_TERTIAIRE: TpDefinition = {
  id: 'eclairage-tertiaire',
  title: 'Éclairage tertiaire · horloge et détecteur',
  level: '1re Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service'],
  summary:
    'Deux réglettes LED commandées par un contacteur KM1, piloté par une horloge programmable KA1 et un détecteur de présence, avec dérogation manuelle.',
  situation:
    'Les circulations d\'un bâtiment tertiaire doivent s\'éclairer automatiquement : l\'horloge autorise l\'éclairage aux heures d\'ouverture, le détecteur de présence commande le contacteur, et un interrupteur de dérogation permet un forçage local. Tu câbles le coffret et les départs vers le local.',
  plaque: {
    Circuit: '230 V mono', Puissance: '2 × 72 W LED', Contacteur: '25 A 2P',
    Horloge: 'hebdomadaire · réserve 100 h', Détecteur: '360° · 10 m',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE sur bornier' },
    { k: 'Protection', v: 'Q1 10 A pour l\'éclairage, F2 2 A pour la commande' },
    { k: 'Horloge', v: 'autorisation horaire en série avec le détecteur' },
    { k: 'Détecteur', v: 'contact NO commandant la bobine de KM1' },
    { k: 'Dérogation', v: 'interrupteur S1 en parallèle du détecteur' },
    { k: 'Départs', v: 'E1 et E2, réglettes LED du local' },
  ],
  postes: [
    {
      id: 'km',
      name: 'KM1 · Contacteur d\'éclairage',
      need: 'Commander des luminaires LED : fort courant d\'appel',
      options: [
        { key: 'kontakt', ref: 'Contacteur 25 A AC-7a bobine 230 V', spec: '25 A · 2P', ok: true, why: 'Calibre adapté au courant d\'appel des drivers LED, bobine à la tension de commande.' },
        { key: 'kontakt', ref: 'Contacteur 16 A AC-1', spec: '16 A · usage résistif', why: 'Catégorie AC-1 : les pointes d\'appel des LED soudent les contacts.' },
        { key: 'kontakt', ref: 'Relais 8 A embrochable', spec: '8 A', why: 'Sous-dimensionné pour un circuit d\'éclairage tertiaire.' },
      ],
    },
    {
      id: 'ih',
      name: 'KA1 · Horloge programmable',
      need: 'Autoriser l\'éclairage sur des plages horaires hebdomadaires',
      options: [
        { key: 'timer', ref: 'IH hebdomadaire · réserve 100 h', spec: 'programme 7 jours', ok: true, why: 'Programmation hebdomadaire distincte semaine / week-end et réserve de marche en cas de coupure.' },
        { key: 'timer', ref: 'IH journalière sans réserve', spec: 'programme 24 h', half: true, why: 'Ne distingue pas le week-end et perd l\'heure à chaque coupure.' },
        { key: 'timer', ref: 'Minuterie d\'escalier', spec: 'temporisation 6 min', why: 'Fonction sans rapport avec une autorisation horaire.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q', label: 'Q1 · Éclairage', key: 'mcb2p', rail: 0, x: 52, rep: 'Q1' },
    { id: 'km', label: 'KM1 · Contacteur', key: 'kontakt', rail: 0, x: 112, rep: 'KM1' },
    { id: 'ih', label: 'KA1 · Horloge', key: 'timer', rail: 0, x: 180, rep: 'KA1' },
    { id: 'f2', label: 'F2 · Commande', key: 'mcb1p', rail: 1, x: 52, rep: 'F2' },
    { id: 'h1', label: 'H1 · Marche éclairage', key: 'lampG', rail: 1, x: 84, rep: 'H1' },
    ...X2(52, 6, 2, { group: 'X1', groupLabel: 'X1 · bornier de départ' }),
  ],
  annexItems: LOCAL_ITEMS,
  recvItems: LOCAL_RECV,
  liaisons: [],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'ordre', title: 'Détecteur câblé en parallèle de l\'horloge', symptom: 'L\'éclairage s\'allume la nuit dès qu\'une présence est détectée.', fix: 'Mettre l\'autorisation horaire en série avec le détecteur.' },
    { id: 'appel', title: 'Contacts de KM1 collés', symptom: 'L\'éclairage reste allumé en permanence.', fix: 'Remplacer le contacteur par un modèle AC-7a adapté à l\'appel des LED.' },
  ],
  quiz: [
    { q: 'Pourquoi choisir un contacteur de catégorie AC-7a pour des LED ?', options: ['Pour supporter le courant d\'appel des drivers', 'Pour réduire la consommation', 'Pour éviter le bruit'], answer: 0 },
    { q: 'Où placer l\'interrupteur de dérogation ?', options: ['En parallèle du détecteur, pour forcer la marche', 'En série avec l\'horloge', 'Sur le circuit de puissance'], answer: 0 },
    { q: 'Quel est le rôle de la réserve de marche de l\'horloge ?', options: ['Alimenter les lampes en secours', 'Conserver l\'heure et le programme pendant une coupure', 'Temporiser l\'extinction'], answer: 1 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
