/**
 * Correction automatique d'un sujet numérique (module pur, sans React, testable).
 *
 * `corriger(question, reponse)` rend une `CorrectionQuestion` : score 0..1 (fraction des
 * points de la question) et statut. Barème par outil :
 *  - cocher : QCM simple exact = 1 ; choix multiple = (cases justes − cases fausses) / cases attendues, min 0 ;
 *  - relier / ordonner / bulles / cavaliers : proportion d'éléments justes ;
 *  - valeur / tableau : proportion de champs justes (numérique avec tolérance, ou texte normalisé parmi `acceptes`) ;
 *  - calcul : résultat dans la tolérance = 1 ; sinon ½ si la formule contient tous les mots-clés ; sinon 0 ;
 *  - redige : pré-note par mots-clés (≥ min → 1 ; ≥ 1 → ½ ; sinon 0), statut `aValider` (professeur) ;
 *  - schema : ½ « traits » + ½ « câblage réel » (voir `corrigerSchema`).
 * Sans réponse → statut `sansReponse`, score 0.
 */

import type {
  CelluleSaisie, ChampValeur, CorrectionQuestion, QBulles, QCalcul, QCavaliers, QCocher, QOrdonner,
  QRedige, QRelier, QSchema, QTableau, QValeur, ReponseSujet, SujetAttemptState, SujetNumerique,
  SujetQuestion, TraitPose,
} from './types';
import { contientMotCle, estVide, nombreJuste, normTexte, texteAccepte } from './normalize';

/* ───────────────────────────── utilitaires ───────────────────────────── */

const borne = (x: number) => Math.max(0, Math.min(1, x));
/** Arrondi à 4 décimales pour éviter les 0,30000000004 dans les copies. */
const r4 = (x: number) => Math.round(x * 10000) / 10000;

const sansReponse = (num: number): CorrectionQuestion => ({ num, score: 0, statut: 'sansReponse', detail: 'Sans réponse' });
const auto = (num: number, score: number, detail?: string): CorrectionQuestion =>
  ({ num, score: r4(borne(score)), statut: 'auto', detail });

/** Clé non orientée d'une liaison entre deux bornes. */
export const cleLiaison = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Clé d'une position de cavalier dans `ReponseSujet.valeurs`. */
export const cleCavalier = (composant: string, position: string) => `${composant}.${position}`;

/** Une cellule / un champ est-il noté (porte une réponse attendue) ? */
function estNote(c: { attendu?: number; acceptes?: string[] }): boolean {
  return c.attendu != null || (c.acceptes != null && c.acceptes.length > 0);
}

/** Juste / faux d'une saisie de champ ou de cellule (numérique et/ou texte). */
export function saisieJuste(v: string | undefined, c: ChampValeur | CelluleSaisie): boolean {
  if (estVide(v)) return false;
  if (texteAccepte(v, c.acceptes)) return true;
  if (c.attendu != null) {
    // Une cellule à choix (« oui » / « non ») n'a pas de valeur numérique : texte seul.
    return nombreJuste(v, c.attendu, c.tolerance);
  }
  return false;
}

/* ───────────────────────────── réponse donnée ? ───────────────────────────── */

/** L'élève a-t-il répondu (au moins en partie) à la question ? */
export function estRepondue(q: SujetQuestion, r: ReponseSujet | undefined): boolean {
  if (!r || r.type !== q.type) return false;
  switch (r.type) {
    case 'cocher': return r.choix.length > 0;
    case 'relier': return r.liens.some(l => l != null);
    case 'ordonner': return r.rangs.some(x => x != null);
    case 'valeur': return Object.values(r.valeurs).some(v => !estVide(v));
    case 'calcul': return !estVide(r.resultat) || !estVide(r.formule) || !estVide(r.application);
    case 'tableau': return Object.values(r.cellules).some(v => !estVide(v));
    case 'redige': return !estVide(r.texte);
    case 'bulles': return Object.values(r.valeurs).some(v => !estVide(v));
    case 'cavaliers': return Object.values(r.valeurs).some(v => !estVide(v));
    case 'schema': return r.traits.length > 0 || r.platine != null;
  }
}

