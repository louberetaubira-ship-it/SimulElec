'use client';

/**
 * Essai du TP réseau : l'ÉCRAN DE SUPERVISION de la loge, en modale plein écran, sur le
 * modèle d'`EssaiImeon.tsx`. C'est l'écran qui relie les quatre TP du chantier : les
 * caméras et l'enregistrement du NAS, les zones d'éclairage KNX (TP 3), le portail piloté
 * par le M221 (TP 2) et l'onduleur IMEON (TP 1).
 *
 * Tout ce qui s'affiche vient de `supervision()` : hors ligne tant que la loge ne joint pas
 * le réseau, et chaque équipement n'apparaît que s'il répond à son adresse. Chaque essai
 * réussi coche sa ligne de la fiche (`ESSAIS_RESEAU`, ids `res-ping`, `res-cam`, `res-knx`,
 * `res-portail`).
 */
import React from 'react';
import type { ReseauDef } from '@/lib/types';
import { ESSAIS_RESEAU } from '@/lib/sim/progress';
import { ping, supervision, type EtatReseau } from '@/lib/sim/reseau';

const ZONES = ['L1 · zones 1-2', 'L2 · zones 3-4', 'L3 · zones 5-6', 'L4 · zones 7-8', 'L5 · circulation 2', 'L6 · circulations', 'L7 · circulation 1', 'L8 · local électrique'];

function VueCamera({ n, visible }: { n: number; visible: boolean }) {
  return (
    <svg viewBox="0 0 160 90" className="block w-full rounded-md" data-cam-image={n} data-visible={visible ? '1' : '0'}>
      {visible ? (
        <>
          <rect width={160} height={90} fill={['#4E6A7A', '#5A6B52', '#62584D', '#4F5B6E'][n % 4]} />
          <rect y={62} width={160} height={28} fill="#3A4046" />
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i} transform={`translate(${14 + i * 28} 48)`}>
              <circle cx={0} cy={14} r={7} fill="none" stroke="#C9D2DB" strokeWidth={2} />
              <circle cx={16} cy={14} r={7} fill="none" stroke="#C9D2DB" strokeWidth={2} />
              <path d="M0,14 L8,4 L16,14 M8,4 L6,0" stroke="#C9D2DB" strokeWidth={2} fill="none" />
            </g>
          ))}
          <circle cx={148} cy={10} r={4} fill="#FF3B30" />
          <text x={140} y={13} textAnchor="end" fontSize={8} fill="#FFFFFF" fontWeight={700}>REC</text>
        </>
      ) : (
        <>
          <rect width={160} height={90} fill="#11151A" />
          <text x={80} y={50} textAnchor="middle" fontSize={10} fill="#FF6B60">PAS DE SIGNAL</text>
        </>
      )}
      <text x={6} y={13} fontSize={9} fill="#FFFFFF" fontWeight={700}>CAM {n}</text>
    </svg>
  );
}

