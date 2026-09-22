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
import { CATALOGUE_BY_KEY } from '../data/catalogue';

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

/**
 * Entrée TOR d'automate (Ω).
 *
 * Une entrée n'est pas un fil : c'est un optocoupleur avec sa résistance de
 * limitation, et c'est LUI qui referme le circuit de l'entrée vers le commun.
 * Sans cette charge dans le réseau, la chaîne d'un bouton s'arrête sur une borne
 * qui ne va nulle part : le folio la voit ouverte sur une platine saine, et
 * l'élève qui mesure entre l'entrée et le 0 V ne trouve rien alors qu'un vrai
 * appareil donne bien une valeur.
 *
 * TM221CE16R, entrées TOR type 1 au sens de la CEI 61131-2 : 3,4 kΩ pour une
 * entrée standard (7 mA sous 24 V), 4,9 kΩ pour une entrée rapide — I0.0, I0.1,
 * I0.6 et I0.7 sur cet appareil (5 mA). Les deux valeurs sont publiées par le
 * constructeur ; on ne les arrondit pas à une seule.
 */
export const R_ENTREE_API = { STANDARD: 3400, RAPIDE: 4900 } as const;

/** Entrées rapides du TM221CE16R (impédance et courant différents des autres). */
const ENTREES_RAPIDES = new Set(['I0.0', 'I0.1', 'I0.6', 'I0.7']);

/**
 * Commun de chaque sortie relais du TM221CE16R : COM0 porte Q0.0 à Q0.3, COM1
 * porte Q0.4 à Q0.6. Les deux communs ne sont pas reliés à l'intérieur de
 * l'appareil — une sortie n'est alimentée que si SON commun l'est, et c'est une
 * panne de câblage classique que l'élève doit pouvoir trouver.
 */
const communDeSortie = (borne: string): string | null => {
  const m = /^Q0\.([0-6])$/.exec(borne);
  if (!m) return null;
  return Number(m[1]) <= 3 ? 'COM0' : 'COM1';
};

/** Impédance d'entrée d'un voltmètre TRMS courant (Ω). */
export const R_VOLTMETRE = 1e7;

/** Ce qu'une panne injectée fait au réseau : couper une branche ou ouvrir un contact. */
export interface EffetPanne {
  /** Identifiant de branche coupée (« x2_6.b>km1.A1 »), dans l'ordre du TP ou l'inverse. */
  coupe?: string;
  /** Identifiant de slot ou repère d'organe dont le contact reste ouvert. */
  ouvre?: string;
  /** Deux liaisons dont les extrémités sont interverties (paire croisée). */
  croise?: [string, string];
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
/**
 * Contacts auxiliaires d'un contacteur ou d'un relais, déduits du repérage
 * normalisé EN 50005 : la DIZAINE numérote la voie, les UNITÉS disent la nature
 * du contact — 1-2 à ouverture, 3-4 à fermeture, 5-6 à ouverture temporisé,
 * 7-8 à fermeture temporisé. C'est ce qui est gravé sur l'appareil, donc ce que
 * l'élève lit ; rien n'est déclaré en plus dans le TP.
 *
 * Les bornes de puissance (1, 3, 5 / 2, 4, 6, sans dizaine) et les bornes de
 * bobine (A1, A2) sont écartées.
 */
function contactsAuxiliaires(
  it: { terminals: readonly { id: string }[] } | undefined,
): { a: string; b: string; voie: string; ouverture: boolean }[] {
  if (!it) return [];
  const voies = new Map<string, Set<string>>();
  for (const t of it.terminals) {
    const m = /^([1-9])([1-8])$/.exec(t.id);
    if (!m) continue;
    const l = voies.get(m[1]) ?? new Set<string>();
    l.add(m[2]);
    voies.set(m[1], l);
  }
  const out: { a: string; b: string; voie: string; ouverture: boolean }[] = [];
  for (const [dizaine, unites] of Array.from(voies)) {
    for (const [u1, u2, ouverture] of [['1', '2', true], ['3', '4', false], ['5', '6', true], ['7', '8', false]] as const) {
      if (unites.has(u1) && unites.has(u2)) {
        out.push({ a: `#.${dizaine}${u1}`, b: `#.${dizaine}${u2}`, voie: `${dizaine}${u1}`, ouverture });
      }
    }
  }
  return out;
}

export const effetDe = (f: Fault | undefined): EffetPanne =>
  f ? { coupe: f.coupe, ouvre: f.ouvre, croise: f.croise } : {};

/**
 * La panne active coupe-t-elle la liaison a–b ? Utile hors du calcul de réseau —
 * par exemple pour empêcher la mise en marche d'un onduleur dont l'alimentation
 * continue est débranchée. L'ordre des bornes est indifférent.
 */
export function liaisonCoupee(
  tp: Pick<TpDefinition, 'faults'>,
  faultId: string | null | undefined,
  a: string,
  b: string,
): boolean {
  const panne = effetDe(tp.faults.find(f => f.id === faultId));
  // une paire croisée retire aussi les deux liaisons d'origine
  if (panne.croise?.some(c => cle(...(c.split('>') as [string, string])) === cle(a, b))) return true;
  if (panne.coupe == null) return false;
  const [ca, cb] = panne.coupe.split('>') as [string, string];
  return cle(ca, cb) === cle(a, b);
}

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
  const croisees = new Set((panne.croise ?? []).map(c => cle(...(c.split('>') as [string, string]))));
  const coupee = (id: string): boolean =>
    (panne.coupe != null && cle(...(panne.coupe.split('>') as [string, string])) === id) || croisees.has(id);
  const ouvert = (organe: string): boolean => panne.ouvre === organe;

