import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getExercice } from '@/lib/data/ressources-exercices';
import { TP_RESSOURCES } from '@/lib/data/ressources';
import ExerciceView from '@/components/ressources/ExerciceView';

export function generateStaticParams() {
  return TP_RESSOURCES.map((t) => ({ id: t.tpId }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const ex = getExercice('eval', params.id);
  return {
    title: ex ? `${ex.titre} · Évaluation · SimulElec` : 'Évaluation · SimulElec',
    description: ex?.sousTitre ?? 'Évaluation par compétences d’électrotechnique.',
  };
}

export default function EvalPage({ params }: { params: { id: string } }) {
  const ex = getExercice('eval', params.id);
  if (!ex) notFound();
  return <ExerciceView ex={ex} />;
}
