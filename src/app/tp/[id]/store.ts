'use client';

import { create } from 'zustand';
import type {
  AttemptState, EvaluationMode, HypTest, InstrumentKind, Liaison, NetKind, Prevision,
  ReadingRecord, TpDefinition,
} from '@/lib/types';
import {
  initialSim, injectFault, isControlLive, isFaultId, netLive, pickFault, pressButton, releaseButton, repairFault,
  resetF1, setCoupling, tick, toggleCarter, toggleF2, toggleF3, toggleQ1, type SimState,
} from '@/lib/sim/engine';
import { couplageDesBarrettes } from '@/lib/sim/couplage';
import { etatTrafo, expliqueTrafo, substitutTrafo } from '@/lib/sim/trafo';
import { liaisonCoupee, reseauCommande } from '@/lib/sim/commande';
import {
  conclusionOuverte, departage, previsionTenue, verdictImpose, type Verification,
} from '@/lib/sim/diagnostic';
import { listeMiseSousTension, repereLiaison, repereSlot } from '@/lib/sim/reperes';
import { linkKey } from '@/lib/sim/layout';
import {
  checkExpected, instrumentDef, read, type ClampWire, type ReadOut,
} from '@/lib/sim/mesures';
import {
  aideAllowed, AIDE_MAX_EVALUATION, buildEvaluation, buildReport, computeScore, coursForStage,
  initialState, modeOf, netOfTerminal, nextLiaison, normalizeState, prepQuestions, requiredLiaisons,
  ETAPE, MAX_STAGE_PREVIEW, stageSatisfied, STAGE_COUNT, STAGES,
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
  /**
   * Bouton de marche maintenu appuyé pendant la mesure. Sur une vraie platine,
   * c'est ce qu'on fait pour mesurer en aval d'un contact NO : sans ça, la moitié
   * du circuit de commande est inaccessible à l'instrument.
   */
  marcheMaintenue: boolean;
  /** Hypothèse que le test en préparation vise. */
  vise: string;
  /** Lecture annoncée avant de mesurer — obligatoire pour pouvoir noter le test. */
  prevision: Prevision | '';
}

const initialMes = (): MesState => ({ inst: null, dial: 0, probes: { r: null, k: null }, clamp: null, pick: null, log: [], marcheMaintenue: false, vise: '', prevision: '' });

/** Raison d'une ouverture automatique de l'aide. */
export type AideReason = 'cablage' | 'preparation' | 'materiel' | 'mesure' | 'diagnostic' | null;

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

/**
 * Libellé d'un fil pour les messages et la liste latérale : les REPÈRES lus sur la platine
 * (« Q2:2 → T1:400 »), pas les identifiants internes du simulateur.
 */
export const wireLabel = (tp: Pick<TpDefinition, 'slots'>, w: { a: string; b: string }): string =>
  repereLiaison(tp, w);

interface ParcoursState {
  tp: TpDefinition;
  attemptId: string | null;
  offline: boolean;
  /**
   * TP verrouillé pour l'élève : 'termine' (validé, non rejouable) ou 'cloture'
   * (clôturé par le professeur, réactivation requise). `null` = jouable.
   */
  locked: 'termine' | 'cloture' | null;
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
  /**
   * Câblage — les deux bornes d'une liaison attendue montrées du doigt sur la platine.
   * Alimenté par un clic sur une ligne du tableau : l'élève qui ne trouve pas « XC:5 int. »
   * voit les deux bornes s'allumer au lieu de les chercher.
   */
  aimed: [string, string] | null;
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
  /** Montre les deux bornes d'une liaison attendue sur la platine (à nouveau : éteint). */
  aim: (l: Liaison | null) => void;
  askProf: (question: string) => void;
  consumeQuestion: () => void;
  say: (m: string) => void;
  goStage: (i: number) => void;
  complete: (i: number) => void;

