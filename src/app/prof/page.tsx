'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMyProfile } from '@/lib/db/profiles';
import {
  assignTp,
  createClass,
  getAttemptDetail,
  listClassAttempts,
  listClassStudents,
  listMyClasses,
  type AttemptWithStudent,
  type StudentBrief,
} from '@/lib/db/classes';
import { listTps, type TpSummary } from '@/lib/db/tps';
import type { ClassRow, ProfileRow } from '@/lib/db/types';
import { DIPLOMAS, type CompetenceEval, type DiplomaId, type Mastery } from '@/lib/data/competences';

const STAGES = 8;

const STATUS_STYLE: Record<string, string> = {
  en_cours: 'bg-[#FEF3E2] text-[#D97706]',
  termine: 'bg-[#E7F6EE] text-[#1E9E63]',
  abandonne: 'bg-[#F5F6F8] text-[#66717F]',
};
const STATUS_LABEL: Record<string, string> = {
  en_cours: 'En cours',
  termine: 'Terminé',
  abandonne: 'Abandonné',
};

const MASTERY_STYLE: Record<Mastery, string> = {
  acquis: 'bg-[#E7F6EE] text-[#1E9E63] border-[#1E9E63]',
  enCours: 'bg-[#FEF3E2] text-[#D97706] border-[#E39A00]',
  nonAcquis: 'bg-[#FBE9E9] text-[#D93A3A] border-[#D93A3A]',
  nonEvalue: 'bg-[#F5F6F8] text-[#66717F] border-[#D3D9E1]',
};
const MASTERY_LABEL: Record<Mastery, string> = {
  acquis: 'acquis',
  enCours: 'en cours',
  nonAcquis: 'non acquis',
  nonEvalue: 'non évalué',
};
const DIPLOMA_SHORT: Record<string, string> = Object.fromEntries(DIPLOMAS.map((d) => [d.id, d.short]));

