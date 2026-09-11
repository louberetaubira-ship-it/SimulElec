/**
 * Chargement des familles de la bibliothèque côté serveur (Node).
 *
 * `src/lib/data/library.ts` charge les planches par `fetch('/lib/<famille>.json')`, ce qui
 * n'existe pas dans un Route Handler : on lit les mêmes fichiers depuis `public/lib`.
 * Le résultat est mis en cache pour la durée de vie du processus.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CatalogueItem, LibraryFamily, LibraryItem, SceneKind } from '@/lib/types';
import { libraryIndex, toCatalogueItem } from '@/lib/data/library';

/** Familles de bibliothèque pertinentes pour chaque type de scène, dans l'ordre de priorité. */
const FAMILLES_PAR_SCENE: Record<SceneKind, RegExp[]> = {
  ind: [
    /^Disjoncteurs moteur$/, /^Contacteurs/, /^Alimentations/, /^Boutons/, /^Voyants/,
    /^Borniers/, /^Fusibles/, /^Variateurs/, /^Automates/,
  ],
  hab: [/^Disjoncteurs$/, /^Différentiels$/, /^Borniers/, /^Prises/, /^Coffrets/, /^Domotique/],
  ter: [
    /^Disjoncteurs$/, /^Différentiels$/, /^Domotique/, /^Logelec · Commande tertiaire$/,
    /^Logelec · Recepteurs$/, /^Voyants/, /^Comptage/,
  ],
  pv: [/^Batteries/, /^Comptage/, /^Disjoncteurs$/, /^Différentiels$/, /^Borniers/],
};

const cache = new Map<string, CatalogueItem[]>();

/** Familles de bibliothèque à proposer au modèle pour une scène donnée. */
export function famillesPourScene(scene: SceneKind): LibraryFamily[] {
  const res = FAMILLES_PAR_SCENE[scene] ?? [];
  const index = libraryIndex();
  const out: LibraryFamily[] = [];
  for (const re of res) {
    const fam = index.find((f) => re.test(f.family));
    if (fam && !out.includes(fam)) out.push(fam);
  }
  return out;
}

/** Charge une famille depuis `public/lib` (cache process). */
export async function chargerFamille(fam: LibraryFamily): Promise<CatalogueItem[]> {
  const hit = cache.get(fam.file);
  if (hit) return hit;
  try {
    const fichier = path.join(process.cwd(), 'public', fam.file.replace(/^\//, ''));
    const brut = await readFile(fichier, 'utf8');
    const data = JSON.parse(brut) as { family: string; items: LibraryItem[] };
    const items = data.items.map((it) => toCatalogueItem(it, data.family));
    cache.set(fam.file, items);
    return items;
  } catch {
    return [];
  }
}

/**
 * Appareils de bibliothèque utilisables pour cette scène.
 * Les planches étant volumineuses (image en data URI), on ne charge que les familles utiles.
 */
export async function bibliothequePourScene(scene: SceneKind): Promise<CatalogueItem[]> {
  const familles = famillesPourScene(scene);
  const listes = await Promise.all(familles.map(chargerFamille));
  return listes.flat();
}
