/**
 * Agrégations pour les bilans professeur (module pur, sans React).
 *
 * Règles validées le 2026-09-19 :
 *  — un TP refait laisse chaque passage clôturé en base ; par défaut la note retenue
 *    est la MOYENNE des passages (réglable : meilleure / dernière / toutes) ;
 *  — une compétence vue sur plusieurs TP / passages est agrégée en MOYENNE de ses scores.
 */

import type { AttemptRow } from '../db/types';

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
export function competenceAverages(attempts: AttemptRow[]): Record<string, CompAverage> {
  const acc: Record<string, { label: string; sum: number; n: number }> = {};
  for (const a of attempts) {
    if (!counted(a)) continue;
    for (const c of a.evaluation ?? []) {
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
export function competenceScoreMap(attempts: AttemptRow[]): Record<string, number> {
  const avg = competenceAverages(attempts);
  const out: Record<string, number> = {};
  for (const [code, a] of Object.entries(avg)) out[code] = a.score;
  return out;
}
