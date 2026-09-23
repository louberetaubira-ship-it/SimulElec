/**
 * Correction automatique d'un sujet numérique (module pur, sans React, testable).
 *
 * `corriger(question, reponse)` rend une `CorrectionQuestion` : score 0..1 (fraction des
 * points de la question) et statut. Barème par outil :
 *  - cocher : QCM simple exact = 1 ; choix multiple = (cases justes − cases fausses) / cases attendues, min 0 ;
 *  - relier / ordonner / bulles / cavaliers : proportion d'éléments justes ;
 *  - valeur / tableau : proportion de champs justes (numérique avec tolérance, ou texte normalisé parmi `acceptes`) ;
 *  - calcul : résultat dans la tolérance = 1 ; sinon ½ si la formule est juste (par ÉQUIVALENCE quand
 *    `formuleSpec` est présent, sinon si elle contient tous les mots-clés) ; sinon 0. Une application
 *    numérique dont la valeur tombe sur le résultat attendu est signalée au professeur (`detail`) ;
 *  - redige : pré-note par mots-clés (≥ min → 1 ; ≥ 1 → ½ ; sinon 0), statut `aValider` (professeur) ;
 *  - schema : ½ « traits » + ½ « câblage réel » (voir `corrigerSchema`) ;
 *  - placement : appariement glouton au plus proche dans l'ellipse de tolérance ;
 *    points = max(0, bien placés − repères en trop) / attendus (voir `etatPlacement`) ;
 *    avec des champs notés : ½ placement + ½ champs.
 * Sans réponse → statut `sansReponse`, score 0.
 *
 * Formules : un champ / une cellule avec `formule` (FormuleSpec) est jugé par équivalence
 * mathématique (`formules.ts`), en plus des `acceptes` éventuels. Une saisie `maths` (LaTeX) est
 * lue numériquement (`0{,}85`, `\frac{3}{4}`) et transcrite en texte pour les `acceptes`.
 * Erreurs typiques (`QuestionBase.erreursTypiques`) : reconnues sur les champs FAUX → ids dans
 * `erreurs`, premier message dans `message`. Verdict par élément dans `champs` (coloration côté
 * élève sans corrigé) : id de champ / cellule / bulle, `composant.position`, index d'option,
 * de ligne ou d'étape, `formule` / `resultat` (calcul), `p<i>` (repère posé), `t:<a>|<b>` (trait
 * juste / faux), `tc:<a>|<b>` (trait juste de mauvaise couleur).
 */

import type {
  CelluleSaisie, ChampValeur, CorrectionQuestion, ErreurTypique, FormuleSpec, QBulles, QCalcul, QCavaliers, QCocher,
  QOrdonner, QPlacement, QRedige, QRelier, QSchema, QTableau, QValeur, ReponseSujet, SujetAttemptState, SujetNumerique,
  SujetQuestion, TraitPose,
} from './types';
import { contientMotCle, estVide, nombreJuste, parseNombre, texteAccepte, toleranceParDefaut } from './normalize';
import { correspondA, equivalentes, latexVersTexte, valeurNumerique, valeursNumeriques } from './formules';
import { cavalierJuste, cleCavalier, cleLiaison, etatPlacement, resumePlacement } from './correction-base';

export { cavalierJuste, cleCavalier, cleLiaison, correctionProf, etatPlacement, nomReperes, resumePlacement } from './correction-base';
export type { EtatPlacement } from './correction-base';

/* ───────────────────────────── utilitaires ───────────────────────────── */

const borne = (x: number) => Math.max(0, Math.min(1, x));
/** Arrondi à 4 décimales pour éviter les 0,30000000004 dans les copies. */
const r4 = (x: number) => Math.round(x * 10000) / 10000;

const sansReponse = (num: number): CorrectionQuestion => ({ num, score: 0, statut: 'sansReponse', detail: 'Sans réponse' });
const auto = (num: number, score: number, detail?: string): CorrectionQuestion =>
  ({ num, score: r4(borne(score)), statut: 'auto', detail });

/** Une cellule / un champ est-il noté (porte une réponse attendue ou une formule) ? */
function estNote(c: { attendu?: number; acceptes?: string[]; formule?: FormuleSpec }): boolean {
  return c.attendu != null || (c.acceptes != null && c.acceptes.length > 0) || c.formule != null;
}

type Saisie = ChampValeur | CelluleSaisie;

/** La saisie est-elle du LaTeX (éditeur de maths) ? */
const estMaths = (c: Pick<Saisie, 'saisie' | 'formule'>) => c.saisie === 'maths' || c.formule != null;

