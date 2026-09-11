// ---------- Domain types shared by the simulator, the TP engine and the UI (v3) ----------

import type { DiplomaId } from './data/competences';

/**
 * Barème d'un TP : poids de chaque étape (points sur 100) et coût des gestes fautifs.
 * Le barème par défaut (`DEFAULT_BAREME`, voir `src/lib/sim/progress.ts`) reproduit
 * exactement la notation historique ; un TP peut le surcharger partiellement via
 * `tps.definition.bareme` (`TpDefinition.bareme`).
 */
export interface Bareme {
  /** Points attribués à chaque ligne de note (total 100 par défaut). */
  poids: {
    materiel: number; pose: number; cablage: number; tests: number; epi: number;
    hors: number; sous: number; diag: number; quiz: number;
  };
  /** Points retirés par erreur de pose. */
  coutErreurPose: number;
  /** Points retirés par liaison de câblage refusée. */
  coutErreurCablage: number;
  /** Points retirés par fil retiré (geste de correction). */
  coutFilRetire: number;
  /** Points retirés par réinitialisation du câblage. */
  coutReset: number;
  /** Plafond (points) de la pénalité des gestes de correction. */
  coutCorrectionMax: number;
  /** Pénalité (score 0..1 de l'étape) par ouverture d'un rappel de cours. */
  coutAide: number;
}

/** Surcharge partielle du barème par un TP. */
export type BaremeOverride = Partial<Omit<Bareme, 'poids'>> & { poids?: Partial<Bareme['poids']> };

/** Conducteurs : L1/L2/L3/N/PE, C = commande 24 V (+), C0 = 0 V commande, DC+/DC- = photovoltaïque. */
export type NetKind = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'C' | 'C0' | 'DC+' | 'DC-';

export type DeviceKind =
  | 'main' | 'mcb' | 'rcd' | 'motorcb' | 'contactor' | 'thermal'
  | 'meter' | 'bus' | 'terminal' | 'lamp' | 'button' | 'sign' | 'misc'
  | 'trafo' | 'plc' | 'pv' | 'inverter' | 'battery' | 'dc';

/** Type d'installation : détermine le visuel de la platine (couleurs, goulottes, annexe). */
export type SceneKind = 'ind' | 'hab' | 'ter' | 'pv';
/** Contenu de la colonne de droite. */
export type AnnexKind = 'door' | 'room' | 'local' | 'roof';

/** A terminal position, relative to the device box (fractions 0..1). */
export interface TerminalDef {
  id: string;        // ex: "1", "2", "A1", "13", "95", "DC+"
  fx: number;
  fy: number;
}

/** Catalogue entry = one photo sprite (or SVG component) + its electrical identity. */
export interface CatalogueItem {
  key: string;             // sprite key (public/sprites/<key>.png, <key>-on.png, <key>-off.png) or library key
  name: string;
  ref: string;
  brand?: string;
  kind: DeviceKind;
  family: string;
  modules: number;
  poles: number;
  In?: number;
  range?: [number, number];
  coil?: number;
  terminals: TerminalDef[];
  switchable: boolean;
  w: number;               // display width px (logical panel units, 560×720)
  h: number;
  /** Rendu par un composant SVG (trafo, plc, pv…) plutôt qu'un <img>. */
  svg?: boolean;
  /** Source image (data URI) pour les éléments de bibliothèque chargés dynamiquement. */
  src?: string;
  /** Borne étroite (16 px) : bornier. */
  small?: boolean;
  /** Se pose en annexe (porte / pièce / toiture) plutôt que sur un rail. */
  door?: boolean;
}

/** Élément de bibliothèque (public/lib/<famille>.json). */
export interface LibraryItem {
  key: string;
  name: string;
  w: number;
  h: number;
  src: string;
  terminals: TerminalDef[];
  small: boolean;
  door: boolean;
}
export interface LibraryFamily { family: string; file: string; count: number; keys: string[] }

