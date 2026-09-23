/**
 * TP platine de service · sujet Scierie, partie D, question D.3.1 :
 * commande à deux vitesses présélectionnées de la turbine d'aspiration (ATV340).
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `scierie`
 * (`src/components/sujet/CablageReel.tsx`) : le bornier de commande du variateur du sujet,
 * avec les deux sélecteurs S1 (marche avant) et S2 (position 1 = PV, position 2 = GV).
 * `hidden` : absent du catalogue, jouable par la route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ câblage (corrigé D.3.1)
 *  - la puissance est posée par l'installateur : réseau 400 V → Q1 → Q2 → R/L1 S/L2 T/L3
 *    de l'ATV340D37N4E (D.2.1, calibre HD) ; U/T1 V/T2 W/T3 → moteur de la turbine couplé en
 *    TRIANGLE (plaque 400 / 690 V, D.2.2) ; ponts STOA – STOB – 24V posés en usine ;
 *  - l'élève câble le bornier de commande : le +24 V interne (borne 24V) alimente S1 et S2 ;
 *    S1 (contact 13-14, fermé sur I) → DI1 (marche avant) ; S2 position 1 (contact 21-22)
 *    → DI3 (vitesse présélectionnée 2 = PV) ; S2 position 2 (contact 13-14) → DI4 (vitesse
 *    présélectionnée 4 = GV). Les communs 21 et 13 de S2 sont pontés (pont d'usine du
 *    sélecteur, posé par l'installateur) : S2 se comporte comme un inverseur à 2 positions.
 *  - réglages (D.3.2, D.3.3) : vitesse présélectionnée 2 = 33,3 Hz (1 000 tr/min, moteur
 *    4 pôles), vitesse présélectionnée 4 = 50 Hz (1 500 tr/min).
 *
 * ------------------------------------------------------------ correspondance moteur
 *   · `q1` = Q1, interrupteur-sectionneur INS80 cadenassable (organe de consignation) ;
 *   · `f2` = Q2, disjoncteur NSX100 de la ligne du variateur : aval `f2` = variateur
 *     alimenté, son 24 V interne présent ;
 *   · `f3` = S1, sélecteur de marche avant : fermé (I), la marche avant est donnée à DI1 —
 *     c'est lui qu'on « referme » en dernier à la mise en service. Aval `f3` = DI1.
 *   · S2 (`s2`) n'est pas un organe du moteur : il reste en position 1 (PV) dans le parcours
 *     standard ; l'essai PV / GV se fait dans le mode câblage réel du sujet.
 * Le 24 V du variateur est une tension CONTINUE interne : ses bornes sont déclarées `DC+` /
 * `DC-` avec leur tension (24 V), le multimètre la lit en V⎓ avec son signe.
 */
