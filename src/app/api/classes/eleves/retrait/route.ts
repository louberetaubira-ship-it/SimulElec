/**
 * Retrait d'un élève de la classe par son professeur (ou l'administrateur).
 *
 * Trois modes, et un seul détruit quelque chose :
 *
 *   • `retrait`       — l'élève sort des listes actives et ne peut plus se
 *                       connecter ; ses tentatives, ses mesures et ses notes
 *                       restent en base et restent lisibles par le professeur.
 *   • `reintegration` — l'inverse, à l'identique.
 *   • `definitif`     — le compte est réellement supprimé. Les clés étrangères
 *                       sont en cascade (profiles → attempts → measurements,
 *                       messages) : la route REFUSE donc dès qu'une tentative
 *                       existe, plutôt que d'effacer une notation sur la foi
 *                       d'un clic. Un élève qui a travaillé se retire, il ne se
 *                       supprime pas.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireServiceRole, requireTeacher } from '@/lib/api/auth';
import { requireOwnStudent } from '@/lib/api/eleves';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Durée du blocage de session : cent ans.
 *
 * GoTrue ne connaît qu'une suspension à durée déterminée, pas de « compte
 * désactivé » définitif. Une durée aussi longue vaut désactivation, tout en
 * restant levable d'un seul appel le jour où l'élève revient.
 */
const BLOCAGE = '876000h';

type Mode = 'retrait' | 'reintegration' | 'definitif';

/** POST {student_id, mode} → { mode, archived } ou { mode:'definitif', deleted:true }. */
export async function POST(request: NextRequest) {
  const caller = await requireTeacher();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { student_id?: unknown; mode?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const studentId = typeof body.student_id === 'string' ? body.student_id.trim() : '';
  const mode = body.mode as Mode;
  if (mode !== 'retrait' && mode !== 'reintegration' && mode !== 'definitif') {
    return fail('Action inconnue.', 400);
  }

  const admin = createAdminClient();
  const student = await requireOwnStudent(admin, caller, studentId);
  if (student instanceof NextResponse) return student;

  if (mode === 'definitif') {
    // Le garde-fou est ici, pas dans l'interface : une requête forgée doit se
    // heurter au même refus qu'un bouton grisé.
    const { count, error: countError } = await admin
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id);
    if (countError) return fail('Vérification impossible : ' + countError.message, 500);
    if ((count ?? 0) > 0) {
      return fail(
        `Cet élève a ${count} tentative${(count ?? 0) > 1 ? 's' : ''} enregistrée${(count ?? 0) > 1 ? 's' : ''} : `
          + 'la suppression définitive effacerait ses notes et ses mesures. Retirez-le de la classe à la place.',
        409,
      );
    }

    const { error } = await admin.auth.admin.deleteUser(student.id);
    if (error) return fail('Suppression impossible : ' + error.message, 500);
    return NextResponse.json({ mode, deleted: true });
  }

  const archived = mode === 'retrait';

  // L'ordre compte : on coupe la connexion d'abord. Si la seconde écriture
  // échoue, l'élève apparaît encore dans la liste mais n'entre déjà plus —
  // l'inverse laisserait un compte « retiré » toujours capable de se connecter.
  const { error: authError } = await admin.auth.admin.updateUserById(student.id, {
    ban_duration: archived ? BLOCAGE : 'none',
  });
  if (authError) return fail('Blocage du compte impossible : ' + authError.message, 500);

  const { error } = await admin.from('profiles').update({ archived }).eq('id', student.id);
  if (error) return fail('Mise à jour impossible : ' + error.message, 500);

  return NextResponse.json({ mode, archived });
}
