/**
 * « Sujet numérique » : copie conforme, jouable dans l'application, d'un sujet
 * d'examen papier (Bac Pro, BTS…).
 *
 * Principe : tout ce que le sujet demande sur la feuille se fait à l'écran, avec le
 * même énoncé, les mêmes documents (DTR), le même ordre de questions. Chaque question
 * porte un OUTIL de réponse (`type`), sa correction (issue du corrigé officiel), sa
 * page de DTR et la compétence évaluée. Le moteur (`src/lib/sujet/`) est générique :
 * un nouveau sujet = un nouveau fichier de données dans `src/lib/data/sujets/`.
 *
 * Ce fichier est le CONTRAT partagé entre les données, le moteur, l'interface élève
 * et la vue professeur. Toute extension passe par ici.
 */

import type { DiplomaId } from '@/lib/data/competences';

/* ───────────────────────────── Sujet ───────────────────────────── */

export interface SujetNumerique {
  /** Identifiant d'URL : `/sujet/<id>` et `attempts.tp_id`. Ex. `eip`, `eip-eclairage`. */
  id: string;
  /** Titre neutre, nommé par le contexte technique : « Espace d’innovation partagé (EIP) — rénovation électrique ». */
  titre: string;
  /** Sous-titre court (nature de l'épreuve, diplôme, parties, durée) — jamais l'origine du sujet. */
  sousTitre: string;
  /** Diplôme de référence du barème par compétence. */
  diploma: DiplomaId;
  /** Durée réglementaire, en minutes (300 = 5 h). */
  dureeMin: number;
  /** Consignes de la page de garde (calculatrice, documents…). */
  consignes: string[];
  /** Problématique générale (page 2 du sujet). */
  problematique: string;
  /** Dossier technique et ressources : toutes les pages, dans l'ordre. */
  dtr: DtrPage[];
  /** Pages du sujet lui-même (pour « voir la page papier » d'une question). */
  pagesSujet: DtrPage[];
  parties: SujetPartie[];
  questions: SujetQuestion[];
  /** Nom court du dossier (« EIP ») : préfixe des sujets thématiques, regroupement au catalogue. */
  nomCourt?: string;
  /** Thèmes couverts (filtre du catalogue). Un sujet peut en porter plusieurs. */
  themes?: ThemeSujet[];
  /**
   * Sujets thématiques tirés de ce dossier (une ou plusieurs parties jouées seules).
   * Les questions ne sont pas dupliquées : `src/lib/sujet/declinaisons.ts` fabrique les
   * sujets dérivés à partir de cette liste.
   */
  declinaisons?: DeclinaisonSujet[];
  /** Sujet dérivé : identifiant du sujet complet dont il est tiré. */
  parent?: string;
}

/** Thèmes normalisés des sujets (libellés, icônes et couleurs : `src/lib/sujet/themes.ts`). */
export type ThemeSujet =
  | 'securite' | 'eclairage' | 'domotique' | 'acces' | 'reseau' | 'pv' | 'automatisme' | 'moteur' | 'distribution';

/** Déclinaison thématique d'un sujet : un sous-ensemble de ses parties, jouable seul. */
export interface DeclinaisonSujet {
  /** Identifiant complet du sujet dérivé (`/sujet/<id>`, `attempts.tp_id`) : `eip-eclairage`. */
  id: string;
  theme: ThemeSujet;
  /** Titre du thème (« Éclairage LED de l’atelier ») ; le sujet dérivé le préfixe du nom court. */
  titre: string;
  sousTitre?: string;
  /** Numéros des parties retenues (numérotation du sujet complet conservée). */
  parties: number[];
  /** Durée de l'épreuve thématique, en minutes. */
  dureeMin: number;
}

export interface DtrPage {
  /** Numéro tel qu'imprimé (DTR 1 … 52). */
  num: number;
  /** Chemin public de l'image (`/tp/eip/dtr-07.jpg`). */
  src: string;
  /** Titre court pour l'onglet / la table des matières. */
  titre: string;
  /** Regroupement (« Habilitations », « Éclairage », « MyHOME », « VIGIK »). */
  section?: string;
}

export interface SujetPartie {
  /** 1..n */
  num: number;
  titre: string;
  /** « Préparer la mise en sécurité… » (colonne « objectifs » du tableau du sujet). */
  objectifs: string[];
  /** Codes du référentiel évalués dans cette partie (« C1 », « C3 », « C6 », « C11 »). */
  competences: string[];
  /** Mise en situation lue au début de la partie (texte fidèle au sujet). */
  situation: string;
  /** Pages DTR conseillées pour cette partie. */
  dtrPages: number[];
}

/* ───────────────────────────── Questions ───────────────────────────── */

