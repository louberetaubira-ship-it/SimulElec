/**
 * Partie E (partie 5) — Étude de l’installation d’une éolienne (60 points, pages 27 à 35 du
 * sujet, DTR 28 à 34).
 *
 * Barème : le corrigé officiel ne détaille pas les points question par question (seul le total
 * de la partie, 60 points, est imprimé) ; la répartition ci-dessous est faite au prorata du
 * travail demandé (lecture 1 pt, calcul 1 à 2 pts, choix justifié 2 pts, schéma 12 pts) et
 * totalise exactement 60 points.
 *
 * Repères : le papier imprime deux fois le titre « E.2.1.5 » (p. 30, un seul tableau à cocher :
 * une seule question) et deux fois « E.3.3.2.2 » (p. 34 : rendement de l’onduleur, puis
 * estimation finale de production). Les repères devant être uniques, le second est noté
 * « E.3.3.2.2 (bis) ».
 */
import type { QSchema, SujetPartie } from '@/lib/sujet/types';
import { IMG, champNum, champTxt, choix, libre, pageDtr, pagesDtr, ref, txt, type QuestionSansNum } from './commun';

export const PARTIE_E: SujetPartie = {
  num: 5,
  titre: 'Étude de l’installation d’une éolienne',
  objectifs: [
    'Étudier le fonctionnement de l’installation ainsi que la configuration du matériel.',
    'Choisir le matériel permettant l’alimentation de la chèvrerie en autoconsommation avec vente du surplus.',
    'Évaluer la production d’électricité et la rentabilité de l’installation.',
  ],
  competences: ['C1', 'C3', 'C5', 'C10', 'C11', 'C13'],
  situation: 'Le propriétaire de la chèvrerie souhaite optimiser sa facture d’électricité. Pour ceci il demande une étude pour la mise en place d’une éolienne : L’ANTARIS 3,5 kW qu’un commercial lui a proposé au prix très avantageux de 1659 €. L’installation se fera sous abri adossé au bâtiment chèvrerie. Afin d’éviter une demande de permis de construire, l’éolienne sera installée sur un mât de 12 m de hauteur. D’après les données de la station météo de la bergerie installé 35 m plus haut que le niveau de l’éolienne, nous avons relevé une vitesse moyenne des vents de 5,8 m/s sur l’année. Lieu d’installation du mât : dans le couloir de vent, entouré d’arbres et de haies.',
  dtrPages: [pageDtr(28), pageDtr(29), pageDtr(30), pageDtr(31), pageDtr(32), pageDtr(33), pageDtr(34)],
};

/* ───────────────────────────── E.2.2.2 — schéma de raccordement ───────────────────────────── */

/**
 * Image : assemblage des deux pages du schéma vierge (p. 31 « coté gestion éolienne » à gauche,
 * p. 32 « partie AC » à droite), recadrées depuis `sujet-31.jpg` et `sujet-32.jpg`. Les onduleurs
 * figurent sur les deux moitiés : entrées DC à gauche, câble 3G6 (N, L, PE) à droite. Le câble
 * 5G16 venant du TGBT est déjà raccordé en amont de Q3 et à la barrette de terre (imprimé).
 */
const E222_TRAITS: QSchema['traits'] = {
  image: {
    src: `${IMG}/q-e222-schema.jpg`,
    alt: 'Schéma de raccordement à compléter : éolienne, WBP-box, résistance de charge, onduleurs 1 à 3 (entrées DC et câbles 3G6), tableau AC (Q3, répartiteur, parafoudre, disjoncteurs différentiels Od 1 à Od 3, barrette de terre)',
    w: 1640, h: 930,
  },
  bornes: [
    // Côté gestion éolienne (moitié gauche)
    { id: 'EOL.L1', x: 15.35, y: 30.35, label: 'Éolienne — conducteur 1 (sortie interrupteur)' },
    { id: 'EOL.L2', x: 15.35, y: 31.8, label: 'Éolienne — conducteur 2 (sortie interrupteur)' },
    { id: 'EOL.L3', x: 15.35, y: 33.23, label: 'Éolienne — conducteur 3 (sortie interrupteur)' },
    { id: 'WBP.L1', x: 28.48, y: 30.75, label: 'WBP-box — L1 (Alternator)' },
    { id: 'WBP.L2', x: 29.15, y: 30.75, label: 'WBP-box — L2 (Alternator)' },
    { id: 'WBP.L3', x: 29.85, y: 30.75, label: 'WBP-box — L3 (Alternator)' },
    { id: 'WBP.DC+', x: 31.59, y: 30.75, label: 'WBP-box — DC+' },
    { id: 'WBP.DC-', x: 34.02, y: 30.75, label: 'WBP-box — DC−' },
    { id: 'WBP.LR+', x: 39.57, y: 30.75, label: 'WBP-box — LR+ (résistance de charge)' },
    { id: 'WBP.LR-', x: 40.29, y: 30.75, label: 'WBP-box — LR− (résistance de charge)' },
    { id: 'WBP.PE', x: 42.23, y: 30.75, label: 'WBP-box — PE' },
    { id: 'RES.+', x: 39.02, y: 70.16, label: 'Résistance de charge — +' },
    { id: 'RES.-', x: 38.87, y: 71.37, label: 'Résistance de charge — −' },
    { id: 'RES.PE', x: 39.7, y: 71.37, label: 'Résistance de charge — PE' },
    { id: 'OD1.DC+', x: 6.4, y: 53.49, label: 'Onduleur 1 — entrée DC +' },
    { id: 'OD1.DC-', x: 10.55, y: 53.49, label: 'Onduleur 1 — entrée DC −' },
    { id: 'OD2.DC+', x: 6.4, y: 73.82, label: 'Onduleur 2 — entrée DC +' },
    { id: 'OD2.DC-', x: 10.55, y: 73.82, label: 'Onduleur 2 — entrée DC −' },
    { id: 'OD3.DC+', x: 6.4, y: 94.14, label: 'Onduleur 3 — entrée DC +' },
    { id: 'OD3.DC-', x: 10.55, y: 94.14, label: 'Onduleur 3 — entrée DC −' },
    // Partie AC (moitié droite)
    { id: 'OD1.N', x: 65.09, y: 30.91, label: 'Onduleur 1 — câble 3G6 : N (bleu)' },
    { id: 'OD1.L', x: 65.47, y: 32.53, label: 'Onduleur 1 — câble 3G6 : L' },
    { id: 'OD1.PE', x: 65.7, y: 33.87, label: 'Onduleur 1 — câble 3G6 : PE' },
    { id: 'OD2.N', x: 65.09, y: 54.35, label: 'Onduleur 2 — câble 3G6 : N (bleu)' },
    { id: 'OD2.L', x: 65.47, y: 55.97, label: 'Onduleur 2 — câble 3G6 : L' },
    { id: 'OD2.PE', x: 65.7, y: 57.31, label: 'Onduleur 2 — câble 3G6 : PE' },
    { id: 'OD3.N', x: 65.09, y: 77.8, label: 'Onduleur 3 — câble 3G6 : N (bleu)' },
    { id: 'OD3.L', x: 65.47, y: 79.41, label: 'Onduleur 3 — câble 3G6 : L' },
    { id: 'OD3.PE', x: 65.7, y: 80.75, label: 'Onduleur 3 — câble 3G6 : PE' },
    { id: 'QG.N', x: 76.52, y: 41.69, label: 'Q3 (tête du tableau) — N aval' },
    { id: 'QG.L1', x: 77.7, y: 41.69, label: 'Q3 (tête du tableau) — L1 aval' },
    { id: 'QG.L2', x: 78.86, y: 41.69, label: 'Q3 (tête du tableau) — L2 aval' },
    { id: 'QG.L3', x: 80.04, y: 41.69, label: 'Q3 (tête du tableau) — L3 aval' },
    { id: 'REP.L1', x: 85.16, y: 31.72, label: 'Répartiteur — barreau L1 (1er)' },
    { id: 'REP.L2', x: 85.16, y: 34.76, label: 'Répartiteur — barreau L2 (2e)' },
    { id: 'REP.L3', x: 85.16, y: 38.89, label: 'Répartiteur — barreau L3 (3e)' },
    { id: 'REP.N', x: 85.16, y: 42.83, label: 'Répartiteur — barreau N (4e, en bas)' },
    { id: 'PF.N', x: 89.94, y: 31.11, label: 'Parafoudre — N' },
    { id: 'PF.L1', x: 91.16, y: 31.11, label: 'Parafoudre — L1' },
    { id: 'PF.L2', x: 92.32, y: 31.11, label: 'Parafoudre — L2' },
    { id: 'PF.L3', x: 93.49, y: 31.11, label: 'Parafoudre — L3' },
    { id: 'PF.PE', x: 97.6, y: 42.12, label: 'Parafoudre — borne de terre' },
    { id: 'DD1.N1', x: 76.73, y: 57.71, label: 'Od 1 — N arrivée (haut)' },
    { id: 'DD1.L1', x: 77.29, y: 57.71, label: 'Od 1 — L arrivée (haut)' },
    { id: 'DD1.N2', x: 77.91, y: 68.28, label: 'Od 1 — N sortie (bas)' },
    { id: 'DD1.L2', x: 78.46, y: 68.28, label: 'Od 1 — L sortie (bas)' },
    { id: 'DD2.N1', x: 79.31, y: 57.71, label: 'Od 2 — N arrivée (haut)' },
    { id: 'DD2.L1', x: 79.88, y: 57.71, label: 'Od 2 — L arrivée (haut)' },
    { id: 'DD2.N2', x: 80.49, y: 68.28, label: 'Od 2 — N sortie (bas)' },
    { id: 'DD2.L2', x: 81.04, y: 68.28, label: 'Od 2 — L sortie (bas)' },
    { id: 'DD3.N1', x: 81.71, y: 57.71, label: 'Od 3 — N arrivée (haut)' },
    { id: 'DD3.L1', x: 82.27, y: 57.71, label: 'Od 3 — L arrivée (haut)' },
    { id: 'DD3.N2', x: 82.88, y: 68.28, label: 'Od 3 — N sortie (bas)' },
    { id: 'DD3.L2', x: 83.43, y: 68.28, label: 'Od 3 — L sortie (bas)' },
    { id: 'PE.BAR', x: 84.15, y: 76.56, label: 'Barrette de terre du tableau' },
  ],
  couleurs: [
    { id: 'rouge', label: 'Rouge (DC +)', css: '#d62828' },
    { id: 'noir', label: 'Noir (phase / DC −)', css: '#161616' },
    { id: 'bleu', label: 'Bleu (neutre / DC −)', css: '#1f6fd6' },
    { id: 'vert', label: 'Vert-jaune (PE)', css: '#3d9a2a' },
    { id: 'marron', label: 'Marron (phase)', css: '#7b4a1f' },
  ],
  // Liaisons du corrigé (p. 31 et 32). Notées en couleur : DC+ en rouge, neutre AC en bleu,
  // PE en vert-jaune ; couleur libre pour les conducteurs de l'éolienne, le DC − et les phases.
  attendues: [
    { a: 'EOL.L1', b: 'WBP.L1' },
    { a: 'EOL.L2', b: 'WBP.L2' },
    { a: 'EOL.L3', b: 'WBP.L3' },
    { a: 'WBP.DC+', b: 'OD1.DC+', couleur: 'rouge' },
    { a: 'WBP.DC+', b: 'OD2.DC+', couleur: 'rouge' },
    { a: 'WBP.DC+', b: 'OD3.DC+', couleur: 'rouge' },
    { a: 'WBP.DC-', b: 'OD1.DC-' },
    { a: 'WBP.DC-', b: 'OD2.DC-' },
    { a: 'WBP.DC-', b: 'OD3.DC-' },
    { a: 'WBP.LR+', b: 'RES.+' },
    { a: 'WBP.LR-', b: 'RES.-' },
    { a: 'WBP.PE', b: 'RES.PE', couleur: 'vert' },
    { a: 'QG.N', b: 'REP.N', couleur: 'bleu' },
    { a: 'QG.L1', b: 'REP.L1' },
    { a: 'QG.L2', b: 'REP.L2' },
    { a: 'QG.L3', b: 'REP.L3' },
    { a: 'REP.N', b: 'PF.N', couleur: 'bleu' },
    { a: 'REP.L1', b: 'PF.L1' },
    { a: 'REP.L2', b: 'PF.L2' },
    { a: 'REP.L3', b: 'PF.L3' },
    { a: 'REP.N', b: 'DD1.N1', couleur: 'bleu' },
    { a: 'REP.N', b: 'DD2.N1', couleur: 'bleu' },
    { a: 'REP.N', b: 'DD3.N1', couleur: 'bleu' },
    { a: 'REP.L1', b: 'DD1.L1' },
    { a: 'REP.L2', b: 'DD2.L1' },
    { a: 'REP.L3', b: 'DD3.L1' },
    { a: 'DD1.N2', b: 'OD1.N', couleur: 'bleu' },
    { a: 'DD1.L2', b: 'OD1.L' },
    { a: 'DD2.N2', b: 'OD2.N', couleur: 'bleu' },
    { a: 'DD2.L2', b: 'OD2.L' },
    { a: 'DD3.N2', b: 'OD3.N', couleur: 'bleu' },
    { a: 'DD3.L2', b: 'OD3.L' },
    { a: 'OD1.PE', b: 'PE.BAR', couleur: 'vert' },
    { a: 'OD2.PE', b: 'PE.BAR', couleur: 'vert' },
    { a: 'OD3.PE', b: 'PE.BAR', couleur: 'vert' },
    { a: 'PF.PE', b: 'PE.BAR', couleur: 'vert' },
  ],
  // Correction par réseau : le répartiteur peut être contourné (Q3 → parafoudre / Od direct),
  // tout tracé qui met les bornes d'un réseau au même potentiel est juste. Répartition des
  // onduleurs sur les phases : Od 1 sur L1, Od 2 sur L2, Od 3 sur L3 (équilibrage).
  reseaux: [
    { label: 'Éolienne conducteur 1', bornes: ['EOL.L1', 'WBP.L1'] },
    { label: 'Éolienne conducteur 2', bornes: ['EOL.L2', 'WBP.L2'] },
    { label: 'Éolienne conducteur 3', bornes: ['EOL.L3', 'WBP.L3'] },
    { label: 'Bus DC +', couleur: 'rouge', bornes: ['WBP.DC+', 'OD1.DC+', 'OD2.DC+', 'OD3.DC+'] },
    { label: 'Bus DC −', bornes: ['WBP.DC-', 'OD1.DC-', 'OD2.DC-', 'OD3.DC-'] },
    { label: 'Résistance de charge +', bornes: ['WBP.LR+', 'RES.+'] },
    { label: 'Résistance de charge −', bornes: ['WBP.LR-', 'RES.-'] },
    { label: 'PE côté éolienne', couleur: 'vert', bornes: ['WBP.PE', 'RES.PE'] },
    { label: 'Neutre du tableau AC', couleur: 'bleu', bornes: ['QG.N', 'REP.N', 'PF.N', 'DD1.N1', 'DD2.N1', 'DD3.N1'] },
    { label: 'Phase L1 (Od 1)', bornes: ['QG.L1', 'REP.L1', 'PF.L1', 'DD1.L1'] },
    { label: 'Phase L2 (Od 2)', bornes: ['QG.L2', 'REP.L2', 'PF.L2', 'DD2.L1'] },
    { label: 'Phase L3 (Od 3)', bornes: ['QG.L3', 'REP.L3', 'PF.L3', 'DD3.L1'] },
    { label: 'Onduleur 1 — neutre', couleur: 'bleu', bornes: ['DD1.N2', 'OD1.N'] },
    { label: 'Onduleur 1 — phase', bornes: ['DD1.L2', 'OD1.L'] },
    { label: 'Onduleur 2 — neutre', couleur: 'bleu', bornes: ['DD2.N2', 'OD2.N'] },
    { label: 'Onduleur 2 — phase', bornes: ['DD2.L2', 'OD2.L'] },
    { label: 'Onduleur 3 — neutre', couleur: 'bleu', bornes: ['DD3.N2', 'OD3.N'] },
    { label: 'Onduleur 3 — phase', bornes: ['DD3.L2', 'OD3.L'] },
    { label: 'PE côté AC (onduleurs, parafoudre)', couleur: 'vert', bornes: ['OD1.PE', 'OD2.PE', 'OD3.PE', 'PF.PE', 'PE.BAR'] },
  ],
};

