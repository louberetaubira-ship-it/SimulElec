/**
 * Extraction d'une liste d'élèves depuis un export de classe (Pronote / tableur).
 *
 * Deux entrées :
 *  - `parseNames(text)` : à partir du TEXTE d'un PDF Pronote (« Liste des élèves
 *    par classe »), reconstruit chaque « NOM Prénom », qu'il soit sur une ligne
 *    ou coupé en deux, en s'ancrant sur la date de naissance qui suit le nom ;
 *  - `rowsToStudents(rows)` : à partir des LIGNES d'un CSV/Excel, repère les
 *    colonnes Nom / Prénom (ou une colonne « Élève » unique).
 *
 * `splitNom` sépare « NOM(S) Prénom(s) » : les jetons en MAJUSCULES du début
 * forment le nom, le reste le prénom (convention Pronote).
 *
 * Module pur (ni React, ni Node) : réutilisable côté serveur comme testable.
 */

export interface EleveImporte {
  last_name: string;
  first_name: string;
}

const NOISE =
  /liste des|semestre|^élève|né\(e\)|^sexe|e-?mail|entrée|sortie|cl\. rat|tuteur|options|régime|projet|lyc[eé]e|index education|anglais|espagnol|allemand|externe|interne|libre|demi-?pension/i;

/** Reconstruit les « NOM Prénom » depuis le texte brut d'un PDF Pronote. */
export function parseNames(text: string): string[] {
  const lines = text.replace(/\r/g, '').split('\n').map((s) => s.trim());
  const out: string[] = [];
  let buf: string[] = [];
  // Date de NAISSANCE : jj/mm/aaaa NON suivie d'une lettre/chiffre (la date
  // d'entrée « 03/09/2026ANGLAIS… » est collée à du texte, on l'écarte ainsi).
  const dateRe = /^(.*?)(\d{2}\/\d{2}\/\d{4})(?![A-Za-z0-9])/;
  const namePart = /^[A-Za-zÀ-ÿ'’\-.\s]+$/;

  for (const raw of lines) {
    if (!raw) continue;
    if (NOISE.test(raw)) { buf = []; continue; }
    const m = raw.match(dateRe);
    if (m) {
      const before = m[1].trim();
      if (before && /^[A-ZÀ-Ÿ]/.test(before)) buf.push(before);
      const name = buf.join(' ').replace(/\s+/g, ' ').trim();
      if (name) out.push(name);
      buf = [];
      continue;
    }
    // Fragment de nom : commence par une majuscule et ne contient que des lettres.
    // (Les fragments d'e-mail sont en minuscules ou contiennent « @ », donc écartés.)
    if (/^[A-ZÀ-Ÿ]/.test(raw) && namePart.test(raw)) buf.push(raw);
    else buf = [];
  }
  return out;
}

/** « BONHOMME Makenson » → { last_name: 'BONHOMME', first_name: 'Makenson' }. */
export function splitNom(full: string): EleveImporte {
  const toks = full.split(/\s+/).filter(Boolean);
  const nom: string[] = [];
  const pre: string[] = [];
  let inNom = true;
  for (const t of toks) {
    const isUpper = t === t.toLocaleUpperCase('fr') && /[A-ZÀ-Ÿ]/.test(t);
    if (inNom && isUpper) nom.push(t);
    else { inNom = false; pre.push(t); }
  }
  if (!pre.length && nom.length > 1) pre.push(nom.pop() as string);
  return { last_name: nom.join(' '), first_name: pre.join(' ') };
}

/** Noms extraits d'un PDF : texte → [{last_name, first_name}]. */
export function pdfTextToStudents(text: string): EleveImporte[] {
  return parseNames(text)
    .map(splitNom)
    .filter((e) => e.last_name && e.first_name);
}

const norm = (s: unknown): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Lignes d'un CSV/Excel (tableau de tableaux, en-tête compris) → élèves.
 * Repère une colonne « Nom » + « Prénom », sinon une colonne « Élève » unique,
 * sinon la première colonne. La ligne d'en-tête est ignorée.
 */
export function rowsToStudents(rows: unknown[][]): EleveImporte[] {
  if (!rows.length) return [];
  // Cherche la ligne d'en-tête (celle qui nomme les colonnes).
  let headerIdx = -1;
  let cNom = -1;
  let cPrenom = -1;
  let cEleve = -1;
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const cells = (rows[i] ?? []).map(norm);
    const inom = cells.findIndex((c) => c === 'nom' || c === 'nom de famille');
    const iprenom = cells.findIndex((c) => c === 'prenom' || c === 'prénom');
    const ieleve = cells.findIndex((c) => c === 'eleve' || c === 'élève' || c === 'nom prenom' || c === 'nom et prenom');
    if (inom >= 0 || iprenom >= 0 || ieleve >= 0) {
      headerIdx = i; cNom = inom; cPrenom = iprenom; cEleve = ieleve; break;
    }
  }

  const body = headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows;
  const out: EleveImporte[] = [];
  for (const r of body) {
    if (!r || !r.length) continue;
    let e: EleveImporte | null = null;
    if (cNom >= 0 && cPrenom >= 0) {
      e = { last_name: String(r[cNom] ?? '').trim(), first_name: String(r[cPrenom] ?? '').trim() };
    } else if (cEleve >= 0) {
      e = splitNom(String(r[cEleve] ?? '').trim());
    } else {
      // Pas d'en-tête reconnu : première cellule non vide, « NOM Prénom ».
      const first = String(r.find((c) => String(c ?? '').trim()) ?? '').trim();
      if (first) e = splitNom(first);
    }
    if (e && e.last_name && e.first_name) out.push(e);
  }
  return out;
}
