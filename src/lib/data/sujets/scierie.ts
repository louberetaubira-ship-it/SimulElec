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
  CelluleSaisie, DeclinaisonSujet, DtrPage, FormuleSpec, QPlacement, QSchema, SujetNumerique, SujetPartie,
  SujetQuestion,
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
/** Cellule « formule » : éditeur de maths, corrigée par équivalence mathématique. */
const formule = (id: string, spec: FormuleSpec, placeholder?: string): CelluleSaisie =>
  ({ id, formule: spec, ...(placeholder ? { placeholder } : {}) });
/** Cellule « application numérique / calcul » : éditeur de maths, lue par le professeur (non notée). */
const appli = (id: string, placeholder = 'Application numérique…'): CelluleSaisie => ({ id, placeholder, saisie: 'maths' });

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

/* ───────────────────────────── Formules (correction par équivalence) ───────────────────────────── */

/*
 * Formules attendues, en LaTeX (celui de l'éditeur de maths). Le moteur tire des valeurs dans les
 * plages des `variables`, calcule les `derivees` (grandeurs liées ou simples alias de notation :
 * `L` = `a`…), puis compare numériquement la formule de l'élève à chaque écriture de `attendues`.
 * Les erreurs typiques de type « formule » sont exprimées avec les mêmes symboles.
 */

/** Angle φ d'un récepteur industriel (cos φ ≈ 0,36 à 0,98), en radians. */
const PHI = { min: 0.2, max: 1.2 };

/** A.2.1.1 : Q = P tan φ. φ′ n'intervient que pour reconnaître la formule de Qc (erreur typique). */
const F_Q: FormuleSpec = {
  attendues: ['P\\tan\\varphi', 'S\\sin\\varphi', '\\sqrt{3}UI\\sin\\varphi', '\\sqrt{S^2-P^2}'],
  membreGauche: ['Q'],
  variables: { P: { min: 1000, max: 500000 }, '\\varphi': PHI, "\\varphi'": { min: 0.05, max: 0.19 }, U: { min: 380, max: 420 } },
  derivees: { S: '\\frac{P}{\\cos\\varphi}', I: '\\frac{S}{\\sqrt{3}U}' },
  affichage: 'Q = P × tan φ',
};

/** A.2.1.2 : puissance active en triphasé. */
const F_P3: FormuleSpec = {
  attendues: ['\\sqrt{3}UI\\cos\\varphi', 'S\\cos\\varphi', '\\sqrt{S^2-Q^2}'],
  membreGauche: ['P'],
  variables: { U: { min: 380, max: 420 }, I: { min: 5, max: 200 }, '\\varphi': PHI },
  derivees: { S: '\\sqrt{3}UI', Q: 'S\\sin\\varphi' },
  affichage: 'P = √3 × U × I × cos φ',
};

/** A.2.2 : puissance apparente. */
const F_S: FormuleSpec = {
  attendues: ['\\sqrt{P^2+Q^2}', '\\frac{P}{\\cos\\varphi}', '\\frac{Q}{\\sin\\varphi}'],
  membreGauche: ['S'],
  variables: { P: { min: 10, max: 1000 }, '\\varphi': PHI },
  derivees: { Q: 'P\\tan\\varphi' },
  affichage: 'S = √(P² + Q²)',
};

/** A.2.2 : facteur de puissance. */
const F_COS: FormuleSpec = {
  attendues: ['\\frac{P}{S}', '\\frac{P}{\\sqrt{P^2+Q^2}}'],
  membreGauche: ['\\cos\\varphi', '\\cos(\\varphi)', '\\cos\\left(\\varphi\\right)'],
  variables: { P: { min: 10, max: 1000 }, '\\varphi': PHI },
  derivees: { Q: 'P\\tan\\varphi', S: '\\frac{P}{\\cos\\varphi}' },
  affichage: 'cos φ = P / S',
};

/** A.2.3 : puissance réactive à compenser (DTR 3). */
const F_QC: FormuleSpec = {
  attendues: ["P\\left(\\tan\\varphi-\\tan\\varphi'\\right)", "P\\tan\\varphi-P\\tan\\varphi'", "Q-P\\tan\\varphi'"],
  membreGauche: ['Q_{c}'],
  variables: { P: { min: 10, max: 1000 }, '\\varphi': { min: 0.5, max: 1.2 }, "\\varphi'": { min: 0.1, max: 0.45 } },
  derivees: { Q: 'P\\tan\\varphi' },
  affichage: 'Qc = P × (tan φ − tan φ′)',
};

/** A.2.4 : puissance réactive finale après compensation. */
const F_QF: FormuleSpec = {
  attendues: ['Q-Q_{c}'],
  membreGauche: ['Q_{f}'],
  variables: { Q: { min: 100, max: 1000 }, 'Q_{c}': { min: 10, max: 90 } },
  affichage: 'Qf = Q − Qc',
};

/** A.2.4 : puissance apparente finale après compensation. */
const F_SF: FormuleSpec = {
  attendues: ['\\sqrt{P^2+Q_{f}^2}', '\\sqrt{P^2+\\left(Q-Q_{c}\\right)^2}'],
  membreGauche: ['S_{f}'],
  variables: { P: { min: 100, max: 1000 }, Q: { min: 100, max: 1000 }, 'Q_{c}': { min: 10, max: 90 } },
  derivees: { 'Q_{f}': 'Q-Q_{c}' },
  affichage: 'Sf = √(P² + Qf²)',
};

/** A.2.5, A.4.2 : intensité en triphasé. */
const F_I3: FormuleSpec = {
  attendues: ['\\frac{S}{\\sqrt{3}U}'],
  membreGauche: ['I', 'I_{n}', 'I_{1}', 'I_{1n}', 'I_{p}', 'I_{a}'],
  variables: { S: { min: 10000, max: 1000000 }, U: { min: 380, max: 20000 } },
  affichage: 'I = S / (√3 × U)',
};

/** B.1.8 : indice du local (a, b : longueur, largeur ; h = ht − hu). `L`, `l` : alias de notation. */
const F_K: FormuleSpec = {
  attendues: ['\\frac{ab}{h\\left(a+b\\right)}', '\\frac{ab}{\\left(h_{t}-h_{u}\\right)\\left(a+b\\right)}'],
  membreGauche: ['K', 'k'],
  variables: { a: { min: 10, max: 60 }, b: { min: 5, max: 30 }, 'h_{t}': { min: 4, max: 12 }, 'h_{u}': { min: 0.5, max: 1.5 } },
  derivees: { h: 'h_{t}-h_{u}', L: 'a', l: 'b' },
  affichage: 'K = (a × b) / [h × (a + b)]',
};

/** B.1.11 : facteur d'utilisation (U : utilance en fraction). */
const F_UTIL: FormuleSpec = {
  attendues: ['\\eta U'],
  membreGauche: ['u'],
  variables: { '\\eta': { min: 0.5, max: 1 }, U: { min: 0.5, max: 1.3 } },
  affichage: 'u = η × U',
};

/** B.1.12 : flux lumineux total (DTR 16). S = a × b ; `L`, `l` : alias de notation. */
const F_FLUX: FormuleSpec = {
  attendues: ['\\frac{ESd}{\\eta U}', '\\frac{ESd}{u}', '\\frac{Eabd}{\\eta U}'],
  membreGauche: ['F', '\\Phi', 'F_{T}', '\\Phi_{T}'],
  variables: {
    E: { min: 100, max: 1000 }, a: { min: 10, max: 60 }, b: { min: 5, max: 30 }, d: { min: 1.1, max: 2 },
    '\\eta': { min: 0.5, max: 1 }, U: { min: 0.5, max: 1.3 },
  },
  derivees: { S: 'ab', L: 'a', l: 'b', u: '\\eta U' },
  affichage: 'F = (E × S × d) / (η × U)',
};

/** B.1.13 : flux d'un luminaire (k : efficacité lumineuse en lm/W ; η accepté comme notation). */
const F_FLUX1: FormuleSpec = {
  attendues: ['Pk'],
  membreGauche: ['\\varphi', '\\Phi', 'F'],
  variables: { P: { min: 10, max: 500 }, k: { min: 50, max: 200 } },
  derivees: { '\\eta': 'k' },
  affichage: 'φ = P × k',
};

/** B.1.14 : nombre de luminaires. */
const F_N: FormuleSpec = {
  attendues: ['\\frac{F}{\\varphi}'],
  membreGauche: ['N'],
  variables: { F: { min: 10000, max: 1000000 }, '\\varphi': { min: 1000, max: 50000 } },
  derivees: { '\\Phi': '\\varphi' },
  affichage: 'N = F / φ',
};

/** B.2.2 : coût de l'énergie (E en kWh, p : prix du kWh). */
const F_COUT: FormuleSpec = {
  attendues: ['Ep'],
  variables: { E: { min: 1000, max: 20000 }, p: { min: 0.1, max: 0.3 } },
  derivees: { W: 'E' },
  affichage: 'Coût = E × p',
};

/** D.1.3 : débit total (Q₁ : centre d'usinage, Q₂ : corroyeuse). */
const F_DEBIT: FormuleSpec = {
  attendues: ['Q_{1}+Q_{2}'],
  variables: { 'Q_{1}': { min: 50, max: 300 }, 'Q_{2}': { min: 50, max: 300 } },
  affichage: 'Q = Q₁ + Q₂',
};

/** D.4.1 : énergie (t : durée annuelle = t_s heures par semaine × n semaines). */
const F_E1: FormuleSpec = {
  attendues: ['Pt', 'Pt_{s}n'],
  membreGauche: ['E', 'W'],
  variables: { P: { min: 1, max: 100 }, 't_{s}': { min: 5, max: 40 }, n: { min: 20, max: 52 } },
  derivees: { t: 't_{s}n' },
  affichage: 'E = P × t',
};

/** D.4.2 : énergie en petite et grande vitesse (durées annuelles ; P_PV = P_GV × f_PV / f_GV). */
const F_E2: FormuleSpec = {
  attendues: ['P_{PV}t_{PV}+P_{GV}t_{GV}', '\\frac{P_{GV}f_{PV}}{f_{GV}}t_{PV}+P_{GV}t_{GV}'],
  membreGauche: ['E', 'W'],
  variables: {
    'P_{GV}': { min: 5, max: 100 }, 'f_{PV}': { min: 10, max: 45 }, 'f_{GV}': { min: 46, max: 60 },
    't_{PV}': { min: 100, max: 1500 }, 't_{GV}': { min: 50, max: 500 },
  },
  derivees: { 'P_{PV}': '\\frac{P_{GV}f_{PV}}{f_{GV}}' },
  affichage: 'E = P_PV × t_PV + P_GV × t_GV',
};

/** D.4.3 : gain énergétique (E₁ sans variateur, E₂ avec). */
const F_GAIN: FormuleSpec = {
  attendues: ['E_{1}-E_{2}'],
  variables: { 'E_{1}': { min: 20000, max: 60000 }, 'E_{2}': { min: 5000, max: 19000 } },
  affichage: 'Gain = E₁ − E₂',
};

/** D.4.4 : durée d'amortissement (C : coût, G : gain en kWh/an, p : prix du kWh). */
const F_DUREE: FormuleSpec = {
  attendues: ['\\frac{C}{Gp}'],
  variables: { C: { min: 1000, max: 20000 }, G: { min: 1000, max: 20000 }, p: { min: 0.1, max: 0.3 } },
  affichage: 'Durée = C / (G × p)',
};