  answerPrep: (questionId: string, index: number) => void;
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
  /** Sécurité mesures sous tension : (dé)sélection d'un EPI/EIS, d'un contrôle d'état. */
  toggleSecuEquip: (id: string) => void;
  toggleSecuCheck: (id: string) => void;
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
  /** Pose ou retire une hypothèse à l'étape de dépannage. */
  poserHypothese: (id: string, on: boolean) => void;
  /** Hypothèse actuellement visée par le test en préparation. */
  viser: (id: string) => void;
  /** Prévision annoncée avant de mesurer. */
  prevoir: (p: Prevision | '') => void;
  /** Enregistre le test : le verdict retenu est celui que la mesure impose. */
  noterTest: (verdict: 'out' | 'keep') => void;
  diagnose: (faultId: string) => void;
  setRemede: (id: string) => void;
  conclure: () => void;
  maintenirMarche: (v: boolean) => void;
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
      const { attemptId, st } = get();
      // On tente TOUJOURS de sauvegarder : ne jamais bloquer définitivement sur
      // `offline`. Une micro-coupure réseau faisait rester `offline: true` pour
      // toujours et la progression de l'élève n'était plus jamais enregistrée
      // (bug constaté le 2026-09-17). Ici la session se répare seule : au premier
      // save réussi après le retour du réseau, tout l'état courant (étapes,
      // erreurs…) est persisté et `offline` repasse à false.
      if (!attemptId) return;
      set({ saving: true });
      saveAttemptState(attemptId, st, st.stage)
        .then(() => set({ offline: false }))
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

  /** Liaisons posées sur la platine : l'ohmmètre y lit les barrettes de couplage. */
  const posesEnPlace = (): { a: string; b: string; net: string }[] => {
    const { tp, st, sim } = get();
    return panelWires(tp, st, sim).map(w => ({ a: w.a, b: w.b, net: w.net }));
  };

  /**
   * Relit les prises du transformateur de commande après chaque changement de
   * câblage : c'est elles, et non une constante, qui fixent la tension du
   * secondaire (`src/lib/sim/trafo.ts`).
   */
  const majTrafo = () => {
    const { tp, sim } = get();
    if (!tp.trafo) return;
    const e = etatTrafo(tp.trafo, posesEnPlace());
    const u2 = e.diag === 'absent' ? null : e.u2;
    const diag = e.diag === 'absent' ? null : e.diag;
    if (u2 === sim.u2 && diag === sim.trafoDiag) return;
    // Reprendre la prise remet le transformateur en état. La bobine grillée, elle,
    // ne se répare pas toute seule : on la remplace, et on le dit.
    const remplacee = sim.coilBurnt && diag === 'ok';
    set(s => ({
      sim: { ...s.sim, u2, trafoDiag: diag, trafoTrip: false, coilHeat: 0, coilBurnt: remplacee ? false : s.sim.coilBurnt },
    }));
    if (remplacee) {
      say(`Prise reprise, et bobine de ${repereSlot(tp, 'km1')} remplacée : le contacteur est de nouveau opérationnel.`);
    }
  };

  /**
   * Réseau du circuit de commande tel qu'il est câblé et dans l'état où il est.
   * C'est lui qui donne leur valeur aux mesures de commande — plus aucune
   * constante, plus aucune comparaison d'étiquettes de réseau.
   */
  const reseau = () => {
    const { tp, st, sim, mes } = get();
    return reseauCommande(tp, st, sim, { marcheMaintenue: mes.marcheMaintenue });
  };

  const currentRead = (): ReadOut => {
    const { tp, sim, mes } = get();
    const def = instrumentDef(mes.inst);
    const dial = def ? def.dials[Math.min(mes.dial, def.dials.length - 1)] : 'OFF';
    return read(tp, sim, mes.inst, dial, mes.probes, clampWire(), posesEnPlace(), reseau());
  };

