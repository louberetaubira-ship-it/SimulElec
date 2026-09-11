'use client';

/**
 * État du studio de création de TP (zustand) : définition en cours, catalogue résolu,
 * enregistrement en brouillon toutes les 5 s, publication et contrôle de cohérence.
 */
import { create } from 'zustand';
import type { CatalogueItem, ExpectedMeasure, Liaison, NetKind, Poste, SceneKind, TpDefinition } from '@/lib/types';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { libraryItemSync, loadLibraryItem } from '@/lib/data/library';
import { DOMAIN_LABEL, DOMAIN_TO_COMPETENCES, type DiplomaId, type Domain } from '@/lib/data/competences';
import {
  createTp, freeTpId, getTpRow, isBundledTp, rowToDefinition, slugifyTitle, studioMetaOf, updateTp,
  type TpSavePayload, type TpStoredDefinition,
} from '@/lib/db/tps';
import { tpById } from '@/lib/data/tps';
import {
  ANNEX_BY_SCENE, checkTp, deduceLiaisons, deriveNets, emptyMeasure, emptyTp, isPlayable, linkKey,
  moveSlot, poseItem, posteFor, terminalsOf, type Zone,
} from './model';

export type StudioTab = 'materiel' | 'postes' | 'liaisons' | 'mesures' | 'competences' | 'reglages';

/** Sélection courante : un appareil du rail, un élément d'annexe ou un récepteur. */
export interface Selection { kind: 'slot' | 'annex' | 'recv'; id: string }

interface StudioState {
  /** Identifiant du TP en base ; `null` tant qu'il n'a jamais été enregistré. */
  id: string | null;
  def: TpDefinition;
  items: Record<string, CatalogueItem>;
  domains: Domain[];
  diplomas: DiplomaId[];
  published: boolean;
  archived: boolean;
  zone: Zone;
  net: NetKind;
  sel: Selection | null;
  selTerminal: string | null;
  tab: StudioTab;
  hint: string | null;
  loading: boolean;
  saving: boolean;
  savedAt: number | null;
  dirty: boolean;
  error: string | null;
  anomalies: string[];

  load: (id: string | null, source?: string | null) => Promise<void>;
  say: (m: string | null) => void;
  setTab: (t: StudioTab) => void;
  setZone: (z: Zone) => void;
  setNet: (n: NetKind) => void;
  select: (s: Selection | null) => void;
  clickTerminal: (id: string) => void;

  add: (item: CatalogueItem) => Promise<void>;
  remove: (s: Selection) => void;
  nudge: (dx: number) => void;
  patchSlot: (id: string, patch: { label?: string; rep?: string; rail?: number; w?: number }) => void;

  addLiaison: (a: string, b: string, net: NetKind, flags?: { door?: boolean; prewired?: boolean }) => void;
  removeLiaison: (index: number) => void;
  deduce: () => void;

  addPoste: (slotId: string) => void;
  updatePoste: (index: number, poste: Poste) => void;
  removePoste: (index: number) => void;

  addMesure: () => void;
  updateMesure: (index: number, m: ExpectedMeasure) => void;
  removeMesure: (index: number) => void;

  toggleDomain: (d: Domain) => void;
  toggleDiploma: (d: DiplomaId) => void;
  patchDef: (patch: Partial<TpDefinition>) => void;
  setScene: (s: SceneKind) => void;

  save: () => Promise<string | null>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  importDefinition: (def: TpDefinition, domains: Domain[], diplomas: DiplomaId[]) => void;
}

/** Délai d'enregistrement automatique du brouillon. */
export const AUTOSAVE_MS = 5000;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** Enregistrement en cours : les demandes concurrentes attendent le même résultat. */
let enCours: Promise<string | null> | null = null;
let hintTimer: ReturnType<typeof setTimeout> | null = null;

/** Compétences affichées dans le catalogue : les domaines travaillés, en clair. */
export function competencesOf(domains: Domain[]): string[] {
  return domains.map((d) => DOMAIN_LABEL[d]);
}

/** Nombre de compétences du référentiel couvertes par les domaines cochés. */
export function competenceCodes(diploma: DiplomaId, domains: Domain[]): string[] {
  const map = DOMAIN_TO_COMPETENCES[diploma];
  const out = new Set<string>();
  for (const d of domains) for (const c of map[d] ?? []) out.add(c);
  return Array.from(out).sort();
}