/* ───────────────────────────── par outil ───────────────────────────── */

function corrigerCocher(q: QCocher, choix: number[]): CorrectionQuestion {
  const coches = Array.from(new Set(choix));
  if (coches.length === 0) return sansReponse(q.num);
  const bonnes = new Set(q.bonnes);
  if (!q.multiple && q.bonnes.length === 1) {
    const ok = coches.length === 1 && coches[0] === q.bonnes[0];
    return auto(q.num, ok ? 1 : 0, ok ? 'Case juste' : 'Case fausse');
  }
  const justes = coches.filter(i => bonnes.has(i)).length;
  const fausses = coches.length - justes;
  const score = bonnes.size ? (justes - fausses) / bonnes.size : 0;
  return auto(q.num, score, `${justes}/${bonnes.size} case${bonnes.size > 1 ? 's' : ''} juste${justes > 1 ? 's' : ''}${fausses ? `, ${fausses} en trop` : ''}`);
}

function corrigerRelier(q: QRelier, liens: (number | null)[]): CorrectionQuestion {
  if (!liens.some(l => l != null)) return sansReponse(q.num);
  const n = q.liens.length;
  const justes = q.liens.filter((att, i) => liens[i] === att).length;
  return auto(q.num, n ? justes / n : 0, `${justes}/${n} liaisons justes`);
}

function corrigerOrdonner(q: QOrdonner, rangs: (number | null)[]): CorrectionQuestion {
  if (!rangs.some(x => x != null)) return sansReponse(q.num);
  const n = q.rangs.length;
  const justes = q.rangs.filter((att, i) => rangs[i] === att).length;
  return auto(q.num, n ? justes / n : 0, `${justes}/${n} rangs justes`);
}

function corrigerValeur(q: QValeur, valeurs: Record<string, string>): CorrectionQuestion {
  if (!Object.values(valeurs).some(v => !estVide(v))) return sansReponse(q.num);
  const notes = q.champs.filter(estNote);
  const justes = notes.filter(c => saisieJuste(valeurs[c.id], c)).length;
  const n = notes.length;
  return auto(q.num, n ? justes / n : 0, n > 1 ? `${justes}/${n} valeurs justes` : justes ? 'Valeur juste' : 'Valeur fausse');
}

function cellulesSaisie(q: QTableau): CelluleSaisie[] {
  const out: CelluleSaisie[] = [];
  for (const l of q.lignes) for (const c of l.cellules) if (typeof c !== 'string') out.push(c);
  return out;
}

function corrigerTableau(q: QTableau, cellules: Record<string, string>): CorrectionQuestion {
  if (!Object.values(cellules).some(v => !estVide(v))) return sansReponse(q.num);
  const notes = cellulesSaisie(q).filter(estNote);
  const justes = notes.filter(c => saisieJuste(cellules[c.id], c)).length;
  const n = notes.length;
  return auto(q.num, n ? justes / n : 0, `${justes}/${n} cases justes`);
}

function corrigerCalcul(q: QCalcul, r: { formule: string; application: string; resultat: string }): CorrectionQuestion {
  if (estVide(r.resultat) && estVide(r.formule) && estVide(r.application)) return sansReponse(q.num);
  if (nombreJuste(r.resultat, q.attendu, q.tolerance)) return auto(q.num, 1, 'Résultat juste');
  const mots = q.formuleMotsCles ?? [];
  const presents = mots.filter(k => contientMotCle(r.formule, k)).length;
  if (mots.length > 0 && presents === mots.length) return auto(q.num, 0.5, 'Formule juste, résultat faux');
  return auto(q.num, 0, estVide(r.resultat) ? 'Résultat absent' : 'Résultat faux');
}

function corrigerRedige(q: QRedige, texte: string): CorrectionQuestion {
  if (estVide(texte)) return sansReponse(q.num);
  const trouves = q.motsCles.filter(k => contientMotCle(texte, k));
  const min = Math.max(1, q.minMotsCles);
  const score = trouves.length >= min ? 1 : trouves.length >= 1 ? 0.5 : 0;
  return {
    num: q.num,
    score,
    statut: 'aValider',
    detail: `Mots-clés : ${trouves.length}/${min}${trouves.length ? ` (${trouves.join(', ')})` : ''} — pré-note à valider par le professeur`,
  };
}

