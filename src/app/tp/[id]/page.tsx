import type { Metadata } from 'next';
import { TPS, tpById } from '@/lib/data/tps';
import ParcoursClient from './ParcoursClient';
import DimensionnementClient from './DimensionnementClient';
import TpDbClient from '@/components/studio/TpDbClient';

/** Les TP fournis restent pré-rendus ; ceux du professeur sont rendus à la demande. */
export const dynamicParams = true;

export function generateStaticParams() {
  return TPS.map(tp => ({ id: tp.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const tp = tpById(params.id);
  return {
    title: tp ? `${tp.title} · SimulElec` : 'TP du professeur · SimulElec',
    description: tp?.summary ?? 'TP rédigé par le professeur : platine, câblage, mesures et compétences visées.',
  };
}

export default function TpPage({ params }: { params: { id: string } }) {
  const tp = tpById(params.id);
  // TP enregistré en base : parcours complet si la définition est jouable, lecture sinon.
  if (!tp) return <TpDbClient id={params.id} />;
  // TP d'étude : parcours de dimensionnement (aucune platine, aucun câblage)
  if (tp.kind === 'dimensionnement') return <DimensionnementClient tp={tp} />;
  return <ParcoursClient tp={tp} />;
}
