'use client';

import { createClient } from '@/lib/supabase/client';
import type { DiplomaId } from '@/lib/data/competences';
import type { EvaluationMode } from '@/lib/types';
import type { AttemptRow, ClassRow, ProfileRow } from './types';

/** Colonnes d'une classe (migration 0005 comprise). */
const CLASS_COLS = 'id, name, level, teacher_id, join_code, diploma, archived';

export type StudentBrief = Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'avatar_url' | 'class_id'>;

/** An attempt joined with its student, for the teacher dashboard. */
export interface AttemptWithStudent extends AttemptRow {
  student: StudentBrief;
}

export interface AssignmentRow {
  id: string;
  class_id: string;
  tp_id: string;
  due_at: string | null;
  created_at: string;
  /** Mode imposé à la classe pour ce TP (migration 0008) ; null = l'élève choisit. */
  mode: EvaluationMode | null;
}

/** Crée une classe ; le code d'inscription est généré par la base. */
export async function createClass(name: string, diploma?: DiplomaId | null, level?: string): Promise<ClassRow> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Session expirée : reconnectez-vous.');
  const { data, error } = await supabase
    .from('classes')
    .insert({ name, level: level ?? null, diploma: diploma ?? null, teacher_id: user.id })
    .select(CLASS_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as ClassRow;
}

/** Classes du professeur connecté ; les classes archivées sont exclues par défaut. */
export async function listMyClasses(includeArchived = false): Promise<ClassRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase.from('classes').select(CLASS_COLS).eq('teacher_id', user.id);
  if (!includeArchived) query = query.eq('archived', false);
  const { data, error } = await query.order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as ClassRow[];
}

/** Archive (ou désarchive) une classe : elle disparaît des listes actives sans perdre l'historique. */
export async function archiveClass(classId: string, archived = true): Promise<ClassRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('classes')
    .update({ archived })
    .eq('id', classId)
    .select(CLASS_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as ClassRow;
}

export async function listClassStudents(classId: string): Promise<StudentBrief[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, class_id')
    .eq('class_id', classId)
    .order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as StudentBrief[];
}

/** Every attempt of the students of one class, newest first. */
export async function listClassAttempts(classId: string): Promise<AttemptWithStudent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attempts')
    .select('*, student:profiles!inner(id, full_name, email, avatar_url, class_id)')
    .eq('student.class_id', classId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AttemptWithStudent[];
}

export async function assignTp(
  classId: string,
  tpId: string,
  dueAt?: string | null,
  mode?: EvaluationMode | null,
): Promise<AssignmentRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('assignments')
    .insert({ class_id: classId, tp_id: tpId, due_at: dueAt ?? null, mode: mode ?? null })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as AssignmentRow;
}

export async function listAssignments(classId: string): Promise<AssignmentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AssignmentRow[];
}

/**
 * Mode imposé par le professeur à l'élève connecté pour ce TP (migration 0008).
 * `null` : aucune consigne, l'élève choisit son mode au lancement.
 */
export async function assignedMode(tpId: string): Promise<EvaluationMode | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles').select('class_id').eq('id', user.id).maybeSingle();
  const classId = (profile as { class_id?: string | null } | null)?.class_id;
  if (!classId) return null;
  const { data } = await supabase
    .from('assignments')
    .select('mode')
    .eq('class_id', classId)
    .eq('tp_id', tpId)
    .not('mode', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const mode = (data as { mode?: string } | null)?.mode;
  return mode === 'evaluation' || mode === 'entrainement' ? mode : null;
}

/** Measurements + chat of one attempt (teacher detail view, RLS-checked). */
export async function getAttemptDetail(attemptId: string) {
  const supabase = createClient();
  const [measurements, messages] = await Promise.all([
    supabase.from('measurements').select('*').eq('attempt_id', attemptId).order('created_at'),
    supabase.from('messages').select('*').eq('attempt_id', attemptId).order('created_at'),
  ]);
  if (measurements.error) throw new Error(measurements.error.message);
  if (messages.error) throw new Error(messages.error.message);
  return {
    measurements: (measurements.data ?? []) as {
      id: string; stage: number; instrument: string; point: string;
      value: number | null; display: string | null; created_at: string;
    }[],
    messages: (messages.data ?? []) as {
      id: string; stage: number; role: 'user' | 'assistant'; content: string; created_at: string;
    }[],
  };
}

