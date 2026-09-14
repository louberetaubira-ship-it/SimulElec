/**
 * Contrôle d'encombrement de la platine.
 *
 * Trois fautes qu'un simple « ça compile » ne voit pas :
 *  1. deux appareils qui se chevauchent sur le même rail ;
 *  2. un appareil qui mord sur une goulotte (donc sur le passage des fils) ;
 *  3. un appareil qui déborde de l'armoire.
 *
 *     npx tsx scripts/audit-encombrement.ts
 */
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { sceneOf, slotGeom } from '@/lib/scene/geometry';
import { TPS } from '@/lib/data/tps';

let ko = 0;
const chevauche = (a: { x: number; w: number }, b: { x: number; w: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w;

for (const tp of TPS) {
  const geo = sceneOf(tp);
  const boxes = tp.slots
    .map((s) => ({ s, it: CATALOGUE_BY_KEY[s.key] }))
    .filter((b) => b.it)
    .map((b) => ({ id: b.s.id, ...slotGeom(tp, b.s, b.it) }));

  console.log(`\n${tp.id} — armoire ${geo.cabH} px, rails ${geo.rails.join(' · ')}`);

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]; const b = boxes[j];
      if (chevauche(a, b) && a.y < b.y + b.h && b.y < a.y + a.h) {
        ko++; console.log(`  ✗ ${a.id} ⨯ ${b.id} se chevauchent`);
      }
    }
  }
  for (const b of boxes) {
    if (b.y + b.h > geo.cabH) { ko++; console.log(`  ✗ ${b.id} déborde de l'armoire (${b.y + b.h} > ${geo.cabH})`); }
    if (b.y < 0) { ko++; console.log(`  ✗ ${b.id} sort par le haut`); }
    for (const [d0, d1] of geo.ducts) {
      if (b.y < d1 && d0 < b.y + b.h) {
        ko++; console.log(`  ✗ ${b.id} (${b.y}..${b.y + b.h}) mord la goulotte ${d0}..${d1}`);
      }
    }
  }
  if (!ko) console.log('  ✓ rien ne se chevauche, rien ne déborde');
}

console.log(ko === 0 ? '\nEncombrement correct sur tous les TP.' : `\n${ko} conflit(s) d'encombrement.`);
process.exit(ko ? 1 : 0);
