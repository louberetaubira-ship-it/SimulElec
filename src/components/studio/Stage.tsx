'use client';

/**
 * Colonne centrale du studio : la platine du moteur (mêmes rails, même géométrie, mêmes
 * composants de rendu que le parcours élève), avec les zones de pose (3 rails DIN,
 * colonne d'annexe, bloc récepteurs) et le câblage borne à borne des liaisons attendues.
 */
import React from 'react';
import { ANNEX_X, ANNEX_Y, NET_COLOR, PANEL_W, RAILS, RAIL_H, RAIL_X, RECV_Y } from '@/lib/scene/geometry';
import Panel from '@/components/panel/Panel';
import Workspace from '@/components/panel/Workspace';
import { NET_LIST, ZONES } from './model';
import { useStudio } from './store';

export default function Stage() {
  const def = useStudio((s) => s.def);
  const items = useStudio((s) => s.items);
  const zone = useStudio((s) => s.zone);
  const net = useStudio((s) => s.net);
  const sel = useStudio((s) => s.sel);
  const hint = useStudio((s) => s.hint);
  const selTerminal = useStudio((s) => s.selTerminal);
  const setZone = useStudio((s) => s.setZone);
  const setNet = useStudio((s) => s.setNet);
  const select = useStudio((s) => s.select);
  const clickTerminal = useStudio((s) => s.clickTerminal);
  const removeLiaison = useStudio((s) => s.removeLiaison);

  const host = React.useRef<HTMLDivElement>(null);

  const wires = React.useMemo(
    () => def.liaisons.map((l) => ({ a: l.a, b: l.b, net: l.net, prewired: l.prewired, door: l.door })),
    [def.liaisons],
  );

  /** Clic sur le décor : choisit la zone de pose active. */
  const onStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest('.se-dev, .se-hit, .se-term, .se-wires, button')) return;
    const p = host.current?.querySelector<HTMLElement>('.se-panel');
    if (!p) return;
    const r = p.getBoundingClientRect();
    const sc = r.width / PANEL_W;
    const x = (e.clientX - r.left) / sc;
    const y = (e.clientY - r.top) / sc;
    if (y >= RECV_Y - 10) { setZone('recepteurs'); return; }
    if (x >= ANNEX_X) { setZone('annexe'); return; }
    const i = RAILS.findIndex((ry) => y >= ry - 20 && y <= ry + RAIL_H + 20);
    if (i >= 0) setZone(i as 0 | 1 | 2);
  };

  const zoneLabel = ZONES.find((z) => z.id === zone)?.label ?? '';

  return (
    <section className="st-card" aria-label="Platine">
      <h2 className="st-h">Platine · {zoneLabel}</h2>

      <div className="st-row" style={{ marginBottom: 8 }}>
        {ZONES.map((z) => (
          <button
            key={String(z.id)}
            type="button"
            className={`st-mini${zone === z.id ? ' sel' : ''}`}
            style={zone === z.id ? { background: '#141A21', color: '#fff', borderColor: '#141A21' } : undefined}
            onClick={() => setZone(z.id)}
            data-zone={String(z.id)}
          >
            {z.label}
          </button>
        ))}
      </div>

      <div className="st-row" style={{ marginBottom: 8 }} aria-label="Conducteur des liaisons">
        {NET_LIST.map((n) => (
          <button
            key={n}
            type="button"
            className="st-mini"
            data-net={n}
            aria-pressed={net === n}
            onClick={() => setNet(n)}
            style={{
              background: NET_COLOR[n],
              color: '#fff',
              fontWeight: 700,
              textShadow: '0 1px 2px rgba(0,0,0,.55)',
              borderColor: net === n ? '#141A21' : '#D3D9E1',
              boxShadow: net === n ? '0 0 0 2px rgba(20,26,33,.18)' : undefined,
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="st-stage" ref={host} onClick={onStageClick}>
        <Workspace
          storageKey="studio"
          title="Studio de TP"
          subtitle={def.title || 'Nouveau TP'}
          indicator={`${def.slots.length} appareil${def.slots.length > 1 ? 's' : ''} · ${def.liaisons.length} liaison${def.liaisons.length > 1 ? 's' : ''}`}
        >
          <Panel
            tp={def}
            items={items}
            wires={wires}
            cover={false}
            marks
            pickTerminals
            pickWires
            onTerminal={clickTerminal}
            onWire={(i) => removeLiaison(i)}
            onDevice={(id) => select({ kind: 'slot', id })}
            fixedScale
          />
          <div className="st-zones" aria-hidden="true">
            {RAILS.map((ry, i) => (
              <div
                key={ry}
                className={`st-zone${zone === i ? ' sel' : ''}`}
                style={{ left: RAIL_X[0] - 4, top: ry - 8, width: RAIL_X[1] - RAIL_X[0] + 8, height: RAIL_H + 16 }}
              >
                <span className="tag">rail {i + 1}</span>
              </div>
            ))}
            <div
              className={`st-zone${zone === 'annexe' ? ' sel' : ''}`}
              style={{ left: ANNEX_X, top: ANNEX_Y, width: 118, height: 680 }}
            >
              <span className="tag">annexe</span>
            </div>
            <div
              className={`st-zone${zone === 'recepteurs' ? ' sel' : ''}`}
              style={{ left: 8, top: RECV_Y - 6, width: 544, height: 180 }}
            >
              <span className="tag">récepteurs</span>
            </div>
          </div>
        </Workspace>
      </div>

      <p className="st-hint" data-testid="st-hint">
        {hint ?? (selTerminal
          ? `Borne ${selTerminal} sélectionnée : clique la seconde borne pour créer la liaison ${net}.`
          : sel
            ? `${sel.id} sélectionné : règle son repère et sa position dans l’onglet « Matériel ».`
            : `Zone « ${zoneLabel} » : clique un appareil de la bibliothèque pour le poser, puis relie les bornes deux à deux.`)}
      </p>
    </section>
  );
}
