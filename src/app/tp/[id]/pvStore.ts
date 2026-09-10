'use client';

/**
 * Store du parcours « dimensionnement » (TP 14 · photovoltaïque autonome).
 *
 * Distinct du store de la platine (`store.ts`) : pas de simulation électrique, pas de câblage.
 * L'état `PvState` est persisté dans `attempts.state` via `saveAttemptState`.
 */

import { create } from 'zustand';
import type { TpDefinition } from '@/lib/types';
import {
  answerOk, buildPvEvaluation, calc, checks, coursForPvStep, initialPvState, normalizePvState,
  PV_STEP_COUNT, PV_STEPS, pvScore, pvStageScores, report as pvReport, unifilaire,
  type PvAnswerKey, type PvSolar, type PvState,
} from '@/lib/pv/dimensionnement';
import { LOCALITES, localityById, type PvRecepteur, type Ubat } from '@/lib/data/pv/catalogue';
import type { CoursId } from '@/lib/data/cours';
import { fallbackStudent, type Student } from '@/lib/student';
import { finishAttempt, getOrCreateAttempt, saveAttemptState } from '@/lib/db/attempts';

export interface BotTurn { role: 'user' | 'assistant'; content: string }

/** Réponse de `GET /api/pvgis` (voir `src/app/api/pvgis/route.ts`). */
interface PvgisPayload {
  source: 'pvgis' | 'table';
  hsp: number;
  min: number;
  worstMonth: number | null;
  monthly: { month: number; em: number; ed: number; hsp: number }[];
  loss: number;
  locality: string;
}

/** Raison d'une ouverture automatique de l'aide. */
export type PvAideReason = 'reponse' | 'etape' | null;

interface PvStore {
  tp: TpDefinition | null;
  attemptId: string | null;
  offline: boolean;
  saving: boolean;
  student: Student;
  s: PvState;
  toast: string | null;
  /** Interrogation de PVGIS en cours. */
  solarLoading: boolean;

  aideOpen: boolean;
  aideReason: PvAideReason;
  aideFiche: CoursId | null;
  aideAuto: Record<number, boolean>;

  botOpen: boolean;
  pendingQuestion: string | null;
  turns: BotTurn[];
  /** Évaluation envoyée au professeur. */
  sent: boolean;

  init: (tp: TpDefinition) => Promise<void>;
  setStudent: (s: Student) => void;
  goStep: (i: number) => void;
  /** Valide l'étape courante ; renvoie `false` si un contrôle bloque. */
  validate: () => boolean;

  setRecv: (i: number, patch: Partial<PvRecepteur>) => void;
  addRecv: () => void;
  delRecv: (i: number) => void;
  setAns: (key: PvAnswerKey, value: number | null) => void;
  /** Vérifie une réponse saisie (ouvre l'aide après deux erreurs sur la même question). */
  checkAns: (key: PvAnswerKey) => void;
  setLoc: (id: string) => void;
  setRegion: (region: string) => void;
  setEta: (v: number) => void;
  setWorst: (v: boolean) => void;
  setUbat: (u: Ubat) => void;
  setPanel: (id: string) => void;
  setNs: (d: number) => void;
  setNp: (d: number) => void;
  setBat: (id: string) => void;
  setBns: (d: number) => void;
  setBnp: (d: number) => void;
  setAuto: (v: number) => void;
  setMppt: (id: string) => void;
  setInv: (id: string) => void;
  setCab: (key: 'Lpv' | 'Lbat' | 'Lond' | 'dupv' | 'dubat' | 'Spv' | 'Sbat' | 'Sond', v: number) => void;
  setProt: (key: 'fpv' | 'fbat' | 'qac', v: number) => void;
  toggleProt: (key: 'ddr' | 'dcspd') => void;

  openAide: (reason?: PvAideReason) => void;
  closeAide: () => void;
  setAideFiche: (id: CoursId | null) => void;
  setBotOpen: (v: boolean) => void;
  askProf: (q: string) => void;
  consumeQuestion: () => void;
  pushTurn: (t: BotTurn) => void;
  say: (m: string) => void;