/** Grille compacte : un pastille par compétence, code + niveau. */
function GrilleCompetences({ evaluation }: { evaluation: CompetenceEval[] }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {evaluation.map((c) => (
        <li
          key={c.code}
          title={`${c.label} — ${MASTERY_LABEL[c.mastery]} (${Math.round(c.score * 100)} %)`}
          className={`rounded-md border px-1.5 py-0.5 font-[var(--font-mono)] text-[11px] font-semibold ${MASTERY_STYLE[c.mastery]}`}
        >
          {c.code}
          <span className="ml-1 font-normal opacity-80">{Math.round(c.score * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

type Detail = Awaited<ReturnType<typeof getAttemptDetail>>;

export default function ProfPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentBrief[]>([]);
  const [attempts, setAttempts] = useState<AttemptWithStudent[]>([]);
  const [tps, setTps] = useState<TpSummary[]>([]);
  const [newClass, setNewClass] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [assignChoice, setAssignChoice] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [diplomaFilter, setDiplomaFilter] = useState<DiplomaId | 'tous'>('tous');

  const shownAttempts = useMemo(
    () => (diplomaFilter === 'tous' ? attempts : attempts.filter((a) => a.diploma === diplomaFilter)),
    [attempts, diplomaFilter],
  );

  const current = useMemo(() => classes.find((c) => c.id === currentId) ?? null, [classes, currentId]);

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setProfile(p);
        if (p && (p.role === 'professeur' || p.role === 'admin')) {
          const [cs, ts] = await Promise.all([listMyClasses(), listTps()]);
          setClasses(cs);
          setTps(ts);
          setAssignChoice(ts[0]?.id ?? '');
          setCurrentId(cs[0]?.id ?? null);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = useCallback(async (classId: string) => {
    try {
      const [st, at] = await Promise.all([listClassStudents(classId), listClassAttempts(classId)]);
      setStudents(st);
      setAttempts(at);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    }
  }, []);

  useEffect(() => {
    if (!currentId) return;
    refresh(currentId);
    const supabase = createClient();
    const channel = supabase
      .channel(`attempts-${currentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, () => {
        refresh(currentId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentId, refresh]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    getAttemptDetail(openId)
      .then(setDetail)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, [openId]);

  async function onCreateClass() {
    setErr(null);
    setMsg(null);
    try {
      const c = await createClass(newClass.trim(), newLevel.trim() || undefined);
      setClasses((prev) => [...prev, c]);
      setCurrentId(c.id);
      setNewClass('');
      setNewLevel('');
      setMsg(`Classe créée. Code à donner aux élèves : ${c.join_code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function onAssign() {
    if (!currentId || !assignChoice) return;
    setErr(null);
    setMsg(null);
    try {
      await assignTp(currentId, assignChoice);
      setMsg('TP attribué à la classe.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    }
  }

  if (loading) return <main className="mx-auto max-w-6xl p-6 text-sm text-[#66717F]">Chargement…</main>;

  if (!profile || (profile.role !== 'professeur' && profile.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-[var(--font-title)] text-2xl font-bold uppercase tracking-wide">Espace professeur</h1>
        <p className="mt-2 text-sm text-[#66717F]">
          Cet espace est réservé aux comptes professeur. Demande à l&apos;administrateur de passer ton rôle à
          « professeur ».
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <h1 className="font-[var(--font-title)] text-3xl font-bold uppercase tracking-wide">Tableau de bord</h1>

      <section className="rounded-xl border border-[#D3D9E1] bg-white p-5">
        <h2 className="font-[var(--font-title)] text-xl font-semibold uppercase tracking-wide">Mes classes</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => setCurrentId(c.id)}
              className={`min-h-[40px] rounded-lg border px-3 text-sm ${
                c.id === currentId ? 'border-[#141A21] bg-[#141A21] text-white' : 'border-[#D3D9E1] bg-white'
              }`}
            >
              {c.name}
              <span className="ml-2 font-[var(--font-mono)] text-xs opacity-70">{c.join_code}</span>
            </button>
          ))}
          {classes.length === 0 && <p className="text-sm text-[#66717F]">Aucune classe pour le moment.</p>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#D3D9E1] pt-4">
          <input
            value={newClass}
            onChange={(e) => setNewClass(e.target.value)}
            placeholder="Nom de la classe (1 MELEC A)"
            className="min-h-[44px] flex-1 rounded-lg border border-[#D3D9E1] px-3 text-sm"
          />
          <input
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            placeholder="Niveau"
            className="min-h-[44px] w-32 rounded-lg border border-[#D3D9E1] px-3 text-sm"
          />
          <button
            onClick={onCreateClass}
            disabled={newClass.trim().length < 2}
            className="min-h-[44px] rounded-lg bg-[#E39A00] px-5 text-sm font-semibold text-[#141A21] disabled:opacity-50"
          >
            Créer
          </button>
        </div>
      </section>

      {current && (
        <>
          <section className="rounded-xl border border-[#D3D9E1] bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-[var(--font-title)] text-xl font-semibold uppercase tracking-wide">
                {current.name}
              </h2>
              <span className="rounded-full bg-[#F5F6F8] px-3 py-1 font-[var(--font-mono)] text-xs">
                code {current.join_code}
              </span>
              <span className="text-sm text-[#66717F]">
                {students.length} élève{students.length > 1 ? 's' : ''}
              </span>
              <div className="ml-auto flex gap-2">
                <select
                  value={assignChoice}
                  onChange={(e) => setAssignChoice(e.target.value)}
                  className="min-h-[44px] rounded-lg border border-[#D3D9E1] px-3 text-sm"
                >
                  {tps.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onAssign}
                  className="min-h-[44px] rounded-lg border border-[#D3D9E1] px-4 text-sm font-semibold"
                >
                  Attribuer
                </button>
              </div>
            </div>
            {students.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {students.map((s) => (
                  <li key={s.id} className="rounded-full bg-[#F5F6F8] px-3 py-1 text-xs text-[#66717F]">
                    {s.full_name ?? s.email}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-wrap items-center gap-2 rounded-xl border border-[#D3D9E1] bg-white p-3">
            <span className="text-sm text-[#66717F]">Filtrer par diplôme :</span>
            {(['tous', ...DIPLOMAS.map((d) => d.id)] as (DiplomaId | 'tous')[]).map((id) => (
              <button
                key={id}
                onClick={() => setDiplomaFilter(id)}
                className={`min-h-[40px] rounded-lg border px-3 text-sm ${
                  diplomaFilter === id ? 'border-[#141A21] bg-[#141A21] text-white' : 'border-[#D3D9E1] bg-white'
                }`}
              >
                {id === 'tous' ? 'Tous' : DIPLOMA_SHORT[id]}
              </button>
            ))}
          </section>

          <section className="overflow-x-auto rounded-xl border border-[#D3D9E1] bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#F5F6F8] text-left text-xs uppercase tracking-wide text-[#66717F]">
                <tr>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Diplôme</th>
                  <th className="px-4 py-3">TP</th>
                  <th className="px-4 py-3">Étape</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Dernière activité</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {shownAttempts.map((a) => (
                  <tr key={a.id} className="border-t border-[#D3D9E1] align-top">
                    <td className="px-4 py-3">
                      {a.student?.full_name ?? a.student?.email ?? '—'}
                      {a.status === 'termine' && a.evaluation && a.evaluation.length > 0 && (
                        <div className="mt-1.5 max-w-[280px]">
                          <GrilleCompetences evaluation={a.evaluation} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66717F]">
                      {a.diploma ? DIPLOMA_SHORT[a.diploma] ?? a.diploma : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#66717F]">{a.tp_id}</td>
                    <td className="px-4 py-3 font-[var(--font-mono)]">
                      {a.stage}/{STAGES}
                    </td>
                    <td className="px-4 py-3 font-[var(--font-mono)]">{a.score ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLE[a.status]}`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[#66717F]">{when(a.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setOpenId(openId === a.id ? null : a.id)}
                        className="rounded-lg border border-[#D3D9E1] px-3 py-2 text-xs font-semibold"
                      >
                        {openId === a.id ? 'Fermer' : 'Détail'}
                      </button>
                    </td>
                  </tr>
                ))}
                {shownAttempts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-[#66717F]">
                      {attempts.length === 0
                        ? 'Aucune tentative pour cette classe.'
                        : 'Aucune tentative pour ce diplôme.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {openId && (
            <section className="grid gap-4 rounded-xl border border-[#D3D9E1] bg-white p-5 md:grid-cols-2">
              <div>
                <h3 className="font-[var(--font-title)] text-lg font-semibold uppercase tracking-wide">Relevés</h3>
                <ul className="mt-2 space-y-1">
                  {detail?.measurements.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 border-b border-[#F5F6F8] py-1 text-sm">
                      <span className="font-[var(--font-mono)] text-xs text-[#66717F]">é{m.stage}</span>
                      <span className="text-[#66717F]">{m.instrument}</span>
                      <span>{m.point}</span>
                      <span className="ml-auto font-[var(--font-mono)]">{m.display ?? m.value}</span>
                    </li>
                  ))}
                  {detail && detail.measurements.length === 0 && (
                    <li className="text-sm text-[#66717F]">Aucun relevé.</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="font-[var(--font-title)] text-lg font-semibold uppercase tracking-wide">
                  Échanges avec le professeur virtuel
                </h3>
                <ul className="mt-2 space-y-2">
                  {detail?.messages.map((m) => (
                    <li
                      key={m.id}
                      className={`rounded-lg p-2 text-sm ${
                        m.role === 'user' ? 'bg-[#F5F6F8]' : 'bg-[#FEF3E2]'
                      }`}
                    >
                      <span className="font-[var(--font-mono)] text-[10px] uppercase text-[#66717F]">
                        {m.role === 'user' ? 'élève' : 'prof'} · étape {m.stage}
                      </span>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </li>
                  ))}
                  {detail && detail.messages.length === 0 && (
                    <li className="text-sm text-[#66717F]">Aucun échange.</li>
                  )}
                </ul>
              </div>
            </section>
          )}
        </>
      )}

      {msg && <p className="text-sm text-[#1E9E63]">{msg}</p>}
      {err && <p className="text-sm text-[#D93A3A]">{err}</p>}
    </main>
  );
}
