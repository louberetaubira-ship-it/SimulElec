'use client';

/**
 * Clavier du variateur (ATV320) : l'élève règle chaque paramètre d'après la plaque
 * du moteur et le cahier des charges, pendant la mise en service.
 *
 * Navigation comme sur l'appareil : ▲ ▼ choisissent le paramètre, ENT entre en
 * réglage, ▲ ▼ changent la valeur, ENT enregistre, ESC abandonne. Chaque ENT est
 * enregistré tout de suite (`onParam`) : le variateur garde ce qu'on lui a entré.
 */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { fmtParam, parametresOf, valeurParam } from '@/lib/sim/parametrage';
import { modeOf } from '@/lib/sim/progress';
import { repereSlot } from '@/lib/sim/reperes';

export interface ParametrageProps {
  tp: TpDefinition;
  st: AttemptState;
  /** Le variateur est-il sous tension (clavier utilisable) ? */
  alimente: boolean;
  onParam: (code: string, value: number | string) => void;
}

export default function Parametrage({ tp, st, alimente, onParam }: ParametrageProps) {
  const params = parametresOf(tp);
  const [sel, setSel] = React.useState(0);
  const [edit, setEdit] = React.useState<number | string | null>(null);
  const [verif, setVerif] = React.useState(false);
  const eval_ = modeOf(st) === 'evaluation';
  const u1 = repereSlot(tp, tp.variateur!.slot);
  const p = params[sel];

  const bouge = (d: number) => {
    if (!alimente) return;
    if (edit == null) { setSel((sel + d + params.length) % params.length); return; }
    const o = p.options;
    const k = Math.min(o.length - 1, Math.max(0, o.indexOf(edit) + d));
    setEdit(o[k]);
  };
  const ent = () => {
    if (!alimente) return;
    if (edit == null) { setEdit(valeurParam(p, st)); return; }
    onParam(p.code, edit);
    setEdit(null);
  };

  const faux = params.filter(q => valeurParam(q, st) !== q.attendu).length;
  let groupe = '';

  return (
    <div className="mt-1.5 flex flex-col gap-2">
      <div className="rounded-[12px] bg-[#23282f] p-2.5 text-[#dfe5ec]">
        <div className="flex justify-between text-[10px] tracking-[.12em] text-[#9aa6b3]"><span>ALTIVAR 320</span><span>{u1}</span></div>
        <div className="my-2 min-h-[58px] rounded-[8px] bg-[#0b0f0b] px-2 py-2 text-center">
          {alimente ? (
            <>
              <div className="font-mono text-[30px] font-bold leading-none tracking-[.12em] text-[#ff3b30]" style={{ textShadow: '0 0 8px rgba(255,59,48,.55)' }}>
                {edit != null ? fmtParam(edit) : p.code}
              </div>
              <div className="mt-1 text-[10.5px] text-[#7c8792]">
                {edit != null ? `${p.code} · ${p.role}${p.unite ? ` (${p.unite})` : ''}` : `${p.role} · ${fmtParam(valeurParam(p, st))} ${p.unite ?? ''}`}
              </div>
            </>
          ) : (
            <div className="pt-3 text-[11px] text-[#5b6570]">afficheur éteint — variateur hors tension</div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {([['▲', () => bouge(-1)], ['▼', () => bouge(1)], ['ESC', () => setEdit(null)], ['ENT', ent]] as const).map(([t, f]) => (
            <button key={t} type="button" onClick={f} disabled={!alimente} data-key={t}
              className={`rounded-[7px] py-2 text-[13px] font-bold text-white disabled:opacity-40 ${t === 'ENT' ? 'bg-[#2c6fd6]' : 'bg-[#39414b] active:bg-[#56606c]'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1 text-center text-[10px]">
          <span className={`flex-1 rounded px-1 py-0.5 ${edit == null ? 'bg-[#ff3b30] text-white' : 'bg-[#2d333b] text-[#8b96a3]'}`}>Navigation</span>
          <span className={`flex-1 rounded px-1 py-0.5 ${edit != null ? 'bg-[#ff3b30] text-white' : 'bg-[#2d333b] text-[#8b96a3]'}`}>Réglage</span>
        </div>
      </div>

      <table className="w-full text-[11.5px]">
        <tbody>
          {params.map((q, i) => {
            const v = valeurParam(q, st);
            const ok = v === q.attendu;
            const head = q.groupe !== groupe ? (groupe = q.groupe) : null;
            return (
              <React.Fragment key={q.code}>
                {head && (
                  <tr><td colSpan={3} className="bg-[var(--surface-2)] px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">{head}</td></tr>
                )}
                <tr className={`cursor-pointer border-t border-[var(--line)] ${i === sel ? 'bg-accent/10' : ''}`}
                  onClick={() => { setSel(i); setEdit(null); }}>
                  <td className="py-0.5 pl-1 align-top font-mono font-bold">{q.code}</td>
                  <td className="py-0.5">
                    {q.role}
                    {verif && !ok && !eval_ && <div className="text-[10.5px] text-crit">Attendu {fmtParam(q.attendu)} {q.unite ?? ''} — {q.why}</div>}
                  </td>
                  <td className="whitespace-nowrap py-0.5 pr-1 text-right align-top font-mono font-bold">
                    {fmtParam(v)} {q.unite ?? ''}
                    {verif && <span className={`ml-1 ${ok ? 'text-good' : 'text-crit'}`}>{ok ? '✓' : '✗'}</span>}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setVerif(true)} disabled={!alimente}
          className="rounded-[9px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40">
          Vérifier mes réglages
        </button>
        {verif && (
          <span className={`text-[12px] font-semibold ${faux ? 'text-crit' : 'text-good'}`}>
            {faux ? `${faux} réglage${faux > 1 ? 's' : ''} non conforme${faux > 1 ? 's' : ''}${eval_ ? '' : ' — détail sous chaque ligne'}` : 'Paramétrage conforme.'}
          </span>
        )}
      </div>
    </div>
  );
}
