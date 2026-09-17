'use client';

/**
 * Export du bilan de compétences : fichier CSV (une ligne par compétence) et impression
 * propre (`@media print` : en-tête établissement, identité de l'élève, grille, sans
 * navigation). Utilisé par l'espace élève et par la fiche élève du professeur.
 */

import React from 'react';
import './bilan-print.css';
import type { CompetenceEval } from '@/lib/data/competences';
import { MASTERY_TEXT } from '@/lib/data/competences';

export interface BilanIdentite {
  eleve: string;
  etablissement?: string | null;
  classe?: string | null;
  diplome?: string | null;
}

/** Une ligne par compétence : code, libellé, niveau, score, TP concernés. */
export function bilanCsv(competences: CompetenceEval[], tpsParCode: Record<string, string[]> = {}): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lignes = [
    ['Code', 'Libellé', 'Niveau', 'Score (%)', 'TP concernés'].map(esc).join(';'),
    ...competences.map(c =>
      [
        c.code,
        c.label,
        MASTERY_TEXT[c.mastery],
        String(Math.round(c.score * 100)),
        (tpsParCode[c.code] ?? []).join(' · '),
      ].map(esc).join(';'),
    ),
  ];
  // BOM : Excel ouvre le fichier en UTF-8 sans abîmer les accents
  return `﻿${lignes.join('\r\n')}\r\n`;
}

function download(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  competences: CompetenceEval[];
  tpsParCode?: Record<string, string[]>;
  identite: BilanIdentite;
  /** Nom du fichier CSV, sans extension. */
  fichier?: string;
  className?: string;
}

export default function BilanExport({
  competences, tpsParCode = {}, identite, fichier = 'bilan-competences', className = '',
}: Props) {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const imprimer = React.useCallback(() => {
    document.body.classList.add('bilan-printing');
    const restore = () => {
      document.body.classList.remove('bilan-printing');
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }, []);

  return (
    <>
      <div className={`no-print flex flex-col gap-1.5 sm:flex-row ${className}`}>
        <button
          type="button"
          data-export-csv
          onClick={() => download(`${fichier}.csv`, bilanCsv(competences, tpsParCode))}
          className="min-h-touch flex-1 rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[12.5px] font-semibold"
        >
          Exporter le bilan (CSV)
        </button>
        <button
          type="button"
          data-export-print
          onClick={imprimer}
          className="min-h-touch flex-1 rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[12.5px] font-semibold"
        >
          Imprimer le bilan
        </button>
      </div>

      {/* en-tête visible uniquement à l'impression */}
      <div className="bilan-print-only mb-3">
        <div className="text-[11px] uppercase tracking-[.14em]">
          {identite.etablissement || 'Établissement'}
        </div>
        <h2 className="m-0 text-[20px] font-bold">Bilan de compétences</h2>
        <p className="m-0 text-[12px]">
          {identite.eleve}
          {identite.classe ? ` · ${identite.classe}` : ''}
          {identite.diplome ? ` · ${identite.diplome}` : ''} · édité le {date}
        </p>
      </div>
    </>
  );
}
