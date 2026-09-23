'use client';
/**
 * Outil « calcul » : formule → application numérique → résultat, comme sur la copie.
 * Formule et application se saisissent dans l'éditeur de maths (LaTeX : fractions, racines,
 * φ, indices…), le résultat dans un champ numérique. L'éditeur ne calcule JAMAIS le résultat à la
 * place de l'élève (la calculatrice reste l'outil de calcul).
 * Noté sur le résultat (tolérance) ; la formule seule juste vaut la moitié (jugée par équivalence
 * mathématique quand le sujet la décrit). Coloration : verdicts de la correction serveur.
 */
import EditeurMaths from './EditeurMaths';
import { CHAMP, etatChamp, verdict, type OutilProps, type RDe } from './outils';

type Champ = 'formule' | 'application' | 'resultat';

export default function QCalcul({ q, r, onChange, readOnly, correction }: OutilProps<'calcul'>) {
  const rep: RDe<'calcul'> = r ?? { type: 'calcul', formule: '', application: '', resultat: '' };
  const fixer = (k: Champ, v: string) => onChange({ ...rep, [k]: v });
  const etat = (k: Champ) => etatChamp(true, rep[k].trim() ? verdict(correction, k) : null);

  const ligne = (k: 'formule' | 'application', label: string, placeholder: string) => (
    <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
      <span className="text-[12px] font-semibold uppercase tracking-[.05em] text-muted" id={`calc-${q.num}-${k}`}>{label}</span>
      <EditeurMaths
        value={rep[k]}
        onChange={v => fixer(k, v)}
        readOnly={readOnly}
        ariaLabel={`${label} (${q.grandeur})`}
        placeholder={placeholder}
        etat={etat(k)}
        data={{ calcul: k }}
      />
    </div>
  );

  return (
    <div className="space-y-2">
      {ligne('formule', 'Formule', `${q.grandeur} = …`)}
      {ligne('application', 'Application numérique', `${q.grandeur} = … (avec les valeurs)`)}
      <label className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
        <span className="text-[12px] font-semibold uppercase tracking-[.05em] text-muted">Résultat</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[14px] font-semibold">{q.grandeur} =</span>
          <input
            className={`${CHAMP} w-[160px]${etat('resultat')}`}
            value={rep.resultat}
            placeholder="…"
            inputMode="decimal"
            disabled={readOnly}
            onChange={e => fixer('resultat', e.target.value)}
            data-calcul="resultat"
            autoComplete="off"
          />
          {q.unite && <span className="font-mono text-[13px] text-muted">{q.unite}</span>}
        </span>
      </label>
      {q.arrondi && <p className="text-[12px] text-muted sm:pl-[158px]">Arrondi demandé : {q.arrondi}</p>}
      {!readOnly && (
        <p className="text-[11.5px] text-muted sm:pl-[158px]">
          Formule et application : clavier mathématique ⌨ (fractions, √, φ, indices). Calcule le résultat avec ta calculatrice.
        </p>
      )}
    </div>
  );
}
