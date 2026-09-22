/**
 * Mise en service d'un AUTOMATE (écran du logiciel de programmation), pendant la
 * déconsignation — sur le modèle d'`imeonMiseEnService.ts`.
 *
 * Le TP déclare les variables du programme (mnémonique, adresse attendue, adresse du
 * programme LIVRÉ) et ses temporisations (valeur attendue, valeur livrée) ; l'élève
 * saisit les siennes dans `st.automate`, puis TRANSFÈRE. Deux différences avec l'onduleur :
 *
 *  - le transfert n'est jamais refusé : un automate exécute ce qu'on lui donne. C'est
 *    l'ESSAI qui montre la faute — un %TM3 à 5 s referme le portail au bout de 5 s, des
 *    sorties KM1.1 / KM1.2 permutées le font fermer au badge (`programmeTransfere`) ;
 *  - l'étape n'est validée qu'avec un programme transféré CONFORME (`automateConforme`).
 */
import type { AttemptState, AutomateMiseEnServiceDef, TpDefinition } from '../types';

/** Le TP comporte-t-il la mise en service d'un automate ? */
export const aAutomateMiseEnService = (tp: Pick<TpDefinition, 'automateMiseEnService'>): boolean =>
  !!tp.automateMiseEnService;

/** Blocs jugés : l'adressage des entrées, celui des sorties (le sens), les temporisations. */
export const AUTOMATE_BLOCS = 3;

/** Réglages de l'écran, toujours définis (programme livré par défaut). */
export function automateState(def: AutomateMiseEnServiceDef, st: Pick<AttemptState, 'automate'>) {
  const a = st.automate ?? {};
  const adresses: Record<string, string> = {};
  for (const v of def.variables) adresses[v.mnemo] = a.adresses?.[v.mnemo] ?? v.usine;
  const tempos: Record<string, number> = {};
  for (const t of def.tempos) tempos[t.id] = a.tempos?.[t.id] ?? t.usine;
  return { adresses, tempos, transfere: a.transfere ?? null };
}

/** Une variable est-elle une sortie (%Q) ? */
const estSortie = (def: AutomateMiseEnServiceDef, mnemo: string): boolean =>
  def.sorties.includes(def.variables.find(v => v.mnemo === mnemo)?.attendu ?? '');

export type AutomateBloc = 'entrees' | 'sorties' | 'tempos';

/** Blocs non conformes d'un jeu de réglages (vide = conforme). */
export function automateBlocsFaux(
  def: AutomateMiseEnServiceDef,
  r: { adresses: Record<string, string>; tempos: Record<string, number> },
): AutomateBloc[] {
  const faux: AutomateBloc[] = [];
  const mauvaise = (sortie: boolean) =>
    def.variables.some(v => estSortie(def, v.mnemo) === sortie && r.adresses[v.mnemo] !== v.attendu);
  if (mauvaise(false)) faux.push('entrees');
  if (mauvaise(true)) faux.push('sorties');
  if (def.tempos.some(t => r.tempos[t.id] !== t.attendu)) faux.push('tempos');
  return faux;
}

/**
 * Erreurs qui empêchent de valider la mise en service : blocs non conformes du
 * programme TRANSFÉRÉ, ou pas de transfert du tout.
 */
export function automateErreurs(
  tp: Pick<TpDefinition, 'automateMiseEnService'>,
  st: Pick<AttemptState, 'automate'>,
): string[] {
  const def = tp.automateMiseEnService;
  if (!def) return [];
  const { transfere } = automateState(def, st);
  if (!transfere) return ['transfert'];
  return automateBlocsFaux(def, transfere);
}

/** Mise en service conforme ? (vrai quand le TP n'en demande pas). */
export const automateConforme = (
  tp: Pick<TpDefinition, 'automateMiseEnService'>,
  st: Pick<AttemptState, 'automate'>,
): boolean => automateErreurs(tp, st).length === 0;

/** Libellé lisible d'un bloc. */
export const LIBELLE_BLOC: Record<AutomateBloc | 'transfert', string> = {
  entrees: 'adresses des entrées',
  sorties: 'adresses des sorties (sens de marche)',
  tempos: 'temporisations',
  transfert: 'transfert du programme',
};

/**
 * Programme que l'automate exécute au banc d'essai : celui qui a été TRANSFÉRÉ. Avant
 * tout transfert (ou sans mise en service déclarée), c'est le programme du cahier des
 * charges — le banc des autres étapes reste celui qu'on a toujours connu.
 */
export interface ProgrammeAutomate {
  /** Temporisations en secondes, par identifiant (`tm1`, `tm3`, `tm5`). */
  tempos: Record<string, number>;
  /** Adresse de chaque variable (« S3 » → « %I0.3 », « KM1.1 » → « %Q0.0 »). */
  adresses: Record<string, string>;
  /** Valeurs du cahier des charges, pour juger ce que l'essai montre. */
  attendus: { tempos: Record<string, number>; adresses: Record<string, string> };
}

/** Programme de référence d'un portail M221 (sans mise en service déclarée). */
const REFERENCE: ProgrammeAutomate['attendus'] = {
  tempos: { tm1: 3, tm3: 20, tm5: 3 },
  adresses: {
    S0: '%I0.0', S1: '%I0.1', S2: '%I0.2', S3: '%I0.3', S4: '%I0.4', S5: '%I0.5', S6: '%I0.6',
    'KM1.1': '%Q0.0', 'KM1.2': '%Q0.1', H1: '%Q0.2',
  },
};

export function programmeTransfere(
  tp: Pick<TpDefinition, 'automateMiseEnService'>,
  st: Pick<AttemptState, 'automate'>,
): ProgrammeAutomate {
  const def = tp.automateMiseEnService;
  if (!def) return { ...REFERENCE, attendus: REFERENCE };
  const attendus = {
    tempos: Object.fromEntries(def.tempos.map(t => [t.id, t.attendu])),
    adresses: Object.fromEntries(def.variables.map(v => [v.mnemo, v.attendu])),
  };
  const t = automateState(def, st).transfere;
  return t ? { tempos: t.tempos, adresses: t.adresses, attendus } : { ...attendus, attendus };
}
