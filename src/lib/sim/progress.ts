import type {
  AttemptState, Bareme, BaremeOverride, EvaluationMode, Liaison, TpDefinition,
} from '../types';
import { isRunning, type SimState } from './engine';
import { linkKey } from './layout';
import { epiComplete, mesureDone, mesuresComplete, mesuresFor } from './mesures';
import type { CoursId } from '../data/cours';
import {
  evaluate, PLATINE_STAGE_DOMAINS, type CompetenceEval, type DiplomaId,
} from '../data/competences';

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
    helpUsed: {},
    wiresRemoved: 0,
    resets: 0,
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
    helpUsed: raw.helpUsed ?? base.helpUsed,
    // compteurs ajoutés après coup : une tentative enregistrée avant leur existence vaut 0
    wiresRemoved: raw.wiresRemoved ?? base.wiresRemoved,
    resets: raw.resets ?? base.resets,
    // mode de passage ajouté après coup : une tentative déjà commencée reste en
    // « entraînement » (valeur sûre), une tentative neuve laisse l'élève choisir.
    mode: raw.mode ?? ((raw.stage ?? 0) > 0 || Object.keys(raw.done ?? {}).length > 0 ? 'entrainement' : undefined),
    modeImpose: raw.modeImpose ?? false,
    startedAt: raw.startedAt,
    autoEval: raw.autoEval ?? {},
    autoEvalDone: raw.autoEvalDone ?? false,
  };
}

// ---------------------------------------------------------------- rappels de cours

/**
 * Fiche(s) de rappel proposées par défaut à chaque étape du parcours platine.
 * Un TP peut préciser cette liste dans `TP_COURS`.
 */
export const STAGE_COURS: CoursId[][] = [
  ['diagnostic'],                                             // 0 choix du TP
  ['plaque-moteur', 'loi-ohm-puissance'],                     // 1 énoncé
  ['plaque-moteur', 'contacteur', 'calibre-protection'],      // 2 matériel
  ['borniers', 'regles-cablage'],                             // 3 pose
  ['contacteur', 'borniers', 'regles-cablage'],               // 4 câblage
  ['tests-hors-tension', 'transfo-commande'],                 // 5 tests hors tension
  ['epi-habilitation', 'consignation'],                       // 6 EPI & consignation
  ['tests-hors-tension', 'mesure-tension'],                   // 7 mesures hors tension
  ['deconsignation', 'contacteur'],                           // 8 déconsignation & mise en service
  ['mesure-tension', 'mesure-courant', 'vitesse-glissement'], // 9 mesures sous tension
  ['diagnostic', 'contacteur'],                               // 10 validation / maintenance
];

/** Précisions par TP : étape → fiches (remplace la valeur par défaut). */
export const TP_COURS: Record<string, Partial<Record<number, CoursId[]>>> = {
  'demarrage-direct': {
    1: ['plaque-moteur', 'couplage'],
    2: ['plaque-moteur', 'contacteur', 'transfo-commande'],
    4: ['contacteur', 'borniers', 'regles-cablage'],
    9: ['mesure-tension', 'mesure-courant', 'vitesse-glissement', 'couplage'],
  },
  'etoile-triangle': { 1: ['couplage', 'plaque-moteur'], 4: ['couplage', 'contacteur'], 9: ['mesure-courant', 'couplage'] },
  inversion: { 4: ['contacteur', 'regles-cablage'], 10: ['diagnostic', 'contacteur'] },
  'automate-m221': { 2: ['automate-m221'], 4: ['automate-m221', 'borniers'], 8: ['automate-m221', 'deconsignation'] },
  'tableau-logement': { 1: ['tableau-logement'], 2: ['tableau-logement', 'calibre-protection'], 4: ['tableau-logement', 'borniers'], 5: ['tests-hors-tension'] },
  'tableau-repartition': { 2: ['calibre-protection', 'tableau-logement'], 4: ['borniers', 'chute-tension'] },
  'va-et-vient': { 1: ['serie-parallele'], 4: ['regles-cablage', 'borniers'] },
  'chauffe-eau': { 2: ['calibre-protection'], 9: ['loi-ohm-puissance', 'energie'] },
  'eclairage-tertiaire': { 2: ['calibre-protection'], 9: ['energie', 'loi-ohm-puissance'] },
  'eclairage-baes': { 1: ['tableau-logement'], 5: ['tests-hors-tension'] },
  'pompe-relevage': { 2: ['plaque-moteur', 'calibre-protection'], 9: ['mesure-courant', 'loi-ohm-puissance'] },
  'pv-reseau': {
    1: ['pv-tension-systeme', 'serie-parallele'],
    2: ['pv-voc-temperature', 'dc-ac'],
    4: ['dc-ac', 'chute-tension'],
    5: ['dc-ac', 'tests-hors-tension'],
    9: ['mesure-tension', 'dc-ac'],
  },
  'pv-batterie': {
    1: ['energie', 'pv-tension-systeme'],
    2: ['pv-batterie', 'pv-voc-temperature'],
    4: ['dc-ac', 'chute-tension'],
    9: ['mesure-tension', 'dc-ac'],
  },
};

