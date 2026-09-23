'use client';
/**
 * Outil « placement » : poser des repères sur un plan ou une abaque, comme au crayon sur la
 * feuille (implantation de luminaires, croix sur un disque solaire…).
 *
 * Un clic sur l'image pose le symbole (dans la zone permise, dans la limite `max`) ; un clic sur
 * un repère (ou tout près) le retire. Vérification (entraînement) : repères verts (bien placés)
 * ou rouges, et positions attendues manquantes en pointillés. Copie remise : lecture seule,
 * toutes les positions attendues affichées. Champs complémentaires éventuels sous le plan.
 */
import { useRef, useState } from 'react';
import { etatPlacement, nomReperes } from '@/lib/sujet/correction';
import type { QPlacement as QPlacementDef } from '@/lib/sujet/types';
import { BOUTON, type OutilProps } from './outils';
import { ChampsValeur } from './QValeur';

/** Rayon (px écran) sous lequel un clic retire le repère voisin au lieu d'en poser un. */
const RAYON_RETRAIT = 14;

type Etat = 'neutre' | 'juste' | 'faux';
const COULEURS: Record<Etat, { trait: string; fond: string }> = {
  neutre: { trait: '#1B222C', fond: '#FFF3DB' },
  juste: { trait: '#1E9E63', fond: '#D7F5E3' },
  faux: { trait: '#D93A3A', fond: '#FDE8E6' },
};

/** Symbole dessiné (SVG 24 × 24 centré sur la position). */
function Symbole({ symbole, etat }: { symbole: QPlacementDef['symbole']; etat: Etat }) {
  const c = COULEURS[etat];
  const trait = symbole === 'croix' && etat === 'neutre' ? '#1F4FA3' : c.trait;
  return (
    <svg width="24" height="24" viewBox="-12 -12 24 24" aria-hidden className="block overflow-visible">
      {symbole === 'luminaire' && (
        <>
          <circle r="9" fill={c.fond} stroke={trait} strokeWidth="2" />
          <path d="M-6.4 -6.4 L6.4 6.4 M6.4 -6.4 L-6.4 6.4" stroke={trait} strokeWidth="1.2" />
        </>
      )}
      {symbole === 'croix' && (
        <path d="M-8 -8 L8 8 M8 -8 L-8 8" stroke={trait} strokeWidth="3" strokeLinecap="round" />
      )}
      {symbole === 'point' && <circle r="6" fill={trait} stroke="#fff" strokeWidth="2" />}
    </svg>
  );
}

