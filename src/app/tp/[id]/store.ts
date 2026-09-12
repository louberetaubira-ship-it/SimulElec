'use client';

import { create } from 'zustand';
import type {
  AttemptState, EvaluationMode, InstrumentKind, Liaison, NetKind, ReadingRecord, TpDefinition,
} from '@/lib/types';
import {
  initialSim, injectFault, isFaultId, netLive, pickFault, pressButton, releaseButton, repairFault,
  resetF1, setCoupling, tick, toggleCarter, toggleF2, toggleF3, toggleQ1, type SimState,
} from '@/lib/sim/engine';
import { linkKey } from '@/lib/sim/layout';
import {
  checkExpected, instrumentDef, read, type ClampWire, type ReadOut,
} from '@/lib/sim/mesures';
import {
  aideAllowed, AIDE_MAX_EVALUATION, buildEvaluation, buildReport, computeScore, coursForStage,
  initialState, modeOf, netOfTerminal, nextLiaison, normalizeState, requiredLiaisons,
  stageSatisfied, STAGE_COUNT, STAGES,
} from '@/lib/sim/progress';
import type { CoursId } from '@/lib/data/cours';
import { DEFAULT_DIPLOMA, fallbackStudent, type Student } from '@/lib/student';
import type { DiplomaId, Mastery } from '@/lib/data/competences';
import {
  addMeasurement, finishAttempt, getOrCreateAttempt, measurementOf, saveAttemptState,
} from '@/lib/db/attempts';
import type { PanelWire } from '@/components/panel/Panel';

export interface BotTurn { role: 'user' | 'assistant'; content: string }

export type Pick_ = 'r' | 'k' | 'clamp' | null;

export interface MesState {
  inst: InstrumentKind | null;
  dial: number;
  probes: { r: string | null; k: string | null };
  clamp: number | null;
  pick: Pick_;
  log: string[];
}

const initialMes = (): MesState => ({ inst: null, dial: 0, probes: { r: null, k: null }, clamp: null, pick: null, log: [] });

/** Raison d'une ouverture automatique de l'aide. */
export type AideReason = 'cablage' | 'materiel' | 'mesure' | 'diagnostic' | null;

/* ------------------------------------------------------- défaire / refaire */

/** Portée d'une réinitialisation demandée par l'élève. */
export type ResetScope = 'stage' | 'all' | 'tp';

/** Phase de câblage : les liaisons de puissance et celles de commande se traitent à part. */
export type WirePhase = 'puissance' | 'commande';

/** Photo de l'état câblage : tout ce qu'une opération annulable peut changer. */
export interface WireSnap {
  wires: AttemptState['wires'];
  wiresRemoved: number;
  resets: number;
}

/** Une opération annulable de la pile (câblage, retrait, effacement). */
export interface UndoEntry { label: string; before: WireSnap; after: WireSnap }

/** Profondeur de la pile d'annulation (au moins 30 opérations). */
export const UNDO_MAX = 40;

/** Durée d'affichage du message « Fil X → Y supprimé · Annuler » (ms). */
const UNDO_NOTICE_MS = 5500;

/** Un fil de commande (24 V / 0 V) ? Les autres conducteurs sont de la puissance. */
export const isCommandeNet = (n: NetKind): boolean => n === 'C' || n === 'C0';

/** Nature des liaisons attendues restantes : puissance d'abord, commande ensuite. */
export function currentPhase(tp: TpDefinition, st: AttemptState): WirePhase {
  const n = nextLiaison(tp, st);
  if (n) return isCommandeNet(n.net) ? 'commande' : 'puissance';
  const last = st.wires[st.wires.length - 1];
  return last && isCommandeNet(last.net) ? 'commande' : 'puissance';
}

/** Fils de l'élève appartenant à la phase demandée. */
export const wiresOfPhase = (st: AttemptState, phase: WirePhase) =>
  st.wires.filter(w => (isCommandeNet(w.net) ? 'commande' : 'puissance') === phase);

/** Libellé court d'un fil, pour les messages et la liste latérale. */
export const wireLabel = (w: { a: string; b: string }): string =>
  `${w.a.replace('.', ' ')} → ${w.b.replace('.', ' ')}`;

interface ParcoursState {
  tp: TpDefinition;
  attemptId: string | null;
  offline: boolean;
  /** Identité de l'élève (nom, diplôme préparé) : en-tête du parcours et rapports. */
  student: Student;
  /**
   * Référentiel dans lequel la tentative est évaluée : profil, à défaut classe, à défaut
   * niveau du TP (voir `useDiploma`). L'aperçu professeur peut le forcer.
   */
  evalDiploma: DiplomaId;
  st: AttemptState;
  sim: SimState;
  mes: MesState;
  toast: string | null;
  selTerminal: string | null;
  selSlot: string | null;
  selDevice: string | null;
  turns: BotTurn[];
  saving: boolean;

