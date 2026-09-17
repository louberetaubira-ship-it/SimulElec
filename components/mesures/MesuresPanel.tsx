'use client';

/** Mesures attendues de l'étape et journal des lectures. */
import React from 'react';
import type { AttemptState, ExpectedMeasure, TpDefinition } from '@/lib/types';
import { mesureDone, mesuresFor } from '@/lib/sim/mesures';
import { Card, Note } from '@/components/ui';

export interface MesuresPanelProps {
  tp: TpDefinition;
  st: AttemptState;
  stage: ExpectedMeasure['stage'];
  log: string[];
}

function where(m: ExpectedMeasure): string {
  if (m.wire) return `pince sur ${m.wire.replace('>', ' → ')}`;
  if (m.a && m.b) return `${m.a.replace('.', ' ')} / ${m.b.replace('.', ' ')}`;
  return 'sur l\'arbre du moteur';
}

export default function MesuresPanel({ tp, st, stage, log }: MesuresPanelProps) {
  const list = mesuresFor(tp, stage);
  const done = list.filter(m => mesureDone(st, m.id)).length;

  return (
    <>
      <Card title={`Mesures attendues · ${done} / ${list.length}`}>
        <div className="flex flex-col gap-1.5">
          {list.map(m => {
            const ok = mesureDone(st, m.id);
            const rec = st.readings.find(r => r.expectedId === m.id);
            return (
              <div
                key={m.id}
                data-mesure={m.id}
                className={`rounded-[10px] border p-2 text-[12px] ${ok ? 'border-good bg-good/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}
              >
                <b className="block font-medium">{ok ? '✔ ' : ''}{m.title}</b>
                <span className="block font-mono-num text-[11px] text-muted">
                  {m.dial} · {where(m)} → attendu {m.min} à {m.max} {m.unit}
                  {m.when === 'run' ? ' · moteur en marche' : m.when === 'ctl' ? ' · commande sous tension' : ''}
                </span>
                {rec && <span className="block font-mono-num text-[11px] text-good">lu : {rec.display}</span>}
              </div>
            );
          })}
          {list.length === 0 && <Note>Aucune mesure définie pour cette étape.</Note>}
        </div>
      </Card>

      <Card title="Journal des mesures">
        <div className="flex flex-col gap-1 font-mono-num text-[11px]">
          {log.length ? log.map((l, i) => <div key={`${i}-${l}`}>{l}</div>) : <Note>Journal vide.</Note>}
        </div>
      </Card>
    </>
  );
}