/** Fiches de rappel proposées à l'élève pour l'étape en cours de ce TP. */
export function coursForStage(tpId: string, stage: number): CoursId[] {
  const perTp = TP_COURS[tpId]?.[stage];
  if (perTp && perTp.length) return perTp;
  return STAGE_COURS[stage] ?? [];
}

// ---------------------------------------------------------------- barème

/**
 * Barème par défaut, documenté et surchargeable par TP (`tps.definition.bareme`).
 *
 * Poids des étapes (total 100) :
 *   matériel 15 · pose 10 · câblage 20 · tests hors tension 5 · EPI et consignation 15 ·
 *   mesures hors tension 10 · mesures sous tension 15 · maintenance 5 · quiz 5.
 *
 * Coût des gestes :
 *   — une erreur de pose retire 2 points ;
 *   — une liaison de câblage refusée retire 2 points ;
 *   — un fil retiré retire 0,25 point (se reprendre est un geste de métier, pas une faute) ;
 *   — une réinitialisation retire 0,5 point ;
 *   — l'ensemble des gestes de correction est plafonné à 3 points ;
 *   — chaque ouverture d'un rappel de cours retire 0,1 au score 0..1 de l'étape.
 *
 * Sans surcharge, la notation est strictement identique à la notation historique.
 */
export const DEFAULT_BAREME: Bareme = {
  poids: { materiel: 15, pose: 10, cablage: 20, tests: 5, epi: 15, hors: 10, sous: 15, diag: 5, quiz: 5 },
  coutErreurPose: 2,
  coutErreurCablage: 2,
  coutFilRetire: 0.25,
  coutReset: 0.5,
  coutCorrectionMax: 3,
  coutAide: 0.1,
};

/** Libellés des poids, pour l'éditeur de barème du professeur. */
export const BAREME_LABELS: Record<keyof Bareme['poids'], string> = {
  materiel: 'Choix du matériel', pose: 'Pose sur la platine', cablage: 'Câblage',
  tests: 'Tests hors tension', epi: 'EPI et consignation', hors: 'Mesures hors tension',
  sous: 'Mesures sous tension', diag: 'Maintenance corrective', quiz: 'Questions de validation',
};

/** Barème complet à partir d'une surcharge partielle (valeurs invalides ignorées). */
export function resolveBareme(over?: BaremeOverride | null): Bareme {
  if (!over) return DEFAULT_BAREME;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
  const p = over.poids ?? {};
  return {
    poids: {
      materiel: num(p.materiel, DEFAULT_BAREME.poids.materiel),
      pose: num(p.pose, DEFAULT_BAREME.poids.pose),
      cablage: num(p.cablage, DEFAULT_BAREME.poids.cablage),
      tests: num(p.tests, DEFAULT_BAREME.poids.tests),
      epi: num(p.epi, DEFAULT_BAREME.poids.epi),
      hors: num(p.hors, DEFAULT_BAREME.poids.hors),
      sous: num(p.sous, DEFAULT_BAREME.poids.sous),
      diag: num(p.diag, DEFAULT_BAREME.poids.diag),
      quiz: num(p.quiz, DEFAULT_BAREME.poids.quiz),
    },
    coutErreurPose: num(over.coutErreurPose, DEFAULT_BAREME.coutErreurPose),
    coutErreurCablage: num(over.coutErreurCablage, DEFAULT_BAREME.coutErreurCablage),
    coutFilRetire: num(over.coutFilRetire, DEFAULT_BAREME.coutFilRetire),
    coutReset: num(over.coutReset, DEFAULT_BAREME.coutReset),
    coutCorrectionMax: num(over.coutCorrectionMax, DEFAULT_BAREME.coutCorrectionMax),
    coutAide: num(over.coutAide, DEFAULT_BAREME.coutAide),
  };
}

/** Barème appliqué à un TP (surcharge éventuelle portée par sa définition). */
export const baremeOf = (tp: TpDefinition): Bareme => resolveBareme(tp.bareme);

