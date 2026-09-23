'use client';
/**
 * Interface d'épreuve d'un sujet numérique (maquette validée) :
 * barre sombre (titre, mode, chrono, progression, calculatrice, remise), navigation par
 * partie, zone question avec son outil de réponse, visualiseur DTR à droite (tiroir sur
 * mobile). Après la remise : copie corrigée et bilan.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { corriger, estRepondue } from '@/lib/sujet/correction';
import { calculerBilan } from '@/lib/sujet/bilan';
import { nomPageDtr } from '@/lib/sujet/dtr';
import { LIBELLE_OUTIL, repere, texteAttendu } from '@/lib/sujet/format';
import { fmtNombre } from '@/lib/sujet/normalize';
import { fmtDuree, questionDe, reprendreChrono, restantes, useSujet } from '@/lib/sujet/store';
import type { QuestionBase, SujetQuestion } from '@/lib/sujet/types';
import Bilan from './Bilan';
import Calculatrice from './Calculatrice';
import Correction from './Correction';
import DtrViewer from './DtrViewer';
import NavQuestions from './NavQuestions';
import Question from './Question';
import Texte from './Texte';
import { BOUTON, BOUTON_FORT } from './outils';

export default function SujetShell() {
  const sujet = useSujet(s => s.sujet)!;
  const st = useSujet(s => s.st);
  const verrou = useSujet(s => s.verrou);
  const modeImpose = useSujet(s => s.modeImpose);
  const alerte = useSujet(s => s.alerte);
  const vue = useSujet(s => s.vue);
  const dtrOuvert = useSujet(s => s.dtrOuvert);
  const calcOuverte = useSujet(s => s.calcOuverte);
  const horsLigne = useSujet(s => s.horsLigne);
  const local = useSujet(s => s.local);
  const enregistrement = useSujet(s => s.enregistrement);
  const { tick, sauver, setMode, remettre, setVue, setDtrOuvert, setCalc, fermerAlerte, aller } = useSujet.getState();
  const [navOuverte, setNavOuverte] = useState(false);
  const [confirmer, setConfirmer] = useState<null | 'remise' | 'entrainement'>(null);

  // Chrono (onglet visible uniquement) + sauvegarde périodique.
  useEffect(() => {
    reprendreChrono();
    const t = setInterval(() => tick(), 1000);
    const s = setInterval(() => { void sauver(); }, 30000);
    const vis = () => {
      if (document.visibilityState === 'visible') reprendreChrono();
      else void sauver();
    };
    const quitter = () => { void sauver(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', quitter);
    return () => {
      clearInterval(t); clearInterval(s);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pagehide', quitter);
      void sauver();
    };
  }, [tick, sauver]);

  const nbRep = useMemo(() => sujet.questions.filter(q => estRepondue(q, st.reponses[q.num])).length, [sujet, st.reponses]);
  const bilan = useMemo(() => (st.remise ? calculerBilan(sujet, st.corrections) : null), [sujet, st.remise, st.corrections]);
  const examen = st.mode === 'examen';

  const revoir = (num: number) => { aller(num); setVue('questions'); };

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col bg-app" data-sujet-shell>
      {/* Barre */}
      <div className="flex flex-none flex-wrap items-center gap-x-3 gap-y-1.5 bg-[#1B222C] px-3 py-2 text-[13px] text-white print:hidden">
        <button type="button" className="grid h-9 w-9 place-items-center rounded-lg bg-[#2B3A4A] lg:hidden" onClick={() => setNavOuverte(v => !v)} aria-label="Questions" aria-expanded={navOuverte}>☰</button>
        <b className="max-w-[40vw] truncate font-title text-[16px] tracking-wide" title={sujet.titre}>{sujet.titre}</b>
        <span className="rounded-full bg-[#2B3A4A] px-2.5 py-0.5 text-[12px] font-semibold" data-mode={st.mode}>
          {examen ? `Mode examen · ${fmtDuree(sujet.dureeMin * 60)}` : 'Mode entraînement'}{modeImpose ? ' (imposé)' : ''}
        </span>
        <Chrono />
        <span className="rounded-full bg-[#2B3A4A] px-2.5 py-0.5 text-[12px] font-semibold" data-progression>{nbRep} / {sujet.questions.length} répondues</span>
        {!local && (enregistrement ? <span className="text-[11px] text-[#9AA3AE]">enregistrement…</span> : null)}
        <span className="flex-1" />
        {st.remise ? (
          <div role="tablist" className="flex gap-1">
            {(['questions', 'correction', 'bilan'] as const).map(v => (
              <button key={v} type="button" role="tab" aria-selected={vue === v} onClick={() => setVue(v)} data-vue={v}
                className={`min-h-[34px] rounded-lg px-3 text-[12.5px] font-semibold ${vue === v ? 'bg-accent text-[#1B1B1B]' : 'bg-[#2B3A4A] hover:bg-[#35475A]'}`}>
                {v === 'questions' ? 'Questions' : v === 'correction' ? 'Copie corrigée' : 'Bilan'}
              </button>
            ))}
          </div>
        ) : (
          <>
            {!modeImpose && (
              <button type="button" className="min-h-[34px] rounded-lg border border-white/20 px-3 text-[12.5px] font-semibold hover:bg-white/10" data-basculer-mode
                onClick={() => (examen ? setConfirmer('entrainement') : setMode('examen'))}>
                {examen ? <>Repasser <span className="hidden sm:inline">en </span>entraînement</> : <><span className="hidden sm:inline">Passer en mode </span>examen</>}
              </button>
            )}
          </>
        )}
        <button type="button" onClick={() => setCalc(!calcOuverte)} aria-pressed={calcOuverte} data-ouvrir-calc
          className={`min-h-[34px] rounded-lg px-3 text-[12.5px] font-semibold ${calcOuverte ? 'bg-accent text-[#1B1B1B]' : 'bg-[#2B3A4A] hover:bg-[#35475A]'}`}>🧮 <span className="hidden sm:inline">Calculatrice</span></button>
        <button type="button" onClick={() => setDtrOuvert(!dtrOuvert)} className="min-h-[34px] rounded-lg bg-[#2B3A4A] px-3 text-[12.5px] font-semibold lg:hidden" data-ouvrir-dtr>📄 DTR</button>
        {!st.remise && (
          <button type="button" onClick={() => setConfirmer('remise')} data-remettre
            className="min-h-[34px] rounded-lg bg-accent px-3 text-[12.5px] font-bold text-[#1B1B1B] hover:brightness-110">Remettre<span className="hidden sm:inline"> la copie</span></button>
        )}
      </div>

      {(horsLigne || local) && (
        <div className={`flex-none px-3 py-1 text-[12px] print:hidden ${horsLigne ? 'bg-[#FEF3E2] text-[#8A5A00]' : 'bg-surface2 text-muted'}`}>
          {horsLigne
            ? 'Hors ligne : ta copie n’est pas enregistrée sur le serveur pour l’instant. Garde cet onglet ouvert, elle le sera au retour du réseau.'
            : 'Mode démonstration : ta copie est enregistrée dans ce navigateur.'}
          {horsLigne && st.remise && !verrou && (
            <button type="button" className="ml-2 font-semibold underline" onClick={() => void remettre()}>Renvoyer la copie</button>
          )}
        </div>
      )}

      {alerte && (
        <div role="status" className="fixed left-1/2 top-[70px] z-[90] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-[#1B222C] px-4 py-2.5 text-[13px] text-white shadow-2xl" data-alerte>
          <span>{alerte}</span>
          <button type="button" onClick={fermerAlerte} className="text-[#9AA3AE] hover:text-white" aria-label="Fermer">✕</button>
        </div>
      )}

      {vue === 'questions' || !st.remise ? (
        <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[210px_minmax(0,1fr)_minmax(340px,40%)]">
          {/* Navigation */}
          <aside className={`${navOuverte ? 'absolute inset-x-0 top-0 z-30 max-h-[70%] shadow-xl' : 'hidden'} overflow-auto border-r border-line bg-surface2 p-2.5 lg:static lg:block lg:max-h-none lg:shadow-none print:hidden`}>
            <NavQuestions onChoisir={() => setNavOuverte(false)} />
          </aside>
          {/* Question */}
          <main className="min-h-0 overflow-auto" data-zone-question>
            <ZoneQuestion />
          </main>
          {/* DTR */}
          <aside className={`${dtrOuvert ? 'fixed inset-y-0 right-0 z-[60] w-[94vw] max-w-[640px] shadow-2xl' : 'hidden'} min-h-0 lg:static lg:z-auto lg:block lg:w-auto lg:max-w-none lg:shadow-none print:hidden`}>
            <DtrViewer onFermer={dtrOuvert ? () => setDtrOuvert(false) : undefined} />
          </aside>
          {dtrOuvert && <button type="button" aria-label="Fermer le DTR" className="fixed inset-0 z-[55] bg-black/40 lg:hidden" onClick={() => setDtrOuvert(false)} />}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[1100px] px-4 py-5">
            {vue === 'bilan' && bilan && (
              <>
                <Bilan sujet={sujet} bilan={bilan} st={st} onQuestion={revoir} />
                <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                  <button type="button" className={BOUTON_FORT} onClick={() => setVue('correction')}>Voir la copie corrigée</button>
                  <Link href="/moi" className={BOUTON}>Mon espace</Link>
                </div>
                <div className="hidden print:mt-6 print:block"><Correction sujet={sujet} st={st} /></div>
              </>
            )}
            {vue === 'correction' && <Correction sujet={sujet} st={st} onRevoir={revoir} />}
          </div>
        </div>
      )}

      {calcOuverte && <Calculatrice onFermer={() => setCalc(false)} />}

      {confirmer && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-[440px] rounded-2xl bg-surface p-5 shadow-2xl">
            {confirmer === 'remise' ? (
              <>
                <h2 className="font-title text-[22px] font-bold">Remettre ta copie ?</h2>
                <p className="mt-1 text-[14px] text-muted">
                  Tu as répondu à <b className="text-ink">{nbRep}</b> question{nbRep > 1 ? 's' : ''} sur {sujet.questions.length}.
                  {sujet.questions.length - nbRep > 0 && <> {sujet.questions.length - nbRep} restent sans réponse.</>}
                  {st.marquees.length > 0 && <> {st.marquees.length} question{st.marquees.length > 1 ? 's sont marquées' : ' est marquée'} « à revoir ».</>}
                </p>
                <p className="mt-2 text-[13px]">Une fois remise, ta copie ne peut plus être modifiée : tu verras ta note, la copie corrigée et ton bilan.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" className={BOUTON} onClick={() => setConfirmer(null)}>Continuer l’épreuve</button>
                  <button type="button" className={BOUTON_FORT} data-confirmer-remise onClick={() => { setConfirmer(null); void remettre(); }}>Remettre définitivement</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-title text-[22px] font-bold">Repasser en entraînement ?</h2>
                <p className="mt-1 text-[14px] text-muted">Le chrono de l’examen s’arrête d’être un compte à rebours ; tu retrouves « Vérifier » et les indices. Tes réponses sont conservées.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" className={BOUTON} onClick={() => setConfirmer(null)}>Rester en examen</button>
                  <button type="button" className={BOUTON_FORT} onClick={() => { setConfirmer(null); setMode('entrainement'); }}>Passer en entraînement</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Chrono de la barre : seul composant abonné au temps qui passe (re-rendu chaque seconde). */
function Chrono() {
  const sujet = useSujet(s => s.sujet)!;
  const ecoule = useSujet(s => s.ecoule);
  const mode = useSujet(s => s.st.mode);
  const remise = useSujet(s => s.st.remise);
  const figees = useSujet(s => s.st.secondesEcoulees);
  const examen = mode === 'examen';
  const reste = restantes(sujet, ecoule);
  const alerte = examen && !remise && reste <= 30 * 60;
  return (
    <span className={`rounded-full px-2.5 py-0.5 font-mono text-[12px] font-semibold ${alerte ? (reste <= 300 ? 'animate-pulse bg-crit' : 'bg-[#8A5A00]') : 'bg-[#2B3A4A]'}`} data-chrono
      title={remise ? 'Temps passé' : examen ? 'Temps restant' : 'Temps passé'} role="timer">
      ⏱ {remise ? fmtDuree(figees) : examen ? fmtDuree(reste) : fmtDuree(ecoule)}
    </span>
  );
}

/* ───────────────────────────── zone question ───────────────────────────── */

function ZoneQuestion() {
  const sujet = useSujet(s => s.sujet)!;
  const st = useSujet(s => s.st);
  const revelees = useSujet(s => s.revelees);
  const { repondre, verifier, reveler, basculerMarque, suivante, voirPage, setDtrOuvert } = useSujet.getState();
  const q = questionDe(sujet, st.courante) as SujetQuestion;
  const partie = sujet.parties.find(p => p.num === q.partie);
  const premiereDePartie = sujet.questions.find(x => x.partie === q.partie)?.num === q.num;
  const [situation, setSituation] = useState(premiereDePartie);
  useEffect(() => { setSituation(premiereDePartie); }, [q.num, premiereDePartie]);

  const r = st.reponses[q.num];
  const c = st.corrections[q.num];
  const readOnly = st.remise;
  const entrainement = st.mode === 'entrainement' && !st.remise;
  const verifiee = entrainement && !!c;
  const montrer = st.remise || verifiee;
  const marque = st.marquees.includes(q.num);
  const idx = sujet.questions.findIndex(x => x.num === q.num);
  const derniere = idx === sujet.questions.length - 1;
  const revelee = revelees.includes(q.num);
  const juste = !!c && c.score >= 0.999 && c.statut !== 'aValider';

  const ouvrirPage = (kind: 'dtr' | 'sujet', num: number) => { voirPage({ kind, num }); setDtrOuvert(true); };

  return (
    <div className="mx-auto max-w-[900px] p-3 sm:p-4" key={q.num} data-question={q.num}>
      {/* Référence */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
        <span className="rounded-full border border-[#B9CDF5] bg-[#E8F0FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.06em] text-[#1F4FA3]" data-outil={q.type}>{LIBELLE_OUTIL[q.type]}</span>
        {q.dtr.map(n => (
          <button key={n} type="button" onClick={() => ouvrirPage('dtr', n)} className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-semibold text-ink hover:border-accent" data-lien-dtr={n}>
            {sujet.dtr.some(p => p.doc != null) ? nomPageDtr(sujet, n) : `Page DTR ${n}`}
          </button>
        ))}
        <button type="button" onClick={() => ouvrirPage('sujet', q.pageSujet)} className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-semibold text-ink hover:border-accent" data-voir-sujet>
          Voir la page du sujet (p. {q.pageSujet})
        </button>
        <span>· Partie {q.partie} · {q.competence} · {fmtNombre(q.points)} pt{q.points > 1 ? 's' : ''}</span>
      </div>

      {/* Mise en situation de la partie */}
      {partie && (
        <div className="mb-3 rounded-xl border border-line bg-surface">
          <button type="button" onClick={() => setSituation(v => !v)} aria-expanded={situation}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-semibold">
            <span><span className="text-accent">Partie {partie.num}</span> · {partie.titre}</span>
            <span className="flex-1" /><span className="flex-none text-muted"><span className="hidden sm:inline">{situation ? 'Masquer la mise en situation ' : 'Mise en situation '}</span>{situation ? '▴' : '▾'}</span>
          </button>
          {situation && (
            <div className="border-t border-line px-3 py-2 text-[13px] leading-relaxed">
              <Texte>{partie.situation}</Texte>
              {partie.objectifs.length > 0 && (
                <ul className="mt-1.5 list-disc pl-5 text-[12.5px] text-muted">{partie.objectifs.map((o, i) => <li key={i}>{o}</li>)}</ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tableau de données imprimé avant la question */}
      {q.tableauContexte && <TableauContexte t={q.tableauContexte} />}

      {/* Énoncé */}
      <h2 className="mb-1 flex items-baseline gap-2 text-[16px] font-bold leading-snug">
        <span className="flex-none font-title text-[20px] text-accent" data-repere-question>{repere(q)}</span>
        <span><Texte>{q.enonce}</Texte></span>
      </h2>
      {q.contexte && <div className="mb-2 rounded-lg border-l-4 border-accent/60 bg-surface2 px-3 py-2 text-[13px] leading-relaxed"><Texte>{q.contexte}</Texte></div>}
      {q.image && !imageDansOutil(q) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.image.src} alt={q.image.alt} className="mb-3 max-h-[520px] max-w-full rounded-lg border border-line bg-white" />
      )}

      <div className="mt-2">
        <Question q={q} r={r} readOnly={readOnly} montrer={montrer} onChange={rep => repondre(q.num, rep)} />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        <button type="button" className={BOUTON} onClick={() => suivante(-1)} disabled={idx === 0}>◂ Précédente</button>
        {entrainement && (
          <button type="button" className={BOUTON_FORT} onClick={() => verifier(q.num)} disabled={!estRepondue(q, r)} data-verifier>Vérifier</button>
        )}
        {!st.remise && (
          <button type="button" className={`${BOUTON} ${marque ? '!border-crit text-crit' : ''}`} onClick={() => basculerMarque(q.num)} aria-pressed={marque} data-marquer>
            🚩 {marque ? 'Marquée à revoir' : 'Marquer à revoir'}
          </button>
        )}
        <span className="flex-1" />
        <button type="button" className={BOUTON} onClick={() => suivante(1)} disabled={derniere} data-suivante>Suivante ▸</button>
      </div>

      {/* Retour de correction (entraînement) */}
      {verifiee && c && (
        <div className="mt-3 space-y-2" data-retour={juste ? 'juste' : 'faux'}>
          <div className={`rounded-lg px-3 py-2 text-[13.5px] font-semibold ${c.statut === 'aValider' ? 'bg-accent/15 text-accent-ink' : juste ? 'bg-good/15 text-good' : 'bg-crit/10 text-crit'}`}>
            {c.statut === 'aValider'
              ? `Réponse enregistrée — pré-note ${Math.round(c.score * 100)} % par mots-clés, validation par le professeur.`
              : juste ? 'Juste ✓' : c.score > 0 ? `Partiellement juste (${Math.round(c.score * 100)} %) — corrige ce qui est en rouge.` : 'À revoir — relis la page DTR liée.'}
            {c.detail && <span className="block text-[12px] font-normal opacity-80">{c.detail}</span>}
          </div>
          {(juste || revelee) && q.explication ? (
            <ProfBulle><b>Corrigé.</b> <Texte>{q.explication}</Texte></ProfBulle>
          ) : !juste && q.indice ? (
            <ProfBulle><b>Indice.</b> <Texte>{q.indice}</Texte></ProfBulle>
          ) : null}
          {!juste && (
            revelee ? (
              <div className="rounded-lg border border-good/30 bg-good/[.06] p-2 text-[12.5px]">
                <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[.06em] text-good">Réponse attendue</div>
                {texteAttendu(q).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            ) : (
              <button type="button" className="text-[12.5px] font-semibold text-muted underline" onClick={() => reveler(q.num)} data-reveler>Afficher la réponse attendue</button>
            )
          )}
        </div>
      )}

      {/* Copie remise : correction de la question */}
      {st.remise && (
        <div className="mt-3 space-y-2">
          <CorrectionLocale q={q} />
          {st.annotations[q.num] && <ProfBulle><b>Professeur :</b> {st.annotations[q.num]}</ProfBulle>}
        </div>
      )}
    </div>
  );
}

/** L'image d'appui est déjà celle de l'outil (schéma à compléter, plan à bulles) : ne pas la doubler. */
function imageDansOutil(q: SujetQuestion): boolean {
  if (!q.image) return false;
  if (q.type === 'schema') return q.image.src === q.traits.image.src;
  if (q.type === 'bulles' || q.type === 'placement') return q.image.src === q.plan.src;
  return false;
}

/** Tableau de données imprimé avant la question (planning, relevé…) : lisible, défilant sur mobile. */
function TableauContexte({ t }: { t: NonNullable<QuestionBase['tableauContexte']> }) {
  return (
    <figure className="mb-3" data-tableau-contexte>
      {t.titre && <figcaption className="mb-1 text-[12.5px] font-semibold"><Texte>{t.titre}</Texte></figcaption>}
      <div className="max-w-full overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-surface2">
              {t.colonnes.map((c, i) => (
                <th key={i} scope="col" className={`whitespace-nowrap border-b border-line px-2 py-1.5 text-left text-[11px] font-semibold text-muted ${i === 0 ? 'sticky left-0 z-[1] bg-surface2' : ''}`}>
                  <Texte>{c}</Texte>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.lignes.map((l, i) => (
              <tr key={i} className="border-t border-line align-top odd:bg-surface even:bg-app">
                {l.map((c, j) => (
                  j === 0
                    ? <th key={j} scope="row" className="sticky left-0 z-[1] whitespace-nowrap bg-inherit px-2 py-1 text-left font-semibold"><Texte>{c}</Texte></th>
                    : <td key={j} className={`px-2 py-1 ${c.length <= 20 ? 'whitespace-nowrap' : 'min-w-[140px]'}`}><Texte>{c}</Texte></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function CorrectionLocale({ q }: { q: SujetQuestion }) {
  const st = useSujet(s => s.st);
  const c = st.corrections[q.num] ?? corriger(q, st.reponses[q.num]);
  return (
    <div className="rounded-lg border border-line bg-surface p-3 text-[13px]">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <b>Correction</b>
        <span className="font-mono font-bold">{fmtNombre(Math.round(c.score * q.points * 100) / 100, 2)} / {fmtNombre(q.points)} pt{q.points > 1 ? 's' : ''}</span>
        {c.detail && <span className="text-[12px] text-muted">{c.detail}</span>}
      </div>
      <div className="text-[12.5px]"><span className="font-semibold text-good">Attendu : </span>{texteAttendu(q).join(' · ')}</div>
      {q.explication && <p className="mt-1 text-[12.5px] text-muted"><Texte>{q.explication}</Texte></p>}
    </div>
  );
}

function ProfBulle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-[#1B222C] px-3 py-2.5 text-[13px] text-[#E9EEF5]">
      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accent font-bold text-[#1B1B1B]">P</span>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
