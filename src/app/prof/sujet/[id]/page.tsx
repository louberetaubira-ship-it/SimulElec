import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { dossierDe, sujetComplet } from '@/lib/sujet/server/sujets';
import { DEMO_SERVEUR, estProf, lireSession } from '@/lib/sujet/server/acces';
import ProfSujetClient, { type SujetOnglet } from './ProfSujetClient';

/**
 * Vue professeur d'un sujet (complet ou thématique). Rendue à la demande : le sujet COMPLET
 * (corrigé compris) n'est envoyé qu'après vérification serveur du rôle (professeur ou
 * administrateur ; mode démonstration : ouvert). Id inconnu → 404.
 */
export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = sujetComplet(params.id);
  return { title: s ? `Copies · ${s.titre}` : 'Sujet introuvable' };
}

export default async function ProfSujetPage({ params }: { params: { id: string } }) {
  const sujet = sujetComplet(params.id);
  if (!sujet) notFound();
  if (!DEMO_SERVEUR()) {
    const session = await lireSession();
    if (!session) redirect(`/login?next=${encodeURIComponent(`/prof/sujet/${params.id}`)}`);
    if (!estProf(session)) redirect(`/sujet/${params.id}`);
  }
  // Sujet complet et sujets thématiques du même dossier : sélecteur et suivi de classe.
  const dossier = dossierDe(sujet.id);
  const freres = dossier ? [dossier.base, ...dossier.derives] : [sujet];
  const onglets: SujetOnglet[] = freres.map(s => ({
    id: s.id,
    titre: s.titre,
    code: s.parent ? `T${freres.filter(x => x.parent).indexOf(s) + 1}` : 'Sujet complet',
    theme: s.parent ? s.themes?.[0] ?? null : null,
    questions: s.questions.length,
    points: s.questions.reduce((a, q) => a + q.points, 0),
  }));
  return <ProfSujetClient sujet={sujet} onglets={onglets} />;
}
