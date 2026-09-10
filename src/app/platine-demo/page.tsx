'use client';

/**
 * Démonstration hors authentification de la platine v3.
 * `/platine-demo?tp=<id>` — les 13 TP de `src/lib/data/tps`, couvercles, repères, liaisons.
 */
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CatalogueItem } from '@/lib/types';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { loadLibraryItem } from '@/lib/data/library';
import { TPS, TP_BY_ID } from '@/lib/data/tps';
import { NET_COLOR } from '@/lib/scene/geometry';
import { planLanes, sceneContext, totalLength, wireLength } from '@/lib/scene/route';
import Panel, { type PanelWire } from '@/components/panel/Panel';
import type { DeviceState } from '@/components/panel/Device';

/* -------------------------------------------------------------- page */

export default function PlatineDemoPage() {
  return (
    <React.Suspense fallback={<main style={{ padding: 20 }}>Chargement de la platine…</main>}>
      <PlatineDemo />
    </React.Suspense>
  );
}

function PlatineDemo() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('tp') || 'demarrage-direct';
  const tp = TP_BY_ID[id] ?? TPS[0];

  const [cover, setCover] = React.useState(true);
  const [marks, setMarks] = React.useState(true);
  const [coupling, setCoupling] = React.useState<'Y' | 'D'>('Y');
  const [highlight, setHighlight] = React.useState<number | null>(null);
  const [state, setState] = React.useState<Record<string, DeviceState>>({ q1: 'off', f2: 'off', f3: 'off', km1: 'off', f1: 'on' });
  const [lib, setLib] = React.useState<Record<string, CatalogueItem>>({});

  // catalogue résolu : pack + compléments + éléments de bibliothèque (clés « l_… »)
  const items = React.useMemo(() => {
    const out: Record<string, CatalogueItem> = { ...lib };
    const keys = Array.from(new Set<string>([...tp.slots.map((s) => s.key), ...tp.annexItems.map((a) => a.key)]));
    for (const k of keys) {
      const it = CATALOGUE_BY_KEY[k];
      if (it) out[k] = it;
    }
    return out;
  }, [tp, lib]);

  React.useEffect(() => {
    const missing = [...tp.slots.map((s) => s.key), ...tp.annexItems.map((a) => a.key)]
      .filter((k) => k.startsWith('l_'));
    if (!missing.length) return;
    let alive = true;
    Promise.all(missing.map((k) => loadLibraryItem(k))).then((list) => {
      if (!alive) return;
      const out: Record<string, CatalogueItem> = {};
      list.forEach((it) => { if (it) out[it.key] = it; });
      if (Object.keys(out).length) setLib((p) => ({ ...p, ...out }));
    });
    return () => { alive = false; };
  }, [tp]);

  const wires: PanelWire[] = React.useMemo(
    () => tp.liaisons.map((l) => ({ a: l.a, b: l.b, net: l.net, prewired: l.prewired, door: l.door })),
    [tp],
  );

  const plan = React.useMemo(
    () => planLanes(sceneContext(tp, items), wires.map((w) => [w.a, w.b] as [string, string])),
    [tp, items, wires],
  );

  const running = state.q1 === 'on' && state.f2 === 'on' && state.f3 === 'on' && state.km1 === 'on';

  const toggle = (slotId: string) => {
    setState((p) => {
      const cur = p[slotId];
      if (cur !== 'on' && cur !== 'off') return p;
      return { ...p, [slotId]: cur === 'on' ? 'off' : 'on' };
    });
  };

  const onButton = (b: 's1' | 's2', down: boolean) => {
    if (!down) return;
    setState((p) => {
      if (b === 's1') return { ...p, km1: 'off' };
      const ok = p.q1 === 'on' && p.f2 === 'on' && p.f3 === 'on';
      return ok ? { ...p, km1: 'on' } : p;
    });
  };

  const btn = (on: boolean): React.CSSProperties => ({
    minHeight: 40, padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${on ? '#E39A00' : '#D3D9E1'}`,
    background: on ? '#E39A00' : '#FFFFFF', color: on ? '#1A1300' : '#141A21', fontWeight: 600,
  });

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 30, margin: 0 }}>
        Platine · {tp.title}
      </h1>
      <p style={{ color: '#66717F', fontSize: 14, margin: '6px 0 14px' }}>
        Démonstration du rendu v3 : goulottes, cheminement en peigne, borniers X1 / X2, commande 24 V,
        coffret de porte et moteur. Longueur totale de conducteur ≈{' '}
        <b>{totalLength(plan).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m</b>.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <label htmlFor="tp-select" style={{ fontSize: 13, color: '#66717F' }}>TP</label>
        <select
          id="tp-select"
          value={tp.id}
          onChange={(e) => router.replace(`/platine-demo?tp=${e.target.value}`)}
          style={{ minHeight: 40, padding: '8px 10px', borderRadius: 10, border: '1px solid #D3D9E1', background: '#fff', color: '#141A21', maxWidth: '100%' }}
        >
          {TPS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}{t.playable ? '' : ' · prévu'}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button type="button" style={btn(!cover)} onClick={() => setCover((c) => !c)}>
          {cover ? 'Ouvrir les couvercles' : 'Fermer les couvercles'}
        </button>
        <button type="button" style={btn(marks)} onClick={() => setMarks((m) => !m)}>
          Repères des bornes
        </button>
        <button type="button" style={btn(coupling === 'D')} onClick={() => setCoupling((c) => (c === 'Y' ? 'D' : 'Y'))}>
          Couplage {coupling === 'Y' ? 'étoile Y' : 'triangle Δ'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 16 }}>
        <Panel
          tp={tp}
          items={items}
          wires={wires}
          cover={cover}
          marks={marks}
          deviceState={state}
          lamps={{ h1: running, h2: state.f1 === 'trip' }}
          motorRpm={running ? 1450 : 0}
          coupling={coupling}
          highlight={highlight}
          onDevice={toggle}
          onButton={onButton}
          onCoupling={() => setCoupling((c) => (c === 'Y' ? 'D' : 'Y'))}
        />

        <section>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, margin: '0 0 8px' }}>
            Tableau de câblage · {tp.liaisons.filter((l) => !l.prewired).length} liaisons
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {tp.liaisons.map((l, i) => (l.prewired ? null : (
              <div
                key={`${l.a}-${l.b}-${i}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseLeave={() => setHighlight(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6,
                  background: '#fff', border: `1px solid ${highlight === i ? '#E39A00' : '#D3D9E1'}`,
                }}
              >
                <i style={{ width: 12, height: 4, borderRadius: 2, background: NET_COLOR[l.net], flex: 'none' }} />
                {l.a.replace('.', ' ')} → {l.b.replace('.', ' ')}
                {l.door ? <span style={{ color: '#66717F' }}>porte</span> : null}
                <span style={{ marginLeft: 'auto', color: '#66717F' }}>
                  {wireLength(plan, i).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m
                </span>
              </div>
            )))}
          </div>
        </section>
      </div>
    </main>
  );
}
