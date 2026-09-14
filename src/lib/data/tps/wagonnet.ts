/**
 * TP · Wagonnet de manutention — moteur M1 deux sens de marche, cycle à quatre arrêts.
 *
 * Le chariot fait la navette sur son rail entre quatre capteurs de position. Appui
 * sur S1, capteur S2 actionné : marche AVANT jusqu'à S4, arrêt 2 s, ARRIÈRE jusqu'à
 * S3, arrêt 2 s, AVANT jusqu'à S5, arrêt 2 s, ARRIÈRE jusqu'à S2, arrêt. Le chariot
 * met 3 s entre deux capteurs : le cycle dure donc 6 · 2 · 3 · 2 · 6 · 2 · 9 = 30 s.
 *
 * Ce qui fait la difficulté du montage — et ce que l'élève doit trouver :
 *  · le chariot PASSE sur S3 à l'aller sans s'y arrêter. C'est le contact 33-34 de
 *    KA4, en série avec S3, qui n'autorise l'arrêt sur S3 qu'après le passage en S4 ;
 *  · de même, le contact 33-34 de KA3 en série avec S5 ;
 *  · chaque relais d'arrêt porte un bloc temporisé LAD T0 réglé à 2 s : son contact
 *    67-68 (repérage EN 50005 : unités 7-8 = contact à FERMETURE retardé) redonne le
 *    départ dans l'autre sens ;
 *  · le contact à OUVERTURE de S2 coupe l'alimentation des trois relais quand le
 *    chariot revient à sa position de repos : tout retombe, le cycle est terminé.
 *
 * Moteur de 22 kW : la platine n'a plus rien de commun avec un départ de 1,5 kW.
 * Sectionneur GK1 ES de 97 mm, contacteurs LC1 D50 de 75 mm accouplés en inverseur
 * LC2 D50, relais thermique LRD 3357 réglé sur 42,5 A. Le simulateur n'anime pas le
 * basculement des capteurs : le cycle se raisonne sur le folio et se contrôle à
 * l'ohmmètre, comme les flotteurs de la pompe de relevage.
 *
 * Correspondances imposées par le moteur de simulation :
 *  q1 = sectionneur de tête · f2 = protection du primaire · f3 = protection du
 *  secondaire · f1 = relais thermique · km1 = marche avant · km2 = marche arrière.
 */
import type { Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, TRAFO_REF, X1, X2, liaisonsT1, netsT1 } from './common';

/** Capteur de position à galet, posé le long du rail du wagonnet (hors armoire). */
const capteur = (id: string, rep: string, name: string, y: number): Slot => ({
  id, label: `${rep} · ${name}`, key: 'limitswitch', rail: null, x: 458, y, w: 40, h: 92, rep,
});

