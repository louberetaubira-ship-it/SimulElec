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

/**
 * Bandeau « toiture » en plein cadre (560 × 720) : un rectangle de ciel dégradé
 * couvre le haut du coffret (x 8..552, y 8..122), au-dessus du rail 1. Les panneaux
 * PV et la boîte de jonction se posent dessus (z-index supérieur) ; le parc batterie,
 * lui, est un bloc à part, sous le bandeau. Dessiné derrière les organes (z-index bas).
 */
function RoofBand() {
  const sky = React.useId();
  return (
    <svg className="deco" viewBox="0 0 560 720" preserveAspectRatio="none">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BFE0FA" /><stop offset="1" stopColor="#EAF4FC" />
        </linearGradient>
      </defs>
      {/* ciel du bandeau AGRANDI : 2 rangées de modules + couloirs + boîte de jonction */}
      <rect x="8" y="8" width="544" height="224" rx="10" fill={`url(#${sky})`} stroke="#8FB8D8" />
      {/* soleil */}
      <circle cx="524" cy="28" r="11" fill="#FFD84D" stroke="#F0B429" />
      <g stroke="#F0B429" strokeWidth="1.5">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <path
              key={i}
              d={`M${524 + Math.cos(a) * 15} ${28 + Math.sin(a) * 15}L${524 + Math.cos(a) * 20} ${28 + Math.sin(a) * 20}`}
            />
          );
        })}
      </g>
      {/* libellé en haut à gauche du bandeau */}
      <text x="16" y="20" fontSize="8" fontWeight="700" fill="#2C5E8A" letterSpacing=".04em">
        ① TOITURE · champ PV 3S4P
      </text>
    </svg>
  );
}

const DECO: Record<'room' | 'local', () => React.ReactElement> = {
  room: RoomDeco, local: LocalDeco,
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
  // Toiture : bandeau horizontal EN PLEIN CADRE (560 × 720). Les items s'y affichent à
  // leur coordonnée scène ABSOLUE (position écran = it.x/it.y), pour rester alignés sur
  // les bornes (`annexTerminals`, en coordonnées absolues). Pour 'room'/'local', on garde
  // la colonne d'annexe historique (item posé à `it.x - ANNEX_X` dans un conteneur décalé).
  const band = annex === 'roof';
  return (
    <div className={band ? 'se-annex band' : 'se-annex'}>
      {band ? <RoofBand /> : React.createElement(DECO[annex])}
      {/* En bandeau toiture, le libellé « ① TOITURE » est déjà porté par le SVG :
          on ne réaffiche pas le titre d'annexe pour éviter le double libellé. */}
      {band ? null : <span className="t">{ANNEX_TITLE[annex]}</span>}
      {items.map((it) => {
        const item = catalogue[it.key];
        const vector = svgForKey(it.key);
        return (
          <div
            key={it.rep}
            className="item"
            style={
              band
                ? { left: it.x, top: it.y, width: it.w, height: it.h }
                : { left: it.x - ANNEX_X, top: it.y - ANNEX_Y, width: it.w, height: it.h }
            }
          >
            {vector ?? (item?.src ? <img src={item.src} alt={it.name} /> : <img src={`/sprites/${it.key}.png`} alt={it.name} />)}
            <div className="rep">{it.rep}</div>
          </div>
        );
      })}
    </div>
  );
}
