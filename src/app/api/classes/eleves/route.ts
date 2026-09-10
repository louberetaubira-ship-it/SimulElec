/**
 * Création d'un compte élève par le professeur de la classe (ou l'administrateur).
 * L'élève reçoit un identifiant `nom.prenom` et un mot de passe ; l'adresse électronique
 * est technique et interne.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireServiceRole, requireTeacher } from '@/lib/api/auth';
import { classSlug, emailFor, generatePassword, loginFor, slugName } from '@/lib/eleves';
import type { DiplomaId } from '@/lib/data/competences';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ClassLite {
  id: string;
  name: string;
  diploma: DiplomaId | null;
  teacher_id: string;
}

/** POST {class_id, last_name, first_name} → { login, password }. */
export async function POST(request: NextRequest) {
  const caller = await requireTeacher();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { class_id?: unknown; last_name?: unknown; first_name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const classId = typeof body.class_id === 'string' ? body.class_id.trim() : '';
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  if (!classId) return fail('Classe manquante.', 400);
  if (!slugName(lastName) || !slugName(firstName)) {
    return fail('Le nom et le prénom sont obligatoires.', 400);
  }

  const admin = createAdminClient();
  const { data: klass, error: classError } = await admin
    .from('classes')
    .select('id, name, diploma, teacher_id')
    .eq('id', classId)
    .maybeSingle();
  if (classError) return fail('Classe introuvable : ' + classError.message, 500);
  const row = klass as ClassLite | null;
  if (!row) return fail('Classe introuvable.', 404);
  if (caller.role !== 'admin' && row.teacher_id !== caller.id) {
    return fail('Cette classe ne vous appartient pas.', 403);
  }

  // Identifiant unique : nom.prenom, puis nom.prenom2, nom.prenom3…
  const base = loginFor(lastName, firstName);
  let login = base;
  for (let n = 2; n < 100; n += 1) {
    const { data: taken } = await admin.from('profiles').select('id').eq('login', login).maybeSingle();
    if (!taken) break;
    login = `${base}${n}`;
  }

  const password = generatePassword();
  const email = emailFor(login, classSlug(row.name));

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'eleve',
      class_id: row.id,
      diploma: row.diploma ?? '',
      login,
      first_name: firstName,
      last_name: lastName,
      created_by: caller.id,
    },
  });
  if (error) {
    const already = /already|exists|duplicate/i.test(error.message);
    return fail(
      already ? 'Un compte existe déjà pour cet élève.' : 'Création du compte impossible : ' + error.message,
      already ? 409 : 500,
    );
  }

  return NextResponse.json({
    login,
    password,
    student_id: created.user?.id ?? null,
    first_name: firstName,
    last_name: lastName,
  });
}
