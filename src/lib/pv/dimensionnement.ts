/**
 * Moteur pur du TP 14 « Étude et dimensionnement d'une installation photovoltaïque autonome ».
 *
 * Port TypeScript de la logique JS de la référence validée
 * `docs/reference/illustration-pv-dimensionnement.html` : `calc`, `checks`, `stepOk`, `report`,
 * plus le schéma unifilaire (`unifilaire`) et l'évaluation par compétences.
 *
 * Aucun React ici : le module est testable et réutilisable côté serveur.
 */

import {
  batteryById, FUSES, inverterById, izOf, localityById, mpptById, panelById, RECEPTEURS_DEFAUT,
  RHO_CU, type PvBattery, type PvInverter, type PvLocality, type PvMppt, type PvPanel,
  type PvRecepteur, type Ubat,
} from '../data/pv/catalogue';
import {
  evaluate, PV_STAGE_DOMAINS, type CompetenceEval, type DiplomaId,
} from '../data/competences';
import type { CoursId } from '../data/cours';

// ------------------------------------------------------------------ format

/** Nombre à la française : « 1 234,5 ». */
export const fr = (x: number, d = 1): string =>
  Number.isFinite(x)
    ? x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

// ------------------------------------------------------------------ étapes

export interface PvStepDef { title: string; sub: string }

/** Les 11 étapes du parcours de dimensionnement. */
export const PV_STEPS: PvStepDef[] = [
  { title: 'Bilan de puissance', sub: 'récepteurs, E = P × t, Wh/j' },
  { title: 'Puissance simultanée', sub: 'charges en même temps, démarrages' },
  { title: 'Localisation · ressource solaire', sub: 'pays → région → ville, HSP' },
  { title: 'Tension du système', sub: '12 / 24 / 48 V, I = P / U' },
  { title: 'Panneaux et couplage', sub: 'fiche technique, série / parallèle' },
  { title: 'Batteries', sub: 'capacité, technologie, couplage' },
  { title: 'Régulateur MPPT', sub: 'Voc corrigé, courant, puissance' },
  { title: 'Onduleur', sub: 'puissance simultanée, pointe' },
  { title: 'Câbles', sub: 'courant, chute de tension, section' },
  { title: 'Protections', sub: 'fusibles, disjoncteurs, DC ≠ AC' },
  { title: 'Note de calcul', sub: 'synthèse, schéma unifilaire' },
];

export const PV_STEP_LABELS = PV_STEPS.map(s => s.title);

/** Libellés courts pour le stepper mobile. */
export const PV_STEP_SHORT = [
  'Bilan', 'P. simultanée', 'Site', 'Tension', 'Panneaux', 'Batteries',
  'Régulateur', 'Onduleur', 'Câbles', 'Protections', 'Note de calcul',
];

export const PV_STEP_COUNT = PV_STEPS.length;

/** Chaîne énergétique affichée en tête (bloc, sous-titre, étape qui le valide). */
export interface PvChainBlock { title: string; sub: string; step: number }

export const PV_CHAIN: PvChainBlock[] = [
  { title: 'PV', sub: 'champ', step: 4 },
  { title: 'Coffret DC', sub: 'fusibles · parafoudre · sectionneur', step: 9 },
  { title: 'MPPT', sub: 'régulateur', step: 6 },
  { title: 'Batteries', sub: 'parc', step: 5 },
  { title: 'Prot. DC', sub: 'fusible principal', step: 9 },
  { title: 'Onduleur', sub: 'DC → AC', step: 7 },
  { title: 'Prot. AC', sub: 'disj. · DDR', step: 9 },
  { title: 'Récepteurs', sub: 'tableau', step: 0 },
];

/** Fiches de rappel proposées à chaque étape du dimensionnement. */
export const PV_STAGE_COURS: CoursId[][] = [
  ['energie', 'loi-ohm-puissance'],                    // 0 bilan de puissance
  ['loi-ohm-puissance', 'energie'],                    // 1 puissance simultanée
  ['energie', 'pv-tension-systeme'],                   // 2 ressource solaire
  ['pv-tension-systeme', 'loi-ohm-puissance'],         // 3 tension du système
  ['serie-parallele', 'pv-voc-temperature'],           // 4 panneaux et couplage
  ['pv-batterie', 'serie-parallele'],                  // 5 batteries
  ['pv-voc-temperature', 'pv-tension-systeme'],        // 6 régulateur
  ['dc-ac', 'loi-ohm-puissance'],                      // 7 onduleur
  ['chute-tension', 'serie-parallele'],                // 8 câbles
  ['calibre-protection', 'dc-ac'],                     // 9 protections
  ['energie', 'calibre-protection'],                   // 10 note de calcul
];

export const coursForPvStep = (step: number): CoursId[] => PV_STAGE_COURS[step] ?? [];

// ------------------------------------------------------------------ état

/** Questions posées à l'élève, étape par étape. */
export type PvAnswerKey = 'ej' | 'ps' | 'ppv' | 'i' | 'vmp' | 'imp' | 'cb' | 'ich' | 'pinv' | 'iinv';

/** Étape à laquelle chaque réponse est demandée (ouverture automatique de l'aide). */
export const ANSWER_STEP: Record<PvAnswerKey, number> = {
  ej: 0, ps: 1, ppv: 2, i: 3, vmp: 4, imp: 4, cb: 5, ich: 6, pinv: 7, iinv: 8,
};

