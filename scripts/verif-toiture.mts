/* Vérifie le câblage de la TOITURE avec le VRAI moteur de routage :
 *  1. calcule tous les tracés (route + planLanes) ;
 *  2. rend un SVG de la toiture ;
 *  3. contrôle qu'aucun fil ne traverse l'intérieur d'un panneau (superposition).
 *     npx tsx scripts/verif-toiture.mts
 */
import { writeFileSync } from 'node:fs';
import { CATALOGUE_COMPLET } from './catalogue-complet';
import { TP_SOLAIRE_AUTONOME as TP } from '@/lib/data/tps/solaire-autonome';
import { sceneContext, planLanes, route, annexTerminals } from '@/lib/scene/route';
import { slotGeom, sceneOf, NET_COLOR } from '@/lib/scene/geometry';

const ctx = sceneContext(TP, CATALOGUE_COMPLET);
const geo = sceneOf(TP);
const wires = TP.liaisons.map((l) => [l.a, l.b] as [string, string]);
const plan = planLanes(ctx, wires);
const paths = wires.map(([a, b], i) => ({ a, b, net: TP.liaisons[i].net, pts: route(ctx, plan, a, b, i) }));

// --- panneaux ---
const panels = (TP.annexItems ?? []).filter((it) => it.key === 'pvpanel');
const jb = (TP.annexItems ?? []).find((it) => it.key === 'combiner')!;

// --- contrôle : un segment traverse-t-il l'intérieur (inset 6px) d'un panneau ? ---
const seg = (p: {x:number;y:number}, q: {x:number;y:number}) => ({ x0: Math.min(p.x,q.x), y0: Math.min(p.y,q.y), x1: Math.max(p.x,q.x), y1: Math.max(p.y,q.y) });
let ko = 0;
for (const w of paths) {
  if (!w.pts) continue;
  const own = new Set([w.a.split('.')[0], w.b.split('.')[0]]);
  for (let k = 0; k < w.pts.length - 1; k++) {
    const s = seg(w.pts[k], w.pts[k+1]);
    for (const p of panels) {
      if (own.has(p.rep)) continue;              // le fil part/arrive de ce module → normal
      const ix0 = p.x + 6, iy0 = p.y + 6, ix1 = p.x + p.w - 6, iy1 = p.y + p.h - 6;
      if (s.x0 < ix1 && ix0 < s.x1 && s.y0 < iy1 && iy0 < s.y1) {
        ko++; console.log(`  ✗ fil ${w.a}—${w.b} traverse ${p.rep}`);
      }
    }
  }
}
console.log(ko ? `\n${ko} superposition(s) fil/panneau` : '\n✓ aucun fil ne traverse un panneau');

// --- rendu SVG de la toiture (y 0..300) ---
const H = 300;
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 ${H}" font-family="monospace">`;
s += `<rect x="0" y="0" width="560" height="${H}" fill="#EAF4FC"/>`;
// panneaux
for (const p of panels) {
  s += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#12245A" stroke="#8E969E"/>`;
  s += `<text x="${p.x+p.w/2}" y="${p.y+p.h+11}" text-anchor="middle" font-size="8" fill="#26456e" font-weight="700">${p.rep}</text>`;
}
// JB
s += `<rect x="${jb.x}" y="${jb.y}" width="${jb.w}" height="${jb.h}" fill="#EDEFF2" stroke="#7E8790"/>`;
s += `<text x="${jb.x+8}" y="${jb.y+14}" font-size="8" fill="#3A4047" font-weight="700">BOÎTE DE JONCTION</text>`;
for (const [id, pt] of Object.entries(annexTerminals(jb))) s += `<circle cx="${pt.x}" cy="${pt.y}" r="3" fill="#c93"/><text x="${pt.x+5}" y="${pt.y+3}" font-size="7">${id.split('.')[1]}</text>`;
// fils
for (const w of paths) {
  if (!w.pts) continue;
  const d = w.pts.map((p, i) => `${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const col = (NET_COLOR as any)[w.net] ?? '#888';
  s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" opacity="0.9"/>`;
}
// bornes des modules
for (const p of panels) for (const [id, pt] of Object.entries(annexTerminals(p))) {
  const plus = id.endsWith('X1');
  s += `<circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#fff" stroke="${plus?'#d93a3a':'#20262d'}" stroke-width="1.5"/>`;
}
s += `</svg>`;
writeFileSync('/mnt/user-data/outputs/verif-toiture.svg', s);
console.log('SVG → /mnt/user-data/outputs/verif-toiture.svg');
