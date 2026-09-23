/**
 * Modèles de fonctionnement des TP platine du sujet numérique EIP (mode « câblage réel »).
 *
 * Le moteur du parcours (`src/lib/sim/`) sait ce que valent les mesures ; il ne sait pas
 * dire si l'horloge enclenche le contacteur, si l'actionneur allume la lampe ou si le relais
 * de la centrale déverrouille la gâche. Ce module le dit, à partir du câblage RÉEL de l'élève
 * (fils posés + liaisons de l'installateur) et de l'état des organes de la simulation :
 *
 *  - chaque fil est une arête ; les appareils ajoutent leurs passages internes (pôle d'un
 *    disjoncteur fermé, contact d'un relais collé, borne de passage d'un bornier) ;
 *  - une union-find donne les équipotentielles ; une charge est alimentée si ses deux bornes
 *    sont sur les deux pôles de sa source (phase / neutre, + / −, 12 V~) sans court-circuit ;
 *  - les relais dépendent des charges (bobine, actionneur sur le bus, centrale alimentée) :
 *    on itère jusqu'à stabilité (quelques passes suffisent).
 *
 * Pur, sans React : `CablageReel.tsx` s'en sert pour la mise sous tension et l'essai.
 */
import type { SimState } from '@/lib/sim/engine';
import type { AttemptState, TpDefinition } from '@/lib/types';

type Arete = [string, string];

/** Commandes de l'essai : interrupteurs, badge, horloge… (valeurs propres à chaque modèle). */
export type Entrees = Record<string, boolean | string | null>;

/** Un organe de sectionnement de la platine, dans l'ordre de fermeture. */
export interface Organe {
  /** Identifiant de slot (`q1`, `f2`, `f3`, organe supplémentaire). */
  id: string;
  /** Libellé de l'organe (« Q7 · protection du contacteur »). */
  label: string;
}

/** Un voyant d'état affiché à la mise sous tension et à l'essai. */
export interface Voyant {
  id: string;
  label: string;
  on: boolean;
  /** Teinte quand il est allumé. */
  tone?: 'good' | 'accent' | 'crit';
  /** Où signaler l'état sur la platine : près de cette borne, décalé de (dx, dy). */
  ancre?: { borne: string; dx: number; dy: number };
  /** Pictogramme affiché sur la platine quand il est allumé. */
  picto?: string;
}

export interface Evaluation {
  /** Voyants de la mise sous tension (alimentations, bus…). */
  alim: Voyant[];
  /** Récepteurs (chauffe-eau, lampes, volets, gâche) : ce que l'essai doit faire fonctionner. */
  recepteurs: Voyant[];
  /** La mise sous tension est réussie : organes fermés, alimentations présentes. */
  sousTension: boolean;
}

/** Un bouton de l'essai. */
export interface CommandeEssai {
  id: string;
  label: string;
  /** Aide sous le bouton. */
  sub?: string;
  /** Effet de l'appui sur les commandes. */
  effet: (e: Entrees) => Entrees;
  /**
   * Impulsion : l'effet ne dure que le temps de la temporisation (relais de la centrale),
   * puis `relache` remet les commandes au repos.
   */
  relache?: (e: Entrees) => Entrees;
  /** Le bouton est-il « enfoncé » (état affiché) ? */
  actif?: (e: Entrees) => boolean;
}

export interface ModelePlatine {
  tpId: string;
  organes: (tp: TpDefinition) => Organe[];
  entreesInitiales: Entrees;
  commandes: CommandeEssai[];
  evaluer: (tp: TpDefinition, st: AttemptState, sim: SimState, e: Entrees) => Evaluation;
  /**
   * Observations de l'essai, notées au fil des manœuvres : identifiants à ajouter à
   * l'ensemble des observations déjà faites, d'après l'état courant.
   */
  observer: (ev: Evaluation, e: Entrees) => string[];
  /** Observations requises pour que l'essai soit réussi, avec leur libellé. */
  attendus: { id: string; label: string }[];
  /** Consigne de l'essai. */
  consigne: string;
}

