/**
 * TP « Mise en service industrielle » au contrôleur d'installation.
 *
 * Adaptation du TP11 du lycée (MELEC) : même ordre, mêmes sept étapes, mêmes
 * questions — mais sur une situation d'étude qui justifie chaque mesure, la
 * station de relevage SR1 du bassin d'orage, et avec UN SEUL appareil pour tout
 * mesurer : le contrôleur d'installation multifonction (8 positions).
 *
 * Module PUR : données du TP, état de la tentative, règles de validation et
 * notation. Aucun React, aucun accès réseau — le store (`mesStore.ts`) et
 * l'interface (`MiseEnServiceClient.tsx`) s'appuient dessus.
 *
 * Correction apportée au TP d'origine : à l'étape 4, la fiche demandait une
 * mesure d'impédance de BOUCLE, qui exige la tension, alors que la déconsignation
 * n'intervient qu'après. On mesure donc la RÉSISTANCE DE TERRE (méthode des trois
 * piquets, barrette de coupure ouverte), faisable hors tension.
 */
import type { CompetenceEval, DiplomaId } from '../data/competences';
import { evaluate, MES_STAGE_DOMAINS } from '../data/competences';

/* ------------------------------------------------------------- étapes */

/** Zone d'une étape : préparation, hors tension (consigné), sous tension, documents. */
export type MesZone = 'pr' | 'hs' | 'st' | 'doc';

export interface MesStep { title: string; short: string; sub: string; zone: MesZone }

export const MES_STEPS: MesStep[] = [
  { title: 'Identification des équipements', short: 'Identif.', sub: 'A1 · repère, désignation et fonction, sur les schémas', zone: 'pr' },
  { title: 'Contrôles et appareil', short: 'Contrôles', sub: 'A1 · les 7 contrôles, le contrôleur, l\'habilitation', zone: 'pr' },
  { title: 'Inspection visuelle', short: 'Visuel', sub: 'Étape 1 · protection contre les contacts et l\'incendie', zone: 'pr' },
  { title: 'Consignation', short: 'Consign.', sub: 'Les 5 étapes, en présence du professeur', zone: 'hs' },
  { title: 'Continuité', short: 'Continuité', sub: 'Étape 2 · conducteurs de protection, liaisons équipotentielles', zone: 'hs' },
  { title: 'Isolement de l\'installation', short: 'Isol. inst.', sub: 'Étape 3 · entre conducteurs actifs, en aval de Q0', zone: 'hs' },
  { title: 'Isolement du moteur', short: 'Isol. mot.', sub: 'Étape 3 · enroulements de la pompe, barrettes retirées', zone: 'hs' },
  { title: 'Résistance de terre', short: 'Terre', sub: 'Étape 4 · méthode des trois piquets, barrette ouverte', zone: 'hs' },
  { title: 'Déconsignation', short: 'Déconsign.', sub: 'Remise sous tension progressive, en présence du professeur', zone: 'st' },
  { title: 'Tensions et fréquence', short: 'Tensions', sub: 'Étape 5 · alimentation du système', zone: 'st' },
  { title: 'Dispositifs différentiels', short: 'DDR', sub: 'Étape 6 · test, seuil IΔN, temps ΔT', zone: 'st' },
  { title: 'Ordre des phases et essais', short: 'Phases', sub: 'Étape 7 · sens de rotation, essais fonctionnels', zone: 'st' },
  { title: 'Procès-verbal', short: 'PV', sub: 'C11 · C13 · document de mise en service, restitution', zone: 'doc' },
];

export const MES_STEP_COUNT = MES_STEPS.length;
export const MES_STEP_LABELS = MES_STEPS.map((s) => s.title);
export const MES_STEP_SHORT = MES_STEPS.map((s) => s.short);

/** Indices nommés des étapes. */
export const MES = {
  IDENT: 0, PREP: 1, VISU: 2, CONS: 3, CONT: 4, ISO_I: 5, ISO_M: 6, TERRE: 7,
  DECONS: 8, TENS: 9, DDR: 10, PHASES: 11, PV: 12,
} as const;

/* ------------------------------------------------------------- contrôleur */

/** Positions du commutateur rotatif du contrôleur (DTR1 du TP11). */
export type Position = 'V' | 'RISO' | 'RLO' | 'ZI' | 'DT' | 'IDN' | 'RE' | 'ROT';

export interface PositionDef {
  k: Position;
  /** Numéro sur le commutateur (guide de l'appareil). */
  n: number;
  symbole: string;
  fonction: string;
  angle: number;
  /** Étape de la mise en service (1 à 7) où la position sert, sinon null. */
  etape: number | null;
  cordons: string;
  precaution: string;
}

export const POSITIONS: PositionDef[] = [
  { k: 'V', n: 1, symbole: 'V', fonction: 'Tension et fréquence', angle: -120, etape: 5,
    cordons: 'Rouge sur la phase, bleu sur le neutre ou sur l\'autre phase.',
    precaution: 'Sous tension. Vérifie l\'appareil sur une source connue avant et après la mesure.' },
  { k: 'RISO', n: 2, symbole: 'RISO', fonction: 'Résistance d\'isolement', angle: -80, etape: 3,
    cordons: 'Rouge et vert entre les deux conducteurs mesurés.',
    precaution: 'Installation CONSIGNÉE uniquement : l\'appareil injecte 500 V DC. Débrancher ce qui ne supporte pas l\'essai.' },
  { k: 'RLO', n: 3, symbole: 'RLO', fonction: 'Continuité', angle: -40, etape: 2,
    cordons: 'Vert sur la barrette de terre, rouge sur la masse contrôlée.',
    precaution: 'Faire le zéro des cordons avant la première mesure. Courant d\'essai 200 mA.' },
  { k: 'ZI', n: 4, symbole: 'ZI', fonction: 'Impédance de boucle', angle: 0, etape: null,
    cordons: 'L, N et PE sur une prise.',
    precaution: 'Sous tension. Contre-vérification possible de la terre, non demandée dans ce TP.' },
  { k: 'DT', n: 5, symbole: 'ΔT', fonction: 'Temps de déclenchement du DDR', angle: 40, etape: 6,
    cordons: 'L, N et PE sur la prise PC1, en aval de Q2.',
    precaution: 'Sous tension. Le différentiel va déclencher : prévenir, puis réarmer.' },
  { k: 'IDN', n: 6, symbole: 'IΔN', fonction: 'Seuil de déclenchement du DDR', angle: 80, etape: 6,
    cordons: 'L, N et PE sur la prise PC1.',
    precaution: 'Courant en rampe : lire la valeur au moment du déclenchement.' },
  { k: 'RE', n: 7, symbole: 'RE', fonction: 'Résistance de terre', angle: 120, etape: 4,
    cordons: 'Bornes E, S et H : piquets auxiliaires à 20 m et 40 m.',
    precaution: 'Barrette de coupure BC1 ouverte : on mesure la prise de terre seule.' },
  { k: 'ROT', n: 8, symbole: '⟳', fonction: 'Ordre des phases', angle: 160, etape: 7,
    cordons: 'Rouge L1, vert L2, bleu L3.',
    precaution: 'Sous tension. Lire 1-2-3 (sens direct) ou 1-3-2 (inverse).' },
];

