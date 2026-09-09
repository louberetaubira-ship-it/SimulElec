'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Card, CheckRow, Note, SideTitle } from '@/components/ui';
import { serviceChecks } from '@/lib/sim/progress';
import { isRunning, type SimState } from '@/lib/sim/engine';
import type { InstrumentId } from '@/lib/sim/instruments';
import Panel from '@/components/panel/Panel';
import InstrumentsPanel from './InstrumentsPanel';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  sim: SimState;
  wires: { a: string; b: string; net: TpDefinition['liaisons'][number]['net'] }[];
  instrument: InstrumentId;
  point: string | null;
  onLoad: (v: number) => void;
  onInstrument: (i: InstrumentId) => void;
  onPoint: (p: string) => void;
  onRead: () => void;
  onDeviceClick: (id: string) => void;
  onButton: (b: 's1' | 's2') => void;
  onNext: () => void;
}

export default function MiseEnService(p: Props) {
  const checks = serviceChecks(p.tp, p.st, p.sim);
  const allOk = checks.every(c => c.ok);

  return (
    <>
      <Side>
        <SideTitle>Mise en service et relevés</SideTitle>
        <InstrumentsPanel
          tp={p.tp} sim={p.sim} instrument={p.instrument} point={p.point}
          onLoad={p.onLoad} onInstrument={p.onInstrument} onPoint={p.onPoint} onRead={p.onRead}
        />
        <Card title="Relevés attendus">
          <div className="flex flex-col gap-1.5">
            {checks.map(c => <CheckRow key={c.id} done={c.ok} title={c.title} />)}
          </div>
          {allOk && <Button variant="primary" className="mt-2" onClick={p.onNext}>Fonctionnement conforme, passer à la validation</Button>}
        </Card>
        <Note>Relevés enregistrés : {p.st.readings.filter(r => r.stage === 6).length}</Note>
      </Side>

      <Center>
        <Panel
          tp={p.tp}
          state={p.sim}
          mode="service"
          placed={p.st.placed}
          wires={p.wires}
          onDeviceClick={p.onDeviceClick}
          onButton={p.onButton}
        />
        <Hint>
          {isRunning(p.sim)
            ? 'Moteur en marche. Fais tes relevés, puis arrête par S1 (bouton rouge, en bas).'
            : 'Ferme Q1 puis F2 en les cliquant, puis appuie sur S2 (bouton vert, en haut).'}
        </Hint>
      </Center>
    </>
  );
}
