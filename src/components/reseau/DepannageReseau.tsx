'use client';
/* eslint-disable @next/next/no-img-element -- document du dossier servi depuis public/tp */

/**
 * Zone de travail du DÉPANNAGE d'un TP réseau (étape validation). Le principe est celui de
 * la platine — hypothèses posées, vérification définie AVANT d'être faite, verdict imposé
 * par ce qu'on observe — mais l'instrument est celui du technicien courant faible : le
 * terminal de la loge (ping, ipconfig, arp), les LED du switch, le multimètre sur une prise
 * de caméra, le testeur de câble, l'écran de supervision.
 *
 * On peut observer librement (rien n'est noté), ou monter un test : hypothèse visée,
 * vérification, prévision « conforme / anomalie », puis le verdict — que l'observation impose.
 */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Note } from '@/components/ui';
import { hypothesesVivantes } from '@/lib/sim/diagnostic';
import { etatReseau, observations, observer, type ResultatObs } from '@/lib/sim/reseau';
import ReseauScene from './ReseauScene';
import { Terminal } from './Outils';

export default function DepannageReseau({ tp, st, vise, onViser, onNoter }: {
  tp: TpDefinition;
  st: AttemptState;
  vise: string;
  onViser: (id: string) => void;
  onNoter: (obs: string, prevision: 'ok' | 'ko', verdict: 'out' | 'keep') => void;
}) {
  const def = tp.reseau!;
  const obs = React.useMemo(() => observations(tp), [tp]);
  const groupes = Array.from(new Set(obs.map(o => o.groupe)));
  const [choix, setChoix] = React.useState(obs[0]?.id ?? '');
  const [prev, setPrev] = React.useState<'ok' | 'ko' | ''>('');
  const [res, setRes] = React.useState<{ obs: string; r: ResultatObs; test: boolean } | null>(null);
  const e = etatReseau(tp, st, true);
  const vivantes = hypothesesVivantes(st);

  const observerSeul = () => setRes({ obs: choix, r: observer(tp, e, choix), test: false });
  const tester = () => {
    if (!vise || !prev) return;
    setRes({ obs: choix, r: observer(tp, e, choix), test: true });
  };
  const conclure = (v: 'out' | 'keep') => {
    if (!res?.test || !prev) return;
    onNoter(res.obs, prev, v);
    setRes(null);
    setPrev('');
  };

  return (
    <div className="grid w-full gap-3 lg:grid-cols-2" data-depannage-reseau>
      <div className="flex flex-col gap-2">
        {tp.schemaImage && (
          <>
            <img src={tp.schemaImage.src} alt={tp.schemaImage.legende} className="w-full rounded-lg border border-[var(--line)] bg-white" data-schema-image />
            <Note>{tp.schemaImage.legende}. Repère l’équipement que tu soupçonnes, puis choisis la vérification qui tranche.</Note>
          </>
        )}
        <ReseauScene def={def} rack={st.reseau?.rack} wires={[...tp.liaisons.filter(l => l.prewired), ...st.wires]} pduOn />
      </div>
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <h3 className="mb-2 font-title text-[16px] font-semibold uppercase tracking-wide">Vérification</h3>
          <label className="mb-1 block text-[11.5px] font-medium text-muted" htmlFor="rd-obs">Que vérifies-tu ?</label>
          <select id="rd-obs" value={choix} onChange={ev => { setChoix(ev.target.value); setRes(null); }} data-obs-choix
            className="min-h-touch w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[12px]">
            {groupes.map(g => (
              <optgroup key={g} label={g}>
                {obs.filter(o => o.groupe === g).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button size="sm" onClick={observerSeul} data-obs-voir>Observer (sans noter)</Button>
          </div>

          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2">
            <b className="text-[12px]">Test d’hypothèse</b>
            <label className="mb-1 mt-1.5 block text-[11.5px] font-medium text-muted" htmlFor="rd-vise">Hypothèse testée</label>
            <select id="rd-vise" value={vise} onChange={ev => onViser(ev.target.value)} data-obs-vise
              className="min-h-touch w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[12px]">
              <option value="">— choisis —</option>
              {vivantes.map(id => <option key={id} value={id}>{tp.faults.find(f => f.id === id)?.title ?? id}</option>)}
            </select>
            <label className="mb-1 mt-1.5 block text-[11.5px] font-medium text-muted" htmlFor="rd-prev">Ce que j’attends de lire</label>
            <select id="rd-prev" value={prev} onChange={ev => setPrev(ev.target.value as 'ok' | 'ko' | '')} data-obs-prev
              className="min-h-touch w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[12px]">
              <option value="">— annonce ta prévision —</option>
              <option value="ok">Conforme (répond, 1 Gbit/s, 48 V, 8/8…)</option>
              <option value="ko">Anomalie</option>
            </select>
            <Button size="sm" className="mt-2" disabled={!vise || !prev} onClick={tester} data-obs-tester>Faire la vérification</Button>
            {res?.test && (
              <div className="mt-2 flex gap-1.5">
                <Button className="flex-1" onClick={() => conclure('out')} data-obs-out>Je l’élimine</Button>
                <Button className="flex-1" onClick={() => conclure('keep')} data-obs-keep>Je la retiens</Button>
              </div>
            )}
          </div>
        </div>
        {res && (
          <div data-obs-resultat={res.r.court}>
            <Terminal texte={res.r.texte} titre={obs.find(o => o.id === res.obs)?.label ?? res.obs} />
          </div>
        )}
      </div>
    </div>
  );
}
