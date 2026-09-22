/**
 * TP · Mise en service industrielle — station de relevage SR1.
 *
 * Adaptation du TP11 « Mise en service industrielle » du lycée : même ordre,
 * mêmes sept étapes, mêmes questions, sur une situation d'étude qui justifie
 * chaque mesure, et avec UN SEUL appareil : le contrôleur d'installation.
 *
 * L'installation est livrée posée et câblée par l'installateur (platine
 * précâblée, dessinée comme les autres TP) : l'élève la MET EN SERVICE. Il a son propre parcours
 * (`kind: 'miseEnService'`, voir `src/lib/mes/miseEnService.ts` et
 * `src/app/tp/[id]/MiseEnServiceClient.tsx`).
 */
import type { TpDefinition } from '@/lib/types';
import { STATION_GAINES, STATION_LIAISONS, STATION_PUPITRE, STATION_RECV, STATION_SLOTS, STATION_TERRE } from './station-platine';

export const TP_STATION_RELEVAGE: TpDefinition = {
  id: 'mise-en-service-station',
  title: 'Mise en service industrielle · station de relevage',
  level: '1re / Term Bac Pro MELEC',
  family: 'ind',
  classement: {
    domaine: 'EAU',
    domainesSecondaires: ['IND'],
    sousDomaine: 'EAU.stations',
    activites: [], // déduites par classementDe()
    motsCles: ['mise en service', 'station de relevage'],
  },
  kind: 'miseEnService',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C1', 'C5', 'C6', 'C7', 'C11', 'C13'],
  diplomas: ['bacpro', 'cap', 'bts'],
  summary:
    'Mise en service d\'une station de relevage en 7 étapes avec un seul appareil, le contrôleur d\'installation : identification sur schémas, inspection, consignation, continuité, isolement, terre, tensions, différentiels, ordre des phases, deux réserves à lever et procès-verbal.',
  situation:
    'Saison des pluies : le bassin d\'orage du lycée reçoit une station de relevage neuve. L\'installateur a posé l\'armoire et câblé la pompe immergée. Avant de la réceptionner, l\'agent technique te confie la mise en service en 7 étapes, avec un seul appareil : le contrôleur d\'installation multifonction. Une pompe qui tourne à l\'envers débite encore, mais seulement le tiers ; un moteur en fosse humide, avec des masses métalliques à portée de main, ne pardonne ni un défaut d\'isolement ni une masse non reliée.',
  plaque: {
    P: '2,2 kW',
    U: '400 V Y · 50 Hz',
    In: '4,9 A',
    n: '2860 tr/min',
    'cos φ': '0,84',
    Indice: 'IP 68 (pompe immergée)',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE, 50 Hz, schéma TT. DDR de tête 500 mA sélectif au TGBT du lycée.' },
    { k: 'Sectionnement', v: 'Q0 interrupteur-sectionneur 4P cadenassable, en tête d\'armoire. Arrêt d\'urgence S0 en porte.' },
    { k: 'Pompe', v: 'M1 moteur asynchrone 2,2 kW, 400 V Y, In 4,9 A, protégé par Q1 disjoncteur moteur GV2 réglé à 4,9 A, commandé par KM1.' },
    { k: 'Circuits 230 V', v: 'Luminaire étanche E1 de la fosse et prise de service PC1, protégés par Q2 différentiel 30 mA type A.' },
    { k: 'Commande', v: 'T1 400/24 V, primaire protégé par Q3, secondaire par Q4. S3 Manu/Auto : en manuel S2 marche et S1 arrêt, en automatique la poire de niveau B1.' },
    { k: 'Terre', v: 'Barrette de coupure BC1 et piquet PT1. Masses dans l\'armoire : porte, plaque de fond, T1, PC1. Hors armoire : moteur, canalisation de refoulement, garde-corps, luminaire.' },
    { k: 'Contrôleur d\'installation', v: 'Positions V · RISO · RLO · ZI · ΔT · IΔN · RE · ⟳, cordons N · PE · L.' },
    { k: 'Habilitation', v: 'BR pour les mesurages et la mise en service, BC pour la consignation. Consignation et déconsignation en présence du professeur.' },
  ],
  postes: [],
  /** Coffret précâblé : même moteur de dessin que les TP de platine (voir `station-platine.ts`). */
  rails: [150, 346, 542],
  slots: STATION_SLOTS,
  pupitre: STATION_PUPITRE,
  recvItems: STATION_RECV,
  terre: STATION_TERRE,
  gaines: STATION_GAINES,
  goulotteDePied: false,
  annexItems: [],
  liaisons: STATION_LIAISONS,
  nets: {},
  tests: [],
  mesures: [],
  faults: [],
  quiz: [],
  motor: { P: 2200, U: 400, In: 4.9, n: 2860, ns: 3000, cosPhi: 0.84 },
  station: true,
  hasMotor: true,
};