/** Nombre lu dans une saisie : LaTeX évalué (`0{,}85`, `\frac{3}{4}`) pour une saisie maths, sinon écriture française. */
function nombreSaisi(v: string | undefined, maths: boolean): number | null {
  if (estVide(v)) return null;
  if (maths) {
    const n = valeurNumerique(v as string);
    if (n != null) return n;
  }
  return parseNombre(v);
}

/** Juste / faux d'une saisie de champ ou de cellule (formule par équivalence, numérique et/ou texte). */
export function saisieJuste(v: string | undefined, c: Saisie): boolean {
  if (estVide(v)) return false;
  const maths = estMaths(c);
  if (c.formule && equivalentes(v as string, c.formule).ok) return true;
  if (texteAccepte(v, c.acceptes)) return true;
  if (maths && texteAccepte(latexVersTexte(v as string), c.acceptes)) return true;
  if (c.attendu != null) {
    // Une cellule à choix (« oui » / « non ») n'a pas de valeur numérique : texte seul.
    if (maths) {
      const n = nombreSaisi(v, true);
      return n != null && nombreJuste(n, c.attendu, c.tolerance);
    }
    return nombreJuste(v, c.attendu, c.tolerance);
  }
  return false;
}

/* ───────────────────────────── erreurs typiques ───────────────────────────── */

/** Saisie confrontée aux erreurs typiques : id du champ (absent = réponse principale), texte, formule ? */
interface Cible {
  champ?: string;
  valeur: string | undefined;
  /** Saisie LaTeX. */
  maths?: boolean;
  /** Spec de tirage des formules (celle du champ, ou de la question). */
  spec?: FormuleSpec;
  /** Critères examinés pour cette cible (défaut : tous). */
  criteres?: ('valeurs' | 'nombre' | 'formule')[];
}

const SPEC_VIDE: FormuleSpec = { attendues: [], variables: {}, affichage: '' };

/** L'erreur typique `e` correspond-elle à la cible ? */
function erreurCorrespond(e: ErreurTypique, c: Cible): boolean {
  if (estVide(c.valeur)) return false;
  const v = c.valeur as string;
  const ok = (k: 'valeurs' | 'nombre' | 'formule') => !c.criteres || c.criteres.includes(k);
  if (e.valeurs?.length && ok('valeurs')) {
    if (texteAccepte(v, e.valeurs) || (c.maths && texteAccepte(latexVersTexte(v), e.valeurs))) return true;
  }
  if (e.nombre && ok('nombre')) {
    const n = nombreSaisi(v, !!c.maths);
    if (n != null && Math.abs(n - e.nombre.valeur) <= Math.max(0, e.nombre.tolerance) + 1e-9 * Math.max(1, Math.abs(e.nombre.valeur))) return true;
  }
  if (e.formule && ok('formule')) {
    if (correspondA(v, e.formule, c.spec ?? SPEC_VIDE)) return true;
  }
  return false;
}

/**
 * Erreurs typiques reconnues sur les cibles FAUSSES d'une question. Une erreur avec `champ` ne
 * vise que ce champ ; sans `champ`, elle vise la réponse principale (toutes les cibles).
 */
function erreursDe(q: SujetQuestion, cibles: Cible[]): Pick<CorrectionQuestion, 'erreurs' | 'message'> {
  const liste = q.erreursTypiques ?? [];
  if (!liste.length || !cibles.length) return {};
  const trouvees = liste.filter(e => cibles.some(c => (e.champ == null || e.champ === c.champ) && erreurCorrespond(e, c)));
  if (!trouvees.length) return {};
  return { erreurs: trouvees.map(e => e.id), message: trouvees[0].message };
}

/** Ajoute erreurs typiques et verdicts par élément à une correction. */
function completer(c: CorrectionQuestion, extra: Pick<CorrectionQuestion, 'erreurs' | 'message'>, champs?: Record<string, boolean>): CorrectionQuestion {
  const out = { ...c };
  if (extra.erreurs?.length) { out.erreurs = extra.erreurs; out.message = extra.message; }
  if (champs && Object.keys(champs).length) out.champs = champs;
  return out;
}

/**
 * Applications numériques (saisies `maths` non notées) dont la valeur tombe sur la valeur
 * attendue d'un champ numérique noté du même groupe (même ligne de tableau, même question).
 */
