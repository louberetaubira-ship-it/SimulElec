'use client';
/**
 * Vue professeur d'un sujet numérique : copies des élèves de ses classes, ouverture
 * d'une copie, validation des réponses rédigées (note 0 / ½ / 1 ou curseur + annotation),
 * recalcul du bilan et écriture de `attempts.score` + `attempts.evaluation`,
 * réactivation d'une copie remise.
 *
 * Corrigé : réponse attendue toujours visible ici ; « Publier le corrigé » / « Retirer » par classe
 * (table `sujet_corriges`, migration 0016) ouvre les réponses attendues aux élèves de la classe
 * (un sujet thématique est aussi ouvert par la publication du sujet complet). Statistiques par
 * question : taux de réussite et nombre d'élèves par erreur typique reconnue.
 *
 * Un dossier = un sujet complet + ses sujets thématiques : sélecteur « Sujet complet · T1 · T2… »
 * en tête, et suivi de la classe avec une colonne par sujet du dossier (note /20, « n/N » en
 * cours, « à valider », « — ») ; un clic ouvre la copie (`?copie=<id>` pour un autre sujet).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { SujetAttemptState, SujetNumerique } from '@/lib/sujet/types';
import { correctionProf } from '@/lib/sujet/correction-base';
import { calculerBilan, evaluationSujet, scoreStocke } from '@/lib/sujet/bilan';
import {
  CLASSE_DEMO, listCopiesSujets, listPublications, publierCorrige, reactiverCopie, retirerCorrige, statsQuestions, validerCopie,
  type CopieSujet, type PublicationCorrige,
} from '@/lib/sujet/copies';
import { corrigeSujet } from '@/lib/sujet/solution';
import { repere } from '@/lib/sujet/format';
import { estReponduePublique as estRepondue, sujetPublic } from '@/lib/sujet/public';
import { fmtNombre } from '@/lib/sujet/normalize';
import { apiRemettre, fmtDuree } from '@/lib/sujet/store';
import { listMyClasses } from '@/lib/db/classes';
import type { ClassRow } from '@/lib/db/types';
import { DEMO } from '@/lib/student';
import Bilan from '@/components/sujet/Bilan';
import Correction from '@/components/sujet/Correction';
import { BOUTON, BOUTON_FORT } from '@/components/sujet/outils';
import { THEMES, THEME_COMPLET } from '@/lib/sujet/themes';
import type { ThemeSujet } from '@/lib/sujet/types';

/** Un sujet du dossier, résumé pour le sélecteur et les colonnes du suivi. */
export interface SujetOnglet {
  id: string;
  titre: string;
  /** « Sujet complet », « T1 », « T2 »… */
  code: string;
  theme: ThemeSujet | null;
  questions: number;
  points: number;
}

const STATUT: Record<CopieSujet['status'], string> = {
  en_cours: 'En cours', termine: 'Remise', cloture: 'Clôturée', abandonne: 'Abandonnée',
};

const couleurNote = (n: number) => (n >= 14 ? 'bg-[#D7F5E3] text-[#0F6B3A]' : n >= 10 ? 'bg-[#FFF3D6] text-[#8A5A00]' : 'bg-[#FDE8E6] text-[#A3271F]');

