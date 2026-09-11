/**
 * Matériel retenu au premier temps de la sélection, côté serveur.
 *
 * Les routes « maquette » et « reparer » reçoivent la liste des clés choisies par l'appel
 * « choix du matériel » ; elles n'envoient au modèle que le DÉTAIL de ces appareils-là.
 * Une clé qui n'existe pas dans la bibliothèque réelle est écartée ici, et le vérificateur
 * (côté navigateur) refusera de toute façon toute clé inconnue.
 */
import type { AppareilRetenu } from './contexte';
import { detailsPourCles } from './index-bibliotheque';
import { objet, texte } from './serveur';

/** Un appareil retenu, tel qu'il arrive dans le corps de la requête. */
export interface MaterielRetenu {
  key: string;
  rep: string;
}

/** Nombre maximal d'appareils retenus transmis : au-delà, la platine n'est plus lisible. */
export const RETENUS_MAX = 60;

/** Relecture défensive de `materiel` : clés uniques, repères facultatifs. */
export function lireMaterielRetenu(v: unknown): MaterielRetenu[] {
  const vus = new Set<string>();
  return (Array.isArray(v) ? v : []).flatMap((m) => {
    if (typeof m === 'string') {
      const key = m.trim();
      if (!key || vus.has(key)) return [];
      vus.add(key);
      return [{ key, rep: '' }];
    }
    const o = objet(m);
    const key = texte(o?.key);
    if (!key || vus.has(key)) return [];
    vus.add(key);
    return [{ key, rep: texte(o?.rep) }];
  }).slice(0, RETENUS_MAX);
}

/**
 * Détail complet des appareils retenus, prêt pour le contexte du modèle.
 * Les clés absentes de la bibliothèque réelle sont simplement écartées.
 */
export async function retenusPourContexte(retenus: MaterielRetenu[]): Promise<AppareilRetenu[]> {
  const items = await detailsPourCles(retenus.map((r) => r.key));
  const parCle = new Map(items.map((it) => [it.key, it]));
  return retenus.flatMap((r) => {
    const item = parCle.get(r.key);
    if (!item) return [];
    return [{ item, ...(r.rep ? { rep: r.rep } : {}) }];
  });
}
