import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SUJETS, sujetById } from '@/lib/data/sujets';
import SujetClient from './SujetClient';

/** Les sujets numériques sont des fichiers de données : pages pré-rendues, id inconnu → 404. */
export function generateStaticParams() {
  return SUJETS.map(s => ({ id: s.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = sujetById(params.id);
  return {
    title: s ? `${s.titre} · Sujet numérique` : 'Sujet introuvable',
    description: s ? `${s.sousTitre} — ${s.questions.length} questions, ${s.parties.length} parties, DTR ${s.dtr.length} pages.` : undefined,
  };
}

export default function SujetPage({ params }: { params: { id: string } }) {
  const sujet = sujetById(params.id);
  if (!sujet) notFound();
  return <SujetClient sujet={sujet} />;
}
