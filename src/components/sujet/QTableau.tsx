'use client';
/** Outil « tableau » : tableau du sujet à compléter (cellules fixes, saisies ou listes fermées). */
import { saisieJuste } from '@/lib/sujet/correction';
import { CHAMP, etatChamp, type OutilProps } from './outils';
import Texte from './Texte';

export default function QTableau({ q, r, onChange, readOnly, montrer }: OutilProps<'tableau'>) {
  const cellules = r?.cellules ?? {};
  const fixer = (id: string, v: string) => onChange({ type: 'tableau', cellules: { ...cellules, [id]: v } });
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[420px] border-collapse text-[13px]">
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
                const note = c.attendu != null || (c.acceptes?.length ?? 0) > 0;
                const cls = `${CHAMP} w-full min-w-[80px]${etatChamp(montrer && note, v ? saisieJuste(v, c) : null)}`;
                return (
                  <td key={j} className="px-1.5 py-1">
                    {c.choix ? (
                      <select aria-label={`${q.colonnes[j] ?? 'Cellule'} ligne ${i + 1}`} className={cls} value={v} disabled={readOnly}
                        onChange={e => fixer(c.id, e.target.value)} data-cellule={c.id}>
                        <option value="">—</option>
                        {c.choix.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input aria-label={`${q.colonnes[j] ?? 'Cellule'} ligne ${i + 1}`} className={cls} value={v}
                        placeholder={c.placeholder ?? ''} disabled={readOnly} autoComplete="off"
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
