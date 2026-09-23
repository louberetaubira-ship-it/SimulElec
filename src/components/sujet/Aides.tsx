'use client';
/**
 * Aides graduées d'une question (1 = où chercher, 2 = méthode, 3 = forme de la réponse),
 * débloquées une par une par le bouton « Aide (n/3) » et servies par `POST /api/sujet/aide`.
 * Jamais la réponse : la réponse attendue n'est montrée à l'élève que si le professeur a
 * publié le corrigé. Entraînement : après une réponse fausse ; examen : après la remise.
 */
import { useSujet } from '@/lib/sujet/store';
import Texte from './Texte';
import { BOUTON } from './outils';

interface Props {
  num: number;
  total: number;
  /** Déblocage autorisé (entraînement après une erreur, ou copie remise). */
  actif: boolean;
}

export default function Aides({ num, total, actif }: Props) {
  const textes = useSujet(s => s.aides[num]) ?? [];
  const chargement = useSujet(s => s.aideChargement === num);
  const erreur = useSujet(s => s.erreurs[num]);
  const aideSuivante = useSujet(s => s.aideSuivante);
  const toutes = textes.length >= total;
  return (
    <div className="space-y-1.5" data-aides={num}>
      {textes.map((t, i) => (
        <div key={i} className="rounded-r-lg border-l-4 border-accent bg-[#FFFAF0] px-3 py-1.5 text-[13px] leading-relaxed text-ink" data-aide={i + 1}>
          <span className="mr-1 text-[10.5px] font-bold uppercase tracking-[.06em] text-accent-ink">Aide {i + 1}</span>
          <Texte>{t}</Texte>
        </div>
      ))}
      {actif && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BOUTON} onClick={() => void aideSuivante(num)} disabled={toutes || chargement} data-aide-suivante>
            {chargement ? 'Chargement de l’aide…' : toutes ? 'Toutes les aides sont affichées' : `💡 Aide (${textes.length + 1}/${total})`}
          </button>
          {erreur && <span className="text-[12px] text-crit" role="alert">{erreur}</span>}
        </div>
      )}
    </div>
  );
}

/** Encart « corrigé non publié » (la réponse attendue reste cachée à l'élève). */
export function CorrigeVerrouille({ texte }: { texte?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-muted" data-corrige-verrouille>
      🔒 {texte ?? 'Corrigé non publié par ton professeur : la réponse attendue apparaîtra quand il le publiera.'}
    </div>
  );
}
