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
import { placerRack } from '@/lib/sim/reseau';

let ko = 0;
const chevauche = (a: { x: number; w: number }, b: { x: number; w: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w;

for (const tp of TPS) {
  // TP réseau : pas de platine. L'encombrement, c'est l'armoire 19" : la composition du
  // corrigé doit tenir dans ses U, sans chevauchement, chaque élément à une place admise.
  if (tp.kind === 'reseau' && tp.reseau) {
    const def = tp.reseau;
    const rack: Record<string, number> = {};
    const libres = new Map<string, number[]>();
    let pb = 0;
    for (const r of def.rack) {
      const places = libres.get(r.debut.join(',')) ?? [...r.debut];
      const d = places.shift();
      libres.set(r.debut.join(','), places);
      const res = d == null ? { ok: false, raison: 'aucune place' } : placerRack(def, rack, r.id, d);
      if (!res.ok) { pb++; console.log(`  ✗ ${tp.id} · ${r.label} : ${res.raison}`); } else rack[r.id] = d!;
    }
    ko += pb;
    console.log(`${tp.id} — armoire ${def.rackU} U\n  ${pb ? '✗' : '✓'} ${def.rack.length} éléments, ${pb ? 'composition impossible' : 'composition du corrigé sans chevauchement ni débordement'}`);
    continue;
  }
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
  // Les presse-étoupes restent en bas de l'armoire ; l'arrivée, elle, est
  // désormais sur le PUPITRE, à gauche — donc à x négatif et dans sa hauteur.
  const gl = glandOf(geo);
  if (gl.y > geo.cabH || gl.y < geo.cabH - 60) {
    ko++; console.log(`  ✗ presse-étoupe décroché du bas de l'armoire (y ${gl.y}, armoire ${geo.cabH})`);
  }
  if (geo.alimW) {
    for (const [id, p] of Object.entries(resOf())) {
      if (p.x >= 0) { ko++; console.log(`  ✗ ${id} n'est pas dans le pupitre (x ${p.x})`); }
      if (p.y > geo.cabH) { ko++; console.log(`  ✗ ${id} dépasse la hauteur du pupitre (y ${p.y})`); }
    }
  }
  if (ko === avant) console.log('  ✓ rien ne se chevauche, rien ne déborde, moteur hors armoire');
}

console.log(ko === 0 ? '\nEncombrement correct sur tous les TP.' : `\n${ko} conflit(s) d'encombrement.`);
process.exit(ko ? 1 : 0);
