'use client';

import { createClient } from '@/lib/supabase/client';
import type { AttemptState, ReadingRecord } from '@/lib/types';
import { initialState } from '@/lib/sim/progress';
import type { AttemptRow, AttemptsApi, MeasurementInput } from './types';

/** Empty progress used when a fresh attempt is created. */
export function emptyAttemptState(): AttemptState {
  return initialState();
}

/** Convertit une lecture d'instrument en ligne de la table `measurements`. */
export function measurementOf(r: ReadingRecord): MeasurementInput {
  return {
    stage: r.stage,
    instrument: r.instrument,
    point: r.wire ?? `${r.a ?? '?'}→${r.b ?? '?'}`,
    value: r.value != null && Number.isFinite(r.value) ? r.value : null,
    display: `${r.dial} · ${r.display}`.trim(),
  };
}

/** Reuses the student's running attempt for this TP, or creates one. */
export async function getOrCreateAttempt(tpId: string): Promise<AttemptRow> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Session expirée : reconnecte-toi.');

  const { data: existing, error: readError } = await supabase
    .from('attempts')
    .select('*')
    .eq('student_id', user.id)
    .eq('tp_id', tpId)
    .eq('status', 'en_cours')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) return existing as AttemptRow;

  const { data: created, error: insertError } = await supabase
    .from('attempts')
    .insert({ student_id: user.id, tp_id: tpId, status: 'en_cours', stage: 0, state: emptyAttemptState() })
    .select('*')
    .single();
  if (insertError) throw new Error(insertError.message);
  return created as AttemptRow;
}

export async function saveAttemptState(
  id: string,
  state: AttemptState,
  stage: number,
  status?: AttemptRow['status'],
): Promise<void> {
  const supabase = createClient();
  const patch: Record<string, unknown> = { state, stage, updated_at: new Date().toISOString() };
  if (status) patch.status = status;
  const { error } = await supabase.from('attempts').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addMeasurement(id: string, m: MeasurementInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('measurements').insert({ attempt_id: id, ...m });
  if (error) throw new Error(error.message);
}

export async function addMessage(
  id: string,
  stage: number,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('messages').insert({ attempt_id: id, stage, role, content });
  if (error) throw new Error(error.message);
}

export async function finishAttempt(
  id: string,
  report: Record<string, unknown>,
  score: number,
): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('attempts')
    .update({ status: 'termine', report, score, finished_at: now, updated_at: now })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** All the attempts of the signed-in student (catalogue badges, résumés). */
export async function listMyAttempts(): Promise<AttemptRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('attempts')
    .select('*')
    .eq('student_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AttemptRow[];
}

/** Explicit implementation of the contract declared in db/types.ts. */
export const attemptsApi: AttemptsApi = {
  getOrCreateAttempt,
  saveAttemptState,
  addMeasurement,
  addMessage,
  finishAttempt,
};
