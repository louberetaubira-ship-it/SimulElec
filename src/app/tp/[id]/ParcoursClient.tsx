'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { TpDefinition } from '@/lib/types';
import { MAX_STAGE_PREVIEW, modeChosen, STAGE_COUNT, STAGES } from '@/lib/sim/progress';
import { Toast } from '@/components/ui';
import Stepper from '@/components/parcours/Stepper';
import ChoixTp from '@/components/parcours/ChoixTp';
import Enonce from '@/components/parcours/Enonce';
import Materiel from '@/components/parcours/Materiel';
import Pose from '@/components/parcours/Pose';
import Cablage from '@/components/parcours/Cablage';
import TestsHorsTension from '@/components/parcours/TestsHorsTension';
import EpiConsignation from '@/components/parcours/EpiConsignation';
import MesuresHorsTension from '@/components/parcours/MesuresHorsTension';
import Deconsignation from '@/components/parcours/Deconsignation';
import MesuresSousTension from '@/components/parcours/MesuresSousTension';
import Validation from '@/components/parcours/Validation';
import ProfBot from '@/components/parcours/ProfBot';
import AideCours from '@/components/parcours/AideCours';
import CompetencesStage from '@/components/parcours/CompetencesStage';
import { ModeBadge, ModeChooser } from '@/components/parcours/ModeTp';
import { DiplomaPicker, diplomesVises, SOURCE_LABEL, useDiploma } from '@/components/parcours/useDiploma';
import { competenceCounts } from '@/lib/data/competences';
import { assignedMode } from '@/lib/db/classes';
import type { EvaluationMode } from '@/lib/types';
import { useStudent } from '@/lib/useStudent';
import { diplomaShort } from '@/lib/student';
import { useParcours, panelWires } from './store';

