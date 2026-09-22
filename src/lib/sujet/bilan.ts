/**
 * Bilan d'une copie de sujet numérique (module pur) : points par partie et par
 * compétence, note sur 20, grille `CompetenceEval[]` pour `attempts.evaluation`.
 */

import { COMPETENCES, masteryOf, type CompetenceEval } from '@/lib/data/competences';
import type { BilanSujet, CorrectionQuestion, SujetAttemptState, SujetNumerique } from './types';

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Bilan à partir des corrections (questions sans correction = 0 point, sans réponse). */
export function calculerBilan(sujet: SujetNumerique, corrections: Record<number, CorrectionQuestion>): BilanSujet {
  let points = 0;
  let total = 0;
  const parParties = new Map<number, { points: number; total: number }>();
  const parComp = new Map<string, { points: number; total: number }>();
  const aValider: number[] = [];
  const sansReponse: number[] = [];

  for (const q of sujet.questions) {
    const c = corrections[q.num];
    const pts = c ? c.score * q.points : 0;
    points += pts;
    total += q.points;
    const p = parParties.get(q.partie) ?? { points: 0, total: 0 };
    p.points += pts; p.total += q.points;
    parParties.set(q.partie, p);
    const k = parComp.get(q.competence) ?? { points: 0, total: 0 };
    k.points += pts; k.total += q.points;
    parComp.set(q.competence, k);
    if (!c || c.statut === 'sansReponse') sansReponse.push(q.num);
    else if (c.statut === 'aValider') aValider.push(q.num);
  }

  const ordreComp = COMPETENCES[sujet.diploma]?.map(c => c.code) ?? [];
  const rang = (code: string) => {
    const i = ordreComp.indexOf(code);
    return i < 0 ? 999 : i;
  };

  return {
    points: r2(points),
    total: r2(total),
    note20: total > 0 ? r2((points / total) * 20) : 0,
    parties: sujet.parties.map(p => ({
      num: p.num,
      titre: p.titre,
      points: r2(parParties.get(p.num)?.points ?? 0),
      total: r2(parParties.get(p.num)?.total ?? 0),
    })),
    competences: Array.from(parComp.entries())
      .map(([code, v]) => ({ code, points: r2(v.points), total: r2(v.total) }))
      .sort((a, b) => rang(a.code) - rang(b.code) || a.code.localeCompare(b.code)),
    aValider,
    sansReponse,
  };
}

/** Grille de compétences à écrire dans `attempts.evaluation` (référentiel du sujet). */
export function evaluationSujet(sujet: SujetNumerique, bilan: BilanSujet): CompetenceEval[] {
  const labels = new Map((COMPETENCES[sujet.diploma] ?? []).map(c => [c.code, c.label]));
  return bilan.competences.map(c => {
    const score = c.total > 0 ? Math.round((c.points / c.total) * 1000) / 1000 : 0;
    return {
      code: c.code,
      label: labels.get(c.code) ?? c.code,
      domains: [],
      score,
      mastery: masteryOf(score, c.total > 0),
    };
  });
}

/**
 * Note stockée dans `attempts.score`. Toute l'application lit cette colonne sur 100
 * (`noteSur20 = score / 5`) : on y écrit donc la note sur 20 × 5.
 */
export function scoreStocke(bilan: BilanSujet): number {
  return Math.round(bilan.note20 * 5 * 10) / 10;
}

/** Nombre de questions répondues (pour la barre de progression). */
export function nbRepondues(st: SujetAttemptState, estRep: (num: number) => boolean): number {
  return Object.keys(st.reponses).map(Number).filter(estRep).length;
}
