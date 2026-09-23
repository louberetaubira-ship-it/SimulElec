/**
 * Sujet numérique « Chèvrerie — diversification d’une exploitation agricole »
 * (Bac Pro MELEC, 7 parties indépendantes, 125 questions, 5 h, 304 points).
 *
 * Copie conforme d'un sujet d'examen papier (voir `commun.ts` pour les conventions d'images et
 * d'anonymat). Les parties sont transcrites dans `partie-a.ts` … `partie-g.ts` ; ce fichier les
 * assemble et numérote les questions dans l'ordre du papier (`num` 1..125, clé technique ;
 * `label` = repère imprimé « A.1.1 »).
 *
 * Barème : le corrigé officiel ne donne que les totaux par partie (A 24 · B 51,5 · C 51 · D 24 ·
 * E 60 · F 41 · G 52,5) ; la répartition par question est celle de la transcription (commentée
 * en tête de chaque partie). Le professeur peut la modifier question par question.
 *
 * Sujets thématiques : `declinaisons` (une par partie), fabriqués par `src/lib/sujet/declinaisons.ts`.
 */
import type { DeclinaisonSujet, SujetNumerique, SujetQuestion } from '@/lib/sujet/types';
import { DTR, PAGES_SUJET } from './commun';
import { PARTIE_A, QUESTIONS_A } from './partie-a';
import { PARTIE_B, QUESTIONS_B } from './partie-b';
import { PARTIE_C, QUESTIONS_C } from './partie-c';
import { PARTIE_D, QUESTIONS_D } from './partie-d';
import { PARTIE_E, QUESTIONS_E } from './partie-e';
import { PARTIE_F, QUESTIONS_F } from './partie-f';
import { PARTIE_G, QUESTIONS_G } from './partie-g';

const PARTIES = [PARTIE_A, PARTIE_B, PARTIE_C, PARTIE_D, PARTIE_E, PARTIE_F, PARTIE_G];

const QUESTIONS: SujetQuestion[] = [
  ...QUESTIONS_A, ...QUESTIONS_B, ...QUESTIONS_C, ...QUESTIONS_D, ...QUESTIONS_E, ...QUESTIONS_F, ...QUESTIONS_G,
].map((q, i) => ({ ...q, num: i + 1 } as SujetQuestion));

/** Durée d'un sujet thématique : au prorata du barème (304 points ↔ 300 min), arrondie aux 5 min. */
const duree = (points: number) => Math.round((points / 304) * 300 / 5) * 5;

/**
 * Sujets thématiques : une partie = un sujet jouable seul.
 */
const DECLINAISONS: DeclinaisonSujet[] = [
  { id: 'chevrerie-incendie', theme: 'incendie', titre: 'Sécurité incendie (SSI type 4)', sousTitre: 'Mise en sécurité du magasin, de la zone de transformation et du SAS', parties: [1], dureeMin: duree(24) },
  { id: 'chevrerie-intrusion', theme: 'intrusion', titre: 'Alarme intrusion', sousTitre: 'Détection d’intrusion des locaux : centrale, détecteurs, sirène, transmetteur', parties: [2], dureeMin: duree(51.5) },
  { id: 'chevrerie-alimentation', theme: 'distribution', titre: 'Alimentation du hangar', sousTitre: 'Section, chute de tension et conduit de la ligne enterrée du hangar', parties: [3], dureeMin: duree(51) },
  { id: 'chevrerie-parafoudre', theme: 'distribution', titre: 'Choix du parafoudre', sousTitre: 'Protection de l’installation contre la foudre', parties: [4], dureeMin: duree(24) },
  { id: 'chevrerie-eolienne', theme: 'eolien', titre: 'Installation d’une éolienne', sousTitre: 'Génératrice, redresseur, onduleurs, production et rentabilité', parties: [5], dureeMin: duree(60) },
  { id: 'chevrerie-ecs', theme: 'ecs', titre: 'Eau chaude sanitaire & préparation des travaux', sousTitre: 'Chauffe-eau à accumulation ou thermodynamique, seuil de rentabilité, habilitations', parties: [6], dureeMin: duree(41) },
  { id: 'chevrerie-portail', theme: 'automatisme', titre: 'Le portail', sousTitre: 'Motorisation, cheminement des câbles, cellules, flash et commande GSM', parties: [7], dureeMin: duree(52.5) },
];

export const SUJET_CHEVRERIE: SujetNumerique = {
  id: 'chevrerie',
  nomCourt: 'Chèvrerie',
  titre: 'Chèvrerie — diversification d’une exploitation agricole',
  sousTitre: 'Sujet d’examen numérique · Bac Pro MELEC · 7 parties · 5 h',
  diploma: 'bacpro',
  dureeMin: 300,
  consignes: [
    'Durée : 5 heures.',
    'L’usage de calculatrice avec mode examen actif est autorisé ; l’usage de calculatrice sans mémoire, « type collège », est autorisé.',
    'L’usage de tout ouvrage de référence, de tout dictionnaire et de tout autre matériel électronique est rigoureusement interdit.',
    'Le sujet, composé de sept parties indépendantes, est accompagné d’un dossier technique et ressources dans lequel les documents sont repérés DTR.',
    'Le sujet est rendu complet, y compris les documents non complétés.',
    'Si vous repérez ce qui vous semble être une erreur d’énoncé, signalez-le lisiblement sur votre copie, proposez la correction et poursuivez l’épreuve en conséquence ; mentionnez explicitement toute hypothèse formulée.',
  ],
  problematique:
    'L’exploitation est une chèvrerie installée dans une commune de moyenne montagne. Face aux défis que rencontrent les agriculteurs (volatilité des marchés, changement climatique, attentes des consommateurs), elle diversifie ses activités : vente directe des produits de la ferme (magasin, fromagerie, laboratoire de transformation, valorisation du petit-lait par l’engraissement de cochons et la charcuterie) et accueil du public tous les jours (visites, randonnées avec les chèvres, biberonnage des chevreaux). Le site comprend le parking public, le magasin de vente, le laboratoire de transformation, la chèvrerie, la nouvelle nurserie, le hangar de stockage du fourrage et l’habitation principale (description du site, page 5 du sujet).\n'
    + 'Comment sécuriser, alimenter, équiper et rendre rentable les nouvelles installations de la chèvrerie ?',
  dtr: DTR,
  pagesSujet: PAGES_SUJET,
  parties: PARTIES,
  questions: QUESTIONS,
  themes: ['incendie', 'intrusion', 'distribution', 'eolien', 'ecs', 'automatisme', 'securite'],
  declinaisons: DECLINAISONS,
};