  /** Ressource solaire réelle de la localité (PVGIS, repli table locale). */
  loadSolar: () => Promise<void>;
  finish: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const usePvParcours = create<PvStore>((set, get) => {
  const schedule = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { attemptId, s, offline } = get();
      if (!attemptId || offline) return;
      set({ saving: true });
      saveAttemptState(attemptId, s, s.step)
        .catch(() => set({ offline: true }))
        .finally(() => set({ saving: false }));
    }, 800);
  };

  const patch = (fn: (s: PvState) => PvState) => {
    set(st => ({ s: fn(st.s) }));
    schedule();
  };

  const say = (m: string) => {
    if (!m) return;
    set({ toast: m });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  };

  const openAide = (reason: PvAideReason = null) => {
    if (get().aideOpen) return;
    const step = get().s.step;
    const fiche = get().aideFiche ?? coursForPvStep(step)[0] ?? null;
    set({ aideOpen: true, aideReason: reason, aideFiche: fiche });
    patch(s => ({ ...s, helpUsed: { ...s.helpUsed, [s.step]: (s.helpUsed[s.step] ?? 0) + 1 } }));
  };

  const autoAide = (reason: Exclude<PvAideReason, null>) => {
    const { s, aideAuto, aideOpen } = get();
    if (aideAuto[s.step] || aideOpen) return;
    set({ aideAuto: { ...aideAuto, [s.step]: true } });
    openAide(reason);
    say('Deux réponses fausses : relis la règle, puis reprends le calcul.');
  };

  return {
    tp: null,
    attemptId: null,
    offline: false,
    saving: false,
    student: fallbackStudent(),
    s: initialPvState(),
    toast: null,
    solarLoading: false,
    aideOpen: false,
    aideReason: null,
    aideFiche: null,
    aideAuto: {},
    botOpen: false,
    pendingQuestion: null,
    turns: [],
    sent: false,

    async init(tp) {
      set({ tp, s: initialPvState(), turns: [], offline: false, attemptId: null, sent: false });
      try {
        const row = await getOrCreateAttempt(tp.id);
        set({ attemptId: row.id, s: normalizePvState(row.state as Partial<PvState> | null) });
      } catch {
        set({ offline: true });
      }
      void get().loadSolar();
    },

    setStudent(student) { set({ student }); },

    goStep(i) {
      const { s } = get();
      const step = clampInt(i, 0, PV_STEP_COUNT - 1);
      // une étape reste verrouillée tant que la précédente n'est pas validée
      if (step > 0 && !s.done[step - 1] && !s.done[step]) return;
      patch(x => ({ ...x, step }));
    },

    validate() {
      const { s } = get();
      const blocked = checks(s, s.step).some(e => e.kind === 'bad');
      if (blocked) {
        patch(x => ({ ...x, badTries: { ...x.badTries, [x.step]: (x.badTries[x.step] ?? 0) + 1 } }));
        say('Un contrôle bloque : lis le message en rouge.');
        const tries = (get().s.badTries[s.step] ?? 0);
        if (tries >= 2) autoAide('etape');
        return false;
      }
      patch(x => ({
        ...x,
        done: { ...x.done, [x.step]: true },
        step: Math.min(PV_STEP_COUNT - 1, x.step + 1),
      }));
      return true;
    },

    setRecv(i, p) {
      patch(s => ({ ...s, recv: s.recv.map((r, k) => (k === i ? { ...r, ...p } : r)) }));
    },
    addRecv() {
      patch(s => ({ ...s, recv: [...s.recv, { n: 'Nouveau récepteur', P: 100, q: 1, t: 1, sim: true, start: false }] }));
    },
    delRecv(i) {
      patch(s => ({ ...s, recv: s.recv.filter((_, k) => k !== i) }));
    },

    setAns(key, value) { patch(s => ({ ...s, ans: { ...s.ans, [key]: value } })); },

    checkAns(key) {
      const s = get().s;
      if (s.ans[key] == null) return;
      if (answerOk(s, key)) return;
      patch(x => ({ ...x, wrongAns: { ...x.wrongAns, [key]: (x.wrongAns[key] ?? 0) + 1 } }));
      if ((get().s.wrongAns[key] ?? 0) >= 2) autoAide('reponse');
    },

    setLoc(id) {
      patch(s => ({ ...s, locId: id, solar: null }));
      void get().loadSolar();
    },
    setRegion(region) {
      const l = LOCALITES.find(x => x.region === region);
      if (l) get().setLoc(l.id);
    },
    setEta(v) { patch(s => ({ ...s, eta: v > 0 && v <= 1 ? v : s.eta })); },
    setWorst(v) { patch(s => ({ ...s, worst: v })); },

    setUbat(u) {
      patch(s => {
        // l'onduleur et la batterie suivent la tension du parc (comme la référence)
        const invId = u === 12 ? 'i12_1200' : u === 24 ? 'i24_3000' : 'i48_3000';
        const batId = u === 48 ? 'lfp48' : 'lfp100';
        const bns = u === 48 ? 1 : u / 12;
        return { ...s, ubat: u, invId, batId, bns };
      });
    },
    setPanel(id) { patch(s => ({ ...s, panelId: id })); },
    setNs(d) { patch(s => ({ ...s, ns: clampInt(s.ns + d, 1, 8) })); },
    setNp(d) { patch(s => ({ ...s, np: clampInt(s.np + d, 1, 6) })); },
    setBat(id) {
      patch(s => {
        const U = id === 'lfp48' ? 51.2 : id.startsWith('lfp') ? 12.8 : 12;
        return { ...s, batId: id, bns: Math.max(1, Math.round(s.ubat / U)) };
      });
    },
    setBns(d) { patch(s => ({ ...s, bns: clampInt(s.bns + d, 1, 4) })); },
    setBnp(d) { patch(s => ({ ...s, bnp: clampInt(s.bnp + d, 1, 6) })); },
    setAuto(v) { patch(s => ({ ...s, auto: clampInt(Math.round(v), 1, 10) })); },
    setMppt(id) { patch(s => ({ ...s, mpptId: id })); },
    setInv(id) { patch(s => ({ ...s, invId: id })); },
    setCab(key, v) { patch(s => ({ ...s, cab: { ...s.cab, [key]: v } })); },
    setProt(key, v) { patch(s => ({ ...s, prot: { ...s.prot, [key]: v } })); },
    toggleProt(key) { patch(s => ({ ...s, prot: { ...s.prot, [key]: !s.prot[key] } })); },

    openAide(reason = null) { openAide(reason); },
    closeAide() { set({ aideOpen: false, aideReason: null }); },
    setAideFiche(id) { set({ aideFiche: id }); },
    setBotOpen(v) { set({ botOpen: v }); },
    askProf(q) { set({ pendingQuestion: q, botOpen: true, aideOpen: false }); },
    consumeQuestion() { set({ pendingQuestion: null }); },
    pushTurn(t) { set(st => ({ turns: [...st.turns, t] })); },
    say,

    async loadSolar() {
      const loc = localityById(get().s.locId);
      set({ solarLoading: true });
      try {
        const res = await fetch(`/api/pvgis?lat=${loc.lat}&lon=${loc.lon}`);
        if (!res.ok) throw new Error('pvgis');
        const data = (await res.json()) as PvgisPayload;
        const solar: PvSolar = {
          source: data.source,
          hsp: data.hsp,
          min: data.min,
          monthly: data.monthly ?? [],
          loss: data.loss,
        };
        // la localité a pu changer pendant l'appel
        if (localityById(get().s.locId).id === loc.id) patch(s => ({ ...s, solar }));
      } catch {
        // repli silencieux : les valeurs indicatives du catalogue restent utilisées
        if (localityById(get().s.locId).id === loc.id) patch(s => ({ ...s, solar: null }));
      } finally {
        set({ solarLoading: false });
      }
    },

    async finish() {
      const { s, attemptId, offline, student } = get();
      if (!s.done[10]) get().validate();
      const done = get().s;
      set({ sent: true });
      if (!attemptId || offline) return;
      try {
        const C = calc(done);
        await finishAttempt(
          attemptId,
          {
            tpId: get().tp?.id ?? 'pv-dimensionnement',
            title: get().tp?.title ?? '',
            kind: 'dimensionnement',
            student,
            report: pvReport(done),
            unifilaire: unifilaire(done),
            stageScores: pvStageScores(done),
            stageLabels: PV_STEPS.map(x => x.title),
            helpUsed: done.helpUsed,
            badTries: done.badTries,
            resultats: {
              Ejour: C.Ejour, Psim: C.Psim, Ppv: C.Ppv, PpvReal: C.PpvReal,
              Cah: C.Cah, Ich: C.Ich, Iinv: C.Iinv, Ubat: s.ubat,
            },
            at: new Date().toISOString(),
          },
          pvScore(done),
          buildPvEvaluation(done, student.diploma),
          student.diploma,
        );
      } catch {
        set({ offline: true });
      }
    },
  };
});
