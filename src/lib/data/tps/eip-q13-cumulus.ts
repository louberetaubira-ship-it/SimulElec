/**
 * TP platine de service · sujet EIP, partie 1, question 13 :
 * alimentation du cumulus piloté par un contact d'horloge programmable.
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `eip` : le même
 * montage que le schéma multifilaire à compléter, mais sur la platine du simulateur, avec
 * mise sous tension et essai fonctionnel (`src/components/sujet/CablageReel.tsx`). Le TP est
 * `hidden` : absent du catalogue, il reste jouable par la route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ câblage (corrigé, page 11)
 *  - N et L arrivent en amont de Q6 (protection de l'horloge) et de Q7 (protection du
 *    contacteur) : l'arrivée est amenée par l'installateur sur le bornier X1 ;
 *  - Q6 → horloge : P sur U1 et sur le commun 1 du contact, N sur U2 et sur A1 de KM1 ;
 *  - contact de l'horloge 1-4 (fermeture) → A2 : c'est lui qui enclenche la bobine ;
 *  - Q7 → pôles de KM1 : N sur 1, P sur 3 ; 2 et 4 → sortie des câbles du chauffe-eau
 *    (N, L), PE depuis la barrette de terre (X1:3).
 *
 * ------------------------------------------------------------ correspondance moteur
 * Le moteur de simulation connaît trois organes (`q1`, `f2`, `f3`) :
 *   · `q1` = Q7, protection du contacteur et du chauffe-eau (organe de consignation) ;
 *   · `f2` = Q6, protection de l'horloge — aval déclaré `q2` : il ne dépend que de Q6 ;
 *   · `f3` = KM1, sa manette I / AUTO / 0 : fermée en AUTO. L'aval des pôles de KM1 est
 *     déclaré `f3` (Q7, Q6 et KM1 en AUTO) : le contact de l'horloge est supposé fermé
 *     (heures creuses) dans le parcours standard. L'essai contact ouvert / fermé se fait
 *     dans le mode câblage réel du sujet.
 */
import type { Liaison, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

/** Liaisons du schéma corrigé, dans l'ordre où l'élève les pose. */
const LIAISONS: Liaison[] = [
  // ---- arrivée (installateur) : N, L et PE jusqu'au bornier X1 ----
  PRE('RES.L1', 'x1_1.b', 'L1'), PRE('RES.N', 'x1_2.b', 'N'), PRE('RES.PE', 'x1_3.b', 'PE'),
  // ---- en amont de Q6 et de Q7 ----
  L('x1_2.a', 'f2.N', 'N'), L('x1_1.a', 'f2.1', 'L1'),
  L('x1_2.a', 'q1.N', 'N'), L('x1_1.a', 'q1.1', 'L1'),
  // ---- Q6 → horloge programmable (moteur U1-U2, commun 1 du contact) et A1 ----
  L('f2.2', 'ih.U1', 'L1'), L('f2.2', 'ih.1', 'L1'),
  L('f2.N2', 'ih.U2', 'N'), L('f2.N2', 'f3.A1', 'N'),
  // ---- contact de l'horloge (1-4) → bobine A2 de KM1 ----
  L('ih.4', 'f3.A2', 'LC'),
  // ---- Q7 → pôles de KM1 ----
  L('q1.N2', 'f3.1', 'N'), L('q1.2', 'f3.3', 'L1'),
  // ---- KM1 → sortie des câbles du chauffe-eau ----
  L('f3.2', 'CE.X2', 'N'), L('f3.4', 'CE.X1', 'LC'),
  L('x1_3.a', 'CE.PE', 'PE'),
];

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live']) => {
    for (const id of ids) n[id] = { net, live };
  };
  // bornier X1 : arrivée toujours vive
  set(['x1_1.a', 'x1_1.b'], 'L1', 'always'); set(['x1_2.a', 'x1_2.b'], 'N', 'always');
  set(['x1_3.a', 'x1_3.b'], 'PE', 'always');
  // Q7 (`q1`) : protection du contacteur et du chauffe-eau
  set(['q1.1'], 'L1', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2'], 'L1', 'q1'); set(['q1.N2'], 'N', 'q1');
  // Q6 (`f2`) : protection de l'horloge, en parallèle de Q7 (aval : Q6 seul)
  set(['f2.1'], 'L1', 'always'); set(['f2.N'], 'N', 'always');
  set(['f2.2'], 'L1', 'q2'); set(['f2.N2'], 'N', 'q2');
  // horloge : moteur U1-U2, contact 1 → 4 (fermé en heures creuses)
  set(['ih.U1', 'ih.1'], 'L1', 'q2'); set(['ih.U2'], 'N', 'q2'); set(['ih.4'], 'LC', 'q2');
  // KM1 (`f3`) : bobine A1-A2, pôles 1-2 (N) et 3-4 (L)
  set(['f3.A1'], 'N', 'q2'); set(['f3.A2'], 'LC', 'q2');
  set(['f3.1'], 'N', 'q1'); set(['f3.3'], 'L1', 'q1');
  set(['f3.2'], 'N', 'f3'); set(['f3.4'], 'LC', 'f3');
  // chauffe-eau
  set(['CE.X1'], 'LC', 'f3'); set(['CE.X2'], 'N', 'f3'); set(['CE.PE'], 'PE', 'always');
  return n;
}