export const positionOf = (k: Position) => POSITIONS.find((p) => p.k === k)!;

/* ------------------------------------------------------------- installation */

/** Un équipement à identifier : désignation, fonction, schéma, emplacement, usage. */
export interface Organe {
  rep: string;
  designation: string;
  fonction: string;
  schema: 'puissance' | 'commande';
  ou: string;
  usage?: string;
}

export const ORGANES: Organe[] = [
  { rep: 'Q0', designation: 'Interrupteur-sectionneur 4P cadenassable', fonction: 'Séparer et condamner l\'installation (consignation), couper en charge', schema: 'puissance', ou: 'Rail 1', usage: 'Étapes 3, 5 et 7 : mesures en aval de Q0' },
  { rep: 'Q1', designation: 'Disjoncteur moteur GV2 réglé à 4,9 A', fonction: 'Protéger la pompe contre les surcharges et les courts-circuits', schema: 'puissance', ou: 'Rail 1', usage: 'Réglé à In = 4,9 A (C6)' },
  { rep: 'KM1', designation: 'Contacteur tripolaire, bobine 24 V', fonction: 'Établir et couper l\'alimentation de la pompe', schema: 'puissance', ou: 'Rail 2', usage: 'Étape 3 : ouvert pendant l\'isolement' },
  { rep: 'M1', designation: 'Moteur asynchrone triphasé 2,2 kW (pompe)', fonction: 'Entraîner la pompe qui relève l\'eau du bassin', schema: 'puissance', ou: 'Fosse', usage: 'Étapes 2, 3 et 7' },
  { rep: 'Q2', designation: 'Disjoncteur différentiel 30 mA type A', fonction: 'Protéger les personnes contre les contacts indirects sur les circuits 230 V de la fosse', schema: 'puissance', ou: 'Rail 1', usage: 'Étape 6 : test, seuil et temps' },
  { rep: 'E1', designation: 'Luminaire étanche classe I', fonction: 'Éclairer la fosse', schema: 'puissance', ou: 'Fosse', usage: 'Étape 2 : continuité de sa masse' },
  { rep: 'PC1', designation: 'Prise de courant 2P+T 230 V', fonction: 'Alimenter l\'outillage portatif de maintenance', schema: 'puissance', ou: 'Rail 2', usage: 'Étape 6 : point de raccordement du contrôleur' },
  { rep: 'Q3', designation: 'Disjoncteur bipolaire 2 A', fonction: 'Protéger le primaire du transformateur', schema: 'puissance', ou: 'Rail 1' },
  { rep: 'T1', designation: 'Transformateur 400 / 24 V', fonction: 'Abaisser la tension et séparer la commande du réseau (TBT)', schema: 'puissance', ou: 'Rail 1', usage: 'Étape 2 : continuité de sa borne de masse' },
  { rep: 'BC1', designation: 'Barrette de coupure', fonction: 'Ouvrir la liaison à la terre pour mesurer la prise de terre seule', schema: 'puissance', ou: 'Ensemble terre', usage: 'Étape 4 : ouverte pendant la mesure' },
  { rep: 'Q4', designation: 'Disjoncteur phase + neutre 2 A', fonction: 'Protéger le circuit de commande 24 V et sectionner le 0 V', schema: 'commande', ou: 'Rail 2' },
  { rep: 'S0', designation: 'Arrêt d\'urgence coup de poing à accrochage', fonction: 'Couper la commande en cas de danger (arrêt de catégorie 0)', schema: 'commande', ou: 'Porte', usage: 'Essais fonctionnels (étape 7)' },
  { rep: 'S1', designation: 'Bouton-poussoir arrêt (NF)', fonction: 'Arrêter la pompe', schema: 'commande', ou: 'Porte' },
  { rep: 'S2', designation: 'Bouton-poussoir marche (NO)', fonction: 'Démarrer la pompe en mode manuel', schema: 'commande', ou: 'Porte', usage: 'Essais fonctionnels (étape 7)' },
  { rep: 'S3', designation: 'Commutateur 2 positions Manu / Auto', fonction: 'Choisir le mode de fonctionnement de la pompe', schema: 'commande', ou: 'Porte' },
  { rep: 'B1', designation: 'Poire de niveau (interrupteur à flotteur)', fonction: 'Détecter le niveau haut et démarrer la pompe en automatique', schema: 'commande', ou: 'Fosse', usage: 'Essais fonctionnels (étape 7)' },
  { rep: 'H2', designation: 'Voyant vert', fonction: 'Signaler que la pompe est en marche', schema: 'commande', ou: 'Porte' },
];

export const DESIGNATIONS = [...ORGANES.map((o) => o.designation)].sort((a, b) => a.localeCompare(b, 'fr'));
export const FONCTIONS = [...ORGANES.map((o) => o.fonction)].sort((a, b) => a.localeCompare(b, 'fr'));

/* ------------------------------------------------------------- préparation */

/** Les 7 contrôles à associer à leur numéro d'étape (question 1 du TP11). */
export const CONTROLES: { id: string; label: string; etape: number }[] = [
  { id: 'phases', label: 'Contrôle de l\'ordre des phases', etape: 7 },
  { id: 'tensions', label: 'Contrôle des tensions', etape: 5 },
  { id: 'ddr', label: 'Contrôle des disjoncteurs différentiels', etape: 6 },
  { id: 'visuel', label: 'Contrôle visuel', etape: 1 },
  { id: 'terre', label: 'Contrôle de la prise de terre', etape: 4 },
  { id: 'continuite', label: 'Contrôle de la continuité', etape: 2 },
  { id: 'isolement', label: 'Contrôle de l\'isolement', etape: 3 },
];

/** Condition d'un contrôle : installation consignée ou sous tension. */
export type Condition = 'hs' | 'st';

