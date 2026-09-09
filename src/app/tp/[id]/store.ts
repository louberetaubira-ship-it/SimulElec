'use client';

import { create } from 'zustand';
import type { AttemptState, Liaison, TpDefinition } from '@/lib/types';
import {
  initialSim, injectFault, pickFault, pressS1, pressS2, releaseS2, repairFault,
  resetF1, tick, toggleF2, toggleQ1, type SimState,
} from '@/lib/sim/engine';
import { linkKey } from '@/lib/sim/layout';
import { read, type InstrumentId } from '@/lib/sim/instruments';
import {
  buildReport, computeScore, initialState, netOfTerminal, nextLiaison,
  requiredLiaisons, serviceComplete, stageSatisfied, STAGE_COUNT, STAGES,
} from '@/lib/sim/progress';
import {
  addMeasurement, finishAttempt, getOrCreateAttempt, saveAttemptState,
} from '@/lib/db/attempts';

export interface BotTurn { role: 'user' | 'assistant'; content: string }

interface ParcoursState {
  tp: TpDefinition;
  attemptId: string | null;
  offline: boolean;
  st: AttemptState;
  sim: SimState;
  toast: string | null;
  selTerminal: string | null;
  selSlot: string | null;
  selDevice: string | null;
  instrument: InstrumentId;
  point: string | null;
  turns: BotTurn[];
  saving: boolean;

  init: (tp: TpDefinition) => Promise<void>;
  say: (m: string) => void;
  goStage: (i: number) => void;
  complete: (i: number) => void;

  choose: (posteId: string, index: number) => void;
  selectSlot: (slotId: string) => void;
  selectDevice: (slotId: string) => void;

  clickTerminal: (id: string) => void;
  assist: () => void;

  runTest: (id: string, value: string) => void;

  setLoad: (v: number) => void;
  setInstrument: (i: InstrumentId) => void;
  setPoint: (p: string | null) => void;
  takeReading: () => void;

  deviceClick: (slotId: string) => void;
  button: (b: 's1' | 's2') => void;
  releaseButton: () => void;
  advance: (dt: number) => void;

  ensureFault: () => void;
  diagnose: (faultId: string) => void;
  setQuiz: (good: number) => void;
  repair: () => void;
  finish: () => Promise<void>;

