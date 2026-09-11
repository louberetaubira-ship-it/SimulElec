'use client';

/**
 * Persistance des TP : catalogue de l'établissement (table `tps`) et TP fournis avec
 * l'application. La colonne `definition` (jsonb) porte la `TpDefinition` complète écrite
 * dans le studio (`src/components/studio`), plus un bloc `studio` (domaines travaillés,
 * diplômes visés). `rowToDefinition()` la relit de façon défensive : une définition
 * corrompue ne doit jamais casser la page de l'élève.
 */

import { createClient } from '@/lib/supabase/client';
import { TPS } from '@/lib/data/tps';
import type {
  AnnexItem, AnnexKind, ExpectedMeasure, Fault, Liaison, NetKind, Poste, PosteOption,
  SceneKind, Slot, TerminalNet, TestHorsTension, TpDefinition,
} from '@/lib/types';
import type { DiplomaId, Domain } from '@/lib/data/competences';
import type { PedagogieGeneree } from '@/lib/generateur/schema';
import { DOMAIN_LABEL } from '@/lib/data/competences';
import { isDiplomaId } from '@/lib/student';

export interface TpSummary {
  id: string;
  title: string;
  level: string | null;
  competences: string[];
  summary: string | null;
  published: boolean;
}

const fromCode = (t: TpDefinition): TpSummary => ({
  id: t.id,
  title: t.title,
  level: t.level,
  competences: t.competences,
  summary: t.summary,
  published: true,
});

/** TP catalogue from the database, falling back on the bundled definitions when the table is empty. */
export async function listTps(): Promise<TpSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tps')
    .select('id, title, level, competences, summary, published')
    .eq('published', true)
    .order('title');
  if (error || !data || data.length === 0) return TPS.map(fromCode);
  return data as TpSummary[];
}

/** Full definition: always the bundled one (the simulator needs the typed object). */
export function getTpDefinition(id: string): TpDefinition | undefined {
  return TPS.find((t) => t.id === id);
}

// ------------------------------------------------------- TP de l'établissement

/** Familles pédagogiques d'un TP. */
export type TpFamily = 'ind' | 'hab' | 'ter' | 'pv';

export const FAMILIES: { id: TpFamily; label: string }[] = [
  { id: 'ind', label: 'Industriel' },
  { id: 'hab', label: 'Habitat' },
  { id: 'ter', label: 'Tertiaire' },
  { id: 'pv', label: 'Photovoltaïque' },
];

/** Métadonnées propres au studio, rangées à côté de la `TpDefinition`. */
export interface TpStudioMeta {
  version: 1;
  /** Domaines d'activité travaillés (voir `DOMAIN_TO_COMPETENCES`). */
  domains: Domain[];
  /** Diplômes visés par le professeur. */
  diplomas: DiplomaId[];
}

/** Contenu du champ `definition` pour un TP du studio. */
export type TpStoredDefinition = TpDefinition & {
  studio?: TpStudioMeta;
  /** Dossier pédagogique d'un TP généré (objectifs, matériel, activités, critères, quiz). */
  pedagogie?: PedagogieGeneree;
};

/** Contenu d'un TP documentaire (éditeur des premières versions, parcours de lecture). */
export interface TpDocDefinition extends Record<string, unknown> {
  kind: 'documentaire';
  situation: string;
  cahierDesCharges: { k: string; v: string }[];
  quiz: { q: string; options: string[]; answer: number }[];
  diploma: DiplomaId | null;
}

/** Ligne complète de la table `tps`. */
export interface TpRow {
  id: string;
  title: string;
  level: string | null;
  competences: string[];
  summary: string | null;
  definition: TpStoredDefinition | TpDocDefinition | Record<string, unknown>;
  published: boolean;
  family: TpFamily | null;
  scene: string | null;
  playable: boolean;
  author: string | null;
  archived: boolean;
  diplomas: DiplomaId[];
  updated_at?: string | null;
  /** Dossier et maquette produits par le générateur (migration 0009). */
  generated?: boolean;
  /** Génération à l'origine du TP (`generation_logs.id`). */
  generation_id?: string | null;
  /** Professeur ayant relu et validé le TP généré. */
  validated_by?: string | null;
  /** Date de validation humaine : obligatoire avant publication d'un TP généré. */
  validated_at?: string | null;
}

