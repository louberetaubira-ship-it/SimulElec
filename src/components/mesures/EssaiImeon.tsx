'use client';

/**
 * Essai des quatre situations de fonctionnement d'une installation photovoltaïque
 * hybride, sur le modèle d'`EssaiKnxLocal.tsx` et d'`EssaisPortail.tsx` : une modale
 * plein écran où l'élève fait varier l'ensoleillement et la consommation, coupe le
 * réseau, et lit sur l'écran de supervision de l'onduleur où va l'énergie.
 *
 * La répartition des puissances reprend la logique validée de la maquette : le champ
 * alimente d'abord la consommation, les batteries complètent (décharge plafonnée) ou
 * absorbent le surplus (charge plafonnée), le réseau fournit le reste — et reçoit le
 * surplus seulement si l'injection est autorisée. Chaque situation reconnue coche sa
 * ligne de la fiche d'essais (`ESSAIS_PV`, ids `pv-nuit`, `pv-ilot`, `pv-def`, `pv-sur`).
 *
 * Aucun repère n'est écrit ici : l'organe de coupure du réseau et l'onduleur sont
 * nommés par le TP (`repReseau`, `repOnduleur`).
 */
import React from 'react';
import type { EssaiPvDef } from '@/lib/types';
import { ESSAIS_PV } from '@/lib/sim/progress';

/** Grandeurs de l'installation, et l'injection telle qu'elle est réglée à l'écran. */
export type EssaiPvDonnees = EssaiPvDef & { injection: boolean };

type Situation = 'nuit' | 'ilot' | 'def' | 'sur';

const LIBELLE: Record<Situation, string> = {
  nuit: 'Pas de production : le réseau alimente l’Écobike',
  ilot: 'Réseau absent : les batteries alimentent (site isolé)',
  def: 'Déficit : le champ PV et les batteries alimentent ensemble',
  sur: 'Surplus : le champ PV alimente et charge les batteries',
};

/** Répartition des puissances (W) : positive = fournie à l'Écobike. */
export function repartition(d: EssaiPvDonnees, soleil: number, conso: number, reseau: boolean) {
  const ppv = Math.round((soleil / 100) * d.pc * 0.8);
  const pl = Math.round((conso / 100) * d.pMax);
  let pb = 0; // batterie : + décharge, − charge
  let pg = 0; // réseau : + soutirage, − injection
  let sit: Situation;
  if (ppv === 0 && reseau) {
    pg = pl;
    sit = 'nuit';
  } else if (!reseau) {
    if (ppv >= pl) {
      pb = -Math.min(ppv - pl, d.charge);
      sit = 'sur';
    } else {
      pb = pl - ppv;
      sit = 'ilot';
    }
  } else if (ppv < pl) {
    pb = Math.min(pl - ppv, d.decharge);
    pg = pl - ppv - pb;
    sit = 'def';
  } else {
    pb = -Math.min(ppv - pl, d.charge);
    const reste = ppv - pl + pb;
    if (d.injection && reste > 0) pg = -reste;
    sit = 'sur';
  }
  return { ppv, pl, pb, pg, sit };
}

const fmt = (w: number) => Math.abs(w).toLocaleString('fr-FR');

