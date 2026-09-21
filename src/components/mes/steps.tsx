'use client';

/**
 * Contenu des 13 étapes du parcours « mise en service industrielle ».
 * Toute la logique (validation, erreurs, score) est dans le store et dans
 * `src/lib/mes/miseEnService.ts` ; ici, seulement l'affichage et les actions.
 */

import React from 'react';
import {
  APPAREILS, CONSIGNATION, CONTROLES, DECONSIGNATION, DESIGNATIONS, EQUIPEMENTS, ESSAIS, estConforme,
  fmt, FONCTIONS, HABILITATIONS, INSPECTION, lignesPv, MES, MESURES, miseEnServicePrononcee, ORGANES,
  POSITIONS, RESTITUTION, type QcmDef,
} from '@/lib/mes/miseEnService';
import { useMesParcours } from '@/app/tp/[id]/mesStore';
import Schema, { type SchemaTab } from './Schemas';
import Controleur from './Controleur';

/* ------------------------------------------------------------- utilitaires */

/** Mélange déterministe (même ordre à chaque rendu, pour chaque liste). */
function melange<T>(arr: readonly T[], graine: number): T[] {
  const a = [...arr];
  let x = graine * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const card = 'rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3';
const h3 = 'm-0 mb-2 text-[13px] font-semibold';
const btn = 'min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 text-[12.5px] font-semibold disabled:opacity-45';
const btnOn = 'border-accent bg-accent text-[var(--accent-ink)]';

function Ok({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={ok ? 'text-good' : 'text-crit'}>{children}</span>;
}

/** QCM : options mélangées à l'affichage, réponse repérée par son indice d'origine. */
function Qcm({ id, def, value, onAnswer, graine }: {
  id: string; def: QcmDef; value: number | null; onAnswer: (i: number) => void; graine: number;
}) {
  const ordre = React.useMemo(() => melange(def.options.map((_, i) => i), graine), [def, graine]);
  const answered = value != null;
  return (
    <div data-qcm={id} className={card}>
      <p className="m-0 mb-2 text-[12.5px] font-semibold">{def.q}</p>
      <div className="flex flex-col gap-1.5">
        {ordre.map((i) => {
          const sel = value === i;
          const tone = sel ? (i === def.answer ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : 'border-[var(--line)]';
          return (
            <button
              key={i}
              type="button"
              data-opt={i}
              onClick={() => onAnswer(i)}
              className={`min-h-touch rounded-[10px] border px-2.5 py-1.5 text-left text-[12.5px] ${tone}`}
            >
              {def.options[i]}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="m-0 mt-2 text-[12px] text-muted">
          {value === def.answer ? <Ok ok>Exact. </Ok> : <Ok ok={false}>Non. </Ok>}
          {value === def.answer ? def.why : 'Relis la question et réessaie.'}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- 0 · identification */

function Identification() {
  const { s, answerIdent } = useMesParcours();
  const [tab, setTab] = React.useState<SchemaTab>('puissance');
  const [sel, setSel] = React.useState<string | null>(null);
  const [d, setD] = React.useState('');
  const [f, setF] = React.useState('');
  const ok = React.useMemo(() => {
    const o: Record<string, boolean> = {};
    Object.entries(s.ident).forEach(([k, v]) => { if (v.ok) o[k] = true; });
    return o;
  }, [s.ident]);
  const n = ORGANES.filter((o) => ok[o.rep]).length;
  const organe = ORGANES.find((o) => o.rep === sel);

  const pick = (rep: string) => {
    setSel(rep);
    const a = s.ident[rep];
    setD(a?.d ?? '');
    setF(a?.f ?? '');
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-[10px] border border-[var(--line)]">
          {(['puissance', 'commande'] as const).map((t) => (
            <button
              key={t}
              type="button"
              data-tab={t}
              onClick={() => setTab(t)}
              className={`min-h-touch px-3 text-[12.5px] font-semibold ${tab === t ? 'bg-accent text-[var(--accent-ink)]' : 'bg-[var(--surface)]'}`}
            >
              Schéma de {t}
            </button>
          ))}
        </div>
        <span data-ident-count className="text-[12.5px] text-muted">{n} / {ORGANES.length} identifiés</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full bg-good transition-all" style={{ width: `${(n / ORGANES.length) * 100}%` }} />
      </div>

      <Schema tab={tab} sel={sel} ok={ok} onPick={pick} />

      <div className="flex flex-wrap gap-1">
        {ORGANES.map((o) => (
          <button
            key={o.rep}
            type="button"
            data-rep={o.rep}
            onClick={() => { setTab(o.schema); pick(o.rep); }}
            className={`rounded-full border px-2 py-0.5 font-mono-num text-[11.5px] ${ok[o.rep] ? 'border-good bg-good/10 text-good' : sel === o.rep ? 'border-accent' : 'border-[var(--line)]'}`}
          >
            {ok[o.rep] ? '✓ ' : ''}{o.rep}
          </button>
        ))}
      </div>

      {!organe ? (
        <p className="m-0 text-[12.5px] text-muted">Clique un équipement sur le schéma (ou son repère ci-dessus).</p>
      ) : (
        <div data-ident-form className={card}>
          <b className="text-[13px]">Repère {organe.rep}</b>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-[11.5px] text-muted">
              Désignation
              <select data-sel="d" value={d} onChange={(e) => setD(e.target.value)} className="min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2 text-[12.5px] text-ink">
                <option value="">— choisir —</option>
                {DESIGNATIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] text-muted">
              Fonction
              <select data-sel="f" value={f} onChange={(e) => setF(e.target.value)} className="min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2 text-[12.5px] text-ink">
                <option value="">— choisir —</option>
                {FONCTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" data-ident-ok disabled={!d || !f || ok[organe.rep]} onClick={() => answerIdent(organe.rep, d, f)} className={`${btn} ${btnOn}`}>
              Valider
            </button>
            {s.ident[organe.rep] && !ok[organe.rep] && <Ok ok={false}>À revoir.</Ok>}
          </div>
          {ok[organe.rep] && (
            <p className="m-0 mt-2 rounded-lg bg-good/10 px-2.5 py-1.5 text-[12.5px]">
              <b>Identifié.</b> Emplacement : <b>{organe.ou}</b>.{organe.usage && <> Utilisé plus loin : <b>{organe.usage}</b>.</>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- 1 · préparation */

function Preparation() {
  const { s, setControle, setPosition, setAppareil, toggleHabil } = useMesParcours();
  const fonctions = React.useMemo(() => melange(POSITIONS.map((p) => p.fonction), 7), []);
  const sel = 'min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2 text-[12.5px]';
  return (
    <div className="flex flex-col gap-2.5">
      <section data-prep="controles" className={card}>
        <h3 className={h3}>1. Associe chaque contrôle à son numéro d&apos;étape (1 à 7)</h3>
        <div className="grid gap-1.5 md:grid-cols-2">
          {CONTROLES.map((c) => {
            const v = s.prep.controles[c.id];
            return (
              <label key={c.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span>{c.label}</span>
                <select data-ctl={c.id} value={v ?? ''} onChange={(e) => setControle(c.id, e.target.value ? Number(e.target.value) : null)} className={sel}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((k) => <option key={k} value={k}>Étape {k}</option>)}
                </select>
              </label>
            );
          })}
        </div>
      </section>

      <section data-prep="positions" className={card}>
        <h3 className={h3}>2. Fonction de chaque position du commutateur</h3>
        <div className="grid gap-1.5 md:grid-cols-2">
          {POSITIONS.map((p) => (
            <label key={p.k} className="flex items-center justify-between gap-2 text-[12.5px]">
              <b className="w-12 font-mono-num">{p.symbole}</b>
              <select data-posf={p.k} value={s.prep.positions[p.k] ?? ''} onChange={(e) => setPosition(p.k, e.target.value || null)} className={`${sel} min-w-0 flex-1`}>
                <option value="">— choisir —</option>
                {fonctions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>

      <div className="grid gap-2.5 md:grid-cols-2">
        <section data-prep="appareil" className={card}>
          <h3 className={h3}>3. Nom de l&apos;appareil utilisé pour toutes les mesures</h3>
          <div className="flex flex-col gap-1">
            {APPAREILS.map((a, i) => (
              <label key={a} className="flex min-h-touch items-center gap-2 text-[12.5px]">
                <input type="radio" name="appareil" data-app={i} checked={s.prep.appareil === i} onChange={() => setAppareil(i)} />
                {a}
              </label>
            ))}
          </div>
        </section>
        <section data-prep="habil" className={card}>
          <h3 className={h3}>4. Habilitations nécessaires (plusieurs réponses)</h3>
          <div className="flex flex-col gap-1">
            {HABILITATIONS.map((h) => (
              <label key={h} className="flex min-h-touch items-center gap-2 text-[12.5px]">
                <input type="checkbox" data-hab={h} checked={s.prep.habil.includes(h)} onChange={() => toggleHabil(h)} />
                {h}
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 2 · inspection */

function Inspection() {
  const { s, markVisu, corrigerVisu } = useMesParcours();
  const ecart = INSPECTION.find((i) => !i.conforme)!;
  const vu = s.visu.marks[ecart.id] === 'NC';
  return (
    <div className="flex flex-col gap-2.5">
      <div className={card}>
        <h3 className={h3}>Inspecte l&apos;armoire et la fosse, installation hors tension</h3>
        <table className="w-full border-collapse text-[12.5px]">
          <tbody>
            {INSPECTION.map((it) => {
              const m = s.visu.marks[it.id];
              return (
                <tr key={it.id} data-visu={it.id} className="border-t border-[var(--line)]">
                  <td className="py-1.5 pr-2">{it.label}</td>
                  <td className="w-[150px] py-1.5 text-right">
                    <div className="inline-flex gap-1">
                      {(['C', 'NC'] as const).map((j) => (
                        <button
                          key={j}
                          type="button"
                          data-j={j}
                          onClick={() => markVisu(it.id, j)}
                          className={`min-h-touch rounded-[8px] border px-2.5 text-[12px] font-semibold ${m === j ? (j === 'C' ? 'border-good bg-good/15 text-good' : 'border-crit bg-crit/15 text-crit') : 'border-[var(--line)]'}`}
                        >
                          {j === 'C' ? 'Conforme' : 'Non conf.'}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {vu && (
        <div className="rounded-r-xl border-l-4 border-l-warn bg-warn/10 px-2.5 py-2 text-[12.5px]">
          <b className="block">Écart relevé</b>
          {ecart.ecart}
          <div className="mt-2">
            {s.visu.corrige
              ? <Ok ok>✓ Presse-étoupe serré.</Ok>
              : <button type="button" data-corriger onClick={corrigerVisu} className={`${btn} ${btnOn}`}>Serrer le presse-étoupe</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- 3 · consignation */

function Sequence({ items, seq, onPick, graine, name }: {
  items: { id: string; label: string; qui?: string }[]; seq: string[]; onPick: (id: string) => void; graine: number; name: string;
}) {
  const ordre = React.useMemo(() => melange(items, graine), [items, graine]);
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        {ordre.map((it) => {
          const fait = seq.includes(it.id);
          return (
            <button
              key={it.id}
              type="button"
              data-seq={it.id}
              disabled={fait}
              onClick={() => onPick(it.id)}
              className={`min-h-touch rounded-[10px] border px-2.5 py-1.5 text-left text-[12.5px] ${fait ? 'border-good bg-good/10 opacity-60' : 'border-[var(--line)] bg-[var(--surface)]'}`}
            >
              {it.label}{it.qui && <span className="ml-1 text-[11px] text-muted">({it.qui})</span>}
            </button>
          );
        })}
      </div>
      <ol data-seq-done={name} className={`${card} m-0 list-decimal pl-8 text-[12.5px]`}>
        {seq.length === 0 && <li className="list-none text-muted">Clique les opérations dans l&apos;ordre.</li>}
        {seq.map((id) => <li key={id} className="py-0.5"><Ok ok>{items.find((x) => x.id === id)?.label}</Ok></li>)}
      </ol>
    </div>
  );
}

function Consignation() {
  const { s, consigner, toggleEquip } = useMesParcours();
  return (
    <div className="flex flex-col gap-2.5">
      <div className={card}>
        <h3 className={h3}>Équipements à réunir pour consigner (EPI, matériel)</h3>
        <div className="grid gap-1 md:grid-cols-2">
          {EQUIPEMENTS.map((e) => (
            <label key={e.id} className="flex min-h-touch items-center gap-2 text-[12.5px]">
              <input type="checkbox" data-equip={e.id} checked={s.cons.equip.includes(e.id)} onChange={() => toggleEquip(e.id)} />
              {e.label}
            </label>
          ))}
        </div>
      </div>
      <h3 className="m-0 text-[13px] font-semibold">Les 5 étapes de la consignation, dans l&apos;ordre</h3>
      <Sequence items={CONSIGNATION} seq={s.cons.seq} onPick={consigner} graine={3} name="cons" />
    </div>
  );
}

/* ------------------------------------------------------------- mesures */

function Mesures({ step }: { step: number }) {
  const { s, point, selectPoint, juger, leverReserve, answerQcm, action, essai } = useMesParcours();
  const e = MESURES[step]!;
  const m = s.mesures[step];
  const cur = point[step] ?? e.points[0].id;
  const r = e.reserve;
  const lr = r ? m.lectures[r.point] : undefined;
  const reserveOuverte = !!(r && lr && !estConforme(e.points.find((p) => p.id === r.point)!, lr.v));
  const rot = step === MES.PHASES ? m.lectures.rot : undefined;
  const phasesOk = !!(rot && estConforme(e.points[0], rot.v));

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className={`${card} text-[12.5px]`}>
          <div><b>Branchement :</b> {e.cordons}</div>
          <div className="mt-1"><b>Critère :</b> {e.critere}</div>
          {e.note && <p className="m-0 mt-1.5 text-[12px] text-muted">{e.note}</p>}
        </div>

        <div className="grid gap-2.5 md:grid-cols-2">
          <Qcm id="role" def={e.role} value={m.role} onAnswer={(i) => answerQcm(step, 'role', i)} graine={step * 2 + 1} />
          <Qcm id="limite" def={e.limite} value={m.limite} onAnswer={(i) => answerQcm(step, 'limite', i)} graine={step * 2 + 2} />
        </div>

        <div className={`${card} overflow-x-auto`}>
          <h3 className={h3}>Points de mesure</h3>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[.04em] text-muted">
                <th className="py-1 pr-2 font-semibold">Point</th>
                <th className="py-1 pr-2 text-right font-semibold">Lecture</th>
                <th className="py-1 text-right font-semibold">Conformité</th>
              </tr>
            </thead>
            <tbody>
              {e.points.map((p) => {
                const l = m.lectures[p.id];
                const j = m.jugements[p.id];
                const active = cur === p.id;
                return (
                  <tr
                    key={p.id}
                    data-point={p.id}
                    onClick={() => selectPoint(step, p.id)}
                    className={`cursor-pointer border-t border-[var(--line)] ${active ? 'bg-accent/10' : ''}`}
                  >
                    <td className="py-1.5 pr-2">
                      <span className={active ? 'font-semibold' : ''}>{active ? '▸ ' : ''}{p.label}</span>
                      {p.action && (
                        <button
                          type="button"
                          data-action={p.id}
                          onClick={(ev) => { ev.stopPropagation(); action(step, p.id); }}
                          className="ml-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[11.5px] font-semibold"
                        >
                          {p.action}
                        </button>
                      )}
                    </td>
                    <td data-lecture className="whitespace-nowrap py-1.5 pr-2 text-right font-mono-num font-bold">
                      {l ? fmt(l.v, p.unite) : '—'}
                    </td>
                    <td className="w-[150px] py-1.5 text-right">
                      <div className="inline-flex gap-1">
                        {(['C', 'NC'] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            data-j={k}
                            disabled={!l}
                            onClick={(ev) => { ev.stopPropagation(); juger(step, p.id, k); }}
                            className={`min-h-[32px] rounded-[8px] border px-2 text-[11.5px] font-semibold disabled:opacity-35 ${j === k ? (k === 'C' ? 'border-good bg-good/15 text-good' : 'border-crit bg-crit/15 text-crit') : 'border-[var(--line)]'}`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {r && reserveOuverte && (
          <div data-reserve className="rounded-r-xl border-l-4 border-l-crit bg-crit/10 px-2.5 py-2 text-[12.5px]">
            <b className="block">Réserve</b>
            {r.constat}
            <p className="m-0 mt-1"><b>Levée :</b> {r.levee}</p>
            <button type="button" data-lever onClick={() => leverReserve(step)} className={`${btn} ${btnOn} mt-2`}>
              Lever la réserve
            </button>
          </div>
        )}
        {r && m.levee && !reserveOuverte && (
          <p className="m-0 rounded-lg bg-good/10 px-2.5 py-1.5 text-[12.5px]">
            <b>Réserve levée.</b> {m.lectures[r.point] ? 'Nouvelle mesure conforme.' : 'Refais la mesure sur le point corrigé.'}
          </p>
        )}

        {step === MES.PHASES && (
          <div data-essais className={card}>
            <h3 className={h3}>Essais fonctionnels</h3>
            {!phasesOk && <p className="m-0 mb-2 text-[12px] text-muted">Possibles une fois l&apos;ordre des phases direct (1-2-3).</p>}
            <div className="flex flex-col gap-1.5">
              {ESSAIS.map((x) => (
                <div key={x.id} data-essai={x.id} className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-1.5 text-[12.5px]">
                  <button type="button" disabled={!!s.essais[x.id]} onClick={() => essai(x.id)} className={btn}>
                    {s.essais[x.id] ? '✓' : 'Faire'}
                  </button>
                  <span className="min-w-0 flex-1"><b>{x.action}</b>{s.essais[x.id] && <> → {x.constat}</>}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="xl:sticky xl:top-2 xl:self-start">
        <Controleur />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 8 · déconsignation */

function Deconsignation() {
  const { s, deconsigner } = useMesParcours();
  return (
    <div className="flex flex-col gap-2.5">
      <p className="m-0 max-w-[70ch] text-[12.5px] text-muted">
        Les mesures hors tension sont terminées. Remets l&apos;installation sous tension progressivement,
        en présence du professeur. Clique les opérations dans l&apos;ordre.
      </p>
      <Sequence items={DECONSIGNATION} seq={s.decons.seq} onPick={deconsigner} graine={11} name="decons" />
    </div>
  );
}

/* ------------------------------------------------------------- 12 · procès-verbal */

function ProcesVerbal() {
  const { s, answerRestitution } = useMesParcours();
  const lignes = lignesPv(s);
  const ok = miseEnServicePrononcee(s);
  return (
    <div className="flex flex-col gap-2.5">
      <div data-pv className={`${card} print-sheet`}>
        <h3 className={h3}>Procès-verbal de mise en service · station de relevage SR1</h3>
        <table className="w-full border-collapse text-[12.5px]">
          <tbody>
            {lignes.map((l) => (
              <tr key={l.label} className="border-t border-[var(--line)]">
                <td className="py-1.5 pr-2">{l.label}</td>
                <td className="py-1.5 pr-2 text-right font-mono-num font-bold">{l.valeur}</td>
                <td className="w-8 py-1.5 text-right">{l.ok === true ? <Ok ok>✓</Ok> : l.ok === false ? <Ok ok={false}>✗</Ok> : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p data-decision className={`m-0 mt-2 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold ${ok ? 'bg-good/15 text-good' : 'bg-crit/10 text-crit'}`}>
          {ok ? 'Mise en service prononcée.' : 'Mise en service non prononcée : des étapes restent à valider.'}
        </p>
      </div>
      <Qcm id="restitution" def={RESTITUTION} value={s.pv.restitution} onAnswer={answerRestitution} graine={29} />
    </div>
  );
}

/* ------------------------------------------------------------- aiguillage */

export default function MesStep({ step }: { step: number }) {
  switch (step) {
    case MES.IDENT: return <Identification />;
    case MES.PREP: return <Preparation />;
    case MES.VISU: return <Inspection />;
    case MES.CONS: return <Consignation />;
    case MES.DECONS: return <Deconsignation />;
    case MES.PV: return <ProcesVerbal />;
    default: return MESURES[step] ? <Mesures step={step} /> : null;
  }
}
