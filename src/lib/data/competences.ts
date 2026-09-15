/**
 * Référentiels de compétences des diplômes utilisateurs de SimulElec, et correspondance
 * étapes de TP → compétences. Sources : JO du 13 avril 2018 (CAP Électricien), JO du 8 mars 2024
 * (Bac Pro MELEC, rénové), référentiel BTS Électrotechnique (2020), référentiel MC / CS Technicien
 * en énergies renouvelables (TENR).
 */

export type DiplomaId = 'cap' | 'bacpro' | 'bts' | 'cster';

export interface Diploma {
  id: DiplomaId;
  short: string;
  name: string;
  /** Niveau de tutoiement / exigence : 3 = CAP, 4 = Bac Pro, 5 = BTS. */
  level: 3 | 4 | 5;
}

export const DIPLOMAS: Diploma[] = [
  { id: 'cap', short: 'CAP Électricien', name: 'CAP Électricien', level: 3 },
  { id: 'bacpro', short: 'Bac Pro MELEC', name: 'Baccalauréat professionnel Métiers de l’électricité et de ses environnements connectés', level: 4 },
  { id: 'bts', short: 'BTS Électrotechnique', name: 'BTS Électrotechnique', level: 5 },
  { id: 'cster', short: 'CS TER', name: 'Certificat de spécialisation Technicien en énergies renouvelables (ex-MC TENR)', level: 4 },
];

export interface Competence {
  code: string;      // C1, CO3, C3-5…
  label: string;
  /** Critères d'évaluation résumés (du référentiel). */
  criteria: string[];
  /** Unité certificative principale (indicatif). */
  unit?: string;
}

