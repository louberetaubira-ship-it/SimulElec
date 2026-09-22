import type {
  AttemptState, Bareme, BaremeOverride, EvaluationMode, Liaison, PrepQuestion, TpDefinition,
} from '../types';
import { isRunning, startButtons, type Cablage, type SimState } from './engine';
import { listeMiseSousTension, repereSlot } from './reperes';
import { linkKey } from './layout';
import { aParametrage, paramConforme, paramNonConformes, parametresOf } from './parametrage';
import { aKnxMiseEnService, knxConforme, knxErreurs } from './knxMiseEnService';
import { aImeonMiseEnService, imeonConforme, imeonErreurs, IMEON_BLOCS } from './imeonMiseEnService';
import { epiComplete, mesureDone, mesuresComplete, mesuresFor } from './mesures';
import type { CoursId } from '../data/cours';
import {
  evaluate, PLATINE_STAGE_DOMAINS, type CompetenceEval, type DiplomaId,
} from '../data/competences';

export const STAGES = [
  'Choix du TP', 'Énoncé', 'Préparation', 'Matériel', 'Pose', 'Câblage', 'Tests hors tension',
  'EPI & consignation', 'Mesures hors tension', 'Déconsignation & mise en service',
  'Mesures sous tension', 'Validation / maintenance',
] as const;

/**
 * Index des étapes, nommés.
 *
 * Ils ont longtemps été écrits en chiffres partout — et le jour où une étape
 * s'est insérée au milieu, chacun de ces chiffres est devenu faux en silence.
 * Une étape se désigne maintenant par son nom ; insérer la suivante ne demandera
 * que de compléter ce bloc et les tables indexées par étape.
 */
export const ETAPE = {
  CHOIX: 0,
  ENONCE: 1,
  PREPARATION: 2,
  MATERIEL: 3,
  POSE: 4,
  CABLAGE: 5,
  TESTS: 6,
  EPI: 7,
  HORS: 8,
  MISE_EN_SERVICE: 9,
  SOUS: 10,
  VALIDATION: 11,
} as const;

/** Libellés courts pour le stepper mobile. */
export const STAGES_SHORT = [
  'Choix', 'Énoncé', 'Préparation', 'Matériel', 'Pose', 'Câblage', 'Tests',
  'EPI', 'Mes. hors tension', 'Déconsignation', 'Mes. sous tension', 'Validation',
] as const;

export const STAGE_SLUGS = [
  'choix', 'enonce', 'preparation', 'materiel', 'pose', 'cablage', 'tests',
  'epi', 'mesures-hors-tension', 'mise-en-service', 'mesures-sous-tension', 'validation',
] as const;

export const STAGE_COUNT = STAGES.length;

/** Dernière étape accessible pour un TP non jouable (énoncé, préparation, matériel, pose). */
export const MAX_STAGE_PREVIEW = ETAPE.POSE;

export function initialState(): AttemptState {
  return {
    stage: 0,
    done: {},
    prep: {},
    choices: {},
    qcmErr: {},
    placed: {},
    wires: [],
    wireErrors: 0,
    poseErrors: 0,
    tests: {},
    epi: {},
    cons: { sep: false, lock: false, ident: false, vatRef: false, vat: [], vatRef2: false },
    decons: { unlock: false, close: false, essai: false },
    secu: { equip: {}, checks: {} },
    readings: [],
    fault: null,
    hypotheses: [],
    hypTests: [],
    diagnosis: null,
    remede: null,
    diagTries: 0,
    fixed: false,
    quiz: null,
    helpUsed: {},
    wiresRemoved: 0,
    resets: 0,
  };
}

/** Complète un état restauré (tentative commencée avant une évolution du contrat). */
export function normalizeState(raw: Partial<AttemptState> | null | undefined): AttemptState {
  const base = initialState();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    done: raw.done ?? base.done,
    // étape de préparation ajoutée après coup : une tentative plus ancienne n'en a pas
    prep: raw.prep ?? base.prep,
    choices: raw.choices ?? base.choices,
    // barème QCM ajouté après coup : une tentative sans compteur d'erreurs vaut {}
    qcmErr: raw.qcmErr ?? base.qcmErr,
    placed: raw.placed ?? base.placed,
    wires: raw.wires ?? base.wires,
    tests: raw.tests ?? base.tests,
    epi: raw.epi ?? base.epi,
    cons: { ...base.cons, ...(raw.cons ?? {}) },
    decons: { ...base.decons, ...(raw.decons ?? {}) },
    // sécurité des mesures sous tension ajoutée après coup
    secu: { ...base.secu, ...(raw.secu ?? {}) },
    readings: raw.readings ?? base.readings,
    helpUsed: raw.helpUsed ?? base.helpUsed,
    // compteurs ajoutés après coup : une tentative enregistrée avant leur existence vaut 0
    wiresRemoved: raw.wiresRemoved ?? base.wiresRemoved,
    resets: raw.resets ?? base.resets,
    // remède et journal d'hypothèses ajoutés après coup : une tentative enregistrée
    // avant leur existence n'en a pas
    remede: raw.remede ?? base.remede,
    hypotheses: raw.hypotheses ?? base.hypotheses,
    hypTests: raw.hypTests ?? base.hypTests,
    // mode de passage ajouté après coup : une tentative déjà commencée reste en
    // « entraînement » (valeur sûre), une tentative neuve laisse l'élève choisir.
    mode: raw.mode ?? ((raw.stage ?? 0) > 0 || Object.keys(raw.done ?? {}).length > 0 ? 'entrainement' : undefined),
    modeImpose: raw.modeImpose ?? false,
    startedAt: raw.startedAt,
    autoEval: raw.autoEval ?? {},
    autoEvalDone: raw.autoEvalDone ?? false,
  };
}

