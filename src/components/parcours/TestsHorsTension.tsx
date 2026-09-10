'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, CheckRow, Note, SideTitle } from '@/components/ui';
import { testsComplete } from '@/lib/sim/progress';
import type { PanelWire } from '@/components/panel/Panel';
import TpPanel from './TpPanel';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  wires: PanelWire[];
  onRunTest: (id: string, value: string) => void;
  onNext: () => void;
}

export default function TestsHorsTension({ tp, st, wires, onRunTest, onNext }: Props) {
  const complete = testsComplete(tp, st);
  return (
    <>
      <Side>
        <SideTitle>Tests avant mise sous tension</SideTitle>
        <Note>
          Contrôle visuel, serrage, repérage : tout se vérifie platine hors tension. Les mesures
          d&apos;isolement et de continuité viendront après la consignation, aux étapes suivantes.
        </Note>
        <div className="flex flex-col gap-1.5">
          {tp.tests.map(t => {
            const value = st.tests[t.id];
            return (
              <CheckRow key={t.id} done={!!value} title={t.title} sub={t.how}>
                {value
                  ? <div className="font-mono-num text-[12px] text-good">{value}</div>
                  : <Button size="sm" className="mt-1.5" data-test={t.id} onClick={() => onRunTest(t.id, t.expected)}>Réaliser le contrôle</Button>}
              </CheckRow>
            );
          })}
        </div>
        {complete && <Button variant="primary" onClick={onNext}>Fiche complète, passer aux EPI</Button>}
      </Side>

      <Center>
        <TpPanel tp={tp} wires={wires} cover={false} marks />
        <Hint>Hors tension : les fils sont en place, rien n&apos;est alimenté.</Hint>
      </Center>
    </>
  );
}
