import type { AttemptState, Liaison, TpDefinition } from '../types';
import { isRunning, type SimState } from './engine';
import { linkKey } from './layout';

export const STAGES = [
  'Choix du TP', 'Énoncé', 'Matériel', 'Pose', 'Câblage',
  'Tests hors tension', 'Mise en service', 'Validation',
] as const;

export const STAGE_SLUGS = [
  'choix', 'enonce', 'materiel', 'pose', 'cablage', 'tests', 'mise-en-service', 'validation',
] as const;

export const STAGE_COUNT = STAGES.length;

export function initialState(): AttemptState {
  return {
    stage: 0,
    done: {},
    choices: {},
    placed: {},
    wires: [],
    wireErrors: 0,
    poseErrors: 0,
    tests: {},
    readings: [],
    fault: null,
    diagnosis: null,
    diagTries: 0,
    fixed: false,
    quiz: null,
  };
}

// ---------------------------------------------------------------- matériel

export function goodChoices(tp: TpDefinition, st: AttemptState): number {
  return tp.postes.filter(p => {
    const i = st.choices[p.id];
    return i != null && p.options[i]?.ok === true;
  }).length;
}

export const materielComplete = (tp: TpDefinition, st: AttemptState) => goodChoices(tp, st) === tp.postes.length;

// ---------------------------------------------------------------- pose

export const missingSlots = (tp: TpDefinition, st: AttemptState) => tp.slots.filter(s => !st.placed[s.id]);
export const poseComplete = (tp: TpDefinition, st: AttemptState) => missingSlots(tp, st).length === 0;

// ---------------------------------------------------------------- câblage

/** Liaisons que l'élève doit réaliser (les `prewired` sont déjà faites par l'installateur). */
export const requiredLiaisons = (tp: TpDefinition): Liaison[] => tp.liaisons.filter(l => !l.prewired);

export const isWired = (st: AttemptState, l: Liaison): boolean =>
  st.wires.some(w => linkKey(w.a, w.b) === linkKey(l.a, l.b));

export const nextLiaison = (tp: TpDefinition, st: AttemptState): Liaison | undefined =>
  requiredLiaisons(tp).find(l => !isWired(st, l));

export const wiringComplete = (tp: TpDefinition, st: AttemptState) => nextLiaison(tp, st) === undefined;

/** Réseau d'appartenance d'une borne, d'après le tableau de câblage (détection de court-circuit). */
export function netOfTerminal(tp: TpDefinition, id: string): Liaison['net'] | null {
  const l = tp.liaisons.find(x => x.a === id || x.b === id);
  return l ? l.net : null;
}

/** Toutes les liaisons attendues sur une borne sont-elles faites ? */
export function terminalDone(tp: TpDefinition, st: AttemptState, id: string): boolean {
  const need = requiredLiaisons(tp).filter(l => l.a === id || l.b === id).length;
  if (need === 0) return false;
  const have = st.wires.filter(w => w.a === id || w.b === id).length;
  return have >= need;
}

// ---------------------------------------------------------------- tests

export const testsComplete = (tp: TpDefinition, st: AttemptState) =>
  tp.tests.every(t => st.tests[t.id] != null);

// ---------------------------------------------------------------- mise en service

export interface ServiceCheck { id: string; title: string; ok: boolean }

/** Un relevé valide-t-il l'attendu ? */
export function expectedMet(tp: TpDefinition, st: AttemptState, expectedId: string): boolean {
  const e = tp.expected.find(x => x.id === expectedId);
  if (!e) return false;
  return st.readings.some(r => r.point === e.point && Number.isFinite(r.value) && r.value >= e.min && r.value <= e.max);
}

/** Étapes auto-validées de la mise en service : démarrage, relevés attendus, arrêt par S1. */
export function serviceChecks(tp: TpDefinition, st: AttemptState, sim: SimState): ServiceCheck[] {
  return [
    // `stoppedByS1` n'est posé que si KM1 était enclenché : le démarrage reste
    // acquis une fois le moteur arrêté par S1 (sinon les deux points s'excluent).
    { id: 'run', title: 'Démarrer : fermer Q1, F2 puis appuyer sur S2', ok: (isRunning(sim) && sim.n > 1000) || sim.stoppedByS1 },
    ...tp.expected.map(e => ({ id: e.id, title: e.title, ok: expectedMet(tp, st, e.id) })),
    { id: 'stop', title: 'Arrêter le moteur par S1', ok: sim.stoppedByS1 },
  ];
}