// ---------------------------------------------------------------- rappels de cours

/**
 * Fiche(s) de rappel proposées par défaut à chaque étape du parcours platine.
 * Un TP peut préciser cette liste dans `TP_COURS`.
 */
export const STAGE_COURS: CoursId[][] = [
  ['diagnostic'],                                             // 0  choix du TP
  ['plaque-moteur', 'loi-ohm-puissance'],                     // 1  énoncé
  ['contacteur', 'transfo-commande', 'plaque-moteur'],        // 2  préparation
  ['plaque-moteur', 'contacteur', 'calibre-protection'],      // 3  matériel
  ['borniers', 'regles-cablage'],                             // 4  pose
  ['contacteur', 'borniers', 'regles-cablage'],               // 5  câblage
  ['tests-hors-tension', 'transfo-commande'],                 // 6  tests hors tension
  ['epi-habilitation', 'consignation'],                       // 7  EPI & consignation
  ['tests-hors-tension', 'mesure-tension'],                   // 8  mesures hors tension
  ['deconsignation', 'contacteur'],                           // 9  déconsignation & mise en service
  ['mesure-tension', 'mesure-courant', 'vitesse-glissement'], // 10 mesures sous tension
  ['diagnostic', 'contacteur'],                               // 11 validation / maintenance
];

/**
 * Précisions par TP : étape → fiches (remplace la valeur par défaut).
 *
 * La perceuse radiale et le variateur se contentent des fiches par défaut de
 * `STAGE_COURS` ; l'automate, lui, a sa fiche propre dès la découverte du
 * matériel.
 */
export const TP_COURS: Record<string, Partial<Record<number, CoursId[]>>> = {
  'automate-m221': { 2: ['automate-m221'], 4: ['automate-m221', 'borniers'], 8: ['automate-m221', 'deconsignation'] },
};

/** Fiches de rappel proposées à l'élève pour l'étape en cours de ce TP. */
export function coursForStage(tpId: string, stage: number): CoursId[] {
  const perTp = TP_COURS[tpId]?.[stage];
  if (perTp && perTp.length) return perTp;
  return STAGE_COURS[stage] ?? [];
}

// ---------------------------------------------------------------- barème

/**
 * Barème par défaut, documenté et surchargeable par TP (`tps.definition.bareme`).
 *
 * Poids des étapes (total 100) :
 *   matériel 15 · pose 10 · câblage 20 · tests hors tension 5 · EPI et consignation 15 ·
 *   mesures hors tension 10 · mesures sous tension 15 · maintenance 5 · quiz 5.
 *
 * Coût des gestes :
 *   — une erreur de pose retire 2 points ;
 *   — une liaison de câblage refusée retire 2 points ;
 *   — un fil retiré retire 0,25 point (se reprendre est un geste de métier, pas une faute) ;
 *   — une réinitialisation retire 0,5 point ;
 *   — l'ensemble des gestes de correction est plafonné à 3 points ;
 *   — chaque ouverture d'un rappel de cours retire 0,1 au score 0..1 de l'étape.
 *
 * Sans surcharge, la notation est strictement identique à la notation historique.
 */
export const DEFAULT_BAREME: Bareme = {
  poids: { preparation: 10, materiel: 10, pose: 10, cablage: 20, tests: 5, epi: 15, hors: 10, sous: 10, diag: 5, quiz: 5 },
  coutErreurPose: 2,
  coutErreurCablage: 2,
  coutFilRetire: 0.25,
  coutReset: 0.5,
  coutCorrectionMax: 3,
  coutAide: 0.1,
};

/** Libellés des poids, pour l'éditeur de barème du professeur. */
export const BAREME_LABELS: Record<keyof Bareme['poids'], string> = {
  preparation: 'Préparation de l\'opération', materiel: 'Choix du matériel', pose: 'Pose sur la platine', cablage: 'Câblage',
  tests: 'Tests hors tension', epi: 'EPI et consignation', hors: 'Mesures hors tension',
  sous: 'Mesures sous tension', diag: 'Maintenance corrective', quiz: 'Questions de validation',
};

/** Barème complet à partir d'une surcharge partielle (valeurs invalides ignorées). */
export function resolveBareme(over?: BaremeOverride | null): Bareme {
  if (!over) return DEFAULT_BAREME;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
  const p = over.poids ?? {};
  return {
    poids: {
      preparation: num(p.preparation, DEFAULT_BAREME.poids.preparation),
      materiel: num(p.materiel, DEFAULT_BAREME.poids.materiel),
      pose: num(p.pose, DEFAULT_BAREME.poids.pose),
      cablage: num(p.cablage, DEFAULT_BAREME.poids.cablage),
      tests: num(p.tests, DEFAULT_BAREME.poids.tests),
      epi: num(p.epi, DEFAULT_BAREME.poids.epi),
      hors: num(p.hors, DEFAULT_BAREME.poids.hors),
      sous: num(p.sous, DEFAULT_BAREME.poids.sous),
      diag: num(p.diag, DEFAULT_BAREME.poids.diag),
      quiz: num(p.quiz, DEFAULT_BAREME.poids.quiz),
    },
    coutErreurPose: num(over.coutErreurPose, DEFAULT_BAREME.coutErreurPose),
    coutErreurCablage: num(over.coutErreurCablage, DEFAULT_BAREME.coutErreurCablage),
    coutFilRetire: num(over.coutFilRetire, DEFAULT_BAREME.coutFilRetire),
    coutReset: num(over.coutReset, DEFAULT_BAREME.coutReset),
    coutCorrectionMax: num(over.coutCorrectionMax, DEFAULT_BAREME.coutCorrectionMax),
    coutAide: num(over.coutAide, DEFAULT_BAREME.coutAide),
  };
}

