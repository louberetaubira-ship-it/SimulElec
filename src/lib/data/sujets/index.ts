/**
 * Sujets numériques disponibles (copies conformes de sujets d'examen).
 * Chaque sujet est un fichier de données de ce dossier ; le moteur est dans `src/lib/sujet/`.
 *
 *  - `SUJETS` : les sujets de base (sujets complets, un par dossier) ;
 *  - `TOUS_SUJETS` : les sujets de base suivis de leurs sujets thématiques (`declinaisons`),
 *    fabriqués par `sujetsDerives` sans dupliquer une seule question ;
 *  - `sujetById` cherche dans `TOUS_SUJETS` (route `/sujet/<id>`, copies, bilans).
 */
import type { SujetNumerique } from '@/lib/sujet/types';
import { sujetsDerives } from '@/lib/sujet/declinaisons';
import { SUJET_EIP } from './eip';

export const SUJETS: SujetNumerique[] = [SUJET_EIP];

export const TOUS_SUJETS: SujetNumerique[] = SUJETS.flatMap(s => [s, ...sujetsDerives(s)]);

const PAR_ID = new Map(TOUS_SUJETS.map(s => [s.id, s]));

export const sujetById = (id: string): SujetNumerique | undefined => PAR_ID.get(id);

/** Un dossier : le sujet complet et ses sujets thématiques. */
export interface DossierSujets {
  base: SujetNumerique;
  derives: SujetNumerique[];
}

/** Sujets regroupés par dossier : pour chacun, le sujet complet puis ses déclinaisons. */
export function sujetsParDossier(): DossierSujets[] {
  return SUJETS.map(base => ({ base, derives: TOUS_SUJETS.filter(s => s.parent === base.id) }));
}

/** Dossier d'un sujet (complet ou thématique). */
export function dossierDe(id: string): DossierSujets | undefined {
  const s = sujetById(id);
  if (!s) return undefined;
  const baseId = s.parent ?? s.id;
  return sujetsParDossier().find(d => d.base.id === baseId);
}
