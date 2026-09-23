/**
 * Modèles de fonctionnement des TP platine des sujets numériques (mode « câblage réel ») :
 * EIP (Q13, Q58, Q67) et Scierie (D.3.1 variateur ATV340, E.3.4.3 câblage DC des strings).
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
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { MODULES_PAR_PANNEAU, VMPP_NOCT, VOC_NOCT } from '@/lib/data/tps/scierie-e343-dc';

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

/**
 * Afficheur d'un appareil (écran du variateur, de l'onduleur) : quelques lignes de texte
 * dessinées sur la platine, à l'endroit de l'écran du sprite.
 */
export interface Afficheur {
  id: string;
  /** Position : près de cette borne, décalée de (dx, dy) — coin haut-gauche de l'écran. */
  ancre: { borne: string; dx: number; dy: number };
  /** Taille de l'écran (unités de platine). */
  w: number;
  h: number;
  lignes: string[];
  /** Écran éteint (appareil hors tension). */
  eteint?: boolean;
}

export interface Evaluation {
  /** Voyants de la mise sous tension (alimentations, bus…). */
  alim: Voyant[];
  /** Récepteurs (chauffe-eau, lampes, volets, gâche) : ce que l'essai doit faire fonctionner. */
  recepteurs: Voyant[];
  /** La mise sous tension est réussie : organes fermés, alimentations présentes. */
  sousTension: boolean;
  /** Vitesse du moteur de la platine (tr/min), quand le TP en a un. */
  rpm?: number;
  /** État affiché d'appareils que la simulation ne manœuvre pas (sélecteur S2…). */
  etats?: Record<string, 'on' | 'off'>;
  /** Écrans des appareils. */
  afficheurs?: Afficheur[];
  /** Grandeurs calculées (fréquence, tensions…), lues par `observer`. */
  valeurs?: Record<string, number>;
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
  actif?: (e: Entrees, sim: SimState) => boolean;
  /**
   * Le bouton manœuvre un ORGANE de la simulation (identifiant de slot) au lieu de changer
   * les commandes : c'est l'appareil de la platine lui-même (sélecteur de marche).
   */
  organe?: string;
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
  /**
   * Appareils de la platine manœuvrés au clic pendant l'essai sans être des organes de la
   * simulation (slot → effet sur les commandes) : le sélecteur S2 se tourne sur la platine.
   */
  surAppareil?: Record<string, (e: Entrees) => Entrees>;
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

/* ------------------------------------------------------------ Scierie · D.3.1 · ATV340 */

/** Vitesses présélectionnées réglées sur le variateur (D.3.2, D.3.3) : 1 000 et 1 500 tr/min, 4 pôles. */
const SP2 = 100 / 3;
const SP4 = 50;
const virgule = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

const D31: ModelePlatine = {
  tpId: 'scierie-d31-atv340',
  organes: () => [
    { id: 'q1', label: 'Q1 · interrupteur-sectionneur INS80 (consignation)' },
    { id: 'f2', label: 'Q2 · disjoncteur NSX100 · ligne du variateur' },
  ],
  entreesInitiales: { s2: '1' },
  commandes: [
    { id: 's1', label: 'S1 · marche avant', sub: 'sélecteur 0 / I', organe: 'f3', effet: e => e, actif: (_e, sim) => sim.f3 },
    { id: 's2p1', label: 'S2 · position 1', sub: 'petite vitesse (PV)', effet: e => ({ ...e, s2: '1' }), actif: e => e.s2 !== '2' },
    { id: 's2p2', label: 'S2 · position 2', sub: 'grande vitesse (GV)', effet: e => ({ ...e, s2: '2' }), actif: e => e.s2 === '2' },
  ],
  surAppareil: { s2: e => ({ ...e, s2: e.s2 === '2' ? '1' : '2' }) },
  consigne: 'Mets S1 sur I (marche avant), puis tourne S2 : en position 1, le variateur doit donner la vitesse '
    + 'présélectionnée 2 (33,3 Hz, petite vitesse) ; en position 2, la vitesse présélectionnée 4 (50 Hz, grande '
    + 'vitesse). S1 sur 0 : la turbine s’arrête. Les sélecteurs se manœuvrent aussi sur la platine.',
  evaluer(tp, st, sim, e) {
    // La puissance est posée par l'installateur : Q1 et Q2 fermés, le variateur est alimenté
    // et sa sortie +24 V interne (24V / 0V) existe.
    const alim = organeFerme(sim, 'q1') && organeFerme(sim, 'f2');
    const aretes: Arete[] = [...filsPoses(tp, st), ...passagesBorniers(tp)];
    if (sim.f3) aretes.push(['f3.13', 'f3.14']);                          // S1 sur I
    aretes.push(e.s2 === '2' ? ['s2.13', 's2.14'] : ['s2.21', 's2.22']);  // S2 : position 2 / 1
    const find = equipotentielles(aretes);
    const court = find('u1.24V') === find('u1.0V');
    // Une entrée logique est active quand elle est reliée à la borne 24V du variateur.
    const di = (n: string) => alim && !court && find(`u1.${n}`) === find('u1.24V');
    const marche = di('DI1');
    const pv = di('DI3');
    const gv = di('DI4');
    // Vitesses présélectionnées : DI4 (vitesse 4) l'emporte sur DI3 (vitesse 2) ; sans l'une ni
    // l'autre, la consigne vient de AI1 — non câblée, donc 0 Hz : marche sans vitesse.
    const f = alim && marche ? (gv ? SP4 : pv ? SP2 : 0) : 0;
    const rpm = Math.round(f * 30);
    const vitesse = gv ? 'vitesse présél. 4' : pv ? 'vitesse présél. 2' : 'consigne AI1 = 0';
    return {
      alim: [
        { id: 'var', label: 'Variateur alimenté (Q1 et Q2 fermés)', on: alim, tone: 'good' },
        { id: 'p24', label: 'Sortie +24 V⎓ interne (24V – 0V)', on: alim && !court, tone: 'good' },
        { id: 'di1', label: 'DI1 · marche avant', on: marche, tone: 'accent' },
        { id: 'di3', label: 'DI3 · vitesse présélectionnée 2 (PV)', on: pv, tone: 'accent' },
        { id: 'di4', label: 'DI4 · vitesse présélectionnée 4 (GV)', on: gv, tone: 'accent' },
      ],
      recepteurs: [{
        id: 'turbine', label: rpm > 0 ? `Turbine : ${virgule(f)} Hz · ${rpm} tr/min` : 'Turbine à l’arrêt',
        on: rpm > 0, tone: 'good',
      }],
      sousTension: alim,
      rpm,
      etats: { s2: e.s2 === '2' ? 'on' : 'off' },
      // Écran graphique de l'ATV340 : repéré depuis la borne R1A (sprite `atv340`).
      afficheurs: [{
        id: 'atv', ancre: { borne: 'u1.R1A', dx: 69, dy: -407 }, w: 121, h: 58, eteint: !alim,
        lignes: !marche
          ? ['rdY · prêt', `${virgule(0)} Hz`]
          : [`RUN · ${vitesse}`, `${virgule(f)} Hz`, `${rpm} tr/min`],
      }],
      valeurs: { f, s2: e.s2 === '2' ? 2 : 1 },
    };
  },
  observer(ev, e) {
    const f = ev.valeurs?.f ?? 0;
    const out: string[] = [];
    if (ev.sousTension && e.s2 !== '2' && Math.abs(f - SP2) < 0.05) out.push('pv');
    if (ev.sousTension && e.s2 === '2' && Math.abs(f - SP4) < 0.05) out.push('gv');
    return out;
  },
  attendus: [
    { id: 'pv', label: 'Essai PV : S1 sur I, S2 en position 1 → 33,3 Hz, 1 000 tr/min' },
    { id: 'gv', label: 'Essai GV : S1 sur I, S2 en position 2 → 50 Hz, 1 500 tr/min' },
  ],
};

/* ------------------------------------------------------------ Scierie · E.3.4.3 · strings DC */

/** Passages internes déclarés au catalogue (bornes DC+1, DC+2 et DC− reliées dans l'onduleur). */
function passagesInternes(tp: TpDefinition): Arete[] {
  return tp.slots.flatMap(s => (CATALOGUE_BY_KEY[s.key]?.passes ?? []).map(([a, b]) => [`${s.id}.${a}`, `${s.id}.${b}`] as Arete));
}

/**
 * Tension d'une entrée DC (borne + par rapport à la borne −), signée : on part du − et on
 * suit les modules posés en série, chacun ajoutant `vModule` de son − vers son +. `null` :
 * aucun chemin (circuit ouvert, l'entrée ne voit rien). Court-circuit : 0.
 */
function tensionEntree(
  find: (x: string) => string, modules: string[], plus: string, moins: string, vModule: number,
): { u: number; n: number } | null {
  const cible = find(plus);
  const depart = find(moins);
  if (cible === depart) return { u: 0, n: 0 };
  const pot = new Map<string, { u: number; n: number }>([[depart, { u: 0, n: 0 }]]);
  const file = [depart];
  while (file.length) {
    const x = file.shift() as string;
    const px = pot.get(x)!;
    for (const m of modules) {
      const moinsM = find(`${m}.X2`), plusM = find(`${m}.X1`);
      const voisin = x === moinsM ? { r: plusM, u: px.u + vModule } : x === plusM ? { r: moinsM, u: px.u - vModule } : null;
      if (!voisin || pot.has(voisin.r)) continue;
      pot.set(voisin.r, { u: voisin.u, n: px.n + 1 });
      file.push(voisin.r);
    }
  }
  return pot.get(cible) ?? null;
}

/** Plage MPP et tension minimale d'entrée du Fronius SYMO 12.5-3-M (DTR 34). */
const MPP_MIN = 320;
const MPP_MAX = 800;
const U_DEMARRAGE = 200;
/** Puissance d'un module en NOCT (386 W) et rendement maximal de l'onduleur (98 %). */
const P_MODULE = 386;
const RENDEMENT = 0.98;

const E343: ModelePlatine = {
  tpId: 'scierie-e343-dc',
  organes: () => [
    { id: 'q1', label: 'Q1 · disjoncteur 4P · départ de l’onduleur' },
    { id: 'f3', label: 'Q2 · interrupteur différentiel 4P · côté AC' },
    { id: 'f2', label: 'QDC · sectionneur DC de l’onduleur' },
  ],
  entreesInitiales: { tracker2: false },
  commandes: [
    { id: 'tr2on', label: 'MPP Tracker 2 : ON', sub: 'deux entrées indépendantes', effet: e => ({ ...e, tracker2: true }), actif: e => e.tracker2 === true },
    { id: 'tr2off', label: 'MPP Tracker 2 : OFF', sub: 'mode Single MPP Tracker', effet: e => ({ ...e, tracker2: false }), actif: e => e.tracker2 !== true },
  ],
  consigne: 'Il fait jour : le champ produit. Règle la fonction MPP Tracker 2 au menu de l’onduleur, puis observe '
    + 'ses deux entrées : chaque tracker doit trouver son string, à une tension dans la plage MPP de l’onduleur (320 à 800 V).',
  evaluer(tp, st, sim, e) {
    const find = equipotentielles([...filsPoses(tp, st), ...passagesBorniers(tp), ...passagesInternes(tp)]);
    const modules = (tp.annexItems ?? []).filter(it => it.key === 'pvmodule').map(it => it.rep);
    const ac = organeFerme(sim, 'q1') && organeFerme(sim, 'f3');
    const dc = organeFerme(sim, 'f2');
    const entree = (plus: string) => {
      const vide = tensionEntree(find, modules, plus, 'ond.DC-1', MODULES_PAR_PANNEAU * VOC_NOCT);
      return vide ? { n: vide.n, uVide: Math.round(vide.u), inverse: vide.u < 0 } : null;
    };
    const e1 = entree('ond.DC+1-1');
    const e2 = entree('ond.DC+2-1');
    const valide = (x: typeof e1) => x != null && !x.inverse && x.uVide >= U_DEMARRAGE;
    // L'onduleur démarre : réseau présent, sectionneur DC fermé, au moins une entrée valide,
    // et aucune entrée en inversion de polarité (il se met en défaut).
    const inversion = !!(e1?.inverse || e2?.inverse);
    const enService = ac && dc && !inversion && (valide(e1) || valide(e2));
    const umpp = (x: typeof e1) => (x ? Math.round(Math.abs(x.n) * MODULES_PAR_PANNEAU * VMPP_NOCT) : 0);
    const suivi = (x: typeof e1, actif: boolean) =>
      enService && actif && valide(x) && umpp(x) >= MPP_MIN && umpp(x) <= MPP_MAX;
    const t1 = suivi(e1, true);
    const t2 = suivi(e2, e.tracker2 === true);
    const nModules = (t1 ? (e1?.n ?? 0) : 0) + (t2 ? (e2?.n ?? 0) : 0);
    const kw = (nModules * MODULES_PAR_PANNEAU * P_MODULE * RENDEMENT) / 1000;
    const lire = (x: typeof e1, t: boolean) =>
      x == null ? 'rien (circuit ouvert)'
        : x.inverse ? `INVERSION ${x.uVide} V`
          : t ? `${umpp(x)} V (MPP)` : `${x.uVide} V à vide`;
    return {
      alim: [
        { id: 'ac', label: 'Réseau AC au bornier de l’onduleur (Q1, Q2)', on: ac, tone: 'good' },
        { id: 'dc', label: 'Sectionneur DC fermé', on: dc, tone: 'good' },
        { id: 'u1', label: `DC+1 / DC− : ${lire(e1, t1)}`, on: e1 != null && !e1.inverse && e1.uVide > 0, tone: e1?.inverse ? 'crit' : 'good' },
        { id: 'u2', label: `DC+2 / DC− : ${lire(e2, t2)}`, on: e2 != null && !e2.inverse && e2.uVide > 0, tone: e2?.inverse ? 'crit' : 'good' },
      ],
      recepteurs: [
        { id: 'tr1', label: t1 ? `Tracker 1 : string suivi à ${umpp(e1)} V` : 'Tracker 1 : pas de string suivi', on: t1, tone: 'good' },
        {
          id: 'tr2',
          label: t2 ? `Tracker 2 : string suivi à ${umpp(e2)} V`
            : e.tracker2 !== true && enService ? 'Tracker 2 sur OFF : entrée DC+2 non suivie (mode Single MPP Tracker)'
              : 'Tracker 2 : pas de string suivi',
          on: t2, tone: 'good',
        },
        ...(inversion ? [{ id: 'pol', label: 'Défaut : polarité DC inversée, l’onduleur reste arrêté', on: true, tone: 'crit' as const }] : []),
      ],
      sousTension: ac && dc,
      // Écran de l'onduleur : repéré depuis la borne DC+1-1 (sprite `symo125`).
      afficheurs: [{
        id: 'symo', ancre: { borne: 'ond.DC+1-1', dx: 249, dy: -59 }, w: 162, h: 32, eteint: !ac,
        lignes: inversion ? ['STATE 4xx · DC', 'polarité inversée']
          : enService ? [`MPP1 ${t1 ? `${umpp(e1)} V` : '—'} · MPP2 ${t2 ? `${umpp(e2)} V` : e.tracker2 === true ? '—' : 'OFF'}`, `P ≈ ${virgule(kw)} kW`]
            : ['en attente', dc ? 'tension DC insuffisante' : 'sectionneur DC ouvert'],
      }],
      valeurs: { t1: t1 ? 1 : 0, t2: t2 ? 1 : 0, u1: e1?.uVide ?? 0, u2: e2?.uVide ?? 0, kw },
    };
  },
  observer(ev) {
    const out: string[] = [];
    if (ev.valeurs?.t1 === 1) out.push('tr1');
    if (ev.valeurs?.t2 === 1) out.push('tr2');
    return out;
  },
  attendus: [
    { id: 'tr1', label: 'Tracker 1 : le string 1 est suivi (537 V, dans la plage MPP 320-800 V)' },
    { id: 'tr2', label: 'Tracker 2 sur ON : le string 2 est suivi (537 V)' },
  ],
};

/* ═══ chevrerie-a4-ssi : début ═══ */

/*
 * Chèvrerie · A.4.2 · équipement d'alarme de type 4 (DTR 7, DTR 8).
 *
 * Le tableau surveille chaque boucle de DM par sa résistance, vue entre ses bornes + et − :
 *  - la résistance de fin de ligne seule (3,9 kΩ) : veille ;
 *  - un DM déclenché : son contact NF 3 → 2 s'ouvre et la ligne ne se referme plus que par sa
 *    résistance de charge (910 Ω, DTR 7) en série avec la fin de ligne — la valeur monte sans
 *    devenir infinie : alarme feu ;
 *  - ligne coupée (infinie) ou court-circuitée (≈ 0) : dérangement. C'est ce qui distingue un
 *    DM déclenché d'un fil arraché (surveillance de ligne, switchs 5 et 6 sur OFF, A.5).
 * Seuils de décision retenus pour le modèle (le DTR ne les publie pas) : veille de 3 à 4,4 kΩ,
 * feu de 4,4 à 8 kΩ, dérangement ailleurs.
 * Le tableau fonctionne ici sur le secteur seul (la batterie n'est pas modélisée).
 */
const A4_R_FDL = 3900;
const A4_R_CHARGE_DM = 910;
const A4_DMS: { id: string; boucle: 1 | 2; label: string }[] = [
  { id: 'dm1', boucle: 2, label: 'DM1 · zone de transformation' },
  { id: 'dm2', boucle: 2, label: 'DM2 · zone de transformation' },
  { id: 'dm3', boucle: 1, label: 'DM3 · magasin' },
];

/**
 * Résistance équivalente entre `p` et `n` d'un réseau de fils (arêtes nulles) et de
 * résistances : méthode des nœuds, `n` à la masse, 1 A injecté en `p`. `null` : pas de chemin.
 */
function resistanceEntre(zero: readonly Arete[], resist: readonly [string, string, number][], p: string, n: string): number | null {
  const find = equipotentielles(zero);
  const P = find(p), N = find(n);
  if (P === N) return 0;
  const bras = resist.map(([a, b, r]) => [find(a), find(b), r] as const).filter(([a, b]) => a !== b);
  const comp = new Set([P]);
  for (let change = true; change;) {
    change = false;
    for (const [a, b] of bras) {
      if (comp.has(a) !== comp.has(b)) { comp.add(comp.has(a) ? b : a); change = true; }
    }
  }
  if (!comp.has(N)) return null;
  const noeuds = Array.from(comp).filter(x => x !== N);
  const ix = new Map(noeuds.map((x, i) => [x, i]));
  const k = noeuds.length;
  const G = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  for (const [a, b, r] of bras) {
    if (!comp.has(a)) continue;
    const g = 1 / r, ia = ix.get(a), ib = ix.get(b);
    if (ia != null) G[ia][ia] += g;
    if (ib != null) G[ib][ib] += g;
    if (ia != null && ib != null) { G[ia][ib] -= g; G[ib][ia] -= g; }
  }
  G[ix.get(P) as number][k] = 1;
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let l = c + 1; l < k; l++) if (Math.abs(G[l][c]) > Math.abs(G[piv][c])) piv = l;
    [G[c], G[piv]] = [G[piv], G[c]];
    for (let l = 0; l < k; l++) {
      if (l === c || G[l][c] === 0) continue;
      const f = G[l][c] / G[c][c];
      for (let j = c; j <= k; j++) G[l][j] -= f * G[c][j];
    }
  }
  const i = ix.get(P) as number;
  return G[i][k] / G[i][i];
}

