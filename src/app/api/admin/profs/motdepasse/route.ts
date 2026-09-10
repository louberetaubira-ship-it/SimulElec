/**
 * Création / réinitialisation d'un accès enseignant par mot de passe (administrateur uniquement).
 *
 * Permet à une adresse inscrite dans la liste blanche — quelle qu'en soit la messagerie
 * (Gmail, académique…) — de se connecter avec e-mail + mot de passe, sans dépendre de Google.
 * Le mot de passe temporaire n'est renvoyé qu'une seule fois : l'administrateur le transmet
 * à la personne, qui pourra le changer ensuite.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireAdmin, requireServiceRole } from '@/lib/api/auth';
import { generatePassword } from '@/lib/eleves';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** Retrouve l'identifiant d'un compte d'authentification par e-mail (pagination défensive). */
async function findAuthUserId(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const users = (data?.users ?? []) as Array<{ id: string; email: string | null }>;
    const hit = users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (hit) return hit.id;
    if (users.length < 200) break;
  }
  return null;
}

/** POST {email} → { email, password, created } : crée le compte enseignant ou réinitialise son mot de passe. */
export async function POST(request: NextRequest) {
  const caller = await requireAdmin();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { email?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const email = normalizeEmail(body.email);
  if (!email) return fail('Adresse électronique manquante.', 400);

  const admin = createAdminClient();

  // L'adresse doit figurer dans la liste blanche : le trigger `handle_new_user` y lit le rôle.
  const { data: allow, error: allowError } = await admin
    .from('teacher_allowlist')
    .select('email, role')
    .eq('email', email)
    .maybeSingle();
  if (allowError) return fail('Lecture de la liste blanche impossible : ' + allowError.message, 500);
  if (!allow) return fail("Cette adresse n'est pas dans la liste blanche. Ajoutez-la d'abord.", 404);

  const password = generatePassword();

  // Compte déjà existant ? Le profil créé par le trigger porte le même identifiant que le compte auth.
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  let userId = (profile as { id: string } | null)?.id ?? null;
  if (!userId) userId = await findAuthUserId(admin, email);

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) return fail('Réinitialisation impossible : ' + error.message, 500);
    return NextResponse.json({ email, password, created: false });
  }

  // Création : aucun `role` dans les métadonnées → le trigger applique le rôle de la liste blanche
  // (professeur/admin) et marque le profil comme `onboarded`.
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    // Course : le compte existe déjà côté auth mais le profil n'était pas encore lisible.
    const existing = await findAuthUserId(admin, email);
    if (existing) {
      const { error: retryError } = await admin.auth.admin.updateUserById(existing, {
        password,
        email_confirm: true,
      });
      if (retryError) return fail('Réinitialisation impossible : ' + retryError.message, 500);
      return NextResponse.json({ email, password, created: false });
    }
    return fail('Création du compte impossible : ' + error.message, 500);
  }

  return NextResponse.json({ email, password, created: true });
}
