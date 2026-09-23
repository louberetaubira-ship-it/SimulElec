'use client';
/**
 * Rendu LECTURE SEULE d'une saisie LaTeX (copie de l'élève, vue professeur, correction) :
 * `<math-span>` de MathLive une fois chargé côté client ; avant (et au rendu serveur), une
 * transcription texte lisible (`latexVersTexte`). Un texte qui n'est pas du LaTeX s'affiche tel quel.
 */
import { createElement, useEffect, useState } from 'react';
import { latexVersTexte } from '@/lib/sujet/formules-texte';
import { chargerMathlive } from './EditeurMaths';

/** La chaîne ressemble-t-elle à du LaTeX (commande, indice, exposant, accolades) ? */
export const estLatex = (s: string) => /\\[a-zA-Z]+|[_^{}]/.test(s);

export default function Formule({ latex, className = '', bloc = false }: { latex: string; className?: string; bloc?: boolean }) {
  const [pret, setPret] = useState(false);
  const texte = (latex ?? '').trim();
  const latexOk = texte !== '' && estLatex(texte);

  useEffect(() => {
    if (!latexOk) return;
    let vivant = true;
    chargerMathlive().then(() => { if (vivant) setPret(true); }).catch(() => { /* repli texte */ });
    return () => { vivant = false; };
  }, [latexOk]);

  if (!texte) return <span className={className}>—</span>;
  if (!latexOk) return <span className={className}>{texte}</span>;
  if (!pret) return <span className={`font-mono ${className}`} data-formule="texte">{latexVersTexte(texte)}</span>;
  return createElement(bloc ? 'math-div' : 'math-span', {
    class: className,
    'aria-label': latexVersTexte(texte),
    'data-formule': 'maths',
    suppressHydrationWarning: true,
  }, texte);
}
