import type { Metadata } from 'next';
import AtelierClient from './AtelierClient';

export const metadata: Metadata = {
  title: 'Atelier libre · SimulElec',
  description: 'Compose ta propre platine : bibliothèque de 1 381 éléments, câblage borne à borne, montages enregistrés.',
};

export default function AtelierPage() {
  return <AtelierClient />;
}
