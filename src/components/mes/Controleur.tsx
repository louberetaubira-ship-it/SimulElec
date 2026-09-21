'use client';

/**
 * Contrôleur d'installation multifonction : commutateur rotatif (8 positions),
 * afficheur, bouton TEST et douilles N · PE · L.
 *
 * La position du commutateur est un état de l'appareil (store) ; la position
 * attendue n'est PAS affichée : l'élève l'a identifiée à l'étape « Contrôles ».
 */

import React from 'react';
import { fmt, MESURES, positionOf, POSITIONS, type Position } from '@/lib/mes/miseEnService';
import { useMesParcours } from '@/app/tp/[id]/mesStore';

/** Douilles utilisées selon la fonction. */
const JACKS: Record<Position, ('N' | 'PE' | 'L')[]> = {
  V: ['N', 'L'], RISO: ['PE', 'L'], RLO: ['PE', 'L'], ZI: ['N', 'PE', 'L'],
  DT: ['N', 'PE', 'L'], IDN: ['N', 'PE', 'L'], RE: ['N', 'PE', 'L'], ROT: ['N', 'PE', 'L'],
};

export default function Controleur() {
  const { s, pos, point, setPos, test } = useMesParcours();
  const e = MESURES[s.step];
  const p = positionOf(pos);
  const ptId = point[s.step] ?? e?.points[0]?.id;
  const pt = e?.points.find((x) => x.id === ptId);
  const lec = ptId ? s.mesures[s.step]?.lectures[ptId] : undefined;
  const affiche = lec && lec.pos === pos && !pt?.action;
  const jacks = e ? JACKS[pos] : [];

  return (
    <div data-controleur className="mes-ctrl">
      <div className="top">
        <span>CONTRÔLEUR D&apos;INSTALLATION</span>
        <div className="mes-jacks" aria-label="Douilles">
          {(['N', 'PE', 'L'] as const).map((j) => (
            <span key={j} className={jacks.includes(j) ? j.toLowerCase() : ''}>{j}</span>
          ))}
        </div>
      </div>
      <div className="mes-lcd" data-lcd>
        <div className="m"><span>{p.fonction}</span><span>U<sub>L</sub>=50 V</span></div>
        {affiche ? (
          <>
            <div className="v">{fmt(lec!.v)}<span className="u"> {pt?.unite}</span></div>
            <div className="s">{pt?.label}</div>
          </>
        ) : (
          <>
            <div className="v off">- - -</div>
            <div className="s">{e ? (pt?.action ? 'point sans contrôleur' : 'appuie sur TEST') : 'pas de mesure à cette étape'}</div>
          </>
        )}
      </div>
      <div className="mes-dialwrap">
        <div className="mes-dial" role="radiogroup" aria-label="Commutateur">
          <div className="kn"><i style={{ transform: `rotate(${p.angle}deg)` }} /></div>
          {POSITIONS.map((q) => {
            const a = ((q.angle - 90) * Math.PI) / 180;
            return (
              <button
                key={q.k}
                type="button"
                role="radio"
                aria-checked={pos === q.k}
                data-pos={q.k}
                className={pos === q.k ? 'sel' : ''}
                style={{ left: 75 + 62 * Math.cos(a), top: 75 + 62 * Math.sin(a) }}
                onClick={() => setPos(q.k)}
              >
                {q.symbole}
              </button>
            );
          })}
        </div>
        <div className="mes-testb">
          <button type="button" data-test onClick={test} disabled={!e || !!pt?.action}>TEST</button>
          <div className="hint">
            {e ? (
              <>Point : <b>{pt?.label ?? '—'}</b><br />Choisis la position, branche les cordons, puis TEST.</>
            ) : 'Étape sans mesure.'}
          </div>
        </div>
      </div>
    </div>
  );
}
