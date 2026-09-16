import type { Metadata } from 'next';
import RessourcesHub from './RessourcesHub';

export const metadata: Metadata = {
  title: 'Ressources · SimulElec',
  description: 'Cours, TD, TP, fiches de révision et évaluations d’électrotechnique, organisés en une chaîne d’apprentissage par compétences.',
};

export default function RessourcesPage() {
  return <RessourcesHub />;
}
