import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

/**
 * Server Supabase client (Server Components, Route Handlers, Server Actions).
 * Cookie writes throw in Server Components — ignored on purpose, the middleware
 * refreshes the session for those requests.
 */
export function createClient(): SupabaseClient {
  const store = cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* called from a Server Component: ignore */
          }
        },
      },
    },
  );
}
