/**
 * Utilitaires de correction LÉGERS (module pur, sans la Compute Engine) : clés des liaisons et
 * des cavaliers, appariement d'un placement. Importables côté client (`format.ts`, renderers) ;
 * `correction.ts` les ré-exporte.
 */
import type { CorrectionQuestion, QPlacement } from './types';
import { normTexte } from './normalize';

const borne = (x: number) => Math.max(0, Math.min(1, x));

/** Clé non orientée d'une liaison entre deux bornes. */
export const cleLiaison = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Clé d'une position de cavalier dans `ReponseSujet.valeurs`. */
export const cleCavalier = (composant: string, position: string) => `${composant}.${position}`;

/** Détail de la correction d'un placement (aussi utilisé pour colorer les repères). */
export interface EtatPlacement {
  /** Pour chaque repère posé (même ordre que la réponse), l'index de l'attendu apparié, ou null. */
  apparies: (number | null)[];
  /** Index des attendus sans repère apparié. */
  manquants: number[];
  /** Repères bien placés (appariés). */
  bien: number;
  /** Repères posés non appariés, dans la limite du nombre d'attendus (mal placés). */
  malPlaces: number;
  /** Repères posés au-delà du nombre d'attendus (pénalisés). */
  enTrop: number;
  total: number;
  /** Score 0..1 de la partie « placement ». */
  score: number;
}

/**
 * Appariement glouton au plus proche : toutes les paires (repère posé, attendu) dont la distance
 * normalisée par l'ellipse de tolérance est ≤ 1 sont triées de la plus proche à la plus
 * lointaine, et retenues tant que ni le repère ni l'attendu ne sont déjà pris.
 * Score = max(0, bien placés − repères en trop) / attendus, où « en trop » = repères posés au-delà
 * du nombre d'attendus (un repère mal placé ne rapporte rien mais n'est pas pénalisé deux fois).
 */
export function etatPlacement(q: QPlacement, points: { x: number; y: number }[]): EtatPlacement {
  const tx = q.tolerance.x > 0 ? q.tolerance.x : 1e-9;
  const ty = q.tolerance.y > 0 ? q.tolerance.y : 1e-9;
  const paires: { i: number; j: number; d: number }[] = [];
  points.forEach((p, i) => q.attendus.forEach((a, j) => {
    const d = Math.hypot((p.x - a.x) / tx, (p.y - a.y) / ty);
    if (d <= 1 + 1e-9) paires.push({ i, j, d });
  }));
  paires.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j);
  const apparies: (number | null)[] = points.map(() => null);
  const pris = new Set<number>();
  for (const { i, j } of paires) {
    if (apparies[i] != null || pris.has(j)) continue;
    apparies[i] = j;
    pris.add(j);
  }
  const total = q.attendus.length;
  const bien = pris.size;
  const enTrop = Math.max(0, points.length - total);
  const malPlaces = points.length - bien - enTrop;
  const manquants = q.attendus.map((_, j) => j).filter(j => !pris.has(j));
  return { apparies, manquants, bien, malPlaces, enTrop, total, score: total ? borne((bien - enTrop) / total) : 0 };
}

/** Nom des repères d'un placement, accordé : « luminaires », « croix », « repères ». */
export function nomReperes(q: Pick<QPlacement, 'symbole'>, n: number): { nom: string; place: string } {
  const pl = n > 1;
  if (q.symbole === 'croix') return { nom: 'croix', place: `placée${pl ? 's' : ''}` };
  if (q.symbole === 'luminaire') return { nom: `luminaire${pl ? 's' : ''}`, place: `placé${pl ? 's' : ''}` };
  return { nom: `repère${pl ? 's' : ''}`, place: `placé${pl ? 's' : ''}` };
}

/** Résumé lisible : « 13/15 luminaires bien placés, 1 mal placé, 1 en trop ». */
export function resumePlacement(q: QPlacement, e: EtatPlacement): string {
  const { nom, place } = nomReperes(q, e.total);
  const accord = (n: number) => (q.symbole === 'croix' ? `placée${n > 1 ? 's' : ''}` : `placé${n > 1 ? 's' : ''}`);
  return `${e.bien}/${e.total} ${nom} bien ${place}`
    + (e.malPlaces ? `, ${e.malPlaces} mal ${accord(e.malPlaces)}` : '')
    + (e.enTrop ? `, ${e.enTrop} en trop` : '');
}

/** Valeur « aucun cavalier » : tiret, vide ou 0 écrit « — ». */
const AUCUN = new Set(['', '-', 'aucun', 'sans']);
const normCavalier = (v: string | undefined) => {
  const n = normTexte(v);
  return AUCUN.has(n) ? '-' : n;
};

/** Valeur de cavalier juste (« — », « - » et vide = aucun cavalier) ? */
export const cavalierJuste = (v: string | undefined, attendu: string) => normCavalier(v) === normCavalier(attendu);


/** Note posée par le professeur sur une question (0..1), qui remplace la pré-correction. */
export function correctionProf(num: number, score: number, detail?: string): CorrectionQuestion {
  return { num, score: Math.round(borne(score) * 10000) / 10000, statut: 'prof', detail: detail ?? 'Note du professeur' };
}
