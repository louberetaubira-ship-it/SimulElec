'use client';

/**
 * Étude & dimensionnement embarquée dans la PRÉPARATION d'un TP photovoltaïque.
 *
 * On réunit ici, EN AMONT du câblage, ce que la fusion avait laissé de côté : le
 * bilan de puissance, le dimensionnement du champ et du parc, les montages
 * (couplage série/parallèle des panneaux et des batteries) et la justification
 * des appareillages. C'est cette étude qui rend le choix du matériel et le
 * câblage évidents à l'élève.
 *
 * État LOCAL (pas de tentative séparée) : on réutilise le moteur pur `calc()` et
 * le catalogue réel, plus les dessins de couplage `PanelCoupling` / `BatCoupling`.
 * L'étude est un support de raisonnement ; la validation notée reste portée par
 * les questions d'identification de la préparation.
 */

import React from 'react';
import { calc, fr, initialPvState, picksOf, type PvState } from '@/lib/pv/dimensionnement';
import { PANELS } from '@/lib/data/pv/catalogue';
import PanelCoupling from '@/components/pv/PanelCoupling';
import BatCoupling from '@/components/pv/BatCoupling';

/** État de départ adapté à l'auberge 24 V (onduleur MultiPlus 24/3000). */
function auberge24(): PvState {
  return {
    ...initialPvState(),
    ubat: 24,
    worst: true,
    eta: 0.7,
    panelId: 'p250',
    ns: 3, np: 2,
    batId: 'lfp200',
    bns: 2, bnp: 2,
    auto: 2,
    mpptId: 'm15070',
    invId: 'i24_3000',
  };
}

