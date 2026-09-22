'use client';

/**
 * Banc d'essai du portail de l'Écobike : l'élève se place devant le portail et fait les
 * essais fonctionnels de la fiche, comme à la réception d'un chantier.
 *
 * Le programme qui tourne ici est celui que l'élève a TRANSFÉRÉ dans le M221 à la mise en
 * service (`programmeTransfere`) : ses temporisations %TM1, %TM3, %TM5 et l'adresse de
 * chaque variable. Le câblage, lui, est celui de la platine — S0 à S6 sur %I0.0 à %I0.6,
 * %Q0.0 sur KM1.1, %Q0.1 sur KM1.2, %Q0.2 sur H1. Un %TM3 réglé à 5 s referme donc le
 * portail au bout de 5 s ; des sorties KM1.1 / KM1.2 permutées dans le programme le font
 * forcer contre sa butée de fermeture au lieu de s'ouvrir. Les voyants d'entrées et de
 * sorties du M221 suivent chaque action : c'est en les lisant qu'on dépanne un automatisme.
 *
 * Un essai de la fiche n'est coché que s'il est CONFORME au cahier des charges : une
 * fermeture après 5 s n'est pas « la fermeture automatique après 20 s ».
 */
import React from 'react';
import { ESSAIS_PORTAIL } from '@/lib/sim/progress';
import type { ProgrammeAutomate } from '@/lib/sim/automateMiseEnService';

const TICK = 100; // ms
const NOMS = ['0 · repos', '1 · feu', '2 · ouverture', '3 · attente', '4 · fermeture', '5 · feu'];
/** Câblage de la platine : quelle borne reçoit quel capteur, quelle sortie commande quoi. */
const CABLAGE_E: Record<string, string> = {
  '%I0.0': 'S0', '%I0.1': 'S1', '%I0.2': 'S2', '%I0.3': 'S3', '%I0.4': 'S4', '%I0.5': 'S5', '%I0.6': 'S6',
};
const PROGRAMME_REFERENCE: ProgrammeAutomate = {
  tempos: { tm1: 3, tm3: 20, tm5: 3 },
  adresses: {
    S0: '%I0.0', S1: '%I0.1', S2: '%I0.2', S3: '%I0.3', S4: '%I0.4', S5: '%I0.5', S6: '%I0.6',
    'KM1.1': '%Q0.0', 'KM1.2': '%Q0.1', H1: '%Q0.2',
  },
  attendus: {
    tempos: { tm1: 3, tm3: 20, tm5: 3 },
    adresses: {
      S0: '%I0.0', S1: '%I0.1', S2: '%I0.2', S3: '%I0.3', S4: '%I0.4', S5: '%I0.5', S6: '%I0.6',
      'KM1.1': '%Q0.0', 'KM1.2': '%Q0.1', H1: '%Q0.2',
    },
  },
};
const fr = (v: number) => String(v).replace('.', ',');

