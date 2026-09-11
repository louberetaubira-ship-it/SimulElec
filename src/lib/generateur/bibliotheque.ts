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
import { toCatalogueItem } from '@/lib/data/library';
import { famillesPourScene } from './familles';

export { famillesPourScene };

const cache = new Map<string, CatalogueItem[]>();

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
