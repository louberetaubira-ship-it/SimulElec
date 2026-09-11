/**
 * Prompts du générateur de TP : consigne système (ton de professeur d'atelier) et
 * construction des prompts utilisateur à partir du brief du professeur et du contexte imposé.
 *
 * La génération est découpée en QUATRE appels courts (dossier pédagogique, choix du
 * matériel, maquette, réparation) : un prompt par appel, chacun avec le strict contexte
 * dont il a besoin. Le choix du matériel voit la bibliothèque COMPLÈTE sous forme d'index
 * compact ; la maquette ne reçoit que le détail des appareils retenus.
 *
 * Module PUR : aucune dépendance réseau, aucune donnée personnelle d'élève.
 */
import type { SceneKind } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import { DIPLOMAS } from '@/lib/data/competences';
import type { PedagogieGeneree } from './schema';
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

Tu réponds uniquement en appelant l'outil qu'on te donne, en un seul appel.`;

/** Consigne système de l'appel 1 : le dossier pédagogique seul. */
export const SYSTEME_PEDAGOGIE = `${SYSTEME}

Cet appel ne porte QUE sur le dossier pédagogique : objectifs, matériel, activités, critères, quiz. Tu ne décris pas la platine appareil par appareil, elle sera construite à l'appel suivant. Va à l'essentiel : le professeur attend un dossier dense et court, pas un cours.`;

/** Consigne système de l'appel 2 : le choix du matériel dans la bibliothèque complète. */
export const SYSTEME_MATERIEL = `${SYSTEME}

Cet appel ne porte QUE sur le choix du matériel. On te donne la bibliothèque complète de l'atelier, une entrée par appareil : tu retiens ceux dont ce TP a besoin, avec leur repère. Tu ne poses rien, tu ne câbles rien, tu ne rédiges rien : la platine sera construite à l'appel suivant, à partir du seul matériel que tu auras retenu. Recopie les clés à l'identique : une clé approximative rend le TP injouable.`;

/** Consigne système de l'appel 3 : la maquette jouable seule. */
export const SYSTEME_MAQUETTE = `${SYSTEME}

Cet appel ne porte QUE sur la maquette jouable : appareils posés, liaisons, mesures, postes de choix, pannes, moteur. Le dossier pédagogique est déjà écrit, on t'en donne le résumé : la platine doit permettre d'exécuter chacune de ses consignes. Tu ne réécris pas le dossier.`;

/** Consigne système de l'appel 3 : la réparation ciblée. */
export const SYSTEME_REPARATION = `${SYSTEME}

Cet appel est une réparation. On te donne la maquette refusée et la liste des anomalies relevées par le moteur de simulation. Tu ne renvoies QUE les sections que tu corriges : chaque section renvoyée remplace intégralement l'ancienne, les sections que tu omets sont conservées. Corrige la cause, ne supprime pas simplement l'élément fautif quand il est indispensable au TP.`;

/**
 * Brief du professeur (aucune donnée personnelle d'élève ne doit y figurer).
 *
 * Seul le thème est obligatoire. Tout le reste peut être laissé vide : le modèle le
 * déduit du thème et le PROPOSE, le professeur le relit ensuite dans le studio.
 */
export interface Brief {
  diplomaId: DiplomaId;
  theme: string;
  resume: string;
  /** Durée totale de la séance, en minutes ; `null` = à proposer par le modèle. */
  duration: number | null;
  /** Nature de la séquence : « découverte », « entraînement », « évaluation »… */
  sequenceType: string;
  /** Compétences et activités du référentiel cochées par le professeur (vide = libre). */
  activities: string[];
  /** Matériel déclaré disponible à l'atelier (vide = toute la bibliothèque). */
  materielDisponible: string[];
  /** Type d'installation imposé ; `null` = à déduire du thème. */
  scene: SceneKind | null;
  /** Noms des documents joints (le contenu part en pièce jointe). */
  documents?: string[];
}

/** Durée retenue quand le professeur n'en a pas fixé : le modèle propose, on affiche ceci. */
export const DUREE_PAR_DEFAUT = 240;

const SCENE_LABEL: Record<SceneKind, string> = {
  ind: 'installation industrielle (armoire, départ moteur, commande)',
  hab: 'installation d’habitation (tableau de répartition, circuits terminaux)',
  ter: 'installation tertiaire (éclairage, commande, sécurité)',
  pv: 'installation photovoltaïque (production, stockage, raccordement réseau)',
};

/** Mention « à compléter » : le champ vide n'est jamais laissé vide, il est proposé. */
const ACOMPLETER = 'LIBRE — à déduire du thème et à proposer';

