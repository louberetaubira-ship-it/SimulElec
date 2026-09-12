import type { Liaison, PupitreItem, TpDefinition } from '../types';
import { pupitreOf } from '../scene/geometry';

/** Pannes injectables (identifiants des `faults` des TP v3). */
export type FaultId = 'a2' | 's1' | 'l2' | 'x2' | 'f3';

const FAULT_IDS: FaultId[] = ['a2', 's1', 'l2', 'x2', 'f3'];
export const isFaultId = (v: string | null | undefined): v is FaultId =>
  v != null && (FAULT_IDS as string[]).includes(v);

/** Couplage de la boîte à bornes du moteur. */
export type Coupling = 'Y' | 'D';

/** État électrique de la platine — pur, sérialisable, sans React. */
export interface SimState {
  /** Q1, disjoncteur moteur : fermé ? */
  q1: boolean;
  /** F2, protection du primaire 400 V de T1 : fermé ? */
  f2: boolean;
  /** F3, protection du secondaire 24 V : fermé ? */
  f3: boolean;
  /** KM1 enclenché ? */
  km1: boolean;
  /** F1, relais thermique déclenché ? */
  f1trip: boolean;
  /** Couplage du moteur (Y sur 400 V ; Δ = surintensité ×1,73). */
  coupling: Coupling;
  /** Charge mécanique (1 = charge nominale). */
  load: number;
  /** Courant de ligne instantané (A). */
  I: number;
  /** Vitesse instantanée (tr/min). */
  n: number;
  /** Pointe de courant mémorisée (fonction MAX de la pince). */
  peak: number;
  /** Image thermique du relais F1. */
  heat: number;
  /** Panne injectée par le professeur (secrète pour l'élève). */
  fault: FaultId | null;
  /** Bouton marche maintenu enfoncé. */
  s2Held: boolean;
  /**
   * Boutons à verrouillage (coup de poing) restés enfoncés, par repère :
   * leur contact NC reste ouvert jusqu'au déverrouillage explicite.
   */
  latched: Record<string, boolean>;
  /**
   * Carter / écran de protection en place (vrai au départ) : commande
   * l'interrupteur de position quand le TP en déclare un.
   */
  carter: boolean;
  /** Temps écoulé depuis l'enclenchement de KM1 (s). */
  t: number;
  /** L'élève a déjà arrêté le moteur par S1. */
  stoppedByS1: boolean;
  /** KM1 a essayé de coller sans tenir (panne A2). */
  chattering: boolean;
}

export const initialSim = (): SimState => ({
  q1: false, f2: false, f3: false, km1: false, f1trip: false, coupling: 'Y',
  load: 0.8, I: 0, n: 0, peak: 0, heat: 0,
  fault: null, s2Held: false, latched: {}, carter: true,
  t: 0, stoppedByS1: false, chattering: false,
});

/** Caractéristiques moteur par défaut (TP sans moteur). */
const MOTOR_DEFAULT = { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 };
export const motorOf = (tp: TpDefinition) => tp.motor ?? MOTOR_DEFAULT;

// ---------------------------------------------------------------- états dérivés

/** Puissance présente en aval de Q1. */
export const isPowered = (s: SimState): boolean => s.q1;

/** Primaire de T1 sous tension (Q1 + F2 fermés). */
export const isControlSupplied = (s: SimState): boolean => s.q1 && s.f2;

/** F3 opérationnel (la panne « f3 » simule un déclenchement du secondaire). */
export const f3Ok = (s: SimState): boolean => s.f3 && s.fault !== 'f3';

/** Circuit de commande 24 V vivant : Q1 + F2 + F3, thermique non déclenché. */
export const isControlLive = (s: SimState): boolean => s.q1 && s.f2 && f3Ok(s) && !s.f1trip;

/** Le moteur tourne (KM1 collé, puissance présente, thermique non déclenché). */
export const isRunning = (s: SimState): boolean => s.q1 && s.km1 && !s.f1trip;

/** Le contact NC du bouton d'arrêt est-il fermé ? (panne « s1 » = contact resté ouvert) */
export const s1Closed = (s: SimState): boolean => s.fault !== 's1';

/* ------------------------------------------------------------- pupitre */

/** Organes du pupitre par nature (le pupitre historique quand le TP n'en déclare pas). */
export const stopButtons = (tp: Pick<TpDefinition, 'pupitre'>): PupitreItem[] =>
  pupitreOf(tp).filter(p => p.kind === 'nc');
export const startButtons = (tp: Pick<TpDefinition, 'pupitre'>): PupitreItem[] =>
  pupitreOf(tp).filter(p => p.kind === 'no');

/** Un bouton à verrouillage est-il resté enfoncé ? */
export const isLatched = (s: SimState, rep: string): boolean => s.latched[rep] === true;

