'use client';
/**
 * Outil « calcul » : formule → application numérique → résultat, comme sur la copie.
 * Noté sur le résultat (tolérance) ; la formule seule juste vaut la moitié.
 */
import { useRef } from 'react';
import { nombreJuste } from '@/lib/sujet/normalize';
import { CHAMP, etatChamp, type OutilProps, type RDe } from './outils';

const SYMBOLES = ['×', '÷', '(', ')', '√', '²', 'π', '−'];
type Champ = 'formule' | 'application' | 'resultat';

export default function QCalcul({ q, r, onChange, readOnly, montrer }: OutilProps<'calcul'>) {
  const rep: RDe<'calcul'> = r ?? { type: 'calcul', formule: '', application: '', resultat: '' };
  const refs = { formule: useRef<HTMLInputElement>(null), application: useRef<HTMLInputElement>(null), resultat: useRef<HTMLInputElement>(null) };
  const dernier = useRef<Champ>('formule');
  const fixer = (k: Champ, v: string) => onChange({ ...rep, [k]: v });

  const inserer = (s: string) => {
    const k = dernier.current;
    const el = refs[k].current;
    const v = rep[k];
    const a = el?.selectionStart ?? v.length;
    const b = el?.selectionEnd ?? v.length;
    fixer(k, v.slice(0, a) + s + v.slice(b));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + s.length, a + s.length); });
  };

  const ligne = (k: Champ, label: string, placeholder: string, extra?: React.ReactNode, cls = '') => (
    <label className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
      <span className="text-[12px] font-semibold uppercase tracking-[.05em] text-muted">{label}</span>
      <span className="flex items-center gap-2">
        {extra}
        <input
          ref={refs[k]}
          className={`${CHAMP} w-full ${cls}`}
          value={rep[k]}
          placeholder={placeholder}
          disabled={readOnly}
          onFocus={() => { dernier.current = k; }}
          onChange={e => fixer(k, e.target.value)}
          data-calcul={k}
          autoComplete="off"
        />
      </span>
    </label>
  );

  const justeRes = rep.resultat.trim() ? nombreJuste(rep.resultat, q.attendu, q.tolerance) : null;

  return (
    <div className="space-y-2">
      {ligne('formule', 'Formule', `${q.grandeur} = …`)}
      {ligne('application', 'Application numérique', `${q.grandeur} = … (avec les valeurs)`)}
      <label className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
        <span className="text-[12px] font-semibold uppercase tracking-[.05em] text-muted">Résultat</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[14px] font-semibold">{q.grandeur} =</span>
          <input
            ref={refs.resultat}
            className={`${CHAMP} w-[160px]${etatChamp(montrer, justeRes)}`}
            value={rep.resultat}
            placeholder="…"
            inputMode="decimal"
            disabled={readOnly}
            onFocus={() => { dernier.current = 'resultat'; }}
            onChange={e => fixer('resultat', e.target.value)}
            data-calcul="resultat"
            autoComplete="off"
          />
          {q.unite && <span className="font-mono text-[13px] text-muted">{q.unite}</span>}
        </span>
      </label>
      {q.arrondi && <p className="text-[12px] text-muted sm:pl-[158px]">Arrondi demandé : {q.arrondi}</p>}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 sm:pl-[158px]" aria-label="Symboles">
          {SYMBOLES.map(s => (
            <button key={s} type="button" onMouseDown={e => e.preventDefault()} onClick={() => inserer(s)}
              className="grid h-8 min-w-[32px] place-items-center rounded-md border border-line bg-surface2 px-1.5 font-mono text-[13px] hover:border-accent">
              {s}
            </button>
          ))}
          <span className="ml-1 text-[11.5px] text-muted">insère dans le dernier champ utilisé</span>
        </div>
      )}
    </div>
  );
}