  /** Fil posé par l'élève : il disparaît du réseau si la panne l'a coupé. */
  const fil = (a: string, b: string) => {
    const id = cle(a, b);
    if (!coupee(id)) e.push({ a, b, r: R.FIL, id, nature: 'fil' });
  };
  /**
   * Bornes réellement raccordées. Un appareil a souvent des contacts de réserve —
   * un CAD 32 en porte cinq, le montage n'en utilise que trois. Un contact que
   * personne n'a câblé ne fait pas partie du circuit : il n'a pas à figurer au
   * folio, et une pointe posée dessus ne doit rien trouver.
   */
  const cablees = new Set<string>();
  for (const w of st.wires) { cablees.add(w.a); cablees.add(w.b); }

  /** Contact : il n'est dans le réseau que fermé, et la panne peut le forcer ouvert. */
  const contact = (a: string, b: string, ferme: boolean, organe: string) => {
    if (!cablees.has(a) || !cablees.has(b)) return;
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

  // ---- fils de puissance : continuité seulement (voir `puissance` ci-dessus).
  // Les barrettes de la plaque à bornes du MOTEUR en font partie : une barrette absente
  // se cherche à l'ohmmètre entre U2, V2 et W2 comme n'importe quel conducteur. Les
  // barrettes d'un transformateur à prises, elles, restent l'affaire de `trafo.ts`.
  for (const w of st.wires) {
    if (w.net === 'C' || w.net === 'C0') continue;
    if (w.net === 'BAR' && !(w.a.startsWith('M.') && w.b.startsWith('M.'))) continue;
    const id = cle(w.a, w.b);
    if (!coupee(id)) e.push({ a: w.a, b: w.b, r: R.FIL, id, puissance: true, nature: 'fil' });
  }
  // ---- paire croisée : les deux conducteurs arrivent chacun sur la borne de l'autre
  if (panne.croise) {
    const [[a1, b1], [a2, b2]] = panne.croise.map(c => c.split('>')) as [[string, string], [string, string]];
    const posees = new Set(st.wires.map(w => cle(w.a, w.b)));
    if (posees.has(cle(a1, b1)) && posees.has(cle(a2, b2))) {
      e.push({ a: a1, b: b2, r: R.FIL, id: cle(a1, b2), puissance: true, nature: 'fil' });
      e.push({ a: a2, b: b1, r: R.FIL, id: cle(a2, b1), puissance: true, nature: 'fil' });
    }
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

  // ---- passages internes (cartouche d'un porte-fusible, bornier d'une boîte de
  // jonction) : l'appareil se traverse à l'ohmmètre, sauf si la panne l'a ouvert.
  const passages = (prefixe: string, key: string, organe: string) => {
    for (const [a, b] of CATALOGUE_BY_KEY[key]?.passes ?? []) {
      contact(`${prefixe}.${a}`, `${prefixe}.${b}`, true, organe);
    }
  };
  for (const slot of tp.slots) passages(slot.id, slot.key, slot.id);
  for (const it of [...(tp.annexItems ?? []), ...(tp.recvItems ?? [])]) passages(it.rep, it.key, it.rep);

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
    // ---- bloc de contacts auxiliaires clipsé sur une protection (GV-AE1 sur le GV2ME) :
    // son contact NO 13-14 suit l'appareil qui le porte. Il s'ouvre quand la protection
    // est ouverte OU déclenchée — c'est lui qui coupe le 24 V de commande — et une panne
    // qui « ouvre » la protection l'ouvre avec elle (même organe).
    if (slot.key === 'gvae1') {
      const porteur = slot.auxDe ?? 'f3';
      const ferme = porteur === 'f3' ? sim.f3 && sim.fault !== 'f3'
        : porteur === 'f2' ? sim.f2 : porteur === 'q1' ? sim.q1 : true;
      contact(`${id}.13`, `${id}.14`, ferme, porteur);
    }
    if (id === 'f1') {
      contact(`${id}.95`, `${id}.96`, !sim.f1trip, 'f1');
      contact(`${id}.97`, `${id}.98`, sim.f1trip, 'f1-no');
    }
    // ---- contacteurs et relais auxiliaires : bobine + contacts déduits du repérage
    const it = slot.key ? CATALOGUE_BY_KEY[slot.key] : undefined;
    const aBobine = !!it && it.kind === 'contactor' && it.terminals.some(t => t.id === 'A1');
    if (aBobine || id === 'km1' || id === 'km2') {
      // Le simulateur ne connaît qu'un seul appareil enclenché : KM1. Tous les
      // autres — second contacteur d'un inverseur, relais d'une séquence câblée —
      // sont AU REPOS, et leurs contacts se lisent dans cette position. C'est
      // exactement ce qu'on mesure sur une platine consignée.
      const colle = id === 'km1' ? sim.km1 : false;
      e.push({ a: `${id}.A1`, b: `${id}.A2`, r: rBobine, id: `${id}-bobine`, nature: 'charge' });
      for (const c of contactsAuxiliaires(it)) {
        contact(c.a.replace('#', id), c.b.replace('#', id), c.ouverture ? !colle : colle, `${id}-${c.voie}`);
      }
      if (!it) contact(`${id}.13`, `${id}.14`, colle, `${id}-am`);
    }
    // ---- capteur de position à galet : au repos, le galet n'est pas actionné.
    // Le simulateur n'anime pas le passage du mobile : la séquence se raisonne sur
    // le folio et se contrôle à l'ohmmètre, appareil par appareil.
    if (slot.key === 'limitswitch') {
      contact(`${id}.11`, `${id}.12`, true, `${id}`);
      contact(`${id}.11`, `${id}.14`, false, `${id}-no`);
    }
    // ---- automate programmable : entrées et sorties relais.
    //
    // L'automate n'est pas un bornier. Une ENTRÉE est une charge — l'optocoupleur
    // et sa résistance — entre la borne et le commun ; une SORTIE relais est un
    // contact sec entre son commun et sa borne. Tant que ces branches manquaient
    // au réseau, le circuit de commande de ce TP s'arrêtait à chaque borne de
    // l'appareil : ni folio complet, ni mesure possible au bout d'une chaîne.
    //
    // L'état des sorties se lit comme celui de tous les autres organes : la
    // platine est AU REPOS, sauf ce que la simulation a fait coller. Le programme
    // n'est pas exécuté ici — un automate se dépanne à l'instrument, borne par
    // borne, pas en devinant le code.
    if (it?.kind === 'plc') {
      // L'entrée se referme sur le COMMUN des entrées quand il est câblé (alimentation
      // de commande extérieure, COM ramené à son 0 V) ; sinon, comme sur la platine
      // historique, sur le 0 V de l'alimentation capteurs de l'automate.
      const retour = cablees.has(`${id}.COM`) ? `${id}.COM` : `${id}.0V`;
      for (const t of it.terminals) {
        if (/^I0\.[0-8]$/.test(t.id)) {
          const borne = `${id}.${t.id}`;
          if (!cablees.has(borne)) continue;
          e.push({
            a: borne, b: retour, id: `${id}-${t.id}`, nature: 'charge',
            r: ENTREES_RAPIDES.has(t.id) ? R_ENTREE_API.RAPIDE : R_ENTREE_API.STANDARD,
          });
        }
        const com = communDeSortie(t.id);
        if (com) {
          // Q0.0 pilote la bobine, Q0.1 le voyant de marche : tous deux suivent
          // l'état du départ. Q0.2 est le voyant de défaut : il est actionné
          // quand le thermique est déclenché, donc l'inverse du repos.
          const suit = tp.plcSorties ? (tp.plcSorties[t.id] ?? 'off') : (t.id === 'Q0.2' ? 'trip' : 'km1');
          const ferme = suit === 'km1' ? sim.km1 : suit === 'trip' ? sim.f1trip : false;
          contact(`${id}.${com}`, `${id}.${t.id}`, ferme, `${id}-${t.id}`);
        }
      }
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
