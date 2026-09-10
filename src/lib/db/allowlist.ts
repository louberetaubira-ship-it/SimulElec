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

/** Identifiants renvoyés une seule fois après création/réinitialisation d'un accès enseignant. */
export interface TeacherCredential {
  email: string;
  password: string;
  created: boolean;
}

/**
 * Crée l'accès e-mail + mot de passe d'un enseignant autorisé (ou réinitialise son mot de passe).
 * Le mot de passe n'est renvoyé qu'une fois : il faut le transmettre à la personne.
 */
export async function resetTeacherPassword(email: string): Promise<TeacherCredential> {
  const response = await fetch('/api/admin/profs/motdepasse', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return readJson<TeacherCredential>(response);
}
