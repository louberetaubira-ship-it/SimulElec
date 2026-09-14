/**
 * Circuit de commande — réseau réel et résolution.
 *
 * Jusqu'ici, une mesure dans le circuit de commande se ramenait à comparer deux
 * étiquettes de réseau : si les deux pointes portaient « C », l'appareil affichait
 * 24 V, sinon 0. L'élève ne pouvait donc rien découvrir en mesurant — la réponse
 * était écrite d'avance, et la même où qu'il pose ses pointes.
 *
 * Ici, on construit le réseau tel qu'il est réellement câblé — les fils que
 * l'élève a posés, les contacts dans l'état où ils sont, la bobine et le voyant
 * avec leur résistance — et on le résout par la méthode des nœuds. Le résultat
 * dépend de l'endroit exact où sont les pointes, de l'état du montage et de la
 * panne injectée. C'est ce qui rend le dépannage à l'instrument possible.
 *
 * Deux pièges, tous deux rencontrés en construisant la maquette et corrigés ici :
 *
 * - Une matrice de conductance montée sur tous les nœuds est SINGULIÈRE dès qu'un
 *   morceau du circuit flotte, ce qui arrive constamment en dépannage (c'est même
 *   le symptôme). On ne résout donc que sur la composante connexe des deux pointes.
 *
 * - Un voltmètre idéal ne donne aucun potentiel à une borne que rien n'alimente.
 *   Le vrai voltmètre, lui, a une impédance d'entrée — 10 MΩ pour un multimètre
 *   TRMS courant — et c'est elle qui referme le circuit. On la modélise : plus
 *   rien ne flotte, et l'appareil affiche ce qu'il afficherait en vrai.
 */
import type { AttemptState, Fault, TpDefinition } from '../types';
import { pupitreOf } from '../scene/geometry';
import { isLatched, type SimState } from './engine';

/** Une branche du réseau : deux nœuds et une résistance. */
export interface Arete {
  a: string;
  b: string;
  r: number;
  /** Identifiant de la branche, pour qu'une panne puisse la couper. */
  id?: string;
  /**
   * Branche du circuit de PUISSANCE. Elle entre dans la mesure de continuité — une
   * phase coupée se cherche à l'ohmmètre comme le reste — mais jamais dans le calcul
   * des potentiels : elle n'est pas alimentée par le secondaire 24 V, et l'y mêler
   * ferait lire 24 V sur une phase.
   */
  puissance?: boolean;
  /**
   * Nature de la branche. Le folio en a besoin pour savoir si un CONDUCTEUR est
   * coupé : il doit suivre les fils et les ponts de bornier seulement. S'il suit
   * aussi les contacts et les récepteurs, la moindre branche parallèle — le
   * voyant, par exemple — referme le circuit et un fil coupé reste tracé en noir.
   */
  nature?: 'fil' | 'contact' | 'charge' | 'source';
}

/**
 * Résistances du circuit de commande (Ω).
 *
 * - `FIL` : un mètre de conducteur souple 1,5 mm² en cuivre vaut
 *   ρ·L/S = 0,0175 × 1 / 1,5 ≈ 0,012 Ω. On retient 0,08 Ω pour un fil de commande
 *   avec ses deux serrages — l'ordre de grandeur de ce qu'on relève en atelier.
 * - `CONTACT` : résistance d'un contact de commande propre, quelques dizaines de mΩ.
 * - `SECONDAIRE` : impédance interne du secondaire du transformateur de commande.
 * - `BOBINE` et `LAMPE` : valeurs par défaut, écrasées par ce que le TP déclare
 *   dans ses tests hors tension quand il les donne (voir `resistanceDeclaree`).
 */
export const R = { FIL: 0.08, CONTACT: 0.04, SECONDAIRE: 2, BOBINE: 100, LAMPE: 2400 } as const;

/** Impédance d'entrée d'un voltmètre TRMS courant (Ω). */
export const R_VOLTMETRE = 1e7;

