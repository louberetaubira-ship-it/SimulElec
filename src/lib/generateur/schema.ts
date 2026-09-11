/**
 * Contrat de sortie du générateur : schéma de l'outil Anthropic (`tool_use`, seule façon
 * fiable d'obtenir du JSON valide) et types TypeScript correspondants.
 *
 * Module PUR (aucun appel réseau) : la relecture défensive `lireResultat` est testable seule.
 */
import type { AnnexKind, ExpectedMeasure, Liaison, NetKind, Poste, PosteOption, SceneKind, Slot } from '@/lib/types';

/* ------------------------------------------------------------------ types */

/** Critère d'évaluation observable, rattaché à une compétence et à une étape du parcours. */
export interface CritereGenere {
  code: string;
  critere: string;
  source: 'simulateur' | 'professeur';
  /** Étape du parcours (0 à 10). */
  etape: number;
}

/** Activité du dossier pédagogique. */
export interface ActiviteGeneree {
  titre: string;
  /** Durée en minutes. */
  duree: number;
  contexte: string;
  consignes: string[];
  correction: string;
  securite?: string;
}

export interface QuestionGeneree { q: string; options: string[]; answer: number }

export interface PedagogieGeneree {
  objectifs: string[];
  materiel: string[];
  activites: ActiviteGeneree[];
  criteres: CritereGenere[];
  quiz: QuestionGeneree[];
}

/** Mesure attendue telle que la produit le modèle : sans `min` ni `max` (calculés par le vérificateur). */
export type MesureGeneree = Omit<ExpectedMeasure, 'min' | 'max'>;

export interface MoteurGenere { P: number; U: number; In: number; n: number; ns: number; cosPhi: number }

export interface MaquetteGeneree {
  scene: SceneKind;
  annex: AnnexKind;
  slots: Slot[];
  liaisons: Liaison[];
  mesures: MesureGeneree[];
  postes: Poste[];
  /** Identifiants de pannes injectables (liste fermée). */
  pannes: string[];
  motor: MoteurGenere | null;
  /* -- champs facultatifs : complètent le dossier, jamais indispensables -- */
  titre?: string;
  resume?: string;
  situation?: string;
  cahierDesCharges?: { k: string; v: string }[];
  plaque?: Record<string, string>;
}

export interface ResultatGeneration {
  pedagogie: PedagogieGeneree;
  maquette: MaquetteGeneree;
}

/* ----------------------------------------------------------------- schéma */

const SLOT = {
  type: 'object',
  required: ['id', 'label', 'key', 'rail', 'x'],
  properties: {
    id: { type: 'string', description: 'Identifiant technique en minuscules : q1, km1, x1_1…' },
    label: { type: 'string' },
    key: { type: 'string', description: 'Clé d’appareil du catalogue fourni' },
    rail: { type: ['integer', 'null'], description: '0, 1 ou 2 ; null pour un élément d’annexe' },
    x: { type: 'integer', description: 'Abscisse sur le rail (48 à 384)' },
    y: { type: 'integer' },
    rep: { type: 'string', description: 'Repère affiché : Q1, KM1, X1…' },
    mark: { type: 'string', description: 'Repère imprimé sous une borne de bornier' },
    sub: { type: 'string', description: 'Conducteur repéré : L1, N, PE, U…' },
    group: { type: 'string', description: 'Bornier d’appartenance : X1 ou X2' },
    groupLabel: { type: 'string' },
  },
} as const;

const LIAISON = {
  type: 'object',
  required: ['a', 'b', 'net'],
  properties: {
    a: { type: 'string', description: 'Extrémité « slot.borne »' },
    b: { type: 'string' },
    net: { type: 'string', enum: ['L1', 'L2', 'L3', 'N', 'PE', 'C', 'C0', 'DC+', 'DC-'] },
    prewired: { type: 'boolean', description: 'Câblage installateur : déjà en place' },
    door: { type: 'boolean', description: 'Liaison vers la porte' },
  },
} as const;

