'use client';
/**
 * Navigation par partie : une pastille par question. États : courante (orange),
 * répondue (vert pâle), juste (vert), à revoir (rouge : fausse ou partielle après
 * correction), marquée par l'élève (drapeau).
 */
import { estRepondue } from '@/lib/sujet/correction';
import { useSujet } from '@/lib/sujet/store';

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

  return (
    <nav aria-label="Questions du sujet" className="space-y-3 text-[12.5px]">
      {sujet.parties.map(p => {
        const qs = sujet.questions.filter(q => q.partie === p.num);
        if (!qs.length) return null;
        return (
          <div key={p.num}>
            <div className="mb-1 font-semibold leading-tight">
              <span className="text-muted">Partie {p.num}</span> · {p.titre}
            </div>
            <div className="flex flex-wrap gap-1">
              {qs.map(q => {
                const e = etat(q.num);
                const cour = q.num === st.courante;
                const marque = st.marquees.includes(q.num);
                return (
                  <button
                    key={q.num}
                    type="button"
                    onClick={() => { aller(q.num); onChoisir?.(); }}
                    data-nav={q.num}
                    data-etat={e}
                    aria-current={cour ? 'step' : undefined}
                    aria-label={`Question ${q.num}${marque ? ', marquée à revoir' : ''}`}
                    className={`relative grid h-[28px] w-[34px] place-items-center rounded-md border font-mono text-[11.5px] font-semibold transition hover:-translate-y-px ${CLS[e]} ${cour ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                  >
                    {q.num}
                    {marque && <span className="absolute -right-1 -top-1.5 text-[10px]" aria-hidden>🚩</span>}
                  </button>
                );
              })}
            </div>
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