  /** Aide « rappel de cours » : panneau ouvert, fiche affichée, ouvertures automatiques. */
  aideOpen: boolean;
  aideReason: AideReason;
  aideFiche: CoursId | null;
  aideAuto: Record<number, boolean>;
  badChoices: number;
  /** Professeur virtuel : panneau mobile ouvert, question envoyée depuis l'aide. */
  botOpen: boolean;
  pendingQuestion: string | null;

  /** Câblage — index (dans `panelWires`) du fil sélectionné sur la platine. */
  selWire: number | null;
  /** Câblage — menu contextuel tactile ouvert sur un fil (appui long). */
  wireMenu: { index: number; x: number; y: number } | null;
  /** Câblage — piles d'annulation / rétablissement. */
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  /** Câblage — message temporaire « … supprimé » avec bouton « Annuler ». */
  undoNotice: string | null;
  /** Câblage — boîte de dialogue de confirmation ouverte. */
  confirmScope: ResetScope | null;
  restarting: boolean;

  init: (tp: TpDefinition) => Promise<void>;
  setStudent: (s: Student) => void;
  setEvalDiploma: (d: DiplomaId) => void;
  /** Choix du mode de passage au lancement (ou mode imposé par le professeur). */
  setMode: (m: EvaluationMode, impose?: boolean) => void;
  /** Auto-évaluation : l'élève se place sur une compétence, puis valide. */
  setAutoEval: (code: string, level: Mastery) => void;
  submitAutoEval: () => void;
  openAide: (reason?: AideReason) => void;
  closeAide: () => void;
  setAideFiche: (id: CoursId | null) => void;
  setBotOpen: (v: boolean) => void;
  askProf: (question: string) => void;
  consumeQuestion: () => void;
  say: (m: string) => void;
  goStage: (i: number) => void;
  complete: (i: number) => void;

  choose: (posteId: string, index: number) => void;
  selectSlot: (slotId: string) => void;
  selectDevice: (slotId: string) => void;

  clickTerminal: (id: string) => void;
  assist: () => void;

  /** Câblage — sélection, suppression, annulation, réinitialisation. */
  selectWire: (index: number | null) => void;
  openWireMenu: (index: number, x: number, y: number) => void;
  closeWireMenu: () => void;
  deleteWire: (index: number) => void;
  deleteSelectedWire: () => void;
  undo: () => void;
  redo: () => void;
  dismissUndoNotice: () => void;
  askReset: (scope: ResetScope | null) => void;
  confirmReset: () => Promise<void>;
  runTest: (id: string, value: string) => void;
  /** À l'entrée d'une étape : met la platine dans l'état de départ attendu. */
  enterStage: (stage: number) => void;

  // ---- mesures
  setInstrument: (i: InstrumentKind) => void;
  rotateDial: () => void;
  setDial: (i: number) => void;
  setPick: (p: Pick_) => void;
  clearProbes: () => void;
  onWire: (idx: number) => void;
  toggleEpi: (id: string) => void;
  consAct: (a: 'lock' | 'ident' | 'unlock') => void;
  record: () => void;
  currentRead: () => ReadOut;

