'use client';

/**
 * Petits outils du technicien courant faible, partagés entre les étapes d'un TP réseau :
 * la fenêtre de commande de la loge et l'afficheur du testeur de câble.
 */
import React from 'react';
import type { VerdictTesteur } from '@/lib/sim/reseau';

/** Fenêtre « C:\WINDOWS\système32\cmd.exe » (sortie réelle, police à chasse fixe). */
export function Terminal({ texte, titre = 'C:\\WINDOWS\\système32\\cmd.exe' }: { texte: string; titre?: string }) {
  const ref = React.useRef<HTMLPreElement>(null);
  React.useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [texte]);
  return (
    <div className="overflow-hidden rounded-lg border border-[#3C4654]" data-terminal-loge>
      <div className="bg-[#E6E9EE] px-2 py-1 font-mono-num text-[11px] text-[#3C4654]">{titre}</div>
      <pre ref={ref} className="m-0 max-h-[300px] min-h-[140px] overflow-auto whitespace-pre-wrap bg-[#0C0C0C] p-2 font-mono-num text-[11.5px] leading-snug text-[#D4D4D4]">
        {texte || 'C:\\Users\\loge>_'}
      </pre>
    </div>
  );
}

/** Afficheur d'un testeur de câble : les 8 LED de l'injecteur et du récepteur. */
export function Testeur({ v }: { v: VerdictTesteur | null }) {
  return (
    <div className="rounded-lg bg-[#1B222C] p-2 text-[#E9EEF5]" data-testeur>
      <div className="grid grid-cols-[70px_repeat(8,1fr)] items-center gap-1 text-center font-mono-num text-[11px]">
        <span className="text-left text-[10.5px] opacity-80">injecteur</span>
        {Array.from({ length: 8 }, (_, i) => <span key={i} className="rounded bg-[#35E36A] text-[#141A21]">{i + 1}</span>)}
        <span className="text-left text-[10.5px] opacity-80">récepteur</span>
        {Array.from({ length: 8 }, (_, i) => {
          const ok = v ? v.brins[i] === 'ok' : false;
          return <span key={i} className={`rounded ${v ? (ok ? 'bg-[#35E36A] text-[#141A21]' : 'bg-[#56606C] text-[#AEB7C2]') : 'bg-[#2B3340] text-[#56606C]'}`}>{i + 1}</span>;
        })}
      </div>
      <div className="mt-1.5 text-[12px]" data-testeur-verdict>
        {!v ? 'Branche l’injecteur et le récepteur sur les deux extrémités du lien.'
          : v.verdict === 'droit' ? '8/8 · 1-1 … 8-8 · câble droit'
            : v.verdict === 'absent' ? 'Aucune continuité : le lien n’est pas posé.'
              : `${v.continus}/8 · brins ${v.brins.map((b, i) => (b === 'ok' ? null : i + 1)).filter(Boolean).join(', ')} ouverts`}
      </div>
    </div>
  );
}
