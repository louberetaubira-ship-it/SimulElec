/**
 * Sujet « Chèvrerie » — PARTIE G : le portail (52,5 points, pages 41 à 46 du sujet, DTR 40 à 48).
 *
 * Barème : le corrigé officiel ne détaille pas les points par question (seul le total de la
 * partie, 52,5 points, est imprimé) ; la répartition ci-dessous est proposée pour tomber juste.
 * Valeurs attendues : corrigé officiel (pages 41 à 46).
 */
import type { QSchema, SujetPartie } from '@/lib/sujet/types';
import { IMG, num, txt, champNum, champTxt, ref, pageDtr, pagesDtr, type QuestionSansNum } from './commun';

/** Notice STAR 24 (DTR 45) : caractéristiques, schéma de la carte, tableau de branchement. */
const [STAR_CARAC, STAR_CARTE, STAR_BRANCHEMENT] = pagesDtr(45);

export const PARTIE_G: SujetPartie = {
  num: 7,
  titre: 'Le portail',
  objectifs: [
    'Étudier la faisabilité de l’installation.',
    'Choisir le matériel permettant cette installation.',
    'Dimensionner les composants.',
  ],
  competences: ['C1', 'C3', 'C6', 'C11', 'C12'],
  situation:
    'Ce modèle permet une commande d’ouverture par code sur téléphone. Le portail est réalisé en acier zingué, en tube de '
    + 'diamètre extérieur 50 mm en 3 mm d’épaisseur. Il se situe à l’entrée du site et doit pouvoir s’ouvrir avec un angle '
    + 'minimum de 130°. Le propriétaire des lieux souhaite une tranquillité d’esprit, de ce fait il souhaite une garantie '
    + 'constructeur supérieure à la garantie légale.',
  dtrPages: [
    pageDtr(40), pageDtr(41), pageDtr(42), pageDtr(44), STAR_CARAC, pageDtr(46), pageDtr(47), pageDtr(48),
  ],
};

/* ───────────────────────────── G.2.2 : plan du hangar ───────────────────────────── */

/**
 * Plan recadré (690 × 250 px, depuis la page 42 du sujet). Points de passage du tracé du corrigé,
 * mesurés au pixel : coffret TGBT (590 ; 195), pied du mur pignon (596 ; 219), angle de la façade
 * (522 ; 233), milieu de la façade le long de la panne sablière (280 ; 234), coffret du portail (36 ; 229).
 */
const PLAN_G22 = { w: 690, h: 250 };
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const pt = (x: number, y: number, label: string) => ({ x: r4(x / PLAN_G22.w), y: r4(y / PLAN_G22.h), label });

/* ───────────────────────────── G.5 : schéma de raccordement ───────────────────────────── */

/**
 * Schéma vierge recadré de la page 46 du sujet (940 × 640 px) : récepteur GSM (bornes L, N,
 * Sortie 1 NC/C/NA, Sortie 2 NA/C/NC, entrées C/IN1/IN2), carte de gestion AKIA PU2M (bornes 1 à
 * 19, 20 − / 21 + moteur 1), fils rouge / bleu du moteur, cellule réceptrice RX (−, +, COM, OUT),
 * cellule émettrice TX (1 −, 2 +), lampe flash (bornes 1 à 5 repérées par les flèches, de haut en
 * bas, comme sur la Fig. 1 du DTR 47). Positions mesurées au pixel et vérifiées sur une copie annotée.
 */
