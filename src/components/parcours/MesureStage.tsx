'use client';

/**
 * Étapes « instrument en main » : EPI & consignation, mesures hors tension,
 * déconsignation & mise en service, mesures sous tension.
 * La platine reste cliquable (bornes, conducteurs, appareils, boutons de porte).
 */
import React from 'react';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { isControlLive, isRunning, startButtons } from '@/lib/sim/engine';
import {
  consignationOk, deconsComplete, epiOk, horsTensionComplete, sousTensionComplete,
} from '@/lib/sim/progress';
import EpiChecklist from '@/components/mesures/EpiChecklist';
import ConsignationSteps from '@/components/mesures/Consignation';
import DeconsignationSteps from '@/components/mesures/Deconsignation';
import Instrument from '@/components/mesures/Instrument';
import MesuresPanel from '@/components/mesures/MesuresPanel';
import { INSTRUMENTS, mesureDone, mesuresFor } from '@/lib/sim/mesures';
import { useParcours, panelWires } from '@/app/tp/[id]/store';
import TpPanel from './TpPanel';
import { deviceStateOf, lampsOf } from './panelState';
import { Center, Hint, Side } from './StageLayout';

export type MesureVariant = 'epi' | 'horsTension' | 'decons' | 'sousTension';

const TITLES: Record<MesureVariant, string> = {
  epi: 'EPI et consignation',
  horsTension: 'Mesures hors tension',
  decons: 'Déconsignation et mise en service',
  sousTension: 'Mesures sous tension',
};