/** Total des poids : 100 avec le barème par défaut. */
export const baremeTotal = (b: Bareme): number =>
  Object.values(b.poids).reduce((a, v) => a + v, 0);

/**
 * Pénalités appliquées au score 0..1 d'une étape, déduites du barème en points :
 * une liaison refusée vaut le quarantième du coût en points, un fil retiré le vingt-cinquième.
 * Avec le barème par défaut : 0,05 · 0,01 · 0,02, plafond 0,15 — les valeurs historiques.
 */
function scorePenalties(b: Bareme) {
  return {
    erreurCablage: b.coutErreurCablage / 40,
    filRetire: b.coutFilRetire / 25,
    reset: b.coutReset / 25,
    correctionMax: b.coutCorrectionMax / 20,
  };
}

// ---------------------------------------------------------------- mode de passage

/** Nombre d'ouvertures de l'aide autorisées en mode évaluation (au-delà, l'aide est refusée). */
export const AIDE_MAX_EVALUATION = 3;

/** Mode effectif d'une tentative : « entraînement » tant que rien n'a été choisi. */
export const modeOf = (st: AttemptState): EvaluationMode => st.mode ?? 'entrainement';

/** Le mode a-t-il été explicitement choisi (sinon : proposer le choix au lancement) ? */
export const modeChosen = (st: AttemptState): boolean => st.mode != null;

/** Aide encore disponible ? (illimitée en entraînement) */
export function aideAllowed(st: AttemptState): boolean {
  if (modeOf(st) !== 'evaluation') return true;
  const total = Object.values(st.helpUsed ?? {}).reduce((a, v) => a + v, 0);
  return total < AIDE_MAX_EVALUATION;
}

/** Ouvertures d'aide restantes en mode évaluation. */
export function aideLeft(st: AttemptState): number {
  const total = Object.values(st.helpUsed ?? {}).reduce((a, v) => a + v, 0);
  return Math.max(0, AIDE_MAX_EVALUATION - total);
}

/** Secondes écoulées depuis le début de la tentative (chronomètre). */
export function elapsedSeconds(st: AttemptState, now = Date.now()): number {
  if (!st.startedAt) return 0;
  const t = Date.parse(st.startedAt);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((now - t) / 1000));
}

