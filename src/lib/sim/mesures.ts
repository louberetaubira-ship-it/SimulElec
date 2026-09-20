/**
 * Mesures, EPI et consignation — module pur (sans React).
 * Port de `netOf`, `voltage`, `ohms`, `mesRead`, `mesCheck`, `EPI`, `MSTEPS`, `INSTS`
 * de `docs/reference/illustration-v3.tpl.html`, généralisé par la table `nets` des TP.
 */
import type { AttemptState, ExpectedMeasure, InstrumentKind, ReadingRecord, TerminalNet, TpDefinition } from '../types';
import { f3Ok, isControlLive, isRunning, motorOf, type SimState } from './engine';
import { resistanceCommande, tensionCommande, liaisonCoupee, type Arete } from './commande';
import { estBorneMoteur, resistancePlaque } from './plaque';

/* ------------------------------------------------------------------ EPI */

export interface EpiItem { id: string; name: string; req: boolean; icon: string }

export const EPI: EpiItem[] = [
  { id: 'gants', name: 'Gants isolants classe 00 (500 V)', req: true, icon: '<path d="M12 40V20c0-4 3-6 6-6h10c3 0 6 2 6 6v20z" fill="#D97706"/><path d="M14 20l-3-9c-1-2 2-4 3-2l4 9M20 18l-1-11c0-2 3-2 3 0l1 11M26 18l1-11c0-2 3-2 3 0l-1 11M32 20l3-8c1-2 4-1 3 1l-3 9" stroke="#D97706" stroke-width="3" fill="none" stroke-linecap="round"/>' },
  { id: 'ecran', name: 'Écran facial anti-UV', req: true, icon: '<path d="M8 12h28v6H8z" fill="#3A4047"/><path d="M10 18h24v14c0 6-5 8-12 8s-12-2-12-8z" fill="#9AD0F5" opacity=".7" stroke="#3A4047"/>' },
  { id: 'vat', name: 'VAT vérifié (avant et après)', req: true, icon: '<rect x="14" y="4" width="16" height="36" rx="4" fill="#D93A3A"/><rect x="18" y="8" width="8" height="8" fill="#20262D"/><circle cx="22" cy="24" r="2.5" fill="#3DFF7A"/><circle cx="22" cy="31" r="2.5" fill="#FFD84D"/>' },
  { id: 'cadenas', name: 'Cadenas + étiquette de consignation', req: true, icon: '<path d="M14 20v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#3A4047" stroke-width="3"/><rect x="10" y="20" width="24" height="18" rx="3" fill="#D93A3A"/><circle cx="22" cy="29" r="2.5" fill="#fff"/>' },
  { id: 'tapis', name: 'Tapis isolant / nappe', req: false, icon: '<rect x="4" y="30" width="36" height="8" rx="2" fill="#3A4047"/><rect x="4" y="30" width="36" height="3" fill="#6E7780"/>' },
  { id: 'outils', name: 'Outils isolés 1000 V', req: true, icon: '<rect x="8" y="26" width="28" height="8" rx="4" fill="#D93A3A" transform="rotate(-45 22 30)"/><path d="M28 12l6-6 4 4-6 6" fill="#8E969E"/>' },
  { id: 'chaussures', name: 'Chaussures de sécurité', req: true, icon: '<path d="M6 32h32v4H6zM8 32c0-8 6-8 10-14l6 2c2 6 10 6 14 12" fill="#3A4047"/>' },
  { id: 'casque', name: 'Casque de chantier', req: false, icon: '<path d="M8 28a14 14 0 0 1 28 0z" fill="#FFD84D"/><rect x="4" y="28" width="36" height="4" rx="2" fill="#D9A400"/>' },
  { id: 'bijoux', name: 'Bijoux et montre retirés', req: true, icon: '<circle cx="22" cy="22" r="10" fill="none" stroke="#D9A400" stroke-width="4"/><path d="M8 8l28 28" stroke="#D93A3A" stroke-width="4"/>' },
];

export const epiComplete = (epi: Record<string, boolean>): boolean =>
  EPI.filter((e) => e.req).every((e) => epi[e.id]);

/* ---------------------------------------------------------- consignation */

export interface ConsStep { id: string; title: string; detail: string }

