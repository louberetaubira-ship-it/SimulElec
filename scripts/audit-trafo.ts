/**
 * Contrôle du transformateur de commande à prises.
 *
 * Table de référence, calculée à la main d'après le rapport de transformation
 * `U2 = Uprise_secondaire × Uréseau / Uprise_primaire`, puis comparée à ce que
 * rend le moteur. Les seuils viennent de la CEI 60947-4-1 §8.2.1.2.1 : fermeture
 * garantie entre 85 % et 110 % de la tension assignée d'alimentation de commande.
 *
 *     npx tsx scripts/audit-trafo.ts
 */
import { TPS } from '@/lib/data/tps';
import { etatTrafo, substitutTrafo, bobineColle, type DiagTrafo } from '@/lib/sim/trafo';
import type { TrafoDef } from '@/lib/types';

const DEF: TrafoDef = {
  slot: 't1',
  reseau: 400,
  primaire: { '0': 0, '230': 230, '400': 400 },
  secondaire: { '0V': 0, '24': 24, '48': 48 },
  bobine: 24,
};

interface Cas { pri: [string, string]; sec: [string, string]; u2: number; diag: DiagTrafo; colle: boolean }

// 400 V au primaire dans tous les cas : c'est la prise choisie qui change tout.
const REF: Cas[] = [
  // prises correctes : 400 V sur la portion marquée 400 → 24 V
  { pri: ['0', '400'], sec: ['0V', '24'], u2: 24, diag: 'ok', colle: true },
  // prise 230 sous 400 V : 400 × 24 / 230 = 41,7 V — 174 % du flux nominal
  { pri: ['0', '230'], sec: ['0V', '24'], u2: 41.7, diag: 'surexcite', colle: true },
  // portion 230→400, soit 170 V marqués, sous 400 V : 400 × 24 / 170 = 56,5 V
  { pri: ['230', '400'], sec: ['0V', '24'], u2: 56.5, diag: 'surexcite', colle: true },
  // prises primaires correctes mais secondaire pris sur la 48 : le fer va bien,
  // c'est la bobine qui reçoit 200 % de sa tension assignée
  { pri: ['0', '400'], sec: ['0V', '48'], u2: 48, diag: 'surtension', colle: true },
  // 24→48 : une portion marquée 24 V, donc 24 V — le montage marche, mais le 0 V flotte
  { pri: ['0', '400'], sec: ['24', '48'], u2: 24, diag: 'ok', colle: true },
];

// Le cas « 230 V appliqués sur la prise 400 » d'un réseau sans triphasé : 13,8 V.
const REF230: Cas[] = [
  { pri: ['0', '400'], sec: ['0V', '24'], u2: 13.8, diag: 'sousexcite', colle: false },
  { pri: ['0', '230'], sec: ['0V', '24'], u2: 24, diag: 'ok', colle: true },
];

const pose = (pri: [string, string], sec: [string, string]) => [
  { a: 'f2.2', b: `t1.${pri[1]}` }, { a: 'f2.4', b: `t1.${pri[0]}` },
  { a: `t1.${sec[1]}`, b: 'f3.1' }, { a: `t1.${sec[0]}`, b: 'x2_4.a' },
];

let ko = 0;
const verifier = (def: TrafoDef, ref: Cas[], titre: string) => {
  console.log(`\n═══ ${titre}`);
  for (const c of ref) {
    const e = etatTrafo(def, pose(c.pri, c.sec));
    const colle = bobineColle(e, def.bobine);
    const ok = Math.abs(e.u2 - c.u2) < 0.15 && e.diag === c.diag && colle === c.colle;
    if (!ok) ko++;
    console.log(
      `  ${ok ? '✓' : '✗'} primaire ${c.pri.join('–')} · secondaire ${c.sec.join('–')} → `
      + `${e.u2} V (attendu ${c.u2}), ${e.diag} (attendu ${c.diag}), `
      + `bobine ${colle ? 'colle' : 'ne colle pas'}`,
    );
  }
};

verifier(DEF, REF, 'Primaire alimenté sous 400 V entre deux phases');
verifier({ ...DEF, reseau: 230 }, REF230, 'Primaire alimenté sous 230 V phase-neutre');

// ---- le primaire seul ne suffit pas à conclure
console.log('\n═══ Câblage incomplet');
const partiel = etatTrafo(DEF, [{ a: 'f2.2', b: 't1.400' }, { a: 'f2.4', b: 't1.0' }]);
const okPartiel = partiel.diag === 'absent';
if (!okPartiel) ko++;
console.log(`  ${okPartiel ? '✓' : '✗'} secondaire non raccordé → « absent », pas de conclusion hâtive`);

// ---- la prise voisine doit être acceptée, la borne d'un autre appareil refusée
console.log('\n═══ Substitution de prise');
const attendues = [{ a: 'f2.2', b: 't1.400' }, { a: 'f2.4', b: 't1.0' }, { a: 't1.24', b: 'f3.1' }];
const essais: [string, string, boolean, string][] = [
  ['f2.2', 't1.230', true, 'prise voisine du primaire : acceptée, la faute se verra à l\'essai'],
  ['t1.48', 'f3.1', true, 'prise voisine du secondaire : acceptée'],
  ['f2.2', 't1.400', false, 'liaison correcte : ce n\'est pas une substitution'],
  ['f2.2', 'f3.1', false, 'deux bornes hors transformateur : rien à substituer'],
  ['f2.2', 't1.24', false, 'prise de l\'autre côté du transformateur : refusée'],
];
for (const [a, b, attendu, quoi] of essais) {
  const r = substitutTrafo(DEF, attendues, a, b) != null;
  const ok = r === attendu;
  if (!ok) ko++;
  console.log(`  ${ok ? '✓' : '✗'} ${a} → ${b} : ${r ? 'acceptée' : 'refusée'} — ${quoi}`);
}

// ---- tous les TP qui portent un transformateur doivent le déclarer câblé juste
console.log('\n═══ TP du catalogue');
for (const tp of TPS) {
  const aTrafo = tp.slots.some(s => s.id === 't1');
  if (!aTrafo) continue;
  if (!tp.trafo) { ko++; console.log(`  ✗ ${tp.id} : transformateur sur la platine mais pas déclaré`); continue; }
  const e = etatTrafo(tp.trafo, tp.liaisons);
  const ok = e.diag === 'ok';
  if (!ok) ko++;
  console.log(`  ${ok ? '✓' : '✗'} ${tp.id} : prises ${e.primaire?.join('–')} / ${e.secondaire?.join('–')} → ${e.u2} V (${e.diag})`);
}

console.log(`\n${ko} écart(s)`);
process.exit(ko ? 1 : 0);
