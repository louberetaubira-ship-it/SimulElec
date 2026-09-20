'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { TpDefinition } from '@/lib/types';
import { ETAPE, MAX_STAGE_PREVIEW, modeChosen, STAGE_COUNT, STAGES } from '@/lib/sim/progress';
import { Toast } from '@/components/ui';
import Stepper from '@/components/parcours/Stepper';
import ChoixTp from '@/components/parcours/ChoixTp';
import Enonce from '@/components/parcours/Enonce';
import Preparation from '@/components/parcours/Preparation';
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
import ProfAvatar from '@/components/parcours/ProfAvatar';
import ProfCoach from '@/components/parcours/ProfCoach';
import AideCours from '@/components/parcours/AideCours';
import CompetencesStage from '@/components/parcours/CompetencesStage';
import { ModeBadge, ModeChooser } from '@/components/parcours/ModeTp';
import { DiplomaPicker, diplomesVises, SOURCE_LABEL, useDiploma } from '@/components/parcours/useDiploma';
import { competenceCounts, type DiplomaId } from '@/lib/data/competences';
import { assignedMode } from '@/lib/db/classes';
import { liveNotes, liveEvaluation } from '@/lib/sim/live';
import type { AttemptState, EvaluationMode } from '@/lib/types';
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
  const shellRef = React.useRef<HTMLDivElement>(null);

  /**
   * Hauteur de la coque : tout l'écran moins ce que la barre de navigation du site occupe
   * au-dessus. On mesure au lieu de coder une constante en dur — la barre se replie sur deux
   * lignes quand la fenêtre rétrécit, et une valeur figée ferait déborder la page.
   */
  React.useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const mesurer = () => {
      const haut = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty('--shell-top', `${Math.max(0, Math.round(haut))}px`);
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(document.body);
    window.addEventListener('resize', mesurer);
    return () => { ro.disconnect(); window.removeEventListener('resize', mesurer); };
  }, []);

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

  // Boucle de simulation : dès que les appareils deviennent manœuvrables, c'est-à-dire
  // à partir du câblage. Elle ne démarrait qu'à la déconsignation (ETAPE.HORS) : l'élève
  // qui fermait tout et appuyait sur « marche » pendant les essais voyait KM1 coller
  // sans que le moteur ne tourne jamais, puisque `tick()` n'était jamais appelé.
  React.useEffect(() => {
    if (st.stage < ETAPE.CABLAGE) return;
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
    if (st.stage === ETAPE.VALIDATION && !st.done[ETAPE.VALIDATION]) s.ensureFault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.stage, st.done[ETAPE.VALIDATION]]);

  const next = (from: number) => { complete(from); goStage(from + 1); };
  const doneCount = Object.values(st.done).filter(Boolean).length;
  const ready = s.tp != null;
  const wires = React.useMemo(() => panelWires(tp, st, sim), [tp, st, sim]);
  const counts = React.useMemo(() => competenceCounts(dip.diploma, 'platine'), [dip.diploma]);
  const horsReferentiel = dip.vises.length > 0 && !dip.vises.includes(dip.diploma);

  const stage = (() => {
    if (!ready) return null;
    switch (st.stage) {
      case ETAPE.CHOIX:
        return (
          <ChoixTp
            tpId={tp.id}
            onSelect={id => { if (id === tp.id) next(ETAPE.CHOIX); else router.push(`/tp/${id}`); }}
          />
        );
      case ETAPE.ENONCE:
        return <Enonce tp={tp} onNext={() => next(ETAPE.ENONCE)} />;
      case ETAPE.PREPARATION:
        return <Preparation tp={tp} st={st} onAnswer={s.answerPrep} onNext={() => next(ETAPE.PREPARATION)} />;
      case ETAPE.MATERIEL:
        return <Materiel tp={tp} st={st} onChoose={s.choose} onNext={() => next(ETAPE.MATERIEL)} />;
      case ETAPE.POSE:
        return (
          <Pose
            tp={tp} st={st}
            onPlace={s.selectDevice}
            onNext={() => next(ETAPE.POSE)}
            preview={!tp.playable}
          />
        );
      case ETAPE.CABLAGE:
        return (
          <Cablage
            tp={tp} st={st} wires={wires}
            selTerminal={s.selTerminal} onTerminalClick={s.clickTerminal}
            onAssist={s.assist} onNext={() => next(ETAPE.CABLAGE)}
          />
        );
      case ETAPE.TESTS:
        return <TestsHorsTension tp={tp} st={st} wires={wires} onRunTest={s.runTest} onNext={() => next(ETAPE.TESTS)} />;
      case ETAPE.EPI:
        return <EpiConsignation onNext={() => next(ETAPE.EPI)} />;
      case ETAPE.HORS:
        return <MesuresHorsTension onNext={() => next(ETAPE.HORS)} />;
      case ETAPE.MISE_EN_SERVICE:
        return <Deconsignation onNext={() => next(ETAPE.MISE_EN_SERVICE)} />;
      case ETAPE.SOUS:
        return <MesuresSousTension onNext={() => next(ETAPE.SOUS)} />;
      default:
        return <Validation onFinish={() => void s.finish()} />;
    }
  })();

  // TP verrouillé : terminé (validé) ou clôturé par le professeur → non rejouable.
  if (s.locked) {
    return (
      <LockedScreen
        tp={tp}
        locked={s.locked}
        st={st}
        diploma={dip.diploma}
        onHome={() => router.push('/moi')}
      />
    );
  }

  /*
   * Coque d'application à partir de 1024 px : la page ne défile plus d'un bloc, chaque colonne
   * défile chez elle. C'est ce qui redonne une *hauteur définie* à la zone de travail — sans
   * elle, la platine grandit avec son contenu, ne déborde donc jamais, et ne se laisse plus
   * faire défiler à la molette ni attraper à la main. En dessous de 1024 px : colonnes empilées
   * et page qui défile, comme avant.
   */
  return (
    <div
      ref={shellRef}
      className="flex min-h-screen flex-col bg-[var(--app)] lg:h-[calc(100dvh-var(--shell-top,0px))] lg:min-h-0 lg:overflow-hidden"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
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
        <div className="shrink-0 border-b border-warn/40 bg-warn/15 px-4 py-2 text-[12.5px] text-ink" role="status">
          <b>TP en cours de finalisation</b> — l&apos;énoncé, le matériel et la platine sont disponibles ;
          le câblage, les mesures et la mise en service arrivent prochainement.
        </div>
      )}

      {horsReferentiel && (
        <div className="shrink-0 border-b border-accent/40 bg-accent/10 px-4 py-2 text-[12.5px] text-ink" role="status">
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

      <div
        data-parcours
        className={`grid flex-1 lg:min-h-0 ${botOpen ? 'lg:grid-cols-[340px_minmax(0,1fr)_340px]' : 'lg:grid-cols-[340px_minmax(0,1fr)]'}`}
      >
        {stage}
        {botOpen && (
          <div className="no-print hidden lg:flex lg:min-h-0 lg:flex-col">
            {ready && (
              <ProfBot tp={tp} st={st} sim={sim} attemptId={s.attemptId} turns={s.turns} onTurn={s.pushTurn} />
            )}
          </div>
        )}
      </div>

      <div className="no-print sticky bottom-0 z-30 shrink-0 border-t border-[var(--line)] bg-[var(--surface)]">
        <button
          type="button"
          onClick={() => setBotOpen(!botOpen)}
          aria-expanded={botOpen}
          className="flex min-h-touch w-full items-center gap-2.5 px-4 py-2 text-left text-[12.5px] font-semibold"
        >
          <ProfAvatar state={botOpen ? 'idle' : 'guide'} size={30} />
          <span>Professeur virtuel — {STAGES[st.stage]}</span>
          <span className="ml-auto text-[var(--muted)]">{botOpen ? '▾' : '▴'}</span>
        </button>
        {botOpen && ready && (
          <div className="lg:hidden">
            <ProfBot tp={tp} st={st} sim={sim} attemptId={s.attemptId} turns={s.turns} onTurn={s.pushTurn} />
          </div>
        )}
      </div>

      {ready && tp.playable && !modeChosen(st) && (
        <ModeChooser impose={impose} onPick={(m, forced) => s.setMode(m, forced)} />
      )}

      {ready && tp.playable && <ProfCoach tp={tp} />}

      <AideCours />
      <Toast message={s.toast} />
    </div>
  );
}

