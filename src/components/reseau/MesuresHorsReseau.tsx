'use client';

/**
 * Étape MESURES HORS TENSION d'un TP réseau : le testeur de câble, lien par lien. L'élève
 * choisit le lien, branche injecteur et récepteur, lit les 8 LED, et note sa lecture.
 */
import React from 'react';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { horsTensionComplete } from '@/lib/sim/progress';
import { etatReseau, familleLiaison, LIBELLE_FAMILLE, liensTestables, testeur, type VerdictTesteur } from '@/lib/sim/reseau';
import { useParcours } from '@/app/tp/[id]/store';
import { Center, Hint, Side } from '@/components/parcours/StageLayout';
import ReseauScene from './ReseauScene';
import MesuresListe from './MesuresListe';
import { Testeur } from './Outils';
import { libelleBorne } from './geometrie';

export default function MesuresHorsReseau({ onNext }: { onNext: () => void }) {
  const s = useParcours();
  const { tp, st, mes } = s;
  const def = tp.reseau!;
  const liens = liensTestables(tp).filter(l => !l.prewired);
  const [lien, setLien] = React.useState<string>('');
  const [v, setV] = React.useState<VerdictTesteur | null>(null);
  const choisi = liens.find(l => `${l.a}~${l.b}` === lien);

  const tester = () => {
    if (!choisi) return;
    setV(testeur(tp, etatReseau(tp, st, false), choisi.a, choisi.b));
  };
  const noter = () => {
    if (!choisi || !v) return;
    s.reseauReleve({
      instrument: 'lan', dial: 'test', a: choisi.a, b: choisi.b, value: v.continus,
      display: v.verdict === 'droit' ? '8/8 droit' : `${v.continus}/8 ${v.verdict}`,
    });
  };

  const panneau = (
    <>
      <SideTitle>Mesures hors tension</SideTitle>
      <Note>
        Armoire consignée, équipements débranchés de leurs prises : le testeur injecte un signal sur chaque brin et
        le récepteur, à l&apos;autre bout, dit s&apos;il arrive — et où.
      </Note>
      <Card title="Testeur de câble réseau">
        <label className="mb-1 block text-[11.5px] font-medium text-muted" htmlFor="lan-lien">Lien testé</label>
        <select id="lan-lien" value={lien} onChange={e => { setLien(e.target.value); setV(null); }}
          className="min-h-touch w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[12px]">
          <option value="">— choisis un lien —</option>
          {liens.map(l => (
            <option key={`${l.a}~${l.b}`} value={`${l.a}~${l.b}`}>
              {LIBELLE_FAMILLE[familleLiaison(l)]} · {libelleBorne(l.a)} → {libelleBorne(l.b)}
            </option>
          ))}
        </select>
        <div className="mt-2 flex gap-1.5">
          <Button size="sm" disabled={!choisi} onClick={tester} data-lan-tester>Brancher et tester</Button>
          <Button size="sm" disabled={!v} onClick={noter} data-lan-noter>Noter cette lecture</Button>
        </div>
        <div className="mt-2"><Testeur v={v} /></div>
      </Card>
      <MesuresListe tp={tp} st={st} stage="horsTension" log={mes.log} />
      {horsTensionComplete(tp, st) && <Button variant="primary" onClick={onNext}>Mesures faites, passer à la mise en service</Button>}
    </>
  );

  return (
    <>
      <Side>{panneau}</Side>
      <Center>
        <ReseauScene def={def} rack={st.reseau?.rack} wires={[...tp.liaisons.filter(l => l.prewired), ...st.wires]}
          aimed={choisi ? [choisi.a, choisi.b] : []} lock={st.cons.lock} pduOn={false} />
        <Hint>Le lien choisi est repéré sur la scène : injecteur d’un côté, récepteur de l’autre.</Hint>
      </Center>
    </>
  );
}