export default function QPlacement({ q, r, onChange, readOnly, montrer }: OutilProps<'placement'>) {
  const points = r?.points ?? [];
  const valeurs = r?.valeurs ?? {};
  const max = q.max ?? q.attendus.length;
  const zoneRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { nom } = nomReperes(q, 2);
  const nom1 = nomReperes(q, 1).nom;

  const emettre = (pts: { x: number; y: number }[], vals: Record<string, string> = valeurs) =>
    onChange(q.champs?.length ? { type: 'placement', points: pts, valeurs: vals } : { type: 'placement', points: pts });

  const retirer = (i: number) => { setMsg(null); emettre(points.filter((_, k) => k !== i)); };

  const cliquer = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !zoneRef.current) return;
    const b = zoneRef.current.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return;
    const x = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
    const y = Math.min(1, Math.max(0, (e.clientY - b.top) / b.height));
    const proche = points.findIndex(p => Math.hypot((p.x - x) * b.width, (p.y - y) * b.height) < RAYON_RETRAIT);
    if (proche >= 0) { retirer(proche); return; }
    const z = q.zone;
    if (z && (x < z.x0 || x > z.x1 || y < z.y0 || y > z.y1)) { setMsg('Hors de la zone à compléter : clique à l’intérieur du cadre.'); return; }
    if (points.length >= max) { setMsg(`${max} ${max > 1 ? nom : nom1} au maximum : retire un repère pour le déplacer.`); return; }
    setMsg(null);
    emettre([...points, { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 }]);
  };

  const etat = montrer ? etatPlacement(q, points) : null;
  // Positions attendues en pointillés : toutes après la remise, celles qui manquent après une vérification ratée.
  const fantomes = !etat ? [] : readOnly ? q.attendus.map((_, j) => j) : etat.score < 0.999 ? etat.manquants : [];

  return (
    <div className="space-y-2" data-placement>
      <p className="text-[12px] text-muted">
        {readOnly
          ? `${points.length} ${points.length > 1 ? nom : nom1} posé${points.length > 1 ? 's' : ''}.`
          : <>Clique sur le plan pour poser {q.symbole === 'croix' ? 'la croix' : `un ${nom1}`} ; clique sur un repère pour le retirer. <b className="text-ink" data-compteur-placement>{points.length} / {max}</b> posé{points.length > 1 ? 's' : ''}.</>}
      </p>
      <div className="max-w-full p-1">
        <div
          ref={zoneRef}
          className={`relative select-none ${readOnly ? '' : 'cursor-crosshair'}`}
          style={{ width: '100%', maxWidth: q.plan.w }}
          onClick={cliquer}
          data-placement-zone
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={q.plan.src} alt={q.plan.alt} width={q.plan.w} height={q.plan.h} draggable={false}
            className="block h-auto w-full rounded-lg border border-line bg-white" />
          {q.zone && !readOnly && (
            <div className="pointer-events-none absolute rounded-sm border-2 border-dashed border-accent/60"
              style={{ left: `${q.zone.x0 * 100}%`, top: `${q.zone.y0 * 100}%`, width: `${(q.zone.x1 - q.zone.x0) * 100}%`, height: `${(q.zone.y1 - q.zone.y0) * 100}%` }} />
          )}
          {fantomes.map(j => {
            const a = q.attendus[j];
            return (
              <span key={`a${j}`} data-attendu={j} title={a.label ? `Attendu : ${a.label}` : 'Position attendue'}
                className="pointer-events-none absolute grid h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-dashed border-good bg-good/10"
                style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }} />
            );
          })}
          {points.map((p, i) => {
            const e: Etat = !etat ? 'neutre' : etat.apparies[i] != null ? 'juste' : 'faux';
            const style = { left: `${p.x * 100}%`, top: `${p.y * 100}%` };
            const cls = 'absolute grid h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full';
            return readOnly ? (
              <span key={i} className={`${cls} pointer-events-none`} style={style} data-repere={i} data-etat={e}>
                <Symbole symbole={q.symbole} etat={e} />
              </span>
            ) : (
              <button key={i} type="button" className={`${cls} hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent`} style={style}
                onClick={ev => { ev.stopPropagation(); retirer(i); }} aria-label={`Retirer le repère ${i + 1}`} data-repere={i} data-etat={e}>
                <Symbole symbole={q.symbole} etat={e} />
              </button>
            );
          })}
        </div>
      </div>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BOUTON} disabled={!points.length} onClick={() => { setMsg(null); emettre([]); }} data-effacer-placement>Tout effacer</button>
          {msg && <span className="text-[12px] font-semibold text-crit" role="status">{msg}</span>}
        </div>
      )}
      {etat && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-good bg-[#D7F5E3] align-middle" />bien placé</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-crit bg-[#FDE8E6] align-middle" />mal placé ou en trop</span>
          {fantomes.length > 0 && <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-good align-middle" />position attendue</span>}
        </p>
      )}
      {q.champs && q.champs.length > 0 && (
        <div className="pt-1">
          <ChampsValeur champs={q.champs} valeurs={valeurs} readOnly={readOnly} montrer={montrer}
            onFixer={(id, v) => emettre(points, { ...valeurs, [id]: v })} />
        </div>
      )}
    </div>
  );
}
