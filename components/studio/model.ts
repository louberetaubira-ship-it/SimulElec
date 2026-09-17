/**
 * Studio de création de TP : modèle de données (aucune dépendance React).
 *
 * Le studio manipule directement une `TpDefinition` — la même que celle des 14 TP fournis —
 * pour que le parcours élève (`ParcoursClient`) fonctionne sans conversion. Ce module
 * regroupe la pose des appareils, la liste des bornes disponibles, la déduction des
 * liaisons évidentes, la table des réseaux et le contrôle de cohérence.
 */
import type {
  AnnexItem, CatalogueItem, ExpectedMeasure, Liaison, NetKind, Poste, SceneKind, Slot,
  TerminalNet, TpDefinition,
} from '@/lib/types';
import {
  ANNEX_Y, MTERM, MT2, RAILS, RAIL_H, RAIL_X, SMALL_W, STERM, resIds,
} from '@/lib/scene/geometry';
import { BASE_TESTS } from '@/lib/data/tps/common';

/** Zone de pose : trois rails DIN, la colonne d'annexe, le bloc récepteurs. */
export type Zone = 0 | 1 | 2 | 'annexe' | 'recepteurs';

export const ZONES: { id: Zone; label: string }[] = [
  { id: 0, label: 'Rail 1' },
  { id: 1, label: 'Rail 2' },
  { id: 2, label: 'Rail 3' },
  { id: 'annexe', label: 'Annexe' },
  { id: 'recepteurs', label: 'Récepteurs' },
];

export const NET_LIST: NetKind[] = ['L1', 'L2', 'L3', 'N', 'PE', 'C', 'C0', 'DC+', 'DC-'];

export const ANNEX_BY_SCENE: Record<SceneKind, TpDefinition['annex']> = {
  ind: 'door', hab: 'room', ter: 'local', pv: 'roof',
};

/** Colonne d'empilage de l'annexe et bas de colonne. */
const ANNEX_COL_X = 446;
const ANNEX_COL_W = 80;
const ANNEX_BOTTOM = 690;

/** Définition vierge : trois rails, aucune liaison, les tests hors tension habituels. */
export function emptyTp(id: string, scene: SceneKind = 'ind'): TpDefinition {
  return {
    id,
    title: '',
    level: 'Bac Pro MELEC',
    family: scene,
    kind: 'platine',
    scene,
    annex: ANNEX_BY_SCENE[scene],
    playable: false,
    competences: [],
    summary: '',
    situation: '',
    plaque: {},
    cahierDesCharges: [],
    postes: [],
    rails: [...RAILS],
    slots: [],
    annexItems: [],
    recvItems: [],
    liaisons: [],
    nets: {},
    tests: [...BASE_TESTS],
    mesures: [],
    faults: [],
    quiz: [],
    motor: null,
    station: scene === 'ind',
    hasMotor: scene === 'ind',
  };
}

/* ------------------------------------------------------------------ repères */

/** Préfixe de repère normalisé (Q protection, KM contacteur, F thermique, T transfo…). */
export function repPrefix(item: CatalogueItem): string {
  const k = item.key;
  if (item.small) return 'X';
  if (k === 'kontakt' || /^p042/.test(k)) return 'KM';
  if (k === 'therm' || /^p043/.test(k)) return 'F';
  if (k === 'trafo' || /^p076/.test(k) || /^l_alimenta/.test(k)) return 'T';
  if (k === 'plc' || /^l_automate/.test(k)) return 'A';
  if (/^lamp/.test(k) || /^l_voyants/.test(k)) return 'H';
  if (k === 'stopstart' || /^l_boutons/.test(k) || /^l_capteurs/.test(k)) return 'S';
  switch (item.kind) {
    case 'contactor': return 'KM';
    case 'thermal': return 'F';
    case 'trafo': return 'T';
    case 'plc': return 'A';
    case 'lamp': return 'H';
    case 'button': return 'S';
    case 'mcb': case 'rcd': case 'motorcb': case 'main': return 'Q';
    case 'terminal': return 'X';
    case 'pv': return 'PV';
    case 'battery': return 'BT';
    case 'inverter': return 'ONDU';
    default: return 'E';
  }
}

/** Cet élément se pose-t-il en annexe (bouton, voyant, prise, module PV) ? */
export function isAnnexItem(item: CatalogueItem): boolean {
  return item.door === true || item.kind === 'button' || item.kind === 'lamp' || item.kind === 'pv';
}

