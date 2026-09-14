'use client';

/**
 * Première session : choisir son mot de passe.
 *
 * Le mot de passe remis par l'administrateur a été dit à voix haute, écrit sur
 * un papier ou collé dans un message. Il ouvre la porte une fois ; il ne reste
 * pas. Tant que celui-ci n'a pas été remplacé, le middleware ramène ici — c'est
 * la seule page accessible, et c'est voulu.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const MIN = 10;

const INPUT =
  'mt-1 w-full min-h-[48px] rounded-xl border border-[#D3D9E1] bg-white px-3 text-sm text-[#141A21] outline-none transition focus:border-[#E39A00]';

export default function MotDePassePage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirme, setConfirme] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avertissement, setAvertissement] = useState<string | null>(null);

  const court = password.length > 0 && password.length < MIN;
  const different = confirme.length > 0 && confirme !== password;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setAvertissement(null);
    if (password !== confirme) {
      setError('Les deux saisies ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      const reponse = await fetch('/api/compte/mot-de-passe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const charge = (await reponse.json().catch(() => null)) as
        { ok?: boolean; avertissement?: string; error?: string } | null;
      if (!reponse.ok || !charge?.ok) throw new Error(charge?.error ?? 'Changement impossible.');
      if (charge.avertissement) setAvertissement(charge.avertissement);

      // Le changement invalide les autres sessions : on rafraîchit la nôtre avant
      // de continuer, sinon la navigation suivante retombe sur la page de connexion.
      await createClient().auth.refreshSession();
      router.replace('/tp');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Changement impossible.');
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-56px)] place-items-center bg-[#F5F6F8] p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[#D3D9E1] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#141A21] text-lg text-[#E39A00]">⚡</span>
          <span className="font-[var(--font-title)] text-2xl font-semibold uppercase tracking-wide text-[#141A21]">
            SimulElec
          </span>
        </div>

        <h1 className="mt-5 text-xl font-semibold text-[#141A21]">Choisissez votre mot de passe</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#66717F]">
          Celui que l&apos;administrateur vous a remis est provisoire : il a été transmis de la
          main à la main, donc il n&apos;est plus un secret. Choisissez-en un que vous seul
          connaissez — au moins {MIN} caractères.
        </p>

        <form onSubmit={submit} className="mt-5">
          <label className="block text-sm font-medium text-[#141A21]">
            Nouveau mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN}
              required
              autoFocus
              className={INPUT}
            />
          </label>
          {court && (
            <p className="mt-1 text-xs text-[#D97706]">
              Encore {MIN - password.length} caractère{MIN - password.length > 1 ? 's' : ''}.
            </p>
          )}

          <label className="mt-3 block text-sm font-medium text-[#141A21]">
            Confirmation
            <input
              type="password"
              value={confirme}
              onChange={(e) => setConfirme(e.target.value)}
              autoComplete="new-password"
              required
              className={INPUT}
            />
          </label>
          {different && <p className="mt-1 text-xs text-[#D97706]">Les deux saisies diffèrent.</p>}

          <button
            type="submit"
            disabled={busy || password.length < MIN || password !== confirme}
            className="mt-5 min-h-[48px] w-full rounded-xl bg-[#141A21] px-4 text-sm font-semibold text-white transition hover:bg-[#000] disabled:opacity-60"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer et continuer'}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-[#D93A3A]/30 bg-[#D93A3A]/5 p-3 text-sm leading-relaxed text-[#D93A3A]">
            {error}
          </p>
        )}
        {avertissement && (
          <p className="mt-4 rounded-xl border border-[#D97706]/30 bg-[#D97706]/5 p-3 text-sm leading-relaxed text-[#D97706]">
            {avertissement}
          </p>
        )}
      </div>
    </main>
  );
}