type EtatBoucle = 'veille' | 'feu' | 'derangement';
const etatBoucle = (r: number | null): EtatBoucle =>
  r == null || r < 3000 || r > 8000 ? 'derangement' : r <= 4400 ? 'veille' : 'feu';
const kohm = (r: number | null) => (r == null ? 'ligne ouverte' : r < 1 ? 'court-circuit' : `${virgule(r / 1000, 2)} kΩ`);

/** Fil retiré par la commande d'essai « boucle ouverte » : le − de la boucle 1 au DM du magasin. */
const A4_FIL_RETIRE = 'dm3.1A';

const A4: ModelePlatine = {
  tpId: 'chevrerie-a4-ssi',
  organes: () => [{ id: 'q1', label: 'Q1 · disjoncteur C2 · alimentation du tableau T4' }],
  entreesInitiales: { dm1: false, dm2: false, dm3: false, coupe: false },
  commandes: [
    ...A4_DMS.map(d => ({
      id: d.id, label: `Déclencher ${d.label}`, sub: `boucle ${d.boucle} · une seconde fois : réarmement à la clé`,
      effet: (e: Entrees) => ({ ...e, [d.id]: e[d.id] !== true }), actif: (e: Entrees) => e[d.id] === true,
    })),
    {
      id: 'coupe', label: 'Retirer le fil 1A de DM3', sub: 'boucle 1 ouverte · une seconde fois : le reserrer',
      effet: e => ({ ...e, coupe: e.coupe !== true }), actif: e => e.coupe === true,
    },
    { id: 'rearm', label: 'Réarmer les DM et le tableau', sub: 'clé de réarmement, bouton essai / réarmement', effet: e => ({ ...e, dm1: false, dm2: false, dm3: false }) },
  ],
  surAppareil: {
    dm1: e => ({ ...e, dm1: e.dm1 !== true }),
    dm2: e => ({ ...e, dm2: e.dm2 !== true }),
    dm3: e => ({ ...e, dm3: e.dm3 !== true }),
  },
  consigne: 'Ferme Q1 : le voyant vert « sous tension » du tableau s’allume, les deux boucles sont en veille. '
    + 'Déclenche un DM de chaque boucle (bouton ou clic sur le DM) : le diffuseur sonne et le contact auxiliaire bascule ; '
    + 'réarme entre deux essais. Retire ensuite le fil 1A de DM3 : la boucle 1 ouverte doit passer en dérangement.',
  evaluer(tp, st, sim, e) {
    const fils = base(tp, st, sim, ['q1'])
      .filter(([a, b]) => e.coupe !== true || (a !== A4_FIL_RETIRE && b !== A4_FIL_RETIRE));
    const internes = passagesInternes(tp);
    const find = equipotentielles([...fils, ...internes]);
    const secteur = organeFerme(sim, 'q1') && alimentee(find, 't4.P', 't4.N', 'RES.L1', 'RES.N');
    // contacts NF des DM (3 → 2) fermés au repos ; déclenché : résistance de charge
    const contacts: Arete[] = A4_DMS.filter(d => e[d.id] !== true).map(d => [`${d.id}.3`, `${d.id}.2`]);
    const resist: [string, string, number][] = [
      ['r1.1', 'r1.2', A4_R_FDL], ['r2.1', 'r2.2', A4_R_FDL],
      ...A4_DMS.filter(d => e[d.id] === true).map(d => [`${d.id}.3`, `${d.id}.2`, A4_R_CHARGE_DM] as [string, string, number]),
    ];
    const zero = [...fils, ...internes, ...contacts];
    const r1 = resistanceEntre(zero, resist, 't4.B1+', 't4.B1−');
    const r2 = resistanceEntre(zero, resist, 't4.B2+', 't4.B2−');
    const b1 = etatBoucle(r1), b2 = etatBoucle(r2);
    const feu = secteur && (b1 === 'feu' || b2 === 'feu');
    const derang = secteur && (b1 === 'derangement' || b2 === 'derangement');
    const diffuseur = feu && find('ds1.+') === find('t4.DS+') && find('ds1.−') === find('t4.DS−')
      && find('t4.DS+') !== find('t4.DS−');
    const TON: Record<EtatBoucle, 'good' | 'crit' | 'accent'> = { veille: 'good', feu: 'crit', derangement: 'accent' };
    const NOM: Record<EtatBoucle, string> = { veille: 'veille', feu: 'FEU', derangement: 'dérangement' };
    return {
      alim: [
        { id: 'secteur', label: 'T4 · voyant vert « sous tension » (Secteur P – N)', on: secteur, tone: 'good' },
        { id: 'b1', label: `Boucle 1 (DM3, magasin) : ${secteur ? `${NOM[b1]} · ${kohm(r1)}` : '—'}`, on: secteur, tone: TON[b1] },
        { id: 'b2', label: `Boucle 2 (DM1, DM2, zone de transformation) : ${secteur ? `${NOM[b2]} · ${kohm(r2)}` : '—'}`, on: secteur, tone: TON[b2] },
        { id: 'derang', label: 'Voyant jaune « dérangement » · contact dérang. C – O/F basculé', on: derang, tone: 'accent' },
      ],
      recepteurs: [
        { id: 'feu', label: 'Voyant rouge « feu » · signal d’évacuation intégré du T4', on: feu, tone: 'crit', ancre: { borne: 't4.P', dx: -10, dy: -150 }, picto: '🔥' },
        { id: 'ds1', label: 'Diffuseur sonore DS1 : signal d’évacuation', on: diffuseur, tone: 'crit', ancre: { borne: 'ds1.+', dx: 26, dy: -40 }, picto: '🔊' },
        { id: 'aux', label: 'Contact auxiliaire C – O/F basculé (asservissements)', on: feu, tone: 'accent' },
      ],
      sousTension: secteur,
      valeurs: { b1: b1 === 'feu' ? 2 : b1 === 'veille' ? 1 : 0, b2: b2 === 'feu' ? 2 : b2 === 'veille' ? 1 : 0, diffuseur: diffuseur ? 1 : 0, feu: feu ? 1 : 0 },
    };
  },
  observer(ev, e) {
    const v = ev.valeurs ?? {};
    const out: string[] = [];
    if (!ev.sousTension) return out;
    const aucunDm = A4_DMS.every(d => e[d.id] !== true);
    if (aucunDm && e.coupe !== true && v.b1 === 1 && v.b2 === 1 && v.feu === 0) out.push('veille');
    if (v.b1 === 2 && v.diffuseur === 1 && e.dm3 === true) out.push('feu1');
    if (v.b2 === 2 && v.diffuseur === 1 && (e.dm1 === true || e.dm2 === true)) out.push('feu2');
    if (e.coupe === true && v.b1 === 0 && v.b2 === 1) out.push('derang');
    return out;
  },
  attendus: [
    { id: 'veille', label: 'Mise sous tension : secteur présent, les deux boucles en veille (3,9 kΩ)' },
    { id: 'feu1', label: 'DM du magasin déclenché : boucle 1 en feu, diffuseur et contact auxiliaire' },
    { id: 'feu2', label: 'DM de la zone de transformation déclenché : boucle 2 en feu, diffuseur et contact auxiliaire' },
    { id: 'derang', label: 'Fil 1A de DM3 retiré : la boucle 1 ouverte passe en dérangement' },
  ],
};
/* ═══ chevrerie-a4-ssi : fin ═══ */

