'use client';
/**
 * Navigation par partie : une pastille par question. États : courante (orange),
 * répondue (vert pâle), juste (vert), à revoir (rouge : fausse ou partielle après
 * correction), marquée par l'élève (drapeau).
 */
import { estRepondue } from '@/lib/sujet/correction';
import { repere, sousSection } from '@/lib/sujet/format';
import { useSujet } from '@/lib/sujet/store';
import type { SujetQuestion } from '@/lib/sujet/types';

export type EtatNav = 'courante' | 'juste' | 'aRevoir' | 'repondue' | 'vide';

export default function NavQuestions({ onChoisir }: { onChoisir?: () => void }) {
  const sujet = useSujet(s => s.sujet);
  const st = useSujet(s => s.st);
  const aller = useSujet(s => s.aller);
  if (!sujet) return null;

  const etat = (num: number): EtatNav => {
    const q = sujet.questions.find(x => x.num === num)!;
    const c = st.corrections[num];
    if (c && c.statut !== 'sansReponse' && (st.remise || st.mode === 'entrainement')) {
      if (c.statut === 'aValider') return 'repondue';
      return c.score >= 0.999 ? 'juste' : 'aRevoir';
    }
    if (st.remise && c?.statut === 'sansReponse') return 'aRevoir';
    return estRepondue(q, st.reponses[num]) ? 'repondue' : 'vide';
  };
  const CLS: Record<EtatNav, string> = {
    courante: '',
    juste: 'border-good bg-good text-white',
    aRevoir: 'border-crit bg-[#FDE8E6] text-[#9B1C1C]',
    repondue: 'border-good bg-[#D7F5E3] text-[#0F5132]',
    vide: 'border-line bg-surface text-ink',
  };

  const pastille = (q: SujetQuestion) => {
    const e = etat(q.num);
    const cour = q.num === st.courante;
    const marque = st.marquees.includes(q.num);
    const r = repere(q);
    return (
      <button
        key={q.num}
        type="button"
        onClick={() => { aller(q.num); onChoisir?.(); }}
        data-nav={q.num}
        data-etat={e}
        aria-current={cour ? 'step' : undefined}
        aria-label={`Question ${r}${marque ? ', marquée à revoir' : ''}`}
        title={q.label ? `${q.label} (question ${q.num})` : undefined}
        className={`relative grid h-[28px] ${q.label ? 'min-w-[34px] px-1.5' : 'w-[34px]'} place-items-center whitespace-nowrap rounded-md border font-mono text-[11.5px] font-semibold transition hover:-translate-y-px ${CLS[e]} ${cour ? 'ring-2 ring-accent ring-offset-1' : ''}`}
      >
        {q.label ?? q.num}
        {marque && <span className="absolute -right-1 -top-1.5 text-[10px]" aria-hidden>🚩</span>}
      </button>
    );
  };

  return (
    <nav aria-label="Questions du sujet" className="space-y-3 text-[12.5px]">
      {sujet.parties.map(p => {
        const qs = sujet.questions.filter(q => q.partie === p.num);
        if (!qs.length) return null;
        // Sous-sections (A.1, A.2…) : un séparateur discret quand la partie en compte plusieurs.
        const groupes: { cle: string | null; qs: SujetQuestion[] }[] = [];
        for (const q of qs) {
          const k = sousSection(q);
          const g = groupes[groupes.length - 1];
          if (g && g.cle === k) g.qs.push(q); else groupes.push({ cle: k, qs: [q] });
        }
        const separer = groupes.length > 1;
        return (
          <div key={p.num}>
            <div className="mb-1 font-semibold leading-tight">
              <span className="text-muted">Partie {p.num}</span> · {p.titre}
            </div>
            {separer ? (
              <div className="space-y-1">
                {groupes.map((g, i) => (
                  <div key={`${g.cle}-${i}`} className="flex flex-wrap items-center gap-1" data-sous-section={g.cle ?? ''}>
                    {(i > 0 || g.cle?.includes('.')) && (
                      <span className={`w-full font-mono text-[9.5px] font-semibold tracking-[.06em] text-muted ${i > 0 ? 'border-t border-line/70 pt-0.5' : ''}`}>
                        {g.cle?.includes('.') ? g.cle : '\u00a0'}
                      </span>
                    )}
                    {g.qs.map(pastille)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">{qs.map(pastille)}</div>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2 text-[11px] text-muted">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-good bg-[#D7F5E3] align-middle" />répondue</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-good align-middle" />juste</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-crit bg-[#FDE8E6] align-middle" />à revoir</span>
        <span>🚩 marquée</span>
      </div>
    </nav>
  );
}
