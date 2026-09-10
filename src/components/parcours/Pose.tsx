'use client';

import React from 'react';
import type { AttemptState, CatalogueItem, TpDefinition } from '@/lib/types';
import { spriteUrl } from '@/lib/data/catalogue';
import { svgForKey } from '@/components/panel/svg';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { missingSlots, poseComplete } from '@/lib/sim/progress';
import TpPanel, { useTpItems } from './TpPanel';
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

const THUMB_SHADOW = { filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))' } as const;

/**
 * Vignette d'un appareil de la caisse, avec la même priorité de rendu que la platine :
 * dessin vectoriel (appareils DC / PV sans photo), puis image de bibliothèque (data URI),
 * puis sprite photo du pack. `item` vient du catalogue résolu du TP (bibliothèque préchargée).
 */
function Thumb({ slotKey, item }: { slotKey: string; item?: CatalogueItem }) {
  const vector = svgForKey(slotKey);
  if (vector) {
    return <span className="block h-[40px] w-[40px]" style={THUMB_SHADOW}>{vector}</span>;
  }
  const src = item?.src ?? spriteUrl(slotKey);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-[40px] w-[40px] object-contain" style={THUMB_SHADOW} />;
}

export default function Pose({ tp, st, onPlace, onNext, readOnly, preview }: Props) {
  const items = useTpItems(tp);
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
                <Thumb slotKey={s.key} item={items[s.key]} />
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
