import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

/** Routes requiring an authenticated user. */
const PROTECTED = ['/tp', '/atelier', '/prof', '/compte', '/bienvenue'];

/** Routes accessibles avant d'avoir renseigné identité et diplôme. */
const ONBOARDING_FREE = ['/bienvenue', '/login', '/auth', '/compte'];

/** Refreshes the Supabase session cookie and guards the protected routes. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !demo && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // Identité de l'élève : nom et diplôme préparé obligatoires avant d'entrer dans un TP.
  const free = ONBOARDING_FREE.some((p) => path === p || path.startsWith(`${p}/`));
  if (user && !demo && isProtected && !free) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('diploma, onboarded')
      .eq('id', user.id)
      .maybeSingle();
    const row = profile as { diploma: string | null; onboarded: boolean } | null;
    if (!row || !row.onboarded || !row.diploma) {
      const url = request.nextUrl.clone();
      url.pathname = '/bienvenue';
      url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}
