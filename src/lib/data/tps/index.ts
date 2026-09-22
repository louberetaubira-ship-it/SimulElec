/**
 * Catalogue FOURNI avec l'application.
 *
 * Huit TP : perceuse radiale, variateur de vitesse, automate M221, portail deux
 * sens, installation solaire autonome, plateau tertiaire KNX, et la mise en
 * service industrielle d'une station de relevage (parcours propre, sans platine), et les trois TP du chantier Écobike (CGM 2023) : portail piloté par M221, éclairage KNX, énergie photovoltaïque. Ils portent un folio de commande, des mesures attendues, des
 * pannes diagnosticables et un barème — ce sont les TP de RÉFÉRENCE, et le
 * gabarit de structure des TP que le professeur crée dans le studio ou fait
 * générer.
 *
 * Les quatorze autres TP livrés jusqu'au 2026-09-15 ont été retirés du catalogue
 * à la demande de l'établissement. Ils restent dans l'historique du dépôt : rien
 * n'est perdu, et un `git show` sur un commit antérieur les rend tels quels.
 */
import type { TpDefinition } from '@/lib/types';
import { TP_PERCEUSE_RADIALE } from './perceuse-radiale';
import { TP_VARIATEUR } from './variateur';
import { TP_AUTOMATE_M221 } from './automate-m221';
import { TP_PORTAIL } from './portail';
import { TP_SOLAIRE_AUTONOME } from './solaire-autonome';
import { TP_KNX_TERTIAIRE } from './knx-tertiaire';
import { TP_STATION_RELEVAGE } from './station-relevage';
import { TP_ECOBIKE_PORTAIL } from './ecobike-portail';
import { TP_ECOBIKE_KNX } from './ecobike-knx';
import { TP_ECOBIKE_PV } from './ecobike-pv';

export const TPS: TpDefinition[] = [
  TP_PERCEUSE_RADIALE,
  TP_VARIATEUR,
  TP_AUTOMATE_M221,
  TP_PORTAIL,
  TP_SOLAIRE_AUTONOME,
  TP_KNX_TERTIAIRE,
  TP_STATION_RELEVAGE,
  TP_ECOBIKE_PORTAIL,
  TP_ECOBIKE_KNX,
  TP_ECOBIKE_PV,
];

export const TP_BY_ID: Record<string, TpDefinition> = Object.fromEntries(TPS.map((t) => [t.id, t]));

export function tpById(id: string): TpDefinition | undefined {
  return TP_BY_ID[id];
}

export {
  TP_PERCEUSE_RADIALE, TP_VARIATEUR, TP_AUTOMATE_M221, TP_PORTAIL, TP_SOLAIRE_AUTONOME, TP_KNX_TERTIAIRE,
  TP_STATION_RELEVAGE, TP_ECOBIKE_PORTAIL, TP_ECOBIKE_KNX, TP_ECOBIKE_PV,
};
