/**
 * Ressources pédagogiques adossées aux TP existants.
 *
 * Cinq catalogues forment une chaîne d'apprentissage : Cours (comprendre) →
 * TD (s'entraîner) → TP (réaliser) → Fiche révision (retenir) → Évaluation
 * (certifier). Ce module porte le CONTENU lisible (Cours, Fiches) ; les TD et
 * Évaluations interactifs vivent dans `ressources-interactif.ts`.
 *
 * Progression spiralaire : le même départ moteur revu trois fois, de plus en
 * plus abstrait — câblé (perceuse) → variateur → automate. Chaque montée
 * réutilise les acquis de la précédente.
 */

export type ResType = 'cours' | 'td' | 'fiche' | 'eval';

/** Un bloc de contenu d'une page lisible (Cours ou Fiche). */
export type Bloc =
  | { kind: 'intro'; texte: string }
  | { kind: 'section'; titre: string; points: string[] }
  | { kind: 'tableau'; titre?: string; entetes: string[]; lignes: string[][] }
  | { kind: 'securite'; titre: string; points: string[] }
  | { kind: 'vocab'; items: { terme: string; def: string }[] }
  | { kind: 'retenir'; points: string[] };

export interface FicheContenu {
  tpId: string;
  type: ResType;
  titre: string;
  sousTitre: string;
  competences: string[];
  duree?: string;
  /** L'intention pédagogique, affichée en encart au professeur. */
  pedagogie: string;
  blocs: Bloc[];
}

/** Métadonnées d'un catalogue de ressources. */
export const CATALOGUES: { type: ResType; label: string; verbe: string; couleur: string; desc: string }[] = [
  { type: 'cours', label: 'Cours', verbe: 'Je comprends', couleur: '#0E9E6E', desc: 'Les savoirs qui fondent le TP, en amont.' },
  { type: 'td', label: 'TD', verbe: 'Je m’entraîne', couleur: '#7C3AED', desc: 'L’entraînement guidé, auto-corrigé, avant de câbler.' },
  { type: 'fiche', label: 'Fiches révision', verbe: 'Je retiens', couleur: '#E38A00', desc: 'La synthèse d’une page, révisable avant l’évaluation.' },
  { type: 'eval', label: 'Évaluation', verbe: 'Je certifie', couleur: '#DC2626', desc: 'La certification par compétences (C1–C13, 7 niveaux).' },
];

/** Les 3 TP support des ressources, dans l'ordre de la progression spiralaire. */
export const TP_RESSOURCES: { tpId: string; nom: string; angle: string }[] = [
  { tpId: 'perceuse-radiale', nom: 'Perceuse radiale', angle: 'Logique câblée' },
  { tpId: 'variateur', nom: 'Variateur ATV320', angle: 'Électronique de puissance' },
  { tpId: 'automate-m221', nom: 'Automate M221', angle: 'Logique programmée' },
];

// ───────────────────────────── COURS ─────────────────────────────