const sizeOf = (item: CatalogueItem): { w: number; h: number } =>
  item.small
    ? { w: SMALL_W, h: Math.round((item.h * SMALL_W) / item.w) }
    : { w: item.w, h: item.h };

/** Numéro libre pour un préfixe de repère donné. */
function nextRep(def: TpDefinition, prefix: string): number {
  const used = [
    ...def.slots.map((s) => s.rep ?? ''),
    ...(def.annexItems ?? []).map((a) => a.rep),
    ...(def.recvItems ?? []).map((a) => a.rep),
  ];
  let n = 1;
  while (used.includes(`${prefix}${n}`)) n += 1;
  return n;
}

export interface PoseResult {
  slot?: Slot;
  annex?: AnnexItem;
  recv?: AnnexItem;
  error?: string;
}

/** Pose un appareil de la bibliothèque dans la zone demandée. */
export function poseItem(def: TpDefinition, item: CatalogueItem, zone: Zone): PoseResult {
  if (zone === 'recepteurs') {
    const list = def.recvItems ?? [];
    const w = Math.min(150, Math.max(40, item.w));
    const h = Math.min(120, Math.max(40, item.h));
    const x = list.length ? Math.max(...list.map((r) => r.x + r.w)) + 20 : 40;
    if (x + w > 540) return { error: 'Bloc récepteurs plein : retire un récepteur.' };
    const rep = `${repPrefix(item)}${nextRep(def, repPrefix(item))}`;
    return { recv: { key: item.key, rep, name: item.name, x, y: 34, w, h, recv: true } };
  }
  if (zone === 'annexe') {
    const list = def.annexItems ?? [];
    const { w, h } = sizeOf(item);
    const y = list.length ? Math.max(...list.map((a) => a.y + a.h)) + 14 : ANNEX_Y + 40;
    if (y + h > ANNEX_BOTTOM) return { error: 'Annexe pleine : retire un élément.' };
    const rep = `${repPrefix(item)}${nextRep(def, repPrefix(item))}`;
    const x = ANNEX_COL_X + Math.max(0, Math.round((ANNEX_COL_W - w) / 2));
    return { annex: { key: item.key, rep, name: item.name, x, y, w, h } };
  }
  const rail = zone;
  const { w } = sizeOf(item);
  const used = def.slots.filter((s) => s.rail === rail);
  const x = used.length
    ? Math.max(...used.map((s) => s.x + (s.w ?? sizeOfKeyWidth(s, w)))) + (item.small ? 2 : 8)
    : RAIL_X[0] + 4;
  if (x + w > RAIL_X[1] - 4) return { error: `Rail ${rail + 1} plein : choisis un autre rail.` };
  const prefix = repPrefix(item);
  const n = nextRep(def, prefix);
  let id = `${prefix.toLowerCase()}${n}`;
  while (def.slots.some((s) => s.id === id)) id = `${id}_`;
  const slot: Slot = {
    id,
    label: item.name,
    key: item.key,
    rail,
    x: Math.round(x),
    rep: `${prefix}${n}`,
    ...(item.small ? { mark: String(n), group: 'X1' } : {}),
  };
  return { slot };
}

/** Largeur mémorisée d'un slot (les bornes de bornier font 16 px). */
function sizeOfKeyWidth(slot: Slot, fallback: number): number {
  return slot.w ?? fallback;
}

/** Déplace un appareil le long de son rail, en restant dans les limites. */
export function moveSlot(def: TpDefinition, id: string, dx: number, width: number): Slot[] {
  return def.slots.map((s) => {
    if (s.id !== id) return s;
    const x = Math.max(RAIL_X[0], Math.min(RAIL_X[1] - width, s.x + dx));
    return { ...s, x: Math.round(x) };
  });
}

/** Position verticale d'un rail (pour l'affichage). */
export const railY = (def: TpDefinition, rail: number): number =>
  (def.rails[rail] ?? RAILS[rail] ?? 150) + RAIL_H / 2;

/* ------------------------------------------------------------------ bornes */

export interface TerminalRef {
  /** Identifiant complet, « q1.2 », « RES.L1 », « H1.X1 ». */
  id: string;
  /** Groupe d'affichage (nom de l'appareil, « Réseau », « Moteur », « Porte »…). */
  group: string;
  label: string;
}

