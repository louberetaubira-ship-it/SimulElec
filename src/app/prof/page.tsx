'use client';

import Link from 'next/link';
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
import { addMessage } from '@/lib/db/attempts';
import { listTps, resolveDefinition, type TpSummary } from '@/lib/db/tps';
import type { ClassRow, ProfileRow } from '@/lib/db/types';
import type { TpDefinition } from '@/lib/types';
import {
  COMPETENCES, DIPLOMAS, grilleComplete, niveauOfEval,
  NIVEAU_COLOR, NIVEAU_ON, NIVEAU_TP, type CompetenceEval, type DiplomaId, type Niveau,
} from '@/lib/data/competences';
import { STAGE_COUNT, modeOf } from '@/lib/sim/progress';
import { liveBilan, liveEvaluation, liveNotes, type LiveBilan, type LiveNotes } from '@/lib/sim/live';
import { noteSur20 } from '@/lib/eleve-stats';
import { ONLINE_MS, presenceStats, formatDuree, type PresenceStat } from '@/lib/db/presence';

/** Nombre d'étapes du parcours. */
const ETAPES = STAGE_COUNT - 1;

const DIPLOMA_SHORT: Record<string, string> = Object.fromEntries(DIPLOMAS.map((d) => [d.id, d.short]));

/** Note formatée à la française (14,5). */
const fr = (n: number) => n.toFixed(1).replace('.', ',');

/** Point de présence : vert clignotant en ligne, rouge fixe hors ligne (inactif). */
function OnlineDot({ online }: { online: boolean }) {
  if (!online) return <span className="inline-block h-2.5 w-2.5 flex-none rounded-full bg-[#DC2626]" title="Hors ligne (inactif)" />;
  return (
    <span className="relative flex h-2.5 w-2.5 flex-none" title="En ligne">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
    </span>
  );
}

/** Couleur d'une note sur 20 (vert / ambre / rouge). */
const noteColor = (n: number | null) => (n == null ? '#94A3B8' : n >= 14 ? '#1E9E63' : n >= 10 ? '#E39A00' : '#D93A3A');

/** Échelle « maîtrise » (pendant le TP), pour la légende de couleurs. */
const NIVEAUX_TP: Niveau[] = ['total', 'maitrise', 'partiel', 'encours', 'insuffisant', 'nonMaitrise', 'nonEvalue'];

/** Jauge circulaire de note (sur 20). */
function Gauge({ note, size, stroke }: { note: number | null; size: number; stroke: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = note == null ? 0 : Math.max(0, Math.min(1, note / 20));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7EAEF" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={noteColor(note)} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  );
}

/** Bande fixe du référentiel : une case par compétence (C1→C13), couleur = niveau, gris = non évaluée. */
function Strip({ evaluation, diploma }: { evaluation: CompetenceEval[]; diploma: DiplomaId | null }) {
  if (!diploma) return <span className="text-xs text-[#94A3B8]">—</span>;
  return (
    <div className="flex gap-[2px]">
      {grilleComplete(diploma, evaluation).map((c) => {
        const n = niveauOfEval(c);
        return (
          <div key={c.code} title={`${c.code} · ${c.label} — ${NIVEAU_TP[n]}`}
            className="grid h-[24px] w-[22px] place-items-center rounded-[3px] text-[8px] font-bold"
            style={{ background: NIVEAU_COLOR[n], color: NIVEAU_ON[n] }}>
            {c.code.replace(/^C[O]?/, '')}
          </div>
        );
      })}
    </div>
  );
}

/** Barre pleine d'une compétence (tiroir de détail) — vocabulaire « maîtrise ». */
function CompBar({ c }: { c: CompetenceEval }) {
  const n = niveauOfEval(c);
  const w = n === 'nonEvalue' ? 4 : Math.max(6, Math.round(c.score * 100));
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[13px]"><b className="font-semibold">{c.code} · {c.label}</b></span>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: NIVEAU_COLOR[n], color: NIVEAU_ON[n] }}>{NIVEAU_TP[n]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E7EAEF]">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: NIVEAU_COLOR[n] }} />
      </div>
    </div>
  );
}

