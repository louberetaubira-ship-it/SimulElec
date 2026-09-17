'use client';

/**
 * Visage du professeur virtuel : photo circulaire animée (respiration + anneau
 * qui tourne). L'émotion passe par la couleur de l'anneau — le visage, lui, est
 * une vraie photo (fixe). Réutilisé pour le coach flottant et le bouton du panneau.
 */
import React from 'react';
import type { CoachState } from '@/lib/prof/coach';

/** Couleur de l'anneau selon l'état (jetons du thème SimulElec). */
const RING: Record<CoachState, string> = {
  idle: 'var(--accent)',
  think: 'var(--accent)',
  guide: 'var(--warn)',
  comfort: 'var(--warn)',
  encourage: 'var(--good)',
  celebrate: 'var(--good)',
  safety: 'var(--crit)',
};

export default function ProfAvatar({
  state = 'idle', size = 56, ring = true, className = '',
}: { state?: CoachState; size?: number; ring?: boolean; className?: string }) {
  const c = RING[state];
  const pad = ring ? Math.max(3, Math.round(size * 0.06)) : 0;
  const spin = state === 'safety' ? '3.4s' : '9s';
  const breathe = state === 'safety' ? 'prof-pulse 1s' : 'prof-breathe 4.6s';
  return (
    <span
      className={`prof-avatar-breathe relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size, animation: `${breathe} ease-in-out infinite` }}
      aria-hidden
    >
      {ring && (
        <span
          className="prof-ring absolute inset-0 rounded-full"
          style={{
            padding: pad,
            background: `conic-gradient(from 0deg, ${c}, rgba(255,255,255,.55), ${c})`,
            animation: `prof-spin ${spin} linear infinite`,
          }}
        />
      )}
      <span
        className="absolute rounded-full bg-cover"
        style={{
          inset: pad,
          backgroundImage: 'url(/prof-avatar.png)',
          backgroundPosition: 'center 22%',
          boxShadow: 'inset 0 0 0 2px var(--surface)',
        }}
      />
    </span>
  );
}
