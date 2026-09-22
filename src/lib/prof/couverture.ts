/**
 * Couverture des domaines professionnels (lot E — suivi).
 *
 * Agrégations pures (sans React) : quels domaines un élève a-t-il travaillés, quels
 * domaines lui restent à découvrir, et quelle part d'une classe a terminé au moins un
 * TP de chaque domaine.
 *
 * Un TP compte dans son domaine PRINCIPAL ; ses domaines secondaires ne sont comptés
 * qu'à part (`secondaires`), pour ne pas gonfler la couverture réelle.
 *
 * La résolution `tpId → Classement` est injectée (`resoudre`) : TP fournis via
 * `classementDe(tpById(id))`, TP des professeurs via `classementOfRow` sur des lignes
 * DÉJÀ chargées par la page (`resolveurClassement`) — jamais une requête par TP.
 */

import type { AttemptRow } from '../db/types';
import { classementOfRow, type TpRow } from '../db/tps';
import { tpById } from '../data/tps';
import { classementDe } from '../taxonomy/classement';
import { CODES_DOMAINES, type Classement, type DomainePro } from '../taxonomy/domaines';
import { counted } from './bilans';

/** Couverture d'un domaine pour un ensemble de tentatives. */
export interface CouvertureDomaine {
  /** TP distincts du domaine (principal) ayant au moins une tentative. */
  tps: string[];
  /** TP distincts avec au moins une tentative terminée (au sens de `counted()`). */
  termines: number;
  /** TP distincts commencés mais sans aucune tentative terminée. */
  enCours: number;
  /** TP distincts travaillés dont ce domaine est un domaine SECONDAIRE. */
  secondaires: number;
}

export type CouvertureDomaines = Record<DomainePro, CouvertureDomaine>;

/** Tentative réduite à ce dont la couverture a besoin. */
type TentativeCouverture = Pick<AttemptRow, 'tp_id' | 'status' | 'score'>;

/** Un enregistrement vide par domaine, dans l'ordre de `DOMAINES`. */
function vide(): CouvertureDomaines {
  const out = {} as CouvertureDomaines;
  for (const code of CODES_DOMAINES) out[code] = { tps: [], termines: 0, enCours: 0, secondaires: 0 };
  return out;
}

/**
 * Couverture des domaines d'un ensemble de tentatives (un élève en général).
 * Les TP que `resoudre` ne sait pas classer (supprimés, illisibles) sont ignorés.
 */
export function couvertureDomaines(
  attempts: TentativeCouverture[],
  resoudre: (tpId: string) => Classement | null,
): CouvertureDomaines {
  // TP distincts travaillés → terminé au moins une fois ?
  const parTp = new Map<string, boolean>();
  for (const a of attempts) {
    parTp.set(a.tp_id, (parTp.get(a.tp_id) ?? false) || counted(a));
  }
  const out = vide();
  parTp.forEach((termine, tpId) => {
    const c = resoudre(tpId);
    if (!c) return;
    if (c.domaine) {
      const d = out[c.domaine];
      d.tps.push(tpId);
      if (termine) d.termines += 1;
      else d.enCours += 1;
    }
    Array.from(new Set(c.domainesSecondaires)).forEach((sec) => {
      if (sec !== c.domaine) out[sec].secondaires += 1;
    });
  });
  return out;
}

/**
 * Résolveur `tpId → Classement` : TP fournis d'abord (`classementDe`), sinon ligne `tps`
 * déjà chargée (`classementOfRow`), sinon `null`. Les classements sont mis en cache.
 */
export function resolveurClassement(rows: TpRow[]): (tpId: string) => Classement | null {
  const lignes = new Map(rows.map((r) => [r.id, r]));
  const cache = new Map<string, Classement | null>();
  return (tpId: string) => {
    if (cache.has(tpId)) return cache.get(tpId) ?? null;
    const fourni = tpById(tpId);
    const ligne = lignes.get(tpId);
    const c = fourni ? classementDe(fourni) : ligne ? classementOfRow(ligne) : null;
    cache.set(tpId, c);
    return c;
  };
}

/** Identifiants des TP publiés, regroupés par domaine principal. */
export function tpsPubliesParDomaine(
  publies: string[],
  resoudre: (tpId: string) => Classement | null,
): Record<DomainePro, string[]> {
  const out = {} as Record<DomainePro, string[]>;
  for (const code of CODES_DOMAINES) out[code] = [];
  for (const id of Array.from(new Set(publies))) {
    const d = resoudre(id)?.domaine;
    if (d) out[d].push(id);
  }
  return out;
}

/**
 * Domaines « à découvrir » : ceux qui ont au moins un TP publié que l'élève n'a jamais
 * commencé, et dans lesquels il n'a encore rien travaillé. Ordre de `DOMAINES`.
 */
export function domainesADecouvrir(
  publiesParDomaine: Record<DomainePro, string[]>,
  couverture: CouvertureDomaines,
): DomainePro[] {
  return CODES_DOMAINES.filter((code) => {
    const faits = new Set(couverture[code].tps);
    return couverture[code].tps.length === 0 && publiesParDomaine[code].some((id) => !faits.has(id));
  });
}

/**
 * Couverture d'une CLASSE : par domaine, nombre d'élèves (parmi `eleves`) ayant terminé
 * au moins un TP du domaine principal.
 */
export function couvertureClasse(
  attempts: (TentativeCouverture & Pick<AttemptRow, 'student_id'>)[],
  eleves: string[],
  resoudre: (tpId: string) => Classement | null,
): Record<DomainePro, number> {
  const inscrits = new Set(eleves);
  const parDomaine = new Map<DomainePro, Set<string>>();
  for (const a of attempts) {
    if (!inscrits.has(a.student_id) || !counted(a)) continue;
    const d = resoudre(a.tp_id)?.domaine;
    if (!d) continue;
    let s = parDomaine.get(d);
    if (!s) parDomaine.set(d, (s = new Set()));
    s.add(a.student_id);
  }
  const out = {} as Record<DomainePro, number>;
  for (const code of CODES_DOMAINES) out[code] = parDomaine.get(code)?.size ?? 0;
  return out;
}
