import type { Liaison, NetKind, TpDefinition } from '../types';

export type FaultId = 'a2' | 's1' | 'l2' | 'x2';

/** État électrique de la platine — pur, sérialisable, sans React. */
export interface SimState {
  /** Q1, disjoncteur moteur : fermé ? */
  q1: boolean;
  /** F2, protection du circuit de commande : fermé ? */
  f2: boolean;
  /** KM1 enclenché ? */
  km1: boolean;
  /** F1, relais thermique déclenché ? */
  f1trip: boolean;
  /** Charge mécanique du ventilateur (1 = charge nominale). */
  load: number;
  /** Courant de ligne instantané (A). */
  I: number;
  /** Vitesse instantanée (tr/min). */
  n: number;
  /** Pointe de courant mémorisée (fonction MAX de la pince). */
  peak: number;
  /** Image thermique du relais F1 (0..∞, déclenche au seuil). */
  heat: number;
  /** Panne injectée par le professeur (secrète pour l'élève). */
  fault: FaultId | null;
  /** Bouton marche maintenu enfoncé. */
  s2Held: boolean;
  /** Temps écoulé depuis l'enclenchement de KM1 (s). */
  t: number;
  /** L'élève a déjà arrêté le moteur par S1. */
  stoppedByS1: boolean;
  /** KM1 a essayé de coller sans tenir (panne A2). */
  chattering: boolean;
}

export const initialSim = (): SimState => ({
  q1: false, f2: false, km1: false, f1trip: false,
  load: 0.8, I: 0, n: 0, peak: 0, heat: 0,
  fault: null, s2Held: false, t: 0, stoppedByS1: false, chattering: false,
});

// ---------------------------------------------------------------- états dérivés

/** Puissance présente en aval de Q1. */
export const isPowered = (s: SimState): boolean => s.q1;

/** Circuit de commande sous tension en amont de la boucle (Q1 + F2 fermés). */
export const isControlSupplied = (s: SimState): boolean => s.q1 && s.f2;

/** Boucle de commande vivante jusqu'à F1 95-96 inclus. */
export const isControlLive = (s: SimState): boolean => isControlSupplied(s) && !s.f1trip;

/** Le moteur tourne (KM1 collé, puissance présente, thermique non déclenché). */
export const isRunning = (s: SimState): boolean => s.q1 && s.km1 && !s.f1trip;

/** Le contact NC de S1 est-il fermé ? (panne « s1 » = contact resté ouvert) */
export const s1Closed = (s: SimState): boolean => s.fault !== 's1';

/** Le fil X2:3 → A1 est-il en place ? (panne « x2 ») */
export const a1Wired = (s: SimState): boolean => s.fault !== 'x2';

/** Le fil A2 → neutre est-il serré ? (panne « a2 ») */
export const a2Wired = (s: SimState): boolean => s.fault !== 'a2';

/** La bobine peut-elle être alimentée si on ferme le chemin ? */
export const coilCircuitOk = (s: SimState): boolean => a1Wired(s) && a2Wired(s);

/** Potentiel « phase » présent sur le nœud X2:2 / S2:13 / KM1:13. */
export const loopPhaseAtS2 = (s: SimState): boolean => isControlLive(s) && s1Closed(s);

// ---------------------------------------------------------------- manœuvres

export interface ActionResult { state: SimState; message: string }

export function toggleQ1(s: SimState): ActionResult {
  const q1 = !s.q1;
  return {
    state: { ...s, q1, km1: q1 ? s.km1 : false, chattering: false },
    message: q1 ? 'Q1 fermé : la puissance est sous tension.' : 'Q1 ouvert : platine hors tension.',
  };
}

export function toggleF2(s: SimState): ActionResult {
  const f2 = !s.f2;
  return {
    state: { ...s, f2, km1: f2 ? s.km1 : false, chattering: false },
    message: f2 ? 'F2 fermé : le circuit de commande est sous tension.' : 'F2 ouvert : plus de commande.',
  };
}

