/**
 * Trois vignettes d'appareils caractéristiques d'un TP (module partagé serveur / client).
 *
 * Les TP du catalogue fourni sont nommés ici ; un TP créé dans le studio tombe
 * sur la vignette par défaut — un départ-moteur, ce que sont la plupart des TP.
 */
export function tpSprites(tpId: string): string[] {
  switch (tpId) {
    case 'perceuse-radiale': return ['motorcb', 'kontakt', 'therm'];
    case 'variateur': return ['gv2l', 'atv320', 'therm'];
    case 'automate-m221': return ['mcb1p', 'kontakt', 'meter'];
    // TP photovoltaïque : pas de sprite PV (appareils dessinés en SVG sur la platine).
    // On évoque le coffret par des vignettes existantes — sectionnement, mesure, terre.
    case 'solaire-autonome': return ['fuseswitch', 'meter', 'earth'];
    default: return ['mcb1p', 'kontakt', 'earth'];
  }
}

/** Libellé de la famille d'un TP (catalogue). */
export const FAMILY_LABEL: Record<string, string> = {
  ind: 'Industriel · départs moteur',
  hab: 'Habitat · NF C 15-100',
  ter: 'Tertiaire · éclairage et sécurité',
  pv: 'Photovoltaïque',
};