/* ------------------------------------------------------------ union-find */

function equipotentielles(aretes: readonly Arete[]): (x: string) => string {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r) as string;
    let c = x;
    while (parent.has(c) && parent.get(c) !== r) { const n = parent.get(c) as string; parent.set(c, r); c = n; }
    if (!parent.has(r)) parent.set(r, r);
    return r;
  };
  for (const [a, b] of aretes) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  return find;
}

/** Fils présents : ceux de l'élève et ceux de l'installateur. */
function filsPoses(tp: TpDefinition, st: AttemptState): Arete[] {
  return [
    ...tp.liaisons.filter(l => l.prewired).map(l => [l.a, l.b] as Arete),
    ...st.wires.map(w => [w.a, w.b] as Arete),
  ];
}

/** Bornes de passage des borniers (face a ↔ face b). */
function passagesBorniers(tp: TpDefinition): Arete[] {
  return tp.slots.filter(s => s.group).map(s => [`${s.id}.a`, `${s.id}.b`] as Arete);
}

/** Pôles d'un disjoncteur phase + neutre fermé. */
const poles = (id: string): Arete[] => [[`${id}.1`, `${id}.2`], [`${id}.N`, `${id}.N2`]];

/** État fermé d'un organe dans la simulation. */
export function organeFerme(sim: SimState, id: string): boolean {
  if (id === 'q1') return sim.q1;
  if (id === 'f2') return sim.f2;
  if (id === 'f3') return sim.f3;
  return sim.aux?.[id] === true;
}

/** Charge alimentée : ses deux bornes sur les deux pôles de la source, sans court-circuit. */
function alimentee(find: (x: string) => string, a: string, b: string, p: string, n: string): boolean {
  const rp = find(p), rn = find(n);
  if (rp === rn) return false;
  const ra = find(a), rb = find(b);
  return (ra === rp && rb === rn) || (ra === rn && rb === rp);
}

const base = (tp: TpDefinition, st: AttemptState, sim: SimState, organes: string[]): Arete[] => [
  ...filsPoses(tp, st),
  ...passagesBorniers(tp),
  ...organes.filter(id => organeFerme(sim, id)).flatMap(poles),
];

/* ------------------------------------------------------------ Q13 · cumulus */

const Q13: ModelePlatine = {
  tpId: 'eip-q13-cumulus',
  organes: () => [
    { id: 'q1', label: 'Q7 · protection du contacteur et du chauffe-eau' },
    { id: 'f2', label: 'Q6 · protection de l’horloge' },
    { id: 'f3', label: 'KM1 · manette sur AUTO' },
  ],
  entreesInitiales: { horloge: false },
  commandes: [
    { id: 'hc', label: 'Horloge : heures creuses', sub: 'contact 1-4 fermé', effet: e => ({ ...e, horloge: true }), actif: e => e.horloge === true },
    { id: 'hp', label: 'Horloge : heures pleines', sub: 'contact 1-4 ouvert', effet: e => ({ ...e, horloge: false }), actif: e => e.horloge !== true },
  ],
  consigne: 'Programme l’horloge : en heures creuses son contact 1-4 se ferme et doit enclencher KM1, qui alimente le chauffe-eau ; en heures pleines tout s’arrête.',
  evaluer(tp, st, sim, e) {
    const aretes0 = base(tp, st, sim, ['q1', 'f2']);
    let km = false;
    let horloge = false;
    let find = equipotentielles(aretes0);
    for (let i = 0; i < 4; i++) {
      const extra: Arete[] = [];
      if (horloge && e.horloge === true) extra.push(['ih.1', 'ih.4']);
      if (km && sim.f3) extra.push(['f3.1', 'f3.2'], ['f3.3', 'f3.4']);
      find = equipotentielles([...aretes0, ...extra]);
      horloge = alimentee(find, 'ih.U1', 'ih.U2', 'RES.L1', 'RES.N');
      km = alimentee(find, 'f3.A1', 'f3.A2', 'RES.L1', 'RES.N');
    }
    const ce = alimentee(find, 'CE.X1', 'CE.X2', 'RES.L1', 'RES.N');
    const fermes = ['q1', 'f2', 'f3'].every(id => organeFerme(sim, id));
    return {
      alim: [
        { id: 'horloge', label: 'Horloge alimentée (U1 – U2)', on: horloge, tone: 'good' },
        { id: 'contact', label: 'Contact d’horloge 1-4 fermé', on: horloge && e.horloge === true, tone: 'accent' },
        { id: 'km1', label: 'Bobine de KM1 alimentée (A1 – A2)', on: km, tone: 'accent' },
      ],
      recepteurs: [{ id: 'ce', label: 'Chauffe-eau alimenté', on: ce, tone: 'crit', ancre: { borne: 'CE.X2', dx: 0, dy: 64 }, picto: '♨' }],
      sousTension: fermes && horloge,
    };
  },
  observer(ev, e) {
    const ce = ev.recepteurs[0].on;
    const out: string[] = [];
    if (ev.sousTension && e.horloge === true && ce) out.push('marche');
    if (ev.sousTension && e.horloge === false && !ce) out.push('arret');
    return out;
  },
  attendus: [
    { id: 'marche', label: 'Heures creuses : KM1 enclenche, le chauffe-eau chauffe' },
    { id: 'arret', label: 'Heures pleines : KM1 retombe, le chauffe-eau s’arrête' },
  ],
};

