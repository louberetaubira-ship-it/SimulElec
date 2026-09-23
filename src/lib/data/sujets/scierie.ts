/**
 * Sujet numérique « Scierie — nouvel atelier d'usinage » (Bac Pro MELEC, 6 parties A à F,
 * 76 questions, 5 h).
 *
 * Copie conforme d'un sujet d'examen papier : énoncés fidèles, repères imprimés (« A.2.1.1 »)
 * dans `label`, valeurs de correction du corrigé officiel (les écarts relevés sont signalés en
 * commentaire « Corrigé officiel : … » ; là où le corrigé est vide — B.1.16, E.1.3, E.3.4.3,
 * F.1 — la correction proposée a été validée par le professeur). Le sujet est anonymisé :
 * entreprise « SYLVA » (fictive), « une commune de moyenne montagne », agents « Agent A » … « H »
 * et « Chantier 1 » … « 10 » dans le planning de la partie C — contrôle par `scripts/audit-sujet.ts`.
 *
 * Dossier technique : les « DTR n » sont des DOCUMENTS (37 documents sur les pages 3 à 47 ;
 * DTR 28 = pages 29 à 32…) : chaque page porte `doc`. Les références `dtr` des questions sont
 * des numéros de PAGE. La page 2 du dossier (sommaire) n'est pas reprise : le visualiseur liste
 * déjà les documents par numéro et par titre.
 *
 * Images : `public/tp/scierie/` — pages du sujet `sujet-02…36.jpg`, du dossier technique `dtr-03…47.jpg`
 * (pages de garde retirées, numérotation conservée) et recadrages `q-*.jpg` (schémas D.3.1 et
 * E.3.4.3, plan B.1.16, disque solaire E.1.3, onglets E.4.2.1.1…). Positions des bornes, des
 * bulles et des repères : en % (schémas, bulles) ou en fraction (placement) de l'image recadrée.
 *
 * Sujets thématiques : `declinaisons` (parties A à E ; la partie F n'est que dans le sujet complet).
 */
import type {
  CelluleSaisie, DeclinaisonSujet, DtrPage, QPlacement, QSchema, SujetNumerique, SujetPartie, SujetQuestion,
} from '@/lib/sujet/types';

const IMG = '/tp/scierie';
const pad = (n: number) => String(n).padStart(2, '0');

/* ───────────────────────────── Aides de saisie ───────────────────────────── */

/** Cellule numérique (tolérance absolue ; défaut ±1 % côté moteur si omise). */
const num = (id: string, attendu: number, tolerance?: number, acceptes?: string[]): CelluleSaisie =>
  ({ id, attendu, ...(tolerance != null ? { tolerance } : {}), ...(acceptes ? { acceptes } : {}) });
/** Cellule texte : réponses acceptées (le moteur ignore casse, accents et espaces). */
const txt = (id: string, acceptes: string[], placeholder?: string): CelluleSaisie =>
  ({ id, acceptes, ...(placeholder ? { placeholder } : {}) });
/** Cellule à choix fermé (liste déroulante). */
const choix = (id: string, liste: string[], bonne: string): CelluleSaisie => ({ id, choix: liste, acceptes: [bonne] });
/** Cellule libre non notée (formule, application, justification : lue par le professeur). */
const libre = (id: string, placeholder = 'Justifier votre réponse…'): CelluleSaisie => ({ id, placeholder });

/** Plages de tension écrites de plusieurs façons (« 320 - 800 V », « 320 à 800 V »…). */
const plage = (a: number, b: number, u = 'V') => [
  `${a} - ${b} ${u}`, `${a}-${b} ${u}`, `${a} à ${b} ${u}`, `${a} ${u} - ${b} ${u}`, `${a} ${u} à ${b} ${u}`,
  `${a}-${b}`, `${a} à ${b}`, `${a} ${u} – ${b} ${u}`, `de ${a} à ${b} ${u}`, `${a}/${b} ${u}`,
];

/* ───────────────────────────── DTR et pages du sujet ───────────────────────────── */

/** Pages 3 à 47 du dossier technique : [page, document DTR, titre, section]. */
const DTR_PAGES: [number, number, string, string][] = [
  [3, 1, 'Plan de distribution de la scierie et plaque signalétique du transformateur', 'Distribution'],
  [4, 2, 'Composition des installations', 'Distribution'],
  [5, 3, 'Compensation de l’énergie réactive', 'Distribution'],
  [6, 4, 'Choix de la compensation fixe Varset', 'Distribution'],
  [7, 5, 'Caractéristiques des transformateurs Trihal', 'Distribution'],
  [8, 5, 'Caractéristiques des transformateurs Trihal (suite)', 'Distribution'],
  [9, 6, 'Transformateur de distribution : références', 'Distribution'],
  [10, 7, 'Fusibles Fusarc CF : références et caractéristiques', 'Distribution'],
  [11, 8, 'Fusibles Fusarc CF : références et caractéristiques (suite)', 'Distribution'],
  [12, 9, 'L’éclairage, un élément essentiel pour de bonnes conditions de travail', 'Éclairage'],
  [13, 10, 'Facteurs de réflexion · DTR 11 : facteurs de dépréciation · DTR 12 : éclairement recommandé', 'Éclairage'],
  [14, 13, 'Température de couleur en fonction de l’éclairement', 'Éclairage'],
  [15, 14, 'Caractéristiques des luminaires', 'Éclairage'],
  [16, 15, 'Calculs d’éclairement', 'Éclairage'],
  [17, 16, 'Calculs d’éclairement (suite) : tableaux d’utilance', 'Éclairage'],
  [18, 17, 'Présentation de la technologie KNX', 'KNX'],
  [19, 18, 'Actionneurs KNX en tableau', 'KNX'],
  [20, 18, 'Actionneurs KNX en tableau (suite) : interfaces 1-10 V', 'KNX'],
  [21, 19, 'Alimentations de bus KNX · DTR 20 : boutons-poussoirs KNX', 'KNX'],
  [22, 21, 'Détecteurs de présence', 'KNX'],
  [23, 22, 'Caractéristiques techniques des câbles bus KNX', 'KNX'],
  [24, 23, 'Système d’adressage KNX', 'KNX'],
  [25, 24, 'Plan du système d’aspiration', 'Aspiration & variateur'],
  [26, 25, 'Plan du centre d’usinage', 'Aspiration & variateur'],
  [27, 26, 'Documentation technique de la corroyeuse', 'Aspiration & variateur'],
  [28, 27, 'Documentation technique du groupe d’aspiration', 'Aspiration & variateur'],
  [29, 28, 'Variateur Altivar ATV340 (Ethernet, triphasé) : références', 'Aspiration & variateur'],
  [30, 28, 'Variateur Altivar ATV340 (suite) : schéma du bloc de commande', 'Aspiration & variateur'],
  [31, 28, 'Variateur Altivar ATV340 (suite) : vitesses présélectionnées', 'Aspiration & variateur'],
  [32, 28, 'Variateur Altivar ATV340 (suite) : réglages', 'Aspiration & variateur'],
  [33, 29, 'Plans de l’extension', 'Photovoltaïque'],
  [34, 30, 'Outils d’évaluation des performances d’une installation photovoltaïque', 'Photovoltaïque'],
  [35, 31, 'Évaluation du potentiel solaire local', 'Photovoltaïque'],
  [36, 32, 'Facture et tarification de l’énergie électrique', 'Photovoltaïque'],
  [37, 32, 'Facture et tarification de l’énergie électrique (suite)', 'Photovoltaïque'],
  [38, 33, 'Caractéristiques des panneaux solaires', 'Photovoltaïque'],
  [39, 33, 'Caractéristiques des panneaux solaires (suite)', 'Photovoltaïque'],
  [40, 34, 'Caractéristiques de l’onduleur d’injection', 'Photovoltaïque'],
  [41, 34, 'Caractéristiques de l’onduleur d’injection (suite)', 'Photovoltaïque'],
  [42, 35, 'Câblage des strings PV', 'Photovoltaïque'],
  [43, 36, 'Paramétrage du data manager', 'Photovoltaïque'],
  [44, 36, 'Paramétrage du data manager (suite)', 'Photovoltaïque'],
  [45, 37, 'Schéma unifilaire (folio 1)', 'Schémas'],
  [46, 37, 'Schéma unifilaire (suite, folio 2)', 'Schémas'],
  [47, 37, 'Schéma unifilaire (suite, folio 3)', 'Schémas'],
];

const DTR: DtrPage[] = DTR_PAGES.map(([p, doc, titre, section]) => ({
  num: p, doc, src: `${IMG}/dtr-${pad(p)}.jpg`, titre, section,
}));

/** Pages 2 à 36 du sujet (page de garde retirée ; numérotation conservée). */
const SUJET_TITRES: [string, string][] = [
  ['Conseils aux candidats', 'Présentation'],
  ['Sommaire', 'Présentation'],
  ['Présentation du contexte', 'Présentation'],
  ['Présentation du contexte (suite)', 'Présentation'],
  ['Description du site', 'Présentation'],
  ['Partie A — A.1 et A.2.1.1', 'Partie 1'],
  ['A.2.1.2 — Bilan des puissances', 'Partie 1'],
  ['A.2.2 à A.2.6', 'Partie 1'],
  ['A.3 et A.4 — Compensation, transformateur', 'Partie 1'],
  ['Partie B — B.1.1 à B.1.4', 'Partie 2'],
  ['B.1.5 à B.1.10', 'Partie 2'],
  ['B.1.11 à B.1.15', 'Partie 2'],
  ['B.1.16 — Implantation des luminaires', 'Partie 2'],
  ['B.2 — Système d’éclairage KNX', 'Partie 2'],
  ['B.2.1 à B.2.4 — Énergie et coût', 'Partie 2'],
  ['B.2.5 — Matériel KNX', 'Partie 2'],
  ['B.2.6 à B.2.9 — Bus et adressage', 'Partie 2'],
  ['Partie C — Planning des équipes', 'Partie 3'],
  ['C.1 et C.2 — Habilitations, personnel', 'Partie 3'],
  ['C.3 à C.5 — Consignation', 'Partie 3'],
  ['Partie D — D.1', 'Partie 4'],
  ['D.2 et D.3.1 — Schéma ATV340', 'Partie 4'],
  ['D.3.2 à D.4.2', 'Partie 4'],
  ['D.4.3 à D.4.5', 'Partie 4'],
  ['Partie E — E.1.1 et E.1.2', 'Partie 5'],
  ['E.1.3 et E.2.1 — Disque solaire', 'Partie 5'],
  ['E.2.2 — Nombre de panneaux', 'Partie 5'],
  ['E.2.3 et E.2.4 — Production, rentabilité', 'Partie 5'],
  ['E.3.1 et E.3.2 — Panneaux (NOCT)', 'Partie 5'],
  ['E.3.3 et E.3.4.1.1 — Onduleurs', 'Partie 5'],
  ['E.3.4.1.2 et E.3.4.2', 'Partie 5'],
  ['E.3.4.3 — Schéma de câblage DC', 'Partie 5'],
  ['E.4.1 et E.4.2 — Paramétrage', 'Partie 5'],
  ['E.4.2.1.1 — Onglets de paramétrage', 'Partie 5'],
  ['Partie F — Perspectives', 'Partie 6'],
];

const PAGES_SUJET: DtrPage[] = SUJET_TITRES.map(([titre, section], i) => ({
  num: i + 2, src: `${IMG}/sujet-${pad(i + 2)}.jpg`, titre, section,
}));

/** Pages [de, a] incluses. */
const pages = (de: number, a: number) => Array.from({ length: a - de + 1 }, (_, i) => de + i);

/* ───────────────────────────── Parties ───────────────────────────── */

const PARTIES: SujetPartie[] = [
  {
    num: 1,
    titre: 'A — Alimentation du centre d’usinage',
    objectifs: [
      'Étudier le fonctionnement de l’installation.',
      'Choisir le matériel permettant l’alimentation du nouveau centre d’usinage.',
    ],
    competences: ['C1', 'C3'],
    situation:
      'Afin d’augmenter la capacité de production de charpentes taillées, la société SYLVA a décidé de créer un nouveau bâtiment afin d’installer un nouveau centre d’usinage HUNDEGGER type K2. En tant qu’électricien vous devez réaliser l’étude pour l’alimentation électrique de ce nouveau bâtiment.\n'
      + 'Problématique : étudier le fonctionnement de l’installation ; choisir le matériel permettant l’alimentation du nouveau centre d’usinage.\n'
      + '(Dossier technique et ressources : DTR 1 à 8.)',
    dtrPages: pages(3, 11),
  },
  {
    num: 2,
    titre: 'B — Étude de l’éclairage du bâtiment',
    objectifs: [
      'Dimensionner l’éclairage du nouveau bâtiment.',
      'Étudier le système d’éclairage KNX.',
    ],
    competences: ['C1', 'C3', 'C6', 'C11'],
    situation:
      'Vous êtes chargé de dimensionner l’éclairage du nouveau bâtiment.\n'
      + 'Le plafond est à 7,50 m du sol (ht sur DTR 15).\n'
      + 'Les plans de travail des machines d’usinage ont une hauteur de 110 cm (hu sur DTR 15) et sont de couleur « claire ».\n'
      + 'Le plafond et les murs sont de couleurs « claire ».\n'
      + 'L’empoussièrement sera considéré comme « élevé ».\n'
      + 'Caractéristiques des futurs luminaires dimmables 1-10 V non DALI convenues avec le client :\n'
      + '• fixés contre le plafond avec un facteur J égal à 0 (h’ = 0 sur DTR 15) ;\n'
      + '• éclairage direct, rendement de 0,9, classe C ;\n'
      + '• flux compris entre 25 000 lm et 30 000 lm ;\n'
      + '• utilisation annuelle de jour : 2 250 h. Utilisation annuelle de nuit : 1 250 h.\n'
      + 'Problématique : dimensionner l’éclairage du nouveau bâtiment ; étudier le système d’éclairage KNX.\n'
      + '(Dossier technique et ressources : DTR 9 à 23 et DTR 29.)',
    dtrPages: [...pages(12, 24), 33],
  },
  {
    num: 3,
    titre: 'C — Travaux et interventions',
    objectifs: [
      'Identifier les personnes habilitées et organiser l’intervention à partir du planning des équipes.',
      'Préparer la consignation des circuits d’éclairage de l’atelier existant.',
    ],
    competences: ['C1', 'C11'],
    // Le papier renvoie aux « DTR 36 et DTR 37 » : le DTR 36 (data manager) est sans rapport,
    // le planning est imprimé dans le sujet ; seul le schéma unifilaire (DTR 37) est proposé.
    situation:
      'L’armoire électrique qui permet d’alimenter le nouveau bâtiment a été mise en service. Tous les départs sont sous tension et les luminaires sont opérationnels.\n'
      + 'Suite à la dernière réunion de chantier (semaine 16), des modifications sont à apporter sur les éclairages existants afin d’harmoniser le type de luminaires avec ceux installés dans le nouveau bâtiment.\n'
      + 'Pour ne pas perturber le travail des ouvriers dans l’ancien bâtiment, la scierie impose de garder deux rangées sur trois fonctionnelles afin de garantir un éclairage minimum lors de la phase de travaux.\n'
      + 'Votre entreprise d’électricité est chargée de réaliser ces travaux.\n'
      + 'Le temps nécessaire à ce travail est estimé à 3 jours pour deux électriciens (1 jour par rangée de luminaires).\n'
      + 'Problématique : organiser le remplacement des luminaires de l’atelier existant en toute sécurité (habilitations, planning des équipes, consignation).\n'
      + '(Dossier technique et ressources : DTR 36 et DTR 37 ; planning des équipes ci-dessous.)',
    dtrPages: pages(45, 47),
  },
  {
    num: 4,
    titre: 'D — Dimensionnement du système d’aspiration',
    objectifs: [
      'Étudier le fonctionnement du système d’aspiration.',
      'Choisir le matériel permettant l’aspiration des poussières.',
      'Réaliser le schéma de câblage.',
      'Paramétrer et configurer le variateur de vitesse.',
    ],
    competences: ['C1', 'C3', 'C6', 'C11'],
    situation:
      'Vous travaillez pour une entreprise spécialisée dans la conception et l’optimisation de systèmes d’aspiration industrielle. Récemment, vous avez été contacté par la scierie SYLVA qui souhaite installer une aspiration sur son nouveau centre d’usinage. La scierie produit une grande quantité de poussière et de copeaux de bois, ce qui a un impact sur la qualité de l’air dans l’atelier et peut également affecter les performances des machines.\n'
      + 'Votre objectif est de proposer un système efficace qui minimise la quantité de déchets dans l’atelier tout en respectant le budget alloué par la scierie. Sur la partie aspiration, la société SYLVA souhaite un amortissement en 4 ans au maximum.\n'
      + 'Problématique : étudier le fonctionnement du système d’aspiration ; choisir le matériel permettant l’aspiration des poussières ; réaliser le schéma de câblage ; paramétrer et configurer le variateur de vitesse.\n'
      + '(Dossier technique et ressources : DTR 24 à 28.)',
    dtrPages: pages(25, 32),
  },
  {
    num: 5,
    titre: 'E — Dimensionnement de l’installation photovoltaïque',
    objectifs: [
      'Étudier la faisabilité du projet.',
      'Évaluer la production d’énergie.',
      'Choisir le matériel.',
      'Paramétrer les onduleurs.',
    ],
    competences: ['C1', 'C3', 'C6', 'C11'],
    situation:
      'Avec le double objectif d’une économie d’énergie et d’une démarche de développement durable, la scierie SYLVA envisage l’installation de panneaux solaires photovoltaïques sur le toit de la nouvelle extension.\n'
      + 'Pour être certaine de la pertinence de ce projet, elle souhaite faire réaliser une pré-étude pour évaluer les impacts en termes de projection de production et de retour financier.\n'
      + 'Problématique : étudier la faisabilité du projet ; évaluer la production d’énergie ; choisir le matériel ; paramétrer les onduleurs.\n'
      + '(Dossier technique et ressources : DTR 29 à DTR 36.)',
    dtrPages: pages(33, 44),
  },
  {
    num: 6,
    titre: 'F — Perspectives',
    objectifs: ['Proposer des améliorations de l’efficacité énergétique du nouveau bâtiment et de ses équipements.'],
    competences: ['C3'],
    situation:
      'Le nouveau bâtiment est alimenté, éclairé, équipé de son aspiration et d’une installation photovoltaïque.\n'
      + 'Problématique : améliorer encore l’efficacité énergétique du nouveau bâtiment et de ses équipements.',
    dtrPages: [],
  },
];

