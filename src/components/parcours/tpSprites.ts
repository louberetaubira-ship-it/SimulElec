/** Trois vignettes d'appareils caractéristiques d'un TP (module partagé serveur / client). */
export function tpSprites(tpId: string): string[] {
  switch (tpId) {
    case 'demarrage-direct': return ['motorcb', 'kontakt', 'therm'];
    default: return ['mcb1p', 'kontakt', 'earth'];
  }
}
