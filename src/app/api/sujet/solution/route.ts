import { NextResponse } from 'next/server';
import { routeCorrige } from '@/lib/sujet/server/routes';

/**
 * Corrigé d'un sujet (réponses attendues + explications) : `GET /api/sujet/solution?sujetId=…`.
 * 200 pour un professeur / administrateur, ou pour un élève dont la classe a reçu la publication
 * du corrigé (sujet ou sujet parent) ; 403 sinon. Démonstration : 403 sauf `&demo=publie`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const r = await routeCorrige(new URL(req.url).searchParams);
  return NextResponse.json(r.body, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
}