/* ═══ chevrerie-b4 : début ═══ */
/* ------------------------------------------------------------ Chèvrerie · B.4 · alarme intrusion */

/**
 * Résistance vue entre deux bornes à travers les résistances posées (méthode des nœuds) :
 * les fils et les contacts fermés sont déjà fondus dans `find` ; chaque résistance est une
 * arête. `Infinity` : aucun chemin (boucle ouverte).
 */
function resistanceEntreB4(
  find: (x: string) => string, resistances: { a: string; b: string; r: number }[], p: string, q: string,
): number {
  const P = find(p), Q = find(q);
  if (P === Q) return 0;
  const aretes = resistances.map(x => ({ u: find(x.a), v: find(x.b), g: 1 / x.r })).filter(x => x.u !== x.v);
  const voisins = new Map<string, string[]>();
  for (const { u, v } of aretes) {
    voisins.set(u, [...(voisins.get(u) ?? []), v]);
    voisins.set(v, [...(voisins.get(v) ?? []), u]);
  }
  const vus = new Set([P]);
  const file = [P];
  while (file.length) {
    const x = file.shift() as string;
    for (const y of voisins.get(x) ?? []) if (!vus.has(y)) { vus.add(y); file.push(y); }
  }
  if (!vus.has(Q)) return Infinity;
  // Q à la masse, 1 A injecté en P : la tension de P vaut la résistance cherchée.
  const noeuds = Array.from(vus).filter(x => x !== Q);
  const idx = new Map(noeuds.map((x, i) => [x, i]));
  const n = noeuds.length;
  const G = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
  G[idx.get(P) as number][n] = 1;
  for (const { u, v, g } of aretes) {
    if (!vus.has(u)) continue;
    const i = idx.get(u), j = idx.get(v);
    if (i != null) G[i][i] += g;
    if (j != null) G[j][j] += g;
    if (i != null && j != null) { G[i][j] -= g; G[j][i] -= g; }
  }
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(G[r][c]) > Math.abs(G[piv][c])) piv = r;
    [G[c], G[piv]] = [G[piv], G[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || G[r][c] === 0) continue;
      const k = G[r][c] / G[c][c];
      for (let k2 = c; k2 <= n; k2++) G[r][k2] -= k * G[c][k2];
    }
  }
  const i = idx.get(P) as number;
  return G[i][n] / G[i][i];
}