/** Champs communs à toutes les questions. */
export interface QuestionBase {
  /** Numéro tel qu'imprimé (1..72). */
  num: number;
  /** Partie d'appartenance. */
  partie: number;
  /** Énoncé FIDÈLE au sujet (les mots en gras du papier peuvent être marqués **ainsi**). */
  enonce: string;
  /** Texte de contexte imprimé juste avant la question (données, extrait), s'il y en a. */
  contexte?: string;
  /** Compétence évaluée (« C1 », « C3 », « C6 », « C11 »). */
  competence: string;
  /** Points de la question (barème par défaut : 1 ; schémas : 4). Modifiable par le professeur. */
  points: number;
  /** Page(s) DTR où se trouve la réponse : la première s'ouvre automatiquement. */
  dtr: number[];
  /** Page du sujet papier où figure la question. */
  pageSujet: number;
  /** Image d'appui (tableau, plan, extrait) affichée sous l'énoncé. */
  image?: { src: string; alt: string };
  /** Indice montré en mode entraînement uniquement (après une réponse fausse). */
  indice?: string;
  /** Explication du corrigé, montrée à la correction. */
  explication?: string;
}

/** Cocher une case (ou plusieurs). */
export interface QCocher extends QuestionBase {
  type: 'cocher';
  options: string[];
  /** Index attendus (un seul pour un QCM simple). */
  bonnes: number[];
  multiple?: boolean;
}

/** Relier deux colonnes (un trait par élément de gauche). */
export interface QRelier extends QuestionBase {
  type: 'relier';
  gauche: string[];
  droite: string[];
  /** Pour chaque index de gauche, l'index de droite attendu. */
  liens: number[];
}

/** Numéroter des étapes dans l'ordre. */
export interface QOrdonner extends QuestionBase {
  type: 'ordonner';
  /** Éléments dans l'ordre d'impression du sujet. */
  items: string[];
  /** Pour chaque élément (ordre d'impression), le rang attendu (1..n). */
  rangs: number[];
}

/** Valeur ou référence à saisir (numérique avec tolérance, ou texte normalisé). */
export interface QValeur extends QuestionBase {
  type: 'valeur';
  /** Plusieurs champs possibles (ex. « tension » + « courant »). */
  champs: ChampValeur[];
}

export interface ChampValeur {
  id: string;
  label: string;
  unite?: string;
  /** Numérique : valeur attendue et tolérance (absolue, dans l'unité). */
  attendu?: number;
  tolerance?: number;
  /** Texte : réponses acceptées (comparaison sans casse, sans accent, sans espace). */
  acceptes?: string[];
  placeholder?: string;
}

/** Calcul : formule → application numérique → résultat (noté sur le résultat, la formule compte à moitié). */
export interface QCalcul extends QuestionBase {
  type: 'calcul';
  /** Grandeur calculée (« k », « F », « N »). */
  grandeur: string;
  unite?: string;
  /** Formule attendue, telle qu'au corrigé (affichage). Mots-clés pour la pré-correction. */
  formule: string;
  formuleMotsCles: string[];
  attendu: number;
  tolerance: number;
  /** Nombre de décimales conseillé / arrondi demandé. */
  arrondi?: string;
}

/** Tableau à compléter (cellules libres, cellules pré-remplies). */
export interface QTableau extends QuestionBase {
  type: 'tableau';
  colonnes: string[];
  lignes: LigneTableau[];
}

export interface LigneTableau {
  /** Cellules dans l'ordre des colonnes : texte fixe, ou cellule à saisir. */
  cellules: (string | CelluleSaisie)[];
}

export interface CelluleSaisie {
  id: string;
  /** Numérique avec tolérance, ou textes acceptés. */
  attendu?: number;
  tolerance?: number;
  acceptes?: string[];
  /** Choix fermé (liste déroulante) plutôt que saisie libre. */
  choix?: string[];
  placeholder?: string;
}

/** Réponse rédigée : pré-corrigée par mots-clés, validée par le professeur. */
export interface QRedige extends QuestionBase {
  type: 'redige';
  /** Mots-clés (au moins `minMotsCles`) attendus dans la réponse. */
  motsCles: string[];
  minMotsCles: number;
  /** Réponse du corrigé (montrée à la correction). */
  corrige: string;
  lignes?: number;
}

/** Bulles à compléter sur un plan (repères à placer). */
export interface QBulles extends QuestionBase {
  type: 'bulles';
  plan: { src: string; alt: string };
  /** Bulles vides du plan : position en % de l'image et valeur attendue. */
  bulles: { id: string; x: number; y: number; attendu: string; acceptes?: string[] }[];
  /** Valeurs proposées (liste fermée), sinon saisie libre. */
  choix?: string[];
}

/** Cavaliers / configurateurs (MyHOME : A, PL, M, S, T, D…). */
export interface QCavaliers extends QuestionBase {
  type: 'cavaliers';
  composants: {
    id: string;
    label: string;
    /** Positions et valeur attendue (`'—'` = aucun cavalier). */
    positions: { id: string; label: string; attendu: string }[];
  }[];
  /** Valeurs proposées pour chaque position (défaut : 0..9, A..F, —). */
  valeurs?: string[];
}

/**
 * Schéma à compléter, en DEUX modes notés chacun pour moitié :
 *  - mode « traits » : l'élève pose des traits de couleur entre les bornes de l'image du
 *    sujet, comme au stylo sur la feuille ;
 *  - mode « câblage réel » : le même montage sur la platine du simulateur (TP platine
 *    dédié, non listé au catalogue), avec mise sous tension et essai fonctionnel.
 */
