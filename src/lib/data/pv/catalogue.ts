/**
 * Catalogue du TP 14 « Étude et dimensionnement d'une installation photovoltaïque autonome ».
 *
 * Valeurs reprises de la référence validée `docs/reference/illustration-pv-dimensionnement.html` :
 * localités (HSP annuelle, mois le plus défavorable, inclinaison conseillée, températures extrêmes),
 * modules, batteries, régulateurs PWM / MPPT, onduleurs, sections et courants admissibles,
 * calibres de fusibles et récepteurs proposés par défaut.
 *
 * Les HSP sont des valeurs indicatives de type PVGIS : l'étape « Localisation » interroge
 * l'API PVGIS (`/api/pvgis`) avec `lat` / `lon` et retombe sur ce tableau si l'appel échoue.
 */

/** Localité : ressource solaire et températures extrêmes du site. */
export interface PvLocality {
  id: string;
  /** Pays · région (premier niveau du sélecteur). */
  region: string;
  /** Ville (second niveau du sélecteur). */
  ville: string;
  lat: number;
  lon: number;
  /** Irradiation moyenne annuelle, en heures d'ensoleillement équivalent (h/j). */
  hsp: number;
  /** HSP du mois le plus défavorable (h/j). */
  min: number;
  /** Inclinaison conseillée (°). */
  tilt: number;
  /** Température minimale du site (°C) : correction de la Voc au froid. */
  tmin: number;
  /** Température maximale du site (°C). */
  tmax: number;
}

export const LOCALITES: PvLocality[] = [
  { id: 'cayenne', region: 'France · Guyane', ville: 'Cayenne', lat: 4.94, lon: -52.33, hsp: 4.6, min: 3.9, tilt: 10, tmin: 20, tmax: 34 },
  { id: 'kourou', region: 'France · Guyane', ville: 'Kourou', lat: 5.16, lon: -52.65, hsp: 4.7, min: 4.0, tilt: 10, tmin: 20, tmax: 34 },
  { id: 'saint-laurent', region: 'France · Guyane', ville: 'Saint-Laurent-du-Maroni', lat: 5.50, lon: -54.03, hsp: 4.5, min: 3.8, tilt: 10, tmin: 20, tmax: 35 },
  { id: 'maripasoula', region: 'France · Guyane', ville: 'Maripasoula', lat: 3.64, lon: -54.03, hsp: 4.4, min: 3.7, tilt: 10, tmin: 19, tmax: 35 },
  { id: 'fort-de-france', region: 'France · Antilles', ville: 'Fort-de-France', lat: 14.61, lon: -61.07, hsp: 5.2, min: 4.5, tilt: 15, tmin: 20, tmax: 33 },
  { id: 'pointe-a-pitre', region: 'France · Antilles', ville: 'Pointe-à-Pitre', lat: 16.24, lon: -61.53, hsp: 5.3, min: 4.6, tilt: 15, tmin: 20, tmax: 33 },
  { id: 'saint-denis', region: 'France · Océan Indien', ville: 'Saint-Denis (Réunion)', lat: -20.88, lon: 55.45, hsp: 5.0, min: 4.0, tilt: 20, tmin: 16, tmax: 31 },
  { id: 'mamoudzou', region: 'France · Océan Indien', ville: 'Mamoudzou', lat: -12.78, lon: 45.23, hsp: 5.1, min: 4.4, tilt: 15, tmin: 20, tmax: 33 },
  { id: 'lille', region: 'France · métropole', ville: 'Lille', lat: 50.63, lon: 3.06, hsp: 2.9, min: 0.9, tilt: 37, tmin: -10, tmax: 30 },
  { id: 'paris', region: 'France · métropole', ville: 'Paris', lat: 48.86, lon: 2.35, hsp: 3.2, min: 1.0, tilt: 35, tmin: -8, tmax: 32 },
  { id: 'strasbourg', region: 'France · métropole', ville: 'Strasbourg', lat: 48.57, lon: 7.75, hsp: 3.2, min: 1.0, tilt: 35, tmin: -12, tmax: 33 },
  { id: 'nantes', region: 'France · métropole', ville: 'Nantes', lat: 47.22, lon: -1.55, hsp: 3.5, min: 1.2, tilt: 35, tmin: -6, tmax: 31 },
  { id: 'lyon', region: 'France · métropole', ville: 'Lyon', lat: 45.76, lon: 4.84, hsp: 3.6, min: 1.2, tilt: 34, tmin: -8, tmax: 34 },
  { id: 'bordeaux', region: 'France · métropole', ville: 'Bordeaux', lat: 44.84, lon: -0.58, hsp: 3.7, min: 1.4, tilt: 34, tmin: -5, tmax: 34 },
  { id: 'toulouse', region: 'France · métropole', ville: 'Toulouse', lat: 43.60, lon: 1.44, hsp: 3.9, min: 1.5, tilt: 33, tmin: -5, tmax: 35 },
  { id: 'marseille', region: 'France · métropole', ville: 'Marseille', lat: 43.30, lon: 5.37, hsp: 4.6, min: 2.0, tilt: 33, tmin: -4, tmax: 34 },
  { id: 'noumea', region: 'France · Pacifique', ville: 'Nouméa', lat: -22.27, lon: 166.44, hsp: 5.0, min: 3.6, tilt: 20, tmin: 14, tmax: 31 },
  { id: 'papeete', region: 'France · Pacifique', ville: 'Papeete', lat: -17.54, lon: -149.57, hsp: 5.2, min: 4.4, tilt: 15, tmin: 20, tmax: 32 },
];

