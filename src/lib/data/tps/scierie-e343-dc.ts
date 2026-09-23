/**
 * TP platine de service · sujet Scierie, partie E, question E.3.4.3 :
 * câblage côté DC des deux demi-strings sur l'onduleur Fronius SYMO 12.5-3-M.
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `scierie`
 * (`src/components/sujet/CablageReel.tsx`). `hidden` : absent du catalogue, jouable par la
 * route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ câblage (DTR 35, E.3.4.2)
 *  - deux strings de 15 modules BISOL BBO 510 en série, un par MPP Tracker ; le sujet les
 *    représente par deux demi-strings de TROIS modules : chaque module de la platine vaut
 *    donc 5 modules réels (5 × 35,8 V au point de puissance maximale en NOCT) ;
 *  - dans chaque demi-string, le − d'un module va au + du suivant ;
 *  - demi-string 1 : + → DC+1, − → DC− ; demi-string 2 : + → DC+2, − → DC−. Les six bornes
 *    DC− sont reliées en interne (DTR 35) : le corrigé prend DC−5 et DC−6 ;
 *  - MPP Tracker 2 sur ON à la mise en service (E.4.1) : chaque entrée suit son string.
 *  - côté AC (installateur) : réseau 3 × 400 V + N → Q1 (départ de l'onduleur) → Q2
 *    (interrupteur différentiel) → bornier AC de l'onduleur.
 *
 * Tensions (DTR 33, conditions NOCT) : Vmpp 35,8 V, Voc 43,6 V par module, soit 537 V au
 * point de puissance maximale et 654 V à vide par string de 15 — dans la plage MPP 320-800 V
 * et sous les 1 000 V admis par l'entrée (DTR 34).
 *
 * ------------------------------------------------------------ correspondance moteur
 *   · `q1` = Q1, disjoncteur 4P du départ de l'onduleur (organe de consignation côté AC) ;
 *   · `f2` = QDC, sectionneur DC intégré de l'onduleur : il sépare l'électronique, pas les
 *     bornes DC, qui restent sous la tension du champ tant qu'il fait jour ;
 *   · `f3` = Q2, interrupteur différentiel 4P entre Q1 et le bornier AC (aval `q1f3`).
 * Comme sur le TP Écobike, la tension d'un string se lit À VIDE au multimètre du parcours ;
 * l'essai du mode câblage réel affiche, lui, la tension MPP suivie par chaque tracker.
 */
import type { AnnexItem, Liaison, PrepQuestion, TerminalNet, TpDefinition } from '@/lib/types';
import { L, TEST_ISO, TEST_VAT } from './common';

const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

/** Modules réels représentés par un module de la platine (15 par string, 3 dessinés). */
export const MODULES_PAR_PANNEAU = 5;
/** Tension MPP et tension à vide d'un module BBO 510 en conditions NOCT (DTR 33). */
export const VMPP_NOCT = 35.8;
export const VOC_NOCT = 43.6;
/** Tension à vide d'un string de 15 modules. */
const VOC_STRING = Math.round(3 * MODULES_PAR_PANNEAU * VOC_NOCT);

/** Toiture : deux demi-strings de trois modules, en portrait, + en haut à gauche, − à droite. */
const ROOF: AnnexItem[] = [0, 1].flatMap(s => [0, 1, 2].map(i => ({
  key: 'pvmodule',
  rep: `PV${s * 3 + i + 1}`,
  name: `BISOL BBO 510 · demi-string ${s + 1} · représente ${MODULES_PAR_PANNEAU} modules`,
  x: 40 + s * 262 + i * 70,
  y: 84,
  w: 44,
  h: 84,
})));

/** Mise en série d'un demi-string : − d'un module → + du suivant. */
const serie = (premier: number): Liaison[] =>
  [0, 1].map(i => L(`PV${premier + i}.X2`, `PV${premier + i + 1}.X1`, 'DC-'));

