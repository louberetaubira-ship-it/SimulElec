'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ProfileRow } from '@/lib/db/types';

export default function Nav() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) {
        setProfile(null);
        setReady(true);
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!alive) return;
      setProfile((data as ProfileRow | null) ?? null);
      setReady(true);
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Liens selon le rôle : élève, professeur, administrateur.
  const role = profile?.role;
  const links: { href: string; label: string }[] = [];
  if (role === 'eleve') {
    links.push({ href: '/tp', label: 'Mes TP' });
    links.push({ href: '/moi', label: 'Ma progression' });
    links.push({ href: '/atelier', label: 'Atelier' });
  } else if (role === 'professeur' || role === 'admin') {
    links.push({ href: '/tp', label: 'Catalogue' });
    links.push({ href: '/prof/classes', label: 'Mes classes' });
    links.push({ href: '/prof', label: 'Suivi' });
    links.push({ href: '/prof/tp/nouveau', label: 'Créer un TP' });
    if (role === 'admin') links.push({ href: '/admin', label: 'Établissement' });
  }
  if (profile) links.push({ href: '/compte', label: 'Compte' });

  const initials = (profile?.full_name ?? profile?.email ?? '?')
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-40 border-b border-[#D3D9E1] bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#141A21] text-[#E39A00]">⚡</span>
          <span className="font-[var(--font-title)] text-xl font-semibold uppercase tracking-wide text-[#141A21]">
            SimulElec
          </span>
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            // Le lien actif est le plus précis : /prof/classes ne surligne pas /prof.
            const candidats = links
              .filter((x) => pathname === x.href || pathname.startsWith(`${x.href}/`))
              .map((x) => x.href.length);
            const active =
              (pathname === l.href || pathname.startsWith(`${l.href}/`)) &&
              l.href.length === Math.max(...candidats);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`grid min-h-[40px] flex-none place-items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium transition ${
                  active ? 'bg-[#F5F6F8] text-[#141A21]' : 'text-[#66717F] hover:bg-[#F5F6F8]'
                }`}
              >
                {l.label}
              </Link>
            );
          })}

          {ready && !profile && (
            <Link
              href="/login"
              className="grid min-h-[40px] place-items-center rounded-lg bg-[#E39A00] px-4 text-sm font-semibold text-[#141A21]"
            >
              Se connecter
            </Link>
          )}

          {profile && (
            <Link href="/compte" className="ml-1" aria-label="Mon compte">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full border border-[#D3D9E1] object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F6F8] text-xs font-semibold text-[#66717F]">
                  {initials}
                </span>
              )}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