/** Les 5 temps de l'intervention (NF C 18-510), portés de `MSTEPS`. */
export const CONS_STEPS: ConsStep[] = [
  { id: 'epi', title: 'EPI, outillage et pré-identification', detail: 'Choisir l\'équipement adapté au domaine BT, identifier la platine, le schéma et l\'appareil de séparation.' },
  { id: 'cons', title: 'Consignation', detail: 'Séparation par l\'appareil de tête · condamnation par cadenas · identification · VAT (vérification sur source, mesures, re-vérification).' },
  { id: 'hors', title: 'Mesures hors tension', detail: 'Continuité PE, isolement 500 V, résistance d\'enroulement.' },
  { id: 'decons', title: 'Déconsignation', detail: 'Retrait de l\'étiquette et du cadenas, fermeture des protections de l\'amont vers l\'aval, essai.' },
  { id: 'sous', title: 'Mesures sous tension', detail: 'Tensions, courant de ligne à la pince, vitesse au tachymètre.' },
];

/* ------------------------------------------------------------ instruments */

export interface InstrumentDef {
  id: InstrumentKind;
  name: string;
  /** Clé de bibliothèque pour la photo miniature. */
  libKey: string | null;
  dials: string[];
}

export const INSTRUMENTS: InstrumentDef[] = [
  { id: 'mm', name: 'Multimètre TRMS', libKey: 'l_appareil_multimetre_rms', dials: ['OFF', 'V~', 'V⎓', 'Ω', '•))', 'mV', 'A~'] },
  { id: 'clamp', name: 'Pince ampèremétrique', libKey: 'l_appareil_pince_ac', dials: ['OFF', 'A~', 'V~', 'Ω', 'Hz'] },
  { id: 'ctrl', name: 'Contrôleur d\'installation', libKey: 'l_appareil_controleur_d_installation_1', dials: ['OFF', 'RISO 500 V', 'RPE 200 mA', 'RT 3 points', 'ZS boucle', 'DDR ΔT', 'V~'] },
  { id: 'vat', name: 'VAT · vérificateur d\'absence de tension', libKey: null, dials: ['test'] },
  { id: 'tach', name: 'Tachymètre optique', libKey: null, dials: ['tr/min'] },
];

export const instrumentDef = (id: InstrumentKind | null): InstrumentDef | null =>
  id ? INSTRUMENTS.find((i) => i.id === id) ?? null : null;

/* ------------------------------------------------------------------ nets */

export interface NetInfo { net: string; live: boolean; src?: boolean }

/** La condition de présence de tension est-elle remplie ? */
function liveWhen(cond: TerminalNet['live'], sim: SimState): boolean {
  switch (cond) {
    case 'always': return true;
    case 'q1': return sim.q1;
    // Champ PV : source indépendante, vive dès que le sectionneur Q2 (f2) est fermé,
    // que Q1 le soit ou non. (À l'inverse de 'f2', modèle moteur où f2 est en aval de q1.)
    case 'q2': return sim.f2;
    // Aval du différentiel Q3 (départ 230 V du tableau) : sous tension seulement si l'onduleur
    // débite ET Q3 est fermé et non déclenché. C'est ce qui rend le défaut « Q3 déclenché »
    // visible — 230 V à la sortie de l'onduleur, mais 0 V au tableau.
    case 'q3': return isRunning(sim) && f3Ok(sim);
    // Entrée continue de l'onduleur (B+/B−) : alimentée par le bus 24 V (Q1), sauf si le
    // fil + du bus est débranché (défaut x2) — alors l'entrée est isolée et lit 0 V.
    case 'onduDC': return sim.q1 && sim.fault !== 'x2';
    case 'f2': return sim.q1 && sim.f2;
    case 'f3':
    case 'ctl': return isControlLive(sim);
    case 'km1': return isControlLive(sim) && sim.km1;
    case 'run': return isRunning(sim);
    case 'off': return false;
    default: return false;
  }
}

