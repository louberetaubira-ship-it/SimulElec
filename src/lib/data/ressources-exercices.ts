/**
 * TD et Évaluations interactifs adossés aux TP.
 *
 * Même moteur pour les deux, deux intentions :
 *  - TD : entraînement guidé, correction immédiate après chaque question, on peut réessayer ;
 *  - Éval : certification, correction et barème par compétence à la fin (échelle 7 niveaux).
 *
 * Vocabulaire « maîtrise » (pas « acquisition », réservé au bilan de compétences).
 */

export type QType = 'qcm' | 'vraifaux' | 'texte';

export interface Question {
  id: string;
  competence: string; // ex. 'C1'
  enonce: string;
  type: QType;
  /** QCM : libellés des choix. */
  options?: string[];
  /** QCM : index de la bonne réponse ; VF : booléen ; texte : réponse normalisée attendue. */
  bonne: number | boolean | string;
  /** Texte : réponses acceptées (en plus de `bonne`), déjà en minuscules sans accent. */
  accepte?: string[];
  explication: string;
}

export interface ExerciceContenu {
  tpId: string;
  type: 'td' | 'eval';
  titre: string;
  sousTitre: string;
  intro: string;
  competences: string[];
  duree: string;
  pedagogie: string;
  questions: Question[];
}

// ───────────────────────────── TD ─────────────────────────────

const TD_PERCEUSE: ExerciceContenu = {
  tpId: 'perceuse-radiale', type: 'td',
  titre: 'Lecture de schéma & analyse fonctionnelle',
  sousTitre: 'TD · Perceuse radiale',
  intro: 'On lit le schéma du démarrage direct et on comprend le rôle de chaque organe, avant de câbler dans le TP. Réponds, vérifie, recommence si besoin.',
  competences: ['C1 Analyser', 'C3 Concevoir'], duree: '30 min',
  pedagogie: 'Application guidée, exercices gradués, correction immédiate. Aides progressives pour la différenciation.',
  questions: [
    { id: 'p1', competence: 'C1', type: 'qcm', enonce: 'Quel organe assure à la fois la coupure, la consignation et la protection contre les courts-circuits ?',
      options: ['Le contacteur KM1', 'Le sectionneur porte-fusibles', 'Le relais thermique F1', 'Le transformateur T1'], bonne: 1,
      explication: 'Le sectionneur porte-fusibles se cadenasse ouvert (consignation) et ses fusibles protègent du court-circuit.' },
    { id: 'p2', competence: 'C1', type: 'vraifaux', enonce: 'Les contacts d’arrêt (coup de poing, arrêt, position) sont câblés EN SÉRIE et normalement fermés.',
      bonne: true, explication: 'En série et NF : si l’un s’ouvre ou si un fil casse, le circuit s’ouvre — c’est la sécurité positive.' },
    { id: 'p3', competence: 'C1', type: 'qcm', enonce: 'Que se passe-t-il si un fil de la chaîne d’arrêt se rompt ?',
      options: ['Le moteur démarre tout seul', 'Rien, la marche continue', 'Le moteur s’arrête', 'Le fusible fond'], bonne: 2,
      explication: 'Sécurité positive : toute rupture ouvre le circuit de commande et arrête le moteur.' },
    { id: 'p4', competence: 'C3', type: 'qcm', enonce: 'À quoi sert le contact auxiliaire KM1 13-14 ?',
      options: ['À protéger le moteur', 'À l’auto-maintien', 'À signaler le défaut', 'À sectionner'], bonne: 1,
      explication: 'Il double le bouton marche : la bobine reste alimentée quand on relâche le bouton (auto-maintien).' },
    { id: 'p5', competence: 'C1', type: 'qcm', enonce: 'Le voyant incolore H1 signale…',
      options: ['La marche du moteur', 'Un défaut thermique', 'La mise sous tension', 'La fin de cycle'], bonne: 2,
      explication: 'Incolore = sous tension. Il s’allume dès la fermeture du sectionneur, avant toute marche.' },
    { id: 'p6', competence: 'C1', type: 'texte', enonce: 'Sous quelle tension (en volts) est réalisée la commande ?',
      bonne: '24', accepte: ['24 v', '24v', '24 volts'], explication: 'La commande est en 24 V (TBTS), fournie par le transformateur T1 : l’opérateur ne touche jamais la puissance 400 V.' },
  ],
};

