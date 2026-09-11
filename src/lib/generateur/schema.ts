/**
 * Contrat de sortie du générateur : schémas des outils Anthropic (`tool_use`, seule façon
 * fiable d'obtenir du JSON valide) et types TypeScript correspondants.
 *
 * La génération est découpée en TROIS appels courts, un outil par appel :
 *   `rediger_pedagogie`  → dossier pédagogique (objectifs, matériel, activités, critères, quiz) ;
 *   `rediger_maquette`   → maquette jouable (slots, liaisons, mesures, postes, pannes, moteur) ;
 *   `reparer_maquette`   → passe de réparation ciblée : seules les sections corrigées reviennent.
 *
 * Module PUR (aucun appel réseau) : les relectures défensives sont testables seules.
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

/**
 * Champs que le professeur a laissés vides et que le modèle a complétés lui-même.
 * Ils portent la pastille « proposé par l'IA » dans le studio : c'est ce qu'il faut
 * relire en priorité.
 */
export type ChampDeduit = 'competences' | 'activites' | 'materiel' | 'scene' | 'annexe' | 'duree';

export const CHAMPS_DEDUITS: ChampDeduit[] = ['competences', 'activites', 'materiel', 'scene', 'annexe', 'duree'];

export const estChampDeduit = (v: unknown): v is ChampDeduit =>
  typeof v === 'string' && (CHAMPS_DEDUITS as string[]).includes(v);

export interface PedagogieGeneree {
  objectifs: string[];
  materiel: string[];
  activites: ActiviteGeneree[];
  criteres: CritereGenere[];
  quiz: QuestionGeneree[];
  /* -- complété par le modèle quand le professeur a laissé le champ vide -- */
  scene?: SceneKind;
  annex?: AnnexKind;
  /** Durée totale retenue, en minutes. */
  duree?: number;
  /** Champs que le modèle a choisis lui-même. */
  deductions?: ChampDeduit[];
}

/** Un appareil retenu par l'appel « choix du matériel ». */
export interface ChoixAppareil {
  key: string;
  /** Repère envisagé sur la platine : Q1, KM1, X1… */
  rep: string;
  /** À quoi il sert dans ce TP, en une ligne. */
  role: string;
}