type EtatZone = 'normal' | 'alarme' | 'ap';

/**
 * Bandes de la centrale en câblage ZFS 2k2/4k7 (DTR 12, tableau 5) : < 1k76 autoprotection
 * (court-circuit), 1k76–4k08 normal, 4k08–8k28 alarme, au-delà autoprotection (coupure).
 * Zone « doubles portes » (figure 5) : deux contacts ouverts donnent 11,6 kΩ, encore une
 * alarme — le tableau 5 ne donne pas la bande de ce mode, on retient 14 kΩ comme seuil de
 * coupure (hypothèse du simulateur).
 */
function etatZone(r: number, doublesPortes: boolean): EtatZone {
  if (r < 1760) return 'ap';
  if (r <= 4080) return 'normal';
  if (r <= 8280) return 'alarme';
  if (doublesPortes && r <= 14000) return 'alarme';
  return 'ap';
}

const B4_ZONES = [
  { z: 'Z0', com: 'COM01', doubles: false, label: 'IR magasin', det: ['irm'] },
  { z: 'Z1', com: 'COM01', doubles: true, label: 'contacts magasin', det: ['mm1', 'mm2'] },
  { z: 'Z2', com: 'COM23', doubles: true, label: 'contacts fromagerie', det: ['mf1', 'mf2'] },
  { z: 'Z3', com: 'COM23', doubles: false, label: 'IR fromagerie', det: ['irf'] },
] as const;

/** Détecteurs de l'essai : identifiant de slot → libellé. */
const B4_DET: Record<string, string> = {
  irm: 'IR magasin', mm1: 'porte 1 du magasin', mm2: 'porte 2 du magasin',
  mf1: 'porte 1 de la fromagerie', mf2: 'porte 2 de la fromagerie', irf: 'IR fromagerie',
};
const B4_OUVRANTS = ['mm1', 'mm2', 'mf1', 'mf2'];
const B4_PLUS = ['cen.12V', 'cen.12VBELL', 'cen.12VAUX1', 'cen.12VAUX2'];
const B4_MOINS = ['cen.0V', 'cen.0VB', 'cen.0V1', 'cen.0V2'];

const kohmB4 = (r: number) => (Number.isFinite(r) ? `${virgule(r / 1000, 1)} kΩ` : 'boucle ouverte');