const TP_COLS =
  'id, title, level, competences, summary, definition, published, family, scene, playable, author, archived, diplomas, updated_at, generated, generation_id, validated_by, validated_at';

/** Saisie envoyée en base par le studio. */
export interface TpSavePayload {
  title: string;
  level: string;
  family: TpFamily;
  scene: SceneKind;
  summary: string;
  competences: string[];
  diplomas: DiplomaId[];
  definition: TpStoredDefinition;
  published: boolean;
  archived: boolean;
  playable: boolean;
  /** TP issu du générateur : la base interdit sa publication tant qu'il n'est pas validé. */
  generated?: boolean;
  generation_id?: string | null;
}

/** Identifiant lisible dérivé du titre (« Éclairage d'atelier » → « eclairage-d-atelier »). */
export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function row(payload: TpSavePayload) {
  return {
    title: payload.title.trim() || 'TP sans titre',
    level: payload.level.trim() || null,
    competences: payload.competences,
    summary: payload.summary.trim() || null,
    definition: payload.definition as unknown as Record<string, unknown>,
    published: payload.published,
    family: payload.family,
    scene: payload.scene,
    playable: payload.playable,
    archived: payload.archived,
    diplomas: payload.diplomas,
    ...(payload.generated === undefined ? {} : { generated: payload.generated }),
    ...(payload.generation_id === undefined ? {} : { generation_id: payload.generation_id }),
  };
}