const POSTE = {
  type: 'object',
  required: ['id', 'name', 'need', 'options'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    need: { type: 'string', description: 'Besoin, formulé d’après le cahier des charges' },
    options: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        required: ['key', 'ref', 'spec', 'why'],
        properties: {
          key: { type: 'string', description: 'Clé d’appareil du catalogue' },
          ref: { type: 'string' },
          spec: { type: 'string' },
          ok: { type: 'boolean', description: 'true pour LA bonne référence — exactement une par poste' },
          half: { type: 'boolean', description: 'Fonctionne mais mal dimensionné' },
          why: { type: 'string' },
        },
      },
    },
  },
} as const;

const MESURE = {
  type: 'object',
  required: ['id', 'title', 'stage', 'instrument', 'dial', 'unit'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    stage: { type: 'string', enum: ['horsTension', 'sousTension'] },
    instrument: { type: 'string', enum: ['mm', 'clamp', 'ctrl', 'vat', 'tach'] },
    dial: { type: 'string', description: 'Position du sélecteur : V~, Ω, RISO 500 V, RPE 200 mA, A~, tr/min…' },
    a: { type: 'string', description: 'Première borne « slot.borne »' },
    b: { type: 'string', description: 'Seconde borne' },
    wire: { type: 'string', description: 'Pince : liaison serrée, « a>b »' },
    unit: { type: 'string', description: 'V, A, Ω, MΩ, tr/min' },
    when: { type: 'string', enum: ['run', 'ctl', 'off'] },
  },
} as const;

/** Outil Anthropic : l'unique sortie acceptée du modèle. */
export const OUTIL_TP = {
  name: 'rediger_tp',
  description:
    'Rend le dossier pédagogique et la maquette jouable du TP. Toutes les clés d’appareils, ' +
    'codes de compétences et identifiants de pannes doivent provenir des listes fournies.',
  input_schema: {
    type: 'object',
    required: ['pedagogie', 'maquette'],
    properties: {
      pedagogie: {
        type: 'object',
        required: ['objectifs', 'materiel', 'activites', 'criteres', 'quiz'],
        properties: {
          objectifs: { type: 'array', items: { type: 'string' }, minItems: 2 },
          materiel: { type: 'array', items: { type: 'string' }, minItems: 1 },
          activites: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['titre', 'duree', 'contexte', 'consignes', 'correction'],
              properties: {
                titre: { type: 'string' },
                duree: { type: 'integer', description: 'Durée en minutes' },
                contexte: { type: 'string', description: 'Situation professionnelle de l’activité' },
                consignes: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 2,
                  description: 'Consignes élève à l’impératif, numérotées dans l’ordre d’exécution',
                },
                correction: {
                  type: 'string',
                  description:
                    'Correction professeur : réponses attendues, points de vigilance sécurité, erreurs fréquentes. ' +
                    'AUCUNE valeur numérique de tension, courant, résistance ou isolement.',
                },
                securite: { type: 'string' },
              },
            },
          },
          criteres: {
            type: 'array',
            minItems: 3,
            items: {
              type: 'object',
              required: ['code', 'critere', 'source', 'etape'],
              properties: {
                code: { type: 'string', description: 'Code de compétence du référentiel fourni' },
                critere: { type: 'string', description: 'Critère observable' },
                source: { type: 'string', enum: ['simulateur', 'professeur'] },
                etape: { type: 'integer', minimum: 0, maximum: 10 },
              },
            },
          },
          quiz: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              required: ['q', 'options', 'answer'],
              properties: {
                q: { type: 'string' },
                options: { type: 'array', items: { type: 'string' }, minItems: 2 },
                answer: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
      maquette: {
        type: 'object',
        required: ['scene', 'annex', 'slots', 'liaisons', 'mesures', 'postes', 'pannes', 'motor'],
        properties: {
          scene: { type: 'string', enum: ['ind', 'hab', 'ter', 'pv'] },
          annex: { type: 'string', enum: ['door', 'room', 'local', 'roof'] },
          slots: { type: 'array', items: SLOT, minItems: 3 },
          liaisons: { type: 'array', items: LIAISON, minItems: 3 },
          mesures: { type: 'array', items: MESURE, minItems: 2 },
          postes: { type: 'array', items: POSTE, minItems: 1 },
          pannes: {
            type: 'array',
            items: { type: 'string', enum: ['a2', 's1', 'l2', 'x2', 'f3'] },
            description: 'Identifiants de la liste fermée des pannes injectables',
          },
          motor: {
            type: ['object', 'null'],
            properties: {
              P: { type: 'number' }, U: { type: 'number' }, In: { type: 'number' },
              n: { type: 'number' }, ns: { type: 'number' }, cosPhi: { type: 'number' },
            },
          },
          titre: { type: 'string' },
          resume: { type: 'string' },
          situation: { type: 'string', description: 'Situation professionnelle, 3 à 6 phrases' },
          cahierDesCharges: {
            type: 'array',
            items: {
              type: 'object',
              required: ['k', 'v'],
              properties: { k: { type: 'string' }, v: { type: 'string' } },
            },
          },
          plaque: { type: 'object', description: 'Plaque signalétique : libellé → valeur' },
        },
      },
    },
  },
} as const;

