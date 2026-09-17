'use client';

/**
 * Étude de dimensionnement PV COMPLÈTE (11 étapes) EMBARQUÉE dans la préparation
 * du TP de câblage photovoltaïque « solaire-autonome ».
 *
 * On réutilise tel quel le module autonome (`DimensionnementClient`) : même store
 * `usePvParcours`, même moteur pur (`calc`, `checks`, `report`…), mêmes briques
 * d'interface (`Stepper`, `ChainBar`, `StepContent`, `Kv`, `Messages`, `Unifilaire`).
 * Seule différence : pas d'en-tête / pied plein écran — l'étude vit à l'intérieur
 * de la zone de préparation.
 *
 * COLLISION DE TENTATIVE : le store de câblage (`store.ts`) et ce store PV appellent
 * tous deux `getOrCreateAttempt(tp.id)`. Pour ne pas s'écraser, l'étude est initialisée
 * avec sa PROPRE clé de tentative `tp.id + '::etude'` (voir `init(tp, attemptKey)`).
 */

import React from 'react';
import type { TpDefinition } from '@/lib/types';
import {
  calc, checks, fr, picksOf, PV_STEP_COUNT, PV_STEP_LABELS, PV_STEP_SHORT, PV_STEPS,
  report as pvReport, solarOf,
} from '@/lib/pv/dimensionnement';
import Stepper from '@/components/parcours/Stepper';
import { ChainBar, Kv, Messages } from '@/components/pv/pieces';
import StepContent from '@/components/pv/steps';
import Unifilaire from '@/components/pv/Unifilaire';
import { useStudent } from '@/lib/useStudent';
import { usePvParcours } from '@/app/tp/[id]/pvStore';

export default function PreparationEtudePv({
  tp,
  onDone,
}: {
  tp: TpDefinition;
  onDone?: (done: boolean) => void;
}) {
  const store = usePvParcours();
  const { s, init, setStudent } = store;
  const { student, known } = useStudent(`/tp/${tp.id}`);

  // Tentative dédiée à l'étude : clé distincte de la tentative de câblage.
  React.useEffect(() => {
    let alive = true;
    void init(tp, tp.id + '::etude').then(() => {
      if (!alive) return;
      // Auberge : autonomie 3 j par défaut, mais seulement si l'état est frais
      // (rien de validé) — on ne touche pas à une tentative déjà sauvegardée.
      const cur = usePvParcours.getState().s;
      const fresh = cur.step === 0 && Object.keys(cur.done).length === 0;
      if (fresh && cur.auto !== 3) usePvParcours.getState().setAuto(3);
    });
    return () => { alive = false; };
  }, [init, tp]);

  React.useEffect(() => { if (known) setStudent(student); }, [known, setStudent, student]);

  const C = React.useMemo(() => calc(s), [s]);
  const msgs = React.useMemo(() => checks(s, s.step), [s]);
  const blocked = msgs.some(m => m.kind === 'bad');
  const { mppt, inv } = picksOf(s);
  const sol = solarOf(s);
  const last = s.step === PV_STEP_COUNT - 1;
  const allDone = Array.from({ length: 10 }).every((_, k) => s.done[k]);

  // Remonte l'état « étude terminée » au parent (verrouille la préparation).
  React.useEffect(() => { onDone?.(allDone); }, [allDone, onDone]);

  const onValidate = () => {
    const okStep = store.validate();
    if (okStep && last) void store.finish();
  };

  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="rounded-t-2xl border-b border-accent/40 bg-accent/5 px-3 py-2.5">
        <h3 className="m-0 font-title text-[15px] font-semibold">
          Étude de dimensionnement — réalisée par l&apos;élève
        </h3>
        <p className="m-0 mt-1 text-[12px] leading-relaxed text-muted">
          Le bureau d&apos;étude, c&apos;est toi : tu poses et vérifies chaque calcul des
          onze étapes. Chaque étape reste verrouillée tant que la précédente n&apos;est pas
          juste. À la fin, ta note de calcul justifie le matériel que tu poseras et câbleras.
        </p>
      </div>

      <Stepper
        stage={s.step}
        done={s.done}
        onGo={store.goStep}
        labels={PV_STEP_LABELS}
        shortLabels={PV_STEP_SHORT}
      />
      <ChainBar s={s} />

      <div className="grid gap-2.5 px-3 pb-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Gauche : contenu de l'étape (ou note de calcul + unifilaire à la fin) */}
        <main className="flex min-w-0 flex-col gap-2">
          <div>
            <h4 className="m-0 font-title text-[19px] font-bold leading-tight">
              {s.step + 1} · {PV_STEPS[s.step].title}
            </h4>
            <p className="m-0 text-[12px] text-muted">{PV_STEPS[s.step].sub}</p>
          </div>

          {last ? (
            allDone ? (
              <div className="flex flex-col gap-3">
                <pre className="m-0 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono-num text-[12px] leading-relaxed">
                  {pvReport(s)}
                </pre>
                <Unifilaire s={s} />
                <button
                  type="button"
                  onClick={() => void store.finish()}
                  disabled={store.sent || store.offline || !store.attemptId}
                  className="min-h-touch rounded-[10px] border border-good bg-good px-3 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
                >
                  {store.sent
                    ? 'Note de calcul envoyée ✓'
                    : store.offline || !store.attemptId
                      ? 'Hors-ligne : envoi impossible'
                      : 'Envoyer au professeur'}
                </button>
              </div>
            ) : (
              <div className="rounded-r-xl border-l-4 border-l-warn bg-warn/10 px-2.5 py-2 text-[12.5px]">
                <b className="block">Note de calcul verrouillée</b>
                Valide d&apos;abord les dix étapes précédentes.
              </div>
            )
          ) : (
            <StepContent step={s.step} />
          )}

          <Messages list={msgs} />

          <div className="mt-1 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
            <button
              type="button"
              disabled={s.step === 0}
              onClick={() => store.goStep(s.step - 1)}
              className="min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 text-[12.5px] font-semibold disabled:opacity-45"
            >
              ← Précédent
            </button>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                blocked ? 'bg-crit/15 text-crit' : 'bg-good/15 text-good'
              }`}
            >
              {blocked ? 'bloqué' : 'étape valide'}
            </span>
            <button
              type="button"
              onClick={onValidate}
              className="min-h-touch rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-[var(--accent-ink)]"
            >
              {last ? 'Terminer' : 'Valider et continuer →'}
            </button>
          </div>
        </main>

        {/* Droite : résumé en direct */}
        <aside className="flex flex-col gap-2.5">
          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
            <h5 className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
              Résumé en direct
            </h5>
            <Kv rows={[
              ['Ejour', `${fr(C.Ejour, 0)} Wh/j`],
              ['P simultanée', `${fr(C.Psim, 0)} W`],
              ['HSP · η', `${fr(C.hsp, 1)} h · ${s.eta}`],
              ['Ppv nécessaire', `${fr(C.Ppv, 0)} Wc`],
              ['Champ', `${s.ns}S${s.np}P · ${fr(C.PpvReal, 0)} Wc`],
              ['Voc froid', `${fr(C.VocCold, 0)} V`],
              ['Parc', `${fr(C.Ubat, 0)} V / ${fr(C.Ah, 0)} Ah`],
              ['MPPT', mppt.name.replace('Régulateur ', '')],
              ['Onduleur', `${inv.P} W`],
              ['I batterie → onduleur', `${fr(C.Iinv, 0)} A`],
              ['Ressource', sol.source === 'pvgis' ? 'PVGIS' : 'valeurs indicatives'],
            ]} />
          </section>
        </aside>
      </div>
    </section>
  );
}
