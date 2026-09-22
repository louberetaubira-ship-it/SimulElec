'use client';
/**
 * Visualiseur du dossier technique (DTR) et des pages du sujet papier.
 * Onglets par section, liste de toutes les pages, page liée à la question ouverte
 * automatiquement, zoom, plein écran, flèches ← → au clavier.
 */
import { useEffect, useMemo, useState } from 'react';
import type { DtrPage } from '@/lib/sujet/types';
import { questionDe, useSujet, type PageVue } from '@/lib/sujet/store';

const SUJET = 'Sujet';

export default function DtrViewer({ onFermer }: { onFermer?: () => void }) {
  const sujet = useSujet(s => s.sujet);
  const page = useSujet(s => s.page);
  const courante = useSujet(s => s.st.courante);
  const voirPage = useSujet(s => s.voirPage);
  const [zoom, setZoom] = useState(1);
  const [plein, setPlein] = useState(false);

  const sections = useMemo(() => {
    const out: string[] = [];
    for (const p of sujet?.dtr ?? []) {
      const s = p.section ?? 'DTR';
      if (!out.includes(s)) out.push(s);
    }
    if (sujet?.pagesSujet.length) out.push(SUJET);
    return out;
  }, [sujet]);

  useEffect(() => { setZoom(1); }, [page.kind, page.num]);
  useEffect(() => {
    if (!plein) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlein(false); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [plein]);

  if (!sujet) return null;
  const q = questionDe(sujet, courante);
  const liste: DtrPage[] = page.kind === 'sujet' ? sujet.pagesSujet : sujet.dtr;
  const idx = Math.max(0, liste.findIndex(p => p.num === page.num));
  const cur = liste[idx];
  const section = page.kind === 'sujet' ? SUJET : (cur?.section ?? 'DTR');
  const pagesSection = section === SUJET ? sujet.pagesSujet : sujet.dtr.filter(p => (p.section ?? 'DTR') === section);
  const aller = (p: PageVue) => voirPage(p);
  const decaler = (d: number) => {
    const n = liste[idx + d];
    if (n) aller({ kind: page.kind, num: n.num });
  };
  const nom = (p: PageVue) => (p.kind === 'sujet' ? `Sujet p. ${p.num}` : `DTR ${p.num}`);

  return (
    <div
      className={`${plein ? 'fixed inset-0 z-[70]' : 'h-full'} flex flex-col bg-[#20262D] text-[#DFE5EC]`}
      onKeyDown={e => {
        if ((e.target as HTMLElement).tagName === 'SELECT') return;
        if (e.key === 'ArrowRight') decaler(1);
        if (e.key === 'ArrowLeft') decaler(-1);
      }}
      tabIndex={-1}
      data-dtr-viewer
    >
      {/* Sections */}
      <div className="flex flex-none flex-wrap items-center gap-1 border-b border-white/10 p-2">
        {sections.map(s => (
          <button key={s} type="button" onClick={() => {
            const first = s === SUJET ? sujet.pagesSujet[0] : sujet.dtr.find(p => (p.section ?? 'DTR') === s);
            if (first) aller({ kind: s === SUJET ? 'sujet' : 'dtr', num: first.num });
          }}
            className={`min-h-[30px] rounded-md px-2.5 text-[11.5px] font-semibold ${s === section ? 'bg-accent text-[#1B1B1B]' : 'bg-[#3C4654] text-white hover:bg-[#4A5666]'}`}>
            {s}
          </button>
        ))}
        <span className="flex-1" />
        {onFermer && (
          <button type="button" onClick={onFermer} className="grid h-8 w-8 place-items-center rounded-md bg-[#3C4654] text-white" aria-label="Fermer le DTR">✕</button>
        )}
      </div>

      {/* Pages de la section */}
      <div className="flex flex-none gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5">
        {pagesSection.map(p => {
          const on = p.num === page.num && (section === SUJET) === (page.kind === 'sujet');
          const lie = section !== SUJET && q?.dtr.includes(p.num);
          return (
            <button key={p.num} type="button" title={p.titre} onClick={() => aller({ kind: section === SUJET ? 'sujet' : 'dtr', num: p.num })}
              className={`min-h-[28px] min-w-[32px] flex-none rounded px-1.5 font-mono text-[11px] font-semibold ${on ? 'bg-white text-[#141A21]' : lie ? 'bg-accent/30 text-white ring-1 ring-accent' : 'bg-[#2E3744] text-[#C9D2DC] hover:bg-[#3C4654]'}`}
              data-page={`${section === SUJET ? 'sujet' : 'dtr'}-${p.num}`}>
              {p.num}
            </button>
          );
        })}
      </div>

      {/* Titre + outils */}
      <div className="flex flex-none flex-wrap items-center gap-1.5 px-2 py-1.5 text-[12px]">
        <button type="button" onClick={() => decaler(-1)} disabled={idx <= 0} className="grid h-8 w-8 place-items-center rounded-md bg-[#3C4654] disabled:opacity-40" aria-label="Page précédente">◂</button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white" data-dtr-titre>
            {nom(page)}{page.kind === 'dtr' ? ` / ${sujet.dtr.length}` : ''} · {cur?.titre ?? ''}
          </div>
        </div>
        <button type="button" onClick={() => decaler(1)} disabled={idx >= liste.length - 1} className="grid h-8 w-8 place-items-center rounded-md bg-[#3C4654] disabled:opacity-40" aria-label="Page suivante">▸</button>
        <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="grid h-8 w-8 place-items-center rounded-md bg-[#3C4654]" aria-label="Réduire">−</button>
        <button type="button" onClick={() => setZoom(1)} className="h-8 rounded-md bg-[#3C4654] px-1.5 font-mono text-[11px]" aria-label="Zoom : ajuster à la largeur">{Math.round(zoom * 100)} %</button>
        <button type="button" onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="grid h-8 w-8 place-items-center rounded-md bg-[#3C4654]" aria-label="Agrandir">+</button>
        <button type="button" onClick={() => setPlein(v => !v)} className="grid h-8 w-8 place-items-center rounded-md bg-[#3C4654]" aria-label={plein ? 'Quitter le plein écran' : 'Plein écran'} data-plein-ecran>
          {plein ? '⤡' : '⤢'}
        </button>
      </div>

      {/* Pages liées à la question + saut direct */}
      <div className="flex flex-none flex-wrap items-center gap-1 px-2 pb-1.5 text-[11px] text-[#9AA3AE]">
        {q && (
          <>
            <span>Q{q.num} :</span>
            {q.dtr.map(n => (
              <button key={n} type="button" onClick={() => aller({ kind: 'dtr', num: n })}
                className={`rounded px-1.5 py-0.5 font-semibold ${page.kind === 'dtr' && page.num === n ? 'bg-accent text-[#1B1B1B]' : 'bg-[#3C4654] text-white'}`}>DTR {n}</button>
            ))}
            <button type="button" onClick={() => aller({ kind: 'sujet', num: q.pageSujet })}
              className={`rounded px-1.5 py-0.5 font-semibold ${page.kind === 'sujet' && page.num === q.pageSujet ? 'bg-accent text-[#1B1B1B]' : 'bg-[#3C4654] text-white'}`}>sujet p. {q.pageSujet}</button>
          </>
        )}
        <span className="flex-1" />
        <select aria-label="Aller à une page" className="max-w-[170px] rounded bg-[#2E3744] px-1 py-1 text-[11px] text-white"
          value={`${page.kind}-${page.num}`}
          onChange={e => { const [k, n] = e.target.value.split('-'); aller({ kind: k === 'sujet' ? 'sujet' : 'dtr', num: Number(n) }); }}>
          {sections.map(s => (
            <optgroup key={s} label={s}>
              {(s === SUJET ? sujet.pagesSujet : sujet.dtr.filter(p => (p.section ?? 'DTR') === s)).map(p => (
                <option key={p.num} value={`${s === SUJET ? 'sujet' : 'dtr'}-${p.num}`}>{s === SUJET ? 'Sujet' : 'DTR'} {p.num} · {p.titre}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Image */}
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {cur ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={cur.src} src={cur.src} alt={`${nom(page)} — ${cur.titre}`} className="mx-auto block max-w-none rounded-md bg-white" style={{ width: `${zoom * 100}%` }} data-dtr-img />
        ) : (
          <p className="p-4 text-center text-[12px] text-[#9AA3AE]">Page introuvable.</p>
        )}
      </div>
    </div>
  );
}
