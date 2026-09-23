/**
 * Sujet PUBLIC : ce que le navigateur de l'élève reçoit d'un sujet numérique (module pur).
 *
 * Le corrigé reste sur le serveur : `sujetPublic(s)` retire de chaque question tout ce qui
 * révèle la réponse (bonnes cases, liens, rangs, valeurs attendues et tolérances, réponses
 * acceptées, formules, mots-clés, corrigé rédigé, explication, indice et aides, erreurs
 * typiques, valeurs des bulles et des cavaliers, repères à placer, liaisons attendues, image du
 * schéma corrigé). La correction passe par `POST /api/sujet/corriger`, les aides par
 * `POST /api/sujet/aide`, la remise par `POST /api/sujet/remettre`, le corrigé (réponses
 * attendues + explications, s'il est publié) par `GET /api/sujet/solution`.
 *
 * Toute l'interface élève (`src/components/sujet/*`, store, route `/sujet/[id]`) consomme ces
 * types ; seuls le serveur et la vue professeur (après vérification du rôle) manipulent le
 * `SujetNumerique` complet. Ce module n'importe AUCUNE donnée : il peut être importé par du
 * code client (les types, `estReponduePublique`, `texteReponsePublique`).
 */
import type {
  ChampValeur, CelluleSaisie, CorrectionQuestion, QBulles, QCalcul, QCavaliers, QCocher, QOrdonner, QPlacement,
  QRedige, QRelier, QSchema, QTableau, QValeur, QuestionBase, ReponseSujet, SchemaTraitsDef, SujetNumerique,
  SujetQuestion, SujetQuestionType,
} from './types';
import { latexVersTexte } from './formules-texte';

/* ───────────────────────────── types ───────────────────────────── */

/** Champs communs retirés de toute question publique (servis à la demande ou jamais). */
type ClesPriveesBase = 'indice' | 'aides' | 'erreursTypiques' | 'explication';

/** Base d'une question publique : l'énoncé, sans indice / aides / erreurs typiques / explication. */
export type QuestionPubliqueBase = Omit<QuestionBase, ClesPriveesBase> & {
  /** Nombre d'aides graduées disponibles (servies une par une par `POST /api/sujet/aide`). */
  nbAides: number;
};

/** Champ de saisie sans réponse attendue. */
export interface ChampPublic {
  id: string;
  label: string;
  unite?: string;
  placeholder?: string;
  /** `maths` : éditeur de maths (valeur LaTeX). */
  saisie?: 'texte' | 'maths';
  /** Le champ attend une FORMULE (corrigée par équivalence) : afficher l'éditeur de maths. */
  estFormule?: boolean;
  /** Réponse numérique attendue (clavier décimal sur mobile). */
  numerique?: boolean;
}

/** Cellule à saisir sans réponse attendue. */
export interface CellulePublique {
  id: string;
  /** Choix fermé (liste déroulante). */
  choix?: string[];
  placeholder?: string;
  saisie?: 'texte' | 'maths';
  estFormule?: boolean;
  numerique?: boolean;
}

export type QCocherPublique = Omit<QCocher, ClesPriveesBase | 'bonnes' | 'multiple'> & QuestionPubliqueBase & {
  /** Plusieurs cases possibles (QCM à réponses multiples). */
  multiple: boolean;
};
export type QRelierPublique = Omit<QRelier, ClesPriveesBase | 'liens'> & QuestionPubliqueBase;
export type QOrdonnerPublique = Omit<QOrdonner, ClesPriveesBase | 'rangs'> & QuestionPubliqueBase;
export type QValeurPublique = Omit<QValeur, ClesPriveesBase | 'champs'> & QuestionPubliqueBase & { champs: ChampPublic[] };
export type QCalculPublique = Omit<QCalcul, ClesPriveesBase | 'formule' | 'formuleMotsCles' | 'attendu' | 'tolerance' | 'formuleSpec'>
  & QuestionPubliqueBase & {
    /** La formule est corrigée par équivalence (éditeur de maths). */
    estFormule: boolean;
  };