export default function EssaiImeon({
  donnees, repReseau, repOnduleur, faits, onReussi, onClose,
}: {
  donnees: EssaiPvDonnees;
  repReseau: string;
  repOnduleur: string;
  faits: Record<string, boolean> | undefined;
  onReussi: (id: string) => void;
  onClose: () => void;
}) {
  const [soleil, setSoleil] = React.useState(70);
  const [conso, setConso] = React.useState(40);
  const [reseau, setReseau] = React.useState(true);
  // on ne coche une situation qu'après une action de l'élève : l'état d'ouverture ne compte pas
  const [touche, setTouche] = React.useState(false);
  const r = repartition(donnees, soleil, conso, reseau);
  const reussi = React.useRef(onReussi);
  reussi.current = onReussi;

  React.useEffect(() => {
    if (touche) reussi.current(`pv-${r.sit}`);
  }, [touche, r.sit]);

  const pv1 = Math.round(r.ppv / 2);
  const conseil = r.sit === 'nuit'
    ? `Aucune production : ${repOnduleur} soutire au réseau toute la consommation. Les batteries sont gardées pour une coupure.`
    : r.sit === 'ilot'
      ? `Le réseau est coupé (${repReseau} ouvert) : ${repOnduleur} passe en îlotage, les batteries fournissent ce que le champ ne donne pas.`
      : r.sit === 'def'
        ? 'Le champ ne suffit pas : les batteries complètent, et le réseau seulement au-delà de leur décharge maximale.'
        : donnees.injection
          ? 'Surplus : la consommation est couverte, les batteries se chargent, le reste part sur le réseau.'
          : 'Surplus : la consommation est couverte, les batteries se chargent. Injection désactivée : rien ne part sur le réseau.';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/55 p-3" data-essai-pv>
      <div className="w-full max-w-[1000px] rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="m-0 font-title text-[20px] font-semibold">Essai · les quatre situations de fonctionnement</h3>
          <button type="button" onClick={onClose} data-essai-pv-close className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[13px] font-semibold">✕ Fermer</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <div className="rounded-xl bg-[#0F1A2A] p-3 font-mono-num text-[12.5px] leading-relaxed text-[#CFE3FF]" data-essai-pv-ecran>
              <b className="text-white">{repOnduleur}</b> · supervision{' '}
              <span className={reseau ? 'text-[#35E36A]' : 'text-[#FF6B60]'}>● {reseau ? 'réseau présent' : 'réseau absent'}</span>
              <br />
              PV1 <b className="text-white">{fmt(pv1)} W</b> · {donnees.umpp} V &nbsp; PV2 <b className="text-white">{fmt(r.ppv - pv1)} W</b> · {donnees.umpp} V
              <br />
              Batterie <b className="text-white">{r.pb > 0 ? '− ' : r.pb < 0 ? '+ ' : ''}{fmt(r.pb)} W</b> ({r.pb > 0 ? 'décharge' : r.pb < 0 ? 'charge' : 'repos'}) · {String(donnees.ubat).replace('.', ',')} V
              <br />
              Réseau <b className="text-white">{r.pg > 0 ? `← ${fmt(r.pg)}` : r.pg < 0 ? `→ ${fmt(r.pg)}` : '0'} W</b>
              {!donnees.injection ? ' (injection désactivée)' : ''} &nbsp; Sortie AC <b className="text-white">{fmt(r.pl)} W</b>
              <br />
              <span className="text-[#FFD54A]" data-essai-pv-situation={r.sit}>Situation : {LIBELLE[r.sit]}</span>
            </div>
            <label className="flex items-center gap-2 text-[12px]">
              <span className="w-32 text-muted">Ensoleillement</span>
              <input
                type="range" min={0} max={100} value={soleil} data-essai-soleil
                onChange={e => { setSoleil(Number(e.target.value)); setTouche(true); }}
                className="h-touch flex-1 accent-[var(--accent)]"
              />
              <span className="w-10 font-mono-num">{soleil} %</span>
            </label>
            <label className="flex items-center gap-2 text-[12px]">
              <span className="w-32 text-muted">Consommation</span>
              <input
                type="range" min={0} max={100} value={conso} data-essai-conso
                onChange={e => { setConso(Number(e.target.value)); setTouche(true); }}
                className="h-touch flex-1 accent-[var(--accent)]"
              />
              <span className="w-10 font-mono-num">{conso} %</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button" data-essai-reseau
                onClick={() => { setReseau(v => !v); setTouche(true); }}
                className="min-h-touch rounded-lg bg-[#1B222C] px-3 text-[12.5px] font-semibold text-white"
              >
                {reseau ? `Couper le réseau (${repReseau})` : `Rétablir le réseau (${repReseau})`}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <div>
              <b className="text-[13px]">Fiche d&apos;essais</b>
              <div className="mt-1 flex flex-col gap-0.5 text-[12.5px]">
                {ESSAIS_PV.map(e => (
                  <div key={e.id} data-fiche={e.id}>{faits?.[e.id] ? <span className="font-bold text-good">☑</span> : '☐'} {e.label}</div>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-[#1B222C] p-2.5 text-[12.5px] text-[#E9EEF5]">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent font-bold text-[#141A21]">P</span>
              <span>{touche ? conseil : 'Fais varier l’ensoleillement et la consommation, puis coupe le réseau : chaque situation reconnue se coche sur la fiche.'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
