import { TP_SOLAIRE_AUTONOME as TP } from '@/lib/data/tps/solaire-autonome';
import { initialSim } from '@/lib/sim/engine';
import { voltage } from '@/lib/sim/mesures';

function u(sim: any, a: string, b: string) { return voltage(TP, sim, a, b) ?? 0; }
const base = initialSim();
// installation "en service" : tous fermés
const enService = { ...base, q1: true, f2: true, f3: true, km1: false };
// Q1 ouvert seulement (champ Q2 encore fermé)
const q1open = { ...enService, q1: false };
// Q1 ET Q2 ouverts
const both = { ...enService, q1: false, f2: false };

const P = (s:any,a:string,b:string)=> (u(s,a,b) > 50 ? 'PRÉSENCE' : 'absence');
console.log('--- source connue (parc) BT1.X1/BT2.X2 ---');
console.log('en service   :', P(enService,'BT1.X1','BT2.X2'));
console.log('--- aval Q1  q1.2+/q1.4− ---');
console.log('en service   :', P(enService,'q1.2+','q1.4−'));
console.log('Q1 ouvert    :', P(q1open,'q1.2+','q1.4−'));
console.log('--- aval Q2 (champ) f2.2+/f2.4− ---');
console.log('en service   :', P(enService,'f2.2+','f2.4−'));
console.log('Q1 ouvert seul:', P(q1open,'f2.2+','f2.4−'), '  <-- doit rester PRÉSENCE (champ indépendant)');
console.log('Q1+Q2 ouverts:', P(both,'f2.2+','f2.4−'), '  <-- doit passer en absence');

console.log('\n--- source connue = amont Q2 (champ) f2.1+/f2.3− ---');
console.log('en service    :', P(enService,'f2.1+','f2.3−'), '(présence attendue)');
console.log('Q1+Q2 ouverts :', P(both,'f2.1+','f2.3−'), '(toujours présence : champ non coupable)');
