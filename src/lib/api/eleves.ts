/**
 * Garde commune aux routes qui agissent sur UN élève (serveur uniquement).
 *
 * Ces routes travaillent avec la clé de service, qui contourne la RLS : la
 * vérification « cet élève est-il dans une de MES classes ? » ne peut donc pas
 * être déléguée à Postgres, elle doit être écrite ici. Elle reproduit exactement
 * le prédicat de la politique `profiles teacher update` (migration 0005) :
 * le professeur passe par `profiles.class_id → classes.teacher_id`,
 * l'administrateur passe partout.
 */
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fail, type Caller } from './auth';

/** Ce qu'une route a besoin de savoir d'un élève avant d'agir sur son compte. */
export interface StudentLite {
  id: string;
  login: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  class_id: string | null;
  role: 'eleve' | 'professeur' | 'admin';
  archived: boolean;
}

const STUDENT_COLS = 'id, login, email, first_name, last_name, class_id, role, archived';

/** Message unique : ne pas distinguer « n'existe pas » de « pas à vous ». */
const ETRANGER = 'Cet élève n’appartient à aucune de vos classes.';

/**
 * Charge l'élève et vérifie que l'appelant a le droit d'agir sur son compte.
 * @returns l'élève, ou une réponse d'erreur prête à être renvoyée.
 */
export async function requireOwnStudent(
  admin: SupabaseClient,
  caller: Caller,
  studentId: string,
): Promise<StudentLite | NextResponse> {
  if (!studentId) return fail('Élève manquant.', 400);

  const { data, error } = await admin
    .from('profiles')
    .select(STUDENT_COLS)
    .eq('id', studentId)
    .maybeSingle();
  if (error) return fail('Élève introuvable : ' + error.message, 500);

  const student = data as StudentLite | null;
  // Un compte professeur ou administrateur n'est jamais « un élève de la classe » :
  // on refuse avant même de regarder à qui appartient la classe.
  if (!student || student.role !== 'eleve') return fail('Élève introuvable.', 404);
  if (caller.role === 'admin') return student;

  if (!student.class_id) return fail(ETRANGER, 403);
  const { data: klass } = await admin
    .from('classes')
    .select('teacher_id')
    .eq('id', student.class_id)
    .maybeSingle();
  const owner = (klass as { teacher_id: string } | null)?.teacher_id;
  if (owner !== caller.id) return fail(ETRANGER, 403);

  return student;
}
