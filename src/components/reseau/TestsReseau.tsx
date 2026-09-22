'use client';

/**
 * Étape TESTS HORS TENSION d'un TP réseau : contrôle visuel, séparation courant fort /
 * courant faible, testeur de câble sur le lien raccordé en T568B, fibre au stylo optique.
 * Le verdict du testeur n'est pas écrit d'avance : il vient du lien réellement posé.
 */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, CheckRow, Note, SideTitle } from '@/components/ui';
import { testsComplete } from '@/lib/sim/progress';
import { etatReseau, t568Complet, testeur, type VerdictTesteur } from '@/lib/sim/reseau';
import { Center, Hint, Side } from '@/components/parcours/StageLayout';
import ReseauScene from './ReseauScene';
import { Testeur } from './Outils';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  onRunTest: (id: string, value: string) => void;
  onNext: () => void;
}

export default function TestsReseau({ tp, st, onRunTest, onNext }: Props) {
  const def = tp.reseau!;
  const complete = testsComplete(tp, st);
  const [v, setV] = React.useState<VerdictTesteur | null>(null);
  const port = def.portT568b;
  const eq = def.equipements.find(e => e.port === port);

  const faire = (id: string, attendu: string) => {
    if (id === 'testeur-t568') {
      const e = etatReseau(tp, st, false);
      const r = testeur(tp, e, `PPR.${port}`, `${eq?.id}.RJ`);
      // le connecteur T568B de l'élève fait foi : une broche fausse se verrait ici
      const verdict = t568Complet(def, st) ? r : { ...r, verdict: 'défaut' as const };
      setV(verdict);
      onRunTest(id, verdict.verdict === 'droit' ? '8/8 · 1-1 … 8-8 · câble droit' : `${verdict.continus}/8 · défaut`);
      return;
    }
    onRunTest(id, attendu);
  };

  const panneau = (
    <>
      <SideTitle>Tests avant mise sous tension</SideTitle>
      <Note>
        Tout se vérifie PDU ouvert, rien d&apos;alimenté : repérage, cheminements, puis les liens eux-mêmes — le testeur
        de câble sur le connecteur que tu viens de raccorder, le stylo optique sur la fibre.
      </Note>
      <div className="flex flex-col gap-1.5">
        {tp.tests.map(t => {
          const value = st.tests[t.id];
          return (
            <CheckRow key={t.id} done={!!value} title={t.title} sub={t.how}>
              {value
                ? <div className="font-mono-num text-[12px] text-good">{value}</div>
                : <Button size="sm" className="mt-1.5" data-test={t.id} onClick={() => faire(t.id, t.expected)}>Réaliser le contrôle</Button>}
            </CheckRow>
          );
        })}
      </div>
      {complete && <Button variant="primary" onClick={onNext}>Fiche complète, passer aux EPI</Button>}
    </>
  );

  return (
    <>
      <Side>{panneau}</Side>
      <Center>
        <ReseauScene def={def} rack={st.reseau?.rack} wires={[...tp.liaisons.filter(l => l.prewired), ...st.wires]} />
        <div className="w-full max-w-[560px]">
          <Testeur v={v} />
        </div>
        <Hint>Hors tension : les liaisons sont posées, le PDU est ouvert.</Hint>
      </Center>
    </>
  );
}
