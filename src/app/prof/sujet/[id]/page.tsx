import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sujetById } from '@/lib/data/sujets';
import ProfSujetClient from './ProfSujetClient';

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = sujetById(params.id);
  return { title: s ? `Copies · ${s.titre}` : 'Sujet introuvable' };
}

export default function ProfSujetPage({ params }: { params: { id: string } }) {
  const sujet = sujetById(params.id);
  if (!sujet) notFound();
  return <ProfSujetClient sujet={sujet} />;
}
