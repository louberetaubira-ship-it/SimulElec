/**
 * Mise en service d'un onduleur HYBRIDE (écran de réglage de l'IMEON), pendant la
 * déconsignation.
 *
 * Même esprit que `knxMiseEnService.ts` et `parametrage.ts` : le TP déclare les
 * choix proposés et les réglages attendus (`tp.imeonMiseEnService`), l'élève saisit
 * les siens dans `st.imeon`, et une seule fonction (`imeonConforme`) dit si l'essai
 * peut être validé. Trois réglages, tirés du cahier des charges et du DTR 28 :
 *
 *  - la PRIORITÉ DES SOURCES (PV › Stockage › Réseau en autoconsommation : le réseau
 *    n'est qu'un secours) ;
 *  - l'INJECTION du surplus sur le réseau public (paramétrable, « oui » par défaut
 *    chez le constructeur — c'est justement le piège) ;
 *  - le TYPE DE BATTERIE (le Lithium communique avec l'onduleur par le bus CAN ; un
 *    profil AGM ou Gel chargerait les modules avec la mauvaise courbe).
 *
 * Les réglages ne comptent qu'une fois APPLIQUÉS : l'écran refuse une configuration
 * non conforme, comme l'installateur qui relit sa fiche avant de valider.
 */
import type { AttemptState, TpDefinition } from '../types';

/** Nombre de réglages jugés (priorité, injection, batterie). */
export const IMEON_BLOCS = 3;

/** État de l'écran, toujours défini. */
export function imeonState(st: Pick<AttemptState, 'imeon'>) {
  const m = st.imeon ?? {};
  return { priorite: m.priorite, injection: m.injection, batterie: m.batterie, applique: m.applique === true };
}

/** Le TP comporte-t-il la mise en service d'un onduleur hybride ? */
export const aImeonMiseEnService = (tp: Pick<TpDefinition, 'imeonMiseEnService'>): boolean => !!tp.imeonMiseEnService;

/** Réglage de l'écran, par clé. */
export type ImeonReglage = 'priorite' | 'injection' | 'batterie';

/**
 * Réglages non conformes (dans l'ordre de l'écran). Vide = réglages justes, qu'ils
 * aient été appliqués ou non : c'est `imeonConforme` qui exige en plus l'application.
 */
export function imeonReglagesFaux(
  tp: Pick<TpDefinition, 'imeonMiseEnService'>,
  st: Pick<AttemptState, 'imeon'>,
): ImeonReglage[] {
  const def = tp.imeonMiseEnService;
  if (!def) return [];
  const m = imeonState(st);
  const faux: ImeonReglage[] = [];
  if (m.priorite !== def.priorite) faux.push('priorite');
  if (m.injection !== def.injection) faux.push('injection');
  if (m.batterie !== def.batterie) faux.push('batterie');
  return faux;
}

/** Erreurs qui empêchent la mise en service (réglages faux, ou non appliqués). */
export function imeonErreurs(
  tp: Pick<TpDefinition, 'imeonMiseEnService'>,
  st: Pick<AttemptState, 'imeon'>,
): string[] {
  if (!tp.imeonMiseEnService) return [];
  const faux: string[] = imeonReglagesFaux(tp, st);
  if (!faux.length && !imeonState(st).applique) return ['application'];
  return faux;
}

/** Mise en service conforme ? (vrai quand le TP n'en demande pas). */
export const imeonConforme = (
  tp: Pick<TpDefinition, 'imeonMiseEnService'>,
  st: Pick<AttemptState, 'imeon'>,
): boolean => imeonErreurs(tp, st).length === 0;

/** Libellé lisible d'un réglage. */
export const LIBELLE_REGLAGE: Record<ImeonReglage, string> = {
  priorite: 'priorité des sources',
  injection: 'injection réseau',
  batterie: 'type de batterie',
};
