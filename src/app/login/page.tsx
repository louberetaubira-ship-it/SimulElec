'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

type Tab = 'eleve' | 'prof';

const INPUT =
  'mt-1 w-full min-h-[48px] rounded-xl border border-[#D3D9E1] bg-white px-3 text-sm text-[#141A21] outline-none transition focus:border-[#E39A00]';

function EleveForm({ next }: { next: string }) {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/eleve/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const payload = (await response.json().catch(() => null)) as { email?: string; error?: string } | null;
      if (!response.ok || !payload?.email) {
        throw new Error(payload?.error ?? 'Identifiant ou mot de passe incorrect.');
      }
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email: payload.email, password });
      if (err) throw new Error('Identifiant ou mot de passe incorrect.');
      router.replace(next === '/tp' ? '/moi' : next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Identifiant ou mot de passe incorrect.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5">
      <p className="text-sm leading-relaxed text-[#66717F]">
        Saisis l&apos;identifiant et le mot de passe que ton professeur t&apos;a remis.
      </p>

      <label className="mt-4 block text-sm font-medium text-[#141A21]">
        Identifiant
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="dupont.lea"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className={INPUT}
        />
      </label>

      <label className="mt-3 block text-sm font-medium text-[#141A21]">
        Mot de passe
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="tarolu-42"
          autoComplete="current-password"
          required
          className={INPUT}
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-5 min-h-[48px] w-full rounded-xl bg-[#141A21] px-4 text-sm font-semibold text-white transition hover:bg-[#000] disabled:opacity-60"
      >
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>

      {error && <p className="mt-4 text-sm text-[#D93A3A]">{error}</p>}

      <p className="mt-4 text-xs leading-relaxed text-[#66717F]">
        Mot de passe oublié ? Demande à ton professeur : il peut t&apos;en générer un nouveau.
      </p>
    </form>
  );
}

function ProfForm({ next, initialError }: { next: string; initialError: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const destination = next && next !== '/tp' ? next : '/prof';

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) throw new Error('Adresse ou mot de passe incorrect.');
      router.replace(destination);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adresse ou mot de passe incorrect.');
      setBusy(false);
    }
  }

  async function signInGoogle() {
    setGoogleBusy(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (err) {
      setError(err.message);
      setGoogleBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <p className="text-sm leading-relaxed text-[#66717F]">
        Seules les adresses inscrites par l&apos;administrateur peuvent se connecter.
      </p>

      <form onSubmit={submitPassword} className="mt-4">
        <label className="block text-sm font-medium text-[#141A21]">
          Adresse e-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@ac-guyane.fr"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={INPUT}
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-[#141A21]">
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="celui remis par l'administrateur"
            autoComplete="current-password"
            required
            className={INPUT}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="mt-5 min-h-[48px] w-full rounded-xl bg-[#141A21] px-4 text-sm font-semibold text-white transition hover:bg-[#000] disabled:opacity-60"
        >
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-[#98A2AF]">
        <span className="h-px flex-1 bg-[#D3D9E1]" />
        ou
        <span className="h-px flex-1 bg-[#D3D9E1]" />
      </div>

      <button
        type="button"
        onClick={signInGoogle}
        disabled={googleBusy}
        className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-[#D3D9E1] bg-white px-4 text-sm font-medium text-[#141A21] transition hover:bg-[#F5F6F8] disabled:opacity-60"
      >
        <GoogleMark />
        {googleBusy ? 'Redirection…' : 'Continuer avec Google'}
      </button>

      {error && (
        <p className="mt-4 rounded-xl border border-[#D93A3A]/30 bg-[#D93A3A]/5 p-3 text-sm leading-relaxed text-[#D93A3A]">
          {error}
        </p>
      )}
    </div>
  );
}

function LoginCard() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/tp';
  const initialError = params.get('error');
  const [tab, setTab] = useState<Tab>(initialError ? 'prof' : 'eleve');

  const tabClass = (value: Tab) =>
    `min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium transition ${
      tab === value ? 'bg-white text-[#141A21] shadow-sm' : 'text-[#66717F] hover:text-[#141A21]'
    }`;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-[#D3D9E1] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#141A21] text-lg text-[#E39A00]">⚡</span>
        <span className="font-[var(--font-title)] text-2xl font-semibold uppercase tracking-wide text-[#141A21]">
          SimulElec
        </span>
      </div>
      <h1 className="mt-5 text-xl font-semibold text-[#141A21]">Connexion</h1>

      <div className="mt-4 flex gap-1 rounded-xl bg-[#F5F6F8] p-1" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'eleve'} onClick={() => setTab('eleve')} className={tabClass('eleve')}>
          Élève
        </button>
        <button type="button" role="tab" aria-selected={tab === 'prof'} onClick={() => setTab('prof')} className={tabClass('prof')}>
          Professeur
        </button>
      </div>

      {tab === 'eleve' ? <EleveForm next={next} /> : <ProfForm next={next} initialError={initialError} />}

      <p className="mt-6 border-t border-[#D3D9E1] pt-4 text-xs leading-relaxed text-[#66717F]">
        Lycée professionnel · CAP Électricien, Bac Pro MELEC, BTS Électrotechnique, CS TER.
        Aucune donnée n&apos;est utilisée en dehors du suivi pédagogique.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-[calc(100vh-56px)] place-items-center bg-[#F5F6F8] p-4 sm:p-6">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
