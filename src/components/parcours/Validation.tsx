'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { buildReport, scoreLines } from '@/lib/sim/progress';
import type { SimState } from '@/lib/sim/engine';
import type { InstrumentId } from '@/lib/sim/instruments';
import Panel from '@/components/panel/Panel';
import InstrumentsPanel from './InstrumentsPanel';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  sim: SimState;
  wires: { a: string; b: string; net: TpDefinition['liaisons'][number]['net'] }[];
  instrument: InstrumentId;
  point: string | null;
  onLoad: (v: number) => void;
  onInstrument: (i: InstrumentId) => void;
  onPoint: (p: string) => void;
  onRead: () => void;
  onDeviceClick: (id: string) => void;
  onButton: (b: 's1' | 's2') => void;
  onDiagnose: (id: string) => void;
  onRepair: () => void;
  onQuiz: (good: number) => void;
  onFinish: () => void;
}

/**
 * Quiz de validation : une bonne réponse par question, correction immédiate.
 * Le nombre de bonnes réponses est remonté dans `AttemptState.quiz` et compte dans le score.
 */
function Quiz({ tp, st, onQuiz }: { tp: TpDefinition; st: AttemptState; onQuiz: (n: number) => void }) {
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const good = tp.quiz.filter((q, i) => answers[i] === q.answer).length;
  const locked = st.quiz != null;

  React.useEffect(() => {
    if (!locked && answered === tp.quiz.length) onQuiz(good);
  }, [answered, good, locked, onQuiz, tp.quiz.length]);

  return (
    <Card title="Questions de validation">
      <div className="flex flex-col gap-3">
        {tp.quiz.map((q, i) => {
          const picked = answers[i];
          return (
            <div key={q.q}>
              <p className="m-0 mb-1.5 text-[12.5px] font-medium">{i + 1}. {q.q}</p>
              <div className="flex flex-col gap-1.5">
                {q.options.map((o, j) => {
                  const isPicked = picked === j;
                  const reveal = picked != null;
                  const tone = !reveal
                    ? 'border-[var(--line)]'
                    : j === q.answer
                      ? 'border-good bg-good/10 font-semibold'
                      : isPicked ? 'border-crit bg-crit/10' : 'border-[var(--line)] opacity-60';
                  return (
                    <button
                      key={o}
                      type="button"
                      disabled={reveal || locked}
                      onClick={() => setAnswers(a => ({ ...a, [i]: j }))}
                      className={`min-h-touch rounded-lg border bg-[var(--surface)] px-2.5 py-2 text-left text-[12px] disabled:cursor-default ${tone}`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              {picked != null && (
                <Note className="mt-1">
                  {picked === q.answer ? '✔ Bonne réponse.' : `✘ Non : la bonne réponse est « ${q.options[q.answer]} ».`}
                </Note>
              )}
            </div>
          );
        })}
      </div>
      {st.quiz != null && (
        <Note className="mt-2"><b>{st.quiz} / {tp.quiz.length}</b> bonnes réponses.</Note>
      )}
    </Card>
  );
}

export default function Validation(p: Props) {
  const { tp, st } = p;
  const injected = tp.faults.find(f => f.id === st.fault);
  const finished = !!st.done[7];

  if (finished) return <Rapport tp={tp} st={st} />;

  return (
    <>
      <Side>
        <SideTitle>{st.fixed ? 'Remise en service' : 'Diagnostic'}</SideTitle>

        {!st.fixed && (
          <Card title="Ordre de maintenance">
            <Note>
              Le professeur a injecté une panne. Symptôme signalé : <b>{injected?.symptom}</b>
              <br />Diagnostique à l&apos;instrument, puis choisis la cause.
            </Note>
            <div className="mt-2 flex flex-col gap-1.5">
              {tp.faults.map(f => {
                const picked = st.diagnosis === f.id;
                const tone = picked ? (f.id === st.fault ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : 'border-[var(--line)]';
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => p.onDiagnose(f.id)}
                    className={`min-h-touch rounded-lg border bg-[var(--surface)] px-2.5 py-2 text-left text-[12px] ${tone}`}
                  >
                    {f.title}
                  </button>
                );
              })}
            </div>
            {st.diagnosis === st.fault && (
              <Button variant="primary" className="mt-2" onClick={p.onRepair}>Réparer</Button>
            )}
          </Card>
        )}

        {st.fixed && (
          <>
            <Card title="Panne traitée">
              <Note><b>{injected?.title}</b><br />{injected?.fix}</Note>
            </Card>
            <Quiz tp={tp} st={st} onQuiz={p.onQuiz} />
            <Button variant="primary" disabled={st.quiz == null} onClick={p.onFinish}>
              {st.quiz == null ? 'Réponds aux questions pour finir' : 'Remise en service et rapport'}
            </Button>
          </>
        )}

        <InstrumentsPanel
          tp={tp} sim={p.sim} instrument={p.instrument} point={p.point}
          onLoad={p.onLoad} onInstrument={p.onInstrument} onPoint={p.onPoint} onRead={p.onRead}
        />
      </Side>

      <Center>
        <Panel
          tp={tp}
          state={p.sim}
          mode="service"
          placed={st.placed}
          wires={p.wires}
          onDeviceClick={p.onDeviceClick}
          onButton={p.onButton}
        />
        <Hint>
          {st.fixed
            ? 'Réparation faite. Relance le moteur pour confirmer, puis génère le rapport.'
            : 'Remets sous tension et essaie de démarrer : observe, mesure, conclus.'}
        </Hint>
      </Center>
    </>
  );
}

function Rapport({ tp, st }: { tp: TpDefinition; st: AttemptState }) {
  const lines = scoreLines(tp, st);
  const report = buildReport(tp, st);
  const relevés = st.readings.filter(r => r.stage >= 6);

  return (
    <>
      <Side>
        <SideTitle>Rapport envoyé</SideTitle>
        <Note>
          Étapes, relevés, diagnostic et échanges avec le professeur virtuel sont enregistrés dans ta
          tentative. Le professeur voit le résultat dans le tableau de bord de la classe.
        </Note>
        <Card title="Score">
          <div className="font-mono-num text-[32px] font-semibold">{report.score} / 100</div>
        </Card>
      </Side>

      <Center>
        <article className="flex w-full max-w-[760px] flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
            Rapport de mise en service
          </div>
          <h2 className="text-[26px] font-bold">{tp.title}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  {['Étape', 'Points', 'Détail'].map(h => (
                    <th key={h} className="border-b border-[var(--line)] px-2 py-1.5 text-left font-title text-[12px] uppercase tracking-[.08em] text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.key}>
                    <td className="border-b border-[var(--line)] px-2 py-1.5">{l.label}</td>
                    <td className="border-b border-[var(--line)] px-2 py-1.5 font-mono-num">{l.points} / {l.max}</td>
                    <td className="border-b border-[var(--line)] px-2 py-1.5 text-muted">{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>
            Relevés en service : {relevés.map(r => r.display).join(' · ') || 'aucun'}.
            Compétences évaluées : {tp.competences.join(', ')}.
          </Note>
        </article>
      </Center>
    </>
  );
}
