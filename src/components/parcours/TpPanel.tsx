'use client';

/**
 * Zone de travail du parcours élève : étagère des appareils de mesure,
 * puis la platine v3 zoomable (`<Workspace>` + `<Panel fixedScale>`).
 * Le catalogue du TP (pack + bibliothèque) est résolu ici.
 */
import React from 'react';
import type { CatalogueItem, InstrumentKind, TpDefinition } from '@/lib/types';
import { INSTRUMENTS } from '@/lib/sim/mesures';
import { STAGES } from '@/lib/sim/progress';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { libraryItemSync, loadLibraryItem } from '@/lib/data/library';
import Panel, { type PanelProps } from '@/components/panel/Panel';
import Workspace from '@/components/panel/Workspace';
import InstrumentTray, { useInstrumentPhotos } from '@/components/mesures/InstrumentTray';
import type { WorkspaceTool } from '@/components/panel/Workspace';
import AtelierDrawer from './AtelierDrawer';
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

/** Icônes de repli du rail du mode atelier (appareils sans photo de bibliothèque). */
const RAIL_ICON: Partial<Record<InstrumentKind, string>> = { vat: '🔴', tach: '🔦' };

export type TpPanelProps = Omit<PanelProps, 'items' | 'fixedScale'> & {
  /** Étape de mesure : l'étagère est active. Ailleurs elle reste visible mais grisée. */
  trayEnabled?: boolean;
  /**
   * Appareils proposés dans le rail du mode atelier. Par défaut ceux de l'étagère
   * quand elle est active, aucun sinon.
   */
  instruments?: InstrumentKind[];
  /** Indicateur contextuel de la barre haute du mode atelier (ex. « 7 / 14 liaisons »). */
  indicator?: React.ReactNode;
  /** Actions de l'étape placées dans la barre haute du mode atelier (Annuler / Rétablir / Supprimer). */
  actions?: React.ReactNode;
};

export default function TpPanel({ trayEnabled = false, instruments, indicator, actions, ...props }: TpPanelProps) {
  const items = useTpItems(props.tp);
  const inst = useParcours(s => s.mes.inst);
  const setInstrument = useParcours(s => s.setInstrument);
  const stage = useParcours(s => s.st.stage);
  const photos = useInstrumentPhotos();

  const allowed = instruments ?? (trayEnabled ? INSTRUMENTS.map(i => i.id) : []);
  const tools: WorkspaceTool[] = React.useMemo(
    () => INSTRUMENTS
      .filter(i => allowed.includes(i.id))
      .map(i => ({
        id: i.id,
        name: i.name,
        src: i.libKey ? photos[i.libKey] ?? null : null,
        icon: RAIL_ICON[i.id],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowed.join(','), photos],
  );

  return (
    <div className="tp-stage">
      <InstrumentTray value={inst} onSelect={setInstrument} disabled={!trayEnabled} />
      <Workspace
        storageKey="tp"
        title={props.tp.title}
        subtitle={`Étape ${stage + 1} / ${STAGES.length} · ${STAGES[stage]}`}
        indicator={indicator}
        actions={actions}
        drawer={<AtelierDrawer tp={props.tp} />}
        drawerTitle="Énoncé"
        tools={tools}
        activeTool={inst}
        onTool={id => setInstrument(id as InstrumentKind)}
      >
        <Panel {...props} items={items} fixedScale />
      </Workspace>
    </div>
  );
}
