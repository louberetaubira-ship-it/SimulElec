'use client';

/**
 * Banc de mesure de la mise en service : le VRAI coffret de la station SR1,
 * dessiné par le moteur de scène des TP de platine (zoom, déplacement, mode
 * atelier plein écran), entièrement précâblé.
 *
 * L'élève choisit un cordon sur le contrôleur puis clique une borne du coffret :
 * le cordon s'y pose (reclic avec le même cordon : il est retiré). Les masses
 * sans borne dessinée (porte, plaque de fond, canalisation, garde-corps) et les
 * piquets auxiliaires S et H sont ajoutés par-dessus la scène. Les préparations
 * se font sur le matériel : barrettes de la plaque à bornes, barrette BC1,
 * primaire de T1, bouton TEST de Q2.
 */

import React from 'react';
import Panel from '@/components/panel/Panel';
import Workspace from '@/components/panel/Workspace';
import { useTpItems } from '@/components/panel/useTpItems';
import type { DeviceState } from '@/components/panel/Device';
import { PANEL_W, sceneOf, type Point } from '@/lib/scene/geometry';
import { BANCS, CORDONS, libelle, logique, type Borne, type CordId } from '@/lib/mes/banc';
import { MES_STEPS } from '@/lib/mes/miseEnService';
import { useMesParcours } from '@/app/tp/[id]/mesStore';
import ProfBotMes from './ProfBotMes';
import Controleur from './Controleur';
import { TP_STATION_RELEVAGE } from '@/lib/data/tps/station-relevage';

/** Petit dessin d'un point ajouté (masse sans borne, piquet auxiliaire). */
function Dessin({ b, x, y }: { b: Borne; x: number; y: number }) {
  switch (b.dessin) {
    case 'porte':
      return <path d={`M${x - 14} ${y}c6 -6 10 6 16 0c4 -4 8 4 12 0`} stroke="#1e9e5a" strokeWidth="3" fill="none" strokeDasharray="4 3" />;
    case 'plaque':
      return <rect x={x - 12} y={y - 8} width="24" height="16" rx="2" fill="#cfd6df" stroke="#6b7684" />;
    case 'tuyau':
      return <path d={`M${x - 16} ${y + 14}H${x + 16}M${x} ${y + 14}V${y + 30}`} stroke="#4b5563" strokeWidth="6" fill="none" />;
    case 'garde':
      return <path d={`M${x - 16} ${y + 10}H${x + 16}M${x - 12} ${y + 10}V${y + 34}M${x + 12} ${y + 10}V${y + 34}`} stroke="#6b7684" strokeWidth="3" fill="none" />;
    case 'piquet':
      return <path d={`M${x} ${y + 8}V${y + 52}`} stroke="#4b5563" strokeWidth="5" />;
    default:
      return null;
  }
}

