/**
 * Formules corrigées par ÉQUIVALENCE mathématique (module pur, sans DOM : serveur et scripts).
 *
 * Chaîne de traitement d'une saisie LaTeX (celle de l'éditeur de maths, ou tapée à la main) :
 *  1. `normaliserLatex` : symboles unicode (φ × · ÷ − √ ² °…) → commandes LaTeX, `\phi` ≡ `\varphi`,
 *     `\operatorname{tg}` ≡ `\tan`, virgule décimale (`0{,}85`, `0,85`) → point, espaces de milliers
 *     supprimés, `\Delta U` → symbole unique, et argument des fonctions sans parenthèses borné au
 *     premier opérateur (`\tan\varphi\times P` = `\tan(\varphi)\times P`, pas `\tan(\varphi P)`) ;
 *  2. découpe aux signes `=` de premier niveau (membre de gauche / membres de droite) ;
 *  3. analyse par la Compute Engine (`@cortex-js/compute-engine`, MathJSON brut `form: 'raw'` :
 *     sans état ni simplification), puis
 *     conversion en un petit arbre à nous (symboles renommés : `GoldenRatio` → `varphi`,
 *     `X_upright` → `X`, `Prime(X)` → `X'`, `P(…)` = produit…) ;
 *  4. évaluation numérique par NOTRE évaluateur (réels, radians), sur des tirages cohérents :
 *     variables tirées dans leurs plages, `derivees` calculées dans l'ordre (PRNG déterministe,
 *     graine = la spec : une même copie reçoit toujours le même verdict).
 * Symboles : `e` seul est une variable ordinaire (« Fe » = F × e), SAUF `e^{…}` explicite, lu comme
 * l'exponentielle (ou comme la puissance de la variable `e` si la spec en déclare une) ;
 * `\\exponentialE` vaut la constante d'Euler. `D_x` / `d_x` indicés sont des variables ordinaires
 * (pas l'opérateur de dérivation de la Compute Engine).
 * Deux expressions sont équivalentes si elles donnent la même valeur (tolérance relative 1e-6)
 * sur au moins 8 tirages valides. Aucune fonction exportée ne lève d'exception.
 */

import { ComputeEngine } from '@cortex-js/compute-engine';
import type { FormuleSpec } from './types';

/* ───────────────────────────── types ───────────────────────────── */

export type RaisonFormule = 'membreGauche' | 'syntaxe' | 'different';
export interface VerdictFormule { ok: boolean; raison?: RaisonFormule }

/** Arbre d'expression évaluable (sortie de l'analyse). */
type Noeud =
  | { k: 'n'; v: number }
  | { k: 's'; nom: string }
  | { k: 'f'; f: string; a: Noeud[] };

class ErreurSyntaxe extends Error {}
class SymboleInconnu extends Error {
  constructor(public nom: string) { super(nom); }
}

/** Nombre minimal de tirages valides pour conclure, et nombre maximal d'essais. */
const TIRAGES = 12;
const TIRAGES_MIN = 8;
const ESSAIS_MAX = 80;
const TOL_REL = 1e-6;

/* ───────────────────────────── Compute Engine (paresseuse) ───────────────────────────── */

let ceCache: ComputeEngine | null = null;
function ce(): ComputeEngine {
  if (!ceCache) ceCache = new ComputeEngine();
  return ceCache;
}

/* ───────────────────────────── 1. normalisation du LaTeX ───────────────────────────── */

const UNICODE: [RegExp, string][] = [
  [/[φϕ]/g, '\\varphi '], [/Φ/g, '\\Phi '], [/[×✕]/g, '\\times '], [/[·⋅∙]/g, '\\cdot '], [/÷/g, '\\div '],
  [/[−–—]/g, '-'], [/√/g, '\\sqrt '], [/π/g, '\\pi '], [/η/g, '\\eta '], [/[′’]/g, "'"], [/″/g, "''"],
  [/²/g, '^{2}'], [/³/g, '^{3}'], [/°/g, '^{\\circ}'], [/Ω/g, '\\Omega '], [/ω/g, '\\omega '],
  [/α/g, '\\alpha '], [/β/g, '\\beta '], [/θ/g, '\\theta '], [/λ/g, '\\lambda '], [/μ/g, '\\mu '],
  [/ρ/g, '\\rho '], [/Δ/g, '\\Delta '], [/δ/g, '\\delta '], [/≈/g, '\\approx '], [/∗/g, '*'],
  [/[\u00a0\u202f\u2009]/g, ' '],
];