const COURS_PERCEUSE: FicheContenu = {
  tpId: 'perceuse-radiale',
  type: 'cours',
  titre: 'Le démarrage direct et la sécurité des personnes',
  sousTitre: 'Perceuse radiale · commande 24 V',
  competences: ['C1 Analyser', 'C5 Réaliser', 'C6 Mettre en service'],
  duree: '2 h',
  pedagogie:
    'Cours dialogué inductif : on part de l’équipement réel de l’atelier (la perceuse radiale), pas de la théorie abstraite. Le schéma se construit sous les yeux de l’élève, d’abord la puissance, puis la commande, puis la sécurité.',
  blocs: [
    { kind: 'intro', texte:
      'Un moteur triphasé démarré en direct reçoit le réseau d’un seul coup : il appelle 6 à 8 fois son courant nominal pendant un bref instant. C’est simple, robuste, et c’est le montage de base de toute l’électrotechnique. Mais autour de ce moteur, tout un circuit veille à la sécurité de l’opérateur : c’est lui qui fait l’essentiel du travail de l’électricien.' },
    { kind: 'section', titre: '1. Séparer la puissance et la commande', points: [
      'Le circuit de PUISSANCE porte le courant du moteur (400 V triphasé) : sectionneur, contacteur KM1, relais thermique, moteur.',
      'Le circuit de COMMANDE porte les ordres (marche, arrêt) sous une tension réduite de sécurité, 24 V, fournie par le transformateur T1.',
      'Séparer les deux protège l’opérateur : les boutons qu’il manipule ne sont jamais sous 400 V.' ] },
    { kind: 'section', titre: '2. Le sectionnement et la consignation', points: [
      'Sur cette perceuse, c’est un SECTIONNEUR PORTE-FUSIBLES qui assure la coupure et la protection contre les courts-circuits.',
      'Un sectionneur se cadenasse ouvert : c’est l’organe de CONSIGNATION, celui qui garantit qu’on ne remettra pas sous tension pendant l’intervention.',
      'Un fusible ne se réarme pas : il fond et se remplace. C’est une différence essentielle avec le disjoncteur.' ] },
    { kind: 'section', titre: '3. La chaîne d’arrêt et l’auto-maintien', points: [
      'Les organes d’arrêt sont des contacts NF (normalement fermés) placés EN SÉRIE : coup de poing à verrouillage, bouton d’arrêt, interrupteur de position de l’écran de protection.',
      'Si l’un d’eux s’ouvre — ou si un fil casse — le circuit s’ouvre et le moteur s’arrête : c’est la sécurité positive.',
      'Le bouton de marche est un contact NO ; un contact auxiliaire de KM1 (13-14) le double : c’est l’AUTO-MAINTIEN, qui garde le moteur en marche quand on relâche le bouton.' ] },
    { kind: 'section', titre: '4. La signalisation', points: [
      'Le voyant H1 de cette perceuse est INCOLORE : il signale la MISE SOUS TENSION, pas la marche. Il s’allume dès que le sectionneur est fermé.',
      'Ne pas confondre « sous tension » et « en marche » : c’est une cause fréquente d’accident.' ] },
    { kind: 'vocab', items: [
      { terme: 'Sectionnement', def: 'Séparer un circuit de sa source, de façon visible et condamnable.' },
      { terme: 'Consignation', def: 'Procédure qui rend un équipement sûr pour intervenir (séparer, condamner, vérifier l’absence de tension).' },
      { terme: 'Auto-maintien', def: 'Contact auxiliaire qui maintient une bobine alimentée après le relâchement du bouton marche.' },
      { terme: 'Sécurité positive', def: 'Principe où toute défaillance (fil coupé, contact usé) conduit à l’arrêt, jamais au démarrage.' } ] },
    { kind: 'retenir', points: [
      'Puissance en 400 V, commande en 24 V : l’opérateur ne touche jamais la puissance.',
      'Les arrêts sont des NF en série (sécurité positive) ; la marche est un NO doublé par l’auto-maintien.',
      'Le sectionneur porte-fusibles est l’organe de consignation.',
      'Voyant incolore = sous tension, pas en marche.' ] },
  ],
};

