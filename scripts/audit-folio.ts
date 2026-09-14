/**
 * Contrôle du folio du circuit de commande.
 *
 * Un folio faux est pire que pas de folio : l'élève y lit un montage qui n'est
 * pas celui qu'il mesure, et il cherche là où il ne faut pas. Ce contrôle vérifie
 * trois choses, pour chaque TP jouable :
 *
 *  1. toute borne du circuit de commande est ATTEIGNABLE sur le folio — sinon
 *     l'élève ne peut pas y poser ses pointes ;
 *  2. une platine saine n'a AUCUN trait rouge, et chaque panne de commande en a
 *     au moins un — le folio doit montrer ce que la panne fait, sans rien
 *     inventer sur une platine en bon état ;
 *  3. les repères cités par le folio existent sur la platine.
 *
 * Les pannes du circuit de PUISSANCE sont exemptées du point 2 : elles ne se
 * voient pas sur un folio de commande, et c'est ainsi qu'il faut que ce soit —
 * elles se cherchent sur la platine.
 *
 *     npx tsx scripts/audit-folio.ts
 */
import { TPS } from '@/lib/data/tps';
import { initialSim, type SimState } from '@/lib/sim/engine';
import { initialState } from '@/lib/sim/progress';
import { reseauCommande, type Arete } from '@/lib/sim/commande';
import { rendreFolio } from '@/lib/schema/folio';
import { pupitreOf } from '@/lib/scene/geometry';
import type { TpDefinition } from '@/lib/types';

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

const reseauDe = (tp: TpDefinition, fault: string | null): Arete[] => {
  const { st, sim } = etat(tp, fault);
  return reseauCommande(tp, st, sim, { marcheMaintenue: false });
};

let ko = 0;

for (const tp of TPS) {
  if (!tp.playable) continue;
  console.log(`\n═══ ${tp.title} (${tp.id})`);
  if (!tp.folio) {
    ko++;
    console.log('  ✗ pas de folio : l\'étape de dépannage n\'a pas de schéma à montrer');
    continue;
  }

  const sain = reseauDe(tp, null);
  const rendu = rendreFolio(tp, sain, {});
  if (!rendu) { ko++; console.log('  ✗ le folio ne se dessine pas'); continue; }
  console.log(`  boîte ${rendu.largeur} × ${rendu.hauteur}, ${rendu.points.length} points de mesure`);

  // ---- 1. toute borne de commande est-elle atteignable ?
  const duReseau = new Set<string>();
  for (const a of sain) if (!a.puissance) { duReseau.add(a.a); duReseau.add(a.b); }
  const duFolio = new Set(rendu.points.map(p => p.id));
  // les deux faces d'une borne de bornier sont le même point : le folio n'en
  // porte qu'une, et c'est la bonne façon de la dessiner
  const memePoint = (n: string): boolean => {
    const m = /^(.+)\.(a|b)$/.exec(n);
    return !!m && (duFolio.has(`${m[1]}.a`) || duFolio.has(`${m[1]}.b`));
  };
  const absentes = Array.from(duReseau).filter(n => !duFolio.has(n) && !memePoint(n)).sort();
  if (absentes.length) {
    ko++;
    console.log(`  ✗ bornes du circuit de commande absentes du folio : ${absentes.join(' ')}`);
  } else {
    console.log('  ✓ toutes les bornes de commande sont mesurables sur le folio');
  }

  // ---- 2. le folio montre-t-il les pannes, et rien de plus ?
  const rouges = (fault: string | null): number => {
    const r = rendreFolio(tp, reseauDe(tp, fault), {});
    return (r?.svg.match(/#D93A3A/g) ?? []).length;
  };
  const nSain = rouges(null);
  if (nSain !== 0) {
    ko++;
    console.log(`  ✗ une platine saine porte ${nSain} trait(s) rouge(s) : le folio invente un défaut`);
  } else {
    console.log('  ✓ une platine saine n\'a aucun trait rouge');
  }
  const commande = new Set<string>();
  for (const a of sain) if (!a.puissance) { commande.add(a.a); commande.add(a.b); }
  for (const f of tp.faults) {
    const puissance = !!f.coupe && f.coupe.split('>').every(n => !commande.has(n));
    if (puissance) {
      console.log(`  — ${f.id} : panne de puissance, se cherche sur la platine`);
      continue;
    }
    const n = rouges(f.id);
    if (!n) {
      ko++;
      console.log(`  ✗ ${f.id} : invisible sur le folio — ${f.title}`);
    } else {
      console.log(`  ✓ ${f.id} : ${n} trait(s) rouge(s)`);
    }
  }

  // ---- 3. les repères du folio existent-ils sur la platine ?
  const valides = new Set<string>();
  for (const slot of tp.slots) {
    if (slot.rep) valides.add(slot.rep);
    if (slot.group) valides.add(slot.group);
  }
  for (const p of pupitreOf(tp)) valides.add(p.rep);
  if (tp.interPosition) valides.add(tp.interPosition.rep);
  const reperes = tp.folio.colonnes
    .flatMap(c => c.elements)
    .concat(tp.folio.tete ? [tp.folio.tete] : [])
    .map(el => el.rep)
    .filter((r): r is string => !!r && !/^X/.test(r));
  const inconnus = Array.from(new Set(reperes)).filter(r => !valides.has(r)).sort();
  if (inconnus.length) {
    ko++;
    console.log(`  ✗ repères du folio absents de la platine : ${inconnus.join(' ')}`);
  } else {
    console.log('  ✓ tous les repères du folio existent sur la platine');
  }
}

console.log(ko === 0
  ? '\nLes folios sont complets, fidèles aux pannes, et nomment les appareils comme la platine.'
  : `\n${ko} défaut(s) de folio.`);
process.exit(ko ? 1 : 0);
