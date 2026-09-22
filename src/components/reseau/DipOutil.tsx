'use client';

/**
 * Micro-interrupteurs DIP d'un contrôleur (sujet D.6) : l'élève les bascule, la valeur
 * binaire, décimale et l'adresse IP qui en résulte se calculent en direct. C'est un outil
 * de préparation : il ne note rien, les questions du bloc le font.
 */
import React from 'react';

export default function DipOutil({ prefixe = '192.168.1.', reseau = '192.168.0.' }: { prefixe?: string; reseau?: string }) {
  // état de départ du sujet : seul DIP 2 est connu (1), DIP 1 à 0
  const [dip, setDip] = React.useState<number[]>([0, 1, 0, 0, 0, 0, 0, 0]);
  const dec = dip.reduce((a, v, i) => a + v * 2 ** i, 0);
  const ip = `${prefixe}${dec}`;
  const communique = ip.startsWith(reseau);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3" data-dip>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 rounded-lg bg-[#D93A3A] p-2">
          {[7, 6, 5, 4, 3, 2, 1, 0].map(i => (
            <button
              key={i}
              type="button"
              data-dip-switch={i + 1}
              onClick={() => setDip(d => d.map((v, j) => (j === i ? 1 - v : v)))}
              className="flex items-center gap-2"
              aria-label={`DIP ${i + 1} : ${dip[i]}`}
            >
              <span className="relative block h-[16px] w-[52px] rounded-sm bg-[#F2F4F7]">
                <span className={`absolute top-[2px] block h-[12px] w-[22px] rounded-sm bg-[#3C4654] transition-all ${dip[i] ? 'left-[28px]' : 'left-[2px]'}`} />
              </span>
              <span className="w-4 text-[12px] font-bold text-white">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
          <b className="text-muted">Binaire (8 → 1)</b><span className="font-mono-num" data-dip-bin>{[...dip].reverse().join(' ')}</span>
          <b className="text-muted">Décimal</b><span className="font-mono-num" data-dip-dec>{dec}</span>
          <b className="text-muted">Adresse</b><span className="font-mono-num">{ip}</span>
          <b className="text-muted">Communique ?</b>
          <span className={communique ? 'font-bold text-good' : 'font-bold text-crit'}>
            {communique ? 'oui' : `non : 3ᵉ octet ${prefixe.split('.')[2]} ≠ ${reseau.split('.')[2]}`}
          </span>
        </div>
      </div>
      <p className="m-0 text-[11.5px] text-muted">
        Chaque interrupteur vaut son poids : DIP 1 = 2⁰ = 1, DIP 2 = 2¹ = 2 … DIP 8 = 2⁷ = 128. Bascule-les pour
        retrouver l&apos;octet du DTR — puis réponds aux questions.
      </p>
    </div>
  );
}
