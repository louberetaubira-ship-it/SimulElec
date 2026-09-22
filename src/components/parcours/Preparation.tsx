'use client';

/**
 * Étape de PRÉPARATION (activité A1 du référentiel).
 *
 * Avant de choisir une référence et avant de poser le premier appareil, l'élève
 * lit le dossier : il reconnaît les organes du schéma sous leur repère, puis dit
 * ce que chacun fait. Deux gestes distincts — identifier n'est pas comprendre —
 * d'où les deux blocs.
 *
 * LE SCHÉMA EST À L'ÉCRAN, en permanence, et l'organe visé par la question en
 * cours s'y entoure d'un cadre. Demander « quel appareil porte le repère Q1 ? »
 * sans montrer le schéma, ce n'est pas préparer une opération, c'est deviner.
 *
 * Comme à l'étape matériel, la justification s'affiche dès que l'élève a
 * répondu, juste ou faux : on n'attend pas la fin du TP pour lui dire pourquoi.
 */

import React from 'react';
import type { AttemptState, PrepQuestion, PrepSection, TpDefinition } from '@/lib/types';
import PlaqueBornesOutil from './PlaqueBornesOutil';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { goodPrep, preparationComplete, prepQuestions } from '@/lib/sim/progress';
import { shuffledOrder } from '@/lib/sim/shuffle';
import { initialSim } from '@/lib/sim/engine';
import { reseauCommande } from '@/lib/sim/commande';
import SchemaPuissance from '@/components/schema/SchemaPuissance';
import SchemaCommande from '@/components/schema/SchemaCommande';
import SchemaPv from '@/components/schema/SchemaPv';
import PreparationEtudePv from './PreparationEtudePv';
import SchemaAutomate from '@/components/schema/SchemaAutomate';
import { GrafcetIntro, GrafcetPortail } from './Grafcet';
import DocumentsDossier from './DocumentsDossier';
import { Center, Side } from './StageLayout';
import DipOutil from '@/components/reseau/DipOutil';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  onAnswer: (questionId: string, index: number) => void;
  onNext: () => void;
}

/** Bornes du folio qui appartiennent à l'organe désigné : la zone à éclairer. */
function zoneDuRepere(tp: TpDefinition, rep: string | null): string[] {
  if (!rep || !tp.folio) return [];
  const out: string[] = [];
  for (const c of tp.folio.colonnes) {
    for (const el of c.elements) {
      if (el.rep !== rep) continue;
      out.push(el.a);
      if (el.b) out.push(el.b);
    }
  }
  return out;
}

