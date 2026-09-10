import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const NON_AUTORISE =
  "Cette adresse Google n'est pas autorisée sur SimulElec. Demandez à l'administrateur de l'ajouter à la liste des professeurs.";

/**
 * Traduit l'erreur renvoyée par Supabase en message lisible.
 * Le refus de la liste blanche remonte du trigger `handle_new_user` (code 42501) sous la forme
 * d'une erreur d'enregistrement de l'utilisateur.
 */
function messageFor(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('autoris') || m.includes('42501') || m.includes('saving new user') || m.includes('database error')) {
    return NON_AUTORISE;
  }
  if (m.includes('expired') || m.includes('invalid')) {
    return 'Le lien de connexion a expiré. Réessayez.';
  }
  return `La connexion a échoué : ${raw}`;
}

/** Retour de Google : échange le code PKCE contre un cookie de session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/tp';
  const next = rawNext.startsWith('/') ? rawNext : '/tp';

  const toLogin = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  // Google peut renvoyer directement une erreur (accès refusé, adresse rejetée par le trigger).
  const providerError = searchParams.get('error_description') ?? searchParams.get('error');
  if (providerError) return toLogin(messageFor(providerError));

  if (!code) return toLogin('Lien de connexion incomplet. Réessayez depuis la page de connexion.');

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return toLogin(messageFor(error.message));

  const forwardedHost = request.headers.get('x-forwarded-host');
  const base = process.env.NODE_ENV === 'production' && forwardedHost ? `https://${forwardedHost}` : origin;
  return NextResponse.redirect(`${base}${next}`);
}
