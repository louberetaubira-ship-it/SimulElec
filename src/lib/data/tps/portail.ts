/**
 * TP · Portail coulissant d'entrepôt — démarrage direct DEUX sens de marche.
 *
 * Le portail motorisé s'ouvre et se ferme : le moteur asynchrone triphasé doit
 * tourner dans les deux sens. Deux contacteurs, KM1 (ouverture) et KM2
 * (fermeture), forment un contacteur-inverseur — l'inversion vient du CÂBLAGE :
 * deux phases croisées à l'amont de KM2.
 *
 * Les points que l'élève doit maîtriser (pédagogie active linéaire) :
 *  - inverser le sens = croiser DEUX phases (L1 et L3) ;
 *  - KM1 et KM2 collés ensemble = court-circuit franc → VERROUILLAGE électrique
 *    par contacts NF croisés (KM2:21-22 en série avec la bobine de KM1, et
 *    réciproquement), doublé du verrouillage mécanique du bloc inverseur ;
 *  - AUTO-MAINTIEN de chaque sens (contact NO 13-14 du contacteur en parallèle
 *    sur son bouton de marche) ;
 *  - FINS DE COURSE : FCO (NF) coupe KM1 portail ouvert, FCF (NF) coupe KM2
 *    portail fermé — interrupteurs de position sur le rail du portail ;
 *  - commande 24 V par T1, protégée des deux côtés (Q2 primaire, Q3 secondaire),
 *    couleurs et repérage normalisés.
 *
 * Limite du modèle de simulation : comme pour tout 2 sens de l'application, le
 * moteur anime le SENS OUVERTURE (KM1) ; la voie fermeture (KM2) est câblée,
 * verrouillée et évaluée, mais son animation « en marche » suit celle de KM1.
 */
import type { Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, POSTE_T1_OPTIONS, TRAFO_REF, X1, liaisonsT1, netsT1 } from './common';

/** Bornier de commande XC : 10 bornes au pas de 18 px. */
const XC: Slot[] = ([
  ['x2_1', '1', 'H1'],
  ['x2_2', '2', 'S1'],
  ['x2_3', '3', 'S1'],
  ['x2_4', '4', 'S2'],
  ['x2_5', '5', 'S3'],
  ['x2_6', '6', 'FCO'],
  ['x2_7', '7', 'FCO'],
  ['x2_8', '8', 'FCF'],
  ['x2_9', '9', 'FCF'],
  ['x2_10', '10', '0V'],
] as const).map(([id, mark, sub], i) => ({
  id,
  label: `XC:${mark}`,
  key: 'termgrey',
  rail: 2,
  x: 214 + i * 18,
  mark,
  sub,
  group: 'XC',
  ...(i === 0 ? { groupLabel: 'XC · bornier commande' } : {}),
}));