/** Sortie de l'appel « choix du matériel » (premier temps de la sélection). */
export interface ChoixMateriel {
  scene: SceneKind;
  annex: AnnexKind;
  materiel: ChoixAppareil[];
  commentaire: string;
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

const ACTIVITE = {
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
} as const;

const CRITERE = {
  type: 'object',
  required: ['code', 'critere', 'source', 'etape'],
  properties: {
    code: { type: 'string', description: 'Code de compétence du référentiel fourni' },
    critere: { type: 'string', description: 'Critère observable' },
    source: { type: 'string', enum: ['simulateur', 'professeur'] },
    etape: { type: 'integer', minimum: 0, maximum: 10 },
  },
} as const;

/** Appel 1 : dossier pédagogique seul (c'est lui qui reçoit le dossier technique joint). */
export const OUTIL_PEDAGOGIE = {
  name: 'rediger_pedagogie',
  description:
    'Rend le dossier pédagogique du TP : objectifs, matériel, activités (contexte, consignes, ' +
    'correction, sécurité), critères d’évaluation et quiz. Les codes de compétences proviennent ' +
    'du référentiel fourni. Aucune maquette ici.',
  input_schema: {
    type: 'object',
    required: ['objectifs', 'materiel', 'activites', 'criteres', 'quiz'],
    properties: {
      objectifs: { type: 'array', items: { type: 'string' }, minItems: 2 },
      materiel: { type: 'array', items: { type: 'string' }, minItems: 1 },
      activites: { type: 'array', items: ACTIVITE, minItems: 1 },
      criteres: { type: 'array', items: CRITERE, minItems: 3 },
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
      scene: {
        type: 'string',
        enum: ['ind', 'hab', 'ter', 'pv'],
        description: 'Type d’installation déduit du thème si le professeur ne l’a pas imposé',
      },
      annex: {
        type: 'string',
        enum: ['door', 'room', 'local', 'roof'],
        description: 'Colonne annexe qui va avec la scène : porte d’armoire, pièce, local, toiture',
      },
      duree: { type: 'integer', description: 'Durée totale retenue, en minutes' },
      deductions: {
        type: 'array',
        items: { type: 'string', enum: ['competences', 'activites', 'materiel', 'scene', 'annexe', 'duree'] },
        description:
          'Champs que TU as choisis toi-même parce que le professeur les avait laissés libres. ' +
          'Ils seront signalés « proposé par l’IA » pour qu’il les relise en priorité.',
      },
    },
  },
} as const;

/** Appel « choix du matériel » : le modèle pioche dans la bibliothèque COMPLÈTE. */
export const OUTIL_MATERIEL = {
  name: 'choisir_materiel',
  description:
    'Choisit, dans la bibliothèque complète fournie, les appareils nécessaires au TP et leur ' +
    'repère sur la platine. Aucune maquette ici : seulement la liste du matériel retenu, la ' +
    'scène et la colonne annexe. Toutes les clés proviennent de la bibliothèque fournie.',
  input_schema: {
    type: 'object',
    required: ['scene', 'annex', 'materiel', 'commentaire'],
    properties: {
      scene: { type: 'string', enum: ['ind', 'hab', 'ter', 'pv'] },
      annex: { type: 'string', enum: ['door', 'room', 'local', 'roof'] },
      materiel: {
        type: 'array',
        minItems: 4,
        maxItems: 40,
        items: {
          type: 'object',
          required: ['key', 'rep', 'role'],
          properties: {
            key: { type: 'string', description: 'Clé EXACTE de la bibliothèque fournie' },
            rep: { type: 'string', description: 'Repère envisagé : Q1, KM1, F1, S1, H1, X1…' },
            role: { type: 'string', description: 'Rôle de l’appareil dans ce TP, une ligne' },
          },
        },
      },
      commentaire: { type: 'string', description: 'Pourquoi ce choix de matériel, deux phrases' },
    },
  },
} as const;

/** Appel 2 : maquette jouable seule (contexte léger : résumé du dossier, pas les documents). */
export const OUTIL_MAQUETTE = {
  name: 'rediger_maquette',
  description:
    'Rend la maquette jouable du TP : appareils posés, liaisons, mesures (sans min ni max), ' +
    'postes de choix de matériel, pannes injectables et moteur. Toutes les clés d’appareils et ' +
    'les identifiants de pannes proviennent des listes fournies.',
  input_schema: {
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
} as const;

/** Appel 3 : réparation ciblée. Le modèle ne renvoie QUE les sections qu'il corrige. */
export const OUTIL_REPARATION = {
  name: 'reparer_maquette',
  description:
    'Corrige les anomalies relevées par le moteur de simulation. Ne renvoie QUE les sections ' +
    'modifiées : chaque section fournie remplace intégralement celle de la version fautive, ' +
    'les sections absentes sont conservées telles quelles.',
  input_schema: {
    type: 'object',
    required: ['corrections'],
    properties: {
      slots: { type: 'array', items: SLOT, description: 'Remplace tous les appareils posés' },
      liaisons: { type: 'array', items: LIAISON, description: 'Remplace toutes les liaisons' },
      mesures: { type: 'array', items: MESURE, description: 'Remplace toutes les mesures' },
      postes: { type: 'array', items: POSTE, description: 'Remplace tous les postes de choix' },
      pannes: { type: 'array', items: { type: 'string', enum: ['a2', 's1', 'l2', 'x2', 'f3'] } },
      motor: {
        type: ['object', 'null'],
        properties: {
          P: { type: 'number' }, U: { type: 'number' }, In: { type: 'number' },
          n: { type: 'number' }, ns: { type: 'number' }, cosPhi: { type: 'number' },
        },
      },
      activites: { type: 'array', items: ACTIVITE, description: 'Remplace les activités du dossier' },
      criteres: { type: 'array', items: CRITERE, description: 'Remplace les critères d’évaluation' },
      corrections: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Ce qui a été corrigé, une phrase par correction, en français',
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

const lireMoteur = (v: unknown): MoteurGenere | null => {
  const o = obj(v);
  return o
    ? {
      P: num(o.P, 1500), U: num(o.U, 400), In: num(o.In, 3.3),
      n: num(o.n, 1440), ns: num(o.ns, 1500), cosPhi: num(o.cosPhi, 0.8),
    }
    : null;
};

/** Relit la sortie de `rediger_pedagogie` ; `null` si elle n'a pas la forme attendue. */
export function lirePedagogieOutil(input: unknown): PedagogieGeneree | null {
  const p = obj(input);
  if (!p) return null;
  const activites = arr(p.activites).map(lireActivite).filter((x): x is ActiviteGeneree => x !== null);
  if (!activites.length) return null;
  const deductions = arr(p.deductions).filter(estChampDeduit);
  return {
    objectifs: strList(p.objectifs),
    materiel: strList(p.materiel),
    activites,
    criteres: arr(p.criteres).map(lireCritere).filter((x): x is CritereGenere => x !== null),
    quiz: arr(p.quiz).flatMap((q) => {
      const o = obj(q);
      if (!o || typeof o.q !== 'string') return [];
      const options = strList(o.options);
      if (options.length < 2) return [];
      return [{ q: o.q, options, answer: Math.max(0, Math.min(options.length - 1, num(o.answer, 0))) }];
    }),
    ...(SCENES.includes(p.scene as SceneKind) ? { scene: p.scene as SceneKind } : {}),
    ...(ANNEXES.includes(p.annex as AnnexKind) ? { annex: p.annex as AnnexKind } : {}),
    ...(typeof p.duree === 'number' && p.duree > 0 ? { duree: Math.round(p.duree) } : {}),
    ...(deductions.length ? { deductions: Array.from(new Set(deductions)) } : {}),
  };
}

/** Relit la sortie de `choisir_materiel` ; `null` si aucun appareil exploitable. */
export function lireChoixMateriel(input: unknown): ChoixMateriel | null {
  const o = obj(input);
  if (!o) return null;
  const vus = new Set<string>();
  const materiel: ChoixAppareil[] = arr(o.materiel).flatMap((m) => {
    const x = obj(m);
    if (!x || typeof x.key !== 'string' || !x.key.trim()) return [];
    const key = x.key.trim();
    if (vus.has(key)) return [];
    vus.add(key);
    return [{ key, rep: str(x.rep).trim(), role: str(x.role).trim() }];
  });
  if (!materiel.length) return null;
  return {
    scene: SCENES.includes(o.scene as SceneKind) ? (o.scene as SceneKind) : 'ind',
    annex: ANNEXES.includes(o.annex as AnnexKind) ? (o.annex as AnnexKind) : 'door',
    materiel,
    commentaire: str(o.commentaire),
  };
}

/** Relit la sortie de `rediger_maquette` ; `null` si elle n'a pas la forme attendue. */
export function lireMaquetteOutil(input: unknown): MaquetteGeneree | null {
  const m = obj(input);
  if (!m) return null;
  const slots = arr(m.slots).map(lireSlot).filter((s): s is Slot => s !== null);
  if (!slots.length) return null;

  const plaqueBrute = obj(m.plaque);
  const plaque: Record<string, string> = {};
  if (plaqueBrute) {
    for (const [k, v] of Object.entries(plaqueBrute)) if (typeof v === 'string') plaque[k] = v;
  }

  return {
    scene: SCENES.includes(m.scene as SceneKind) ? (m.scene as SceneKind) : 'ind',
    annex: ANNEXES.includes(m.annex as AnnexKind) ? (m.annex as AnnexKind) : 'door',
    slots,
    liaisons: arr(m.liaisons).map(lireLiaison).filter((l): l is Liaison => l !== null),
    mesures: arr(m.mesures).map(lireMesure).filter((x): x is MesureGeneree => x !== null),
    postes: arr(m.postes).map(lirePoste).filter((x): x is Poste => x !== null),
    pannes: strList(m.pannes),
    motor: lireMoteur(m.motor),
    ...(typeof m.titre === 'string' ? { titre: m.titre } : {}),
    ...(typeof m.resume === 'string' ? { resume: m.resume } : {}),
    ...(typeof m.situation === 'string' ? { situation: m.situation } : {}),
    cahierDesCharges: arr(m.cahierDesCharges).flatMap((l) => {
      const o = obj(l);
      return o && typeof o.k === 'string' && typeof o.v === 'string' ? [{ k: o.k, v: o.v }] : [];
    }),
    ...(Object.keys(plaque).length ? { plaque } : {}),
  };
}

/** Sections corrigées renvoyées par `reparer_maquette` (tout est facultatif sauf le journal). */
export interface Reparation {
  slots?: Slot[];
  liaisons?: Liaison[];
  mesures?: MesureGeneree[];
  postes?: Poste[];
  pannes?: string[];
  motor?: MoteurGenere | null;
  activites?: ActiviteGeneree[];
  criteres?: CritereGenere[];
  corrections: string[];
}

/** Relit la sortie de `reparer_maquette` ; `null` si elle ne corrige rien d'exploitable. */
export function lireReparation(input: unknown): Reparation | null {
  const o = obj(input);
  if (!o) return null;
  const rep: Reparation = { corrections: strList(o.corrections) };
  if (Array.isArray(o.slots)) rep.slots = arr(o.slots).map(lireSlot).filter((s): s is Slot => s !== null);
  if (Array.isArray(o.liaisons)) rep.liaisons = arr(o.liaisons).map(lireLiaison).filter((l): l is Liaison => l !== null);
  if (Array.isArray(o.mesures)) rep.mesures = arr(o.mesures).map(lireMesure).filter((x): x is MesureGeneree => x !== null);
  if (Array.isArray(o.postes)) rep.postes = arr(o.postes).map(lirePoste).filter((x): x is Poste => x !== null);
  if (Array.isArray(o.pannes)) rep.pannes = strList(o.pannes);
  if ('motor' in o) rep.motor = lireMoteur(o.motor);
  if (Array.isArray(o.activites)) {
    rep.activites = arr(o.activites).map(lireActivite).filter((x): x is ActiviteGeneree => x !== null);
  }
  if (Array.isArray(o.criteres)) {
    rep.criteres = arr(o.criteres).map(lireCritere).filter((x): x is CritereGenere => x !== null);
  }
  const change = ['slots', 'liaisons', 'mesures', 'postes', 'pannes', 'motor', 'activites', 'criteres'] as const;
  return change.some((k) => rep[k] !== undefined) ? rep : null;
}

/**
 * Applique une réparation : chaque section fournie remplace celle de la version fautive,
 * les sections absentes sont conservées. Aucune fusion fine, pour rester prévisible.
 */
export function appliquerReparation(base: ResultatGeneration, rep: Reparation): ResultatGeneration {
  return {
    pedagogie: {
      ...base.pedagogie,
      ...(rep.activites && rep.activites.length ? { activites: rep.activites } : {}),
      ...(rep.criteres && rep.criteres.length ? { criteres: rep.criteres } : {}),
    },
    maquette: {
      ...base.maquette,
      ...(rep.slots && rep.slots.length ? { slots: rep.slots } : {}),
      ...(rep.liaisons ? { liaisons: rep.liaisons } : {}),
      ...(rep.mesures ? { mesures: rep.mesures } : {}),
      ...(rep.postes ? { postes: rep.postes } : {}),
      ...(rep.pannes ? { pannes: rep.pannes } : {}),
      ...(rep.motor !== undefined ? { motor: rep.motor } : {}),
    },
  };
}
