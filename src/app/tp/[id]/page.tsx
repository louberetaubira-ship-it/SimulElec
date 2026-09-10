import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TPS, tpById } from '@/lib/data/tps';
import ParcoursClient from './ParcoursClient';
import DimensionnementClient from './DimensionnementClient';

export function generateStaticParams() {
  return TPS.map(tp => ({ id: tp.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const tp = tpById(params.id);
  return {
    title: tp ? `${tp.title} · SimulElec` : 'TP · SimulElec',
    description: tp?.summary,
  };
}

export default function TpPage({ params }: { params: { id: string } }) {
  const tp = tpById(params.id);
  if (!tp) notFound();
  // TP d'étude : parcours de dimensionnement (aucune platine, aucun câblage)
  if (tp.kind === 'dimensionnement') return <DimensionnementClient tp={tp} />;
  return <ParcoursClient tp={tp} />;
}
