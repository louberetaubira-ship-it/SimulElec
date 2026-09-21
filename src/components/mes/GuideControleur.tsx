'use client';

/**
 * Guide du contrôleur d'installation : commutateur numéroté (dessin propre au
 * simulateur), tableau Numéro · Symbole · Fonction, détail de chaque position
 * (cordons, précaution, étape), fiche des 7 étapes et précautions générales.
 */

import React from 'react';
import { POSITIONS } from '@/lib/mes/miseEnService';
import { useMesParcours } from '@/app/tp/[id]/mesStore';
import Frise7 from './Frise7';

const PRECAUTIONS = [
  'Vérifier l\'état des cordons et de l\'appareil avant toute mesure.',
  'Ne jamais mesurer l\'isolement (RISO) sur une installation sous tension.',
  'Faire le zéro des cordons avant une mesure de continuité (RLO).',
  'Mesures sous tension : EPI portés, habilitation BR, zone balisée.',
];

function Cadran({ sel, onSel }: { sel: number; onSel: (i: number) => void }) {
  const angles = [-130, -95, -60, -25, 20, 55, 95, 140];
  return (
    <svg viewBox="0 0 320 300" className="w-full max-w-[320px]" role="img" aria-label="Commutateur rotatif du contrôleur">
      <rect x="10" y="10" width="300" height="280" rx="36" fill="#f2b705" stroke="#b98300" strokeWidth="4" />
      <text x="160" y="32" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1b1b1b" letterSpacing="1">CONTRÔLEUR D&apos;INSTALLATION</text>
      <circle cx="160" cy="165" r="50" fill="#2b2f35" />
      <rect x="156" y="120" width="8" height="46" rx="4" fill="#f2b705"
        style={{ transformOrigin: '160px 165px', transform: `rotate(${angles[sel]}deg)`, transition: 'transform .25s' }} />
      {POSITIONS.map((p, i) => {
        const a = ((angles[i] - 90) * Math.PI) / 180;
        const x = 160 + 112 * Math.cos(a), y = 165 + 108 * Math.sin(a);
        const lx = 160 + 80 * Math.cos(a), ly = 165 + 78 * Math.sin(a);
        const on = sel === i;
        return (
          <g key={p.k} onClick={() => onSel(i)} style={{ cursor: 'pointer' }} data-guide-pos={p.k}>
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1b1b1b">{p.symbole}</text>
            <circle cx={x} cy={y} r="12" fill={on ? '#1b1b1b' : '#fff'} stroke="#1b1b1b" strokeWidth="1.5" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={on ? '#f2b705' : '#1b1b1b'}>{p.n}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function GuideControleur() {
  const { guideOpen, setGuideOpen } = useMesParcours();
  const [sel, setSel] = React.useState(0);
  const [tab, setTab] = React.useState<'appareil' | 'etapes'>('appareil');

  React.useEffect(() => {
    if (!guideOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setGuideOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guideOpen, setGuideOpen]);

  if (!guideOpen) return null;
  const p = POSITIONS[sel];

  return (
    <div className="no-print fixed inset-0 z-[70] grid place-items-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Guide du contrôleur" onClick={() => setGuideOpen(false)}>
      <div data-guide className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-[18px] font-bold">📘 Guide du contrôleur d&apos;installation</h2>
          <div className="ml-auto inline-flex overflow-hidden rounded-[10px] border border-[var(--line)]">
            {([['appareil', 'Commutateur'], ['etapes', 'Les 7 étapes']] as const).map(([k, l]) => (
              <button key={k} type="button" data-guide-tab={k} onClick={() => setTab(k)}
                className={`min-h-touch px-3 text-[12.5px] font-semibold ${tab === k ? 'bg-accent text-[var(--accent-ink)]' : 'bg-[var(--surface)]'}`}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" data-guide-close onClick={() => setGuideOpen(false)} className="min-h-touch rounded-[10px] border border-[var(--line)] px-3 text-[12.5px] font-semibold">
            Fermer
          </button>
        </div>

        {tab === 'appareil' ? (
          <>
            <p className="m-0 mb-2 text-[12.5px] text-muted">Utilise le commutateur rotatif pour choisir le type de mesure. Clique une position ou une ligne du tableau.</p>
            <div className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
              <Cadran sel={sel} onSel={setSel} />
              <div className="min-w-0">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[.04em] text-muted">
                      <th className="py-1 pr-2">N°</th><th className="py-1 pr-2">Symbole</th><th className="py-1 pr-2">Fonction de mesure</th><th className="py-1">Étape</th>
                    </tr>
                  </thead>
                  <tbody>
                    {POSITIONS.map((q, i) => (
                      <tr key={q.k} onClick={() => setSel(i)} className={`cursor-pointer border-t border-[var(--line)] ${sel === i ? 'bg-accent/10' : ''}`}>
                        <td className="py-1.5 pr-2 font-mono-num">{q.n}</td>
                        <td className="py-1.5 pr-2 font-bold">{q.symbole}</td>
                        <td className="py-1.5 pr-2">{q.fonction}</td>
                        <td className="py-1.5 text-muted">{q.etape ? `Étape ${q.etape}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div data-guide-detail className="mt-2 rounded-[10px] bg-[var(--surface-2)] px-2.5 py-2 text-[12.5px]">
                  <b>{p.n} · {p.symbole} — {p.fonction}</b>
                  <div><b>Cordons :</b> {p.cordons}</div>
                  <div><b>Précaution :</b> {p.precaution}</div>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-r-xl border-l-4 border-l-warn bg-warn/10 px-2.5 py-2 text-[12.5px]">
              <b className="block">Précautions générales</b>
              <ul className="m-0 list-disc pl-5">{PRECAUTIONS.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </>
        ) : (
          <>
            <p className="m-0 mb-2 text-[12.5px] text-muted">On ne met sous tension qu&apos;une installation dont le conducteur de protection, l&apos;isolement et la terre sont sûrs.</p>
            <Frise7 />
          </>
        )}
      </div>
    </div>
  );
}
