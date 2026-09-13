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
import { estBorneMoteur, estEnroulement, resistancePlaque } from '../src/lib/sim/plaque';
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

/* ------------------------------------------------------- plaque à bornes
 *
 * Verrou sur le solveur : les valeurs théoriques d'un moteur dont un enroulement vaut R.
 * Entre deux bornes de ligne, 2 R en étoile et ⅔ R en triangle ; barrettes retirées, seule
 * une vraie paire d'enroulement conduit.
 */
const Y: [string, string][] = [['M.W2', 'M.U2'], ['M.U2', 'M.V2']];
const D: [string, string][] = [['M.W2', 'M.U1'], ['M.U2', 'M.V1'], ['M.V2', 'M.W1']];
const R = 6;
const CAS: { a: string; b: string; bars: [string, string][]; att: number | null; quoi: string }[] = [
  { a: 'M.U1', b: 'M.U2', bars: [], att: R, quoi: 'enroulement, barrettes retirées' },
  { a: 'M.V1', b: 'M.V2', bars: [], att: R, quoi: 'enroulement, barrettes retirées' },
  { a: 'M.U1', b: 'M.W2', bars: [], att: null, quoi: 'deux enroulements, rien ne les relie' },
  { a: 'M.U1', b: 'M.V1', bars: [], att: null, quoi: 'deux bornes de ligne, barrettes retirées' },
  { a: 'M.U1', b: 'M.U2', bars: Y, att: R, quoi: 'enroulement, couplage étoile' },
  { a: 'M.U1', b: 'M.V1', bars: Y, att: 2 * R, quoi: 'bornes de ligne en étoile = 2 R' },
  { a: 'M.U2', b: 'M.V2', bars: Y, att: 0, quoi: 'barrette du point neutre' },
  { a: 'M.U1', b: 'M.V1', bars: D, att: Math.round((2 * R / 3) * 100) / 100, quoi: 'bornes de ligne en triangle = ⅔ R' },
  { a: 'M.U1', b: 'M.W2', bars: D, att: 0, quoi: 'barrette du triangle' },
];

console.log('=== Plaque à bornes (R = ' + R + ' Ω)');
for (const c of CAS) {
  const v = resistancePlaque(R, c.bars, c.a, c.b);
  const ok = v === c.att;
  if (!ok) defauts++;
  console.log(`  ${ok ? '✓' : '✗'} ${c.a} / ${c.b} — ${c.quoi} : ${v === null ? 'OL' : v} `
    + (ok ? '' : `(attendu ${c.att === null ? 'OL' : c.att})`));
}

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

    // une mesure d'enroulement doit porter sur une vraie paire U1-U2, V1-V2 ou W1-W2
    if (m.dial === 'Ω' && estBorneMoteur(m.a) && estBorneMoteur(m.b)
      && !estEnroulement(m.a as string, m.b as string)) {
      defauts++;
      console.log(`  ✗ ${m.id} · ${m.title}`);
      console.log(`      ${m.a} et ${m.b} ne sont pas les deux extrémités d'un même enroulement.`);
      console.log('      Un enroulement se mesure entre U1-U2, V1-V2 ou W1-W2.');
      continue;
    }

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
