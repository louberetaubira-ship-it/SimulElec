import type { AttemptState } from '../types';
import type { CompetenceEval, DiplomaId } from '../data/competences';

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
  /** Grille de compétences calculée à la fin du TP (migration 0004). */
  evaluation: CompetenceEval[] | null;
  /** Diplôme préparé au moment de la tentative (migration 0004). */
  diploma: DiplomaId | null;
}

export interface MeasurementInput {
  stage: number;
  /** Appareil utilisé : mm, clamp, ctrl, vat, tach. */
  instrument: string;
  /** Point de mesure : « a→b » pour deux pointes, « a>b » pour la pince. */
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
  /** Diplôme préparé (migration 0004). */
  diploma: DiplomaId | null;
  /** Écran d'accueil `/bienvenue` complété (migration 0004). */
  onboarded: boolean;
}

export interface ClassRow { id: string; name: string; level: string | null; teacher_id: string; join_code: string }

/** Contract implemented in src/lib/db/attempts.ts (client-side, uses the browser Supabase client). */
export interface AttemptsApi {
  getOrCreateAttempt(tpId: string): Promise<AttemptRow>;
  saveAttemptState(id: string, state: AttemptState, stage: number, status?: AttemptRow['status']): Promise<void>;
  addMeasurement(id: string, m: MeasurementInput): Promise<void>;
  addMessage(id: string, stage: number, role: 'user' | 'assistant', content: string): Promise<void>;
  finishAttempt(
    id: string,
    report: Record<string, unknown>,
    score: number,
    evaluation?: CompetenceEval[] | null,
    diploma?: DiplomaId | null,
  ): Promise<void>;
}
