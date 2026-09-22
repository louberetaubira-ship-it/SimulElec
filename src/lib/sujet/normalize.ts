/**
 * Normalisation des réponses saisies par l'élève (module pur, sans React).
 *
 * - Texte : minuscules, sans accents, sans espaces, virgule décimale → point, tirets et
 *   apostrophes typographiques unifiés. « E46 ADCN » = « e46adcn » ; « 2,5 mm² » = « 2.5mm2 ».
 * - Nombres : écriture française tolérée (« 1 234,5 », « 0,754 », « 49 116 lm », « 1.234,5 »).
 */

/** Espaces (y compris insécables et fines insécables). */
const ESPACES = /[\s    ]+/g;

/** Chiffres en exposant / indice → chiffres ordinaires (« mm² » → « mm2 »). */
const EXPOSANTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-',
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};

/** Forme canonique d'un texte pour la comparaison avec les réponses acceptées. */
export function normTexte(v: string | null | undefined): string {
  if (v == null) return '';
  return String(v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻₀₁₂₃₄₅₆₇₈₉]/g, c => EXPOSANTS[c] ?? c)
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(ESPACES, '')
    .replace(/,/g, '.');
}

/** Le texte normalisé figure-t-il parmi les réponses acceptées ? */
export function texteAccepte(v: string | null | undefined, acceptes: string[] | undefined): boolean {
  if (!acceptes || acceptes.length === 0) return false;
  const n = normTexte(v);
  if (!n) return false;
  return acceptes.some(a => normTexte(a) === n);
}

/** Le texte normalisé contient-il ce mot-clé (normalisé lui aussi) ? */
export function contientMotCle(texte: string | null | undefined, motCle: string): boolean {
  const k = normTexte(motCle);
  if (!k) return false;
  return normTexte(texte).includes(k);
}

/** Motif du premier nombre d'une saisie : chiffres groupés par 3 avec espaces, ou chiffres avec séparateurs. */
const NOMBRE_ESPACES = /[-+]?\d{1,3}(?:[    ]\d{3})+(?:[.,]\d+)?(?![\d])/;
const NOMBRE = /[-+]?(?:\d+(?:[.,]\d+)*|[.,]\d+)(?:[eE][-+]?\d+)?/;

/**
 * Premier nombre d'une saisie, écriture française tolérée. `null` si la saisie n'en contient pas.
 *
 * « 1 234,5 » → 1234.5 · « 0,754 » → 0.754 · « 425 lux » → 425 · « 1.234,5 » → 1234.5 ·
 * « 1,2e3 » → 1200 · « −3,5 » → −3.5.
 */
export function parseNombre(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[−–—]/g, '-').trim();
  if (!s) return null;

  const avecEspaces = s.match(NOMBRE_ESPACES);
  let brut: string | null = null;
  if (avecEspaces) {
    // Un groupement « 1 234 » n'est valable que s'il n'est pas précédé d'un autre nombre collé.
    brut = avecEspaces[0].replace(/[    ]/g, '');
  } else {
    const m = s.match(NOMBRE);
    if (!m) return null;
    brut = m[0];
  }

  let mantisse = brut;
  let exposant = '';
  const e = brut.match(/[eE][-+]?\d+$/);
  if (e) {
    exposant = e[0];
    mantisse = brut.slice(0, brut.length - e[0].length);
  }

  const virgules = (mantisse.match(/,/g) ?? []).length;
  const points = (mantisse.match(/\./g) ?? []).length;
  if (virgules > 0 && points > 0) {
    // « 1.234,5 » : points = milliers, virgule = décimale (et l'inverse « 1,234.5 »)
    const dernierVirgule = mantisse.lastIndexOf(',');
    const dernierPoint = mantisse.lastIndexOf('.');
    if (dernierVirgule > dernierPoint) mantisse = mantisse.replace(/\./g, '').replace(',', '.');
    else mantisse = mantisse.replace(/,/g, '');
  } else if (virgules > 1) {
    mantisse = mantisse.replace(/,/g, '');
  } else if (virgules === 1) {
    mantisse = mantisse.replace(',', '.');
  } else if (points > 1) {
    mantisse = mantisse.replace(/\./g, '');
  }

  const n = Number(mantisse + exposant);
  return Number.isFinite(n) ? n : null;
}

/** Tolérance par défaut d'une valeur attendue : ±1 % (et au moins 1e-9 pour une valeur nulle). */
export function toleranceParDefaut(attendu: number): number {
  return Math.max(Math.abs(attendu) * 0.01, 1e-9);
}

/** La saisie est-elle numériquement égale à l'attendu, à la tolérance près ? */
export function nombreJuste(v: string | number | null | undefined, attendu: number, tolerance?: number): boolean {
  const n = parseNombre(v);
  if (n == null) return false;
  const tol = tolerance != null && tolerance >= 0 ? tolerance : toleranceParDefaut(attendu);
  // petite marge d'arrondi binaire
  return Math.abs(n - attendu) <= tol + 1e-9 * Math.max(1, Math.abs(attendu));
}

/** Une saisie est-elle vide (espaces seulement) ? */
export function estVide(v: string | null | undefined): boolean {
  return v == null || String(v).replace(ESPACES, '') === '';
}

/** Nombre à la française pour l'affichage (« 0,754 », « 49 116 »). */
export function fmtNombre(n: number, maxDecimales = 5): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: maxDecimales }).replace(/ /g, ' ');
}
