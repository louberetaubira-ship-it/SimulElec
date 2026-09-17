'use client';

/**
 * Gestion des classes du professeur : création, archivage, comptes élèves et suivi en direct.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMyProfile } from '@/lib/db/profiles';
import {
  archiveClass,
  countStudentData,
  createClass,
  listClassAttempts,
  listMyClasses,
  listStudents,
  subscribeClassProgress,
  type StudentFootprint,
  type StudentProfile,
  type StudentWithProgress,
} from '@/lib/db/classes';
import type { AttemptRow, ClassRow, ProfileRow } from '@/lib/db/types';
import { eleveStats, noteSur20 } from '@/lib/eleve-stats';
import { DIPLOMAS, type CompetenceEval, type DiplomaId } from '@/lib/data/competences';
import { tpById } from '@/lib/data/tps';
import { liveEvaluation, liveNotes } from '@/lib/sim/live';
import { generatePassword, loginFor } from '@/lib/eleves';
import { telechargerIdentifiantsPdf } from '@/lib/pdfIdentifiants';
import {
  Barre,
  Champ,
  CopierBouton,
  Dialogue,
  Message,
  PageTitle,
  Panneau,
  PastilleDirect,
  ResumeCompetences,
  dateCourte,
  inputClass,
} from '@/components/gestion/ui';

/** Nombre d'étapes d'un parcours (platine ou dimensionnement). */
const ETAPES = 11;

interface Identifiants {
  login: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Opération impossible.');
  if (!payload) throw new Error('Réponse illisible du serveur.');
  return payload;
}

