'use client';

/**
 * Professeur virtuel du parcours « mise en service ».
 * Même contrat que les autres bots (`POST /api/prof`) ; contexte : étape,
 * position du commutateur, lectures, blocages. Chaque question compte comme
 * une aide de l'étape (visible dans l'évaluation).
 */

import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { MES_STEPS } from '@/lib/mes/miseEnService';
import { buildMesContext, MES_HELLO, MES_QUICK, mesFallbackAnswer } from '@/lib/mes/prof';
import { useMesParcours } from '@/app/tp/[id]/mesStore';

interface Msg { role: 'user' | 'assistant'; content: string; pending?: boolean }

export default function ProfBotMes({ tp }: { tp: TpDefinition }) {
  const s = useMesParcours((x) => x.s);
  const pos = useMesParcours((x) => x.pos);
  const point = useMesParcours((x) => x.point);
  const student = useMesParcours((x) => x.student);
  const attemptId = useMesParcours((x) => x.attemptId);
  const turns = useMesParcours((x) => x.turns);
  const pushTurn = useMesParcours((x) => x.pushTurn);
  const countHelp = useMesParcours((x) => x.countHelp);
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const helloRef = React.useRef<number | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (helloRef.current === s.step) return;
    helloRef.current = s.step;
    const hello = MES_HELLO[s.step];
    if (hello) setMsgs((m) => [...m, { role: 'assistant', content: hello }]);
  }, [s.step]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);

  const ask = React.useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    countHelp();
    setMsgs((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '…', pending: true }]);
    pushTurn({ role: 'user', content: q });

    const settle = (answer: string) => {
      setMsgs((m) => {
        const copy = [...m];
        const i = copy.findIndex((x) => x.pending);
        if (i >= 0) copy[i] = { role: 'assistant', content: answer };
        else copy.push({ role: 'assistant', content: answer });
        return copy;
      });
      pushTurn({ role: 'assistant', content: answer });
      setBusy(false);
    };
    const secours = () => { setOnline(false); settle(mesFallbackAnswer(q, s.step)); };

    if (!attemptId) { secours(); return; }
    try {
      const res = await fetch('/api/prof', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          stage: s.step,
          context: buildMesContext(tp, s, { student, pos, point: point[s.step] }),
          student: { name: student.name, diploma: student.diploma },
          cours: null,
          turns: [...turns, { role: 'user', content: q }].slice(-8),
        }),
      });
      if (!res.ok) { secours(); return; }
      const data = (await res.json()) as { text?: string; error?: string };
      if (!data.text || data.error) { secours(); return; }
      setOnline(true);
      settle(data.text);
    } catch {
      secours();
    }
  }, [attemptId, busy, countHelp, point, pos, pushTurn, s, student, tp, turns]);

  const quick = MES_QUICK[s.step] ?? [];
  const aides = s.helpUsed[s.step] ?? 0;

  return (
    <div data-profbot className="flex min-h-0 flex-1 flex-col bg-[var(--surface)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--line)] px-3.5 py-3">
        <div className="h-[34px] w-[34px] flex-none rounded-full bg-cover ring-2 ring-[var(--good)]" style={{ backgroundImage: 'url(/prof-avatar.png)', backgroundPosition: 'center 22%' }} aria-hidden />
        <div className="min-w-0">
          <b className="block text-[13px]">Professeur virtuel · mise en service</b>
          <small className="text-[11px] text-muted">
            {online ? 'Rappelle la règle, jamais la valeur' : 'Mode hors-ligne : réponses préparées'}
            {aides > 0 && ` · ${aides} aide${aides > 1 ? 's' : ''} à cette étape`}
          </small>
        </div>
      </header>

      <div ref={listRef} className="flex max-h-[46vh] min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto p-3 lg:max-h-none">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${m.role === 'user' ? 'self-end rounded-br bg-accent text-[var(--accent-ink)]' : 'self-start rounded-bl bg-[var(--surface-2)]'}`}>
            {m.content}
          </div>
        ))}
      </div>

      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {quick.map((q) => (
            <button key={q} type="button" data-quick disabled={busy} onClick={() => void ask(q)}
              className="min-h-touch rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[11px] text-muted disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>
      )}

      <form className="flex gap-1.5 border-t border-[var(--line)] p-3" onSubmit={(e) => { e.preventDefault(); void ask(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pose ta question au professeur…" aria-label="Question au professeur"
          className="min-h-touch min-w-0 flex-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 text-[13px] text-ink" />
        <button type="submit" disabled={busy} className="min-h-touch rounded-[10px] bg-good px-3.5 font-semibold text-white disabled:opacity-50">Envoyer</button>
      </form>
      <p className="sr-only">Étape : {MES_STEPS[s.step].title}</p>
    </div>
  );
}