function Bloc({ titre, consigne, questions, st, actif, onAnswer, onActive, outil }: {
  /** Outil interactif affiché avant les questions (`PrepBloc.outil`). */
  outil?: 'dip';
  titre: string;
  consigne: string;
  questions: PrepQuestion[];
  st: AttemptState;
  actif: string | null;
  onAnswer: (id: string, i: number) => void;
  onActive: (id: string) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="font-title text-[19px] font-semibold uppercase tracking-wide">{titre}</h3>
      <Note>{consigne}</Note>
      {outil === 'dip' && <DipOutil />}
      {questions.map(q => {
        const ch = st.prep?.[q.id];
        const repondu = ch != null;
        const juste = ch === q.answer;
        const vise = actif === q.id;
        return (
          <article
            key={q.id}
            onMouseEnter={() => onActive(q.id)}
            onFocusCapture={() => onActive(q.id)}
            className={`rounded-2xl border bg-[var(--surface)] p-3 transition-colors ${
              vise ? 'border-accent' : 'border-[var(--line)]'
            }`}
          >
            <h4 className="flex flex-wrap items-baseline gap-2 text-[16px] font-bold">
              {q.rep && (
                <span className={`rounded-md px-1.5 py-0.5 font-mono-num text-[13px] ${
                  vise ? 'bg-accent text-[#141A21]' : 'bg-[var(--surface-2)]'
                }`}>
                  {q.rep}
                </span>
              )}
              {q.invite}
              {q.focus && !q.doc && (
                <small className="font-sans text-[11px] font-normal text-muted">
                  · repère {q.focus} sur le schéma {q.schema === 'commande' ? 'de commande' : 'de puissance'}
                </small>
              )}
              {q.doc && (
                <small className="font-sans text-[11px] font-normal text-muted">· document affiché à gauche</small>
              )}
            </h4>
            {q.vue === 'plaque' ? (
              <div className="mt-2">
                <PlaqueBornesOutil q={q} choix={ch} onAnswer={(i) => { onActive(q.id); onAnswer(q.id, i); }} />
              </div>
            ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {shuffledOrder(q.id, q.options.length).map((i) => {
                const o = q.options[i];
                const sel = ch === i;
                const tone = sel
                  ? (juste ? 'border-good bg-good/10' : 'border-crit bg-crit/10')
                  : 'border-[var(--line)] bg-[var(--surface)]';
                return (
                  <button
                    key={`${q.id}-${i}`}
                    type="button"
                    onClick={() => { onActive(q.id); onAnswer(q.id, i); }}
                    className={`min-h-touch rounded-[10px] border p-2 text-left text-[12.5px] leading-snug ${tone}`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            )}
            {repondu && q.vue !== 'plaque' && (
              <p className={`mt-1.5 text-[12px] ${juste ? 'text-good' : 'text-crit'}`}>{q.why}</p>
            )}
          </article>
        );
      })}
    </section>
  );
}

/**
 * Ordre des sections de la préparation : celui que le TP déclare (`preparation.ordre`),
 * complété par l'ordre historique pour les sections qu'il ne cite pas.
 */
function ordreDesSections(p: NonNullable<TpDefinition['preparation']>): PrepSection[] {
  const historique: PrepSection[] = [
    'identification', 'fonctions', 'calculs', 'adressage',
    ...(p.blocs ?? []).map(b => `bloc:${b.id}` as PrepSection), 'grafcetQuiz', 'grafcet',
  ];
  const voulu = p.ordre ?? [];
  return [...voulu, ...historique.filter(x => !voulu.includes(x))];
}

export default function Preparation({ tp, st, onAnswer, onNext }: Props) {
  const questions = prepQuestions(tp);
  const total = questions.length;
  const nOk = goodPrep(tp, st);
  const complete = preparationComplete(tp, st);
  const p = tp.preparation;

  // Question visée : la dernière survolée, sinon la première sans réponse.
  const [actif, setActif] = React.useState<string | null>(null);
  const courante = React.useMemo(() => {
    const parId = questions.find(q => q.id === actif);
    return parId ?? questions.find(q => st.prep?.[q.id] == null) ?? questions[0] ?? null;
  }, [questions, actif, st.prep]);

  /**
   * Réseau du MONTAGE DE RÉFÉRENCE : à la préparation, rien n'est encore câblé.
   * Le folio montre donc l'installation telle qu'elle doit être, pas le travail
   * en cours — c'est un document d'étude, pas un relevé.
   */
  const reseau = React.useMemo(
    () => reseauCommande(
      tp,
      { wires: tp.liaisons.map(l => ({ a: l.a, b: l.b, net: l.net })), fault: null },
      { ...initialSim(), q1: true, f2: true, f3: true },
      { marcheMaintenue: false },
    ),
    [tp],
  );

  // Schéma dédié pour le photovoltaïque : la chaîne off-grid n'entre pas dans le
  // schéma de puissance triphasé générique.
  // Un TP qui porte ses DOCUMENTS réels (DTR, folio) garde la préparation par blocs,
  // documents à gauche, même sur la scène photovoltaïque.
  const docs = p?.documents ?? [];
  const pv = tp.scene === 'pv' && docs.length === 0;
  const titre = (bloc: 'identification' | 'fonctions' | 'calculs' | 'adressage', t: string, c: string) =>
    ({ titre: p?.intitules?.[bloc]?.titre ?? t, consigne: p?.intitules?.[bloc]?.consigne ?? c });
  const tIdent = titre('identification', '1 · Identifier les éléments du schéma',
    'Chaque repère du schéma désigne un organe précis. Retrouve-le sur le schéma affiché à gauche.');
  const tFonc = titre('fonctions', '2 · Donner la fonction de chaque équipement',
    'Un organe se choisit sur sa fonction, pas sur son allure. Dis ce que chacun fait dans CE montage.');
  const tCalc = titre('calculs', '3 · Calculer et dimensionner',
    'Données de la plaque du motoréducteur : Pu = 0,37 kW, η = 83,6 %, cos φ = 0,78, 230 / 400 V. Réseau 3 × 400 V.');
  const tAdr = titre('adressage', '4 · Adresser les entrées et sorties',
    'Dans le programme, on n\'écrit pas « S3 » mais l\'adresse de la borne où il est câblé. Complète la table d\'adressage.');
  // Pour le PV, l'étude de dimensionnement 11 étapes EST la préparation : on
  // verrouille la validation tant qu'elle n'est pas terminée.
  const [etudeDone, setEtudeDone] = React.useState(false);
  const surCommande = courante?.schema === 'commande';
  const focus = courante?.focus ?? null;
  const zone = React.useMemo(
    () => (surCommande ? zoneDuRepere(tp, focus) : []),
    [tp, surCommande, focus],
  );

  /* ------------------------------------------------ zoom + plein écran schéma */
  const workRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoomState] = React.useState(1);
  const setZoom = React.useCallback(
    (z: number) => setZoomState(Math.max(0.4, Math.min(3, Math.round(z * 100) / 100))),
    [],
  );

  const [fs, setFs] = React.useState(false);
  const enterFs = React.useCallback(() => {
    setFs(true);
    const el = workRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    try {
      const r = el?.requestFullscreen?.() ?? el?.webkitRequestFullscreen?.();
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
    } catch {
      /* API refusée : le calque position:fixed prend le relais */
    }
  }, []);
  const exitFs = React.useCallback(() => {
    setFs(false);
    const d = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    if (d.fullscreenElement ?? d.webkitFullscreenElement) {
      try {
        if (d.exitFullscreen) d.exitFullscreen();
        else d.webkitExitFullscreen?.();
      } catch { /* ignore */ }
    }
  }, []);

  React.useEffect(() => {
    const d = document as Document & { webkitFullscreenElement?: Element | null };
    const onChange = () => {
      if (!(d.fullscreenElement ?? d.webkitFullscreenElement)) setFs(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFs(false); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
      <Side>
        <SideTitle>Préparation de l&apos;opération</SideTitle>
        <Note>
          Activité A1 du référentiel : on ne touche pas encore au matériel. À partir du cahier
          des charges et des schémas affichés, tu identifies chaque organe, puis tu dis à quoi il
          sert. C&apos;est ce travail qui rendra le choix des références évident à l&apos;étape
          suivante.
        </Note>
        <Card title="Avancement">
          <div className="font-mono-num text-[20px]">{nOk} / {total}</div>
          <Note>réponses justes</Note>
        </Card>
        <Button variant="primary" disabled={pv ? !etudeDone : !complete} onClick={onNext}>
          {total === 0 ? 'Passer au choix du matériel' : 'Valider la préparation'}
        </Button>
      </Side>

      <Center>
        {pv ? (
          // PV : l'étude de dimensionnement complète occupe toute la zone centrale.
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto">
            <PreparationEtudePv tp={tp} onDone={setEtudeDone} />
          </div>
        ) : (
        <div
          ref={workRef}
          className={
            fs
              ? 'fixed inset-0 z-[60] flex flex-col gap-2 bg-[var(--app)] p-2'
              : 'flex min-h-0 w-full flex-1 flex-col'
          }
        >
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,.88fr)]">
            {/* Colonne gauche : schéma zoomable + plein écran */}
            <div className="flex min-h-0 flex-col gap-2">
              {docs.length > 0 && (
                <div className="min-h-0 overflow-auto lg:flex-1">
                  <DocumentsDossier docs={docs} actif={courante?.doc ?? null} tp={tp} focus={focus} />
                </div>
              )}
              {docs.length === 0 && (tp.puissance || tp.folio || pv) && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-[var(--line)]">
                      <button
                        type="button" onClick={() => setZoom(zoom - 0.15)}
                        className="px-2.5 py-1.5 text-[15px] font-semibold hover:bg-[var(--app)]"
                        aria-label="Dézoomer"
                      >−</button>
                      <span className="min-w-[52px] border-x border-[var(--line)] px-1 text-center text-[12.5px] tabular-nums text-muted">
                        {Math.round(zoom * 100)} %
                      </span>
                      <button
                        type="button" onClick={() => setZoom(zoom + 0.15)}
                        className="px-2.5 py-1.5 text-[15px] font-semibold hover:bg-[var(--app)]"
                        aria-label="Zoomer"
                      >+</button>
                    </div>
                    <button
                      type="button" onClick={() => setZoom(1)}
                      className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-[13px] font-semibold hover:bg-[var(--app)]"
                    >Ajuster</button>
                    <button
                      type="button" onClick={fs ? exitFs : enterFs}
                      className="rounded-lg border border-[var(--accent)] px-2.5 py-1.5 text-[13px] font-semibold text-accent hover:bg-[var(--app)]"
                    >{fs ? '✕ Quitter le plein écran' : '⤢ Plein écran'}</button>
                  </div>
                  <div className="relative h-[46vh] overflow-auto lg:h-auto lg:min-h-0 lg:flex-1">
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                      {pv
                        ? <SchemaPv tp={tp} focus={focus} />
                        : surCommande && tp.folio
                          ? <SchemaCommande tp={tp} reseau={reseau} zone={zone} focusRep={focus} />
                          : surCommande && tp.plcIo
                            ? <SchemaAutomate tp={tp} focus={focus} />
                            : <SchemaPuissance tp={tp} focus={focus} />}
                    </div>
                  </div>
                  {courante?.focus && (
                    <p className="m-0 text-[11.5px] text-muted">
                      Question en cours : repère <b className="text-accent">{courante.focus}</b>,
                      encadré sur le schéma.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Colonne droite : questions d'identification / fonctions */}
            <div className="flex min-h-0 flex-col gap-4 overflow-auto lg:pr-1">
              {!p && (
                <Note>
                  Ce TP n&apos;a pas encore de préparation guidée : passe directement au choix du
                  matériel, en t&apos;appuyant sur le cahier des charges.
                </Note>
              )}
              {p && ordreDesSections(p).map(sec => {
                const commun = { st, actif, onAnswer, onActive: setActif };
                if (sec === 'identification') {
                  return <Bloc key={sec} titre={tIdent.titre} consigne={tIdent.consigne} questions={p.identification} {...commun} />;
                }
                if (sec === 'fonctions') {
                  return <Bloc key={sec} titre={tFonc.titre} consigne={tFonc.consigne} questions={p.fonctions} {...commun} />;
                }
                if (sec === 'calculs') {
                  return p.calculs ? <Bloc key={sec} titre={tCalc.titre} consigne={tCalc.consigne} questions={p.calculs} {...commun} /> : null;
                }
                if (sec === 'adressage') {
                  return p.adressage ? <Bloc key={sec} titre={tAdr.titre} consigne={tAdr.consigne} questions={p.adressage} {...commun} /> : null;
                }
                if (sec === 'grafcetQuiz') {
                  return p.grafcetQuiz ? (
                    <React.Fragment key={sec}>
                      <GrafcetIntro titre={p.intitules?.grafcetQuiz?.titre} />
                      <Bloc
                        titre={p.intitules?.grafcetQuiz ? 'Vérifie tes acquis, puis lis le grafcet du dossier' : 'Vérifie tes acquis sur le Grafcet'}
                        consigne={p.intitules?.grafcetQuiz?.consigne ?? 'Quatre questions : elles débloquent le Grafcet du portail.'}
                        questions={p.grafcetQuiz} {...commun}
                      />
                    </React.Fragment>
                  ) : null;
                }
                if (sec === 'grafcet') {
                  return p.grafcet ? (
                    <GrafcetPortail
                      key={sec}
                      titre={p.intitules?.grafcet?.titre}
                      consigne={p.intitules?.grafcet?.consigne}
                      cases={p.grafcet.cases} st={st} onAnswer={onAnswer}
                      verrou={(p.grafcetQuiz ?? []).some(q => st.prep?.[q.id] == null)}
                    />
                  ) : null;
                }
                const b = (p.blocs ?? []).find(x => `bloc:${x.id}` === sec);
                return b ? (
                  <Bloc key={sec} titre={b.titre} consigne={b.consigne} outil={b.outil} questions={b.questions} {...commun} />
                ) : null;
              })}
            </div>
          </div>
        </div>
        )}
      </Center>
    </>
  );
}