export const COMPETENCES: Record<DiplomaId, Competence[]> = {
  cap: [
    { code: 'CO1', label: 'Analyser les conditions de l’opération et son contexte', criteria: ['Les informations nécessaires sont recueillies', 'Les contraintes techniques et d’exécution sont repérées', 'Les risques professionnels sont évalués'], unit: 'UP1' },
    { code: 'CO2', label: 'Organiser l’opération dans son contexte', criteria: ['Les matériels, équipements et outillages nécessaires sont listés', 'Le poste de travail est organisé', 'Les règles de santé et de sécurité au travail sont respectées'], unit: 'UP1' },
    { code: 'CO3', label: 'Réaliser une installation de manière éco-responsable', criteria: ['Les matériels sont posés conformément aux prescriptions et règles de l’art', 'Les câblages et raccordements sont conformes', 'Les autocontrôles sont réalisés'], unit: 'UP2' },
    { code: 'CO4', label: 'Contrôler les grandeurs caractéristiques de l’installation', criteria: ['Les mesures sont réalisées avec les appareils adaptés', 'Les grandeurs contrôlées sont correctement interprétées', 'Les règles de sécurité sont respectées'], unit: 'UP2' },
    { code: 'CO5', label: 'Valider le fonctionnement de l’installation', criteria: ['L’installation est mise en fonctionnement conformément aux prescriptions', 'Le fonctionnement est conforme au cahier des charges'], unit: 'UP2' },
    { code: 'CO6', label: 'Remplacer un matériel électrique', criteria: ['Le matériel à remplacer est identifié et correctement déposé', 'Le matériel de remplacement est correctement choisi et installé', 'Le fonctionnement est vérifié après rétablissement des énergies'], unit: 'UP3' },
    { code: 'CO7', label: 'Exploiter les outils numériques dans le contexte professionnel', criteria: ['Les applications numériques sont exploitées avec pertinence'], unit: 'UP1' },
    { code: 'CO8', label: 'Communiquer entre professionnels sur l’opération', criteria: ['Les informations sur le déroulement des opérations sont transmises', 'Les documents liés aux opérations sont complétés'], unit: 'UP3' },
    { code: 'CO9', label: 'Communiquer avec le client / usager sur l’opération', criteria: ['Le fonctionnement et le bon usage de l’installation sont expliqués'], unit: 'UP3' },
  ],
  bacpro: [
    { code: 'C1', label: 'Analyser les conditions de l’opération et son contexte', criteria: ['Les informations nécessaires sont recueillies', 'Les contraintes techniques et d’exécution sont repérées', 'Les risques professionnels sont évalués', 'Les habilitations et certifications nécessaires sont identifiées'], unit: 'U2' },
    { code: 'C2', label: 'Organiser l’opération dans son contexte', criteria: ['Les matériels, équipements et outillages manquants sont listés', 'Le poste de travail est organisé avec ergonomie', 'Les règles de santé et de sécurité au travail sont respectées'], unit: 'U31' },
    { code: 'C3', label: 'Définir une installation à l’aide de solutions préétablies', criteria: ['Le dossier technique des opérations est constitué et complet', 'La solution technique proposée répond au besoin du client et elle est pertinente', 'La solution intègre les enjeux d’efficacité énergétique'], unit: 'U2' },
    { code: 'C4', label: 'Réaliser une installation de manière éco-responsable', criteria: ['Les matériels sont posés conformément aux prescriptions et règles de l’art', 'Les câblages et les raccordements sont réalisés conformément aux prescriptions et règles de l’art', 'Les autocontrôles sont réalisés', 'Les règles de santé et de sécurité au travail sont respectées'], unit: 'U31' },
    { code: 'C5', label: 'Contrôler les grandeurs caractéristiques de l’installation', criteria: ['Les contrôles (visuels, caractéristiques…) sont réalisés', 'Les mesures (électriques, dimensionnelles…) sont réalisées', 'Les grandeurs contrôlées sont correctement interprétées au regard des prescriptions', 'Les règles de santé et de sécurité au travail sont respectées'], unit: 'U31' },
    { code: 'C6', label: 'Régler, paramétrer les matériels de l’installation', criteria: ['Les réglages sont réalisés conformément aux prescriptions', 'Les paramétrages guidés sont réalisés conformément aux prescriptions'], unit: 'U31' },
    { code: 'C7', label: 'Valider le fonctionnement de l’installation', criteria: ['L’installation est mise en fonctionnement conformément aux prescriptions', 'Le fonctionnement est conforme aux spécifications du cahier des charges'], unit: 'U31' },
    { code: 'C8', label: 'Diagnostiquer un dysfonctionnement', criteria: ['Les informations relatives au dysfonctionnement sont analysées', 'Le diagnostic est posé, pertinent et complet'], unit: 'U32' },
    { code: 'C9', label: 'Remplacer un matériel électrique', criteria: ['Le matériel de remplacement est correctement choisi et installé', 'Le fonctionnement est vérifié après rétablissement des énergies'], unit: 'U32' },
    { code: 'C10', label: 'Exploiter les outils numériques dans le contexte professionnel', criteria: ['Les applications numériques (représentation graphique, dimensionnement, chiffrage…) sont exploitées avec pertinence'], unit: 'U2' },
    { code: 'C11', label: 'Compléter les documents liés aux opérations', criteria: ['Les documents liés aux opérations sont complétés avec rigueur'], unit: 'U2' },
    { code: 'C12', label: 'Communiquer entre professionnels sur l’opération', criteria: ['Les informations sur le déroulement des opérations sont expliquées', 'L’état d’avancement, les contraintes et difficultés sont expliqués'], unit: 'U31' },
    { code: 'C13', label: 'Communiquer avec le client / usager sur l’opération', criteria: ['Les usages et le fonctionnement de l’installation sont expliqués'], unit: 'U31' },
  ],
  bts: [
    { code: 'C1', label: 'Recenser et prendre en compte les normes, les réglementations applicables au projet / chantier', criteria: ['Les normes et réglementations applicables sont identifiées et appliquées'] },
    { code: 'C2', label: 'Extraire les informations nécessaires à la réalisation des tâches', criteria: ['Les informations utiles sont extraites des documents techniques'], unit: 'U51' },
    { code: 'C3', label: 'Gérer les risques et les aléas liés à la réalisation des tâches', criteria: ['Les risques sont identifiés, les mesures de prévention sont mises en œuvre'] },
    { code: 'C4', label: 'Communiquer de manière adaptée à l’oral, à l’écrit, y compris en langue anglaise', criteria: ['La communication est adaptée à l’interlocuteur'] },
    { code: 'C5', label: 'Interpréter un besoin client / utilisateur, un CCTP, un cahier des charges', criteria: ['Le besoin est correctement interprété'], unit: 'U41' },
    { code: 'C6', label: 'Modéliser le comportement de tout ou partie d’un ouvrage, d’une installation, d’un équipement', criteria: ['Le modèle est pertinent'], unit: 'U41' },
    { code: 'C7', label: 'Simuler le comportement de tout ou partie d’un ouvrage, d’une installation, d’un équipement', criteria: ['La simulation est exploitée pour valider le comportement'], unit: 'U42' },
    { code: 'C8', label: 'Dimensionner les constituants d’un ouvrage, d’une installation, d’un équipement électrique', criteria: ['Les constituants sont dimensionnés selon les règles et normes', 'Les calculs sont justes et justifiés'], unit: 'U41' },
    { code: 'C9', label: 'Choisir les constituants d’un ouvrage, d’une installation, d’un équipement électrique', criteria: ['Les constituants choisis sont compatibles et adaptés'], unit: 'U41' },
    { code: 'C10', label: 'Proposer l’architecture d’un ouvrage, d’une installation, d’un équipement électrique', criteria: ['L’architecture proposée est cohérente et justifiée'], unit: 'U41' },
    { code: 'C11', label: 'Réaliser les documents techniques (plans, schémas, DOE, maquette virtuelle…) du projet / chantier', criteria: ['Les documents sont conformes et exploitables'], unit: 'U42' },
    { code: 'C12', label: 'Gérer et conduire le projet / chantier', criteria: ['L’organisation, la planification et le suivi sont assurés'], unit: 'U61' },
    { code: 'C13', label: 'Mesurer les grandeurs caractéristiques d’un ouvrage, d’une installation, d’un équipement', criteria: ['Les mesures sont réalisées en sécurité avec les appareils adaptés', 'Les grandeurs sont correctement interprétées'], unit: 'U51' },
    { code: 'C14', label: 'Réaliser un ouvrage, une installation, un équipement électrique', criteria: ['La réalisation est conforme aux prescriptions et règles de l’art'], unit: 'U62' },
    { code: 'C15', label: 'Configurer et programmer les matériels dans le cadre du projet / chantier', criteria: ['Les matériels sont configurés et programmés conformément au cahier des charges'], unit: 'U62' },
    { code: 'C16', label: 'Appliquer un protocole pour mettre en service un ouvrage, une installation, un équipement', criteria: ['Le protocole de mise en service est appliqué et documenté'], unit: 'U62' },
    { code: 'C17', label: 'Réaliser un diagnostic de performance, y compris énergétique, de sécurité, d’un ouvrage, d’une installation, d’un équipement', criteria: ['Le diagnostic est pertinent et argumenté'], unit: 'U51' },
    { code: 'C18', label: 'Réaliser des opérations de maintenance sur un ouvrage, une installation, un équipement électrique', criteria: ['Les opérations de maintenance sont réalisées en sécurité, le fonctionnement est rétabli'], unit: 'U51' },
  ],
  cster: [
    { code: 'C1-1', label: 'Collecter et interpréter des données', criteria: ['Les données utiles (besoins, site, matériels) sont collectées et interprétées'] },
    { code: 'C1-2', label: 'Rechercher les données complémentaires', criteria: ['Les données manquantes (ressource solaire, fiches techniques) sont recherchées'] },
    { code: 'C1-3', label: 'Traiter l’ensemble des données', criteria: ['Les données sont exploitées pour le dimensionnement'] },
    { code: 'C2-1', label: 'Quantifier les besoins', criteria: ['Les besoins (énergie, puissance, matériels) sont quantifiés'] },
    { code: 'C2-2', label: 'Planifier l’intervention', criteria: ['Les étapes de l’intervention sont planifiées'] },
    { code: 'C2-3', label: 'Organiser les activités', criteria: ['Les activités et le poste de travail sont organisés'] },
    { code: 'C3-1', label: 'Vérifier les données sur site', criteria: ['Les données sont vérifiées avant intervention'] },
    { code: 'C3-2', label: 'Installer les postes de travail', criteria: ['Le poste de travail est installé en sécurité'] },
    { code: 'C3-3', label: 'Mettre en place les matériels', criteria: ['Les matériels sont mis en place conformément aux prescriptions'] },
    { code: 'C3-4', label: 'Réaliser l’étanchéité du support', criteria: ['L’étanchéité est réalisée'] },
    { code: 'C3-5', label: 'Raccorder les réseaux', criteria: ['Les raccordements électriques sont conformes aux prescriptions et règles de l’art'] },
    { code: 'C3-6', label: 'Réaliser les essais et réglages', criteria: ['Les essais et réglages sont réalisés et interprétés'] },
    { code: 'C3-7', label: 'Réaliser une intervention de maintenance', criteria: ['L’intervention de maintenance est réalisée en sécurité'] },
    { code: 'C4-1', label: 'Procéder aux vérifications', criteria: ['Les vérifications et mesures sont réalisées avec les appareils adaptés'] },
    { code: 'C5-1', label: 'Dialoguer avec le client et avec la hiérarchie', criteria: ['Le dialogue est adapté et les informations sont transmises'] },
    { code: 'C5-2', label: 'Compléter des documents', criteria: ['Les documents (note de calcul, fiches) sont complétés avec rigueur'] },
  ],
};