/** Premier coup de poing verrouillé du pupitre, s'il y en a un. */
export const latchedStop = (s: SimState, tp: Pick<TpDefinition, 'pupitre'>): PupitreItem | null =>
  stopButtons(tp).find(p => isLatched(s, p.rep)) ?? null;

/** Le carter coupe-t-il la commande ? (seulement si le TP déclare un interrupteur de position) */
export const carterOpen = (s: SimState, tp: Pick<TpDefinition, 'interPosition'>): boolean =>
  Boolean(tp.interPosition) && !s.carter;

/**
 * Chaîne d'arrêt fermée : tous les contacts NC du pupitre sont au repos,
 * aucun coup de poing verrouillé, et l'interrupteur de position est fermé.
 */
export const stopChainClosed = (s: SimState, tp: Pick<TpDefinition, 'pupitre' | 'interPosition'>): boolean =>
  s1Closed(s) && !latchedStop(s, tp) && !carterOpen(s, tp);

/** Le fil X2:3 → KM1 A1 est-il en place ? (panne « x2 ») */
export const a1Wired = (s: SimState): boolean => s.fault !== 'x2';

/** Le fil A2 → 0 V est-il serré ? (panne « a2 ») */
export const a2Wired = (s: SimState): boolean => s.fault !== 'a2';

/** La bobine peut-elle être alimentée si on ferme le chemin ? */
export const coilCircuitOk = (s: SimState): boolean => a1Wired(s) && a2Wired(s);

/** Potentiel 24 V présent en sortie de la chaîne d'arrêt (X2:2 / S2:13 / KM1:13). */
export const loopPhaseAtS2 = (s: SimState, tp: Pick<TpDefinition, 'pupitre' | 'interPosition'>): boolean =>
  isControlLive(s) && stopChainClosed(s, tp);

// ---------------------------------------------------------------- manœuvres

export interface ActionResult { state: SimState; message: string }

export function toggleQ1(s: SimState): ActionResult {
  const q1 = !s.q1;
  return {
    state: { ...s, q1, km1: q1 ? s.km1 : false, chattering: false },
    message: q1 ? 'Q1 fermé : la puissance est sous tension.' : 'Q1 ouvert : platine séparée du réseau.',
  };
}

export function toggleF2(s: SimState): ActionResult {
  const f2 = !s.f2;
  return {
    state: { ...s, f2, km1: f2 ? s.km1 : false, chattering: false },
    message: f2 ? 'F2 fermé : le primaire 400 V de T1 est alimenté.' : 'F2 ouvert : plus de primaire sur T1.',
  };
}

export function toggleF3(s: SimState): ActionResult {
  const f3 = !s.f3;
  return {
    state: { ...s, f3, km1: f3 ? s.km1 : false, chattering: false },
    message: f3 ? 'F3 fermé : la commande 24 V est sous tension.' : 'F3 ouvert : plus de commande 24 V.',
  };
}

export function resetF1(s: SimState): ActionResult {
  if (!s.f1trip) return { state: s, message: 'F1 est réglé à In — rien à réarmer.' };
  return { state: { ...s, f1trip: false, heat: 0 }, message: 'F1 réarmé.' };
}

export function setCoupling(s: SimState, coupling: Coupling): ActionResult {
  return {
    state: { ...s, coupling },
    message: coupling === 'Y'
      ? 'Couplage étoile : barrette W2-U2-V2, 230 V par enroulement.'
      : 'Couplage triangle sur 400 V : surintensité ×1,73, F1 va déclencher.',
  };
}

/** Appui sur un bouton de marche (contact NO) du pupitre. */
function pressStart(s: SimState, tp: TpDefinition, rep: string): ActionResult {
  const held = { ...s, s2Held: true };
  const latch = latchedStop(s, tp);
  if (latch) {
    return {
      state: held,
      message: `Le coup de poing ${latch.rep} est verrouillé : déverrouille-le avant de redémarrer.`,
    };
  }
  if (carterOpen(s, tp)) {
    const ip = tp.interPosition;
    return {
      state: held,
      message: `Rien ne se passe : la protection est retirée — le contact ${ip?.rep ?? 'de position'} coupe la commande.`,
    };
  }
  if (!isPowered(s)) return { state: held, message: 'Rien ne se passe : Q1 est ouvert.' };
  if (!s.f2) return { state: held, message: 'Rien ne se passe : F2 est ouvert.' };
  if (!s.f3) return { state: held, message: 'Rien ne se passe : F3 est ouvert.' };
  if (s.fault === 'f3') return { state: held, message: 'Rien ne se passe, pourtant F3 semble fermé.' };
  if (s.f1trip) return { state: held, message: 'Rien ne se passe : F1 a déclenché, 95-96 est ouvert.' };
  if (!s1Closed(s)) return { state: held, message: 'Rien ne se passe : le circuit de commande est coupé quelque part.' };
  if (!a1Wired(s)) return { state: held, message: 'Rien ne se passe, pourtant la commande est sous tension.' };
  if (!a2Wired(s)) return { state: { ...held, chattering: true }, message: 'KM1 vibre mais ne tient pas : la bobine est mal alimentée.' };
  if (s.km1) return { state: held, message: 'KM1 est déjà enclenché.' };
  return {
    state: { ...held, km1: true, t: 0, peak: 0, chattering: false },
    message: `${rep} : KM1 s'enclenche, l'auto-maintien 13-14 prend le relais.`,
  };
}