/** Commandes remplacées telles quelles. */
const COMMANDES: Record<string, string> = {
  '\\phi': '\\varphi', '\\tg': '\\tan', '\\dfrac': '\\frac', '\\tfrac': '\\frac', '\\cfrac': '\\frac',
  '\\imaginaryI': 'i', '\\lparen': '(', '\\rparen': ')', '\\mleft': '\\left', '\\mright': '\\right',
  '\\bigl': '', '\\bigr': '', '\\Bigl': '', '\\Bigr': '', '\\big': '', '\\Big': '', '\\displaystyle': '',
  '\\ast': '*', '\\colon': ':', '\\centerdot': '\\cdot', '\\bullet': '\\cdot',
};

/** Fonctions dont l'argument peut s'écrire sans parenthèses (« cos φ »). */
const FONCTIONS = new Set([
  '\\sin', '\\cos', '\\tan', '\\cot', '\\sec', '\\csc', '\\arcsin', '\\arccos', '\\arctan',
  '\\sinh', '\\cosh', '\\tanh', '\\ln', '\\log', '\\lg', '\\exp',
]);

/** Découpe en jetons : commandes `\nom`, commandes d'un symbole (`\,`), caractères. Espaces ignorés. */
function jetons(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      const m = /^\\[a-zA-Z]+/.exec(s.slice(i));
      if (m) { out.push(m[0]); i += m[0].length; continue; }
      out.push(s.slice(i, i + 2)); i += 2; continue;
    }
    if (/\s/.test(c)) { i += 1; continue; }
    out.push(c); i += 1;
  }
  return out;
}

/** Recolle des jetons (une espace après une commande suivie d'une lettre). */
function recoller(t: string[]): string {
  let s = '';
  t.forEach((x, i) => {
    s += x;
    if (/^\\[a-zA-Z]+$/.test(x) && i + 1 < t.length && /^[a-zA-Z0-9]/.test(t[i + 1])) s += ' ';
  });
  return s;
}

const estChiffre = (x: string | undefined) => x != null && /^[0-9]$/.test(x);
const OUVRANTS = new Set(['{', '(', '[']);
const FERMANTS = new Set(['}', ')', ']']);

/** Indice de fin (exclu) d'un groupe `{…}` commençant en `i`. */
function finGroupe(t: string[], i: number): number {
  let d = 0;
  for (let j = i; j < t.length; j++) {
    if (t[j] === '{') d += 1;
    else if (t[j] === '}') { d -= 1; if (d === 0) return j + 1; }
  }
  return t.length;
}

/** Indice de fin (exclu) d'un exposant ou indice `^x` / `^{…}` commençant en `i` (sur le `^`). */
function finScript(t: string[], i: number): number {
  const j = i + 1;
  if (j >= t.length) return j;
  if (t[j] === '{') return finGroupe(t, j);
  return j + 1;
}

const HABILLAGES = new Set(['\\mathrm', '\\text', '\\textrm', '\\mathit', '\\operatorname', '\\mathbf']);
const estLettre = (x: string | undefined) => x != null && (/^[a-zA-Z]$/.test(x)
  || (/^\\[a-zA-Z]+$/.test(x) && !FONCTIONS.has(x) && !NON_SYMBOLES.has(x)));
/** Commandes qui ne sont pas des symboles (opérateurs, structures). */
const NON_SYMBOLES = new Set([
  '\\times', '\\cdot', '\\div', '\\frac', '\\sqrt', '\\left', '\\right', '\\approx', '\\pm', '\\mp',
  '\\le', '\\ge', '\\leq', '\\geq', '\\ne', '\\neq', '\\circ', '\\prime',
]);

/** Fin (exclue) des exposants, indices et primes qui suivent un symbole. */
function finScripts(t: string[], i: number): number {
  let j = i;
  while (j < t.length && (t[j] === '^' || t[j] === '_' || t[j] === "'")) j = t[j] === "'" ? j + 1 : finScript(t, j);
  return j;
}

/** Fin (exclue) d'un symbole : lettre, lettre grecque ou `\mathrm{…}`, avec ses indices / exposants. */
function finSymbole(t: string[], i: number): number {
  let j = i;
  if (HABILLAGES.has(t[j]) && t[j + 1] === '{') j = finGroupe(t, j + 1);
  else if (estLettre(t[j])) j += 1;
  else return i;
  return finScripts(t, j);
}

/**
 * Argument implicite d'une fonction écrite sans parenthèses : UN symbole (« cos φ », « tan φ′ »,
 * « sin φ_1 ») ou un nombre éventuellement suivi d'un symbole (« cos 30° », « sin 2φ »).
 * Ainsi « tan φ × P » et « tan φ P » valent tan(φ)·P.
 */
