import type { MeasurePoint, TpDefinition } from '../types';
import {
  a1Wired, a2Wired, coilCircuitOk, isControlLive, isControlSupplied, isPowered, isRunning,
  loopPhaseAtS2, s1Closed, type SimState,
} from './engine';

export type InstrumentId = MeasurePoint['instrument'];

export interface Reading {
  /** Valeur numérique exploitable (NaN si la mesure est refusée). */
  value: number;
  /** Ce qui s'affiche sur l'écran de l'appareil. */
  display: string;
  unit: string;
  /** Ligne secondaire de l'appareil (MAX, gamme…). */
  sub: string;
  /** Commentaire pédagogique. */
  note: string;
  /** Mesure refusée (ohmmètre sous tension). */
  refused?: boolean;
}

export const INSTRUMENTS: { id: InstrumentId; label: string; short: string }[] = [
  { id: 'dmm', label: 'Multimètre V~', short: 'Multimètre' },
  { id: 'clamp', label: 'Pince ampèremétrique', short: 'Pince' },
  { id: 'tacho', label: 'Tachymètre', short: 'Tachymètre' },
  { id: 'mega', label: 'Contrôleur d\'isolement', short: 'Mégohmmètre' },
];

const fr = (v: number, d = 1) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Petit bruit de mesure, déterministe sur la valeur pour ne pas clignoter. */
const noise = (v: number) => (v === 0 ? 0 : v + ((v * 1000) % 7 - 3) * 0.12);

const NO_POINT: Reading = { value: NaN, display: '- - -', unit: '', sub: 'choisis un point de mesure', note: '' };

/** Courant lu par la pince sur une phase. */
function phaseCurrent(s: SimState, phase: 'l1' | 'l2' | 'l3'): number {
  if (!isRunning(s)) return 0;
  if (s.fault === 'l2') return phase === 'l2' ? 0 : s.I;
  return s.I;
}

/**
 * Lecture d'un instrument sur un point de mesure du TP.
 * Cohérente avec la physique : 0 V sur un circuit ouvert, 230 V aux bornes d'un contact
 * ouvert dans une boucle sous tension, 400 V entre phases, refus d'une mesure d'ohms sous tension.
 */
