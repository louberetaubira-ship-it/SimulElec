'use client';

import React from 'react';
import type { AttemptState, Prevision, TpDefinition } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { buildEvaluation, buildReport, ETAPE, scoreLines } from '@/lib/sim/progress';
import { INSTRUMENTS, readingLabel } from '@/lib/sim/mesures';
import Instrument from '@/components/mesures/Instrument';
import { startButtons } from '@/lib/sim/engine';
import {
  conclusionOuverte, hypothesesVivantes, LIBELLE_PREVISION, ligneTest, qualiteRaisonnement,
  zoneDe,
} from '@/lib/sim/diagnostic';
import { useParcours, panelWires } from '@/app/tp/[id]/store';
import { reseauCommande } from '@/lib/sim/commande';
import { shuffledOrder } from '@/lib/sim/shuffle';
import Evaluation from './Evaluation';
import AutoEvaluation from './AutoEvaluation';
import TpPanel from './TpPanel';
import SchemaCommande from '@/components/schema/SchemaCommande';
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
                {shuffledOrder(q.q, q.options.length).map((j) => {
                  const o = q.options[j];
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
function Bilan({ tp, st }: { tp: TpDefinition; st: AttemptState }) {
  if (st.hypTests.length === 0) {
    return (
      <Card title="Bilan des tests">
        <Note>Aucun test réalisé. Vise une hypothèse, monte ton test, annonce ta prévision, mesure.</Note>
      </Card>
    );
  }
  const q = qualiteRaisonnement(st);
  return (
    <Card title={`Bilan des tests · ${st.hypTests.length}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr>
              {['Hypothèse', 'Test', 'Prévu', 'Lu', 'Verdict'].map(h => (
                <th key={h} className="border-b border-[var(--line)] px-1.5 py-1 text-left font-title text-[10.5px] uppercase tracking-[.08em] text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {st.hypTests.map((t, i) => (
              <tr key={i} className={t.verdict === 'out' ? 'opacity-60' : undefined}>
                <td className="border-b border-[var(--line)] px-1.5 py-1">
                  {tp.faults.find(f => f.id === t.id)?.title ?? t.id}
                </td>
                <td className="border-b border-[var(--line)] px-1.5 py-1 font-mono-num whitespace-nowrap">
                  {t.dial} {t.a ?? '—'}/{t.b ?? '—'}
                </td>
                <td className="border-b border-[var(--line)] px-1.5 py-1 font-mono-num whitespace-nowrap">
                  {LIBELLE_PREVISION[t.attendu]} {t.prevu ? '✓' : '✗'}
                </td>
                <td className="border-b border-[var(--line)] px-1.5 py-1 font-mono-num whitespace-nowrap">{t.lu}</td>
                <td className={`border-b border-[var(--line)] px-1.5 py-1 font-semibold ${t.verdict === 'out' ? 'text-crit' : 'text-good'}`}>
                  {t.verdict === 'out' ? 'éliminée' : 'retenue'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note className="mt-2">
        Prévisions justes : <b>{Math.round(q.previsions * 100)} %</b>. Hypothèses départagées :{' '}
        <b>{st.hypTests.reduce((s, t) => s + t.departage, 0)}</b> en {st.hypTests.length} test
        {st.hypTests.length > 1 ? 's' : ''}. Une vérification bien placée en infirme plusieurs à la fois.
      </Note>
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
        {hypothesesVivantes(st).map(id => (
          <option key={id} value={id}>{tp.faults.find(f => f.id === id)?.title ?? id}</option>
        ))}
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

/**
 * Hypothèses posées par l'élève.
 *
 * Rien n'est présélectionné et rien ne se colore avant d'avoir été testé : la
 * couleur ne vient que du verdict d'une mesure, jamais d'un jugement du
 * simulateur sur la piste choisie.
 */
function Hypotheses({ tp, st, onPoser }: {
  tp: TpDefinition; st: AttemptState; onPoser: (id: string, on: boolean) => void;
}) {
  const verdicts = new Map(st.hypTests.map(t => [t.id, t.verdict]));
  return (
    <Card title="Mes hypothèses">
      <Note>
        Qu&apos;est-ce qui pourrait produire ce symptôme ? Coche tout ce qui te paraît possible,
        y compris ce que tu comptes écarter — c&apos;est en éliminant qu&apos;on diagnostique.
      </Note>
      <div className="mt-2 flex flex-col gap-1.5">
        {tp.faults.map(f => {
          const v = verdicts.get(f.id);
          const tone = v === 'out' ? 'border-[var(--line)] opacity-55'
            : v === 'keep' ? 'border-good bg-good/[.07]' : 'border-[var(--line)]';
          return (
            <label
              key={f.id}
              className={`flex min-h-touch cursor-pointer items-start gap-2 rounded-lg border bg-[var(--surface)] px-2.5 py-2 text-[12px] ${tone}`}
            >
              <input
                type="checkbox"
                checked={st.hypotheses.includes(f.id)}
                onChange={e => onPoser(f.id, e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span className={v === 'out' ? 'line-through' : undefined}>
                {f.title}
                {v && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-px text-[10px] font-semibold ${v === 'out' ? 'bg-crit/10 text-crit' : 'bg-good/10 text-good'}`}>
                    {v === 'out' ? 'éliminée' : 'retenue'}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <Note className="mt-2">
        {st.hypotheses.length < 2
          ? 'Pose au moins deux hypothèses : sans alternative, il n\'y a rien à éliminer.'
          : <><b>{st.hypotheses.length}</b> hypothèses à tester. Commence par celle qui se vérifie le plus vite.</>}
      </Note>
    </Card>
  );
}

/**
 * Le test d'hypothèse : on le DÉFINIT avant de le faire.
 *
 * Quoi vérifier, avec quel appareil, dans quel état, où poser les pointes, et
 * surtout quel résultat on attend. Cette dernière case est ce qui sépare le
 * diagnostic du tâtonnement, et le simulateur confronte ensuite la prévision au
 * relevé.
 */
function Test({ tp, st, mes, marche, s }: {
  tp: TpDefinition; st: AttemptState;
  mes: { vise: string; prevision: string; marcheMaintenue: boolean };
  marche: string;
  s: {
    viser: (id: string) => void;
    prevoir: (p: Prevision | '') => void;
    noterTest: (v: 'out' | 'keep') => void;
    maintenirMarche: (v: boolean) => void;
  };
}) {
  const vivantes = hypothesesVivantes(st);
  const dernier = st.hypTests[st.hypTests.length - 1];
  return (
    <Card title="Test d'hypothèse">
      <label className="mb-1 block text-[11.5px] font-medium text-muted" htmlFor="v-vise">
        Hypothèse testée
      </label>
      <select
        id="v-vise"
        value={mes.vise}
        onChange={e => s.viser(e.target.value)}
        className="min-h-touch w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[12px]"
      >
        <option value="">— choisis —</option>
        {vivantes.map(id => (
          <option key={id} value={id}>{tp.faults.find(f => f.id === id)?.title ?? id}</option>
        ))}
      </select>

      <label className="mt-2 flex min-h-touch cursor-pointer items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={mes.marcheMaintenue}
          onChange={e => s.maintenirMarche(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Maintenir {marche} appuyé pendant la mesure
      </label>

      <label className="mb-1 mt-2 block text-[11.5px] font-medium text-muted" htmlFor="v-prev">
        Ce que j&apos;attends de lire
      </label>
      <select
        id="v-prev"
        value={mes.prevision}
        onChange={e => s.prevoir(e.target.value as Prevision | '')}
        className="min-h-touch w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[12px]"
      >
        <option value="">— annonce ta prévision —</option>
        <option value="24">Tension présente (≈ la tension de commande)</option>
        <option value="0">0 V — rien n&apos;arrive</option>
        <option value="cont">≈ 0 Ω — continuité</option>
        <option value="ol">OL — circuit ouvert</option>
      </select>

      <div className="mt-2 flex gap-1.5">
        <Button className="flex-1" disabled={!mes.vise || !mes.prevision} onClick={() => s.noterTest('out')}>
          Je l&apos;élimine
        </Button>
        <Button className="flex-1" disabled={!mes.vise || !mes.prevision} onClick={() => s.noterTest('keep')}>
          Je la retiens
        </Button>
      </div>

      {dernier && (
        <Note className="mt-2">
          {dernier.prevu
            ? 'Ta prévision et ta lecture concordaient : tu savais ce que tu cherchais.'
            : <><b>Écart entre ta prévision et la lecture.</b> Ce n&apos;est pas une faute — c&apos;est
              l&apos;information la plus utile de la séance : le circuit ne se comporte pas comme tu le pensais.</>}
        </Note>
      )}
    </Card>
  );
}

export default function Validation({ onFinish }: { onFinish: () => void }) {
  const s = useParcours();
  const { tp, st, sim, mes } = s;
  const injected = tp.faults.find(f => f.id === st.fault);
  const finished = !!st.done[ETAPE.VALIDATION];
  const wires = React.useMemo(() => panelWires(tp, st, sim), [tp, st, sim]);
  const marche = startButtons(tp)[0]?.rep ?? 'le bouton de marche';
  const porte = conclusionOuverte(st);
  const reseau = React.useMemo(
    () => reseauCommande(tp, st, sim, { marcheMaintenue: mes.marcheMaintenue }),
    [tp, st, sim, mes.marcheMaintenue],
  );

  // Zone mise en évidence : le voisinage de l'hypothèse visée, pas son emplacement.
  // Entourer les deux bonnes bornes donnerait la réponse.
  const zone = React.useMemo(
    () => (mes.vise
      ? zoneDe(tp, st, sim, { marcheMaintenue: mes.marcheMaintenue }, mes.vise)
      : []),
    [tp, st, sim, mes.vise, mes.marcheMaintenue],
  );

  // Appareil de mesure : mêmes points de test qu'aux étapes de mesure.
  const out = s.currentRead();
  const clampLabel = mes.clamp != null && wires[mes.clamp]
    ? `${wires[mes.clamp].a.replace('.', ' ')} → ${wires[mes.clamp].b.replace('.', ' ')}`
    : null;
  const instruments = React.useMemo(() => INSTRUMENTS.map((i) => i.id), []);

  // Schéma (gauche) + platine (droite), avec plein écran de la zone de travail.
  const workRef = React.useRef<HTMLDivElement>(null);
  const [fs, setFs] = React.useState(false);
  const enterFs = React.useCallback(() => {
    setFs(true);
    const el = workRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    try {
      const r = el?.requestFullscreen?.() ?? el?.webkitRequestFullscreen?.();
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
    } catch { /* API refusée : le calque position:fixed prend le relais */ }
  }, []);
  const exitFs = React.useCallback(() => {
    setFs(false);
    const d = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenElement?: Element | null;
    };
    if (d.fullscreenElement ?? d.webkitFullscreenElement) {
      try { if (d.exitFullscreen) d.exitFullscreen(); else d.webkitExitFullscreen?.(); } catch { /* ignore */ }
    }
  }, []);
  React.useEffect(() => {
    const d = document as Document & { webkitFullscreenElement?: Element | null };
    const onChange = () => { if (!(d.fullscreenElement ?? d.webkitFullscreenElement)) setFs(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFs(false); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (finished) return <Rapport tp={tp} st={st} />;

  const panneau = (
    <>
      <SideTitle>{st.fixed ? 'Remise en service' : 'Dépannage'}</SideTitle>

      {!st.fixed && (
        <>
          <Card title="Constat">
            <Note>
              Symptôme signalé par l&apos;utilisateur : <b>{injected?.symptom}</b>
              <br />
              Refais l&apos;essai, observe, puis pose tes hypothèses. Les appareils sont à ta
              disposition : tu choisis l&apos;instrument, le calibre, l&apos;état de la platine, et tu
              poses tes pointes où tu veux. Sous tension pour les tensions, consignée pour les
              continuités — l&apos;ohmmètre refuse un circuit alimenté, comme le vrai.
            </Note>
          </Card>

          <Hypotheses tp={tp} st={st} onPoser={s.poserHypothese} />

          <Card title="Appareil de mesure">
            <Instrument
              inst={mes.inst}
              dial={mes.dial}
              out={out}
              probes={mes.probes}
              clampLabel={clampLabel}
              pick={mes.pick}
              onSelect={s.setInstrument}
              onRotate={s.rotateDial}
              onPick={s.setPick}
              onClear={s.clearProbes}
            />
            <Note className="mt-1">
              Choisis l&apos;instrument, pose les deux pointes sur les points de contrôle, puis conclus
              ton test : la mesure impose le verdict, elle ne se devine pas.
            </Note>
          </Card>

          <Test tp={tp} st={st} mes={mes} marche={marche} s={s} />
          <Bilan tp={tp} st={st} />
          {porte.ouverte
            ? <Conclusion tp={tp} st={st} s={s} />
            : (
              <Card title="Conclusion">
                <Note>
                  Elle s&apos;ouvre quand tes tests ont réduit le champ. {porte.manque}
                </Note>
              </Card>
            )}
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

  const platine = (
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
      aimed={zone}
      instruments={instruments}
      pickTerminals={mes.pick === 'r' || mes.pick === 'k'}
      pickWires={mes.pick === 'clamp'}
      onTerminal={s.clickTerminal}
      onWire={s.onWire}
      onDevice={s.deviceClick}
      onButton={(b, down) => s.button(b, down)}
    />
  );

  return (
    <>
      <Side>{panneau}</Side>

      <Center>
        {st.fixed ? (
          <>
            {platine}
            <Hint>Réparation faite. Relance le moteur pour confirmer, puis envoie le rapport.</Hint>
          </>
        ) : (
          <div
            ref={workRef}
            className={
              fs
                ? 'fixed inset-0 z-[60] flex flex-col gap-2 bg-[var(--app)] p-2'
                : 'flex min-h-0 w-full flex-1 flex-col'
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[.06em] text-muted">Schéma &amp; platine</span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={fs ? exitFs : enterFs}
                className="rounded-lg border border-[var(--accent)] px-2.5 py-1.5 text-[13px] font-semibold text-accent hover:bg-[var(--app)]"
              >
                {fs ? '✕ Quitter le plein écran' : '⤢ Plein écran'}
              </button>
            </div>
            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
              <div className="flex min-h-0 flex-col overflow-auto">
                <SchemaCommande
                  tp={tp}
                  reseau={reseau}
                  zone={zone}
                  probes={mes.probes}
                  onBorne={s.clickTerminal}
                />
                <Note className="mt-2">
                  Le folio ne montre que la commande. Une panne du circuit de puissance — une phase
                  coupée, par exemple — se cherche sur la platine, à droite.
                </Note>
              </div>
              <div className="flex min-h-0 flex-col overflow-auto">
                {platine}
              </div>
            </div>
            <Hint>
              Essaie de démarrer, observe, puis mesure : la valeur dépend de l’endroit exact où tu
              poses tes pointes.
            </Hint>
          </div>
        )}
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
          {st.hypTests.length > 0 && (
            <>
              <div className="font-title text-[12px] font-semibold uppercase tracking-[.12em] text-accent">
                Démarche de diagnostic
              </div>
              <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-[11.5px]">
                {st.hypTests.map((t, i) => <li key={i}>{ligneTest(tp, t)}</li>)}
              </ol>
              <Note>
                {(() => {
                  const q = qualiteRaisonnement(st);
                  return `Prévisions justes : ${Math.round(q.previsions * 100)} %. `
                    + `${st.hypTests.reduce((n, x) => n + x.departage, 0)} hypothèses départagées `
                    + `en ${st.hypTests.length} test${st.hypTests.length > 1 ? 's' : ''}, `
                    + `sur ${st.hypotheses.length} posées.`;
                })()}
              </Note>
            </>
          )}
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