/* ───────────────────────────── Questions ───────────────────────────── */

const CONTEXTE_E2 = 'L’installation sera raccordée au réseau triphasé du propriétaire, directement au TGBT du site. Il convient donc de déterminer la structure de l’installation (nombre de redresseurs/régulateurs de tensions, d’onduleurs, de protections). Pour des raisons de compatibilité de suivi de garantie et configuration des communications entre les différents composants nous prendrons du matériel de la marque SMA. L’installation électrique étant sous abri contre la bergerie et non dans un local fermé, tout le matériel devra être au minima **IP 55** ou, devra pouvoir être monté en extérieur (libre choix de montage).';

const IMG_STRUCTURE = {
  src: `${IMG}/q-e21-structure.jpg`,
  alt: 'Structure de base : A petite éolienne avec générateur à aimant permanent, B redresseur, C protection contre les surtensions, D onduleurs pour énergie éolienne avec régulation des turbines, E réseau électrique public',
};

const CONTEXTE_E22 = 'Le matériel commandé pour la réalisation de notre installation de production électrique sera composé des onduleurs SMA Windy Boy 5000A, d’une résistance de charge BW 155, d’un régulateur de surtension WBP-box 600-11, de câble solaire unipolaire en cuivre de 6 mm² (pour le câblage de l’éolienne jusqu’au WBP et coté DC des onduleurs) et du matériel électrique conventionnel.';

const CONTEXTE_E331 = 'E.3.3. Détermination des pertes en ligne et dans des composants de l’installation. E.3.3.1. Pertes en ligne dues à l’échauffement dans les câbles sachant que la distance entre l’éolienne et la bergerie est de 70 m. Tenir compte de la hauteur du mât.';

const CONTEXTE_E4 = 'Estimation de production par an : 2 200 kWh. Un onduleur SMA Windy Boy 5000A coûte 2155 €. Un redresseur régulateur de surtension WBP-box 600-11 coûte 1680 €. Une bobine 500 m de câble solaire de 6 mm² coûte 599 €. La résistance de charge coûte 386 €. Le tableau électrique reviendra à 788 €. Le raccordement électrique de l’installation est estimé à deux jours de travail à deux intervenants (sachant que la tarification d’une heure de travail pour un intervenant sera facturée 45 €). Le coût d’une tranchée avec la gaine revient à 30 € le mètre linéaire. Et enfin la fondation avec ferraillage et béton pour le mât de l’éolienne coûte environ 1300 €. Le mât de l’éolienne est compris dans la proposition du commercial.';

