'use client';

/**
 * Barres horizontales de couverture par domaine professionnel (lot E — suivi).
 *
 * Composant générique : la page fournit les lignes déjà calculées (un TP travaillé,
 * une part d'élèves…) ; ici on ne fait que dessiner — couleur du domaine, code en
 * chasse fixe, libellé court et compteur.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import type { AttemptRow } from '@/lib/db/types';
import type { TpRow } from '@/lib/db/tps';
import {
  couvertureDomaines, domainesADecouvrir, resolveurClassement, tpsPubliesParDomaine,
} from '@/lib/prof/couverture';
import { CODES_DOMAINES, DOMAINE_BY_CODE, type DomainePro } from '@/lib/taxonomy/domaines';

export interface LigneCouverture {
  code: DomainePro;
  /** Valeur de la barre (nombre de TP, d'élèves…). */
  valeur: number;
  /** Valeur d'une barre pleine ; 0 = barre vide. */
  max: number;
  /** Compteur affiché à droite ; `valeur/max` par défaut. */
  detail?: string;
}

export default function CouvertureDomaines({
  lignes,
  titre,
  vide = 'Aucun domaine travaillé pour le moment.',
}: {
  lignes: LigneCouverture[];
  titre?: string;
  vide?: string;
}) {
  return (
    <div>
      {titre && (
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">{titre}</h3>
      )}
      {lignes.length === 0 ? (
        <p className="text-[13px] text-muted">{vide}</p>
      ) : (
        <ul className="space-y-2">
          {lignes.map((l) => {
            const d = DOMAINE_BY_CODE[l.code];
            const ratio = l.max > 0 ? Math.max(0, Math.min(1, l.valeur / l.max)) : 0;
            // Une valeur non nulle reste visible, même minuscule.
            const pct = l.valeur > 0 ? Math.max(3, Math.round(ratio * 100)) : 0;
            return (
              <li key={l.code} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-2.5 text-[13px]"
                title={`${d.label} — ${l.detail ?? `${l.valeur}/${l.max}`}`}>
                <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: d.couleur }}>
                  {d.code}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px]">{d.court}</div>
                  <div
                    role="progressbar"
                    aria-label={d.court}
                    aria-valuenow={Math.round(ratio * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-1 h-2 overflow-hidden rounded-full bg-surface2"
                  >
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.couleur }} />
                  </div>
                </div>
                <span className="self-end text-right font-mono text-[12px] tabular-nums text-muted">
                  {l.detail ?? `${l.valeur}/${l.max}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Tentative réduite à ce que le bloc élève exploite. */
type TentativeBloc = Pick<AttemptRow, 'tp_id' | 'status' | 'score'>;

/**
 * Bloc « Domaines travaillés » d'un élève (espace élève et fiche élève du professeur) :
 * une barre par domaine réellement travaillé (TP terminés sur TP publiés du domaine),
 * puis la ligne « À découvrir » des domaines qui ont des TP publiés jamais commencés.
 *
 * `rows` : lignes `tps` DÉJÀ chargées par la page (résolution sans requête par TP) ;
 * `publies` : identifiants des TP publiés visibles de l'élève (fournis + professeur).
 */
export function DomainesEleve({
  attempts,
  rows,
  publies,
  lienCatalogue = false,
}: {
  attempts: TentativeBloc[];
  rows: TpRow[];
  publies: string[];
  /** Les domaines à découvrir renvoient vers le catalogue (vue élève). */
  lienCatalogue?: boolean;
}) {
  const resoudre = useMemo(() => resolveurClassement(rows), [rows]);
  const couv = useMemo(() => couvertureDomaines(attempts, resoudre), [attempts, resoudre]);
  const parDomaine = useMemo(() => tpsPubliesParDomaine(publies, resoudre), [publies, resoudre]);
  const aDecouvrir = useMemo(() => domainesADecouvrir(parDomaine, couv), [parDomaine, couv]);

  const lignes: LigneCouverture[] = CODES_DOMAINES.filter((code) => couv[code].tps.length > 0).map((code) => {
    const c = couv[code];
    const max = Math.max(parDomaine[code].length, c.tps.length);
    return {
      code,
      valeur: c.termines,
      max,
      detail: c.enCours > 0 ? `${c.termines}/${max} · ${c.enCours} en cours` : `${c.termines}/${max}`,
    };
  });
  const secondaires = CODES_DOMAINES.filter((code) => couv[code].secondaires > 0);

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted">TP terminés sur les TP publiés de chaque domaine.</p>
      <CouvertureDomaines lignes={lignes} vide="Aucun TP commencé pour le moment." />
      {secondaires.length > 0 && (
        <p className="text-[12px] text-muted">
          Abordés aussi en domaine secondaire :{' '}
          {secondaires.map((code, i) => (
            <span key={code}>
              {i > 0 && ' · '}
              <b className="font-mono tabular-nums" style={{ color: DOMAINE_BY_CODE[code].couleur }}>{code}</b>{' '}
              <span className="font-mono tabular-nums">({couv[code].secondaires})</span>
            </span>
          ))}
        </p>
      )}
      {aDecouvrir.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">À découvrir</span>
          {aDecouvrir.map((code) => {
            const d = DOMAINE_BY_CODE[code];
            const contenu = (
              <>
                <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: d.couleur }}>{code}</span>
                <span>{d.court}</span>
                <span className="font-mono text-[11px] tabular-nums text-muted">{parDomaine[code].length}</span>
              </>
            );
            const cls = 'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border bg-surface px-2.5 text-[12px]';
            return lienCatalogue ? (
              <Link key={code} href="/tp" className={`${cls} hover:bg-surface2`} style={{ borderColor: d.couleur }}
                title={`${d.label} : ${parDomaine[code].length} TP à découvrir`}>
                {contenu}
              </Link>
            ) : (
              <span key={code} className={cls} style={{ borderColor: d.couleur }} title={d.label}>{contenu}</span>
            );
          })}
        </div>
      )}
    </div>
  );
}
