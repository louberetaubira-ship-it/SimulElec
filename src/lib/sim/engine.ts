import type { Liaison, PupitreItem, TpDefinition } from '../types';
import { pupitreOf } from '../scene/geometry';
import { repereSlot } from './reperes';
import type { DiagTrafo } from './trafo';

/** Ce dont le moteur a besoin pour nommer un appareil comme il est marqué sur la platine. */
type Rep = Pick<TpDefinition, 'slots'>;

/**
 * Repère d'un appareil, ou tournure neutre quand l'appelant n'a pas passé le TP.
 * Aucun message destiné à l'élève n'écrit « Q1 » ou « F2 » en dur : le même moteur
 * sert une platine où la protection du primaire s'appelle F2 et une autre où elle
 * s'appelle Q2.
 */
const NEUTRE: Record<string, string> = {
  q1: 'Le sectionneur général', f2: 'La protection du primaire',
  f3: 'La protection du secondaire', f1: 'Le relais thermique', km1: 'Le contacteur',
};
const rep = (tp: Partial<Rep> | undefined, id: string): string =>
  tp?.slots ? repereSlot({ slots: tp.slots }, id) : (NEUTRE[id] ?? id.toUpperCase());

/** Pannes injectables (identifiants des `faults` des TP v3). */
export type FaultId = 'a2' | 's1' | 'l2' | 'x2' | 'f3';

const FAULT_IDS: FaultId[] = ['a2', 's1', 'l2', 'x2', 'f3'];
export const isFaultId = (v: string | null | undefined): v is FaultId =>
  v != null && (FAULT_IDS as string[]).includes(v);

/** Couplage de la boîte à bornes du moteur. */
export type Coupling = 'Y' | 'D';

/** État électrique de la platine — pur, sérialisable, sans React. */
export interface SimState {
  /** Q1, disjoncteur moteur : fermé ? */
  q1: boolean;
  /** F2, protection du primaire 400 V de T1 : fermé ? */
  f2: boolean;
  /** F3, protection du secondaire 24 V : fermé ? */
  f3: boolean;
  /** KM1 enclenché ? */
  km1: boolean;
  /** F1, relais thermique déclenché ? */
  f1trip: boolean;
  /** Couplage du moteur (Y sur 400 V ; Δ = surintensité ×1,73). */
  coupling: Coupling;
  /** Charge mécanique (1 = charge nominale). */
  load: number;
  /** Courant de ligne instantané (A). */
  I: number;
  /** Vitesse instantanée (tr/min). */
  n: number;
  /** Pointe de courant mémorisée (fonction MAX de la pince). */
  peak: number;
  /** Image thermique du relais F1. */
  heat: number;
  /**
   * Panne injectée (secrète pour l'élève) : identifiant d'une panne du TP. Les
   * cinq pannes historiques (`FaultId`) gardent leur effet câblé dans le moteur ;
   * les autres agissent par ce qu'elles déclarent (`coupe`, `ouvre`, `croise`, `nets`).
   */
  fault: string | null;
  /** Bouton marche maintenu enfoncé. */
  s2Held: boolean;
  /**
   * Boutons à verrouillage (coup de poing) restés enfoncés, par repère :
   * leur contact NC reste ouvert jusqu'au déverrouillage explicite.
   */
  latched: Record<string, boolean>;
  /**
   * Carter / écran de protection en place (vrai au départ) : commande
   * l'interrupteur de position quand le TP en déclare un.
   */
  carter: boolean;
  /** Temps écoulé depuis l'enclenchement de KM1 (s). */
  t: number;
  /** L'élève a déjà arrêté le moteur par S1. */
  stoppedByS1: boolean;
  /** KM1 a essayé de coller sans tenir (panne A2). */
  chattering: boolean;
  /**
   * Tension à vide au secondaire du transformateur de commande, déduite des
   * prises réellement câblées (`src/lib/sim/trafo.ts`). `null` : le TP n'a pas
   * de transformateur, ou le primaire n'est pas encore raccordé.
   */
  u2: number | null;
  /**
   * Faute de prise diagnostiquée par `etatTrafo` : c'est elle, et non la seule
   * tension, qui dit quel organe souffre — le fer du transformateur (prise du
   * primaire trop basse) ou la bobine du contacteur (prise du secondaire trop
   * haute). `null` : pas de transformateur, ou pas encore raccordé.
   */
  trafoDiag: DiagTrafo | null;
  /**
   * La protection du primaire a déclenché sur surexcitation : prise trop basse
   * pour la tension du réseau, circuit magnétique saturé.
   */
  trafoTrip: boolean;
  /**
   * Bobine du contacteur détruite par une surtension prolongée (prise du
   * secondaire trop haute). Elle ne colle plus tant qu'elle n'est pas remplacée.
   */
  coilBurnt: boolean;
  /** Échauffement de la bobine sur-alimentée (s). */
  coilHeat: number;
  /**
   * Organes de sectionnement supplémentaires (`TpDefinition.sectionneurs`) : fermé ?
   * Absent = ouvert, comme `q1`, `f2` et `f3` au départ.
   */
  aux?: Record<string, boolean>;
}