const B4: ModelePlatine = {
  tpId: 'chevrerie-b4-intrusion',
  organes: () => [
    { id: 'q1', label: 'Q1 · secteur 230 V~ de la centrale' },
    { id: 'bat', label: 'BAT · raccorder les cosses de la batterie 12 V 7 Ah' },
  ],
  entreesInitiales: {
    mes: false, refus: false, mm1: false, mm2: false, mf1: false, mf2: false, irm: false, irf: false, capIrm: false, capSir: false,
  },
  commandes: [
    {
      id: 'mes', label: 'Clavier : code + MES', sub: 'mise en service totale',
      // La centrale refuse la mise en service sur une issue ouverte ou un capot déposé.
      effet: e => ([...B4_OUVRANTS, 'capIrm', 'capSir'].some(k => e[k] === true)
        ? { ...e, mes: false, refus: true } : { ...e, mes: true, refus: false }),
      actif: e => e.mes === true,
    },
    { id: 'mhs', label: 'Clavier : code + MHS', sub: 'mise hors service', effet: e => ({ ...e, mes: false, refus: false }), actif: e => e.mes !== true },
    ...B4_OUVRANTS.map(k => ({
      id: k, label: `Ouvrir / fermer la ${B4_DET[k]}`, sub: `contact ${k.toUpperCase()}`,
      effet: (e: Entrees) => ({ ...e, [k]: e[k] !== true }), actif: (e: Entrees) => e[k] === true,
    })),
    ...['irm', 'irf'].map(k => ({
      id: k, label: `Passer devant l’${B4_DET[k]}`, sub: 'détection de mouvement',
      effet: (e: Entrees) => ({ ...e, [k]: true }), relache: (e: Entrees) => ({ ...e, [k]: false }), actif: (e: Entrees) => e[k] === true,
    })),
    { id: 'capIrm', label: 'Déposer / reposer le capot de l’IR magasin', sub: 'autoprotection du détecteur', effet: e => ({ ...e, capIrm: e.capIrm !== true }), actif: e => e.capIrm === true },
    { id: 'capSir', label: 'Déposer / reposer le capot de la sirène', sub: 'autoprotection de la sirène', effet: e => ({ ...e, capSir: e.capSir !== true }), actif: e => e.capSir === true },
  ],
  consigne: 'Mets la centrale en service au clavier, puis essaie chaque détecteur : ouvre chaque porte, passe devant '
    + 'chaque IR — la zone passe en alarme et la sirène sonne. Remets hors service, puis dépose un capot : '
    + 'l’autoprotection déclenche l’alarme même hors service.',
  evaluer(tp, st, sim, e) {
    const aretes0 = base(tp, st, sim, ['q1']);
    const find0 = equipotentielles(aretes0);
    const secteur = alimentee(find0, 'cen.L', 'cen.N', 'RES.L1', 'RES.N');
    const batterie = organeFerme(sim, 'bat') && find0('cen.BAT+') === find0('bat.+') && find0('cen.BAT-') === find0('bat.-');
    const cen = secteur || batterie;
    // Alimentation des IR (première passe) : un IR non alimenté a son relais d'alarme retombé.
    const plus0 = new Set(B4_PLUS.map(find0));
    const moins0 = new Set(B4_MOINS.map(find0));
    const court = Array.from(plus0).some(r => moins0.has(r));
    const alimente = (f: (x: string) => string, p: string, m: string) =>
      cen && !court && B4_PLUS.some(x => f(x) === f(p)) && B4_MOINS.some(x => f(x) === f(m));
    const irAlim: Record<string, boolean> = { irm: alimente(find0, 'irm.+', 'irm.-'), irf: alimente(find0, 'irf.+', 'irf.-') };
    // Contacts internes des détecteurs dans leur état.
    const contacts: Arete[] = [];
    for (const s of tp.slots) {
      const k = s.key;
      if (k === 'xcelwpt') {
        if (irAlim[s.id] && e[s.id] !== true) contacts.push([`${s.id}.A1`, `${s.id}.A2`]);
        if (!(s.id === 'irm' && e.capIrm === true)) contacts.push([`${s.id}.T1`, `${s.id}.T2`]);
      }
      if (k === 'fr400') {
        if (e[s.id] !== true) contacts.push([`${s.id}.A1`, `${s.id}.A2`]);
        contacts.push([`${s.id}.T1`, `${s.id}.T2`]);
      }
    }
    if (e.capSir !== true) contacts.push(['sir.AP1', 'sir.AP2']);
    const find = equipotentielles([...aretes0, ...contacts]);
    const resistances = tp.slots
      .filter(s => s.key === 'reol4k7' || s.key === 'reol2k2')
      .map(s => ({ a: `${s.id}.1`, b: `${s.id}.2`, r: s.key === 'reol4k7' ? 4700 : 2200 }));
    const zones = B4_ZONES.map(z => {
      const r = resistanceEntreB4(find, resistances, `cen.${z.z}`, `cen.${z.com}`);
      return { ...z, r, etat: cen ? etatZone(r, z.doubles) : null };
    });
    // Clavier : alimenté par le bus et en dialogue (A et B distincts, hors alimentation).
    const clavierAlim = alimente(find, 'cla.12V', 'cla.0V');
    const surAlim = (x: string) => B4_PLUS.concat(B4_MOINS).some(y => find(y) === find(x));
    const clavier = clavierAlim && find('cla.A') === find('cen.A') && find('cla.B') === find('cen.B')
      && find('cen.A') !== find('cen.B') && !surAlim('cen.A') && !surAlim('cen.B');
    // Sirène : charge 12 V (sinon, auto-alimentée, elle se déclenche d'elle-même), commande
    // I1 sur BELL, boucle d'autoprotection 0V → A.P. TAMPER → TR.
    const charge = alimente(find, 'sir.12V', 'sir.0V');
    const commande = find('sir.I1') === find('cen.BELL');
    const apSirene = cen && !B4_MOINS.some(x => find(x) === find('cen.TR'));
    const enService = cen && clavier && e.mes === true;
    const zonesAp = zones.filter(z => z.etat === 'ap');
    const zonesAl = zones.filter(z => z.etat === 'alarme');
    const autoprotection = cen && (zonesAp.length > 0 || apSirene);
    const intrusion = enService && zonesAl.length > 0;
    const bell = cen && (autoprotection || intrusion);
    const perteCharge = cen && !charge;
    const sirene = (bell && commande) || perteCharge;
    const fermes = organeFerme(sim, 'q1') && organeFerme(sim, 'bat');
    const lcd = !cen || !clavierAlim ? []
      : !clavier ? ['DÉFAUT BUS', 'clavier non reconnu']
        : autoprotection ? ['AUTOPROTECTION', apSirene ? 'sirène (TR)' : zonesAp.map(z => z.z).join(' ')]
          : intrusion ? ['ALARME INTRUSION', zonesAl.map(z => z.z).join(' ')]
            : e.refus === true ? ['MES REFUSÉE', 'issue ouverte']
              : enService ? ['EN SERVICE', 'totale'] : ['HORS SERVICE', 'prêt'];
    const toneZone = (s: EtatZone | null) => (s === 'ap' ? 'crit' : s === 'alarme' ? 'accent' : 'good') as Voyant['tone'];
    return {
      alim: [
        { id: 'secteur', label: 'Secteur 230 V~ sur la centrale (Q1)', on: secteur, tone: 'good' },
        { id: 'batterie', label: 'Batterie 12 V 7 Ah raccordée', on: batterie, tone: 'good' },
        { id: 'hb', label: court ? 'Court-circuit sur le 12 V de la centrale' : 'Centrale alimentée : voyant HB', on: cen, tone: court ? 'crit' : 'good' },
        { id: 'clavier', label: clavierAlim && !clavier ? 'Clavier alimenté mais non reconnu sur le bus (A, B)' : 'Clavier sur le bus (0V, 12V, A, B)', on: clavier, tone: 'good' },
        { id: 'charge', label: 'Sirène : charge 12 V présente', on: charge, tone: 'good' },
        { id: 'irm', label: 'IR magasin alimenté (12 V⎓)', on: irAlim.irm, tone: 'good' },
        { id: 'irf', label: 'IR fromagerie alimenté (12 V⎓)', on: irAlim.irf, tone: 'good' },
        ...zones.map(z => ({
          id: z.z, on: z.etat != null, tone: toneZone(z.etat),
          label: `${z.z} · ${z.label} : ${z.etat == null ? '—' : z.etat === 'ap' ? 'AUTOPROTECTION' : z.etat === 'alarme' ? 'ALARME' : 'normal'} (${kohmB4(z.r)})`,
        })),
        { id: 'mes', label: e.refus === true ? 'Mise en service refusée : issue ouverte' : 'Centrale EN SERVICE', on: enService, tone: 'accent' },
      ],
      recepteurs: [
        {
          id: 'sirene', label: perteCharge ? 'Sirène : déclenchée (perte de sa charge 12 V)' : sirene ? 'Sirène : ALARME' : 'Sirène au repos',
          on: sirene, tone: 'crit', ancre: { borne: 'sir.0V', dx: 86, dy: -128 }, picto: '🔊',
        },
        { id: 'transmetteur', label: 'Transmetteur : appel de télésurveillance (IP / 4G)', on: bell, tone: 'accent' },
      ],
      sousTension: fermes && secteur && batterie && !court,
      afficheurs: [{ id: 'lcd', ancre: { borne: 'cla.0V', dx: -197, dy: -140 }, w: 130, h: 40, eteint: lcd.length === 0, lignes: lcd }],
      valeurs: {
        enService: enService ? 1 : 0, sirene: sirene ? 1 : 0, autoprotection: autoprotection ? 1 : 0,
        intrusion: intrusion ? 1 : 0, perteCharge: perteCharge ? 1 : 0,
        ...Object.fromEntries(zones.map(z => [z.z, z.etat === 'normal' ? 0 : z.etat === 'alarme' ? 1 : z.etat === 'ap' ? 2 : -1])),
      },
    };
  },
  observer(ev, e) {
    const v = ev.valeurs ?? {};
    const out: string[] = [];
    const calme = B4_ZONES.every(z => v[z.z] === 0) && v.sirene === 0 && v.autoprotection === 0;
    if (ev.sousTension && v.enService === 1 && calme) out.push('mes');
    // Un détecteur déclenché, seul, en service : SA zone passe en alarme (pas en
    // autoprotection) et la sirène sonne.
    const actifs = Object.keys(B4_DET).filter(k => e[k] === true);
    if (ev.sousTension && v.enService === 1 && v.sirene === 1 && v.perteCharge === 0 && actifs.length === 1
      && e.capIrm !== true && e.capSir !== true) {
      const z = B4_ZONES.find(x => (x.det as readonly string[]).includes(actifs[0]));
      const autres = B4_ZONES.filter(x => x !== z).every(x => v[x.z] === 0);
      if (z && v[z.z] === 1 && autres) out.push(actifs[0]);
    }
    // Autoprotection hors service : un capot déposé suffit à déclencher la sirène.
    if (ev.sousTension && e.mes !== true && (e.capIrm === true || e.capSir === true) && v.sirene === 1
      && v.autoprotection === 1 && v.perteCharge === 0) out.push('ap');
    return out;
  },
  attendus: [
    { id: 'mes', label: 'Mise en service au clavier : toutes les zones au repos, sirène muette' },
    { id: 'mm1', label: 'Porte 1 du magasin ouverte : Z1 en alarme, la sirène sonne' },
    { id: 'mm2', label: 'Porte 2 du magasin ouverte : Z1 en alarme, la sirène sonne' },
    { id: 'irm', label: 'Passage devant l’IR du magasin : Z0 en alarme, la sirène sonne' },
    { id: 'mf1', label: 'Porte 1 de la fromagerie ouverte : Z2 en alarme, la sirène sonne' },
    { id: 'mf2', label: 'Porte 2 de la fromagerie ouverte : Z2 en alarme, la sirène sonne' },
    { id: 'irf', label: 'Passage devant l’IR de la fromagerie : Z3 en alarme, la sirène sonne' },
    { id: 'ap', label: 'Capot déposé, centrale HORS service : l’autoprotection déclenche la sirène' },
  ],
};
/* ═══ chevrerie-b4 : fin ═══ */

/* ═══ chevrerie-e222 : début ═══ */
/* ------------------------------------------------------------ Chèvrerie · E.2.2.2 · éolienne */

/**
 * Courbe de puissance de l'éolienne ANTARIS 3,5 kW (DTR 28, relevée sur le graphique) :
 * vent (m/s) → puissance électrique (W). Démarrage à 2,8 m/s, plateau de 6,7 kW au-delà de
 * 12,5 m/s (le rotor se met en position hélicoptère, la tension continue pourtant de monter à
 * vide : c'est le rôle de la WBP-Box et de sa résistance de charge de la limiter).
 */
const COURBE_EOL: [number, number][] = [[2.8, 0], [3, 100], [5, 500], [7, 1300], [9, 2800], [11, 5000], [12.5, 6700]];
function puissanceEol(v: number): number {
  if (v < COURBE_EOL[0][0]) return 0;
  for (let i = 1; i < COURBE_EOL.length; i++) {
    const [v0, p0] = COURBE_EOL[i - 1], [v1, p1] = COURBE_EOL[i];
    if (v <= v1) return p0 + ((p1 - p0) * (v - v0)) / (v1 - v0);
  }
  return COURBE_EOL[COURBE_EOL.length - 1][1];
}
/** Tension de l'alternateur à aimants permanents : 350 V~ à 11 m/s, proportionnelle à la vitesse. */
const uAlternateur = (v: number) => (v < 2.8 ? 0 : (350 * v) / 11);
/** Pont B6 : tension continue à vide ≈ 1,35 × tension composée. */
const B6 = 1.35;
/** WBP-Box 600 : limitation à 560 V⎓ par la résistance de charge (DTR 29 § 3.1). */
const U_LIMITE_WBP = 560;
/** Windy Boy 5000A (DTR 30) : activation à 300 V à vide, 600 V⎓ max, 5 500 W AC max, rendement euro. */
const U_ACTIVATION_WB = 300;
const U_MAX_WB = 600;
const P_MAX_WB = 5500;
const RENDEMENT_WBP = 0.97;
const RENDEMENT_WB = 0.953;
const ONDS_E222 = [
  { od: 'od1', dd: 'f2', n: 1 },
  { od: 'od2', dd: 'f3', n: 2 },
  { od: 'od3', dd: 'dd3', n: 3 },
];

