'use client';
/* eslint-disable @next/next/no-img-element -- corrigé du dossier servi tel quel depuis public/tp */

/**
 * Plaque à bornes du moteur à COMPLÉTER (sujet CGM 2023, B.2.8) : l'élève pose lui-même
 * les barrettes de couplage, puis valide. L'outil traduit les barrettes posées en l'une
 * des options de la question (`PrepQuestion.vue === 'plaque'`) — étoile, triangle,
 * incomplet, court-circuit — et la réponse se note comme n'importe quelle question QCM.
 *
 * Disposition normalisée : U1 V1 W1 en haut (arrivée L1 L2 L3), W2 U2 V2 en bas. Chaque
 * enroulement relie une borne du haut à la borne DÉCALÉE du bas (U1 → U2, V1 → V2,
 * W1 → W2) : c'est ce décalage qui permet le triangle avec trois barrettes verticales.
 */
import React from 'react';
import type { PrepQuestion } from '@/lib/types';

const X = [70, 150, 230];
const HAUT = ['U1', 'V1', 'W1'];
const BAS = ['W2', 'U2', 'V2'];
const YH = 70, YB = 160;
/** Les cinq emplacements de barrette d'une plaque à bornes. */
const EMPL: { id: string; a: string; b: string; x1: number; y1: number; x2: number; y2: number; sens: 'v' | 'h' }[] = [
  { id: 'U1-W2', a: 'U1', b: 'W2', x1: X[0], y1: YH, x2: X[0], y2: YB, sens: 'v' },
  { id: 'V1-U2', a: 'V1', b: 'U2', x1: X[1], y1: YH, x2: X[1], y2: YB, sens: 'v' },
  { id: 'W1-V2', a: 'W1', b: 'V2', x1: X[2], y1: YH, x2: X[2], y2: YB, sens: 'v' },
  { id: 'W2-U2', a: 'W2', b: 'U2', x1: X[0], y1: YB, x2: X[1], y2: YB, sens: 'h' },
  { id: 'U2-V2', a: 'U2', b: 'V2', x1: X[1], y1: YB, x2: X[2], y2: YB, sens: 'h' },
];

/** Option de la question correspondant aux barrettes posées (0 étoile, 1 triangle, 2 incomplet, 3 court-circuit). */
export function couplageDesBarrettesPosees(poses: string[]): number {
  const v = poses.filter(p => EMPL.find(e => e.id === p)?.sens === 'v').length;
  const h = poses.filter(p => EMPL.find(e => e.id === p)?.sens === 'h').length;
  if (v && h) return 3;
  if (h === 2) return 0;
  if (v === 3) return 1;
  return 2;
}

export default function PlaqueBornesOutil({ q, choix, onAnswer }: {
  q: PrepQuestion;
  /** Réponse déjà enregistrée (index d'option), s'il y en a une. */
  choix: number | undefined;
  onAnswer: (index: number) => void;
}) {
  const [poses, setPoses] = React.useState<string[]>([]);
  const juste = choix === q.answer;
  const bascule = (id: string) => setPoses(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  return (
    <div className="flex flex-col gap-2" data-plaque-outil>
      <svg viewBox="0 0 300 215" className="block h-auto w-full max-w-[380px] rounded-xl border border-[var(--line)] bg-white">
        <rect x={30} y={44} width={240} height={150} rx={18} fill="#F4F7FA" stroke="#3E5C7A" strokeWidth={2.5} />
        {/* arrivée du réseau et PE */}
        {['L1', 'L2', 'L3'].map((l, i) => (
          <g key={l}>
            <line x1={X[i]} y1={8} x2={X[i]} y2={YH - 9} stroke="#C62828" strokeWidth={3} />
            <text x={X[i] + 6} y={20} fontSize={11} fontWeight={700}>{l}</text>
          </g>
        ))}
        <line x1={44} y1={8} x2={44} y2={120} stroke="#C9B400" strokeWidth={3} />
        <text x={10} y={20} fontSize={11} fontWeight={700}>PE</text>
        <circle cx={44} cy={124} r={6} fill="#6FA0D0" stroke="#3E5C7A" />
        {/* enroulements : U1 → U2, V1 → V2, W1 → W2 */}
        {[['U1', 'U2'], ['V1', 'V2'], ['W1', 'W2']].map(([h, b]) => {
          const xh = X[HAUT.indexOf(h)], xb = X[BAS.indexOf(b)];
          return (
            <g key={h} stroke="#5D6878" fill="none" strokeWidth={1.3}>
              <path d={`M${xh} ${YH + 8} v10 q6 3 0 6 q-6 3 0 6 q6 3 0 6 q-6 3 0 6 v8 L${xb} ${YB - 16} V${YB - 8}`} />
            </g>
          );
        })}
        {/* emplacements de barrette */}
        {EMPL.map(e => {
          const on = poses.includes(e.id);
          return (
            <g key={e.id} data-barrette={e.id} onClick={() => bascule(e.id)} style={{ cursor: 'pointer' }}>
              {/* zone de clic : un rectangle autour de l'emplacement, plus facile à viser au doigt */}
              <rect
                x={Math.min(e.x1, e.x2) - 9} y={Math.min(e.y1, e.y2) - 9}
                width={Math.abs(e.x2 - e.x1) + 18} height={Math.abs(e.y2 - e.y1) + 18}
                fill="#000" fillOpacity={0}
              />
              <line
                x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke={on ? '#C9A34A' : '#B8C4D0'} strokeWidth={on ? 9 : 2}
                strokeDasharray={on ? undefined : '4 4'} strokeLinecap="round"
              />
            </g>
          );
        })}
        {/* bornes */}
        {HAUT.map((t, i) => (
          <g key={t}><circle cx={X[i]} cy={YH} r={8} fill="#6FA0D0" stroke="#3E5C7A" /><text x={X[i] - 26} y={YH + 4} fontSize={11} fontWeight={700}>{t}</text></g>
        ))}
        {BAS.map((t, i) => (
          <g key={t}><circle cx={X[i]} cy={YB} r={8} fill="#6FA0D0" stroke="#3E5C7A" /><text x={X[i] - 9} y={YB + 22} fontSize={11} fontWeight={700}>{t}</text></g>
        ))}
      </svg>
      <p className="m-0 text-[11.5px] text-muted">
        Clique un emplacement (pointillés) pour y poser ou retirer une barrette, puis valide. Trois emplacements
        verticaux, deux horizontaux : c&apos;est toute la plaque à bornes.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-plaque-valider
          onClick={() => onAnswer(couplageDesBarrettesPosees(poses))}
          className="min-h-touch rounded-lg bg-[#1B222C] px-3 text-[12.5px] font-semibold text-white"
        >
          Valider les barrettes
        </button>
        <span className="text-[12px] text-muted">{poses.length} barrette{poses.length > 1 ? 's' : ''} posée{poses.length > 1 ? 's' : ''}</span>
      </div>
      {choix != null && (
        <div className="flex flex-col gap-1.5" data-plaque-verdict={juste ? 'juste' : 'faux'}>
          <p className={`m-0 text-[12px] ${juste ? 'text-good' : 'text-crit'}`}>
            <b>{q.options[choix]}.</b> {q.why}
          </p>
          {juste && q.corrige && (
            <img src={q.corrige} alt="Plaque à bornes, corrigé B.2.8" className="block max-w-[360px] rounded-lg border border-[var(--line)] bg-white" />
          )}
        </div>
      )}
    </div>
  );
}
