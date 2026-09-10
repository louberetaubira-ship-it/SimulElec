/**
 * Contrôles d'accès communs aux Route Handlers (serveur uniquement) :
 * session Supabase → rôle lu dans `profiles`.
 */
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { hasServiceRole } from '@/lib/supabase/admin';

export type Role = 'eleve' | 'professeur' | 'admin';

export interface Caller {
  id: string;
  email: string | null;
  role: Role;
  supabase: SupabaseClient;
}

/** Réponse JSON d'erreur, message en français. */
export function fail(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** 503 explicite quand la clé de service manque sur le serveur. */
export function requireServiceRole(): NextResponse | null {
  if (hasServiceRole()) return null;
  return fail("La clé de service Supabase n'est pas configurée sur le serveur.", 503);
}

/**
 * Résout l'appelant à partir du cookie de session, puis lit son rôle en base.
 * @returns le profil de l'appelant, ou une réponse d'erreur prête à être renvoyée.
 */
export async function currentCaller(): Promise<Caller | NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Vous devez être connecté.', 401);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return fail('Profil introuvable : ' + error.message, 500);
  const row = data as { id: string; email: string | null; role: Role } | null;
  if (!row) return fail('Profil introuvable.', 403);

  return { id: row.id, email: row.email, role: row.role, supabase };
}

/** L'appelant doit être administrateur. */
export async function requireAdmin(): Promise<Caller | NextResponse> {
  const caller = await currentCaller();
  if (caller instanceof NextResponse) return caller;
  if (caller.role !== 'admin') return fail('Cette action est réservée à l’administrateur.', 403);
  return caller;
}

/** L'appelant doit être professeur ou administrateur. */
export async function requireTeacher(): Promise<Caller | NextResponse> {
  const caller = await currentCaller();
  if (caller instanceof NextResponse) return caller;
  if (caller.role !== 'professeur' && caller.role !== 'admin') {
    return fail('Cette action est réservée aux professeurs.', 403);
  }
  return caller;
}