const liste = (titre: string, valeurs: string[]): string =>
  valeurs.length ? `${titre} : ${valeurs.join(' ; ')}` : `${titre} : ${ACOMPLETER}`;

/** Champs laissés vides par le professeur, en clair. */
export function champsLibres(brief: Brief): string[] {
  const out: string[] = [];
  if (!brief.activities.length) out.push('les compétences et activités du référentiel réellement mobilisées');
  if (!brief.materielDisponible.length) out.push('le matériel nécessaire');
  if (!brief.scene) out.push('le type d’installation (scène) et la colonne annexe qui va avec');
  if (brief.duration === null) out.push('la durée totale de la séance');
  if (!brief.resume.trim()) out.push('la situation professionnelle (contexte de l’intervention)');
  if (!brief.documents?.length) out.push('les caractéristiques techniques plausibles de l’équipement');
  return out;
}

/** Consigne de complétion : ce qui est libre doit être PROPOSÉ, jamais laissé vide. */
export function consigneCompletion(brief: Brief): string {
  const libres = champsLibres(brief);
  if (!libres.length) {
    return 'Le brief est complet : respecte-le à la lettre.';
  }
  return [
    'CE QUE LE PROFESSEUR A LAISSÉ LIBRE — tu dois le COMPLÉTER, pas le laisser vide :',
    ...libres.map((l) => `  - ${l}`),
    'Déduis chacun de ces éléments du thème et des pratiques d’atelier habituelles, puis propose-les ' +
    'explicitement. Ils seront RELUS ET CORRIGÉS PAR UN PROFESSEUR dans le studio avant d’aller devant ' +
    'les élèves : sois précis et cohérent, ne rends jamais une liste vide, ne demande rien en retour.',
  ].join('\n');
}

/** Rappel du brief, commun à tous les appels. */
export function rappelBrief(brief: Brief): string {
  const dip = DIPLOMAS.find((d) => d.id === brief.diplomaId);
  return [
    'BRIEF DU PROFESSEUR (seul le thème est imposé ; tout champ « LIBRE » est à compléter par toi)',
    `  Diplôme : ${dip?.name ?? brief.diplomaId}`,
    `  Thème : ${brief.theme}`,
    `  Attendu : ${brief.resume || ACOMPLETER}`,
    `  Type de séquence : ${brief.sequenceType || 'séance de travaux pratiques'}`,
    brief.duration === null
      ? `  Durée totale : ${ACOMPLETER} (propose une durée réaliste, puis répartis-la entre les activités)`
      : `  Durée totale : ${brief.duration} minutes (répartis-la entre les activités)`,
    brief.scene
      ? `  Type d’installation : ${SCENE_LABEL[brief.scene]}`
      : `  Type d’installation : ${ACOMPLETER} (industriel, habitat, tertiaire ou photovoltaïque)`,
    `  ${liste('Compétences et activités du référentiel demandées', brief.activities)}`,
    `  ${liste('Matériel disponible à l’atelier', brief.materielDisponible)}`,
    brief.documents?.length
      ? `  Dossier technique joint : ${brief.documents.join(', ')}`
      : `  Dossier technique joint : aucun (${ACOMPLETER.toLowerCase()})`,
  ].join('\n');
}

/** Appel 1 — prompt du dossier pédagogique : brief, documents joints, référentiel. */
export function construirePromptPedagogie(brief: Brief, referentiel: string): string {
  const duree = brief.duration ?? DUREE_PAR_DEFAUT;
  return [
    rappelBrief(brief),
    '',
    consigneCompletion(brief),
    '',
    brief.documents?.length
      ? 'Exploite le dossier technique joint (plaque signalétique, schéma, notice) pour les caractéristiques réelles.'
      : 'Aucun dossier technique n’est joint : appuie-toi sur les pratiques d’atelier habituelles pour ce thème.',
    '',
    referentiel,
    '',
    brief.activities.length
      ? 'Les compétences cochées par le professeur sont prioritaires : chaque critère doit s’y rattacher.'
      : 'Le professeur n’a coché aucune compétence : CHOISIS toi-même, dans le référentiel ci-dessus, ' +
        'celles que le thème mobilise vraiment, et rattache-leur les critères.',
    '',
    brief.duration === null
      ? 'Propose la durée totale dans le champ « duree » (une séance d’atelier réaliste), puis répartis-la entre 2 à 4 activités.'
      : `Vise 2 à 4 activités qui tiennent dans ${duree} minutes au total.`,
    '4 à 8 consignes par activité, 6 à 10 critères d’évaluation et 4 à 6 questions de quiz.',
    'Renseigne « scene », « annex » et « duree », et liste dans « deductions » tout ce que tu as choisi toi-même.',
    '',
    'Rends maintenant le dossier pédagogique en appelant l’outil « rediger_pedagogie ».',
  ].join('\n');
}

