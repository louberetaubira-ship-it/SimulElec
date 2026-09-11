'use client';

import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Note, SideTitle } from '@/components/ui';
import { isWired, requiredLiaisons, wiringComplete } from '@/lib/sim/progress';
import { terminalLabel } from '@/lib/sim/layout';
import { NET_COLOR } from '@/lib/scene/geometry';
import type { PanelWire } from '@/components/panel/Panel';
import {
  ConfirmDialog, UndoBar, WireContextMenu, WireToolButton, WireToolbar, useWireShortcuts,
} from '@/components/panel/WireTools';
import { currentPhase, useParcours, wireLabel, wiresOfPhase, type ResetScope } from '@/app/tp/[id]/store';
import TpPanel from './TpPanel';
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
  const complete = wiringComplete(tp, st);
  const next = required.find(l => !isWired(st, l));

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
        <SideTitle>Tableau de câblage</SideTitle>
        <Note>
          Clique une borne puis l&apos;autre : le fil prend la couleur du conducteur et chemine dans les
          goulottes. Une liaison hors tableau est refusée et comptée en erreur. Le réseau → X1 et le câble
          moteur sont déjà posés par l&apos;installateur.
        </Note>
        <Note>
          Tu t&apos;es trompé ? Clique un fil sur la platine pour le sélectionner, puis « Supprimer le fil »
          (ou la touche <b>Suppr</b>). Sur téléphone, garde le doigt appuyé sur le fil.
        </Note>

        {toolbar()}
        <div className="wt-bar">
          <WireToolButton data-testid="reset-stage" onClick={() => askReset('stage')}>
            Effacer les fils de cette étape
          </WireToolButton>
          <WireToolButton data-testid="reset-all" onClick={() => askReset('all')}>
            Tout recâbler
          </WireToolButton>
          <WireToolButton data-testid="reset-tp" onClick={() => askReset('tp')}>
            Recommencer le TP
          </WireToolButton>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-num text-[12px]">
            {doneCount} / {required.length} liaisons · {st.wireErrors} erreur{st.wireErrors > 1 ? 's' : ''}
            {(st.wiresRemoved ?? 0) > 0 && ` · ${st.wiresRemoved} retiré${st.wiresRemoved > 1 ? 's' : ''}`}
          </span>
          {ASSIST && <Button size="sm" onClick={onAssist}>Câblage assisté</Button>}
        </div>
        {next && (
          <div className="rounded-[10px] border border-accent bg-accent/10 px-2 py-1.5 font-mono-num text-[12px]">
            Fil suivant : {next.a.replace('.', ' ')} → {next.b.replace('.', ' ')} <span className="text-muted">({next.net})</span>
          </div>
        )}

        <SideTitle>Fils posés · {wires.length}</SideTitle>
        <div className="flex max-h-[26vh] flex-col gap-1 overflow-y-auto lg:max-h-[220px]" data-testid="wire-list">
          {wires.length === 0 && <Note>Aucun fil sur la platine pour l&apos;instant.</Note>}
          {wires.map((w, i) => (
            <div
              key={`${w.a}~${w.b}`}
              data-testid="wire-row"
              data-selected={selWire === i ? 'on' : 'off'}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1 font-mono-num text-[11.5px] ${selWire === i ? 'border-accent bg-accent/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}
            >
              <button
                type="button"
                className="flex min-h-touch flex-1 items-center gap-2 text-left"
                onClick={() => selectWire(i)}
                aria-pressed={selWire === i}
              >
                <i className="h-1.5 w-4 flex-none rounded-sm" style={{ background: NET_COLOR[w.net] }} />
                <span className="min-w-0 flex-1 truncate">{wireLabel(w)}</span>
              </button>
              {w.prewired ? (
                <span className="flex-none rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[.04em] text-muted">
                  pré-câblé
                </span>
              ) : (
                <button
                  type="button"
                  data-testid="wire-remove"
                  className="grid h-9 w-9 flex-none place-items-center rounded-lg text-[15px] font-bold text-crit hover:bg-[var(--surface-2)]"
                  aria-label={`Supprimer le fil ${wireLabel(w)}`}
                  onClick={() => deleteWire(i)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <SideTitle>Liaisons attendues</SideTitle>
        <div className="flex max-h-[36vh] flex-col gap-1 overflow-y-auto lg:max-h-[300px]">
          {required.map(l => {
            const d = isWired(st, l);
            const isNext = next === l;
            return (
              <div
                key={`${l.a}~${l.b}`}
                className={`flex items-center gap-2 rounded-lg border bg-[var(--surface)] px-2 py-1.5 font-mono-num text-[11.5px] ${d ? 'border-[var(--line)] line-through opacity-55' : isNext ? 'border-accent' : 'border-[var(--line)]'}`}
              >
                <i className="h-1 w-3 flex-none rounded-sm" style={{ background: NET_COLOR[l.net] }} />
                {l.a.replace('.', ' ')} → {l.b.replace('.', ' ')}
                {l.door && <span className="ml-auto text-[10px] text-muted">porte</span>}
              </div>
            );
          })}
        </div>

        {complete && <Button variant="primary" onClick={onNext}>Câblage terminé, passer aux tests</Button>}
      </Side>

      <Center>
        <TpPanel
          tp={tp}
          indicator={`${doneCount} / ${required.length} liaisons`}
          actions={toolbar(true)}
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
            ? `Fil ${wireLabel(wires[selWire] ?? { a: '', b: '' })} sélectionné : Suppr pour le retirer, Échap pour abandonner.`
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
