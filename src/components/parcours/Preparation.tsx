'use client';

/**
 * Étape de PRÉPARATION (activité A1 du référentiel).
 *
 * Avant de choisir une référence et avant de poser le premier appareil, l'élève
 * lit le dossier : il reconnaît les organes du schéma sous leur repère, puis dit
 * ce que chacun fait. Deux gestes distincts — identifier n'est pas comprendre —
 * d'où les deux blocs.
 *
 * LE SCHÉMA EST À L'ÉCRAN, en permanence, et l'organe visé par la question en
 * cours s'y entoure d'un cadre. Demander « quel appareil porte le repère Q1 ? »
 * sans montrer le schéma, ce n'est pas préparer une opération, c'est deviner.
 *
 * Comme à l'étape matériel, la justification s'affiche dès que l'élève a
 * répondu, juste ou faux : on n'attend pas la fin du TP pour lui dire pourquoi.
 */

import React from 'react';
import type { AttemptState, PrepQuestion, TpDefinition } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { goodPrep, preparationComplete, prepQuestions } from '@/lib/sim/progress';
import { initialSim } from '@/lib/sim/engine';
import { reseauCommande } from '@/lib/sim/commande';
import SchemaPuissance from '@/components/schema/SchemaPuissance';
import SchemaCommande from '@/components/schema/SchemaCommande';
import { Center, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  onAnswer: (questionId: string, index: number) => void;
  onNext: () => void;
}

/** Bornes du folio qui appartiennent à l'organe désigné : la zone à éclairer. */
function zoneDuRepere(tp: TpDefinition, rep: string | null): string[] {
  if (!rep || !tp.folio) return [];
  const out: string[] = [];
  for (const c of tp.folio.colonnes) {
    for (const el of c.elements) {
      if (el.rep !== rep) continue;
      out.push(el.a);
      if (el.b) out.push(el.b);
    }
  }
  return out;
}

function Bloc({ titre, consigne, questions, st, actif, onAnswer, onActive }: {
  titre: string;
  consigne: string;
  questions: PrepQuestion[];
  st: AttemptState;
  actif: string | null;
  onAnswer: (id: string, i: number) => void;
  onActive: (id: string) => void;
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
        const vise = actif === q.id;
        return (
          <article
            key={q.id}
            onMouseEnter={() => onActive(q.id)}
            onFocusCapture={() => onActive(q.id)}
            className={`rounded-2xl border bg-[var(--surface)] p-3 transition-colors ${
              vise ? 'border-accent' : 'border-[var(--line)]'
            }`}
          >
            <h4 className="flex flex-wrap items-baseline gap-2 text-[16px] font-bold">
              {q.rep && (
                <span className={`rounded-md px-1.5 py-0.5 font-mono-num text-[13px] ${
                  vise ? 'bg-accent text-[#141A21]' : 'bg-[var(--surface-2)]'
                }`}>
                  {q.rep}
                </span>
              )}
              {q.invite}
              {q.focus && (
                <small className="font-sans text-[11px] font-normal text-muted">
                  · repère {q.focus} sur le schéma {q.schema === 'commande' ? 'de commande' : 'de puissance'}
                </small>
              )}
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
                    onClick={() => { onActive(q.id); onAnswer(q.id, i); }}
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
  const questions = prepQuestions(tp);
  const total = questions.length;
  const nOk = goodPrep(tp, st);
  const complete = preparationComplete(tp, st);
  const p = tp.preparation;

  // Question visée : la dernière survolée, sinon la première sans réponse.
  const [actif, setActif] = React.useState<string | null>(null);
  const courante = React.useMemo(() => {
    const parId = questions.find(q => q.id === actif);
    return parId ?? questions.find(q => st.prep?.[q.id] == null) ?? questions[0] ?? null;
  }, [questions, actif, st.prep]);

  /**
   * Réseau du MONTAGE DE RÉFÉRENCE : à la préparation, rien n'est encore câblé.
   * Le folio montre donc l'installation telle qu'elle doit être, pas le travail
   * en cours — c'est un document d'étude, pas un relevé.
   */
  const reseau = React.useMemo(
    () => reseauCommande(
      tp,
      { wires: tp.liaisons.map(l => ({ a: l.a, b: l.b, net: l.net })), fault: null },
      { ...initialSim(), q1: true, f2: true, f3: true },
      { marcheMaintenue: false },
    ),
    [tp],
  );

  const surCommande = courante?.schema === 'commande';
  const focus = courante?.focus ?? null;
  const zone = React.useMemo(
    () => (surCommande ? zoneDuRepere(tp, focus) : []),
    [tp, surCommande, focus],
  );

  return (
    <>
      <Side>
        <SideTitle>Préparation de l&apos;opération</SideTitle>
        <Note>
          Activité A1 du référentiel : on ne touche pas encore au matériel. À partir du cahier
          des charges et des schémas affichés, tu identifies chaque organe, puis tu dis à quoi il
          sert. C&apos;est ce travail qui rendra le choix des références évident à l&apos;étape
          suivante.
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
        <div className="flex w-full max-w-[860px] flex-col gap-5">
          {(tp.puissance || tp.folio) && (
            <div className="sticky top-0 z-10 -mx-1 max-h-[46vh] overflow-y-auto bg-[var(--app)] px-1 pb-2 pt-1">
              {surCommande && tp.folio
                ? <SchemaCommande tp={tp} reseau={reseau} zone={zone} focusRep={focus} />
                : <SchemaPuissance tp={tp} focus={focus} />}
              {courante?.focus && (
                <p className="m-0 mt-1 text-[11.5px] text-muted">
                  Question en cours : repère <b className="text-accent">{courante.focus}</b>,
                  encadré sur le schéma.
                </p>
              )}
            </div>
          )}

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
                consigne="Chaque repère du schéma désigne un organe précis. Retrouve-le sur le schéma affiché au-dessus."
                questions={p.identification} st={st} actif={actif}
                onAnswer={onAnswer} onActive={setActif}
              />
              <Bloc
                titre="2 · Donner la fonction de chaque équipement"
                consigne="Un organe se choisit sur sa fonction, pas sur son allure. Dis ce que chacun fait dans CE montage."
                questions={p.fonctions} st={st} actif={actif}
                onAnswer={onAnswer} onActive={setActif}
              />
            </>
          )}
        </div>
      </Center>
    </>
  );
}
