/**
 * Partie A — Sécurisation des personnes et des biens (24 points, pages 6 à 12 du sujet, DTR 1 à 8).
 *
 * Barème : le corrigé officiel ne détaille pas les points par question ; la répartition
 * ci-dessous est faite au prorata du travail demandé pour tomber juste sur 24 points.
 */
import type { QSchema, SujetPartie } from '@/lib/sujet/types';
import { IMG, num, txt, choix, libre, champNum, champTxt, ref, pageDtr, type QuestionSansNum } from './commun';

export const PARTIE_A: SujetPartie = {
  num: 1,
  titre: 'Sécurisation des personnes et des biens',
  objectifs: [
    'Définir le SSI adapté aux différents locaux.',
    'Choisir le matériel à installer.',
    'Implanter le matériel sur le plan.',
    'Proposer un schéma de raccordement.',
  ],
  competences: ['C1', 'C3', 'C5', 'C6', 'C11'],
  situation:
    'Vous êtes chargé de définir le système de sécurité incendie (SSI) du magasin, de la zone de transformation et du SAS de la chambre froide.\n'
    + 'Le magasin peut accueillir 10 personnes à la fois.\n'
    + 'La zone de transformation est complètement carrelée pour faciliter le nettoyage quotidien au jet d’eau sous pression.\n'
    + 'Il existe deux employés en plus du gérant de l’exploitation.',
  dtrPages: [pageDtr(1), pageDtr(2), pageDtr(3), pageDtr(4), pageDtr(6), pageDtr(7), pageDtr(8)],
};

/* ───────────────────────────── A.4 : schéma de raccordement ───────────────────────────── */

/**
 * Recadrage de la page 11 du sujet (disjoncteur, bornier du tableau T4, trois DM).
 * Résistances de fin de ligne : le schéma papier n'en dessine aucune (l'élève la trace à la
 * main). Ici, elle se pose avec le stylo « Résistance de fin de ligne » entre deux bornes du
 * DM ; le réseau correspondant est noté avec cette couleur.
 */