export default function ProfSujetClient({ sujet, onglets: dossier }: { onglets: SujetOnglet[]; sujet: SujetNumerique }) {
  /** Copies de tous les sujets du dossier (suivi de classe). */
  const [toutes, setToutes] = useState<CopieSujet[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classe, setClasse] = useState<string>('toutes');
  const [chargement, setChargement] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [edit, setEdit] = useState<SujetAttemptState | null>(null);
  const [modifie, setModifie] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [publications, setPublications] = useState<PublicationCorrige[]>([]);
  const publique = useMemo(() => sujetPublic(sujet), [sujet]);
  const corrige = useMemo(() => corrigeSujet(sujet, DEMO), [sujet]);

  const charger = useCallback(async () => {
    setChargement(true); setErr(null);
    try {
      const [cs, cl, pubs] = await Promise.all([
        listCopiesSujets(dossier.map(d => d.id), DEMO),
        DEMO ? Promise.resolve([]) : listMyClasses(),
        listPublications(dossier.map(d => d.id), DEMO).catch(e => { setErr(e instanceof Error ? e.message : String(e)); return []; }),
      ]);
      setToutes(cs); setClasses(cl); setPublications(pubs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement.');
    } finally {
      setChargement(false);
    }
  }, [dossier]);
  useEffect(() => { void charger(); }, [charger]);

  const copies = useMemo(() => toutes.filter(c => c.sujetId === sujet.id), [toutes, sujet.id]);

  const copie = copies.find(c => c.id === ouverte) ?? null;
  const nomClasse = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);
  const visibles = copies.filter(c => classe === 'toutes' || c.eleve.class_id === classe);

  const ouvrir = (c: CopieSujet) => {
    setOuverte(c.id); setMsg(null); setErr(null); setModifie(false);
    if (!c.state) { setEdit(null); return; }
    if (c.state.remise) { setEdit(c.state); return; }
    // Copie en cours : correction provisoire calculée par le SERVEUR (la Compute Engine n'est pas
    // embarquée dans le navigateur), non enregistrée ; les notes du professeur sont conservées.
    const st = c.state;
    setEdit({ ...st, corrections: {} });
    apiRemettre(sujet.id, st.reponses)
      .then(r => {
        const corrections = { ...r.corrections };
        Object.values(st.corrections).forEach(k => { if (k.statut === 'prof') corrections[k.num] = k; });
        setEdit(e => (e && e.sujetId === st.sujetId && e.reponses === st.reponses ? { ...e, corrections } : e));
      })
      .catch(e => setErr(e instanceof Error ? e.message : 'Correction provisoire impossible.'));
  };

  // Copie demandée par l'adresse (clic dans le suivi d'un autre sujet du dossier).
  const [demandee, setDemandee] = useState<string | null>(null);
  useEffect(() => { setDemandee(new URLSearchParams(window.location.search).get('copie')); }, []);
  useEffect(() => {
    if (!demandee || chargement) return;
    const c = copies.find(x => x.id === demandee);
    setDemandee(null);
    if (c) ouvrir(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandee, chargement, copies]);

  const bilan = useMemo(() => (edit ? calculerBilan(sujet, edit.corrections) : null), [edit, sujet]);
  const remise = !!copie && (copie.status === 'termine' || copie.status === 'cloture') && !!edit?.remise;

  const noter = (num: number, score: number) => {
    if (!edit || !remise) return;
    setEdit({ ...edit, corrections: { ...edit.corrections, [num]: correctionProf(num, score) } });
    setModifie(true);
  };
  const annoter = (num: number, t: string) => {
    if (!edit || !remise) return;
    const annotations = { ...edit.annotations };
    if (t) annotations[num] = t; else delete annotations[num];
    setEdit({ ...edit, annotations });
    setModifie(true);
  };
  const toutValider = () => {
    if (!edit || !bilan) return;
    const corrections = { ...edit.corrections };
    for (const n of bilan.aValider) corrections[n] = correctionProf(n, corrections[n]?.score ?? 0, 'Pré-note confirmée par le professeur');
    setEdit({ ...edit, corrections });
    setModifie(true);
  };

  const enregistrer = async () => {
    if (!edit || !copie || !bilan) return;
    setEnvoi(true); setErr(null); setMsg(null);
    try {
      const score = scoreStocke(bilan);
      await validerCopie(sujet.id, copie.id, edit, score, evaluationSujet(sujet, bilan), DEMO);
      setMsg(`Copie enregistrée : ${fmtNombre(bilan.note20, 2)} / 20.`);
      setModifie(false);
      await charger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setEnvoi(false);
    }
  };
  const basculerPublication = async (classId: string, publier: boolean) => {
    setEnvoi(true); setErr(null); setMsg(null);
    try {
      if (publier) await publierCorrige(classId, sujet.id, DEMO); else await retirerCorrige(classId, sujet.id, DEMO);
      setPublications(await listPublications(dossier.map(d => d.id), DEMO));
      setMsg(publier ? 'Corrigé publié : les élèves de la classe voient les réponses attendues.' : 'Publication du corrigé retirée.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Publication impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  const reactiver = async () => {
    if (!copie) return;
    if (!window.confirm('Réactiver cette copie ? Elle repasse « en cours » : l’élève pourra la modifier et devra la remettre à nouveau.')) return;
    setEnvoi(true); setErr(null);
    try {
      await reactiverCopie(sujet.id, copie.id, DEMO);
      setMsg('Copie réactivée : l’élève peut la reprendre.');
      setOuverte(null); setEdit(null);
      await charger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Réactivation impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6" data-prof-sujet>
      <Link href="/prof" className="text-[13px] font-medium text-muted hover:text-ink">← Tableau de bord</Link>
      <header className="mb-4 mt-2">
        <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">Sujet numérique · vue professeur</div>
        <h1 className="font-title text-[30px] font-bold leading-tight">{sujet.titre}</h1>
        <p className="text-[13px] text-muted">{sujet.questions.length} questions · {sujet.parties.length} partie{sujet.parties.length > 1 ? 's' : ''} · barème {fmtNombre(sujet.questions.reduce((a, q) => a + q.points, 0))} points · {fmtDuree(sujet.dureeMin * 60)}.
          {' '}<Link href={`/sujet/${sujet.id}`} className="font-semibold underline">Ouvrir le sujet</Link></p>
        {dossier.length > 1 && (
          <nav aria-label="Sujets du dossier" className="mt-3 flex flex-wrap gap-1.5" data-selecteur-sujets>
            {dossier.map(d => {
              const t = d.theme ? THEMES[d.theme] : THEME_COMPLET;
              const on = d.id === sujet.id;
              return (
                <Link key={d.id} href={`/prof/sujet/${d.id}`} aria-current={on ? 'page' : undefined} data-onglet-sujet={d.id} title={d.titre}
                  className={`min-h-[36px] rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${on ? 'text-white' : 'bg-surface text-ink hover:brightness-95'}`}
                  style={on ? { background: t.couleur, borderColor: t.couleur } : { borderColor: t.couleur }}>
                  {t.icone} {d.code}{d.theme ? ` · ${t.label}` : ''}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {err && <p className="mb-3 rounded-lg bg-[#FDE8E6] px-3 py-2 text-[13px] text-[#9B1C1C]" role="alert">{err}</p>}
      {msg && <p className="mb-3 rounded-lg bg-good/15 px-3 py-2 text-[13px] text-good" role="status">{msg}</p>}

      {!copie && dossier.length > 1 && (
        <SuiviDossier dossier={dossier} copies={toutes} courant={sujet.id} classe={classe} chargement={chargement}
          onOuvrir={c => { if (c.sujetId === sujet.id) ouvrir(c); else window.location.href = `/prof/sujet/${c.sujetId}?copie=${encodeURIComponent(c.id)}`; }} />
      )}

      {!copie && (
        <PublicationCorrige sujetId={sujet.id} parent={sujet.parent ?? null} classes={DEMO ? [{ id: CLASSE_DEMO, name: 'Démonstration (ce navigateur)' }] : classes}
          publications={publications} envoi={envoi} onBasculer={(c, p) => void basculerPublication(c, p)} />
      )}

      {!copie && (
        <section className="rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <h2 className="flex-1 text-[15px] font-bold">Copies des élèves ({visibles.length})</h2>
            {classes.length > 0 && (
              <select className="min-h-[36px] rounded-lg border border-line bg-surface px-2 text-[13px]" value={classe} onChange={e => setClasse(e.target.value)} aria-label="Classe">
                <option value="toutes">Toutes mes classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button type="button" className={BOUTON} onClick={() => void charger()}>↻ Actualiser</button>
          </div>
          {chargement ? (
            <p className="p-4 text-[13px] text-muted">Chargement…</p>
          ) : visibles.length === 0 ? (
            <p className="p-4 text-[13px] text-muted">Aucune copie pour ce sujet{DEMO ? ' dans ce navigateur' : ' chez vos élèves'}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[.05em] text-muted">
                    <th className="px-3 py-2">Élève</th><th className="px-3 py-2">Classe</th><th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Note</th><th className="px-3 py-2">Réponses</th><th className="px-3 py-2">À valider</th>
                    <th className="px-3 py-2">Mise à jour</th><th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map(c => {
                    const st = c.state;
                    const rep = st ? sujet.questions.filter(q => estRepondue(q, st.reponses[q.num])).length : 0;
                    const aVal = st?.remise ? Object.values(st.corrections).filter(k => k.statut === 'aValider').length : 0;
                    return (
                      <tr key={c.id} className="border-t border-line" data-copie={c.id}>
                        <td className="px-3 py-2 font-semibold">{c.eleve.nom}</td>
                        <td className="px-3 py-2 text-muted">{(c.eleve.class_id && nomClasse.get(c.eleve.class_id)) || '—'}</td>
                        <td className="px-3 py-2">{STATUT[c.status]}{st ? ` · ${st.mode === 'examen' ? 'examen' : 'entraînement'}` : ''}</td>
                        <td className="px-3 py-2 font-mono">{c.score != null ? `${fmtNombre(Math.round((c.score / 5) * 100) / 100, 2)}/20` : '—'}</td>
                        <td className="px-3 py-2 font-mono">{rep}/{sujet.questions.length}</td>
                        <td className="px-3 py-2">{aVal > 0 ? <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent-ink">{aVal}</span> : '—'}</td>
                        <td className="px-3 py-2 text-muted">{c.updated_at ? new Date(c.updated_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" className={BOUTON} onClick={() => ouvrir(c)} disabled={!st} data-ouvrir-copie>Ouvrir</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!copie && !chargement && <StatsErreurs sujet={sujet} copies={copies.filter(c => classe === 'toutes' || c.eleve.class_id === classe)} />}

      {copie && (
        <div className="space-y-4">
          <div className="sticky top-[56px] z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur">
            <button type="button" className={BOUTON} onClick={() => { if (!modifie || window.confirm('Quitter sans enregistrer ?')) { setOuverte(null); setEdit(null); } }}>← Copies</button>
            <div className="min-w-0 flex-1">
              <b>{copie.eleve.nom}</b> · <span className="text-muted">{STATUT[copie.status]}{edit ? ` · ${fmtDuree(edit.secondesEcoulees)}` : ''}</span>
              {bilan && <span className="ml-2 font-mono font-bold">{fmtNombre(bilan.note20, 2)}/20</span>}
              {modifie && <span className="ml-2 text-[12px] font-semibold text-accent-ink">modifications non enregistrées</span>}
            </div>
            {remise && bilan && bilan.aValider.length > 0 && (
              <button type="button" className={BOUTON} onClick={toutValider} data-tout-valider>Confirmer les {bilan.aValider.length} pré-notes</button>
            )}
            {remise && <button type="button" className={BOUTON_FORT} onClick={() => void enregistrer()} disabled={envoi || !modifie} data-enregistrer-validation>Enregistrer la correction</button>}
            {(copie.status === 'termine' || copie.status === 'cloture') && (
              <button type="button" className={BOUTON} onClick={() => void reactiver()} disabled={envoi} data-reactiver>Réactiver</button>
            )}
          </div>
          {!remise && <p className="rounded-lg bg-surface2 px-3 py-2 text-[13px] text-muted">Copie non remise : correction provisoire, calculée sur les réponses actuelles (rien n’est enregistré).</p>}
          {edit && bilan && (
            <>
              <Bilan sujet={sujet} bilan={bilan} st={edit} eleve={copie.eleve.nom}
                onQuestion={n => document.querySelector(`[data-copie-question="${n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
              <Correction sujet={publique} st={edit} corrige={corrige} prof={remise ? { onNote: noter, onAnnotation: annoter } : undefined} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Suivi de la classe : une ligne par élève, une colonne par sujet du dossier. */
function SuiviDossier({ dossier, copies, courant, classe, chargement, onOuvrir }: {
  dossier: SujetOnglet[];
  copies: CopieSujet[];
  courant: string;
  classe: string;
  chargement: boolean;
  onOuvrir: (c: CopieSujet) => void;
}) {
  const lignes = useMemo(() => {
    const parEleve = new Map<string, { nom: string; cellules: Map<string, CopieSujet> }>();
    // Copies les plus récentes d'abord : la première vue par élève et par sujet est retenue.
    const triees = [...copies].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    for (const c of triees) {
      if (classe !== 'toutes' && c.eleve.class_id !== classe) continue;
      const e = parEleve.get(c.eleve.id) ?? { nom: c.eleve.nom, cellules: new Map<string, CopieSujet>() };
      if (!e.cellules.has(c.sujetId)) e.cellules.set(c.sujetId, c);
      parEleve.set(c.eleve.id, e);
    }
    return Array.from(parEleve.entries()).sort((a, b) => a[1].nom.localeCompare(b[1].nom, 'fr'));
  }, [copies, classe]);

  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface" data-suivi-dossier>
      <div className="border-b border-line p-3">
        <h2 className="text-[15px] font-bold">Suivi de la classe · une colonne par sujet du dossier</h2>
        <p className="text-[12px] text-muted">Note /20 · « n/N » = en cours (réponses) · « à valider » = rédigés en attente · « — » = non commencé. Un clic ouvre la copie.</p>
      </div>
      {chargement ? (
        <p className="p-4 text-[13px] text-muted">Chargement…</p>
      ) : lignes.length === 0 ? (
        <p className="p-4 text-[13px] text-muted">Aucune copie sur ce dossier pour l’instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[.05em] text-muted">
                <th className="px-3 py-2">Élève</th>
                {dossier.map(d => {
                  const t = d.theme ? THEMES[d.theme] : THEME_COMPLET;
                  return (
                    <th key={d.id} className="px-2 py-2 text-center" title={d.titre}>
                      <span className={`inline-block border-b-2 pb-0.5 ${d.id === courant ? 'text-ink' : ''}`} style={{ borderColor: t.couleur }}>
                        {d.code}{d.theme ? ` ${t.court}` : ''}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {lignes.map(([id, e]) => (
                <tr key={id} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold">{e.nom}</td>
                  {dossier.map(d => {
                    const c = e.cellules.get(d.id);
                    if (!c) return <td key={d.id} className="px-2 py-2 text-center"><span className="inline-block min-w-[48px] rounded-md bg-[#EEF1F5] px-1.5 py-0.5 font-mono text-[12px] font-bold text-[#8A94A3]">—</span></td>;
                    const remise = c.status === 'termine' || c.status === 'cloture';
                    const aVal = remise && c.state?.remise ? Object.values(c.state.corrections).filter(k => k.statut === 'aValider').length : 0;
                    const note = remise && c.score != null ? Math.round((c.score / 5) * 100) / 100 : null;
                    const texte = !remise ? `${c.repondues}/${d.questions}` : aVal > 0 ? 'à valider' : note != null ? fmtNombre(note, 2) : '—';
                    const cls = !remise || aVal > 0 ? 'bg-[#FFF3D6] text-[#8A5A00]' : note != null ? couleurNote(note) : 'bg-[#EEF1F5] text-[#8A94A3]';
                    return (
                      <td key={d.id} className="px-2 py-2 text-center">
                        <button type="button" onClick={() => onOuvrir(c)} data-cellule-suivi={`${d.id}`} disabled={!c.state}
                          title={`${d.titre} — ${remise ? (aVal ? `${aVal} réponse(s) à valider` : 'copie remise') : 'en cours'}`}
                          className={`min-w-[48px] rounded-md px-1.5 py-0.5 font-mono text-[12px] font-bold hover:ring-2 hover:ring-accent ${cls}`}>
                          {texte}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Publication du corrigé, classe par classe (réponses attendues visibles des élèves). */
function PublicationCorrige({ sujetId, parent, classes, publications, envoi, onBasculer }: {
  sujetId: string;
  parent: string | null;
  classes: { id: string; name: string }[];
  publications: PublicationCorrige[];
  envoi: boolean;
  onBasculer: (classId: string, publier: boolean) => void;
}) {
  const date = (d: string) => (d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface" data-publication-corrige>
      <div className="border-b border-line p-3">
        <h2 className="text-[15px] font-bold">Corrigé des élèves</h2>
        <p className="text-[12px] text-muted">
          Tant que le corrigé n’est pas publié, l’élève voit sa note, juste / faux et les aides, mais jamais la réponse attendue.
          {parent ? ' Ce sujet thématique est aussi ouvert par la publication du sujet complet.' : ' La publication du sujet complet ouvre aussi ses sujets thématiques.'}
        </p>
      </div>
      {classes.length === 0 ? (
        <p className="p-3 text-[13px] text-muted">Aucune classe.</p>
      ) : (
        <ul className="divide-y divide-line">
          {classes.map(c => {
            const propre = publications.find(p => p.class_id === c.id && p.sujet_id === sujetId);
            const parParent = parent ? publications.find(p => p.class_id === c.id && p.sujet_id === parent) : undefined;
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]" data-classe-publication={c.id}>
                <b className="min-w-[140px]">{c.name}</b>
                <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${propre || parParent ? 'bg-good/15 text-good' : 'bg-surface2 text-muted'}`} data-etat-publication={propre || parParent ? 'publie' : 'non'}>
                  {propre ? `Publié${propre.publie_le ? ` le ${date(propre.publie_le)}` : ''}` : parParent ? 'Publié (via le sujet complet)' : '🔒 Non publié'}
                </span>
                <span className="flex-1" />
                {propre ? (
                  <button type="button" className={BOUTON} disabled={envoi} onClick={() => onBasculer(c.id, false)} data-retirer-corrige>Retirer la publication</button>
                ) : (
                  <button type="button" className={BOUTON_FORT} disabled={envoi} onClick={() => onBasculer(c.id, true)} data-publier-corrige>Publier le corrigé</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Statistiques par question : taux de réussite et élèves par erreur typique. */
function StatsErreurs({ sujet, copies }: { sujet: SujetNumerique; copies: CopieSujet[] }) {
  const stats = useMemo(() => statsQuestions(sujet, copies), [sujet, copies]);
  const [tout, setTout] = useState(false);
  const lignes = stats.filter(s => s.corrigees > 0);
  const avecErreurs = lignes.filter(s => s.erreurs.length > 0).length;
  const lab = new Map(sujet.questions.map(q => [q.num, repere(q)]));
  const visibles = tout ? lignes : lignes.filter(s => s.erreurs.length > 0 || (s.taux ?? 1) < 0.5);
  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface" data-stats-erreurs>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="flex-1">
          <h2 className="text-[15px] font-bold">Erreurs typiques et réussite par question</h2>
          <p className="text-[12px] text-muted">Une copie par élève (la plus récente) · {lignes.length} question{lignes.length > 1 ? 's' : ''} corrigée{lignes.length > 1 ? 's' : ''} au moins une fois · {avecErreurs} avec une erreur typique reconnue.</p>
        </div>
        <button type="button" className={BOUTON} onClick={() => setTout(v => !v)}>{tout ? 'Questions à surveiller' : 'Toutes les questions'}</button>
      </div>
      {visibles.length === 0 ? (
        <p className="p-4 text-[13px] text-muted">{lignes.length ? 'Aucune erreur typique reconnue, aucune question sous 50 % de réussite.' : 'Pas encore de copie corrigée.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[.05em] text-muted">
                <th className="px-3 py-2">Question</th><th className="px-3 py-2">Réussite</th><th className="px-3 py-2">Justes</th><th className="px-3 py-2">Erreurs typiques (élèves)</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map(s => (
                <tr key={s.num} className="border-t border-line align-top" data-stat-question={s.num}>
                  <td className="px-3 py-2 font-mono font-semibold">{lab.get(s.num)}</td>
                  <td className="px-3 py-2 font-mono">{s.taux == null ? '—' : `${Math.round(s.taux * 100)} %`}</td>
                  <td className="px-3 py-2 font-mono">{s.justes}/{s.corrigees}</td>
                  <td className="px-3 py-2">
                    {s.erreurs.length === 0 ? <span className="text-muted">—</span> : (
                      <ul className="space-y-0.5">
                        {s.erreurs.map(e => (
                          <li key={e.id} data-stat-erreur={e.id}>
                            <b className="font-mono">{e.eleves}</b> élève{e.eleves > 1 ? 's' : ''} · <span className="font-semibold">{e.id}</span>
                            {e.message && <span className="text-muted"> — {e.message}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
