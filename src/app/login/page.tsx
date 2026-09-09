'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.2 5.6c4.2-3.9 6.6-9.7 6.6-17z" />
      <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.4 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function LoginCard() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/tp';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-[#D3D9E1] bg-white p-8 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#141A21] text-lg text-[#E39A00]">⚡</span>
        <span className="font-[var(--font-title)] text-2xl font-semibold uppercase tracking-wide text-[#141A21]">
          SimulElec
        </span>
      </div>
      <h1 className="mt-6 text-xl font-semibold text-[#141A21]">Connexion</h1>
      <p className="mt-1 text-sm leading-relaxed text-[#66717F]">
        Utilise ton compte Google du lycée pour retrouver tes TP, tes relevés et ta progression.
      </p>

      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-[#D3D9E1] bg-white px-4 text-sm font-medium text-[#141A21] transition hover:bg-[#F5F6F8] disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? 'Redirection…' : 'Continuer avec Google'}
      </button>

      {error && <p className="mt-4 text-sm text-[#D93A3A]">{error}</p>}

      <p className="mt-6 border-t border-[#D3D9E1] pt-4 text-xs leading-relaxed text-[#66717F]">
        Lycée professionnel · filière MELEC — Métiers de l&apos;Électricité et de ses Environnements Connectés.
        Aucune donnée n&apos;est utilisée en dehors du suivi pédagogique.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-[calc(100vh-56px)] place-items-center bg-[#F5F6F8] p-6">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