function corrigerBulles(q: QBulles, valeurs: Record<string, string>): CorrectionQuestion {
  if (!Object.values(valeurs).some(v => !estVide(v))) return sansReponse(q.num);
  const n = q.bulles.length;
  const justes = q.bulles.filter(b => texteAccepte(valeurs[b.id], [b.attendu, ...(b.acceptes ?? [])])).length;
  return auto(q.num, n ? justes / n : 0, `${justes}/${n} bulles justes`);
}

/** Valeur « aucun cavalier » : tiret, vide ou 0 écrit « — ». */
const AUCUN = new Set(['', '-', 'aucun', 'sans']);
const normCavalier = (v: string | undefined) => {
  const n = normTexte(v);
  return AUCUN.has(n) ? '-' : n;
};

/** Valeur de cavalier juste (« — », « - » et vide = aucun cavalier) ? */
export const cavalierJuste = (v: string | undefined, attendu: string) => normCavalier(v) === normCavalier(attendu);

function corrigerCavaliers(q: QCavaliers, valeurs: Record<string, string>): CorrectionQuestion {
  if (!Object.values(valeurs).some(v => !estVide(v))) return sansReponse(q.num);
  let n = 0;
  let justes = 0;
  for (const c of q.composants) {
    for (const p of c.positions) {
      n += 1;
      if (cavalierJuste(valeurs[cleCavalier(c.id, p.id)], p.attendu)) justes += 1;
    }
  }
  return auto(q.num, n ? justes / n : 0, `${justes}/${n} cavaliers justes`);
}

/** Détail de la correction des traits d'un schéma (aussi utilisé pour colorer les traits). */
export interface EtatTraits {
  /** Clés des liaisons attendues présentes avec la bonne couleur (ou couleur non notée). */
  justes: Set<string>;
  /** Clés attendues présentes mais d'une mauvaise couleur (½ liaison). */
  mauvaiseCouleur: Set<string>;
  /** Clés posées qui ne sont pas attendues. */
  fausses: Set<string>;
  /** Clés attendues absentes. */
  manquantes: Set<string>;
  /** Score 0..1 de la moitié « traits ». */
  score: number;
  total: number;
  /** Correction par réseau (`SchemaTraitsDef.reseaux`) : bilan des réseaux. */
  reseaux?: {
    /** Réseaux entièrement reliés (toutes leurs bornes dans une seule composante). */
    complets: number;
    total: number;
    /** Réseaux dont un trait n'a pas la couleur attendue (score du réseau × ½). */
    couleurFausse: number;
    /** Traits entre deux réseaux différents ou hors réseau (−1/nbRéseaux chacun). */
    fautes: number;
  };
}