const G5_TRAITS: QSchema['traits'] = {
  image: {
    src: `${IMG}/q-g5-schema.jpg`,
    alt: 'Schéma de raccordement à compléter : récepteur GSM, carte de gestion de la motorisation (bornes 1 à 21), moteur (fils rouge et bleu), cellules réceptrice et émettrice, lampe flash',
    w: 940, h: 640,
  },
  bornes: [
    { id: 'GSM.L', x: 13.43, y: 6.37, label: 'Récepteur GSM — alimentation L' },
    { id: 'GSM.N', x: 14.63, y: 6.37, label: 'Récepteur GSM — alimentation N' },
    { id: 'GSM.S1.NC', x: 19.28, y: 6.37, label: 'Récepteur GSM — Sortie 1 NC' },
    { id: 'GSM.S1.C', x: 20.43, y: 6.37, label: 'Récepteur GSM — Sortie 1 C' },
    { id: 'GSM.S1.NA', x: 21.49, y: 6.37, label: 'Récepteur GSM — Sortie 1 NA' },
    { id: 'GSM.S2.NA', x: 23.35, y: 6.37, label: 'Récepteur GSM — Sortie 2 NA' },
    { id: 'GSM.S2.C', x: 24.47, y: 6.37, label: 'Récepteur GSM — Sortie 2 C' },
    { id: 'GSM.S2.NC', x: 25.59, y: 6.37, label: 'Récepteur GSM — Sortie 2 NC' },
    { id: 'GSM.IN.C', x: 13.43, y: 30.86, label: 'Récepteur GSM — entrée C' },
    { id: 'GSM.IN1', x: 14.55, y: 30.86, label: 'Récepteur GSM — entrée IN1' },
    { id: 'GSM.IN2', x: 15.69, y: 30.86, label: 'Récepteur GSM — entrée IN2' },
    ...Array.from({ length: 19 }, (_, i) => ({
      id: `C.${i + 1}`, x: r4((303.25 + i * 15.667) / 9.4), y: 21.88, label: `Carte moteur — borne ${i + 1}`,
    })),
    { id: 'C.20', x: 65.37, y: 20.94, label: 'Carte moteur — borne 20 (− moteur 1)' },
    { id: 'C.21', x: 66.97, y: 20.94, label: 'Carte moteur — borne 21 (+ moteur 1)' },
    { id: 'M.R', x: 81.7, y: 11.81, label: 'Moteur — fil rouge' },
    { id: 'M.B', x: 81.7, y: 13.06, label: 'Moteur — fil bleu' },
    { id: 'RX.-', x: 7.87, y: 81.25, label: 'Cellule réceptrice RX — borne −' },
    { id: 'RX.+', x: 9.68, y: 81.25, label: 'Cellule réceptrice RX — borne +' },
    { id: 'RX.COM', x: 11.45, y: 81.25, label: 'Cellule réceptrice RX — COM' },
    { id: 'RX.OUT', x: 13.19, y: 81.25, label: 'Cellule réceptrice RX — OUT' },
    { id: 'TX.-', x: 55.43, y: 83.06, label: 'Cellule émettrice TX — borne 1 (−)' },
    { id: 'TX.+', x: 57.19, y: 83.06, label: 'Cellule émettrice TX — borne 2 (+)' },
    { id: 'FL.1', x: 85.29, y: 63.64, label: 'Lampe flash — borne 1' },
    { id: 'FL.2', x: 85.29, y: 66.45, label: 'Lampe flash — borne 2' },
    { id: 'FL.3', x: 85.29, y: 70.42, label: 'Lampe flash — borne 3' },
    { id: 'FL.4', x: 85.29, y: 73.17, label: 'Lampe flash — borne 4' },
    { id: 'FL.5', x: 85.29, y: 76.05, label: 'Lampe flash — borne 5' },
  ],
  couleurs: [
    { id: 'rouge', label: 'Rouge (+)', css: '#d62828' },
    { id: 'noir', label: 'Noir (−)', css: '#161616' },
    { id: 'bleu', label: 'Bleu', css: '#1f6fd6' },
    { id: 'vert', label: 'Vert', css: '#2e9d4a' },
    { id: 'gris', label: 'Gris (signal)', css: '#8a8f96' },
    { id: 'orange', label: 'Orange', css: '#e07b1a' },
  ],
  // Liaisons du corrigé (p. 46). Couleurs du corrigé indicatives, non notées (très basse tension).
  attendues: [
    { a: 'GSM.S1.C', b: 'C.3' },
    { a: 'GSM.S2.C', b: 'C.5' },
    { a: 'GSM.S1.NA', b: 'GSM.S2.NA' },
    { a: 'GSM.S1.NA', b: 'RX.COM' },
    { a: 'C.4', b: 'C.6' },
    { a: 'C.4', b: 'RX.COM' },
    { a: 'C.7', b: 'RX.OUT' },
    { a: 'C.15', b: 'TX.+' },
    { a: 'TX.+', b: 'RX.+' },
    { a: 'C.17', b: 'TX.-' },
    { a: 'TX.-', b: 'RX.-' },
    { a: 'C.17', b: 'FL.4' },
    { a: 'C.16', b: 'FL.3' },
    { a: 'C.20', b: 'M.B' },
    { a: 'C.21', b: 'M.R' },
  ],
  // Correction par réseau (bornes au même potentiel).
  // Corrigé officiel (G.3.2) : le − des cellules peut aussi aller en 13 ou 19 et le +12 V du contact
  // RX en 8 ou 14 ; le schéma corrigé retient 17 et 4 : seules ces bornes sont attendues ici.
  reseaux: [
    { label: 'Commun +12 V : contacts NA du GSM, bornes 4 et 6, COM de la cellule RX', bornes: ['GSM.S1.NA', 'GSM.S2.NA', 'C.4', 'C.6', 'RX.COM'] },
    { label: 'Ouverture totale : Sortie 1 C → borne 3', bornes: ['GSM.S1.C', 'C.3'] },
    { label: 'Ouverture partielle : Sortie 2 C → borne 5', bornes: ['GSM.S2.C', 'C.5'] },
    { label: 'Retour de la cellule RX (OUT) → borne 7 (photo 2)', bornes: ['C.7', 'RX.OUT'] },
    { label: '+ alimentation des cellules avec test (borne 15)', bornes: ['C.15', 'TX.+', 'RX.+'] },
    { label: '0 V : cellules et flash (borne 17)', bornes: ['C.17', 'TX.-', 'RX.-', 'FL.4'] },
    { label: '+ lampe flash (borne 16 → borne 3 du flash)', bornes: ['C.16', 'FL.3'] },
    { label: 'Moteur : borne 20 (−) → fil bleu', bornes: ['C.20', 'M.B'] },
    { label: 'Moteur : borne 21 (+) → fil rouge', bornes: ['C.21', 'M.R'] },
  ],
};

/* ───────────────────────────── Questions ───────────────────────────── */

