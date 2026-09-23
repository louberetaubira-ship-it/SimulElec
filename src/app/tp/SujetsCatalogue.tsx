'use client';
/**
 * Catalogue des sujets d'examen numériques : cartes regroupées par dossier (le sujet complet
 * en carte large, puis ses sujets thématiques colorés par thème) et barre de filtres par
 * thème, transversale aux dossiers. Les données arrivent déjà résumées du serveur.
 */
import { useState } from 'react';
import Link from 'next/link';
import { ORDRE_THEMES, THEMES, THEME_COMPLET } from '@/lib/sujet/themes';
import type { ThemeSujet } from '@/lib/sujet/types';

export interface CarteSujet {
  id: string;
  titre: string;
  sousTitre: string;
  /** Thème du sujet thématique ; null = sujet complet. */
  theme: ThemeSujet | null;
  /** Nom court du dossier (« EIP »). */
  dossier: string;
  questions: number;
  premiere: number;
  derniere: number;
  /** Repères de la première et de la dernière question (« Q14 → Q38 », « B.1.1 → B.2.9 »). */
  intervalle?: string;
  points: number;
  duree: string;
  dtr: string;
  competences: string[];
  parties: number;
}

export interface GroupeSujets {
  id: string;
  titre: string;
  cartes: CarteSujet[];
}

type Filtre = 'tous' | 'complet' | ThemeSujet;

export default function SujetsCatalogue({ groupes }: { groupes: GroupeSujets[] }) {
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const themes = ORDRE_THEMES.filter(t => groupes.some(g => g.cartes.some(c => c.theme === t)));
  const filtres: [Filtre, string][] = [
    ['tous', 'Tous'],
    ...themes.map(t => [t, `${THEMES[t].icone} ${THEMES[t].label}`] as [Filtre, string]),
    ['complet', `${THEME_COMPLET.icone} ${THEME_COMPLET.label}`],
  ];
  const garde = (c: CarteSujet) => filtre === 'tous' || (filtre === 'complet' ? c.theme === null : c.theme === filtre);

  return (
    <div data-catalogue-sujets>
      <div className="mb-3 flex flex-wrap gap-1.5" role="toolbar" aria-label="Filtrer par thème">
        {filtres.map(([f, l]) => (
          <button key={f} type="button" onClick={() => setFiltre(f)} aria-pressed={filtre === f} data-filtre-theme={f}
            className={`min-h-[36px] rounded-full border px-3 text-[12.5px] font-semibold transition ${filtre === f ? 'border-[#1B222C] bg-[#1B222C] text-white' : 'border-[var(--line)] bg-[var(--surface)] text-ink hover:border-accent'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-5">
        {groupes.map(g => {
          const cartes = g.cartes.filter(garde);
          if (!cartes.length) return null;
          return (
            <div key={g.id} data-dossier={g.id}>
              <div className="mb-2 text-[12px] font-semibold text-muted">Dossier · {g.titre}</div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {cartes.map(c => <Carte key={c.id} c={c} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Carte({ c }: { c: CarteSujet }) {
  const t = c.theme ? THEMES[c.theme] : THEME_COMPLET;
  const complet = c.theme === null;
  const stats = [
    `${c.questions} questions · ${c.intervalle ?? `Q${c.premiere} → Q${c.derniere}`}`,
    `${c.points} pts`,
    `⏱ ${c.duree}`,
    c.dtr,
    c.competences.join(' · '),
  ].filter(Boolean);
  return (
    <div data-sujet={c.id} data-theme={c.theme ?? 'complet'}
      className={`flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 ${complet ? 'flex-col sm:col-span-2 sm:flex-row sm:items-center lg:col-span-4' : 'flex-col'}`}
      style={{ borderTop: `4px solid ${t.couleur}`, ...(complet ? { background: 'linear-gradient(90deg, var(--surface), #FFF7E6)' } : {}) }}>
      <div className="grid h-11 w-11 flex-none place-items-center rounded-xl text-[22px]" style={{ background: t.fond, color: t.couleur }} aria-hidden>{t.icone}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[.08em]" style={{ color: t.couleur }}>
          {complet ? `Sujet complet · ${c.parties} parties` : `${t.label} · ${c.dossier}`}
        </span>
        <h3 className="text-[16px] font-bold leading-tight">{c.titre}</h3>
        <p className="text-[12.5px] text-muted">{c.sousTitre}</p>
        <div className="mt-1 flex flex-wrap gap-1 text-[10.5px] font-semibold">
          {stats.map(x => <span key={x} className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.5 text-muted">{x}</span>)}
        </div>
      </div>
      <div className={`flex items-center gap-2 ${complet ? '' : 'mt-auto pt-1'}`}>
        <Link href={`/sujet/${c.id}`} data-ouvrir-sujet={c.id}
          className="grid min-h-touch flex-none place-items-center whitespace-nowrap rounded-[10px] bg-[#141A21] px-4 text-[13px] font-bold text-white">
          Ouvrir ▸
        </Link>
        <span className="text-[11.5px] leading-tight text-muted">{complet ? 'Épreuve blanche complète' : 'Copie et bilan séparés'}</span>
      </div>
    </div>
  );
}
