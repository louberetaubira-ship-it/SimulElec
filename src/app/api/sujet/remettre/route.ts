import { NextResponse } from 'next/server';
import { routeRemettre } from '@/lib/sujet/server/routes';

/** Remise d'une copie : { sujetId, reponses } → { corrections } (corrigé côté serveur). Voir `src/lib/sujet/server/routes.ts`. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erreur: 'Corps JSON attendu.' }, { status: 400 });
  }
  const r = await routeRemettre(body);
  return NextResponse.json(r.body, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
}
