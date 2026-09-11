'use client';

/**
 * Catalogue des TP de l'établissement : tableau de gestion (origine, diplômes visés,
 * état, classes destinataires) avec modification, duplication, publication, archivage,
 * suppression, export et import de fichiers `.json`.
 */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyProfile } from '@/lib/db/profiles';
import { listMyClasses, listAssignments } from '@/lib/db/classes';
import {
  createTp, deleteTp, freeTpId, isBundledTp, listMyTps, rowToDefinition, setArchived, setPublished,
  studioMetaOf, type TpFamily, type TpRow, type TpStoredDefinition,
} from '@/lib/db/tps';
import { TPS } from '@/lib/data/tps';
import { DIPLOMAS, type DiplomaId, type Domain } from '@/lib/data/competences';
import { competencesOf } from '@/components/studio/store';
import type { ProfileRow } from '@/lib/db/types';
import { Message, PageTitle, Panneau, dateCourte } from '@/components/gestion/ui';

interface Ligne extends TpRow {
  /** Classes auxquelles le TP est attribué. */
  classes: string[];
}

const FAMILY_LABEL: Record<string, string> = {
  ind: 'industriel', hab: 'habitat', ter: 'tertiaire', pv: 'photovoltaïque',
};

const btn = 'min-h-touch rounded-[10px] border border-line bg-surface px-3 text-[12.5px] font-semibold hover:bg-[var(--surface-2)]';

