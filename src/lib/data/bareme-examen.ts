/**
 * Barème d'examen : relie le bilan de compétences aux épreuves certificatives.
 *
 * Chaque compétence du référentiel porte une unité (`unit` dans `competences.ts`) ;
 * une épreuve regroupe les compétences d'une même unité. La note d'une épreuve est la
 * moyenne des scores de ses compétences, PONDÉRÉE par les coefficients que le professeur
 * affecte à chaque compétence :
 *
 *     note/20 = Σ(score × coef) / Σ(coef) × 20
 *
 * La note d'examen projetée agrège les épreuves, pondérées par leur coefficient d'examen.
 *
 * Les coefficients par défaut ci-dessous sont surchargeables (l'écran prof les édite et
 * les mémorise) ; ils n'ont aucune valeur réglementaire tant que le professeur ne les a
 * pas validés. Les diplômes sans unité au référentiel (CS TER) n'ont pas de projection
 * d'épreuves : seul le bilan de compétences est affiché.
 */

import { COMPETENCES, type Competence, type DiplomaId } from './competences';

/** Métadonnées d'affichage d'une épreuve, par unité certificative. */
export const EPREUVE_META: Record<string, { code: string; nom: string }> = {
  // Bac Pro MELEC
  U2: { code: 'E2', nom: 'Analyse et préparation' },
  U31: { code: 'E31', nom: 'Réalisation, mise en service' },
  U32: { code: 'E32', nom: 'Maintenance corrective' },
  // CAP Électricien
  UP1: { code: 'EP1', nom: 'Préparation d’une opération' },
  UP2: { code: 'EP2', nom: 'Réalisation et contrôle' },
  UP3: { code: 'EP3', nom: 'Maintenance et communication' },
  // BTS Électrotechnique
  U41: { code: 'E41', nom: 'Conception préliminaire' },
  U42: { code: 'E42', nom: 'Conception détaillée' },
  U51: { code: 'E51', nom: 'Mise en service, mesures, maintenance' },
  U61: { code: 'E61', nom: 'Conduite de projet' },
  U62: { code: 'E62', nom: 'Réalisation et configuration' },
};

/** Code/nom d'épreuve pour une unité (déduit si absent de la table). */
export function epreuveMeta(unit: string): { code: string; nom: string } {
  return EPREUVE_META[unit] ?? { code: unit.replace(/^U/, 'E'), nom: `Épreuve ${unit}` };
}

/** Coefficients de compétence non neutres, par diplôme (les autres valent 1). */
const COMP_COEF_OVERRIDES: Partial<Record<DiplomaId, Record<string, number>>> = {
  bacpro: { C1: 2, C3: 2, C4: 3, C5: 2, C7: 2, C8: 2, C9: 2 },
};

/** Coefficients d'épreuve non neutres, par diplôme (les autres valent 1). */
const EPREUVE_COEF_OVERRIDES: Partial<Record<DiplomaId, Record<string, number>>> = {
  bacpro: { U2: 3, U31: 4, U32: 2 },
};

/** Coefficient par défaut de chaque compétence du diplôme (1 sauf surcharge). */
export function defaultCompCoef(diploma: DiplomaId): Record<string, number> {
  const over = COMP_COEF_OVERRIDES[diploma] ?? {};
  const out: Record<string, number> = {};
  for (const c of COMPETENCES[diploma]) out[c.code] = over[c.code] ?? 1;
  return out;
}

/** Coefficient d'examen par défaut de chaque épreuve (unité) du diplôme (1 sauf surcharge). */
export function defaultEpreuveCoef(diploma: DiplomaId): Record<string, number> {
  const over = EPREUVE_COEF_OVERRIDES[diploma] ?? {};
  const out: Record<string, number> = {};
  for (const u of unitsOf(diploma)) out[u] = over[u] ?? 1;
  return out;
}

/** Unités certificatives présentes dans le référentiel du diplôme, dans l'ordre. */
export function unitsOf(diploma: DiplomaId): string[] {
  const seen: string[] = [];
  for (const c of COMPETENCES[diploma]) {
    if (c.unit && !seen.includes(c.unit)) seen.push(c.unit);
  }
  return seen;
}

export interface EpreuveDef {
  unit: string;
  code: string;
  nom: string;
  comps: Competence[];
}

/** Épreuves du diplôme (une par unité), avec leurs compétences. Vide si aucune unité. */
export function epreuvesOf(diploma: DiplomaId): EpreuveDef[] {
  return unitsOf(diploma).map((unit) => {
    const meta = epreuveMeta(unit);
    return { unit, code: meta.code, nom: meta.nom, comps: COMPETENCES[diploma].filter((c) => c.unit === unit) };
  });
}

/** Le diplôme a-t-il une projection d'épreuves possible ? */
export const hasEpreuves = (diploma: DiplomaId): boolean => unitsOf(diploma).length > 0;

export interface EpreuveNote {
  /** Note sur 20, pondérée par les coefficients de compétence. `null` si rien d'évalué. */
  note20: number | null;
  /** Compétences retenues (celles qui ont un score). */
  used: { code: string; score: number; coef: number }[];
  /** Nombre de compétences de l'épreuve au total. */
  total: number;
}

/**
 * Note d'une épreuve : moyenne des scores (0..1) pondérée par les coefficients, sur 20.
 * `scores` : code de compétence → score 0..1 (compétences absentes = non évaluées).
 */
export function epreuveNote(
  scores: Record<string, number>,
  ep: EpreuveDef,
  compCoef: Record<string, number>,
): EpreuveNote {
  const used: { code: string; score: number; coef: number }[] = [];
  let sw = 0;
  let sc = 0;
  for (const c of ep.comps) {
    const s = scores[c.code];
    if (s == null || !Number.isFinite(s)) continue;
    const coef = compCoef[c.code] ?? 1;
    used.push({ code: c.code, score: s, coef });
    sw += s * coef;
    sc += coef;
  }
  return { note20: sc > 0 ? (sw / sc) * 20 : null, used, total: ep.comps.length };
}

/**
 * Note d'examen projetée : moyenne des notes d'épreuve pondérée par les coefficients
 * d'examen. `null` si aucune épreuve notée.
 */
export function examNote20(
  epreuveNotes: { unit: string; note20: number | null }[],
  epreuveCoef: Record<string, number>,
): number | null {
  let sw = 0;
  let sc = 0;
  for (const e of epreuveNotes) {
    if (e.note20 == null) continue;
    const coef = epreuveCoef[e.unit] ?? 1;
    sw += e.note20 * coef;
    sc += coef;
  }
  return sc > 0 ? sw / sc : null;
}