export const TP_EIP_Q13_CUMULUS: TpDefinition = {
  id: 'eip-q13-cumulus',
  title: 'EIP · Alimentation du cumulus par contact d’horloge (câblage réel)',
  level: 'Bac Pro MELEC',
  family: 'hab',
  scene: 'hab',
  annex: 'room',
  playable: true,
  hidden: true,
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  summary:
    'Sujet EIP, partie 1. Le cumulus des '
    + 'sanitaires est déplacé et son alimentation passe en heures creuses : l’horloge programmable, '
    + 'protégée par Q6, commande la bobine du contacteur KM1 ; KM1, protégé par Q7, alimente le chauffe-eau. '
    + 'Câbler le schéma multifilaire, mettre sous tension, essayer.',
  situation:
    'Dans le cadre de la rénovation des sanitaires, le cumulus sera déplacé et le câblage doit être modifié '
    + 'afin de réduire le coût de sa consommation. Avant la réalisation, compléter le schéma multifilaire de '
    + 'l’alimentation du cumulus piloté par un contact d’horloge programmable, en commençant en amont de Q6 '
    + '(protection de l’horloge programmable) et de Q7 (protection du contacteur). Ici, le schéma se câble '
    + 'sur la platine : Q6, Q7, l’horloge, le contacteur heures creuses KM1 et la sortie des câbles du '
    + 'chauffe-eau sont posés.',
  plaqueTitre: 'CUMULUS · HEURES CREUSES',
  plaque: {
    'Horloge': 'interrupteur horaire Legrand MicroRex (DTR 6) · U1-U2 230 V~ · contact 1-4 16 A',
    'Contacteur': 'KM1 · Legrand 4 125 01 · 25 A · manette I / AUTO / 0 · bobine 230 V~ A1-A2 (DTR 5)',
    'Protections': 'Q6 (horloge) · Q7 (contacteur et chauffe-eau)',
    'Câble du chauffe-eau': 'U1000 R2V 3G2,5',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: 'N et L en amont de Q6 et de Q7 (bornier X1), PE sur la barrette de terre' },
    { k: 'Q6', v: 'protection de l’horloge programmable : alimente le moteur U1-U2 et le commun 1 du contact' },
    { k: 'Horloge', v: 'contact 1-4 fermé pendant les heures creuses : il alimente la bobine A1-A2 de KM1' },
    { k: 'Q7', v: 'protection du contacteur : alimente les pôles 1 (N) et 3 (L) de KM1' },
    { k: 'KM1', v: 'contacteur heures creuses 25 A : pôles 2 et 4 vers la sortie des câbles du chauffe-eau (N, L), manette sur AUTO' },
    { k: 'Couleurs', v: 'phase marron (ou rouge), neutre bleu, PE vert-jaune' },
  ],
  libelles: { recv: 'Sortie des câbles du chauffe-eau · N · PE · L', rangees: ['rangée 1 · protections, horloge, contacteur', 'rangée 2 · bornier X1 (arrivée)'] },
  schemaImage: {
    src: '/tp/eip/q13-corrige.jpg',
    legende: 'Schéma multifilaire de l’alimentation du cumulus (corrigé officiel)',
  },
  postes: [
    {
      id: 'q6', name: 'Q6 · Protection de l’horloge', need: 'Protéger l’horloge et la bobine de KM1, phase + neutre',
      options: [
        { key: 'dx3pn', ref: 'Legrand DX3 1P+N 2 A', spec: 'phase + neutre · 2 A courbe C', ok: true, why: 'Un circuit de commande n’appelle que quelques milliampères : 2 A le protège, et le neutre est coupé avec la phase.' },
        { key: 'dx3pn', ref: 'Legrand DX3 1P+N 20 A', spec: 'phase + neutre · 20 A', why: 'Calibre du circuit de puissance : l’horloge ne serait plus protégée.' },
        { key: 'dx3pn', ref: 'Interrupteur 2P 20 A', spec: 'sans protection', why: 'Un interrupteur sectionne mais ne protège pas contre les surintensités.' },
      ],
    },
    {
      id: 'q7', name: 'Q7 · Protection du contacteur et du chauffe-eau', need: 'Protéger le câble 3G2,5 du chauffe-eau',
      options: [
        { key: 'dx3pn', ref: 'Legrand DX3 1P+N 20 A', spec: 'phase + neutre · 20 A courbe C', ok: true, why: '20 A protège un câble de 2,5 mm² et un chauffe-eau jusqu’à 3 kW ; KM1 (25 A) est bien au-dessus.' },
        { key: 'dx3pn', ref: 'Legrand DX3 1P+N 32 A', spec: 'phase + neutre · 32 A', why: '32 A ne protège plus un conducteur de 2,5 mm².' },
        { key: 'dx3pn', ref: 'Legrand DX3 1P+N 2 A', spec: 'phase + neutre · 2 A', why: 'Déclencherait à la mise en chauffe.' },
      ],
    },
    {
      id: 'ih', name: 'Horloge programmable', need: 'Fermer un contact pendant les heures creuses (DTR 6)',
      options: [
        { key: 'horlogelg', ref: 'Legrand MicroRex · interrupteur horaire', spec: 'moteur 230 V~ U1-U2 · contact inverseur 1-4 / 1-2 · 16 A', ok: true, why: 'L’interrupteur horaire du DTR 6 : son contact 1-4 se ferme aux heures programmées.' },
        { key: 'horlogelg', ref: 'Minuterie d’escalier', spec: 'temporisation après appui', why: 'Une minuterie compte un temps après un appui : elle ne suit pas l’horaire des heures creuses.' },
        { key: 'horlogelg', ref: 'Télérupteur', spec: 'bistable, commandé par poussoirs', why: 'Aucune notion d’horaire : il changerait d’état à chaque impulsion.' },
      ],
    },
    {
      id: 'km1', name: 'KM1 · Contacteur heures creuses', need: 'Couper le chauffe-eau, bobine 230 V~, 25 A (DTR 5)',
      options: [
        { key: 'contacthc', ref: 'Legrand 4 125 01 · 25 A · manette I / AUTO / 0', spec: 'bobine 230 V~ · 2 pôles 1-2 / 3-4', ok: true, why: 'Le contacteur du DTR 5 : la manette permet de forcer la marche (I), de suivre l’horloge (AUTO) ou d’arrêter (0).' },
        { key: 'contacthc', ref: 'Contacteur 25 A bobine 24 V', spec: 'bobine TBT', why: 'Le contact de l’horloge commute du 230 V : une bobine 24 V grillerait.' },
        { key: 'contacthc', ref: 'Relais 10 A', spec: 'bobine 230 V · 10 A', why: 'Trop faible pour un chauffe-eau de 2 à 3 kW (9 à 13 A).' },
      ],
    },
  ],
  rails: [150, 346],
  armoire: 520,
  slots: [
    { id: 'f2', label: 'Q6 · Disjoncteur 2 A · protection de l’horloge programmable', key: 'dx3pn', rail: 0, x: 62, rep: 'Q6' },
    { id: 'q1', label: 'Q7 · Disjoncteur 20 A · protection du contacteur (consignation)', key: 'dx3pn', rail: 0, x: 104, rep: 'Q7' },
    { id: 'ih', label: 'Horloge programmable · interrupteur horaire MicroRex', key: 'horlogelg', rail: 0, x: 150, rep: 'IH' },
    { id: 'f3', label: 'KM1 · Contacteur heures creuses 25 A · manette I / AUTO / 0', key: 'contacthc', rail: 0, x: 252, rep: 'KM1' },
    { id: 'x1_1', label: 'X1:1 · arrivée phase', key: 'termred', rail: 1, x: 62, mark: '1', sub: 'L', group: 'X1', groupLabel: 'X1 · arrivée' },
    { id: 'x1_2', label: 'X1:2 · arrivée neutre', key: 'termblue', rail: 1, x: 80, mark: '2', sub: 'N', group: 'X1' },
    { id: 'x1_3', label: 'X1:3 · terre', key: 'earth', rail: 1, x: 98, mark: '3', sub: 'PE', group: 'X1' },
  ],
  annexItems: [],
  recvItems: [
    { key: 'l_recepteu_chauffe_eau', rep: 'CE', name: 'chauffe-eau · sortie des câbles N · PE · L', x: 250, y: 22, w: 56, h: 116, recv: true, pe: true },
  ],
  liaisons: LIAISONS,
  nets: nets(),
  tests: BASE_TESTS,
  mesures: [
    { id: 'rpe', title: 'Continuité du PE jusqu’au chauffe-eau', stage: 'horsTension', instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'CE.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'riso', title: 'Isolement de la phase du chauffe-eau (L / PE)', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'CE.X1', b: 'CE.PE', min: 0.5, max: 9999, unit: 'MΩ' },
    { id: 'uIH', title: 'Tension d’alimentation de l’horloge (U1 – U2)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'ih.U1', b: 'ih.U2', min: 220, max: 240, unit: 'V', when: 'ctl' },
    { id: 'uCE', title: 'Tension aux bornes du chauffe-eau (L – N), KM1 enclenché', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'CE.X1', b: 'CE.X2', min: 220, max: 240, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'filA2', title: 'Fil de la bobine A2 débranché',
      symptom: 'Aux heures creuses, l’horloge affiche bien son contact fermé, mais KM1 ne s’enclenche pas : le chauffe-eau reste froid. En forçant la manette de KM1 sur I, il chauffe.',
      fix: 'Mesurer la tension A1-A2 (0 V) puis entre la borne 4 de l’horloge et le neutre (230 V) : le conducteur 4 → A2 est coupé. Le resserrer.',
      coupe: 'ih.4>f3.A2',
      nets: { 'f3.A2': { live: 'off' }, 'f3.2': { live: 'off' }, 'f3.4': { live: 'off' }, 'CE.X1': { live: 'off' }, 'CE.X2': { live: 'off' } },
      action: 'Reconnecter le conducteur de la borne 4 de l’horloge sur A2 de KM1',
    },
    {
      id: 'neutreCE', title: 'Neutre du chauffe-eau non raccordé',
      symptom: 'KM1 s’enclenche aux heures creuses, on l’entend coller, mais le chauffe-eau ne chauffe pas.',
      fix: 'Hors tension, contrôler la continuité entre la borne 2 de KM1 et la borne N de la sortie des câbles : OL. Reprendre le neutre.',
      coupe: 'f3.2>CE.X2',
      nets: { 'CE.X2': { live: 'off' } },
      action: 'Raccorder le neutre entre la borne 2 de KM1 et la sortie des câbles du chauffe-eau',
    },
  ],
  quiz: [
    { q: 'Quel appareil ferme le circuit de la bobine de KM1 pendant les heures creuses ?', options: ['Q7', 'Le contact 1-4 de l’horloge programmable', 'La manette de KM1', 'Le chauffe-eau'], answer: 1 },
    { q: 'Sur quelle position doit rester la manette de KM1 pour suivre l’horloge ?', options: ['I', 'AUTO', '0', 'Indifférent'], answer: 1 },
    { q: 'Que protège Q6 ?', options: ['Le câble du chauffe-eau', 'L’horloge programmable et la bobine de KM1', 'Les pôles de KM1', 'La barrette de terre'], answer: 1 },
    { q: 'Pourquoi le chauffe-eau passe-t-il par un contacteur plutôt que par le contact de l’horloge ?', options: ['Le contact de l’horloge n’est pas prévu pour couper durablement un chauffe-eau de plusieurs kilowatts', 'Pour économiser un disjoncteur', 'Parce que le chauffe-eau est en 24 V', 'Aucune raison'], answer: 0 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2'], ['f2.2', 'f2.N2']],
    explication:
      'Le départ du cumulus a deux protections en parallèle : Q7 (contacteur et chauffe-eau) et Q6 (horloge '
      + 'et bobine de KM1). On consigne sur Q7, et on ouvre Q6 avec lui : sinon la bobine de KM1 reste '
      + 'alimentée. Contrôle l’absence de tension en aval des deux.',
  },
};
