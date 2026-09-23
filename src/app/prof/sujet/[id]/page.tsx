import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TOUS_SUJETS, dossierDe, sujetById } from '@/lib/data/sujets';
import ProfSujetClient, { type SujetOnglet } from './ProfSujetClient';

/** Vue professeur pré-rendue pour chaque sujet (complet et thématiques) ; id inconnu → 404. */
export function generateStaticParams() {
  return TOUS_SUJETS.map(s => ({ id: s.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = sujetById(params.id);
  return { title: s ? `Copies · ${s.titre}` : 'Sujet introuvable' };
}

export default function ProfSujetPage({ params }: { params: { id: string } }) {
  const sujet = sujetById(params.id);
  if (!sujet) notFound();
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
