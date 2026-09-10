import type { DeviceState } from '@/components/panel/Device';
import { isControlLive, isRunning, type SimState } from '@/lib/sim/engine';

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

/** Voyants du coffret de porte : H1 marche, H2 défaut. */
export function lampsOf(sim: SimState): { h1: boolean; h2: boolean } {
  return { h1: isRunning(sim) && isControlLive(sim), h2: isControlLive(sim) && sim.f1trip };
}
