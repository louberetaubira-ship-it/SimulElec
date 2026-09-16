import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getExercice } from '@/lib/data/ressources-exercices';
import { TP_RESSOURCES } from '@/lib/data/ressources';
import ExerciceView from '@/components/ressources/ExerciceView';

export function generateStaticParams() {
  return TP_RESSOURCES.map((t) => ({ id: t.tpId }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const ex = getExercice('td', params.id);
  return {
    title: ex ? `${ex.titre} · TD · SimulElec` : 'TD · SimulElec',
    description: ex?.sousTitre ?? 'Travaux dirigés d’électrotechnique, auto-corrigés.',
  };
}

export default function TdPage({ params }: { params: { id: string } }) {
  const ex = getExercice('td', params.id);
  if (!ex) notFound();
  return <ExerciceView ex={ex} />;
}
