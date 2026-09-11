/**
 * Familles de la bibliothèque à proposer au modèle selon le type d'installation.
 *
 * Module PUR (aucune entrée / sortie) : il est importable côté serveur comme côté
 * navigateur. Le chargement effectif des planches est fait par `bibliotheque.ts`
 * (Node, lecture de `public/lib`) ou `bibliotheque-client.ts` (navigateur, `fetch`).
 */
import type { LibraryFamily, SceneKind } from '@/lib/types';
import { libraryIndex } from '@/lib/data/library';

/** Familles de bibliothèque pertinentes pour chaque type de scène, dans l'ordre de priorité. */
export const FAMILLES_PAR_SCENE: Record<SceneKind, RegExp[]> = {
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
