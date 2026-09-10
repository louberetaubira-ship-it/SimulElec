'use client';

/**
 * Parcours « dimensionnement » (TP 14 · installation photovoltaïque autonome).
 * Choisi par `page.tsx` quand `tp.kind === 'dimensionnement'`.
 *
 * Trois colonnes : liste des étapes (verrouillées), contenu de l'étape, résumé en direct
 * et professeur virtuel. Chaîne énergétique en tête, stepper commun sous l'en-tête.
 */

import React from 'react';
import type { TpDefinition } from '@/lib/types';
import {
  buildPvEvaluation, calc, checks, fr, picksOf, pvScore, pvStageScores, PV_STEP_COUNT,
  PV_STEP_LABELS, PV_STEP_SHORT, PV_STEPS, report as pvReport, solarOf,
} from '@/lib/pv/dimensionnement';
import { Toast } from '@/components/ui';
import Stepper from '@/components/parcours/Stepper';
import Evaluation from '@/components/parcours/Evaluation';
import { ChainBar, Kv, Messages } from '@/components/pv/pieces';
import StepContent from '@/components/pv/steps';
import Unifilaire from '@/components/pv/Unifilaire';
import ProfBotPv from '@/components/pv/ProfBotPv';
import AidePv, { AidePvButton } from '@/components/pv/AidePv';
import { useStudent } from '@/lib/useStudent';
import { diplomaShort } from '@/lib/student';
import { usePvParcours } from './pvStore';