/** Les 7 étapes de la mise en service : ordre, condition, position, critère, raison. */
export const SEPT_ETAPES: { n: number; titre: string; zone: Condition; pos: string; critere: string; pourquoi: string }[] = [
  { n: 1, titre: 'Contrôle visuel', zone: 'hs', pos: '— (à l\'œil)', critere: 'Aucun écart : plastron, schémas, organes de sécurité, masses, étanchéité, marquage.',
    pourquoi: 'Un défaut vu avant de mesurer ne coûte rien. On commence donc par regarder.' },
  { n: 2, titre: 'Continuité', zone: 'hs', pos: 'RLO', critere: 'R ≤ 2 Ω entre chaque masse et la barrette de terre.',
    pourquoi: 'Sans conducteur de protection continu, aucune protection contre les contacts indirects ne fonctionne : c\'est la base de tout le reste.' },
  { n: 3, titre: 'Isolement', zone: 'hs', pos: 'RISO', critere: 'R ≥ 0,5 MΩ sous 500 V DC.',
    pourquoi: 'Un défaut d\'isolement à la mise sous tension provoque un court-circuit ou un déclenchement. Et la mesure injecte 500 V : impossible sous tension.' },
  { n: 4, titre: 'Prise de terre', zone: 'hs', pos: 'RE', critere: 'RA ≤ 50 V ÷ IΔn = 100 Ω (DDR de tête 500 mA).',
    pourquoi: 'Barrette BC1 ouverte, on mesure la prise de terre seule. Elle conditionne l\'efficacité des différentiels.' },
  { n: 5, titre: 'Tensions et fréquence', zone: 'st', pos: 'V', critere: '230 V ± 10 % · 400 V ± 10 % · 50 Hz.',
    pourquoi: 'Premier contrôle sous tension : on vérifie ce qui arrive avant de mettre les récepteurs en service.' },
  { n: 6, titre: 'Différentiels', zone: 'st', pos: 'IΔN puis ΔT', critere: '15 mA < IΔN ≤ 30 mA · ΔT ≤ 300 ms à IΔn · ΔT ≤ 40 ms à 5 IΔn.',
    pourquoi: 'Il faut de la tension pour faire circuler le courant de défaut simulé. On commence par le bouton TEST.' },
  { n: 7, titre: 'Ordre des phases', zone: 'st', pos: '⟳', critere: 'Sens direct 1-2-3, puis essais fonctionnels.',
    pourquoi: 'Dernier contrôle avant de démarrer la pompe : un ordre inverse la ferait tourner à l\'envers.' },
];

/** Condition attendue d'un contrôle, déduite de son étape. */
export const conditionOf = (etape: number): Condition => (etape <= 4 ? 'hs' : 'st');

/** Question de justification de l'ordre (option A validée). */
export const POURQUOI: QcmDef = {
  q: 'Pourquoi mesure-t-on l\'isolement AVANT de mettre l\'installation sous tension ?',
  options: [
    'Parce qu\'un défaut d\'isolement provoquerait un court-circuit à la mise sous tension, et que la mesure injecte 500 V DC',
    'Parce que le contrôleur ne mesure pas l\'isolement sous tension par manque de pile',
    'Parce que la norme impose de commencer par la mesure la plus longue',
    'Pour gagner du temps : on n\'a pas besoin d\'attendre la déconsignation',
  ],
  answer: 0,
  why: 'On ne met sous tension qu\'une installation dont le conducteur de protection, l\'isolement et la terre sont sûrs.',
};

export const APPAREILS = [
  'Contrôleur d\'installation multifonction',
  'Multimètre numérique',
  'Mégohmmètre',
  'Pince ampèremétrique',
];
export const APPAREIL_OK = 0;

export const HABILITATIONS = ['BE Manœuvre', 'B1-B1V', 'BR', 'BC', 'B2'];
/** Mise en service avec mesurages : BR ; consignation : BC. */
export const HABILITATIONS_OK = ['BR', 'BC'];

/* ------------------------------------------------------------- inspection */

export const INSPECTION: { id: string; label: string; conforme: boolean; ecart?: string }[] = [
  { id: 'schemas', label: 'Présence des schémas', conforme: true },
  { id: 'plastron', label: 'Protection des pièces nues sous tension (plastron)', conforme: true },
  { id: 'organes', label: 'Accessibilité des organes de sécurité (sectionneur, AU)', conforme: true },
  { id: 'masses', label: 'Mise à la terre des masses métalliques', conforme: true },
  { id: 'etancheite', label: 'Étanchéité des coffrets (presse-étoupes, joints)', conforme: false,
    ecart: 'Le presse-étoupe du câble de la pompe n\'est pas serré : l\'indice IP65 de l\'armoire n\'est plus garanti, en pleine fosse humide. On le serre avant de poursuivre.' },
  { id: 'marquage', label: 'Marquage des composants', conforme: true },
];

/* ------------------------------------------------------------- consignation */

export const CONSIGNATION: { id: string; label: string; qui: 'BC' | 'BR' }[] = [
  { id: 'separation', label: 'Séparation : ouvrir Q0', qui: 'BC' },
  { id: 'condamnation', label: 'Condamnation : cadenas et macaron sur Q0', qui: 'BC' },
  { id: 'identification', label: 'Identification de l\'installation consignée', qui: 'BR' },
  { id: 'vat', label: 'VAT : vérifier l\'absence de tension', qui: 'BR' },
  { id: 'maltcc', label: 'MALT-CC si risque de réalimentation', qui: 'BR' },
];

export const EQUIPEMENTS: { id: string; label: string; ok: boolean }[] = [
  { id: 'gants', label: 'Gants isolants', ok: true },
  { id: 'ecran', label: 'Écran facial ou casque à visière', ok: true },
  { id: 'cadenas', label: 'Cadenas de consignation', ok: true },
  { id: 'macaron', label: 'Macaron « Appareil condamné »', ok: true },
  { id: 'vat', label: 'VAT (vérificateur d\'absence de tension)', ok: true },
  { id: 'balisage', label: 'Banderole et pancarte de balisage', ok: true },
  { id: 'extincteur', label: 'Extincteur', ok: false },
  { id: 'multimetre', label: 'Multimètre en position Ω', ok: false },
];

/* ------------------------------------------------------------- mesures */

