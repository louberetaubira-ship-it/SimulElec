'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Note, SideTitle } from '@/components/ui';
import { isWired, requiredLiaisons, wiringComplete } from '@/lib/sim/progress';
import { terminalLabel } from '@/lib/sim/layout';
import { NET_COLOR } from '@/lib/scene/geometry';
import type { PanelWire } from '@/components/panel/Panel';
import TpPanel from './TpPanel';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  wires: PanelWire[];
  selTerminal: string | null;
  onTerminalClick: (id: string) => void;
  onAssist: () => void;
  onNext: () => void;
}

const ASSIST = process.env.NEXT_PUBLIC_ASSIST === '1';

export default function Cablage({ tp, st, wires, selTerminal, onTerminalClick, onAssist, onNext }: Props) {
  const required = requiredLiaisons(tp);
  const doneCount = required.filter(l => isWired(st, l)).length;
  const complete = wiringComplete(tp, st);
  const next = required.find(l => !isWired(st, l));

  return (
    <>
      <Side>
        <SideTitle>Tableau de câblage</SideTitle>
        <Note>
          Clique une borne puis l&apos;autre : le fil prend la couleur du conducteur et chemine dans les
          goulottes. Une liaison hors tableau est refusée et comptée en erreur. Le réseau → X1 et le câble
          moteur sont déjà posés par l&apos;installateur.
        </Note>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-num text-[12px]">
            {doneCount} / {required.length} liaisons · {st.wireErrors} erreur{st.wireErrors > 1 ? 's' : ''}
          </span>
          {ASSIST && <Button size="sm" onClick={onAssist}>Câblage assisté</Button>}
        </div>
        {next && (
          <div className="rounded-[10px] border border-accent bg-accent/10 px-2 py-1.5 font-mono-num text-[12px]">
            Fil suivant : {next.a.replace('.', ' ')} → {next.b.replace('.', ' ')} <span className="text-muted">({next.net})</span>
          </div>
        )}

        <div className="flex max-h-[46vh] flex-col gap-1 overflow-y-auto lg:max-h-[420px]">
          {required.map(l => {
            const d = isWired(st, l);
            const isNext = next === l;
            return (
              <div
                key={`${l.a}~${l.b}`}
                className={`flex items-center gap-2 rounded-lg border bg-[var(--surface)] px-2 py-1.5 font-mono-num text-[11.5px] ${d ? 'border-[var(--line)] line-through opacity-55' : isNext ? 'border-accent' : 'border-[var(--line)]'}`}
              >
                <i className="h-1 w-3 flex-none rounded-sm" style={{ background: NET_COLOR[l.net] }} />
                {l.a.replace('.', ' ')} → {l.b.replace('.', ' ')}
                {l.door && <span className="ml-auto text-[10px] text-muted">porte</span>}
              </div>
            );
          })}
        </div>

        {complete && <Button variant="primary" onClick={onNext}>Câblage terminé, passer aux tests</Button>}
      </Side>

      <Center>
        <TpPanel
          tp={tp}
          wires={wires}
          cover={false}
          marks
          pickTerminals
          onTerminal={onTerminalClick}
          highlight={null}
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