/* ───────────────────────────── Listes réutilisées ───────────────────────────── */

/** A.1 : significations proposées pour chaque inscription de la plaque. */
const PLAQUE = [
  'Puissance apparente', 'Puissance active', 'Tension primaire', 'Tension secondaire',
  'Primaire couplé en triangle (HTA)', 'Primaire couplé en étoile (HTA)',
  'Secondaire couplé en étoile (BT)', 'Secondaire couplé en triangle (BT)',
  'Neutre sorti', 'Indice horaire 11 (11 × 30° = 330°)', 'Intensité primaire nominale',
  'Intensité secondaire nominale', 'Tension de court-circuit en %', 'Rendement en %',
];

/** Planning des équipes (partie C) : noms et lieux anonymisés, mêmes cellules que le papier. */
const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.'];
const PLANNING = {
  titre: 'Planning des équipes (semaines 17 et 18)',
  colonnes: ['Nom', 'Habilitation', ...JOURS.map(j => `S17 ${j}`), ...JOURS.map(j => `S18 ${j}`)],
  lignes: [
    ['Agent A', 'BC', '', '', '', 'Chantier 1', 'Chantier 1', 'RTT', '', '', '', ''],
    ['Agent B', 'B2V', 'Chantier 2', 'Chantier 2', 'Chantier 2', 'Chantier 2', 'RTT', '', '', '', '', 'RTT'],
    ['Agent C', 'B2V', ...Array<string>(10).fill('Chantier 3')],
    ['Agent D', 'B1V - BR', ...Array<string>(5).fill('Chantier 4'), 'Chantier 5', 'Chantier 5', 'Chantier 5', 'Chantier 4', 'Chantier 4'],
    ['Agent E', 'B1V - BR', 'Chantier 6', 'Chantier 6', 'Chantier 7', 'Chantier 8', 'Chantier 8', '', '', 'Chantier 9', 'Chantier 9', 'Chantier 9'],
    ['Agent F', 'B1V', ...Array<string>(10).fill('Chantier 3')],
    ['Agent G', 'B1V', 'RTT', '', '', 'CL', 'CL', 'CL', '', '', '', ''],
    ['Agent H', 'B1V', ...Array<string>(5).fill('Chantier 10'), ...Array<string>(5).fill('Congés')],
  ],
};
const AGENTS = ['Agent A', 'Agent B', 'Agent C', 'Agent D', 'Agent E', 'Agent F', 'Agent G', 'Agent H'];
const TITRES = ['B0', 'B1V', 'B1V - BR', 'B2V', 'BC', 'BR', 'BE Essai'];
const CRENEAUX = [
  'S17 : lundi, mardi et mercredi', 'S17 : mardi, mercredi et jeudi', 'S17 : mercredi, jeudi et vendredi',
  'S18 : lundi, mardi et mercredi', 'S18 : mardi, mercredi et jeudi', 'S18 : mercredi, jeudi et vendredi',
];
/** C.4 : appareils de protection du schéma unifilaire (DTR 37). */
const APPAREILS = [
  'Q0', 'Q10', 'Q20', 'Q30', 'Q40', 'Q100', 'Q107', 'Q200', 'Q201', 'Q202', 'Q203', 'Q204', 'Q205', 'Q206', 'Q207',
  'Q208', 'Q209', 'Q210', 'Q211', 'Q212',
];
/** C.5 : étapes et objectifs de la consignation. */
const ETAPES = [
  'Séparation', 'Condamnation', 'Identification', 'Vérification d’absence de tension (VAT)',
  'Mise à la terre et en court-circuit', 'Signalisation',
];
const OBJECTIFS = [
  'Séparer l’ouvrage des sources de tension.',
  'Interdire la manœuvre de l’organe de séparation.',
  'Être certain que les travaux seront effectués sur l’ouvrage séparé et dont les organes de séparation sont condamnés en position ouverte.',
  'Vérifier, au plus près du lieu de travail, l’absence de tension sur chacun des conducteurs actifs (y compris le neutre).',
  'Écouler les charges résiduelles et protéger contre une réalimentation accidentelle.',
];

const OUI_NON = ['oui', 'non'];

/* ───────────────────────────── Placement ───────────────────────────── */

/**
 * B.1.16 : plan du bâtiment (835 × 1130 px), intérieur du rectangle (15,2 m × 35 m) entre les
 * pixels x 81…804 et y 74…1102. Implantation proposée (corrigé vierge, validée) : 3 luminaires
 * dans la largeur (entraxe 5,07 m, 2,53 m aux murs) × 5 dans la longueur (entraxe 7 m, 3,5 m
 * aux murs) ; tolérance ± 1 m autour de chaque position.
 */
const PLAN_B116 = { w: 835, h: 1130, x0: 81, x1: 804, y0: 74, y1: 1102, largeur: 15.2, longueur: 35 };
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const IMPLANTATION: QPlacement['attendus'] = [];
for (let j = 0; j < 5; j++) {
  for (let k = 0; k < 3; k++) {
    const { w, h, x0, x1, y0, y1 } = PLAN_B116;
    IMPLANTATION.push({
      x: r4((x0 + ((x1 - x0) * (k + 0.5)) / 3) / w),
      y: r4((y0 + ((y1 - y0) * (j + 0.5)) / 5) / h),
      label: `Rangée ${j + 1}, luminaire ${k + 1}`,
    });
  }
}

/* ───────────────────────────── Schémas ───────────────────────────── */

const COULEURS: QSchema['traits']['couleurs'] = [
  { id: 'rouge', label: 'Rouge', css: '#d62828' },
  { id: 'noir', label: 'Noir', css: '#161616' },
  { id: 'bleu', label: 'Bleu', css: '#1f6fd6' },
];

/**
 * D.3.1 : bornier de commande de l'ATV340 (recadrage du sujet p. 23), avec les commutateurs
 * S1 (marche avant) et S2 (2 positions : 1 = PV, 2 = GV) dessinés sous le bornier.
 * Bornes du bornier bas : centre des cercles du dessin (y = 49,35 %).
 */
const D31_TRAITS: QSchema['traits'] = {
  image: { src: `${IMG}/q-d31-sujet.jpg`, alt: 'Bornier de commande du variateur ATV340 (P24, 0V, DI1 à DI8, 24V, 10V, AI1, COM…) et commutateurs S1 et S2 à raccorder', w: 968, h: 540 },
  bornes: [
    { id: 'P24', x: 6.3, y: 49.35, label: 'ATV340 — P24 (alimentation externe)' },
    { id: '0V', x: 11.62, y: 49.35, label: 'ATV340 — 0V' },
    { id: 'DI1', x: 17.1, y: 49.35, label: 'ATV340 — DI1' },
    { id: 'DI2', x: 22.31, y: 49.35, label: 'ATV340 — DI2' },
    { id: 'DI3', x: 27.53, y: 49.35, label: 'ATV340 — DI3' },
    { id: 'DI4', x: 32.8, y: 49.35, label: 'ATV340 — DI4' },
    { id: 'DI5', x: 37.76, y: 49.35, label: 'ATV340 — DI5' },
    { id: 'DI6', x: 42.98, y: 49.35, label: 'ATV340 — DI6' },
    { id: 'DI7', x: 48.09, y: 49.35, label: 'ATV340 — DI7' },
    { id: 'DI8', x: 53.41, y: 49.35, label: 'ATV340 — DI8' },
    { id: '24V', x: 58.78, y: 49.35, label: 'ATV340 — 24V (sortie)' },
    { id: '10V', x: 65.55, y: 49.35, label: 'ATV340 — 10V' },
    { id: 'AI1', x: 70.76, y: 49.35, label: 'ATV340 — AI1' },
    { id: 'COM', x: 75.98, y: 49.35, label: 'ATV340 — COM' },
    { id: 'S1.2', x: 17.1, y: 63.89, label: 'S1 (marche avant) — borne 2' },
    { id: 'S1.1', x: 17.1, y: 84.26, label: 'S1 (marche avant) — borne 1' },
    { id: 'S2.1', x: 27.53, y: 63.89, label: 'S2 — position 1 (PV)' },
    { id: 'S2.2', x: 32.8, y: 63.89, label: 'S2 — position 2 (GV)' },
    { id: 'S2.C', x: 30.17, y: 87.04, label: 'S2 — commun C' },
  ],
  couleurs: COULEURS,
  // Liaisons du corrigé (p. 23) : le 24V du variateur alimente S1 et S2 ; S1 → DI1 (marche
  // avant), S2 position 1 → DI3 (vitesse présélectionnée 2, PV), position 2 → DI4 (GV).
  attendues: [
    { a: '24V', b: 'S1.1' },
    { a: '24V', b: 'S2.C' },
    { a: 'S1.2', b: 'DI1' },
    { a: 'S2.1', b: 'DI3' },
    { a: 'S2.2', b: 'DI4' },
  ],
  // Correction par réseau (couleurs non imposées par le sujet, non notées) : le 24V peut
  // desservir S1 puis S2 ou l'inverse.
  reseaux: [
    { label: '+24 V → communs de S1 et S2', bornes: ['24V', 'S1.1', 'S2.C'] },
    { label: 'S1 → DI1 (marche avant)', bornes: ['S1.2', 'DI1'] },
    { label: 'S2 position 1 → DI3 (PV)', bornes: ['S2.1', 'DI3'] },
    { label: 'S2 position 2 → DI4 (GV)', bornes: ['S2.2', 'DI4'] },
  ],
};

/**
 * E.3.4.3 : deux demi-strings de 3 panneaux (représentant 15) et le bornier DC de l'onduleur
 * (recadrage du sujet p. 33). Bornes des panneaux : extrémité des fils + (à gauche) et − (à
 * droite). Les bornes 1-2-3 d'un DC+ et les bornes 1 à 6 du DC− sont reliées en interne
 * (DTR 35) : une seule borne cliquable par groupe.
 * Correction proposée (corrigé vierge, validée) d'après le DTR 35 : chaque demi-string en
 * série ; demi-string 1 : + → DC+1, − → DC− ; demi-string 2 : + → DC+2, − → DC−.
 */
const PANNEAUX: [string, number, number, number, number][] = [
  // id, x+ , y+ , x− , y− (en %)
  ['P1', 5.11, 17.69, 15.32, 17.92],
  ['P2', 19.04, 17.75, 29.26, 18.04],
  ['P3', 33.09, 17.81, 43.19, 18.04],
  ['P4', 57.66, 17.46, 67.87, 17.69],
  ['P5', 72.55, 17.34, 82.77, 17.58],
  ['P6', 86.38, 17.87, 96.6, 18.16],
];
const nomPanneau = (id: string) => {
  const n = Number(id.slice(1));
  return `Demi-string ${n <= 3 ? 1 : 2}, panneau ${n <= 3 ? n : n - 3}`;
};
const E343_TRAITS: QSchema['traits'] = {
  image: { src: `${IMG}/q-e343-sujet.jpg`, alt: 'Deux demi-strings de trois panneaux photovoltaïques et bornier DC de l’onduleur (DC+1, DC+2, DC−) à raccorder', w: 940, h: 862 },
  bornes: [
    ...PANNEAUX.flatMap(([id, xp, yp, xm, ym]) => [
      { id: `${id}.+`, x: xp, y: yp, label: `${nomPanneau(id)} — borne +` },
      { id: `${id}.-`, x: xm, y: ym, label: `${nomPanneau(id)} — borne −` },
    ]),
    { id: 'DC+1', x: 48.4, y: 83.41, label: 'Onduleur — DC+1 (bornes 1-2-3, MPP tracker 1)' },
    { id: 'DC+2', x: 57.55, y: 83.41, label: 'Onduleur — DC+2 (bornes 1-2-3, MPP tracker 2)' },
    { id: 'DC-', x: 70.21, y: 82.02, label: 'Onduleur — DC− (bornes 1 à 6, communes)' },
  ],
  couleurs: COULEURS,
  attendues: [
    { a: 'P1.+', b: 'DC+1' }, { a: 'P1.-', b: 'P2.+' }, { a: 'P2.-', b: 'P3.+' }, { a: 'P3.-', b: 'DC-' },
    { a: 'P4.+', b: 'DC+2' }, { a: 'P4.-', b: 'P5.+' }, { a: 'P5.-', b: 'P6.+' }, { a: 'P6.-', b: 'DC-' },
  ],
  // Correction par réseau (couleurs non imposées, non notées) : les deux demi-strings
  // partagent le DC− de l'onduleur.
  reseaux: [
    { label: 'Demi-string 1 : + → DC+1', bornes: ['P1.+', 'DC+1'] },
    { label: 'Demi-string 1 : série panneaux 1-2', bornes: ['P1.-', 'P2.+'] },
    { label: 'Demi-string 1 : série panneaux 2-3', bornes: ['P2.-', 'P3.+'] },
    { label: 'Demi-strings 1 et 2 : − → DC−', bornes: ['P3.-', 'P6.-', 'DC-'] },
    { label: 'Demi-string 2 : + → DC+2', bornes: ['P4.+', 'DC+2'] },
    { label: 'Demi-string 2 : série panneaux 1-2', bornes: ['P4.-', 'P5.+'] },
    { label: 'Demi-string 2 : série panneaux 2-3', bornes: ['P5.-', 'P6.+'] },
  ],
};

/* ───────────────────────────── Questions ───────────────────────────── */

