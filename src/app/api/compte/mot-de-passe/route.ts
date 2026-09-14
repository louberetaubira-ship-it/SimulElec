/**
 * Changement de son PROPRE mot de passe.
 *
 * Deux choses doivent bouger ensemble : le mot de passe côté authentification,
 * et le drapeau `must_change_password` côté profil. Les séparer laisserait une
 * porte ouverte — la politique RLS « profiles self update » autorise chacun à
 * modifier son profil, donc un appel direct pourrait lever l'obligation sans
 * avoir rien changé. Ici, le drapeau ne tombe qu'APRÈS le mot de passe.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentCaller, fail, requireServiceRole } from '@/lib/api/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Longueur minimale. Assez pour résister, assez court pour être tapé sur un téléphone. */
const MIN = 10;

export async function POST(request: NextRequest) {
  const caller = await currentCaller();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < MIN) {
    return fail(`Le mot de passe doit faire au moins ${MIN} caractères.`, 400);
  }
  // Un mot de passe entièrement composé du même caractère passe la longueur sans
  // rien protéger.
  if (new Set(password).size < 4) {
    return fail('Le mot de passe est trop répétitif : variez les caractères.', 400);
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(caller.id, { password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('different from the old') || m.includes('same')) {
      return fail('Choisissez un mot de passe différent du précédent.', 400);
    }
    return fail('Changement impossible : ' + error.message, 500);
  }

  const { error: flagError } = await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', caller.id);
  // Le mot de passe est changé : le signaler comme un échec ferait recommencer
  // l'opération pour rien. On le dit, sans bloquer.
  if (flagError) {
    return NextResponse.json({ ok: true, avertissement: 'Mot de passe changé, mais l\'obligation n\'a pas pu être levée. Signalez-le à l\'administrateur.' });
  }

  return NextResponse.json({ ok: true });
}
