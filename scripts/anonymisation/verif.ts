/**
 * Détection des termes interdits (origine d'un sujet d'examen) SANS les écrire en clair :
 * le texte est normalisé (minuscules, sans accents, alphanumérique), découpé en mots, et
 * chaque mot, paire et triplet de mots consécutifs est comparé aux empreintes SHA-256 de
 * `empreintes.json`. Renvoie les fragments du TEXTE analysé qui correspondent.
 *
 * Utilisé par `scripts/audit-sujet.ts` (données, noms de fichiers) et par le contrôle OCR
 * des images (`scripts/anonymisation/anonymiser-pages.py` produit le texte OCR).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const EMPREINTES: Set<string> = new Set(
  (JSON.parse(readFileSync(join(__dirname, 'empreintes.json'), 'utf8')) as { empreintes: string[] }).empreintes,
);

export const normaliser = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const empreinte = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Fragments interdits trouvés dans `texte` (vide = propre). */
export function termesInterdits(texte: string): string[] {
  const mots = normaliser(texte).split(' ').filter(Boolean);
  const trouves = new Set<string>();
  for (let i = 0; i < mots.length; i++) {
    for (let n = 1; n <= 3 && i + n <= mots.length; n++) {
      const frag = mots.slice(i, i + n).join(' ');
      if (EMPREINTES.has(empreinte(frag))) trouves.add(frag);
    }
  }
  return Array.from(trouves);
}

// Utilisation directe : `npx tsx scripts/anonymisation/verif.ts fichier1 fichier2…`
if (require.main === module) {
  let ko = 0;
  for (const f of process.argv.slice(2)) {
    const t = termesInterdits(readFileSync(f, 'utf8'));
    if (t.length) { ko++; console.log(`✗ ${f} : ${t.join(', ')}`); }
  }
  console.log(ko ? `${ko} fichier(s) à anonymiser.` : '✓ Aucun terme interdit.');
  process.exit(ko ? 1 : 0);
}
