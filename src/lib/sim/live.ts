/**
 * Évaluation « à l'instant t » d'une tentative en cours.
 *
 * Le bilan de fin de TP (`buildReport`, `buildEvaluation`) est une fonction pure de
 * `(tp, state)` : rien n'empêche de l'appeler sur l'état COURANT, à n'importe quelle
 * étape. Ce module en tire, sans rien persister de nouveau, ce qu'affichent le suivi
 * professeur et l'espace élève pendant le TP :
 *
 *   — la NOTE PROVISOIRE : qualité des seules étapes déjà atteintes (sur 20) ;
 *   — la NOTE PROJETÉE   : résultat si le TP s'arrêtait maintenant, barème complet (sur 20) ;
 *   — la grille de COMPÉTENCES à l'instant t (`buildEvaluation`, déjà partielle par nature) ;
 *   — le BILAN par règles : ce qui est bien réalisé, et les points de vigilance à remédier,
 *     déduits des lignes de barème (`scoreLines`) et des fiches de rappel de l'étape.
 *
 * Tout reste cohérent avec la note finale : ce sont exactement les mêmes fonctions.
 */

import type { AttemptState, Bareme, TpDefinition } from '../types';
import {
  ETAPE, baremeOf, buildEvaluation, coursForStage, scoreLines, stageErrors, stageReached, type ScoreLine,
} from './progress';
import type { CompetenceEval, DiplomaId } from '../data/competences';
import { COURS } from '../data/cours';

/** Étape du parcours dont dépend chaque ligne de barème (pour savoir si elle est « atteinte »). */
const RUBRIC_STAGE: Record<string, number> = {
  preparation: ETAPE.PREPARATION,
  materiel: ETAPE.MATERIEL,
  pose: ETAPE.POSE,
  cablage: ETAPE.CABLAGE,
  tests: ETAPE.TESTS,
  epi: ETAPE.EPI,
  hors: ETAPE.HORS,
  sous: ETAPE.SOUS,
  diag: ETAPE.VALIDATION,
  quiz: ETAPE.VALIDATION,
};

/** Seuils de lecture d'une ligne de barème (ratio points / max). */
const FORCE_MIN = 0.8;
const VIGILANCE_MAX = 0.55;

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Une ligne de barème est-elle déjà évaluable ?
 *
 * Une étape franchie compte toujours. L'étape EN COURS compte dès qu'une erreur
 * y a été commise (refus de liaison, erreur de pose, essai de dépannage…) : sans
 * cela, la note provisoire reste optimiste — un élève en plein câblage avec des
 * dizaines de liaisons refusées apparaissait à 20/20 tant qu'il n'avait pas
 * validé l'étape (corrigé le 2026-09-17). La note baisse donc dès la première
 * erreur, sans pénaliser une étape juste entamée et encore propre.
 */
function lineReached(st: AttemptState, l: ScoreLine): boolean {
  if (l.max <= 0) return false;
  const stage = RUBRIC_STAGE[l.key];
  if (stage == null) return false;
  if (stageReached(st, stage)) return true;
  return stage === st.stage && stageErrors(st, stage) > 0;
}

export interface LiveNotes {
  /** Note sur 20 des seules étapes déjà réalisées (null tant qu'aucune n'est atteinte). */
  provisoire: number | null;
  /** Note sur 20 sur l'ensemble du TP (étapes non faites = 0). */
  projetee: number;
  /** Points obtenus et total du barème (0..100 par défaut), pour l'affichage détaillé. */
  points: number;
  total: number;
}

/** Notes provisoire et projetée d'une tentative en cours. */
export function liveNotes(tp: TpDefinition, st: AttemptState, bareme?: Bareme): LiveNotes {
  const b = bareme ?? baremeOf(tp);
  const lines = scoreLines(tp, st, b);
  const total = lines.reduce((a, l) => a + l.max, 0);
  const points = lines.reduce((a, l) => a + l.points, 0);

  const reached = lines.filter((l) => lineReached(st, l));
  const rMax = reached.reduce((a, l) => a + l.max, 0);
  const rPts = reached.reduce((a, l) => a + l.points, 0);

  return {
    provisoire: rMax > 0 ? round1((rPts / rMax) * 20) : null,
    projetee: total > 0 ? round1((points / total) * 20) : 0,
    points,
    total,
  };
}

/** Grille de compétences à l'instant t (identique à la grille de fin, sur l'état courant). */
export function liveEvaluation(
  tp: TpDefinition,
  st: AttemptState,
  diploma: DiplomaId,
  bareme?: Bareme,
): CompetenceEval[] | null {
  return buildEvaluation(tp, st, diploma, bareme);
}

export interface BilanItem {
  key: string;
  /** Intitulé de la ligne de barème (« Câblage », « EPI et consignation »…). */
  label: string;
  /** Détail chiffré produit par le moteur (« 4 / 4 mesures conformes »…). */
  detail: string;
  /** Part de réussite 0..1 de la ligne. */
  ratio: number;
  /** Fiches de rappel proposées en remédiation (points de vigilance uniquement). */
  remediation?: string[];
}

export interface LiveBilan {
  /** Ce qui est bien réalisé (ratio ≥ 0,8). */
  forces: BilanItem[];
  /** Points de vigilance à remédier (ratio < 0,55), les plus faibles d'abord. */
  vigilances: BilanItem[];
}

/**
 * Bilan par règles : partage les étapes déjà réalisées entre points forts et points
 * de vigilance, et rattache à chaque vigilance les fiches de rappel de son étape.
 */
export function liveBilan(tp: TpDefinition, st: AttemptState, bareme?: Bareme): LiveBilan {
  const b = bareme ?? baremeOf(tp);
  const lines = scoreLines(tp, st, b).filter((l) => lineReached(st, l));

  const forces: BilanItem[] = [];
  const vigilances: BilanItem[] = [];

  lines.forEach((l) => {
    const ratio = l.points / l.max;
    if (ratio >= FORCE_MIN) {
      forces.push({ key: l.key, label: l.label, detail: l.detail, ratio });
    } else if (ratio < VIGILANCE_MAX) {
      const stage = RUBRIC_STAGE[l.key];
      const remediation = coursForStage(tp.id, stage)
        .map((id) => COURS[id]?.title)
        .filter((t): t is string => Boolean(t));
      vigilances.push({ key: l.key, label: l.label, detail: l.detail, ratio, remediation });
    }
  });

  forces.sort((a, b2) => b2.ratio - a.ratio);
  vigilances.sort((a, b2) => a.ratio - b2.ratio);
  return { forces, vigilances };
}
