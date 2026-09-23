'use client';
/** Outil « ordonner » : numéroter les étapes (rang 1..n) dans l'ordre d'impression du sujet. */
import { CHAMP, etatChamp, verdict, type OutilProps } from './outils';
import Texte from './Texte';

export default function QOrdonner({ q, r, onChange, readOnly, correction }: OutilProps<'ordonner'>) {
  const n = q.items.length;
  const rangs = r?.rangs ?? q.items.map(() => null);
  const fixer = (i: number, v: string) => {
    const next = q.items.map((_, k) => (k === i ? (v ? Number(v) : null) : rangs[k] ?? null));
    onChange({ type: 'ordonner', rangs: next });
  };
  const doublons = new Set(rangs.filter((x, i) => x != null && rangs.indexOf(x) !== i));
  return (
    <div className="space-y-1.5">
      <p className="text-[12px] text-muted">Numérote les étapes de 1 à {n} dans l&apos;ordre chronologique.</p>
      {q.items.map((it, i) => {
        const v = rangs[i];
        return (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
            <select
              aria-label={`Rang de l'étape ${i + 1}`}
              className={`${CHAMP} w-[64px] text-center${etatChamp(true, v == null ? null : verdict(correction, String(i)))}${doublons.has(v) ? ' !border-warn' : ''}`}
              value={v ?? ''}
              disabled={readOnly}
              onChange={e => fixer(i, e.target.value)}
              data-rang={i}
            >
              <option value="">—</option>
              {Array.from({ length: n }, (_, k) => <option key={k} value={k + 1}>{k + 1}</option>)}
            </select>
            <span className="text-[14px]"><Texte>{it}</Texte></span>
          </div>
        );
      })}
      {doublons.size > 0 && !readOnly && <p className="text-[12px] text-warn">Deux étapes portent le même numéro.</p>}
    </div>
  );
}
