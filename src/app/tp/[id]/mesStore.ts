'use client';

/**
 * Store du parcours « mise en service industrielle » (station de relevage).
 *
 * Distinct du store de la platine : l'installation est livrée câblée, l'élève
 * la contrôle et la met en service avec le contrôleur d'installation. L'état
 * `MesState` est persisté dans `attempts.state` via `saveAttemptState`, comme
 * le parcours de dimensionnement.
 */

import { create } from 'zustand';
import type { TpDefinition } from '@/lib/types';
import {
  buildMesEvaluation, blocages, CONSIGNATION, DECONSIGNATION, estConforme, INSPECTION, initialMesState,
  MES, MES_STEP_COUNT, MES_STEP_LABELS, MESURES, mesScore, mesStageScores, normalizeMesState, ORGANES,
  posRequise, POURQUOI, rapportPv, RESTITUTION, stepOk, valeurLue,
  type Condition, type Jugement, type MesState, type Position,
} from '@/lib/mes/miseEnService';
import { fallbackStudent, type Student } from '@/lib/student';
import { finishAttempt, getOrCreateAttempt, saveAttemptState } from '@/lib/db/attempts';

interface MesStore {
  tp: TpDefinition | null;
  attemptId: string | null;
  offline: boolean;
  saving: boolean;
  sent: boolean;
  student: Student;
  s: MesState;
  toast: string | null;
  /** Position du commutateur du contrôleur (état de l'appareil, pas de la tentative). */
  pos: Position;
  /** Point de mesure sélectionné, par étape. */
  point: Record<number, string>;
  /** Échanges avec le professeur virtuel (session). */
  turns: { role: 'user' | 'assistant'; content: string }[];
  guideOpen: boolean;
  botOpen: boolean;

  init: (tp: TpDefinition, attemptKey?: string) => Promise<void>;
  setStudent: (s: Student) => void;
  goStep: (i: number) => void;
  validate: () => boolean;
  say: (m: string) => void;

  answerIdent: (rep: string, d: string, f: string) => boolean;
  setCondition: (id: string, c: Condition | null) => void;
  answerPourquoi: (i: number) => void;
  setGuideOpen: (v: boolean) => void;
  setBotOpen: (v: boolean) => void;
  pushTurn: (t: { role: 'user' | 'assistant'; content: string }) => void;
  /** Question posée au professeur : comptée comme une aide de l'étape. */
  countHelp: () => void;
  setPosition: (k: string, f: string | null) => void;
  setAppareil: (i: number) => void;
  toggleHabil: (h: string) => void;

  markVisu: (id: string, j: Jugement) => void;
  corrigerVisu: () => void;

  consigner: (id: string) => void;
  toggleEquip: (id: string) => void;

  setPos: (p: Position) => void;
  selectPoint: (step: number, id: string) => void;
  test: () => void;
  /** Point sans contrôleur (bouton TEST du DDR) : l'élève agit et constate. */
  action: (step: number, id: string) => void;
  juger: (step: number, id: string, j: Jugement) => void;
  leverReserve: (step: number) => void;
  answerQcm: (step: number, which: 'role' | 'limite', i: number) => void;

  deconsigner: (id: string) => void;
  essai: (id: string) => void;
  answerRestitution: (i: number) => void;

