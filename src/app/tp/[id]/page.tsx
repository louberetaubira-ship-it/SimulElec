import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TPS } from '@/lib/data/tp-demarrage-direct';
import ParcoursClient from './ParcoursClient';

export function generateStaticParams() {
  return TPS.map(tp => ({ id: tp.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const tp = TPS.find(t => t.id === params.id);
  return {
    title: tp ? `${tp.title} · SimulElec` : 'TP · SimulElec',
    description: tp?.summary,
  };
}

export default function TpPage({ params }: { params: { id: string } }) {
  const tp = TPS.find(t => t.id === params.id);
  if (!tp) notFound();
  return <ParcoursClient tp={tp} />;
}
