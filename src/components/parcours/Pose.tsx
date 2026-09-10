'use client';

import React from 'react';
import type { AttemptState, CatalogueItem, TpDefinition } from '@/lib/types';
import { CATALOGUE_BY_KEY, spriteUrl } from '@/lib/data/catalogue';
import { libraryItemSync } from '@/lib/data/library';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { missingSlots, poseComplete } from '@/lib/sim/progress';
import TpPanel from './TpPanel';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  onPlace: (id: string) => void;
  onNext: () => void;
  readOnly?: boolean;
  /** TP non jouable : le parcours s'arrête ici. */
  preview?: boolean;
}

/** Vignette d'un appareil de la caisse : sprite du pack ou image de bibliothèque. */
function Thumb({ slotKey }: { slotKey: string }) {
  const lib: CatalogueItem | null = CATALOGUE_BY_KEY[slotKey] ? null : libraryItemSync(slotKey);
  const src = lib?.src ?? spriteUrl(slotKey);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-[40px] w-[40px] object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))' }} />;
}

export default function Pose({ tp, st, onPlace, onNext, readOnly, preview }: Props) {
  const left = missingSlots(tp, st);
  const complete = poseComplete(tp, st);

  /** La platine n'affiche que les appareils déjà posés. */
  const posed = React.useMemo(
    () => ({ ...tp, slots: tp.slots.filter(s => st.placed[s.id]) }),
    [tp, st.placed],
  );

  return (
    <>
      <Side>
        <SideTitle>Pose sur la platine</SideTitle>
        <Note>
          Prends les appareils dans la caisse : chacun rejoint son emplacement sur le rail prévu par le
          cahier des charges. Les borniers X1 et X2 se posent borne par borne sur le dernier rail.
        </Note>
        <Card title={`Caisse · ${left.length} appareil${left.length > 1 ? 's' : ''} à poser`}>
          <div className="grid grid-cols-2 gap-1.5">
            {left.map(s => (
              <button
                key={s.id}
                type="button"
                data-slot={s.id}
                disabled={readOnly}
                onClick={() => onPlace(s.id)}
                className="flex min-h-touch items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-1.5 text-left disabled:opacity-50"
              >
                <Thumb slotKey={s.key} />
                <span className="min-w-0">
                  <b className="block truncate text-[11.5px]">{s.rep ?? s.label.split(' · ')[0]}</b>
                  <span className="block truncate text-[10px] text-muted">{s.label.split(' · ').slice(1).join(' · ') || s.label}</span>
                </span>
              </button>
            ))}
            {left.length === 0 && <Note>La caisse est vide : tout est posé.</Note>}
          </div>
        </Card>
        {left.length > 1 && !readOnly && (
          <Button size="sm" onClick={() => left.forEach(s => onPlace(s.id))}>Poser tout le bornier restant</Button>
        )}
        {complete && !readOnly && !preview && (
          <Button variant="primary" onClick={onNext}>Platine conforme, passer au câblage</Button>
        )}
        {complete && preview && (
          <Note>
            Platine complète. Le câblage, les mesures et la mise en service de ce TP sont en cours de
            finalisation : reviens bientôt, ou choisis un TP marqué « jouable » au catalogue.
          </Note>
        )}
      </Side>

      <Center>
        <TpPanel tp={posed} wires={[]} cover marks />
        <Hint>
          {left.length
            ? `Restent à poser : ${left.slice(0, 6).map(s => s.rep ?? s.id).join(', ')}${left.length > 6 ? '…' : ''}`
            : 'Tous les appareils sont posés à leur place.'}
        </Hint>
      </Center>
    </>
  );
}