/** Toutes les bornes disponibles pour une liaison ou une mesure, appareils posés compris. */
export function terminalsOf(def: TpDefinition, items: Record<string, CatalogueItem>): TerminalRef[] {
  const out: TerminalRef[] = [];
  for (const slot of def.slots) {
    const item = items[slot.key];
    if (!item) continue;
    const group = `${slot.rep ?? slot.id} · ${item.name}`;
    for (const t of item.terminals) {
      out.push({ id: `${slot.id}.${t.id}`, group, label: `${slot.rep ?? slot.id} : ${t.id}` });
    }
  }
  for (const id of resIds(def.scene)) {
    out.push({ id, group: 'Arrivée réseau', label: id.replace('RES.', 'Réseau ') });
  }
  if (def.hasMotor) {
    for (const id of [...Object.keys(MTERM), ...Object.keys(MT2)]) {
      out.push({ id, group: 'Moteur M1', label: id.replace('M.', 'Moteur ') });
    }
  }
  if (def.station) {
    for (const id of Object.keys(STERM)) {
      out.push({ id, group: 'Coffret de porte', label: id });
    }
  }
  for (const it of def.annexItems ?? []) {
    out.push({ id: `${it.rep}.X1`, group: `Annexe · ${it.rep}`, label: `${it.rep} : X1` });
    out.push({ id: `${it.rep}.X2`, group: `Annexe · ${it.rep}`, label: `${it.rep} : X2` });
  }
  for (const it of def.recvItems ?? []) {
    out.push({ id: `${it.rep}.X1`, group: `Récepteur · ${it.rep}`, label: `${it.rep} : X1` });
    out.push({ id: `${it.rep}.X2`, group: `Récepteur · ${it.rep}`, label: `${it.rep} : X2` });
  }
  return out;
}

/** Clé d'une liaison, indépendante de l'ordre des extrémités. */
export const linkKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/* ------------------------------------------------- déduction des liaisons */

const POWER_KINDS = new Set(['main', 'mcb', 'rcd', 'motorcb', 'contactor', 'thermal']);

interface Placed { slot: Slot; item: CatalogueItem }

const placedList = (def: TpDefinition, items: Record<string, CatalogueItem>): Placed[] =>
  def.slots
    .flatMap((slot) => (items[slot.key] ? [{ slot, item: items[slot.key] }] : []))
    .sort((a, b) => (a.slot.rail ?? 9) - (b.slot.rail ?? 9) || a.slot.x - b.slot.x);

const has = (p: Placed, t: string): boolean => p.item.terminals.some((x) => x.id === t);

/** Entrées / sorties de puissance d'un appareil, par pôle. */
function poles(p: Placed): { in: string[]; out: string[] } {
  const ins = ['1', '3', '5', 'N'].filter((t) => has(p, t));
  const outs = ['2', '4', '6', 'N2'].filter((t) => has(p, t));
  return { in: ins, out: outs };
}

const NET_OF_POLE: Record<string, NetKind> = { '1': 'L1', '3': 'L2', '5': 'L3', N: 'N' };

/**
 * Liaisons évidentes manquantes : arrivée réseau, chaînage des appareils de puissance,
 * auto-maintien du contacteur, alimentation de la bobine, départ moteur.
 * Le professeur corrige ensuite la proposition.
 */
