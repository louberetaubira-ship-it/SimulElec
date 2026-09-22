'use client';
/**
 * Outil « bulles » : les bulles vides du plan du sujet se complètent au clic
 * (liste fermée de valeurs, ou saisie libre).
 */
import { useState } from 'react';
import { texteAccepte } from '@/lib/sujet/normalize';
import { CHAMP, type OutilProps } from './outils';

export default function QBulles({ q, r, onChange, readOnly, montrer }: OutilProps<'bulles'>) {
  const valeurs = r?.valeurs ?? {};
  const [ouverte, setOuverte] = useState<string | null>(null);
  const fixer = (id: string, v: string) => onChange({ type: 'bulles', valeurs: { ...valeurs, [id]: v } });
  const remplies = q.bulles.filter(b => (valeurs[b.id] ?? '').trim()).length;

  return (
    <div>
      <p className="mb-2 text-[12px] text-muted">
        {readOnly ? `${remplies}/${q.bulles.length} bulles complétées.` : `Clique une bulle du plan et choisis sa valeur${q.choix ? ` (${q.choix.join(', ')})` : ''}. ${remplies}/${q.bulles.length} complétées.`}
      </p>
      <div className="relative inline-block max-w-full select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={q.plan.src} alt={q.plan.alt} className="block max-w-full rounded-lg border border-line bg-white" draggable={false} />
        {q.bulles.map((b, i) => {
          const v = (valeurs[b.id] ?? '').trim();
          const juste = v ? texteAccepte(v, [b.attendu, ...(b.acceptes ?? [])]) : null;
          const etat = montrer && juste != null
            ? (juste ? 'border-good bg-[#D7F5E3]' : 'border-crit bg-[#FDE8E6]')
            : v ? 'border-[#1B222C] bg-[#FFF3DB]' : 'border-[#1B222C] bg-white';
          return (
            <div key={b.id} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%,-50%)', zIndex: ouverte === b.id ? 20 : 10 }}>
              <button type="button" disabled={readOnly} onClick={() => setOuverte(ouverte === b.id ? null : b.id)} data-bulle={b.id}
                aria-label={`Bulle ${i + 1}${v ? ` : ${v}` : ' vide'}`}
                className={`grid h-[28px] min-w-[28px] place-items-center rounded-full border-2 px-1 font-mono text-[13px] font-bold text-[#141A21] shadow-sm ${etat} ${readOnly ? 'cursor-default' : 'hover:scale-110'}`}>
                {v || ''}
              </button>
              {ouverte === b.id && !readOnly && (
                <div className="absolute left-1/2 top-[34px] w-max -translate-x-1/2 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
                  {q.choix ? (
                    <div className="flex gap-1">
                      {q.choix.map(c => (
                        <button key={c} type="button" onClick={() => { fixer(b.id, c); setOuverte(null); }} data-choix={c}
                          className={`grid h-9 min-w-[36px] place-items-center rounded-md border px-2 font-mono text-[13px] font-bold ${v === c ? 'border-accent bg-accent/20' : 'border-line hover:border-accent'}`}>
                          {c}
                        </button>
                      ))}
                      <button type="button" onClick={() => { fixer(b.id, ''); setOuverte(null); }} className="grid h-9 w-9 place-items-center rounded-md border border-line text-muted hover:text-crit" aria-label="Vider la bulle">✕</button>
                    </div>
                  ) : (
                    <form onSubmit={e => { e.preventDefault(); setOuverte(null); }} className="flex gap-1">
                      <input autoFocus className={`${CHAMP} w-[90px]`} value={valeurs[b.id] ?? ''} onChange={e => fixer(b.id, e.target.value)} aria-label="Valeur de la bulle" />
                      <button type="submit" className="rounded-md border border-line px-2 text-[12px] font-semibold">OK</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
