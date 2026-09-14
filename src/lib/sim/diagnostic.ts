/**
 * Diagnostic par hypothèses — ce que chaque mesure permet réellement de conclure.
 *
 * L'étape de dépannage demandait à l'élève de désigner la cause dans une liste,
 * et lui disait aussitôt si c'était la bonne. On pouvait donc « réussir » en
 * cliquant les cinq pannes l'une après l'autre : ce n'était pas un diagnostic,
 * c'était un tirage.
 *
 * La démarche de maintenance est autre : constat → hypothèses hiérarchisées →
 * vérifications → localisation par élimination → correction → essai. Et la
 * vérification se DÉFINIT avant de se faire : quoi vérifier, comment, où, dans
 * quelles conditions, et quel résultat on attend.
 *
 * Ce module fournit de quoi tenir cette démarche :
 *
 * - `departage` dit, pour une mesure donnée, quelles hypothèses elle sépare.
 *   C'est le cœur : on rejoue la même mesure sur chaque panne supposée et on
 *   regarde lesquelles auraient donné autre chose. Une bonne vérification en
 *   infirme plusieurs d'un coup — c'est ce qu'on cherche à faire valoir.
 *
 * - `verdictImpose` dit ce que la mesure autorise à conclure, indépendamment de
 *   ce que l'élève espérait. Le journal enregistre ce que dit l'appareil.
 *
 * - `zoneDe` donne les bornes à mettre en évidence : le VOISINAGE de la panne
 *   supposée, pas son emplacement exact. Entourer les deux bonnes bornes
 *   donnerait la réponse ; entourer la zone dit seulement où chercher.
 */
import type { AttemptState, Fault, HypTest, Prevision, TpDefinition } from '../types';
import type { SimState } from './engine';
import {
  reseauCommande, resistanceCommande, tensionCommande, type Arete, type Contexte,
} from './commande';

/** Une vérification, telle que l'élève la définit avant de la faire. */
export interface Verification {
  /** Position du sélecteur (« V~ », « Ω », « RPE 200 mA »…). */
  dial: string;
  a: string | null;
  b: string | null;
  /** État du montage pendant la mesure. */
  ctx: Contexte;
  /** Platine sous tension ? (l'ohmmètre se refuse si oui) */
  sousTension: boolean;
}

const OHM = ['Ω', '•))', 'RPE 200 mA'];
export const estOhmmetre = (dial: string): boolean => OHM.includes(dial);

/**
 * Ce que l'appareil afficherait si la panne était `fault`.
 * `null` = OL (les deux pointes ne sont pas dans le même morceau de circuit).
 */
function valeurSi(
  tp: TpDefinition,
  st: Pick<AttemptState, 'wires'>,
  sim: SimState,
  v: Verification,
  fault: string | null,
): number | null {
  if (!v.a || !v.b) return null;
  const e: Arete[] = reseauCommande(tp, { ...st, fault }, sim, v.ctx);
  if (estOhmmetre(v.dial)) {
    // hors tension seulement : sous tension, l'appareil refuse et ne mesure rien
    return v.sousTension ? null : resistanceCommande(e, v.a, v.b);
  }
  if (!v.sousTension) return 0;
  return tensionCommande(e, v.a, v.b, sim.u2 ?? tp.trafo?.bobine ?? 24);
}

const memeLecture = (x: number | null, y: number | null): boolean =>
  (x === null && y === null) || (x !== null && y !== null && Math.abs(x - y) < 0.05);

/**
 * Hypothèses que cette mesure départage : celles qui auraient donné une autre
 * lecture que celle obtenue, et qui tombent donc.
 *
 * On rejoue la mesure sur chaque hypothèse et on compare à la lecture réelle.
 * C'est exactement le calcul de `scripts/audit-diagnostic.ts`, appliqué non plus
 * à toutes les paires de bornes mais à celle que l'élève vient de choisir.
 */
export function departage(
  tp: TpDefinition,
  st: Pick<AttemptState, 'wires' | 'fault'>,
  sim: SimState,
  v: Verification,
  hypotheses: readonly string[],
): string[] {
  const reelle = valeurSi(tp, st, sim, v, st.fault);
  return hypotheses.filter(id => !memeLecture(valeurSi(tp, st, sim, v, id), reelle));
}

/**
 * Ce que la mesure autorise à conclure sur l'hypothèse visée.
 * `'out'` : elle aurait donné autre chose, donc elle tombe.
 * `'keep'` : la lecture lui est compatible, elle reste debout.
 */
export function verdictImpose(
  tp: TpDefinition,
  st: Pick<AttemptState, 'wires' | 'fault'>,
  sim: SimState,
  v: Verification,
  hypothese: string,
): 'out' | 'keep' {
  return departage(tp, st, sim, v, [hypothese]).length ? 'out' : 'keep';
}

/** La prévision annoncée avant la mesure est-elle tenue par le relevé ? */
export function previsionTenue(
  p: Prevision,
  dial: string,
  valeur: number | null,
  ol: boolean,
): boolean {
  const ohm = estOhmmetre(dial);
  switch (p) {
    case 'ol': return ol;
    case 'cont': return ohm && !ol && valeur != null && valeur < 5;
    case '24': return !ohm && valeur != null && valeur > 20;
    case '0': return !ohm && valeur != null && valeur < 1;
    default: return false;
  }
}