/**
 * Écran affiché quand l'élève ouvre un TP qu'il ne peut plus rejouer :
 * - `termine` : TP terminé et VALIDÉ, note finale, bilan en lecture seule ;
 * - `cloture` : TP CLÔTURÉ par le professeur, note projetée « sous réserve »,
 *   reprise possible uniquement après réactivation par le professeur.
 * Aucune action de jeu n'est offerte : le parcours n'est pas monté.
 */
function LockedScreen({
  tp, locked, st, diploma, onHome,
}: {
  tp: TpDefinition;
  locked: 'termine' | 'cloture';
  st: AttemptState;
  diploma: DiplomaId;
  onHome: () => void;
}) {
  const termine = locked === 'termine';
  const note = liveNotes(tp, st).projetee;
  const evalu = liveEvaluation(tp, st, diploma) ?? [];
  const acquis = evalu.filter((c) => c.mastery === 'acquis').length;
  const evalues = evalu.filter((c) => c.mastery !== 'nonEvalue').length;
  const fr = (v: number) => v.toFixed(1).replace('.', ',');
  const accent = termine ? 'var(--good)' : '#1D6FE0';

  return (
    <div className="flex min-h-screen items-start justify-center bg-[var(--app)] px-4 py-10">
      <div className="w-full max-w-[560px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 flex-none place-items-center rounded-xl text-[24px]"
            style={{ background: termine ? 'rgba(30,158,99,.14)' : 'rgba(29,111,224,.12)' }}
          >
            {termine ? '✅' : '🔒'}
          </div>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[.1em]" style={{ color: accent }}>
              {termine ? 'TP terminé · validé' : 'TP clôturé par le professeur'}
            </div>
            <h1 className="m-0 text-[20px] font-bold">{tp.title}</h1>
          </div>
        </div>

        <p className="mt-4 text-[14px] text-muted">
          {termine
            ? 'Ce TP est terminé et validé : tu ne peux plus le refaire. Tu peux consulter ton bilan ci-dessous. Seul ton professeur peut le rouvrir.'
            : 'Ce TP a été clôturé par ton professeur. La note ci-dessous est la note projetée figée, sous réserve. Tu pourras le reprendre s’il le réactive.'}
        </p>

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
          <div
            className="grid h-16 w-16 flex-none place-items-center rounded-full font-mono-num text-[18px] font-bold"
            style={{ border: `4px solid ${accent}`, color: accent }}
          >
            {fr(note)}
          </div>
          <div className="text-[13px]">
            <div className="font-semibold">
              {fr(note)}/20 · {termine ? 'note finale' : 'note projetée (sous réserve)'}
            </div>
            <div className="text-muted">
              {evalues > 0 ? `${acquis}/${evalues} compétences acquises` : 'bilan de compétences indisponible'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onHome}
            className="min-h-touch rounded-[10px] px-4 text-[13px] font-bold text-white"
            style={{ background: '#141A21' }}
          >
            {termine ? 'Voir mon bilan dans mon espace' : 'Retour à mon espace'}
          </button>
          <button
            type="button"
            disabled
            title={termine ? 'Seul le professeur peut rouvrir un TP terminé' : 'Réactivation par le professeur requise'}
            className="min-h-touch cursor-not-allowed rounded-[10px] border border-[var(--line)] px-4 text-[13px] font-semibold text-muted opacity-60"
          >
            🔒 {termine ? 'Refaire le TP' : 'Reprendre'}
          </button>
        </div>
      </div>
    </div>
  );
}