export default function DimensionnementClient({ tp }: { tp: TpDefinition }) {
  const store = usePvParcours();
  const { s, init, setStudent } = store;
  const { student, known } = useStudent(`/tp/${tp.id}`);

  React.useEffect(() => { void init(tp); }, [init, tp]);
  React.useEffect(() => { if (known) setStudent(student); }, [known, setStudent, student]);

  const C = React.useMemo(() => calc(s), [s]);
  const msgs = React.useMemo(() => checks(s, s.step), [s]);
  const blocked = msgs.some(m => m.kind === 'bad');
  const doneCount = Object.values(s.done).filter(Boolean).length;
  const { mppt, inv } = picksOf(s);
  const sol = solarOf(s);
  const last = s.step === PV_STEP_COUNT - 1;
  const allDone = Array.from({ length: 10 }, (_, k) => k).every(k => s.done[k]);
  const resRef = React.useRef<HTMLDivElement>(null);

  const onValidate = () => {
    const okStep = store.validate();
    if (!okStep) resRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else if (last) void store.finish();
  };

  const print = React.useCallback(() => window.print(), []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
        <div className="min-w-0 text-[12.5px] text-muted">
          TP · <b className="font-medium text-ink">Dimensionnement PV autonome</b>
          <span className="ml-2 hidden sm:inline">
            · <b className="font-medium text-ink">{store.student.name}</b>
            <span className="ml-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-semibold">
              {diplomaShort(store.student.diploma)}
            </span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2.5 text-[12.5px]">
          <span className="hidden sm:inline">Progression</span>
          <div className="h-2 w-[120px] overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div className="h-full bg-good transition-all" style={{ width: `${(doneCount / PV_STEP_COUNT) * 100}%` }} />
          </div>
          <b className="font-mono-num">{Math.round((doneCount / PV_STEP_COUNT) * 100)} %</b>
          {store.offline && <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[10.5px] font-semibold text-warn">hors-ligne</span>}
        </div>
      </header>

      <Stepper
        stage={s.step}
        done={s.done}
        onGo={store.goStep}
        labels={PV_STEP_LABELS}
        shortLabels={PV_STEP_SHORT}
      />
      <ChainBar s={s} />

      <div data-parcours className="grid flex-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="flex flex-col gap-2 overflow-y-auto border-b border-[var(--line)] bg-[var(--surface)] p-3 lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-20 -mx-3 -mt-3 border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2">
            <AidePvButton />
          </div>
          {/* sur mobile, la navigation passe par le stepper du haut : la liste détaillée reste au large */}
          <ol className="m-0 hidden list-none flex-col gap-1.5 p-0 lg:flex">
            {PV_STEPS.map((st, i) => {
              const isDone = !!s.done[i];
              const locked = i > 0 && !s.done[i - 1] && !s.done[i] && s.step !== i;
              return (
                <li key={st.title}>
                  <button
                    type="button"
                    data-pvstep={i}
                    disabled={locked}
                    onClick={() => store.goStep(i)}
                    className={`flex min-h-touch w-full items-start gap-2 rounded-xl border bg-[var(--surface)] px-2.5 py-2 text-left ${s.step === i ? 'border-accent ring-2 ring-accent/25' : 'border-[var(--line)]'} ${locked ? 'cursor-default opacity-50' : ''}`}
                  >
                    <span className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-full text-[11px] font-bold ${isDone ? 'bg-good text-white' : 'bg-[var(--line)] text-ink'}`}>
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className="min-w-0">
                      <b className="block text-[12px] leading-tight">{st.title}</b>
                      <small className="text-[11px] text-muted">{st.sub}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="flex min-w-0 flex-col gap-2 overflow-y-auto p-3.5">
          <div>
            <h2 className="m-0 font-title text-[24px] font-bold leading-tight">
              {s.step + 1} · {PV_STEPS[s.step].title}
            </h2>
            <p className="m-0 text-[12.5px] text-muted">{PV_STEPS[s.step].sub}</p>
          </div>

          {s.step === 0 && (
            <p className="m-0 max-w-[70ch] text-[12.5px] leading-relaxed text-muted">
              {tp.situation}
            </p>
          )}

          {last ? (
            allDone ? (
              <div className="flex flex-col gap-3">
                <pre data-report className="print-sheet m-0 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5 font-mono-num text-[12px] leading-relaxed">
                  {pvReport(s)}
                </pre>
                <Unifilaire s={s} />
                <div className="no-print flex flex-col gap-1.5 sm:flex-row">
                  <button
                    type="button"
                    data-print
                    onClick={print}
                    className="min-h-touch flex-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[12.5px] font-semibold"
                  >
                    Imprimer la note de calcul
                  </button>
                  <button
                    type="button"
                    data-send-report
                    onClick={() => void store.finish()}
                    disabled={store.sent || store.offline || !store.attemptId}
                    className="min-h-touch flex-1 rounded-[10px] border border-good bg-good px-3 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
                  >
                    {store.sent ? 'Note de calcul envoyée ✓' : store.offline || !store.attemptId ? 'Hors-ligne : envoi impossible' : 'Envoyer au professeur'}
                  </button>
                </div>
                <Evaluation
                  tp={tp}
                  student={store.student}
                  evaluation={buildPvEvaluation(s, store.student.diploma)}
                  scores={pvStageScores(s)}
                  stageLabels={PV_STEP_LABELS}
                  helpUsed={s.helpUsed}
                  score={pvScore(s)}
                />
              </div>
            ) : (
              <div className="rounded-r-xl border-l-4 border-l-warn bg-warn/10 px-2.5 py-2 text-[12.5px]">
                <b className="block">Note de calcul verrouillée</b>
                Valide d&apos;abord les dix étapes précédentes.
              </div>
            )
          ) : (
            <StepContent step={s.step} />
          )}

          <div ref={resRef}><Messages list={msgs} /></div>

          <div className="no-print mt-2 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
            <button
              type="button"
              data-prev
              disabled={s.step === 0}
              onClick={() => store.goStep(s.step - 1)}
              className="min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 text-[12.5px] font-semibold disabled:opacity-45"
            >
              ← Précédent
            </button>
            <span
              data-status={blocked ? 'bloque' : 'ok'}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${blocked ? 'bg-crit/15 text-crit' : 'bg-good/15 text-good'}`}
            >
              {blocked ? 'bloqué' : 'étape valide'}
            </span>
            <button
              type="button"
              data-next
              onClick={onValidate}
              className="min-h-touch rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-[var(--accent-ink)]"
            >
              {last ? 'Terminer' : 'Valider et continuer →'}
            </button>
          </div>
        </main>

        <aside className="no-print flex flex-col gap-2.5 border-t border-[var(--line)] bg-[var(--surface)] p-3 lg:min-h-0 lg:border-l lg:border-t-0">
          <section data-resume className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
            <h3 className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
              Résumé en direct
            </h3>
            <Kv rows={[
              ['Ejour', `${fr(C.Ejour, 0)} Wh/j`],
              ['P simultanée', `${fr(C.Psim, 0)} W`],
              ['HSP · η', `${fr(C.hsp, 1)} h · ${s.eta}`],
              ['Ppv nécessaire', `${fr(C.Ppv, 0)} Wc`],
              ['Champ', `${s.ns}S${s.np}P · ${fr(C.PpvReal, 0)} Wc`],
              ['Voc froid', `${fr(C.VocCold, 0)} V`],
              ['Parc', `${fr(C.Ubat, 0)} V / ${fr(C.Ah, 0)} Ah`],
              ['MPPT', mppt.name.replace('Régulateur ', '')],
              ['Onduleur', `${inv.P} W`],
              ['I batterie → onduleur', `${fr(C.Iinv, 0)} A`],
              ['Ressource', sol.source === 'pvgis' ? 'PVGIS' : 'valeurs indicatives'],
            ]} />
          </section>
          <div className="hidden min-h-0 flex-1 lg:flex lg:flex-col">
            <ProfBotPv tp={tp} />
          </div>
        </aside>
      </div>

      <div className="no-print sticky bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)] lg:hidden">
        <button
          type="button"
          onClick={() => store.setBotOpen(!store.botOpen)}
          aria-expanded={store.botOpen}
          className="min-h-touch w-full px-4 py-2.5 text-left text-[13px] font-semibold"
        >
          {store.botOpen ? '▾' : '▴'} Professeur virtuel — {PV_STEPS[s.step].title}
        </button>
        {store.botOpen && <ProfBotPv tp={tp} />}
      </div>

      <AidePv />
      <Toast message={store.toast} />
    </div>
  );
}
