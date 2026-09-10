/**
 * Identité de l'élève : nom, diplôme préparé, établissement.
 *
 * Deux sources possibles :
 * - connecté : la table `profiles` (`full_name`, `diploma`, `etablissement`, `onboarded`) ;
 * - mode démonstration (`NEXT_PUBLIC_DEMO_MODE=1`) : le `localStorage`, clé `simulelec.eleve`.
 */

import type { DiplomaId } from './data/competences';
import { DIPLOMAS } from './data/competences';

export interface Student {
  name: string;
  diploma: DiplomaId;
  etablissement: string;
}

export const STUDENT_KEY = 'simulelec.eleve';

/** Mode démonstration : ni Supabase ni persistance serveur. */
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export const DEFAULT_DIPLOMA: DiplomaId = 'bacpro';

export function isDiplomaId(v: unknown): v is DiplomaId {
  return typeof v === 'string' && DIPLOMAS.some(d => d.id === v);
}

export function diplomaShort(id: DiplomaId | null | undefined): string {
  return DIPLOMAS.find(d => d.id === id)?.short ?? 'Diplôme non renseigné';
}

export function diplomaName(id: DiplomaId | null | undefined): string {
  return DIPLOMAS.find(d => d.id === id)?.name ?? 'Diplôme non renseigné';
}

/** Lecture du profil local (mode démonstration), tolérante à un stockage indisponible. */
export function readLocalStudent(): Student | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STUDENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Student>;
    if (!parsed || typeof parsed.name !== 'string' || !isDiplomaId(parsed.diploma)) return null;
    return {
      name: parsed.name,
      diploma: parsed.diploma,
      etablissement: typeof parsed.etablissement === 'string' ? parsed.etablissement : '',
    };
  } catch {
    return null;
  }
}

export function writeLocalStudent(s: Student): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDENT_KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible : on continue sans mémoriser */
  }
}

/** Identité utilisée par le parcours et les rapports quand rien n'est renseigné. */
export function fallbackStudent(): Student {
  return { name: 'Élève', diploma: DEFAULT_DIPLOMA, etablissement: '' };
}
