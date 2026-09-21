'use client';

/**
 * Rejeu d'un TP en LECTURE SEULE, pour le professeur (Suivi).
 *
 * Rejoue tout le parcours de l'élève étape par étape à partir de l'état archivé
 * de sa tentative : ses réponses de préparation, ses références de matériel, sa
 * platine posée et câblée, ses tests, sa consignation, ses relevés, son dépannage.
 * Aucun gestionnaire d'édition n'est monté — `<Panel>` reçoit ses handlers en
 * optionnel, donc l'omission suffit à rendre la platine non interactive.
 */

import React from 'react';
import type { AttemptRow } from '@/lib/db/types';
import type { TpDefinition } from '@/lib/types';
import Panel, { type PanelWire } from '@/components/panel/Panel';
import { useTpItems } from '@/components/panel/useTpItems';
import {
  ETAPE, STAGES, elapsedSeconds, formatChrono, goodChoices, helpCount,
  normalizeState, prepQuestions, requiredLiaisons, scoreLines, stageScores,
} from '@/lib/sim/progress';
import { mesureDone, mesuresFor } from '@/lib/sim/mesures';
import { liveBilan, liveNotes } from '@/lib/sim/live';

const col = (r: number) => (r >= 0.9 ? '#0F7A3D' : r >= 0.75 ? '#16A34A' : r >= 0.6 ? '#EAB308' : r >= 0.45 ? '#F97316' : '#DC2626');
const pct = (r: number) => `${Math.round(r * 100)} %`;

/** Ligne de barème correspondant à une étape (pour le détail chiffré et la remédiation). */
const LIGNE_ETAPE: Record<number, string> = {
  [ETAPE.PREPARATION]: 'preparation', [ETAPE.MATERIEL]: 'materiel', [ETAPE.POSE]: 'pose',
  [ETAPE.CABLAGE]: 'cablage', [ETAPE.TESTS]: 'tests', [ETAPE.EPI]: 'epi',
  [ETAPE.HORS]: 'hors', [ETAPE.SOUS]: 'sous', [ETAPE.VALIDATION]: 'diag',
};

function Chip({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="mr-1.5 mt-1.5 inline-block rounded-lg border px-2 py-0.5 text-[11.5px]"
      style={ok === undefined
        ? { borderColor: 'var(--line)', background: 'var(--surface-2)' }
        : { borderColor: ok ? '#16A34A' : '#DC2626', color: ok ? '#16A34A' : '#DC2626', opacity: ok ? 1 : 0.8 }}
    >
      {ok === undefined ? '' : ok ? '✓ ' : '✗ '}{children}
    </span>
  );
}

const Th = ({ children }: { children: React.ReactNode }) =>
  <th className="border-b border-[var(--line)] px-2 py-1 text-left text-[10.5px] uppercase tracking-wide text-muted">{children}</th>;
const Td = ({ children, mono }: { children: React.ReactNode; mono?: boolean }) =>
  <td className={`border-b border-[var(--line)] px-2 py-1 ${mono ? 'text-right font-mono-num' : ''}`}>{children}</td>;

