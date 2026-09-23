/**
 * TP platine de service · sujet « Chèvrerie », partie E, question E.2.2.2 :
 * schéma de raccordement de l'installation éolienne, de l'éolienne jusqu'au tableau AC.
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `chevrerie`
 * (`src/components/sujet/CablageReel.tsx`). `hidden` : absent du catalogue, jouable par la
 * route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ câblage (corrigé, pages 31 et 32)
 *  - côté gestion éolienne : les trois conducteurs de l'éolienne (sortie de l'interrupteur de
 *    freinage) → L1 L2 L3 « Alternator » de la WBP-Box ; DC+ et DC− de la WBP-Box → entrées
 *    DC + et − des trois onduleurs Windy Boy (une borne des blocs DC+ / DC− par onduleur,
 *    reliées en interne) ; LR+ / LR− → + / − de la résistance de charge, PE de la résistance
 *    → PE de la WBP-Box ;
 *  - côté AC : sortie de Q3 (N L1 L2 L3) → répartiteur → parafoudre (N L1 L2 L3) et arrivée
 *    haute des disjoncteurs différentiels : Od1 sur N + L1, Od2 sur N + L2, Od3 sur N + L3
 *    (un onduleur monophasé par phase) ; sortie basse de chaque Od → N et L du câble 3G6 de son
 *    onduleur ; PE des trois câbles 3G6 et borne de terre du parafoudre → barrette de terre.
 *  - pré-tracé au sujet (installateur) : câble 5G16 venant du TGBT en amont de Q3 et sur la
 *    barrette de terre.
 * Couleurs notées au sujet : DC+ rouge, neutre bleu, PE vert-jaune ; libres pour les
 * conducteurs de l'éolienne, le DC− et les phases.
 *
 * ------------------------------------------------------------ grandeurs (DTR 28 à 30)
 * Alternateur 350 V~ nominal ; démarrage à 2,8 m/s ; redressé par le pont B6 de la WBP-Box :
 * U DC ≈ 1,35 × U~. La WBP-Box 600 limite la tension DC à 560 V en commutant la résistance de
 * charge (DTR 29 § 3.1) ; sans résistance, rien ne limite la surtension. Windy Boy 5000A :
 * « mode turbine » de 250 à 600 V, tension à vide minimale d'activation 300 V, 600 V DC max,
 * injection monophasée 230 V (26 A max). Le câblage se fait éolienne FREINÉE (interrupteur de
 * court-circuit fermé) : les conducteurs de l'éolienne et le bus DC sont hors tension
 * (`live: 'off'`) et se contrôlent à l'ohmmètre ; l'essai du vent se fait dans le modèle du
 * mode câblage réel (`CablageReelModeles.ts`, `E222`).
 *
 * ------------------------------------------------------------ correspondance moteur
 *   · `q1` = Q3, interrupteur-sectionneur 4P de tête du tableau AC (consignation) ;
 *   · `f2` = Od1, disjoncteur différentiel de l'onduleur 1 (aval `f2` = aval de Q3 ET Od1) ;
 *   · `f3` = Od2, en parallèle d'Od1 sous le répartiteur (aval `q1f3`) ;
 *   · `dd3` = Od3, organe de sectionnement supplémentaire (`sectionneurs`, aval `q1&aux:dd3`).
 */
import type { Liaison, TerminalNet, TpDefinition } from '@/lib/types';
import { L, TEST_ISO, TEST_PE, TEST_VAT, TEST_VISU } from './common';

const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

/** Onduleurs et leur disjoncteur différentiel, dans l'ordre du corrigé (Od k sur la phase Lk). */
const ONDULEURS = [
  { od: 'od1', dd: 'f2', phase: 'L1' as const, wbp: '1' },
  { od: 'od2', dd: 'f3', phase: 'L2' as const, wbp: '2' },
  { od: 'od3', dd: 'dd3', phase: 'L3' as const, wbp: '3' },
];