/** Un point de mesure : libellé, valeur lue (ou 'OL'), plage de conformité. */
export interface Point {
  id: string;
  label: string;
  valeur: number | string;
  unite: string;
  /** Position requise pour CE point (sinon celle de l'étape). */
  pos?: Position;
  /** Conforme si la valeur est dans [min, max]. */
  min?: number;
  max?: number;
  /** Chaîne attendue pour une lecture non numérique (ordre des phases). */
  attendu?: string;
  /** Action sans contrôleur (bouton TEST du DDR). */
  action?: string;
}

export interface Reserve {
  point: string;
  constat: string;
  levee: string;
  /** Valeur lue après levée de la réserve. */
  valeur: number | string;
}

export interface QcmDef { q: string; options: string[]; answer: number; why: string }

export interface EtapeMesure {
  pos: Position;
  cordons: string;
  critere: string;
  role: QcmDef;
  limite: QcmDef;
  points: Point[];
  reserve?: Reserve;
  note?: string;
}

export const MESURES: Partial<Record<number, EtapeMesure>> = {
  [MES.CONT]: {
    pos: 'RLO',
    cordons: 'Vert sur la barrette de terre principale, rouge sur la masse contrôlée. Faire le zéro des cordons avant la première mesure.',
    critere: 'R ≤ 2 Ω, courant d\'essai 200 mA',
    role: {
      q: 'Quel est le rôle de l\'essai de continuité ?',
      options: [
        'Vérifier que chaque masse est bien reliée à la terre par un conducteur de protection intact',
        'Vérifier qu\'aucun courant ne fuit entre deux conducteurs actifs',
        'Mesurer la tension entre phase et neutre',
        'Vérifier le sens de rotation du moteur',
      ],
      answer: 0,
      why: 'Sans continuité du PE, un défaut d\'isolement porte la masse au potentiel de la phase sans que le différentiel puisse déclencher.',
    },
    limite: {
      q: 'Valeur maximale permettant d\'assurer une bonne continuité ?',
      options: ['2 Ω', '0,5 MΩ', '100 Ω', '30 mA'],
      answer: 0,
      why: 'La résistance de continuité du conducteur de protection doit rester inférieure à 2 Ω.',
    },
    points: [
      { id: 'porte', label: 'Porte de l\'armoire (tresse de masse)', valeur: 0.12, unite: 'Ω', max: 2 },
      { id: 'plaque', label: 'Plaque de fond', valeur: 0.08, unite: 'Ω', max: 2 },
      { id: 't1', label: 'T1 · borne de masse', valeur: 0.15, unite: 'Ω', max: 2 },
      { id: 'pc1', label: 'PC1 · borne de terre de la prise', valeur: 0.21, unite: 'Ω', max: 2 },
      { id: 'm1', label: 'M1 · carcasse du moteur de pompe (fosse)', valeur: 0.46, unite: 'Ω', max: 2 },
      { id: 'canal', label: 'Canalisation de refoulement en acier (fosse)', valeur: 0.62, unite: 'Ω', max: 2 },
      { id: 'garde', label: 'Garde-corps de la fosse', valeur: 'OL', unite: 'Ω', max: 2 },
      { id: 'e1', label: 'E1 · luminaire étanche (fosse)', valeur: 0.55, unite: 'Ω', max: 2 },
    ],
    reserve: {
      point: 'garde',
      constat: 'Le contrôleur affiche OL : le garde-corps n\'est relié à rien. Il manque la liaison équipotentielle supplémentaire, alors qu\'il est à portée de main du moteur et de la canalisation.',
      levee: 'Poser un conducteur vert-jaune de 6 mm² entre le garde-corps et la barrette de terre, puis refaire la mesure.',
      valeur: 0.38,
    },
  },
  [MES.ISO_I]: {
    pos: 'RISO',
    cordons: 'Rouge et vert entre les deux conducteurs mesurés, en aval de Q0 ouvert. KM1 ouvert, primaire de T1 débranché.',
    critere: 'R ≥ 0,5 MΩ sous 500 V DC (circuit de 50 à 500 V)',
    role: {
      q: 'Quel est le rôle du contrôle d\'isolement ?',
      options: [
        'Vérifier qu\'il n\'existe aucun défaut d\'isolement entre conducteurs actifs, ni vers la terre',
        'Vérifier la continuité du conducteur de protection',
        'Mesurer la résistance de la prise de terre',
        'Vérifier le temps de coupure du différentiel',
      ],
      answer: 0,
      why: 'Un isolement dégradé provoque des courants de fuite, des déclenchements intempestifs, voire un court-circuit à la mise sous tension.',
    },
    limite: {
      q: 'Valeur minimale permettant d\'assurer un bon isolement (circuit 400 V) ?',
      options: ['0,5 MΩ', '0,25 MΩ', '1 MΩ', '2 Ω'],
      answer: 0,
      why: 'De 50 à 500 V, la tension d\'essai est de 500 V DC et la résistance minimale de 0,5 MΩ.',
    },
    points: [
      { id: 'l1n', label: 'Ph1 – N', valeur: 312, unite: 'MΩ', min: 0.5 },
      { id: 'l2n', label: 'Ph2 – N', valeur: 298, unite: 'MΩ', min: 0.5 },
      { id: 'l3n', label: 'Ph3 – N', valeur: 305, unite: 'MΩ', min: 0.5 },
      { id: 'l1l2', label: 'Ph1 – Ph2', valeur: 420, unite: 'MΩ', min: 0.5 },
      { id: 'l1l3', label: 'Ph1 – Ph3', valeur: 415, unite: 'MΩ', min: 0.5 },
      { id: 'l2l3', label: 'Ph2 – Ph3', valeur: 431, unite: 'MΩ', min: 0.5 },
    ],
  },
  [MES.ISO_M]: {
    pos: 'RISO',
    cordons: 'Rouge sur la borne d\'enroulement, vert sur la carcasse (PE) ou sur l\'autre enroulement. Barrettes de couplage RETIRÉES.',
    critere: 'R ≥ 0,5 MΩ sous 500 V DC',
    role: {
      q: 'Pourquoi contrôle-t-on séparément l\'isolement du moteur de la pompe ?',
      options: [
        'Parce qu\'il travaille en fosse humide : ses enroulements sont les plus exposés à un défaut',
        'Pour vérifier son sens de rotation',
        'Pour mesurer son courant nominal',
        'Parce que le contrôleur ne peut pas mesurer l\'armoire',
      ],
      answer: 0,
      why: 'L\'humidité dégrade l\'isolant des bobinages : c\'est le premier point faible d\'une pompe de relevage.',
    },
    limite: {
      q: 'Pourquoi faut-il retirer les barrettes de couplage avant de mesurer U2–V1 ?',
      options: [
        'Sinon les enroulements sont reliés entre eux et la mesure entre enroulements n\'a aucun sens',
        'Pour ne pas abîmer le contrôleur',
        'Parce que le moteur doit être couplé en triangle',
        'Ce n\'est pas nécessaire',
      ],
      answer: 0,
      why: 'Couplé en étoile, U2, V2 et W2 sont au même point : on mesurerait toujours le même nœud.',
    },
    points: [
      { id: 'u2pe', label: 'U2 – PE', valeur: 124, unite: 'MΩ', min: 0.5 },
      { id: 'v2pe', label: 'V2 – PE', valeur: 118, unite: 'MΩ', min: 0.5 },
      { id: 'w2pe', label: 'W2 – PE', valeur: 131, unite: 'MΩ', min: 0.5 },
      { id: 'u2v1', label: 'U2 – V1', valeur: 540, unite: 'MΩ', min: 0.5 },
      { id: 'w1v2', label: 'W1 – V2', valeur: 525, unite: 'MΩ', min: 0.5 },
      { id: 'u1w1', label: 'U1 – W1', valeur: 560, unite: 'MΩ', min: 0.5 },
    ],
  },
  [MES.TERRE]: {
    pos: 'RE',
    cordons: 'Bornes E, S et H : E sur le piquet PT1, piquets auxiliaires S et H plantés à 20 m et 40 m. Barrette de coupure BC1 OUVERTE.',
    critere: 'RA ≤ UL ÷ IΔn = 50 V ÷ 0,5 A = 100 Ω (DDR de tête du lycée : 500 mA)',
    role: {
      q: 'Quel est le rôle de la mesure de la résistance de terre ?',
      options: [
        'Vérifier que la prise de terre permet au différentiel de protéger les personnes contre les contacts indirects',
        'Vérifier l\'isolement du moteur',
        'Mesurer la tension du réseau',
        'Vérifier l\'ordre des phases',
      ],
      answer: 0,
      why: 'En schéma TT, la tension de contact vaut RA × IΔn : elle doit rester sous 50 V.',
    },
    limite: {
      q: 'Valeur maximale de la résistance de terre, sachant que le DDR du lycée est de 500 mA ?',
      options: ['100 Ω', '1667 Ω', '2 Ω', '500 Ω'],
      answer: 0,
      why: 'RA ≤ 50 V ÷ 0,5 A = 100 Ω. Elle se calcule : 1667 Ω correspondrait à un 30 mA.',
    },
    points: [
      { id: 'ra', label: 'Prise de terre PT1 (barrette BC1 ouverte)', valeur: 38, unite: 'Ω', max: 100 },
    ],
    note: 'La fiche d\'origine plaçait ici la mesure de boucle ZI, qui exige la tension. Or la déconsignation n\'arrive qu\'après cette étape : on mesure donc RE hors tension, sur la barrette de coupure ouverte. La boucle reste possible en contre-vérification une fois l\'installation sous tension.',
  },
  [MES.TENS]: {
    pos: 'V',
    cordons: 'Rouge sur la phase, bleu sur le neutre (ou sur la seconde phase), en aval de Q0.',
    critere: '230 V ± 10 % entre phase et neutre · 400 V ± 10 % entre phases · 50 Hz',
    role: {
      q: 'Quel est le rôle de la vérification des tensions et de la fréquence ?',
      options: [
        'S\'assurer que l\'alimentation correspond à ce qu\'attend le matériel avant de mettre les récepteurs en service',
        'Vérifier l\'isolement des câbles',
        'Mesurer la résistance de terre',
        'Vérifier le serrage des bornes',
      ],
      answer: 0,
      why: 'Une phase absente ou une tension hors tolérance détruit un moteur ou fait déclencher les protections.',
    },
    limite: {
      q: 'Tension entre phases, tension phase-neutre et fréquence attendues ?',
      options: ['400 V · 230 V · 50 Hz', '230 V · 400 V · 60 Hz', '400 V · 400 V · 50 Hz', '230 V · 230 V · 50 Hz'],
      answer: 0,
      why: 'Réseau triphasé 3 × 400 V + N, 50 Hz.',
    },
    points: [
      { id: 'l1n', label: 'Ph1 – N', valeur: 231, unite: 'V', min: 207, max: 253 },
      { id: 'l2n', label: 'Ph2 – N', valeur: 229, unite: 'V', min: 207, max: 253 },
      { id: 'l3n', label: 'Ph3 – N', valeur: 232, unite: 'V', min: 207, max: 253 },
      { id: 'l1l2', label: 'Ph1 – Ph2', valeur: 399, unite: 'V', min: 360, max: 440 },
      { id: 'l1l3', label: 'Ph1 – Ph3', valeur: 401, unite: 'V', min: 360, max: 440 },
      { id: 'l2l3', label: 'Ph2 – Ph3', valeur: 398, unite: 'V', min: 360, max: 440 },
      { id: 'f', label: 'Fréquence', valeur: 50.0, unite: 'Hz', min: 49.5, max: 50.5 },
    ],
  },
  [MES.DDR]: {
    pos: 'IDN',
    cordons: 'Rouge L, bleu N, vert PE, sur la prise PC1 en aval de Q2.',
    critere: 'IΔn/2 < IΔN ≤ IΔn, soit 15 à 30 mA · ΔT ≤ 300 ms à IΔn · ΔT ≤ 40 ms à 5 IΔn',
    role: {
      q: 'Quel est le rôle de l\'essai des dispositifs différentiels ?',
      options: [
        'Vérifier que le différentiel coupe assez vite, et au bon seuil, en cas de défaut d\'isolement',
        'Vérifier la continuité du PE',
        'Vérifier l\'ordre des phases',
        'Mesurer la puissance de la pompe',
      ],
      answer: 0,
      why: 'Associé au conducteur de protection, le différentiel protège contre les contacts indirects.',
    },
    limite: {
      q: 'Q2 est de type instantané. Pour quelle valeur DOIT-il déclencher ?',
      options: ['30 mA (IΔn)', '15 mA (IΔn/2)', '500 mA', '5 mA'],
      answer: 0,
      why: 'Sous IΔn/2 il ne doit pas déclencher, à IΔn il doit déclencher : le seuil réel est entre les deux.',
    },
    points: [
      { id: 'test', label: 'Bouton TEST de Q2', valeur: 'déclenche', unite: '', action: 'Appuyer sur le bouton TEST de Q2', attendu: 'déclenche' },
      { id: 'idn', label: 'Seuil de déclenchement IΔN (rampe)', valeur: 22, unite: 'mA', pos: 'IDN', min: 15, max: 30 },
      { id: 'dt1', label: 'Temps ΔT à IΔn = 30 mA', valeur: 26, unite: 'ms', pos: 'DT', min: 0, max: 300 },
      { id: 'dt5', label: 'Temps ΔT à 5 × IΔn = 150 mA', valeur: 14, unite: 'ms', pos: 'DT', min: 0, max: 40 },
    ],
  },
  [MES.PHASES]: {
    pos: 'ROT',
    cordons: 'Rouge L1, vert L2, bleu L3, aux bornes aval de Q0.',
    critere: 'Sens direct : 1-2-3',
    role: {
      q: 'Quel est le rôle du contrôle de l\'ordre des phases ?',
      options: [
        'Vérifier que la pompe tournera dans le bon sens avant de la mettre en marche',
        'Vérifier que les trois phases ont la même tension',
        'Vérifier l\'isolement du moteur',
        'Mesurer la fréquence du réseau',
      ],
      answer: 0,
      why: 'Une pompe centrifuge qui tourne à l\'envers débite encore, mais seulement le tiers : le défaut passe inaperçu jusqu\'à la première grosse pluie.',
    },
    limite: {
      q: 'Comment corrige-t-on un ordre des phases inverse ?',
      options: [
        'Installation consignée, on inverse DEUX phases à l\'arrivée',
        'On inverse les trois phases',
        'On inverse la phase et le neutre',
        'On change le moteur',
      ],
      answer: 0,
      why: 'Permuter deux phases inverse le champ tournant. Toujours hors tension, après consignation.',
    },
    points: [
      { id: 'rot', label: 'L1 – L2 – L3 aux bornes aval de Q0', valeur: '132', unite: '', attendu: '123' },
    ],
    reserve: {
      point: 'rot',
      constat: 'Le contrôleur affiche 1-3-2 : ordre inverse. La pompe tournerait à l\'envers et ne débiterait plus que le tiers.',
      levee: 'Consigner, inverser L2 et L3 au bornier d\'arrivée X1, déconsigner, puis refaire la mesure.',
      valeur: '123',
    },
  },
};

