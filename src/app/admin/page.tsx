'use client';

/**
 * Écran administrateur : chiffres de l'établissement et liste blanche des adresses
 * autorisées à se connecter avec Google. Réservé au rôle `admin` (le middleware garde la route,
 * ce composant refait le contrôle côté interface).
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMyProfile } from '@/lib/db/profiles';
import { addTeacher, deleteTeacherAccount, listAllowlist, listTeacherAccounts, removeTeacher, type TeacherAccount, type TeacherAllowEntry } from '@/lib/db/allowlist';
import type { ProfileRow } from '@/lib/db/types';
import ImagesTp from './ImagesTp';
import {
  Champ,
  Chiffre,
  CopierBouton,
  Message,
  PageTitle,
  Panneau,
  dateCourte,
  inputClass,
} from '@/components/gestion/ui';

interface Compteurs {
  professeurs: number;
  classes: number;
  eleves: number;
  tpPublies: number;
  tpRealises: number;
}

const ROLE_LABEL: Record<'professeur' | 'admin', string> = {
  professeur: 'Professeur',
  admin: 'Administrateur',
};

/** Ligne renvoyée par la fonction SQL `etablissement_stats()` (migration 0006). */
interface StatsRow {
  professeurs: number;
  classes: number;
  eleves: number;
  tps_publies: number;
  tps_realises: number;
}

/**
 * Chiffres de l'établissement : la RLS masque à chaque professeur les tentatives des
 * autres classes, on passe donc par la fonction `security definer` `etablissement_stats()`
 * qui refuse elle-même les appelants non administrateurs.
 */
async function compter(): Promise<Compteurs> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('etablissement_stats');
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Partial<StatsRow>;
  return {
    professeurs: Number(row.professeurs ?? 0),
    classes: Number(row.classes ?? 0),
    eleves: Number(row.eleves ?? 0),
    tpPublies: Number(row.tps_publies ?? 0),
    tpRealises: Number(row.tps_realises ?? 0),
  };
}

