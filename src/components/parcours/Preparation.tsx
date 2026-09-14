'use client';

/**
 * Étape de PRÉPARATION (activité A1 du référentiel).
 *
 * Avant de choisir une référence et avant de poser le premier appareil, l'élève
 * lit le dossier : il reconnaît les organes du schéma sous leur repère, puis dit
 * ce que chacun fait. Deux gestes distincts — identifier n'est pas comprendre —
 * d'où les deux blocs.
 *
 * Comme à l'étape matériel, la justification s'affiche dès que l'élève a
 * répondu, juste ou faux : on n'attend pas la fin du TP pour lui dire pourquoi.
 */

import React from 'react';
import type { AttemptState, PrepQuestion, TpDefinition } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { goodPrep, preparationComplete, prepQuestions } from '@/lib/sim/progress';
import { Center, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  onAnswer: (questionId: string, index: number) => void;
  onNext: () => void;
}

function Bloc({ titre, consigne, questions, st, onAnswer }: {
  titre: string;
  consigne: string;
  questions: PrepQuestion[];
  st: AttemptState;
  onAnswer: (id: string, i: number) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="font-title text-[19px] font-semibold uppercase tracking-wide">{titre}</h3>
      <Note>{consigne}</Note>
      {questions.map(q => {
        const ch = st.prep?.[q.id];
        const repondu = ch != null;
        const juste = ch === q.answer;
        return (
          <article key={q.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <h4 className="flex flex-wrap items-baseline gap-2 text-[16px] font-bold">
              {q.rep && (
                <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 font-mono-num text-[13px]">
                  {q.rep}
                </span>
              )}
              {q.invite}
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const sel = ch === i;
                const tone = sel
                  ? (juste ? 'border-good bg-good/10' : 'border-crit bg-crit/10')
                  : 'border-[var(--line)] bg-[var(--surface)]';
                return (
                  <button
                    key={`${q.id}-${i}`}
                    type="button"
                    onClick={() => onAnswer(q.id, i)}
                    className={`min-h-touch rounded-[10px] border p-2 text-left text-[12.5px] leading-snug ${tone}`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {repondu && (
              <p className={`mt-1.5 text-[12px] ${juste ? 'text-good' : 'text-crit'}`}>{q.why}</p>
            )}
          </article>
        );
      })}
    </section>
  );
}

export default function Preparation({ tp, st, onAnswer, onNext }: Props) {
  const total = prepQuestions(tp).length;
  const nOk = goodPrep(tp, st);
  const complete = preparationComplete(tp, st);
  const p = tp.preparation;

  return (
    <>
      <Side>
        <SideTitle>Préparation de l&apos;opération</SideTitle>
        <Note>
          Activité A1 du référentiel : on ne touche pas encore au matériel. À partir du cahier
          des charges et du schéma, tu identifies chaque organe, puis tu dis à quoi il sert.
          C&apos;est ce travail qui rendra le choix des références évident à l&apos;étape suivante.
        </Note>
        <Card title="Avancement">
          <div className="font-mono-num text-[20px]">{nOk} / {total}</div>
          <Note>réponses justes</Note>
        </Card>
        <Button variant="primary" disabled={!complete} onClick={onNext}>
          {total === 0 ? 'Passer au choix du matériel' : 'Valider la préparation'}
        </Button>
      </Side>

      <Center>
        <div className="flex w-full max-w-[780px] flex-col gap-5">
          {!p && (
            <Note>
              Ce TP n&apos;a pas encore de préparation guidée : passe directement au choix du
              matériel, en t&apos;appuyant sur le cahier des charges.
            </Note>
          )}
          {p && (
            <>
              <Bloc
                titre="1 · Identifier les éléments du schéma"
                consigne="Chaque repère du schéma désigne un organe précis. Retrouve-le."
                questions={p.identification} st={st} onAnswer={onAnswer}
              />
              <Bloc
                titre="2 · Donner la fonction de chaque équipement"
                consigne="Un organe se choisit sur sa fonction, pas sur son allure. Dis ce que chacun fait dans CE montage."
                questions={p.fonctions} st={st} onAnswer={onAnswer}
              />
            </>
          )}
        </div>
      </Center>
    </>
  );
}
