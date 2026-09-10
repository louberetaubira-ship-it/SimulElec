/**
 * Fiches de rappel de cours et règles de calcul, affichées quand l'élève bloque
 * (composant `src/components/parcours/AideCours.tsx`).
 *
 * Chaque fiche reste courte : un résumé (2 à 4 phrases), les règles ou formules à retenir
 * (rendues en `--font-mono`), un exemple chiffré, les pièges fréquents et une phrase de
 * cadrage par diplôme (`levels`), pour ne pas demander la même chose à un CAP et à un BTS.
 */

import type { DiplomaId } from './competences';

export type CoursId =
  | 'plaque-moteur'
  | 'contacteur'
  | 'transfo-commande'
  | 'borniers'
  | 'regles-cablage'
  | 'tests-hors-tension'
  | 'epi-habilitation'
  | 'consignation'
  | 'deconsignation'
  | 'mesure-tension'
  | 'mesure-courant'
  | 'vitesse-glissement'
  | 'couplage'
  | 'diagnostic'
  | 'automate-m221'
  | 'loi-ohm-puissance'
  | 'energie'
  | 'serie-parallele'
  | 'pv-tension-systeme'
  | 'pv-voc-temperature'
  | 'pv-batterie'
  | 'chute-tension'
  | 'calibre-protection'
  | 'dc-ac'
  | 'tableau-logement';

/** Une phrase de cadrage par diplôme : ce qu'on attend de l'élève à ce niveau. */
export type CoursLevels = Record<DiplomaId, string>;

export interface CoursFiche {
  id: CoursId;
  /** Thème court, affiché en onglet. */
  theme: string;
  title: string;
  /** 2 à 4 phrases de rappel. */
  summary: string;
  /** Formules et règles, affichées en police à chasse fixe. */
  rules: string[];
  /** Exemple chiffré résolu. */
  example: string;
  /** Erreurs fréquentes. */
  pieges: string[];
  levels: CoursLevels;
}

const F = (f: CoursFiche): CoursFiche => f;

