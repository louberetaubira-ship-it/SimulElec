'use client';

/**
 * Atelier libre : état du montage en cours (zustand).
 * Port de l'objet `FREE` / `freeAdd` / `freeRemove` de `docs/reference/illustration-v3.tpl.html`.
 */
import { create } from 'zustand';
import type {
  AnnexKind, CatalogueItem, FreeProject, Liaison, NetKind, SceneKind, Slot, TpDefinition,
} from '@/lib/types';
import { RAILS, RAIL_H, RAIL_X, SMALL_W } from '@/lib/scene/geometry';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { libraryItemSync, loadLibraryItem } from '@/lib/data/library';
import {
  createProject, deleteProject, getProject, listMyProjects, shareProject, updateProject,
  type ProjectRow,
} from '@/lib/db/projects';

/** Un appareil posé dans l'atelier : géométrie complètement résolue. */
export type FreeSlot = FreeProject['slots'][number];

/** Rail « annexe » (porte / pièce / local / toiture) : au-delà des trois rails DIN. */
export const ANNEX_RAIL = RAILS.length; // 3

/** Bas de la colonne d'annexe : au-delà, plus de place. */
const ANNEX_BOTTOM = 690;
/** Colonne d'empilage des éléments d'annexe (comme la référence). */
const ANNEX_COL_X = 446;
const ANNEX_COL_W = 80;

export const NETS: NetKind[] = ['L1', 'L2', 'L3', 'N', 'PE', 'C', 'C0', 'DC+', 'DC-'];

export const SCENES: { id: SceneKind; label: string }[] = [
  { id: 'ind', label: 'Industriel' },
  { id: 'hab', label: 'Habitat' },
  { id: 'ter', label: 'Tertiaire' },
  { id: 'pv', label: 'Photovoltaïque' },
];

/** Colonne de droite selon la scène. */
export function annexOf(scene: SceneKind): AnnexKind {
  return scene === 'ind' ? 'door' : scene === 'hab' ? 'room' : scene === 'ter' ? 'local' : 'roof';
}

/** Cet élément se pose-t-il en annexe (bouton, voyant, prise, module PV) ? */
export function isDoorItem(item: CatalogueItem): boolean {
  return item.door === true || item.kind === 'button' || item.kind === 'lamp' || item.kind === 'pv';
}

/**
 * Préfixe de repère normalisé, déduit de la clé et de la nature de l'appareil
 * (Q protection, KM contacteur, F thermique, T transformateur, A automate,
 * H voyant, S bouton, X1:n bornier, E par défaut).
 */
export function repPrefix(item: CatalogueItem): string {
  const k = item.key;
  if (item.small) return 'X';
  if (k === 'kontakt' || /^p042/.test(k)) return 'KM';
  if (k === 'therm' || /^p043/.test(k)) return 'F';
  if (k === 'trafo' || /^p076/.test(k) || /^l_alimenta/.test(k)) return 'T';
  if (k === 'plc' || /^p04[45]/.test(k) || /^p03[012]/.test(k) || /^l_automate/.test(k)) return 'A';
  if (k === 'timer') return 'KA';
  if (/^lamp/.test(k) || /^p01[567]/.test(k) || /^l_voyants/.test(k)) return 'H';
  if (k === 'stopstart' || /^p0(18|48|39|49)/.test(k) || /^l_boutons/.test(k) || /^l_capteurs/.test(k)) return 'S';
  if (k === 'motorcb' || /^(mcb|rcd|steck)/.test(k) || /^p04[01]/.test(k) || /^p046/.test(k)
    || /^p01[01234]/.test(k) || /^l_protecti/.test(k)) return 'Q';
  switch (item.kind) {
    case 'contactor': return 'KM';
    case 'thermal': return 'F';
    case 'trafo': return 'T';
    case 'plc': return 'A';
    case 'lamp': return 'H';
    case 'button': return 'S';
    case 'mcb': case 'rcd': case 'motorcb': case 'main': return 'Q';
    case 'terminal': return 'X';
    default: return 'E';
  }
}