const TD_VARIATEUR: ExerciceContenu = {
  tpId: 'variateur', type: 'td',
  titre: 'Exploiter la plaque & paramétrer',
  sousTitre: 'TD · Variateur ATV320',
  intro: 'On exploite la plaque signalétique et on repère les paramètres essentiels du variateur, avant la mise en service.',
  competences: ['C1 Analyser', 'C6 Mettre en service'], duree: '30 min',
  pedagogie: 'Exploitation de documentation réelle (ATV320), démarche de résolution pas à pas, auto-correction.',
  questions: [
    { id: 'v1', competence: 'C1', type: 'qcm', enonce: 'Quel étage du variateur reste chargé et dangereux après coupure du réseau ?',
      options: ['Le redresseur', 'Le bus continu', 'L’onduleur', 'La self réseau'], bonne: 1,
      explication: 'Les condensateurs du bus continu gardent leur charge : 15 min d’attente et contrôle < 42 V avant d’intervenir.' },
    { id: 'v2', competence: 'C1', type: 'vraifaux', enonce: 'On place un relais thermique externe entre le variateur et le moteur pour protéger ce dernier.',
      bonne: false, explication: 'Faux : le courant de sortie n’est pas sinusoïdal. C’est la protection électronique I²t interne (ItH) qui protège le moteur.' },
    { id: 'v3', competence: 'C6', type: 'qcm', enonce: 'Quel paramètre règle la protection thermique du moteur ?',
      options: ['ACC', 'bFr', 'ItH', 'dEC'], bonne: 2,
      explication: 'ItH est l’image thermique I²t, réglée au courant plaque du moteur.' },
    { id: 'v4', competence: 'C1', type: 'qcm', enonce: 'Pourquoi le moteur ne subit-il pas de pointe de démarrage ?',
      options: ['Parce qu’il est bridé mécaniquement', 'Parce qu’il part à fréquence nulle et monte en rampe', 'Parce qu’un thermique le protège', 'Parce que le couplage est étoile'], bonne: 1,
      explication: 'Le variateur démarre à fréquence nulle et monte selon la rampe ACC : jamais 6 × In.' },
    { id: 'v5', competence: 'C6', type: 'qcm', enonce: 'Moteur 230 V Δ / 400 V Y sur un réseau 400 V entre phases : quel couplage ?',
      options: ['Triangle', 'Étoile', 'Indifférent', 'Aucun couplage'], bonne: 1,
      explication: 'Sous 400 V entre phases, on couple en ÉTOILE pour que chaque enroulement reçoive sa tension nominale.' },
    { id: 'v6', competence: 'C6', type: 'texte', enonce: 'Combien de minutes attendre après coupure avant d’intervenir sur le bus continu ?',
      bonne: '15', accepte: ['15 min', '15min', '15 minutes'], explication: '15 minutes, puis contrôle de moins de 42 V continus entre PA/+ et PC/−.' },
  ],
};

const TD_AUTOMATE: ExerciceContenu = {
  tpId: 'automate-m221', type: 'td',
  titre: 'Table d’affectation & programme',
  sousTitre: 'TD · Automate M221',
  intro: 'On établit la correspondance entre les organes réels et les adresses de l’automate, et on comprend le cycle.',
  competences: ['C3 Concevoir', 'C5 Réaliser'], duree: '30 min',
  pedagogie: 'Passage progressif câblé → programmé ; exercices de traduction ; auto-correction.',
  questions: [
    { id: 'a1', competence: 'C1', type: 'qcm', enonce: 'Dans quel ordre se déroule le cycle automate ?',
      options: ['Écriture → lecture → traitement', 'Lecture des entrées → traitement du programme → écriture des sorties', 'Traitement → écriture → lecture', 'Lecture → écriture → traitement'], bonne: 1,
      explication: 'Lire les entrées, exécuter le programme, écrire les sorties — en boucle, en quelques millisecondes.' },
    { id: 'a2', competence: 'C5', type: 'qcm', enonce: 'Quelle adresse pilote la bobine du contacteur KM1 ?',
      options: ['%I0.0', '%Q0.0', '%I0.2', '%Q0.2'], bonne: 1,
      explication: '%Q0.0 est une sortie relais : elle commande la bobine KM1.' },
    { id: 'a3', competence: 'C1', type: 'vraifaux', enonce: 'L’arrêt S1 reste un contact NF, câblé physiquement sur une entrée de l’automate.',
      bonne: true, explication: 'On conserve la sécurité positive : l’arrêt est un NF câblé sur l’entrée %I0.1.' },
    { id: 'a4', competence: 'C3', type: 'qcm', enonce: 'L’auto-maintien, câblé par un contact KM1, devient dans l’automate…',
      options: ['Un fusible', 'Une ligne de programme', 'Un relais externe', 'Un contact NF'], bonne: 1,
      explication: 'La fonction passe dans le programme : la sortie se maintient tant que l’entrée arrêt est vraie.' },
    { id: 'a5', competence: 'C5', type: 'qcm', enonce: 'Le commun COM0 regroupe les sorties…',
      options: ['Q0.0 à Q0.3', 'Q0.4 à Q0.6', 'I0.0 à I0.3', 'toutes les sorties'], bonne: 0,
      explication: 'COM0 porte Q0.0 à Q0.3 ; COM1 porte Q0.4 à Q0.6.' },
    { id: 'a6', competence: 'C1', type: 'texte', enonce: 'Comment appelle-t-on un signal à deux états 0/1 (sigle) ?',
      bonne: 'tor', accepte: ['t.o.r', 'tout ou rien'], explication: 'TOR = tout ou rien. Les entrées et sorties de ce M221 sont des TOR 24 V.' },
  ],
};

