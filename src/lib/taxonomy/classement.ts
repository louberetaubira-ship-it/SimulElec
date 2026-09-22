/**
 * Classement COMPLET d'un TP : ce que le TP déclare (`tp.classement`), complété de ce
 * qui se déduit quand il ne le dit pas.
 *
 * - domaine ← `domaineParFamily(tp.family)` si absent ;
 * - activités ← `activitesDeduites(tp)` si la liste est vide.
 *
 * Module pur (pas de React) : sert au catalogue, au studio, au suivi et au générateur.
 */

import type { TpDefinition } from '@/lib/types';
import {
  activitesDeduites, domaineParFamily, normaliserClassement, type Classement,
} from './domaines';

export function classementDe(tp: TpDefinition): Classement {
  const declare = normaliserClassement(tp.classement);
  const domaine = declare.domaine ?? domaineParFamily(tp.family);
  // Le sous-domaine et les secondaires ont été validés contre le domaine DÉCLARÉ ; si le
  // domaine vient de la famille, on repasse par la normalisation pour les revalider.
  const complet = declare.domaine
    ? declare
    : normaliserClassement({ ...declare, domaine });
  return {
    ...complet,
    activites: complet.activites.length ? complet.activites : activitesDeduites(tp),
  };
}