export function deduceLiaisons(def: TpDefinition, items: Record<string, CatalogueItem>): Liaison[] {
  const done = new Set(def.liaisons.map((l) => linkKey(l.a, l.b)));
  const out: Liaison[] = [];
  const add = (a: string, b: string, net: NetKind, flag?: 'door' | 'pre') => {
    const key = linkKey(a, b);
    if (a === b || done.has(key)) return;
    done.add(key);
    out.push({ a, b, net, door: flag === 'door', prewired: flag === 'pre' });
  };

  const list = placedList(def, items);
  // Le chaînage de puissance se fait rail par rail : un appareil de commande posé sur un
  // autre rail n'est pas la suite du départ moteur.
  const parRail = new Map<number, Placed[]>();
  for (const p of list.filter((x) => POWER_KINDS.has(x.item.kind))) {
    const r = p.slot.rail ?? 0;
    parRail.set(r, [...(parRail.get(r) ?? []), p]);
  }
  const railPrincipal = Array.from(parRail.entries())
    .sort((a, b) => b[1].length - a[1].length || a[0] - b[0])[0];
  const power = railPrincipal ? railPrincipal[1] : [];

  // 1. arrivée réseau sur le premier appareil de puissance du rail principal
  const first = power[0];
  if (first) {
    const { in: ins } = poles(first);
    for (const t of ins) {
      const net = NET_OF_POLE[t];
      if (!net) continue;
      add(`RES.${net}`, `${first.slot.id}.${t}`, net, 'pre');
    }
  }

  // 2. chaînage des appareils de puissance, rail par rail et pôle à pôle
  for (const chaine of Array.from(parRail.values())) {
    for (let i = 0; i + 1 < chaine.length; i += 1) {
      const a = chaine[i];
      const b = chaine[i + 1];
      const outs = poles(a).out;
      const ins = poles(b).in;
      const n = Math.min(outs.length, ins.length);
      for (let k = 0; k < n; k += 1) {
        const net = NET_OF_POLE[ins[k]] ?? 'L1';
        add(`${a.slot.id}.${outs[k]}`, `${b.slot.id}.${ins[k]}`, net);
      }
    }
  }

  // 3. départ moteur depuis le dernier appareil de puissance du rail principal
  const last = power[power.length - 1];
  if (def.hasMotor && last) {
    const outs = poles(last).out.filter((t) => t !== 'N2');
    const moteur = ['M.U1', 'M.V1', 'M.W1'];
    outs.slice(0, 3).forEach((t, i) => add(`${last.slot.id}.${t}`, moteur[i], (['L1', 'L2', 'L3'] as NetKind[])[i], 'pre'));
    const terre = list.find((p) => p.item.kind === 'terminal' && p.slot.sub === 'PE');
    if (terre) add(`${terre.slot.id}.b`, 'M.PE', 'PE', 'pre');
  }

  // 4. commande : auto-maintien, bobine, retour 0 V
  const contactor = list.find((p) => p.item.kind === 'contactor' && has(p, 'A1'));
  if (contactor) {
    const id = contactor.slot.id;
    if (has(contactor, '13') && has(contactor, '14')) add(`${id}.14`, `${id}.A1`, 'C');
    const thermal = list.find((p) => p.item.kind === 'thermal' && has(p, '95'));
    const trafo = list.find((p) => p.item.kind === 'trafo');
    const source = thermal ? `${thermal.slot.id}.96` : trafo ? `${trafo.slot.id}.24` : null;
    if (source) add(source, `${id}.13`, 'C');
    const bornier = def.slots.filter((s) => s.group === 'X2');
    const zero = trafo && has(trafo, '0V') ? `${trafo.slot.id}.0V`
      : bornier.length ? `${bornier[bornier.length - 1].id}.a` : null;
    if (zero) add(`${id}.A2`, zero, 'C0');
    if (thermal && trafo) add(`${trafo.slot.id}.24`, `${thermal.slot.id}.95`, 'C');
  }

  return out;
}

/* --------------------------------------------------------- table des réseaux */

/** Racine d'un ensemble disjoint. */
function findRoot(parent: Map<string, string>, x: string): string {
  let r = x;
  while (parent.get(r) && parent.get(r) !== r) r = parent.get(r) as string;
  return r;
}

/**
 * Table `nets` déduite des liaisons : chaque groupe de bornes reliées reçoit le conducteur
 * de ses fils, ce qui rend les mesures calculables (voir `lib/sim/mesures.ts`).
 */
