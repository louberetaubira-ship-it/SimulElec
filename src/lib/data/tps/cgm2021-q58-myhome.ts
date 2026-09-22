/**
 * TP platine de service · CGM 2021 (EIP du lycée Mireille Grenet), partie 3, question 58 :
 * schéma électrique de l'installation MyHOME (éclairages et volets de l'atelier, de l'atelier
 * électronique et des sanitaires).
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `cgm2021-eip`
 * (`src/components/sujet/CablageReel.tsx`). `hidden` : absent du catalogue, jouable par la
 * route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ câblage (corrigé, page 27)
 * Ce que montre le schéma corrigé, ni plus ni moins :
 *  - « vers Q100 » → Q1 (disjoncteur différentiel 40 A 30 mA, tête du tableau) ;
 *  - Q1 → Q2 (2 A) → primaire de l'alimentation AL1 ; bus 27 V⎓ d'AL1 vers les six
 *    actionneurs (bus en parallèle, repris ici d'actionneur en actionneur) ;
 *  - Q1 → Q3, Q8, Q6, Q4, Q5, Q7 (pontage de disjoncteur en disjoncteur) ;
 *  - Q3 → KA1 (1 → 2) → éclairage atelier L11 à L14, neutre depuis Q3 ;
 *  - Q8 → KA4 (1 → 2) → éclairage sanitaire L1 à L6, neutre depuis Q8 ;
 *  - Q6 → KA5 (2 → 3) → éclairage atelier électronique L7 à L10, neutre depuis Q6 ;
 *  - Q4 → KA2 (commun 1 → 2, 3, 4, 5) → volets V1 et V2 (montée L1, descente L2), neutres ;
 *  - Q5 → KA3 → volets V3 et V4, de la même façon ;
 *  - Q7 → CAD C1 (L et 3, N) → volet V5 (1 → L1, 2 → L2), neutre depuis Q7.
 * Les points de commande (interrupteurs, détecteur) sont sur le bus mais pas sur ce schéma :
 * ils n'ont pas de place sur la platine ; l'essai les simule.
 *
 * ------------------------------------------------------------ correspondance moteur
 *   · `q1` = Q1, tête du tableau et organe de consignation ;
 *   · `f2` = Q2, alimentation du bus (aval `f2` = Q1 ET Q2) ;
 *   · `f3` = Q3, éclairage de l'atelier (aval `q1f3`) ;
 *   · Q8, Q6, Q4, Q5, Q7 : organes supplémentaires (`sectionneurs`), aval `q1&aux:<id>`.
 * Les sorties d'éclairage exigent en plus le bus (`f2&…`) ; les sorties de volets sont au
 * repos (`off`) dans le parcours standard : un volet ne reçoit du 230 V que pendant sa course.
 */
