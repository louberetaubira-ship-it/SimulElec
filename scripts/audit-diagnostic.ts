/**
 * Contrôle du dépannage à l'instrument.
 *
 * Une panne n'est pédagogiquement honnête que si l'élève peut la TROUVER en
 * mesurant. Ce contrôle, pour chaque panne de chaque TP jouable :
 *
 *  1. monte le circuit de commande avec la panne injectée ;
 *  2. balaie toutes les paires de bornes du circuit, sous tension puis consignée ;
 *  3. vérifie qu'au moins une mesure DISTINGUE cette panne de toutes les autres.
 *
 * Une panne qui donne partout les mêmes valeurs qu'une autre est indétectable :
 * l'élève ne peut que deviner, et l'exercice ne vaut rien. Le contrôle échoue.
 *
 * Il vérifie aussi que chaque panne déclare ce qu'elle fait au réseau (`coupe` ou
 * `ouvre`) et l'action de remise en état attendue, et que les bornes citées
 * existent vraiment sur la platine.
 *
 *     npx tsx scripts/audit-diagnostic.ts
 */
import { TPS } from '@/lib/data/tps';
import { initialSim, type SimState } from '@/lib/sim/engine';
import { initialState } from '@/lib/sim/progress';
import {
  reseauCommande, resistanceCommande, tensionCommande, type Arete,
} from '@/lib/sim/commande';
import type { TpDefinition } from '@/lib/types';
import { etatReference, observations, observer } from '@/lib/sim/reseau';

/**
 * TP réseau : l'« instrument » est l'observation du technicien courant faible (ping, LED de
 * port, V⎓ PoE, testeur de câble, ipconfig, arp, supervision). Même exigence : chaque panne
 * change au moins une observation, et deux pannes ne donnent jamais les mêmes partout.
 */
function signatureReseau(tp: TpDefinition, fault: string | null): Map<string, string> {
  const e = etatReference(tp, fault);
  return new Map(observations(tp).map(o => [o.label, observer(tp, e, o.id).court]));
}
function distingueReseau(a: Map<string, string>, b: Map<string, string>): string | null {
  for (const [k, v] of Array.from(a.entries())) if (b.get(k) !== v) return `${k} : « ${v} » au lieu de « ${b.get(k)} »`;
  return null;
}

/** Platine câblée d'après le TP, panne `fault` injectée. */
function etat(tp: TpDefinition, fault: string | null) {
  const st = {
    ...initialState(),
    wires: tp.liaisons.map(l => ({ a: l.a, b: l.b, net: l.net })),
    fault,
  };
  const sim: SimState = {
    ...initialSim(),
    q1: true, f2: true, f3: true,
    u2: tp.trafo?.bobine ?? 24,
    trafoDiag: 'ok',
    fault: fault === 'f3' ? 'f3' : null,
  };
  return { st, sim };
}

/** Toutes les bornes du réseau de commande. */
const bornes = (e: readonly Arete[]): string[] => {
  const s = new Set<string>();
  for (const x of e) { s.add(x.a); s.add(x.b); }
  return Array.from(s).sort();
};

/**
 * Signature d'une panne : ce que rendraient tous les appareils, sur toutes les
 * paires de bornes, dans les deux états de la platine et bouton maintenu ou non.
 */
function signature(tp: TpDefinition, fault: string | null): Map<string, number | null> {
  const out = new Map<string, number | null>();
  for (const marche of [false, true]) {
    const { st, sim } = etat(tp, fault);
    const e = reseauCommande(tp, st, sim, { marcheMaintenue: marche });
    const bs = bornes(e);
    const u = sim.u2 ?? 24;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j];
        const v = tensionCommande(e, a, b, u);
        const r = resistanceCommande(e, a, b);
        out.set(`V|${marche}|${a}|${b}`, v == null ? null : Math.round(v * 10) / 10);
        out.set(`R|${marche}|${a}|${b}`, r == null ? null : Math.round(r * 10) / 10);
      }
    }
  }
  return out;
}

/**
 * Première mesure qui sépare deux signatures, s'il y en a une.
 *
 * Une borne ABSENTE d'un réseau n'est pas un cas à ignorer : c'est justement ce
 * qui arrive quand la panne a coupé le seul fil qui y menait, et l'appareil y lit
 * OL. Les sauter — première version de ce contrôle — revenait à déclarer
 * indétectable la panne la plus visible qui soit.
 */