export default function Banc() {
  const { s, tp, cord, conn, placeCord, prepBanc } = useMesParcours();
  const b = BANCS[s.step];
  const items = useTpItems(tp ?? TP_STATION_RELEVAGE);
  if (!b || !tp) return null;
  const step = s.step;
  const m = s.mesures[step];
  const c = conn[step] ?? {};
  const geo = sceneOf(tp);

  const on = (st: DeviceState): Record<string, DeviceState> =>
    ({ q0: st, q1: st, q2: st, f2: st, f3: st, km1: 'off' });
  const deviceState = on(b.sousTension ? 'on' : 'off');

  const wires = tp.liaisons.map((l) => ({ a: l.a, b: l.b, net: l.net, prewired: true, door: l.door }));

  const overlay = (at: (id: string) => Point | null) => {
    /** Position d'une borne logique (borne réelle ou point ajouté). */
    const posOf = (id: string): Point | null => {
      if (id.startsWith('T:')) return at(id.slice(2));
      const bo = b.bornes.find((x) => x.id === id);
      if (!bo) return null;
      if (bo.t) return at(bo.t);
      const r = bo.rel ? at(bo.rel) : null;
      return r ? { x: r.x + (bo.dx ?? 0), y: r.y + (bo.dy ?? 0) } : null;
    };
    const ajoutes = b.bornes.filter((x) => !x.t);
    const cords = Object.keys(c) as CordId[];
    return (
      <svg className="mes-overlay" style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none', zIndex: 30 }}>
        {b.actions.map((a) => {
          const pts = (a.autour ?? []).map(at).filter((p): p is Point => !!p);
          if (!pts.length && !a.box) return null;
          const box = a.box ?? {
            x: Math.min(...pts.map((p) => p.x)) - 12, y: Math.min(...pts.map((p) => p.y)) - 12,
            w: Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)) + 24,
            h: Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)) + 24,
          };
          const fait = m.prep.includes(a.id) || (a.id === 'testq2' && !!m.lectures.test);
          const w = (fait ? a.fait.length + 2 : a.label.length) * 5.6 + 16;
          return (
            <g key={a.id}>
              {/* la zone montre l'appareil ; elle laisse passer les clics vers ses bornes */}
              <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="6" pointerEvents="none"
                fill={fait ? 'rgba(30,158,90,.10)' : 'rgba(227,154,0,.14)'} stroke={fait ? '#1e9e5a' : '#e39a00'} strokeWidth="2" strokeDasharray={fait ? undefined : '5 3'} />
              <g data-action={a.id} onClick={() => prepBanc(a.id)} style={{ cursor: fait ? 'default' : 'pointer', pointerEvents: 'auto' }}>
                <rect x={box.x + box.w / 2 - w / 2} y={box.y - 22} width={w} height="17" rx="8.5"
                  fill={fait ? '#e8f6ee' : '#e39a00'} stroke={fait ? '#1e9e5a' : '#b37800'} />
                <text x={box.x + box.w / 2} y={box.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill={fait ? '#1e9e5a' : '#1b1b1b'}>
                  {fait ? `✓ ${a.fait}` : a.label}
                </text>
              </g>
            </g>
          );
        })}
        {ajoutes.map((bo) => {
          const p = posOf(bo.id);
          if (!p) return null;
          return (
            <g key={bo.id} data-borne={bo.id} onClick={() => placeCord(bo.id)} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
              <Dessin b={bo} x={p.x} y={p.y} />
              <circle cx={p.x} cy={p.y} r="6" fill="#f2c94c" stroke="#7a5600" strokeWidth="1.5" />
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
              <text x={p.x + 10} y={p.y - 8} fontSize="9" fontWeight="700" fill="#1b222c" style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}>{bo.label}</text>
            </g>
          );
        })}
        {cords.map((k, i) => {
          const p = posOf(c[k]!);
          if (!p) return null;
          const same = cords.filter((j) => c[j] === c[k]);
          const dx = (same.indexOf(k) - (same.length - 1) / 2) * 9;
          return (
            <g key={k} data-cordon={k}>
              <path d={`M${p.x + dx} ${p.y} q 30 ${40 + i * 12} 70 ${50 + i * 12}`} stroke={CORDONS[k].couleur} strokeWidth="3" fill="none" opacity=".8" />
              <circle cx={p.x + dx} cy={p.y} r="6" fill={CORDONS[k].couleur} stroke="#fff" strokeWidth="1.5" />
              <text x={p.x + dx} y={p.y + 3} textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff">{CORDONS[k].label.slice(0, 1)}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const placees = (Object.keys(c) as CordId[]).map((k) => `${CORDONS[k].label} → ${libelle(step, c[k]!)}`).join(' · ');

  return (
    <div data-banc className="flex min-w-0 flex-col gap-1">
      <div className="text-[11.5px] text-muted">
        Cordon en main : <b className="text-ink">{CORDONS[cord]?.label}</b>{placees && <> · {placees}</>}
      </div>
      <Workspace
        contentHeight={geo.panelH}
        contentWidth={PANEL_W + geo.alimW + geo.porteW}
        storageKey="mes"
        title={tp.title}
        subtitle={MES_STEPS[step].title}
        drawer={<ProfBotMes tp={tp} />}
        drawerTitle="Professeur virtuel"
        dock={<Controleur />}
        dockTitle="Contrôleur"
      >
        <Panel
          tp={tp}
          items={items}
          wires={wires}
          // goulottes sans couvercle : tout le tracé des conducteurs reste visible
          cover={false}
          marks
          deviceState={deviceState}
          pickTerminals
          onTerminal={(tid) => placeCord(logique(step, tid))}
          overlay={overlay}
          fixedScale
        />
      </Workspace>
    </div>
  );
}