/** Identifiant libre : `base`, puis `base-2`, `base-3`… tant qu'il est pris. */
export async function freeTpId(base: string): Promise<string> {
  const supabase = createClient();
  const root = slugifyTitle(base) || 'tp';
  const { data } = await supabase.from('tps').select('id').like('id', `${root}%`);
  const taken = new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
  for (const t of TPS) taken.add(t.id);
  if (!taken.has(root)) return root;
  for (let i = 2; i < 400; i += 1) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Crée un TP (studio). L'auteur est le professeur connecté. */
export async function createTp(id: string, payload: TpSavePayload): Promise<TpRow> {
  const supabase = createClient();
  if (!id) throw new Error("L'identifiant du TP est vide.");
  if (isBundledTp(id)) throw new Error('Cet identifiant est celui d’un TP fourni avec l’application.');
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('tps')
    .insert({ id, author: user?.id ?? null, ...row(payload) })
    .select(TP_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as TpRow;
}

/** Met à jour un TP existant (l'identifiant ne change pas). */
export async function updateTp(id: string, payload: TpSavePayload): Promise<TpRow> {
  const supabase = createClient();
  const { data, error } = await supabase.from('tps').update(row(payload)).eq('id', id).select(TP_COLS).single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('TP introuvable ou non modifiable.');
  return data as TpRow;
}

/** Supprime un TP (les tentatives des élèves sont conservées : voir la migration 0007). */
export async function deleteTp(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tps').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Publie ou dépublie un TP. */
export async function setPublished(id: string, published: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tps').update({ published }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Validation humaine d'un TP généré : le professeur connecté engage sa responsabilité
 * pédagogique sur le contenu. Sans elle, la base refuse la publication (migration 0009).
 */
export async function validateTp(id: string): Promise<TpRow> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Session expirée : reconnectez-vous pour valider ce TP.');
  const { data, error } = await supabase
    .from('tps')
    .update({ validated_by: user.id, validated_at: new Date().toISOString() })
    .eq('id', id)
    .select(TP_COLS)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('TP introuvable ou non modifiable.');
  return data as TpRow;
}

/** Archive ou restaure un TP. */
export async function setArchived(id: string, archived: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tps').update({ archived }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** TP enregistrés en base, les plus récents d'abord (RLS : ses TP pour un professeur). */
export async function listMyTps(): Promise<TpRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('tps').select(TP_COLS).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TpRow[];
}

// ------------------------------------------------- lecture élève des TP du professeur

/** Identifiants des TP fournis avec l'application (parcours simulés). */
const BUNDLED_IDS = new Set(TPS.map((t) => t.id));

/** Le TP est-il l'un des TP fournis avec l'application ? */
export function isBundledTp(id: string): boolean {
  return BUNDLED_IDS.has(id);
}

/** TP publiés en base et rédigés par un professeur (les TP fournis sont exclus). */
export async function listTeacherTps(): Promise<TpRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tps')
    .select(TP_COLS)
    .eq('published', true)
    .order('title');
  if (error) throw new Error(error.message);
  return ((data ?? []) as TpRow[]).filter((t) => !isBundledTp(t.id) && !t.archived);
}

/** Une ligne `tps` par identifiant (null si absente). */
export async function getTpRow(id: string): Promise<TpRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('tps').select(TP_COLS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TpRow | null) ?? null;
}

/**
 * Contenu documentaire d'une ligne `tps`, quelle que soit l'écriture du champ `kind`
 * (`doc` des premières versions, `documentaire` de l'éditeur précédent).
 */
export function docDefinitionOf(row_: TpRow): TpDocDefinition | null {
  const def: Record<string, unknown> | null =
    row_.definition && typeof row_.definition === 'object' ? (row_.definition as Record<string, unknown>) : null;
  if (!def) return null;
  const kind = def.kind;
  if (kind !== 'doc' && kind !== 'documentaire') return null;
  const lignes = Array.isArray(def.cahierDesCharges) ? (def.cahierDesCharges as unknown[]) : [];
  const diploma = def.diploma;
  return {
    kind: 'documentaire',
    situation: typeof def.situation === 'string' ? def.situation : '',
    cahierDesCharges: lignes.filter(estLigne),
    quiz: [],
    diploma: isDiplomaId(diploma) ? diploma : null,
  };
}

function estLigne(l: unknown): l is { k: string; v: string } {
  if (!l || typeof l !== 'object') return false;
  const o = l as Record<string, unknown>;
  return typeof o.k === 'string' && typeof o.v === 'string';
}

/* ------------------------------------------------ relecture défensive de `definition` */

const NETS: NetKind[] = ['L1', 'L2', 'L3', 'N', 'PE', 'C', 'C0', 'DC+', 'DC-'];
const SCENES: SceneKind[] = ['ind', 'hab', 'ter', 'pv'];
const ANNEXES: AnnexKind[] = ['door', 'room', 'local', 'roof'];
const LIVES: TerminalNet['live'][] = ['always', 'q1', 'ctl', 'run', 'f2', 'f3', 'km1', 'off'];
const INSTRUMENTS: ExpectedMeasure['instrument'][] = ['mm', 'clamp', 'ctrl', 'vat', 'tach'];

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === 'string');

function readSlot(v: unknown): Slot | null {
  const o = obj(v);
  if (!o || typeof o.id !== 'string' || typeof o.key !== 'string') return null;
  const rail = typeof o.rail === 'number' && Number.isFinite(o.rail) ? o.rail : null;
  const slot: Slot = {
    id: o.id,
    label: str(o.label, o.id),
    key: o.key,
    rail,
    x: num(o.x, 52),
  };
  if (typeof o.y === 'number') slot.y = o.y;
  if (typeof o.w === 'number') slot.w = o.w;
  if (typeof o.h === 'number') slot.h = o.h;
  if (typeof o.rep === 'string') slot.rep = o.rep;
  if (typeof o.mark === 'string') slot.mark = o.mark;
  if (typeof o.sub === 'string') slot.sub = o.sub;
  if (typeof o.group === 'string') slot.group = o.group;
  if (typeof o.groupLabel === 'string') slot.groupLabel = o.groupLabel;
  return slot;
}