export const initialSim = (): SimState => ({
  q1: false, f2: false, f3: false, km1: false, f1trip: false, coupling: 'Y',
  load: 0.8, I: 0, n: 0, peak: 0, heat: 0,
  fault: null, s2Held: false, latched: {}, carter: true,
  t: 0, stoppedByS1: false, chattering: false,
  u2: null, trafoDiag: null, trafoTrip: false, coilBurnt: false, coilHeat: 0,
  aux: {},
});

/** Un organe de sectionnement supplémentaire est-il fermé ? */
export const auxFerme = (s: Pick<SimState, 'aux'>, id: string): boolean => s.aux?.[id] === true;

/** Tous les organes supplémentaires du TP sont-ils fermés ? (vrai s'il n'y en a pas) */
export const sectionneursFermes = (tp: Pick<TpDefinition, 'sectionneurs'>, s: Pick<SimState, 'aux'>): boolean =>
  (tp.sectionneurs ?? []).every(id => auxFerme(s, id));

/** Bascule un organe supplémentaire. */
export function toggleAux(s: SimState, id: string, tp?: Rep): ActionResult {
  const ferme = !auxFerme(s, id);
  const r = rep(tp, id);
  return {
    state: { ...s, aux: { ...(s.aux ?? {}), [id]: ferme } },
    message: ferme ? `${r} fermé.` : `${r} ouvert : son aval est séparé.`,
  };
}

/** Caractéristiques moteur par défaut (TP sans moteur). */
const MOTOR_DEFAULT = { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 };
export const motorOf = (tp: TpDefinition) => tp.motor ?? MOTOR_DEFAULT;

// ---------------------------------------------------------------- états dérivés

/** Puissance présente en aval de Q1. */
export const isPowered = (s: SimState): boolean => s.q1;

/** Primaire de T1 sous tension (Q1 + F2 fermés). */
export const isControlSupplied = (s: SimState): boolean => s.q1 && s.f2;

/** F3 opérationnel (la panne « f3 » simule un déclenchement du secondaire). */
export const f3Ok = (s: SimState): boolean => s.f3 && s.fault !== 'f3';

/** Circuit de commande 24 V vivant : Q1 + F2 + F3, thermique non déclenché. */
export const isControlLive = (s: SimState): boolean => s.q1 && s.f2 && f3Ok(s) && !s.f1trip;

/**
 * La bobine reçoit-elle au moins 85 % de sa tension assignée ?
 *
 * La CEI 60947-4-1 (§8.2.1.2.1) garantit la fermeture d'un contacteur pour toute
 * tension comprise entre 85 % et 110 % de la tension assignée d'alimentation de
 * commande. En dessous de 85 %, la fermeture n'est plus garantie : c'est ce qui
 * arrive quand le primaire du transformateur est raccordé sur une prise trop
 * haute (400 V marqués, 230 V appliqués → 13,8 V au lieu de 24 V).
 */
export const coilVoltageOk = (s: SimState, tp: Pick<TpDefinition, 'trafo'>): boolean =>
  !tp.trafo || s.u2 == null || s.u2 >= 0.85 * tp.trafo.bobine;

/** Bobine détruite par une surtension prolongée : elle ne collera plus. */
export const coilAlive = (s: SimState): boolean => !s.coilBurnt;

