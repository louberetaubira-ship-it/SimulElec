'use client';

/**
 * Professeur virtuel — coach flottant. L'avatar (ta photo) apparaît à côté du TP
 * et intervient quand l'élève répète des erreurs ou reste bloqué : il motive et
 * guide par des questions, sans jamais donner la réponse. L'escalade et les
 * seuils viennent de `@/lib/prof/coach`.
 */
import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { ETAPE } from '@/lib/sim/progress';
import { repereSlot } from '@/lib/sim/reperes';
import { useParcours } from '@/app/tp/[id]/store';
import ProfAvatar from './ProfAvatar';
import {
  COACH, IDLE_MSG, WIN_MSG, coachForErrors, errorCountFor, type CoachMsg,
} from '@/lib/prof/coach';

/** Étapes « de travail » où le coach peut intervenir (pas le choix ni l'énoncé). */
function isWorkStage(stage: number) {
  return stage >= ETAPE.PREPARATION && stage <= ETAPE.VALIDATION;
}

export default function ProfCoach({ tp }: { tp: TpDefinition }) {
  const stage = useParcours(s => s.st.stage);
  const poseErrors = useParcours(s => s.st.poseErrors);
  const wireErrors = useParcours(s => s.st.wireErrors);
  const diagTries = useParcours(s => s.st.diagTries);
  const doneStage = useParcours(s => s.st.done[stage]);
  const botOpen = useParcours(s => s.botOpen);
  const setBotOpen = useParcours(s => s.setBotOpen);

  const q1 = React.useMemo(() => repereSlot(tp, 'q1'), [tp]);

  const [msg, setMsg] = React.useState<CoachMsg | null>(null);
  const [collapsed, setCollapsed] = React.useState(false);

  const entryCount = React.useRef(0);      // erreurs au moment d'entrer dans l'étape
  const lastLevel = React.useRef(-1);      // dernier palier d'indice affiché
  const lastBubbleAt = React.useRef(0);    // horodatage de la dernière bulle
  const muteUntil = React.useRef(0);       // « laisse-moi chercher »
  const hadTrouble = React.useRef(false);  // a galéré sur cette étape ?

  const cur = errorCountFor(stage, { poseErrors, wireErrors, diagTries });

  const canSpeak = React.useCallback(() => {
    const now = Date.now();
    return now >= muteUntil.current && now - lastBubbleAt.current >= COACH.COOLDOWN_MS;
  }, []);

  const speak = React.useCallback((m: CoachMsg) => {
    setMsg(m);
    setCollapsed(false);
    if (m.text) lastBubbleAt.current = Date.now();
  }, []);

  /* Nouvelle étape : on repart à zéro (l'élève change de point). */
  React.useEffect(() => {
    entryCount.current = cur ?? 0;
    lastLevel.current = -1;
    hadTrouble.current = false;
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  /* Erreurs répétées sur le point courant. */
  React.useEffect(() => {
    if (cur == null || !isWorkStage(stage)) return;
    const streak = cur - entryCount.current;
    if (streak <= 0) return;
    if (streak >= 2) hadTrouble.current = true;
    const m = coachForErrors(stage, streak, q1);
    if (!m) return;
    // l'état « réflexion » (regard sans bulle) passe toujours ; une bulle respecte le cooldown
    if (m.text && !canSpeak()) { setMsg(prev => (prev && prev.text ? prev : m)); return; }
    if (streak !== lastLevel.current) { lastLevel.current = streak; speak(m); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, stage, q1]);

  /* Réussite de l'étape après avoir galéré → petite félicitation. */
  React.useEffect(() => {
    if (doneStage && hadTrouble.current) {
      speak(WIN_MSG);
      hadTrouble.current = false;
      const t = setTimeout(() => setMsg(prev => (prev === WIN_MSG ? null : prev)), 4500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneStage]);

  /* Inactivité : relance douce après un moment sans rien faire. */
  React.useEffect(() => {
    if (!isWorkStage(stage)) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (canSpeak() && !msg) speak(IDLE_MSG);
      }, COACH.IDLE_HINT_MS);
    };
    const reset = () => arm();
    arm();
    document.addEventListener('pointerdown', reset);
    document.addEventListener('keydown', reset);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', reset);
      document.removeEventListener('keydown', reset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, msg]);

  // le panneau complet est ouvert : le coach s'efface (le prof est déjà là)
  if (botOpen || !isWorkStage(stage)) return null;

  const state = msg?.state ?? 'idle';
  const showBubble = !!msg?.text && !collapsed;

  const laisseChercher = () => {
    muteUntil.current = Date.now() + COACH.MUTE_MS;
    setMsg(null);
  };
  const ouvrirProf = () => { setBotOpen(true); setMsg(null); };

  return (
    <div className="no-print fixed bottom-16 right-3 z-40 flex max-w-[300px] flex-col items-end gap-2 lg:right-5">
      {showBubble && (
        <div
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px] shadow-xl"
          style={{ animation: 'prof-pop .25s ease-out' }}
          role="status"
        >
          {msg?.level && (
            <div className={`mb-1 text-[10px] font-extrabold uppercase tracking-wide ${msg.state === 'safety' ? 'text-crit' : 'text-accent'}`}>
              {msg.level}
            </div>
          )}
          <p className="m-0 text-[var(--ink)]">{msg?.text}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={ouvrirProf}
              className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--accent-ink)]"
            >
              {msg?.plafond ? 'Voir le cours / demander' : 'Ouvrir le prof virtuel'}
            </button>
            <button
              type="button"
              onClick={laisseChercher}
              className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--muted)]"
            >
              Laisse-moi chercher
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => (msg ? setCollapsed(c => !c) : setBotOpen(true))}
        aria-label="Professeur virtuel"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        title="Professeur virtuel"
      >
        <ProfAvatar state={state} size={62} />
      </button>
    </div>
  );
}
