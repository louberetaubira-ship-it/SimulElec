'use client';

/**
 * TD et Évaluations interactifs, un seul moteur, deux modes.
 *  - TD : « Vérifier » question par question, correction + explication immédiates, on peut réessayer.
 *  - Éval : on répond à tout, « Valider l’évaluation » calcule le niveau par compétence
 *    (échelle 7 niveaux) et liste points forts / points de vigilance.
 * Sans écriture en base : l’exercice se joue côté client (comme un entraînement).
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { niveauOf, NIVEAU_TP, NIVEAU_COLOR, NIVEAU_ON, type Niveau } from '@/lib/data/competences';
import {
  normaliseTexte,
  type ExerciceContenu,
  type Question,
} from '@/lib/data/ressources-exercices';

const COULEUR = { td: '#7C3AED', eval: '#DC2626' } as const;

function estCorrecte(q: Question, rep: string | number | boolean | null): boolean {
  if (rep === null || rep === undefined) return false;
  if (q.type === 'qcm') return rep === q.bonne;
  if (q.type === 'vraifaux') return rep === q.bonne;
  // texte
  const attendu = [String(q.bonne), ...(q.accepte ?? [])].map(normaliseTexte);
  return attendu.includes(normaliseTexte(String(rep)));
}

export default function ExerciceView({ ex }: { ex: ExerciceContenu }) {
  const couleur = COULEUR[ex.type];
  const [reponses, setReponses] = useState<Record<string, string | number | boolean | null>>({});
  /** En TD : questions dont la correction a été demandée. En Éval : rempli d'un coup à la validation. */
  const [verifiees, setVerifiees] = useState<Set<string>>(new Set());
  const [soumis, setSoumis] = useState(false);

  const setRep = (id: string, v: string | number | boolean) =>
    setReponses((r) => ({ ...r, [id]: v }));

  const verifierUne = (id: string) => setVerifiees((s) => new Set(s).add(id));

  const total = ex.questions.length;
  const nbRepondu = ex.questions.filter((q) => reponses[q.id] !== undefined && reponses[q.id] !== null && reponses[q.id] !== '').length;

  // Bilan par compétence (utilisé en Éval après soumission).
  const bilan = useMemo(() => {
    const parComp = new Map<string, { ok: number; tot: number }>();
    ex.questions.forEach((q) => {
      const e = parComp.get(q.competence) ?? { ok: 0, tot: 0 };
      e.tot += 1;
      if (estCorrecte(q, reponses[q.id] ?? null)) e.ok += 1;
      parComp.set(q.competence, e);
    });
    return Array.from(parComp.entries()).map(([comp, { ok, tot }]) => {
      const score = tot ? ok / tot : 0;
      const niveau = niveauOf(score, true) as Niveau;
      return { comp, ok, tot, score, niveau };
    }).sort((a, b) => a.comp.localeCompare(b.comp));
  }, [ex.questions, reponses]);

  const noteGlobale = ex.questions.reduce((n, q) => n + (estCorrecte(q, reponses[q.id] ?? null) ? 1 : 0), 0);
  const forces = bilan.filter((b) => b.score >= 0.75);
  const vigilances = bilan.filter((b) => b.score < 0.60);

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8">
      <Link href="/ressources" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-[#141A21]">← Ressources</Link>

      <header className="mb-6 rounded-2xl border border-line p-5" style={{ background: `${couleur}0D` }}>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.05em] text-white" style={{ background: couleur }}>
            {ex.type === 'td' ? 'TD' : 'Évaluation'}
          </span>
          <span className="text-[12px] uppercase tracking-[.06em] text-muted">{ex.sousTitre}</span>
        </div>
        <h1 className="mt-2 font-title text-[24px] font-bold leading-tight text-[#141A21]">{ex.titre}</h1>
        <p className="mt-2 text-[14px] text-[#2A333D]">{ex.intro}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-muted">⏱ {ex.duree}</span>
          {ex.competences.map((c) => (
            <span key={c} className="rounded-full border border-line bg-white px-2.5 py-0.5 font-medium text-[#2A333D]">{c}</span>
          ))}
        </div>
      </header>

      {/* Bilan Éval en tête après soumission */}
      {ex.type === 'eval' && soumis && (
        <div className="mb-6 rounded-2xl border border-line p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-title text-[18px] font-bold text-[#141A21]">Résultat par compétence</h2>
            <span className="text-[13px] text-muted">Note : <b className="text-[#141A21]">{noteGlobale}/{total}</b></span>
          </div>
          <div className="mt-3 space-y-2">
            {bilan.map((b) => (
              <div key={b.comp} className="flex items-center gap-3">
                <span className="w-10 shrink-0 font-mono text-[13px] font-semibold">{b.comp}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(b.score * 100)}%`, background: NIVEAU_COLOR[b.niveau] }} />
                </div>
                <span className="w-[150px] shrink-0 rounded-full px-2 py-0.5 text-right text-[11px] font-semibold"
                  style={{ background: NIVEAU_COLOR[b.niveau], color: NIVEAU_ON[b.niveau] }}>
                  {NIVEAU_TP[b.niveau]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-good/40 bg-good/5 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[.05em] text-good">Points forts</p>
              {forces.length ? (
                <ul className="mt-1 list-disc pl-5 text-[13px] text-[#2A333D]">{forces.map((f) => <li key={f.comp}>{f.comp} — {NIVEAU_TP[f.niveau].toLowerCase()}</li>)}</ul>
              ) : <p className="mt-1 text-[13px] text-muted">À consolider sur l’ensemble.</p>}
            </div>
            <div className="rounded-xl border border-warn/40 bg-warn/5 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[.05em] text-warn">Points de vigilance</p>
              {vigilances.length ? (
                <ul className="mt-1 list-disc pl-5 text-[13px] text-[#2A333D]">{vigilances.map((v) => <li key={v.comp}>{v.comp} — à retravailler (revois le cours et le TD)</li>)}</ul>
              ) : <p className="mt-1 text-[13px] text-muted">Aucun point bloquant. Beau travail.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <ol className="space-y-4">
        {ex.questions.map((q, i) => {
          const rep = reponses[q.id] ?? null;
          const montreCorrection = ex.type === 'td' ? verifiees.has(q.id) : soumis;
          const ok = estCorrecte(q, rep);
          return (
            <li key={q.id} className="rounded-2xl border border-line bg-[var(--surface)] p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: couleur }}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-[14.5px] font-medium text-[#141A21]">{q.enonce}
                    <span className="ml-2 rounded-full border border-line px-1.5 py-0.5 align-middle text-[10.5px] font-semibold text-muted">{q.competence}</span>
                  </p>

                  {/* Saisie */}
                  <div className="mt-3">
                    {q.type === 'qcm' && (
                      <div className="grid gap-1.5">
                        {q.options!.map((opt, j) => {
                          const choisi = rep === j;
                          const bonReponse = montreCorrection && j === q.bonne;
                          const mauvais = montreCorrection && choisi && j !== q.bonne;
                          return (
                            <button key={j} type="button" disabled={montreCorrection && ex.type === 'td' ? false : soumis}
                              onClick={() => !soumis && setRep(q.id, j)}
                              className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-[13.5px] transition ${
                                bonReponse ? 'border-good bg-good/10 text-[#141A21]'
                                : mauvais ? 'border-crit bg-crit/10 text-[#141A21]'
                                : choisi ? 'border-2 text-[#141A21]' : 'border-line text-[#2A333D] hover:bg-[var(--surface-2)]'}`}
                              style={choisi && !montreCorrection ? { borderColor: couleur } : undefined}>
                              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border" style={{ borderColor: choisi ? couleur : '#C7CDD6' }}>
                                {choisi && <span className="h-2 w-2 rounded-full" style={{ background: couleur }} />}
                              </span>
                              {opt}
                              {bonReponse && <span className="ml-auto text-good">✓</span>}
                              {mauvais && <span className="ml-auto text-crit">✗</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {q.type === 'vraifaux' && (
                      <div className="flex gap-2">
                        {[true, false].map((val) => {
                          const choisi = rep === val;
                          const bonReponse = montreCorrection && val === q.bonne;
                          const mauvais = montreCorrection && choisi && val !== q.bonne;
                          return (
                            <button key={String(val)} type="button" onClick={() => !soumis && setRep(q.id, val)}
                              className={`rounded-[10px] border px-5 py-2 text-[13.5px] font-medium transition ${
                                bonReponse ? 'border-good bg-good/10' : mauvais ? 'border-crit bg-crit/10'
                                : choisi ? 'border-2' : 'border-line hover:bg-[var(--surface-2)]'}`}
                              style={choisi && !montreCorrection ? { borderColor: couleur } : undefined}>
                              {val ? 'Vrai' : 'Faux'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {q.type === 'texte' && (
                      <input value={rep === null ? '' : String(rep)} disabled={soumis}
                        onChange={(e) => setRep(q.id, e.target.value)}
                        placeholder="ta réponse…"
                        className={`w-full max-w-[280px] rounded-[10px] border px-3 py-2 text-[13.5px] ${
                          montreCorrection ? (ok ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : 'border-line'}`} />
                    )}
                  </div>

                  {/* Correction */}
                  {montreCorrection && (
                    <div className={`mt-3 rounded-[10px] border-l-[3px] px-3 py-2 text-[13px] ${ok ? 'border-good bg-good/5' : 'border-crit bg-crit/5'}`}>
                      <b className={ok ? 'text-good' : 'text-crit'}>{ok ? 'Correct.' : 'À revoir.'}</b> {q.explication}
                    </div>
                  )}

                  {/* Bouton Vérifier (TD seulement) */}
                  {ex.type === 'td' && !verifiees.has(q.id) && (
                    <button type="button" disabled={rep === null || rep === ''} onClick={() => verifierUne(q.id)}
                      className="mt-3 rounded-[10px] border px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
                      style={{ background: couleur, borderColor: couleur }}>
                      Vérifier
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Pied : validation Éval / relance TD */}
      <div className="mt-6">
        {ex.type === 'eval' && !soumis && (
          <button type="button" disabled={nbRepondu < total} onClick={() => setSoumis(true)}
            className="rounded-[12px] border px-6 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
            style={{ background: couleur, borderColor: couleur }}>
            Valider l’évaluation {nbRepondu < total && <span className="opacity-80">({nbRepondu}/{total} répondu)</span>}
          </button>
        )}
        {ex.type === 'eval' && soumis && (
          <button type="button" onClick={() => { setSoumis(false); setReponses({}); }}
            className="rounded-[12px] border border-line px-6 py-2.5 text-[14px] font-semibold text-[#141A21]">
            Recommencer
          </button>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-[var(--surface-2)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted">Intention pédagogique</p>
        <p className="mt-1 text-[13px] text-[#2A333D]">{ex.pedagogie}</p>
      </div>
    </div>
  );
}
