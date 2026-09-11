'use client';

/**
 * Écran d'attente du générateur de TP. L'appel dure de une à plusieurs minutes : pas de
 * fausse barre de progression, un minuteur honnête et l'étape courante estimée. La
 * génération est annulable (AbortController) et les erreurs s'affichent en français.
 */
import React from 'react';
import {
  ETAPES_GENERATION, etapeEstimee, genererTp, type ReponseGeneration,
} from './generation';
import type { LancementBrief } from './Brief';

/** Minuteur « 1 min 24 s ». */
function duree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}

export default function Generation({
  lancement, onTermine, onAnnuler, onReprendre,
}: {
  lancement: LancementBrief;
  onTermine: (res: ReponseGeneration) => void;
  onAnnuler: () => void;
  /** Retour à l'écran de brief pour corriger la demande. */
  onReprendre: () => void;
}) {
  const [secondes, setSecondes] = React.useState(0);
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [essai, setEssai] = React.useState(0);
  const abort = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const t = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [essai]);

  React.useEffect(() => {
    const controleur = new AbortController();
    abort.current = controleur;
    let vivant = true;
    setErreur(null);
    setSecondes(0);
    void (async () => {
      try {
        const res = await genererTp(lancement.brief, lancement.docs, controleur.signal);
        if (vivant && !controleur.signal.aborted) onTermine(res);
      } catch (e) {
        if (!vivant || controleur.signal.aborted) return;
        setErreur(e instanceof Error ? e.message : 'La génération a échoué. Relancez-la dans un instant.');
      }
    })();
    return () => { vivant = false; controleur.abort(); };
    // `essai` relance volontairement la génération.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essai]);

  const courante = erreur ? -1 : etapeEstimee(secondes);

  return (
    <section className="st-gen" aria-label="Génération du TP en cours" data-testid="gen-progres">
      <header className="st-gen-head">
        <div>
          <h1 className="st-gen-title">✦ Génération en cours</h1>
          <p className="st-sub">
            « {lancement.brief.theme} » · {lancement.brief.duration} min ·{' '}
            {lancement.docs.length} document{lancement.docs.length > 1 ? 's' : ''} joint{lancement.docs.length > 1 ? 's' : ''}
          </p>
        </div>
        <span className="st-tag" data-testid="gen-minuteur">{duree(secondes)} écoulées</span>
      </header>

      <div className="st-card" style={{ marginTop: 10 }}>
        <ol className="st-steps" data-testid="gen-etapes">
          {ETAPES_GENERATION.map((e, i) => {
            const etat = erreur ? (i < courante ? 'fait' : 'attente')
              : i < courante ? 'fait' : i === courante ? 'encours' : 'attente';
            return (
              <li key={e.id} className={`st-step ${etat}`} data-etape={e.id} data-etat={etat}>
                <span className="puce" aria-hidden="true">{etat === 'fait' ? '✓' : etat === 'encours' ? '•' : ''}</span>
                <span className="lib">{e.label}</span>
                {etat === 'encours' && <span className="st-tag">en cours</span>}
              </li>
            );
          })}
        </ol>
        {!erreur && (
          <p className="st-sub" style={{ marginTop: 8 }}>
            Le modèle rédige, le moteur de simulation vérifie puis répare : comptez une à trois
            minutes. Les étapes sont estimées, aucune progression n’est inventée. Vous pouvez
            quitter cet écran en annulant.
          </p>
        )}
      </div>

      {erreur && (
        <p className="st-err" role="alert" style={{ marginTop: 10 }} data-testid="gen-erreur">{erreur}</p>
      )}

      <div className="st-row" style={{ marginTop: 12 }}>
        {erreur ? (
          <>
            <button type="button" className="st-btn primary" onClick={() => setEssai((n) => n + 1)} data-testid="gen-reessayer">
              Relancer la génération
            </button>
            <button type="button" className="st-btn" onClick={onReprendre} data-testid="gen-corriger">
              Corriger le brief
            </button>
          </>
        ) : (
          <button
            type="button"
            className="st-btn ghost"
            data-testid="gen-annuler"
            onClick={() => { abort.current?.abort(); onAnnuler(); }}
          >
            Annuler la génération
          </button>
        )}
      </div>
    </section>
  );
}
