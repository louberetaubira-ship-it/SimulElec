/**
 * Suppression DÉFINITIVE d'un compte prof/élève (administrateur uniquement).
 *
 * Efface toute trace de la personne : son profil (`profiles`, avec les cascades
 * de la base — classes, tentatives, présence…), son compte de connexion (Auth),
 * et son inscription dans la liste blanche (pour qu'elle ne puisse pas se
 * réinscrire). Action irréversible : l'interface impose un double verrou avant
 * de l'appeler, et le serveur revérifie les garde-fous ci-dessous.
 *
 * Garde-fous serveur (indépendants de l'interface) :
 *  - on ne supprime pas son propre compte ;
 *  - on ne supprime pas un administrateur (l'établissement n'en a qu'un).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireAdmin, requireServiceRole, type Role } from '@/lib/api/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TargetRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
}

/** POST {id} — supprime définitivement le compte désigné et tout ce qui en dépend. */
export async function POST(request: NextRequest) {
  const caller = await requireAdmin();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Identifiant du compte manquant.', 400);
  if (id === caller.id) return fail('Vous ne pouvez pas supprimer votre propre compte.', 400);

  const admin = createAdminClient();

  const { data, error: lireError } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', id)
    .maybeSingle();
  if (lireError) return fail('Lecture du compte impossible : ' + lireError.message, 500);
  const cible = data as TargetRow | null;
  if (!cible) return fail('Ce compte n’existe pas (déjà supprimé ?).', 404);
  if (cible.role === 'admin') return fail('Un compte administrateur ne peut pas être supprimé.', 400);

  // 1) Liste blanche : on retire l'adresse (référence OU adresse Google) pour
  //    interdire toute réinscription silencieuse.
  if (cible.email) {
    const mail = cible.email.toLowerCase();
    await admin.from('teacher_allowlist').delete().or(`email.eq.${mail},google_email.eq.${mail}`);
  }

  // 2) Profil : la suppression déclenche les cascades de la base (classes de ce
  //    professeur, tentatives/mesures/messages d'un élève, présence, projets…).
  const { error: profilError } = await admin.from('profiles').delete().eq('id', id);
  if (profilError) return fail('Suppression du profil impossible : ' + profilError.message, 500);

  // 3) Compte de connexion (Auth) : plus aucun accès possible. Un compte auth
  //    déjà absent n'est pas une erreur (le profil, lui, est bien parti).
  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError && !/not found/i.test(authError.message)) {
    return fail('Compte de connexion non supprimé : ' + authError.message, 500);
  }

  return NextResponse.json({ ok: true, deleted: { id: cible.id, full_name: cible.full_name, email: cible.email } });
}