/** Le moteur tourne (KM1 collé, puissance présente, thermique non déclenché). */
/**
 * État du câblage réalisé par l'élève, vu par le moteur de simulation.
 *
 * Le moteur reste pur : il ne connaît ni `st.wires` ni les étapes du parcours.
 * C'est l'appelant (le store du parcours) qui lui passe ce résumé, calculé par
 * `cablageEtat()` dans `progress.ts`. Un contacteur ne colle que si la boucle de
 * commande existe réellement, et un moteur ne tourne que si sa puissance est
 * câblée : sans cela, l'élève pouvait démarrer une platine entièrement nue.
 */
export interface Cablage {
  /** Toutes les liaisons de commande (C, C0) attendues sont faites ? */
  cmd: boolean;
  /** Toutes les liaisons de puissance attendues sont faites ? */
  pwr: boolean;
  /** Nombre de liaisons de commande encore à câbler. */
  cmdReste: number;
  /** Nombre de liaisons de puissance encore à câbler. */
  pwrReste: number;
}

/** Platine réputée entièrement câblée — valeur par défaut des appelants hors parcours. */
export const CABLAGE_OK: Cablage = { cmd: true, pwr: true, cmdReste: 0, pwrReste: 0 };

const nLiaisons = (n: number): string => `${n} liaison${n > 1 ? 's' : ''}`;

export const isRunning = (s: SimState): boolean => s.q1 && s.km1 && !s.f1trip;

/** Le contact NC du bouton d'arrêt est-il fermé ? (panne « s1 » = contact resté ouvert) */
export const s1Closed = (s: SimState): boolean => s.fault !== 's1';

/* ------------------------------------------------------------- pupitre */

/** Organes du pupitre par nature (le pupitre historique quand le TP n'en déclare pas). */
export const stopButtons = (tp: Pick<TpDefinition, 'pupitre'>): PupitreItem[] =>
  pupitreOf(tp).filter(p => p.kind === 'nc');
export const startButtons = (tp: Pick<TpDefinition, 'pupitre'>): PupitreItem[] =>
  pupitreOf(tp).filter(p => p.kind === 'no');

/** Un bouton à verrouillage est-il resté enfoncé ? */
export const isLatched = (s: SimState, rep: string): boolean => s.latched[rep] === true;

/** Premier coup de poing verrouillé du pupitre, s'il y en a un. */
export const latchedStop = (s: SimState, tp: Pick<TpDefinition, 'pupitre'>): PupitreItem | null =>
  stopButtons(tp).find(p => isLatched(s, p.rep)) ?? null;

/** Le carter coupe-t-il la commande ? (seulement si le TP déclare un interrupteur de position) */
export const carterOpen = (s: SimState, tp: Pick<TpDefinition, 'interPosition'>): boolean =>
  Boolean(tp.interPosition) && !s.carter;

/**
 * Chaîne d'arrêt fermée : tous les contacts NC du pupitre sont au repos,
 * aucun coup de poing verrouillé, et l'interrupteur de position est fermé.
 */
export const stopChainClosed = (s: SimState, tp: Pick<TpDefinition, 'pupitre' | 'interPosition'>): boolean =>
  s1Closed(s) && !latchedStop(s, tp) && !carterOpen(s, tp);

/** Le fil X2:3 → KM1 A1 est-il en place ? (panne « x2 ») */
export const a1Wired = (s: SimState): boolean => s.fault !== 'x2';

/** Le fil A2 → 0 V est-il serré ? (panne « a2 ») */
export const a2Wired = (s: SimState): boolean => s.fault !== 'a2';

/** La bobine peut-elle être alimentée si on ferme le chemin ? */
export const coilCircuitOk = (s: SimState): boolean => a1Wired(s) && a2Wired(s);

/** Potentiel 24 V présent en sortie de la chaîne d'arrêt (X2:2 / S2:13 / KM1:13). */
export const loopPhaseAtS2 = (s: SimState, tp: Pick<TpDefinition, 'pupitre' | 'interPosition'>): boolean =>
  isControlLive(s) && stopChainClosed(s, tp);

// ---------------------------------------------------------------- manœuvres

export interface ActionResult { state: SimState; message: string }

