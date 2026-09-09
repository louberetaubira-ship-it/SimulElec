'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMyProfile, joinClass, updateProfile } from '@/lib/db/profiles';
import type { ClassRow, ProfileRow } from '@/lib/db/types';

const ROLE_LABEL: Record<ProfileRow['role'], string> = {
  eleve: 'Élève',
  professeur: 'Professeur',
  admin: 'Administrateur',
};

export default function ComptePage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [fullName, setFullName] = useState('');
  const [etab, setEtab] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await getMyProfile();
      setProfile(p);
      setFullName(p?.full_name ?? '');
      setEtab(p?.etablissement ?? '');
      if (p?.class_id) {
        const { data } = await createClient()
          .from('classes')
          .select('id, name, level, teacher_id, join_code')
          .eq('id', p.class_id)
          .maybeSingle();
        setKlass((data as ClassRow | null) ?? null);
      } else {
        setKlass(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave() {
    setErr(null);
    setMsg(null);
    try {
      const p = await updateProfile({ full_name: fullName.trim() || null, etablissement: etab.trim() || null });
      setProfile(p);
      setMsg('Profil enregistré.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function onJoin() {
    setErr(null);
    setMsg(null);
    try {
      await joinClass(code);
      setCode('');
      setMsg('Classe rejointe.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Code invalide');
    }
  }

  if (loading) return <main className="mx-auto max-w-2xl p-6 text-sm text-[#66717F]">Chargement…</main>;
  if (!profile) return <main className="mx-auto max-w-2xl p-6 text-sm text-[#66717F]">Profil introuvable.</main>;

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-5 py-8">
      <h1 className="font-[var(--font-title)] text-3xl font-bold uppercase tracking-wide">Mon compte</h1>

      <section className="rounded-xl border border-[#D3D9E1] bg-white p-5">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full border border-[#D3D9E1] object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F5F6F8] text-[#66717F]">👤</span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{profile.full_name ?? 'Sans nom'}</p>
            <p className="truncate font-[var(--font-mono)] text-xs text-[#66717F]">{profile.email}</p>
          </div>
          <span className="ml-auto rounded-full bg-[#F5F6F8] px-3 py-1 text-xs font-semibold text-[#66717F]">
            {ROLE_LABEL[profile.role]}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[#66717F]">Nom affiché</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-[#D3D9E1] px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#66717F]">Établissement</span>
            <input
              value={etab}
              onChange={(e) => setEtab(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-[#D3D9E1] px-3 text-sm"
            />
          </label>
        </div>
        <button
          onClick={onSave}
          className="mt-4 min-h-[44px] rounded-lg bg-[#141A21] px-5 text-sm font-semibold text-white"
        >
          Enregistrer
        </button>
      </section>

      <section className="rounded-xl border border-[#D3D9E1] bg-white p-5">
        <h2 className="font-[var(--font-title)] text-xl font-semibold uppercase tracking-wide">Ma classe</h2>
        {klass ? (
          <p className="mt-2 text-sm text-[#66717F]">
            Tu es inscrit dans <strong className="text-[#141A21]">{klass.name}</strong>
            {klass.level ? ` · ${klass.level}` : ''} (code{' '}
            <span className="font-[var(--font-mono)]">{klass.join_code}</span>).
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#66717F]">Tu n&apos;es rattaché à aucune classe.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE CLASSE"
            className="min-h-[44px] flex-1 rounded-lg border border-[#D3D9E1] px-3 font-[var(--font-mono)] text-sm uppercase tracking-widest"
          />
          <button
            onClick={onJoin}
            disabled={code.trim().length < 4}
            className="min-h-[44px] rounded-lg bg-[#E39A00] px-5 text-sm font-semibold text-[#141A21] disabled:opacity-50"
          >
            Rejoindre
          </button>
        </div>
      </section>

      {msg && <p className="text-sm text-[#1E9E63]">{msg}</p>}
      {err && <p className="text-sm text-[#D93A3A]">{err}</p>}

      <form action="/auth/signout" method="post">
        <button className="min-h-[44px] rounded-lg border border-[#D3D9E1] bg-white px-5 text-sm font-semibold text-[#D93A3A]">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
