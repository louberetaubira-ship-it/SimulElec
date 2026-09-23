'use client';
/**
 * Schéma à compléter, mode « traits à poser » : l'image du sujet, ses bornes cliquables
 * et les traits de couleur posés par l'élève, comme au stylo sur la feuille.
 *  - clic sur une borne A puis une borne B : un trait de la couleur choisie ;
 *  - clic sur un trait : il s'efface ; « Annuler » retire le dernier ;
 *  - `verif` : traits justes / de mauvaise couleur / faux, liaisons manquantes en pointillé ;
 *  - lecture seule : l'image du corrigé s'affiche à côté (si fournie).
 */
import { useMemo, useRef, useState } from 'react';
import type { SchemaTraitsDef, TraitPose } from '@/lib/sujet/types';
import type { SchemaTraitsPublic } from '@/lib/sujet/public';
import { cleLiaison } from '@/lib/sujet/correction-base';
import type { EtatTraits } from '@/lib/sujet/correction';
import { BOUTON } from './outils';

interface Props {
  /** Définition publique (sans liaisons attendues) ; les attendues ne servent qu'à la vue professeur. */
  def: SchemaTraitsPublic & Partial<Pick<SchemaTraitsDef, 'attendues' | 'reseaux'>>;
  traits: TraitPose[];
  onChange?: (t: TraitPose[]) => void;
  readOnly: boolean;
  verif: EtatTraits | null;
  corrige?: { src: string; alt: string } | null;
}

