/**
 * Création EN MASSE de comptes élèves à partir d'une liste vérifiée par le
 * professeur (import d'une classe). Même règle qu'à l'unité : identifiant
 * `nom.prenom` (suffixé en cas d'homonyme), mot de passe lisible. Le professeur
 * a pu régler le mot de passe côté client ; on l'accepte s'il respecte le
 * format attendu, sinon on en génère un.
 *
 * Renvoie une ligne par élève : { last_name, first_name, login, password, ok, error }.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fail, requireServiceRole, requireTeacher } from '@/lib/api/auth';
import { classSlug, emailFor, generatePassword, loginFor, slugName } from '@/lib/eleves';
import type { DiplomaId } from '@/lib/data/competences';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ClassLite {
  id: string;
  name: string;
  diploma: DiplomaId | null;
  teacher_id: string;
}
interface InEleve { last_name?: unknown; first_name?: unknown; password?: unknown }
interface OutEleve {
  last_name: string; first_name: string;
  login?: string; password?: string; ok: boolean; error?: string;
}

/** Mot de passe élève acceptable : lettres/chiffres + tiret + 2-3 chiffres. */
const PW_OK = /^[a-z0-9]{3,14}-\d{2,3}$/;

export async function POST(request: NextRequest) {
  const caller = await requireTeacher();
  if (caller instanceof NextResponse) return caller;
  const missing = requireServiceRole();
  if (missing) return missing;

  let body: { class_id?: unknown; students?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Requête illisible.', 400);
  }
  const classId = typeof body.class_id === 'string' ? body.class_id.trim() : '';
  const list = Array.isArray(body.students) ? (body.students as InEleve[]) : [];
  if (!classId) return fail('Classe manquante.', 400);
  if (!list.length) return fail('Liste vide.', 400);
  if (list.length > 60) return fail('Trop d\'élèves d\'un coup (max 60).', 400);

  const admin = createAdminClient();
  const { data: klass, error: classError } = await admin
    .from('classes')
    .select('id, name, diploma, teacher_id')
    .eq('id', classId)
    .maybeSingle();
  if (classError) return fail('Classe introuvable : ' + classError.message, 500);
  const row = klass as ClassLite | null;
  if (!row) return fail('Classe introuvable.', 404);
  if (caller.role !== 'admin' && row.teacher_id !== caller.id) {
    return fail('Cette classe ne vous appartient pas.', 403);
  }

  const used = new Set<string>();
  const results: OutEleve[] = [];

  for (const raw of list) {
    const lastName = typeof raw.last_name === 'string' ? raw.last_name.trim() : '';
    const firstName = typeof raw.first_name === 'string' ? raw.first_name.trim() : '';
    if (!slugName(lastName) || !slugName(firstName)) {
      results.push({ last_name: lastName, first_name: firstName, ok: false, error: 'Nom ou prénom invalide.' });
      continue;
    }

    // Identifiant unique : DB + lot en cours.
    const base = loginFor(lastName, firstName);
    let login = base;
    for (let n = 2; n < 100; n += 1) {
      let taken = used.has(login);
      if (!taken) {
        const { data } = await admin.from('profiles').select('id').eq('login', login).maybeSingle();
        taken = Boolean(data);
      }
      if (!taken) break;
      login = `${base}${n}`;
    }

    const wanted = typeof raw.password === 'string' ? raw.password.trim().toLowerCase() : '';
    const password = PW_OK.test(wanted) ? wanted : generatePassword();
    const email = emailFor(login, classSlug(row.name));

    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'eleve', class_id: row.id, diploma: row.diploma ?? '',
        login, first_name: firstName, last_name: lastName, created_by: caller.id,
      },
    });
    if (error) {
      const already = /already|exists|duplicate/i.test(error.message);
      results.push({
        last_name: lastName, first_name: firstName, ok: false,
        error: already ? 'Compte déjà existant.' : 'Création impossible : ' + error.message,
      });
      continue;
    }
    used.add(login);
    results.push({ last_name: lastName, first_name: firstName, login, password, ok: true });
  }

  const created = results.filter((r) => r.ok).length;
  return NextResponse.json({ created, total: results.length, results });
}
