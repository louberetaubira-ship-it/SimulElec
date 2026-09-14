/**
 * Contrôle de l'échelle des appareils.
 *
 * Toute la platine tient à une seule règle : 1 mm réel = 1,45 px de platine, et
 * ce sont les MILLIMÈTRES de la fiche technique qui font foi, jamais le nombre
 * de modules. Un élève qui voit un disjoncteur moteur plus étroit qu'un
 * bipolaire se fait une fausse idée de l'encombrement d'une armoire — et
 * l'encombrement est une donnée technique au même titre que le calibre.
 *
 * Trois choses vérifiées ici :
 *
 *  1. chaque appareil déclare-t-il ses cotes constructeur (`dims`) ?
 *  2. le sprite respecte-t-il l'échelle, à 4 % près (arrondi au pixel) ?
 *  3. la provenance de la cote est-elle dite — fiche technique, pas modulaire
 *     normalisé, ou encore à relever ?
 *
 * Un appareil sans cotes n'est pas une erreur bloquante : c'est une ligne de la
 * liste de travail. Ce qui serait une faute, c'est d'INVENTER une dimension pour
 * faire taire l'audit.
 *
 *     npx tsx scripts/audit-echelle.ts
 */
import { CATALOGUE, ECHELLE_PX_PAR_MM, tailleSprite } from '@/lib/data/catalogue';

/** Tolérance : l'arrondi au pixel suffit à expliquer 1 à 2 %, pas davantage. */
const TOLERANCE = 0.04;

/**
 * Appareils volontairement hors échelle, et pourquoi. Un appareil ne peut y
 * figurer qu'avec une raison écrite : sans elle, l'exception se transforme en
 * oubli au bout de trois mois.
 */
const EXCEPTIONS: Record<string, string> = {
  // (vide) — tout appareil hors échelle doit apparaître ici AVEC sa raison.
};

let ko = 0;
const aRelever: string[] = [];
const horsEchelle: string[] = [];

console.log(`Échelle de référence : 1 mm = ${ECHELLE_PX_PAR_MM} px `
  + `(un module de 18 mm occupe ${Math.round(18 * ECHELLE_PX_PAR_MM)} px)\n`);

for (const it of CATALOGUE) {
  if (!it.dims || it.dims.source === 'arelever') {
    aRelever.push(`${it.key} · ${it.ref} — ${it.w} × ${it.h} px, ${it.modules} module(s) déclaré(s)`);
    continue;
  }
  const cible = tailleSprite(it.dims.largeur, it.dims.hauteur);
  const el = Math.abs(it.w - cible.w) / cible.w;
  const eh = Math.abs(it.h - cible.h) / cible.h;
  const pc = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)} %`;
  const dl = (it.w - cible.w) / cible.w;
  const dh = (it.h - cible.h) / cible.h;

  if (el <= TOLERANCE && eh <= TOLERANCE) {
    console.log(`  ✓ ${it.key.padEnd(11)} ${String(it.dims.largeur).padStart(3)} × `
      + `${String(it.dims.hauteur).padStart(3)} mm → ${cible.w} × ${cible.h} px `
      + `[${it.dims.source}]`);
    continue;
  }
  if (EXCEPTIONS[it.key]) {
    console.log(`  — ${it.key.padEnd(11)} hors échelle ASSUMÉ : ${EXCEPTIONS[it.key]}`);
    continue;
  }
  ko++;
  horsEchelle.push(it.key);
  console.log(`  ✗ ${it.key.padEnd(11)} devrait faire ${cible.w} × ${cible.h} px `
    + `(${it.dims.largeur} × ${it.dims.hauteur} mm), en fait ${it.w} × ${it.h} px `
    + `— largeur ${pc(dl)}, hauteur ${pc(dh)}`);
}

if (aRelever.length) {
  console.log(`\n── Cotes constructeur à relever (${aRelever.length} appareils)`);
  console.log('   Ce n\'est pas une erreur : c\'est la liste de travail. Aucune cote');
  console.log('   ne doit être inventée pour faire disparaître une de ces lignes.');
  for (const l of aRelever) console.log(`   · ${l}`);
}

console.log(ko === 0
  ? '\nTous les appareils dont les cotes sont connues respectent l\'échelle.'
  : `\n${ko} appareil(s) hors échelle : ${horsEchelle.join(', ')}.`);
process.exit(ko ? 1 : 0);
