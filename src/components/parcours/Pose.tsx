'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { spriteUrl } from '@/lib/data/catalogue';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { missingSlots, poseComplete } from '@/lib/sim/progress';
import type { SimState } from '@/lib/sim/engine';
import Panel from '@/components/panel/Panel';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  sim: SimState;
  selSlot: string | null;
  selDevice: string | null;
  onSlotClick: (id: string) => void;
  onDeviceSelect: (id: string) => void;
  onNext: () => void;
}

export default function Pose({ tp, st, sim, selSlot, selDevice, onSlotClick, onDeviceSelect, onNext }: Props) {
  const left = missingSlots(tp, st);
  const complete = poseComplete(tp, st);

  return (
    <>
      <Side>
        <SideTitle>Pose sur la platine</SideTitle>
        <Note>
          Clique un emplacement pointillé sur la platine, puis l&apos;appareil correspondant dans la caisse —
          ou l&apos;inverse. Le cahier des charges impose l&apos;ordre Q1 · KM1 · F1 sur le rail 1.
        </Note>
        <Card title="Caisse · matériel reçu">
          <div className="grid grid-cols-2 gap-1.5">
            {left.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onDeviceSelect(s.id)}
                className={`flex min-h-touch items-center gap-2 rounded-[10px] border p-1.5 text-left ${selDevice === s.id ? 'border-accent ring-1 ring-accent' : 'border-[var(--line)]'} bg-[var(--surface)]`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={spriteUrl(s.key)} alt="" className="h-[42px]" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />
                <span className="min-w-0">
                  <b className="block truncate text-[11.5px]">{s.label.split(' · ')[0]}</b>
                  <span className="block truncate text-[10px] text-muted">{s.label.split(' · ').slice(1).join(' · ')}</span>
                </span>
              </button>
            ))}
            {left.length === 0 && <Note>La caisse est vide : tout est posé.</Note>}
          </div>
        </Card>
        <Note>Erreurs de pose : {st.poseErrors}</Note>
        {complete && <Button variant="primary" onClick={onNext}>Platine conforme, passer au câblage</Button>}
      </Side>

      <Center>
        <Panel
          tp={tp}
          state={sim}
          mode="pose"
          placed={st.placed}
          wires={[]}
          selectedSlot={selSlot}
          onSlotClick={onSlotClick}
          onDeviceClick={() => undefined}
        />
        <Hint>
          {left.length
            ? `Emplacements restants : ${left.map(s => s.label.split(' · ')[0]).join(', ')}`
            : 'Tous les appareils sont posés à leur place.'}
        </Hint>
      </Center>
    </>
  );
}