/** Barème appliqué à un TP (surcharge éventuelle portée par sa définition). */
export const baremeOf = (tp: TpDefinition): Bareme => resolveBareme(tp.bareme);

/** Total des poids : 100 avec le barème par défaut. */
export const baremeTotal = (b: Bareme): number =>
  Object.values(b.poids).reduce((a, v) => a + v, 0);

// ------------------------------------------------ barème QCM et mesures (validé le 2026-09-18)

/**
 * Deux familles de notation revues le 2026-09-18, chacune rendant une note 0..1.
 * (Le câblage, la pose et le calcul dégressif ont été rétablis à leur barème
 * historique à la demande du professeur : seuls le QCM et les mesures changent.)
 *
 * 1. QCM / activité — une question à N choix, une seule bonne réponse :
 *      note = max(0, (N − erreurs) / N)
 *    Juste au 1ᵉʳ coup = 1 ; chaque réponse fausse retire 1/N ; au-delà de N
 *    erreurs la note reste 0 (aucune pénalité négative).
 *
 * 2. Mesures — chaque mesure conforme est un point, chaque lecture fautive (ERR)
 *    retire un point :  note = max(0, (n − erreurs) / n).
 */
export const noteQcm = (n: number, erreurs: number): number =>
  n <= 0 ? 1 : Math.max(0, (n - Math.max(0, erreurs)) / n);

/** Barème « chaque élément juste vaut 1/n, chaque erreur retire 1/n » (QCM et mesures). */
export const noteSurN = (n: number, erreurs: number): number =>
  n <= 0 ? 1 : Math.max(0, (n - Math.max(0, erreurs)) / n);

/** Tentatives fautives enregistrées sur une question à choix. */
export const qcmErrCount = (st: AttemptState, id: string): number => st.qcmErr?.[id] ?? 0;

/**
 * Pénalités appliquées au score 0..1 du câblage (barème historique), déduites du
 * barème en points : une liaison refusée vaut le quarantième du coût en points,
 * un fil retiré le vingt-cinquième. Défaut : 0,05 · 0,01 · 0,02, plafond 0,15.
 */
function scorePenalties(b: Bareme) {
  return {
    erreurCablage: b.coutErreurCablage / 40,
    filRetire: b.coutFilRetire / 25,
    reset: b.coutReset / 25,
    correctionMax: b.coutCorrectionMax / 20,
  };
}

// ---------------------------------------------------------------- mode de passage

/** Nombre d'ouvertures de l'aide autorisées en mode évaluation (au-delà, l'aide est refusée). */
export const AIDE_MAX_EVALUATION = 3;

/** Mode effectif d'une tentative : « entraînement » tant que rien n'a été choisi. */
export const modeOf = (st: AttemptState): EvaluationMode => st.mode ?? 'entrainement';

/** Le mode a-t-il été explicitement choisi (sinon : proposer le choix au lancement) ? */
export const modeChosen = (st: AttemptState): boolean => st.mode != null;

/** Aide encore disponible ? (illimitée en entraînement) */
export function aideAllowed(st: AttemptState): boolean {
  if (modeOf(st) !== 'evaluation') return true;
  const total = Object.values(st.helpUsed ?? {}).reduce((a, v) => a + v, 0);
  return total < AIDE_MAX_EVALUATION;
}

/** Ouvertures d'aide restantes en mode évaluation. */
export function aideLeft(st: AttemptState): number {
  const total = Object.values(st.helpUsed ?? {}).reduce((a, v) => a + v, 0);
  return Math.max(0, AIDE_MAX_EVALUATION - total);
}

/** Secondes écoulées depuis le début de la tentative (chronomètre). */
export function elapsedSeconds(st: AttemptState, now = Date.now()): number {
  if (!st.startedAt) return 0;
  const t = Date.parse(st.startedAt);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((now - t) / 1000));
}

