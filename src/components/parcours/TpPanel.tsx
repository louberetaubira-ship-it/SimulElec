'use client';

/**
 * Zone de travail du parcours élève : étagère des appareils de mesure,
 * puis la platine v3 zoomable (`<Workspace>` + `<Panel fixedScale>`).
 * Le catalogue du TP (pack + bibliothèque) est résolu ici.
 */
import React from 'react';
import type { CatalogueItem, TpDefinition } from '@/lib/types';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { libraryItemSync, loadLibraryItem } from '@/lib/data/library';
import Panel, { type PanelProps } from '@/components/panel/Panel';
import Workspace from '@/components/panel/Workspace';
import InstrumentTray from '@/components/mesures/InstrumentTray';
import { useParcours } from '@/app/tp/[id]/store';
import './parcours.css';

/** Catalogue résolu d'un TP : appareils du pack + éléments de bibliothèque (clés « l_… »). */
export function useTpItems(tp: TpDefinition): Record<string, CatalogueItem> {
  const [lib, setLib] = React.useState<Record<string, CatalogueItem>>({});

  const keys = React.useMemo(
    () => Array.from(new Set<string>([
      ...tp.slots.map(s => s.key),
      ...(tp.annexItems ?? []).map(a => a.key),
      ...(tp.recvItems ?? []).map(a => a.key),
    ])),
    [tp],
  );

  React.useEffect(() => {
    const missing = keys.filter(k => k.startsWith('l_'));
    if (!missing.length) return;
    let alive = true;
    void Promise.all(missing.map(k => loadLibraryItem(k))).then(list => {
      if (!alive) return;
      const out: Record<string, CatalogueItem> = {};
      list.forEach(it => { if (it) out[it.key] = it; });
      if (Object.keys(out).length) setLib(p => ({ ...p, ...out }));
    });
    return () => { alive = false; };
  }, [keys]);

  return React.useMemo(() => {
    const out: Record<string, CatalogueItem> = { ...lib };
    for (const k of keys) {
      const it = CATALOGUE_BY_KEY[k] ?? libraryItemSync(k);
      if (it) out[k] = it;
    }
    return out;
  }, [keys, lib]);
}

export type TpPanelProps = Omit<PanelProps, 'items' | 'fixedScale'> & {
  /** Étape de mesure : l'étagère est active. Ailleurs elle reste visible mais grisée. */
  trayEnabled?: boolean;
};

export default function TpPanel({ trayEnabled = false, ...props }: TpPanelProps) {
  const items = useTpItems(props.tp);
  const inst = useParcours(s => s.mes.inst);
  const setInstrument = useParcours(s => s.setInstrument);

  return (
    <div className="tp-stage">
      <InstrumentTray value={inst} onSelect={setInstrument} disabled={!trayEnabled} />
      <Workspace storageKey="tp">
        <Panel {...props} items={items} fixedScale />
      </Workspace>
    </div>
  );
}