export const TP_WAGONNET: TpDefinition = {
  id: 'wagonnet',
  title: 'Wagonnet de manutention · cycle à quatre arrêts',
  level: 'Tle Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C1 Analyser', 'C3 Définir', 'C4 Réaliser', 'C5 Contrôler', 'C7 Valider'],
  summary:
    'Deux sens de marche commandés par quatre capteurs de position et trois relais temporisés : le wagonnet enchaîne seul avant, arrière, avant, arrière et s\'arrête à son point de départ.',
  situation:
    'L\'unité de manutention de l\'atelier déplace des pièces entre quatre postes. Tu prépares l\'opération à partir du dossier — identifier les organes, dire leur fonction, choisir les références — puis tu câbles et tu mets en service le départ-moteur deux sens du wagonnet. Le cycle est entièrement câblé : aucun automate, la logique est dans les contacts.',
  plaque: {
    P: '22 kW',
    U: '400 V Δ · 660 V Y · 50 Hz',
    'cos φ': '0,77',
    'η': '97 %',
    n: '1400 tr/min',
    Pôles: '4',
    Service: 'S1 · continu',
    'T° ambiante': '40 °C',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 fils 400 V triphasé + PE, 100 A maximum au tableau général' },
    { k: 'Commande', v: '24 V ~ 50 Hz, issue du transformateur T1 protégé des deux côtés' },
    { k: 'Cycle', v: 'S1 avec S2 actionné → avant jusqu\'à S4 → 2 s → arrière jusqu\'à S3 → 2 s → avant jusqu\'à S5 → 2 s → arrière jusqu\'à S2 → arrêt' },
    { k: 'Temps de parcours', v: '3 s entre deux capteurs voisins ; cycle complet 30 s' },
    { k: 'Signalisation', v: 'H1 wagonnet sous tension · H2 wagonnet en fonctionnement' },
    { k: 'Consommations', v: 'voyants 2 VA · bobines : appel 70 VA, maintien 7 VA · cos φ du transformateur 0,7' },
    { k: 'Raccordement', v: 'vis-étrier sur tout l\'appareillage de puissance' },
    { k: 'Avant mise en service', v: 'consignation sur Q1 · VAT · continuité PE · isolement 500 V · réglage de F1 sur le courant absorbé' },
  ],

  /* ------------------------------------------------------------ A1 · préparation */
  preparation: {
    identification: [
      {
        id: 'id-q1', rep: 'Q1', invite: 'Quel organe porte ce repère en tête de l\'installation ?',
        options: [
          'Un sectionneur porte-fusibles tripolaire à contacts de précoupure',
          'Un disjoncteur moteur magnéto-thermique',
          'Un contacteur de puissance',
          'Un interrupteur différentiel',
        ],
        answer: 0,
        why: 'Q1 est un sectionneur porte-fusibles : trois cartouches pour le court-circuit, et deux contacts de précoupure qui coupent la commande avant les pôles de puissance.',
      },
      {
        id: 'id-km', rep: 'KM1 / KM2', invite: 'Que représentent ces deux repères accolés sur le schéma de puissance ?',
        options: [
          'Deux contacteurs accouplés et verrouillés : le contacteur-inverseur',
          'Un contacteur et son relais thermique',
          'Deux relais auxiliaires de temporisation',
          'Un contacteur double vitesse',
        ],
        answer: 0,
        why: 'Deux contacteurs identiques, verrouillés mécaniquement et électriquement. L\'inversion vient du CÂBLAGE : deux phases croisées entre KM1 et KM2.',
      },
      {
        id: 'id-f1', rep: 'F1', invite: 'Quel appareil est monté sous le contacteur, entre lui et le bornier moteur ?',
        options: [
          'Le relais de protection thermique',
          'Le transformateur de commande',
          'Le bloc de contacts temporisé',
          'Le parafoudre',
        ],
        answer: 0,
        why: 'Le relais thermique s\'enfiche sous le contacteur par trois barrettes ; ses contacts 95-96 et 97-98 partent, eux, dans le circuit de commande.',
      },
      {
        id: 'id-ka', rep: 'KA3 · KA4 · KA5', invite: 'Trois appareils identiques occupent le rail de commande. Lesquels ?',
        options: [
          'Des contacteurs auxiliaires équipés d\'un bloc temporisé',
          'Des relais thermiques de secours',
          'Des disjoncteurs de commande',
          'Des transformateurs d\'isolement',
        ],
        answer: 0,
        why: 'Un contacteur auxiliaire ne commande aucune puissance : il ne porte que des contacts. Le bloc temporisé clipsé en face avant ajoute les contacts retardés 55-56 et 67-68.',
      },
      {
        id: 'id-s', rep: 'S2 · S3 · S4 · S5', invite: 'Ces quatre repères, alignés le long du rail, désignent :',
        options: [
          'Des interrupteurs de position à galet',
          'Des boutons poussoirs de la porte de l\'armoire',
          'Des détecteurs de fumée',
          'Des voyants de signalisation',
        ],
        answer: 0,
        why: 'Ce sont des capteurs de position : le wagonnet les actionne mécaniquement en passant. S2 en porte deux — un à fermeture et un à ouverture.',
      },
      {
        id: 'id-t1', rep: 'T1', invite: 'Entre les deux protections Q2 et Q3, on trouve :',
        options: [
          'Le transformateur de commande 400 / 24 V',
          'Un autotransformateur de démarrage',
          'Un onduleur',
          'Un filtre antiparasite',
        ],
        answer: 0,
        why: 'Q2 protège la ligne d\'alimentation du primaire, Q3 la ligne d\'utilisation du secondaire : les deux côtés d\'un transformateur se protègent séparément, et pas avec le même calibre.',
      },
    ],
    fonctions: [
      {
        id: 'fn-sect', rep: 'Q1', invite: 'Quelle est la fonction du sectionneur ?',
        options: [
          'Isoler l\'installation du réseau pour travailler en sécurité ; il n\'a pas de pouvoir de coupure',
          'Couper le courant de court-circuit en charge',
          'Protéger le moteur contre les surcharges',
          'Commander la marche et l\'arrêt du moteur',
        ],
        answer: 0,
        why: 'Le sectionneur assure la SÉPARATION. Il ne s\'ouvre pas en charge : il n\'a pas de pouvoir de coupure. C\'est sur lui qu\'on consigne.',
      },
      {
        id: 'fn-fus', rep: 'Fusibles aM', invite: 'Contre quoi protègent les cartouches aM du sectionneur ?',
        options: [
          'Contre les courts-circuits uniquement',
          'Contre les surcharges uniquement',
          'Contre les surcharges et les courts-circuits',
          'Contre les défauts d\'isolement',
        ],
        answer: 0,
        why: 'Les aM sont les fusibles d\'accompagnement moteur : ils laissent passer la pointe de démarrage et ne coupent que le court-circuit. La surcharge, c\'est l\'affaire du relais thermique.',
      },
      {
        id: 'fn-km', rep: 'KM1 / KM2', invite: 'Quelle est la fonction du contacteur inverseur ?',
        options: [
          'Ouvrir et fermer le circuit de puissance sur ordre de la commande, dans un sens ou dans l\'autre',
          'Isoler le circuit pour l\'entretien',
          'Limiter le courant de démarrage',
          'Mesurer le courant absorbé',
        ],
        answer: 0,
        why: 'Le contacteur, lui, POSSÈDE le pouvoir de coupure : il manœuvre en charge, commandé par sa bobine. La fonction inverseur est obtenue par câblage, en croisant deux phases.',
      },
      {
        id: 'fn-th', rep: 'F1', invite: 'Quelle est la fonction du relais thermique ?',
        options: [
          'Protéger le moteur contre les surcharges et les démarrages trop longs, en coupant le circuit de commande',
          'Couper directement le circuit de puissance sur surcharge',
          'Protéger l\'installation contre les courts-circuits',
          'Détecter les défauts d\'isolement',
        ],
        answer: 0,
        why: 'Le bilame ne coupe pas la puissance : il ouvre son contact 95-96, la bobine du contacteur retombe, et c\'est le contacteur qui coupe. Le thermique voit aussi l\'absence de phase.',
      },
      {
        id: 'fn-verr', rep: 'KM1:21-22 / KM2:21-22', invite: 'À quoi servent ces deux contacts à ouverture, croisés entre les deux bobines ?',
        options: [
          'Au verrouillage électrique : ils interdisent que les deux contacteurs collent en même temps',
          'À l\'auto-maintien de la marche avant',
          'À la temporisation de 2 secondes',
          'À la signalisation du défaut',
        ],
        answer: 0,
        why: 'Deux contacteurs collés ensemble mettraient deux phases en court-circuit franc. Le verrouillage électrique l\'interdit — et le verrouillage mécanique le double, au cas où un contact resterait soudé.',
      },
      {
        id: 'fn-tempo', rep: 'KA4:67-68', invite: 'Ce contact temporisé au travail, réglé à 2 s, fait quoi exactement ?',
        options: [
          'Il se ferme 2 secondes après que la bobine de KA4 a été alimentée',
          'Il s\'ouvre 2 secondes après que la bobine a été alimentée',
          'Il se ferme 2 secondes après la retombée de la bobine',
          'Il reste fermé pendant 2 secondes puis s\'ouvre définitivement',
        ],
        answer: 0,
        why: 'Temporisé au TRAVAIL : le décompte part à l\'excitation de la bobine. Au repérage EN 50005, les unités 7-8 désignent le contact à fermeture retardé — d\'où 67-68. C\'est lui qui redonne le départ dans l\'autre sens après l\'arrêt de 2 s.',
      },
    ],
  },

  /* ---------------------------------------------------------------- A1 · matériel */
  postes: [
    {
      id: 'q1', name: 'Q1 · Sectionneur porte-fusibles',
      need: 'Isoler le départ, 3 pôles, sans marche en monophasé, raccordement vis-étrier, deux précoupures',
      options: [
        { key: 'gk1es', ref: 'GK1 ES', spec: '50 A · cartouches 14 × 51 · 2 précoupures', ok: true, why: 'Le courant absorbé est de 42,5 A : le corps 50 A convient, avec des cartouches de taille 14 × 51. Les deux précoupures coupent la commande avant la puissance.' },
        { key: 'gk1es', ref: 'LS1 D32', spec: '32 A · cartouches 10 × 38 · sans précoupure', why: '32 A pour un moteur qui en absorbe 42,5 : le corps serait sous-calibré, et sans précoupure la commande resterait alimentée à l\'ouverture.' },
        { key: 'gk1es', ref: 'GK1 FS', spec: '125 A · cartouches 22 × 58 · 2 précoupures', why: 'Surdimensionné : les cartouches 22 × 58 ne descendent pas au calibre utile, et l\'encombrement triple sans bénéfice.' },
      ],
    },
    {
      id: 'fus', name: 'Cartouches fusibles de Q1',
      need: 'Protéger le départ moteur contre les courts-circuits, sans déclencher au démarrage',
      options: [
        { key: 'gk1es', ref: 'DF2 EA50', spec: 'aM · 50 A · 14 × 51', ok: true, why: 'Classe aM, accompagnement moteur : elle supporte la pointe de démarrage. 50 A est le premier calibre au-dessus des 42,5 A absorbés, dans la taille du corps.' },
        { key: 'gk1es', ref: 'DF2 EA40', spec: 'aM · 40 A · 14 × 51', why: '40 A est en dessous du courant absorbé de 42,5 A : la cartouche fondrait en service normal.' },
        { key: 'gk1es', ref: 'DF2 CA50', spec: 'gG · 50 A · 10 × 38', why: 'Deux fautes : une gG protège aussi contre les surcharges et coupe au démarrage, et la taille 10 × 38 n\'entre pas dans ce corps.' },
      ],
    },
    {
      id: 'km', name: 'KM1 / KM2 · Contacteur inverseur',
      need: '22 kW sous 400 V en AC-3, bobine 24 V ~ 50 Hz, raccordement vis-étrier',
      options: [
        { key: 'lc1d50', ref: 'LC2 D50 B7', spec: '22 kW / 400 V · bobine 24 V ~ · verrouillage mécanique', ok: true, why: 'La ligne 22 kW sous 400 V du catalogue donne LC2 D50, courant d\'emploi 50 A. Le repère de tension B7 correspond à la bobine 24 V en 50/60 Hz (B5 en 50 Hz seul).' },
        { key: 'lc1d50', ref: 'LC2 D38 B7', spec: '18,5 kW / 400 V · bobine 24 V ~', why: 'Un cran trop petit : 18,5 kW et 38 A d\'emploi pour un moteur de 22 kW qui absorbe 42,5 A.' },
        { key: 'lc1d50', ref: 'LC2 D50 P7', spec: '22 kW / 400 V · bobine 230 V ~', why: 'Le calibre est bon mais la bobine est en 230 V : le cahier des charges impose une commande en 24 V.' },
      ],
    },
    {
      id: 'f1', name: 'F1 · Relais de protection thermique',
      need: 'Classe 10 A, monté sous le contacteur, réglable autour de 42,5 A, vis-étrier',
      options: [
        { key: 'lrd3357', ref: 'LRD 3357', spec: 'zone 37…50 A · classe 10 A · fusible aM 63 A', ok: true, why: 'La zone 37…50 A encadre les 42,5 A absorbés, et c\'est la ligne qui s\'associe aux contacteurs D40…D95.' },
        { key: 'lrd3357', ref: 'LRD 3355', spec: 'zone 30…40 A · classe 10 A', why: 'La zone s\'arrête à 40 A : impossible de régler le relais sur le courant réellement absorbé.' },
        { key: 'lrd3357', ref: 'LRD 3361', spec: 'zone 55…70 A · classe 10 A', why: 'Réglage minimal 55 A : le moteur aurait le temps de brûler avant que le bilame ne bouge.' },
      ],
    },
    {
      id: 'ka', name: 'KA3 · KA4 · KA5 · Relais auxiliaires',
      need: 'Contacts nécessaires : deux à fermeture et un à ouverture par relais, bobine 24 V ~',
      options: [
        { key: 'cad32', ref: 'CAD 32 B7', spec: '3 F + 2 O · bobine 24 V ~ · vis-étrier', ok: true, why: 'Trois contacts à fermeture et deux à ouverture couvrent l\'auto-maintien, la validation de l\'arrêt suivant et le verrouillage, avec une voie de réserve.' },
        { key: 'cad32', ref: 'CAD 50 B7', spec: '5 F · bobine 24 V ~', why: 'Cinq contacts mais tous à fermeture : il manque le contact à ouverture qui coupe la marche en cours.' },
        { key: 'cad32', ref: 'CAD 32 P7', spec: '3 F + 2 O · bobine 230 V ~', why: 'Bonne composition, mauvaise bobine : la commande est en 24 V.' },
      ],
    },
    {
      id: 'tempo', name: 'Blocs de temporisation',
      need: 'Redonner le départ 2 secondes après chaque arrêt, un bloc par relais d\'arrêt',
      options: [
        { key: 'cad32', ref: 'LAD T0', spec: 'temporisé travail · 0,1 à 3 s · 1 F + 1 O', ok: true, why: 'Temporisé au TRAVAIL : le décompte part à l\'excitation, ce qu\'il faut pour repartir 2 s après l\'arrêt. La plage 0,1…3 s encadre le réglage demandé.' },
        { key: 'cad32', ref: 'LAD T2', spec: 'temporisé travail · 0,1 à 30 s', half: true, why: 'Le type est bon et la plage contient 2 s, mais régler 2 s sur une échelle qui va jusqu\'à 30 s est bien moins précis que sur une échelle 0,1…3 s.' },
        { key: 'cad32', ref: 'LAD R0', spec: 'temporisé repos · 0,1 à 3 s', why: 'Temporisé au REPOS : le décompte partirait à la retombée de la bobine. Le wagonnet repartirait au mauvais moment.' },
      ],
    },
    {
      id: 't1', name: 'T1 · Transformateur de commande',
      need: 'Primaire 400 V, secondaire 24 V, puissance à déterminer à partir des consommations',
      options: [
        { key: 'trafoleg', ref: 'Legrand 442 32', spec: '63 VA · 230-400 / 24-48 V · vis', ok: true, why: 'Puissance d\'appel 0,8 × (35 + 4 + 70) = 87,2 VA. À cos φ 0,7, un 63 VA admet 100 VA en pointe : il convient, et le 40 VA (63 VA admissibles) non.' },
        { key: 'trafoleg', ref: 'Legrand 442 31', spec: '40 VA · 230-400 / 24-48 V', why: 'À cos φ 0,7, un 40 VA n\'admet que 63 VA instantanés : sous les 87,2 VA d\'appel, la tension s\'effondre et les contacteurs ne collent pas.' },
        { key: 'trafoleg', ref: 'Legrand 442 36', spec: '400 VA · 230-400 / 24-48 V', why: 'Six fois la puissance utile : encombrement, prix et courant d\'appel inutiles. On dimensionne au plus juste au-dessus du besoin.' },
      ],
    },
    {
      id: 'q2', name: 'Q2 · Protection du primaire de T1',
      need: 'Ligne d\'alimentation d\'un transformateur de 63 VA sous 400 V monophasé',
      options: [
        { key: 'mcb2ph', ref: 'aM 1 A (ou disjoncteur courbe C 1 A)', spec: '2 pôles protégés · 400 V', ok: true, why: 'Un transformateur ne peut pas générer de surcharge à lui seul : sa ligne d\'alimentation n\'est protégée que contre les courts-circuits. Le tableau donne 1 A en aM comme en courbe C pour 63 VA sous 400 V.' },
        { key: 'mcb2ph', ref: 'gG 6 A', spec: '2 pôles · 400 V', why: 'Classe et calibre faux : à la mise sous tension, le courant d\'appel atteint 25 fois le courant nominal pendant 10 ms — et 6 A est de toute façon très au-dessus du besoin.' },
        { key: 'mcb2ph', ref: 'Disjoncteur courbe C 10 A', spec: '2 pôles · 400 V', why: 'Dix fois trop : un court-circuit au primaire ne serait pas coupé assez tôt pour protéger le transformateur.' },
      ],
    },
    {
      id: 'q3', name: 'Q3 · Protection du secondaire de T1',
      need: 'Ligne d\'utilisation en 24 V, à protéger contre les surcharges ET les courts-circuits',
      options: [
        { key: 'mcb1pn', ref: 'Fusible 3,15 A type T', spec: '24 V · temporisé', ok: true, why: 'Côté utilisation, la ligne doit être protégée contre les surcharges et les courts-circuits. Le tableau donne 3,15 A type T pour un 63 VA en 24 V.' },
        { key: 'mcb1pn', ref: 'Fusible 2 A type T', spec: '24 V · temporisé', why: 'Calibre du 40 VA : sur un 63 VA, il fondrait à l\'appel des bobines.' },
        { key: 'mcb1pn', ref: 'Fusible 16 A gG', spec: '24 V', why: 'Calibre du 400 VA : une surcharge du circuit de commande passerait totalement inaperçue.' },
      ],
    },
    {
      id: 'bornes', name: 'X1 / X2 · Borniers',
      need: 'X1 : puissance 10 mm² · X2 : commande et raccordement des capteurs',
      options: [
        { key: 'termgrey', ref: 'UT 10 + UT 2,5', spec: 'X1 en 10 mm², X2 en 2,5 mm² repérés', ok: true, why: 'Le départ moteur passe 42,5 A : la section est en 10 mm². La commande reste en 2,5 mm², et chaque capteur revient sur une borne repérée pour pouvoir être isolé.' },
        { key: 'termgrey', ref: 'UT 2,5 partout', spec: 'bornes 2,5 mm²', why: 'Une borne 2,5 mm² ne reçoit ni la section ni le courant du départ moteur.' },
        { key: 'termgrey', ref: 'Dominos dans la goulotte', spec: 'connecteurs à vis', why: 'Interdit en armoire : les raccordements se font sur bornes montées sur rail, repérées et accessibles.' },
      ],
    },
  ],

  /* ------------------------------------------------------------------- platine */
  rails: [150, 380, 610, 810, 990],
  armoire: 1130,
  slots: [
    { id: 'q1', label: 'Q1 · Sectionneur porte-fusibles 50 A · 2 précoupures', key: 'gk1es', rail: 0, x: 48, rep: 'Q1' },
    { id: 'km1', label: 'KM1 · Marche avant (bloc additif LAD N11)', key: 'lc1d50n', rail: 0, x: 199, dy: 6, rep: 'KM1' },
    { id: 'km2', label: 'KM2 · Marche arrière', key: 'lc1d50', rail: 1, x: 48, dy: 6, rep: 'KM2' },
    { id: 'f1', label: 'F1 · Relais thermique 37…50 A réglé sur 42,5 A', key: 'lrd3357', rail: 1, x: 167, dy: 4, rep: 'F1' },
    { id: 'f2', label: 'Q2 · Protection du primaire de T1 · 1 A', key: 'mcb2ph', rail: 1, x: 286, rep: 'Q2' },
    { id: 't1', label: 'T1 · Transformateur de commande 63 VA · 230-400 / 24-48 V', key: 'trafoleg', rail: 2, x: 48, rep: 'T1' },
    { id: 'f3', label: 'Q3 · Protection du secondaire 24 V · 3,15 A', key: 'mcb1pn', rail: 2, x: 180, rep: 'Q3' },
    { id: 'ka3', label: 'KA3 · Arrêt sur S3, puis départ avant (tempo 2 s)', key: 'cad32', rail: 2, x: 242, rep: 'KA3' },
    { id: 'ka4', label: 'KA4 · Arrêt sur S4, puis départ arrière (tempo 2 s)', key: 'cad32', rail: 3, x: 48, rep: 'KA4' },
    { id: 'ka5', label: 'KA5 · Arrêt sur S5, puis départ arrière (tempo 2 s)', key: 'cad32', rail: 3, x: 123, rep: 'KA5' },
    ...X1(198, 3),
    ...X2(48, 12, 4, {
      subs: ['S1', 'S1ret', 'S2com', 'S2-NO', 'S2-NF', 'CAPT', 'S3', 'S4', 'S5', 'H1', 'H2', '0V'],
      groupLabel: 'X2 · commande, porte et capteurs',
    }),
    capteur('sf2', 'S2', 'Capteur de position · repos et fin de cycle', 40),
    capteur('sf3', 'S3', 'Capteur de position · arrêt au retour', 190),
    capteur('sf4', 'S4', 'Capteur de position · arrêt à l\'aller', 340),
    capteur('sf5', 'S5', 'Capteur de position · arrêt en bout de course', 490),
  ],
  annexItems: [],
  recvItems: [],

  liaisons: [
    // ---- puissance : arrivée et sectionnement ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    // ---- KM1 : marche avant, phases dans l'ordre ----
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    // ---- KM2 : marche arrière, L1 et L3 croisées ----
    L('q1.2', 'km2.5', 'L1'), L('q1.4', 'km2.3', 'L2'), L('q1.6', 'km2.1', 'L3'),
    // ---- départs réunis, puis relais thermique et bornier moteur ----
    L('km2.2', 'km1.2', 'L1'), L('km2.4', 'km1.4', 'L2'), L('km2.6', 'km1.6', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),

    // ---- alimentation de la commande, par les précoupures du sectionneur ----
    // Elles s'ouvrent AVANT les pôles de puissance : la commande tombe la première.
    L('x1_1.a', 'q1.13', 'L1'), L('q1.14', 'f2.1', 'L1'),
    L('x1_2.a', 'q1.23', 'L2'), L('q1.24', 'f2.3', 'L2'),
    ...liaisonsT1({ retour: 'x2_12.a', terre: 'x1_5.a' }),
    // H1 se branche AVANT le contact du thermique : il signale la présence du 24 V,
    // pas l'absence de défaut.
    L('f3.2', 'x2_10.a', 'C'),
    // rail 13 : tout le reste de la commande passe par le contact 95-96 de F1
    L('f3.2', 'f1.95', 'C'), L('f1.96', 'km1.13', 'C'),

    // ---- colonne « en service » : H2 s'allume dans les deux sens ----
    L('f1.96', 'km1.53', 'C'), L('km1.54', 'x2_11.a', 'C'),
    L('f1.96', 'km2.13', 'C'), L('km2.14', 'x2_11.a', 'C'),

    // ---- colonne « avant » (KM1) ----
    // départ : S1 en porte, autorisé seulement si le chariot est au repos sur S2
    L('f1.96', 'x2_1.a', 'C'), L('x2_2.a', 'x2_3.a', 'C'),
    L('x2_4.a', 'ka4.11', 'C'),
    // auto-maintien de KM1, en parallèle sur S1 et S2
    L('km1.14', 'ka4.11', 'C'),
    // reprise du départ 2 s après l'arrêt sur S3
    L('f1.96', 'ka3.67', 'C'), L('ka3.68', 'ka5.11', 'C'),
    L('ka4.12', 'ka5.11', 'C'),
    // verrouillage électrique par le contact à ouverture de KM2
    L('ka5.12', 'km2.21', 'C'), L('km2.22', 'km1.A1', 'C'),

    // ---- colonne « arrière » (KM2) ----
    L('f1.96', 'ka4.67', 'C'), L('ka4.68', 'ka3.11', 'C'),
    L('ka3.12', 'km1.21', 'C'),
    L('f1.96', 'ka5.67', 'C'), L('ka5.68', 'km1.21', 'C'),
    L('km1.22', 'km2.A1', 'C'),

    // ---- rail 33 : alimentation des relais d'arrêt, coupée par S2 au retour ----
    L('f1.96', 'x2_3.a', 'C'), L('x2_5.a', 'x2_6.a', 'C'),

    // ---- KA4 : arrêt sur S4 ----
    L('x2_8.a', 'ka4.A1', 'C'), L('x2_6.a', 'ka4.43', 'C'), L('ka4.44', 'ka4.A1', 'C'),
    // ---- KA3 : arrêt sur S3, validé seulement après le passage en S4 ----
    L('x2_7.a', 'ka4.33', 'C'), L('ka4.34', 'ka3.A1', 'C'),
    L('x2_6.a', 'ka3.43', 'C'), L('ka3.44', 'ka3.A1', 'C'),
    // ---- KA5 : arrêt sur S5, validé seulement après le passage en S3 ----
    L('x2_9.a', 'ka3.33', 'C'), L('ka3.34', 'ka5.A1', 'C'),
    L('x2_6.a', 'ka5.43', 'C'), L('ka5.44', 'ka5.A1', 'C'),

    // ---- retours 0 V ----
    L('km1.A2', 'x2_12.a', 'C0'), L('km2.A2', 'km1.A2', 'C0'),
    L('ka3.A2', 'km1.A2', 'C0'), L('ka4.A2', 'ka3.A2', 'C0'), L('ka5.A2', 'ka4.A2', 'C0'),
    // mise à la terre du point neutre de la commande
    L('x2_12.a', 'x1_5.a', 'PE'),

    // ---- porte : bouton de départ de cycle et voyants ----
    L('x2_1.b', 'S1.13', 'C', 'door'), L('S1.14', 'x2_2.b', 'C', 'door'),
    L('x2_10.b', 'H1.X1', 'C', 'door'), L('x2_11.b', 'H2.X1', 'C', 'door'),
    L('x2_12.b', 'H1.X2', 'C0', 'door'), L('H1.X2', 'H2.X2', 'C0', 'door'),

    // ---- capteurs de position, le long du rail du wagonnet ----
    L('x2_3.b', 'sf2.11', 'C', 'door'), L('sf2.14', 'x2_4.b', 'C', 'door'),
    L('sf2.12', 'x2_5.b', 'C', 'door'),
    L('x2_6.b', 'sf3.11', 'C', 'door'), L('sf3.11', 'sf4.11', 'C', 'door'), L('sf4.11', 'sf5.11', 'C', 'door'),
    L('sf3.14', 'x2_7.b', 'C', 'door'), L('sf4.14', 'x2_8.b', 'C', 'door'), L('sf5.14', 'x2_9.b', 'C', 'door'),

    // ---- câblage installateur (réseau et câble moteur) ----
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.L2', 'x1_2.b', 'L2', 'pre'), L('RES.L3', 'x1_3.b', 'L3', 'pre'),
    L('RES.N', 'x1_4.b', 'N', 'pre'), L('RES.PE', 'x1_5.b', 'PE', 'pre'),
    L('x1_6.b', 'M.U1', 'L1', 'pre'), L('x1_7.b', 'M.V1', 'L2', 'pre'), L('x1_8.b', 'M.W1', 'L3', 'pre'),
    L('x1_9.b', 'M.PE', 'PE', 'pre'),
  ],

  nets: {
    // bornier de puissance
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'L2', live: 'always' }, 'x1_2.b': { net: 'L2', live: 'always' },
    'x1_3.a': { net: 'L3', live: 'always' }, 'x1_3.b': { net: 'L3', live: 'always' },
    'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
    'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
    'x1_6.a': { net: 'U', live: 'run' }, 'x1_6.b': { net: 'U', live: 'run' },
    'x1_7.a': { net: 'V', live: 'run' }, 'x1_7.b': { net: 'V', live: 'run' },
    'x1_8.a': { net: 'W', live: 'run' }, 'x1_8.b': { net: 'W', live: 'run' },
    'x1_9.a': { net: 'PE', live: 'always' }, 'x1_9.b': { net: 'PE', live: 'always' },
    // sectionneur et ses précoupures
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'L2', live: 'always' }, 'q1.5': { net: 'L3', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'L2', live: 'q1' }, 'q1.6': { net: 'L3', live: 'q1' },
    'q1.13': { net: 'L1', live: 'always' }, 'q1.14': { net: 'L1', live: 'q1' },
    'q1.23': { net: 'L2', live: 'always' }, 'q1.24': { net: 'L2', live: 'q1' },
    // KM1 · marche avant
    'km1.1': { net: 'L1', live: 'q1' }, 'km1.3': { net: 'L2', live: 'q1' }, 'km1.5': { net: 'L3', live: 'q1' },
    'km1.2': { net: 'U', live: 'run' }, 'km1.4': { net: 'V', live: 'run' }, 'km1.6': { net: 'W', live: 'run' },
    'km1.13': { net: 'C', live: 'ctl' }, 'km1.14': { net: 'C', live: 'km1' },
    'km1.21': { net: 'C', live: 'ctl' }, 'km1.22': { net: 'C', live: 'ctl' },
    'km1.53': { net: 'C', live: 'ctl' }, 'km1.54': { net: 'C', live: 'km1' },
    'km1.A1': { net: 'C', live: 'km1' }, 'km1.A2': { net: 'C0', live: 'always' },
    // KM2 · marche arrière (L1 et L3 croisées)
    'km2.1': { net: 'L3', live: 'q1' }, 'km2.3': { net: 'L2', live: 'q1' }, 'km2.5': { net: 'L1', live: 'q1' },
    'km2.2': { net: 'U', live: 'run' }, 'km2.4': { net: 'V', live: 'run' }, 'km2.6': { net: 'W', live: 'run' },
    'km2.13': { net: 'C', live: 'ctl' }, 'km2.14': { net: 'C', live: 'off' },
    'km2.21': { net: 'C', live: 'ctl' }, 'km2.22': { net: 'C', live: 'ctl' },
    'km2.A1': { net: 'C', live: 'off' }, 'km2.A2': { net: 'C0', live: 'always' },
    // relais thermique
    'f1.1': { net: 'U', live: 'run' }, 'f1.3': { net: 'V', live: 'run' }, 'f1.5': { net: 'W', live: 'run' },
    'f1.2': { net: 'U', live: 'run' }, 'f1.4': { net: 'V', live: 'run' }, 'f1.6': { net: 'W', live: 'run' },
    'f1.95': { net: 'C', live: 'f3' }, 'f1.96': { net: 'C', live: 'ctl' },
    'f1.97': { net: 'C', live: 'f3' }, 'f1.98': { net: 'C', live: 'off' },
    // protection du primaire
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.3': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.4': { net: 'L2', live: 'f2' },
    // transformateur de commande
    ...netsT1('f2'),
    // protection du secondaire
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    'f3.N': { net: 'C0', live: 'always' }, 'f3.N2': { net: 'C0', live: 'always' },
    // relais d'arrêt et leurs blocs temporisés
    'ka3.A1': { net: 'C', live: 'off' }, 'ka3.A2': { net: 'C0', live: 'always' },
    'ka3.11': { net: 'C', live: 'ctl' }, 'ka3.12': { net: 'C', live: 'ctl' },
    'ka3.43': { net: 'C', live: 'ctl' }, 'ka3.44': { net: 'C', live: 'off' },
    'ka3.33': { net: 'C', live: 'off' }, 'ka3.34': { net: 'C', live: 'off' },
    'ka3.67': { net: 'C', live: 'ctl' }, 'ka3.68': { net: 'C', live: 'off' },
    'ka4.A1': { net: 'C', live: 'off' }, 'ka4.A2': { net: 'C0', live: 'always' },
    'ka4.11': { net: 'C', live: 'ctl' }, 'ka4.12': { net: 'C', live: 'ctl' },
    'ka4.43': { net: 'C', live: 'ctl' }, 'ka4.44': { net: 'C', live: 'off' },
    'ka4.33': { net: 'C', live: 'off' }, 'ka4.34': { net: 'C', live: 'off' },
    'ka4.67': { net: 'C', live: 'ctl' }, 'ka4.68': { net: 'C', live: 'off' },
    'ka5.A1': { net: 'C', live: 'off' }, 'ka5.A2': { net: 'C0', live: 'always' },
    'ka5.11': { net: 'C', live: 'ctl' }, 'ka5.12': { net: 'C', live: 'ctl' },
    'ka5.43': { net: 'C', live: 'ctl' }, 'ka5.44': { net: 'C', live: 'off' },
    'ka5.67': { net: 'C', live: 'ctl' }, 'ka5.68': { net: 'C', live: 'off' },
    // bornier de commande
    'x2_1.a': { net: 'C', live: 'ctl' }, 'x2_1.b': { net: 'C', live: 'ctl' },
    'x2_2.a': { net: 'C', live: 'ctl' }, 'x2_2.b': { net: 'C', live: 'ctl' },
    'x2_3.a': { net: 'C', live: 'ctl' }, 'x2_3.b': { net: 'C', live: 'ctl' },
    'x2_4.a': { net: 'C', live: 'ctl' }, 'x2_4.b': { net: 'C', live: 'ctl' },
    'x2_5.a': { net: 'C', live: 'ctl' }, 'x2_5.b': { net: 'C', live: 'ctl' },
    'x2_6.a': { net: 'C', live: 'ctl' }, 'x2_6.b': { net: 'C', live: 'ctl' },
    'x2_7.a': { net: 'C', live: 'off' }, 'x2_7.b': { net: 'C', live: 'off' },
    'x2_8.a': { net: 'C', live: 'off' }, 'x2_8.b': { net: 'C', live: 'off' },
    'x2_9.a': { net: 'C', live: 'off' }, 'x2_9.b': { net: 'C', live: 'off' },
    'x2_10.a': { net: 'C', live: 'f3' }, 'x2_10.b': { net: 'C', live: 'f3' },
    'x2_11.a': { net: 'C', live: 'km1' }, 'x2_11.b': { net: 'C', live: 'km1' },
    'x2_12.a': { net: 'C0', live: 'always' }, 'x2_12.b': { net: 'C0', live: 'always' },
    // capteurs de position
    'sf2.11': { net: 'C', live: 'ctl' }, 'sf2.14': { net: 'C', live: 'ctl' }, 'sf2.12': { net: 'C', live: 'ctl' },
    'sf3.11': { net: 'C', live: 'ctl' }, 'sf3.14': { net: 'C', live: 'off' }, 'sf3.12': { net: 'C', live: 'off' },
    'sf4.11': { net: 'C', live: 'ctl' }, 'sf4.14': { net: 'C', live: 'off' }, 'sf4.12': { net: 'C', live: 'off' },
    'sf5.11': { net: 'C', live: 'ctl' }, 'sf5.14': { net: 'C', live: 'off' }, 'sf5.12': { net: 'C', live: 'off' },
    // moteur et coffret de porte
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S1.13': { net: 'C', live: 'ctl' }, 'S1.14': { net: 'C', live: 'ctl' },
    'H1.X1': { net: 'C', live: 'f3' }, 'H1.X2': { net: 'C0', live: 'always' },
    'H2.X1': { net: 'C', live: 'km1' }, 'H2.X2': { net: 'C0', live: 'always' },
  },

  tests: [
    ...BASE_TESTS,
    {
      id: 'croise',
      title: 'Vérification du croisement des phases',
      how: 'Multimètre en Ω, appareils au repos : contrôle que l\'entrée 1 de KM2 est sur la même phase que l\'entrée 5 de KM1 (L3), et l\'entrée 5 de KM2 sur L1.',
      expected: 'continuité q1:6 – km2:1 et q1:2 – km2:5, aucune continuité entre deux phases',
    },
    {
      id: 'verr',
      title: 'Essai du verrouillage électrique',
      how: 'Multimètre en Ω entre KM2:22 et KM1:A1 : enfonce l\'armature de KM2 à la main, le contact 21-22 doit ouvrir. Recommence en croisant.',
      expected: 'continuité au repos, circuit ouvert (OL) dès que l\'autre contacteur est enfoncé',
    },
    {
      id: 'valid',
      title: 'Essai des validations d\'arrêt',
      how: 'Multimètre en Ω entre X2:7 et KA3:A1 : le chemin ne doit se fermer que si l\'armature de KA4 est enfoncée. Recommence entre X2:9 et KA5:A1 avec KA3.',
      expected: 'OL au repos, continuité quand le relais amont est enfoncé — c\'est ce qui empêche l\'arrêt sur S3 à l\'aller',
    },
    {
      id: 'tempo',
      title: 'Réglage des trois blocs temporisés',
      how: 'Molette de chaque bloc temporisé sur 2 s. Ohmmètre entre 67 et 68 : le contact ne doit se fermer que 2 s après l\'excitation de la bobine.',
      expected: 'les trois blocs réglés sur 2 s, contact 67-68 ouvert au repos',
    },
    {
      id: 'reglage',
      title: 'Réglage du relais thermique',
      how: 'Molette de F1 sur le courant absorbé calculé à partir de la plaque signalétique.',
      expected: 'F1 réglé sur 42,5 A, dans sa plage 37…50 A',
    },
  ],

  mesures: [
    {
      id: 'rpe', title: 'Continuité du PE jusqu\'à la carcasse moteur', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'M.PE', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement U1 / PE sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'M.U1', b: 'M.PE', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'renr', title: 'Résistance d\'un enroulement (U1 – U2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.U2', min: 0.05, max: 1.2, unit: 'Ω',
    },
    {
      id: 'rverr', title: 'Continuité du contact de verrouillage de KM2 (21-22)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'km2.21', b: 'km2.22', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'u400', title: 'Tension composée en aval du sectionneur', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'run',
    },
    {
      id: 'u24', title: 'Tension de commande au secondaire de T1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 't1.24b', b: 't1.0a', min: 22, max: 26, unit: 'V', when: 'ctl',
    },
    {
      id: 'iL', title: 'Courant de ligne à la pince (KM1:2 → F1:1)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>f1.1', min: 35, max: 50, unit: 'A', when: 'run',
    },
    {
      id: 'n', title: 'Vitesse de rotation au tachymètre', stage: 'sousTension',
      instrument: 'tach', dial: 'tr/min', min: 1350, max: 1480, unit: 'tr/min', when: 'run',
    },
  ],

  faults: [
    {
      id: 'a2', title: 'Fil A2 de la bobine KM1 desserré',
      symptom: 'KM1 vibre et retombe dès l\'appui sur S1 : le wagonnet ne part pas, alors que la marche arrière se comporte normalement.',
      fix: 'Resserrer A2 et refaire la continuité KM1 A2 – X2:12.',
      coupe: 'km1.A2>x2_12.a', action: 'Resserrer le fil sur A2 et contrôler la continuité jusqu\'au 0 V',
    },
    {
      id: 'tempo4', title: 'Fil KA4:68 → KA3:11 débranché (sortie de la temporisation)',
      symptom: 'Le wagonnet part en avant, s\'arrête bien sur S4 — et ne repart jamais en arrière, alors que KA4 est collé et sa temporisation écoulée.',
      fix: 'Reconnecter la sortie 68 du bloc temporisé de KA4 sur le contact 11 de KA3.',
      coupe: 'ka4.68>ka3.11', action: 'Reconnecter la sortie 68 du bloc temporisé de KA4 sur KA3:11',
    },
    {
      id: 'l2', title: 'Phase L2 coupée entre F1:4 et X1:7',
      symptom: 'Le moteur ronfle sans démarrer dans les deux sens, courant anormal sur L1 et L3, F1 finit par déclencher.',
      fix: 'Refaire la liaison F1:4 → X1:7 (conducteur V1), puis réarmer F1.',
      coupe: 'f1.4>x1_7.a', action: 'Refaire la liaison F1:4 → X1:7, puis réarmer F1',
    },
  ],

  quiz: [
    {
      q: 'Pourquoi le wagonnet ne s\'arrête-t-il pas sur S3 à l\'aller, alors qu\'il passe dessus ?',
      options: [
        'Parce que le contact 33-34 de KA4 est en série avec S3 : l\'arrêt n\'est validé qu\'après le passage en S4',
        'Parce que S3 est trop loin du chariot pour être actionné',
        'Parce que la temporisation de KA3 n\'est pas encore écoulée',
        'Parce que KM1 verrouille S3 pendant la marche avant',
      ],
      answer: 0,
    },
    {
      q: 'Que se passe-t-il si le fusible de Q3 est hors service ?',
      options: [
        'Plus aucune alimentation du circuit de commande : rien ne colle, H1 reste éteint',
        'Seul le sens arrière est perdu',
        'Le moteur tourne mais sans temporisation',
        'Rien, le circuit de commande est doublé',
      ],
      answer: 0,
    },
    {
      q: 'Le courant absorbé par M1 vaut 42,5 A. D\'où vient cette valeur ?',
      options: [
        'De Pa = Pu / η puis I = Pa / (U · cos φ · √3)',
        'De la lecture directe sur la plaque signalétique',
        'De I = P / U, sans tenir compte du rendement',
        'Du calibre du relais thermique choisi',
      ],
      answer: 0,
    },
  ],

  /* -------------------------------------------------- folio du circuit de commande */
  folio: {
    railHaut: '24 V — secondaire de T1',
    railBas: 'com — retour 0 V, relié à la terre',
    source: 't1.24b', repSource: 'T1:24b',
    retour: 't1.0a', repRetour: 'T1:0a',
    tete: {
      type: 'disjoncteur', a: 'f3.1', b: 'f3.2',
      rep: 'Q3', legende: 'protection du 24 V', conducteur: '25',
    },
    pied: {
      type: 'disjoncteur', a: 'f3.N', b: 'f3.N2',
      rep: 'Q3', legende: 'sectionnement du 0 V',
    },
    colonnes: [
      {
        id: 'avant', dx: 0,
        elements: [
          { type: 'contactNF', a: 'f1.95', b: 'f1.96', rep: 'F1', bornes: ['95', '96'],
            actionneur: 'bilame', legende: 'relais thermique', conducteur: '13' },
          { type: 'borne', a: 'x2_1.a', rep: 'X2:1' },
          { type: 'contactNO', a: 'S1.13', b: 'S1.14', rep: 'S1', bornes: ['13', '14'],
            actionneur: 'poussoir', legende: 'départ de cycle' },
          { type: 'borne', a: 'x2_2.a', rep: 'X2:2' },
          { type: 'borne', a: 'x2_3.a', rep: 'X2:3' },
          { type: 'contactNO', a: 'sf2.11', b: 'sf2.14', rep: 'S2', bornes: ['11', '14'],
            actionneur: 'galet', legende: 'chariot au repos' },
          { type: 'borne', a: 'x2_4.a', rep: 'X2:4' },
          { type: 'contactNF', a: 'ka4.11', b: 'ka4.12', rep: 'KA4', bornes: ['11', '12'],
            legende: 'arrêt sur S4' },
          { type: 'contactNF', a: 'ka5.11', b: 'ka5.12', rep: 'KA5', bornes: ['11', '12'],
            legende: 'arrêt sur S5' },
          { type: 'contactNF', a: 'km2.21', b: 'km2.22', rep: 'KM2', bornes: ['21', '22'],
            legende: 'verrouillage' },
          { type: 'bobine', a: 'km1.A1', b: 'km1.A2', rep: 'KM1', legende: 'marche avant' },
          { type: 'borne', a: 'x2_12.a', rep: 'X2:12' },
        ],
      },
      {
        id: 'maintien', dx: 1, depuis: 'f1.96', vers: 'ka4.11',
        elements: [
          { type: 'contactNO', a: 'km1.13', b: 'km1.14', rep: 'KM1', bornes: ['43', '44'],
            legende: 'auto-maintien' },
        ],
      },
      {
        id: 'reprise3', dx: 2, depuis: 'f1.96', vers: 'ka5.11',
        elements: [
          { type: 'contactNO', a: 'ka3.67', b: 'ka3.68', rep: 'KA3', bornes: ['67', '68'],
            legende: 'temporisé 2 s · reprise en avant' },
        ],
      },
      {
        id: 'arriere', dx: -1, depuis: 'f1.96',
        elements: [
          { type: 'contactNO', a: 'ka4.67', b: 'ka4.68', rep: 'KA4', bornes: ['67', '68'],
            legende: 'temporisé 2 s' },
          { type: 'contactNF', a: 'ka3.11', b: 'ka3.12', rep: 'KA3', bornes: ['11', '12'],
            legende: 'arrêt sur S3' },
          { type: 'contactNF', a: 'km1.21', b: 'km1.22', rep: 'KM1', bornes: ['21', '22'],
            legende: 'verrouillage' },
          { type: 'bobine', a: 'km2.A1', b: 'km2.A2', rep: 'KM2', legende: 'marche arrière' },
        ],
      },
      {
        id: 'reprise5', dx: -2, depuis: 'f1.96', vers: 'km1.21',
        elements: [
          { type: 'contactNO', a: 'ka5.67', b: 'ka5.68', rep: 'KA5', bornes: ['67', '68'],
            legende: 'temporisé 2 s · reprise en arrière' },
        ],
      },
      {
        id: 'service', dx: -3, depuis: 'f1.96',
        elements: [
          { type: 'contactNO', a: 'km1.53', b: 'km1.54', rep: 'KM1', bornes: ['53', '54'],
            legende: 'bloc LAD N11' },
          { type: 'borne', a: 'x2_11.a', rep: 'X2:11' },
          { type: 'voyant', a: 'H2.X1', b: 'H2.X2', rep: 'H2', legende: 'en service' },
        ],
      },
      {
        // H2 s'allume dans les DEUX sens : le second chemin vient de KM2.
        id: 'service2', dx: -5, depuis: 'f1.96', vers: 'x2_11.a',
        elements: [
          { type: 'contactNO', a: 'km2.13', b: 'km2.14', rep: 'KM2', bornes: ['13', '14'],
            legende: 'marche arrière' },
        ],
      },
      {
        id: 'rail33', dx: 3, depuis: 'f1.96',
        elements: [
          { type: 'contactNF', a: 'sf2.11', b: 'sf2.12', rep: 'S2', bornes: ['11', '12'],
            actionneur: 'galet', legende: 'coupe les relais au retour', conducteur: '33' },
          { type: 'borne', a: 'x2_5.a', rep: 'X2:5' },
          { type: 'borne', a: 'x2_6.a', rep: 'X2:6' },
          { type: 'contactNO', a: 'sf4.11', b: 'sf4.14', rep: 'S4', bornes: ['11', '14'],
            actionneur: 'galet', legende: 'arrêt à l\'aller' },
          { type: 'borne', a: 'x2_8.a', rep: 'X2:8' },
          { type: 'bobine', a: 'ka4.A1', b: 'ka4.A2', rep: 'KA4', legende: 'mémorise l\'arrêt sur S4' },
        ],
      },
      {
        id: 'ka4m', dx: 4, depuis: 'x2_6.a', vers: 'ka4.A1',
        elements: [
          { type: 'contactNO', a: 'ka4.43', b: 'ka4.44', rep: 'KA4', bornes: ['43', '44'],
            legende: 'auto-maintien' },
        ],
      },
      {
        id: 'ka3c', dx: 5, depuis: 'x2_6.a',
        elements: [
          { type: 'contactNO', a: 'sf3.11', b: 'sf3.14', rep: 'S3', bornes: ['11', '14'],
            actionneur: 'galet', legende: 'arrêt au retour' },
          { type: 'borne', a: 'x2_7.a', rep: 'X2:7' },
          { type: 'contactNO', a: 'ka4.33', b: 'ka4.34', rep: 'KA4', bornes: ['33', '34'],
            legende: 'validation : seulement après S4' },
          { type: 'bobine', a: 'ka3.A1', b: 'ka3.A2', rep: 'KA3', legende: 'mémorise l\'arrêt sur S3' },
        ],
      },
      {
        id: 'ka3m', dx: 6, depuis: 'x2_6.a', vers: 'ka3.A1',
        elements: [
          { type: 'contactNO', a: 'ka3.43', b: 'ka3.44', rep: 'KA3', bornes: ['43', '44'],
            legende: 'auto-maintien' },
        ],
      },
      {
        id: 'ka5c', dx: 7, depuis: 'x2_6.a',
        elements: [
          { type: 'contactNO', a: 'sf5.11', b: 'sf5.14', rep: 'S5', bornes: ['11', '14'],
            actionneur: 'galet', legende: 'arrêt en bout de course' },
          { type: 'borne', a: 'x2_9.a', rep: 'X2:9' },
          { type: 'contactNO', a: 'ka3.33', b: 'ka3.34', rep: 'KA3', bornes: ['33', '34'],
            legende: 'validation : seulement après S3' },
          { type: 'bobine', a: 'ka5.A1', b: 'ka5.A2', rep: 'KA5', legende: 'mémorise l\'arrêt sur S5' },
        ],
      },
      {
        id: 'ka5m', dx: 8, depuis: 'x2_6.a', vers: 'ka5.A1',
        elements: [
          { type: 'contactNO', a: 'ka5.43', b: 'ka5.44', rep: 'KA5', bornes: ['43', '44'],
            legende: 'auto-maintien' },
        ],
      },
      {
        id: 'soustension', dx: -4, depuis: 'f3.2',
        elements: [
          { type: 'borne', a: 'x2_10.a', rep: 'X2:10' },
          { type: 'voyant', a: 'H1.X1', b: 'H1.X2', rep: 'H1', legende: 'sous tension · en amont de F1' },
        ],
      },
    ],
    cadres: [
      { titre: 'Coffret de porte', de: 'S1.13', a: 'S1.14', couleur: 'porte', colonnes: ['avant'] },
    ],
  },

  motor: { P: 22000, U: 400, In: 42.5, n: 1400, ns: 1500, cosPhi: 0.77 },
  trafo: { slot: 't1', ...TRAFO_REF },
  pupitre: [
    { rep: 'H1', kind: 'lamp', color: 'clear', signals: 'ctl', label: 'voyant incolore · wagonnet sous tension' },
    { rep: 'H2', kind: 'lamp', color: 'green', signals: 'run', label: 'voyant vert · wagonnet en fonctionnement' },
    { rep: 'S1', kind: 'no', color: 'green', label: 'bouton vert · départ de cycle' },
  ],
  station: true,
  hasMotor: true,
};
