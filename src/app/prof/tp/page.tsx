'use client';

/**
 * Catalogue des TP de l'établissement : tableau de gestion (origine, diplômes visés,
 * état, classes destinataires) avec modification, duplication, publication, archivage,
 * suppression, export et import de fichiers `.json`.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMyProfile } from '@/lib/db/profiles';
import { listMyClasses, listAssignments } from '@/lib/db/classes';
import {
  classementOfRow, createTp, deleteTp, docDefinitionOf, freeTpId, isBundledTp, listMyTps, rowToDefinition, setArchived,
  setPublished, studioMetaOf, type TpFamily, type TpRow, type TpStoredDefinition,
} from '@/lib/db/tps';
import { listMyGenerations, myQuota, type GenerationRow, type Quota } from '@/lib/db/generations';
import { TPS_CATALOGUE } from '@/lib/data/tps';
import { DIPLOMAS, type DiplomaId, type Domain } from '@/lib/data/competences';
import { competencesOf } from '@/components/studio/store';
import { DOMAINES, labelSousDomaine, normaliserClassement, type Classement, type DomainePro } from '@/lib/taxonomy/domaines';
import { classementDe } from '@/lib/taxonomy/classement';
import type { ProfileRow } from '@/lib/db/types';
import { Message, PageTitle, Panneau, dateCourte } from '@/components/gestion/ui';
import DomaineChips from '@/components/catalogue/DomaineChips';
import DomaineBadge from '@/components/catalogue/DomaineBadge';

interface Ligne extends TpRow {
  /** Classes auxquelles le TP est attribué. */
  classes: string[];
}

const FAMILY_LABEL: Record<string, string> = {
  ind: 'industriel', hab: 'habitat', ter: 'tertiaire', pv: 'photovoltaïque',
};

const btn = 'min-h-touch rounded-[10px] border border-line bg-surface px-3 text-[12.5px] font-semibold hover:bg-[var(--surface-2)]';