export interface QSchema extends QuestionBase {
  type: 'schema';
  traits: SchemaTraitsDef;
  /** Identifiant du TP platine (`TPS`, `hidden: true`) joué en mode câblage réel. */
  platineTpId: string;
  /** Image du corrigé (vue professeur / correction). */
  corrigeImage: { src: string; alt: string };
}

export interface SchemaTraitsDef {
  image: { src: string; alt: string; w: number; h: number };
  /** Bornes cliquables, en % de l'image. */
  bornes: { id: string; x: number; y: number; label: string }[];
  /** Couleurs de stylo proposées (id, libellé, css). */
  couleurs: { id: string; label: string; css: string }[];
  /** Liaisons attendues (non orientées) et couleur attendue si elle est notée. */
  attendues: { a: string; b: string; couleur?: string }[];
  /**
   * Correction PAR RÉSEAU (optionnelle, recommandée) : chaque entrée liste les bornes qui
   * doivent être au même potentiel. Plusieurs tracés sont alors équivalents (peigne
   * d'alimentation, bus non polarisé, chaîne de neutres…) : un réseau est juste quand
   * ses bornes sont toutes reliées entre elles par les traits de l'élève (score partiel =
   * (taille de la plus grande composante − 1) / (n − 1)) ; un trait entre deux réseaux
   * différents est une faute. `couleur` : couleur attendue des traits du réseau, si notée.
   * Absent : correction trait par trait sur `attendues`.
   */
  reseaux?: { bornes: string[]; couleur?: string; label?: string }[];
}

export type SujetQuestion =
  | QCocher | QRelier | QOrdonner | QValeur | QCalcul | QTableau | QRedige | QBulles | QCavaliers | QSchema;

export type SujetQuestionType = SujetQuestion['type'];

/* ───────────────────────────── État élève ───────────────────────────── */

export type SujetMode = 'entrainement' | 'examen';

/** Réponse enregistrée pour une question (forme selon l'outil). */
export type ReponseSujet =
  | { type: 'cocher'; choix: number[] }
  | { type: 'relier'; liens: (number | null)[] }
  | { type: 'ordonner'; rangs: (number | null)[] }
  | { type: 'valeur'; valeurs: Record<string, string> }
  | { type: 'calcul'; formule: string; application: string; resultat: string }
  | { type: 'tableau'; cellules: Record<string, string> }
  | { type: 'redige'; texte: string }
  | { type: 'bulles'; valeurs: Record<string, string> }
  | { type: 'cavaliers'; valeurs: Record<string, string> } // clé `${composant}.${position}`
  | { type: 'schema'; traits: TraitPose[]; platine: PlatineResultat | null };

export interface TraitPose { a: string; b: string; couleur: string }

/** Résultat figé du mode câblage réel (relevé depuis le TP platine au moment de la validation). */
export interface PlatineResultat {
  /** Liaisons attendues posées / total. */
  conformes: number;
  total: number;
  /** Mise sous tension réussie et essai fonctionnel réussi. */
  sousTension: boolean;
  essai: boolean;
  /** Identifiant de la tentative du TP platine (pour le suivi professeur). */
  attemptId?: string | null;
}

/** Correction d'une question : score 0..1 et statut. */
export interface CorrectionQuestion {
  num: number;
  /** 0..1 (fraction des points). */
  score: number;
  /** `auto` : corrigée par le moteur ; `aValider` : rédigé pré-corrigé, attend le professeur ; `prof` : note posée par le professeur. */
  statut: 'auto' | 'aValider' | 'prof' | 'sansReponse';
  /** Détail lisible (« 12/14 liaisons », « mots-clés : 2/3 »). */
  detail?: string;
}

export interface SujetAttemptState {
  /** Discriminant pour `attempts.state` (les autres parcours n'ont pas ce champ). */
  kind: 'sujet';
  sujetId: string;
  mode: SujetMode;
  /** Question affichée. */
  courante: number;
  reponses: Record<number, ReponseSujet>;
  /** Questions marquées « à revoir » par l'élève. */
  marquees: number[];
  /** Chrono : instant de début (ISO) et secondes consommées avant la dernière pause. */
  debut: string | null;
  secondesEcoulees: number;
  /** Copie remise (plus de modification possible). */
  remise: boolean;
  remiseAt: string | null;
  /** Corrections figées à la remise (auto), puis complétées par le professeur. */
  corrections: Record<number, CorrectionQuestion>;
  /** Notes / appréciations du professeur par question. */
  annotations: Record<number, string>;
}

/* ───────────────────────────── Bilan ───────────────────────────── */

export interface BilanSujet {
  /** Points obtenus / total, sur le barème du sujet. */
  points: number;
  total: number;
  /** Note ramenée sur 20. */
  note20: number;
  /** Par partie. */
  parties: { num: number; titre: string; points: number; total: number }[];
  /** Par compétence (code → points / total). */
  competences: { code: string; points: number; total: number }[];
  /** Questions en attente de validation professeur. */
  aValider: number[];
  /** Questions sans réponse. */
  sansReponse: number[];
}
