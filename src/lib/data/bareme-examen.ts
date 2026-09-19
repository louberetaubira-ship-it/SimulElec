/**
 * Barème d’examen : épreuves professionnelles, coefficients et pondération des
 * compétences — VALEURS DU RÉFÉRENTIEL MÉTIER (fournies par le professeur, 2026-09-19).
 *
 * Modèle (corrigé le 2026-09-19) :
 *  — une épreuve porte un COEFFICIENT d’examen ;
 *  — à l’intérieur d’une épreuve, chaque compétence porte un POURCENTAGE ;
 *  — une même compétence PEUT appartenir à plusieurs épreuves avec des poids
 *    différents. La table ci-dessous est donc la source de vérité : on ne déduit plus
 *    l’épreuve du champ `unit` d’une compétence, qui ne peut en porter qu’une.
 *
 * Calcul :
 *    note d’épreuve /20 = Σ(score × %) / Σ(%) × 20   (sur les compétences évaluées)
 *    note d’examen  /20 = Σ(note d’épreuve × coef) / Σ(coef)
 *
 * La normalisation par Σ(%) gère à la fois les arrondis du référentiel (E31 :
 * 7 × 14 % = 98 %) et les épreuves partiellement couvertes par les TP faits.
 */

import type { DiplomaId } from './competences';

export interface EpreuveDef {
  /** Code affiché de l’épreuve (E2, E31, U4, EP1, U1…). */
  code: string;
  /** Intitulé de l’épreuve. */
  nom: string;
  /** Coefficient de l’épreuve à l’examen. */
  coef: number;
  /** Compétence → pourcentage dans cette épreuve. */
  poids: Record<string, number>;
}

/**
 * Épreuves professionnelles par diplôme.
 *
 * CAP : le référentiel métier numérote C1…C9 ; l’application code ces compétences
 * CO1…CO9 (même ordre, même sens) — la correspondance est appliquée ici.
 * CS TER : le référentiel métier numérote C1…C15 ; l’application détaille 16
 * compétences (C1-1…C5-2). La correspondance suit l’ordre du référentiel, la
 * compétence « C2-2 Planifier l’intervention » n’étant pas certificative.
 */
export const EPREUVES: Record<DiplomaId, EpreuveDef[]> = {
  bacpro: [
    // C2 « Organiser l’opération dans son contexte » relève du bloc 2 (Réalisation et
    // mise en service) au référentiel rénové 2024 : elle n’est évaluée qu’en E31.
    // E2 garde donc 4 compétences, à 25 % chacune.
    { code: 'E2', nom: 'Préparation des opérations à réaliser', coef: 3,
      poids: { C1: 25, C3: 25, C10: 25, C11: 25 } },
    { code: 'E31', nom: 'Réalisation et mise en service d’une installation', coef: 7,
      poids: { C2: 14, C4: 14, C5: 14, C6: 14, C7: 14, C12: 14, C13: 14 } },
    { code: 'E32', nom: 'Maintenance d’une installation', coef: 2,
      poids: { C8: 50, C9: 50 } },
  ],
  bts: [
    { code: 'U4', nom: 'Conception — étude préliminaire', coef: 5,
      poids: { C5: 25, C6: 25, C8: 25, C10: 25 } },
    { code: 'U51', nom: 'Analyse, diagnostic, maintenance', coef: 3,
      poids: { C2: 20, C13: 20, C17: 30, C18: 30 } },
    { code: 'U52', nom: 'Conduite de projet / chantier EnR et tertiaire', coef: 3,
      poids: { C1: 30, C3: 30, C12: 40 } },
    { code: 'U61', nom: 'Conception — étude détaillée d’un réseau', coef: 3,
      poids: { C7: 30, C9: 40, C11: 30 } },
    { code: 'U62', nom: 'Réalisation et mise en service d’installations', coef: 3,
      poids: { C4: 20, C14: 30, C15: 25, C16: 25 } },
  ],
  cap: [
    // référentiel C1…C9 → codes application CO1…CO9
    { code: 'EP1', nom: 'Réalisation d’une installation électrique', coef: 7,
      poids: { CO1: 20, CO2: 30, CO3: 40, CO8: 10 } },
    { code: 'EP2', nom: 'Mise en service et contrôles normaux', coef: 4,
      poids: { CO4: 30, CO5: 40, CO7: 30 } },
    { code: 'EP3', nom: 'Maintenance préventive / corrective de base', coef: 2,
      poids: { CO6: 60, CO9: 40 } },
  ],
  cster: [
    // référentiel C1…C15 → codes application (C2-2 non certificative)
    { code: 'U1', nom: 'Étude de faisabilité et préparation EnR', coef: 3,
      poids: { 'C1-1': 20, 'C1-2': 20, 'C1-3': 20, 'C2-1': 20, 'C2-3': 20 } },
    { code: 'U2', nom: 'Réalisation et raccordement de l’installation', coef: 4,
      poids: { 'C3-1': 15, 'C3-2': 15, 'C3-3': 25, 'C3-4': 25, 'C3-5': 20 } },
    { code: 'U3', nom: 'Maintenance, contrôles et proposition client', coef: 2,
      poids: { 'C3-6': 20, 'C3-7': 20, 'C4-1': 20, 'C5-1': 20, 'C5-2': 20 } },
  ],
};

