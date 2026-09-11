'use client';
/* eslint-disable @next/next/no-img-element -- vignettes servies depuis public/sprites et data URI de bibliothèque */

/**
 * Atelier libre : bibliothèque (41 familles) | platine | inspecteur.
 * Pose au clic (rail courant ou annexe), câblage borne à borne, enregistrement dans `projects`.
 */
import React from 'react';
import type { CatalogueItem, NetKind, SceneKind } from '@/lib/types';
import { ANNEX_X, NET_COLOR, PANEL_W, RAILS, RAIL_H, RAIL_X } from '@/lib/scene/geometry';
import { planLanes, sceneContext, totalLength } from '@/lib/scene/route';
import { CATALOGUE, spriteUrl } from '@/lib/data/catalogue';
import { libraryIndex, libraryItemSync, loadFamily, loadLibraryItem, searchLibrary } from '@/lib/data/library';
import { svgForKey } from '@/components/panel/svg';
import Panel from '@/components/panel/Panel';
import Workspace from '@/components/panel/Workspace';
import InstrumentTray from '@/components/mesures/InstrumentTray';
import {
  ConfirmDialog, UndoBar, WireContextMenu, WireToolbar, useWireShortcuts,
} from '@/components/panel/WireTools';
import { getMyProfile } from '@/lib/db/profiles';
import { listMyClasses } from '@/lib/db/classes';
import { ANNEX_RAIL, NETS, SCENES, freeTp, useAtelier, wireLabel } from './store';
import './atelier.css';

const FAMILIES = libraryIndex();
/** Chip « pack » : les appareils photo du simulateur (rail DIN, sprites locaux). */
const PACK = -1;

/* ------------------------------------------------------------ bibliothèque */

function Thumb({ item }: { item: CatalogueItem }) {
  const vector = svgForKey(item.key);
  if (vector) return <span className="thumb">{vector}</span>;
  return <span className="thumb"><img src={item.src ?? spriteUrl(item.key)} alt="" /></span>;
}

