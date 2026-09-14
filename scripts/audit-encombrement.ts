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
import { CATALOGUE_COMPLET as CATALOGUE_BY_KEY } from './catalogue-complet';
import {
  ANNEX_H, ANNEX_X, DUCT_L, DUCT_R, glandOf, motorOf, resOf, sceneOf, slotGeom, tbOf,
} from '@/lib/scene/geometry';
import { TPS } from '@/lib/data/tps';

let ko = 0;
const chevauche = (a: { x: number; w: number }, b: { x: number; w: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w;

for (const tp of TPS) {
  const geo = sceneOf(tp);
  const boxes = tp.slots
    .map((s) => ({ s, it: CATALOGUE_BY_KEY[s.key] }))
    .filter((b) => b.it)
    .map((b) => ({ id: b.s.id, annexe: b.s.rail === null, ...slotGeom(tp, b.s, b.it) }));

  console.log(`\n${tp.id} — armoire ${geo.cabH} px, rails ${geo.rails.join(' · ')}`);
  const avant = ko;

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]; const b = boxes[j];
      if (chevauche(a, b) && a.y < b.y + b.h && b.y < a.y + a.h) {
        ko++; console.log(`  ✗ ${a.id} ⨯ ${b.id} se chevauchent`);
      }
    }
  }
  // Les goulottes horizontales ne courent que dans l'armoire, entre les deux
  // goulottes verticales. Un organe de la colonne annexe — coffret de porte,
  // flotteur de la fosse — est HORS armoire : il ne peut mordre ni goulotte ni
  // rail, et sa hauteur se juge sur la colonne, pas sur le cadre.
  const DANS_ARMOIRE = { x: DUCT_L[0], w: DUCT_R[1] - DUCT_L[0] };
  for (const b of boxes) {
    if (b.annexe) {
      if (b.y < 0 || b.y + b.h > ANNEX_H) {
        ko++; console.log(`  ✗ ${b.id} (${b.y}..${b.y + b.h}) sort de la colonne annexe (0..${ANNEX_H})`);
      }
      if (b.x < ANNEX_X) { ko++; console.log(`  ✗ ${b.id} (x ${b.x}) empiète sur l'armoire (colonne à partir de ${ANNEX_X})`); }
      continue;
    }
    if (b.y + b.h > geo.cabH) { ko++; console.log(`  ✗ ${b.id} déborde de l'armoire (${b.y + b.h} > ${geo.cabH})`); }
    if (b.y < 0) { ko++; console.log(`  ✗ ${b.id} sort par le haut`); }
    if (!chevauche(b, DANS_ARMOIRE)) continue;
    for (const [d0, d1] of geo.ducts) {
      if (b.y < d1 && d0 < b.y + b.h) {
        ko++; console.log(`  ✗ ${b.id} (${b.y}..${b.y + b.h}) mord la goulotte ${d0}..${d1}`);
      }
    }
  }
  // Le moteur et sa plaque à bornes sont HORS armoire : ils appartiennent au bloc
  // récepteurs. Tant que leurs ordonnées étaient des constantes, une armoire relevée
  // les laissait en arrière — donc à l'intérieur de la platine, et le bloc récepteurs
  // restait vide. Ce contrôle interdit que cela revienne.
  if (tp.hasMotor) {
    const m = motorOf(geo); const tb = tbOf(geo);
    if (m.y < geo.recvY) { ko++; console.log(`  ✗ le moteur est DANS l'armoire (y ${m.y} < récepteurs ${geo.recvY})`); }
    if (tb.y < geo.recvY) { ko++; console.log(`  ✗ la plaque à bornes est DANS l'armoire (y ${tb.y} < ${geo.recvY})`); }
    if (tb.y + tb.h > geo.panelH) { ko++; console.log('  ✗ la plaque à bornes déborde sous le bloc récepteurs'); }
  }
  // L'arrivée réseau et les presse-étoupes, eux, restent en bas de l'armoire.
  const res = resOf(geo)['RES.L1']; const gl = glandOf(geo);
  for (const [nom, y] of [['arrivée réseau', res.y], ['presse-étoupe', gl.y]] as const) {
    if (y > geo.cabH || y < geo.cabH - 60) { ko++; console.log(`  ✗ ${nom} décrochée du bas de l'armoire (y ${y}, armoire ${geo.cabH})`); }
  }
  if (ko === avant) console.log('  ✓ rien ne se chevauche, rien ne déborde, moteur hors armoire');
}

console.log(ko === 0 ? '\nEncombrement correct sur tous les TP.' : `\n${ko} conflit(s) d'encombrement.`);
process.exit(ko ? 1 : 0);
