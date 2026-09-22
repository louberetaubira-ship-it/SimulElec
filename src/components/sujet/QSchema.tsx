'use client';
/**
 * Outil « schéma » : deux modes notés chacun pour moitié.
 *  - « Traits à poser » : sur l'image du sujet (`SchemaTraits`) ;
 *  - « Câblage réel » : le même montage sur la platine du simulateur (`CablageReel`,
 *    TP platine dédié). Le composant n'est monté que dans son onglet : il initialise le
 *    store global du parcours platine.
 */
import { useState } from 'react';
import { etatTraits, scorePlatine } from '@/lib/sujet/correction';
import type { PlatineResultat } from '@/lib/sujet/types';
import CablageReel from './CablageReel';
import SchemaTraits from './SchemaTraits';
import type { OutilProps, RDe } from './outils';

type Onglet = 'traits' | 'platine' | 'corrige';

export default function QSchema({ q, r, onChange, readOnly, montrer }: OutilProps<'schema'>) {
  const [onglet, setOnglet] = useState<Onglet>('traits');
  const rep: RDe<'schema'> = r ?? { type: 'schema', traits: [], platine: null };
  const verif = montrer ? etatTraits(q, rep.traits) : null;
  const pPlatine = scorePlatine(rep.platine);

  const onglets: { id: Onglet; label: string }[] = [
    { id: 'traits', label: `Traits à poser${rep.traits.length ? ` · ${rep.traits.length}` : ''}` },
    { id: 'platine', label: `Câblage réel${rep.platine ? ' · validé' : ''}` },
    ...(readOnly ? [{ id: 'corrige' as const, label: 'Corrigé' }] : []),
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
        {montrer && <> — Traits : <b>{Math.round((verif?.score ?? 0) * 100)} %</b> · Câblage réel : <b>{Math.round(pPlatine * 100)} %</b>.</>}
      </p>

      {onglet === 'traits' && (
        <SchemaTraits
          def={q.traits}
          traits={rep.traits}
          readOnly={readOnly}
          verif={verif}
          corrige={readOnly && montrer ? q.corrigeImage : null}
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
      {onglet === 'corrige' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.corrigeImage.src} alt={q.corrigeImage.alt} className="w-full rounded-lg border border-line bg-white" />
      )}
    </div>
  );
}