/** Essais fonctionnels de l'étape 7 : ce qu'on fait, ce qu'on doit constater. */
export const ESSAIS: { id: string; action: string; constat: string }[] = [
  { id: 'manu', action: 'S3 sur MANU, appui sur S2', constat: 'KM1 colle, la pompe démarre, H2 s\'allume.' },
  { id: 'arret', action: 'Appui sur S1', constat: 'KM1 retombe, la pompe s\'arrête, H2 s\'éteint.' },
  { id: 'au', action: 'Pompe en marche, appui sur l\'AU S0', constat: 'Arrêt immédiat. Au déverrouillage, la pompe NE redémarre PAS seule.' },
  { id: 'auto', action: 'S3 sur AUTO, niveau monté jusqu\'à la poire B1', constat: 'B1 se ferme, la pompe démarre seule.' },
  { id: 'autoStop', action: 'Niveau redescendu sous la poire B1', constat: 'B1 s\'ouvre, la pompe s\'arrête.' },
];

/* ------------------------------------------------------------- déconsignation */

export const DECONSIGNATION: { id: string; label: string }[] = [
  { id: 'maltcc', label: 'Retirer la MALT-CC' },
  { id: 'barrette', label: 'Refermer la barrette de coupure BC1' },
  { id: 'cadenas', label: 'Retirer le cadenas et le macaron de Q0' },
  { id: 'informer', label: 'Informer : l\'installation va être remise sous tension' },
  { id: 'amont', label: 'Vérifier la tension en amont de Q0' },
  { id: 'q0', label: 'Fermer Q0, puis vérifier la tension en aval' },
  { id: 'div', label: 'Fermer Q3 et Q4 (commande), puis Q2 (circuits 230 V)' },
];