export const REGIONS: string[] = Array.from(new Set(LOCALITES.map(l => l.region)));

export const localityById = (id: string): PvLocality =>
  LOCALITES.find(l => l.id === id) ?? LOCALITES[0];

/** Localité du catalogue la plus proche d'un point (repli de l'API PVGIS). */
export function nearestLocality(lat: number, lon: number): PvLocality {
  let best = LOCALITES[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const l of LOCALITES) {
    const d = (l.lat - lat) ** 2 + (l.lon - lon) ** 2;
    if (d < bestD) { bestD = d; best = l; }
  }
  return best;
}

/** Module photovoltaïque (conditions STC). */
export interface PvPanel {
  id: string;
  name: string;
  /** Puissance crête (Wc). */
  P: number;
  Vmp: number;
  Imp: number;
  Voc: number;
  Isc: number;
  /** Coefficient de température de la Voc (%/°C, négatif). */
  k: number;
  /** Surface (m²). */
  S: number;
}

export const PANELS: PvPanel[] = [
  { id: 'p450', name: 'Module mono 450 Wc · 144 demi-cellules', P: 450, Vmp: 34, Imp: 13.24, Voc: 41, Isc: 14, k: -0.27, S: 2.1 },
  { id: 'p400', name: 'Module mono 400 Wc', P: 400, Vmp: 31.5, Imp: 12.7, Voc: 37.5, Isc: 13.5, k: -0.28, S: 1.9 },
  { id: 'p250', name: 'Module poly 250 Wc', P: 250, Vmp: 30.5, Imp: 8.2, Voc: 38, Isc: 8.8, k: -0.32, S: 1.65 },
  { id: 'p180', name: 'Module « 12 V » 180 Wc', P: 180, Vmp: 19.8, Imp: 9.1, Voc: 23.5, Isc: 9.8, k: -0.30, S: 1.0 },
];

export const panelById = (id: string): PvPanel => PANELS.find(p => p.id === id) ?? PANELS[0];

/** Batterie de stockage. */
export interface PvBattery {
  id: string;
  name: string;
  /** Tension nominale d'un élément (V). */
  U: number;
  /** Capacité nominale (Ah). */
  Ah: number;
  /** Profondeur de décharge admissible (0..1). */
  dod: number;
  /** Rendement de charge / décharge (0..1). */
  eta: number;
  /** Nombre de cycles annoncé. */
  cyc: number;
  tech: 'Plomb' | 'LiFePO₄';
  /** Courant maximal d'une branche (A) — BMS pour le lithium. */
  imax: number;
  bms: boolean;
}

export const BATTERIES: PvBattery[] = [
  { id: 'agm100', name: 'Plomb AGM 12 V · 100 Ah', U: 12, Ah: 100, dod: 0.5, eta: 0.85, cyc: 800, tech: 'Plomb', imax: 100, bms: false },
  { id: 'agm200', name: 'Plomb AGM 12 V · 200 Ah', U: 12, Ah: 200, dod: 0.5, eta: 0.85, cyc: 800, tech: 'Plomb', imax: 200, bms: false },
  { id: 'lfp100', name: 'LiFePO₄ 12,8 V · 100 Ah (BMS 100 A)', U: 12.8, Ah: 100, dod: 0.8, eta: 0.95, cyc: 4000, tech: 'LiFePO₄', imax: 100, bms: true },
  { id: 'lfp200', name: 'LiFePO₄ 12,8 V · 200 Ah (BMS 200 A)', U: 12.8, Ah: 200, dod: 0.8, eta: 0.95, cyc: 4000, tech: 'LiFePO₄', imax: 200, bms: true },
  { id: 'lfp48', name: 'LiFePO₄ 51,2 V · 100 Ah (BMS 100 A)', U: 51.2, Ah: 100, dod: 0.8, eta: 0.95, cyc: 4000, tech: 'LiFePO₄', imax: 100, bms: true },
];

export const batteryById = (id: string): PvBattery => BATTERIES.find(b => b.id === id) ?? BATTERIES[0];

/** Tensions de parc batterie proposées. */
export const UBATS = [12, 24, 48] as const;
export type Ubat = (typeof UBATS)[number];

/** Régulateur de charge PWM ou MPPT. */
export interface PvMppt {
  id: string;
  name: string;
  type: 'PWM' | 'MPPT';
  /** Tension PV maximale admissible (V, à froid). */
  vocmax: number;
  /** Calibre du courant de charge (A). */
  ich: number;
  /** Tensions de parc acceptées (V). */
  ubat: number[];
  /** Puissance PV maximale par tension de parc (W). */
  pmax: Partial<Record<Ubat, number>>;
}

