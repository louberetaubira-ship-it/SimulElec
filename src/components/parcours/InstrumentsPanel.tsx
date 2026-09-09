'use client';

import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { Button, Card, Chip, Kpi, Lcd, Note } from '@/components/ui';
import { isRunning, type SimState } from '@/lib/sim/engine';
import { INSTRUMENTS, pointsFor, read, type InstrumentId } from '@/lib/sim/instruments';

interface Props {
  tp: TpDefinition;
  sim: SimState;
  instrument: InstrumentId;
  point: string | null;
  onLoad: (v: number) => void;
  onInstrument: (i: InstrumentId) => void;
  onPoint: (p: string) => void;
  onRead: () => void;
}

const fr = (v: number, d = 2) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function InstrumentsPanel({ tp, sim, instrument, point, onLoad, onInstrument, onPoint, onRead }: Props) {
  const r = read(sim, tp, instrument, point);
  const points = pointsFor(tp, instrument);

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-1.5">
          <Kpi k="U ligne" v={isRunning(sim) ? 400 : 0} unit="V" />
          <Kpi k="I ligne" v={fr(sim.I)} unit="A" />
          <Kpi k="Vitesse" v={Math.round(sim.n)} unit="tr/min" />
          <Kpi k="KM1" v={sim.km1 ? 'enclenché' : 'retombé'} small />
        </div>
        <label className="mt-2 flex items-center gap-2.5 text-[12px]">
          <span>Charge</span>
          <input
            type="range" min={0} max={160} value={Math.round(sim.load * 100)}
            onChange={e => onLoad(Number(e.target.value) / 100)}
            className="h-touch flex-1 accent-[var(--accent)]"
            aria-label="Charge mécanique du ventilateur"
          />
          <span className="font-mono-num">{Math.round(sim.load * 100)} %</span>
        </label>
      </Card>

      <Card title="Instruments">
        <div className="grid grid-cols-2 gap-1.5">
          {INSTRUMENTS.map(i => (
            <button
              key={i.id}
              type="button"
              onClick={() => onInstrument(i.id)}
              className={`min-h-touch rounded-[10px] border px-1 py-1.5 text-center text-[11px] ${instrument === i.id ? 'border-accent ring-1 ring-accent' : 'border-[var(--line)]'} bg-[var(--surface)]`}
            >
              {i.short}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <Lcd big={r.display} unit={r.unit} sub={r.sub} danger={r.refused} />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {points.map(p => (
            <Chip key={p.id} active={point === p.id} onClick={() => onPoint(p.id)}>{p.label}</Chip>
          ))}
          {points.length === 0 && <Note>Aucun point de mesure pour cet appareil.</Note>}
        </div>

        <Button className="mt-2" onClick={onRead}>Relever la mesure</Button>
        {r.note && <Note className="mt-1">{r.note}</Note>}
      </Card>
    </>
  );
}
