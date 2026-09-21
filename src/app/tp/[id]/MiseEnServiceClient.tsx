'use client';

/**
 * Parcours « mise en service industrielle » (station de relevage SR1).
 * Choisi par `page.tsx` quand `tp.kind === 'miseEnService'`.
 *
 * L'installation est livrée câblée : l'élève l'identifie sur les schémas,
 * prépare son intervention, puis la contrôle et la met en service en 7 étapes
 * avec un seul appareil, le contrôleur d'installation.
 */

import React from 'react';
import type { TpDefinition } from '@/lib/types';
import {
  blocages, buildMesEvaluation, MES, MES_STEP_COUNT, MES_STEP_LABELS, MES_STEP_SHORT, MES_STEPS,
  mesScore, mesStageScores, type MesZone,
} from '@/lib/mes/miseEnService';
import { Toast } from '@/components/ui';
import Stepper from '@/components/parcours/Stepper';
import Evaluation from '@/components/parcours/Evaluation';
import CompetencesStage from '@/components/parcours/CompetencesStage';
import { DiplomaPicker, diplomesVises, SOURCE_LABEL, useDiploma } from '@/components/parcours/useDiploma';
import { competenceCounts } from '@/lib/data/competences';
import { useStudent } from '@/lib/useStudent';
import { diplomaShort } from '@/lib/student';
import MesStep from '@/components/mes/steps';
import '@/components/mes/mes.css';
import { useMesParcours } from './mesStore';

const ZONE: Record<MesZone, { label: string; bar: string }> = {
  pr: { label: 'Préparation', bar: 'border-l-accent' },
  hs: { label: 'Hors tension · installation consignée', bar: 'border-l-[#2c6fd6]' },
  st: { label: 'Sous tension', bar: 'border-l-crit' },
  doc: { label: 'Documents', bar: 'border-l-muted' },
};