export function toggleQ1(s: SimState, tp?: Rep): ActionResult {
  const q1 = !s.q1;
  const r = rep(tp, 'q1');
  return {
    state: { ...s, q1, km1: q1 ? s.km1 : false, chattering: false },
    message: q1
      ? `${r} fermé : la puissance est sous tension.`
      : `${r} ouvert : platine séparée du réseau.`,
  };
}

export function toggleF2(s: SimState, tp?: Rep & Pick<TpDefinition, 'trafo'>): ActionResult {
  const f2 = !s.f2;
  const t = tp?.trafo;
  // Prise du PRIMAIRE trop basse pour le réseau : le flux dépasse largement les
  // 110 % qu'un transformateur supporte en permanence, le circuit sature et le
  // courant magnétisant fait déclencher la protection du primaire.
  // Une prise du SECONDAIRE trop haute ne fait pas ça : le fer va bien, c'est la
  // bobine qui souffre — traité dans `tick`.
  if (f2 && t && s.trafoDiag === 'surexcite') {
    return {
      state: { ...s, f2: false, km1: false, chattering: false, trafoTrip: true },
      message: `${rep(tp, 'f2')} déclenche aussitôt : le secondaire donne ${s.u2} V au lieu de `
        + `${t.bobine} V — le transformateur est alimenté sur une prise trop basse et sature.`,
    };
  }
  return {
    state: { ...s, f2, km1: f2 ? s.km1 : false, chattering: false, trafoTrip: f2 ? s.trafoTrip : false },
    message: f2
      ? `${rep(tp, 'f2')} fermé : le primaire du transformateur de commande est alimenté.`
      : `${rep(tp, 'f2')} ouvert : plus de primaire sur le transformateur.`,
  };
}

export function toggleF3(s: SimState, tp?: Rep): ActionResult {
  const f3 = !s.f3;
  const r = rep(tp, 'f3');
  return {
    state: { ...s, f3, km1: f3 ? s.km1 : false, chattering: false },
    message: f3
      ? `${r} fermé : le circuit de commande est sous tension.`
      : `${r} ouvert : plus de commande.`,
  };
}

export function resetF1(s: SimState, tp?: Rep & Pick<TpDefinition, 'variateur'>): ActionResult {
  const vsd = tp?.variateur;
  const r = vsd && tp?.slots ? repereSlot({ slots: tp.slots }, vsd.slot) : rep(tp, 'f1');
  if (!s.f1trip) {
    return {
      state: s,
      message: vsd
        ? `${r} n'affiche aucun défaut — rien à acquitter.`
        : `${r} est réglé à In — rien à réarmer.`,
    };
  }
  return {
    state: { ...s, f1trip: false, heat: 0 },
    message: vsd ? `Défaut acquitté sur ${r}.` : `${r} réarmé.`,
  };
}

export function setCoupling(s: SimState, coupling: Coupling, tp?: Rep): ActionResult {
  return {
    state: { ...s, coupling },
    message: coupling === 'Y'
      ? 'Couplage étoile : barrette W2-U2-V2, 230 V par enroulement.'
      : `Couplage triangle sur 400 V : surintensité ×1,73, ${rep(tp, 'f1')} va déclencher.`,
  };
}

