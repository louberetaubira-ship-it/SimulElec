'use client';

import React from 'react';
import { spriteUrl } from '@/lib/data/catalogue';
import type { SlotBox } from '@/lib/sim/layout';

export type DeviceStatus = 'on' | 'off' | 'trip' | null;

interface Props {
  box: SlotBox;
  status: DeviceStatus;
  /** sprite d'état pour les appareils commutables */
  spriteState?: 'on' | 'off';
  glow?: 'green' | 'red' | null;
  interactive: boolean;
  onClick?: () => void;
  onButton?: (b: 's1' | 's2') => void;
  showButtons?: boolean;
}

const STATUS_BG: Record<Exclude<DeviceStatus, null>, string> = {
  on: 'var(--good)', off: '#6B7683', trip: 'var(--crit)',
};

export default function Device({ box, status, spriteState, glow, interactive, onClick, onButton, showButtons }: Props) {
  const [head, ...rest] = box.slot.label.split(' · ');
  const src = spriteState && box.item.switchable ? spriteUrl(box.item.key, spriteState) : spriteUrl(box.item.key);

  return (
    <div
      className="absolute"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h, cursor: interactive ? 'pointer' : 'default' }}
      onClick={interactive ? onClick : undefined}
      data-slot={box.slot.id}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="se-dev-img pointer-events-none block h-full w-full object-contain"
        src={src}
        width={box.item.w}
        height={box.item.h}
        alt={box.slot.label}
        draggable={false}
      />

      {glow && (
        <div
          className="pointer-events-none absolute left-[22%] w-[56%] rounded-full"
          style={{
            top: '31%', aspectRatio: '1',
            background: glow === 'green'
              ? 'radial-gradient(circle, rgba(80,255,120,.95), rgba(80,255,120,0) 70%)'
              : 'radial-gradient(circle, rgba(255,70,60,.95), rgba(255,70,60,0) 70%)',
          }}
        />
      )}

      {status && (
        <span
          className={`absolute -right-1.5 grid h-[15px] w-[15px] place-items-center rounded-full border-2 border-white font-mono-num text-[8px] font-bold text-white ${status === 'trip' ? 'se-blink' : ''}`}
          style={{ top: '36%', background: STATUS_BG[status], boxShadow: '0 1px 3px rgba(0,0,0,.4)' }}
        >
          {status === 'trip' ? '!' : status === 'on' ? 'I' : 'O'}
        </span>
      )}

      {showButtons && onButton && (
        <>
          <button
            type="button"
            aria-label="S2 — bouton marche (vert)"
            className="absolute inset-x-0 cursor-pointer"
            style={{ top: '16%', height: '34%' }}
            onClick={e => { e.stopPropagation(); onButton('s2'); }}
          />
          <button
            type="button"
            aria-label="S1 — bouton arrêt (rouge)"
            className="absolute inset-x-0 cursor-pointer"
            style={{ top: '52%', height: '34%' }}
            onClick={e => { e.stopPropagation(); onButton('s1'); }}
          />
        </>
      )}

      {/* Repérage : bornes de bornier = repère court + conducteur ; appareils = désignation + rôle,
          sur deux lignes au plus pour ne pas déborder sur le voisin. */}
      {box.slot.mark ? (
        <div
          className="pointer-events-none absolute left-1/2 top-full z-[3] mt-1.5 -translate-x-1/2 text-center leading-none text-[#20262D]"
          style={{ width: box.w + 4, textShadow: '0 0 3px #fff, 0 0 3px #fff' }}
        >
          <b className="block font-mono-num text-[9px] font-bold">{box.slot.mark}</b>
          {box.slot.sub && (
            <span className="mt-0.5 block font-mono-num text-[7px] font-semibold text-[#4A5560]">{box.slot.sub}</span>
          )}
        </div>
      ) : (
        <div
          className="pointer-events-none absolute left-1/2 top-full z-[3] mt-2 -translate-x-1/2 text-center text-[7px] font-bold uppercase leading-[1.15] tracking-[.03em] text-[#20262D]"
          style={{ width: Math.max(box.w + 8, 36), textShadow: '0 0 3px #fff, 0 0 3px #fff' }}
        >
          <b className="block font-mono-num text-[9px]">{head}</b>
          <span className="line-clamp-2 block">{rest.join(' · ')}</span>
        </div>
      )}
    </div>
  );
}