export function read(state: SimState, tp: TpDefinition, instrument: InstrumentId, pointId: string | null): Reading {
  if (!pointId) return NO_POINT;
  const s = state;
  const point = tp.measurePoints.find(p => p.id === pointId);
  const label = point?.label ?? pointId;

  if (instrument === 'mega') {
    if (isPowered(s) || isControlSupplied(s)) {
      return {
        value: NaN, display: 'ERR', unit: '', sub: 'tension détectée', refused: true,
        note: 'Refus de l\'appareil : jamais de mesure d\'ohms ou d\'isolement sous tension. Consigne d\'abord.',
      };
    }
    return { value: 999, display: '> 999', unit: 'MΩ', sub: '500 V —', note: 'Isolement conforme (mini 0,5 MΩ selon NF C 15-100).' };
  }

  if (instrument === 'clamp') {
    if (point && point.instrument !== 'clamp') {
      return { value: NaN, display: '- - -', unit: 'A~', sub: label, note: 'Ce point ne se mesure pas à la pince.' };
    }
    const phase = (pointId === 'l1' || pointId === 'l2' || pointId === 'l3') ? pointId : 'l1';
    const I = phaseCurrent(s, phase);
    return {
      value: I, display: fr(I, 2), unit: 'A~', sub: `MAX ${fr(s.peak, 1)} A`,
      note: !isRunning(s)
        ? '0 A : le moteur est à l\'arrêt.'
        : I === 0
          ? 'Aucun courant sur cette phase alors que les autres débitent : une phase est coupée.'
          : s.t < 1.4
            ? 'Pointe de démarrage : jusqu\'à 6 fois In pendant la montée en vitesse.'
            : 'Courant de ligne en régime établi.',
    };
  }

  if (instrument === 'tacho') {
    const g = s.n > 0 ? (tp.motor.ns - s.n) / tp.motor.ns * 100 : 0;
    return {
      value: Math.round(s.n), display: String(Math.round(s.n)), unit: 'tr/min',
      sub: `glissement ${fr(g, 1)} %`,
      note: s.n > 0 ? `ns = ${tp.motor.ns} tr/min : l'écart, c'est le glissement.` : 'Arbre à l\'arrêt.',
    };
  }

  // ---- multimètre, tension alternative
  const V = (v: number, note: string, sub = label): Reading => ({
    value: v, display: fr(noise(v), 0), unit: 'V~', sub, note,
  });

  switch (pointId) {
    case 'uamont': // X1:1 – X1:2, en amont de Q1 : le réseau est là en permanence
      return V(400, 'Le réseau est présent en amont de Q1, indépendamment de la position de Q1.');
    case 'ul': { // X1:6 – X1:7, départ moteur
      if (!isRunning(s)) return V(0, '0 V : KM1 est retombé, le départ moteur n\'est pas alimenté.');
      if (s.fault === 'l2') return V(230, 'Tension anormale entre U et V : une phase manque au départ moteur.');
      return V(400, '400 V entre deux phases : tension composée normale.');
    }
    case 'ua': { // KM1 A1 – A2
      const alim = loopPhaseAtS2(s) && coilCircuitOk(s) && (s.km1 || s.s2Held);
      if (alim) return V(230, 'Bobine alimentée sous 230 V entre phase et neutre.');
      if (loopPhaseAtS2(s) && !a2Wired(s)) return V(0, '0 V alors que la commande est vivante : le retour au neutre est douteux.');
      if (loopPhaseAtS2(s) && !a1Wired(s)) return V(0, '0 V : A1 ne reçoit pas la phase. Remonte la boucle borne à borne.');
      return V(0, '0 V : la bobine n\'est pas alimentée.');
    }
    case 'u9596': { // F1 95 – 96
      const v = isControlSupplied(s) && s.f1trip ? 230 : 0;
      return V(v, v
        ? '230 V aux bornes d\'un contact ouvert dans une boucle sous tension : F1 a déclenché.'
        : '0 V aux bornes du contact : 95-96 est fermé.');
    }
    case 'us1': { // X2:1 – X2:2, aux bornes de S1
      const v = isControlLive(s) && !s1Closed(s) ? 230 : 0;
      return V(v, v
        ? '230 V aux bornes du contact d\'arrêt : il est resté ouvert.'
        : '0 V : le contact NC de S1 est bien fermé.');
    }
    case 'us2': { // X2:2 – X2:3, aux bornes de S2
      const loop = loopPhaseAtS2(s);
      const v = loop && !s.km1 && !s.s2Held && coilCircuitOk(s) ? 230 : 0;
      return V(v, v
        ? '230 V aux bornes du bouton marche au repos : la boucle est bonne jusqu\'à la bobine.'
        : loop && !s.km1 && !s.s2Held
          ? '0 V au repos alors que la commande est vivante : le circuit est coupé en aval de S2.'
          : '0 V : contact fermé ou boucle non alimentée.');
    }
    default:
      return { value: NaN, display: '- - -', unit: 'V~', sub: label, note: 'Ce point ne se mesure pas au multimètre.' };
  }
}

/** Point d'isolement, non listé dans le TP : phases du départ moteur contre le PE. */
const MEGA_POINT: MeasurePoint = { id: 'iso', label: 'Isolement · X1:6-7-8 / PE', instrument: 'mega' };

/** Points de mesure proposés pour un instrument donné. */
export function pointsFor(tp: TpDefinition, instrument: InstrumentId): MeasurePoint[] {
  if (instrument === 'mega') return [MEGA_POINT];
  return tp.measurePoints.filter(p => p.instrument === instrument);
}