export type QTableauPublique = Omit<QTableau, ClesPriveesBase | 'lignes'> & QuestionPubliqueBase & {
  lignes: { cellules: (string | CellulePublique)[] }[];
};
export type QRedigePublique = Omit<QRedige, ClesPriveesBase | 'motsCles' | 'minMotsCles' | 'corrige'> & QuestionPubliqueBase;
export type QBullesPublique = Omit<QBulles, ClesPriveesBase | 'bulles'> & QuestionPubliqueBase & {
  bulles: { id: string; x: number; y: number }[];
};
export type QPlacementPublique = Omit<QPlacement, ClesPriveesBase | 'attendus' | 'tolerance' | 'max' | 'champs'>
  & QuestionPubliqueBase & {
    /** Nombre maximal de repères posables (ne révèle pas le nombre attendu). */
    max: number;
    champs?: ChampPublic[];
  };
export type QCavaliersPublique = Omit<QCavaliers, ClesPriveesBase | 'composants' | 'valeurs'> & QuestionPubliqueBase & {
  composants: { id: string; label: string; positions: { id: string; label: string }[] }[];
  /** Valeurs proposées pour chaque position (liste commune). */
  valeurs: string[];
};
/** Définition « traits » d'un schéma sans les liaisons ni les réseaux attendus. */
export type SchemaTraitsPublic = Omit<SchemaTraitsDef, 'attendues' | 'reseaux'>;
export type QSchemaPublique = Omit<QSchema, ClesPriveesBase | 'traits' | 'corrigeImage'> & QuestionPubliqueBase & {
  traits: SchemaTraitsPublic;
};

export type QuestionPublique =
  | QCocherPublique | QRelierPublique | QOrdonnerPublique | QValeurPublique | QCalculPublique | QTableauPublique
  | QRedigePublique | QBullesPublique | QPlacementPublique | QCavaliersPublique | QSchemaPublique;

/** Question publique d'un outil donné. */
export type QPubliqueDe<T extends SujetQuestionType> = Extract<QuestionPublique, { type: T }>;

/** Sujet servi au navigateur de l'élève. */
export type SujetPublic = Omit<SujetNumerique, 'questions'> & { questions: QuestionPublique[] };

/** Corrigé d'une question (vue professeur, ou élève quand le corrigé est publié). */
export interface CorrigeQuestion {
  /** Réponse attendue, en lignes lisibles (`texteAttendu`). */
  attendu: string[];
  explication?: string;
  /** Image du schéma corrigé (outil `schema`). */
  corrigeImage?: { src: string; alt: string };
}

/** Réponse de `GET /api/sujet/solution`. */
export interface CorrigeSujet {
  sujetId: string;
  questions: Record<number, CorrigeQuestion>;
}

/** Réponse de `POST /api/sujet/corriger`. */
export type ReponseCorriger = CorrectionQuestion;

/** Réponse de `POST /api/sujet/aide`. */
export interface ReponseAide {
  niveau: number;
  total: number;
  texte: string;
}

/** Réponse de `POST /api/sujet/remettre`. */
export interface ReponseRemettre {
  corrections: Record<number, CorrectionQuestion>;
}

/* ───────────────────────────── construction ───────────────────────────── */

/** Clés qui ne doivent JAMAIS apparaître dans un sujet public (contrôle récursif des tests). */
export const CLES_CORRIGE = [
  'bonnes', 'liens', 'rangs', 'attendu', 'tolerance', 'acceptes', 'formule', 'formuleSpec', 'formuleMotsCles',
  'motsCles', 'minMotsCles', 'corrige', 'explication', 'indice', 'aides', 'erreursTypiques', 'attendus',
  'reseaux', 'corrigeImage',
] as const;


/** Nombre d'aides graduées par question (données, sinon aides par défaut). */
export const NB_AIDES = 3;