export default function MesureStage({ variant, onNext }: { variant: MesureVariant; onNext: () => void }) {
  const s = useParcours();
  const { tp, st, sim, mes } = s;

  const wires = React.useMemo(() => panelWires(tp, st, sim), [tp, st, sim]);
  const out = s.currentRead();
  const clampLabel = mes.clamp != null && wires[mes.clamp]
    ? `${wires[mes.clamp].a.replace('.', ' ')} → ${wires[mes.clamp].b.replace('.', ' ')}`
    : null;

  const ready =
    variant === 'epi' ? epiOk(st) && consignationOk(st)
      : variant === 'horsTension' ? horsTensionComplete(tp, st)
        : variant === 'decons' ? deconsComplete(st)
          : sousTensionComplete(tp, st);

  /** Bouton de marche du pupitre, nommé dans les consignes (repère + libellé). */
  const marcheRep = React.useMemo(() => startButtons(tp)[0]?.rep ?? 'le bouton de marche', [tp]);
  const marche = React.useMemo(() => {
    const b = startButtons(tp)[0];
    return b ? `${b.rep} (${b.label})` : 'le bouton de marche';
  }, [tp]);

  /** Rail du mode atelier : les cinq appareils restent à portée sur ces quatre étapes. */
  const instruments = React.useMemo(() => INSTRUMENTS.map(i => i.id), []);

  const expected = variant === 'horsTension' || variant === 'sousTension'
    ? mesuresFor(tp, variant) : [];
  const indicator = expected.length
    ? `${expected.filter(m => mesureDone(st, m.id)).length} / ${expected.length} mesures`
    : undefined;

  const nextLabel =
    variant === 'epi' ? 'Installation consignée, passer aux mesures hors tension'
      : variant === 'horsTension' ? 'Mesures faites, passer à la déconsignation'
        : variant === 'decons' ? 'En service, passer aux mesures sous tension'
          : 'Relevés conformes, passer à la validation';

  return (
    <>
      <Side>
        <SideTitle>{TITLES[variant]}</SideTitle>

        {variant === 'epi' && (
          <>
            <Card title="Équipements de protection individuelle">
              <EpiChecklist epi={st.epi} onToggle={s.toggleEpi} />
            </Card>
            <Card title="Consignation">
              <ConsignationSteps st={st} sim={sim} onAct={s.consAct} />
            </Card>
          </>
        )}

        {variant === 'decons' && (
          <Card title="Déconsignation">
            <DeconsignationSteps st={st} sim={sim} onAct={s.consAct} />
          </Card>
        )}

        {/* interrupteur de position : seulement quand le TP en déclare un */}
        {variant === 'decons' && tp.interPosition && (
          <Card title={`Sécurité · ${tp.interPosition.rep}`}>
            <label className="flex items-center gap-2.5 text-[12px]">
              <input
                type="checkbox"
                checked={sim.carter}
                onChange={() => s.carter()}
                className="h-touch w-touch accent-[var(--accent)]"
              />
              <span>{tp.interPosition.etat}</span>
            </label>
            <Note className="mt-1">
              {tp.interPosition.label} : ouvre la chaîne d&apos;arrêt dès que la protection est retirée.
            </Note>
          </Card>
        )}

        <Card title="Appareil de mesure">
          <Instrument
            inst={mes.inst}
            dial={mes.dial}
            out={out}
            probes={mes.probes}
            clampLabel={clampLabel}
            pick={mes.pick}
            onSelect={s.setInstrument}
            onRotate={s.rotateDial}
            onPick={s.setPick}
            onClear={s.clearProbes}
          />
          {mes.inst && (
            <Button size="sm" className="mt-2" onClick={s.record}>Noter cette lecture</Button>
          )}
        </Card>

        {(variant === 'horsTension' || variant === 'sousTension') && (
          <MesuresPanel tp={tp} st={st} stage={variant} log={mes.log} />
        )}
        {(variant === 'epi' || variant === 'decons') && mes.log.length > 0 && (
          <Card title="Journal">
            <div className="flex flex-col gap-1 font-mono-num text-[11px]">
              {mes.log.map((l, i) => <div key={`${i}-${l}`}>{l}</div>)}
            </div>
          </Card>
        )}

        {variant === 'sousTension' && (
          <Card title="Charge mécanique">
            <label className="flex items-center gap-2.5 text-[12px]">
              <span>Charge</span>
              <input
                type="range" min={0} max={160} value={Math.round(sim.load * 100)}
                onChange={e => s.setLoad(Number(e.target.value) / 100)}
                className="h-touch flex-1 accent-[var(--accent)]"
                aria-label="Charge mécanique du récepteur"
              />
              <span className="font-mono-num">{Math.round(sim.load * 100)} %</span>
            </label>
            <Note className="mt-1">Au-delà de 120 %, F1 finit par déclencher : c&apos;est son rôle.</Note>
          </Card>
        )}

        {ready && <Button variant="primary" onClick={onNext}>{nextLabel}</Button>}
      </Side>

      <Center>
        <TpPanel
          trayEnabled={variant === 'horsTension' || variant === 'sousTension'}
          instruments={instruments}
          indicator={indicator}
          tp={tp}
          wires={wires}
          cover={false}
          marks
          deviceState={deviceStateOf(sim)}
          lamps={lampsOf(sim, tp)}
          latched={sim.latched}
          motorRpm={sim.n}
          coupling={sim.coupling}
          probes={mes.probes}
          clamp={mes.clamp}
          lock={st.cons.lock}
          pickTerminals={mes.pick === 'r' || mes.pick === 'k'}
          pickWires={mes.pick === 'clamp'}
          onTerminal={s.clickTerminal}
          onWire={s.onWire}
          onDevice={s.deviceClick}
          onButton={(b, down) => s.button(b, down)}
          onCoupling={() => s.coupling(sim.coupling === 'Y' ? 'D' : 'Y')}
        />
        <Hint>
          {variant === 'epi'
            ? (sim.q1 ? 'Ouvre Q1 en le cliquant : c\'est la séparation.' : 'Q1 est ouvert. Condamne, identifie, puis fais ta VAT.')
            : variant === 'horsTension'
              ? 'Installation consignée : choisis ton appareil, pose les deux pointes sur les bornes indiquées.'
              : variant === 'decons'
                ? (isRunning(sim) ? 'Le moteur tourne : la mise en service est faite.' : isControlLive(sim) ? `Commande sous tension : appuie sur ${marche} en porte.` : 'Referme Q1, F2 puis F3 en les cliquant.')
                : isRunning(sim)
                  ? 'Moteur en marche : fais tes relevés (V~, pince, tachymètre).'
                  : `Relance le moteur par ${marcheRep} pour les mesures qui l'exigent.`}
        </Hint>
      </Center>
    </>
  );
}
