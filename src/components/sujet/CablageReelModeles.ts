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

export const MODELES: Record<string, ModelePlatine> = {
  [Q13.tpId]: Q13,
  [Q58.tpId]: Q58,
  [Q67.tpId]: Q67,
  [D31.tpId]: D31,
  [E343.tpId]: E343,
};
