'use client';

/**
 * Platine v3 : DOM absolu 560 × 920 (armoire `.se-cab` 560 × 720 + bloc récepteurs `.se-recv`).
 * Port du rendu de `docs/reference/illustration-v4.tpl.html` (voir SPEC-v3 §2 et §5).
 * Sans `fixedScale`, le composant se met lui-même à l'échelle de la largeur disponible ;
 * dans un `<Workspace>`, c'est ce dernier qui gère le zoom (`fixedScale`).
 */
import React from 'react';
import type { CatalogueItem, NetKind, TpDefinition } from '@/lib/types';
import {
  ALIM_W, GAINE_LEN, PANEL_W, TOIT_TOP, gaineW, glandOf, motorOf, mt2Of, mtermOf, resOf, sceneOf, tbOf,
  pupitreOf, pupitreTerminals, recvBoxOf, resIds, resLabel, term, type Point,
} from '@/lib/scene/geometry';
import {
  annexTerminals, planLanes, recvGlandX, recvTerminals, route, sceneContext, terreTerminals, tpos,
  type LanePlan, type SceneCtx,
} from '@/lib/scene/route';
import { Ducts, Rails } from './Ducts';
import Device, { type DeviceState } from './Device';
import Terminals, { type TerminalMark } from './Terminals';
import { borneVisee, rayonsDeCapture } from '@/lib/scene/pick';
import { WiresOver, WiresUnder, type RoutedWire, type WireTag } from './Wires';
import Station from './Station';
import { Motor, TerminalBox } from './Motor';
import Annex from './Annex';
import Alim from './Alim';
import Recv from './Recv';
import Terre from './Terre';
import Overlays from './Overlays';
import './panel.css';

export interface PanelWire {
  a: string;
  b: string;
  net: NetKind;
  /** Réalisée par l'installateur (réseau → X1, câble moteur). */
  prewired?: boolean;
  /** Liaison en porte. */
  door?: boolean;
  /** Hors tension : tracé estompé. */
  dead?: boolean;
}

export interface PanelProps {
  tp: TpDefinition;
  /** Catalogue résolu par clé (fourni par l'appelant : pack + bibliothèque). */
  items: Record<string, CatalogueItem>;
  wires: PanelWire[];
  cover: boolean;
  marks: boolean;
  /** État des appareils : q1, f2, f3, km1, f1… */
  deviceState?: Record<string, DeviceState>;
  /** Voyants du coffret de porte allumés, par repère (« H1 », « H2 »…). */
  lamps?: Record<string, boolean>;
  /** Coups de poing du coffret restés verrouillés, par repère. */
  latched?: Record<string, boolean>;
  motorRpm?: number;
  /** Index de la liaison surlignée. */
  highlight?: number | null;
  /** Index du fil sélectionné par l'élève (trait épaissi + halo). */
  selectedWire?: number | null;
  /**
   * Bornes montrées du doigt. Deux, pour une liaison attendue désignée depuis le
   * tableau de câblage — elles s'allument même si le fil n'est pas encore posé,
   * c'est tout l'intérêt. Ou davantage, pour la ZONE d'une hypothèse à l'étape de
   * dépannage : on y montre où chercher, jamais le point exact.
   */
  aimed?: readonly string[] | null;
  probes?: { r?: string | null; k?: string | null };
  clamp?: number | null;
  lock?: boolean;
  pickTerminals?: boolean;
  pickWires?: boolean;
  onTerminal?: (id: string) => void;
  onWire?: (idx: number) => void;
  /** Appui long sur un fil (tactile) : coordonnées écran du menu contextuel. */
  onWireLongPress?: (idx: number, x: number, y: number) => void;
  onDevice?: (slotId: string) => void;
  /** Appui / relâchement d'un organe du coffret, désigné par son repère. */
  onButton?: (rep: string, down: boolean) => void;
  className?: string;
  /** Le composant ne se met pas lui-même à l'échelle (il est dans un `<Workspace>` zoomable). */
  fixedScale?: boolean;
  /**
   * Calque libre dessiné au-dessus de la scène, en coordonnées de scène. `at`
   * donne la position d'une borne. Sert au banc de mesure de la mise en service :
   * cordons de couleur, points de masse, préparations à faire sur le matériel.
   */
  overlay?: (at: (id: string) => Point | null) => React.ReactNode;
}

