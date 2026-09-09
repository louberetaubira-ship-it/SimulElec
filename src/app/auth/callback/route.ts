import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Google OAuth landing: exchanges the PKCE code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/tp';
  const next = rawNext.startsWith('/') ? rawNext : '/tp';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const base = process.env.NODE_ENV === 'production' && forwardedHost ? `https://${forwardedHost}` : origin;
  return NextResponse.redirect(`${base}${next}`);
}
