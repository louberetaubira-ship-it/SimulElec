'use client';
/**
 * Vue professeur d'un sujet numérique : copies des élèves de ses classes, ouverture
 * d'une copie, validation des réponses rédigées (note 0 / ½ / 1 ou curseur + annotation),
 * recalcul du bilan et écriture de `attempts.score` + `attempts.evaluation`,
 * réactivation d'une copie remise.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { SujetAttemptState, SujetNumerique } from '@/lib/sujet/types';
import { corrigerCopie, correctionProf, estRepondue } from '@/lib/sujet/correction';
import { calculerBilan, evaluationSujet, scoreStocke } from '@/lib/sujet/bilan';
import { listCopiesSujet, reactiverCopie, validerCopie, type CopieSujet } from '@/lib/sujet/copies';
import { fmtNombre } from '@/lib/sujet/normalize';
import { fmtDuree } from '@/lib/sujet/store';
import { listMyClasses } from '@/lib/db/classes';
import type { ClassRow } from '@/lib/db/types';
import { DEMO } from '@/lib/student';
import Bilan from '@/components/sujet/Bilan';
import Correction from '@/components/sujet/Correction';
import { BOUTON, BOUTON_FORT } from '@/components/sujet/outils';

const STATUT: Record<CopieSujet['status'], string> = {
  en_cours: 'En cours', termine: 'Remise', cloture: 'Clôturée', abandonne: 'Abandonnée',
};

export default function ProfSujetClient({ sujet }: { sujet: SujetNumerique }) {
  const [copies, setCopies] = useState<CopieSujet[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classe, setClasse] = useState<string>('toutes');
  const [chargement, setChargement] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [edit, setEdit] = useState<SujetAttemptState | null>(null);
  const [modifie, setModifie] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true); setErr(null);
    try {
      const [cs, cl] = await Promise.all([listCopiesSujet(sujet.id, DEMO), DEMO ? Promise.resolve([]) : listMyClasses()]);
      setCopies(cs); setClasses(cl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement.');
    } finally {
      setChargement(false);
    }
  }, [sujet.id]);
  useEffect(() => { void charger(); }, [charger]);

  const copie = copies.find(c => c.id === ouverte) ?? null;
  const nomClasse = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);
  const visibles = copies.filter(c => classe === 'toutes' || c.eleve.class_id === classe);

  const ouvrir = (c: CopieSujet) => {
    setOuverte(c.id); setMsg(null); setErr(null); setModifie(false);
    if (!c.state) { setEdit(null); return; }
    // Copie en cours : correction provisoire calculée à la volée (non enregistrée).
    setEdit(c.state.remise ? c.state : { ...c.state, corrections: corrigerCopie(sujet, c.state) });
  };

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
        <p className="text-[13px] text-muted">{sujet.questions.length} questions · {sujet.parties.length} parties · barème {fmtNombre(sujet.questions.reduce((a, q) => a + q.points, 0))} points.
          {' '}<Link href={`/sujet/${sujet.id}`} className="font-semibold underline">Ouvrir le sujet</Link></p>
      </header>

      {err && <p className="mb-3 rounded-lg bg-[#FDE8E6] px-3 py-2 text-[13px] text-[#9B1C1C]" role="alert">{err}</p>}
      {msg && <p className="mb-3 rounded-lg bg-good/15 px-3 py-2 text-[13px] text-good" role="status">{msg}</p>}

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
              <Correction sujet={sujet} st={edit} prof={remise ? { onNote: noter, onAnnotation: annoter } : undefined} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