/** Appui sur un bouton de marche (contact NO) du pupitre. */
function pressStart(s: SimState, tp: TpDefinition, btn: string, cab: Cablage): ActionResult {
  const held = { ...s, s2Held: true };
  const latch = latchedStop(s, tp);
  if (latch) {
    return {
      state: held,
      message: `Le coup de poing ${latch.rep} est verrouillé : déverrouille-le avant de redémarrer.`,
    };
  }
  if (carterOpen(s, tp)) {
    const ip = tp.interPosition;
    return {
      state: held,
      message: `Rien ne se passe : la protection est retirée — le contact ${ip?.rep ?? 'de position'} coupe la commande.`,
    };
  }
  if (!isPowered(s)) return { state: held, message: `Rien ne se passe : ${rep(tp, 'q1')} est ouvert.` };
  // Le contacteur exige le câblage réel : tant que la boucle de commande n'est pas
  // terminée, la bobine n'est reliée à rien et rien ne peut coller.
  if (!cab.cmd) {
    return {
      state: held,
      message: `Rien ne se passe : le circuit de commande n'est pas terminé — il reste `
        + `${nLiaisons(cab.cmdReste)} à câbler pour fermer la boucle de la bobine.`,
    };
  }
  if (s.trafoTrip) {
    return { state: held, message: `Rien ne se passe : ${rep(tp, 'f2')} a déclenché — vérifie la prise du primaire.` };
  }
  if (!s.f2) return { state: held, message: `Rien ne se passe : ${rep(tp, 'f2')} est ouvert.` };
  if (!s.f3) return { state: held, message: `Rien ne se passe : ${rep(tp, 'f3')} est ouvert.` };
  if (s.fault === 'f3') return { state: held, message: `Rien ne se passe, pourtant ${rep(tp, 'f3')} semble fermé.` };
  if (s.f1trip) return { state: held, message: `Rien ne se passe : ${rep(tp, 'f1')} a déclenché, 95-96 est ouvert.` };
  if (!coilVoltageOk(s, tp)) {
    const pc = Math.round(((s.u2 ?? 0) / (tp.trafo?.bobine ?? 1)) * 100);
    return {
      state: held,
      message: `${rep(tp, 'km1')} ne colle pas : la bobine n'a que ${s.u2} V, soit ${pc} % de sa tension `
        + 'assignée — en dessous des 85 % où la fermeture est garantie.',
    };
  }
  if (!s1Closed(s)) return { state: held, message: 'Rien ne se passe : le circuit de commande est coupé quelque part.' };
  if (!a1Wired(s)) return { state: held, message: 'Rien ne se passe, pourtant la commande est sous tension.' };
  if (!coilAlive(s)) {
    return { state: held, message: `${rep(tp, 'km1')} ne colle plus : sa bobine a grillé — il faut la remplacer.` };
  }
  if (!a2Wired(s)) {
    return { state: { ...held, chattering: true }, message: `${rep(tp, 'km1')} vibre mais ne tient pas : la bobine est mal alimentée.` };
  }
  if (s.km1) return { state: held, message: `${rep(tp, 'km1')} est déjà enclenché.` };
  const enclenche = tp.plcSorties
    ? `${btn} : l'automate exécute son programme, la sortie Q0.0 commande ${rep(tp, 'km1')}, qui s'enclenche.`
    : `${btn} : ${rep(tp, 'km1')} s'enclenche, l'auto-maintien 13-14 prend le relais.`;
  if (tp.variateur?.tcc === '3C') {
    return {
      state: { ...held, km1: true, t: 0, peak: 0, chattering: false },
      message: `${enclenche} ${repereSlot(tp, tp.variateur.slot)} s'allume et affiche rdY, mais le moteur ne part pas : `
        + 'en commande 3 fils (tCC = 3C), LI1 est l\'entrée d\'arrêt — il faudrait une impulsion sur LI2.',
    };
  }
  return {
    state: { ...held, km1: true, t: 0, peak: 0, chattering: false },
    // La commande est bonne, mais un moteur dont la puissance n'est pas câblée ne
    // tournera pas : on le dit au lieu de laisser l'élève devant un arbre immobile.
    message: cab.pwr
      ? enclenche
      : `${enclenche} Mais le moteur ne tourne pas : il reste ${nLiaisons(cab.pwrReste)} `
        + 'à câbler dans le circuit de puissance.',
  };
}

/** Appui sur un bouton d'arrêt (contact NC) : ouverture de la chaîne d'arrêt. */
function pressStop(s: SimState, item: PupitreItem, tp: Rep): ActionResult {
  const btn = item.rep;
  // un coup de poing déjà verrouillé se déverrouille au clic suivant (quart de tour)
  if (isLatched(s, btn)) {
    const latched = { ...s.latched };
    delete latched[btn];
    return { state: { ...s, latched }, message: `${btn} déverrouillé : la chaîne d'arrêt est refermée.` };
  }
  const latched = item.latching ? { ...s.latched, [btn]: true } : s.latched;
  const verrou = item.latching ? ' et se verrouille' : '';
  if (!s.km1) {
    return { state: { ...s, latched, chattering: false }, message: `${btn} : le circuit était déjà ouvert${verrou}.` };
  }
  return {
    state: { ...s, latched, km1: false, stoppedByS1: true, chattering: false },
    message: `${btn} : ${rep(tp, 'km1')} retombe${verrou}, le moteur s'arrête.`,
  };
}

