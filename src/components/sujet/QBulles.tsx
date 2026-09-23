'use client';
/**
 * Outil « bulles » : les bulles vides du plan du sujet se complètent au clic
 * (liste fermée de valeurs, ou saisie libre). En saisie libre, le champ s'ouvre SUR la bulle,
 * assez large pour une référence complète (« SYM 12.5-3-M (2) ») ; Entrée ou Échap le referme.
 */
import { useState } from 'react';
import { CHAMP, verdict, type OutilProps } from './outils';

export default function QBulles({ q, r, onChange, readOnly, correction }: OutilProps<'bulles'>) {
  const valeurs = r?.valeurs ?? {};
  const [ouverte, setOuverte] = useState<string | null>(null);
  const fixer = (id: string, v: string) => onChange({ type: 'bulles', valeurs: { ...valeurs, [id]: v } });
  const remplies = q.bulles.filter(b => (valeurs[b.id] ?? '').trim()).length;

  return (
    <div>
      <p className="mb-2 text-[12px] text-muted">
        {readOnly
          ? `${remplies}/${q.bulles.length} bulles complétées.`
          : `Clique une bulle du plan et ${q.choix ? `choisis sa valeur (${q.choix.join(', ')})` : 'écris sa valeur'}. ${remplies}/${q.bulles.length} complétées.`}
      </p>
      <div className="relative inline-block max-w-full select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={q.plan.src} alt={q.plan.alt} className="block max-w-full rounded-lg border border-line bg-white" draggable={false} />
        {q.bulles.map((b, i) => {
          const v = (valeurs[b.id] ?? '').trim();
          const juste = v ? verdict(correction, b.id) : null;
          const etat = juste != null
            ? (juste ? 'border-good bg-[#D7F5E3]' : 'border-crit bg-[#FDE8E6]')
            : v ? 'border-[#1B222C] bg-[#FFF3DB]' : 'border-[#1B222C] bg-white';
          return (
            <div key={b.id} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%,-50%)', zIndex: ouverte === b.id ? 20 : 10 }}>
              <button type="button" disabled={readOnly} onClick={() => setOuverte(ouverte === b.id ? null : b.id)} data-bulle={b.id}
                aria-label={`Bulle ${i + 1}${v ? ` : ${v}` : ' vide'}`}
                title={v || undefined}
                className={`block h-[28px] min-w-[28px] max-w-[260px] truncate rounded-full text-center leading-[24px] border-2 px-1.5 font-mono font-bold text-[#141A21] shadow-sm ${v.length > 3 ? 'text-[12px]' : 'text-[13px]'} ${etat} ${readOnly ? 'cursor-default' : 'hover:scale-105'}`}>
                {v || ''}
              </button>
              {ouverte === b.id && !readOnly && !q.choix && (
                <form onSubmit={e => { e.preventDefault(); setOuverte(null); }}
                  className={`absolute top-1/2 z-30 flex -translate-y-1/2 gap-1 rounded-lg border-2 border-accent bg-surface p-1 shadow-xl ${b.x > 70 ? '-right-2' : b.x < 30 ? '-left-2' : 'left-1/2 -translate-x-1/2'}`}>
                  <input autoFocus className={`${CHAMP} w-[min(240px,70vw)] text-[14px]`} value={valeurs[b.id] ?? ''} placeholder="Valeur de la bulle"
                    onChange={e => fixer(b.id, e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setOuverte(null); }}
                    aria-label={`Valeur de la bulle ${i + 1}`} autoComplete="off" spellCheck={false} data-saisie-bulle={b.id} />
                  <button type="submit" className="rounded-md bg-[#1B222C] px-2.5 text-[12px] font-bold text-white">OK</button>
                </form>
              )}
              {ouverte === b.id && !readOnly && q.choix && (
                <div className="absolute left-1/2 top-[34px] w-max -translate-x-1/2 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
                  <div className="flex gap-1">
                    {q.choix.map(c => (
                      <button key={c} type="button" onClick={() => { fixer(b.id, c); setOuverte(null); }} data-choix={c}
                        className={`grid h-9 min-w-[36px] place-items-center rounded-md border px-2 font-mono text-[13px] font-bold ${v === c ? 'border-accent bg-accent/20' : 'border-line hover:border-accent'}`}>
                        {c}
                      </button>
                    ))}
                    <button type="button" onClick={() => { fixer(b.id, ''); setOuverte(null); }} className="grid h-9 w-9 place-items-center rounded-md border border-line text-muted hover:text-crit" aria-label="Vider la bulle">✕</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