export default function VisuTp({ attempt, tp, onClose }: {
  attempt: AttemptRow & { student?: { full_name: string | null } | null };
  tp: TpDefinition;
  onClose: () => void;
}) {
  const st = React.useMemo(() => normalizeState(attempt.state), [attempt.state]);
  const items = useTpItems(tp);
  const [cur, setCur] = React.useState(Math.min(attempt.stage ?? 0, STAGES.length - 1));

  const scores = React.useMemo(() => stageScores(tp, st), [tp, st]);
  const lines = React.useMemo(() => scoreLines(tp, st), [tp, st]);
  const bilan = React.useMemo(() => liveBilan(tp, st), [tp, st]);
  const notes = React.useMemo(() => liveNotes(tp, st), [tp, st]);

  /** Platine telle que l'élève l'a laissée (liaisons d'installateur + les siennes). */
  const wires: PanelWire[] = React.useMemo(() => [
    ...tp.liaisons.filter((l) => l.prewired).map((l) => ({ a: l.a, b: l.b, net: l.net, prewired: true })),
    ...st.wires.map((w) => ({ a: w.a, b: w.b, net: w.net })),
  ], [tp, st.wires]);

  const platine = (cover: boolean) => (
    <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)]">
      {/* aucun handler : la platine est purement contemplative */}
      <Panel tp={tp} items={items} wires={wires} cover={cover} marks />
    </div>
  );

  const body = (i: number): React.ReactNode => {
    switch (i) {
      case ETAPE.CHOIX:
      case ETAPE.ENONCE:
        return <p className="text-[12.5px] text-muted">
          TP « {tp.title} » — mode {st.mode === 'evaluation' ? 'évaluation' : 'entraînement'}
          {st.startedAt ? `, commencé le ${new Date(st.startedAt).toLocaleString('fr-FR')}` : ''}.
        </p>;

      case ETAPE.PREPARATION: {
        const qs = prepQuestions(tp);
        if (!qs.length) return <p className="text-[12.5px] text-muted">Pas de préparation sur ce TP.</p>;
        return <>{qs.map((q) => {
          const rep = st.prep?.[q.id];
          const ok = rep === q.answer;
          return (
            <div key={q.id} className="mb-1.5 rounded-[9px] border border-[var(--line)] p-2 text-[12.5px]">
              <b>{q.rep ? `${q.rep} — ` : ''}{q.invite}</b>
              <div style={{ color: rep == null ? 'var(--muted)' : ok ? '#16A34A' : '#DC2626' }}>
                {rep == null ? 'Sans réponse' : `Réponse : ${q.options[rep]} ${ok ? '✓' : '✗'}`}
              </div>
              {rep != null && !ok && (
                <div className="text-[11.5px] text-muted">Attendu : {q.options[q.answer]} — {q.why}</div>
              )}
            </div>
          );
        })}</>;
      }

      case ETAPE.MATERIEL:
        return <table className="w-full border-collapse text-[12px]">
          <thead><tr><Th>Poste</Th><Th>Choix de l’élève</Th><Th>Verdict</Th></tr></thead>
          <tbody>{tp.postes.map((p) => {
            const idx = st.choices?.[p.id];
            const opt = idx == null ? null : p.options[idx];
            const ok = opt?.ok === true;
            return <tr key={p.id}>
              <Td>{p.name}</Td>
              <Td>{opt ? opt.ref : <span className="text-muted">non choisi</span>}</Td>
              <Td><span style={{ color: ok ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                {opt ? (ok ? '✓' : `✗ ${opt.why}`) : '—'}
              </span></Td>
            </tr>;
          })}</tbody>
        </table>;

      case ETAPE.POSE:
        return <>
          {platine(true)}
          <p className="mt-1.5 text-[12px] text-muted">
            {tp.slots.filter((s) => st.placed[s.id]).length} / {tp.slots.length} appareils posés ·{' '}
            <b style={{ color: st.poseErrors ? '#DC2626' : '#16A34A' }}>{st.poseErrors} erreur(s) de pose</b>
          </p>
        </>;

      case ETAPE.CABLAGE: {
        const req = requiredLiaisons(tp).length;
        return <>
          {platine(false)}
          <p className="mt-1.5 text-[12px] text-muted">
            {st.wires.length} / {req} liaisons réalisées ·{' '}
            <b style={{ color: st.wireErrors ? '#DC2626' : '#16A34A' }}>{st.wireErrors} refus</b> ·{' '}
            {st.wiresRemoved ?? 0} fil(s) retiré(s), non pénalisés · {st.resets ?? 0} remise(s) à zéro
          </p>
        </>;
      }

      case ETAPE.TESTS:
        return <>{tp.tests.map((t) => {
          const v = st.tests[t.id];
          return <div key={t.id} className="mb-1.5 rounded-[9px] border border-[var(--line)] p-2 text-[12.5px]">
            <b>{t.title}</b> {v ? <span style={{ color: '#16A34A' }}>✓</span> : <span className="text-muted">non fait</span>}
            <div className="text-[11.5px] text-muted">{v ? `Relevé : ${v}` : t.how} · attendu : {t.expected}</div>
          </div>;
        })}</>;

      case ETAPE.EPI: {
        const c = st.cons;
        const needVat = tp.consignationVat?.avalPairs?.length ?? 3;
        return <>
          <h4 className="m-0 mb-1 text-[12.5px] font-bold">EPI</h4>
          <div>{Object.entries(st.epi).map(([k, v]) => <Chip key={k} ok={v}>{k}</Chip>)}</div>
          <h4 className="m-0 mb-1 mt-3 text-[12.5px] font-bold">Consignation</h4>
          <div>
            <Chip ok={c.sep}>Séparation</Chip><Chip ok={c.lock}>Condamnation</Chip>
            <Chip ok={c.ident}>Identification</Chip><Chip ok={c.vatRef}>VAT sur source</Chip>
            <Chip ok={c.vat.length >= needVat}>VAT aval ({c.vat.length}/{needVat})</Chip>
            <Chip ok={c.vatRef2}>Re-vérification</Chip>
          </div>
        </>;
      }

      case ETAPE.MISE_EN_SERVICE:
        return <div>
          <Chip ok={st.decons.unlock}>Retrait cadenas et macaron</Chip>
          <Chip ok={st.decons.close}>Refermeture des protections</Chip>
          {tp.variateur?.parametres?.length ? <Chip ok={Boolean(st.decons.param)}>Paramétrage du variateur</Chip> : null}
          <Chip ok={st.decons.essai}>Essai de fonctionnement</Chip>
        </div>;

      case ETAPE.HORS:
      case ETAPE.SOUS: {
        const phase = i === ETAPE.HORS ? 'horsTension' : 'sousTension';
        const attendues = mesuresFor(tp, phase);
        const relevés = st.readings.filter((r) => r.stage === i);
        return <>
          {i === ETAPE.SOUS ? null : platine(false)}
          <h4 className="m-0 mb-1 mt-2 text-[12.5px] font-bold">Mesures attendues</h4>
          <div>{attendues.map((m) => <Chip key={m.id} ok={mesureDone(st, m.id)}>{m.title}</Chip>)}</div>
          <h4 className="m-0 mb-1 mt-3 text-[12.5px] font-bold">Relevés de l’élève</h4>
          {relevés.length === 0 ? <p className="text-[12px] text-muted">Aucun relevé à cette étape.</p> : (
            <table className="w-full border-collapse text-[12px]">
              <thead><tr><Th>Instrument</Th><Th>Calibre</Th><Th>Bornes</Th><Th>Affichage</Th><Th>Conforme</Th></tr></thead>
              <tbody>{relevés.map((r, k) => {
                const err = r.display.startsWith('ERR');
                return <tr key={k}>
                  <Td>{r.instrument}</Td><Td>{r.dial}</Td>
                  <Td>{[r.a, r.b].filter(Boolean).join(' / ') || r.wire || '—'}</Td>
                  <Td mono>{r.display}</Td>
                  <Td><span style={{ color: err ? '#DC2626' : r.expectedId ? '#16A34A' : 'var(--muted)', fontWeight: 700 }}>
                    {err ? '✗ ERR' : r.expectedId ? '✓' : '·'}
                  </span></Td>
                </tr>;
              })}</tbody>
            </table>
          )}
        </>;
      }

      case ETAPE.VALIDATION: {
        const panne = tp.faults.find((f) => f.id === st.fault);
        const juste = st.diagnosis === st.fault;
        return <>
          <p className="m-0 text-[12.5px]"><b>Panne injectée :</b> {panne ? `${panne.title} — ${panne.symptom}` : (st.fault ?? 'aucune')}</p>
          <h4 className="m-0 mb-1 mt-3 text-[12.5px] font-bold">Hypothèses posées</h4>
          {st.hypotheses.length === 0 ? <p className="text-[12px] text-muted">Aucune hypothèse posée.</p> : (
            <div>{st.hypotheses.map((h) => {
              const f = tp.faults.find((x) => x.id === h);
              const t = st.hypTests.filter((x) => x.id === h);
              return <Chip key={h}>{f?.title ?? h}{t.length ? ` — ${t.length} test(s)` : ''}</Chip>;
            })}</div>
          )}
          {st.hypTests.length > 0 && (
            <table className="mt-2 w-full border-collapse text-[12px]">
              <thead><tr><Th>Hypothèse</Th><Th>Mesure</Th><Th>Lu</Th></tr></thead>
              <tbody>{st.hypTests.map((h, k) => (
                <tr key={k}>
                  <Td>{tp.faults.find((x) => x.id === h.id)?.title ?? h.id}</Td>
                  <Td>{h.instrument} {h.dial} {[h.a, h.b].filter(Boolean).join('/')}</Td>
                  <Td mono>{h.lu}</Td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <div className="mt-3 rounded-[9px] border border-[var(--line)] p-2 text-[12.5px]">
            <b>Diagnostic retenu :</b>{' '}
            {st.diagnosis
              ? <span style={{ color: juste ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                  {tp.faults.find((f) => f.id === st.diagnosis)?.title ?? st.diagnosis} {juste ? '✓' : '✗'}
                </span>
              : <span className="text-muted">aucun</span>}
            {' '}· en <b>{Math.max(1, st.diagTries)} essai(s)</b>
            <div><b>Remède :</b> {st.remede ?? <span className="text-muted">non renseigné</span>}</div>
            <div><b>Réparé :</b> {st.fixed ? '✓ oui' : '✗ non'}</div>
          </div>
          <p className="mt-2 text-[12.5px]">Quiz de validation : <b>{st.quiz ?? 0} / {tp.quiz.length}</b></p>
        </>;
      }

      default: return null;
    }
  };

  const r = scores[cur];
  const ligne = lines.find((l) => l.key === LIGNE_ETAPE[cur]);
  const vig = bilan.vigilances.find((v) => v.key === LIGNE_ETAPE[cur]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-3" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-5xl rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-3.5">

        <div className="mb-1 flex flex-wrap items-center gap-2.5">
          <h2 className="m-0 font-title text-[17px] font-bold">
            {attempt.student?.full_name ?? 'Élève'} — {tp.title}
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
            🔒 Lecture seule
          </span>
          <button type="button" onClick={onClose}
            className="ml-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[12.5px] font-bold">
            Fermer
          </button>
        </div>
        <p className="m-0 mb-3 text-[12px] text-muted">
          {attempt.status === 'termine' || attempt.status === 'cloture' ? 'Passage clôturé' : 'Passage en cours'} ·
          étape {Math.min((attempt.stage ?? 0) + 1, STAGES.length)} / {STAGES.length} ·
          durée {formatChrono(elapsedSeconds(st))} ·
          note projetée <b>{notes.projetee}/20</b> ·
          {goodChoices(tp, st)}/{tp.postes.length} références justes
        </p>

        {/* stepper : rejeu de tout le parcours */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1.5">
          {STAGES.map((n, i) => {
            const s = scores[i];
            return (
              <button key={n} type="button" onClick={() => setCur(i)}
                className={`flex flex-none items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[11.5px] ${cur === i ? 'border-accent ring-2 ring-accent/25' : 'border-[var(--line)]'} bg-[var(--surface)]`}>
                <span className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[10px] font-extrabold text-white"
                  style={{ background: s == null ? '#C7CDD6' : col(s) }}>{i + 1}</span>
                {n}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="rounded-[14px] border border-[var(--line)] p-3">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-accent">
              Étape {cur + 1} / {STAGES.length}
            </div>
            <h3 className="m-0 mb-2 text-[14px] font-bold">{STAGES[cur]}</h3>
            {r == null
              ? <p className="text-[12.5px] text-muted">Étape non atteinte par l’élève.</p>
              : body(cur)}
          </section>

          <aside className="rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)] p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-accent">Ce que dit le barème</div>
            <b className="block font-mono-num text-[26px]" style={{ color: r == null ? 'var(--muted)' : col(r) }}>
              {r == null ? '—' : pct(r)}
            </b>
            <div className="my-1.5 h-[8px] overflow-hidden rounded bg-[var(--line)]">
              {r != null && <i className="block h-full" style={{ width: pct(r), background: col(r) }} />}
            </div>
            {ligne && <div className="text-[12px] text-muted">{ligne.detail}</div>}

            {vig ? (
              <div className="mt-2.5 rounded-r-[9px] border-l-4 border-l-[#F97316] bg-[var(--surface)] p-2 text-[12px]">
                <b>Point de vigilance</b>
                <div className="text-muted">À revoir avec l’élève :</div>
                <div>{(vig.remediation ?? []).map((f) => (
                  <span key={f} className="mr-1 mt-1 inline-block rounded-[7px] border border-accent px-1.5 text-[11px] text-accent">📄 {f}</span>
                ))}</div>
              </div>
            ) : r != null && r >= 0.8 ? (
              <div className="mt-2.5 rounded-r-[9px] border-l-4 border-l-[#16A34A] bg-[var(--surface)] p-2 text-[12px]">
                <b>Point fort</b><div className="text-muted">Étape maîtrisée.</div>
              </div>
            ) : null}

            <div className="mt-3 text-[11.5px] text-muted">
              Aide ouverte à cette étape : {helpCount(st, cur)} · total {Object.values(st.helpUsed ?? {}).reduce((a, v) => a + v, 0)}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
