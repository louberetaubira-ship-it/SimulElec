/**
 * Seed / mise à jour de la table `tps` à partir des définitions du code (`TPS`).
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 *
 * La clé service contourne les RLS : elle ne doit JAMAIS être exposée au navigateur
 * ni committée — uniquement en variable d'environnement locale ou CI.
 */
import { createClient } from '@supabase/supabase-js';
import { TPS } from '../src/lib/data/tp-demarrage-direct';

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const rows = TPS.map((tp) => ({
    id: tp.id,
    title: tp.title,
    level: tp.level,
    competences: tp.competences,
    summary: tp.summary,
    definition: tp as unknown as Record<string, unknown>,
    published: true,
  }));

  const { error } = await supabase.from('tps').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Échec du seed :', error.message);
    process.exit(1);
  }
  console.log(`${rows.length} TP synchronisé(s) : ${rows.map((r) => r.id).join(', ')}`);
}

main();
