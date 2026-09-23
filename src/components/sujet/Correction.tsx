'use client';
/**
 * Copie corrigée : question par question, réponse de l'élève, score, juste / faux / partiel,
 * détail, message d'erreur typique et pages DTR.
 *  - Élève : la réponse attendue et l'explication ne s'affichent que si le corrigé est PUBLIÉ
 *    (`corrige`, servi par `GET /api/sujet/solution`) ; sinon l'encart « 🔒 Corrigé non publié ».
 *    Les aides graduées restent disponibles (`aides`).
 *  - Professeur : corrigé toujours visible, erreurs typiques reconnues, note 0..1 et annotation.
 * Le sujet reçu est PUBLIC (sans corrigé) : le corrigé arrive à part.
 */
import { useState, type ReactNode } from 'react';
import type { CorrectionQuestion, SujetAttemptState } from '@/lib/sujet/types';
import type { CorrigeSujet, QuestionPublique, SujetPublic } from '@/lib/sujet/public';
import { texteReponsePublique } from '@/lib/sujet/public';
import type { EtatCorrige } from '@/lib/sujet/store';
import { nomsPagesDtr } from '@/lib/sujet/dtr';
import { LIBELLE_OUTIL, repere } from '@/lib/sujet/format';
import { fmtNombre } from '@/lib/sujet/normalize';
import { CorrigeVerrouille } from './Aides';
import Texte from './Texte';

type Filtre = 'toutes' | 'aValider' | 'fausses' | 'sansReponse';

interface Props {
  sujet: SujetPublic;
  st: SujetAttemptState;
  /** Corrigé (réponses attendues + explications) : publié (élève) ou toujours (professeur). */
  corrige: CorrigeSujet | null;
  /** Élève : état du chargement du corrigé. */
  corrigeEtat?: EtatCorrige;
  /** Élève : aides graduées d'une question (débloquées une par une). */
  aides?: (num: number, total: number) => ReactNode;
  /** Vue professeur : notation des réponses rédigées et annotations. */
  prof?: {
    onNote: (num: number, score: number) => void;
    onAnnotation: (num: number, texte: string) => void;
  };
  /** Vue élève : rouvrir une question (lecture seule) avec son DTR. */
  onRevoir?: (num: number) => void;
}

const STATUT: Record<CorrectionQuestion['statut'], { t: string; cls: string }> = {
  auto: { t: 'Corrigée', cls: 'bg-surface2 text-muted' },
  aValider: { t: 'À valider par le professeur', cls: 'bg-accent/20 text-accent-ink' },
  prof: { t: 'Notée par le professeur', cls: 'bg-[#E8F0FF] text-[#1F4FA3]' },
  sansReponse: { t: 'Sans réponse', cls: 'bg-[#FDE8E6] text-[#9B1C1C]' },
};

const couleurScore = (s: number) => (s >= 0.999 ? 'text-good' : s > 0 ? 'text-warn' : 'text-crit');

