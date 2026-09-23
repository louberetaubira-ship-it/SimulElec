'use client';
/**
 * Outil « relier » : un trait par élément de gauche vers un élément de droite, comme au
 * stylo sur le papier. Clic (ou Entrée) sur un élément de gauche, puis sur sa correspondance.
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { verdict, type OutilProps } from './outils';
import Texte from './Texte';

const COULEURS = ['#2C7BE5', '#E4312B', '#1E9E63', '#8B4A2B', '#7C3AED', '#E39A00', '#0EA5E9', '#DB2777', '#475569', '#65A30D'];
const lettre = (i: number) => String.fromCharCode(65 + i);

interface Seg { x1: number; y1: number; x2: number; y2: number; c: string; ok: boolean | null }

export default function QRelier({ q, r, onChange, readOnly, correction }: OutilProps<'relier'>) {
  const liens = r?.liens ?? q.gauche.map(() => null);
  const [sel, setSel] = useState<number | null>(null);
  const boite = useRef<HTMLDivElement>(null);
  const gRefs = useRef<(HTMLElement | null)[]>([]);
  const dRefs = useRef<(HTMLElement | null)[]>([]);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  const cle = liens.join(',');
  const mesurer = useCallback(() => {
    const b = boite.current?.getBoundingClientRect();
    if (!b) return;
    setDim({ w: b.width, h: b.height });
    const out: Seg[] = [];
    liens.forEach((j, i) => {
      if (j == null) return;
      const g = gRefs.current[i]?.getBoundingClientRect();
      const d = dRefs.current[j]?.getBoundingClientRect();
      if (!g || !d) return;
      out.push({
        x1: g.right - b.left, y1: g.top + g.height / 2 - b.top,
        x2: d.left - b.left, y2: d.top + d.height / 2 - b.top,
        c: COULEURS[i % COULEURS.length],
        ok: verdict(correction, String(i)),
      });
    });
    setSegs(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, correction]);

  useLayoutEffect(() => {
    mesurer();
    const el = boite.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => mesurer());
    ro.observe(el);
    return () => ro.disconnect();
  }, [mesurer]);

  const relier = (j: number) => {
    if (readOnly || sel == null) return;
    const next = q.gauche.map((_, k) => (k === sel ? j : liens[k] ?? null));
    onChange({ type: 'relier', liens: next });
    setSel(null);
  };
  const delier = (i: number) => {
    if (readOnly) return;
    onChange({ type: 'relier', liens: q.gauche.map((_, k) => (k === i ? null : liens[k] ?? null)) });
  };

  return (
    <div>
      <p className="mb-2 text-[12px] text-muted">
        {readOnly ? 'Liaisons tracées.' : 'Clique un élément de gauche, puis l’élément de droite qui lui correspond : le trait se pose. Clique ✕ pour l’effacer.'}
      </p>
      <div ref={boite} className="relative grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1.5fr)] gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_56px_minmax(0,1.5fr)]">
        <svg className="pointer-events-none absolute inset-0" width={dim.w} height={dim.h} aria-hidden>
          {segs.map((s, k) => (
            <g key={k}>
              {s.ok != null && <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.ok ? '#1E9E63' : '#D93A3A'} strokeWidth={7} strokeOpacity={0.25} strokeLinecap="round" />}
              <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={s.ok === false ? '6 4' : undefined} />
              <circle cx={s.x1} cy={s.y1} r={3.5} fill={s.c} />
              <circle cx={s.x2} cy={s.y2} r={3.5} fill={s.c} />
            </g>
          ))}
        </svg>
        {Array.from({ length: Math.max(q.gauche.length, q.droite.length) }, (_, row) => (
          <div key={row} className="contents">
            <div className="col-start-1">
              {row < q.gauche.length && (
                <div ref={el => { gRefs.current[row] = el; }}
                  className={`flex min-h-[40px] items-center gap-2 rounded-lg border px-2 py-1.5 text-[13px] transition ${sel === row ? 'border-accent bg-accent/15' : 'border-line bg-surface'}`}>
                  <button type="button" disabled={readOnly} onClick={() => setSel(sel === row ? null : row)} data-gauche={row}
                    className="flex-1 text-left font-semibold disabled:cursor-default" aria-pressed={sel === row}>
                    <Texte>{q.gauche[row]}</Texte>
                  </button>
                  {liens[row] != null && (
                    <span className="flex flex-none items-center gap-1">
                      <span className="grid h-5 min-w-[20px] place-items-center rounded px-1 font-mono text-[11px] font-bold text-white" style={{ background: COULEURS[row % COULEURS.length] }}>
                        {lettre(liens[row] as number)}
                      </span>
                      {!readOnly && (
                        <button type="button" onClick={() => delier(row)} className="grid h-6 w-6 place-items-center rounded text-muted hover:text-crit" aria-label="Effacer le trait">✕</button>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="col-start-3">
              {row < q.droite.length && (
                <button type="button" ref={el => { dRefs.current[row] = el; }} disabled={readOnly || sel == null} onClick={() => relier(row)} data-droite={row}
                  className={`flex min-h-[40px] w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-[12.5px] transition disabled:cursor-default ${sel != null ? 'border-accent/60 bg-surface hover:bg-accent/10' : 'border-line bg-surface'}`}>
                  <span className="mt-px font-mono text-[11px] font-bold text-muted">{lettre(row)}.</span>
                  <span className="flex-1"><Texte>{q.droite[row]}</Texte></span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
