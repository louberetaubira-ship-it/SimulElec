'use client';

/**
 * Journal des générations de TP (table `generation_logs`, migration 0009).
 * RLS : un professeur ne voit que ses lignes, l'administrateur les voit toutes.
 */
import { createClient } from '@/lib/supabase/client';
import type { DiplomaId } from '@/lib/data/competences';

/** Quota mensuel par professeur (doit rester aligné sur `QUOTA_MENSUEL` de la route). */
export const QUOTA_MENSUEL = 30;

/** Une génération journalisée. */
export interface GenerationRow {
  id: string;
  teacher_id: string;
  created_at: string;
  theme: string;
  diploma: DiplomaId | null;
  duree_ms: number;
  input_tokens: number;
  output_tokens: number;
  cout_estime: number;
  passes: number;
  anomalies: number;
  /** ok | anomalies | erreur | quota | refus */
  statut: string;
  tp_id: string | null;
}

const COLS =
  'id, teacher_id, created_at, theme, diploma, duree_ms, input_tokens, output_tokens, cout_estime, passes, anomalies, statut, tp_id';

/** Mes générations, les plus récentes d'abord. */
export async function listMyGenerations(limit = 50): Promise<GenerationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('generation_logs')
    .select(COLS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as GenerationRow[];
}

/** Consommation du mois en cours. */
export interface Quota {
  /** Générations déjà consommées ce mois-ci. */
  utilisees: number;
  /** Plafond mensuel. */
  plafond: number;
  /** Générations restantes. */
  restantes: number;
}

/** Quota mensuel du professeur connecté (fonction SQL `generation_quota`). */
export async function myQuota(): Promise<Quota> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { utilisees: 0, plafond: QUOTA_MENSUEL, restantes: QUOTA_MENSUEL };
  const { data, error } = await supabase.rpc('generation_quota', { uid: user.id });
  if (error) throw new Error(error.message);
  const utilisees = typeof data === 'number' ? data : 0;
  return { utilisees, plafond: QUOTA_MENSUEL, restantes: Math.max(0, QUOTA_MENSUEL - utilisees) };
}