export interface PvCables {
  /** Longueurs aller (m). */
  Lpv: number; Lbat: number; Lond: number;
  /** Chutes de tension maximales admises (fraction). */
  dupv: number; dubat: number;
  /** Sections retenues (mm²). */
  Spv: number; Sbat: number; Sond: number;
}

export interface PvProtections {
  /** Calibre des fusibles de string gPV (A). */
  fpv: number;
  /** Calibre du fusible principal batterie (A). */
  fbat: number;
  /** Calibre du disjoncteur AC en sortie d'onduleur (A). */
  qac: number;
  /** DDR 30 mA prévu côté AC. */
  ddr: boolean;
  /** Parafoudre DC prévu. */
  dcspd: boolean;
}

/** Ressource solaire mesurée (PVGIS) ou indicative (table locale). */
export interface PvSolar {
  source: 'pvgis' | 'table';
  /** HSP moyenne annuelle (h/j). */
  hsp: number;
  /** HSP du mois le plus défavorable (h/j). */
  min: number;
  /** Production mensuelle par kWc : E_m (kWh/mois) et E_d (kWh/j). */
  monthly: { month: number; em: number; ed: number; hsp: number }[];
  /** Pertes système déclarées à PVGIS (%). */
  loss: number;
}

/** État complet du dimensionnement, persisté dans `attempts.state`. */
export interface PvState {
  /** Étape en cours (0..10). */
  step: number;
  done: Record<number, boolean>;
  recv: PvRecepteur[];
  ans: Partial<Record<PvAnswerKey, number | null>>;
  locId: string;
  /** Rendement global retenu (0..1). */
  eta: number;
  /** Dimensionner sur le mois le plus défavorable (sinon la moyenne annuelle). */
  worst: boolean;
  ubat: Ubat;
  panelId: string;
  ns: number;
  np: number;
  batId: string;
  bns: number;
  bnp: number;
  /** Autonomie souhaitée (jours). */
  auto: number;
  mpptId: string;
  invId: string;
  cab: PvCables;
  prot: PvProtections;
  /** Ressource solaire réelle pour la localité en cours (null = table locale). */
  solar: PvSolar | null;
  /** Tentatives de validation refusées, par étape (pèse sur l'évaluation). */
  badTries: Record<number, number>;
  /** Ouvertures de l'aide « rappel de cours », par étape. */
  helpUsed: Record<number, number>;
  /** Réponses fausses par question (aide automatique après deux erreurs). */
  wrongAns: Partial<Record<PvAnswerKey, number>>;
}

export function initialPvState(): PvState {
  return {
    step: 0,
    done: {},
    recv: RECEPTEURS_DEFAUT.map(r => ({ ...r })),
    ans: {},
    locId: 'cayenne',
    eta: 0.75,
    worst: true,
    ubat: 48,
    panelId: 'p450',
    ns: 3,
    np: 2,
    batId: 'lfp48',
    bns: 1,
    bnp: 2,
    auto: 2,
    mpptId: 'm25070',
    invId: 'i48_3000',
    cab: { Lpv: 15, Lbat: 2, Lond: 2, dupv: 0.03, dubat: 0.02, Spv: 6, Sbat: 35, Sond: 35 },
    prot: { fpv: 20, fbat: 100, qac: 16, ddr: true, dcspd: true },
    solar: null,
    badTries: {},
    helpUsed: {},
    wrongAns: {},
  };
}

/** Complète un état restauré d'une tentative plus ancienne. */
export function normalizePvState(raw: Partial<PvState> | null | undefined): PvState {
  const base = initialPvState();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    recv: Array.isArray(raw.recv) && raw.recv.length ? raw.recv.map(r => ({ ...r })) : base.recv,
    done: raw.done ?? base.done,
    ans: raw.ans ?? base.ans,
    cab: { ...base.cab, ...(raw.cab ?? {}) },
    prot: { ...base.prot, ...(raw.prot ?? {}) },
    badTries: raw.badTries ?? base.badTries,
    helpUsed: raw.helpUsed ?? base.helpUsed,
    wrongAns: raw.wrongAns ?? base.wrongAns,
    solar: raw.solar ?? null,
  };
}

/** Matériels sélectionnés (résolution des identifiants). */
export interface PvPicks {
  loc: PvLocality;
  panel: PvPanel;
  bat: PvBattery;
  mppt: PvMppt;
  inv: PvInverter;
}

export const picksOf = (s: PvState): PvPicks => ({
  loc: localityById(s.locId),
  panel: panelById(s.panelId),
  bat: batteryById(s.batId),
  mppt: mpptById(s.mpptId),
  inv: inverterById(s.invId),
});

// ------------------------------------------------------------------ calculs

export interface PvCalc {
  /** Énergie journalière (Wh/j). */
  Ejour: number;
  /** Puissance simultanée (W). */
  Psim: number;
  /** Pointe estimée au démarrage (W). */
  Pstart: number;
  /** HSP retenue (h/j). */
  hsp: number;
  /** Puissance PV nécessaire (Wc). */
  Ppv: number;
  /** Puissance PV réellement installée (Wc). */
  PpvReal: number;
  Vmp: number;
  Imp: number;
  Voc: number;
  Isc: number;
  /** Voc du champ corrigée à la température minimale du site (V). */
  VocCold: number;
  /** Nombre de modules minimum. */
  Npan: number;
  /** Capacité de parc nécessaire (Wh puis Ah). */
  Cbat: number;
  Cah: number;
  /** Parc installé : tension (V), capacité (Ah), énergie (Wh). */
  Ubat: number;
  Ah: number;
  Ewh: number;
  /** Courant de charge PV → batterie (A). */
  Ich: number;
  /** Courant onduleur → batterie (A). */
  Iinv: number;
  /** Courant PV de dimensionnement (1,25 × Isc, A). */
  Ipvmax: number;
  /** Sections minimales imposées par la chute de tension (mm²). */
  Spv: number;
  Sbat: number;
  Sond: number;
  /** Courant côté 230 V AC (A). */
  Iac: number;
}