export const QUESTIONS_E: QuestionSansNum[] = [
  /* ═══════════════ E.1 — L’éolienne ═══════════════ */
  {
    label: 'E.1.1', partie: 5, type: 'cocher',
    enonce: '**Donner** le type de génératrice équipant l’éolienne.',
    competence: 'C3', points: 1, dtr: [pageDtr(28)], pageSujet: 28,
    options: ['Triphasé synchrone', 'Triphasé asynchrone', 'Courant continue', 'Asynchrone monophasé'], bonnes: [0],
    indice: 'Tableau « Alternateur » du DTR 28, ligne « Type » : un alternateur à aimant permanent est une machine synchrone.',
    aides: [
      '📖 Ouvre le DTR 28 (l’éolienne) : tableau « Alternateur », ligne « Type ».',
      '🧭 Méthode : le document donne le nombre de phases et le mode d’excitation (aimant permanent). Une machine dont le rotor est un aimant tourne au synchronisme du champ qu’elle produit : déduis-en la famille de la machine.',
      '✏️ Forme de la réponse : une seule case, qui précise à la fois le nombre de phases et la famille (synchrone ou asynchrone).',
    ],
    erreursTypiques: [
      {
        id: 'e111-asynchrone', valeurs: ['Triphasé asynchrone', 'Asynchrone monophasé'],
        message: 'Une machine asynchrone a besoin d’un champ tournant fourni par le réseau ; ici le rotor est un aimant permanent : relis la ligne « Type » du DTR 28.',
      },
      {
        id: 'e111-continu', valeurs: ['Courant continue'],
        message: 'Le courant continu n’apparaît qu’après le redresseur : relis la ligne « Type » de l’alternateur (DTR 28).',
      },
    ],
    explication: 'DTR 28 : alternateur « triphasé, aimant permanent » ; un alternateur à aimant permanent est une génératrice synchrone → triphasé synchrone.',
  },
  {
    label: 'E.1.2', partie: 5, type: 'calcul',
    enonce: '**Calculer** la vitesse du vent destructeur pour notre éolienne en km/h.',
    competence: 'C5', points: 2, dtr: [pageDtr(28)], pageSujet: 28,
    grandeur: 'V', unite: 'km/h',
    formule: 'V (km/h) = V (m/s) × 3600 / 1000 = V (m/s) × 3,6',
    formuleMotsCles: ['3,6'],
    attendu: 209, tolerance: 1, arrondi: 'à l’unité',
    indice: 'Vent destructeur : > 58 m/s (DTR 28) ; 1 m/s = 3,6 km/h.',
    aides: [
      '📖 Ouvre le DTR 28 : tableau « Données de l’éolienne », ligne « Vitesse vent destructeur » (en m/s).',
      '🧭 Méthode : convertis des m/s en km/h : en une heure il y a 3600 s, et 1 km = 1000 m. Multiplie donc par 3600 puis divise par 1000.',
      '✏️ Forme de la réponse : V = … (formule de conversion) = … × … (application numérique) = … km/h (arrondi à l’unité).',
    ],
    erreursTypiques: [
      {
        id: 'e12-division', nombre: { valeur: 16.1, tolerance: 0.1 },
        message: 'Tu as divisé par 3,6 : pour passer des m/s aux km/h, on MULTIPLIE (une vitesse en km/h est un nombre plus grand).',
      },
      {
        id: 'e12-orage', nombre: { valeur: 46.8, tolerance: 0.5 },
        message: 'Tu as converti la vitesse de « Protection orage » : la question porte sur le vent DESTRUCTEUR (DTR 28).',
      },
    ],
    formuleSpec: {
      attendues: ['3.6\\times v', '\\frac{3600\\times v}{1000}'],
      variables: { v: { min: 5, max: 80 } },
      affichage: 'V (km/h) = v (m/s) × 3600 / 1000',
    },
    explication: 'Vitesse du vent destructeur : 58 m/s (DTR 28), soit 58 × 3600 = 208 800 m/h, soit 208 800 / 1000 ≈ 209 km/h.',
  },
  {
    label: 'E.1.3', partie: 5, type: 'valeur',
    enonce: '**Définir** la puissance que fournira l’éolienne avec un vent de 10 m/s.',
    competence: 'C3', points: 1, dtr: [pagesDtr(28)[1]], pageSujet: 28,
    // Corrigé officiel : « entre 3,7 et 4 kW sur la courbe de l’éolienne » → 3,85 kW ± 0,3.
    champs: [champNum('P', 'Puissance fournie à 10 m/s', 3.85, 0.3, 'kW')],
    indice: 'Courbe de puissance de l’ANTARIS 3,5 kW (DTR 28, 2e page), abscisse 10 m/s.',
    aides: [
      '📖 Ouvre la 2e page du DTR 28 : « Courbe de puissance de l’éolienne ANTARIS 3.5kW ».',
      '🧭 Méthode : place 10 m/s sur l’axe horizontal (entre les graduations 9 et 11), monte verticalement jusqu’à la courbe, puis lis la puissance sur l’axe vertical, en kW.',
      '✏️ Forme de la réponse : P ≈ … kW (lecture graphique : une valeur à une ou deux décimales).',
    ],
    erreursTypiques: [
      {
        id: 'e13-nominale', champ: 'P', nombre: { valeur: 3.5, tolerance: 0.05 },
        message: 'Tu as recopié la puissance commerciale de l’éolienne : la question demande une LECTURE sur la courbe de puissance, à 10 m/s.',
      },
      {
        id: 'e13-max', champ: 'P', nombre: { valeur: 6.8, tolerance: 0.1 },
        message: 'C’est la puissance maximale (palier de la courbe) : lis la courbe à l’abscisse 10 m/s.',
      },
    ],
    explication: 'Sur la courbe de puissance du DTR 28, un vent de 10 m/s donne une puissance comprise entre 3,7 et 4 kW.',
  },
  {
    label: 'E.1.4', partie: 5, type: 'redige',
    enonce: '**Proposer** des solutions en cas de vent supérieurs au vent destructeur.',
    competence: 'C3', points: 1, dtr: [pageDtr(28)], pageSujet: 28,
    motsCles: ['aucune', 'demonter', 'tempete', '58', 'destructeur', 'protection'],
    minMotsCles: 2, lignes: 3,
    corrige: 'Aucune : il faudra démonter l’éolienne, car la protection tempête ne fonctionne que jusqu’à 58 m/s (vent destructeur).',
    indice: 'Au-delà de 58 m/s, les protections automatiques (position hélicoptère, freinage) ne suffisent plus.',
    aides: [
      '📖 Relis le DTR 28 : lignes « Protection orage » et « Vitesse vent destructeur », et le tableau « Protection orage » (système automatique, manuel).',
      '🧭 Méthode : les protections décrites protègent l’éolienne JUSQU’AU vent destructeur. Au-delà, peut-on encore agir sur la machine en fonctionnement, ou faut-il la mettre à l’abri ?',
      '✏️ Forme de la réponse : une phrase qui dit s’il existe une solution technique, puis la mesure à prendre et sa justification (limite de la protection tempête).',
    ],
    explication: 'Aucune solution technique : la protection tempête (position hélicoptère, frein) fonctionne jusqu’à 58 m/s ; au-delà, il faudra démonter l’éolienne.',
  },
  {
    label: 'E.1.5', partie: 5, type: 'valeur',
    enonce: '**Relever** la vitesse de rotation des pâles de l’éolienne avec un vent de 2,8 m/s.',
    competence: 'C3', points: 1, dtr: [pageDtr(28)], pageSujet: 28,
    champs: [champNum('n', 'Vitesse de rotation', 115, 0, 'tr/min')],
    indice: '2,8 m/s est la vitesse de vent de démarrage : la production commence au bas de la « Vitesse de production ».',
    aides: [
      '📖 Ouvre le DTR 28 : tableau « Données de l’éolienne », lignes « Vitesse vent démarrage » et « Vitesse de production ».',
      '🧭 Méthode : repère à quoi correspond un vent de 2,8 m/s pour cette éolienne, puis cherche la vitesse de rotation (en rpm = tours par minute) au début de la production.',
      '✏️ Forme de la réponse : n = … tr/min (un nombre entier lu dans le tableau).',
    ],
    erreursTypiques: [
      {
        id: 'e15-max', champ: 'n', nombre: { valeur: 430, tolerance: 0 },
        message: 'C’est la vitesse de rotation en FIN de plage de production : à 2,8 m/s l’éolienne ne fait que démarrer.',
      },
      {
        id: 'e15-plage', champ: 'n', nombre: { valeur: 600, tolerance: 0 },
        message: 'C’est la borne haute de l’amplitude des vitesses : relis la ligne « Vitesse de production ».',
      },
    ],
    explication: '2,8 m/s est la vitesse de démarrage de la production ; la plage de production commence à 115 rpm, soit 115 tr/min (DTR 28).',
  },
  {
    label: 'E.1.6', partie: 5, type: 'calcul',
    enonce: '**Calculer** le courant maximal que pourra délivrer l’éolienne (avec cos φ = 1).',
    competence: 'C5', points: 2, dtr: [pageDtr(28)], pageSujet: 28,
    grandeur: 'I', unite: 'A',
    formule: 'I = Pmax / (√3 × U × cos φ)',
    formuleMotsCles: ['√3', 'cos'],
    attendu: 11.2, tolerance: 0.1, arrondi: '1 décimale',
    indice: 'Puissance de sortie maximum 6,8 kW, tension nominale 350 V AC triphasé (DTR 28).',
    aides: [
      '📖 Ouvre le DTR 28 : tableau « Alternateur » — puissance de sortie maximum, tension nominale et type (nombre de phases).',
      '🧭 Méthode : le courant MAXIMAL correspond à la puissance maximale (pas nominale). En triphasé, P = √3 × U × I × cos φ : isole I, avec U la tension entre phases et cos φ = 1.',
      '✏️ Forme de la réponse : I = … (formule avec P, U et cos φ) = … (application numérique, P en W) = … A (1 décimale).',
    ],
    erreursTypiques: [
      {
        id: 'e16-sans-racine3', formule: '\\frac{P}{U\\cos\\varphi}',
        message: 'L’alternateur est TRIPHASÉ : la puissance s’écrit P = √3 × U × I × cos φ. Il manque √3 dans ta formule.',
      },
      {
        id: 'e16-sans-racine3-resultat', nombre: { valeur: 19.4, tolerance: 0.1 },
        message: 'Ton résultat correspond à un calcul monophasé (sans √3) : l’alternateur est triphasé.',
      },
      {
        id: 'e16-nominale', nombre: { valeur: 6.1, tolerance: 0.1 },
        message: 'Tu as pris la puissance nominale : le courant MAXIMAL se calcule avec la puissance de sortie maximum.',
      },
    ],
    formuleSpec: {
      attendues: ['\\frac{P}{\\sqrt{3}\\times U\\times\\cos\\varphi}'],
      membreGauche: ['I', 'I_{max}', 'I_{m}'],
      // cos φ = 1 imposé par l'énoncé : φ = 0 rend « P / (√3 U) » équivalent.
      variables: { P: { min: 1000, max: 10000 }, U: { min: 200, max: 500 }, '\\varphi': { min: 0, max: 0 } },
      affichage: 'I = P / (√3 × U × cos φ)',
    },
    explication: 'Pmax = 6,8 kW, U = 350 V AC triphasé : I = 6800 / (√3 × 350 × 1) = 11,217 A ≈ 11,2 A.',
  },

  /* ═══════════════ E.2 — Composition de l’installation ═══════════════ */
  {
    label: 'E.2.1.1', partie: 5, type: 'redige',
    enonce: '**Donner** l’utilité du redresseur en position B.',
    contexte: CONTEXTE_E2,
    image: IMG_STRUCTURE,
    competence: 'C1', points: 1.5, dtr: [pagesDtr(29)[2]], pageSujet: 29,
    motsCles: ['transform', 'triphase', 'alternati', 'frequence', 'variable', 'continu'],
    minMotsCles: 3, lignes: 3,
    corrige: 'Transformer la tension triphasée de sortie de l’éolienne, donc à fréquence variable, en tension continue.',
    indice: 'Un redresseur transforme l’alternatif en continu ; la fréquence de l’alternateur dépend de la vitesse du vent.',
    aides: [
      '📖 Relis le DTR 29 (« Détails du produit », § 3) : la phrase qui décrit le redresseur passif (pont B6).',
      '🧭 Méthode : précise la nature de la tension à l’ENTRÉE du redresseur (d’où vient-elle, combien de phases, sa fréquence est-elle fixe ?) et à sa SORTIE.',
      '✏️ Forme de la réponse : une phrase « Transformer la tension … (entrée) en tension … (sortie) ».',
    ],
    explication: 'Le redresseur transforme la tension triphasée de sortie d’éolienne, donc à fréquence variable (elle dépend de la vitesse de rotation), en tension continue pour les onduleurs.',
  },
  {
    label: 'E.2.1.2', partie: 5, type: 'cocher', multiple: true,
    enonce: '**Cocher** les fonctions de la structure de base, qui sont réalisées par le Windy Boy Protect Box de SMA.',
    image: IMG_STRUCTURE,
    competence: 'C1', points: 1, dtr: [pagesDtr(29)[2]], pageSujet: 29,
    options: ['A', 'B', 'C', 'D', 'E'], bonnes: [1, 2],
    indice: 'La WBP-box se compose de deux éléments essentiels (DTR 29, § 3).',
    aides: [
      '📖 Relis le DTR 29, § 3 « Détails du produit » : la liste des « deux composants essentiels » et le schéma « Windy Boy Protection Box ».',
      '🧭 Méthode : compare les deux composants de la WBP-box aux désignations A à E de la structure de base. L’éolienne, les onduleurs (Windy Boy) et le réseau sont des appareils extérieurs à la boîte.',
      '✏️ Forme de la réponse : coche uniquement les lettres des fonctions intégrées à la boîte (plusieurs cases possibles).',
    ],
    erreursTypiques: [
      {
        id: 'e212-onduleur', valeurs: ['D'],
        message: 'Les onduleurs (Windy Boy) sont des appareils séparés, raccordés en aval de la WBP-box : relis le schéma du DTR 29.',
      },
    ],
    explication: 'La Windy Boy Protection Box intègre le redresseur (B) et la protection contre les surtensions (C) ; l’éolienne (A), les onduleurs (D) et le réseau (E) sont extérieurs.',
  },
  {
    label: 'E.2.1.3', partie: 5, type: 'tableau',
    enonce: 'D’après la documentation SMA et celle de l’éolienne, **choisir** le SMA Windy Boy Protect Box à commander. **Justifier** votre réponse.',
    competence: 'C3', points: 2, dtr: [pagesDtr(29)[4], pageDtr(28)], pageSujet: 29,
    colonnes: ['Réponse', 'Justification'],
    lignes: [{ cellules: [
      txt('e213-ref', ref('WBP-Box 600-11', 'WBP 600-11', 'WBP-Box 600', 'Windy Boy Protection Box 600-11', 'Windy Boy Protect Box 600-11')),
      libre('e213-just'),
    ] }],
    indice: 'Puissance maximum de l’éolienne (DTR 28) comparée aux puissances maximales admises par chaque WBP-Box (DTR 29, raccordement triphasé).',
    aides: [
      '📖 Relève la puissance de sortie MAXIMUM de l’éolienne (DTR 28), puis ouvre le DTR 29, § 4.2 « Raccordement au réseau biphasé ou triphasé » : tableau « Petite éolienne - système ».',
      '🧭 Méthode : la WBP-box doit accepter la puissance maximale que l’éolienne peut produire, pas seulement sa puissance commerciale : choisis la plus petite boîte dont la puissance maximale est supérieure.',
      '✏️ Forme de la réponse : Réponse : WBP-Box …-11 ; Justification : « puissance max de l’éolienne … kW, la WBP-Box … va jusqu’à … kW ».',
    ],
    erreursTypiques: [
      {
        id: 'e213-400', champ: 'e213-ref', valeurs: ref('WBP-Box 400-11', 'WBP 400-11'),
        message: 'Cette boîte est limitée à une éolienne de 3,5 kW : compare avec la puissance de sortie MAXIMUM de l’éolienne (DTR 28).',
      },
      {
        id: 'e213-500', champ: 'e213-ref', valeurs: ref('WBP-Box 500-11', 'WBP 500-11'),
        message: 'Cette boîte est limitée à 5 kW : l’éolienne peut fournir davantage (puissance de sortie maximum, DTR 28).',
      },
    ],
    explication: 'WBP-Box 600-11 : la puissance maximale de l’éolienne est de 6,8 kW et la WBP-Box 600-11 accepte une petite éolienne jusqu’à 7 kW.',
  },
  {
    label: 'E.2.1.4', partie: 5, type: 'tableau',
    enonce: '**Déterminer** la référence de la résistance de charge que l’on devra associer à la WBP-Box. **Justifier** votre réponse.',
    competence: 'C3', points: 2, dtr: [pageDtr(31), pagesDtr(29)[3]], pageSujet: 30,
    colonnes: ['Référence', 'Justification'],
    lignes: [{ cellules: [
      // Corrigé officiel : BW 155 / 10000 / IP 65 ; IP 66 figure dans la même colonne du DTR 31 et est accepté.
      txt('e214-ref', ref(
        'BW 155 / 10000 / IP 65', 'BW 155 / 10000 / IP65', 'BW 155/10000/IP65', 'BW 155 10000 IP 65', 'BW 155 / 10000 / IP 66',
        'BW 155/10000/IP66', 'BW 155 10000 IP 66',
      )),
      libre('e214-just'),
    ] }],
    indice: 'Exigences de la résistance de charge (DTR 29, § 3.2) : 600 V DC, 7 000 W ; montage extérieur → au moins IP 55 (colonne IP65/IP66 du DTR 31).',
    aides: [
      '📖 Relis les exigences de la résistance de charge (DTR 29, § 3.2) et la mise en situation E.2 (indice de protection minimal), puis ouvre le DTR 31 (tableaux BW 155 et BW 155 - combination).',
      '🧭 Méthode : trois critères à vérifier : l’indice de protection (quelle colonne de puissance lire ?), la puissance permanente dans CETTE colonne (au moins celle exigée par la WBP-box) et la tension maximale d’emploi.',
      '✏️ Forme de la réponse : Référence : BW 155 / … / IP … ; Justification : IP …, puissance … W ≥ … W, tension … V ≥ … V.',
    ],
    erreursTypiques: [
      {
        id: 'e214-colonne-ip20', champ: 'e214-ref', valeurs: ref('BW 155 / 7500 / IP 65', 'BW 155/7500/IP65', 'BW 155 / 7500 / IP 20', 'BW 155/7500/IP20', 'BW 155 / 7500'),
        message: 'La 7500 ne donne 7500 W qu’en IP20 : à l’extérieur (IP 55 minimum), lis la colonne IP65/IP66, où sa puissance est trop faible.',
      },
      {
        id: 'e214-9000', champ: 'e214-ref', valeurs: ref('BW 155 / 9000 / IP 65', 'BW 155/9000/IP65'),
        message: 'En IP65, cette résistance ne dissipe que 6750 W : c’est moins que la puissance permanente exigée par la WBP-box (DTR 29, § 3.2).',
      },
    ],
    explication: 'BW 155 / 10000 / IP 65 : IP minimal IP 55 car montage à l’extérieur, donc IP65 ; puissance de dissipation minimale pour la WBP-Box 7000 W, donc la 10000 (7500 W en IP65) ; tension minimale 600 V, ici 900 V.',
  },
  {
    label: 'E.2.1.5', partie: 5, type: 'cocher', multiple: true,
    // Le papier imprime deux fois ce titre (p. 30) pour un seul tableau : une seule question.
    enonce: '**Cocher** le nombre d’appareils nécessaire dans l’installation.',
    contexte: 'Tableau : pour chaque appareil, cocher 1, 2 ou 3.',
    competence: 'C3', points: 1.5, dtr: [pagesDtr(29)[4]], pageSujet: 30,
    options: [
      'Résistance de charge : 1', 'Résistance de charge : 2', 'Résistance de charge : 3',
      'Boite de protection contre les surtensions : 1', 'Boite de protection contre les surtensions : 2', 'Boite de protection contre les surtensions : 3',
      'Onduleur raccordé réseau : 1', 'Onduleur raccordé réseau : 2', 'Onduleur raccordé réseau : 3',
    ],
    bonnes: [0, 3, 8],
    indice: 'Raccordement TRIPHASÉ d’une éolienne jusqu’à 7 kW (DTR 29, § 4.2).',
    aides: [
      '📖 Ouvre le DTR 29, § 4.2 « Raccordement au réseau biphasé ou triphasé » : tableau « Petites installations éoliennes avec une puissance jusqu’au 7 kW ».',
      '🧭 Méthode : l’installation est raccordée au réseau triphasé. Lis, pour la ligne de la WBP-Box choisie, le nombre de chaque appareil (colonne « Petite éolienne - système » et colonne « Windy Boy »).',
      '✏️ Forme de la réponse : une seule case par ligne (résistance, boîte de protection, onduleur).',
    ],
    erreursTypiques: [
      {
        id: 'e215-mono', valeurs: ['Onduleur raccordé réseau : 1'],
        message: 'Un seul onduleur correspond au raccordement MONOPHASÉ (§ 4.1) : l’installation est raccordée au réseau triphasé.',
      },
      {
        id: 'e215-trois-box', valeurs: ['Boite de protection contre les surtensions : 3', 'Résistance de charge : 3'],
        message: 'Jusqu’à trois onduleurs se raccordent sur UNE seule WBP-box (DTR 29, § 4.2) : relis la colonne « Petite éolienne - système ».',
      },
    ],
    explication: 'Raccordement triphasé jusqu’à 7 kW (DTR 29, § 4.2) : 1 résistance de charge, 1 boîte de protection contre les surtensions (WBP-Box 600-11) et 3 onduleurs raccordés réseau (3 × Windy Boy 5000A).',
  },
  {
    label: 'E.2.2.1.1', partie: 5, type: 'valeur',
    enonce: '**Donner** le courant max en sortie des onduleurs.',
    contexte: CONTEXTE_E22,
    competence: 'C3', points: 1, dtr: [pagesDtr(30)[1]], pageSujet: 30,
    champs: [champNum('I', 'Courant max en sortie', 26, 0, 'A')],
    indice: 'Caractéristiques techniques du Windy Boy 5000A (DTR 30), rubrique « Sortie (AC) ».',
    aides: [
      '📖 Ouvre le DTR 30 : tableau « Caractéristiques techniques », colonne Windy Boy 5000A.',
      '🧭 Méthode : ne confonds pas l’entrée (DC) et la sortie (AC) : lis la ligne « Courant de sortie max. » de la rubrique « Sortie (AC) ».',
      '✏️ Forme de la réponse : I = … A.',
    ],
    explication: 'Windy Boy 5000A : courant de sortie max. 26,0 A (DTR 30, sortie AC).',
  },
  {
    label: 'E.2.2.1.2', partie: 5, type: 'valeur',
    enonce: '**Donner** la tension nominale AC des onduleurs.',
    competence: 'C3', points: 1, dtr: [pagesDtr(30)[1]], pageSujet: 30,
    champs: [champNum('U', 'Tension nominale AC', 230, 0, 'V')],
    indice: 'Ligne « Tension nominale AC / Plage de fonctionnement AC » (DTR 30) : en France, 230 V.',
    aides: [
      '📖 Ouvre le DTR 30 : ligne « Tension nominale AC / Plage de fonctionnement AC ».',
      '🧭 Méthode : le document propose plusieurs tensions nominales selon les pays : retiens celle du réseau basse tension français, et non la plage de fonctionnement.',
      '✏️ Forme de la réponse : U = … V.',
    ],
    erreursTypiques: [
      {
        id: 'e2212-dc', champ: 'U', nombre: { valeur: 270, tolerance: 0 },
        message: 'C’est la tension nominale côté DC (entrée) : la question porte sur la sortie AC.',
      },
      {
        id: 'e2212-tri', champ: 'U', nombre: { valeur: 400, tolerance: 0 },
        message: 'L’onduleur n’injecte que sur une phase (« Phases d’injection 1/1 ») : sa tension nominale est une tension simple.',
      },
    ],
    explication: 'Tension nominale AC : 230 V (DTR 30 : 220 V, 230 V, 240 V selon le réseau).',
  },
  {
    label: 'E.2.2.1.3', partie: 5, type: 'cocher',
    enonce: '**Indiquer** (en cochant) le type de tension nominale AC des onduleurs.',
    competence: 'C3', points: 1, dtr: [pagesDtr(30)[1]], pageSujet: 30,
    options: ['Triphasé', 'Biphasé', 'Monophasé'], bonnes: [2],
    indice: 'Ligne « Phases d’injection / Phases de raccordement » : 1 / 1.',
    aides: [
      '📖 Ouvre le DTR 30 : ligne « Phases d’injection / Phases de raccordement ».',
      '🧭 Méthode : le nombre de phases sur lesquelles l’onduleur injecte donne le type de tension. C’est parce qu’il y en a trois que l’installation reste triphasée au total.',
      '✏️ Forme de la réponse : une seule case.',
    ],
    erreursTypiques: [
      {
        id: 'e2213-tri', valeurs: ['Triphasé'],
        message: 'L’installation est triphasée grâce aux TROIS onduleurs, mais chaque onduleur n’injecte que sur une phase (DTR 30).',
      },
    ],
    explication: 'Phases d’injection / de raccordement : 1 / 1 → chaque onduleur est monophasé (230 V) ; trois onduleurs répartis sur L1, L2, L3 font une installation triphasée.',
  },
  {
    label: 'E.2.2.1.4', partie: 5, type: 'valeur',
    enonce: '**Déterminer** la référence du disjoncteur différentiel à placer devant chaque onduleur avec une arrivée haute et une sortie basse.',
    competence: 'C3', points: 1.5, dtr: [pageDtr(32), pagesDtr(30)[3]], pageSujet: 30,
    // Corrigé officiel : 4 107 56 (type F, 30 mA, 32 A, vis/vis). Le DTR 30 admet aussi un type AC
    // (4 107 08, 32 A vis/vis) : non retenu par le corrigé, signalé par une erreur typique.
    champs: [champTxt('ref', 'Référence', ref('4 107 56', '4 10 756'))],
    indice: 'In ≥ Ie = IACmax onduleur = 26 A ; courbe C ; « vis/vis : arrivée haute et sortie basse » (DTR 32).',
    aides: [
      '📖 Règles de protection côté AC : DTR 30 (dernière page) ; catalogue des disjoncteurs différentiels : DTR 32, colonne « Protection des départs ».',
      '🧭 Méthode : 1) calibre In au moins égal au courant de sortie max. de l’onduleur ; 2) connexion « vis/vis » pour une arrivée haute et une sortie basse ; 3) type de différentiel adapté à un onduleur (immunité renforcée, défauts à composante continue) ; 4) sensibilité 30 mA.',
      '✏️ Forme de la réponse : Référence : 4 107 … (six chiffres, lus dans la colonne « Vis/vis »).',
    ],
    erreursTypiques: [
      {
        id: 'e2214-auto-vis', champ: 'ref', valeurs: ref('4 107 16', '4 107 64', '4 107 63'),
        message: 'Cette référence est en connexion « auto/vis » (arrivée par bornes auto) : il faut une arrivée haute ET une sortie basse par bornes à vis (colonne « Vis/vis »).',
      },
      {
        id: 'e2214-calibre', champ: 'ref', valeurs: ref('4 107 55', '4 107 07', '4 107 54'),
        message: 'Le calibre est inférieur au courant de sortie max. de l’onduleur : il faut In ≥ Ie.',
      },
      {
        id: 'e2214-type-ac', champ: 'ref', valeurs: ref('4 107 08'),
        message: 'Le calibre et la connexion conviennent, mais un onduleur peut produire des défauts à composante continue et hautes fréquences : choisis le type de différentiel qui les détecte (DTR 32).',
      },
      {
        id: 'e2214-tete-groupe', champ: 'ref', valeurs: ref('4 107 20', '4 107 32'),
        message: 'Cette gamme est destinée à la protection de tête de groupe (sortie haute) : il faut un appareil de protection des départs, arrivée haute et sortie basse.',
      },
    ],
    explication: 'Ie = IACmax = 26 A → In = 32 A ; courbe C ; 30 mA ; type F (immunité renforcée, défauts à composantes alternative et continue) ; connexion vis/vis (arrivée haute, sortie basse) → 4 107 56.',
  },
  {
    label: 'E.2.2.2', partie: 5, type: 'schema',
    enonce: '**Compléter** le schéma de raccordement de l’ensemble de l’installation ci-dessous, de l’éolienne jusqu’au tableau de raccordement AC, sans se préoccuper des raccordements courant faibles.',
    contexte: 'À gauche : câblage côté gestion éolienne (page 31). À droite : câblage partie AC (page 32) ; le câble 5G16 arrivant du TGBT est déjà raccordé en amont de Q3 et à la barrette de terre.',
    competence: 'C11', points: 12, dtr: [pagesDtr(29)[6], pagesDtr(30)[2], pagesDtr(30)[3]], pageSujet: 31,
    image: { src: `${IMG}/q-e222-schema.jpg`, alt: 'Schéma de raccordement de l’éolienne à compléter (pages 31 et 32)' },
    traits: E222_TRAITS,
    platineTpId: 'chevrerie-e222-eolien',
    corrigeImage: { src: 'corriges/chevrerie/q-e222-corrige.jpg', alt: 'Schéma de raccordement de l’éolienne — corrigé (côté gestion éolienne et partie AC)' },
    indice: 'Éolienne → L1 L2 L3 de la WBP-box ; DC+ et DC− de la WBP-box vers les entrées DC des 3 onduleurs ; LR+/LR− vers la résistance ; côté AC : Q3 → répartiteur → parafoudre et Od 1 à Od 3 (un onduleur par phase), sortie basse des Od → câbles 3G6, PE à la barrette.',
    aides: [
      '📖 Bornes de la WBP-box : DTR 29, « Vue intérieure » et tableau A à E ; entrées DC et bornes AC des onduleurs : DTR 30 (vue intérieure) ; exemple de câblage côté AC : dernière page du DTR 30.',
      '🧭 Méthode : suis l’énergie. Côté éolienne : alternateur → redresseur (Alternator L1 L2 L3) → bus DC (DC+, DC−) partagé par les trois onduleurs, et la résistance de charge sur LR+/LR−. Côté AC : chaque onduleur est monophasé : son câble 3G6 part de la sortie basse de son disjoncteur différentiel ; les trois disjoncteurs sont alimentés depuis Q3 par le répartiteur, chacun sur une phase différente avec le neutre ; le parafoudre est alimenté en tête sur les quatre conducteurs.',
      '✏️ Forme de la réponse : des traits borne à borne : DC+ en rouge, neutre en bleu, PE en vert-jaune, phases en noir ou marron ; puis le même montage sur la platine.',
    ],
    explication: 'Corrigé : les trois conducteurs de l’éolienne sur L1, L2, L3 (Alternator) de la WBP-box ; DC+ (rouge) et DC− (bleu) de la WBP-box vers les entrées DC + et − des onduleurs 1, 2 et 3 ; LR+ et LR− vers le + et le − de la résistance de charge, PE de la résistance sur le PE de la WBP-box. Côté AC : sortie de Q3 (N, L1, L2, L3) vers le répartiteur, puis vers le parafoudre (N, L1, L2, L3) et vers l’arrivée haute des disjoncteurs différentiels : Od 1 sur N + L1, Od 2 sur N + L2, Od 3 sur N + L3 ; sortie basse de chaque Od vers le N (bleu) et la L du câble 3G6 de son onduleur ; PE des trois câbles 3G6 et borne de terre du parafoudre sur la barrette de terre.',
  },

  /* ═══════════════ E.3 — Évaluation de la production ═══════════════ */
  {
    label: 'E.3.1', partie: 5, type: 'calcul',
    enonce: '**Calculer** la vitesse moyenne du vent « V » sur l’éolienne.',
    competence: 'C5', points: 2, dtr: [pageDtr(33)], pageSujet: 33,
    grandeur: 'V', unite: 'm/s',
    formule: 'V = V0 × (H / H0)^α',
    formuleMotsCles: ['h0', 'α'],
    attendu: 4.49, tolerance: 0.02, arrondi: '2 décimales',
    indice: 'V0 = 5,8 m/s mesurée à H0 = 35 m ; H = 12 m ; site « arbres et haies épars » : α = 0,24 (DTR 33).',
    aides: [
      '📖 Ouvre le DTR 33 : formule V = V0 × (H / H0)^α et tableau du coefficient α selon la topographie ; les données du site sont dans la mise en situation de la partie E.',
      '🧭 Méthode : V0 et H0 décrivent la station météo (vitesse connue et sa hauteur), H la hauteur de l’éolienne ; choisis α d’après l’environnement du mât (arbres et haies). Calcule d’abord le rapport H / H0, puis la puissance α.',
      '✏️ Forme de la réponse : V = … (formule du DTR 33) = … × (… / …)^… (application numérique) = … m/s (2 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'e31-rapport-inverse', formule: 'V_{0}\\times\\left(\\frac{H_{0}}{H}\\right)^{\\alpha}',
        message: 'Le rapport est inversé : c’est la hauteur de l’éolienne H divisée par la hauteur de mesure H0.',
      },
      {
        id: 'e31-rapport-inverse-resultat', nombre: { valeur: 7.49, tolerance: 0.05 },
        message: 'Ton résultat est plus grand que la vitesse mesurée plus haut : le vent est plus faible près du sol. Vérifie le sens du rapport H / H0.',
      },
      {
        id: 'e31-alpha-haies', nombre: { valeur: 4.66, tolerance: 0.03 },
        message: 'Tu as pris α = 0,21 (« Haies ») : le mât est entouré d’arbres et de haies : relis le tableau du DTR 33.',
      },
    ],
    formuleSpec: {
      attendues: ['V_{0}\\times\\left(\\frac{H}{H_{0}}\\right)^{\\alpha}'],
      membreGauche: ['V'],
      variables: { 'V_{0}': { min: 2, max: 12 }, H: { min: 5, max: 50 }, 'H_{0}': { min: 10, max: 100 }, '\\alpha': { min: 0.07, max: 0.43 } },
      affichage: 'V = V0 × (H / H0)^α',
    },
    explication: 'V0 = 5,8 m/s ; H = 12 m ; H0 = 35 m ; α = 0,24 pour arbres et haies épars : V = 5,8 × (12 / 35)^0,24 = 4,49 m/s.',
  },
  {
    label: 'E.3.2', partie: 5, type: 'calcul',
    enonce: '**Calculer** la production annuelle en kWh attendu de l’éolienne.',
    competence: 'C5', points: 2, dtr: [pagesDtr(28)[1]], pageSujet: 33,
    grandeur: 'E', unite: 'kWh',
    formule: 'E annuelle = E mensuelle × 12',
    formuleMotsCles: ['12'],
    attendu: 2400, tolerance: 100, arrondi: 'au kWh',
    indice: 'Graphique « Énergie » (DTR 28, 2e page) : production mensuelle pour une vitesse annuelle moyenne d’environ 4,5 m/s.',
    aides: [
      '📖 Ouvre la 2e page du DTR 28 : graphique « Énergie » (production d’énergie mensuelle en fonction de la vitesse annuelle moyenne du vent).',
      '🧭 Méthode : lis la production MENSUELLE à la vitesse moyenne trouvée en E.3.1 (arrondie à la graduation la plus proche), puis ramène-la à une année.',
      '✏️ Forme de la réponse : E = … (formule) = … × … (application numérique) = … kWh.',
    ],
    erreursTypiques: [
      {
        id: 'e32-mensuel', nombre: { valeur: 200, tolerance: 10 },
        message: 'C’est la production MENSUELLE lue sur le graphique : la question demande la production annuelle.',
      },
      {
        id: 'e32-vitesse-station', nombre: { valeur: 4800, tolerance: 300 },
        message: 'Tu as lu le graphique à la vitesse mesurée par la station (5,8 m/s) : à 12 m, l’éolienne voit la vitesse calculée en E.3.1.',
      },
    ],
    formuleSpec: {
      attendues: ['12\\times E_{m}'],
      membreGauche: ['E', 'E_{an}', 'E_{a}', 'W', 'W_{an}'],
      variables: { 'E_{m}': { min: 10, max: 900 } },
      affichage: 'E = 12 × Em',
    },
    explication: 'Pour 4,5 m/s, le graphique donne 200 kWh par mois, donc par an : 200 × 12 = 2400 kWh.',
  },
  {
    label: 'E.3.3.1.1', partie: 5, type: 'valeur',
    enonce: '**Donner** la puissance nominale de l’éolienne.',
    contexte: CONTEXTE_E331,
    competence: 'C3', points: 1, dtr: [pageDtr(28)], pageSujet: 33,
    champs: [champNum('P', 'Puissance nominale', 3700, 0, 'W', ['3,7 kW', '3.7 kW', '3,7kW'])],
    indice: 'Tableau « Alternateur » du DTR 28, ligne « Puissance sortie nominale ».',
    aides: [
      '📖 Ouvre le DTR 28 : tableau « Alternateur ».',
      '🧭 Méthode : distingue la puissance NOMINALE (fonctionnement normal) de la puissance maximum et de la puissance commerciale du nom de l’éolienne.',
      '✏️ Forme de la réponse : P = … W (convertis les kW en W).',
    ],
    erreursTypiques: [
      {
        id: 'e3311-commerciale', champ: 'P', nombre: { valeur: 3500, tolerance: 0 },
        message: '3,5 kW est la dénomination commerciale : lis la « Puissance sortie nominale » de l’alternateur (DTR 28).',
      },
      {
        id: 'e3311-max', champ: 'P', nombre: { valeur: 6800, tolerance: 0 },
        message: 'C’est la puissance MAXIMUM : la question demande la puissance nominale.',
      },
      {
        id: 'e3311-kw', champ: 'P', nombre: { valeur: 3.7, tolerance: 0 },
        message: 'La réponse est attendue en watts : convertis les kW.',
      },
    ],
    explication: 'Puissance sortie nominale : 3,7 kW, soit 3700 W (DTR 28).',
  },
  {
    label: 'E.3.3.1.2', partie: 5, type: 'valeur',
    enonce: '**Donner** la tension nominale de l’éolienne.',
    competence: 'C3', points: 1, dtr: [pageDtr(28)], pageSujet: 33,
    champs: [champNum('U', 'Tension nominale', 350, 0, 'V')],
    indice: 'Tableau « Alternateur » du DTR 28, ligne « Tension nominale ».',
    aides: [
      '📖 Ouvre le DTR 28 : tableau « Alternateur », ligne « Tension nominale ».',
      '🧭 Méthode : c’est la tension alternative entre phases à la sortie de l’alternateur (VAC).',
      '✏️ Forme de la réponse : U = … V.',
    ],
    explication: 'Tension nominale de l’alternateur : 350 V AC (DTR 28).',
  },
  {
    label: 'E.3.3.1.3', partie: 5, type: 'calcul',
    enonce: '**Calculer** la résistance d’un câble entre l’éolienne et le redresseur.',
    competence: 'C5', points: 2, dtr: [pageDtr(34)], pageSujet: 33,
    grandeur: 'R', unite: 'Ω',
    formule: 'R = ρ × L / S',
    formuleMotsCles: ['ρ', 'l', 's'],
    attendu: 0.314, tolerance: 0.005, arrondi: '3 décimales',
    indice: 'Cuivre : ρ = 0,023 Ω·mm²/m (DTR 34) ; L = 70 m + 12 m de mât ; S = 6 mm².',
    aides: [
      '📖 Ouvre le DTR 34 : formule de la résistance d’un câble et résistivité du cuivre ; la section du câble solaire est donnée en E.2.2, la distance en E.3.3.1.',
      '🧭 Méthode : la longueur d’UN conducteur est la distance au sol plus la hauteur du mât (le câble monte jusqu’à la nacelle). On calcule la résistance d’un seul conducteur unipolaire (pas d’aller-retour en triphasé).',
      '✏️ Forme de la réponse : R = … (formule du DTR 34) = … × … / … (application numérique) = … Ω (3 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'e3313-sans-mat', nombre: { valeur: 0.268, tolerance: 0.003 },
        message: 'Tu as oublié la hauteur du mât : le câble descend de la nacelle avant de parcourir la distance jusqu’au bâtiment.',
      },
      {
        id: 'e3313-aller-retour', nombre: { valeur: 0.629, tolerance: 0.005 },
        message: 'On demande la résistance d’UN câble (un conducteur) : ne double pas la longueur.',
      },
      {
        id: 'e3313-milliohm', nombre: { valeur: 314, tolerance: 5 },
        message: 'L’unité attendue est l’ohm : ta valeur est en milliohms.',
      },
    ],
    formuleSpec: {
      attendues: ['\\frac{\\rho\\times L}{S}'],
      membreGauche: ['R'],
      variables: { '\\rho': { min: 0.017, max: 0.04 }, L: { min: 10, max: 200 }, S: { min: 1.5, max: 35 } },
      affichage: 'R = ρ × L / S',
    },
    explication: 'Longueur du câble : 70 + 12 = 82 m ; cuivre, ρ = 0,023 Ω·mm²/m ; section 6 mm² : R = 0,023 × 82 / 6 = 0,3143 Ω ≈ 314 mΩ.',
  },
  {
    label: 'E.3.3.1.4', partie: 5, type: 'calcul',
    enonce: '**Calculer** les pertes joules dans les câbles (cos φ = 1).',
    competence: 'C5', points: 2, dtr: [pageDtr(34)], pageSujet: 33,
    grandeur: 'Pj', unite: 'W',
    formule: 'Pj = 3 × R × I² avec I = P / (√3 × U)',
    formuleMotsCles: ['3', 'r', 'i²'],
    attendu: 37.3, tolerance: 0.3, arrondi: '1 décimale',
    indice: 'Trois conducteurs de résistance R ; courant nominal I = 3700 / (√3 × 350) ; Pj = R × I² par conducteur (DTR 34).',
    aides: [
      '📖 DTR 34 : puissance Joule dans une résistance ; la résistance d’un câble vient de E.3.3.1.3, puissance et tension nominales de E.3.3.1.1 et E.3.3.1.2.',
      '🧭 Méthode : calcule d’abord le courant en ligne à la puissance NOMINALE, en triphasé avec cos φ = 1 ; chacun des TROIS conducteurs unipolaires dissipe R × I².',
      '✏️ Forme de la réponse : Pj = … (formule avec R et I, en précisant le calcul de I) = … (application numérique) = … W (1 décimale).',
    ],
    erreursTypiques: [
      {
        id: 'e3314-un-cable', formule: 'R\\times I^{2}',
        message: 'Ta formule ne compte qu’un seul conducteur : la liaison triphasée comporte trois câbles unipolaires.',
      },
      {
        id: 'e3314-un-cable-resultat', nombre: { valeur: 12.4, tolerance: 0.2 },
        message: 'Ton résultat correspond aux pertes d’un seul conducteur : il y en a trois.',
      },
      {
        id: 'e3314-sans-racine3', nombre: { valeur: 105.4, tolerance: 1 },
        message: 'Le courant en ligne d’un réseau triphasé se calcule avec √3 : I = P / (√3 × U).',
      },
      {
        id: 'e3314-pmax', nombre: { valeur: 118.6, tolerance: 1.5 },
        message: 'Tu as pris le courant maximal : les pertes s’estiment à la puissance NOMINALE de l’éolienne.',
      },
    ],
    formuleSpec: {
      attendues: ['3\\times R\\times I^{2}', '3\\times R\\times\\left(\\frac{P}{\\sqrt{3}\\times U}\\right)^{2}', '\\frac{R\\times P^{2}}{U^{2}}'],
      membreGauche: ['P_{j}', 'P_{J}', 'p_{j}', 'P_{joule}'],
      variables: { R: { min: 0.05, max: 1 }, P: { min: 1000, max: 8000 }, U: { min: 200, max: 500 } },
      derivees: { I: '\\frac{P}{\\sqrt{3}\\times U}' },
      affichage: 'Pj = 3 × R × I², avec I = P / (√3 × U)',
    },
    explication: 'Trois câbles unipolaires de 0,314 Ω chacun : Pj = 3 × 0,314 × (3700 / (350 × √3))² = 37,251 W ≈ 37,3 W.',
  },
  {
    label: 'E.3.3.1.5', partie: 5, type: 'calcul',
    enonce: '**Calculer** le pourcentage de perte dans les câbles par rapport à la puissance de l’éolienne.',
    competence: 'C5', points: 1, dtr: [pageDtr(34)], pageSujet: 33,
    grandeur: 'p', unite: '%',
    formule: 'p = Pj / P × 100',
    formuleMotsCles: ['pj', '100'],
    attendu: 1, tolerance: 0.05, arrondi: 'à 0,1 % près',
    indice: 'Pertes Joule de E.3.3.1.4 rapportées à la puissance nominale (3700 W).',
    aides: [
      '📖 Reprends tes résultats de E.3.3.1.4 (pertes Joule) et E.3.3.1.1 (puissance nominale).',
      '🧭 Méthode : un pourcentage de perte = pertes / puissance de référence × 100, les deux dans la même unité (W).',
      '✏️ Forme de la réponse : p = … (formule) = … / … × 100 (application numérique) = … %.',
    ],
    erreursTypiques: [
      {
        id: 'e3315-fraction', nombre: { valeur: 0.01, tolerance: 0.0005 },
        message: 'Tu as donné la fraction : multiplie par 100 pour l’exprimer en pourcentage.',
      },
    ],
    formuleSpec: {
      attendues: ['\\frac{P_{j}}{P}\\times100'],
      variables: { 'P_{j}': { min: 1, max: 500 }, P: { min: 1000, max: 8000 } },
      affichage: 'p = Pj / P × 100',
    },
    explication: 'p = 37,3 / 3700 × 100 = 1,008 ≈ 1 %.',
  },
  {
    label: 'E.3.3.2.1', partie: 5, type: 'valeur',
    enonce: '**Déterminer** le rendement européen du redresseur.',
    contexte: 'E.3.3.2. Pertes dans les composants (redresseur et onduleur).',
    competence: 'C3', points: 1, dtr: [pagesDtr(29)[6]], pageSujet: 34,
    champs: [champNum('eta', 'Rendement européen du redresseur', 97, 0, '%')],
    indice: 'Données générales de la WBP-box (DTR 29, dernière page) : ligne « Rendements ».',
    aides: [
      '📖 Ouvre la dernière page du DTR 29 : tableau « Données générales » de la WBP-box (qui intègre le redresseur).',
      '🧭 Méthode : deux rendements sont donnés : le maximum et le rendement « Euro » (pondéré sur plusieurs niveaux de charge) : c’est le second qui est demandé.',
      '✏️ Forme de la réponse : η = … %.',
    ],
    erreursTypiques: [
      {
        id: 'e3321-max', champ: 'eta', nombre: { valeur: 99, tolerance: 0 },
        message: 'C’est le rendement MAXIMAL : la question demande le rendement européen (« Euro »).',
      },
    ],
    explication: 'Rendements de la WBP-box : max 99 %, Euro 97 % → rendement européen du redresseur : 97 %.',
  },
  {
    label: 'E.3.3.2.2', partie: 5, type: 'valeur',
    enonce: '**Relever** le rendement européen d’un onduleur.',
    competence: 'C3', points: 1, dtr: [pagesDtr(30)[1]], pageSujet: 34,
    champs: [champNum('eta', 'Rendement européen de l’onduleur', 95.3, 0, '%')],
    indice: 'Caractéristiques du Windy Boy 5000A (DTR 30), rubrique « Rendement ».',
    aides: [
      '📖 Ouvre le DTR 30 : rubrique « Rendement » du tableau des caractéristiques techniques.',
      '🧭 Méthode : la ligne donne « Rendement max. / Euro-eta » : prends la valeur après la barre.',
      '✏️ Forme de la réponse : η = … % (une décimale).',
    ],
    erreursTypiques: [
      {
        id: 'e3322-max', champ: 'eta', nombre: { valeur: 96.1, tolerance: 0 },
        message: 'C’est le rendement MAXIMAL : la valeur européenne (Euro-eta) est l’autre.',
      },
    ],
    explication: 'Windy Boy 5000A : rendement max. / Euro-eta = 96,1 % / 95,3 % → 95,3 %.',
  },
  {
    label: 'E.3.3.2.3', partie: 5, type: 'calcul',
    enonce: '**Calculer** le rendement de l’ensemble.',
    competence: 'C5', points: 1.5, dtr: [pagesDtr(29)[6], pagesDtr(30)[1]], pageSujet: 34,
    grandeur: 'η', unite: '%',
    formule: 'η = ηredresseur × ηonduleur',
    formuleMotsCles: ['×'],
    attendu: 92.4, tolerance: 0.1, arrondi: '1 décimale',
    indice: 'Rendements en cascade : on les multiplie (0,97 × 0,953).',
    aides: [
      '📖 Reprends les rendements européens trouvés en E.3.3.2.1 (redresseur) et E.3.3.2.2 (onduleur).',
      '🧭 Méthode : l’énergie traverse successivement le redresseur puis l’onduleur : les rendements d’éléments en série se MULTIPLIENT (écris-les sous forme décimale).',
      '✏️ Forme de la réponse : η = … (formule) = … × … (application numérique) = … %.',
    ],
    erreursTypiques: [
      {
        id: 'e3323-somme', formule: '\\eta_{R}+\\eta_{O}',
        message: 'Des rendements en série ne s’additionnent pas : ils se multiplient.',
      },
      {
        id: 'e3323-moyenne', nombre: { valeur: 96.15, tolerance: 0.1 },
        message: 'La moyenne des rendements n’a pas de sens physique : l’énergie subit les pertes des deux appareils, les rendements se multiplient.',
      },
      {
        id: 'e3323-decimal', nombre: { valeur: 0.924, tolerance: 0.001 },
        message: 'Le résultat est attendu en pourcentage : multiplie par 100.',
      },
    ],
    formuleSpec: {
      attendues: ['\\eta_{R}\\times\\eta_{O}'],
      variables: { '\\eta_{R}': { min: 0.8, max: 0.99 }, '\\eta_{O}': { min: 0.8, max: 0.99 } },
      affichage: 'η = ηR × ηO',
    },
    explication: 'η = 0,97 × 0,953 = 0,92441 ≈ 92,4 %.',
  },
  {
    label: 'E.3.3.3.1', partie: 5, type: 'calcul',
    enonce: '**Calculer** le rendement de l’installation sortie éolienne jusqu’au tableau de raccordement AC. On négligera les pertes dans les câbles entre le redresseur les onduleurs et le tableau de raccordement AC (faibles longueurs de câbles).',
    contexte: 'E.3.3.3. Pertes totales.',
    competence: 'C5', points: 1.5, dtr: [pageDtr(34)], pageSujet: 34,
    grandeur: 'ηt', unite: '%',
    formule: 'ηt = ηensemble × ηcâbles, avec ηcâbles = 1 − pertes (1 %) = 0,99',
    formuleMotsCles: ['0,99'],
    attendu: 91.5, tolerance: 0.1, arrondi: '1 décimale',
    indice: 'Rendement des câbles : 100 % − 1 % de pertes (E.3.3.1.5) = 99 %.',
    aides: [
      '📖 Reprends le pourcentage de pertes dans les câbles (E.3.3.1.5) et le rendement de l’ensemble redresseur + onduleur (E.3.3.2.3).',
      '🧭 Méthode : transforme les pertes des câbles éolienne-redresseur en rendement (1 − pertes), puis multiplie les rendements de toute la chaîne.',
      '✏️ Forme de la réponse : ηt = … (formule) = … × … (application numérique) = … %.',
    ],
    erreursTypiques: [
      {
        id: 'e3331-decimal', nombre: { valeur: 0.915, tolerance: 0.002 },
        message: 'Le résultat est attendu en pourcentage : multiplie par 100.',
      },
      {
        id: 'e3331-pertes-en-rendement', formule: '\\eta_{e}\\times p',
        message: 'Le pourcentage de pertes n’est pas un rendement : le rendement des câbles vaut 1 − pertes.',
      },
    ],
    formuleSpec: {
      attendues: ['\\eta_{e}\\times\\eta_{c}', '\\eta_{R}\\times\\eta_{O}\\times\\eta_{c}', '\\eta_{e}\\times(1-p)'],
      variables: { '\\eta_{R}': { min: 0.8, max: 0.99 }, '\\eta_{O}': { min: 0.8, max: 0.99 }, p: { min: 0.001, max: 0.05 } },
      derivees: { '\\eta_{e}': '\\eta_{R}\\times\\eta_{O}', '\\eta_{c}': '1-p' },
      affichage: 'ηt = ηe × ηc (ηc = 1 − p)',
    },
    explication: 'Rendement dans les câbles : 99 % car 1 % de pertes. Rendement total : 0,92441 × 0,99 = 0,9151 ≈ 91,5 %.',
  },
  {
    // Le papier imprime une deuxième fois « E.3.3.2.2 » (p. 34) pour cette question : repère
    // suffixé « (bis) » pour rester unique.
    label: 'E.3.3.3.2', partie: 5, type: 'calcul', // imprimé « E.3.3.2.2 » une seconde fois sur le papier (estimation finale, sous E.3.3.3 « Pertes totales »)
    enonce: '**Calculer** l’estimation finale de production annuelle.',
    competence: 'C5', points: 1.5, dtr: [pagesDtr(28)[1]], pageSujet: 34,
    grandeur: 'Ef', unite: 'kWh',
    formule: 'Ef = E annuelle × ηt',
    formuleMotsCles: ['η'],
    attendu: 2196, tolerance: 6, arrondi: 'au kWh',
    indice: 'Production annuelle de E.3.2 multipliée par le rendement total de E.3.3.3.1.',
    aides: [
      '📖 Reprends la production annuelle attendue de l’éolienne (E.3.2) et le rendement de l’installation (E.3.3.3.1).',
      '🧭 Méthode : l’énergie réellement disponible au tableau AC est l’énergie produite par l’éolienne diminuée de toutes les pertes : multiplie par le rendement total, écrit sous forme décimale.',
      '✏️ Forme de la réponse : Ef = … (formule) = … × … (application numérique) = … kWh.',
    ],
    erreursTypiques: [
      {
        id: 'e3322b-pourcent', nombre: { valeur: 219600, tolerance: 600 },
        message: 'Le rendement doit être écrit sous forme décimale (0,915) et non en pourcentage.',
      },
      {
        id: 'e3322b-division', nombre: { valeur: 2623, tolerance: 10 },
        message: 'Tu as divisé par le rendement : les pertes DIMINUENT la production, on multiplie par le rendement.',
      },
    ],
    formuleSpec: {
      attendues: ['E_{an}\\times\\eta_{t}'],
      membreGauche: ['E_{f}', 'E', 'W_{f}', 'E_{finale}'],
      variables: { 'E_{an}': { min: 500, max: 10000 }, '\\eta_{t}': { min: 0.7, max: 0.99 } },
      affichage: 'Ef = Ean × ηt',
    },
    explication: 'Ef = 2400 × 0,915 = 2196 kWh (le repère « E.3.3.2.2 » est imprimé deux fois au sujet : cette question est la seconde).',
  },

  /* ═══════════════ E.4 — Évaluation de la rentabilité ═══════════════ */
  {
    label: 'E.4.1', partie: 5, type: 'calcul',
    enonce: '**Calculer** le coût du matériel.',
    contexte: CONTEXTE_E4,
    competence: 'C10', points: 2, dtr: [], pageSujet: 35,
    grandeur: 'Cmat', unite: '€',
    formule: 'Cmat = 3 × Conduleur + CWBP + Crésistance + Ccâble + Ctableau + Céolienne',
    formuleMotsCles: ['3', '+'],
    attendu: 11577, tolerance: 1, arrondi: 'à l’euro',
    indice: 'Trois onduleurs, un redresseur WBP, une résistance, une bobine de câble, un tableau et l’éolienne (1659 €, mât compris).',
    aides: [
      '📖 Tous les prix sont dans le texte de E.4 ; le nombre d’appareils vient de E.2.1.5 ; le prix de l’éolienne est dans la mise en situation de la partie E.',
      '🧭 Méthode : fais la liste du MATÉRIEL seulement (pas la main-d’œuvre, ni la tranchée, ni la fondation), multiplie chaque prix par la quantité, puis additionne. N’oublie pas l’éolienne elle-même.',
      '✏️ Forme de la réponse : Cmat = … (somme littérale) = (… × …) + … + … (application numérique) = … €.',
    ],
    erreursTypiques: [
      {
        id: 'e41-un-onduleur', nombre: { valeur: 7267, tolerance: 1 },
        message: 'L’installation comporte trois onduleurs (E.2.1.5) : un seul a été compté.',
      },
      {
        id: 'e41-sans-eolienne', nombre: { valeur: 9918, tolerance: 1 },
        message: 'Tu as oublié l’éolienne elle-même (prix de la mise en situation).',
      },
    ],
    formuleSpec: {
      attendues: ['3\\times C_{o}+C_{w}+C_{r}+C_{c}+C_{t}+C_{e}'],
      membreGauche: ['C_{mat}', 'C_{m}', 'C'],
      variables: {
        'C_{o}': { min: 500, max: 5000 }, 'C_{w}': { min: 500, max: 3000 }, 'C_{r}': { min: 100, max: 1000 },
        'C_{c}': { min: 100, max: 1000 }, 'C_{t}': { min: 100, max: 2000 }, 'C_{e}': { min: 500, max: 5000 },
      },
      affichage: 'Cmat = 3 × Co + Cw + Cr + Cc + Ct + Ce',
    },
    explication: '3 onduleurs, 1 redresseur, une résistance, une bobine de câble, 1 tableau électrique et l’éolienne : (2155 × 3) + 1680 + 386 + 599 + 788 + 1659 = 11 577 €.',
  },
  {
    label: 'E.4.2', partie: 5, type: 'calcul',
    enonce: '**Calculer** le coût des travaux.',
    competence: 'C10', points: 2, dtr: [], pageSujet: 35,
    grandeur: 'Ctrav', unite: '€',
    formule: 'Ctrav = Cfondation + L × Ctranchée + 2 jours × 8 h × 2 intervenants × Th',
    formuleMotsCles: ['45', '30'],
    attendu: 4840, tolerance: 1, arrondi: 'à l’euro',
    indice: '1 fondation, 70 m de tranchée, raccordement : 8 h/jour × 2 jours × 2 intervenants à 45 €/h.',
    aides: [
      '📖 Relis le texte de E.4 (fondation, tranchée au mètre linéaire, raccordement électrique) et la distance éolienne-bâtiment (E.3.3.1).',
      '🧭 Méthode : additionne trois postes : la fondation, la tranchée (longueur au sol × prix du mètre ; le mât n’est pas enterré) et la main-d’œuvre (heures par jour × jours × intervenants × taux horaire, avec une journée de 8 h).',
      '✏️ Forme de la réponse : Ctrav = … (somme littérale) = … + (… × …) + (… × … × … × …) (application numérique) = … €.',
    ],
    erreursTypiques: [
      {
        id: 'e42-longueur-mat', nombre: { valeur: 5200, tolerance: 1 },
        message: 'La tranchée ne suit que la distance au sol : la hauteur du mât n’est pas enterrée.',
      },
      {
        id: 'e42-un-intervenant', nombre: { valeur: 4120, tolerance: 1 },
        message: 'Le raccordement mobilise DEUX intervenants pendant deux jours : compte les heures de chacun.',
      },
      {
        id: 'e42-sans-main-oeuvre', nombre: { valeur: 3400, tolerance: 1 },
        message: 'Tu as oublié la main-d’œuvre du raccordement électrique.',
      },
    ],
    formuleSpec: {
      attendues: ['C_{f}+L\\times C_{l}+2\\times8\\times2\\times T_{h}'],
      membreGauche: ['C_{trav}', 'C_{T}', 'C'],
      variables: { 'C_{f}': { min: 500, max: 3000 }, L: { min: 10, max: 200 }, 'C_{l}': { min: 10, max: 60 }, 'T_{h}': { min: 20, max: 80 } },
      affichage: 'Ctrav = Cf + L × Cl + 2 × 8 × 2 × Th',
    },
    explication: '1 fondation, 70 m de tranchée électrique, raccordement électrique 8 h/jour × 2 jours × 2 intervenants : 1300 + (70 × 30) + (8 × 2 × 2 × 45) = 4840 €.',
  },
  {
    label: 'E.4.3.1', partie: 5, type: 'calcul',
    enonce: '**Calculer** le coût total de l’installation.',
    contexte: 'E.4.3. Calcul du coût de revient du kilowattheure produit. On considère une production sur 20 ans.',
    competence: 'C10', points: 1, dtr: [], pageSujet: 35,
    grandeur: 'Ctot', unite: '€',
    formule: 'Ctot = Cmat + Ctrav',
    formuleMotsCles: ['+'],
    attendu: 16417, tolerance: 1, arrondi: 'à l’euro',
    indice: 'Somme des résultats de E.4.1 et E.4.2.',
    aides: [
      '📖 Reprends tes résultats de E.4.1 (matériel) et E.4.2 (travaux).',
      '🧭 Méthode : le coût total d’une installation regroupe le matériel et les travaux.',
      '✏️ Forme de la réponse : Ctot = … + … (formule) = … + … (application numérique) = … €.',
    ],
    formuleSpec: {
      attendues: ['C_{mat}+C_{trav}'],
      membreGauche: ['C_{tot}', 'C_{T}', 'C'],
      variables: { 'C_{mat}': { min: 1000, max: 30000 }, 'C_{trav}': { min: 500, max: 10000 } },
      affichage: 'Ctot = Cmat + Ctrav',
    },
    explication: '4840 + 11 577 = 16 417 €.',
  },
  {
    label: 'E.4.3.2', partie: 5, type: 'calcul',
    enonce: '**Calculer** la production sur 20 ans.',
    competence: 'C10', points: 1, dtr: [], pageSujet: 35,
    grandeur: 'E20', unite: 'kWh',
    formule: 'E20 = Ean × 20',
    formuleMotsCles: ['20'],
    attendu: 44000, tolerance: 1, arrondi: 'au kWh',
    indice: 'Estimation de production par an donnée en E.4 : 2 200 kWh.',
    aides: [
      '📖 Relis la première ligne de E.4 : l’estimation de production annuelle à retenir pour la rentabilité.',
      '🧭 Méthode : utilise la valeur arrondie donnée par l’énoncé (et non ton propre résultat de E.3), et multiplie par la durée considérée.',
      '✏️ Forme de la réponse : E20 = … (formule) = … × … (application numérique) = … kWh.',
    ],
    erreursTypiques: [
      {
        id: 'e432-e32', nombre: { valeur: 48000, tolerance: 1 },
        message: 'Tu as pris la production avant pertes (E.3.2) : l’énoncé de E.4 impose l’estimation de production annuelle à utiliser.',
      },
    ],
    formuleSpec: {
      attendues: ['20\\times E_{an}'],
      membreGauche: ['E_{20}', 'E', 'W', 'W_{20}'],
      variables: { 'E_{an}': { min: 500, max: 10000 } },
      affichage: 'E20 = 20 × Ean',
    },
    explication: '2200 × 20 = 44 000 kWh.',
  },
  {
    label: 'E.4.3.3', partie: 5, type: 'calcul',
    enonce: '**Calculer** le coût de revient du kWh produit par l’éolienne.',
    competence: 'C10', points: 1.5, dtr: [], pageSujet: 35,
    grandeur: 'c', unite: '€/kWh',
    formule: 'c = Ctot / E20',
    formuleMotsCles: ['/'],
    attendu: 0.373, tolerance: 0.002, arrondi: '3 décimales',
    indice: 'Coût total (E.4.3.1) divisé par la production sur 20 ans (E.4.3.2).',
    aides: [
      '📖 Reprends tes résultats de E.4.3.1 (coût total) et E.4.3.2 (production sur 20 ans).',
      '🧭 Méthode : un coût de revient unitaire = ce que l’on dépense / ce que l’on produit, sur la même période.',
      '✏️ Forme de la réponse : c = … / … (formule) = … / … (application numérique) = … €/kWh (3 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'e433-inverse', formule: '\\frac{E_{20}}{C_{tot}}',
        message: 'Le rapport est inversé : on cherche des euros PAR kWh.',
      },
      {
        id: 'e433-centimes', nombre: { valeur: 37.3, tolerance: 0.2 },
        message: 'Ta valeur est en centimes d’euro : le résultat est attendu en €/kWh.',
      },
    ],
    formuleSpec: {
      attendues: ['\\frac{C_{tot}}{E_{20}}'],
      membreGauche: ['c', 'c_{kWh}', 'C_{kWh}', 'P_{kWh}'],
      variables: { 'C_{tot}': { min: 1000, max: 50000 }, 'E_{20}': { min: 5000, max: 100000 } },
      affichage: 'c = Ctot / E20',
    },
    explication: '16 417 / 44 000 = 0,373 €, soit 37,3 c€ le kWh.',
  },
  {
    label: 'E.4.3.4', partie: 5, type: 'tableau',
    enonce: '**Définir** si l’installation est rentable sachant que le coût d’achat TTC d’un kWh est de 0,25 euros. **Justifier** votre réponse. Si la réponse est négative proposer une autre solution de production.',
    competence: 'C13', points: 2.5, dtr: [], pageSujet: 35,
    colonnes: ['Rentable ?', 'Justifier', 'Proposition'],
    lignes: [{ cellules: [
      choix('e434-rep', ['Oui', 'Non'], 'Non'),
      libre('e434-just'),
      libre('e434-prop', 'Proposer une autre solution de production…'),
    ] }],
    indice: 'Compare le coût de revient du kWh produit (E.4.3.3) au prix d’achat du kWh sur le réseau.',
    aides: [
      '📖 Reprends ton coût de revient du kWh (E.4.3.3) et le prix d’achat donné dans l’énoncé.',
      '🧭 Méthode : l’installation est rentable si produire un kWh coûte MOINS cher que l’acheter. Pense aussi aux frais qui ne sont pas comptés (entretien). Si ce n’est pas rentable, cite une autre énergie renouvelable envisageable sur l’exploitation.',
      '✏️ Forme de la réponse : Oui / Non ; Justifier : « le kWh produit revient à … €, contre … € sur le réseau, sans compter … » ; Proposition : une autre source de production.',
    ],
    erreursTypiques: [
      {
        id: 'e434-oui', champ: 'e434-rep', valeurs: ['Oui'],
        message: 'Compare les deux prix : le kWh produit par l’éolienne coûte-t-il moins cher que le kWh acheté ?',
      },
    ],
    explication: 'Non : le prix du kWh sur le réseau (0,25 €) est bien inférieur au coût de revient de 37,3 c€ du kWh éolien, sans compter l’entretien de l’installation. Proposition : faire une étude avec une production photovoltaïque, ou encore une étude de microcentrale hydraulique.',
  },
];
