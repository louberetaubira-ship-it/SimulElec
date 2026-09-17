'use client';

/**
 * Écran d'attente du générateur de TP.
 *
 * La génération n'est plus un seul appel long (qui se faisait couper à 504 par la
 * passerelle) : elle est orchestrée ici, étape par étape, avec des appels serveur courts
 * en flux. Chaque étape s'allume quand elle démarre, affiche la progression réelle
 * renvoyée par le serveur et son temps écoulé.
 *
 * En cas d'échec, ce qui est déjà produit est conservé : on reprend à l'étape fautive,
 * et si c'est la maquette qui a échoué on peut continuer avec le dossier pédagogique seul.
 */
import React from 'react';
import {
  DELAI_ETAPE_MS, ETAPES_GENERATION, EchecEtape, acquisVide, dossierSeul, orchestrerGeneration,
  type AcquisGeneration, type AvanceeEtape, type EtapeId, type EtatEtape, type ReponseGeneration,
} from './generation';
import type { LancementBrief } from './Brief';

/** Minuteur « 1 min 24 s ». */
function duree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}

/** État affiché pour chaque étape. */
interface LigneEtape {
  etat: EtatEtape;
  message: string;
  /** Secondes passées sur cette étape. */
  secondes: number;
}

const lignesInitiales = (): Record<EtapeId, LigneEtape> => {
  const out = {} as Record<EtapeId, LigneEtape>;
  for (const e of ETAPES_GENERATION) out[e.id] = { etat: 'attente', message: '', secondes: 0 };
  return out;
};

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
  const [lignes, setLignes] = React.useState<Record<EtapeId, LigneEtape>>(lignesInitiales);
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [etapeFautive, setEtapeFautive] = React.useState<EtapeId | null>(null);
  /** Essai courant : `depuis` indique l'étape par laquelle reprendre (null = tout). */
  const [essai, setEssai] = React.useState<{ n: number; depuis: EtapeId | null }>({ n: 0, depuis: null });

  const abort = React.useRef<AbortController | null>(null);
  const acquis = React.useRef<AcquisGeneration>(acquisVide());
  const encours = React.useRef<EtapeId | null>(null);

  // Minuteur global + temps passé sur l'étape en cours.
  React.useEffect(() => {
    const t = setInterval(() => {
      setSecondes((s) => s + 1);
      const id = encours.current;
      if (!id) return;
      setLignes((l) => (l[id].etat === 'encours' ? { ...l, [id]: { ...l[id], secondes: l[id].secondes + 1 } } : l));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    const controleur = new AbortController();
    abort.current = controleur;
    let vivant = true;
    setErreur(null);
    setEtapeFautive(null);
    setSecondes(0);
    encours.current = null;

    const avancer = (a: AvanceeEtape) => {
      if (!vivant) return;
      if (a.etat === 'encours') encours.current = a.etape;
      else if (encours.current === a.etape) encours.current = null;
      setLignes((l) => ({
        ...l,
        [a.etape]: {
          etat: a.etat,
          message: a.message ?? (a.etat === 'encours' ? l[a.etape].message : ''),
          secondes: a.etat === 'encours' && l[a.etape].etat !== 'encours' ? 0 : l[a.etape].secondes,
        },
      }));
    };

    void (async () => {
      try {
        const res = await orchestrerGeneration({
          brief: lancement.brief,
          docs: lancement.docs,
          signal: controleur.signal,
          acquis: acquis.current,
          onEtape: avancer,
          ...(essai.depuis ? { depuis: essai.depuis } : {}),
        });
        if (vivant && !controleur.signal.aborted) onTermine(res);
      } catch (e) {
        if (!vivant || controleur.signal.aborted) return;
        encours.current = null;
        if (e instanceof EchecEtape) {
          setEtapeFautive(e.etape);
          setErreur(e.message);
        } else {
          setErreur(e instanceof Error ? e.message : 'La génération a échoué. Relancez-la dans un instant.');
        }
      }
    })();

    return () => { vivant = false; controleur.abort(); };
    // `essai` relance volontairement la génération.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essai]);

  const dossierPret = acquis.current.pedagogie !== null;
  const peutContinuerSansMaquette = Boolean(erreur) && dossierPret && etapeFautive !== 'pedagogie';
  const libelleFautive = ETAPES_GENERATION.find((e) => e.id === etapeFautive)?.label ?? '';

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
          {ETAPES_GENERATION.map((e) => {
            const l = lignes[e.id];
            return (
              <li key={e.id} className={`st-step ${l.etat}`} data-etape={e.id} data-etat={l.etat}>
                <span className="puce" aria-hidden="true">
                  {l.etat === 'fait' ? '✓' : l.etat === 'encours' ? '•' : l.etat === 'echec' ? '!' : ''}
                </span>
                <span className="lib">
                  {e.label}
                  {l.message && <span className="st-sub" style={{ display: 'block' }} data-testid={`gen-msg-${e.id}`}>{l.message}</span>}
                </span>
                {l.etat === 'encours' && <span className="st-tag">{duree(l.secondes)}</span>}
                {l.etat === 'fait' && l.secondes > 0 && <span className="st-tag ok">{duree(l.secondes)}</span>}
                {l.etat === 'echec' && <span className="st-tag warn">interrompue</span>}
              </li>
            );
          })}
        </ol>
        {!erreur && (
          <p className="st-sub" style={{ marginTop: 8 }}>
            Chaque étape est un appel court au serveur : elle s’allume quand elle démarre et
            affiche son temps réel. Au-delà de {Math.round(DELAI_ETAPE_MS / 1000)} secondes, une
            étape est interrompue et vous pouvez la relancer seule. Vous pouvez quitter cet écran
            en annulant.
          </p>
        )}
      </div>

      {erreur && (
        <p className="st-err" role="alert" style={{ marginTop: 10 }} data-testid="gen-erreur">{erreur}</p>
      )}

      <div className="st-row" style={{ marginTop: 12 }}>
        {erreur ? (
          <>
            {etapeFautive && (
              <button
                type="button"
                className="st-btn primary"
                data-testid="gen-reprendre-etape"
                onClick={() => setEssai((e) => ({ n: e.n + 1, depuis: etapeFautive }))}
              >
                Reprendre à l’étape « {libelleFautive} »
              </button>
            )}
            {peutContinuerSansMaquette && (
              <button
                type="button"
                className="st-btn"
                data-testid="gen-dossier-seul"
                onClick={() => {
                  const p = acquis.current.pedagogie;
                  if (p) onTermine(dossierSeul(p, lancement.brief, acquis.current));
                }}
              >
                Continuer avec le dossier seul
              </button>
            )}
            <button
              type="button"
              className="st-btn"
              data-testid="gen-reessayer"
              onClick={() => {
                acquis.current = acquisVide();
                setLignes(lignesInitiales());
                setEssai((e) => ({ n: e.n + 1, depuis: null }));
              }}
            >
              Tout relancer
            </button>
            <button type="button" className="st-btn ghost" onClick={onReprendre} data-testid="gen-corriger">
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
