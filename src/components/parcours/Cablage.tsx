'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Note, SideTitle } from '@/components/ui';
import { isWired, requiredLiaisons, terminalDone, wiringComplete } from '@/lib/sim/progress';
import { terminalLabel } from '@/lib/sim/layout';
import type { SimState } from '@/lib/sim/engine';
import Panel from '@/components/panel/Panel';
import { NET_COLOR } from '@/components/panel/Wires';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  sim: SimState;
  selTerminal: string | null;
  onTerminalClick: (id: string) => void;
  onAssist: () => void;
  onNext: () => void;
  wires: { a: string; b: string; net: TpDefinition['liaisons'][number]['net'] }[];
}

const ASSIST = process.env.NEXT_PUBLIC_ASSIST === '1';

export default function Cablage({ tp, st, sim, selTerminal, onTerminalClick, onAssist, onNext, wires }: Props) {
  const required = requiredLiaisons(tp);
  const doneCount = required.filter(l => isWired(st, l)).length;
  const complete = wiringComplete(tp, st);
  let nextShown = false;

  return (
    <>
      <Side>
        <SideTitle>Tableau de câblage</SideTitle>
        <Note>
          Clique une borne, puis l&apos;autre : le fil prend la couleur du conducteur. Une liaison hors
          tableau est refusée et comptée en erreur. Les liaisons de l&apos;installateur (réseau → X1,
          X1 → moteur) sont déjà faites.
        </Note>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-num text-[12px]">
            {doneCount} / {required.length} liaisons · {st.wireErrors} erreur{st.wireErrors > 1 ? 's' : ''}
          </span>
          {ASSIST && <Button size="sm" onClick={onAssist}>Câblage assisté</Button>}
        </div>

        <div className="flex max-h-[46vh] flex-col gap-1 overflow-y-auto lg:max-h-[420px]">
          {required.map(l => {
            const d = isWired(st, l);
            const isNext = !d && !nextShown;
            if (!d) nextShown = true;
            return (
              <div
                key={`${l.a}~${l.b}`}
                className={`flex items-center gap-2 rounded-lg border bg-[var(--surface)] px-2 py-1.5 font-mono-num text-[11.5px] ${d ? 'border-[var(--line)] line-through opacity-55' : isNext ? 'border-accent' : 'border-[var(--line)]'}`}
              >
                <i className="h-1 w-3 flex-none rounded-sm" style={{ background: NET_COLOR[l.net] }} />
                {l.a.replace('.', ' ')} → {l.b.replace('.', ' ')}
              </div>
            );
          })}
        </div>

        {complete && <Button variant="primary" onClick={onNext}>Câblage terminé, passer aux tests</Button>}
      </Side>

      <Center>
        <Panel
          tp={tp}
          state={sim}
          mode="cablage"
          placed={st.placed}
          wires={wires}
          selectedTerminal={selTerminal}
          doneTerminals={id => terminalDone(tp, st, id)}
          onTerminalClick={onTerminalClick}
        />
        <Hint>
          {selTerminal
            ? `Borne ${terminalLabel(tp, selTerminal)} sélectionnée : clique la seconde borne.`
            : 'Suis le tableau à gauche : la prochaine liaison est encadrée.'}
        </Hint>
      </Center>
    </>
  );
}