/* ------------------------------------------------ relecture défensive */

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === 'string');

const SCENES: SceneKind[] = ['ind', 'hab', 'ter', 'pv'];
const ANNEXES: AnnexKind[] = ['door', 'room', 'local', 'roof'];
const NETS: NetKind[] = ['L1', 'L2', 'L3', 'N', 'PE', 'C', 'C0', 'DC+', 'DC-'];
const INSTS: ExpectedMeasure['instrument'][] = ['mm', 'clamp', 'ctrl', 'vat', 'tach'];

function lireSlot(v: unknown): Slot | null {
  const o = obj(v);
  if (!o || typeof o.id !== 'string' || typeof o.key !== 'string') return null;
  const slot: Slot = {
    id: o.id,
    label: str(o.label, o.id),
    key: o.key,
    rail: typeof o.rail === 'number' && Number.isFinite(o.rail) ? o.rail : null,
    x: num(o.x, 52),
  };
  if (typeof o.y === 'number') slot.y = o.y;
  if (typeof o.w === 'number') slot.w = o.w;
  if (typeof o.h === 'number') slot.h = o.h;
  for (const k of ['rep', 'mark', 'sub', 'group', 'groupLabel'] as const) {
    if (typeof o[k] === 'string') slot[k] = o[k] as string;
  }
  return slot;
}

function lireLiaison(v: unknown): Liaison | null {
  const o = obj(v);
  if (!o || typeof o.a !== 'string' || typeof o.b !== 'string') return null;
  return {
    a: o.a,
    b: o.b,
    net: NETS.includes(o.net as NetKind) ? (o.net as NetKind) : 'L1',
    prewired: o.prewired === true,
    door: o.door === true,
  };
}

function lirePoste(v: unknown): Poste | null {
  const o = obj(v);
  if (!o || typeof o.id !== 'string') return null;
  const options: PosteOption[] = arr(o.options).flatMap((x) => {
    const p = obj(x);
    if (!p) return [];
    return [{
      key: str(p.key), ref: str(p.ref), spec: str(p.spec), why: str(p.why),
      ...(p.ok === true ? { ok: true } : {}), ...(p.half === true ? { half: true } : {}),
    }];
  });
  if (options.length < 2) return null;
  return { id: o.id, name: str(o.name, o.id), need: str(o.need), options };
}

function lireMesure(v: unknown): MesureGeneree | null {
  const o = obj(v);
  if (!o || typeof o.id !== 'string') return null;
  const m: MesureGeneree = {
    id: o.id,
    title: str(o.title, o.id),
    stage: o.stage === 'sousTension' ? 'sousTension' : 'horsTension',
    instrument: INSTS.includes(o.instrument as ExpectedMeasure['instrument'])
      ? (o.instrument as ExpectedMeasure['instrument'])
      : 'mm',
    dial: str(o.dial, 'V~'),
    unit: str(o.unit, 'V'),
  };
  if (typeof o.a === 'string') m.a = o.a;
  if (typeof o.b === 'string') m.b = o.b;
  if (typeof o.wire === 'string') m.wire = o.wire;
  if (o.when === 'run' || o.when === 'ctl' || o.when === 'off') m.when = o.when;
  return m;
}

