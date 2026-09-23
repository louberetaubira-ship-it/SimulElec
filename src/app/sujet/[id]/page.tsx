import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TOUS_SUJETS, sujetPublicParId } from '@/lib/sujet/server/sujets';
import SujetClient from './SujetClient';

/**
 * Les sujets numériques sont des fichiers de données : pages pré-rendues pour les sujets
 * complets et leurs sujets thématiques, id inconnu → 404. Le navigateur ne reçoit que le
 * sujet PUBLIC (sans corrigé) : la correction passe par `/api/sujet/*`.
 */
export function generateStaticParams() {
  return TOUS_SUJETS.map(s => ({ id: s.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = sujetPublicParId(params.id);
  return {
    title: s ? `${s.titre} · Sujet numérique` : 'Sujet introuvable',
    description: s ? `${s.sousTitre} — ${s.questions.length} questions, ${s.parties.length} parties, DTR ${s.dtr.length} pages.` : undefined,
  };
}

export default function SujetPage({ params }: { params: { id: string } }) {
  const sujet = sujetPublicParId(params.id);
  if (!sujet) notFound();
  return <SujetClient sujet={sujet} />;
}
