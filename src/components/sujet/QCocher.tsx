'use client';
/** Outil « cocher » : QCM simple (bouton radio) ou choix multiple (cases). */
import { verdict, type OutilProps } from './outils';
import Texte from './Texte';

export default function QCocher({ q, r, onChange, readOnly, correction }: OutilProps<'cocher'>) {
  const choix = r?.choix ?? [];
  const multiple = !!q.multiple;
  const basculer = (i: number) => {
    if (readOnly) return;
    const next = multiple
      ? (choix.includes(i) ? choix.filter(x => x !== i) : [...choix, i].sort((a, b) => a - b))
      : (choix.includes(i) ? [] : [i]);
    onChange({ type: 'cocher', choix: next });
  };
  return (
    <fieldset className="space-y-1.5" disabled={readOnly}>
      <legend className="mb-1 text-[12px] text-muted">
        {multiple ? 'Coche toutes les cases qui conviennent.' : 'Coche la case qui convient.'}
      </legend>
      {q.options.map((o, i) => {
        const coche = choix.includes(i);
        // Verdict des seules cases cochées (correction serveur) : les bonnes cases non cochées restent secrètes.
        const juste = coche ? verdict(correction, String(i)) : null;
        const etat = juste != null ? (juste ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : coche ? 'border-accent bg-accent/10' : 'border-line bg-surface';
        return (
          <label
            key={i}
            className={`flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-[14px] transition ${etat} ${readOnly ? 'cursor-default' : 'hover:border-accent'}`}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={`q${q.num}`}
              className="h-4 w-4 flex-none accent-[#E39A00]"
              checked={coche}
              onChange={() => basculer(i)}
              disabled={readOnly}
              data-option={i}
            />
            <span className="flex-1"><Texte>{o}</Texte></span>
            <span aria-hidden className="font-mono text-[16px] text-muted">{coche ? '☒' : '☐'}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
