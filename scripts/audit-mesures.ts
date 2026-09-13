/**
 * Audit des mesures attendues : chaque `ExpectedMeasure` d'un TP est-elle *atteignable* ?
 *
 * Le parcours valide une mesure quand la valeur lue tombe dans [min, max] (`checkExpected`).
 * Si le simulateur ne rend jamais une valeur de cet intervalle, l'élève tourne en rond sans
 * comprendre pourquoi — c'est ce qui est arrivé à « Résistance d'un enroulement », attendue
 * entre 5 et 9 Ω alors que le simulateur rendait 4,2 Ω en dur.
 *
 *   npx tsx scripts/audit-mesures.ts
 */
import { TPS } from '../src/lib/data/tps';
import { initialSim, motorOf, type SimState } from '../src/lib/sim/engine';
import { read } from '../src/lib/sim/mesures';
import type { ExpectedMeasure, TpDefinition } from '../src/lib/types';

/** État du montage correspondant à la condition d'une mesure. */
function simPour(tp: TpDefinition, m: ExpectedMeasure): SimState {
  const s = initialSim();
  const mot = motorOf(tp);
  if (m.when === 'run' || m.stage === 'sousTension') {
    return { ...s, q1: true, f2: true, f3: true, km1: true, I: mot.In, n: mot.n };
  }
  if (m.when === 'ctl') return { ...s, q1: true, f2: true, f3: true };
  // hors tension : installation consignée
  return { ...s, q1: false, f2: false, f3: false, km1: false, I: 0, n: 0 };
}

let defauts = 0;

for (const tp of TPS) {
  if (!tp.playable || !tp.mesures?.length) continue;
  console.log(`\n=== ${tp.title} (${tp.id})`);

  for (const m of tp.mesures) {
    const sim = simPour(tp, m);
    const clamp = m.wire
      ? (() => {
        const [a, b] = m.wire.split('>');
        const l = tp.liaisons.find(x => x.a === a && x.b === b);
        return l ? { a: l.a, b: l.b, net: l.net } : null;
      })()
      : null;

    const out = read(tp, sim, m.instrument, m.dial, { r: m.a ?? null, k: m.b ?? null }, clamp);
    const v = out.value;
    const ok = v != null && Number.isFinite(v) && v >= m.min && v <= m.max;

    if (!ok) {
      defauts++;
      const lu = v == null ? `« ${out.display} » (pas un nombre)` : `${v} ${out.unit}`;
      console.log(`  ✗ ${m.id} · ${m.title}`);
      console.log(`      attendu ${m.min} à ${m.max} ${m.unit} — le simulateur rend ${lu}`);
      console.log(`      ${m.instrument} · ${m.dial} · ${m.a ?? m.wire} / ${m.b ?? ''}`);
    } else {
      console.log(`  ✓ ${m.id} · ${v} ${m.unit} (attendu ${m.min}–${m.max})`);
    }
  }
}

console.log(defauts === 0
  ? '\nToutes les mesures attendues sont atteignables.'
  : `\n${defauts} mesure(s) impossible(s) à valider.`);
process.exit(defauts === 0 ? 0 : 1);
