/**
 * Agrégations pour les bilans professeur (module pur, sans React).
 *
 * Règles validées le 2026-09-19 :
 *  — un TP refait laisse chaque passage clôturé en base ; par défaut la note retenue
 *    est la MOYENNE des passages (réglable : meilleure / dernière / toutes) ;
 *  — une compétence vue sur plusieurs TP / passages est agrégée en MOYENNE de ses scores.
 */

import type { AttemptRow } from '../db/types';
import type { CompetenceEval, DiplomaId } from '../data/competences';
import { tpById } from '../data/tps';
import { buildEvaluation, normalizeState } from '../sim/progress';
import { buildMesEvaluation, normalizeMesState, type MesState } from '../mes/miseEnService';

export type NoteMode = 'moy' | 'best' | 'last' | 'all';

/** Un passage compte-t-il dans un bilan ? (clôturé ou terminé, avec une note) */
export function counted(a: Pick<AttemptRow, 'status' | 'score'>): boolean {
  return (a.status === 'termine' || a.status === 'cloture') && a.score != null && Number.isFinite(a.score);
}

/** Note retenue (sur la même échelle que les entrées) selon le mode. */
export function retainedNote(notes: number[], mode: NoteMode): number | null {
  if (notes.length === 0) return null;
  if (mode === 'best') return Math.max(...notes);
  if (mode === 'last') return notes[notes.length - 1];
  // 'moy' et 'all' (all affiche le détail, mais la valeur agrégée reste la moyenne)
  return notes.reduce((a, b) => a + b, 0) / notes.length;
}

/**
 * Grille de compétences d'un passage, exprimée dans le référentiel `diploma`.
 *
 * La colonne `attempts.evaluation` est écrite à la clôture, avec le diplôme choisi
 * à ce moment-là : elle peut manquer (passage antérieur à la colonne) ou être écrite
 * dans un autre référentiel que celui de la classe. On la recalcule alors à partir de
 * l'état archivé du passage, pour que le bilan d'une classe soit toujours lu dans SON
 * référentiel. Les TP de dimensionnement gardent leur grille stockée (état différent).
 */
export function resolveEvaluation(a: AttemptRow, diploma?: DiplomaId): CompetenceEval[] {
  const stored = a.evaluation ?? [];
  if (!diploma) return stored;
  if (stored.some((c) => c.mastery !== 'nonEvalue') && a.diploma === diploma) return stored;
  const tp = tpById(a.tp_id);
  if (!tp || !tp.playable || tp.kind === 'dimensionnement' || !a.state) return stored;
  // mise en service : état propre au parcours, grille recalculée dans le référentiel demandé
  if (tp.kind === 'miseEnService') {
    try {
      return buildMesEvaluation(normalizeMesState(a.state as unknown as Partial<MesState>), diploma);
    } catch {
      return stored;
    }
  }
  try {
    return buildEvaluation(tp, normalizeState(a.state), diploma) ?? stored;
  } catch {
    return stored;
  }
}

export interface CompAverage {
  code: string;
  label: string;
  /** Score moyen 0..1 sur tous les passages qui l'ont évaluée. */
  score: number;
  /** Nombre de passages qui l'ont évaluée. */
  n: number;
}

/**
 * Moyenne par compétence des grilles `attempts.evaluation`, sur tous les passages comptés.
 * Ignore les lignes « non évaluée ». Renvoie une map code → moyenne.
 */
export function competenceAverages(attempts: AttemptRow[], diploma?: DiplomaId): Record<string, CompAverage> {
  const acc: Record<string, { label: string; sum: number; n: number }> = {};
  for (const a of attempts) {
    if (!counted(a)) continue;
    for (const c of resolveEvaluation(a, diploma)) {
      if (c.mastery === 'nonEvalue') continue;
      const rec = (acc[c.code] ??= { label: c.label, sum: 0, n: 0 });
      rec.sum += c.score;
      rec.n += 1;
    }
  }
  const out: Record<string, CompAverage> = {};
  for (const [code, r] of Object.entries(acc)) out[code] = { code, label: r.label, score: r.sum / r.n, n: r.n };
  return out;
}

/** Scores moyens seuls (code → 0..1), pour alimenter le calcul des épreuves. */
export function competenceScoreMap(attempts: AttemptRow[], diploma?: DiplomaId): Record<string, number> {
  const avg = competenceAverages(attempts, diploma);
  const out: Record<string, number> = {};
  for (const [code, a] of Object.entries(avg)) out[code] = a.score;
  return out;
}
