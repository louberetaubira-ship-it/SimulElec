import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFiche, TP_RESSOURCES } from '@/lib/data/ressources';
import FicheView from '@/components/ressources/FicheView';

export function generateStaticParams() {
  return TP_RESSOURCES.map((t) => ({ id: t.tpId }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const fiche = getFiche('cours', params.id);
  return {
    title: fiche ? `${fiche.titre} · Cours · SimulElec` : 'Cours · SimulElec',
    description: fiche?.sousTitre ?? 'Cours d’électrotechnique adossé à un TP.',
  };
}

export default function CoursPage({ params }: { params: { id: string } }) {
  const fiche = getFiche('cours', params.id);
  if (!fiche) notFound();
  return <FicheView fiche={fiche} />;
}