/** Chronomètre formaté « mm:ss » (ou « h:mm:ss » au-delà d'une heure). */
export function formatChrono(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ---------------------------------------------------------------- matériel

export function goodChoices(tp: TpDefinition, st: AttemptState): number {
  return tp.postes.filter(p => {
    const i = st.choices[p.id];
    return i != null && p.options[i]?.ok === true;
  }).length;
}

export const materielComplete = (tp: TpDefinition, st: AttemptState) =>
  tp.postes.length === 0 || goodChoices(tp, st) === tp.postes.length;

// ---------------------------------------------------------------- pose

export const missingSlots = (tp: TpDefinition, st: AttemptState) => tp.slots.filter(s => !st.placed[s.id]);
export const poseComplete = (tp: TpDefinition, st: AttemptState) => missingSlots(tp, st).length === 0;

// ---------------------------------------------------------------- câblage

/** Liaisons que l'élève doit réaliser (les `prewired` sont déjà faites par l'installateur). */
export const requiredLiaisons = (tp: TpDefinition): Liaison[] => tp.liaisons.filter(l => !l.prewired);

export const isWired = (st: AttemptState, l: Liaison): boolean =>
  st.wires.some(w => linkKey(w.a, w.b) === linkKey(l.a, l.b));

export const nextLiaison = (tp: TpDefinition, st: AttemptState): Liaison | undefined =>
  requiredLiaisons(tp).find(l => !isWired(st, l));

export const wiringComplete = (tp: TpDefinition, st: AttemptState) =>
  requiredLiaisons(tp).length > 0 && nextLiaison(tp, st) === undefined;

/** Une liaison appartient-elle au circuit de commande (TBT 24 V) ? */
const estCommande = (l: Liaison): boolean => l.net === 'C' || l.net === 'C0';

/** Liaisons de commande que l'élève doit réaliser. */
export const commandeLiaisons = (tp: TpDefinition): Liaison[] =>
  requiredLiaisons(tp).filter(estCommande);

/** Liaisons de puissance que l'élève doit réaliser (tout ce qui n'est pas la commande). */
export const puissanceLiaisons = (tp: TpDefinition): Liaison[] =>
  requiredLiaisons(tp).filter(l => !estCommande(l));

/**
 * Résumé du câblage réalisé, tel que le moteur de simulation le consomme.
 *
 * Sans ce résumé, `pressButton()` enclenchait le contacteur sur une platine nue :
 * l'élève appuyait sur « marche » sans avoir posé un seul fil et le moteur partait.
 * On sépare commande et puissance parce que les deux pannes ne se voient pas pareil :
 * commande incomplète → le contacteur ne colle pas ; puissance incomplète → il colle,
 * mais l'arbre reste immobile.
 */
export function cablageEtat(tp: TpDefinition, st: AttemptState): Cablage {
  const cmd = commandeLiaisons(tp).filter(l => !isWired(st, l)).length;
  const pwr = puissanceLiaisons(tp).filter(l => !isWired(st, l)).length;
  return { cmd: cmd === 0, pwr: pwr === 0, cmdReste: cmd, pwrReste: pwr };
}

/**
 * Barème des gestes de correction du câblage (défaire un fil, tout recâbler).
 *
 * Défaire un fil est un geste de métier, pas une faute : l'élève qui se reprend doit être
 * bien mieux noté que celui qui accumule les liaisons refusées. On garde donc un poids très
 * faible, purement indicatif pour le professeur :
 *   — une liaison refusée (`wireErrors`) coûte 2 points sur 20 à l'étape câblage ;
 *   — un fil retiré (`wiresRemoved`) coûte 0,25 point, soit huit fois moins ;
 *   — une réinitialisation (`resets`) coûte 0,5 point.
 * La pénalité totale de correction est en outre plafonnée à 3 points sur 20, pour qu'un
 * élève qui tâtonne longuement puisse malgré tout valider proprement son câblage.
 * Sur le score par compétences (0..1), les mêmes gestes valent 0,01 et 0,02 par unité.
 */
export const WIRE_REMOVE_COST = 0.25;
export const RESET_COST = 0.5;
export const CORRECTION_MAX_COST = 3;

/** Pénalité (en points sur 20) des gestes de correction d'une tentative. */
export function correctionPenalty(st: AttemptState, b: Bareme = DEFAULT_BAREME): number {
  const raw = (st.wiresRemoved ?? 0) * b.coutFilRetire + (st.resets ?? 0) * b.coutReset;
  return Math.min(b.coutCorrectionMax, raw);
}

/** Réseau d'appartenance d'une borne, d'après le tableau de câblage (détection de court-circuit). */
export function netOfTerminal(tp: TpDefinition, id: string): Liaison['net'] | null {
  const l = tp.liaisons.find(x => x.a === id || x.b === id);
  return l ? l.net : null;
}

/** Toutes les liaisons attendues sur une borne sont-elles faites ? */
export function terminalDone(tp: TpDefinition, st: AttemptState, id: string): boolean {
  const need = requiredLiaisons(tp).filter(l => l.a === id || l.b === id).length;
  if (need === 0) return false;
  const have = st.wires.filter(w => w.a === id || w.b === id).length;
  return have >= need;
}

// ---------------------------------------------------------------- tests

export const testsComplete = (tp: TpDefinition, st: AttemptState) =>
  tp.tests.every(t => st.tests[t.id] != null);

// ------------------------------------------------- EPI, consignation, mesures

export const epiOk = (st: AttemptState) => epiComplete(st.epi);
export const consignationOk = (st: AttemptState) => st.cons.vatRef2;
export const epiConsComplete = (st: AttemptState) => epiOk(st) && consignationOk(st);

export const horsTensionComplete = (tp: TpDefinition, st: AttemptState) => mesuresComplete(tp, st, 'horsTension');
/** Essais fonctionnels du portail, dans l'ordre de la fiche d'essais. */
export const ESSAIS_PORTAIL = [
  { id: 'badge', label: 'Ouverture par badge' },
  { id: 'feu', label: 'Feu orange 3 s avant chaque mouvement' },
  { id: 'auto', label: 'Fermeture automatique après 20 s' },
  { id: 'cell', label: 'Réouverture par la cellule S5' },
  { id: 'barre', label: 'Réouverture par la barre palpeuse S6' },
  { id: 'au', label: 'Arrêt d\'urgence : la fermeture ne démarre pas' },
] as const;

export const essaisPortailComplete = (tp: TpDefinition, st: AttemptState): boolean =>
  !tp.essaisPortail || ESSAIS_PORTAIL.every(e => st.essais?.[e.id]);

/** Essais de la traversée du local KNX, dans l'ordre de la fiche d'essais. */
export const ESSAIS_KNX_LOCAL = [
  { id: 'knx-nuit', label: 'La nuit, chaque zone s\'allume quand on y entre' },
  { id: 'knx-jour', label: 'En plein jour, rien ne s\'allume' },
  { id: 'knx-min', label: 'Extinction automatique après la minuterie' },
  { id: 'knx-l6', label: 'L6 s\'allume depuis les deux circulations' },
  { id: 'knx-bp', label: 'BP : L8 ON puis OFF, DEL d\'état' },
] as const;

export const essaisKnxLocalComplete = (tp: TpDefinition, st: AttemptState): boolean =>
  !tp.essaisKnxLocal || ESSAIS_KNX_LOCAL.every(e => st.essais?.[e.id]);

/**
 * Essai des quatre situations de fonctionnement d'une installation PV hybride, dans
 * l'ordre de la fiche d'essais (sujet CGM 2023, A.1.2).
 */
export const ESSAIS_PV = [
  { id: 'pv-nuit', label: 'Nuit, pas de production : le réseau alimente' },
  { id: 'pv-ilot', label: 'Réseau coupé : les batteries alimentent (site isolé)' },
  { id: 'pv-def', label: 'Déficit : le PV et les batteries alimentent ensemble' },
  { id: 'pv-sur', label: 'Surplus : le PV alimente et charge les batteries' },
] as const;

export const essaisPvComplete = (tp: TpDefinition, st: AttemptState): boolean =>
  !tp.essaisPv || ESSAIS_PV.every(e => st.essais?.[e.id]);

export const sousTensionComplete = (tp: TpDefinition, st: AttemptState) =>
  mesuresComplete(tp, st, 'sousTension') && essaisPortailComplete(tp, st) && essaisKnxLocalComplete(tp, st)
  && essaisPvComplete(tp, st);
/**
 * Mise en service terminée : essai concluant ET, sur un TP à variateur ou à mise en
 * service KNX, réglages conformes. L'essai reste possible avec de mauvais réglages —
 * il en montre les symptômes — mais l'étape n'est validée qu'avec les réglages du
 * cahier des charges.
 */
export const deconsComplete = (
  st: AttemptState, tp?: Pick<TpDefinition, 'variateur' | 'knxMiseEnService' | 'knxZones' | 'imeonMiseEnService'>,
) => st.decons.essai && (!tp || (paramConforme(tp, st) && knxConforme(tp, st) && imeonConforme(tp, st)));

export interface ServiceCheck { id: string; title: string; ok: boolean }

/**
 * Étapes auto-validées de la déconsignation / mise en service.
 * Les repères viennent du TP : « F2 » sur le démarrage direct, « Q2 » sur la perceuse.
 */
export function serviceChecks(tp: TpDefinition, st: AttemptState, sim: SimState): ServiceCheck[] {
  const km1 = repereSlot(tp, 'km1');
  const btn = startButtons(tp)[0]?.rep;
  const voyant = (tp.pupitre ?? []).find(p => p.kind === 'lamp')?.rep;
  // Scène PV sans pupitre : on met l'onduleur en marche en cliquant dessus sur la platine.
  const essaiTitle = btn
    ? `Essai : ${btn} → ${km1} s'enclenche et ${voyant ?? 'le voyant'} s'allume`
    : `Essai : mettre ${km1} en marche → le 230 V apparaît au tableau`;
  return [
    { id: 'unlock', title: 'Retirer le cadenas et l\'étiquette de consignation', ok: st.decons.unlock },
    { id: 'close', title: `Refermer ${listeMiseSousTension(tp)}`, ok: st.decons.close },
    ...(aParametrage(tp)
      ? [{ id: 'param', title: `Paramétrer ${repereSlot(tp, tp.variateur!.slot)} d'après la plaque et le cahier des charges`, ok: st.decons.close && paramConforme(tp, st) }]
      : []),
    ...(aKnxMiseEnService(tp)
      ? [{ id: 'knx', title: 'Mise en service KNX (interface, adresses, liaisons, paramètres, téléchargement)', ok: st.decons.close && knxConforme(tp, st) }]
      : []),
    ...(aImeonMiseEnService(tp)
      ? [{ id: 'imeon', title: `Paramétrer ${repereSlot(tp, 'km1')} (priorité des sources, injection, type de batterie)`, ok: st.decons.close && imeonConforme(tp, st) }]
      : []),
    { id: 'essai', title: essaiTitle, ok: st.decons.essai },
    { id: 'run', title: tp.hasMotor ? 'Moteur en marche' : 'Installation en service (230 V présent)', ok: isRunning(sim) || st.decons.essai },
  ];
}

/** Relevés de l'étape « mesures sous tension » restant à faire. */
export const mesuresRestantes = (tp: TpDefinition, st: AttemptState, stage: 'horsTension' | 'sousTension') =>
  mesuresFor(tp, stage).filter(m => !mesureDone(st, m.id));

// ---------------------------------------------------------------- validation

export const validationComplete = (st: AttemptState) => st.fixed && st.diagnosis != null && st.quiz != null;

// ---------------------------------------------------------------- préparation

/**
 * Questions de préparation d'un TP : identifier les organes du schéma, puis dire
 * la fonction de chacun. Un TP qui n'en déclare pas passe l'étape sans rien
 * demander — la préparation est une addition, pas une barrière rétroactive.
 */
export function prepQuestions(tp: TpDefinition): PrepQuestion[] {
  const p = tp.preparation;
  return p
    ? [
      ...p.identification, ...p.fonctions, ...(p.calculs ?? []), ...(p.adressage ?? []),
      ...(p.grafcetQuiz ?? []), ...(p.grafcet?.cases ?? []), ...(p.blocs ?? []).flatMap(b => b.questions),
    ]
    : [];
}

/** Réponses justes à la préparation. */
export const goodPrep = (tp: TpDefinition, st: AttemptState): number =>
  prepQuestions(tp).filter(q => st.prep?.[q.id] === q.answer).length;

/** Toutes les questions ont-elles reçu une réponse (juste ou non) ? */
export const preparationComplete = (tp: TpDefinition, st: AttemptState): boolean =>
  prepQuestions(tp).every(q => st.prep?.[q.id] != null);

/** L'étape `stage` est-elle satisfaite par l'état courant ? */
export function stageSatisfied(tp: TpDefinition, st: AttemptState, sim: SimState, stage: number): boolean {
  switch (stage) {
    case ETAPE.CHOIX:
    case ETAPE.ENONCE: return true;
    case ETAPE.PREPARATION: return preparationComplete(tp, st);
    case ETAPE.MATERIEL: return materielComplete(tp, st);
    case ETAPE.POSE: return poseComplete(tp, st);
    case ETAPE.CABLAGE: return wiringComplete(tp, st);
    case ETAPE.TESTS: return testsComplete(tp, st);
    case ETAPE.EPI: return epiConsComplete(st);
    case ETAPE.HORS: return horsTensionComplete(tp, st);
    case ETAPE.MISE_EN_SERVICE: return deconsComplete(st, tp);
    case ETAPE.SOUS: return sousTensionComplete(tp, st);
    case ETAPE.VALIDATION: return validationComplete(st);
    default: return false;
  }
}

// ---------------------------------------------------------------- score et rapport

export interface ScoreLine { key: string; label: string; points: number; max: number; detail: string }

/**
 * Note QCM moyenne d'une étape faite de questions à choix (préparation, matériel).
 * Chaque question rend `noteQcm(N, erreurs)` ; l'étape est leur moyenne (0..1).
 */
export function prepNote(tp: TpDefinition, st: AttemptState): number {
  const qs = prepQuestions(tp);
  if (qs.length === 0) return 1;
  // une question sans réponse ne rapporte rien (le barème QCM ne note que le répondu)
  return qs.reduce((a, q) => a + (st.prep?.[q.id] == null ? 0 : noteQcm(q.options.length, qcmErrCount(st, q.id))), 0) / qs.length;
}

export function materielNote(tp: TpDefinition, st: AttemptState): number {
  if (tp.postes.length === 0) return 1;
  return tp.postes.reduce((a, p) => a + (st.choices?.[p.id] == null ? 0 : noteQcm(p.options.length, qcmErrCount(st, p.id))), 0) / tp.postes.length;
}

/** Note d'une série de mesures : chaque mesure conforme est un point, chaque ERR une erreur. */
function mesuresNote(tp: TpDefinition, st: AttemptState, stage: 'horsTension' | 'sousTension', etape: number): number {
  const list = mesuresFor(tp, stage);
  if (list.length === 0) return 1;
  const ok = list.filter(m => mesureDone(st, m.id)).length;
  return noteSurN(list.length, (list.length - ok) + errReadings(st, etape));
}

export function scoreLines(tp: TpDefinition, st: AttemptState, bareme?: Bareme): ScoreLine[] {
  const b = bareme ?? baremeOf(tp);
  const w = b.poids;
  const ok = goodChoices(tp, st);
  const req = requiredLiaisons(tp).length;
  const wired = st.wires.length;
  const nTests = Math.max(1, tp.tests.length);
  const nQuiz = Math.max(1, tp.quiz.length);
  const hors = mesuresFor(tp, 'horsTension');
  const sous = mesuresFor(tp, 'sousTension');
  const horsOk = hors.filter(m => mesureDone(st, m.id)).length;
  const sousOk = sous.filter(m => mesureDone(st, m.id)).length;
  const epiN = Object.values(st.epi).filter(Boolean).length;

  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));
  // note 0..1 × poids : chaque section applique le barème unifié, puis est ramenée à ses points.
  const pts = (note01: number, max: number) => clamp(note01 * max, max);
  const nPrep = prepQuestions(tp).length;

  return [
    { key: 'preparation', label: 'Préparation de l\'opération', points: pts(prepNote(tp, st), w.preparation), max: w.preparation, detail: nPrep === 0 ? 'pas de préparation sur ce TP' : `${goodPrep(tp, st)} / ${nPrep} justes · barème QCM (−1/N par erreur)` },
    { key: 'materiel', label: 'Choix du matériel', points: pts(materielNote(tp, st), w.materiel), max: w.materiel, detail: `${ok} / ${tp.postes.length} références justes · barème QCM (−1/N par erreur)` },
    { key: 'pose', label: 'Pose sur la platine', points: clamp(w.pose - st.poseErrors * b.coutErreurPose, w.pose), max: w.pose, detail: `${st.poseErrors} erreur${st.poseErrors > 1 ? 's' : ''} de pose` },
    { key: 'cablage', label: 'Câblage', points: clamp(wired / Math.max(1, req) * w.cablage - st.wireErrors * b.coutErreurCablage - correctionPenalty(st, b), w.cablage), max: w.cablage, detail: `${wired} / ${req} liaisons · ${st.wireErrors} refus · ${st.wiresRemoved ?? 0} fil${(st.wiresRemoved ?? 0) > 1 ? 's' : ''} retiré${(st.wiresRemoved ?? 0) > 1 ? 's' : ''} · ${st.resets ?? 0} remise${(st.resets ?? 0) > 1 ? 's' : ''} à zéro` },
    { key: 'tests', label: 'Tests hors tension', points: clamp(Object.keys(st.tests).length / nTests * w.tests, w.tests), max: w.tests, detail: `${Object.keys(st.tests).length} / ${tp.tests.length} tests` },
    { key: 'epi', label: 'EPI et consignation', points: clamp((epiOk(st) ? w.epi * 7 / 15 : epiN * w.epi / 15) + (consignationOk(st) ? w.epi * 8 / 15 : st.cons.lock ? w.epi * 3 / 15 : 0), w.epi), max: w.epi, detail: consignationOk(st) ? 'consignation complète' : 'consignation incomplète' },
    { key: 'hors', label: 'Mesures hors tension', points: pts(mesuresNote(tp, st, 'horsTension', ETAPE.HORS), w.hors), max: w.hors, detail: `${horsOk} / ${hors.length} mesures conformes · ${errReadings(st, ETAPE.HORS)} erreur(s)` },
    { key: 'sous', label: 'Mesures sous tension', points: pts(mesuresNote(tp, st, 'sousTension', ETAPE.SOUS), w.sous), max: w.sous, detail: `${sousOk} / ${sous.length} mesures conformes · ${errReadings(st, ETAPE.SOUS)} erreur(s)` },
    { key: 'diag', label: 'Maintenance corrective', points: st.fixed ? clamp(w.diag - (Math.max(1, st.diagTries) - 1) * w.diag * 2 / 5, w.diag) : 0, max: w.diag, detail: st.fixed ? `panne réparée en ${Math.max(1, st.diagTries)} essai(s)` : 'panne non traitée' },
    { key: 'quiz', label: 'Questions de validation', points: pts(noteQcm(nQuiz, Math.max(0, nQuiz - (st.quiz ?? 0))), w.quiz), max: w.quiz, detail: st.quiz == null ? 'quiz non fait' : `${st.quiz} / ${tp.quiz.length} bonnes réponses` },
  ];
}

