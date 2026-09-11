'use client';

/**
 * Création d'un TP : le studio, sans identifiant. Le TP est créé en base au premier
 * enregistrement (brouillon). `?from=<id>` duplique un TP existant, fourni ou non.
 */
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StudioClient from '@/components/studio/StudioClient';

function Nouveau() {
  const params = useSearchParams();
  // `?generer=1` ouvre directement l'écran de brief du générateur.
  return <StudioClient id={null} source={params.get('from')} generer={params.get('generer') === '1'} />;
}

export default function NouveauTpPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl px-4 py-8 text-[14px] text-muted">Chargement du studio…</main>}>
      <Nouveau />
    </Suspense>
  );
}