function champPublic(c: ChampValeur): ChampPublic {
  const out: ChampPublic = { id: c.id, label: c.label };
  if (c.unite) out.unite = c.unite;
  if (c.placeholder) out.placeholder = c.placeholder;
  if (c.saisie) out.saisie = c.saisie;
  if (c.formule) out.estFormule = true;
  if (c.attendu != null && !c.acceptes?.length && !c.formule) out.numerique = true;
  return out;
}

function cellulePublique(c: CelluleSaisie): CellulePublique {
  const out: CellulePublique = { id: c.id };
  if (c.choix) out.choix = [...c.choix];
  if (c.placeholder) out.placeholder = c.placeholder;
  if (c.saisie) out.saisie = c.saisie;
  if (c.formule) out.estFormule = true;
  if (c.attendu != null && !c.acceptes?.length && !c.formule && !c.choix) out.numerique = true;
  return out;
}

/** Valeurs par défaut des cavaliers (même liste que l'outil). */
const CAVALIERS_DEFAUT = ['—', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

/** Champs communs publics d'une question. */
function base(q: SujetQuestion): QuestionPubliqueBase {
  const out: QuestionPubliqueBase = {
    num: q.num, partie: q.partie, enonce: q.enonce, competence: q.competence, points: q.points,
    dtr: [...q.dtr], pageSujet: q.pageSujet, nbAides: NB_AIDES,
  };
  if (q.contexte != null) out.contexte = q.contexte;
  if (q.image) out.image = { ...q.image };
  if (q.label != null) out.label = q.label;
  if (q.tableauContexte) out.tableauContexte = JSON.parse(JSON.stringify(q.tableauContexte));
  return out;
}

/** Question publique (liste blanche des champs : un champ ajouté au contrat n'est pas servi par défaut). */
export function questionPublique(q: SujetQuestion): QuestionPublique {
  const b = base(q);
  switch (q.type) {
    case 'cocher':
      return { ...b, type: 'cocher', options: [...q.options], multiple: !!q.multiple || q.bonnes.length > 1 };
    case 'relier':
      return { ...b, type: 'relier', gauche: [...q.gauche], droite: [...q.droite] };
    case 'ordonner':
      return { ...b, type: 'ordonner', items: [...q.items] };
    case 'valeur':
      return { ...b, type: 'valeur', champs: q.champs.map(champPublic) };
    case 'calcul': {
      const out: QCalculPublique = { ...b, type: 'calcul', grandeur: q.grandeur, estFormule: !!q.formuleSpec };
      if (q.unite) out.unite = q.unite;
      if (q.arrondi) out.arrondi = q.arrondi;
      return out;
    }
    case 'tableau':
      return {
        ...b, type: 'tableau', colonnes: [...q.colonnes],
        lignes: q.lignes.map(l => ({ cellules: l.cellules.map(c => (typeof c === 'string' ? c : cellulePublique(c))) })),
      };
    case 'redige': {
      const out: QRedigePublique = { ...b, type: 'redige' };
      if (q.lignes != null) out.lignes = q.lignes;
      return out;
    }
    case 'bulles': {
      const out: QBullesPublique = { ...b, type: 'bulles', plan: { ...q.plan }, bulles: q.bulles.map(x => ({ id: x.id, x: x.x, y: x.y })) };
      if (q.choix) out.choix = [...q.choix];
      return out;
    }
    case 'placement': {
      const n = q.attendus.length;
      const out: QPlacementPublique = {
        ...b, type: 'placement', plan: { ...q.plan }, symbole: q.symbole,
        // Le plafond ne doit pas révéler le nombre de repères attendus.
        max: q.max ?? Math.max(2 * n, n + 5),
      };
      if (q.zone) out.zone = { ...q.zone };
      if (q.champs?.length) out.champs = q.champs.map(champPublic);
      return out;
    }
    case 'cavaliers': {
      const baseValeurs = q.valeurs ?? CAVALIERS_DEFAUT;
      const extra = q.composants.flatMap(c => c.positions.map(p => p.attendu)).filter(v => !baseValeurs.includes(v));
      return {
        ...b, type: 'cavaliers',
        composants: q.composants.map(c => ({ id: c.id, label: c.label, positions: c.positions.map(p => ({ id: p.id, label: p.label })) })),
        valeurs: [...baseValeurs, ...Array.from(new Set(extra))],
      };
    }
    case 'schema':
      return {
        ...b, type: 'schema', platineTpId: q.platineTpId,
        traits: {
          image: { ...q.traits.image },
          bornes: q.traits.bornes.map(x => ({ ...x })),
          couleurs: q.traits.couleurs.map(x => ({ ...x })),
        },
      };
  }
}

/** Sujet public : toutes les questions sans leur corrigé. */
export function sujetPublic(s: SujetNumerique): SujetPublic {
  const { questions, ...reste } = s;
  return { ...JSON.parse(JSON.stringify(reste)), questions: questions.map(questionPublique) };
}

/** Le sujet public est-il bien dépourvu de toute clé de corrigé ? (liste des chemins fautifs). */
export function clesCorrigePresentes(v: unknown, chemin = '$'): string[] {
  const out: string[] = [];
  const interdites = new Set<string>(CLES_CORRIGE);
  const visiter = (x: unknown, p: string) => {
    if (Array.isArray(x)) { x.forEach((e, i) => visiter(e, `${p}[${i}]`)); return; }
    if (!x || typeof x !== 'object') return;
    for (const [k, e] of Object.entries(x as Record<string, unknown>)) {
      // `declinaisons` et `dtr`/`pagesSujet` ne portent pas de corrigé ; le contrôle est partout.
      if (interdites.has(k)) out.push(`${p}.${k}`);
      visiter(e, `${p}.${k}`);
    }
  };
  visiter(v, chemin);
  return out;
}

/* ───────────────────────────── côté client ───────────────────────────── */

const vide = (v: string | null | undefined) => v == null || String(v).trim() === '';

/** L'élève a-t-il répondu (au moins en partie) ? — même règle que `estRepondue` (correction.ts). */
export function estReponduePublique(q: Pick<QuestionPublique, 'type'>, r: ReponseSujet | undefined): boolean {
  if (!r || r.type !== q.type) return false;
  switch (r.type) {
    case 'cocher': return r.choix.length > 0;
    case 'relier': return r.liens.some(l => l != null);
    case 'ordonner': return r.rangs.some(x => x != null);
    case 'valeur': return Object.values(r.valeurs).some(v => !vide(v));
    case 'calcul': return !vide(r.resultat) || !vide(r.formule) || !vide(r.application);
    case 'tableau': return Object.values(r.cellules).some(v => !vide(v));
    case 'redige': return !vide(r.texte);
    case 'bulles': return Object.values(r.valeurs).some(v => !vide(v));
    case 'placement': return r.points.length > 0 || Object.values(r.valeurs ?? {}).some(v => !vide(v));
    case 'cavaliers': return Object.values(r.valeurs).some(v => !vide(v));
    case 'schema': return r.traits.length > 0 || r.platine != null;
  }
}

const lettre = (i: number) => String.fromCharCode(65 + i);
/** Saisie lisible : les champs de l'éditeur de maths (LaTeX) sont transcrits en texte. */
const saisie = (v: string | undefined, c?: { estFormule?: boolean; saisie?: string }) => {
  const t = v?.trim() ?? '';
  if (!t) return '';
  return !c || c.estFormule || c.saisie === 'maths' ? latexVersTexte(t) : t;
};
const lignesChamps = (champs: ChampPublic[], v: Record<string, string>) =>
  champs.map(c => `${c.label} : ${saisie(v[c.id], c) || '—'}${c.unite && v[c.id]?.trim() ? ` ${c.unite}` : ''}`);

/** Réponse de l'élève en lignes de texte, à partir de la question PUBLIQUE (copie de l'élève). */
export function texteReponsePublique(q: QuestionPublique, r: ReponseSujet | undefined): string[] {
  if (!r || r.type !== q.type) return [];
  switch (q.type) {
    case 'cocher': {
      const c = (r as Extract<ReponseSujet, { type: 'cocher' }>).choix;
      return c.map(i => `☒ ${q.options[i] ?? `option ${i + 1}`}`);
    }
    case 'relier': {
      const l = (r as Extract<ReponseSujet, { type: 'relier' }>).liens;
      return q.gauche.map((g, i) => `${g} → ${l[i] != null ? `${lettre(l[i] as number)}. ${q.droite[l[i] as number] ?? ''}` : '—'}`);
    }
    case 'ordonner': {
      const rg = (r as Extract<ReponseSujet, { type: 'ordonner' }>).rangs;
      return q.items.map((it, i) => `${rg[i] ?? '—'} · ${it}`);
    }
    case 'valeur':
      return lignesChamps(q.champs, (r as Extract<ReponseSujet, { type: 'valeur' }>).valeurs);
    case 'calcul': {
      const c = r as Extract<ReponseSujet, { type: 'calcul' }>;
      return [
        `Formule : ${saisie(c.formule) || '—'}`,
        `Application : ${saisie(c.application) || '—'}`,
        `Résultat : ${q.grandeur} = ${c.resultat.trim() || '—'}${q.unite ? ` ${q.unite}` : ''}`,
      ];
    }
    case 'tableau': {
      const cel = (r as Extract<ReponseSujet, { type: 'tableau' }>).cellules;
      return q.lignes.map(l => l.cellules.map(c => (typeof c === 'string' ? c : saisie(cel[c.id], c) || '—')).join(' | '));
    }
    case 'redige':
      return (r as Extract<ReponseSujet, { type: 'redige' }>).texte.split('\n');
    case 'bulles': {
      const v = (r as Extract<ReponseSujet, { type: 'bulles' }>).valeurs;
      return [q.bulles.map((b, i) => `${i + 1}: ${v[b.id]?.trim() || '—'}`).join(' · ')];
    }
    case 'placement': {
      const p = r as Extract<ReponseSujet, { type: 'placement' }>;
      const n = p.points.length;
      const nom = q.symbole === 'croix' ? 'croix' : q.symbole === 'luminaire' ? `luminaire${n > 1 ? 's' : ''}` : `repère${n > 1 ? 's' : ''}`;
      const out = [`${n} ${nom} posé${q.symbole === 'croix' ? 'e' : ''}${n > 1 ? 's' : ''}`];
      if (q.champs?.length) out.push(...lignesChamps(q.champs, p.valeurs ?? {}));
      return out;
    }
    case 'cavaliers': {
      const v = (r as Extract<ReponseSujet, { type: 'cavaliers' }>).valeurs;
      return q.composants.map(c => `${c.label} : ${c.positions.map(p => `${p.label} ${v[`${c.id}.${p.id}`]?.trim() || '—'}`).join(' · ')}`);
    }
    case 'schema': {
      const s = r as Extract<ReponseSujet, { type: 'schema' }>;
      const lab = new Map(q.traits.bornes.map(b => [b.id, b.label]));
      const coul = new Map(q.traits.couleurs.map(c => [c.id, c.label]));
      const out = [`${s.traits.length} trait${s.traits.length > 1 ? 's' : ''} posé${s.traits.length > 1 ? 's' : ''}`];
      if (s.traits.length) out.push(s.traits.map(t => `${lab.get(t.a) ?? t.a}–${lab.get(t.b) ?? t.b} (${coul.get(t.couleur) ?? t.couleur})`).join(' · '));
      out.push(s.platine
        ? `Câblage réel : ${s.platine.conformes}/${s.platine.total} liaisons · ${s.platine.sousTension ? 'sous tension ✓' : 'sous tension ✗'} · ${s.platine.essai ? 'essai ✓' : 'essai ✗'}`
        : 'Câblage réel : non validé');
      return out;
    }
  }
}

/** Question (publique) d'un sujet public par numéro. */
export const questionPubliqueDe = (s: Pick<SujetPublic, 'questions'> | null, num: number): QuestionPublique | undefined =>
  s?.questions.find(q => q.num === num);