import type { Liaison, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Disjoncteurs de départ, dans l'ordre du rail et du corrigé. */
const DEPARTS = ['f3', 'q8', 'q6', 'q4', 'q5', 'q7'] as const;
/** Actionneurs, dans l'ordre du rail : le bus les reprend l'un après l'autre. */
const ACTIONNEURS = ['ka1', 'ka4', 'ka5', 'ka2', 'ka3', 'cad'] as const;

const LIAISONS: Liaison[] = [
  // ---- « vers Q100 » → Q1 ----
  L('RES.L1', 'q1.1', 'L1'), L('RES.N', 'q1.N', 'N'),
  // ---- Q1 → Q2 → primaire d'AL1 ----
  L('q1.2', 'f2.1', 'L1'), L('q1.N2', 'f2.N', 'N'),
  L('f2.2', 'al1.L', 'L1'), L('f2.N2', 'al1.N', 'N'),
  // ---- Q1 → départs, pontés de disjoncteur en disjoncteur ----
  L('q1.2', 'f3.1', 'L1'), L('q1.N2', 'f3.N', 'N'),
  ...DEPARTS.slice(1).flatMap((d, i) => [L(`${DEPARTS[i]}.1`, `${d}.1`, 'L1'), L(`${DEPARTS[i]}.N`, `${d}.N`, 'N')]),
  // ---- bus 27 V⎓ : AL1 → KA1 → KA4 → KA5 → KA2 → KA3 → CAD C1 ----
  L('al1.+', 'ka1.+', 'DC+'), L('al1.−', 'ka1.−', 'DC-'),
  ...ACTIONNEURS.slice(1).flatMap((k, i) => [L(`${ACTIONNEURS[i]}.+`, `${k}.+`, 'DC+'), L(`${ACTIONNEURS[i]}.−`, `${k}.−`, 'DC-')]),
  // ---- éclairage atelier : Q3 → KA1 (1 → 2) → L11 à L14 ----
  L('f3.2', 'ka1.1', 'L1'), L('ka1.2', 'L11.X1', 'LC'), L('f3.N2', 'L11.X2', 'N'),
  // ---- éclairage sanitaire : Q8 → KA4 (1 → 2) → L1 à L6 ----
  L('q8.2', 'ka4.1', 'L1'), L('ka4.2', 'L1.X1', 'LC'), L('q8.N2', 'L1.X2', 'N'),
  // ---- éclairage atelier électronique : Q6 → KA5 (2 → 3) → L7 à L10 ----
  L('q6.2', 'ka5.2', 'L1'), L('ka5.3', 'L7.X1', 'LC'), L('q6.N2', 'L7.X2', 'N'),
  // ---- volets atelier, circuit 1 : Q4 → KA2 → V1, V2 ----
  L('q4.2', 'ka2.1', 'L1'),
  L('ka2.2', 'v1.L1', 'LC'), L('ka2.3', 'v1.L2', 'LC'), L('ka2.4', 'v2.L1', 'LC'), L('ka2.5', 'v2.L2', 'LC'),
  L('q4.N2', 'v2.N', 'N'), L('v2.N', 'v1.N', 'N'),
  // ---- volets atelier, circuit 2 : Q5 → KA3 → V3, V4 ----
  L('q5.2', 'ka3.1', 'L1'),
  L('ka3.2', 'v3.L1', 'LC'), L('ka3.3', 'v3.L2', 'LC'), L('ka3.4', 'v4.L1', 'LC'), L('ka3.5', 'v4.L2', 'LC'),
  L('q5.N2', 'v4.N', 'N'), L('v4.N', 'v3.N', 'N'),
  // ---- volet atelier électronique : Q7 → CAD C1 → V5 ----
  L('q7.2', 'cad.3', 'L1'), L('cad.3', 'cad.L', 'L1'), L('q7.N2', 'cad.N', 'N'), L('q7.N2', 'v5.N', 'N'),
  L('cad.1', 'v5.L1', 'LC'), L('cad.2', 'v5.L2', 'LC'),
];

/** Aval d'un départ : Q3 (`f3`) directement sous Q1, les autres organes supplémentaires. */
const aval = (d: string): TerminalNet['live'] => (d === 'f3' ? 'q1f3' : `q1&aux:${d}`);
/** Sortie d'un actionneur d'éclairage : son départ ET le bus (`f2` = Q1 et Q2 fermés). */
const sortie = (d: string): TerminalNet['live'] => (d === 'f3' ? 'f2&q1f3' : `f2&aux:${d}`);

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live']) => {
    for (const id of ids) n[id] = { net, live };
  };
  // Q1 : tête du tableau, organe de consignation
  set(['q1.1'], 'L1', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2'], 'L1', 'q1'); set(['q1.N2'], 'N', 'q1');
  // Q2 → AL1 : primaire 230 V~, bus 27 V⎓
  set(['f2.1'], 'L1', 'q1'); set(['f2.N'], 'N', 'q1');
  set(['f2.2', 'al1.L'], 'L1', 'f2'); set(['f2.N2', 'al1.N'], 'N', 'f2');
  set(['al1.+', ...ACTIONNEURS.map(k => `${k}.+`)], 'DC+', 'f2');
  set(['al1.−', ...ACTIONNEURS.map(k => `${k}.−`)], 'DC-', 'f2');
  // départs
  for (const d of DEPARTS) {
    set([`${d}.1`], 'L1', 'q1'); set([`${d}.N`], 'N', 'q1');
    set([`${d}.2`], 'L1', aval(d)); set([`${d}.N2`], 'N', aval(d));
  }
  // éclairages : entrée de l'actionneur (aval du départ), sortie (départ ET bus)
  const eclairage = (d: string, entree: string, borne: string, lampe: string) => {
    set([entree], 'L1', aval(d));
    set([borne, `${lampe}.X1`], 'LC', sortie(d));
    set([`${lampe}.X2`], 'N', aval(d));
  };
  eclairage('f3', 'ka1.1', 'ka1.2', 'L11');
  eclairage('q8', 'ka4.1', 'ka4.2', 'L1');
  eclairage('q6', 'ka5.2', 'ka5.3', 'L7');
  // volets : commun sous tension, sorties au repos
  set(['ka2.1'], 'L1', aval('q4')); set(['ka3.1'], 'L1', aval('q5'));
  set(['cad.L', 'cad.3'], 'L1', aval('q7')); set(['cad.N'], 'N', aval('q7'));
  set(['ka2.2', 'ka2.3', 'ka2.4', 'ka2.5', 'v1.L1', 'v1.L2', 'v2.L1', 'v2.L2'], 'LC', 'off');
  set(['ka3.2', 'ka3.3', 'ka3.4', 'ka3.5', 'v3.L1', 'v3.L2', 'v4.L1', 'v4.L2'], 'LC', 'off');
  set(['cad.1', 'cad.2', 'v5.L1', 'v5.L2'], 'LC', 'off');
  set(['v1.N', 'v2.N'], 'N', aval('q4')); set(['v3.N', 'v4.N'], 'N', aval('q5')); set(['v5.N'], 'N', aval('q7'));
  return n;
}