const COURS_VARIATEUR: FicheContenu = {
  tpId: 'variateur',
  type: 'cours',
  titre: 'La variation de vitesse par variateur',
  sousTitre: 'Altivar ATV320 · 0,75 kW',
  competences: ['C1 Analyser', 'C5 Réaliser', 'C6 Mettre en service'],
  duree: '2 h',
  pedagogie:
    'On s’appuie sur les acquis « démarrage direct » du TP 1 pour montrer, par contraste, ce que le variateur change. Animation du bus continu et de la MLI ; lien explicite avec l’énergie.',
  blocs: [
    { kind: 'intro', texte:
      'Faire varier la vitesse d’un moteur asynchrone, c’est agir sur la fréquence de sa tension d’alimentation. Le variateur fabrique une tension à fréquence réglable à partir du réseau 50 Hz. Le moteur ne subit plus de pointe de démarrage : il part à fréquence nulle et monte en rampe.' },
    { kind: 'section', titre: '1. Comment fonctionne un variateur', points: [
      'REDRESSEUR : le réseau alternatif 400 V est redressé en tension continue.',
      'BUS CONTINU : cette tension est lissée par des condensateurs — le « bus continu », qui reste chargé après coupure.',
      'ONDULEUR : des transistors (IGBT) hachent cette tension continue (MLI) pour recréer un système triphasé à fréquence variable.',
      'Loi U/f : pour garder le couple, la tension varie proportionnellement à la fréquence.' ] },
    { kind: 'section', titre: '2. Ce que le variateur change', points: [
      'Aucune pointe de démarrage : le moteur ne voit jamais 6 × In. Les rampes ACC (accélération) et dEC (décélération) sont réglables.',
      'Aucun relais thermique externe : le courant de sortie n’est pas sinusoïdal, un bilame ne sait pas le mesurer. C’est la protection électronique I²t interne (paramètre ItH) qui protège le moteur.',
      'Aucun organe de coupure entre le variateur et le moteur : ouvrir en charge la sortie d’un onduleur le détruit.' ] },
    { kind: 'section', titre: '3. La plaque signalétique et le couplage', points: [
      'La plaque donne les tensions moteur (ex. 230 V Δ / 400 V Y) : sur un réseau 400 V entre phases, le couplage est ÉTOILE.',
      'On entre les valeurs de la plaque (tension, courant, fréquence, puissance, vitesse) dans le variateur : c’est le paramétrage moteur.',
      'Un variateur ne démarre pas parce que le câblage est juste : il démarre parce que la plaque a été entrée correctement.' ] },
    { kind: 'securite', titre: 'Sécurité spécifique au variateur', points: [
      'Le bus continu reste chargé après coupure : attendre 15 minutes.',
      'Vérifier moins de 42 V continus entre PA/+ et PC/− avant toute intervention.',
      'Ne jamais ouvrir la sortie (U, V, W) moteur en charge.' ] },
    { kind: 'vocab', items: [
      { terme: 'Bus continu', def: 'Étage de tension continue lissée entre le redresseur et l’onduleur, chargé même hors tension réseau.' },
      { terme: 'MLI', def: 'Modulation de largeur d’impulsion : technique de hachage qui reconstitue une tension alternative réglable.' },
      { terme: 'I²t', def: 'Protection thermique électronique : image du courant au carré dans le temps, remplace le relais thermique.' },
      { terme: 'Rampe', def: 'Durée de montée (ACC) ou de descente (dEC) en fréquence, réglable dans le variateur.' } ] },
    { kind: 'retenir', points: [
      'Redresseur → bus continu → onduleur MLI : c’est ce qui fabrique la fréquence variable.',
      'Pas de pointe, pas de thermique externe, pas de coupure en sortie.',
      'La mise en service passe par la plaque signalétique, pas seulement par le câblage.',
      'Bus continu chargé : 15 min d’attente et contrôle < 42 V avant d’intervenir.' ] },
  ],
};

const COURS_AUTOMATE: FicheContenu = {
  tpId: 'automate-m221',
  type: 'cours',
  titre: 'De la logique câblée à la logique programmée',
  sousTitre: 'Automate Modicon M221',
  competences: ['C1 Analyser', 'C5 Réaliser', 'C7 Maintenir'],
  duree: '2 h',
  pedagogie:
    'Analogie forte : logique câblée → équations → ladder. On reprend le départ moteur des TP 1 et 2 pour montrer que la même fonction se réalise autrement. Démonstration animée du cycle automate.',
  blocs: [
    { kind: 'intro', texte:
      'Un automate programmable (API) remplace la logique câblée par un programme. Les boutons et les capteurs deviennent des ENTRÉES, la bobine du contacteur et les voyants deviennent des SORTIES. Le câblage se simplifie ; l’intelligence passe dans le programme.' },
    { kind: 'section', titre: '1. La structure d’un automate', points: [
      'Une unité centrale (CPU) qui exécute le programme.',
      'Des ENTRÉES TOR (tout ou rien) 24 V : elles reçoivent l’état des boutons et capteurs.',
      'Des SORTIES relais : elles commandent la bobine KM1 et les voyants.',
      'Une alimentation 24 V (ici fournie par T1 et Q3, comme la commande des TP précédents).' ] },
    { kind: 'section', titre: '2. Le cycle automate', points: [
      'LECTURE : l’automate lit toutes ses entrées et les recopie en mémoire.',
      'TRAITEMENT : il exécute le programme (ladder) de haut en bas.',
      'ÉCRITURE : il met à jour toutes ses sorties d’un coup.',
      'Ce cycle se répète en quelques millisecondes, en boucle.' ] },
    { kind: 'section', titre: '3. L’adressage des entrées / sorties', points: [
      'Chaque entrée porte une adresse : %I0.0 (marche), %I0.1 (arrêt), %I0.2 (défaut thermique).',
      'Chaque sortie aussi : %Q0.0 (bobine KM1), %Q0.1 (voyant marche), %Q0.2 (voyant défaut).',
      'Les COMMUNS (COM0, COM1) regroupent les bornes : COM0 porte les sorties Q0.0 à Q0.3.',
      'La table d’affectation relie chaque organe réel à son adresse : c’est le document de référence.' ] },
    { kind: 'section', titre: '4. Câblé ou programmé : même fonction', points: [
      'L’auto-maintien câblé (contact KM1 13-14) devient une ligne de programme : Q0.0 se maintient tant que I0.1 (arrêt) est vrai.',
      'La sécurité positive se conserve : l’arrêt reste un contact NF câblé sur une entrée.',
      'On gagne en souplesse : ajouter une temporisation ou une gestion horaire ne demande plus de recâbler, seulement de modifier le programme.' ] },
    { kind: 'vocab', items: [
      { terme: 'API', def: 'Automate programmable industriel : calculateur qui pilote un procédé selon un programme.' },
      { terme: 'TOR', def: 'Tout ou rien : signal à deux états (0 / 1), par opposition à un signal analogique.' },
      { terme: 'Ladder', def: 'Langage à contacts, qui ressemble à un schéma électrique, pour programmer l’automate.' },
      { terme: 'Table d’affectation', def: 'Tableau reliant chaque entrée / sortie physique à son adresse automate.' } ] },
    { kind: 'retenir', points: [
      'Capteurs → entrées, préactionneurs & voyants → sorties relais.',
      'Le cycle : lire les entrées → exécuter le programme → écrire les sorties, en boucle.',
      'Adressage %I / %Q et communs COM ; la table d’affectation est le document clé.',
      'La même fonction que le câblé, mais modifiable sans recâbler.' ] },
  ],
};