/** Appui sur un organe du pupitre, désigné par son repère (« S2 », « S4 », « S3 »…). */
export function pressButton(
  s: SimState, tp: TpDefinition, rep: string, cab: Cablage = CABLAGE_OK,
): ActionResult {
  const item = pupitreOf(tp).find(p => p.rep === rep);
  if (!item || item.kind === 'lamp') return { state: s, message: `${rep} n'est pas un bouton.` };
  return item.kind === 'no' ? pressStart(s, tp, rep, cab) : pressStop(s, item, tp);
}

/** Relâchement d'un bouton du pupitre (seuls les boutons de marche sont maintenus). */
export function releaseButton(s: SimState): SimState {
  return { ...s, s2Held: false, chattering: false };
}

/**
 * Bascule le carter (écran de protection) commandé par l'interrupteur de position :
 * carter ouvert, la chaîne de commande est coupée exactement comme par un arrêt.
 */
export function toggleCarter(s: SimState, tp: Pick<TpDefinition, 'interPosition'> & Partial<Rep>): ActionResult {
  const carter = !s.carter;
  const ip = tp.interPosition?.rep ?? 'S1';
  const etat = tp.interPosition?.etat ?? 'écran de protection en place';
  return {
    state: { ...s, carter, km1: carter ? s.km1 : false, chattering: false },
    message: carter
      ? `${etat} : ${ip} referme la chaîne d'arrêt.`
      : `Protection retirée : ${ip} s'ouvre, ${rep(tp, 'km1')} retombe et le moteur s'arrête.`,
  };
}

/** Injecte une panne et remet la platine dans un état de départ pour le dépannage. */
export function injectFault(s: SimState, fault: string): SimState {
  return { ...s, fault, km1: false, f1trip: false, heat: 0, I: 0, n: 0, peak: 0, chattering: false, stoppedByS1: false };
}

export function repairFault(s: SimState): SimState {
  return { ...s, fault: null, f1trip: false, heat: 0, chattering: false, coilBurnt: false, coilHeat: 0 };
}

/**
 * Tire au sort une panne PARMI CELLES DU TP. Une panne qui déclare son effet au
 * réseau (`coupe`, `ouvre`, `croise`) est aussi légitime qu'une panne historique :
 * les limiter aux cinq identifiants câblés dans le moteur faisait tirer « a2 » sur un
 * TP qui n'en a pas, et l'étape de dépannage n'avait plus de constat à montrer.
 */
export function pickFault(tp: TpDefinition, rnd: number = Math.random()): string {
  const ids = tp.faults.map(f => f.id);
  if (!ids.length) return 'a2';
  return ids[Math.min(ids.length - 1, Math.floor(rnd * ids.length))];
}

/** La panne fait-elle partie de ce TP ? (sinon on ne l'injecte pas dans la simulation) */
export const estPanneDuTp = (tp: Pick<TpDefinition, 'faults'>, id: string | null | undefined): id is string =>
  id != null && tp.faults.some(f => f.id === id);

// ---------------------------------------------------------------- simulation

const SEUIL_TRIP = 3.0;      // image thermique en surcharge franche
const SEUIL_TRIP_D = 2.0;    // couplage triangle sur 400 V : déclenchement rapide
const SEUIL_TRIP_L2 = 6.0;   // marche en monophasé : plus lent mais inévitable
const SEUIL_BOBINE = 24;     // image thermique d'une bobine sur-alimentée (pertes en U²)
const lerp = (v: number, target: number, k: number, dt: number) => v + (target - v) * (1 - Math.exp(-k * dt));

/**
 * Avance la simulation de `dt` secondes.
 * Pointe de démarrage 6×In décroissante, glissement fonction de la charge,
 * courant ×1,73 en couplage triangle, déclenchement thermique au-delà de 120 %
 * de charge, en triangle, ou en marche sur deux phases.
 */
