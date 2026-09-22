'use client';

/**
 * Étape MESURES SOUS TENSION d'un TP réseau : tension PoE à la prise d'une caméra
 * (multimètre V⎓, paire par paire), LED de débit d'un port du switch, ping de chaque
 * équipement depuis la loge — puis l'essai de la supervision.
 *
 * Pas de verrou NF C 18-510 ici : le PoE est une TBTS (≈ 48 V⎓, < 60 V), et le 230 V du PDU
 * n'est pas accessible — la mesure se fait sur la prise RJ45 de la caméra.
 */
import React from 'react';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { ESSAIS_RESEAU, sousTensionComplete } from '@/lib/sim/progress';
import { etatReseau, ledPort, PAIRES_POE, ping, tensionPoe } from '@/lib/sim/reseau';
import { reseauEnService, useParcours } from '@/app/tp/[id]/store';
import { Center, Hint, Side } from '@/components/parcours/StageLayout';
import ReseauScene from './ReseauScene';
import MesuresListe from './MesuresListe';
import SupervisionReseau from './SupervisionReseau';
import { Terminal } from './Outils';

const fr = (v: number) => v.toFixed(1).replace('.', ',');

export default function MesuresSousReseau({ onNext }: { onNext: () => void }) {
  const s = useParcours();
  const { tp, st, sim, mes } = s;
  const def = tp.reseau!;
  const e = etatReseau(tp, st, reseauEnService(st, sim));
  const cams = def.equipements.filter(x => x.poe);
  const [cam, setCam] = React.useState(cams[0]?.id ?? '');
  const [paires, setPaires] = React.useState<string>(PAIRES_POE[0].id);
  const [port, setPort] = React.useState<number | null>(null);
  const [term, setTerm] = React.useState('');
  const [repondu, setRepondu] = React.useState<Record<string, boolean>>({});
  const [sup, setSup] = React.useState(false);
  const u = tensionPoe(def, e, cam, paires);
  const leds = Object.fromEntries(def.equipements.filter(x => x.port != null).map(x => [x.port!, ledPort(def, e, x.port!)]));
  const cibles = def.equipements.filter(x => x.ip && x.id !== def.poste.id);
  const nEssais = ESSAIS_RESEAU.filter(x => st.essais?.[x.id]).length;

  const pinger = (ip: string) => {
    const r = ping(def, e, ip);
    setTerm(r.texte);
    if (r.r === 'ok') {
      const next = { ...repondu, [ip]: true };
      setRepondu(next);
      const n = cibles.filter(c => next[c.ip!]).length;
      if (n === cibles.length) {
        s.reseauReleve({ instrument: 'net', dial: 'ping', value: n, display: `${n} / ${cibles.length} équipements · 0 % de perte` });
      }
    }
  };

  const panneau = (
    <>
      <SideTitle>Mesures sous tension</SideTitle>
      <Note>
        L&apos;armoire est en service. Contrôle l&apos;alimentation PoE à la prise d&apos;une caméra, le débit négocié
        sur un port du switch, et la réponse de chaque équipement depuis la loge. Puis l&apos;essai de la supervision.
      </Note>
      <Card title="Multimètre · V⎓ sur une prise de caméra">
        <div className="grid grid-cols-2 gap-1.5">
          <select value={cam} onChange={ev => setCam(ev.target.value)} aria-label="Caméra" data-poe-cam
            className="min-h-touch rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[12px]">
            {cams.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select value={paires} onChange={ev => setPaires(ev.target.value)} aria-label="Paires" data-poe-paires
            className="min-h-touch rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[12px]">
            {PAIRES_POE.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="mt-2 rounded-lg bg-[#20262D] px-3 py-2 font-mono-num text-[22px] text-[#9BF2B0]" data-poe-lecture>
          {fr(u)} <span className="text-[13px]">V⎓</span>
        </div>
        <Button size="sm" className="mt-2" data-poe-noter onClick={() => s.reseauReleve({
          instrument: 'mm', dial: 'V⎓', a: `${cam}.${paires.split('-')[0]}`, b: `${cam}.${paires.split('-')[1]}`, value: u, display: `${fr(u)} V`,
        })}>Noter cette lecture</Button>
      </Card>
      <Card title="Switch · LED de débit">
        <Note>Clique un port du switch sur la scène (ports 1 à 10) pour lire sa LED.</Note>
        {port != null && (
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px]" data-led-lecture>
            <span>Port {port} : <b>{leds[port] === 1000 ? '1 Gbit/s (verte)' : leds[port] === 100 ? '100 Mbit/s (orange)' : 'éteinte'}</b></span>
            <Button size="sm" data-led-noter onClick={() => s.reseauReleve({
              instrument: 'net', dial: 'LED', a: `SW.${port}`, value: leds[port] ?? 0, display: `${leds[port] ?? 0} Mbit/s`,
            })}>Noter</Button>
          </div>
        )}
      </Card>
      <Card title={`Terminal de la loge · ping (${cibles.filter(c => repondu[c.ip!]).length} / ${cibles.length})`}>
        <div className="grid grid-cols-2 gap-1">
          {cibles.map(c => (
            <button key={c.id} type="button" data-ping={c.id} onClick={() => pinger(c.ip!)}
              className={`min-h-touch rounded-lg border px-1.5 py-1 text-left font-mono-num text-[11px] ${repondu[c.ip!] ? 'border-good/60 bg-good/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}>
              ping {c.ip}<span className="block font-sans text-[10px] text-muted">{c.nom}</span>
            </button>
          ))}
        </div>
      </Card>
      <MesuresListe tp={tp} st={st} stage="sousTension" log={mes.log} />
      <Card title="Essai · supervision depuis la loge">
        <div className="my-1 font-mono-num text-[13px]">{nEssais} / {ESSAIS_RESEAU.length} essais réussis</div>
        <Button size="sm" data-open-supervision onClick={() => setSup(true)}>Ouvrir l’écran de supervision</Button>
      </Card>
      {sousTensionComplete(tp, st) && <Button variant="primary" onClick={onNext}>Relevés conformes, passer à la validation</Button>}
    </>
  );

  return (
    <>
      <Side>{panneau}</Side>
      <Center>
        <ReseauScene def={def} rack={st.reseau?.rack} wires={[...tp.liaisons.filter(l => l.prewired), ...st.wires]}
          pduOn leds={leds} onPort={setPort} sel={port != null ? [`SW.${port}`] : []} />
        <div className="w-full max-w-[760px]"><Terminal texte={term} /></div>
        <Hint>PoE ≈ 48 V⎓ entre les paires 1-2 et 3-6 ; LED verte = 1 Gbit/s ; ping : 4 envoyés, 4 reçus, 0 perdu.</Hint>
        {sup && (
          <SupervisionReseau def={def} etat={e} faits={st.essais} onReussi={s.essaiReussi} onClose={() => setSup(false)} />
        )}
      </Center>
    </>
  );
}