export const TP_PORTAIL: TpDefinition = {
  id: 'portail-2sens',
  title: 'Portail coulissant · deux sens de marche',
  level: 'Tle Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C1 Analyser', 'C3 Concevoir', 'C5 Réaliser', 'C6 Mettre en service'],
  diplomas: ['bacpro'],
  summary:
    'Portail coulissant d\'entrepôt, moteur asynchrone triphasé 0,75 kW. Contacteur-inverseur KM1 (ouverture) / KM2 (fermeture), phases croisées, verrouillage électrique et mécanique, auto-maintien par sens, fins de course FCO / FCF, commande 24 V par T1, pupitre S1 arrêt / S2 ouverture / S3 fermeture et voyant H1 sous tension.',
  situation:
    'L\'entrepôt est fermé par un grand portail coulissant motorisé. Il doit s\'OUVRIR et se FERMER : le moteur doit donc tourner dans les deux sens. Tu conçois, câbles et mets en service la commande — inversion par croisement de deux phases, double verrouillage pour interdire les deux sens à la fois, auto-maintien de chaque sens et fins de course qui arrêtent le portail en fin d\'ouverture et de fermeture.',
  plaque: {
    P: '0,75 kW',
    U: '400 V Y · 50 Hz',
    In: '1,9 A',
    n: '1400 tr/min',
    'cos φ': '0,78',
    Rendement: 'IE3 · 82 %',
    Pôles: '4',
    Classe: 'F · IP 55',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + PE, 50 Hz, arrivée sur bornier X1' },
    { k: 'Force motrice', v: 'moteur asynchrone triphasé 0,75 kW, couplage étoile (400 V)' },
    { k: 'Deux sens', v: 'KM1 ouverture (phases dans l\'ordre) · KM2 fermeture (L1 et L3 croisées à l\'amont)' },
    { k: 'Verrouillage', v: 'ÉLECTRIQUE par contacts NF croisés (KM2:21-22 en série avec KM1, KM1:21-22 avec KM2) ET mécanique par le bloc inverseur : jamais les deux sens ensemble' },
    { k: 'Auto-maintien', v: 'contact NO 13-14 de chaque contacteur en parallèle sur son bouton de marche' },
    { k: 'Fins de course', v: 'FCO (NF) coupe KM1 portail ouvert · FCF (NF) coupe KM2 portail fermé, sur le rail du portail' },
    { k: 'Commande', v: 'TBT 24 V ~ par T1 400/24 V, primaire protégé par Q2 (2 pôles), secondaire par Q3 (phase + neutre)' },
    { k: 'Pupitre', v: 'S1 arrêt (NF) · S2 ouverture (NO) · S3 fermeture (NO) · H1 voyant incolore « sous tension »' },
    { k: 'Défaut thermique', v: 'F1 95-96 en tête de la chaîne de commande : un déclenchement coupe tout' },
    { k: 'Couleurs', v: 'puissance noir · commande rouge · commun 24 V blanc · PE vert-jaune' },
    { k: 'Avant mise en service', v: 'consignation sur Q1 · VAT · continuité PE · isolement 500 V · ESSAI DU VERROUILLAGE : les deux sens ne doivent jamais être possibles ensemble' },
  ],
  pupitre: [
    { rep: 'H1', kind: 'lamp', color: 'clear', signals: 'ctl', label: 'voyant incolore · portail sous tension' },
    { rep: 'S1', kind: 'nc', color: 'red', label: 'arrêt du portail' },
    { rep: 'S2', kind: 'no', color: 'green', label: 'ouverture du portail' },
    { rep: 'S3', kind: 'no', color: 'green', label: 'fermeture du portail' },
  ],
  preparation: {
    identification: [
      {
        id: 'id-q1', focus: 'Q1', schema: 'puissance', rep: 'Q1',
        invite: 'Quel organe porte ce repère en tête de l\'installation ?',
        options: [
          'Un sectionneur porte-fusibles',
          'Un disjoncteur moteur',
          'Un contacteur de puissance',
          'Un relais thermique',
        ],
        answer: 0,
        why: 'Q1 est un sectionneur porte-fusibles : il sépare, se cadenasse (consignation) et protège du court-circuit par ses cartouches aM.',
      },
      {
        id: 'id-km', focus: 'KM2', schema: 'puissance', rep: 'KM1 / KM2',
        invite: 'Que représentent ces deux repères accolés sur le schéma de puissance ?',
        options: [
          'Deux contacteurs accouplés et verrouillés : le contacteur-inverseur',
          'Un contacteur et son relais thermique',
          'Deux relais temporisés',
          'Un contacteur double vitesse',
        ],
        answer: 0,
        why: 'Deux contacteurs identiques, verrouillés. L\'inversion vient du CÂBLAGE : deux phases croisées entre KM1 et KM2.',
      },
      {
        id: 'id-f1', focus: 'F1', schema: 'puissance', rep: 'F1',
        invite: 'Quel appareil est monté entre les contacteurs et le bornier moteur ?',
        options: ['Le relais de protection thermique', 'Le transformateur', 'Un bloc temporisé', 'Un parafoudre'],
        answer: 0,
        why: 'Le relais thermique protège le moteur des surcharges ; son contact 95-96 agit dans le circuit de commande.',
      },
      {
        id: 'id-fc', focus: 'FCO', schema: 'commande', rep: 'FCO / FCF',
        invite: 'Ces deux repères, sur le rail du portail, désignent :',
        options: [
          'Des interrupteurs de position (fins de course)',
          'Des boutons du pupitre',
          'Des voyants de signalisation',
          'Des détecteurs de fumée',
        ],
        answer: 0,
        why: 'Ce sont des fins de course à galet : le portail les actionne mécaniquement. FCO arrête l\'ouverture, FCF la fermeture.',
      },
    ],
    fonctions: [
      {
        id: 'fn-inv', focus: 'KM2', schema: 'puissance', rep: 'KM1 / KM2',
        invite: 'Comment obtient-on le deuxième sens de rotation ?',
        options: [
          'En croisant deux phases à l\'amont de KM2',
          'En inversant les trois phases',
          'En coupant une phase',
          'En changeant la fréquence',
        ],
        answer: 0,
        why: 'On inverse DEUX phases (L1 et L3). Croiser les trois reviendrait au même sens ; une seule ne suffit pas.',
      },
      {
        id: 'fn-verr', focus: 'KM2', schema: 'commande', rep: 'KM1:21-22 / KM2:21-22',
        invite: 'À quoi servent ces deux contacts à ouverture, croisés entre les bobines ?',
        options: [
          'Au verrouillage électrique : interdire que les deux contacteurs collent ensemble',
          'À l\'auto-maintien',
          'À la signalisation',
          'À la temporisation',
        ],
        answer: 0,
        why: 'Deux contacteurs collés mettraient deux phases en court-circuit. Le verrouillage électrique l\'interdit, doublé du verrouillage mécanique.',
      },
      {
        id: 'fn-am', focus: 'KM1', schema: 'commande', rep: 'KM1:13-14',
        invite: 'Quelle est la fonction du contact NO 13-14 en parallèle sur le bouton d\'ouverture ?',
        options: [
          'L\'auto-maintien : garder KM1 alimenté après relâchement du bouton',
          'Le verrouillage',
          'La signalisation',
          'La protection thermique',
        ],
        answer: 0,
        why: 'L\'auto-maintien maintient la bobine alimentée quand on relâche S2, jusqu\'à l\'arrêt ou la fin de course.',
      },
      {
        id: 'fn-fc', focus: 'FCO', schema: 'commande', rep: 'FCO',
        invite: 'Quelle est la fonction du fin de course FCO ?',
        options: [
          'Arrêter automatiquement l\'ouverture quand le portail est ouvert',
          'Démarrer la fermeture',
          'Signaler un défaut',
          'Protéger contre les surcharges',
        ],
        answer: 0,
        why: 'Contact NF en série avec la bobine de KM1 : portail ouvert, il s\'ouvre et coupe KM1. FCF fait de même pour KM2.',
      },
    ],
  },
  puissance: {
    phases: ['L1', 'L2', 'L3'],
    reseau: '3 × 400 V + PE',
    organes: [
      { type: 'bornier', rep: 'X1', legende: 'arrivée réseau', bornes: [['1', ''], ['2', ''], ['3', '']] },
      { type: 'sectionneur', rep: 'Q1', legende: 'séparation · cartouches aM', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      {
        type: 'contacteur', rep: 'KM1', legende: 'ouverture', bornes: [['1', '2'], ['3', '4'], ['5', '6']],
        paire: { rep: 'KM2', legende: 'fermeture · L1 et L3 croisées', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      },
      { type: 'thermique', rep: 'F1', legende: 'surcharges', bornes: [['1', '2'], ['3', '4'], ['5', '6']] },
      { type: 'bornier', rep: 'X1', legende: 'départ moteur', bornes: [['6', ''], ['7', ''], ['8', '']] },
    ],
    moteur: { rep: 'M', legende: '0,75 kW · 400 V Y · 1,9 A' },
  },
  postes: [
    {
      id: 'q1', name: 'Q1 · Sectionneur porte-fusibles',
      need: 'Sectionner, consigner et protéger contre les courts-circuits un moteur de 0,75 kW (In = 1,9 A)',
      options: [
        { key: 'fuseswitch', ref: 'GK1EK + cartouches aM 4 A', spec: '3 pôles · aM 10 × 38', ok: true, why: 'Cadenassable : organe de consignation. Les aM laissent passer la pointe de démarrage et coupent le court-circuit.' },
        { key: 'fuseswitch', ref: 'GK1EK + cartouches gG 4 A', spec: '3 pôles · gG', why: 'Les gG protègent les conducteurs, pas les moteurs : elles fondront au démarrage.' },
        { key: 'mcb3p', ref: 'iC60N 3P C10', spec: 'disjoncteur 3 pôles', why: 'Un disjoncteur modulaire n\'est pas l\'organe de sectionnement cadenassable imposé.' },
      ],
    },
    {
      id: 'km', name: 'KM1 / KM2 · Contacteur-inverseur',
      need: 'Deux contacteurs pour 0,75 kW en AC-3, bobine 24 V, verrouillage mécanique',
      options: [
        { key: 'kontakt', ref: 'LC2 D09 B7', spec: 'inverseur 9 A AC-3 · bobine 24 V~ · verrouillage mécanique', ok: true, why: '9 A couvrent les 1,9 A du moteur, bobine 24 V conforme, et le bloc inverseur apporte le verrouillage mécanique.' },
        { key: 'kontakt', ref: '2 × LC1 D09 B7 sans verrouillage', spec: '9 A · bobine 24 V~', half: true, why: 'Calibre et bobine bons, mais sans verrouillage mécanique il ne reste que l\'électrique : sécurité incomplète.' },
        { key: 'kontakt', ref: 'LC2 D09 P7', spec: 'inverseur · bobine 230 V~', why: 'Bobine 230 V alors que la commande est en 24 V : les contacteurs ne colleront pas.' },
      ],
    },
    {
      id: 'f1', name: 'F1 · Relais thermique',
      need: 'Protéger le moteur contre les surcharges, réglé à In = 1,9 A',
      options: [
        { key: 'therm', ref: 'LRD07', spec: '1,6 – 2,5 A', ok: true, why: 'In = 1,9 A tombe dans la plage 1,6–2,5 A, classe 10 adaptée au démarrage direct.' },
        { key: 'therm', ref: 'LRD06', spec: '1 – 1,6 A', why: 'Réglage maximal 1,6 A < 1,9 A : déclenchements intempestifs.' },
        { key: 'therm', ref: 'LRD10', spec: '4 – 6 A', why: 'Réglage minimal 4 A, plus du double de In : le moteur n\'est pas protégé.' },
      ],
    },
    {
      id: 't1', name: 'T1 · Transformateur de commande',
      need: 'Abaisser 400 V en 24 V pour la commande (bobines + voyant)',
      options: [...POSTE_T1_OPTIONS],
    },
    {
      id: 'q2', name: 'Q2 · Protection du primaire',
      need: 'Protéger le primaire 400 V de T1 et ses conducteurs',
      options: [
        { key: 'mcb2ph', ref: 'C60N 2P C2', spec: '2 A · 2 pôles', ok: true, why: 'Bipolaire : le primaire est pris entre deux phases, il faut couper les deux.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · 1 pôle', why: 'Un seul pôle coupé : la seconde phase reste sous tension.' },
        { key: 'mcb2ph', ref: 'iC60N 2P C20', spec: '20 A · courbe C', why: 'Calibre sans rapport avec un primaire de quelques dizaines de mA.' },
      ],
    },
    {
      id: 'q3', name: 'Q3 · Protection du secondaire',
      need: 'Protéger le circuit de commande 24 V',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C2', spec: '2 A · phase + neutre', ok: true, why: 'Le pôle protégé coupe le 24 V, le pôle neutre sectionne le commun : les deux conducteurs s\'ouvrent d\'un geste.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · 1 pôle', half: true, why: 'Protège, mais laisse le commun raccordé au secondaire pendant l\'intervention.' },
        { key: 'mcb2p', ref: 'C60N 2P C2', spec: '2 A · 2 pôles', half: true, why: 'Fonctionne, mais couper le commun mis à la terre ne sert à rien.' },
      ],
    },
    {
      id: 'pupitre', name: 'Pupitre · S1 S2 S3 H1',
      need: 'Arrêt, ouverture, fermeture, et voyant de mise sous tension',
      options: [
        { key: 'stopstart', ref: 'S1 NF · S2 NO · S3 NO · voyant incolore', spec: 'arrêt NF · 2 marches NO · voyant 24 V', ok: true, why: 'L\'arrêt est à contact NF (sécurité positive), les marches à contact NO, le voyant incolore signale la mise sous tension.' },
        { key: 'stopstart', ref: 'S1 à contact NO', spec: 'arrêt NO', why: 'Un arrêt à contact NO ne coupe plus rien si un fil se rompt : sécurité positive non respectée.' },
        { key: 'stopstart', ref: 'S2 S3 + voyant vert', spec: 'voyant vert 24 V', half: true, why: 'Fonctionne, mais un voyant vert annonce « en marche » ; ici il signale la mise sous tension.' },
      ],
    },
    {
      id: 'fc', name: 'FCO / FCF · Fins de course',
      need: 'Arrêter l\'ouverture portail ouvert, la fermeture portail fermé',
      options: [
        { key: 'limitswitch', ref: 'XCKJ à galet · contact NF', spec: 'NF à ouverture positive', ok: true, why: 'Contact NF en série avec la bobine du sens concerné : le portail actionne le galet et coupe le contacteur.' },
        { key: 'limitswitch', ref: 'XCKJ · contact NO', spec: 'NO à fermeture', why: 'Contact NO : une rupture de fil laisserait le portail forcer en butée. Mauvaise borne.' },
        { key: 'limitswitch', ref: 'Détecteur inductif', spec: 'sans contact', why: 'Un détecteur peut rester collé : insuffisant seul pour un arrêt de fin de course.' },
      ],
    },
    {
      id: 'x', name: 'X1 / XC · Borniers',
      need: 'X1 : réseau et départ moteur (2,5 mm²) ; XC : commande, pupitre et fins de course (1,5 mm²)',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE', spec: 'bornes 2,5 mm² · PE vert-jaune', ok: true, why: 'Sections et repérage PE conformes ; une borne 2,5 accepte le 1,5 mm² de commande.' },
        { key: 'termgrey', ref: 'UT 1,5 partout', spec: 'bornes 1,5 mm²', why: 'La puissance est en 2,5 mm² : bornes 1,5 insuffisantes pour X1.' },
        { key: 'termgrey', ref: 'Dominos', spec: 'connecteurs à vis', why: 'Interdit en armoire : bornes sur rail obligatoires.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  /**
   * Gaines en sous-face du coffret. Un conducteur qui sort de l'enveloppe entre
   * dans une gaine, et il y entre par un presse-étoupe : c'est le presse-étoupe
   * qui tient le câble et qui fait l'indice de protection. `dessert` range
   * automatiquement chaque liaison dans la sienne, d'après la borne qu'elle
   * touche à l'extérieur.
   *
   * Les diamètres suivent le taux de remplissage usuel — la somme des sections
   * extérieures des conducteurs ne dépasse pas le tiers de la section du conduit.
   */
  gaines: [
    { id: 'g1', rep: 'G1', x: 84, diam: 25, nature: 'force',
      contenu: '5 conducteurs 2,5 mm² · L1 L2 L3 N PE', vers: 'tableau général, par le bas', dessert: ['RES.'] },
    { id: 'g2', rep: 'G2', x: 170, diam: 20, nature: 'force',
      contenu: '4 conducteurs 2,5 mm² · U1 V1 W1 et PE', vers: 'motoréducteur du portail', dessert: ['M.'] },
    { id: 'g3', rep: 'G3', x: 252, diam: 16, nature: 'tbts',
      contenu: '2 conducteurs 1,5 mm² de commande', vers: 'fin de course d’ouverture FCO', dessert: ['FCO.'] },
    { id: 'g4', rep: 'G4', x: 312, diam: 16, nature: 'tbts',
      contenu: '2 conducteurs 1,5 mm² de commande', vers: 'fin de course de fermeture FCF', dessert: ['FCF.'] },
  ],
  // Tout ce qui sort du coffret passe par une gaine : la goulotte de pied n'a plus
  // un seul conducteur à desservir.
  goulotteDePied: false,
  slots: [
    { id: 'q1', label: 'Q1 · Sectionneur porte-fusibles', key: 'fuseswitch', rail: 0, x: 46, rep: 'Q1' },
    { id: 'f2', label: 'Q2 · Primaire T1', key: 'mcb2ph', rail: 0, x: 140, rep: 'Q2' },
    { id: 'f3', label: 'Q3 · Secondaire 24 V · phase + neutre', key: 'mcb1pn', rail: 0, x: 200, rep: 'Q3' },
    { id: 't1', label: 'T1 · Transformateur 100 VA · 230-400 / 24-48 V', key: 'trafoleg', rail: 0, x: 262, rep: 'T1' },
    { id: 'km1', label: 'KM1 · Contacteur ouverture', key: 'kontakt', rail: 1, x: 46, rep: 'KM1' },
    { id: 'km2', label: 'KM2 · Contacteur fermeture', key: 'kontakt', rail: 1, x: 136, rep: 'KM2' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 1, x: 226, rep: 'F1' },
    ...X1(46),
    ...XC,
  ],
  annexItems: [],
  // Fins de course sur le rail du portail (hors armoire), câblées par presse-étoupe.
  recvItems: [
    { key: 'limitswitch', rep: 'FCO', name: 'fin de course ouverture · portail ouvert', x: 360, y: 20, w: 40, h: 92, recv: true },
    { key: 'limitswitch', rep: 'FCF', name: 'fin de course fermeture · portail fermé', x: 420, y: 20, w: 40, h: 92, recv: true },
  ],
  liaisons: [
    // ---- puissance : réseau → Q1 ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    // KM1 (ouverture) : phases dans l'ordre
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    // KM2 (fermeture) : L1 et L3 croisées
    L('q1.2', 'km2.5', 'L1'), L('q1.4', 'km2.3', 'L2'), L('q1.6', 'km2.1', 'L3'),
    // départs réunis puis relais thermique et bornier moteur
    L('km2.2', 'km1.2', 'L1'), L('km2.4', 'km1.4', 'L2'), L('km2.6', 'km1.6', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),
    // ---- alimentation TBT : deux phases en aval de Q1 → Q2 → T1 → Q3 ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.3', 'L2'),
    ...liaisonsT1({ retour: 'x2_10.a', terre: 'x1_5.a' }),
    L('x2_10.a', 'x1_5.a', 'PE'),
    // ---- commande : H1 sous tension, défaut thermique, arrêt ----
    L('f3.2', 'x2_1.a', 'C'), L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_2.a', 'C'),
    // arrêt S1 (pupitre, NF) entre XC:2 et XC:3
    L('x2_2.b', 'S1.21', 'C', 'door'), L('S1.22', 'x2_3.b', 'C', 'door'),
    // ---- branche OUVERTURE : S2 // auto-maintien KM1 → verrou KM2 → FCO → bobine KM1 ----
    L('x2_3.b', 'S2.13', 'C', 'door'), L('S2.14', 'x2_4.b', 'C', 'door'),
    L('x2_3.a', 'km1.13', 'C'), L('km1.14', 'x2_4.a', 'C'),
    L('x2_4.a', 'km2.21', 'C'), L('km2.22', 'x2_6.a', 'C'),
    L('x2_6.b', 'FCO.X1', 'C'), L('FCO.X2', 'x2_7.b', 'C'),
    L('x2_7.a', 'km1.A1', 'C'), L('km1.A2', 'x2_10.a', 'C0'),
    // ---- branche FERMETURE : S3 // auto-maintien KM2 → verrou KM1 → FCF → bobine KM2 ----
    L('x2_3.b', 'S3.13', 'C', 'door'), L('S3.14', 'x2_5.b', 'C', 'door'),
    L('x2_3.a', 'km2.13', 'C'), L('km2.14', 'x2_5.a', 'C'),
    L('x2_5.a', 'km1.21', 'C'), L('km1.22', 'x2_8.a', 'C'),
    L('x2_8.b', 'FCF.X1', 'C'), L('FCF.X2', 'x2_9.b', 'C'),
    L('x2_9.a', 'km2.A1', 'C'), L('km2.A2', 'km1.A2', 'C0'),
    // ---- voyant H1 (porte) ----
    L('x2_1.b', 'H1.X1', 'C', 'door'), L('x2_10.b', 'H1.X2', 'C0', 'door'),
    // ---- barrettes de couplage étoile (400 V) ----
    L('M.W2', 'M.U2', 'BAR'), L('M.U2', 'M.V2', 'BAR'),
    // ---- arrivée réseau et câble moteur ----
    L('RES.L1', 'x1_1.b', 'L1'), L('RES.L2', 'x1_2.b', 'L2'), L('RES.L3', 'x1_3.b', 'L3'),
    L('RES.N', 'x1_4.b', 'N'), L('RES.PE', 'x1_5.b', 'PE'),
    L('x1_6.b', 'M.U1', 'L1'), L('x1_7.b', 'M.V1', 'L2'), L('x1_8.b', 'M.W1', 'L3'),
    L('x1_9.b', 'M.PE', 'PE'),
  ],
  nets: {
    // bornier de puissance X1
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'L2', live: 'always' }, 'x1_2.b': { net: 'L2', live: 'always' },
    'x1_3.a': { net: 'L3', live: 'always' }, 'x1_3.b': { net: 'L3', live: 'always' },
    'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
    'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
    'x1_6.a': { net: 'U', live: 'run' }, 'x1_6.b': { net: 'U', live: 'run' },
    'x1_7.a': { net: 'V', live: 'run' }, 'x1_7.b': { net: 'V', live: 'run' },
    'x1_8.a': { net: 'W', live: 'run' }, 'x1_8.b': { net: 'W', live: 'run' },
    'x1_9.a': { net: 'PE', live: 'always' }, 'x1_9.b': { net: 'PE', live: 'always' },
    // sectionneur
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'L2', live: 'always' }, 'q1.5': { net: 'L3', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'L2', live: 'q1' }, 'q1.6': { net: 'L3', live: 'q1' },
    // KM1 · ouverture (sens animé)
    'km1.1': { net: 'L1', live: 'q1' }, 'km1.3': { net: 'L2', live: 'q1' }, 'km1.5': { net: 'L3', live: 'q1' },
    'km1.2': { net: 'U', live: 'run' }, 'km1.4': { net: 'V', live: 'run' }, 'km1.6': { net: 'W', live: 'run' },
    'km1.13': { net: 'C', live: 'ctl' }, 'km1.14': { net: 'C', live: 'km1' },
    'km1.21': { net: 'C', live: 'ctl' }, 'km1.22': { net: 'C', live: 'ctl' },
    'km1.A1': { net: 'C', live: 'km1' }, 'km1.A2': { net: 'C0', live: 'always' },
    // KM2 · fermeture (L1 et L3 croisées)
    'km2.1': { net: 'L3', live: 'q1' }, 'km2.3': { net: 'L2', live: 'q1' }, 'km2.5': { net: 'L1', live: 'q1' },
    'km2.2': { net: 'U', live: 'run' }, 'km2.4': { net: 'V', live: 'run' }, 'km2.6': { net: 'W', live: 'run' },
    'km2.13': { net: 'C', live: 'ctl' }, 'km2.14': { net: 'C', live: 'off' },
    'km2.21': { net: 'C', live: 'ctl' }, 'km2.22': { net: 'C', live: 'ctl' },
    'km2.A1': { net: 'C', live: 'off' }, 'km2.A2': { net: 'C0', live: 'always' },
    // relais thermique
    'f1.1': { net: 'U', live: 'run' }, 'f1.3': { net: 'V', live: 'run' }, 'f1.5': { net: 'W', live: 'run' },
    'f1.2': { net: 'U', live: 'run' }, 'f1.4': { net: 'V', live: 'run' }, 'f1.6': { net: 'W', live: 'run' },
    'f1.95': { net: 'C', live: 'ctl' }, 'f1.96': { net: 'C', live: 'ctl' },
    // protection du primaire
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.3': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.4': { net: 'L2', live: 'f2' },
    // transformateur de commande
    ...netsT1('f2'),
    // protection du secondaire
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    'f3.N': { net: 'C0', live: 'always' }, 'f3.N2': { net: 'C0', live: 'always' },
    // bornier de commande XC
    'x2_1.a': { net: 'C', live: 'ctl' }, 'x2_1.b': { net: 'C', live: 'ctl' },
    'x2_2.a': { net: 'C', live: 'ctl' }, 'x2_2.b': { net: 'C', live: 'ctl' },
    'x2_3.a': { net: 'C', live: 'ctl' }, 'x2_3.b': { net: 'C', live: 'ctl' },
    'x2_4.a': { net: 'C', live: 'ctl' }, 'x2_4.b': { net: 'C', live: 'ctl' },
    'x2_5.a': { net: 'C', live: 'ctl' }, 'x2_5.b': { net: 'C', live: 'ctl' },
    'x2_6.a': { net: 'C', live: 'ctl' }, 'x2_6.b': { net: 'C', live: 'ctl' },
    'x2_7.a': { net: 'C', live: 'ctl' }, 'x2_7.b': { net: 'C', live: 'ctl' },
    'x2_8.a': { net: 'C', live: 'ctl' }, 'x2_8.b': { net: 'C', live: 'ctl' },
    'x2_9.a': { net: 'C', live: 'off' }, 'x2_9.b': { net: 'C', live: 'off' },
    'x2_10.a': { net: 'C0', live: 'always' }, 'x2_10.b': { net: 'C0', live: 'always' },
    // moteur et pupitre
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S1.21': { net: 'C', live: 'ctl' }, 'S1.22': { net: 'C', live: 'ctl' },
    'S2.13': { net: 'C', live: 'ctl' }, 'S2.14': { net: 'C', live: 'ctl' },
    'S3.13': { net: 'C', live: 'ctl' }, 'S3.14': { net: 'C', live: 'ctl' },
    'FCO.X1': { net: 'C', live: 'ctl' }, 'FCO.X2': { net: 'C', live: 'ctl' },
    'FCF.X1': { net: 'C', live: 'ctl' }, 'FCF.X2': { net: 'C', live: 'ctl' },
    'H1.X1': { net: 'C', live: 'ctl' }, 'H1.X2': { net: 'C0', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'verr',
      title: 'Essai du verrouillage électrique',
      how: 'Multimètre en Ω : forcer S2 et S3 en même temps. Le contact NF 21-22 de chaque contacteur doit interdire l\'alimentation simultanée des deux bobines.',
      expected: 'jamais les deux bobines alimentées ensemble',
    },
    {
      id: 'cont',
      title: 'Continuité de la commande (ouverture)',
      how: 'Multimètre en Ω entre Q3:2 et XC:10, S2 maintenu appuyé : le chemin traverse F1 95-96, S1, S2, le verrou KM2, FCO et la bobine de KM1.',
      expected: '≈ 100 Ω (bobine 24 V)',
    },
  ],
  mesures: [
    { id: 'rpe', title: 'Continuité du PE jusqu\'à la carcasse moteur', stage: 'horsTension', instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'M.PE', min: 0, max: 2, unit: 'Ω' },
    { id: 'riso', title: 'Isolement U1 / PE sous 500 V', stage: 'horsTension', instrument: 'ctrl', dial: 'RISO 500 V', a: 'M.U1', b: 'M.PE', min: 0.5, max: 9999, unit: 'MΩ' },
    { id: 'renr', title: 'Résistance de l\'enroulement U (U1 – U2)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.U2', min: 6, max: 12, unit: 'Ω' },
    { id: 'u400', title: 'Tension composée en aval de Q1', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'run' },
    { id: 'u24', title: 'Tension de commande au secondaire de T1', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 't1.24b', b: 't1.0a', min: 22, max: 26, unit: 'V', when: 'ctl' },
    { id: 'iL', title: 'Courant de ligne à la pince (KM1:2 → F1:1)', stage: 'sousTension', instrument: 'clamp', dial: 'A~', wire: 'km1.2>f1.1', min: 1.5, max: 2.4, unit: 'A', when: 'run' },
    { id: 'n', title: 'Vitesse de rotation au tachymètre', stage: 'sousTension', instrument: 'tach', dial: 'tr/min', min: 1350, max: 1470, unit: 'tr/min', when: 'run' },
  ],
  faults: [
    {
      id: 'a2', title: 'Fil A2 de la bobine KM1 desserré',
      symptom: 'KM1 vibre et ne tient pas à l\'appui sur S2.',
      fix: 'Resserrer A2 et refaire la continuité A2 – XC:10.',
      coupe: 'km1.A2>x2_10.a', action: 'Resserrer le fil sur A2 et contrôler la continuité jusqu\'au 0 V',
    },
    {
      id: 'verr', title: 'Contact de verrouillage KM2:21-22 resté ouvert',
      symptom: 'Rien ne se passe à l\'appui sur S2 (ouverture), pourtant H1 est allumé.',
      fix: 'Contrôler le contact NF 21-22 de KM2 et son câblage entre XC:4 et la bobine de KM1.',
      coupe: 'x2_4.a>km2.21', action: 'Reprendre le câblage du verrou KM2:21-22 dans la branche ouverture',
    },
    {
      id: 'fco', title: 'Fin de course FCO resté ouvert',
      symptom: 'L\'ouverture ne démarre pas, alors que le portail n\'est pas en butée.',
      fix: 'Régler la came de FCO et remplacer le contact NF.',
      ouvre: 'FCO', action: 'Régler la came de FCO et remplacer le contact NF',
    },
    {
      id: 'l2', title: 'Phase L2 coupée entre F1 et X1:7',
      symptom: 'Le moteur ronfle sans tourner, F1 finit par déclencher.',
      fix: 'Refaire la liaison F1:4 → X1:7 et réarmer F1.',
      coupe: 'f1.4>x1_7.a', action: 'Refaire la liaison F1:4 → X1:7 et réarmer F1',
    },
    {
      id: 'f3', title: 'Q3 déclenché (défaut sur le 24 V)',
      symptom: 'H1 éteint alors que Q1 est fermé, 0 V sur tout le bornier XC, 24 V au secondaire de T1.',
      fix: 'Chercher le défaut d\'isolement du 24 V, puis réarmer Q3.',
      ouvre: 'f3', action: 'Chercher le défaut d\'isolement du 24 V, puis réarmer Q3',
    },
  ],
  quiz: [
    { q: 'Comment inverse-t-on le sens d\'un moteur triphasé ?', options: ['En inversant une phase', 'En inversant deux phases', 'En inversant les trois phases', 'En changeant la tension d\'alimentation'], answer: 1 },
    { q: 'Que se passe-t-il si KM1 et KM2 collent en même temps ?', options: ['Le moteur va plus vite', 'Un court-circuit entre phases', 'Rien de grave', 'Le moteur ralentit doucement'], answer: 1 },
    { q: 'Quel type de contact réalise le verrouillage électrique ?', options: ['Un contact NO', 'Un contact NF de chaque contacteur en série avec la bobine de l\'autre', 'Un fusible', 'Un contact temporisé'], answer: 1 },
    { q: 'À quoi sert le fin de course FCO ?', options: ['À démarrer la fermeture', 'À arrêter l\'ouverture portail ouvert', 'À signaler un défaut', 'À protéger le moteur contre les surcharges'], answer: 1 },
    { q: 'Le voyant H1 est incolore. Que signale-t-il ?', options: ['Le portail s\'ouvre', 'Le portail est sous tension', 'Un défaut thermique', 'Le sens de rotation du moteur'], answer: 1 },
    { q: 'Quel appareil assure le sectionnement et la consignation ?', options: ['Le contacteur KM1', 'Le sectionneur porte-fusibles Q1', 'Le relais thermique F1', 'Le transformateur T1'], answer: 1 },
  ],
  motor: { P: 750, U: 400, In: 1.9, n: 1400, ns: 1500, cosPhi: 0.78 },
  trafo: { slot: 't1', ...TRAFO_REF },
  station: true,
  hasMotor: true,
};