export function computeScore(tp: TpDefinition, st: AttemptState, bareme?: Bareme): number {
  return scoreLines(tp, st, bareme).reduce((a, l) => a + l.points, 0);
}

// ------------------------------------------------ évaluation par compétences

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Nombre d'ouvertures de l'aide « rappel de cours » sur une étape. */
export const helpCount = (st: AttemptState, stage: number): number => st.helpUsed?.[stage] ?? 0;

/** Lectures d'instrument fautives (ERR) faites pendant une étape. */
function errReadings(st: AttemptState, stage: number): number {
  return st.readings.filter(r => r.stage === stage && r.display.startsWith('ERR')).length;
}

/** L'étape a-t-elle été atteinte (donc évaluable) ? */
export function stageReached(st: AttemptState, stage: number): boolean {
  return st.done[stage] === true || st.stage > stage;
}

/**
 * Score brut 0..1 d'une étape, avant pénalité d'aide.
 * `undefined` si l'étape n'a pas été faite : elle restera « non évaluée ».
 */
function rawStageScore(tp: TpDefinition, st: AttemptState, stage: number, b: Bareme): number | undefined {
  if (!stageReached(st, stage)) return undefined;
  switch (stage) {
    case ETAPE.CHOIX:
    case ETAPE.ENONCE:
      return 1;
    case ETAPE.PREPARATION:
      // barème QCM : moyenne des questions, −1/N par réponse fausse
      return prepNote(tp, st);
    case ETAPE.MATERIEL:
      return materielNote(tp, st);
    case ETAPE.POSE: {
      // barème historique : une erreur de pose retire une fraction fixe
      const n = Math.max(1, tp.slots.length);
      return clamp01(1 - st.poseErrors / n);
    }
    case ETAPE.CABLAGE: {
      // barème historique : liaisons faites, moins les refus et les gestes de correction
      const req = requiredLiaisons(tp).length;
      if (req === 0) return 1;
      const done = requiredLiaisons(tp).filter(l => isWired(st, l)).length;
      const pen = scorePenalties(b);
      const corr = Math.min(pen.correctionMax, (st.wiresRemoved ?? 0) * pen.filRetire + (st.resets ?? 0) * pen.reset);
      return clamp01(done / req - st.wireErrors * pen.erreurCablage - corr);
    }
    case ETAPE.TESTS: {
      const n = tp.tests.length;
      if (n === 0) return 1;
      return clamp01(tp.tests.filter(t => st.tests[t.id] != null).length / n);
    }
    case ETAPE.EPI: {
      const c = st.cons;
      // Nombre de paires en aval requises : celui que le TP configure, 3 par défaut.
      const needVat = tp.consignationVat?.avalPairs?.length ?? 3;
      const steps = [c.sep, c.lock, c.ident, c.vatRef, c.vat.length >= needVat, c.vatRef2];
      const ordered = steps.filter(Boolean).length / steps.length;
      const epiPart = epiOk(st) ? 1 : Object.values(st.epi).filter(Boolean).length / 6;
      return clamp01(0.65 * ordered + 0.35 * clamp01(epiPart) - errReadings(st, ETAPE.EPI) * 0.1);
    }
    case ETAPE.HORS:
      // barème câblage : chaque mesure conforme est un point, chaque ERR une erreur
      return mesuresNote(tp, st, 'horsTension', ETAPE.HORS);
    case ETAPE.MISE_EN_SERVICE: {
      const base = st.decons.essai ? 1 : st.decons.close ? 0.5 : 0.2;
      if (aKnxMiseEnService(tp)) {
        // Mise en service KNX : la moitié de la note, au prorata des blocs conformes
        // (interface, adresses, liaisons, paramètres — voir `knxErreurs`).
        const ok = (4 - knxErreurs(tp, st).length) / 4;
        return clamp01(0.5 * base + 0.5 * ok);
      }
      if (aImeonMiseEnService(tp)) {
        // Onduleur hybride : la moitié de la note, au prorata des réglages conformes.
        const ok = (IMEON_BLOCS - imeonErreurs(tp, st).length) / IMEON_BLOCS;
        return clamp01(0.5 * base + 0.5 * ok);
      }
      if (!aParametrage(tp)) return base;
      // Paramétrage : la moitié de la note, au prorata des réglages conformes.
      const n = parametresOf(tp).length;
      const ok = (n - paramNonConformes(tp, st).length) / n;
      return clamp01(0.5 * base + 0.5 * ok);
    }
    case ETAPE.SOUS:
      return mesuresNote(tp, st, 'sousTension', ETAPE.SOUS);
    case ETAPE.VALIDATION: {
      // maintenance : barème historique (1 · 0,7 · 0,4 selon l'essai de diagnostic)
      const tries = Math.max(1, st.diagTries);
      const diag = !st.fixed ? 0 : tries === 1 ? 1 : tries === 2 ? 0.7 : 0.4;
      const nQuiz = tp.quiz.length;
      // quiz : barème QCM conservé (une réponse fausse retire 1/N)
      const quiz = noteQcm(nQuiz, Math.max(0, nQuiz - (st.quiz ?? 0)));
      return clamp01(0.6 * diag + 0.4 * quiz);
    }
    default:
      return undefined;
  }
}

