'use client';

/**
 * Bornes : point jaune + repère normalisé + halo tactile de 40 px (mobile).
 */
import React from 'react';
import type { Point } from '@/lib/scene/geometry';

export interface TerminalMark { id: string; pos: Point; label?: string; dx?: number; dy?: number }

export interface TerminalsProps {
  terminals: TerminalMark[];
  marks: boolean;
  highlighted?: Set<string>;
  pick?: boolean;
  onTerminal?: (id: string) => void;
}

export default function Terminals({ terminals, marks, highlighted, pick, onTerminal }: TerminalsProps) {
  return (
    <>
      {terminals.map((t) => {
        const hl = highlighted?.has(t.id) ? ' hl' : '';
        return (
          <React.Fragment key={t.id}>
            <div
              className={`se-term${hl}${pick ? ' pick' : ''}`}
              data-t={t.id}
              style={{ left: t.pos.x, top: t.pos.y }}
            />
            {marks && t.label ? (
              <div className="se-tmark" style={{ left: t.pos.x + (t.dx ?? 0), top: t.pos.y + (t.dy ?? 9) }}>
                {t.label}
              </div>
            ) : null}
            {onTerminal ? (
              <button
                type="button"
                className="se-hit"
                data-t={t.id}
                aria-label={`Borne ${t.id}`}
                style={{ left: t.pos.x, top: t.pos.y }}
                onClick={() => onTerminal(t.id)}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
}
