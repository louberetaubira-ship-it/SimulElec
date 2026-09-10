/**
 * Les 13 TP de SimulElec v3 (SPEC-v3 §4), un fichier par TP.
 * L'ordre de ce tableau est l'ordre d'affichage du catalogue.
 */
import type { TpDefinition } from '@/lib/types';
import { TP_DEMARRAGE_DIRECT } from './demarrage-direct';
import { TP_INVERSION } from './inversion';
import { TP_ETOILE_TRIANGLE } from './etoile-triangle';
import { TP_POMPE_RELEVAGE } from './pompe-relevage';
import { TP_AUTOMATE_M221 } from './automate-m221';
import { TP_TABLEAU_LOGEMENT } from './tableau-logement';
import { TP_TABLEAU_REPARTITION } from './tableau-repartition';
import { TP_VA_ET_VIENT } from './va-et-vient';
import { TP_CHAUFFE_EAU } from './chauffe-eau';
import { TP_ECLAIRAGE_TERTIAIRE } from './eclairage-tertiaire';
import { TP_ECLAIRAGE_BAES } from './eclairage-baes';
import { TP_PV_RESEAU } from './pv-reseau';
import { TP_PV_BATTERIE } from './pv-batterie';

export const TPS: TpDefinition[] = [
  TP_DEMARRAGE_DIRECT,
  TP_INVERSION,
  TP_ETOILE_TRIANGLE,
  TP_POMPE_RELEVAGE,
  TP_AUTOMATE_M221,
  TP_TABLEAU_LOGEMENT,
  TP_TABLEAU_REPARTITION,
  TP_VA_ET_VIENT,
  TP_CHAUFFE_EAU,
  TP_ECLAIRAGE_TERTIAIRE,
  TP_ECLAIRAGE_BAES,
  TP_PV_RESEAU,
  TP_PV_BATTERIE,
];

export const TP_BY_ID: Record<string, TpDefinition> = Object.fromEntries(TPS.map((t) => [t.id, t]));

export function tpById(id: string): TpDefinition | undefined {
  return TP_BY_ID[id];
}

export {
  TP_DEMARRAGE_DIRECT, TP_INVERSION, TP_ETOILE_TRIANGLE, TP_POMPE_RELEVAGE, TP_AUTOMATE_M221,
  TP_TABLEAU_LOGEMENT, TP_TABLEAU_REPARTITION, TP_VA_ET_VIENT, TP_CHAUFFE_EAU,
  TP_ECLAIRAGE_TERTIAIRE, TP_ECLAIRAGE_BAES, TP_PV_RESEAU, TP_PV_BATTERIE,
};