export interface Slot {
  id: string;              // Q1, KM1, F1, x1_1, x2_3, … (identifiant technique)
  label: string;
  key: string;             // catalogue / library key
  rail: number | null;     // null = annexe (porte, pièce, toiture) ; 3 = annexe en atelier libre
  x: number;
  y?: number;              // annexe : position absolue
  w?: number;              // annexe : taille imposée
  h?: number;
  /** Repère affiché (Q1, KM1, T1, DDR1, PV1…). */
  rep?: string;
  /** Repérage court affiché sous une borne de bornier (« 1 », « 2 »…). */
  mark?: string;
  /** Conducteur repéré sous le repère (« L1 », « N », « PE », « U »…). */
  sub?: string;
  /** Bornier d'appartenance (« X1 », « X2 »). */
  group?: string;
  groupLabel?: string;
}

/** A wire the student must realise. Both ends are "<slotId>.<terminalId>", "RES.L1", "M.U1", "S1.21", "H1.X1"… */
export interface Liaison {
  a: string;
  b: string;
  net: NetKind;
  prewired?: boolean;      // fait par l'installateur (réseau → X1, câble moteur…)
  door?: boolean;          // liaison en porte
}

export interface PosteOption { ref: string; spec: string; ok?: boolean; half?: boolean; why: string; key: string }
export interface Poste { id: string; name: string; need: string; options: PosteOption[] }

export interface TestHorsTension { id: string; title: string; how: string; expected: string }

/** Instrument utilisable à l'étape mesures. */
export type InstrumentKind = 'mm' | 'clamp' | 'ctrl' | 'vat' | 'tach';

/** Mesure attendue dans une étape (hors ou sous tension). */
export interface ExpectedMeasure {
  id: string;
  title: string;
  stage: 'horsTension' | 'sousTension';
  instrument: InstrumentKind;
  /** Position du sélecteur attendue (« V~ », « Ω », « RISO 500 V », « A~ »…). */
  dial: string;
  /** Bornes attendues (ordre indifférent) ; pour la pince : identifiant de liaison « a>b ». */
  a?: string;
  b?: string;
  wire?: string;
  min: number;
  max: number;
  unit: string;
  /** Condition : moteur en marche, commande sous tension… */
  when?: 'run' | 'ctl' | 'off';
}

export interface Fault { id: string; title: string; symptom: string; fix: string }

/** Réseau électrique d'une borne, pour le calcul des mesures (voir lib/sim/mesures.ts). */
export interface TerminalNet {
  net: NetKind | 'U' | 'V' | 'W' | 'M2' | 'M' | 'I0' | 'I1' | 'I2' | 'Q0' | 'Q1' | 'Q2';
  /** Condition de présence de tension : 'always' | 'q1' | 'ctl' | 'run' | 'f2' | 'f3' | 'km1' | 'off'. */
  live: 'always' | 'q1' | 'ctl' | 'run' | 'f2' | 'f3' | 'km1' | 'off';
}

/**
 * Élément d'annexe (pièce / local / toiture) ou du bloc récepteurs.
 * - dans `annexItems` : x / y absolus dans la scène (colonne de droite) ;
 * - dans `recvItems` : x / y relatifs au bloc récepteurs (voir `recvBox`), et `recv: true`.
 */
export interface AnnexItem {
  key: string; rep: string; name: string; x: number; y: number; w: number; h: number;
  /** Récepteur du bloc du bas : bornes sur le bord haut, cheminement par la goulotte 4 et un presse-étoupe. */
  recv?: boolean;
}

/**
 * Nature du parcours :
 * - `platine` (défaut) : les 11 étapes de câblage / mesures sur la platine ;
 * - `dimensionnement` : étude et dimensionnement (aucune platine, aucun câblage).
 */
export type TpKind = 'platine' | 'dimensionnement';

