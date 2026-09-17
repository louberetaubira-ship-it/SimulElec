'use client';

/**
 * Aide « rappel de cours » du parcours de dimensionnement.
 * Réutilise le panneau modal du parcours platine (`AideModal`) et le mapping
 * étape → fiches de `src/lib/pv/dimensionnement.ts`.
 */

import React from 'react';
import { COURS, coursList } from '@/lib/data/cours';
import { coursForPvStep, PV_STEPS } from '@/lib/pv/dimensionnement';
import { AideModal } from '@/components/parcours/AideCours';
import { usePvParcours } from '@/app/tp/[id]/pvStore';

const REASON_TEXT: Record<string, string> = {
  reponse: 'Deux réponses fausses à la même question : la fiche te redonne la règle de calcul.',
  etape: 'Le contrôle bloque toujours : reprends la règle avant de valider.',
};

/** Bouton toujours visible, en tête de la colonne des étapes. */
export function AidePvButton() {
  const openAide = usePvParcours(s => s.openAide);
  const used = usePvParcours(s => s.s.helpUsed[s.s.step] ?? 0);
  return (
    <button
      type="button"
      data-aide-open
      onClick={() => openAide(null)}
      className="min-h-touch w-full rounded-full border border-accent bg-accent px-4 py-2 text-[12.5px] font-semibold text-[var(--accent-ink)]"
    >
      💡 J&apos;ai besoin d&apos;aide
      {used > 0 && <span className="ml-1 font-normal opacity-80">· {used}</span>}
    </button>
  );
}

export default function AidePv() {
  const s = usePvParcours();
  const step = s.s.step;
  const fiches = React.useMemo(() => coursList(coursForPvStep(step)), [step]);
  const current = (s.aideFiche && COURS[s.aideFiche]) || fiches[0] || null;

  if (!s.aideOpen || !current) return null;

  return (
    <AideModal
      stage={PV_STEPS[step].title}
      reason={s.aideReason ? REASON_TEXT[s.aideReason] : null}
      fiches={fiches}
      current={current}
      diploma={s.student.diploma}
      onPick={s.setAideFiche}
      onClose={s.closeAide}
      onAsk={s.askProf}
    />
  );
}
