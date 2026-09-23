/**
 * Partie C (partie 3) — Alimentation du hangar : ligne souterraine triphasée + neutre de 120 m.
 * Mode de pose, facteurs de correction K4 à K7, IB / In / Iz, section, chute de tension,
 * désignation du câble et dimensionnement du conduit enterré (DTR 15 à 24).
 *
 * Barème : le corrigé officiel ne donne que le total de la partie (51 points) ; la répartition
 * par question est la nôtre (poids des calculs formule + application + résultat, 1 à 2 points
 * pour les lectures simples) et tombe juste sur 51.
 */
import type { SujetPartie } from '@/lib/sujet/types';
import { IMG, num, choix, libre, formule, champNum, champTxt, pageDtr, pagesDtr, type QuestionSansNum } from './commun';

export const PARTIE_C: SujetPartie = {
  num: 3,
  titre: 'Alimentation du hangar',
  objectifs: [
    'Étudier l’installation d’une ligne électrique souterraine pour alimenter le hangar.',
    'Choisir le matériel permettant l’alimentation du hangar.',
  ],
  competences: ['C1', 'C3', 'C5'],
  situation: 'La chèvrerie dispose d’un hangar situé sur un terrain sec à 120 m du point de livraison et servant à abriter le fourrage destiné aux animaux. Ce dernier n’est pas raccordé au réseau. Le projet est d’installer **un circuit triphasé de 10 kW** pour alimenter notamment l’éclairage du hangar et alimenter le nouveau portail. La ligne sera composée d’un câble triphasé + neutre **sans conducteur de terre U1000R2V** et sera enterrée sous conduit. On précise que la température habituelle du sol dans la région est de 15 °C.',
  dtrPages: [pageDtr(15), pageDtr(16), pageDtr(17), pageDtr(18), pageDtr(19), pageDtr(20), pageDtr(21), pageDtr(22), pageDtr(23), pageDtr(24)],
};

/** Page du dossier de la 2e page du DTR 24 (fiche du conduit : mise en œuvre, règle du tiers). */
const DTR24_P2 = pagesDtr(24)[1];

/** Choix des colonnes du tableau des courants admissibles (DTR 20). */
const COLONNES_52J = ['PVC 3', 'PVC 2', 'PR 3', 'PR 2'];