export const MPPTS: PvMppt[] = [
  { id: 'pwm30', name: 'Régulateur PWM 30 A', type: 'PWM', vocmax: 50, ich: 30, ubat: [12, 24], pmax: { 12: 400, 24: 800 } },
  { id: 'm7515', name: 'MPPT 75/15', type: 'MPPT', vocmax: 75, ich: 15, ubat: [12, 24], pmax: { 12: 220, 24: 440 } },
  { id: 'm10030', name: 'MPPT 100/30', type: 'MPPT', vocmax: 100, ich: 30, ubat: [12, 24], pmax: { 12: 440, 24: 880 } },
  { id: 'm15045', name: 'MPPT 150/45', type: 'MPPT', vocmax: 150, ich: 45, ubat: [12, 24, 48], pmax: { 12: 650, 24: 1300, 48: 2600 } },
  { id: 'm15070', name: 'MPPT 150/70', type: 'MPPT', vocmax: 150, ich: 70, ubat: [12, 24, 48], pmax: { 12: 1000, 24: 2000, 48: 4000 } },
  { id: 'm25070', name: 'MPPT 250/70', type: 'MPPT', vocmax: 250, ich: 70, ubat: [12, 24, 48], pmax: { 12: 1000, 24: 2000, 48: 4000 } },
  { id: 'm250100', name: 'MPPT 250/100', type: 'MPPT', vocmax: 250, ich: 100, ubat: [12, 24, 48], pmax: { 12: 1450, 24: 2900, 48: 5800 } },
];

export const mpptById = (id: string): PvMppt => MPPTS.find(m => m.id === id) ?? MPPTS[0];

/** Onduleur autonome DC → 230 V AC. */
export interface PvInverter {
  id: string;
  name: string;
  /** Tension d'entrée (V). */
  U: number;
  /** Puissance apparente (VA). */
  S: number;
  /** Puissance active continue (W). */
  P: number;
  /** Puissance de pointe (W). */
  peak: number;
  eta: number;
}

export const INVERTERS: PvInverter[] = [
  { id: 'i12_1200', name: 'Onduleur 12 V · 1200 VA', U: 12, S: 1200, P: 1000, peak: 2200, eta: 0.90 },
  { id: 'i24_2000', name: 'Onduleur 24 V · 2000 VA', U: 24, S: 2000, P: 1600, peak: 3500, eta: 0.92 },
  { id: 'i24_3000', name: 'Onduleur 24 V · 3000 VA', U: 24, S: 3000, P: 2400, peak: 6000, eta: 0.93 },
  { id: 'i48_3000', name: 'Onduleur 48 V · 3000 VA', U: 48, S: 3000, P: 2400, peak: 6000, eta: 0.94 },
  { id: 'i48_5000', name: 'Onduleur 48 V · 5000 VA', U: 48, S: 5000, P: 4000, peak: 10000, eta: 0.95 },
];

export const inverterById = (id: string): PvInverter => INVERTERS.find(i => i.id === id) ?? INVERTERS[0];

/** Sections normalisées et courants admissibles indicatifs (cuivre, PVC, pose libre) : [mm², Iz A]. */
export const SECTIONS: [number, number][] = [
  [1.5, 18], [2.5, 25], [4, 34], [6, 44], [10, 61], [16, 82],
  [25, 108], [35, 135], [50, 168], [70, 213], [95, 258],
];

/** Courant admissible d'une section normalisée (0 si la section n'existe pas). */
export const izOf = (s: number): number => (SECTIONS.find(x => x[0] === s) ?? [0, 0])[1];

/** Calibres de fusibles normalisés (A). */
export const FUSES = [10, 15, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];

/** Calibres de disjoncteur AC proposés en sortie d'onduleur (A). */
export const AC_CALIBRES = [10, 16, 20, 25, 32];

/** Résistivité du cuivre (Ω·mm²/m). */
export const RHO_CU = 0.0175;

/** Récepteur du bilan de puissance. */
export interface PvRecepteur {
  n: string;
  /** Puissance unitaire (W). */
  P: number;
  /** Quantité. */
  q: number;
  /** Durée d'utilisation quotidienne (h/j). */
  t: number;
  /** Susceptible de fonctionner en même temps que les autres. */
  sim: boolean;
  /** Charge à courant de démarrage (moteur, compresseur…). */
  start: boolean;
}

/** Récepteurs proposés au départ du TP. */
export const RECEPTEURS_DEFAUT: PvRecepteur[] = [
  { n: 'Lampes LED', P: 10, q: 6, t: 5, sim: true, start: false },
  { n: 'Télévision', P: 100, q: 1, t: 4, sim: true, start: false },
  { n: 'Réfrigérateur', P: 120, q: 1, t: 8, sim: true, start: true },
  { n: 'Ventilateur', P: 60, q: 2, t: 6, sim: true, start: true },
  { n: 'Ordinateur', P: 80, q: 1, t: 5, sim: true, start: false },
  { n: 'Pompe', P: 750, q: 1, t: 1, sim: true, start: true },
];
