'use client';

import { createClient } from '@/lib/supabase/client';
import { TPS } from '@/lib/data/tp-demarrage-direct';
import type { TpDefinition } from '@/lib/types';

export interface TpSummary {
  id: string;
  title: string;
  level: string | null;
  competences: string[];
  summary: string | null;
  published: boolean;
}

const fromCode = (t: TpDefinition): TpSummary => ({
  id: t.id,
  title: t.title,
  level: t.level,
  competences: t.competences,
  summary: t.summary,
  published: true,
});

/** TP catalogue from the database, falling back on the bundled definitions when the table is empty. */
export async function listTps(): Promise<TpSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tps')
    .select('id, title, level, competences, summary, published')
    .eq('published', true)
    .order('title');
  if (error || !data || data.length === 0) return TPS.map(fromCode);
  return data as TpSummary[];
}

/** Full definition: always the bundled one (the simulator needs the typed object). */
export function getTpDefinition(id: string): TpDefinition | undefined {
  return TPS.find((t) => t.id === id);
}