export default function MiseEnServiceClient({ tp }: { tp: TpDefinition }) {
  const store = useMesParcours();
  const { s, init, setStudent } = store;
  const { student, known } = useStudent(`/tp/${tp.id}`);
  const dip = useDiploma(tp, student, known);

  React.useEffect(() => { void init(tp); }, [init, tp]);
  React.useEffect(() => { if (known) setStudent(student); }, [known, setStudent, student]);

  const msgs = React.useMemo(() => blocages(s, s.step), [s]);
  const blocked = msgs.some((m) => m.kind === 'bad');
  const doneCount = Object.values(s.done).filter(Boolean).length;
  const last = s.step === MES_STEP_COUNT - 1;
  const fini = !!s.done[MES.PV];
  const counts = React.useMemo(() => competenceCounts(dip.diploma, 'miseEnService'), [dip.diploma]);
  const horsReferentiel = dip.vises.length > 0 && !dip.vises.includes(dip.diploma);
  const step = MES_STEPS[s.step];

  const onValidate = () => {
    const ok = store.validate();
    if (ok && last) void store.finish();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
        <div className="min-w-0 text-[12.5px] text-muted">
          TP · <b className="font-medium text-ink">Mise en service · station de relevage SR1</b>
          <span className="ml-2 hidden sm:inline">
            · <b className="font-medium text-ink">{store.student.name}</b>
            <span className="ml-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-semibold">
              {diplomaShort(dip.diploma)}
            </span>
          </span>
        </div>
        {dip.apercu && <DiplomaPicker value={dip.diploma} onChange={(d) => dip.setOverride(d)} />}
        <div className="ml-auto flex items-center gap-2.5 text-[12.5px]">
          <span className="hidden sm:inline">Progression</span>
          <div className="h-2 w-[120px] overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div className="h-full bg-good transition-all" style={{ width: `${(doneCount / MES_STEP_COUNT) * 100}%` }} />
          </div>
          <b className="font-mono-num">{Math.round((doneCount / MES_STEP_COUNT) * 100)} %</b>
          {store.offline && <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[10.5px] font-semibold text-warn">hors-ligne</span>}
        </div>
      </header>

      {horsReferentiel && (
        <div className="border-b border-accent/40 bg-accent/10 px-4 py-2 text-[12.5px] text-ink" role="status">
          Ce TP vise {diplomesVises(dip.vises)} ;
          tes compétences seront évaluées dans le référentiel du {diplomaShort(dip.diploma)}
          {dip.source !== 'apercu' && <> (d’après {SOURCE_LABEL[dip.source]})</>}.
        </div>
      )}

      <Stepper
        stage={s.step}
        done={s.done}
        onGo={store.goStep}
        labels={MES_STEP_LABELS}
        shortLabels={MES_STEP_SHORT}
        competenceCounts={counts}
      />
      <CompetencesStage diploma={dip.diploma} kind="miseEnService" stage={s.step} stageLabel={MES_STEP_LABELS[s.step]} />

      <div data-parcours="mes" className="grid flex-1 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden flex-col gap-1.5 overflow-y-auto border-r border-[var(--line)] bg-[var(--surface)] p-3 lg:flex">
          {MES_STEPS.map((st, i) => {
            const isDone = !!s.done[i];
            const locked = i > 0 && !s.done[i - 1] && !isDone && s.step !== i;
            const newZone = i === 0 || MES_STEPS[i - 1].zone !== st.zone;
            return (
              <React.Fragment key={st.title}>
                {newZone && (
                  <div className={`mt-1 text-[10.5px] font-semibold uppercase tracking-[.06em] ${st.zone === 'hs' ? 'text-[#2c6fd6]' : st.zone === 'st' ? 'text-crit' : 'text-muted'}`}>
                    {st.zone === 'hs' ? '🔒 ' : st.zone === 'st' ? '⚡ ' : ''}{ZONE[st.zone].label}
                  </div>
                )}
                <button
                  type="button"
                  data-messtep={i}
                  disabled={locked}
                  onClick={() => store.goStep(i)}
                  className={`flex min-h-touch w-full items-start gap-2 rounded-xl border border-l-4 bg-[var(--surface)] px-2.5 py-2 text-left ${ZONE[st.zone].bar} ${s.step === i ? 'border-accent ring-2 ring-accent/25' : 'border-[var(--line)]'} ${locked ? 'cursor-default opacity-50' : ''}`}
                >
                  <span className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-full text-[11px] font-bold ${isDone ? 'bg-good text-white' : 'bg-[var(--line)] text-ink'}`}>
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[12px] leading-tight">{st.title}</b>
                    <small className="text-[11px] text-muted">{st.sub}</small>
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </aside>

        <main className="flex min-w-0 flex-col gap-2.5 overflow-y-auto p-3.5">
          <div>
            <h2 className="m-0 font-title text-[24px] font-bold leading-tight">
              {s.step + 1} · {step.title}
            </h2>
            <p className="m-0 text-[12.5px] text-muted">{step.sub}</p>
          </div>

          {s.step === MES.IDENT && (
            <details data-situation open className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[12.5px]">
              <summary className="cursor-pointer font-semibold">Situation et cahier des charges</summary>
              <p className="m-0 mt-2 max-w-[80ch] leading-relaxed text-muted">{tp.situation}</p>
              <dl className="m-0 mt-2 grid gap-x-3 gap-y-1 md:grid-cols-[150px_minmax(0,1fr)]">
                {(tp.cahierDesCharges ?? []).map((c) => (
                  <React.Fragment key={c.k}>
                    <dt className="m-0 font-semibold">{c.k}</dt>
                    <dd className="m-0 text-muted">{c.v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </details>
          )}

          <MesStep step={s.step} />

          {msgs.length > 0 && (
            <div data-blocages className="flex flex-col gap-1">
              {msgs.map((m) => (
                <div key={m.text} className={`rounded-r-xl border-l-4 px-2.5 py-1.5 text-[12.5px] ${m.kind === 'bad' ? 'border-l-warn bg-warn/10' : 'border-l-good bg-good/10'}`}>
                  {m.text}
                </div>
              ))}
            </div>
          )}

          {fini && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-send-report
                onClick={() => void store.finish()}
                disabled={store.sent || store.offline || !store.attemptId}
                className="min-h-touch rounded-[10px] border border-good bg-good px-3 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
              >
                {store.sent ? 'Procès-verbal envoyé au professeur ✓' : store.offline || !store.attemptId ? 'Hors-ligne : envoi impossible' : 'Envoyer au professeur'}
              </button>
              <Evaluation
                tp={tp}
                student={store.student}
                diploma={dip.diploma}
                evaluation={buildMesEvaluation(s, dip.diploma)}
                scores={mesStageScores(s)}
                stageLabels={MES_STEP_LABELS}
                helpUsed={{}}
                score={mesScore(s)}
              />
            </div>
          )}

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
              {fini && last ? 'terminé' : blocked ? 'à compléter' : 'étape valide'}
            </span>
            <button
              type="button"
              data-next
              disabled={fini && last}
              onClick={onValidate}
              className="min-h-touch rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-45"
            >
              {last ? 'Signer le procès-verbal' : 'Valider et continuer →'}
            </button>
          </div>
        </main>
      </div>

      <Toast message={store.toast} />
    </div>
  );
}