export const useStudio = create<StudioState>((set, get) => {
  const say = (m: string | null) => {
    set({ hint: m });
    if (hintTimer) clearTimeout(hintTimer);
    if (m) hintTimer = setTimeout(() => set({ hint: null }), 4000);
  };

  /** Marque la définition modifiée et programme l'enregistrement du brouillon. */
  const touch = (patch: Partial<StudioState>) => {
    set({ ...patch, dirty: true } as StudioState);
    const { def, items } = get();
    set({ anomalies: checkTp(def, items) });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void get().save(); }, AUTOSAVE_MS);
  };

  /** Ajoute au catalogue résolu les appareils manquants d'une définition. */
  const resolve = async (def: TpDefinition) => {
    const keys = Array.from(new Set([
      ...def.slots.map((s) => s.key),
      ...(def.annexItems ?? []).map((a) => a.key),
      ...(def.recvItems ?? []).map((a) => a.key),
    ]));
    const out: Record<string, CatalogueItem> = {};
    const missing: string[] = [];
    for (const k of keys) {
      const it = CATALOGUE_BY_KEY[k] ?? libraryItemSync(k);
      if (it) out[k] = it; else missing.push(k);
    }
    if (missing.length) {
      const loaded = await Promise.all(missing.map((k) => loadLibraryItem(k)));
      for (const it of loaded) if (it) out[it.key] = it;
    }
    set((s) => ({ items: { ...s.items, ...out } }));
    set((s) => ({ anomalies: checkTp(s.def, s.items) }));
  };

  return {
    id: null,
    def: emptyTp('', 'ind'),
    items: {},
    domains: ['analyse', 'choix', 'pose', 'cablage', 'controle', 'mesure', 'securite'],
    diplomas: ['bacpro'],
    published: false,
    archived: false,
    zone: 0,
    net: 'L1',
    sel: null,
    selTerminal: null,
    tab: 'materiel',
    hint: null,
    loading: true,
    saving: false,
    savedAt: null,
    dirty: false,
    error: null,
    anomalies: [],

    async load(id, source) {
      set({ loading: true, error: null });
      try {
        if (id) {
          const row = await getTpRow(id);
          if (!row) throw new Error('Ce TP est introuvable (il a peut-être été supprimé).');
          const def = rowToDefinition(row) ?? { ...emptyTp(row.id, 'ind'), title: row.title, summary: row.summary ?? '' };
          const meta = studioMetaOf(row);
          set({
            id: row.id,
            def,
            published: row.published,
            archived: row.archived === true,
            domains: meta.domains.length ? meta.domains : get().domains,
            diplomas: meta.diplomas.length ? meta.diplomas : get().diplomas,
            dirty: false,
            savedAt: null,
          });
          await resolve(def);
          return;
        }
        // Nouveau TP, éventuellement dupliqué d'un TP fourni ou d'un TP de la base.
        if (source) {
          const bundled = tpById(source);
          if (bundled) {
            const def: TpDefinition = JSON.parse(JSON.stringify(bundled)) as TpDefinition;
            def.id = '';
            def.title = `${bundled.title} (copie)`;
            def.playable = false;
            set({ id: null, def, published: false, archived: false, dirty: true, savedAt: null });
            await resolve(def);
            say('Copie éditable d’un TP fourni : modifie-la puis publie-la.');
            return;
          }
          const row = await getTpRow(source);
          const copied = row ? rowToDefinition(row) : null;
          if (copied) {
            copied.id = '';
            copied.title = `${copied.title} (copie)`;
            copied.playable = false;
            const meta = row ? studioMetaOf(row) : null;
            set({
              id: null, def: copied, published: false, archived: false, dirty: true, savedAt: null,
              domains: meta?.domains.length ? meta.domains : get().domains,
              diplomas: meta?.diplomas.length ? meta.diplomas : get().diplomas,
            });
            await resolve(copied);
            return;
          }
        }
        const def = emptyTp('', 'ind');
        set({ id: null, def, published: false, archived: false, dirty: false, savedAt: null });
        await resolve(def);
      } catch (e) {
        set({ error: e instanceof Error ? e.message : 'Chargement impossible.' });
      } finally {
        set({ loading: false });
      }
    },

    say,
    setTab(t) { set({ tab: t }); },
    setZone(z) { set({ zone: z, selTerminal: null }); },
    setNet(n) { set({ net: n }); },
    select(s) { set({ sel: s, selTerminal: null }); },

    clickTerminal(id) {
      const { selTerminal, net } = get();
      if (!selTerminal) { set({ selTerminal: id }); say(`Borne ${id} sélectionnée : clique la seconde borne.`); return; }
      if (selTerminal === id) { set({ selTerminal: null }); return; }
      get().addLiaison(selTerminal, id, net);
      set({ selTerminal: null });
    },

    async add(item) {
      const full = item.src || !item.key.startsWith('l_') ? item : (await loadLibraryItem(item.key)) ?? item;
      const { def, zone } = get();
      const res = poseItem(def, full, zone);
      if (res.error) { say(res.error); return; }
      set((s) => ({ items: { ...s.items, [full.key]: full } }));
      if (res.slot) {
        const slot = res.slot;
        touch({ def: { ...def, slots: [...def.slots, slot] }, sel: { kind: 'slot', id: slot.id } });
        say(`${slot.rep} posé sur le rail ${(slot.rail ?? 0) + 1}.`);
        return;
      }
      if (res.annex) {
        const it = res.annex;
        touch({ def: { ...def, annexItems: [...(def.annexItems ?? []), it] }, sel: { kind: 'annex', id: it.rep } });
        say(`${it.rep} posé en annexe.`);
        return;
      }
      if (res.recv) {
        const it = res.recv;
        touch({ def: { ...def, recvItems: [...(def.recvItems ?? []), it] }, sel: { kind: 'recv', id: it.rep } });
        say(`${it.rep} posé dans le bloc récepteurs.`);
      }
    },

    remove(s) {
      const { def } = get();
      if (s.kind === 'slot') {
        const prefix = `${s.id}.`;
        touch({
          def: {
            ...def,
            slots: def.slots.filter((x) => x.id !== s.id),
            liaisons: def.liaisons.filter((l) => !l.a.startsWith(prefix) && !l.b.startsWith(prefix)),
            postes: def.postes.filter((p) => p.id !== s.id),
            mesures: def.mesures.filter((m) => !(m.a ?? '').startsWith(prefix) && !(m.b ?? '').startsWith(prefix)),
          },
          sel: null,
        });
        return;
      }
      const prefix = `${s.id}.`;
      const liaisons = def.liaisons.filter((l) => !l.a.startsWith(prefix) && !l.b.startsWith(prefix));
      touch(s.kind === 'annex'
        ? { def: { ...def, liaisons, annexItems: (def.annexItems ?? []).filter((a) => a.rep !== s.id) }, sel: null }
        : { def: { ...def, liaisons, recvItems: (def.recvItems ?? []).filter((a) => a.rep !== s.id) }, sel: null });
    },

    nudge(dx) {
      const { def, sel, items } = get();
      if (!sel) return;
      if (sel.kind === 'slot') {
        const slot = def.slots.find((s) => s.id === sel.id);
        const item = slot ? items[slot.key] : undefined;
        if (!slot || !item) return;
        touch({ def: { ...def, slots: moveSlot(def, sel.id, dx, slot.w ?? item.w) } });
        return;
      }
      const list = sel.kind === 'annex' ? def.annexItems ?? [] : def.recvItems ?? [];
      const next = list.map((a) => (a.rep === sel.id ? { ...a, x: Math.max(0, Math.round(a.x + dx)) } : a));
      touch(sel.kind === 'annex' ? { def: { ...def, annexItems: next } } : { def: { ...def, recvItems: next } });
    },

    patchSlot(id, patch) {
      const { def } = get();
      touch({
        def: {
          ...def,
          slots: def.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        },
      });
    },

    addLiaison(a, b, net, flags) {
      const { def } = get();
      if (!a || !b || a === b) return;
      if (def.liaisons.some((l) => linkKey(l.a, l.b) === linkKey(a, b))) { say('Cette liaison existe déjà.'); return; }
      const liaison: Liaison = { a, b, net, door: flags?.door === true, prewired: flags?.prewired === true };
      touch({ def: { ...def, liaisons: [...def.liaisons, liaison] } });
      say(`Liaison ${a} → ${b} ajoutée.`);
    },

    removeLiaison(index) {
      const { def } = get();
      touch({ def: { ...def, liaisons: def.liaisons.filter((_, i) => i !== index) } });
    },

    deduce() {
      const { def, items } = get();
      const proposals = deduceLiaisons(def, items);
      if (!proposals.length) { say('Aucune liaison évidente à ajouter : tout est déjà déclaré.'); return; }
      touch({ def: { ...def, liaisons: [...def.liaisons, ...proposals] } });
      say(`${proposals.length} liaison${proposals.length > 1 ? 's' : ''} proposée${proposals.length > 1 ? 's' : ''} : vérifie-les et corrige si besoin.`);
    },

    addPoste(slotId) {
      const { def, items } = get();
      const slot = def.slots.find((s) => s.id === slotId);
      const item = slot ? items[slot.key] : undefined;
      if (!slot || !item) return;
      if (def.postes.some((p) => p.id === slotId)) { say('Ce poste de choix existe déjà.'); return; }
      const poste = posteFor(slot, item);
      touch({ def: { ...def, postes: [...def.postes, poste] } });
    },

    updatePoste(index, poste) {
      const { def } = get();
      touch({ def: { ...def, postes: def.postes.map((p, i) => (i === index ? poste : p)) } });
    },

    removePoste(index) {
      const { def } = get();
      touch({ def: { ...def, postes: def.postes.filter((_, i) => i !== index) } });
    },

    addMesure() {
      const { def } = get();
      touch({ def: { ...def, mesures: [...def.mesures, emptyMeasure(def)] } });
    },

    updateMesure(index, m) {
      const { def } = get();
      touch({ def: { ...def, mesures: def.mesures.map((x, i) => (i === index ? m : x)) } });
    },

    removeMesure(index) {
      const { def } = get();
      touch({ def: { ...def, mesures: def.mesures.filter((_, i) => i !== index) } });
    },

    toggleDomain(d) {
      const { domains } = get();
      touch({ domains: domains.includes(d) ? domains.filter((x) => x !== d) : [...domains, d] });
    },

    toggleDiploma(d) {
      const { diplomas } = get();
      touch({ diplomas: diplomas.includes(d) ? diplomas.filter((x) => x !== d) : [...diplomas, d] });
    },

    patchDef(patch) {
      const { def } = get();
      touch({ def: { ...def, ...patch } });
    },

    setScene(s) {
      const { def } = get();
      touch({ def: { ...def, scene: s, family: s, annex: ANNEX_BY_SCENE[s] } });
    },

    async save() {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      if (enCours) return enCours;
      const promesse = (async (): Promise<string | null> => {
      const { def, items, domains, diplomas, id, published, archived } = get();
      if (!def.title.trim() && !id) return null;
      set({ saving: true, error: null });
      try {
        // Table des réseaux : déduite des liaisons (elle prime), complétée par les entrées
        // déjà présentes (TP dupliqué d'un TP fourni : bornes moteur, conditions d'étape).
        const nets = { ...def.nets, ...deriveNets(def) };
        const complete: TpDefinition = { ...def, nets, playable: isPlayable({ ...def, nets }, items) };
        const stored: TpStoredDefinition = { ...complete, studio: { version: 1, domains, diplomas } };
        const payload: TpSavePayload = {
          title: complete.title,
          level: complete.level,
          family: complete.family,
          scene: complete.scene,
          summary: complete.summary,
          competences: competencesOf(domains),
          diplomas,
          definition: stored,
          published,
          archived,
          playable: complete.playable,
        };
        if (id) {
          await updateTp(id, payload);
          set({ def: complete, dirty: false, saving: false, savedAt: Date.now() });
          return id;
        }
        const base = slugifyTitle(complete.title) || 'tp-sans-titre';
        const newId = await freeTpId(isBundledTp(base) ? `${base}-prof` : base);
        const row = await createTp(newId, { ...payload, definition: { ...stored, id: newId } });
        set({
          id: row.id,
          def: { ...complete, id: row.id },
          dirty: false,
          saving: false,
          savedAt: Date.now(),
        });
        return row.id;
      } catch (e) {
        set({ saving: false, error: e instanceof Error ? e.message : 'Enregistrement impossible.' });
        return get().id;
      }
      })();
      enCours = promesse;
      try {
        return await promesse;
      } finally {
        enCours = null;
      }
    },

    async publish() {
      set({ published: true });
      const id = await get().save();
      if (id) say('TP publié : il apparaît dans le catalogue des élèves.');
    },

    async unpublish() {
      set({ published: false });
      await get().save();
      say('TP dépublié : il repasse en brouillon.');
    },

    importDefinition(def, domains, diplomas) {
      touch({ def, domains, diplomas, sel: null });
      void resolve(def);
    },
  };
});

/* Réexports pratiques pour les composants (évitent un second import). */
export { checkTp, deriveNets, terminalsOf, isPlayable };
