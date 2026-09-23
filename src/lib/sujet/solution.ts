/**
 * Corrigé lisible d'un sujet COMPLET (module pur) : réponse attendue en lignes (`texteAttendu`),
 * explication, adresse (route gardée) de l'image du schéma corrigé. Utilisé par le serveur (`GET /api/sujet/solution`) et
 * par la vue professeur (qui reçoit le sujet complet après vérification du rôle).
 */
import { texteAttendu } from './format';
import type { CorrigeQuestion, CorrigeSujet } from './public';
import type { SujetNumerique, SujetQuestion } from './types';

/**
 * Adresse de l'image du schéma corrigé : route gardée (professeur, ou élève si le corrigé est
 * publié ; démonstration : `demo=publie`). Le nom du fichier privé n'est jamais servi.
 */
export const imageCorrigeUrl = (sujetId: string, num: number, demo = false) =>
  `/api/sujet/image?sujetId=${encodeURIComponent(sujetId)}&num=${num}${demo ? '&demo=publie' : ''}`;

/** Corrigé d'une question (`demo` : adresse d'image utilisable sans session, démonstration). */
export function corrigeQuestion(sujetId: string, q: SujetQuestion, demo = false): CorrigeQuestion {
  const out: CorrigeQuestion = { attendu: texteAttendu(q) };
  if (q.explication) out.explication = q.explication;
  if (q.type === 'schema') out.corrigeImage = { src: imageCorrigeUrl(sujetId, q.num, demo), alt: q.corrigeImage.alt };
  return out;
}

/** Corrigé complet d'un sujet. */
export function corrigeSujet(s: SujetNumerique, demo = false): CorrigeSujet {
  const questions: CorrigeSujet['questions'] = {};
  for (const q of s.questions) questions[q.num] = corrigeQuestion(s.id, q, demo);
  return { sujetId: s.id, questions };
}
