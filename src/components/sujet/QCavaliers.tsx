'use client';
/** Outil « cavaliers » : configurateurs MyHOME (A, PL, M, S, T, D…) de chaque composant. */
import { cavalierJuste, cleCavalier } from '@/lib/sujet/correction';
import { CHAMP, etatChamp, type OutilProps } from './outils';

const DEFAUT = ['—', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

export default function QCavaliers({ q, r, onChange, readOnly, montrer }: OutilProps<'cavaliers'>) {
  const valeurs = r?.valeurs ?? {};
  // Liste commune à toutes les positions (les valeurs attendues y figurent toujours).
  const options = (() => {
    const base = q.valeurs ?? DEFAUT;
    const extra = q.composants.flatMap(c => c.positions.map(p => p.attendu)).filter(v => !base.includes(v));
    return [...base, ...Array.from(new Set(extra))];
  })();
  const fixer = (k: string, v: string) => onChange({ type: 'cavaliers', valeurs: { ...valeurs, [k]: v } });
  return (
    <div>
      <p className="mb-2 text-[12px] text-muted">Pour chaque composant, choisis la valeur du configurateur dans chaque position (« — » : aucun configurateur).</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {q.composants.map(c => (
          <div key={c.id} className="rounded-lg border border-line bg-surface p-2">
            <div className="mb-1.5 text-center font-title text-[16px] font-bold">{c.label}</div>
            <div className="space-y-1">
              {c.positions.map(p => {
                const k = cleCavalier(c.id, p.id);
                const v = valeurs[k] ?? '';
                return (
                  <label key={p.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="font-mono font-semibold">{p.label}</span>
                    <select aria-label={`${c.label} position ${p.label}`} className={`${CHAMP} min-h-[32px] w-[86px] py-1${etatChamp(montrer, v ? cavalierJuste(v, p.attendu) : null)}`}
                      value={v} disabled={readOnly} onChange={e => fixer(k, e.target.value)} data-cavalier={k}>
                      <option value="">·</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
