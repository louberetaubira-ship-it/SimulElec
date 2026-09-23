/**
 * Accès SERVEUR aux sujets numériques complets (corrigé compris).
 *
 * ⚠️ Réservé aux Server Components, aux Route Handlers et aux scripts : ce module importe les
 * fichiers de données (`src/lib/data/sujets/*`), qui contiennent le corrigé. Aucun fichier
 * `'use client'` ne doit l'importer, même indirectement (contrôle : `scripts/audit-sujet.ts`).
 */
import { TOUS_SUJETS, dossierDe, sujetById } from '@/lib/data/sujets';
import { sujetPublic, type SujetPublic } from '../public';
import type { SujetNumerique, SujetQuestion } from '../types';

export { corrigeQuestion, corrigeSujet } from '../solution';

if (typeof window !== 'undefined') {
  throw new Error('Les sujets complets (corrigé) ne peuvent pas être chargés dans le navigateur.');
}

export { TOUS_SUJETS, dossierDe };

/** Sujet complet (corrigé compris) : serveur et vue professeur uniquement. */
export const sujetComplet = (id: string): SujetNumerique | undefined => sujetById(id);

const cachePublic = new Map<string, SujetPublic>();

/** Sujet public (sans corrigé), mis en cache. */
export function sujetPublicParId(id: string): SujetPublic | undefined {
  const c = cachePublic.get(id);
  if (c) return c;
  const s = sujetById(id);
  if (!s) return undefined;
  const p = sujetPublic(s);
  cachePublic.set(id, p);
  return p;
}

/** Question complète d'un sujet. */
export const questionComplete = (s: SujetNumerique, num: number): SujetQuestion | undefined =>
  s.questions.find(q => q.num === num);

/** Identifiants dont la publication du corrigé ouvre ce sujet : lui-même et son sujet parent. */
export function idsPublication(s: Pick<SujetNumerique, 'id' | 'parent'>): string[] {
  return s.parent ? [s.id, s.parent] : [s.id];
}