type EtatWb = 'production' | 'veille' | 'attente' | 'inverse' | 'surtension' | 'sansdc' | 'eteint';

const E222: ModelePlatine = {
  tpId: 'chevrerie-e222-eolien',
  organes: () => [
    { id: 'q1', label: 'Q3 · interrupteur-sectionneur général AC' },
    { id: 'f2', label: 'Od1 · disjoncteur différentiel de l’onduleur 1' },
    { id: 'f3', label: 'Od2 · disjoncteur différentiel de l’onduleur 2' },
    { id: 'dd3', label: 'Od3 · disjoncteur différentiel de l’onduleur 3' },
  ],
  entreesInitiales: { vent: '0' },
  commandes: [
    { id: 'v0', label: 'Pas de vent', sub: '0 m/s · rotor arrêté', effet: e => ({ ...e, vent: '0' }), actif: e => e.vent === '0' },
    { id: 'v10', label: 'Vent 10 m/s', sub: 'vent fort · ≈ 3,9 kW à l’éolienne', effet: e => ({ ...e, vent: '10' }), actif: e => e.vent === '10' },
    { id: 'v60', label: 'Vent destructeur', sub: '> 58 m/s · tempête', effet: e => ({ ...e, vent: '60' }), actif: e => e.vent === '60' },
  ],
  consigne: 'Ferme Q3 puis Od1, Od2 et Od3 : les trois onduleurs voient le réseau. Fais ensuite souffler le vent : '
    + 'à 10 m/s, la WBP-Box redresse la tension de l’éolienne et les trois onduleurs injectent, un par phase ; sans vent, '
    + 'ils se mettent en veille ; par vent destructeur, la WBP-Box doit limiter la tension DC sur la résistance de charge.',
  evaluer(tp, st, sim, e) {
    const aretes: Arete[] = [...filsPoses(tp, st), ...passagesBorniers(tp), ...passagesInternes(tp)];
    const q3 = organeFerme(sim, 'q1');
    if (q3) aretes.push(['q1.N', 'q1.N2'], ['q1.1', 'q1.2'], ['q1.3', 'q1.4'], ['q1.5', 'q1.6']);
    for (const o of ONDS_E222) if (organeFerme(sim, o.dd)) aretes.push(...poles(o.dd));
    const find = equipotentielles(aretes);

    // ---- réseau : court-circuit entre conducteurs actifs du 5G16 ?
    const actifs = ['RES.L1', 'RES.L2', 'RES.L3', 'RES.N'].map(find);
    const courtAc = new Set(actifs).size < 4;
    const PH = ['L1', 'L2', 'L3'] as const;
    const phaseAc = (od: string) => (courtAc ? null
      : PH.find(p => alimentee(find, `${od}.L`, `${od}.N`, `RES.${p}`, 'RES.N')) ?? null);
    const aval = !courtAc && alimentee(find, 'q1.2', 'q1.N2', 'RES.L1', 'RES.N');
    const pf = !courtAc && (['N', 'L1', 'L2', 'L3'] as const).every(c => find(`pf.${c}`) === find(`RES.${c}`))
      && find('pf.PE') === find('RES.PE');

    // ---- éolienne → WBP-Box : les trois phases, sans court-circuit
    const eolPh = ['eol.L1', 'eol.L2', 'eol.L3'].map(find);
    const wbpPh = ['wbp.L1', 'wbp.L2', 'wbp.L3'].map(find);
    const courtEol = new Set(eolPh).size < 3;
    const nPh = new Set(wbpPh.filter(r => eolPh.includes(r))).size;
    const entree = !courtEol && nPh === 3 && new Set(wbpPh).size === 3;

    // ---- bus DC et résistance de charge
    const dcP = find('wbp.DC+1'), dcM = find('wbp.DC-1');
    const courtDc = dcP === dcM;
    const polarite = (od: string): 'ok' | 'inverse' | null => {
      const p = find(`${od}.DC+`), m = find(`${od}.DC-`);
      if (courtDc) return null;
      if (p === dcP && m === dcM) return 'ok';
      if (p === dcM && m === dcP) return 'inverse';
      return null;
    };
    const lrP = find('wbp.LR+'), lrM = find('wbp.LR-');
    const rP = find('rch.+'), rM = find('rch.-');
    const resistance = lrP !== lrM && ((rP === lrP && rM === lrM) || (rP === lrM && rM === lrP));

    // ---- vent → tension DC
    const v = Number(e.vent ?? 0);
    const uDcVide = entree && !courtDc ? Math.round(B6 * uAlternateur(v)) : 0;
    const limite = uDcVide > U_LIMITE_WBP;
    const rchActive = limite && resistance;
    const uDc = limite && resistance ? U_LIMITE_WBP : uDcVide;
    const surtension = uDc > U_MAX_WB;

    // ---- état de chaque onduleur
    const etats = ONDS_E222.map(o => {
      const phase = phaseAc(o.od);
      const pol = polarite(o.od);
      const dc = pol === 'ok' ? uDc : 0;
      let etat: EtatWb;
      if (pol === 'inverse' && uDcVide > 0) etat = 'inverse';
      else if (pol === 'ok' && surtension) etat = 'surtension';
      else if (!phase) etat = pol === 'ok' && dc >= U_ACTIVATION_WB ? 'attente' : 'eteint';
      else if (pol == null) etat = 'sansdc';
      else if (dc < U_ACTIVATION_WB) etat = 'veille';
      else etat = 'production';
      return { ...o, phase, pol, dc, etat };
    });
    const producteurs = etats.filter(x => x.etat === 'production');
    const pAc = producteurs.length
      ? Math.min(P_MAX_WB, (puissanceEol(v) * RENDEMENT_WBP * RENDEMENT_WB) / producteurs.length) : 0;
    const phasesProd = new Set(producteurs.map(x => x.phase)).size;
    const pe = ONDS_E222.filter(o => find(`${o.od}.PE`) === find('RES.PE')).length;
    const kw = (w: number) => virgule(w / 1000, 2);

    const fermes = ['q1', 'f2', 'f3', 'dd3'].every(id => organeFerme(sim, id));
    const nAc = etats.filter(x => x.phase).length;
    const libelle = (x: typeof etats[number]) => {
      switch (x.etat) {
        case 'production': return `Onduleur ${x.n} : injection ${kw(pAc)} kW sur ${x.phase}`;
        case 'veille': return `Onduleur ${x.n} : veille (U DC ${x.dc} V < ${U_ACTIVATION_WB} V)`;
        case 'attente': return `Onduleur ${x.n} : tension DC présente, attente du réseau (pas de 230 V~)`;
        case 'inverse': return `Onduleur ${x.n} : défaut, polarité DC inversée`;
        case 'surtension': return `Onduleur ${x.n} : défaut de surtension DC (${x.dc} V > ${U_MAX_WB} V)`;
        case 'sansdc': return `Onduleur ${x.n} : entrée DC non raccordée au bus de la WBP-Box`;
        default: return `Onduleur ${x.n} : hors tension`;
      }
    };
    const ecran = (x: typeof etats[number]): string[] => {
      switch (x.etat) {
        case 'production': return [`Turbine · ${x.dc} V⎓`, `P ${kw(pAc)} kW · ${x.phase}`];
        case 'veille': return ['Veille', `U DC ${x.dc} V`];
        case 'attente': return ['Attente réseau', 'Grid Guard'];
        case 'inverse': return ['Défaut DC', 'polarité inversée'];
        case 'surtension': return ['Défaut DC', `surtension ${x.dc} V`];
        case 'sansdc': return ['Veille', 'entrée DC ouverte'];
        default: return ['', ''];
      }
    };

    return {
      alim: [
        { id: 'q3', label: 'Réseau présent en aval de Q3 (L1 L2 L3 N)', on: aval, tone: 'good' },
        { id: 'pf', label: 'Parafoudre raccordé (N L1 L2 L3 et terre)', on: pf, tone: 'good' },
        ...etats.map(x => ({
          id: `ac${x.n}`, label: x.phase ? `Onduleur ${x.n} : réseau 230 V~ (N + ${x.phase})` : `Onduleur ${x.n} : pas de réseau`,
          on: x.phase != null, tone: 'good' as const,
        })),
        {
          id: 'phases', label: `Répartition des onduleurs : ${etats.map(x => x.phase ?? '—').join(' · ')}`,
          on: new Set(etats.map(x => x.phase).filter(Boolean)).size === 3, tone: 'good',
        },
        { id: 'pe', label: `Masses des onduleurs à la barrette de terre : ${pe} / 3`, on: pe === 3, tone: 'good' },
        {
          id: 'eol',
          label: courtEol ? 'Éolienne : conducteurs en court-circuit (freinage)'
            : entree ? 'Éolienne raccordée à la WBP-Box (L1 L2 L3 Alternator)' : `Éolienne : ${nPh} / 3 phases à la WBP-Box`,
          on: entree, tone: courtEol ? 'crit' : 'good',
        },
        { id: 'dc', label: courtDc ? 'Bus DC en court-circuit (DC+ relié au DC−)' : `Bus DC de la WBP-Box : ${uDc} V⎓`, on: !courtDc && uDc > 0, tone: courtDc || surtension ? 'crit' : 'accent' },
        { id: 'rch', label: resistance ? 'Résistance de charge raccordée (LR+ / LR−)' : 'Résistance de charge non raccordée : aucune protection contre les surtensions', on: resistance, tone: 'good' },
      ],
      recepteurs: [
        {
          id: 'eolienne', label: v > 0 ? `Éolienne : vent ${v} m/s · ${entree ? `${Math.round(uAlternateur(v))} V~` : 'non raccordée'}` : 'Éolienne : rotor arrêté',
          on: v >= 2.8, tone: 'accent', ancre: { borne: 'eol.L1', dx: -84, dy: -70 }, picto: '🌀',
        },
        ...etats.map(x => ({
          id: x.od, label: libelle(x), on: x.etat === 'production',
          tone: (x.etat === 'inverse' || x.etat === 'surtension' ? 'crit' : 'good') as Voyant['tone'],
        })),
        {
          id: 'charge', label: rchActive ? `Résistance de charge sollicitée : U DC limitée à ${U_LIMITE_WBP} V`
            : 'Résistance de charge au repos',
          on: rchActive, tone: 'crit', ancre: { borne: 'rch.PE', dx: -70, dy: 26 }, picto: '♨',
        },
        ...(surtension ? [{ id: 'surtension', label: `Surtension DC : ${uDc} V > ${U_MAX_WB} V, les onduleurs sont en danger`, on: true, tone: 'crit' as const }] : []),
      ],
      sousTension: fermes && !courtAc && nAc === 3,
      // Écran de chaque Windy Boy : repéré depuis sa borne DC+ (sprite `windyboy`).
      afficheurs: etats.map(x => ({
        id: x.od, ancre: { borne: `${x.od}.DC+`, dx: -2.4, dy: -120 }, w: 84, h: 32,
        eteint: x.etat === 'eteint', lignes: ecran(x),
      })),
      valeurs: {
        vent: v, udc: uDc, n: producteurs.length, phases: phasesProd, rch: rchActive ? 1 : 0,
        surtension: surtension ? 1 : 0, pac: pAc,
        veille: etats.filter(x => x.etat === 'veille').length,
        entree: entree ? 1 : 0,
      },
    };
  },
  observer(ev, e) {
    const x = ev.valeurs ?? {};
    const out: string[] = [];
    if (!ev.sousTension) return out;
    if (e.vent === '10' && x.n === 3 && x.phases === 3) out.push('prod');
    if (e.vent === '0' && x.veille === 3 && x.entree === 1) out.push('veille');
    if (e.vent === '60' && x.rch === 1 && x.surtension === 0) out.push('charge');
    return out;
  },
  attendus: [
    { id: 'prod', label: 'Vent 10 m/s : U DC ≈ 430 V, les trois onduleurs injectent, un par phase' },
    { id: 'veille', label: 'Pas de vent : les trois onduleurs se mettent en veille' },
    { id: 'charge', label: 'Vent destructeur : la WBP-Box limite la tension DC à 560 V sur la résistance de charge' },
  ],
};
/* ═══ chevrerie-e222 : fin ═══ */

