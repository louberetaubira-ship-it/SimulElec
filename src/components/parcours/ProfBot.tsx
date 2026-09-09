'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import type { SimState } from '@/lib/sim/engine';
import { buildContext, fallbackAnswer, HELLO, QUICK_QUESTIONS } from '@/lib/sim/context';

export interface Turn { role: 'user' | 'assistant'; content: string }

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  sim: SimState;
  attemptId: string | null;
  turns: Turn[];
  onTurn: (t: Turn) => void;
}

interface Msg extends Turn { pending?: boolean }

export default function ProfBot({ tp, st, sim, attemptId, turns, onTurn }: Props) {
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const helloRef = React.useRef<number | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // mot d'accueil à chaque changement d'étape
  React.useEffect(() => {
    if (helloRef.current === st.stage) return;
    helloRef.current = st.stage;
    const hello = HELLO[st.stage];
    if (hello) setMsgs(m => [...m, { role: 'assistant', content: hello }]);
  }, [st.stage]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);

  const ask = React.useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    setMsgs(m => [...m, { role: 'user', content: q }, { role: 'assistant', content: '…', pending: true }]);
    onTurn({ role: 'user', content: q });

    const settle = (answer: string) => {
      setMsgs(m => {
        const copy = [...m];
        const i = copy.findIndex(x => x.pending);
        if (i >= 0) copy[i] = { role: 'assistant', content: answer };
        else copy.push({ role: 'assistant', content: answer });
        return copy;
      });
      onTurn({ role: 'assistant', content: answer });
      setBusy(false);
    };

    if (!attemptId) { settle(fallbackAnswer(q)); setOnline(false); return; }

    try {
      const res = await fetch('/api/prof', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          stage: st.stage,
          context: buildContext(tp, st, sim),
          turns: [...turns, { role: 'user', content: q }].slice(-8),
        }),
      });
      if (!res.ok) { setOnline(false); settle(fallbackAnswer(q)); return; }
      const data = (await res.json()) as { text?: string; error?: string };
      if (!data.text || data.error) { setOnline(false); settle(fallbackAnswer(q)); return; }
      setOnline(true);
      settle(data.text);
    } catch {
      setOnline(false);
      settle(fallbackAnswer(q));
    }
  }, [attemptId, busy, onTurn, sim, st, tp, turns]);

  const quick = QUICK_QUESTIONS[st.stage] ?? [];

  return (
    <div className="flex min-h-0 flex-col bg-[var(--surface)] lg:border-l lg:border-[var(--line)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--line)] px-3.5 py-3">
        <div className="grid h-[34px] w-[34px] place-items-center rounded-full font-title font-bold text-white" style={{ background: 'linear-gradient(135deg,#1E9E63,#0E5C3A)' }}>Pr</div>
        <div>
          <b className="block text-[13px]">Professeur virtuel · électrotechnique</b>
          <small className="text-[11px] text-muted">
            {online ? 'Répond à tes questions sans donner la solution' : 'Mode hors-ligne : réponses préparées'}
          </small>
        </div>
      </header>

      <div ref={listRef} className="flex max-h-[46vh] min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto p-3 lg:max-h-none">
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
    </div>
  );
}
