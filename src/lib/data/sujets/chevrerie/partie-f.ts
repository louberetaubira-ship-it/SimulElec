/**
 * Sujet « Chèvrerie » — PARTIE F : dimensionnement de l’installation d’eau chaude sanitaire et
 * préparation des travaux (41 points, pages 36 à 40 du sujet, DTR 35 à 39).
 *
 * Barème : le corrigé officiel ne détaille pas les points par question (seul le total de la
 * partie, 41 points, est imprimé) ; la répartition ci-dessous est proposée pour tomber juste.
 * Valeurs attendues : corrigé officiel (F.4.1 et F.4.2 sont laissés vides au corrigé : valeurs
 * recalculées à partir des devis DTR 38 / DTR 39 et des réponses F.2.3 / F.3.3, et cohérentes
 * avec les droites tracées au corrigé de F.4.3).
 */
import type { FormuleSpec, SujetPartie } from '@/lib/sujet/types';
import { IMG, num, txt, formule, appli, champNum, champTxt, ref, pageDtr, type QuestionSansNum } from './commun';

export const PARTIE_F: SujetPartie = {
  num: 6,
  titre: 'Dimensionnement de l’installation d’eau chaude sanitaire et préparation des travaux',
  objectifs: [
    'Calculer le besoin en eau chaude sanitaire (ECS).',
    'Évaluer deux solutions de production d’ECS.',
    'Choisir le matériel le plus rentable.',
  ],
  competences: ['C1', 'C3', 'C10'],
  situation:
    'Avec le double objectif d’une économie d’énergie et d’une démarche de développement durable, la chèvrerie envisage '
    + 'l’installation d’un chauffe-eau thermodynamique. Pour être certaine de la pertinence de ce projet, elle souhaite faire '
    + 'réaliser une pré-étude pour évaluer les impacts en termes de projection de production et de retour financier par '
    + 'rapport à un chauffe-eau classique.',
  dtrPages: [pageDtr(35), pageDtr(36), pageDtr(37), pageDtr(38), pageDtr(39)],
};

/* ───────────────────────────── Formules ───────────────────────────── */

/** F.1 : quantité d’eau chaude à fournir pour obtenir un volume d’eau mélangée à T_EM. */
const SPEC_QEC: FormuleSpec = {
  attendues: ['Q_{EM}\\times\\frac{T_{EM}-T_{EF}}{T_{EC}-T_{EF}}'],
  membreGauche: ['Q_{EC}', 'Q_{EC40}', 'Q_{EC55}', 'Q_{EC_{40}}', 'Q_{EC_{55}}', 'QEC'],
  variables: {
    'Q_{EM}': { min: 50, max: 500 },
    'T_{EM}': { min: 30, max: 55 },
    'T_{EF}': { min: 5, max: 15 },
    'T_{EC}': { min: 58, max: 75 },
  },
  affichage: 'Q_EC = Q_EM × (T_EM − T_EF) / (T_EC − T_EF)',
};

/** Énergie annuelle : puissance × heures de fonctionnement par an (temps journalier × 320 jours). */
const specEnergie = (pMin: number, pMax: number): FormuleSpec => ({
  attendues: ['P\\times t', 'P\\times t_{j}\\times N_{j}'],
  membreGauche: ['W', 'E', 'W_{an}', 'E_{an}', 'W_{a}', 'E_{a}'],
  // N_j fixé à 320 jours : « P × t_j × 320 » est accepté comme « P × t_j × N_j ».
  variables: { P: { min: pMin, max: pMax }, 't_{j}': { min: 1, max: 8 }, 'N_{j}': { min: 320, max: 320 } },
  // t : heures de fonctionnement par an ; h accepté comme durée.
  derivees: { t: 't_{j}\\times N_{j}', h: 't_{j}\\times N_{j}', 't_{an}': 't_{j}\\times N_{j}' },
  affichage: 'W = P × t (t = temps de chauffe journalier × 320 jours)',
});

/** Coût annuel : énergie × prix du kWh. */
const SPEC_COUT: FormuleSpec = {
  attendues: ['W\\times p', 'W\\times P_{kWh}'],
  membreGauche: ['C', 'C_{an}', 'C_{a}', 'C_{annuel}'],
  variables: { W: { min: 100, max: 10000 }, p: { min: 0.1, max: 0.4 } },
  derivees: { 'P_{kWh}': 'p', 'p_{kWh}': 'p', 'P_{u}': 'p' },
  affichage: 'C = W × prix du kWh',
};

/** Coût total sur 5 ans : coût de l’installation + 5 × coût énergétique annuel. */
const SPEC_COUT_5ANS: FormuleSpec = {
  attendues: ['C_{i}+5\\times C_{an}', 'C_{i}+n\\times C_{an}'],
  membreGauche: ['C_{5}', 'C_{T}', 'C_{tot}', 'C_{total}', 'C'],
  variables: { 'C_{i}': { min: 500, max: 6000 }, 'C_{an}': { min: 50, max: 2000 }, n: { min: 5, max: 5 } },
  derivees: { 'C_{a}': 'C_{an}', 'C_{inst}': 'C_{i}', 'C_{sol}': 'C_{i}' },
  affichage: 'C_5 = C_installation + 5 × C_annuel',
};

/* ───────────────────────────── F.4.3 : graphique ───────────────────────────── */

/**
 * Graphique recadré (740 × 500 px, depuis la page 39 du sujet). Repérage mesuré au pixel :
 * origine (0 an ; 0 €) en (68 ; 459,5), 1 an = 84,57 px, 1 000 € = 48,69 px (9 000 € en haut).
 */
const GRAPH = { w: 740, h: 500 };
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const gx = (annees: number) => r4((68 + annees * 84.57) / GRAPH.w);
const gy = (euros: number) => r4((459.5 - (euros / 1000) * 48.69) / GRAPH.h);