/** Réseau d'appartenance d'une borne + présence de tension, d'après `tp.nets`. */
export function netOf(tp: TpDefinition, sim: SimState, id: string | null): NetInfo | null {
  if (!id) return null;
  if (id.startsWith('RES.')) return { net: id.slice(4), live: true, src: true };
  const table = tp.nets[id];
  if (table) return { net: table.net, live: liveWhen(table.live, sim) };

  // secours : préfixes connus non déclarés par le TP
  const dot = id.indexOf('.');
  const prefix = dot < 0 ? id : id.slice(0, dot);
  const term = dot < 0 ? '' : id.slice(dot + 1);
  if (prefix === 'M') {
    const m: Record<string, string> = { U1: 'U', V1: 'V', W1: 'W', PE: 'PE', U2: 'M2', V2: 'M2', W2: 'M2' };
    return { net: m[term] ?? 'M', live: term === 'PE' ? true : isRunning(sim) };
  }
  if (['S1', 'S2', 'H1', 'H2'].includes(prefix)) return { net: 'C', live: isControlLive(sim) };
  return null;
}

const PHASES = ['L1', 'L2', 'L3'];
const isPhase = (n: string): boolean => PHASES.includes(n) || ['U', 'V', 'W'].includes(n);
const asPhase = (n: string): string => (n === 'U' ? 'L1' : n === 'V' ? 'L2' : n === 'W' ? 'L3' : n);
const isZero = (n: string): boolean => n === 'N' || n === 'PE' || n === '0' || n === 'C0';

/**
 * Tension entre deux bornes (V), `null` si l'une des bornes est inconnue.
 *
 * La tension de commande n'est pas une constante : elle vaut ce que donnent les
 * prises réellement raccordées au transformateur. Un élève qui a pris la 230 au
 * lieu de la 400 lit 41,7 V à son voltmètre — et c'est ainsi qu'il découvre sa
 * faute (`src/lib/sim/trafo.ts`).
 */
export function voltage(
  tp: TpDefinition,
  sim: SimState,
  a: string | null,
  b: string | null,
  reseau?: readonly Arete[],
): number | null {
  // Dans le circuit de commande, la tension n'est pas une étiquette : elle se
  // résout sur le réseau réellement câblé, contacts dans l'état où ils sont
  // (voir `commande.ts`). C'est ce qui rend le dépannage à l'instrument possible.
  if (reseau && isControlLive(sim) && dansReseau(reseau, a) && dansReseau(reseau, b)) {
    const u = tensionCommande(reseau, a as string, b as string, sim.u2 ?? tp.trafo?.bobine ?? 24);
    if (u != null) return Math.round(u * 10) / 10;
  }
  const A = netOf(tp, sim, a), B = netOf(tp, sim, b);
  if (!A || !B) return null;
  if (!A.live && !B.live) return 0;
  // ---- tensions CONTINUES (PV) : le réseau ne porte que la polarité (DC+/DC−), pas la
  // grandeur. On la reconstitue par zone : côté CHAMP (modules → Q2 → parafoudre →
  // fusibles → entrée MPPT) ≈ 72 V (Voc string 3S), côté BUS/PARC (sortie MPPT, batteries,
  // onduleur) = 24 V. Une borne hors tension (sectionneur ouvert) → absence.
  const isDC = (n: string) => n === 'DC+' || n === 'DC-';
  if (isDC(A.net) && isDC(B.net)) {
    if (!A.live || !B.live) return 0;
    if (A.net === B.net) return 0;
    // Tension continue DÉCLARÉE par le TP (bus KNX : 29 V) : elle prime sur la
    // reconstitution par zone, qui ne vaut que pour l'installation photovoltaïque.
    if (tp.uContinu != null) return tp.uContinu;
    const champ = /^(PV\d+\.|JB\.|f2\.|dcfuse\.|dcspd\.|mppt\.PV)/.test(a ?? '')
      || /^(PV\d+\.|JB\.|f2\.|dcfuse\.|dcspd\.|mppt\.PV)/.test(b ?? '');
    return champ ? 72 : 24;
  }
  const va = A.live ? asPhase(A.net) : '0';
  const vb = B.live ? asPhase(B.net) : '0';
  const uc = sim.u2 ?? tp.trafo?.bobine ?? 24;
  if (va === vb) return 0;
  if (isPhase(va) && isPhase(vb)) return 400;
  if (isPhase(va) && isZero(vb)) return 230;
  if (isPhase(vb) && isZero(va)) return 230;
  if ((va === 'C' && isZero(vb)) || (vb === 'C' && isZero(va))) return uc;
  if ((va === 'C' && isPhase(vb)) || (vb === 'C' && isPhase(va))) return Math.round(230 + uc);
  return 0;
}

