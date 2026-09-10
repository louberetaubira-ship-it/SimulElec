import type { AttemptState, Liaison, TpDefinition } from '../types';
import { isRunning, type SimState } from './engine';
import { linkKey } from './layout';
import { epiComplete, mesureDone, mesuresComplete, mesuresFor } from './mesures';

export const STAGES = [
  'Choix du TP', 'Énoncé', 'Matériel', 'Pose', 'Câblage', 'Tests hors tension',
  'EPI & consignation', 'Mesures hors tension', 'Déconsignation & mise en service',
  'Mesures sous tension', 'Validation / maintenance',
] as const;

/** Libellés courts pour le stepper mobile. */
export const STAGES_SHORT = [
  'Choix', 'Énoncé', 'Matériel', 'Pose', 'Câblage', 'Tests',
  'EPI', 'Mes. hors tension', 'Déconsignation', 'Mes. sous tension', 'Validation',
] as const;

export const STAGE_SLUGS = [
  'choix', 'enonce', 'materiel', 'pose', 'cablage', 'tests',
  'epi', 'mesures-hors-tension', 'mise-en-service', 'mesures-sous-tension', 'validation',
] as const;

export const STAGE_COUNT = STAGES.length;

/** Dernière étape accessible pour un TP non jouable (énoncé, matériel, pose). */
export const MAX_STAGE_PREVIEW = 3;

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
    epi: {},
    cons: { sep: false, lock: false, ident: false, vatRef: false, vat: [], vatRef2: false },
    decons: { unlock: false, close: false, essai: false },
    readings: [],
    fault: null,
    diagnosis: null,
    diagTries: 0,
    fixed: false,
    quiz: null,
  };
}

/** Complète un état restauré (tentative commencée avant une évolution du contrat). */
export function normalizeState(raw: Partial<AttemptState> | null | undefined): AttemptState {
  const base = initialState();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    done: raw.done ?? base.done,
    choices: raw.choices ?? base.choices,
    placed: raw.placed ?? base.placed,
    wires: raw.wires ?? base.wires,
    tests: raw.tests ?? base.tests,
    epi: raw.epi ?? base.epi,
    cons: { ...base.cons, ...(raw.cons ?? {}) },
    decons: { ...base.decons, ...(raw.decons ?? {}) },
    readings: raw.readings ?? base.readings,
  };
}

// ---------------------------------------------------------------- matériel

export function goodChoices(tp: TpDefinition, st: AttemptState): number {
  return tp.postes.filter(p => {
    const i = st.choices[p.id];
    return i != null && p.options[i]?.ok === true;
  }).length;
}

export const materielComplete = (tp: TpDefinition, st: AttemptState) =>
  tp.postes.length === 0 || goodChoices(tp, st) === tp.postes.length;

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

export const wiringComplete = (tp: TpDefinition, st: AttemptState) =>
  requiredLiaisons(tp).length > 0 && nextLiaison(tp, st) === undefined;

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

// ------------------------------------------------- EPI, consignation, mesures

export const epiOk = (st: AttemptState) => epiComplete(st.epi);
export const consignationOk = (st: AttemptState) => st.cons.vatRef2;
export const epiConsComplete = (st: AttemptState) => epiOk(st) && consignationOk(st);

export const horsTensionComplete = (tp: TpDefinition, st: AttemptState) => mesuresComplete(tp, st, 'horsTension');
export const sousTensionComplete = (tp: TpDefinition, st: AttemptState) => mesuresComplete(tp, st, 'sousTension');
export const deconsComplete = (st: AttemptState) => st.decons.essai;

export interface ServiceCheck { id: string; title: string; ok: boolean }

/** Étapes auto-validées de la déconsignation / mise en service. */
export function serviceChecks(st: AttemptState, sim: SimState): ServiceCheck[] {
  return [
    { id: 'unlock', title: 'Retirer le cadenas et l\'étiquette de consignation', ok: st.decons.unlock },
    { id: 'close', title: 'Refermer Q1, F2 puis F3', ok: st.decons.close },
    { id: 'essai', title: 'Essai : S2 → KM1 s\'enclenche et H1 s\'allume', ok: st.decons.essai },
    { id: 'run', title: 'Moteur en marche', ok: isRunning(sim) || st.decons.essai },
  ];
}

