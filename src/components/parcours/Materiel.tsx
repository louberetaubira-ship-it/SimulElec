'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { spriteUrl } from '@/lib/data/catalogue';
import { svgForKey } from '@/components/panel/svg';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { goodChoices, materielComplete } from '@/lib/sim/progress';
import { shuffledOrder } from '@/lib/sim/shuffle';
import { Center, Side } from './StageLayout';

/**
 * Vignette d'une option : la photo du pack quand elle existe, sinon le dessin
 * vectoriel de l'appareil — le même que sur la platine. Sans cela, un appareil
 * dessiné (sectionneur GK1, contacteur LC1 D50, relais CAD 32) apparaissait en
 * image cassée à l'étape matériel.
 */
function Vignette({ itemKey, img }: { itemKey: string; img?: string }) {
  if (img) {
    // photo de catalogue parfois très large (PDU, panneau 19") : bornée pour laisser lire la référence
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" className="h-[52px] max-w-[84px] flex-none object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />;
  }
  const vector = svgForKey(itemKey);
  if (vector) return <span className="grid h-[52px] w-[40px] flex-none place-items-center">{vector}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={spriteUrl(itemKey)} alt="" className="h-[52px]" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />
  );
}

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
          {tp.motor ? `Tout part de In = ${String(tp.motor.In).replace('.', ',')} A et de la tension de commande 24 V.` : 'Appuie-toi sur le cahier des charges et les sections imposées.'}
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
                  {shuffledOrder(p.id, p.options.length).map((i) => {
                    const o = p.options[i];
                    const sel = ch === i;
                    const tone = sel ? (o.ok ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : 'border-[var(--line)] bg-[var(--surface)]';
                    return (
                      <button
                        key={`${o.ref}-${i}`}
                        type="button"
                        onClick={() => onChoose(p.id, i)}
                        className={`flex min-h-touch items-center gap-2 rounded-[10px] border p-2 text-left ${tone}`}
                      >
                        <Vignette itemKey={o.key} img={o.img} />
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