/**
 * Domaines d'activité rencontrés dans un TP SimulElec, indépendants du diplôme.
 * Chaque étape du parcours (platine ou dimensionnement) déclare les domaines qu'elle mobilise ;
 * la grille ci-dessous les traduit en compétences du diplôme de l'élève.
 */
export type Domain =
  | 'analyse' | 'organisation' | 'choix' | 'pose' | 'cablage' | 'controle' | 'mesure' | 'reglage'
  | 'miseEnService' | 'diagnostic' | 'remplacement' | 'securite' | 'numerique' | 'documents'
  | 'communication' | 'dimensionnement' | 'architecture' | 'normes' | 'programmation';

export const DOMAIN_LABEL: Record<Domain, string> = {
  analyse: 'Analyse du cahier des charges', organisation: 'Organisation et préparation', choix: 'Choix du matériel',
  pose: 'Pose des matériels', cablage: 'Câblage et raccordement', controle: 'Contrôles hors tension', mesure: 'Mesures',
  reglage: 'Réglages et paramétrages', miseEnService: 'Mise en service', diagnostic: 'Diagnostic', remplacement: 'Remplacement de matériel',
  securite: 'Prévention des risques, consignation', numerique: 'Outils numériques', documents: 'Documents et note de calcul',
  communication: 'Communication', dimensionnement: 'Dimensionnement', architecture: 'Architecture de l’installation',
  normes: 'Normes et réglementation', programmation: 'Configuration et programmation',
};

