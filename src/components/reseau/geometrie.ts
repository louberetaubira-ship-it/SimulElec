/**
 * Géométrie de la scène « courant faible » (unités SVG, viewBox 1000 × 660).
 *
 * Trois blocs, comme le synoptique DTR 1 et la maquette validée : ① loge du gardien,
 * ② local courant faible (routeur, convertisseur, armoire 19" avec switch, panneau et NAS,
 * passerelle IP/KNX, automate), ③ entrée, local à vélos et armoire onduleur.
 * Chaque point de raccordement a ses coordonnées ici, et nulle part ailleurs.
 */

export const SCENE_W = 1000;
export const SCENE_H = 660;

/** Armoire 19" : origine, largeur, hauteur d'un U. */
export const RACK = { x: 440, y: 50, w: 290, u: 30 };
/** Haut du U `n` (1 = en haut). */
export const uY = (n: number) => RACK.y + (n - 1) * RACK.u;

/** Abscisse du port `k` (1 à 12, ou 13 à 24 sur la rangée du bas) d'un équipement 1 U. */
export const portX = (k: number) => RACK.x + 44 + (((k - 1) % 12) * 19);
/** Ordonnée d'un port dans le U `n` : rangée du haut (1-12) ou du bas (13-24). */
export const portY = (n: number, k: number) => uY(n) + (k <= 12 ? 9 : 21);

/** U du switch et du panneau (position du corrigé D.2.1). */
export const U_SWITCH = 4;
export const U_PANNEAU = 6;
export const U_PDU = 2;

export interface PointScene { x: number; y: number; label: string }

/** Points de raccordement. */
export const TERMINAUX: Record<string, PointScene> = (() => {
  const t: Record<string, PointScene> = {
    // ① loge
    'PC.RJ': { x: 120, y: 138, label: 'PC · RJ45' },
    'CVL.RJ': { x: 90, y: 214, label: 'Convertisseur loge · RJ45' },
    'CVL.FO': { x: 210, y: 244, label: 'Convertisseur loge · fibre SC' },
    // ② local courant faible
    'FAI.RJ': { x: 335, y: 26, label: 'Box opérateur' },
    'RTR.WAN': { x: 335, y: 58, label: 'Routeur · WAN' },
    'RTR.LAN': { x: 410, y: 86, label: 'Routeur · LAN' },
    'CVA.FO': { x: 260, y: 300, label: 'Convertisseur armoire · fibre SC' },
    'CVA.RJ': { x: 410, y: 300, label: 'Convertisseur armoire · RJ45' },
    'NAS.RJ': { x: 672, y: 330, label: 'NAS · RJ45' },
    'GW.RJ': { x: 800, y: 92, label: 'Passerelle IP/KNX · prise RJ45' },
    'API.RJ': { x: 800, y: 202, label: 'Automate M221 · prise RJ45' },
    // ③ entrée, local à vélos, armoire onduleur
    'CAM1.RJ': { x: 120, y: 500, label: 'Caméra 1 · prise RJ45' },
    'CAM2.RJ': { x: 335, y: 500, label: 'Caméra 2 · prise RJ45' },
    'CAM3.RJ': { x: 485, y: 500, label: 'Caméra 3 · prise RJ45' },
    'CAM4.RJ': { x: 635, y: 500, label: 'Caméra 4 · prise RJ45' },
    'IMEON.RJ': { x: 865, y: 490, label: 'Onduleur IMEON · prise RJ45' },
    // PDU (VAT de consignation) : arrivée 230 V, prise 1 (switch), prise 2 (NAS)
    'q1.L': { x: RACK.x + 22, y: uY(U_PDU) + 11, label: 'PDU · arrivée L' },
    'q1.N': { x: RACK.x + 22, y: uY(U_PDU) + 22, label: 'PDU · arrivée N' },
    'q1.1L': { x: RACK.x + 150, y: uY(U_PDU) + 11, label: 'PDU · prise 1 (switch) L' },
    'q1.1N': { x: RACK.x + 150, y: uY(U_PDU) + 22, label: 'PDU · prise 1 (switch) N' },
    'q1.2L': { x: RACK.x + 172, y: uY(U_PDU) + 11, label: 'PDU · prise 2 (NAS) L' },
    'q1.2N': { x: RACK.x + 172, y: uY(U_PDU) + 22, label: 'PDU · prise 2 (NAS) N' },
  };
  for (let k = 1; k <= 24; k += 1) {
    t[`SW.${k}`] = { x: portX(k), y: portY(U_SWITCH, k), label: `Switch · port ${k}` };
    t[`PP.${k}`] = { x: portX(k), y: portY(U_PANNEAU, k), label: `Panneau · port ${k} (face avant)` };
  }
  // arrière du panneau : les 8 connecteurs raccordés, en colonne à droite de l'armoire
  for (let k = 1; k <= 8; k += 1) {
    t[`PPR.${k}`] = { x: 762, y: 222 + (k - 1) * 22, label: `Panneau · connecteur ${k} (arrière)` };
  }
  return t;
})();

/** Libellé lisible d'une borne de la scène. */
export const libelleBorne = (id: string): string => TERMINAUX[id]?.label ?? id;
