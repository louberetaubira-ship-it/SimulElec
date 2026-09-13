'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { isWired, requiredLiaisons } from '@/lib/sim/progress';
import { terminalLabel } from '@/lib/sim/layout';
import type { PanelWire } from '@/components/panel/Panel';
import {
  ConfirmDialog, UndoBar, WireContextMenu, WireToolbar, useWireShortcuts,
} from '@/components/panel/WireTools';
import { currentPhase, useParcours, wireLabel, wiresOfPhase, type ResetScope } from '@/app/tp/[id]/store';
import TpPanel from './TpPanel';
import TableauCablage from './TableauCablage';
import { Center, Hint, Side } from './StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  wires: PanelWire[];
  selTerminal: string | null;
  onTerminalClick: (id: string) => void;
  onAssist: () => void;
  onNext: () => void;
}

const ASSIST = process.env.NEXT_PUBLIC_ASSIST === '1';

/** Textes des trois boîtes de dialogue de réinitialisation. */
function resetDialog(scope: ResetScope, tp: TpDefinition, st: AttemptState) {
  if (scope === 'stage') {
    const phase = currentPhase(tp, st);
    const n = wiresOfPhase(st, phase).length;
    return {
      title: `Effacer les fils de ${phase} ?`,
      confirmLabel: 'Effacer ces fils',
      danger: false,
      body: (
        <>
          <p>
            Tu es en train de câbler le circuit de <b>{phase}</b>. Les <b>{n} fil{n > 1 ? 's' : ''}</b> de
            ce circuit seront retirés ; les autres restent en place.
          </p>
          <p>Tes appareils, ton matériel et tes erreurs déjà comptées ne changent pas. Tu peux revenir en arrière avec « Annuler ».</p>
        </>
      ),
    };
  }
  if (scope === 'all') {
    return {
      title: 'Tout recâbler ?',
      confirmLabel: 'Tout recâbler',
      danger: false,
      body: (
        <>
          <p>
            Les <b>{st.wires.length} fil{st.wires.length > 1 ? 's' : ''}</b> que tu as posés seront retirés.
            Les appareils posés sur la platine et le matériel que tu as choisi sont conservés.
          </p>
          <p>Les liaisons de l&apos;installateur (réseau, câble moteur) restent en place. Tu peux revenir en arrière avec « Annuler ».</p>
        </>
      ),
    };
  }
  return {
    title: 'Recommencer le TP depuis le début ?',
    confirmLabel: 'Recommencer le TP',
    danger: true,
    body: (
      <>
        <p>
          Une <b>nouvelle tentative</b> est créée et tu repars à l&apos;étape <b>Matériel</b> :
          matériel, pose, câblage, mesures, tout est remis à zéro.
        </p>
        <p>
          Ta tentative actuelle n&apos;est pas perdue : elle reste dans ton historique et ton professeur
          peut la consulter.
        </p>
        <p><b>Cette action ne peut pas être annulée.</b></p>
      </>
    ),
  };
}

export default function Cablage({ tp, st, wires, selTerminal, onTerminalClick, onAssist, onNext }: Props) {
  const required = requiredLiaisons(tp);
  const doneCount = required.filter(l => isWired(st, l)).length;

  const selWire = useParcours(s => s.selWire);
  const wireMenu = useParcours(s => s.wireMenu);
  const undoDepth = useParcours(s => s.undoStack.length);
  const redoDepth = useParcours(s => s.redoStack.length);
  const undoNotice = useParcours(s => s.undoNotice);
  const confirmScope = useParcours(s => s.confirmScope);
  const restarting = useParcours(s => s.restarting);

  const selectWire = useParcours(s => s.selectWire);
  const openWireMenu = useParcours(s => s.openWireMenu);
  const closeWireMenu = useParcours(s => s.closeWireMenu);
  const deleteWire = useParcours(s => s.deleteWire);
  const deleteSelectedWire = useParcours(s => s.deleteSelectedWire);
  const undo = useParcours(s => s.undo);
  const redo = useParcours(s => s.redo);
  const dismissUndoNotice = useParcours(s => s.dismissUndoNotice);
  const askReset = useParcours(s => s.askReset);
  const aimed = useParcours(s => s.aimed);
  const confirmReset = useParcours(s => s.confirmReset);

  useWireShortcuts({
    active: true,
    hasSelection: selWire != null,
    onDelete: deleteSelectedWire,
    onUndo: undo,
    onRedo: redo,
    onEscape: () => selectWire(null),
  });

  const toolbar = (compact?: boolean) => (
    <WireToolbar
      compact={compact}
      canUndo={undoDepth > 0}
      canRedo={redoDepth > 0}
      canDelete={selWire != null}
      onUndo={undo}
      onRedo={redo}
      onDelete={deleteSelectedWire}
    />
  );

  const dialog = confirmScope ? resetDialog(confirmScope, tp, st) : null;

  return (
    <>
      <Side>
        <TableauCablage
          tp={tp} st={st} wires={wires} variant="colonne"
          toolbar={toolbar()}
          onNext={onNext}
          onAssist={onAssist}
          showAssist={ASSIST}
        />
      </Side>

      <Center>
        <TpPanel
          tp={tp}
          indicator={`${doneCount} / ${required.length} liaisons`}
          actions={toolbar(true)}
          dock={
            <TableauCablage
              tp={tp} st={st} wires={wires} variant="dock"
              onNext={onNext}
              onAssist={onAssist}
              showAssist={ASSIST}
            />
          }
          dockTitle="Tableau de câblage"
          aimed={aimed}
          wires={wires}
          cover={false}
          marks
          pickTerminals
          onTerminal={onTerminalClick}
          selectedWire={selWire}
          onWire={selectWire}
          onWireLongPress={openWireMenu}
          highlight={null}
        />
        <Hint>
          {selWire != null
            ? `Fil ${wireLabel(tp, wires[selWire] ?? { a: '', b: '' })} sélectionné : Suppr pour le retirer, Échap pour abandonner.`
            : selTerminal
              ? `Borne ${terminalLabel(tp, selTerminal)} sélectionnée : clique la seconde borne.`
              : 'Suis le tableau à gauche : la prochaine liaison est encadrée.'}
        </Hint>
      </Center>

      {wireMenu && (
        <WireContextMenu
          x={wireMenu.x}
          y={wireMenu.y}
          onDelete={() => deleteWire(wireMenu.index)}
          onCancel={closeWireMenu}
        />
      )}

      <UndoBar message={undoNotice} onUndo={undo} onDismiss={dismissUndoNotice} />

      {dialog && confirmScope && (
        <ConfirmDialog
          title={dialog.title}
          body={dialog.body}
          confirmLabel={dialog.confirmLabel}
          danger={dialog.danger}
          busy={restarting}
          onConfirm={() => void confirmReset()}
          onCancel={() => askReset(null)}
        />
      )}
    </>
  );
}
