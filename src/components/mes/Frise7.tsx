'use client';

/** Frise des 7 étapes de la mise en service : hors tension (1 à 4), sous tension (5 à 7). */

import React from 'react';
import { SEPT_ETAPES } from '@/lib/mes/miseEnService';

export default function Frise7() {
  const [sel, setSel] = React.useState(0);
  const e = SEPT_ETAPES[sel];
  return (
    <div data-frise7>
      <div className="mb-1.5 flex gap-1.5 text-[10.5px] font-bold">
        <span className="flex-[4] rounded-md bg-[#2c6fd6]/10 px-2 py-0.5 text-[#2c6fd6]">🔒 HORS TENSION · installation consignée</span>
        <span className="flex-[3] rounded-md bg-crit/10 px-2 py-0.5 text-crit">⚡ SOUS TENSION</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {SEPT_ETAPES.map((x, i) => (
          <button
            key={x.n}
            type="button"
            data-etape7={x.n}
            onClick={() => setSel(i)}
            className={`rounded-[10px] border border-l-4 bg-[var(--surface)] px-2 py-1.5 text-left text-[12px] ${x.zone === 'hs' ? 'border-l-[#2c6fd6]' : 'border-l-crit'} ${sel === i ? 'border-accent ring-2 ring-accent/25' : 'border-[var(--line)]'}`}
          >
            <small className="block text-[10.5px] text-muted">Étape {x.n}</small>
            <b className="leading-tight">{x.titre}</b>
          </button>
        ))}
      </div>
      <div className="mt-2 rounded-[10px] bg-[var(--surface-2)] px-2.5 py-2 text-[12.5px]">
        <b>Étape {e.n} · {e.titre}</b>
        <span className="ml-2 text-[11px] text-muted">{e.zone === 'hs' ? '🔒 hors tension' : '⚡ sous tension'} · position {e.pos}</span>
        <div><b>Critère :</b> {e.critere}</div>
        <div><b>Pourquoi à cette place :</b> {e.pourquoi}</div>
      </div>
    </div>
  );
}