/**
 * Score 0..1 par étape du parcours, pénalisé par les ouvertures de l'aide
 * (−0,1 par ouverture, plancher 0,3 quand l'étape est réussie malgré tout).
 */
/** Erreurs « dures » imputables à une étape (comptées pour le plafond de niveau). */
export function stageErrors(st: AttemptState, stage: number): number {
  switch (stage) {
    case ETAPE.POSE: return st.poseErrors ?? 0;
    case ETAPE.CABLAGE: return (st.wireErrors ?? 0) + (st.resets ?? 0);
    case ETAPE.HORS: return errReadings(st, ETAPE.HORS);
    case ETAPE.MISE_EN_SERVICE: return st.paramErrors ?? 0;
    case ETAPE.SOUS: return errReadings(st, ETAPE.SOUS);
    case ETAPE.VALIDATION: return Math.max(0, (st.diagTries ?? 0) - 1);
    default: return 0;
  }
}

/**
 * Plafond de score imposé par les erreurs de l'étape (validé le 2026-09-15).
 * Au-delà de 4 erreurs, « Totalement maîtrisé » (0,90) devient inatteignable ;
 * au-delà de 8, on plafonne à « Partiellement maîtrisé » (0,74). NON RATTRAPABLE :
 * corriger à la fin du TP ne relève pas le plafond — les erreurs restent sanctionnées.
 */
