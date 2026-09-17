'use client';

/**
 * Contenu des 11 étapes du parcours de dimensionnement (TP 14),
 * porté de la référence `docs/reference/illustration-pv-dimensionnement.html`.
 */

import React from 'react';
import {
  BATTERIES, FUSES, INVERTERS, LOCALITES, MPPTS, PANELS, REGIONS, SECTIONS, AC_CALIBRES,
  izOf, localityById,
} from '@/lib/data/pv/catalogue';
import { calc, fr, picksOf, PV_STEPS } from '@/lib/pv/dimensionnement';
import { usePvParcours } from '@/app/tp/[id]/pvStore';
import PanelCoupling from './PanelCoupling';
import BatCoupling from './BatCoupling';
import { AnsBox, Formula, Kv, NumStepper, OptionCards, Scroller } from './pieces';

const MOIS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

const TH = 'border-b border-[var(--line)] px-2 py-1.5 text-left font-title text-[10.5px] uppercase tracking-[.08em] text-muted';
const TD = 'border-b border-[var(--line)] px-2 py-1.5 align-middle';
const INPUT = 'min-h-[36px] w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 font-mono-num text-[12.5px]';

/** 1 · Bilan de puissance : tableau des récepteurs, total masqué. */
function Bilan() {
  const s = usePvParcours(x => x.s);
  const { setRecv, addRecv, delRecv, setAns, checkAns } = usePvParcours.getState();
  return (
    <>
      <Scroller>
        <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            <tr>
              {['Récepteur', 'P (W)', 'Qté', 'h/jour', 'Simultané', 'Démarrage', 'Wh/j', ''].map(h => (
                <th key={h} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.recv.map((r, k) => (
              <tr key={k} data-recv={k}>
                <td className={TD}>
                  <input aria-label={`Nom du récepteur ${k + 1}`} className={INPUT} value={r.n} onChange={e => setRecv(k, { n: e.target.value })} />
                </td>
                <td className={TD}>
                  <input aria-label={`Puissance du récepteur ${k + 1}`} data-f="P" type="number" className={`${INPUT} w-[80px]`} value={r.P} onChange={e => setRecv(k, { P: Number(e.target.value) })} />
                </td>
                <td className={TD}>
                  <input aria-label={`Quantité du récepteur ${k + 1}`} data-f="q" type="number" className={`${INPUT} w-[64px]`} value={r.q} onChange={e => setRecv(k, { q: Number(e.target.value) })} />
                </td>
                <td className={TD}>
                  <input aria-label={`Durée du récepteur ${k + 1}`} data-f="t" type="number" step="0.5" className={`${INPUT} w-[72px]`} value={r.t} onChange={e => setRecv(k, { t: Number(e.target.value) })} />
                </td>
                <td className={TD}>
                  <input aria-label={`Récepteur ${k + 1} simultané`} data-f="sim" type="checkbox" className="h-5 w-5" checked={r.sim} onChange={e => setRecv(k, { sim: e.target.checked })} />
                </td>
                <td className={TD}>
                  <input aria-label={`Récepteur ${k + 1} à courant de démarrage`} data-f="start" type="checkbox" className="h-5 w-5" checked={r.start} onChange={e => setRecv(k, { start: e.target.checked })} />
                </td>
                <td className={`${TD} font-mono-num`}>{fr(r.P * r.q * r.t, 0)}</td>
                <td className={TD}>
                  <button
                    type="button"
                    data-del={k}
                    aria-label={`Supprimer le récepteur ${k + 1}`}
                    onClick={() => delRecv(k)}
                    className="min-h-touch min-w-[40px] rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[13px]"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroller>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" data-add-recv onClick={addRecv} className="min-h-touch rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 text-[12.5px] font-semibold">
          + récepteur
        </button>
        <span className="text-[12px] text-muted">Le total est masqué : c&apos;est à toi de le calculer.</span>
      </div>
      <Formula>{'E = P × t          Ejour = Σ (P × n × t)   [Wh/j]'}</Formula>
      <AnsBox id="ej" question="Ejour = ?" unit="Wh/j" value={s.ans.ej} onChange={v => setAns('ej', v)} onCheck={() => checkAns('ej')} />
    </>
  );
}

/** 2 · Puissance simultanée. */
function Simultanee() {
  const s = usePvParcours(x => x.s);
  const { setAns, checkAns } = usePvParcours.getState();
  const rows: [string, string][] = s.recv
    .filter(r => r.sim)
    .map(r => [`${r.n} × ${r.q}${r.start ? ' ⚡ démarrage' : ''}`, `${r.P * r.q} W`]);
  return (
    <>
      <p className="m-0 text-[12.5px] leading-relaxed">
        Énergie quotidienne et puissance instantanée sont deux choses différentes. Coche à l&apos;étape 1 les
        récepteurs qui peuvent fonctionner en même temps, puis calcule la puissance simultanée. Les moteurs,
        pompes, réfrigérateurs et climatiseurs appellent plusieurs fois leur courant nominal au démarrage.
      </p>
      <div className="my-2"><Kv rows={rows} /></div>
      <Formula>{'Psim = Σ P × n   (récepteurs simultanés)'}</Formula>
      <AnsBox id="ps" question="Psimultanée = ?" unit="W" value={s.ans.ps} onChange={v => setAns('ps', v)} onCheck={() => checkAns('ps')} />
    </>
  );
}

/** 3 · Localisation et ressource solaire (PVGIS). */
function Localisation() {
  const s = usePvParcours(x => x.s);
  const loading = usePvParcours(x => x.solarLoading);
  const { setLoc, setRegion, setEta, setWorst, setAns, checkAns } = usePvParcours.getState();
  const loc = localityById(s.locId);
  const villes = LOCALITES.filter(l => l.region === loc.region);
  const sol = s.solar;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[12px] text-muted" htmlFor="selC">Pays → région</label>
        <select
          id="selC" data-sel="region" value={loc.region}
          onChange={e => setRegion(e.target.value)}
          className="min-h-touch rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[13px]"
        >
          {REGIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="text-[12px] text-muted" htmlFor="selV">Ville</label>
        <select
          id="selV" data-sel="ville" value={loc.id}
          onChange={e => setLoc(e.target.value)}
          className="min-h-touch rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[13px]"
        >
          {villes.map(l => <option key={l.id} value={l.id}>{l.ville}</option>)}
        </select>
      </div>

      <div className="my-2">
        <Kv rows={[
          ['Irradiation moyenne annuelle (HSP)', `${fr(sol?.hsp ?? loc.hsp, 1)} h/j`],
          ['Mois le plus défavorable', `${fr(sol?.min ?? loc.min, 1)} h/j`],
          ['Inclinaison optimale', `${loc.tilt}°`],
          ['Température mini / maxi', `${loc.tmin} / ${loc.tmax} °C`],
          ['Coordonnées', `${fr(loc.lat, 2)}° · ${fr(loc.lon, 2)}°`],
        ]} />
      </div>

      <section data-pvgis={sol?.source ?? 'chargement'} className="my-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
        <h3 className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">
          Production mensuelle PVGIS · pour 1 kWc installé
        </h3>
        {loading && <p className="m-0 text-[12px] text-muted">Interrogation de la base d&apos;irradiation…</p>}
        {!loading && sol?.source === 'pvgis' && sol.monthly.length > 0 && (
          <>
            <Scroller>
              <table className="w-full min-w-[560px] border-collapse text-[12px]">
                <thead>
                  <tr><th className={TH}>Mois</th>{sol.monthly.map(m => <th key={m.month} className={TH}>{MOIS[m.month - 1]}</th>)}</tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${TD} text-muted`}>E_m (kWh)</td>
                    {sol.monthly.map(m => <td key={m.month} className={`${TD} font-mono-num`}>{fr(m.em, 0)}</td>)}
                  </tr>
                  <tr>
                    <td className={`${TD} text-muted`}>HSP (h/j)</td>
                    {sol.monthly.map(m => (
                      <td key={m.month} className={`${TD} font-mono-num ${m.hsp === sol.min ? 'font-bold text-crit' : ''}`}>{fr(m.hsp, 1)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </Scroller>
            <p className="m-0 mt-1.5 text-[11.5px] leading-relaxed text-muted">
              Source : PVGIS (JRC, Commission européenne), pertes système {sol.loss} %. HSP ≈ E_d / (1 − pertes) :
              {' '}{fr(sol.hsp, 1)} h/j en moyenne, {fr(sol.min, 1)} h/j au mois le plus faible.
            </p>
          </>
        )}
        {!loading && sol?.source !== 'pvgis' && (
          <p className="m-0 text-[12px] leading-relaxed text-muted">
            <b>Valeurs indicatives</b> — la base PVGIS n&apos;est pas joignable depuis cet appareil : le TP utilise
            la table locale du catalogue pour {loc.ville}. Une installation de 3 kWc à Cayenne ne produit pas
            comme 3 kWc à Lille.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] text-muted">Dimensionner sur</span>
        <label className="flex min-h-touch items-center gap-1.5 text-[12.5px]">
          <input type="radio" name="worst" data-worst="1" checked={s.worst} onChange={() => setWorst(true)} />
          le mois le plus défavorable
        </label>
        <label className="flex min-h-touch items-center gap-1.5 text-[12.5px]">
          <input type="radio" name="worst" data-worst="0" checked={!s.worst} onChange={() => setWorst(false)} />
          la moyenne annuelle
        </label>
        <label className="flex min-h-touch items-center gap-1.5 text-[12px] text-muted" htmlFor="eta">η global</label>
        <input
          id="eta" data-eta type="number" step="0.01" value={s.eta}
          onChange={e => setEta(Number(e.target.value))}
          className="min-h-touch w-[86px] rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 font-mono-num text-[13px]"
        />
      </div>

      <Formula>{'Ppv ≈ Ejour / (HSP × ηglobal)   [Wc]'}</Formula>
      <AnsBox id="ppv" question="Ppv nécessaire = ?" unit="Wc" value={s.ans.ppv} onChange={v => setAns('ppv', v)} onCheck={() => checkAns('ppv')} />
    </>
  );
}

/** 4 · Tension du système. */
function Tension() {
  const s = usePvParcours(x => x.s);
  const { setUbat, setAns, checkAns } = usePvParcours.getState();
  return (
    <>
      <p className="m-0 text-[12.5px] leading-relaxed">
        À puissance égale, plus la tension du parc est élevée, plus le courant est faible : câbles, fusibles et
        chutes de tension plus raisonnables.
      </p>
      <Formula>{'I = P / U'}</Formula>
      <div className="my-2">
        <Kv rows={[['2 400 W en 12 V', '200 A'], ['2 400 W en 24 V', '100 A'], ['2 400 W en 48 V', '50 A']]} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-muted">Tension du parc batterie</span>
        {([12, 24, 48] as const).map(u => (
          <button
            key={u}
            type="button"
            data-ubat={u}
            aria-pressed={s.ubat === u}
            onClick={() => setUbat(u)}
            className={`min-h-touch rounded-lg px-4 text-[13px] font-semibold ${s.ubat === u ? 'bg-accent text-[var(--accent-ink)]' : 'bg-[var(--surface-2)] text-ink'}`}
          >
            {u} V
          </button>
        ))}
      </div>
      <Scroller>
        <table className="mt-2 w-full min-w-[420px] border-collapse text-[12.5px]">
          <thead><tr><th className={TH}>Puissance installation</th><th className={TH}>Tension à envisager (règle indicative)</th></tr></thead>
          <tbody>
            <tr><td className={TD}>Petite (&lt; 800 W)</td><td className={TD}>12 V</td></tr>
            <tr><td className={TD}>Petite / moyenne (&lt; 2 kW)</td><td className={TD}>24 V</td></tr>
            <tr><td className={TD}>Moyenne / forte</td><td className={TD}>48 V</td></tr>
          </tbody>
        </table>
      </Scroller>
      <AnsBox id="i" question="Courant côté batterie pour ta puissance simultanée = ?" unit="A" value={s.ans.i} onChange={v => setAns('i', v)} onCheck={() => checkAns('i')} />
    </>
  );
}

/** 5 · Panneaux et couplage. */
function Panneaux() {
  const s = usePvParcours(x => x.s);
  const { setPanel, setNs, setNp, setAns, checkAns } = usePvParcours.getState();
  const C = calc(s);
  const { panel } = picksOf(s);
  return (
    <>
      <OptionCards
        name="Module photovoltaïque"
        list={PANELS}
        selected={s.panelId}
        onPick={setPanel}
        render={o => (
          <>
            <b className="block text-[13px]">{o.name}</b>
            <small className="block font-mono-num text-[11px] leading-snug text-muted">
              Pmax {o.P} Wc · Vmp {o.Vmp} V · Imp {o.Imp} A<br />
              Voc {o.Voc} V · Isc {o.Isc} A · {o.k} %/°C · {o.S} m²
            </small>
          </>
        )}
      />
      <div className="my-3 flex flex-wrap items-center gap-4">
        <NumStepper label="Modules en série (Ns)" name="ns" value={s.ns} onStep={setNs} />
        <NumStepper label="Chaînes en parallèle (Np)" name="np" value={s.np} onStep={setNp} />
        <span className="text-[12px] text-muted">besoin ≈ {fr(C.Ppv, 0)} Wc → {C.Npan} modules mini</span>
      </div>
      <PanelCoupling
        panel={panel}
        ns={s.ns}
        np={s.np}
        caption={`${s.ns}S${s.np}P · ${fr(C.PpvReal, 0)} Wc · Vmp ${fr(C.Vmp, 0)} V · Imp ${fr(C.Imp, 1)} A · Voc ${fr(C.Voc, 0)} V · Isc ${fr(C.Isc, 1)} A`}
      />
      <Formula>
        {`Série     : V s'additionnent, I identique   → Vmp = ${panel.Vmp} × Ns
Parallèle : V identique, I s'additionnent → Imp = ${panel.Imp} × Np
Voc froid = Voc × (1 + k × (Tmin − 25))   → doit rester < Voc max du MPPT`}
      </Formula>
      <AnsBox id="vmp" question="Vmp champ = ?" unit="V" value={s.ans.vmp} onChange={v => setAns('vmp', v)} onCheck={() => checkAns('vmp')} />
      <AnsBox id="imp" question="Imp champ = ?" unit="A" value={s.ans.imp} onChange={v => setAns('imp', v)} onCheck={() => checkAns('imp')} />
    </>
  );
}

/** 6 · Batteries. */
function Batteries() {
  const s = usePvParcours(x => x.s);
  const { setBat, setBns, setBnp, setAuto, setAns, checkAns } = usePvParcours.getState();
  const C = calc(s);
  const { bat } = picksOf(s);
  return (
    <>
      <OptionCards
        name="Batterie"
        list={BATTERIES}
        selected={s.batId}
        onPick={setBat}
        render={o => (
          <>
            <b className="block text-[13px]">{o.name}</b>
            <small className="block font-mono-num text-[11px] leading-snug text-muted">
              DoD {o.dod * 100} % · η {o.eta} · {o.cyc} cycles · {o.imax} A max{o.bms ? ' · BMS' : ''}
            </small>
          </>
        )}
      />
      <div className="my-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[12px] text-muted" htmlFor="auto">
          Autonomie souhaitée
          <input
            id="auto" data-auto type="number" value={s.auto}
            onChange={e => setAuto(Number(e.target.value))}
            className="min-h-touch w-[70px] rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 font-mono-num text-[13px]"
          />
          jours
        </label>
        <NumStepper label="Batteries en série" name="bns" value={s.bns} onStep={setBns} />
        <NumStepper label="Branches en parallèle" name="bnp" value={s.bnp} onStep={setBnp} />
      </div>
      <BatCoupling
        bat={bat}
        bns={s.bns}
        bnp={s.bnp}
        caption={`${s.bns}S${s.bnp}P · ${fr(C.Ubat, 1)} V / ${fr(C.Ah, 0)} Ah = ${fr(C.Ewh / 1000, 1)} kWh`}
      />
      <Formula>
        {`Cbat(Wh) = Ejour × autonomie / (DoD × η)        Cbat(Ah) = Cbat(Wh) / Ubat
Série : tensions s'additionnent · Parallèle : capacités s'additionnent`}
      </Formula>
      <Scroller>
        <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
          <thead><tr><th className={TH}>Critère</th><th className={TH}>Plomb</th><th className={TH}>LiFePO₄</th></tr></thead>
          <tbody>
            {[['Prix initial', 'faible', 'plus élevé'], ['Énergie utilisable', '≈ 50 %', '≈ 80 %'], ['Cycles', '≈ 800', '≈ 4 000'], ['BMS', 'non', 'indispensable'], ['Rendement', '≈ 85 %', '≈ 95 %']].map(row => (
              <tr key={row[0]}>{row.map((c, i) => <td key={i} className={TD}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </Scroller>
      <AnsBox id="cb" question="Capacité du parc nécessaire = ?" unit={`Ah sous ${s.ubat} V`} value={s.ans.cb} onChange={v => setAns('cb', v)} onCheck={() => checkAns('cb')} />
    </>
  );
}

/** 7 · Régulateur. */
function Regulateur() {
  const s = usePvParcours(x => x.s);
  const { setMppt, setAns, checkAns } = usePvParcours.getState();
  const C = calc(s);
  const { loc } = picksOf(s);
  return (
    <>
      <OptionCards
        name="Régulateur de charge"
        list={MPPTS}
        selected={s.mpptId}
        onPick={setMppt}
        render={o => (
          <>
            <b className="block text-[13px]">{o.name}</b>
            <small className="block font-mono-num text-[11px] leading-snug text-muted">
              {o.type} · Voc max {o.vocmax} V · {o.ich} A · {o.ubat.join('/')} V<br />
              Pmax {Object.entries(o.pmax).map(([u, p]) => `${u} V : ${p} W`).join(' · ')}
            </small>
          </>
        )}
      />
      <Formula>
        {`Contrôles bloquants : Voc froid champ < Voc max MPPT · Ich ≈ Ppv / Ubat ≤ calibre · Ppv ≤ Pmax(Ubat)
PWM : simple mais sans conversion (pertes si Vmp ≫ Ubat) · MPPT : recherche du point de puissance maximale`}
      </Formula>
      <div className="my-2">
        <Kv rows={[
          [`Champ : Voc à 25 °C / au froid (${loc.tmin} °C)`, `${fr(C.Voc, 0)} / ${fr(C.VocCold, 0)} V`],
          ['Puissance PV', `${fr(C.PpvReal, 0)} Wc`],
        ]} />
      </div>
      <AnsBox id="ich" question="Courant de charge ≈ ?" unit="A" value={s.ans.ich} onChange={v => setAns('ich', v)} onCheck={() => checkAns('ich')} />
    </>
  );
}

/** 8 · Onduleur. */
function Onduleur() {
  const s = usePvParcours(x => x.s);
  const { setInv, setRecv, setAns, checkAns } = usePvParcours.getState();
  const C = calc(s);
  return (
    <>
      <OptionCards
        name="Onduleur"
        list={INVERTERS}
        selected={s.invId}
        onPick={setInv}
        render={o => (
          <>
            <b className="block text-[13px]">{o.name}</b>
            <small className="block font-mono-num text-[11px] leading-snug text-muted">
              {o.U} V → 230 V / 50 Hz · {o.P} W continus · pointe {o.peak} W · η {o.eta}
            </small>
          </>
        )}
      />
      <div className="my-2">
        <Kv rows={[
          ['Puissance simultanée', `${fr(C.Psim, 0)} W`],
          ['Pointe estimée au démarrage (moteurs × 2)', `${fr(C.Pstart, 0)} W`],
        ]} />
      </div>
      <Formula>{'Ponduleur ≥ Psim × 1,25   ·   Ppointe onduleur ≥ pointe de démarrage   ·   VA ≠ W'}</Formula>
      <div className="flex flex-wrap gap-2">
        {s.recv.map((r, i) => (r.sim ? (
          <button
            key={i}
            type="button"
            data-startr={i}
            aria-pressed={r.start}
            onClick={() => setRecv(i, { start: !r.start })}
            className={`min-h-touch rounded-full border px-3 text-[12px] ${r.start ? 'border-accent bg-accent/15' : 'border-[var(--line)] bg-[var(--surface)]'}`}
          >
            {r.start ? '☑' : '☐'} {r.n} : courant de démarrage
          </button>
        ) : null))}
      </div>
      <AnsBox id="pinv" question="Puissance onduleur avec marge 25 % = ?" unit="W" value={s.ans.pinv} onChange={v => setAns('pinv', v)} onCheck={() => checkAns('pinv')} />
    </>
  );
}

/** 9 · Câbles. */
function Cables() {
  const s = usePvParcours(x => x.s);
  const { setCab, setAns, checkAns } = usePvParcours.getState();
  const C = calc(s);
  const c = s.cab;
  const sel = 'min-h-touch rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 font-mono-num text-[12.5px]';
  return (
    <>
      <Formula>
        {`ΔU = 2 × ρ × L × I / S   →   S = 2 × ρ × L × I / ΔU      ρcuivre ≈ 0,0175 Ω·mm²/m
Deux vérifications : échauffement (I ≤ Iz du câble) ET chute de tension (ΔU ≤ ΔU maxi)`}
      </Formula>
      <Scroller>
        <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead>
            <tr>{['Liaison', 'Courant retenu', 'Longueur aller (m)', 'ΔU maxi', 'Section choisie', 'Iz'].map(h => <th key={h} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td className={TD}>PV → MPPT</td>
              <td className={`${TD} font-mono-num`}>1,25 × Isc = {fr(C.Ipvmax, 1)} A</td>
              <td className={TD}>
                <input aria-label="Longueur PV → MPPT" data-c="Lpv" type="number" className={`${INPUT} w-[80px]`} value={c.Lpv} onChange={e => setCab('Lpv', Number(e.target.value))} />
              </td>
              <td className={TD}>
                <select aria-label="Chute de tension maxi côté PV" data-c="dupv" className={sel} value={c.dupv} onChange={e => setCab('dupv', Number(e.target.value))}>
                  {[0.01, 0.02, 0.03].map(v => <option key={v} value={v}>{v * 100} %</option>)}
                </select>
              </td>
              <td className={TD}>
                <select aria-label="Section PV → MPPT" data-c="Spv" className={sel} value={c.Spv} onChange={e => setCab('Spv', Number(e.target.value))}>
                  {SECTIONS.map(x => <option key={x[0]} value={x[0]}>{x[0]} mm²</option>)}
                </select>
              </td>
              <td className={`${TD} font-mono-num`}>{izOf(c.Spv)} A</td>
            </tr>
            <tr>
              <td className={TD}>Batterie → onduleur</td>
              <td className={`${TD} font-mono-num`}>P/(U×η) = {fr(C.Iinv, 1)} A</td>
              <td className={TD}>
                <input aria-label="Longueur batterie → onduleur" data-c="Lbat" type="number" className={`${INPUT} w-[80px]`} value={c.Lbat} onChange={e => setCab('Lbat', Number(e.target.value))} />
              </td>
              <td className={TD}>
                <select aria-label="Chute de tension maxi côté batterie" data-c="dubat" className={sel} value={c.dubat} onChange={e => setCab('dubat', Number(e.target.value))}>
                  {[0.01, 0.02, 0.03].map(v => <option key={v} value={v}>{v * 100} %</option>)}
                </select>
              </td>
              <td className={TD}>
                <select aria-label="Section batterie → onduleur" data-c="Sbat" className={sel} value={c.Sbat} onChange={e => setCab('Sbat', Number(e.target.value))}>
                  {SECTIONS.map(x => <option key={x[0]} value={x[0]}>{x[0]} mm²</option>)}
                </select>
              </td>
              <td className={`${TD} font-mono-num`}>{izOf(c.Sbat)} A</td>
            </tr>
          </tbody>
        </table>
      </Scroller>
      <p className="m-0 mt-1.5 text-[11.5px] leading-relaxed text-muted">
        Iz indicatifs (cuivre, PVC, pose libre) pour l&apos;exercice ; un dimensionnement professionnel tient
        compte du mode de pose, de la température et du groupement.
      </p>
      <AnsBox id="iinv" question="Courant onduleur → batterie = ?" unit="A" value={s.ans.iinv} onChange={v => setAns('iinv', v)} onCheck={() => checkAns('iinv')} />
    </>
  );
}

/** 10 · Protections. */
function Protections() {
  const s = usePvParcours(x => x.s);
  const { setProt, toggleProt } = usePvParcours.getState();
  const C = calc(s);
  const { panel } = picksOf(s);
  const p = s.prot;
  const sel = 'min-h-touch rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 font-mono-num text-[12.5px]';
  return (
    <>
      <Formula>
        {`courant d'utilisation ≤ calibre de la protection ≤ courant admissible du câble (Iz)
DC ≠ AC : tension assignée DC, pouvoir de coupure DC, polarité, nombre de pôles`}
      </Formula>
      <Scroller>
        <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
          <thead><tr>{['Protection', 'Contrainte', 'Choix'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td className={TD}>Fusibles de string gPV (coffret DC)</td>
              <td className={`${TD} font-mono-num`}>par string : ≥ 1,25 × Isc module = {fr(panel.Isc * 1.25, 0)} A · ≤ 2,4 × Isc = {fr(panel.Isc * 2.4, 0)} A · 1000 V DC</td>
              <td className={TD}>
                <select aria-label="Calibre des fusibles de string" data-p="fpv" className={sel} value={p.fpv} onChange={e => setProt('fpv', Number(e.target.value))}>
                  {FUSES.map(f => <option key={f} value={f}>{f}</option>)}
                </select> A
              </td>
            </tr>
            <tr>
              <td className={TD}>Fusible principal batterie + sectionnement</td>
              <td className={`${TD} font-mono-num`}>≥ {fr(C.Iinv, 0)} A · ≤ Iz {izOf(s.cab.Sbat)} A · PdC élevé</td>
              <td className={TD}>
                <select aria-label="Calibre du fusible batterie" data-p="fbat" className={sel} value={p.fbat} onChange={e => setProt('fbat', Number(e.target.value))}>
                  {FUSES.map(f => <option key={f} value={f}>{f}</option>)}
                </select> A
              </td>
            </tr>
            <tr>
              <td className={TD}>Disjoncteur AC sortie onduleur</td>
              <td className={`${TD} font-mono-num`}>I = P / 230 = {fr(C.Iac, 1)} A</td>
              <td className={TD}>
                <select aria-label="Calibre du disjoncteur AC" data-p="qac" className={sel} value={p.qac} onChange={e => setProt('qac', Number(e.target.value))}>
                  {AC_CALIBRES.map(f => <option key={f} value={f}>{f}</option>)}
                </select> A courbe C
              </td>
            </tr>
            <tr>
              <td className={TD}>DDR 30 mA</td>
              <td className={TD}>protection des personnes côté AC</td>
              <td className={TD}>
                <label className="flex min-h-touch items-center gap-1.5">
                  <input type="checkbox" data-p="ddr" className="h-5 w-5" checked={p.ddr} onChange={() => toggleProt('ddr')} /> prévu
                </label>
              </td>
            </tr>
            <tr>
              <td className={TD}>Parafoudre DC</td>
              <td className={TD}>selon analyse de risque</td>
              <td className={TD}>
                <label className="flex min-h-touch items-center gap-1.5">
                  <input type="checkbox" data-p="dcspd" className="h-5 w-5" checked={p.dcspd} onChange={() => toggleProt('dcspd')} /> prévu
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </Scroller>
      <Formula>
        {`Champ PV → fusibles de strings → coffret DC (parafoudre, sectionneur DC) → MPPT → fusible DC → BATTERIES
→ fusible principal + sectionnement → ONDULEUR → disjoncteur AC → DDR → tableau → récepteurs
+ mise à la terre, liaisons équipotentielles, relation neutre-terre selon l'onduleur`}
      </Formula>
    </>
  );
}

/** Contenu de l'étape courante (les étapes 1 à 10 ; la note de calcul est rendue par le client). */
export default function StepContent({ step }: { step: number }) {
  switch (step) {
    case 0: return <Bilan />;
    case 1: return <Simultanee />;
    case 2: return <Localisation />;
    case 3: return <Tension />;
    case 4: return <Panneaux />;
    case 5: return <Batteries />;
    case 6: return <Regulateur />;
    case 7: return <Onduleur />;
    case 8: return <Cables />;
    case 9: return <Protections />;
    default: return <p className="text-[12.5px] text-muted">{PV_STEPS[step]?.sub}</p>;
  }
}