export const QUESTIONS_C: QuestionSansNum[] = [
  /* ═══════════════ C.1 Section des canalisations ═══════════════ */
  {
    label: 'C.1.1', partie: 3, type: 'valeur',
    enonce: '**Donner** le numéro du mode de pose à considérer.',
    contexte: 'C.1. Section des canalisations destinées à alimenter le hangar. La démarche pas à pas se fait de la manière suivante : détermination de la lettre de sélection du mode de pose ; détermination des différents facteurs de correction : mode de pose, température ambiante, groupement, etc. ; détermination du courant Iz et de la section de la canalisation. C.1.1 Sélection du mode de pose.',
    competence: 'C3', points: 2, dtr: [pageDtr(15)], pageSujet: 19,
    image: { src: `${IMG}/q-c11-situation.jpg`, alt: 'Plan de situation : point de livraison, chèvrerie et hangar relié par une ligne triphasée + neutre de 120 m' },
    champs: [champNum('mode', 'Mode de pose n°', 61, 0)],
    indice: 'Le câble est enterré ET posé dans un conduit (DTR 15).',
    aides: [
      '📖 Ouvre le DTR 15 : tableau des modes de pose (d’après le tableau 52C de la NF C 15-100), colonne « Réf. ».',
      '🧭 Méthode : relis la mise en situation : où passe la ligne (en l’air, en saillie, sous terre) et est-elle protégée par quelque chose ? Cherche la ligne du tableau dont la description reprend exactement ces deux informations.',
      '✏️ Forme de la réponse : un numéro de référence à deux chiffres lu dans la colonne « Réf. ».',
    ],
    erreursTypiques: [
      {
        id: 'c11-sans-conduit', champ: 'mode', nombre: { valeur: 62, tolerance: 0 },
        message: 'Ce mode de pose concerne un câble enterré directement dans le sol : relis la mise en situation, la ligne est enterrée sous conduit.',
      },
      {
        id: 'c11-protection-meca', champ: 'mode', nombre: { valeur: 63, tolerance: 0 },
        message: 'Une protection mécanique complémentaire (plaque, tuile) n’est pas un conduit : cherche le mode de pose des câbles enterrés DANS des conduits.',
      },
    ],
    explication: 'Mode de pose 61 : câbles mono- ou multiconducteurs dans des conduits, des fourreaux ou des conduits-profilés enterrés (DTR 15).',
  },
  {
    label: 'C.1.2', partie: 3, type: 'tableau',
    enonce: '**Déterminer** les facteurs K4, K5, K6 et K7, puis **calculer** la valeur du facteur k.',
    contexte: 'C.1.2 Facteur de correction k. Le facteur de correction k s’obtient en multipliant les facteurs de correction K4, K5, K6 et K7. — **Déterminer** le facteur K4 lié aux modes de pose. — **Déterminer** le facteur K5 dans le cas de plusieurs circuits ou câbles dans un même conduit enterré. — **Déterminer** le facteur K6 pour les câbles enterrés en fonction de la résistivité thermique du sol. — **Déterminer** le facteur K7 pour des températures du sol différentes de 20 °C. — **Calculer** la valeur du facteur k.',
    competence: 'C3', points: 6, dtr: [pageDtr(16), pageDtr(17), pageDtr(18)], pageSujet: 20,
    colonnes: ['Facteur', 'Valeur'],
    lignes: [
      { cellules: ['K4 (mode de pose)', num('c12-k4', 0.8, 0.001)] },
      { cellules: ['K5 (plusieurs circuits dans un même conduit enterré)', num('c12-k5', 1, 0.001)] },
      { cellules: ['K6 (résistivité thermique du sol)', num('c12-k6', 1, 0.001)] },
      // Corrigé officiel : K7 = 1,04 (colonne PR), « on tolère 1,05 » (colonne PVC).
      { cellules: ['K7 (température du sol)', num('c12-k7', 1.045, 0.0051)] },
      {
        cellules: ['k : formule', formule('c12-k-formule', {
          attendues: ['K_{4}\\times K_{5}\\times K_{6}\\times K_{7}'],
          // Pas de membre de gauche imposé : « K = K4 × K5 × K6 × K7 » (écriture du corrigé) comme « k = … ».
          // K4 tapé sans indice est lu 4 × K : les K_i dérivés de K rendent les deux écritures équivalentes.
          variables: { K: { min: 0.15, max: 0.3 } },
          derivees: { 'K_{4}': '4K', 'K_{5}': '5K', 'K_{6}': '6K', 'K_{7}': '7K' },
          affichage: 'k = K4 × K5 × K6 × K7',
        }, 'k = …')],
      },
      // Corrigé officiel : k = 0,832 (ou 0,84 avec K7 = 1,05) ; 0,83 arrondi accepté.
      { cellules: ['k : résultat', num('c12-k', 0.835, 0.0055)] },
    ],
    indice: 'Mode de pose 61 (DTR 16) ; un seul circuit dans le conduit (DTR 17) ; câble sous conduit en terrain sec (DTR 17) ; sol à 15 °C et isolant PR (DTR 18).',
    aides: [
      '📖 K4 : DTR 16 (ligne du mode de pose trouvé en C.1.1) ; K5 et K6 : DTR 17 ; K7 : DTR 18.',
      '🧭 Méthode : K5 dépend du nombre de circuits dans le même conduit ; K6 de la nature du terrain donnée dans la mise en situation ; K7 de la température du sol ET de l’isolant du câble (relis ce que signifie le R de R2V). Multiplie ensuite les quatre facteurs.',
      '✏️ Forme de la réponse : une valeur décimale par facteur, puis k = K_4 × K_5 × K_6 × K_7 = … (sans unité, 3 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'c12-k5-nb-conducteurs', champ: 'c12-k5', nombre: { valeur: 0.5, tolerance: 0.001 },
        message: 'K5 se lit avec le nombre de CIRCUITS (ou de câbles multiconducteurs) dans le conduit, pas avec le nombre de conducteurs du câble.',
      },
      {
        id: 'c12-k6-terrain-normal', champ: 'c12-k6', nombre: { valeur: 1.05, tolerance: 0.001 },
        message: 'Relis la mise en situation : le hangar est situé sur un terrain sec, pas sur un terrain « dit normal ».',
      },
      {
        id: 'c12-k7-20deg', champ: 'c12-k7', nombre: { valeur: 0.96, tolerance: 0.001 },
        message: 'Tu as pris une température du sol supérieure à 20 °C : la mise en situation donne une température plus basse, le facteur est alors supérieur à 1.',
      },
      {
        id: 'c12-k-somme', champ: 'c12-k-formule', formule: 'K_{4}+K_{5}+K_{6}+K_{7}',
        message: 'Les facteurs de correction se MULTIPLIENT entre eux, ils ne s’additionnent pas.',
      },
    ],
    explication: 'K4 = 0,8 (mode de pose 61) ; K5 = 1 car un seul circuit ; K6 = 1 (pas d’incidence car conducteurs sous conduit ; terrain sec) ; K7 = 1,04 (sol à 15 °C, isolant PR ; on tolère 1,05). k = K4 × K5 × K6 × K7 = 0,8 × 1 × 1 × 1,04 = 0,832 (ou 0,84 si K7 = 1,05).',
  },
  {
    label: 'C.1.3.1', partie: 3, type: 'calcul',
    enonce: '**Calculer** le courant d’emploi IB du circuit sachant que nous considérons que la charge est résistive.',
    contexte: 'C.1.3. Calcul du courant admissible de la canalisation. L’exploitation du facteur de correction k permet de calculer l’intensité admissible dans la canalisation.',
    competence: 'C5', points: 3, dtr: [], pageSujet: 21,
    grandeur: 'IB', unite: 'A',
    formule: 'IB = P / (U × √3 × cos φ)',
    formuleMotsCles: ['p', 'u', 'racine'],
    attendu: 14.43, tolerance: 0.05, arrondi: '2 décimales',
    formuleSpec: {
      attendues: ['\\frac{P}{\\sqrt{3}U\\cos\\varphi}', '\\frac{P}{\\sqrt{3}U}'],
      membreGauche: ['I_{B}', 'IB', 'I'],
      variables: { P: { min: 1000, max: 50000 }, U: { min: 380, max: 420 }, '\\varphi': { min: 0.1, max: 1.2 } },
      affichage: 'IB = P / (U × √3 × cos φ)',
    },
    indice: 'Circuit triphasé 400 V de 10 kW ; charge résistive : cos φ = 1.',
    aides: [
      '📖 Relis la mise en situation de la partie C : puissance du circuit et nature du réseau (triphasé + neutre, tension entre phases 400 V).',
      '🧭 Méthode : en triphasé, P = U × I × √3 × cos φ ; isole le courant. Une charge résistive a un facteur de puissance égal à 1. Attention : la puissance est en kW, convertis-la en W.',
      '✏️ Forme de la réponse : I_B = (formule avec P, U et cos φ) = (application numérique) = … A (2 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'c131-monophase', formule: '\\frac{P}{U}',
        message: 'Le circuit est TRIPHASÉ : la formule de la puissance fait intervenir √3.',
      },
      {
        id: 'c131-monophase-resultat', nombre: { valeur: 25, tolerance: 0.1 },
        message: 'Ce résultat correspond à P / U, sans √3 : le circuit est triphasé.',
      },
      {
        id: 'c131-230V', nombre: { valeur: 25.1, tolerance: 0.1 },
        message: 'En triphasé, la formule P = U × I × √3 × cos φ utilise la tension ENTRE PHASES (400 V), pas la tension simple.',
      },
      {
        id: 'c131-kW', nombre: { valeur: 0.01443, tolerance: 0.0001 },
        message: 'La puissance doit être exprimée en watts (10 kW = 10 000 W) pour obtenir des ampères.',
      },
    ],
    explication: 'IB = P / (U × √3 × cos φ) = 10 000 / (400 × √3 × 1) = 14,43 A.',
  },
  {
    label: 'C.1.3.2', partie: 3, type: 'valeur',
    enonce: '**Déterminer** le courant nominal In du disjoncteur.',
    competence: 'C3', points: 2, dtr: [], pageSujet: 21,
    champs: [champNum('in', 'In', 16, 0, 'A')],
    indice: 'Calibre normalisé immédiatement supérieur à IB (… 10, 16, 20, 25, 32 A …).',
    aides: [
      '📖 Reprends le courant d’emploi IB calculé en C.1.3.1 et la série des calibres normalisés des disjoncteurs modulaires (ton cours, ou un catalogue de disjoncteurs).',
      '🧭 Méthode : le disjoncteur doit laisser passer le courant d’emploi sans déclencher : In ≥ IB. Choisis le plus petit calibre normalisé qui respecte cette condition.',
      '✏️ Forme de la réponse : In = … A (un calibre normalisé).',
    ],
    erreursTypiques: [
      {
        id: 'c132-inferieur', champ: 'in', nombre: { valeur: 10, tolerance: 0 },
        message: 'Ce calibre est inférieur au courant d’emploi : le disjoncteur déclencherait en fonctionnement normal. Il faut In ≥ IB.',
      },
      {
        id: 'c132-ib', champ: 'in', nombre: { valeur: 14.43, tolerance: 0.5 },
        message: 'In est un CALIBRE normalisé de disjoncteur, pas la valeur calculée de IB : prends le calibre immédiatement supérieur.',
      },
      {
        id: 'c132-trop-grand', champ: 'in', nombre: { valeur: 20, tolerance: 0 },
        message: 'Ce calibre convient mais n’est pas le plus proche : on retient le calibre IMMÉDIATEMENT supérieur à IB.',
      },
    ],
    explication: 'Courant nominal du disjoncteur immédiatement supérieur à IB = 14,43 A : In = 16 A.',
  },
  {
    label: 'C.1.3.3', partie: 3, type: 'calcul',
    enonce: '**Calculer** le courant admissible Iz.',
    contexte: 'Rappel : Iz = In / k',
    competence: 'C5', points: 3, dtr: [], pageSujet: 21,
    grandeur: 'Iz', unite: 'A',
    formule: 'Iz = In / k',
    formuleMotsCles: ['in', 'k'],
    // Corrigé officiel : 16 / 0,832 = 19,23 A, ou 16 / 0,84 = 19,04 A si K7 = 1,05.
    attendu: 19.15, tolerance: 0.14, arrondi: '2 décimales',
    formuleSpec: {
      attendues: ['\\frac{I_{n}}{k}'],
      membreGauche: ['I_{z}', 'I_{Z}', 'Iz', 'IZ'],
      // « In » tapé sans indice est lu I × n : la dérivée rend les deux écritures équivalentes.
      variables: { k: { min: 0.5, max: 1.2 }, I: { min: 1, max: 8 }, n: { min: 2, max: 9 } },
      derivees: { 'I_{n}': 'I\\times n' },
      affichage: 'Iz = In / k',
    },
    indice: 'Iz = In / k avec In trouvé en C.1.3.2 et k calculé en C.1.2.',
    aides: [
      '📖 Reprends In (C.1.3.2) et le facteur k (C.1.2) ; la formule est rappelée dans l’énoncé.',
      '🧭 Méthode : k est inférieur à 1 : la canalisation, mal refroidie, doit être choisie pour un courant FICTIF plus grand que In. Divise, ne multiplie pas.',
      '✏️ Forme de la réponse : I_z = I_n / k = (application numérique) = … A (2 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'c133-multiplie', formule: 'I_{n}\\times k',
        message: 'Tu as multiplié par k au lieu de diviser : le facteur de correction augmente le courant à prendre en compte, Iz doit être supérieur à In.',
      },
      {
        id: 'c133-multiplie-resultat', nombre: { valeur: 13.35, tolerance: 0.15 },
        message: 'Ton résultat est inférieur à In : tu as multiplié par k au lieu de diviser.',
      },
      {
        id: 'c133-ib', nombre: { valeur: 17.34, tolerance: 0.15 },
        message: 'Tu as divisé le courant d’emploi IB : la formule rappelée utilise le courant nominal In du disjoncteur.',
      },
    ],
    explication: 'Iz = In / k = 16 / 0,832 = 19,23 A (ou 16 / 0,84 = 19,04 A si K7 = 1,05).',
  },
  {
    label: 'C.1.4.1', partie: 3, type: 'valeur',
    enonce: '**Donner** la matière de la gaine de protection du câble U1000 R2V.',
    contexte: 'C.1.4. **Déterminer** la section de la canalisation. La section de la canalisation est indiquée dans les abaques par lecture directe : le choix de la colonne est réalisé à partir des caractéristiques de la canalisation (isolant, nombre de conducteurs chargés) ; le choix de la ligne est réalisé à partir de la valeur ≥ Iz dans la colonne du tableau correspondant à la nature de l’âme du conducteur (cuivre ou aluminium).',
    competence: 'C3', points: 2, dtr: [pageDtr(19)], pageSujet: 21,
    champs: [champTxt('gaine', 'Matière de la gaine', [
      'PVC', 'polychlorure de vinyle', 'polychlorure de vinyle (PVC)', 'PVC polychlorure de vinyle', 'V : PVC', 'V PVC',
      'gaine PVC', 'gaine en PVC', 'gaine épaisse en PVC', 'gaine épaisse PVC', 'gaine de protection épaisse en PVC',
      'polychlorure de vinyle PVC', 'chlorure de polyvinyle', 'polyvinyle',
    ])],
    indice: 'Dans R2V, c’est la partie « 2V » qui décrit la gaine de protection (DTR 19, désignation NF-USE).',
    aides: [
      '📖 Ouvre le DTR 19 : colonne de droite « Désignation NF - USE », rubriques « Enveloppe isolante » puis « Gaine de protection non métallique ».',
      '🧭 Méthode : découpe la désignation R2V : la première lettre décrit l’enveloppe isolante des conducteurs, le groupe suivant (chiffre + lettre) décrit la gaine extérieure. Seul ce second groupe répond à la question.',
      '✏️ Forme de la réponse : le nom de la matière (sigle ou nom complet).',
    ],
    erreursTypiques: [
      {
        id: 'c141-isolant', champ: 'gaine', valeurs: ['PR', 'polyéthylène réticulé', 'polyethylene reticule', 'polyéthylène'],
        message: 'La lettre R décrit l’ENVELOPPE ISOLANTE des conducteurs ; la gaine de protection est décrite par le groupe « 2V » qui suit.',
      },
      {
        id: 'c141-caoutchouc', champ: 'gaine', valeurs: ['caoutchouc', 'caoutchouc vulcanisé', 'caoutchouc vulcanise'],
        message: 'Tu as lu la colonne CENELEC (à gauche) : pour un câble U1000, c’est la désignation NF-USE (à droite) qui s’applique.',
      },
    ],
    explication: 'Dans R2V, « 2V » désigne une gaine de protection épaisse en polychlorure de vinyle (PVC) ; R désigne l’enveloppe isolante en polyéthylène réticulé (PR).',
  },
  {
    label: 'C.1.4.2', partie: 3, type: 'tableau',
    enonce: '**Définir** la section des conducteurs à retenir.',
    contexte: 'La lecture dans le tableau donne :',
    competence: 'C3', points: 3, dtr: [pageDtr(20), pageDtr(19)], pageSujet: 21,
    colonnes: ['Donnée', 'Lecture'],
    lignes: [
      { cellules: ['Isolant et nombre de conducteurs', choix('c142-colonne', COLONNES_52J, 'PR 3')] },
      { cellules: ['Courant admissible (A)', num('c142-iz', 31, 0)] },
      { cellules: ['Section (mm²)', num('c142-s', 1.5, 0)] },
    ],
    indice: 'Isolant PR (lettre R), 3 conducteurs chargés en triphasé équilibré ; première valeur ≥ Iz dans la colonne cuivre (DTR 20).',
    aides: [
      '📖 Ouvre le DTR 20 : tableau 52J des courants admissibles dans les canalisations enterrées (méthode de référence D), partie « CUIVRE ».',
      '🧭 Méthode : l’isolant est celui des CONDUCTEURS (enveloppe isolante), pas celui de la gaine ; en triphasé + neutre équilibré, on compte les conducteurs chargés (les phases). Dans la colonne choisie, descends jusqu’à la première valeur supérieure ou égale à Iz (C.1.3.3), puis lis la section sur la même ligne.',
      '✏️ Forme de la réponse : la colonne choisie dans la liste, le courant lu (A) et la section (mm²).',
    ],
    erreursTypiques: [
      {
        id: 'c142-pvc', champ: 'c142-colonne', valeurs: ['PVC 3', 'PVC 2'],
        message: 'Le PVC est la matière de la GAINE ; la colonne se choisit avec l’isolant des conducteurs (la lettre R de R2V).',
      },
      {
        id: 'c142-quatre-charges', champ: 'c142-colonne', valeurs: ['PR 2'],
        message: 'Deux conducteurs chargés, c’est un circuit monophasé : ici le circuit est triphasé.',
      },
      {
        id: 'c142-pvc3-courant', champ: 'c142-iz', nombre: { valeur: 26, tolerance: 0 },
        message: 'Ce courant est lu dans la colonne PVC 3 : relis l’isolant des conducteurs du câble R2V.',
      },
    ],
    explication: 'Colonne PR 3 (isolant polyéthylène réticulé, 3 conducteurs chargés), cuivre : la première valeur ≥ Iz ≈ 19,2 A est 31 A, soit une section S = 1,5 mm².',
  },

  /* ═══════════════ C.2 Vérification de la chute de tension ═══════════════ */
  {
    label: 'C.2.1', partie: 3, type: 'tableau',
    enonce: '**Préciser** la chute de tension au disjoncteur Q2 si la section de la ligne de longueur 120 m est de 1,5 mm² et le facteur de puissance de 1.',
    contexte: 'C.2. Vérification de la chute de tension. On donne ci-dessous une représentation du schéma unifilaire de l’installation électrique. La norme NF C 15-100 impose que la chute de tension entre l’origine d’une installation et tout point d’utilisation ne dépasse certaines valeurs. Pour respecter la norme, on impose une chute de tension maximale de **3 %** au niveau du disjoncteur Q2.',
    competence: 'C5', points: 4, dtr: [pageDtr(21)], pageSujet: 22,
    image: { src: `${IMG}/q-c21-unifilaire.jpg`, alt: 'Schéma unifilaire : transformateur, Q1, ligne L = 120 m, Q2 protection du hangar' },
    colonnes: ['Grandeur', 'Valeur'],
    lignes: [
      { cellules: ['Courant nominal (A)', num('c21-in', 16, 0)] },
      { cellules: ['Section (mm²)', num('c21-s', 1.5, 0)] },
      { cellules: ['Longueur de la canalisation (m)', num('c21-l', 120, 0)] },
      { cellules: ['cos φ', num('c21-cos', 1, 0)] },
      {
        cellules: ['ΔU : formule', formule('c21-du-formule', {
          attendues: ['\\frac{\\Delta U_{100}\\times L}{100}'],
          membreGauche: ['\\Delta U', '\\Delta U_{\\%}', '\\Delta U\\%'],
          variables: { '\\Delta U_{100}': { min: 0.5, max: 12 }, L: { min: 20, max: 300 } },
          affichage: 'ΔU = ΔU(100 m) × L / 100',
        }, 'ΔU = …')],
      },
      { cellules: ['ΔU : résultat (%)', num('c21-du', 12.84, 0.05)] },
    ],
    indice: 'Tableau cos φ = 1, cuivre, ligne In = 16 A, colonne 1,5 mm² : la valeur est donnée pour 100 m de câble.',
    aides: [
      '📖 Ouvre le DTR 21 : « Chute de tension en % dans 100 m de câble », tableau du BAS (cos φ = 1), partie cuivre.',
      '🧭 Méthode : croise la ligne du courant nominal In avec la colonne de la section ; la valeur lue vaut pour 100 m : ramène-la à la longueur réelle de la ligne par une règle de trois.',
      '✏️ Forme de la réponse : les quatre données, puis ΔU = ΔU_{100} × L / 100 (ΔU_{100} : valeur lue pour 100 m) = … % (2 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'c21-oubli-longueur', champ: 'c21-du', nombre: { valeur: 10.7, tolerance: 0.05 },
        message: 'La valeur du tableau est donnée pour 100 m de câble : la ligne mesure 120 m, ramène la chute de tension à la longueur réelle.',
      },
      {
        id: 'c21-cos085', champ: 'c21-du', nombre: { valeur: 10.08, tolerance: 0.05 },
        message: 'Tu as lu le tableau cos φ = 0,85 : l’énoncé impose un facteur de puissance de 1 (charge résistive).',
      },
      {
        id: 'c21-ib', champ: 'c21-in', nombre: { valeur: 14.43, tolerance: 0.05 },
        message: 'Le tableau se lit avec le courant nominal In du disjoncteur (calibre normalisé), pas avec IB.',
      },
      {
        id: 'c21-sans-100', champ: 'c21-du-formule', formule: '\\Delta U_{100}\\times L',
        message: 'La valeur du tableau correspond à 100 m : il faut multiplier par L / 100, pas par L.',
      },
    ],
    explication: 'In = 16 A ; S = 1,5 mm² ; L = 120 m ; cos φ = 1. Le DTR 21 (cos φ = 1, cuivre, 16 A, 1,5 mm²) donne 10,7 % pour 100 m : ΔU = 10,7 % × 120 / 100 = 12,84 %.',
  },
  {
    label: 'C.2.2', partie: 3, type: 'tableau',
    enonce: '**Indiquer** si la section retenue est adaptée.',
    competence: 'C5', points: 1, dtr: [pageDtr(21)], pageSujet: 22,
    colonnes: ['Section adaptée ?', 'Justification'],
    lignes: [{ cellules: [choix('c22-rep', ['OUI', 'NON'], 'NON'), libre('c22-just')] }],
    indice: 'Compare la chute de tension trouvée en C.2.1 à la limite imposée au niveau de Q2.',
    aides: [
      '📖 Relis l’introduction de C.2 (chute de tension maximale imposée au niveau de Q2) et ton résultat de C.2.1.',
      '🧭 Méthode : une section est adaptée si elle respecte À LA FOIS le courant admissible et la chute de tension maximale : compare les deux pourcentages.',
      '✏️ Forme de la réponse : ta réponse choisie dans la liste, puis une phrase : « avec une section de … mm², la chute de tension est de … %, … à la limite de … % ».',
    ],
    erreursTypiques: [
      {
        id: 'c22-oui', champ: 'c22-rep', valeurs: ['OUI'],
        message: 'Le courant admissible est respecté, mais compare aussi la chute de tension calculée en C.2.1 à la limite imposée au niveau de Q2.',
      },
    ],
    explication: 'NON : avec une section de 1,5 mm², la chute de tension (12,84 %) est trop élevée (> 3 %).',
  },
  {
    label: 'C.2.3', partie: 3, type: 'redige',
    enonce: 'Le cas échéant, **proposer** une solution pour satisfaire aux conditions imposées.',
    competence: 'C3', points: 2, dtr: [pageDtr(21)], pageSujet: 22,
    motsCles: ['augment', 'section'], minMotsCles: 2, lignes: 3,
    corrige: 'Ne pouvant déplacer le hangar, il convient d’augmenter la section des conducteurs pour satisfaire aux conditions fixées par la norme.',
    indice: 'La longueur de la ligne est imposée : quelle autre grandeur fait baisser la chute de tension ?',
    aides: [
      '📖 Regarde, dans le DTR 21, comment évolue la chute de tension sur une même ligne de courant quand on se déplace vers la droite du tableau.',
      '🧭 Méthode : la chute de tension dépend du courant, de la longueur et de la section. Le courant et la distance au hangar sont imposés : il ne reste qu’un paramètre sur lequel agir.',
      '✏️ Forme de la réponse : une phrase : « Ne pouvant pas …, il faut … la … des conducteurs. »',
    ],
    erreursTypiques: [
      {
        id: 'c23-disjoncteur', valeurs: ['changer le disjoncteur', 'augmenter le calibre', 'diminuer le calibre'],
        message: 'Le calibre du disjoncteur est imposé par le courant d’emploi : ce n’est pas lui qui règle la chute de tension dans la ligne.',
      },
    ],
    explication: 'Ne pouvant déplacer le hangar (longueur imposée), il convient d’augmenter la section des conducteurs pour satisfaire aux conditions fixées par la norme.',
  },
  {
    label: 'C.2.4', partie: 3, type: 'valeur',
    enonce: '**Déterminer** la section minimale à installer pour satisfaire aux conditions fixées. **Calculer** la nouvelle chute de tension au niveau du disjoncteur Q2.',
    competence: 'C3', points: 4, dtr: [pageDtr(21)], pageSujet: 22,
    champs: [
      champNum('s', 'Section minimale', 6, 0, 'mm²'),
      champNum('du', 'Chute de tension au niveau de Q2', 2.88, 0.02, '%'),
    ],
    indice: 'Même ligne 16 A du tableau cos φ = 1 : cherche la première section dont la chute ramenée à 120 m reste ≤ 3 %.',
    aides: [
      '📖 Reste sur le DTR 21, tableau cos φ = 1, cuivre, ligne In = 16 A.',
      '🧭 Méthode : pour chaque section plus grande, calcule la chute de tension sur la longueur réelle (valeur lue × L / 100) et arrête-toi à la PREMIÈRE qui ne dépasse pas la limite de C.2. Attention : une section qui respecte la limite « pour 100 m » peut la dépasser sur la longueur réelle.',
      '✏️ Forme de la réponse : Section minimale = … mm² (section normalisée) ; ΔU = … % (2 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'c24-section-100m', champ: 's', nombre: { valeur: 4, tolerance: 0 },
        message: 'Pour 100 m, cette section semble convenir, mais la ligne mesure 120 m : ramène la chute de tension à la longueur réelle et compare à 3 %.',
      },
      {
        id: 'c24-du-100m', champ: 'du', nombre: { valeur: 2.4, tolerance: 0.02 },
        message: 'Cette valeur est la chute de tension pour 100 m : multiplie-la par L / 100 pour la ligne de 120 m.',
      },
      {
        id: 'c24-du-4mm2', champ: 'du', nombre: { valeur: 4.44, tolerance: 0.02 },
        message: 'Cette chute de tension dépasse la limite de 3 % : la section correspondante ne convient pas.',
      },
    ],
    explication: 'Pour ne pas dépasser les 3 %, il faudrait opter pour un câble de section 6 mm² : ΔU = 2,4 % × 120 / 100 = 2,88 % (4 mm² donnerait 3,7 × 1,2 = 4,44 %).',
  },
  {
    label: 'C.2.5', partie: 3, type: 'valeur',
    enonce: '**Donner** la désignation complète du câble à utiliser pour la ligne électrique d’alimentation du hangar.',
    competence: 'C3', points: 2, dtr: [pageDtr(19)], pageSujet: 23,
    champs: [champTxt('designation', 'Désignation du câble', [
      'U1000 R2V 4X6', 'U1000R2V 4X6', 'U1000 R2V 4X6 mm²', 'U1000 R2V 4X6mm2', 'câble U1000 R2V 4X6',
      'câble U1000 R2V 4X6 mm²', 'U 1000 R2V 4 x 6', 'U 1000 R 2V 4X6', 'U1000 R2V 4 x 6 mm²', 'U-1000 R2V 4X6',
      'U1000 R2V 4x6mm²', 'U1000-R2V-4X6', 'U1000 R2V 4 X 6', 'U1000 R2V 4*6', 'U1000 R2V 4 conducteurs 6 mm²',
    ], 'U1000 R2V …')],
    indice: 'Câble triphasé + neutre SANS conducteur vert/jaune, section trouvée en C.2.4 (DTR 19, bas de la colonne de gauche).',
    aides: [
      '📖 Le DTR 19 (en bas à gauche) explique comment compléter la désignation : nombre de conducteurs, présence ou non d’un vert/jaune, section.',
      '🧭 Méthode : garde la désignation de la mise en situation, puis ajoute le nombre de conducteurs (3 phases + neutre), la lettre qui indique l’absence de conducteur vert/jaune, et la section retenue en C.2.4.',
      '✏️ Forme de la réponse : U1000 R2V n … S (n = nombre de conducteurs, une lettre, S = section en mm²).',
    ],
    erreursTypiques: [
      {
        id: 'c25-vert-jaune', champ: 'designation', valeurs: ['U1000 R2V 4G6', 'U1000R2V4G6', 'U1000 R2V 4G6 mm²', 'U1000 R2V 5G6', 'U1000R2V5G6'],
        message: 'La lettre G indique la présence d’un conducteur vert/jaune : la mise en situation précise un câble SANS conducteur de terre.',
      },
      {
        id: 'c25-section-15', champ: 'designation', valeurs: ['U1000 R2V 4X1,5', 'U1000R2V4X1.5', 'U1000 R2V 4X1.5'],
        message: 'La section de 1,5 mm² ne respecte pas la chute de tension (C.2.2) : reprends la section déterminée en C.2.4.',
      },
      {
        id: 'c25-trois', champ: 'designation', valeurs: ['U1000 R2V 3X6', 'U1000R2V3X6'],
        message: 'Le câble est triphasé + NEUTRE : compte tous les conducteurs.',
      },
    ],
    explication: 'Câble U1000 R2V 4X6 : 4 conducteurs (3 phases + neutre), X = pas de conducteur vert/jaune, section 6 mm².',
  },

  /* ═══════════════ C.3 Détermination du conduit ═══════════════ */
  {
    label: 'C.3.1', partie: 3, type: 'cocher',
    enonce: '**Choisir** le type de conduit le plus approprié à mettre en place.',
    contexte: 'C.3. Détermination du conduit à mettre en place. Dans cette partie, on se propose de déterminer le conduit qui va recevoir la ligne d’alimentation souterraine du hangar. On décide finalement de poser un câble triphasé + neutre de 6 mm² de section.',
    competence: 'C3', points: 2, dtr: [pageDtr(22), pageDtr(24)], pageSujet: 23,
    options: ['TPC & Duogliss TPC', 'ICTA 3522 Rai’gliss', 'ICTA 3422 Turbogliss', 'ICTA 3422 Chronofil Préfilé', '4433 Duogliss'],
    bonnes: [0],
    indice: 'Ligne « ENTERRÉ » du tableau de choix (DTR 22) : un seul conduit y est pleinement adapté, sans restriction.',
    aides: [
      '📖 Ouvre le DTR 22 : tableau de choix des conduits, ligne « ENTERRÉ ».',
      '🧭 Méthode : élimine les conduits interdits (sens interdit), puis ceux qui ne sont que « tolérés » ou tolérés sous condition de diamètre : il reste le conduit conçu pour la pose enterrée.',
      '✏️ Forme de la réponse : une seule case à cocher.',
    ],
    erreursTypiques: [
      {
        id: 'c31-tolere', valeurs: ['ICTA 3522 Rai’gliss', 'ICTA 3422 Turbogliss', '4433 Duogliss'],
        message: 'Ce conduit n’est que « toléré » en pose enterrée : on demande le type le PLUS approprié.',
      },
      {
        id: 'c31-interdit', valeurs: ['ICTA 3422 Chronofil Préfilé'],
        message: 'Ce conduit est interdit en pose enterrée (sens interdit dans le DTR 22).',
      },
    ],
    explication: 'Conduit enterré, donc on choisit un conduit TPC ou Duogliss TPC (colonne « CONDUITS ENTERRÉS » du DTR 22).',
  },
  {
    label: 'C.3.2.1', partie: 3, type: 'valeur',
    enonce: '**Déterminer** le diamètre du câble à poser.',
    contexte: 'C.3.2. **Déterminer** la section du conduit.',
    competence: 'C3', points: 2, dtr: [pageDtr(23)], pageSujet: 23,
    champs: [champNum('d', 'D : diamètre du câble', 16, 0, 'mm')],
    indice: 'Tableau du DTR 23 : ligne 4X6 mm², câble R2V.',
    aides: [
      '📖 Ouvre le DTR 23 : tableau de correspondance entre la section et le diamètre des câbles 4 conducteurs.',
      '🧭 Méthode : repère la ligne de la section retenue (4 conducteurs de 6 mm²), puis la sous-ligne du TYPE de câble choisi : deux types de câble y figurent avec des diamètres différents.',
      '✏️ Forme de la réponse : D = … mm.',
    ],
    erreursTypiques: [
      {
        id: 'c321-h07rnf', champ: 'd', nombre: { valeur: 17, tolerance: 0 },
        message: 'Tu as lu la ligne du câble H07RNF : le câble posé est un U1000 R2V.',
      },
      {
        id: 'c321-section', champ: 'd', nombre: { valeur: 14.5, tolerance: 0 },
        message: 'Tu as lu la ligne 4 mm² : la section retenue est de 6 mm².',
      },
    ],
    explication: 'Pour un câble R2V 4 conducteurs de 6 mm², le diamètre est D = 16 mm (DTR 23).',
  },
  {
    label: 'C.3.2.2', partie: 3, type: 'calcul',
    enonce: '**Déduire** la section d’application du câble à mettre en œuvre : SA.',
    competence: 'C5', points: 3, dtr: [pageDtr(23)], pageSujet: 23,
    grandeur: 'SA', unite: 'mm²',
    formule: 'SA = π × D² / 4',
    formuleMotsCles: ['pi', 'd', '4'],
    attendu: 201.06, tolerance: 0.5, arrondi: '2 décimales',
    formuleSpec: {
      attendues: ['\\frac{\\pi D^{2}}{4}', '\\pi R^{2}'],
      membreGauche: ['S_{A}', 'SA', 'S'],
      variables: { D: { min: 8, max: 40 } },
      derivees: { R: '\\frac{D}{2}', r: '\\frac{D}{2}' },
      affichage: 'SA = π × D² / 4',
    },
    indice: 'Section d’un disque de diamètre D : π × D² / 4.',
    aides: [
      '📖 Reprends le diamètre du câble trouvé en C.3.2.1 (DTR 23).',
      '🧭 Méthode : la section d’application est la surface du disque occupé par le câble ; attention à ne pas confondre diamètre et rayon.',
      '✏️ Forme de la réponse : S_A = (formule avec π et D) = (application numérique) = … mm² (2 décimales).',
    ],
    erreursTypiques: [
      {
        id: 'c322-rayon', formule: '\\pi D^{2}',
        message: 'Tu as utilisé le diamètre comme un rayon : S = π × R² avec R = D / 2, soit π × D² / 4.',
      },
      {
        id: 'c322-rayon-resultat', nombre: { valeur: 804.25, tolerance: 1 },
        message: 'Ton résultat est 4 fois trop grand : tu as calculé π × D² au lieu de π × D² / 4 (diamètre pris pour un rayon).',
      },
      {
        id: 'c322-perimetre', nombre: { valeur: 50.27, tolerance: 0.2 },
        message: 'Tu as calculé le périmètre du câble (π × D), pas sa section : le diamètre doit être élevé au carré.',
      },
    ],
    explication: 'SA = π × D² / 4 = π × 16² / 4 = 201,06 mm².',
  },
  {
    label: 'C.3.2.3', partie: 3, type: 'calcul',
    enonce: '**Calculer et donner** SC la section du conduit.',
    competence: 'C5', points: 3, dtr: [DTR24_P2], pageSujet: 23,
    grandeur: 'SC', unite: 'mm²',
    formule: 'SC = 3 × SA',
    formuleMotsCles: ['3', 'sa'],
    attendu: 603.2, tolerance: 0.5, arrondi: '1 décimale',
    formuleSpec: {
      attendues: ['3S_{A}'],
      membreGauche: ['S_{C}', 'SC'],
      // « SA » tapé sans indice est lu S × A : la dérivée rend les deux écritures équivalentes.
      variables: { S: { min: 1, max: 20 }, A: { min: 1, max: 20 } },
      derivees: { 'S_{A}': 'S\\times A' },
      affichage: 'SC = 3 × SA',
    },
    indice: 'La section d’application des câbles ne doit pas dépasser le tiers de la section de la gaine (DTR 24).',
    aides: [
      '📖 Ouvre le DTR 24 (2e page), paragraphe « Choix du diamètre de la gaine ».',
      '🧭 Méthode : traduis la règle en inégalité : S_A ≤ S_C / 3. La section minimale du conduit s’en déduit.',
      '✏️ Forme de la réponse : S_C = (formule avec S_A) = (application numérique) = … mm² (1 décimale).',
    ],
    erreursTypiques: [
      {
        id: 'c323-divise', formule: '\\frac{S_{A}}{3}',
        message: 'La règle dit que le câble ne doit occuper qu’un TIERS du conduit : le conduit est donc plus grand que le câble. Multiplie.',
      },
      {
        id: 'c323-divise-resultat', nombre: { valeur: 67.02, tolerance: 0.2 },
        message: 'Le conduit ne peut pas être plus petit que le câble : tu as divisé par 3 au lieu de multiplier.',
      },
    ],
    explication: 'La section d’application du câble ne doit pas dépasser le tiers de la section du conduit : SC = 3 × SA = 3 × 201,06 = 603,2 mm².',
  },
  {
    label: 'C.3.2.4', partie: 3, type: 'calcul',
    enonce: '**Déduire** DC le diamètre minimal du conduit.',
    competence: 'C5', points: 3, dtr: [], pageSujet: 24,
    grandeur: 'DC', unite: 'mm',
    formule: 'DC = √(4 × SC / π)',
    formuleMotsCles: ['4', 'sc', 'pi'],
    attendu: 27.7, tolerance: 0.1, arrondi: '1 décimale',
    formuleSpec: {
      attendues: ['\\sqrt{\\frac{4S_{C}}{\\pi}}'],
      membreGauche: ['D_{C}', 'DC', 'D'],
      // « SC » tapé sans indice est lu S × C.
      variables: { S: { min: 1, max: 40 }, C: { min: 1, max: 40 } },
      derivees: { 'S_{C}': 'S\\times C' },
      affichage: 'DC = √(4 × SC / π)',
    },
    indice: 'On inverse la formule de la section d’un disque : SC = π × DC² / 4.',
    aides: [
      '📖 Reprends la section du conduit SC calculée en C.3.2.3.',
      '🧭 Méthode : pars de S_C = π × D_C² / 4 et isole D_C : multiplie par 4, divise par π, puis prends la racine carrée.',
      '✏️ Forme de la réponse : D_C = (formule avec S_C et π) = (application numérique) = … mm (1 décimale).',
    ],
    erreursTypiques: [
      {
        id: 'c324-rayon', formule: '\\sqrt{\\frac{S_{C}}{\\pi}}',
        message: 'Cette formule donne le RAYON du conduit : il manque le facteur 4 sous la racine (ou multiplie le rayon par 2).',
      },
      {
        id: 'c324-rayon-resultat', nombre: { valeur: 13.86, tolerance: 0.1 },
        message: 'Ton résultat est la moitié du diamètre attendu : tu as calculé un rayon.',
      },
      {
        id: 'c324-sans-racine', nombre: { valeur: 768, tolerance: 1 },
        message: 'Tu as oublié la racine carrée : D_C² = 4 × S_C / π.',
      },
    ],
    explication: 'DC = √(4 × SC / π) = √(4 × 603,2 / π) = 27,7 mm.',
  },
  {
    label: 'C.3.2.5', partie: 3, type: 'valeur',
    enonce: '**Conclure** sur le conduit théorique (diamètre nominal).',
    competence: 'C3', points: 2, dtr: [pageDtr(24)], pageSujet: 24,
    champs: [
      champNum('dint', 'Diamètre intérieur immédiatement supérieur', 30, 0, 'mm'),
      champNum('dn', 'Diamètre nominal (DN) du conduit', 40, 0, 'mm'),
    ],
    indice: 'Tableau « Diamètre nominal / Diamètre intérieur mini » du DTR 24 : le diamètre intérieur doit être ≥ DC.',
    aides: [
      '📖 Ouvre le DTR 24 (1re page) : tableau « Diamètre nominal DN (mm) / Diamètre intérieur mini (mm) ».',
      '🧭 Méthode : le câble passe dans l’INTÉRIEUR du conduit : compare D_C à la colonne « diamètre intérieur mini », retiens la première valeur supérieure, puis lis le diamètre nominal sur la même ligne.',
      '✏️ Forme de la réponse : diamètre intérieur = … mm ; conduit DN … mm.',
    ],
    erreursTypiques: [
      {
        id: 'c325-dn-interieur', champ: 'dn', nombre: { valeur: 30, tolerance: 0 },
        message: 'Le diamètre nominal n’est pas le diamètre intérieur : lis le DN sur la même ligne du tableau.',
      },
      {
        id: 'c325-dn-trop-grand', champ: 'dn', nombre: { valeur: 50, tolerance: 0 },
        message: 'Ce conduit convient mais n’est pas le conduit THÉORIQUE minimal : prends la première ligne dont le diamètre intérieur dépasse D_C.',
      },
    ],
    explication: 'Diamètre intérieur immédiatement supérieur à 27,7 mm : 30 mm, soit un conduit de diamètre nominal (DN) 40 mm.',
  },
  {
    label: 'C.3.2.6', partie: 3, type: 'redige',
    enonce: 'Compte tenu la grande longueur de câble à poser, et des éventuelles difficultés de pose d’ordre pratique, que préconisez-vous ?',
    competence: 'C3', points: 1, dtr: [pageDtr(24), DTR24_P2], pageSujet: 24,
    motsCles: ['diametre', 'superieur', 'tir', 'plus grand', '50'], minMotsCles: 2, lignes: 3,
    corrige: 'Si réglementairement ce choix est suffisant, en pratique il sera difficile de tirer une ligne de 120 m sous un conduit de 40 mm. Il faudra donc choisir un conduit de diamètre supérieur.',
    indice: 'Tirer 120 m de câble dans un conduit juste suffisant : facile ou difficile ?',
    aides: [
      '📖 Relis le DTR 24 : diamètres nominaux disponibles et remarques de mise en œuvre (tirage des câbles, câble retirable ultérieurement).',
      '🧭 Méthode : le calcul donne un minimum réglementaire ; pense aux frottements du câble sur une grande longueur et aux coudes du tracé : que faut-il changer au conduit pour faciliter le tirage ?',
      '✏️ Forme de la réponse : une ou deux phrases : « Réglementairement …, mais en pratique … ; il faut donc … ».',
    ],
    explication: 'Si réglementairement le DN 40 est suffisant, en pratique il sera difficile de tirer une ligne de 120 m dans un conduit de 40 mm : il faudra choisir un conduit de diamètre supérieur (DN 50 par exemple).',
  },
  {
    label: 'C.3.2.7', partie: 3, type: 'valeur',
    enonce: '**Donner** la couleur du dispositif avertisseur lorsqu’il s’agit d’une canalisation électrique.',
    contexte: 'C.3.2.7. Mise en œuvre. La norme NF C 15-100 fixe plusieurs règles à respecter pour installer un câble électrique enterré : concernant la profondeur, les câbles électriques doivent se trouver au moins à 50 cm de la surface. Cette profondeur doit atteindre 85 cm sous les trottoirs et les voies. Par ailleurs, toute canalisation enterrée doit être signalée par un dispositif avertisseur non corrodable placé au moins à 0,20 m au-dessus d’elle.',
    competence: 'C1', points: 1, dtr: [pageDtr(24), DTR24_P2], pageSujet: 24,
    champs: [champTxt('couleur', 'Couleur du dispositif avertisseur', ['rouge', 'grillage rouge', 'avertisseur rouge', 'de couleur rouge', 'couleur rouge', 'grillage avertisseur rouge'])],
    indice: 'La couleur du conduit présenté au DTR 24 est justement « réservée à la protection des réseaux électriques ».',
    aides: [
      '📖 Relis la description du conduit au DTR 24 (1re page) : sa couleur y est associée à un type de réseau.',
      '🧭 Méthode : chaque réseau enterré a sa couleur conventionnelle (eau, gaz, télécommunications, électricité…) ; le grillage avertisseur reprend la couleur du réseau qu’il signale.',
      '✏️ Forme de la réponse : un mot (une couleur).',
    ],
    erreursTypiques: [
      {
        id: 'c327-autre-reseau', champ: 'couleur', valeurs: ['bleu', 'jaune', 'vert', 'marron', 'orange', 'blanc', 'violet'],
        message: 'Cette couleur signale un autre réseau enterré (eau, gaz, télécommunications…) : relis la couleur du conduit électrique du DTR 24.',
      },
    ],
    explication: 'Avertisseur de couleur rouge (couleur réservée aux réseaux électriques).',
  },
];
