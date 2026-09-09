'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { TpDefinition } from '@/lib/types';
import { STAGE_COUNT, STAGES } from '@/lib/sim/progress';
import { Toast } from '@/components/ui';
import Stepper from '@/components/parcours/Stepper';
import ChoixTp from '@/components/parcours/ChoixTp';
import Enonce from '@/components/parcours/Enonce';
import Materiel from '@/components/parcours/Materiel';
import Pose from '@/components/parcours/Pose';
import Cablage from '@/components/parcours/Cablage';
import TestsHorsTension from '@/components/parcours/TestsHorsTension';
import MiseEnService from '@/components/parcours/MiseEnService';
import Validation from '@/components/parcours/Validation';
import ProfBot from '@/components/parcours/ProfBot';
import { useParcours, visibleWires } from './store';

export default function ParcoursClient({ tp }: { tp: TpDefinition }) {
  const router = useRouter();
  const s = useParcours();
  const { init, st, sim, complete, goStage } = s;
  const [botOpen, setBotOpen] = React.useState(false);

  React.useEffect(() => { void init(tp); }, [init, tp]);

  // boucle de simulation : seulement pendant la mise en service et la validation
  React.useEffect(() => {
    if (st.stage !== 6 && st.stage !== 7) return;
    const id = setInterval(() => useParcours.getState().advance(0.1), 100);
    return () => clearInterval(id);
  }, [st.stage]);

  // injection de la panne à l'entrée de l'étape 7
  React.useEffect(() => {
    if (st.stage === 7 && !st.done[7]) s.ensureFault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.stage, st.done[7]]);

  const next = (from: number) => { complete(from); goStage(from + 1); };
  const doneCount = Object.values(st.done).filter(Boolean).length;
  const ready = s.tp != null;

  const wiresAll = React.useMemo(() => visibleWires(tp, st, true), [tp, st]);
  const wiresStudent = React.useMemo(() => visibleWires(tp, st, false), [tp, st]);

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
            tp={tp} st={st} sim={sim}
            selSlot={s.selSlot} selDevice={s.selDevice}
            onSlotClick={s.selectSlot} onDeviceSelect={s.selectDevice}
            onNext={() => next(3)}
          />
        );
      case 4:
        return (
          <Cablage
            tp={tp} st={st} sim={sim} wires={wiresStudent}
            selTerminal={s.selTerminal} onTerminalClick={s.clickTerminal}
            onAssist={s.assist} onNext={() => next(4)}
          />
        );
      case 5:
        return <TestsHorsTension tp={tp} st={st} sim={sim} wires={wiresAll} onRunTest={s.runTest} onNext={() => next(5)} />;
      case 6:
        return (
          <MiseEnService
            tp={tp} st={st} sim={sim} wires={wiresAll}
            instrument={s.instrument} point={s.point}
            onLoad={s.setLoad} onInstrument={s.setInstrument} onPoint={s.setPoint} onRead={s.takeReading}
            onDeviceClick={s.deviceClick} onButton={s.button}
            onNext={() => next(6)}
          />
        );
      default:
        return (
          <Validation
            tp={tp} st={st} sim={sim} wires={wiresAll}
            instrument={s.instrument} point={s.point}
            onLoad={s.setLoad} onInstrument={s.setInstrument} onPoint={s.setPoint} onRead={s.takeReading}
            onDeviceClick={s.deviceClick} onButton={s.button}
            onDiagnose={s.diagnose} onRepair={s.repair} onQuiz={s.setQuiz}
            onFinish={() => void s.finish()}
          />
        );
    }
  })();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
        <div className="text-[12.5px] text-muted">
          TP · <b className="font-medium text-ink">{tp.title}</b>
        </div>
        <div className="ml-auto flex items-center gap-2.5 text-[12.5px]">
          <span className="hidden sm:inline">Progression</span>
          <div className="h-2 w-[120px] overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div className="h-full bg-good transition-all" style={{ width: `${doneCount / STAGE_COUNT * 100}%` }} />
          </div>
          <b className="font-mono-num">{Math.round(doneCount / STAGE_COUNT * 100)} %</b>
          {s.offline && <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[10.5px] font-semibold text-warn">hors-ligne</span>}
        </div>
      </header>

      <Stepper stage={st.stage} done={st.done} onGo={goStage} />

      <div className="grid flex-1 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
        {stage}
        <div className="hidden lg:flex lg:min-h-0 lg:flex-col">
          {ready && (
            <ProfBot tp={tp} st={st} sim={sim} attemptId={s.attemptId} turns={s.turns} onTurn={s.pushTurn} />
          )}
        </div>
      </div>

      {/* mobile : professeur virtuel en panneau repliable */}
      <div className="sticky bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)] lg:hidden">
        <button
          type="button"
          onClick={() => setBotOpen(o => !o)}
          aria-expanded={botOpen}
          className="min-h-touch w-full px-4 py-2.5 text-left text-[13px] font-semibold"
        >
          {botOpen ? '▾' : '▴'} Professeur virtuel — {STAGES[st.stage]}
        </button>
        {botOpen && ready && (
          <ProfBot tp={tp} st={st} sim={sim} attemptId={s.attemptId} turns={s.turns} onTurn={s.pushTurn} />
        )}
      </div>

      <Toast message={s.toast} />
    </div>
  );
}
