'use client';
/**
 * Outil « valeur » : une ou plusieurs valeurs / références à saisir (unité affichée).
 * Un champ « formule » (`estFormule`) ou `saisie: 'maths'` utilise l'éditeur de maths (LaTeX).
 * Coloration juste / faux : verdicts de la correction serveur (`correction.champs`).
 */
import type { ChampPublic } from '@/lib/sujet/public';
import type { CorrectionQuestion } from '@/lib/sujet/types';
import EditeurMaths from './EditeurMaths';
import { CHAMP, etatChamp, verdict, type OutilProps } from './outils';

/** Le champ se saisit-il dans l'éditeur de maths ? */
export const champMaths = (c: Pick<ChampPublic, 'estFormule' | 'saisie'>) => !!c.estFormule || c.saisie === 'maths';

/** Grille de champs libellés (outil « valeur », champs complémentaires d'un placement). */
export function ChampsValeur({ champs, valeurs, onFixer, readOnly, correction }: {
  champs: ChampPublic[];
  valeurs: Record<string, string>;
  onFixer: (id: string, v: string) => void;
  readOnly: boolean;
  /** Correction serveur (verdict par champ). */
  correction?: CorrectionQuestion | null;
  /** Conservé pour compatibilité (la coloration suit `correction`). */
  montrer?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)] sm:items-center">
      {champs.map(c => {
        const v = valeurs[c.id] ?? '';
        const etat = etatChamp(true, v.trim() ? verdict(correction, c.id) : null);
        const maths = champMaths(c);
        return (
          <div key={c.id} className="contents">
            <span className="text-[13.5px] font-semibold sm:text-right" id={`lbl-${c.id}`}>{c.label}</span>
            <span className="flex min-w-0 items-center gap-2">
              {maths ? (
                <EditeurMaths
                  value={v}
                  onChange={x => onFixer(c.id, x)}
                  readOnly={readOnly}
                  ariaLabel={c.label}
                  placeholder={c.placeholder}
                  etat={etat}
                  className="max-w-[560px]"
                  data={{ champ: c.id }}
                />
              ) : (
                <input
                  className={`${CHAMP} w-full max-w-[280px]${etat}`}
                  value={v}
                  placeholder={c.placeholder ?? '…'}
                  disabled={readOnly}
                  onChange={e => onFixer(c.id, e.target.value)}
                  data-champ={c.id}
                  aria-labelledby={`lbl-${c.id}`}
                  inputMode={c.numerique ? 'decimal' : 'text'}
                  autoComplete="off"
                />
              )}
              {c.unite && <span className="font-mono text-[13px] text-muted">{c.unite}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function QValeur({ q, r, onChange, readOnly, correction }: OutilProps<'valeur'>) {
  const valeurs = r?.valeurs ?? {};
  const fixer = (id: string, v: string) => onChange({ type: 'valeur', valeurs: { ...valeurs, [id]: v } });
  return <ChampsValeur champs={q.champs} valeurs={valeurs} onFixer={fixer} readOnly={readOnly} correction={correction} />;
}
