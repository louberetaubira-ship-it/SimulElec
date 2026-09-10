'use client';
/* eslint-disable @next/next/no-img-element -- photos de bibliothèque servies en data URI */

/**
 * Appareil de mesure interactif (port de `instSvg`) : sélecteur rotatif cliquable,
 * prises A / COM / VΩ, afficheur, pointes de touche et pince.
 */
import React from 'react';
import type { InstrumentKind } from '@/lib/types';
import { INSTRUMENTS, instrumentDef, type ReadOut } from '@/lib/sim/mesures';
import { libraryItemSync, loadLibraryItem } from '@/lib/data/library';
import { Note } from '@/components/ui';

export interface InstrumentProps {
  inst: InstrumentKind | null;
  dial: number;
  out: ReadOut;
  probes: { r: string | null; k: string | null };
  clampLabel: string | null;
  pick: 'r' | 'k' | 'clamp' | null;
  onSelect: (i: InstrumentKind) => void;
  onRotate: () => void;
  onPick: (p: 'r' | 'k' | 'clamp') => void;
  onClear: () => void;
}

const VAT_LEDS = ['12', '24', '48', '120', '230', '400', '690'];

/** Miniatures photo des appareils (bibliothèque, chargées à la demande). */
function useInstrumentPhotos(): Record<string, string> {
  const [src, setSrc] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let alive = true;
    const keys = INSTRUMENTS.map(i => i.libKey).filter((k): k is string => !!k);
    void Promise.all(keys.map(k => loadLibraryItem(k))).then(list => {
      if (!alive) return;
      const out: Record<string, string> = {};
      list.forEach(it => { if (it?.src) out[it.key] = it.src; });
      if (Object.keys(out).length) setSrc(out);
    });
    return () => { alive = false; };
  }, []);
  return React.useMemo(() => {
    const out = { ...src };
    for (const i of INSTRUMENTS) {
      if (!i.libKey || out[i.libKey]) continue;
      const it = libraryItemSync(i.libKey);
      if (it?.src) out[i.libKey] = it.src;
    }
    return out;
  }, [src]);
}

