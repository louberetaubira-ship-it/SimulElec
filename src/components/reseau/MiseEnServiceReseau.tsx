'use client';

/**
 * Étape DÉCONSIGNATION & MISE EN SERVICE d'un TP réseau, sur le modèle de
 * `MiseEnServiceImeon.tsx` : tout ce que l'écran propose vient du TP (`tp.reseau.automate`,
 * `tp.reseau.poste`) ; les réponses sont commises dans `st.reseau` par les actions du store.
 *
 *  ① déconsigner : cadenas retiré, PDU refermé ;
 *  ② paramétrer l'automate (câble de paramétrage, IP / masque / passerelle / DNS, envoi) —
 *     il part de son adresse d'usine 192.168.1.50 ;
 *  ③ le raccorder à sa prise RJ45 (câble de service) ;
 *  ④ depuis le terminal de la loge : `ipconfig /all`, `ping` — l'essai est réussi quand
 *     l'automate répond à 192.168.0.4, ce qui n'arrive qu'avec des réglages justes et un lien posé.
 */
import React from 'react';
import type { ReseauIp } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { deconsComplete } from '@/lib/sim/progress';
import { etatReseau, ipAutomate, ipconfig, ipErreurs, LIBELLE_IP, ledPort } from '@/lib/sim/reseau';
import { reseauEnService, useParcours } from '@/app/tp/[id]/store';
import { Center, Hint, Side } from '@/components/parcours/StageLayout';
import ReseauScene from './ReseauScene';
import { Terminal } from './Outils';