export default function SupervisionReseau({ def, etat, faits, onReussi, onClose }: {
  def: ReseauDef;
  etat: EtatReseau;
  faits: Record<string, boolean> | undefined;
  onReussi: (id: string) => void;
  onClose: () => void;
}) {
  const v = supervision(def, etat);
  const [zones, setZones] = React.useState<boolean[]>(Array(8).fill(false));
  const [portail, setPortail] = React.useState<'ferme' | 'ouverture' | 'ouvert'>('ferme');
  const [pings, setPings] = React.useState<{ nom: string; ip: string; ok: boolean }[] | null>(null);
  const [mosaique, setMosaique] = React.useState(false);
  const [msg, setMsg] = React.useState('Commence par tester la communication, puis affiche les caméras, allume une zone et ouvre le portail.');

  const tester = () => {
    const l = def.equipements.filter(x => x.ip && x.id !== def.poste.id)
      .map(x => ({ nom: x.nom, ip: x.ip!, ok: ping(def, etat, x.ip!).r === 'ok' }));
    setPings(l);
    if (l.every(x => x.ok)) { onReussi('res-ping'); setMsg('Les 9 équipements répondent : 4 envoyés, 4 reçus, 0 perdu, pour chacun.'); }
    else setMsg(`${l.filter(x => !x.ok).length} équipement(s) ne répondent pas : la supervision sera incomplète.`);
  };
  const cams = () => {
    setMosaique(true);
    if (v.enLigne && v.nas && v.cameras.every(c => c.visible)) { onReussi('res-cam'); setMsg('Quatre images, et le NAS enregistre les quatre flux (voyant REC).'); }
    else setMsg('Mosaïque incomplète : une caméra ou le NAS ne répond pas.');
  };
  const zone = (i: number) => {
    if (!v.knx) { setMsg('La passerelle IP/KNX ne répond pas : impossible de commander l’éclairage.'); return; }
    setZones(z => z.map((x, j) => (j === i ? !x : x)));
    if (!zones[i]) { onReussi('res-knx'); setMsg(`Télégramme envoyé par la passerelle 1.1.1 : ${ZONES[i].split(' · ')[0]} allumé à distance.`); }
  };
  const ouvrir = () => {
    if (!v.portail) { setMsg('L’automate du portail ne répond pas.'); return; }
    setPortail('ouverture');
    setTimeout(() => { setPortail('ouvert'); onReussi('res-portail'); setMsg('Le M221 a reçu l’ordre : portail ouvert, fin de course atteinte.'); }, 900);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/55 p-3" data-supervision>
      <div className="w-full max-w-[1100px] rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="m-0 font-title text-[20px] font-semibold">Essai · supervision de l’Écobike depuis la loge</h3>
          <button type="button" onClick={onClose} data-supervision-close className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[13px] font-semibold">✕ Fermer</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-2 rounded-xl bg-[#1B222C] p-3 text-[#E9EEF5]" data-supervision-ecran>
            <div className="flex items-center justify-between text-[13px]">
              <b>SUPERVISION ÉCOBIKE · {def.poste.nom}</b>
              <span data-en-ligne={v.enLigne ? '1' : '0'} className={v.enLigne ? 'font-bold text-[#35E36A]' : 'font-bold text-[#FF6B60]'}>
                ● {v.enLigne ? 'en ligne' : 'hors ligne'}
              </span>
            </div>
            {!v.enLigne ? (
              <div className="rounded-lg border border-[#FF6B60] p-4 text-center text-[13px]">
                Aucun équipement joignable : la loge ne voit pas le réseau.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {v.cameras.map((c, i) => (
                    <div key={c.id}>{mosaique ? <VueCamera n={i + 1} visible={c.visible} /> : (
                      <div className="grid h-full min-h-[60px] place-items-center rounded-md bg-[#11151A] text-[11px] text-[#AEB7C2]">{c.nom}</div>
                    )}</div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11.5px]">
                  <span className={`rounded px-1.5 py-0.5 ${v.nas ? 'bg-[#1E9E63]' : 'bg-[#D93A3A]'}`}>NAS {v.nas ? '● enregistrement' : 'absent'}</span>
                  <span className={`rounded px-1.5 py-0.5 ${v.onduleur ? 'bg-[#1E9E63]' : 'bg-[#D93A3A]'}`}>IMEON {v.onduleur ? '· PV 4 820 W · batteries 87 %' : 'absent'}</span>
                  <span className={`rounded px-1.5 py-0.5 ${v.knx ? 'bg-[#1E9E63]' : 'bg-[#D93A3A]'}`}>Éclairage KNX {v.knx ? '· 1.1.1' : 'absent'}</span>
                  <span className={`rounded px-1.5 py-0.5 ${v.portail ? 'bg-[#1E9E63]' : 'bg-[#D93A3A]'}`}>Portail {v.portail ? `· ${portail === 'ouvert' ? 'ouvert' : portail === 'ouverture' ? 'en ouverture…' : 'fermé'}` : 'absent'}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {ZONES.map((z, i) => (
                    <button key={z} type="button" data-zone={i + 1} onClick={() => zone(i)} disabled={!v.knx}
                      className={`min-h-touch rounded-md px-1 text-[10.5px] font-semibold disabled:opacity-40 ${zones[i] ? 'bg-[#FFD54A] text-[#141A21]' : 'bg-[#2B3340] text-[#CFD6DE]'}`}>
                      {zones[i] ? '💡 ' : ''}{z}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-1.5">
              <button type="button" data-sup-ping onClick={tester} className="min-h-touch rounded-lg bg-accent px-3 text-[12px] font-semibold text-[#141A21]">Tester la communication</button>
              <button type="button" data-sup-cam onClick={cams} disabled={!v.enLigne} className="min-h-touch rounded-lg bg-[#2F6FD1] px-3 text-[12px] font-semibold text-white disabled:opacity-40">Afficher les caméras</button>
              <button type="button" data-sup-portail onClick={ouvrir} disabled={!v.enLigne} className="min-h-touch rounded-lg bg-[#2B3340] px-3 text-[12px] font-semibold text-white disabled:opacity-40">Ouvrir le portail</button>
            </div>
            {pings && (
              <div className="grid grid-cols-3 gap-1 font-mono-num text-[11px]" data-sup-pings>
                {pings.map(p => <span key={p.ip} className={p.ok ? 'text-[#35E36A]' : 'text-[#FF6B60]'}>{p.ok ? '✓' : '✗'} {p.ip} {p.nom}</span>)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            <div>
              <b className="text-[13px]">Fiche d&apos;essais</b>
              <div className="mt-1 flex flex-col gap-0.5 text-[12.5px]">
                {ESSAIS_RESEAU.map(e => (
                  <div key={e.id} data-fiche={e.id}>{faits?.[e.id] ? <span className="font-bold text-good">☑</span> : '☐'} {e.label}</div>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-[#1B222C] p-2.5 text-[12.5px] text-[#E9EEF5]">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent font-bold text-[#141A21]">P</span>
              <span data-sup-msg>{msg}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