function applicationsCoherentes(groupe: Saisie[], valeurs: Record<string, string>): number {
  const cibles = groupe.filter(c => c.attendu != null && !('choix' in c && c.choix?.length));
  if (!cibles.length) return 0;
  let n = 0;
  for (const c of groupe) {
    if (c.saisie !== 'maths' || estNote(c) || estVide(valeurs[c.id])) continue;
    const vs = valeursNumeriques(valeurs[c.id]);
    if (cibles.some(t => vs.some(x => nombreJuste(x, t.attendu as number, t.tolerance)))) n += 1;
  }
  return n;
}

const mentionApplication = (n: number) => (n ? ` · application${n > 1 ? 's' : ''} cohérente${n > 1 ? 's' : ''}` : '');

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
    case 'placement': return r.points.length > 0 || Object.values(r.valeurs ?? {}).some(v => !estVide(v));
    case 'cavaliers': return Object.values(r.valeurs).some(v => !estVide(v));
    case 'schema': return r.traits.length > 0 || r.platine != null;
  }
}

/* ───────────────────────────── par outil ───────────────────────────── */

function corrigerCocher(q: QCocher, choix: number[]): CorrectionQuestion {
  const coches = Array.from(new Set(choix));
  if (coches.length === 0) return sansReponse(q.num);
  const bonnes = new Set(q.bonnes);
  // Verdict des seules cases cochées (ne révèle pas les bonnes cases non cochées).
  const champs = Object.fromEntries(coches.map(i => [String(i), bonnes.has(i)]));
  const fautes = coches.filter(i => !bonnes.has(i)).map(i => ({ valeur: q.options[i], criteres: ['valeurs' as const] }));
  const err = erreursDe(q, fautes);
  if (!q.multiple && q.bonnes.length === 1) {
    const ok = coches.length === 1 && coches[0] === q.bonnes[0];
    return completer(auto(q.num, ok ? 1 : 0, ok ? 'Case juste' : 'Case fausse'), err, champs);
  }
  const justes = coches.filter(i => bonnes.has(i)).length;
  const fausses = coches.length - justes;
  const score = bonnes.size ? (justes - fausses) / bonnes.size : 0;
  return completer(auto(q.num, score, `${justes}/${bonnes.size} case${bonnes.size > 1 ? 's' : ''} juste${justes > 1 ? 's' : ''}${fausses ? `, ${fausses} en trop` : ''}`), err, champs);
}

function corrigerRelier(q: QRelier, liens: (number | null)[]): CorrectionQuestion {
  if (!liens.some(l => l != null)) return sansReponse(q.num);
  const n = q.liens.length;
  const justes = q.liens.filter((att, i) => liens[i] === att).length;
  const champs: Record<string, boolean> = {};
  liens.forEach((l, i) => { if (l != null && i < n) champs[String(i)] = q.liens[i] === l; });
  return completer(auto(q.num, n ? justes / n : 0, `${justes}/${n} liaisons justes`), {}, champs);
}

function corrigerOrdonner(q: QOrdonner, rangs: (number | null)[]): CorrectionQuestion {
  if (!rangs.some(x => x != null)) return sansReponse(q.num);
  const n = q.rangs.length;
  const justes = q.rangs.filter((att, i) => rangs[i] === att).length;
  const champs: Record<string, boolean> = {};
  rangs.forEach((x, i) => { if (x != null && i < n) champs[String(i)] = q.rangs[i] === x; });
  return completer(auto(q.num, n ? justes / n : 0, `${justes}/${n} rangs justes`), {}, champs);
}

/** Verdicts, erreurs typiques et applications cohérentes d'une liste de champs / cellules. */
function corrigerSaisies(q: SujetQuestion, saisies: Saisie[], valeurs: Record<string, string>, groupes: Saisie[][]) {
  const notes = saisies.filter(estNote);
  const champs: Record<string, boolean> = {};
  const fautes: Cible[] = [];
  let justes = 0;
  for (const c of notes) {
    const v = valeurs[c.id];
    const ok = saisieJuste(v, c);
    if (!estVide(v)) champs[c.id] = ok;
    if (ok) justes += 1;
    else if (!estVide(v)) fautes.push({ champ: c.id, valeur: v, maths: estMaths(c), spec: c.formule });
  }
  // Saisies non notées (applications…) : cibles possibles d'une erreur typique visant leur champ.
  for (const c of saisies) {
    if (!estNote(c) && !estVide(valeurs[c.id])) fautes.push({ champ: c.id, valeur: valeurs[c.id], maths: estMaths(c) });
  }
  const err = erreursDe(q, fautes.filter(f => f.champ != null && (champs[f.champ] === false || !notes.some(n => n.id === f.champ))));
  const coherentes = groupes.reduce((a, g) => a + applicationsCoherentes(g, valeurs), 0);
  return { n: notes.length, justes, champs, err, coherentes };
}

