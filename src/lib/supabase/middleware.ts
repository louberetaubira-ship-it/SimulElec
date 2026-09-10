import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

/** Routes exigeant un utilisateur connecté. */
const PROTECTED = ['/tp', '/atelier', '/prof', '/admin', '/moi', '/compte', '/bienvenue'];

/** Routes réservées aux professeurs et à l'administrateur. */
const TEACHER_ONLY = ['/prof', '/admin'];

/** Routes réservées à l'administrateur. */
const ADMIN_ONLY = ['/admin'];

/** Routes accessibles avant d'avoir renseigné identité et diplôme. */
const ONBOARDING_FREE = ['/bienvenue', '/login', '/auth', '/compte'];

function matches(path: string, routes: string[]): boolean {
  return routes.some((p) => path === p || path.startsWith(`${p}/`));
}

interface ProfileGuard {
  role: 'eleve' | 'professeur' | 'admin' | null;
  diploma: string | null;
  onboarded: boolean;
}

/** Rafraîchit le cookie de session Supabase et garde les routes protégées. */
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
  const isProtected = matches(path, PROTECTED);

  const redirect = (pathname: string, withNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = withNext ? `?next=${encodeURIComponent(path + request.nextUrl.search)}` : '';
    return NextResponse.redirect(url);
  };

  if (!user && !demo && isProtected) return redirect('/login', true);
  if (!user || demo || !isProtected) return response;

  // Une seule lecture du profil pour les trois gardes (rôle, onboarding, diplôme).
  const { data } = await supabase
    .from('profiles')
    .select('role, diploma, onboarded')
    .eq('id', user.id)
    .maybeSingle();
  const profile = (data as ProfileGuard | null) ?? { role: null, diploma: null, onboarded: false };
  const isTeacher = profile.role === 'professeur' || profile.role === 'admin';

  // Espaces réservés : un élève n'entre ni dans /prof ni dans /admin.
  if (matches(path, TEACHER_ONLY) && !isTeacher) return redirect('/tp');
  if (matches(path, ADMIN_ONLY) && profile.role !== 'admin') return redirect('/prof');

  // Identité de l'élève : diplôme préparé obligatoire avant d'entrer dans un TP.
  if (!isTeacher && !matches(path, ONBOARDING_FREE) && (!profile.onboarded || !profile.diploma)) {
    return redirect('/bienvenue', true);
  }

  return response;
}