function errorCap(errors: number): number {
  if (errors >= 8) return 0.74;
  if (errors >= 4) return 0.89;
  return 1;
}

export function stageScores(tp: TpDefinition, st: AttemptState, bareme?: Bareme): (number | undefined)[] {
  const b = bareme ?? baremeOf(tp);
  return PLATINE_STAGE_DOMAINS.map((_, i) => {
    const raw = rawStageScore(tp, st, i, b);
    if (raw == null) return undefined;
    const penalty = helpCount(st, i) * b.coutAide;
    const floor = raw >= 0.5 ? 0.3 : 0;
    const scored = Math.max(floor, clamp01(raw - penalty));
    // plafond d'erreurs : malus déjà déduit ci-dessus + plafond de niveau, non rattrapable
    return Math.min(errorCap(stageErrors(st, i)), scored);
  });
}

/** Grille de compétences du diplôme, ou `null` pour un TP non jouable. */
export function buildEvaluation(
  tp: TpDefinition,
  st: AttemptState,
  diploma: DiplomaId,
  bareme?: Bareme,
): CompetenceEval[] | null {
  if (!tp.playable) return null;
  return evaluate(diploma, PLATINE_STAGE_DOMAINS, stageScores(tp, st, bareme), st.autoEval ?? null);
}

