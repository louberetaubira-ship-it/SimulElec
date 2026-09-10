/**
 * Résolution d'un identifiant élève (`nom.prenom`) en adresse technique.
 * La connexion elle-même reste côté client (`supabase.auth.signInWithPassword`) : cette route
 * ne vérifie pas le mot de passe, elle se contente de retrouver l'adresse à utiliser.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireServiceRole } from '@/lib/api/auth';
import { classSlug, emailFor, slugName } from '@/lib/eleves';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Message neutre : on ne révèle jamais si l'identifiant existe. */
const NEUTRE = 'Identifiant ou mot de passe incorrect.';

/** POST {login, password} → { email, login }. */
export async function POST(request: NextRequest) {
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { login?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const raw = typeof body.login === 'string' ? body.login.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!raw || !password) return fail('Saisis ton identifiant et ton mot de passe.', 400);

  // Tolérance de saisie : accents, espaces et majuscules sont normalisés autour du point.
  const parts = raw.split('.');
  const login = parts.length >= 2
    ? `${slugName(parts[0])}.${parts.slice(1).map(slugName).join('')}`
    : slugName(raw);
  if (!login) return fail(NEUTRE, 401);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, login, class_id, role')
    .eq('login', login)
    .maybeSingle();
  if (error) return fail('Connexion impossible pour le moment.', 500);

  const row = data as {
    id: string; email: string | null; login: string | null; class_id: string | null; role: string;
  } | null;
  if (!row || row.role !== 'eleve') return fail(NEUTRE, 404);

  if (row.email) return NextResponse.json({ email: row.email, login });

  // Profil sans adresse enregistrée : on la reconstruit depuis la classe.
  if (!row.class_id) return fail(NEUTRE, 404);
  const { data: klass } = await admin.from('classes').select('name').eq('id', row.class_id).maybeSingle();
  const name = (klass as { name: string } | null)?.name;
  if (!name) return fail(NEUTRE, 404);
  return NextResponse.json({ email: emailFor(login, classSlug(name)), login });
}