/* ------------------------------------------------------------ Q58 · MyHOME */

const ACT = ['ka1', 'ka4', 'ka5', 'ka2', 'ka3', 'cad'];
const VOLETS = ['v1', 'v2', 'v3', 'v4', 'v5'];

const Q58: ModelePlatine = {
  tpId: 'eip-q58-myhome',
  organes: () => [
    { id: 'q1', label: 'Q1 · tête du tableau (40 A 30 mA)' },
    { id: 'f2', label: 'Q2 · alimentation du bus AL1' },
    { id: 'f3', label: 'Q3 · éclairage atelier' },
    { id: 'q8', label: 'Q8 · éclairage sanitaire' },
    { id: 'q6', label: 'Q6 · éclairage atelier électronique' },
    { id: 'q4', label: 'Q4 · volets atelier (V1, V2)' },
    { id: 'q5', label: 'Q5 · volets atelier (V3, V4)' },
    { id: 'q7', label: 'Q7 · volet atelier électronique (V5)' },
  ],
  entreesInitiales: { atelier: false, sanitaire: false, elec: false, volets: null, voletElec: null },
  commandes: [
    { id: 's21', label: 'S2-1 · éclairage atelier', sub: 'ON / OFF', effet: e => ({ ...e, atelier: e.atelier !== true }), actif: e => e.atelier === true },
    { id: 's22h', label: 'S2-2 ▲ volets atelier', sub: 'montée V1 à V4', effet: e => ({ ...e, volets: 'haut' }), actif: e => e.volets === 'haut' },
    { id: 's22b', label: 'S2-2 ▼ volets atelier', sub: 'descente V1 à V4', effet: e => ({ ...e, volets: 'bas' }), actif: e => e.volets === 'bas' },
    { id: 's3', label: 'S3 · présence sanitaires', sub: 'détecteur', effet: e => ({ ...e, sanitaire: e.sanitaire !== true }), actif: e => e.sanitaire === true },
    { id: 's41', label: 'S4-1 · éclairage atelier électronique', sub: 'ON / OFF', effet: e => ({ ...e, elec: e.elec !== true }), actif: e => e.elec === true },
    { id: 's42h', label: 'S4-2 ▲ volet V5', sub: 'montée', effet: e => ({ ...e, voletElec: 'haut' }), actif: e => e.voletElec === 'haut' },
    { id: 's42b', label: 'S4-2 ▼ volet V5', sub: 'descente', effet: e => ({ ...e, voletElec: 'bas' }), actif: e => e.voletElec === 'bas' },
    {
      id: 's1', label: 'S1 · GEN OFF', sub: 'éclairages éteints, volets fermés',
      effet: e => ({ ...e, atelier: false, sanitaire: false, elec: false, volets: 'bas', voletElec: 'bas' }),
    },
  ],
  consigne: 'Agis sur les points de commande (ils sont sur le bus, hors platine) : chaque actionneur doit commuter son circuit — les trois éclairages s’allument, les cinq volets montent ou descendent.',
  evaluer(tp, st, sim, e) {
    const organes = ['q1', 'f2', 'f3', 'q8', 'q6', 'q4', 'q5', 'q7'];
    const aretes0 = base(tp, st, sim, organes);
    const find0 = equipotentielles(aretes0);
    const al1 = alimentee(find0, 'al1.L', 'al1.N', 'RES.L1', 'RES.N');
    const surBus = (k: string) => al1 && alimentee(find0, `${k}.+`, `${k}.−`, 'al1.+', 'al1.−');
    const bus = Object.fromEntries(ACT.map(k => [k, surBus(k)]));
    const extra: Arete[] = [];
    if (bus.ka1 && e.atelier === true) extra.push(['ka1.1', 'ka1.2']);
    if (bus.ka4 && e.sanitaire === true) extra.push(['ka4.1', 'ka4.2']);
    if (bus.ka5 && e.elec === true) extra.push(['ka5.2', 'ka5.3']);
    for (const k of ['ka2', 'ka3']) {
      if (!bus[k]) continue;
      if (e.volets === 'haut') extra.push([`${k}.1`, `${k}.2`], [`${k}.1`, `${k}.4`]);
      if (e.volets === 'bas') extra.push([`${k}.1`, `${k}.3`], [`${k}.1`, `${k}.5`]);
    }
    if (bus.cad && e.voletElec === 'haut') extra.push(['cad.L', 'cad.1']);
    if (bus.cad && e.voletElec === 'bas') extra.push(['cad.3', 'cad.2']);
    const find = equipotentielles([...aretes0, ...extra]);
    const ac = (a: string, b: string) => alimentee(find, a, b, 'RES.L1', 'RES.N');
    const volet = (v: string): 'haut' | 'bas' | null =>
      ac(`${v}.L1`, `${v}.N`) ? 'haut' : ac(`${v}.L2`, `${v}.N`) ? 'bas' : null;
    const nBus = ACT.filter(k => bus[k]).length;
    return {
      alim: [
        { id: 'al1', label: 'AL1 alimentée (primaire 230 V~)', on: al1, tone: 'good' },
        { id: 'bus', label: `Bus 27 V⎓ sur ${nBus} / 6 actionneurs`, on: nBus === 6, tone: 'good' },
      ],
      recepteurs: [
        ...([['L11', 'Éclairage atelier L11 à L14'], ['L1', 'Éclairage sanitaire L1 à L6'], ['L7', 'Éclairage atelier électronique L7 à L10']] as const)
          .map(([r, label]) => ({
            id: r, label, on: ac(`${r}.X1`, `${r}.X2`), tone: 'accent' as const,
            ancre: { borne: `${r}.X1`, dx: 8, dy: 44 }, picto: '💡',
          })),
        ...VOLETS.map(v => {
          const s = volet(v);
          return {
            id: v.toUpperCase(), label: `Volet ${v.toUpperCase()}${s === 'haut' ? ' ▲ monte' : s === 'bas' ? ' ▼ descend' : ''}`,
            on: s != null, tone: 'good' as const, ancre: { borne: `${v}.L2`, dx: -44, dy: 0 }, picto: s === 'bas' ? '▼' : '▲',
          };
        }),
      ],
      sousTension: organes.every(id => organeFerme(sim, id)) && al1 && nBus === 6,
    };
  },
  observer(ev) {
    return ev.recepteurs.filter(r => r.on).map(r => r.id);
  },
  attendus: [
    { id: 'L11', label: 'Éclairage atelier (KA1)' },
    { id: 'L1', label: 'Éclairage sanitaire (KA4)' },
    { id: 'L7', label: 'Éclairage atelier électronique (KA5)' },
    ...VOLETS.map(v => ({ id: v.toUpperCase(), label: `Volet ${v.toUpperCase()}` })),
  ],
};