function readAnnexItem(v: unknown, recv: boolean): AnnexItem | null {
  const o = obj(v);
  if (!o || typeof o.key !== 'string') return null;
  return {
    key: o.key,
    rep: str(o.rep, 'E1'),
    name: str(o.name, o.key),
    x: num(o.x, 452),
    y: num(o.y, 40),
    w: num(o.w, 48),
    h: num(o.h, 48),
    ...(recv ? { recv: true } : {}),
  };
}

function readLiaison(v: unknown): Liaison | null {
  const o = obj(v);
  if (!o || typeof o.a !== 'string' || typeof o.b !== 'string') return null;
  const net = NETS.includes(o.net as NetKind) ? (o.net as NetKind) : 'L1';
  return { a: o.a, b: o.b, net, prewired: o.prewired === true, door: o.door === true };
}

function readPoste(v: unknown): Poste | null {
  const o = obj(v);
  if (!o || typeof o.id !== 'string') return null;
  const options: PosteOption[] = arr(o.options).flatMap((x) => {
    const p = obj(x);
    if (!p) return [];
    return [{
      ref: str(p.ref), spec: str(p.spec), why: str(p.why), key: str(p.key, 'mcb1p'),
      ...(p.ok === true ? { ok: true } : {}), ...(p.half === true ? { half: true } : {}),
    }];
  });
  if (options.length < 2) return null;
  return { id: o.id, name: str(o.name, o.id), need: str(o.need), options };
}

function readMesure(v: unknown): ExpectedMeasure | null {
  const o = obj(v);
  if (!o || typeof o.id !== 'string') return null;
  const stage = o.stage === 'sousTension' ? 'sousTension' : 'horsTension';
  const instrument = INSTRUMENTS.includes(o.instrument as ExpectedMeasure['instrument'])
    ? (o.instrument as ExpectedMeasure['instrument'])
    : 'mm';
  const m: ExpectedMeasure = {
    id: o.id,
    title: str(o.title, o.id),
    stage,
    instrument,
    dial: str(o.dial, 'V~'),
    min: num(o.min, 0),
    max: num(o.max, 0),
    unit: str(o.unit, 'V'),
  };
  if (typeof o.a === 'string') m.a = o.a;
  if (typeof o.b === 'string') m.b = o.b;
  if (typeof o.wire === 'string') m.wire = o.wire;
  if (o.when === 'run' || o.when === 'ctl' || o.when === 'off') m.when = o.when;
  return m;
}

function readTest(v: unknown): TestHorsTension | null {
  const o = obj(v);
  if (!o || typeof o.id !== 'string') return null;
  return { id: o.id, title: str(o.title, o.id), how: str(o.how), expected: str(o.expected) };
}

function readFault(v: unknown): Fault | null {
  const o = obj(v);
  if (!o || typeof o.id !== 'string') return null;
  return { id: o.id, title: str(o.title, o.id), symptom: str(o.symptom), fix: str(o.fix) };
}

function readNets(v: unknown): Record<string, TerminalNet> {
  const o = obj(v);
  if (!o) return {};
  const out: Record<string, TerminalNet> = {};
  for (const [k, raw] of Object.entries(o)) {
    const t = obj(raw);
    if (!t || typeof t.net !== 'string') continue;
    const live = LIVES.includes(t.live as TerminalNet['live']) ? (t.live as TerminalNet['live']) : 'always';
    out[k] = { net: t.net as TerminalNet['net'], live };
  }
  return out;
}

/** Métadonnées du studio d'une ligne (domaines et diplômes), tolérante aux TP anciens. */
export function studioMetaOf(row_: TpRow): TpStudioMeta {
  const def = obj(row_.definition);
  const meta = def ? obj(def.studio) : null;
  const diplomas = (Array.isArray(row_.diplomas) ? row_.diplomas : []).filter(isDiplomaId);
  return {
    version: 1,
    domains: strList(meta?.domains).filter((d): d is Domain => d in DOMAIN_LABEL),
    diplomas: diplomas.length ? diplomas : strList(meta?.diplomas).filter(isDiplomaId),
  };
}

