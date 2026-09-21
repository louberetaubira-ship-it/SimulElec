'use client';

/**
 * Banc d'essai du portail de l'Écobike : l'élève se place devant le portail et fait les
 * essais fonctionnels de la fiche, comme à la réception d'un chantier.
 *
 * Le programme est celui que l'élève a complété à la préparation (Grafcet du portail) : il
 * tourne ici pour de bon — étapes %X0 à %X5, temporisations %TM1 (3 s), %TM3 (20 s),
 * %TM5 (3 s). Les voyants d'entrées et de sorties du M221 suivent chaque action : c'est
 * en les lisant qu'on dépanne un automatisme.
 */
import React from 'react';
import { ESSAIS_PORTAIL } from '@/lib/sim/progress';

type Entrees = { S0: boolean; S1: boolean; S2: boolean; S3: boolean; S4: boolean; S5: boolean; S6: boolean };
const TICK = 100; // ms
const T3S = 3000 / TICK;
const T20S = 20000 / TICK;
const NOMS = ['0 · repos', '1 · feu 3 s', '2 · ouverture', '3 · attente 20 s', '4 · fermeture', '5 · feu 3 s'];

export default function EssaisPortail({ faits, onReussi, onClose }: {
  faits: Record<string, boolean> | undefined;
  onReussi: (id: string) => void;
  onClose: () => void;
}) {
  const [x, setX] = React.useState(0); // 0 = fermé, 100 = ouvert
  const [etape, setEtape] = React.useState(0);
  const [t, setT] = React.useState(0);
  const [au, setAu] = React.useState(false);
  const [obs, setObs] = React.useState(false);
  const [impulsion, setImpulsion] = React.useState<{ S1: boolean; S2: boolean; S6: boolean }>({ S1: false, S2: false, S6: false });
  const [blink, setBlink] = React.useState(false);
  const ref = React.useRef({ x, etape, t, au, obs, impulsion });
  ref.current = { x, etape, t, au, obs, impulsion };
  const reussi = React.useRef(onReussi);
  reussi.current = onReussi;

  const entrees = (s = ref.current): Entrees => ({
    S0: !s.au, S1: s.impulsion.S1, S2: s.impulsion.S2, S3: s.x <= 0, S4: s.x >= 100, S5: s.obs, S6: s.impulsion.S6,
  });

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const s = ref.current;
      const i = entrees(s);
      let { etape: e, t: tt, x: xx } = s;
      tt += 1;
      if (e === 0 && i.S0 && i.S3 && (i.S1 || i.S2)) { e = 1; tt = 0; if (i.S1) reussi.current('badge'); }
      else if (e === 1 && tt >= T3S) { e = 2; tt = 0; reussi.current('feu'); }
      else if (e === 2) { xx = Math.min(100, xx + 1.2); if (xx >= 100) { e = 3; tt = 0; } }
      else if (e === 3 && tt >= T20S && i.S0) { e = 4; tt = 0; }
      else if (e === 4) {
        if (i.S2 || i.S5 || i.S6) {
          if (i.S5) reussi.current('cell');
          if (i.S6) reussi.current('barre');
          e = 5; tt = 0;
        } else {
          xx = Math.max(0, xx - 1.2);
          if (xx <= 0) { e = 0; tt = 0; reussi.current('auto'); }
        }
      } else if (e === 5 && tt >= T3S) { e = 2; tt = 0; }
      if (e === 3 && !i.S0 && tt >= T20S) reussi.current('au');
      setEtape(e); setT(tt); setX(xx);
      setBlink(Math.floor(Date.now() / 350) % 2 === 0);
    }, TICK);
    return () => window.clearInterval(id);
  }, []);

  const pulse = (k: 'S1' | 'S2' | 'S6') => {
    setImpulsion(p => ({ ...p, [k]: true }));
    window.setTimeout(() => setImpulsion(p => ({ ...p, [k]: false })), 700);
  };

  const i = entrees();
  const km11 = etape === 2, km12 = etape === 4, h1 = [1, 2, 4, 5].includes(etape);
  const gx = 70 + x * 2.4;
  const reste = etape === 3 ? Math.max(0, Math.ceil((T20S - t) / 10)) : null;
  const conseil = etape === 0
    ? (au ? 'AU enfoncé : même avec un badge, la réceptivité 0 → 1 est fausse. Déverrouille-le avec la clé.' : 'Portail fermé, voyant I0.3 allumé. Présente un badge ou appuie sur le bouton intérieur.')
    : etape === 1 ? 'Étape 1 : le feu clignote 3 s avant tout mouvement (%TM1).'
      : etape === 2 ? 'Ouverture : Q0.0 (KM1.1) et Q0.2 (feu) sont actives.'
        : etape === 3 ? (au ? 'AU enfoncé pendant l’attente : la fermeture ne démarre pas. Déverrouille-le pour la suite.' : `Portail ouvert, %TM3 compte : fermeture dans ${reste} s. Essaie l’arrêt d’urgence pendant l’attente, ou passe devant la cellule pendant la fermeture.`)
          : etape === 4 ? 'Fermeture : Q0.1 (KM1.2) et Q0.2. Coupe la cellule ou touche la barre palpeuse : le portail doit rouvrir.'
            : 'Obstacle détecté : feu 3 s (%TM5) puis réouverture. C’est la sécurité exigée sur un portail automatique.';

  const led = (on: boolean, lab: string, sub: string, orange = false) => (
    <div key={lab} className="flex flex-col items-center font-mono-num text-[9.5px] text-muted">
      <i className="mb-0.5 block h-3.5 w-3.5 rounded-[3px]" style={{ background: on ? (orange ? '#FF9D00' : '#35E36A') : '#2B3A2B', boxShadow: on ? `0 0 6px ${orange ? '#FF9D00' : '#35E36A'}` : 'inset 0 0 0 1px #000' }} />
      {lab}<span>{sub}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/55 p-3" data-essais>
      <div className="w-full max-w-[1100px] rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="m-0 font-title text-[20px] font-semibold">Essais fonctionnels · portail de l’Écobike</h3>
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
              <rect x={140} y={212} width={14} height={10} fill={i.S3 ? '#35E36A' : '#555'} /><text x={136} y={240} fontSize={10}>S3</text>
              <rect x={506} y={212} width={14} height={10} fill={i.S4 ? '#35E36A' : '#555'} /><text x={502} y={240} fontSize={10}>S4</text>
              <text x={550} y={24} textAnchor="end" fontSize={12} fontWeight={700}>{km11 ? '▶ ouverture' : km12 ? '◀ fermeture' : 'arrêt'}</text>
              {au && <text x={550} y={44} textAnchor="end" fontSize={12} fontWeight={700} fill="#D6453D">AU enfoncé</text>}
              {reste != null && <text x={300} y={40} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="ui-monospace,monospace">%TM3 : {reste} s</text>}
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
                {led(i.S0, 'I0.0', 'S0')}{led(i.S1, 'I0.1', 'S1')}{led(i.S2, 'I0.2', 'S2')}{led(i.S3, 'I0.3', 'S3')}
                {led(i.S4, 'I0.4', 'S4')}{led(i.S5, 'I0.5', 'S5')}{led(i.S6, 'I0.6', 'S6')}{led(false, 'I0.7', '—')}{led(false, 'I0.8', '—')}
                <span className="w-2" />
                {led(km11, 'Q0.0', 'KM1.1', true)}{led(km12, 'Q0.1', 'KM1.2', true)}{led(h1 && blink, 'Q0.2', 'H1', true)}
              </div>
            </div>
            <div>
              <b className="text-[13px]">Grafcet en direct</b>
              <div className="mt-1 flex flex-wrap gap-1 font-mono-num text-[12px]">
                {NOMS.map((n, k) => <span key={n} className={`rounded px-1.5 py-0.5 ${k === etape ? 'bg-good text-white' : 'bg-[var(--surface-2)]'}`}>{n}</span>)}
              </div>
            </div>
            <div>
              <b className="text-[13px]">Fiche d’essais</b>
              <div className="mt-1 flex flex-col gap-0.5 text-[12.5px]">
                {ESSAIS_PORTAIL.map(e => (
                  <div key={e.id} data-fiche={e.id}>{faits?.[e.id] ? <span className="font-bold text-good">☑</span> : '☐'} {e.label}</div>
                ))}
              </div>
            </div>
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