const LIAISONS: Liaison[] = [
  // ---- côté AC (installateur) : réseau → Q1 → Q2 → bornier AC de l'onduleur ----
  PRE('RES.L1', 'q1.1', 'L1'), PRE('RES.L2', 'q1.3', 'L2'), PRE('RES.L3', 'q1.5', 'L3'), PRE('RES.N', 'q1.N', 'N'),
  PRE('q1.2', 'f3.1', 'L1'), PRE('q1.4', 'f3.3', 'L2'), PRE('q1.6', 'f3.5', 'L3'), PRE('q1.N2', 'f3.N', 'N'),
  PRE('f3.2', 'ond.L1', 'L1'), PRE('f3.4', 'ond.L2', 'L2'), PRE('f3.6', 'ond.L3', 'L3'), PRE('f3.N2', 'ond.N', 'N'),
  PRE('RES.PE', 'x1_pe.a', 'PE'), PRE('x1_pe.b', 'ond.PE', 'PE'),
  // ---- demi-string 1 : série, puis + → DC+1, − → DC− ----
  ...serie(1), L('PV1.X1', 'ond.DC+1-1', 'DC+'), L('PV3.X2', 'ond.DC-5', 'DC-'),
  // ---- demi-string 2 : série, puis + → DC+2, − → DC− ----
  ...serie(4), L('PV4.X1', 'ond.DC+2-1', 'DC+'), L('PV6.X2', 'ond.DC-6', 'DC-'),
];

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live'], u?: number) => {
    for (const id of ids) n[id] = { net, live, ...(u != null ? { u } : {}) };
  };
  // ---- champ : sous tension tant qu'il fait jour, quoi qu'on ouvre ----
  for (const p of [1, 4]) {
    set([`PV${p}.X1`], 'DC+', 'always', VOC_STRING);
    set([`PV${p}.X2`, `PV${p + 1}.X1`, `PV${p + 1}.X2`, `PV${p + 2}.X1`], 'DC-', 'always');
    set([`PV${p + 2}.X2`], 'DC-', 'always', VOC_STRING);
  }
  // ---- bornier DC de l'onduleur : en amont du sectionneur DC intégré ----
  set(['ond.DC+1-1', 'ond.DC+1-2', 'ond.DC+1-3', 'ond.DC+2-1', 'ond.DC+2-2', 'ond.DC+2-3'], 'DC+', 'always', VOC_STRING);
  set([1, 2, 3, 4, 5, 6].map(i => `ond.DC-${i}`), 'DC-', 'always', VOC_STRING);
  // ---- côté AC ----
  set(['q1.1'], 'L1', 'always'); set(['q1.3'], 'L2', 'always'); set(['q1.5'], 'L3', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2', 'f3.1'], 'L1', 'q1'); set(['q1.4', 'f3.3'], 'L2', 'q1'); set(['q1.6', 'f3.5'], 'L3', 'q1'); set(['q1.N2', 'f3.N'], 'N', 'q1');
  set(['f3.2', 'ond.L1'], 'L1', 'q1f3'); set(['f3.4', 'ond.L2'], 'L2', 'q1f3'); set(['f3.6', 'ond.L3'], 'L3', 'q1f3');
  set(['f3.N2', 'ond.N'], 'N', 'q1f3');
  set(['x1_pe.a', 'x1_pe.b', 'ond.PE'], 'PE', 'always');
  return n;
}

const DC1 = ['ond.DC+1-1', 'ond.DC+1-2', 'ond.DC+1-3'];
/** Pages du dossier (numérotation des pages, pas des documents). */
const PAGE = (f: string) => `/tp/scierie/${f}`;
/** Question de préparation : la bonne réponse est la première (l'ordre est mélangé à l'affichage). */
const Q = (id: string, rep: string, doc: string, invite: string, options: string[], why: string): PrepQuestion =>
  ({ id, rep, doc, invite, options, answer: 0, why });
const horsTension = (ids: string[]): Record<string, Partial<TerminalNet>> =>
  Object.fromEntries(ids.map(id => [id, { live: 'off' as const }]));

