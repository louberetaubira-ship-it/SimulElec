/**
 * Retour d'un LIEN DE CONNEXION reçu par courriel (lien magique, invitation,
 * réinitialisation, confirmation d'adresse).
 *
 * Deux gabarits de courriel coexistent chez Supabase, et cette route couvre le
 * premier ; `/auth/callback` couvre le second :
 *
 *  · gabarit PERSONNALISÉ — le lien pointe directement ici avec `token_hash` et
 *    `type`, et c'est `verifyOtp` qui ouvre la session. C'est la forme conseillée
 *    pour une application rendue côté serveur : le jeton ne transite jamais dans
 *    le fragment d'URL, donc jamais dans l'historique du navigateur ;
 *  · gabarit PAR DÉFAUT — le lien passe d'abord par `/auth/v1/verify` chez
 *    Supabase, qui redirige ensuite vers `redirect_to` avec un code PKCE. Ce
 *    cas-là arrive sur `/auth/callback`, qui existait déjà pour Google.
 *
 * Pour activer le premier, remplacer l'URL du gabarit « Magic Link » par :
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * (voir `docs/connexion-courriel.md`).
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NON_AUTORISE =
  "Cette adresse n'est pas autorisée sur SimulElec. Demandez à l'administrateur de l'ajouter à la liste des professeurs.";

/** Types d'OTP acceptés : tout le reste est rejeté sans être transmis à Supabase. */
const TYPES: readonly EmailOtpType[] = ['magiclink', 'email', 'invite', 'recovery', 'email_change'];

function messageFor(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('autoris') || m.includes('42501') || m.includes('saving new user') || m.includes('database error')) {
    return NON_AUTORISE;
  }
  if (m.includes('expired')) return 'Ce lien de connexion a expiré. Demandez-en un nouveau.';
  if (m.includes('invalid') || m.includes('not found')) {
    return 'Ce lien de connexion n\'est plus valable. Il ne sert qu\'une fois : demandez-en un nouveau.';
  }
  // Panne de liaison avec Supabase : le message brut est un bruit de parseur
  // (« Unexpected token… is not valid JSON »). Inutile de l'infliger à un
  // professeur, et inutile d'exposer l'infrastructure.
  if (m.includes('json') || m.includes('fetch') || m.includes('network') || m.includes('econn')) {
    return 'Le service d\'authentification est momentanément injoignable. Réessayez dans un instant.';
  }
  return `La connexion a échoué : ${raw}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/tp';
  // Une redirection ouverte se glisserait ici si l'on suivait `next` tel quel.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/tp';

  const toLogin = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  const providerError = searchParams.get('error_description') ?? searchParams.get('error');
  if (providerError) return toLogin(messageFor(providerError));

  if (!tokenHash || !type || !TYPES.includes(type)) {
    return toLogin('Lien de connexion incomplet. Demandez-en un nouveau depuis la page de connexion.');
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return toLogin(messageFor(error.message));

  const forwardedHost = request.headers.get('x-forwarded-host');
  const base = process.env.NODE_ENV === 'production' && forwardedHost ? `https://${forwardedHost}` : origin;
  return NextResponse.redirect(`${base}${next}`);
}