/** Décalage du repère d'une borne (95/96 à gauche, 97/98 à droite). */
/**
 * Bornes du variateur : sur 65 px de large, une étiquette de quatre caractères
 * en fait 22. Les trois bornes d'une rangée de puissance sont donc décalées en
 * quinconce, et les bornes de contrôle — rangées en colonne — se lisent à côté
 * de l'appareil plutôt que dessus.
 */
const MARQUE_ATV: Record<string, { dx: number; dy: number }> = {
  // bloc de commande, en face avant : la rangée du haut se repère AU-DESSUS de
  // ses bornes, celle du bas en dessous — sinon les deux étiquettes se
  // retrouveraient l'une sur l'autre entre les deux rangées.
  R1A: { dx: 0, dy: -9 }, R1C: { dx: 0, dy: -9 }, '+24': { dx: 0, dy: -9 }, COM: { dx: 0, dy: -9 },
  LI1: { dx: 0, dy: 9 }, LI2: { dx: 0, dy: 9 }, AI1: { dx: 0, dy: 9 },
};

function markOffset(id: string, fy: number, key?: string): { dx: number; dy: number } {
  if (key === 'atv320' && MARQUE_ATV[id]) return MARQUE_ATV[id];
  // Automate : 11 bornes serrées par rangée → repères VERTICAUX, un peu plus dégagés du point.
  if (key === 'plc') return { dx: 0, dy: fy < 0.5 ? -15 : 15 };
  const dx = id === '95' || id === '96' ? -8 : id === '97' || id === '98' ? 8 : 0;
  return { dx, dy: fy < 0.5 ? -9 : 9 };
}

