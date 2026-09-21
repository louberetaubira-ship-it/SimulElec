'use client';
/* eslint-disable @next/next/no-img-element -- sprites servis depuis public/sprites et data URI de bibliothèque */

/**
 * Un appareil posé sur un rail (photo du pack, image de bibliothèque ou dessin vectoriel),
 * avec sa pastille d'état et son repère.
 */
import React from 'react';
import type { ResolvedSlot } from '@/lib/scene/route';
import { svgForKey } from './svg';

export type DeviceState = 'on' | 'off' | 'trip';

export interface DeviceProps {
  slot: ResolvedSlot;
  state?: DeviceState;
  onClick?: (slotId: string) => void;
}

/** Corps de l'appareil : vectoriel, data URI de bibliothèque, ou sprite photo. */
function body(slot: ResolvedSlot, state?: DeviceState): React.ReactNode {
  // L'onduleur MultiPlus n'allume son afficheur que lorsqu'il est en marche.
  const vector = svgForKey(slot.key, state === 'on');
  if (vector) return vector;
  if (slot.item.src) return <img src={slot.item.src} alt={slot.slot.rep || slot.id} />;
  if (slot.key === 'trafo') return <img src="/sprites/trafo.png" alt="Transformateur de commande" />;
  const suffix = slot.item.switchable && (state === 'on' || state === 'off') ? `-${state}` : '';
  return <img src={`/sprites/${slot.key}${suffix}.png`} alt={slot.slot.rep || slot.id} />;
}

/**
 * Hauteur de la pastille d'état (I / O / !), posée sur le bord droit de l'appareil.
 *
 * Par défaut à 36 % de la hauteur. Mais un contacteur à bloc additif porte ses
 * bornes 53-54 sur ce même bord (LC1D + LADN11 : 53 à 30 %, 54 à 70 %) : la
 * pastille tombait sur la borne 53 et la masquait. On prend la première hauteur
 * libre, à distance de toute borne du bord droit.
 */
function hauteurPastille(slot: ResolvedSlot): string {
  const bord = slot.terminals.filter(t => t.fx > 0.8).map(t => t.fy);
  const marge = Math.max(0.18, 20 / Math.max(1, slot.h));
  const libre = [0.36, 0.43, 0.2, 0.6].find(y => bord.every(fy => Math.abs(fy - y - 0.07) > marge));
  return `${Math.round((libre ?? 0.36) * 100)}%`;
}

export default function Device({ slot, state, onClick }: DeviceProps) {
  const rep = slot.slot.group
    ? <div className="rep"><b>{slot.slot.mark}</b>{slot.slot.sub || ''}</div>
    : <div className="rep"><b>{slot.slot.rep || slot.id.toUpperCase()}</b></div>;
  const style: React.CSSProperties = { left: slot.x, top: slot.y, width: slot.w, height: slot.h };
  const inner = (
    <>
      {body(slot, state)}
      {state ? (
        <span className={`st ${state}`} style={{ top: hauteurPastille(slot) }}>
          {state === 'trip' ? '!' : state === 'on' ? 'I' : 'O'}
        </span>
      ) : null}
      {rep}
    </>
  );
  if (!onClick) return <div className="se-dev static" data-id={slot.id} style={style}>{inner}</div>;
  return (
    <button
      type="button"
      className="se-dev"
      data-id={slot.id}
      style={style}
      aria-label={slot.slot.rep || slot.id}
      onClick={() => onClick(slot.id)}
    >
      {inner}
    </button>
  );
}
