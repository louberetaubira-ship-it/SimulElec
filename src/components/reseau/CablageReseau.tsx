'use client';

/**
 * Étape CÂBLAGE d'un TP réseau : les trois familles de liaisons du synoptique (fibre vers la
 * loge, cordons 0,5 m du switch, câbles F/UTP vers les prises RJ45) sur la scène courant
 * faible, puis le connecteur de brassage du lien de l'automate en T568B, fil par fil.
 *
 * Les liaisons passent par l'action de câblage du store (`clickTerminal`) : même tableau
 * de liaisons attendues, mêmes refus comptés, même barème que sur une platine.
 */
import React from 'react';
import type { AttemptState, Liaison, TpDefinition } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { cablageReseauComplet, familleLiaison, LIBELLE_FAMILLE, t568Complet } from '@/lib/sim/reseau';
import { Center, Hint, Side } from '@/components/parcours/StageLayout';
import ReseauScene from './ReseauScene';
import ConnecteurT568 from './ConnecteurT568';
import { libelleBorne } from './geometrie';

const cle = (a: string, b: string) => [a, b].sort().join('~');

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  selTerminal: string | null;
  onTerminal: (id: string) => void;
  onT568: (broche: number, couleur: string) => void;
  onNext: () => void;
  prof?: boolean;
}

export default function CablageReseau({ tp, st, selTerminal, onTerminal, onT568, onNext, prof }: Props) {
  const def = tp.reseau!;
  const [vise, setVise] = React.useState<Liaison | null>(null);
  const faits = new Set(st.wires.map(w => cle(w.a, w.b)));
  const req = tp.liaisons.filter(l => !l.prewired);
  const familles = (['fibre', 'cordon', 'cable'] as const).map(f => ({ f, l: req.filter(x => familleLiaison(x) === f) }));
  const nFaits = req.filter(l => faits.has(cle(l.a, l.b))).length;
  const complet = cablageReseauComplet(tp, st);
  const wires = [
    ...tp.liaisons.filter(l => l.prewired),
    ...st.wires,
  ];

  const panneau = (
    <>
      <SideTitle>Câblage courant faible</SideTitle>
      <Note>
        Clique les deux extrémités de chaque liaison sur la scène. Une liaison hors du synoptique est refusée et
        comptée. Termine par le connecteur de brassage de l&apos;automate (port {def.portT568b}), en T568B.
      </Note>
      <Card title={`Liaisons · ${nFaits} / ${req.length}`}>
        <div className="flex flex-col gap-2">
          {familles.map(({ f, l }) => (
            <div key={f}>
              <b className="text-[11.5px]">{LIBELLE_FAMILLE[f]} · {l.filter(x => faits.has(cle(x.a, x.b))).length} / {l.length}</b>
              <div className="mt-1 flex flex-col gap-1">
                {l.map(x => {
                  const ok = faits.has(cle(x.a, x.b));
                  const on = vise && cle(vise.a, vise.b) === cle(x.a, x.b);
                  return (
                    <button
                      key={cle(x.a, x.b)}
                      type="button"
                      onClick={() => setVise(on ? null : x)}
                      className={`rounded-md border px-2 py-1 text-left text-[11px] ${ok ? 'border-good/50 bg-good/10' : on ? 'border-accent bg-accent/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}
                    >
                      {ok ? '✓ ' : ''}{libelleBorne(x.a)} → {libelleBorne(x.b)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title={`Connecteur T568B · ${t568Complet(def, st) ? 'fait' : 'à faire'}`}>
        <Note>Sous la scène : raccorde le câble F/UTP de l&apos;automate sur son connecteur de brassage, broche par broche.</Note>
      </Card>
      <Note>{st.wireErrors} liaison{st.wireErrors > 1 ? 's' : ''} refusée{st.wireErrors > 1 ? 's' : ''}.</Note>
      {complet && <Button variant="primary" onClick={onNext} data-next-cablage>Câblage complet, passer aux tests</Button>}
    </>
  );

  return (
    <>
      <Side>{panneau}</Side>
      <Center>
        <ReseauScene
          def={def}
          rack={st.reseau?.rack}
          wires={wires}
          sel={selTerminal ? [selTerminal] : []}
          aimed={vise ? [vise.a, vise.b] : []}
          clickable
          onTerminal={onTerminal}
        />
        <Hint>
          {selTerminal
            ? `${libelleBorne(selTerminal)} sélectionné : clique l’autre extrémité.`
            : 'Fibre jaune vers la loge, cordons bleus switch → panneau, câbles rouges de l’arrière du panneau vers les prises.'}
        </Hint>
        <section className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <h3 className="mb-2 font-title text-[17px] font-semibold uppercase tracking-wide">
            Connecteur de brassage du port {def.portT568b} · vue arrière · T568B (D.8.2)
          </h3>
          <ConnecteurT568 def={def} t568={st.reseau?.t568 ?? {}} onPlace={onT568} prof={prof} />
        </section>
      </Center>
    </>
  );
}
