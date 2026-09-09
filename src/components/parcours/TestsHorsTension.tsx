'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, CheckRow, Note, SideTitle } from '@/components/ui';
import { testsComplete } from '@/lib/sim/progress';
import type { SimState } from '@/lib/sim/engine';
import Panel from '@/components/panel/Panel';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  sim: SimState;
  wires: { a: string; b: string; net: TpDefinition['liaisons'][number]['net'] }[];
  onRunTest: (id: string, value: string) => void;
  onNext: () => void;
}

export default function TestsHorsTension({ tp, st, sim, wires, onRunTest, onNext }: Props) {
  const complete = testsComplete(tp, st);
  return (
    <>
      <Side>
        <SideTitle>Tests avant mise en service</SideTitle>
        <Note>
          Réseau consigné : Q1 ouvert, cadenas posé, VAT faite. Réalise chaque test ; la valeur
          relevée s&apos;inscrit dans la fiche. Jamais de mesure d&apos;ohms sous tension.
        </Note>
        <div className="flex flex-col gap-1.5">
          {tp.tests.map(t => {
            const value = st.tests[t.id];
            return (
              <CheckRow key={t.id} done={!!value} title={t.title} sub={t.how}>
                {value
                  ? <div className="font-mono-num text-[12px] text-good">{value}</div>
                  : <Button size="sm" className="mt-1.5" onClick={() => onRunTest(t.id, t.expected)}>Réaliser le test</Button>}
              </CheckRow>
            );
          })}
        </div>
        {complete && <Button variant="primary" onClick={onNext}>Fiche complète, mettre en service</Button>}
      </Side>

      <Center>
        <Panel tp={tp} state={sim} mode="hors-tension" placed={st.placed} wires={wires} />
        <Hint>Hors tension : les fils sont en place, rien n&apos;est alimenté.</Hint>
      </Center>
    </>
  );
}
