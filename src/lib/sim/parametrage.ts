/**
 * Paramétrage du variateur par l'élève, pendant la mise en service.
 *
 * Le TP déclare ses paramètres (`tp.variateur.parametres`) : valeur attendue d'après
 * la plaque et le cahier des charges, réglage usine, valeurs proposées au clavier.
 * L'élève part des réglages USINE et règle chaque paramètre au clavier du variateur.
 *
 * Les valeurs saisies ne servent pas qu'à noter : `tpParametre()` les injecte dans
 * la définition du variateur que lit le moteur de simulation. Une HSP à 60 Hz fait
 * donc réellement tourner l'arbre plus vite, un ItH trop bas déclenche OLF en charge,
 * une rampe trop courte déclenche OCF, une commande 3 fils empêche le démarrage.
 * « Le montage est juste, et rien ne marche » — c'est tout l'objet de l'étape.
 */
import type { AttemptState, ParamVariateur, TpDefinition } from '../types';

/** Paramètres réglables du TP (vide quand le TP n'a pas de variateur à paramétrer). */
export const parametresOf = (tp: Pick<TpDefinition, 'variateur'>): ParamVariateur[] =>
  tp.variateur?.parametres ?? [];

/** Le TP comporte-t-il l'étape « Paramétrer U1 » ? */
export const aParametrage = (tp: Pick<TpDefinition, 'variateur'>): boolean => parametresOf(tp).length > 0;

/** Valeur actuellement réglée d'un paramètre : saisie de l'élève, sinon réglage usine. */
export function valeurParam(p: ParamVariateur, st: Pick<AttemptState, 'vsdParams'>): number | string {
  const v = st.vsdParams?.[p.code];
  return v == null ? p.usine : v;
}

/** Toutes les valeurs réglées, par code. */
export function valeursParam(
  tp: Pick<TpDefinition, 'variateur'>, st: Pick<AttemptState, 'vsdParams'>,
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const p of parametresOf(tp)) out[p.code] = valeurParam(p, st);
  return out;
}

/** Paramètres dont la valeur réglée n'est pas celle attendue. */
export const paramNonConformes = (
  tp: Pick<TpDefinition, 'variateur'>, st: Pick<AttemptState, 'vsdParams'>,
): ParamVariateur[] => parametresOf(tp).filter(p => valeurParam(p, st) !== p.attendu);

/** Paramétrage conforme ? (vrai quand le TP n'en demande pas). */
export const paramConforme = (
  tp: Pick<TpDefinition, 'variateur'>, st: Pick<AttemptState, 'vsdParams'>,
): boolean => paramNonConformes(tp, st).length === 0;

const num = (v: number | string | undefined, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : d;

/**
 * TP tel que le voit la simulation : le variateur porte les valeurs RÉGLÉES par
 * l'élève, pas celles du cahier des charges. Sans paramétrage déclaré, le TP est
 * rendu tel quel.
 */
export function tpParametre<T extends Pick<TpDefinition, 'variateur'>>(
  tp: T, st: Pick<AttemptState, 'vsdParams'>,
): T {
  const v = tp.variateur;
  if (!v || !aParametrage(tp)) return tp;
  const r = valeursParam(tp, st);
  return {
    ...tp,
    variateur: {
      ...v,
      frs: num(r.FrS, v.frs),
      lsp: num(r.LSP, v.lsp),
      hsp: num(r.HSP, v.hsp),
      acc: num(r.ACC, v.acc),
      dec: num(r.dEC, v.dec),
      ith: num(r.ItH, v.ith ?? Infinity),
      tcc: r.tCC === '3C' ? '3C' : '2C',
    },
  };
}

/** Formatage d'une valeur à la française (0.75 → « 0,75 »). */
export const fmtParam = (v: number | string): string =>
  typeof v === 'number' ? String(v).replace('.', ',') : v;
