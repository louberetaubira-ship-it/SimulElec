import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[#E39A00]">
        Bac Pro MELEC · BTS Électrotechnique
      </p>
      <h1 className="mt-3 font-[var(--font-title)] text-4xl font-bold uppercase leading-tight tracking-wide text-[#141A21] sm:text-5xl">
        Câble une armoire, mets-la en service, cherche la panne.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[#66717F]">
        SimulElec est un atelier virtuel : tu choisis l&apos;appareillage, tu poses les modules sur les rails DIN,
        tu tires les fils entre les borniers X1 et X2, tu fais les contrôles hors tension, puis tu mets sous
        tension et tu mesures. Un professeur virtuel te guide sans jamais te donner la réponse.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={user ? '/tp' : '/login'}
          className="grid min-h-[48px] place-items-center rounded-xl bg-[#E39A00] px-6 text-sm font-semibold text-[#141A21]"
        >
          {user ? 'Mes TP' : 'Se connecter'}
        </Link>
        {user && (
          <Link
            href="/compte"
            className="grid min-h-[48px] place-items-center rounded-xl border border-[#D3D9E1] bg-white px-6 text-sm font-semibold text-[#141A21]"
          >
            Mon compte
          </Link>
        )}
      </div>

      <ul className="mt-12 grid gap-3 sm:grid-cols-3">
        {[
          { t: '8 étapes', d: 'Du choix du matériel à la validation, comme en atelier.' },
          { t: 'Mesures réelles', d: 'Multimètre, pince ampèremétrique, tachymètre, mégohmmètre.' },
          { t: 'Suivi prof', d: 'Chaque relevé et chaque échange est tracé pour l’évaluation.' },
        ].map((c) => (
          <li key={c.t} className="rounded-xl border border-[#D3D9E1] bg-white p-4">
            <p className="font-[var(--font-title)] text-lg font-semibold uppercase tracking-wide">{c.t}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#66717F]">{c.d}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