export default function SchemaTraits({ def, traits, onChange, readOnly, verif, corrige }: Props) {
  const [couleur, setCouleur] = useState(def.couleurs[0]?.id ?? 'noir');
  const [premiere, setPremiere] = useState<string | null>(null);
  const [curseur, setCurseur] = useState<{ x: number; y: number } | null>(null);
  const [reperes, setReperes] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const { w, h } = def.image;

  const bornes = useMemo(() => new Map(def.bornes.map(b => [b.id, b])), [def.bornes]);
  const css = useMemo(() => new Map(def.couleurs.map(c => [c.id, c.css])), [def.couleurs]);
  const px = (id: string) => {
    const b = bornes.get(id);
    return b ? { x: (b.x / 100) * w, y: (b.y / 100) * h } : null;
  };

  const cliquerBorne = (id: string) => {
    if (readOnly || !onChange) return;
    if (!premiere) { setPremiere(id); return; }
    if (premiere !== id) {
      const k = cleLiaison(premiere, id);
      // Un seul trait par paire : reposer la même liaison change sa couleur.
      const reste = traits.filter(t => cleLiaison(t.a, t.b) !== k);
      onChange([...reste, { a: premiere, b: id, couleur }]);
    }
    setPremiere(null);
  };
  const effacer = (i: number) => { if (!readOnly && onChange) onChange(traits.filter((_, k) => k !== i)); };

  const bouger = (e: React.PointerEvent) => {
    if (!premiere || !zone.current) return;
    const r = zone.current.getBoundingClientRect();
    setCurseur({ x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h });
  };

  const etatDe = (t: TraitPose): 'juste' | 'couleur' | 'faux' | null => {
    if (!verif) return null;
    const k = cleLiaison(t.a, t.b);
    if (verif.justes.has(k)) return 'juste';
    if (verif.mauvaiseCouleur.has(k)) return 'couleur';
    if (verif.fausses.has(k)) return 'faux';
    return null;
  };
  const HALO = { juste: '#1E9E63', couleur: '#E39A00', faux: '#D93A3A' } as const;
  const p0 = premiere ? px(premiere) : null;

  const schema = (
    <div>
      <div
        ref={zone}
        className="relative w-full touch-manipulation select-none overflow-hidden rounded-lg border border-line bg-white"
        style={{ aspectRatio: `${w} / ${h}` }}
        onPointerMove={bouger}
        onPointerLeave={() => setCurseur(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={def.image.src} alt={def.image.alt} className="absolute inset-0 h-full w-full" draggable={false} />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
          {verif && (def.attendues ?? []).filter(l => verif.manquantes.has(cleLiaison(l.a, l.b))).map((l, i) => {
            const a = px(l.a); const b = px(l.b);
            if (!a || !b) return null;
            return <line key={`m${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={l.couleur ? css.get(l.couleur) ?? '#66717F' : '#66717F'}
              strokeOpacity={0.75} strokeWidth={2.5} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />;
          })}
          {traits.map((t, i) => {
            const a = px(t.a); const b = px(t.b);
            if (!a || !b) return null;
            const e = etatDe(t);
            return (
              <g key={`${t.a}-${t.b}-${i}`}>
                {e && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={HALO[e]} strokeOpacity={0.35} strokeWidth={10} vectorEffect="non-scaling-stroke" strokeLinecap="round" />}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={css.get(t.couleur) ?? '#141A21'} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinecap="round"
                  strokeDasharray={e === 'faux' ? '7 4' : undefined} />
                {!readOnly && (
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onClick={() => effacer(i)} data-trait={`${t.a}|${t.b}`}>
                    <title>Effacer ce trait</title>
                  </line>
                )}
              </g>
            );
          })}
          {p0 && curseur && (
            <line x1={p0.x} y1={p0.y} x2={curseur.x} y2={curseur.y} stroke={css.get(couleur) ?? '#141A21'} strokeOpacity={0.6} strokeWidth={2}
              strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {def.bornes.map(b => (
          <button
            key={b.id}
            type="button"
            title={b.label}
            aria-label={`Borne ${b.label}`}
            disabled={readOnly}
            onClick={() => cliquerBorne(b.id)}
            data-borne={b.id}
            className="group absolute z-10 grid h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center disabled:cursor-default"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <span className={`block h-[13px] w-[13px] rounded-full border-2 transition ${premiere === b.id ? 'scale-125 border-accent bg-accent' : 'border-[#2F6FD1] bg-white/90 group-hover:bg-[#2F6FD1]/30'} ${readOnly ? 'opacity-60' : ''}`} />
            {(reperes || premiere === b.id) && (
              <span className="pointer-events-none absolute left-[22px] top-[-4px] whitespace-nowrap rounded bg-[#1B222C]/85 px-1 font-mono text-[10px] text-white">{b.label}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-semibold text-muted">Couleur du stylo</span>
          {def.couleurs.map(c => (
            <button key={c.id} type="button" onClick={() => setCouleur(c.id)} aria-pressed={couleur === c.id} data-couleur={c.id}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold ${couleur === c.id ? 'border-accent bg-accent/15' : 'border-line bg-surface'}`}>
              <span className="h-3 w-5 rounded-sm" style={{ background: c.css }} />{c.label}
            </button>
          ))}
          <span className="flex-1" />
          <button type="button" className={BOUTON} disabled={traits.length === 0} onClick={() => onChange?.(traits.slice(0, -1))}>↶ Annuler</button>
          <button type="button" className={BOUTON} onClick={() => setReperes(v => !v)} aria-pressed={reperes}>{reperes ? 'Masquer' : 'Afficher'} les repères</button>
        </div>
      )}
      {!readOnly && (
        <p className="text-[12px] text-muted">
          {premiere
            ? <>Borne <b>{bornes.get(premiere)?.label}</b> choisie : clique la borne d’arrivée (ou la même pour annuler).</>
            : 'Clique une borne puis une autre : le trait se pose avec la couleur choisie. Clique un trait pour l’effacer.'}
        </p>
      )}
      {readOnly && corrige ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">Ton schéma</div>{schema}</div>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">Corrigé officiel</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={corrige.src} alt={corrige.alt} className="w-full rounded-lg border border-line bg-white" />
          </div>
        </div>
      ) : schema}
      {verif?.reseaux && (
        <div className="flex flex-wrap gap-3 text-[12px]" data-verif-reseaux>
          <span><b className={verif.reseaux.complets === verif.reseaux.total ? 'text-good' : ''}>{verif.reseaux.complets}/{verif.reseaux.total}</b> réseaux complets</span>
          {verif.reseaux.couleurFausse > 0 && <span><b className="text-accent-ink">{verif.reseaux.couleurFausse}</b> réseau{verif.reseaux.couleurFausse > 1 ? 'x' : ''} de mauvaise couleur (½)</span>}
          {verif.fausses.size > 0 && <span><b className="text-crit">{verif.fausses.size}</b> trait{verif.fausses.size > 1 ? 's' : ''} entre réseaux différents (en pointillé rouge)</span>}
          {verif.manquantes.size > 0 && <span><b>{verif.manquantes.size}</b> liaison{verif.manquantes.size > 1 ? 's' : ''} manquante{verif.manquantes.size > 1 ? 's' : ''} (en pointillé)</span>}
          <span className="text-muted">un réseau est juste dès que toutes ses bornes sont reliées, quel que soit le tracé</span>
        </div>
      )}
      {verif && !verif.reseaux && (
        <div className="flex flex-wrap gap-3 text-[12px]">
          <span><b className="text-good">{verif.justes.size}</b> juste{verif.justes.size > 1 ? 's' : ''}</span>
          {verif.mauvaiseCouleur.size > 0 && <span><b className="text-accent-ink">{verif.mauvaiseCouleur.size}</b> de mauvaise couleur (½)</span>}
          {verif.fausses.size > 0 && <span><b className="text-crit">{verif.fausses.size}</b> fausse{verif.fausses.size > 1 ? 's' : ''} (en pointillé rouge)</span>}
          {verif.manquantes.size > 0 && <span><b>{verif.manquantes.size}</b> manquante{verif.manquantes.size > 1 ? 's' : ''} (en pointillé)</span>}
          {verif.total > 0 && <span className="text-muted">sur {verif.total} liaisons attendues</span>}
        </div>
      )}
      {traits.length > 0 && (
        <details className="text-[12px]">
          <summary className="cursor-pointer text-muted">{traits.length} trait{traits.length > 1 ? 's' : ''} posé{traits.length > 1 ? 's' : ''} (liste)</summary>
          <ul className="mt-1 flex flex-wrap gap-1">
            {traits.map((t, i) => (
              <li key={i} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px]">
                <span className="h-2.5 w-4 rounded-sm" style={{ background: css.get(t.couleur) ?? '#141A21' }} />
                {bornes.get(t.a)?.label ?? t.a} — {bornes.get(t.b)?.label ?? t.b}
                {!readOnly && <button type="button" onClick={() => effacer(i)} aria-label="Effacer ce trait" className="ml-0.5 text-muted hover:text-crit">✕</button>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
