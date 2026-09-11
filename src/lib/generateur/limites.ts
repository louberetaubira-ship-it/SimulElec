/**
 * Garde-fous du générateur : quota, taille des pièces jointes, nombre de passes et
 * estimation du coût. Isolés du Route Handler, qui n'a le droit d'exporter que les
 * champs reconnus par Next (`runtime`, `dynamic`, `maxDuration`, les verbes HTTP).
 */

/** Générations autorisées par professeur et par mois. */
export const QUOTA_MENSUEL = 30;

/** Taille cumulée maximale du dossier technique joint (octets). */
export const TAILLE_DOCS_MAX = 10 * 1024 * 1024;

/** Nombre maximal d'appels au modèle pour une génération. */
export const PASSES_MAX = 2;

/** Tarif indicatif du modèle, en euros par million de jetons. */
export const PRIX_ENTREE = 2.8;
export const PRIX_SORTIE = 14;

/** Coût estimé d'une génération, en euros, arrondi au centime. */
export function cout(entree: number, sortie: number): number {
  const total = (entree * PRIX_ENTREE + sortie * PRIX_SORTIE) / 1_000_000;
  return Math.round(total * 100) / 100;
}
