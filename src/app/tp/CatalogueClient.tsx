'use client';

/**
 * Catalogue des TP — partie client.
 *
 * Une seule liste : les TP fournis (préparés par le shell serveur) + les TP publiés
 * par les professeurs (`listTeacherTps`, badge « TP du professeur »). On y filtre par
 * domaine professionnel (puces), par sous-domaine quand un domaine est choisi, et par
 * recherche libre (titre, mots-clés, sous-domaine). Les cartes sont groupées par domaine,
 * dans l'ordre de `DOMAINES`. Côté élève, un domaine sans TP n'apparaît pas.
 *
 * Le domaine choisi est mémorisé dans `localStorage` ; la page s'affiche normalement si
 * le stockage est indisponible (navigation privée, données bloquées).
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { spriteUrl } from '@/lib/data/catalogue';
import { tpSprites } from '@/components/parcours/tpSprites';
import { classementOfRow, listTeacherTps, type TpRow } from '@/lib/db/tps';
import {
  DOMAINES, DOMAINE_BY_CODE, isDomainePro, labelSousDomaine, sousDomainesDe,
  type Classement, type DomainePro,
} from '@/lib/taxonomy/domaines';
import DomaineChips from '@/components/catalogue/DomaineChips';
import DomaineBadge from '@/components/catalogue/DomaineBadge';

/** Ce qu'une carte du catalogue affiche (données sérialisables, serveur → client). */
export interface CarteTp {
  id: string;
  title: string;
  summary: string | null;
  level: string | null;
  competences: string[];
  /** Scène (TP fourni) ou famille (TP du professeur), en clair. */
  contexte: string | null;
  kind: string | null;
  playable: boolean;
  /** TP rédigé par un professeur (et non fourni avec l'application). */
  prof: boolean;
  generated: boolean;
  validatedAt: string | null;
  /** Adresses des vignettes d'appareils (montage par défaut). */
  sprites: string[];
  classement: Classement;
}

interface Props {
  fournis: CarteTp[];
  /** Images de couverture posées par l'administrateur, par identifiant de TP. */
  images: Record<string, string>;
}

const CLE_FILTRE = 'simulelec.catalogue.domaine';

const FAMILY_SHORT: Record<string, string> = {
  ind: 'industriel',
  hab: 'habitat',
  ter: 'tertiaire',
  pv: 'photovoltaïque',
};

