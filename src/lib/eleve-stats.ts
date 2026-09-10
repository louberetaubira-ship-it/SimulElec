/**
 * Bilan cumulé d'un élève à partir de ses tentatives (module pur, sans React).
 * Les notes des TP sont sur 100 (`computeScore`) ; le bilan de compétences fusionne les
 * grilles `attempts.evaluation` en une moyenne par compétence, avec les mêmes seuils de
 * maîtrise que `src/lib/data/competences.ts`.
 */
import { masteryOf, type CompetenceEval, type Domain } from './data/competences';
import type { AttemptRow } from './db/types';

export interface EleveStats {
  /** Tentatives terminées prises en compte. */
  finished: number;
  /** TP distincts terminés au moins une fois. */
  tpDone: number;
  /** Moyenne générale sur 20 (null si aucune note). */
  moyenne: number | null;
  /** Bilan de compétences cumulé, une ligne par compétence rencontrée. */
  competences: CompetenceEval[];
}

/** Convertit une note de TP (0..100) en note sur 20. */
export function noteSur20(score: number): number {
  return Math.round((score / 5) * 10) / 10;
}

/** Une tentative compte-t-elle dans le bilan ? */
function counted(a: AttemptRow): boolean {
  return a.status === 'termine';
}

/**
 * Agrège les tentatives d'un élève.
 * Chaque TP terminé pèse le même poids : pour un TP repassé plusieurs fois, seule la
 * tentative la plus récente est retenue.
 */
export function eleveStats(attempts: AttemptRow[]): EleveStats {
  const finished = attempts.filter(counted);

  // Une seule tentative par TP : la plus récente.
  const parTp = new Map<string, AttemptRow>();
  finished
    .slice()
    .sort((a, b) => (a.finished_at ?? a.updated_at).localeCompare(b.finished_at ?? b.updated_at))
    .forEach((a) => parTp.set(a.tp_id, a));
  const retenues = Array.from(parTp.values());

  const notes = retenues.map((a) => a.score).filter((s): s is number => s != null && Number.isFinite(s));
  const moyenne = notes.length ? noteSur20(notes.reduce((a, b) => a + b, 0) / notes.length) : null;

  // Fusion des grilles : moyenne des scores par compétence, pondérée à parts égales par TP.
  const acc = new Map<string, { label: string; domains: Set<Domain>; sum: number; n: number }>();
  retenues.forEach((attempt) => {
    (attempt.evaluation ?? []).forEach((c) => {
      if (c.mastery === 'nonEvalue') return;
      const entry = acc.get(c.code) ?? { label: c.label, domains: new Set<Domain>(), sum: 0, n: 0 };
      c.domains.forEach((d) => entry.domains.add(d));
      entry.sum += c.score;
      entry.n += 1;
      acc.set(c.code, entry);
    });
  });

  const competences: CompetenceEval[] = Array.from(acc.entries())
    .map(([code, e]) => {
      const score = e.n ? e.sum / e.n : 0;
      return { code, label: e.label, domains: Array.from(e.domains), score, mastery: masteryOf(score, e.n > 0) };
    })
    .sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }));

  return { finished: finished.length, tpDone: retenues.length, moyenne, competences };
}
