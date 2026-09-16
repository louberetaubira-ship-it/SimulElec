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

/** Compte professeur/admin réellement existant, avec le repère « dans la liste blanche ou non ». */
export interface TeacherAccount {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'professeur' | 'admin';
  last_seen_at: string | null;
  login: string | null;
  /** false = compte existant mais absent de la liste blanche (à régulariser). */
  inAllowlist: boolean;
}

/** Tous les comptes prof/admin existants (administrateur uniquement). */
export async function listTeacherAccounts(): Promise<TeacherAccount[]> {
  const response = await fetch('/api/admin/profs', { cache: 'no-store' });
  const { teachers } = await readJson<{ teachers: TeacherAccount[] }>(response);
  return teachers;
}

/**
 * Autorise une personne. `email` est son identité de référence — celle qui porte
 * le mot de passe ; `googleEmail`, facultative, laisse en plus passer la
 * connexion Google.
 */
export async function addTeacher(
  email: string,
  fullName?: string,
  role: 'professeur' | 'admin' = 'professeur',
  googleEmail?: string,
): Promise<TeacherAllowRow> {
  const response = await fetch('/api/admin/profs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, google_email: googleEmail ?? null, full_name: fullName ?? null, role }),
  });
  const { prof } = await readJson<{ prof: TeacherAllowRow }>(response);
  return prof;
}

/** Retire une adresse de la liste blanche. */
export async function removeTeacher(email: string): Promise<void> {
  const response = await fetch(`/api/admin/profs?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
  await readJson<{ ok: boolean }>(response);
}

/**
 * Supprime DÉFINITIVEMENT un compte (profil + connexion Auth + liste blanche),
 * avec ses cascades en base. Irréversible — l'interface impose un double verrou.
 */
export async function deleteTeacherAccount(id: string): Promise<void> {
  const response = await fetch('/api/admin/profs/supprimer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  await readJson<{ ok: boolean }>(response);
}