const A4_TRAITS: QSchema['traits'] = {
  image: {
    src: `${IMG}/q-a4-schema.jpg`,
    alt: 'Schéma de raccordement à compléter : disjoncteur phase + neutre, bornier du tableau d’alarme type 4, deux déclencheurs manuels de la zone de transformation et un déclencheur manuel du magasin',
    w: 745, h: 870,
  },
  bornes: [
    { id: 'Q.N1', x: 3.8, y: 2.87, label: 'Disjoncteur — N amont' },
    { id: 'Q.P1', x: 7.15, y: 2.87, label: 'Disjoncteur — P amont' },
    { id: 'Q.N2', x: 3.8, y: 20.31, label: 'Disjoncteur — N aval' },
    { id: 'Q.P2', x: 7.15, y: 20.31, label: 'Disjoncteur — P aval' },
    { id: 'T4.SP', x: 26.71, y: 32.1, label: 'T4 — Secteur P' },
    { id: 'T4.SN', x: 30.74, y: 32.1, label: 'T4 — Secteur N' },
    { id: 'T4.EXT+', x: 51.32, y: 32.1, label: 'T4 — Entrée alim. ext. +' },
    { id: 'T4.EXT-', x: 55.4, y: 32.1, label: 'T4 — Entrée alim. ext. −' },
    { id: 'T4.DS+', x: 26.71, y: 56.44, label: 'T4 — Diffuseur sonore +' },
    { id: 'T4.DS-', x: 30.74, y: 56.44, label: 'T4 — Diffuseur sonore −' },
    { id: 'T4.AUXC', x: 34.9, y: 56.44, label: 'T4 — Contact aux. C' },
    { id: 'T4.AUXOF', x: 39.02, y: 56.44, label: 'T4 — Contact aux. O/F' },
    { id: 'T4.B1+', x: 43.18, y: 56.44, label: 'T4 — Boucle 1 DM +' },
    { id: 'T4.B1-', x: 47.21, y: 56.44, label: 'T4 — Boucle 1 DM −' },
    { id: 'T4.B2+', x: 51.32, y: 56.44, label: 'T4 — Boucle 2 DM +' },
    { id: 'T4.B2-', x: 55.4, y: 56.44, label: 'T4 — Boucle 2 DM −' },
    { id: 'T4.DERC', x: 59.64, y: 56.44, label: 'T4 — Contact dérang. C' },
    { id: 'T4.DEROF', x: 63.66, y: 56.44, label: 'T4 — Contact dérang. O/F' },
    { id: 'DM1.3A', x: 74.13, y: 64.56, label: 'DM zone de transformation (haut) — 3A' },
    { id: 'DM1.3', x: 74.13, y: 65.9, label: 'DM zone de transformation (haut) — 3' },
    { id: 'DM1.1A', x: 74.13, y: 67.16, label: 'DM zone de transformation (haut) — 1A' },
    { id: 'DM1.1', x: 74.13, y: 68.39, label: 'DM zone de transformation (haut) — 1' },
    { id: 'DM1.2A', x: 74.13, y: 69.66, label: 'DM zone de transformation (haut) — 2A' },
    { id: 'DM1.2', x: 74.13, y: 70.92, label: 'DM zone de transformation (haut) — 2' },
    { id: 'DM2.3A', x: 74.13, y: 77.21, label: 'DM zone de transformation (milieu) — 3A' },
    { id: 'DM2.3', x: 74.13, y: 78.47, label: 'DM zone de transformation (milieu) — 3' },
    { id: 'DM2.1A', x: 74.13, y: 79.77, label: 'DM zone de transformation (milieu) — 1A' },
    { id: 'DM2.1', x: 74.13, y: 81.03, label: 'DM zone de transformation (milieu) — 1' },
    { id: 'DM2.2A', x: 74.13, y: 82.3, label: 'DM zone de transformation (milieu) — 2A' },
    { id: 'DM2.2', x: 74.13, y: 83.6, label: 'DM zone de transformation (milieu) — 2' },
    { id: 'DMM.3A', x: 74.59, y: 90.89, label: 'DM magasin — 3A' },
    { id: 'DMM.3', x: 74.59, y: 92.15, label: 'DM magasin — 3' },
    { id: 'DMM.1A', x: 74.59, y: 93.41, label: 'DM magasin — 1A' },
    { id: 'DMM.1', x: 74.59, y: 94.68, label: 'DM magasin — 1' },
    { id: 'DMM.2A', x: 74.59, y: 95.98, label: 'DM magasin — 2A' },
    { id: 'DMM.2', x: 74.59, y: 97.24, label: 'DM magasin — 2' },
  ],
  couleurs: [
    { id: 'noir', label: 'Noir', css: '#161616' },
    { id: 'rouge', label: 'Rouge', css: '#d62828' },
    { id: 'bleu', label: 'Bleu', css: '#1f6fd6' },
    { id: 'vert', label: 'Vert', css: '#2e9a3a' },
    { id: 'resistance', label: 'Résistance de fin de ligne', css: '#b8860b' },
  ],
  // Liaisons du corrigé (p. 11) : aval du disjoncteur C2 → Secteur ; boucle 1 → DM du magasin ;
  // boucle 2 → les deux DM de la zone de transformation en série ; résistance de fin de ligne
  // sur le dernier DM de chaque boucle (bornes 1 et 2). Couleur des conducteurs non notée.
  attendues: [
    { a: 'Q.P2', b: 'T4.SP' },
    { a: 'Q.N2', b: 'T4.SN' },
    { a: 'T4.B1+', b: 'DMM.3A' },
    { a: 'T4.B1-', b: 'DMM.1A' },
    { a: 'DMM.1', b: 'DMM.2', couleur: 'resistance' },
    { a: 'T4.B2+', b: 'DM1.3A' },
    { a: 'DM1.2A', b: 'DM2.3A' },
    { a: 'T4.B2-', b: 'DM2.1A' },
    { a: 'DM2.1', b: 'DM2.2', couleur: 'resistance' },
  ],
  // Corrigé officiel : l'ordre des deux DM de la zone de transformation est celui du corrigé
  // (DM du haut en tête de boucle) ; l'ordre inverse, électriquement équivalent, n'est pas reconnu.
  reseaux: [
    { label: 'Phase : disjoncteur → Secteur P', bornes: ['Q.P2', 'T4.SP'] },
    { label: 'Neutre : disjoncteur → Secteur N', bornes: ['Q.N2', 'T4.SN'] },
    { label: 'Boucle 1 + → DM magasin 3A', bornes: ['T4.B1+', 'DMM.3A'] },
    { label: 'Boucle 1 − → DM magasin 1A', bornes: ['T4.B1-', 'DMM.1A'] },
    { label: 'Résistance de fin de ligne — boucle 1', couleur: 'resistance', bornes: ['DMM.1', 'DMM.2'] },
    { label: 'Boucle 2 + → 1er DM zone de transformation 3A', bornes: ['T4.B2+', 'DM1.3A'] },
    { label: 'Liaison entre les deux DM de la zone de transformation', bornes: ['DM1.2A', 'DM2.3A'] },
    { label: 'Boucle 2 − → 2e DM zone de transformation 1A', bornes: ['T4.B2-', 'DM2.1A'] },
    { label: 'Résistance de fin de ligne — boucle 2', couleur: 'resistance', bornes: ['DM2.1', 'DM2.2'] },
  ],
};

/* ───────────────────────────── Questions ───────────────────────────── */