const CARD = 'rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3';
const H = 'font-title text-[15px] font-semibold';
const TH = 'px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[.05em] text-muted';
const TD = 'px-2 py-1.5 align-middle text-[12.5px]';
const NUM = 'w-[70px] rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono-num text-[12.5px]';

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? 'bg-good/15 text-good' : 'bg-crit/15 text-crit'}`}>
      {children}
    </span>
  );
}

function Kpi({ v, l }: { v: string; l: string }) {
  return (
    <div className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2">
      <div className="font-mono-num text-[18px] font-bold text-accent">{v}</div>
      <div className="text-[11px] text-muted">{l}</div>
    </div>
  );
}

export default function PreparationEtudePv() {
  const [s, setS] = React.useState<PvState>(auberge24);
  const C = React.useMemo(() => calc(s), [s]);
  const { panel, bat, mppt, inv, loc } = picksOf(s);

  const patch = (p: Partial<PvState>) => setS(x => ({ ...x, ...p }));
  const setRecv = (i: number, p: Partial<PvState['recv'][number]>) =>
    setS(x => ({ ...x, recv: x.recv.map((r, k) => (k === i ? { ...r, ...p } : r)) }));

  const vocOk = C.VocCold < mppt.vocmax;
  const ichOk = C.Ich <= mppt.ich;
  const parc24 = C.Ubat >= 24 && C.Ubat < 30;

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3">
        <h3 className={H}>Étude &amp; dimensionnement — à faire avant le montage</h3>
        <p className="m-0 mt-1 text-[12px] leading-relaxed text-muted">
          C&apos;est le bureau d&apos;étude : le bilan et les calculs justifient le choix des
          appareils que tu poseras et câbleras ensuite. Modifie les valeurs, tout se recalcule.
        </p>
      </div>

      {/* 1 · Bilan de puissance */}
      <div className={CARD}>
        <h4 className={H}>1 · Bilan de puissance — énergie journalière</h4>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className={TH}>Récepteur</th><th className={TH}>P (W)</th><th className={TH}>Qté</th>
                <th className={TH}>h/j</th><th className={TH}>Simult.</th><th className={TH}>Wh/j</th>
              </tr>
            </thead>
            <tbody>
              {s.recv.map((r, i) => (
                <tr key={i} className="border-b border-[var(--line)]">
                  <td className={TD}>{r.n}</td>
                  <td className={TD}><input type="number" className={NUM} value={r.P} onChange={e => setRecv(i, { P: +e.target.value })} /></td>
                  <td className={TD}><input type="number" className={`${NUM} w-[54px]`} value={r.q} onChange={e => setRecv(i, { q: +e.target.value })} /></td>
                  <td className={TD}><input type="number" step="0.5" className={`${NUM} w-[60px]`} value={r.t} onChange={e => setRecv(i, { t: +e.target.value })} /></td>
                  <td className={TD}><input type="checkbox" className="h-4 w-4" checked={r.sim} onChange={e => setRecv(i, { sim: e.target.checked })} /></td>
                  <td className={`${TD} font-mono-num`}>{fr(r.P * r.q * r.t, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex gap-2">
          <Kpi v={`${fr(C.Ejour, 0)} Wh/j`} l="Énergie journalière Eⱼ = Σ P × Qté × h" />
          <Kpi v={`${fr(C.Psim, 0)} W`} l="Puissance simultanée (récepteurs cochés)" />
        </div>
      </div>

      {/* 2 · Ressource & tension */}
      <div className={CARD}>
        <h4 className={H}>2 · Ressource solaire &amp; tension du système</h4>
        <div className="mt-2 flex flex-wrap items-end gap-3 text-[12px]">
          <label className="flex flex-col gap-1 font-semibold text-muted">HSP retenu
            <select className={NUM + ' w-auto'} value={s.worst ? 'w' : 'y'} onChange={e => patch({ worst: e.target.value === 'w' })}>
              <option value="w">{loc.ville} · mois défavorable {fr(loc.min, 1)} h</option>
              <option value="y">{loc.ville} · annuel {fr(loc.hsp, 1)} h</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 font-semibold text-muted">Rendement η
            <input type="number" step="0.05" min="0.4" max="0.9" className={NUM} value={s.eta} onChange={e => patch({ eta: +e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 font-semibold text-muted">Tension parc U
            <select className={NUM + ' w-auto'} value={s.ubat} onChange={e => patch({ ubat: +e.target.value as PvState['ubat'] })}>
              <option value={12}>12 V</option><option value={24}>24 V</option><option value={48}>48 V</option>
            </select>
          </label>
        </div>
        <p className="m-0 mt-2 rounded-lg border-l-4 border-accent bg-[var(--surface-2)] px-3 py-2 font-mono-num text-[12px] text-ink">
          Pᶜ = Eⱼ / (HSP × η) = {fr(C.Ejour, 0)} / ({fr(C.hsp, 1)} × {s.eta}) = <b>{fr(C.Ppv, 0)} Wc</b>
          &nbsp;→ {C.Npan} panneaux de {panel.P} Wc minimum
        </p>
      </div>

      {/* 3 · Montage du champ PV */}
      <div className={CARD}>
        <h4 className={H}>3 · Montage du champ PV — série (tension) × parallèle (courant)</h4>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px]">
          <label className="flex items-center gap-2 font-semibold">Panneau
            <select className={NUM + ' w-auto'} value={s.panelId} onChange={e => patch({ panelId: e.target.value })}>
              {PANELS.map(p => <option key={p.id} value={p.id}>{p.P} Wc · Voc {p.Voc} V</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 font-semibold">Ns (série)
            <input type="range" min={1} max={4} value={s.ns} onChange={e => patch({ ns: +e.target.value })} /><b className="font-mono-num">{s.ns}</b>
          </label>
          <label className="flex items-center gap-2 font-semibold">Np (parallèle)
            <input type="range" min={1} max={3} value={s.np} onChange={e => patch({ np: +e.target.value })} /><b className="font-mono-num">{s.np}</b>
          </label>
          <Pill ok={vocOk}>{s.ns}S{s.np}P · {s.ns * s.np} modules</Pill>
        </div>
        <div className="mt-2 overflow-x-auto">
          <PanelCoupling panel={panel} ns={s.ns} np={s.np} caption={`${s.ns}S${s.np}P · ${fr(C.PpvReal, 0)} Wc · Vmp ${fr(C.Vmp, 0)} V · Imp ${fr(C.Imp, 1)} A`} />
        </div>
        <p className={`m-0 mt-2 rounded-lg border-l-4 px-3 py-2 font-mono-num text-[12px] ${vocOk ? 'border-good bg-good/5' : 'border-crit bg-crit/5'}`}>
          Voc à froid = {panel.Voc} × {s.ns} × (1 + {panel.k}%/°C × ({loc.tmin} − 25)) = <b>{fr(C.VocCold, 1)} V</b> —{' '}
          {vocOk
            ? <>sous les {mppt.vocmax} V du {mppt.name} ✓</>
            : <>dépasse les {mppt.vocmax} V du {mppt.name} ✗ : réduis Ns</>}
        </p>
      </div>

      {/* 4 · Montage du parc batteries */}
      <div className={CARD}>
        <h4 className={H}>4 · Montage du parc batteries — série (tension) × parallèle (capacité)</h4>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px]">
          <label className="flex items-center gap-2 font-semibold">Bns (série)
            <input type="range" min={1} max={4} value={s.bns} onChange={e => patch({ bns: +e.target.value })} /><b className="font-mono-num">{s.bns}</b>
          </label>
          <label className="flex items-center gap-2 font-semibold">Bnp (parallèle)
            <input type="range" min={1} max={3} value={s.bnp} onChange={e => patch({ bnp: +e.target.value })} /><b className="font-mono-num">{s.bnp}</b>
          </label>
          <label className="flex items-center gap-2 font-semibold">Autonomie
            <input type="number" min={1} max={5} className={NUM} value={s.auto} onChange={e => patch({ auto: +e.target.value })} /> j
          </label>
          <Pill ok={parc24}>{s.bns}S{s.bnp}P · {s.bns * s.bnp} batteries</Pill>
        </div>
        <div className="mt-2 overflow-x-auto">
          <BatCoupling bat={bat} bns={s.bns} bnp={s.bnp} caption={`${s.bns}S${s.bnp}P · ${fr(C.Ubat, 0)} V · ${fr(C.Ah, 0)} Ah · ${fr(C.Ewh / 1000, 1)} kWh`} />
        </div>
        <p className="m-0 mt-2 rounded-lg border-l-4 border-accent bg-[var(--surface-2)] px-3 py-2 font-mono-num text-[12px] text-ink">
          Capacité utile C = Eⱼ × N / (DoD × η) = {fr(C.Ejour, 0)} × {s.auto} / ({bat.dod} × {bat.eta}) = <b>{fr(C.Cbat, 0)} Wh</b>
          &nbsp;= {fr(C.Cah, 0)} Ah sous {s.ubat} V. Parc monté : <b>{fr(C.Ah, 0)} Ah</b> · <Pill ok={parc24}>{fr(C.Ubat, 0)} V</Pill>
        </p>
      </div>

      {/* 5 · Appareillage justifié + note de calcul */}
      <div className={CARD}>
        <h4 className={H}>5 · Choix des appareillages — justifiés par le calcul</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          <Kpi v={`${fr(C.Ich, 0)} A`} l={`I champ → MPPT (${mppt.name.replace('Régulateur ', '')})`} />
          <Kpi v={`${fr(C.Iinv, 0)} A`} l={`I parc → onduleur (${inv.P} W)`} />
          <Kpi v={`${fr(C.Ipvmax, 0)} A`} l="1,25 × Isc → calibre fusible gPV" />
          <Kpi v={`${fr(C.Spv, 1)} mm²`} l="section câble DC champ (Δu ≤ 3 %)" />
        </div>
        <ul className="m-0 mt-2 list-disc pl-5 text-[12px] leading-relaxed text-ink">
          <li><b>Régulateur MPPT</b> : {mppt.name} — Voc {mppt.vocmax} V vs {fr(C.VocCold, 0)} V à froid <Pill ok={vocOk}>{vocOk ? 'OK' : 'trop faible'}</Pill> ; courant de charge {mppt.ich} A vs {fr(C.Ich, 0)} A demandés <Pill ok={ichOk}>{ichOk ? 'OK' : 'sous-dimensionné'}</Pill>.</li>
          <li><b>Onduleur</b> : {inv.name} — {inv.P} W continus &gt; {fr(C.Psim, 0)} W simultanés.</li>
          <li><b>Fusible parc (MEGA)</b> ≥ {fr(C.Iinv, 0)} A ; <b>fusible gPV</b> ≥ {fr(C.Ipvmax, 0)} A ; <b>parafoudre DC</b> + <b>différentiel 30 mA type A</b> côté 230 V.</li>
        </ul>
      </div>
    </section>
  );
}