/** La borne fait-elle partie du réseau de commande résolu ? */
const dansReseau = (e: readonly Arete[], id: string | null): boolean =>
  id != null && e.some(x => x.a === id || x.b === id);

const isWinding = (n: string): boolean => ['U', 'V', 'W', 'M2', 'M'].includes(n);

/**
 * Résistance ohmique d'un enroulement, déduite de la plaque signalétique.
 *
 * Sur ces petites machines asynchrones, la résistance continue d'un enroulement vaut couramment
 * 6 à 10 % de l'impédance nominale par phase `Z = U / (√3 · In)`. On retient 7,5 %, ce qui place
 * la valeur au milieu des fourchettes relevées sur les dossiers techniques.
 *
 * Elle était auparavant figée à 4,2 Ω — calibrée sur le premier TP (1,5 kW, In 3,3 A) et donc
 * fausse dès qu'un TP avait un autre moteur : sur la perceuse radiale (1,1 kW, In 2,6 A), la
 * mesure attendue entre 5 et 9 Ω était impossible à valider.
 */
export function resistanceEnroulement(tp: TpDefinition): number {
  const { U, In } = motorOf(tp);
  if (!(U > 0) || !(In > 0)) return 4.2;
  const z = U / (Math.sqrt(3) * In);
  return Math.round(z * 0.075 * 10) / 10;
}

/** Une liaison posée sur la platine, telle que l'ohmmètre la voit. */
export interface Pose { a: string; b: string; net: string }

/** Barrettes de couplage effectivement posées sur la plaque à bornes. */
const barrettesDe = (poses: readonly Pose[] | undefined): [string, string][] =>
  (poses ?? []).filter(w => w.net === 'BAR').map(w => [w.a, w.b] as [string, string]);

/**
 * Résistance entre deux bornes : valeur, `'ERR'` (sous tension) ou `'OL'`.
 *
 * Sur la plaque à bornes du moteur, la valeur est *résolue* à partir des barrettes que l'élève
 * a posées (voir `plaque.ts`) : U1–U2 donne la résistance d'un enroulement, U1–W2 ne conduit
 * que si une barrette la relie. Sans cet argument — audits, appels historiques — on considère
 * qu'aucune barrette n'est posée, donc que seuls les enroulements conduisent.
 */
/**
 * Borne de la plaque à bornes atteinte depuis ce point par le seul câble moteur.
 *
 * On ne suit que les liaisons **posées par l'installateur** (`prewired`) : ce sont
 * les conducteurs du câble, qui existent avant le TP. Suivre les fils de l'élève
 * ferait remonter la mesure jusque dans l'armoire, à travers des contacts ouverts.
 */
function borneMoteurAuBout(tp: TpDefinition, p: string | null): string | null {
  if (!p) return null;
  if (estBorneMoteur(p)) return p;
  const vus = new Set([p]);
  const file = [p];
  while (file.length) {
    const cur = file.shift() as string;
    for (const l of tp.liaisons) {
      if (!l.prewired) continue;
      const suite = l.a === cur ? l.b : l.b === cur ? l.a : null;
      if (!suite || vus.has(suite)) continue;
      if (estBorneMoteur(suite)) return suite;
      vus.add(suite); file.push(suite);
    }
  }
  return null;
}