function Library() {
  const add = useAtelier((s) => s.add);
  const say = useAtelier((s) => s.say);
  const [fam, setFam] = React.useState<number>(PACK);
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState<CatalogueItem[]>(CATALOGUE);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const needle = q.trim();

    async function run() {
      setBusy(true);
      try {
        if (needle) {
          const hits = searchLibrary(needle, 80);
          const files = Array.from(new Set(hits.map((h) => h.file))).slice(0, 8);
          await Promise.all(files.map((f) => loadFamily(f).catch(() => ({}))));
          if (!alive) return;
          const packHits = CATALOGUE.filter((c) =>
            `${c.name} ${c.ref} ${c.family} ${c.key}`.toLowerCase().includes(needle.toLowerCase()));
          const libHits = hits
            .map((h) => libraryItemSync(h.key))
            .filter((x): x is CatalogueItem => x !== null);
          setItems([...packHits, ...libHits].slice(0, 120));
          return;
        }
        if (fam === PACK) { setItems(CATALOGUE); return; }
        const f = FAMILIES[fam];
        await loadFamily(f.file);
        if (!alive) return;
        setItems(f.keys.map((k) => libraryItemSync(k)).filter((x): x is CatalogueItem => x !== null));
      } catch {
        if (alive) { setItems([]); say('Bibliothèque indisponible : réessaie.'); }
      } finally {
        if (alive) setBusy(false);
      }
    }

    void run();
    return () => { alive = false; };
  }, [fam, q, say]);

  const pick = React.useCallback(async (item: CatalogueItem) => {
    if (item.src || !item.key.startsWith('l_')) { add(item); return; }
    const loaded = await loadLibraryItem(item.key);
    add(loaded ?? item);
  }, [add]);

  const total = FAMILIES.reduce((a, f) => a + f.count, 0);

  return (
    <section className="at-card" aria-label="Bibliothèque">
      <h2 className="at-h">Bibliothèque</h2>
      <input
        className="at-search"
        placeholder="Chercher un appareil…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Chercher dans la bibliothèque"
      />
      <div className="at-fams" role="tablist">
        <button
          type="button"
          className={fam === PACK && !q ? 'sel' : ''}
          onClick={() => { setQ(''); setFam(PACK); }}
        >
          Pack SimulElec <small>{CATALOGUE.length}</small>
        </button>
        {FAMILIES.map((f, i) => (
          <button
            key={f.file}
            type="button"
            className={fam === i && !q ? 'sel' : ''}
            onClick={() => { setQ(''); setFam(i); }}
          >
            {f.family} <small>{f.count}</small>
          </button>
        ))}
      </div>
      <p className="at-sub">
        {busy ? 'Chargement…' : `${items.length} élément${items.length > 1 ? 's' : ''} · ${total} en bibliothèque`}
      </p>
      <div className="at-grid" data-testid="lib-grid">
        {items.map((it) => (
          <button key={it.key} type="button" className="at-item" data-k={it.key} onClick={() => void pick(it)}>
            <Thumb item={it} />
            <b>{it.name}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- platine */

function Stage() {
  const { scene, slots, wires, items, rail, cover, marks, sel, hint } = useAtelier();
  const setRail = useAtelier((s) => s.setRail);
  const removeSlot = useAtelier((s) => s.removeSlot);
  const removeWire = useAtelier((s) => s.removeWire);
  const clickTerminal = useAtelier((s) => s.clickTerminal);
  const selWire = useAtelier((s) => s.selWire);
  const wireMenu = useAtelier((s) => s.wireMenu);
  const undoDepth = useAtelier((s) => s.undoStack.length);
  const redoDepth = useAtelier((s) => s.redoStack.length);
  const undoNotice = useAtelier((s) => s.undoNotice);
  const selectWire = useAtelier((s) => s.selectWire);
  const openWireMenu = useAtelier((s) => s.openWireMenu);
  const closeWireMenu = useAtelier((s) => s.closeWireMenu);
  const deleteSelectedWire = useAtelier((s) => s.deleteSelectedWire);
  const undo = useAtelier((s) => s.undo);
  const redo = useAtelier((s) => s.redo);
  const dismissUndoNotice = useAtelier((s) => s.dismissUndoNotice);

  useWireShortcuts({
    active: true,
    hasSelection: selWire != null,
    onDelete: deleteSelectedWire,
    onUndo: undo,
    onRedo: redo,
    onEscape: () => selectWire(null),
  });

  const toolbar = (compact?: boolean) => (
    <WireToolbar
      compact={compact}
      canUndo={undoDepth > 0}
      canRedo={redoDepth > 0}
      canDelete={selWire != null}
      onUndo={undo}
      onRedo={redo}
      onDelete={deleteSelectedWire}
    />
  );

  const host = React.useRef<HTMLDivElement>(null);

  const tp = React.useMemo(() => freeTp(scene, slots, wires), [scene, slots, wires]);
  const panelWires = React.useMemo(() => wires.map((w) => ({ a: w.a, b: w.b, net: w.net })), [wires]);

  /** Clic « décor » : sélectionne le rail courant ou l'annexe (les appareils et bornes gèrent leur propre clic). */
  const onStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest('.se-dev, .se-hit, .se-term, .se-wires')) return;
    selectWire(null);
    const p = host.current?.querySelector<HTMLElement>('.se-panel');
    if (!p) return;
    const r = p.getBoundingClientRect();
    const sc = r.width / PANEL_W;
    const x = (e.clientX - r.left) / sc;
    const y = (e.clientY - r.top) / sc;
    if (x >= ANNEX_X) { setRail(ANNEX_RAIL); return; }
    const i = RAILS.findIndex((ry) => y >= ry - 20 && y <= ry + RAIL_H + 20);
    if (i >= 0) setRail(i);
  };

  return (
    <section className="at-card" aria-label="Platine">
      <h2 className="at-h">Platine · {SCENES.find((s) => s.id === scene)?.label}</h2>
      {/* Atelier libre : pas de table `nets`, donc aucune mesure calculable sur un montage quelconque. */}
      <InstrumentTray value={null} onSelect={() => undefined} disabled />
      {toolbar()}
      <div className="at-stage" ref={host} onClick={onStageClick}>
        <Workspace
          storageKey="atelier"
          title="Atelier libre"
          subtitle={`Platine · ${SCENES.find((x) => x.id === scene)?.label ?? ''}`}
          indicator={`${slots.length} appareil${slots.length > 1 ? 's' : ''} · ${wires.length} fil${wires.length > 1 ? 's' : ''}`}
          actions={toolbar(true)}
        >
          <Panel
            tp={tp}
            items={items}
            wires={panelWires}
            cover={cover}
            marks={marks}
            pickTerminals
            onTerminal={clickTerminal}
            selectedWire={selWire}
            onWire={selectWire}
            onWireLongPress={openWireMenu}
            onDevice={removeSlot}
            fixedScale
          />
          {/* zones de pose, en coordonnées logiques de la platine */}
          <div className="at-zones" aria-hidden="true">
            {RAILS.map((ry, i) => (
              <div
                key={ry}
                className={`at-zone${rail === i ? ' sel' : ''}`}
                style={{
                  left: RAIL_X[0] - 4, top: ry - 8,
                  width: RAIL_X[1] - RAIL_X[0] + 8, height: RAIL_H + 16,
                }}
              >
                <span className="tag">rail {i + 1}</span>
              </div>
            ))}
            <div
              className={`at-zone${rail === ANNEX_RAIL ? ' sel' : ''}`}
              style={{ left: ANNEX_X, top: 20, width: 118, height: 680 }}
            >
              <span className="tag">annexe</span>
            </div>
          </div>
        </Workspace>
      </div>
      {wireMenu && (
        <WireContextMenu
          x={wireMenu.x}
          y={wireMenu.y}
          onDelete={() => removeWire(wireMenu.index)}
          onCancel={closeWireMenu}
        />
      )}
      <UndoBar message={undoNotice} onUndo={undo} onDismiss={dismissUndoNotice} />
      <p className="at-hint" data-testid="hint">
        {hint ?? (selWire != null
          ? `Fil ${wireLabel(wires[selWire])} sélectionné : Suppr pour le retirer, Échap pour abandonner.`
          : sel
          ? `Borne ${sel.replace('.', ' : ')} sélectionnée : clique la seconde borne.`
          : rail === ANNEX_RAIL
            ? 'Annexe sélectionnée. Clique un rail pour revenir sur la platine.'
            : `Rail ${rail + 1} sélectionné. Pose des appareils, puis tire tes fils borne à borne.`)}
      </p>
    </section>
  );
}

/* -------------------------------------------------------------- inspecteur */

function Inspector() {
  const s = useAtelier();
  const tp = React.useMemo(() => freeTp(s.scene, s.slots, s.wires), [s.scene, s.slots, s.wires]);
  const length = React.useMemo(() => {
    const ctx = sceneContext(tp, s.items);
    const plan = planLanes(ctx, s.wires.map((w) => [w.a, w.b] as [string, string]));
    return totalLength(plan);
  }, [tp, s.items, s.wires]);

  const [classId, setClassId] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const profile = await getMyProfile();
        if (alive && profile?.class_id) { setClassId(profile.class_id); return; }
        const classes = await listMyClasses();
        if (alive && classes.length) setClassId(classes[0].id);
      } catch {
        /* démo / hors-ligne : pas de classe */
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <section className="at-card" aria-label="Inspecteur">
        <h2 className="at-h">Inspecteur</h2>

        <p className="at-sub">Type d&apos;installation</p>
        <div className="at-row" style={{ margin: '4px 0 10px' }}>
          {SCENES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              className={`at-chip${s.scene === sc.id ? ' sel' : ''}`}
              onClick={() => s.setScene(sc.id as SceneKind)}
            >
              {sc.label}
            </button>
          ))}
        </div>

        <p className="at-sub">Conducteur</p>
        <div className="at-nets" style={{ margin: '4px 0 10px' }}>
          {NETS.map((n: NetKind) => (
            <button
              key={n}
              type="button"
              className={`at-net${s.net === n ? ' sel' : ''}`}
              style={{ background: NET_COLOR[n] }}
              onClick={() => s.setNet(n)}
              title={`Conducteur ${n}`}
              data-net={n}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="at-stats">
          <div className="at-stat"><b data-testid="n-dev">{s.slots.length}</b><span>appareils</span></div>
          <div className="at-stat"><b data-testid="n-wire">{s.wires.length}</b><span>fils</span></div>
          <div className="at-stat"><b data-testid="n-len">{length.toFixed(1)}</b><span>m de fil</span></div>
        </div>

        <div className="at-row">
          <button type="button" className={`at-chip${s.cover ? ' sel' : ''}`} onClick={s.toggleCover}>
            Couvercles
          </button>
          <button type="button" className={`at-chip${s.marks ? ' sel' : ''}`} onClick={s.toggleMarks}>
            Repères
          </button>
        </div>

        <p className="at-sub" style={{ marginTop: 10 }}>Titre du montage</p>
        <input
          className="at-input"
          value={s.title}
          onChange={(e) => s.setTitle(e.target.value)}
          aria-label="Titre du montage"
        />
        <div className="at-btns">
          <button
            type="button"
            className="at-btn primary"
            disabled={s.saving}
            onClick={() => void s.save()}
            data-testid="save"
          >
            {s.saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" className="at-btn" onClick={s.newProject}>Nouveau</button>
          <button type="button" className="at-btn ghost" data-testid="at-clear" onClick={() => s.askClear(true)}>Vider</button>
        </div>
        {s.confirmClear && (
          <ConfirmDialog
            title="Vider la platine ?"
            confirmLabel="Vider la platine"
            body={(
              <>
                <p>
                  Les <b>{s.slots.length} appareil{s.slots.length > 1 ? 's' : ''}</b> et
                  les <b>{s.wires.length} fil{s.wires.length > 1 ? 's' : ''}</b> du montage seront retirés.
                </p>
                <p>Tu peux revenir en arrière avec « ↩︎ Annuler ».</p>
              </>
            )}
            onConfirm={s.clear}
            onCancel={() => s.askClear(false)}
          />
        )}
      </section>

      <section className="at-card" aria-label="Appareils posés">
        <h2 className="at-h">Appareils posés</h2>
        {s.slots.length === 0 ? <p className="at-sub">Rien sur la platine pour l&apos;instant.</p> : null}
        <div className="at-devs">
          {s.slots.map((slot) => (
            <div key={slot.id} className="at-dev">
              <span className="r">{slot.rep}</span>
              <span className="n">{slot.label}</span>
              <span className="at-sub">{slot.rail === ANNEX_RAIL ? 'annexe' : `rail ${(slot.rail ?? 0) + 1}`}</span>
              <button type="button" aria-label={`Retirer ${slot.rep}`} onClick={() => s.removeSlot(slot.id)}>×</button>
            </div>
          ))}
        </div>
      </section>

      <section className="at-card" aria-label="Mes montages">
        <h2 className="at-h">Mes montages</h2>
        {s.projects.length === 0
          ? <p className="at-sub">Aucun montage enregistré : pose ton montage puis clique « Enregistrer ».</p>
          : null}
        <div className="at-list" data-testid="projects">
          {s.projects.map((p) => (
            <article key={p.id} className={`at-proj${p.id === s.projectId ? ' cur' : ''}`}>
              <div className="t">{p.title}</div>
              <div className="m">
                {SCENES.find((x) => x.id === p.scene)?.label ?? p.scene}
                {' · '}{p.data?.slots?.length ?? 0} appareils · {p.data?.wires?.length ?? 0} fils
                {p.shared ? ' · partagé' : ''}
              </div>
              <div className="a">
                <button type="button" onClick={() => void s.open(p.id)}>Ouvrir</button>
                {classId ? (
                  <button type="button" onClick={() => void s.share(p.id, p.shared ? null : classId)}>
                    {p.shared ? 'Retirer le partage' : 'Partager à ma classe'}
                  </button>
                ) : null}
                <button type="button" className="danger" onClick={() => void s.destroy(p.id)}>Supprimer</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- assemblage */

export default function AtelierClient() {
  const init = useAtelier((s) => s.init);
  React.useEffect(() => { void init(); }, [init]);

  return (
    <main className="at-wrap">
      <Library />
      <Stage />
      <Inspector />
    </main>
  );
}
