/**
 * Dossier technique numéroté par DOCUMENT (module pur).
 *
 * Certains dossiers numérotent leurs DTR par document (« DTR 28 » = 4 pages) : chaque page
 * porte alors `doc`. Les références `dtr` des questions restent des numéros de PAGE ; ce module
 * regroupe les pages en documents et nomme une page « DTR 28 · p. 2/4 ». Sans `doc`, chaque page
 * est son propre document (comportement historique : « DTR 7 »). Dans un dossier numéroté par
 * document, une page SANS `doc` (sommaire…) est un document non numéroté, nommé par son titre.
 */
import type { DtrPage, SujetNumerique } from './types';

export interface DocDtr {
  /** Clé unique du document (numéro, ou « p<page> » pour une page non numérotée). */
  cle: string;
  /** Numéro du document (« DTR n ») ; null : page hors numérotation (sommaire…) d'un dossier par document. */
  num: number | null;
  /** Titre du document (celui de sa première page). */
  titre: string;
  /** Section de sa première page. */
  section?: string;
  pages: DtrPage[];
}

/** Le dossier numérote-t-il ses DTR par document ? */
export const dtrParDocument = (pages: DtrPage[]): boolean => pages.some(p => p.doc != null);

/** Numéro de document d'une page (la page elle-même sans `doc`). */
export const docDePage = (p: DtrPage): number => p.doc ?? p.num;

/** Clé de document d'une page : « 28 » (document numéroté) ; sans `doc`, la page seule. */
const cleDoc = (p: DtrPage, parDoc: boolean): string => (p.doc != null ? String(p.doc) : parDoc ? `p${p.num}` : String(p.num));

/** Clé de regroupement d'une page, cohérente avec `documentsDtr` (dérivés : documents gardés entiers). */
export const cleDocPage = (pages: DtrPage[], p: DtrPage): string => cleDoc(p, dtrParDocument(pages));

/** Documents du dossier, dans l'ordre des pages (pages d'un même document regroupées). */
export function documentsDtr(pages: DtrPage[]): DocDtr[] {
  const parDoc = dtrParDocument(pages);
  const out: DocDtr[] = [];
  const parCle = new Map<string, DocDtr>();
  for (const p of pages) {
    const cle = cleDoc(p, parDoc);
    let d = parCle.get(cle);
    if (!d) {
      d = { cle, num: p.doc ?? (parDoc ? null : p.num), titre: p.titre, section: p.section, pages: [] };
      parCle.set(cle, d);
      out.push(d);
    }
    d.pages.push(p);
  }
  return out;
}

/** Libellé court d'un document : « DTR 28 », ou le titre d'une page non numérotée. */
export const nomDoc = (d: DocDtr): string => (d.num != null ? `DTR ${d.num}` : d.titre);

/** Position d'une page dans son document : document, rang (1..n), nombre de pages. */
export function positionPage(pages: DtrPage[], num: number): { doc: DocDtr; rang: number; total: number } | null {
  for (const d of documentsDtr(pages)) {
    const i = d.pages.findIndex(p => p.num === num);
    if (i >= 0) return { doc: d, rang: i + 1, total: d.pages.length };
  }
  return null;
}

/** Nom court d'une page DTR : « DTR 28 · p. 2/4 », « DTR 28 » (document d'une page), « DTR 7 » (sans `doc`). */
export function nomPageDtr(sujet: Pick<SujetNumerique, 'dtr'>, num: number): string {
  if (!dtrParDocument(sujet.dtr)) return `DTR ${num}`;
  const pos = positionPage(sujet.dtr, num);
  if (!pos) return `DTR p. ${num}`;
  return pos.total > 1 ? `${nomDoc(pos.doc)} · p. ${pos.rang}/${pos.total}` : nomDoc(pos.doc);
}

/** Références DTR d'une question, lisibles (« DTR 3, DTR 28 · p. 2/4 »). */
export function nomsPagesDtr(sujet: Pick<SujetNumerique, 'dtr'>, nums: number[]): string {
  return nums.map(n => nomPageDtr(sujet, n)).join(', ');
}

/** Chiffres du dossier : « 47 pages » ou « 37 documents · 47 pages » (documents numérotés seulement). */
export function resumeDtr(pages: DtrPage[]): string {
  if (!dtrParDocument(pages)) return `${pages.length} pages`;
  return `${documentsDtr(pages).filter(d => d.num != null).length} documents · ${pages.length} pages`;
}
