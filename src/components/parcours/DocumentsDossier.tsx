'use client';
/* eslint-disable @next/next/no-img-element -- documents du dossier servis tels quels depuis public/tp */

/**
 * Visualiseur des DOCUMENTS RÉELS du dossier (DTR, folio, fiches constructeur), à
 * onglets. Sert la préparation — où l'onglet suit la question en cours : l'élève lit
 * la valeur sur le vrai tableau CALSOL, pas dans l'énoncé — et l'énoncé.
 *
 * Un document est une image extraite du sujet, ou un tableau à compléter.
 */
import React from 'react';
import type { PrepDocument } from '@/lib/types';

export interface DocumentsDossierProps {
  docs: PrepDocument[];
  /** Document imposé par la question en cours (son onglet s'ouvre). */
  actif?: string | null;
  /** Hauteur maximale de l'image, en CSS (« 60vh »). */
  maxH?: string;
}

function Tableau({ t }: { t: NonNullable<PrepDocument['tableau']> }) {
  return (
    <div className="overflow-auto rounded-lg border border-[var(--line)] bg-white">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {t.entetes.map(h => (
              <th key={h} className="border-b border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-left text-[10.5px] uppercase tracking-wide text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.lignes.map((l, i) => (
            <tr key={`${i}-${l[0]}`} className={i === t.lignes.length - 1 ? 'font-bold' : ''}>
              {l.map((c, j) => (
                <td key={`${i}-${j}`} className={`border-b border-[var(--line)] px-2 py-1 ${c.includes('?') ? 'bg-accent/15 font-bold text-accent' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocumentsDossier({ docs, actif, maxH = '58vh' }: DocumentsDossierProps) {
  const [choisi, setChoisi] = React.useState<string | null>(null);
  const [agrandi, setAgrandi] = React.useState(false);
  // l'onglet suit la question en cours ; un clic de l'élève reprend la main jusqu'à la suivante
  React.useEffect(() => { if (actif) setChoisi(actif); }, [actif]);
  const doc = docs.find(d => d.id === choisi) ?? docs[0];
  if (!doc) return null;

  const corps = doc.src
    ? (
      <button type="button" onClick={() => setAgrandi(true)} className="block w-full cursor-zoom-in" aria-label={`Agrandir ${doc.titre}`}>
        <img
          src={doc.src} alt={`${doc.titre} · ${doc.legende}`} data-doc={doc.id}
          className="mx-auto block max-w-full rounded-lg border border-[var(--line)] bg-white object-contain"
          style={{ maxHeight: maxH }}
        />
      </button>
    )
    : doc.tableau ? <Tableau t={doc.tableau} /> : null;

  return (
    <div className="flex min-h-0 flex-col gap-2" data-documents>
      <div className="flex flex-wrap gap-1" role="tablist">
        {docs.map(d => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.id === doc.id}
            data-doc-tab={d.id}
            onClick={() => setChoisi(d.id)}
            className={`min-h-touch rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${
              d.id === doc.id ? 'border-[#1B222C] bg-[#1B222C] text-white' : 'border-[var(--line)] bg-[var(--surface-2)]'
            }`}
          >
            {d.titre}
          </button>
        ))}
      </div>
      {corps}
      <p className="m-0 text-[11.5px] text-muted">{doc.legende}{doc.src ? ' · clique pour agrandir' : ''}</p>
      {agrandi && doc.src && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3"
          onClick={() => setAgrandi(false)}
          role="dialog"
          aria-label={doc.titre}
        >
          <img src={doc.src} alt={doc.legende} className="max-h-full max-w-full rounded-lg bg-white" />
        </div>
      )}
    </div>
  );
}
