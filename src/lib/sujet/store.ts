'use client';

/**
 * Store (Zustand) de la copie d'un sujet numérique, côté élève.
 *
 * Persistance :
 *  - connecté : une ligne `attempts` (`tp_id` = id du sujet) ; `attempts.state` reçoit un
 *    `SujetAttemptState` (discriminant `kind: 'sujet'`), sauvegardé 800 ms après la
 *    dernière modification, et au moins toutes les 30 s pour le chrono ;
 *  - démonstration (`NEXT_PUBLIC_DEMO_MODE=1`) : `localStorage`, clé `simulelec.sujet.<id>`.
 * Corrigé côté serveur : le store ne reçoit que le sujet PUBLIC (`SujetPublic`, sans réponses).
 * « Vérifier » appelle `POST /api/sujet/corriger`, les aides `POST /api/sujet/aide` (une par une,
 * en entraînement après une réponse fausse ; après la remise en examen), la remise
 * `POST /api/sujet/remettre`, et le corrigé (réponses attendues) `GET /api/sujet/solution` —
 * 403 tant que le professeur ne l'a pas publié pour la classe.
 * Chrono : `ecoule` (secondes) n'avance que lorsque l'onglet est visible (`tick`) ; il est
 * reporté dans `st.secondesEcoulees` à chaque sauvegarde et à la remise. Le garder hors de
 * `st` évite de re-rendre la question (et la platine du câblage réel) chaque seconde.
 */

import { create } from 'zustand';
import type { AttemptState } from '@/lib/types';
import type { AttemptRow } from '@/lib/db/types';
import { finishAttempt, getOrCreateAttempt, saveAttemptState } from '@/lib/db/attempts';
import { assignedMode } from '@/lib/db/classes';
import { DEMO } from '@/lib/student';
import type { CorrectionQuestion, ReponseSujet, SujetAttemptState, SujetMode } from './types';
import {
  estReponduePublique, type CorrigeSujet, type QuestionPublique, type ReponseAide, type ReponseRemettre, type SujetPublic,
} from './public';
import { calculerBilan, evaluationSujet, scoreStocke } from './bilan';

/* ───────────────────────────── état ───────────────────────────── */

/** `attempts.state` est-il une copie de sujet numérique ? */
export function isSujetState(s: unknown): s is SujetAttemptState {
  return !!s && typeof s === 'object' && (s as { kind?: unknown }).kind === 'sujet';
}

export function etatInitial(sujetId: string, mode: SujetMode = 'entrainement', courante = 1): SujetAttemptState {
  return {
    kind: 'sujet', sujetId, mode, courante, reponses: {}, marquees: [],
    debut: null, secondesEcoulees: 0, remise: false, remiseAt: null, corrections: {}, annotations: {},
  };
}

/**
 * État vierge d'une copie : question courante = première question du sujet (un sujet
 * thématique commence à Q14, pas à Q1 : la numérotation du papier est conservée).
 */
/** Ce dont le store a besoin d'un sujet (public ou complet). */
type SujetMin = { id: string; questions: { num: number }[] };

export const etatVierge = (sujet: SujetMin): SujetAttemptState =>
  etatInitial(sujet.id, 'entrainement', sujet.questions[0]?.num ?? 1);

/** Complète un état lu en base ou dans le stockage local (champs manquants, question courante valide). */
export function normaliserEtat(s: Partial<SujetAttemptState>, sujet: SujetMin): SujetAttemptState {
  const base = etatVierge(sujet);
  const nums = new Set(sujet.questions.map(q => q.num));
  const courante = typeof s.courante === 'number' && nums.has(s.courante) ? s.courante : (sujet.questions[0]?.num ?? 1);
  return {
    ...base,
    ...s,
    kind: 'sujet',
    sujetId: sujet.id,
    mode: s.mode === 'examen' ? 'examen' : 'entrainement',
    courante,
    reponses: s.reponses ?? {},
    marquees: Array.isArray(s.marquees) ? s.marquees : [],
    secondesEcoulees: Number.isFinite(s.secondesEcoulees) ? Math.max(0, s.secondesEcoulees as number) : 0,
    corrections: s.corrections ?? {},
    annotations: s.annotations ?? {},
  };
}

export const cleLocale = (sujetId: string) => `simulelec.sujet.${sujetId}`;