export const QUESTIONS_G: QuestionSansNum[] = [
  /* ═══════════════ G.1 — Choix de la motorisation ═══════════════ */
  {
    label: 'G.1.1', partie: 7, type: 'redige',
    enonce: '**Proposer** une méthode afin d’estimer la masse du portail.',
    contexte: 'Choix de la motorisation. Le portail est un portail agricole en acier galvanisé réalisé sur mesure par un artisan ferronnier. Il n’y a donc pas de plaque signalétique indiquant ses caractéristiques. Afin de choisir la motorisation adaptée à son ouverture automatique, il est indispensable de déterminer sa masse.',
    competence: 'C3', points: 2, dtr: [], pageSujet: 41,
    image: { src: `${IMG}/q-g11-portail.jpg`, alt: 'Photo du portail agricole en tubes d’acier galvanisé' },
    motsCles: ['peser', 'pesée', 'balance', 'démonter', 'volume', 'densité', 'masse volumique', 'longueur', 'section', '7850', '7,85'],
    minMotsCles: 2,
    corrige: 'Deux méthodes sont envisageables : soit le démonter pour le peser, soit le calculer à partir de la densité de l’acier, en calculant le volume d’acier utilisé (longueur totale de tube × section de la paroi du tube).',
    lignes: 4,
    indice: 'Deux pistes : une mesure directe, ou un calcul à partir des dimensions des tubes (mise en situation) et de la matière.',
    aides: [
      '📖 Relis la mise en situation : matière des tubes, diamètre extérieur et épaisseur sont donnés ; la photo montre les tubes à mesurer.',
      '🧭 Méthode : soit on mesure la masse directement (comment ?), soit on la calcule : masse = volume de matière × masse volumique ; le volume d’un tube creux = longueur × section de la paroi (couronne entre le diamètre extérieur et le diamètre intérieur).',
      '✏️ Forme de la réponse : une ou deux phrases qui décrivent la démarche (ce qu’on mesure, ce qu’on calcule, avec quelle donnée de la matière).',
    ],
    explication: 'On peut démonter le portail et le peser, ou calculer sa masse : longueur totale des tubes × section de la paroi (tube Ø 50 mm, épaisseur 3 mm) = volume d’acier, multiplié par la masse volumique de l’acier (environ 7 850 kg/m³). (Accepter toute méthode cohérente.)',
  },
  {
    label: 'G.1.2', partie: 7, type: 'valeur',
    enonce: 'En tenant compte du cahier des charges, **indiquer** la motorisation qui pourrait correspondre au besoin.',
    contexte: 'Pour la suite de cette partie, on estime la masse du portail à 120 kg.',
    competence: 'C3', points: 1.5, dtr: [pageDtr(41)], pageSujet: 41,
    champs: [champTxt('moto', 'Motorisation retenue', [
      ...ref('Akia Star 24', 'Akia Star24', 'Star 24', 'Star24'),
      'Akia Motorisation Portail 1 Battant Star24', 'Akia Motorisation Portail 1 Battant Star 24', 'Motorisation Akia Star 24',
      'la motorisation Akia Star 24', 'Akia', 'moteur roue Akia Star 24', 'kit Akia Star 24',
    ], 'Modèle du kit')],
    indice: 'Cahier des charges : 120 kg, ouverture d’au moins 130°, garantie constructeur supérieure à la garantie légale (2 ans).',
    aides: [
      '📖 Ouvre le DTR 41 : tableau des 4 kits de motorisation (poids maxi, angle d’ouverture maxi, garantie) ; le cahier des charges est dans la mise en situation de la partie G.',
      '🧭 Méthode : vérifie chaque kit critère par critère : masse du ventail, angle d’ouverture minimal exigé, garantie supérieure à la garantie légale. Élimine un kit dès qu’un critère n’est pas respecté.',
      '✏️ Forme de la réponse : le nom du modèle tel qu’il est écrit dans le tableau du DTR 41.',
    ],
    erreursTypiques: [
      {
        id: 'g12-came', champ: 'moto', valeurs: ['Came Monojet5', 'Came Monojet 5', 'Came', 'Came Monojet5 Kit M', 'Came Monojet5 Kit de motorisation 230V - Kit M'],
        message: 'Ce kit a bien une garantie de 3 ans, mais vérifie son angle d’ouverture maximal par rapport au cahier des charges.',
      },
      {
        id: 'g12-verins', champ: 'moto', valeurs: ['Ducati EVO 748 T MONO', 'Ducati', 'Nice TOONA Kit 5024', 'Nice Toona', 'Nice'],
        message: 'Compare l’angle d’ouverture maximal et la garantie de ce kit au cahier des charges (130° minimum, garantie supérieure à la garantie légale).',
      },
    ],
    explication: 'Seul le kit Akia Star 24 (moteur roue) convient : angle d’ouverture et poids sans limite, garantie 5 ans.',
  },
  {
    label: 'G.1.3', partie: 7, type: 'redige',
    enonce: '**Justifier** votre réponse en précisant au moins une caractéristique qui ne correspond pas à notre besoin sur les kits non retenus.',
    competence: 'C12', points: 2, dtr: [pageDtr(41)], pageSujet: 42,
    motsCles: ['angle', '130', '120', '105', 'vérin', 'garantie', '2 ans', 'ouverture'],
    minMotsCles: 2,
    corrige: 'Les motorisations à vérin électromécanique sont trop justes au niveau de l’angle d’ouverture (105° ou 120° au maximum, pour 130° exigés) ; de plus, les kits Ducati et Nice n’ont qu’une garantie de 2 ans (garantie légale).',
    lignes: 3,
    indice: 'Compare la ligne « Angle d’ouverture Maxi » des trois autres kits aux 130° du cahier des charges.',
    aides: [
      '📖 DTR 41 : lignes « Type de motorisation », « Angle d’ouverture Maxi » et « Garantie » des trois kits non retenus.',
      '🧭 Méthode : pour chaque kit écarté, cite le critère du cahier des charges qu’il ne respecte pas, avec la valeur du tableau et la valeur exigée.',
      '✏️ Forme de la réponse : une ou deux phrases du type « Le kit … ne convient pas car son … est de … alors que … ».',
    ],
    explication: 'Les trois kits à vérin électromécanique ont un angle d’ouverture maximal de 105° (Ducati) ou 120° (Nice, Came), inférieur aux 130° exigés ; en outre, Ducati et Nice n’offrent que 2 ans de garantie.',
  },

  /* ═══════════════ G.2 — Passage des conducteurs et câbles ═══════════════ */
  {
    label: 'G.2.1', partie: 7, type: 'bulles',
    enonce: '**Compléter** les profondeurs de la tranchée sur la vue suivante.',
    competence: 'C1', points: 2, dtr: [pageDtr(40)], pageSujet: 42,
    plan: { src: `${IMG}/q-g21-tranchee.jpg`, alt: 'Vue de la tranchée : passage sous le chemin d’accès (Prof 1) puis jusqu’au hangar (Prof 2)' },
    bulles: [
      { id: 'prof1', x: 42.2, y: 70.7, attendu: '85', acceptes: ['85 cm', '85cm', '0,85 m', '0.85 m', '0,85', '850 mm'] },
      { id: 'prof2', x: 72.8, y: 70.7, attendu: '65', acceptes: ['65 cm', '65cm', '0,65 m', '0.65 m', '0,65', '650 mm'] },
    ],
    indice: 'Prof 1 : la tranchée traverse le chemin d’accès (voie carrossable) ; Prof 2 : terrain courant.',
    aides: [
      '📖 Ouvre le DTR 40 : « Règles d’enfouissement d’une gaine électrique » (utilisation courante et voie carrossable).',
      '🧭 Méthode : pour chaque tronçon, regarde s’il passe sous le chemin d’accès (voie où circulent des véhicules) ou dans un terrain courant, puis lis la profondeur correspondante.',
      '✏️ Forme de la réponse : une profondeur en centimètres par bulle.',
    ],
    erreursTypiques: [
      {
        id: 'g21-inverse', champ: 'prof1', valeurs: ['65', '65 cm'],
        message: 'Le tronçon « Prof 1 » passe sous le chemin d’accès, où circulent les véhicules : relis la règle de la voie carrossable (DTR 40).',
      },
    ],
    explication: 'Sous le chemin d’accès (voie carrossable) : 85 cm ; en terrain courant : 65 cm.',
  },
  {
    label: 'G.2.2', partie: 7, type: 'placement',
    enonce: '**Tracer** le cheminement du câble d’alimentation de la centrale de commande du portail, sachant qu’elle sera fixée sur le mur extérieur du hangar de fourrage à côté du portail. Le cheminement se fera sous conduit IRL en suivant la panne sablière (attention à la hauteur des murs).',
    contexte: 'À l’écran : pose des points le long du tracé, du coffret TGBT jusqu’au coffret du portail (départ, changements de direction, arrivée).',
    competence: 'C11', points: 3, dtr: [pageDtr(42)], pageSujet: 42,
    plan: { src: `${IMG}/q-g22-plan.jpg`, alt: 'Vue en plan du hangar (20,9 m) : TGBT sur le pignon droit, coffret du portail à l’angle gauche', w: PLAN_G22.w, h: PLAN_G22.h },
    symbole: 'point',
    attendus: [
      pt(590, 195, 'Départ au coffret TGBT'),
      pt(596, 219, 'Descente le long du pignon'),
      pt(522, 233, 'Angle de la façade'),
      pt(280, 234, 'Le long de la façade (panne sablière)'),
      pt(36, 229, 'Arrivée au coffret du portail'),
    ],
    tolerance: { x: 0.035, y: 0.06 },
    max: 10,
    indice: 'Du TGBT, le câble rejoint l’angle du bâtiment puis suit toute la façade basse (celle du portail) jusqu’au coffret.',
    aides: [
      '📖 DTR 42 : plan et élévation du hangar (position du TGBT, de l’armoire portail, hauteur des murs) ; DTR 43 : où se trouve la panne sablière sur une charpente.',
      '🧭 Méthode : la panne sablière est posée en haut des murs gouttereaux (les longs murs) ; le câble part du TGBT, rejoint le long mur qui porte le coffret du portail et le suit sur toute sa longueur.',
      '✏️ Forme de la réponse : quelques points jalonnant le trajet : départ, chaque changement de direction, un point le long du mur, arrivée.',
    ],
    explication: 'Tracé du corrigé : du coffret TGBT sur le pignon, descente jusqu’à l’angle, puis le long de la façade (sous la panne sablière) sur 20,9 m jusqu’au coffret du portail.',
  },
  {
    label: 'G.2.3', partie: 7, type: 'valeur',
    enonce: '**Déterminer** la longueur de câble à utiliser pour alimenter le coffret du portail.',
    competence: 'C3', points: 2, dtr: [pageDtr(42)], pageSujet: 42,
    champs: [champNum('longueur', 'Longueur de câble', 28.1, 0.3, 'm')],
    indice: 'Longueur du bâtiment + décalage entre le TGBT et la façade + remontée depuis le coffret TGBT + descente jusqu’à la centrale du portail (hauteur du mur).',
    aides: [
      '📖 DTR 42 : longueur du hangar (vue en plan), cote 2,00 du TGBT, hauteur du mur (3,20) et hauteur du coffret TGBT (élévation).',
      '🧭 Méthode : le câble monte du coffret TGBT jusqu’à la panne sablière, suit le bâtiment horizontalement (longueur + décalage du pignon), puis redescend jusqu’à la centrale du portail : additionne les tronçons verticaux et horizontaux.',
      '✏️ Forme de la réponse : L = … + … + … + … = … m.',
    ],
    erreursTypiques: [
      {
        id: 'g23-longueur-seule', champ: 'longueur', nombre: { valeur: 20.9, tolerance: 0.1 },
        message: 'Tu n’as compté que la longueur du bâtiment : ajoute le décalage du TGBT et les parcours verticaux (montée au TGBT, descente au portail).',
      },
      {
        id: 'g23-sans-vertical', champ: 'longueur', nombre: { valeur: 22.9, tolerance: 0.1 },
        message: 'Le câble suit la panne sablière, en haut du mur : ajoute les parcours verticaux (montée depuis le TGBT et descente vers le portail).',
      },
    ],
    explication: 'Longueur de câble = longueur du bâtiment + décalage TGBT / façade + hauteur du coffret TGBT + hauteur de la centrale du portail = 20,9 + 2 + 2 + 3,2 = 28,10 m.',
  },
  {
    label: 'G.2.4', partie: 7, type: 'valeur',
    enonce: '**Indiquer** la désignation complète du conduit de cheminement dans lequel le câble sera installé.',
    competence: 'C3', points: 1, dtr: [pageDtr(44)], pageSujet: 43,
    champs: [champTxt('conduit', 'Désignation du conduit', [...ref('IRL 3321'), 'conduit IRL 3321', 'IRL-3321'], 'Lettres et classification')],
    indice: 'Le conduit imposé est un IRL ; sa classification minimale se lit dans le tableau « Systèmes de conduits ».',
    aides: [
      '📖 DTR 44 : « Conduits de cheminement » et tableau « Systèmes de conduits » (appellation / classification minimale).',
      '🧭 Méthode : la désignation complète = l’appellation (lettres) suivie de la classification à 4 chiffres.',
      '✏️ Forme de la réponse : trois lettres puis quatre chiffres.',
    ],
    erreursTypiques: [
      {
        id: 'g24-sans-chiffres', champ: 'conduit', valeurs: ['IRL'],
        message: 'La désignation COMPLÈTE comprend aussi la classification à quatre chiffres (DTR 44).',
      },
    ],
    explication: 'IRL 3321.',
  },
  {
    label: 'G.2.5', partie: 7, type: 'valeur',
    enonce: '**Donner** la désignation détaillée du conduit installé.',
    competence: 'C3', points: 3.5, dtr: [pageDtr(44)], pageSujet: 43,
    champs: [
      champTxt('I', 'I :', ['Isolant', 'matériau isolant', 'Matériau : isolant', 'isolant (matériau)']),
      champTxt('R', 'R :', ['Rigide', 'type rigide', 'Type : rigide']),
      champTxt('L', 'L :', ['Lisse', 'aspect lisse', 'Aspect : lisse']),
      champNum('c1', '1er chiffre 3 :', 750, 0, 'N', [
        'moyenne', 'moyen', 'résistance à l’écrasement moyenne', 'résistance à l’écrasement moyen', 'écrasement moyen',
        'Résistance à l’écrasement moyenne 750 N', 'résistance à l’écrasement moyenne (750 N)',
      ]),
      champNum('c2', '2e chiffre 3 :', 2, 0, 'J', [
        'moyenne', 'moyen', 'résistance au choc moyenne', 'résistance aux chocs moyenne', 'choc moyen',
        'Résistance au choc moyenne 2J', 'résistance au choc moyenne (2 J)',
      ]),
      champNum('c3', '3e chiffre 2 :', -5, 0, '°C', [
        'température minimum d’utilisation et d’installation -5 °C', 'température minimale -5 °C', 'moins 5 °C', '-5°C',
      ]),
      champNum('c4', '4e chiffre 1 :', 60, 0, '°C', [
        'température maximale d’utilisation et d’installation +60 °C', 'température maximale 60 °C', '+60 °C', '+60°C',
      ]),
    ],
    indice: 'Tableaux « Codification des lettres » et « Codification des chiffres » du DTR 44.',
    aides: [
      '📖 DTR 44 : « Codification des lettres – appellation normalisée » et « Codification des chiffres – 4 premiers chiffres de la classification ».',
      '🧭 Méthode : chaque lettre se lit dans sa colonne (matériau, type, aspect) ; chaque chiffre dans le tableau de son RANG (1er : écrasement, 2e : choc, 3e : température minimale, 4e : température maximale). Un même chiffre n’a pas le même sens selon son rang.',
      '✏️ Forme de la réponse : un mot pour chaque lettre ; pour chaque chiffre, la caractéristique et sa valeur avec l’unité (N, J, °C).',
    ],
    erreursTypiques: [
      {
        id: 'g25-c3-positif', champ: 'c3', nombre: { valeur: 5, tolerance: 0 },
        message: 'Le 3e chiffre donne la température MINIMALE : relis la ligne 2 de son tableau (attention au signe).',
      },
      {
        id: 'g25-c1-1250', champ: 'c1', nombre: { valeur: 320, tolerance: 0 },
        message: 'Tu as lu la ligne 2 : le 1er chiffre de la classification est un 3.',
      },
    ],
    explication: 'I : isolant ; R : rigide ; L : lisse ; 3 : résistance à l’écrasement moyenne (750 N) ; 3 : résistance au choc moyenne (2 J) ; 2 : température minimale d’utilisation et d’installation −5 °C ; 1 : température maximale d’utilisation et d’installation +60 °C.',
  },

  /* ═══════════════ G.3 — Cellules de sécurité et flash ═══════════════ */
  {
    label: 'G.3.1', partie: 7, type: 'tableau',
    enonce: 'Les cellules de sécurité et le flash ne sont pas fournis dans le kit de motorisation. À partir des documents ressources, **compléter** le tableau des caractéristiques des cellules photoélectriques.',
    competence: 'C3', points: 5, dtr: [pageDtr(46)], pageSujet: 43,
    colonnes: ['Caractéristiques', 'Valeur'],
    lignes: [
      { cellules: ['Tension nominale d’alimentation des cellules', txt('g31-tension', [
        '12 ou 24 V DC/AC', '12 ou 24 VDC/VAC', '12 ou 24 V AC/DC', '12 à 24 V DC/AC', '12 à 24 V AC/DC', '12 à 24 VDC/VAC',
        '12-24 V AC/DC', '12-24 V DC/AC', '12--24V AC/DC', '12 - 24 V AC/DC', '12/24 V', '12/24 V AC/DC', '12 ou 24 V', '12 à 24 V',
        '12-24 V', '12 V ou 24 V', '12 V à 24 V', '12 V ou 24 V AC/DC', '12 à 24 V continu ou alternatif',
      ])] },
      { cellules: ['Distance maximale entre l’émetteur et le récepteur', num('g31-distance', 15, 0, ['± 15 m', '15 m', '15 mètres'])] },
      { cellules: ['Intensité maximale de la cellule émettrice', num('g31-tx', 30, 0, ['30 mA', '0,03 A', '0.03 A'])] },
      { cellules: ['Intensité maximale de la cellule réceptrice', num('g31-rx', 15, 0, ['15 mA', '0,015 A', '0.015 A'])] },
      { cellules: ['Type de contact de sortie', txt('g31-contact', [
        'NO/NC paramétrable', 'NO/NC', 'NO ou NC', 'NC ou NO', 'NC/NO', 'NC or NO', 'NO-NC', 'NO NC', 'NO/NC par cavalier',
        'NO/NC par jumper', 'NO ou NC paramétrable', 'relais NO/NC', 'contact NO/NC', 'relais NO ou NC', 'contact sec NO/NC',
        'relais NC ou NO', 'NO/NC paramétrable par cavalier', 'NF/NO', 'NO/NF', 'NO ou NF',
      ])] },
    ],
    indice: 'DTR 46 : « Entrée : RX … – TX … » donne les intensités ; le type de contact se lit sur le schéma « Connecter les cellules » (cavalier JUMP).',
    aides: [
      '📖 Ouvre le DTR 46 : spécifications techniques de la cellule et schéma « Connecter les cellules ».',
      '🧭 Méthode : RX désigne le récepteur, TX l’émetteur ; pour la distance, prends la valeur nominale (sans la réduction par mauvais temps) ; pour le contact, regarde le relais et son cavalier sur le schéma de raccordement.',
      '✏️ Forme de la réponse : une valeur avec son unité par ligne (V, m, mA) et, pour le contact, son type.',
    ],
    erreursTypiques: [
      {
        id: 'g31-rx-tx-inverses', champ: 'g31-tx', nombre: { valeur: 15, tolerance: 0 },
        message: 'Tu as inversé émetteur et récepteur : TX est l’émetteur, RX le récepteur.',
      },
      {
        id: 'g31-sortie-relais', champ: 'g31-contact', valeurs: ['1A max 36V', '1 A max 36 V', 'relais 1A 36V'],
        message: 'C’est le pouvoir de coupure du relais ; la question porte sur le TYPE de contact (ouverture, fermeture ?).',
      },
    ],
    explication: 'Tension : 12 ou 24 V DC/AC ; distance maximale : 15 m ; émetteur (TX) : 30 mA ; récepteur (RX) : 15 mA ; contact de sortie : NO/NC paramétrable (cavalier).',
  },
  {
    label: 'G.3.2', partie: 7, type: 'valeur',
    enonce: 'À partir de la documentation de la motorisation, **indiquer** les numéros des bornes utilisées sur la carte électronique de gestion du moteur sur lesquelles seront raccordées les cellules photoélectriques, qui protègent la fermeture du portail. L’alimentation des cellules se fera avec test de celles-ci.',
    competence: 'C3', points: 4, dtr: [STAR_BRANCHEMENT, STAR_CARTE], pageSujet: 43,
    champs: [
      champNum('plus', 'Alimentation + des cellules : borne', 15, 0, undefined, ['borne 15']),
      champNum('moins', 'Alimentation − des cellules : borne', 13, 0, undefined, [
        '17', '19', 'borne 13', 'borne 17', 'borne 19', '13, 17 ou 19', '13 ou 17 ou 19', '13/17/19',
      ]),
      champNum('contact', '+12 V du contact de la cellule RX : borne', 4, 0, undefined, [
        '8', '14', 'borne 4', 'borne 8', 'borne 14', '4 ou 8', '4 (ou 8)', '4 ou 8 ou 14', '4/8',
      ]),
      champNum('retour', 'Retour de la cellule RX : borne', 7, 0, undefined, ['borne 7']),
    ],
    indice: 'DTR 45, tableau de branchement : « + (12 VTX) Alim test photo », « − 0 V CC », « + Commun », « Photo 2 – stop fermeture ».',
    aides: [
      '📖 DTR 45 : tableau « Branchement des câbles sur la carte électronique AKIA PU2M » et schéma de la carte (Commun +12 V).',
      '🧭 Méthode : pour chaque ligne, cherche la fonction dans le tableau : l’alimentation AVEC TEST n’est pas l’alimentation permanente ; le retour de la cellule arrive sur l’entrée photo qui protège la FERMETURE, pas l’ouverture ; le contact de la cellule est alimenté par un commun +12 V.',
      '✏️ Forme de la réponse : un numéro de borne (1 à 19) par ligne.',
    ],
    erreursTypiques: [
      {
        id: 'g32-plus-14', champ: 'plus', nombre: { valeur: 14, tolerance: 0 },
        message: 'La borne 14 est l’alimentation permanente des cellules : l’énoncé impose l’alimentation AVEC TEST.',
      },
      {
        id: 'g32-retour-6', champ: 'retour', nombre: { valeur: 6, tolerance: 0 },
        message: 'La borne 6 est la photo « stop ouverture » : les cellules protègent ici la FERMETURE du portail.',
      },
    ],
    explication: 'Alimentation + des cellules (avec test) : borne 15 (12 VTX) ; alimentation − : borne 13, 17 ou 19 (0 V CC) ; +12 V du contact RX : borne 4 (ou 8, commun +12 V) ou 14 ; retour de la cellule RX : borne 7 (photo 2 – stop fermeture avec renvoi en ouverture).',
  },
  {
    label: 'G.3.3', partie: 7, type: 'tableau',
    enonce: 'À partir de sa notice technique, **indiquer** les caractéristiques de la lampe flash.',
    competence: 'C3', points: 2, dtr: [pageDtr(47)], pageSujet: 44,
    colonnes: ['Caractéristiques', 'Valeurs'],
    lignes: [
      { cellules: ['Tension nominale d’alimentation de la lampe :', txt('g33-tension', [
        '12 ou 24 V AC/DC ou 230 V AC', '12 ou 24 VAC/VDC ou 230 VAC', '12 ou 24 VDC/VAC ou 230 VAC', '12/24 V AC/DC ou 230 V AC',
        '12/24 V ou 230 V', '12, 24 ou 230 V', '12 V, 24 V ou 230 V', '12/24/230 V', '12 ou 24 ou 230 V', '12 - 24 - 230 V',
        '12 V ou 24 V ou 230 V', '12 ou 24 V ou 230 V', '12-24-230 V',
      ])] },
      { cellules: ['Consommation électrique :', txt('g33-conso', [
        '< 1 W', '<1W', 'moins de 1 W', 'Moins 1 W', 'moins d’1 W', 'inférieure à 1 W', 'inférieur à 1 W', '< 1W', 'moins de 1W',
      ])] },
    ],
    indice: 'Tableau « Caractéristiques Techniques » du DTR 47 : lignes « Alimentation » et « Consommation ».',
    aides: [
      '📖 Ouvre le DTR 47 : tableau « Caractéristiques Techniques » de la lampe flash.',
      '🧭 Méthode : la lampe accepte plusieurs tensions : cite-les toutes ; ne confonds pas la puissance de la lampe et la consommation électrique, deux lignes différentes du tableau.',
      '✏️ Forme de la réponse : les tensions possibles (avec AC / DC) et une puissance en watts (attention au signe devant la valeur).',
    ],
    erreursTypiques: [
      {
        id: 'g33-25w', champ: 'g33-conso', valeurs: ['25 W', '25W', '25'],
        message: '25 W est la « puissance lampe » ; la question demande la ligne « Consommation ».',
      },
    ],
    explication: 'Tension : 12 ou 24 V AC/DC (± 10 %) ou 230 V AC (± 10 %) ; consommation électrique : moins de 1 W.',
  },
  {
    label: 'G.3.4', partie: 7, type: 'cocher',
    enonce: 'En vous servant de la documentation du flash, **entourer** les bornes permettant l’alimentation par une tension de 12 V.',
    contexte: 'À l’écran : coche le couple de bornes (numérotation de la Fig. 1 du DTR 47) qu’il faudrait entourer.',
    competence: 'C3', points: 1, dtr: [pageDtr(47)], pageSujet: 44,
    image: { src: `${IMG}/q-g34-flash.jpg`, alt: 'Carte de la lampe flash : photo (bornes repérées par des flèches) et dessin vu de dessus avec le cavalier JP1' },
    options: ['Bornes 1 et 2', 'Bornes 3 et 4', 'Bornes 3 et 5', 'Bornes 4 et 5'],
    bonnes: [1],
    indice: 'Paragraphe « Alimentation : Fig. 1 » du DTR 47.',
    aides: [
      '📖 DTR 47 : paragraphe « Alimentation » (une ligne par tension) et Fig. 1 (numéros des bornes 1 à 5).',
      '🧭 Méthode : repère la ligne de la tension demandée (12 V AC/DC) et les deux bornes qu’elle cite ; les bornes 1-2 sont sur le petit bornier, 3-4-5 sur le grand.',
      '✏️ Forme de la réponse : une seule case : le couple de bornes de l’alimentation 12 V.',
    ],
    erreursTypiques: [
      {
        id: 'g34-24v', valeurs: ['Bornes 3 et 5'],
        message: 'Les bornes 3 et 5 correspondent à une autre tension d’alimentation : relis la ligne 12 V du DTR 47.',
      },
      {
        id: 'g34-230v', valeurs: ['Bornes 1 et 2'],
        message: 'Les bornes 1 et 2 sont celles de l’alimentation 230 V AC : relis la ligne 12 V du DTR 47.',
      },
    ],
    // Corrigé officiel : l’ellipse est tracée à l’extrémité gauche du bornier à 3 vis du dessin (bornes 3 et 4 :
    // le dessin est vu en miroir de la photo Fig. 1).
    explication: 'Alimentation 12 V AC/DC : bornes 3 et 4 (24 V : bornes 3 et 5 ; 230 V AC : bornes 1 et 2). Sur le dessin de la carte, ce sont les deux premières vis, à gauche, du bornier à trois vis.',
  },
  {
    label: 'G.3.5', partie: 7, type: 'cocher',
    enonce: 'Cette lampe a la possibilité de fonctionner en mode flash ou fixe. **Entourer** la position du jumper JP1 pour avoir la lampe en version flash.',
    contexte: 'À l’écran : coche la position du cavalier JP1 sur le dessin de la carte ci-dessous.',
    competence: 'C6', points: 1, dtr: [pageDtr(47)], pageSujet: 44,
    image: { src: `${IMG}/q-g35-jp1.jpg`, alt: 'Dessin de la carte de la lampe flash avec le cavalier JP1 à trois broches' },
    options: [
      'Cavalier JP1 sur les deux broches de gauche (sur le dessin)',
      'Cavalier JP1 sur les deux broches de droite (sur le dessin)',
      'Sans cavalier sur JP1',
    ],
    bonnes: [0],
    indice: 'Mode clignotant : Fig. 3 du DTR 47 ; compare l’orientation de la photo et celle du dessin (position des borniers).',
    aides: [
      '📖 DTR 47 : paragraphe « Mode de fonctionnement » et figures Fig. 2 (fixe) / Fig. 3 (clignotant).',
      '🧭 Méthode : la notice décrit la position du cavalier sur la PHOTO ; avant de reporter « gauche » ou « droite » sur le dessin, compare les deux vues : où se trouvent le bornier à deux vis et celui à trois vis sur chacune ? Si le dessin est vu en miroir, la gauche et la droite s’inversent.',
      '✏️ Forme de la réponse : une seule case : la position du cavalier sur le dessin.',
    ],
    erreursTypiques: [
      {
        id: 'g35-droite-photo', valeurs: ['Cavalier JP1 sur les deux broches de droite (sur le dessin)'],
        message: 'La notice dit « droite » en regardant la PHOTO (Fig. 3) ; compare la disposition des borniers sur la photo et sur le dessin : les deux vues ne sont pas orientées de la même façon.',
      },
    ],
    // Corrigé officiel : l’ellipse entoure les broches de gauche de JP1 sur le dessin (la notice dit « position
    // droite » sur la photo Fig. 3 : le dessin est vu en miroir, cf. borniers inversés).
    explication: 'Mode clignotant : cavalier JP1 en position droite sur la photo de la notice (Fig. 3), soit les deux broches de GAUCHE sur le dessin, vu en miroir (le bornier à trois vis y est à gauche, alors qu’il est à droite sur la photo).',
  },

  /* ═══════════════ G.4 — Commande GSM ═══════════════ */
  {
    label: 'G.4.1', partie: 7, type: 'valeur',
    enonce: '**Préciser** quel abonnement supplémentaire devra souscrire le client pour obtenir le fonctionnement qu’il désire.',
    contexte: 'Commande GSM d’ouverture de portail. Notre client souhaite pouvoir commander le portail avec les télécommandes fournies, mais aussi à partir de son téléphone, en envoyant un SMS pour demander l’ouverture de celui-ci aussi bien en version totale qu’en version piéton.',
    competence: 'C12', points: 1, dtr: [pageDtr(48)], pageSujet: 45,
    champs: [champTxt('abonnement', 'Abonnement', [
      'abonnement téléphonique cellulaire', 'un abonnement téléphonique cellulaire', 'abonnement téléphonique', 'abonnement cellulaire',
      'abonnement téléphonique mobile', 'abonnement mobile', 'abonnement GSM', 'abonnement téléphone portable', 'abonnement téléphone mobile',
      'forfait téléphonique', 'forfait mobile', 'forfait GSM', 'forfait SMS', 'abonnement SMS', 'carte SIM', 'une carte SIM',
      'carte SIM avec abonnement', 'abonnement avec carte SIM', 'forfait téléphone', 'forfait téléphone mobile', 'abonnement opérateur mobile',
      'abonnement à un opérateur mobile', 'abonnement téléphonique (carte SIM)', 'abonnement de téléphonie mobile',
    ], 'Type d’abonnement')],
    indice: 'Le récepteur GSM comporte un emplacement « SIM » : il reçoit les SMS comme un téléphone portable.',
    aides: [
      '📖 DTR 48 : description du récepteur GSM (module GSM quadri bandes intégré, vue de face du produit).',
      '🧭 Méthode : pour recevoir des SMS ou des appels, le récepteur doit être connecté à un réseau… comme ton téléphone : que faut-il souscrire auprès d’un opérateur ?',
      '✏️ Forme de la réponse : « un abonnement … » en quelques mots.',
    ],
    explication: 'Un abonnement téléphonique cellulaire (carte SIM) pour le récepteur GSM.',
  },
  {
    label: 'G.4.2', partie: 7, type: 'valeur',
    enonce: '**Indiquer** la référence du produit qui correspond au cahier des charges du client.',
    competence: 'C3', points: 1, dtr: [pageDtr(48)], pageSujet: 45,
    champs: [champTxt('reference', 'Référence', ref('GSM800', 'GSM 800'), 'Référence du récepteur')],
    indice: 'Ouverture totale ET ouverture piéton : il faut deux sorties.',
    aides: [
      '📖 DTR 48 : premier paragraphe (versions à une ou deux sorties relais).',
      '🧭 Méthode : compte le nombre de commandes différentes que le client veut donner par SMS : il faut une sortie relais par commande.',
      '✏️ Forme de la réponse : la référence du récepteur (lettres et chiffres).',
    ],
    erreursTypiques: [
      {
        id: 'g42-gsm700', champ: 'reference', valeurs: ['GSM700', 'GSM 700'],
        message: 'Cette version n’a qu’une sortie relais : le client veut deux commandes (ouverture totale et ouverture piéton).',
      },
    ],
    explication: 'GSM800 : deux sorties relais (Sortie 1 : ouverture totale ; Sortie 2 : ouverture partielle / piéton).',
  },
  {
    label: 'G.4.3', partie: 7, type: 'valeur',
    enonce: '**Indiquer** quelles sont les entrées sur la carte de gestion permettant les 2 commandes (totale et partielle).',
    competence: 'C3', points: 2, dtr: [STAR_BRANCHEMENT, pageDtr(48)], pageSujet: 45,
    tableauContexte: {
      colonnes: ['Commande', 'Récepteur GSM'],
      lignes: [['Demande d’ouverture totale', 'Sortie 1'], ['Demande d’ouverture partielle', 'Sortie 2']],
    },
    champs: [
      champNum('totale', 'Demande d’ouverture totale (Sortie 1) : N° de borne carte moteur', 3, 0, undefined, ['borne 3']),
      champNum('partielle', 'Demande d’ouverture partielle (Sortie 2) : N° de borne carte moteur', 5, 0, undefined, ['borne 5']),
    ],
    indice: 'Tableau de branchement du DTR 45 : « Contact BP1 (ouverture totale) », « Contact BP2 (ouverture partielle) ».',
    aides: [
      '📖 DTR 45 : tableau « Branchement des câbles sur la carte électronique AKIA PU2M ».',
      '🧭 Méthode : chaque sortie du récepteur GSM remplace un bouton-poussoir : cherche l’entrée « contact » de la carte qui correspond à chaque type d’ouverture.',
      '✏️ Forme de la réponse : un numéro de borne par commande.',
    ],
    erreursTypiques: [
      {
        id: 'g43-commun', champ: 'totale', nombre: { valeur: 4, tolerance: 0 },
        message: 'La borne 4 est le commun +12 V : l’entrée de commande est la borne du contact.',
      },
      {
        id: 'g43-inverse', champ: 'totale', nombre: { valeur: 5, tolerance: 0 },
        message: 'Tu as inversé les deux commandes : relis quel contact (BP1 / BP2) commande l’ouverture totale.',
      },
    ],
    explication: 'Ouverture totale (Sortie 1) : borne 3 (contact BP1) ; ouverture partielle (Sortie 2) : borne 5 (contact BP2).',
  },
  {
    label: 'G.4.4', partie: 7, type: 'redige',
    enonce: 'Ouverture du portail en l’absence d’énergie électrique. En vous servant de la documentation technique et commerciale de la motorisation STAR24, **proposer** une solution pour l’ouverture de ce portail lors de l’absence d’énergie électrique.',
    competence: 'C12', points: 2, dtr: [STAR_CARAC, pageDtr(41)], pageSujet: 45,
    motsCles: ['batterie', 'batteries', 'secours', 'autonome', 'déverrouillage', 'débrayage', 'manuel', 'manuelle', 'serrure'],
    minMotsCles: 1,
    corrige: 'Deux solutions acceptables : soit l’utilisation des batteries (de secours) pour un fonctionnement autonome sans présence d’énergie, soit le déverrouillage manuel et l’ouverture manuelle du portail.',
    lignes: 4,
    indice: 'Regarde la vue éclatée du DTR 45 : un des éléments du kit permet de fonctionner sans le réseau.',
    aides: [
      '📖 DTR 45 : « Caractéristiques techniques » (vue éclatée et tableau Star 24 / Star 24 Pro).',
      '🧭 Méthode : deux pistes : garder la motorisation en service grâce à une source d’énergie embarquée, ou libérer le portail pour l’ouvrir à la main.',
      '✏️ Forme de la réponse : une ou deux phrases qui décrivent la solution et l’élément du kit utilisé.',
    ],
    explication: 'La STAR 24 dispose de batteries de secours (2 × 12 V / 2,3 Ah) qui assurent un fonctionnement autonome en cas de coupure ; à défaut, on déverrouille la motorisation pour ouvrir le portail à la main.',
  },

  /* ═══════════════ G.5 — Schéma de câblage ═══════════════ */
  {
    label: 'G.5', partie: 7, type: 'schema',
    enonce: 'Schéma de câblage de l’ensemble des périphériques. **Compléter** le schéma de raccordement ci-dessous avec soin (traits à la règle).',
    contexte: 'Remarque : le portail n’est pas équipé de cellules de sécurité d’ouverture, prenez soin de raccorder la borne 6 au +12 V.',
    competence: 'C11', points: 16.5, dtr: [STAR_BRANCHEMENT, STAR_CARTE, pageDtr(46), pageDtr(47), pageDtr(48)], pageSujet: 46,
    image: { src: `${IMG}/q-g5-schema.jpg`, alt: 'Schéma de raccordement des périphériques du portail à compléter' },
    traits: G5_TRAITS,
    platineTpId: 'chevrerie-g5-portail',
    corrigeImage: { src: 'corriges/chevrerie/q-g5-corrige.jpg', alt: 'Schéma de raccordement des périphériques du portail — corrigé' },
    indice: 'Reprends tes réponses G.3.2 (cellules), G.3.4 (flash 12 V) et G.4.3 (sorties du GSM) ; le commun +12 V (borne 4) alimente les contacts du GSM, la borne 6 et le COM de la cellule réceptrice.',
    aides: [
      '📖 DTR 45 (tableau de branchement de la carte AKIA PU2M), DTR 46 (connexion des cellules R et T), DTR 47 (alimentation du flash), DTR 48 (sorties relais du GSM).',
      '🧭 Méthode : procède par fonction : 1) moteur sur 20-21 en respectant les couleurs du tableau ; 2) alimentation des deux cellules (+ avec test, −) ; 3) contact de la cellule RX entre le commun +12 V et l’entrée photo de fermeture ; 4) borne 6 au +12 V (pas de cellule d’ouverture) ; 5) flash sur son alimentation dédiée ; 6) chaque sortie du GSM entre le commun +12 V et l’entrée d’ouverture correspondante (contact à fermeture).',
      '✏️ Forme de la réponse : des traits borne à borne (+ en rouge, − en noir de préférence) ; les bornes au même potentiel peuvent être reliées en chaîne ; puis le même câblage sur la platine.',
    ],
    explication: 'Corrigé : GSM Sortie 1 C → borne 3 et Sortie 2 C → borne 5 ; contacts NA des deux sorties reliés au commun +12 V (borne 4), lui-même relié à la borne 6 et au COM de la cellule RX ; OUT de la RX → borne 7 ; + des cellules RX et TX → borne 15 (alimentation avec test) ; − des cellules et borne 4 du flash → borne 17 (0 V) ; borne 16 → borne 3 du flash ; moteur : borne 20 (−) → fil bleu, borne 21 (+) → fil rouge.',
  },
];