/** Chronomètre formaté « mm:ss » (ou « h:mm:ss » au-delà d'une heure). */
export function formatChrono(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
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

/**
 * Barème des gestes de correction du câblage (défaire un fil, tout recâbler).
 *
 * Défaire un fil est un geste de métier, pas une faute : l'élève qui se reprend doit être
 * bien mieux noté que celui qui accumule les liaisons refusées. On garde donc un poids très
 * faible, purement indicatif pour le professeur :
 *   — une liaison refusée (`wireErrors`) coûte 2 points sur 20 à l'étape câblage ;
 *   — un fil retiré (`wiresRemoved`) coûte 0,25 point, soit huit fois moins ;
 *   — une réinitialisation (`resets`) coûte 0,5 point.
 * La pénalité totale de correction est en outre plafonnée à 3 points sur 20, pour qu'un
 * élève qui tâtonne longuement puisse malgré tout valider proprement son câblage.
 * Sur le score par compétences (0..1), les mêmes gestes valent 0,01 et 0,02 par unité.
 */
export const WIRE_REMOVE_COST = 0.25;
export const RESET_COST = 0.5;
export const CORRECTION_MAX_COST = 3;

/** Pénalité (en points sur 20) des gestes de correction d'une tentative. */
export function correctionPenalty(st: AttemptState, b: Bareme = DEFAULT_BAREME): number {
  const raw = (st.wiresRemoved ?? 0) * b.coutFilRetire + (st.resets ?? 0) * b.coutReset;
  return Math.min(b.coutCorrectionMax, raw);
}

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

export function scoreLines(tp: TpDefinition, st: AttemptState, bareme?: Bareme): ScoreLine[] {
  const b = bareme ?? baremeOf(tp);
  const w = b.poids;
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
    { key: 'materiel', label: 'Choix du matériel', points: clamp(ok / nPostes * w.materiel, w.materiel), max: w.materiel, detail: `${ok} / ${tp.postes.length} références justes` },
    { key: 'pose', label: 'Pose sur la platine', points: clamp(w.pose - st.poseErrors * b.coutErreurPose, w.pose), max: w.pose, detail: `${st.poseErrors} erreur${st.poseErrors > 1 ? 's' : ''} de pose` },
    { key: 'cablage', label: 'Câblage', points: clamp(wired / Math.max(1, req) * w.cablage - st.wireErrors * b.coutErreurCablage - correctionPenalty(st, b), w.cablage), max: w.cablage, detail: `${wired} / ${req} liaisons · ${st.wireErrors} refus · ${st.wiresRemoved ?? 0} fil${(st.wiresRemoved ?? 0) > 1 ? 's' : ''} retiré${(st.wiresRemoved ?? 0) > 1 ? 's' : ''} · ${st.resets ?? 0} remise${(st.resets ?? 0) > 1 ? 's' : ''} à zéro` },
    { key: 'tests', label: 'Tests hors tension', points: clamp(Object.keys(st.tests).length / nTests * w.tests, w.tests), max: w.tests, detail: `${Object.keys(st.tests).length} / ${tp.tests.length} tests` },
    { key: 'epi', label: 'EPI et consignation', points: clamp((epiOk(st) ? w.epi * 7 / 15 : epiN * w.epi / 15) + (consignationOk(st) ? w.epi * 8 / 15 : st.cons.lock ? w.epi * 3 / 15 : 0), w.epi), max: w.epi, detail: consignationOk(st) ? 'consignation complète' : 'consignation incomplète' },
    { key: 'hors', label: 'Mesures hors tension', points: clamp(horsOk / Math.max(1, hors.length) * w.hors, w.hors), max: w.hors, detail: `${horsOk} / ${hors.length} mesures conformes` },
    { key: 'sous', label: 'Mesures sous tension', points: clamp(sousOk / Math.max(1, sous.length) * w.sous, w.sous), max: w.sous, detail: `${sousOk} / ${sous.length} mesures conformes` },
    { key: 'diag', label: 'Maintenance corrective', points: st.fixed ? clamp(w.diag - (Math.max(1, st.diagTries) - 1) * w.diag * 2 / 5, w.diag) : 0, max: w.diag, detail: st.fixed ? `panne réparée en ${Math.max(1, st.diagTries)} essai(s)` : 'panne non traitée' },
    { key: 'quiz', label: 'Questions de validation', points: clamp((st.quiz ?? 0) / nQuiz * w.quiz, w.quiz), max: w.quiz, detail: st.quiz == null ? 'quiz non fait' : `${st.quiz} / ${tp.quiz.length} bonnes réponses` },
  ];
}

export function computeScore(tp: TpDefinition, st: AttemptState, bareme?: Bareme): number {
  return scoreLines(tp, st, bareme).reduce((a, l) => a + l.points, 0);
}

// ------------------------------------------------ évaluation par compétences

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Nombre d'ouvertures de l'aide « rappel de cours » sur une étape. */
export const helpCount = (st: AttemptState, stage: number): number => st.helpUsed?.[stage] ?? 0;

/** Lectures d'instrument fautives (ERR) faites pendant une étape. */
function errReadings(st: AttemptState, stage: number): number {
  return st.readings.filter(r => r.stage === stage && r.display.startsWith('ERR')).length;
}

/** L'étape a-t-elle été atteinte (donc évaluable) ? */
function stageReached(st: AttemptState, stage: number): boolean {
  return st.done[stage] === true || st.stage > stage;
}

/**
 * Score brut 0..1 d'une étape, avant pénalité d'aide.
 * `undefined` si l'étape n'a pas été faite : elle restera « non évaluée ».
 */