import type { Liaison, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

/** Tension de la sortie +24 V interne du variateur (borne 24V / 0V). */
const U24 = 24;

const LIAISONS: Liaison[] = [
  // ---- puissance (installateur) : réseau → Q1 → Q2 → variateur → moteur en triangle ----
  PRE('RES.L1', 'q1.1', 'L1'), PRE('RES.L2', 'q1.3', 'L2'), PRE('RES.L3', 'q1.5', 'L3'),
  PRE('q1.2', 'f2.1', 'L1'), PRE('q1.4', 'f2.3', 'L2'), PRE('q1.6', 'f2.5', 'L3'),
  PRE('f2.2', 'u1.R/L1', 'L1'), PRE('f2.4', 'u1.S/L2', 'L2'), PRE('f2.6', 'u1.T/L3', 'L3'),
  PRE('RES.PE', 'u1.PE', 'PE'),
  PRE('u1.U/T1', 'M.U1', 'L1'), PRE('u1.V/T2', 'M.V1', 'L2'), PRE('u1.W/T3', 'M.W1', 'L3'),
  PRE('u1.PE/M', 'M.PE', 'PE'),
  // couplage TRIANGLE sur 400 V (plaque 400 / 690 V, D.2.2)
  PRE('M.W2', 'M.U1', 'BAR'), PRE('M.U2', 'M.V1', 'BAR'), PRE('M.V2', 'M.W1', 'BAR'),
  // pont des communs de S2 (21 – 13) : S2 devient un inverseur à deux positions
  PRE('s2.21', 's2.13', 'DC+'),
  // ---- bornier de commande (élève), corrigé D.3.1 ----
  L('u1.24V', 'f3.13', 'DC+'), L('f3.14', 'u1.DI1', 'DC+'),
  L('u1.24V', 's2.21', 'DC+'), L('s2.22', 'u1.DI3', 'DC+'), L('s2.14', 'u1.DI4', 'DC+'),
];

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live'], u?: number) => {
    for (const id of ids) n[id] = { net, live, ...(u != null ? { u } : {}) };
  };
  // Q1 (`q1`) puis Q2 (`f2`)
  set(['q1.1'], 'L1', 'always'); set(['q1.3'], 'L2', 'always'); set(['q1.5'], 'L3', 'always');
  set(['q1.2', 'f2.1'], 'L1', 'q1'); set(['q1.4', 'f2.3'], 'L2', 'q1'); set(['q1.6', 'f2.5'], 'L3', 'q1');
  set(['f2.2', 'u1.R/L1'], 'L1', 'f2'); set(['f2.4', 'u1.S/L2'], 'L2', 'f2'); set(['f2.6', 'u1.T/L3'], 'L3', 'f2');
  set(['u1.PE', 'u1.PE/M', 'M.PE'], 'PE', 'always');
  // sortie moteur : présente quand le variateur reçoit la marche avant (S1 sur I)
  set(['u1.U/T1', 'M.U1', 'M.W2'], 'U', 'f3'); set(['u1.V/T2', 'M.V1', 'M.U2'], 'V', 'f3');
  set(['u1.W/T3', 'M.W1', 'M.V2'], 'W', 'f3');
  // 24 V interne du variateur : présent dès que Q1 et Q2 sont fermés
  set(['u1.24V', 'f3.13', 's2.21', 's2.13'], 'DC+', 'f2', U24);
  set(['u1.0V'], 'DC-', 'f2', U24);
  // S1 sur I → DI1 (marche avant)
  set(['f3.14', 'u1.DI1'], 'DC+', 'f3', U24);
  // S2 : position 1 (repos du parcours standard) → DI3 ; position 2 → DI4
  set(['s2.22', 'u1.DI3'], 'DC+', 'f2', U24);
  set(['s2.14', 'u1.DI4'], 'DC+', 'off', U24);
  return n;
}