function corrigerValeur(q: QValeur, valeurs: Record<string, string>): CorrectionQuestion {
  if (!Object.values(valeurs).some(v => !estVide(v))) return sansReponse(q.num);
  const { n, justes, champs, err, coherentes } = corrigerSaisies(q, q.champs, valeurs, [q.champs]);
  const detail = (n > 1 ? `${justes}/${n} valeurs justes` : justes ? 'Valeur juste' : 'Valeur fausse') + mentionApplication(coherentes);
  return completer(auto(q.num, n ? justes / n : 0, detail), err, champs);
}

function cellulesSaisie(q: QTableau): CelluleSaisie[] {
  const out: CelluleSaisie[] = [];
  for (const l of q.lignes) for (const c of l.cellules) if (typeof c !== 'string') out.push(c);
  return out;
}

function corrigerTableau(q: QTableau, cellules: Record<string, string>): CorrectionQuestion {
  if (!Object.values(cellules).some(v => !estVide(v))) return sansReponse(q.num);
  const lignes = q.lignes.map(l => l.cellules.filter((c): c is CelluleSaisie => typeof c !== 'string'));
  const { n, justes, champs, err, coherentes } = corrigerSaisies(q, cellulesSaisie(q), cellules, lignes);
  return completer(auto(q.num, n ? justes / n : 0, `${justes}/${n} cases justes${mentionApplication(coherentes)}`), err, champs);
}

/** La formule d'un calcul est-elle juste ? (équivalence si `formuleSpec`, sinon mots-clés ; `null` : non jugeable). */
function formuleCalculJuste(q: QCalcul, formule: string): boolean | null {
  if (estVide(formule)) return null;
  if (q.formuleSpec) return equivalentes(formule, q.formuleSpec).ok;
  const mots = q.formuleMotsCles ?? [];
  if (!mots.length) return null;
  return mots.every(k => contientMotCle(formule, k));
}

function corrigerCalcul(q: QCalcul, r: { formule: string; application: string; resultat: string }): CorrectionQuestion {
  if (estVide(r.resultat) && estVide(r.formule) && estVide(r.application)) return sansReponse(q.num);
  const resultatJuste = nombreJuste(r.resultat, q.attendu, q.tolerance);
  const formuleJuste = formuleCalculJuste(q, r.formule);
  const champs: Record<string, boolean> = {};
  if (formuleJuste != null) champs.formule = formuleJuste;
  if (!estVide(r.resultat)) champs.resultat = resultatJuste;

  // Application numérique (LaTeX ou texte) : sa valeur tombe-t-elle sur le résultat attendu ?
  const tol = q.tolerance != null && q.tolerance >= 0 ? q.tolerance : toleranceParDefaut(q.attendu);
  const appli = !estVide(r.application) && valeursNumeriques(r.application).some(x => nombreJuste(x, q.attendu, tol));
  const mention = appli ? ' · application cohérente' : '';

  // Erreurs typiques : formule (champ « formule »), nombre (résultat), textes (formule).
  const cibles: Cible[] = [];
  if (formuleJuste !== true && !estVide(r.formule)) cibles.push({ champ: 'formule', valeur: r.formule, maths: true, spec: q.formuleSpec, criteres: ['formule', 'valeurs'] });
  if (!resultatJuste && !estVide(r.resultat)) cibles.push({ champ: 'resultat', valeur: r.resultat, criteres: ['nombre', 'valeurs'] });
  if (!resultatJuste && !estVide(r.application)) cibles.push({ champ: 'application', valeur: r.application, maths: true, criteres: ['nombre'] });
  const err = erreursDe(q, cibles);

  if (resultatJuste) return completer(auto(q.num, 1, `Résultat juste${formuleJuste === false ? ' (formule à revoir)' : ''}${mention}`), err, champs);
  if (formuleJuste) {
    const eq = q.formuleSpec ? ' (équivalente)' : '';
    return completer(auto(q.num, 0.5, `Formule juste${eq}, résultat ${estVide(r.resultat) ? 'absent' : 'faux'}${mention}${appli && !estVide(r.resultat) ? ' (erreur de report ou d’arrondi ?)' : ''}`), err, champs);
  }
  return completer(auto(q.num, 0, `${estVide(r.resultat) ? 'Résultat absent' : 'Résultat faux'}${mention}`), err, champs);
}

