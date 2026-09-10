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
    .select('email, full_name, role, invited_by, created_at')
    .order('created_at');
  if (error) return fail('Lecture de la liste blanche impossible : ' + error.message, 500);

  const rows = (allow ?? []) as AllowRow[];
  const emails = rows.map((r) => r.email);
  const { data: profiles } = emails.length
    ? await admin.from('profiles').select('id, email, full_name, role, last_seen_at').in('email', emails)
    : { data: [] as ProfileLite[] };

  const byEmail = new Map<string, ProfileLite>();
  ((profiles ?? []) as ProfileLite[]).forEach((p) => {
    if (p.email) byEmail.set(p.email.toLowerCase(), p);
  });

  return NextResponse.json({
    profs: rows.map((r) => ({ ...r, profile: byEmail.get(r.email.toLowerCase()) ?? null })),
  });
}

/** POST {email, full_name?, role?} — ajoute ou met à jour une adresse autorisée. */
export async function POST(request: NextRequest) {
  const caller = await requireAdmin();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { email?: unknown; full_name?: unknown; role?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }

  const email = normalizeEmail(body.email);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return fail('Adresse électronique invalide.', 400);
  }
  const role: Role = body.role === 'admin' ? 'admin' : 'professeur';
  const fullName = typeof body.full_name === 'string' && body.full_name.trim() ? body.full_name.trim() : null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('teacher_allowlist')
    .upsert({ email, full_name: fullName, role, invited_by: caller.id }, { onConflict: 'email' })
    .select('email, full_name, role, invited_by, created_at')
    .single();
  if (error) return fail('Ajout impossible : ' + error.message, 500);

  // Le compte existe déjà : son rôle suit la liste blanche.
  await admin.from('profiles').update({ role }).eq('email', email);

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
