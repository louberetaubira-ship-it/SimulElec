import { NextResponse } from 'next/server';
import { routeImage } from '@/lib/sujet/server/routes';

/**
 * Image du schéma corrigé d'une question schéma : `GET /api/sujet/image?sujetId=…&num=…`.
 * Le fichier vit dans `private/` (hors `public/`) : servi au professeur / administrateur, ou à
 * l'élève dont la classe a reçu la publication du corrigé ; démonstration : `&demo=publie`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const r = await routeImage(new URL(req.url).searchParams);
  if (r.status !== 200 || !('octets' in r.body)) {
    return NextResponse.json(r.body, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
  }
  return new NextResponse(new Uint8Array(r.body.octets), {
    status: 200,
    headers: { 'Content-Type': r.body.type, 'Cache-Control': 'private, no-store' },
  });
}