export function calc(s: PvState): PvCalc {
  const { loc, panel, bat, inv } = picksOf(s);
  const r = s.recv;
  const Ejour = r.reduce((a, x) => a + x.P * x.q * x.t, 0);
  const Psim = r.filter(x => x.sim).reduce((a, x) => a + x.P * x.q, 0);
  const Pstart =
    r.filter(x => x.sim && x.start).reduce((a, x) => a + x.P * x.q * 2, 0) +
    r.filter(x => x.sim && !x.start).reduce((a, x) => a + x.P * x.q, 0);

  const hspYear = s.solar?.hsp ?? loc.hsp;
  const hspMin = s.solar?.min ?? loc.min;
  const hsp = s.worst ? hspMin : hspYear;
  const Ppv = Ejour / (hsp * s.eta);

  const PpvReal = panel.P * s.ns * s.np;
  const Vmp = panel.Vmp * s.ns;
  const Imp = panel.Imp * s.np;
  const Voc = panel.Voc * s.ns;
  const Isc = panel.Isc * s.np;
  const VocCold = Voc * (1 + (panel.k / 100) * (loc.tmin - 25));
  const Npan = Math.ceil(Ppv / panel.P);

  const Cbat = (Ejour * s.auto) / (bat.dod * bat.eta);
  const Cah = Cbat / s.ubat;
  const Ubat = bat.U * s.bns;
  const Ah = bat.Ah * s.bnp;
  const Ewh = Ubat * Ah;

  const Ich = PpvReal / s.ubat;
  const Iinv = inv.P / (s.ubat * inv.eta);
  const Ipvmax = Isc * 1.25;

  const Spv = (2 * RHO_CU * s.cab.Lpv * Imp) / (s.cab.dupv * Vmp);
  const Sbat = (2 * RHO_CU * s.cab.Lbat * Iinv) / (s.cab.dubat * s.ubat);

  return {
    Ejour, Psim, Pstart, hsp, Ppv, PpvReal, Vmp, Imp, Voc, Isc, VocCold, Npan,
    Cbat, Cah, Ubat, Ah, Ewh, Ich, Iinv, Ipvmax, Spv, Sbat, Sond: Sbat,
    Iac: inv.P / 230,
  };
}

/** HSP annuelle et du mois le plus défavorable réellement utilisées. */
export function solarOf(s: PvState): { hsp: number; min: number; source: 'pvgis' | 'table' } {
  const loc = localityById(s.locId);
  if (s.solar) return { hsp: s.solar.hsp, min: s.solar.min, source: s.solar.source };
  return { hsp: loc.hsp, min: loc.min, source: 'table' };
}

// ------------------------------------------------------------------ contrôles

export type PvMsgKind = 'bad' | 'warn' | 'ok';

export interface PvMessage {
  kind: PvMsgKind;
  title: string;
  detail: string;
}

/** Tolérance de comparaison d'une réponse d'élève (3 % par défaut, minimum 1 unité). */
export const near = (v: number | null | undefined, ref: number, tol = 0.03): boolean =>
  v != null && Math.abs(v - ref) <= Math.max(tol * ref, 1);

/** Valeur attendue et tolérance de chaque question posée à l'élève. */
export function expectedAnswer(s: PvState, key: PvAnswerKey): { value: number; tol: number } {
  const C = calc(s);
  switch (key) {
    case 'ej': return { value: C.Ejour, tol: 0.03 };
    case 'ps': return { value: C.Psim, tol: 0.03 };
    case 'ppv': return { value: C.Ppv, tol: 0.05 };
    case 'i': return { value: C.Psim / s.ubat, tol: 0.05 };
    case 'vmp': return { value: C.Vmp, tol: 0.02 };
    case 'imp': return { value: C.Imp, tol: 0.02 };
    case 'cb': return { value: C.Cah, tol: 0.05 };
    case 'ich': return { value: C.Ich, tol: 0.05 };
    case 'pinv': return { value: C.Psim * 1.25, tol: 0.05 };
    case 'iinv': return { value: C.Iinv, tol: 0.05 };
  }
}

/** La réponse saisie par l'élève est-elle dans la tolérance ? */
export function answerOk(s: PvState, key: PvAnswerKey): boolean {
  const { value, tol } = expectedAnswer(s, key);
  return near(s.ans[key], value, tol);
}

/**
 * Contrôles d'une étape : messages bloquants (rouge), points de vigilance (orange)
 * et validations (vert). Port fidèle de `checks(step)` de la référence.
 */
