/**
 * Catalogue FOURNI avec l'application.
 *
 * Dix-sept TP, du va-et-vient d'habitation au dimensionnement photovoltaïque.
 * Trois d'entre eux — démarrage direct, perceuse radiale, variateur — sont les TP de
 * RÉFÉRENCE : ils portent un folio de commande complet et servent de gabarit de
 * structure (postes, liaisons, mesures attendues, barème) aux TP que le
 * professeur crée dans le studio ou fait générer.
 *
 * Les treize autres ont été remis au catalogue le 2026-09-14. Ils sont jouables
 * — appareils, liaisons, mesures, pannes et quiz — mais n'ont pas encore de
 * folio : à l'étape de dépannage, l'élève mesure sans schéma développé sous les
 * yeux. `npx tsx scripts/audit-folio.ts` les signale un par un ; c'est la liste
 * de travail, et non un défaut qu'on masque.
 *
 * L'ordre de ce tableau est l'ordre d'affichage du catalogue : on va du plus
 * simple au plus exigeant, habitat puis tertiaire, industriel, photovoltaïque.
 */
import type { TpDefinition } from '@/lib/types';
import { TP_DEMARRAGE_DIRECT } from './demarrage-direct';
import { TP_PERCEUSE_RADIALE } from './perceuse-radiale';
import { TP_VARIATEUR } from './variateur';
import { TP_VA_ET_VIENT } from './va-et-vient';
import { TP_CHAUFFE_EAU } from './chauffe-eau';
import { TP_TABLEAU_LOGEMENT } from './tableau-logement';
import { TP_ECLAIRAGE_TERTIAIRE } from './eclairage-tertiaire';
import { TP_ECLAIRAGE_BAES } from './eclairage-baes';
import { TP_TABLEAU_REPARTITION } from './tableau-repartition';
import { TP_ETOILE_TRIANGLE } from './etoile-triangle';
import { TP_INVERSION } from './inversion';
import { TP_POMPE_RELEVAGE } from './pompe-relevage';
import { TP_AUTOMATE_M221 } from './automate-m221';
import { TP_WAGONNET } from './wagonnet';
import { TP_PV_RESEAU } from './pv-reseau';
import { TP_PV_BATTERIE } from './pv-batterie';
import { TP_PV_DIMENSIONNEMENT } from './pv-dimensionnement';

export const TPS: TpDefinition[] = [
  // ---- habitat
  TP_VA_ET_VIENT,
  TP_CHAUFFE_EAU,
  TP_TABLEAU_LOGEMENT,
  // ---- tertiaire
  TP_ECLAIRAGE_TERTIAIRE,
  TP_ECLAIRAGE_BAES,
  TP_TABLEAU_REPARTITION,
  // ---- industriel
  TP_DEMARRAGE_DIRECT,
  TP_PERCEUSE_RADIALE,
  TP_ETOILE_TRIANGLE,
  TP_INVERSION,
  TP_POMPE_RELEVAGE,
  TP_WAGONNET,
  TP_VARIATEUR,
  TP_AUTOMATE_M221,
  // ---- photovoltaïque
  TP_PV_RESEAU,
  TP_PV_BATTERIE,
  TP_PV_DIMENSIONNEMENT,
];

export const TP_BY_ID: Record<string, TpDefinition> = Object.fromEntries(TPS.map((t) => [t.id, t]));

export function tpById(id: string): TpDefinition | undefined {
  return TP_BY_ID[id];
}

export {
  TP_DEMARRAGE_DIRECT, TP_PERCEUSE_RADIALE, TP_VARIATEUR, TP_VA_ET_VIENT, TP_CHAUFFE_EAU,
  TP_TABLEAU_LOGEMENT, TP_ECLAIRAGE_TERTIAIRE, TP_ECLAIRAGE_BAES, TP_TABLEAU_REPARTITION,
  TP_ETOILE_TRIANGLE, TP_INVERSION, TP_POMPE_RELEVAGE, TP_WAGONNET, TP_AUTOMATE_M221,
  TP_PV_RESEAU, TP_PV_BATTERIE, TP_PV_DIMENSIONNEMENT,
};
