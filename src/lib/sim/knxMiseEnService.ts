/**
 * Mise en service KNX simulée (wizard ETS à 5 onglets), pendant la déconsignation.
 *
 * Même esprit que `parametrage.ts` pour le variateur : le TP déclare ce qui est
 * attendu (`tp.knxMiseEnService`, `tp.knxZones`), l'élève saisit ses réponses dans
 * `st.knx`, et une seule fonction (`knxConforme`) dit si l'essai final peut être
 * validé. L'essai lui-même reste possible avant : c'est ce qui rend visible l'effet
 * d'une mauvaise adresse ou d'une mauvaise liaison, exactement comme un mauvais
 * réglage de variateur qu'on peut essayer avant de le corriger.
 */
import type { AttemptState, TpDefinition } from '../types';

/** État du wizard, toujours défini (valeurs par défaut vides). */
export function knxState(st: Pick<AttemptState, 'knx'>) {
  const k = st.knx ?? {};
  return {
    iface: k.iface,
    prog: k.prog ?? {},
    links: k.links ?? {},
    chX: k.chX,
    ch8: k.ch8,
  };
}

/** Le TP comporte-t-il l'étape « mise en service KNX » ? */
export const aKnxMiseEnService = (tp: Pick<TpDefinition, 'knxMiseEnService'>): boolean => !!tp.knxMiseEnService;

/** Canaux attendus pour un détecteur donné (ordre indifférent), d'après `tp.knxZones`. */
export function canauxAttendus(tp: Pick<TpDefinition, 'knxZones'>, detecteur: string): number[] {
  const z = (tp.knxZones ?? []).find(zz => zz.detecteur === detecteur);
  return z ? z.canaux : [];
}

const sameSet = (a: number[], b: number[]): boolean => {
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
};

/**
 * Erreurs qui empêchent un téléchargement conforme, dans l'ordre où le wizard les
 * présente : interface, adresses, liaisons, paramètres. Vide = conforme.
 */
export function knxErreurs(
  tp: Pick<TpDefinition, 'knxMiseEnService' | 'knxZones'>,
  st: Pick<AttemptState, 'knx'>,
): string[] {
  const def = tp.knxMiseEnService;
  if (!def) return [];
  const k = knxState(st);
  const errs: string[] = [];
  if (k.iface !== def.bonneInterface) errs.push('interface');
  if (def.participants.some(p => !k.prog[p.id])) errs.push('adresses');
  const zones = tp.knxZones ?? [];
  if (zones.some(z => !sameSet(k.links[z.detecteur] ?? [], z.canaux))) errs.push('liaisons');
  if (k.chX !== 'Minuterie' || k.ch8 !== 'Commutation') errs.push('paramètres');
  return errs;
}

/** Mise en service conforme ? (vrai quand le TP n'en demande pas). */
export const knxConforme = (
  tp: Pick<TpDefinition, 'knxMiseEnService' | 'knxZones'>,
  st: Pick<AttemptState, 'knx'>,
): boolean => knxErreurs(tp, st).length === 0;
