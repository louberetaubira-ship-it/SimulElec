'use client';
/* eslint-disable @next/next/no-img-element -- sprites servis depuis public/sprites et data URI de bibliothèque */

/**
 * Bloc récepteurs, sous la platine (560 × 186 à partir de y = 734).
 * Port de `RECV` / `recvHtml` de `docs/reference/illustration-v4.tpl.html`.
 * Le moteur et sa boîte à bornes y sont dessinés par `<Panel>` (scène industrielle).
 */
import React from 'react';
import type { AnnexItem, AnnexKind, CatalogueItem } from '@/lib/types';
import { RECV_H, RECV_TITLE, RECV_Y } from '@/lib/scene/geometry';
import { svgForKey } from './svg';

export interface RecvProps {
  annex: AnnexKind;
  items: AnnexItem[];
  catalogue: Record<string, CatalogueItem>;
}

export default function Recv({ annex, items, catalogue }: RecvProps) {
  return (
    <div className="se-recv" style={{ top: RECV_Y, height: RECV_H }}>
      <span className="t">{RECV_TITLE[annex]}</span>
      {items.map((it) => {
        const item = catalogue[it.key];
        const vector = svgForKey(it.key);
        return (
          <div key={it.rep} className="item" style={{ left: it.x, top: it.y, width: it.w, height: it.h }}>
            {vector ?? <img src={item?.src ?? `/sprites/${it.key}.png`} alt={it.name} />}
            <div className="rep">{it.rep}</div>
          </div>
        );
      })}
    </div>
  );
}
