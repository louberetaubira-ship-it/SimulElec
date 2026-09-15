/**
 * Modification d'un élève par son professeur (ou l'administrateur) :
 * nom affiché et identifiant de connexion.
 *
 * Pourquoi une route serveur alors que la RLS autoriserait la mise à jour depuis
 * le navigateur : l'identifiant de l'élève n'est pas une simple étiquette. Il est
 * adossé à une adresse technique `nom.prenom@<classe>.simulelec.local` qui vit
 * dans `auth.users`, hors de portée de la RLS. Changer l'un sans l'autre laisse
 * un compte dont l'identifiant affiché au professeur n'est plus celui du compte
 * d'authentification — donc une seule route, qui les déplace ensemble.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireServiceRole, requireTeacher } from '@/lib/api/auth';
import { requireOwnStudent } from '@/lib/api/eleves';
import { classSlug, emailFor, normalizeLogin, slugName } from '@/lib/eleves';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Code d'erreur Postgres « violation de contrainte d'unicité ». */
const UNIQUE_VIOLATION = '23505';

/** Le message montré au professeur quand l'identifiant est déjà pris. */
function dejaPris(login: string): NextResponse {
  return fail(
    `L’identifiant « ${login} » est déjà utilisé par un autre compte. `
      + `Choisissez-en un autre, par exemple « ${login}2 ».`,
    409,
  );
}

/** Le domaine technique déjà utilisé par ce compte, pour ne pas le changer inutilement. */
function domaineDe(email: string | null): string | null {
  const at = email?.indexOf('@') ?? -1;
  return at > 0 && email ? email.slice(at + 1) : null;
}

/** POST {student_id, first_name, last_name, login} → { login, first_name, last_name, full_name }. */
export async function POST(request: NextRequest) {
  const caller = await requireTeacher();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { student_id?: unknown; first_name?: unknown; last_name?: unknown; login?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const studentId = typeof body.student_id === 'string' ? body.student_id.trim() : '';
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  const login = normalizeLogin(typeof body.login === 'string' ? body.login : '');

  if (!slugName(lastName) || !slugName(firstName)) {
    return fail('Le nom et le prénom sont obligatoires.', 400);
  }
  if (login.length < 3) {
    return fail('L’identifiant doit comporter au moins trois caractères (lettres et chiffres).', 400);
  }

  const admin = createAdminClient();
  const student = await requireOwnStudent(admin, caller, studentId);
  if (student instanceof NextResponse) return student;

  const fullName = `${firstName} ${lastName}`.trim();
  const changeLogin = login !== student.login;

  // Doublon annoncé AVANT d'écrire quoi que ce soit : le professeur doit lire une
  // phrase, pas le texte brut d'une violation d'index Postgres.
  if (changeLogin) {
    const { data: taken, error: takenError } = await admin
      .from('profiles')
      .select('id')
      .eq('login', login)
      .neq('id', student.id)
      .maybeSingle();
    if (takenError) return fail('Vérification de l’identifiant impossible : ' + takenError.message, 500);
    if (taken) return dejaPris(login);
  }

  // Adresse technique : elle suit l'identifiant, en gardant le domaine de classe
  // déjà attribué au compte (le sien, sinon celui déduit de sa classe).
  let email = student.email;
  if (changeLogin) {
    let domaine = domaineDe(student.email);
    if (!domaine && student.class_id) {
      const { data: klass } = await admin
        .from('classes').select('name').eq('id', student.class_id).maybeSingle();
      const nom = (klass as { name: string } | null)?.name;
      if (nom) domaine = `${classSlug(nom)}.simulelec.local`;
    }
    email = emailFor(login, (domaine ?? 'classe.simulelec.local').replace(/\.simulelec\.local$/, ''));

    const { error: authError } = await admin.auth.admin.updateUserById(student.id, {
      email,
      email_confirm: true,
      user_metadata: { login, first_name: firstName, last_name: lastName },
    });
    if (authError) {
      if (/already|exists|duplicate|registered/i.test(authError.message)) return dejaPris(login);
      return fail('Modification du compte impossible : ' + authError.message, 500);
    }
  }

  const { error } = await admin
    .from('profiles')
    .update({ login, email, first_name: firstName, last_name: lastName, full_name: fullName })
    .eq('id', student.id);
  if (error) {
    // Course entre deux professeurs : l'index a tranché pendant qu'on écrivait.
    if (error.code === UNIQUE_VIOLATION) return dejaPris(login);
    return fail('Modification impossible : ' + error.message, 500);
  }

  return NextResponse.json({ login, first_name: firstName, last_name: lastName, full_name: fullName });
}