function rawStageScore(tp: TpDefinition, st: AttemptState, stage: number, b: Bareme): number | undefined {
  if (!stageReached(st, stage)) return undefined;
  switch (stage) {
    case 0:
    case 1:
      return 1;
    case 2: {
      const n = tp.postes.length;
      return n === 0 ? 1 : clamp01(goodChoices(tp, st) / n);
    }
    case 3: {
      const n = Math.max(1, tp.slots.length);
      return clamp01(1 - st.poseErrors / n);
    }
    case 4: {
      const req = requiredLiaisons(tp).length;
      if (req === 0) return 1;
      const done = requiredLiaisons(tp).filter(l => isWired(st, l)).length;
      // même logique que `correctionPenalty` : le retrait d'un fil pèse cinq fois moins
      // qu'une liaison refusée, et l'ensemble des corrections est plafonné à 0,15.
      const pen = scorePenalties(b);
      const corr = Math.min(pen.correctionMax, (st.wiresRemoved ?? 0) * pen.filRetire + (st.resets ?? 0) * pen.reset);
      return clamp01(done / req - st.wireErrors * pen.erreurCablage - corr);
    }
    case 5: {
      const n = tp.tests.length;
      if (n === 0) return 1;
      return clamp01(tp.tests.filter(t => st.tests[t.id] != null).length / n);
    }
    case 6: {
      const c = st.cons;
      const steps = [c.sep, c.lock, c.ident, c.vatRef, c.vat.length >= 3, c.vatRef2];
      const ordered = steps.filter(Boolean).length / steps.length;
      const epiPart = epiOk(st) ? 1 : Object.values(st.epi).filter(Boolean).length / 6;
      return clamp01(0.65 * ordered + 0.35 * clamp01(epiPart) - errReadings(st, 6) * 0.1);
    }
    case 7: {
      const list = mesuresFor(tp, 'horsTension');
      if (list.length === 0) return 1;
      const ok = list.filter(m => mesureDone(st, m.id)).length;
      return clamp01(ok / list.length - errReadings(st, 7) * 0.15);
    }
    case 8:
      return st.decons.essai ? 1 : st.decons.close ? 0.5 : 0.2;
    case 9: {
      const list = mesuresFor(tp, 'sousTension');
      if (list.length === 0) return 1;
      const ok = list.filter(m => mesureDone(st, m.id)).length;
      return clamp01(ok / list.length - errReadings(st, 9) * 0.15);
    }
    case 10: {
      const tries = Math.max(1, st.diagTries);
      const diag = !st.fixed ? 0 : tries === 1 ? 1 : tries === 2 ? 0.7 : 0.4;
      const nQuiz = tp.quiz.length;
      const quiz = nQuiz === 0 ? 1 : clamp01((st.quiz ?? 0) / nQuiz);
      return clamp01(0.6 * diag + 0.4 * quiz);
    }
    default:
      return undefined;
  }
}

/**
 * Score 0..1 par étape du parcours, pénalisé par les ouvertures de l'aide
 * (−0,1 par ouverture, plancher 0,3 quand l'étape est réussie malgré tout).
 */
export function stageScores(tp: TpDefinition, st: AttemptState, bareme?: Bareme): (number | undefined)[] {
  const b = bareme ?? baremeOf(tp);
  return PLATINE_STAGE_DOMAINS.map((_, i) => {
    const raw = rawStageScore(tp, st, i, b);
    if (raw == null) return undefined;
    const penalty = helpCount(st, i) * b.coutAide;
    const floor = raw >= 0.5 ? 0.3 : 0;
    return Math.max(floor, clamp01(raw - penalty));
  });
}

/** Grille de compétences du diplôme, ou `null` pour un TP non jouable. */
export function buildEvaluation(
  tp: TpDefinition,
  st: AttemptState,
  diploma: DiplomaId,
  bareme?: Bareme,
): CompetenceEval[] | null {
  if (!tp.playable) return null;
  return evaluate(diploma, PLATINE_STAGE_DOMAINS, stageScores(tp, st, bareme), st.autoEval ?? null);
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
  /** Identité de l'élève au moment du TP. */
  student: { name: string; diploma: DiplomaId | null; etablissement: string } | null;
  /** Grille de compétences (null pour un TP non jouable). */
  evaluation: CompetenceEval[] | null;
  /** Score 0..1 par étape, base de la grille. */
  stageScores: (number | undefined)[];
  /** Ouvertures de l'aide « rappel de cours », par étape. */
  helpUsed: Record<number, number>;
  /** Fils défaits par l'élève (geste de correction). */
  wiresRemoved: number;
  /** Réinitialisations de câblage demandées. */
  resets: number;
  /** Mode de passage (entraînement / évaluation). */
  mode: EvaluationMode;
  /** Durée de la tentative, en secondes. */
  duree: number;
  /** Auto-évaluation de l'élève, avant correction. */
  autoEval: Record<string, string>;
}

export interface ReportStudent { name: string; diploma: DiplomaId | null; etablissement: string }

export function buildReport(tp: TpDefinition, st: AttemptState, student?: ReportStudent | null): Report {
  const b = baremeOf(tp);
  const lines = scoreLines(tp, st, b);
  const diploma = student?.diploma ?? null;
  return {
    student: student ?? null,
    evaluation: diploma ? buildEvaluation(tp, st, diploma, b) : null,
    stageScores: stageScores(tp, st, b),
    mode: modeOf(st),
    duree: elapsedSeconds(st),
    autoEval: st.autoEval ?? {},
    helpUsed: st.helpUsed ?? {},
    wiresRemoved: st.wiresRemoved ?? 0,
    resets: st.resets ?? 0,
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
