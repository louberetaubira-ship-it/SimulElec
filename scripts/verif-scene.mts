import { writeFileSync } from 'node:fs';
import { CATALOGUE_COMPLET } from './catalogue-complet';
import { TP_SOLAIRE_AUTONOME as TP } from '@/lib/data/tps/solaire-autonome';
import { sceneContext, planLanes, route, annexTerminals, recvTerminals } from '@/lib/scene/route';
import { slotGeom, sceneOf, NET_COLOR, recvBoxOf } from '@/lib/scene/geometry';

const ctx = sceneContext(TP, CATALOGUE_COMPLET);
const geo = sceneOf(TP);
const wires = TP.liaisons.map((l) => [l.a, l.b] as [string, string]);
const plan = planLanes(ctx, wires);
const H = Math.round(geo.panelH);
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 ${H}" font-family="monospace">`;
s += `<rect width="560" height="${H}" fill="#F3F4F6"/>`;
s += `<rect width="560" height="232" fill="#DCEBF7"/>`;
// rails
for (const y of geo.rails) s += `<rect x="48" y="${y}" width="336" height="28" fill="#cfd4da"/>`;
// slots (devices)
for (const sl of ctx.slots) s += `<rect x="${sl.x}" y="${sl.y}" width="${sl.w}" height="${sl.h}" fill="#fff" stroke="#b9c0cc"/><text x="${sl.x+sl.w/2}" y="${sl.y+sl.h/2}" text-anchor="middle" font-size="7" fill="#333">${sl.slot.rep??sl.id}</text>`;
// panels + JB + battery
for (const it of TP.annexItems ?? []) {
  const fill = it.key==='pvpanel'?'#12245A':it.key==='combiner'?'#EDEFF2':'#F4F5F7';
  s += `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${fill}" stroke="#8E969E"/>`;
  s += `<text x="${it.x+it.w/2}" y="${it.y+it.h+10}" text-anchor="middle" font-size="7" fill="#26456e" font-weight="700">${it.rep}</text>`;
}
// recv
for (const it of TP.recvItems ?? []) { const b=recvBoxOf(geo,it); s+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#fff" stroke="#c0c8b0"/><text x="${b.x+b.w/2}" y="${b.y+b.h/2}" text-anchor="middle" font-size="7">${it.rep}</text>`; }
// wires
wires.forEach(([a,b],i)=>{ const pts=route(ctx,plan,a,b,i); if(!pts)return; const d=pts.map((p,k)=>`${k?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '); const col=(NET_COLOR as any)[TP.liaisons[i].net]??'#888'; s+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="2" opacity="0.85"/>`; });
// terminals modules
for (const it of TP.annexItems ?? []) if(it.key==='pvpanel') for(const [id,pt] of Object.entries(annexTerminals(it))){ const plus=id.endsWith('X1'); s+=`<circle cx="${pt.x}" cy="${pt.y}" r="3" fill="#fff" stroke="${plus?'#d93a3a':'#20262d'}" stroke-width="1.4"/>`; }
s += `</svg>`;
writeFileSync('/mnt/user-data/outputs/verif-scene.svg', s);
console.log('panelH', H, '→ /mnt/user-data/outputs/verif-scene.svg');
