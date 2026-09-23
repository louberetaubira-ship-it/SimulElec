'use client';
/**
 * Bilan d'une copie : note sur 20, points par partie, barres par compétence (échelle
 * « acquisition » du bilan de compétences), questions à valider par le professeur,
 * questions sans réponse, impression.
 */
import { COMPETENCES, NIVEAU_BILAN, NIVEAU_COLOR, NIVEAU_ON, niveauOf } from '@/lib/data/competences';
import type { BilanSujet, SujetAttemptState, SujetNumerique } from '@/lib/sujet/types';
import { repere } from '@/lib/sujet/format';
import { fmtNombre } from '@/lib/sujet/normalize';
import { fmtDuree } from '@/lib/sujet/store';

interface Props {
  sujet: SujetNumerique;
  bilan: BilanSujet;
  st: SujetAttemptState;
  /** Ouvrir une question (élève : revoir ; professeur : aller à la validation). */
  onQuestion?: (num: number) => void;
  eleve?: string | null;
}

const couleurNote = (n: number) => (n >= 14 ? '#1E9E63' : n >= 10 ? '#E39A00' : '#D93A3A');

function Jauge({ note }: { note: number }) {
  const size = 132; const stroke = 12;
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, note / 20));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7EAEF" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={couleurNote(note)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="absolute text-center">
        <div className="font-mono text-[30px] font-bold leading-none" style={{ color: couleurNote(note) }} data-note20>{fmtNombre(note, 2)}</div>
        <div className="text-[12px] font-semibold text-muted">/ 20</div>
      </div>
    </div>
  );
}

function Barre({ v, couleur }: { v: number; couleur: string }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-[#E7EAEF]">
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.round(v * 100))}%`, background: couleur }} />
    </div>
  );
}

export default function Bilan({ sujet, bilan, st, onQuestion, eleve }: Props) {
  const labels = new Map((COMPETENCES[sujet.diploma] ?? []).map(c => [c.code, c.label]));
  const provisoire = bilan.aValider.length > 0;
  return (
    <div className="space-y-4" data-bilan>
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-surface p-4">
        <Jauge note={bilan.note20} />
        <div className="min-w-[220px] flex-1">
          <div className="font-title text-[12px] font-semibold uppercase tracking-[.12em] text-accent">Bilan de la copie{eleve ? ` · ${eleve}` : ''}</div>
          <h2 className="font-title text-[26px] font-bold leading-tight">{sujet.titre}</h2>
          <p className="text-[13px] text-muted">
            {fmtNombre(bilan.points, 2)} / {fmtNombre(bilan.total)} points · mode {st.mode === 'examen' ? 'examen' : 'entraînement'} · temps passé {fmtDuree(st.secondesEcoulees)}
            {st.remiseAt ? ` · remise le ${new Date(st.remiseAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
          {provisoire && (
            <p className="mt-2 rounded-lg bg-accent/15 px-2.5 py-1.5 text-[12.5px] text-accent-ink">
              Note provisoire : {bilan.aValider.length} réponse{bilan.aValider.length > 1 ? 's' : ''} rédigée{bilan.aValider.length > 1 ? 's' : ''} attend{bilan.aValider.length > 1 ? 'ent' : ''} la validation du professeur (pré-note par mots-clés).
            </p>
          )}
        </div>
        <button type="button" onClick={() => window.print()} className="min-h-[40px] rounded-lg border border-line bg-surface px-4 text-[13px] font-semibold hover:border-accent print:hidden" data-imprimer>
          🖨 Imprimer la copie
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Points par partie</h3>
          <div className="space-y-3">
            {bilan.parties.map(p => {
              const v = p.total ? p.points / p.total : 0;
              return (
                <div key={p.num}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                    <span><b>Partie {p.num}</b> · {p.titre}</span>
                    <span className="font-mono font-semibold">{fmtNombre(p.points, 2)} / {fmtNombre(p.total)}</span>
                  </div>
                  <Barre v={v} couleur={couleurNote(v * 20)} />
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Par compétence</h3>
          <div className="space-y-3">
            {bilan.competences.map(c => {
              const v = c.total ? c.points / c.total : 0;
              const n = niveauOf(v, c.total > 0);
              return (
                <div key={c.code} data-competence={c.code}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                    <span><b>{c.code}</b> · {labels.get(c.code) ?? ''}</span>
                    <span className="flex-none rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: NIVEAU_COLOR[n], color: NIVEAU_ON[n] }}>
                      {NIVEAU_BILAN[n]} · {Math.round(v * 100)} %
                    </span>
                  </div>
                  <Barre v={v} couleur={NIVEAU_COLOR[n]} />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {(bilan.aValider.length > 0 || bilan.sansReponse.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {bilan.aValider.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted">À valider par le professeur</h3>
              <Pastilles sujet={sujet} nums={bilan.aValider} onQuestion={onQuestion} cls="border-accent bg-accent/15" />
            </section>
          )}
          {bilan.sansReponse.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Sans réponse ({bilan.sansReponse.length})</h3>
              <Pastilles sujet={sujet} nums={bilan.sansReponse} onQuestion={onQuestion} cls="border-crit/50 bg-[#FDE8E6]" />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Pastilles({ sujet, nums, onQuestion, cls }: { sujet: SujetNumerique; nums: number[]; onQuestion?: (n: number) => void; cls: string }) {
  const lab = new Map(sujet.questions.map(q => [q.num, repere(q)]));
  return (
    <div className="flex flex-wrap gap-1">
      {nums.map(n => (
        <button key={n} type="button" disabled={!onQuestion} onClick={() => onQuestion?.(n)}
          className={`grid h-7 min-w-[36px] place-items-center whitespace-nowrap rounded-md border px-1.5 font-mono text-[11.5px] font-semibold disabled:cursor-default ${cls}`}>
          {lab.get(n) ?? `Q${n}`}
        </button>
      ))}
    </div>
  );
}