/** Taille d'un appareil posé : une borne de bornier fait 16 px de large. */
function sizeOf(item: CatalogueItem): { w: number; h: number } {
  if (item.small) return { w: SMALL_W, h: Math.round((item.h * SMALL_W) / item.w) };
  return { w: item.w, h: item.h };
}

export interface PlaceResult { slot: FreeSlot | null; error: string | null }

/* ------------------------------------------------------- défaire / refaire */

/** Photo du montage : tout ce qu'une opération annulable peut changer. */
export interface AtelierSnap { slots: FreeSlot[]; wires: FreeProject['wires']; seq: number }
export interface AtelierUndo { label: string; before: AtelierSnap; after: AtelierSnap }
/** Profondeur de la pile d'annulation (au moins 30 opérations). */
export const UNDO_MAX = 40;
/** Durée du message « … supprimé · Annuler » (ms). */
const UNDO_NOTICE_MS = 5500;

/** Libellé court d'un fil. */
export const wireLabel = (w: { a: string; b: string }): string =>
  `${w.a.replace('.', ' ')} → ${w.b.replace('.', ' ')}`;

/** Calcule la place du prochain appareil (rail courant ou annexe). Port de `freeAdd`. */
export function place(slots: FreeSlot[], seq: number, item: CatalogueItem, rail: number): PlaceResult {
  const door = isDoorItem(item);
  const r = door ? ANNEX_RAIL : (rail === ANNEX_RAIL ? 0 : rail);
  const { w, h } = sizeOf(item);
  const used = slots.filter((s) => s.rail === r);

  let x: number;
  let y: number;
  if (door) {
    y = used.length ? Math.max(...used.map((s) => s.y + (s.h ?? 0))) + 14 : 60;
    x = ANNEX_COL_X + Math.max(0, (ANNEX_COL_W - w) / 2);
    if (y + h > ANNEX_BOTTOM) return { slot: null, error: 'Annexe pleine : retire un élément.' };
  } else {
    x = used.length ? Math.max(...used.map((s) => s.x + (s.w ?? 0))) + (item.small ? 2 : 8) : 52;
    if (x + w > RAIL_X[1] - 4) return { slot: null, error: 'Rail plein : choisis un autre rail.' };
    y = RAILS[r] + RAIL_H / 2 - h / 2;
  }

  const pre = repPrefix(item);
  const n = slots.filter((s) => (s.rep ?? '').replace(/[\d:]+$/, '') === pre).length + 1;
  const rep = item.small ? `X1:${n}` : `${pre}${n}`;

  const slot: FreeSlot = {
    id: `d${seq}`,
    label: item.name,
    key: item.key,
    rail: r,
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    rep,
    ...(item.small ? { mark: String(n) } : {}),
  };
  return { slot, error: null };
}

/** `TpDefinition` de synthèse : juste ce qu'il faut au `<Panel>` pour dessiner le montage. */
export function freeTp(scene: SceneKind, slots: FreeSlot[], wires: FreeProject['wires']): TpDefinition {
  const liaisons: Liaison[] = wires.map((w) => ({ a: w.a, b: w.b, net: w.net }));
  return {
    id: 'atelier',
    title: 'Mon montage',
    level: 'libre',
    family: scene,
    scene,
    annex: annexOf(scene),
    playable: false,
    competences: [],
    summary: '',
    situation: '',
    plaque: {},
    cahierDesCharges: [],
    postes: [],
    rails: [...RAILS],
    slots: slots as Slot[],
    annexItems: [],
    liaisons,
    nets: {},
    tests: [],
    mesures: [],
    faults: [],
    quiz: [],
    motor: null,
    station: false,
    hasMotor: false,
  };
}

/* ------------------------------------------------------------ montage de démonstration */

/** Montage préchargé (référence v3) : Q1 + KM1 + F1, T1 + Q2, bornier X1, 9 fils. */
const DEMO_KEYS: [string, number][] = [
  ['motorcb', 0], ['kontakt', 0], ['therm', 0],
  ['trafo', 1], ['mcb1p', 1],
  ['termred', 2], ['termred', 2], ['termred', 2], ['termblue', 2], ['earth', 2],
];

