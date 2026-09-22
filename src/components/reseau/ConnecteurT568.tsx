'use client';
/* eslint-disable @next/next/no-img-element -- documents du dossier servis depuis public/tp */

/**
 * Connecteur de brassage RJ45, vue arrière (sujet D.8.2), à raccorder fil par fil en T568B.
 *
 * Même disposition que le vrai connecteur LCS³ : rangée du haut 1 · 2 · 7 · 8, rangée du bas
 * 5 · 4 · 3 · 6. L'élève prend un conducteur (couleur pleine ou blanc rayé), puis clique la
 * broche : une couleur à la mauvaise place est refusée et comptée comme une liaison refusée.
 * Le document du sujet reste à l'écran ; le corrigé n'est montré qu'en aperçu professeur.
 */
import React from 'react';
import type { ReseauDef } from '@/lib/types';
import { Note } from '@/components/ui';

const TEINTE: Record<string, string> = { orange: '#EF7D22', vert: '#6BBF3B', bleu: '#1F6FD1', marron: '#8A4B20' };

/** Couleur de fond et rayure d'un conducteur « blanc-orange », « vert »… */
const teinte = (c: string) => {
  const base = c.replace('blanc-', '');
  return { plein: TEINTE[base] ?? '#999', raye: c.startsWith('blanc-') };
};

const HAUT = [1, 2, 7, 8];
const BAS = [5, 4, 3, 6];

function Fil({ c, x, y, w = 46 }: { c: string; x: number; y: number; w?: number }) {
  const t = teinte(c);
  const id = `r-${c}`;
  return (
    <g>
      <defs>
        <pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse">
          <rect width={8} height={8} fill="#FFFFFF" />
          <rect width={4} height={8} fill={t.plein} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={10} rx={5} fill={t.raye ? `url(#${id})` : t.plein} stroke="#3C4654" strokeWidth={0.8} />
    </g>
  );
}

export default function ConnecteurT568({ def, t568, onPlace, prof, readOnly }: {
  def: ReseauDef;
  t568: Record<string, string>;
  onPlace?: (broche: number, couleur: string) => void;
  /** Aperçu professeur : le corrigé D.8.2 est disponible. */
  prof?: boolean;
  readOnly?: boolean;
}) {
  const [pris, setPris] = React.useState<string | null>(null);
  const [vue, setVue] = React.useState<'sujet' | 'corrige'>('sujet');
  const places = new Set(Object.values(t568));
  const couleurs = [...def.t568b].sort((a, b) => a.replace('blanc-', '').localeCompare(b.replace('blanc-', '')) || a.localeCompare(b));
  const justes = def.t568b.filter((c, i) => t568[String(i + 1)] === c).length;

  const broche = (n: number, x: number, y: number) => {
    const c = t568[String(n)];
    return (
      <g
        key={n}
        data-broche={n}
        onClick={!readOnly && pris && !c && onPlace ? () => { onPlace(n, pris); setPris(null); } : undefined}
        style={!readOnly && pris && !c ? { cursor: 'pointer' } : undefined}
      >
        <rect x={x} y={y} width={40} height={52} rx={4} fill={c ? '#FFFFFF' : pris ? '#FFF3DB' : '#D8DEE6'} stroke={pris && !c ? '#E39A00' : '#6B7684'} strokeWidth={1.5} />
        <text x={x + 20} y={y - 6} textAnchor="middle" fontSize={13} fontWeight={700}>{n}</text>
        {c && <Fil c={c} x={x + 6} y={y + 21} w={28} />}
      </g>
    );
  };

  return (
    <div className="flex w-full flex-col gap-2" data-t568>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setVue('sujet')}
              className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${vue === 'sujet' ? 'border-[#1B222C] bg-[#1B222C] text-white' : 'border-[var(--line)]'}`}>
              D.8.2 · à compléter
            </button>
            {prof && (
              <button type="button" onClick={() => setVue('corrige')} data-t568-corrige
                className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${vue === 'corrige' ? 'border-[#1B222C] bg-[#1B222C] text-white' : 'border-[var(--line)]'}`}>
                Corrigé (professeur)
              </button>
            )}
          </div>
          <img src={vue === 'corrige' ? '/tp/ecobike-reseau/t568b_corrige.jpg' : '/tp/ecobike-reseau/t568b_sujet.jpg'}
            alt="Connecteur de brassage, vue arrière (sujet D.8.2)" className="w-full rounded-lg border border-[var(--line)] bg-white" />
        </div>
        <div className="flex flex-col gap-2">
          <svg viewBox="0 0 300 214" className="w-full rounded-lg border border-[var(--line)] bg-[#EEF1F5]" aria-label="Connecteur RJ45 vue arrière">
            <rect x={60} y={20} width={230} height={170} rx={10} fill="#B8C0CA" stroke="#6B7684" />
            <text x={175} y={207} textAnchor="middle" fontSize={10} fill="#3C4654">connecteur 0 337 63 · vue arrière</text>
            {HAUT.map((n, i) => broche(n, 80 + i * 52, 36))}
            {BAS.map((n, i) => broche(n, 80 + i * 52, 124))}
            <rect x={0} y={80} width={60} height={40} rx={8} fill="#2FA3E0" />
            <text x={30} y={104} textAnchor="middle" fontSize={9} fill="#FFFFFF">F/UTP</text>
          </svg>
          {!readOnly && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Conducteurs du câble">
              {couleurs.map(c => {
                const utilise = places.has(c);
                return (
                  <button
                    key={c}
                    type="button"
                    data-fil={c}
                    disabled={utilise}
                    onClick={() => setPris(pris === c ? null : c)}
                    className={`flex min-h-touch items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px] disabled:opacity-35 ${pris === c ? 'border-accent bg-accent/15 font-semibold' : 'border-[var(--line)] bg-[var(--surface)]'}`}
                  >
                    <svg width={26} height={12} aria-hidden><Fil c={c} x={0} y={1} w={26} /></svg>
                    {c}
                  </button>
                );
              })}
            </div>
          )}
          <Note>
            {justes === 8
              ? 'T568B complet : orange en 1-2, vert en 3-6, bleu en 4-5, marron en 7-8. Le testeur donnera 1-1 … 8-8.'
              : pris
                ? `Conducteur ${pris} en main : clique sa broche.`
                : `${justes} / 8 conducteurs raccordés. Prends un conducteur, puis clique sa broche (tableau T568B du DTR 22).`}
          </Note>
        </div>
      </div>
    </div>
  );
}
