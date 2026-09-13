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

/**
 * Plaque à bornes. Le couplage n'est plus un bouton : l'élève pose les barrettes lui-même
 * en reliant les bornes, exactement comme il tire un fil.
 */
export function TerminalBox() {
  return <div className="se-tbox"><TerminalBoxSvg /></div>;
}

export default Motor;
