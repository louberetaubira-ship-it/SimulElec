'use client';

/**
 * Présence en ligne des élèves.
 *
 * `beat()` envoie un « battement » (RPC `presence_beat`, migration presence_online_tracking) :
 * il met à jour `profiles.last_seen_at` et ajoute le temps écoulé (plafonné à 120 s, coupures
 * de plus de 5 min ignorées) au cumul du jour dans `presence_daily`. Le composant
 * `Heartbeat` l'appelle toutes les 60 s tant qu'un onglet SimulElec est ouvert et visible.
 *
 * `presenceStats()` agrège `presence_daily` en secondes { aujourd'hui, semaine, total } par élève.
 */

import { createClient } from '@/lib/supabase/client';

/** En ligne = vu il y a moins de 2 minutes. */
export const ONLINE_MS = 2 * 60 * 1000;

/** Un battement : au nom de l'élève connecté (no-op si personne n'est connecté). */
export async function beat(): Promise<void> {
  try {
    await createClient().rpc('presence_beat');
  } catch {
    /* la présence est un confort, jamais bloquant */
  }
}

export interface PresenceStat {
  /** Secondes en ligne aujourd'hui (jour de Cayenne). */
  today: number;
  /** Secondes en ligne sur les 7 derniers jours. */
  week: number;
  /** Secondes en ligne au total. */
  total: number;
}

/** Date du jour au fuseau de Cayenne, au format YYYY-MM-DD (aligné sur `presence_beat`). */
function cayenneToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cayenne' });
}

/** Cumul de temps en ligne par élève, pour un ensemble d'identifiants. */
export async function presenceStats(studentIds: string[]): Promise<Record<string, PresenceStat>> {
  const out: Record<string, PresenceStat> = {};
  if (studentIds.length === 0) return out;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('presence_daily')
    .select('student_id, day, seconds')
    .in('student_id', studentIds);
  if (error || !data) return out;

  const today = cayenneToday();
  const weekAgo = new Date(Date.now() - 6 * 86400 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Cayenne' });

  (data as { student_id: string; day: string; seconds: number }[]).forEach((r) => {
    const s = (out[r.student_id] ??= { today: 0, week: 0, total: 0 });
    s.total += r.seconds;
    if (r.day >= weekAgo) s.week += r.seconds;
    if (r.day === today) s.today += r.seconds;
  });
  return out;
}

/** Temps formaté « 4 h 20 » / « 35 min ». */
export function formatDuree(seconds: number): string {
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h} h ${String(min).padStart(2, '0')}` : `${min} min`;
}
