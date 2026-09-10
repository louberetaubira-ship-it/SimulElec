import type { Metadata } from 'next';
import { TPS, tpById } from '@/lib/data/tps';
import ParcoursClient from './ParcoursClient';
import DimensionnementClient from './DimensionnementClient';
import LectureClient from './LectureClient';

/** Les TP fournis restent pré-rendus ; ceux du professeur sont rendus à la demande. */
export const dynamicParams = true;

export function generateStaticParams() {
  return TPS.map(tp => ({ id: tp.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const tp = tpById(params.id);
  return {
    title: tp ? `${tp.title} · SimulElec` : 'TP du professeur · SimulElec',
    description: tp?.summary ?? 'Lecture d’un TP rédigé par le professeur : situation, cahier des charges et compétences visées.',
  };
}

export default function TpPage({ params }: { params: { id: string } }) {
  const tp = tpById(params.id);
  // TP rédigé par un professeur (table `tps`) : parcours de lecture, sans platine ni câblage.
  if (!tp) return <LectureClient id={params.id} />;
  // TP d'étude : parcours de dimensionnement (aucune platine, aucun câblage)
  if (tp.kind === 'dimensionnement') return <DimensionnementClient tp={tp} />;
  return <ParcoursClient tp={tp} />;
}