/* ═══ chevrerie-g5 : début ═══ */
/* ------------------------------------------------------------ Chèvrerie · G.5 · portail STAR 24 */

/**
 * Carte AKIA PU2M (DTR 45) : les entrées de commande sont ACTIVES quand elles sont reliées au
 * commun + 12 V (borne 4, reliée à 8 et 14 sur la carte). BP1 (3) : ouverture totale ; BP2 (5) :
 * ouverture partielle ; photo 1 (6) : doit rester fermée pour ouvrir ; photo 2 (7) : doit rester
 * fermée pour fermer, et son ouverture pendant la fermeture arrête le portail et le rouvre.
 * La sortie « 12 V TX » (15) alimente les cellules AVEC TEST : avant de refermer, la carte la coupe
 * et vérifie que la photo 2 s'ouvre. La sortie flash (16) est alimentée pendant le mouvement.
 *
 * Récepteur GSM (DTR 48) : chaque sortie est un relais inverseur (NC – C – NA), collé pendant
 * l'impulsion de l'appel si le récepteur est alimenté. Cellule réceptrice (DTR 46) : contact
 * COM – OUT fermé tant qu'elle est alimentée et reçoit le faisceau de l'émettrice alimentée
 * (cavalier en NC, sécurité positive). Lampe flash (DTR 47) : 12 V entre ses bornes 3 et 4 ;
 * cavalier JP1 : fixe ou clignotant.
 *
 * Les commandes de l'essai sont des ÉTATS (dernier ordre donné, faisceau coupé ou non) : la
 * carte, elle, en déduit le mouvement à partir du câblage réel de l'élève.
 */
const G5_PLUS = 'car.4';
const G5_TX = 'car.15';
const G5_FLASH = 'car.16';
const G5_ZERO = 'car.17';

/** Mouvement du portail : codes lus par `observer` (valeurs.mvt). */
const G5_MVT = { arret: 0, totale: 1, partielle: 2, fermeture: 3, reouverture: 4, inverse: -1 } as const;

