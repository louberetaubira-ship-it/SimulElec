'use client';
/**
 * Client de la route élève `/sujet/[id]` : charge (ou reprend) la copie, affiche la
 * page de garde puis l'interface d'épreuve.
 */
import { useEffect, useState } from 'react';
import type { SujetPublic } from '@/lib/sujet/public';
import { useSujet } from '@/lib/sujet/store';
import { DEMO } from '@/lib/student';
import { getMyProfile } from '@/lib/db/profiles';
import Accueil from '@/components/sujet/Accueil';
import SujetShell from '@/components/sujet/SujetShell';

export default function SujetClient({ sujet }: { sujet: SujetPublic }) {
  const init = useSujet(s => s.init);
  const chargement = useSujet(s => s.chargement);
  const courant = useSujet(s => s.sujet);
  const remise = useSujet(s => s.st.remise);
  const [dansEpreuve, setDansEpreuve] = useState(false);
  const [prof, setProf] = useState(DEMO);

  useEffect(() => {
    setDansEpreuve(false);
    void init(sujet);
  }, [init, sujet]);

  useEffect(() => {
    if (DEMO) return;
    let vivant = true;
    getMyProfile()
      .then(p => { if (vivant) setProf(p?.role === 'professeur' || p?.role === 'admin'); })
      .catch(() => undefined);
    return () => { vivant = false; };
  }, []);

  if (chargement || courant?.id !== sujet.id) {
    return <div className="mx-auto max-w-[900px] px-4 py-10 text-[14px] text-muted">Chargement du sujet…</div>;
  }
  // Copie remise : directement la correction et le bilan.
  if (!dansEpreuve && !remise) {
    return <Accueil onEntrer={() => setDansEpreuve(true)} lienProf={prof ? `/prof/sujet/${sujet.id}` : null} />;
  }
  return <SujetShell />;
}