/** A.2.1.2 : ligne du bilan des puissances (valeurs imprimées ou cellules à compléter). */
const bilan = (recepteur: string, p: number | CelluleSaisie, q: number | CelluleSaisie): (string | CelluleSaisie)[] =>
  [recepteur, typeof p === 'number' ? String(p).replace('.', ',') : p, typeof q === 'number' ? String(q).replace('.', ',') : q];

const QUESTIONS: SujetQuestion[] = [
  /* ═══════════════ PARTIE A ═══════════════ */
  {
    num: 1, label: 'A.1', partie: 1, type: 'tableau',
    enonce: 'Étude du transformateur. **Décoder** les informations notées sur la plaque signalétique du transformateur Areva HTA/BT en complétant le tableau ci-dessous.',
    competence: 'C1', points: 2, dtr: [3], pageSujet: 7,
    image: { src: `${IMG}/q-a1-plaque.jpg`, alt: 'Plaque signalétique du transformateur (DTR 1)' },
    colonnes: ['Inscription', 'Signification'],
    lignes: [
      { cellules: ['400 kVA', choix('a1-400', PLAQUE, 'Puissance apparente')] },
      { cellules: ['20 000 Volt', choix('a1-20000', PLAQUE, 'Tension primaire')] },
      { cellules: ['410 Volt', choix('a1-410', PLAQUE, 'Tension secondaire')] },
      { cellules: ['D', choix('a1-d', PLAQUE, 'Primaire couplé en triangle (HTA)')] },
      { cellules: ['Y', choix('a1-y', PLAQUE, 'Secondaire couplé en étoile (BT)')] },
      { cellules: ['N', choix('a1-n', PLAQUE, 'Neutre sorti')] },
      { cellules: ['11', choix('a1-11', PLAQUE, 'Indice horaire 11 (11 × 30° = 330°)')] },
      { cellules: ['11,5 A', 'Intensité primaire nominale'] },
      { cellules: ['563,3 A', choix('a1-563', PLAQUE, 'Intensité secondaire nominale')] },
      { cellules: ['Ucc 4 %', choix('a1-ucc', PLAQUE, 'Tension de court-circuit en %')] },
    ],
    indice: 'Couplage « Dyn 11 » : D pour le primaire (majuscule, HTA), y pour le secondaire (minuscule, BT), n pour le neutre, 11 pour l’indice horaire.',
    explication: '400 kVA : puissance apparente ; 20 000 V : tension primaire ; 410 V : tension secondaire ; D : primaire couplé en triangle (HTA) ; Y : secondaire couplé en étoile (BT) ; N : neutre sorti ; 11 : indice horaire 11 (11 × 30° = 330°) ; 563,3 A : intensité secondaire nominale ; Ucc 4 % : tension de court-circuit en %.',
  },
  {
    num: 2, label: 'A.2.1.1', partie: 1, type: 'valeur',
    enonce: 'Étude énergétique. À partir des documents ressources, **compléter** le bilan des puissances installées (on néglige l’éclairage des ateliers et l’équipement des bureaux). Arrondir les résultats à 3 chiffres significatifs.\n**Donner** la formule du calcul de la puissance réactive.',
    competence: 'C3', points: 1, dtr: [5], pageSujet: 7,
    champs: [{
      id: 'q', label: 'Formule de la puissance réactive', placeholder: 'Q = …',
      acceptes: [
        'Q = P x tan φ', 'Q = P × tan φ', 'Q = P tan φ', 'Q = P*tan φ', 'Q = P.tan φ', 'Q = P x tan(φ)', 'Q = P × tan(φ)',
        'P x tan φ', 'P × tan φ', 'P tan φ', 'Q = P x tg φ', 'Q = P x tan phi', 'Q = P tan phi', 'Q = P*tan(phi)',
        'Q = tan φ x P', 'Q = √3 x U x I x sin φ', 'Q = √3 U I sin φ', 'Q = U x I x √3 x sin φ', 'Q = U x I x sin φ x √3',
        'Q = √3 × U × I × sin φ', 'Q = S x sin φ', 'Q = S sin φ', 'Q = S × sin φ',
      ],
    }],
    indice: 'Relation entre puissance active, puissance réactive et tangente de φ (DTR 3).',
    explication: 'Q = P × tan φ.',
  },
  {
    num: 3, label: 'A.2.1.2', partie: 1, type: 'tableau',
    enonce: '**Calculer** la puissance active de la tailleuse d’origine et du centre d’usinage de la nouvelle installation, puis **compléter** le tableau du bilan des puissances.',
    contexte: 'Données (DTR 2) : tailleuse d’origine et centre d’usinage : I = 63 A, facteur de puissance de l’ensemble 0,85 sous 410 V. Arrondir les résultats à 3 chiffres significatifs.',
    competence: 'C3', points: 2, dtr: [4, 3], pageSujet: 8,
    colonnes: ['', 'Tailleuse', 'Centre d’usinage'],
    lignes: [
      { cellules: ['Formule', libre('a212-f-tailleuse', 'P = …'), libre('a212-f-centre', 'P = …')] },
      { cellules: ['Application', libre('a212-a-tailleuse', 'Application numérique…'), libre('a212-a-centre', 'Application numérique…')] },
      { cellules: ['Résultat (kW)', num('a212-p-tailleuse', 38, 0.5, ['38 000 W', '38000 W']), num('a212-p-centre', 38, 0.5, ['38 000 W', '38000 W'])] },
      { cellules: ['**Récepteur**', '**Puissance active (kW)**', '**Puissance réactive (kvar)**'] },
      { cellules: ['**Bâtiment principal existant**', '', ''] },
      { cellules: bilan('Broyeur', 55, 32.6) },
      { cellules: bilan('Tapis', 3, 2.09) },
      { cellules: bilan('Scie 1', num('a212-scie1-p', 37, 0), num('a212-scie1-q', 19, 0.2)) },
      { cellules: bilan('Convoyeur', 3, 2.09) },
      { cellules: bilan('Déligneuse', 5, 3.23) },
      { cellules: bilan('Convoyeur', 3, 2.09) },
      { cellules: bilan('Scie 2', num('a212-scie2-p', 75, 0), num('a212-scie2-q', 44.5, 0.1)) },
      { cellules: ['5 convoyeurs', '5 × 3 = 15', '10,5'] },
      { cellules: bilan('Pompe hydraulique', 5, 3.23) },
      { cellules: bilan('Moteur banc', num('a212-banc-p', 11, 0), num('a212-banc-q', 7.68, 0.02)) },
      { cellules: bilan('Extracteur', 5, 3.23) },
      { cellules: bilan('Aspiration principale', num('a212-asp-p', 35, 0), num('a212-asp-q', 21.7, 0.1)) },
      { cellules: ['**Alimentation palette existante**', '', ''] },
      { cellules: bilan('Raboteuse', num('a212-rab-p', 9, 0), num('a212-rab-q', 5.34, 0.02)) },
      { cellules: bilan('Scie OT Cut 5', 5, 3.23) },
      { cellules: bilan('Tailleuse d’origine', num('a212-tail-p', 38, 0.5), num('a212-tail-q', 23.6, 0.1)) },
      { cellules: bilan('Aspiration', num('a212-aspi-p', 30, 0), num('a212-aspi-q', 18.6, 0.1)) },
      { cellules: bilan('Moulurière', num('a212-moul-p', 10, 0), num('a212-moul-q', 6.46, 0.02)) },
      { cellules: ['**Nouvelle installation**', '', ''] },
      { cellules: bilan('Extracteur', num('a212-ext-p', 30, 0), num('a212-ext-q', 17.8, 0.1)) },
      { cellules: bilan('Centre d’usinage', num('a212-cu-p', 38, 0.5), num('a212-cu-q', 23.6, 0.1)) },
      { cellules: bilan('Moulurière Profimat 22N', num('a212-prof-p', 12, 0), num('a212-prof-q', 8.38, 0.02)) },
      { cellules: bilan('Écorceuse', num('a212-eco-p', 30, 0), num('a212-eco-q', 16.2, 0.1)) },
      { cellules: bilan('**Total de l’ensemble**', num('a212-tot-p', 454, 1), num('a212-tot-q', 275, 1.5)) },
    ],
    indice: 'P = U × I × cos φ × √3 pour la tailleuse et le centre d’usinage ; Q = P × tan φ pour chaque récepteur (cos φ au DTR 2). Une seule pompe hydraulique est comptée (l’autre est en secours).',
    explication: 'Tailleuse et centre d’usinage : P = U × I × cos φ × √3 = 410 × 63 × 0,85 × √3 = 38 kW. Bilan : scie 1 37 kW / 19 kvar ; scie 2 75 kW / 44,5 kvar ; moteur banc 11 kW / 7,68 kvar ; aspiration principale 35 kW / 21,7 kvar ; raboteuse 9 kW / 5,34 kvar ; tailleuse 38 kW / 23,6 kvar ; aspiration 30 kW / 18,6 kvar ; moulurière 10 kW / 6,46 kvar ; extracteur 30 kW / 17,8 kvar ; centre d’usinage 38 kW / 23,6 kvar ; Profimat 22N 12 kW / 8,38 kvar ; écorceuse 30 kW / 16,2 kvar. Total : 454 kW et 275 kvar.',
  },
  {
    num: 4, label: 'A.2.2', partie: 1, type: 'tableau',
    enonce: '**Calculer** la puissance apparente totale existant ainsi que le facteur de puissance.',
    competence: 'C3', points: 2, dtr: [4], pageSujet: 9,
    colonnes: ['Grandeur', 'Réponse'],
    lignes: [
      { cellules: ['Formule de la puissance apparente S (VA)', libre('a22-f-s', 'S = …')] },
      { cellules: ['Calcul de la puissance apparente (kVA)', libre('a22-a-s', 'Application numérique…')] },
      { cellules: ['Résultat (kVA)', num('a22-s', 530, 3, ['530 kVA'])] },
      { cellules: ['Formule du facteur de puissance cos φ', libre('a22-f-cos', 'cos φ = …')] },
      { cellules: ['Calcul du facteur de puissance cos φ', libre('a22-a-cos', 'Application numérique…')] },
      { cellules: ['Résultat', num('a22-cos', 0.857, 0.006)] },
      { cellules: ['Calcul de la tangente φ', num('a22-tan', 0.601, 0.008)] },
    ],
    indice: 'Totaux du bilan A.2.1.2 : P = 454 kW et Q = 275 kvar ; S = √(P² + Q²) et cos φ = P / S.',
    explication: 'S = √(P² + Q²) = √(454² + 275²) = 530 kVA ; cos φ = P / S = 454 / 530 = 0,857 ; tan φ = 0,601.',
  },
  {
    num: 5, label: 'A.2.3', partie: 1, type: 'calcul',
    enonce: 'Le fournisseur d’énergie impose une tangente φ’ égale à 0,4.\n**Calculer** la puissance réactive Qc à compenser pour obtenir tan φ’ = 0,4 au secondaire du transformateur avant extension.',
    competence: 'C3', points: 2, dtr: [5], pageSujet: 9,
    grandeur: 'Qc', unite: 'kvar',
    formule: 'Qc = P × (tan φ − tan φ’)',
    formuleMotsCles: ['tan', '-'],
    attendu: 91.3, tolerance: 1.3, arrondi: '3 chiffres significatifs',
    indice: 'Formule de la puissance réactive à installer au DTR 3 ; tan φ = 0,601 (A.2.2).',
    explication: 'Qc = P × (tan φ − tan φ’) = 454 × (0,601 − 0,4) = 91,3 kvar.',
  },
  {
    num: 6, label: 'A.2.4', partie: 1, type: 'tableau',
    enonce: '**Calculer** la puissance apparente après compensation.',
    competence: 'C3', points: 2, dtr: [5], pageSujet: 9,
    colonnes: ['Grandeur', 'Formule', 'Valeur'],
    lignes: [
      { cellules: ['Puissance active totale', '', '454 kW'] },
      { cellules: ['Puissance réactive finale après compensation Qf (kvar)', libre('a24-f-qf', 'Qf = …'), num('a24-qf', 184, 2)] },
      { cellules: ['Puissance apparente finale Sf (kVA)', libre('a24-f-sf', 'Sf = …'), num('a24-sf', 490, 4)] },
    ],
    indice: 'La compensation retranche Qc à la puissance réactive ; la puissance active ne change pas.',
    explication: 'Qf = Q − Qc = 275 − 91,3 = 184 kvar ; Sf = √(P² + Qf²) = √(454² + 184²) = 490 kVA.',
  },
  {
    num: 7, label: 'A.2.5', partie: 1, type: 'calcul',
    enonce: '**Calculer** l’intensité absorbée après compensation.',
    contexte: 'Pour la suite on prendra Sn = 490 kVA et Qc = 92 kvar.',
    competence: 'C3', points: 2, dtr: [3], pageSujet: 9,
    grandeur: 'I', unite: 'A',
    formule: 'I = S / (U × √3)',
    formuleMotsCles: ['/', 'u'],
    attendu: 690, tolerance: 5,
    indice: 'Réseau triphasé 410 V au secondaire du transformateur (DTR 1).',
    explication: 'I = S / (U × √3) = 490 000 / (410 × √3) = 690 A.',
  },
  {
    num: 8, label: 'A.2.6', partie: 1, type: 'redige',
    enonce: '**Préciser** et **justifier** si le transformateur actuel est adapté.',
    competence: 'C3', points: 1, dtr: [3], pageSujet: 9,
    motsCles: ['non', '400', '490', 'inferieur', 'insuffisant', 'depasse', 'surcharge', '563', '690'], minMotsCles: 2, lignes: 3,
    corrige: 'Non : le transformateur actuel (400 kVA, 563 A au secondaire) n’est pas adapté, sa puissance est inférieure à la puissance utilisée (490 kVA, 690 A).',
    indice: 'Comparer la puissance de la plaque (A.1) à la puissance apparente calculée en A.2.4.',
    explication: 'Non : la puissance du transformateur (400 kVA) est inférieure à la puissance utilisée (490 kVA).',
  },
  {
    num: 9, label: 'A.3.1', partie: 1, type: 'tableau',
    enonce: 'Choix de la compensation de l’énergie réactive. En vous aidant de la documentation technique, **déterminer** le type de compensation à installer.',
    competence: 'C3', points: 1, dtr: [5], pageSujet: 10,
    colonnes: ['Justification : Qc / Sn (%)', 'Type de compensation'],
    lignes: [{ cellules: [
      num('a31-ratio', 18.8, 0.4, ['0,188', '0,19', '0,187']),
      choix('a31-type', ['Fixe', 'Automatique'], 'Automatique'),
    ] }],
    indice: 'Critère Qc / Sn du DTR 3 : au-delà de 15 %, compensation automatique.',
    explication: 'Qc / Sn = 92 / 490 = 0,188 soit 18,8 % > 15 % : compensation automatique.',
  },
  {
    num: 10, label: 'A.3.2', partie: 1, type: 'tableau',
    enonce: '**Choisir** la compensation fixe Varset à installer (non pollué) et **compléter** le tableau.',
    competence: 'C3', points: 1, dtr: [6], pageSujet: 10,
    colonnes: ['Puissance (kvar)', 'Référence disjoncteur', 'Référence Varset'],
    lignes: [{ cellules: [
      num('a32-q', 100, 0),
      txt('a32-disj', ['CVS250F 200A', 'CVS250F200A', 'CVS 250F 200A', 'CVS250F 200 A', 'CVS250F']),
      txt('a32-varset', ['VLVAW1L100A40A']),
    ] }],
    indice: 'Tableau « VarSet Easy pour réseaux non pollués » (DTR 4) : première puissance supérieure ou égale à Qc = 92 kvar.',
    // Le sujet demande une compensation « fixe » alors que A.3.1 conclut « automatique » : le
    // corrigé choisit dans le tableau VarSet Easy (non pollué), suivi ici.
    explication: '100 kvar (≥ 92 kvar) : disjoncteur CVS250F 200A, VarSet VLVAW1L100A40A.',
  },
  {
    num: 11, label: 'A.4.1', partie: 1, type: 'tableau',
    enonce: 'Choix du nouveau transformateur et de sa protection (fusible). D’après la documentation technique, **choisir** un transformateur adapté (on vous impose IP00) puis **compléter** le tableau ci-dessous.',
    competence: 'C3', points: 1, dtr: [9, 7], pageSujet: 10,
    colonnes: ['Puissance apparente du transformateur (kVA)', 'Référence'],
    lignes: [{ cellules: [num('a41-s', 630, 0), txt('a41-ref', ['TRI063020003004'])] }],
    indice: 'Tableau des transformateurs Trihal 20 kV / 410 V (DTR 6) : première puissance supérieure à 490 kVA, ligne « transformateurs IP 00 ».',
    explication: '630 kVA, référence TRI063020003004 (IP 00).',
  },
  {
    num: 12, label: 'A.4.2', partie: 1, type: 'calcul',
    enonce: '**Déterminer** l’intensité nominale primaire.',
    competence: 'C3', points: 2, dtr: [9], pageSujet: 10,
    grandeur: 'I', unite: 'A',
    formule: 'I = S / (U × √3)',
    formuleMotsCles: ['/', 'u'],
    attendu: 18.2, tolerance: 0.2,
    indice: 'Tension primaire du nouveau transformateur : 20 kV.',
    explication: 'I = S / (U × √3) = 630 000 / (20 000 × √3) = 18,2 A.',
  },
  {
    num: 13, label: 'A.4.3', partie: 1, type: 'valeur',
    enonce: '**Choisir** les fusibles protégeant le primaire du transformateur sachant que le courant maximum de coupure est de 31,5 kA.',
    competence: 'C3', points: 1, dtr: [11, 10], pageSujet: 10,
    champs: [{ id: 'ref', label: 'Référence', acceptes: ['51108818M0', '5108818M0'] }],
    indice: 'Tension assignée 24 kV (réseau 20 kV), courant assigné juste supérieur à 18,2 A, courant maximal de coupure 31,5 kA (DTR 8).',
    // Corrigé officiel : « 5108818M0 » (chiffre manquant) ; la référence du DTR 8 est 51108818M0.
    explication: 'Fusible Fusarc CF 24 kV, 20 A, 31,5 kA : référence 51108818M0.',
  },

  /* ═══════════════ PARTIE B ═══════════════ */
  {
    num: 14, label: 'B.1.1', partie: 2, type: 'redige',
    enonce: 'Dimensionnement de l’éclairage du nouveau bâtiment. **Citer** quatre impacts sur la santé en cas d’un éclairage inadapté.',
    competence: 'C1', points: 1, dtr: [12], pageSujet: 11,
    motsCles: ['fatigue', 'posture', 'chute', 'accident', 'musculo', 'tms', 'eblouissement', 'mal de tete', 'inconfort'], minMotsCles: 3, lignes: 4,
    corrige: 'La fatigue oculaire, des postures contraignantes (troubles musculo-squelettiques), des chutes et des accidents.',
    indice: 'Rubrique « Les impacts sur la santé » du DTR 9.',
    explication: 'Fatigue oculaire ; postures contraignantes (TMS) ; chutes ; accidents.',
  },
  {
    num: 15, label: 'B.1.2', partie: 2, type: 'tableau',
    enonce: '**Donner** les dimensions du nouveau bâtiment.',
    competence: 'C1', points: 1, dtr: [33], pageSujet: 11,
    colonnes: ['Dimension', 'Valeur (m)'],
    lignes: [
      { cellules: ['Longueur', num('b12-l', 35, 0)] },
      { cellules: ['Largeur', num('b12-lg', 15.2, 0.05)] },
      { cellules: ['Hauteur totale (ht)', num('b12-ht', 7.5, 0)] },
    ],
    indice: 'Plan de masse de l’extension (DTR 29, cotes en cm) et mise en situation (plafond à 7,50 m).',
    explication: 'Longueur 35 m ; largeur 15,20 m ; hauteur totale ht = 7,50 m.',
  },
  {
    num: 16, label: 'B.1.3', partie: 2, type: 'tableau',
    enonce: '**Indiquer** pour les différentes surfaces les facteurs de réflexion.',
    competence: 'C3', points: 1, dtr: [13], pageSujet: 11,
    colonnes: ['Surface', 'Facteur de réflexion'],
    lignes: [
      { cellules: ['Plafond', num('b13-plafond', 7, 0)] },
      // Corrigé officiel : murs = 7 (cohérent avec le facteur 773 imposé en B.1.10) ; le DTR 10
      // donne 5 pour des murs « clairs » : les deux valeurs sont acceptées.
      { cellules: ['Murs', num('b13-murs', 7, 0, ['5'])] },
      { cellules: ['Plan utile', num('b13-plan', 3, 0)] },
    ],
    indice: 'Tableau des facteurs de réflexion (DTR 10) : plafond, murs et plans de travail de couleur claire.',
    explication: 'Plafond = 7 ; murs = 7 ; plan utile = 3 (facteur de réflexion 773, repris en B.1.10).',
  },
  {
    num: 17, label: 'B.1.4', partie: 2, type: 'tableau',
    enonce: 'D’après le dossier technique et les données précédentes, **déterminer** les éléments suivants.',
    competence: 'C3', points: 1, dtr: [13, 16], pageSujet: 11,
    colonnes: ['Élément', 'Valeur'],
    lignes: [
      { cellules: ['Plan utile (hu) en m', num('b14-hu', 1.1, 0, ['110 cm'])] },
      { cellules: ['Niveau d’éclairement (E) en lux', num('b14-e', 500, 0)] },
      { cellules: ['Mode d’éclairage (entourer)', choix('b14-mode', ['direct', 'indirect'], 'direct')] },
    ],
    indice: 'Éclairements recommandés (DTR 12) : travail du bois sur machines.',
    explication: 'hu = 1,10 m ; E = 500 lux (travail du bois sur machines) ; éclairage direct.',
  },
  {
    num: 18, label: 'B.1.5', partie: 2, type: 'valeur',
    enonce: '**Déterminer** la plage de température de couleur pour assurer le confort visuel sous le niveau d’éclairement choisi.',
    competence: 'C3', points: 1, dtr: [14], pageSujet: 12,
    champs: [
      { id: 'tmin', label: 'Température de couleur minimale', unite: 'K', attendu: 3100, tolerance: 200 },
      { id: 'tmax', label: 'Température de couleur maximale', unite: 'K', attendu: 5100, tolerance: 200 },
    ],
    indice: 'Courbe du DTR 13 : lire les deux courbes à 500 lux ; le confort est dans la zone ombrée.',
    explication: 'Pour E = 500 lx, il faut une température de couleur entre 3 100 K et 5 100 K.',
  },
  {
    num: 19, label: 'B.1.6', partie: 2, type: 'tableau',
    enonce: '**Définir** le type de source lumineuse. On impose une température de couleur de 4000 K. D’après les documents techniques, **compléter** le tableau.',
    competence: 'C3', points: 1, dtr: [15], pageSujet: 12,
    colonnes: ['Caractéristique', 'Valeur'],
    lignes: [
      { cellules: ['Référence', txt('b16-ref', ['LHBE25B20R40-01', 'LHBE25B20R4001', 'LHBE25B20R40'])] },
      { cellules: ['Puissance (W)', num('b16-p', 150, 0)] },
      { cellules: ['Température de couleur (K)', num('b16-t', 4000, 0)] },
    ],
    indice: 'Parmi les luminaires du DTR 14 : dimmable 1-10 V (non DALI) et 4000 K.',
    explication: 'Cloche LED industrielle 150 W, 135 lm/W, dimmable 1-10 V, IP65, 4000 K : référence LHBE25B20R40-01.',
  },
  {
    num: 20, label: 'B.1.7', partie: 2, type: 'valeur',
    enonce: '**Donner** le facteur de dépréciation.',
    contexte: 'Pour la suite des questions on impose le luminaire Noxion Highbay LED Concord G3 / 200 W / 4000 K / CRI > 80 / 1-10 V Dimmable / 150 lm/W / 139,99 € HT. Le luminaire sera fixé au plafond (J = 0).',
    competence: 'C3', points: 1, dtr: [13], pageSujet: 12,
    champs: [{ id: 'd', label: 'Facteur compensateur de dépréciation (d) =', attendu: 1.65, tolerance: 0 }],
    indice: 'Facteurs de dépréciation (DTR 11) : empoussièrement « élevé ».',
    explication: 'Empoussièrement élevé (menuiseries) : d = 1,65.',
  },
  {
    num: 21, label: 'B.1.8', partie: 2, type: 'calcul',
    enonce: '**Calculer** l’indice du local.\nK = (longueur × largeur) / (h × (longueur + largeur))',
    competence: 'C3', points: 2, dtr: [16], pageSujet: 12,
    grandeur: 'K',
    formule: 'K = (a × b) / [h × (a + b)]',
    formuleMotsCles: ['/', '+'],
    attendu: 1.66, tolerance: 0.02, arrondi: '2 décimales',
    indice: 'h = hauteur du luminaire au-dessus du plan utile : ht − hu = 7,50 − 1,10 (luminaire au plafond).',
    explication: 'K = (35 × 15,20) / [6,40 × (35 + 15,20)] = 532 / 321,28 = 1,66, arrondi à la valeur normalisée 2 (DTR 15).',
  },
  {
    num: 22, label: 'B.1.9', partie: 2, type: 'valeur',
    enonce: '**Donner** le rapport de suspension.',
    competence: 'C3', points: 1, dtr: [16], pageSujet: 12,
    champs: [{ id: 'j', label: 'J =', attendu: 0, tolerance: 0 }],
    indice: 'Rapport de suspension (DTR 15) : deux valeurs seulement.',
    explication: 'J = 0 (luminaire contre le plafond).',
  },
  {
    num: 23, label: 'B.1.10', partie: 2, type: 'valeur',
    enonce: '**Déterminer** l’utilance (U) à l’aide des tableaux du DTR 16.',
    contexte: 'On donne : classe du luminaire = C ; valeur de J = 0 ; indice du local = 2 ; facteur de réflexion = 773.',
    competence: 'C3', points: 1, dtr: [17], pageSujet: 12,
    image: { src: `${IMG}/q-b110-utilance.jpg`, alt: 'Tableaux d’utilance des luminaires classes B et C, J = 0 et J = 1/3 (DTR 16)' },
    champs: [{ id: 'u', label: 'L’utilance U =', unite: '%', attendu: 105, tolerance: 0, acceptes: ['1,05'] }],
    indice: 'Tableau « Luminaire classe C, J = 0 », ligne 2,00, colonne 773.',
    // Le sujet impose K = 2 alors que B.1.8 donne 1,66 (valeur normalisée : 2) : donnée du sujet.
    explication: 'Classe C, J = 0, K = 2, facteur 773 : U = 105 %.',
  },
  {
    num: 24, label: 'B.1.11', partie: 2, type: 'calcul',
    enonce: '**Calculer** le facteur d’utilisation.\nFormule à utiliser : u = η × U',
    competence: 'C3', points: 1, dtr: [17], pageSujet: 13,
    grandeur: 'u',
    formule: 'u = η × U',
    formuleMotsCles: ['0.9', '1.05'],
    attendu: 0.945, tolerance: 0.005,
    indice: 'η = 0,9 (mise en situation) et U = 105 / 100.',
    explication: 'u = rendement du luminaire × utilance = 0,9 × (105 / 100) = 0,945.',
  },
  {
    num: 25, label: 'B.1.12', partie: 2, type: 'calcul',
    enonce: '**Calculer** le flux total à fournir.\nAvec U = facteur d’utilance (en %) / 100 et d = facteur compensateur de dépréciation.',
    competence: 'C3', points: 2, dtr: [17], pageSujet: 13,
    grandeur: 'F', unite: 'lm',
    formule: 'F = (E × S × d) / (η × U)',
    formuleMotsCles: ['500', '1.65'],
    attendu: 464443, tolerance: 4700,
    indice: 'Formule du flux lumineux total (DTR 16) : S = longueur × largeur du local.',
    explication: 'F = (500 × 35 × 15,20 × 1,65) / ((105 / 100) × 0,9) = 464 443 lm.',
  },
  {
    num: 26, label: 'B.1.13', partie: 2, type: 'calcul',
    enonce: '**Calculer** le flux pour un luminaire.',
    competence: 'C3', points: 1, dtr: [15], pageSujet: 13,
    grandeur: 'φ', unite: 'lm',
    formule: 'φ = P × efficacité lumineuse',
    formuleMotsCles: ['200', '150'],
    attendu: 30000, tolerance: 0,
    indice: 'Luminaire imposé : 200 W et 150 lm/W.',
    explication: 'φ = P × k = 200 W × 150 lm/W = 30 000 lm.',
  },
  {
    num: 27, label: 'B.1.14', partie: 2, type: 'calcul',
    enonce: '**Déterminer** le nombre, arrondi par défaut, de luminaires à installer.',
    competence: 'C3', points: 1, dtr: [17], pageSujet: 13,
    grandeur: 'N',
    formule: 'N = flux total / flux d’un luminaire',
    formuleMotsCles: ['/'],
    attendu: 15, tolerance: 0, arrondi: 'nombre entier, arrondi par défaut',
    indice: 'N = F / φ, puis arrondir au nombre entier inférieur (consigne du sujet).',
    explication: 'N = 464 443 lm / 30 000 lm = 15,48, soit 15 luminaires.',
  },
  {
    num: 28, label: 'B.1.15', partie: 2, type: 'tableau',
    enonce: '**Compléter** le devis « éclairage ».',
    contexte: 'Devis des luminaires.',
    competence: 'C11', points: 2, dtr: [15], pageSujet: 13,
    colonnes: ['Désignation', 'PU HT (€)', 'Quantité', 'Prix total HT (€)'],
    lignes: [
      { cellules: [libre('b115-des', 'Désignation du luminaire…'), num('b115-pu', 139.99, 0.005), num('b115-qte', 15, 0), num('b115-ht', 2099.85, 0.02)] },
      { cellules: ['', '', 'TVA (20 %)', num('b115-tva', 419.97, 0.02)] },
      { cellules: ['', '', 'Prix total TTC', num('b115-ttc', 2519.82, 0.03)] },
    ],
    indice: 'Luminaire imposé (Highbay LED Concord G3) à 139,99 € HT ; quantité : B.1.14.',
    explication: 'Highbay LED Concord G3 : 15 × 139,99 = 2 099,85 € HT ; TVA 20 % = 419,97 € ; total TTC = 2 519,82 €.',
  },
  {
    num: 29, label: 'B.1.16', partie: 2, type: 'placement',
    enonce: '**Compléter** l’implantation des luminaires.\nOn impose dans la longueur 5 luminaires et 3 dans la largeur.',
    competence: 'C11', points: 4, dtr: [33], pageSujet: 14,
    plan: { src: `${IMG}/q-b116-plan.jpg`, alt: 'Plan du nouveau bâtiment : rectangle de 15,2 m × 35 m', w: PLAN_B116.w, h: PLAN_B116.h },
    symbole: 'luminaire',
    zone: {
      x0: r4(PLAN_B116.x0 / PLAN_B116.w), y0: r4(PLAN_B116.y0 / PLAN_B116.h),
      x1: r4(PLAN_B116.x1 / PLAN_B116.w), y1: r4(PLAN_B116.y1 / PLAN_B116.h),
    },
    attendus: IMPLANTATION,
    // ± 1 m autour de chaque position, converti en fraction de l'image dans chaque direction.
    tolerance: {
      x: r4((PLAN_B116.x1 - PLAN_B116.x0) / PLAN_B116.largeur / PLAN_B116.w),
      y: r4((PLAN_B116.y1 - PLAN_B116.y0) / PLAN_B116.longueur / PLAN_B116.h),
    },
    max: 20,
    indice: 'Entraxe d = dimension / nombre de luminaires, et d/2 entre le dernier luminaire et le mur.',
    explication: 'Dans la longueur : 35 m / 5 = 7 m d’entraxe, 3,5 m aux murs ; dans la largeur : 15,2 m / 3 = 5,07 m d’entraxe, 2,53 m aux murs. Implantation de 5 rangées de 3 luminaires (tolérance ± 1 m).',
  },
  {
    num: 30, label: 'B.2.1', partie: 2, type: 'tableau',
    enonce: 'Étude du système d’éclairage KNX. **Calculer** l’énergie annuelle consommée par l’éclairage sans la prise en compte des apports naturels.',
    contexte:
      'Pour maîtriser la consommation d’énergie dans le nouveau bâtiment, on désire installer un système d’éclairage intelligent et autonome par détection de présence à 360°. Le nouveau bâtiment sera équipé d’un module KNX ainsi que de capteurs de luminosité intégrés aux détecteurs de présence qui prennent en compte l’apport de lumière naturelle pour régler l’intensité des luminaires. Le bâtiment comporte plusieurs ouvertures (portes coulissantes, fenêtres…) qui permettent un apport d’éclairage naturel.\n'
      + 'Matériel KNX : une alimentation bus KNX, courant de sortie 320 mA ; une interface USB bus KNX ; un actionneur de commutation 1-10 V 3 sorties ; un câble bus KNX simple paire torsadé.\n'
      + 'Le nouveau bâtiment sera équipé : de 3 détecteurs de présence intérieur avec récepteur infrarouge et contrôle de luminosité, installés au plafond en saillie ; de 3 commandes multifonction 6 touches / enjoliveur anthracite pour la gestion de la lumière des 3 zones ; de 15 luminaires de 200 W alimentés par câble U1000R2V 3G1,5 mm².\n'
      + 'Protection mise en place : disjoncteur différentiel (Q20) ; disjoncteur calibre 16 A pour la protection de l’éclairage (Q212).',
    competence: 'C3', points: 1, dtr: [], pageSujet: 16,
    colonnes: ['Nombre d’heures d’utilisation annuelle (h)', 'Puissance totale des luminaires (W)', 'Énergie totale consommée (kWh)'],
    lignes: [{ cellules: [
      num('b21-h', 3500, 0),
      num('b21-p', 3000, 0, ['3 kW']),
      num('b21-e', 10500, 0, ['10 500 000 Wh', '10500000 Wh', '10,5 MWh']),
    ] }],
    indice: 'Utilisation annuelle : 2 250 h de jour + 1 250 h de nuit (mise en situation de la partie B) ; 15 luminaires de 200 W.',
    explication: '3 500 h ; 200 W × 15 = 3 000 W ; énergie : 3 000 × 3 500 = 10 500 000 Wh soit 10 500 kWh.',
  },
  {
    num: 31, label: 'B.2.2', partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût annuel de l’énergie consommée par le nouveau bâtiment, sans le protocole KNX, sachant que le prix du kWh est de 0,23 €.',
    competence: 'C3', points: 1, dtr: [], pageSujet: 16,
    grandeur: 'Coût annuel', unite: '€',
    formule: 'Coût = énergie consommée × prix du kWh',
    formuleMotsCles: ['0.23'],
    attendu: 2415, tolerance: 1,
    explication: '10 500 × 0,23 € = 2 415 €.',
  },
  {
    num: 32, label: 'B.2.3', partie: 2, type: 'tableau',
    enonce: '**Calculer** l’énergie annuelle consommée par l’éclairage avec la prise en compte des apports naturels.',
    contexte: 'On estime qu’avec la gestion des éclairages par les modules KNX, la lumière naturelle pénétrant dans le nouveau bâtiment permettra de compenser l’éclairage pendant 1 500 heures par an.',
    competence: 'C3', points: 1, dtr: [], pageSujet: 16,
    colonnes: ['Nombre d’heures d’utilisation avec prise en compte de l’éclairage naturel (h)', 'Puissance totale des luminaires (W)', 'Énergie totale consommée (kWh)'],
    lignes: [{ cellules: [
      num('b23-h', 2000, 0),
      num('b23-p', 3000, 0, ['3 kW']),
      num('b23-e', 6000, 0, ['6 000 000 Wh', '6000000 Wh', '6 MWh']),
    ] }],
    explication: '3 500 − 1 500 = 2 000 h ; 200 W × 15 = 3 000 W ; énergie : 6 000 000 Wh soit 6 000 kWh.',
  },
  {
    num: 33, label: 'B.2.4', partie: 2, type: 'tableau',
    enonce: '**Calculer** le nouveau coût annuel de l’énergie consommée par le nouveau bâtiment en intégrant les apports naturels, sachant que le prix du kWh est de 0,23 €.',
    competence: 'C3', points: 1, dtr: [], pageSujet: 16,
    colonnes: ['Coût annuel en euros', 'Économie annuelle réalisée (€)'],
    lignes: [{ cellules: [num('b24-cout', 1380, 1), num('b24-eco', 1035, 1)] }],
    explication: '6 000 × 0,23 € = 1 380 € ; économie annuelle : 2 415 − 1 380 = 1 035 €.',
  },
  {
    num: 34, label: 'B.2.5', partie: 2, type: 'tableau',
    enonce: 'D’après la documentation technique mise à disposition, répondre aux questions suivantes.\n**Compléter** le tableau suivant afin de recenser le matériel nécessaire à la préparation du chantier.',
    competence: 'C3', points: 2, dtr: [20, 21, 22], pageSujet: 17,
    colonnes: ['Matériel', 'Référence', 'Fonction', 'Quantité'],
    lignes: [
      { cellules: ['Actionneur commutation', txt('b25-act', ['MTN646991']), libre('b25-act-f', 'Fonction…'), num('b25-act-q', 1, 0)] },
      { cellules: ['Commande multifonction 6 touches anthracite', txt('b25-cde', ['MTN6193-6034', 'MTN61936034']), libre('b25-cde-f', 'Fonction…'), num('b25-cde-q', 3, 0)] },
      { cellules: ['Détecteurs de présence', txt('b25-det', ['MTN6354-0019', 'MTN63540019']), libre('b25-det-f', 'Fonction…'), num('b25-det-q', 3, 0)] },
      { cellules: ['Alimentation bus KNX', txt('b25-alim', ['MTN684032']), libre('b25-alim-f', 'Fonction…'), num('b25-alim-q', 1, 0)] },
      { cellules: ['Coupleur / répéteur de bus KNX', 'MTN6500-0101', 'Permet de se connecter au bus KNX pour le paramétrage et le diagnostic avec le logiciel ETS', '1'] },
    ],
    indice: 'Actionneur pour interfaces 1-10 V à 3 sorties (DTR 18) ; bouton-poussoir 6 touches anthracite (DTR 20) ; détecteur en saillie pour grande hauteur (DTR 21) ; alimentation 320 mA (DTR 19).',
    explication: 'Actionneur MTN646991 (commander l’éclairage) × 1 ; commande MTN6193-6034 (commande les participants / modules) × 3 ; détecteur MTN6354-0019 (détecte la présence des personnes et régule l’éclairage en fonction de la lumière naturelle) × 3 ; alimentation MTN684032 (alimente le bus) × 1.',
  },
  {
    num: 35, label: 'B.2.6', partie: 2, type: 'valeur',
    enonce: '**Donner** la tension d’alimentation fournie par « l’alimentation bus KNX ».',
    competence: 'C1', points: 1, dtr: [21], pageSujet: 18,
    champs: [{ id: 'u', label: 'U =', unite: 'V', attendu: 30, tolerance: 0, acceptes: ['30 Vcc', '30 V DC', '30 VDC', '30 V continu'] }],
    explication: 'U = 30 V continu (30 Vcc).',
  },
  {
    num: 36, label: 'B.2.7', partie: 2, type: 'valeur',
    enonce: '**Donner** la longueur de câblage maximale entre l’alimentation KNX et l’abonné au bus (capteur, bouton…).',
    competence: 'C1', points: 1, dtr: [23, 24], pageSujet: 18,
    champs: [{ id: 'l', label: 'L =', unite: 'm', attendu: 350, tolerance: 0, acceptes: ['< 350 m', '350 m maximum', 'max. 350 m'] }],
    indice: 'Tableau « Distances maximales » du DTR 22.',
    explication: 'L < 350 m (distance entre une alimentation et un participant).',
  },
  {
    num: 37, label: 'B.2.8', partie: 2, type: 'tableau',
    enonce: '**Déterminer** la référence et la section du câble bus KNX à mettre en place.',
    competence: 'C3', points: 1, dtr: [23], pageSujet: 18,
    colonnes: ['Câble', 'Référence', 'Section des fils (mm²)'],
    lignes: [{ cellules: [
      'Câble bus KNX simple paire torsadée',
      txt('b28-ref', ['0 492 91', '049291', '49291']),
      num('b28-s', 0.5, 0, ['0,5 mm²']),
    ] }],
    explication: 'Référence 0 492 91 (simple paire) ; section 0,5 mm².',
  },
  {
    num: 38, label: 'B.2.9', partie: 2, type: 'tableau',
    enonce: '**Proposer** un adressage dans le tableau suivant en prenant les premières adresses disponibles et dans l’ordre.',
    competence: 'C6', points: 1, dtr: [24], pageSujet: 18,
    colonnes: ['Matériel', 'Adresse'],
    lignes: [
      { cellules: ['Coupleur / répéteur de bus KNX', txt('b29-coupleur', ['1.1.0'])] },
      { cellules: ['Alimentation bus KNX', '1.1.-'] },
      { cellules: ['Actionneur commutation', txt('b29-act', ['1.1.1'])] },
      { cellules: ['Commande multifonction 6 touches zone 1', txt('b29-z1', ['1.1.2'])] },
      { cellules: ['Commande multifonction 6 touches zone 2', txt('b29-z2', ['1.1.3'])] },
      { cellules: ['Commande multifonction 6 touches zone 3', txt('b29-z3', ['1.1.4'])] },
      { cellules: ['Détecteur de présence 1', txt('b29-d1', ['1.1.5'])] },
      { cellules: ['Détecteur de présence 2', txt('b29-d2', ['1.1.6'])] },
      { cellules: ['Détecteur de présence 3', txt('b29-d3', ['1.1.7'])] },
    ],
    indice: 'Adressage physique Z.L.P (DTR 23) : le coupleur de ligne porte le numéro de participant 0.',
    explication: 'Coupleur 1.1.0 ; actionneur 1.1.1 ; commandes 1.1.2, 1.1.3, 1.1.4 ; détecteurs 1.1.5, 1.1.6, 1.1.7 (l’alimentation n’a pas d’adresse).',
  },

  /* ═══════════════ PARTIE C ═══════════════ */
  {
    num: 39, label: 'C.1', partie: 3, type: 'tableau',
    enonce: 'Habilitation. Avant tous travaux, une personne est chargée de consigner l’installation afin que les ouvriers habilités puissent intervenir sans danger sur celle-ci. **Compléter** le tableau ci-dessous avec son titre d’habilitation et son nom.\nUne personne pourrait gérer les travaux sur ce chantier. **Compléter** le tableau ci-dessous avec son titre d’habilitation et son nom.',
    tableauContexte: PLANNING,
    competence: 'C1', points: 1, dtr: [], pageSujet: 20,
    colonnes: ['Fonction', 'Titre d’habilitation', 'Nom'],
    lignes: [
      { cellules: ['Personne pouvant réaliser la consignation', choix('c1-bc-titre', TITRES, 'BC'), choix('c1-bc-nom', AGENTS, 'Agent A')] },
      { cellules: ['Personne pouvant être chargé de travaux', choix('c1-b2v-titre', TITRES, 'B2V'), choix('c1-b2v-nom', AGENTS, 'Agent B')] },
    ],
    indice: 'Consignation : lettre C ; chargé de travaux : indice 2. Vérifier aussi la disponibilité sur le planning.',
    explication: 'Chargé de consignation : BC, Agent A. Chargé de travaux : B2V, Agent B (Agent C, également B2V, est pris par le chantier 3 pendant toute la période).',
  },
  {
    num: 40, label: 'C.2', partie: 3, type: 'tableau',
    enonce: 'Pour le remplacement des 3 rampes de luminaires. Votre entreprise souhaite avoir le maximum de personnes sur toute la durée du chantier afin de garantir les délais de livraison. **Compléter** le tableau ci-dessous avec le nom des personnes qui peuvent intervenir, leur titre d’habilitation et à quelles dates.',
    contexte: 'Indiquer les personnes dans l’ordre du planning.',
    tableauContexte: PLANNING,
    competence: 'C1', points: 2, dtr: [], pageSujet: 20,
    colonnes: ['Personnel', 'Habilitation', 'Dates'],
    lignes: [
      { cellules: [choix('c2-1-nom', AGENTS, 'Agent A'), choix('c2-1-hab', TITRES, 'BC'), choix('c2-1-dates', CRENEAUX, 'S18 : mardi, mercredi et jeudi')] },
      { cellules: [choix('c2-2-nom', AGENTS, 'Agent B'), choix('c2-2-hab', TITRES, 'B2V'), choix('c2-2-dates', CRENEAUX, 'S18 : mardi, mercredi et jeudi')] },
      { cellules: [choix('c2-3-nom', AGENTS, 'Agent G'), choix('c2-3-hab', TITRES, 'B1V'), choix('c2-3-dates', CRENEAUX, 'S18 : mardi, mercredi et jeudi')] },
    ],
    indice: 'Chercher 3 jours consécutifs (1 jour par rangée) où le plus grand nombre de personnes habilitées sont libres (ni chantier, ni RTT, ni CL, ni congés).',
    explication: 'Agent A (BC), Agent B (B2V) et Agent G (B1V) : S18, mardi, mercredi et jeudi.',
  },
  {
    num: 41, label: 'C.3', partie: 3, type: 'redige',
    enonce: '**Indiquer** à partir de quelle opération le chargé de travaux peut faire commencer le remplacement des luminaires.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 21,
    motsCles: ['attestation', 'consignation', 'bc', 'charge de consignation', 'b2v', 'charge de travaux'], minMotsCles: 2, lignes: 3,
    corrige: 'Lorsque le chargé de consignation (BC) délivre l’attestation de consignation au chargé de travaux (B2V).',
    explication: 'Lorsque le BC délivre l’attestation de consignation au B2V.',
  },
  {
    num: 42, label: 'C.4', partie: 3, type: 'tableau',
    enonce: 'Quels sont les appareils qui devront être consignés dans l’ordre pour le remplacement des luminaires du bâtiment existant (d’abord pour la rangée 1, puis la 2 puis la 3) ?\nUne fois l’opération terminée, chaque rangée de luminaires devra être remise en service.',
    competence: 'C1', points: 1, dtr: [46, 45, 47], pageSujet: 21,
    colonnes: ['Ordre', 'Appareil à consigner'],
    lignes: [
      { cellules: ['1 — rangée 1', choix('c4-1', APPAREILS, 'Q205')] },
      { cellules: ['2 — rangée 2', choix('c4-2', APPAREILS, 'Q206')] },
      { cellules: ['3 — rangée 3', choix('c4-3', APPAREILS, 'Q207')] },
    ],
    indice: 'Schéma unifilaire (DTR 37, folio 2) : départs « Rampe 1, 2, 3 — éclairage atelier existant ».',
    explication: 'Les disjoncteurs Q205 puis Q206 puis Q207.',
  },
  {
    num: 43, label: 'C.5', partie: 3, type: 'tableau',
    enonce: '**Donner** les étapes de la consignation.',
    competence: 'C1', points: 2, dtr: [], pageSujet: 21,
    colonnes: ['Nom des étapes', 'Objectif de chaque étape'],
    lignes: [
      { cellules: [choix('c5-e1', ETAPES, 'Séparation'), choix('c5-o1', OBJECTIFS, OBJECTIFS[0])] },
      { cellules: [choix('c5-e2', ETAPES, 'Condamnation'), choix('c5-o2', OBJECTIFS, OBJECTIFS[1])] },
      { cellules: [choix('c5-e3', ETAPES, 'Identification'), choix('c5-o3', OBJECTIFS, OBJECTIFS[2])] },
      { cellules: [choix('c5-e4', ETAPES, 'Vérification d’absence de tension (VAT)'), choix('c5-o4', OBJECTIFS, OBJECTIFS[3])] },
    ],
    indice: 'Quatre étapes, dans l’ordre : on sépare, on condamne, on identifie, on vérifie.',
    explication: 'Séparation : séparer l’ouvrage des sources de tension. Condamnation : interdire la manœuvre de l’organe de séparation. Identification : être certain que les travaux seront effectués sur l’ouvrage séparé et dont les organes de séparation sont condamnés en position ouverte. V.A.T. : vérifier, au plus près du lieu de travail, l’absence de tension sur chacun des conducteurs actifs (y compris le neutre).',
  },

  /* ═══════════════ PARTIE D ═══════════════ */
  {
    num: 44, label: 'D.1.1', partie: 4, type: 'valeur',
    enonce: 'Choix de la turbine d’aspiration. D’après les documentations techniques du centre d’usinage K2i, **déterminer** le débit d’aspiration préconisé pour cette machine.',
    competence: 'C1', points: 1, dtr: [26], pageSujet: 22,
    champs: [
      { id: 'qh', label: 'Débit du centre d’usinage', unite: 'm³/h', attendu: 10000, tolerance: 0 },
      { id: 'qmin', label: 'soit', unite: 'm³/min', attendu: 166.7, tolerance: 1 },
    ],
    explication: 'Débit du centre d’usinage : 10 000 m³/h soit 166 m³/min.',
  },
  {
    num: 45, label: 'D.1.2', partie: 4, type: 'valeur',
    enonce: 'D’après les documentations de la corroyeuse, **déterminer** le débit d’aspiration nécessaire.',
    competence: 'C1', points: 1, dtr: [27], pageSujet: 22,
    champs: [
      { id: 'qh', label: 'Débit de la corroyeuse', unite: 'm³/h', attendu: 9000, tolerance: 0 },
      { id: 'qmin', label: 'soit', unite: 'm³/min', attendu: 150, tolerance: 1 },
    ],
    explication: 'Débit de la corroyeuse : 9 000 m³/h soit 150 m³/min.',
  },
  {
    num: 46, label: 'D.1.3', partie: 4, type: 'calcul',
    enonce: 'Considérant les pertes de charges nulles, **calculer** le débit de l’installation en m³/min.',
    competence: 'C3', points: 1, dtr: [26, 27], pageSujet: 22,
    grandeur: 'Débit total', unite: 'm³/min',
    formule: 'Q = Q centre d’usinage + Q corroyeuse',
    formuleMotsCles: ['+'],
    attendu: 316, tolerance: 1.5,
    explication: 'Total : 150 + 166 = 316 m³/min.',
  },
  {
    num: 47, label: 'D.1.4', partie: 4, type: 'tableau',
    enonce: 'Sachant que 1 kgf/m² = 9,8 Pa et que le fabricant des machines préconise une dépression d’utilisation supérieure à 3800 Pa, **choisir** la turbine d’aspiration d’après la documentation fournisseur. **Justifier** votre réponse.',
    competence: 'C3', points: 2, dtr: [28], pageSujet: 22,
    colonnes: ['Dépression minimale (kgf/m²)', 'Turbine choisie', 'Justification'],
    lignes: [{ cellules: [
      num('d14-pt', 387.8, 1.5),
      txt('d14-ref', ['GBV 010040', 'GBV010040', '010040']),
      libre('d14-just'),
    ] }],
    indice: 'Convertir 3 800 Pa en kgf/m², puis chercher dans le tableau GBV (DTR 27) la turbine qui donne au moins cette pression à un débit supérieur à 316 m³/min.',
    // Corrigé officiel : « 4000 Pa = 387,75 kgf/m² » (coquille : c'est 3 800 Pa).
    explication: '3 800 Pa / 9,8 = 387,75 kgf/m² : turbine GBV 010040 (37 kW), 394 kgf/m² pour un débit de 355 m³/min.',
  },
  {
    num: 48, label: 'D.2.1', partie: 4, type: 'tableau',
    enonce: 'Option du variateur ATV340. Sachant que la turbine occasionne une forte surcharge au démarrage, vous devez **choisir** et **justifier** la référence du variateur de vitesse.',
    competence: 'C3', points: 1, dtr: [29, 28], pageSujet: 23,
    colonnes: ['Puissance du moteur (kW)', 'Type de service', 'Référence du variateur'],
    lignes: [{ cellules: [
      num('d21-p', 37, 0),
      choix('d21-service', ['ND (Normal duty, faible surcharge)', 'HD (Heavy duty, forte surcharge)'], 'HD (Heavy duty, forte surcharge)'),
      txt('d21-ref', ['ATV340D37N4E']),
    ] }],
    indice: 'Moteur de la turbine GBV 010040 : 37 kW (DTR 27) ; forte surcharge = « Heavy duty » (DTR 28).',
    explication: 'Puissance moteur 37 kW ; HD (heavy duty) acceptant les fortes surcharges : ATV340D37N4E.',
  },
  {
    num: 49, label: 'D.2.2', partie: 4, type: 'redige',
    enonce: '**Proposer** et **justifier** le couplage permettant le raccordement des enroulements du moteur.',
    competence: 'C3', points: 1, dtr: [28], pageSujet: 23,
    motsCles: ['triangle', '400', '690'], minMotsCles: 2, lignes: 3,
    corrige: 'Alimentation 400 V ; moteur 400/690 V : couplage triangle.',
    indice: 'Comparer la tension du réseau à la plus petite tension de la plaque du moteur (DTR 27).',
    explication: 'Réseau 400 V, moteur 400/690 V : chaque enroulement supporte 400 V, couplage triangle.',
  },
  {
    num: 50, label: 'D.3.1', partie: 4, type: 'schema',
    enonce: '**Compléter** le schéma de câblage ci-dessous en intégrant deux commutateurs : un commutateur S1 pour la marche avant et un commutateur S2 à deux positions pour sélectionner la petite vitesse (PV) ou la grande vitesse (GV). La position 1 de S2 correspondra à la petite vitesse (PV) et la position 2 de S2 correspondra à la grande vitesse (GV). Vous devrez utiliser deux vitesses présélectionnées (marche avant sur DI1, vitesse présélectionnée 2 (PV) sur DI3 et vitesse présélectionnée 4 (GV) sur DI4). Les valeurs présélectionnées sont modifiables directement sur le variateur.',
    contexte: 'Gestion des vitesses de rotation de la turbine d’aspiration. Afin de réduire la consommation, le client demande de gérer deux vitesses d’aspiration. La petite vitesse PV servira lorsqu’une seule machine sera en fonctionnement et la grande vitesse GV servira lorsque les deux machines seront en fonctionnement.',
    competence: 'C11', points: 4, dtr: [30, 31], pageSujet: 23,
    image: { src: `${IMG}/q-d31-sujet.jpg`, alt: 'Bornier de commande ATV340 et commutateurs S1, S2 à raccorder' },
    traits: D31_TRAITS,
    platineTpId: 'scierie-d31-atv340',
    corrigeImage: { src: `${IMG}/q-d31-corrige.jpg`, alt: 'Schéma de commande de l’ATV340 — corrigé' },
    indice: 'Les entrées logiques DI sont actives lorsqu’elles reçoivent le +24 V : la sortie 24V du bornier alimente les communs de S1 et de S2.',
    explication: 'Corrigé p. 23 : 24V du variateur → commun de S1 et commun de S2 ; S1 → DI1 (marche avant) ; S2 position 1 → DI3 (PV) ; S2 position 2 → DI4 (GV).',
  },
  {
    num: 51, label: 'D.3.2', partie: 4, type: 'valeur',
    enonce: 'Le bureau d’étude aéraulique vous informe qu’en PV le moteur doit tourner à 1000 tr/min et en GV le moteur doit tourner à 1500 tr/min. Le moteur a 4 pôles.\n**Calculer** les deux fréquences à paramétrer dans le variateur.',
    competence: 'C6', points: 1, dtr: [31], pageSujet: 24,
    champs: [
      { id: 'fpv', label: 'f PV =', unite: 'Hz', attendu: 33.3, tolerance: 0.5 },
      { id: 'fgv', label: 'f GV =', unite: 'Hz', attendu: 50, tolerance: 0.5 },
    ],
    indice: 'n = f / p (n en tr/s, p nombre de paires de pôles) : un moteur 4 pôles a p = 2.',
    explication: 'f = n × p : f PV = (1000 / 60) × 2 = 33 Hz ; f GV = (1500 / 60) × 2 = 50 Hz.',
  },
  {
    num: 52, label: 'D.3.3', partie: 4, type: 'tableau',
    enonce: '**Déterminer** les paramètres « vitesse présélectionnée 2 » et « vitesse présélectionnée 4 ». **Justifier** votre réponse.',
    competence: 'C6', points: 1, dtr: [31, 32], pageSujet: 24,
    colonnes: ['Paramètre', 'Valeur (Hz)', 'Justification'],
    lignes: [
      { cellules: ['Vitesse présélectionnée 2', num('d33-sp2', 33.3, 0.5), libre('d33-sp2-j')] },
      { cellules: ['Vitesse présélectionnée 4', num('d33-sp4', 50, 0.5), libre('d33-sp4-j')] },
    ],
    indice: 'Menu [Vitesses présélect.] du DTR 28 ; fréquences calculées en D.3.2.',
    // Remarque : d'après le tableau d'association du DTR 28, DI4 seule sélectionne SP3 ; le
    // corrigé règle « vitesse présélectionnée 4 » : suivi ici.
    explication: 'Menu [Vitesses présélect.] : vitesse présél. 2 = 33 Hz (PV) ; vitesse présél. 4 = 50 Hz (GV).',
  },
  {
    num: 53, label: 'D.4.1', partie: 4, type: 'calcul',
    enonce: '**Estimer** la consommation annuelle sans le variateur.',
    contexte: 'Bilan économique suite à l’installation du variateur. Le temps de service des machines est de 30 heures par semaine (5 jours ouvrés par semaine). Le centre d’usinage est utilisé pendant 80 % du temps de service. La corroyeuse fonctionne 20 % du temps de service mais toujours en même temps que le centre d’usinage. De plus l’entreprise travaille 225 jours par an en moyenne.\nOn admet que la consommation d’énergie d’un moteur électrique est directement proportionnelle à sa vitesse de rotation.',
    competence: 'C3', points: 2, dtr: [28], pageSujet: 24,
    grandeur: 'E', unite: 'kWh/an',
    formule: 'E = P × t (37 kW × 24 h par semaine × 45 semaines)',
    formuleMotsCles: ['37', '45'],
    attendu: 39960, tolerance: 50,
    indice: 'Sans variateur, la turbine tourne à pleine puissance (37 kW) dès qu’une machine fonctionne : 80 % de 30 h par semaine ; 225 jours = 45 semaines.',
    explication: '80 % de 30 h = 24 h ; E = 37 kW × 24 h = 888 kWh par semaine ; 225 jours soit 45 semaines : 888 × 45 = 39 960 kWh/an.',
  },
  {
    num: 54, label: 'D.4.2', partie: 4, type: 'calcul',
    enonce: '**Estimer** la consommation annuelle avec le variateur.',
    competence: 'C3', points: 2, dtr: [28], pageSujet: 24,
    grandeur: 'E', unite: 'kWh/an',
    formule: 'E = (18 h × P PV + 6 h × P GV) × 45 semaines',
    formuleMotsCles: ['18', '6'],
    attendu: 29770, tolerance: 200,
    indice: 'PV seule : 60 % de 30 h ; GV (les deux machines) : 20 % de 30 h. Puissance en PV : 37 × 33 / 50.',
    explication: 'PV : 18 h à 37 × 33 / 50 = 24,42 kW ; GV : 6 h à 37 kW ; E = 18 × 24,42 + 6 × 37 = 661,56 kWh par semaine ; 661,56 × 45 = 29 770 kWh/an.',
  },
  {
    num: 55, label: 'D.4.3', partie: 4, type: 'calcul',
    enonce: '**Estimer** le gain énergétique annuel.',
    competence: 'C3', points: 1, dtr: [], pageSujet: 25,
    grandeur: 'Gain', unite: 'kWh/an',
    formule: 'Gain = E sans variateur − E avec variateur',
    formuleMotsCles: ['-'],
    attendu: 10190, tolerance: 200,
    explication: '39 960 − 29 770 = 10 190 kWh/an.',
  },
  {
    num: 56, label: 'D.4.4', partie: 4, type: 'calcul',
    enonce: '**Calculer** la durée d’amortissement pour cette option.',
    contexte: 'Le prix du kWh est de 0,25 euro actualisé et le coût de l’installation du variateur est de 7 642,5 euros.',
    competence: 'C3', points: 1, dtr: [], pageSujet: 25,
    grandeur: 'Durée', unite: 'ans',
    formule: 'Durée = coût du variateur / gain annuel en euros',
    formuleMotsCles: ['/'],
    attendu: 3, tolerance: 0.1,
    explication: 'Gain annuel : 10 190 × 0,25 = 2 547,5 €/an ; amortissement : 7 642,5 / 2 547,5 = 3 ans.',
  },
  {
    num: 57, label: 'D.4.5', partie: 4, type: 'redige',
    enonce: '**Déterminer** si l’option est en accord avec les critères économiques de la scierie.',
    competence: 'C3', points: 1, dtr: [], pageSujet: 25,
    motsCles: ['oui', '4 ans', '3 ans', 'inferieur', 'moins de'], minMotsCles: 2, lignes: 3,
    corrige: 'Oui, car la scierie souhaite amortir l’aspiration en 4 ans au maximum et l’option est amortie en 3 ans.',
    explication: 'Oui : amortissement en 3 ans, inférieur aux 4 ans souhaités par la scierie.',
  },

  /* ═══════════════ PARTIE E ═══════════════ */
  {
    num: 58, label: 'E.1.1', partie: 5, type: 'tableau',
    enonce: 'Évaluation du gisement solaire. En vous appuyant sur les différents documents d’évaluation des performances solaires, **donner** l’orientation et l’angle optimaux pour un générateur photovoltaïque.',
    competence: 'C1', points: 1, dtr: [34], pageSujet: 26,
    colonnes: ['Orientation optimale', 'Inclinaison optimale (°)'],
    lignes: [{ cellules: [txt('e11-orient', ['Sud', 'S', 'plein sud', 'sud (0°)', 'orientation sud']), num('e11-incl', 30, 0, ['30°'])] }],
    indice: 'Tableau de synthèse des rendements du DTR 30 : chercher 100 %.',
    explication: 'Orientation optimale : Sud ; inclinaison optimale : 30°.',
  },
  {
    num: 59, label: 'E.1.2', partie: 5, type: 'tableau',
    enonce: 'Validation préliminaire. **Préciser** si l’extension du bâtiment présente des caractéristiques valides.',
    competence: 'C3', points: 1, dtr: [33, 34], pageSujet: 26,
    colonnes: ['Grandeur', 'Valeur', 'Validation (cocher la bonne réponse)'],
    lignes: [
      { cellules: ['Orientation', txt('e12-orient', ['Sud', 'S', 'plein sud']), choix('e12-orient-v', ['Optimale', 'Non optimale'], 'Optimale')] },
      { cellules: ['Inclinaison (°)', num('e12-incl', 15, 0, ['15°']), choix('e12-incl-v', ['Optimale', 'Non optimale'], 'Non optimale')] },
    ],
    indice: 'Plans de l’extension (DTR 29) : pan de toiture orienté au sud, angle α.',
    explication: 'Orientation Sud : optimale ; inclinaison 15° : non optimale (30° optimal).',
  },
  {
    num: 60, label: 'E.1.3', partie: 5, type: 'placement',
    enonce: 'Première approximation du rendement. Sur le disque solaire ci-dessous, **matérialiser** par une croix les caractéristiques d’orientation et d’inclinaison du générateur photovoltaïque que l’entreprise envisage de placer sur le toit de l’extension. Dans le tableau ci-dessous, **préciser** le rendement théorique que permet d’évaluer le disque solaire et **conclure** sur la viabilité du projet.',
    competence: 'C3', points: 4, dtr: [34], pageSujet: 27,
    // Disque recadré (750 × 588 px) : zénith (0°) au croisement W–E / N–S (284,75 ; 308,75),
    // 10° d'inclinaison = 26,3 px le long d'un méridien. Sud, 15° : 39,5 px sous le centre.
    // Tolérance : ½ anneau (5°) ; croix absente du corrigé (Sud / 15° validé).
    plan: { src: `${IMG}/q-e13-disque.jpg`, alt: 'Disque solaire : rayonnement solaire annuel en % selon l’orientation (N, E, S, W) et l’inclinaison (10° à 90°)', w: 750, h: 588 },
    symbole: 'croix',
    zone: { x0: 0.064, y0: 0.122, x1: 0.696, y1: 0.929 },
    attendus: [{ x: 0.3797, y: 0.5922, label: 'Sud, 15°' }],
    tolerance: { x: 0.0176, y: 0.0224 },
    max: 1,
    champs: [
      { id: 'rendement', label: 'Rendement théorique approximatif', unite: '%', attendu: 97.5, tolerance: 2.5, acceptes: ['95-100 %', '95 - 100 %', '95 à 100 %', '95-100'] },
      { id: 'viabilite', label: 'Viabilité du projet (oui/non)', acceptes: ['oui'] },
    ],
    indice: 'Le centre du disque correspond à une inclinaison nulle ; l’inclinaison augmente de 10° par anneau en s’éloignant du centre, dans la direction de l’orientation (Sud vers le bas).',
    explication: 'Croix au Sud, inclinaison 15° (entre les anneaux 10° et 20°, sur le méridien Sud) ; rendement théorique approximatif 95 à 100 % : projet viable (oui).',
  },
  {
    num: 61, label: 'E.2.1', partie: 5, type: 'tableau',
    enonce: 'Surface disponible. Sur la base du plan d’extension, **donner** la surface disponible sur le pan sud de la toiture.',
    contexte: 'Évaluation de la production théorique annuelle de l’installation photovoltaïque. Vous avez déterminé les caractéristiques principales de l’installation photovoltaïque. Avec les résultats déjà obtenus et les données qui suivront, on vous demande de proposer une première évaluation du potentiel énergétique théorique du projet.\n* Pour la largeur du pan sud, appliquer la formule suivante et arrondir à l’unité : Ls = √(2,3² + (L/2)²).',
    competence: 'C3', points: 1, dtr: [33], pageSujet: 27,
    colonnes: ['Caractéristiques', 'Valeurs'],
    lignes: [
      { cellules: ['Longueur du toit de l’extension (m)', num('e21-long', 35, 0)] },
      { cellules: ['Largeur du toit de l’extension « L » (m)', num('e21-larg', 15.2, 0.05)] },
      { cellules: ['Largeur du pan sud* « Ls » (m)', num('e21-ls', 8, 0)] },
      { cellules: ['Surface du pan sud de l’extension (m²)', num('e21-s', 280, 1)] },
    ],
    indice: 'Plan de masse de l’extension (DTR 29, cotes en cm).',
    explication: 'Longueur 35 m ; largeur L = 15,2 m ; Ls = √(2,3² + 7,6²) = 7,94 soit 8 m ; surface 35 × 8 = 280 m².',
  },
  {
    num: 62, label: 'E.2.2.1', partie: 5, type: 'tableau',
    enonce: 'Détermination du nombre maximum de panneaux implantables. Caractéristiques dimensionnelles des panneaux : **compléter** le tableau.',
    contexte: 'À partir de la surface calculée, déterminer le nombre maximum de panneaux qui peuvent être implantés sur la surface dédiée. On impose, pour des raisons esthétiques et techniques, que les panneaux soient disposés en trois lignes identiques de panneaux posés en « portrait ». On précise aussi qu’entre chaque panneau, il y a un espacement de deux centimètres pour les fixations.',
    competence: 'C3', points: 2, dtr: [39], pageSujet: 28,
    colonnes: ['Caractéristique', 'Valeur'],
    lignes: [
      { cellules: ['Longueur (mm)', num('e221-long', 2094, 0)] },
      { cellules: ['Largeur (mm)', num('e221-larg', 1134, 0)] },
      { cellules: ['Épaisseur (mm)', num('e221-ep', 35, 0)] },
      { cellules: ['Nombre de demi-cellules par panneau', num('e221-cell', 132, 0)] },
      { cellules: ['Dimensions des cellules (en m)', txt('e221-dim', ['0,182 x 0,091', '0,091 x 0,182', '0,182 × 0,091', '182 x 91 mm', '0,182 m x 0,091 m'])] },
      { cellules: ['Surface d’une cellule (Scellule) en m² (arrondir à 4 chiffres après la virgule)', num('e221-sc', 0.0166, 0.0001, ['0,0165'])] },
      { cellules: ['Surface efficace (S) pour un panneau en m² : S = Scellule × 132 (arrondir à 3 chiffres après la virgule)', num('e221-s', 2.186, 0.01)] },
    ],
    indice: 'Caractéristiques mécaniques du module BBO 510 (DTR 33, page 2).',
    // Corrigé officiel : Scellule = 0,0165 m² (0,182 × 0,091 = 0,01656, soit 0,0166) : les deux sont acceptés.
    explication: '2 094 × 1 134 × 35 mm ; 132 demi-cellules de 0,182 × 0,091 m ; Scellule = 0,0166 m² ; S = Scellule × 132 = 2,186 m².',
  },
  {
    num: 63, label: 'E.2.2.2', partie: 5, type: 'tableau',
    enonce: 'Détermination du nombre de panneaux par ligne. Le maître d’ouvrage souhaite que les panneaux soient disposés en trois lignes avec les panneaux en position portrait. **Déterminer** le nombre maximal de panneaux que l’on peut implanter par ligne et **donner** le nombre de panneaux de l’installation.',
    contexte: 'Appliquer la formule suivante en convertissant toutes les valeurs en mètre et compléter le tableau ci-dessous : N = longueur toit / (largeur PV + écart de fixation).',
    competence: 'C3', points: 1, dtr: [39], pageSujet: 28,
    colonnes: ['Grandeur', 'Valeur'],
    lignes: [
      { cellules: ['Nombre calculé de panneaux par ligne', num('e222-n', 30.32, 0.02)] },
      { cellules: ['Nombre arrondi de panneaux par ligne', num('e222-arrondi', 30, 0)] },
      { cellules: ['Nombre total de panneaux de l’installation', num('e222-total', 90, 0)] },
    ],
    explication: 'N = 35 / (1,134 + 0,02) = 30,32 ; 30 panneaux par ligne ; Ntotal = 30 × 3 = 90 panneaux.',
  },
  {
    num: 64, label: 'E.2.3', partie: 5, type: 'tableau',
    enonce: 'Évaluation du potentiel solaire brut. **Calculer** une valeur approchée de la production que l’on peut attendre du projet au vu de ses caractéristiques. **Compléter** le tableau ci-dessous.',
    contexte: 'Production annuelle = (irradiation globale annuelle) × (surface efficace totale des panneaux) × (rendement théorique orientation/angle) × (rendement PV).\nVous vous appuierez sur le document extrait du logiciel de l’institut national de l’énergie solaire (CalSol). Pour le rendement d’orientation on impose une valeur de 98 % et pour le rendement des panneaux solaires, une valeur de 21,5 %.\n* Attention à bien convertir ces valeurs pour réaliser le calcul.',
    competence: 'C3', points: 2, dtr: [35], pageSujet: 29,
    colonnes: ['Grandeurs', 'Valeurs'],
    lignes: [
      { cellules: ['Irradiation annuelle globale (IGP) en kWh/m²/an', num('e23-igp', 1232, 0)] },
      { cellules: ['Surface totale efficace de PV (m²), arrondie à deux chiffres après la virgule', num('e23-s', 196.74, 0.8)] },
      { cellules: ['Rendement théorique orientation/angle*', num('e23-ro', 0.98, 0, ['98 %'])] },
      { cellules: ['Rendement modules PV*', num('e23-rpv', 0.215, 0, ['21,5 %'])] },
      { cellules: ['Production annuelle théorique attendue (kWh), sans les chiffres après la virgule', num('e23-prod', 51070, 300)] },
    ],
    indice: 'Irradiation globale annuelle sur le plan incliné (IGP, DTR 31) ; surface efficace totale = 90 × S (E.2.2.1).',
    explication: 'IGP = 1 232 kWh/m²/an ; surface 90 × 2,186 = 196,74 m² ; 0,98 ; 0,215 ; production 1 232 × 196,74 × 0,98 × 0,215 = 51 070 kWh.',
  },
  {
    num: 65, label: 'E.2.4', partie: 5, type: 'tableau',
    enonce: 'Évaluation de la rentabilité du projet. Sur la base du tableau de suivi de consommation électrique de la scierie, **compléter** le tableau ci-dessous et **conclure** sur la viabilité du projet.',
    contexte: 'Pour que le projet soit intéressant pour le maître d’ouvrage, la production de l’installation photovoltaïque doit représenter au moins 18 % de la consommation annuelle de la scierie. Vous devez comparer la production solaire par rapport à la consommation et déterminer si le projet respecte ce critère de sélection du maître d’ouvrage.',
    competence: 'C3', points: 1, dtr: [36], pageSujet: 29,
    colonnes: ['Paramètres', 'Valeurs'],
    lignes: [
      { cellules: ['Consommation annuelle de la scierie (kWh)', num('e24-conso', 278814, 0)] },
      { cellules: ['Fraction de 18 % de cette consommation (kWh)', num('e24-18', 50186.52, 1)] },
      { cellules: ['Positionnement de la production par rapport aux 18 % (cocher la case correspondante)', choix('e24-pos', ['Inférieure à 18 %', 'Égale à 18 %', 'Supérieure à 18 %'], 'Supérieure à 18 %')] },
      { cellules: ['Le projet est-il envisageable ? (oui / non)', choix('e24-ok', OUI_NON, 'oui')] },
    ],
    indice: 'Total annuel de la facture (DTR 32), puis comparer avec la production calculée en E.2.3.',
    explication: 'Consommation 278 814 kWh ; 18 % = 50 186,52 kWh ; production (51 070 kWh) supérieure à 18 % : projet envisageable (oui).',
  },
  {
    num: 66, label: 'E.3.1', partie: 5, type: 'tableau',
    enonce: 'Détermination des caractéristiques des panneaux. Dans le tableau ci-dessous **préciser** les caractéristiques électriques du panneau selon les conditions « NOCT » pour le module PV BBO 510.',
    contexte: 'Dimensionnement de l’installation photovoltaïque. Le projet d’implantation de panneaux solaires remplit tous les critères fixés par le maître d’ouvrage. À présent vous allez dimensionner l’installation réelle en fonction des caractéristiques des éléments constitutifs de l’installation.',
    competence: 'C1', points: 1, dtr: [38], pageSujet: 30,
    colonnes: ['Grandeurs électriques', 'Valeurs / unités'],
    lignes: [
      { cellules: ['Puissance nominale (W)', num('e31-p', 386, 0)] },
      { cellules: ['Courant de court-circuit (A)', num('e31-icc', 11.27, 0)] },
      { cellules: ['Courant au point de puissance max (A)', num('e31-impp', 10.78, 0)] },
      { cellules: ['Tension en circuit ouvert (V)', num('e31-uco', 43.6, 0)] },
      { cellules: ['Tension au point de puissance max (V)', num('e31-umpp', 35.8, 0)] },
    ],
    explication: 'NOCT, BBO 510 : 386 W ; Icc = 11,27 A ; Impp = 10,78 A ; Uco = 43,6 V ; Umpp = 35,8 V.',
  },
  {
    num: 67, label: 'E.3.2', partie: 5, type: 'tableau',
    enonce: 'Facteur (β) et limitation de la production en fonction de la température. En condition NOCT, **calculer** la valeur de la tension de sortie MPPT si la température du panneau est de 75 °C, en utilisant et complétant le tableau ci-dessous. En supposant que le courant I MPPT soit stable, quelle sera la nouvelle puissance en sortie du panneau ?',
    contexte: 'Dans le document constructeur figure un coefficient noté β : il correspond à la dégradation de la tension en fonction de la température du panneau.\nFormule : −Δv = β × U MPPT « NOCT » × (T2 − T1). Arrondir à deux chiffres après la virgule.',
    competence: 'C3', points: 2, dtr: [39, 38], pageSujet: 30,
    colonnes: ['Grandeur', 'Valeur'],
    lignes: [
      { cellules: ['Tension MPPT NOCT à 43 °C (V)', num('e32-u43', 35.8, 0)] },
      { cellules: ['Calcul de −Δv', libre('e32-calc', '−Δv = …')] },
      { cellules: ['Δv (V)', num('e32-dv', 2.98, 0.02, ['-2,98', '-2,98 V'])] },
      { cellules: ['U MPPT « 75 °C » = U MPPT « NOCT » − Δv (V)', num('e32-u75', 32.82, 0.02)] },
      { cellules: ['P « 75 °C » (W)', num('e32-p75', 353.8, 0.5)] },
    ],
    indice: 'β = −0,26 %/°C (caractéristiques thermiques, DTR 33) ; T1 = 43 °C (NOCT), T2 = 75 °C.',
    explication: '−Δv = −0,0026 × 35,8 × (75 − 43) = −2,98 V ; U MPPT 75 °C = 35,8 − 2,98 = 32,82 V ; P 75 °C = 32,82 × 10,78 = 353,8 W.',
  },
  {
    num: 68, label: 'E.3.3.1', partie: 5, type: 'valeur',
    enonce: 'Rendement de la chaîne de production solaire et quantification matérielle. Pour cette gamme d’onduleur, **donner** le rendement maximum.',
    contexte: 'Pour notre installation on choisira un onduleur de la marque Fronius. Il sera sélectionné dans la gamme des modèles SYMO 10 à SYMO 15.',
    competence: 'C1', points: 1, dtr: [41], pageSujet: 31,
    champs: [{ id: 'eta', label: 'ηMax :', unite: '%', attendu: 98, tolerance: 0.1, acceptes: ['0,98'] }],
    explication: 'ηMax = 98 %.',
  },
  {
    num: 69, label: 'E.3.3.2', partie: 5, type: 'calcul',
    enonce: 'L’association « onduleur + panneau » influe sur le rendement global de la chaîne d’énergie. Selon le document constructeur, la puissance du panneau BBO 510 en conditions NOCT est de 386 Wc.\n**Calculer** la nouvelle puissance finale « du point de vue du réseau » quand ce panneau sera associé à l’onduleur d’injection.',
    competence: 'C3', points: 1, dtr: [41], pageSujet: 31,
    grandeur: 'P finale', unite: 'W',
    formule: 'P finale = P NOCT × ηMax',
    formuleMotsCles: ['386'],
    attendu: 378.28, tolerance: 0.5,
    explication: 'P finale = 386 × 0,98 = 378,28 W.',
  },
  {
    num: 70, label: 'E.3.4.1.1', partie: 5, type: 'tableau',
    enonce: 'Dimensionnement des onduleurs. **Calculer** la puissance injectée sur le réseau par un string composé de 30 panneaux BBO 510 et **calculer** les tensions minimum et maximum aux bornes de ce dernier côté DC, sachant qu’ils seront connectés en série.',
    contexte: 'Structure finale du système de production solaire. L’installation sera composée de 90 panneaux BISOL BBO 510 répartis en trois lignes de 30 modules raccordés à 3 onduleurs indépendants connectés au réseau triphasé.',
    competence: 'C3', points: 2, dtr: [38], pageSujet: 31,
    colonnes: ['Grandeur à calculer', 'Calculs', 'Résultats'],
    lignes: [
      { cellules: ['Puissance injectée (kW)', libre('e3411-p-calc', 'Calcul…'), num('e3411-p', 11.348, 0.03, ['11 348 W', '11348 W'])] },
      { cellules: ['Tension MPPT « NOCT » côté DC (V)', libre('e3411-u-calc', 'Calcul…'), num('e3411-u', 1074, 1)] },
      { cellules: ['Tension minimum « NOCT » à 75 °C côté DC (V)', libre('e3411-umin-calc', 'Calcul…'), num('e3411-umin', 984.6, 1)] },
    ],
    explication: 'Puissance injectée : 30 × 0,37828 = 11,348 kW ; tension MPPT NOCT : 30 × 35,8 = 1 074 V ; tension minimum à 75 °C : 30 × 32,82 = 984,6 V.',
  },
  {
    num: 71, label: 'E.3.4.1.2', partie: 5, type: 'tableau',
    enonce: 'Choix des onduleurs. Avec les informations du tableau précédent, **sélectionner** le type d’onduleur adapté. **Compléter** le tableau ci-dessous pour préciser les caractéristiques principales.',
    competence: 'C3', points: 2, dtr: [40], pageSujet: 32,
    colonnes: ['Caractéristiques', 'Valeurs'],
    lignes: [
      { cellules: ['Référence', txt('e3412-ref', ['SYMO 12.5-3-M', 'Fronius SYMO 12.5-3-M', 'SYMO 12,5-3-M', 'SYMO 12.5-3 M'])] },
      { cellules: ['Puissance d’entrée max (kWc)', num('e3412-pe', 18.8, 0, ['18 800 Wc', '18 800 W'])] },
      { cellules: ['Puissance de sortie max (kW)', num('e3412-ps', 12.5, 0, ['12 500 W', '12 500 VA'])] },
      { cellules: ['Plage de tension MPP', txt('e3412-mpp', plage(320, 800))] },
      { cellules: ['Courant d’entrée max (A)', num('e3412-i', 43.5, 0)] },
      { cellules: ['Tension d’entrée minimale (V)', num('e3412-umin', 200, 0)] },
      { cellules: ['Tension d’entrée maximale (V)', num('e3412-umax', 1000, 0)] },
      { cellules: ['Nombre de trackers MPPT', num('e3412-mppt', 2, 0)] },
    ],
    indice: 'Caractéristiques techniques Fronius SYMO (DTR 34) : puissance de sortie juste supérieure à la puissance injectée par un string.',
    explication: 'SYMO 12.5-3-M : 18,8 kWc en entrée ; 12,5 kW en sortie ; plage MPP 320 – 800 V ; courant d’entrée max 43,5 A ; tension d’entrée 200 V minimum, 1 000 V maximum ; 2 trackers MPPT.',
  },
  {
    num: 72, label: 'E.3.4.2', partie: 5, type: 'tableau',
    enonce: 'Détermination de la structure d’entrée « DC » de l’onduleur. Pour valider ce choix, vous allez **déterminer** les nouvelles caractéristiques tension / courant de cette configuration en complétant le tableau ci-dessous.',
    contexte: 'Compte tenu de la structure de l’installation solaire et des caractéristiques d’entrée de l’onduleur choisi, il va falloir proposer un mode de connexion des panneaux adapté. On opte pour la mise en place de deux strings de 15 panneaux chacun connectés en parallèle en entrée d’onduleur.',
    competence: 'C3', points: 2, dtr: [40, 38], pageSujet: 32,
    colonnes: ['Grandeurs électriques', 'Calculs', 'Résultats'],
    lignes: [
      { cellules: ['Type de câblage des panneaux pour 1 string (parallèle ou série)', '', choix('e342-type', ['Série', 'Parallèle'], 'Série')] },
      { cellules: ['Tension aux bornes du string (conditions NOCT) (V)', libre('e342-u-calc', 'Calcul…'), num('e342-u', 537, 1)] },
      { cellules: ['Plage de tension de fonctionnement en mode MPPT', '', txt('e342-mpp', plage(320, 800))] },
      { cellules: ['Courant maximum de l’onduleur (A)', '', num('e342-imax', 43.5, 0)] },
      { cellules: ['Courant total des strings (A)', libre('e342-i-calc', 'Calcul…'), num('e342-i', 21.56, 0.05)] },
      { cellules: ['Compatibilité avec les entrées DC de l’onduleur (oui/non)', '', choix('e342-ok', OUI_NON, 'oui')] },
    ],
    explication: 'Câblage série ; tension du string : 15 × 35,8 = 537 V ; plage MPPT 320 V – 800 V ; courant maximum 43,5 A ; courant total : 2 × 10,78 = 21,56 A ; compatible : oui.',
  },
  {
    num: 73, label: 'E.3.4.3', partie: 5, type: 'schema',
    enonce: 'Schéma de câblage côté DC. À partir de la documentation ressource, **compléter** le schéma ci-dessous. Les deux demi-strings de 15 panneaux sont représentés par des demi-strings de trois panneaux pour des raisons pratiques.',
    competence: 'C11', points: 4, dtr: [42], pageSujet: 33,
    image: { src: `${IMG}/q-e343-sujet.jpg`, alt: 'Demi-strings photovoltaïques et bornier DC de l’onduleur à raccorder' },
    traits: E343_TRAITS,
    platineTpId: 'scierie-e343-dc',
    corrigeImage: { src: `${IMG}/q-e343-corrige.jpg`, alt: 'Schéma de câblage côté DC — corrigé proposé' },
    indice: 'DTR 35, onduleur Multi MPP Tracker : une chaîne par entrée DC+ (DC+1, DC+2) ; les bornes DC− sont reliées en interne. Dans une chaîne, le − d’un panneau va au + du suivant.',
    explication: 'Corrigé proposé (page du corrigé vierge) d’après le DTR 35 : chaque demi-string en série (− d’un panneau vers + du suivant) ; demi-string 1 : + → DC+1, − → DC− ; demi-string 2 : + → DC+2, − → DC− (bornes DC− indifférentes). MPP Tracker 2 sur ON (E.4.1).',
  },
  {
    num: 74, label: 'E.4.1', partie: 5, type: 'cocher',
    enonce: 'Paramétrage de l’onduleur. Paramétrage de la fonction « tracker ». Compte tenu du choix de câblage de l’entrée DC, **sélectionner (par une croix)** la configuration de la fonction « Tracker 2 » qui convient.',
    contexte: 'Fonction MPPT TRACKER 2.',
    competence: 'C6', points: 1, dtr: [42], pageSujet: 34,
    options: ['ON', 'OFF'], bonnes: [0],
    indice: 'DTR 35 : raccordement de deux champs de modules sur les deux entrées MPP Tracker (DC+1 / DC+2).',
    explication: 'ON : les deux demi-strings sont raccordés sur deux entrées indépendantes (DC+1 et DC+2), fonctionnement Multi MPP Tracker.',
  },
  {
    num: 75, label: 'E.4.2.1.1', partie: 5, type: 'bulles',
    enonce: 'Paramétrage de la supervision de la production. Onglets de paramétrage. Ci-dessous sont représentés les deux onglets qui permettent de paramétrer chacun des onduleurs à superviser. L’onduleur concerné par l’opération est le n° 2 dans la chaîne. Pour faciliter l’exploitation de la supervision, chaque onduleur sera désigné par le nom de l’entreprise suivi de son ordre dans la chaîne. **Compléter** les onglets ci-dessous.',
    contexte: 'Afin de suivre et d’évaluer la production solaire tout au long de l’année et d’assurer la maintenance préventive de son installation photovoltaïque, la scierie SYLVA est équipée d’une supervision par ordinateur. L’équipement de supervision est constitué de trois cartes datamanager insérées dans chaque onduleur, d’une box Fronius-Sensor pour le relevé des paramètres externes et d’un PC relié au réseau local et équipé du logiciel Solar.web. (La date et l’heure ne sont pas notées.)',
    competence: 'C6', points: 2, dtr: [44, 43, 36, 37], pageSujet: 35,
    image: { src: `${IMG}/q-e42-supervision.jpg`, alt: 'Configuration de la supervision : onduleurs 1 à 3, PC (LAN / WLAN) et Fronius sensor box' },
    plan: { src: `${IMG}/q-e4211-onglets.jpg`, alt: 'Onglet 1 « Généralités » et onglet 2 « Onduleur » de la surveillance d’installation, champs à compléter' },
    bulles: [
      { id: 'nom', x: 46.36, y: 17.6, attendu: 'SYLVA-2', acceptes: ['SYLVA 2', 'SYLVA2', 'SYLVA - 2', 'SYLVA-02', 'SYLVA n°2', 'SYLVA_2'] },
      { id: 'taux', x: 42.64, y: 22.79, attendu: '0,0803', acceptes: ['0,0803 €', '0,0803 €/kWh', '0,0803 E/kWh', '0,08030'] },
      { id: 'achat', x: 42.64, y: 26.11, attendu: '0,135', acceptes: ['0,135 €', '0,135 €/kWh', '0,135 E/kWh', '0,1350'] },
      { id: 'continent', x: 38.57, y: 39.42, attendu: 'Europe' },
      { id: 'ville', x: 55.43, y: 39.42, attendu: 'Paris' },
      { id: 'type', x: 41.86, y: 75.0, attendu: 'SYM 12.5-3-M', acceptes: ['SYMO 12.5-3-M', 'SYM 12,5-3-M', 'SYMO 12,5-3-M', 'Fronius SYMO 12.5-3-M'] },
      { id: 'appareil', x: 64.36, y: 75.0, attendu: 'SYM 12.5-3-M (2)', acceptes: ['SYMO 12.5-3-M (2)', 'SYM 12,5-3-M (2)', 'SYMO 12,5-3-M (2)', 'SYM 12.5-3-M 2', 'SYMO 12.5-3-M 2'] },
      // Corrigé officiel : PV[Wp] = 51070 (valeur de la production annuelle, E.2.3) ; la puissance
      // crête des chaînes de l'onduleur (30 × 510 = 15 300 Wc) est aussi acceptée.
      { id: 'pv', x: 83.57, y: 75.0, attendu: '51070', acceptes: ['51 070', '15300', '15 300'] },
    ],
    indice: 'Onglet 1 : taux de rémunération de la vente du surplus (installation de 9 à 36 kWc) et coût d’achat du kWh (client vert A5, type « moyen ») au DTR 32 ; fuseau horaire continent / ville. Onglet 2 : onduleur choisi en E.3.4.1.2 (DTR 36).',
    explication: 'Onglet 1 : nom de l’installation SYLVA-2 ; taux de rémunération 0,0803 €/kWh ; coût d’achat 0,135 €/kWh ; fuseau horaire Europe / Paris. Onglet 2 : type d’appareil SYM 12.5-3-M ; nom de l’appareil SYM 12.5-3-M (2) ; PV[Wp] 51070 (corrigé).',
  },

  /* ═══════════════ PARTIE F ═══════════════ */
  {
    num: 76, label: 'F.1', partie: 6, type: 'redige',
    enonce: '**Indiquer** ci-dessous des propositions visant à améliorer encore l’efficacité énergétique du nouveau bâtiment et de ses équipements.',
    competence: 'C3', points: 2, dtr: [], pageSujet: 36,
    motsCles: ['détection de présence', 'variation', 'LED', 'récupération de chaleur', 'variateur', 'autoconsommation', 'isolation', 'supervision', 'compensation'],
    minMotsCles: 3, lignes: 8,
    corrige: 'Exemples : détection de présence et variation de l’éclairage selon la lumière naturelle ; éclairage LED ; récupération de chaleur (air de l’aspiration, compresseur) ; variateurs de vitesse sur les autres moteurs ; autoconsommation de la production photovoltaïque ; isolation du bâtiment ; supervision et suivi des consommations ; compensation de l’énergie réactive.',
    indice: 'Reprendre chaque partie du sujet (éclairage, aspiration, photovoltaïque, alimentation) et chercher ce qui peut encore être optimisé.',
    explication: 'Réponse ouverte, notée par le professeur (le corrigé ne propose pas de réponse) : détection de présence, variation, LED, récupération de chaleur, variateurs, autoconsommation, isolation, supervision, compensation…',
  },
];

