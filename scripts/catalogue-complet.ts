/**
 * Catalogue complet pour les audits : appareils codés en dur + bibliothèque.
 *
 * Dans le navigateur, un appareil pris dans la bibliothèque (`public/lib/*.json`,
 * 1 381 références) est chargé par `fetch` à l'affichage du TP. Un script node,
 * lui, n'a pas de `fetch` vers `/lib/...` : toutes ces bornes lui paraissaient
 * donc inexistantes, et l'audit accusait d'être injouables des TP qui ne le sont
 * pas — 88 fausses incohérences sur trois TP d'habitat et de photovoltaïque.
 *
 * On lit donc les mêmes fichiers sur le disque, et on les convertit avec la même
 * fonction que l'application (`toCatalogueItem`) : un seul chemin de conversion,
 * donc les mêmes bornes des deux côtés.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { toCatalogueItem } from '@/lib/data/library';
import index from '@/lib/data/library-index.json';
import type { CatalogueItem, LibraryFamily, LibraryItem } from '@/lib/types';

const RACINE = join(process.cwd(), 'public');

function familleDuDisque(f: LibraryFamily): Record<string, CatalogueItem> {
  const brut = readFileSync(join(RACINE, f.file), 'utf8');
  const data = JSON.parse(brut) as { family: string; items: LibraryItem[] };
  const out: Record<string, CatalogueItem> = {};
  for (const it of data.items) out[it.key] = toCatalogueItem(it, data.family ?? f.family);
  return out;
}

/** Catalogue codé en dur, complété par toute la bibliothèque. */
export const CATALOGUE_COMPLET: Record<string, CatalogueItem> = (() => {
  const out: Record<string, CatalogueItem> = {};
  for (const f of index as LibraryFamily[]) Object.assign(out, familleDuDisque(f));
  // Le catalogue codé en dur l'emporte : il porte les cotes constructeur et les
  // bornes nommées comme sur l'appareil réel.
  return Object.assign(out, CATALOGUE_BY_KEY);
})();
