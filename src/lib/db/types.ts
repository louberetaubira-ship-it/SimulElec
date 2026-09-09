import type { AttemptState } from '../types';

export interface AttemptRow {
  id: string;
  student_id: string;
  tp_id: string;
  status: 'en_cours' | 'termine' | 'abandonne';
  stage: number;
  score: number | null;
  state: AttemptState;
  report: Record<string, unknown> | null;
  started_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface MeasurementInput {
  stage: number;
  instrument: string;
  point: string;
  value: number | null;
  display: string;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'eleve' | 'professeur' | 'admin';
  etablissement: string | null;
  class_id: string | null;
}

export interface ClassRow { id: string; name: string; level: string | null; teacher_id: string; join_code: string }

/** Contract implemented in src/lib/db/attempts.ts (client-side, uses the browser Supabase client). */
export interface AttemptsApi {
  getOrCreateAttempt(tpId: string): Promise<AttemptRow>;
  saveAttemptState(id: string, state: AttemptState, stage: number, status?: AttemptRow['status']): Promise<void>;
  addMeasurement(id: string, m: MeasurementInput): Promise<void>;
  addMessage(id: string, stage: number, role: 'user' | 'assistant', content: string): Promise<void>;
  finishAttempt(id: string, report: Record<string, unknown>, score: number): Promise<void>;
}