/* ------------------------------------------------------------- PV · restitution */

export const RESTITUTION: QcmDef = {
  q: 'Que dis-tu d\'abord à l\'agent technique en lui remettant l\'installation ?',
  options: [
    'Les deux réserves trouvées et levées (garde-corps relié, phases inversées), et comment réarmer Q2 et Q1',
    'Que tout était conforme dès le départ',
    'Qu\'il faut appeler l\'installateur à chaque pluie',
    'Rien : le PV suffit',
  ],
  answer: 0,
  why: 'Le client doit savoir ce qui a été corrigé, et comment réagir à un déclenchement : c\'est lui qui vivra avec l\'installation.',
};

/* ------------------------------------------------------------- état */

export type Jugement = 'C' | 'NC';

export interface Lecture { v: number | string; pos: Position }

export interface EtatMesure {
  lectures: Record<string, Lecture>;
  jugements: Record<string, Jugement>;
  /** Tentatives avec une mauvaise position du commutateur. */
  errPos: number;
  /** Conformités mal jugées (au moment où l'élève les déclare). */
  errJuge: number;
  levee: boolean;
  role: number | null;
  limite: number | null;
  errQcm: number;
}

export interface MesState {
  step: number;
  done: Record<number, boolean>;
  ident: Record<string, { d?: string; f?: string; ok?: boolean; err: number }>;
  prep: {
    /** Condition choisie pour chaque contrôle (hors tension / sous tension). */
    conditions: Record<string, Condition | null>;
    /** Réponse à la question « pourquoi cet ordre ». */
    pourquoi: number | null;
    positions: Record<string, string | null>;
    appareil: number | null;
    habil: string[];
    err: number;
  };
  visu: { marks: Record<string, Jugement | null>; corrige: boolean; err: number };
  cons: { seq: string[]; equip: string[]; err: number };
  mesures: Record<number, EtatMesure>;
  decons: { seq: string[]; err: number };
  essais: Record<string, boolean>;
  pv: { restitution: number | null; err: number };
  /** Tentatives de validation refusées, par étape. */
  refus: Record<number, number>;
  /** Questions posées au professeur virtuel, par étape (aides). */
  helpUsed: Record<number, number>;
}

const emptyMesure = (): EtatMesure => ({
  lectures: {}, jugements: {}, errPos: 0, errJuge: 0, levee: false, role: null, limite: null, errQcm: 0,
});

