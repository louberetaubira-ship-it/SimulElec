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
  const vector = svgForKey(slot.key);
  if (vector) return vector;
  if (slot.item.src) return <img src={slot.item.src} alt={slot.slot.rep || slot.id} />;
  if (slot.key === 'trafo') return <img src="/sprites/trafo.png" alt="Transformateur de commande" />;
  const suffix = slot.item.switchable && (state === 'on' || state === 'off') ? `-${state}` : '';
  return <img src={`/sprites/${slot.key}${suffix}.png`} alt={slot.slot.rep || slot.id} />;
}

export default function Device({ slot, state, onClick }: DeviceProps) {
  const rep = slot.slot.group
    ? <div className="rep"><b>{slot.slot.mark}</b>{slot.slot.sub || ''}</div>
    : <div className="rep"><b>{slot.slot.rep || slot.id.toUpperCase()}</b></div>;
  const style: React.CSSProperties = { left: slot.x, top: slot.y, width: slot.w, height: slot.h };
  const inner = (
    <>
      {body(slot, state)}
      {state ? <span className={`st ${state}`}>{state === 'trip' ? '!' : state === 'on' ? 'I' : 'O'}</span> : null}
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