/** Ce qu'une panne injectée fait au réseau : couper une branche ou ouvrir un contact. */
export interface EffetPanne {
  /** Identifiant de branche coupée (« x2_6.b>km1.A1 »), dans l'ordre du TP ou l'inverse. */
  coupe?: string;
  /** Identifiant de slot ou repère d'organe dont le contact reste ouvert. */
  ouvre?: string;
}

/** État du montage au moment de la mesure, tel que l'élève l'a réglé. */
export interface Contexte {
  /** Bouton de marche maintenu appuyé pendant la mesure. */
  marcheMaintenue: boolean;
}

const cle = (a: string, b: string): string => (a < b ? `${a}>${b}` : `${b}>${a}`);

/**
 * Résistance que le TP déclare pour un organe, lue dans ses tests hors tension
 * (« ≈ 100 Ω (bobine 24 V) »). Le simulateur ne doit pas afficher une valeur que
 * l'énoncé contredit : si le TP annonce un chiffre, c'est celui-là qui fait foi.
 */
export function resistanceDeclaree(tp: Pick<TpDefinition, 'tests'>, motif: RegExp): number | null {
  for (const t of tp.tests) {
    if (!motif.test(t.expected) && !motif.test(t.how)) continue;
    const m = /(\d+(?:[.,]\d+)?)\s*(k?)Ω/.exec(t.expected);
    if (m) return Number(m[1].replace(',', '.')) * (m[2] ? 1000 : 1);
  }
  return null;
}

/** Effet d'une panne sur le réseau, tel que le TP le déclare. */
export const effetDe = (f: Fault | undefined): EffetPanne =>
  f ? { coupe: f.coupe, ouvre: f.ouvre } : {};

/**
 * Réseau du circuit de commande tel qu'il est câblé à cet instant.
 *
 * Rien n'est écrit en dur : les fils sont ceux que l'élève a posés, les contacts
 * viennent du pupitre et des appareils déclarés par le TP, et leur état vient de
 * la simulation.
 */
