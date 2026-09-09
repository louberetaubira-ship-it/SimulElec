'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

let cached: SupabaseClient | null = null;

/** Browser Supabase client (singleton) — publishable key only, never a secret. */
export function createClient(): SupabaseClient {
  if (cached) return cached;
  cached = createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
  return cached;
}
