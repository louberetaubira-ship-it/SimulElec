/**
 * TP platine de service · sujet EIP, partie 4, question 67 :
 * schéma électrique du contrôle d'accès VIGIK de l'EIP.
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `eip`
 * (`src/components/sujet/CablageReel.tsx`). `hidden` : absent du catalogue, jouable par la
 * route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ câblage (corrigé, page 31)
 *  - « vers Q100 » → Q10 et Q11 : pré-tracé au sujet, donc posé par l'installateur ;
 *  - Q10 → AL2 (L, N) ; +V → AC, −V → AC de la centrale (12 V⎓) ;
 *  - Q11 → primaire 230 V~ d'AL3 ; secondaire 12 V~ : S1 → C (commun du relais de la
 *    centrale), S2 → gâche GA1 ; T (travail) → gâche : le relais ferme la boucle de la gâche
 *    à émission de courant ;
 *  - BP → S7 → − : bouton de sortie ; L+ / L− → tête de lecture U1.
 * Couleurs imposées au sujet : 230 V noir et bleu, 12 V~ bleu, 12 V⎓ + vert et − bleu, U1 et
 * S7 noir — la platine garde ses couleurs de réseau ; le mode « traits » du sujet les note.
 *
 * ------------------------------------------------------------ correspondance moteur
 *   · `q1` = Q100, départ du tableau vers le coffret VIGIK (organe de consignation) ;
 *   · `f2` = Q10, alimentation de la centrale (aval `f2`) ;
 *   · `f3` = Q11, alimentation de la gâche (aval `q1f3`, en parallèle de Q10).
 * Le 12 V~ du secondaire d'AL3 et les signaux de la centrale (BP, L+, L−, C, T) ne sont pas
 * des réseaux que le simulateur sait mesurer (ni 230 V, ni continu) : seul le retour de la
 * gâche est déclaré, pour la continuité à l'ohmmètre. L'essai de la gâche (badge, bouton de
 * sortie) se fait dans le mode câblage réel du sujet.
 */
import type { Liaison, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

const LIAISONS: Liaison[] = [
  // ---- « vers Q100 » → Q10 et Q11 (pré-tracé au sujet : installateur) ----
  PRE('RES.L1', 'q1.1', 'L1'), PRE('RES.N', 'q1.N', 'N'),
  PRE('q1.2', 'f2.1', 'L1'), PRE('q1.N2', 'f2.N', 'N'),
  PRE('q1.2', 'f3.1', 'L1'), PRE('q1.N2', 'f3.N', 'N'),
  // ---- Q10 → alimentation 12 V⎓ AL2 ----
  L('f2.2', 'al2.L', 'L1'), L('f2.N2', 'al2.N', 'N'),
  // ---- Q11 → primaire 230 V~ d'AL3 ----
  L('f3.2', 'al3.P1', 'L1'), L('f3.N2', 'al3.P2', 'N'),
  // ---- AL2 → centrale (12 V⎓) ----
  L('al2.+V', 'cen.AC1', 'DC+'), L('al2.−V', 'cen.AC2', 'DC-'),
  // ---- bouton de sortie S7 entre BP et − ----
  L('cen.BP', 's7.13', 'DC-'), L('s7.14', 'cen.−', 'DC-'),
  // ---- tête de lecture U1 ----
  L('cen.L+', 'u1.L+', 'DC-'), L('cen.L−', 'u1.L−', 'DC-'),
  // ---- boucle de la gâche : AL3 12 V~ → C … T → GA1 → AL3 ----
  L('cen.C', 'al3.S1', 'N'), L('al3.S2', 'ga1.2', 'N'), L('cen.T', 'ga1.1', 'N'),
];

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live']) => {
    for (const id of ids) n[id] = { net, live };
  };
  // Q100 (`q1`)
  set(['q1.1'], 'L1', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2', 'f2.1', 'f3.1'], 'L1', 'q1'); set(['q1.N2', 'f2.N', 'f3.N'], 'N', 'q1');
  // Q10 (`f2`) → AL2
  set(['f2.2', 'al2.L'], 'L1', 'f2'); set(['f2.N2', 'al2.N'], 'N', 'f2');
  set(['al2.+V', 'cen.AC1'], 'DC+', 'f2'); set(['al2.−V', 'cen.AC2'], 'DC-', 'f2');
  // Q11 (`f3`) → primaire d'AL3
  set(['f3.2', 'al3.P1'], 'L1', 'q1f3'); set(['f3.N2', 'al3.P2'], 'N', 'q1f3');
  // retour de la boucle de la gâche (secondaire 12 V~ d'AL3 → GA1) : déclaré pour que la
  // continuité se contrôle à l'ohmmètre ; le 12 V~ lui-même ne se mesure pas au parcours
  set(['al3.S2', 'ga1.2'], 'N', 'q1f3');
  return n;
}

