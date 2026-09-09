'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { spriteUrl } from '@/lib/data/catalogue';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { goodChoices, materielComplete } from '@/lib/sim/progress';
import { Center, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  onChoose: (posteId: string, index: number) => void;
  onNext: () => void;
}

export default function Materiel({ tp, st, onChoose, onNext }: Props) {
  const nOk = goodChoices(tp, st);
  const complete = materielComplete(tp, st);

  return (
    <>
      <Side>
        <SideTitle>Choix du matériel</SideTitle>
        <Note>
          Pour chaque poste, choisis la référence qui répond au cahier des charges.
          Tout part de In = {tp.motor.In} A et de la tension de commande 230 V.
        </Note>
        <Card title="Avancement">
          <div className="font-mono-num text-[20px]">{nOk} / {tp.postes.length}</div>
          <Note>références justes</Note>
        </Card>
        <Button variant="primary" disabled={!complete} onClick={onNext}>
          Valider la liste et passer à la pose
        </Button>
      </Side>

      <Center>
        <div className="flex w-full max-w-[780px] flex-col gap-2.5">
          {tp.postes.map(p => {
            const ch = st.choices[p.id];
            const chosen = ch != null ? p.options[ch] : null;
            return (
              <section key={p.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
                <h4 className="flex flex-wrap items-baseline justify-between gap-2 text-[17px] font-bold">
                  {p.name}
                  <small className="font-sans text-[11.5px] font-normal text-muted">{p.need}</small>
                </h4>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {p.options.map((o, i) => {
                    const sel = ch === i;
                    const tone = sel ? (o.ok ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : 'border-[var(--line)] bg-[var(--surface)]';
                    return (
                      <button
                        key={`${o.ref}-${i}`}
                        type="button"
                        onClick={() => onChoose(p.id, i)}
                        className={`flex min-h-touch items-center gap-2 rounded-[10px] border p-2 text-left ${tone}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={spriteUrl(o.key)} alt="" className="h-[52px]" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />
                        <span>
                          <b className="block text-[12px]">{o.ref}</b>
                          <span className="block text-[10.5px] leading-tight text-muted">{o.spec}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {chosen && (
                  <p className={`mt-1.5 text-[12px] ${chosen.ok ? 'text-good' : chosen.half ? 'text-warn' : 'text-crit'}`}>
                    {chosen.why}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </Center>
    </>
  );
}
