/**
 * Client Supabase « service role » — réservé au serveur (Route Handlers Node.js).
 *
 * ⚠️ Ce module ne doit JAMAIS être importé depuis un composant client : la clé de service
 * contourne entièrement la RLS. Le paquet `server-only` n'est pas installé sur ce projet,
 * la garde ci-dessous joue le même rôle à l'exécution.
 */
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

if (typeof window !== 'undefined') {
  throw new Error("Le client d'administration Supabase ne peut pas être utilisé côté navigateur.");
}

/** La clé de service est-elle configurée sur le serveur ? */
export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cached: SupabaseClient | null = null;

/**
 * Client à pleins pouvoirs (RLS contournée, API `auth.admin` disponible).
 * @throws si `SUPABASE_SERVICE_ROLE_KEY` manque — vérifier `hasServiceRole()` avant l'appel.
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error("Le client d'administration Supabase ne peut pas être utilisé côté navigateur.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("La clé de service Supabase n'est pas configurée sur le serveur.");
  if (cached) return cached;
  cached = createSupabaseClient(
    process.env.SUPABASE_URL || SUPABASE_URL,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return cached;
}
