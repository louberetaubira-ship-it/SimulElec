/**
 * TP · Éclairage tertiaire avec détecteur, BAES et télécommande de mise au repos.
 * Prévu : implanté et documenté, câblage non encore jouable.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, LOCAL_ITEMS, X2 } from './common';

export const TP_ECLAIRAGE_BAES: TpDefinition = {
  id: 'eclairage-baes',
  title: 'Éclairage tertiaire · détecteur, BAES et horloge',
  level: '1re Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Éclairage normal commandé par horloge et détecteur, blocs autonomes BAES alimentés en permanence en aval de la protection d\'éclairage, télécommande de mise au repos TC1.',
  situation:
    'Le local technique d\'un ERP doit disposer d\'un éclairage de sécurité. Tu câbles l\'éclairage normal (horloge, détecteur, contacteur) et les blocs autonomes BAES : leur alimentation est prise en aval de la protection du circuit d\'éclairage qu\'ils éclairent, et une télécommande permet leur mise au repos lors des coupures volontaires.',
  plaque: {
    Établissement: 'ERP · local technique', BAES: '45 lm · 1 h · SATI',
    Éclairage: '2 × 72 W LED', Commande: 'horloge + détecteur', Télécommande: 'mise au repos TC1',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE sur bornier' },
    { k: 'Éclairage normal', v: 'Q1 10 A · KM1 · horloge KA1 · détecteur B1' },
    { k: 'BAES', v: 'alimentés en aval de Q1, en amont de KM1, en permanence' },
    { k: 'Télécommande', v: 'TC1 protégée par Q2, deux fils vers les blocs' },
    { k: 'Déclencheur manuel', v: 'DM signalé, non coupé par la télécommande' },
    { k: 'Contrôle', v: 'essai SATI mensuel, autonomie 1 h' },
  ],
  postes: [
    {
      id: 'baes',
      name: 'E3 · Blocs autonomes',
      need: 'Éclairage d\'évacuation d\'un local technique de moins de 300 m²',
      options: [
        { key: 'l_alarmes_baes', ref: 'BAES 45 lm · 1 h · SATI', spec: 'évacuation · autotest', ok: true, why: '45 lm et 1 h d\'autonomie sont le minimum réglementaire pour l\'évacuation ; le SATI automatise les essais.' },
        { key: 'l_alarmes_baes', ref: 'BAEH 8 lm', spec: 'habitation', why: 'Un BAEH est destiné aux locaux à sommeil, pas à l\'évacuation d\'un ERP.' },
        { key: 'l_alarmes_baes', ref: 'Bloc d\'ambiance 360 lm', spec: 'anti-panique', half: true, why: 'Utile au-delà de 300 m², mais ne remplace pas les blocs d\'évacuation.' },
      ],
    },
    {
      id: 'tc',
      name: 'TC1 · Télécommande de mise au repos',
      need: 'Éteindre les blocs pendant une coupure volontaire du local',
      options: [
        { key: 'l_modulair_minuterie', ref: 'Télécommande de mise au repos 1 module', spec: 'compatible SATI', ok: true, why: 'Évite la décharge des batteries pendant les périodes de fermeture.' },
        { key: 'l_modulair_minuterie', ref: 'Interrupteur simple sur l\'alimentation BAES', spec: 'coupure directe', why: 'Couper l\'alimentation fait passer les blocs en secours : c\'est exactement ce qu\'on veut éviter.' },
        { key: 'l_modulair_minuterie', ref: 'Aucune télécommande', spec: '—', why: 'Les blocs se déchargeraient à chaque coupure de l\'éclairage.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q', label: 'Q1 · Éclairage', key: 'mcb2p', rail: 0, x: 52, rep: 'Q1' },
    { id: 'q2', label: 'Q2 · Télécommande', key: 'mcb1p', rail: 0, x: 112, rep: 'Q2' },
    { id: 'km', label: 'KM1 · Contacteur', key: 'l_protecti_schneider_clic_contacteur', rail: 0, x: 146, rep: 'KM1' },
    { id: 'ih', label: 'KA1 · Horloge', key: 'timer', rail: 0, x: 184, rep: 'KA1' },
    { id: 'tc', label: 'TC1 · Télécommande BAES', key: 'l_modulair_minuterie', rail: 0, x: 230, rep: 'TC1' },
    { id: 'f2', label: 'F2 · Commande', key: 'mcb1p', rail: 1, x: 52, rep: 'F2' },
    ...X2(52, 7, 2, {
      group: 'X1',
      groupLabel: 'X1 · bornier de départ',
      subs: ['L', 'N', 'PE', 'ECL', 'DET', 'BAES', 'TC'],
    }),
  ],
  annexItems: LOCAL_ITEMS,
  liaisons: [],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'aval', title: 'BAES alimentés en aval du contacteur', symptom: 'Les blocs passent en secours dès que l\'éclairage s\'éteint et se déchargent.', fix: 'Reprendre leur alimentation en aval de Q1 mais en amont de KM1.' },
    { id: 'tc', title: 'Télécommande câblée sur la phase des blocs', symptom: 'La mise au repos coupe l\'alimentation et déclenche le secours.', fix: 'Utiliser les deux fils de télécommande dédiés, sans couper l\'alimentation.' },
  ],
  quiz: [
    { q: 'Où prend-on l\'alimentation des BAES ?', options: ['En aval de la protection du circuit d\'éclairage, en amont de sa commande', 'Sur le circuit prises', 'Directement au disjoncteur de branchement'], answer: 0 },
    { q: 'À quoi sert la fonction SATI ?', options: ['À augmenter l\'autonomie', 'À réaliser automatiquement les essais périodiques et signaler les défauts', 'À télécommander l\'éclairage normal'], answer: 1 },
    { q: 'Quelle autonomie minimale pour un BAES d\'évacuation ?', options: ['30 min', '1 h', '3 h'], answer: 1 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