export interface Report extends Record<string, unknown> {
  tpId: string;
  title: string;
  score: number;
  lines: ScoreLine[];
  fault: string | null;
  diagnosis: string | null;
  readings: AttemptState['readings'];
  tests: Record<string, string>;
  epi: Record<string, boolean>;
  cons: AttemptState['cons'];
  competences: string[];
  at: string;
  /** Identité de l'élève au moment du TP. */
  student: { name: string; diploma: DiplomaId | null; etablissement: string } | null;
  /** Grille de compétences (null pour un TP non jouable). */
  evaluation: CompetenceEval[] | null;
  /** Score 0..1 par étape, base de la grille. */
  stageScores: (number | undefined)[];
  /** Ouvertures de l'aide « rappel de cours », par étape. */
  helpUsed: Record<number, number>;
  /** Fils défaits par l'élève (geste de correction). */
  wiresRemoved: number;
  /** Réinitialisations de câblage demandées. */
  resets: number;
  /** Mode de passage (entraînement / évaluation). */
  mode: EvaluationMode;
  /** Durée de la tentative, en secondes. */
  duree: number;
  /** Auto-évaluation de l'élève, avant correction. */
  autoEval: Record<string, string>;
}

export interface ReportStudent { name: string; diploma: DiplomaId | null; etablissement: string }

export function buildReport(tp: TpDefinition, st: AttemptState, student?: ReportStudent | null): Report {
  const b = baremeOf(tp);
  const lines = scoreLines(tp, st, b);
  const diploma = student?.diploma ?? null;
  return {
    student: student ?? null,
    evaluation: diploma ? buildEvaluation(tp, st, diploma, b) : null,
    stageScores: stageScores(tp, st, b),
    mode: modeOf(st),
    duree: elapsedSeconds(st),
    autoEval: st.autoEval ?? {},
    helpUsed: st.helpUsed ?? {},
    wiresRemoved: st.wiresRemoved ?? 0,
    resets: st.resets ?? 0,
    tpId: tp.id,
    title: tp.title,
    score: lines.reduce((a, l) => a + l.points, 0),
    lines,
    fault: st.fault,
    diagnosis: st.diagnosis,
    readings: st.readings,
    tests: st.tests,
    epi: st.epi,
    cons: st.cons,
    competences: tp.competences,
    at: new Date().toISOString(),
  };
}