/* ------------------------------------------------------------ Q67 · VIGIK */

const Q67: ModelePlatine = {
  tpId: 'eip-q67-vigik',
  organes: () => [
    { id: 'q1', label: 'Q100 · départ du tableau' },
    { id: 'f2', label: 'Q10 · alimentation de la centrale (AL2)' },
    { id: 'f3', label: 'Q11 · alimentation de la gâche (AL3)' },
  ],
  entreesInitiales: { badge: false, bp: false },
  commandes: [
    {
      id: 'badge', label: 'Présenter le badge', sub: 'devant la tête de lecture U1',
      effet: e => ({ ...e, badge: true }), relache: e => ({ ...e, badge: false }), actif: e => e.badge === true,
    },
    {
      id: 'bp', label: 'Appuyer sur S7', sub: 'bouton de sortie',
      effet: e => ({ ...e, bp: true }), relache: e => ({ ...e, bp: false }), actif: e => e.bp === true,
    },
  ],
  consigne: 'Présente un badge devant la tête de lecture, puis appuie sur le bouton de sortie : dans les deux cas le relais C-T de la centrale doit alimenter la gâche, qui se déverrouille.',
  evaluer(tp, st, sim, e) {
    const aretes0 = base(tp, st, sim, ['q1', 'f2', 'f3']);
    const s7: Arete[] = e.bp === true ? [['s7.13', 's7.14']] : [];
    const find0 = equipotentielles([...aretes0, ...s7]);
    const ac = (a: string, b: string, f = find0) => alimentee(f, a, b, 'RES.L1', 'RES.N');
    const al2 = ac('al2.L', 'al2.N');
    const al3 = ac('al3.P1', 'al3.P2');
    const cen = al2 && alimentee(find0, 'cen.AC1', 'cen.AC2', 'al2.+V', 'al2.−V');
    const lecteur = cen && find0('cen.L+') === find0('u1.L+') && find0('cen.L−') === find0('u1.L−')
      && find0('cen.L+') !== find0('cen.L−');
    const sortie = cen && find0('cen.BP') === find0('cen.−');
    const relais = cen && ((e.badge === true && lecteur) || (e.bp === true && sortie));
    const find = relais ? equipotentielles([...aretes0, ...s7, ['cen.C', 'cen.T']]) : find0;
    const gache = al3 && alimentee(find, 'ga1.1', 'ga1.2', 'al3.S1', 'al3.S2');
    return {
      alim: [
        { id: 'al2', label: 'AL2 alimentée · 12 V⎓', on: al2, tone: 'good' },
        { id: 'cen', label: 'Centrale alimentée (AC – AC)', on: cen, tone: 'good' },
        { id: 'lecteur', label: 'Tête de lecture raccordée (L+, L−)', on: lecteur, tone: 'good' },
        { id: 'al3', label: 'AL3 alimentée · 12 V~', on: al3, tone: 'good' },
        { id: 'relais', label: 'Relais C-T de la centrale collé', on: relais, tone: 'accent' },
      ],
      recepteurs: [{
        id: 'gache', label: 'Gâche GA1 alimentée : porte déverrouillée', on: gache, tone: 'good',
        ancre: { borne: 'ga1.1', dx: -46, dy: 8 }, picto: '🔓',
      }],
      sousTension: ['q1', 'f2', 'f3'].every(id => organeFerme(sim, id)) && cen && al3,
    };
  },
  observer(ev, e) {
    const g = ev.recepteurs[0].on;
    const out: string[] = [];
    if (g && e.badge === true) out.push('badge');
    if (g && e.bp === true) out.push('bp');
    return out;
  },
  attendus: [
    { id: 'badge', label: 'Badge présenté : la gâche se déverrouille' },
    { id: 'bp', label: 'Bouton de sortie S7 : la gâche se déverrouille' },
  ],
};

export const MODELES: Record<string, ModelePlatine> = {
  [Q13.tpId]: Q13,
  [Q58.tpId]: Q58,
  [Q67.tpId]: Q67,
};
