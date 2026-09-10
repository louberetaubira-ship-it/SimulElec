'use client';

/**
 * Éditeur de TP documentaire : le professeur rédige un énoncé, un cahier des charges et
 * choisit les compétences visées dans le référentiel du diplôme. Le câblage interactif
 * reste réservé aux TP fournis avec l'application (`playable = false`).
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getMyProfile } from '@/lib/db/profiles';
import { createTp, listMyTps, slugifyTitle, FAMILIES, type TpFamily, type TpRow } from '@/lib/db/tps';
import { COMPETENCES, DIPLOMAS, type DiplomaId } from '@/lib/data/competences';
import type { ProfileRow } from '@/lib/db/types';
import { Champ, Message, PageTitle, Panneau, inputClass } from '@/components/gestion/ui';

interface Ligne {
  k: string;
  v: string;
}

export default function NouveauTpPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [existants, setExistants] = useState<TpRow[]>([]);

  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('Bac Pro MELEC');
  const [family, setFamily] = useState<TpFamily>('ind');
  const [diploma, setDiploma] = useState<DiplomaId>('bacpro');
  const [summary, setSummary] = useState('');
  const [situation, setSituation] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([{ k: '', v: '' }]);
  const [competences, setCompetences] = useState<string[]>([]);
  const [published, setPublished] = useState(true);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setProfile(p);
        if (p && (p.role === 'professeur' || p.role === 'admin')) setExistants(await listMyTps());
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const slug = useMemo(() => slugifyTitle(title), [title]);
  const referentiel = COMPETENCES[diploma];

  function basculer(code: string) {
    setCompetences((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function majLigne(index: number, patch: Partial<Ligne>) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function enregistrer() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const tp = await createTp({
        title,
        level,
        family,
        summary,
        situation,
        cahierDesCharges: lignes,
        competences,
        diploma,
        published,
      });
      setOk(
        `TP « ${tp.title} » enregistré (identifiant ${tp.id}). ` +
          (tp.published ? 'Tu peux maintenant l’attribuer à une classe.' : 'Il reste en brouillon.'),
      );
      setExistants(await listMyTps());
      setTitle('');
      setSummary('');
      setSituation('');
      setLignes([{ k: '', v: '' }]);
      setCompetences([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8 text-[14px] text-muted">Chargement…</main>;

  if (!profile || (profile.role !== 'professeur' && profile.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageTitle>Créer un TP</PageTitle>
        <Message error="Cet espace est réservé aux comptes professeur." />
      </main>
    );
  }

  const pret = title.trim().length >= 3 && situation.trim().length >= 10 && slug.length > 0;

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <PageTitle sub="Rédige un TP documentaire : énoncé, cahier des charges et compétences visées.">
        Créer un TP
      </PageTitle>

      <p className="rounded-xl border border-warn/50 bg-warn/10 px-3 py-2.5 text-[13px] text-warn">
        <b>TP documentaire</b> — le câblage interactif reste réservé aux TP fournis. L&apos;élève lira l&apos;énoncé
        et le cahier des charges, avec un quiz éventuel.
      </p>

      <Panneau title="Identité du TP">
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ label="Titre" hint={slug ? `Identifiant : ${slug}` : 'Le titre sert à fabriquer l’identifiant.'} className="sm:col-span-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Éclairage d’un atelier en va-et-vient"
              className={inputClass}
            />
          </Champ>
          <Champ label="Niveau">
            <input value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass} />
          </Champ>
          <Champ label="Famille">
            <select
              value={family}
              onChange={(e) => setFamily(e.target.value as TpFamily)}
              className={inputClass}
            >
              {FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Résumé" className="sm:col-span-2">
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Une phrase qui apparaît dans le catalogue."
              className={inputClass}
            />
          </Champ>
        </div>
      </Panneau>

      <Panneau title="Énoncé / situation">
        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          rows={7}
          placeholder="Tu interviens dans un atelier… Décris le contexte, la demande du client et le travail attendu."
          className={`${inputClass} min-h-[160px] leading-relaxed`}
        />
      </Panneau>

      <Panneau
        title="Cahier des charges"
        aside={
          <button
            type="button"
            onClick={() => setLignes((prev) => [...prev, { k: '', v: '' }])}
            className="min-h-touch rounded-[10px] border border-line px-3 text-[12.5px] font-semibold"
          >
            Ajouter une ligne
          </button>
        }
      >
        <ul className="space-y-2">
          {lignes.map((l, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <input
                value={l.k}
                onChange={(e) => majLigne(i, { k: e.target.value })}
                placeholder="Tension d’alimentation"
                className={inputClass}
              />
              <input
                value={l.v}
                onChange={(e) => majLigne(i, { v: e.target.value })}
                placeholder="230 V — 50 Hz"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setLignes((prev) => prev.filter((_, j) => j !== i))}
                disabled={lignes.length === 1}
                className="min-h-touch rounded-[10px] border border-line px-3 text-[12.5px] font-semibold text-muted disabled:opacity-40"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      </Panneau>

      <Panneau
        title="Compétences visées"
        aside={
          <select
            value={diploma}
            onChange={(e) => {
              setDiploma(e.target.value as DiplomaId);
              setCompetences([]);
            }}
            className="min-h-touch rounded-[10px] border border-line bg-surface px-3 text-[13px]"
          >
            {DIPLOMAS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.short}
              </option>
            ))}
          </select>
        }
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {referentiel.map((c) => {
            const coche = competences.includes(c.code);
            return (
              <li key={c.code}>
                <label
                  className={`flex min-h-touch cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-[13px] ${
                    coche ? 'border-accent bg-accent/10' : 'border-line bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={coche}
                    onChange={() => basculer(c.code)}
                    className="mt-0.5 h-5 w-5 flex-none accent-[var(--accent)]"
                  />
                  <span>
                    <b className="font-mono text-[12px]">{c.code}</b> — {c.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Panneau>

      <Panneau title="Publication">
        <label className="flex min-h-touch items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent)]"
          />
          Publier ce TP : il apparaît dans la liste des TP attribuables aux classes.
        </label>
        <button
          type="button"
          onClick={enregistrer}
          disabled={!pret || busy}
          className="mt-3 min-h-touch rounded-[10px] border border-accent bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"
        >
          Enregistrer le TP
        </button>
        {!pret && (
          <p className="mt-2 text-[12px] text-muted">
            Il faut au minimum un titre et un énoncé pour enregistrer.
          </p>
        )}
      </Panneau>

      <Message error={err} ok={ok} />

      {existants.length > 0 && (
        <Panneau title="TP enregistrés en base">
          <ul className="space-y-1.5 text-[13px]">
            {existants.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 border-b border-line py-1.5 last:border-0">
                <span className="font-semibold">{t.title}</span>
                <span className="font-mono text-[11px] text-muted">{t.id}</span>
                <span
                  className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    t.published ? 'border-good/50 bg-good/10 text-good' : 'border-line bg-[var(--surface-2)] text-muted'
                  }`}
                >
                  {t.published ? 'publié' : 'brouillon'}
                </span>
                <span className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-muted">
                  {t.playable ? 'câblage interactif' : 'documentaire'}
                </span>
              </li>
            ))}
          </ul>
        </Panneau>
      )}

      <Link href="/prof/classes" className="inline-block text-[13px] font-semibold underline">
        ← Mes classes
      </Link>
    </main>
  );
}