  /** Consignation, VAT, validation des mesures : rejoué à chaque changement. */
  const evaluate = () => {
    const { tp, st, sim, mes, attemptId, offline } = get();
    const def = instrumentDef(mes.inst);
    const dial = def ? def.dials[Math.min(mes.dial, def.dials.length - 1)] : 'OFF';
    const { r, k } = mes.probes;
    const out = read(tp, sim, mes.inst, dial, mes.probes, clampWire(), posesEnPlace(), reseau());
    const stage = st.stage;

    // ---- séparation (étape 6)
    // Champ PV : SOURCE INDÉPENDANTE. Ouvrir Q1 (parc) coupe le parc et l'aval de
    // l'onduleur, mais PAS le champ (Q2/f2) — les modules produisent tant qu'il fait
    // jour. La séparation exige donc la double coupure Q1 ET Q2.
    const champId = tp.consignationVat?.champ; // ex. 'f2' (sectionneur champ PV)
    if (stage === ETAPE.EPI) {
      const sepDone = !sim.q1 && (!champId || !sim.f2);
      if (st.cons.sep !== sepDone) patch(s => ({ ...s, cons: { ...s.cons, sep: sepDone } }));
    }
    if (stage === ETAPE.EPI && !sim.q1) {
      if (champId) {
        // Le champ ne retombe PAS avec Q1 : seul l'aval de l'onduleur (Q3, onduleur) suit.
        if (sim.f3 || sim.km1) {
          set(s => ({ sim: { ...s.sim, f3: false, km1: false } }));
          mlog(`Séparation : ${repereSlot(tp, 'q1')} ouvert — l'aval de l'onduleur retombe. Le champ PV (${repereSlot(tp, 'f2')}) reste une source : ouvre-le séparément.`);
        }
      } else if (sim.f2 || sim.f3) {
        set(s => ({ sim: { ...s.sim, f2: false, f3: false, km1: false } }));
        mlog(`Séparation : ${repereSlot(tp, 'q1')} ouvert, ${repereSlot(tp, 'f2')} et ${repereSlot(tp, 'f3')} retombent avec lui.`);
      }
    }

    // ---- déconsignation (étape 8)
    if (stage === ETAPE.MISE_EN_SERVICE) {
      const d = st.decons;
      const close = d.unlock && sim.q1 && sim.f2 && sim.f3;
      const essai = (d.close || close) && sim.km1;
      if (close !== d.close || essai !== d.essai) {
        if (close && !d.close) mlog(`${listeMiseSousTension(tp, 'et')} refermés : la platine est remise sous tension.`);
        if (essai && !d.essai) {
          const lampe = (tp.pupitre ?? []).some(p => p.kind === 'lamp');
          mlog(lampe
            ? `Essai concluant : ${repereSlot(tp, 'km1')} s'enclenche, le voyant s'allume.`
            : `Essai concluant : ${repereSlot(tp, 'km1')} en marche, le 230 V apparaît au tableau.`);
        }
        patch(s => ({ ...s, decons: { ...s.decons, close: close || s.decons.close, essai: essai || s.decons.essai } }));
      }
    }

    // ---- VAT pendant la consignation
    if (stage === ETAPE.EPI && mes.inst === 'vat' && r && k) {
      const c = st.cons;
      const pair = (a: string, b: string) => (r === a && k === b) || (r === b && k === a);
      // Config du VAT paramétrée par le TP. Défaut (TP moteur) : source connue
      // RES.L1/RES.N (avec RES.L1/RES.PE toléré) et toute paire hors réseau en aval,
      // seuil 3 — comportement historique inchangé quand `consignationVat` est absent.
      const cfg = tp.consignationVat;
      const source: [string, string] | null =
        cfg && cfg.sourceConnue !== undefined ? cfg.sourceConnue : ['RES.L1', 'RES.N'];
      const avalPairs = cfg?.avalPairs;
      const need = avalPairs ? avalPairs.length : 3;
      const isDefaultRes = source != null && source[0] === 'RES.L1' && source[1] === 'RES.N';
      const matchSource = (): boolean =>
        source != null && (pair(source[0], source[1]) || (isDefaultRes && pair('RES.L1', 'RES.PE')));
      const matchAval = (): boolean => avalPairs
        ? avalPairs.some(p => pair(p[0], p[1]))
        : (r !== k && !r.startsWith('RES.') && !k.startsWith('RES.'));

      if (source != null && matchSource()) {
        if (!c.vatRef) {
          patch(s => ({ ...s, cons: { ...s.cons, vatRef: true } }));
          mlog('VAT vérifié sur source connue : présence de tension détectée.');
        } else if (c.vat.length >= need && !c.vatRef2) {
          patch(s => ({ ...s, cons: { ...s.cons, vatRef2: true } }));
          mlog('VAT re-vérifié : installation consignée.');
          say('Installation consignée : tu peux mesurer hors tension.');
        }
      } else if (!sim.q1 && c.lock && (source == null || c.vatRef) && matchAval()) {
        const known = c.vat.some(x => (x[0] === r && x[1] === k) || (x[0] === k && x[1] === r));
        if (!known && (out.value ?? 0) <= 50) {
          const nextVat = [...c.vat, [r, k] as [string, string]];
          // Pas d'étape « source connue » sur une installation autonome : dès que
          // les paires en aval sont contrôlées, vatRef/vatRef2 sont satisfaits.
          patch(s => ({
            ...s,
            cons: {
              ...s.cons,
              vat: nextVat,
              ...(source == null
                ? { vatRef: true, ...(nextVat.length >= need ? { vatRef2: true } : {}) }
                : {}),
            },
          }));
          mlog(`VAT ${r} / ${k} : absence de tension.`);
          if (source == null && nextVat.length >= need && !c.vatRef2) {
            say('Installation consignée : tu peux mesurer hors tension.');
          }
        } else if (!known && champId && (out.value ?? 0) > 50) {
          mlog(`⚠ ${r} / ${k} : présence de tension — le champ PV (${repereSlot(tp, 'f2')}) n'est pas ouvert. C'est une source indépendante : ouvre ${repereSlot(tp, 'f2')} pour la couper.`);
        }
      } else if (sim.q1 && (out.value ?? 0) > 50) {
        mlog(`⚠ Présence de tension : ${repereSlot(tp, 'q1')} n'est pas ouvert, ne touche à rien.`);
      }
    }

    // ---- mesure d'ohms sous tension
    if (out.bad) mlog('⚠ Mesure de résistance sous tension : ERR, le fusible de l\'appareil grille.');

    // ---- validation d'une mesure attendue
    if ((stage === ETAPE.HORS || stage === ETAPE.SOUS) && mes.inst) {
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
    syncCouplage();
  };

  /**
   * Le couplage n'est plus donné par un bouton : il se DÉDUIT des barrettes que l'élève a
   * posées sur la plaque à bornes. Tant qu'elles manquent, on garde la dernière valeur
   * connue — le moteur ne tournera de toute façon pas sans ses enroulements refermés.
   */
  const syncCouplage = () => {
    const c = couplageDesBarrettes(get().st.wires);
    if (c && c !== get().sim.coupling) set(s => ({ sim: { ...s.sim, coupling: c } }));
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
    commit(`Retrait ${wireLabel(get().tp, w)}`, snap => ({
      ...snap,
      wires: snap.wires.filter(x => linkKey(x.a, x.b) !== k),
      wiresRemoved: snap.wiresRemoved + 1,
    }));
    set({ selWire: null, wireMenu: null });
    notice(`Fil ${wireLabel(get().tp, w)} supprimé`);
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
    locked: null,
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
    aimed: null,
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
        offline: false, attemptId: null, locked: null,
        selWire: null, wireMenu: null, undoStack: [], redoStack: [], undoNotice: null,
        confirmScope: null, restarting: false,
      });
      try {
        const row = await getOrCreateAttempt(tp.id);
        const restored = normalizeState(row.state as Partial<AttemptState> | null);
        // Un TP terminé ou clôturé revient verrouillé : l'élève ne peut pas le rejouer.
        const locked = row.status === 'termine' || row.status === 'cloture' ? row.status : null;
        set({
          attemptId: row.id,
          locked,
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

    aim(l) {
      const cur = get().aimed;
      if (!l) { set({ aimed: null }); return; }
      const same = cur != null && cur[0] === l.a && cur[1] === l.b;
      set({ aimed: same ? null : [l.a, l.b] });
    },

    askProf(question) { set({ pendingQuestion: question, botOpen: true, aideOpen: false }); },

    consumeQuestion() { set({ pendingQuestion: null }); },

    say,

    goStage(i) {
      const { st, tp } = get();
      if (i < 0 || i >= STAGE_COUNT) return;
      if (i > st.stage && !st.done[i - 1]) { say('Termine d\'abord l\'étape précédente.'); return; }
      if (!tp.playable && i > MAX_STAGE_PREVIEW) { say('Ce TP est en cours de finalisation : le parcours s\'arrête à la pose.'); return; }
      set({ selTerminal: null, selSlot: null, selDevice: null, aideOpen: false, aideFiche: null, selWire: null, wireMenu: null });
      patch(s => ({ ...s, stage: i }));
    },

    complete(i) {
      const { st } = get();
      if (!st.done[i]) say(`Étape validée : ${STAGES[i]}`);
      patch(s => ({ ...s, done: { ...s.done, [i]: true } }));
    },

    /** Préparation : l'élève répond à une question d'identification ou de fonction. */
    answerPrep(questionId, index) {
      const { tp } = get();
      patch(s => ({ ...s, prep: { ...s.prep, [questionId]: index } }));
      const q = prepQuestions(tp).find(x => x.id === questionId);
      if (q && q.answer !== index) {
        const n = get().badChoices + 1;
        set({ badChoices: n });
        if (n >= 2) autoAide('preparation');
      }
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
      if (st.stage >= ETAPE.EPI && mes.pick && mes.pick !== 'clamp') {
        const which = mes.pick;
        set(s => ({ mes: { ...s.mes, probes: { ...s.mes.probes, [which]: id }, pick: which === 'r' ? 'k' : null } }));
        evaluate();
        return;
      }
      if (st.stage !== ETAPE.CABLAGE) return;

      if (!selTerminal) { set({ selTerminal: id }); return; }
      if (selTerminal === id) { set({ selTerminal: null }); return; }

      const k = linkKey(selTerminal, id);
      const expected = requiredLiaisons(tp).find(l => linkKey(l.a, l.b) === k);
      if (st.wires.some(w => linkKey(w.a, w.b) === k)) {
        say('Cette liaison est déjà faite.');
      } else if (expected) {
        commit(`Liaison ${wireLabel(tp, expected)}`, snap => ({
          ...snap, wires: [...snap.wires, { a: expected.a, b: expected.b, net: expected.net }],
        }));
        say(`Liaison ${repereLiaison(tp, expected)} réalisée.`);
        majTrafo();
        // la borne montrée du doigt vient d'être câblée : on éteint le guide
        const a = get().aimed;
        if (a && linkKey(a[0], a[1]) === k) set({ aimed: null });
      } else if (substitutTrafo(tp.trafo, requiredLiaisons(tp), selTerminal, id)) {
        // Prise voisine du transformateur : la liaison se fait, comme sur une vraie
        // platine. Le tableau de câblage sera complet et la faute ne se verra qu'à la
        // mesure du secondaire ou au premier essai.
        const att = substitutTrafo(tp.trafo, requiredLiaisons(tp), selTerminal, id)!;
        commit(`Liaison ${wireLabel(tp, att)}`, snap => ({
          ...snap, wires: [...snap.wires, { a: selTerminal, b: id, net: att.net }],
        }));
        say(`Liaison réalisée sur ${selTerminal.split('.')[1] === undefined ? id : selTerminal}.`);
        majTrafo();
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
      commit(`Liaison ${wireLabel(tp, n)}`, snap => ({
        ...snap, wires: [...snap.wires, { a: n.a, b: n.b, net: n.net }],
      }));
      say(`Câblage assisté : ${repereLiaison(tp, n)}`);
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
        locked: null,
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
      if (stage === ETAPE.EPI && !st.cons.lock && !st.cons.vatRef2 && !st.decons.unlock && !sim.q1) {
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

    toggleSecuEquip(id) {
      patch(s => ({ ...s, secu: { ...s.secu, equip: { ...s.secu.equip, [id]: !s.secu.equip[id] } } }));
    },

    toggleSecuCheck(id) {
      patch(s => ({ ...s, secu: { ...s.secu, checks: { ...s.secu.checks, [id]: !s.secu.checks[id] } } }));
    },

    consAct(a) {
      const { st, sim, tp } = get();
      if (a === 'lock') {
        if (sim.q1) { say(`Ouvre d'abord ${repereSlot(tp, 'q1')} : on ne condamne pas un appareil fermé.`); return; }
        patch(s => ({ ...s, cons: { ...s.cons, lock: true } }));
        mlog(`Cadenas posé sur ${repereSlot(tp, 'q1')}, étiquette « NE PAS MANŒUVRER ».`);
      }
      if (a === 'ident') {
        if (!st.cons.lock) { say(`Condamne d'abord ${repereSlot(tp, 'q1')}.`); return; }
        patch(s => ({ ...s, cons: { ...s.cons, ident: true } }));
        mlog(`Identification : platine du TP, repère ${repereSlot(tp, 'q1')}, schéma folio 2.`);
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
      const out = read(tp, sim, mes.inst, dial, mes.probes, clampWire(), posesEnPlace(), reseau());
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
      if (out.bad || ((st.stage === ETAPE.HORS || st.stage === ETAPE.SOUS) && !entry.expectedId)) autoAide('mesure');
      if (attemptId && !offline) {
        void addMeasurement(attemptId, measurementOf(entry)).catch(() => set({ offline: true }));
      }
    },

    currentRead,

    // ---------------------------------------------------------- manœuvres

    setLoad(v) { set(s => ({ sim: { ...s.sim, load: v } })); },

    coupling(c) {
      const r = setCoupling(get().sim, c, get().tp);
      set({ sim: r.state });
      say(r.message);
    },

    deviceClick(slotId) {
      const { sim, tp, st } = get();
      if (st.stage < ETAPE.CABLAGE) return;
      if (slotId === 'q1' && st.cons.lock) { say(`${repereSlot(tp, 'q1')} est condamné par un cadenas : impossible de manœuvrer.`); return; }
      if (slotId === 'q1') { const r = toggleQ1(sim, tp); set({ sim: r.state }); say(r.message); evaluate(); return; }
      if (slotId === 'f2') {
        const r = toggleF2(sim, tp);
        set({ sim: r.state });
        say(r.message);
        if (r.state.trafoTrip) {
          const e = expliqueTrafo(tp.trafo, etatTrafo(tp.trafo, posesEnPlace()));
          if (e) say(e);
        }
        evaluate();
        return;
      }
      if (slotId === 'f3') { const r = toggleF3(sim, tp); set({ sim: r.state }); say(r.message); evaluate(); return; }
      if (slotId === 'f1') { const r = resetF1(sim, tp); set({ sim: r.state }); say(r.message); evaluate(); return; }
      if (slotId === 'km1') {
        const rep = repereSlot(tp, 'km1');
        // Mise en service PV : sans pupitre, on enclenche l'onduleur en cliquant dessus
        // une fois la platine refermée (Q1, Q2, Q3). L'essai devient concluant.
        if (st.stage === ETAPE.MISE_EN_SERVICE && !sim.km1) {
          if (sim.q1 && sim.f2 && sim.f3) {
            // Panne active coupant l'alimentation continue de l'onduleur : il ne
            // peut pas démarrer tant que le fil + du bus (q1.2+ → km1.B+) est ouvert.
            if (!st.fixed && liaisonCoupee(tp, st.fault, 'km1.B+', 'q1.2+')) {
              say(`${rep} ne démarre pas : alimentation continue absente — cherche la coupure.`);
              return;
            }
            set({ sim: { ...sim, km1: true } });
            say(`${rep} : onduleur mis en marche — le 230 V apparaît au tableau.`);
            evaluate();
          } else {
            say(`Referme d'abord ${listeMiseSousTension(tp, 'et')} avant de mettre ${rep} en marche.`);
          }
          return;
        }
        say(sim.km1 ? `${rep} est enclenché.` : `${rep} est retombé.`);
        return;
      }
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
      if (st.stage >= ETAPE.HORS) evaluate();
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

    poserHypothese(id, on) {
      patch(s => ({
        ...s,
        hypotheses: on ? Array.from(new Set([...s.hypotheses, id])) : s.hypotheses.filter(x => x !== id),
      }));
      if (!on && get().mes.vise === id) set(s => ({ mes: { ...s.mes, vise: '' } }));
    },

    viser(id) {
      set(s => ({ mes: { ...s.mes, vise: id, probes: { r: null, k: null }, prevision: '' } }));
    },

    prevoir(p) {
      set(s => ({ mes: { ...s.mes, prevision: p } }));
    },

    /**
     * Enregistre le test d'hypothèse.
     *
     * Le verdict retenu n'est PAS celui que l'élève a cliqué : c'est celui que la
     * mesure impose. S'il élimine une hypothèse que sa lecture laisse debout, le
     * journal enregistre « retenue » et le lui dit. Le journal est une trace de ce
     * qu'a dit l'appareil, pas de ce que l'élève espérait.
     */
    noterTest(verdict) {
      const { tp, st, sim, mes } = get();
      const def = instrumentDef(mes.inst);
      if (!def || !mes.vise || !mes.prevision) { say('Vise une hypothèse et annonce ta prévision.'); return; }
      const dial = def.dials[Math.min(mes.dial, def.dials.length - 1)];
      const out = read(tp, sim, mes.inst, dial, mes.probes, clampWire(), posesEnPlace(), reseau());
      if (out.bad) { say('L\'appareil refuse cette mesure : elle ne prouve rien.'); return; }

      const v: Verification = {
        dial,
        a: mes.probes.r,
        b: mes.probes.k,
        ctx: { marcheMaintenue: mes.marcheMaintenue },
        sousTension: isControlLive(sim),
      };
      const impose = verdictImpose(tp, st, sim, v, mes.vise);
      const sep = departage(tp, st, sim, v, st.hypotheses);
      const entry: HypTest = {
        id: mes.vise,
        instrument: def.id,
        dial,
        a: mes.probes.r ?? undefined,
        b: mes.probes.k ?? undefined,
        attendu: mes.prevision,
        lu: `${out.display} ${out.unit}`.trim(),
        value: out.value,
        verdict: impose,
        prevu: previsionTenue(mes.prevision, dial, out.value, out.display === 'OL'),
        departage: sep.length,
        at: new Date().toISOString(),
      };
      patch(s => ({ ...s, hypTests: [...s.hypTests, entry] }));

      const titre = tp.faults.find(f => f.id === entry.id)?.title ?? entry.id;
      if (impose !== verdict) {
        say(`La mesure ne permet pas de conclure ça : « ${titre} » ${impose === 'out'
          ? 'est au contraire écartée' : 'reste possible'}. Le journal enregistre ce que dit l'appareil.`);
      } else {
        say(`${titre} ${impose === 'out' ? 'éliminée' : 'retenue'} — verdict cohérent avec la mesure.`);
      }
      mlog(`Test : ${dial} ${entry.a ?? '—'} / ${entry.b ?? '—'} → ${entry.lu}`
        + `, ${sep.length} hypothèse${sep.length > 1 ? 's' : ''} départagée${sep.length > 1 ? 's' : ''}.`);
      set(s => ({ mes: { ...s.mes, vise: '', prevision: '', probes: { r: null, k: null }, pick: null } }));
      evaluate();
    },

    /**
     * L'élève retient une cause. Aucun verdict ici : le simulateur ne souffle rien
     * tant que la conclusion n'est pas posée en entier (cause + remède).
     */
    diagnose(faultId) {
      patch(s => ({ ...s, diagnosis: faultId }));
    },

    /** L'élève retient une action de remise en état. Pas de verdict non plus. */
    setRemede(id) {
      patch(s => ({ ...s, remede: id }));
    },

    /**
     * Conclusion : la cause et le remède sont jugés ENSEMBLE. Trouver la panne sans
     * savoir quoi faire dessus n'est pas un dépannage, et proposer la bonne
     * intervention en s'étant trompé de cause relève du hasard.
     */
    conclure() {
      const { tp, st } = get();
      const porte = conclusionOuverte(st);
      if (!porte.ouverte) { say(porte.manque); return; }
      if (!st.diagnosis || !st.remede) { say('Choisis une cause ET une action de remise en état.'); return; }
      const bonneCause = st.diagnosis === st.fault;
      const bonRemede = st.remede === st.fault;
      patch(s => ({ ...s, diagTries: s.diagTries + 1 }));
      if (bonneCause && bonRemede) {
        say('Cause et remise en état exacts : tu peux intervenir.');
        return;
      }
      const quoi = !bonneCause && !bonRemede ? 'Ni la cause ni l\'action ne conviennent'
        : !bonneCause ? 'L\'action tient debout, mais pas pour cette cause'
          : 'La cause est la bonne, l\'action proposée n\'y répond pas';
      say(`${quoi}. Reprends tes mesures : ${tp.faults.length} pannes sont possibles, l'instrument les départage.`);
      autoAide('diagnostic');
    },

    /** Bouton de marche maintenu appuyé pendant une mesure (contact NO fermé). */
    maintenirMarche(v) {
      set(s => ({ mes: { ...s.mes, marcheMaintenue: v } }));
      evaluate();
    },

    setQuiz(good) {
      const { tp } = get();
      patch(s => ({ ...s, quiz: good }));
      say(`Quiz : ${good} / ${tp.quiz.length} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''}.`);
    },

    repair() {
      const { st } = get();
      if (st.diagnosis !== st.fault || st.remede !== st.fault) {
        say('Pose d\'abord une conclusion juste : la cause et l\'action de remise en état.');
        return;
      }
      patch(s => ({ ...s, fixed: true }));
      set(s => ({ sim: repairFault(s.sim) }));
      say('Réparation faite : remets en service pour confirmer.');
    },

    async finish() {
      const { tp, st, attemptId, offline, student, evalDiploma } = get();
      if (!stageSatisfied(tp, st, get().sim, ETAPE.VALIDATION)) return;
      get().complete(ETAPE.VALIDATION);
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