export function checks(s: PvState, step: number): PvMessage[] {
  const C = calc(s);
  const { loc, panel, bat, mppt, inv } = picksOf(s);
  const E: PvMessage[] = [];
  const bad = (title: string, detail: string) => E.push({ kind: 'bad', title, detail });
  const warn = (title: string, detail: string) => E.push({ kind: 'warn', title, detail });
  const ok = (title: string, detail: string) => E.push({ kind: 'ok', title, detail });
  const a = s.ans;

  if (step === 0) {
    if (s.recv.length < 3) bad('Bilan incomplet', 'Renseigne au moins trois récepteurs.');
    if (near(a.ej, C.Ejour)) {
      ok('Énergie journalière correcte', `Ejour = Σ(P × n × t) = ${fr(C.Ejour, 0)} Wh/j = ${fr(C.Ejour / 1000, 2)} kWh/j`);
    } else {
      bad('Calcule Ejour', 'Somme des P × quantité × durée, en Wh/j (tolérance 3 %).');
    }
  }

  if (step === 1) {
    if (near(a.ps, C.Psim)) {
      ok('Puissance simultanée correcte', `Σ des puissances des récepteurs cochés = ${fr(C.Psim, 0)} W`);
    } else {
      bad('Calcule la puissance simultanée', 'Additionne les puissances des récepteurs susceptibles de fonctionner en même temps (cochés).');
    }
    if (s.recv.some(x => x.sim && x.start)) {
      warn('Charges à courant de démarrage', `Pompe, réfrigérateur, ventilateurs… : pointe estimée ≈ ${fr(C.Pstart, 0)} W (×2 sur les moteurs). À vérifier avec la puissance de pointe de l'onduleur.`);
    }
  }

  if (step === 2) {
    const sol = solarOf(s);
    const src = sol.source === 'pvgis'
      ? 'Données PVGIS (Commission européenne) pour ce point.'
      : 'Valeurs indicatives de la table locale (PVGIS injoignable).';
    ok('Ressource solaire', `${loc.ville} : ${fr(sol.hsp, 1)} h/j en moyenne annuelle, ${fr(sol.min, 1)} h/j au mois le plus défavorable, inclinaison conseillée ${loc.tilt}°. ${src}`);
    if (near(a.ppv, C.Ppv, 0.05)) {
      ok('Puissance PV nécessaire correcte', `Ppv = Ejour / (HSP × η) = ${fr(C.Ejour, 0)} / (${fr(C.hsp, 1)} × ${s.eta}) = ${fr(C.Ppv, 0)} Wc`);
    } else {
      bad('Calcule Ppv', `Ppv ≈ Ejour / (HSP × ηglobal), avec HSP du mois retenu et η = ${s.eta} (tolérance 5 %).`);
    }
  }

  if (step === 3) {
    const I = C.Psim / s.ubat;
    if (near(a.i, I, 0.05)) {
      ok('Courant batterie correct', `I = P / U = ${fr(C.Psim, 0)} / ${s.ubat} = ${fr(I, 1)} A`);
    } else {
      bad('Calcule le courant côté batterie', 'I = Psimultanée / Ubat (tolérance 5 %).');
    }
    const rec = C.Psim < 800 ? 12 : C.Psim < 2000 ? 24 : 48;
    if (s.ubat < rec) {
      warn('Tension basse pour cette puissance', `${fr(C.Psim, 0)} W en ${s.ubat} V → ${fr(C.Psim / s.ubat, 0)} A : câbles et protections lourds. Règle indicative : ${rec} V.`);
    } else {
      ok('Tension cohérente', `${s.ubat} V pour ${fr(C.Psim, 0)} W simultanés → ${fr(C.Psim / s.ubat, 0)} A.`);
    }
  }

  if (step === 4) {
    ok('Champ PV', `${s.ns}S${s.np}P · ${s.ns * s.np} × ${panel.P} Wc = ${fr(C.PpvReal, 0)} Wc · Vmp ${fr(C.Vmp, 1)} V · Imp ${fr(C.Imp, 1)} A · Voc ${fr(C.Voc, 1)} V · Isc ${fr(C.Isc, 1)} A`);
    if (C.PpvReal < C.Ppv * 0.95) {
      bad('Puissance PV insuffisante', `${fr(C.PpvReal, 0)} Wc installés pour ${fr(C.Ppv, 0)} Wc nécessaires. Ajoute des modules (série ou parallèle).`);
    }
    if (C.PpvReal > C.Ppv * 1.6) {
      warn('Champ très surdimensionné', `${fr(C.PpvReal, 0)} Wc pour ${fr(C.Ppv, 0)} Wc nécessaires : coût et MPPT à revoir.`);
    }
    if (C.VocCold > mppt.vocmax) {
      bad('Tension PV excessive', `Voc corrigée à ${loc.tmin} °C : ${fr(C.VocCold, 0)} V > ${mppt.vocmax} V admissibles par le ${mppt.name}. Réduis le nombre de modules en série ou change de régulateur.`);
    }
    if (C.Vmp < s.ubat * 1.2 && mppt.type === 'MPPT') {
      bad('Vmp trop basse pour charger', `Vmp champ ${fr(C.Vmp, 0)} V < Ubat + 20 % (${fr(s.ubat * 1.2, 0)} V) : le MPPT ne pourra pas charger le parc. Mets plus de modules en série.`);
    }
    if (near(a.vmp, C.Vmp, 0.02) && near(a.imp, C.Imp, 0.02)) {
      ok('Vmp et Imp du champ corrects', 'Série : les tensions s\'additionnent. Parallèle : les courants s\'additionnent.');
    } else {
      bad('Calcule Vmp et Imp du champ', `Vmp = ${panel.Vmp} × Ns ; Imp = ${panel.Imp} × Np.`);
    }
  }

  if (step === 5) {
    const nom = [12, 24, 48].reduce((acc, u) => (Math.abs(u - C.Ubat) < Math.abs(acc - C.Ubat) ? u : acc), 12);
    if (nom !== s.ubat) {
      bad('Tension du parc incohérente', `${s.bns} × ${bat.U} V = ${fr(C.Ubat, 1)} V (nominal ${nom} V) ≠ ${s.ubat} V retenus au §4.`);
    }
    if (near(a.cb, C.Cah, 0.05)) {
      ok('Capacité calculée correcte', `Cbat = Ejour × autonomie / (DoD × η) = ${fr(C.Cbat, 0)} Wh → ${fr(C.Cah, 0)} Ah sous ${s.ubat} V`);
    } else {
      bad('Calcule la capacité du parc', 'Cbat(Wh) = Ejour × jours / (DoD × η), puis Cbat(Ah) = Cbat / Ubat (tolérance 5 %).');
    }
    if (C.Ah < C.Cah * 0.95) {
      bad('Parc insuffisant', `${fr(C.Ah, 0)} Ah installés pour ${fr(C.Cah, 0)} Ah nécessaires. Ajoute des batteries en parallèle.`);
    } else {
      ok('Parc batterie', `${s.bns}S${s.bnp}P × ${bat.name} → ${fr(C.Ubat, 1)} V / ${fr(C.Ah, 0)} Ah = ${fr(C.Ewh / 1000, 1)} kWh`);
    }
    if (s.bnp > 3) {
      warn('Beaucoup de branches en parallèle', `${s.bnp} branches : câblage équilibré obligatoire (longueurs et sections identiques), sinon mauvaise répartition des courants.`);
    }
    if (bat.tech === 'LiFePO₄' && C.Iinv > bat.imax * s.bnp) {
      bad('Courant de décharge supérieur au BMS', `Onduleur : ${fr(C.Iinv, 0)} A > ${bat.imax * s.bnp} A (BMS ${bat.imax} A × ${s.bnp}).`);
    }
    if (bat.tech === 'Plomb') {
      warn('Plomb : DoD 50 %', 'Le parc est calculé avec 50 % d\'énergie utilisable et un rendement de 85 % : deux fois plus de capacité installée qu\'en LiFePO₄.');
    }
  }

  if (step === 6) {
    if (!mppt.ubat.includes(s.ubat)) {
      bad('Régulateur incompatible avec la tension batterie', `${mppt.name} : ${mppt.ubat.join(' / ')} V.`);
    }
    if (C.VocCold > mppt.vocmax) {
      bad('Voc corrigée > tension maxi MPPT', `${fr(C.VocCold, 0)} V > ${mppt.vocmax} V — risque de destruction du régulateur.`);
    } else {
      ok('Voc au froid admissible', `${fr(C.VocCold, 0)} V ≤ ${mppt.vocmax} V (Voc ${fr(C.Voc, 0)} V × (1 + ${panel.k} %/°C × (${loc.tmin} − 25)))`);
    }
    if (near(a.ich, C.Ich, 0.05)) {
      ok('Courant de charge correct', `I ≈ Ppv / Ubat = ${fr(C.PpvReal, 0)} / ${s.ubat} = ${fr(C.Ich, 0)} A`);
    } else {
      bad('Calcule le courant de charge', 'I ≈ Ppv / Ubat (tolérance 5 %).');
    }
    const pmax = mppt.pmax[s.ubat];
    if (pmax && C.PpvReal > pmax) {
      bad('Puissance PV > puissance admissible', `${fr(C.PpvReal, 0)} Wc > ${pmax} W pour ${s.ubat} V.`);
    } else if (pmax) {
      ok('Puissance admissible', `${fr(C.PpvReal, 0)} Wc ≤ ${pmax} W (${s.ubat} V)`);
    }
    if (C.Ich > mppt.ich) {
      bad('Courant de charge > calibre', `${fr(C.Ich, 0)} A > ${mppt.ich} A.`);
    }
    if (mppt.type === 'PWM' && C.Vmp > s.ubat * 1.5) {
      warn('PWM avec Vmp élevée', 'Un PWM ne convertit pas : la puissance excédentaire est perdue. Préfère un MPPT.');
    }
  }

  if (step === 7) {
    if (inv.U !== s.ubat) {
      bad('Onduleur incompatible', `${inv.name} : entrée ${inv.U} V ≠ ${s.ubat} V.`);
    }
    const need = C.Psim * 1.25;
    if (near(a.pinv, need, 0.05)) {
      ok('Puissance onduleur calculée', `Psim × 1,25 = ${fr(C.Psim, 0)} × 1,25 = ${fr(need, 0)} W`);
    } else {
      bad('Calcule la puissance onduleur', 'Puissance simultanée × 1,25 (marge 25 %).');
    }
    if (inv.P < C.Psim) {
      bad('Onduleur sous-dimensionné', `Puissance simultanée ${fr(C.Psim, 0)} W > ${inv.P} W continus.`);
    } else if (inv.P < need) {
      warn('Marge faible', `${inv.P} W pour ${fr(need, 0)} W conseillés.`);
    } else {
      ok('Puissance continue', `${inv.P} W (${inv.S} VA) ≥ ${fr(need, 0)} W`);
    }
    if (inv.peak < C.Pstart) {
      bad('Pointe de démarrage non couverte', `Pointe estimée ${fr(C.Pstart, 0)} W > ${inv.peak} W de pointe onduleur.`);
    } else {
      ok('Pointe', `${inv.peak} W ≥ ${fr(C.Pstart, 0)} W estimés au démarrage`);
    }
    warn('VA ≠ W', 'La puissance apparente (VA) n\'est pas la puissance active (W) : vérifie les deux sur la fiche.');
  }

  if (step === 8) {
    const c = s.cab;
    if (near(a.iinv, C.Iinv, 0.05)) {
      ok('Courant onduleur correct', `I = P / (U × η) = ${inv.P} / (${s.ubat} × ${inv.eta}) = ${fr(C.Iinv, 1)} A`);
    } else {
      bad('Calcule le courant onduleur → batterie', 'I = Ponduleur / (Ubat × ηonduleur).');
    }
    const chk = (lab: string, I: number, Sc: number, Smin: number, L: number) => {
      const iz = izOf(Sc);
      if (iz < I) {
        bad(`${lab} : section insuffisante pour le courant`, `I = ${fr(I, 0)} A > Iz = ${iz} A pour ${Sc} mm². Prends la section normalisée supérieure.`);
      } else if (Sc < Smin) {
        bad(`${lab} : chute de tension trop forte`, `S mini = 2 × ρ × L × I / ΔU = ${fr(Smin, 1)} mm² > ${Sc} mm².`);
      } else {
        ok(`${lab} : ${Sc} mm²`, `I ${fr(I, 0)} A ≤ Iz ${iz} A · S ≥ ${fr(Smin, 1)} mm² (chute ${fr((2 * RHO_CU * L * I) / Sc, 2)} V)`);
      }
    };
    chk('PV → MPPT', C.Ipvmax, c.Spv, C.Spv, c.Lpv);
    chk('Batterie → onduleur', C.Iinv, c.Sbat, C.Sbat, c.Lbat);
  }

  if (step === 9) {
    const p = s.prot;
    const izpv = izOf(s.cab.Spv);
    const izb = izOf(s.cab.Sbat);
    const isc1 = panel.Isc;
    if (p.fpv < isc1 * 1.25 || p.fpv > Math.min(izpv, isc1 * 2.4)) {
      bad('Fusible de string mal calibré', `Par string : 1,25 × Isc module (${fr(isc1 * 1.25, 0)} A) ≤ calibre ≤ 2,4 × Isc (${fr(isc1 * 2.4, 0)} A, tenue inverse du module) et ≤ Iz câble (${izpv} A). Choisi : ${p.fpv} A.`);
    } else {
      ok('Fusibles de string gPV', `${p.fpv} A · 1000 V DC par string (${s.np} strings) — entre ${fr(isc1 * 1.25, 0)} et ${fr(Math.min(izpv, isc1 * 2.4), 0)} A.`);
    }
    if (p.fbat < C.Iinv || p.fbat > izb) {
      bad('Protection batterie mal calibrée', `Iutilisation ${fr(C.Iinv, 0)} A ≤ calibre ≤ Iz ${izb} A. Choisi : ${p.fbat} A.`);
    } else {
      ok('Fusible principal batterie', `${p.fbat} A · pouvoir de coupure élevé (courant de court-circuit ${bat.tech === 'LiFePO₄' ? 'très important sur lithium' : 'important'}).`);
    }
    if (p.qac < C.Iac || p.qac > 25) {
      bad('Disjoncteur AC', `I = P / 230 = ${fr(C.Iac, 1)} A : calibre ${p.qac} A inadapté.`);
    } else {
      ok('Disjoncteur AC sortie onduleur', `${p.qac} A courbe C pour ${fr(C.Iac, 1)} A.`);
    }
    if (!p.ddr) {
      bad('DDR manquant', 'Un DDR 30 mA est requis pour la protection des personnes côté AC (selon régime de neutre de l\'onduleur).');
    }
    if (!p.dcspd) {
      warn('Parafoudre DC', 'Recommandé selon l\'analyse de risque foudre (longueur des câbles PV, site exposé).');
    }
    ok('DC ≠ AC', 'Les appareils DC portent une tension assignée DC, un pouvoir de coupure DC et parfois une polarité : un disjoncteur 230 V AC ne convient pas sur le parc batterie.');
  }

  if (step === 10) {
    const all = Array.from({ length: 10 }, (_, k) => k).every(k => s.done[k]);
    if (!all) bad('Note de calcul verrouillée', 'Valide d\'abord les dix étapes précédentes.');
    else ok('Dimensionnement complet', 'Les dix étapes sont validées : la note de calcul et le schéma unifilaire sont générés.');
  }

  return E;
}