/** Bornes qui ne reçoivent plus rien quand la panne les a isolées. */
const hors = (ids: string[]): Record<string, Partial<TerminalNet>> =>
  Object.fromEntries(ids.map(id => [id, { live: 'off' as const }]));

export const TP_CGM2021_Q58_MYHOME: TpDefinition = {
  id: 'cgm2021-q58-myhome',
  title: 'CGM 2021 · Installation MyHOME de l’EIP (câblage réel)',
  level: 'Bac Pro MELEC · CGM',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  hidden: true,
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  arriveeMono: true,
  uContinu: 27,
  summary:
    'Concours Général des Métiers MELEC 2021, partie 3 : gestion de l’espace d’innovation partagé en '
    + 'technologie MyHOME. Alimentation de bus AL1 (27 V⎓), actionneurs KA1 à KA5 et CAD C1, protections '
    + 'Q1 à Q8 du tableau ; éclairages de l’atelier, des sanitaires et de l’atelier électronique, volets V1 '
    + 'à V5. Câbler le schéma électrique de l’installation, mettre sous tension, essayer les commandes.',
  situation:
    'L’espace d’innovation partagé est géré en technologie MyHOME : un bus à deux conducteurs, alimenté '
    + 'par AL1, transmet les ordres des points de commande aux actionneurs, qui alimentent les récepteurs. '
    + 'Compléter le schéma électrique de l’installation : ici, il se câble sur la platine — tête de tableau '
    + 'Q1, alimentation du bus par Q2, départs Q3 à Q8, six actionneurs, trois circuits d’éclairage et cinq '
    + 'volets roulants.',
  plaqueTitre: 'TABLEAU MYHOME · EIP',
  plaque: {
    'Tête': 'Q1 · disjoncteur différentiel 40 A · 30 mA (0 928 98)',
    'Bus': 'Q2 2 A (4 067 71) · AL1 E46ADCN · 27 V⎓ 1,2 A · 2 conducteurs non polarisés',
    'Départs': 'Q3, Q8, Q6 éclairages · Q4, Q5, Q7 volets · 16 A (4 067 74)',
    'Actionneurs': 'KA1, KA4, KA5 : 1 relais · KA2, KA3 : 4 relais · CAD C1 : volet',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: 'depuis Q100 sur Q1, disjoncteur différentiel 40 A 30 mA (tête du tableau)' },
    { k: 'Bus', v: 'Q2 (2 A) protège le primaire 230 V~ d’AL1 ; le bus 27 V⎓ relie AL1 aux six actionneurs, sans jamais former de boucle' },
    { k: 'Éclairage atelier', v: 'Q3 16 A → KA1 → L11 à L14' },
    { k: 'Éclairage sanitaire', v: 'Q8 16 A → KA4 → L1 à L6 (détecteur de présence)' },
    { k: 'Éclairage atelier électronique', v: 'Q6 16 A → KA5 → L7 à L10' },
    { k: 'Volets atelier', v: 'Q4 16 A → KA2 → V1 et V2 · Q5 16 A → KA3 → V3 et V4 (montée L1, descente L2, neutre)' },
    { k: 'Volet atelier électronique', v: 'Q7 16 A → CAD C1 → V5' },
    { k: 'Commandes', v: 'commande générale GEN / OFF ; atelier ON/OFF et UP/DOWN ; détecteur des sanitaires ; atelier électronique ON/OFF et UP/DOWN (cavaliers, DTR 13)' },
  ],
  libelles: { recv: 'Éclairages · atelier L11-L14 · sanitaire L1-L6 · atelier électronique L7-L10' },
  schemaImage: {
    src: '/tp/cgm2021/q58-corrige.jpg',
    legende: 'Schéma électrique de l’installation MyHOME (corrigé officiel)',
  },
  postes: [
    {
      id: 'q1', name: 'Q1 · Tête du tableau', need: 'Protéger les personnes et le tableau (choix des protections du corrigé)',
      options: [
        { key: 'dx3diff', ref: 'Disjoncteur différentiel 40 A 30 mA · 0 928 98', spec: '1P+N · 40 A · 30 mA', ok: true, why: 'Le choix du corrigé : 30 mA pour la protection des personnes, 40 A pour l’ensemble des départs.' },
        { key: 'dx3diff', ref: 'Interrupteur différentiel 40 A 300 mA', spec: '300 mA', why: '300 mA ne protège pas les personnes.' },
        { key: 'dx3diff', ref: 'Disjoncteur 1P+N 40 A', spec: 'sans différentiel', why: 'Plus de protection contre les défauts d’isolement.' },
      ],
    },
    {
      id: 'q2', name: 'Q2 · Alimentation du bus', need: 'Protéger le primaire d’AL1 (choix des protections du corrigé)',
      options: [
        { key: 'dx3pn', ref: 'DX3 1P+N 2 A · 4 067 71', spec: 'phase + neutre · 2 A', ok: true, why: 'AL1 n’appelle que 260 mA au primaire : 2 A.' },
        { key: 'dx3pn', ref: 'DX3 1P+N 16 A · 4 067 74', spec: 'phase + neutre · 16 A', why: 'Calibre des départs : l’alimentation ne serait plus protégée.' },
        { key: 'dx3pn', ref: 'DX3 1P+N 32 A', spec: '32 A', why: 'Sans rapport avec 260 mA.' },
      ],
    },
    {
      id: 'departs', name: 'Q3 à Q8 · Départs', need: 'Éclairages et volets (choix des protections du corrigé)',
      options: [
        { key: 'dx3pn', ref: 'DX3 1P+N 16 A · 4 067 74 (× 6)', spec: 'phase + neutre · 16 A', ok: true, why: 'Le calibre du corrigé pour chaque circuit, compatible avec les 16 A des actionneurs.' },
        { key: 'dx3pn', ref: 'DX3 1P+N 2 A (× 6)', spec: '2 A', why: 'Déclencherait au démarrage des volets et à l’allumage.' },
        { key: 'dx3pn', ref: 'DX3 1P+N 32 A (× 6)', spec: '32 A', why: 'Ne protège plus les câbles en 1,5 mm².' },
      ],
    },
    {
      id: 'al1', name: 'AL1 · Alimentation MyHOME', need: 'Fournir le 27 V⎓ du bus SCS',
      options: [
        { key: 'scsalim', ref: 'E46ADCN · 27 V⎓ 1,2 A', spec: 'primaire 230 V~ · 8 modules', ok: true, why: 'L’alimentation du système BUS/SCS (DTR 20).' },
        { key: 'scsalim', ref: 'Alimentation 24 V⎓ à découpage', spec: '24 V⎓', why: 'Ni la tension du bus ni son filtrage : les actionneurs ne recevraient pas les ordres.' },
        { key: 'scsalim', ref: 'Transformateur 230 / 12 V~', spec: 'alternatif', why: 'Le bus est en continu.' },
      ],
    },
    {
      id: 'actionneurs', name: 'KA1 à KA5, CAD C1 · Actionneurs', need: '1 relais par éclairage, 2 relais par volet',
      options: [
        { key: 'f411x4', ref: 'F411/1N × 3 · F411/4 × 2 · actionneur volet × 1', spec: 'MyHOME SCS', ok: true, why: 'Un relais par circuit d’éclairage, deux relais (montée, descente) par volet : KA2 et KA3 en pilotent deux chacun.' },
        { key: 'f411x4', ref: 'F411/4 × 6', spec: '4 relais partout', half: true, why: 'Fonctionnerait, mais des relais payés pour rien sur les éclairages.' },
        { key: 'f411x4', ref: 'Télérupteurs 230 V × 6', spec: 'appareillage traditionnel', why: 'Aucune liaison au bus : plus de commande générale ni de scénario.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  sectionneurs: ['q8', 'q6', 'q4', 'q5', 'q7'],
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur différentiel 40 A 30 mA (tête, consignation)', key: 'dx3diff', rail: 0, x: 50, rep: 'Q1' },
    { id: 'f2', label: 'Q2 · Disjoncteur 2 A · alimentation du bus', key: 'dx3pn', rail: 0, x: 110, rep: 'Q2' },
    { id: 'al1', label: 'AL1 · Alimentation MyHOME / SCS E46ADCN · 27 V⎓', key: 'scsalim', rail: 0, x: 144, rep: 'AL1' },
    { id: 'f3', label: 'Q3 · Disjoncteur 16 A · éclairage atelier', key: 'dx3pn', rail: 1, x: 56, rep: 'Q3' },
    { id: 'q8', label: 'Q8 · Disjoncteur 16 A · éclairage sanitaire', key: 'dx3pn', rail: 1, x: 92, rep: 'Q8' },
    { id: 'q6', label: 'Q6 · Disjoncteur 16 A · éclairage atelier électronique', key: 'dx3pn', rail: 1, x: 128, rep: 'Q6' },
    { id: 'q4', label: 'Q4 · Disjoncteur 16 A · volets atelier (circuit 1)', key: 'dx3pn', rail: 1, x: 164, rep: 'Q4' },
    { id: 'q5', label: 'Q5 · Disjoncteur 16 A · volets atelier (circuit 2)', key: 'dx3pn', rail: 1, x: 200, rep: 'Q5' },
    { id: 'q7', label: 'Q7 · Disjoncteur 16 A · volet atelier électronique', key: 'dx3pn', rail: 1, x: 236, rep: 'Q7' },
    { id: 'ka1', label: 'KA1 · Actionneur 1 relais · éclairage atelier', key: 'f411n', rail: 2, x: 50, rep: 'KA1' },
    { id: 'ka4', label: 'KA4 · Actionneur 1 relais · éclairage sanitaire', key: 'f411n', rail: 2, x: 106, rep: 'KA4' },
    { id: 'ka5', label: 'KA5 · Actionneur 1 relais · éclairage atelier électronique', key: 'f411n', rail: 2, x: 162, rep: 'KA5' },
    { id: 'ka2', label: 'KA2 · Actionneur 4 relais · volets V1 et V2', key: 'f411x4', rail: 2, x: 218, rep: 'KA2' },
    { id: 'ka3', label: 'KA3 · Actionneur 4 relais · volets V3 et V4', key: 'f411x4', rail: 2, x: 274, rep: 'KA3' },
    { id: 'cad', label: 'CAD C1 · Actionneur de volet · V5', key: 'f411v', rail: 2, x: 330, rep: 'C1' },
    // volets roulants de l'atelier et de l'atelier électronique (colonne du local)
    ...[1, 2, 3, 4, 5].map(i => ({
      id: `v${i}`, label: `V${i} · Moteur de volet roulant${i === 5 ? ' · atelier électronique' : ' · atelier'}`,
      key: 'motvolet', rail: null, x: 452, y: 50 + (i - 1) * 74, rep: `V${i}`,
    })),
  ],
  annexItems: [],
  recvItems: [
    { key: 'l_ampoule_plexo_hublot', rep: 'L11', name: 'éclairage atelier · L11 à L14 (4 × 42 W en parallèle)', x: 60, y: 26, w: 60, h: 60, recv: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L1', name: 'éclairage sanitaire · L1 à L6 (6 × 15 W en parallèle)', x: 200, y: 26, w: 60, h: 60, recv: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'L7', name: 'éclairage atelier électronique · L7 à L10 (4 × 42 W en parallèle)', x: 340, y: 26, w: 60, h: 60, recv: true },
  ],
  liaisons: LIAISONS,
  nets: nets(),
  tests: BASE_TESTS.filter(t => t.id !== 'pe'),
  mesures: [
    { id: 'cN', title: 'Continuité du neutre de l’éclairage atelier (Q3 → L11)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'f3.N2', b: 'L11.X2', min: 0, max: 2, unit: 'Ω' },
    { id: 'cBus', title: 'Continuité du bus, de AL1 à CAD C1 (conducteur +)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'al1.+', b: 'cad.+', min: 0, max: 2, unit: 'Ω' },
    { id: 'uBus', title: 'Tension du bus en sortie d’AL1', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'al1.+', b: 'al1.−', min: 26, max: 28, unit: 'V', when: 'ctl' },
    { id: 'uBusC1', title: 'Tension du bus sur CAD C1 (dernier actionneur)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'cad.+', b: 'cad.−', min: 26, max: 28, unit: 'V', when: 'ctl' },
    { id: 'uKA1', title: 'Tension à l’entrée de KA1 (aval de Q3)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'ka1.1', b: 'f3.N2', min: 220, max: 240, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'busKA5', title: 'Bus coupé entre KA4 et KA5',
      symptom: 'KA1 et KA4 obéissent aux commandes ; KA5, KA2, KA3 et CAD C1 ne réagissent plus : ni l’éclairage de l’atelier électronique, ni aucun volet.',
      fix: 'Mesurer le bus d’actionneur en actionneur : 27 V⎓ sur KA4, 0 V sur KA5. Reprendre le conducteur + du bus entre KA4 et KA5.',
      coupe: 'ka4.+>ka5.+',
      nets: hors(['ka5.+', 'ka2.+', 'ka3.+', 'cad.+']),
      action: 'Reprendre le conducteur + du bus entre KA4 et KA5',
    },
    {
      id: 'neutreV5', title: 'Neutre du volet V5 non raccordé',
      symptom: 'Sur ordre de montée ou de descente, CAD C1 commute (on l’entend) mais le volet V5 ne bouge pas. Les autres volets fonctionnent.',
      fix: 'Hors tension, contrôler la continuité entre N de Q7 et N de V5 : OL. Raccorder le neutre du moteur.',
      coupe: 'q7.N2>v5.N',
      nets: hors(['v5.N']),
      action: 'Raccorder le neutre du moteur V5 sur Q7',
    },
  ],
  quiz: [
    { q: 'Quelle est la tension du bus MyHOME / SCS ?', options: ['12 V⎓', '27 V⎓', '230 V~', '400 V~'], answer: 1 },
    { q: 'Comment peut-on câbler le bus ?', options: ['En parallèle, en arborescence ou en étoile, jamais en boucle', 'Uniquement en boucle fermée', 'Uniquement en étoile', 'En série avec les récepteurs'], answer: 0 },
    { q: 'Combien de relais faut-il pour commander un volet roulant ?', options: ['1', '2 : montée et descente', '4', 'Aucun'], answer: 1 },
    { q: 'D’où vient le 230 V qui alimente les lampes L11 à L14 ?', options: ['Du bus', 'De Q3, à travers le contact de KA1', 'D’AL1', 'De Q2'], answer: 1 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2'], ['f2.2', 'f2.N2'], ['f3.2', 'f3.N2']],
  },
};
