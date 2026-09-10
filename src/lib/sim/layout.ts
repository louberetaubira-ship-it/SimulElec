/**
 * Helpers de repérage des bornes, au-dessus de `src/lib/scene/*`.
 * Aucune géométrie n'est recalculée ici : `slotGeom` / `tpos` font foi.
 */
import type { CatalogueItem, TpDefinition } from '../types';
import { PANEL_H, PANEL_W, slotGeom, type Box, type Point } from '../scene/geometry';
import { sceneContext, tpos } from '../scene/route';

export { PANEL_W, PANEL_H };
export type { Point };

/** Décompose « q1.1 », « RES.L1 », « S2.13 » en [préfixe, borne]. */
export function splitTerminal(id: string): [string, string] {
  const i = id.indexOf('.');
  return i < 0 ? [id, ''] : [id.slice(0, i), id.slice(i + 1)];
}

/** Préfixes qui ne désignent pas un appareil posé sur la platine. */
const STATION_PREFIXES = ['S1', 'S2', 'H1', 'H2'];

/**
 * Emplacement porteur d'une borne :
 * `null` pour le réseau (RES) et le moteur (M), `'station'` pour le coffret de porte.
 */
export function slotIdOfTerminal(terminalId: string): string | null {
  const [prefix] = splitTerminal(terminalId);
  if (prefix === 'RES') return null;
  if (prefix === 'M') return 'moteur';
  if (STATION_PREFIXES.includes(prefix)) return 'station';
  return prefix;
}

/** Clé d'une liaison, indépendante de l'ordre des bornes. */
export const linkKey = (a: string, b: string): string => [a, b].sort().join('~');

/** Position d'une borne dans le repère logique 560 × 720 (null si inconnue). */
export function terminalPos(
  tp: TpDefinition,
  items: Record<string, CatalogueItem>,
  id: string,
): Point | null {
  const p = tpos(sceneContext(tp, items), id);
  return p ? { x: p.x, y: p.y } : null;
}

/** Boîte d'un appareil posé (rail ou annexe). */
export function slotBox(tp: TpDefinition, slotId: string, items: Record<string, CatalogueItem>): Box | null {
  const slot = tp.slots.find((s) => s.id === slotId);
  if (!slot) return null;
  const item = items[slot.key];
  if (!item) return null;
  return slotGeom(tp, slot, item);
}

/** Étiquette lisible d'une borne : « X1:5 · a », « KM1 : A1 », « M : U1 ». */
export function terminalLabel(tp: TpDefinition, id: string): string {
  const [prefix, term] = splitTerminal(id);
  if (prefix === 'RES') return `Réseau ${term}`;
  if (prefix === 'M') return `Moteur ${term}`;
  if (STATION_PREFIXES.includes(prefix)) return `${prefix} : ${term}`;
  const slot = tp.slots.find((s) => s.id === prefix);
  if (!slot) return id.replace('.', ' : ');
  const head = slot.group ? `${slot.group}:${slot.mark ?? ''}` : (slot.rep ?? slot.label.split(' · ')[0]);
  return `${head} · ${term}`;
}

/** Toutes les bornes citées par le tableau de câblage du TP. */
export function terminalIds(tp: TpDefinition): string[] {
  const set = new Set<string>();
  for (const l of tp.liaisons) { set.add(l.a); set.add(l.b); }
  return Array.from(set);
}
