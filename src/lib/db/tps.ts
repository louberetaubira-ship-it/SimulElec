'use client';

import { createClient } from '@/lib/supabase/client';
import { TPS } from '@/lib/data/tps';
import type { TpDefinition } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
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

// ------------------------------------------------------- TP rédigés par le professeur

/** Familles pédagogiques d'un TP. */
export type TpFamily = 'ind' | 'hab' | 'ter' | 'pv';

export const FAMILIES: { id: TpFamily; label: string }[] = [
  { id: 'ind', label: 'Industriel' },
  { id: 'hab', label: 'Habitat' },
  { id: 'ter', label: 'Tertiaire' },
  { id: 'pv', label: 'Photovoltaïque' },
];

/** Contenu d'un TP documentaire : énoncé, cahier des charges, quiz éventuel. */
export interface TpDocDefinition extends Record<string, unknown> {
  kind: 'documentaire';
  situation: string;
  cahierDesCharges: { k: string; v: string }[];
  quiz: { q: string; options: string[]; answer: number }[];
  diploma: DiplomaId | null;
}

/** Saisie de l'éditeur de TP. */
export interface TpDraft {
  title: string;
  level: string;
  family: TpFamily;
  summary: string;
  situation: string;
  cahierDesCharges: { k: string; v: string }[];
  competences: string[];
  diploma: DiplomaId | null;
  published: boolean;
}

/** Ligne complète de la table `tps`. */
export interface TpRow {
  id: string;
  title: string;
  level: string | null;
  competences: string[];
  summary: string | null;
  definition: TpDocDefinition | Record<string, unknown>;
  published: boolean;
  family: TpFamily | null;
  scene: string | null;
  playable: boolean;
}

const TP_COLS = 'id, title, level, competences, summary, definition, published, family, scene, playable';

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

function payload(draft: TpDraft) {
  const definition: TpDocDefinition = {
    kind: 'documentaire',
    situation: draft.situation,
    cahierDesCharges: draft.cahierDesCharges.filter((r) => r.k.trim() || r.v.trim()),
    quiz: [],
    diploma: draft.diploma,
  };
  return {
    title: draft.title.trim(),
    level: draft.level.trim() || null,
    competences: draft.competences,
    summary: draft.summary.trim() || null,
    definition,
    published: draft.published,
    family: draft.family,
    scene: draft.family,
    // Les TP rédigés dans l'éditeur sont documentaires : le câblage interactif
    // reste réservé aux TP fournis avec l'application.
    playable: false,
  };
}

/** Crée un TP documentaire ; l'identifiant est le slug du titre. */
export async function createTp(draft: TpDraft): Promise<TpRow> {
  const supabase = createClient();
  const id = slugifyTitle(draft.title);
  if (!id) throw new Error('Le titre est obligatoire.');
  const { data: taken } = await supabase.from('tps').select('id').eq('id', id).maybeSingle();
  if (taken) throw new Error('Un TP porte déjà ce titre : choisis-en un autre.');
  const { data, error } = await supabase
    .from('tps')
    .insert({ id, ...payload(draft) })
    .select(TP_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as TpRow;
}

/** Met à jour un TP existant (l'identifiant ne change pas). */
export async function updateTp(id: string, draft: TpDraft): Promise<TpRow> {
  const supabase = createClient();
  const { data, error } = await supabase.from('tps').update(payload(draft)).eq('id', id).select(TP_COLS).single();
  if (error) throw new Error(error.message);
  return data as TpRow;
}

/**
 * TP enregistrés en base (la table ne porte pas d'auteur : ce sont les TP de l'établissement),
 * les plus récents d'abord.
 */
export async function listMyTps(): Promise<TpRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('tps').select(TP_COLS).order('title');
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
  const { data, error } = await supabase.from('tps').select(TP_COLS).eq('published', true).order('title');
  if (error) throw new Error(error.message);
  return ((data ?? []) as TpRow[]).filter((t) => !isBundledTp(t.id));
}

/** Une ligne `tps` par identifiant (null si absente ou non publiée pour l'élève). */
export async function getTpRow(id: string): Promise<TpRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('tps').select(TP_COLS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TpRow | null) ?? null;
}

/**
 * Contenu documentaire d'une ligne `tps`, quelle que soit l'écriture du champ `kind`
 * (`doc` des premières versions, `documentaire` de l'éditeur actuel).
 */
export function docDefinitionOf(row: TpRow): TpDocDefinition | null {
  const def: Record<string, unknown> | null =
    row.definition && typeof row.definition === 'object' ? (row.definition as Record<string, unknown>) : null;
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
