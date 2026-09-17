/**
 * Professeur virtuel — logique d'intervention du coach (pure, sans React).
 *
 * L'avatar apparaît quand l'élève répète des erreurs ou reste bloqué. Il motive,
 * guide par des questions, mais NE DONNE JAMAIS la réponse : l'escalade va de
 * l'orientation d'attention à la méthode, jamais à la solution.
 *
 * Conception validée (répartition des seuils) :
 *   2 erreurs  → réflexion (regard, sans bulle)
 *   3 erreurs  → indice niveau 1 (orienter l'attention)
 *   4 erreurs  → indice niveau 2 (question ciblée)
 *   5 erreurs  → méthode niveau 3 (+ réconfort)
 *   6+         → plafond : reformuler, renvoyer au cours / au professeur réel
 */
import { ETAPE } from '@/lib/sim/progress';

export type CoachState =
  | 'idle' | 'encourage' | 'think' | 'guide' | 'comfort' | 'celebrate' | 'safety';

export interface CoachMsg {
  state: CoachState;
  /** Texte de la bulle (vide = état visuel seul, sans bulle). */
  text: string;
  /** Étiquette de niveau affichée au-dessus de la bulle. */
  level?: string;
  /** Le plafond invite à ouvrir le cours / le professeur réel. */
  plafond?: boolean;
}

/* Seuils (exposables en configuration plus tard). */
export const COACH = {
  ERR_LOOK: 2, ERR_HINT1: 3, ERR_HINT2: 4, ERR_HINT3: 5,
  IDLE_HINT_MS: 90_000, COOLDOWN_MS: 60_000, MUTE_MS: 300_000,
} as const;

/** Banque d'indices par étape : [niveau 1, niveau 2, niveau 3]. */
function hints(stage: number, q1: string): [string, string, string] {
  switch (stage) {
    case ETAPE.CABLAGE:
      return [
        `Reprends le trajet du courant depuis ${q1}. Où est-ce qu'il s'arrête ?`,
        `Ce contact : ouvert ou fermé au repos ? Et toi, tu le veux comment pour que ça démarre ?`,
        `Méthode : 1) repère la source, 2) suis le fil jusqu'au premier point ouvert, 3) demande-toi pourquoi. Vas-y, étape 1.`,
      ];
    case ETAPE.POSE:
      return [
        `Regarde le repère de chaque appareil et sa place sur la platine. Lequel ne colle pas ?`,
        `Ordre de la puissance : sectionneur → contacteur → thermique → moteur. Où est l'écart ?`,
        `Méthode : place d'abord la tête (le sectionneur), puis descends vers le moteur, un appareil à la fois.`,
      ];
    case ETAPE.VALIDATION:
      return [
        `Tu ne peux pas éliminer une hypothèse sans mesure. Où poser tes pointes pour trancher ?`,
        `Quelle grandeur sépare tes deux hypothèses : une tension présente, une continuité ?`,
        `Méthode : pour chaque hypothèse, écris la mesure qui la confirme ou l'élimine — puis fais-la.`,
      ];
    case ETAPE.HORS:
    case ETAPE.SOUS:
      return [
        `Quelle grandeur veux-tu lire, et entre quelles bornes exactement ?`,
        `Ton appareil est-il sur le bon calibre pour cette mesure ? Vérifie avant de lire.`,
        `Méthode : 1) choisis la grandeur, 2) place les deux pointes aux bornes indiquées, 3) lis, puis note.`,
      ];
    default:
      return [
        `Relis la consigne de l'étape : qu'est-ce qui est demandé, exactement ?`,
        `Décompose : quelle est la toute première action à faire ici ?`,
        `On reprend calmement. Quelle est la première chose à vérifier ?`,
      ];
  }
}

/**
 * Décide l'intervention pour un nombre d'erreurs répétées sur le point courant.
 * Renvoie null tant qu'il ne faut rien dire (0-1 erreur).
 */
export function coachForErrors(stage: number, streak: number, q1: string): CoachMsg | null {
  if (streak <= 1) return null;
  if (streak === COACH.ERR_LOOK) return { state: 'think', text: '' };
  const [h1, h2, h3] = hints(stage, q1);
  if (streak === COACH.ERR_HINT1) return { state: 'guide', text: h1, level: 'Indice · niveau 1' };
  if (streak === COACH.ERR_HINT2) return { state: 'guide', text: h2, level: 'Indice · niveau 2' };
  if (streak === COACH.ERR_HINT3) return { state: 'comfort', text: h3, level: 'Méthode · niveau 3' };
  return {
    state: 'comfort',
    text: 'On revoit la ressource de cours de cette étape ? Et si ça coince encore, lève la main : on regarde ça ensemble.',
    level: 'On ne lâche pas la réponse',
    plafond: true,
  };
}

/** Relance d'inactivité (l'élève ne fait plus rien depuis un moment). */
export const IDLE_MSG: CoachMsg = {
  state: 'comfort',
  text: 'Tu cherches quoi, là ? Dis-moi juste sur quoi tu bloques.',
  level: 'Un coup de main ?',
};

/** Petite félicitation quand l'élève débloque une étape après avoir galéré. */
export const WIN_MSG: CoachMsg = {
  state: 'celebrate',
  text: 'Voilà. Tu l\'as débloqué toi-même — c\'est ça qui compte.',
};

/** Compteur d'erreurs pertinent selon l'étape (null si l'étape n'en a pas). */
export function errorCountFor(stage: number, st: { poseErrors: number; wireErrors: number; diagTries: number }): number | null {
  switch (stage) {
    case ETAPE.POSE: return st.poseErrors;
    case ETAPE.CABLAGE: return st.wireErrors;
    case ETAPE.VALIDATION: return st.diagTries;
    default: return null;
  }
}