function Etape({ n, ok, titre, children }: { n: string; ok: boolean; titre: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-[10px] border p-2 text-[12.5px] ${ok ? 'border-good bg-good/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}>
      <b>{ok ? '✓' : n} · {titre}</b>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

export default function MiseEnServiceReseau({ onNext }: { onNext: () => void }) {
  const s = useParcours();
  const { tp, st, sim, mes } = s;
  const def = tp.reseau!;
  const auto = def.automate;
  const applique = ipAutomate(def, st);
  const [saisie, setSaisie] = React.useState<ReseauIp>(applique);
  const [term, setTerm] = React.useState('');
  const [autre, setAutre] = React.useState('');
  const sousTension = st.decons.close;
  const enService = reseauEnService(st, sim);
  const e = etatReseau(tp, st, enService);
  const leds = Object.fromEntries(def.equipements.filter(x => x.port != null).map(x => [x.port!, ledPort(def, e, x.port!)]));
  const envoye = st.reseau?.ip != null;
  const faux = envoye ? ipErreurs(def, applique) : [];

  const choix = (quel: 'cableParam' | 'cableService') => (
    <div className="flex flex-wrap gap-1.5">
      {(['croise', 'droit'] as const).map(v => (
        <button key={v} type="button" data-cable={`${quel}-${v}`} disabled={!sousTension}
          onClick={() => s.reseauCable(quel, v)}
          className={`min-h-touch rounded-lg border px-2.5 py-1 text-[12px] font-semibold disabled:opacity-40 ${
            st.reseau?.[quel] === v ? (quel === 'cableParam' ? v === 'croise' : v === 'droit') ? 'border-good bg-good/15' : 'border-crit bg-crit/10' : 'border-[var(--line)] bg-[var(--surface)]'
          }`}>
          Câble RJ45 {v === 'croise' ? 'croisé' : 'droit'}
        </button>
      ))}
    </div>
  );

  const panneau = (
    <>
      <SideTitle>Déconsignation et mise en service</SideTitle>
      <div className="flex flex-col gap-1.5">
        <Etape n="1" ok={st.decons.unlock} titre="Retirer le cadenas et l’étiquette du PDU">
          {!st.decons.unlock && <Button size="sm" data-act="unlock" onClick={() => s.consAct('unlock')}>Retirer la consignation</Button>}
        </Etape>
        <Etape n="2" ok={st.decons.close} titre="Refermer le PDU (clic sur son disjoncteur)">
          {st.decons.unlock && !st.decons.close && (
            <Button size="sm" data-pdu-fermer onClick={() => s.deviceClick('q1')}>Refermer le PDU</Button>
          )}
        </Etape>
        <Etape n="3" ok={st.reseau?.cableParam === 'croise'} titre={`Relier le PC de mise en service à l’automate ${auto.ref.split('·').pop()?.trim()}, sans switch`}>
          {choix('cableParam')}
        </Etape>
        <Etape n="4" ok={envoye && faux.length === 0} titre="Paramétrer l’adresse de l’automate (EcoStruxure Machine Expert – Basic · ETH1)">
          <div className="flex flex-col gap-1 rounded-lg bg-[#0B1726] p-2 text-[#CFE3FF]" data-ecran-api>
            <div className="flex justify-between text-[11px] font-bold text-white">
              <span>{auto.ref} · Ethernet · adresse IP fixe</span>
              <span data-api-statut>{envoye ? `en service : ${applique.ip}` : `usine : ${auto.defaut.ip}`}</span>
            </div>
            {(Object.keys(LIBELLE_IP) as (keyof ReseauIp)[]).map(k => (
              <label key={k} className="flex items-center gap-2 text-[11.5px]">
                <span className="w-[150px]">{LIBELLE_IP[k]}</span>
                <input
                  data-ip={k}
                  value={saisie[k]}
                  disabled={!sousTension || st.reseau?.cableParam !== 'croise'}
                  onChange={ev => setSaisie(x => ({ ...x, [k]: ev.target.value }))}
                  className="min-w-0 flex-1 rounded border border-[#2E4A66] bg-[#0F2236] px-1.5 py-1 font-mono-num text-[12px] text-white disabled:opacity-50"
                  placeholder={k === 'passerelle' || k === 'dns' ? 'non renseigné' : ''}
                />
                {envoye && <span className={faux.includes(k) ? 'text-[#FF6B60]' : 'text-[#35E36A]'}>{faux.includes(k) ? '✗' : '✓'}</span>}
              </label>
            ))}
            <button type="button" data-ip-envoyer
              disabled={!sousTension || st.reseau?.cableParam !== 'croise'}
              onClick={() => s.reseauIp(saisie)}
              className="mt-1 min-h-touch self-start rounded-lg bg-accent px-3 py-1 text-[12px] font-semibold text-[#141A21] disabled:opacity-40">
              Envoyer à l’automate
            </button>
          </div>
        </Etape>
        <Etape n="5" ok={st.reseau?.cableService === 'droit'} titre="Raccorder l’automate à sa prise RJ45 (lien du port 3)">
          {choix('cableService')}
        </Etape>
        <Etape n="6" ok={st.decons.essai} titre="Essai depuis la loge : l’automate répond-il ?">
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" data-cmd="ipconfig" onClick={() => setTerm(ipconfig(def, e))}>ipconfig /all</Button>
            <Button size="sm" data-cmd="ping" onClick={() => setTerm(s.reseauPing(auto.attendu.ip))}>ping {auto.attendu.ip}</Button>
            <Button size="sm" data-cmd="ping-usine" onClick={() => setTerm(s.reseauPing(auto.defaut.ip))}>ping {auto.defaut.ip}</Button>
          </div>
          <form className="mt-1.5 flex gap-1.5" onSubmit={ev => { ev.preventDefault(); if (autre.trim()) setTerm(s.reseauPing(autre.trim())); }}>
            <input value={autre} onChange={ev => setAutre(ev.target.value)} placeholder="autre adresse…" aria-label="Adresse à pinger"
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-2 font-mono-num text-[12px]" />
            <Button size="sm" type="submit">ping</Button>
          </form>
        </Etape>
      </div>
      {mes.log.length > 0 && (
        <Card title="Journal">
          <div className="flex flex-col gap-1 font-mono-num text-[11px]">{mes.log.map((l, i) => <div key={`${i}-${l}`}>{l}</div>)}</div>
        </Card>
      )}
      {deconsComplete(st, tp) && <Button variant="primary" onClick={onNext}>En service, passer aux mesures sous tension</Button>}
      {st.decons.essai && !deconsComplete(st, tp) && (
        <Note>L’automate répond, mais un réglage n’est pas celui du cahier des charges (passerelle, DNS ou câble) : corrige-le.</Note>
      )}
    </>
  );

  return (
    <>
      <Side>{panneau}</Side>
      <Center>
        <ReseauScene def={def} rack={st.reseau?.rack} wires={[...tp.liaisons.filter(l => l.prewired), ...st.wires]}
          pduOn={sim.q1} lock={st.cons.lock} onPdu={st.decons.unlock ? () => s.deviceClick('q1') : undefined}
          leds={enService ? leds : undefined} />
        <div className="w-full max-w-[760px]">
          <Terminal texte={term} />
        </div>
        <Hint>
          {!st.decons.close ? 'Retire la consignation, puis referme le PDU : le switch s’allume.'
            : !st.decons.essai ? `L’automate sort d’usine en ${auto.defaut.ip} : paramètre-le, raccorde-le, puis ping depuis la loge.`
              : 'L’automate répond depuis la loge : 4 envoyés, 4 reçus, 0 perdu.'}
        </Hint>
      </Center>
    </>
  );
}