/** Composantes connexes (union-find) d'un ensemble de bornes reliées par des arêtes. */
function composantes(bornes: string[], aretes: [string, string][]): string[][] {
  const parent = new Map(bornes.map(b => [b, b]));
  const racine = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  for (const [a, b] of aretes) {
    if (!parent.has(a) || !parent.has(b)) continue;
    const ra = racine(a); const rb = racine(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const groupes = new Map<string, string[]>();
  for (const b of bornes) {
    const r = racine(b);
    groupes.set(r, [...(groupes.get(r) ?? []), b]);
  }
  return Array.from(groupes.values());
}

/**
 * Moitié « traits » corrigée PAR RÉSEAU : chaque réseau vaut (plus grande composante − 1)/(n − 1)
 * des traits de l'élève restreints à ses bornes (× ½ si un de ses traits n'a pas la couleur
 * attendue) ; chaque trait qui ne relie pas deux bornes d'un même réseau est une faute
 * (−1/nbRéseaux). Score = max(0, moyenne des réseaux − fautes).
 */
function etatReseaux(q: QSchema, traits: TraitPose[]): EtatTraits {
  const reseaux = q.traits.reseaux ?? [];
  const reseauDe = new Map<string, number>();
  reseaux.forEach((r, i) => r.bornes.forEach(b => { if (!reseauDe.has(b)) reseauDe.set(b, i); }));

  // Un trait par paire (le dernier posé fait foi pour la couleur).
  const poses = new Map<string, TraitPose>();
  for (const t of traits) if (t.a !== t.b) poses.set(cleLiaison(t.a, t.b), t);

  const justes = new Set<string>();
  const mauvaiseCouleur = new Set<string>();
  const fausses = new Set<string>();
  const internes: [string, string][][] = reseaux.map(() => []);
  const couleurKo = reseaux.map(() => false);
  poses.forEach((t, k) => {
    const ra = reseauDe.get(t.a);
    const rb = reseauDe.get(t.b);
    if (ra == null || rb == null || ra !== rb) { fausses.add(k); return; }
    internes[ra].push([t.a, t.b]);
    const attendue = reseaux[ra].couleur;
    if (attendue && t.couleur !== attendue) { mauvaiseCouleur.add(k); couleurKo[ra] = true; } else justes.add(k);
  });

  const manquantes = new Set<string>();
  let somme = 0;
  let complets = 0;
  reseaux.forEach((r, i) => {
    const bornes = Array.from(new Set(r.bornes));
    const n = bornes.length;
    const groupes = composantes(bornes, internes[i]);
    const principale = groupes.reduce((a, g) => (g.length > a.length ? g : a), [] as string[]);
    let sr = n > 1 ? (principale.length - 1) / (n - 1) : 1;
    if (principale.length === n) complets += 1;
    else {
      const dans = new Set(principale);
      for (const l of q.traits.attendues) {
        if (reseauDe.get(l.a) !== i || reseauDe.get(l.b) !== i) continue;
        const k = cleLiaison(l.a, l.b);
        if (!poses.has(k) && !(dans.has(l.a) && dans.has(l.b))) manquantes.add(k);
      }
    }
    if (couleurKo[i]) sr *= 0.5;
    somme += sr;
  });
  const nb = reseaux.length;
  const score = nb ? borne(somme / nb - fausses.size / nb) : 0;
  return {
    justes, mauvaiseCouleur, fausses, manquantes, score,
    total: q.traits.attendues.length,
    reseaux: { complets, total: nb, couleurFausse: couleurKo.filter(Boolean).length, fautes: fausses.size },
  };
}

/**
 * Moitié « traits » d'un schéma : proportion des liaisons attendues posées, moins les
 * liaisons fausses (min 0). Une liaison juste de mauvaise couleur compte pour ½.
 */
export function etatTraits(q: QSchema, traits: TraitPose[]): EtatTraits {
  if (q.traits.reseaux && q.traits.reseaux.length > 0) return etatReseaux(q, traits);
  const attendues = new Map(q.traits.attendues.map(l => [cleLiaison(l.a, l.b), l.couleur]));
  const poses = new Map<string, Set<string>>();
  for (const t of traits) {
    if (t.a === t.b) continue;
    const k = cleLiaison(t.a, t.b);
    const s = poses.get(k) ?? new Set<string>();
    s.add(t.couleur);
    poses.set(k, s);
  }
  const justes = new Set<string>();
  const mauvaiseCouleur = new Set<string>();
  const fausses = new Set<string>();
  const manquantes = new Set<string>();
  attendues.forEach((couleur, k) => {
    const s = poses.get(k);
    if (!s) manquantes.add(k);
    else if (!couleur || s.has(couleur)) justes.add(k);
    else mauvaiseCouleur.add(k);
  });
  poses.forEach((_, k) => { if (!attendues.has(k)) fausses.add(k); });
  const total = attendues.size;
  const pts = justes.size + 0.5 * mauvaiseCouleur.size - fausses.size;
  return { justes, mauvaiseCouleur, fausses, manquantes, total, score: total ? borne(pts / total) : 0 };
}

/** Moitié « câblage réel » : conformes/total × 0,5 + 0,25 sous tension + 0,25 essai. */
export function scorePlatine(p: { conformes: number; total: number; sousTension: boolean; essai: boolean } | null): number {
  if (!p) return 0;
  const cablage = p.total > 0 ? borne(p.conformes / p.total) : 0;
  return borne(cablage * 0.5 + (p.sousTension ? 0.25 : 0) + (p.essai ? 0.25 : 0));
}

function corrigerSchema(q: QSchema, r: Extract<ReponseSujet, { type: 'schema' }>): CorrectionQuestion {
  if (r.traits.length === 0 && r.platine == null) return sansReponse(q.num);
  const t = etatTraits(q, r.traits);
  const p = scorePlatine(r.platine);
  const detailTraits = t.reseaux
    ? `traits : ${t.reseaux.complets}/${t.reseaux.total} réseaux`
      + (t.reseaux.couleurFausse ? ` (${t.reseaux.couleurFausse} de mauvaise couleur)` : '')
      + (t.reseaux.fautes ? `, ${t.reseaux.fautes} trait${t.reseaux.fautes > 1 ? 's' : ''} faux` : '')
    : `traits : ${t.justes.size + t.mauvaiseCouleur.size}/${t.total} liaisons`
      + (t.mauvaiseCouleur.size ? ` (${t.mauvaiseCouleur.size} de mauvaise couleur)` : '')
      + (t.fausses.size ? `, ${t.fausses.size} fausse${t.fausses.size > 1 ? 's' : ''}` : '');
  const detailPlatine = r.platine
    ? `câblage réel : ${r.platine.conformes}/${r.platine.total} liaisons, ${r.platine.sousTension ? 'sous tension ✓' : 'mise sous tension ✗'}, ${r.platine.essai ? 'essai ✓' : 'essai ✗'}`
    : 'câblage réel : non fait';
  return auto(q.num, 0.5 * t.score + 0.5 * p, `${detailTraits} · ${detailPlatine}`);
}

/* ───────────────────────────── point d'entrée ───────────────────────────── */

/** Correction automatique d'une question (réponse absente ou d'un autre outil → sans réponse). */
export function corriger(q: SujetQuestion, r: ReponseSujet | undefined): CorrectionQuestion {
  if (!r || r.type !== q.type) return sansReponse(q.num);
  switch (q.type) {
    case 'cocher': return corrigerCocher(q, (r as Extract<ReponseSujet, { type: 'cocher' }>).choix);
    case 'relier': return corrigerRelier(q, (r as Extract<ReponseSujet, { type: 'relier' }>).liens);
    case 'ordonner': return corrigerOrdonner(q, (r as Extract<ReponseSujet, { type: 'ordonner' }>).rangs);
    case 'valeur': return corrigerValeur(q, (r as Extract<ReponseSujet, { type: 'valeur' }>).valeurs);
    case 'calcul': return corrigerCalcul(q, r as Extract<ReponseSujet, { type: 'calcul' }>);
    case 'tableau': return corrigerTableau(q, (r as Extract<ReponseSujet, { type: 'tableau' }>).cellules);
    case 'redige': return corrigerRedige(q, (r as Extract<ReponseSujet, { type: 'redige' }>).texte);
    case 'bulles': return corrigerBulles(q, (r as Extract<ReponseSujet, { type: 'bulles' }>).valeurs);
    case 'cavaliers': return corrigerCavaliers(q, (r as Extract<ReponseSujet, { type: 'cavaliers' }>).valeurs);
    case 'schema': return corrigerSchema(q, r as Extract<ReponseSujet, { type: 'schema' }>);
  }
}

/**
 * Corrige toute la copie. Les notes posées par le professeur (`statut: 'prof'`) sont
 * conservées ; tout le reste est recalculé à partir des réponses.
 */
export function corrigerCopie(sujet: SujetNumerique, st: SujetAttemptState): Record<number, CorrectionQuestion> {
  const out: Record<number, CorrectionQuestion> = {};
  for (const q of sujet.questions) {
    const prev = st.corrections[q.num];
    out[q.num] = prev && prev.statut === 'prof' ? prev : corriger(q, st.reponses[q.num]);
  }
  return out;
}

/** Note posée par le professeur sur une question (0..1), qui remplace la pré-correction. */
export function correctionProf(num: number, score: number, detail?: string): CorrectionQuestion {
  return { num, score: r4(borne(score)), statut: 'prof', detail: detail ?? 'Note du professeur' };
}