export const DOMAIN_TO_COMPETENCES: Record<DiplomaId, Partial<Record<Domain, string[]>>> = {
  cap: {
    analyse: ['CO1'], organisation: ['CO2'], choix: ['CO2'], pose: ['CO3'], cablage: ['CO3'], controle: ['CO4'], mesure: ['CO4'],
    reglage: ['CO5'], miseEnService: ['CO5'], diagnostic: ['CO5'], remplacement: ['CO6'], securite: ['CO1', 'CO2'], numerique: ['CO7'],
    documents: ['CO8'], communication: ['CO8', 'CO9'], dimensionnement: ['CO1'], architecture: ['CO1'], normes: ['CO1'], programmation: ['CO5'],
  },
  bacpro: {
    analyse: ['C1'], organisation: ['C2'], choix: ['C3'], pose: ['C4'], cablage: ['C4'], controle: ['C5'], mesure: ['C5'],
    reglage: ['C6'], miseEnService: ['C7'], diagnostic: ['C8'], remplacement: ['C9'], securite: ['C1', 'C2'], numerique: ['C10'],
    documents: ['C11'], communication: ['C12', 'C13'], dimensionnement: ['C3', 'C10'], architecture: ['C3'], normes: ['C1'], programmation: ['C6'],
  },
  bts: {
    analyse: ['C2', 'C5'], organisation: ['C12'], choix: ['C9'], pose: ['C14'], cablage: ['C14'], controle: ['C13'], mesure: ['C13'],
    reglage: ['C15'], miseEnService: ['C16'], diagnostic: ['C17', 'C18'], remplacement: ['C18'], securite: ['C3'], numerique: ['C7'],
    documents: ['C11'], communication: ['C4'], dimensionnement: ['C8'], architecture: ['C10'], normes: ['C1'], programmation: ['C15'],
  },
  cster: {
    analyse: ['C1-1'], organisation: ['C2-3'], choix: ['C1-3', 'C2-1'], pose: ['C3-3'], cablage: ['C3-5'], controle: ['C4-1'], mesure: ['C4-1'],
    reglage: ['C3-6'], miseEnService: ['C3-6'], diagnostic: ['C3-7'], remplacement: ['C3-7'], securite: ['C3-2'], numerique: ['C1-2'],
    documents: ['C5-2'], communication: ['C5-1'], dimensionnement: ['C1-3', 'C2-1'], architecture: ['C1-3'], normes: ['C1-2'], programmation: ['C3-6'],
  },
};