/** « 12/09 » — date de validation d'un TP généré. */
function jourMois(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Texte comparable : minuscules, sans accents. */
function plier(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Carte d'un TP publié par un professeur. */
function carteDeRow(row: TpRow): CarteTp {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    level: row.level,
    competences: row.competences ?? [],
    contexte: row.family ? (FAMILY_SHORT[row.family] ?? row.family) : null,
    kind: null,
    playable: row.playable,
    prof: true,
    generated: Boolean(row.generated),
    validatedAt: row.validated_at ?? null,
    sprites: tpSprites(row.id).map((k) => spriteUrl(k)),
    classement: classementOfRow(row),
  };
}

function lireFiltre(): DomainePro | null {
  try {
    const v = window.localStorage.getItem(CLE_FILTRE);
    return isDomainePro(v) ? v : null;
  } catch {
    return null;
  }
}

function ecrireFiltre(v: DomainePro | null) {
  try {
    if (v) window.localStorage.setItem(CLE_FILTRE, v);
    else window.localStorage.removeItem(CLE_FILTRE);
  } catch {
    /* stockage indisponible : le filtre n'est simplement pas mémorisé */
  }
}

export default function CatalogueClient({ fournis, images }: Props) {
  const [duProf, setDuProf] = useState<CarteTp[]>([]);
  const [domaine, setDomaine] = useState<DomainePro | null>(null);
  const [sous, setSous] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');

  // Filtre mémorisé : relu après le montage (pas pendant le rendu serveur).
  useEffect(() => {
    setDomaine(lireFiltre());
  }, []);

  // TP publiés par les professeurs ; hors-ligne ou non connecté, seuls les TP fournis restent.
  useEffect(() => {
    let alive = true;
    listTeacherTps()
      .then((rows) => {
        if (alive) setDuProf(rows.map(carteDeRow));
      })
      .catch(() => {
        if (alive) setDuProf([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const tous = useMemo(() => [...fournis, ...duProf], [fournis, duProf]);

  // Compteurs par domaine principal (sur la liste entière, avant recherche).
  const counts = useMemo(() => {
    const c: Partial<Record<DomainePro, number>> = {};
    for (const t of tous) {
      const d = t.classement.domaine;
      if (d) c[d] = (c[d] ?? 0) + 1;
    }
    return c;
  }, [tous]);

  // Un domaine mémorisé qui n'a (plus) aucun TP ne doit pas vider la page.
  const domaineActif: DomainePro | null = domaine && (counts[domaine] ?? 0) > 0 ? domaine : null;

  function choisirDomaine(code: DomainePro | null) {
    setDomaine(code);
    setSous(null);
    ecrireFiltre(code);
  }

  // Sous-domaines présents dans le domaine choisi, avec leur compteur.
  const sousPresents = useMemo(() => {
    if (!domaineActif) return [];
    return sousDomainesDe(domaineActif)
      .map((s) => ({
        ...s,
        n: tous.filter((t) => t.classement.domaine === domaineActif && t.classement.sousDomaine === s.id).length,
      }))
      .filter((s) => s.n > 0);
  }, [domaineActif, tous]);
  const sousActif = sous && sousPresents.some((s) => s.id === sous) ? sous : null;

  const q = plier(recherche.trim());
  const visibles = tous.filter((t) => {
    if (domaineActif && t.classement.domaine !== domaineActif) return false;
    if (sousActif && t.classement.sousDomaine !== sousActif) return false;
    if (!q) return true;
    const texte = plier([t.title, labelSousDomaine(t.classement.sousDomaine), ...t.classement.motsCles].join(' '));
    return texte.includes(q);
  });

  // Sections dans l'ordre de DOMAINES ; un TP sans domaine (cas limite) va en fin de liste.
  const sections = DOMAINES
    .map((d) => ({ code: d.code as DomainePro | null, list: visibles.filter((t) => t.classement.domaine === d.code) }))
    .concat([{ code: null, list: visibles.filter((t) => !t.classement.domaine) }])
    .filter((s) => s.list.length > 0);

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8">
      <header className="mb-6">
        <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
          Bac Pro MELEC · BTS Électrotechnique
        </div>
        <h1 className="text-[40px] font-bold">Catalogue des TP</h1>
        <p className="mt-1 max-w-[66ch] text-[15px] text-muted">
          Choisis un TP : tu liras l&apos;énoncé, choisiras le matériel, poseras les appareils, câbleras
          borne à borne, puis tu passeras aux EPI, à la consignation, aux mesures hors tension, à la
          déconsignation et aux mesures sous tension avant de valider.
        </p>
      </header>

      {/* Filtres : domaine, sous-domaine, recherche */}
      <div className="mb-6 flex flex-col gap-3">
        <DomaineChips counts={counts} value={domaineActif} onChange={choisirDomaine} total={tous.length} />

        {domaineActif && sousPresents.length > 0 && (
          <div role="group" aria-label="Filtrer par sous-domaine" data-testid="sous-domaine-chips" className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={sousActif === null}
              onClick={() => setSous(null)}
              className={`min-h-touch rounded-full border px-3 text-[12.5px] font-semibold ${sousActif === null
                ? 'text-[var(--text)]' : 'border-[var(--line)] bg-[var(--surface)] text-muted hover:bg-[var(--surface-2)]'}`}
              style={sousActif === null ? { borderColor: DOMAINE_BY_CODE[domaineActif].couleur } : undefined}
            >
              Tous les sous-domaines
            </button>
            {sousPresents.map((s) => {
              const actif = sousActif === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={actif}
                  data-sous={s.id}
                  onClick={() => setSous(actif ? null : s.id)}
                  className={`inline-flex min-h-touch items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold ${actif
                    ? 'text-[var(--text)]' : 'border-[var(--line)] bg-[var(--surface)] text-muted hover:bg-[var(--surface-2)]'}`}
                  style={actif ? { borderColor: DOMAINE_BY_CODE[domaineActif].couleur, background: `${DOMAINE_BY_CODE[domaineActif].couleur}14` } : undefined}
                >
                  {s.label}
                  <span className="font-mono text-[11px] tabular-nums text-muted">{s.n}</span>
                </button>
              );
            })}
          </div>
        )}

        <label className="block max-w-[420px]">
          <span className="sr-only">Rechercher un TP</span>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher : titre, mot-clé, sous-domaine…"
            data-testid="catalogue-recherche"
            className="min-h-touch w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[14px] outline-none focus:border-accent"
          />
        </label>
      </div>

      {sections.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-[14px] text-muted">
          Aucun TP ne correspond à ta recherche.
        </p>
      )}

      {sections.map(({ code, list }) => {
        const def = code ? DOMAINE_BY_CODE[code] : null;
        return (
          <section key={code ?? 'sans-domaine'} className="mb-8" data-section-domaine={code ?? ''}>
            <h2 className="mb-3 flex flex-wrap items-center gap-2 font-title text-[13px] font-semibold uppercase tracking-[.1em] text-muted">
              {code && <DomaineBadge code={code} taille="md" />}
              <span>{def ? def.label : 'Autres TP'}</span>
              <span className="font-mono text-[11.5px] normal-case tabular-nums">· {list.length}</span>
            </h2>

            {/*
             * Cycle complet photovoltaïque : l'ancien parcours HTML de dimensionnement guidé,
             * rangé avec les TP d'énergies renouvelables.
             */}
            {code === 'ENR' && (
              <Link
                href="/tp-solaire-autonome"
                className="mb-3 flex flex-col gap-4 rounded-2xl border border-accent/40 bg-gradient-to-br from-[var(--surface)] to-accent/5 p-4 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center"
              >
                <div className="grid h-16 w-16 flex-none place-items-center rounded-2xl bg-accent/15 text-[34px]">☀</div>
                <div className="min-w-0">
                  <div className="font-title text-[11px] font-semibold uppercase tracking-[.12em] text-accent">
                    Cycle complet · dimensionnement guidé
                  </div>
                  <div className="text-[18px] font-bold">Installation solaire autonome — étude PVGIS pas à pas</div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Localisation PVGIS → bilan → couplage série/parallèle → calepinage → choix du matériel.
                    Le TP câblé et jouable est juste en dessous.
                  </p>
                </div>
                <span className="ml-auto hidden text-[13px] font-semibold text-accent sm:block">Ouvrir →</span>
              </Link>
            )}

            <div className="flex flex-col gap-3">
              {list.map((tp) => <Carte key={tp.id} tp={tp} image={images[tp.id]} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Carte d'un TP : visuel, titre et badges à gauche ; description et classement à droite. */
function Carte({ tp, image }: { tp: CarteTp; image: string | undefined }) {
  const c = tp.classement;
  const couleur = c.domaine ? DOMAINE_BY_CODE[c.domaine].couleur : 'var(--line)';
  const sousLabel = labelSousDomaine(c.sousDomaine);
  return (
    <Link
      href={`/tp/${tp.id}`}
      data-tp={tp.id}
      data-domaine={c.domaine ?? ''}
      className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-stretch"
      style={{ borderTopColor: couleur, borderTopWidth: 4 }}
    >
      {/* Gauche : image de présentation + titre */}
      <div className="sm:w-[280px] sm:flex-none">
        <div className="flex h-[150px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--surface-2)]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            tp.sprites.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${src}-${i}`} src={src} alt="" className="max-h-[110px] max-w-[130px] object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />
            ))
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
          <h3 className="text-[19px] font-bold leading-tight">{tp.title}</h3>
          {tp.prof && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
              TP du professeur
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tp.playable ? 'bg-good/20 text-good' : 'bg-[var(--surface-2)] text-muted'}`}>
            {tp.playable ? 'jouable' : tp.prof ? 'lecture' : 'prévu'}
          </span>
          {tp.generated && tp.validatedAt && (
            <span data-testid={`genere-${tp.id}`} className="rounded-full bg-good/20 px-2 py-0.5 text-[10px] font-semibold text-good">
              TP généré · validé le {jourMois(tp.validatedAt)}
            </span>
          )}
          {tp.kind === 'dimensionnement' && (
            <span data-kind="dimensionnement" className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
              dimensionnement
            </span>
          )}
          {tp.kind === 'miseEnService' && (
            <span data-kind="miseEnService" className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
              mise en service
            </span>
          )}
          {tp.kind === 'reseau' && (
            <span data-kind="reseau" className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
              courant faible
            </span>
          )}
        </div>
      </div>

      {/* Droite : classement, description, compétences */}
      <div className="flex-1 sm:border-l sm:border-[var(--line)] sm:pl-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {c.domaine && <DomaineBadge code={c.domaine} avecLibelle />}
          {c.domainesSecondaires.map((s) => <DomaineBadge key={s} code={s} prefixe="+" />)}
          {sousLabel && <span className="text-[12px] font-semibold text-[var(--text)]">{sousLabel}</span>}
        </div>
        {tp.summary && <p className="m-0 text-[13.5px] leading-relaxed text-muted">{tp.summary}</p>}
        {c.motsCles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" data-testid={`mots-cles-${tp.id}`}>
            {c.motsCles.slice(0, 4).map((m) => (
              <span key={m} className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10.5px] text-muted">
                #{m}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tp.level && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">{tp.level}</span>}
          {tp.contexte && <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">{tp.contexte}</span>}
          {tp.competences.map((comp) => (
            <span key={comp} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">{comp}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