const LIAISONS: Liaison[] = [
  // ---- câble 5G16 du TGBT (imprimé au sujet : installateur) ----
  PRE('RES.N', 'q1.N', 'N'), PRE('RES.L1', 'q1.1', 'L1'), PRE('RES.L2', 'q1.3', 'L2'), PRE('RES.L3', 'q1.5', 'L3'),
  PRE('RES.PE', 'bt.PE', 'PE'),
  // ---- éolienne → WBP-Box (entrée « Alternator ») ----
  L('eol.L1', 'wbp.L1', 'L1'), L('eol.L2', 'wbp.L2', 'L2'), L('eol.L3', 'wbp.L3', 'L3'),
  // ---- bus DC : WBP-Box → entrées DC des trois onduleurs ----
  ...ONDULEURS.map(o => L(`wbp.DC+${o.wbp}`, `${o.od}.DC+`, 'DC+')),
  ...ONDULEURS.map(o => L(`wbp.DC-${o.wbp}`, `${o.od}.DC-`, 'DC-')),
  // ---- résistance de charge ----
  L('wbp.LR+', 'rch.+', 'DC+'), L('wbp.LR-', 'rch.-', 'DC-'), L('wbp.PE1', 'rch.PE', 'PE'),
  // ---- tableau AC : Q3 → répartiteur ----
  L('q1.N2', 'rep.N', 'N'), L('q1.2', 'rep.L1', 'L1'), L('q1.4', 'rep.L2', 'L2'), L('q1.6', 'rep.L3', 'L3'),
  // ---- répartiteur → parafoudre ----
  L('rep.N', 'pf.N', 'N'), L('rep.L1', 'pf.L1', 'L1'), L('rep.L2', 'pf.L2', 'L2'), L('rep.L3', 'pf.L3', 'L3'),
  // ---- répartiteur → arrivée haute des Od (un onduleur par phase) ----
  ...ONDULEURS.map(o => L('rep.N', `${o.dd}.N`, 'N')),
  ...ONDULEURS.map(o => L(`rep.${o.phase}`, `${o.dd}.1`, o.phase)),
  // ---- sortie basse des Od → câble 3G6 de chaque onduleur ----
  ...ONDULEURS.flatMap(o => [L(`${o.dd}.N2`, `${o.od}.N`, 'N'), L(`${o.dd}.2`, `${o.od}.L`, o.phase)]),
  // ---- terres : PE des câbles 3G6 et du parafoudre → barrette ----
  ...ONDULEURS.map(o => L(`${o.od}.PE`, 'bt.PE', 'PE')),
  L('pf.PE', 'bt.PE', 'PE'),
];

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live']) => {
    for (const id of ids) n[id] = { net, live };
  };
  // ---- éolienne freinée pendant le câblage : conducteurs et bus DC hors tension ----
  set(['eol.L1', 'wbp.L1'], 'U', 'off'); set(['eol.L2', 'wbp.L2'], 'V', 'off'); set(['eol.L3', 'wbp.L3'], 'W', 'off');
  for (const o of ONDULEURS) {
    set([`wbp.DC+${o.wbp}`, `${o.od}.DC+`], 'DC+', 'off');
    set([`wbp.DC-${o.wbp}`, `${o.od}.DC-`], 'DC-', 'off');
  }
  set(['wbp.LR+', 'rch.+'], 'DC+', 'off'); set(['wbp.LR-', 'rch.-'], 'DC-', 'off');
  set(['wbp.PE1', 'rch.PE'], 'PE', 'always');
  // ---- tableau AC : amont de Q3 ----
  set(['q1.N'], 'N', 'always'); set(['q1.1'], 'L1', 'always'); set(['q1.3'], 'L2', 'always'); set(['q1.5'], 'L3', 'always');
  // ---- aval de Q3 : répartiteur, parafoudre, arrivée haute des Od ----
  set(['q1.N2', 'rep.N', 'pf.N', 'f2.N', 'f3.N', 'dd3.N'], 'N', 'q1');
  set(['q1.2', 'rep.L1', 'pf.L1', 'f2.1'], 'L1', 'q1');
  set(['q1.4', 'rep.L2', 'pf.L2', 'f3.1'], 'L2', 'q1');
  set(['q1.6', 'rep.L3', 'pf.L3', 'dd3.1'], 'L3', 'q1');
  // ---- sortie basse de chaque Od → bornier AC de son onduleur ----
  set(['f2.N2', 'od1.N'], 'N', 'f2'); set(['f2.2', 'od1.L'], 'L1', 'f2');
  set(['f3.N2', 'od2.N'], 'N', 'q1f3'); set(['f3.2', 'od2.L'], 'L2', 'q1f3');
  set(['dd3.N2', 'od3.N'], 'N', 'q1&aux:dd3'); set(['dd3.2', 'od3.L'], 'L3', 'q1&aux:dd3');
  // ---- terres ----
  set(['bt.PE', 'od1.PE', 'od2.PE', 'od3.PE', 'pf.PE'], 'PE', 'always');
  return n;
}

