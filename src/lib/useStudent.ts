'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile } from './db/profiles';
import { DEMO, fallbackStudent, readLocalStudent, writeLocalStudent, type Student } from './student';

export interface StudentState {
  student: Student;
  /** Identité réellement renseignée (sinon on affiche la valeur de repli). */
  known: boolean;
  loading: boolean;
}

/**
 * Identité de l'élève côté client.
 * En mode démonstration, elle vient du `localStorage` ; sinon du profil Supabase.
 * `redirectTo` : chemin de retour si l'élève doit d'abord passer par `/bienvenue`.
 */
export function useStudent(redirectTo?: string): StudentState {
  const router = useRouter();
  const [state, setState] = useState<StudentState>({ student: fallbackStudent(), known: false, loading: true });

  useEffect(() => {
    let alive = true;

    const go = () => {
      if (!redirectTo) return;
      router.replace(`/bienvenue?next=${encodeURIComponent(redirectTo)}`);
    };

    async function load() {
      if (DEMO) {
        const local = readLocalStudent();
        if (!alive) return;
        if (local) setState({ student: local, known: true, loading: false });
        else { setState(s => ({ ...s, loading: false })); go(); }
        return;
      }
      try {
        const p = await getMyProfile();
        if (!alive) return;
        if (p?.diploma && p.full_name) {
          const student: Student = {
            name: p.full_name,
            diploma: p.diploma,
            etablissement: p.etablissement ?? '',
          };
          writeLocalStudent(student);
          setState({ student, known: true, loading: false });
        } else {
          setState(s => ({ ...s, loading: false }));
          go();
        }
      } catch {
        if (!alive) return;
        // hors-ligne : on retombe sur la dernière identité connue localement
        const local = readLocalStudent();
        setState({ student: local ?? fallbackStudent(), known: local != null, loading: false });
      }
    }

    void load();
    return () => { alive = false; };
  }, [redirectTo, router]);

  return state;
}