export function ohms(
  tp: TpDefinition,
  sim: SimState,
  a: string | null,
  b: string | null,
  poses?: readonly Pose[],
  reseau?: readonly Arete[],
): number | 'ERR' | 'OL' | null {
  const A = netOf(tp, sim, a), B = netOf(tp, sim, b);
  if (!A || !B) return null;
  const u = voltage(tp, sim, a, b, reseau);
  if (A.live && B.live && u != null && u > 0) return 'ERR';
  // Un ohmmètre se refuse dès que le CIRCUIT est sous tension, pas seulement quand
  // il y a une différence de potentiel entre ses deux pointes : de part et d'autre
  // d'un contact ouvert la tension est nulle, et pourtant mesurer là est interdit.
  if (reseau && isControlLive(sim) && dansReseau(reseau, a) && dansReseau(reseau, b)) return 'ERR';

  // Les deux pointes peuvent être posées sur la plaque à bornes elle-même, ou au
  // bout du câble moteur, sur le bornier X1 : c'est le même enroulement, mesuré
  // deux fils plus loin. Un contrôle au bornier est justement ce qu'on demande à
  // l'élève quand la plaque est inaccessible — moteur immergé, machine en place.
  const ma = borneMoteurAuBout(tp, a), mb = borneMoteurAuBout(tp, b);
  if (ma && mb) {
    const r = resistancePlaque(resistanceEnroulement(tp), barrettesDe(poses), ma, mb);
    return r == null ? 'OL' : r;
  }

  // Circuit de commande consigné : la continuité se résout sur le réseau réel —
  // chaîne d'arrêt, bobine, contacts — et non sur une égalité d'étiquettes.
  if (reseau && dansReseau(reseau, a) && dansReseau(reseau, b)) {
    const r = resistanceCommande(reseau, a as string, b as string);
    return r == null ? 'OL' : r;
  }

  // Défaut injecté qui COUPE cette liaison précise (fusible fondu, fil débranché) : l'ohmmètre
  // ne voit plus la continuité — circuit ouvert. C'est ce qui rend les pannes du continu
  // (MEGA fondu, alimentation B+ de l'onduleur coupée) diagnosticables à la mesure.
  if (a && b && liaisonCoupee(tp, sim.fault, a, b)) return 'OL';

  // Résistance PARTICULIÈRE déclarée par le TP : une prise de terre ne vaut pas
  // 0,2 Ω comme un fil, elle vaut ce que vaut le sol. Déclarée borne à borne, elle
  // passe avant les valeurs par défaut (voir `TpDefinition.resistances`).
  const rDecl = resistanceDeclaree(tp, a, b);
  if (rDecl != null) return rDecl;

  if (A.net === B.net && A.net === 'PE') return 0.3;
  if (A.net === B.net) return 0.2;
  return 'OL';
}

/** Résistance déclarée par le TP entre deux bornes, dans un sens ou dans l'autre. */
function resistanceDeclaree(
  tp: Pick<TpDefinition, 'resistances'>, a: string | null, b: string | null,
): number | null {
  const table = tp.resistances;
  if (!table || !a || !b) return null;
  return table[`${a}|${b}`] ?? table[`${b}|${a}`] ?? null;
}

/* ------------------------------------------------------------- lecture */

const fr = (v: number, d = 1): string =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

export interface Probes { r: string | null; k: string | null }

/** Liaison serrée par la pince (identifiants + conducteur). */
export interface ClampWire { a: string; b: string; net: string }

export interface ReadOut {
  /** Valeur exploitable, `null` si l'appareil n'affiche pas un nombre. */
  value: number | null;
  display: string;
  unit: string;
  /** Mesure interdite ou dangereuse (Ω sous tension). */
  bad?: boolean;
  /** VAT : absence de tension confirmée. */
  ok?: boolean;
  /** Continuité sonore : l'appareil doit émettre un bip (position •))). */
  beep?: boolean;
}

/**
 * Nature du réseau de la paire mesurée : continu (bornes DC+/DC−) ou alternatif (phases /
 * neutre). Sert à router la lecture sur le bon calibre — un réseau continu ne se lit qu'en
 * V⎓, un réseau alternatif qu'en V~. `null` si une borne est inconnue.
 */
function pairKind(tp: TpDefinition, sim: SimState, a: string | null, b: string | null): 'DC' | 'AC' | null {
  const A = netOf(tp, sim, a), B = netOf(tp, sim, b);
  if (!A || !B) return null;
  const dc = (n: string) => n === 'DC+' || n === 'DC-';
  return (dc(A.net) || dc(B.net)) ? 'DC' : 'AC';
}

const EMPTY: ReadOut = { value: null, display: '', unit: '' };

/** Le conducteur serré par la pince porte-t-il le courant moteur ? */
function clampCurrent(sim: SimState, w: ClampWire | null): number {
  if (!w || !isRunning(sim)) return 0;
  const ids = `${w.a} ${w.b}`;
  if (['L1', 'L2', 'L3'].includes(w.net) && /(x1_[123]|q1|km1)\./.test(ids)) return sim.I;
  if (/(f1|x1_[678]|M)\./.test(ids)) return sim.I;
  if (w.net === 'C') return 0.08;
  return 0;
}

