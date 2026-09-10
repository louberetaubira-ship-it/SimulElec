/**
 * Réinitialisation du mot de passe d'un élève par son professeur (ou l'administrateur).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireServiceRole, requireTeacher } from '@/lib/api/auth';
import { generatePassword } from '@/lib/eleves';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StudentLite {
  id: string;
  login: string | null;
  class_id: string | null;
  role: 'eleve' | 'professeur' | 'admin';
}

/** POST {student_id} → { login, password }. */
export async function POST(request: NextRequest) {
  const caller = await requireTeacher();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { student_id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }
  const studentId = typeof body.student_id === 'string' ? body.student_id.trim() : '';
  if (!studentId) return fail('Élève manquant.', 400);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, login, class_id, role')
    .eq('id', studentId)
    .maybeSingle();
  if (error) return fail('Élève introuvable : ' + error.message, 500);
  const student = data as StudentLite | null;
  if (!student || student.role !== 'eleve') return fail('Élève introuvable.', 404);

  if (caller.role !== 'admin') {
    if (!student.class_id) return fail('Cet élève n’appartient à aucune de vos classes.', 403);
    const { data: klass } = await admin
      .from('classes')
      .select('id, teacher_id')
      .eq('id', student.class_id)
      .maybeSingle();
    const owner = (klass as { teacher_id: string } | null)?.teacher_id;
    if (owner !== caller.id) return fail('Cet élève n’appartient à aucune de vos classes.', 403);
  }

  const password = generatePassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(studentId, { password });
  if (updateError) return fail('Modification impossible : ' + updateError.message, 500);

  // Le SDK n'expose pas de déconnexion globale par identifiant d'utilisateur : les jetons
  // d'actualisation existants sont invalidés par le changement de mot de passe côté GoTrue.

  return NextResponse.json({ login: student.login, password });
}