/**
 * ACTIVITÉS PROFESSIONNELLES du référentiel.
 *
 * Une compétence dit ce que l'élève doit savoir faire ; l'activité dit DANS QUEL
 * MOMENT du métier il le fait. Les deux figurent au référentiel et l'élève doit
 * pouvoir situer son travail dans l'un comme dans l'autre : préparer une
 * opération (A1) et la réaliser (A2) ne s'évaluent ni au même moment ni sur les
 * mêmes critères.
 *
 * Les codes A1 à A5 sont ceux du Bac Pro MELEC ; les autres diplômes découpent
 * leurs activités autrement, mais les cinq moments — préparer, réaliser, mettre
 * en service, maintenir, communiquer — leur sont communs.
 */
export type ActiviteId = 'A1' | 'A2' | 'A3' | 'A4' | 'A5';

export interface Activite { code: ActiviteId; label: string; detail: string }

export const ACTIVITES: Activite[] = [
  { code: 'A1', label: 'Préparation des opérations',
    detail: 'Analyser le dossier, identifier les matériels, choisir les solutions, préparer le chantier.' },
  { code: 'A2', label: 'Réalisation',
    detail: 'Implanter, poser, raccorder, dans le respect des règles de l\'art et de la prévention.' },
  { code: 'A3', label: 'Mise en service',
    detail: 'Contrôler, régler, paramétrer, essayer et livrer l\'installation en fonctionnement.' },
  { code: 'A4', label: 'Maintenance',
    detail: 'Diagnostiquer un dysfonctionnement, remplacer un matériel, remettre en service.' },
  { code: 'A5', label: 'Communication',
    detail: 'Rendre compte entre professionnels et auprès du client ou de l\'usager.' },
];

export const ACTIVITE_BY_ID: Record<ActiviteId, Activite> =
  Object.fromEntries(ACTIVITES.map((a) => [a.code, a])) as Record<ActiviteId, Activite>;

