'use client';

/**
 * Coffret de porte XALD 4 trous : voyants H1 (vert, marche) et H2 (rouge, défaut),
 * boutons S2 (marche) et S1 (arrêt), bornes repérées sur le bord droit.
 */
import React from 'react';

export interface StationProps {
  h1: boolean;
  h2: boolean;
  onButton?: (b: 's1' | 's2', down: boolean) => void;
}

export default function Station({ h1, h2, onButton }: StationProps) {
  const press = (b: 's1' | 's2', down: boolean) => () => onButton?.(b, down);
  return (
    <div className="se-station">
      <div className={`lamp g${h1 ? ' on' : ''}`} />
      <span className="lb" style={{ top: 6 }}>H1 X1</span>
      <span className="lb" style={{ top: 22 }}>H1 X2</span>
      <div className={`lamp r${h2 ? ' on' : ''}`} />
      <span className="lb" style={{ top: 48 }}>H2 X1</span>
      <span className="lb" style={{ top: 64 }}>H2 X2</span>
      <button
        type="button" className="btn g" data-btn="s2" aria-label="S2 marche"
        onPointerDown={press('s2', true)} onPointerUp={press('s2', false)}
        onPointerLeave={press('s2', false)} onClick={() => { onButton?.('s2', true); onButton?.('s2', false); }}
      />
      <span className="lb" style={{ top: 96 }}>S2 13</span>
      <span className="lb" style={{ top: 112 }}>S2 14</span>
      <button
        type="button" className="btn r" data-btn="s1" aria-label="S1 arrêt"
        onPointerDown={press('s1', true)} onPointerUp={press('s1', false)}
        onPointerLeave={press('s1', false)} onClick={() => { onButton?.('s1', true); onButton?.('s1', false); }}
      />
      <span className="lb" style={{ top: 140 }}>S1 21</span>
      <span className="lb" style={{ top: 156 }}>S1 22</span>
      <div className="cap"><b>S1 S2 H1 H2</b>coffret de porte XALD</div>
    </div>
  );
}
