'use client';
/**
 * Outil « tableau » : tableau du sujet à compléter (cellules fixes, saisies ou listes fermées).
 * Cellules « formule » (`estFormule`) et `saisie: 'maths'` (applications numériques) : éditeur
 * de maths. Coloration juste / faux : verdicts de la correction serveur (`correction.champs`).
 */
import EditeurMaths from './EditeurMaths';
import { CHAMP, etatChamp, verdict, type OutilProps } from './outils';
import Texte from './Texte';

export default function QTableau({ q, r, onChange, readOnly, correction }: OutilProps<'tableau'>) {
  const cellules = r?.cellules ?? {};
  const fixer = (id: string, v: string) => onChange({ type: 'tableau', cellules: { ...cellules, [id]: v } });
  const maths = q.lignes.some(l => l.cellules.some(c => typeof c !== 'string' && (c.estFormule || c.saisie === 'maths')));
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className={`w-full ${maths ? 'min-w-[560px]' : 'min-w-[420px]'} border-collapse text-[13px]`}>
        <thead>
          <tr className="bg-surface2">
            {q.colonnes.map((c, i) => (
              <th key={i} className="border-b border-line px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[.04em] text-muted">
                <Texte>{c}</Texte>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.lignes.map((l, i) => (
            <tr key={i} className="border-t border-line align-middle">
              {l.cellules.map((c, j) => {
                if (typeof c === 'string') {
                  return <td key={j} className="px-2 py-1.5"><Texte>{c}</Texte></td>;
                }
                const v = cellules[c.id] ?? '';
                const etat = etatChamp(true, v.trim() ? verdict(correction, c.id) : null);
                const cls = `${CHAMP} w-full min-w-[80px]${etat}`;
                const label = `${q.colonnes[j] ?? 'Cellule'} ligne ${i + 1}`;
                return (
                  <td key={j} className="px-1.5 py-1">
                    {c.choix ? (
                      <select aria-label={label} className={cls} value={v} disabled={readOnly}
                        onChange={e => fixer(c.id, e.target.value)} data-cellule={c.id}>
                        <option value="">—</option>
                        {c.choix.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : c.estFormule || c.saisie === 'maths' ? (
                      <EditeurMaths value={v} onChange={x => fixer(c.id, x)} readOnly={readOnly} ariaLabel={label}
                        placeholder={c.placeholder} etat={etat} className="min-w-[200px]" data={{ cellule: c.id }} />
                    ) : (
                      <input aria-label={label} className={cls} value={v}
                        placeholder={c.placeholder ?? ''} disabled={readOnly} autoComplete="off"
                        inputMode={c.numerique ? 'decimal' : 'text'}
                        onChange={e => fixer(c.id, e.target.value)} data-cellule={c.id} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
