'use client';

/**
 * Zone de travail du parcours élève : étagère des appareils de mesure,
 * puis la platine v3 zoomable (`<Workspace>` + `<Panel fixedScale>`).
 * Le catalogue du TP (pack + bibliothèque) est résolu ici.
 */
import React from 'react';
import type { InstrumentKind } from '@/lib/types';
import { INSTRUMENTS } from '@/lib/sim/mesures';
import { STAGES } from '@/lib/sim/progress';
import { PANEL_W, sceneOf } from '@/lib/scene/geometry';
import Panel, { type PanelProps } from '@/components/panel/Panel';
import { useTpItems } from '@/components/panel/useTpItems';
import Workspace from '@/components/panel/Workspace';
import InstrumentTray, { useInstrumentPhotos } from '@/components/mesures/InstrumentTray';
import type { WorkspaceTool } from '@/components/panel/Workspace';
import AtelierDrawer from './AtelierDrawer';
import { useParcours } from '@/app/tp/[id]/store';
import './parcours.css';

export { useTpItems } from '@/components/panel/useTpItems';

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
  /** Panneau de gauche du mode atelier, à demeure (ex. le tableau de câblage). */
  dock?: React.ReactNode;
  dockTitle?: string;
  /** La platine descend jusqu'au bas de l'étape (défaut). */
  fill?: boolean;
};

export default function TpPanel({ trayEnabled = false, instruments, indicator, actions, dock, dockTitle, fill = true, ...props }: TpPanelProps) {
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
        fill={fill}
        contentHeight={sceneOf(props.tp).panelH} contentWidth={PANEL_W + sceneOf(props.tp).alimW}
        storageKey="tp"
        title={props.tp.title}
        subtitle={`Étape ${stage + 1} / ${STAGES.length} · ${STAGES[stage]}`}
        indicator={indicator}
        actions={actions}
        drawer={<AtelierDrawer tp={props.tp} />}
        drawerTitle="Énoncé"
        dock={dock}
        dockTitle={dockTitle}
        tools={tools}
        activeTool={inst}
        onTool={id => setInstrument(id as InstrumentKind)}
      >
        <Panel {...props} items={items} fixedScale />
      </Workspace>
    </div>
  );
}