// ──────────────────────────── FICHES ─────────────────────────────

const FICHE_PERCEUSE: FicheContenu = {
  tpId: 'perceuse-radiale',
  type: 'fiche',
  titre: 'Démarrage direct — l’essentiel',
  sousTitre: 'Fiche de révision · Perceuse radiale',
  competences: ['C5 Réaliser', 'C6 Mettre en service'],
  duree: '20 min',
  pedagogie:
    'Synthèse d’une page, imprimable, à réviser avant l’évaluation ou un CCF. Mémorisation active : l’élève reconstitue le schéma et les points de sécurité de tête.',
  blocs: [
    { kind: 'tableau', titre: 'Les organes du montage', entetes: ['Repère', 'Organe', 'Rôle'], lignes: [
      ['Q', 'Sectionneur porte-fusibles', 'Coupure, consignation, protection court-circuit'],
      ['KM1', 'Contacteur', 'Établit la puissance sur ordre de la commande'],
      ['F1', 'Relais thermique', 'Protège le moteur contre les surcharges'],
      ['S1 / S2', 'Boutons arrêt (NF) / marche (NO)', 'Ordres de commande'],
      ['H1', 'Voyant incolore', 'Signale la mise sous tension'],
      ['T1', 'Transformateur 400/24 V', 'Alimente la commande en TBTS'] ] },
    { kind: 'section', titre: 'Le principe en une phrase', points: [
      'Une commande 24 V pilote un contacteur qui établit la puissance 400 V, avec auto-maintien et chaîne d’arrêt à sécurité positive.' ] },
    { kind: 'securite', titre: 'Les 5 points avant mise sous tension', points: [
      'Consignation (séparer et cadenasser le sectionneur).',
      'VAT — vérification d’absence de tension.',
      'Continuité du conducteur de protection (PE).',
      'Mesure d’isolement (500 V).',
      'Contrôle du serrage et du repérage des bornes.' ] },
    { kind: 'retenir', points: [
      'Arrêts = NF en série ; marche = NO + auto-maintien KM1 13-14.',
      'Sectionneur porte-fusibles = organe de consignation ; un fusible se remplace.',
      'Voyant incolore = sous tension, pas en marche.',
      'Puissance 400 V, commande 24 V : jamais l’opérateur sur la puissance.' ] },
  ],
};

