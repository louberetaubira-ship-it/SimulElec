import type { CatalogueItem, Slot, TpDefinition } from '../types';
import { CATALOGUE_BY_KEY } from '../data/catalogue';
import { EXTERNAL_POINTS, PANEL_H, PANEL_W } from '../data/tp-demarrage-direct';

export { PANEL_W, PANEL_H };

/** Hauteur d'un rail DIN (unités logiques) — le centre du rail est à `rail + 14`. */
export const RAIL_H = 28;
export const RAIL_X = 14;
/** Limite droite de l'armoire : au-delà, on est hors armoire (moteur, porte). */
export const CABINET_RIGHT = 380;
export const RAIL_W = CABINET_RIGHT - RAIL_X;

export interface Point { x: number; y: number }

export interface SlotBox extends Point {
  slot: Slot;
  item: CatalogueItem;
  w: number;
  h: number;
}

/** La boîte à boutons porte deux appareils logiques : S1 (arrêt, bas) et S2 (marche, haut). */
export const BUTTON_SLOT_ID = 'box';
const BUTTON_ALIASES = ['S1', 'S2'];

export function catalogueFor(slot: Slot): CatalogueItem {
  const item = CATALOGUE_BY_KEY[slot.key];
  if (!item) throw new Error(`Catalogue : clé inconnue « ${slot.key} » pour l'emplacement ${slot.id}`);
  return item;
}

/** Position (coin haut-gauche) et taille d'un emplacement, dans le repère logique de la platine. */
export function slotBox(tp: TpDefinition, slot: Slot): SlotBox {
  const item = catalogueFor(slot);
  const y = slot.rail === null
    ? (slot.y ?? 0)
    : tp.rails[slot.rail] + RAIL_H / 2 - item.h / 2;
  return { slot, item, x: slot.x, y, w: item.w, h: item.h };
}

export function slotBoxes(tp: TpDefinition): SlotBox[] {
  return tp.slots.map(s => slotBox(tp, s));
}

export function slotBoxMap(tp: TpDefinition): Record<string, SlotBox> {
  return Object.fromEntries(slotBoxes(tp).map(b => [b.slot.id, b]));
}

/** Décompose « q1.1 », « RES.L1 », « S2.13 » en [préfixe, borne]. */
export function splitTerminal(id: string): [string, string] {
  const i = id.indexOf('.');
  return i < 0 ? [id, ''] : [id.slice(0, i), id.slice(i + 1)];
}

/** Emplacement réellement porteur d'une borne (S1/S2 vivent sur la boîte à boutons). */
export function slotIdOfTerminal(terminalId: string): string | null {
  const [prefix] = splitTerminal(terminalId);
  if (prefix === 'RES' || prefix === 'M') return null;
  if (BUTTON_ALIASES.includes(prefix)) return BUTTON_SLOT_ID;
  return prefix;
}

/**
 * Position d'une borne : « slot.term », « RES.x » (arrivée réseau) ou « M.x » (moteur).
 * Renvoie null si l'emplacement ou la borne n'existent pas.
 */
export function terminalPos(tp: TpDefinition, id: string): Point | null {
  const ext = EXTERNAL_POINTS[id];
  if (ext) return { x: ext.x, y: ext.y };
  const [, termId] = splitTerminal(id);
  const slotId = slotIdOfTerminal(id);
  if (!slotId) return null;
  const slot = tp.slots.find(s => s.id === slotId);
  if (!slot) return null;
  const box = slotBox(tp, slot);
  const t = box.item.terminals.find(t2 => t2.id === termId);
  if (!t) return null;
  return { x: box.x + box.w * t.fx, y: box.y + box.h * t.fy };
}

/** Toutes les bornes utilisées par le TP (celles qui apparaissent dans le tableau de câblage). */
export function terminalIds(tp: TpDefinition): string[] {
  const set = new Set<string>();
  for (const l of tp.liaisons) { set.add(l.a); set.add(l.b); }
  return Array.from(set);
}

/** Étiquette lisible d'une borne : « X1:1 L1 · a ». */
export function terminalLabel(tp: TpDefinition, id: string): string {
  const ext = EXTERNAL_POINTS[id];
  if (ext) return ext.label;
  const [prefix, term] = splitTerminal(id);
  const slotId = slotIdOfTerminal(id);
  const slot = tp.slots.find(s => s.id === slotId);
  const head = BUTTON_ALIASES.includes(prefix) ? prefix : (slot?.label.split(' · ')[0] ?? prefix);
  return `${head} : ${term}`;
}

/** Courbe de Bézier d'un fil entre deux points. */
export function wirePath(a: Point, b: Point): string {
  const dy = Math.abs(b.y - a.y);
  const dx = b.x - a.x;
  if (dy < 30) return `M${a.x} ${a.y} C ${a.x} ${a.y - 36}, ${b.x} ${b.y - 36}, ${b.x} ${b.y}`;
  const k = Math.min(60, dy * 0.5);
  return `M${a.x} ${a.y} C ${a.x} ${a.y + k}, ${b.x - dx * 0.15} ${b.y - k}, ${b.x} ${b.y}`;
}

/** Clé d'une liaison, indépendante de l'ordre des bornes. */
export const linkKey = (a: string, b: string): string => [a, b].sort().join('~');