export default function EssaisPortail({ faits, onReussi, onClose, programme = PROGRAMME_REFERENCE, titre }: {
  faits: Record<string, boolean> | undefined;
  onReussi: (id: string) => void;
  onClose: () => void;
  /** Programme transféré dans l'automate (temporisations, adresses). */
  programme?: ProgrammeAutomate;
  titre?: string;
}) {
  const p = programme;
  const T1 = Math.round((p.tempos.tm1 ?? 3) * 1000 / TICK);
  const T3 = Math.round((p.tempos.tm3 ?? 20) * 1000 / TICK);
  const T5 = Math.round((p.tempos.tm5 ?? 3) * 1000 / TICK);
  const conforme = {
    tm1: p.tempos.tm1 === p.attendus.tempos.tm1,
    tm3: p.tempos.tm3 === p.attendus.tempos.tm3,
    tm5: p.tempos.tm5 === p.attendus.tempos.tm5,
    entrees: Object.keys(CABLAGE_E).every(a => p.adresses[CABLAGE_E[a]] === a),
    sorties: ['KM1.1', 'KM1.2', 'H1'].every(m => p.adresses[m] === p.attendus.adresses[m]),
  };

  const [x, setX] = React.useState(0); // 0 = fermé, 100 = ouvert
  const [etape, setEtape] = React.useState(0);
  const [t, setT] = React.useState(0);
  const [au, setAu] = React.useState(false);
  const [obs, setObs] = React.useState(false);
  const [impulsion, setImpulsion] = React.useState<{ S1: boolean; S2: boolean; S6: boolean }>({ S1: false, S2: false, S6: false });
  const [blink, setBlink] = React.useState(false);
  /** Ce que l'essai vient de montrer d'anormal (temporisation, sens). */
  const [constat, setConstat] = React.useState<string | null>(null);
  /** Durée d'attente portail ouvert réellement observée (s), et déclencheur du cycle. */
  const suivi = React.useRef<{ attente: number; badge: boolean; butee: number }>({ attente: 0, badge: false, butee: 0 });
  const ref = React.useRef({ x, etape, t, au, obs, impulsion });
  ref.current = { x, etape, t, au, obs, impulsion };
  const reussi = React.useRef(onReussi);
  reussi.current = onReussi;
  const prog = React.useRef(p);
  prog.current = p;
  const conformeRef = React.useRef(conforme);
  conformeRef.current = conforme;

  /** Entrées PHYSIQUES, par borne : ce que câble la platine. */
  const bornes = (s = ref.current): Record<string, boolean> => ({
    '%I0.0': !s.au, '%I0.1': s.impulsion.S1, '%I0.2': s.impulsion.S2, '%I0.3': s.x <= 0, '%I0.4': s.x >= 100,
    '%I0.5': s.obs, '%I0.6': s.impulsion.S6,
  });

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const s = ref.current;
      const pr = prog.current;
      const b = bornes(s);
      /** Le programme lit ses variables à l'adresse qu'on lui a donnée. */
      const v = (m: string) => b[pr.adresses[m] ?? ''] === true;
      let { etape: e, t: tt, x: xx } = s;
      tt += 1;
      if (e === 0 && v('S0') && v('S3') && (v('S1') || v('S2'))) {
        e = 1; tt = 0; suivi.current.badge = v('S1'); suivi.current.butee = 0;
      } else if (e === 1 && tt >= T1) { e = 2; tt = 0; }
      else if (e === 2 && v('S4')) { e = 3; tt = 0; }
      else if (e === 3 && tt >= T3 && v('S0')) { suivi.current.attente = tt * TICK / 1000; e = 4; tt = 0; }
      else if (e === 4) {
        if (v('S2') || v('S5') || v('S6')) {
          if (v('S5') && conformeRef.current.tm5 && conformeRef.current.sorties) reussi.current('cell');
          if (v('S6') && conformeRef.current.tm5 && conformeRef.current.sorties) reussi.current('barre');
          e = 5; tt = 0;
        } else if (v('S3')) {
          e = 0; tt = 0;
          const att = suivi.current.attente;
          if (conformeRef.current.tm3 && conformeRef.current.sorties) reussi.current('auto');
          else if (!conformeRef.current.tm3) {
            setConstat(`Le portail s'est refermé après ${fr(att)} s d'attente : le DTR 8 impose 20 s. Reprends %TM3 à la mise en service.`);
          }
        }
      } else if (e === 5 && tt >= T5) { e = 2; tt = 0; }
      if (e === 3 && !b['%I0.0'] && tt >= T3 && conformeRef.current.tm3 && conformeRef.current.sorties) reussi.current('au');

      // sorties : le programme écrit à l'adresse de chaque variable, la platine câble
      // %Q0.0 sur KM1.1, %Q0.1 sur KM1.2 et %Q0.2 sur H1
      const ecrit: Record<string, boolean> = {};
      if (e === 2) ecrit[pr.adresses['KM1.1'] ?? ''] = true;
      if (e === 4) ecrit[pr.adresses['KM1.2'] ?? ''] = true;
      if ([1, 2, 4, 5].includes(e)) ecrit[pr.adresses.H1 ?? ''] = true;
      const ouvre = ecrit['%Q0.0'] && !ecrit['%Q0.1'];
      const ferme = ecrit['%Q0.1'] && !ecrit['%Q0.0'];
      const avant = xx;
      if (ouvre) xx = Math.min(100, xx + 1.2);
      if (ferme) xx = Math.max(0, xx - 1.2);
      // premier mouvement d'ouverture après le feu : l'ouverture par badge et le feu de 3 s
      if (e === 2 && avant === 0 && xx > 0) {
        if (suivi.current.badge && conformeRef.current.sorties && conformeRef.current.entrees) reussi.current('badge');
        if (conformeRef.current.tm1 && conformeRef.current.sorties) reussi.current('feu');
        else if (!conformeRef.current.tm1) setConstat(`Le feu n'a clignoté que ${fr(prog.current.tempos.tm1)} s avant le mouvement : le DTR 8 impose 3 s (%TM1).`);
      }
      // moteur commandé mais portail immobile en butée : sens inversé
      if ((ouvre && avant >= 100) || (ferme && avant <= 0 && e === 2)) {
        suivi.current.butee += 1;
        if (suivi.current.butee === 15) {
          setConstat(`Au badge, ${ferme ? 'KM1.2 colle' : 'KM1.1 colle'} : le portail force contre sa butée au lieu de s'ouvrir. `
            + 'Les sorties KM1.1 et KM1.2 sont permutées dans le programme — %Q0.0 doit commander KM1.1 (ouverture).');
        }
      }
      setEtape(e); setT(tt); setX(xx);
      setBlink(Math.floor(Date.now() / 350) % 2 === 0);
    }, TICK);
    return () => window.clearInterval(id);
  }, [T1, T3, T5]);

  const pulse = (k: 'S1' | 'S2' | 'S6') => {
    setImpulsion(q => ({ ...q, [k]: true }));
    window.setTimeout(() => setImpulsion(q => ({ ...q, [k]: false })), 700);
  };

  const b = bornes();
  const ecritQ: Record<string, boolean> = {};
  if (etape === 2) ecritQ[p.adresses['KM1.1'] ?? ''] = true;
  if (etape === 4) ecritQ[p.adresses['KM1.2'] ?? ''] = true;
  if ([1, 2, 4, 5].includes(etape)) ecritQ[p.adresses.H1 ?? ''] = true;
  const km11 = !!ecritQ['%Q0.0'], km12 = !!ecritQ['%Q0.1'], h1 = !!ecritQ['%Q0.2'];
  const gx = 70 + x * 2.4;
  const reste = etape === 3 ? Math.max(0, Math.ceil((T3 - t) / 10)) : null;
  const conseil = etape === 0
    ? (au ? 'AU enfoncé : même avec un badge, la réceptivité 0 → 1 est fausse. Déverrouille-le avec la clé.' : 'Portail fermé, voyant I0.3 allumé. Présente un badge ou appuie sur le bouton intérieur.')
    : etape === 1 ? `Étape 1 : le feu clignote ${fr(p.tempos.tm1)} s avant tout mouvement (%TM1).`
      : etape === 2 ? 'Ouverture : l\'étape 2 commande KM1.1 et le feu.'
        : etape === 3 ? (au ? 'AU enfoncé pendant l’attente : la fermeture ne démarre pas. Déverrouille-le pour la suite.' : `Portail ouvert, %TM3 compte : fermeture dans ${reste} s. Essaie l’arrêt d’urgence pendant l’attente, ou passe devant la cellule pendant la fermeture.`)
          : etape === 4 ? 'Fermeture : l\'étape 4 commande KM1.2 et le feu. Coupe la cellule ou touche la barre palpeuse : le portail doit rouvrir.'
            : `Obstacle détecté : feu ${fr(p.tempos.tm5)} s (%TM5) puis réouverture. C’est la sécurité exigée sur un portail automatique.`;

  const led = (on: boolean, lab: string, sub: string, orange = false) => (
    <div key={lab} className="flex flex-col items-center font-mono-num text-[9.5px] text-muted" data-led={lab} data-on={on ? '1' : '0'}>
      <i className="mb-0.5 block h-3.5 w-3.5 rounded-[3px]" style={{ background: on ? (orange ? '#FF9D00' : '#35E36A') : '#2B3A2B', boxShadow: on ? `0 0 6px ${orange ? '#FF9D00' : '#35E36A'}` : 'inset 0 0 0 1px #000' }} />
      {lab}<span>{sub}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/55 p-3" data-essais>
      <div className="w-full max-w-[1100px] rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="m-0 font-title text-[20px] font-semibold">{titre ?? 'Essais fonctionnels · portail de l’Écobike'}</h3>
          <button type="button" onClick={onClose} data-essais-close className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[13px] font-semibold">✕ Fermer</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <svg viewBox="0 0 560 250" className="block h-auto w-full rounded-xl">
              <rect x={0} y={0} width={560} height={250} fill="#EAF1F8" />
              <rect x={0} y={210} width={560} height={40} fill="#B9C0C9" /><rect x={0} y={206} width={560} height={6} fill="#6B7684" />
              <rect x={40} y={70} width={18} height={140} fill="#8C96A3" />
              <circle cx={49} cy={60} r={10} fill={h1 && blink ? '#FF9D00' : '#553300'} />
              <rect x={66} y={120} width={30} height={40} rx={4} fill="#1B222C" /><text x={81} y={145} textAnchor="middle" fontSize={9} fill="#9FD">RFID</text>
              <rect x={gx} y={90} width={220} height={116} fill="none" stroke="#1B222C" strokeWidth={5} />
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => <line key={k} x1={gx + k * 22} y1={94} x2={gx + k * 22} y2={202} stroke="#1B222C" strokeWidth={2.5} />)}
              <rect x={gx - 8} y={90} width={8} height={116} fill={impulsion.S6 ? '#D6453D' : '#FFD54A'} />
              <line x1={60} y1={185} x2={540} y2={185} stroke={obs ? '#D6453D' : '#E39A00'} strokeDasharray="5 4" />
              {obs && <g><circle cx={118} cy={150} r={13} fill="#2F6FD1" /><rect x={108} y={163} width={20} height={44} rx={4} fill="#2F6FD1" /></g>}
              <rect x={140} y={212} width={14} height={10} fill={b['%I0.3'] ? '#35E36A' : '#555'} /><text x={136} y={240} fontSize={10}>S3</text>
              <rect x={506} y={212} width={14} height={10} fill={b['%I0.4'] ? '#35E36A' : '#555'} /><text x={502} y={240} fontSize={10}>S4</text>
              <text x={550} y={24} textAnchor="end" fontSize={12} fontWeight={700} data-sens={km11 && !km12 ? 'ouverture' : km12 && !km11 ? 'fermeture' : 'arret'}>
                {km11 && !km12 ? '▶ ouverture' : km12 && !km11 ? '◀ fermeture' : 'arrêt'}
              </text>
              {au && <text x={550} y={44} textAnchor="end" fontSize={12} fontWeight={700} fill="#D6453D">AU enfoncé</text>}
              {reste != null && <text x={300} y={40} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="ui-monospace,monospace" data-tm3>%TM3 : {reste} s</text>}
            </svg>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" data-essai="S1" onClick={() => pulse('S1')} className="min-h-touch rounded-lg bg-[#1B222C] px-3 text-[12.5px] font-semibold text-white">Badger (S1)</button>
              <button type="button" data-essai="S2" onClick={() => pulse('S2')} className="min-h-touch rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold">BP intérieur (S2)</button>
              <button type="button" data-essai="S5" onClick={() => setObs(o => !o)} className="min-h-touch rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold">{obs ? 'Sortir de' : 'Passer devant'} la cellule (S5)</button>
              <button type="button" data-essai="S6" onClick={() => pulse('S6')} className="min-h-touch rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold">Toucher la barre palpeuse (S6)</button>
              <button type="button" data-essai="S0" onClick={() => setAu(a => !a)} className="min-h-touch rounded-lg border border-crit px-3 text-[12.5px] font-semibold text-crit">{au ? 'Déverrouiller l’AU à la clé' : 'Enfoncer l’AU (S0)'}</button>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <div>
              <b className="text-[13px]">Voyants du M221</b>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {led(b['%I0.0'], 'I0.0', 'S0')}{led(b['%I0.1'], 'I0.1', 'S1')}{led(b['%I0.2'], 'I0.2', 'S2')}{led(b['%I0.3'], 'I0.3', 'S3')}
                {led(b['%I0.4'], 'I0.4', 'S4')}{led(b['%I0.5'], 'I0.5', 'S5')}{led(b['%I0.6'], 'I0.6', 'S6')}{led(false, 'I0.7', '—')}{led(false, 'I0.8', '—')}
                <span className="w-2" />
                {led(km11, 'Q0.0', 'KM1.1', true)}{led(km12, 'Q0.1', 'KM1.2', true)}{led(h1 && blink, 'Q0.2', 'H1', true)}
              </div>
            </div>
            <div>
              <b className="text-[13px]">Grafcet en direct</b>
              <div className="mt-1 flex flex-wrap gap-1 font-mono-num text-[12px]">
                {NOMS.map((n, k) => <span key={n} data-etape={k} className={`rounded px-1.5 py-0.5 ${k === etape ? 'bg-good text-white' : 'bg-[var(--surface-2)]'}`}>{n}</span>)}
              </div>
              <div className="mt-1 font-mono-num text-[11px] text-muted" data-programme>
                Programme transféré : %TM1 = {fr(p.tempos.tm1)} s · %TM3 = {fr(p.tempos.tm3)} s · %TM5 = {fr(p.tempos.tm5)} s · KM1.1 sur {p.adresses['KM1.1']} · KM1.2 sur {p.adresses['KM1.2']}
              </div>
            </div>
            <div>
              <b className="text-[13px]">Fiche d’essais</b>
              <div className="mt-1 flex flex-col gap-0.5 text-[12.5px]">
                {ESSAIS_PORTAIL.map(e => (
                  <div key={e.id} data-fiche={e.id} data-fait={faits?.[e.id] ? '1' : '0'}>{faits?.[e.id] ? <span className="font-bold text-good">☑</span> : '☐'} {e.label}</div>
                ))}
              </div>
            </div>
            {constat && (
              <div className="rounded-xl border border-crit bg-crit/10 p-2.5 text-[12.5px]" data-constat>
                <b>Non conforme · </b>{constat}
              </div>
            )}
            <div className="flex items-start gap-2 rounded-xl bg-[#1B222C] p-2.5 text-[12.5px] text-[#E9EEF5]">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent font-bold text-[#141A21]">P</span>
              <span>{conseil}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