/** L'étape est-elle franchissable (aucun message bloquant) ? */
export const stepOk = (s: PvState, step: number): boolean =>
  !checks(s, step).some(e => e.kind === 'bad');

/** État de chaque bloc de la chaîne énergétique. */
export function chainState(s: PvState): ('ok' | 'bad' | 'todo')[] {
  const okOf: boolean[] = [
    stepOk(s, 4),
    stepOk(s, 9) && stepOk(s, 4),
    stepOk(s, 6),
    stepOk(s, 5),
    stepOk(s, 9),
    stepOk(s, 7),
    stepOk(s, 9),
    stepOk(s, 0) && stepOk(s, 1),
  ];
  return PV_CHAIN.map((b, i) => (s.done[b.step] ? (okOf[i] ? 'ok' : 'bad') : 'todo'));
}

// ------------------------------------------------------------------ note de calcul

/** Note de calcul (texte), enregistrée dans le rapport de la tentative. */
export function report(s: PvState): string {
  const C = calc(s);
  const { loc, panel, bat, mppt, inv } = picksOf(s);
  const sol = solarOf(s);
  return `NOTE DE CALCUL PHOTOVOLTAÏQUE — installation autonome avec stockage
Site : ${loc.ville} (${loc.region}) · HSP retenue ${fr(C.hsp, 1)} h/j (${s.worst ? 'mois le plus défavorable' : 'moyenne annuelle'}) · Tmin ${loc.tmin} °C
Ressource solaire : ${sol.source === 'pvgis' ? 'PVGIS (mesures satellitaires)' : 'valeurs indicatives (table locale)'}

BESOINS
  Consommation journalière      ${fr(C.Ejour / 1000, 2)} kWh/j
  Puissance simultanée          ${fr(C.Psim / 1000, 2)} kW · pointe démarrage ≈ ${fr(C.Pstart / 1000, 2)} kW
ARCHITECTURE                    ${s.ubat} V
CHAMP PV                        ${s.ns * s.np} × ${panel.P} Wc = ${fr(C.PpvReal / 1000, 2)} kWc (besoin ${fr(C.Ppv / 1000, 2)} kWc, η ${s.eta})
  Configuration                 ${s.ns}S${s.np}P · Vmp ${fr(C.Vmp, 0)} V · Imp ${fr(C.Imp, 1)} A · Voc ${fr(C.Voc, 0)} V (${fr(C.VocCold, 0)} V au froid) · Isc ${fr(C.Isc, 1)} A
BATTERIES                       ${s.bns}S${s.bnp}P × ${bat.name}
  Parc                          ${fr(C.Ubat, 1)} V / ${fr(C.Ah, 0)} Ah = ${fr(C.Ewh / 1000, 1)} kWh (besoin ${fr(C.Cah, 0)} Ah, autonomie ${s.auto} j, DoD ${bat.dod * 100} %, η ${bat.eta})
RÉGULATEUR                      ${mppt.name} · Voc max ${mppt.vocmax} V ≥ ${fr(C.VocCold, 0)} V · Ich ≈ ${fr(C.Ich, 0)} A ≤ ${mppt.ich} A
ONDULEUR                        ${inv.name} · ${inv.P} W / pointe ${inv.peak} W (besoin ${fr(C.Psim * 1.25, 0)} W)
CÂBLES
  PV → MPPT                     ${s.cab.Spv} mm² · ${s.cab.Lpv} m · I ${fr(C.Ipvmax, 1)} A · ΔU ${fr((2 * RHO_CU * s.cab.Lpv * C.Ipvmax) / s.cab.Spv, 2)} V
  Batterie → onduleur           ${s.cab.Sbat} mm² · ${s.cab.Lbat} m · I ${fr(C.Iinv, 1)} A · ΔU ${fr((2 * RHO_CU * s.cab.Lbat * C.Iinv) / s.cab.Sbat, 2)} V
PROTECTIONS
  Fusibles de string gPV        ${s.prot.fpv} A · 1000 V DC${s.prot.dcspd ? ' · parafoudre DC' : ''} · sectionneur DC
  Fusible principal batterie    ${s.prot.fbat} A · sectionnement · pouvoir de coupure adapté (${bat.tech})
  Sortie AC                     disjoncteur ${s.prot.qac} A courbe C${s.prot.ddr ? ' · DDR 30 mA type A' : ''}
Chaîne : PV → coffret DC → MPPT → batteries → fusible → onduleur → protection AC → tableau → récepteurs`;
}