export function initialMesState(): MesState {
  const mesures: Record<number, EtatMesure> = {};
  Object.keys(MESURES).forEach((k) => { mesures[Number(k)] = emptyMesure(); });
  return {
    step: 0,
    done: {},
    ident: {},
    prep: { conditions: {}, pourquoi: null, positions: {}, appareil: null, habil: [], err: 0 },
    visu: { marks: {}, corrige: false, err: 0 },
    cons: { seq: [], equip: [], err: 0 },
    mesures,
    decons: { seq: [], err: 0 },
    essais: {},
    pv: { restitution: null, err: 0 },
    refus: {},
    helpUsed: {},
  };
}

/** Complète un état restauré (tentative commencée avant une évolution du TP). */
export function normalizeMesState(raw: Partial<MesState> | null | undefined): MesState {
  const base = initialMesState();
  if (!raw) return base;
  const mesures = { ...base.mesures };
  Object.entries(raw.mesures ?? {}).forEach(([k, v]) => { mesures[Number(k)] = { ...emptyMesure(), ...v }; });
  return {
    ...base,
    ...raw,
    done: raw.done ?? {},
    ident: raw.ident ?? {},
    prep: { ...base.prep, ...(raw.prep ?? {}) },
    visu: { ...base.visu, ...(raw.visu ?? {}) },
    cons: { ...base.cons, ...(raw.cons ?? {}) },
    mesures,
    decons: { ...base.decons, ...(raw.decons ?? {}) },
    essais: raw.essais ?? {},
    pv: { ...base.pv, ...(raw.pv ?? {}) },
    refus: raw.refus ?? {},
    helpUsed: raw.helpUsed ?? {},
  };
}

/* ------------------------------------------------------------- lectures */

/** Valeur lue sur un point, compte tenu d'une réserve levée. */
export function valeurLue(step: number, pointId: string, levee: boolean): number | string | null {
  const e = MESURES[step];
  const p = e?.points.find((x) => x.id === pointId);
  if (!e || !p) return null;
  if (e.reserve && e.reserve.point === pointId && levee) return e.reserve.valeur;
  return p.valeur;
}

/** Position du commutateur requise pour un point. */
export const posRequise = (step: number, pointId: string): Position | null => {
  const e = MESURES[step];
  const p = e?.points.find((x) => x.id === pointId);
  return p ? (p.pos ?? e!.pos) : null;
};

/** La valeur lue est-elle conforme ? */
export function estConforme(p: Point, v: number | string): boolean {
  if (p.attendu != null) return String(v) === p.attendu;
  if (typeof v !== 'number') return false;
  if (p.min != null && v < p.min) return false;
  if (p.max != null && v > p.max) return false;
  return true;
}

/** Affichage d'une valeur à la française. */
export function fmt(v: number | string, unite = ''): string {
  if (typeof v === 'number') {
    const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, '');
    return `${s.replace('.', ',')}${unite ? ` ${unite}` : ''}`;
  }
  if (/^\d{3}$/.test(v)) return v.split('').join(' - ');
  return v;
}

/* ------------------------------------------------------------- validation */

export interface Blocage { kind: 'bad' | 'info'; text: string }

/** Ce qui empêche de valider l'étape courante. */
export function blocages(s: MesState, step: number): Blocage[] {
  const out: Blocage[] = [];
  const bad = (text: string) => out.push({ kind: 'bad', text });
  switch (step) {
    case MES.IDENT: {
      const n = ORGANES.filter((o) => s.ident[o.rep]?.ok).length;
      if (n < ORGANES.length) bad(`${ORGANES.length - n} équipement(s) restent à identifier.`);
      break;
    }
    case MES.PREP: {
      const nc = CONTROLES.filter((c) => s.prep.conditions[c.id] !== conditionOf(c.etape)).length;
      if (nc) bad(`${nc} contrôle(s) mal classé(s) (hors tension ou sous tension).`);
      if (s.prep.pourquoi !== POURQUOI.answer) bad('La question « pourquoi cet ordre » est à revoir.');
      const np = POSITIONS.filter((p) => s.prep.positions[p.k] !== p.fonction).length;
      if (np) bad(`${np} position(s) du commutateur mal identifiée(s).`);
      if (s.prep.appareil !== APPAREIL_OK) bad('Le nom de l\'appareil est à revoir.');
      const h = [...s.prep.habil].sort().join('|');
      if (h !== [...HABILITATIONS_OK].sort().join('|')) bad('Le choix des habilitations est à revoir.');
      break;
    }
    case MES.VISU: {
      const nm = INSPECTION.filter((i) => s.visu.marks[i.id] == null).length;
      if (nm) bad(`${nm} point(s) d'inspection non renseigné(s).`);
      const faux = INSPECTION.filter((i) => s.visu.marks[i.id] != null && (s.visu.marks[i.id] === 'C') !== i.conforme).length;
      if (faux) bad(`${faux} point(s) d'inspection mal jugé(s).`);
      if (!faux && !nm && !s.visu.corrige) bad('Un écart a été relevé : corrige-le avant de poursuivre.');
      break;
    }
    case MES.CONS: {
      if (s.cons.seq.length < CONSIGNATION.length) bad('La consignation n\'est pas terminée.');
      const eq = EQUIPEMENTS.filter((e) => e.ok !== s.cons.equip.includes(e.id)).length;
      if (eq) bad(`${eq} équipement(s) mal choisi(s) pour la consignation.`);
      break;
    }
    case MES.DECONS:
      if (s.decons.seq.length < DECONSIGNATION.length) bad('La déconsignation n\'est pas terminée.');
      break;
    case MES.PV:
      if (s.pv.restitution !== RESTITUTION.answer) bad('Réponds à la question de restitution au client.');
      break;
    default: {
      const e = MESURES[step];
      if (!e) break;
      const m = s.mesures[step];
      if (m.role !== e.role.answer) bad('La question sur le rôle de l\'étape est à revoir.');
      if (m.limite !== e.limite.answer) bad('La question sur la valeur de référence est à revoir.');
      const manquants = e.points.filter((p) => !m.lectures[p.id]).length;
      if (manquants) bad(`${manquants} point(s) à mesurer.`);
      const nonJuges = e.points.filter((p) => m.lectures[p.id] && !m.jugements[p.id]).length;
      if (nonJuges) bad(`${nonJuges} conformité(s) à déclarer.`);
      e.points.forEach((p) => {
        const l = m.lectures[p.id], j = m.jugements[p.id];
        if (l && j && (j === 'C') !== estConforme(p, l.v)) bad(`Conformité mal jugée : ${p.label}.`);
      });
      if (e.reserve) {
        const l = m.lectures[e.reserve.point];
        if (l && !estConforme(e.points.find((p) => p.id === e.reserve!.point)!, l.v)) {
          bad('Une réserve reste à lever avant de valider l\'étape.');
        }
      }
      if (step === MES.PHASES) {
        const nE = ESSAIS.filter((x) => !s.essais[x.id]).length;
        if (nE) bad(`${nE} essai(s) fonctionnel(s) à réaliser.`);
      }
    }
  }
  return out;
}

