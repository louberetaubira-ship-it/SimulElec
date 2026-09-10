'use client';

/**
 * Professeur virtuel du parcours de dimensionnement.
 * Même contrat que le bot de la platine (`POST /api/prof`), avec un contexte de dimensionnement
 * et la consigne « rappelle la règle, pas la valeur ».
 */

import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { COURS, coursPrompt } from '@/lib/data/cours';
import { coursForPvStep, PV_STEPS } from '@/lib/pv/dimensionnement';
import { buildPvContext, PV_HELLO, PV_QUICK, pvFallbackAnswer } from '@/lib/pv/context';
import { usePvParcours } from '@/app/tp/[id]/pvStore';

interface Msg { role: 'user' | 'assistant'; content: string; pending?: boolean }

export default function ProfBotPv({ tp }: { tp: TpDefinition }) {
  const s = usePvParcours(x => x.s);
  const student = usePvParcours(x => x.student);
  const attemptId = usePvParcours(x => x.attemptId);
  const turns = usePvParcours(x => x.turns);
  const aideFiche = usePvParcours(x => x.aideFiche);
  const pushTurn = usePvParcours(x => x.pushTurn);
  const pendingQuestion = usePvParcours(x => x.pendingQuestion);
  const consumeQuestion = usePvParcours(x => x.consumeQuestion);
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const helloRef = React.useRef<number | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (helloRef.current === s.step) return;
    helloRef.current = s.step;
    const hello = PV_HELLO[s.step];
    if (hello) setMsgs(m => [...m, { role: 'assistant', content: hello }]);
  }, [s.step]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);

  const ask = React.useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    setMsgs(m => [...m, { role: 'user', content: q }, { role: 'assistant', content: '…', pending: true }]);
    pushTurn({ role: 'user', content: q });

    const settle = (answer: string) => {
      setMsgs(m => {
        const copy = [...m];
        const i = copy.findIndex(x => x.pending);
        if (i >= 0) copy[i] = { role: 'assistant', content: answer };
        else copy.push({ role: 'assistant', content: answer });
        return copy;
      });
      pushTurn({ role: 'assistant', content: answer });
      setBusy(false);
    };

    const fiche = (aideFiche && COURS[aideFiche]) || COURS[coursForPvStep(s.step)[0]] || null;

    if (!attemptId) { settle(pvFallbackAnswer(q)); setOnline(false); return; }

    try {
      const res = await fetch('/api/prof', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          stage: s.step,
          context: buildPvContext(tp, s, { student, fiche }),
          student: { name: student.name, diploma: student.diploma },
          cours: fiche ? coursPrompt(fiche, student.diploma) : null,
          turns: [...turns, { role: 'user', content: q }].slice(-8),
        }),
      });
      if (!res.ok) { setOnline(false); settle(pvFallbackAnswer(q)); return; }
      const data = (await res.json()) as { text?: string; error?: string };
      if (!data.text || data.error) { setOnline(false); settle(pvFallbackAnswer(q)); return; }
      setOnline(true);
      settle(data.text);
    } catch {
      setOnline(false);
      settle(pvFallbackAnswer(q));
    }
  }, [aideFiche, attemptId, busy, pushTurn, s, student, tp, turns]);

  // question envoyée depuis le panneau d'aide
  React.useEffect(() => {
    if (!pendingQuestion || busy) return;
    const q = pendingQuestion;
    consumeQuestion();
    void ask(q);
  }, [ask, busy, consumeQuestion, pendingQuestion]);

  const quick = PV_QUICK[s.step] ?? [];

  return (
    <div className="flex min-h-0 flex-col bg-[var(--surface)] lg:border-l lg:border-[var(--line)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--line)] px-3.5 py-3">
        <div className="grid h-[34px] w-[34px] place-items-center rounded-full font-title font-bold text-white" style={{ background: 'linear-gradient(135deg,#1E9E63,#0E5C3A)' }}>Pr</div>
        <div>
          <b className="block text-[13px]">Professeur virtuel · dimensionnement</b>
          <small className="text-[11px] text-muted">
            {online ? 'Rappelle la règle de calcul, jamais la valeur' : 'Mode hors-ligne : réponses préparées'}
          </small>
        </div>
      </header>

      <div ref={listRef} className="flex max-h-[46vh] min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto p-3 lg:max-h-none">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${m.role === 'user'
              ? 'self-end rounded-br bg-accent text-[var(--accent-ink)]'
              : 'self-start rounded-bl bg-[var(--surface-2)]'}`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {quick.map(q => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => void ask(q)}
              className="min-h-touch rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[11px] text-muted disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex gap-1.5 border-t border-[var(--line)] p-3"
        onSubmit={e => { e.preventDefault(); void ask(input); }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pose ta question au professeur…"
          aria-label="Question au professeur"
          className="min-h-touch flex-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 text-[13px] text-ink"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-touch rounded-[10px] bg-good px-3.5 font-semibold text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
      <p className="sr-only">Étape : {PV_STEPS[s.step].title}</p>
    </div>
  );
}
