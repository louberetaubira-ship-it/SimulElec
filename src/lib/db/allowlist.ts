'use client';

import type { ProfileRow, TeacherAllowRow } from './types';

/** Ligne de la liste blanche enrichie du profil existant, si le professeur s'est déjà connecté. */
export interface TeacherAllowEntry extends TeacherAllowRow {
  profile: Pick<ProfileRow, 'id' | 'email' | 'full_name' | 'role' | 'last_seen_at'> | null;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Opération impossible.');
  if (!payload) throw new Error('Réponse illisible du serveur.');
  return payload;
}

/** Liste blanche complète (administrateur uniquement). */
export async function listAllowlist(): Promise<TeacherAllowEntry[]> {
  const response = await fetch('/api/admin/profs', { cache: 'no-store' });
  const { profs } = await readJson<{ profs: TeacherAllowEntry[] }>(response);
  return profs;
}

/** Autorise une adresse à se connecter avec Google. */
export async function addTeacher(
  email: string,
  fullName?: string,
  role: 'professeur' | 'admin' = 'professeur',
): Promise<TeacherAllowRow> {
  const response = await fetch('/api/admin/profs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, full_name: fullName ?? null, role }),
  });
  const { prof } = await readJson<{ prof: TeacherAllowRow }>(response);
  return prof;
}

/** Retire une adresse de la liste blanche. */
export async function removeTeacher(email: string): Promise<void> {
  const response = await fetch(`/api/admin/profs?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
  await readJson<{ ok: boolean }>(response);
}
