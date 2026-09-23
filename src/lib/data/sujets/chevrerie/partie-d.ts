/**
 * Partie D (partie 4) — Choix du parafoudre : rôle et architecture de la protection foudre,
 * obligation d'installation, types et références des parafoudres (DTR 25 à 27).
 *
 * Barème : le corrigé officiel ne donne que le total de la partie (24 points) ; la répartition
 * par question est la nôtre et tombe juste sur 24.
 */
import type { SujetPartie } from '@/lib/sujet/types';
import { choix, libre, txt, ref, pageDtr, pagesDtr, type QuestionSansNum } from './commun';

export const PARTIE_D: SujetPartie = {
  num: 4,
  titre: 'Choix du parafoudre',
  objectifs: [
    'Étudier l’installation d’un parafoudre.',
    'Choisir le matériel permettant une protection contre la foudre de la chèvrerie.',
  ],
  competences: ['C1', 'C3'],
  situation: 'La chèvrerie, **qui ne dispose pas d’un paratonnerre**, est située à la lisière d’une forêt dans une zone montagneuse. L’alimentation de la ferme est réalisée par une **ligne triphasée avec neutre**. De plus, l’installation se trouve en fin de ligne du réseau électrique. Si le hangar ne contient pas de matériels sensibles à proprement parler, il n’en va pas de même de la partie atelier et magasin. Par ailleurs, étant donné la superficie de la chèvrerie, on considère **que les matériels sensibles qui y sont installés sont distants de plusieurs dizaines de mètres du disjoncteur de tête.**',
  dtrPages: [pageDtr(25), pageDtr(26), pageDtr(27)],
};

/** Pages du DTR 27 : types de parafoudres, logigramme, gamme iPRD, gamme iQuick PRD. */
const [DTR27_TYPES, DTR27_LOGIGRAMME, DTR27_IPRD, DTR27_IQUICK] = pagesDtr(27);

const TYPES = ['type 1', 'type 2', 'type 3'];
const EMPLACEMENTS = [
  'En tête d’installation (au niveau du TGBT, ou en tête de chaque bâtiment)',
  'Au plus près des récepteurs à protéger',
  'Au point de livraison, en amont du disjoncteur de branchement',
  'Sur la prise de terre, en fond de fouille',
];

