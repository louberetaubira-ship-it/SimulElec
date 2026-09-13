'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { buildEvaluation, buildReport, scoreLines } from '@/lib/sim/progress';
import { readingLabel } from '@/lib/sim/mesures';
import { startButtons } from '@/lib/sim/engine';
import { useParcours, panelWires } from '@/app/tp/[id]/store';
import Evaluation from './Evaluation';
import AutoEvaluation from './AutoEvaluation';
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

/**
 * Journal des mesures de l'étape de dépannage.
 *
 * L'élève ne coche pas des mesures attendues : il relève ce qu'il veut, où il
 * veut. Le journal est sa trace de raisonnement — et celle que le professeur
 * lira dans le rapport.
 */
function Journal({ st }: { st: AttemptState }) {
  const notes = st.readings.filter(r => r.stage === 10);
  return (
    <Card title={`Journal des mesures · ${notes.length}`}>
      {notes.length === 0
        ? <Note>Aucune mesure notée. Choisis un appareil, pose tes deux pointes, puis note la lecture.</Note>
        : (
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 font-mono-num text-[11.5px]">
            {notes.map((r, i) => <li key={i}>{readingLabel(r)}</li>)}
          </ol>
        )}
    </Card>
  );
}

/**
 * Conclusion en deux temps : la cause ET l'action de remise en état.
 *
 * Les deux listes sont mélangées et présentées sans indice : le simulateur ne
 * souffle aucune hypothèse, et rien ne se colore avant que l'élève ait validé.
 * Trouver la panne sans savoir quoi faire dessus n'est pas un dépannage.
 */
interface ActionsConclusion {
  diagnose: (id: string) => void;
  setRemede: (id: string) => void;
  conclure: () => void;
  repair: () => void;
}