const DEMO_WIRES: FreeProject['wires'] = [
  { a: 'd6.a', b: 'd1.1', net: 'L1' },
  { a: 'd7.a', b: 'd1.3', net: 'L2' },
  { a: 'd8.a', b: 'd1.5', net: 'L3' },
  { a: 'd1.2', b: 'd2.1', net: 'L1' },
  { a: 'd1.4', b: 'd2.3', net: 'L2' },
  { a: 'd1.6', b: 'd2.5', net: 'L3' },
  { a: 'RES.L1', b: 'd6.b', net: 'L1' },
  { a: 'RES.L2', b: 'd7.b', net: 'L2' },
  { a: 'RES.L3', b: 'd8.b', net: 'L3' },
];

/** Construit le montage de démonstration (appareils du pack uniquement). */
export function demoProject(): { project: FreeProject; items: Record<string, CatalogueItem>; seq: number } {
  const slots: FreeSlot[] = [];
  const items: Record<string, CatalogueItem> = {};
  let seq = 0;
  for (const [key, rail] of DEMO_KEYS) {
    const item = CATALOGUE_BY_KEY[key];
    if (!item) continue;
    items[key] = item;
    seq += 1;
    const { slot } = place(slots, seq, item, rail);
    if (slot) slots.push(slot); else seq -= 1;
  }
  return { project: { scene: 'ind', slots, wires: [...DEMO_WIRES] }, items, seq };
}

/* ------------------------------------------------------------------- store */

interface AtelierState {
  projectId: string | null;
  title: string;
  scene: SceneKind;
  slots: FreeSlot[];
  wires: FreeProject['wires'];
  items: Record<string, CatalogueItem>;
  rail: number;
  net: NetKind;
  sel: string | null;
  seq: number;
  cover: boolean;
  marks: boolean;
  hint: string | null;
  saving: boolean;
  loading: boolean;
  projects: ProjectRow[];
  /** Fil sélectionné sur la platine (index dans `wires`). */
  selWire: number | null;
  /** Menu contextuel tactile ouvert sur un fil (appui long). */
  wireMenu: { index: number; x: number; y: number } | null;
  undoStack: AtelierUndo[];
  redoStack: AtelierUndo[];
  /** Message temporaire « … supprimé » avec bouton « Annuler ». */
  undoNotice: string | null;
  /** Boîte de dialogue « Vider la platine » ouverte. */
  confirmClear: boolean;

  init: () => Promise<void>;
  say: (m: string | null) => void;
  setRail: (r: number) => void;
  setNet: (n: NetKind) => void;
  setScene: (s: SceneKind) => void;
  setTitle: (t: string) => void;
  toggleCover: () => void;
  toggleMarks: () => void;

  add: (item: CatalogueItem) => void;
  removeSlot: (id: string) => void;
  clickTerminal: (id: string) => void;
  removeWire: (idx: number) => void;
  selectWire: (idx: number | null) => void;
  openWireMenu: (idx: number, x: number, y: number) => void;
  closeWireMenu: () => void;
  deleteSelectedWire: () => void;
  undo: () => void;
  redo: () => void;
  dismissUndoNotice: () => void;
  askClear: (v: boolean) => void;