export const QUESTIONS_D: QuestionSansNum[] = [
  /* ═══════════════ D.1 Étude d’une protection par parafoudre ═══════════════ */
  {
    label: 'D.1.1', partie: 4, type: 'redige',
    enonce: '**Donner** les trois manières dont une installation peut être touchée par la foudre.',
    contexte: 'D.1. Étude d’une protection par parafoudre.',
    competence: 'C1', points: 3, dtr: [pageDtr(25)], pageSujet: 25,
    motsCles: ['direct', 'ligne', 'proximite', 'rayonnement', 'batiment', 'terre'], minMotsCles: 4, lignes: 3,
    corrige: '- Coup de foudre direct sur une ligne ; - coup de foudre à proximité d’une ligne, par rayonnement ; - coup de foudre à proximité des bâtiments.',
    indice: 'DTR 25 : « Les coups de foudre peuvent toucher les installations électriques de trois manières différentes ».',
    aides: [
      '📖 Ouvre le DTR 25 : « Comment la foudre impacte les installations électriques des bâtiments » et ses trois illustrations.',
      '🧭 Méthode : pour chaque cas, repère OÙ tombe la foudre (sur la ligne, à côté de la ligne, à côté du bâtiment) et par quel chemin la surtension atteint l’installation (ligne, rayonnement, terre).',
      '✏️ Forme de la réponse : trois tirets, chacun commençant par « Coup de foudre … ».',
    ],
    explication: 'Coup de foudre direct sur une ligne aérienne ; coup de foudre à proximité d’une ligne (rayonnement électromagnétique qui induit une surtension) ; coup de foudre à proximité des bâtiments (montée en potentiel de la terre).',
  },
  {
    label: 'D.1.2', partie: 4, type: 'redige',
    enonce: '**Définir** le rôle d’un parafoudre.',
    competence: 'C1', points: 2, dtr: [pageDtr(25), pageDtr(26)], pageSujet: 25,
    motsCles: ['proteg', 'foudre', 'surtension', 'ecoul'], minMotsCles: 2, lignes: 2,
    corrige: 'Protéger les installations électriques contre la foudre.',
    indice: 'Le DTR 25 se termine sur ce que font les parafoudres des surtensions d’origine atmosphérique.',
    aides: [
      '📖 Relis la fin du texte du DTR 25 (surtensions d’origine atmosphérique) et le principe de l’architecture de protection au DTR 26 (capacité d’écoulement).',
      '🧭 Méthode : dis contre QUOI le parafoudre protège, et ce qu’il fait de l’énergie de la foudre (où il l’envoie).',
      '✏️ Forme de la réponse : une phrase commençant par un verbe à l’infinitif.',
    ],
    erreursTypiques: [
      {
        id: 'd12-paratonnerre', valeurs: ['attire la foudre', 'attirer la foudre', 'capter la foudre', 'capte la foudre'],
        message: 'Attirer et capter la foudre, c’est le rôle du paratonnerre : le parafoudre, lui, protège l’installation électrique contre les surtensions.',
      },
      {
        id: 'd12-surintensite', valeurs: ['court-circuit', 'surcharge', 'surintensité', 'surintensite'],
        message: 'Les courts-circuits et surcharges sont traités par les disjoncteurs : le parafoudre traite un autre phénomène.',
      },
    ],
    explication: 'Le parafoudre protège les installations électriques (et les récepteurs) contre les surtensions dues à la foudre, en écoulant le courant de foudre vers la terre.',
  },
  {
    label: 'D.1.3', partie: 4, type: 'redige',
    enonce: '**Donner** les rôles du disjoncteur de déconnexion associé au parafoudre.',
    competence: 'C1', points: 3, dtr: [pageDtr(25)], pageSujet: 25,
    motsCles: ['court-circuit', 'fin de vie', 'continuite', 'service', 'maintenance', 'isol'], minMotsCles: 3, lignes: 3,
    corrige: '- Couper le court-circuit lors de la fin de vie du parafoudre ; - assurer la continuité de service de l’installation ; - permettre une opération de maintenance sur le parafoudre.',
    indice: 'DTR 25, encadré « Les rôles du disjoncteur de déconnexion » : 3 rôles.',
    aides: [
      '📖 Ouvre le DTR 25, bas de page : « Les rôles du disjoncteur de déconnexion ».',
      '🧭 Méthode : pense à trois moments : quand le parafoudre arrive en fin de vie (il se met en court-circuit), pendant l’exploitation (le disjoncteur de tête ne doit pas déclencher), et lors d’une intervention sur le parafoudre.',
      '✏️ Forme de la réponse : trois tirets, chacun commençant par un verbe à l’infinitif.',
    ],
    explication: 'Couper le court-circuit 50 Hz qui se produit lors de la fin de vie du parafoudre ; assurer la continuité de service de l’installation (en évitant que le disjoncteur de tête ne déclenche) ; permettre une opération de maintenance sur le parafoudre en l’isolant du réseau.',
  },
  {
    label: 'D.1.4', partie: 4, type: 'tableau',
    enonce: 'Dans une installation, **déterminer** l’emplacement de la protection de tête et de la protection fine.',
    competence: 'C1', points: 2, dtr: [pageDtr(26)], pageSujet: 25,
    colonnes: ['Protection', 'Emplacement'],
    lignes: [
      { cellules: ['Protection de tête', choix('d14-tete', EMPLACEMENTS, EMPLACEMENTS[0])] },
      { cellules: ['Protection fine', choix('d14-fine', EMPLACEMENTS, EMPLACEMENTS[1])] },
    ],
    indice: 'DTR 26 : « Principe de l’architecture de la protection foudre ».',
    aides: [
      '📖 Ouvre le DTR 26 : « Principe de l’architecture de la protection foudre » et le schéma tableau général / divisionnaire / terminal.',
      '🧭 Méthode : les parafoudres à forte capacité d’écoulement sont placés là où arrive l’énergie de la foudre ; ceux à faible capacité sont placés là où se trouvent les appareils sensibles.',
      '✏️ Forme de la réponse : un emplacement choisi dans la liste pour chaque protection.',
    ],
    erreursTypiques: [
      {
        id: 'd14-inverse', champ: 'd14-tete', valeurs: [EMPLACEMENTS[1]],
        message: 'La protection de tête, de plus forte capacité d’écoulement, est placée là où arrive l’énergie : relis le DTR 26.',
      },
      {
        id: 'd14-livraison', valeurs: [EMPLACEMENTS[2]],
        message: 'L’installation du client commence après le point de livraison : les parafoudres se placent dans les tableaux de l’installation.',
      },
    ],
    explication: 'Protection de tête : elle est située en tête d’installation (au niveau du TGBT ou en tête des bâtiments). Protection fine : elle est située au plus près des récepteurs.',
  },
  {
    label: 'D.1.5', partie: 4, type: 'tableau',
    enonce: '**Préciser** en fonction de l’analyse du risque si l’installation d’une protection par parafoudre est obligatoire dans la chèvrerie. **Justifier** votre réponse.',
    competence: 'C1', points: 3, dtr: [pageDtr(26)], pageSujet: 26,
    colonnes: ['Installation obligatoire', 'Justification'],
    lignes: [{ cellules: [choix('d15-rep', ['OUI', 'NON'], 'OUI'), libre('d15-just')] }],
    indice: 'DTR 26 : un seul des critères de l’analyse du risque suffit à rendre le parafoudre obligatoire.',
    aides: [
      '📖 Ouvre le DTR 26, bas de page : critères de l’analyse du risque foudre (guide UTE 15-443) ; relis la mise en situation de la partie D.',
      '🧭 Méthode : compare chaque critère de la liste à la situation de la chèvrerie (mode d’alimentation, relief, matériels sensibles, conséquences d’un arrêt d’activité). Il suffit d’UN critère observé.',
      '✏️ Forme de la réponse : ta réponse choisie dans la liste, puis « car … » en citant le ou les critères observés.',
    ],
    erreursTypiques: [
      {
        id: 'd15-non', champ: 'd15-rep', valeurs: ['NON'],
        message: 'Relis les critères du DTR 26 : la chèvrerie en remplit plusieurs (alimentation par le réseau aérien, zone montagneuse, matériels sensibles…).',
      },
    ],
    explication: 'OUI : présence d’une ligne aérienne, zone montagneuse, et continuité de service primordiale pour les chambres froides et les matériels sensibles.',
  },

  /* ═══════════════ D.2 Choix de la protection à mettre en œuvre ═══════════════ */
  {
    label: 'D.2.1', partie: 4, type: 'tableau',
    enonce: '**Préciser** en le justifiant le(s) type(s) de parafoudre(s) à installer dans la chèvrerie.',
    contexte: 'D.2. Choix de la protection à mettre en œuvre. Chèvrerie (atelier et magasin).',
    competence: 'C3', points: 4, dtr: [DTR27_TYPES, DTR27_LOGIGRAMME], pageSujet: 26,
    colonnes: ['Protection', 'Type de parafoudre', 'Justification'],
    lignes: [
      { cellules: ['Protection de tête', choix('d21-tete', TYPES, 'type 2'), libre('d21-tete-just')] },
      { cellules: ['Protection fine', choix('d21-fine', TYPES, 'type 3'), libre('d21-fine-just')] },
    ],
    indice: 'Logigramme du DTR 27 : première question « Y a-t-il un paratonnerre ? » ; protection fine si l’équipement est à plus de 10 m du tableau.',
    aides: [
      '📖 Ouvre le DTR 27 : « Les différents types de parafoudres » puis le logigramme « Intégrer le parafoudre dans l’architecture de distribution électrique ».',
      '🧭 Méthode : la présence ou l’absence de paratonnerre fixe le type de la protection de tête ; la distance entre le tableau protégé et les matériels sensibles décide d’une protection fine (relis la mise en situation).',
      '✏️ Forme de la réponse : un type par ligne, puis une justification « car … » reprenant la donnée de la mise en situation utilisée.',
    ],
    erreursTypiques: [
      {
        id: 'd21-type1', champ: 'd21-tete', valeurs: ['type 1'],
        message: 'Le type 1 est destiné aux bâtiments équipés de paratonnerre : relis la mise en situation.',
      },
      {
        id: 'd21-fine-type2', champ: 'd21-fine', valeurs: ['type 2'],
        message: 'Le type 2 sert à la protection de tête : la protection fine des récepteurs est assurée par un autre type.',
      },
    ],
    explication: 'Protection de tête : type 2, car pas de paratonnerre. Protection fine : type 3, parafoudre pour une protection fine (distance tableau – récepteurs > 10 m).',
  },
  {
    label: 'D.2.2', partie: 4, type: 'tableau',
    enonce: '**Donner** les références des matériels à mettre en œuvre.',
    competence: 'C3', points: 7, dtr: [DTR27_IPRD, DTR27_IQUICK, DTR27_LOGIGRAMME], pageSujet: 26,
    colonnes: ['Matériel', 'Protection de tête', 'Protection fine triphasé + neutre'],
    lignes: [
      {
        cellules: [
          'Type de parafoudre',
          txt('d22-tete-type', [
            'iPRD65r 3P+N', 'iPRD65r 3P + N', 'type 2 iPRD65r 3P+N', 'type 2 iPRD65r 3P + N', 'iPRD 65r 3P+N', 'iPRD65r 3P N', 'iPRD65r',
            'iPRD65r type 2 3P+N', 'iPRD65r, type 2, 3P+N',
          ]),
          txt('d22-fine-type', [
            'iQuick PRD8r 3P+N', 'iQuick PRD8r 3P + N', 'type 3 iQuick PRD8r 3P+N', 'iQuick PRD 8r 3P+N', 'iQuick PRD8r', 'iQuickPRD8r 3P+N',
            'iQuick PRD8r type 3 3P+N', 'iQuick PRD8r, type 3, 3P+N',
          ]),
        ],
      },
      { cellules: ['Référence', txt('d22-tete-ref', ref('A9L65601')), txt('d22-fine-ref', ref('A9L16300'))] },
      { cellules: ['Cartouche de rechange 1P : référence', txt('d22-tete-1p', ref('A9L65102')), txt('d22-fine-1p', ref('A9L16312'))] },
      { cellules: ['Cartouche de rechange N : référence', txt('d22-tete-n', ref('A9L00002')), txt('d22-fine-n', ref('A9L16313'))] },
    ],
    indice: 'Risque élevé (zone montagneuse) → iPRD65r ; protection fine → iQuick PRD8r ; alimentation triphasée avec neutre → colonne 3P+N.',
    aides: [
      '📖 Le logigramme du DTR 27 donne la gamme selon le niveau de risque ; les tableaux « Parafoudres types 2 et 3 à cartouches débrochables » (avec et sans disjoncteur intégré) donnent les références et leurs cartouches de rechange (« Accessoires »).',
      '🧭 Méthode : le niveau de risque se déduit du site de la chèvrerie (relis la mise en situation) ; choisis ensuite la colonne qui correspond à l’alimentation (nombre de pôles et neutre), puis descends dans la même colonne jusqu’aux cartouches 1P et neutre.',
      '✏️ Forme de la réponse : nom de la gamme + nombre de pôles, puis des références constructeur de la forme A9L….. (lettres et chiffres).',
    ],
    erreursTypiques: [
      {
        id: 'd22-risque-moyen', champ: 'd22-tete-ref', valeurs: ref('A9L40601', 'A9L16294'),
        message: 'Cette référence correspond à un niveau de risque MOYEN (bâtiment en plaine) : la chèvrerie est en zone montagneuse.',
      },
      {
        id: 'd22-risque-faible', champ: 'd22-tete-ref', valeurs: ref('A9L20601', 'A9L16297'),
        message: 'Cette référence correspond à un niveau de risque FAIBLE (zone urbaine) : relis le site de la chèvrerie.',
      },
      {
        id: 'd22-poles-tete', champ: 'd22-tete-ref', valeurs: ref('A9L65501', 'A9L65301'),
        message: 'Mauvaise colonne : l’alimentation est une ligne triphasée AVEC neutre.',
      },
      {
        id: 'd22-poles-fine', champ: 'd22-fine-ref', valeurs: ref('A9L16298', 'A9L16299'),
        message: 'Mauvaise colonne : la protection fine demandée est triphasée + neutre.',
      },
      {
        id: 'd22-cartouche-disjoncteur', champ: 'd22-tete-1p', valeurs: ref('A9F77450', 'A9F87450'),
        message: 'Cette référence est celle du disjoncteur de déconnexion, pas de la cartouche de rechange : lis la ligne « cartouches de rechange ».',
      },
      {
        id: 'd22-cartouche-fine-1p', champ: 'd22-fine-1p', valeurs: ref('A9L16310', 'A9L16311'),
        message: 'Cette cartouche appartient à une autre gamme iQuick : reste dans la colonne du parafoudre de type 3 choisi.',
      },
    ],
    explication: 'Protection de tête : type 2 iPRD65r 3P + N, référence A9L65601 ; cartouche de rechange 1P : A9L65102 ; cartouche de rechange N : A9L00002. Protection fine triphasé + neutre : iQuick PRD8r 3P + N, référence A9L16300 ; cartouche 1P : A9L16312 ; cartouche N : A9L16313.',
  },
];
