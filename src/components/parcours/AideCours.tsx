'use client';

/**
 * Aide à l'élève bloqué : rappels de cours et règles de calcul.
 *
 * Le bouton « J'ai besoin d'aide » est présent à toutes les étapes (rendu par `StageLayout`).
 * Le panneau s'ouvre aussi tout seul, une fois par étape, après 3 erreurs de câblage,
 * 2 mauvais choix de matériel, une mesure erronée ou un diagnostic faux (voir le store).
 */

import React from 'react';
import { COURS, coursList, type CoursFiche, type CoursId } from '@/lib/data/cours';
import type { DiplomaId } from '@/lib/data/competences';
import { aideLeft, coursForStage, modeOf, STAGES } from '@/lib/sim/progress';
import { useParcours } from '@/app/tp/[id]/store';

const REASON_TEXT: Record<string, string> = {
  cablage: 'Trois liaisons refusées : reprends la règle avant de continuer.',
  materiel: 'Deux choix faux : la fiche te redonne la méthode de choix.',
  mesure: 'Cette mesure n\'est pas celle attendue : revois la règle et la position de l\'appareil.',
  diagnostic: 'Le diagnostic n\'est pas le bon : reprends la méthode.',
};

/** Bouton toujours visible, à placer dans la colonne de gauche de chaque étape. */
export function AideButton() {
  const openAide = useParcours(s => s.openAide);
  const st = useParcours(s => s.st);
  const used = st.helpUsed?.[st.stage] ?? 0;
  const evaluation = modeOf(st) === 'evaluation';
  const reste = aideLeft(st);
  return (
    <button
      type="button"
      data-aide-open
      disabled={evaluation && reste === 0}
      onClick={() => openAide(null)}
      className="min-h-touch w-full rounded-full border border-accent bg-accent px-4 py-2 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"
    >
      💡 J&apos;ai besoin d&apos;aide
      {evaluation
        ? <span className="ml-1 font-normal opacity-80">· {reste} restante{reste > 1 ? 's' : ''}</span>
        : used > 0 && <span className="ml-1 font-normal opacity-80">· {used}</span>}
    </button>
  );
}

export function Fiche({ fiche, diploma }: { fiche: CoursFiche; diploma: DiplomaId }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="m-0 text-[15px] font-semibold leading-snug">{fiche.title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">{fiche.summary}</p>
      </div>

      <section>
        <h4 className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
          Règles et formules
        </h4>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {fiche.rules.map(r => (
            <li
              key={r}
              className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono-num text-[11.5px] leading-relaxed"
            >
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">Exemple</h4>
        <p className="m-0 rounded-lg border border-good/50 bg-good/10 px-2.5 py-2 text-[12px] leading-relaxed">
          {fiche.example}
        </p>
      </section>

      <section>
        <h4 className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
          Pièges fréquents
        </h4>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {fiche.pieges.map(p => (
            <li key={p} className="flex gap-1.5 text-[12px] leading-relaxed text-ink">
              <span aria-hidden className="text-crit">✘</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="m-0 rounded-lg border border-accent/50 bg-accent/10 px-2.5 py-2 text-[12px] leading-relaxed">
        <b>Attendu pour ton diplôme —</b> {fiche.levels[diploma]}
      </p>
    </div>
  );
}

interface ModalProps {
  /** Nom de l'étape en cours, affiché en tête. */
  stage: string;
  /** Message d'explication de l'ouverture automatique. */
  reason?: string | null;
  fiches: CoursFiche[];
  current: CoursFiche;
  diploma: DiplomaId;
  onPick: (id: CoursId) => void;
  onClose: () => void;
  onAsk: (question: string) => void;
}

/**
 * Panneau modal de rappel de cours, sans dépendance à un store :
 * réutilisé par le parcours platine et par le parcours de dimensionnement.
 */
export function AideModal({ stage, reason, fiches, current, diploma, onPick, onClose, onAsk }: ModalProps) {
  const question =
    `Étape « ${stage} » : je suis bloqué. J'ai lu la fiche « ${current.title} ». ` +
    'Peux-tu me guider vers la règle à appliquer, sans me donner la valeur ?';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Rappel de cours">
      <div
        data-aide-panel
        className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl sm:max-w-[640px] sm:rounded-2xl"
      >
        <header className="flex items-start gap-2 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-title text-[11px] font-semibold uppercase tracking-[.14em] text-accent">
              Rappel de cours · {stage}
            </div>
            <div className="text-[12px] text-muted">
              {reason || 'Prends le temps de relire la règle, puis reprends le TP.'}
            </div>
          </div>
          <button
            type="button"
            data-aide-close
            onClick={onClose}
            aria-label="Fermer l'aide"
            className="min-h-touch min-w-[40px] rounded-[10px] border border-[var(--line)] px-2 text-[15px]"
          >
            ✕
          </button>
        </header>

        {fiches.length > 1 && (
          <div className="flex flex-wrap gap-1.5 border-b border-[var(--line)] px-4 py-2">
            {fiches.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => onPick(f.id)}
                className={`min-h-touch rounded-full border px-3 py-1.5 text-[11.5px] ${f.id === current.id
                  ? 'border-accent bg-accent font-semibold text-[var(--accent-ink)]'
                  : 'border-[var(--line)] bg-[var(--surface)] text-ink'}`}
              >
                {f.theme}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <Fiche fiche={current} diploma={diploma} />
        </div>

        <footer className="flex flex-col gap-1.5 border-t border-[var(--line)] p-3 sm:flex-row">
          <button
            type="button"
            data-aide-prof
            onClick={() => onAsk(question)}
            className="min-h-touch flex-1 rounded-[10px] border border-good bg-good px-3 py-2.5 text-[12.5px] font-semibold text-white"
          >
            Demander au professeur
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-touch flex-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[12.5px] font-semibold"
          >
            J&apos;ai compris, je reprends
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function AideCours() {
  const s = useParcours();
  const { tp, st, aideOpen, aideReason, aideFiche } = s;

  const ids = React.useMemo(() => coursForStage(tp?.id ?? '', st.stage), [tp, st.stage]);
  const fiches = React.useMemo(() => coursList(ids), [ids]);
  const current = (aideFiche && COURS[aideFiche]) || fiches[0] || null;

  if (!aideOpen || !current) return null;

  return (
    <AideModal
      stage={STAGES[st.stage]}
      reason={aideReason ? REASON_TEXT[aideReason] : null}
      fiches={fiches}
      current={current}
      diploma={s.evalDiploma}
      onPick={s.setAideFiche}
      onClose={s.closeAide}
      onAsk={s.askProf}
    />
  );
}