function lireActivite(v: unknown): ActiviteGeneree | null {
  const o = obj(v);
  if (!o || typeof o.titre !== 'string') return null;
  const a: ActiviteGeneree = {
    titre: o.titre,
    duree: num(o.duree, 60),
    contexte: str(o.contexte),
    consignes: strList(o.consignes),
    correction: str(o.correction),
  };
  if (typeof o.securite === 'string') a.securite = o.securite;
  return a;
}

function lireCritere(v: unknown): CritereGenere | null {
  const o = obj(v);
  if (!o || typeof o.code !== 'string') return null;
  return {
    code: o.code,
    critere: str(o.critere),
    source: o.source === 'professeur' ? 'professeur' : 'simulateur',
    etape: Math.max(0, Math.min(10, Math.round(num(o.etape, 0)))),
  };
}

/** Relit la sortie brute de l'outil ; `null` si elle n'a pas la forme attendue. */
export function lireResultat(input: unknown): ResultatGeneration | null {
  const racine = obj(input);
  const p = racine ? obj(racine.pedagogie) : null;
  const m = racine ? obj(racine.maquette) : null;
  if (!p || !m) return null;

  const moteur = obj(m.motor);
  const plaqueBrute = obj(m.plaque);
  const plaque: Record<string, string> = {};
  if (plaqueBrute) {
    for (const [k, v] of Object.entries(plaqueBrute)) if (typeof v === 'string') plaque[k] = v;
  }

  return {
    pedagogie: {
      objectifs: strList(p.objectifs),
      materiel: strList(p.materiel),
      activites: arr(p.activites).map(lireActivite).filter((x): x is ActiviteGeneree => x !== null),
      criteres: arr(p.criteres).map(lireCritere).filter((x): x is CritereGenere => x !== null),
      quiz: arr(p.quiz).flatMap((q) => {
        const o = obj(q);
        if (!o || typeof o.q !== 'string') return [];
        const options = strList(o.options);
        if (options.length < 2) return [];
        return [{ q: o.q, options, answer: Math.max(0, Math.min(options.length - 1, num(o.answer, 0))) }];
      }),
    },
    maquette: {
      scene: SCENES.includes(m.scene as SceneKind) ? (m.scene as SceneKind) : 'ind',
      annex: ANNEXES.includes(m.annex as AnnexKind) ? (m.annex as AnnexKind) : 'door',
      slots: arr(m.slots).map(lireSlot).filter((s): s is Slot => s !== null),
      liaisons: arr(m.liaisons).map(lireLiaison).filter((l): l is Liaison => l !== null),
      mesures: arr(m.mesures).map(lireMesure).filter((x): x is MesureGeneree => x !== null),
      postes: arr(m.postes).map(lirePoste).filter((x): x is Poste => x !== null),
      pannes: strList(m.pannes),
      motor: moteur
        ? {
          P: num(moteur.P, 1500), U: num(moteur.U, 400), In: num(moteur.In, 3.3),
          n: num(moteur.n, 1440), ns: num(moteur.ns, 1500), cosPhi: num(moteur.cosPhi, 0.8),
        }
        : null,
      ...(typeof m.titre === 'string' ? { titre: m.titre } : {}),
      ...(typeof m.resume === 'string' ? { resume: m.resume } : {}),
      ...(typeof m.situation === 'string' ? { situation: m.situation } : {}),
      cahierDesCharges: arr(m.cahierDesCharges).flatMap((l) => {
        const o = obj(l);
        return o && typeof o.k === 'string' && typeof o.v === 'string' ? [{ k: o.k, v: o.v }] : [];
      }),
      ...(Object.keys(plaque).length ? { plaque } : {}),
    },
  };
}
