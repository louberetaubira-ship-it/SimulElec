'use client';

/**
 * Contrôleur d'installation multifonction : commutateur rotatif (8 positions),
 * afficheur, cordons à poser sur le banc, ZÉRO (continuité), multiple de IΔn
 * (ΔT) et bouton TEST. La position attendue n'est PAS affichée : l'élève l'a
 * identifiée à l'étape « Contrôles » (guide du contrôleur).
 */

import React from 'react';
import { positionOf, POSITIONS, MES } from '@/lib/mes/miseEnService';
import { BANCS, CORDONS } from '@/lib/mes/banc';
import { useMesParcours } from '@/app/tp/[id]/mesStore';

export default function Controleur() {
  const { s, pos, setPos, test, setGuideOpen, cord, selectCord, conn, lcd, zero, mult, setMult } = useMesParcours();
  const b = BANCS[s.step];
  const p = positionOf(pos);
  const c = conn[s.step] ?? {};
  const zeroFait = !!s.mesures[s.step]?.prep.includes('zero');

  return (
    <div data-controleur className="mes-ctrl">
      <div className="top">
        <span className="flex items-center gap-1.5">
          CONTRÔLEUR D&apos;INSTALLATION
          <button type="button" data-ctrl-guide onClick={() => setGuideOpen(true)} title="Guide du contrôleur"
            className="grid h-6 w-6 place-items-center rounded-full bg-[#1b1b1b] text-[12px] font-extrabold text-[#f2b705]">?</button>
        </span>
      </div>
      <div className="mes-lcd" data-lcd>
        <div className="m"><span>{p.fonction}</span><span>{s.step === MES.CONT ? (zeroFait ? 'ZÉRO ✓' : 'zéro à faire') : <>U<sub>L</sub>=50 V</>}</span></div>
        {lcd ? (
          <>
            <div className="v">{lcd.v}<span className="u"> {lcd.unite}</span></div>
            <div className="s">{lcd.sub}</div>
          </>
        ) : (
          <>
            <div className="v off">- - -</div>
            <div className="s">{b ? 'branche les cordons, puis TEST' : 'pas de mesure à cette étape'}</div>
          </>
        )}
      </div>
      <div className="mes-dialwrap">
        <div className="mes-dial" role="radiogroup" aria-label="Commutateur">
          <div className="kn"><i style={{ transform: `rotate(${p.angle}deg)` }} /></div>
          {POSITIONS.map((q) => {
            const a = ((q.angle - 90) * Math.PI) / 180;
            return (
              <button key={q.k} type="button" role="radio" aria-checked={pos === q.k} data-pos={q.k}
                className={pos === q.k ? 'sel' : ''} style={{ left: 75 + 62 * Math.cos(a), top: 75 + 62 * Math.sin(a) }}
                onClick={() => setPos(q.k)}>
                {q.symbole}
              </button>
            );
          })}
        </div>
        <div className="mes-testb">
          {b && (
            <div className="flex flex-wrap gap-1" aria-label="Cordons">
              {b.cordons.map((k) => (
                <button key={k} type="button" data-cord={k} onClick={() => selectCord(k)}
                  style={{ background: CORDONS[k].couleur, padding: '6px 4px', fontSize: 11, color: '#fff', flex: 1, borderRadius: 10, outline: cord === k ? '3px solid #1b1b1b' : 'none', outlineOffset: 1 }}>
                  {CORDONS[k].label}{c[k] ? ' ✓' : ''}
                </button>
              ))}
            </div>
          )}
          {s.step === MES.CONT && (
            <button type="button" data-zero onClick={zero} style={{ background: '#5d4a00', color: '#fff', padding: 8 }}>ZÉRO</button>
          )}
          {s.step === MES.DDR && pos === 'DT' && (
            <div className="flex gap-1">
              {([1, 5] as const).map((k) => (
                <button key={k} type="button" data-mult={k} onClick={() => setMult(k)}
                  style={{ flex: 1, padding: 6, fontSize: 11, background: mult === k ? '#1b1b1b' : 'rgba(0,0,0,.15)', color: mult === k ? '#f2b705' : '#1b1b1b' }}>
                  ×{k} · {k === 1 ? '30' : '150'} mA
                </button>
              ))}
            </div>
          )}
          <button type="button" data-test onClick={test} disabled={!b}>TEST</button>
        </div>
      </div>
    </div>
  );
}
