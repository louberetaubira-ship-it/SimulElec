import type { DeviceState } from '@/components/panel/Device';
import { pupitreOf } from '@/lib/scene/geometry';
import { isControlLive, isRunning, type SimState } from '@/lib/sim/engine';
import type { TpDefinition } from '@/lib/types';

/** État visuel des appareils de la platine, d'après la simulation. */
export function deviceStateOf(sim: SimState): Record<string, DeviceState> {
  return {
    q1: sim.q1 ? 'on' : 'off',
    f2: sim.f2 ? 'on' : 'off',
    f3: sim.f3 ? 'on' : 'off',
    km1: sim.km1 ? 'on' : 'off',
    f1: sim.f1trip ? 'trip' : 'on',
  };
}

/**
 * Voyants du coffret de porte, par repère : chaque voyant s'allume selon ce qu'il
 * signale — `run` moteur en marche, `ctl` commande sous tension, `trip` défaut thermique.
 */
export function lampsOf(sim: SimState, tp: Pick<TpDefinition, 'pupitre'>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of pupitreOf(tp)) {
    if (p.kind !== 'lamp') continue;
    out[p.rep] = p.signals === 'trip' ? isControlLive(sim) && sim.f1trip
      : p.signals === 'ctl' ? isControlLive(sim)
        : isRunning(sim) && isControlLive(sim);
  }
  return out;
}