/** « 12/09 » — date de validation affichée dans le badge d'un TP généré. */
function jourMois(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Durée lisible d'une génération. */
function dureeLisible(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

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
  const [generations, setGenerations] = useState<GenerationRow[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  /** Filtre du tableau par domaine professionnel (`null` = tous). */
  const [filtreDomaine, setFiltreDomaine] = useState<DomainePro | null>(null);
  /** Ordre du tableau : dernières modifications d'abord, ou par domaine. */
  const [tri, setTri] = useState<'recent' | 'domaine'>('recent');

  // TP de l'établissement (hors TP fournis), chacun avec son classement résolu une fois.
  const etablissement = useMemo(
    () => rows.filter((r) => !isBundledTp(r.id)).map((r) => ({ row: r, classement: classementOfRow(r) })),
    [rows],
  );
  const comptesDomaines = useMemo(() => {
    const c: Partial<Record<DomainePro, number>> = {};
    for (const { classement } of etablissement) {
      if (classement.domaine) c[classement.domaine] = (c[classement.domaine] ?? 0) + 1;
    }
    return c;
  }, [etablissement]);
  const lignesVisibles = useMemo(() => {
    const rang = (c: Classement) => (c.domaine ? DOMAINES.findIndex((d) => d.code === c.domaine) : DOMAINES.length);
    const liste = etablissement.filter(({ classement }) => !filtreDomaine || classement.domaine === filtreDomaine);
    if (tri === 'domaine') {
      // Tri stable : domaine (ordre de DOMAINES), puis sous-domaine, puis titre.
      liste.sort((a, b) => rang(a.classement) - rang(b.classement)
        || labelSousDomaine(a.classement.sousDomaine).localeCompare(labelSousDomaine(b.classement.sousDomaine), 'fr')
        || a.row.title.localeCompare(b.row.title, 'fr'));
    }
    return liste;
  }, [etablissement, filtreDomaine, tri]);

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
    try {
      const [journal, q] = await Promise.all([listMyGenerations(), myQuota()]);
      setGenerations(journal);
      setQuota(q);
    } catch {
      /* journal des générations indisponible : le catalogue reste utilisable */
    }
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
      classement: classementOfRow(row),
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
      domaine: null, domaines_sec: [], sous_domaine: null, activites: [], mots_cles: [],
    };
    const def = rowToDefinition(faux);
    if (!def) throw new Error('Ce fichier ne contient pas de TP exploitable (aucun appareil sur la platine).');
    const domains = (Array.isArray(brut.domains) ? brut.domains : []).filter((d): d is Domain => typeof d === 'string') as Domain[];
    const diplomas = (Array.isArray(brut.diplomas) ? brut.diplomas : [])
      .filter((d): d is DiplomaId => DIPLOMAS.some((x) => x.id === d));
    // Classement : celui du fichier (racine, sinon définition), complété par la famille
    // et les activités déduites quand le fichier est antérieur à la taxonomie des domaines.
    const lu = normaliserClassement(brut.classement ?? definitionBrute.classement);
    const classement = classementDe({ ...def, classement: lu });
    const id = await freeTpId(titre);
    const definition: TpStoredDefinition = {
      ...def, id, playable: false, classement, studio: { version: 1, domains, diplomas },
    };
    await createTp(id, {
      title: def.title, level: def.level, family: def.family as TpFamily, scene: def.scene, summary: def.summary,
      competences: competencesOf(domains), diplomas, definition, published: false, archived: false, playable: false,
      classement,
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
        <Link
          href="/prof/tp/nouveau?generer=1"
          data-testid="lien-generer"
          className="min-h-touch rounded-[10px] border border-line bg-surface px-4 text-[13px] font-semibold leading-[40px] hover:bg-[var(--surface-2)]"
        >
          ✦ Générer un TP
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
          {TPS_CATALOGUE.map((t) => (
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
        {/* Filtre par domaine : tous les domaines, les vides en pointillé avec un lien de création. */}
        <div className="mb-3 space-y-2">
          <DomaineChips
            counts={comptesDomaines}
            value={filtreDomaine}
            onChange={setFiltreDomaine}
            montrerVides
            lienVide={(code) => `/prof/tp/nouveau?domaine=${code}`}
            total={etablissement.length}
          />
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
            <span>Trier par</span>
            {([['recent', 'dernière modification'], ['domaine', 'domaine']] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={tri === k}
                data-tri={k}
                onClick={() => setTri(k)}
                className={`min-h-touch rounded-full border px-3 font-semibold ${tri === k
                  ? 'border-[var(--text)] text-[var(--text)]' : 'border-line bg-surface hover:bg-[var(--surface-2)]'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {etablissement.length === 0 ? (
          <p className="text-[13px] text-muted">Aucun TP enregistré pour l’instant.</p>
        ) : lignesVisibles.length === 0 ? (
          <p className="text-[13px] text-muted">Aucun TP dans ce domaine.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[.06em] text-muted">
                  <th className="py-2">Titre</th>
                  <th>
                    <button
                      type="button"
                      onClick={() => setTri(tri === 'domaine' ? 'recent' : 'domaine')}
                      className="uppercase tracking-[.06em] hover:text-[var(--text)]"
                      title="Trier par domaine"
                    >
                      Domaine{tri === 'domaine' ? ' ↓' : ''}
                    </button>
                  </th>
                  <th>Origine</th>
                  <th>Diplômes visés</th>
                  <th>État</th>
                  <th>Classes</th>
                  <th>Modifié</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody data-testid="mes-tps">
                {lignesVisibles.map(({ row: t, classement }) => (
                  <tr key={t.id} className="border-t border-line align-top" data-tp={t.id}>
                    <td className="py-2 pr-2">
                      <div className="font-semibold">{t.title}</div>
                      <div className="font-mono text-[11px] text-muted">{t.id}</div>
                    </td>
                    <td className="py-2 pr-2" data-domaine={classement.domaine ?? ''}>
                      {classement.domaine ? (
                        <>
                          <DomaineBadge code={classement.domaine} />
                          {classement.sousDomaine && (
                            <div className="mt-1 max-w-[180px] text-[11.5px] leading-snug text-muted">
                              {labelSousDomaine(classement.sousDomaine)}
                            </div>
                          )}
                        </>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="pr-2 text-muted">
                      {t.generated ? (
                        <span
                          data-testid={`origine-${t.id}`}
                          className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            t.validated_at ? 'border-good/50 bg-good/10 text-good' : 'border-warn/50 bg-warn/10 text-warn'}`}
                        >
                          {t.validated_at ? `TP généré · validé le ${jourMois(t.validated_at)}` : 'TP généré · à valider'}
                        </span>
                      ) : 'établissement'}
                    </td>
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
                          onClick={() => void agir(async () => {
                            // Publier exige un domaine professionnel choisi (voir le studio).
                            if (!t.published && !t.domaine && !docDefinitionOf(t)) {
                              throw new Error('Choisissez le domaine professionnel du TP (Modifier › Réglages › Classement) avant de le publier.');
                            }
                            await setPublished(t.id, !t.published);
                          }, t.published ? 'TP dépublié.' : 'TP publié.')}
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
                            classement: classementOfRow(t),
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

      <Panneau
        title="Mes générations"
        aside={quota && (
          <span className="rounded-full border border-line bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-muted">
            {quota.utilisees} / {quota.plafond} ce mois-ci
          </span>
        )}
      >
        {generations.length === 0 ? (
          <p className="text-[13px] text-muted">
            Aucune génération pour l’instant. « ✦ Générer un TP » rédige un brouillon complet à
            partir de votre brief : vous le relisez, le validez, puis vous le publiez.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[.06em] text-muted">
                  <th className="py-2">Thème</th>
                  <th>Date</th>
                  <th>Durée</th>
                  <th>Coût estimé</th>
                  <th>État</th>
                  <th className="text-right">TP produit</th>
                </tr>
              </thead>
              <tbody data-testid="mes-generations">
                {generations.map((g) => (
                  <tr key={g.id} className="border-t border-line align-top">
                    <td className="py-2 pr-2 font-semibold">{g.theme || '—'}</td>
                    <td className="pr-2 text-muted">{dateCourte(g.created_at)}</td>
                    <td className="pr-2 text-muted">{dureeLisible(g.duree_ms)}</td>
                    <td className="pr-2 font-mono text-muted">
                      {Number(g.cout_estime).toFixed(2).replace('.', ',')} €
                    </td>
                    <td className="pr-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        g.statut === 'ok' ? 'border-good/50 bg-good/10 text-good'
                          : g.statut === 'anomalies' ? 'border-warn/50 bg-warn/10 text-warn'
                            : 'border-crit/50 bg-crit/10 text-crit'}`}
                      >
                        {g.statut}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {g.tp_id
                        ? <Link href={`/prof/tp/${g.tp_id}`} className="font-semibold underline">{g.tp_id}</Link>
                        : <span className="text-muted">—</span>}
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
