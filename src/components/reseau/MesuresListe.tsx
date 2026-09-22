'use client';

/** Mesures attendues d'une étape d'un TP réseau, et journal : nommées comme sur la scène. */
import React from 'react';
import type { AttemptState, ExpectedMeasure, TpDefinition } from '@/lib/types';
import { mesureDone, mesuresFor } from '@/lib/sim/mesures';
import { Card } from '@/components/ui';

export default function MesuresListe({ tp, st, stage, log }: {
  tp: TpDefinition; st: AttemptState; stage: ExpectedMeasure['stage']; log: string[];
}) {
  const list = mesuresFor(tp, stage);
  const done = list.filter(m => mesureDone(st, m.id)).length;
  return (
    <>
      <Card title={`Mesures attendues · ${done} / ${list.length}`}>
        <div className="flex flex-col gap-1.5">
          {list.map(m => {
            const rec = st.readings.find(r => r.expectedId === m.id);
            return (
              <div key={m.id} data-mesure={m.id}
                className={`rounded-lg border px-2 py-1.5 text-[11.5px] ${rec ? 'border-good/50 bg-good/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}>
                <b>{rec ? '✓ ' : ''}{m.title}</b>
                <div className="font-mono-num text-[11px] text-muted">
                  attendu : {m.min === m.max ? m.min : `${m.min} à ${m.max}`} {m.unit}{rec ? ` · relevé ${rec.display}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {log.length > 0 && (
        <Card title="Journal">
          <div className="flex flex-col gap-1 font-mono-num text-[11px]">{log.map((l, i) => <div key={`${i}-${l}`}>{l}</div>)}</div>
        </Card>
      )}
    </>
  );
}
