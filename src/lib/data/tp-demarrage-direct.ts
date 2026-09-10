/**
 * Compatibilité : ce module a été remplacé par `src/lib/data/tps/`.
 * Il ne fait plus que ré-exporter le TP « démarrage direct », la liste des TP
 * et les dimensions logiques de la platine (désormais 560 × 720, voir `lib/scene/geometry`).
 */
export { TP_DEMARRAGE_DIRECT } from './tps/demarrage-direct';
export { TPS, TP_BY_ID, tpById } from './tps';
export { PANEL_W, PANEL_H } from '../scene/geometry';

/**
 * @deprecated Points extérieurs de la v2 (moteur, réseau) — utiliser `RES`, `MTERM`, `MT2`
 * de `lib/scene/geometry` et `externalPoints()` de `lib/scene/route`.
 * Conservé tant que `lib/sim/layout.ts` (moteur v2) n'est pas porté.
 */
export const EXTERNAL_POINTS: Record<string, { x: number; y: number; label: string }> = {
  'RES.L1': { x: 70, y: 704, label: 'L1' },
  'RES.L2': { x: 98, y: 704, label: 'L2' },
  'RES.L3': { x: 126, y: 704, label: 'L3' },
  'RES.N': { x: 154, y: 704, label: 'N' },
  'RES.PE': { x: 182, y: 704, label: 'PE' },
  'M.U1': { x: 466, y: 666, label: 'U1' },
  'M.V1': { x: 494, y: 666, label: 'V1' },
  'M.W1': { x: 522, y: 666, label: 'W1' },
  'M.PE': { x: 450, y: 690, label: 'PE' },
};