/** Enregistrement local (mode démo) : l'état et le statut de la « tentative ». */
export interface CopieLocale {
  status: AttemptRow['status'];
  score: number | null;
  state: SujetAttemptState;
  updated_at: string;
}

export function lireLocal(sujetId: string): CopieLocale | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cleLocale(sujetId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<CopieLocale>;
    if (!p || !isSujetState(p.state)) return null;
    return { status: p.status ?? 'en_cours', score: p.score ?? null, state: p.state, updated_at: p.updated_at ?? '' };
  } catch {
    return null;
  }
}

export function ecrireLocal(sujetId: string, c: Omit<CopieLocale, 'updated_at'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cleLocale(sujetId), JSON.stringify({ ...c, updated_at: new Date().toISOString() }));
  } catch {
    /* stockage indisponible : on continue sans mémoriser */
  }
}

/** Durée restante en mode examen (secondes, ≥ 0). */
export const restantes = (sujet: { dureeMin: number }, secondes: number) =>
  Math.max(0, sujet.dureeMin * 60 - secondes);

/** Seuils d'alerte du chrono en mode examen (secondes restantes). */
const ALERTES = [
  { s: 30 * 60, texte: 'Plus que 30 minutes : pense à relire et à remettre ta copie.' },
  { s: 5 * 60, texte: 'Plus que 5 minutes ! La copie sera remise automatiquement à la fin du temps.' },
];

export type PageVue = { kind: 'dtr' | 'sujet'; num: number };
export type Vue = 'questions' | 'correction' | 'bilan';

/** État du corrigé (réponses attendues) côté élève. */
export type EtatCorrige = 'inconnu' | 'chargement' | 'publie' | 'nonPublie' | 'erreur';

/* ───────────────────────────── appels serveur ───────────────────────────── */

/** Erreur d'un appel `/api/sujet/*` : message lisible et statut HTTP (0 = réseau). */
export class ErreurApi extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function appel<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, cache: 'no-store' });
  } catch {
    throw new ErreurApi('Serveur injoignable : vérifie ta connexion et réessaie.', 0);
  }
  const data = await res.json().catch(() => null) as (T & { erreur?: string }) | null;
  if (!res.ok || !data) throw new ErreurApi(data?.erreur ?? `Erreur du serveur (${res.status}).`, res.status);
  return data;
}

const post = <T>(url: string, body: unknown) => appel<T>(url, { method: 'POST', body: JSON.stringify(body) });

/** Correction d'une question par le serveur. */
export const apiCorriger = (sujetId: string, num: number, reponse: ReponseSujet | undefined) =>
  post<CorrectionQuestion>('/api/sujet/corriger', { sujetId, num, reponse: reponse ?? null });

/** Aide graduée (niveau 1..3) d'une question. */
export const apiAide = (sujetId: string, num: number, niveau: number) =>
  post<ReponseAide>('/api/sujet/aide', { sujetId, num, niveau });

/** Correction de toute la copie par le serveur (remise). */
export const apiRemettre = (sujetId: string, reponses: Record<number, ReponseSujet>) =>
  post<ReponseRemettre>('/api/sujet/remettre', { sujetId, reponses });

/** Corrigé publié (403 → `null`). */
export async function apiCorrige(sujetId: string, demoPublie = false): Promise<CorrigeSujet | null> {
  try {
    return await appel<CorrigeSujet>(`/api/sujet/solution?sujetId=${encodeURIComponent(sujetId)}${demoPublie ? '&demo=publie' : ''}`);
  } catch (e) {
    if (e instanceof ErreurApi && (e.status === 403 || e.status === 401)) return null;
    throw e;
  }
}

/* ───────────────────────────── publication (démonstration) ───────────────────────────── */

/** Mode démonstration : sujets dont le « professeur » de ce navigateur a publié le corrigé. */
export const CLE_CORRIGES_DEMO = 'simulelec.demo.corriges';

