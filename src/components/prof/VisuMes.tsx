'use client';

/**
 * Visualisation (lecture seule) d'une tentative du TP « mise en service » :
 * étapes validées, erreurs par étape et procès-verbal tel que l'élève l'a établi.
 */

import React from 'react';
import type { AttemptRow } from '@/lib/db/types';
import type { TpDefinition } from '@/lib/types';
import {
  erreurs, MES_STEPS, mesScore, normalizeMesState, rapportPv, type MesState,
} from '@/lib/mes/miseEnService';

export default function VisuMes({ attempt, tp, onClose }: {
  attempt: AttemptRow & { student?: { full_name: string | null } | null };
  tp: TpDefinition;
  onClose: () => void;
}) {
  const s = React.useMemo(
    () => normalizeMesState(attempt.state as unknown as Partial<MesState> | null),
    [attempt.state],
  );
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-3" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-[18px] font-bold">{tp.title}</h2>
            <p className="m-0 text-[12.5px] text-muted">
              {attempt.student?.full_name ?? 'Élève'} · score {mesScore(s)} / 100
            </p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12.5px] font-semibold">
            Fermer
          </button>
        </div>
        <ol className="m-0 mt-3 grid list-none gap-1 p-0 text-[12.5px] md:grid-cols-2">
          {MES_STEPS.map((st, i) => (
            <li key={st.title} className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-2 py-1">
              <span className={`grid h-5 w-5 flex-none place-items-center rounded-full text-[10.5px] font-bold ${s.done[i] ? 'bg-good text-white' : 'bg-[var(--line)]'}`}>
                {s.done[i] ? '✓' : i + 1}
              </span>
              <span className="min-w-0 flex-1">{st.title}</span>
              <span className="text-[11px] text-muted">{erreurs(s, i)} err.</span>
            </li>
          ))}
        </ol>
        <pre className="m-0 mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono-num text-[12px] leading-relaxed">
          {rapportPv(s)}
        </pre>
      </div>
    </div>
  );
}