/** Libellé d'une prévision, pour le journal et le rapport. */
export const LIBELLE_PREVISION: Record<Prevision, string> = {
  '24': 'tension présente',
  '0': '0 V',
  cont: 'continuité',
  ol: 'circuit ouvert',
};

/**
 * Bornes à mettre en évidence pour une hypothèse : le voisinage de l'organe mis
 * en cause dans le réseau sain, à `rayon` liaisons.
 *
 * Le rayon est le réglage de l'aide : trop petit, on désigne la panne ; trop
 * grand, on éclaire tout le circuit et on n'aide plus. Quatre liaisons couvrent
 * la branche autour du défaut sans la réduire à ses deux bornes.
 */
export function zoneDe(
  tp: TpDefinition,
  st: Pick<AttemptState, 'wires'>,
  sim: SimState,
  ctx: Contexte,
  hypothese: string,
  rayon = 4,
): string[] {
  const f: Fault | undefined = tp.faults.find(x => x.id === hypothese);
  if (!f) return [];
  const sain = reseauCommande(tp, { ...st, fault: null }, sim, ctx);

  // point de départ : les bornes de la liaison coupée, ou celles du contact ouvert
  let depart: string[] = [];
  if (f.coupe) depart = f.coupe.split('>');
  if (f.ouvre) {
    const casse = reseauCommande(tp, { ...st, fault: f.id }, sim, ctx);
    const ids = new Set(casse.map(x => x.id));
    for (const x of sain) if (x.id && !ids.has(x.id)) depart.push(x.a, x.b);
  }
  if (!depart.length) return [];

  const vus = new Set(depart);
  let front = depart;
  for (let i = 0; i < rayon && front.length; i++) {
    const suivant: string[] = [];
    for (const x of sain) {
      if (front.includes(x.a) && !vus.has(x.b)) { vus.add(x.b); suivant.push(x.b); }
      if (front.includes(x.b) && !vus.has(x.a)) { vus.add(x.a); suivant.push(x.a); }
    }
    front = suivant;
  }
  return Array.from(vus);
}

/* ------------------------------------------------------- avancement */

/** Hypothèses encore debout : posées et non éliminées par un test. */
export function hypothesesVivantes(st: Pick<AttemptState, 'hypotheses' | 'hypTests'>): string[] {
  const tombees = new Set(st.hypTests.filter(t => t.verdict === 'out').map(t => t.id));
  return st.hypotheses.filter(id => !tombees.has(id));
}

/**
 * La conclusion est-elle ouverte ?
 *
 * Trois conditions, qui disent toutes la même chose : le terrain a été fait.
 * Sans elles, l'élève retomberait dans le tirage que cette étape doit empêcher.
 */
export function conclusionOuverte(
  st: Pick<AttemptState, 'hypotheses' | 'hypTests'>,
): { ouverte: boolean; manque: string } {
  if (st.hypotheses.length < 2) {
    return { ouverte: false, manque: 'Pose d\'abord au moins deux hypothèses.' };
  }
  if (st.hypTests.length < 1) {
    return { ouverte: false, manque: 'Fais au moins un test avant de conclure.' };
  }
  const vivantes = hypothesesVivantes(st);
  if (vivantes.length > 2) {
    return {
      ouverte: false,
      manque: `${vivantes.length} hypothèses tiennent encore : continue à éliminer.`,
    };
  }
  return { ouverte: true, manque: '' };
}

/**
 * Qualité du raisonnement, de 0 à 1 — ce qui remplace « trouvé en n essais ».
 *
 * Trois choses comptent, et aucune n'est la bonne réponse finale :
 * la justesse des prévisions (comprend-il le circuit ?), l'économie de tests
 * (une vérification qui infirme plusieurs hypothèses vaut mieux que trois qui
 * n'en infirment qu'une), et le fait de ne pas avoir conclu au hasard.
 */
export function qualiteRaisonnement(
  st: Pick<AttemptState, 'hypotheses' | 'hypTests' | 'diagTries'>,
): { previsions: number; rendement: number; essais: number; score: number } {
  const n = st.hypTests.length;
  if (!n) return { previsions: 0, rendement: 0, essais: 0, score: 0 };
  const previsions = st.hypTests.filter(t => t.prevu).length / n;
  // rendement : hypothèses départagées par test, rapporté au nombre posé
  const separees = st.hypTests.reduce((s, t) => s + t.departage, 0);
  const rendement = Math.min(1, separees / Math.max(1, n * 1.5));
  const essais = st.diagTries <= 1 ? 1 : st.diagTries === 2 ? 0.7 : 0.4;
  return {
    previsions, rendement, essais,
    score: 0.35 * previsions + 0.25 * rendement + 0.4 * essais,
  };
}

/** Ligne de journal lisible, pour le rapport du professeur. */
export function ligneTest(tp: TpDefinition, t: HypTest): string {
  const titre = tp.faults.find(f => f.id === t.id)?.title ?? t.id;
  const ou = t.a && t.b ? ` ${t.a} / ${t.b}` : '';
  return `${t.dial}${ou} → ${t.lu} (prévu : ${LIBELLE_PREVISION[t.attendu]}${t.prevu ? ' ✓' : ' ✗'})`
    + ` — ${titre} ${t.verdict === 'out' ? 'éliminée' : 'retenue'}`
    + `, ${t.departage} hypothèse${t.departage > 1 ? 's' : ''} départagée${t.departage > 1 ? 's' : ''}`;
}
