/**
 * Sujets thématiques (« déclinaisons ») : un dossier d'examen, plusieurs sujets.
 *
 * Un sujet complet déclare `declinaisons` (parties retenues, thème, durée) ; ce module en
 * fabrique des `SujetNumerique` à part entière, jouables seuls par le même moteur (store,
 * correction, bilan, copie, chrono, vue professeur) :
 *  - mêmes questions, même numérotation que le papier (le thème Éclairage commence à Q14) :
 *    aucune question n'est dupliquée dans les données ni renumérotée ;
 *  - DTR limité aux pages utiles au thème (pages des parties + pages citées par les questions) ;
 *  - pages du sujet limitées à celles des questions et de la mise en situation ;
 *  - consignes, problématique et durée propres au thème.
 * Module pur (utilisé côté serveur, côté client et par les scripts).
 */
import type { DeclinaisonSujet, SujetNumerique, ThemeSujet } from './types';

/** Durée lisible en heures et minutes : « 5 h », « 1 h 35 », « 45 min ». */
export function dureeLisible(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

const majuscule = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Ligne « Problématique : … » d'une mise en situation de partie, reformulée en phrase. */
function problematiqueDePartie(situation: string): string | null {
  const ligne = situation.split('\n').find(l => /^Problématique\s*:/.test(l.trim()));
  if (!ligne) return null;
  const t = ligne.trim().replace(/^Problématique\s*:\s*/, '').replace(/\s*[.;]\s*$/, '');
  return `${majuscule(t)}.`;
}

/** Intervalle des questions d'une liste : « Q14 à Q38 ». */
function intervalle(nums: number[]): string {
  if (!nums.length) return '';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? `Q${min}` : `Q${min} à Q${max}`;
}

/** Le sujet dérivé d'une déclinaison. */
export function sujetDerive(base: SujetNumerique, d: DeclinaisonSujet): SujetNumerique {
  const garder = new Set(d.parties);
  const parties = base.parties.filter(p => garder.has(p.num));
  const questions = base.questions.filter(q => garder.has(q.partie));

  const dtrUtiles = new Set<number>([...parties.flatMap(p => p.dtrPages), ...questions.flatMap(q => q.dtr)]);
  const dtr = base.dtr.filter(p => dtrUtiles.has(p.num));

  const pagesUtiles = new Set<number>(questions.map(q => q.pageSujet));
  for (const p of parties) {
    // Page de la mise en situation : première page du sujet rangée dans la partie.
    const situation = base.pagesSujet.find(x => x.section === `Partie ${p.num}`);
    if (situation) pagesUtiles.add(situation.num);
  }
  const pagesSujet = base.pagesSujet.filter(p => pagesUtiles.has(p.num));

  const plurielParties = parties.length > 1;
  const numsParties = parties.map(p => p.num).join(', ').replace(/, (\d+)$/, ' et $1');
  const consignes = [
    `Durée : ${dureeLisible(d.dureeMin)}.`,
    `Sujet thématique : ${plurielParties ? 'parties' : 'partie'} ${numsParties} du sujet « ${base.titre} ». `
      + `Les questions gardent leur numéro du sujet complet (${intervalle(questions.map(q => q.num))}).`,
    ...base.consignes.filter(c => !/^Durée\s*:/.test(c) && !/parties de ce sujet sont indépendantes/.test(c)),
  ];

  const contexte = base.problematique.split('\n')[0];
  const lignes = parties.map(p => problematiqueDePartie(p.situation) ?? `${p.titre}.`);
  const problematique = [contexte, ...lignes].join('\n');

  const prefixe = base.nomCourt ? `${base.nomCourt} · ` : '';
  return {
    ...base,
    id: d.id,
    titre: `${prefixe}${d.titre}`,
    sousTitre: d.sousTitre ?? `Sujet thématique · ${questions.length} questions · ${dureeLisible(d.dureeMin)}`,
    dureeMin: d.dureeMin,
    consignes,
    problematique,
    dtr,
    pagesSujet,
    parties,
    questions,
    themes: [d.theme],
    declinaisons: undefined,
    parent: base.id,
  };
}

/** Un `SujetNumerique` par déclinaison du sujet de base (dans l'ordre des déclinaisons). */
export function sujetsDerives(base: SujetNumerique): SujetNumerique[] {
  return (base.declinaisons ?? []).map(d => sujetDerive(base, d));
}

/** Thème principal d'un sujet (le premier), s'il en a un. */
export const themePrincipal = (s: SujetNumerique): ThemeSujet | null => s.themes?.[0] ?? null;

/** Chiffres d'un sujet pour les cartes du catalogue et la vue professeur. */
export interface ResumeSujet {
  questions: number;
  premiere: number;
  derniere: number;
  points: number;
  /** Pages DTR conseillées par les parties (première et dernière). */
  dtrDe: number | null;
  dtrA: number | null;
  dtrPages: number;
  competences: string[];
}

export function resumeSujet(s: SujetNumerique): ResumeSujet {
  const nums = s.questions.map(q => q.num);
  const dtrParties = s.parties.flatMap(p => p.dtrPages);
  return {
    questions: s.questions.length,
    premiere: nums.length ? Math.min(...nums) : 0,
    derniere: nums.length ? Math.max(...nums) : 0,
    points: Math.round(s.questions.reduce((a, q) => a + q.points, 0) * 100) / 100,
    dtrDe: dtrParties.length ? Math.min(...dtrParties) : null,
    dtrA: dtrParties.length ? Math.max(...dtrParties) : null,
    dtrPages: s.dtr.length,
    competences: Array.from(new Set(s.parties.flatMap(p => p.competences)))
      .sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0) || a.localeCompare(b)),
  };
}