function distingue(a: Map<string, number | null>, b: Map<string, number | null>): string | null {
  const cles = new Set([...Array.from(a.keys()), ...Array.from(b.keys())]);
  for (const k of Array.from(cles)) {
    const va = a.has(k) ? a.get(k)! : null;   // borne disparue du réseau : OL
    const vb = b.has(k) ? b.get(k)! : null;
    if (va === vb) continue;
    const [type, marche, x, y] = k.split('|');
    const fmt = (v: number | null) => (v == null ? 'OL' : `${v} ${type === 'V' ? 'V' : 'Ω'}`);
    return `${type === 'V' ? 'V~' : 'Ω'} entre ${x} et ${y}`
      + `${marche === 'true' ? ' (bouton de marche maintenu)' : ''} : ${fmt(va)} au lieu de ${fmt(vb)}`;
  }
  return null;
}

let ko = 0;

for (const tp of TPS) {
  if (!tp.playable) continue;
  console.log(`\n═══ ${tp.title} (${tp.id})`);

  if (tp.kind === 'reseau' && tp.reseau) {
    const saine = signatureReseau(tp, null);
    for (const f of tp.faults) {
      if (!f.action) { ko++; console.log(`  ✗ ${f.id} : pas d'action de remise en état déclarée`); continue; }
      const sig = signatureReseau(tp, f.id);
      const vs = distingueReseau(sig, saine);
      if (!vs) { ko++; console.log(`  ✗ ${f.id} : aucune observation ne la distingue d'une installation saine`); continue; }
      const confusions = tp.faults.filter(g => g.id !== f.id && distingueReseau(sig, signatureReseau(tp, g.id)) == null).map(g => g.id);
      if (confusions.length) { ko++; console.log(`  ✗ ${f.id} : indiscernable de ${confusions.join(', ')}`); continue; }
      console.log(`  ✓ ${f.id} — ${vs}`);
    }
    continue;
  }
  const bornesPlatine = new Set(Object.keys(tp.nets));
  const sain = signature(tp, null);

  for (const f of tp.faults) {
    // ---- la panne dit-elle ce qu'elle fait au réseau ?
    if (!f.coupe && !f.ouvre && !f.croise) {
      ko++;
      console.log(`  ✗ ${f.id} : ne déclare ni « coupe », ni « ouvre », ni « croise » — invisible à l'instrument`);
      continue;
    }
    // paire croisée : les deux liaisons d'origine doivent exister
    if (f.croise) {
      const absentes = f.croise.filter(c => {
        const [x, y] = c.split('>');
        return !tp.liaisons.some(l => (l.a === x && l.b === y) || (l.a === y && l.b === x));
      });
      if (absentes.length) {
        ko++;
        console.log(`  ✗ ${f.id} : « croise » ne correspond à aucune liaison du TP → ${absentes.join(', ')}`);
        continue;
      }
    }
    if (!f.action) {
      ko++;
      console.log(`  ✗ ${f.id} : pas d'action de remise en état déclarée`);
    }
    if (f.coupe) {
      const manquantes = f.coupe.split('>').filter(t => !bornesPlatine.has(t) && !/^(RES|M|S\d|H\d)\./.test(t));
      if (manquantes.length) {
        ko++;
        console.log(`  ✗ ${f.id} : borne inconnue dans « coupe » → ${manquantes.join(', ')}`);
        continue;
      }
      const existe = tp.liaisons.some(l => {
        const [x, y] = f.coupe!.split('>');
        return (l.a === x && l.b === y) || (l.a === y && l.b === x);
      });
      if (!existe) {
        ko++;
        console.log(`  ✗ ${f.id} : « coupe » ne correspond à aucune liaison du TP → ${f.coupe}`);
        continue;
      }
    }

    // ---- la panne se voit-elle à l'instrument, et se distingue-t-elle des autres ?
    const sig = signature(tp, f.id);
    const vsSain = distingue(sig, sain);
    if (!vsSain) {
      ko++;
      console.log(`  ✗ ${f.id} : aucune mesure ne la distingue d'une platine saine`);
      continue;
    }
    const confusions = tp.faults
      .filter(g => g.id !== f.id && (g.coupe || g.ouvre || g.croise))
      .filter(g => distingue(sig, signature(tp, g.id)) == null)
      .map(g => g.id);
    if (confusions.length) {
      ko++;
      console.log(`  ✗ ${f.id} : indiscernable de ${confusions.join(', ')} — l'élève ne peut que deviner`);
      continue;
    }
    console.log(`  ✓ ${f.id} — ${vsSain}`);
  }
}

console.log(ko === 0
  ? '\nChaque panne se déclare, se mesure, et se distingue des autres.'
  : `\n${ko} panne(s) non diagnosticable(s) à l'instrument.`);
process.exit(ko ? 1 : 0);