/** Tuile de synthèse en tête de tableau. */
function Tile({ k, v, unit, meta, tag, color }: {
  k: string; v: string | number; unit?: string; meta?: string; tag?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E7EAEF] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.05)]">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#94A3B8]">
        {k}
        {tag && (
          <span className="rounded bg-[#FEF3E2] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#B45309]">
            {tag}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5 font-[var(--font-title)] text-[26px] font-bold" style={{ color }}>
        {v}
        {unit && <span className="text-[13px] font-semibold text-[#94A3B8]">{unit}</span>}
      </div>
      {meta && <div className="mt-0.5 text-[12px] text-[#66717F]">{meta}</div>}
    </div>
  );
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function hhmm(d: Date | null): string {
  return d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
}

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
  const [assignMode, setAssignMode] = useState<'libre' | 'entrainement' | 'evaluation'>('libre');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getAttemptDetail>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [diplomaFilter, setDiplomaFilter] = useState<DiplomaId | 'tous'>('tous');
  const [modeFilter, setModeFilter] = useState<'evaluation' | 'entrainement' | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [defs, setDefs] = useState<Record<string, TpDefinition | null>>({});
  const [manage, setManage] = useState(false);
  const [presence, setPresence] = useState<Record<string, PresenceStat>>({});
  const [nowTs, setNowTs] = useState(() => Date.now());
  // Décalage horloge-appareil ↔ serveur (ms). last_seen_at est en heure SERVEUR ;
  // si l'horloge de l'appareil (tableau interactif, kiosque) est fausse, comparer à
  // Date.now() ferait paraître tout le monde hors ligne. On corrige avec l'heure serveur.
  const [clockOffset, setClockOffset] = useState(0);

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const lastSeenOf = useCallback((id: string) => studentsById.get(id)?.last_seen_at ?? null, [studentsById]);
  const isOnline = useCallback((id: string) => {
    const ls = lastSeenOf(id);
    return ls ? (nowTs + clockOffset) - Date.parse(ls) < ONLINE_MS : false;
  }, [lastSeenOf, nowTs, clockOffset]);

  const current = useMemo(() => classes.find((c) => c.id === currentId) ?? null, [classes, currentId]);
  const tpTitle = useMemo(() => new Map(tps.map((t) => [t.id, t.title])), [tps]);

  // Une tentative en cours n'a pas encore de `diploma` (rempli à la fin) : on retombe alors
  // sur le diplôme de la CLASSE, sinon le filtre « Bac Pro MELEC » cache une classe de Bac Pro.
  const shownAttempts = useMemo(
    () => (diplomaFilter === 'tous'
      ? attempts
      : attempts.filter((a) => (a.diploma ?? current?.diploma) === diplomaFilter)),
    [attempts, diplomaFilter, current],
  );
  const visibleAttempts = useMemo(
    () => (modeFilter ? shownAttempts.filter((a) => modeOf(a.state) === modeFilter) : shownAttempts),
    [shownAttempts, modeFilter],
  );

  useEffect(() => {
    const missing = Array.from(new Set(attempts.map((a) => a.tp_id))).filter((id) => !(id in defs));
    if (missing.length === 0) return;
    let alive = true;
    Promise.all(missing.map(async (id) => [id, await resolveDefinition(id).catch(() => null)] as const)).then(
      (pairs) => {
        if (alive) setDefs((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
      },
    );
    return () => { alive = false; };
  }, [attempts, defs]);

  const liveFor = useCallback(
    (a: AttemptWithStudent): { notes: LiveNotes; evaluation: CompetenceEval[] | null; bilan: LiveBilan } | null => {
      const def = defs[a.tp_id];
      if (!def) return null;
      const dip = a.diploma ?? current?.diploma ?? null;
      return {
        notes: liveNotes(def, a.state),
        evaluation: dip ? liveEvaluation(def, a.state, dip) : null,
        bilan: liveBilan(def, a.state),
      };
    },
    [defs, current],
  );

  const live = useMemo(() => visibleAttempts.map((a) => ({ a, l: liveFor(a) })), [visibleAttempts, liveFor]);

  const stats = useMemo(() => {
    const enc = live.filter((x) => x.a.status === 'en_cours');
    const active = new Set(enc.map((x) => x.a.student_id)).size;
    const provs = enc.map((x) => x.l?.notes.provisoire).filter((n): n is number => n != null);
    const moy = provs.length ? provs.reduce((a, b) => a + b, 0) / provs.length : null;
    const avg = enc.length ? enc.reduce((s, x) => s + x.a.stage, 0) / enc.length : 0;
    const vig = enc.reduce((s, x) => s + (x.l?.bilan.vigilances.length ?? 0), 0);
    return { active, moy, avg, vig };
  }, [live]);

  const dominantTp = useMemo(() => {
    const count: Record<string, number> = {};
    visibleAttempts.forEach((a) => { count[a.tp_id] = (count[a.tp_id] ?? 0) + 1; });
    const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  }, [visibleAttempts]);

  const openedAttempt = useMemo(() => attempts.find((a) => a.id === openId) ?? null, [attempts, openId]);

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
      setLastSync(new Date());
      // Recale l'horloge sur le serveur : la présence ne dépend plus de l'heure de l'appareil.
      void (async () => {
        try {
          const { data } = await createClient().rpc('server_now');
          if (typeof data === 'string') setClockOffset(Date.parse(data) - Date.now());
        } catch { /* on garde le décalage précédent */ }
      })();
      presenceStats(st.map((s) => s.id)).then(setPresence).catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
    }
  }, []);

  useEffect(() => {
    if (!currentId) return;
    refresh(currentId);
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // IMPORTANT : le client @supabase/ssr ne propage pas toujours le jeton de session
      // au canal Realtime. Sans lui, la RLS de `postgres_changes` ne délivre AUCUN
      // événement (le serveur ne sait pas que c'est un enseignant). On le force donc,
      // sinon la présence temps réel ne remonte jamais et un onglet bridé reste figé.
      try {
        const { data } = await supabase.auth.getSession();
        supabase.realtime.setAuth(data.session?.access_token ?? null);
      } catch { /* la présence reste sur le filet de sécurité (poll) */ }
      if (cancelled) return;

      channel = supabase
        .channel(`classe-${currentId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, () => refresh(currentId))
        // Présence en TEMPS RÉEL : chaque battement d'élève met à jour last_seen_at ;
        // on l'applique directement (websocket, indépendant des timers), pour que TOUTES
        // les sessions prof/admin voient le même état — fini la divergence PC / tableau.
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `class_id=eq.${currentId}` },
          (payload) => {
            const row = payload.new as { id?: string; last_seen_at?: string | null };
            if (!row?.id) return;
            setStudents((prev) => prev.map((s) => (s.id === row.id ? { ...s, last_seen_at: row.last_seen_at ?? s.last_seen_at } : s)));
          },
        )
        .subscribe();
    })();

    // Filet de sécurité : re-synchro périodique et au retour de l'onglet (si le websocket a sauté).
    const poll = window.setInterval(() => refresh(currentId), 20_000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(currentId); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [currentId, refresh]);

  // horloge locale : rafraîchit les libellés « en ligne » / « il y a X » sans re-requêter
  useEffect(() => {
    const t = window.setInterval(() => setNowTs(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    getAttemptDetail(openId).then(setDetail).catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, [openId]);

  async function onCreateClass() {
    setErr(null); setMsg(null);
    try {
      const c = await createClass(newClass.trim(), null, newLevel.trim() || undefined);
      setClasses((prev) => [...prev, c]);
      setCurrentId(c.id);
      setNewClass(''); setNewLevel('');
      setMsg(`Classe créée. Code à donner aux élèves : ${c.join_code}`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
  }

  async function onAssign() {
    if (!currentId || !assignChoice) return;
    setErr(null); setMsg(null);
    try {
      await assignTp(currentId, assignChoice, null, assignMode === 'libre' ? null : assignMode);
      setMsg(assignMode === 'libre'
        ? 'TP attribué (chaque élève choisit son mode).'
        : `TP attribué en mode ${assignMode === 'evaluation' ? 'évaluation' : 'entraînement'}.`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
  }

  async function sendRemediation(a: AttemptWithStudent, bilan: LiveBilan) {
    if (bilan.vigilances.length === 0) { setMsg('Aucun point de vigilance à transmettre.'); return; }
    const text = ['Points à revoir pour progresser :', ...bilan.vigilances.map((v, i) => {
      const rem = v.remediation && v.remediation.length ? ` — à revoir : ${v.remediation.join(', ')}` : '';
      return `${i + 1}. ${v.label} : ${v.detail}${rem}`;
    })].join('\n');
    try {
      await addMessage(a.id, a.stage, 'assistant', text);
      setMsg('Remédiation envoyée à l’élève (visible dans ses échanges avec le professeur).');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
  }

  if (loading) return <main className="mx-auto max-w-6xl p-6 text-sm text-[#66717F]">Chargement…</main>;

  if (!profile || (profile.role !== 'professeur' && profile.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-[var(--font-title)] text-2xl font-bold uppercase tracking-wide">Espace professeur</h1>
        <p className="mt-2 text-sm text-[#66717F]">
          Cet espace est réservé aux comptes professeur. Demande à l&apos;administrateur de passer ton rôle à « professeur ».
        </p>
      </main>
    );
  }

  const openedLive = openedAttempt ? liveFor(openedAttempt) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-title)] text-3xl font-bold uppercase tracking-wide">
            Suivi temps réel{current ? ` — ${current.name}` : ''}
          </h1>
          <p className="mt-1 text-[13.5px] text-[#66717F]">
            {dominantTp ? <>TP <b>{tpTitle.get(dominantTp) ?? dominantTp}</b> · </> : null}
            {current?.diploma ? DIPLOMA_SHORT[current.diploma] : 'Suivi en direct'}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#E7F6EE] px-3 py-1.5 text-[12px] font-bold text-[#1E9E63]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1E9E63] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1E9E63]" />
          </span>
          En direct · dernière synchro {hhmm(lastSync)}
          {Math.abs(clockOffset) > 60_000 && (
            <span className="ml-2 rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]" title="Corrigé automatiquement grâce à l'heure serveur">
              ⏰ horloge de cet écran décalée de {Math.round(clockOffset / 60000)} min
            </span>
          )}
        </span>
      </div>

      {/* Sélecteur de classe */}
      {classes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
          <button
            onClick={() => setManage((m) => !m)}
            className="ml-auto min-h-[40px] rounded-lg border border-[#D3D9E1] bg-white px-3 text-sm font-semibold"
          >
            {manage ? 'Fermer la gestion' : 'Gérer / attribuer'}
          </button>
        </div>
      )}

      {/* Gestion (créer une classe, attribuer un TP) — repliée par défaut */}
      {(manage || classes.length === 0) && (
        <section className="mt-3 space-y-3 rounded-xl border border-[#D3D9E1] bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="Nom de la classe (2NDE MELEC A)"
              className="min-h-[44px] flex-1 rounded-lg border border-[#D3D9E1] px-3 text-sm" />
            <input value={newLevel} onChange={(e) => setNewLevel(e.target.value)} placeholder="Niveau"
              className="min-h-[44px] w-32 rounded-lg border border-[#D3D9E1] px-3 text-sm" />
            <button onClick={onCreateClass} disabled={newClass.trim().length < 2}
              className="min-h-[44px] rounded-lg bg-[#E39A00] px-5 text-sm font-semibold text-[#141A21] disabled:opacity-50">
              Créer la classe
            </button>
          </div>
          {current && (
            <div className="flex flex-wrap gap-2 border-t border-[#D3D9E1] pt-3">
              <select value={assignChoice} onChange={(e) => setAssignChoice(e.target.value)}
                className="min-h-[44px] flex-1 rounded-lg border border-[#D3D9E1] px-3 text-sm">
                {tps.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <select value={assignMode} onChange={(e) => setAssignMode(e.target.value as 'libre' | 'entrainement' | 'evaluation')}
                aria-label="Mode imposé" className="min-h-[44px] rounded-lg border border-[#D3D9E1] px-3 text-sm">
                <option value="libre">Mode au choix de l&apos;élève</option>
                <option value="entrainement">Entraînement imposé</option>
                <option value="evaluation">Évaluation imposée</option>
              </select>
              <button onClick={onAssign} className="min-h-[44px] rounded-lg border border-[#D3D9E1] px-4 text-sm font-semibold">
                Attribuer à {current.name}
              </button>
            </div>
          )}
        </section>
      )}

      {current && (
        <>
          {/* Tuiles de synthèse */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile k="En ligne" v={students.filter((s) => isOnline(s.id)).length} unit={`/ ${students.length}`}
              color="#16A34A" meta={`${stats.active} en activité sur un TP`} />
            <Tile k="Note moyenne" tag="prov." v={stats.moy != null ? fr(stats.moy) : '—'} unit="/ 20" meta="à l'instant t" />
            <Tile k="Avancement moyen" v={Math.round((stats.avg / ETAPES) * 100)} unit="%" meta={`étape ${fr(stats.avg)} / ${ETAPES}`} />
            <Tile k="À remédier" v={stats.vig} color={stats.vig > 0 ? '#D93A3A' : undefined} meta="points de vigilance actifs" />
          </div>

          {/* Barre d'outils : mode + diplôme */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[10px] border border-[#D3D9E1] bg-white p-1">
              {(['evaluation', 'entrainement'] as const).map((m) => (
                <button key={m} onClick={() => setModeFilter(modeFilter === m ? null : m)}
                  className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
                    modeFilter === m ? 'bg-[#141A21] text-white' : 'text-[#66717F]'
                  }`}>
                  Mode {m === 'evaluation' ? 'évaluation' : 'entraînement'}
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {(['tous', ...DIPLOMAS.map((d) => d.id)] as (DiplomaId | 'tous')[]).map((id) => (
                <button key={id} onClick={() => setDiplomaFilter(id)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                    diplomaFilter === id ? 'border-[#141A21] bg-[#141A21] text-white' : 'border-[#D3D9E1] bg-white text-[#66717F]'
                  }`}>
                  {id === 'tous' ? 'Tous' : DIPLOMA_SHORT[id]}
                </button>
              ))}
            </div>
          </div>

          {/* Tableau */}
          {/* Légende des compétences (ordre de la bande) */}
          {current?.diploma && (
            <details className="mt-3 rounded-2xl border border-[#E7EAEF] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.05)]" open>
              <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[.06em] text-[#94A3B8]">
                Compétences {DIPLOMA_SHORT[current.diploma]} — la bande « Compétences (t) » suit cet ordre
              </summary>
              <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {COMPETENCES[current.diploma].map((c) => (
                  <div key={c.code} className="flex gap-2 text-[12.5px]">
                    <b className="w-9 flex-none font-[var(--font-mono)] text-[#B45309]">{c.code}</b>
                    <span className="text-[#475569]">{c.label}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Tableau */}
          <section className="mt-3 overflow-hidden rounded-2xl border border-[#E7EAEF] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="bg-[#FAFBFC] text-left text-[11px] uppercase tracking-[.06em] text-[#94A3B8]">
                    <th className="px-4 py-3 font-bold">Élève</th>
                    <th className="px-4 py-3 font-bold">TP · étape</th>
                    <th className="px-4 py-3 font-bold">Note temps réel</th>
                    <th className="px-4 py-3 font-bold">Compétences (t)</th>
                    <th className="px-4 py-3 font-bold">Statut</th>
                    <th className="px-4 py-3 font-bold">Activité</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {live.map(({ a, l }) => {
                    const termine = a.status === 'termine';
                    const noteProv = termine ? (a.score != null ? noteSur20(a.score) : null) : l?.notes.provisoire ?? null;
                    const noteProj = termine ? (a.score != null ? noteSur20(a.score) : null) : l?.notes.projetee ?? null;
                    const evalu = termine ? a.evaluation : l?.evaluation ?? null;
                    const s = a.state as Partial<{ wireErrors: number; poseErrors: number; resets: number; diagTries: number }> | null;
                    const errCount = !termine && s
                      ? (s.wireErrors ?? 0) + (s.poseErrors ?? 0) + (s.resets ?? 0) + Math.max(0, (s.diagTries ?? 0) - 1)
                      : 0;
                    return (
                      <tr key={a.id} className="border-t border-[#E7EAEF] transition-colors hover:bg-[#FAFBFC]">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <OnlineDot online={isOnline(a.student_id)} />
                            <span className="font-semibold">{a.student?.full_name ?? a.student?.email ?? '—'}</span>
                          </div>
                          <div className="mt-0.5 pl-[18px] text-[11.5px] text-[#94A3B8]">
                            {(() => { const d = a.diploma ?? current?.diploma; return d ? DIPLOMA_SHORT[d] ?? d : '—'; })()}
                            {' · '}
                            {(() => {
                              const ls = lastSeenOf(a.student_id);
                              if (isOnline(a.student_id)) return <span className="font-semibold text-[#16A34A]">en ligne</span>;
                              return ls ? `vu le ${when(ls)}` : 'jamais connecté';
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-[13px] text-[#66717F]">{a.tp_id}</div>
                          <div className="font-[var(--font-mono)] text-[13.5px] font-bold">
                            {a.stage}<span className="text-[#94A3B8]">/{ETAPES}</span>
                          </div>
                          <div className="mt-1.5 h-[5px] w-[72px] overflow-hidden rounded-full bg-[#E7EAEF]">
                            <div className="h-full rounded-full bg-[#E39A00]" style={{ width: `${Math.min(100, (a.stage / ETAPES) * 100)}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="relative grid place-items-center" style={{ width: 42, height: 42 }}>
                              <Gauge note={noteProv} size={42} stroke={5} />
                              <span className="absolute font-[var(--font-mono)] text-[12px] font-bold">
                                {noteProv != null ? fr(noteProv) : '—'}
                              </span>
                            </span>
                            <div className="leading-tight">
                              <div className="font-[var(--font-mono)] text-[13.5px] font-bold">
                                {noteProv != null ? fr(noteProv) : '—'}
                                <span className="ml-1 text-[10px] font-normal text-[#94A3B8]">{termine ? 'finale' : 'prov.'}</span>
                              </div>
                              {!termine && (
                                <div className="text-[11px] text-[#66717F]">
                                  projetée {noteProj != null ? fr(noteProj) : '—'}/20
                                </div>
                              )}
                              {!termine && errCount > 0 && (
                                <div className="text-[11px] font-semibold text-[#D93A3A]">
                                  ⚠ {errCount} erreur{errCount > 1 ? 's' : ''} en cours
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">{evalu ? <Strip evaluation={evalu} diploma={a.diploma ?? current?.diploma ?? null} /> : <span className="text-xs text-[#94A3B8]">…</span>}</td>
                        <td className="px-4 py-3.5">
                          {a.status === 'en_cours' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3E2] px-2.5 py-1 text-[12px] font-bold text-[#B45309]">
                              <span className="h-1.5 w-1.5 rounded-full bg-current" /> En cours
                            </span>
                          )}
                          {a.status === 'termine' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F6EE] px-2.5 py-1 text-[12px] font-bold text-[#1E9E63]">Terminé</span>
                          )}
                          {a.status === 'abandonne' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F6F8] px-2.5 py-1 text-[12px] font-bold text-[#66717F]">Abandonné</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-[var(--font-mono)] text-[12.5px] text-[#66717F]">{when(a.updated_at)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <button onClick={() => setOpenId(a.id)}
                            className="rounded-lg border border-[#D3D9E1] bg-white px-3 py-2 text-[12.5px] font-bold hover:border-[#E39A00] hover:text-[#B45309]">
                            Détail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {live.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-[#66717F]">
                      {attempts.length === 0 ? 'Aucune tentative pour cette classe.' : 'Aucune tentative pour ce filtre.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Légende de l'échelle de maîtrise (7 niveaux) */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 text-[12px] text-[#66717F]">
            <span className="font-semibold text-[#141A21]">Maîtrise :</span>
            {NIVEAUX_TP.map((n) => (
              <span key={n} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: NIVEAU_COLOR[n] }} /> {NIVEAU_TP[n]}
              </span>
            ))}
            <span className="ml-auto"><b>prov.</b> = étapes faites · <b>projetée</b> = si arrêt maintenant</span>
          </div>
        </>
      )}

      {msg && <p className="mt-3 text-sm text-[#1E9E63]">{msg}</p>}
      {err && <p className="mt-3 text-sm text-[#D93A3A]">{err}</p>}

      {/* Tiroir latéral de détail */}
      <div
        onClick={() => setOpenId(null)}
        className={`fixed inset-0 z-40 bg-[rgba(15,23,42,.42)] transition-opacity ${openId ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(480px,100%)] flex-col bg-white shadow-[0_12px_48px_rgba(15,23,42,.18)] transition-transform ${
          openId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {openedAttempt && (
          <>
            <div className="border-b border-[#E7EAEF] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-[var(--font-title)] text-xl font-bold">{openedAttempt.student?.full_name ?? '—'}</h2>
                  <div className="mt-0.5 text-[12.5px] text-[#66717F]">
                    {openedAttempt.diploma ? DIPLOMA_SHORT[openedAttempt.diploma] : ''} · TP {openedAttempt.tp_id} · étape {openedAttempt.stage}/{ETAPES}
                  </div>
                </div>
                <button onClick={() => setOpenId(null)} aria-label="Fermer"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-[#F5F6F8] text-[#66717F]">✕</button>
              </div>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EAF1FF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">
                ◷ Évalué à l&apos;instant t · {when(openedAttempt.updated_at)}
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#66717F]">
                <span className="inline-flex items-center gap-1.5">
                  <OnlineDot online={isOnline(openedAttempt.student_id)} />
                  {(() => {
                    const ls = lastSeenOf(openedAttempt.student_id);
                    if (isOnline(openedAttempt.student_id)) return <b className="text-[#16A34A]">En ligne</b>;
                    return ls ? `Vu le ${when(ls)}` : 'Jamais connecté';
                  })()}
                </span>
                {presence[openedAttempt.student_id] && (
                  <span>Temps en ligne : <b>{formatDuree(presence[openedAttempt.student_id].total)}</b> total · {formatDuree(presence[openedAttempt.student_id].today)} aujourd&apos;hui · {formatDuree(presence[openedAttempt.student_id].week)} cette semaine</span>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {openedLive ? (
                <>
                  {/* Deux notes */}
                  <div className="flex items-center gap-4 rounded-2xl border border-[#E7EAEF] bg-[#FAFBFC] p-4">
                    <span className="relative grid place-items-center" style={{ width: 76, height: 76 }}>
                      <Gauge note={openedLive.notes.provisoire} size={76} stroke={7} />
                      <span className="absolute text-center">
                        <b className="block font-[var(--font-mono)] text-[20px] font-bold leading-none">
                          {openedLive.notes.provisoire != null ? fr(openedLive.notes.provisoire) : '—'}
                        </b>
                        <span className="text-[10px] text-[#94A3B8]">/ 20 prov.</span>
                      </span>
                    </span>
                    <div className="text-[12.5px] leading-relaxed">
                      <b className="text-[14px]">Deux notes à l&apos;instant t</b>
                      <p className="mt-1 text-[#66717F]">
                        <b className="text-[#1E9E63]">{openedLive.notes.provisoire != null ? fr(openedLive.notes.provisoire) : '—'}/20 provisoire</b>
                        {' '}— qualité des étapes réalisées.<br />
                        <b className="text-[#B45309]">{fr(openedLive.notes.projetee)}/20 projetée</b>
                        {' '}— si le TP s&apos;arrêtait maintenant.
                      </p>
                    </div>
                  </div>

                  {/* Compétences à l'instant t */}
                  {openedLive.evaluation && openedLive.evaluation.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#94A3B8]">
                        Compétences évaluées à l&apos;instant t
                      </h3>
                      {openedLive.evaluation.map((c) => <CompBar key={c.code} c={c} />)}
                    </div>
                  )}

                  {/* Ce qui est bien réalisé */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#94A3B8]">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#1E9E63]" /> Ce qui est bien réalisé
                      <span className="ml-auto text-[#94A3B8]">{openedLive.bilan.forces.length}</span>
                    </h3>
                    <div className="space-y-1.5">
                      {openedLive.bilan.forces.map((f) => (
                        <div key={f.key} className="flex gap-2.5 rounded-[11px] border border-[#1E9E63]/25 bg-[#1E9E63]/[.06] p-2.5 text-[13px]">
                          <span className="mt-px grid h-5 w-5 flex-none place-items-center rounded-md bg-[#1E9E63] text-[12px] font-bold text-white">✓</span>
                          <span><b className="font-semibold">{f.label}</b><span className="text-[#66717F]"> — {f.detail}</span></span>
                        </div>
                      ))}
                      {openedLive.bilan.forces.length === 0 && <p className="text-[13px] text-[#66717F]">Rien de consolidé pour l&apos;instant.</p>}
                    </div>
                  </div>

                  {/* Points de vigilance → remédiation */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#94A3B8]">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#E39A00]" /> Points de vigilance → remédiation
                      <span className="ml-auto text-[#94A3B8]">{openedLive.bilan.vigilances.length}</span>
                    </h3>
                    <div className="space-y-1.5">
                      {openedLive.bilan.vigilances.map((v) => (
                        <div key={v.key} className="flex gap-2.5 rounded-[11px] border border-[#E39A00]/30 bg-[#E39A00]/[.08] p-2.5 text-[13px]">
                          <span className="mt-px grid h-5 w-5 flex-none place-items-center rounded-md bg-[#E39A00] text-[12px] font-bold text-[#3D2C00]">!</span>
                          <span>
                            <b className="font-semibold">{v.label}</b><span className="text-[#66717F]"> — {v.detail}</span>
                            {v.remediation && v.remediation.length > 0 && (
                              <span className="mt-1 block text-[12px] font-semibold text-[#B45309]">→ Remédiation : {v.remediation.join(' · ')}</span>
                            )}
                          </span>
                        </div>
                      ))}
                      {openedLive.bilan.vigilances.length === 0 && <p className="text-[13px] text-[#66717F]">Aucun point de vigilance sur les étapes réalisées.</p>}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-[#66717F]">Chargement du bilan…</p>
              )}

              {/* Relevés et échanges */}
              <details className="rounded-xl border border-[#E7EAEF] bg-[#FAFBFC] p-3">
                <summary className="cursor-pointer text-[12px] font-semibold text-[#66717F]">Relevés et échanges avec le professeur virtuel</summary>
                <ul className="mt-2 space-y-1">
                  {detail?.measurements.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 border-b border-[#EEF1F5] py-1 text-[12.5px]">
                      <span className="font-[var(--font-mono)] text-[11px] text-[#94A3B8]">é{m.stage}</span>
                      <span className="text-[#66717F]">{m.instrument}</span><span>{m.point}</span>
                      <span className="ml-auto font-[var(--font-mono)]">{m.display ?? m.value}</span>
                    </li>
                  ))}
                  {detail && detail.measurements.length === 0 && <li className="text-[12.5px] text-[#66717F]">Aucun relevé.</li>}
                </ul>
                <ul className="mt-2 space-y-1.5">
                  {detail?.messages.map((m) => (
                    <li key={m.id} className={`rounded-lg p-2 text-[12.5px] ${m.role === 'user' ? 'bg-white' : 'bg-[#FEF3E2]'}`}>
                      <span className="font-[var(--font-mono)] text-[10px] uppercase text-[#94A3B8]">{m.role === 'user' ? 'élève' : 'prof'} · étape {m.stage}</span>
                      <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="flex gap-2.5 border-t border-[#E7EAEF] p-4">
              <button
                onClick={() => openedLive && sendRemediation(openedAttempt, openedLive.bilan)}
                disabled={!openedLive}
                className="flex-1 rounded-[11px] border border-[#D3D9E1] bg-white py-2.5 text-[13px] font-bold disabled:opacity-50"
              >
                Envoyer une remédiation
              </button>
              <Link href={`/prof/eleve/${openedAttempt.student_id}`}
                className="grid flex-1 place-items-center rounded-[11px] bg-[#141A21] py-2.5 text-[13px] font-bold text-white">
                Voir la fiche élève
              </Link>
            </div>
          </>
        )}
      </aside>
    </main>
  );
}