export default function Correction({ sujet, st, prof, onRevoir, corrige, corrigeEtat, aides }: Props) {
  const [filtre, setFiltre] = useState<Filtre>(prof ? 'aValider' : 'toutes');
  const passe = (f: Filtre, q: QuestionPublique) => {
    const c = st.corrections[q.num];
    if (f === 'aValider') return c?.statut === 'aValider' || c?.statut === 'prof' || q.type === 'redige';
    if (f === 'fausses') return !!c && c.statut !== 'sansReponse' && c.score < 0.999;
    if (f === 'sansReponse') return !c || c.statut === 'sansReponse';
    return true;
  };
  const garder = (q: QuestionPublique) => passe(filtre, q);
  const compte = (f: Filtre) => sujet.questions.filter(q => passe(f, q)).length;
  const FILTRES: { id: Filtre; t: string }[] = [
    { id: 'toutes', t: 'Toutes' },
    { id: 'aValider', t: 'Rédigées / à valider' },
    { id: 'fausses', t: 'Fausses ou partielles' },
    { id: 'sansReponse', t: 'Sans réponse' },
  ];

  return (
    <div className="space-y-4" data-correction>
      <div className="flex flex-wrap gap-1 print:hidden">
        {FILTRES.map(f => (
          <button key={f.id} type="button" onClick={() => setFiltre(f.id)} data-filtre={f.id}
            className={`min-h-[34px] rounded-lg border px-3 text-[12.5px] font-semibold ${filtre === f.id ? 'border-[#1B222C] bg-[#1B222C] text-white' : 'border-line bg-surface'}`}>
            {f.t} <span className="opacity-70">({compte(f.id)})</span>
          </button>
        ))}
      </div>

      {sujet.parties.map(p => {
        const qs = sujet.questions.filter(q => q.partie === p.num && garder(q));
        if (!qs.length) return null;
        return (
          <section key={p.num}>
            <h3 className="mb-2 font-title text-[18px] font-bold">Partie {p.num} · {p.titre}</h3>
            <div className="space-y-2">
              {qs.map(q => {
                const c = st.corrections[q.num];
                const score = c?.score ?? 0;
                const statut = STATUT[c?.statut ?? 'sansReponse'];
                const rep = texteReponsePublique(q, st.reponses[q.num]);
                const cq = corrige?.questions[q.num];
                const juste = !!c && score >= 0.999 && c.statut !== 'aValider';
                return (
                  <article key={q.num} className="break-inside-avoid rounded-xl border border-line bg-surface p-3" data-copie-question={q.num}>
                    <header className="mb-1.5 flex flex-wrap items-center gap-2">
                      <b className="font-title text-[17px]">{repere(q)}</b>
                      <span className="rounded-full border border-[#B9CDF5] bg-[#E8F0FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.05em] text-[#1F4FA3]">{LIBELLE_OUTIL[q.type]}</span>
                      <span className="text-[11.5px] text-muted">{q.competence}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statut.cls}`}>{statut.t}</span>
                      <span className="flex-1" />
                      <span className={`font-mono text-[14px] font-bold ${couleurScore(score)}`} data-score-question>
                        {fmtNombre(Math.round(score * q.points * 100) / 100, 2)} / {fmtNombre(q.points)} pt{q.points > 1 ? 's' : ''}
                      </span>
                    </header>
                    <p className="mb-2 line-clamp-3 text-[13px] text-[#2A333D]"><Texte>{q.enonce}</Texte></p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-lg border border-line bg-app p-2">
                        <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[.06em] text-muted">Réponse de l’élève</div>
                        {rep.length ? rep.map((l, i) => <div key={i} className="whitespace-pre-wrap text-[12.5px]">{l}</div>) : <div className="text-[12.5px] italic text-muted">—</div>}
                      </div>
                      {cq ? (
                        <div className="rounded-lg border border-good/30 bg-good/[.06] p-2" data-attendu>
                          <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[.06em] text-good">{prof ? 'Réponse attendue' : 'Corrigé'}</div>
                          {cq.attendu.map((l, i) => <div key={i} className="whitespace-pre-wrap text-[12.5px]">{l}</div>)}
                          {cq.corrigeImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cq.corrigeImage.src} alt={cq.corrigeImage.alt} className="mt-1 max-h-[260px] rounded border border-line bg-white" />
                          )}
                        </div>
                      ) : corrigeEtat === 'chargement' ? (
                        <div className="rounded-lg border border-dashed border-line p-2 text-[12.5px] text-muted">Corrigé…</div>
                      ) : <CorrigeVerrouille />}
                    </div>
                    {c?.detail && <p className="mt-1.5 text-[12px] text-muted">{c.detail}</p>}
                    {c?.message && !juste && (
                      <p className="mt-1 rounded-lg bg-[#FDE8E6] px-2 py-1 text-[12.5px] text-[#8F231C]" data-message-erreur><b>Erreur repérée :</b> <Texte>{c.message}</Texte></p>
                    )}
                    {prof && c?.erreurs?.length ? (
                      <p className="mt-1 text-[12px] text-muted" data-erreurs-typiques>Erreur{c.erreurs.length > 1 ? 's' : ''} typique{c.erreurs.length > 1 ? 's' : ''} reconnue{c.erreurs.length > 1 ? 's' : ''} : <b>{c.erreurs.join(', ')}</b></p>
                    ) : null}
                    {cq?.explication && <p className="mt-1 text-[12.5px]"><b>Explication :</b> <Texte>{cq.explication}</Texte></p>}
                    {!prof && aides && !juste && <div className="mt-1.5 print:hidden">{aides(q.num, q.nbAides)}</div>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                      <span>{q.dtr.length ? `${sujet.dtr.some(p => p.doc != null) ? nomsPagesDtr(sujet, q.dtr) : `DTR ${q.dtr.join(', ')}`} · ` : ''}sujet p. {q.pageSujet}</span>
                      {onRevoir && (
                        <button type="button" onClick={() => onRevoir(q.num)} className="rounded-md border border-line px-2 py-0.5 font-semibold text-ink hover:border-accent print:hidden">
                          Revoir la question
                        </button>
                      )}
                    </div>
                    {!prof && st.annotations[q.num] && (
                      <p className="mt-1.5 rounded-lg bg-[#E8F0FF] px-2 py-1 text-[12.5px] text-[#1F3A6B]"><b>Professeur :</b> {st.annotations[q.num]}</p>
                    )}
                    {prof && <NoteProf q={q} c={c} annotation={st.annotations[q.num] ?? ''} {...prof} />}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function NoteProf({ q, c, annotation, onNote, onAnnotation }: {
  q: QuestionPublique; c: CorrectionQuestion | undefined; annotation: string;
  onNote: (num: number, score: number) => void; onAnnotation: (num: number, t: string) => void;
}) {
  const score = c?.score ?? 0;
  return (
    <div className="mt-2 rounded-lg border border-[#B9CDF5] bg-[#F3F7FF] p-2" data-note-prof={q.num}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-semibold text-[#1F3A6B]">Note du professeur</span>
        {[0, 0.5, 1].map(v => (
          <button key={v} type="button" onClick={() => onNote(q.num, v)} data-note={v}
            className={`min-h-[32px] min-w-[40px] rounded-md border px-2 font-mono text-[13px] font-bold ${c?.statut === 'prof' && Math.abs(score - v) < 1e-6 ? 'border-[#1F4FA3] bg-[#1F4FA3] text-white' : 'border-line bg-white'}`}>
            {v === 0.5 ? '½' : v}
          </button>
        ))}
        <input type="range" min={0} max={1} step={0.25} value={score} onChange={e => onNote(q.num, Number(e.target.value))}
          aria-label={`Note de la question ${repere(q)}`} className="w-[120px] accent-[#1F4FA3]" />
        <span className="font-mono text-[12px]">{fmtNombre(Math.round(score * q.points * 100) / 100, 2)} / {fmtNombre(q.points)}</span>
      </div>
      <textarea value={annotation} onChange={e => onAnnotation(q.num, e.target.value)} rows={2} placeholder="Annotation pour l’élève (facultatif)"
        className="mt-1.5 w-full rounded-md border border-line bg-white px-2 py-1 text-[12.5px]" aria-label={`Annotation de la question ${repere(q)}`} />
    </div>
  );
}