function finAtome(t: string[], i: number): number {
  if (estChiffre(t[i]) || t[i] === '.') {
    let j = i;
    while (j < t.length && (estChiffre(t[j]) || t[j] === '.')) j += 1;
    j = finScripts(t, j);
    return finSymbole(t, j);
  }
  return finSymbole(t, i);
}

/**
 * Normalise une saisie LaTeX (voir l'en-tête). Exportée pour les tests et l'affichage.
 * Ne lève jamais d'exception : au pire, rend la chaîne d'origine.
 */
export function normaliserLatex(latex: string): string {
  try {
    let s = String(latex ?? '');
    for (const [re, r] of UNICODE) s = s.replace(re, r);
    // Opérateurs nommés : \operatorname{tg} / \mathrm{tg} / \text{tg} → \tan (idem cos, sin, tan…)
    s = s.replace(/\\(?:operatorname|mathrm|text|textrm|mathit)\s*\{\s*(tg|tan|sin|cos|cotan|cotg|ln|log|exp|arctan|arcsin|arccos)\s*\}/g,
      (_, f: string) => (f === 'tg' ? '\\tan' : f === 'cotan' || f === 'cotg' ? '\\cot' : `\\${f}`));
    // Noms de fonctions tapés en lettres (« tan φ », « sqrt(3) ») → commandes.
    s = s.replace(/(^|[^\\a-zA-Z])(arcsin|arccos|arctan|sin|cos|tan|tg|ln|log|exp|sqrt)(?![a-zA-Z])/g,
      (_, p: string, f: string) => `${p}\\${f === 'tg' ? 'tan' : f} `);
    let t = jetons(s).map(x => (x in COMMANDES ? COMMANDES[x] : x)).filter(x => x !== '');

    // \sqrt(…) → \sqrt{…}
    for (let i = 0; i < t.length - 1; i++) {
      if (t[i] !== '\\sqrt' || t[i + 1] !== '(') continue;
      let d = 0;
      for (let j = i + 1; j < t.length; j++) {
        if (t[j] === '(') d += 1;
        else if (t[j] === ')') { d -= 1; if (d === 0) { t[i + 1] = '{'; t[j] = '}'; break; } }
      }
    }

    // Virgule décimale : 0{,}85 · 0,85 → 0.85 ; espaces de milliers : 1\,000 → 1000.
    const u: string[] = [];
    for (let i = 0; i < t.length; i++) {
      const x = t[i];
      if (estChiffre(u[u.length - 1])) {
        if (x === '{' && t[i + 1] === ',' && t[i + 2] === '}' && estChiffre(t[i + 3])) { u.push('.'); i += 2; continue; }
        if (x === ',' && estChiffre(t[i + 1])) { u.push('.'); continue; }
        if ((x === '\\,' || x === '\\;' || x === '\\:' || x === '\\ ' || x === '~' || x === '\\thinspace') && estChiffre(t[i + 1])) continue;
        if (x === '{' && t[i + 1] === '\\,' && t[i + 2] === '}' && estChiffre(t[i + 3])) { i += 2; continue; }
      }
      // Espaces typographiques ailleurs : sans effet.
      if (x === '\\,' || x === '\\;' || x === '\\:' || x === '\\ ' || x === '\\!' || x === '~' || x === '\\quad' || x === '\\qquad') continue;
      u.push(x);
    }
    t = u;

    // \Delta U → symbole unique « DeltaU » (chute de tension, écart…).
    const v: string[] = [];
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '\\Delta' && t[i + 1] && /^[a-zA-Z]$/.test(t[i + 1])) { v.push('\\mathrm', '{', `Delta${t[i + 1]}`, '}'); i += 1; continue; }
      v.push(t[i]);
    }
    t = v;

    // D ou d indicé (D_v, d_{x}) → symbole ordinaire : sans cela la Compute Engine lit « D_v × 2 »
    // comme une dérivée (opérateur D) et la formule devient illisible.
    const dx: string[] = [];
    for (let i = 0; i < t.length; i++) {
      const dejaHabille = t[i - 1] === '{' && HABILLAGES.has(t[i - 2]);
      if ((t[i] === 'D' || t[i] === 'd') && t[i + 1] === '_' && !dejaHabille) {
        const f = finScript(t, i + 1);
        dx.push('\\mathrm', '{', ...t.slice(i, f), '}');
        i = f - 1;
        continue;
      }
      dx.push(t[i]);
    }
    t = dx;

    // Argument implicite des fonctions : \tan\varphi\times P → \tan(\varphi)\times P.
    const w: string[] = [];
    let i = 0;
    while (i < t.length) {
      const x = t[i];
      if (!FONCTIONS.has(x)) { w.push(x); i += 1; continue; }
      w.push(x); i += 1;
      // exposant / indice de la fonction (\cos^2, \log_{10})
      while (i < t.length && (t[i] === '^' || t[i] === '_')) {
        const f = finScript(t, i);
        w.push(...t.slice(i, f)); i = f;
      }
      if (i >= t.length || t[i] === '(' || t[i] === '\\left' || t[i] === '[') continue;
      let arg: string[];
      if (t[i] === '{') {
        const f = finGroupe(t, i);
        arg = t.slice(i + 1, f - 1); i = f;
      } else {
        const f = finAtome(t, i);
        arg = t.slice(i, f); i = f;
      }
      if (arg.length) w.push('(', ...arg, ')');
    }
    return recoller(w);
  } catch {
    return String(latex ?? '');
  }
}

