/** Trois vignettes d'appareils caractéristiques d'un TP (module partagé serveur / client). */
export function tpSprites(tpId: string): string[] {
  switch (tpId) {
    case 'demarrage-direct': return ['motorcb', 'kontakt', 'therm'];
    case 'inversion': return ['motorcb', 'kontakt', 'kontakt'];
    case 'etoile-triangle': return ['kontakt', 'kontakt', 'timer'];
    case 'pompe-relevage': return ['motorcb', 'kontakt', 'timer'];
    case 'automate-m221': return ['mcb1p', 'kontakt', 'meter'];
    case 'tableau-logement': return ['mcb4p', 'rcd4p', 'mcb2p'];
    case 'tableau-repartition': return ['mcb3p', 'rcd2p', 'mcb2p'];
    case 'va-et-vient': return ['mcb1p', 'lampG', 'termgrey'];
    case 'chauffe-eau': return ['mcb2p', 'kontakt', 'timer'];
    case 'eclairage-tertiaire': return ['mcb1p', 'timer', 'lampY'];
    case 'eclairage-baes': return ['mcb1p', 'lampR', 'termgrey'];
    case 'pv-reseau': return ['mcb2p', 'meter', 'smart'];
    case 'pv-batterie': return ['mcb2p', 'smart', 'rcd2p'];
    case 'pv-dimensionnement': return ['smart', 'meter', 'v230'];
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
