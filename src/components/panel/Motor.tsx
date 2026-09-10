'use client';

/**
 * Moteur asynchrone hors armoire et sa boîte à bornes (barrettes étoile / triangle).
 */
import React from 'react';
import { MotorSvg, TerminalBoxSvg } from './svg';

export interface MotorProps { rpm?: number; label?: string }

export function Motor({ rpm = 0, label }: MotorProps) {
  return <div className="se-motor"><MotorSvg rpm={rpm} label={label} /></div>;
}

export interface TerminalBoxProps { coupling: 'Y' | 'D'; onCoupling?: () => void }

export function TerminalBox({ coupling, onCoupling }: TerminalBoxProps) {
  if (!onCoupling) {
    return <div className="se-tbox"><TerminalBoxSvg coupling={coupling} /></div>;
  }
  return (
    <button type="button" className="se-tbox" title="Cliquer pour changer le couplage" onClick={onCoupling}>
      <TerminalBoxSvg coupling={coupling} />
    </button>
  );
}

export default Motor;
