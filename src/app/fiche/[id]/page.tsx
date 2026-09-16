import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFiche, TP_RESSOURCES } from '@/lib/data/ressources';
import FicheView from '@/components/ressources/FicheView';

export function generateStaticParams() {
  return TP_RESSOURCES.map((t) => ({ id: t.tpId }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const fiche = getFiche('fiche', params.id);
  return {
    title: fiche ? `${fiche.titre} · Fiche · SimulElec` : 'Fiche de révision · SimulElec',
    description: fiche?.sousTitre ?? 'Fiche de révision d’électrotechnique.',
  };
}

export default function FichePage({ params }: { params: { id: string } }) {
  const fiche = getFiche('fiche', params.id);
  if (!fiche) notFound();
  return <FicheView fiche={fiche} />;
}
