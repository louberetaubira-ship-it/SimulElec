'use client';

/**
 * Grille d'évaluation par compétences, affichée à la fin du TP.
 * Les scores par étape (`stageScores`) sont traduits en compétences du diplôme
 * préparé par `evaluate()` (voir `src/lib/data/competences.ts`).
 */

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import {
  COMPETENCES, DOMAIN_LABEL, masteryGap, type CompetenceEval, type DiplomaId, type Mastery,
} from '@/lib/data/competences';
import { buildEvaluation, buildReport, stageScores, STAGES } from '@/lib/sim/progress';
import { diplomaName, diplomaShort, type Student } from '@/lib/student';

const MASTERY_LABEL: Record<Mastery, string> = {
  acquis: 'Acquis',
  enCours: 'En cours d’acquisition',
  nonAcquis: 'Non acquis',
  nonEvalue: 'Non évalué',
};

const MASTERY_TONE: Record<Mastery, { bar: string; chip: string }> = {
  acquis: { bar: 'bg-good', chip: 'bg-good/15 text-good border-good/40' },
  enCours: { bar: 'bg-accent', chip: 'bg-accent/15 text-warn border-accent/40' },
  nonAcquis: { bar: 'bg-crit', chip: 'bg-crit/15 text-crit border-crit/40' },
  nonEvalue: { bar: 'bg-[var(--line)]', chip: 'bg-[var(--surface-2)] text-muted border-[var(--line)]' },
};