/** Relevés de l'étape « mesures sous tension » restant à faire. */
export const mesuresRestantes = (tp: TpDefinition, st: AttemptState, stage: 'horsTension' | 'sousTension') =>
  mesuresFor(tp, stage).filter(m => !mesureDone(st, m.id));

// ---------------------------------------------------------------- validation

export const validationComplete = (st: AttemptState) => st.fixed && st.diagnosis != null && st.quiz != null;

/** L'étape `stage` est-elle satisfaite par l'état courant ? */
export function stageSatisfied(tp: TpDefinition, st: AttemptState, sim: SimState, stage: number): boolean {
  switch (stage) {
    case 0:
    case 1: return true;
    case 2: return materielComplete(tp, st);
    case 3: return poseComplete(tp, st);
    case 4: return wiringComplete(tp, st);
    case 5: return testsComplete(tp, st);
    case 6: return epiConsComplete(st);
    case 7: return horsTensionComplete(tp, st);
    case 8: return deconsComplete(st);
    case 9: return sousTensionComplete(tp, st);
    case 10: return validationComplete(st);
    default: return false;
  }
}

// ---------------------------------------------------------------- score et rapport

export interface ScoreLine { key: string; label: string; points: number; max: number; detail: string }

export function scoreLines(tp: TpDefinition, st: AttemptState): ScoreLine[] {
  const nPostes = Math.max(1, tp.postes.length);
  const ok = goodChoices(tp, st);
  const req = requiredLiaisons(tp).length;
  const wired = st.wires.length;
  const nTests = Math.max(1, tp.tests.length);
  const nQuiz = Math.max(1, tp.quiz.length);
  const hors = mesuresFor(tp, 'horsTension');
  const sous = mesuresFor(tp, 'sousTension');
  const horsOk = hors.filter(m => mesureDone(st, m.id)).length;
  const sousOk = sous.filter(m => mesureDone(st, m.id)).length;
  const epiN = Object.values(st.epi).filter(Boolean).length;

  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));

  return [
    { key: 'materiel', label: 'Choix du matériel', points: clamp(ok / nPostes * 15, 15), max: 15, detail: `${ok} / ${tp.postes.length} références justes` },
    { key: 'pose', label: 'Pose sur la platine', points: clamp(10 - st.poseErrors * 2, 10), max: 10, detail: `${st.poseErrors} erreur${st.poseErrors > 1 ? 's' : ''} de pose` },
    { key: 'cablage', label: 'Câblage', points: clamp(wired / Math.max(1, req) * 20 - st.wireErrors * 2, 20), max: 20, detail: `${wired} / ${req} liaisons · ${st.wireErrors} refus` },
    { key: 'tests', label: 'Tests hors tension', points: clamp(Object.keys(st.tests).length / nTests * 5, 5), max: 5, detail: `${Object.keys(st.tests).length} / ${tp.tests.length} tests` },
    { key: 'epi', label: 'EPI et consignation', points: clamp((epiOk(st) ? 7 : epiN) + (consignationOk(st) ? 8 : st.cons.lock ? 3 : 0), 15), max: 15, detail: consignationOk(st) ? 'consignation complète' : 'consignation incomplète' },
    { key: 'hors', label: 'Mesures hors tension', points: clamp(horsOk / Math.max(1, hors.length) * 10, 10), max: 10, detail: `${horsOk} / ${hors.length} mesures conformes` },
    { key: 'sous', label: 'Mesures sous tension', points: clamp(sousOk / Math.max(1, sous.length) * 15, 15), max: 15, detail: `${sousOk} / ${sous.length} mesures conformes` },
    { key: 'diag', label: 'Maintenance corrective', points: st.fixed ? clamp(5 - (Math.max(1, st.diagTries) - 1) * 2, 5) : 0, max: 5, detail: st.fixed ? `panne réparée en ${Math.max(1, st.diagTries)} essai(s)` : 'panne non traitée' },
    { key: 'quiz', label: 'Questions de validation', points: clamp((st.quiz ?? 0) / nQuiz * 5, 5), max: 5, detail: st.quiz == null ? 'quiz non fait' : `${st.quiz} / ${tp.quiz.length} bonnes réponses` },
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
  epi: Record<string, boolean>;
  cons: AttemptState['cons'];
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
    epi: st.epi,
    cons: st.cons,
    competences: tp.competences,
    at: new Date().toISOString(),
  };
}