const G5: ModelePlatine = {
  tpId: 'chevrerie-g5-portail',
  organes: () => [
    { id: 'q1', label: 'Q1 · départ du coffret du portail' },
    { id: 'f2', label: 'Q2 · boîtier électronique STAR 24 (carte AKIA PU2M)' },
    { id: 'f3', label: 'Q3 · récepteur GSM' },
  ],
  entreesInitiales: { ordre: null, sortie: null, coupe: false, jp1: 'fixe' },
  commandes: [
    {
      id: 'total', label: 'Appel GSM : ouverture totale', sub: 'Sortie 1 du récepteur',
      effet: e => ({ ...e, ordre: 'total', sortie: '1' }), relache: e => ({ ...e, sortie: null }), actif: e => e.ordre === 'total',
    },
    {
      id: 'pieton', label: 'Appel GSM : ouverture piéton', sub: 'Sortie 2 · ouverture partielle',
      effet: e => ({ ...e, ordre: 'pieton', sortie: '2' }), relache: e => ({ ...e, sortie: null }), actif: e => e.ordre === 'pieton',
    },
    {
      id: 'fermer', label: 'Refermeture automatique', sub: 'fin de la temporisation de pause',
      effet: e => ({ ...e, ordre: 'fermeture' }), actif: e => e.ordre === 'fermeture',
    },
    {
      id: 'coupe', label: 'Couper le faisceau des cellules', sub: 'un véhicule passe (cliquer à nouveau : faisceau libre)',
      effet: e => ({ ...e, coupe: e.coupe !== true }), actif: e => e.coupe === true,
    },
    {
      id: 'jp1', label: 'Cavalier JP1 du flash', sub: 'mode fixe / mode clignotant (aussi au clic sur la lampe)',
      effet: e => ({ ...e, jp1: e.jp1 === 'flash' ? 'fixe' : 'flash' }), actif: e => e.jp1 === 'flash',
    },
    { id: 'repos', label: 'Portail au repos', sub: 'aucun ordre', effet: e => ({ ...e, ordre: null, sortie: null }) },
  ],
  surAppareil: { h1: e => ({ ...e, jp1: e.jp1 === 'flash' ? 'fixe' : 'flash' }) },
  consigne: 'Appelle le récepteur GSM : la Sortie 1 doit ouvrir totalement le portail, la Sortie 2 l’ouvrir en passage '
    + 'piéton, la lampe flash clignotant pendant le mouvement (règle son cavalier JP1). Lance ensuite la refermeture '
    + 'automatique, puis coupe le faisceau des cellules pendant la fermeture : le portail doit s’arrêter et se rouvrir.',
  evaluer(tp, st, sim, e) {
    const aretes0 = [...base(tp, st, sim, ['q1', 'f2', 'f3']), ...passagesInternes(tp)];
    const find0 = equipotentielles(aretes0);
    const boitier = alimentee(find0, 'car.L', 'car.N', 'RES.L1', 'RES.N');
    const gsm = alimentee(find0, 'gsm.L', 'gsm.N', 'RES.L1', 'RES.N');
    const s1 = gsm && e.sortie === '1';
    const s2 = gsm && e.sortie === '2';
    // Relais du GSM (repos : C – NC ; collé : C – NA) et contact de la cellule réceptrice.
    const contacts = (r1: boolean, r2: boolean, rx: boolean): Arete[] => [
      r1 ? ['gsm.C1', 'gsm.NA1'] : ['gsm.C1', 'gsm.NC1'],
      r2 ? ['gsm.C2', 'gsm.NA2'] : ['gsm.C2', 'gsm.NC2'],
      ...(rx ? [['rx.COM', 'rx.OUT'] as Arete] : []),
    ];
    /**
     * État de la carte et des cellules pour des relais GSM donnés, faisceau coupé ou non, et
     * sortie 12 V TX coupée (`test`) ou non. Point fixe : le contact de la cellule dépend de son
     * alimentation, qui dépend du câblage — trois passes suffisent.
     */
    const etat = (r1: boolean, r2: boolean, coupe: boolean, test: boolean) => {
      let rxFerme = false;
      let find = equipotentielles([...aretes0, ...contacts(r1, r2, false)]);
      let carte = false, tx = false, rx = false;
      for (let i = 0; i < 3; i++) {
        find = equipotentielles([...aretes0, ...contacts(r1, r2, rxFerme)]);
        carte = boitier && find(G5_PLUS) !== find(G5_ZERO) && find(G5_TX) !== find(G5_ZERO);
        const sources = test ? [G5_PLUS] : [G5_PLUS, G5_TX];
        const cellule = (p: string, m: string) => carte && sources.some(s => alimentee(find, p, m, s, G5_ZERO));
        tx = cellule('tx.2', 'tx.1');
        rx = cellule('rx.+', 'rx.−');
        rxFerme = tx && rx && !coupe;
      }
      const actif = (b: string) => carte && find(`car.${b}`) === find(G5_PLUS);
      return { find, carte, tx, rx, rxFerme, actif };
    };
    const coupe = e.coupe === true;
    const now = etat(s1, s2, coupe, false);
    const { find, carte } = now;
    // Entrées au repos (relais du GSM retombés) et à l'impulsion de chaque sortie.
    const repos = etat(false, false, coupe, false);
    const maintenue = repos.actif('3') ? 'BP1' : repos.actif('5') ? 'BP2' : null;
    const ordreDe = (r1: boolean, r2: boolean): 'totale' | 'partielle' | null => {
      if (!gsm) return null;
      const x = etat(r1, r2, coupe, false);
      if (x.actif('3') && !repos.actif('3')) return 'totale';
      if (x.actif('5') && !repos.actif('5')) return 'partielle';
      return null;
    };
    const photo1 = repos.actif('6');
    // Photo 2 et test des cellules, faisceau libre (au départ de la fermeture) : la photo 2
    // doit être fermée, et s'ouvrir quand la carte coupe le 12 V TX.
    const libre = etat(false, false, false, false);
    const testOk = libre.actif('7') && !etat(false, false, false, true).actif('7');
    const photo2 = now.actif('7');

    let mvt: 'totale' | 'partielle' | 'fermeture' | 'reouverture' | null = null;
    let motif = '';
    if (carte) {
      if (maintenue) {
        mvt = photo1 ? 'totale' : null;
        motif = `entrée ${maintenue} fermée au repos : ordre permanent`;
      } else if (e.ordre === 'total' || e.ordre === 'pieton') {
        mvt = e.ordre === 'total' ? ordreDe(true, false) : ordreDe(false, true);
        if (!mvt) motif = gsm ? 'l’ordre n’arrive pas sur une entrée de commande' : 'récepteur GSM hors tension';
        else if (!photo1) { mvt = null; motif = 'photo 1 (borne 6) ouverte : ouverture refusée'; }
      } else if (e.ordre === 'fermeture') {
        if (!libre.actif('7')) motif = 'photo 2 (borne 7) ouverte : fermeture refusée';
        else if (!testOk) motif = 'test des cellules refusé : leur contact ne s’ouvre pas quand le 12 V TX est coupé';
        else if (photo2) mvt = 'fermeture';
        else { mvt = photo1 ? 'reouverture' : null; motif = 'faisceau coupé : arrêt et renvoi en ouverture'; }
      }
    }
    // Moteur 1 : rouge sur 21 (+), bleu sur 20 (−) ; inversé, le portail part à contresens.
    const sur = (a: string, b: string) => find(a) === find(b);
    const moteurOk = sur('mot.rouge', 'car.21') && sur('mot.bleu', 'car.20') && !sur('car.20', 'car.21');
    const moteurInv = sur('mot.rouge', 'car.20') && sur('mot.bleu', 'car.21') && !sur('car.20', 'car.21');
    const tourne = mvt != null && (moteurOk || moteurInv);
    const code = !tourne ? G5_MVT.arret : moteurInv ? G5_MVT.inverse : G5_MVT[mvt as keyof typeof G5_MVT];
    // Lampe flash : sortie 16 pendant le mouvement, 12 V entre ses bornes 3 et 4.
    const flash = tourne && alimentee(find, 'h1.3', 'h1.4', G5_FLASH, G5_ZERO);
    const clignote = flash && e.jp1 === 'flash';
    const LIB: Record<string, string> = {
      totale: 'ouverture totale ▶', partielle: 'ouverture partielle (piéton) ▶',
      fermeture: 'fermeture ◀', reouverture: 'arrêt et réouverture ▶',
    };
    const libMoteur = !mvt ? `Portail immobile${motif ? ` (${motif})` : ''}`
      : !tourne ? `Moteur M1 non raccordé : le portail ne bouge pas (${LIB[mvt]} demandée)`
        : moteurInv ? `Portail à contresens : ${LIB[mvt]} demandée, le moteur tourne à l’envers`
          : `Portail : ${LIB[mvt]}${motif ? ` · ${motif}` : ''}`;
    const fermes = ['q1', 'f2', 'f3'].every(id => organeFerme(sim, id));
    return {
      alim: [
        { id: 'boitier', label: 'Boîtier STAR 24 alimenté (230 V~)', on: boitier, tone: 'good' },
        {
          id: 'carte', label: boitier && !carte ? 'Carte en défaut : court-circuit sur le 12 V' : 'Carte AKIA PU2M : commun + 12 V présent',
          on: boitier, tone: boitier && !carte ? 'crit' : 'good',
        },
        { id: 'gsm', label: 'Récepteur GSM alimenté (LED GSM)', on: gsm, tone: 'good' },
        { id: 'cellules', label: 'Cellules émettrice et réceptrice alimentées', on: now.tx && now.rx, tone: 'good' },
        { id: 'faisceau', label: coupe ? 'Faisceau coupé' : 'Faisceau reçu : contact COM – OUT fermé', on: now.rxFerme, tone: 'good' },
        { id: 'photo1', label: 'Photo 1 (borne 6) fermée', on: photo1, tone: 'good' },
        { id: 'photo2', label: 'Photo 2 (borne 7) fermée', on: photo2, tone: 'good' },
        { id: 'sortie', label: s1 ? 'Sortie 1 du GSM collée' : s2 ? 'Sortie 2 du GSM collée' : 'Sorties du GSM au repos', on: s1 || s2, tone: 'accent' },
        ...(maintenue ? [{ id: 'maintenue', label: `Entrée ${maintenue} fermée au repos (contact NC du GSM ?)`, on: true, tone: 'crit' as const }] : []),
      ],
      recepteurs: [
        {
          id: 'portail', label: libMoteur, on: tourne && !moteurInv, tone: moteurInv ? 'crit' : 'good',
          ancre: { borne: 'mot.rouge', dx: 56, dy: -30 }, picto: mvt === 'fermeture' ? '◀' : '▶',
        },
        {
          id: 'flash', label: clignote ? 'Lampe flash : clignote' : flash ? 'Lampe flash : allumée fixe (JP1 en mode fixe)' : 'Lampe flash éteinte',
          on: flash, tone: 'accent', ancre: { borne: 'h1.3', dx: 0, dy: -150 }, picto: clignote ? '✺' : '●',
        },
      ],
      sousTension: fermes && carte && gsm,
      valeurs: { mvt: code, flash: clignote ? 2 : flash ? 1 : 0 },
    };
  },
  observer(ev, e) {
    const mvt = ev.valeurs?.mvt ?? 0;
    const clignote = ev.valeurs?.flash === 2;
    const out: string[] = [];
    if (!ev.sousTension) return out;
    if (e.ordre === 'total' && mvt === G5_MVT.totale && clignote) out.push('total');
    if (e.ordre === 'pieton' && mvt === G5_MVT.partielle && clignote) out.push('pieton');
    if (e.ordre === 'fermeture' && e.coupe !== true && mvt === G5_MVT.fermeture) out.push('fermeture');
    if (e.ordre === 'fermeture' && e.coupe === true && mvt === G5_MVT.reouverture) out.push('securite');
    return out;
  },
  attendus: [
    { id: 'total', label: 'Appel GSM, Sortie 1 : ouverture totale, flash clignotant' },
    { id: 'pieton', label: 'Appel GSM, Sortie 2 : ouverture partielle (piéton), flash clignotant' },
    { id: 'fermeture', label: 'Refermeture : les cellules sont testées, le portail se ferme' },
    { id: 'securite', label: 'Faisceau coupé pendant la fermeture : arrêt et réouverture' },
  ],
};
/* ═══ chevrerie-g5 : fin ═══ */

export const MODELES: Record<string, ModelePlatine> = {
  [Q13.tpId]: Q13,
  [Q58.tpId]: Q58,
  [Q67.tpId]: Q67,
  [D31.tpId]: D31,
  [E343.tpId]: E343,
  [G5.tpId]: G5, // chevrerie-g5
  [E222.tpId]: E222, // chevrerie-e222
  [B4.tpId]: B4, // chevrerie-b4
  [A4.tpId]: A4, // chevrerie-a4-ssi
};