/** Lecture de l'appareil : port fidèle de `mesRead`. */
export function read(
  tp: TpDefinition,
  sim: SimState,
  inst: InstrumentKind | null,
  dial: string,
  probes: Probes,
  clamp: ClampWire | null = null,
  poses?: readonly Pose[],
  reseau?: readonly Arete[],
): ReadOut {
  const I = instrumentDef(inst);
  if (!I || dial === 'OFF') return EMPTY;
  const { r, k } = probes;
  const need = I.id !== 'clamp' && I.id !== 'tach' && !(r && k);

  if (I.id === 'vat') {
    if (!(r && k)) return { value: null, display: '--', unit: 'pose les 2 pointes' };
    const u = voltage(tp, sim, r, k, reseau) ?? 0;
    return u > 50
      ? { value: u, display: `⚡ ${u}`, unit: 'V · PRÉSENCE TENSION', ok: false }
      : { value: 0, display: '0', unit: 'V · absence de tension', ok: true };
  }

  if (I.id === 'tach') {
    const n = isRunning(sim) ? Math.round(sim.n) : 0;
    return { value: n, display: String(n), unit: 'tr/min' };
  }

  if (I.id === 'clamp' && dial === 'A~') {
    if (!clamp) return { value: 0, display: '0.00', unit: 'A · serre la pince sur un conducteur' };
    const i = clampCurrent(sim, clamp);
    return { value: i, display: fr(i, 2), unit: 'A~' };
  }

  if (need) return { value: null, display: '----', unit: 'brancher les 2 cordons' };

  // Tension : on la lit sur le calibre qui correspond au réseau. Continu (parc, champ, bus
  // DC) → V⎓ ; alternatif (départ 230 V après onduleur, TP moteur) → V~. Le mauvais calibre
  // affiche ≈ 0, comme un vrai appareil : un voltmètre AC ne « voit » pas le continu et
  // inversement. C'est la même règle pour tous les TP.
  if (dial === 'V~' || dial === 'V⎓' || dial === 'mV') {
    const u = voltage(tp, sim, r, k, reseau);
    if (u == null) return { value: null, display: '--', unit: dial };
    const kind = pairKind(tp, sim, r, k);
    const wantDC = dial === 'V⎓' || dial === 'mV';
    const bon = wantDC ? kind === 'DC' : kind === 'AC';
    if (!bon) return { value: 0, display: fr(0, dial === 'mV' ? 1 : 1), unit: `${dial} · mauvais calibre` };
    if (dial === 'mV') return { value: u * 1000, display: fr(u * 1000, 0), unit: 'mV⎓' };
    return { value: u, display: fr(u, 1), unit: dial };
  }

  if (dial === 'Ω' || dial === 'RPE 200 mA' || dial === '•))') {
    const o = ohms(tp, sim, r, k, poses, reseau);
    if (o === 'ERR') return { value: null, display: 'ERR ⚡', unit: 'tension présente !', bad: true };
    if (o === 'OL' || o == null) return { value: null, display: 'OL', unit: 'Ω' };
    return {
      value: o,
      display: dial === '•))' ? `●))) ${fr(o, 1)}` : fr(o, 2),
      unit: dial === '•))' ? 'Ω · bip' : 'Ω',
      // Continuité sonore : l'appareil bipe tant qu'il « voit » une liaison (faible résistance).
      beep: dial === '•))',
    };
  }

  // Résistance de la PRISE DE TERRE, méthode des trois points. Ce n'est pas la
  // continuité d'un conducteur : c'est ce que vaut le sol, et le TP la déclare
  // (`resistances`). La barrette de coupure doit être ouverte — si elle ne l'est
  // pas, l'électrode est en parallèle avec toutes les masses et la lecture ment.
  if (dial === 'RT 3 points') {
    const o = ohms(tp, sim, r, k, poses, reseau);
    if (o === 'ERR') return { value: null, display: 'ERR ⚡', unit: 'tension présente !', bad: true };
    if (o === 'OL' || o == null) return { value: null, display: 'OL', unit: 'Ω · pointes hors prise de terre' };
    return { value: o, display: fr(o, 1), unit: 'Ω · prise de terre' };
  }

  if (dial === 'RISO 500 V') {
    const A = netOf(tp, sim, r), B = netOf(tp, sim, k);
    if (!A || !B) return { value: null, display: '--', unit: '' };
    const u = voltage(tp, sim, r, k, reseau);
    if (A.live && B.live && u != null && u > 0) {
      return { value: null, display: 'ERR ⚡', unit: 'circuit sous tension : interdit', bad: true };
    }
    if ((isWinding(A.net) && B.net === 'PE') || (isWinding(B.net) && A.net === 'PE')) {
      return { value: 200, display: '> 200', unit: 'MΩ · 500 V DC' };
    }
    if (estBorneMoteur(r) && estBorneMoteur(k)) {
      const o = resistancePlaque(resistanceEnroulement(tp), barrettesDe(poses), r as string, k as string);
      return o == null
        ? { value: 200, display: '> 200', unit: 'MΩ · 500 V DC' }
        : { value: o, display: fr(o, 1), unit: 'Ω (enroulement)' };
    }
    return { value: 200, display: '> 200', unit: 'MΩ' };
  }

  if (dial === 'ZS boucle' || dial === 'DDR ΔT') {
    return { value: null, display: 'n/a', unit: 'pas de DDR sur cette platine' };
  }
  if (dial === 'A~') return { value: 0, display: '0.00', unit: 'A · utilise la pince' };
  if (dial === 'Hz') return { value: isRunning(sim) ? 50 : 0, display: isRunning(sim) ? '50.0' : '0.0', unit: 'Hz' };
  return { value: null, display: '--', unit: '' };
}