export const COURS: Record<CoursId, CoursFiche> = {
  'plaque-moteur': F({
    id: 'plaque-moteur',
    theme: 'Plaque moteur',
    title: 'Lire une plaque signalétique et choisir le calibre GV2 / LRD',
    summary:
      "La plaque du moteur donne tout ce qu'il faut pour protéger le départ : les deux tensions de couplage (400 V Y / 230 V Δ), les deux courants correspondants, la puissance utile, la vitesse et le cos φ. Sur un réseau 400 V triphasé, tu retiens le courant de la ligne « 400 V » : c'est l'intensité nominale In du moteur. Le disjoncteur moteur (GV2) ou le relais thermique (LRD) se règle sur cette valeur, et sa plage doit l'encadrer.",
    rules: [
      'In = valeur lue sur la plaque, ligne de la tension du réseau (400 V Y)',
      'Plage de réglage : Ireg_min ≤ In ≤ Ireg_max  (In dans le premier tiers de la plage)',
      'Réglage du GV2 / LRD : Ir = In (pas Imax, pas Idémarrage)',
      'Id ≈ 6 à 8 × In (démarrage direct) — ne sert PAS au réglage thermique',
      'P = U · I · √3 · cos φ · η  →  In = P / (U · √3 · cos φ · η)',
    ],
    example:
      "Plaque : 1,5 kW · 400 V Y / 230 V Δ · 3,5 A / 6,1 A · cos φ 0,80. Sur réseau 400 V : In = 3,5 A. Un GV2-ME08 (2,5 à 4 A) encadre 3,5 A : c'est le bon calibre. Le GV2-ME10 (4 à 6,3 A) ne protégerait plus le moteur.",
    pieges: [
      'Prendre le courant de la ligne 230 V (couplage triangle) sur un réseau 400 V.',
      'Régler la protection sur le courant de démarrage au lieu de In.',
      'Choisir une plage où In est à l\'extrémité haute : plus aucune marge de réglage.',
    ],
    levels: {
      cap: 'Tu dois savoir lire In sur la plaque et vérifier que la plage du GV2 contient cette valeur.',
      bacpro: 'Tu justifies le calibre à partir de In, tu vérifies la classe de déclenchement (classe 10) et le pouvoir de coupure.',
      bts: 'Tu retrouves In par le calcul (P, U, cos φ, rendement) et tu justifies le choix vis-à-vis de la coordination des protections.',
      cster: 'Tu relèves In pour dimensionner le départ et vérifier la compatibilité avec la source (onduleur, groupe).',
    },
  }),

  contacteur: F({
    id: 'contacteur',
    theme: 'Contacteur',
    title: 'Contacteur, bobine, auto-maintien et contacts auxiliaires',
    summary:
      "Un contacteur possède un circuit de puissance (1-2, 3-4, 5-6) et un circuit de commande (bobine A1-A2). Tant que la bobine est alimentée sous sa tension nominale, tous les contacts changent d'état. Le bouton poussoir S2 n'est appuyé qu'un instant : c'est le contact auxiliaire NO 13-14 du contacteur, câblé en parallèle sur S2, qui garde la bobine alimentée. C'est l'auto-maintien.",
    rules: [
      'Puissance : 1-2 / 3-4 / 5-6 (nombres impairs = amont, pairs = aval)',
      'Bobine : A1 (+ commande) et A2 (0 V commande)',
      'Auxiliaire NO : 13-14  → auto-maintien, en parallèle sur S2',
      'Auxiliaire NF : 21-22  → verrouillage, coupe l\'autre contacteur',
      'Relais thermique : 95-96 (NF, dans la commande) · 97-98 (NO, signalisation)',
      'Boucle de commande : F3 → 95-96 → S1 (NF) → S2 (NO) // 13-14 → A1 … A2',
    ],
    example:
      "Appui sur S2 : la bobine A1-A2 reçoit 24 V, KM1 colle, 13-14 se ferme. Relâchement de S2 : le courant passe maintenant par 13-14, KM1 reste collé. Appui sur S1 (NF) : la boucle est coupée, KM1 retombe et 13-14 s'ouvre — l'arrêt est prioritaire.",
    pieges: [
      'Câbler 13-14 en série avec S2 au lieu de parallèle : le moteur s\'arrête au relâchement.',
      'Mettre le contact 95-96 dans le circuit de puissance : le thermique ne coupe pas la puissance lui-même.',
      'Choisir une bobine 230 V alors que la commande est en 24 V.',
    ],
    levels: {
      cap: 'Tu repères la bobine A1-A2 et le contact 13-14, et tu câbles l\'auto-maintien d\'après le schéma.',
      bacpro: 'Tu expliques le rôle de chaque contact et tu vérifies l\'ordre de la boucle : protection, arrêt, marche, maintien.',
      bts: 'Tu justifies la catégorie d\'emploi (AC-3), le pouvoir de coupure et la coordination contacteur / protection.',
      cster: 'Tu identifies la commande d\'un contacteur de couplage ou de délestage et sa tension de bobine.',
    },
  }),

  'transfo-commande': F({
    id: 'transfo-commande',
    theme: 'Transformateur',
    title: 'Transformateur de commande 400 / 24 V et protections F2 / F3',
    summary:
      "Le circuit de commande est alimenté en très basse tension de sécurité (24 V) par un transformateur T1. Le primaire est raccordé sur deux phases (400 V) ou phase-neutre (230 V) selon la borne utilisée ; le secondaire donne 24 V. Le primaire est protégé par F2 (bipolaire, côté 400 V), le secondaire par F3 (unipolaire, côté 24 V). Les deux protections sont indispensables : elles ne protègent pas le même circuit.",
    rules: [
      'Primaire : bornes 0 · 230 · 400  → choisir 0-400 sur réseau triphasé',
      'Secondaire : bornes 0V · 24V · 48V  → utiliser 0V-24V',
      'Rapport m = U2 / U1 = N2 / N1   ·   U2 = U1 · N2 / N1',
      'S (VA) = U2 · I2   →  I2 = S / U2  (courant secondaire disponible)',
      'F2 = protection primaire 2 pôles · F3 = protection secondaire 1 pôle',
      'Ordre de fermeture : Q1 → F2 → F3 ; ouverture dans l\'ordre inverse',
    ],
    example:
      "T1 de 100 VA, 400/24 V. Secondaire : I2 = 100 / 24 = 4,2 A. Bobine LC1D09 en 24 V : appel ≈ 70 VA, maintien ≈ 8 VA — le transformateur convient. Rapport m = 24 / 400 = 0,06.",
    pieges: [
      'Raccorder le primaire sur la borne 230 alors que le réseau est en 400 V : le secondaire chute à 14 V et la bobine ne colle pas.',
      'Oublier F3 : un court-circuit en commande fait déclencher tout le départ.',
      'Confondre 24 V alternatif (bobine AC) et 24 V continu (automate).',
    ],
    levels: {
      cap: 'Tu raccordes le primaire et le secondaire sur les bonnes bornes et tu refermes F2 puis F3.',
      bacpro: 'Tu justifies le rôle de la TBTS, le calibre de F2 et F3 et tu vérifies la tension au secondaire.',
      bts: 'Tu dimensionnes le transformateur à partir du bilan des bobines (appel et maintien) et tu justifies les protections.',
      cster: 'Tu identifies l\'alimentation auxiliaire d\'un coffret et sa protection.',
    },
  }),

  borniers: F({
    id: 'borniers',
    theme: 'Borniers',
    title: 'Borniers X1 / X2, repérage et sections',
    summary:
      "Le bornier est la frontière de l'armoire : tout ce qui entre ou sort passe par lui. X1 regroupe la puissance (arrivée réseau, départ moteur), X2 la commande (boutons, voyants, capteurs). Chaque borne porte un repère (X1:1, X1:2…) reporté sur le schéma et sur l'étiquette du conducteur. On ne raccorde qu'un seul conducteur par borne côté extérieur.",
    rules: [
      'X1 = puissance, section 2,5 mm² (voire 4 ou 6 mm² selon In)',
      'X2 = commande, section 1,5 mm²',
      'Repérage : X1:1 … X1:9 · X2:1 … X2:6, identique sur le schéma et sur le fil',
      'Couleurs normalisées : PE vert-jaune · N bleu clair · phases brun / noir / gris',
      'Commande : rouge (24 V ou 230 V alternatif) · bleu foncé si continu',
      'Un conducteur par borne à l\'extérieur ; pontage par barrette à l\'intérieur',
    ],
    example:
      "Arrivée réseau : L1→X1:1, L2→X1:2, L3→X1:3, N→X1:4, PE→X1:5 (vert-jaune). Départ moteur : X1:6→U1, X1:7→V1, X1:8→W1, X1:9→PE. Boutons en porte : S1 et S2 sur X2:1 à X2:4, voyants sur X2:5 et X2:6.",
    pieges: [
      'Mélanger puissance et commande sur le même bornier.',
      'Utiliser le vert-jaune pour autre chose que le PE : c\'est interdit.',
      'Oublier le repérage : le dépannage devient impossible.',
    ],
    levels: {
      cap: 'Tu respectes le repérage du schéma et les couleurs, une borne = un conducteur.',
      bacpro: 'Tu justifies la séparation X1 / X2 et le choix des sections selon le courant à transporter.',
      bts: 'Tu définis le plan de bornier et le repérage dans le dossier technique.',
      cster: 'Tu repères les bornes DC et AC séparément, avec le marquage réglementaire.',
    },
  }),

  'regles-cablage': F({
    id: 'regles-cablage',
    theme: 'Règles de câblage',
    title: 'Règles de l\'art : peigne, goulottes, longueur des conducteurs',
    summary:
      "Un câblage d'armoire se juge à l'œil avant d'être mesuré. Les conducteurs descendent perpendiculairement de la borne à la goulotte la plus proche, cheminent en nappe sans croisement, puis remontent à la borne d'arrivée. On garde une petite longueur de réserve pour pouvoir déposer un appareil, mais pas de boucle inutile. Les conducteurs qui vont d'un appareil au suivant sur le même rail se font au peigne d'alimentation.",
    rules: [
      'Sortie de borne : verticale, vers la goulotte la plus proche (haut ou bas du rail)',
      'Changement de rangée : par la goulotte verticale la plus courte',
      'Nappe : les fils courts près du bord, les longs au fond, aucun croisement',
      'Réserve ≈ 10 % de la longueur, jamais de boucle enroulée',
      'Peigne : alimentation des modulaires d\'un même rail, sens amont → aval',
      'Remplissage d\'une goulotte ≤ 60 % de sa section',
    ],
    example:
      "Liaison Q1:2 → KM1:1 sur le même rail : peigne, 0 cm de goulotte. Liaison KM1:A1 → X2:3 (rail du dessous) : sortie verticale, goulotte du bas, goulotte verticale de droite, remontée sur X2 — environ 0,6 m.",
    pieges: [
      'Faire cheminer un fil en diagonale dans l\'armoire.',
      'Serrer les fils en toron avec des colliers au lieu d\'utiliser la goulotte.',
      'Couper trop court : impossible de déposer l\'appareil pour un remplacement.',
    ],
    levels: {
      cap: 'Tu câbles borne à borne en suivant le tableau, tes fils passent dans les goulottes.',
      bacpro: 'Tu réalises un câblage conforme aux règles de l\'art et tu réalises tes autocontrôles.',
      bts: 'Tu vérifies le remplissage des goulottes, les sections et la conformité au dossier.',
      cster: 'Tu sépares physiquement les circuits DC et AC dans les cheminements.',
    },
  }),

  'tests-hors-tension': F({
    id: 'tests-hors-tension',
    theme: 'Tests hors tension',
    title: 'Contrôles hors tension : VAT, continuité du PE, isolement 500 V',
    summary:
      "Avant toute mise sous tension, l'installation se contrôle hors tension. On vérifie d'abord l'absence de tension (VAT), puis la continuité du conducteur de protection entre le bornier PE et chaque masse, enfin l'isolement entre conducteurs actifs et entre actifs et terre. Ces trois contrôles conditionnent la mise en service : ils ne se sautent pas.",
    rules: [
      'Continuité PE : R ≤ 2 Ω, mesurée sous un courant ≥ 200 mA',
      'Isolement en TBT/BT : U essai = 500 V continu → R ≥ 0,5 MΩ',
      '(Circuits TBTS : 250 V → 0,5 MΩ · > 500 V : 1 000 V → 1 MΩ)',
      'Mesure d\'isolement : appareils électroniques et récepteurs déconnectés',
      'L\'ohmmètre injecte son propre courant : jamais sous tension (ERR, fusible)',
    ],
    example:
      "Continuité PE entre X1:5 et la carcasse du moteur : 0,4 Ω → conforme. Isolement 500 V entre U1 et PE : 12 MΩ → conforme. Une valeur de 0,1 MΩ signalerait un enroulement humide ou un défaut d'isolement.",
    pieges: [
      'Mesurer en ohms sans avoir consigné : l\'appareil affiche ERR et son fusible grille.',
      'Laisser un parafoudre ou un variateur raccordé pendant l\'essai à 500 V.',
      'Confondre continuité (Ω) et isolement (MΩ) : ce ne sont ni les mêmes bornes ni le même calibre.',
    ],
    levels: {
      cap: 'Tu réalises la continuité du PE et tu dis si la valeur est bonne.',
      bacpro: 'Tu réalises les trois contrôles, tu interprètes les valeurs au regard des prescriptions et tu les consignes.',
      bts: 'Tu justifies les tensions d\'essai et les seuils selon la norme et le domaine de tension.',
      cster: 'Tu contrôles l\'isolement des chaînes PV avant raccordement, panneau par panneau.',
    },
  }),

  'epi-habilitation': F({
    id: 'epi-habilitation',
    theme: 'EPI et habilitation',
    title: 'EPI et habilitation électrique (NF C 18-510)',
    summary:
      "L'habilitation est la reconnaissance, par l'employeur, de la capacité à effectuer une opération électrique donnée. La lettre indique le domaine de tension (B = basse tension), le premier chiffre le rôle, la lettre finale la nature de l'opération. Elle s'accompagne toujours des EPI adaptés : gants isolants, écran facial, vêtements sans partie conductrice, outils isolés 1 000 V.",
    rules: [
      'B0 : travaux d\'ordre non électrique en BT',
      'B1 / B1V : exécutant électricien (V = au voisinage)',
      'B2 / B2V : chargé de travaux (dirige l\'équipe)',
      'BR : chargé d\'intervention générale BT (dépannage, mesure)',
      'BC : chargé de consignation  ·  BE Essai / Mesure / Vérification',
      'EPI : gants isolants classe 00 ou 0, écran facial, chaussures, outils isolés 1 000 V',
    ],
    example:
      "Pour rechercher une panne sous tension sur une armoire BT, il faut être BR, porter gants et écran facial, utiliser des outils isolés et un multimètre CAT III 600 V minimum. Pour consigner le départ, c'est le chargé de consignation BC qui intervient.",
    pieges: [
      'Garder bagues, montre ou bracelet : ce sont des conducteurs.',
      'Croire que B1V autorise à consigner : la consignation est du ressort du BC.',
      'Utiliser un multimètre sans catégorie de mesure adaptée à l\'installation.',
    ],
    levels: {
      cap: 'Tu connais les EPI de base et tu ne travailles jamais sous tension.',
      bacpro: 'Tu identifies l\'habilitation nécessaire à l\'opération et les EPI correspondants.',
      bts: 'Tu définis le niveau d\'habilitation des intervenants et tu rédiges les consignes de prévention.',
      cster: 'Tu prends en compte le risque DC (pas de zéro de tension côté panneaux) et le travail en hauteur.',
    },
  }),

  consignation: F({
    id: 'consignation',
    theme: 'Consignation',
    title: 'La consignation en 5 étapes',
    summary:
      "Consigner, c'est mettre et maintenir un ouvrage hors tension de façon sûre. L'ordre des opérations n'est pas négociable : séparer, condamner, identifier, vérifier l'absence de tension, et en HTA mettre à la terre et en court-circuit. Chaque étape protège de ce que la précédente ne couvre pas.",
    rules: [
      '1. Séparation : ouvrir tous les conducteurs actifs, coupure visible ou certaine',
      '2. Condamnation : cadenas + étiquette « NE PAS MANŒUVRER », clé gardée',
      '3. Identification : repérer l\'ouvrage consigné (repère, schéma, folio)',
      '4. VAT : vérifier le vérificateur sur source connue, mesurer, re-vérifier',
      '5. MALT + CCT : mise à la terre et en court-circuit (obligatoire en HTA)',
      'VAT entre toutes les paires : L1-L2, L2-L3, L3-L1, L-N, L-PE',
    ],
    example:
      "Q1 ouvert (séparation), cadenas et étiquette posés (condamnation), platine identifiée par son repère et le folio 2 (identification), VAT vérifié sur la prise 230 V puis appliqué sur les trois paires de phases puis re-vérifié : l'installation est consignée.",
    pieges: [
      'Condamner avant d\'avoir ouvert : on ne cadenasse pas un appareil fermé.',
      'Ne vérifier le VAT qu\'une seule fois : s\'il est tombé en panne entre-temps, l\'absence de tension est fausse.',
      'Oublier le neutre lors de la VAT.',
    ],
    levels: {
      cap: 'Tu connais l\'ordre des étapes et tu les réalises sous la conduite du chargé de consignation.',
      bacpro: 'Tu réalises la consignation pour ton propre compte et tu justifies chaque étape.',
      bts: 'Tu rédiges l\'attestation de consignation et tu organises la coactivité sur le chantier.',
      cster: 'Tu consignes côté AC ET côté DC : sans coupure DC, les panneaux restent producteurs.',
    },
  }),

  deconsignation: F({
    id: 'deconsignation',
    theme: 'Déconsignation',
    title: 'Déconsignation et essais de mise en service',
    summary:
      "La déconsignation se fait dans l'ordre inverse de la consignation, et seulement après avoir vérifié que plus personne n'intervient et que l'installation est complète (capots, bornes serrées, outillage retiré). On retire la condamnation, on referme les appareils de l'amont vers l'aval, puis on procède aux essais fonctionnels.",
    rules: [
      'Vérifier : plus d\'intervenant, capots remis, outillage retiré',
      'Retirer la MALT-CCT, puis le cadenas et l\'étiquette',
      'Refermer dans l\'ordre : Q1 → F2 → F3 (amont vers aval)',
      'Essai à vide, puis en charge ; contrôler le sens de rotation',
      'Consigner les valeurs relevées sur le PV de mise en service',
    ],
    example:
      "Cadenas retiré, Q1 refermé, F2 puis F3 : les voyants s'allument. Appui sur S2 : KM1 colle, H1 s'allume, le moteur démarre. Appui sur S1 : arrêt immédiat. L'essai est concluant.",
    pieges: [
      'Refermer F3 avant Q1 : on met la commande sous tension sans la puissance, les essais sont faussés.',
      'Déconsigner alors qu\'un collègue intervient encore : la clé du cadenas est nominative.',
      'Oublier de contrôler le sens de rotation avant l\'accouplement de la machine.',
    ],
    levels: {
      cap: 'Tu remets en service dans l\'ordre demandé et tu constates le bon fonctionnement.',
      bacpro: 'Tu conduis les essais, tu vérifies la conformité au cahier des charges et tu complètes le PV.',
      bts: 'Tu appliques un protocole de mise en service formalisé et tu documentes les résultats.',
      cster: 'Tu mets en service l\'onduleur selon la procédure du constructeur : DC puis AC.',
    },
  }),

  'mesure-tension': F({
    id: 'mesure-tension',
    theme: 'Mesure de tension',
    title: 'Mesurer une tension alternative',
    summary:
      "La tension se mesure toujours en parallèle, appareil sur la position V~ (alternatif) et cordons dans les bornes V/Ω et COM. En triphasé, la tension entre deux phases est la tension composée (400 V), la tension entre une phase et le neutre est la tension simple (230 V). Le rapport entre les deux est √3.",
    rules: [
      'U composée = U simple × √3   →   400 = 230 × 1,732',
      'Entre phases : 400 V ~   ·   phase-neutre : 230 V ~   ·   commande : 24 V ~',
      'Voltmètre en parallèle, jamais en série',
      'Position du sélecteur : V~ pour l\'alternatif, V⎓ pour le continu',
      'Catégorie de mesure adaptée : CAT III 600 V minimum en armoire',
    ],
    example:
      "Aux bornes du sectionneur : L1-L2 = 400 V, L1-N = 230 V. Aux bornes de la bobine A1-A2 pendant l'appui sur S2 : 24 V — la commande arrive bien. Si tu lis 0 V, la coupure est en amont : F3, 95-96, S1 ou S2.",
    pieges: [
      'Rester sur la position Ω pour mesurer une tension : ERR et fusible grillé.',
      'Mesurer 230 V entre phases et conclure à un défaut : c\'était phase-neutre.',
      'Poser une seule pointe : une tension se mesure toujours entre deux points.',
    ],
    levels: {
      cap: 'Tu choisis la position V~ et tu mesures entre deux bornes en respectant la sécurité.',
      bacpro: 'Tu interprètes la valeur lue au regard du schéma et tu en déduis l\'état du circuit.',
      bts: 'Tu prends en compte la catégorie de mesure, l\'impédance de l\'appareil et l\'incertitude.',
      cster: 'Tu mesures aussi en continu côté panneaux et tu respectes la polarité.',
    },
  }),

  'mesure-courant': F({
    id: 'mesure-courant',
    theme: 'Mesure de courant',
    title: 'Mesurer un courant à la pince ampèremétrique',
    summary:
      "La pince mesure le champ magnétique créé par le courant : elle se serre autour d'UN seul conducteur, sans ouvrir le circuit. Si tu enserres deux conducteurs, la somme des courants s'annule et tu lis zéro. En triphasé, le courant de ligne se lit sur une phase ; en couplage triangle, le courant dans un enroulement vaut le courant de ligne divisé par √3.",
    rules: [
      'Un seul conducteur dans la pince, pince fermée, conducteur centré',
      'I ligne (étoile) = I enroulement',
      'I ligne (triangle) = I enroulement × √3   →   I enroulement = I ligne / 1,732',
      'I = P / (U · √3 · cos φ)  en triphasé  ·  I = P / (U · cos φ) en monophasé',
      'À vide : I ≈ 30 à 40 % de In · en charge nominale : I ≈ In',
    ],
    example:
      "Moteur 1,5 kW, 400 V, cos φ 0,80, η 0,80 : I = 1500 / (400 × 1,732 × 0,80 × 0,80) ≈ 3,4 A. La pince sur L1 affiche 3,5 A en charge : c'est conforme à la plaque.",
    pieges: [
      'Serrer la pince sur le câble complet (3 phases) : lecture nulle.',
      'Lire le courant à vide et conclure que le moteur est sous-chargé.',
      'Rester sur la position A⎓ pour un courant alternatif.',
    ],
    levels: {
      cap: 'Tu poses la pince sur un seul conducteur et tu compares la valeur lue à In.',
      bacpro: 'Tu retrouves I par le calcul et tu justifies l\'écart entre mesure et plaque.',
      bts: 'Tu exploites la mesure pour un bilan de puissance et tu tiens compte du facteur de puissance.',
      cster: 'Tu mesures le courant de chaîne PV en continu, avec une pince adaptée au DC.',
    },
  }),

  'vitesse-glissement': F({
    id: 'vitesse-glissement',
    theme: 'Vitesse et glissement',
    title: 'Vitesse de synchronisme et glissement',
    summary:
      "Le champ tournant d'un moteur asynchrone tourne à la vitesse de synchronisme, imposée par la fréquence du réseau et le nombre de paires de pôles. Le rotor tourne toujours un peu moins vite : cet écart relatif est le glissement. Il augmente avec la charge — c'est ce qui crée le couple.",
    rules: [
      'ns = 60 · f / p     (ns en tr/min, f en Hz, p = nombre de PAIRES de pôles)',
      'g = (ns − n) / ns    ·   g en % : g × 100',
      'n = ns · (1 − g)',
      '50 Hz : p=1 → 3000 · p=2 → 1500 · p=3 → 1000 · p=4 → 750 tr/min',
      'À vide g ≈ 0,5 % · en charge nominale g ≈ 3 à 6 %',
    ],
    example:
      "Moteur 4 pôles (p = 2) sur 50 Hz : ns = 60 × 50 / 2 = 1500 tr/min. Plaque : 1435 tr/min. g = (1500 − 1435) / 1500 = 0,043 soit 4,3 % — valeur normale à charge nominale.",
    pieges: [
      'Confondre nombre de pôles (4) et nombre de paires de pôles (2).',
      'Oublier le facteur 60 : on passe des tours par seconde aux tours par minute.',
      'Lire 1435 tr/min et croire à un défaut : c\'est justement la vitesse en charge.',
    ],
    levels: {
      cap: 'Tu compares la vitesse lue au tachymètre à celle de la plaque.',
      bacpro: 'Tu calcules ns et le glissement, et tu interprètes l\'écart en fonction de la charge.',
      bts: 'Tu relies glissement, couple et rendement, et tu exploites la caractéristique mécanique.',
      cster: 'Tu vérifies la vitesse d\'une pompe ou d\'un ventilateur alimenté par variateur.',
    },
  }),

  couplage: F({
    id: 'couplage',
    theme: 'Couplage',
    title: 'Couplage étoile / triangle à la plaque à bornes',
    summary:
      "La plaque du moteur donne deux tensions : la plus basse est celle que doit recevoir chaque enroulement. Sur le réseau, on choisit le couplage qui applique exactement cette tension. En étoile, chaque enroulement reçoit la tension composée divisée par √3 ; en triangle, il reçoit la tension composée entière.",
    rules: [
      'Plaque 400 V Y / 230 V Δ  →  réseau 400 V : couplage ÉTOILE',
      'Plaque 230 V Y / 400 V Δ  →  réseau 400 V : couplage TRIANGLE',
      'Étoile : U enroulement = U réseau / √3   ·   barrettes horizontales sur W2-U2-V2',
      'Triangle : U enroulement = U réseau   ·   barrettes verticales U1-W2, V1-U2, W1-V2',
      'Puissance en triangle ≈ 3 × puissance en étoile (même réseau)',
    ],
    example:
      "Plaque 400 V Y / 230 V Δ sur réseau 400 V : en étoile chaque enroulement voit 400 / 1,732 = 231 V, c'est correct. En triangle il verrait 400 V : le moteur grillerait en quelques secondes.",
    pieges: [
      'Coupler en triangle un moteur prévu en étoile sur le réseau : destruction des enroulements.',
      'Coupler en étoile un moteur prévu en triangle : le moteur ronfle, manque de couple.',
      'Laisser une barrette desserrée : une phase manquante fait chauffer les deux autres.',
    ],
    levels: {
      cap: 'Tu poses les barrettes selon la plaque et la tension du réseau.',
      bacpro: 'Tu justifies le couplage par le calcul U/√3 et tu vérifies le serrage.',
      bts: 'Tu relies le couplage au démarrage étoile-triangle et à la réduction du courant d\'appel.',
      cster: 'Tu vérifies le couplage d\'une pompe alimentée par onduleur ou groupe.',
    },
  }),

  diagnostic: F({
    id: 'diagnostic',
    theme: 'Diagnostic',
    title: 'Méthode de diagnostic : symptôme, hypothèses, mesures',
    summary:
      "Un dépannage ne se fait pas au hasard. On part du symptôme observé, on liste les causes possibles, puis on choisit la mesure qui élimine le plus d'hypothèses d'un coup — la dichotomie. On mesure au milieu du circuit suspect, puis on se déplace vers l'amont ou vers l'aval selon le résultat.",
    rules: [
      '1. Observer : que fait / ne fait pas l\'installation ? depuis quand ?',
      '2. Délimiter : puissance ou commande ? avant ou après le contacteur ?',
      '3. Hypothèses : lister les causes compatibles avec le symptôme',
      '4. Mesurer au milieu du circuit (dichotomie), pas borne à borne au hasard',
      '5. Conclure, réparer, RE-tester, consigner l\'intervention',
      'Commande morte → mesurer 24 V le long de : F3, 95-96, S1, S2, A1-A2',
    ],
    example:
      "Symptôme : le contacteur ne colle pas. Mesure au milieu de la boucle, après 95-96 : 24 V présents → le défaut est en aval (S1, S2, bobine). 0 V → le défaut est en amont (F3, thermique déclenché).",
    pieges: [
      'Changer une pièce « pour voir » avant d\'avoir mesuré.',
      'Oublier de vérifier l\'évidence : protection ouverte, thermique déclenché, arrêt d\'urgence enfoncé.',
      'Ne pas re-tester après la réparation.',
    ],
    levels: {
      cap: 'Tu observes, tu décris le symptôme et tu appliques la méthode donnée.',
      bacpro: 'Tu poses un diagnostic complet et argumenté à partir de tes mesures.',
      bts: 'Tu conduis un diagnostic de performance et tu proposes une action corrective et préventive.',
      cster: 'Tu diagnostiques une baisse de production : ombrage, chaîne ouverte, défaut d\'isolement.',
    },
  }),

  'automate-m221': F({
    id: 'automate-m221',
    theme: 'Automate M221',
    title: 'Automate M221 : entrées 24 V, sorties relais, commun',
    summary:
      "Un automate remplace le câblage de la logique de commande. Les entrées reçoivent des informations en 24 V continu depuis les boutons et les capteurs ; les sorties, ici à contacts relais, commandent les bobines des préactionneurs. Chaque groupe d'entrées ou de sorties partage un commun (COM) qu'il faut raccorder, sinon rien ne fonctionne.",
    rules: [
      'Alimentation automate : 24 V continu (bornes +24V / 0V)',
      'Entrées I0.0 … I0.n : 24 V DC, commun COM des entrées à raccorder',
      'Sorties Q0.0 … Q0.n : contacts relais libres de potentiel, commun par groupe',
      'Un contact relais ne fournit pas de tension : il faut l\'amener sur le commun',
      'Adressage : %I0.0 (entrée), %Q0.0 (sortie), %M0 (bit interne)',
      'Le voyant d\'entrée s\'allume = l\'information arrive physiquement',
    ],
    example:
      "S2 (marche) sur I0.1, S1 (arrêt, contact NF) sur I0.0, KM1 sur Q0.0. Le commun des sorties reçoit le 24 V de commande, Q0.0 renvoie vers A1 de KM1, A2 va au 0 V. Programme : Q0.0 = (I0.1 OU Q0.0) ET I0.0.",
    pieges: [
      'Oublier de raccorder le COM : les entrées ne changent jamais d\'état.',
      'Attendre 24 V sur une sortie relais : c\'est un contact sec, pas une source.',
      'Câbler l\'arrêt en contact NO : la sécurité impose un contact NF câblé.',
    ],
    levels: {
      cap: 'Tu raccordes les entrées et les sorties selon le tableau d\'affectation.',
      bacpro: 'Tu vérifies l\'affectation des E/S, tu testes chaque entrée et tu paramètres l\'application.',
      bts: 'Tu programmes, tu structures l\'application et tu justifies l\'architecture de commande.',
      cster: 'Tu exploites les entrées/sorties d\'un régulateur ou d\'un monitoring PV.',
    },
  }),

  'loi-ohm-puissance': F({
    id: 'loi-ohm-puissance',
    theme: 'Ohm et puissance',
    title: 'Loi d\'Ohm et puissance en monophasé et triphasé',
    summary:
      "La loi d'Ohm relie tension, courant et résistance ; c'est la base de toute vérification. La puissance active dépend en plus du déphasage entre courant et tension (cos φ) et, en triphasé, du facteur √3. Ces relations te permettent de vérifier une valeur mesurée sans démonter quoi que ce soit.",
    rules: [
      'U = R · I    ·    I = U / R    ·    R = U / I',
      'Monophasé : P = U · I · cos φ',
      'Triphasé : P = U · I · √3 · cos φ    (U composée, I de ligne)',
      'Puissance apparente S = U · I · √3 (VA) · réactive Q = S · sin φ (var)',
      'Rendement : η = P utile / P absorbée  →  P absorbée = P utile / η',
      'Effet Joule : P = R · I²',
    ],
    example:
      "Moteur 1,5 kW utile, η = 0,80 : P absorbée = 1500 / 0,80 = 1875 W. Avec U = 400 V et cos φ = 0,80 : I = 1875 / (400 × 1,732 × 0,80) = 3,4 A — cohérent avec la plaque.",
    pieges: [
      'Oublier le √3 en triphasé : le courant trouvé est 1,73 fois trop grand.',
      'Utiliser la tension simple (230 V) avec la formule en √3.',
      'Confondre puissance utile (arbre) et puissance absorbée (réseau).',
    ],
    levels: {
      cap: 'Tu appliques U = R · I et tu vérifies une valeur mesurée.',
      bacpro: 'Tu calcules la puissance et le courant en triphasé, avec cos φ et rendement.',
      bts: 'Tu établis un bilan de puissances actif / réactif et tu justifies une compensation.',
      cster: 'Tu convertis puissance et énergie pour dimensionner la production et le stockage.',
    },
  }),

  energie: F({
    id: 'energie',
    theme: 'Énergie',
    title: 'Énergie consommée : E = P × t',
    summary:
      "L'énergie est la puissance multipliée par la durée d'utilisation. En électricité, la puissance est en watts et le temps en heures : le résultat est en wattheures. C'est cette grandeur que compte le compteur et que l'on facture — et c'est aussi elle qui sert à dimensionner une batterie.",
    rules: [
      'E = P × t     (E en Wh, P en W, t en heures)',
      '1 kWh = 1000 Wh = 3,6 MJ',
      'Besoin journalier : E jour = Σ (P appareil × durée d\'usage)',
      'Coût = E (kWh) × prix du kWh',
      'Puissance moyenne = E / t',
    ],
    example:
      "Un réfrigérateur de 150 W fonctionnant 8 h par jour consomme E = 150 × 8 = 1200 Wh = 1,2 kWh par jour, soit environ 438 kWh par an.",
    pieges: [
      'Mélanger minutes et heures : 30 min = 0,5 h.',
      'Confondre puissance (W, instantanée) et énergie (Wh, cumulée).',
      'Oublier le facteur de simultanéité dans un bilan d\'installation.',
    ],
    levels: {
      cap: 'Tu calcules une consommation simple avec E = P × t.',
      bacpro: 'Tu établis un bilan de consommation et tu proposes une amélioration de l\'efficacité énergétique.',
      bts: 'Tu exploites le bilan énergétique pour dimensionner et chiffrer une solution.',
      cster: 'Tu construis le bilan journalier des besoins, base de tout dimensionnement autonome.',
    },
  }),

  'serie-parallele': F({
    id: 'serie-parallele',
    theme: 'Série / parallèle',
    title: 'Associations en série et en parallèle',
    summary:
      "En série, les récepteurs sont traversés par le même courant et les tensions s'additionnent. En parallèle, ils sont soumis à la même tension et les courants s'additionnent. Ce sont ces deux règles qui gouvernent le câblage des chaînes photovoltaïques comme celui des batteries.",
    rules: [
      'Série : I identique · U totale = U1 + U2 + …  · R totale = R1 + R2 + …',
      'Parallèle : U identique · I totale = I1 + I2 + …  · 1/R = 1/R1 + 1/R2 + …',
      'PV en série (une chaîne) : les tensions s\'ajoutent, le courant reste celui d\'un module',
      'PV en parallèle (chaînes) : les courants s\'ajoutent, la tension reste celle d\'une chaîne',
      'Batteries en série : tension × n · en parallèle : capacité (Ah) × n',
    ],
    example:
      "8 modules de 40 V / 10 A en série : U = 320 V, I = 10 A. Deux chaînes identiques en parallèle : U = 320 V, I = 20 A, P = 6,4 kW.",
    pieges: [
      'Additionner les courants d\'éléments en série.',
      'Mettre en parallèle des chaînes de tensions différentes : elles se déchargent l\'une dans l\'autre.',
      'Oublier que la chaîne la plus faible impose son courant en série (ombrage).',
    ],
    levels: {
      cap: 'Tu reconnais un montage série d\'un montage parallèle et tu dis ce qui est commun.',
      bacpro: 'Tu calcules tensions et courants d\'une association et tu vérifies la compatibilité.',
      bts: 'Tu optimises l\'association pour respecter la plage de fonctionnement du convertisseur.',
      cster: 'Tu définis le nombre de modules par chaîne et le nombre de chaînes.',
    },
  }),

  'pv-tension-systeme': F({
    id: 'pv-tension-systeme',
    theme: 'Tension système PV',
    title: 'Choisir la tension du système photovoltaïque',
    summary:
      "Dans une installation autonome, plus la tension du système est élevée, plus le courant est faible pour la même puissance — donc plus les câbles sont petits et les pertes réduites. On choisit 12, 24 ou 48 V selon la puissance à transiter. Le courant se déduit directement de la puissance et de la tension.",
    rules: [
      'I = P / U     (P en W, U tension du système en V)',
      'Ordres de grandeur : < 800 W → 12 V · 800 à 2000 W → 24 V · > 2000 W → 48 V',
      'À puissance égale, doubler U divise I par 2 et les pertes Joule par 4',
      'Pertes en ligne : P pertes = R · I²',
      'La tension du parc batterie impose celle du régulateur et de l\'onduleur',
    ],
    example:
      "Besoin de 2400 W. En 12 V : I = 2400 / 12 = 200 A, câbles énormes. En 48 V : I = 2400 / 48 = 50 A — c'est le bon choix de tension système.",
    pieges: [
      'Garder 12 V pour une installation de plusieurs kW : sections et pertes inacceptables.',
      'Choisir la tension du système sans vérifier la plage d\'entrée de l\'onduleur.',
      'Confondre tension du parc batterie et tension d\'entrée MPPT.',
    ],
    levels: {
      cap: 'Tu appliques I = P / U pour comparer deux tensions de système.',
      bacpro: 'Tu justifies le choix de la tension système par le courant et les pertes.',
      bts: 'Tu optimises tension système, sections et rendement global de l\'installation.',
      cster: 'Tu choisis la tension système en cohérence avec batteries, régulateur et onduleur.',
    },
  }),

  'pv-voc-temperature': F({
    id: 'pv-voc-temperature',
    theme: 'Voc et température',
    title: 'Tension à vide corrigée en température',
    summary:
      "La tension à vide d'un module photovoltaïque augmente quand la température baisse. Le dimensionnement se fait donc au cas le plus défavorable : la température minimale du site, panneaux non chargés. C'est cette tension corrigée, multipliée par le nombre de modules en série, qui ne doit jamais dépasser la tension maximale admissible de l'onduleur.",
    rules: [
      'Voc(T) = Voc(STC) × [1 + β × (T − 25)]    avec β négatif (≈ −0,30 %/°C)',
      'Cas défavorable : T minimale du site (souvent −10 °C, parfois −20 °C)',
      'Chaîne : U chaîne = n × Voc(T min)  ≤  U DC max de l\'onduleur',
      'À chaud (70 °C) : Umpp chute → vérifier U chaîne ≥ U MPPT min',
      'STC : 1000 W/m², 25 °C, AM 1,5',
    ],
    example:
      "Voc(STC) = 40 V, β = −0,30 %/°C, T min = −10 °C : Voc = 40 × [1 + (−0,003) × (−35)] = 40 × 1,105 = 44,2 V. Avec un onduleur limité à 600 V : n max = 600 / 44,2 = 13 modules par chaîne.",
    pieges: [
      'Dimensionner avec Voc à 25 °C : dépassement de la tension max au premier matin froid.',
      'Se tromper de signe : à −10 °C, l\'écart (T − 25) vaut −35, et β est négatif → la tension MONTE.',
      'Oublier de vérifier aussi la borne basse (MPPT min) par forte chaleur.',
    ],
    levels: {
      cap: 'Tu relèves Voc sur la fiche technique et tu sais qu\'elle augmente au froid.',
      bacpro: 'Tu appliques la correction en température et tu vérifies la limite de l\'onduleur.',
      bts: 'Tu justifies la plage complète (froid et chaud) et le nombre de modules par chaîne.',
      cster: 'Tu calcules Voc corrigée pour le site, c\'est la base du dimensionnement de la chaîne.',
    },
  }),

  'pv-batterie': F({
    id: 'pv-batterie',
    theme: 'Batteries',
    title: 'Capacité du parc batterie',
    summary:
      "La capacité de stockage se calcule à partir du besoin journalier, du nombre de jours d'autonomie souhaités, de la profondeur de décharge admissible et du rendement du parc. Elle s'exprime en ampères-heures, à la tension du système. Descendre trop bas en décharge réduit fortement la durée de vie des batteries.",
    rules: [
      'C (Ah) = (E jour × N jours) / (U système × DoD × η)',
      'DoD : plomb ouvert 0,5 · AGM/GEL 0,5 à 0,6 · lithium LFP 0,8 à 0,9',
      'η parc ≈ 0,85 (plomb) à 0,95 (lithium)',
      'Autonomie N : 1 à 2 jours en usage courant, 3 à 5 en site isolé',
      'C nominale donnée pour un régime de décharge (C10, C20) : vérifier lequel',
    ],
    example:
      "E jour = 2,4 kWh, 2 jours d'autonomie, système 48 V, DoD 0,5, η 0,85 : C = (2400 × 2) / (48 × 0,5 × 0,85) = 4800 / 20,4 = 235 Ah. On retient 2 × 120 Ah en parallèle, ou 240 Ah.",
    pieges: [
      'Oublier la profondeur de décharge : la capacité calculée est deux fois trop faible.',
      'Mélanger des batteries d\'âge, de technologie ou de capacité différents.',
      'Confondre Wh et Ah : diviser par la tension du système.',
    ],
    levels: {
      cap: 'Tu identifies la capacité en Ah et la tension d\'un parc batterie.',
      bacpro: 'Tu calcules la capacité nécessaire à partir du besoin et de l\'autonomie.',
      bts: 'Tu justifies technologie, DoD, rendement et durée de vie dans un bilan technico-économique.',
      cster: 'Tu dimensionnes le parc et tu vérifies le courant de charge admissible.',
    },
  }),

  'chute-tension': F({
    id: 'chute-tension',
    theme: 'Chute de tension',
    title: 'Chute de tension et section des conducteurs',
    summary:
      "Tout conducteur possède une résistance : le courant y provoque une chute de tension proportionnelle à la longueur. On impose une chute maximale (en % de la tension nominale) et on en déduit la section minimale. Attention : la longueur à prendre en compte est celle de l'aller-retour du courant.",
    rules: [
      'S = 2 · ρ · L · I / ΔU        (S en mm², L en m, I en A, ΔU en V)',
      'ρ cuivre = 0,0225 Ω·mm²/m  ·  ρ aluminium = 0,036 Ω·mm²/m',
      'Le facteur 2 = aller + retour (monophasé et continu) ; en triphasé : √3 · ρ · L · I / ΔU',
      'ΔU admissible : 3 % éclairage · 5 % autres usages · 1 à 3 % côté DC PV',
      'ΔU (V) = pourcentage × U nominale / 100',
      'Section retenue = valeur normalisée immédiatement SUPÉRIEURE',
    ],
    example:
      "Circuit DC de 20 m, 15 A, 48 V, chute admise 3 % → ΔU = 1,44 V. S = 2 × 0,0225 × 20 × 15 / 1,44 = 9,4 mm² → on retient 10 mm².",
    pieges: [
      'Oublier le facteur 2 : la section trouvée est deux fois trop faible.',
      'Arrondir à la section inférieure.',
      'Calculer la chute en % sans la convertir en volts avant d\'appliquer la formule.',
    ],
    levels: {
      cap: 'Tu sais qu\'un câble long fait chuter la tension et tu lis la section sur le schéma.',
      bacpro: 'Tu calcules la section par la formule et tu retiens la valeur normalisée supérieure.',
      bts: 'Tu combines chute de tension, courant admissible et contrainte thermique de court-circuit.',
      cster: 'Tu limites la chute côté DC (1 à 3 %) pour ne pas perdre de production.',
    },
  }),

  'calibre-protection': F({
    id: 'calibre-protection',
    theme: 'Calibre des protections',
    title: 'Choisir le calibre d\'une protection : Ib ≤ In ≤ Iz',
    summary:
      "Une protection doit laisser passer le courant utile du circuit et couper avant que le câble ne s'échauffe dangereusement. On encadre donc son calibre entre le courant d'emploi et le courant admissible du conducteur. Le pouvoir de coupure, lui, doit être supérieur au courant de court-circuit présumé.",
    rules: [
      'Ib ≤ In ≤ Iz    (emploi ≤ calibre protection ≤ admissible du câble)',
      'I2 ≤ 1,45 × Iz  (courant de fonctionnement conventionnel)',
      'Pouvoir de coupure ≥ Icc présumé au point d\'installation',
      'Courbe C pour usage général, courbe D pour les fortes pointes (transfo, moteur)',
      'Iz dépend de la section, du mode de pose et de la température',
    ],
    example:
      "Circuit de prises 16 A en 2,5 mm² sous conduit : Ib = 16 A, Iz ≈ 21 A. On choisit In = 20 A : 16 ≤ 20 ≤ 21, la condition est respectée. Un disjoncteur 25 A serait interdit.",
    pieges: [
      'Surcalibrer « pour éviter les déclenchements » : c\'est le câble qui chauffe.',
      'Oublier les facteurs de correction (température, groupement de circuits) sur Iz.',
      'Négliger le pouvoir de coupure en tête d\'installation.',
    ],
    levels: {
      cap: 'Tu associes une section de câble au calibre de protection prévu par le schéma.',
      bacpro: 'Tu vérifies Ib ≤ In ≤ Iz et tu justifies le calibre choisi.',
      bts: 'Tu conduis le dimensionnement complet : Iz corrigé, Icc, sélectivité, filiation.',
      cster: 'Tu choisis les protections DC (calibre, tension DC assignée) et AC de l\'installation.',
    },
  }),

  'dc-ac': F({
    id: 'dc-ac',
    theme: 'Continu et alternatif',
    title: 'Le continu n\'est pas de l\'alternatif',
    summary:
      "En alternatif, le courant s'annule cent fois par seconde : l'arc de coupure s'éteint tout seul. En continu, il ne s'annule jamais, l'arc persiste et il faut un appareillage spécifiquement prévu pour le DC. La polarité doit être respectée, et un appareil de mesure doit être placé sur la bonne position du sélecteur.",
    rules: [
      'Un disjoncteur AC ne coupe PAS un circuit DC : appareillage marqué DC obligatoire',
      'Tension DC assignée de l\'appareil ≥ tension max de la chaîne (Voc corrigée)',
      'Polarité : + et − repérés, non interchangeables',
      'Multimètre : V⎓ / A⎓ pour le continu, V~ / A~ pour l\'alternatif',
      'Pince ampèremétrique AC seule : incapable de lire un courant continu (effet Hall requis)',
      'Côté PV, il n\'existe pas de coupure de production : le module produit dès qu\'il est éclairé',
    ],
    example:
      "Chaîne PV à 320 V continu : il faut un interrupteur-sectionneur DC 1000 V et des fusibles gPV. Un disjoncteur modulaire AC 400 V posé là ne couperait pas l'arc et prendrait feu.",
    pieges: [
      'Utiliser des protections AC côté panneaux.',
      'Mesurer une tension DC en position V~ : lecture aberrante.',
      'Croire qu\'ouvrir l\'onduleur met les panneaux hors tension.',
    ],
    levels: {
      cap: 'Tu distingues un circuit continu d\'un circuit alternatif et tu choisis la bonne position de l\'appareil.',
      bacpro: 'Tu justifies l\'appareillage DC et les précautions de mesure associées.',
      bts: 'Tu dimensionnes l\'appareillage DC : tension assignée, pouvoir de coupure, coordination.',
      cster: 'Tu appliques la règle centrale du PV : côté DC, la source ne se consigne pas, elle s\'isole.',
    },
  }),

  'tableau-logement': F({
    id: 'tableau-logement',
    theme: 'Tableau de logement',
    title: 'Tableau de répartition NF C 15-100 : DDR, calibres, sections',
    summary:
      "Dans un logement, chaque circuit a son calibre et sa section imposés par la norme, et tous les circuits sont regroupés derrière des interrupteurs différentiels 30 mA. Le type du différentiel dépend des récepteurs protégés : type A pour les circuits spécialisés (plaque, lave-linge), type AC pour les autres, type F pour l'électronique sensible.",
    rules: [
      'Éclairage : 1,5 mm² · disjoncteur 16 A · 8 points maximum',
      'Prises 16 A : 1,5 mm² / 16 A (8 socles) ou 2,5 mm² / 20 A (12 socles)',
      'Plaque de cuisson : 6 mm² · 32 A · circuit spécialisé',
      'Lave-linge, lave-vaisselle, four : 2,5 mm² · 20 A · un circuit chacun',
      'DDR 30 mA : type A obligatoire pour plaque et lave-linge, type AC pour le reste',
      'Au moins 2 interrupteurs différentiels 30 mA · 20 % de réserve dans le tableau',
      'Répartition : 8 circuits maximum par interrupteur différentiel',
    ],
    example:
      "Un T3 : ID 40 A type A protégeant plaque (32 A / 6 mm²) et lave-linge (20 A / 2,5 mm²) ; ID 40 A type AC protégeant éclairage (16 A / 1,5 mm²), prises séjour (20 A / 2,5 mm²) et prises chambres.",
    pieges: [
      'Mettre la plaque de cuisson derrière un différentiel type AC.',
      'Câbler des prises 20 A en 1,5 mm².',
      'Remplir le tableau sans laisser la réserve de 20 % exigée.',
    ],
    levels: {
      cap: 'Tu associes chaque circuit à son calibre et à sa section d\'après le tableau de la norme.',
      bacpro: 'Tu répartis les circuits entre les différentiels et tu justifies les types A / AC.',
      bts: 'Tu établis le schéma unifilaire complet, la sélectivité et le bilan de puissance.',
      cster: 'Tu intègres l\'injection PV au tableau : protection dédiée, AGCP, coupure d\'urgence.',
    },
  }),
};

export const COURS_IDS = Object.keys(COURS) as CoursId[];

export function coursById(id: CoursId): CoursFiche {
  return COURS[id];
}

/** Fiches correspondant à une liste d'identifiants, sans doublon ni identifiant inconnu. */
export function coursList(ids: readonly CoursId[]): CoursFiche[] {
  const seen = new Set<CoursId>();
  const out: CoursFiche[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const f = COURS[id];
    if (f) out.push(f);
  }
  return out;
}

/** Phrase de cadrage de la fiche pour le diplôme préparé. */
export function coursLevel(fiche: CoursFiche, diploma: DiplomaId): string {
  return fiche.levels[diploma];
}

/** Fiche mise à plat pour le contexte du professeur virtuel. */
export function coursPrompt(fiche: CoursFiche, diploma: DiplomaId): string {
  return [
    `Fiche de rappel « ${fiche.title} »`,
    fiche.summary,
    `Règles : ${fiche.rules.join(' ; ')}`,
    `Exemple : ${fiche.example}`,
    `Pièges fréquents : ${fiche.pieges.join(' ; ')}`,
    `Attendu au niveau du diplôme : ${fiche.levels[diploma]}`,
  ].join('\n');
}