export function resetF1(s: SimState): ActionResult {
  if (!s.f1trip) return { state: s, message: 'F1 est réglé à 3,3 A — rien à réarmer.' };
  return { state: { ...s, f1trip: false, heat: 0 }, message: 'F1 réarmé.' };
}

export function pressS2(s: SimState): ActionResult {
  if (!isPowered(s)) return { state: { ...s, s2Held: true }, message: 'Rien ne se passe : Q1 est ouvert.' };
  if (!s.f2) return { state: { ...s, s2Held: true }, message: 'Rien ne se passe : F2 est ouvert.' };
  if (s.f1trip) return { state: { ...s, s2Held: true }, message: 'Rien ne se passe : F1 a déclenché, 95-96 est ouvert.' };
  if (!s1Closed(s)) return { state: { ...s, s2Held: true }, message: 'Rien ne se passe : le circuit de commande est coupé quelque part.' };
  if (!a1Wired(s)) return { state: { ...s, s2Held: true }, message: 'Rien ne se passe, pourtant la commande est sous tension.' };
  if (!a2Wired(s)) return { state: { ...s, s2Held: true, chattering: true }, message: 'KM1 vibre mais ne tient pas : la bobine est mal alimentée.' };
  if (s.km1) return { state: { ...s, s2Held: true }, message: 'KM1 est déjà enclenché.' };
  return {
    state: { ...s, s2Held: true, km1: true, t: 0, peak: 0, chattering: false },
    message: 'S2 : KM1 s\'enclenche, l\'auto-maintien 13-14 prend le relais.',
  };
}

export function releaseS2(s: SimState): SimState {
  return { ...s, s2Held: false, chattering: false };
}

export function pressS1(s: SimState): ActionResult {
  if (!s.km1) return { state: { ...s, chattering: false }, message: 'S1 : le circuit était déjà ouvert.' };
  return { state: { ...s, km1: false, stoppedByS1: true, chattering: false }, message: 'S1 : KM1 retombe, le moteur s\'arrête.' };
}

/** Injecte une panne et remet la platine dans un état de départ pour le dépannage. */
export function injectFault(s: SimState, fault: FaultId): SimState {
  return { ...s, fault, km1: false, f1trip: false, heat: 0, I: 0, n: 0, peak: 0, chattering: false, stoppedByS1: false };
}

export function repairFault(s: SimState): SimState {
  return { ...s, fault: null, f1trip: false, heat: 0, chattering: false };
}

export function pickFault(tp: TpDefinition, rnd: number = Math.random()): FaultId {
  const ids = tp.faults.map(f => f.id) as FaultId[];
  return ids[Math.min(ids.length - 1, Math.floor(rnd * ids.length))];
}

// ---------------------------------------------------------------- simulation

const SEUIL_TRIP = 3.0;      // image thermique en surcharge franche
const SEUIL_TRIP_L2 = 6.0;   // marche en monophasé : plus lent mais inévitable
const lerp = (v: number, target: number, k: number, dt: number) => v + (target - v) * (1 - Math.exp(-k * dt));

/**
 * Avance la simulation de `dt` secondes.
 * Pointe de démarrage 6×In décroissante, glissement fonction de la charge,
 * déclenchement thermique au-delà de 120 % de charge ou en marche sur deux phases.
 */