// ─────────────────────────── ÉVALUATION ───────────────────────────

const EVAL_PERCEUSE: ExerciceContenu = {
  tpId: 'perceuse-radiale', type: 'eval',
  titre: 'Situation d’évaluation — départ perceuse',
  sousTitre: 'Évaluation · Perceuse radiale',
  intro: 'Évaluation par compétences. Réponds à tout, puis valide : tu obtiens ton niveau par compétence, tes points forts et tes points de vigilance.',
  competences: ['C5 Réaliser', 'C6 Mettre en service'], duree: '30 min',
  pedagogie: 'Évaluation par compétences, critères explicites, remédiation ciblée (forces / vigilances).',
  questions: [
    { id: 'ep1', competence: 'C6', type: 'qcm', enonce: 'Première étape avant toute intervention hors tension ?',
      options: ['Mesurer l’isolement', 'Consigner (séparer et cadenasser)', 'Serrer les bornes', 'Vérifier le repérage'], bonne: 1,
      explication: 'La consignation (séparer + condamner) précède tout ; on vérifie ensuite l’absence de tension (VAT).' },
    { id: 'ep2', competence: 'C6', type: 'qcm', enonce: 'La VAT sert à…',
      options: ['Vérifier l’absence de tension', 'Vérifier l’isolement', 'Vérifier la continuité PE', 'Vérifier le serrage'], bonne: 0,
      explication: 'VAT = vérification d’absence de tension, juste après la consignation.' },
    { id: 'ep3', competence: 'C5', type: 'qcm', enonce: 'Le bouton marche S2 est un contact…',
      options: ['NF (normalement fermé)', 'NO (normalement ouvert)', 'inverseur', 'temporisé'], bonne: 1,
      explication: 'La marche est un NO, doublé par l’auto-maintien ; les arrêts sont des NF.' },
    { id: 'ep4', competence: 'C5', type: 'vraifaux', enonce: 'Le voyant incolore H1 prouve que le moteur tourne.',
      bonne: false, explication: 'Faux : il signale seulement la mise sous tension, pas la marche.' },
    { id: 'ep5', competence: 'C6', type: 'texte', enonce: 'Sous quelle tension (V) mesure-t-on l’isolement d’une installation BT de ce type ?',
      bonne: '500', accepte: ['500 v', '500v'], explication: 'La mesure d’isolement se fait sous 500 V continu en BT.' },
    { id: 'ep6', competence: 'C5', type: 'qcm', enonce: 'Un fusible qui a fondu…',
      options: ['se réarme', 'se remplace', 'se règle', 'se cadenasse'], bonne: 1,
      explication: 'Un fusible ne se réarme pas : il se remplace, contrairement à un disjoncteur.' },
  ],
};

const EVAL_VARIATEUR: ExerciceContenu = {
  tpId: 'variateur', type: 'eval',
  titre: 'Situation d’évaluation — variateur',
  sousTitre: 'Évaluation · ATV320',
  intro: 'Évaluation par compétences sur le câblage et la mise en service du variateur.',
  competences: ['C5 Réaliser', 'C6 Mettre en service'], duree: '30 min',
  pedagogie: 'Évaluation authentique (situation professionnelle) ; niveau par compétence visible par l’élève.',
  questions: [
    { id: 'ev1', competence: 'C5', type: 'vraifaux', enonce: 'On peut placer un sectionneur pour couper en charge la sortie U/V/W du variateur.',
      bonne: false, explication: 'Faux : ouvrir en charge la sortie d’un onduleur le détruit. Aucun organe de coupure côté moteur.' },
    { id: 'ev2', competence: 'C6', type: 'qcm', enonce: 'Un variateur bien câblé mais dont la plaque n’a pas été paramétrée…',
      options: ['tourne normalement', 'ne protège pas / ne pilote pas correctement le moteur', 'disjoncte toujours', 'inverse le sens'], bonne: 1,
      explication: 'La mise en service passe par le paramétrage : sans les valeurs plaque, la protection et le pilotage sont faux.' },
    { id: 'ev3', competence: 'C6', type: 'qcm', enonce: 'Le paramètre ACC règle…',
      options: ['le courant thermique', 'la rampe d’accélération', 'la fréquence maxi', 'le sens de marche'], bonne: 1,
      explication: 'ACC = durée de la rampe de montée en fréquence.' },
    { id: 'ev4', competence: 'C5', type: 'qcm', enonce: 'Avant d’intervenir sur le bus continu, on contrôle une tension résiduelle inférieure à…',
      options: ['230 V', '42 V', '500 V', '24 V'], bonne: 1,
      explication: 'Moins de 42 V continus entre PA/+ et PC/−, après 15 minutes d’attente.' },
    { id: 'ev5', competence: 'C6', type: 'texte', enonce: 'Sigle de la technique de hachage qui recrée une tension à fréquence variable ?',
      bonne: 'mli', accepte: ['m.l.i', 'modulation de largeur d impulsion'], explication: 'MLI : modulation de largeur d’impulsion, réalisée par les IGBT de l’onduleur.' },
    { id: 'ev6', competence: 'C5', type: 'qcm', enonce: 'Moteur 230/400 V sur réseau 400 V entre phases : couplage ?',
      options: ['Triangle', 'Étoile', 'Zig-zag', 'Aucun'], bonne: 1,
      explication: 'Couplage étoile sous 400 V entre phases.' },
  ],
};