  clear: () => void;
  newProject: () => void;
  save: () => Promise<void>;
  open: (id: string) => Promise<void>;
  destroy: (id: string) => Promise<void>;
  share: (id: string, classId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

let hintTimer: ReturnType<typeof setTimeout> | null = null;

export const useAtelier = create<AtelierState>((set, get) => {
  const say = (m: string | null) => {
    set({ hint: m });
    if (hintTimer) clearTimeout(hintTimer);
    if (m) hintTimer = setTimeout(() => set({ hint: null }), 3000);
  };

  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

  const notice = (m: string | null) => {
    set({ undoNotice: m });
    if (noticeTimer) clearTimeout(noticeTimer);
    if (m) noticeTimer = setTimeout(() => set({ undoNotice: null }), UNDO_NOTICE_MS);
  };

  const snapOf = (): AtelierSnap => {
    const { slots, wires, seq } = get();
    return { slots, wires, seq };
  };

  /** Applique une opération sur le montage et l'empile dans l'historique. */
  const commit = (label: string, next: (snap: AtelierSnap) => AtelierSnap) => {
    const before = snapOf();
    const after = next(before);
    set(s => ({
      ...after,
      selWire: null,
      wireMenu: null,
      undoStack: [...s.undoStack, { label, before, after }].slice(-UNDO_MAX),
      redoStack: [],
    }));
  };

  /** Charge les éléments de bibliothèque manquants d'un montage rouvert. */
  const resolve = async (slots: FreeSlot[]) => {
    const keys = Array.from(new Set(slots.map((s) => s.key)));
    const out: Record<string, CatalogueItem> = {};
    for (const k of keys) {
      const it = CATALOGUE_BY_KEY[k] ?? libraryItemSync(k);
      if (it) out[k] = it;
    }
    const missing = keys.filter((k) => !out[k]);
    if (missing.length) {
      const loaded = await Promise.all(missing.map((k) => loadLibraryItem(k)));
      loaded.forEach((it) => { if (it) out[it.key] = it; });
    }
    set((s) => ({ items: { ...s.items, ...out } }));
  };

  const loadDemo = () => {
    const { project, items, seq } = demoProject();
    set({
      projectId: null,
      title: 'Mon montage',
      scene: project.scene,
      slots: project.slots,
      wires: project.wires,
      items,
      seq,
      sel: null,
      rail: 0,
      selWire: null,
      wireMenu: null,
      undoStack: [],
      redoStack: [],
      undoNotice: null,
      confirmClear: false,
    });
  };

  return {
    projectId: null,
    title: 'Mon montage',
    scene: 'ind',
    slots: [],
    wires: [],
    items: {},
    rail: 0,
    net: 'L1',
    sel: null,
    seq: 0,
    cover: true,
    marks: true,
    hint: null,
    saving: false,
    loading: true,
    projects: [],
    selWire: null,
    wireMenu: null,
    undoStack: [],
    redoStack: [],
    undoNotice: null,
    confirmClear: false,

    async init() {
      loadDemo();
      set({ loading: false });
      await get().refresh();
    },

    say,

    setRail(r) {
      set({ rail: r, sel: null });
      say(r === ANNEX_RAIL
        ? 'Annexe sélectionnée : les boutons, voyants et prises s\'y empilent.'
        : `Rail ${r + 1} sélectionné : pose tes appareils depuis la bibliothèque.`);
    },
    setNet(n) { set({ net: n }); },
    setScene(s) { set({ scene: s }); },
    setTitle(t) { set({ title: t }); },
    toggleCover() { set((s) => ({ cover: !s.cover })); },
    toggleMarks() { set((s) => ({ marks: !s.marks })); },

    add(item) {
      const { slots, seq, rail } = get();
      const next = seq + 1;
      const { slot, error } = place(slots, next, item, rail);
      if (!slot) { say(error); return; }
      set((s) => ({ items: { ...s.items, [item.key]: item }, sel: null }));
      commit(`Pose de ${slot.rep}`, (snap) => ({
        ...snap, slots: [...snap.slots, slot], seq: next,
      }));
      say(`${slot.rep} posé${slot.rail === ANNEX_RAIL ? ' en annexe' : ` sur le rail ${(slot.rail ?? 0) + 1}`}.`);
    },

    removeSlot(id) {
      const slot = get().slots.find((x) => x.id === id);
      set({ sel: null });
      commit(`Retrait de ${slot?.rep ?? id}`, (snap) => ({
        ...snap,
        slots: snap.slots.filter((x) => x.id !== id),
        wires: snap.wires.filter((w) => !w.a.startsWith(`${id}.`) && !w.b.startsWith(`${id}.`)),
      }));
      say('Appareil retiré (ses fils avec lui).');
    },

    clickTerminal(id) {
      const { sel, net, wires } = get();
      if (!sel) { set({ sel: id, selWire: null }); return; }
      if (sel === id) { set({ sel: null }); return; }
      const exists = wires.some((w) => (w.a === sel && w.b === id) || (w.a === id && w.b === sel));
      if (exists) { set({ sel: null }); say('Ces deux bornes sont déjà reliées.'); return; }
      set({ sel: null });
      commit(`Fil ${sel.replace('.', ' ')} → ${id.replace('.', ' ')}`, (snap) => ({
        ...snap, wires: [...snap.wires, { a: sel, b: id, net }],
      }));
      say(`Fil ${net} : ${sel} → ${id}.`);
    },

    removeWire(idx) {
      const w = get().wires[idx];
      if (!w) return;
      commit(`Retrait ${wireLabel(w)}`, (snap) => ({
        ...snap, wires: snap.wires.filter((_, i) => i !== idx),
      }));
      notice(`Fil ${wireLabel(w)} supprimé`);
    },

    selectWire(idx) {
      if (idx == null) { set({ selWire: null, wireMenu: null }); return; }
      if (!get().wires[idx]) return;
      set((s) => ({ selWire: s.selWire === idx ? null : idx, wireMenu: null, sel: null }));
    },

    openWireMenu(idx, x, y) {
      if (!get().wires[idx]) return;
      set({ selWire: idx, wireMenu: { index: idx, x, y } });
    },

    closeWireMenu() { set({ wireMenu: null }); },

    deleteSelectedWire() {
      const { selWire } = get();
      if (selWire == null) { say('Sélectionne d\'abord un fil sur la platine.'); return; }
      get().removeWire(selWire);
    },

    undo() {
      const { undoStack } = get();
      const last = undoStack[undoStack.length - 1];
      if (!last) { say('Rien à annuler.'); return; }
      notice(null);
      set((s) => ({
        ...last.before,
        selWire: null,
        wireMenu: null,
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, last].slice(-UNDO_MAX),
      }));
      say(`Annulé : ${last.label.toLowerCase()}`);
    },

    redo() {
      const { redoStack } = get();
      const last = redoStack[redoStack.length - 1];
      if (!last) { say('Rien à rétablir.'); return; }
      set((s) => ({
        ...last.after,
        selWire: null,
        wireMenu: null,
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, last].slice(-UNDO_MAX),
      }));
      say(`Rétabli : ${last.label.toLowerCase()}`);
    },

    dismissUndoNotice() { notice(null); },

    askClear(v) { set({ confirmClear: v, wireMenu: null }); },

    clear() {
      set({ sel: null, confirmClear: false });
      commit('Platine vidée', () => ({ slots: [], wires: [], seq: 0 }));
      say('Platine vidée.');
    },

    newProject() {
      loadDemo();
      say('Nouveau montage : le montage de démonstration est chargé, à toi de jouer.');
    },

    async save() {
      const { projectId, title, scene, slots, wires } = get();
      set({ saving: true });
      const data: FreeProject = { scene, slots, wires };
      try {
        if (projectId) {
          await updateProject(projectId, { title, scene, data });
          say(`Enregistré · ${slots.length} appareils, ${wires.length} fils.`);
        } else {
          const row = await createProject({ title, scene, data });
          set({ projectId: row.id });
          say(`Montage créé · ${slots.length} appareils, ${wires.length} fils.`);
        }
        await get().refresh();
      } finally {
        set({ saving: false });
      }
    },

    async open(id) {
      set({ loading: true });
      const row = await getProject(id);
      if (!row) { set({ loading: false }); say('Montage introuvable.'); return; }
      const data = row.data ?? { scene: row.scene, slots: [], wires: [] };
      const slots = data.slots ?? [];
      const maxSeq = slots.reduce((a, s) => Math.max(a, Number((s.id || '').replace(/^d/, '')) || 0), 0);
      set({
        projectId: row.id,
        title: row.title,
        scene: (data.scene ?? row.scene) as SceneKind,
        slots,
        wires: data.wires ?? [],
        seq: maxSeq,
        sel: null,
        loading: false,
        selWire: null,
        wireMenu: null,
        undoStack: [],
        redoStack: [],
        undoNotice: null,
      });
      await resolve(slots);
      say(`« ${row.title} » ouvert.`);
    },

    async destroy(id) {
      await deleteProject(id);
      if (get().projectId === id) set({ projectId: null });
      await get().refresh();
      say('Montage supprimé.');
    },

    async share(id, classId) {
      await shareProject(id, classId);
      await get().refresh();
      say(classId ? 'Montage partagé à ta classe.' : 'Partage retiré.');
    },

    async refresh() {
      const rows = await listMyProjects();
      set({ projects: rows });
    },
  };
});
