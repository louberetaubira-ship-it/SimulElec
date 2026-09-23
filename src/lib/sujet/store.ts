'use client';

/**
 * Store (Zustand) de la copie d'un sujet numérique, côté élève.
 *
 * Persistance :
 *  - connecté : une ligne `attempts` (`tp_id` = id du sujet) ; `attempts.state` reçoit un
 *    `SujetAttemptState` (discriminant `kind: 'sujet'`), sauvegardé 800 ms après la
 *    dernière modification, et au moins toutes les 30 s pour le chrono ;
 *  - démonstration (`NEXT_PUBLIC_DEMO_MODE=1`) : `localStorage`, clé `simulelec.sujet.<id>`.
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
import type {
  CorrectionQuestion, ReponseSujet, SujetAttemptState, SujetMode, SujetNumerique, SujetQuestion,
} from './types';
import { corriger, corrigerCopie, estRepondue } from './correction';
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
export const etatVierge = (sujet: SujetNumerique): SujetAttemptState =>
  etatInitial(sujet.id, 'entrainement', sujet.questions[0]?.num ?? 1);

/** Complète un état lu en base ou dans le stockage local (champs manquants, question courante valide). */
export function normaliserEtat(s: Partial<SujetAttemptState>, sujet: SujetNumerique): SujetAttemptState {
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
export const restantes = (sujet: SujetNumerique, secondes: number) =>
  Math.max(0, sujet.dureeMin * 60 - secondes);

/** Seuils d'alerte du chrono en mode examen (secondes restantes). */
const ALERTES = [
  { s: 30 * 60, texte: 'Plus que 30 minutes : pense à relire et à remettre ta copie.' },
  { s: 5 * 60, texte: 'Plus que 5 minutes ! La copie sera remise automatiquement à la fin du temps.' },
];

export type PageVue = { kind: 'dtr' | 'sujet'; num: number };
export type Vue = 'questions' | 'correction' | 'bilan';

interface SujetStore {
  sujet: SujetNumerique | null;
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
  /** Entraînement : réponse attendue dévoilée pour ces questions. */
  revelees: number[];

  init: (sujet: SujetNumerique) => Promise<void>;
  demarrer: (mode: SujetMode) => void;
  setMode: (mode: SujetMode) => void;
  aller: (num: number) => void;
  suivante: (sens?: 1 | -1) => void;
  repondre: (num: number, r: ReponseSujet) => void;
  verifier: (num: number) => CorrectionQuestion | null;
  reveler: (num: number) => void;
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

export const questionDe = (sujet: SujetNumerique | null, num: number): SujetQuestion | undefined =>
  sujet?.questions.find(q => q.num === num);

export const useSujet = create<SujetStore>((set, get) => {
  const nbRep = (sujet: SujetNumerique, st: SujetAttemptState) =>
    sujet.questions.filter(q => estRepondue(q, st.reponses[q.num])).length;

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

  const pageDe = (sujet: SujetNumerique, num: number): PageVue => {
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
    revelees: [],

    async init(sujet) {
      if (saveTimer) clearTimeout(saveTimer);
      set({
        sujet, st: etatVierge(sujet), ecoule: 0, attemptId: null, chargement: true, horsLigne: false, local: DEMO,
        verrou: null, modeImpose: null, alerte: null, vue: 'questions', revelees: [], dtrOuvert: false,
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
      if (verrou && !st.remise) st = { ...st, remise: true, corrections: corrigerCopie(sujet, st) };

      set({
        st, ecoule: st.secondesEcoulees, verrou, attemptId, modeImpose, local, horsLigne, chargement: false,
        vue: st.remise ? 'bilan' : 'questions',
        page: pageDe(sujet, st.courante),
      });
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
      // Passer en examen efface les vérifications de l'entraînement (pas de correction avant la remise).
      patch(s => ({ ...s, mode, corrections: mode === 'examen' ? {} : s.corrections }));
      set({ revelees: [] });
      dire(mode === 'examen'
        ? `Mode examen : chrono de ${fmtDuree((get().sujet?.dureeMin ?? 300) * 60)}, pas de correction avant la remise.`
        : 'Mode entraînement : « Vérifier » après chaque question, indice après une erreur.');
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

    verifier(num) {
      const { sujet, st } = get();
      if (!sujet || st.remise || st.mode !== 'entrainement') return null;
      const q = questionDe(sujet, num);
      if (!q) return null;
      const c = corriger(q, st.reponses[num]);
      patch(s => ({ ...s, corrections: { ...s.corrections, [num]: c } }));
      return c;
    },

    reveler(num) {
      set(s => ({ revelees: s.revelees.includes(num) ? s.revelees : [...s.revelees, num] }));
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
      const { sujet, st, verrou, attemptId, local } = get();
      if (!sujet || verrou) return;
      let remis: SujetAttemptState;
      if (st.remise) {
        // Copie déjà remise mais envoi échoué (réseau) : on renvoie la même copie.
        remis = st;
      } else {
        const corrections = corrigerCopie(sujet, { ...st, corrections: {} });
        // Les notes du professeur (copie réactivée) sont conservées.
        Object.values(st.corrections).forEach(c => { if (c.statut === 'prof') corrections[c.num] = c; });
        remis = { ...st, secondesEcoulees: get().ecoule, remise: true, remiseAt: new Date().toISOString(), corrections };
      }
      const bilan = calculerBilan(sujet, remis.corrections);
      const score = scoreStocke(bilan);
      if (saveTimer) clearTimeout(saveTimer);
      set({ st: remis, vue: 'bilan', revelees: [] });
      if (automatique) dire('Temps écoulé : ta copie a été remise automatiquement.');
      if (local) {
        ecrireLocal(sujet.id, { status: 'termine', score, state: remis });
        set({ verrou: 'termine' });
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