function corrigerRedige(q: QRedige, texte: string): CorrectionQuestion {
  if (estVide(texte)) return sansReponse(q.num);
  const trouves = q.motsCles.filter(k => contientMotCle(texte, k));
  const min = Math.max(1, q.minMotsCles);
  const score = trouves.length >= min ? 1 : trouves.length >= 1 ? 0.5 : 0;
  // Erreur typique d'un rédigé : un des textes fautifs figure dans la réponse.
  const liste = (q.erreursTypiques ?? []).filter(e => e.valeurs?.some(v => contientMotCle(texte, v)));
  return completer({
    num: q.num,
    score,
    statut: 'aValider',
    detail: `Mots-clés : ${trouves.length}/${min}${trouves.length ? ` (${trouves.join(', ')})` : ''} — pré-note à valider par le professeur`,
  }, liste.length ? { erreurs: liste.map(e => e.id), message: liste[0].message } : {});
}

function corrigerBulles(q: QBulles, valeurs: Record<string, string>): CorrectionQuestion {
  if (!Object.values(valeurs).some(v => !estVide(v))) return sansReponse(q.num);
  const n = q.bulles.length;
  const champs: Record<string, boolean> = {};
  const fautes: Cible[] = [];
  let justes = 0;
  for (const b of q.bulles) {
    const v = valeurs[b.id];
    if (estVide(v)) continue;
    const ok = texteAccepte(v, [b.attendu, ...(b.acceptes ?? [])]);
    champs[b.id] = ok;
    if (ok) justes += 1; else fautes.push({ champ: b.id, valeur: v, criteres: ['valeurs'] });
  }
  return completer(auto(q.num, n ? justes / n : 0, `${justes}/${n} bulles justes`), erreursDe(q, fautes), champs);
}

/* ───────────────────────────── placement ───────────────────────────── */

function corrigerPlacement(q: QPlacement, r: Extract<ReponseSujet, { type: 'placement' }>): CorrectionQuestion {
  const valeurs = r.valeurs ?? {};
  if (r.points.length === 0 && !Object.values(valeurs).some(v => !estVide(v))) return sansReponse(q.num);
  const e = etatPlacement(q, r.points);
  const reperes: Record<string, boolean> = Object.fromEntries(e.apparies.map((j, i) => [`p${i}`, j != null]));
  const notes = (q.champs ?? []).filter(estNote);
  if (!notes.length) return completer(auto(q.num, e.score, resumePlacement(q, e)), {}, reperes);
  const s = corrigerSaisies(q, q.champs ?? [], valeurs, []);
  const sc = s.justes / s.n;
  return completer(
    auto(q.num, 0.5 * e.score + 0.5 * sc, `${resumePlacement(q, e)} · ${s.justes}/${s.n} valeur${s.n > 1 ? 's' : ''} juste${s.justes > 1 ? 's' : ''}`),
    s.err, { ...reperes, ...s.champs },
  );
}

function corrigerCavaliers(q: QCavaliers, valeurs: Record<string, string>): CorrectionQuestion {
  if (!Object.values(valeurs).some(v => !estVide(v))) return sansReponse(q.num);
  let n = 0;
  let justes = 0;
  const champs: Record<string, boolean> = {};
  const fautes: Cible[] = [];
  for (const c of q.composants) {
    for (const p of c.positions) {
      n += 1;
      const k = cleCavalier(c.id, p.id);
      const ok = cavalierJuste(valeurs[k], p.attendu);
      if (ok) justes += 1;
      if (!estVide(valeurs[k])) {
        champs[k] = ok;
        if (!ok) fautes.push({ champ: k, valeur: valeurs[k], criteres: ['valeurs'] });
      }
    }
  }
  return completer(auto(q.num, n ? justes / n : 0, `${justes}/${n} cavaliers justes`), erreursDe(q, fautes), champs);
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
  const champs: Record<string, boolean> = {};
  t.justes.forEach(k => { champs[`t:${k}`] = true; });
  t.mauvaiseCouleur.forEach(k => { champs[`tc:${k}`] = false; });
  t.fausses.forEach(k => { champs[`t:${k}`] = false; });
  return completer(auto(q.num, 0.5 * t.score + 0.5 * p, `${detailTraits} · ${detailPlatine}`), {}, champs);
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
    case 'placement': return corrigerPlacement(q, r as Extract<ReponseSujet, { type: 'placement' }>);
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