export default function AdminPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [chiffres, setChiffres] = useState<Compteurs | null>(null);
  const [allowlist, setAllowlist] = useState<TeacherAllowEntry[]>([]);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [email, setEmail] = useState('');
  /** Adresse Google facultative : la même personne, une seconde porte d'entrée. */
  const [googleEmail, setGoogleEmail] = useState('');
  const [nom, setNom] = useState('');
  const [role, setRole] = useState<'professeur' | 'admin'>('professeur');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  /** Mot de passe fraîchement généré, affiché UNE seule fois : il n'est stocké nulle part en clair. */
  const [motDePasse, setMotDePasse] = useState<{ email: string; password: string } | null>(null);
  /** Compte visé par une suppression définitive : ouvre le double verrou. */
  const [aSupprimer, setASupprimer] = useState<TeacherAccount | null>(null);
  /** Recopie de l'adresse : second verrou avant d'autoriser la suppression. */
  const [confirmation, setConfirmation] = useState('');

  /** Administrateur en place, s'il y en a un : il n'y en a qu'un par établissement. */
  const adminExistant = allowlist.find((e) => e.role === 'admin')?.email ?? null;

  const recharger = useCallback(async () => {
    const [liste, comptes, compteurs] = await Promise.all([listAllowlist(), listTeacherAccounts(), compter()]);
    setAllowlist(liste);
    setTeachers(comptes);
    setChiffres(compteurs);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setProfile(p);
        if (p?.role === 'admin') await recharger();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    })();
  }, [recharger]);

  async function ajouter() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await addTeacher(email.trim().toLowerCase(), nom.trim() || undefined, role, googleEmail.trim().toLowerCase() || undefined);
      setEmail('');
      setGoogleEmail('');
      setNom('');
      setRole('professeur');
      setOk('Adresse ajoutée. Pour une adresse académique, utilisez « Créer l\u2019accès » afin de générer son mot de passe.');
      await recharger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ajout impossible.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Génère (ou réinitialise) le mot de passe d'un accès enseignant.
   *
   * C'est le SEUL chemin praticable pour une adresse académique : elle n'est pas un
   * compte Google. Le mot de passe n'est renvoyé qu'ici et une seule fois — ni la base
   * ni l'écran ne le conservent : on le transmet à l'intéressé, qui le changera.
   */
  async function genererMotDePasse(adresse: string) {
    setErr(null);
    setOk(null);
    setMotDePasse(null);
    setBusy(true);
    try {
      const reponse = await fetch('/api/admin/profs/motdepasse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: adresse }),
      });
      const charge = (await reponse.json().catch(() => null)) as
        { email?: string; password?: string; created?: boolean; error?: string } | null;
      if (!reponse.ok || !charge?.password) {
        throw new Error(charge?.error ?? 'Génération impossible.');
      }
      setMotDePasse({ email: charge.email ?? adresse, password: charge.password });
      setOk(charge.created
        ? 'Compte créé. Transmettez le mot de passe ci-dessous : il ne sera plus affiché, et la personne devra en choisir un autre à sa première session.'
        : 'Mot de passe réinitialisé. Transmettez-le ci-dessous : il ne sera plus affiché, et la personne devra en choisir un autre à sa première session.');
      await recharger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Génération impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function retirer(adresse: string) {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await removeTeacher(adresse);
      setOk(`${adresse} ne peut plus se connecter.`);
      await recharger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Retrait impossible.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Supprime définitivement le compte visé (profil + connexion + liste blanche,
   * avec ses cascades). Le second verrou — recopie de l'adresse — est vérifié ici
   * ET côté serveur ; on ne l'appelle qu'une fois l'adresse recopiée à l'identique.
   */
  async function supprimerDefinitivement() {
    if (!aSupprimer) return;
    const cible = aSupprimer;
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await deleteTeacherAccount(cible.id);
      setOk(`${cible.full_name ?? cible.email ?? 'Le compte'} a été supprimé définitivement.`);
      setASupprimer(null);
      setConfirmation('');
      await recharger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  }

  const attenduConfirmation = (aSupprimer?.email ?? aSupprimer?.login ?? '').trim().toLowerCase();
  const confirmationValide = attenduConfirmation.length > 0
    && confirmation.trim().toLowerCase() === attenduConfirmation;

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8 text-[14px] text-muted">Chargement…</main>;

  if (profile?.role !== 'admin') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageTitle sub="Cet écran est réservé à l'administrateur de l'établissement.">Établissement</PageTitle>
        <Message error="Vous n'avez pas les droits d'administration." />
      </main>
    );
  }

  const valide = /.+@.+\..+/.test(email.trim());

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <PageTitle sub="Chiffres de l'établissement et gestion des comptes autorisés.">Établissement</PageTitle>

      <Panneau title="Chiffres">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Chiffre label="Professeurs" value={chiffres?.professeurs ?? 0} />
          <Chiffre label="Classes" value={chiffres?.classes ?? 0} />
          <Chiffre label="Élèves" value={chiffres?.eleves ?? 0} />
          <Chiffre label="TP publiés" value={chiffres?.tpPublies ?? 0} />
          <Chiffre label="TP réalisés" value={chiffres?.tpRealises ?? 0} />
        </div>
      </Panneau>

      <Panneau title="Comptes professeurs">
        <p className="mb-3 text-[13px] text-muted">
          Les comptes prof/admin <strong>réellement existants</strong> (c&apos;est ce chiffre-là,
          {' '}{teachers.length}, qu&apos;affiche « Professeurs » ci-dessus). Un badge{' '}
          <span className="rounded-full border border-warn/50 bg-warn/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-warn">hors liste blanche</span>{' '}
          signale un compte qui n&apos;est pas (ou plus) dans la liste blanche — à régulariser si besoin.
          La corbeille supprime un compte <strong>définitivement</strong> (profil, connexion et liste
          blanche), après un double verrou. Votre propre compte administrateur n&apos;est pas supprimable.
        </p>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-[.06em] text-muted">
              <tr>
                <th className="px-3 py-2.5">Nom</th>
                <th className="px-3 py-2.5">Adresse</th>
                <th className="px-3 py-2.5">Rôle</th>
                <th className="px-3 py-2.5">Liste blanche</th>
                <th className="px-3 py-2.5">Dernière connexion</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => {
                const protege = t.role === 'admin' || t.id === profile.id;
                return (
                <tr key={t.id} className="border-t border-line align-middle">
                  <td className="px-3 py-2.5">{t.full_name ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px]">{t.email ?? t.login ?? '—'}</td>
                  <td className="px-3 py-2.5">{ROLE_LABEL[t.role]}</td>
                  <td className="px-3 py-2.5">
                    {t.inAllowlist ? (
                      <span className="rounded-full border border-good/50 bg-good/10 px-2 py-0.5 text-[11px] font-semibold text-good">dans la liste</span>
                    ) : (
                      <span className="rounded-full border border-warn/50 bg-warn/10 px-2 py-0.5 text-[11px] font-semibold text-warn">hors liste blanche</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-muted">{dateCourte(t.last_seen_at)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {protege ? (
                      <span className="inline-flex items-center gap-1 rounded-[10px] border border-line bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-muted" title="Le compte administrateur n’est pas supprimable">
                        🔒 compte admin
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => { setErr(null); setOk(null); setConfirmation(''); setASupprimer(t); }}
                        className="inline-flex items-center gap-1.5 rounded-[10px] border border-crit/50 px-3 py-1 text-[12.5px] font-semibold text-crit disabled:opacity-40"
                      >
                        🗑️ Supprimer
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
              {teachers.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">Aucun compte professeur.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panneau>

      <Panneau title="Liste blanche">
        <p className="mb-3 text-[13px] text-muted">
          Seules les adresses inscrites ci-dessous peuvent se connecter ; toute autre est refusée à
          l&apos;inscription. Une adresse Google entre d&apos;un clic. Une adresse académique, elle,
          n&apos;est pas un compte Google : il faut lui « créer l&apos;accès », ce qui génère un mot de
          passe provisoire à transmettre — la personne en choisira un autre à sa première session.
        </p>

        {motDePasse && (
          <div className="mb-3 rounded-xl border border-accent/50 bg-accent/5 p-3">
            <p className="text-[13px] font-semibold text-[#141A21]">
              Accès pour {motDePasse.email}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              À transmettre à l&apos;intéressé, qui se connecte par l&apos;onglet « Professeur »
              avec cette adresse et ce mot de passe. Il n&apos;est affiché qu&apos;une fois, et
              il est <strong>provisoire</strong> : à la première session, la personne devra
              choisir le sien avant d&apos;accéder au reste de l&apos;application.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-[8px] border border-line bg-white px-3 py-1.5 font-mono text-[13px]">
                {motDePasse.password}
              </code>
              <CopierBouton value={motDePasse.password} label="Copier le mot de passe" />
              <button
                type="button"
                onClick={() => setMotDePasse(null)}
                className="min-h-touch rounded-[10px] border border-line px-3 text-[12.5px] font-semibold text-muted"
              >
                Masquer
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-[.06em] text-muted">
              <tr>
                <th className="px-3 py-2.5">Adresse</th>
                <th className="px-3 py-2.5">Adresse Google</th>
                <th className="px-3 py-2.5">Nom</th>
                <th className="px-3 py-2.5">Rôle</th>
                <th className="px-3 py-2.5">État</th>
                <th className="px-3 py-2.5">Dernière connexion</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {allowlist.map((entry) => (
                <tr key={entry.email} className="border-t border-line align-middle">
                  <td className="px-3 py-2.5 font-mono text-[12px]">{entry.email}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-muted">{entry.google_email ?? '—'}</td>
                  <td className="px-3 py-2.5">{entry.profile?.full_name ?? entry.full_name ?? '—'}</td>
                  <td className="px-3 py-2.5">{ROLE_LABEL[entry.role]}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        entry.profile
                          ? 'border-good/50 bg-good/10 text-good'
                          : 'border-line bg-[var(--surface-2)] text-muted'
                      }`}
                    >
                      {entry.profile ? 'actif' : 'jamais connecté'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-muted">
                    {dateCourte(entry.profile?.last_seen_at)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <CopierBouton value={entry.email} label="Copier" />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => genererMotDePasse(entry.email)}
                        className="min-h-touch rounded-[10px] border border-line px-3 text-[12.5px] font-semibold text-[#141A21] disabled:opacity-40"
                      >
                        {entry.profile ? 'Nouveau mot de passe' : 'Créer l\u2019accès'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || entry.email === profile.email}
                        onClick={() => retirer(entry.email)}
                        className="min-h-touch rounded-[10px] border border-crit/50 px-3 text-[12.5px] font-semibold text-crit disabled:opacity-40"
                      >
                        Retirer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {allowlist.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted">
                    Aucune adresse autorisée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panneau>

      <Panneau title="Autoriser une adresse">
        <p className="mb-3 text-[13px] text-muted">
          Une personne, deux portes d&apos;entrée. L&apos;<strong>adresse électronique</strong> est
          son identité de référence : c&apos;est elle qui porte le mot de passe, et c&apos;est la
          seule qui convienne à une adresse académique. L&apos;<strong>adresse Google</strong> est
          facultative et ouvre le même compte d&apos;un clic, pour qui en possède une.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Champ label="Adresse électronique" className="lg:col-span-2">
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@ac-guyane.fr"
              className={inputClass}
            />
          </Champ>
          <Champ label="Adresse Google (facultative)" className="lg:col-span-2">
            <input
              type="email"
              inputMode="email"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              placeholder="prenom.nom@gmail.com"
              className={inputClass}
            />
          </Champ>
          <Champ label="Nom (facultatif)">
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="M. Dupont" className={inputClass} />
          </Champ>
          <Champ label="Rôle">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value === 'admin' ? 'admin' : 'professeur')}
              className={inputClass}
            >
              <option value="professeur">Professeur</option>
              {/*
                L'établissement n'a qu'un administrateur. Tant qu'il y en a un, le
                choix reste visible mais inerte : le masquer laisserait croire que
                le rôle n'existe pas, alors qu'il est simplement déjà attribué.
              */}
              <option value="admin" disabled={Boolean(adminExistant)}>
                Administrateur{adminExistant ? ` — déjà ${adminExistant}` : ''}
              </option>
            </select>
          </Champ>
        </div>
        <button
          type="button"
          onClick={ajouter}
          disabled={!valide || busy}
          className="mt-3 min-h-touch rounded-[10px] border border-accent bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"
        >
          Ajouter à la liste blanche
        </button>
      </Panneau>

      <ImagesTp admin={profile.role === 'admin'} />

      <Message error={err} ok={ok} />

      {aSupprimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,20,26,.5)] px-4"
          onClick={(e) => { if (e.target === e.currentTarget && !busy) { setASupprimer(null); setConfirmation(''); } }}
        >
          <div className="w-full max-w-[460px] rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="flex items-center gap-2 text-[16px] font-semibold text-crit">
              <span aria-hidden>⚠️</span> Suppression définitive
            </h3>
            <p className="mt-2 text-[13px]">
              Vous êtes sur le point de supprimer <strong>{aSupprimer.full_name ?? aSupprimer.email ?? 'ce compte'}</strong>
              {' '}(<span className="font-mono text-[12px]">{aSupprimer.email ?? aSupprimer.login}</span>).
              {' '}<strong>Cette action est irréversible.</strong>
            </p>
            <div className="mt-3 rounded-xl border border-crit/30 bg-crit/5 p-3 text-[12.5px]">
              Seront effacés sans retour :
              <ul className="mt-1 list-disc pl-5">
                <li>son profil dans l&apos;application</li>
                <li>son compte de connexion — plus aucun accès possible</li>
                {aSupprimer.inAllowlist
                  ? <li>son adresse retirée de la liste blanche</li>
                  : <li className="text-muted">(déjà hors liste blanche)</li>}
                <li>ses classes éventuelles (les élèves sont détachés, pas supprimés)</li>
              </ul>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
              Second verrou — recopiez l&apos;adresse pour confirmer
            </p>
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={aSupprimer.email ?? aSupprimer.login ?? 'adresse'}
              autoComplete="off"
              className={`${inputClass} mt-1 font-mono`}
            />
            <p className={`mt-1.5 text-[11.5px] ${confirmationValide ? 'text-good' : 'text-muted'}`}>
              {confirmationValide
                ? '✓ adresse correcte — suppression déverrouillée'
                : 'Le bouton rouge s’active quand l’adresse correspond.'}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setASupprimer(null); setConfirmation(''); }}
                className="min-h-touch rounded-[10px] border border-line px-4 text-[13px] font-semibold text-muted disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!confirmationValide || busy}
                onClick={supprimerDefinitivement}
                className="min-h-touch rounded-[10px] border border-crit bg-crit px-4 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