export function tick(
  state: SimState, tp: TpDefinition, dt: number, cab: Cablage = CABLAGE_OK,
): ActionResult {
  const s = { ...state };
  let message = '';
  const { In, ns } = motorOf(tp);
  const vsd = tp.variateur;
  // KM1 collé ne suffit pas : sans circuit de puissance câblé, l'arbre ne tourne pas.
  // Et en commande 3 fils (tCC = 3C), LI1 est l'entrée d'ARRÊT : le contact maintenu
  // de KM1 ne donne jamais l'ordre de marche, le variateur reste prêt (rdY).
  const on = isRunning(s) && cab.pwr && vsd?.tcc !== '3C';
  const oneLegLost = s.fault === 'l2';
  const kc = s.coupling === 'D' ? 1.73 : 1;

  if (on) s.t += dt; else s.t = 0;

  // Un variateur n'appelle PAS de pointe de démarrage : il part à fréquence nulle
  // et monte en rampe, le moteur reste à son courant nominal pendant toute la
  // montée. C'est la différence physique la plus visible avec le démarrage direct.

  let target = on ? In * (0.3 + 0.7 * s.load) * kc : 0;
  if (!vsd && on && s.t < 1.4) target = Math.max(target, In * 6 * kc * Math.exp(-s.t * 3.2));
  if (on && oneLegLost) target *= 1.6;
  s.I = lerp(s.I, target, on ? 4.2 : 3.5, dt);
  if (s.I > s.peak) s.peak = s.I;

  // Avec un variateur, la vitesse atteinte est celle de la consigne (HSP), pas
  // celle du réseau : ns est ramené au rapport HSP / FrS.
  const kf = vsd ? vsd.hsp / vsd.frs : 1;
  const nTarget = on ? (oneLegLost ? ns * 0.55 : ns * kf * (1 - 0.04 * s.load)) : 0;
  // La rampe est linéaire et dure ACC secondes de 0 à FrS : on la traduit en
  // constante de temps équivalente plutôt que de changer le modèle d'intégration.
  const kRamp = vsd ? (on ? 2.2 / vsd.acc : 2.2 / vsd.dec) : (on ? 0.75 : 0.55);
  s.n = lerp(s.n, nTarget, kRamp, dt);
  if (!on && s.n < 5) s.n = 0;
  if (!on && s.I < 0.02) s.I = 0;

  // Rampe d'accélération trop courte : le variateur demande un couple que le moteur
  // ne peut pas fournir, le courant crève la limite et il se met en défaut OCF.
  if (vsd && on && vsd.acc < 1 && s.t >= 0.25) {
    s.peak = Math.max(s.peak, In * 2.6);
    s.f1trip = true;
    s.km1 = false;
    s.heat = 0;
    return {
      state: s,
      message: `${repereSlot(tp, vsd.slot)} affiche OCF — surintensité : une rampe ACC de `
        + `${String(vsd.acc).replace('.', ',')} s est trop courte pour lancer la charge.`,
    };
  }

  // Protection I²t du variateur : elle compare le courant moteur au réglage ItH.
  // Réglé trop bas, elle coupe en service normal ; trop haut, elle laisse passer
  // une surcharge — il n'y a pas de relais thermique derrière pour rattraper.
  const ithDepasse = vsd?.ith != null && Number.isFinite(vsd.ith) && s.I > vsd.ith * 1.05;
  const surcharge = vsd?.ith != null && Number.isFinite(vsd.ith) ? ithDepasse : s.load > 1.2;
  if (on && (surcharge || oneLegLost || s.coupling === 'D')) {
    s.heat += dt;
    const seuil = s.coupling === 'D' ? SEUIL_TRIP_D : oneLegLost ? SEUIL_TRIP_L2 : SEUIL_TRIP;
    if (s.heat > seuil) {
      s.f1trip = true;
      s.km1 = false;
      s.heat = 0;
      // Avec un variateur il n'y a pas de relais thermique : c'est la protection
      // I²t interne qui coupe, et elle le dit par son code de défaut OLF.
      const prot = vsd ? repereSlot(tp, vsd.slot) : repereSlot(tp, 'f1');
      message = vsd
        ? (s.coupling === 'D'
          ? `${prot} affiche OLF : couplage triangle sur 400 V, le moteur appelle 1,73 fois trop de courant.`
          : ithDepasse && s.load <= 1.2
            ? `${prot} affiche OLF : le moteur absorbe ${s.I.toFixed(2).replace('.', ',')} A, au-dessus du réglage ItH = ${String(vsd.ith).replace('.', ',')} A.`
            : `${prot} affiche OLF — surcharge moteur détectée par la protection I²t.`)
        : (s.coupling === 'D'
          ? `${repereSlot(tp, 'f1')} déclenche : couplage triangle sur 400 V, le moteur appelle 1,73 fois trop de courant.`
          : `${repereSlot(tp, 'f1')} déclenche : surcharge du moteur.`);
    }
  } else if (s.heat > 0) {
    s.heat = Math.max(0, s.heat - dt * 0.5);
  }

  // Bobine sur-alimentée (prise du secondaire trop haute) : le fer du
  // transformateur va bien, c'est l'enroulement de la bobine qui encaisse. Ses
  // pertes varient comme le carré de la tension — 48 V sur une bobine 24 V, c'est
  // quatre fois l'échauffement nominal — et elle finit par griller.
  if (s.km1 && !s.coilBurnt && s.trafoDiag === 'surtension' && tp.trafo && s.u2 != null) {
    s.coilHeat += dt * (s.u2 / tp.trafo.bobine) ** 2;
    if (s.coilHeat > SEUIL_BOBINE) {
      s.coilBurnt = true;
      s.km1 = false;
      s.coilHeat = 0;
      message = `La bobine de ${repereSlot(tp, 'km1')} a grillé : ${s.u2} V au lieu de `
        + `${tp.trafo.bobine} V, elle n'a pas tenu. Reprends la prise du secondaire.`;
    }
  }

  return { state: s, message };
}