// ------------------------------------------------------------------ schéma unifilaire

const esc = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Schéma unifilaire de l'installation, en SVG (chaîne de blocs avec les valeurs clés).
 * PV → coffret DC → MPPT → batteries → fusible → onduleur → protection AC → tableau → récepteurs.
 */
export function unifilaire(s: PvState): string {
  const C = calc(s);
  const { bat, mppt, inv } = picksOf(s);
  const nRecv = s.recv.reduce((a, r) => a + r.q, 0);

  const blocks: { t: string; lines: string[]; dc: boolean }[] = [
    { t: 'CHAMP PV', lines: [`${s.ns}S${s.np}P · ${fr(C.PpvReal, 0)} Wc`, `Vmp ${fr(C.Vmp, 0)} V · Imp ${fr(C.Imp, 1)} A`, `Voc froid ${fr(C.VocCold, 0)} V`], dc: true },
    { t: 'COFFRET DC', lines: [`fusibles gPV ${s.prot.fpv} A`, s.prot.dcspd ? 'parafoudre DC' : 'sans parafoudre', 'sectionneur DC'], dc: true },
    { t: 'RÉGULATEUR', lines: [mppt.name, `Ich ${fr(C.Ich, 0)} A ≤ ${mppt.ich} A`, `${s.cab.Spv} mm² · ${s.cab.Lpv} m`], dc: true },
    { t: 'PARC BATTERIE', lines: [`${s.bns}S${s.bnp}P · ${bat.tech}`, `${fr(C.Ubat, 0)} V / ${fr(C.Ah, 0)} Ah`, `${fr(C.Ewh / 1000, 1)} kWh · ${s.auto} j`], dc: true },
    { t: 'PROTECTION DC', lines: [`fusible ${s.prot.fbat} A`, 'sectionnement', `${s.cab.Sbat} mm² · ${s.cab.Lbat} m`], dc: true },
    { t: 'ONDULEUR', lines: [inv.name, `${inv.P} W · pointe ${inv.peak} W`, `I DC ${fr(C.Iinv, 0)} A`], dc: true },
    { t: 'PROTECTION AC', lines: [`disjoncteur ${s.prot.qac} A · C`, s.prot.ddr ? 'DDR 30 mA type A' : 'DDR manquant', `I ${fr(C.Iac, 1)} A`], dc: false },
    { t: 'TABLEAU · RÉCEPTEURS', lines: [`${nRecv} récepteurs 230 V`, `Psim ${fr(C.Psim, 0)} W`, `${fr(C.Ejour / 1000, 2)} kWh/j`], dc: false },
  ];

  // deux rangées de quatre blocs : le schéma tient dans une colonne d'écran et sur une page A4
  const BW = 150;
  const GAP = 32;
  const BH = 88;
  const COLS = 4;
  const ROW_GAP = 58;
  const W = COLS * BW + (COLS - 1) * GAP + 40;
  const Y0 = 56;
  const H = Y0 + 2 * BH + ROW_GAP + 48;
  const xOf = (i: number) => 20 + (i % COLS) * (BW + GAP);
  const yOf = (i: number) => Y0 + Math.floor(i / COLS) * (BH + ROW_GAP);

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Schéma unifilaire de l'installation photovoltaïque autonome" font-family="IBM Plex Sans, system-ui, sans-serif">`;
  svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>`;
  svg += `<text x="20" y="26" font-size="13" font-weight="700" fill="#141A21">SCHÉMA UNIFILAIRE — installation autonome ${s.ubat} V avec stockage</text>`;
  svg += `<text x="20" y="42" font-size="10" fill="#66717F">Partie continue en rouge · partie alternative 230 V en bleu · mise à la terre et liaisons équipotentielles en vert</text>`;

  blocks.forEach((b, i) => {
    const x = xOf(i);
    const y = yOf(i);
    const stroke = b.dc ? '#D93A3A' : '#2C7BE5';
    svg += `<rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="10" fill="#F9FAFB" stroke="${stroke}" stroke-width="1.6"/>`;
    svg += `<text x="${x + BW / 2}" y="${y + 20}" text-anchor="middle" font-size="11" font-weight="700" fill="#141A21">${esc(b.t)}</text>`;
    b.lines.forEach((l, k) => {
      svg += `<text x="${x + BW / 2}" y="${y + 38 + k * 15}" text-anchor="middle" font-size="9.5" font-family="IBM Plex Mono, monospace" fill="#66717F">${esc(l)}</text>`;
    });

    if (i < blocks.length - 1) {
      const nx = xOf(i + 1);
      const ny = yOf(i + 1);
      if (ny === y) {
        // liaison horizontale dans la rangée
        svg += `<path d="M${x + BW} ${y + BH / 2} H${nx - 10}" stroke="${stroke}" stroke-width="2" fill="none"/>`;
        svg += `<path d="M${nx - 12} ${y + BH / 2 - 5} l 12 5 l -12 5 z" fill="${stroke}"/>`;
      } else {
        // passage à la rangée suivante : on sort par la droite, on redescend, on revient à gauche
        const mid = y + BH + ROW_GAP - 12;
        svg += `<path d="M${x + BW} ${y + BH / 2} h16 V${mid} H${nx - 16} V${ny + BH / 2} H${nx - 10}" stroke="${stroke}" stroke-width="2" fill="none"/>`;
        svg += `<path d="M${nx - 12} ${ny + BH / 2 - 5} l 12 5 l -12 5 z" fill="${stroke}"/>`;
      }
    }

    // mise à la terre : coffret DC, onduleur, tableau
    if (i === 1 || i === 5 || i === 7) {
      const cx = x + BW / 2;
      svg += `<path d="M${cx} ${y + BH} v14" stroke="#37B34A" stroke-width="1.6" stroke-dasharray="4 3" fill="none"/>`;
      svg += `<path d="M${cx - 10} ${y + BH + 14} h20 M${cx - 6} ${y + BH + 18} h12 M${cx - 3} ${y + BH + 22} h6" stroke="#37B34A" stroke-width="1.6" fill="none"/>`;
    }
  });

  svg += `<text x="20" y="${H - 10}" font-size="9.5" font-family="IBM Plex Mono, monospace" fill="#141A21">${esc(`Ejour ${fr(C.Ejour, 0)} Wh/j · Ppv besoin ${fr(C.Ppv, 0)} Wc · parc ${fr(C.Cah, 0)} Ah nécessaires · HSP ${fr(C.hsp, 1)} h/j`)}</text>`;
  svg += '</svg>';
  return svg;
}

// ------------------------------------------------------------------ évaluation

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Score 0..1 par étape : 1 − 0,15 × mauvaise tentative − 0,1 × ouverture d'aide,
 * plancher 0,3 quand l'étape est validée malgré tout. `undefined` = étape non atteinte.
 */
export function pvStageScores(s: PvState): (number | undefined)[] {
  return PV_STEPS.map((_, i) => {
    const reached = s.done[i] === true || s.step > i;
    if (!reached) return undefined;
    const raw = 1 - (s.badTries[i] ?? 0) * 0.15 - (s.helpUsed[i] ?? 0) * 0.1;
    const floor = s.done[i] ? 0.3 : 0;
    return Math.max(floor, clamp01(raw));
  });
}

/** Grille de compétences du diplôme pour le parcours de dimensionnement. */
export function buildPvEvaluation(s: PvState, diploma: DiplomaId): CompetenceEval[] {
  return evaluate(diploma, PV_STAGE_DOMAINS, pvStageScores(s));
}

/** Note sur 100 : moyenne des scores d'étape atteints. */
export function pvScore(s: PvState): number {
  const list = pvStageScores(s).filter((v): v is number => v != null);
  if (!list.length) return 0;
  return Math.round((list.reduce((a, v) => a + v, 0) / PV_STEPS.length) * 100);
}

/** Calibre de fusible normalisé immédiatement supérieur ou égal (aide au choix). */
export const nextFuse = (i: number): number => FUSES.find(f => f >= i) ?? FUSES[FUSES.length - 1];
