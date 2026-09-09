import type { CatalogueItem, TerminalDef } from '../types';
import sprites from './sprites.json';

type SpriteMeta = Record<string, { w: number; h: number; states: boolean }>;
const S = sprites as SpriteMeta;

const top3 = (ids: string[]): TerminalDef[] => ids.map((id, i) => ({ id, fx: 0.2 + i * 0.3, fy: 0.06 }));
const bot3 = (ids: string[]): TerminalDef[] => ids.map((id, i) => ({ id, fx: 0.2 + i * 0.3, fy: 0.94 }));
const one = (): TerminalDef[] => [{ id: '1', fx: 0.5, fy: 0.05 }, { id: '2', fx: 0.5, fy: 0.95 }];

function item(p: Omit<CatalogueItem, 'w' | 'h' | 'switchable'>): CatalogueItem {
  const m = S[p.key];
  return { ...p, w: m.w, h: m.h, switchable: m.states };
}

/** Appareillages disponibles (photos du pack, détourées). */
export const CATALOGUE: CatalogueItem[] = [
  // ---- Disjoncteurs modulaires ----
  item({ key: 'mcb1p', name: 'Disjoncteur 1P C2', ref: 'iC60N 1P C2', brand: 'Schneider', kind: 'mcb', family: 'Disjoncteurs', modules: 1, poles: 1, In: 2, terminals: one() }),
  item({ key: 'mcb2p', name: 'Disjoncteur 2P C16', ref: 'Genrod 1P+N C16', brand: 'Genrod', kind: 'mcb', family: 'Disjoncteurs', modules: 2, poles: 2, In: 16,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'mcb3p', name: 'Disjoncteur 3P C20', ref: 'Genrod 3P C20', brand: 'Genrod', kind: 'mcb', family: 'Disjoncteurs', modules: 3, poles: 3, In: 20, terminals: [...top3(['1', '3', '5']), ...bot3(['2', '4', '6'])] }),
  item({ key: 'mcb4p', name: 'Disjoncteur 4P C40', ref: 'Genrod 4P C40', brand: 'Genrod', kind: 'main', family: 'Disjoncteurs', modules: 4, poles: 4, In: 40,
    terminals: ['1', '3', '5', 'N'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.06 })).concat(['2', '4', '6', 'N2'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.94 }))) }),
  item({ key: 'steck2p', name: 'Disjoncteur 2P C25', ref: 'Steck SD 2P C25', brand: 'Steck', kind: 'mcb', family: 'Disjoncteurs', modules: 2, poles: 2, In: 25,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  // ---- Disjoncteurs moteur ----
  item({ key: 'motorcb', name: 'Disjoncteur moteur GV2ME08', ref: 'GV2ME08', brand: 'Schneider', kind: 'motorcb', family: 'Disjoncteurs', modules: 2.5, poles: 3, range: [2.5, 4], terminals: [...top3(['1', '3', '5']), ...bot3(['2', '4', '6'])] }),
  // ---- Différentiels ----
  item({ key: 'rcd2p', name: 'Interrupteur différentiel 2P 40 A 30 mA', ref: 'iID 2P 40A 30mA', brand: 'Schneider', kind: 'rcd', family: 'Différentiels', modules: 2, poles: 2, In: 40,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'rcd2eaton', name: 'Interrupteur différentiel 2P 25 A 30 mA', ref: 'HNC-25/2/003', brand: 'Eaton', kind: 'rcd', family: 'Différentiels', modules: 2, poles: 2, In: 25,
    terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'rcd4p', name: 'Interrupteur différentiel 4P 40 A 30 mA', ref: 'iID 4P 40A 30mA', brand: 'Schneider', kind: 'rcd', family: 'Différentiels', modules: 4, poles: 4, In: 40,
    terminals: ['1', '3', '5', 'N'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.06 })).concat(['2', '4', '6', 'N2'].map((id, i) => ({ id, fx: 0.14 + i * 0.24, fy: 0.94 }))) }),
  // ---- Industriel ----
  item({ key: 'kontakt', name: 'Contacteur LC1D09 bobine 230 V', ref: 'LC1D09P7', brand: 'Schneider', kind: 'contactor', family: 'Industriel', modules: 2.5, poles: 3, In: 9, coil: 230,
    terminals: [{ id: 'A1', fx: 0.08, fy: 0.07 }, { id: '1', fx: 0.3, fy: 0.07 }, { id: '3', fx: 0.52, fy: 0.07 }, { id: '5', fx: 0.74, fy: 0.07 }, { id: '13', fx: 0.93, fy: 0.07 },
      { id: 'A2', fx: 0.08, fy: 0.93 }, { id: '2', fx: 0.3, fy: 0.93 }, { id: '4', fx: 0.52, fy: 0.93 }, { id: '6', fx: 0.74, fy: 0.93 }, { id: '14', fx: 0.93, fy: 0.93 }] }),
  item({ key: 'therm', name: 'Relais thermique LRD08', ref: 'LRD08', brand: 'Schneider', kind: 'thermal', family: 'Industriel', modules: 2.5, poles: 3, range: [2.5, 4],
    terminals: [{ id: '1', fx: 0.3, fy: 0.08 }, { id: '3', fx: 0.52, fy: 0.08 }, { id: '5', fx: 0.74, fy: 0.08 },
      { id: '95', fx: 0.08, fy: 0.92 }, { id: '96', fx: 0.2, fy: 0.6 }, { id: '2', fx: 0.3, fy: 0.92 }, { id: '4', fx: 0.52, fy: 0.92 }, { id: '6', fx: 0.74, fy: 0.92 }, { id: '97', fx: 0.92, fy: 0.92 }, { id: '98', fx: 0.8, fy: 0.6 }] }),
  item({ key: 'timer', name: 'Horloge programmable', ref: 'IH 24h', brand: 'Schneider', kind: 'misc', family: 'Industriel', modules: 2, poles: 2, terminals: [{ id: '1', fx: 0.3, fy: 0.06 }, { id: '2', fx: 0.7, fy: 0.06 }, { id: '3', fx: 0.3, fy: 0.94 }, { id: '4', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'stopstart', name: 'Boîte à boutons arrêt NC / marche NO', ref: 'XALD213', brand: 'Schneider', kind: 'button', family: 'Industriel', modules: 0, poles: 0,
    terminals: [{ id: '13', fx: 0.1, fy: 0.34 }, { id: '14', fx: 0.9, fy: 0.34 }, { id: '21', fx: 0.1, fy: 0.69 }, { id: '22', fx: 0.9, fy: 0.69 }] }),
  // ---- Mesure ----
  item({ key: 'meter', name: 'Compteur V / A', ref: 'Sinotimer DDS', kind: 'meter', family: 'Mesure', modules: 2, poles: 2, terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  item({ key: 'volt3', name: 'Voltmètre 3 phases', ref: 'DIN 1 module', kind: 'misc', family: 'Mesure', modules: 1, poles: 1, terminals: one() }),
  item({ key: 'smart', name: 'Compteur d\'énergie WiFi', ref: 'Tuya', kind: 'misc', family: 'Mesure', modules: 3, poles: 2, terminals: [{ id: 'N', fx: 0.3, fy: 0.06 }, { id: '1', fx: 0.7, fy: 0.06 }, { id: 'N2', fx: 0.3, fy: 0.94 }, { id: '2', fx: 0.7, fy: 0.94 }] }),
  // ---- Borniers (X1 puissance, X2 commande…) ----
  item({ key: 'termred', name: 'Borne de passage phase', ref: 'UT 2,5 rouge', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] }),
  item({ key: 'termgrey', name: 'Borne de passage', ref: 'UT 2,5 grise', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] }),
  item({ key: 'termblue', name: 'Borne de passage neutre', ref: 'UT 2,5 bleue', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] }),
  item({ key: 'termyellow', name: 'Borne de passage jaune', ref: 'UT 2,5 jaune', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] }),
  item({ key: 'earth', name: 'Borne de terre', ref: 'UT 2,5-PE', brand: 'Phoenix', kind: 'terminal', family: 'Borniers', modules: 0.3, poles: 1, terminals: [{ id: 'a', fx: 0.5, fy: 0.08 }, { id: 'b', fx: 0.5, fy: 0.92 }] }),
  item({ key: 'bus4', name: 'Bornier de répartition 4 pôles', ref: 'CNC 4P', kind: 'bus', family: 'Borniers', modules: 6, poles: 2, terminals: [{ id: 'N', fx: 0.15, fy: 0.05 }, { id: 'L', fx: 0.28, fy: 0.05 }] }),
  item({ key: 'bus6', name: 'Bornier de répartition long', ref: 'CNC 4P long', kind: 'bus', family: 'Borniers', modules: 7.5, poles: 2, terminals: [{ id: 'N', fx: 0.12, fy: 0.05 }, { id: 'L', fx: 0.22, fy: 0.05 }] }),
  // ---- Voyants ----
  item({ key: 'lampG', name: 'Voyant vert 230 V', ref: 'iIL vert', kind: 'lamp', family: 'Voyants', modules: 1, poles: 1, terminals: [{ id: 'X1', fx: 0.5, fy: 0.06 }, { id: 'X2', fx: 0.5, fy: 0.94 }] }),
  item({ key: 'lampR', name: 'Voyant rouge 230 V', ref: 'iIL rouge', kind: 'lamp', family: 'Voyants', modules: 1, poles: 1, terminals: [{ id: 'X1', fx: 0.5, fy: 0.06 }, { id: 'X2', fx: 0.5, fy: 0.94 }] }),
  item({ key: 'lampY', name: 'Voyant jaune 230 V', ref: 'iIL jaune', kind: 'lamp', family: 'Voyants', modules: 1, poles: 1, terminals: [{ id: 'X1', fx: 0.5, fy: 0.06 }, { id: 'X2', fx: 0.5, fy: 0.94 }] }),
  // ---- Signalétique ----
  item({ key: 'sign', name: 'Étiquette ON / OFF', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  item({ key: 'signstop', name: 'Étiquette ON / OFF (verte)', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  item({ key: 'danger', name: 'Risque électrique', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  item({ key: 'v230', name: 'Pictogramme 230 V', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
  item({ key: 'pe', name: 'Pictogramme terre', ref: 'signalétique', kind: 'sign', family: 'Signalétique', modules: 0, poles: 0, terminals: [] }),
];

export const CATALOGUE_BY_KEY: Record<string, CatalogueItem> = Object.fromEntries(CATALOGUE.map(c => [c.key, c]));
export const FAMILIES = Array.from(new Set(CATALOGUE.map(c => c.family)));

export function spriteUrl(key: string, state?: 'on' | 'off'): string {
  const m = S[key];
  if (state && m?.states) return `/sprites/${key}-${state}.png`;
  return `/sprites/${key}.png`;
}