export function reseauCommande(
  tp: TpDefinition,
  st: Pick<AttemptState, 'wires' | 'fault'>,
  sim: SimState,
  ctx: Contexte,
): Arete[] {
  const e: Arete[] = [];
  const panne = effetDe(tp.faults.find(f => f.id === st.fault));
  const coupee = (id: string): boolean => panne.coupe != null && cle(...(panne.coupe.split('>') as [string, string])) === id;
  const ouvert = (organe: string): boolean => panne.ouvre === organe;

  /** Fil posé par l'élève : il disparaît du réseau si la panne l'a coupé. */
  const fil = (a: string, b: string) => {
    const id = cle(a, b);
    if (!coupee(id)) e.push({ a, b, r: R.FIL, id, nature: 'fil' });
  };
  /** Contact : il n'est dans le réseau que fermé, et la panne peut le forcer ouvert. */
  const contact = (a: string, b: string, ferme: boolean, organe: string) => {
    if (ferme && !ouvert(organe)) {
      e.push({ a, b, r: R.CONTACT, id: `${organe}:${a}-${b}`, nature: 'contact' });
    }
  };

  // ---- source : le secondaire du transformateur, présent même hors tension
  const t1 = tp.slots.find(s => s.key === 'trafo');
  if (t1) {
    e.push({ a: `${t1.id}.24`, b: `${t1.id}.0V`, r: R.SECONDAIRE, id: 'SOURCE', nature: 'source' });
  }

  // ---- fils de commande posés par l'élève (et ceux de l'installateur)
  for (const w of st.wires) {
    if (w.net === 'C' || w.net === 'C0') fil(w.a, w.b);
  }

  // ---- fils de puissance : continuité seulement (voir `puissance` ci-dessus)
  for (const w of st.wires) {
    if (w.net === 'C' || w.net === 'C0' || w.net === 'BAR') continue;
    const id = cle(w.a, w.b);
    if (!coupee(id)) e.push({ a: w.a, b: w.b, r: R.FIL, id, puissance: true, nature: 'fil' });
  }

  // ---- les deux faces d'une borne de bornier sont le MÊME point électrique.
  // Sans ce pont, tout ce qui est câblé en porte (pupitre, voyant) se retrouve
  // détaché du reste et aucune mesure ne traverse le bornier.
  //
  // Le pont hérite de la nature du bornier : celui d'une borne de PUISSANCE est
  // marqué comme tel, sinon les bornes du bornier X1 entreraient dans le calcul
  // des potentiels de la commande et se retrouveraient à 24 V.
  const faces = new Map<string, { cotes: Set<string>; puissance: boolean }>();
  for (const w of st.wires) {
    const cmd = w.net === 'C' || w.net === 'C0';
    for (const t of [w.a, w.b]) {
      const m = /^(.+)\.(a|b)$/.exec(t);
      if (!m) continue;
      const l = faces.get(m[1]) ?? { cotes: new Set<string>(), puissance: true };
      l.cotes.add(t);
      if (cmd) l.puissance = false;
      faces.set(m[1], l);
    }
  }
  for (const [slot, l] of Array.from(faces)) {
    const cotes = Array.from(l.cotes);
    if (cotes.length < 2) continue;
    e.push({
      a: cotes[0], b: cotes[1], r: R.CONTACT, id: `${slot}-borne`, nature: 'fil',
      ...(l.puissance ? { puissance: true } : {}),
    });
  }

  // ---- organes de la platine
  const rBobine = resistanceDeclaree(tp, /bobine/i) ?? R.BOBINE;
  for (const slot of tp.slots) {
    const id = slot.id;
    if (id === 'f3') {
      contact(`${id}.1`, `${id}.2`, sim.f3 && sim.fault !== 'f3', 'f3');
      // Protection PHASE + NEUTRE : le second pôle sectionne le conducteur de
      // retour en même temps que le premier coupe l'actif. Il ne porte pas de
      // cartouche — un défaut ne le fait pas fondre — mais il s'ouvre avec
      // l'appareil, et l'élève doit retrouver ce sectionnement à l'ohmmètre.
      const pn = tp.slots.find(x => x.id === id)?.key;
      if (pn === 'fuse1pn' || pn === 'mcb1pn' || pn === 'mcb2p') contact(`${id}.N`, `${id}.N2`, sim.f3, `${id}-n`);
    }
    if (id === 'f1') {
      contact(`${id}.95`, `${id}.96`, !sim.f1trip, 'f1');
      contact(`${id}.97`, `${id}.98`, sim.f1trip, 'f1-no');
    }
    if (slot.key?.startsWith('kontakt') || id === 'km1' || id === 'km2') {
      contact(`${id}.13`, `${id}.14`, sim.km1, `${id}-am`);
      e.push({ a: `${id}.A1`, b: `${id}.A2`, r: rBobine, id: `${id}-bobine`, nature: 'charge' });
    }
  }

  // ---- pupitre : contacts NC de la chaîne d'arrêt, contacts NO de marche, voyants
  const rLampe = resistanceDeclaree(tp, /voyant|lampe/i) ?? R.LAMPE;
  for (const p of pupitreOf(tp)) {
    if (p.kind === 'nc') contact(`${p.rep}.21`, `${p.rep}.22`, !isLatched(sim, p.rep), p.rep);
    if (p.kind === 'no') contact(`${p.rep}.13`, `${p.rep}.14`, ctx.marcheMaintenue, p.rep);
    if (p.kind === 'lamp') {
      e.push({ a: `${p.rep}.X1`, b: `${p.rep}.X2`, r: rLampe, id: `${p.rep}-lampe`, nature: 'charge' });
    }
  }

  // ---- interrupteur de position : contact NF commandé par le carter
  if (tp.interPosition) {
    const rep = tp.interPosition.rep;
    contact(`${rep}.X1`, `${rep}.X2`, sim.carter, rep);
  }

  return e;
}

/* ------------------------------------------------------- résolution */