export const TP_EIP_Q67_VIGIK: TpDefinition = {
  id: 'eip-q67-vigik',
  title: 'EIP · Contrôle d’accès VIGIK de l’EIP (câblage réel)',
  level: 'Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  hidden: true,
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  arriveeMono: true,
  uContinu: 12,
  summary:
    'Sujet EIP, partie 4 : contrôle d’accès de l’espace d’innovation '
    + 'partagé en produits VIGIK. Centrale BT348043 alimentée en 12 V⎓ par AL2 (Q10), tête de lecture '
    + 'BT348704, bouton de sortie anti-vandale S7, gâche à émission de courant GA1 alimentée par AL3 (Q11). '
    + 'Câbler le schéma, mettre sous tension, présenter un badge.',
  situation:
    'Pour des raisons de gestion et de surveillance de la salle, il a été demandé de pouvoir ouvrir l’accès '
    + 'de la salle avec des badges individuels programmés. La centrale de contrôle d’accès est placée dans '
    + 'le coffret électrique ; la tête de lecture est à droite de la porte, en encastré ; la porte est équipée '
    + 'd’une gâche électrique à encastrer ; un bouton poussoir anti-vandale, à l’intérieur, permet de sortir. '
    + 'Compléter le schéma électrique de l’installation : ici, il se câble sur la platine.',
  plaqueTitre: 'CONTRÔLE D’ACCÈS VIGIK · EIP',
  plaque: {
    'Centrale': 'CEN 1 · BT348043 · 10 à 20 V⎓ 400 mA / 12 à 15 V~',
    'Tête de lecture': 'U1 · BT348704 · boîtier inox encastré 004862',
    'Gâche': 'GA1 · 003033 · 12 V~/⎓ · émission de courant · 300 mA en ~ / 400 mA en ⎓',
    'Alimentations': 'AL2 1 467 11 (centrale) · AL3 336842 (gâche) · Q10 et Q11 : 2 A (4 067 71)',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: 'depuis Q100 sur Q10 (centrale) et Q11 (gâche), pré-câblée' },
    { k: 'Centrale', v: 'AL2 12 V⎓ sur les bornes AC AC de la centrale, protégée par Q10 (2 A)' },
    { k: 'Gâche', v: 'à émission de courant : elle ne déverrouille que pendant sa mise sous tension. Alimentée en 12 V~ par AL3 (Q11, 2 A), à travers le contact C-T de la centrale' },
    { k: 'Sortie', v: 'bouton poussoir anti-vandale S7 entre BP et − de la centrale' },
    { k: 'Lecture', v: 'tête de lecture U1 sur L+ et L− (câble blindé, tresse au −)' },
    { k: 'Couleurs du schéma', v: '230 V noir et bleu · 12 V~ bleu · 12 V⎓ + vert et − bleu · U1 et S7 noir' },
  ],
  libelles: { rangees: ['goulotte 1', 'goulotte 2', 'goulotte 3'], recv: 'Porte de l’EIP : tête de lecture, bouton de sortie et gâche dans la colonne du local' },
  schemaImage: {
    src: '/tp/eip/q67-corrige.jpg',
    legende: 'Schéma électrique du contrôle d’accès VIGIK (corrigé officiel)',
  },
  postes: [
    {
      id: 'cen', name: 'Centrale de contrôle d’accès', need: 'Gestion autonome d’une porte par badges (recensement du matériel)',
      options: [
        { key: 'cenvigik', ref: 'BT348043', spec: 'centrale VIGIK 1 porte · gestion autonome · 1 000 badges résidents', ok: true, why: 'La centrale du corrigé : gestion autonome, programmation des badges sans outil.' },
        { key: 'cenvigik', ref: 'Terminal de programmation BT348409', spec: 'outil de programmation', why: 'Il programme les badges, il ne gère pas la porte.' },
        { key: 'cenvigik', ref: 'Centrale d’alarme 4 boucles', spec: 'intrusion', why: 'Aucune fonction de contrôle d’accès.' },
      ],
    },
    {
      id: 'al2', name: 'AL2 · Alimentation de la centrale', need: '10 à 20 V⎓, 400 mA (caractéristiques de la centrale)',
      options: [
        { key: 'al12dc', ref: 'Legrand 1 467 11', spec: '230 V~ → 12 V⎓', ok: true, why: 'Le choix du corrigé : 12 V⎓ dans la plage 10 à 20 V⎓ de la centrale.' },
        { key: 'al12dc', ref: 'Alimentation 24 V⎓', spec: '24 V⎓', why: 'Au-dessus des 20 V⎓ admis par la centrale.' },
        { key: 'al12dc', ref: 'Alimentation 5 V⎓', spec: '5 V⎓', why: 'En dessous de 10 V⎓ : la centrale ne démarre pas.' },
      ],
    },
    {
      id: 'al3', name: 'AL3 · Alimentation de la gâche', need: '12 V, 300 mA en ~ (caractéristiques de la gâche)',
      options: [
        { key: 'trsonn', ref: 'Legrand 336842', spec: '230 V~ → 12 V~ 1,5 A', ok: true, why: 'Le choix du corrigé : 12 V~, largement au-dessus des 300 mA de la gâche.' },
        { key: 'trsonn', ref: 'Transformateur 230 / 24 V~', spec: '24 V~', why: 'La gâche est en 12 V : elle chaufferait.' },
        { key: 'trsonn', ref: 'Alimenter la gâche par AL2', spec: 'sur le 12 V⎓ de la centrale', why: '400 mA de gâche en plus des 400 mA de la centrale : le corrigé prévoit une alimentation séparée.' },
      ],
    },
    {
      id: 'q1011', name: 'Q10 et Q11 · Protections', need: 'Protéger AL2 et AL3 (choix des alimentations et protections)',
      options: [
        { key: 'dx3pn', ref: 'DX3 1P+N 2 A · 4 067 71 (× 2)', spec: 'phase + neutre · 2 A', ok: true, why: 'Calibre 2 A du corrigé pour les deux alimentations.' },
        { key: 'dx3pn', ref: 'DX3 1P+N 16 A (× 2)', spec: '16 A', why: 'Les petites alimentations ne seraient plus protégées.' },
        { key: 'dx3pn', ref: 'Fusibles 10 A', spec: 'sans sectionnement du neutre', why: 'Ne coupe pas le neutre.' },
      ],
    },
  ],
  rails: [150, 346],
  armoire: 520,
  slots: [
    { id: 'q1', label: 'Q100 · Départ du tableau vers le coffret VIGIK (consignation)', key: 'dx3pn', rail: 0, x: 56, rep: 'Q100' },
    { id: 'f2', label: 'Q10 · Disjoncteur 2 A · alimentation de la centrale', key: 'dx3pn', rail: 0, x: 100, rep: 'Q10' },
    { id: 'f3', label: 'Q11 · Disjoncteur 2 A · alimentation de la gâche', key: 'dx3pn', rail: 0, x: 134, rep: 'Q11' },
    { id: 'al2', label: 'AL2 · Alimentation 12 V⎓ de la centrale · 1 467 11', key: 'al12dc', rail: 0, x: 176, rep: 'AL2' },
    { id: 'al3', label: 'AL3 · Alimentation 12 V~ de la gâche · 336842', key: 'trsonn', rail: 0, x: 240, rep: 'AL3' },
    { id: 'cen', label: 'CEN 1 · Centrale VIGIK BT348043', key: 'cenvigik', rail: 1, x: 90, rep: 'CEN1' },
    // appareils de la porte (colonne du local)
    { id: 'u1', label: 'U1 · Tête de lecture VIGIK BT348704', key: 'lectvigik', rail: null, x: 452, y: 70, rep: 'U1' },
    { id: 's7', label: 'S7 · Bouton poussoir anti-vandale · ouverture sortie', key: 'bpsortie', rail: null, x: 452, y: 180, rep: 'S7' },
    { id: 'ga1', label: 'GA1 · Gâche électrique 12 V à émission de courant', key: 'gache12', rail: null, x: 452, y: 280, rep: 'GA1' },
  ],
  annexItems: [],
  recvItems: [],
  liaisons: LIAISONS,
  nets: nets(),
  tests: BASE_TESTS.filter(t => t.id !== 'pe'),
  mesures: [
    { id: 'cMoins', title: 'Continuité du − de la centrale (AL2 −V → AC)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'al2.−V', b: 'cen.AC2', min: 0, max: 2, unit: 'Ω' },
    { id: 'cGache', title: 'Continuité de la boucle de la gâche (AL3 → GA1)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'al3.S2', b: 'ga1.2', min: 0, max: 2, unit: 'Ω' },
    { id: 'uAL2', title: 'Tension de sortie d’AL2', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'al2.+V', b: 'al2.−V', min: 11, max: 13, unit: 'V', when: 'ctl' },
    { id: 'uCEN', title: 'Tension d’alimentation de la centrale (AC – AC)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'cen.AC1', b: 'cen.AC2', min: 11, max: 13, unit: 'V', when: 'ctl' },
    { id: 'uAL3', title: 'Tension au primaire d’AL3', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'al3.P1', b: 'al3.P2', min: 220, max: 240, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'plusCEN', title: 'Conducteur + de l’alimentation de la centrale débranché',
      symptom: 'La centrale reste éteinte : aucun badge n’est lu, le bouton de sortie n’ouvre plus. AL2 est pourtant sous tension (sa DEL est allumée).',
      fix: 'Mesurer 12 V⎓ entre +V et −V d’AL2, puis 0 V entre les bornes AC de la centrale : reprendre le conducteur + entre AL2 et la centrale.',
      coupe: 'al2.+V>cen.AC1',
      nets: { 'cen.AC1': { live: 'off' } },
      action: 'Reprendre le conducteur + entre AL2 et la borne AC de la centrale',
    },
    {
      id: 'gache', title: 'Retour de la gâche non raccordé à AL3',
      symptom: 'Le badge est accepté — le relais de la centrale claque — mais la porte ne se déverrouille pas. Même chose avec le bouton de sortie.',
      fix: 'Hors tension, contrôler la continuité de la boucle AL3 → C-T → GA1 → AL3 : OL entre AL3 et la gâche. Reprendre le conducteur.',
      coupe: 'al3.S2>ga1.2',
      action: 'Raccorder la gâche sur la borne 12 V~ d’AL3',
    },
  ],
  quiz: [
    { q: 'Comment fonctionne une gâche à émission de courant ?', options: ['Elle déverrouille la porte pendant sa mise sous tension', 'Elle verrouille la porte quand elle est alimentée', 'Elle reste déverrouillée après une impulsion', 'Elle fonctionne sans alimentation'], answer: 0 },
    { q: 'Quel contact de la centrale commande la gâche ?', options: ['C – R', 'C – T', 'AC – AC', 'L+ – L−'], answer: 1 },
    { q: 'Où est raccordée la tresse du câble blindé de la tête de lecture ?', options: ['Au −', 'Au +', 'À la terre du tableau', 'Nulle part'], answer: 0 },
    { q: 'Entre quelles bornes de la centrale se raccorde le bouton de sortie S7 ?', options: ['BP et −', 'L+ et L−', 'C et T', 'AC et AC'], answer: 0 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2'], ['f2.2', 'f2.N2'], ['f3.2', 'f3.N2']],
  },
};