/** L'étape peut-elle être validée ? */
export const stepOk = (s: MesState, step: number): boolean => !blocages(s, step).some((b) => b.kind === 'bad');

/* ------------------------------------------------------------- notation */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Erreurs commises à une étape (pour le score et le bilan). */
export function erreurs(s: MesState, step: number): number {
  const refus = s.refus[step] ?? 0;
  switch (step) {
    case MES.IDENT: return Object.values(s.ident).reduce((a, v) => a + (v.err ?? 0), 0) + refus;
    case MES.PREP: return s.prep.err + refus;
    case MES.VISU: return s.visu.err + refus;
    case MES.CONS: return s.cons.err + refus;
    case MES.DECONS: return s.decons.err + refus;
    case MES.PV: return s.pv.err + refus;
    default: {
      const m = s.mesures[step];
      return m ? m.errPos + m.errJuge + m.errQcm + refus : refus;
    }
  }
}

/** Nombre d'actions notées par étape (dénominateur du score). */
function actions(step: number): number {
  switch (step) {
    case MES.IDENT: return ORGANES.length * 2;
    case MES.PREP: return CONTROLES.length + 1 + POSITIONS.length + 2;
    case MES.VISU: return INSPECTION.length;
    case MES.CONS: return CONSIGNATION.length + EQUIPEMENTS.length;
    case MES.DECONS: return DECONSIGNATION.length;
    case MES.PV: return 2;
    default: {
      const e = MESURES[step];
      return e ? e.points.length * 2 + 2 + (step === MES.PHASES ? ESSAIS.length : 0) : 1;
    }
  }
}

/** Score 0..1 d'une étape validée : chaque erreur retire sa part, plancher 0,3. */
export function stepScore(s: MesState, step: number): number | undefined {
  if (!s.done[step]) return undefined;
  const e = erreurs(s, step);
  return clamp01(Math.max(0.3, 1 - e / actions(step)));
}

export const mesStageScores = (s: MesState): (number | undefined)[] =>
  MES_STEPS.map((_, i) => stepScore(s, i));

/** Note sur 100 : moyenne des étapes, une étape non validée comptant 0. */
export function mesScore(s: MesState): number {
  const sc = mesStageScores(s);
  return Math.round((sc.reduce<number>((a, v) => a + (v ?? 0), 0) / MES_STEP_COUNT) * 100);
}

export function buildMesEvaluation(s: MesState, diploma: DiplomaId): CompetenceEval[] {
  return evaluate(diploma, MES_STAGE_DOMAINS, mesStageScores(s));
}

/* ------------------------------------------------------------- procès-verbal */

export interface LignePv { label: string; valeur: string; ok: boolean | null }

/** Lignes du procès-verbal, lues dans l'état de la tentative. */
export function lignesPv(s: MesState): LignePv[] {
  const lu = (step: number, id: string) => s.mesures[step]?.lectures[id]?.v;
  const pire = (step: number, mode: 'max' | 'min'): string => {
    const e = MESURES[step]!;
    const vals = e.points.map((p) => lu(step, p.id)).filter((v) => v != null);
    if (!vals.length) return '—';
    if (vals.some((v) => v === 'OL')) return 'OL';
    const nums = vals.filter((v): v is number => typeof v === 'number');
    const v = mode === 'max' ? Math.max(...nums) : Math.min(...nums);
    return fmt(v, e.points[0].unite);
  };
  const v = (step: number, id: string) => {
    const x = lu(step, id);
    const p = MESURES[step]?.points.find((q) => q.id === id);
    return x == null || !p ? '—' : fmt(x, p.unite);
  };
  return [
    { label: 'Inspection visuelle', valeur: s.visu.corrige ? '1 écart corrigé (presse-étoupe)' : '—', ok: s.done[MES.VISU] ? true : null },
    { label: 'Continuité du PE · pire valeur', valeur: pire(MES.CONT, 'max'), ok: s.done[MES.CONT] ? true : null },
    { label: 'Isolement installation · minimum', valeur: pire(MES.ISO_I, 'min'), ok: s.done[MES.ISO_I] ? true : null },
    { label: 'Isolement moteur · minimum', valeur: pire(MES.ISO_M, 'min'), ok: s.done[MES.ISO_M] ? true : null },
    { label: 'Résistance de terre RA', valeur: v(MES.TERRE, 'ra'), ok: s.done[MES.TERRE] ? true : null },
    { label: 'Tension Ph1-N · fréquence', valeur: `${v(MES.TENS, 'l1n')} · ${v(MES.TENS, 'f')}`, ok: s.done[MES.TENS] ? true : null },
    { label: 'DDR Q2 · seuil IΔN · temps ΔT à IΔn', valeur: `${v(MES.DDR, 'idn')} · ${v(MES.DDR, 'dt1')}`, ok: s.done[MES.DDR] ? true : null },
    { label: 'Ordre des phases', valeur: v(MES.PHASES, 'rot'), ok: s.done[MES.PHASES] ? true : null },
    { label: 'Réserves levées', valeur: [s.mesures[MES.CONT]?.levee ? 'garde-corps relié' : null, s.mesures[MES.PHASES]?.levee ? 'phases permutées' : null].filter(Boolean).join(' · ') || '—', ok: null },
  ];
}

/** La mise en service peut-elle être prononcée ? */
export const miseEnServicePrononcee = (s: MesState): boolean =>
  Array.from({ length: MES.PV }, (_, i) => i).every((i) => s.done[i]);

/** Procès-verbal en texte (rapport envoyé au professeur). */
export function rapportPv(s: MesState): string {
  const l = lignesPv(s);
  return [
    'PROCÈS-VERBAL DE MISE EN SERVICE · STATION DE RELEVAGE SR1',
    '',
    ...l.map((x) => `${x.label.padEnd(40, '.')} ${x.valeur}`),
    '',
    `Décision : ${miseEnServicePrononcee(s) ? 'mise en service prononcée' : 'mise en service NON prononcée'}`,
  ].join('\n');
}