export function deriveNets(def: TpDefinition): Record<string, TerminalNet> {
  const parent = new Map<string, string>();
  const touch = (id: string) => { if (!parent.has(id)) parent.set(id, id); };
  for (const l of def.liaisons) {
    touch(l.a); touch(l.b);
    const ra = findRoot(parent, l.a);
    const rb = findRoot(parent, l.b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const netOfGroup = new Map<string, NetKind>();
  const source = new Set<string>();
  const motorSide = new Map<string, 'U' | 'V' | 'W'>();
  for (const l of def.liaisons) {
    const root = findRoot(parent, l.a);
    if (!netOfGroup.has(root)) netOfGroup.set(root, l.net);
    if (l.a.startsWith('RES.') || l.b.startsWith('RES.')) source.add(root);
    for (const end of [l.a, l.b]) {
      if (end === 'M.U1') motorSide.set(root, 'U');
      if (end === 'M.V1') motorSide.set(root, 'V');
      if (end === 'M.W1') motorSide.set(root, 'W');
    }
  }
  const out: Record<string, TerminalNet> = {};
  for (const id of Array.from(parent.keys())) {
    const root = findRoot(parent, id);
    const net = netOfGroup.get(root) ?? 'L1';
    const moteur = motorSide.get(root);
    if (moteur && net !== 'PE') { out[id] = { net: moteur, live: 'run' }; continue; }
    if (net === 'PE' || net === 'N') { out[id] = { net, live: 'always' }; continue; }
    if (net === 'C') { out[id] = { net: 'C', live: 'ctl' }; continue; }
    if (net === 'C0') { out[id] = { net: 'C0', live: 'always' }; continue; }
    out[id] = { net, live: source.has(root) ? 'always' : 'q1' };
  }
  return out;
}

/* -------------------------------------------------------- postes de choix */

const spec = (item: CatalogueItem): string => {
  const bits: string[] = [];
  if (item.poles) bits.push(`${item.poles} pôle${item.poles > 1 ? 's' : ''}`);
  if (item.In) bits.push(`${String(item.In).replace('.', ',')} A`);
  if (item.range) bits.push(`${String(item.range[0]).replace('.', ',')} – ${String(item.range[1]).replace('.', ',')} A`);
  if (item.coil) bits.push(`bobine ${item.coil} V`);
  if (item.modules) bits.push(`${String(item.modules).replace('.', ',')} module${item.modules > 1 ? 's' : ''}`);
  return bits.join(' · ') || item.family;
};

/**
 * Poste de choix pré-rempli à partir des caractéristiques de l'appareil :
 * la bonne référence et deux pièges justifiés (calibre, plage, tension de bobine).
 */
export function posteFor(slot: Slot, item: CatalogueItem): Poste {
  const rep = slot.rep ?? slot.id.toUpperCase();
  const good = { key: item.key, ref: item.ref, spec: spec(item), ok: true, why: 'Référence conforme au cahier des charges.' };
  const pieges: { ref: string; spec: string; why: string }[] = [];
  if (item.range) {
    const [lo, hi] = item.range;
    pieges.push({
      ref: `${item.ref} (plage basse)`,
      spec: `${String(Math.max(0.1, lo / 2.5)).replace('.', ',')} – ${String(lo).replace('.', ',')} A`,
      why: 'Plage de réglage trop basse : déclenchement dès le démarrage.',
    });
    pieges.push({
      ref: `${item.ref} (plage haute)`,
      spec: `${String(hi * 1.5).replace('.', ',')} – ${String(hi * 2.5).replace('.', ',')} A`,
      why: 'Plage trop haute : le moteur n’est plus protégé contre les surcharges.',
    });
  } else if (item.coil) {
    pieges.push({ ref: `${item.ref} · bobine 230 V`, spec: 'bobine 230 V~', why: 'Tension de bobine incompatible avec la commande du TP.' });
    pieges.push({ ref: `${item.ref} · calibre supérieur`, spec: 'même bobine, calibre très supérieur', why: 'Surdimensionné : coût, encombrement et consommation inutiles.' });
  } else if (item.In) {
    pieges.push({ ref: `${item.ref} · calibre ${Math.max(1, Math.round(item.In / 2))} A`, spec: `${Math.max(1, Math.round(item.In / 2))} A`, why: 'Calibre trop faible : déclenchements intempestifs en service normal.' });
    pieges.push({ ref: `${item.ref} · calibre ${Math.round(item.In * 2)} A`, spec: `${Math.round(item.In * 2)} A`, why: 'Calibre trop élevé : les conducteurs ne sont plus protégés.' });
  } else {
    pieges.push({ ref: `${item.ref} · variante non conforme`, spec: 'caractéristiques différentes', why: 'Ne répond pas au cahier des charges du TP.' });
    pieges.push({ ref: `${item.ref} · matériel non modulaire`, spec: 'montage hors rail DIN', why: 'Interdit en armoire : les appareils se posent sur rail DIN.' });
  }
  return {
    id: slot.id,
    name: `${rep} · ${item.name}`,
    need: `Choisir la référence de ${rep} d’après le cahier des charges.`,
    options: [
      { key: item.key, ...pieges[0], ok: false },
      good,
      { key: item.key, ...pieges[1], ok: false },
    ].map((o) => ({ key: o.key, ref: o.ref, spec: o.spec, why: o.why, ...(o.ok ? { ok: true } : {}) })),
  };
}

/* ------------------------------------------------------ contrôle de cohérence */

/** Anomalies rédigées en français ; la publication reste possible mais avertie. */
export function checkTp(def: TpDefinition, items: Record<string, CatalogueItem>): string[] {
  const anomalies: string[] = [];
  if (def.title.trim().length < 3) anomalies.push('Le titre du TP est vide ou trop court.');
  if (def.situation.trim().length < 20) anomalies.push('La situation professionnelle (énoncé) est vide ou trop courte.');
  if (def.slots.length === 0) anomalies.push('Aucun appareil n’est posé sur la platine.');
  for (const s of def.slots) {
    if (!items[s.key]) anomalies.push(`L’appareil ${s.rep ?? s.id} n’a pas été trouvé dans la bibliothèque (clé « ${s.key} »).`);
  }
  if (def.postes.length === 0) anomalies.push('Aucun poste de choix : l’élève n’aura rien à choisir à l’étape « matériel ».');
  for (const p of def.postes) {
    const ok = p.options.filter((o) => o.ok).length;
    if (ok !== 1) anomalies.push(`Le poste « ${p.name} » doit avoir exactement une bonne référence (il en a ${ok}).`);
    if (p.options.some((o) => !o.why.trim())) anomalies.push(`Le poste « ${p.name} » a une option sans justification.`);
  }
  const known = new Set(terminalsOf(def, items).map((t) => t.id));
  if (def.liaisons.length === 0) anomalies.push('Aucune liaison attendue : le câblage ne pourra pas être validé.');
  for (const l of def.liaisons) {
    for (const end of [l.a, l.b]) {
      if (!known.has(end)) anomalies.push(`La liaison ${l.a} → ${l.b} pointe vers une borne inexistante : ${end}.`);
    }
  }
  if (def.liaisons.every((l) => l.prewired) && def.liaisons.length > 0) {
    anomalies.push('Toutes les liaisons sont marquées « câblage installateur » : l’élève n’a aucun fil à tirer.');
  }
  for (const m of def.mesures) {
    for (const end of [m.a, m.b]) {
      if (end && !known.has(end)) anomalies.push(`La mesure « ${m.title} » pointe vers une borne inexistante : ${end}.`);
    }
    if (!m.wire && (!m.a || !m.b) && m.instrument !== 'tach') {
      anomalies.push(`La mesure « ${m.title} » n’indique pas ses deux bornes.`);
    }
    if (m.min > m.max) anomalies.push(`La mesure « ${m.title} » a une fourchette inversée (min > max).`);
  }
  return anomalies;
}

/** Un TP est jouable quand il n'a plus d'anomalie bloquante. */
export function isPlayable(def: TpDefinition, items: Record<string, CatalogueItem>): boolean {
  const a = checkTp(def, items);
  return a.length === 0 && def.liaisons.some((l) => !l.prewired) && def.postes.length > 0;
}

/* ------------------------------------------------------------ import / export */

/** Identifiant d'une mesure, unique dans le TP. */
export function freeMeasureId(def: TpDefinition): string {
  let n = def.mesures.length + 1;
  while (def.mesures.some((m) => m.id === `m${n}`)) n += 1;
  return `m${n}`;
}

export interface TpFile {
  format: 'simulelec-tp';
  version: 1;
  id: string;
  definition: TpDefinition;
  domains: string[];
  diplomas: string[];
}

/** Fichier d'export d'un TP. */
export function toFile(def: TpDefinition, domains: string[], diplomas: string[]): TpFile {
  return { format: 'simulelec-tp', version: 1, id: def.id, definition: def, domains, diplomas };
}

/** Mesure vierge, prête à être complétée. */
export function emptyMeasure(def: TpDefinition): ExpectedMeasure {
  return {
    id: freeMeasureId(def),
    title: 'Nouvelle mesure',
    stage: 'sousTension',
    instrument: 'mm',
    dial: 'V~',
    a: '',
    b: '',
    min: 0,
    max: 0,
    unit: 'V',
  };
}