  setLoad: (v: number) => void;
  coupling: (c: 'Y' | 'D') => void;
  deviceClick: (slotId: string) => void;
  /** Appui / relâchement d'un organe du coffret de porte, désigné par son repère. */
  button: (rep: string, down?: boolean) => void;
  /** Bascule l'écran de protection commandé par l'interrupteur de position. */
  carter: () => void;
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

/** Liaisons affichées : celles de l'installateur + celles réalisées par l'élève. */
export function visibleWires(tp: TpDefinition, st: AttemptState, all = false): { a: string; b: string; net: NetKind; prewired?: boolean; door?: boolean }[] {
  const pre = tp.liaisons.filter(l => l.prewired);
  const mine = all
    ? requiredLiaisons(tp)
    : requiredLiaisons(tp).filter(l => st.wires.some(w => linkKey(w.a, w.b) === linkKey(l.a, l.b)));
  return [...pre, ...mine].map(l => ({ a: l.a, b: l.b, net: l.net, prewired: l.prewired, door: l.door }));
}

/** Liaisons prêtes pour le `<Panel>`, avec l'estompage des fils hors tension. */
export function panelWires(tp: TpDefinition, st: AttemptState, sim: SimState, all = false): PanelWire[] {
  return visibleWires(tp, st, all).map(w => ({ ...w, dead: !netLive(w, sim, tp) }));
}

export const useParcours = create<ParcoursState>((set, get) => {
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

  const patch = (fn: (st: AttemptState) => AttemptState) => {
    set(s => ({ st: fn(s.st) }));
    schedule();
  };

  const say = (m: string) => {
    if (!m) return;
    set({ toast: m });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  };

  const mlog = (t: string) => {
    set(s => (s.mes.log[0] === t ? s : { mes: { ...s.mes, log: [t, ...s.mes.log].slice(0, 10) } }));
  };

  /** Liaison actuellement serrée par la pince. */
  const clampWire = (): ClampWire | null => {
    const { tp, st, sim, mes } = get();
    if (mes.clamp == null) return null;
    const w = panelWires(tp, st, sim)[mes.clamp];
    return w ? { a: w.a, b: w.b, net: w.net } : null;
  };

  const currentRead = (): ReadOut => {
    const { tp, sim, mes } = get();
    const def = instrumentDef(mes.inst);
    const dial = def ? def.dials[Math.min(mes.dial, def.dials.length - 1)] : 'OFF';
    return read(tp, sim, mes.inst, dial, mes.probes, clampWire());
  };

  /** Consignation, VAT, validation des mesures : rejoué à chaque changement. */
  const evaluate = () => {
    const { tp, st, sim, mes, attemptId, offline } = get();
    const def = instrumentDef(mes.inst);
    const dial = def ? def.dials[Math.min(mes.dial, def.dials.length - 1)] : 'OFF';
    const { r, k } = mes.probes;
    const out = read(tp, sim, mes.inst, dial, mes.probes, clampWire());
    const stage = st.stage;

    // ---- séparation (étape 6) : Q1 ouvert met toute la platine hors tension
    if (stage === 6 && st.cons.sep !== !sim.q1) {
      patch(s => ({ ...s, cons: { ...s.cons, sep: !sim.q1 } }));
    }
    if (stage === 6 && !sim.q1 && (sim.f2 || sim.f3)) {
      set(s => ({ sim: { ...s.sim, f2: false, f3: false, km1: false } }));
      mlog('Séparation : Q1 ouvert, F2 et F3 retombent avec lui.');
    }

    // ---- déconsignation (étape 8)
    if (stage === 8) {
      const d = st.decons;
      const close = d.unlock && sim.q1 && sim.f2 && sim.f3;
      const essai = (d.close || close) && sim.km1;
      if (close !== d.close || essai !== d.essai) {
        if (close && !d.close) mlog('Q1, F2 et F3 refermés : la platine est remise sous tension.');
        if (essai && !d.essai) mlog('Essai concluant : KM1 s\'enclenche, H1 s\'allume.');
        patch(s => ({ ...s, decons: { ...s.decons, close: close || s.decons.close, essai: essai || s.decons.essai } }));
      }
    }

    // ---- VAT pendant la consignation
    if (stage === 6 && mes.inst === 'vat' && r && k) {
      const c = st.cons;
      const pair = (a: string, b: string) => (r === a && k === b) || (r === b && k === a);
      if (pair('RES.L1', 'RES.N') || pair('RES.L1', 'RES.PE')) {
        if (!c.vatRef) {
          patch(s => ({ ...s, cons: { ...s.cons, vatRef: true } }));
          mlog('VAT vérifié sur source connue : 230 V détectés.');
        } else if (c.vat.length >= 3 && !c.vatRef2) {
          patch(s => ({ ...s, cons: { ...s.cons, vatRef2: true } }));
          mlog('VAT re-vérifié : installation consignée.');
          say('Installation consignée : tu peux mesurer hors tension.');
        }
      } else if (!sim.q1 && c.lock && c.vatRef && r !== k && !r.startsWith('RES.') && !k.startsWith('RES.')) {
        const known = c.vat.some(x => (x[0] === r && x[1] === k) || (x[0] === k && x[1] === r));
        if (!known && (out.value ?? 0) <= 50) {
          patch(s => ({ ...s, cons: { ...s.cons, vat: [...s.cons.vat, [r, k] as [string, string]] } }));
          mlog(`VAT ${r} / ${k} : absence de tension.`);
        }
      } else if (sim.q1 && (out.value ?? 0) > 50) {
        mlog('⚠ Présence de tension : Q1 n\'est pas ouvert, ne touche à rien.');
      }
    }

    // ---- mesure d'ohms sous tension
    if (out.bad) mlog('⚠ Mesure de résistance sous tension : ERR, le fusible de l\'appareil grille.');

    // ---- validation d'une mesure attendue
    if ((stage === 7 || stage === 9) && mes.inst) {
      const wireId = mes.clamp != null ? (() => { const w = clampWire(); return w ? `${w.a}>${w.b}` : undefined; })() : undefined;
      const partial = {
        instrument: mes.inst, dial, a: r ?? undefined, b: k ?? undefined, wire: wireId, value: out.value,
      };
      const id = checkExpected(tp, sim, partial);
      if (id && !st.readings.some(x => x.expectedId === id)) {
        const entry: ReadingRecord = {
          ...partial,
          display: `${out.display} ${out.unit}`.trim(),
          stage,
          at: new Date().toISOString(),
          expectedId: id,
        };
        patch(s => ({ ...s, readings: [...s.readings, entry] }));
        const m = tp.mesures.find(x => x.id === id);
        mlog(`✔ ${m?.title ?? id} : ${entry.display}`);
        say(`Mesure validée : ${m?.title ?? id}`);
        if (attemptId && !offline) {
          void addMeasurement(attemptId, measurementOf(entry)).catch(() => set({ offline: true }));
        }
      }
    }
  };

  /* ---------------------------------------------- défaire / refaire un fil */

  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

  const snapOf = (st: AttemptState): WireSnap => ({
    wires: st.wires,
    wiresRemoved: st.wiresRemoved ?? 0,
    resets: st.resets ?? 0,
  });

  const applySnap = (st: AttemptState, snap: WireSnap): AttemptState => ({
    ...st, wires: snap.wires, wiresRemoved: snap.wiresRemoved, resets: snap.resets,
  });

  /** Applique une opération sur le câblage et l'empile dans l'historique. */
  const commit = (label: string, next: (snap: WireSnap) => WireSnap) => {
    const before = snapOf(get().st);
    const after = next(before);
    patch(st => applySnap(st, after));
    set(s => ({
      undoStack: [...s.undoStack, { label, before, after }].slice(-UNDO_MAX),
      redoStack: [],
    }));
  };

  /** Message temporaire « Fil X → Y supprimé », avec un bouton « Annuler ». */
  const notice = (m: string | null) => {
    set({ undoNotice: m });
    if (noticeTimer) clearTimeout(noticeTimer);
    if (m) noticeTimer = setTimeout(() => set({ undoNotice: null }), UNDO_NOTICE_MS);
  };

  /** Fil affiché à cet index de la platine (pré-câblé compris). */
  const wireAt = (index: number | null) => {
    if (index == null) return null;
    const { tp, st, sim } = get();
    return panelWires(tp, st, sim)[index] ?? null;
  };

  /** Retire un fil de l'élève ; refuse les liaisons de l'installateur. */
  const removeWire = (index: number): boolean => {
    const w = wireAt(index);
    if (!w) return false;
    if (w.prewired) {
      set({ selWire: null, wireMenu: null });
      say('Fil posé par l\'installateur : non modifiable');
      return false;
    }
    const k = linkKey(w.a, w.b);
    commit(`Retrait ${wireLabel(w)}`, snap => ({
      ...snap,
      wires: snap.wires.filter(x => linkKey(x.a, x.b) !== k),
      wiresRemoved: snap.wiresRemoved + 1,
    }));
    set({ selWire: null, wireMenu: null });
    notice(`Fil ${wireLabel(w)} supprimé`);
    return true;
  };

  /** Ouvre l'aide (manuellement ou automatiquement) et compte l'ouverture sur l'étape. */
  const openAide = (reason: AideReason = null) => {
    const { st, tp, aideOpen } = get();
    if (aideOpen) return;
    if (!aideAllowed(st)) {
      say(`Mode évaluation : tu as déjà utilisé tes ${AIDE_MAX_EVALUATION} aides.`);
      return;
    }
    const fiche = coursForStage(tp?.id ?? '', st.stage)[0] ?? null;
    set({ aideOpen: true, aideReason: reason, aideFiche: get().aideFiche ?? fiche });
    patch(s2 => ({ ...s2, helpUsed: { ...s2.helpUsed, [s2.stage]: (s2.helpUsed[s2.stage] ?? 0) + 1 } }));
  };

  /** Ouverture automatique, une seule fois par étape, quand l'élève accumule les erreurs. */
  const autoAide = (reason: Exclude<AideReason, null>) => {
    const { st, aideAuto, aideOpen } = get();
    if (aideAuto[st.stage] || aideOpen) return;
    set({ aideAuto: { ...aideAuto, [st.stage]: true } });
    openAide(reason);
    say('Un rappel de cours peut t\'aider : regarde la fiche, puis reprends.');
  };

  return {
    tp: null as unknown as TpDefinition,
    attemptId: null,
    offline: false,
    student: fallbackStudent(),
    evalDiploma: DEFAULT_DIPLOMA,
    aideOpen: false,
    aideReason: null,
    aideFiche: null,
    aideAuto: {},
    badChoices: 0,
    botOpen: false,
    pendingQuestion: null,
    selWire: null,
    wireMenu: null,
    undoStack: [],
    redoStack: [],
    undoNotice: null,
    confirmScope: null,
    restarting: false,
    st: initialState(),
    sim: initialSim(),
    mes: initialMes(),
    toast: null,
    selTerminal: null,
    selSlot: null,
    selDevice: null,
    turns: [],
    saving: false,

    async init(tp) {
      set({
        tp, st: initialState(), sim: initialSim(), mes: initialMes(), turns: [],
        offline: false, attemptId: null,
        selWire: null, wireMenu: null, undoStack: [], redoStack: [], undoNotice: null,
        confirmScope: null, restarting: false,
      });
      try {
        const row = await getOrCreateAttempt(tp.id);
        const restored = normalizeState(row.state as Partial<AttemptState> | null);
        set({
          attemptId: row.id,
          st: restored,
          sim: isFaultId(restored.fault) && !restored.fixed
            ? { ...initialSim(), fault: restored.fault }
            : initialSim(),
        });
      } catch {
        set({ offline: true });
      }
    },

    setStudent(student) { set({ student }); },

    setEvalDiploma(d) { set({ evalDiploma: d }); },

    setMode(m, impose = false) {
      patch(s2 => ({ ...s2, mode: m, modeImpose: impose, startedAt: s2.startedAt ?? new Date().toISOString() }));
      say(m === 'evaluation'
        ? 'Mode évaluation : chronomètre lancé, aide limitée, une seule tentative.'
        : 'Mode entraînement : prends ton temps, l\'aide est illimitée.');
    },

    setAutoEval(code, level) {
      if (level === 'nonEvalue') return;
      patch(s2 => ({ ...s2, autoEval: { ...(s2.autoEval ?? {}), [code]: level } }));
    },

    submitAutoEval() { patch(s2 => ({ ...s2, autoEvalDone: true })); },

    openAide(reason = null) { openAide(reason); },

    closeAide() { set({ aideOpen: false, aideReason: null }); },

    setAideFiche(id) { set({ aideFiche: id }); },

    setBotOpen(v) { set({ botOpen: v }); },

    askProf(question) { set({ pendingQuestion: question, botOpen: true, aideOpen: false }); },

    consumeQuestion() { set({ pendingQuestion: null }); },

    say,

    goStage(i) {
      const { st, tp } = get();
      if (i < 0 || i >= STAGE_COUNT) return;
      if (i > st.stage && !st.done[i - 1]) { say('Termine d\'abord l\'étape précédente.'); return; }
      if (!tp.playable && i > 3) { say('Ce TP est en cours de finalisation : le parcours s\'arrête à la pose.'); return; }
      set({ selTerminal: null, selSlot: null, selDevice: null, aideOpen: false, aideFiche: null, selWire: null, wireMenu: null });
      patch(s => ({ ...s, stage: i }));
    },

    complete(i) {
      const { st } = get();
      if (!st.done[i]) say(`Étape validée : ${STAGES[i]}`);
      patch(s => ({ ...s, done: { ...s.done, [i]: true } }));
    },

    choose(posteId, index) {
      const { tp } = get();
      patch(s => ({ ...s, choices: { ...s.choices, [posteId]: index } }));
      const ok = tp.postes.find(p => p.id === posteId)?.options[index]?.ok === true;
      if (!ok) {
        const n = get().badChoices + 1;
        set({ badChoices: n });
        if (n >= 2) autoAide('materiel');
      }
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
      const { st } = get();
      if (st.placed[slotId]) return;
      set({ selDevice: slotId });
      patch(s => ({ ...s, placed: { ...s.placed, [slotId]: true } }));
      const { tp } = get();
      say(`${tp.slots.find(x => x.id === slotId)?.label.split(' · ')[0] ?? slotId} posé sur son rail.`);
      set({ selDevice: null, selSlot: null });
    },

    clickTerminal(id) {
      const { tp, st, selTerminal, mes } = get();

      // ---- étapes de mesure : on pose une pointe de touche
      if (st.stage >= 6 && mes.pick && mes.pick !== 'clamp') {
        const which = mes.pick;
        set(s => ({ mes: { ...s.mes, probes: { ...s.mes.probes, [which]: id }, pick: which === 'r' ? 'k' : null } }));
        evaluate();
        return;
      }
      if (st.stage !== 4) return;

      if (!selTerminal) { set({ selTerminal: id }); return; }
      if (selTerminal === id) { set({ selTerminal: null }); return; }

      const k = linkKey(selTerminal, id);
      const expected = requiredLiaisons(tp).find(l => linkKey(l.a, l.b) === k);
      if (st.wires.some(w => linkKey(w.a, w.b) === k)) {
        say('Cette liaison est déjà faite.');
      } else if (expected) {
        commit(`Liaison ${wireLabel(expected)}`, snap => ({
          ...snap, wires: [...snap.wires, { a: expected.a, b: expected.b, net: expected.net }],
        }));
        say(`Liaison ${expected.a} → ${expected.b} réalisée.`);
      } else {
        patch(s => ({ ...s, wireErrors: s.wireErrors + 1 }));
        if (get().st.wireErrors >= 3) autoAide('cablage');
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
      commit(`Liaison ${wireLabel(n)}`, snap => ({
        ...snap, wires: [...snap.wires, { a: n.a, b: n.b, net: n.net }],
      }));
      say(`Câblage assisté : ${n.a} → ${n.b}`);
    },

    selectWire(index) {
      if (index == null) { set({ selWire: null, wireMenu: null }); return; }
      const w = wireAt(index);
      if (!w) return;
      if (w.prewired) {
        set({ selWire: null, wireMenu: null });
        say('Fil posé par l\'installateur : non modifiable');
        return;
      }
      set(s => ({ selWire: s.selWire === index ? null : index, wireMenu: null }));
    },

    openWireMenu(index, x, y) {
      const w = wireAt(index);
      if (!w) return;
      if (w.prewired) { say('Fil posé par l\'installateur : non modifiable'); return; }
      set({ selWire: index, wireMenu: { index, x, y } });
    },

    closeWireMenu() { set({ wireMenu: null }); },

    deleteWire(index) { removeWire(index); },

    deleteSelectedWire() {
      const { selWire } = get();
      if (selWire == null) { say('Sélectionne d\'abord un fil sur la platine.'); return; }
      removeWire(selWire);
    },

    undo() {
      const { undoStack } = get();
      const last = undoStack[undoStack.length - 1];
      if (!last) { say('Rien à annuler.'); return; }
      patch(st => applySnap(st, last.before));
      set(s => ({
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, last].slice(-UNDO_MAX),
        selWire: null,
        wireMenu: null,
      }));
      notice(null);
      say(`Annulé : ${last.label.toLowerCase()}`);
    },

    redo() {
      const { redoStack } = get();
      const last = redoStack[redoStack.length - 1];
      if (!last) { say('Rien à rétablir.'); return; }
      patch(st => applySnap(st, last.after));
      set(s => ({
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, last].slice(-UNDO_MAX),
        selWire: null,
        wireMenu: null,
      }));
      say(`Rétabli : ${last.label.toLowerCase()}`);
    },

    dismissUndoNotice() { notice(null); },

    askReset(scope) {
      // mode évaluation : une seule tentative, on ne repart pas de zéro
      if (scope === 'tp' && modeOf(get().st) === 'evaluation') {
        say('Mode évaluation : le TP ne peut pas être recommencé.');
        set({ wireMenu: null });
        return;
      }
      set({ confirmScope: scope, wireMenu: null });
    },

    async confirmReset() {
      const scope = get().confirmScope;
      set({ confirmScope: null });
      if (!scope) return;
      const { tp, st } = get();

      if (scope === 'stage') {
        const phase = currentPhase(tp, st);
        const doomed = wiresOfPhase(st, phase);
        if (!doomed.length) { say(`Aucun fil de ${phase} à effacer.`); return; }
        // les liaisons refusées (`wireErrors`) restent comptées : effacer n'efface pas les fautes
        commit(`Effacement des fils de ${phase}`, snap => ({
          ...snap,
          wires: snap.wires.filter(w => (isCommandeNet(w.net) ? 'commande' : 'puissance') !== phase),
          resets: snap.resets + 1,
        }));
        set({ selWire: null });
        notice(`${doomed.length} fil${doomed.length > 1 ? 's' : ''} de ${phase} effacé${doomed.length > 1 ? 's' : ''}`);
        return;
      }

      if (scope === 'all') {
        if (!st.wires.length) { say('La platine n\'a aucun fil de ton câblage.'); return; }
        const n = st.wires.length;
        commit('Recâblage complet', snap => ({ ...snap, wires: [], resets: snap.resets + 1 }));
        set({ selWire: null });
        notice(`${n} fil${n > 1 ? 's' : ''} retiré${n > 1 ? 's' : ''} : la platine est prête à être recâblée`);
        return;
      }

      // ---- nouvelle tentative : l'ancienne reste dans l'historique, rien n'est annulable
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      notice(null);
      const fresh: AttemptState = { ...initialState(), stage: 2, done: { 0: true, 1: true } };
      set({
        restarting: true,
        attemptId: null,
        st: fresh,
        sim: initialSim(),
        mes: initialMes(),
        turns: [],
        selTerminal: null, selSlot: null, selDevice: null, selWire: null, wireMenu: null,
        undoStack: [], redoStack: [],
        aideOpen: false, aideFiche: null, aideAuto: {}, badChoices: 0,
      });
      try {
        const row = await getOrCreateAttempt(tp.id, true);
        set({ attemptId: row.id, offline: false });
        await saveAttemptState(row.id, fresh, fresh.stage);
      } catch {
        set({ offline: true });
      } finally {
        set({ restarting: false });
      }
      say('Nouvelle tentative créée : reprends à l\'étape Matériel.');
    },

    runTest(id, value) {
      patch(s => ({ ...s, tests: { ...s.tests, [id]: value } }));
      say(`Test réalisé : ${value}`);
    },

    enterStage(stage) {
      const { st, sim } = get();
      // à l'arrivée sur la consignation, l'installation est en service : c'est l'élève qui sépare
      if (stage === 6 && !st.cons.lock && !st.cons.vatRef2 && !st.decons.unlock && !sim.q1) {
        set({ sim: { ...sim, q1: true, f2: true, f3: true } });
        say('L\'installation est en service : c\'est à toi de la consigner.');
      }
      evaluate();
    },

    // ------------------------------------------------------------ mesures

    setInstrument(i) {
      set(s => ({ mes: { ...s.mes, inst: i, dial: i === 'vat' || i === 'tach' ? 0 : 1, probes: { r: null, k: null }, clamp: null, pick: null } }));
      evaluate();
    },

    rotateDial() {
      const { mes } = get();
      const def = instrumentDef(mes.inst);
      if (!def || def.dials.length < 2) return;
      set(s => ({ mes: { ...s.mes, dial: (s.mes.dial + 1) % def.dials.length } }));
      evaluate();
    },

    setDial(i) {
      set(s => ({ mes: { ...s.mes, dial: i } }));
      evaluate();
    },

    setPick(p) { set(s => ({ mes: { ...s.mes, pick: s.mes.pick === p ? null : p } })); },

    clearProbes() { set(s => ({ mes: { ...s.mes, probes: { r: null, k: null }, clamp: null, pick: null } })); },

    onWire(idx) {
      const { mes } = get();
      if (mes.pick !== 'clamp') return;
      set(s => ({ mes: { ...s.mes, clamp: idx, pick: null } }));
      evaluate();
    },

    toggleEpi(id) {
      patch(s => ({ ...s, epi: { ...s.epi, [id]: !s.epi[id] } }));
    },

    consAct(a) {
      const { st, sim } = get();
      if (a === 'lock') {
        if (sim.q1) { say('Ouvre d\'abord Q1 : on ne condamne pas un appareil fermé.'); return; }
        patch(s => ({ ...s, cons: { ...s.cons, lock: true } }));
        mlog('Cadenas posé sur Q1, étiquette « NE PAS MANŒUVRER ».');
      }
      if (a === 'ident') {
        if (!st.cons.lock) { say('Condamne d\'abord Q1.'); return; }
        patch(s => ({ ...s, cons: { ...s.cons, ident: true } }));
        mlog('Identification : platine du TP, repère Q1, schéma folio 2.');
      }
      if (a === 'unlock') {
        patch(s => ({ ...s, cons: { ...s.cons, lock: false }, decons: { ...s.decons, unlock: true } }));
        set(s => ({ mes: { ...s.mes, probes: { r: null, k: null }, clamp: null, pick: null } }));
        mlog('Cadenas et étiquette retirés.');
      }
      evaluate();
    },

    record() {
      const { tp, st, sim, mes, attemptId, offline } = get();
      const def = instrumentDef(mes.inst);
      if (!def) { say('Choisis d\'abord un appareil.'); return; }
      const dial = def.dials[Math.min(mes.dial, def.dials.length - 1)];
      const out = read(tp, sim, mes.inst, dial, mes.probes, clampWire());
      if (!out.display) { say('L\'appareil est sur OFF.'); return; }
      const w = clampWire();
      const entry: ReadingRecord = {
        instrument: def.id,
        dial,
        a: mes.probes.r ?? undefined,
        b: mes.probes.k ?? undefined,
        wire: w ? `${w.a}>${w.b}` : undefined,
        value: out.value,
        display: `${out.display} ${out.unit}`.trim(),
        stage: st.stage,
        at: new Date().toISOString(),
        expectedId: checkExpected(tp, sim, { instrument: def.id, dial, a: mes.probes.r ?? undefined, b: mes.probes.k ?? undefined, wire: w ? `${w.a}>${w.b}` : undefined, value: out.value }) ?? undefined,
      };
      patch(s => ({ ...s, readings: [...s.readings, entry] }));
      mlog(`Relevé : ${dial} = ${entry.display}`);
      if (out.bad || ((st.stage === 7 || st.stage === 9) && !entry.expectedId)) autoAide('mesure');
      if (attemptId && !offline) {
        void addMeasurement(attemptId, measurementOf(entry)).catch(() => set({ offline: true }));
      }
    },

    currentRead,

    // ---------------------------------------------------------- manœuvres

    setLoad(v) { set(s => ({ sim: { ...s.sim, load: v } })); },

    coupling(c) {
      const r = setCoupling(get().sim, c);
      set({ sim: r.state });
      say(r.message);
    },

    deviceClick(slotId) {
      const { sim, tp, st } = get();
      if (st.stage < 5) return;
      if (slotId === 'q1' && st.cons.lock) { say('Q1 est condamné par un cadenas : impossible de manœuvrer.'); return; }
      if (slotId === 'q1') { const r = toggleQ1(sim); set({ sim: r.state }); say(r.message); evaluate(); return; }
      if (slotId === 'f2') { const r = toggleF2(sim); set({ sim: r.state }); say(r.message); evaluate(); return; }
      if (slotId === 'f3') { const r = toggleF3(sim); set({ sim: r.state }); say(r.message); evaluate(); return; }
      if (slotId === 'f1') { const r = resetF1(sim); set({ sim: r.state }); say(r.message); evaluate(); return; }
      if (slotId === 'km1') { say(sim.km1 ? 'KM1 est enclenché.' : 'KM1 est retombé.'); return; }
      say(tp.slots.find(s => s.id === slotId)?.label ?? slotId);
    },

    button(rep, down = true) {
      if (!down) { set(s => ({ sim: releaseButton(s.sim) })); return; }
      const { sim, tp } = get();
      const r = pressButton(sim, tp, rep);
      set({ sim: r.state });
      say(r.message);
      evaluate();
      // l'appui simulé au clic est fugitif : on relâche le bouton de marche après la manœuvre
      setTimeout(() => { set(s => ({ sim: releaseButton(s.sim) })); }, 450);
    },

    carter() {
      const { sim, tp } = get();
      const r = toggleCarter(sim, tp);
      set({ sim: r.state });
      say(r.message);
      evaluate();
    },

    advance(dt) {
      const { sim, tp, st } = get();
      const r = tick(sim, tp, dt);
      set({ sim: r.state });
      if (r.message) { say(r.message); mlog(r.message); }
      if (st.stage >= 8) evaluate();
    },

    ensureFault() {
      const { tp, st, sim } = get();
      if (st.fault || st.fixed) {
        if (isFaultId(st.fault) && !st.fixed && sim.fault !== st.fault) {
          set({ sim: injectFault(sim, st.fault) });
        }
        return;
      }
      const f = pickFault(tp);
      patch(s => ({ ...s, fault: f }));
      set({ sim: injectFault(get().sim, f) });
    },

    diagnose(faultId) {
      const { st } = get();
      const exact = faultId === st.fault;
      patch(s => ({ ...s, diagnosis: faultId, diagTries: s.diagTries + 1 }));
      say(exact ? 'Diagnostic exact.' : 'Ce n\'est pas ça : vérifie avec les instruments.');
      if (!exact) autoAide('diagnostic');
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
      const { tp, st, attemptId, offline, student, evalDiploma } = get();
      if (!stageSatisfied(tp, st, get().sim, 10)) return;
      get().complete(10);
      if (!attemptId || offline) return;
      const done = get().st;
      try {
        await finishAttempt(
          attemptId,
          buildReport(tp, done, { ...student, diploma: evalDiploma }),
          computeScore(tp, done),
          buildEvaluation(tp, done, evalDiploma),
          evalDiploma,
        );
      } catch {
        set({ offline: true });
      }
    },

    pushTurn(t) { set(s => ({ turns: [...s.turns, t] })); },
  };
});
