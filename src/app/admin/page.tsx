'use client';

/**
 * Écran administrateur : chiffres de l'établissement et liste blanche des adresses
 * autorisées à se connecter avec Google. Réservé au rôle `admin` (le middleware garde la route,
 * ce composant refait le contrôle côté interface).
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMyProfile } from '@/lib/db/profiles';
import { addTeacher, listAllowlist, removeTeacher, type TeacherAllowEntry } from '@/lib/db/allowlist';
import type { ProfileRow } from '@/lib/db/types';
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
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [role, setRole] = useState<'professeur' | 'admin'>('professeur');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    const [liste, compteurs] = await Promise.all([listAllowlist(), compter()]);
    setAllowlist(liste);
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
      await addTeacher(email.trim().toLowerCase(), nom.trim() || undefined, role);
      setEmail('');
      setNom('');
      setRole('professeur');
      setOk('Adresse ajoutée : la personne peut maintenant se connecter avec Google.');
      await recharger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ajout impossible.');
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

      <Panneau title="Liste blanche">
        <p className="mb-3 text-[13px] text-muted">
          Seules les adresses inscrites ci-dessous peuvent se connecter avec Google ; toute autre adresse est
          refusée à l&apos;inscription.
        </p>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-[.06em] text-muted">
              <tr>
                <th className="px-3 py-2.5">Adresse</th>
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
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    Aucune adresse autorisée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panneau>

      <Panneau title="Autoriser une adresse">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Champ label="Adresse Google" className="lg:col-span-2">
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@ac-academie.fr"
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
              <option value="admin">Administrateur</option>
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

      <Message error={err} ok={ok} />
    </main>
  );
}