export function corrigesPubliesDemo(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(CLE_CORRIGES_DEMO) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function publierCorrigeDemo(sujetId: string, publie: boolean): void {
  if (typeof window === 'undefined') return;
  const ids = new Set(corrigesPubliesDemo());
  if (publie) ids.add(sujetId); else ids.delete(sujetId);
  try { window.localStorage.setItem(CLE_CORRIGES_DEMO, JSON.stringify(Array.from(ids))); } catch { /* stockage indisponible */ }
}

/* ───────────────────────────── store ───────────────────────────── */

interface SujetStore {
  sujet: SujetPublic | null;
  st: SujetAttemptState;
  /** Chrono vivant (secondes consommées), reporté dans `st.secondesEcoulees` à la sauvegarde. */
  ecoule: number;
  attemptId: string | null;
  chargement: boolean;
  /** Sauvegarde serveur impossible (session, réseau). */
  horsLigne: boolean;
  /** Persistance locale (mode démonstration). */
  local: boolean;
  /** Copie terminée / clôturée : lecture seule. */
  verrou: 'termine' | 'cloture' | null;
  /** Mode imposé par le professeur (sinon choix de l'élève). */
  modeImpose: SujetMode | null;
  enregistrement: boolean;
  /** Message flottant (alerte chrono, confirmation). */
  alerte: string | null;
  /** Page affichée dans le visualiseur DTR. */
  page: PageVue;
  /** Tiroir DTR ouvert (mobile). */
  dtrOuvert: boolean;
  calcOuverte: boolean;
  vue: Vue;
  /** Question en cours de vérification par le serveur. */
  verification: number | null;
  /** Remise en cours (correction par le serveur). */
  remiseEnCours: boolean;
  /** Dernière erreur d'un appel serveur (vérification, aide, remise), par question (0 = copie). */
  erreurs: Record<number, string>;
  /** Aides débloquées (textes, niveau 1..n dans l'ordre), par question. */
  aides: Record<number, string[]>;
  /** Question dont une aide est en cours de chargement. */
  aideChargement: number | null;
  /** Corrigé publié (réponses attendues + explications), s'il l'est. */
  corrige: CorrigeSujet | null;
  corrigeEtat: EtatCorrige;

  init: (sujet: SujetPublic) => Promise<void>;
  demarrer: (mode: SujetMode) => void;
  setMode: (mode: SujetMode) => void;
  aller: (num: number) => void;
  suivante: (sens?: 1 | -1) => void;
  repondre: (num: number, r: ReponseSujet) => void;
  verifier: (num: number) => Promise<CorrectionQuestion | null>;
  aideSuivante: (num: number) => Promise<void>;
  chargerCorrige: (force?: boolean) => Promise<void>;
  basculerMarque: (num: number) => void;
  tick: () => void;
  sauver: () => Promise<void>;
  remettre: (automatique?: boolean) => Promise<void>;
  voirPage: (p: PageVue) => void;
  setDtrOuvert: (v: boolean) => void;
  setCalc: (v: boolean) => void;
  setVue: (v: Vue) => void;
  fermerAlerte: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let alerteTimer: ReturnType<typeof setTimeout> | null = null;
let dernierTick = 0;

export const questionDe = (sujet: SujetPublic | null, num: number): QuestionPublique | undefined =>
  sujet?.questions.find(q => q.num === num);

/** Corrections du serveur + notes du professeur conservées (copie réactivée). */
function fusionner(serveur: Record<number, CorrectionQuestion>, avant: Record<number, CorrectionQuestion>) {
  const out = { ...serveur };
  Object.values(avant).forEach(c => { if (c.statut === 'prof') out[c.num] = c; });
  return out;
}

export const useSujet = create<SujetStore>((set, get) => {
  const nbRep = (sujet: SujetPublic, st: SujetAttemptState) =>
    sujet.questions.filter(q => estReponduePublique(q, st.reponses[q.num])).length;

  const persister = async (status?: AttemptRow['status'], score?: number | null) => {
    const { sujet, attemptId, local, verrou } = get();
    if (!sujet) return;
    // Report du chrono vivant dans l'état persisté.
    if (!verrou && !get().st.remise) set(s => ({ st: { ...s.st, secondesEcoulees: s.ecoule } }));
    const st = get().st;
    if (local) {
      const prev = lireLocal(sujet.id);
      ecrireLocal(sujet.id, {
        status: status ?? prev?.status ?? 'en_cours',
        score: score !== undefined ? score : prev?.score ?? null,
        state: st,
      });
      return;
    }
    if (!attemptId) return;
    set({ enregistrement: true });
    try {
      await saveAttemptState(attemptId, st as unknown as AttemptState, nbRep(sujet, st), status);
      set({ horsLigne: false });
    } catch {
      set({ horsLigne: true });
    } finally {
      set({ enregistrement: false });
    }
  };

  const planifier = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void persister(); }, 800);
  };

  const patch = (fn: (st: SujetAttemptState) => SujetAttemptState) => {
    const { st, verrou } = get();
    if (verrou) return;
    set({ st: fn(st) });
    planifier();
  };

  const dire = (m: string) => {
    set({ alerte: m });
    if (alerteTimer) clearTimeout(alerteTimer);
    alerteTimer = setTimeout(() => set({ alerte: null }), 6000);
  };

  const noterErreur = (num: number, m: string | null) => set(s => {
    const erreurs = { ...s.erreurs };
    if (m) erreurs[num] = m; else delete erreurs[num];
    return { erreurs };
  });

  const pageDe = (sujet: SujetPublic, num: number): PageVue => {
    const q = questionDe(sujet, num);
    if (q && q.dtr.length > 0) return { kind: 'dtr', num: q.dtr[0] };
    if (q) return { kind: 'sujet', num: q.pageSujet };
    return { kind: 'dtr', num: sujet.dtr[0]?.num ?? 1 };
  };

  return {
    sujet: null,
    st: etatInitial(''),
    ecoule: 0,
    attemptId: null,
    chargement: true,
    horsLigne: false,
    local: DEMO,
    verrou: null,
    modeImpose: null,
    enregistrement: false,
    alerte: null,
    page: { kind: 'dtr', num: 1 },
    dtrOuvert: false,
    calcOuverte: false,
    vue: 'questions',
    verification: null,
    remiseEnCours: false,
    erreurs: {},
    aides: {},
    aideChargement: null,
    corrige: null,
    corrigeEtat: 'inconnu',

    async init(sujet) {
      if (saveTimer) clearTimeout(saveTimer);
      set({
        sujet, st: etatVierge(sujet), ecoule: 0, attemptId: null, chargement: true, horsLigne: false, local: DEMO,
        verrou: null, modeImpose: null, alerte: null, vue: 'questions', dtrOuvert: false,
        verification: null, remiseEnCours: false, erreurs: {}, aides: {}, aideChargement: null, corrige: null, corrigeEtat: 'inconnu',
        page: pageDe(sujet, sujet.questions[0]?.num ?? 1),
      });

      let st = etatVierge(sujet);
      let verrou: SujetStore['verrou'] = null;
      let attemptId: string | null = null;
      let modeImpose: SujetMode | null = null;
      let local = DEMO;
      let horsLigne = false;

      if (DEMO) {
        const c = lireLocal(sujet.id);
        if (c) {
          st = normaliserEtat(c.state, sujet);
          verrou = c.status === 'termine' || c.status === 'cloture' ? c.status : null;
          // Réactivation (démo) : statut repassé « en cours » alors que la copie était remise.
          if (!verrou && st.remise) st = { ...st, remise: false, remiseAt: null };
        }
        attemptId = 'local';
      } else {
        try {
          const row = await getOrCreateAttempt(sujet.id);
          attemptId = row.id;
          if (isSujetState(row.state)) st = normaliserEtat(row.state, sujet);
          verrou = row.status === 'termine' || row.status === 'cloture' ? row.status : null;
          // Copie réactivée par le professeur : l'élève peut de nouveau la modifier.
          if (!verrou && st.remise) {
            const corrections: Record<number, CorrectionQuestion> = {};
            Object.values(st.corrections).forEach(c => { if (c.statut === 'prof') corrections[c.num] = c; });
            st = { ...st, remise: false, remiseAt: null, corrections };
          }
          const rep = row.report as { modeImpose?: unknown } | null;
          if (rep?.modeImpose === 'examen' || rep?.modeImpose === 'entrainement') modeImpose = rep.modeImpose;
          else {
            const m = await assignedMode(sujet.id).catch(() => null);
            modeImpose = m === 'evaluation' ? 'examen' : m === 'entrainement' ? 'entrainement' : null;
          }
        } catch {
          horsLigne = true;
          local = false;
        }
      }

      // Copie clôturée par le professeur avant la remise : on l'affiche corrigée (sans l'enregistrer).
      if (verrou && !st.remise) {
        const r = await apiRemettre(sujet.id, st.reponses).catch(() => null);
        st = { ...st, remise: true, corrections: fusionner(r?.corrections ?? {}, st.corrections) };
      }

      set({
        st, ecoule: st.secondesEcoulees, verrou, attemptId, modeImpose, local, horsLigne, chargement: false,
        vue: st.remise ? 'bilan' : 'questions',
        page: pageDe(sujet, st.courante),
      });
      if (st.remise) void get().chargerCorrige();
    },

    demarrer(mode) {
      const { modeImpose } = get();
      const m = modeImpose ?? mode;
      dernierTick = Date.now();
      patch(st => ({ ...st, mode: m, debut: st.debut ?? new Date().toISOString() }));
      void persister();
    },

    setMode(mode) {
      const { modeImpose, st } = get();
      if (modeImpose || st.remise || st.mode === mode) return;
      // Passer en examen efface les vérifications et les aides de l'entraînement (rien avant la remise).
      patch(s => ({ ...s, mode, corrections: mode === 'examen' ? {} : s.corrections }));
      if (mode === 'examen') set({ aides: {}, erreurs: {} });
      dire(mode === 'examen'
        ? `Mode examen : chrono de ${fmtDuree((get().sujet?.dureeMin ?? 300) * 60)}, ni vérification ni aide avant la remise.`
        : 'Mode entraînement : « Vérifier » après chaque question, aides graduées après une erreur.');
    },

    aller(num) {
      const { sujet } = get();
      if (!sujet || !questionDe(sujet, num)) return;
      set({ page: pageDe(sujet, num) });
      if (get().verrou) { set(s => ({ st: { ...s.st, courante: num } })); return; }
      patch(st => ({ ...st, courante: num }));
    },

    suivante(sens = 1) {
      const { sujet, st } = get();
      if (!sujet) return;
      const i = sujet.questions.findIndex(q => q.num === st.courante);
      const j = Math.max(0, Math.min(sujet.questions.length - 1, i + sens));
      get().aller(sujet.questions[j].num);
    },

    repondre(num, r) {
      if (get().st.remise) return;
      patch(st => {
        const corrections = { ...st.corrections };
        delete corrections[num];
        return { ...st, reponses: { ...st.reponses, [num]: r }, corrections };
      });
    },

    async verifier(num) {
      const { sujet, st, verification } = get();
      if (!sujet || st.remise || st.mode !== 'entrainement' || verification != null) return null;
      if (!questionDe(sujet, num)) return null;
      const reponse = st.reponses[num];
      set({ verification: num });
      noterErreur(num, null);
      try {
        const c = await apiCorriger(sujet.id, num, reponse);
        // La réponse a changé pendant la vérification : on n'affiche pas un verdict périmé.
        if (get().st.reponses[num] !== reponse || get().st.remise) return null;
        patch(s => ({ ...s, corrections: { ...s.corrections, [num]: c } }));
        return c;
      } catch (e) {
        noterErreur(num, e instanceof Error ? e.message : 'Vérification impossible.');
        return null;
      } finally {
        set({ verification: null });
      }
    },

    async aideSuivante(num) {
      const { sujet, st, aides, aideChargement } = get();
      const q = questionDe(sujet, num);
      if (!sujet || !q || aideChargement != null) return;
      // Examen : aucune aide avant la remise.
      if (st.mode === 'examen' && !st.remise) return;
      const deja = aides[num] ?? [];
      if (deja.length >= q.nbAides) return;
      set({ aideChargement: num });
      noterErreur(num, null);
      try {
        const a = await apiAide(sujet.id, num, deja.length + 1);
        set(s => ({ aides: { ...s.aides, [num]: [...(s.aides[num] ?? []), a.texte] } }));
      } catch (e) {
        noterErreur(num, e instanceof Error ? e.message : 'Aide indisponible.');
      } finally {
        set({ aideChargement: null });
      }
    },

    async chargerCorrige(force = false) {
      const { sujet, corrigeEtat } = get();
      if (!sujet) return;
      if (!force && (corrigeEtat === 'chargement' || corrigeEtat === 'publie')) return;
      set({ corrigeEtat: 'chargement' });
      const demoPublie = DEMO && corrigesPubliesDemo().some(id => id === sujet.id || id === sujet.parent);
      try {
        const c = await apiCorrige(sujet.id, demoPublie);
        if (get().sujet?.id !== sujet.id) return;
        set({ corrige: c, corrigeEtat: c ? 'publie' : 'nonPublie' });
      } catch {
        set({ corrige: null, corrigeEtat: 'erreur' });
      }
    },

    basculerMarque(num) {
      patch(st => ({
        ...st,
        marquees: st.marquees.includes(num) ? st.marquees.filter(n => n !== num) : [...st.marquees, num].sort((a, b) => a - b),
      }));
    },

    tick() {
      const { sujet, st, verrou, ecoule } = get();
      const now = Date.now();
      const delta = dernierTick ? Math.min(5, Math.max(0, (now - dernierTick) / 1000)) : 0;
      dernierTick = now;
      if (!sujet || verrou || st.remise || !st.debut) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const avant = restantes(sujet, ecoule);
      const next = Math.round((ecoule + delta) * 10) / 10;
      set({ ecoule: next });
      if (st.mode !== 'examen') return;
      const apres = restantes(sujet, next);
      for (const a of ALERTES) if (avant > a.s && apres <= a.s) dire(a.texte);
      if (apres <= 0) void get().remettre(true);
    },

    async sauver() {
      if (saveTimer) clearTimeout(saveTimer);
      if (get().verrou) return;
      await persister();
    },

    async remettre(automatique = false) {
      const { sujet, st, verrou, remiseEnCours } = get();
      if (!sujet || verrou || remiseEnCours) return;
      if (saveTimer) clearTimeout(saveTimer);
      // Les réponses sont figées tout de suite (fin du temps) ; la correction vient du serveur.
      const fige: SujetAttemptState = st.remise
        ? st
        : { ...st, secondesEcoulees: get().ecoule, remise: true, remiseAt: new Date().toISOString() };
      set({ st: fige, remiseEnCours: true, aides: {}, erreurs: {} });
      if (automatique) dire('Temps écoulé : ta copie a été remise automatiquement.');
      let corrections: Record<number, CorrectionQuestion>;
      try {
        corrections = fusionner((await apiRemettre(sujet.id, fige.reponses)).corrections, st.corrections);
      } catch (e) {
        // Copie figée mais non corrigée : enregistrée « en cours », « Renvoyer la copie » relance.
        set({ remiseEnCours: false, horsLigne: true });
        noterErreur(0, e instanceof Error ? e.message : 'Remise impossible.');
        void persister();
        return;
      }
      const remis: SujetAttemptState = { ...fige, corrections };
      const bilan = calculerBilan(sujet, remis.corrections);
      const score = scoreStocke(bilan);
      set({ st: remis, vue: 'bilan', remiseEnCours: false });
      noterErreur(0, null);
      void get().chargerCorrige(true);
      const { local, attemptId } = get();
      if (local) {
        ecrireLocal(sujet.id, { status: 'termine', score, state: remis });
        set({ verrou: 'termine', horsLigne: false });
        return;
      }
      if (!attemptId) { set({ horsLigne: true }); return; }
      try {
        await saveAttemptState(attemptId, remis as unknown as AttemptState, nbRep(sujet, remis), 'termine');
        await finishAttempt(
          attemptId,
          { kind: 'sujet', sujetId: sujet.id, note20: bilan.note20, points: bilan.points, total: bilan.total, mode: remis.mode, aValider: bilan.aValider },
          score,
          evaluationSujet(sujet, bilan),
          sujet.diploma,
        );
        set({ verrou: 'termine', horsLigne: false });
      } catch {
        set({ horsLigne: true });
      }
    },

    voirPage(p) { set({ page: p }); },
    setDtrOuvert(v) { set({ dtrOuvert: v }); },
    setCalc(v) { set({ calcOuverte: v }); },
    setVue(v) { set({ vue: v }); },
    fermerAlerte() { set({ alerte: null }); },
  };
});

/** Durée lisible : « 5 h », « 4 h 58 min », « 12 min 05 s » (sous 10 min). */
export function fmtDuree(secondes: number): string {
  const t = Math.max(0, Math.floor(secondes));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
  if (m >= 10) return `${m} min`;
  return `${m} min ${String(s).padStart(2, '0')} s`;
}

/** Remet le compteur du chrono à zéro (retour sur l'onglet, montage de l'épreuve). */
export function reprendreChrono(): void {
  dernierTick = Date.now();
}