function telecharger(nom: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CatalogueProfPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [rows, setRows] = useState<Ligne[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<TpRow | null>(null);
  const fichier = useRef<HTMLInputElement>(null);

  const charger = useCallback(async () => {
    const tps = await listMyTps();
    let parClasse: Record<string, string[]> = {};
    try {
      const classes = await listMyClasses();
      const listes = await Promise.all(classes.map((c) => listAssignments(c.id).catch(() => [])));
      parClasse = classes.reduce<Record<string, string[]>>((acc, c, i) => {
        for (const a of listes[i]) (acc[a.tp_id] = acc[a.tp_id] ?? []).push(c.name);
        return acc;
      }, {});
    } catch {
      /* pas de classe : la colonne reste vide */
    }
    setRows(tps.map((t) => ({ ...t, classes: parClasse[t.id] ?? [] })));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setProfile(p);
        if (p && (p.role === 'professeur' || p.role === 'admin')) await charger();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Chargement impossible.');
      } finally {
        setLoading(false);
      }
    })();
  }, [charger]);

  async function agir(action: () => Promise<void>, message: string) {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await action();
      await charger();
      setOk(message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  }

  /** Duplication d'un TP de la base (les TP fournis se dupliquent depuis le studio). */
  async function dupliquer(row: TpRow) {
    const def = rowToDefinition(row);
    if (!def) throw new Error('Ce TP n’a pas de définition exploitable : ouvre-le dans le studio.');
    const meta = studioMetaOf(row);
    const id = await freeTpId(`${row.id}-copie`);
    const definition: TpStoredDefinition = {
      ...def, id, title: `${def.title} (copie)`, playable: false,
      studio: { version: 1, domains: meta.domains, diplomas: meta.diplomas },
    };
    await createTp(id, {
      title: definition.title,
      level: def.level,
      family: def.family as TpFamily,
      scene: def.scene,
      summary: def.summary,
      competences: competencesOf(meta.domains),
      diplomas: meta.diplomas,
      definition,
      published: false,
      archived: false,
      playable: false,
    });
  }

  /** Import d'un fichier `.json` exporté par le studio, validé avant enregistrement. */
  async function importer(file: File) {
    const texte = await file.text();
    const brut = JSON.parse(texte) as Record<string, unknown>;
    const definitionBrute = (brut.definition ?? brut) as Record<string, unknown>;
    const titre = typeof definitionBrute.title === 'string' && definitionBrute.title.trim()
      ? definitionBrute.title.trim() : 'TP importé';
    const faux: TpRow = {
      id: 'import', title: titre, level: typeof definitionBrute.level === 'string' ? definitionBrute.level : null,
      competences: [], summary: typeof definitionBrute.summary === 'string' ? definitionBrute.summary : null,
      definition: definitionBrute, published: false, family: null, scene: null, playable: false,
      author: null, archived: false, diplomas: [],
    };
    const def = rowToDefinition(faux);
    if (!def) throw new Error('Ce fichier ne contient pas de TP exploitable (aucun appareil sur la platine).');
    const domains = (Array.isArray(brut.domains) ? brut.domains : []).filter((d): d is Domain => typeof d === 'string') as Domain[];
    const diplomas = (Array.isArray(brut.diplomas) ? brut.diplomas : [])
      .filter((d): d is DiplomaId => DIPLOMAS.some((x) => x.id === d));
    const id = await freeTpId(titre);
    const definition: TpStoredDefinition = { ...def, id, playable: false, studio: { version: 1, domains, diplomas } };
    await createTp(id, {
      title: def.title, level: def.level, family: def.family as TpFamily, scene: def.scene, summary: def.summary,
      competences: competencesOf(domains), diplomas, definition, published: false, archived: false, playable: false,
    });
  }

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8 text-[14px] text-muted">Chargement…</main>;

  if (!profile || (profile.role !== 'professeur' && profile.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageTitle>Mes TP</PageTitle>
        <Message error="Cet espace est réservé aux comptes professeur." />
      </main>
    );
  }

  const etat = (t: TpRow) => (t.archived ? 'archivé' : t.published ? 'publié' : 'brouillon');

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <PageTitle sub="Créer, modifier, publier et archiver les TP de l’établissement.">Mes TP</PageTitle>

      <div className="flex flex-wrap gap-2">
        <Link href="/prof/tp/nouveau" className="min-h-touch rounded-[10px] border border-accent bg-accent px-4 text-[13px] font-semibold leading-[40px] text-[var(--accent-ink)]">
          Créer un TP
        </Link>
        <button type="button" className={btn} onClick={() => fichier.current?.click()} disabled={busy}>
          Importer un fichier .json
        </button>
        <input
          ref={fichier}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="import-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void agir(() => importer(f), `TP « ${f.name} » importé en brouillon.`);
          }}
        />
      </div>

      <Message error={err} ok={ok} />

      <Panneau title="TP fournis avec l’application">
        <p className="mb-2 text-[12.5px] text-muted">
          Ces 14 TP ne sont pas modifiables. « Dupliquer » en crée une copie éditable qui t’appartient.
        </p>
        <ul className="space-y-1.5 text-[13px]">
          {TPS.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 border-b border-line py-1.5 last:border-0">
              <span className="font-semibold">{t.title}</span>
              <span className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-muted">fourni</span>
              <span className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-muted">
                {FAMILY_LABEL[t.family] ?? t.family}
              </span>
              <div className="ml-auto flex gap-2">
                <Link href={`/tp/${t.id}`} className={btn} style={{ lineHeight: '40px' }}>Ouvrir</Link>
                <Link href={`/prof/tp/nouveau?from=${t.id}`} className={btn} style={{ lineHeight: '40px' }} data-dup={t.id}>
                  Dupliquer
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Panneau>

      <Panneau title="TP de l’établissement">
        {rows.filter((r) => !isBundledTp(r.id)).length === 0 ? (
          <p className="text-[13px] text-muted">Aucun TP enregistré pour l’instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[.06em] text-muted">
                  <th className="py-2">Titre</th>
                  <th>Origine</th>
                  <th>Diplômes visés</th>
                  <th>État</th>
                  <th>Classes</th>
                  <th>Modifié</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody data-testid="mes-tps">
                {rows.filter((r) => !isBundledTp(r.id)).map((t) => (
                  <tr key={t.id} className="border-t border-line align-top" data-tp={t.id}>
                    <td className="py-2 pr-2">
                      <div className="font-semibold">{t.title}</div>
                      <div className="font-mono text-[11px] text-muted">{t.id}</div>
                    </td>
                    <td className="pr-2 text-muted">établissement</td>
                    <td className="pr-2">
                      {(t.diplomas ?? []).length === 0 ? <span className="text-muted">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {(t.diplomas ?? []).map((d) => (
                            <span key={d} className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[11px]">
                              {DIPLOMAS.find((x) => x.id === d)?.short ?? d}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="pr-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        t.archived ? 'border-line bg-[var(--surface-2)] text-muted'
                          : t.published ? 'border-good/50 bg-good/10 text-good'
                            : 'border-warn/50 bg-warn/10 text-warn'}`}
                      >
                        {etat(t)}
                      </span>
                      {t.playable && <span className="ml-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">jouable</span>}
                    </td>
                    <td className="pr-2 text-muted">{t.classes.length ? t.classes.join(', ') : '—'}</td>
                    <td className="pr-2 text-muted">{dateCourte(t.updated_at)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link href={`/prof/tp/${t.id}`} className={btn} style={{ lineHeight: '40px' }}>Modifier</Link>
                        <button type="button" className={btn} disabled={busy} onClick={() => void agir(() => dupliquer(t), 'Copie créée en brouillon.')}>
                          Dupliquer
                        </button>
                        <button
                          type="button"
                          className={btn}
                          disabled={busy}
                          onClick={() => void agir(() => setPublished(t.id, !t.published), t.published ? 'TP dépublié.' : 'TP publié.')}
                        >
                          {t.published ? 'Dépublier' : 'Publier'}
                        </button>
                        <button
                          type="button"
                          className={btn}
                          disabled={busy}
                          onClick={() => void agir(() => setArchived(t.id, !t.archived), t.archived ? 'TP restauré.' : 'TP archivé.')}
                        >
                          {t.archived ? 'Restaurer' : 'Archiver'}
                        </button>
                        <button
                          type="button"
                          className={btn}
                          onClick={() => telecharger(`${t.id}.json`, {
                            format: 'simulelec-tp', version: 1, id: t.id, definition: t.definition,
                            domains: studioMetaOf(t).domains, diplomas: studioMetaOf(t).diplomas,
                          })}
                        >
                          Exporter
                        </button>
                        <button type="button" className={`${btn} text-crit`} onClick={() => setASupprimer(t)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panneau>

      {aSupprimer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-title text-[20px] font-semibold uppercase">Supprimer ce TP ?</h2>
            <p className="mt-2 text-[13px]">
              « {aSupprimer.title} » sera retiré du catalogue. <b>Les tentatives des élèves sont conservées</b> :
              elles restent visibles dans le suivi, mais ne renverront plus vers l’énoncé.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className={btn} onClick={() => setASupprimer(null)}>Annuler</button>
              <button
                type="button"
                className="min-h-touch rounded-[10px] border border-crit bg-crit px-4 text-[13px] font-semibold text-white"
                onClick={() => {
                  const cible = aSupprimer;
                  setASupprimer(null);
                  void agir(() => deleteTp(cible.id), `TP « ${cible.title} » supprimé.`);
                }}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
