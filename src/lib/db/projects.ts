'use client';

/**
 * Montages de l'atelier libre (table `projects`, migration 0002_projects.sql).
 *
 * Tolérant hors-ligne : sans session Supabase (mode démo `NEXT_PUBLIC_DEMO_MODE=1`)
 * ou en cas d'erreur réseau, les montages sont lus / écrits dans `localStorage`
 * sous la clé `simulelec.projects`. L'API reste identique dans les deux cas.
 */
import { createClient } from '@/lib/supabase/client';
import type { FreeProject, SceneKind } from '@/lib/types';

export interface ProjectRow {
  id: string;
  owner: string;
  title: string;
  scene: SceneKind;
  data: FreeProject;
  class_id: string | null;
  shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  title: string;
  scene: SceneKind;
  data: FreeProject;
}

export type ProjectPatch = Partial<ProjectInput> & { shared?: boolean; class_id?: string | null };

/** Colonnes lues systématiquement. */
const COLS = 'id, owner, title, scene, data, class_id, shared, created_at, updated_at';

export const LOCAL_KEY = 'simulelec.projects';
const LOCAL_OWNER = 'local';

/* ------------------------------------------------------------ localStorage */

function readLocal(): ProjectRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectRow[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: ProjectRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch {
    /* quota / navigation privée : on ignore, le montage reste en mémoire */
  }
}

function newId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Identifiant de l'élève connecté, ou `null` (démo / hors-ligne). */
async function currentUser(): Promise<string | null> {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------- API */

/** Mes montages, du plus récent au plus ancien. */
export async function listMyProjects(): Promise<ProjectRow[]> {
  const uid = await currentUser();
  if (!uid) return readLocal().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  try {
    const { data, error } = await createClient()
      .from('projects')
      .select(COLS)
      .eq('owner', uid)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProjectRow[];
  } catch {
    return readLocal().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
}

/** Un montage par son identifiant (le mien, ou celui d'un camarade s'il est partagé). */
export async function getProject(id: string): Promise<ProjectRow | null> {
  const local = readLocal().find((p) => p.id === id) ?? null;
  const uid = await currentUser();
  if (!uid) return local;
  try {
    const { data, error } = await createClient()
      .from('projects')
      .select(COLS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as unknown as ProjectRow | null) ?? local;
  } catch {
    return local;
  }
}

export async function createProject(input: ProjectInput): Promise<ProjectRow> {
  const uid = await currentUser();
  const now = new Date().toISOString();
  const fallback = (): ProjectRow => {
    const row: ProjectRow = {
      id: newId(),
      owner: uid ?? LOCAL_OWNER,
      title: input.title,
      scene: input.scene,
      data: input.data,
      class_id: null,
      shared: false,
      created_at: now,
      updated_at: now,
    };
    writeLocal([row, ...readLocal()]);
    return row;
  };
  if (!uid) return fallback();
  try {
    const { data, error } = await createClient()
      .from('projects')
      .insert({ owner: uid, title: input.title, scene: input.scene, data: input.data })
      .select(COLS)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as ProjectRow;
  } catch {
    return fallback();
  }
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<ProjectRow | null> {
  const now = new Date().toISOString();
  const fallback = (): ProjectRow | null => {
    const rows = readLocal();
    const i = rows.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const row: ProjectRow = { ...rows[i], ...patch, updated_at: now };
    rows[i] = row;
    writeLocal(rows);
    return row;
  };
  const uid = await currentUser();
  if (!uid) return fallback();
  try {
    const { data, error } = await createClient()
      .from('projects')
      .update({ ...patch, updated_at: now })
      .eq('id', id)
      .select(COLS)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as unknown as ProjectRow | null) ?? fallback();
  } catch {
    return fallback();
  }
}

export async function deleteProject(id: string): Promise<void> {
  const dropLocal = () => writeLocal(readLocal().filter((p) => p.id !== id));
  const uid = await currentUser();
  if (!uid) { dropLocal(); return; }
  try {
    const { error } = await createClient().from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    dropLocal();
  } catch {
    dropLocal();
  }
}

/** Partage (ou retire le partage) d'un montage à une classe. */
export async function shareProject(id: string, classId: string | null): Promise<ProjectRow | null> {
  return updateProject(id, { class_id: classId, shared: classId !== null });
}