// ---------------------------------------------------------------- fils vivants

/**
 * Un fil est-il alimenté ? Sert à estomper les liaisons hors tension.
 * PE et 0 V ne sont jamais représentés comme vivants.
 */
export function netLive(l: Pick<Liaison, 'a' | 'b' | 'net'>, s: SimState, tp: TpDefinition): boolean {
  const net = l.net;
  if (net === 'PE' || net === 'C0' || net === 'N') return false;
  const ids = `${l.a} ${l.b}`;
  /** La liaison touche-t-elle l'une de ces bornes du pupitre ? */
  const touches = (list: string[]): boolean => list.some(t => ids.includes(t));

  if (net === 'C') {
    const pu = pupitreOf(tp);
    const lampsOfKind = (sig: PupitreItem['signals']): string[] =>
      pu.filter(p => p.kind === 'lamp' && (p.signals ?? 'run') === sig).map(p => `${p.rep}.`);
    // amont / aval des contacts : la chaîne d'arrêt (NC) alimente les boutons de marche (NO)
    const stopOut = stopButtons(tp).map(p => `${p.rep}.22`);
    const startIn = startButtons(tp).map(p => `${p.rep}.13`);
    const startOut = startButtons(tp).map(p => `${p.rep}.14`);

    if (/t1\.24|f3\.1/.test(ids)) return isControlSupplied(s);
    if (/f1\.9[78]/.test(ids) || touches(lampsOfKind('trip'))) return isControlLive(s) && s.f1trip;
    if (/f3\.2|f1\.9[56]|x2_1/.test(ids)) return isControlLive(s);
    if (/x2_2|km1\.13/.test(ids) || touches([...stopOut, ...startIn])) return loopPhaseAtS2(s, tp);
    if (/x2_3/.test(ids) || touches(startOut)) return loopPhaseAtS2(s, tp) && (s.s2Held || s.km1);
    if (/km1\.14|x2_4/.test(ids) || touches(lampsOfKind('run'))) return loopPhaseAtS2(s, tp) && s.km1;
    if (/km1\.A1/.test(ids)) return loopPhaseAtS2(s, tp) && a1Wired(s) && (s.km1 || s.s2Held);
    return isControlLive(s);
  }

  // puissance
  if (/RES\./.test(ids)) return true;
  if (/x1_[123]\.|q1\.[135]/.test(ids) && !/q1\.[246]/.test(ids)) return true;
  if (/q1\.[246]|f2\.|t1\.(0|400)/.test(ids)) return isPowered(s);
  if (oneLegCut(l, s)) return false;
  if (/km1\.[246]|f1\.|x1_[678]|M\./.test(ids)) return isRunning(s);
  return isPowered(s);
}

function oneLegCut(l: Pick<Liaison, 'a' | 'b' | 'net'>, s: SimState): boolean {
  return s.fault === 'l2' && l.net === 'L2' && /f1\.4|x1_7/.test(`${l.a} ${l.b}`);
}
