/**
 * Index COMPLET de la bibliothèque, côté serveur (Node).
 *
 * Pourquoi : le générateur ne doit plus travailler sur un extrait du catalogue. La
 * sélection du matériel se fait désormais en DEUX TEMPS :
 *
 *   1. appel « choix du matériel » — le modèle reçoit l'index complet et COMPACT
 *      (une entrée par appareil : clé, désignation, famille, nombre de bornes), sans
 *      aucune image ni géométrie : rien n'est exclu a priori ;
 *   2. appel « maquette » — le modèle ne reçoit que le DÉTAIL des appareils retenus
 *      (bornes nommées, largeur, hauteur, contraintes de pose).
 *
 * Les planches de `public/lib` pèsent 8 Mo (images en data URI) : on n'en garde ici que
 * les quelques champs utiles à l'index, le reste est relâché immédiatement. Le détail,
 * lui, passe par `chargerFamille` (cache process de `bibliotheque.ts`) et ne charge que
 * les familles réellement concernées.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CatalogueItem, LibraryItem } from '@/lib/types';
import { CATALOGUE, CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { libraryIndex } from '@/lib/data/library';
import { chargerFamille } from './bibliotheque';
import type { EntreeIndex } from './contexte';

export type { EntreeIndex };

/** Nom lisible d'un élément de bibliothèque (même règle que `toCatalogueItem`). */
function nomLisible(it: LibraryItem): string {
  const brut = (it.name || it.key).replace(/_/g, ' ').trim();
  return brut.charAt(0).toUpperCase() + brut.slice(1);
}

let cacheIndex: EntreeIndex[] | null = null;

/**
 * Index complet : catalogue de base + les 41 familles de la bibliothèque.
 * Exactement le même fonds que l'atelier libre. Mis en cache pour la vie du processus.
 */
export async function indexComplet(): Promise<EntreeIndex[]> {
  if (cacheIndex) return cacheIndex;

  const out: EntreeIndex[] = CATALOGUE.map((c) => ({
    key: c.key,
    nom: c.name,
    famille: `Catalogue de base · ${c.family}`,
    bornes: c.terminals.length,
  }));

  for (const fam of libraryIndex()) {
    try {
      const fichier = path.join(process.cwd(), 'public', fam.file.replace(/^\//, ''));
      const data = JSON.parse(await readFile(fichier, 'utf8')) as { family: string; items: LibraryItem[] };
      for (const it of data.items) {
        if (CATALOGUE_BY_KEY[it.key]) continue; // le catalogue de base prime
        out.push({
          key: it.key,
          nom: nomLisible(it),
          famille: data.family || fam.family,
          bornes: (it.terminals ?? []).length,
        });
      }
    } catch {
      // une planche illisible ne doit pas amputer l'index : on continue
    }
  }

  cacheIndex = out;
  return out;
}

/**
 * Détail complet des appareils retenus par le modèle (bornes, largeur, encombrement).
 * Seules les familles qui portent au moins une des clés demandées sont chargées.
 */
export async function detailsPourCles(cles: string[]): Promise<CatalogueItem[]> {
  const voulues = new Set(cles.map((c) => c.trim()).filter(Boolean));
  if (voulues.size === 0) return [];

  const out: CatalogueItem[] = [];
  const vus = new Set<string>();

  for (const cle of Array.from(voulues)) {
    const base = CATALOGUE_BY_KEY[cle];
    if (base && !vus.has(cle)) { vus.add(cle); out.push(base); }
  }

  const familles = libraryIndex().filter((f) => f.keys.some((k) => voulues.has(k)));
  for (const fam of familles) {
    for (const item of await chargerFamille(fam)) {
      if (voulues.has(item.key) && !vus.has(item.key)) { vus.add(item.key); out.push(item); }
    }
  }

  return out;
}