/** Activité dominante de chaque étape du parcours « platine » (12 étapes). */
export const PLATINE_STAGE_ACTIVITE: ActiviteId[] = [
  'A1', // 0  choix du TP
  'A1', // 1  énoncé
  'A1', // 2  préparation
  'A1', // 3  matériel
  'A2', // 4  pose
  'A2', // 5  câblage
  'A2', // 6  tests hors tension
  'A3', // 7  EPI & consignation
  'A3', // 8  mesures hors tension
  'A3', // 9  déconsignation & mise en service
  'A3', // 10 mesures sous tension
  'A4', // 11 validation / maintenance
];

/** Activité dominante de chaque étape du parcours « dimensionnement PV ». */
export const PV_STAGE_ACTIVITE: ActiviteId[] = [
  'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A1', 'A5',
];

export function activiteOfStage(kind: 'platine' | 'dimensionnement', stage: number): Activite | null {
  const table = kind === 'dimensionnement' ? PV_STAGE_ACTIVITE : PLATINE_STAGE_ACTIVITE;
  const code = table[stage];
  return code ? ACTIVITE_BY_ID[code] : null;
}

/** Domaines mobilisés par chaque étape du parcours « platine » (12 étapes). */
export const PLATINE_STAGE_DOMAINS: Domain[][] = [
  ['analyse'],                       // 0  choix du TP
  ['analyse', 'normes'],             // 1  énoncé
  ['analyse', 'documents'],          // 2  préparation : identifier et donner la fonction
  ['choix'],                         // 3  matériel
  ['pose', 'organisation'],          // 4  pose
  ['cablage'],                       // 5  câblage
  ['controle'],                      // 6  tests hors tension
  ['securite', 'organisation'],      // 7  EPI & consignation
  ['mesure', 'controle'],            // 8  mesures hors tension
  ['miseEnService', 'reglage'],      // 9  déconsignation & mise en service
  ['mesure'],                        // 10 mesures sous tension
  ['diagnostic', 'remplacement', 'documents', 'communication'], // 11 validation / maintenance
];

/** Domaines mobilisés par chaque étape du parcours « dimensionnement PV » (11 étapes). */
export const PV_STAGE_DOMAINS: Domain[][] = [
  ['analyse', 'dimensionnement'],    // bilan de puissance
  ['analyse', 'dimensionnement'],    // puissance simultanée
  ['analyse', 'numerique'],          // localisation, ressource solaire
  ['architecture'],                  // tension du système
  ['choix', 'dimensionnement'],      // panneaux et couplage
  ['choix', 'dimensionnement'],      // batteries
  ['choix', 'normes'],               // MPPT
  ['choix', 'dimensionnement'],      // onduleur
  ['dimensionnement', 'normes'],     // câbles
  ['normes', 'securite'],            // protections
  ['documents', 'communication'],    // note de calcul
];

export type Mastery = 'acquis' | 'enCours' | 'nonAcquis' | 'nonEvalue';

export interface CompetenceEval {
  code: string;
  label: string;
  domains: Domain[];
  /** Score 0..1 agrégé sur les étapes concernées. */
  score: number;
  mastery: Mastery;
  /**
   * Niveau que l'élève s'est donné lui-même avant la correction (auto-évaluation).
   * Champ additionnel : les lectures existantes de `attempts.evaluation` l'ignorent.
   */
  self?: Mastery;
}

export function masteryOf(score: number, evaluated: boolean): Mastery {
  if (!evaluated) return 'nonEvalue';
  if (score >= 0.75) return 'acquis';
  if (score >= 0.4) return 'enCours';
  return 'nonAcquis';
}

/**
 * ÉCHELLE FINE À 7 NIVEAUX (validée le 2026-09-15), dérivée du même score 0..1.
 * `Mastery` (4 niveaux) reste le champ stocké dans `attempts.evaluation` ; `Niveau`
 * se recalcule à l'affichage à partir de `CompetenceEval.score`, donc rien à migrer.
 *
 * Deux vocabulaires pour la MÊME couleur :
 *   — pendant le TP : « maîtrise » (NIVEAU_TP) ;
 *   — dans le bilan de compétences : « acquisition » (NIVEAU_BILAN).
 */