  finish: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useMesParcours = create<MesStore>((set, get) => {
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

  const patch = (fn: (s: MesState) => MesState) => {
    set((st) => ({ s: fn(st.s) }));
    schedule();
  };

  const say = (m: string) => {
    if (!m) return;
    set({ toast: m });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  };

  /** Premier point de l'étape, sélectionné par défaut. */
  const firstPoint = (step: number) => MESURES[step]?.points[0]?.id;

  return {
    tp: null,
    attemptId: null,
    offline: false,
    saving: false,
    sent: false,
    student: fallbackStudent(),
    s: initialMesState(),
    toast: null,
    pos: 'V',
    point: {},
    turns: [],
    guideOpen: false,
    botOpen: false,

    async init(tp, attemptKey) {
      set({ tp, s: initialMesState(), offline: false, attemptId: null, sent: false, pos: 'V', point: {}, turns: [] });
      try {
        const row = await getOrCreateAttempt(attemptKey ?? tp.id);
        set({ attemptId: row.id, s: normalizeMesState(row.state as unknown as Partial<MesState> | null) });
      } catch {
        set({ offline: true });
      }
    },

    setStudent(student) { set({ student }); },

    goStep(i) {
      const { s } = get();
      const step = Math.min(MES_STEP_COUNT - 1, Math.max(0, i));
      // une étape reste verrouillée tant que la précédente n'est pas validée
      if (step > 0 && !s.done[step - 1] && !s.done[step]) {
        say('Valide d\'abord l\'étape précédente.');
        return;
      }
      patch((x) => ({ ...x, step }));
    },

    validate() {
      const { s } = get();
      if (!stepOk(s, s.step)) {
        patch((x) => ({ ...x, refus: { ...x.refus, [x.step]: (x.refus[x.step] ?? 0) + 1 } }));
        say(blocages(s, s.step).find((b) => b.kind === 'bad')?.text ?? 'L\'étape n\'est pas terminée.');
        return false;
      }
      patch((x) => ({
        ...x,
        done: { ...x.done, [x.step]: true },
        step: Math.min(MES_STEP_COUNT - 1, x.step + 1),
      }));
      return true;
    },

    say,

    /* ---------------------------------------------------- identification */

    answerIdent(rep, d, f) {
      const o = ORGANES.find((x) => x.rep === rep);
      if (!o) return false;
      const ok = d === o.designation && f === o.fonction;
      patch((x) => {
        const cur = x.ident[rep] ?? { err: 0 };
        return { ...x, ident: { ...x.ident, [rep]: { d, f, ok: cur.ok || ok, err: cur.err + (ok ? 0 : 1) } } };
      });
      if (!ok) say(d !== o.designation && f !== o.fonction ? 'Désignation et fonction à revoir.' : d !== o.designation ? 'Désignation à revoir.' : 'Fonction à revoir.');
      return ok;
    },

    /* ---------------------------------------------------- préparation */

    setCondition(id, c) { patch((x) => ({ ...x, prep: { ...x.prep, conditions: { ...x.prep.conditions, [id]: c } } })); },
    answerPourquoi(i) {
      const faux = i !== POURQUOI.answer;
      patch((x) => ({ ...x, prep: { ...x.prep, pourquoi: i, err: x.prep.err + (faux ? 1 : 0) } }));
    },
    setGuideOpen(v) { set({ guideOpen: v }); },
    setBotOpen(v) { set({ botOpen: v }); },
    pushTurn(tu) { set((st) => ({ turns: [...st.turns, tu].slice(-16) })); },
    countHelp() { patch((x) => ({ ...x, helpUsed: { ...x.helpUsed, [x.step]: (x.helpUsed[x.step] ?? 0) + 1 } })); },
    setPosition(k, f) { patch((x) => ({ ...x, prep: { ...x.prep, positions: { ...x.prep.positions, [k]: f } } })); },
    setAppareil(i) { patch((x) => ({ ...x, prep: { ...x.prep, appareil: i } })); },
    toggleHabil(h) {
      patch((x) => {
        const has = x.prep.habil.includes(h);
        return { ...x, prep: { ...x.prep, habil: has ? x.prep.habil.filter((y) => y !== h) : [...x.prep.habil, h] } };
      });
    },

    /* ---------------------------------------------------- inspection */

    markVisu(id, j) {
      const it = INSPECTION.find((i) => i.id === id);
      if (!it) return;
      const faux = (j === 'C') !== it.conforme;
      patch((x) => ({ ...x, visu: { ...x.visu, marks: { ...x.visu.marks, [id]: j }, err: x.visu.err + (faux ? 1 : 0) } }));
      if (faux) say(j === 'C' ? 'Regarde mieux : ce point présente un écart.' : 'Ce point est conforme.');
    },
    corrigerVisu() {
      patch((x) => ({ ...x, visu: { ...x.visu, corrige: true } }));
      say('Presse-étoupe serré : l\'étanchéité IP65 est rétablie.');
    },

    /* ---------------------------------------------------- consignation */

    consigner(id) {
      const { s } = get();
      const attendu = CONSIGNATION[s.cons.seq.length];
      if (!attendu || s.cons.seq.includes(id)) return;
      if (attendu.id !== id) {
        patch((x) => ({ ...x, cons: { ...x.cons, err: x.cons.err + 1 } }));
        say(`Pas encore : l'étape suivante est « ${attendu.label.split(' :')[0]} ».`);
        return;
      }
      patch((x) => ({ ...x, cons: { ...x.cons, seq: [...x.cons.seq, id] } }));
    },
    toggleEquip(id) {
      patch((x) => {
        const has = x.cons.equip.includes(id);
        return { ...x, cons: { ...x.cons, equip: has ? x.cons.equip.filter((y) => y !== id) : [...x.cons.equip, id] } };
      });
    },

    /* ---------------------------------------------------- mesures */

    setPos(p) { set({ pos: p }); },
    selectPoint(step, id) { set((st) => ({ point: { ...st.point, [step]: id } })); },

    test() {
      const { s, pos, point } = get();
      const step = s.step;
      const e = MESURES[step];
      if (!e) return;
      const id = point[step] ?? firstPoint(step);
      const p = e.points.find((x) => x.id === id);
      if (!id || !p) return;
      if (p.action) { say('Ce point ne se mesure pas au contrôleur : utilise le bouton d\'action.'); return; }
      const req = posRequise(step, id);
      if (pos !== req) {
        patch((x) => ({ ...x, mesures: { ...x.mesures, [step]: { ...x.mesures[step], errPos: x.mesures[step].errPos + 1 } } }));
        say('Mauvaise position du commutateur pour cette mesure.');
        return;
      }
      const m = s.mesures[step];
      const v = valeurLue(step, id, m.levee);
      if (v == null) return;
      patch((x) => {
        const mm = x.mesures[step];
        const jugements = { ...mm.jugements };
        delete jugements[id];
        return { ...x, mesures: { ...x.mesures, [step]: { ...mm, lectures: { ...mm.lectures, [id]: { v, pos } }, jugements } } };
      });
    },

    action(step, id) {
      const e = MESURES[step];
      const p = e?.points.find((x) => x.id === id);
      if (!p?.action) return;
      const { pos } = get();
      patch((x) => {
        const mm = x.mesures[step];
        const jugements = { ...mm.jugements };
        delete jugements[id];
        return { ...x, mesures: { ...x.mesures, [step]: { ...mm, lectures: { ...mm.lectures, [id]: { v: p.valeur, pos } }, jugements } } };
      });
      set((st) => ({ point: { ...st.point, [step]: id } }));
    },

    juger(step, id, j) {
      const e = MESURES[step];
      const p = e?.points.find((x) => x.id === id);
      const l = get().s.mesures[step]?.lectures[id];
      if (!e || !p || !l) { say('Mesure d\'abord ce point.'); return; }
      const faux = (j === 'C') !== estConforme(p, l.v);
      patch((x) => {
        const mm = x.mesures[step];
        return { ...x, mesures: { ...x.mesures, [step]: { ...mm, jugements: { ...mm.jugements, [id]: j }, errJuge: mm.errJuge + (faux ? 1 : 0) } } };
      });
      if (faux) say('Compare la valeur lue au critère de l\'étape.');
    },

    leverReserve(step) {
      const e = MESURES[step];
      if (!e?.reserve) return;
      const id = e.reserve.point;
      patch((x) => {
        const mm = x.mesures[step];
        const lectures = { ...mm.lectures };
        const jugements = { ...mm.jugements };
        delete lectures[id];
        delete jugements[id];
        return { ...x, mesures: { ...x.mesures, [step]: { ...mm, levee: true, lectures, jugements } } };
      });
      set((st) => ({ point: { ...st.point, [step]: id } }));
      say('Réserve levée : refais la mesure sur le point corrigé.');
    },

    answerQcm(step, which, i) {
      const e = MESURES[step];
      if (!e) return;
      const q = which === 'role' ? e.role : e.limite;
      const faux = i !== q.answer;
      patch((x) => {
        const mm = x.mesures[step];
        return { ...x, mesures: { ...x.mesures, [step]: { ...mm, [which]: i, errQcm: mm.errQcm + (faux ? 1 : 0) } } };
      });
    },

    /* ---------------------------------------------------- déconsignation, essais, PV */

    deconsigner(id) {
      const { s } = get();
      const attendu = DECONSIGNATION[s.decons.seq.length];
      if (!attendu || s.decons.seq.includes(id)) return;
      if (attendu.id !== id) {
        patch((x) => ({ ...x, decons: { ...x.decons, err: x.decons.err + 1 } }));
        say(`Pas encore : l'étape suivante est « ${attendu.label} ».`);
        return;
      }
      patch((x) => ({ ...x, decons: { ...x.decons, seq: [...x.decons.seq, id] } }));
    },

    essai(id) {
      const { s } = get();
      const e = MESURES[MES.PHASES]!;
      const l = s.mesures[MES.PHASES].lectures.rot;
      if (!l || !estConforme(e.points[0], l.v)) {
        say('Vérifie d\'abord que l\'ordre des phases est direct : sinon la pompe tourne à l\'envers.');
        return;
      }
      patch((x) => ({ ...x, essais: { ...x.essais, [id]: true } }));
    },

    answerRestitution(i) {
      const faux = i !== RESTITUTION.answer;
      patch((x) => ({ ...x, pv: { restitution: i, err: x.pv.err + (faux ? 1 : 0) } }));
    },

    async finish() {
      const { s, attemptId, offline, student, tp } = get();
      if (!s.done[MES.PV] && stepOk(s, MES.PV)) get().validate();
      const done = get().s;
      if (!attemptId || offline || get().sent) return;
      try {
        await finishAttempt(
          attemptId,
          {
            tpId: tp?.id ?? 'mise-en-service-station',
            title: tp?.title ?? '',
            kind: 'miseEnService',
            student,
            report: rapportPv(done),
            stageScores: mesStageScores(done),
            stageLabels: MES_STEP_LABELS,
            refus: done.refus,
            helpUsed: done.helpUsed,
            at: new Date().toISOString(),
          },
          mesScore(done),
          buildMesEvaluation(done, student.diploma),
          student.diploma,
        );
        set({ sent: true });
      } catch {
        set({ offline: true });
      }
    },
  };
});