/** Encadré des identifiants créés : le mot de passe n'est affiché qu'une fois. */
function EncadreIdentifiants({ ids, onClose }: { ids: Identifiants; onClose: () => void }) {
  const nom = [ids.first_name, ids.last_name].filter(Boolean).join(' ');
  return (
    <div className="rounded-2xl border-2 border-accent bg-accent/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-title text-[18px] font-semibold uppercase tracking-wide">
          Identifiants {nom ? `de ${nom}` : 'créés'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto min-h-touch rounded-[10px] border border-line bg-surface px-3 text-[12.5px] font-semibold"
        >
          Fermer
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="text-[10px] uppercase tracking-[.08em] text-muted">Identifiant</div>
          <div className="mt-0.5 flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-[16px] font-semibold">{ids.login}</code>
            <CopierBouton value={ids.login} />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="text-[10px] uppercase tracking-[.08em] text-muted">Mot de passe</div>
          <div className="mt-0.5 flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-[16px] font-semibold">{ids.password}</code>
            <CopierBouton value={ids.password} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CopierBouton value={`Identifiant : ${ids.login} — Mot de passe : ${ids.password}`} label="Copier les deux" />
        <p className="text-[12.5px] font-semibold text-warn">
          Le mot de passe n&apos;est affiché qu&apos;une seule fois : note-le avant de fermer.
        </p>
      </div>
    </div>
  );
}

interface LigneImport { last_name: string; first_name: string; password: string }
interface ResultatImport {
  last_name: string; first_name: string; login?: string; password?: string; ok: boolean; error?: string;
}

/** Import d'une classe entière depuis un PDF Pronote, un CSV ou un Excel. */
function ImportClasse({
  classId, className, joinCode, onDone,
}: { classId: string; className: string; joinCode: string | null; onDone: () => void }) {
  const [rows, setRows] = useState<LigneImport[]>([]);
  const [results, setResults] = useState<ResultatImport[] | null>(null);
  const [phase, setPhase] = useState<'idle' | 'busy' | 'preview' | 'done'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  /** Identifiant nom.prenom avec suffixe si doublon plus haut dans la liste. */
  const loginAt = useCallback((rs: LigneImport[], i: number): string => {
    const base = loginFor(rs[i].last_name, rs[i].first_name);
    let dup = 0;
    for (let k = 0; k < i; k++) if (loginFor(rs[k].last_name, rs[k].first_name) === base) dup += 1;
    return dup ? `${base}${dup + 1}` : base;
  }, []);

  async function onFichier(file: File | undefined | null) {
    if (!file) return;
    setErr(null); setResults(null); setPhase('busy');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/classes/eleves/parse', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => null)) as
        | { eleves?: { last_name: string; first_name: string }[]; error?: string } | null;
      if (!res.ok || !data?.eleves) throw new Error(data?.error ?? 'Lecture impossible.');
      setRows(data.eleves.map((e) => ({ last_name: e.last_name, first_name: e.first_name, password: generatePassword() })));
      setPhase('preview');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lecture du fichier impossible.');
      setPhase('idle');
    }
  }

  function editRow(i: number, k: 'last_name' | 'first_name', v: string) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  }
  function regen(i: number) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, password: generatePassword() } : r)));
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i));
  }

  async function creer() {
    setErr(null); setPhase('busy');
    try {
      const students = rows.map((r, i) => ({
        last_name: r.last_name.trim(), first_name: r.first_name.trim(), password: r.password,
        login: loginAt(rows, i),
      }));
      const res = await fetch('/api/classes/eleves/import', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ class_id: classId, students }),
      });
      const data = (await res.json().catch(() => null)) as
        | { results?: ResultatImport[]; error?: string } | null;
      if (!res.ok || !data?.results) throw new Error(data?.error ?? 'Création impossible.');
      setResults(data.results);
      setPhase('done');
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Création des comptes impossible.');
      setPhase('preview');
    }
  }

  function telecharger() {
    const ok = (results ?? []).filter((r) => r.ok && r.login && r.password)
      .map((r) => ({ last_name: r.last_name, first_name: r.first_name, login: r.login!, password: r.password! }));
    if (ok.length) telechargerIdentifiantsPdf(className, joinCode, ok);
  }

  function recommencer() {
    setRows([]); setResults(null); setPhase('idle'); setErr(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const okCount = (results ?? []).filter((r) => r.ok).length;
  const koCount = (results ?? []).length - okCount;

  return (
    <Panneau title="Importer une classe (PDF, CSV ou Excel)">
      {phase !== 'done' && rows.length === 0 && (
        <>
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); void onFichier(e.dataTransfer.files?.[0]); }}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              drag ? 'border-accent bg-accent/10' : 'border-line bg-[var(--app)]'
            }`}
          >
            <span className="text-[26px]">📄</span>
            <span className="text-[14px] font-semibold">Glisser un fichier ici, ou cliquer</span>
            <span className="text-[12px] text-muted">l&apos;app lit la colonne « Élève » (NOM Prénom)</span>
            <span className="mt-1 flex flex-wrap justify-center gap-1.5">
              {['PDF Pronote', 'CSV', 'Excel .xlsx'].map((f) => (
                <span key={f} className="rounded-md border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">{f}</span>
              ))}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv"
              className="hidden"
              onChange={(e) => void onFichier(e.target.files?.[0])}
            />
          </label>
          {phase === 'busy' && <p className="mt-2 text-[12.5px] text-muted">Lecture du fichier…</p>}
        </>
      )}

      {phase !== 'done' && rows.length > 0 && (
        <>
          <p className="text-[12.5px] text-muted">
            <b>{rows.length}</b> élèves détectés. Identifiant <b>et</b> mot de passe sont générés ;
            corrige un nom (l&apos;identifiant se recalcule), régénère un mot de passe avec ↻. Rien n&apos;est créé tant que tu ne cliques pas.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-[.05em] text-muted">
                  <th className="border-b border-line px-2 py-1.5 text-left">Nom</th>
                  <th className="border-b border-line px-2 py-1.5 text-left">Prénom</th>
                  <th className="border-b border-line px-2 py-1.5 text-left">Identifiant</th>
                  <th className="border-b border-line px-2 py-1.5 text-left">Mot de passe</th>
                  <th className="border-b border-line px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border-b border-line px-1 py-1">
                      <input value={r.last_name} onChange={(e) => editRow(i, 'last_name', e.target.value)}
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 focus:border-accent focus:bg-[var(--app)] focus:outline-none" />
                    </td>
                    <td className="border-b border-line px-1 py-1">
                      <input value={r.first_name} onChange={(e) => editRow(i, 'first_name', e.target.value)}
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 focus:border-accent focus:bg-[var(--app)] focus:outline-none" />
                    </td>
                    <td className="border-b border-line px-2 py-1 font-mono text-[12px] text-accent">{loginAt(rows, i)}</td>
                    <td className="border-b border-line px-2 py-1">
                      <span className="font-mono text-[12px]">{r.password}</span>
                      <button type="button" onClick={() => regen(i)} title="Régénérer le mot de passe"
                        className="ml-1.5 text-muted hover:text-accent">↻</button>
                    </td>
                    <td className="border-b border-line px-2 py-1 text-right">
                      <button type="button" onClick={() => removeRow(i)} title="Retirer"
                        className="text-muted hover:text-crit">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void creer()} disabled={phase === 'busy' || rows.length === 0}
              className="min-h-touch rounded-[10px] border border-accent bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50">
              {phase === 'busy' ? 'Création…' : `Créer les ${rows.length} comptes`}
            </button>
            <button type="button" onClick={recommencer}
              className="min-h-touch rounded-[10px] border border-line bg-surface px-3 text-[13px] font-semibold">Recommencer</button>
          </div>
        </>
      )}

      {phase === 'done' && results && (
        <>
          <p className="text-[13px] font-semibold text-good">✓ {okCount} compte{okCount > 1 ? 's' : ''} créé{okCount > 1 ? 's' : ''}
            {koCount > 0 && <span className="text-crit"> · {koCount} en échec</span>}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-[.05em] text-muted">
                  <th className="border-b border-line px-2 py-1.5 text-left">Élève</th>
                  <th className="border-b border-line px-2 py-1.5 text-left">Identifiant</th>
                  <th className="border-b border-line px-2 py-1.5 text-left">Mot de passe</th>
                  <th className="border-b border-line px-2 py-1.5 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td className="border-b border-line px-2 py-1"><b>{r.last_name}</b> {r.first_name}</td>
                    <td className="border-b border-line px-2 py-1 font-mono text-[12px] text-accent">{r.login ?? '—'}</td>
                    <td className="border-b border-line px-2 py-1 font-mono text-[12px]">{r.password ?? '—'}</td>
                    <td className="border-b border-line px-2 py-1">
                      {r.ok
                        ? <span className="text-[12px] font-semibold text-good">créé</span>
                        : <span className="text-[12px] font-semibold text-crit" title={r.error}>{r.error ?? 'échec'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={telecharger} disabled={okCount === 0}
              className="min-h-touch rounded-[10px] border border-good bg-good px-4 text-[13px] font-semibold text-white disabled:opacity-50">
              ⬇ Télécharger le PDF des identifiants
            </button>
            <button type="button" onClick={recommencer}
              className="min-h-touch rounded-[10px] border border-line bg-surface px-3 text-[13px] font-semibold">Importer une autre liste</button>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-warn">
            Les mots de passe ne sont affichés qu&apos;ici : télécharge le PDF avant de quitter.
          </p>
        </>
      )}

      {err && <p className="mt-2 text-[12.5px] font-semibold text-crit">{err}</p>}
    </Panneau>
  );
}

/** Nom lisible d'un élève, quelle que soit la façon dont son profil a été rempli. */
function nomAffiche(student: StudentProfile): string {
  const compose = `${student.last_name ?? ''} ${student.first_name ?? ''}`.trim();
  return student.full_name ?? (compose || student.login || '—');
}

/** Modification d'un élève : nom affiché et identifiant de connexion. */
function DialogueModification({
  student,
  busy,
  onCancel,
  onSave,
}: {
  student: StudentProfile;
  busy: boolean;
  onCancel: () => void;
  onSave: (v: { first_name: string; last_name: string; login: string }) => void;
}) {
  const [prenom, setPrenom] = useState(student.first_name ?? '');
  const [nom, setNom] = useState(student.last_name ?? '');
  const [login, setLogin] = useState(student.login ?? '');
  const valide = prenom.trim().length > 0 && nom.trim().length > 0 && login.trim().length >= 3;

  return (
    <Dialogue
      title={`Modifier ${nomAffiche(student)}`}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-touch rounded-[10px] border border-line px-4 text-[13px] font-semibold"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || !valide}
            onClick={() => onSave({ first_name: prenom.trim(), last_name: nom.trim(), login: login.trim() })}
            className="min-h-touch rounded-[10px] border border-accent bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label="Nom">
          <input value={nom} onChange={(e) => setNom(e.target.value)} className={inputClass} />
        </Champ>
        <Champ label="Prénom">
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} className={inputClass} />
        </Champ>
      </div>
      <Champ
        className="mt-3"
        label="Identifiant de connexion"
        hint="Lettres, chiffres et points. Les accents et les majuscules sont retirés à l'enregistrement."
      >
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          className={`${inputClass} font-mono`}
        />
      </Champ>
      <p className="mt-3 rounded-[10px] border border-warn/50 bg-warn/10 px-3 py-2 text-[12.5px] text-warn">
        Changer l&apos;identifiant change celui que l&apos;élève tape pour se connecter. Son mot de passe et
        toutes ses tentatives sont conservés — pensez simplement à lui communiquer le nouvel identifiant.
      </p>
    </Dialogue>
  );
}

/**
 * Retrait d'un élève.
 *
 * Deux actions distinctes, et l'écart entre les deux est écrit noir sur blanc :
 * le retrait conserve tout, la suppression définitive détruit la notation et
 * n'est donc offerte qu'à un compte qui n'a encore rien produit.
 */
function DialogueRetrait({
  student,
  footprint,
  busy,
  onCancel,
  onRetirer,
  onSupprimer,
}: {
  student: StudentProfile;
  footprint: StudentFootprint | null;
  busy: boolean;
  onCancel: () => void;
  onRetirer: () => void;
  onSupprimer: () => void;
}) {
  const [saisie, setSaisie] = useState('');
  const nom = nomAffiche(student);
  const vierge = footprint != null && footprint.attempts === 0;
  // La frappe du nom n'est exigée que pour l'irréversible : la faire recopier
  // avant chaque geste anodin apprendrait surtout à la recopier sans lire.
  const confirme = saisie.trim().toLowerCase() === nom.trim().toLowerCase();

  return (
    <Dialogue title={`Retirer ${nom} de la classe`} onClose={onCancel}>
      <p className="text-[13.5px] leading-relaxed">
        <strong className="font-semibold">{nom}</strong>
        {student.login && <> (identifiant <span className="font-mono">{student.login}</span>)</>} ne pourra plus
        se connecter et disparaîtra de la liste de la classe.
      </p>

      <div className="mt-3 rounded-xl border border-line bg-[var(--surface-2)] p-3 text-[12.5px]">
        <div className="text-[10px] uppercase tracking-[.08em] text-muted">Ce que contient son compte</div>
        {footprint == null ? (
          <p className="mt-1 text-muted">Calcul en cours…</p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            <li>{footprint.attempts} tentative{footprint.attempts > 1 ? 's' : ''} de TP</li>
            <li>{footprint.notes} note{footprint.notes > 1 ? 's' : ''} de TP terminé</li>
            <li>{footprint.measurements} mesure{footprint.measurements > 1 ? 's' : ''} relevée{footprint.measurements > 1 ? 's' : ''}</li>
            <li>{footprint.messages} message{footprint.messages > 1 ? 's' : ''} avec le professeur virtuel</li>
          </ul>
        )}
      </div>

      <p className="mt-3 rounded-[10px] border border-good/50 bg-good/10 px-3 py-2 text-[12.5px] text-good">
        Retirer conserve tout ce qui précède : les notes restent consultables sur la fiche de l&apos;élève et
        vous pouvez le réintégrer plus tard, avec son mot de passe actuel.
      </p>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-touch rounded-[10px] border border-line px-4 text-[13px] font-semibold"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onRetirer}
          className="min-h-touch rounded-[10px] border border-warn bg-warn px-4 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          Retirer de la classe
        </button>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="text-[10px] uppercase tracking-[.08em] text-muted">Suppression définitive</div>
        {footprint == null ? (
          <p className="mt-1 text-[12.5px] text-muted">
            En attente du contenu du compte : on ne propose pas de supprimer avant de savoir ce qu&apos;on
            supprimerait.
          </p>
        ) : vierge ? (
          <>
            <p className="mt-1 text-[12.5px] leading-relaxed">
              Ce compte n&apos;a produit aucune tentative : le supprimer n&apos;efface aucune note. L&apos;opération
              est néanmoins irréversible.
            </p>
            <Champ className="mt-2" label={`Écrivez « ${nom} » pour confirmer`}>
              <input
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                spellCheck={false}
                className={inputClass}
              />
            </Champ>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={busy || !confirme}
                onClick={onSupprimer}
                className="min-h-touch rounded-[10px] border border-crit bg-crit px-4 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                Supprimer définitivement
              </button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            Indisponible : supprimer ce compte effacerait au passage ses tentatives, ses mesures et ses notes,
            que rien ne permettrait de retrouver. Seul un élève n&apos;ayant encore rien fait peut être supprimé.
          </p>
        )}
      </div>
    </Dialogue>
  );
}

export default function ClassesPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classeFilter, setClasseFilter] = useState<DiplomaId | 'tous'>('tous');
  const [effectifs, setEffectifs] = useState<Record<string, number>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [direct, setDirect] = useState(false);

  const [nomClasse, setNomClasse] = useState('');
  const [diplome, setDiplome] = useState<DiplomaId>('bacpro');
  const [niveau, setNiveau] = useState('');
  const [nomEleve, setNomEleve] = useState('');
  const [prenomEleve, setPrenomEleve] = useState('');
  const [ids, setIds] = useState<Identifiants | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Les élèves retirés sont cachés par défaut : ils ne font plus partie du cours.
  const [voirRetires, setVoirRetires] = useState(false);
  const [edition, setEdition] = useState<StudentProfile | null>(null);
  const [retrait, setRetrait] = useState<StudentProfile | null>(null);
  const [empreinte, setEmpreinte] = useState<StudentFootprint | null>(null);

  const encadreRef = useRef<HTMLDivElement | null>(null);

  const current = useMemo(() => classes.find((c) => c.id === currentId) ?? null, [classes, currentId]);

  const chargerClasses = useCallback(async () => {
    const liste = await listMyClasses();
    setClasses(liste);
    setCurrentId((id) => id ?? liste[0]?.id ?? null);
    const compte: Record<string, number> = {};
    await Promise.all(
      liste.map(async (c) => {
        const eleves = await listStudents(c.id);
        compte[c.id] = eleves.length;
      }),
    );
    setEffectifs(compte);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setProfile(p);
        if (p && (p.role === 'professeur' || p.role === 'admin')) await chargerClasses();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    })();
  }, [chargerClasses]);

  const chargerClasse = useCallback(async (classId: string) => {
    const [eleves, tentatives] = await Promise.all([
      listStudents(classId, voirRetires),
      listClassAttempts(classId),
    ]);
    setStudents(eleves);
    setAttempts(tentatives);
    // L'effectif ne compte que les élèves présents, même quand la liste montre les retirés.
    setEffectifs((prev) => ({ ...prev, [classId]: eleves.filter((e) => !e.student.archived).length }));
  }, [voirRetires]);

  useEffect(() => {
    if (!currentId) return;
    let alive = true;
    chargerClasse(currentId).catch((e: unknown) => {
      if (alive) setErr(e instanceof Error ? e.message : 'Erreur de chargement.');
    });

    // Suivi en direct : l'avancement et la note se mettent à jour sans rechargement.
    const unsubscribe = subscribeClassProgress(currentId, (attempt) => {
      setAttempts((prev) => {
        const next = prev.filter((a) => a.id !== attempt.id);
        next.unshift(attempt);
        return next;
      });
    });
    setDirect(true);
    return () => {
      alive = false;
      setDirect(false);
      unsubscribe();
    };
  }, [currentId, chargerClasse]);

  /** Tentatives regroupées par élève, la plus récente d'abord. */
  const parEleve = useMemo(() => {
    const map = new Map<string, AttemptRow[]>();
    attempts.forEach((a) => {
      const list = map.get(a.student_id) ?? [];
      list.push(a);
      map.set(a.student_id, list);
    });
    map.forEach((list) => list.sort((x, y) => y.updated_at.localeCompare(x.updated_at)));
    return map;
  }, [attempts]);

  async function onCreerClasse() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const c = await createClass(nomClasse.trim(), diplome, niveau.trim() || undefined);
      setClasses((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      setEffectifs((prev) => ({ ...prev, [c.id]: 0 }));
      setCurrentId(c.id);
      setNomClasse('');
      setNiveau('');
      setOk(`Classe créée. Code d'adhésion : ${c.join_code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Création impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function onArchiver(c: ClassRow) {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await archiveClass(c.id, true);
      setClasses((prev) => prev.filter((x) => x.id !== c.id));
      setCurrentId((id) => (id === c.id ? null : id));
      setOk(`Classe « ${c.name} » archivée : l'historique est conservé.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Archivage impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function onAjouterEleve() {
    if (!currentId) return;
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const created = await postJson<Identifiants>('/api/classes/eleves', {
        class_id: currentId,
        last_name: nomEleve.trim(),
        first_name: prenomEleve.trim(),
      });
      setIds(created);
      setNomEleve('');
      setPrenomEleve('');
      await chargerClasse(currentId);
      encadreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Création du compte impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerer(studentId: string) {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const created = await postJson<Identifiants>('/api/classes/eleves/motdepasse', { student_id: studentId });
      const eleve = students.find((s) => s.student.id === studentId)?.student;
      setIds({
        ...created,
        first_name: eleve?.first_name ?? undefined,
        last_name: eleve?.last_name ?? undefined,
      });
      encadreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Réinitialisation impossible.');
    } finally {
      setBusy(false);
    }
  }

  /** Ouvre la boîte de retrait, puis va chercher ce que le compte contient réellement. */
  function onOuvrirRetrait(student: StudentProfile) {
    setErr(null);
    setOk(null);
    setRetrait(student);
    setEmpreinte(null);
    countStudentData(student.id)
      .then(setEmpreinte)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Lecture des données impossible.'));
  }

  async function onEnregistrerModification(v: { first_name: string; last_name: string; login: string }) {
    if (!edition || !currentId) return;
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const maj = await postJson<{ login: string; full_name: string }>('/api/classes/eleves/modifier', {
        student_id: edition.id,
        ...v,
      });
      setEdition(null);
      await chargerClasse(currentId);
      setOk(`${maj.full_name} modifié. Identifiant de connexion : ${maj.login}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Modification impossible.');
    } finally {
      setBusy(false);
    }
  }

  /** Retrait, réintégration ou suppression définitive d'un élève. */
  async function onRetrait(student: StudentProfile, mode: 'retrait' | 'reintegration' | 'definitif') {
    if (!currentId) return;
    setErr(null);
    setOk(null);
    setBusy(true);
    const nom = nomAffiche(student);
    try {
      await postJson('/api/classes/eleves/retrait', { student_id: student.id, mode });
      setRetrait(null);
      await chargerClasse(currentId);
      setOk(
        mode === 'definitif'
          ? `Compte de ${nom} supprimé.`
          : mode === 'retrait'
            ? `${nom} retiré de la classe : ses tentatives et ses notes sont conservées.`
            : `${nom} réintégré : il peut se reconnecter avec son mot de passe habituel.`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-6xl px-4 py-8 text-[14px] text-muted">Chargement…</main>;

  if (!profile || (profile.role !== 'professeur' && profile.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageTitle>Mes classes</PageTitle>
        <Message error="Cet espace est réservé aux comptes professeur." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <PageTitle sub="Crée tes classes, ouvre les comptes de tes élèves et suis leur avancement en direct.">
        Mes classes
      </PageTitle>

      <Panneau title="Classes" aside={<Link href="/prof" className="text-[13px] font-semibold text-muted underline">Suivi des tentatives</Link>}>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-semibold text-muted">Filtrer par diplôme :</span>
          {(['tous', ...DIPLOMAS.map((d) => d.id)] as (DiplomaId | 'tous')[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setClasseFilter(id)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                classeFilter === id ? 'border-[#141A21] bg-[#141A21] text-white' : 'border-line bg-surface text-muted'
              }`}
            >
              {id === 'tous' ? 'Toutes' : DIPLOMAS.find((d) => d.id === id)?.short ?? id}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.filter((c) => classeFilter === 'tous' || c.diploma === classeFilter).map((c) => {
            const actif = c.id === currentId;
            const dip = DIPLOMAS.find((d) => d.id === c.diploma);
            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-3 ${actif ? 'border-accent bg-accent/5' : 'border-line bg-surface'}`}
              >
                <button
                  type="button"
                  onClick={() => setCurrentId(c.id)}
                  className="block w-full text-left"
                >
                  <div className="font-title text-[20px] font-semibold uppercase tracking-wide">{c.name}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">{dip?.short ?? 'Diplôme non renseigné'}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-muted">
                      {effectifs[c.id] ?? 0} élève{(effectifs[c.id] ?? 0) > 1 ? 's' : ''}
                    </span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-mono text-muted">
                      code {c.join_code}
                    </span>
                  </div>
                </button>
                <div className="mt-2 flex gap-1.5">
                  <CopierBouton value={c.join_code} label="Copier le code" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onArchiver(c)}
                    className="min-h-touch rounded-[10px] border border-line px-3 text-[12.5px] font-semibold text-muted disabled:opacity-40"
                  >
                    Archiver
                  </button>
                </div>
              </div>
            );
          })}
          {classes.filter((c) => classeFilter === 'tous' || c.diploma === classeFilter).length === 0 && (
            <p className="text-[13px] text-muted">
              {classes.length === 0 ? 'Aucune classe active pour le moment.' : 'Aucune classe pour ce diplôme.'}
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Champ label="Nom de la classe">
            <input
              value={nomClasse}
              onChange={(e) => setNomClasse(e.target.value)}
              placeholder="1 MELEC A"
              className={inputClass}
            />
          </Champ>
          <Champ label="Diplôme préparé">
            <select
              value={diplome}
              onChange={(e) => setDiplome(e.target.value as DiplomaId)}
              className={inputClass}
            >
              {DIPLOMAS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Niveau (facultatif)">
            <input
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
              placeholder="Seconde"
              className={inputClass}
            />
          </Champ>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onCreerClasse}
              disabled={busy || nomClasse.trim().length < 2}
              className="min-h-touch w-full rounded-[10px] border border-accent bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"
            >
              Créer la classe
            </button>
          </div>
        </div>
      </Panneau>

      <div ref={encadreRef}>{ids && <EncadreIdentifiants ids={ids} onClose={() => setIds(null)} />}</div>

      {current && (
        <>
          <Panneau
            title={current.name}
            aside={
              <>
                <PastilleDirect actif={direct} />
                <button
                  type="button"
                  onClick={() => setVoirRetires((v) => !v)}
                  aria-pressed={voirRetires}
                  className={`min-h-touch rounded-[10px] border px-3 text-[12.5px] font-semibold ${
                    voirRetires ? 'border-accent bg-accent/10' : 'border-line text-muted'
                  }`}
                >
                  {voirRetires ? 'Masquer les élèves retirés' : 'Voir les élèves retirés'}
                </button>
                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[11px] text-muted">
                  code {current.join_code}
                </span>
              </>
            }
          >
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[860px] text-[13px]">
                <thead className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-[.06em] text-muted">
                  <tr>
                    <th className="px-3 py-2.5">Élève</th>
                    <th className="px-3 py-2.5">Identifiant</th>
                    <th className="px-3 py-2.5">TP en cours</th>
                    <th className="px-3 py-2.5">Avancement</th>
                    <th className="px-3 py-2.5">Dernière note</th>
                    <th className="px-3 py-2.5">Bilan de compétences</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {students.map(({ student }) => {
                    const list = parEleve.get(student.id) ?? [];
                    const encours = list.find((a) => a.status === 'en_cours')
                      ?? list.find((a) => a.status === 'cloture') ?? list[0] ?? null;
                    const stats = eleveStats(list);
                    const derniere = list.find((a) => a.status === 'termine' && a.score != null) ?? null;
                    // TP clôturé par le professeur : note projetée figée, réactivable.
                    // Sa note et son bilan de compétences s'affichent « sous réserve »,
                    // recalculés depuis l'état gelé (pas encore dans le bilan cumulé).
                    const cloture = list.find((a) => a.status === 'cloture') ?? null;
                    const clotDef = cloture ? tpById(cloture.tp_id) : undefined;
                    const clotDip: DiplomaId | null =
                      cloture?.diploma ?? student.diploma ?? current?.diploma ?? null;
                    const clotNote = cloture
                      ? (cloture.score != null
                          ? noteSur20(cloture.score)
                          : (clotDef ? liveNotes(clotDef, cloture.state).projetee : null))
                      : null;
                    const clotComp: CompetenceEval[] = cloture && clotDef && clotDip
                      ? (liveEvaluation(clotDef, cloture.state, clotDip) ?? [])
                      : [];
                    const bilanComp = stats.competences.length ? stats.competences : clotComp;
                    return (
                      <tr key={student.id} className="border-t border-line align-top">
                        <td className="px-3 py-2.5">
                          <Link href={`/prof/eleve/${student.id}`} className="font-semibold underline">
                            {nomAffiche(student)}
                          </Link>
                          {student.archived && (
                            <span className="ml-2 rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
                              retiré
                            </span>
                          )}
                          <div className="text-[11px] text-muted">vue le {dateCourte(student.last_seen_at)}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px]">{student.login ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          {encours ? (
                            <>
                              <div>{encours.tp_id}</div>
                              <div className="text-[11px] text-muted">
                                {encours.status === 'termine'
                                  ? 'terminé'
                                  : encours.status === 'cloture'
                                    ? 'clôturé'
                                    : 'en cours'} ·{' '}
                                {dateCourte(encours.updated_at)}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {encours ? (
                            <Barre
                              value={Math.min(1, encours.stage / ETAPES)}
                              tone={encours.status === 'termine' ? 'good' : 'accent'}
                              label={`${encours.stage}/${ETAPES}`}
                              className="min-w-[120px]"
                            />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          {derniere?.score != null ? (
                            `${noteSur20(derniere.score)}/20`
                          ) : clotNote != null ? (
                            <>
                              <span className="text-[#1D6FE0]">{clotNote}/20</span>
                              <div className="font-sans text-[11px] font-semibold text-[#1D6FE0]">
                                projetée · clôturée
                              </div>
                              <div className="font-sans text-[10.5px] font-normal text-muted">
                                sous réserve · réactivable
                              </div>
                            </>
                          ) : (
                            '—'
                          )}
                          {stats.moyenne != null && (
                            <div className="text-[11px] font-normal text-muted">moy. {stats.moyenne}/20</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <ResumeCompetences competences={bilanComp} />
                          {stats.competences.length === 0 && clotComp.length > 0 && (
                            <div className="mt-0.5 text-[10.5px] text-muted">bilan sous réserve (TP clôturé)</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                            {student.archived ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => onRetrait(student, 'reintegration')}
                                className="min-h-touch rounded-[10px] border border-good px-3 text-[12.5px] font-semibold text-good disabled:opacity-40"
                              >
                                Réintégrer
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setEdition(student)}
                                  className="min-h-touch rounded-[10px] border border-line px-3 text-[12.5px] font-semibold disabled:opacity-40"
                                >
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => onRegenerer(student.id)}
                                  className="min-h-touch rounded-[10px] border border-line px-3 text-[12.5px] font-semibold disabled:opacity-40"
                                >
                                  Régénérer le mot de passe
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => onOuvrirRetrait(student)}
                                  className="min-h-touch rounded-[10px] border border-crit/60 px-3 text-[12.5px] font-semibold text-crit disabled:opacity-40"
                                >
                                  Retirer de la classe
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted">
                        Aucun élève dans cette classe : ajoute-les ci-dessous.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panneau>

          {currentId && current && (
            <ImportClasse
              classId={currentId}
              className={current.name}
              joinCode={current.join_code ?? null}
              onDone={() => { void chargerClasse(currentId); }}
            />
          )}

          <Panneau title="Ajouter un élève">
            <div className="grid gap-3 sm:grid-cols-3">
              <Champ label="Nom">
                <input
                  value={nomEleve}
                  onChange={(e) => setNomEleve(e.target.value)}
                  placeholder="Dupont"
                  className={inputClass}
                />
              </Champ>
              <Champ label="Prénom">
                <input
                  value={prenomEleve}
                  onChange={(e) => setPrenomEleve(e.target.value)}
                  placeholder="Léa"
                  className={inputClass}
                />
              </Champ>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={onAjouterEleve}
                  disabled={busy || !nomEleve.trim() || !prenomEleve.trim()}
                  className="min-h-touch w-full rounded-[10px] border border-accent bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"
                >
                  Créer le compte
                </button>
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              L&apos;élève reçoit un identifiant <span className="font-mono">nom.prenom</span> et un mot de passe :
              remets-les lui, il se connectera sans adresse électronique.
            </p>
          </Panneau>
        </>
      )}

      <Message error={err} ok={ok} />

      {edition && (
        <DialogueModification
          key={edition.id}
          student={edition}
          busy={busy}
          onCancel={() => setEdition(null)}
          onSave={(v) => void onEnregistrerModification(v)}
        />
      )}

      {retrait && (
        <DialogueRetrait
          key={retrait.id}
          student={retrait}
          footprint={empreinte}
          busy={busy}
          onCancel={() => setRetrait(null)}
          onRetirer={() => void onRetrait(retrait, 'retrait')}
          onSupprimer={() => void onRetrait(retrait, 'definitif')}
        />
      )}
    </main>
  );
}
