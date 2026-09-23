'use client';
/**
 * Outil « schéma » : deux modes notés chacun pour moitié.
 *  - « Traits à poser » : sur l'image du sujet (`SchemaTraits`) ;
 *  - « Câblage réel » : le même montage sur la platine du simulateur (`CablageReel`,
 *    TP platine dédié). Le composant n'est monté que dans son onglet : il initialise le
 *    store global du parcours platine.
 * Après correction (serveur), les traits posés sont colorés d'après `correction.champs`
 * (`t:<a>|<b>` juste / faux, `tc:<a>|<b>` mauvaise couleur) ; les liaisons attendues et le
 * schéma corrigé ne sont jamais envoyés au navigateur de l'élève.
 */
import { useState } from 'react';
import type { EtatTraits } from '@/lib/sujet/correction';
import type { CorrectionQuestion, PlatineResultat } from '@/lib/sujet/types';
import CablageReel from './CablageReel';
import SchemaTraits from './SchemaTraits';
import type { OutilProps, RDe } from './outils';

type Onglet = 'traits' | 'platine';

/** Verdicts des traits posés, reconstitués depuis la correction serveur. */
function verifDepuis(c: CorrectionQuestion | null | undefined): EtatTraits | null {
  const ch = c?.champs;
  if (!ch) return null;
  const justes = new Set<string>();
  const fausses = new Set<string>();
  const mauvaiseCouleur = new Set<string>();
  for (const [k, v] of Object.entries(ch)) {
    if (k.startsWith('tc:')) mauvaiseCouleur.add(k.slice(3));
    else if (k.startsWith('t:')) (v ? justes : fausses).add(k.slice(2));
  }
  if (!justes.size && !fausses.size && !mauvaiseCouleur.size) return null;
  return { justes, fausses, mauvaiseCouleur, manquantes: new Set(), score: c?.score ?? 0, total: 0 };
}

export default function QSchema({ q, r, onChange, readOnly, correction }: OutilProps<'schema'>) {
  const [onglet, setOnglet] = useState<Onglet>('traits');
  const rep: RDe<'schema'> = r ?? { type: 'schema', traits: [], platine: null };
  const verif = verifDepuis(correction);

  const onglets: { id: Onglet; label: string }[] = [
    { id: 'traits', label: `Traits à poser${rep.traits.length ? ` · ${rep.traits.length}` : ''}` },
    { id: 'platine', label: `Câblage réel${rep.platine ? ' · validé' : ''}` },
  ];

  return (
    <div>
      <div role="tablist" className="mb-2 flex flex-wrap gap-1">
        {onglets.map(o => (
          <button key={o.id} type="button" role="tab" aria-selected={onglet === o.id} onClick={() => setOnglet(o.id)} data-onglet-schema={o.id}
            className={`min-h-[36px] rounded-lg border px-3 text-[12.5px] font-semibold ${onglet === o.id ? 'border-[#1B222C] bg-[#1B222C] text-white' : 'border-line bg-surface2'}`}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[12px] text-muted">
        La note de la question se partage : <b>la moitié pour le schéma</b> (traits et couleurs), <b>la moitié pour le câblage réel</b> (liaisons, mise sous tension, essai).
      </p>

      {onglet === 'traits' && (
        <SchemaTraits
          def={q.traits}
          traits={rep.traits}
          readOnly={readOnly}
          verif={verif}
          corrige={null}
          onChange={t => onChange({ ...rep, traits: t })}
        />
      )}
      {onglet === 'platine' && (
        <div className="rounded-lg border border-line bg-surface p-2">
          <CablageReel
            tpId={q.platineTpId}
            resultat={rep.platine}
            readOnly={readOnly}
            onResultat={(p: PlatineResultat) => onChange({ ...rep, platine: p })}
          />
        </div>
      )}
    </div>
  );
}
