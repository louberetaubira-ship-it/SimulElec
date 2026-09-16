'use client';

/**
 * Hub des ressources pédagogiques : cinq catalogues formant la chaîne
 * d'apprentissage (Cours → TD → TP → Fiche → Évaluation), adossés aux 3 TP.
 * Les TD et Évaluations interactifs arrivent dans un second temps : leurs cartes
 * sont visibles mais marquées « bientôt ».
 */
import { useState } from 'react';
import Link from 'next/link';
import { CATALOGUES, fichesParType, TP_RESSOURCES, type ResType } from '@/lib/data/ressources';

type Onglet = 'tp' | ResType;

const ONGLETS: { key: Onglet; label: string; couleur: string; verbe: string; desc: string }[] = [
  { key: 'tp', label: 'TP existants', couleur: '#0B7DD6', verbe: 'Je réalise', desc: 'Les 3 TP jouables dans le simulateur : câblage, mise en service, suivi de compétences en direct.' },
  ...CATALOGUES.map((c) => ({ key: c.type as Onglet, label: c.label, couleur: c.couleur, verbe: c.verbe, desc: c.desc })),
];

/** Tous les catalogues sont actifs. */
const ACTIF: Record<Onglet, boolean> = { tp: true, cours: true, fiche: true, td: true, eval: true };

function hrefPour(type: Onglet, tpId: string): string {
  if (type === 'tp') return `/tp/${tpId}`;
  return `/${type}/${tpId}`;
}

export default function RessourcesHub() {
  const [onglet, setOnglet] = useState<Onglet>('tp');
  const meta = ONGLETS.find((o) => o.key === onglet)!;
  const actif = ACTIF[onglet];

  // Titre de chaque carte : pour TP on garde le nom court ; sinon le titre de la fiche.
  const fiches = onglet === 'tp' ? [] : fichesParType(onglet as ResType);

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-8">
      <header className="mb-6">
        <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
          Bac Pro MELEC · BTS Électrotechnique
        </div>
        <h1 className="text-[36px] font-bold leading-tight">Ressources</h1>
        <p className="mt-1 max-w-[70ch] text-[15px] text-muted">
          Une chaîne d&apos;apprentissage complète autour de chaque TP :
          {' '}<b className="text-[#141A21]">comprendre</b> → <b className="text-[#141A21]">s&apos;entraîner</b> →
          {' '}<b className="text-[#141A21]">réaliser</b> → <b className="text-[#141A21]">retenir</b> →
          {' '}<b className="text-[#141A21]">certifier</b>.
        </p>
      </header>

      {/* fil pédagogique */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {ONGLETS.map((o, i) => (
          <span key={o.key} className="flex items-center gap-1.5">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: o.couleur }}>
              {o.label}
            </span>
            {i < ONGLETS.length - 1 && <span className="text-muted">→</span>}
          </span>
        ))}
      </div>

      {/* onglets */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ONGLETS.map((o) => {
          const on = o.key === onglet;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setOnglet(o.key)}
              className={`flex items-center gap-2 rounded-[10px] border px-3.5 py-2 text-[13px] font-semibold transition ${
                on ? 'border-2 text-[#141A21]' : 'border-line text-muted hover:bg-[var(--surface-2)]'
              }`}
              style={on ? { borderColor: o.couleur } : undefined}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.couleur }} />
              {o.label}
            </button>
          );
        })}
      </div>

      <p className="mb-5 rounded-[10px] border-l-[3px] bg-[var(--surface-2)] px-4 py-3 text-[13.5px] text-muted"
         style={{ borderColor: meta.couleur }}>
        <b className="text-[#141A21]">{meta.verbe}.</b> {meta.desc}
        {!actif && <span className="ml-1 font-semibold text-warn">— disponible très bientôt.</span>}
      </p>

      {/* cartes */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TP_RESSOURCES.map((t) => {
          const titre = onglet === 'tp' ? t.nom : (fiches.find((f) => f.tpId === t.tpId)?.titre ?? t.nom);
          const href = hrefPour(onglet, t.tpId);
          const carte = (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[.05em]" style={{ color: meta.couleur }}>
                {t.angle}
              </div>
              <div className="mt-1 font-title text-[16px] font-semibold leading-snug text-[#141A21]">{titre}</div>
              <div className="mt-2 text-[12px] text-muted">{t.nom}</div>
              {!actif && (
                <span className="mt-3 inline-block rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-semibold text-warn">
                  bientôt
                </span>
              )}
            </>
          );
          return actif ? (
            <Link key={t.tpId} href={href}
              className="rounded-2xl border border-line bg-[var(--surface)] p-4 transition-transform hover:-translate-y-0.5">
              {carte}
            </Link>
          ) : (
            <div key={t.tpId} className="cursor-default rounded-2xl border border-line bg-[var(--surface)] p-4 opacity-80">
              {carte}
            </div>
          );
        })}
      </div>
    </div>
  );
}
