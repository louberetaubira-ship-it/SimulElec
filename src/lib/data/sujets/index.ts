/**
 * Sujets numériques disponibles (copies conformes de sujets d'examen).
 * Chaque sujet est un fichier de données de ce dossier ; le moteur est dans `src/lib/sujet/`.
 */
import type { SujetNumerique } from '@/lib/sujet/types';
import { CGM2021_EIP } from './cgm2021-eip';

export const SUJETS: SujetNumerique[] = [CGM2021_EIP];

export const sujetById = (id: string): SujetNumerique | undefined => SUJETS.find(s => s.id === id);