export interface TpDefinition {
  id: string;
  title: string;
  level: string;
  family: 'ind' | 'hab' | 'ter' | 'pv';
  /** Type de parcours ; absent = `'platine'`. */
  kind?: TpKind;
  scene: SceneKind;
  annex: AnnexKind;
  /** Jouable de bout en bout (liaisons + mesures définies). Sinon affiché « prévu ». */
  playable: boolean;
  competences: string[];
  summary: string;
  situation: string;
  plaque: Record<string, string>;
  cahierDesCharges: { k: string; v: string }[];
  postes: Poste[];
  rails: number[];               // y de chaque rail (unités logiques, 560×920)
  slots: Slot[];
  /** Éléments posés en annexe (pièce, local, toiture). Vide pour 'door' (station dessinée en code). */
  annexItems: AnnexItem[];
  /** Récepteurs du bloc sous la platine (hublot, chauffe-eau, VMC, réglettes, BAES, convecteur…). */
  recvItems?: AnnexItem[];
  liaisons: Liaison[];
  /** Table borne → réseau pour les mesures. Clé « slot.borne » ; les préfixes RES/M/S1/S2/H1/H2 sont gérés en code. */
  nets: Record<string, TerminalNet>;
  tests: TestHorsTension[];
  mesures: ExpectedMeasure[];
  faults: Fault[];
  quiz: { q: string; options: string[]; answer: number }[];
  motor: { P: number; U: number; In: number; n: number; ns: number; cosPhi: number } | null;
  /** Automate : affectation des E/S (TP M221). */
  plcIo?: { io: string; label: string; device: string }[];
  station: boolean;
  hasMotor: boolean;
  /** Diplômes visés par le TP (colonne `tps.diplomas` / bloc studio). */
  diplomas?: DiplomaId[];
  /** Barème propre au TP (surcharge partielle de `DEFAULT_BAREME`). */
  bareme?: BaremeOverride;
}

/** Lecture d'instrument persistée. */
export interface ReadingRecord {
  instrument: InstrumentKind;
  dial: string;
  a?: string;
  b?: string;
  wire?: string;
  value: number | null;
  display: string;
  stage: number;
  at: string;
  /** Identifiant de la mesure attendue validée, s'il y en a une. */
  expectedId?: string;
}

/**
 * Mode de passage d'un TP.
 * - `entrainement` : aide illimitée, reprises libres, pas de chronomètre, note indicative ;
 * - `evaluation` : aide comptée et limitée, chronomètre affiché, une seule tentative, note retenue.
 */
export type EvaluationMode = 'entrainement' | 'evaluation';

/** Auto-évaluation de l'élève : code de compétence → niveau qu'il se donne. */
export type AutoEval = Record<string, 'acquis' | 'enCours' | 'nonAcquis'>;

/** Student progress persisted in attempts.state (JSON). */
export interface AttemptState {
  stage: number;
  done: Record<number, boolean>;
  choices: Record<string, number>;
  placed: Record<string, boolean>;
  wires: { a: string; b: string; net: NetKind }[];
  wireErrors: number;
  poseErrors: number;
  tests: Record<string, string>;
  /** EPI cochés. */
  epi: Record<string, boolean>;
  /** Consignation : séparation, condamnation, identification, VAT sur source, VAT aval (paires), re-vérification. */
  cons: { sep: boolean; lock: boolean; ident: boolean; vatRef: boolean; vat: [string, string][]; vatRef2: boolean };
  decons: { unlock: boolean; close: boolean; essai: boolean };
  readings: ReadingRecord[];
  fault: string | null;
  diagnosis: string | null;
  diagTries: number;
  fixed: boolean;
  quiz: number | null;
  /** Nombre d'ouvertures de l'aide « rappel de cours », par étape (pèse sur l'évaluation). */
  helpUsed: Record<number, number>;
  /**
   * Fils retirés par l'élève depuis le début de la tentative (geste de correction).
   * Ajouté après coup : les tentatives déjà en base valent 0 (voir `normalizeState`).
   */
  wiresRemoved: number;
  /** Réinitialisations de câblage demandées (étape ou platine entière). */
  resets: number;
  /**
   * Mode choisi au lancement du TP. Absent = non encore choisi (l'élève choisit) ;
   * les tentatives enregistrées avant cette évolution sont relues en « entraînement »
   * (valeur sûre : aucune contrainte rétroactive) — voir `normalizeState`.
   */
  mode?: EvaluationMode;
  /** Mode imposé par le professeur au moment d'affecter le TP (l'élève ne peut pas en changer). */
  modeImpose?: boolean;
  /** Horodatage ISO du début de la tentative (chronomètre du mode évaluation). */
  startedAt?: string;
  /** Auto-évaluation faite par l'élève avant l'affichage du bilan. */
  autoEval?: AutoEval;
  /** L'auto-évaluation a été validée par l'élève. */
  autoEvalDone?: boolean;
}

/** Montage de l'atelier libre (table projects.data). */
export interface FreeProject {
  scene: SceneKind;
  slots: (Slot & { w: number; h: number; y: number })[];
  wires: { a: string; b: string; net: NetKind }[];
}