/* --------------------------------------------------- mesures attendues */

/** Positions de sélecteur acceptées pour une mesure attendue. */
function dialsFor(expected: string): string[] {
  if (expected === 'Ω' || expected === 'RPE 200 mA') return ['Ω', 'RPE 200 mA', '•))'];
  return [expected];
}

const sameCondition = (m: ExpectedMeasure, sim: SimState): boolean => {
  if (m.when === 'run') return isRunning(sim);
  if (m.when === 'ctl') return isControlLive(sim);
  if (m.when === 'off') return !sim.q1;
  return true;
};

const samePair = (m: ExpectedMeasure, a?: string, b?: string): boolean =>
  (m.a === a && m.b === b) || (m.a === b && m.b === a);

/** Mesures attendues d'une étape. */
export const mesuresFor = (tp: TpDefinition, stage: ExpectedMeasure['stage']): ExpectedMeasure[] =>
  tp.mesures.filter((m) => m.stage === stage);

/** Une mesure attendue est-elle déjà validée ? */
export const mesureDone = (st: AttemptState, id: string): boolean =>
  st.readings.some((r) => r.expectedId === id);

/** Identifiant de la mesure attendue validée par cette lecture, s'il y en a une. */
export function checkExpected(
  tp: TpDefinition,
  sim: SimState,
  reading: Pick<ReadingRecord, 'dial' | 'a' | 'b' | 'wire' | 'value' | 'instrument'>,
): string | null {
  for (const m of tp.mesures) {
    if (!dialsFor(m.dial).includes(reading.dial)) continue;
    if (!sameCondition(m, sim)) continue;
    if (m.wire) {
      if (reading.wire !== m.wire) continue;
    } else if (m.a && m.b) {
      if (!samePair(m, reading.a, reading.b)) continue;
    } else if (m.instrument !== reading.instrument) {
      continue;
    }
    const v = reading.value;
    if (v == null || !Number.isFinite(v)) continue;
    if (v < m.min || v > m.max) continue;
    return m.id;
  }
  return null;
}

/** Toutes les mesures d'une étape sont-elles validées ? */
export const mesuresComplete = (tp: TpDefinition, st: AttemptState, stage: ExpectedMeasure['stage']): boolean => {
  const list = mesuresFor(tp, stage);
  return list.length > 0 && list.every((m) => mesureDone(st, m.id));
};

/** Résumé lisible d'une lecture, pour le journal et le bot. */
export function readingLabel(r: ReadingRecord): string {
  const where = r.wire
    ? `pince sur ${r.wire.replace('>', ' → ')}`
    : r.a && r.b
      ? `${r.a} / ${r.b}`
      : r.instrument === 'tach' ? 'visée sur l\'arbre du moteur' : 'sans point de mesure';
  return `${r.dial} · ${where} = ${r.display}`;
}

/** Vitesse de synchronisme du TP (pour les commentaires du tachymètre). */
export const ns = (tp: TpDefinition): number => motorOf(tp).ns;