/** Coûts cumulés (corrigé) : accumulation 1 571,54 + 1 250,73 × n ; thermodynamique 4 546,75 + 162,13 × n. */
const ACCU = (n: number) => 1571.54 + 1250.73 * n;
const THERMO = (n: number) => 4546.75 + 162.13 * n;

/* ───────────────────────────── F.5.3 : personnel ───────────────────────────── */

const nom = (prenom: string, famille: string) => [
  `${famille} ${prenom}`, `${prenom} ${famille}`, `${famille} ${prenom[0]}.`, `${prenom[0]}. ${famille}`,
  `${famille} ${prenom[0]}`, ...(famille === 'DURAND' ? [] : [famille]),
];
const HAB_B1V = ['B1V', 'B1 et B1V', 'B1-B1V', 'B1 - B1V', 'B1/B1V', 'B1, B1V', 'B1 B1V', 'B1 + B1V', 'B1V et B1'];
const HAB_B1V_BR = [...HAB_B1V, 'B1V - BR', 'B1V-BR', 'B1V – BR', 'B1V BR', 'B1V et BR', 'B1V/BR'];

const LISTING = {
  titre: 'Listing à jour des habilités au sein de l’entreprise DURAND',
  colonnes: ['Noms', 'Habilitation'],
  lignes: [
    ['DURAND Roger', 'B1V - BR'],
    ['DURAND Julien', 'B0'],
    ['JEANNET Patrick', 'B1V'],
    ['JILLE Xavier', 'B1V – BR'],
    ['RENNY Guillaume', 'B1V - BR'],
    ['JOURDIN Emeric', ''],
    ['RIBOULEAU Marc', 'BR'],
    ['TARIX Estéban', 'B1V'],
  ],
};

const SITUATION_F5 =
  'Les travaux sont prévus pendant la période de tarissement. En effet, durant cette période, les chèvres ne produisent plus '
  + 'de lait, la fromagerie ne fonctionne plus et les propriétaires en profitent pour prendre leurs vacances. L’armoire '
  + 'électrique qui permet d’alimenter le nouveau système de production d’ECS a déjà été mise en service. Tous les départs '
  + 'sont sous tension. Suite à la dernière réunion de chantier, l’installation du système thermodynamique est à réaliser. '
  + 'À noter que le matériel est déjà installé dans le tableau, c’est-à-dire un interrupteur différentiel dédié et deux '
  + 'disjoncteurs divisionnaires (un départ pour le groupe intérieur et un autre pour le groupe extérieur). Votre entreprise '
  + 'd’électricité est chargée de réaliser la consignation et de gérer les travaux d’ordre électrique réalisés par '
  + 'l’entreprise DURAND.';

/* ───────────────────────────── Questions ───────────────────────────── */