const EVAL_AUTOMATE: ExerciceContenu = {
  tpId: 'automate-m221', type: 'eval',
  titre: 'Situation d’évaluation — automate',
  sousTitre: 'Évaluation · Modicon M221',
  intro: 'Évaluation par compétences incluant la maintenance (C7) : câblage E/S, cycle, diagnostic.',
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'], duree: '30 min',
  pedagogie: 'Inclut la maintenance (C7) ; évaluation en fin de cycle spiralaire.',
  questions: [
    { id: 'ea1', competence: 'C5', type: 'qcm', enonce: 'Le capteur de défaut thermique F1 se câble sur…',
      options: ['une sortie %Q', 'une entrée %I', 'le commun COM1', 'l’alimentation'], bonne: 1,
      explication: 'Un capteur est une ENTRÉE : F1 arrive sur %I0.2.' },
    { id: 'ea2', competence: 'C6', type: 'qcm', enonce: 'Après câblage, avant de lancer le moteur, on doit…',
      options: ['souder les bornes', 'vérifier le programme et faire les essais', 'changer le variateur', 'retirer le 0 V'], bonne: 1,
      explication: 'La mise en service comprend la vérification du programme et les essais de fonctionnement.' },
    { id: 'ea3', competence: 'C7', type: 'qcm', enonce: 'Le voyant marche (Q0.1) ne s’allume jamais alors que le moteur tourne. Piste la plus probable ?',
      options: ['Le moteur est en panne', 'La sortie Q0.1 ou son câblage / son commun', 'Le réseau est coupé', 'Le disjoncteur est ouvert'], bonne: 1,
      explication: 'Le moteur tourne (Q0.0 OK) mais le voyant non : le défaut est localisé sur la sortie Q0.1, son câblage ou son commun.' },
    { id: 'ea4', competence: 'C7', type: 'vraifaux', enonce: 'Ajouter une gestion horaire ne demande pas de recâbler : il suffit de modifier le programme.',
      bonne: true, explication: 'C’est l’intérêt de l’automate : la fonction évolue dans le programme, pas dans le câblage.' },
    { id: 'ea5', competence: 'C5', type: 'texte', enonce: 'Adresse de l’entrée « arrêt S1 » ? (format %Ix.x)',
      bonne: '%i0.1', accepte: ['i0.1', '%i0,1', 'i0,1'], explication: '%I0.1 : l’arrêt S1, contact NF, sur l’entrée I0.1.' },
    { id: 'ea6', competence: 'C6', type: 'qcm', enonce: 'D’où vient l’alimentation 24 V de l’automate sur ce TP ?',
      options: ['Directement du réseau 400 V', 'Du transformateur T1 via Q3', 'D’une pile interne', 'De la sortie Q0.0'], bonne: 1,
      explication: 'Comme la commande des TP précédents : T1 400/24 V, puis Q3, vers +24 / 0V du M221.' },
  ],
};

// ──────────────────────────── INDEX ──────────────────────────────

const TOUS: ExerciceContenu[] = [
  TD_PERCEUSE, TD_VARIATEUR, TD_AUTOMATE,
  EVAL_PERCEUSE, EVAL_VARIATEUR, EVAL_AUTOMATE,
];

export function getExercice(type: 'td' | 'eval', tpId: string): ExerciceContenu | null {
  return TOUS.find((e) => e.type === type && e.tpId === tpId) ?? null;
}

/** Normalise une réponse texte : minuscules, sans accent, espaces réduits. */
export function normaliseTexte(v: string): string {
  return v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}