export function tick(state: SimState, tp: TpDefinition, dt: number): ActionResult {
  const s = { ...state };
  let message = '';
  const { In, ns } = tp.motor;
  const on = isRunning(s);
  const oneLegLost = s.fault === 'l2';

  if (on) s.t += dt; else s.t = 0;

  // courant cible : magnétisation + charge, majoré par la pointe de démarrage
  let target = on ? In * (0.3 + 0.7 * s.load) : 0;
  if (on && s.t < 1.4) target = Math.max(target, In * 6 * Math.exp(-s.t * 3.2));
  if (on && oneLegLost) target *= 1.6;
  s.I = lerp(s.I, target, on ? 4.2 : 3.5, dt);
  if (s.I > s.peak) s.peak = s.I;

  // vitesse : glissement ≈ 4 % à charge nominale ; sur deux phases le moteur ronfle
  const nTarget = on ? (oneLegLost ? ns * 0.55 : ns * (1 - 0.04 * s.load)) : 0;
  s.n = lerp(s.n, nTarget, on ? 0.75 : 0.55, dt);
  if (!on && s.n < 5) s.n = 0;
  if (!on && s.I < 0.02) s.I = 0;

  // image thermique de F1
  if (on && (s.load > 1.2 || oneLegLost)) {
    s.heat += dt;
    const seuil = oneLegLost ? SEUIL_TRIP_L2 : SEUIL_TRIP;
    if (s.heat > seuil) {
      s.f1trip = true;
      s.km1 = false;
      s.heat = 0;
      message = 'F1 déclenche : surcharge du moteur.';
    }
  } else if (s.heat > 0) {
    s.heat = Math.max(0, s.heat - dt * 0.5);
  }

  return { state: s, message };
}

// ---------------------------------------------------------------- fils vivants

const startsWith = (id: string, slot: string) => id.startsWith(`${slot}.`);

/**
 * Un fil est-il alimenté ? Sert à éteindre (opacité réduite) les liaisons hors tension.
 * PE et N sont toujours « en place » mais jamais représentés comme vivants.
 */
export function netLive(l: Pick<Liaison, 'a' | 'b' | 'net'>, s: SimState): boolean {
  const net: NetKind = l.net;
  if (net === 'PE') return false;
  if (net === 'N') return isControlSupplied(s);

  const ids = `${l.a} ${l.b}`;

  if (net === 'C') {
    // amont : Q1 → F2
    if (/f2\.1/.test(ids)) return isPowered(s);
    // F2 → F1 95 et F2 → F1 97 : vivants dès que F2 est fermé
    if (startsWith(l.a, 'f2') || startsWith(l.b, 'f2')) return isControlSupplied(s);
    // branche de signalisation de défaut 97-98 → H2
    if (/f1\.9[78]|h2\./.test(ids)) return isControlSupplied(s) && s.f1trip;
    // boucle de commande jusqu'à S1
    if (/f1\.9[56]|x2_1/.test(ids)) return isControlLive(s);
    // aval de S1
    if (/S1\.22|x2_2|km1\.13|S2\.13/.test(ids)) return loopPhaseAtS2(s);
    // aval de S2 / auto-maintien vers A1
    if (/S2\.14|x2_3/.test(ids)) return loopPhaseAtS2(s) && s.s2Held;
    if (/km1\.14/.test(ids)) return loopPhaseAtS2(s) && (s.km1 || (s.s2Held && a1Wired(s)));
    if (/km1\.A1/.test(ids)) return loopPhaseAtS2(s) && a1Wired(s) && (s.km1 || s.s2Held);
    return isControlLive(s);
  }

  // puissance
  if (startsWith(l.a, 'RES') || startsWith(l.b, 'RES')) return true;                 // arrivée réseau
  if (/x1_[123]\.a|q1\.[135]/.test(ids) && !/q1\.[246]/.test(ids)) return true;      // amont Q1
  if (/q1\.[246]/.test(ids)) return isPowered(s);                                    // aval Q1 → KM1
  if (oneLegCut(l, s)) return false;
  if (/km1\.[246]|f1\.[135]/.test(ids)) return isRunning(s);
  if (/f1\.[246]|x1_[678]/.test(ids) || startsWith(l.b, 'M') || startsWith(l.a, 'M')) return isRunning(s);
  return isPowered(s);
}

function oneLegCut(l: Pick<Liaison, 'a' | 'b' | 'net'>, s: SimState): boolean {
  return s.fault === 'l2' && l.net === 'L2' && /f1\.4|x1_7/.test(`${l.a} ${l.b}`);
}