export const TP_CHEVRERIE_E222_EOLIEN: TpDefinition = {
  id: 'chevrerie-e222-eolien',
  title: 'Chèvrerie · Raccordement de l’installation éolienne (câblage réel)',
  level: 'Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  hidden: true,
  classement: {
    domaine: 'ENR', domainesSecondaires: ['TER'], sousDomaine: 'ENR.hybride',
    activites: ['realisation', 'mise_en_service'],
    motsCles: ['éolienne', 'WBP-Box', 'Windy Boy', 'résistance de charge', 'onduleur', 'injection réseau'],
  },
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  arriveeMono: false,
  summary:
    'Sujet Chèvrerie, partie E : petite éolienne de 3,5 kW raccordée au réseau triphasé. '
    + 'L’alternateur de l’éolienne alimente la WBP-Box 600-11 (redresseur et protection contre les surtensions, '
    + 'avec sa résistance de charge BW 155), dont le bus DC alimente trois onduleurs Windy Boy 5000A ; chaque '
    + 'onduleur injecte sur une phase par son disjoncteur différentiel Od, sous l’interrupteur-sectionneur Q3. '
    + 'Câbler le schéma, mettre sous tension, faire souffler le vent.',
  situation:
    'L’éolienne est installée sous abri adossé au bâtiment de la chèvrerie et raccordée au réseau triphasé du '
    + 'propriétaire, directement au TGBT. Le matériel est de marque SMA : une WBP-Box 600-11, sa résistance de '
    + 'charge et trois onduleurs Windy Boy 5000A. Compléter le schéma de raccordement de l’ensemble, de l’éolienne '
    + 'jusqu’au tableau AC, sans se préoccuper des courants faibles : ici, il se câble sur la platine. Le câble '
    + '5G16 venant du TGBT est déjà raccordé en amont de Q3 et sur la barrette de terre.',
  plaqueTitre: 'PRODUCTION ÉOLIENNE · 3 × WINDY BOY 5000A',
  plaque: {
    'Éolienne': 'ANTARIS 3,5 kW · alternateur triphasé à aimants permanents · 350 V~ · 3,7 kW nominal / 6,8 kW max · démarrage 2,8 m/s',
    'Redresseur': 'WBP-Box 600-11 · pont B6 · tension DC limitée à 560 V par la résistance de charge',
    'Résistance de charge': 'BW 155 / 10000 / IP 65 · 7 500 W en IP 65 · 900 V max',
    'Onduleurs': '3 × Windy Boy 5000A · mode turbine 250-600 V⎓ · activation à 300 V · 230 V~ monophasé · 26 A max',
    'Protection': 'Od1 à Od3 : DX³ 1P+N C32 30 mA type F, vis/vis (4 107 56) · Q3 : interrupteur-sectionneur 4P',
  },
  cahierDesCharges: [
    { k: 'Éolienne', v: 'ses trois conducteurs sur L1, L2, L3 « Alternator » de la WBP-Box (câble solaire 6 mm²)' },
    { k: 'Bus DC', v: 'DC+ et DC− de la WBP-Box vers les entrées DC + et − des trois onduleurs : dans chaque bloc DC+ / DC− de la WBP-Box (trois bornes reliées en interne), la 1re borne va à l’onduleur 1, la 2e à l’onduleur 2, la 3e à l’onduleur 3' },
    { k: 'Résistance de charge', v: 'LR+ et LR− de la WBP-Box vers le + et le − de la résistance ; son PE sur la 1re borne PE de la WBP-Box. Sans elle, pas de protection contre les surtensions (DTR 29)' },
    { k: 'Tableau AC', v: 'Q3 (N L1 L2 L3) → répartiteur → parafoudre (N L1 L2 L3) et arrivée haute des Od' },
    { k: 'Onduleurs', v: 'monophasés : Od1 sur N + L1, Od2 sur N + L2, Od3 sur N + L3 ; sortie basse de chaque Od vers le N et la L du câble 3G6 de son onduleur' },
    { k: 'Terre', v: 'PE des trois câbles 3G6 et borne de terre du parafoudre sur la barrette de terre' },
    { k: 'Couleurs', v: 'DC+ rouge · neutre bleu · PE vert-jaune · conducteurs de l’éolienne, DC− et phases : couleur libre (noir ou marron)' },
    { k: 'Sécurité', v: 'câblage éolienne freinée (interrupteur de court-circuit fermé) : tant qu’elle tourne, ses conducteurs et le bus DC sont sous tension' },
  ],
  libelles: {
    recv: 'Éolienne et résistance de charge : sous l’abri, hors coffret (colonne de droite)',
    rangees: [
      'WBP-Box 600-11 · zone de raccordement',
      'onduleurs Windy Boy 5000A · zones de raccordement DC / AC',
      'tableau AC · Q3 · répartiteur',
      'Od1 · Od2 · Od3 · parafoudre',
      'barrette de terre',
      'pied de coffret',
    ],
  },
  schemaImage: {
    src: '/tp/chevrerie/q-e222-schema.jpg',
    legende: 'E.2.2.2 · schéma de raccordement de l’installation éolienne (à compléter, pages du sujet)',
    titre: 'E.2.2.2',
  },
  postes: [
    {
      id: 'wbp', name: 'Redresseur / régulateur de surtension', need: 'Éolienne de 6,8 kW max, raccordement triphasé à trois onduleurs (DTR 29, § 4.2)',
      options: [
        { key: 'wbpbox', ref: 'SMA WBP-Box 600-11', spec: 'éolienne jusqu’à 7 kW · limitation à 560 V⎓', ok: true, why: 'La puissance max de l’éolienne (6,8 kW) est sous les 7 kW admis ; elle alimente jusqu’à trois Windy Boy 5000A.' },
        { key: 'wbpbox', ref: 'SMA WBP-Box 500-11', spec: 'éolienne jusqu’à 5 kW', why: '5 kW : insuffisant pour les 6,8 kW que peut fournir l’éolienne.' },
        { key: 'wbpbox', ref: 'SMA WBP-Box 400-11', spec: 'éolienne jusqu’à 3,5 kW', why: '3,5 kW est la puissance nominale annoncée, pas la puissance maximale de 6,8 kW.' },
      ],
    },
    {
      id: 'rch', name: 'Résistance de charge', need: '600 V⎓, environ 30 Ω, 7 000 W permanents, montage en extérieur (IP 55 au minimum)',
      options: [
        { key: 'bw155', ref: 'BW 155 / 10000 / IP 65', spec: '7 500 W en IP 65 · 900 V max', ok: true, why: 'En IP 65 elle dissipe 7 500 W, au-dessus des 7 000 W exigés par la WBP-Box, sous 900 V ≥ 600 V.' },
        { key: 'bw155', ref: 'BW 155 / 9000 / IP 65', spec: '6 750 W en IP 65', why: '6 750 W en IP 65 : sous les 7 000 W permanents exigés.' },
        { key: 'bw155', ref: 'BW 155 / 7500 / IP 20', spec: '7 500 W en IP 20', why: 'IP 20 : l’installation est sous abri, le matériel doit être au minimum IP 55.' },
      ],
    },
    {
      id: 'ond', name: 'Onduleurs d’injection', need: 'Raccordement triphasé avec la WBP-Box 600-11 : trois onduleurs, un par phase',
      options: [
        { key: 'windyboy', ref: '3 × SMA Windy Boy 5000A', spec: 'mode turbine 250-600 V⎓ · 230 V~ · 26 A', ok: true, why: 'Constellation du DTR 29 pour une éolienne jusqu’à 7 kW en triphasé : WBP-Box 600-11 et trois Windy Boy 5000A.' },
        { key: 'windyboy', ref: '1 × SMA Windy Boy 5000A', spec: 'monophasé', why: 'Un seul onduleur, c’est le raccordement monophasé : l’installation est raccordée au réseau triphasé.' },
        { key: 'windyboy', ref: '3 × SMA Windy Boy 3800', spec: 'associé à la WBP-Box 500-11', why: 'Le Windy Boy 3800 va avec la WBP-Box 500-11, pas avec la 600-11.' },
      ],
    },
    {
      id: 'od', name: 'Od1 à Od3 · Disjoncteurs différentiels des onduleurs', need: 'In ≥ 26 A, courbe C, 30 mA, arrivée haute et sortie basse (DTR 30, DTR 32)',
      options: [
        { key: 'dx3diff32f', ref: 'Legrand 4 107 56 (× 3)', spec: 'DX³ 1P+N C32 30 mA type F · vis/vis', ok: true, why: '32 A ≥ 26 A, courbe C, type F (défauts à composante continue et hautes fréquences d’un onduleur), vis/vis : arrivée haute, sortie basse.' },
        { key: 'dx3diff32f', ref: 'Legrand 4 107 08 (× 3)', spec: 'DX³ 1P+N C32 30 mA type AC · vis/vis', half: true, why: 'Calibre et connexion conviennent, mais le type AC ne détecte pas les défauts à composante continue qu’un onduleur peut produire.' },
        { key: 'dx3diff32f', ref: 'Legrand 4 107 55 (× 3)', spec: 'DX³ 1P+N C25 30 mA type F', why: '25 A < 26 A : le calibre est inférieur au courant de sortie max. de l’onduleur.' },
        { key: 'dx3diff32f', ref: 'Legrand 4 107 16 (× 3)', spec: 'DX³ 1P+N C32 30 mA type AC · auto/vis', why: 'Connexion auto/vis : l’arrivée se fait par bornes automatiques, pas par bornes à vis en haut et en bas.' },
      ],
    },
  ],
  // Coffret de l'abri. Rail 0 : zone de raccordement de la WBP-Box ; rail 1 : zones de
  // raccordement des trois onduleurs ; rail 2 : Q3 et répartiteur ; rail 3 : Od1 à Od3 et
  // parafoudre (comme au sujet, les Od sous Q3) ; rail 4 : barrette de terre. L'éolienne et la
  // résistance de charge sont des organes de terrain, dans la colonne de droite.
  rails: [150, 350, 550, 740, 930],
  armoire: 1080,
  sectionneurs: ['dd3'],
  slots: [
    { id: 'wbp', label: 'WBP · Windy Boy Protection Box 600-11 · redresseur et protection contre les surtensions', key: 'wbpbox', rail: 0, x: 40, rep: 'WBP' },
    { id: 'od1', label: 'OND1 · Onduleur Windy Boy 5000A n° 1 · zone de raccordement', key: 'windyboy', rail: 1, x: 42, rep: 'OND1' },
    { id: 'od2', label: 'OND2 · Onduleur Windy Boy 5000A n° 2 · zone de raccordement', key: 'windyboy', rail: 1, x: 157, rep: 'OND2' },
    { id: 'od3', label: 'OND3 · Onduleur Windy Boy 5000A n° 3 · zone de raccordement', key: 'windyboy', rail: 1, x: 272, rep: 'OND3' },
    { id: 'q1', label: 'Q3 · Interrupteur-sectionneur général AC 4P (consignation)', key: 'isw4p', rail: 2, x: 44, rep: 'Q3' },
    { id: 'rep', label: 'REP · Répartiteur tétrapolaire L1 L2 L3 N', key: 'repart4p', rail: 2, x: 156, rep: 'REP' },
    { id: 'f2', label: 'Od1 · Disjoncteur différentiel 32 A 30 mA type F · onduleur 1 (phase L1)', key: 'dx3diff32f', rail: 3, x: 44, rep: 'Od1' },
    { id: 'f3', label: 'Od2 · Disjoncteur différentiel 32 A 30 mA type F · onduleur 2 (phase L2)', key: 'dx3diff32f', rail: 3, x: 98, rep: 'Od2' },
    { id: 'dd3', label: 'Od3 · Disjoncteur différentiel 32 A 30 mA type F · onduleur 3 (phase L3)', key: 'dx3diff32f', rail: 3, x: 152, rep: 'Od3' },
    { id: 'pf', label: 'PF · Parafoudre AC type 2 · 3P+N', key: 'pfac3pn', rail: 3, x: 212, rep: 'PF' },
    { id: 'bt', label: 'BT · Barrette de terre du tableau', key: 'barrterre', rail: 4, x: 60, rep: 'BT' },
    // organes de terrain, sous l'abri (colonne de droite)
    { id: 'eol', label: 'EOL · Éolienne ANTARIS 3,5 kW · sortie de l’interrupteur de freinage', key: 'eolienne', rail: null, x: 440, y: 24, rep: 'EOL' },
    { id: 'rch', label: 'RCH · Résistance de charge BW 155 / 10000 / IP 65', key: 'bw155', rail: null, x: 440, y: 300, rep: 'RCH' },
  ],
  annexItems: [],
  recvItems: [],
  liaisons: LIAISONS,
  nets: nets(),
  tests: [
    TEST_VAT,
    TEST_VISU,
    {
      id: 'frein',
      title: 'Éolienne freinée avant toute intervention',
      how: 'Fermer l’interrupteur de freinage (court-circuit des trois conducteurs) et attendre l’arrêt du rotor ; contrôler l’absence de tension DC au bornier de la WBP-Box (DC+ / DC−).',
      expected: 'rotor arrêté, 0 V⎓ entre DC+ et DC− : l’éolienne n’est plus une source',
    },
    TEST_PE,
    TEST_ISO,
  ],
  mesures: [
    { id: 'cDC1', title: 'Continuité du DC+ (WBP-Box → onduleur 1)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'wbp.DC+1', b: 'od1.DC+', min: 0, max: 2, unit: 'Ω' },
    { id: 'cPE1', title: 'Continuité du PE de l’onduleur 1 (câble 3G6 → barrette de terre)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'od1.PE', b: 'bt.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'uLL', title: 'Tension composée en aval de Q3 (répartiteur L1 – L2)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'rep.L1', b: 'rep.L2', min: 380, max: 420, unit: 'V', when: 'ctl' },
    { id: 'uOnd1', title: 'Tension au bornier AC de l’onduleur 1 (L – N)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'od1.L', b: 'od1.N', min: 220, max: 240, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'neutre2', title: 'Neutre de l’onduleur 2 non raccordé à la sortie d’Od2',
      symptom: 'Onduleurs 1 et 3 en production ; l’onduleur 2 reste en attente du réseau, alors qu’Od2 est fermé.',
      fix: 'Mesurer 0 V entre L et N au bornier AC de l’onduleur 2 et 230 V entre L et le PE : le neutre n’arrive pas. Hors tension, reprendre le conducteur N entre Od2 et le câble 3G6.',
      coupe: 'f3.N2>od2.N',
      nets: { 'od2.N': { live: 'off' } },
      action: 'Raccorder le neutre du câble 3G6 de l’onduleur 2 sur la borne N de sortie d’Od2',
    },
    {
      id: 'lr', title: 'Résistance de charge débranchée (LR−)',
      symptom: 'Par vent modéré tout fonctionne ; par vent fort, la tension DC n’est plus limitée et les onduleurs se mettent en défaut de surtension.',
      fix: 'Éolienne freinée, contrôler à l’ohmmètre la continuité LR− → résistance : OL. Reprendre le conducteur.',
      coupe: 'wbp.LR->rch.-',
      action: 'Raccorder le − de la résistance de charge sur la borne LR− de la WBP-Box',
    },
  ],
  quiz: [
    { q: 'Que fait la WBP-Box entre l’éolienne et les onduleurs ?', options: ['Elle redresse la tension alternative de l’alternateur et limite la tension DC', 'Elle transforme le continu en alternatif 230 V', 'Elle stocke l’énergie', 'Elle couple l’éolienne directement au réseau'], answer: 0 },
    { q: 'Pourquoi la résistance de charge est-elle indispensable ?', options: ['Elle charge l’éolienne en cas de surtension : sans elle, la tension DC n’est plus limitée', 'Elle chauffe l’abri', 'Elle remplace un onduleur la nuit', 'Elle protège contre les contacts directs'], answer: 0 },
    { q: 'Sur quelles phases raccorder les trois onduleurs monophasés ?', options: ['Un par phase : L1, L2, L3', 'Les trois sur L1', 'Entre deux phases', 'Sur le neutre'], answer: 0 },
    { q: 'Quel type de disjoncteur différentiel devant chaque onduleur ?', options: ['Type F : il détecte aussi les défauts à composante continue', 'Type AC seul', 'Aucun différentiel', 'Type B 300 mA'], answer: 0 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2'], ['q1.2', 'q1.4'], ['q1.4', 'q1.6']],
    explication:
      'Côté AC, on consigne sur Q3 et on contrôle l’absence de tension en aval (répartiteur). Côté éolien, '
      + 'l’éolienne reste une source tant qu’elle tourne : on la freine (interrupteur de court-circuit) avant '
      + 'd’intervenir sur la WBP-Box, le bus DC ou la résistance de charge.',
  },
};
