'use client';

/**
 * Coffret de porte XALD : les organes (voyants, boutons, coups de poing) viennent
 * de la définition du TP (`TpDefinition.pupitre`), dans l'ordre, avec leurs bornes
 * repérées sur le bord droit. À défaut, c'est le pupitre historique H1/H2/S2/S1.
 */
import React from 'react';
import { pupitreLayout, type PupitrePlace } from '@/lib/scene/geometry';
import type { PupitreItem } from '@/lib/types';

export interface StationProps {
  /** Composition du pupitre, de haut en bas. */
  pupitre: readonly PupitreItem[];
  /** Voyants allumés, par repère. */
  lamps?: Record<string, boolean>;
  /** Coups de poing restés verrouillés, par repère. */
  latched?: Record<string, boolean>;
  onButton?: (rep: string, down: boolean) => void;
}

/** Classe de couleur de la tête ou du verre. */
const COLOR: Record<PupitreItem['color'], string> = {
  green: 'g', red: 'r', clear: 'c', yellow: 'y', white: 'w',
};

/** Ce que dit le voyant, pour l'infobulle. */
const SIGNAL: Record<'run' | 'ctl' | 'trip', string> = {
  run: 'marche', ctl: 'sous tension', trip: 'défaut',
};

function Lamp({ place, on }: { place: PupitrePlace; on: boolean }) {
  const it = place.item;
  const quoi = it.signals ? SIGNAL[it.signals] : it.label;
  return (
    <div
      className={`lamp ${COLOR[it.color]}${on ? ' on' : ''}`}
      style={{ top: place.top, width: place.h, height: place.h }}
      title={`${it.rep} · ${it.label} (${quoi}) : ${on ? 'allumé' : 'éteint'}`}
    />
  );
}

function Btn({ place, latched, onButton }: { place: PupitrePlace; latched: boolean; onButton?: (rep: string, down: boolean) => void }) {
  const it = place.item;
  const rep = it.rep;
  const press = (down: boolean) => () => onButton?.(rep, down);
  const aria = latched
    ? `${rep} ${it.label} : verrouillé, clique pour déverrouiller`
    : `${rep} ${it.label}`;
  return (
    <button
      type="button"
      className={`btn ${COLOR[it.color]}${it.latching ? ' k' : ''}${latched ? ' latched' : ''}`}
      data-btn={rep}
      aria-label={aria}
      title={aria}
      style={{ top: place.top, width: place.h, height: place.h }}
      onPointerDown={press(true)}
      onPointerUp={press(false)}
      onPointerLeave={press(false)}
      onClick={() => { onButton?.(rep, true); onButton?.(rep, false); }}
    />
  );
}

export default function Station({ pupitre, lamps, latched, onButton }: StationProps) {
  const places = React.useMemo(() => pupitreLayout(pupitre), [pupitre]);
  return (
    <div className="se-station">
      {places.map((p) => (
        <React.Fragment key={p.item.rep}>
          {p.item.kind === 'lamp'
            ? <Lamp place={p} on={Boolean(lamps?.[p.item.rep])} />
            : <Btn place={p} latched={Boolean(latched?.[p.item.rep])} onButton={onButton} />}
          {p.terms.map((t) => (
            <span key={t.id} className="lb" style={{ top: t.y - 10 }}>{t.id.replace('.', ' ')}</span>
          ))}
        </React.Fragment>
      ))}
      <div className="cap">
        <b>{places.map((p) => p.item.rep).join(' ')}</b>coffret de porte XALD
      </div>
    </div>
  );
}
