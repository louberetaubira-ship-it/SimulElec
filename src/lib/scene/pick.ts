/**
 * Visée d'une borne au pointeur.
 *
 * Chaque borne portait un halo tactile fixe de 40 px, pensé pour le doigt. Mais deux bornes
 * voisines ne sont distantes que de 18 px sur un bornier, et de 13 px sur un contacteur : les
 * halos se recouvraient, et à `z-index` égal c'était le dernier dessiné — la borne de DROITE —
 * qui captait le clic. L'élève devait viser à gauche pour atteindre la bonne borne.
 *
 * Ici, le clic se résout par DISTANCE et non par empilement : la borne la plus proche gagne,
 * dans un rayon qui s'adapte à la densité locale. Module pur, sans React ni DOM, pour être
 * testable sur les coordonnées réelles des TP.
 */
import type { Point } from './geometry';

/** Rayon de capture maximal : la cible confortable au doigt d'une borne isolée. */
export const RAYON_MAX = 20;
/** Rayon de capture minimal : deux bornes quasi confondues restent chacune atteignable. */
export const RAYON_MIN = 5;

/**
 * Rayon de capture de chaque borne : la moitié de la distance à sa plus proche voisine,
 * bornée à [RAYON_MIN, RAYON_MAX]. Deux bornes ne peuvent donc jamais se disputer un point :
 * leurs disques de capture ne se chevauchent pas.
 */
export function rayonsDeCapture(points: Point[]): number[] {
  return points.map((t, i) => {
    let min2 = Infinity;
    for (let j = 0; j < points.length; j += 1) {
      if (j === i) continue;
      const dx = points[j].x - t.x;
      const dy = points[j].y - t.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < min2) min2 = d2;
    }
    if (!Number.isFinite(min2)) return RAYON_MAX;
    return Math.max(RAYON_MIN, Math.min(RAYON_MAX, Math.sqrt(min2) / 2));
  });
}

/**
 * Index de la borne visée par le point (x, y), ou −1 si le pointeur n'est proche d'aucune
 * borne. Les coordonnées sont celles du repère logique de la platine (560 × 920).
 */
export function borneVisee(points: Point[], rayons: number[], x: number, y: number): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const d = Math.hypot(points[i].x - x, points[i].y - y);
    if (d <= rayons[i] && d < bestD) { bestD = d; best = i; }
  }
  return best;
}