/**
 * Appel 2 — prompt du CHOIX DU MATÉRIEL : le modèle voit la bibliothèque complète
 * (index compact, une entrée par appareil) et n'en retient que ce qu'il lui faut.
 */
export function construirePromptMateriel(brief: Brief, resume: string, index: string): string {
  return [
    rappelBrief(brief),
    '',
    resume,
    '',
    index,
    '',
    brief.materielDisponible.length
      ? 'Le professeur a déclaré du matériel disponible : privilégie-le, complète seulement si le TP l’exige.'
      : 'Le professeur n’a rien coché : tu disposes de TOUTE la bibliothèque ci-dessus, sans restriction.',
    '',
    'Retiens le strict nécessaire pour rendre le TP jouable : protection en tête, appareils de puissance, ' +
    'appareils de commande, bornier X1 (puissance) et bornier X2 (commande) borne par borne, organes de porte ' +
    '(boutons, voyants) et récepteurs. Un appareil sans borne ne se câble pas : n’en prends que si le décor l’exige. ' +
    'Chaque clé doit être RECOPIÉE À L’IDENTIQUE depuis la bibliothèque ci-dessus ; donne à chacune son repère ' +
    '(Q1, KM1, F1, S1, H1, X1:1…). Compte une entrée de bornier par borne.',
    '',
    'Rends maintenant la liste du matériel en appelant l’outil « choisir_materiel ».',
  ].join('\n');
}

/**
 * Résumé COURT du dossier pédagogique pour l'appel maquette : titres et consignes des
 * activités, plus le matériel. Les corrections, les critères et le quiz restent au chaud :
 * la maquette n'en a pas besoin et le contexte doit rester léger.
 */
export function resumePedagogie(pedagogie: PedagogieGeneree, consignesMax = 8): string {
  const activites = pedagogie.activites.flatMap((a) => [
    `  ${a.titre} (${a.duree} min)`,
    ...a.consignes.slice(0, consignesMax).map((c) => `    - ${c}`),
  ]);
  return [
    'DOSSIER PÉDAGOGIQUE DÉJÀ RÉDIGÉ (résumé : titres et consignes des activités)',
    `  Objectifs : ${pedagogie.objectifs.join(' ; ') || 'non précisés'}`,
    ...(pedagogie.scene ? [`  Type d’installation retenu : ${SCENE_LABEL[pedagogie.scene]}`] : []),
    ...(pedagogie.duree ? [`  Durée retenue : ${pedagogie.duree} minutes`] : []),
    `  Matériel annoncé : ${pedagogie.materiel.join(' ; ') || 'non précisé'}`,
    '  Activités :',
    ...activites,
    '',
    'La platine doit permettre d’exécuter chacune de ces consignes : tout repère cité dans une ' +
    'consigne (Q1, KM1, X1:5, S1, H2…) doit exister dans « slots ».',
  ].join('\n');
}

/** Appel 3 — prompt de la maquette : brief, résumé du dossier, appareils retenus et géométrie. */
export function construirePromptMaquette(brief: Brief, contexte: string, resume: string): string {
  return [
    rappelBrief(brief),
    '',
    resume,
    '',
    contexte,
    '',
    'Le matériel est déjà choisi : pose ces appareils, tire les liaisons, place les mesures, ' +
    'construis les postes de choix et les pannes. N’invente aucune clé supplémentaire.',
    '',
    'Rends maintenant la maquette jouable en appelant l’outil « rediger_maquette ».',
  ].join('\n');
}

/** Extrait fautif à renvoyer au modèle avec les anomalies. */
export interface PortionFautive {
  chemin: string;
  extrait: string;
}

/**
 * Appel 3 — prompt de réparation : les anomalies en clair, les portions fautives et la
 * maquette refusée. On ne réécrit jamais à la place du modèle.
 */
export function construireRelance(
  anomalies: Anomalie[],
  portions: PortionFautive[],
  maquette?: string,
): string {
  const bloquantes = anomalies.filter((a) => a.gravite === 'bloquante');
  const avertissements = anomalies.filter((a) => a.gravite === 'avertissement');
  return [
    'Le moteur de simulation a refusé cette version du TP. Corrige-la en appelant l’outil ' +
    '« reparer_maquette » : ne renvoie que les sections que tu modifies.',
    '',
    ...(maquette ? ['MAQUETTE REFUSÉE :', maquette, ''] : []),
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