// ------------------------------------------------ élèves d'une classe et suivi en direct

/** Profil d'élève tel qu'affiché au professeur (identifiant de connexion compris). */
export type StudentProfile = Pick<
  ProfileRow,
  'id' | 'full_name' | 'first_name' | 'last_name' | 'login' | 'email' | 'avatar_url'
  | 'class_id' | 'diploma' | 'last_seen_at'
>;

/** Un élève et sa dernière tentative connue. */
export interface StudentWithProgress {
  student: StudentProfile;
  lastAttempt: AttemptRow | null;
}

const STUDENT_COLS =
  'id, full_name, first_name, last_name, login, email, avatar_url, class_id, diploma, last_seen_at';

/** Élèves d'une classe, chacun avec sa tentative la plus récente. */
export async function listStudents(classId: string): Promise<StudentWithProgress[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(STUDENT_COLS)
    .eq('class_id', classId)
    .eq('role', 'eleve')
    .order('last_name', { nullsFirst: false })
    .order('full_name');
  if (error) throw new Error(error.message);
  const students = (data ?? []) as StudentProfile[];
  if (students.length === 0) return [];

  const { data: attempts, error: attemptsError } = await supabase
    .from('attempts')
    .select('*')
    .in('student_id', students.map((s) => s.id))
    .order('updated_at', { ascending: false });
  if (attemptsError) throw new Error(attemptsError.message);

  const last = new Map<string, AttemptRow>();
  ((attempts ?? []) as AttemptRow[]).forEach((a) => {
    if (!last.has(a.student_id)) last.set(a.student_id, a);
  });
  return students.map((student) => ({ student, lastAttempt: last.get(student.id) ?? null }));
}

/**
 * Suivi en direct de la progression d'une classe : abonnement Realtime aux `attempts`
 * des élèves de la classe (table ajoutée à la publication par la migration 0005).
 * @returns une fonction de désabonnement.
 */
export function subscribeClassProgress(
  classId: string,
  onChange: (attempt: AttemptRow) => void,
): () => void {
  const supabase = createClient();
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void (async () => {
    const { data } = await supabase.from('profiles').select('id').eq('class_id', classId).eq('role', 'eleve');
    const ids = new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
    if (cancelled || ids.size === 0) return;

    const channel = supabase
      .channel(`classe-${classId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attempts' },
        (payload) => {
          const row = payload.new as AttemptRow | null;
          if (row && ids.has(row.student_id)) onChange(row);
        },
      )
      .subscribe();

    unsubscribe = () => { void supabase.removeChannel(channel); };
    if (cancelled) unsubscribe();
  })();

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

/** Un élève et sa classe, pour la fiche individuelle du professeur. */
export interface StudentFile {
  student: StudentProfile;
  klass: ClassRow | null;
  attempts: AttemptRow[];
}

/** Fiche complète d'un élève : identité, classe et toutes ses tentatives (RLS vérifiée). */
export async function getStudentFile(studentId: string): Promise<StudentFile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(STUDENT_COLS)
    .eq('id', studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const student = (data as StudentProfile | null) ?? null;
  if (!student) return null;

  let klass: ClassRow | null = null;
  if (student.class_id) {
    const { data: row } = await supabase.from('classes').select(CLASS_COLS).eq('id', student.class_id).maybeSingle();
    klass = (row as ClassRow | null) ?? null;
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from('attempts')
    .select('*')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false });
  if (attemptsError) throw new Error(attemptsError.message);

  return { student, klass, attempts: (attempts ?? []) as AttemptRow[] };
}

/**
 * Nombre de questions posées au professeur virtuel, par tentative (aide utilisée).
 * @returns une table `attempt_id → nombre de messages de l'élève`.
 */
export async function countHelpByAttempt(attemptIds: string[]): Promise<Record<string, number>> {
  if (attemptIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('attempt_id, role')
    .in('attempt_id', attemptIds)
    .eq('role', 'user');
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  ((data ?? []) as { attempt_id: string }[]).forEach((m) => {
    counts[m.attempt_id] = (counts[m.attempt_id] ?? 0) + 1;
  });
  return counts;
}
