'use client';

import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { Button, Note, SideTitle } from '@/components/ui';
import { Center, Side } from './StageLayout';

export default function Enonce({ tp, onNext }: { tp: TpDefinition; onNext: () => void }) {
  return (
    <>
      <Side>
        <SideTitle>Consignes</SideTitle>
        <Note>
          Lis la situation et le cahier des charges : tout ce qui suit — références, platine, câblage,
          valeurs attendues — en découle. Le professeur virtuel connaît ce texte.
        </Note>
        <Button variant="primary" onClick={onNext}>J&apos;ai lu, choisir le matériel</Button>
      </Side>

      <Center>
        <article className="flex w-full max-w-[760px] flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
            Situation professionnelle · {tp.level}
          </div>
          <h2 className="text-[26px] font-bold">{tp.title}</h2>
          <p className="m-0 text-[13.5px]">{tp.situation}</p>

          <div
            className="grid grid-cols-2 gap-x-4 gap-y-1 rounded border-2 border-[#9AA3AD] bg-[#DDE1E6] p-3 font-mono-num text-[12px] text-[#141A21] sm:grid-cols-4"
            style={{ boxShadow: 'inset 0 1px 0 #fff' }}
          >
            <b className="col-span-full font-title text-[16px] tracking-[.06em]">MOTEUR ASYNCHRONE 3~</b>
            {Object.entries(tp.plaque).map(([k, v]) => <span key={k}>{k} = {v}</span>)}
          </div>

          <h3 className="mt-1 text-[17px] font-bold">Cahier des charges</h3>
          <div className="grid gap-x-4 text-[13px] sm:grid-cols-2">
            {tp.cahierDesCharges.map(c => (
              <div key={c.k} className="flex justify-between gap-2 border-b border-[var(--line)] py-1">
                <span className="text-muted">{c.k}</span><b className="text-right">{c.v}</b>
              </div>
            ))}
          </div>

          <Note className="mt-1">
            Livrables : matériel choisi et justifié, platine câblée, fiche de tests hors tension,
            relevés en service, rapport de validation ou de dépannage.
          </Note>
        </article>
      </Center>
    </>
  );
}