/* ───────────────────────────── Sujet ───────────────────────────── */

/**
 * Sujets thématiques : une partie = un sujet jouable seul (la partie F, une seule question
 * rédigée, n'est proposée que dans le sujet complet).
 */
const DECLINAISONS: DeclinaisonSujet[] = [
  { id: 'scierie-alimentation', theme: 'distribution', titre: 'Alimentation HTA/BT & compensation', sousTitre: 'Alimentation électrique du nouveau centre d’usinage', parties: [1], dureeMin: 55 },
  { id: 'scierie-eclairage', theme: 'eclairage', titre: 'Éclairage LED & gestion KNX', sousTitre: 'Éclairage du nouveau bâtiment et gestion par bus KNX', parties: [2], dureeMin: 85 },
  { id: 'scierie-habilitations', theme: 'securite', titre: 'Habilitations & consignation', sousTitre: 'Travaux sur l’éclairage de l’atelier existant', parties: [3], dureeMin: 30 },
  { id: 'scierie-aspiration', theme: 'moteur', titre: 'Aspiration & variateur ATV340', sousTitre: 'Dimensionnement du système d’aspiration et commande à deux vitesses', parties: [4], dureeMin: 60 },
  { id: 'scierie-pv', theme: 'pv', titre: 'Photovoltaïque', sousTitre: 'Installation photovoltaïque sur la toiture de l’extension', parties: [5], dureeMin: 70 },
];