export default function Panel(props: PanelProps) {
  const {
    tp, items, wires, cover, marks, deviceState, lamps, latched, motorRpm = 0,
    highlight = null, selectedWire = null, aimed = null, probes, clamp = null, lock = false, pickTerminals, pickWires,
    onTerminal, onWire, onWireLongPress, onDevice, onButton, className, fixedScale = false, overlay,
  } = props;

  const hostRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  // L'armoire n'a pas toujours 720 px : un TP peut la relever pour loger un
  // appareil que l'échelle rend trop grand. Tout le reste de la scène suit.
  const geo = React.useMemo(() => sceneOf(tp), [tp]);

  React.useEffect(() => {
    if (fixedScale) return;
    const host = hostRef.current;
    if (!host) return;
    const apply = () => {
      const w = host.clientWidth;
      if (w > 0) setScale(Math.min(1, w / (PANEL_W + ALIM_W)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [fixedScale]);

  const ctx: SceneCtx = React.useMemo(() => sceneContext(tp, items), [tp, items]);
  const plan: LanePlan = React.useMemo(
    () => planLanes(ctx, wires.map((w) => [w.a, w.b] as [string, string])),
    [ctx, wires],
  );

  const routed: RoutedWire[] = React.useMemo(() => {
    const out: RoutedWire[] = [];
    wires.forEach((w, i) => {
      const pts = route(ctx, plan, w.a, w.b, i);
      if (!pts) return;
      // Liaison qui emprunte une gaine : sa partie extérieure commence au
      // presse-étoupe. Elle se dessine au-dessus du tube, sinon on ne verrait pas
      // ce que la gaine transporte — c'est tout l'intérêt de l'avoir déclarée.
      const r = ctx.rangs[`${w.a}>${w.b}`];
      const g = r ? ctx.gaines[r.rep] : undefined;
      out.push({
        index: i, pts, net: w.net,
        external: Boolean(w.door || w.prewired || g), dead: w.dead, locked: w.prewired,
        ...(g ? { pied: g.yIn - 1 } : {}),
      });
    });
    return out;
  }, [ctx, plan, wires]);

  // Repères posés sur les conducteurs qui empruntent un couloir réservé : sans eux,
  // cinq cordons parallèles ou dix fils de commande violets restent indiscernables.
  const tags: WireTag[] = React.useMemo(() => {
    const out: WireTag[] = [];
    // Un repère par BORNE, pas par conducteur : deux liaisons qui aboutissent à la
    // même borne partagent son couloir, et deux étiquettes s'y superposeraient.
    const vus = new Set<string>();
    wires.forEach((w, i) => {
      const id = ctx.couloirs[w.a] ? w.a : ctx.couloirs[w.b] ? w.b : null;
      if (!id || vus.has(id) || !routed.some((r) => r.index === i)) return;
      vus.add(id);
      const c = ctx.couloirs[id];
      out.push({ index: i, x: c.x, y: c.y, text: c.nom, net: w.net });
    });
    return out;
  }, [ctx, wires, routed]);

  const hlTerminals = React.useMemo(() => {
    const s = new Set<string>();
    if (highlight != null && wires[highlight]) { s.add(wires[highlight].a); s.add(wires[highlight].b); }
    return s;
  }, [highlight, wires]);

  const aimTerminals = React.useMemo(
    () => new Set<string>(aimed ?? []),
    [aimed],
  );

  // ---- bornes des appareils posés
  const slotTerminals: TerminalMark[] = React.useMemo(() => {
    const out: TerminalMark[] = [];
    for (const s of ctx.slots) {
      for (const t of s.terminals) {
        const p = term(s, t.fx, t.fy);
        const { dx, dy } = markOffset(t.id, t.fy, s.slot.key);
        out.push({ id: `${s.id}.${t.id}`, pos: p, label: s.slot.group ? undefined : t.id, dx, dy, rot: s.slot.key === 'plc' });
      }
    }
    return out;
  }, [ctx]);

  /** Étiquette du moteur : la plaque signalétique du TP, pas une valeur figée. */
  const motorLabel = React.useMemo(() => {
    const m = tp.motor;
    if (!m) return undefined;
    const kw = (m.P / 1000).toFixed(1).replace('.', ',').replace(',0', '');
    return `M1 · ${kw} kW · ${m.U} V Y`;
  }, [tp.motor]);

  // ---- bornes extérieures (porte, moteur, réseau, annexe)
  const pupitre = React.useMemo(() => pupitreOf(tp), [tp]);
  const stationTerminals: TerminalMark[] = React.useMemo(
    () => (tp.station ? Object.entries(pupitreTerminals(pupitre)).map(([id, p]) => ({ id, pos: p })) : []),
    [tp.station, pupitre],
  );
  const motorTerminals: TerminalMark[] = React.useMemo(() => {
    if (!tp.hasMotor) return [];
    return Object.entries({ ...mtermOf(geo), ...mt2Of(geo) }).map(([id, p]) => ({
      id, pos: p, label: id.split('.')[1], dy: id.endsWith('2') ? -9 : 9,
    }));
  }, [tp.hasMotor, geo]);
  const annexTerms: TerminalMark[] = React.useMemo(() => {
    const out: TerminalMark[] = [];
    for (const it of tp.annexItems ?? []) {
      const dc = it.key === 'battery' || it.key === 'pvpanel';
      for (const [id, p] of Object.entries(annexTerminals(it))) {
        const term = id.split('.')[1];
        // Sur le champ PV et le parc batterie : X1 = pôle + (rouge), X2 = pôle − (noir).
        const pol = dc ? (term === 'X1' ? 'plus' : term === 'X2' ? 'minus' : undefined) : undefined;
        // Un module n'a qu'un + et un − : on n'affiche QUE la polarité (« + » / « − »),
        // pas « X1/X2 » (l'identifiant interne reste inchangé pour le câblage). Le repère
        // se pose À GAUCHE de la pastille, DANS le module, pour ne plus déborder sur le
        // panneau voisin, sur les numéros PV ni sur le titre. Les autres annexes gardent leur repère.
        const compact = pol === 'plus' || pol === 'minus';
        const label = pol === 'plus' ? '+' : pol === 'minus' ? '−' : term;
        // Repère de polarité À L'EXTÉRIEUR de la pastille (de part et d'autre du module) :
        // pastille + au bord gauche → « + » posé à SA GAUCHE ; pastille − au bord droit
        // → « − » posé à SA DROITE. Le repère ne chevauche plus la pastille ni les cellules.
        const onLeft = p.x < it.x + it.w / 2;
        const dx = compact ? (onLeft ? -11 : 11) : 8;
        out.push({ id, pos: { x: p.x, y: p.y }, label, dx, dy: 0, pol });
      }
    }
    return out;
  }, [tp.annexItems]);
  /**
   * Bornes de l'ensemble terre (barrette de coupure, piquet), hors coffret.
   *
   * Elles existaient pour le routage mais n'étaient pas dessinées : l'élève ne
   * pouvait pas cliquer BC1.X1 et ne pouvait donc pas raccorder la borne PE du
   * bornier à la barrette de coupure. X1 en haut, X2 en bas — sur le piquet, X2
   * est la pointe enfouie (le sol), qui sert à la mesure de la résistance de terre.
   */
  const terreTerms: TerminalMark[] = React.useMemo(() => {
    const out: TerminalMark[] = [];
    if (geo.terreY == null) return out;
    for (const it of tp.terre?.items ?? []) {
      for (const [id, p] of Object.entries(terreTerminals(geo, it))) {
        const t = id.split('.')[1];
        // X2 à droite de la pastille, à sa hauteur : dessous, il couvrirait le repère BC1 / PT1.
        out.push({ id, pos: { x: p.x, y: p.y }, label: t, dx: t === 'X1' ? 10 : 16, dy: t === 'X1' ? -8 : 0 });
      }
    }
    return out;
  }, [tp.terre, geo]);
  const recvItems = React.useMemo(() => tp.recvItems ?? [], [tp.recvItems]);
  const recvTerms: TerminalMark[] = React.useMemo(() => {
    const out: TerminalMark[] = [];
    for (const it of recvItems) {
      const bat = it.key === 'battery';
      for (const [id, p] of Object.entries(recvTerminals(geo, it))) {
        const term = id.split('.')[1];
        // Batteries du parc : X1 = pôle + (rouge), X2 = pôle − (noir), repère « + » / « − ».
        const pol = bat ? (term === 'X1' ? 'plus' : term === 'X2' ? 'minus' : undefined) : undefined;
        const label = pol === 'plus' ? '+' : pol === 'minus' ? '−' : term;
        out.push({ id, pos: { x: p.x, y: p.y }, label, dy: -9, pol });
      }
    }
    return out;
  }, [recvItems, geo]);
  /**
   * Presse-étoupes en bas de l'armoire : un par descente vers un récepteur.
   *
   * Un TP qui DÉCLARE ses gaines prend la main : ce ne sont plus des sorties
   * déduites du dessin mais des gaines repérées, avec leur diamètre et leur
   * contenu. On ne dessine pas les deux, sous peine de presse-étoupes doublés.
   */
  const glands: number[] = React.useMemo(() => {
    if (tp.gaines?.length) return [];
    const xs = new Set<number>(recvItems.length ? recvItems.flatMap((it) => {
      const b = recvBoxOf(geo, it);
      return [recvGlandX(b.x + b.w * 0.34), recvGlandX(b.x + b.w * 0.66)];
    }) : []);
    if (tp.hasMotor) xs.add(glandOf(geo).x);
    return Array.from(xs);
  }, [recvItems, tp.hasMotor, tp.gaines, geo]);

  // Installation autonome (off-grid) : pas d'arrivée réseau. Le TP le déclare via
  // `arriveeReseau: false` ; on n'affiche alors ni presse-étoupes réseau ni libellé.
  const netTerminals: TerminalMark[] = React.useMemo(
    () => (tp.arriveeReseau === false
      ? []
      : resIds(tp.scene, tp.arriveeMono, tp.sansPeReseau).map((id) => ({ id, pos: resOf()[id] }))),
    [tp.scene, tp.arriveeReseau, tp.arriveeMono, tp.sansPeReseau, geo],
  );

  /* ------------------------------------------------- arbitrage du clic sur les bornes
   *
   * Chaque borne portait un halo tactile fixe de 40 px, pensé pour le doigt. Mais deux
   * bornes voisines ne sont distantes que de 18 px sur un bornier, et de 13 px sur un
   * contacteur : les halos se recouvraient, et à `z-index` égal c'était le dernier dessiné
   * — la borne de DROITE — qui captait le clic. Il fallait viser à gauche pour atteindre la
   * bonne borne.
   *
   * Le clic se résout donc par DISTANCE et non plus par empilement : on cherche la borne la
   * plus proche du pointeur, dans un rayon qui s'adapte à la densité locale.
   */

  /** Toutes les bornes réellement affichées, dans le repère logique de la platine. */
  const bornes: TerminalMark[] = React.useMemo(() => {
    const out: TerminalMark[] = [...slotTerminals, ...netTerminals, ...recvTerms, ...annexTerms, ...terreTerms];
    if (tp.station) out.push(...stationTerminals);
    if (tp.hasMotor) out.push(...motorTerminals);
    return out;
  }, [slotTerminals, netTerminals, recvTerms, annexTerms, terreTerms, stationTerminals, motorTerminals, tp.station, tp.hasMotor]);

  /** Rayons de capture, calculés sur la densité locale (voir `src/lib/scene/pick.ts`). */
  const rayons = React.useMemo(() => rayonsDeCapture(bornes.map((t) => t.pos)), [bornes]);

  const panelRef = React.useRef<HTMLDivElement>(null);
  const [survol, setSurvol] = React.useState<string | null>(null);
  const picking = Boolean(pickTerminals && onTerminal);

  /**
   * Borne la plus proche du pointeur, dans son rayon de capture — `null` si le pointeur
   * n'est proche d'aucune borne. L'échelle est relue sur le DOM (largeur rendue / largeur
   * logique), donc le calcul reste juste à n'importe quel zoom et en mode atelier.
   */
  const borneSous = React.useCallback((e: React.PointerEvent): string | null => {
    const el = panelRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width) return null;
    const k = r.width / PANEL_W;
    const px = (e.clientX - r.left) / k;
    const py = (e.clientY - r.top) / k;
    const i = borneVisee(bornes.map((t) => t.pos), rayons, px, py);
    const best = i < 0 ? null : bornes[i].id;
    return best;
  }, [bornes, rayons]);

  // ---- étiquettes de groupe (X1 / X2)
  const groupLabels = React.useMemo(() => {
    const groups: Record<string, typeof ctx.slots> = {};
    for (const s of ctx.slots) {
      const g = s.slot.group;
      if (!g) continue;
      (groups[g] = groups[g] || []).push(s);
    }
    return Object.entries(groups).map(([g, arr]) => {
      const x0 = Math.min(...arr.map((s) => s.x));
      const x1 = Math.max(...arr.map((s) => s.x + s.w));
      const y = arr[0].y + arr[0].h + 26;
      const custom = arr.find((s) => s.slot.groupLabel)?.slot.groupLabel;
      const label = custom ?? (g === 'X1'
        ? tp.scene === 'pv' ? 'X1 · bornier DC / AC'
          : tp.scene === 'hab' ? 'X1 · bornier de raccordement (gaines ICTA)'
            : 'X1 · bornier puissance'
        : 'X2 · commande / porte');
      return { g, x: (x0 + x1) / 2, y, label };
    });
  }, [ctx, tp.scene]);

  // ---- calques de mesure
  const probePos = React.useMemo(() => {
    const at = (id?: string | null): Point | null => {
      if (!id) return null;
      const p = tpos(ctx, id);
      return p ? { x: p.x, y: p.y } : null;
    };
    return { r: at(probes?.r), k: at(probes?.k) };
  }, [ctx, probes]);

  const clampPos = React.useMemo(() => {
    if (clamp == null) return null;
    const w = routed.find((r) => r.index === clamp);
    if (!w || w.pts.length < 2) return null;
    const [a, b] = [w.pts[0], w.pts[1]];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }, [clamp, routed]);

  const lockBox = React.useMemo(() => {
    if (!lock) return null;
    // Un cadenas + macaron par organe de séparation consigné : Q1 (parc) et,
    // sur une installation à deux sources, l'organe du champ PV (Q2).
    const ids = ['q1'];
    const champ = tp.consignationVat?.champ;
    if (champ) ids.push(champ);
    const boxes = ids
      .map((id) => ctx.slots.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
    return boxes.length ? boxes : null;
  }, [lock, ctx, tp.consignationVat]);

  const mono = tp.scene === 'pv' || tp.scene === 'hab';

  const panel = (
    <div
      ref={panelRef}
      className={`se-panel ${tp.scene}`}
      style={fixedScale
        ? { height: geo.panelH, transform: geo.alimW ? `translateX(${geo.alimW}px)` : undefined }
        : { height: geo.panelH, transform: `scale(${scale}) translateX(${geo.alimW}px)` }}
      onPointerDown={picking ? (e) => {
        const id = borneSous(e);
        // On ne neutralise l'événement que si une borne est vraiment visée : ailleurs,
        // le glissement continue de faire défiler la zone de travail.
        if (id) { e.preventDefault(); onTerminal?.(id); }
      } : undefined}
      onPointerMove={picking ? (e) => {
        const id = borneSous(e);
        setSurvol((prev) => (prev === id ? prev : id));
      } : undefined}
      onPointerLeave={picking ? () => setSurvol(null) : undefined}
    >
      {/* Pupitre d'alimentation : la colonne de gauche, sur toute la hauteur de
          l'armoire. C'est de ses douilles que part l'énergie de la platine. */}
      {geo.alimW ? <Alim h={geo.cabH} /> : null}
      {/* cadre de l'armoire (560 × 720) : fond, bordure, grille Lina */}
      {/* Sur la scène PV, le coffret commence SOUS le bloc champ PV (bloc distinct au-dessus). */}
      <div className="se-cab" style={tp.annex === 'roof' ? { top: TOIT_TOP, height: geo.cabH - TOIT_TOP } : { height: geo.cabH }} />
      {tp.scene === 'hab' ? <div className="se-tab" /> : null}
      {/* bloc récepteurs, sous la platine */}
      <Recv annex={tp.annex} items={recvItems} catalogue={items} y={geo.recvY} h={geo.recvH} />
      {/* l'ensemble terre est DEHORS : son bloc a sa ligne de sol et son piquet enfoui */}
      {tp.terre && geo.terreY != null ? (
        <Terre
          items={tp.terre.items}
          catalogue={items}
          y={geo.terreY}
          h={geo.terreH ?? 0}
          sol={tp.terre.sol}
        />
      ) : null}
      <Ducts scene={tp.scene} cover={cover} ducts={geo.ducts} />
      <Rails rails={geo.rails} />
      <Annex annex={tp.annex} items={tp.annexItems ?? []} catalogue={items} />

      {/* fils sous les couvercles : masqués par les goulottes quand les couvercles sont fermés */}
      <WiresUnder alimW={geo.alimW} porteW={geo.porteW} panelH={geo.panelH} pied={geo.ducts[geo.ducts.length - 1][1]} wires={routed} highlight={highlight} selected={selectedWire} pick={pickWires} onWire={onWire} onWireLongPress={onWireLongPress} />

      {/* appareils */}
      {ctx.slots.map((s) => (
        <Device key={s.id} slot={s} state={deviceState?.[s.id]} onClick={onDevice} />
      ))}
      <Terminals
        terminals={slotTerminals}
        marks={marks}
        highlighted={hlTerminals}
            aimed={aimTerminals}
        pick={pickTerminals}
            survol={survol}
        onTerminal={pickTerminals ? onTerminal : undefined}
      />
      {groupLabels.map((g) => (
        <div key={g.g} className="se-group" style={{ left: g.x, top: g.y }}>{g.label}</div>
      ))}

      {/* coffret de porte */}
      {tp.station ? (
        <>
          <Station pupitre={pupitre} lamps={lamps} latched={latched} onButton={onButton} />
          <Terminals
            terminals={stationTerminals}
            marks={false}
            highlighted={hlTerminals}
            aimed={aimTerminals}
            pick={pickTerminals}
            survol={survol}
            onTerminal={pickTerminals ? onTerminal : undefined}
          />
        </>
      ) : null}

      {/* moteur, dans le bloc récepteurs */}
      {tp.hasMotor ? (
        <>
          {/* L'étiquette vient de la plaque du TP : chaque machine a son moteur. */}
          <Motor rpm={motorRpm} label={motorLabel} y={motorOf(geo).y} />
          <TerminalBox y={tbOf(geo).y} />
          <Terminals
            terminals={motorTerminals}
            marks={marks}
            highlighted={hlTerminals}
            aimed={aimTerminals}
            pick={pickTerminals}
            survol={survol}
            onTerminal={pickTerminals ? onTerminal : undefined}
          />
        </>
      ) : null}

      {/* presse-étoupes en bas de l'armoire */}
      {glands.map((x) => (
        <div key={`g${x}`} className="se-gland" style={{ left: x, top: glandOf(geo).y }} />
      ))}
      {glands.length ? (
        <div className="se-res" style={{ left: 500, top: glandOf(geo).y + 12 }}>
          presse-étoupe{glands.length > 1 ? 's' : ''}
        </div>
      ) : null}

      {/* gaines déclarées : presse-étoupe en sous-face, tube annelé et repère.
          Le tube est dessiné À SON DIAMÈTRE, à la même échelle que les appareils :
          une ⌀25 se voit plus large qu'une ⌀16, et trois conducteurs y tiennent. */}
      {(tp.gaines ?? []).map((g) => {
        const pose = ctx.gaines[g.rep];
        if (!pose) return null;
        const w = gaineW(g.diam);
        // Par le haut, le tube monte : son bord supérieur est la sortie, pas l'entrée.
        const yTube = Math.min(pose.yTube, pose.yOut);
        const yRep = pose.sens === 1 ? pose.yTube + 18 : pose.yOut + 6;
        return (
          <React.Fragment key={g.id}>
            <div className="se-gland" style={{ left: g.x, top: pose.yIn, width: w + 10 }} />
            {/* La gaine suit le bouton « ouvrir les couvercles », comme les goulottes :
                fermée elle cache son contenu, ouverte on voit les conducteurs dedans. */}
            <div
              className={`se-gaine ${g.nature}${cover ? '' : ' open'}`}
              style={{ left: g.x, top: yTube, width: w, height: GAINE_LEN }}
              title={`${g.rep} · ICTA ⌀${g.diam} · ${g.contenu} → ${g.vers}`}
            />
            {/* Le repère se pose À CÔTÉ du tube, pas dessous : sous le coffret passent
                déjà les bornes des récepteurs, et deux étiquettes au même endroit ne
                se lisent ni l'une ni l'autre. */}
            <div className="se-gaine-rep" style={{ left: g.x + w / 2 + 5, top: yRep }}>
              {g.rep}
            </div>
            <div className="se-gaine-diam" style={{ left: g.x + w / 2 + 5, top: yRep + 13 }}>
              ⌀{g.diam}
            </div>
          </React.Fragment>
        );
      })}
      {tp.gaines?.length ? (
        <div className="se-res" style={{ left: 500, top: glandOf(geo).y + 12 }}>
          {tp.gaines.length} gaines
        </div>
      ) : null}

      {/* bornes des récepteurs du bloc du bas */}
      {recvTerms.length ? (
        <Terminals
          terminals={recvTerms}
          marks={marks}
          highlighted={hlTerminals}
            aimed={aimTerminals}
          pick={pickTerminals}
            survol={survol}
          onTerminal={pickTerminals ? onTerminal : undefined}
        />
      ) : null}

      {/* ensemble terre : barrette de coupure et piquet */}
      {terreTerms.length ? (
        <Terminals
          terminals={terreTerms}
          marks={marks}
          highlighted={hlTerminals}
          aimed={aimTerminals}
          pick={pickTerminals}
          survol={survol}
          onTerminal={pickTerminals ? onTerminal : undefined}
        />
      ) : null}

      {/* éléments d'annexe */}
      {annexTerms.length ? (
        <Terminals
          terminals={annexTerms}
          marks={marks}
          highlighted={hlTerminals}
            aimed={aimTerminals}
          pick={pickTerminals}
            survol={survol}
          onTerminal={pickTerminals ? onTerminal : undefined}
        />
      ) : null}

      {/* arrivée réseau */}
      <Terminals
        terminals={netTerminals}
        marks={false}
        highlighted={hlTerminals}
            aimed={aimTerminals}
        pick={pickTerminals}
            survol={survol}
        onTerminal={pickTerminals ? onTerminal : undefined}
      />
      {netTerminals.map((t) => (
        <div key={`lab${t.id}`} className="se-res" style={{ left: t.pos.x, top: t.pos.y + 6 }}>
          {resLabel(t.id, tp.scene)}
        </div>
      ))}
      {/* Le libellé d'arrivée suit le pupitre : c'est lui la source, désormais. */}
      {mono && tp.arriveeReseau !== false ? (
        <div className="se-res" style={{ left: -60, top: resOf()['RES.PE'].y + 34 }}>
          arrivée mono 230 V
        </div>
      ) : null}

      {/* fils au-dessus des couvercles (brins + parties extérieures) */}
      <WiresOver alimW={geo.alimW} porteW={geo.porteW} tags={tags} panelH={geo.panelH} pied={geo.ducts[geo.ducts.length - 1][1]} wires={routed} highlight={highlight} selected={selectedWire} pick={pickWires} onWire={onWire} onWireLongPress={onWireLongPress} />

      <Overlays probes={probePos} clamp={clampPos} lock={lockBox} />
      {overlay ? overlay((id) => { const p = tpos(ctx, id); return p ? { x: p.x, y: p.y } : null; }) : null}
    </div>
  );

  if (fixedScale) return panel;

  return (
    <div className={`se-panelwrap${className ? ` ${className}` : ''}`} ref={hostRef}>
      <div style={{ width: (PANEL_W + geo.alimW + geo.porteW) * scale, height: geo.panelH * scale }}>{panel}</div>
    </div>
  );
}