/** Épreuves professionnelles du diplôme. */
export const epreuvesOf = (diploma: DiplomaId): EpreuveDef[] => EPREUVES[diploma] ?? [];

/** Le diplôme a-t-il des épreuves définies ? */
export const hasEpreuves = (diploma: DiplomaId): boolean => epreuvesOf(diploma).length > 0;

/** Épreuves où cette compétence est évaluée, avec son poids (une compétence peut en avoir plusieurs). */
export function epreuvesOfCompetence(diploma: DiplomaId, code: string): { code: string; pct: number }[] {
  return epreuvesOf(diploma)
    .filter((e) => e.poids[code] != null)
    .map((e) => ({ code: e.code, pct: e.poids[code] }));
}

export interface EpreuveNote {
  /** Note sur 20, pondérée par les pourcentages du référentiel. `null` si rien d’évalué. */
  note20: number | null;
  /** Compétences retenues (celles qui ont un score), avec leur poids. */
  used: { code: string; score: number; pct: number }[];
  /** Nombre de compétences de l’épreuve au total. */
  total: number;
  /** Somme des pourcentages couverts par les compétences évaluées. */
  couverture: number;
}

/**
 * Note d’une épreuve. `scores` : code de compétence → score 0..1.
 * Les compétences non évaluées sont exclues et la pondération est renormalisée.
 */
export function epreuveNote(
  scores: Record<string, number>,
  ep: EpreuveDef,
  override?: Record<string, number>,
): EpreuveNote {
  const used: { code: string; score: number; pct: number }[] = [];
  let sw = 0;
  let sp = 0;
  const codes = Object.keys(ep.poids);
  for (const code of codes) {
    const s = scores[code];
    if (s == null || !Number.isFinite(s)) continue;
    const pct = override?.[`${ep.code}.${code}`] ?? ep.poids[code];
    used.push({ code, score: s, pct });
    sw += s * pct;
    sp += pct;
  }
  return { note20: sp > 0 ? (sw / sp) * 20 : null, used, total: codes.length, couverture: sp };
}

/** Note d’examen projetée : épreuves pondérées par leur coefficient. */
export function examNote20(
  notes: { code: string; note20: number | null; coef: number }[],
): number | null {
  let sw = 0;
  let sc = 0;
  for (const e of notes) {
    if (e.note20 == null) continue;
    sw += e.note20 * e.coef;
    sc += e.coef;
  }
  return sc > 0 ? sw / sc : null;
}