export const serviceComplete = (tp: TpDefinition, st: AttemptState, sim: SimState) =>
  serviceChecks(tp, st, sim).every(c => c.ok);

// ---------------------------------------------------------------- validation

export const validationComplete = (st: AttemptState) => st.fixed && st.diagnosis != null && st.quiz != null;

/** L'étape `stage` est-elle satisfaite par l'état courant ? */
export function stageSatisfied(tp: TpDefinition, st: AttemptState, sim: SimState, stage: number): boolean {
  switch (stage) {
    case 0: return true;
    case 1: return true;
    case 2: return materielComplete(tp, st);
    case 3: return poseComplete(tp, st);
    case 4: return wiringComplete(tp, st);
    case 5: return testsComplete(tp, st);
    case 6: return serviceComplete(tp, st, sim);
    case 7: return validationComplete(st);
    default: return false;
  }
}

// ---------------------------------------------------------------- score et rapport

export interface ScoreLine { key: string; label: string; points: number; max: number; detail: string }

export function scoreLines(tp: TpDefinition, st: AttemptState): ScoreLine[] {
  const nPostes = tp.postes.length;
  const ok = goodChoices(tp, st);
  const req = requiredLiaisons(tp).length;
  const wired = st.wires.length;
  const nTests = tp.tests.length;
  const nExp = tp.expected.length;
  const nQuiz = tp.quiz.length;
  const met = tp.expected.filter(e => expectedMet(tp, st, e.id)).length;

  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));

  return [
    { key: 'materiel', label: 'Choix du matériel', points: clamp(ok / nPostes * 20, 20), max: 20, detail: `${ok} / ${nPostes} références justes` },
    { key: 'pose', label: 'Pose sur la platine', points: clamp(10 - st.poseErrors * 2, 10), max: 10, detail: `${st.poseErrors} erreur${st.poseErrors > 1 ? 's' : ''} de pose` },
    { key: 'cablage', label: 'Câblage', points: clamp(wired / Math.max(1, req) * 20 - st.wireErrors * 2, 20), max: 20, detail: `${wired} / ${req} liaisons · ${st.wireErrors} refus` },
    { key: 'tests', label: 'Tests hors tension', points: clamp(Object.keys(st.tests).length / nTests * 10, 10), max: 10, detail: `${Object.keys(st.tests).length} / ${nTests} tests` },
    { key: 'service', label: 'Mise en service et relevés', points: clamp(met / Math.max(1, nExp) * 20, 20), max: 20, detail: `${met} / ${nExp} relevés conformes` },
    { key: 'diag', label: 'Maintenance corrective', points: st.fixed ? clamp(10 - (Math.max(1, st.diagTries) - 1) * 3, 10) : 0, max: 10, detail: st.fixed ? `panne réparée en ${Math.max(1, st.diagTries)} essai(s)` : 'panne non traitée' },
    { key: 'quiz', label: 'Questions de validation', points: clamp((st.quiz ?? 0) / Math.max(1, nQuiz) * 10, 10), max: 10, detail: st.quiz == null ? 'quiz non fait' : `${st.quiz} / ${nQuiz} bonnes réponses` },
  ];
}

export function computeScore(tp: TpDefinition, st: AttemptState): number {
  return scoreLines(tp, st).reduce((a, l) => a + l.points, 0);
}

export interface Report extends Record<string, unknown> {
  tpId: string;
  title: string;
  score: number;
  lines: ScoreLine[];
  fault: string | null;
  diagnosis: string | null;
  readings: AttemptState['readings'];
  tests: Record<string, string>;
  competences: string[];
  at: string;
}

export function buildReport(tp: TpDefinition, st: AttemptState): Report {
  const lines = scoreLines(tp, st);
  return {
    tpId: tp.id,
    title: tp.title,
    score: lines.reduce((a, l) => a + l.points, 0),
    lines,
    fault: st.fault,
    diagnosis: st.diagnosis,
    readings: st.readings,
    tests: st.tests,
    competences: tp.competences,
    at: new Date().toISOString(),
  };
}
