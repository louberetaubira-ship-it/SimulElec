'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { buildReport, scoreLines } from '@/lib/sim/progress';
import { readingLabel } from '@/lib/sim/mesures';
import { useParcours, panelWires } from '@/app/tp/[id]/store';
import Evaluation from './Evaluation';
import TpPanel from './TpPanel';
import { deviceStateOf, lampsOf } from './panelState';
import { Center, Hint, Side } from './StageLayout';

/** Quiz de validation : une bonne réponse par question, correction immédiate. */
function Quiz({ tp, st, onQuiz }: { tp: TpDefinition; st: AttemptState; onQuiz: (n: number) => void }) {
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const good = tp.quiz.filter((q, i) => answers[i] === q.answer).length;
  const locked = st.quiz != null;

  React.useEffect(() => {
    if (!locked && answered === tp.quiz.length && tp.quiz.length > 0) onQuiz(good);
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
      {st.quiz != null && <Note className="mt-2"><b>{st.quiz} / {tp.quiz.length}</b> bonnes réponses.</Note>}
    </Card>
  );
}

export default function Validation({ onFinish }: { onFinish: () => void }) {
  const s = useParcours();
  const { tp, st, sim } = s;
  const injected = tp.faults.find(f => f.id === st.fault);
  const finished = !!st.done[10];
  const wires = React.useMemo(() => panelWires(tp, st, sim), [tp, st, sim]);

  if (finished) return <Rapport tp={tp} st={st} />;

  return (
    <>
      <Side>
        <SideTitle>{st.fixed ? 'Remise en service' : 'Diagnostic'}</SideTitle>

        {!st.fixed && (
          <Card title="Ordre de maintenance">
            <Note>
              Le professeur a injecté une panne. Symptôme signalé : <b>{injected?.symptom}</b>
              <br />Diagnostique à l&apos;instrument (étapes de mesure accessibles par le stepper), puis choisis la cause.
            </Note>
            <div className="mt-2 flex flex-col gap-1.5">
              {tp.faults.map(f => {
                const picked = st.diagnosis === f.id;
                const tone = picked ? (f.id === st.fault ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : 'border-[var(--line)]';
                return (
                  <button
                    key={f.id}
                    type="button"
                    data-fault={f.id}
                    onClick={() => s.diagnose(f.id)}
                    className={`min-h-touch rounded-lg border bg-[var(--surface)] px-2.5 py-2 text-left text-[12px] ${tone}`}
                  >
                    {f.title}
                  </button>
                );
              })}
            </div>
            {st.diagnosis === st.fault && (
              <Button variant="primary" className="mt-2" onClick={s.repair}>Réparer</Button>
            )}
          </Card>
        )}

        {st.fixed && (
          <>
            <Card title="Panne traitée">
              <Note><b>{injected?.title}</b><br />{injected?.fix}</Note>
            </Card>
            <Quiz tp={tp} st={st} onQuiz={s.setQuiz} />
            <Button variant="primary" disabled={st.quiz == null} onClick={onFinish}>
              {st.quiz == null ? 'Réponds aux questions pour finir' : 'Envoyer le rapport'}
            </Button>
          </>
        )}
      </Side>

      <Center>
        <TpPanel
          tp={tp}
          wires={wires}
          cover={false}
          marks
          deviceState={deviceStateOf(sim)}
          lamps={lampsOf(sim)}
          motorRpm={sim.n}
          coupling={sim.coupling}
          onDevice={s.deviceClick}
          onButton={(b, down) => s.button(b, down)}
          onCoupling={() => s.coupling(sim.coupling === 'Y' ? 'D' : 'Y')}
        />
        <Hint>
          {st.fixed
            ? 'Réparation faite. Relance le moteur pour confirmer, puis envoie le rapport.'
            : 'Remets sous tension et essaie de démarrer : observe, mesure, conclus.'}
        </Hint>
      </Center>
    </>
  );
}

function Rapport({ tp, st }: { tp: TpDefinition; st: AttemptState }) {
  const s = useParcours();
  const lines = scoreLines(tp, st);
  const report = buildReport(tp, st, s.student);
  const [sent, setSent] = React.useState(false);

  return (
    <>
      <Side>
        <SideTitle>Rapport envoyé</SideTitle>
        <Note>
          Étapes, EPI, consignation, relevés, diagnostic et échanges avec le professeur virtuel sont
          enregistrés dans ta tentative.
        </Note>
        <Card title="Score">
          <div className="font-mono-num text-[32px] font-semibold">{report.score} / 100</div>
        </Card>
      </Side>

      <Center>
        <Evaluation
          tp={tp}
          st={st}
          student={s.student}
          sent={sent}
          offline={s.offline || !s.attemptId}
          onSend={() => { void s.finish(); setSent(true); }}
        />
        <article className="no-print flex w-full max-w-[760px] flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
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
          <div className="flex flex-col gap-1 font-mono-num text-[11.5px]">
            {st.readings.map((r, i) => <div key={i}>{readingLabel(r)}</div>)}
          </div>
          <Note>
            {s.student.name} · {tp.competences.join(', ')}.
          </Note>
        </article>
      </Center>
    </>
  );
}