export const SUJET_SCIERIE: SujetNumerique = {
  id: 'scierie',
  nomCourt: 'Scierie',
  titre: 'Scierie — nouvel atelier d’usinage',
  sousTitre: 'Sujet d’examen numérique · Bac Pro MELEC · 6 parties · 5 h',
  diploma: 'bacpro',
  dureeMin: 300,
  consignes: [
    'Durée : 5 heures.',
    'Calculatrice autorisée : calculatrice scientifique de poche à fonctionnement autonome, non imprimante (y compris programmable ou à écran graphique).',
    'L’usage de tout ouvrage de référence, de tout dictionnaire et de tout autre matériel électronique est interdit.',
    'Les six parties de ce sujet sont indépendantes.',
    'Le sujet est accompagné d’un dossier technique et ressources dans lequel les documents sont repérés DTR.',
    'Le sujet est rendu complet, y compris les documents non complétés.',
    'Si vous repérez ce qui vous semble être une erreur d’énoncé, signalez-le lisiblement sur votre copie, proposez la correction et poursuivez l’épreuve en conséquence ; mentionnez explicitement toute hypothèse formulée.',
  ],
  problematique:
    'La scierie SYLVA, implantée dans une commune de moyenne montagne, fabrique notamment des abris et des carports en kit. La pandémie de COVID-19 a fortement relancé le bricolage et la rénovation à domicile : la demande a tellement augmenté que la scierie a atteint sa capacité maximale de production. Elle agrandit donc sa structure avec un nouveau bâtiment qui accueillera un nouveau centre d’usinage numérique HUNDEGGER K2 (poutres, charpentes, murs en bois…) et une nouvelle corroyeuse/moulurière Profimat 22N (préparation du bois brut par rabotage des quatre faces). Le site comprend le bâtiment de scierie, le bâtiment d’usinage actuel, le nouveau bâtiment et le poste HT (description du site, page 6 du sujet).\n'
    + 'Comment alimenter, éclairer, équiper et rendre économe en énergie le nouvel atelier d’usinage de la scierie ?',
  dtr: DTR,
  pagesSujet: PAGES_SUJET,
  parties: PARTIES,
  questions: QUESTIONS,
  themes: ['distribution', 'eclairage', 'domotique', 'securite', 'moteur', 'pv'],
  declinaisons: DECLINAISONS,
};