/** Élimination de Gauss avec pivot partiel. `null` si la matrice est singulière. */
function gauss(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    if (Math.abs(A[p][i]) < 1e-12) return null;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const k = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= k * A[i][c];
      b[r] -= k * b[i];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

/** Nœuds atteignables depuis `depart`. */
function composante(e: readonly Arete[], depart: string): string[] {
  const vus = new Set([depart]);
  const pile = [depart];
  while (pile.length) {
    const cur = pile.pop()!;
    for (const x of e) {
      if (x.a === cur && !vus.has(x.b)) { vus.add(x.b); pile.push(x.b); }
      if (x.b === cur && !vus.has(x.a)) { vus.add(x.a); pile.push(x.a); }
    }
  }
  return Array.from(vus);
}

/** Les deux bornes de la source du réseau. */
function bornesSource(e: readonly Arete[]): [string, string] | null {
  const s = e.find(x => x.id === 'SOURCE');
  return s ? [s.a, s.b] : null;
}

/**
 * Tension lue entre deux bornes, circuit sous tension (V).
 *
 * `u` est la tension réellement délivrée par le secondaire — celle que fixent les
 * prises câblées, pas une constante (voir `src/lib/sim/trafo.ts`).
 */
export function tensionCommande(
  e: readonly Arete[],
  a: string,
  b: string,
  u: number,
): number | null {
  const src = bornesSource(e);
  if (!src || a === b) return src ? 0 : null;
  // le voltmètre lui-même referme le circuit : sans ses 10 MΩ, une borne que rien
  // n'alimente n'a pas de potentiel défini et la résolution échoue
  // les branches de puissance ne portent pas le 24 V : on les écarte du calcul
  const ar: Arete[] = [...e.filter(x => !x.puissance), { a, b, r: R_VOLTMETRE }];
  const comp = composante(ar, a);
  if (!comp.includes(src[0]) || !comp.includes(src[1])) return 0;   // îlot sans source

  const idx = new Map(comp.map((n, i) => [n, i]));
  const n = comp.length;
  const G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const I = new Array<number>(n).fill(0);
  for (const x of ar) {
    if (x.id === 'SOURCE') continue;              // la source n'est pas une charge
    const p = idx.get(x.a), q = idx.get(x.b);
    if (p === undefined || q === undefined || p === q) continue;
    const g = 1 / x.r;
    G[p][p] += g; G[q][q] += g; G[p][q] -= g; G[q][p] -= g;
  }
  for (const [nom, v] of [[src[0], u], [src[1], 0]] as [string, number][]) {
    const i = idx.get(nom)!;
    G[i] = new Array<number>(n).fill(0);
    G[i][i] = 1;
    I[i] = v;
  }
  const v = gauss(G, I);
  if (!v) return 0;
  return Math.abs(v[idx.get(a)!] - v[idx.get(b)!]);
}

/**
 * Résistance entre deux bornes, circuit hors tension (Ω).
 * `null` : les deux pointes ne sont pas dans le même morceau de circuit — OL.
 */
export function resistanceCommande(e: readonly Arete[], a: string, b: string): number | null {
  if (a === b) return 0;
  const comp = composante(e, a);
  if (!comp.includes(b)) return null;

  const idx = new Map(comp.map((n, i) => [n, i]));
  const n = comp.length;
  const G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const x of e) {
    const p = idx.get(x.a), q = idx.get(x.b);
    if (p === undefined || q === undefined || p === q) continue;
    const g = 1 / x.r;
    G[p][p] += g; G[q][q] += g; G[p][q] -= g; G[q][p] -= g;
  }
  // on injecte 1 A en a, on le ressort en b, et on ancre b à 0 V
  const ia = idx.get(a)!, ib = idx.get(b)!;
  const I = new Array<number>(n).fill(0);
  I[ia] = 1; I[ib] = -1;
  const garde = Array.from({ length: n }, (_, i) => i).filter(i => i !== ib);
  const m = garde.map(r => garde.map(c => G[r][c]));
  const rhs = garde.map(r => I[r]);
  const v = gauss(m, rhs);
  if (!v) return null;
  const pos = garde.indexOf(ia);
  return pos < 0 ? 0 : Math.round(Math.abs(v[pos]) * 100) / 100;
}