export const TP_SCIERIE_D31_ATV340: TpDefinition = {
  id: 'scierie-d31-atv340',
  title: 'Scierie · Commande PV / GV de la turbine d’aspiration (câblage réel)',
  level: 'Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  hidden: true,
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  summary:
    'Sujet Scierie, partie D : aspiration du nouvel atelier d’usinage. La turbine (moteur 37 kW, '
    + 'couplé en triangle) est pilotée par un variateur Altivar ATV340D37N4E. Deux sélecteurs : S1 '
    + 'pour la marche avant (DI1), S2 pour choisir la petite vitesse (position 1, DI3, vitesse '
    + 'présélectionnée 2) ou la grande vitesse (position 2, DI4, vitesse présélectionnée 4). '
    + 'Câbler le bornier de commande, mettre sous tension, essayer les deux vitesses.',
  situation:
    'Afin de réduire la consommation, la scierie SYLVA demande de gérer deux vitesses d’aspiration : '
    + 'la petite vitesse PV lorsqu’une seule machine fonctionne, la grande vitesse GV lorsque les deux '
    + 'machines fonctionnent. La puissance est déjà raccordée (variateur et moteur de la turbine). '
    + 'Compléter le câblage du bornier de commande en intégrant les deux sélecteurs : S1 pour la '
    + 'marche avant, S2 à deux positions (position 1 = PV, position 2 = GV), avec la marche avant sur '
    + 'DI1, la vitesse présélectionnée 2 (PV) sur DI3 et la vitesse présélectionnée 4 (GV) sur DI4.',
  plaqueTitre: 'ASPIRATION · VARIATEUR ATV340',
  plaque: {
    'Variateur': 'Altivar Machine ATV340D37N4E · 37 kW en service intensif (HD) · 380-480 V triphasé · 67,1 A en ligne',
    'Moteur de la turbine': '37 kW · 4 pôles · 1 475 tr/min · 400 / 690 V : couplage triangle sur le réseau 400 V',
    'Vitesses': 'présélectionnée 2 = 33,3 Hz (PV, 1 000 tr/min) · présélectionnée 4 = 50 Hz (GV, 1 500 tr/min)',
    'Sélecteurs': 'S1 Harmony XB5AD21 (0 / I, contact 13-14) · S2 Harmony XB5AD25 (1 / 2, contacts 21-22 et 13-14)',
  },
  cahierDesCharges: [
    { k: 'Puissance', v: 'posée par l’installateur : Q1 (interrupteur-sectionneur INS80) → Q2 (disjoncteur NSX100) → R/L1 S/L2 T/L3 en haut du variateur ; U/T1 V/T2 W/T3 en bas → moteur couplé en triangle' },
    { k: 'Alimentation des sélecteurs', v: 'sortie +24 V⎓ interne du variateur : borne 24V du bornier de commande (commun 0V)' },
    { k: 'S1 · marche avant', v: 'sélecteur 2 positions 0 / I, contact 13-14 fermé sur I : 24V → S1 → DI1' },
    { k: 'S2 · vitesse', v: 'sélecteur 2 positions, contacts 21-22 (fermé en position 1) et 13-14 (fermé en position 2), communs 21 et 13 pontés : 24V → S2 ; 22 → DI3 (PV) ; 14 → DI4 (GV)' },
    { k: 'Réglages', v: 'vitesse présélectionnée 2 = 33,3 Hz · vitesse présélectionnée 4 = 50 Hz (modifiables directement sur le variateur)' },
    { k: 'STO', v: 'ponts d’usine STOA – STOB – 24V en place (fonction de sécurité non utilisée ici)' },
    { k: 'Couleurs', v: 'commande 24 V⎓ : conducteurs de commande repérés, le schéma du sujet les trace en rouge' },
  ],
  libelles: {
    recv: 'Turbine d’aspiration · moteur 37 kW couplé en triangle (hors armoire)',
    rangees: ['goulotte haute · arrivée', 'goulotte Q1 → Q2', 'goulotte Q2 → variateur', 'goulotte sous le variateur · commande et moteur'],
  },
  schemaImage: {
    src: '/tp/scierie/q-d31-corrige.jpg',
    legende: 'D.3.1 · schéma de câblage du bornier de commande (corrigé)',
    titre: 'D.3.1',
    suite: [
      { src: '/tp/scierie/dtr-29.jpg', legende: 'DTR 28 · variateur Altivar ATV340 (page 1)', titre: 'DTR 28' },
    ],
  },
  postes: [
    {
      id: 'u1', name: 'U1 · Variateur de la turbine', need: 'Moteur 37 kW, forte surcharge au démarrage de la turbine (D.2.1)',
      options: [
        { key: 'atv340', ref: 'ATV340D37N4E', spec: '37 kW en service intensif (HD) · 380-480 V triphasé', ok: true, why: 'La turbine impose une forte surcharge au démarrage : on choisit le variateur sur son calibre HD, 37 kW comme le moteur.' },
        { key: 'atv340', ref: 'ATV340D30N4E', spec: '30 kW en service intensif (HD) · 37 kW en service normal (ND)', why: '37 kW seulement en service normal : sous la surcharge de démarrage de la turbine, c’est le calibre HD qui compte, et il est trop faible.' },
        { key: 'atv340', ref: 'ATV340D45N4E', spec: '45 kW en service intensif (HD)', half: true, why: 'Il conviendrait électriquement, mais il est surdimensionné : le calibre HD de 37 kW suffit.' },
      ],
    },
    {
      id: 's1', name: 'S1 · Marche avant', need: 'Donner un ordre de marche MAINTENU sur DI1 (commande 2 fils)',
      options: [
        { key: 'xb5ad21', ref: 'Harmony XB5AD21', spec: 'sélecteur 2 positions fixes · 1 F (13-14)', ok: true, why: 'Un sélecteur à positions fixes garde la marche tant qu’il est sur I : c’est la commande 2 fils des entrées DI.' },
        { key: 'xb5ad21', ref: 'Harmony XB5AA31', spec: 'bouton-poussoir à impulsion · 1 F', why: 'Une impulsion ne maintient pas DI1 : en commande 2 fils la turbine s’arrêterait au relâchement.' },
        { key: 'xb5ad21', ref: 'Harmony XB5AS8442', spec: 'arrêt d’urgence · 1 O', why: 'C’est un organe d’arrêt, à ouverture, pas un ordre de marche.' },
      ],
    },
    {
      id: 's2', name: 'S2 · Choix PV / GV', need: 'Deux positions fixes : position 1 → DI3 (PV), position 2 → DI4 (GV)',
      options: [
        { key: 'xb5ad25', ref: 'Harmony XB5AD25', spec: 'sélecteur 2 positions fixes · 1 O (21-22) + 1 F (13-14)', ok: true, why: 'Le contact 21-22 est fermé en position 1, le 13-14 en position 2 : communs pontés, il aiguille le 24 V vers DI3 ou vers DI4.' },
        { key: 'xb5ad21', ref: 'Harmony XB5AD21', spec: 'sélecteur 2 positions · 1 F seulement', why: 'Un seul contact : il ne peut alimenter qu’une des deux entrées de vitesse.' },
        { key: 'xb5ad25', ref: 'Harmony XB5AD35', spec: 'sélecteur 3 positions fixes', half: true, why: 'Il fonctionnerait, mais sa position centrale n’a pas de sens ici : le sujet demande deux positions.' },
      ],
    },
    {
      id: 'q12', name: 'Q1 et Q2 · Sectionnement et protection', need: '67,1 A en ligne sous 380 V (ATV340D37N4E)',
      options: [
        { key: 'nsx100', ref: 'INS80 3P + NSX100F TM80D 3P', spec: 'interrupteur-sectionneur cadenassable 80 A + disjoncteur 80 A', ok: true, why: 'Le sectionnement cadenassable pour la consignation, puis la protection de la ligne du variateur au-dessus de ses 67 A.' },
        { key: 'nsx100', ref: 'INS80 3P + disjoncteur moteur GV2ME32', spec: 'disjoncteur moteur 24-32 A', why: '32 A au plus : il déclencherait sous le courant de ligne du variateur (67 A).' },
        { key: 'ins80', ref: 'INS80 3P seul', spec: 'sans protection', why: 'Un interrupteur-sectionneur sectionne mais ne protège pas contre les courts-circuits.' },
      ],
    },
  ],
  // Montage de haut en bas, comme le courant : Q1 (rail 0) → Q2 (rail 1) → variateur (rail 2 :
  // arrivée réseau en haut, départ moteur et bornier de commande en bas) → goulotte du rail 3,
  // d'où partent le câble du moteur et les fils des sélecteurs. Le variateur fait 309 × 957 px
  // à l'échelle (213 × 660 mm) : il se pose sous son rail, décalé vers le bas, et l'armoire est
  // relevée à 1 620 px. Pas de goulotte de pied au-delà du rail 3.
  rails: [150, 330, 596, 1586],
  armoire: 1620,
  // L'arrivée descend du tableau par le DESSUS du coffret (Q1 est en haut) ; le câble du moteur
  // sort par le dessous, à l'aplomb des bornes U/T1 V/T2 W/T3.
  gaines: [
    { id: 'g1', rep: 'G1', x: 70, diam: 32, nature: 'force', cote: 'haut', contenu: '4 conducteurs 16 mm² · L1 L2 L3 PE', vers: 'tableau général · départ aspiration', dessert: ['RES.'] },
    { id: 'g2', rep: 'G2', x: 236, diam: 40, nature: 'force', contenu: '1 câble 4G16 blindé · U V W PE', vers: 'moteur de la turbine d’aspiration', dessert: ['M.'] },
  ],
  goulotteDePied: false,
  slots: [
    { id: 'q1', label: 'Q1 · Interrupteur-sectionneur INS80 3P · cadenassable (consignation)', key: 'ins80', rail: 0, x: 150, rep: 'Q1' },
    { id: 'f2', label: 'Q2 · Disjoncteur NSX100F TM80D · ligne du variateur', key: 'nsx100', rail: 1, x: 140, rep: 'Q2', dy: 30 },
    { id: 'u1', label: 'U1 · Variateur Altivar Machine ATV340D37N4E', key: 'atv340', rail: 2, x: 62, rep: 'U1', dy: 391 },
    // sélecteurs en façade (colonne de la porte)
    { id: 'f3', label: 'S1 · Sélecteur marche avant 0 / I · XB5AD21', key: 'xb5ad21', rail: null, x: 470, y: 520, rep: 'S1' },
    { id: 's2', label: 'S2 · Sélecteur de vitesse 1 (PV) / 2 (GV) · XB5AD25', key: 'xb5ad25', rail: null, x: 470, y: 604, rep: 'S2' },
  ],
  annexItems: [],
  recvItems: [],
  liaisons: LIAISONS,
  nets: nets(),
  tests: [
    ...BASE_TESTS,
    {
      id: 'bus',
      title: 'Décharge du bus continu du variateur',
      how: 'Après ouverture de Q1, attendre 15 minutes, puis mesurer en V⎓ entre PA/+ et PC/− : jamais de court-circuit pour « décharger plus vite ».',
      expected: 'moins de 42 V continus avant toute intervention',
    },
  ],
  mesures: [
    { id: 'c24', title: 'Continuité du 24 V jusqu’à S1 (24V → S1:13)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'u1.24V', b: 'f3.13', min: 0, max: 2, unit: 'Ω' },
    { id: 'cDI3', title: 'Continuité S2:22 → DI3', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 's2.22', b: 'u1.DI3', min: 0, max: 2, unit: 'Ω' },
    { id: 'u24', title: 'Sortie +24 V interne du variateur (24V – 0V)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'u1.24V', b: 'u1.0V', min: 22, max: 26, unit: 'V', when: 'ctl' },
    { id: 'uDI1', title: 'Marche avant : tension de DI1, S1 sur I (DI1 – 0V)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'u1.DI1', b: 'u1.0V', min: 22, max: 26, unit: 'V', when: 'ctl' },
    { id: 'uDI3', title: 'Petite vitesse : tension de DI3, S2 en position 1 (DI3 – 0V)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'u1.DI3', b: 'u1.0V', min: 22, max: 26, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'di1', title: 'Fil S1:14 → DI1 débranché',
      symptom: 'S1 est sur I, l’afficheur du variateur reste sur « prêt » : la turbine ne démarre ni en PV ni en GV.',
      fix: 'Mesurer 24 V⎓ entre S1:14 et 0V, puis 0 V entre DI1 et 0V : le conducteur S1:14 → DI1 est coupé. Le resserrer.',
      coupe: 'f3.14>u1.DI1',
      nets: { 'u1.DI1': { live: 'off' } },
      action: 'Reconnecter le conducteur de S1:14 sur l’entrée DI1',
    },
    {
      id: 'di4', title: 'Fil S2:14 → DI4 débranché',
      symptom: 'En position 1, la turbine tourne bien en petite vitesse ; en position 2 elle ralentit jusqu’à l’arrêt au lieu de passer en grande vitesse.',
      fix: 'Hors tension, contrôler la continuité entre S2:14 et DI4 : OL. Reprendre le conducteur.',
      coupe: 's2.14>u1.DI4',
      action: 'Reconnecter le conducteur de S2:14 sur l’entrée DI4',
    },
    {
      id: 'c24', title: 'Fil 24V → S1:13 débranché',
      symptom: 'Plus aucun ordre de marche : S1 sur I, la turbine reste arrêtée, alors que le variateur est sous tension.',
      fix: 'Mesurer 24 V⎓ entre 24V et 0V, puis 0 V entre S1:13 et 0V : le conducteur 24V → S1:13 est coupé.',
      coupe: 'u1.24V>f3.13',
      nets: { 'f3.13': { live: 'off' }, 'f3.14': { live: 'off' }, 'u1.DI1': { live: 'off' } },
      action: 'Reconnecter le conducteur de la borne 24V du variateur sur S1:13',
    },
  ],
  quiz: [
    { q: 'D’où vient le 24 V qui alimente S1 et S2 ?', options: ['D’un transformateur de commande extérieur', 'De la sortie +24 V interne du variateur (borne 24V)', 'Du réseau 400 V', 'De l’entrée analogique AI1'], answer: 1 },
    { q: 'S1 est sur I et S2 en position 1 : quelle fréquence le variateur donne-t-il au moteur ?', options: ['50 Hz', '33,3 Hz (vitesse présélectionnée 2)', '0 Hz', '25 Hz'], answer: 1 },
    { q: 'Le moteur a 4 pôles. Quelle fréquence pour 1 000 tr/min ?', options: ['16,7 Hz', '33,3 Hz', '50 Hz', '66,7 Hz'], answer: 1 },
    { q: 'Pourquoi le moteur de la turbine est-il couplé en triangle ?', options: ['Sa plaque est 400 / 690 V : sur un réseau 400 V, chaque enroulement doit recevoir 400 V', 'Pour démarrer en étoile-triangle', 'Parce que le variateur l’impose toujours', 'Pour réduire la vitesse'], answer: 0 },
  ],
  // Plaque 400 / 690 V (DTR 27) : la tension ÉTOILE est celle qu'affiche l'étiquette du moteur
  // (« 690 V Y »), d'où le triangle sur 400 V. In et cos φ ne figurent pas au dossier : ordres
  // de grandeur d'un moteur 37 kW IE3 4 pôles sous 690 V, qui ne servent qu'à la résistance
  // d'enroulement simulée (aucune mesure de courant n'est demandée dans ce TP).
  motor: { P: 37000, U: 690, In: 39, n: 1475, ns: 1500, cosPhi: 0.86 },
  station: false,
  hasMotor: true,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.L2'],
    avalPairs: [['u1.R/L1', 'u1.S/L2'], ['u1.S/L2', 'u1.T/L3'], ['u1.R/L1', 'u1.T/L3']],
    explication:
      'On consigne sur Q1 (interrupteur-sectionneur cadenassable). Avant d’ouvrir le variateur, attendre '
      + 'la décharge du bus continu (15 minutes) puis contrôler l’absence de tension sur ses bornes d’entrée.',
  },
};
