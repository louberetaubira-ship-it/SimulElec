import Link from 'next/link';
import type { Metadata } from 'next';
import { TPS_CATALOGUE } from '@/lib/data/tps';
import { spriteUrl } from '@/lib/data/catalogue';
import { FAMILY_LABEL, tpSprites } from '@/components/parcours/tpSprites';
import TpsProfesseur from './TpsProfesseur';
import { createClient } from '@/lib/supabase/server';
import { getTpImages } from '@/lib/db/tpImages';
import { sujetsParDossier } from '@/lib/data/sujets';
import { dureeLisible, resumeSujet } from '@/lib/sujet/declinaisons';
import type { SujetNumerique } from '@/lib/sujet/types';
import SujetsCatalogue, { type CarteSujet, type GroupeSujets } from './SujetsCatalogue';

export const metadata: Metadata = {
  title: 'Catalogue des TP · SimulElec',
  description: 'Quatorze travaux pratiques d\'électrotechnique simulés : du cahier des charges à la mise en service.',
};

const SCENE_LABEL: Record<string, string> = {
  ind: 'armoire industrielle',
  hab: 'tableau d\'habitation',
  ter: 'coffret tertiaire',
  pv: 'coffret photovoltaïque',
};

const FAMILIES: ('ind' | 'hab' | 'ter' | 'pv')[] = ['ind', 'hab', 'ter', 'pv'];

/** Résumé d'un sujet pour sa carte (les données complètes du sujet restent côté serveur). */
function carteSujet(s: SujetNumerique, dossier: string): CarteSujet {
  const r = resumeSujet(s);
  return {
    id: s.id,
    titre: s.titre,
    sousTitre: s.sousTitre,
    theme: s.parent ? s.themes?.[0] ?? null : null,
    dossier,
    questions: r.questions,
    premiere: r.premiere,
    derniere: r.derniere,
    points: r.points,
    duree: dureeLisible(s.dureeMin),
    dtr: r.dtrDe != null ? `DTR ${r.dtrDe}–${r.dtrA}` : `DTR ${r.dtrPages} p.`,
    competences: r.competences,
    parties: s.parties.length,
  };
}

const GROUPES_SUJETS: GroupeSujets[] = sujetsParDossier().map(({ base, derives }) => {
  const dossier = base.nomCourt ?? base.titre;
  return { id: base.id, titre: base.titre, cartes: [base, ...derives].map(s => carteSujet(s, dossier)) };
});

export default async function CataloguePage() {
  // Image de couverture posée par l'administrateur, s'il y en a une : elle
  // remplace le montage automatique des photos d'appareils.
  const images = await getTpImages(createClient());

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

      {/*
       * TP photovoltaïque autonome : désormais joué en NATIF comme les autres TP
       * (carte standard sous la famille « Photovoltaïque » ci-dessous, via TPS).
       * L'ancien parcours HTML reste accessible en cycle complet dédié.
       */}
      <Link
        href="/tp-solaire-autonome"
        className="mb-8 flex flex-col gap-4 rounded-2xl border border-accent/40 bg-gradient-to-br from-[var(--surface)] to-accent/5 p-4 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center"
      >
        <div className="grid h-16 w-16 flex-none place-items-center rounded-2xl bg-accent/15 text-[34px]">☀</div>
        <div className="min-w-0">
          <div className="font-title text-[11px] font-semibold uppercase tracking-[.12em] text-accent">
            Cycle complet · dimensionnement guidé
          </div>
          <div className="text-[18px] font-bold">Installation solaire autonome — étude PVGIS pas à pas</div>
          <p className="mt-0.5 text-[13px] text-muted">
            Localisation PVGIS → bilan → couplage série/parallèle → calepinage → choix du matériel.
            Le TP câblé et jouable est plus bas, dans « Photovoltaïque ».
          </p>
        </div>
        <span className="ml-auto hidden text-[13px] font-semibold text-accent sm:block">Ouvrir →</span>
      </Link>

      {/* Sujets d'examen numériques : copies conformes jouables (`/sujet/<id>`), sujet complet et sujets thématiques. */}
      {GROUPES_SUJETS.length > 0 && (
        <section className="mb-8" data-sujets>
          <h2 className="mb-1 font-title text-[13px] font-semibold uppercase tracking-[.1em] text-muted">
            Sujets d&apos;examen numériques
          </h2>
          <p className="mb-3 max-w-[70ch] text-[13px] text-muted">
            Le sujet complet en conditions d&apos;examen, ou une seule partie par thème : chaque sujet a son chrono, ses pages de DTR, sa copie et son bilan.
          </p>
          <SujetsCatalogue groupes={GROUPES_SUJETS} />
        </section>
      )}

      {FAMILIES.map(fam => {
        const list = TPS_CATALOGUE.filter(t => t.family === fam);
        if (!list.length) return null;
        return (
          <section key={fam} className="mb-8">
            <h2 className="mb-3 font-title text-[13px] font-semibold uppercase tracking-[.1em] text-muted">
              {FAMILY_LABEL[fam]}
            </h2>
            <div className="flex flex-col gap-3">
              {list.map(tp => (
                <Link
                  key={tp.id}
                  href={`/tp/${tp.id}`}
                  data-tp={tp.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-stretch"
                >
                  {/* Gauche : image de présentation + titre */}
                  <div className="sm:w-[280px] sm:flex-none">
                    <div className="flex h-[150px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--surface-2)]">
                      {images[tp.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={images[tp.id]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        tpSprites(tp.id).map((k, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={`${k}-${i}`} src={spriteUrl(k)} alt="" className="max-h-[110px] max-w-[130px] object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />
                        ))
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
                      <h3 className="text-[19px] font-bold leading-tight">{tp.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tp.playable ? 'bg-good/20 text-good' : 'bg-[var(--surface-2)] text-muted'}`}>
                        {tp.playable ? 'jouable' : 'prévu'}
                      </span>
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

                  {/* Droite : description + compétences */}
                  <div className="flex-1 sm:border-l sm:border-[var(--line)] sm:pl-4">
                    <p className="m-0 text-[13.5px] leading-relaxed text-muted">{tp.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">{tp.level}</span>
                      <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">{SCENE_LABEL[tp.scene]}</span>
                      {tp.competences.map(c => (
                        <span key={c} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">{c}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <TpsProfesseur />
    </div>
  );
}
