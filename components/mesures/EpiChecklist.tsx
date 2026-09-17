'use client';

/** Choix des EPI avant intervention BT (port de `EPI` / `mesTasks` étape 0). */
import React from 'react';
import { EPI, epiComplete } from '@/lib/sim/mesures';
import { Note } from '@/components/ui';

export interface EpiChecklistProps {
  epi: Record<string, boolean>;
  onToggle: (id: string) => void;
}

export default function EpiChecklist({ epi, onToggle }: EpiChecklistProps) {
  const ok = epiComplete(epi);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {EPI.map(e => {
          const on = !!epi[e.id];
          return (
            <button
              key={e.id}
              type="button"
              data-epi={e.id}
              onClick={() => onToggle(e.id)}
              aria-pressed={on}
              className={`flex min-h-touch items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left text-[12px] ${on ? 'border-good bg-good/10 font-semibold' : 'border-[var(--line)] bg-[var(--surface)]'}`}
            >
              <svg viewBox="0 0 44 44" width={26} height={26} aria-hidden dangerouslySetInnerHTML={{ __html: e.icon }} />
              <span className="min-w-0">
                {e.name}
                {!e.req && <small className="ml-1 text-muted">(option)</small>}
              </span>
              <span className="ml-auto text-good">{on ? '✓' : ''}</span>
            </button>
          );
        })}
      </div>
      <Note className={ok ? 'text-good' : ''}>
        {ok
          ? 'Équipement complet : tu peux passer à la consignation.'
          : 'Coche tout l\'équipement obligatoire pour une intervention BT (les options ne bloquent pas).'}
      </Note>
    </div>
  );
}