const FICHE_VARIATEUR: FicheContenu = {
  tpId: 'variateur',
  type: 'fiche',
  titre: 'Variateur — l’essentiel',
  sousTitre: 'Fiche de révision · ATV320',
  competences: ['C5 Réaliser', 'C6 Mettre en service'],
  duree: '20 min',
  pedagogie:
    'Aide-mémoire opérationnel, utilisable en situation et révisable avant CCF. L’élève sait retrouver d’un coup d’œil les paramètres et la procédure de mise sous tension.',
  blocs: [
    { kind: 'section', titre: 'Le synoptique à connaître', points: [
      'Réseau 400 V → REDRESSEUR → BUS CONTINU (condensateurs) → ONDULEUR MLI → moteur.' ] },
    { kind: 'tableau', titre: 'Les paramètres clés', entetes: ['Code', 'Paramètre', 'Rôle'], lignes: [
      ['bFr', 'Fréquence moteur standard', '50 Hz en Europe'],
      ['ItH', 'Protection thermique moteur', 'Réglée au courant plaque (remplace le thermique)'],
      ['ACC / dEC', 'Rampes', 'Durée de montée / descente en fréquence'],
      ['tCC', 'Type de commande', '2 fils / 3 fils selon le câblage'],
      ['UnS / FrS / nCr', 'Valeurs plaque', 'Tension, fréquence, courant moteur nominal'] ] },
    { kind: 'securite', titre: 'Sécurité bus continu', points: [
      'Attendre 15 minutes après coupure.',
      'Contrôler < 42 V continus entre PA/+ et PC/−.',
      'Jamais de coupure en sortie U/V/W en charge.' ] },
    { kind: 'retenir', points: [
      'Pas de pointe, pas de thermique externe, pas d’organe de coupure en sortie.',
      'La MES passe par la plaque signalétique (couplage + paramétrage).',
      'Le bus continu reste dangereux après coupure.' ] },
  ],
};

const FICHE_AUTOMATE: FicheContenu = {
  tpId: 'automate-m221',
  type: 'fiche',
  titre: 'Automate M221 — l’essentiel',
  sousTitre: 'Fiche de révision · Modicon M221',
  competences: ['C5 Réaliser', 'C7 Maintenir'],
  duree: '20 min',
  pedagogie:
    'Synthèse structurée ; carte mentale du cycle et de l’adressage à compléter. Révisable avant l’évaluation qui inclut la maintenance (C7).',
  blocs: [
    { kind: 'tableau', titre: 'Table d’affectation type', entetes: ['Adresse', 'Organe', 'Type'], lignes: [
      ['%I0.0', 'S2 marche (NO)', 'Entrée'],
      ['%I0.1', 'S1 arrêt (NF)', 'Entrée'],
      ['%I0.2', 'F1 défaut thermique', 'Entrée'],
      ['%Q0.0', 'Bobine KM1', 'Sortie relais'],
      ['%Q0.1', 'H1 voyant marche', 'Sortie relais'],
      ['%Q0.2', 'H2 voyant défaut', 'Sortie relais'] ] },
    { kind: 'section', titre: 'Le cycle automate en 3 temps', points: [
      'Lecture des entrées → Traitement du programme → Écriture des sorties, en boucle (quelques ms).' ] },
    { kind: 'section', titre: 'Adressage et communs', points: [
      'Entrées %I0.x, sorties %Q0.x.',
      'COM0 porte les sorties Q0.0 à Q0.3 ; COM1 porte Q0.4 à Q0.6.',
      'Le 0 V commun et le +24 V viennent de T1 / Q3.' ] },
    { kind: 'retenir', points: [
      'Capteurs → entrées, préactionneurs → sorties relais.',
      'Cycle : lire → traiter → écrire.',
      'La table d’affectation est le document de référence.',
      'Même fonction que le câblé, modifiable sans recâbler.' ] },
  ],
};

// ──────────────────────────── INDEX ──────────────────────────────

const TOUTES: FicheContenu[] = [
  COURS_PERCEUSE, COURS_VARIATEUR, COURS_AUTOMATE,
  FICHE_PERCEUSE, FICHE_VARIATEUR, FICHE_AUTOMATE,
];

/** Retrouve une fiche lisible par type + TP. */
export function getFiche(type: ResType, tpId: string): FicheContenu | null {
  return TOUTES.find((f) => f.type === type && f.tpId === tpId) ?? null;
}

/** Toutes les fiches d'un type donné (pour un catalogue). */
export function fichesParType(type: ResType): FicheContenu[] {
  return TP_RESSOURCES
    .map((t) => getFiche(type, t.tpId))
    .filter((f): f is FicheContenu => Boolean(f));
}
