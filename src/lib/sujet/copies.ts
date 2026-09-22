'use client';

/**
 * Copies des élèves pour un sujet numérique (vue professeur).
 *
 * Lecture : policy « attempts teacher read » (élèves des classes du professeur).
 * Écriture : fonctions `valider_copie_sujet` / `reactiver_copie_sujet`
 * (migration 0014) — le professeur n'a pas le droit d'UPDATE direct sur `attempts`.
 * Mode démonstration : la seule copie est celle du navigateur (`localStorage`).
 */

import { createClient } from '@/lib/supabase/client';
import { reopenAttempt } from '@/lib/db/attempts';
import type { AttemptRow } from '@/lib/db/types';
import type { CompetenceEval } from '@/lib/data/competences';
import type { SujetAttemptState } from './types';
import { isSujetState, lireLocal, ecrireLocal } from './store';

export interface CopieSujet {
  id: string;
  status: AttemptRow['status'];
  score: number | null;
  updated_at: string;
  state: SujetAttemptState | null;
  eleve: { id: string; nom: string; class_id: string | null };
}

export const ID_LOCAL = 'local';

/** Copies (tentatives) des élèves du professeur pour ce sujet, les plus récentes d'abord. */
export async function listCopiesSujet(sujetId: string, demo: boolean): Promise<CopieSujet[]> {
  if (demo) {
    const c = lireLocal(sujetId);
    if (!c) return [];
    return [{
      id: ID_LOCAL, status: c.status, score: c.score, updated_at: c.updated_at, state: c.state,
      eleve: { id: ID_LOCAL, nom: 'Élève (copie de démonstration de ce navigateur)', class_id: null },
    }];
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attempts')
    .select('id, status, score, updated_at, state, student:profiles!inner(id, full_name, email, class_id)')
    .eq('tp_id', sujetId)
    .neq('status', 'abandonne')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  type Ligne = {
    id: string; status: AttemptRow['status']; score: number | null; updated_at: string; state: unknown;
    student: { id: string; full_name: string | null; email: string | null; class_id: string | null } | null;
  };
  return ((data ?? []) as unknown as Ligne[]).map(l => ({
    id: l.id,
    status: l.status,
    score: l.score,
    updated_at: l.updated_at,
    state: isSujetState(l.state) ? l.state : null,
    eleve: { id: l.student?.id ?? '', nom: l.student?.full_name ?? l.student?.email ?? 'Élève', class_id: l.student?.class_id ?? null },
  }));
}

/** Enregistre la validation du professeur (corrections, annotations, note /100, grille). */
export async function validerCopie(
  sujetId: string, id: string, state: SujetAttemptState, score: number, evaluation: CompetenceEval[], demo: boolean,
): Promise<void> {
  if (demo || id === ID_LOCAL) {
    const c = lireLocal(sujetId);
    ecrireLocal(sujetId, { status: c?.status ?? 'termine', score, state });
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.rpc('valider_copie_sujet', {
    p_attempt: id, p_state: state, p_score: score, p_evaluation: evaluation,
  });
  if (error) {
    throw new Error(/function|schema cache/i.test(error.message)
      ? 'Validation impossible : la migration 0014 (sujets numériques) n’est pas appliquée sur la base.'
      : error.message);
  }
}

/** Réactive une copie remise : elle repasse « en cours », l'élève peut la reprendre. */
export async function reactiverCopie(sujetId: string, id: string, demo: boolean): Promise<void> {
  if (demo || id === ID_LOCAL) {
    const c = lireLocal(sujetId);
    if (c) ecrireLocal(sujetId, { status: 'en_cours', score: null, state: { ...c.state, remise: false, remiseAt: null } });
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.rpc('reactiver_copie_sujet', { p_attempt: id });
  if (!error) return;
  // Base sans la migration 0014 : réactivation générique des TP (le client élève
  // rouvre alors la copie en lisant `status = 'en_cours'`).
  if (/function|schema cache/i.test(error.message)) {
    await reopenAttempt(id);
    return;
  }
  throw new Error(error.message);
}
