'use client';

/**
 * Contenu du tiroir du mode atelier : le cahier des charges du TP, un rappel de
 * l'étape en cours, puis le professeur virtuel. Monté une seule fois par le
 * `<Workspace>` en plein écran (il glisse depuis la droite, il ne remonte pas).
 */
import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { STAGES } from '@/lib/sim/progress';
import { HELLO } from '@/lib/sim/context';
import ProfBot from './ProfBot';
import CompetencesStage from './CompetencesStage';
import { useParcours } from '@/app/tp/[id]/store';

export default function AtelierDrawer({ tp }: { tp: TpDefinition }) {
  const s = useParcours();
  const { st, sim } = s;

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <div className="font-title text-[11px] font-semibold uppercase tracking-[.14em] text-accent">
          Étape {st.stage + 1} / {STAGES.length} · {STAGES[st.stage]}
        </div>
        <h2 className="text-[17px] font-bold">{tp.title}</h2>
        <p className="m-0 text-[12.5px] text-muted">{tp.situation}</p>
        <div className="grid gap-x-3 text-[12px]">
          {tp.cahierDesCharges.map(c => (
            <div key={c.k} className="flex justify-between gap-2 border-b border-[var(--line)] py-1">
              <span className="text-muted">{c.k}</span><b className="text-right">{c.v}</b>
            </div>
          ))}
        </div>
        <CompetencesStage
          diploma={s.evalDiploma}
          stage={st.stage}
          stageLabel={STAGES[st.stage]}
          compact
          className="-mx-3 rounded-none border-y border-[var(--line)]"
        />

        {HELLO[st.stage] && (
          <p className="m-0 rounded-[10px] border border-accent bg-accent/10 px-2 py-1.5 text-[12px]">
            {HELLO[st.stage]}
          </p>
        )}
      </section>

      <div className="min-h-[320px]">
        <ProfBot tp={tp} st={st} sim={sim} attemptId={s.attemptId} turns={s.turns} onTurn={s.pushTurn} />
      </div>
    </div>
  );
}