/** E.3.3.2 : puissance « côté réseau » d'un panneau. */
const F_PFIN: FormuleSpec = {
  attendues: ['P_{NOCT}\\eta'],
  variables: { 'P_{NOCT}': { min: 100, max: 600 }, '\\eta': { min: 0.9, max: 1 } },
  derivees: { '\\eta_{max}': '\\eta', P: 'P_{NOCT}' },
  affichage: 'P finale = P NOCT × ηMax',
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
    aides: [
      'Regarde la plaque signalétique du transformateur (DTR 1, en bas de la page) : chaque inscription est une grandeur électrique ou un élément du couplage.',
      'Laisse-toi guider par les unités : kVA, V, A et % ne désignent pas les mêmes grandeurs. Pour le couplage, la lettre majuscule concerne l’enroulement haute tension, la minuscule l’enroulement basse tension, « n » le neutre et le nombre l’indice horaire (déphasage par pas de 30°).',
      'Forme de la réponse : pour chaque inscription, choisis dans la liste « Puissance … », « Tension … », « … couplé en … (HTA ou BT) », « Neutre … », « Indice horaire … », « Intensité … » ou « Tension de court-circuit … ».',
    ],
    erreursTypiques: [
      { id: 'puissance-active', champ: 'a1-400', valeurs: ['Puissance active'], message: 'Une puissance exprimée en kVA n’est pas une puissance active (en kW) : regarde bien l’unité.' },
      { id: 'primaire-secondaire', champ: 'a1-410', valeurs: ['Tension primaire'], message: 'Dans un transformateur abaisseur HTA/BT, le primaire est le côté haute tension : compare 20 000 V et 410 V.' },
      { id: 'couplage-d', champ: 'a1-d', valeurs: ['Primaire couplé en étoile (HTA)', 'Secondaire couplé en triangle (BT)'], message: 'Revois la signification des lettres du couplage : D et Y ne désignent pas le même couplage, et la majuscule indique l’enroulement haute tension.' },
    ],
    explication: '400 kVA : puissance apparente ; 20 000 V : tension primaire ; 410 V : tension secondaire ; D : primaire couplé en triangle (HTA) ; Y : secondaire couplé en étoile (BT) ; N : neutre sorti ; 11 : indice horaire 11 (11 × 30° = 330°) ; 563,3 A : intensité secondaire nominale ; Ucc 4 % : tension de court-circuit en %.',
  },
  {
    num: 2, label: 'A.2.1.1', partie: 1, type: 'valeur',
    enonce: 'Étude énergétique. À partir des documents ressources, **compléter** le bilan des puissances installées (on néglige l’éclairage des ateliers et l’équipement des bureaux). Arrondir les résultats à 3 chiffres significatifs.\n**Donner** la formule du calcul de la puissance réactive.',
    competence: 'C3', points: 1, dtr: [5], pageSujet: 7,
    champs: [{
      id: 'q', label: 'Formule de la puissance réactive', placeholder: 'Q = …', formule: F_Q,
      acceptes: [
        'Q = P x tan φ', 'Q = P × tan φ', 'Q = P tan φ', 'Q = P*tan φ', 'Q = P.tan φ', 'Q = P x tan(φ)', 'Q = P × tan(φ)',
        'P x tan φ', 'P × tan φ', 'P tan φ', 'Q = P x tg φ', 'Q = P x tan phi', 'Q = P tan phi', 'Q = P*tan(phi)',
        'Q = tan φ x P', 'Q = √3 x U x I x sin φ', 'Q = √3 U I sin φ', 'Q = U x I x √3 x sin φ', 'Q = U x I x sin φ x √3',
        'Q = √3 × U × I × sin φ', 'Q = S x sin φ', 'Q = S sin φ', 'Q = S × sin φ',
      ],
    }],
    indice: 'Relation entre puissance active, puissance réactive et tangente de φ (DTR 3).',
    aides: [
      'Relis le DTR 3 (compensation de l’énergie réactive) et ton cours sur les puissances en alternatif : le triangle des puissances P, Q, S.',
      'Dans le triangle des puissances, P est le côté adjacent à l’angle φ, Q le côté opposé et S l’hypoténuse. Cherche la relation trigonométrique qui relie directement Q à P.',
      'Forme de la réponse : Q = P × … (une fonction trigonométrique de φ). Q s’exprime en var quand P est en W.',
    ],
    erreursTypiques: [
      { id: 'formule-qc', formule: 'P\\left(\\tan\\varphi-\\tan\\varphi\'\\right)', message: 'Ta formule calcule la puissance réactive à compenser Qc (question A.2.3). Ici, on demande la puissance réactive Q d’un récepteur.' },
      { id: 'cos-au-lieu-de-tan', formule: 'P\\cos\\varphi', message: 'P × cos φ n’est pas une puissance réactive : revois quel côté du triangle des puissances est opposé à φ.' },
      { id: 'monophase', formule: 'UI\\sin\\varphi', message: 'Q = U × I × sin φ n’est valable qu’en monophasé : les récepteurs de la scierie sont alimentés en triphasé.' },
    ],
    explication: 'Q = P × tan φ.',
  },
  {
    num: 3, label: 'A.2.1.2', partie: 1, type: 'tableau',
    enonce: '**Calculer** la puissance active de la tailleuse d’origine et du centre d’usinage de la nouvelle installation, puis **compléter** le tableau du bilan des puissances.',
    contexte: 'Données (DTR 2) : tailleuse d’origine et centre d’usinage : I = 63 A, facteur de puissance de l’ensemble 0,85 sous 410 V. Arrondir les résultats à 3 chiffres significatifs.',
    competence: 'C3', points: 2, dtr: [4, 3], pageSujet: 8,
    colonnes: ['', 'Tailleuse', 'Centre d’usinage'],
    lignes: [
      { cellules: ['Formule', formule('a212-f-tailleuse', F_P3, 'P = …'), formule('a212-f-centre', F_P3, 'P = …')] },
      { cellules: ['Application', appli('a212-a-tailleuse'), appli('a212-a-centre')] },
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
    aides: [
      'Ouvre le DTR 2 (composition des installations) : pour la tailleuse et le centre d’usinage, on te donne le courant, le facteur de puissance et la tension ; pour les autres récepteurs, la puissance P et le cos φ.',
      'Réseau triphasé : la puissance active s’écrit avec U, I, cos φ et un coefficient propre au triphasé. Pour chaque récepteur, calcule Q avec la formule de la question précédente (A.2.1.1) : trouve φ à partir de cos φ (touche cos⁻¹ de la calculatrice). Une seule des deux pompes hydrauliques fonctionne (l’autre est en secours). Additionne enfin les colonnes P et Q.',
      'Forme de la réponse : P = … × … × … × … ; application : P = 410 × … ; résultat en kW (3 chiffres significatifs). Ligne « Total » : somme des P en kW, somme des Q en kvar.',
    ],
    erreursTypiques: [
      { id: 'oubli-racine3-formule', champ: 'a212-f-tailleuse', formule: 'UI\\cos\\varphi', message: 'Il manque le coefficient propre au triphasé : la tailleuse est alimentée en triphasé 410 V.' },
      { id: 'oubli-racine3', champ: 'a212-p-tailleuse', nombre: { valeur: 21.96, tolerance: 0.3 }, message: 'Ton résultat correspond à une puissance calculée sans le coefficient du triphasé : reprends ta formule.' },
      { id: 'deux-pompes', champ: 'a212-tot-p', nombre: { valeur: 459, tolerance: 1 }, message: 'Tu as compté les deux pompes hydrauliques : l’une est en secours et ne fonctionne pas en même temps que l’autre (DTR 2).' },
    ],
    explication: 'Tailleuse et centre d’usinage : P = U × I × cos φ × √3 = 410 × 63 × 0,85 × √3 = 38 kW. Bilan : scie 1 37 kW / 19 kvar ; scie 2 75 kW / 44,5 kvar ; moteur banc 11 kW / 7,68 kvar ; aspiration principale 35 kW / 21,7 kvar ; raboteuse 9 kW / 5,34 kvar ; tailleuse 38 kW / 23,6 kvar ; aspiration 30 kW / 18,6 kvar ; moulurière 10 kW / 6,46 kvar ; extracteur 30 kW / 17,8 kvar ; centre d’usinage 38 kW / 23,6 kvar ; Profimat 22N 12 kW / 8,38 kvar ; écorceuse 30 kW / 16,2 kvar. Total : 454 kW et 275 kvar.',
  },
  {
    num: 4, label: 'A.2.2', partie: 1, type: 'tableau',
    enonce: '**Calculer** la puissance apparente totale existant ainsi que le facteur de puissance.',
    competence: 'C3', points: 2, dtr: [4], pageSujet: 9,
    colonnes: ['Grandeur', 'Réponse'],
    lignes: [
      { cellules: ['Formule de la puissance apparente S (VA)', formule('a22-f-s', F_S, 'S = …')] },
      { cellules: ['Calcul de la puissance apparente (kVA)', appli('a22-a-s')] },
      { cellules: ['Résultat (kVA)', num('a22-s', 530, 3, ['530 kVA'])] },
      { cellules: ['Formule du facteur de puissance cos φ', formule('a22-f-cos', F_COS, 'cos φ = …')] },
      { cellules: ['Calcul du facteur de puissance cos φ', appli('a22-a-cos')] },
      { cellules: ['Résultat', num('a22-cos', 0.857, 0.006)] },
      { cellules: ['Calcul de la tangente φ', num('a22-tan', 0.601, 0.008)] },
    ],
    indice: 'Totaux du bilan A.2.1.2 : P = 454 kW et Q = 275 kvar ; S = √(P² + Q²) et cos φ = P / S.',
    aides: [
      'Reprends les totaux P et Q du bilan des puissances (A.2.1.2).',
      'P, Q et S forment un triangle rectangle (triangle des puissances) : S en est l’hypoténuse (théorème de Pythagore). Le facteur de puissance cos φ se lit dans ce même triangle (côté adjacent / hypoténuse). Pour tan φ, calcule φ puis sa tangente.',
      'Forme de la réponse : S = √(…² + …²) = … kVA ; cos φ = … / … = 0,… (sans unité, 3 décimales) ; tan φ = 0,… .',
    ],
    erreursTypiques: [
      { id: 'somme-p-q', champ: 'a22-f-s', formule: 'P+Q', message: 'Les puissances P et Q ne s’additionnent pas directement : ce sont les deux côtés de l’angle droit du triangle des puissances.' },
      { id: 'somme-p-q-valeur', champ: 'a22-s', nombre: { valeur: 729, tolerance: 2 }, message: 'Ton résultat est la somme P + Q : pour S, utilise le triangle des puissances (Pythagore).' },
      { id: 'cos-inverse', champ: 'a22-f-cos', formule: '\\frac{S}{P}', message: 'Ton rapport est inversé : un facteur de puissance est toujours inférieur ou égal à 1.' },
    ],
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
    formuleSpec: F_QC,
    aides: [
      'Ouvre le DTR 3, paragraphe « Puissance réactive à installer ». Reprends la puissance active totale (A.2.1.2) et tan φ de l’installation (A.2.2).',
      'La batterie de condensateurs doit faire passer tan φ de sa valeur actuelle à la valeur imposée tan φ’ = 0,4 : la puissance réactive à compenser est proportionnelle à P et à l’écart entre les deux tangentes.',
      'Forme de la réponse : Qc = P × (… − …) ; application : Qc = … × (… − 0,4) ; résultat en kvar, 3 chiffres significatifs.',
    ],
    erreursTypiques: [
      { id: 'formule-q', formule: 'P\\tan\\varphi', message: 'Ta formule donne la puissance réactive Q de l’installation, pas la puissance réactive à compenser Qc : relis le DTR 3.' },
      { id: 'q-au-lieu-de-qc', nombre: { valeur: 272.9, tolerance: 2 }, message: 'Ce résultat est la puissance réactive totale de l’installation : on demande seulement la part à compenser pour atteindre tan φ’.' },
      { id: 'tangentes-inversees', nombre: { valeur: -91.3, tolerance: 1.3 }, message: 'Ton résultat est négatif : tu as inversé tan φ et tan φ’ dans la parenthèse.' },
    ],
    explication: 'Qc = P × (tan φ − tan φ’) = 454 × (0,601 − 0,4) = 91,3 kvar.',
  },
  {
    num: 6, label: 'A.2.4', partie: 1, type: 'tableau',
    enonce: '**Calculer** la puissance apparente après compensation.',
    competence: 'C3', points: 2, dtr: [5], pageSujet: 9,
    colonnes: ['Grandeur', 'Formule', 'Valeur'],
    lignes: [
      { cellules: ['Puissance active totale', '', '454 kW'] },
      { cellules: ['Puissance réactive finale après compensation Qf (kvar)', formule('a24-f-qf', F_QF, 'Qf = …'), num('a24-qf', 184, 2)] },
      { cellules: ['Puissance apparente finale Sf (kVA)', formule('a24-f-sf', F_SF, 'Sf = …'), num('a24-sf', 490, 4)] },
    ],
    indice: 'La compensation retranche Qc à la puissance réactive ; la puissance active ne change pas.',
    aides: [
      'Reprends Q totale (A.2.1.2), Qc (A.2.3) et la puissance active totale, rappelée dans le tableau : la compensation ne modifie pas la puissance active.',
      'Les condensateurs fournissent eux-mêmes de l’énergie réactive : la puissance réactive appelée au réseau diminue de Qc. Recalcule ensuite S avec le triangle des puissances, avec cette nouvelle puissance réactive.',
      'Forme de la réponse : Qf = … − … (kvar) ; Sf = √(…² + …²) (kVA).',
    ],
    erreursTypiques: [
      { id: 'qc-ajoute', champ: 'a24-f-qf', formule: 'Q+Q_{c}', message: 'La compensation diminue la puissance réactive appelée : Qc ne s’ajoute pas à Q.' },
      { id: 'qc-ajoute-valeur', champ: 'a24-qf', nombre: { valeur: 366.3, tolerance: 2 }, message: 'Ton résultat augmente la puissance réactive : la compensation doit la diminuer.' },
      { id: 's-avant-compensation', champ: 'a24-sf', nombre: { valeur: 530, tolerance: 3 }, message: 'Tu retrouves la puissance apparente d’avant compensation (A.2.2) : utilise Qf, pas Q.' },
    ],
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
    formuleSpec: F_I3,
    aides: [
      'Utilise la puissance apparente imposée juste avant la question et la tension du secondaire du transformateur (DTR 1).',
      'En triphasé, S = √3 × U × I (U : tension entre phases) : isole I. Convertis S en VA avant de calculer.',
      'Forme de la réponse : I = S / (… × …) ; application : I = … / (410 × …) ; résultat en A.',
    ],
    erreursTypiques: [
      { id: 'oubli-racine3-formule', formule: '\\frac{S}{U}', message: 'Il manque le coefficient du triphasé dans ta formule.' },
      { id: 'oubli-racine3', nombre: { valeur: 1195, tolerance: 10 }, message: 'Ton résultat correspond à un calcul sans le coefficient du triphasé.' },
      { id: 'kva-non-converti', nombre: { valeur: 0.69, tolerance: 0.01 }, message: 'Ton résultat est 1 000 fois trop petit : S doit être en VA (et non en kVA) pour obtenir des ampères.' },
    ],
    explication: 'I = S / (U × √3) = 490 000 / (410 × √3) = 690 A.',
  },
  {
    num: 8, label: 'A.2.6', partie: 1, type: 'redige',
    enonce: '**Préciser** et **justifier** si le transformateur actuel est adapté.',
    competence: 'C3', points: 1, dtr: [3], pageSujet: 9,
    motsCles: ['non', '400', '490', 'inferieur', 'insuffisant', 'depasse', 'surcharge', '563', '690'], minMotsCles: 2, lignes: 3,
    corrige: 'Non : le transformateur actuel (400 kVA, 563 A au secondaire) n’est pas adapté, sa puissance est inférieure à la puissance utilisée (490 kVA, 690 A).',
    indice: 'Comparer la puissance de la plaque (A.1) à la puissance apparente calculée en A.2.4.',
    aides: [
      'Relis la plaque signalétique du transformateur actuel (A.1, DTR 1) et tes résultats A.2.4 et A.2.5.',
      'Un transformateur est adapté si sa puissance apparente nominale (et son courant secondaire nominal) est au moins égale à ce que l’installation appelle. Compare les deux valeurs.',
      'Forme de la réponse : « Oui / Non, car la puissance du transformateur (… kVA) est … à la puissance appelée (… kVA). »',
    ],
    erreursTypiques: [
      { id: 'oui', valeurs: ['oui,', 'oui car', 'oui il', 'oui le transformateur', 'oui, le transformateur', 'oui adapté', 'oui est adapté', 'est adapté car'], message: 'Compare la puissance nominale du transformateur actuel (plaque, A.1) à la puissance apparente appelée après compensation (A.2.4).' },
    ],
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
    aides: [
      'Ouvre le DTR 3, paragraphe « Compensation fixe ou automatique ». Utilise les valeurs imposées pour la suite : Qc = 92 kvar et Sn = 490 kVA.',
      'Calcule le rapport Qc / Sn en pourcentage, puis situe-le par rapport au seuil indiqué dans le DTR 3.',
      'Forme de la réponse : Qc / Sn = … / … = … % ; type de compensation : « fixe » ou « automatique » selon la position par rapport au seuil.',
    ],
    erreursTypiques: [
      { id: 'fixe', champ: 'a31-type', valeurs: ['Fixe'], message: 'Relis la règle du DTR 3 : quel type de compensation est conseillé quand Qc / Sn dépasse le seuil de 15 % ?' },
      { id: 'sn-transfo-actuel', champ: 'a31-ratio', nombre: { valeur: 23, tolerance: 0.3 }, message: 'Tu as divisé par la puissance du transformateur actuel : utilise la puissance Sn imposée pour la suite.' },
      { id: 's-avant-compensation', champ: 'a31-ratio', nombre: { valeur: 17.4, tolerance: 0.3 }, message: 'Utilise les valeurs imposées pour la suite (Qc et Sn), pas la puissance apparente d’avant compensation.' },
    ],
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
    aides: [
      'Ouvre le DTR 4, tableau « VarSet Easy pour réseaux non pollués ».',
      'Choisis la première puissance de batterie supérieure ou égale à la puissance à compenser imposée (Qc = 92 kvar), jamais une puissance inférieure. Lis ensuite, sur la même ligne, le disjoncteur et la référence.',
      'Forme de la réponse : puissance en kvar (valeur du tableau) ; disjoncteur « CVS… F … A » ; référence « VLVAW… ».',
    ],
    erreursTypiques: [
      { id: 'puissance-inferieure', champ: 'a32-q', nombre: { valeur: 90, tolerance: 0 }, message: 'Cette batterie est inférieure à Qc : la compensation serait insuffisante. Prends la puissance juste au-dessus.' },
      { id: 'reference-inferieure', champ: 'a32-varset', valeurs: ['VLVAW1L090A40A'], message: 'Cette référence correspond à une batterie de puissance inférieure à Qc.' },
    ],
    explication: '100 kvar (≥ 92 kvar) : disjoncteur CVS250F 200A, VarSet VLVAW1L100A40A.',
  },
  {
    num: 11, label: 'A.4.1', partie: 1, type: 'tableau',
    enonce: 'Choix du nouveau transformateur et de sa protection (fusible). D’après la documentation technique, **choisir** un transformateur adapté (on vous impose IP00) puis **compléter** le tableau ci-dessous.',
    competence: 'C3', points: 1, dtr: [9, 7], pageSujet: 10,
    colonnes: ['Puissance apparente du transformateur (kVA)', 'Référence'],
    lignes: [{ cellules: [num('a41-s', 630, 0), txt('a41-ref', ['TRI063020003004'])] }],
    indice: 'Tableau des transformateurs Trihal 20 kV / 410 V (DTR 6) : première puissance supérieure à 490 kVA, ligne « transformateurs IP 00 ».',
    aides: [
      'Ouvre le DTR 6 (transformateurs Trihal 20 kV / 410 V), lignes « puissance » et « références ».',
      'La puissance du nouveau transformateur doit être supérieure à la puissance apparente appelée (A.2.4) : prends la première puissance normalisée au-dessus. Il y a trois lignes de références : on t’impose l’IP 00.',
      'Forme de la réponse : puissance en kVA (valeur du tableau) ; référence « TRI0… » lue sur la ligne « transformateurs IP 00 ».',
    ],
    erreursTypiques: [
      { id: 'ip31-monte', champ: 'a41-ref', valeurs: ['TRI063020003024'], message: 'Cette référence est celle du transformateur avec habillage IP 31 monté : on t’impose l’IP 00.' },
      { id: 'ip31-kit', champ: 'a41-ref', valeurs: ['TRIOPT000003043'], message: 'Cette référence est celle de l’habillage IP 31 livré en kit, pas celle du transformateur.' },
      { id: 'transfo-actuel', champ: 'a41-s', nombre: { valeur: 400, tolerance: 0 }, message: 'C’est la puissance du transformateur actuel, qui est insuffisante (A.2.6).' },
    ],
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
    formuleSpec: F_I3,
    aides: [
      'Utilise la puissance du transformateur choisi en A.4.1 et sa tension primaire (DTR 6).',
      'Le primaire est alimenté en triphasé HTA : S = √3 × U × I, avec U la tension primaire en volts. Isole I.',
      'Forme de la réponse : I = S / (… × …) ; application : I = … / (… × √3) ; résultat en A (1 décimale).',
    ],
    erreursTypiques: [
      { id: 'oubli-racine3-formule', formule: '\\frac{S}{U}', message: 'Il manque le coefficient du triphasé dans ta formule.' },
      { id: 'tension-secondaire', nombre: { valeur: 887.2, tolerance: 5 }, message: 'Tu as utilisé la tension secondaire : l’intensité primaire se calcule avec la tension du primaire.' },
      { id: 'oubli-racine3', nombre: { valeur: 31.5, tolerance: 0.3 }, message: 'Ton résultat correspond à un calcul sans le coefficient du triphasé.' },
    ],
    explication: 'I = S / (U × √3) = 630 000 / (20 000 × √3) = 18,2 A.',
  },
  {
    num: 13, label: 'A.4.3', partie: 1, type: 'valeur',
    enonce: '**Choisir** les fusibles protégeant le primaire du transformateur sachant que le courant maximum de coupure est de 31,5 kA.',
    competence: 'C3', points: 1, dtr: [11, 10], pageSujet: 10,
    champs: [{ id: 'ref', label: 'Référence', acceptes: ['51108818M0', '5108818M0'] }],
    indice: 'Tension assignée 24 kV (réseau 20 kV), courant assigné juste supérieur à 18,2 A, courant maximal de coupure 31,5 kA (DTR 8).',
    // Corrigé officiel : « 5108818M0 » (chiffre manquant) ; la référence du DTR 8 est 51108818M0.
    aides: [
      'Ouvre les DTR 7 et 8 (fusibles Fusarc CF) : tableau des références avec tension assignée, courant assigné et courant maximal de coupure.',
      'Trois critères à respecter ensemble : une tension assignée adaptée au réseau 20 kV, le courant maximal de coupure imposé (31,5 kA), et un courant assigné supérieur au courant nominal primaire calculé en A.4.2 (le premier calibre au-dessus).',
      'Forme de la réponse : une référence de 10 caractères « 5………M0 », lue sur la ligne qui respecte les trois critères.',
    ],
    erreursTypiques: [
      { id: 'calibre-trop-faible', valeurs: ['51108817M0', '51108816M0', '51108815M0'], message: 'Ce fusible a un courant assigné inférieur au courant nominal primaire : il fondrait en service normal.' },
      { id: 'pouvoir-coupure', valeurs: ['51108813M0', '51006541M0'], message: 'Ce fusible a le bon calibre, mais son courant maximal de coupure n’est pas celui imposé (31,5 kA).' },
    ],
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
    aides: [
      'Lis le DTR 9 (l’éclairage, un élément essentiel pour de bonnes conditions de travail), rubrique sur les impacts sur la santé.',
      'Pense à ce qui arrive aux yeux, au corps (position de travail) et à la sécurité quand on voit mal son poste de travail.',
      'Forme de la réponse : une liste de quatre impacts courts, par exemple un sur la vue, un sur le corps et deux sur la sécurité.',
    ],
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
    aides: [
      'Ouvre le DTR 29 (plans de l’extension) : les cotes sont en centimètres. La hauteur sous plafond est donnée dans la mise en situation de la partie B.',
      'Convertis les cotes en mètres (÷ 100). La longueur est la plus grande dimension du rectangle ; ht est la hauteur du plafond par rapport au sol.',
      'Forme de la réponse : longueur = … m ; largeur = …,… m ; hauteur totale ht = …,… m.',
    ],
    erreursTypiques: [
      { id: 'cm-non-converti', champ: 'b12-lg', nombre: { valeur: 1520, tolerance: 1 }, message: 'Les cotes du plan sont en centimètres : convertis-les en mètres.' },
      { id: 'longueur-largeur', champ: 'b12-l', nombre: { valeur: 15.2, tolerance: 0.05 }, message: 'Tu as inversé longueur et largeur : la longueur est la plus grande dimension.' },
      { id: 'h-au-lieu-de-ht', champ: 'b12-ht', nombre: { valeur: 6.4, tolerance: 0.05 }, message: 'On demande la hauteur totale ht (du sol au plafond), pas la hauteur au-dessus du plan utile.' },
    ],
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
    aides: [
      'Ouvre le DTR 10 (facteurs de réflexion) et relis la mise en situation de la partie B : couleur du plafond, des murs et des plans de travail.',
      'Choisis la colonne qui correspond à la couleur de chaque surface, puis lis la ligne Plafond, Murs ou Plan utile. Ces trois chiffres, dans l’ordre plafond – murs – plan utile, forment le « facteur de réflexion » des tableaux d’utilance.',
      'Forme de la réponse : un chiffre par surface (plafond = … ; murs = … ; plan utile = …).',
    ],
    erreursTypiques: [
      { id: 'tres-clair', champ: 'b13-plafond', nombre: { valeur: 8, tolerance: 0 }, message: 'La valeur 8 correspond à un plafond « très clair » : relis la couleur donnée dans la mise en situation.' },
    ],
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
    aides: [
      'Relis la mise en situation de la partie B (hauteur des plans de travail, luminaires convenus avec le client) et ouvre le DTR 12 (éclairement recommandé).',
      'Convertis la hauteur du plan utile en mètres. Pour E, cherche dans le DTR 12 la ligne qui correspond à l’activité de l’atelier (usinage du bois). Le mode d’éclairage figure dans les caractéristiques des luminaires.',
      'Forme de la réponse : hu = …,… m ; E = … lux ; mode : direct ou indirect.',
    ],
    erreursTypiques: [
      { id: 'hu-en-cm', champ: 'b14-hu', nombre: { valeur: 110, tolerance: 0 }, message: 'La hauteur est demandée en mètres : convertis les centimètres.' },
      { id: 'mauvaise-ligne', champ: 'b14-e', nombre: { valeur: 300, tolerance: 0 }, message: 'Cette valeur correspond à une autre activité du DTR 12 : cherche la ligne qui décrit le travail réalisé dans l’atelier.' },
      { id: 'indirect', champ: 'b14-mode', valeurs: ['indirect'], message: 'Relis les caractéristiques des luminaires convenues avec le client (mise en situation de la partie B).' },
    ],
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
    aides: [
      'Ouvre le DTR 13 (température de couleur en fonction de l’éclairement).',
      'Place-toi sur l’axe des éclairements à la valeur de E trouvée en B.1.4, puis monte verticalement : la zone de confort est la zone ombrée entre les deux courbes. Lis la température de couleur sur chacune des deux courbes.',
      'Forme de la réponse : température minimale = … K ; température maximale = … K.',
    ],
    erreursTypiques: [
      { id: 'min-max-inverses', champ: 'tmin', nombre: { valeur: 5100, tolerance: 200 }, message: 'Tu as inversé les deux limites : la température minimale est la plus petite des deux.' },
    ],
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
    aides: [
      'Ouvre le DTR 14 (caractéristiques des luminaires) et relis les critères convenus avec le client (mise en situation de la partie B).',
      'Élimine les luminaires qui ne conviennent pas : variation 1-10 V (non DALI) exigée et température de couleur imposée de 4000 K. Il n’en reste qu’un.',
      'Forme de la réponse : référence complète telle qu’imprimée (lettres, chiffres, tiret) ; puissance en W ; température de couleur en K.',
    ],
    erreursTypiques: [
      { id: '5000k', champ: 'b16-ref', valeurs: ['B8138-150', 'B8138150'], message: 'Ce luminaire est en blanc froid 5000 K : la température de couleur imposée est différente.' },
      { id: 'dali', champ: 'b16-ref', valeurs: ['LHBEX36D'], message: 'Ce luminaire est dimmable DALI : le client veut une variation 1-10 V non DALI.' },
      { id: 'luminaire-impose', champ: 'b16-p', nombre: { valeur: 200, tolerance: 0 }, message: '200 W est la puissance du luminaire imposé pour la SUITE des questions : ici, donne celle du luminaire que tu as choisi dans le DTR 14.' },
    ],
    explication: 'Cloche LED industrielle 150 W, 135 lm/W, dimmable 1-10 V, IP65, 4000 K : référence LHBE25B20R40-01.',
  },
  {
    num: 20, label: 'B.1.7', partie: 2, type: 'valeur',
    enonce: '**Donner** le facteur de dépréciation.',
    contexte: 'Pour la suite des questions on impose le luminaire Noxion Highbay LED Concord G3 / 200 W / 4000 K / CRI > 80 / 1-10 V Dimmable / 150 lm/W / 139,99 € HT. Le luminaire sera fixé au plafond (J = 0).',
    competence: 'C3', points: 1, dtr: [13], pageSujet: 12,
    champs: [{ id: 'd', label: 'Facteur compensateur de dépréciation (d) =', attendu: 1.65, tolerance: 0 }],
    indice: 'Facteurs de dépréciation (DTR 11) : empoussièrement « élevé ».',
    aides: [
      'Ouvre le DTR 11 (facteurs de dépréciation) et relis le niveau d’empoussièrement donné dans la mise en situation.',
      'Choisis la ligne du niveau d’empoussièrement, puis la colonne « facteur compensateur de dépréciation » (supérieur à 1), et non celle du facteur de maintenance.',
      'Forme de la réponse : d = …,… (sans unité, supérieur à 1).',
    ],
    erreursTypiques: [
      { id: 'facteur-maintenance', champ: 'd', nombre: { valeur: 0.6, tolerance: 0 }, message: 'C’est le facteur de maintenance : on demande le facteur compensateur de dépréciation.' },
      { id: 'empoussierement-moyen', champ: 'd', nombre: { valeur: 1.4, tolerance: 0 }, message: 'Cette valeur correspond à un empoussièrement « moyen » : relis la mise en situation.' },
    ],
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
    formuleSpec: F_K,
    aides: [
      'Utilise les dimensions du bâtiment (B.1.2) et la hauteur du plan utile (B.1.4) ; le DTR 15 définit les hauteurs ht, hu et h.',
      'h est la hauteur du luminaire au-dessus du plan utile : le luminaire est fixé au plafond, donc h = ht − hu. Remplace ensuite chaque grandeur dans la formule de l’indice du local donnée dans l’énoncé.',
      'Forme de la réponse : K = (… × …) / (… × (… + …)) ; résultat arrondi à 2 décimales (la valeur normalisée du tableau ne sert qu’à la question suivante).',
    ],
    erreursTypiques: [
      { id: 'ht-au-lieu-de-h-formule', formule: '\\frac{ab}{h_{t}\\left(a+b\\right)}', message: 'Tu as utilisé la hauteur totale ht : h est la hauteur entre le luminaire et le plan utile.' },
      { id: 'ht-au-lieu-de-h', nombre: { valeur: 1.41, tolerance: 0.02 }, message: 'Tu as utilisé la hauteur totale ht : h est la hauteur entre le luminaire et le plan utile.' },
      { id: 'valeur-normalisee', nombre: { valeur: 2, tolerance: 0.02 }, message: 'Tu as donné la valeur normalisée du tableau : on demande d’abord le résultat du calcul, arrondi à 2 décimales.' },
    ],
    explication: 'K = (35 × 15,20) / [6,40 × (35 + 15,20)] = 532 / 321,28 = 1,66, arrondi à la valeur normalisée 2 (DTR 15).',
  },
  {
    num: 22, label: 'B.1.9', partie: 2, type: 'valeur',
    enonce: '**Donner** le rapport de suspension.',
    competence: 'C3', points: 1, dtr: [16], pageSujet: 12,
    champs: [{ id: 'j', label: 'J =', attendu: 0, tolerance: 0 }],
    indice: 'Rapport de suspension (DTR 15) : deux valeurs seulement.',
    aides: [
      'Ouvre le DTR 15 (calculs d’éclairement), rapport de suspension J, et relis la mise en situation (fixation des luminaires).',
      'J compare la hauteur de suspension h’ à la hauteur totale du luminaire au-dessus du plan utile : un luminaire plaqué contre le plafond n’est pas suspendu.',
      'Forme de la réponse : J = … (l’une des deux valeurs possibles du DTR 15).',
    ],
    erreursTypiques: [
      { id: 'un-tiers', champ: 'j', nombre: { valeur: 0.333, tolerance: 0.01 }, message: 'La valeur 1/3 correspond à un luminaire suspendu : relis comment les luminaires sont fixés.' },
    ],
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
    aides: [
      'Ouvre le DTR 16 : quatre tableaux d’utilance (classes B et C, J = 0 et J = 1/3). Utilise les données imposées juste au-dessus de la question.',
      'Choisis le bon tableau (classe du luminaire et valeur de J), puis la ligne de l’indice du local et la colonne du facteur de réflexion : l’utilance est à l’intersection.',
      'Forme de la réponse : U = … % (nombre lu dans le tableau ; il peut dépasser 100).',
    ],
    erreursTypiques: [
      { id: 'classe-b', champ: 'u', nombre: { valeur: 109, tolerance: 0 }, message: 'Tu as lu un tableau de la classe B : le luminaire est de classe C.' },
      { id: 'j-un-tiers', champ: 'u', nombre: { valeur: 103, tolerance: 0 }, message: 'Tu as lu le tableau J = 1/3 : utilise la valeur de J imposée.' },
      { id: 'ligne-indice', champ: 'u', nombre: { valeur: 99, tolerance: 0 }, message: 'Tu as lu une autre ligne : utilise l’indice du local imposé (valeur normalisée).' },
    ],
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
    formuleSpec: F_UTIL,
    aides: [
      'Utilise le rendement du luminaire (mise en situation de la partie B) et l’utilance trouvée en B.1.10.',
      'Les tableaux d’utilance donnent un pourcentage : divise-le par 100 avant de le multiplier par le rendement.',
      'Forme de la réponse : u = η × U = 0,… × … ; résultat sans unité, 3 décimales.',
    ],
    erreursTypiques: [
      { id: 'division-formule', formule: '\\frac{\\eta}{U}', message: 'Le facteur d’utilisation est un produit : relis la formule donnée dans l’énoncé.' },
      { id: 'pourcentage', nombre: { valeur: 94.5, tolerance: 0.5 }, message: 'L’utilance doit être convertie (U en % divisé par 100) : le facteur d’utilisation est un nombre sans unité.' },
      { id: 'division', nombre: { valeur: 0.857, tolerance: 0.005 }, message: 'Tu as divisé au lieu de multiplier : relis la formule donnée dans l’énoncé.' },
    ],
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
    formuleSpec: F_FLUX,
    aides: [
      'Ouvre le DTR 16, encadré « Calcul du flux lumineux total nécessaire » : la formule y est donnée avec la signification de chaque lettre.',
      'E : éclairement (B.1.4) ; S : surface du plan utile = longueur × largeur (B.1.2) ; d : facteur de dépréciation (B.1.7) ; η : rendement du luminaire ; U : utilance (B.1.10) divisée par 100.',
      'Forme de la réponse : F = (… × … × …) / (… × …) ; application numérique puis résultat en lumens.',
    ],
    erreursTypiques: [
      { id: 'd-au-denominateur', formule: '\\frac{ES}{d\\eta U}', message: 'Le facteur de dépréciation d est au numérateur : il augmente le flux à installer.' },
      { id: 'd-au-denominateur-valeur', nombre: { valeur: 170594, tolerance: 1700 }, message: 'Le facteur de dépréciation d est au numérateur : il augmente le flux à installer.' },
      { id: 'utilance-en-pourcent', nombre: { valeur: 4644, tolerance: 50 }, message: 'L’utilance est en % dans les tableaux : divise-la par 100.' },
    ],
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
    formuleSpec: F_FLUX1,
    aides: [
      'Relis les caractéristiques du luminaire imposé pour la suite (texte juste avant B.1.7) : puissance et efficacité lumineuse.',
      'L’efficacité lumineuse k (en lm/W) indique combien de lumens produit chaque watt : le flux d’un luminaire s’obtient à partir de sa puissance et de k.',
      'Forme de la réponse : φ = P × k = … W × … lm/W = … lm.',
    ],
    erreursTypiques: [
      { id: 'division-formule', formule: '\\frac{P}{k}', message: 'Une efficacité en lm/W se multiplie par des watts pour donner des lumens.' },
      { id: 'luminaire-b16', nombre: { valeur: 22500, tolerance: 1 }, message: 'Tu as utilisé le luminaire de B.1.6 : pour la suite, le luminaire imposé est différent.' },
      { id: 'division', nombre: { valeur: 1.33, tolerance: 0.01 }, message: 'Tu as divisé : une efficacité en lm/W se multiplie par des watts pour donner des lumens.' },
    ],
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
    formuleSpec: F_N,
    aides: [
      'Reprends le flux total F (B.1.12) et le flux d’un luminaire (B.1.13).',
      'Le nombre de luminaires est le rapport du flux total au flux d’un luminaire. L’énoncé impose d’arrondir par défaut (au nombre entier inférieur).',
      'Forme de la réponse : N = … / … = …,… ; nombre de luminaires = … (entier).',
    ],
    erreursTypiques: [
      { id: 'rapport-inverse', formule: '\\frac{\\varphi}{F}', message: 'Ton rapport est inversé : on cherche combien de fois le flux d’un luminaire est contenu dans le flux total.' },
      { id: 'arrondi-exces', nombre: { valeur: 16, tolerance: 0 }, message: 'Tu as arrondi par excès : l’énoncé demande un arrondi par défaut.' },
      { id: 'non-arrondi', nombre: { valeur: 15.48, tolerance: 0.02 }, message: 'Donne un nombre entier de luminaires, arrondi par défaut.' },
    ],
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
    aides: [
      'Relis la désignation et le prix unitaire du luminaire imposé (texte avant B.1.7) et le nombre de luminaires trouvé en B.1.14.',
      'Prix total HT = PU HT × quantité ; TVA = 20 % du prix total HT ; prix TTC = prix HT + TVA.',
      'Forme de la réponse : désignation du luminaire ; PU = …,… € ; quantité = … ; total HT = … € ; TVA = … € ; TTC = … € (2 décimales).',
    ],
    erreursTypiques: [
      { id: 'quantite', champ: 'b115-qte', nombre: { valeur: 16, tolerance: 0 }, message: 'Reprends le nombre de luminaires arrondi par défaut (B.1.14).' },
      { id: 'tva-ttc', champ: 'b115-tva', nombre: { valeur: 2519.82, tolerance: 0.03 }, message: 'La TVA n’est que 20 % du prix HT : ce que tu as calculé est le prix TTC.' },
    ],
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
    aides: [
      'Utilise les dimensions du bâtiment (B.1.2) et la consigne de l’énoncé (nombre de luminaires dans la longueur et dans la largeur).',
      'Répartition régulière : l’entraxe entre deux luminaires vaut d = dimension / nombre de luminaires, et la distance entre le dernier luminaire et le mur vaut d / 2. Fais le calcul dans chaque direction.',
      'Forme de la réponse : une grille régulière de luminaires ; chacun au centre de sa « case », à d / 2 des murs et à d de ses voisins.',
    ],
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
    aides: [
      'Relis la mise en situation de la partie B (utilisations annuelles de jour et de nuit) et la liste du matériel (nombre et puissance des luminaires, B.2).',
      'Durée annuelle = heures de jour + heures de nuit. Puissance totale = nombre de luminaires × puissance d’un luminaire. Énergie = puissance × durée, à convertir en kWh (÷ 1 000).',
      'Forme de la réponse : durée = … h ; puissance = … W ; énergie = … × … = … Wh, soit … kWh.',
    ],
    erreursTypiques: [
      { id: 'jour-seulement', champ: 'b21-h', nombre: { valeur: 2250, tolerance: 0 }, message: 'Tu n’as compté que l’utilisation de jour : ajoute l’utilisation de nuit.' },
      { id: 'un-luminaire', champ: 'b21-p', nombre: { valeur: 200, tolerance: 0 }, message: 'C’est la puissance d’un seul luminaire : on demande la puissance totale.' },
      { id: 'wh', champ: 'b21-e', nombre: { valeur: 10500000, tolerance: 1000 }, message: 'Ton résultat est en Wh : le tableau demande des kWh.' },
    ],
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
    formuleSpec: F_COUT,
    aides: [
      'Reprends l’énergie annuelle calculée en B.2.1 (en kWh) et le prix du kWh donné dans l’énoncé.',
      'Le coût est proportionnel à l’énergie consommée : coût (€) = énergie (kWh) × prix d’un kWh (€/kWh). Note E l’énergie et p le prix du kWh.',
      'Forme de la réponse : Coût = E × p = … × … = … €.',
    ],
    erreursTypiques: [
      { id: 'wh', nombre: { valeur: 2415000, tolerance: 1000 }, message: 'Tu as utilisé l’énergie en Wh : le prix est donné par kWh.' },
    ],
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
    aides: [
      'Relis le texte juste avant la question (heures d’éclairage compensées par la lumière naturelle) et reprends la durée et la puissance de B.2.1.',
      'Pendant les heures compensées par la lumière naturelle, les luminaires restent éteints : retire-les de la durée annuelle. La puissance installée ne change pas.',
      'Forme de la réponse : durée = … − … = … h ; puissance = … W ; énergie = … Wh, soit … kWh.',
    ],
    erreursTypiques: [
      { id: 'heures-compensees', champ: 'b23-h', nombre: { valeur: 1500, tolerance: 0 }, message: 'C’est le nombre d’heures compensées par la lumière naturelle : on demande les heures d’utilisation qui restent.' },
      { id: 'energie-economisee', champ: 'b23-e', nombre: { valeur: 4500, tolerance: 5 }, message: 'Tu as calculé l’énergie économisée : on demande l’énergie encore consommée.' },
      { id: 'wh', champ: 'b23-e', nombre: { valeur: 6000000, tolerance: 1000 }, message: 'Ton résultat est en Wh : le tableau demande des kWh.' },
    ],
    explication: '3 500 − 1 500 = 2 000 h ; 200 W × 15 = 3 000 W ; énergie : 6 000 000 Wh soit 6 000 kWh.',
  },
  {
    num: 33, label: 'B.2.4', partie: 2, type: 'tableau',
    enonce: '**Calculer** le nouveau coût annuel de l’énergie consommée par le nouveau bâtiment en intégrant les apports naturels, sachant que le prix du kWh est de 0,23 €.',
    competence: 'C3', points: 1, dtr: [], pageSujet: 16,
    colonnes: ['Coût annuel en euros', 'Économie annuelle réalisée (€)'],
    lignes: [{ cellules: [num('b24-cout', 1380, 1), num('b24-eco', 1035, 1)] }],
    aides: [
      'Reprends l’énergie de B.2.3 (kWh), le prix du kWh et le coût sans gestion KNX (B.2.2).',
      'Nouveau coût = énergie × prix du kWh ; économie annuelle = ancien coût − nouveau coût.',
      'Forme de la réponse : coût = … × … = … € ; économie = … − … = … €.',
    ],
    erreursTypiques: [
      { id: 'economie-somme', champ: 'b24-eco', nombre: { valeur: 3795, tolerance: 1 }, message: 'Tu as additionné les deux coûts : l’économie est une différence.' },
      { id: 'economie-cout', champ: 'b24-eco', nombre: { valeur: 1380, tolerance: 1 }, message: 'L’économie est la différence entre deux coûts annuels : reprends aussi le coût sans gestion KNX (B.2.2).' },
    ],
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
    aides: [
      'Ouvre les DTR 18 (actionneurs, interfaces 1-10 V), 19 (alimentations de bus), 20 (boutons-poussoirs) et 21 (détecteurs de présence), et relis la liste du matériel de la mise en situation B.2.',
      'Pour chaque matériel, applique les critères imposés : actionneur 1-10 V à 3 sorties ; commande 6 touches de finition anthracite ; détecteurs posés en saillie au plafond ; alimentation de 320 mA. Les quantités sont dans la mise en situation. Pour la fonction, dis en quelques mots à quoi sert l’appareil.',
      'Forme de la réponse : références « MTN… » complètes (avec le tiret quand il y en a un) ; une fonction courte par appareil (un verbe à l’infinitif) ; quantité en nombre entier.',
    ],
    erreursTypiques: [
      { id: 'alim-640', champ: 'b25-alim', valeurs: ['MTN684064'], message: 'Cette alimentation délivre 640 mA : le matériel prévu est une alimentation de 320 mA.' },
      { id: 'detecteur-encastre', champ: 'b25-det', valeurs: ['MTN6304-0019', 'MTN63040019'], message: 'Ce détecteur s’installe encastré : les détecteurs doivent être posés en saillie au plafond.' },
      { id: 'commande-blanche', champ: 'b25-cde', valeurs: ['MTN6193-6035', 'MTN61936035', 'MTN6193-6036', 'MTN6193-6050', 'MTN6193-6052'], message: 'Cette référence correspond à une autre finition : la commande demandée est anthracite.' },
    ],
    explication: 'Actionneur MTN646991 (commander l’éclairage) × 1 ; commande MTN6193-6034 (commande les participants / modules) × 3 ; détecteur MTN6354-0019 (détecte la présence des personnes et régule l’éclairage en fonction de la lumière naturelle) × 3 ; alimentation MTN684032 (alimente le bus) × 1.',
  },
  {
    num: 35, label: 'B.2.6', partie: 2, type: 'valeur',
    enonce: '**Donner** la tension d’alimentation fournie par « l’alimentation bus KNX ».',
    competence: 'C1', points: 1, dtr: [21], pageSujet: 18,
    champs: [{ id: 'u', label: 'U =', unite: 'V', attendu: 30, tolerance: 0, acceptes: ['30 Vcc', '30 V DC', '30 VDC', '30 V continu'] }],
    aides: [
      'Ouvre le DTR 19 (alimentations de bus KNX), ligne « caractéristiques ».',
      'Ne confonds pas la tension du réseau qui alimente le module (entrée) et la tension qu’il fournit au bus (sortie).',
      'Forme de la réponse : U = … V, en précisant continu ou alternatif.',
    ],
    erreursTypiques: [
      { id: 'tension-reseau', champ: 'u', nombre: { valeur: 230, tolerance: 0 }, message: 'C’est la tension du réseau qui alimente le module (entrée) : on demande la tension fournie au bus.' },
    ],
    explication: 'U = 30 V continu (30 Vcc).',
  },
  {
    num: 36, label: 'B.2.7', partie: 2, type: 'valeur',
    enonce: '**Donner** la longueur de câblage maximale entre l’alimentation KNX et l’abonné au bus (capteur, bouton…).',
    competence: 'C1', points: 1, dtr: [23, 24], pageSujet: 18,
    champs: [{ id: 'l', label: 'L =', unite: 'm', attendu: 350, tolerance: 0, acceptes: ['< 350 m', '350 m maximum', 'max. 350 m'] }],
    indice: 'Tableau « Distances maximales » du DTR 22.',
    aides: [
      'Ouvre le DTR 22, tableau « Distances maximales » (le DTR 23 parle aussi des longueurs de ligne).',
      'Plusieurs distances sont données : choisis la ligne qui concerne une alimentation et un participant (abonné).',
      'Forme de la réponse : L < … m (valeur maximale).',
    ],
    erreursTypiques: [
      { id: 'segment', champ: 'l', nombre: { valeur: 1000, tolerance: 0 }, message: 'C’est la longueur maximale d’un segment de ligne, pas la distance entre l’alimentation et un participant.' },
      { id: 'deux-participants', champ: 'l', nombre: { valeur: 700, tolerance: 0 }, message: 'C’est la distance maximale entre deux participants.' },
    ],
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
    aides: [
      'Ouvre le DTR 22 (caractéristiques techniques des câbles bus KNX).',
      'La mise en situation impose un câble simple paire torsadée : deux références existent (simple ou double paire). La section se lit dans les caractéristiques techniques, en mm² (ne la confonds pas avec un diamètre).',
      'Forme de la réponse : référence « 0 492 … » ; section = …,… mm².',
    ],
    erreursTypiques: [
      { id: 'double-paire', champ: 'b28-ref', valeurs: ['0 492 92', '049292', '49292'], message: 'Cette référence est le câble double paire : le câble prévu est simple paire.' },
      { id: 'diametre', champ: 'b28-s', nombre: { valeur: 0.8, tolerance: 0 }, message: '0,8 mm est le diamètre du conducteur, pas sa section.' },
      { id: 'drain', champ: 'b28-s', nombre: { valeur: 0.4, tolerance: 0 }, message: 'C’est la section du fil de drain, pas celle des conducteurs de la paire.' },
    ],
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
    aides: [
      'Ouvre le DTR 23 (système d’adressage KNX) : adresse physique Z.L.P.',
      'Zone et ligne sont celles du tableau (1.1). Le coupleur de ligne porte un numéro de participant particulier (relis le DTR 23) ; les autres appareils prennent ensuite les premiers numéros libres, dans l’ordre du tableau. L’alimentation n’a pas d’adresse.',
      'Forme de la réponse : trois nombres séparés par des points, « 1.1.… », pour chaque appareil.',
    ],
    erreursTypiques: [
      { id: 'coupleur-zone', champ: 'b29-coupleur', valeurs: ['1.0.0'], message: '1.0.0 est l’adresse d’un coupleur de zone : ici, c’est un coupleur de ligne (relis le DTR 23).' },
      { id: 'coupleur-numero', champ: 'b29-coupleur', valeurs: ['1.1.1'], message: 'Le coupleur de ligne porte un numéro de participant réservé (DTR 23).' },
      { id: 'alim-adressee', champ: 'b29-act', valeurs: ['1.1.2'], message: 'L’alimentation n’a pas d’adresse physique : l’actionneur prend le premier numéro libre.' },
    ],
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
    aides: [
      'Relis le planning des équipes (semaines 17 et 18) : titre d’habilitation et disponibilité de chaque agent.',
      'Le symbole d’habilitation indique le rôle (norme NF C 18-510) : la lettre C autorise la consignation ; l’indice 2 désigne un chargé de travaux et l’indice 1 un exécutant. Vérifie aussi que la personne est libre pendant les travaux.',
      'Forme de la réponse : pour chaque ligne, un titre d’habilitation « B… » et le nom d’un agent disponible.',
    ],
    erreursTypiques: [
      { id: 'agent-occupe', champ: 'c1-b2v-nom', valeurs: ['Agent C'], message: 'Cet agent a le bon titre, mais il est pris sur un autre chantier pendant toute la période : regarde le planning.' },
      { id: 'br-consignation', champ: 'c1-bc-titre', valeurs: ['BR', 'B1V - BR'], message: 'Un BR ne consigne que pour ses propres interventions : ici, la consignation est faite pour d’autres intervenants.' },
      { id: 'executant', champ: 'c1-b2v-titre', valeurs: ['B1V'], message: 'L’indice 1 désigne un exécutant : le chargé de travaux porte un autre indice.' },
    ],
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
    aides: [
      'Relis le planning des semaines 17 et 18 et la mise en situation : 3 jours consécutifs (une rangée par jour), au moins deux électriciens.',
      'Cherche une période de 3 jours consécutifs où le plus grand nombre de personnes habilitées sont libres (case vide : ni chantier, ni RTT, ni CL, ni congés). Garde le chargé de consignation et le chargé de travaux de C.1, puis ajoute les exécutants disponibles.',
      'Forme de la réponse : une ligne par personne, dans l’ordre du planning : nom – habilitation – créneau de 3 jours.',
    ],
    erreursTypiques: [
      { id: 'vendredi-s18', champ: 'c2-1-dates', valeurs: ['S18 : mercredi, jeudi et vendredi'], message: 'Vérifie le vendredi de la semaine 18 : toute l’équipe n’est pas disponible ce jour-là.' },
      { id: 'semaine-17', champ: 'c2-2-dates', valeurs: ['S17 : lundi, mardi et mercredi', 'S17 : mardi, mercredi et jeudi', 'S17 : mercredi, jeudi et vendredi'], message: 'En semaine 17, cet agent est occupé : cherche un créneau où toute l’équipe est libre.' },
      { id: 'agent-conges', champ: 'c2-3-nom', valeurs: ['Agent H'], message: 'Regarde la semaine 18 de cet agent : il n’est pas disponible.' },
    ],
    explication: 'Agent A (BC), Agent B (B2V) et Agent G (B1V) : S18, mardi, mercredi et jeudi.',
  },
  {
    num: 41, label: 'C.3', partie: 3, type: 'redige',
    enonce: '**Indiquer** à partir de quelle opération le chargé de travaux peut faire commencer le remplacement des luminaires.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 21,
    motsCles: ['attestation', 'consignation', 'bc', 'charge de consignation', 'b2v', 'charge de travaux'], minMotsCles: 2, lignes: 3,
    corrige: 'Lorsque le chargé de consignation (BC) délivre l’attestation de consignation au chargé de travaux (B2V).',
    aides: [
      'Relis tes réponses de C.1 (qui consigne, qui dirige les travaux) et ton cours de prévention des risques électriques (NF C 18-510).',
      'Le chargé de travaux ne peut faire commencer le travail qu’après une opération précise qui atteste, par écrit, que l’ouvrage est consigné. Qui réalise cette opération, et à qui la remet-il ?',
      'Forme de la réponse : « Lorsque le chargé de … remet l’… de … au chargé de … ».',
    ],
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
    aides: [
      'Ouvre le DTR 37 (schéma unifilaire), folio 2 : cherche les départs de l’éclairage de l’atelier existant.',
      'Ne consigne que le départ de la rangée en travaux (les deux autres rangées doivent rester allumées) : ni le disjoncteur de tête, ni un départ d’un autre bâtiment. Respecte l’ordre rangée 1, puis 2, puis 3.',
      'Forme de la réponse : un repère d’appareil « Q… » par rangée, dans l’ordre.',
    ],
    erreursTypiques: [
      { id: 'q20', champ: 'c4-1', valeurs: ['Q20'], message: 'Cet appareil est en tête de toute l’installation existante : il couperait aussi les machines et les autres rangées.' },
      { id: 'q212', champ: 'c4-1', valeurs: ['Q212'], message: 'Cet appareil protège l’éclairage du nouveau bâtiment : les travaux concernent l’atelier existant (folio 2).' },
    ],
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
    aides: [
      'Revois ton cours de prévention des risques électriques (NF C 18-510) : les étapes de la consignation en basse tension.',
      'Pense à l’ordre logique : isoler l’ouvrage de ses sources, empêcher sa remise sous tension, reconnaître l’ouvrage sur lequel on va travailler, puis contrôler qu’il est hors tension. Associe à chaque étape l’objectif qui la décrit.',
      'Forme de la réponse : 4 lignes « nom de l’étape – objectif », dans l’ordre chronologique. Deux étapes de la liste ne font pas partie des quatre demandées.',
    ],
    erreursTypiques: [
      { id: 'vat-trop-tot', champ: 'c5-e3', valeurs: ['Vérification d’absence de tension (VAT)'], message: 'La vérification d’absence de tension se fait une fois l’ouvrage reconnu : revois l’ordre des étapes.' },
      { id: 'identification-trop-tot', champ: 'c5-e1', valeurs: ['Identification'], message: 'On ne peut pas identifier l’ouvrage consigné avant de l’avoir séparé et condamné : revois l’ordre des étapes.' },
    ],
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
    aides: [
      'Ouvre le DTR 25 (plan du centre d’usinage) : cherche le débit d’aspiration préconisé.',
      'Le débit est donné en m³/h ; une heure compte 60 minutes : divise par 60 pour l’avoir en m³/min.',
      'Forme de la réponse : Q = … m³/h, soit … m³/min.',
    ],
    erreursTypiques: [
      { id: 'm3-par-seconde', champ: 'qmin', nombre: { valeur: 2.78, tolerance: 0.05 }, message: 'Tu as divisé par 3 600 (m³/s) : une heure compte 60 minutes.' },
      { id: 'multiplie-60', champ: 'qmin', nombre: { valeur: 600000, tolerance: 100 }, message: 'Tu as multiplié par 60 : un débit par minute est plus petit qu’un débit par heure.' },
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
    aides: [
      'Ouvre le DTR 26 (documentation technique de la corroyeuse) : cherche le débit d’aspiration nécessaire.',
      'Le débit est donné en m³/h ; une heure compte 60 minutes : divise par 60 pour l’avoir en m³/min.',
      'Forme de la réponse : Q = … m³/h, soit … m³/min.',
    ],
    erreursTypiques: [
      { id: 'm3-par-seconde', champ: 'qmin', nombre: { valeur: 2.5, tolerance: 0.05 }, message: 'Tu as divisé par 3 600 (m³/s) : une heure compte 60 minutes.' },
      { id: 'multiplie-60', champ: 'qmin', nombre: { valeur: 540000, tolerance: 100 }, message: 'Tu as multiplié par 60 : un débit par minute est plus petit qu’un débit par heure.' },
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
    formuleSpec: F_DEBIT,
    aides: [
      'Reprends les deux débits en m³/min trouvés en D.1.1 et D.1.2.',
      'Pertes de charge nulles : le débit de l’installation est la somme des débits des deux machines, dans la même unité. Note Q₁ le débit du centre d’usinage et Q₂ celui de la corroyeuse.',
      'Forme de la réponse : Q = … + … = … m³/min.',
    ],
    erreursTypiques: [
      { id: 'm3-par-heure', nombre: { valeur: 19000, tolerance: 10 }, message: 'Tu as additionné les débits en m³/h : le résultat est demandé en m³/min.' },
    ],
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
    aides: [
      'Ouvre le DTR 27 (groupes d’aspiration GBV) : colonnes de débit V (m³/min) et pressions Pt (kgf/m²) dans le tableau.',
      'Convertis d’abord la dépression en kgf/m² (1 kgf/m² = 9,8 Pa : on divise les pascals par 9,8). Dans la colonne du débit juste supérieur ou égal au débit de l’installation (D.1.3), cherche la première turbine dont la pression Pt dépasse cette dépression minimale.',
      'Forme de la réponse : dépression = … / 9,8 = … kgf/m² ; turbine « GBV 0…… » ; justification : « à … m³/min, elle fournit … kgf/m² > … kgf/m² ».',
    ],
    erreursTypiques: [
      { id: 'multiplie-9-8', champ: 'd14-pt', nombre: { valeur: 37240, tolerance: 50 }, message: 'Tu as multiplié par 9,8 : pour passer des pascals aux kgf/m², il faut diviser.' },
      { id: 'pression-insuffisante', champ: 'd14-ref', valeurs: ['GBV 010020', 'GBV010020', '010020', 'GBV 009040', 'GBV009040'], message: 'À ce débit, cette turbine ne fournit pas une pression suffisante : compare Pt à la dépression minimale.' },
      { id: 'surdimensionnee', champ: 'd14-ref', valeurs: ['GBV 011220', 'GBV011220', 'GBV 011240', 'GBV011240'], message: 'Cette turbine convient mais elle est surdimensionnée : choisis la première qui satisfait les deux critères.' },
    ],
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
    aides: [
      'Ouvre le DTR 27 (puissance du moteur de la turbine choisie en D.1.4) et le DTR 28 (tableau des variateurs ATV340).',
      'Une forte surcharge au démarrage correspond au type de service « Heavy duty » (HD). Dans le DTR 28, cherche la ligne HD dont la puissance moteur correspond à celle de la turbine, puis lis la référence du variateur de ce bloc.',
      'Forme de la réponse : puissance = … kW ; service HD ou ND ; référence « ATV340……N4E ».',
    ],
    erreursTypiques: [
      { id: 'ligne-nd', champ: 'd21-ref', valeurs: ['ATV340D30N4E'], message: 'Tu as lu la puissance sur une ligne ND (faible surcharge) : pour une forte surcharge, lis une ligne HD.' },
      { id: 'service-nd', champ: 'd21-service', valeurs: ['ND (Normal duty, faible surcharge)'], message: 'La turbine occasionne une forte surcharge au démarrage : relis la définition des deux types de service (DTR 28).' },
    ],
    explication: 'Puissance moteur 37 kW ; HD (heavy duty) acceptant les fortes surcharges : ATV340D37N4E.',
  },
  {
    num: 49, label: 'D.2.2', partie: 4, type: 'redige',
    enonce: '**Proposer** et **justifier** le couplage permettant le raccordement des enroulements du moteur.',
    competence: 'C3', points: 1, dtr: [28], pageSujet: 23,
    motsCles: ['triangle', '400', '690'], minMotsCles: 2, lignes: 3,
    corrige: 'Alimentation 400 V ; moteur 400/690 V : couplage triangle.',
    indice: 'Comparer la tension du réseau à la plus petite tension de la plaque du moteur (DTR 27).',
    aides: [
      'Relis la plaque du moteur (DTR 27 : tensions 400 V / 690 V) et la tension entre phases du réseau qui alimente le variateur.',
      'Un enroulement supporte la plus petite tension de la plaque. En étoile, chaque enroulement reçoit U / √3 ; en triangle, il reçoit U (U : tension entre phases). Choisis le couplage qui donne à chaque enroulement la tension qu’il doit recevoir.',
      'Forme de la réponse : « Couplage … car le réseau est en … V et chaque enroulement supporte … V. »',
    ],
    erreursTypiques: [
      { id: 'etoile', valeurs: ['couplage étoile', 'couplage en étoile', 'couplage : étoile', 'étoile car', 'coupler en étoile'], message: 'En étoile, chaque enroulement ne recevrait que U / √3 : compare avec la tension qu’il doit recevoir (plus petite tension de la plaque).' },
    ],
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
    corrigeImage: { src: `corriges/scierie/q-d31-corrige.jpg`, alt: 'Schéma de commande de l’ATV340 — corrigé' },
    indice: 'Les entrées logiques DI sont actives lorsqu’elles reçoivent le +24 V : la sortie 24V du bornier alimente les communs de S1 et de S2.',
    aides: [
      'Ouvre le DTR 28, page du schéma du bloc de commande de l’ATV340 (bornier P24, 0V, DI1…DI8, 24V, 10V, AI1, COM).',
      'Les entrées logiques DI sont activées lorsqu’elles reçoivent le +24 V : la sortie 24 V du variateur alimente le commun de chaque commutateur, et chaque contact renvoie ce +24 V vers l’entrée qui correspond à sa fonction (marche avant, PV, GV : voir l’énoncé).',
      'Forme de la réponse : un trait de la sortie 24 V vers le commun de S1 et vers le commun de S2 ; un trait de la sortie de S1 vers l’entrée de marche avant ; un trait de chaque position de S2 vers l’entrée de la vitesse correspondante.',
    ],
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
    aides: [
      'Relis l’énoncé : vitesses demandées en PV et en GV, et nombre de pôles du moteur.',
      'Relation vitesse – fréquence : n = f / p, avec n en tours par seconde et p le nombre de PAIRES de pôles (4 pôles = 2 paires). Convertis les tr/min en tr/s (÷ 60), puis isole f.',
      'Forme de la réponse : f = n × p = (… / 60) × … = … Hz, pour chacune des deux vitesses.',
    ],
    erreursTypiques: [
      { id: 'poles-au-lieu-de-paires', champ: 'fpv', nombre: { valeur: 66.7, tolerance: 0.5 }, message: 'Tu as pris 4 pour p : p est le nombre de PAIRES de pôles.' },
      { id: 'tr-min', champ: 'fpv', nombre: { valeur: 2000, tolerance: 1 }, message: 'La vitesse doit être en tours par seconde : divise d’abord les tr/min par 60.' },
      { id: 'division-par-p', champ: 'fpv', nombre: { valeur: 8.33, tolerance: 0.1 }, message: 'Tu as divisé par p : isole f dans n = f / p.' },
    ],
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
    aides: [
      'Ouvre le DTR 28, page des vitesses présélectionnées (menu [Vitesses présél.]), et reprends tes fréquences de D.3.2.',
      'L’énoncé de D.3.1 associe la vitesse présélectionnée 2 à la petite vitesse et la vitesse présélectionnée 4 à la grande vitesse : règle chacune à la fréquence correspondante. Justifie par le menu du variateur et par ton calcul.',
      'Forme de la réponse : vitesse présél. 2 = … Hz ; vitesse présél. 4 = … Hz ; justification : « menu …, fréquence de la PV / de la GV calculée en D.3.2 ».',
    ],
    erreursTypiques: [
      { id: 'pv-gv-inversees', champ: 'd33-sp2', nombre: { valeur: 50, tolerance: 0.5 }, message: 'Tu as inversé les deux vitesses : relis quelle vitesse présélectionnée correspond à la petite vitesse (énoncé de D.3.1).' },
    ],
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
    formuleSpec: F_E1,
    aides: [
      'Relis le texte du bilan économique (temps de service, taux d’utilisation des machines, jours travaillés) et la puissance du moteur de la turbine (D.2.1).',
      'Sans variateur, la turbine tourne à pleine puissance dès qu’une machine fonctionne, c’est-à-dire pendant tout le temps d’utilisation du centre d’usinage (la corroyeuse tourne toujours en même temps que lui). Calcule la durée annuelle t : heures par semaine × nombre de semaines travaillées (5 jours ouvrés par semaine). Puis E = P × t.',
      'Forme de la réponse : t = … % × 30 h × … semaines = … h ; E = P × t = … kW × … h = … kWh/an.',
    ],
    erreursTypiques: [
      { id: 'temps-service-complet', nombre: { valeur: 49950, tolerance: 50 }, message: 'La turbine ne tourne que lorsqu’une machine fonctionne : prends le temps d’utilisation du centre d’usinage, pas tout le temps de service.' },
      { id: '52-semaines', nombre: { valeur: 46176, tolerance: 50 }, message: 'L’entreprise ne travaille pas 52 semaines : convertis les 225 jours travaillés en semaines de 5 jours.' },
      { id: 'jours-semaines', nombre: { valeur: 199800, tolerance: 100 }, message: 'Tu as multiplié des heures par semaine par un nombre de jours : convertis d’abord les jours travaillés en semaines.' },
    ],
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
    formuleSpec: F_E2,
    aides: [
      'Reprends les durées de D.4.1, la puissance du moteur et les fréquences PV / GV (D.3.2). L’énoncé admet que la consommation du moteur est proportionnelle à sa vitesse.',
      'Avec variateur : grande vitesse quand les deux machines tournent (temps de la corroyeuse), petite vitesse quand le centre d’usinage tourne seul (le reste de son temps). Puissance en PV = puissance en GV × (fréquence PV / fréquence GV). Énergie = énergie en PV + énergie en GV, avec des durées annuelles.',
      'Forme de la réponse : E = P_PV × t_PV + P_GV × t_GV (t : durées annuelles) = … × … + … × … = … kWh/an.',
    ],
    erreursTypiques: [
      { id: 'pv-tout-le-temps', nombre: { valeur: 26374, tolerance: 150 }, message: 'La grande vitesse sert quand les deux machines tournent : sépare le temps en PV et le temps en GV.' },
      { id: 'temps-pv-80', nombre: { valeur: 36364, tolerance: 150 }, message: 'Le centre d’usinage ne tourne seul que pendant une partie de son temps : retire le temps où la corroyeuse tourne aussi.' },
    ],
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
    formuleSpec: F_GAIN,
    aides: [
      'Reprends tes deux consommations annuelles (D.4.1 et D.4.2).',
      'Le gain est l’énergie économisée grâce au variateur : consommation sans variateur moins consommation avec variateur. Note E₁ (sans) et E₂ (avec).',
      'Forme de la réponse : Gain = … − … = … kWh/an.',
    ],
    erreursTypiques: [
      { id: 'inverse', nombre: { valeur: -10190, tolerance: 200 }, message: 'Ton gain est négatif : tu as inversé les deux consommations.' },
    ],
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
    formuleSpec: F_DUREE,
    aides: [
      'Reprends le gain annuel en kWh (D.4.3), le prix du kWh et le coût de l’installation du variateur (texte juste avant la question).',
      'Convertis d’abord le gain en euros par an (kWh × prix du kWh). La durée d’amortissement est le nombre d’années nécessaires pour que les économies remboursent l’investissement. Note C le coût, G le gain en kWh/an et p le prix du kWh.',
      'Forme de la réponse : gain annuel = … kWh × … €/kWh = … € ; durée = … € / … €/an = … ans.',
    ],
    erreursTypiques: [
      { id: 'gain-en-kwh', nombre: { valeur: 0.75, tolerance: 0.02 }, message: 'Tu as divisé un coût en euros par un gain en kWh : convertis d’abord le gain en euros.' },
      { id: 'rapport-inverse', nombre: { valeur: 0.333, tolerance: 0.01 }, message: 'Ton rapport est inversé : combien d’années faut-il pour rembourser le coût du variateur ?' },
    ],
    explication: 'Gain annuel : 10 190 × 0,25 = 2 547,5 €/an ; amortissement : 7 642,5 / 2 547,5 = 3 ans.',
  },
  {
    num: 57, label: 'D.4.5', partie: 4, type: 'redige',
    enonce: '**Déterminer** si l’option est en accord avec les critères économiques de la scierie.',
    competence: 'C3', points: 1, dtr: [], pageSujet: 25,
    motsCles: ['oui', '4 ans', '3 ans', 'inferieur', 'moins de'], minMotsCles: 2, lignes: 3,
    corrige: 'Oui, car la scierie souhaite amortir l’aspiration en 4 ans au maximum et l’option est amortie en 3 ans.',
    aides: [
      'Relis la mise en situation de la partie D : critère d’amortissement souhaité par la scierie.',
      'Compare la durée d’amortissement calculée en D.4.4 à la durée maximale acceptée par la scierie.',
      'Forme de la réponse : « Oui / Non, car l’option est amortie en … ans, ce qui est … aux … ans demandés. »',
    ],
    erreursTypiques: [
      { id: 'non', valeurs: ['non,', 'non car', 'non elle', 'non l’option', 'non, l’option', 'pas en accord', 'n’est pas en accord'], message: 'Compare ta durée d’amortissement (D.4.4) à la durée maximale fixée par la scierie dans la mise en situation.' },
    ],
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
    aides: [
      'Ouvre le DTR 30 : disque solaire et tableau de synthèse des rendements PV selon l’inclinaison et l’orientation.',
      'Cherche dans le tableau (ou au centre de la zone la plus claire du disque) la case où le rendement est maximal, puis lis son orientation et son inclinaison.',
      'Forme de la réponse : orientation = un point cardinal ; inclinaison = … °.',
    ],
    erreursTypiques: [
      { id: 'inclinaison-toit', champ: 'e11-incl', nombre: { valeur: 15, tolerance: 0 }, message: 'C’est l’inclinaison du toit de l’extension : on demande l’inclinaison optimale d’après le DTR 30.' },
    ],
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
    aides: [
      'Ouvre le DTR 29 (plans de l’extension) : orientation du pan de toiture et angle d’inclinaison. Compare avec E.1.1.',
      'Relève l’orientation et l’inclinaison RÉELLES du toit, puis compare chacune à la valeur optimale trouvée en E.1.1 : identique = optimale, sinon non optimale.',
      'Forme de la réponse : orientation = … (optimale / non optimale) ; inclinaison = … ° (optimale / non optimale).',
    ],
    erreursTypiques: [
      { id: 'inclinaison-optimale', champ: 'e12-incl', nombre: { valeur: 30, tolerance: 0 }, message: 'C’est l’inclinaison optimale (E.1.1) : on demande l’inclinaison réelle du toit, lue sur le plan.' },
      { id: 'validation-inclinaison', champ: 'e12-incl-v', valeurs: ['Optimale'], message: 'Compare l’inclinaison du toit à l’inclinaison optimale trouvée en E.1.1 : sont-elles égales ?' },
    ],
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
    aides: [
      'Utilise le disque solaire (DTR 30) reproduit dans la question, et l’orientation et l’inclinaison du toit relevées en E.1.2.',
      'Le centre du disque correspond à une inclinaison nulle ; chaque cercle ajoute 10° d’inclinaison. Pars du centre dans la direction de l’orientation du toit et arrête-toi à son inclinaison. La teinte de la zone où tombe la croix donne le rendement (échelle à droite du disque).',
      'Forme de la réponse : une seule croix ; rendement = plage « … à … % » lue sur l’échelle ; viabilité : oui ou non.',
    ],
    erreursTypiques: [
      { id: 'non-viable', champ: 'viabilite', valeurs: ['non'], message: 'Regarde le rendement que tu as lu sur le disque : est-il proche du maximum possible ?' },
    ],
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
    aides: [
      'Ouvre le DTR 29 (plans de l’extension, cotes en cm). La formule de Ls est donnée dans l’énoncé.',
      'Longueur et largeur du toit = dimensions de l’extension, en mètres. Dans Ls = √(2,3² + (L/2)²), on prend L/2 car le pan sud ne couvre que la moitié de la largeur. Arrondis Ls à l’unité AVANT de calculer la surface (longueur × Ls).',
      'Forme de la réponse : longueur = … m ; L = …,… m ; Ls = √(2,3² + (… / 2)²) ≈ … m ; surface = … × … = … m².',
    ],
    erreursTypiques: [
      { id: 'l-entier', champ: 'e21-ls', nombre: { valeur: 15, tolerance: 0.4 }, message: 'Tu as pris L au lieu de L / 2 dans la formule de Ls.' },
      { id: 'toute-la-toiture', champ: 'e21-s', nombre: { valeur: 532, tolerance: 1 }, message: 'Tu as calculé la surface au sol de toute l’extension : on demande seulement le pan sud (longueur × Ls).' },
      { id: 'ls-non-arrondi', champ: 'e21-s', nombre: { valeur: 277.9, tolerance: 0.6 }, message: 'Arrondis Ls à l’unité avant de calculer la surface (consigne de l’énoncé).' },
    ],
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
    aides: [
      'Ouvre le DTR 33, deuxième page (caractéristiques mécaniques du module BBO 510).',
      'Relève les dimensions du module et celles d’une cellule. Surface d’une cellule = longueur × largeur (en m) ; surface efficace d’un panneau = surface d’une cellule × nombre de demi-cellules. Respecte les arrondis demandés.',
      'Forme de la réponse : dimensions en mm ; cellule « 0,… × 0,… » m ; Scellule = 0,0… m² (4 chiffres après la virgule) ; S = … × 132 = …,… m² (3 chiffres après la virgule).',
    ],
    erreursTypiques: [
      { id: 'mm2', champ: 'e221-sc', nombre: { valeur: 16562, tolerance: 5 }, message: 'Ta surface est en mm² : convertis les dimensions en mètres avant de multiplier.' },
      { id: 'surface-hors-tout', champ: 'e221-s', nombre: { valeur: 2.375, tolerance: 0.005 }, message: 'Tu as calculé la surface hors tout du module : la surface efficace est celle des cellules.' },
    ],
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
    aides: [
      'Utilise la longueur du toit (E.2.1), la largeur d’un panneau (E.2.2.1) et l’espacement de fixation donné dans le texte ; la formule est dans l’énoncé.',
      'En position portrait, c’est la largeur du panneau qui s’aligne le long de la ligne. Convertis tout en mètres (2 cm = 0,02 m). Arrondis ensuite à l’entier inférieur (on ne pose pas un morceau de panneau), puis multiplie par le nombre de lignes.',
      'Forme de la réponse : N = … / (… + …) = …,… ; arrondi = … panneaux par ligne ; total = … × … = … panneaux.',
    ],
    erreursTypiques: [
      { id: 'paysage', champ: 'e222-n', nombre: { valeur: 16.56, tolerance: 0.05 }, message: 'En portrait, c’est la largeur du panneau (et non sa longueur) qui s’aligne le long du toit.' },
      { id: 'cm-non-converti', champ: 'e222-n', nombre: { valeur: 11.17, tolerance: 0.05 }, message: 'L’espacement doit être converti en mètres (2 cm = 0,02 m).' },
      { id: 'arrondi-exces', champ: 'e222-arrondi', nombre: { valeur: 31, tolerance: 0 }, message: 'On ne peut pas poser un panneau incomplet : arrondis à l’entier inférieur.' },
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
    aides: [
      'Ouvre le DTR 31 (évaluation du potentiel solaire local, CalSol) : irradiation annuelle sur le plan incliné. Reprends la surface efficace d’un panneau (E.2.2.1) et le nombre de panneaux (E.2.2.2).',
      'Prends l’irradiation GLOBALE sur le plan INCLINÉ (IGP), colonne « année ». Surface totale = nombre de panneaux × surface efficace d’un panneau. Les rendements s’écrivent en nombre décimal (%, divisé par 100). Production = produit des quatre grandeurs.',
      'Forme de la réponse : IGP = … kWh/m²/an ; S = … × … = …,… m² ; rendements en décimal (0,…) ; production = … × … × … × … = … kWh.',
    ],
    erreursTypiques: [
      { id: 'igh', champ: 'e23-igp', nombre: { valeur: 1153, tolerance: 0 }, message: 'Tu as pris l’irradiation sur un plan horizontal (IGH) : les panneaux sont inclinés.' },
      { id: 'pourcentage', champ: 'e23-ro', nombre: { valeur: 98, tolerance: 0 }, message: 'Convertis le pourcentage en nombre décimal.' },
      { id: 'production-igh', champ: 'e23-prod', nombre: { valeur: 47795, tolerance: 300 }, message: 'Ta production est calculée avec l’irradiation sur un plan horizontal : utilise celle du plan incliné.' },
    ],
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
    aides: [
      'Ouvre le DTR 32 (facture 2022 de la scierie) : ligne TOTAL. Reprends la production calculée en E.2.3.',
      '18 % de la consommation = consommation × 0,18. Compare ensuite la production PV à cette valeur : le projet est envisageable si la production atteint au moins 18 % de la consommation.',
      'Forme de la réponse : consommation = … kWh ; 18 % = … kWh ; position : inférieure / égale / supérieure ; conclusion : oui ou non.',
    ],
    erreursTypiques: [
      { id: 'fois-18', champ: 'e24-18', nombre: { valeur: 5018652, tolerance: 100 }, message: 'Tu as multiplié par 18 au lieu de prendre 18 % (× 0,18).' },
      { id: 'euros', champ: 'e24-conso', nombre: { valeur: 44273.74, tolerance: 1 }, message: 'C’est le coût total en euros : on demande la consommation en kWh.' },
      { id: 'position', champ: 'e24-pos', valeurs: ['Inférieure à 18 %'], message: 'Compare de nouveau ta production (E.2.3) et les 18 % de la consommation : laquelle est la plus grande ?' },
    ],
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
    aides: [
      'Ouvre le DTR 33, tableau « Caractéristiques électriques sous NOCT ».',
      'Lis la colonne du module BBO 510 (pas 500), dans le tableau NOCT (pas dans les conditions STC). Ne confonds pas courant de court-circuit et courant au point de puissance maximale, ni tension en circuit ouvert et tension au point de puissance maximale.',
      'Forme de la réponse : puissance en W ; courants en A (2 décimales) ; tensions en V (1 décimale).',
    ],
    erreursTypiques: [
      { id: 'stc', champ: 'e31-p', nombre: { valeur: 510, tolerance: 0 }, message: '510 W est la puissance en conditions STC : on demande les valeurs NOCT.' },
      { id: 'bbo-500', champ: 'e31-p', nombre: { valeur: 378, tolerance: 0 }, message: 'Tu as lu la colonne du module BBO 500.' },
      { id: 'icc-impp', champ: 'e31-icc', nombre: { valeur: 10.78, tolerance: 0 }, message: 'Tu as confondu le courant de court-circuit et le courant au point de puissance maximale.' },
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
      { cellules: ['Calcul de −Δv', appli('e32-calc', '−Δv = …')] },
      { cellules: ['Δv (V)', num('e32-dv', 2.98, 0.02, ['-2,98', '-2,98 V'])] },
      { cellules: ['U MPPT « 75 °C » = U MPPT « NOCT » − Δv (V)', num('e32-u75', 32.82, 0.02)] },
      { cellules: ['P « 75 °C » (W)', num('e32-p75', 353.8, 0.5)] },
    ],
    indice: 'β = −0,26 %/°C (caractéristiques thermiques, DTR 33) ; T1 = 43 °C (NOCT), T2 = 75 °C.',
    aides: [
      'Ouvre le DTR 33 (caractéristiques thermiques : coefficient β de la tension) et reprends U MPPT NOCT (E.3.1).',
      'β est en %/°C : divise-le par 100. T1 = température NOCT, T2 = température du panneau. La tension baisse quand la température monte : U MPPT à 75 °C = U MPPT NOCT − Δv. Avec I MPPT constant, P = U × I.',
      'Forme de la réponse : −Δv = β × U MPPT × (T2 − T1) = −0,00… × … × (… − …) = … V ; U MPPT 75 °C = … − … = …,… V ; P = … × … = …,… W.',
    ],
    erreursTypiques: [
      { id: 'beta-pourcent', champ: 'e32-dv', nombre: { valeur: 297.9, tolerance: 1 }, message: 'Le coefficient β est en % par °C : divise-le par 100.' },
      { id: 't1-stc', champ: 'e32-dv', nombre: { valeur: 4.65, tolerance: 0.02 }, message: 'T1 est la température NOCT indiquée dans le tableau, pas 25 °C (conditions STC).' },
      { id: 'delta-ajoute', champ: 'e32-u75', nombre: { valeur: 38.78, tolerance: 0.02 }, message: 'La tension diminue quand la température augmente : retranche Δv.' },
    ],
    explication: '−Δv = −0,0026 × 35,8 × (75 − 43) = −2,98 V ; U MPPT 75 °C = 35,8 − 2,98 = 32,82 V ; P 75 °C = 32,82 × 10,78 = 353,8 W.',
  },
  {
    num: 68, label: 'E.3.3.1', partie: 5, type: 'valeur',
    enonce: 'Rendement de la chaîne de production solaire et quantification matérielle. Pour cette gamme d’onduleur, **donner** le rendement maximum.',
    contexte: 'Pour notre installation on choisira un onduleur de la marque Fronius. Il sera sélectionné dans la gamme des modèles SYMO 10 à SYMO 15.',
    competence: 'C1', points: 1, dtr: [41], pageSujet: 31,
    champs: [{ id: 'eta', label: 'ηMax :', unite: '%', attendu: 98, tolerance: 0.1, acceptes: ['0,98'] }],
    aides: [
      'Ouvre le DTR 34, deuxième page (rendements des onduleurs SYMO).',
      'Plusieurs rendements sont donnés (maximal, européen, à charge partielle) : on demande le rendement MAXIMAL de la gamme SYMO 10 à 15 (attention, il n’est pas le même pour toutes les colonnes).',
      'Forme de la réponse : ηMax = …,… %.',
    ],
    erreursTypiques: [
      { id: 'rendement-europeen', champ: 'eta', nombre: { valeur: 97.6, tolerance: 0.05 }, message: 'C’est le rendement européen : on demande le rendement maximal.' },
    ],
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
    formuleSpec: F_PFIN,
    aides: [
      'Reprends la puissance NOCT du panneau (énoncé) et le rendement maximal de l’onduleur (E.3.3.1).',
      'L’onduleur transmet au réseau la puissance qu’il reçoit diminuée de ses pertes : puissance de sortie = puissance d’entrée × rendement (en décimal). Note P_NOCT la puissance du panneau et η le rendement.',
      'Forme de la réponse : P finale = … × 0,… = …,… W.',
    ],
    erreursTypiques: [
      { id: 'division', nombre: { valeur: 393.88, tolerance: 0.5 }, message: 'Tu as divisé par le rendement : les pertes de l’onduleur diminuent la puissance.' },
      { id: 'rendement-pourcent', nombre: { valeur: 37828, tolerance: 10 }, message: 'Le rendement doit être écrit en décimal (et non en %).' },
    ],
    explication: 'P finale = 386 × 0,98 = 378,28 W.',
  },
  {
    num: 70, label: 'E.3.4.1.1', partie: 5, type: 'tableau',
    enonce: 'Dimensionnement des onduleurs. **Calculer** la puissance injectée sur le réseau par un string composé de 30 panneaux BBO 510 et **calculer** les tensions minimum et maximum aux bornes de ce dernier côté DC, sachant qu’ils seront connectés en série.',
    contexte: 'Structure finale du système de production solaire. L’installation sera composée de 90 panneaux BISOL BBO 510 répartis en trois lignes de 30 modules raccordés à 3 onduleurs indépendants connectés au réseau triphasé.',
    competence: 'C3', points: 2, dtr: [38], pageSujet: 31,
    colonnes: ['Grandeur à calculer', 'Calculs', 'Résultats'],
    lignes: [
      { cellules: ['Puissance injectée (kW)', appli('e3411-p-calc', 'Calcul…'), num('e3411-p', 11.348, 0.03, ['11 348 W', '11348 W'])] },
      { cellules: ['Tension MPPT « NOCT » côté DC (V)', appli('e3411-u-calc', 'Calcul…'), num('e3411-u', 1074, 1)] },
      { cellules: ['Tension minimum « NOCT » à 75 °C côté DC (V)', appli('e3411-umin-calc', 'Calcul…'), num('e3411-umin', 984.6, 1)] },
    ],
    aides: [
      'Reprends la puissance finale d’un panneau (E.3.3.2), U MPPT NOCT (E.3.1) et U MPPT à 75 °C (E.3.2).',
      'En série, les puissances s’additionnent et les tensions aussi : multiplie la valeur d’un panneau par le nombre de panneaux du string. La tension minimum correspond à la température la plus haute (75 °C).',
      'Forme de la réponse : P = … × … = … kW ; U MPPT = … × … = … V ; U min = … × … = …,… V.',
    ],
    erreursTypiques: [
      { id: 'p-noct', champ: 'e3411-p', nombre: { valeur: 11.58, tolerance: 0.03 }, message: 'Tu as pris la puissance NOCT du panneau : la puissance injectée tient compte du rendement de l’onduleur (E.3.3.2).' },
      { id: 'p-stc', champ: 'e3411-p', nombre: { valeur: 15.3, tolerance: 0.03 }, message: 'Tu as pris la puissance crête STC du panneau : utilise la puissance finale « côté réseau ».' },
      { id: 'uco', champ: 'e3411-u', nombre: { valeur: 1308, tolerance: 1 }, message: 'Tu as utilisé la tension en circuit ouvert : on demande la tension au point de puissance maximale.' },
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
    aides: [
      'Ouvre le DTR 34 (caractéristiques techniques Fronius SYMO) et reprends la puissance injectée par un string (E.3.4.1.1).',
      'Choisis l’onduleur dont la puissance de sortie nominale est juste supérieure à la puissance injectée par un string. Relève ensuite dans SA colonne : puissance crête max du générateur, puissance de sortie, plage de tension MPP, courant d’entrée max utilisable, tensions d’entrée min et max, nombre de trackers.',
      'Forme de la réponse : référence « SYMO …-3-M » ; puissances en kWc / kW ; plage « … – … V » ; courant en A ; tensions en V ; nombre de trackers.',
    ],
    erreursTypiques: [
      { id: 'symo-10', champ: 'e3412-ref', valeurs: ['SYMO 10.0-3-M', 'SYMO 10-3-M', 'SYMO 10,0-3-M', 'Fronius SYMO 10.0-3-M'], message: 'La puissance de sortie de cet onduleur est inférieure à la puissance injectée par un string.' },
      { id: 'plage-autre-modele', champ: 'e3412-mpp', valeurs: plage(270, 800), message: 'Cette plage de tension MPP est celle d’un autre modèle : lis la colonne de l’onduleur choisi.' },
      { id: 'courant-un-tracker', champ: 'e3412-i', nombre: { valeur: 27, tolerance: 0 }, message: 'C’est le courant d’entrée max d’un seul tracker : on demande le courant d’entrée max utilisable (total).' },
    ],
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
      { cellules: ['Tension aux bornes du string (conditions NOCT) (V)', appli('e342-u-calc', 'Calcul…'), num('e342-u', 537, 1)] },
      { cellules: ['Plage de tension de fonctionnement en mode MPPT', '', txt('e342-mpp', plage(320, 800))] },
      { cellules: ['Courant maximum de l’onduleur (A)', '', num('e342-imax', 43.5, 0)] },
      { cellules: ['Courant total des strings (A)', appli('e342-i-calc', 'Calcul…'), num('e342-i', 21.56, 0.05)] },
      { cellules: ['Compatibilité avec les entrées DC de l’onduleur (oui/non)', '', choix('e342-ok', OUI_NON, 'oui')] },
    ],
    aides: [
      'Relis le texte : deux strings de 15 panneaux connectés en parallèle en entrée d’onduleur. Reprends U MPP et I MPP d’un panneau (E.3.1) et les caractéristiques de l’onduleur (E.3.4.1.2).',
      'Pour un string, demande-toi si ses panneaux partagent le même courant ou la même tension, et déduis-en la tension du string. Les deux strings raccordés en parallèle additionnent leurs courants. Vérifie enfin que la tension est dans la plage MPPT et que le courant total ne dépasse pas le courant maximal de l’onduleur.',
      'Forme de la réponse : type de câblage ; U = … × … = … V ; plage MPPT « … – … V » ; courant maximal = … A ; courant total = … × … = …,… A ; compatibilité : oui ou non.',
    ],
    erreursTypiques: [
      { id: 'parallele', champ: 'e342-type', valeurs: ['Parallèle'], message: 'Si les panneaux d’un string étaient en parallèle, la tension du string resterait celle d’un seul panneau : relis ton calcul de tension.' },
      { id: 'trente-panneaux', champ: 'e342-u', nombre: { valeur: 1074, tolerance: 1 }, message: 'Tu as compté tous les panneaux de la ligne : un string en compte 15.' },
      { id: 'un-string', champ: 'e342-i', nombre: { valeur: 10.78, tolerance: 0.05 }, message: 'Tu n’as compté qu’un seul string : les deux strings en parallèle additionnent leurs courants.' },
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
    corrigeImage: { src: `corriges/scierie/q-e343-corrige.jpg`, alt: 'Schéma de câblage côté DC — corrigé proposé' },
    indice: 'DTR 35, onduleur Multi MPP Tracker : une chaîne par entrée DC+ (DC+1, DC+2) ; les bornes DC− sont reliées en interne. Dans une chaîne, le − d’un panneau va au + du suivant.',
    aides: [
      'Ouvre le DTR 35 (câblage des strings PV) : raccordement d’un onduleur à plusieurs MPP trackers.',
      'Dans chaque demi-string, relie les panneaux en série : le − d’un panneau va au + du suivant. Chaque demi-string arrive sur sa propre entrée DC+ (un tracker par demi-string) ; les bornes DC− sont communes.',
      'Forme de la réponse : dans chaque demi-string, deux liaisons entre panneaux ; le + libre du premier panneau vers une entrée DC+ ; le − libre du dernier panneau vers le DC−.',
    ],
    explication: 'Corrigé proposé (page du corrigé vierge) d’après le DTR 35 : chaque demi-string en série (− d’un panneau vers + du suivant) ; demi-string 1 : + → DC+1, − → DC− ; demi-string 2 : + → DC+2, − → DC− (bornes DC− indifférentes). MPP Tracker 2 sur ON (E.4.1).',
  },
  {
    num: 74, label: 'E.4.1', partie: 5, type: 'cocher',
    enonce: 'Paramétrage de l’onduleur. Paramétrage de la fonction « tracker ». Compte tenu du choix de câblage de l’entrée DC, **sélectionner (par une croix)** la configuration de la fonction « Tracker 2 » qui convient.',
    contexte: 'Fonction MPPT TRACKER 2.',
    competence: 'C6', points: 1, dtr: [42], pageSujet: 34,
    options: ['ON', 'OFF'], bonnes: [0],
    indice: 'DTR 35 : raccordement de deux champs de modules sur les deux entrées MPP Tracker (DC+1 / DC+2).',
    aides: [
      'Ouvre le DTR 35 (raccordement de deux champs de modules sur les entrées MPP tracker) et reprends ton schéma E.3.4.3.',
      'Le tracker 2 doit être activé lorsque la seconde entrée DC+ reçoit son propre champ de modules (fonctionnement multi-tracker) ; il reste désactivé si tous les modules arrivent sur la même entrée.',
      'Forme de la réponse : une seule case cochée (ON ou OFF).',
    ],
    erreursTypiques: [
      { id: 'tracker-off', valeurs: ['OFF'], message: 'Relis ton schéma E.3.4.3 : combien d’entrées DC+ différentes reçoivent un demi-string ?' },
    ],
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
    aides: [
      'Ouvre le DTR 36 (paramétrage du data manager) et le DTR 32 (tarifs d’achat de la production et prix de référence de l’électricité).',
      'Onglet 1 : nom = nom de l’entreprise suivi du rang de l’onduleur dans la chaîne ; taux de rémunération = vente du SURPLUS pour la tranche de puissance de l’installation ; coût d’achat = prix de référence du client vert A5 de type « moyen », converti de €/MWh en €/kWh (÷ 1 000) ; fuseau horaire = continent / ville. Onglet 2 : type et nom de l’onduleur choisi en E.3.4.1.2.',
      'Forme de la réponse : nom « SYLVA-n » ; taux en €/kWh (4 décimales) ; coût en €/kWh (3 décimales) ; continent / ville ; type « SYM …-3-M » ; nom « SYM …-3-M (n) » ; PV[Wp] : un nombre.',
    ],
    erreursTypiques: [
      { id: 'vente-totale', champ: 'taux', valeurs: ['0,1458', '0,1458 €/kWh', '0,1458 €'], message: 'C’est le tarif de vente TOTALE : la scierie ne vend que son surplus.' },
      { id: 'mwh', champ: 'achat', valeurs: ['135', '135 €', '135 €/MWh'], message: 'Le prix de référence est donné en €/MWh : convertis-le en €/kWh.' },
      { id: 'saisonnalise', champ: 'achat', valeurs: ['0,152', '0,152 €/kWh', '0,152 €'], message: 'Tu as lu la colonne du client « saisonnalisé » : la scierie est un client type « moyen ».' },
    ],
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
    aides: [
      'Relis l’ensemble du sujet : alimentation (A), éclairage (B), aspiration (D), photovoltaïque (E). Pour chaque partie, repère ce qui consomme de l’énergie.',
      'Pour chaque poste, demande-toi comment consommer moins (commande, régulation, technologie plus efficace), comment récupérer l’énergie perdue et comment mieux utiliser l’énergie produite sur place. Pense aussi au bâtiment lui-même et au suivi des consommations.',
      'Forme de la réponse : une liste de propositions courtes, une par ligne, chacune avec l’équipement concerné et le gain attendu (« Sur …, installer … pour … »).',
    ],
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