function Conclusion({ tp, st, s }: { tp: TpDefinition; st: AttemptState; s: ActionsConclusion }) {
  const actions = React.useMemo(() => {
    const l = tp.faults.filter(f => f.action).map(f => ({ id: f.id, txt: f.action as string }));
    // ordre stable mais non révélateur : l'ordre des causes ne doit pas donner la réponse
    return [...l].sort((a, b) => a.txt.localeCompare(b.txt, 'fr'));
  }, [tp.faults]);
  const complet = st.diagnosis != null && st.remede != null;
  const juste = st.diagnosis === st.fault && st.remede === st.fault;

  return (
    <Card title="Ma conclusion">
      <label className="mb-1 block text-[11.5px] font-medium text-muted" htmlFor="v-cause">Cause retenue</label>
      <select
        id="v-cause"
        value={st.diagnosis ?? ''}
        onChange={e => s.diagnose(e.target.value)}
        className="min-h-touch w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[12px]"
      >
        <option value="">— choisis —</option>
        {tp.faults.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
      </select>

      <label className="mb-1 mt-2 block text-[11.5px] font-medium text-muted" htmlFor="v-remede">
        Action de remise en état
      </label>
      <select
        id="v-remede"
        value={st.remede ?? ''}
        onChange={e => s.setRemede(e.target.value)}
        className="min-h-touch w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[12px]"
      >
        <option value="">— choisis —</option>
        {actions.map(a => <option key={a.id} value={a.id}>{a.txt}</option>)}
      </select>

      <Button className="mt-2" disabled={!complet} onClick={s.conclure}>
        Valider mon diagnostic
      </Button>
      {st.diagTries > 0 && (
        <Note className="mt-2">
          {juste
            ? 'Cause et remise en état exactes. Tu peux intervenir sur la platine.'
            : `${st.diagTries} conclusion${st.diagTries > 1 ? 's' : ''} proposée${st.diagTries > 1 ? 's' : ''}. Reprends tes mesures.`}
        </Note>
      )}
      {juste && <Button variant="primary" className="mt-2" onClick={s.repair}>Intervenir</Button>}
    </Card>
  );
}

export default function Validation({ onFinish }: { onFinish: () => void }) {
  const s = useParcours();
  const { tp, st, sim, mes } = s;
  const injected = tp.faults.find(f => f.id === st.fault);
  const finished = !!st.done[10];
  const wires = React.useMemo(() => panelWires(tp, st, sim), [tp, st, sim]);
  const marche = startButtons(tp)[0]?.rep ?? 'le bouton de marche';

  if (finished) return <Rapport tp={tp} st={st} />;

  const panneau = (
    <>
      <SideTitle>{st.fixed ? 'Remise en service' : 'Dépannage'}</SideTitle>

      {!st.fixed && (
        <>
          <Card title="Ordre de maintenance">
            <Note>
              Symptôme signalé par l&apos;utilisateur : <b>{injected?.symptom}</b>
              <br />
              À toi de trouver. Les appareils sont à ta disposition ci-dessous : tu choisis
              l&apos;instrument, le calibre, l&apos;état de la platine, et tu poses tes pointes où tu veux.
            </Note>
          </Card>

          <Card title="État de la platine pour mesurer">
            <Note>
              Sous tension pour les tensions, consignée pour les continuités — l&apos;ohmmètre
              refuse de mesurer sur un circuit sous tension, comme le vrai.
            </Note>
            <label className="mt-2 flex min-h-touch items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={mes.marcheMaintenue}
                onChange={e => s.maintenirMarche(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Maintenir {marche} appuyé pendant la mesure
            </label>
            <Note className="mt-1">
              Sans ça, tout ce qui est en aval du contact de marche reste inaccessible à
              l&apos;instrument : c&apos;est le geste qu&apos;on fait en atelier, à deux mains.
            </Note>
          </Card>

          <Journal st={st} />
          <Conclusion tp={tp} st={st} s={s} />
        </>
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
    </>
  );

  return (
    <>
      <Side>{panneau}</Side>

      <Center>
        <TpPanel
          trayEnabled={!st.fixed}
          dock={panneau}
          dockTitle="Dépannage"
          tp={tp}
          wires={wires}
          cover={false}
          marks
          deviceState={deviceStateOf(sim)}
          lamps={lampsOf(sim, tp)}
          latched={sim.latched}
          motorRpm={sim.n}
          probes={mes.probes}
          clamp={mes.clamp}
          lock={st.cons.lock}
          pickTerminals={mes.pick === 'r' || mes.pick === 'k'}
          pickWires={mes.pick === 'clamp'}
          onTerminal={s.clickTerminal}
          onWire={s.onWire}
          onDevice={s.deviceClick}
          onButton={(b, down) => s.button(b, down)}
        />
        <Hint>
          {st.fixed
            ? 'Réparation faite. Relance le moteur pour confirmer, puis envoie le rapport.'
            : 'Essaie de démarrer, observe, puis mesure : la valeur dépend de l’endroit exact où tu poses tes pointes.'}
        </Hint>
      </Center>
    </>
  );
}

function Rapport({ tp, st }: { tp: TpDefinition; st: AttemptState }) {
  const s = useParcours();
  const diploma = s.evalDiploma;
  const lines = scoreLines(tp, st);
  const report = buildReport(tp, st, { ...s.student, diploma });
  const [sent, setSent] = React.useState(false);
  const grille = React.useMemo(() => buildEvaluation(tp, st, diploma) ?? [], [tp, st, diploma]);

  // auto-évaluation : l'élève se place avant de découvrir la correction
  if (!st.autoEvalDone && grille.length > 0) {
    return (
      <>
        <Side>
          <SideTitle>Auto-évaluation</SideTitle>
          <Note>
            Le TP est terminé. Avant de voir ton bilan, place-toi toi-même sur chaque compétence
            travaillée : tu compareras ensuite ton estimation au résultat calculé.
          </Note>
        </Side>
        <Center>
          <AutoEvaluation
            diploma={diploma}
            codes={grille.map(c => c.code)}
            value={st.autoEval ?? {}}
            onSet={s.setAutoEval}
            onSubmit={() => { s.submitAutoEval(); void s.finish(); }}
          />
        </Center>
      </>
    );
  }

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
          diploma={diploma}
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
            Gestes de correction du câblage : {st.wiresRemoved ?? 0} fil{(st.wiresRemoved ?? 0) > 1 ? 's' : ''} défait
            {(st.wiresRemoved ?? 0) > 1 ? 's' : ''}, {st.resets ?? 0} réinitialisation{(st.resets ?? 0) > 1 ? 's' : ''}.
            Se reprendre est normal : ces gestes ne pèsent que très légèrement sur la note.
          </Note>
          <Note>
            {s.student.name} · {tp.competences.join(', ')}.
          </Note>
        </article>
      </Center>
    </>
  );
}