export type Niveau = 'total' | 'maitrise' | 'partiel' | 'encours' | 'insuffisant' | 'nonMaitrise' | 'nonEvalue';

/** Seuils validés : 0,90 / 0,75 / 0,60 / 0,45 / 0,30. */
export function niveauOf(score: number, evaluated: boolean): Niveau {
  if (!evaluated) return 'nonEvalue';
  if (score >= 0.90) return 'total';
  if (score >= 0.75) return 'maitrise';
  if (score >= 0.60) return 'partiel';
  if (score >= 0.45) return 'encours';
  if (score >= 0.30) return 'insuffisant';
  return 'nonMaitrise';
}

/** Niveau d'une ligne de grille (respecte `nonEvalue` déjà porté par la ligne). */
export const niveauOfEval = (c: CompetenceEval): Niveau => niveauOf(c.score, c.mastery !== 'nonEvalue');

/** Libellés « maîtrise » — partout SAUF le bilan de compétences. */
export const NIVEAU_TP: Record<Niveau, string> = {
  total: 'Totalement maîtrisé', maitrise: 'Maîtrisé', partiel: 'Partiellement maîtrisé',
  encours: 'En cours de maîtrise', insuffisant: 'Insuffisamment maîtrisé', nonMaitrise: 'Non maîtrisé', nonEvalue: 'Non évalué',
};

/** Libellés « acquisition » — uniquement dans le bilan de compétences. */
export const NIVEAU_BILAN: Record<Niveau, string> = {
  total: 'Totalement acquis', maitrise: 'Acquis', partiel: 'Acquis',
  encours: 'En cours d’acquisition', insuffisant: 'Non acquis', nonMaitrise: 'Non acquis', nonEvalue: 'Non évalué',
};

/** Couleur du niveau (vert foncé → rouge, gris = non évalué). */
export const NIVEAU_COLOR: Record<Niveau, string> = {
  total: '#0F7A3D', maitrise: '#16A34A', partiel: '#7FC79A',
  encours: '#EAB308', insuffisant: '#F97316', nonMaitrise: '#DC2626', nonEvalue: '#C7CDD6',
};

/** Texte lisible sur la couleur (foncé sur vert pâle/jaune, blanc sinon). */
export const NIVEAU_ON: Record<Niveau, string> = {
  total: '#fff', maitrise: '#fff', partiel: '#0f3d22', encours: '#3d2c00', insuffisant: '#fff', nonMaitrise: '#fff', nonEvalue: '#475569',
};

/**
 * Grille COMPLÈTE du référentiel du diplôme (toutes les compétences, dans l'ordre),
 * en reprenant le score des compétences déjà évaluées et « non évaluée » pour les autres.
 * Sert à la bande fixe C1→C13 du suivi et au bilan complet.
 */
export function grilleComplete(diploma: DiplomaId, evals: CompetenceEval[]): CompetenceEval[] {
  const parCode = new Map(evals.map((c) => [c.code, c]));
  return COMPETENCES[diploma].map((c) =>
    parCode.get(c.code) ?? { code: c.code, label: c.label, domains: [], score: 0, mastery: 'nonEvalue' as Mastery });
}

/**
 * Construit la grille d'évaluation : pour chaque compétence du diplôme mobilisée par le TP,
 * moyenne des scores des étapes qui la mobilisent.
 * @param stageScores score 0..1 par étape (undefined = étape non faite)
 */
export function evaluate(
  diploma: DiplomaId,
  stageDomains: Domain[][],
  stageScores: (number | undefined)[],
  autoEval?: Record<string, Mastery> | null,
): CompetenceEval[] {
  const map = DOMAIN_TO_COMPETENCES[diploma];
  const acc: Record<string, { sum: number; n: number; domains: Set<Domain>; touched: boolean }> = {};
  stageDomains.forEach((domains, i) => {
    const s = stageScores[i];
    domains.forEach(d => {
      (map[d] ?? []).forEach(code => {
        const a = (acc[code] ??= { sum: 0, n: 0, domains: new Set(), touched: false });
        a.domains.add(d);
        if (s != null) { a.sum += s; a.n += 1; a.touched = true; }
      });
    });
  });
  return COMPETENCES[diploma]
    .filter(c => acc[c.code])
    .map(c => {
      const a = acc[c.code];
      const score = a.n ? a.sum / a.n : 0;
      const self = autoEval?.[c.code];
      return {
        code: c.code, label: c.label, domains: Array.from(a.domains), score,
        mastery: masteryOf(score, a.touched), ...(self ? { self } : {}),
      };
    });
}

