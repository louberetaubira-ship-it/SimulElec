// ---------- Domain types shared by the simulator, the TP engine and the UI ----------

export type NetKind = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'C'; // C = circuit de commande

export type DeviceKind =
  | 'main' | 'mcb' | 'rcd' | 'motorcb' | 'contactor' | 'thermal'
  | 'meter' | 'bus' | 'terminal' | 'lamp' | 'button' | 'sign' | 'misc';

/** A terminal position, relative to the device box (fractions 0..1). */
export interface TerminalDef {
  id: string;        // ex: "1", "2", "A1", "13", "95"
  fx: number;
  fy: number;
}

/** Catalogue entry = one photo sprite + its electrical identity. */
export interface CatalogueItem {
  key: string;             // sprite key (public/sprites/<key>.png, <key>-on.png, <key>-off.png)
  name: string;            // ex: "Disjoncteur moteur GV2ME08"
  ref: string;             // ex: "GV2ME08"
  brand?: string;
  kind: DeviceKind;
  family: string;          // palette category: Disjoncteurs, Différentiels, Borniers, ...
  modules: number;         // 18 mm modules
  poles: number;
  In?: number;             // rated current (A)
  range?: [number, number];// adjustable range (A) for GV2 / LRD
  coil?: number;           // coil voltage (V) for contactors
  terminals: TerminalDef[];
  switchable: boolean;     // has on/off sprite states
  w: number;               // display width px (logical panel units)
  h: number;
}

export interface Slot {
  id: string;              // device designation on the schema: Q1, KM1, F1, X1, X2, S1S2...
  label: string;
  key: string;             // expected catalogue key
  rail: number | null;     // null = on the door / free position
  x: number;
  y?: number;              // only for free positions
  /** Repérage court affiché sous une borne de bornier (« 1 », « 2 »…). */
  mark?: string;
  /** Conducteur repéré sous le repère (« L1 », « N », « PE », « U »…). */
  sub?: string;
  /** Bornier d'appartenance (« X1 », « X2 ») : sert à dessiner l'étiquette de groupe. */
  group?: string;
  /** Étiquette du bornier, portée par la première borne du groupe. */
  groupLabel?: string;
}

/** A wire the student must realise. Both ends are "<slotId>.<terminalId>" or a source id. */
export interface Liaison {
  a: string;
  b: string;
  net: NetKind;
  prewired?: boolean;      // done by the "installer" (ex: réseau → X1), shown but not requested
}

export interface PosteOption { ref: string; spec: string; ok?: boolean; half?: boolean; why: string; key: string }
export interface Poste { id: string; name: string; need: string; options: PosteOption[] }

export interface TestHorsTension { id: string; title: string; how: string; expected: string }

export interface MeasurePoint { id: string; label: string; instrument: 'dmm' | 'clamp' | 'tacho' | 'mega' }

export interface ExpectedMeasure { id: string; title: string; point: string; min: number; max: number; unit: string; stage: 'service' }

export interface Fault { id: string; title: string; symptom: string; fix: string }

export interface TpDefinition {
  id: string;
  title: string;
  level: string;
  competences: string[];
  summary: string;
  situation: string;
  plaque: Record<string, string>;
  cahierDesCharges: { k: string; v: string }[];
  postes: Poste[];
  rails: number[];               // y of each rail (logical px)
  slots: Slot[];
  liaisons: Liaison[];
  tests: TestHorsTension[];
  measurePoints: MeasurePoint[];
  expected: ExpectedMeasure[];
  faults: Fault[];
  quiz: { q: string; options: string[]; answer: number }[];
  motor: { P: number; U: number; In: number; n: number; ns: number; cosPhi: number };
}

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
  readings: { instrument: string; point: string; value: number; display: string; stage: number; at: string }[];
  fault: string | null;
  diagnosis: string | null;
  diagTries: number;
  fixed: boolean;
  quiz: number | null;
}
