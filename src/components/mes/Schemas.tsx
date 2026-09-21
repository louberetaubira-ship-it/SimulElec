'use client';

/**
 * Schémas de puissance et de commande de la station de relevage SR1.
 * Chaque équipement est une zone cliquable (`g.org[data-r]`) : l'élève le
 * sélectionne puis l'identifie (désignation, fonction).
 *
 * Le tracé est généré en chaîne SVG (lisible, sans prétention de norme
 * graphique complète) ; le clic est délégué au conteneur.
 */

import React from 'react';

export type SchemaTab = 'puissance' | 'commande';

function schemaSvg(tab: SchemaTab, sel: string | null, ok: Record<string, boolean>): string {
  const W: string[] = [];
  const G: string[] = [];
  const L = (x1: number, y1: number, x2: number, y2: number, c = 'w') => W.push(`<path class="${c}" d="M${x1} ${y1}L${x2} ${y2}"/>`);
  const T = (x: number, y: number, t: string, c = '') => W.push(`<text x="${x}" y="${y}" class="${c}">${t}</text>`);
  const org = (rep: string, x: number, y: number, w: number, h: number, inner: string) => {
    G.push(`<g class="org ${sel === rep ? 'sel' : ''} ${ok[rep] ? 'okd' : ''}" data-r="${rep}"><rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}"/>${inner}</g>`);
  };
  const no = (x: number, y: number) => `<path class="w" d="M${x} ${y}L${x} ${y + 12}M${x} ${y + 30}L${x - 10} ${y + 12}M${x} ${y + 30}L${x} ${y + 42}"/>`;
  const nf = (x: number, y: number) => `<path class="w" d="M${x} ${y}L${x} ${y + 12}L${x + 8} ${y + 12}M${x} ${y + 30}L${x + 10} ${y + 10}M${x} ${y + 30}L${x} ${y + 42}"/>`;
  const croix = (x: number, y: number) => `<path class="w" d="M${x - 4} ${y + 8}L${x + 4} ${y + 16}M${x + 4} ${y + 8}L${x - 4} ${y + 16}"/>`;
  const NS = 'http://www.w3.org/2000/svg';

  if (tab === 'puissance') {
    const X: Record<string, number> = { L1: 60, L2: 80, L3: 100, N: 120, PE: 140 };
    T(40, 18, 'Arrivée TGBT · 3×400 V + N + PE · TT', 'lg');
    Object.entries(X).forEach(([k, x]) => { T(x - 5, 34, k); L(x, 40, x, 62, k === 'PE' ? 'pe' : 'w'); });
    org('Q0', 40, 60, 96, 56, [60, 80, 100, 120].map((x) => no(x, 64)).join('') + '<path class="lk" d="M50 85L122 85"/><path class="w" d="M52 70L56 70"/><text x="10" y="92" class="rep">Q0</text>');
    [60, 80, 100, 120].forEach((x, i) => { L(x, 106, x, 130 + i * 8); L(x, 130 + i * 8, 520, 130 + i * 8); });
    L(140, 62, 140, 420, 'pe');
    // départ pompe
    [190, 210, 230].forEach((x, i) => L(x, 130 + i * 8, x, 168));
    org('Q1', 176, 166, 70, 56, [190, 210, 230].map((x) => no(x, 170) + croix(x, 170)).join('') + '<rect x="184" y="210" width="52" height="8" class="w"/><text x="248" y="196" class="rep">Q1</text><text x="248" y="208" class="lg">4,9 A</text>');
    [190, 210, 230].forEach((x) => L(x, 212, x, 236));
    org('KM1', 176, 234, 70, 52, [190, 210, 230].map((x) => no(x, 238)).join('') + '<path class="lk" d="M182 259L240 259"/><text x="248" y="264" class="rep">KM1</text>');
    [190, 210, 230].forEach((x) => L(x, 280, x, 318));
    org('M1', 178, 316, 66, 70, '<circle cx="210" cy="346" r="22" class="w"/><text x="200" y="344">M</text><text x="201" y="356">3~</text><text x="250" y="350" class="rep">M1</text><path class="pe" d="M232 346L140 346"/>');
    // départ 230 V
    L(300, 130, 300, 168); L(320, 154, 320, 168);
    org('Q2', 286, 166, 80, 58, no(300, 170) + no(320, 170) + '<ellipse cx="310" cy="206" rx="18" ry="5" class="w"/><path class="lk" d="M292 191L330 191"/><text x="340" y="196" class="rep">Q2</text><text x="340" y="208" class="lg">30 mA</text>');
    L(300, 212, 300, 300); L(320, 212, 320, 300); L(300, 300, 300, 322); L(320, 300, 320, 322);
    L(300, 260, 360, 260); L(320, 272, 380, 272); L(360, 260, 360, 322); L(380, 272, 380, 322);
    org('E1', 284, 320, 56, 52, '<circle cx="310" cy="340" r="11" class="w"/><path class="w" d="M302 332L318 348M318 332L302 348"/><text x="330" y="366" class="rep">E1</text><path class="pe" d="M310 351L310 372"/>');
    org('PC1', 346, 320, 62, 52, '<path class="w" d="M358 338A12 12 0 0 0 382 338Z"/><path class="w" d="M362 322L362 338M378 322L378 338"/><text x="388" y="366" class="rep">PC1</text>');
    // départ commande
    L(440, 130, 440, 168); L(460, 138, 460, 168);
    org('Q3', 426, 166, 70, 54, no(440, 170) + no(460, 170) + croix(440, 170) + croix(460, 170) + '<text x="472" y="196" class="rep">Q3</text>');
    L(440, 212, 440, 236); L(460, 212, 460, 236);
    org('T1', 426, 234, 74, 70, '<circle cx="450" cy="256" r="14" class="w"/><circle cx="450" cy="278" r="14" class="w"/><text x="472" y="262" class="rep">T1</text><text x="472" y="276" class="lg">400/24 V</text>');
    L(440, 292, 440, 312); L(460, 292, 460, 312); T(426, 326, '→ commande 24 V', 'lg');
    // terre
    org('BC1', 112, 396, 66, 44, '<rect x="130" y="404" width="20" height="10" class="w"/><text x="156" y="414" class="rep">BC1</text>');
    L(140, 414, 140, 440, 'pe'); L(128, 440, 152, 440); L(132, 446, 148, 446); L(136, 452, 144, 452); T(156, 448, 'PT1 · piquet', 'lg');
    return `<svg viewBox="0 0 540 470" xmlns="${NS}" role="img" aria-label="Schéma de puissance">${W.join('')}${G.join('')}</svg>`;
  }

  // commande : échelle verticale, colonne pompe à x = 220, voyant à x = 460
  T(24, 20, '24 V ~ · secondaire de T1', 'lg');
  L(40, 32, 60, 32);
  org('Q4', 40, 32, 64, 50, no(60, 34) + croix(60, 34) + '<text x="74" y="62" class="rep">Q4</text>');
  L(60, 76, 60, 92); L(60, 92, 500, 92); T(508, 96, '24 V', 'lg');
  L(60, 500, 500, 500); T(508, 504, '0 V', 'lg');
  const x = 220;
  L(x, 92, x, 104);
  org('S0', x - 18, 102, 78, 48, nf(x, 104) + `<path class="w" d="M${x + 10} 118L${x + 22} 118M${x + 22} 112L${x + 22} 124"/><text x="${x + 28}" y="132" class="rep">S0</text>`);
  L(x, 146, x, 154);
  W.push(no(x, 154)); T(x + 16, 178, 'Q1 13-14', 'lg'); T(x + 16, 190, '(Q1 fermé)', 'lg');
  L(x, 196, x, 204);
  org('S1', x - 18, 202, 78, 48, nf(x, 204) + `<text x="${x + 28}" y="232" class="rep">S1</text>`);
  L(x, 246, x, 258);
  org('S3', x - 88, 254, 210, 44, `<circle cx="${x}" cy="262" r="3" class="w"/><path class="w" d="M${x} 262L${x - 40} 284"/><path class="w" d="M${x - 70} 286L${x - 50} 286M${x + 50} 286L${x + 70} 286"/><text x="${x + 102}" y="290" class="rep">S3</text><text x="${x - 84}" y="280" class="lg">MANU</text><text x="${x + 54}" y="280" class="lg">AUTO</text>`);
  L(x - 60, 286, x - 60, 306); L(x + 60, 286, x + 60, 306);
  // MANU : S2 en parallèle avec l'auto-maintien KM1 13-14
  org('S2', x - 84, 304, 52, 48, no(x - 60, 306) + `<text x="${x - 112}" y="334" class="rep">S2</text>`);
  L(x - 60, 296, x - 12, 296); L(x - 12, 296, x - 12, 306); W.push(no(x - 12, 306)); T(x - 4, 330, 'KM1', 'lg'); T(x - 4, 341, '13-14', 'lg');
  L(x - 60, 348, x - 60, 366); L(x - 12, 348, x - 12, 366); L(x - 60, 366, x - 12, 366);
  // AUTO : poire de niveau
  org('B1', x + 40, 304, 72, 48, no(x + 60, 306) + `<circle cx="${x + 76}" cy="316" r="5" class="w"/><path class="w" d="M${x + 76} 321L${x + 76} 330"/><text x="${x + 88}" y="340" class="rep">B1</text>`);
  L(x + 60, 348, x + 60, 392); L(x - 36, 366, x - 36, 392); L(x - 36, 392, x + 60, 392); L(x + 12, 392, x + 12, 420);
  org('KM1', x - 12, 418, 74, 50, `<rect x="${x}" y="426" width="24" height="30" class="w"/><text x="${x + 32}" y="446" class="rep">KM1</text>`);
  L(x + 12, 456, x + 12, 500);
  // voyant de marche
  L(460, 92, 460, 300); W.push(no(460, 300)); T(474, 322, 'KM1 23-24', 'lg'); L(460, 342, 460, 396);
  org('H2', 436, 394, 76, 52, '<circle cx="460" cy="418" r="11" class="w"/><path class="w" d="M452 410L468 426M468 410L452 426"/><text x="478" y="422" class="rep">H2</text>');
  L(460, 429, 460, 500);
  return `<svg viewBox="0 0 560 520" xmlns="${NS}" role="img" aria-label="Schéma de commande">${W.join('')}${G.join('')}</svg>`;
}

export default function Schema({
  tab, sel, ok, onPick,
}: { tab: SchemaTab; sel: string | null; ok: Record<string, boolean>; onPick: (rep: string) => void }) {
  const html = React.useMemo(() => schemaSvg(tab, sel, ok), [tab, sel, ok]);
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const g = (e.target as Element).closest?.('g.org') as SVGGElement | null;
    const r = g?.getAttribute('data-r');
    if (r) onPick(r);
  };
  return (
    <div
      data-schema={tab}
      className="mes-sch max-w-[780px]"
      onClick={onClick}
      // tracé généré localement, sans donnée utilisateur
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
