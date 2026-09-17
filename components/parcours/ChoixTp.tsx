'use client';

import React from 'react';
import { TPS } from '@/lib/data/tps';
import { spriteUrl } from '@/lib/data/catalogue';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { Center, Side } from './StageLayout';
import { tpSprites } from './tpSprites';

interface Props {
  tpId: string;
  onSelect: (id: string) => void;
}

export default function ChoixTp({ tpId, onSelect }: Props) {
  return (
    <>
      <Side>
        <SideTitle>Catalogue</SideTitle>
        <Note>
          Choisis ton TP. Le professeur peut en imposer un à la classe ; les autres restent visibles au catalogue.
        </Note>
        <Card title="Compétences visées">
          <Note>C5 · Réaliser une installation<br />C6 · Mettre en service<br />C7 · Maintenir et dépanner</Note>
        </Card>
      </Side>

      <Center>
        <div className="grid w-full max-w-[760px] gap-3 sm:grid-cols-2">
          {TPS.map(tp => (
            <button
              key={tp.id}
              type="button"
              onClick={() => onSelect(tp.id)}
              className={`flex flex-col gap-2 rounded-2xl border bg-[var(--surface)] p-3.5 text-left transition-transform hover:-translate-y-0.5 ${tp.id === tpId ? 'border-accent ring-1 ring-accent' : 'border-[var(--line)]'}`}
            >
              <div className="flex h-[90px] items-center justify-center gap-1.5 rounded-xl bg-[var(--surface-2)]">
                {tpSprites(tp.id).map((k, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={spriteUrl(k)} alt="" className="max-h-[76px] max-w-[110px] object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />
                ))}
              </div>
              <h4 className="text-[19px] font-bold">
                {tp.title}
                {!tp.playable && <span className="ml-2 rounded-full bg-[var(--surface-2)] px-2 py-0.5 align-middle text-[10px] font-semibold text-muted">prévu</span>}
              </h4>
              <p className="m-0 text-[12.5px] text-muted">{tp.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">{tp.level}</span>
                {tp.competences.map(c => (
                  <span key={c} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">{c}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="w-full max-w-[760px]">
          <Button variant="primary" onClick={() => onSelect(tpId)}>Commencer ce TP</Button>
        </div>
      </Center>
    </>
  );
}