export default function Instrument(p: InstrumentProps) {
  const photos = useInstrumentPhotos();
  const def = instrumentDef(p.inst);
  const dials = def?.dials ?? [];
  const n = dials.length;
  const dial = def ? dials[Math.min(p.dial, n - 1)] : 'OFF';
  const ang = -120 + p.dial * (240 / Math.max(1, n - 1));
  const short = (id: string | null) => (id ? id.replace('.', ' ') : '');

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {INSTRUMENTS.map(i => (
          <button
            key={i.id}
            type="button"
            data-inst={i.id}
            onClick={() => p.onSelect(i.id)}
            className={`flex min-h-touch flex-col items-center gap-1 rounded-[10px] border px-1 py-1.5 text-center text-[10px] leading-tight ${p.inst === i.id ? 'border-accent ring-1 ring-accent' : 'border-[var(--line)]'} bg-[var(--surface)]`}
          >
            {i.libKey && photos[i.libKey]
              ? <img src={photos[i.libKey]} alt="" className="h-[38px] object-contain" />
              : <span className="grid h-[38px] place-items-center text-[20px]">{i.id === 'vat' ? '🔴' : '🔦'}</span>}
            {i.name.split(' · ')[0].split(' (')[0]}
          </button>
        ))}
      </div>

      {!def ? (
        <Note>Sélectionne un appareil de mesure.</Note>
      ) : (
        <>
          <svg
            viewBox="0 0 250 350"
            id="instSvg"
            role="img"
            aria-label={`${def.name} · sélecteur sur ${dial}`}
            className="mx-auto block w-full max-w-[260px] cursor-pointer"
            onClick={p.onRotate}
          >
            {def.id === 'vat' ? (
              <>
                <rect x="70" y="20" width="110" height="300" rx="18" fill="#D93A3A" stroke="#7A1F1F" strokeWidth="2" />
                <rect x="85" y="40" width="80" height="60" rx="6" fill="#20262D" />
                <text x="125" y="80" textAnchor="middle" fontSize="24" fontFamily="var(--font-mono)" fill={p.out.ok === false ? '#FF4D3D' : '#3DFF7A'}>{p.out.display}</text>
                <text x="125" y="120" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">{p.out.unit}</text>
                {VAT_LEDS.map((t, i) => {
                  const u = p.out.value ?? 0;
                  const on = p.out.ok === false && Number(t) <= u;
                  return (
                    <React.Fragment key={t}>
                      <circle cx="100" cy={140 + i * 22} r="6" fill={on ? '#FF4D3D' : '#5B2E2E'} />
                      <text x="112" y={144 + i * 22} fontSize="9" fill="#fff">{t} V</text>
                    </React.Fragment>
                  );
                })}
                <text x="125" y="310" textAnchor="middle" fontSize="8" fill="#fff">VAT · IEC 61243-3</text>
              </>
            ) : def.id === 'tach' ? (
              <>
                <rect x="60" y="20" width="130" height="300" rx="16" fill="#F0B429" stroke="#8A6200" strokeWidth="2" />
                <rect x="75" y="40" width="100" height="60" rx="6" fill="#20262D" />
                <text x="125" y="82" textAnchor="middle" fontSize="26" fontFamily="var(--font-mono)" fill="#3DFF7A">{p.out.display}</text>
                <text x="125" y="120" textAnchor="middle" fontSize="9" fill="#3A4047" fontWeight="700">{p.out.unit} · visée optique</text>
                <rect x="110" y="140" width="30" height="80" rx="6" fill="#3A4047" />
                <circle cx="125" cy="250" r="16" fill="#D93A3A" />
                <text x="125" y="254" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">MES</text>
                <text x="125" y="300" textAnchor="middle" fontSize="8" fill="#3A4047">vise la pastille de l&apos;arbre</text>
              </>
            ) : (
              <>
                <rect x="40" y="10" width="170" height="330" rx="18" fill={def.id === 'ctrl' ? '#1F4E9C' : def.id === 'clamp' ? '#3A4047' : '#F0B429'} stroke="#20262D" strokeWidth="2" />
                {def.id === 'clamp' && (
                  <path d="M85 10 a40 40 0 0 1 80 0 v20 a10 10 0 0 1 -20 0 v-14 a20 20 0 0 0 -40 0 v14 a10 10 0 0 1 -20 0z" fill="#F0B429" stroke="#8A6200" strokeWidth="2" />
                )}
                <rect x="55" y="50" width="140" height="70" rx="6" fill="#DDE5D0" stroke="#20262D" />
                <text x="188" y="98" textAnchor="end" fontSize="26" fontFamily="var(--font-mono)" fill={p.out.bad ? '#D93A3A' : '#141A21'}>{p.out.display}</text>
                <text x="60" y="66" fontSize="8" fill="#3A4047" fontWeight="700">{def.name}</text>
                <text x="60" y="112" fontSize="7.5" fill={p.out.bad ? '#D93A3A' : '#3A4047'}>{p.out.unit}</text>
                <g transform="translate(125 205)">
                  <circle r="52" fill="#2A2E33" />
                  <circle r="44" fill="#3A4047" stroke="#555" strokeWidth="2" />
                  {dials.map((t, i) => {
                    const a = (-120 + i * (240 / Math.max(1, n - 1))) * Math.PI / 180;
                    return (
                      <text
                        key={t}
                        x={Math.sin(a) * 66}
                        y={-Math.cos(a) * 66 + 4}
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="700"
                        fill={i === p.dial ? '#FFD84D' : '#E8ECF0'}
                      >
                        {t}
                      </text>
                    );
                  })}
                  <g transform={`rotate(${ang})`}>
                    <rect x="-8" y="-40" width="16" height="70" rx="8" fill="#D93A3A" stroke="#7A1F1F" />
                    <path d="M0 -38v10" stroke="#fff" strokeWidth="3" />
                  </g>
                </g>
                <g>
                  {[80, 125, 170].map(cx => <circle key={cx} cx={cx} cy="300" r="10" fill="#20262D" />)}
                  <circle cx="80" cy="300" r="5" fill={p.probes.r && dial === 'A~' ? '#D93A3A' : '#555'} />
                  <circle cx="125" cy="300" r="5" fill={p.probes.k ? '#20262D' : '#555'} stroke={p.probes.k ? '#fff' : 'none'} />
                  <circle cx="170" cy="300" r="5" fill={p.probes.r && dial !== 'A~' ? '#D93A3A' : '#555'} />
                  <text x="80" y="325" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">A</text>
                  <text x="125" y="325" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">COM</text>
                  <text x="170" y="325" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">VΩ</text>
                </g>
                <text x="125" y="272" textAnchor="middle" fontSize="7" fill="#fff" opacity=".8">clique le sélecteur pour le tourner</text>
              </>
            )}
          </svg>

          <div className="flex flex-wrap gap-1.5">
            {def.id === 'clamp' ? (
              <button
                type="button"
                data-pick="clamp"
                onClick={() => p.onPick('clamp')}
                className={`min-h-touch flex-1 rounded-[10px] border px-2 py-1.5 text-[11.5px] ${p.pick === 'clamp' ? 'border-accent ring-1 ring-accent' : 'border-[var(--line)]'} bg-[var(--surface)]`}
              >
                🔶 Serrer la pince sur un conducteur{p.clampLabel ? ` : ${p.clampLabel}` : ''}
              </button>
            ) : def.id === 'tach' ? null : (
              <>
                <button
                  type="button"
                  data-pick="r"
                  onClick={() => p.onPick('r')}
                  className={`min-h-touch flex-1 rounded-[10px] border px-2 py-1.5 text-left text-[11.5px] ${p.pick === 'r' ? 'border-accent ring-1 ring-accent' : 'border-[var(--line)]'} bg-[var(--surface)]`}
                >
                  <span className="text-crit">●</span> Pointe rouge{p.probes.r ? ` : ${short(p.probes.r)}` : ''}
                </button>
                <button
                  type="button"
                  data-pick="k"
                  onClick={() => p.onPick('k')}
                  className={`min-h-touch flex-1 rounded-[10px] border px-2 py-1.5 text-left text-[11.5px] ${p.pick === 'k' ? 'border-accent ring-1 ring-accent' : 'border-[var(--line)]'} bg-[var(--surface)]`}
                >
                  <span>●</span> Pointe noire{p.probes.k ? ` : ${short(p.probes.k)}` : ''}
                </button>
              </>
            )}
            <button
              type="button"
              data-pick="clear"
              onClick={p.onClear}
              aria-label="Retirer les pointes"
              className="min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px]"
            >
              ✕
            </button>
          </div>
          {p.pick && p.pick !== 'clamp' && (
            <Note>Clique maintenant une borne sur la platine pour y poser la pointe {p.pick === 'r' ? 'rouge' : 'noire'}.</Note>
          )}
          {p.pick === 'clamp' && <Note>Clique un conducteur sur la platine pour y serrer la pince.</Note>}
        </>
      )}
    </div>
  );
}