export default function ParcoursClient({ tp }: { tp: TpDefinition }) {
  const router = useRouter();
  const s = useParcours();
  const { init, st, sim, complete, goStage } = s;
  const botOpen = s.botOpen;
  const setBotOpen = s.setBotOpen;
  const setStudent = s.setStudent;
  const { student, known } = useStudent(`/tp/${tp.id}`);
  const dip = useDiploma(tp, student, known);
  const setEvalDiploma = s.setEvalDiploma;
  const [impose, setImpose] = React.useState<EvaluationMode | null>(null);

  React.useEffect(() => { void init(tp); }, [init, tp]);

  // identité de l'élève : en-tête, contexte du professeur virtuel et rapports
  React.useEffect(() => { if (known) setStudent(student); }, [known, setStudent, student]);

  // référentiel d'évaluation (profil → classe → niveau du TP, ou aperçu professeur)
  React.useEffect(() => { setEvalDiploma(dip.diploma); }, [dip.diploma, setEvalDiploma]);

  // mode imposé par le professeur à la classe au moment d'affecter le TP
  React.useEffect(() => {
    let alive = true;
    assignedMode(tp.id).then(m => { if (alive) setImpose(m); }).catch(() => {});
    return () => { alive = false; };
  }, [tp.id]);

  // boucle de simulation : à partir de la déconsignation
  React.useEffect(() => {
    if (st.stage < 8) return;
    const id = setInterval(() => useParcours.getState().advance(0.1), 100);
    return () => clearInterval(id);
  }, [st.stage]);

  // état de départ de l'étape (mise en service avant consignation, validations en attente)
  React.useEffect(() => {
    if (!s.tp) return;
    useParcours.getState().enterStage(st.stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.stage, s.tp]);

  // injection de la panne à l'entrée de la dernière étape
  React.useEffect(() => {
    if (st.stage === 10 && !st.done[10]) s.ensureFault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.stage, st.done[10]]);

  const next = (from: number) => { complete(from); goStage(from + 1); };
  const doneCount = Object.values(st.done).filter(Boolean).length;
  const ready = s.tp != null;
  const wires = React.useMemo(() => panelWires(tp, st, sim), [tp, st, sim]);
  const counts = React.useMemo(() => competenceCounts(dip.diploma, 'platine'), [dip.diploma]);
  const horsReferentiel = dip.vises.length > 0 && !dip.vises.includes(dip.diploma);

  const stage = (() => {
    if (!ready) return null;
    switch (st.stage) {
      case 0:
        return (
          <ChoixTp
            tpId={tp.id}
            onSelect={id => { if (id === tp.id) next(0); else router.push(`/tp/${id}`); }}
          />
        );
      case 1:
        return <Enonce tp={tp} onNext={() => next(1)} />;
      case 2:
        return <Materiel tp={tp} st={st} onChoose={s.choose} onNext={() => next(2)} />;
      case 3:
        return (
          <Pose
            tp={tp} st={st}
            onPlace={s.selectDevice}
            onNext={() => next(3)}
            preview={!tp.playable}
          />
        );
      case 4:
        return (
          <Cablage
            tp={tp} st={st} wires={wires}
            selTerminal={s.selTerminal} onTerminalClick={s.clickTerminal}
            onAssist={s.assist} onNext={() => next(4)}
          />
        );
      case 5:
        return <TestsHorsTension tp={tp} st={st} wires={wires} onRunTest={s.runTest} onNext={() => next(5)} />;
      case 6:
        return <EpiConsignation onNext={() => next(6)} />;
      case 7:
        return <MesuresHorsTension onNext={() => next(7)} />;
      case 8:
        return <Deconsignation onNext={() => next(8)} />;
      case 9:
        return <MesuresSousTension onNext={() => next(9)} />;
      default:
        return <Validation onFinish={() => void s.finish()} />;
    }
  })();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
        <div className="min-w-0 text-[12.5px] text-muted">
          TP · <b className="font-medium text-ink">{tp.title}</b>
          <span className="ml-2 hidden sm:inline">
            · <b className="font-medium text-ink">{s.student.name}</b>
            <span className="ml-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-semibold">
              {diplomaShort(dip.diploma)}
            </span>
          </span>
        </div>
        <ModeBadge st={st} />
        {dip.apercu && <DiplomaPicker value={dip.diploma} onChange={d => dip.setOverride(d)} />}
        <div className="ml-auto flex items-center gap-2.5 text-[12.5px]">
          <span className="hidden sm:inline">Progression</span>
          <div className="h-2 w-[120px] overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div className="h-full bg-good transition-all" style={{ width: `${doneCount / STAGE_COUNT * 100}%` }} />
          </div>
          <b className="font-mono-num">{Math.round(doneCount / STAGE_COUNT * 100)} %</b>
          {s.offline && <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[10.5px] font-semibold text-warn">hors-ligne</span>}
        </div>
      </header>

      {!tp.playable && (
        <div className="border-b border-warn/40 bg-warn/15 px-4 py-2 text-[12.5px] text-ink" role="status">
          <b>TP en cours de finalisation</b> — l&apos;énoncé, le matériel et la platine sont disponibles ;
          le câblage, les mesures et la mise en service arrivent prochainement.
        </div>
      )}

      {horsReferentiel && (
        <div className="border-b border-accent/40 bg-accent/10 px-4 py-2 text-[12.5px] text-ink" role="status">
          Ce TP vise {diplomesVises(dip.vises)} ;
          tes compétences seront évaluées dans le référentiel du {diplomaShort(dip.diploma)}
          {dip.source !== 'apercu' && <> (d’après {SOURCE_LABEL[dip.source]})</>}.
        </div>
      )}

      <Stepper
        stage={st.stage}
        done={st.done}
        onGo={goStage}
        maxStage={tp.playable ? STAGE_COUNT - 1 : MAX_STAGE_PREVIEW}
        competenceCounts={counts}
      />

      <CompetencesStage diploma={dip.diploma} stage={st.stage} stageLabel={STAGES[st.stage]} />

      <div data-parcours className="grid flex-1 lg:grid-cols-[340px_minmax(0,1fr)_340px]">
        {stage}
        <div className="no-print hidden lg:flex lg:min-h-0 lg:flex-col">
          {ready && (
            <ProfBot tp={tp} st={st} sim={sim} attemptId={s.attemptId} turns={s.turns} onTurn={s.pushTurn} />
          )}
        </div>
      </div>

      <div className="no-print sticky bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)] lg:hidden">
        <button
          type="button"
          onClick={() => setBotOpen(!botOpen)}
          aria-expanded={botOpen}
          className="min-h-touch w-full px-4 py-2.5 text-left text-[13px] font-semibold"
        >
          {botOpen ? '▾' : '▴'} Professeur virtuel — {STAGES[st.stage]}
        </button>
        {botOpen && ready && (
          <ProfBot tp={tp} st={st} sim={sim} attemptId={s.attemptId} turns={s.turns} onTurn={s.pushTurn} />
        )}
      </div>

      {ready && tp.playable && !modeChosen(st) && (
        <ModeChooser impose={impose} onPick={(m, forced) => s.setMode(m, forced)} />
      )}

      <AideCours />
      <Toast message={s.toast} />
    </div>
  );
}
