'use client';
/** Outil « valeur » : une ou plusieurs valeurs / références à saisir (unité affichée). */
import { saisieJuste } from '@/lib/sujet/correction';
import { CHAMP, etatChamp, type OutilProps } from './outils';

export default function QValeur({ q, r, onChange, readOnly, montrer }: OutilProps<'valeur'>) {
  const valeurs = r?.valeurs ?? {};
  const fixer = (id: string, v: string) => onChange({ type: 'valeur', valeurs: { ...valeurs, [id]: v } });
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)] sm:items-center">
      {q.champs.map(c => {
        const v = valeurs[c.id] ?? '';
        const note = c.attendu != null || (c.acceptes?.length ?? 0) > 0;
        return (
          <label key={c.id} className="contents">
            <span className="text-[13.5px] font-semibold sm:text-right">{c.label}</span>
            <span className="flex items-center gap-2">
              <input
                className={`${CHAMP} w-full max-w-[280px]${etatChamp(montrer && note, v ? saisieJuste(v, c) : null)}`}
                value={v}
                placeholder={c.placeholder ?? '…'}
                disabled={readOnly}
                onChange={e => fixer(c.id, e.target.value)}
                data-champ={c.id}
                inputMode={c.attendu != null && !c.acceptes?.length ? 'decimal' : 'text'}
                autoComplete="off"
              />
              {c.unite && <span className="font-mono text-[13px] text-muted">{c.unite}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
