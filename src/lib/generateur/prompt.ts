/**
 * Prompt du générateur de TP : consigne système (ton de professeur d'atelier) et
 * construction du prompt utilisateur à partir du brief du professeur et du contexte imposé.
 *
 * Module PUR : aucune dépendance réseau, aucune donnée personnelle d'élève.
 */
import type { SceneKind } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import { DIPLOMAS } from '@/lib/data/competences';
import type { Anomalie } from './verifier';

/** Consigne système : rôle, style, règles absolues. */
export const SYSTEME = `Tu es professeur d'électrotechnique en lycée professionnel. Tu construis les TP de l'atelier depuis vingt ans : armoires industrielles, tableaux d'habitat, installations tertiaires et photovoltaïques. On te donne un brief et un dossier technique, tu rends un TP prêt à passer sur le simulateur SimulElec.

Ton écriture :
- Français, phrases courtes, verbes d'action. Le ton de l'atelier, pas celui d'un manuel.
- Vocabulaire normalisé : bornier X1 (puissance) et X2 (commande), auto-maintien, contact NC, consignation, VAT, section, repérage, calibre, courbe, sélectivité.
- Tu tutoies l'élève dans les consignes, tu vouvoies le professeur dans la correction.
- Pas de LaTeX, pas d'emoji, pas de balisage, pas de texte à trous du type « à compléter » ou « XXX ».

Règles absolues :
1. Tu ne choisis QUE des clés d'appareils, des codes de compétences et des identifiants de pannes présents dans les listes fournies. Une clé inventée rend le TP injouable.
2. Tu n'écris JAMAIS de valeur numérique de tension, de courant, de résistance ou d'isolement dans une correction. Tu décris le geste de mesure et ce qu'on attend qualitativement (« tension composée présente sur les trois phases », « isolement très supérieur au minimum réglementaire ») : la valeur est calculée par le simulateur.
3. Les consignes élève sont à l'impératif, numérotées, dans l'ordre d'exécution, et désignent les repères réellement posés sur la platine (Q1, KM1, X1:5, S1, H2…). Une consigne = un geste vérifiable.
4. La correction professeur donne : les réponses attendues, les points de vigilance sécurité (consignation, VAT, EPI, ordre des opérations), et les erreurs fréquentes des élèves avec ce qu'elles produisent.
5. Chaque critère d'évaluation est observable, rattaché à un code de compétence du référentiel fourni, à une étape du parcours (0 à 10) et à une source : « simulateur » quand la machine peut trancher seule (pose, câblage, mesure, quiz), « professeur » quand il faut un regard humain (soin, méthode, oral).
6. La maquette doit être jouable : chaque liaison relie deux bornes qui existent vraiment sur les appareils posés, chaque poste de choix a exactement une bonne référence et deux pièges justifiés, chaque mesure désigne des bornes réelles. Tu n'indiques ni min ni max pour les mesures.
7. Le câblage de l'installateur (arrivée réseau vers X1, câble moteur, liaisons de porte déjà tirées) est marqué « prewired » ; il reste toujours des fils à tirer par l'élève.

Étapes du parcours (pour le champ « etape » des critères) : 0 choix du mode, 1 énoncé, 2 matériel, 3 pose, 4 câblage, 5 EPI et consignation, 6 mesures hors tension, 7 déconsignation, 8 mise en service, 9 diagnostic de panne, 10 bilan et quiz.

Tu réponds uniquement en appelant l'outil « rediger_tp ».`;

/** Brief du professeur (aucune donnée personnelle d'élève ne doit y figurer). */
export interface Brief {
  diplomaId: DiplomaId;
  theme: string;
  resume: string;
  /** Durée totale de la séance, en minutes. */
  duration: number;
  /** Nature de la séquence : « découverte », « entraînement », « évaluation »… */
  sequenceType: string;
  /** Activités souhaitées par le professeur. */
  activities: string[];
  /** Matériel déclaré disponible à l'atelier. */
  materielDisponible: string[];
  /** Type d'installation visé (déduit du thème si le professeur ne l'impose pas). */
  scene: SceneKind;
  /** Noms des documents joints (le contenu part en pièce jointe). */
  documents?: string[];
}

const SCENE_LABEL: Record<SceneKind, string> = {
  ind: 'installation industrielle (armoire, départ moteur, commande)',
  hab: 'installation d’habitation (tableau de répartition, circuits terminaux)',
  ter: 'installation tertiaire (éclairage, commande, sécurité)',
  pv: 'installation photovoltaïque (production, stockage, raccordement réseau)',
};

const liste = (titre: string, valeurs: string[]): string =>
  valeurs.length ? `${titre} : ${valeurs.join(' ; ')}` : `${titre} : libre`;

/** Prompt utilisateur : le brief, puis le contexte imposé. */
export function construirePromptUtilisateur(brief: Brief, contexte: string): string {
  const dip = DIPLOMAS.find((d) => d.id === brief.diplomaId);
  return [
    'BRIEF DU PROFESSEUR',
    `  Diplôme : ${dip?.name ?? brief.diplomaId}`,
    `  Thème : ${brief.theme}`,
    `  Attendu : ${brief.resume || 'non précisé'}`,
    `  Type de séquence : ${brief.sequenceType || 'séance de travaux pratiques'}`,
    `  Durée totale : ${brief.duration} minutes (répartis-la entre les activités)`,
    `  Type d’installation : ${SCENE_LABEL[brief.scene]}`,
    `  ${liste('Activités demandées', brief.activities)}`,
    `  ${liste('Matériel disponible à l’atelier', brief.materielDisponible)}`,
    brief.documents?.length ? `  Dossier technique joint : ${brief.documents.join(', ')}` : '  Dossier technique joint : aucun',
    '',
    'Exploite le dossier technique joint (plaque signalétique, schéma, notice) pour les caractéristiques réelles.',
    '',
    contexte,
    '',
    'Rends maintenant le TP complet en appelant l’outil « rediger_tp ».',
  ].join('\n');
}

/** Extrait fautif à renvoyer au modèle avec les anomalies. */
export interface PortionFautive {
  chemin: string;
  extrait: string;
}

/**
 * Relance après vérification : on rend les anomalies en clair et la portion fautive,
 * sans jamais réécrire à la place du modèle.
 */
export function construireRelance(anomalies: Anomalie[], portions: PortionFautive[]): string {
  const bloquantes = anomalies.filter((a) => a.gravite === 'bloquante');
  const avertissements = anomalies.filter((a) => a.gravite === 'avertissement');
  return [
    'Le moteur de simulation a refusé cette version du TP. Corrige-la et rappelle l’outil « rediger_tp » avec le TP entier (pas seulement les parties fautives).',
    '',
    'ANOMALIES BLOQUANTES :',
    ...bloquantes.map((a) => `  - ${a.chemin} : ${a.message}`),
    ...(avertissements.length
      ? ['', 'AVERTISSEMENTS (à corriger si possible) :', ...avertissements.map((a) => `  - ${a.chemin} : ${a.message}`)]
      : []),
    ...(portions.length
      ? ['', 'PORTIONS FAUTIVES DE TA RÉPONSE :', ...portions.map((p) => `  ${p.chemin} → ${p.extrait}`)]
      : []),
    '',
    'Rappels : n’utilise que les clés d’appareils, les codes de compétences et les identifiants de pannes des listes fournies ; ' +
    'toute borne citée doit exister sur l’appareil posé ; aucune valeur numérique de tension, de courant, de résistance ou d’isolement dans les corrections.',
  ].join('\n');
}
