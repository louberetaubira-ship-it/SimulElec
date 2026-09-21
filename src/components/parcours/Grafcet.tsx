'use client';

/**
 * Préparation des TP automatisés : découverte du Grafcet, puis Grafcet du TP à compléter.
 *
 * `GrafcetIntro` — premier contact : les cinq éléments, les deux règles d'évolution, les
 * deux points de vue, et une barrière de parking que l'élève fait fonctionner lui-même.
 * Le professeur virtuel lui dit, à chaque clic, pourquoi une transition passe ou non.
 *
 * `GrafcetPortail` — le Grafcet de programmation du portail (point de vue partie commande),
 * huit cases vides. Chaque case est une question de préparation : elle se note avec le
 * même barème QCM que le reste de l'étape.
 */
import React from 'react';
import type { AttemptState, PrepQuestion } from '@/lib/types';
import { shuffledOrder } from '@/lib/sim/shuffle';

const INK = '#141A21';

/* ------------------------------------------------------------------ préliminaire */

const NOTIONS: [string, string][] = [
  ['Étape', 'Carré numéroté. Elle est active ou inactive ; active, elle porte un jeton ●.'],
  ['Étape initiale', 'Carré double : l’étape active à la mise en route.'],
  ['Action', 'Rectangle relié à l’étape : ce qui est commandé tant que l’étape est active.'],
  ['Transition', 'Petit trait horizontal entre deux étapes : le passage de l’une à l’autre.'],
  ['Réceptivité', 'Condition écrite à côté de la transition : capteur, bouton, fin de temporisation.'],
];

