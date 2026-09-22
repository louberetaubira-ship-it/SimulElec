'use client';

/**
 * Étape EPI & CONSIGNATION d'un TP réseau. Le seul organe de puissance est le PDU
 * différentiel qui alimente le switch PoE, le NAS et le convertisseur de l'armoire : on le
 * consigne avec la logique de consignation commune (store `evaluate`, `consAct`, VAT réel
 * sur ses bornes) — séparation, condamnation, identification, VAT sur l'arrivée 230 V,
 * absence de tension sur les prises, re-vérification.
 */
import React from 'react';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { consignationOk, epiOk } from '@/lib/sim/progress';
import EpiChecklist from '@/components/mesures/EpiChecklist';
import ConsignationSteps from '@/components/mesures/Consignation';
import Instrument from '@/components/mesures/Instrument';
import { useParcours } from '@/app/tp/[id]/store';
import { Center, Hint, Side } from '@/components/parcours/StageLayout';
import ReseauScene from './ReseauScene';

export default function ConsignationReseau({ onNext }: { onNext: () => void }) {
  const s = useParcours();
  const { tp, st, sim, mes } = s;
  const def = tp.reseau!;
  const out = s.currentRead();
  const ready = epiOk(st) && consignationOk(st);
  const c = st.cons;
  const conseil = sim.q1 ? 'Ouvre le PDU en cliquant son disjoncteur différentiel : c’est la séparation.'
    : !c.lock ? 'PDU ouvert : pose le cadenas et l’étiquette.'
      : !c.ident ? 'Confirme l’identification.'
        : !c.vatRef ? 'Prends le VAT et vérifie-le sur l’arrivée 230 V du PDU (bornes L et N).'
          : c.vat.length < 2 ? 'Contrôle l’absence de tension sur la prise 1 (switch) puis la prise 2 (NAS).'
            : !c.vatRef2 ? 'Repose les pointes sur l’arrivée : le VAT doit fonctionner encore.'
              : 'Armoire consignée.';

  const panneau = (
    <>
      <SideTitle>EPI et consignation</SideTitle>
      <Card title="Équipements de protection individuelle">
        <EpiChecklist epi={st.epi} onToggle={s.toggleEpi} />
      </Card>
      <Card title="Consignation du PDU">
        <ConsignationSteps tp={tp} st={st} sim={sim} onAct={s.consAct} />
      </Card>
      <Card title="Appareil de mesure">
        <Instrument
          tp={tp} inst={mes.inst} dial={mes.dial} out={out} probes={mes.probes} clampLabel={null} pick={mes.pick}
          onSelect={s.setInstrument} onRotate={s.rotateDial} onPick={s.setPick} onClear={s.clearProbes}
        />
      </Card>
      {mes.log.length > 0 && (
        <Card title="Journal">
          <div className="flex flex-col gap-1 font-mono-num text-[11px]">{mes.log.map((l, i) => <div key={`${i}-${l}`}>{l}</div>)}</div>
        </Card>
      )}
      <Note>
        Le PDU coupe l&apos;alimentation 230 V du switch — donc aussi le PoE des caméras. Le reste du réseau (loge,
        onduleur, passerelle sur le bus KNX) garde sa propre alimentation.
      </Note>
      {ready && <Button variant="primary" onClick={onNext}>Armoire consignée, passer aux mesures hors tension</Button>}
    </>
  );

  return (
    <>
      <Side>{panneau}</Side>
      <Center>
        <ReseauScene
          def={def}
          rack={st.reseau?.rack}
          wires={[...tp.liaisons.filter(l => l.prewired), ...st.wires]}
          pduOn={sim.q1}
          lock={st.cons.lock}
          onPdu={() => s.deviceClick('q1')}
          pduPoints
          clickable={mes.pick === 'r' || mes.pick === 'k' ? ['q1.L', 'q1.N', 'q1.1L', 'q1.1N', 'q1.2L', 'q1.2N'] : false}
          sel={[mes.probes.r, mes.probes.k].filter((x): x is string => !!x)}
          onTerminal={s.clickTerminal}
        />
        <Hint>{conseil}</Hint>
      </Center>
    </>
  );
}
