/**
 * Catalogue FOURNI avec l'application.
 *
 * Il ne contient plus qu'un seul TP de référence : « Démarrage direct un sens de marche ».
 * C'est le gabarit vivant du simulateur — il sert de modèle de structure (postes, liaisons,
 * mesures attendues, barème) aux TP que le professeur crée dans le studio ou fait générer.
 *
 * Les treize autres TP de la v3 ont été retirés du catalogue à la demande du professeur :
 * le catalogue se reconstruit désormais TP par TP, à partir des dossiers techniques réels
 * de l'établissement. Leurs fichiers restent dans ce dossier, hors de `TPS` : ils ne sont
 * plus ni affichés, ni pré-rendus, ni jouables, mais restent disponibles comme référence de
 * rédaction. Pour en remettre un au catalogue, il suffit de l'importer et de l'ajouter à
 * `TPS` ci-dessous.
 *
 * L'ordre de ce tableau est l'ordre d'affichage du catalogue.
 */
import type { TpDefinition } from '@/lib/types';
import { TP_DEMARRAGE_DIRECT } from './demarrage-direct';
import { TP_PERCEUSE_RADIALE } from './perceuse-radiale';

export const TPS: TpDefinition[] = [
  TP_DEMARRAGE_DIRECT,
  TP_PERCEUSE_RADIALE,
];

export const TP_BY_ID: Record<string, TpDefinition> = Object.fromEntries(TPS.map((t) => [t.id, t]));

export function tpById(id: string): TpDefinition | undefined {
  return TP_BY_ID[id];
}

export { TP_DEMARRAGE_DIRECT, TP_PERCEUSE_RADIALE };
