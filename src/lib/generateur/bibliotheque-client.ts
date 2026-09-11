/**
 * Chargement des familles de la bibliothèque côté NAVIGATEUR.
 *
 * Pendant : `bibliotheque.ts` lit `public/lib` avec `node:fs` et n'est donc pas
 * chargeable dans le navigateur. Ici on réutilise le chargement paresseux de
 * `src/lib/data/library.ts` (`fetch('/lib/<famille>.json')`, avec cache mémoire),
 * afin que le vérificateur puisse tourner dans le studio avec le MÊME catalogue
 * d'appareils que celui envoyé au modèle.
 */
import type { CatalogueItem, SceneKind } from '@/lib/types';
import { libraryIndex, loadFamily, toCatalogueItem } from '@/lib/data/library';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { famillesPourScene } from './familles';

/** Appareils de bibliothèque utilisables pour cette scène (familles chargées à la demande). */
export async function bibliothequeClientPourScene(scene: SceneKind): Promise<CatalogueItem[]> {
  const familles = famillesPourScene(scene);
  const listes = await Promise.all(
    familles.map(async (fam) => {
      try {
        const items = await loadFamily(fam.file);
        return Object.values(items).map((it) => toCatalogueItem(it, fam.family));
      } catch {
        // une planche indisponible ne doit pas empêcher la vérification
        return [];
      }
    }),
  );
  return listes.flat();
}

/**
 * Catalogue complet vu par le vérificateur : catalogue de base + bibliothèque de la scène.
 * Identique à celui que le serveur a décrit au modèle, sinon la vérification inventerait
 * des anomalies de clé inconnue.
 */
export async function itemsPourScene(scene: SceneKind): Promise<Record<string, CatalogueItem>> {
  const items: Record<string, CatalogueItem> = { ...CATALOGUE_BY_KEY };
  for (const it of await bibliothequeClientPourScene(scene)) items[it.key] = it;
  return items;
}

/**
 * Catalogue vu par le vérificateur quand le matériel a été choisi dans la bibliothèque
 * COMPLÈTE : catalogue de base + les seules familles qui portent une des clés retenues.
 *
 * C'est la contrepartie exacte de `detailsPourCles` côté serveur : le vérificateur voit
 * les mêmes appareils que ceux décrits au modèle, ni plus — toute clé absente de la
 * bibliothèque réelle reste donc refusée.
 */
export async function itemsPourCles(cles: string[]): Promise<Record<string, CatalogueItem>> {
  const voulues = new Set(cles.map((c) => c.trim()).filter(Boolean));
  const items: Record<string, CatalogueItem> = { ...CATALOGUE_BY_KEY };
  if (voulues.size === 0) return items;

  const familles = libraryIndex().filter((f) => f.keys.some((k) => voulues.has(k)));
  await Promise.all(familles.map(async (fam) => {
    try {
      const charges = await loadFamily(fam.file);
      for (const [key, it] of Object.entries(charges)) {
        if (voulues.has(key)) items[key] = toCatalogueItem(it, fam.family);
      }
    } catch {
      // une planche indisponible ne doit pas empêcher la vérification
    }
  }));
  return items;
}
