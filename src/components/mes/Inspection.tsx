'use client';

/**
 * Inspection visuelle : vue dessinée de l'armoire porte ouverte, de la porte et
 * du départ vers la fosse, avec 6 zones à ouvrir en vue rapprochée. Le jugement
 * n'est possible qu'après avoir regardé la zone ; l'écart exige d'en donner la
 * cause avant de le corriger.
 */

import React from 'react';
import { ECART_CAUSE_OK, ECART_CAUSES, INSPECTION } from '@/lib/mes/miseEnService';
import { useMesParcours } from '@/app/tp/[id]/mesStore';

/** Position des zones sur la vue d'ensemble (viewBox 560 × 420). */
const ZONES: Record<string, { x: number; y: number }> = {
  schemas: { x: 382, y: 128 }, plastron: { x: 175, y: 160 }, organes: { x: 470, y: 120 },
  masses: { x: 92, y: 300 }, etancheite: { x: 300, y: 375 }, marquage: { x: 250, y: 210 },
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Vues rapprochées (viewBox 360 × 250), dessins sans donnée utilisateur. */
function vignette(id: string, corrige: boolean): string {
  switch (id) {
    case 'schemas':
      return '<rect x="60" y="30" width="240" height="190" rx="8" fill="#cfd6df" stroke="#8a95a3"/><rect x="80" y="50" width="200" height="150" rx="4" fill="#fff" stroke="#8a95a3"/><path d="M95 75h120M95 95h150M95 115h90M95 135h140M95 155h110" stroke="#9aa5b3" stroke-width="3"/><text x="190" y="190" font-size="11" fill="#1b222c">Folio 1/2 · ind. B</text>';
    case 'plastron':
      return '<rect x="40" y="30" width="280" height="190" rx="6" fill="#dfe4ea" stroke="#8a95a3"/><rect x="60" y="50" width="240" height="150" rx="4" fill="#f2f4f7" stroke="#6b7684" stroke-width="2"/>'
        + range(6).map((i) => `<rect x="${80 + i * 36}" y="100" width="24" height="44" rx="3" fill="#fff" stroke="#1b222c"/><rect x="${87 + i * 36}" y="112" width="10" height="16" fill="#1b222c"/>`).join('')
        + [[66, 56], [288, 56], [66, 188], [288, 188]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="5" fill="#9aa5b3"/>`).join('');
    case 'organes':
      return '<rect x="40" y="30" width="280" height="190" rx="6" fill="#dfe4ea" stroke="#8a95a3"/><circle cx="120" cy="125" r="44" fill="#f2b705" stroke="#b98300" stroke-width="3"/><circle cx="120" cy="125" r="28" fill="#d6453d"/><text x="92" y="195" font-size="12" font-weight="700" fill="#1b222c">S0 · AU</text><rect x="210" y="85" width="70" height="80" rx="8" fill="#1b222c"/><rect x="237" y="70" width="16" height="60" rx="4" fill="#d6453d"/><text x="233" y="195" font-size="12" font-weight="700" fill="#1b222c">Q0</text>';
    case 'masses':
      return '<rect x="30" y="40" width="130" height="180" fill="#dfe4ea" stroke="#8a95a3"/><rect x="200" y="40" width="130" height="180" fill="#cfd6df" stroke="#8a95a3"/><path d="M150 120c20 -10 40 20 60 0" stroke="#1e9e5a" stroke-width="7" fill="none"/><path d="M150 120c20 -10 40 20 60 0" stroke="#f2d100" stroke-width="7" fill="none" stroke-dasharray="6 6"/><circle cx="150" cy="120" r="7" fill="#9aa5b3"/><circle cx="210" cy="120" r="7" fill="#9aa5b3"/><text x="75" y="210" font-size="11">porte</text><text x="245" y="210" font-size="11">châssis</text>';
    case 'etancheite':
      return '<rect x="40" y="30" width="280" height="80" fill="#dfe4ea" stroke="#8a95a3"/><text x="140" y="70" font-size="11">fond de l\'armoire</text>'
        + [100, 180, 260].map((x, i) => {
          const lache = i === 1 && !corrige;
          return `<rect x="${x - 18}" y="110" width="36" height="22" rx="3" fill="#6b7684"/>`
            + `<rect x="${x - 14}" y="${lache ? 140 : 132}" width="28" height="16" rx="3" fill="${lache ? '#8a95a3' : '#4b5563'}"/>`
            + `<rect x="${x - 7}" y="${lache ? 150 : 146}" width="14" height="80" fill="#1b222c"/>`
            + (lache ? `<rect x="${x - 12}" y="148" width="4" height="10" fill="#fff"/><rect x="${x + 8}" y="148" width="4" height="10" fill="#fff"/><path d="M${x + 18} 140l18 -10" stroke="#d6453d" stroke-width="2"/><text x="${x + 38}" y="128" font-size="11" fill="#d6453d">jour</text><path d="M${x} 236q4 8 0 12" stroke="#2c6fd6" stroke-width="2" fill="none"/>` : '');
        }).join('')
        + (corrige ? '<text x="196" y="205" font-size="12" fill="#1e9e5a" font-weight="700">✓ serré</text>' : '');
    case 'marquage':
      return '<rect x="40" y="30" width="280" height="190" rx="6" fill="#dfe4ea" stroke="#8a95a3"/>'
        + ['Q1', 'KM1', 'Q2', 'Q3', 'T1'].map((r, i) => `<rect x="${58 + i * 52}" y="70" width="42" height="80" rx="3" fill="#fff" stroke="#1b222c"/><rect x="${60 + i * 52}" y="160" width="38" height="18" rx="2" fill="#fff8d6" stroke="#b98300"/><text x="${79 + i * 52}" y="173" font-size="11" font-weight="700" text-anchor="middle">${r}</text>`).join('');
    default:
      return '';
  }
}

function Scene({ sel, onOpen }: { sel: string | null; onOpen: (id: string) => void }) {
  const { s } = useMesParcours();
  return (
    <svg viewBox="0 0 560 420" className="block h-auto w-full" role="img" aria-label="Armoire de la station, porte ouverte">
      <rect x="10" y="10" width="330" height="330" rx="6" fill="#c9d0d9" stroke="#6b7684" strokeWidth="2" />
      <rect x="30" y="30" width="290" height="290" fill="#eef1f5" stroke="#8a95a3" />
      <rect x="50" y="70" width="250" height="34" rx="3" fill="#b8c1cc" />
      <rect x="50" y="130" width="250" height="60" rx="3" fill="#dde2e8" stroke="#8a95a3" />
      {range(6).map((i) => <rect key={i} x={62 + i * 38} y="140" width="24" height="40" rx="3" fill="#fff" stroke="#1b222c" />)}
      <rect x="50" y="200" width="250" height="26" rx="3" fill="#cfd6df" />
      <rect x="50" y="240" width="250" height="60" rx="3" fill="#b8c1cc" />
      <rect x="80" y="300" width="190" height="14" fill="#6b7684" />
      {[120, 175, 230].map((x) => (
        <g key={x}><rect x={x - 6} y="314" width="12" height="10" fill="#4b5563" /><path d={`M${x} 324v60`} stroke="#1b222c" strokeWidth="5" /></g>
      ))}
      <path d="M340 30 L420 50 L420 300 L340 320 Z" fill="#c9d0d9" stroke="#6b7684" strokeWidth="2" />
      <path d="M356 92 L406 99 L406 162 L356 158 Z" fill="#fff" stroke="#8a95a3" />
      <rect x="430" y="40" width="120" height="370" rx="8" fill="#dfe4ea" stroke="#8a95a3" />
      <circle cx="470" cy="110" r="16" fill="#f2b705" /><circle cx="470" cy="110" r="10" fill="#d6453d" />
      <rect x="505" y="95" width="26" height="32" rx="4" fill="#1b222c" />
      <text x="438" y="175" fontSize="10" fill="#5d6878">porte (face avant)</text>
      <rect x="20" y="350" width="400" height="60" fill="#9fb4c7" opacity=".5" />
      <text x="30" y="402" fontSize="10" fill="#34495e">fosse · vers la pompe</text>
      <path d="M60 330 L70 250 L110 250" stroke="#1e9e5a" strokeWidth="4" fill="none" />
      {INSPECTION.map((it, i) => {
        const z = ZONES[it.id];
        const m = s.visu.marks[it.id];
        const vu = s.visu.vus.includes(it.id);
        const ring = (!it.conforme && s.visu.corrige) || m === 'C' ? '#1e9e5a' : m === 'NC' ? '#d6453d' : vu ? '#5d6878' : '#e39a00';
        return (
          <g key={it.id} data-zone={it.id} onClick={() => onOpen(it.id)} style={{ cursor: 'pointer' }}>
            <circle cx={z.x} cy={z.y} r="24" fill={`${ring}22`} stroke={ring} strokeWidth={sel === it.id ? 3.5 : 2} strokeDasharray={m ? undefined : '5 4'} />
            <circle cx={z.x + 17} cy={z.y - 17} r="10" fill={ring} />
            <text x={z.x + 17} y={z.y - 13} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Inspection() {
  const { s, voirVisu, markVisu, answerCause, corrigerVisu } = useMesParcours();
  const [sel, setSel] = React.useState<string | null>(null);
  const open = (id: string) => { setSel(id); voirVisu(id); };
  const it = INSPECTION.find((x) => x.id === sel);
  const nv = s.visu.vus.length, nj = INSPECTION.filter((x) => s.visu.marks[x.id]).length;
  const corrige = !!it && !it.conforme && s.visu.corrige;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[12.5px] text-muted" data-visu-count>
        {nv} / {INSPECTION.length} zones regardées · {nj} / {INSPECTION.length} jugées{s.visu.corrige && ' · écart corrigé ✓'}
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-[var(--line)] bg-[#e9edf2] p-1.5">
          <Scene sel={sel} onOpen={open} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div data-zoom className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            <div className="border-b border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[13px] font-bold">
              {it ? `${INSPECTION.indexOf(it) + 1} · ${it.label}` : 'Vue rapprochée'}
            </div>
            {!it ? (
              <p className="m-0 p-3 text-[12.5px] text-muted">Clique une zone numérotée sur l&apos;armoire. Les boutons de jugement se débloquent une fois la zone regardée.</p>
            ) : (
              <>
                <div className="border-b border-[var(--line)] bg-[#f7f8fa]">
                  <svg viewBox="0 0 360 250" className="block h-auto max-h-[240px] w-full" dangerouslySetInnerHTML={{ __html: vignette(it.id, corrige) }} />
                </div>
                <div className="p-3 text-[12.5px]">
                  <p data-constat className="m-0">{corrige ? it.fix : it.obs}</p>
                  {corrige ? (
                    <p data-ecart-corrige className="m-0 mt-2 rounded-lg bg-good/10 px-2.5 py-1.5 font-semibold text-good">
                      Relevé non conforme, puis corrigé ✓ — point acquis.
                    </p>
                  ) : (
                  <div className="mt-2 flex gap-1.5">
                    {(['C', 'NC'] as const).map((j) => {
                      const on = s.visu.marks[it.id] === j;
                      return (
                        <button key={j} type="button" data-j={j} onClick={() => markVisu(it.id, j)}
                          className={`min-h-touch rounded-[10px] border px-3 text-[12.5px] font-semibold ${on ? (j === 'C' ? 'border-good bg-good/15 text-good' : 'border-crit bg-crit/15 text-crit') : 'border-[var(--line)]'}`}>
                          {j === 'C' ? 'Conforme' : 'Non conforme'}
                        </button>
                      );
                    })}
                  </div>
                  )}
                  {!it.conforme && s.visu.marks[it.id] === 'NC' && !s.visu.corrige && (
                    <div className="mt-2 rounded-r-xl border-l-4 border-l-warn bg-warn/10 px-2.5 py-2">
                      {s.visu.corrige ? (
                        <span className="font-semibold text-good">Écart corrigé : l&apos;indice IP65 est rétabli.</span>
                      ) : (
                        <>
                          <b className="block">Quel est l&apos;écart ?</b>
                          <div className="mt-1 flex flex-col gap-1">
                            {ECART_CAUSES.map((c, i) => {
                              const on = s.visu.cause === i;
                              return (
                                <button key={c} type="button" data-cause={i} onClick={() => answerCause(i)}
                                  className={`min-h-touch rounded-[10px] border px-2.5 text-left text-[12.5px] ${on ? (i === ECART_CAUSE_OK ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : 'border-[var(--line)] bg-[var(--surface)]'}`}>
                                  {c}
                                </button>
                              );
                            })}
                          </div>
                          {s.visu.cause === ECART_CAUSE_OK && (
                            <button type="button" data-corriger onClick={corrigerVisu}
                              className="mt-2 min-h-touch rounded-[10px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)]">
                              Serrer le presse-étoupe
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <ul className="m-0 list-none p-0 text-[12.5px]">
            {INSPECTION.map((x, i) => {
              const m = s.visu.marks[x.id];
              const vu = s.visu.vus.includes(x.id);
              return (
                <li key={x.id}>
                  <button type="button" data-visu={x.id} onClick={() => open(x.id)}
                    className="flex min-h-touch w-full items-center gap-2 border-t border-[var(--line)] py-1 text-left">
                    <span className={`grid h-5 w-5 flex-none place-items-center rounded-full text-[10.5px] font-bold ${m === 'C' ? 'bg-good text-white' : m === 'NC' ? 'bg-crit text-white' : vu ? 'bg-[#9aa5b3] text-white' : 'bg-[var(--line)]'}`}>{i + 1}</span>
                    <span className="min-w-0 flex-1">{x.label}</span>
                    {!vu && <span className="text-[11px] text-muted">à regarder</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
