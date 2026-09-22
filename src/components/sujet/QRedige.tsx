'use client';
/** Outil « rédigé » : réponse libre, pré-corrigée par mots-clés puis validée par le professeur. */
import { CHAMP, type OutilProps } from './outils';

export default function QRedige({ q, r, onChange, readOnly }: OutilProps<'redige'>) {
  const texte = r?.texte ?? '';
  return (
    <div>
      <textarea
        aria-label={`Réponse à la question ${q.num}`}
        className={`${CHAMP} w-full resize-y font-sans leading-relaxed`}
        rows={Math.max(3, q.lignes ?? 4)}
        value={texte}
        disabled={readOnly}
        placeholder="Rédige ta réponse…"
        onChange={e => onChange({ type: 'redige', texte: e.target.value })}
        data-redige
      />
      <div className="mt-1 flex justify-between text-[11.5px] text-muted">
        <span>Réponse rédigée : corrigée par ton professeur (pré-note automatique par mots-clés).</span>
        <span>{texte.trim() ? texte.trim().split(/\s+/).length : 0} mot(s)</span>
      </div>
    </div>
  );
}