/** Appui sur un bouton d'arrêt (contact NC) : ouverture de la chaîne d'arrêt. */
function pressStop(s: SimState, item: PupitreItem): ActionResult {
  const rep = item.rep;
  // un coup de poing déjà verrouillé se déverrouille au clic suivant (quart de tour)
  if (isLatched(s, rep)) {
    const latched = { ...s.latched };
    delete latched[rep];
    return { state: { ...s, latched }, message: `${rep} déverrouillé : la chaîne d'arrêt est refermée.` };
  }
  const latched = item.latching ? { ...s.latched, [rep]: true } : s.latched;
  const verrou = item.latching ? ' et se verrouille' : '';
  if (!s.km1) {
    return { state: { ...s, latched, chattering: false }, message: `${rep} : le circuit était déjà ouvert${verrou}.` };
  }
  return {
    state: { ...s, latched, km1: false, stoppedByS1: true, chattering: false },
    message: `${rep} : KM1 retombe${verrou}, le moteur s'arrête.`,
  };
}

/** Appui sur un organe du pupitre, désigné par son repère (« S2 », « S4 », « S3 »…). */
export function pressButton(s: SimState, tp: TpDefinition, rep: string): ActionResult {
  const item = pupitreOf(tp).find(p => p.rep === rep);
  if (!item || item.kind === 'lamp') return { state: s, message: `${rep} n'est pas un bouton.` };
  return item.kind === 'no' ? pressStart(s, tp, rep) : pressStop(s, item);
}

/** Relâchement d'un bouton du pupitre (seuls les boutons de marche sont maintenus). */
export function releaseButton(s: SimState): SimState {
  return { ...s, s2Held: false, chattering: false };
}

/**
 * Bascule le carter (écran de protection) commandé par l'interrupteur de position :
 * carter ouvert, la chaîne de commande est coupée exactement comme par un arrêt.
 */
export function toggleCarter(s: SimState, tp: Pick<TpDefinition, 'interPosition'>): ActionResult {
  const carter = !s.carter;
  const rep = tp.interPosition?.rep ?? 'S1';
  const etat = tp.interPosition?.etat ?? 'écran de protection en place';
  return {
    state: { ...s, carter, km1: carter ? s.km1 : false, chattering: false },
    message: carter
      ? `${etat} : ${rep} referme la chaîne d'arrêt.`
      : `Protection retirée : ${rep} s'ouvre, KM1 retombe et le moteur s'arrête.`,
  };
}

/** Injecte une panne et remet la platine dans un état de départ pour le dépannage. */
export function injectFault(s: SimState, fault: FaultId): SimState {
  return { ...s, fault, km1: false, f1trip: false, heat: 0, I: 0, n: 0, peak: 0, chattering: false, stoppedByS1: false };
}

export function repairFault(s: SimState): SimState {
  return { ...s, fault: null, f1trip: false, heat: 0, chattering: false };
}

export function pickFault(tp: TpDefinition, rnd: number = Math.random()): FaultId {
  const ids = tp.faults.map(f => f.id).filter(isFaultId);
  if (!ids.length) return 'a2';
  return ids[Math.min(ids.length - 1, Math.floor(rnd * ids.length))];
}

// ---------------------------------------------------------------- simulation

const SEUIL_TRIP = 3.0;      // image thermique en surcharge franche
const SEUIL_TRIP_D = 2.0;    // couplage triangle sur 400 V : déclenchement rapide
const SEUIL_TRIP_L2 = 6.0;   // marche en monophasé : plus lent mais inévitable
const lerp = (v: number, target: number, k: number, dt: number) => v + (target - v) * (1 - Math.exp(-k * dt));

/**
 * Avance la simulation de `dt` secondes.
 * Pointe de démarrage 6×In décroissante, glissement fonction de la charge,
 * courant ×1,73 en couplage triangle, déclenchement thermique au-delà de 120 %
 * de charge, en triangle, ou en marche sur deux phases.
 */
