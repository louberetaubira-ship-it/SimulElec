'use client';

/**
 * Espace professeur — Bilans.
 *  · Onglet « Notes » : matrice élèves × TP (moyenne des passages, réglable), un TP refait
 *    laissant plusieurs notes ; moyennes par élève et par classe.
 *  · Onglet « Compétences ↔ épreuves » : bilan de compétences par élève (moyenne sur les TP),
 *    projeté sur les épreuves de l'examen avec une note /20 pondérée par des coefficients
 *    éditables, et une note d'examen globale.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listClassAttempts, listClassStudents, listMyClasses, type AttemptWithStudent, type StudentBrief } from '@/lib/db/classes';
import type { ClassRow } from '@/lib/db/types';
import { TPS, tpById } from '@/lib/data/tps';
import { noteSur20 } from '@/lib/eleve-stats';
import { diplomaShort } from '@/lib/student';
import { COMPETENCES, niveauOf, NIVEAU_BILAN, NIVEAU_COLOR, NIVEAU_ON, type DiplomaId } from '@/lib/data/competences';
import {
  epreuveNote, epreuvesOf, epreuvesOfCompetence, examNote20, hasEpreuves,
} from '@/lib/data/bareme-examen';
import { competenceAverages, competenceScoreMap, counted, resolveEvaluation, retainedNote, type NoteMode } from '@/lib/prof/bilans';

const tpOrder = (id: string) => { const i = TPS.findIndex((t) => t.id === id); return i < 0 ? 999 : i; };
const tpName = (id: string) => tpById(id)?.title ?? id;
const noteColor = (n: number) => (n >= 14 ? 'var(--good)' : n >= 10 ? 'var(--warn)' : 'var(--crit)');
const fmt1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function BilansPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptWithStudent[]>([]);
  const [students, setStudents] = useState<StudentBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'notes' | 'comp'>('notes');
  const [noteMode, setNoteMode] = useState<NoteMode>('moy');
  const [studentId, setStudentId] = useState<string | null>(null);

  const current = useMemo(() => classes.find((c) => c.id === currentId) ?? null, [classes, currentId]);
  const diploma: DiplomaId = current?.diploma ?? attempts.find((a) => a.diploma)?.diploma ?? 'bacpro';

  // Surcharges éventuelles du barème officiel, mémorisées par diplôme sur l'appareil :
  // `pct` est indexé « ÉPREUVE.COMPÉTENCE », `coef` par code d'épreuve.
  const [pct, setPct] = useState<Record<string, number>>({});
  const [coef, setCoef] = useState<Record<string, number>>({});
  useEffect(() => {
    const read = (k: string) => {
      try {
        const v = JSON.parse(localStorage.getItem(`${k}:${diploma}`) ?? 'null');
        return v && typeof v === 'object' ? (v as Record<string, number>) : {};
      } catch { return {}; }
    };
    setPct(read('bilan-pct'));
    setCoef(read('bilan-coef'));
  }, [diploma]);
  const savePct = (key: string, v: number) => setPct((p) => {
    const next = { ...p, [key]: v };
    try { localStorage.setItem(`bilan-pct:${diploma}`, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  const saveCoef = (code: string, v: number) => setCoef((p) => {
    const next = { ...p, [code]: v };
    try { localStorage.setItem(`bilan-coef:${diploma}`, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  useEffect(() => {
    listMyClasses().then((cs) => {
      setClasses(cs);
      setCurrentId((id) => id ?? cs[0]?.id ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const load = useCallback(async (classId: string) => {
    setLoading(true);
    const [att, stu] = await Promise.all([listClassAttempts(classId), listClassStudents(classId)]);
    setAttempts(att);
    setStudents(stu);
    setStudentId((id) => id && stu.some((s) => s.id === id) ? id : stu[0]?.id ?? null);
    setLoading(false);
  }, []);
  useEffect(() => { if (currentId) load(currentId).catch(() => setLoading(false)); }, [currentId, load]);

  const kept = useMemo(() => attempts.filter(counted), [attempts]);
  const tps = useMemo(() => Array.from(new Set(kept.map((a) => a.tp_id))).sort((a, b) => tpOrder(a) - tpOrder(b)), [kept]);

  /** Notes /20 (triées chronologiquement) d'un élève sur un TP. */
  const notesOf = useCallback((sid: string, tp: string) => kept
    .filter((a) => a.student_id === sid && a.tp_id === tp)
    .sort((a, b) => (a.finished_at ?? a.updated_at).localeCompare(b.finished_at ?? b.updated_at))
    .map((a) => noteSur20(a.score as number)), [kept]);

  /** Codes des compétences réellement évaluées par ce TP (référentiel de la classe). */
  const compsOf = useCallback((tp: string) => {
    const codes = new Set<string>();
    kept.filter((a) => a.tp_id === tp).forEach((a) => {
      resolveEvaluation(a, diploma).forEach((c) => { if (c.mastery !== 'nonEvalue') codes.add(c.code); });
    });
    return Array.from(codes).sort((x, y) => (parseInt(x.replace(/\D/g, ''), 10) || 0) - (parseInt(y.replace(/\D/g, ''), 10) || 0));
  }, [kept, diploma]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-title text-[22px] font-bold">Bilans</h1>
        <select
          value={currentId ?? ''}
          onChange={(e) => setCurrentId(e.target.value || null)}
          className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[13px]"
        >
          {classes.length === 0 && <option value="">Aucune classe</option>}
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {diplomaShort(c.diploma)}</option>)}
        </select>
        <Link href="/prof" className="ml-auto text-[12.5px] font-semibold text-muted underline">← Suivi</Link>
      </div>

      <div className="mb-4 flex gap-1.5">
        {([['notes', '📊 Bilan des notes'], ['comp', '🎯 Compétences ↔ épreuves']] as const).map(([k, lab]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`min-h-touch rounded-[10px] border px-3.5 text-[13px] font-semibold ${tab === k ? 'border-accent bg-accent text-[var(--accent-ink)]' : 'border-[var(--line)] bg-[var(--surface)] text-ink'}`}
          >
            {lab}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-muted">Chargement…</p>
      ) : tps.length === 0 ? (
        <p className="text-[13px] text-muted">Aucune note clôturée dans cette classe pour l’instant.</p>
      ) : tab === 'notes' ? (
        <NotesTab
          students={students} tps={tps} notesOf={notesOf} compsOf={compsOf} noteMode={noteMode} setNoteMode={setNoteMode}
        />
      ) : (
        <CompTab
          diploma={diploma} students={students} kept={kept} studentId={studentId} setStudentId={setStudentId}
          pct={pct} coef={coef} savePct={savePct} saveCoef={saveCoef}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ Notes */

function NotesTab({ students, tps, notesOf, compsOf, noteMode, setNoteMode }: {
  students: StudentBrief[];
  tps: string[];
  notesOf: (sid: string, tp: string) => number[];
  compsOf: (tp: string) => string[];
  noteMode: NoteMode;
  setNoteMode: (m: NoteMode) => void;
}) {
  const cell = (notes: number[]) => {
    if (notes.length === 0) return <td key={Math.random()} className="border-b border-[var(--line)] px-2.5 py-2 text-center text-[var(--line)]">—</td>;
    if (noteMode === 'all') {
      return (
        <td className="border-b border-[var(--line)] px-2.5 py-2 text-center font-mono-num text-[12.5px]">
          {notes.map((n, i) => <span key={i} style={{ color: noteColor(n) }}>{fmt1(n)}{i < notes.length - 1 ? ' · ' : ''}</span>)}
          {notes.length > 1 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[9.5px] font-bold text-[var(--accent-ink)]">×{notes.length}</span>}
        </td>
      );
    }
    const v = retainedNote(notes, noteMode) as number;
    return (
      <td className="border-b border-[var(--line)] px-2.5 py-2 text-center">
        <span className="font-mono-num font-bold" style={{ color: noteColor(v) }}>{fmt1(v)}</span>
        <span className="text-[10px] text-muted">/20</span>
        {notes.length > 1 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[9.5px] font-bold text-[var(--accent-ink)]">×{notes.length}</span>}
      </td>
    );
  };

  const retained = (notes: number[]) => (notes.length ? (retainedNote(notes, noteMode === 'all' ? 'moy' : noteMode) as number) : null);
  const classAvg = (tp: string) => {
    const vals = students.map((s) => retained(notesOf(s.id, tp))).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  return (
    <>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-muted">TP refait — note retenue :</span>
        <div className="inline-flex overflow-hidden rounded-[9px] border border-[var(--line)]">
          {([['moy', 'Moyenne'], ['best', 'Meilleure'], ['last', 'Dernière'], ['all', 'Toutes']] as const).map(([k, lab]) => (
            <button key={k} type="button" onClick={() => setNoteMode(k)}
              className={`px-3 py-1.5 text-[12px] ${noteMode === k ? 'bg-accent text-[var(--accent-ink)]' : 'bg-[var(--surface)] text-ink'}`}>{lab}</button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-left text-[11px] uppercase tracking-wide text-muted">Élève</th>
              {tps.map((tp) => {
                const cs = compsOf(tp);
                return (
                  <th key={tp} title={tp} className="border-b border-[var(--line)] px-2.5 py-2 text-center text-[11px] font-semibold text-muted">
                    {tpName(tp)}
                    {cs.length > 0 && <span className="mt-0.5 block font-normal normal-case tracking-normal text-[10px] text-muted">{cs.join(' ')}</span>}
                  </th>
                );
              })}
              <th className="border-b border-[var(--line)] px-2.5 py-2 text-center text-[11px] uppercase tracking-wide text-muted">Moy.</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const perTp = tps.map((tp) => retained(notesOf(s.id, tp)));
              const vals = perTp.filter((v): v is number => v != null);
              const moy = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
              return (
                <tr key={s.id} className="hover:bg-[var(--surface-2)]">
                  <td className="sticky left-0 z-10 border-b border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 font-semibold">{s.full_name ?? '—'}</td>
                  {tps.map((tp) => cell(notesOf(s.id, tp)))}
                  <td className="border-b border-[var(--line)] px-2.5 py-2 text-center font-bold">{moy != null ? fmt1(moy) : <span className="text-[var(--line)]">—</span>}</td>
                </tr>
              );
            })}
            <tr className="bg-[var(--surface-2)] font-bold">
              <td className="sticky left-0 z-10 bg-[var(--surface-2)] px-2.5 py-2 text-left">Moyenne classe</td>
              {tps.map((tp) => { const a = classAvg(tp); return <td key={tp} className="px-2.5 py-2 text-center">{a != null ? fmt1(a) : '—'}</td>; })}
              <td className="px-2.5 py-2 text-center">—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[11px] w-[11px] rounded-[3px]" style={{ background: 'var(--good)' }} />≥ 14</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[11px] w-[11px] rounded-[3px]" style={{ background: 'var(--warn)' }} />10 – 14</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[11px] w-[11px] rounded-[3px]" style={{ background: 'var(--crit)' }} />&lt; 10</span>
        <span className="inline-flex items-center gap-1.5"><b className="rounded-full bg-accent px-1.5 text-[9.5px] text-[var(--accent-ink)]">×N</b>plusieurs passages (TP refait après clôture)</span>
        <span>Sous chaque TP : les compétences qu’il évalue.</span>
      </div>
      <p className="mt-2 text-[12px] text-muted">Chaque passage clôturé reste une note : un TP refait porte le badge <b>×N</b>. La cellule montre la note retenue selon le réglage ci-dessus.</p>
    </>
  );
}

/* ------------------------------------------------------------ Compétences */

function CompTab({ diploma, students, kept, studentId, setStudentId, pct, coef, savePct, saveCoef }: {
  diploma: DiplomaId;
  students: StudentBrief[];
  kept: AttemptWithStudent[];
  studentId: string | null;
  setStudentId: (id: string) => void;
  pct: Record<string, number>;
  coef: Record<string, number>;
  savePct: (key: string, v: number) => void;
  saveCoef: (code: string, v: number) => void;
}) {
  const mine = useMemo(() => kept.filter((a) => a.student_id === studentId), [kept, studentId]);
  const avgs = useMemo(() => competenceAverages(mine, diploma), [mine, diploma]);
  const scores = useMemo(() => competenceScoreMap(mine, diploma), [mine, diploma]);
  const epreuves = useMemo(() => epreuvesOf(diploma), [diploma]);

  const notes = epreuves.map((ep) => ({
    ep,
    coefEff: coef[ep.code] ?? ep.coef,
    ...epreuveNote(scores, ep, pct),
  }));
  const exam = examNote20(notes.map((n) => ({ code: n.ep.code, note20: n.note20, coef: n.coefEff })));

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-muted">Élève :</span>
        <select value={studentId ?? ''} onChange={(e) => setStudentId(e.target.value)}
          className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[13px]">
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>)}
        </select>
        <span className="text-[12px] text-muted">Compétence vue sur plusieurs TP = moyenne des scores.</span>
      </div>

      <section className="mb-4 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-3.5">
        <h2 className="m-0 mb-2 text-[14px] font-bold">Bilan par compétence — référentiel {diplomaShort(diploma)}</h2>

        {/* En-tête de colonnes (masqué sur mobile, où chaque ligne se replie) */}
        <div className="hidden items-center gap-x-3 border-b border-[var(--line)] px-2 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted sm:flex">
          <span className="w-[42px] shrink-0">Comp.</span>
          <span className="min-w-[180px] flex-1">Intitulé</span>
          <span className="w-[86px] shrink-0">Épreuve</span>
          <span className="w-[46px] shrink-0 text-right">/20</span>
          <span className="w-[110px] shrink-0" />
          <span className="w-[136px] shrink-0 text-right">Niveau</span>
        </div>

        {COMPETENCES[diploma].map((c) => {
          const a = avgs[c.code];
          const evaluated = a != null;
          const niv = niveauOf(a?.score ?? 0, evaluated);
          const eps = epreuvesOfCompetence(diploma, c.code);
          return (
            <div
              key={c.code}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--line)] px-2 py-2 hover:bg-[var(--surface-2)] ${evaluated ? '' : 'opacity-50'}`}
            >
              <span className="w-[42px] shrink-0 text-[12.5px] font-extrabold">{c.code}</span>
              <span className="min-w-[180px] flex-1 text-[12.5px] leading-tight">{c.label}</span>
              <span className="w-[86px] shrink-0 text-[10.5px] font-bold text-accent">
                {eps.length ? eps.map((e) => `${e.code} ${e.pct}%`).join(' · ') : 'hors épreuve'}
              </span>
              <span className="w-[46px] shrink-0 text-right font-mono-num text-[12.5px] font-bold" style={evaluated ? { color: NIVEAU_COLOR[niv] } : {}}>
                {evaluated ? fmt1(a.score * 20) : '—'}
              </span>
              <span className="hidden h-[8px] w-[110px] shrink-0 overflow-hidden rounded bg-[var(--line)] sm:block">
                {evaluated && <i className="block h-full" style={{ width: `${Math.round(a.score * 100)}%`, background: NIVEAU_COLOR[niv] }} />}
              </span>
              <span className="w-[136px] shrink-0 text-right">
                <span className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: NIVEAU_COLOR[niv], color: NIVEAU_ON[niv] }}>
                  {NIVEAU_BILAN[niv]}
                </span>
              </span>
            </div>
          );
        })}
      </section>

      <section className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-3.5">
        <h2 className="m-0 mb-1 text-[14px] font-bold">Épreuves professionnelles — note pondérée</h2>
        {!hasEpreuves(diploma) ? (
          <p className="text-[12.5px] text-muted">Aucune épreuve définie pour ce diplôme.</p>
        ) : (
          <>
            <p className="mb-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-muted">
              Note d’épreuve = Σ(score × %) / Σ(%) × 20, avec les <b>pourcentages du référentiel métier</b>.
              Les compétences non encore évaluées sont exclues et la pondération renormalisée.
            </p>

            {exam != null && (
              <div className="mb-3 flex flex-wrap items-center gap-4 rounded-[12px] border border-accent bg-accent/[.06] px-3.5 py-2.5">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Note d’examen projetée</div>
                  <div className="font-mono-num text-[28px] font-extrabold text-accent">{fmt1(exam)}<span className="text-[14px] text-muted"> /20</span></div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
                  {notes.filter((n) => n.note20 != null).map((n) => (
                    <span key={n.ep.code} className="inline-flex items-center gap-1">
                      {n.ep.code} <b style={{ color: noteColor(n.note20 as number) }}>{fmt1(n.note20 as number)}</b> × coef
                      <input type="number" min={0} step={1} value={n.coefEff}
                        onChange={(ev) => saveCoef(n.ep.code, Math.max(0, Number(ev.target.value) || 0))}
                        className="w-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 text-center" />
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map(({ ep, note20, used, total, couverture, coefEff }) => {
                const niv = niveauOf((note20 ?? 0) / 20, note20 != null);
                return (
                  <div key={ep.code} className="rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
                    <div className="text-[11px] font-bold text-accent">{ep.code} · coef {coefEff}</div>
                    <h3 className="m-0 text-[13px]">{ep.nom}</h3>
                    {note20 == null ? (
                      <div className="my-1 font-mono-num text-[22px] font-extrabold text-[var(--line)]">—</div>
                    ) : (
                      <>
                        <div className="my-1 font-mono-num text-[24px] font-extrabold" style={{ color: noteColor(note20) }}>{fmt1(note20)}<span className="text-[12px] text-muted"> /20</span></div>
                        <div className="text-[11px] font-bold" style={{ color: NIVEAU_COLOR[niv] }}>{NIVEAU_BILAN[niv]} · {used.length}/{total} comp. ({couverture} %)</div>
                      </>
                    )}
                    <table className="mt-2 w-full text-[11.5px]">
                      <thead><tr className="text-muted"><th className="py-0.5 text-left font-semibold">Comp.</th><th className="py-0.5 text-right font-semibold">/20</th><th className="py-0.5 text-right font-semibold">%</th></tr></thead>
                      <tbody>
                        {Object.keys(ep.poids).map((code) => {
                          const sc = scores[code];
                          const p = pct[`${ep.code}.${code}`] ?? ep.poids[code];
                          return (
                            <tr key={code} className="border-t border-[var(--line)]" style={sc == null ? { opacity: 0.45 } : {}}>
                              <td className="py-0.5 text-left">{code}</td>
                              <td className="py-0.5 text-right font-mono-num font-bold" style={sc == null ? {} : { color: noteColor(sc * 20) }}>
                                {sc == null ? '—' : fmt1(sc * 20)}
                              </td>
                              <td className="py-0.5 text-right">
                                <input type="number" min={0} step={1} value={p}
                                  onChange={(ev) => savePct(`${ep.code}.${code}`, Math.max(0, Number(ev.target.value) || 0))}
                                  className="w-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-1 py-0.5 text-center" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
