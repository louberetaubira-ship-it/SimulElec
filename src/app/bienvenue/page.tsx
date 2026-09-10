'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DIPLOMAS, type DiplomaId } from '@/lib/data/competences';
import { getMyProfile, updateProfile } from '@/lib/db/profiles';
import { DEMO, readLocalStudent, writeLocalStudent } from '@/lib/student';

const PITCH: Record<DiplomaId, string> = {
  cap: 'Réalisation et contrôle d’installations, en habitat comme en industrie.',
  bacpro: 'Préparation, réalisation, mise en service, diagnostic et communication client.',
  bts: 'Conception, dimensionnement, mise en service et diagnostic de performance.',
  cster: 'Photovoltaïque et énergies renouvelables : dimensionnement, pose, essais.',
};

const ICON: Record<DiplomaId, string> = { cap: '🔧', bacpro: '⚡', bts: '📐', cster: '☀️' };

function BienvenueForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get('next') ?? '/tp';
  const next = rawNext.startsWith('/') ? rawNext : '/tp';

  const [name, setName] = useState('');
  const [etab, setEtab] = useState('');
  const [diploma, setDiploma] = useState<DiplomaId | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (DEMO) {
      const local = readLocalStudent();
      if (local) {
        setName(local.name);
        setEtab(local.etablissement);
        setDiploma(local.diploma);
      }
      setLoading(false);
      return;
    }
    try {
      const p = await getMyProfile();
      setName(p?.full_name ?? '');
      setEtab(p?.etablissement ?? '');
      setDiploma(p?.diploma ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function onSubmit() {
    if (!diploma || name.trim().length < 2) return;
    setBusy(true);
    setErr(null);
    const student = { name: name.trim(), diploma, etablissement: etab.trim() };
    try {
      if (DEMO) {
        writeLocalStudent(student);
      } else {
        await updateProfile({
          full_name: student.name,
          etablissement: student.etablissement || null,
          diploma,
          onboarded: true,
        });
        writeLocalStudent(student);
      }
      router.replace(next);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-[#66717F]">Chargement…</p>;

  const ready = !!diploma && name.trim().length >= 2;

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-[#D3D9E1] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#141A21] text-lg text-[#E39A00]">⚡</span>
        <span className="font-[var(--font-title)] text-2xl font-semibold uppercase tracking-wide">SimulElec</span>
      </div>

      <h1 className="mt-5 font-[var(--font-title)] text-3xl font-bold uppercase tracking-wide">Bienvenue</h1>
      <p className="mt-1 text-sm leading-relaxed text-[#66717F]">
        Dis-nous qui tu es et quel diplôme tu prépares : le simulateur adapte ses explications, l&apos;aide du
        professeur virtuel et ta grille d&apos;évaluation au référentiel de ta formation.
      </p>

      <label className="mt-5 block text-sm">
        <span className="text-[#66717F]">Nom et prénom</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-t="nom"
          placeholder="Prénom NOM"
          className="mt-1 min-h-[46px] w-full rounded-lg border border-[#D3D9E1] px-3 text-sm"
        />
      </label>

      <fieldset className="mt-5 border-0 p-0">
        <legend className="text-sm text-[#66717F]">Diplôme préparé</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DIPLOMAS.map((d) => {
            const active = diploma === d.id;
            return (
              <button
                key={d.id}
                type="button"
                data-diploma={d.id}
                aria-pressed={active}
                onClick={() => setDiploma(d.id)}
                className={`min-h-[92px] rounded-xl border p-3 text-left transition ${active
                  ? 'border-[#E39A00] bg-[#FEF3E2] shadow-sm'
                  : 'border-[#D3D9E1] bg-white hover:bg-[#F5F6F8]'}`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-lg">{ICON[d.id]}</span>
                  <b className="text-sm">{d.short}</b>
                  {active && <span className="ml-auto text-[#1E9E63]">✓</span>}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-[#66717F]">{PITCH[d.id]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-5 block text-sm">
        <span className="text-[#66717F]">Établissement (facultatif)</span>
        <input
          value={etab}
          onChange={(e) => setEtab(e.target.value)}
          data-t="etab"
          placeholder="Lycée professionnel…"
          className="mt-1 min-h-[46px] w-full rounded-lg border border-[#D3D9E1] px-3 text-sm"
        />
      </label>

      <button
        type="button"
        data-t="valider"
        disabled={!ready || busy}
        onClick={() => void onSubmit()}
        className="mt-6 min-h-[48px] w-full rounded-xl bg-[#141A21] px-5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Enregistrement…' : 'C’est parti'}
      </button>

      {!ready && (
        <p className="mt-2 text-xs text-[#66717F]">Renseigne ton nom et choisis ton diplôme pour continuer.</p>
      )}
      {err && <p className="mt-3 text-sm text-[#D93A3A]">{err}</p>}
      <p className="mt-4 border-t border-[#D3D9E1] pt-3 text-xs leading-relaxed text-[#66717F]">
        Tu pourras modifier ces informations à tout moment depuis <b>Mon compte</b>.
      </p>
    </div>
  );
}

export default function BienvenuePage() {
  return (
    <main className="grid min-h-[calc(100vh-56px)] place-items-center bg-[#F5F6F8] p-4 sm:p-6">
      <Suspense fallback={null}>
        <BienvenueForm />
      </Suspense>
    </main>
  );
}
