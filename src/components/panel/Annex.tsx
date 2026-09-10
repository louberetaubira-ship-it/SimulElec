'use client';
/* eslint-disable @next/next/no-img-element -- sprites servis depuis public/sprites et data URI de bibliothèque */

/**
 * Colonne de droite : porte (industriel) ou décor d'annexe (pièce, local, toiture).
 * Port de `ANNEX` / `annexHtml` de `docs/reference/illustration-v3.tpl.html`.
 */
import React from 'react';
import type { AnnexItem, AnnexKind, CatalogueItem } from '@/lib/types';
import { ANNEX_TITLE, ANNEX_X, ANNEX_Y } from '@/lib/scene/geometry';
import { svgForKey } from './svg';

function RoomDeco() {
  return (
    <svg className="deco" viewBox="0 0 118 680" preserveAspectRatio="none">
      <rect x="0" y="0" width="118" height="680" fill="#F6F2E9" />
      <rect x="0" y="600" width="118" height="80" fill="#D9D2C5" />
      <path d="M0 600h118" stroke="#B9AF9C" />
      {[70, 120, 232, 260, 340, 460, 540].map((y) => (
        <path key={y} d={`M-8 ${y} C -4 ${y} -2 ${y + 4} -2 ${y + 8}`} fill="none" stroke="#8E969E" strokeWidth="3" strokeDasharray="2 2" />
      ))}
      <text x="6" y="596" fontSize="6" fill="#8A7F6C" fontWeight="700">gaines ICTA encastrées</text>
    </svg>
  );
}

function LocalDeco() {
  return (
    <svg className="deco" viewBox="0 0 118 680" preserveAspectRatio="none">
      <rect x="0" y="0" width="118" height="680" fill="#EEF3F7" />
      <rect x="0" y="0" width="118" height="30" fill="#DCE3EA" />
      <text x="6" y="20" fontSize="6" fill="#4E555C" fontWeight="700">faux-plafond</text>
      <rect x="0" y="600" width="118" height="80" fill="#CFD6DD" />
      {[75, 125, 190, 270, 350, 420].map((y) => (
        <path key={y} d={`M-8 ${y} C -4 ${y} -2 ${y + 4} -2 ${y + 8}`} fill="none" stroke="#8E969E" strokeWidth="3" />
      ))}
      <text x="6" y="596" fontSize="6" fill="#4E555C" fontWeight="700">chemin de câbles</text>
    </svg>
  );
}

function RoofDeco() {
  const sky = React.useId();
  return (
    <svg className="deco" viewBox="0 0 118 680" preserveAspectRatio="none">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BFE0FA" /><stop offset="1" stopColor="#EAF4FC" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="118" height="680" fill={`url(#${sky})`} />
      <circle cx="96" cy="14" r="9" fill="#FFD84D" />
      <path d="M0 400 L118 380 L118 680 L0 680Z" fill="#B65C3A" />
      <g stroke="#8C4529" strokeWidth="1">
        {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M0 ${412 + i * 22} L118 ${392 + i * 22}`} />)}
      </g>
      <rect x="6" y="20" width="106" height="372" rx="3" fill="none" stroke="#7E8790" strokeWidth="2" />
      <text x="8" y="404" fontSize="6" fill="#fff" fontWeight="700">rails de fixation · 2 strings de 4</text>
      <g stroke="#D93A3A" strokeWidth="2" fill="none"><path d="M18 120v88M18 208v88M18 296v70" /></g>
      <g stroke="#20262D" strokeWidth="2" fill="none"><path d="M98 120v88M98 208v88M98 296v70" /></g>
      <g stroke="#37B34A" strokeWidth="1.5" strokeDasharray="3 2" fill="none"><path d="M58 20v370" /></g>
      <text x="10" y="450" fontSize="6" fill="#fff">câble solaire 6 mm² · MC4</text>
      <path d="M18 366 C 18 380 -6 380 -6 396" stroke="#D93A3A" strokeWidth="2" fill="none" />
      <path d="M98 366 C 98 386 -6 386 -6 402" stroke="#20262D" strokeWidth="2" fill="none" />
    </svg>
  );
}

const DECO: Record<Exclude<AnnexKind, 'door'>, () => React.ReactElement> = {
  room: RoomDeco, local: LocalDeco, roof: RoofDeco,
};

export interface AnnexProps {
  annex: AnnexKind;
  items: AnnexItem[];
  catalogue: Record<string, CatalogueItem>;
}

export default function Annex({ annex, items, catalogue }: AnnexProps) {
  if (annex === 'door') {
    return <div className="se-door"><span className="t">PORTE</span></div>;
  }
  const Deco = DECO[annex];
  return (
    <div className="se-annex">
      <Deco />
      <span className="t">{ANNEX_TITLE[annex]}</span>
      {items.map((it) => {
        const item = catalogue[it.key];
        const vector = svgForKey(it.key);
        return (
          <div
            key={it.rep}
            className="item"
            style={{ left: it.x - ANNEX_X, top: it.y - ANNEX_Y, width: it.w, height: it.h }}
          >
            {vector ?? (item?.src ? <img src={item.src} alt={it.name} /> : <img src={`/sprites/${it.key}.png`} alt={it.name} />)}
            <div className="rep">{it.rep}</div>
          </div>
        );
      })}
    </div>
  );
}