function Ligne({ c, criteria }: { c: CompetenceEval; criteria: string[] }) {
  const tone = MASTERY_TONE[c.mastery];
  const pct = Math.round(c.score * 100);
  const self = c.self;
  const gap = masteryGap(self, c.mastery);
  return (
    <details className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 open:bg-[var(--surface)]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
        <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono-num text-[11px] font-semibold text-[var(--app)]">
          {c.code}
        </span>
        <span className="min-w-[10ch] flex-1 text-[12.5px] font-medium leading-snug">{c.label}</span>
        {self && (
          <span
            data-self-level={self}
            title="Ton estimation"
            className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${MASTERY_TONE[self].chip} opacity-80`}
          >
            Toi : {MASTERY_LABEL[self]}
          </span>
        )}
        <span
          data-computed-level={c.mastery}
          title={self ? 'Résultat calculé' : undefined}
          className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${tone.chip}`}
        >
          {self ? 'Calculé : ' : ''}{MASTERY_LABEL[c.mastery]}
        </span>
        {gap != null && gap !== 0 && (
          <span className="text-[10.5px] font-semibold text-muted">
            {gap > 0 ? '↓ tu t’es sur-estimé' : '↑ tu t’es sous-estimé'}
          </span>
        )}
        <span className="flex w-full items-center gap-2 sm:w-[180px]">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <span className={`block h-full ${tone.bar}`} style={{ width: `${pct}%` }} />
          </span>
          <span className="w-[38px] text-right font-mono-num text-[11.5px]">{pct} %</span>
        </span>
      </summary>
      <div className="mt-2 border-t border-[var(--line)] pt-2">
        <p className="m-0 text-[11px] uppercase tracking-[.06em] text-muted">
          Domaines mobilisés : {c.domains.map(d => DOMAIN_LABEL[d]).join(' · ')}
        </p>
        <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
          {criteria.map(x => (
            <li key={x} className="flex gap-1.5 text-[12px] leading-relaxed">
              <span aria-hidden className="text-muted">•</span><span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

interface Props {
  tp: TpDefinition;
  /** Référentiel d'évaluation ; par défaut celui du profil de l'élève. */
  diploma?: DiplomaId;
  /** Parcours platine : la grille et les scores sont calculés à partir de l'état. */
  st?: AttemptState;
  student: Student;
  /** Parcours de dimensionnement : grille déjà calculée (`evaluate(diploma, PV_STAGE_DOMAINS, …)`). */
  evaluation?: CompetenceEval[] | null;
  /** Score 0..1 par étape (fourni avec `evaluation`). */
  scores?: (number | undefined)[];
  /** Libellés des étapes ; par défaut ceux du parcours platine. */
  stageLabels?: readonly string[];
  /** Ouvertures de l'aide par étape ; par défaut celles de `st`. */
  helpUsed?: Record<number, number>;
  /** Note globale sur 100 ; par défaut celle du rapport platine. */
  score?: number;
  /** Envoi de l'évaluation au professeur (persistance sur la tentative). */
  onSend?: () => void;
  sent?: boolean;
  offline?: boolean;
}

export default function Evaluation({
  tp, st, student, diploma: diplomaProp, evaluation: evalProp, scores: scoresProp,
  stageLabels = STAGES, helpUsed: helpProp, score: scoreProp, onSend, sent, offline,
}: Props) {
  const diploma = diplomaProp ?? student.diploma;
  const sheet = React.useRef<HTMLElement>(null);

  /** Impression : on déplie les critères, on imprime, puis on referme. */
  const print = React.useCallback(() => {
    const opened: HTMLDetailsElement[] = [];
    sheet.current?.querySelectorAll('details').forEach(d => {
      if (!d.open) { d.open = true; opened.push(d); }
    });
    const restore = () => {
      opened.forEach(d => { d.open = false; });
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }, []);

  const evaluation = React.useMemo(
    () => (evalProp !== undefined ? evalProp : st ? buildEvaluation(tp, st, diploma) : null),
    [evalProp, st, tp, diploma],
  );
  const scores = React.useMemo(
    () => scoresProp ?? (st ? stageScores(tp, st) : []),
    [scoresProp, st, tp],
  );
  const score = React.useMemo(
    () => (scoreProp !== undefined ? scoreProp : st ? buildReport(tp, st, student).score : 0),
    [scoreProp, st, tp, student],
  );
  const help = helpProp ?? st?.helpUsed ?? {};
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  if (!evaluation) {
    return (
      <p className="text-[12.5px] text-muted">
        Ce TP n&apos;est pas encore jouable de bout en bout : aucune évaluation par compétences n&apos;est produite.
      </p>
    );
  }

  const criteria = COMPETENCES[diploma];
  const acquis = evaluation.filter(c => c.mastery === 'acquis').length;
  const autoEvaluees = evaluation.filter(c => c.self);
  const ecarts = autoEvaluees.map(c => masteryGap(c.self, c.mastery) ?? 0);
  const justes = ecarts.filter(g => g === 0).length;
  const surEstimes = ecarts.filter(g => g > 0).length;
  const sousEstimes = ecarts.filter(g => g < 0).length;

  return (
    <article
      ref={sheet}
      data-evaluation
      className="print-sheet flex w-full max-w-[860px] flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
    >
      <header className="border-b border-[var(--line)] pb-3">
        <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
          Évaluation par compétences
        </div>
        <h2 className="mt-1 text-[22px] font-bold leading-tight sm:text-[26px]">{tp.title}</h2>
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-2">
          <div className="flex gap-1.5"><dt className="text-muted">Élève :</dt><dd className="m-0 font-medium">{student.name}</dd></div>
          <div className="flex gap-1.5"><dt className="text-muted">Diplôme :</dt><dd className="m-0 font-medium">{diplomaShort(diploma)}</dd></div>
          <div className="flex gap-1.5"><dt className="text-muted">Établissement :</dt><dd className="m-0">{student.etablissement || '—'}</dd></div>
          <div className="flex gap-1.5"><dt className="text-muted">Date :</dt><dd className="m-0 font-mono-num">{date}</dd></div>
        </dl>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
          Référentiel : {diplomaName(diploma)}. {acquis} compétence{acquis > 1 ? 's' : ''} sur{' '}
          {evaluation.length} au niveau « acquis ». Score global du TP : {score} / 100.
        </p>
      </header>

      {autoEvaluees.length > 0 && (
        <section
          data-ecart
          className="rounded-xl border border-accent/40 bg-accent/10 p-2.5 text-[12px] leading-relaxed"
        >
          <b className="block text-[12.5px]">Ton estimation et le résultat calculé</b>
          Tu t&apos;es placé juste sur <b>{justes}</b> compétence{justes > 1 ? 's' : ''} sur{' '}
          {autoEvaluees.length}
          {surEstimes > 0 && <>, sur-estimé sur <b>{surEstimes}</b></>}
          {sousEstimes > 0 && <>, sous-estimé sur <b>{sousEstimes}</b></>}.{' '}
          {surEstimes > sousEstimes
            ? 'Reprends les critères de réussite des compétences en écart : ce sont eux qui font la différence.'
            : sousEstimes > surEstimes
              ? 'Tu vaux mieux que ce que tu crois : fais-toi confiance au prochain TP.'
              : 'Ton regard sur ton travail est juste : c’est une compétence de professionnel.'}
        </section>
      )}

      <div className="flex flex-col gap-1.5">
        {evaluation.map(c => (
          <Ligne key={c.code} c={c} criteria={criteria.find(x => x.code === c.code)?.criteria ?? []} />
        ))}
      </div>

      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
        <h3 className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
          Détail par étape
        </h3>
        <div className="grid gap-1 sm:grid-cols-2">
          {scores.map((v, i) => (
            <div key={stageLabels[i] ?? i} className="flex items-center gap-2 text-[11.5px]">
              <span className="flex-1 truncate">{i + 1}. {stageLabels[i]}</span>
              {(help[i] ?? 0) > 0 && (
                <span className="text-[10.5px] text-muted">💡 {help[i]}</span>
              )}
              <span className="w-[46px] text-right font-mono-num">
                {v == null ? '—' : `${Math.round(v * 100)} %`}
              </span>
            </div>
          ))}
        </div>
        <p className="m-0 mt-2 text-[11px] leading-relaxed text-muted">
          Chaque ouverture d&apos;un rappel de cours retire 0,1 au score de l&apos;étape (plancher 0,3 si
          l&apos;étape est réussie). Acquis ≥ 75 %, en cours ≥ 40 %.
        </p>
      </section>

      <div className="no-print flex flex-col gap-1.5 sm:flex-row">
        <button
          type="button"
          data-print
          onClick={print}
          className="min-h-touch flex-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[12.5px] font-semibold"
        >
          Imprimer / PDF
        </button>
        {onSend && (
          <button
            type="button"
            data-send-eval
            onClick={onSend}
            disabled={sent || offline}
            className="min-h-touch flex-1 rounded-[10px] border border-good bg-good px-3 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
          >
            {sent ? 'Évaluation envoyée ✓' : offline ? 'Hors-ligne : envoi impossible' : 'Envoyer au professeur'}
          </button>
        )}
      </div>
    </article>
  );
}
