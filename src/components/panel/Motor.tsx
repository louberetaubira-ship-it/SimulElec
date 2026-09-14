'use client';

/**
 * Moteur asynchrone hors armoire et sa boîte à bornes (barrettes étoile / triangle).
 */
import React from 'react';
import { MotorSvg, TerminalBoxSvg } from './svg';

export interface MotorProps { rpm?: number; label?: string; y?: number }

export function Motor({ rpm = 0, label, y }: MotorProps) {
  return <div className="se-motor" style={{ top: y }}><MotorSvg rpm={rpm} label={label} /></div>;
}

/**
 * Plaque à bornes. Le couplage n'est plus un bouton : l'élève pose les barrettes lui-même
 * en reliant les bornes, exactement comme il tire un fil.
 */
export function TerminalBox({ y }: { y?: number }) {
  return <div className="se-tbox" style={{ top: y }}><TerminalBoxSvg /></div>;
}

export default Motor;