export const QUESTIONS_F: QuestionSansNum[] = [
  /* ═══════════════ F.1 — Besoin en eau chaude ═══════════════ */
  {
    label: 'F.1', partie: 6, type: 'tableau',
    enonce: 'En vous appuyant sur la formule suivante, **calculer** le QEC (Quantité d’eau chaude nécessaire). **Calculer** les quantités d’eau chaude que devra fournir le chauffe-eau.',
    contexte:
      'La chèvrerie a besoin de :\n'
      + '– 200 litres d’eau à 40° par jour, pour le magasin, la fromagerie et la charcuterie (toutes les utilisations sauf désinfection) ;\n'
      + '– 150 litres d’eau à 55° par jour uniquement pour la désinfection.\n'
      + 'À savoir : le produit désinfectant a besoin d’une température d’eau à 55° pour être efficace. La consigne en température sera de 60° par mesure de sécurité.\n'
      + 'La formule permettant de connaître la consommation est : QEC = QEM × (TEM − TEF) / (TEC − TEF), avec QEM = quantité d’eau mélangée ; '
      + 'TEM = température de l’eau mélangée souhaitée ; TEF = température de l’eau froide (aux alentours de 10 °C en hiver) ; TEC = température de l’eau chaude (60°).',
    competence: 'C3', points: 5, dtr: [], pageSujet: 36,
    colonnes: ['Quantité', 'Formule', 'Application numérique', 'Résultat (litres)'],
    lignes: [
      { cellules: ['QEC40', formule('f1-formule40', SPEC_QEC, 'Q_{EC40} = …'), appli('f1-appli40'), num('f1-qec40', 120, 0.5)] },
      { cellules: ['QEC55', formule('f1-formule55', SPEC_QEC, 'Q_{EC55} = …'), appli('f1-appli55'), num('f1-qec55', 135, 0.5)] },
      { cellules: ['QEC totale', 'QEC = QEC40 + QEC55', appli('f1-applitot'), num('f1-qec', 255, 1)] },
    ],
    indice: 'Pour chaque usage, QEM est le volume d’eau mélangée demandé et TEM sa température ; TEF = 10 °C et TEC = 60 °C (la consigne, pas les 55 °C).',
    aides: [
      '📖 Toutes les données sont dans l’énoncé : les deux besoins journaliers (volume et température), la température de l’eau froide et la consigne du chauffe-eau.',
      '🧭 Méthode : applique la formule deux fois, une par usage. QEM et TEM changent d’un usage à l’autre ; TEF et TEC restent les mêmes. Le chauffe-eau est réglé à la consigne de sécurité, c’est elle qui joue le rôle de TEC. Additionne ensuite les deux quantités d’eau chaude.',
      '✏️ Forme de la réponse : Q_{EC} = Q_{EM} × (T_{EM} − T_{EF}) / (T_{EC} − T_{EF}) dans la colonne formule, les valeurs remplacées dans la colonne application, puis un volume en litres par ligne.',
    ],
    erreursTypiques: [
      {
        id: 'f1-qec40-sans-formule', champ: 'f1-qec40', nombre: { valeur: 200, tolerance: 0.5 },
        message: 'Tu as recopié le volume d’eau MÉLANGÉE : le chauffe-eau ne fournit qu’une partie de ce volume, le reste est de l’eau froide. Applique la formule.',
      },
      {
        id: 'f1-qec55-sans-formule', champ: 'f1-qec55', nombre: { valeur: 150, tolerance: 0.5 },
        message: 'Tu as recopié le volume d’eau MÉLANGÉE : applique la formule pour trouver la part d’eau chaude à 60°.',
      },
      {
        id: 'f1-tec-55', champ: 'f1-qec40', nombre: { valeur: 133.3, tolerance: 0.5 },
        message: 'TEC est la température de l’eau CHAUDE produite par le chauffe-eau, c’est-à-dire la consigne de sécurité, pas la température de désinfection.',
      },
      {
        id: 'f1-inverse', formule: 'Q_{EM}\\times\\frac{T_{EC}-T_{EF}}{T_{EM}-T_{EF}}',
        message: 'Ta fraction est inversée : la quantité d’eau chaude doit être PLUS PETITE que la quantité d’eau mélangée (la fraction est inférieure à 1).',
      },
    ],
    explication: 'QEC40 = 200 × (40 − 10) / (60 − 10) = 200 × 30 / 50 = 120 L ; QEC55 = 150 × (55 − 10) / (60 − 10) = 150 × 45 / 50 = 135 L ; QEC totale = 120 + 135 = 255 litres d’eau chaude à 60° par jour.',
  },

  /* ═══════════════ F.2 — Chauffe-eau à accumulation ═══════════════ */
  {
    label: 'F.2.1', partie: 6, type: 'tableau',
    // Énoncé fidèle : le sujet renvoie à « la question E.1 » (coquille pour F.1).
    enonce: 'Choix de la capacité. En vous appuyant sur les documents « Thermor » et connaissant le QEC de la question E.1, **indiquer** le volume et la puissance à choisir pour un chauffe-eau à accumulation sur socle.',
    contexte: 'Étude de la solution avec chauffe-eau à accumulation. Marque : THERMOR, position verticale.',
    competence: 'C3', points: 2, dtr: [pageDtr(35)], pageSujet: 37,
    colonnes: ['Capacité ou volume (litres)', 'Puissance'],
    lignes: [{ cellules: [num('f21-volume', 300, 0, ['300 L', '300 litres']), num('f21-puissance', 3000, 0, ['3000 W', '3 kW', '3 000 W'])] }],
    indice: 'Le besoin journalier est le QEC total calculé en F.1 (« E.1 » dans l’énoncé) : prends le premier volume du tableau « Chauffe-eau verticaux sur socle » qui le couvre.',
    aides: [
      '📖 Ouvre le DTR 35 : tableau « I.2 Chauffe-eau verticaux sur socle » (volumes en colonnes, puissance en ligne). Le besoin est le QEC total de la question F.1 (l’énoncé écrit « E.1 »).',
      '🧭 Méthode : le ballon doit contenir au moins la quantité d’eau chaude nécessaire par jour : choisis le plus petit volume SUPÉRIEUR OU ÉGAL au besoin, puis lis la puissance dans la même colonne.',
      '✏️ Forme de la réponse : un volume en litres (une des colonnes du tableau) et une puissance en watts.',
    ],
    erreursTypiques: [
      {
        id: 'f21-250', champ: 'f21-volume', nombre: { valeur: 250, tolerance: 0 },
        message: 'Ce volume est INFÉRIEUR au besoin journalier calculé en F.1 : le ballon ne couvrirait pas la consommation d’une journée.',
      },
      {
        id: 'f21-v40', champ: 'f21-volume', nombre: { valeur: 200, tolerance: 0 },
        message: 'La ligne V40 donne de l’eau à 40 °C (eau mélangée) ; le besoin calculé en F.1 est de l’eau CHAUDE : compare-le aux volumes des colonnes.',
      },
    ],
    explication: 'Besoin : 255 L d’eau chaude par jour. Le volume de 250 L est insuffisant ; on retient le ballon de 300 litres, de puissance 3 000 W.',
  },
  {
    label: 'F.2.2', partie: 6, type: 'calcul',
    enonce: 'Calcul de la consommation annuelle. En vous appuyant sur les documents « Thermor », **calculer** l’énergie consommée par an (en kilowattheures) sachant que la chèvrerie est en activité 320 jours/an.',
    contexte: 'Le temps de chauffe réel par jour est donné dans la documentation (temps donné en heures - minutes). Tableau du sujet : Heures de fonctionnement / an ; Puissance ; Énergie consommée en kWh.',
    competence: 'C3', points: 3, dtr: [pageDtr(35)], pageSujet: 37,
    grandeur: 'W', unite: 'kWh',
    formule: 'W = P × t, avec t = temps de chauffe journalier × 320 jours',
    formuleMotsCles: ['p', 't', '320'],
    attendu: 6048, tolerance: 10, arrondi: 'à l’unité',
    formuleSpec: specEnergie(500, 4000),
    indice: 'Temps de chauffe réel du 300 L : 6 h 18 min = 6,3 h (18 min = 0,3 h, pas 0,18 h).',
    aides: [
      '📖 DTR 35 : ligne « Temps de chauffe réel » dans la colonne du volume choisi en F.2.1 ; la puissance est celle de F.2.1.',
      '🧭 Méthode : convertis d’abord le temps de chauffe en heures décimales (les minutes se divisent par 60), multiplie par le nombre de jours d’activité pour obtenir les heures de fonctionnement par an, puis multiplie par la puissance EN kW pour obtenir des kWh.',
      '✏️ Forme de la réponse : W = P × t (t = heures de fonctionnement par an) = … × … = … kWh.',
    ],
    erreursTypiques: [
      {
        id: 'f22-minutes-decimales', nombre: { valeur: 5932.8, tolerance: 5 },
        message: 'Tu as lu 6 h 18 comme 6,18 h : 18 minutes valent 18 / 60 = 0,3 h.',
      },
      {
        id: 'f22-wh', nombre: { valeur: 6048000, tolerance: 10000 },
        message: 'Ton résultat est en Wh : l’énergie est demandée en kWh (divise par 1 000, ou prends la puissance en kW).',
      },
      {
        id: 'f22-250l', nombre: { valeur: 4768, tolerance: 10 },
        message: 'Tu as pris le temps de chauffe de la colonne 250 L : utilise celui du ballon choisi en F.2.1.',
      },
    ],
    explication: '6 h 18 = 6,3 h ; heures de fonctionnement par an : 6,3 × 320 = 2 016 h ; W = 3 kW × 2 016 h = 6 048 kWh.',
  },
  {
    label: 'F.2.3', partie: 6, type: 'calcul',
    enonce: 'Calcul du coût annuel. En vous appuyant sur les documents « EDF », **calculer** le coût annuel (en euros) de cette production d’ECS. Option choisie en tarif bleu : heures creuses.',
    contexte: 'Tableau du sujet : Prix du kWh (€ TTC/kWh) ; Coût annuel €.',
    competence: 'C10', points: 2, dtr: [pageDtr(36)], pageSujet: 37,
    grandeur: 'C', unite: '€',
    formule: 'C = W × prix du kWh',
    formuleMotsCles: ['w', 'prix'],
    attendu: 1250.73, tolerance: 1, arrondi: 'au centime',
    formuleSpec: SPEC_COUT,
    indice: 'Option Heures Creuses, colonne « Heures Creuses » : 20,68 c€ TTC/kWh = 0,2068 €/kWh.',
    aides: [
      '📖 Ouvre le DTR 36 : tableau « Option Heures Creuses (TTC) », colonne du prix du kWh en heures creuses ; l’énergie est ta réponse F.2.2.',
      '🧭 Méthode : le chauffe-eau chauffe la nuit, en heures creuses : prends ce prix (il ne dépend pas de la puissance souscrite) et convertis-le des centimes en euros avant de multiplier par l’énergie annuelle.',
      '✏️ Forme de la réponse : C = W × prix du kWh = … × … = … € (au centime).',
    ],
    erreursTypiques: [
      {
        id: 'f23-heures-pleines', nombre: { valeur: 1632.96, tolerance: 1 },
        message: 'Tu as pris le prix des heures PLEINES : l’option choisie est « heures creuses », le chauffe-eau chauffe pendant les heures creuses.',
      },
      {
        id: 'f23-base', nombre: { valeur: 1521.68, tolerance: 1 },
        message: 'Tu as pris le prix de l’option Base : l’énoncé impose l’option heures creuses.',
      },
      {
        id: 'f23-centimes', nombre: { valeur: 125072.64, tolerance: 100 },
        message: 'Le prix du tableau est en CENTIMES d’euro par kWh : convertis-le en euros (÷ 100).',
      },
    ],
    explication: 'Prix du kWh en heures creuses : 20,68 c€ = 0,2068 € TTC/kWh ; C = 6 048 × 0,2068 = 1 250,73 € par an.',
  },

  /* ═══════════════ F.3 — Chauffe-eau thermodynamique ═══════════════ */
  {
    label: 'F.3.1', partie: 6, type: 'tableau',
    // Énoncé fidèle : « la question E.1 » (coquille pour F.1).
    enonce: 'Choix de la capacité. En vous appuyant sur les documents « Hitachi » et sachant le QEC de la question E.1, **déterminer** le volume à choisir pour un chauffe-eau thermodynamique et en **déduire** les références.',
    contexte: 'Étude de la solution à chauffe-eau thermodynamique. Marque : HITACHI. Unité intérieure (ballon) + unité extérieure.',
    competence: 'C3', points: 3, dtr: [pageDtr(37)], pageSujet: 37,
    colonnes: ['Capacité ou volume (litres)', 'Référence groupe intérieur (ballon)', 'Référence groupe extérieur'],
    lignes: [{ cellules: [
      num('f31-volume', 270, 0, ['270 L', '270 litres']),
      txt('f31-ballon', ref('TAW-270RHC', 'TAW 270 RHC', 'TAW-270 RHC')),
      txt('f31-groupe', ref('RAW-35RHC', 'RAW 35 RHC', 'RAW-35 RHC')),
    ] }],
    indice: 'Le besoin de F.1 (255 L) dépasse la capacité de la version 190 L : version 270 L, ligne « Ballon » pour le groupe intérieur, ligne « Groupe extérieur ».',
    aides: [
      '📖 Ouvre le DTR 37 : les deux colonnes « Version … », lignes « Ballon » / « Capacité » et « Groupe extérieur ».',
      '🧭 Méthode : compare la CAPACITÉ de chaque ballon au besoin journalier d’eau chaude de F.1 et garde le plus petit qui le couvre ; les références se lisent ensuite dans la même colonne (le groupe extérieur est commun aux deux versions).',
      '✏️ Forme de la réponse : un volume en litres, puis deux références constructeur recopiées exactement (lettres, chiffres et tiret).',
    ],
    erreursTypiques: [
      {
        id: 'f31-190', champ: 'f31-volume', nombre: { valeur: 190, tolerance: 0 },
        message: 'Ce ballon est plus petit que le besoin journalier d’eau chaude calculé en F.1.',
      },
      {
        id: 'f31-volume-utile', champ: 'f31-volume', nombre: { valeur: 360, tolerance: 0 },
        message: '360 L est le « volume d’eau max utile » (eau mélangée) : la question demande la capacité du ballon.',
      },
    ],
    explication: 'Besoin : 255 L → la version 190 L est insuffisante ; on choisit le ballon de 270 litres : groupe intérieur TAW-270RHC, groupe extérieur RAW-35RHC.',
  },
  {
    label: 'F.3.2', partie: 6, type: 'calcul',
    enonce: 'Calcul de la consommation annuelle. En vous appuyant sur les documents « Hitachi », **calculer** l’énergie consommée (en kilowattheures) sachant que la chèvrerie est en activité 320 jours/an. **Compléter** le tableau ci-dessous.',
    contexte: 'Le temps de chauffe est donné dans la documentation. On considère que la résistance d’appoint ne se déclenche jamais, car le fonctionnement sur le mode thermodynamique est garanti jusqu’à −15°. Tableau du sujet : Temps de chauffe journalier ; Heures de fonctionnement / an ; Puissance : 700 W ; Énergie consommée en kWh.',
    competence: 'C3', points: 3, dtr: [pageDtr(37)], pageSujet: 38,
    grandeur: 'W', unite: 'kWh',
    formule: 'W = P × t, avec t = temps de chauffe journalier × 320 jours',
    formuleMotsCles: ['p', 't', '320'],
    attendu: 784, tolerance: 2, arrondi: 'à l’unité',
    formuleSpec: specEnergie(200, 3000),
    indice: 'Temps de chauffe de la version 270 L : 3 h 30 = 3,5 h ; puissance imposée : 700 W = 0,7 kW.',
    aides: [
      '📖 DTR 37 : ligne « Temps de chauffe selon EN16147 », colonne de la version choisie en F.3.1 ; la puissance (700 W) est imprimée dans le tableau du sujet.',
      '🧭 Méthode : convertis le temps journalier en heures décimales (30 min = une demi-heure), calcule les heures de fonctionnement sur 320 jours, puis l’énergie avec la puissance en kW. La résistance d’appoint n’intervient pas.',
      '✏️ Forme de la réponse : temps journalier en h, heures par an, puis W = P × t = … × … = … kWh.',
    ],
    erreursTypiques: [
      {
        id: 'f32-3h3', nombre: { valeur: 739.2, tolerance: 1 },
        message: 'Tu as lu 3 h 30 comme 3,3 h : 30 minutes valent 0,5 h.',
      },
      {
        id: 'f32-190l', nombre: { valeur: 672, tolerance: 1 },
        message: 'Tu as pris le temps de chauffe de la version 190 L : utilise celui du ballon choisi en F.3.1.',
      },
      {
        id: 'f32-appoint', nombre: { valeur: 1836.8, tolerance: 2 },
        message: 'Tu as pris la puissance de la résistance électrique : l’énoncé précise que l’appoint ne se déclenche jamais et impose 700 W.',
      },
      {
        id: 'f32-wh', nombre: { valeur: 784000, tolerance: 1000 },
        message: 'Ton résultat est en Wh : l’énergie est demandée en kWh.',
      },
    ],
    explication: 'Temps de chauffe journalier : 3 h 30 = 3,5 h ; heures de fonctionnement par an : 3,5 × 320 = 1 120 h ; W = 0,7 kW × 1 120 h = 784 kWh.',
  },
  {
    label: 'F.3.3', partie: 6, type: 'calcul',
    enonce: 'Calcul du coût annuel. En vous appuyant sur les documents « EDF », **calculer** le coût annuel (en euros) de cette production d’ECS. Option choisie en tarif bleu : heures creuses.',
    contexte: 'Tableau du sujet : Prix du kWh (€ TTC/kWh) ; Coût annuel en €.',
    competence: 'C10', points: 2, dtr: [pageDtr(36)], pageSujet: 38,
    grandeur: 'C', unite: '€',
    formule: 'C = W × prix du kWh',
    formuleMotsCles: ['w', 'prix'],
    attendu: 162.13, tolerance: 0.5, arrondi: 'au centime',
    formuleSpec: SPEC_COUT,
    indice: 'Même prix qu’en F.2.3 (heures creuses), appliqué à l’énergie de F.3.2.',
    aides: [
      '📖 DTR 36 : tableau « Option Heures Creuses (TTC) » ; l’énergie annuelle est ta réponse F.3.2.',
      '🧭 Méthode : même démarche qu’en F.2.3 : prix du kWh en heures creuses converti en euros, multiplié par l’énergie annuelle.',
      '✏️ Forme de la réponse : C = W × prix du kWh = … × … = … € (au centime).',
    ],
    erreursTypiques: [
      {
        id: 'f33-heures-pleines', nombre: { valeur: 211.68, tolerance: 0.5 },
        message: 'Tu as pris le prix des heures PLEINES : l’option choisie est « heures creuses ».',
      },
      {
        id: 'f33-centimes', nombre: { valeur: 16213.12, tolerance: 10 },
        message: 'Le prix du tableau est en CENTIMES d’euro par kWh : convertis-le en euros (÷ 100).',
      },
    ],
    explication: 'C = 784 × 0,2068 = 162,13 € par an.',
  },

  /* ═══════════════ F.4 — Seuil de rentabilité ═══════════════ */
  {
    label: 'F.4.1', partie: 6, type: 'calcul',
    enonce: 'Calcul du coût total sur les cinq premières années de la solution « chauffe-eau à accumulation ». En vous appuyant sur les devis de l’artisan et sur votre réponse à la question F.2.3, **calculer** le coût total de la solution « chauffe-eau à accumulation ».',
    contexte: 'Vous avez déterminé les caractéristiques et les coûts énergétiques à l’année pour deux solutions de production d’eau chaude sanitaire : le chauffe-eau à accumulation et le chauffe-eau thermodynamique. Dans cette partie, vous allez déterminer le seuil de rentabilité de la solution thermodynamique. Tableau du sujet : Coût total de la solution (€) ; Coût total de la solution + 5 ans de dépenses énergétiques (€).',
    competence: 'C10', points: 3, dtr: [pageDtr(38)], pageSujet: 38,
    grandeur: 'C5', unite: '€',
    formule: 'C5 = coût total de la solution (TTC) + 5 × coût annuel',
    formuleMotsCles: ['5', '+'],
    // Corrigé officiel : tableau laissé vide ; valeur déduite du devis DTR 38 (1 571,54 € TTC) et de F.2.3.
    attendu: 7825.19, tolerance: 2, arrondi: 'au centime',
    formuleSpec: SPEC_COUT_5ANS,
    indice: 'Coût total de la solution : total TTC du devis DTR 38 (1 571,54 €) ; on y ajoute 5 années de coût énergétique (F.2.3).',
    aides: [
      '📖 Ouvre le DTR 38 (devis du chauffe-eau à accumulation) : prends le montant que paie réellement la chèvrerie ; le coût annuel est ta réponse F.2.3.',
      '🧭 Méthode : le coût total = ce que coûte l’installation (une seule fois, le jour de la pose) + ce que coûte l’énergie chaque année, multiplié par le nombre d’années.',
      '✏️ Forme de la réponse : coût de la solution = … € TTC, puis C₅ = coût de la solution + 5 × coût annuel = … + 5 × … = … €.',
    ],
    erreursTypiques: [
      {
        id: 'f41-ht', nombre: { valeur: 7563.27, tolerance: 2 },
        message: 'Tu as pris le total HORS TAXES du devis : les coûts énergétiques sont TTC, et la chèvrerie paie le total TTC.',
      },
      {
        id: 'f41-sans-installation', nombre: { valeur: 6253.65, tolerance: 2 },
        message: 'Tu n’as compté que l’énergie : ajoute le coût de l’installation (devis DTR 38).',
      },
      {
        id: 'f41-une-annee', nombre: { valeur: 2822.27, tolerance: 2 },
        message: 'Tu n’as ajouté qu’une année de dépenses énergétiques : il en faut cinq.',
      },
    ],
    explication: 'Coût total de la solution (devis DTR 38, TTC) : 1 571,54 € ; + 5 ans d’énergie : 1 571,54 + 5 × 1 250,73 = 1 571,54 + 6 253,65 = 7 825,19 €.',
  },
  {
    label: 'F.4.2', partie: 6, type: 'calcul',
    enonce: 'Calcul du coût total sur les cinq premières années de la solution « chauffe-eau thermodynamique ». En vous appuyant sur les devis de l’artisan et sur votre réponse à la question F.3.3, **calculer** le coût total de la solution « chauffe-eau thermodynamique ».',
    contexte: 'Tableau du sujet : Coût de l’installation (€) ; Coût total de l’installation + 5 ans de dépenses énergétiques (€).',
    competence: 'C10', points: 3, dtr: [pageDtr(39)], pageSujet: 38,
    grandeur: 'C5', unite: '€',
    formule: 'C5 = coût de l’installation (TTC) + 5 × coût annuel',
    formuleMotsCles: ['5', '+'],
    // Corrigé officiel : tableau laissé vide ; valeur déduite du devis DTR 39 (4 546,75 € TTC) et de F.3.3.
    attendu: 5357.4, tolerance: 2, arrondi: 'au centime',
    formuleSpec: SPEC_COUT_5ANS,
    indice: 'Coût de l’installation : total TTC du devis DTR 39 (4 546,75 €) ; on y ajoute 5 années de coût énergétique (F.3.3).',
    aides: [
      '📖 Ouvre le DTR 39 (devis du chauffe-eau thermodynamique) : prends le montant total que paie la chèvrerie ; le coût annuel est ta réponse F.3.3.',
      '🧭 Méthode : même démarche qu’en F.4.1 : installation (payée une fois) + 5 années de dépenses énergétiques.',
      '✏️ Forme de la réponse : coût de l’installation = … € TTC, puis C₅ = … + 5 × … = … €.',
    ],
    erreursTypiques: [
      {
        id: 'f42-ht', nombre: { valeur: 4599.61, tolerance: 2 },
        message: 'Tu as pris le total HORS TAXES du devis : prends le total TTC, comme les coûts énergétiques.',
      },
      {
        id: 'f42-appareil-seul', nombre: { valeur: 3310.61, tolerance: 2 },
        message: 'Tu n’as compté que le chauffe-eau : le coût de l’installation comprend toutes les lignes du devis (installation, forfait gaz et mise en service) et la TVA.',
      },
    ],
    explication: 'Coût de l’installation (devis DTR 39, TTC) : 4 546,75 € ; + 5 ans d’énergie : 4 546,75 + 5 × 162,13 = 4 546,75 + 810,65 = 5 357,40 €.',
  },
  {
    label: 'F.4.3', partie: 6, type: 'placement',
    enonce: 'Seuil de rentabilité. En vous appuyant sur les deux dernières questions, **tracer** en **bleu** la courbe du coût total de la solution à chauffe-eau à accumulation en fonction des années d’utilisation et en **rouge** la courbe du coût total de la solution à chauffe-eau thermodynamique en fonction des années d’utilisation.',
    contexte: 'À l’écran : place les points qui définissent chacune des deux droites (au moins les années 0, 3 et 5 de chaque solution).',
    competence: 'C10', points: 4, dtr: [pageDtr(38), pageDtr(39)], pageSujet: 39,
    plan: { src: `${IMG}/q-f43-graphique.jpg`, alt: 'Graphique vierge : coût total en euros (0 à 9 000 €) en fonction des années (0 à 7)', w: GRAPH.w, h: GRAPH.h },
    symbole: 'point',
    zone: { x0: gx(-0.1), y0: gy(9200), x1: gx(7.6), y1: gy(-100) },
    attendus: [
      { x: gx(0), y: gy(ACCU(0)), label: 'Accumulation — année 0 (1 571,54 €)' },
      { x: gx(2), y: gy(ACCU(2)), label: 'Accumulation — année 2 (4 073,00 €)' },
      { x: gx(5), y: gy(ACCU(5)), label: 'Accumulation — année 5 (7 825,19 €)' },
      { x: gx(0), y: gy(THERMO(0)), label: 'Thermodynamique — année 0 (4 546,75 €)' },
      { x: gx(4), y: gy(THERMO(4)), label: 'Thermodynamique — année 4 (5 195,27 €)' },
      { x: gx(5), y: gy(THERMO(5)), label: 'Thermodynamique — année 5 (5 357,40 €)' },
    ],
    // ± 0,26 an et ± 400 € environ.
    tolerance: { x: 0.03, y: 0.04 },
    max: 12,
    indice: 'Chaque courbe est une droite : à l’année 0, le coût de l’installation ; chaque année, on ajoute le coût énergétique annuel.',
    aides: [
      '📖 Reprends tes réponses F.4.1 et F.4.2 (coût à l’année 0 et coût après 5 ans) et les coûts annuels de F.2.3 et F.3.3.',
      '🧭 Méthode : le coût total augmente chaque année du même montant (le coût énergétique annuel) : c’est une droite qui part du coût de l’installation. Calcule le coût à l’année 3 pour avoir un troisième point de contrôle, puis place les points de chaque solution.',
      '✏️ Forme de la réponse : trois points par solution (années 0, 3 et 5), lus sur les graduations du graphique ; les deux droites se croisent.',
    ],
    explication: 'Accumulation (bleu) : droite de 1 571,54 € (année 0) à 7 825,19 € (année 5), pente 1 250,73 €/an. Thermodynamique (rouge) : droite de 4 546,75 € (année 0) à 5 357,40 € (année 5), pente 162,13 €/an. Les deux droites se croisent vers 2,7 ans (≈ 5 000 €).',
  },
  {
    label: 'F.4.4', partie: 6, type: 'valeur',
    enonce: '**Déterminer** le seuil de rentabilité du chauffe-eau thermodynamique.',
    competence: 'C10', points: 2, dtr: [], pageSujet: 39,
    champs: [
      champNum('seuil', 'Seuil de rentabilité (nombre d’années)', 3, 0.5, 'ans', [
        '3e année', '3ème année', '3eme annee', 'la 3e année', 'la 3ème année', 'troisième année', 'la troisième année',
        'rentable la 3e année', 'rentable la 3ème année', 'au cours de la 3e année', 'au bout de 3 ans',
      ]),
    ],
    indice: 'Lis l’abscisse du point d’intersection des deux droites de F.4.3.',
    aides: [
      '📖 Utilise ton graphique F.4.3 (ou les coûts de F.4.1 et F.4.2).',
      '🧭 Méthode : le seuil de rentabilité est le moment où les deux coûts cumulés sont égaux : au-delà, la solution thermodynamique coûte moins cher. Lis l’abscisse du croisement, ou calcule-la : écart d’installation ÷ écart de coût annuel.',
      '✏️ Forme de la réponse : un nombre d’années (ou « rentable la …e année »).',
    ],
    erreursTypiques: [
      {
        id: 'f44-cinq-ans', champ: 'seuil', nombre: { valeur: 5, tolerance: 0.2 },
        message: 'Cinq ans est la durée d’étude des questions F.4.1 et F.4.2, pas le seuil : cherche l’année où les deux droites se croisent.',
      },
    ],
    explication: 'Les droites se croisent pour n = (4 546,75 − 1 571,54) / (1 250,73 − 162,13) ≈ 2,7 ans : la solution thermodynamique est rentable la 3e année.',
  },

  /* ═══════════════ F.5 — Préparation des travaux ═══════════════ */
  {
    label: 'F.5.1', partie: 6, type: 'valeur',
    enonce: 'Habilitation de la personne chargée de consigner les deux départs. Avant le passage de l’entreprise DURAND, vous êtes chargé de consigner les deux départs afin que le ou les ouvriers habilités puissent intervenir sans danger. **Compléter** le tableau ci-dessous avec votre titre d’habilitation.',
    contexte: SITUATION_F5,
    tableauContexte: LISTING,
    competence: 'C1', points: 2, dtr: [], pageSujet: 40,
    champs: [champTxt('titre', 'Titre d’habilitation', ['BC', 'B C', 'B.C', 'B-C', 'habilitation BC', 'titre BC'], 'Symbole d’habilitation')],
    indice: 'Consigner un départ est une opération à part entière, avec son propre symbole d’habilitation (chargé de consignation).',
    aides: [
      '📖 Relis la mise en situation : tu interviens seul, AVANT l’entreprise qui réalise les travaux, pour mettre les deux départs en sécurité.',
      '🧭 Méthode : pense au rôle de la personne (exécutant, chargé de travaux, chargé d’intervention, chargé de consignation…), puis au domaine de tension (B = basse tension) ; la lettre du rôle suit la lettre du domaine.',
      '✏️ Forme de la réponse : un symbole d’habilitation de deux caractères.',
    ],
    erreursTypiques: [
      {
        id: 'f51-br', champ: 'titre', valeurs: ['BR'],
        message: 'BR est l’habilitation du chargé d’intervention générale (dépannage, raccordement) : ici, on demande seulement de consigner.',
      },
      {
        id: 'f51-b2', champ: 'titre', valeurs: ['B2', 'B2V'],
        message: 'B2 / B2V concernent le chargé de travaux ; la consignation d’un départ est l’affaire d’un chargé de consignation.',
      },
    ],
    explication: 'La personne qui consigne les deux départs est chargée de consignation : habilitation BC.',
  },
  {
    label: 'F.5.2', partie: 6, type: 'valeur',
    enonce: 'Habilitation de la personne chargée de gérer ces travaux. Une personne de votre entreprise pourrait gérer les travaux sur ce chantier. **Compléter** le tableau ci-dessous avec son titre d’habilitation.',
    competence: 'C1', points: 2, dtr: [], pageSujet: 40,
    champs: [champTxt('titre', 'Titre d’habilitation', [
      'B2 et B2V', 'B2V', 'B2 - B2V', 'B2-B2V', 'B2 B2V', 'B2/B2V', 'B2, B2V', 'B2 + B2V', 'B2V et B2', 'B2 et B2 V', 'B2 B2 V',
    ], 'Symbole(s) d’habilitation')],
    indice: 'Celui qui dirige les travaux est chargé de travaux ; tous les départs du tableau restent sous tension à proximité.',
    aides: [
      '📖 Relis la mise en situation : l’armoire est en service et tous les autres départs sont sous tension.',
      '🧭 Méthode : identifie le rôle (diriger des travaux hors tension = chargé de travaux, chiffre 2), puis demande-toi si l’on travaille au VOISINAGE de pièces nues sous tension (attribut V).',
      '✏️ Forme de la réponse : le ou les symboles d’habilitation (B, chiffre, éventuel attribut).',
    ],
    erreursTypiques: [
      {
        id: 'f52-b2-seul', champ: 'titre', valeurs: ['B2'],
        message: 'Les autres départs de l’armoire restent sous tension : le chargé de travaux doit aussi être habilité au voisinage (attribut V).',
      },
      {
        id: 'f52-b1v', champ: 'titre', valeurs: ['B1V', 'B1', 'B1 et B1V'],
        message: 'B1 / B1V sont des habilitations d’EXÉCUTANT : pour gérer (diriger) les travaux, il faut être chargé de travaux.',
      },
      {
        id: 'f52-bc', champ: 'titre', valeurs: ['BC'],
        message: 'BC est l’habilitation de la consignation (question F.5.1) ; ici, on dirige les travaux.',
      },
    ],
    explication: 'La personne qui gère (dirige) les travaux est chargée de travaux, au voisinage des départs restés sous tension : B2 et B2V.',
  },
  {
    label: 'F.5.3', partie: 6, type: 'tableau',
    enonce: 'Habilitation des ouvriers de l’entreprise DURAND. L’entreprise DURAND souhaite avoir le maximum d’électriciens sur toute la durée des travaux afin de garantir les délais de livraison. **Compléter** le tableau ci-dessous avec le nom des personnes qui peuvent réaliser ces travaux et leur titre d’habilitation.',
    contexte: 'À l’écran : inscris les personnes retenues dans l’ordre du listing, une par ligne.',
    tableauContexte: LISTING,
    competence: 'C1', points: 5, dtr: [], pageSujet: 40,
    colonnes: ['Personnel', 'Habilitation'],
    lignes: [
      { cellules: [txt('f53-nom1', nom('Roger', 'DURAND'), 'Nom (ordre du listing)'), txt('f53-hab1', HAB_B1V_BR)] },
      { cellules: [txt('f53-nom2', nom('Patrick', 'JEANNET'), 'Nom (ordre du listing)'), txt('f53-hab2', HAB_B1V)] },
      { cellules: [txt('f53-nom3', nom('Xavier', 'JILLE'), 'Nom (ordre du listing)'), txt('f53-hab3', HAB_B1V_BR)] },
      { cellules: [txt('f53-nom4', nom('Guillaume', 'RENNY'), 'Nom (ordre du listing)'), txt('f53-hab4', HAB_B1V_BR)] },
      { cellules: [txt('f53-nom5', [...nom('Estéban', 'TARIX'), 'TARIX Esteban', 'Esteban TARIX'], 'Nom (ordre du listing)'), txt('f53-hab5', HAB_B1V)] },
    ],
    indice: 'Pour exécuter des travaux hors tension à proximité des départs restés sous tension, il faut être exécutant habilité au voisinage (B1V).',
    aides: [
      '📖 Utilise le listing des habilités de l’entreprise DURAND (au-dessus de la question F.5.1) et la mise en situation de F.5.',
      '🧭 Méthode : les ouvriers EXÉCUTENT des travaux d’ordre électrique hors tension, au voisinage de départs sous tension : garde chaque personne dont le titre contient l’habilitation d’exécutant au voisinage, quel que soit son poste dans l’entreprise ; écarte les non-électriciens (B0, aucun titre) et les habilitations d’intervention seules.',
      '✏️ Forme de la réponse : une ligne par personne retenue, dans l’ordre du listing : NOM Prénom, puis son titre d’habilitation.',
    ],
    erreursTypiques: [
      {
        id: 'f53-ribouleau-br', champ: 'f53-nom5', valeurs: ['RIBOULEAU Marc', 'Marc RIBOULEAU', 'RIBOULEAU'],
        message: 'BR autorise des interventions (dépannage, raccordement), pas l’exécution de travaux : une personne habilitée BR seulement ne peut pas être retenue.',
      },
      {
        id: 'f53-b0', champ: 'f53-nom2', valeurs: ['DURAND Julien', 'Julien DURAND'],
        message: 'B0 est une habilitation de non-électricien (travaux d’ordre non électrique) : il ne peut pas réaliser ces travaux électriques.',
      },
    ],
    explication: 'Peuvent exécuter les travaux (habilitation B1 et B1V) : DURAND Roger (B1V - BR), JEANNET Patrick (B1V), JILLE Xavier (B1V - BR), RENNY Guillaume (B1V - BR) et TARIX Estéban (B1V). Sont exclus : DURAND Julien (B0, non-électricien), JOURDIN Emeric (non habilité) et RIBOULEAU Marc (BR seul : intervention, pas travaux).',
  },
];
