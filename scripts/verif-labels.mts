import { writeFileSync } from 'node:fs';
import { TP_SOLAIRE_AUTONOME as TP } from '@/lib/data/tps/solaire-autonome';
import { annexTerminals } from '@/lib/scene/route';
const panels = (TP.annexItems ?? []).filter((it) => it.key === 'pvpanel').slice(0, 4); // 1re rangée gauche
// viewBox zoom sur les 4 premiers modules de la rangée 0
const x0 = 6, y0 = 34, w = 260, h = 90;
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" font-family="monospace">`;
s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#DCEBF7"/>`;
for (const p of panels) {
  s += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3" fill="#12245A" stroke="#8E969E"/>`;
  s += `<text x="${p.x+p.w/2}" y="${p.y+p.h+9}" text-anchor="middle" font-size="7" fill="#26456e" font-weight="700">${p.rep}</text>`;
  for (const [id, pt] of Object.entries(annexTerminals(p))) {
    const plus = id.endsWith('X1');
    const onLeft = pt.x < p.x + p.w/2;
    const dx = onLeft ? -11 : 11;
    // pastille colorée (borne)
    s += `<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="${plus?'#E23B3B':'#23282E'}" stroke="#fff" stroke-width="1"/>`;
    // repère de polarité (pastille blanche) à l'extérieur
    s += `<rect x="${pt.x+dx-4}" y="${pt.y-5}" width="8" height="10" rx="2" fill="#fff" stroke="#9AA3AD"/>`;
    s += `<text x="${pt.x+dx}" y="${pt.y+3}" text-anchor="middle" font-size="8" font-weight="700" fill="${plus?'#E23B3B':'#20262d'}">${plus?'+':'−'}</text>`;
  }
}
s += `</svg>`;
writeFileSync('/mnt/user-data/outputs/verif-labels.svg', s);
console.log('ok');
