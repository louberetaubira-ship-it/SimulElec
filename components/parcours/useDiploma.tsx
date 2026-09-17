'use client';

/**
 * Référentiel dans lequel l'élève est évalué.
 *
 * Chaîne de résolution : diplôme du profil → diplôme de la classe → niveau du TP →
 * valeur de repli (Bac Pro MELEC). Le professeur qui teste un TP « en élève » peut
 * forcer un autre référentiel sans changer de compte (aperçu, jamais persisté).
 */

import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { DIPLOMAS, diplomasFromLevel, type DiplomaId } from '@/lib/data/competences';
import { createClient } from '@/lib/supabase/client';
import { getMyProfile } from '@/lib/db/profiles';
import { DEFAULT_DIPLOMA, DEMO, isDiplomaId, type Student } from '@/lib/student';

export type DiplomaSource = 'profil' | 'classe' | 'tp' | 'defaut' | 'apercu';

export const SOURCE_LABEL: Record<DiplomaSource, string> = {
  profil: 'ton profil',
  classe: 'ta classe',
  tp: 'le niveau du TP',
  defaut: 'la valeur par défaut',
  apercu: 'l’aperçu professeur',
};

export interface DiplomaContext {
  /** Référentiel utilisé pour l'évaluation. */
  diploma: DiplomaId;
  source: DiplomaSource;
  /** Diplômes visés par le TP (vide si le TP n'en déclare aucun). */
  vises: DiplomaId[];
  /** Aperçu professeur : sélecteur de référentiel disponible. */
  apercu: boolean;
  override: DiplomaId | null;
  setOverride: (d: DiplomaId | null) => void;
}

/** « le CAP, le Bac Pro MELEC et le BTS » : énumération lisible des diplômes visés. */
export function diplomesVises(ids: DiplomaId[]): string {
  const noms = ids.map(v => `le ${DIPLOMAS.find(d => d.id === v)?.short ?? v}`);
  if (noms.length <= 1) return noms[0] ?? '';
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

/** Diplômes visés par un TP : ceux déclarés, sinon ceux déduits de son niveau. */
export function tpDiplomas(tp: TpDefinition): DiplomaId[] {
  const declared = (tp.diplomas ?? []).filter(isDiplomaId);
  return declared.length ? declared : diplomasFromLevel(tp.level);
}

export function useDiploma(tp: TpDefinition, student: Student, known: boolean): DiplomaContext {
  const [classDiploma, setClassDiploma] = React.useState<DiplomaId | null>(null);
  const [apercu, setApercu] = React.useState(false);
  const [override, setOverride] = React.useState<DiplomaId | null>(null);

  React.useEffect(() => {
    let alive = true;
    const fromUrl =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('apercu') === '1';
    if (fromUrl) setApercu(true);
    if (DEMO) return () => { alive = false; };

    (async () => {
      try {
        const p = await getMyProfile();
        if (!alive || !p) return;
        if (p.role === 'professeur' || p.role === 'admin') setApercu(true);
        if (!p.diploma && p.class_id) {
          const { data } = await createClient()
            .from('classes').select('diploma').eq('id', p.class_id).maybeSingle();
          const d = (data as { diploma?: string } | null)?.diploma;
          if (alive && isDiplomaId(d)) setClassDiploma(d);
        }
      } catch {
        /* hors-ligne : on reste sur la chaîne locale */
      }
    })();
    return () => { alive = false; };
  }, []);

  const vises = React.useMemo(() => tpDiplomas(tp), [tp]);

  const resolved = React.useMemo<{ diploma: DiplomaId; source: DiplomaSource }>(() => {
    if (override) return { diploma: override, source: 'apercu' };
    if (known && student.diploma) return { diploma: student.diploma, source: 'profil' };
    if (classDiploma) return { diploma: classDiploma, source: 'classe' };
    const fromTp = diplomasFromLevel(tp.level);
    if (fromTp.length) return { diploma: fromTp[0], source: 'tp' };
    return { diploma: DEFAULT_DIPLOMA, source: 'defaut' };
  }, [override, known, student.diploma, classDiploma, tp.level]);

  return { ...resolved, vises, apercu, override, setOverride };
}

/** Sélecteur de référentiel de l'aperçu professeur (les quatre diplômes). */
export function DiplomaPicker({
  value, onChange,
}: { value: DiplomaId; onChange: (d: DiplomaId | null) => void }) {
  return (
    <label className="no-print flex items-center gap-1.5 text-[11.5px] text-muted">
      <span className="hidden sm:inline">Aperçu professeur :</span>
      <select
        data-diploma-picker
        value={value}
        onChange={e => onChange(e.target.value as DiplomaId)}
        className="min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2 text-[11.5px] font-semibold text-ink"
      >
        {DIPLOMAS.map(d => <option key={d.id} value={d.id}>{d.short}</option>)}
      </select>
    </label>
  );
}