/**
 * `TpDefinition` d'une ligne `tps`, ou `null` si la définition n'est pas un parcours
 * de platine exploitable. Toutes les valeurs sont revalidées : un champ manquant ou
 * d'un mauvais type reçoit une valeur de repli plutôt que de casser le parcours.
 */
export function rowToDefinition(row_: TpRow): TpDefinition | null {
  const def = obj(row_.definition);
  if (!def) return null;
  if (def.kind === 'doc' || def.kind === 'documentaire') return null;
  const slots = arr(def.slots).map(readSlot).filter((s): s is Slot => s !== null);
  if (slots.length === 0) return null;

  const family = SCENES.includes(row_.family as SceneKind)
    ? (row_.family as SceneKind)
    : SCENES.includes(def.family as SceneKind) ? (def.family as SceneKind) : 'ind';
  const scene = SCENES.includes(row_.scene as SceneKind)
    ? (row_.scene as SceneKind)
    : SCENES.includes(def.scene as SceneKind) ? (def.scene as SceneKind) : family;
  const annex = ANNEXES.includes(def.annex as AnnexKind) ? (def.annex as AnnexKind) : 'door';
  const rails = arr(def.rails).filter((r): r is number => typeof r === 'number' && Number.isFinite(r));
  const liaisons = arr(def.liaisons).map(readLiaison).filter((l): l is Liaison => l !== null);
  const mesures = arr(def.mesures).map(readMesure).filter((m): m is ExpectedMeasure => m !== null);

  const plaque: Record<string, string> = {};
  const p = obj(def.plaque);
  if (p) for (const [k, v] of Object.entries(p)) if (typeof v === 'string') plaque[k] = v;

  const motorObj = obj(def.motor);
  const motor = motorObj
    ? {
      P: num(motorObj.P, 1500), U: num(motorObj.U, 400), In: num(motorObj.In, 3.3),
      n: num(motorObj.n, 1440), ns: num(motorObj.ns, 1500), cosPhi: num(motorObj.cosPhi, 0.8),
    }
    : null;

  return {
    id: row_.id,
    title: row_.title || str(def.title, row_.id),
    level: row_.level ?? str(def.level, ''),
    family,
    kind: 'platine',
    scene,
    annex,
    playable: row_.playable === true && liaisons.length > 0,
    competences: Array.isArray(row_.competences) ? row_.competences : strList(def.competences),
    summary: row_.summary ?? str(def.summary),
    situation: str(def.situation),
    plaque,
    cahierDesCharges: arr(def.cahierDesCharges).filter(estLigne).map((l) => ({ k: l.k, v: l.v })),
    postes: arr(def.postes).map(readPoste).filter((x): x is Poste => x !== null),
    rails: rails.length ? rails : [150, 346, 542],
    slots,
    annexItems: arr(def.annexItems).map((v) => readAnnexItem(v, false)).filter((x): x is AnnexItem => x !== null),
    recvItems: arr(def.recvItems).map((v) => readAnnexItem(v, true)).filter((x): x is AnnexItem => x !== null),
    liaisons,
    nets: readNets(def.nets),
    tests: arr(def.tests).map(readTest).filter((x): x is TestHorsTension => x !== null),
    mesures,
    faults: arr(def.faults).map(readFault).filter((x): x is Fault => x !== null),
    quiz: arr(def.quiz).flatMap((q) => {
      const o = obj(q);
      if (!o || typeof o.q !== 'string') return [];
      const options = strList(o.options);
      if (options.length < 2) return [];
      return [{ q: o.q, options, answer: Math.max(0, Math.min(options.length - 1, num(o.answer, 0))) }];
    }),
    motor,
    station: def.station === true,
    hasMotor: def.hasMotor === true,
  };
}