  pushTurn: (t: BotTurn) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useParcours = create<ParcoursState>((set, get) => {
  /** Enregistre l'état après 800 ms sans changement. */
  const schedule = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { attemptId, st, offline } = get();
      if (!attemptId || offline) return;
      set({ saving: true });
      saveAttemptState(attemptId, st, st.stage)
        .catch(() => set({ offline: true }))
        .finally(() => set({ saving: false }));
    }, 800);
  };

  /** Applique une modification de la progression et programme la sauvegarde. */
  const patch = (fn: (st: AttemptState) => AttemptState) => {
    set(s => ({ st: fn(s.st) }));
    schedule();
  };

  const say = (m: string) => {
    if (!m) return;
    set({ toast: m });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 2400);
  };

  return {
    tp: null as unknown as TpDefinition,
    attemptId: null,
    offline: false,
    st: initialState(),
    sim: initialSim(),
    toast: null,
    selTerminal: null,
    selSlot: null,
    selDevice: null,
    instrument: 'dmm',
    point: null,
    turns: [],
    saving: false,

    async init(tp) {
      set({ tp, st: initialState(), sim: initialSim(), turns: [], offline: false, attemptId: null });
      try {
        const row = await getOrCreateAttempt(tp.id);
        const restored = (row.state ?? initialState()) as AttemptState;
        set({
          attemptId: row.id,
          st: { ...initialState(), ...restored },
          sim: restored.fault && !restored.fixed
            ? { ...initialSim(), fault: restored.fault as SimState['fault'] }
            : initialSim(),
        });
      } catch {
        set({ offline: true });
      }
    },

    say,

    goStage(i) {
      const { st } = get();
      if (i < 0 || i >= STAGE_COUNT) return;
      if (i > st.stage && !st.done[i - 1]) { say('Termine d\'abord l\'étape précédente.'); return; }
      set({ selTerminal: null, selSlot: null, selDevice: null });
      patch(s => ({ ...s, stage: i }));
    },

    complete(i) {
      const { st } = get();
      if (!st.done[i]) say(`Étape validée : ${STAGES[i]}`);
      patch(s => ({ ...s, done: { ...s.done, [i]: true } }));
    },

    choose(posteId, index) {
      patch(s => ({ ...s, choices: { ...s.choices, [posteId]: index } }));
    },

    selectSlot(slotId) {
      const { selDevice, tp } = get();
      if (!selDevice) { set({ selSlot: slotId }); return; }
      if (slotId === selDevice) {
        patch(s => ({ ...s, placed: { ...s.placed, [slotId]: true } }));
        say(`${tp.slots.find(x => x.id === slotId)?.label.split(' · ')[0]} posé.`);
      } else {
        patch(s => ({ ...s, poseErrors: s.poseErrors + 1 }));
        say(`Non : cet emplacement est réservé à ${tp.slots.find(x => x.id === slotId)?.label ?? slotId}.`);
      }
      set({ selSlot: null, selDevice: null });
    },

    selectDevice(slotId) {
      const { selSlot } = get();
      set({ selDevice: slotId });
      if (selSlot) get().selectSlot(selSlot);
    },

    clickTerminal(id) {
      const { tp, st, selTerminal } = get();
      if (!selTerminal) { set({ selTerminal: id }); return; }
      if (selTerminal === id) { set({ selTerminal: null }); return; }

      const k = linkKey(selTerminal, id);
      const expected = requiredLiaisons(tp).find(l => linkKey(l.a, l.b) === k);
      if (st.wires.some(w => linkKey(w.a, w.b) === k)) {
        say('Cette liaison est déjà faite.');
      } else if (expected) {
        patch(s => ({ ...s, wires: [...s.wires, { a: expected.a, b: expected.b, net: expected.net }] }));
        say(`Liaison ${expected.a} → ${expected.b} réalisée.`);
      } else {
        patch(s => ({ ...s, wireErrors: s.wireErrors + 1 }));
        const na = netOfTerminal(tp, selTerminal);
        const nb = netOfTerminal(tp, id);
        const court = na && nb && na !== nb && na !== 'C' && nb !== 'C' && na !== 'PE' && nb !== 'PE';
        say(court
          ? `Refusé : court-circuit ${na} / ${nb} !`
          : 'Refusé : cette liaison n\'est pas au tableau de câblage.');
      }
      set({ selTerminal: null });
    },

    assist() {
      const { tp, st } = get();
      const n: Liaison | undefined = nextLiaison(tp, st);
      if (!n) return;
      patch(s => ({ ...s, wires: [...s.wires, { a: n.a, b: n.b, net: n.net }] }));
      say(`Câblage assisté : ${n.a} → ${n.b}`);
    },

    runTest(id, value) {
      patch(s => ({ ...s, tests: { ...s.tests, [id]: value } }));
      say(`Test réalisé : ${value}`);
    },

    setLoad(v) { set(s => ({ sim: { ...s.sim, load: v } })); },
    setInstrument(i) { set({ instrument: i, point: null }); },
    setPoint(p) { set({ point: p }); },

    takeReading() {
      const { tp, st, sim, instrument, point, attemptId, offline } = get();
      if (!point) { say('Choisis d\'abord un point de mesure.'); return; }
      const r = read(sim, tp, instrument, point);
      const entry = {
        instrument, point,
        value: Number.isFinite(r.value) ? r.value : NaN,
        display: `${r.display} ${r.unit}`.trim(),
        stage: st.stage,
        at: new Date().toISOString(),
      };
      patch(s => ({ ...s, readings: [...s.readings, entry] }));
      say(`Relevé : ${entry.display}`);
      if (attemptId && !offline) {
        void addMeasurement(attemptId, {
          stage: entry.stage, instrument, point,
          value: Number.isFinite(entry.value) ? entry.value : null,
          display: entry.display,
        }).catch(() => set({ offline: true }));
      }
    },

    deviceClick(slotId) {
      const { sim, tp, st } = get();
      if (st.stage < 5) return;
      if (slotId === 'q1') { const r = toggleQ1(sim); set({ sim: r.state }); say(r.message); return; }
      if (slotId === 'f2') { const r = toggleF2(sim); set({ sim: r.state }); say(r.message); return; }
      if (slotId === 'f1') { const r = resetF1(sim); set({ sim: r.state }); say(r.message); return; }
      if (slotId === 'km1') { say(sim.km1 ? 'KM1 est enclenché.' : 'KM1 est retombé.'); return; }
      say(tp.slots.find(s => s.id === slotId)?.label ?? slotId);
    },

    button(b) {
      const { sim } = get();
      const r = b === 's2' ? pressS2(sim) : pressS1(sim);
      set({ sim: r.state });
      say(r.message);
      if (b === 's2') setTimeout(() => set(s => ({ sim: releaseS2(s.sim) })), 450);
    },

    releaseButton() { set(s => ({ sim: releaseS2(s.sim) })); },

    advance(dt) {
      const { sim, tp, st } = get();
      const r = tick(sim, tp, dt);
      set({ sim: r.state });
      if (r.message) say(r.message);
      if (st.stage === 6 && !st.done[6] && serviceComplete(tp, st, r.state)) get().complete(6);
    },

    ensureFault() {
      const { tp, st, sim } = get();
      if (st.fault || st.fixed) {
        if (st.fault && !st.fixed && sim.fault !== st.fault) {
          set({ sim: injectFault(sim, st.fault as NonNullable<SimState['fault']>) });
        }
        return;
      }
      const f = pickFault(tp);
      patch(s => ({ ...s, fault: f, readings: s.readings.filter(r => r.stage !== 7) }));
      set({ sim: injectFault(get().sim, f) });
    },

    diagnose(faultId) {
      const { st } = get();
      const exact = faultId === st.fault;
      patch(s => ({ ...s, diagnosis: faultId, diagTries: s.diagTries + 1 }));
      say(exact ? 'Diagnostic exact.' : 'Ce n\'est pas ça : vérifie avec les instruments.');
    },

    setQuiz(good) {
      const { tp } = get();
      patch(s => ({ ...s, quiz: good }));
      say(`Quiz : ${good} / ${tp.quiz.length} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''}.`);
    },

    repair() {
      patch(s => ({ ...s, fixed: true }));
      set(s => ({ sim: repairFault(s.sim) }));
      say('Réparation faite : remets en service pour confirmer.');
    },

    async finish() {
      const { tp, st, attemptId, offline } = get();
      if (!stageSatisfied(tp, st, get().sim, 7)) return;
      get().complete(7);
      if (!attemptId || offline) return;
      try {
        await finishAttempt(attemptId, buildReport(tp, st), computeScore(tp, st));
      } catch {
        set({ offline: true });
      }
    },

    pushTurn(t) { set(s => ({ turns: [...s.turns, t] })); },
  };
});

/** Liaisons à afficher : celles de l'installateur + celles réalisées par l'élève. */
export function visibleWires(tp: TpDefinition, st: AttemptState, all: boolean) {
  const pre = tp.liaisons.filter(l => l.prewired).map(l => ({ a: l.a, b: l.b, net: l.net }));
  if (all) return [...pre, ...requiredLiaisons(tp).map(l => ({ a: l.a, b: l.b, net: l.net }))];
  return [...pre, ...st.wires];
}