export const TP_SCIERIE_E343_DC: TpDefinition = {
  id: 'scierie-e343-dc',
  title: 'Scierie · Câblage DC des strings sur l’onduleur (câblage réel)',
  level: 'Bac Pro MELEC',
  family: 'pv',
  scene: 'pv',
  annex: 'roof',
  playable: true,
  hidden: true,
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  arriveeMono: false,
  summary:
    'Sujet Scierie, partie E : production photovoltaïque sur la toiture de l’extension. Deux strings '
    + 'de 15 modules BISOL BBO 510, représentés par deux demi-strings de trois modules, raccordés à '
    + 'l’onduleur Fronius SYMO 12.5-3-M : un string par MPP Tracker (DC+1, DC+2), les bornes DC− '
    + 'étant communes. Câbler le côté DC, mettre sous tension, vérifier que chaque tracker trouve son string.',
  situation:
    'Deux strings de 15 panneaux chacun sont connectés en parallèle en entrée de l’onduleur, chacun sur '
    + 'son entrée MPP Tracker. À partir du DTR 35, compléter le câblage côté DC : les deux demi-strings '
    + 'de 15 panneaux sont représentés par des demi-strings de trois panneaux, pour des raisons pratiques. '
    + 'Le côté AC de l’onduleur est déjà raccordé.',
  plaqueTitre: 'PRODUCTION PV · ONDULEUR FRONIUS SYMO',
  plaque: {
    'Modules': 'BISOL BBO 510 · NOCT : 386 W · Vmpp 35,8 V · Voc 43,6 V · Impp 10,78 A · Isc 11,27 A',
    'Strings': '2 × 15 modules en série : 537 V au point de puissance maximale, 654 V à vide (NOCT)',
    'Onduleur': 'Fronius SYMO 12.5-3-M · 2 MPP Trackers · plage MPP 320-800 V · 200-1 000 V⎓ · 43,5 A max',
    'Réglage': 'MPP Tracker 2 sur ON (deux entrées indépendantes)',
  },
  cahierDesCharges: [
    { k: 'Série', v: 'dans chaque demi-string, le − d’un module va au + du module suivant' },
    { k: 'Demi-string 1', v: '+ du premier module → DC+1 (bornes 1, 2 ou 3, reliées en interne) ; − du dernier → DC−' },
    { k: 'Demi-string 2', v: '+ du premier module → DC+2 ; − du dernier → DC−' },
    { k: 'Bornes DC−', v: 'six bornes reliées en interne, utilisables de manière quelconque : le corrigé prend DC−5 et DC−6' },
    { k: 'Tracker', v: 'MPP Tracker 2 sur ON à la première mise en service : chaque entrée suit son string (DTR 35, E.4.1)' },
    { k: 'Couleurs', v: 'rouge pour la polarité +, noir pour la polarité − et les liaisons série' },
    { k: 'Sécurité', v: 'les bornes DC restent sous la tension du champ tant qu’il fait jour : le sectionneur DC de l’onduleur ne sépare que son électronique' },
  ],
  libelles: {
    toiture: '① CHAMP PV · 2 demi-strings de 3 modules BISOL BBO 510 · 1 module dessiné = 5 modules réels',
    recv: 'Onduleur mural et tableau général : hors coffret',
    rangees: ['terre · sectionneur DC · Q1 départ onduleur · Q2 différentiel', 'onduleur Fronius SYMO 12.5-3-M · zone de raccordement DC / AC'],
  },
  schemaImage: {
    src: '/tp/scierie/q-e343-sujet.jpg',
    legende: 'E.3.4.3 · schéma de câblage côté DC (à compléter, page du sujet)',
    titre: 'E.3.4.3',
    suite: [
      { src: '/tp/scierie/dtr-42.jpg', legende: 'DTR 35 · câblage des strings PV', titre: 'DTR 35' },
    ],
  },
  // Les documents du dossier remplacent l'étude de dimensionnement embarquée de la scène PV
  // (celle du TP autonome), qui ne correspond pas à cette installation.
  preparation: {
    documents: [
      { id: 'e343', titre: 'E.3.4.3', src: PAGE('q-e343-sujet.jpg'), legende: 'E.3.4.3 · schéma de câblage côté DC à compléter (sujet)', enonce: true },
      { id: 'dtr35', titre: 'DTR 35', src: PAGE('dtr-42.jpg'), legende: 'DTR 35 · câblage des strings PV sur un onduleur Multi MPP Tracker' },
      { id: 'dtr33', titre: 'DTR 33', src: PAGE('dtr-38.jpg'), legende: 'DTR 33 · caractéristiques des panneaux solaires' },
      { id: 'dtr34', titre: 'DTR 34', src: PAGE('dtr-40.jpg'), legende: 'DTR 34 · caractéristiques de l’onduleur d’injection' },
    ],
    identification: [
      Q('id-dcm', 'Bornes DC−', 'dtr35', 'Combien de bornes DC− compte l’onduleur, et comment les utiliser ?', [
        'Six, reliées en interne : on peut utiliser n’importe laquelle',
        'Trois par tracker, à ne pas mélanger',
        'Une seule, commune aux deux strings',
        'Six, une par module du string',
      ], 'DTR 35 : « Les bornes DC− peuvent être utilisées de manière quelconque car elles sont reliées en interne. »'),
      Q('id-mpp', 'Plage MPP', 'dtr34', 'Quelle est la plage de tension MPP du SYMO 12.5-3-M ?', [
        '320 à 800 V', '200 à 1 000 V', '537 à 654 V', '150 à 800 V',
      ], '320-800 V est la plage où le tracker suit le point de puissance maximale ; 200-1 000 V est la plage de tension d’entrée admise.'),
    ],
    fonctions: [
      Q('fo-serie', 'String', 'dtr33', 'Tension MPP d’un string de 15 modules BBO 510 en série, en conditions NOCT ?', [
        '15 × 35,8 = 537 V', '15 × 43,6 = 654 V', '3 × 35,8 = 107,4 V', '30 × 35,8 = 1 074 V',
      ], 'En série, les tensions s’additionnent : 537 V au point de puissance maximale. 654 V est la tension à vide, à comparer aux 1 000 V admis.'),
      Q('fo-tracker', 'Tracker 2', 'dtr35', 'Deux strings indépendants, l’un sur DC+1, l’autre sur DC+2 : réglage du MPP Tracker 2 ?', [
        'ON : chaque entrée suit son propre string', 'OFF : les deux entrées sont réunies', 'Indifférent', 'OFF, puis ON après une heure',
      ], 'DTR 35 : en mode Multi MPP Tracker, on place MPP TRACKER 2 sur « ON » à la première mise en service (E.4.1).'),
    ],
  },
  postes: [
    {
      id: 'ond', name: 'Onduleur d’injection', need: '30 modules en 2 strings de 15 : 11,35 kW injectés, 537 V MPP par string, 2 entrées',
      options: [
        { key: 'symo125', ref: 'Fronius SYMO 12.5-3-M', spec: '12,5 kW · 2 MPP Trackers · MPP 320-800 V · 1 000 V⎓ max', ok: true, why: 'Il absorbe les 11,35 kW des 30 modules, ses deux trackers reçoivent les deux strings, 537 V est dans sa plage MPP.' },
        { key: 'symo125', ref: 'Fronius SYMO 10.0-3-M', spec: '10 kW', why: '10 kW de sortie pour 11,35 kW produits : il écrêterait la production.' },
        { key: 'symo125', ref: 'Fronius SYMO 15.0-3-M', spec: '15 kW', half: true, why: 'Il convient électriquement, mais il est surdimensionné pour un string de 30 modules.' },
      ],
    },
    {
      id: 'modules', name: 'Modules photovoltaïques', need: 'Modules du DTR 33, 15 par string',
      options: [
        { key: 'pvmodule', ref: 'BISOL BBO 510', spec: 'NOCT : 386 W · Vmpp 35,8 V · Voc 43,6 V', ok: true, why: 'Le module retenu par le bureau d’études (DTR 33) : 15 en série donnent 537 V MPP en NOCT.' },
        { key: 'pvmodule', ref: 'Module 12 V · 115 Wc', spec: 'Vmpp 19 V', why: '15 en série ne donneraient que 285 V, sous les 320 V de la plage MPP.' },
        { key: 'pvmodule', ref: 'Module 72 cellules · Voc 72 V', spec: 'Voc 72 V', why: '15 en série : 1 080 V à vide, au-delà des 1 000 V admis par l’entrée DC.' },
      ],
    },
    {
      id: 'ac', name: 'Q1 et Q2 · Départ AC de l’onduleur', need: 'Triphasé 3 × 400 V + N, 18,1 A par phase',
      options: [
        { key: 'mcb4p', ref: 'Disjoncteur 4P C32 + interrupteur différentiel 4P 40 A', spec: '3 phases + neutre', ok: true, why: 'Coupe les trois phases et le neutre, calibre au-dessus du courant de sortie de l’onduleur.' },
        { key: 'mcb4p', ref: 'Disjoncteur 1P+N C32', spec: 'monophasé', why: 'L’onduleur est triphasé : deux phases resteraient sans protection ni coupure.' },
        { key: 'rcd4p', ref: 'Interrupteur différentiel 4P 40 A seul', spec: 'sans protection contre les surintensités', why: 'Un interrupteur différentiel ne protège pas contre les surcharges et les courts-circuits.' },
      ],
    },
  ],
  // Coffret sous la toiture. Rail 0 : borne de terre, sectionneur DC, Q1 et Q2 à DROITE ;
  // rail 1 : zone de raccordement de l'onduleur (bornier DC à gauche, AC à droite). Les deux
  // demi-strings et l'arrivée du réseau descendent par le DESSUS du coffret : leurs conducteurs
  // tombent droit sur leurs bornes sans croiser d'appareil. Pas de goulotte de pied.
  rails: [360, 600],
  armoire: 760,
  gaines: [
    { id: 'g1', rep: 'G1', x: 290, diam: 25, nature: 'force', cote: 'haut', contenu: '5 conducteurs 6 mm² · L1 L2 L3 N PE', vers: 'tableau général (réseau)', dessert: ['RES.'] },
    { id: 'g2', rep: 'G2', x: 88, diam: 25, nature: 'force', cote: 'haut', contenu: '2 câbles solaires 6 mm² · + rouge, − noir', vers: 'demi-string 1', dessert: ['PV1.X1', 'PV3.X2'] },
    { id: 'g3', rep: 'G3', x: 150, diam: 25, nature: 'force', cote: 'haut', contenu: '2 câbles solaires 6 mm² · + rouge, − noir', vers: 'demi-string 2', dessert: ['PV4.X1', 'PV6.X2'] },
  ],
  goulotteDePied: false,
  slots: [
    { id: 'x1_pe', label: 'X1:PE · borne de terre (masse de l’onduleur)', key: 'earth', rail: 0, x: 232, mark: 'PE', sub: 'PE', group: 'X1', groupLabel: 'X1 · terre' },
    { id: 'f2', label: 'QDC · Sectionneur DC intégré de l’onduleur (poignée DC ON / OFF)', key: 'symodc', rail: 0, x: 256, rep: 'QDC' },
    { id: 'q1', label: 'Q1 · Disjoncteur 4P · départ de l’onduleur (consignation AC)', key: 'mcb4p', rail: 0, x: 336, rep: 'Q1' },
    { id: 'f3', label: 'Q2 · Interrupteur différentiel 4P 40 A · côté AC de l’onduleur', key: 'rcd4p', rail: 0, x: 446, rep: 'Q2' },
    { id: 'ond', label: 'Onduleur Fronius SYMO 12.5-3-M · bornier DC (DC+1, DC+2, DC−) et AC', key: 'symo125', rail: 1, x: 44, rep: 'OND1', dy: 16 },
  ],
  annexItems: ROOF,
  recvItems: [],
  liaisons: LIAISONS,
  nets: nets(),
  tests: [
    TEST_VAT,
    {
      id: 'polarite',
      title: 'Polarité des demi-strings avant raccordement',
      how: 'Multimètre en V⎓, pointe rouge sur le + : aux extrémités de chaque demi-string, avant de le raccorder au bornier DC.',
      expected: 'tension positive, environ 654 V à vide (NOCT) : jamais une valeur négative',
    },
    TEST_ISO,
  ],
  mesures: [
    { id: 'voc1', title: 'Tension à vide du string 1 au bornier (DC+1 – DC−)', stage: 'horsTension', instrument: 'mm', dial: 'V⎓', a: 'ond.DC+1-1', b: 'ond.DC-5', min: 630, max: 680, unit: 'V' },
    { id: 'voc2', title: 'Tension à vide du string 2 au bornier (DC+2 – DC−)', stage: 'horsTension', instrument: 'mm', dial: 'V⎓', a: 'ond.DC+2-1', b: 'ond.DC-6', min: 630, max: 680, unit: 'V' },
    { id: 'uacLN', title: 'Tension simple au bornier AC de l’onduleur (L1 – N)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'ond.L1', b: 'ond.N', min: 220, max: 240, unit: 'V', when: 'ctl' },
    { id: 'uacLL', title: 'Tension composée au bornier AC de l’onduleur (L1 – L2)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'ond.L1', b: 'ond.L2', min: 380, max: 420, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'serie1', title: 'Liaison série ouverte dans le demi-string 1',
      symptom: 'L’onduleur ne voit rien sur le Tracker 1 : 0 V sur DC+1, alors que le Tracker 2 affiche son string.',
      fix: 'Au multimètre V⎓, 0 V entre DC+1 et DC− ; hors tension de champ (modules masqués), contrôler la continuité de la série module par module et reconnecter le connecteur ouvert.',
      coupe: 'PV2.X2>PV3.X1',
      nets: horsTension(['PV1.X1', ...DC1]),
      action: 'Reconnecter la liaison série entre les deux derniers modules du demi-string 1',
    },
    {
      id: 'plus1', title: 'Câble + du demi-string 1 non raccordé sur DC+1',
      symptom: 'Tracker 1 à 0 V ; le demi-string 1 donne pourtant ses 654 V à vide entre ses extrémités.',
      fix: 'Mesurer la tension à l’extrémité du demi-string puis au bornier : le câble + n’arrive pas sur DC+1. Le raccorder.',
      coupe: 'PV1.X1>ond.DC+1-1',
      nets: horsTension(DC1),
      action: 'Raccorder le câble + du demi-string 1 sur une borne DC+1',
    },
    {
      id: 'pol2', title: 'Polarité inversée sur le demi-string 2',
      symptom: 'L’onduleur signale une erreur d’isolement / de polarité sur l’entrée DC+2 et le Tracker 2 ne démarre pas.',
      fix: 'Au multimètre V⎓, pointe rouge sur DC+2 : la tension lue est NÉGATIVE. Couper le sectionneur DC, puis remettre le + du demi-string sur DC+2 et le − sur DC−.',
      croise: ['PV4.X1>ond.DC+2-1', 'PV6.X2>ond.DC-6'],
      action: 'Remettre le + du demi-string 2 sur DC+2 et son − sur DC−',
    },
  ],
  quiz: [
    { q: 'Pourquoi le − d’un module est-il relié au + du suivant ?', options: ['Pour mettre les modules en série et additionner leurs tensions', 'Pour les mettre en parallèle', 'Pour relier les cadres à la terre', 'Pour inverser la polarité'], answer: 0 },
    { q: 'Sur quelle borne raccorder le − du demi-string 2 ?', options: ['Obligatoirement DC−6', 'Sur n’importe quelle borne DC− : elles sont reliées en interne', 'Sur DC+2', 'Sur la borne PE'], answer: 1 },
    { q: 'Un string de 15 modules BBO 510 donne 537 V (NOCT). Convient-il au SYMO 12.5-3-M ?', options: ['Oui : 537 V est dans la plage MPP 320-800 V', 'Non : il faut plus de 800 V', 'Non : il faut moins de 320 V', 'Seulement avec le Tracker 2 sur OFF'], answer: 0 },
    { q: 'Deux strings indépendants, un sur DC+1, l’autre sur DC+2 : quel réglage du Tracker 2 ?', options: ['OFF', 'ON', 'Indifférent', 'Il n’existe pas sur cet onduleur'], answer: 1 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['ond.DC+1-1', 'ond.DC-5'],
    avalPairs: [['ond.L1', 'ond.N'], ['ond.L1', 'ond.L2'], ['ond.L2', 'ond.L3']],
    explication:
      'Côté AC, on consigne sur Q1 et on contrôle l’absence de tension au bornier AC de l’onduleur. '
      + 'Côté DC, le champ reste une source tant qu’il fait jour : le sectionneur DC ne sépare que '
      + 'l’électronique de l’onduleur, les bornes DC restent sous 654 V. On le constate au VAT sur DC+1 / DC−.',
  },
};