export function tick(state: SimState, tp: TpDefinition, dt: number): ActionResult {
  const s = { ...state };
  let message = '';
  const { In, ns } = motorOf(tp);
  const on = isRunning(s);
  const oneLegLost = s.fault === 'l2';
  const kc = s.coupling === 'D' ? 1.73 : 1;

  if (on) s.t += dt; else s.t = 0;

  let target = on ? In * (0.3 + 0.7 * s.load) * kc : 0;
  if (on && s.t < 1.4) target = Math.max(target, In * 6 * kc * Math.exp(-s.t * 3.2));
  if (on && oneLegLost) target *= 1.6;
  s.I = lerp(s.I, target, on ? 4.2 : 3.5, dt);
  if (s.I > s.peak) s.peak = s.I;

  const nTarget = on ? (oneLegLost ? ns * 0.55 : ns * (1 - 0.04 * s.load)) : 0;
  s.n = lerp(s.n, nTarget, on ? 0.75 : 0.55, dt);
  if (!on && s.n < 5) s.n = 0;
  if (!on && s.I < 0.02) s.I = 0;

  if (on && (s.load > 1.2 || oneLegLost || s.coupling === 'D')) {
    s.heat += dt;
    const seuil = s.coupling === 'D' ? SEUIL_TRIP_D : oneLegLost ? SEUIL_TRIP_L2 : SEUIL_TRIP;
    if (s.heat > seuil) {
      s.f1trip = true;
      s.km1 = false;
      s.heat = 0;
      message = s.coupling === 'D'
        ? 'F1 déclenche : couplage triangle sur 400 V, le moteur appelle 1,73 fois trop de courant.'
        : 'F1 déclenche : surcharge du moteur.';
    }
  } else if (s.heat > 0) {
    s.heat = Math.max(0, s.heat - dt * 0.5);
  }

  return { state: s, message };
}

// ---------------------------------------------------------------- fils vivants

/**
 * Un fil est-il alimenté ? Sert à estomper les liaisons hors tension.
 * PE et 0 V ne sont jamais représentés comme vivants.
 */
export function netLive(l: Pick<Liaison, 'a' | 'b' | 'net'>, s: SimState, tp: TpDefinition): boolean {
  const net = l.net;
  if (net === 'PE' || net === 'C0' || net === 'N') return false;
  const ids = `${l.a} ${l.b}`;
  /** La liaison touche-t-elle l'une de ces bornes du pupitre ? */
  const touches = (list: string[]): boolean => list.some(t => ids.includes(t));

  if (net === 'C') {
    const pu = pupitreOf(tp);
    const lampsOfKind = (sig: PupitreItem['signals']): string[] =>
      pu.filter(p => p.kind === 'lamp' && (p.signals ?? 'run') === sig).map(p => `${p.rep}.`);
    // amont / aval des contacts : la chaîne d'arrêt (NC) alimente les boutons de marche (NO)
    const stopOut = stopButtons(tp).map(p => `${p.rep}.22`);
    const startIn = startButtons(tp).map(p => `${p.rep}.13`);
    const startOut = startButtons(tp).map(p => `${p.rep}.14`);

    if (/t1\.24|f3\.1/.test(ids)) return isControlSupplied(s);
    if (/f1\.9[78]/.test(ids) || touches(lampsOfKind('trip'))) return isControlLive(s) && s.f1trip;
    if (/f3\.2|f1\.9[56]|x2_1/.test(ids)) return isControlLive(s);
    if (/x2_2|km1\.13/.test(ids) || touches([...stopOut, ...startIn])) return loopPhaseAtS2(s, tp);
    if (/x2_3/.test(ids) || touches(startOut)) return loopPhaseAtS2(s, tp) && (s.s2Held || s.km1);
    if (/km1\.14|x2_4/.test(ids) || touches(lampsOfKind('run'))) return loopPhaseAtS2(s, tp) && s.km1;
    if (/km1\.A1/.test(ids)) return loopPhaseAtS2(s, tp) && a1Wired(s) && (s.km1 || s.s2Held);
    return isControlLive(s);
  }

  // puissance
  if (/RES\./.test(ids)) return true;
  if (/x1_[123]\.|q1\.[135]/.test(ids) && !/q1\.[246]/.test(ids)) return true;
  if (/q1\.[246]|f2\.|t1\.(0|400)/.test(ids)) return isPowered(s);
  if (oneLegCut(l, s)) return false;
  if (/km1\.[246]|f1\.|x1_[678]|M\./.test(ids)) return isRunning(s);
  return isPowered(s);
}

function oneLegCut(l: Pick<Liaison, 'a' | 'b' | 'net'>, s: SimState): boolean {
  return s.fault === 'l2' && l.net === 'L2' && /f1\.4|x1_7/.test(`${l.a} ${l.b}`);
}