// ------------------------------------------------- compétences mobilisées par une étape

/** Domaines d'une étape, selon la nature du parcours. */
export function domainsOfStage(kind: 'platine' | 'dimensionnement', stage: number): Domain[] {
  const table = kind === 'dimensionnement' ? PV_STAGE_DOMAINS : PLATINE_STAGE_DOMAINS;
  return table[stage] ?? [];
}

/**
 * Compétences (du référentiel du diplôme) mobilisées par une étape, avec leurs critères.
 * Utilisé par le bandeau « Ce qui est évalué ici » et par la pastille du stepper.
 */
export function competencesForDomains(diploma: DiplomaId, domains: Domain[]): Competence[] {
  const map = DOMAIN_TO_COMPETENCES[diploma];
  const codes = new Set<string>();
  domains.forEach(d => (map[d] ?? []).forEach(c => codes.add(c)));
  return COMPETENCES[diploma].filter(c => codes.has(c.code));
}

/** Compétences mobilisées par l'étape `stage` du parcours `kind`. */
export function competencesForStage(
  diploma: DiplomaId,
  kind: 'platine' | 'dimensionnement',
  stage: number,
): Competence[] {
  return competencesForDomains(diploma, domainsOfStage(kind, stage));
}

/** Nombre de compétences mobilisées par chaque étape (pastille du stepper). */
export function competenceCounts(diploma: DiplomaId, kind: 'platine' | 'dimensionnement'): number[] {
  const table = kind === 'dimensionnement' ? PV_STAGE_DOMAINS : PLATINE_STAGE_DOMAINS;
  return table.map((_, i) => competencesForStage(diploma, kind, i).length);
}

/** Libellé court d'un niveau de maîtrise (auto-évaluation et bilan). */
export const MASTERY_TEXT: Record<Mastery, string> = {
  acquis: 'Acquis',
  enCours: 'En cours',
  nonAcquis: 'Non acquis',
  nonEvalue: 'Non évalué',
};

/** Ordre des niveaux, pour comparer l'auto-évaluation et le résultat calculé. */
export const MASTERY_RANK: Record<Mastery, number> = {
  nonEvalue: -1, nonAcquis: 0, enCours: 1, acquis: 2,
};

/**
 * Écart entre l'estimation de l'élève et le niveau calculé.
 * `0` = même niveau, `> 0` = l'élève s'est sur-estimé, `< 0` = sous-estimé.
 */
export function masteryGap(self: Mastery | undefined, computed: Mastery): number | null {
  if (!self || self === 'nonEvalue' || computed === 'nonEvalue') return null;
  return MASTERY_RANK[self] - MASTERY_RANK[computed];
}

/**
 * Diplômes déduits du niveau affiché d'un TP (« 1re Bac Pro MELEC », « BTS Électrotechnique / CS TER »…).
 * Dernier maillon de la chaîne profil → classe → TP quand aucun diplôme n'est connu.
 */
export function diplomasFromLevel(level: string | null | undefined): DiplomaId[] {
  const t = (level ?? '').toLowerCase();
  const out: DiplomaId[] = [];
  if (t.includes('cap')) out.push('cap');
  if (t.includes('bac pro') || t.includes('melec')) out.push('bacpro');
  if (t.includes('bts')) out.push('bts');
  if (t.includes('cs ter') || t.includes('tenr') || t.includes('énergies renouvelables')) out.push('cster');
  return out;
}
