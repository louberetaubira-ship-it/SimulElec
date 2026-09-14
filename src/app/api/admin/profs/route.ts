/**
 * Liste blanche des professeurs (`teacher_allowlist`) — réservé à l'administrateur.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireAdmin, requireServiceRole, type Role } from '@/lib/api/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AllowRow {
  email: string;
  google_email: string | null;
  full_name: string | null;
  role: Role;
  invited_by: string | null;
  created_at: string;
}

interface ProfileLite {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  last_seen_at: string | null;
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** GET — liste blanche complète, enrichie du profil correspondant quand le compte existe. */
export async function GET() {
  const caller = await requireAdmin();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  const admin = createAdminClient();
  const { data: allow, error } = await admin
    .from('teacher_allowlist')
    .select('email, google_email, full_name, role, invited_by, created_at')
    .order('created_at');
  if (error) return fail('Lecture de la liste blanche impossible : ' + error.message, 500);

  const rows = (allow ?? []) as AllowRow[];
  // Le profil peut avoir été créé par l'une OU l'autre des deux adresses : on
  // cherche les deux, sinon un professeur entré par Google apparaîtrait comme
  // « jamais connecté ».
  const emails = rows.flatMap((r) => [r.email, r.google_email].filter((x): x is string => Boolean(x)));
  const { data: profiles } = emails.length
    ? await admin.from('profiles').select('id, email, full_name, role, last_seen_at').in('email', emails)
    : { data: [] as ProfileLite[] };

  const byEmail = new Map<string, ProfileLite>();
  ((profiles ?? []) as ProfileLite[]).forEach((p) => {
    if (p.email) byEmail.set(p.email.toLowerCase(), p);
  });

  return NextResponse.json({
    profs: rows.map((r) => ({
      ...r,
      profile: byEmail.get(r.email.toLowerCase())
        ?? (r.google_email ? byEmail.get(r.google_email.toLowerCase()) ?? null : null),
    })),
  });
}

/** POST {email, full_name?, role?} — ajoute ou met à jour une adresse autorisée. */
export async function POST(request: NextRequest) {
  const caller = await requireAdmin();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { email?: unknown; google_email?: unknown; full_name?: unknown; role?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const valide = (a: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a);

  const email = normalizeEmail(body.email);
  if (!email || !valide(email)) return fail('Adresse électronique invalide.', 400);

  // L'adresse Google est facultative. Vide, elle est mise à null : une chaîne
  // vide passerait l'index unique une première fois et bloquerait la suivante.
  const googleEmail = normalizeEmail(body.google_email) || null;
  if (googleEmail && !valide(googleEmail)) return fail('Adresse Google invalide.', 400);
  if (googleEmail === email) {
    return fail('L\'adresse Google est la même que l\'adresse électronique : laissez le second champ vide.', 400);
  }
  const admin = createAdminClient();

  const role: Role = body.role === 'admin' ? 'admin' : 'professeur';

  // L'établissement n'a QU'UN administrateur. Ce n'est pas une limite technique
  // mais une règle d'organisation : l'administrateur ouvre et ferme les accès de
  // tous les autres, et cette responsabilité ne se partage pas. Promouvoir une
  // seconde personne se ferait ici, sans bruit, et la règle serait perdue.
  if (role === 'admin') {
    const { data: dejaAdmin } = await admin
      .from('teacher_allowlist')
      .select('email')
      .eq('role', 'admin')
      .neq('email', email)
      .maybeSingle();
    const existant = (dejaAdmin as { email: string } | null)?.email;
    if (existant) {
      return fail(
        `L'établissement n'a qu'un administrateur, et c'est ${existant}. Retirez-le d'abord si vous voulez transférer ce rôle.`,
        409,
      );
    }
  }
  const fullName = typeof body.full_name === 'string' && body.full_name.trim() ? body.full_name.trim() : null;

  // Une adresse Google déjà inscrite comme identité de référence d'une AUTRE
  // personne désignerait deux comptes à la fois. Le trigger sait trancher, mais
  // le refus vaut mieux que l'arbitrage silencieux.
  if (googleEmail) {
    const { data: collision } = await admin
      .from('teacher_allowlist')
      .select('email')
      .eq('email', googleEmail)
      .maybeSingle();
    if (collision) {
      return fail('Cette adresse Google est déjà inscrite comme adresse électronique d\'une autre personne.', 409);
    }
  }

  const { data, error } = await admin
    .from('teacher_allowlist')
    .upsert({ email, google_email: googleEmail, full_name: fullName, role, invited_by: caller.id }, { onConflict: 'email' })
    .select('email, google_email, full_name, role, invited_by, created_at')
    .single();
  if (error) return fail('Ajout impossible : ' + error.message, 500);

  // Le compte existe déjà : son rôle suit la liste blanche, par l'une ou l'autre adresse.
  const adresses = googleEmail ? [email, googleEmail] : [email];
  await admin.from('profiles').update({ role }).in('email', adresses);

  return NextResponse.json({ prof: data as AllowRow });
}

/** DELETE ?email= — retire une adresse de la liste blanche. */
export async function DELETE(request: NextRequest) {
  const caller = await requireAdmin();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  const email = normalizeEmail(new URL(request.url).searchParams.get('email'));
  if (!email) return fail('Adresse électronique manquante.', 400);
  if (caller.email && email === caller.email.toLowerCase()) {
    return fail('Vous ne pouvez pas retirer votre propre adresse.', 400);
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from('teacher_allowlist')
    .select('email, role')
    .eq('email', email)
    .maybeSingle();
  const row = target as { email: string; role: Role } | null;
  if (!row) return fail('Cette adresse ne figure pas dans la liste.', 404);

  if (row.role === 'admin') {
    const { count } = await admin
      .from('teacher_allowlist')
      .select('email', { count: 'exact', head: true })
      .eq('role', 'admin');
    if ((count ?? 0) <= 1) return fail('Impossible de retirer le dernier administrateur.', 400);
  }

  const { error } = await admin.from('teacher_allowlist').delete().eq('email', email);
  if (error) return fail('Suppression impossible : ' + error.message, 500);
  return NextResponse.json({ ok: true });
}
