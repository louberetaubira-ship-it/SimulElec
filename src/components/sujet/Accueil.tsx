'use client';
/**
 * Écran d'accueil d'un sujet numérique : page de garde fidèle (consignes, problématique,
 * parties), choix du mode (sauf mode imposé par le professeur) et reprise d'une copie
 * en cours.
 */
import { useState } from 'react';
import Link from 'next/link';
import { estRepondue } from '@/lib/sujet/correction';
import { fmtDuree, useSujet } from '@/lib/sujet/store';
import type { SujetMode } from '@/lib/sujet/types';
import Texte from './Texte';
import { BOUTON_FORT } from './outils';

export default function Accueil({ onEntrer, lienProf }: { onEntrer: () => void; lienProf?: string | null }) {
  const sujet = useSujet(s => s.sujet)!;
  const st = useSujet(s => s.st);
  const modeImpose = useSujet(s => s.modeImpose);
  const demarrer = useSujet(s => s.demarrer);
  const [mode, setMode] = useState<SujetMode>(modeImpose ?? st.mode);
  const enCours = !!st.debut;
  const nbRep = sujet.questions.filter(q => estRepondue(q, st.reponses[q.num])).length;
  const garde = sujet.pagesSujet[0];
  const intervalle = (p: number) => {
    const qs = sujet.questions.filter(q => q.partie === p).map(q => q.num);
    return qs.length ? `Q${Math.min(...qs)} à Q${Math.max(...qs)}` : '';
  };

  const lancer = () => { if (!enCours) demarrer(mode); onEntrer(); };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6" data-accueil>
      <Link href="/tp" className="mb-3 inline-flex text-[13px] font-medium text-muted hover:text-ink">← Catalogue</Link>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <header>
            <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">Sujet d’examen numérique · {sujet.sousTitre}</div>
            <h1 className="font-title text-[34px] font-bold leading-tight">{sujet.titre}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
              <span className="rounded-full bg-surface2 px-2.5 py-0.5 font-semibold">⏱ {fmtDuree(sujet.dureeMin * 60)}</span>
              <span className="rounded-full bg-surface2 px-2.5 py-0.5 font-semibold">{sujet.questions.length} questions</span>
              <span className="rounded-full bg-surface2 px-2.5 py-0.5 font-semibold">{sujet.parties.length} parties</span>
              <span className="rounded-full bg-surface2 px-2.5 py-0.5 font-semibold">DTR {sujet.dtr.length} pages</span>
            </div>
          </header>

          {sujet.consignes.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-4">
              <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Consignes</h2>
              <ul className="list-disc space-y-0.5 pl-5 text-[13.5px]">{sujet.consignes.map((c, i) => <li key={i}><Texte>{c}</Texte></li>)}</ul>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Problématique</h2>
            <p className="text-[13.5px] leading-relaxed"><Texte>{sujet.problematique}</Texte></p>
          </section>

          <section className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="bg-surface2 text-left text-[11px] uppercase tracking-[.05em] text-muted">
                  <th className="px-3 py-2">Partie</th><th className="px-3 py-2">Objectifs</th><th className="px-3 py-2">Compétences</th><th className="px-3 py-2">Questions</th>
                </tr>
              </thead>
              <tbody>
                {sujet.parties.map(p => (
                  <tr key={p.num} className="border-t border-line align-top">
                    <td className="px-3 py-2"><b>{p.num}</b> · {p.titre}</td>
                    <td className="px-3 py-2 text-muted">{p.objectifs.join(' ; ')}</td>
                    <td className="px-3 py-2 font-mono text-[12px]">{p.competences.join(' ')}</td>
                    <td className="whitespace-nowrap px-3 py-2">{intervalle(p.num)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="space-y-4">
          {garde && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={garde.src} alt={`Page de garde du sujet — ${garde.titre}`} className="w-full rounded-xl border border-line bg-white shadow-panel" />
          )}
        </div>
      </div>

      <section className="mt-5 rounded-2xl lg:sticky lg:bottom-0 border border-line bg-surface/95 p-4 shadow-[0_-6px_24px_rgba(20,26,33,.08)] backdrop-blur" data-choix-mode>
        {enCours ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 text-[14px]">
              <b>Une copie est en cours</b> ({st.mode === 'examen' ? 'mode examen' : 'mode entraînement'}) : {nbRep} / {sujet.questions.length} réponses, question {st.courante},
              {' '}{st.mode === 'examen' ? `${fmtDuree(Math.max(0, sujet.dureeMin * 60 - st.secondesEcoulees))} restantes` : `${fmtDuree(st.secondesEcoulees)} passées`}.
            </div>
            <button type="button" className={BOUTON_FORT} onClick={lancer} data-reprendre>Reprendre ma copie ▸</button>
          </div>
        ) : (
          <div className="space-y-3">
            {modeImpose ? (
              <p className="text-[14px]">Ton professeur impose le <b>mode {modeImpose === 'examen' ? 'examen' : 'entraînement'}</b> pour ce sujet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Mode">
                {([
                  ['entrainement', 'Entraînement', '« Vérifier » après chaque question, indice après une erreur, tu peux corriger. Pas de limite de temps.'],
                  ['examen', 'Examen', `Conditions réelles : chrono ${fmtDuree(sujet.dureeMin * 60)}, aucune correction avant la remise, remise automatique à la fin du temps.`],
                ] as const).map(([id, t, d]) => (
                  <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)} data-choisir-mode={id}
                    className={`rounded-xl border-2 p-3 text-left transition ${mode === id ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-accent/50'}`}>
                    <div className="font-title text-[18px] font-bold">{t}</div>
                    <div className="text-[12.5px] text-muted">{d}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex-1 text-[12.5px] text-muted">Le DTR s’ouvre à côté de chaque question, sur la page où se trouve la réponse. Calculatrice intégrée.</span>
              <button type="button" className={BOUTON_FORT} onClick={lancer} data-commencer>Commencer l’épreuve ▸</button>
            </div>
          </div>
        )}
        {lienProf && (
          <div className="mt-3 border-t border-line pt-2 text-[12.5px]">
            <Link href={lienProf} className="font-semibold underline">Vue professeur : copies des élèves et validation →</Link>
          </div>
        )}
      </section>
    </div>
  );
}
