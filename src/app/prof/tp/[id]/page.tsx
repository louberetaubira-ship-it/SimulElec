import type { Metadata } from 'next';
import StudioClient from '@/components/studio/StudioClient';

export const metadata: Metadata = {
  title: 'Studio de TP · SimulElec',
  description: 'Construire un TP jouable : platine, matériel, liaisons, mesures et compétences.',
};

export default function EditionTpPage({ params }: { params: { id: string } }) {
  return <StudioClient id={params.id} />;
}
