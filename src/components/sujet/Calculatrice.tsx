'use client';
/**
 * Calculatrice « type collège », flottante et déplaçable : + − × ÷ √ x² parenthèses, π,
 * historique (un clic sur une ligne reprend son résultat). Clavier accepté quand elle a le focus.
 */
import { useEffect, useRef, useState } from 'react';
import { afficherResultat, evaluer } from '@/lib/sujet/calculatrice';

const TOUCHES: { t: string; ins?: string; cls?: string }[][] = [
  [{ t: 'C', cls: 'bg-[#3A2B2B] text-[#FF8A80] hover:bg-[#4A3333]' }, { t: '←' }, { t: '(' }, { t: ')' }],
  [{ t: '√', ins: '√' }, { t: 'x²', ins: '²' }, { t: 'π' }, { t: '÷' }],
  [{ t: '7' }, { t: '8' }, { t: '9' }, { t: '×' }],
  [{ t: '4' }, { t: '5' }, { t: '6' }, { t: '−' }],
  [{ t: '1' }, { t: '2' }, { t: '3' }, { t: '+' }],
  [{ t: '0' }, { t: ',' }, { t: 'Ans' }, { t: '=', cls: 'bg-accent text-[#1B1B1B]' }],
];

export default function Calculatrice({ onFermer }: { onFermer: () => void }) {
  const [expr, setExpr] = useState('');
  const [res, setRes] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hist, setHist] = useState<{ e: string; r: string }[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => { boite.current?.focus(); }, []);

  const dernier = hist[0]?.r ?? '';
  const taper = (k: string) => {
    setErr(null);
    if (k === 'C') { setExpr(''); setRes(null); return; }
    if (k === '←') { setExpr(e => e.slice(0, -1)); return; }
    if (k === '=') { calculer(); return; }
    if (k === 'Ans') { setExpr(e => e + dernier.replace(/\s/g, '')); return; }
    // Un opérateur juste après un résultat enchaîne sur ce résultat.
    if (res != null && expr === '' && /^[+−×÷²]$/.test(k)) { setExpr(res + k); setRes(null); return; }
    setExpr(e => e + k);
  };
  const calculer = () => {
    if (!expr.trim()) return;
    try {
      const r = afficherResultat(evaluer(expr));
      setHist(h => [{ e: expr, r }, ...h].slice(0, 12));
      setRes(r);
      setExpr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const clavier = (e: React.KeyboardEvent) => {
    const k = e.key;
    const map: Record<string, string> = { '*': '×', '/': '÷', '-': '−', '.': ',', Enter: '=', '=': '=', Backspace: '←', Escape: 'C' };
    if (/^[0-9+(),]$/.test(k)) { e.preventDefault(); taper(k); } else if (map[k]) { e.preventDefault(); taper(map[k]); }
  };

  const debut = (e: React.PointerEvent) => {
    const r = boite.current?.getBoundingClientRect();
    if (!r) return;
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const deplacer = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const x = Math.max(0, Math.min(window.innerWidth - 260, e.clientX - drag.current.dx));
    const y = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - drag.current.dy));
    setPos({ x, y });
  };

  return (
    <div
      ref={boite}
      tabIndex={0}
      onKeyDown={clavier}
      role="dialog"
      aria-label="Calculatrice"
      data-calculatrice
      className="fixed z-[80] w-[260px] overflow-hidden rounded-2xl border border-[#2E3946] bg-[#1B222C] text-white shadow-2xl outline-none focus:ring-2 focus:ring-accent/60"
      style={pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 }}
    >
      <div className="flex cursor-move touch-none items-center gap-2 bg-[#141A21] px-3 py-1.5" onPointerDown={debut} onPointerMove={deplacer} onPointerUp={() => { drag.current = null; }}>
        <span className="text-[12px] font-semibold">🧮 Calculatrice</span>
        <span className="flex-1" />
        <button type="button" onPointerDown={e => e.stopPropagation()} onClick={onFermer} className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/10" aria-label="Fermer la calculatrice">✕</button>
      </div>
      {hist.length > 0 && (
        <ul className="max-h-[92px] overflow-auto border-b border-white/10 px-3 py-1 font-mono text-[11px] text-[#9AA3AE]">
          {hist.map((h, i) => (
            <li key={i}>
              <button type="button" className="w-full truncate text-right hover:text-white" onClick={() => setExpr(e => e + h.r.replace(/\s/g, ''))} title="Reprendre ce résultat">
                {h.e} = <b className="text-white">{h.r}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="px-3 pt-2 text-right font-mono">
        <div className="min-h-[18px] break-all text-[13px] text-[#9AA3AE]" data-calc-expr>{expr || (res != null ? 'Ans' : '')}</div>
        <div className="min-h-[30px] break-all text-[22px] font-semibold" data-calc-res>{err ? <span className="text-[13px] text-[#FF8A80]">{err}</span> : res ?? '0'}</div>
      </div>
      <div className="grid grid-cols-4 gap-1 p-2">
        {TOUCHES.flat().map(k => (
          <button key={k.t} type="button" onClick={() => taper(k.ins ?? k.t)} data-touche={k.t}
            className={`h-10 rounded-lg font-mono text-[15px] font-semibold transition active:scale-95 ${k.cls ?? 'bg-[#2B3A4A] hover:bg-[#35475A]'}`}>
            {k.t}
          </button>
        ))}
      </div>
    </div>
  );
}