export function GrafcetIntro() {
  const [etape, setEtape] = React.useState(0);
  const [pos, setPos] = React.useState(0); // 0 = barrière basse, 100 = haute
  const [t, setT] = React.useState(0);
  const [msg, setMsg] = React.useState('Le jeton ● est dans l’étape 0 : c’est l’étape active. Essaie d’abord « Capteur haut » : rien ne se passe. Pourquoi ?');

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setT(v => v + 1);
      setPos(p => (etape === 1 ? Math.min(100, p + 5) : etape === 3 ? Math.max(0, p - 5) : p));
    }, 150);
    return () => window.clearInterval(id);
  }, [etape]);
  React.useEffect(() => {
    if (etape === 2 && t >= 30) {
      setEtape(3); setT(0);
      setMsg('5 s écoulées : la réceptivité devient vraie, l’étape 3 s’active et la barrière redescend. Clique « Capteur bas » quand elle est en bas.');
    }
  }, [etape, t]);

  const agir = (k: 't' | 'h' | 'b') => {
    if (k === 't') {
      if (etape === 0) { setEtape(1); setT(0); setMsg('Étape 0 active ET ticket présent : la transition est franchie. L’étape 1 devient active, l’action LEVER démarre.'); }
      else setMsg('Le ticket ne sert à rien maintenant : l’étape 0 n’est pas active. Une réceptivité n’est lue que sous une étape active.');
    }
    if (k === 'h') {
      if (etape === 1 && pos >= 100) { setEtape(2); setT(0); setMsg('Barrière haute : on passe à l’étape 2. Elle n’a pas d’action, elle attend 5 s : c’est une temporisation.'); }
      else if (etape === 1) setMsg('Patience : la barrière n’est pas encore en haut, le capteur h n’est pas encore actionné.');
      else setMsg('Rien ne se passe : l’étape au-dessus de « h » (l’étape 1) n’est pas active. C’est la règle 1.');
    }
    if (k === 'b') {
      if (etape === 3 && pos <= 0) { setEtape(0); setMsg('Barrière basse : retour à l’étape initiale. Le cycle est bouclé, comme le sera celui du portail.'); }
      else setMsg('La transition « b » est sous l’étape 3 : tant que l’étape 3 n’est pas active, elle ne peut pas être franchie.');
    }
  };

  const step = (n: number, y: number, act?: string) => (
    <g key={n}>
      <rect x={40} y={y} width={40} height={34} fill={etape === n ? '#E8F6EE' : '#fff'} stroke={INK} strokeWidth={n === 0 ? 3 : 1.5} />
      {n === 0 && <rect x={44} y={y + 4} width={32} height={26} fill="none" stroke={INK} />}
      <text x={60} y={y + 22} textAnchor="middle" fontWeight={700}>{n}</text>
      {etape === n && <circle cx={72} cy={y + 8} r={5} fill="#1E9E5A" />}
      {act && (
        <>
          <line x1={80} y1={y + 17} x2={100} y2={y + 17} stroke={INK} />
          <rect x={100} y={y + 4} width={110} height={26} fill={etape === n ? '#FFF3DB' : '#fff'} stroke={INK} />
          <text x={155} y={y + 21} textAnchor="middle" fontSize={12} fontWeight={700}>{act}</text>
        </>
      )}
    </g>
  );
  const tr = (y: number, txt: string) => (
    <g key={txt}>
      <line x1={48} y1={y} x2={72} y2={y} stroke={INK} strokeWidth={3} />
      <text x={82} y={y + 4} fontSize={12} fontFamily="ui-monospace,monospace">{txt}</text>
    </g>
  );

  return (
    <section data-grafcet-intro className="flex flex-col gap-2.5">
      <h3 className="font-title text-[19px] font-semibold uppercase tracking-wide">5 · Découvrir le Grafcet</h3>
      <p className="m-0 text-[12.5px] text-muted">
        Premier contact : le Grafcet décrit, étape par étape, ce que fait un automatisme et ce qui le fait avancer.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {NOTIONS.map(([t0, d]) => (
          <div key={t0} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-[12.5px]">
            <b className="block text-[13px]">{t0}</b>{d}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--line)] p-2.5 text-[12.5px]">
        <b>Les deux règles</b>
        <ol className="m-0 mt-1 pl-5">
          <li>Une transition est <b>franchie</b> quand l’étape juste au-dessus est <b>active</b> ET que sa réceptivité est <b>vraie</b>.</li>
          <li>Au franchissement, l’étape suivante devient active et l’étape précédente se désactive.</li>
        </ol>
        <b className="mt-2 block">Deux points de vue</b>
        Fonctionnel (DTR 8) : « portail fermé », « ouvrir le portail ». Partie commande (programme) :
        <span className="font-mono-num"> %I0.3</span>, <span className="font-mono-num">%Q0.0</span>, <span className="font-mono-num">%TM1.Q</span>.
      </div>
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5">
        <b className="text-[13px]">À toi : fais fonctionner la barrière de parking</b>
        <svg viewBox="0 0 420 320" className="mt-1 block h-auto w-full max-w-[460px]" data-barriere>
          <line x1={60} y1={10} x2={60} y2={296} stroke={INK} />
          <path d="M60 296 H20 V10 H60" fill="none" stroke={INK} />
          {step(0, 16)}{tr(66, 't (ticket)')}{step(1, 80, 'LEVER')}{tr(130, 'h (barrière haute)')}
          {step(2, 144)}{tr(194, '5 s écoulées')}{step(3, 208, 'BAISSER')}{tr(258, 'b (barrière basse)')}
          <text x={100} y={166} fontSize={10} fill="#5D6878">attente 5 s</text>
          <rect x={300} y={170} width={20} height={120} fill="#8C96A3" />
          <g transform={`rotate(${-pos * 0.85} 310 180)`}>
            <rect x={310} y={174} width={100} height={12} fill="#fff" stroke="#D6453D" strokeWidth={2} />
            {[0, 1, 2, 3].map(i => <rect key={i} x={322 + i * 22} y={174} width={10} height={12} fill="#D6453D" />)}
          </g>
        </svg>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" data-bar="t" onClick={() => agir('t')} className="min-h-touch rounded-lg bg-[#1B222C] px-3 text-[12.5px] font-semibold text-white">Insérer un ticket (t)</button>
          <button type="button" data-bar="h" onClick={() => agir('h')} className="min-h-touch rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold">Capteur haut (h)</button>
          <button type="button" data-bar="b" onClick={() => agir('b')} className="min-h-touch rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold">Capteur bas (b)</button>
        </div>
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-[#1B222C] p-2.5 text-[12.5px] text-[#E9EEF5]">
          <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent font-bold text-[#141A21]">P</span>
          <span data-bar-msg>{msg}</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Grafcet du portail */

/** Position de chaque case dans le dessin (x, y, largeur). */
const CASES: Record<string, [number, number, number]> = {
  t01: [100, 58, 260], a1: [126, 88, 92], t12: [100, 136, 150], a2: [126, 166, 92],
  t23: [100, 214, 120], t34: [100, 292, 240], t40: [72, 380, 110], t45: [312, 380, 190],
};

export function GrafcetPortail({ cases, st, onAnswer, verrou }: {
  cases: PrepQuestion[];
  st: AttemptState;
  onAnswer: (id: string, i: number) => void;
  verrou: boolean;
}) {
  const [cur, setCur] = React.useState<string | null>(null);
  const q = cases.find(c => c.id === cur) ?? null;
  const nOk = cases.filter(c => st.prep?.[c.id] === c.answer).length;

  const step = (n: number, x: number, y: number, acts: (string | null)[]) => (
    <g key={`s${n}`}>
      <rect x={x} y={y} width={36} height={30} fill="#fff" stroke={INK} strokeWidth={n === 0 ? 3 : 1.5} />
      {n === 0 && <rect x={x + 4} y={y + 4} width={28} height={22} fill="none" stroke={INK} />}
      <text x={x + 18} y={y + 20} textAnchor="middle" fontWeight={700}>{n}</text>
      {acts.map((a, i) => (
        <g key={i}>
          <line x1={x + 36} y1={y + 15} x2={x + 86 + i * 100} y2={y + 15} stroke={INK} />
          <rect x={x + 86 + i * 100} y={y + 2} width={92} height={26} fill="#fff" stroke={INK} />
          {a && <text x={x + 132 + i * 100} y={y + 19} textAnchor="middle" fontSize={11} fontFamily="ui-monospace,monospace">{a}</text>}
        </g>
      ))}
    </g>
  );
  const bar = (x: number, y: number) => <line key={`b${x}-${y}`} x1={x - 10} y1={y} x2={x + 10} y2={y} stroke={INK} strokeWidth={2.5} />;

  return (
    <section data-grafcet className="flex flex-col gap-2.5">
      <h3 className="font-title text-[19px] font-semibold uppercase tracking-wide">6 · Compléter le Grafcet du portail</h3>
      <p className="m-0 text-[12.5px] text-muted">
        Point de vue partie commande, à partir du Grafcet fonctionnel (DTR 8). Clique une case orange, puis choisis
        l’étiquette. Temporisations : %TM1 = 3 s (étape 1), %TM3 = 20 s (étape 3), %TM5 = 3 s (étape 5).
      </p>
      {verrou ? (
        <div className="rounded-xl border border-crit bg-crit/10 p-2.5 text-[12.5px]">
          🔒 Réponds d’abord aux questions de découverte du Grafcet ci-dessus.
        </div>
      ) : (
        <>
          <svg viewBox="0 0 520 520" className="block h-auto w-full max-w-[560px]">
            <line x1={58} y1={10} x2={58} y2={356} stroke={INK} />
            {step(0, 40, 20, [])}{step(1, 40, 86, [])}{step(2, 40, 164, [null, '%Q0.2'])}{step(3, 40, 242, [])}{step(4, 40, 320, ['%Q0.1', '%Q0.2'])}
            <text x={132} y={262} fontSize={10} fill="#5D6878">(attente portail ouvert · %TM3)</text>
            {bar(58, 70)}{bar(58, 148)}{bar(58, 226)}{bar(58, 304)}
            <line x1={58} y1={356} x2={300} y2={356} stroke={INK} />
            <line x1={58} y1={356} x2={58} y2={420} stroke={INK} />{bar(58, 392)}
            <path d="M58 420 H20 V10 H58" fill="none" stroke={INK} />
            <text x={26} y={440} fontSize={10} fill="#5D6878">retour à l’étape 0</text>
            <line x1={300} y1={356} x2={300} y2={420} stroke={INK} />{bar(300, 392)}
            {step(5, 282, 420, ['%Q0.2'])}
            <line x1={300} y1={450} x2={300} y2={490} stroke={INK} />{bar(300, 470)}
            <text x={316} y={474} fontSize={11} fontFamily="ui-monospace,monospace">%TM5.Q</text>
            <path d="M300 490 H505 V156 H58" fill="none" stroke={INK} />
            <text x={400} y={506} fontSize={10} fill="#5D6878">remonte à l’étape 2</text>
            {cases.map(c => {
              const pos = CASES[c.id];
              if (!pos) return null;
              const [x, y, w] = pos;
              const rep = st.prep?.[c.id];
              const juste = rep === c.answer;
              const fill = rep == null ? '#FFF7E3' : juste ? '#E8F6EE' : '#FDE8E6';
              const stroke = rep == null ? '#E39A00' : juste ? '#1E9E5A' : '#D6453D';
              return (
                <g key={c.id} data-case={c.id} onClick={() => setCur(c.id)} style={{ cursor: 'pointer' }}>
                  <rect x={x} y={y} width={w} height={24} rx={4} fill={fill} stroke={stroke} strokeWidth={cur === c.id ? 3 : 1.5} strokeDasharray={rep == null ? '4 3' : undefined} />
                  <text x={x + w / 2} y={y + 16} textAnchor="middle" fontSize={10.5} fontFamily="ui-monospace,monospace">{rep == null ? '?' : c.options[rep]}</text>
                </g>
              );
            })}
          </svg>
          <div className="text-[12.5px]"><b>{nOk} / {cases.length}</b> cases justes{nOk === cases.length ? ' · programme prêt à être transféré dans le M221 ✓' : ''}</div>
          {q && (
            <div className="rounded-xl border border-accent bg-[var(--surface)] p-2.5" data-case-q={q.id}>
              <b className="text-[13px]">{q.invite}</b>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {shuffledOrder(q.id, q.options.length).map(i => (
                  <button
                    key={i} type="button" data-opt={i}
                    onClick={() => onAnswer(q.id, i)}
                    className={`min-h-touch rounded-[10px] border p-2 text-left font-mono-num text-[12px] ${st.prep?.[q.id] === i ? (i === q.answer ? 'border-good bg-good/10' : 'border-crit bg-crit/10') : 'border-[var(--line)]'}`}
                  >{q.options[i]}</button>
                ))}
              </div>
              {st.prep?.[q.id] != null && (
                <p className={`m-0 mt-1.5 text-[12px] ${st.prep[q.id] === q.answer ? 'text-good' : 'text-crit'}`}>{q.why}</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