export const QUESTIONS_A: QuestionSansNum[] = [
  /* ═══════════════ A.1 Réglementation ═══════════════ */
  {
    label: 'A.1.1', partie: 1, type: 'valeur',
    enonce: '**Donner** la signification des acronymes suivants, dans la sécurité incendie.',
    competence: 'C1', points: 1, dtr: [pageDtr(3), pageDtr(2)], pageSujet: 7,
    champs: [
      champTxt('erp', 'ERP', [
        'Établissement recevant du public', 'Etablissement recevant du public', 'établissements recevant du public',
        'Établissement recevant le public', 'Etablissement recevant le public',
      ]),
      champTxt('ert', 'ERT', [
        'Établissement recevant des travailleurs', 'Etablissement recevant des travailleurs', 'établissements recevant des travailleurs',
        'Établissement recevant les travailleurs', 'Etablissement recevant du personnel', 'Établissement recevant du personnel',
      ]),
    ],
    indice: 'Le DTR 3 développe l’un des deux sigles dès sa première ligne ; l’autre se construit de la même façon.',
    aides: [
      '📖 Lis la première phrase du DTR 3 (classification des établissements) et la fin de la liste du DTR 2 (type ERT).',
      '🧭 Méthode : les deux sigles commencent par « Établissement recevant… » ; seule la dernière lettre change : qui est reçu dans l’établissement ?',
      '✏️ Forme de la réponse : ERP = Établissement recevant … ; ERT = Établissement recevant …',
    ],
    erreursTypiques: [
      {
        id: 'a11-erp-prive', champ: 'erp', valeurs: ['Établissement recevant du privé', 'Etablissement recevant du privé'],
        message: 'Le P ne désigne pas « privé » : pense aux personnes extérieures qui entrent dans un magasin.',
      },
    ],
    explication: 'ERP : établissement recevant du public ; ERT : établissement recevant des travailleurs.',
  },
  {
    label: 'A.1.2', partie: 1, type: 'valeur',
    enonce: '**Déterminer** la lettre correspondante au type d’établissement en fonction de son activité.',
    competence: 'C1', points: 0.5, dtr: [pageDtr(2)], pageSujet: 7,
    champs: [champTxt('type', 'Type d’établissement', ['M', 'type M', 'M (magasin)', 'M magasin', 'M : magasins'], 'Lettre')],
    indice: 'L’exploitation vend ses produits au public dans son magasin.',
    aides: [
      '📖 Ouvre le DTR 2 : liste des types d’établissements avec leur lettre.',
      '🧭 Méthode : l’espace qui reçoit du public est le magasin de vente ; cherche l’activité correspondante dans la liste.',
      '✏️ Forme de la réponse : une lettre (Type …).',
    ],
    erreursTypiques: [
      {
        id: 'a12-ert', champ: 'type', valeurs: ['ERT', 'type ERT'],
        message: 'La zone de transformation est bien un lieu de travail, mais la question porte sur l’activité qui reçoit du public.',
      },
      {
        id: 'a12-t', champ: 'type', valeurs: ['T', 'type T'],
        message: 'Le type T concerne les halls et salles d’exposition : l’exploitation vend ses produits.',
      },
    ],
    explication: 'Type M : magasins de vente et centres commerciaux.',
  },
  {
    label: 'A.1.3', partie: 1, type: 'cocher', multiple: true,
    enonce: '**Déterminer** la ou les catégories selon l’effectif.',
    contexte: 'Le magasin peut accueillir 10 personnes à la fois ; deux employés travaillent en plus du gérant.',
    competence: 'C1', points: 0.5, dtr: [pageDtr(3)], pageSujet: 7,
    options: ['Catégorie 1', 'Catégorie 2', 'Catégorie 3', 'Catégorie 4', 'Catégorie 5'],
    bonnes: [3, 4],
    indice: 'L’effectif est très faible : regarde les catégories des petits établissements dans la légende du DTR 3.',
    aides: [
      '📖 Ouvre le DTR 3 : légende des catégories (1re à 5e) et colonne « effectif » de la ligne M.',
      '🧭 Méthode : compte l’effectif total (public + personnel), puis repère sur la ligne M la ou les zones de couleur qui couvrent ce petit effectif.',
      '✏️ Forme de la réponse : coche la ou les catégories concernées (plusieurs cases possibles).',
    ],
    explication: 'Avec une dizaine de personnes, l’établissement relève des plus petites catégories : catégorie 4 ou 5 (corrigé).',
  },
  {
    label: 'A.1.4', partie: 1, type: 'tableau',
    enonce: '**Indiquer** le type d’équipement d’alarme imposé par la réglementation. Justifier en cochant la ou les bonne réponse(s).',
    competence: 'C1', points: 1.5, dtr: [pageDtr(3)], pageSujet: 7,
    colonnes: ['Élément', 'Réponse'],
    lignes: [
      { cellules: ['Type d’équipement d’alarme', txt('a14-ea', ['EA4', 'EA 4', 'type 4', 'EA type 4', 'équipement d’alarme de type 4', "équipement d'alarme de type 4"])] },
      { cellules: ['ERT < 50 personnes', choix('a14-c1', ['Cochée', 'Non cochée'], 'Cochée')] },
      { cellules: ['ERP < 300 personnes catégorie 4', choix('a14-c2', ['Cochée', 'Non cochée'], 'Cochée')] },
      { cellules: ['IGH < 50 personnes', choix('a14-c3', ['Cochée', 'Non cochée'], 'Non cochée')] },
      { cellules: ['ERP < 100 personnes catégorie 5', choix('a14-c4', ['Cochée', 'Non cochée'], 'Cochée')] },
      { cellules: ['ERP < 700 personnes catégorie 3', choix('a14-c5', ['Cochée', 'Non cochée'], 'Non cochée')] },
    ],
    indice: 'Ligne M du DTR 3 pour un faible effectif ; le bâtiment reçoit à la fois du public et des travailleurs.',
    aides: [
      '📖 Ouvre le DTR 3 : ligne « M — Magasins de vente », colonnes des plus petits effectifs.',
      '🧭 Méthode : lis le chiffre du type d’équipement d’alarme dans la case qui correspond à l’effectif ; pour la justification, retiens toutes les situations qui décrivent l’établissement (public ET personnel), et écarte celles qui ne le concernent pas (immeuble de grande hauteur, catégorie trop élevée).',
      '✏️ Forme de la réponse : EA… , puis « Cochée » ou « Non cochée » pour chaque proposition.',
    ],
    erreursTypiques: [
      {
        id: 'a14-igh', champ: 'a14-c3', valeurs: ['Cochée'],
        message: 'Un IGH est un immeuble de grande hauteur : ce n’est pas le cas d’un bâtiment agricole de plain-pied.',
      },
      {
        id: 'a14-cat3', champ: 'a14-c5', valeurs: ['Cochée'],
        message: 'La catégorie 3 correspond à un effectif bien plus important que celui de l’exploitation.',
      },
    ],
    explication: 'EA4. Justification : ERT < 50 personnes, ERP < 300 personnes catégorie 4 et ERP < 100 personnes catégorie 5 sont cochées.',
  },
  {
    label: 'A.1.5', partie: 1, type: 'redige',
    enonce: '**Donner** les règles d’implantation des déclencheurs manuels (DM).',
    competence: 'C1', points: 1.5, dtr: [pageDtr(4)], pageSujet: 7,
    motsCles: ['sortie', 'exterieur', 'escalier', 'niveau', '1,30', '1.30', '0,40', '0.40', 'angle'],
    minMotsCles: 5, lignes: 4,
    corrige: 'À proximité des sorties donnant sur l’extérieur. Près des escaliers, à chaque niveau. Implanter à 1,30 m du sol, à 0,40 m d’un angle rentrant (visibles dans le sens de l’évacuation).',
    indice: 'Trois règles au DTR 4 : où (sorties, escaliers) et à quelle hauteur / distance.',
    aides: [
      '📖 Ouvre le DTR 4 : « Règles d’implantation des déclencheurs manuels » (rez-de-chaussée, escaliers, hauteur).',
      '🧭 Méthode : relève les emplacements imposés (près de quoi ?) puis les cotes de pose (hauteur par rapport au sol, distance à un angle).',
      '✏️ Forme de la réponse : trois tirets : « À proximité de … » ; « Près de … , à chaque … » ; « À … m du sol et à … m d’un angle ».',
    ],
    explication: 'À proximité des sorties donnant sur l’extérieur ; près des escaliers, à chaque niveau ; à 1,30 m du sol et à 0,40 m d’un angle.',
  },
  {
    label: 'A.1.6', partie: 1, type: 'tableau',
    enonce: '**Définir** le nombre de DM en fonction du plan des différents espaces en justifiant votre réponse.',
    competence: 'C1', points: 1, dtr: [pageDtr(1), pageDtr(4)], pageSujet: 8,
    colonnes: ['Espace', 'Nombre de DM'],
    lignes: [
      { cellules: ['Magasin', num('a16-mag', 1, 0)] },
      { cellules: ['Zone de transformation (avec le SAS de la chambre froide)', num('a16-zt', 2, 0)] },
      { cellules: ['Total', num('a16-total', 3, 0)] },
      { cellules: ['Justification', libre('a16-just')] },
    ],
    indice: 'Un DM près de chaque sortie donnant sur l’extérieur, dans les espaces protégés par le SSI.',
    aides: [
      '📖 Sur le plan du DTR 1, repère les portes qui donnent sur l’extérieur dans le magasin, la zone de transformation et le SAS ; la règle est au DTR 4.',
      '🧭 Méthode : la fromagerie n’est pas concernée par ce SSI. Compte les sorties vers l’extérieur de chaque espace protégé ; les portes qui mènent d’un local à un autre ne comptent pas.',
      '✏️ Forme de la réponse : un nombre par espace, le total, puis « 1 DM à chaque sortie donnant sur l’extérieur ».',
    ],
    erreursTypiques: [
      {
        id: 'a16-portes-interieures', champ: 'a16-total', nombre: { valeur: 5, tolerance: 1 },
        message: 'Tu as compté des portes intérieures ou des espaces non protégés : seules les sorties donnant sur l’extérieur des espaces du SSI comptent.',
      },
    ],
    explication: '3 DM aux sorties donnant sur l’extérieur : 1 DM dans le magasin, 2 DM pour la zone de transformation (dont celui de la sortie du SAS).',
  },
  {
    label: 'A.1.7', partie: 1, type: 'calcul',
    enonce: '**Calculer** la surface totale de diffusion sonore en fonction du plan.',
    competence: 'C5', points: 1.5, dtr: [pageDtr(1)], pageSujet: 8,
    grandeur: 'S_T', unite: 'm²',
    formule: 'S_T = L1 × l1 + L2 × l2 + L3 × l3 + L4 × l4',
    formuleMotsCles: ['+', 'x'],
    // Corrigé officiel : « ST = (6,8 × 2,70) + (6,8 × 4,70) + (7,80 × 3,70) + (2,30 × 2,30) = 65,2 m² »
    // — l'expression vaut en réalité 84,47 m² (erreur d'addition du corrigé). On attend la valeur
    // JUSTE de l'expression du corrigé (mêmes cotes) ; 65,2 est reconnu comme erreur typique.
    attendu: 84.47, tolerance: 0.7, arrondi: '1 décimale',
    formuleSpec: {
      attendues: ['L_{1}\\times l_{1}+L_{2}\\times l_{2}+L_{3}\\times l_{3}+L_{4}\\times l_{4}'],
      membreGauche: ['S_{T}', 'S_T', 'S', 'ST', 'S_{tot}'],
      variables: {
        'L_{1}': { min: 2, max: 10 }, 'l_{1}': { min: 2, max: 8 }, 'L_{2}': { min: 2, max: 10 }, 'l_{2}': { min: 2, max: 8 },
        'L_{3}': { min: 2, max: 10 }, 'l_{3}': { min: 2, max: 8 }, 'L_{4}': { min: 1, max: 4 }, 'l_{4}': { min: 1, max: 4 },
      },
      // S₁…S₄ = surfaces des locaux : « S_T = S_1 + S_2 + S_3 + S_4 » est aussi reconnue.
      derivees: {
        'S_{1}': 'L_{1}\\times l_{1}', 'S_{2}': 'L_{2}\\times l_{2}', 'S_{3}': 'L_{3}\\times l_{3}', 'S_{4}': 'L_{4}\\times l_{4}',
      },
      affichage: 'S_T = L1 × l1 + L2 × l2 + L3 × l3 + L4 × l4 (somme des surfaces des locaux)',
    },
    indice: 'Surface de chaque local = longueur × largeur (cotes du DTR 1, en mètres), puis somme.',
    aides: [
      '📖 Ouvre le DTR 1 : les cotes des locaux sont données en centimètres.',
      '🧭 Méthode : convertis chaque cote en mètres, calcule la surface de chaque local rectangulaire (longueur × largeur), puis additionne les surfaces.',
      '✏️ Forme de la réponse : S_T = L₁ × l₁ + L₂ × l₂ + … = (… × …) + (… × …) + … = … m².',
    ],
    erreursTypiques: [
      {
        id: 'a17-addition', nombre: { valeur: 65.2, tolerance: 0.7 },
        message: 'Les quatre surfaces sont les bonnes, mais refais leur addition : le total est plus grand.',
      },
      {
        id: 'a17-cm', nombre: { valeur: 844700, tolerance: 250000 },
        message: 'Ton résultat est énorme : as-tu converti les cotes du plan (en cm) en mètres avant de multiplier ?',
      },
    ],
    explication: 'Corrigé officiel : S_T = (6,8 × 2,70) + (6,8 × 4,70) + (7,80 × 3,70) + (2,30 × 2,30) = 65,2 m² (magasin, zone de transformation, fromagerie et SAS) — mais cette somme vaut en réalité 84,47 m² : c’est la valeur attendue ici (erreur d’addition du corrigé).',
  },
  {
    label: 'A.1.8', partie: 1, type: 'valeur',
    enonce: 'Sachant que le niveau sonore est de 50 dB en moyenne, **définir** le nombre de diffuseur sonore de type B.',
    competence: 'C3', points: 0.5, dtr: [pageDtr(5)], pageSujet: 8,
    champs: [champNum('nb', 'Nombre de diffuseurs sonores de classe B', 1, 0)],
    indice: 'Au plus faible niveau sonore du tableau, un diffuseur de classe B couvre une très grande surface, même avec cloisonnement.',
    aides: [
      '📖 Ouvre le DTR 5 (même page que le DTR 4) : surface couverte par un diffuseur sonore selon le bruit ambiant.',
      '🧭 Méthode : prends la ligne du niveau sonore le plus proche (au-dessus de 50 dB), colonne « Classe B », valeur « avec cloisonnement » (les locaux sont séparés par des murs), et compare-la à la surface calculée en A.1.7.',
      '✏️ Forme de la réponse : un nombre entier de diffuseurs.',
    ],
    explication: '1 diffuseur sonore de classe B : il couvre 1 000 m² avec cloisonnement, bien plus que la surface des locaux.',
  },

  /* ═══════════════ A.2 Détermination du matériel ═══════════════ */
  {
    label: 'A.2.1', partie: 1, type: 'tableau',
    enonce: 'Tableau d’alarme T4. **Choisir** le tableau d’alarme T4 en complétant le tableau ci-dessous.',
    contexte: 'L’exploitant souhaite une visualisation de détection indépendante pour chaque espace (magasin – zone de transformation). La consommation des diffuseurs sonores est inférieure à 400 mA.',
    competence: 'C3', points: 1.5, dtr: [pageDtr(6)], pageSujet: 8,
    colonnes: ['Désignation', 'Produit', 'Référence'],
    lignes: [{ cellules: [
      txt('a21-des', ['Type 4 Planète 2 boucles', 'Type 4 Planete 2 boucles', 'Tableau type 4 Planète 2 boucles', 'T4 Planète 2 boucles']),
      txt('a21-prod', ['Planète T4 2B', 'PlanèteT4 2B', 'Planete T4 2B', 'T4 2B']),
      txt('a21-ref', ref('NUG31220', 'NUG 31220')),
    ] }],
    indice: 'Organigramme du DTR 6 : puissance des diffuseurs, nombre de DM, besoin de flash, nombre de zones de détection.',
    aides: [
      '📖 Ouvre le DTR 6 : organigramme « Équipement d’Alarme de type 4 » et tableau des références en bas de page.',
      '🧭 Méthode : suis l’organigramme avec les données de l’énoncé : consommation des diffuseurs, nombre de DM (A.1.6), besoin de flash (non demandé), puis nombre de zones de détection (une par espace).',
      '✏️ Forme de la réponse : la désignation, le nom du produit et la référence NUG… recopiés du tableau.',
    ],
    erreursTypiques: [
      {
        id: 'a21-1-boucle', champ: 'a21-ref', valeurs: ref('NUG31218', 'NUG31217'),
        message: 'Ce tableau n’a qu’une boucle : l’exploitant veut une visualisation indépendante pour chaque espace, donc deux zones de détection.',
      },
      {
        id: 'a21-flash', champ: 'a21-ref', valeurs: ref('NUG31221'),
        message: 'Cette version intègre un flash, que rien ne demande dans l’énoncé.',
      },
    ],
    explication: 'Type 4 Planète 2 boucles — Planète T4 2B — NUG31220 (diffuseurs < 400 mA, moins de 32 DM, pas de flash, 2 zones de détection).',
  },
  {
    label: 'A.2.2', partie: 1, type: 'valeur',
    enonce: '**Relever** les différentes caractéristiques du tableau d’alarme.',
    competence: 'C3', points: 1.5, dtr: [pageDtr(8) + 1, pageDtr(6)], pageSujet: 8,
    champs: [
      champTxt('dim', 'Dimensions (mm)', ['240 x 160 x 47', '240×160×47', '240 × 160 × 47', '240x160x47 mm', '240 x 160 x 47 mm']),
      champTxt('ip', 'Indice de protection', ['IP20 IK07', 'IP 20 IK 07', 'IP20 et IK07', 'IP 20', 'IP20']),
      champTxt('signal', 'Signal d’évacuation', [
        'Bi-ton 440 Hz/550 Hz', 'bi-ton 440Hz-550Hz', 'bi-ton 440/550 Hz', 'bi-ton 440 Hz 550 Hz', 'bi-ton 440 Hz / 550 Hz (> 90 dB à 1 m)',
        'bi-ton 440-550 Hz', 'biton 440 Hz/550 Hz', 'bi-ton',
      ]),
      // Corrigé officiel : « 203V +/-10% » (coquille pour 230 V) ; les deux sont acceptés.
      champTxt('tension', 'Tension d’alimentation', ['230 V ± 10 %', '230V +/-10%', '230 V +/- 10 %', '230 V', '230V', '230 V~', '230 Vac', '203V +/-10%']),
      champNum('dm', 'Nombre de DM par boucle', 32, 0),
      champNum('batt', 'Tension de batterie', 6, 0, 'V'),
    ],
    indice: 'Notice du tableau (DTR 8), chapitre 2 « Caractéristiques techniques ».',
    aides: [
      '📖 Ouvre la 2e page du DTR 8 : chapitres 2.1 (générales), 2.2 (électriques), 2.3 (ligne de commande) et 2.4 (batterie).',
      '🧭 Méthode : chaque ligne demandée correspond à une ligne de la notice ; recopie la valeur avec son unité.',
      '✏️ Forme de la réponse : des dimensions en mm, un indice IP et un indice IK, deux fréquences en Hz, une tension avec sa tolérance, un nombre de DM, une tension de batterie.',
    ],
    erreursTypiques: [
      {
        id: 'a22-ligne-ds', champ: 'batt', nombre: { valeur: 24, tolerance: 0 },
        message: '24 V est la tension de la ligne des diffuseurs sonores : cherche la tension de la batterie au chapitre 2.4.',
      },
    ],
    explication: 'Dimensions 240 × 160 × 47 mm ; IP20 IK07 ; signal bi-ton 440 Hz / 550 Hz (> 90 dB à 1 m) ; 230 V ± 10 % ; 32 DM par boucle ; batterie 6 V.',
  },
  {
    label: 'A.2.3', partie: 1, type: 'tableau',
    enonce: '**Définir** le lieu d’installation du tableau d’alarme. Justification.',
    competence: 'C3', points: 1, dtr: [pageDtr(8) + 1], pageSujet: 9,
    colonnes: ['Lieu d’installation', 'Justification'],
    lignes: [{ cellules: [choix('a23-lieu', ['Magasin', 'Zone de transformation'], 'Magasin'), libre('a23-just')] }],
    indice: 'La zone de transformation est lavée au jet d’eau sous pression : compare avec l’indice de protection du tableau.',
    aides: [
      '📖 Relis la mise en situation de la partie A (nettoyage de la zone de transformation) et l’indice IP relevé en A.2.2.',
      '🧭 Méthode : le second chiffre de l’indice IP indique la protection contre l’eau ; un 0 signifie aucune protection.',
      '✏️ Forme de la réponse : le lieu choisi, puis « Le tableau d’indice IP … n’est pas … donc … ».',
    ],
    erreursTypiques: [
      {
        id: 'a23-zt', champ: 'a23-lieu', valeurs: ['Zone de transformation'],
        message: 'La zone de transformation est lavée au jet d’eau : l’indice de protection du tableau le permet-il ?',
      },
    ],
    explication: 'Magasin : le tableau d’alarme T4, d’indice de protection IP20, n’est pas étanche ; il ne peut donc pas être installé dans la zone de transformation lavée au jet.',
  },
  {
    label: 'A.2.4', partie: 1, type: 'tableau',
    enonce: '**Choisir** les déclencheurs manuels.',
    competence: 'C3', points: 1.5, dtr: [pageDtr(7)], pageSujet: 9,
    colonnes: ['Localisation', 'Désignation', 'Produit', 'Référence'],
    lignes: [
      { cellules: [
        'Magasin',
        txt('a24-mag-des', [
          'Déclencheur manuel saillie étanche IP24', 'Déclencheur manuel sailli étanche IP24', 'Déclencheur manuel saillie IP24',
          'Déclencheur manuel saillie membrane déformable IP24D', 'Déclencheur Manuel Saillie - Membrane déformable - IP 24D', 'Déclencheur manuel saillie',
        ]),
        txt('a24-mag-prod', ['MDS3000', 'MDS 3000']),
        txt('a24-mag-ref', ref('NUG30316', 'NUG 30316')),
      ] },
      { cellules: [
        'Zone de transformation',
        txt('a24-zt-des', [
          'Déclencheur manuel saillie étanche IP66', 'Déclencheur manuel sailli étanche IP66', 'Déclencheur manuel saillie IP66',
          'Déclencheur Manuel Saillie - Membrane déformable - étanche IP 66', 'Déclencheur manuel étanche IP66',
        ]),
        txt('a24-zt-prod', ['BGES3000', 'BGES 3000']),
        txt('a24-zt-ref', ref('NUG30312', 'NUG 30312')),
      ] },
    ],
    indice: 'Le magasin est un local sec ; la zone de transformation est lavée au jet : il y faut un DM étanche.',
    aides: [
      '📖 Ouvre le DTR 7 : tableaux des déclencheurs manuels rouges (standard, avec voyant, étanche).',
      '🧭 Méthode : un DM standard suffit dans un local sec ; dans un local lavé au jet, choisis le modèle dont l’indice de protection résiste aux projections d’eau. Les DM à voyant ou radio ne sont pas demandés.',
      '✏️ Forme de la réponse : pour chaque espace, la désignation, le produit (…S3000) et la référence NUG… du DTR 7.',
    ],
    erreursTypiques: [
      {
        id: 'a24-zt-ip24', champ: 'a24-zt-ref', valeurs: ref('NUG30316'),
        message: 'Ce DM n’est protégé qu’en IP24 : insuffisant pour un nettoyage au jet d’eau sous pression.',
      },
      {
        id: 'a24-voyant', champ: 'a24-mag-ref', valeurs: ref('NUG30325', 'NUG30317'),
        message: 'Rien ne demande un voyant ou une liaison radio : choisis le modèle standard.',
      },
    ],
    explication: 'Magasin : déclencheur manuel saillie IP24 — MDS3000 — NUG30316. Zone de transformation : déclencheur manuel saillie étanche IP66 — BGES3000 — NUG30312.',
  },
  {
    label: 'A.2.5', partie: 1, type: 'tableau',
    enonce: '**Donner** la spécificité des différents câbles utilisés dans les SSI.',
    competence: 'C1', points: 1, dtr: [pageDtr(8) + 1], pageSujet: 9,
    colonnes: ['Câble', 'Spécificité'],
    lignes: [
      { cellules: ['C2', txt('a25-c2', [
        'Câble non propagateur de la flamme', 'Câble non-propagateur de la flamme', 'non propagateur de la flamme', 'non-propagateur de flamme',
        'non propagateur de flamme', 'ne propage pas la flamme',
      ])] },
      { cellules: ['CR1', txt('a25-cr1', [
        'Câble résistant au feu', 'résistant au feu', 'Câble résistant au feu (900 °C pendant 15 min)', 'résistant au feu 900 °C 15 min',
        'câble résistant au feu 900° pendant 15 min',
      ])] },
    ],
    indice: 'C2 et CR1 sont des classes de comportement au feu des câbles.',
    aides: [
      '📖 Le DTR 8 (§ 2.3) cite le câble C2 de la ligne de DM ; les classes de comportement au feu relèvent de ton cours sur les SSI.',
      '🧭 Méthode : l’une des classes empêche le feu de se propager le long du câble ; l’autre permet au câble de continuer à fonctionner pendant l’incendie.',
      '✏️ Forme de la réponse : C2 = câble … ; CR1 = câble … (température et durée si tu les connais).',
    ],
    erreursTypiques: [
      {
        id: 'a25-inverse', champ: 'a25-c2', valeurs: ['Câble résistant au feu', 'résistant au feu'],
        message: 'Tu as inversé les deux classes : le R de CR1 signifie « résistant ».',
      },
    ],
    explication: 'C2 : câble non propagateur de la flamme. CR1 : câble résistant au feu (900 °C pendant 15 min).',
  },

  /* ═══════════════ A.3 Implantation ═══════════════ */
  {
    label: 'A.3', partie: 1, type: 'placement',
    enonce: 'Sur le plan ci-dessous, **implanter** le matériel en utilisant les symboles donnés dans la légende.',
    contexte: 'Légende : déclencheur manuel ; tableau d’alarme T4 ; diffuseur sonore. Pose un repère à l’emplacement de chaque appareil.',
    competence: 'C11', points: 3, dtr: [pageDtr(1), pageDtr(4)], pageSujet: 10,
    plan: { src: `${IMG}/q-a3-plan.jpg`, alt: 'Plan des locaux : fromagerie, magasin de vente, zone de transformation, SAS et chambre froide, avec la légende des symboles', w: 770, h: 765 },
    symbole: 'point',
    // Positions du corrigé (p. 10) : 3 DM (magasin, zone de transformation, SAS) et le tableau T4
    // (diffuseur sonore intégré) dans le magasin, près de la porte vers la zone de transformation.
    attendus: [
      { x: 0.7, y: 0.196, label: 'DM magasin (sortie extérieure)' },
      { x: 0.456, y: 0.321, label: 'Tableau d’alarme T4 (magasin)' },
      { x: 0.928, y: 0.521, label: 'DM zone de transformation (sortie extérieure)' },
      { x: 0.554, y: 0.861, label: 'DM SAS chambre froide (sortie extérieure)' },
    ],
    tolerance: { x: 0.06, y: 0.06 },
    max: 6,
    indice: 'Un DM à chaque sortie donnant sur l’extérieur des espaces protégés ; le tableau T4 dans le local choisi en A.2.3.',
    aides: [
      '📖 Reprends tes réponses A.1.6 (nombre de DM), A.1.8 (diffuseur) et A.2.3 (lieu du tableau) ; règles d’implantation au DTR 4.',
      '🧭 Méthode : place chaque DM tout près d’une porte qui donne sur l’extérieur, côté intérieur ; le tableau T4 se place dans le local sec choisi, et son diffuseur sonore intégré suffit.',
      '✏️ Forme de la réponse : un repère par appareil (3 DM et le tableau), posé au plus près de son emplacement réel.',
    ],
    explication: 'Corrigé : 1 DM près de la porte extérieure du magasin, 1 DM près de la porte extérieure de la zone de transformation, 1 DM près de la porte extérieure du SAS ; le tableau d’alarme T4 (diffuseur intégré) dans le magasin, près de la porte de la zone de transformation.',
  },

  /* ═══════════════ A.4 Schéma de raccordement ═══════════════ */
  {
    label: 'A.4.1', partie: 1, type: 'valeur', // A.4 du papier : calibre du disjoncteur (1re consigne), le schéma est en A.4.2
    enonce: 'Schéma de raccordement : **indiquer** le calibre sur le disjoncteur.',
    competence: 'C3', points: 1, dtr: [pageDtr(8), pageDtr(8) + 1], pageSujet: 11,
    champs: [champNum('calibre', 'Calibre du disjoncteur', 2, 0, 'A', ['C2', 'C 2', '2A', '2 A'])],
    indice: 'Le tableau ne consomme qu’environ 30 mA sur le secteur : le plus petit calibre usuel convient.',
    aides: [
      '📖 DTR 8, § 2.2 « Caractéristiques électriques » : courant maximal absorbé sur le secteur.',
      '🧭 Méthode : le disjoncteur protège la seule ligne d’alimentation du tableau ; choisis un petit calibre normalisé, supérieur au courant absorbé.',
      '✏️ Forme de la réponse : un calibre en ampères (courbe et calibre, par ex. C…).',
    ],
    erreursTypiques: [
      {
        id: 'a4-calibre-16', champ: 'calibre', nombre: { valeur: 16, tolerance: 6 },
        message: 'Ce calibre est celui d’un circuit de prises ou d’éclairage : le tableau d’alarme absorbe à peine quelques dizaines de milliampères.',
      },
    ],
    explication: 'Disjoncteur C2 (2 A).',
  },
  {
    label: 'A.4.2', partie: 1, type: 'schema', // A.4 du papier : le schéma lui-même
    enonce: '**Compléter** le schéma de raccordement avec soin (traits à la règle).\n✓ Raccorder l’alimentation.\n✓ La boucle 1 intègre le ou les DM du magasin.\n✓ La boucle 2 intègre le ou les DM de zone de transformation.\n✓ Les lignes de DM sont protégées.',
    contexte: 'Le calibre du disjoncteur se donne à la question précédente. La résistance de fin de ligne se pose avec le stylo « Résistance de fin de ligne », entre les deux bornes du DM où elle se raccorde.',
    competence: 'C11', points: 4, dtr: [pageDtr(8), pageDtr(7)], pageSujet: 11,
    traits: A4_TRAITS,
    platineTpId: 'chevrerie-a4-ssi',
    corrigeImage: { src: 'corriges/chevrerie/q-a4-corrige.jpg', alt: 'Schéma de raccordement du tableau d’alarme type 4 — corrigé' },
    indice: 'Plan de câblage général du DTR 8 : boucle en série de DM (3A en entrée, 2A vers le DM suivant, 1A en retour) et résistance de fin de ligne sur le dernier DM.',
    aides: [
      '📖 Ouvre le DTR 8, « Plan de câblage général » : raccordement du secteur, des boucles 1 et 2 et des déclencheurs manuels.',
      '🧭 Méthode : alimente d’abord le bornier Secteur (P et N) depuis l’aval du disjoncteur. Puis, pour chaque boucle, pars du + vers le premier DM, chaîne les DM de la même boucle, reviens au − et termine par la résistance de fin de ligne sur le dernier DM (surveillance de ligne).',
      '✏️ Forme de la réponse : des traits borne à borne (2 pour le secteur, 2 pour la boucle 1, 3 pour la boucle 2) et une résistance de fin de ligne sur le dernier DM de chaque boucle ; puis le même câblage sur la platine.',
    ],
    explication: 'Corrigé : aval du disjoncteur C2 : P → Secteur P, N → Secteur N. Boucle 1 : + → 3A du DM magasin, − → 1A, résistance de fin de ligne entre 1 et 2. Boucle 2 : + → 3A du 1er DM de la zone de transformation, 2A de ce DM → 3A du 2e DM, − → 1A du 2e DM, résistance de fin de ligne entre 1 et 2 du 2e DM.',
  },

  /* ═══════════════ A.5 Paramétrage ═══════════════ */
  {
    label: 'A.5', partie: 1, type: 'cavaliers',
    enonce: '**Paramétrer** en noircissant le petit carré qui correspondra à la position du micro-switch.',
    contexte: 'Sachant que l’on demande :\n✓ Une surveillance des lignes des DM.\n✓ Un réarmement du type 4 après réarmement des DM.\n✓ Les micros-switch non mentionnés sont en position off.',
    competence: 'C6', points: 1.5, dtr: [pageDtr(8) + 2], pageSujet: 12,
    composants: [{
      id: 'SW', label: 'Micro-switchs',
      positions: [
        { id: '1', label: '1', attendu: 'OFF' },
        { id: '2', label: '2', attendu: 'OFF' },
        { id: '3', label: '3', attendu: 'ON' },
        { id: '4', label: '4', attendu: 'OFF' },
        { id: '5', label: '5', attendu: 'OFF' },
        { id: '6', label: '6', attendu: 'OFF' },
        { id: '7', label: '7', attendu: 'OFF' },
        { id: '8', label: '8', attendu: 'OFF' },
      ],
    }],
    valeurs: ['ON', 'OFF'],
    indice: 'DTR 8, chapitre 6 : switch 3 = type de réarmement ; switchs 5 et 6 = configuration de la ligne des DM.',
    aides: [
      '📖 Ouvre la 3e page du DTR 8 : « 6 Configuration » (§ 6.1 à 6.6).',
      '🧭 Méthode : § 6.4 pour le réarmement (switch 3) ; § 6.6 pour la surveillance de la ligne des DM à ouverture (switchs 5 et 6) ; tous les autres restent sur OFF.',
      '✏️ Forme de la réponse : ON ou OFF pour chacun des 8 micro-switchs.',
    ],
    erreursTypiques: [
      {
        id: 'a5-sans-surveillance', champ: 'SW.6', valeurs: ['ON'],
        message: 'Switch 6 sur ON : c’est la configuration « DM à ouverture sans surveillance de ligne » (§ 6.6).',
      },
      {
        id: 'a5-rearmement', champ: 'SW.3', valeurs: ['OFF'],
        message: 'Switch 3 sur OFF : la Type 4 attend aussi son propre réarmement (§ 6.4) ; relis la demande.',
      },
    ],
    explication: 'Switch 3 sur ON (Type 4 réarmée après réarmement du DM) ; switchs 5 et 6 sur OFF (DM à ouverture avec surveillance de ligne) ; tous les autres sur OFF.',
  },
];

