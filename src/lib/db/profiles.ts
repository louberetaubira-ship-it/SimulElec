'use client';

import { createClient } from '@/lib/supabase/client';
import type { ProfileRow } from './types';

export async function getMyProfile(): Promise<ProfileRow | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProfileRow | null) ?? null;
}

export type ProfilePatch = Partial<Pick<ProfileRow, 'full_name' | 'etablissement' | 'avatar_url'>>;

export async function updateProfile(patch: ProfilePatch): Promise<ProfileRow> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Session expirée : reconnecte-toi.');
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

/** RPC join_class(code) — attaches the student to a class from its join code. */
export async function joinClass(code: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('join_class', { code: code.trim().toUpperCase() });
  if (error) throw new Error(error.message);
  return String(data ?? '');
}