/** Membres d'une égalité (découpe aux `=` / `\approx` de premier niveau), LaTeX normalisé. */
export function membres(latex: string): string[] {
  const t = jetons(normaliserLatex(latex));
  const out: string[][] = [[]];
  let d = 0;
  for (const x of t) {
    if (OUVRANTS.has(x)) d += 1;
    else if (FERMANTS.has(x)) d -= 1;
    if (d === 0 && (x === '=' || x === '\\approx' || x === '\\simeq')) { out.push([]); continue; }
    out[out.length - 1].push(x);
  }
  return out.map(recoller);
}

/* ───────────────────────────── 2. analyse (MathJSON → Noeud) ───────────────────────────── */

/** Nom canonique d'un symbole MathJSON (φ, indices, droit/italique). */
function nomSymbole(s: string): string {
  let n = s.replace(/_upright/g, '').replace(/_italic/g, '').replace(/_bold/g, '');
  n = n.replace(/^GoldenRatio(?=$|_|')/, 'varphi').replace(/^phi(?=$|_|')/, 'varphi');
  // prime placé en fin de nom : « varphi'_2 » → « varphi_2' »
  const primes = (n.match(/'/g) ?? []).length;
  if (primes) n = n.replace(/'/g, '') + "'".repeat(primes);
  return n;
}

const FONCTIONS_EVAL = new Set([
  'Add', 'Subtract', 'Negate', 'Multiply', 'Divide', 'Power', 'Sqrt', 'Root', 'Square', 'Exp', 'Ln', 'Log', 'Lg', 'Lb',
  'Sin', 'Cos', 'Tan', 'Cot', 'Sec', 'Csc', 'Arcsin', 'Arccos', 'Arctan', 'Sinh', 'Cosh', 'Tanh', 'Abs', 'Degrees',
]);

type Json = unknown;

function versNoeud(j: Json): Noeud {
  if (typeof j === 'number') {
    if (!Number.isFinite(j)) throw new ErreurSyntaxe('nombre');
    return { k: 'n', v: j };
  }
  if (typeof j === 'string') {
    if (j.startsWith("'")) throw new ErreurSyntaxe('texte');
    switch (j) {
      case 'Pi': return { k: 'n', v: Math.PI };
      case 'Half': return { k: 'n', v: 0.5 };
      case 'Nothing': case 'Missing': throw new ErreurSyntaxe('vide');
      case 'ExponentialE': return { k: 's', nom: '#e' };
      case 'ImaginaryUnit': return { k: 's', nom: '#i' };
      default:
        // Nom de fonction sans argument (« \\tan » seul) : formule incomplète.
        if (FONCTIONS_EVAL.has(j)) throw new ErreurSyntaxe('fonction sans argument');
        return { k: 's', nom: nomSymbole(j) };
    }
  }
  if (j && typeof j === 'object' && !Array.isArray(j)) {
    const o = j as Record<string, unknown>;
    if (typeof o.num === 'string') {
      const v = Number(o.num.replace(/[.]{3}|\(|\)/g, ''));
      if (!Number.isFinite(v)) throw new ErreurSyntaxe('nombre');
      return { k: 'n', v };
    }
    if (typeof o.sym === 'string') return versNoeud(o.sym);
    if (Array.isArray(o.fn)) return versNoeud(o.fn);
    throw new ErreurSyntaxe('objet');
  }
  if (!Array.isArray(j) || j.length === 0) throw new ErreurSyntaxe('vide');
  const [tete, ...args] = j as [Json, ...Json[]];
  if (typeof tete !== 'string') throw new ErreurSyntaxe('tête');
  switch (tete) {
    case 'Error': case 'ErrorCode': case 'LatexString': case 'Tuple': case 'List': case 'Pair': case 'Triple':
    case 'Equal': case 'Approx': case 'Text': case 'String': case 'Baseform':
      throw new ErreurSyntaxe(tete);
    case 'Complex':
      if (args.length === 2 && args[0] === 0 && args[1] === 1) return { k: 's', nom: '#i' };
      throw new ErreurSyntaxe('complexe');
    case 'Rational': return { k: 'f', f: 'Divide', a: args.map(versNoeud) };
    case 'Delimiter': case 'Sequence': case 'Parentheses': {
      const vrais = args.filter(a => typeof a !== 'string' || !a.startsWith("'"));
      if (vrais.length !== 1) throw new ErreurSyntaxe(tete);
      return versNoeud(vrais[0]);
    }
    case 'InvisibleOperator': return { k: 'f', f: 'Multiply', a: args.map(versNoeud) };
    case 'Prime': {
      const b = versNoeud(args[0]);
      if (b.k !== 's' || args.length > 2) throw new ErreurSyntaxe('prime');
      const n = typeof args[1] === 'number' ? Math.max(1, args[1]) : 1;
      return { k: 's', nom: nomSymbole(b.nom + "'".repeat(n)) };
    }
    case 'Subscript': {
      const b = versNoeud(args[0]);
      const idx = args[1];
      const sub = typeof idx === 'number' ? String(idx) : typeof idx === 'string' ? nomSymbole(idx) : null;
      if (b.k !== 's' || sub == null) throw new ErreurSyntaxe('indice');
      const primes = (b.nom.match(/'+$/) ?? [''])[0];
      return { k: 's', nom: nomSymbole(`${b.nom.replace(/'+$/, '')}_${sub}${primes}`) };
    }
    default: break;
  }
  // e^{…} explicite : exponentielle (ou puissance de la variable e si la spec en déclare une).
  if (tete === 'Power' && args.length === 2 && (args[0] === 'e' || args[0] === 'ExponentialE')) {
    return { k: 'f', f: args[0] === 'e' ? 'PuissanceE' : 'Exp', a: [versNoeud(args[1])] };
  }
  if (FONCTIONS_EVAL.has(tete)) {
    if (args.length === 0) throw new ErreurSyntaxe('arguments');
    return { k: 'f', f: tete, a: args.map(versNoeud) };
  }
  // « P(tan φ − tan φ′) » est lu P appliqué à … : c'est un produit.
  if (/^[A-Za-z][A-Za-z0-9_']*$/.test(tete) && args.length >= 1) {
    return { k: 'f', f: 'Multiply', a: [{ k: 's', nom: nomSymbole(tete) }, ...args.map(versNoeud)] };
  }
  throw new ErreurSyntaxe(`fonction ${tete}`);
}

const cacheAnalyse = new Map<string, Noeud | ErreurSyntaxe>();

/** Analyse une expression LaTeX DÉJÀ normalisée et sans `=`. Lève `ErreurSyntaxe`. */
function analyserMembre(latexNorm: string): Noeud {
  const cle = latexNorm;
  const c = cacheAnalyse.get(cle);
  if (c instanceof ErreurSyntaxe) throw c;
  if (c) return c;
  let r: Noeud | ErreurSyntaxe;
  try {
    if (!latexNorm.trim()) throw new ErreurSyntaxe('vide');
    const expr = ce().parse(latexNorm, { form: 'raw' });
    r = versNoeud(expr.json);
  } catch (e) {
    r = e instanceof ErreurSyntaxe ? e : new ErreurSyntaxe(String((e as Error)?.message ?? e));
  }
  if (cacheAnalyse.size > 2000) cacheAnalyse.clear();
  cacheAnalyse.set(cle, r);
  if (r instanceof ErreurSyntaxe) throw r;
  return r;
}

/** Symboles libres d'un arbre. */
function symboles(n: Noeud, out = new Set<string>()): Set<string> {
  if (n.k === 's') out.add(n.nom);
  else if (n.k === 'f') n.a.forEach(x => symboles(x, out));
  return out;
}

/** Clé d'une variable nommée en LaTeX (« \varphi' » → « varphi' », « U_{MPPT} » → « U_MPPT »). */
function cleVariable(latex: string): string {
  try {
    const n = analyserMembre(normaliserLatex(latex));
    if (n.k === 's') return n.nom;
    // Juxtaposition de lettres (« Qc », « hpu ») : nom collé.
    if (n.k === 'f' && n.f === 'Multiply' && n.a.every(x => x.k === 's')) {
      return n.a.map(x => (x as { nom: string }).nom).join('');
    }
  } catch { /* nom brut */ }
  return String(latex).replace(/[{}\\\s]/g, '');
}

/**
 * Clé d'un membre de gauche : symbole analysé sans soulignés (« Q_{c} » = « Q_c » = « Qc »),
 * sinon le LaTeX normalisé débarrassé des accolades et habillages ; sensible à la casse.
 */
function cleGauche(latex: string): string {
  try {
    const n = analyserMembre(normaliserLatex(latex));
    if (n.k === 's') return n.nom.replace(/_/g, '');
  } catch { /* forme brute */ }
  return normaliserLatex(latex)
    .replace(/\\(?:mathrm|text|textrm|mathit|operatorname)\s*/g, '')
    .replace(/\^\{?\\prime\}?/g, "'")
    .replace(/\\phi\b/g, '\\varphi')
    .replace(/[{}_\s\\]/g, '');
}

/* ───────────────────────────── 3. évaluation ───────────────────────────── */

type Env = Map<string, number>;
const DEG = Math.PI / 180;

function evaluer(n: Noeud, env: Env, deg = false): number {
  if (n.k === 'n') return n.v;
  if (n.k === 's') {
    const v = env.get(n.nom);
    if (v != null) return v;
    if (n.nom === '#e') return Math.E;
    if (n.nom === '#i') { const i = env.get('i'); if (i != null) return i; }
    throw new SymboleInconnu(n.nom);
  }
  const a = n.a.map(x => evaluer(x, env, deg));
  const ang = (x: number) => (deg ? x * DEG : x);
  const inv = (x: number) => (deg ? x / DEG : x);
  switch (n.f) {
    case 'Add': return a.reduce((s, x) => s + x, 0);
    case 'Subtract': return a.length === 1 ? -a[0] : a.slice(1).reduce((s, x) => s - x, a[0]);
    case 'Negate': return -a[0];
    case 'Multiply': return a.reduce((s, x) => s * x, 1);
    case 'Divide': return a.slice(1).reduce((s, x) => s / x, a[0]);
    case 'Power': return Math.pow(a[0], a[1]);
    case 'Square': return a[0] * a[0];
    case 'Sqrt': return Math.sqrt(a[0]);
    case 'Root': return a[1] % 2 === 1 && a[0] < 0 ? -Math.pow(-a[0], 1 / a[1]) : Math.pow(a[0], 1 / a[1]);
    case 'Exp': return Math.exp(a[0]);
    case 'PuissanceE': { const e = env.get('e'); return e != null ? Math.pow(e, a[0]) : Math.exp(a[0]); }
    case 'Ln': return Math.log(a[0]);
    case 'Log': return a.length > 1 ? Math.log(a[0]) / Math.log(a[1]) : Math.log10(a[0]);
    case 'Lg': return Math.log10(a[0]);
    case 'Lb': return Math.log2(a[0]);
    case 'Sin': return Math.sin(ang(a[0]));
    case 'Cos': return Math.cos(ang(a[0]));
    case 'Tan': return Math.tan(ang(a[0]));
    case 'Cot': return 1 / Math.tan(ang(a[0]));
    case 'Sec': return 1 / Math.cos(ang(a[0]));
    case 'Csc': return 1 / Math.sin(ang(a[0]));
    case 'Arcsin': return inv(Math.asin(a[0]));
    case 'Arccos': return inv(Math.acos(a[0]));
    case 'Arctan': return inv(Math.atan(a[0]));
    case 'Sinh': return Math.sinh(a[0]);
    case 'Cosh': return Math.cosh(a[0]);
    case 'Tanh': return Math.tanh(a[0]);
    case 'Abs': return Math.abs(a[0]);
    case 'Degrees': return a[0] * DEG;
    default: throw new ErreurSyntaxe(n.f);
  }
}

/** PRNG déterministe (mulberry32). */
function prng(graine: number): () => number {
  let s = graine >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

interface Contexte {
  variables: { cle: string; min: number; max: number }[];
  derivees: { cle: string; expr: Noeud }[];
  /** Clés de toutes les grandeurs connues (variables + dérivées). */
  connues: Set<string>;
  graine: number;
}

const cacheContexte = new WeakMap<FormuleSpec, Contexte>();

/** Prépare une spec (clés des variables, dérivées analysées). */
function contexte(spec: FormuleSpec): Contexte {
  const c = cacheContexte.get(spec);
  if (c) return c;
  const variables = Object.entries(spec.variables ?? {}).map(([nom, p]) => {
    const lo = Number(p?.min); const hi = Number(p?.max);
    return { cle: cleVariable(nom), min: Math.min(lo, hi), max: Math.max(lo, hi) };
  }).filter(v => Number.isFinite(v.min) && Number.isFinite(v.max));
  // Une dérivée illisible (erreur de donnée) est ignorée : les formules qui l'utilisent seront « différentes ».
  const derivees = Object.entries(spec.derivees ?? {}).flatMap(([nom, ex]) => {
    try { return [{ cle: cleVariable(nom), expr: analyserExpression(ex) }]; } catch { return []; }
  });
  const connues = new Set([...variables.map(v => v.cle), ...derivees.map(d => d.cle)]);
  const ctx = { variables, derivees, connues, graine: hash(JSON.stringify([spec.variables, spec.derivees, spec.attendues])) };
  cacheContexte.set(spec, ctx);
  return ctx;
}

/** Analyse une expression (membre de droite si `=`). */
function analyserExpression(latex: string): Noeud {
  const m = membres(latex);
  return analyserMembre(m[m.length - 1]);
}

/**
 * Tirages cohérents : pour chacun, un environnement (variables + dérivées + symboles libres des
 * expressions de référence). Les tirages où une dérivée n'est pas définie sont écartés.
 */
function tirages(ctx: Contexte, libres: string[]): Env[] {
  const alea = prng(ctx.graine);
  const out: Env[] = [];
  for (let essai = 0; essai < ESSAIS_MAX && out.length < TIRAGES; essai++) {
    const env: Env = new Map();
    for (const v of ctx.variables) env.set(v.cle, v.min + alea() * (v.max - v.min));
    for (const s of libres) if (!env.has(s)) env.set(s, 0.5 + alea() * 4.5);
    let ok = true;
    for (const d of ctx.derivees) {
      let x: number;
      try { x = evaluer(d.expr, env); } catch { ok = false; break; }
      if (!Number.isFinite(x)) { ok = false; break; }
      env.set(d.cle, x);
    }
    if (ok) out.push(env);
  }
  return out;
}

const egaux = (a: number, b: number) =>
  Math.abs(a - b) <= TOL_REL * Math.max(Math.abs(a), Math.abs(b), 1e-12);

/**
 * Les deux arbres ont-ils la même valeur sur les tirages ? `null` : impossible de conclure
 * (référence jamais évaluable).
 */
function memeValeur(eleve: Noeud, refs: Noeud[], ctx: Contexte): boolean[] | null {
  const libres = new Set<string>();
  refs.forEach(r => symboles(r, libres));
  const extra = Array.from(libres).filter(s => !ctx.connues.has(s) && !s.startsWith('#'));
  const res = refs.map(() => true);
  const comptes = refs.map(() => 0);
  for (const env of tirages(ctx, extra)) {
    let b: number;
    try { b = evaluer(eleve, env); } catch { return refs.map(() => false); }
    refs.forEach((r, i) => {
      if (!res[i]) return;
      let a: number;
      try { a = evaluer(r, env); } catch { res[i] = false; return; }
      if (!Number.isFinite(a)) return; // tirage hors domaine pour cette référence
      comptes[i] += 1;
      if (!Number.isFinite(b) || !egaux(a, b)) res[i] = false;
    });
  }
  if (comptes.every(c => c === 0)) return null;
  return res.map((ok, i) => ok && comptes[i] >= TIRAGES_MIN);
}

/* ───────────────────────────── 4. API ───────────────────────────── */

/** La saisie est-elle une expression (ou égalité) lisible ? */
export function formuleLisible(latex: string): boolean {
  try {
    const m = membres(latex);
    if (m.some(x => !x.trim())) return false;
    m.forEach(analyserMembre);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formule de l'élève équivalente à l'une des `attendues` ?
 * `raison` : `syntaxe` (illisible, incomplète), `membreGauche` (calcul juste mais grandeur de
 * gauche fausse), `different` (pas la même formule).
 */
export function equivalentes(latexEleve: string, spec: FormuleSpec): VerdictFormule {
  try {
    const m = membres(latexEleve);
    if (!m.length || m.every(x => !x.trim())) return { ok: false, raison: 'syntaxe' };
    const gauche = m.length > 1 ? m[0] : null;
    const droites = m.length > 1 ? m.slice(1) : m;
    let arbres: Noeud[];
    try { arbres = droites.map(analyserMembre); } catch { return { ok: false, raison: 'syntaxe' }; }
    let gaucheArbre: Noeud | null = null;
    if (gauche != null) {
      try { gaucheArbre = analyserMembre(gauche); } catch { return { ok: false, raison: 'syntaxe' }; }
    }
    const ctx = contexte(spec);
    const refs = (spec.attendues ?? []).map(a => { try { return analyserExpression(a); } catch { return null; } })
      .filter((x): x is Noeud => x != null);
    if (!refs.length) return { ok: false, raison: 'different' };
    const gauches = (spec.membreGauche ?? []).map(cleGauche);
    const clesGauche = new Set((spec.membreGauche ?? []).map(cleVariable));

    // Membre de droite : la grandeur demandée ne doit pas s'y trouver (« Q = Q »).
    const justeDroite = (n: Noeud) => !Array.from(symboles(n)).some(s => clesGauche.has(s))
      && (memeValeur(n, refs, ctx)?.some(Boolean) ?? false);

    if (arbres.every(justeDroite)) {
      if (gauche == null || !gauches.length) return { ok: true };
      if (gauches.includes(cleGauche(gauche))) return { ok: true };
      return { ok: false, raison: 'membreGauche' };
    }
    // Égalité écrite à l'envers : « P tan φ = Q ».
    if (m.length === 2 && gauches.length && gaucheArbre && gauches.includes(cleGauche(m[1])) && justeDroite(gaucheArbre)) {
      return { ok: true };
    }
    return { ok: false, raison: 'different' };
  } catch {
    return { ok: false, raison: 'syntaxe' };
  }
}

/**
 * La formule de l'élève (membre de droite) correspond-elle à une formule d'ERREUR typique
 * (LaTeX, membre de droite si `=`) ? Tirages de la spec de la question ; les symboles de
 * l'erreur absents de la spec reçoivent une valeur tirée au hasard.
 */
export function correspondA(latexEleve: string, latexErreur: string, spec: FormuleSpec): boolean {
  try {
    const m = membres(latexEleve);
    const droite = m[m.length - 1];
    if (!droite?.trim()) return false;
    const eleve = analyserMembre(droite);
    const erreur = analyserExpression(latexErreur);
    const r = memeValeur(eleve, [erreur], contexte(spec));
    return r?.[0] ?? false;
  } catch {
    return false;
  }
}

/**
 * Valeur numérique d'une application numérique (`410\times63\times0{,}85\times\sqrt{3}`),
 * `null` si illisible ou si elle contient une grandeur littérale. Pour une égalité
 * (« Q = 12000\times\tan 30 = 6928 »), le premier membre CALCULÉ (qui n'est pas un simple
 * nombre) fait foi, sinon le dernier membre numérique. `angles` : unité des fonctions
 * trigonométriques sans « ° » explicite (radians par défaut).
 */
export function valeurNumerique(latex: string, angles: 'rad' | 'deg' = 'rad'): number | null {
  try {
    latex = sansUnites(latex);
    const norm = normaliserLatex(latex);
    const deg = angles === 'deg' && !/\\circ/.test(norm);
    const vide: Env = new Map();
    let dernier: number | null = null;
    for (const m of membres(latex)) {
      if (!m.trim()) continue;
      let n: Noeud;
      try { n = analyserMembre(m); } catch { continue; }
      let v: number;
      try { v = evaluer(n, vide, deg); } catch { continue; }
      if (!Number.isFinite(v)) continue;
      if (n.k !== 'n' && !(n.k === 'f' && n.f === 'Negate' && n.a[0].k === 'n')) return v;
      dernier = v;
    }
    return dernier;
  } catch {
    return null;
  }
}

/** Unités écrites en droit (clavier « Unités ») : ignorées dans une application numérique. */
const UNITES = new Set([
  'W', 'kW', 'MW', 'mW', 'var', 'kvar', 'Mvar', 'VA', 'kVA', 'MVA', 'A', 'mA', 'kA', 'V', 'mV', 'kV', 'Hz', 'kHz', 'lm', 'lx', 'cd',
  'm', 'mm', 'cm', 'km', 's', 'ms', 'min', 'h', 'Wh', 'kWh', 'J', 'kJ', 'N', 'Nm', 'N.m', 'rad', 'tr/min', 'Ω', 'kΩ', 'C',
  '\\Omega', 'k\\Omega', 'm^2', 'm^{2}', 'mm^2', 'mm^{2}',
]);

/** Retire les unités (`\\mathrm{kW}`, `\\text{V}`, `{}^{\\circ}\\mathrm{C}`) d'une application numérique. */
function sansUnites(latex: string): string {
  return String(latex ?? '')
    .replace(/\{\}\^\{?\\circ\}?\s*\\(?:mathrm|text)\{C\}/g, '')
    .replace(/\\(?:mathrm|text|textrm|operatorname)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)?)\}/g, (m, u: string) => (UNITES.has(u.trim()) ? '' : m));
}

/** Valeurs possibles d'une application numérique : radians et degrés (calculatrice en mode degré). */
export function valeursNumeriques(latex: string): number[] {
  const out: number[] = [];
  for (const a of ['rad', 'deg'] as const) {
    const v = valeurNumerique(latex, a);
    if (v != null && !out.some(x => egaux(x, v))) out.push(v);
  }
  return out;
}

/** Transcription texte d'une saisie LaTeX (module léger, importable côté client). */
export { latexVersTexte } from './formules-texte';
