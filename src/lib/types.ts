// ---------- Domain types shared by the simulator, the TP engine and the UI (v3) ----------

import type { DiplomaId } from './data/competences';

/**
 * Barème d'un TP : poids de chaque étape (points sur 100) et coût des gestes fautifs.
 * Le barème par défaut (`DEFAULT_BAREME`, voir `src/lib/sim/progress.ts`) reproduit
 * exactement la notation historique ; un TP peut le surcharger partiellement via
 * `tps.definition.bareme` (`TpDefinition.bareme`).
 */
export interface Bareme {
  /** Points attribués à chaque ligne de note (total 100 par défaut). */
  poids: {
    preparation: number; materiel: number; pose: number; cablage: number; tests: number; epi: number;
    hors: number; sous: number; diag: number; quiz: number;
  };
  /** Points retirés par erreur de pose. */
  coutErreurPose: number;
  /** Points retirés par liaison de câblage refusée. */
  coutErreurCablage: number;
  /** Points retirés par fil retiré (geste de correction). */
  coutFilRetire: number;
  /** Points retirés par réinitialisation du câblage. */
  coutReset: number;
  /** Plafond (points) de la pénalité des gestes de correction. */
  coutCorrectionMax: number;
  /** Pénalité (score 0..1 de l'étape) par ouverture d'un rappel de cours. */
  coutAide: number;
}

/** Surcharge partielle du barème par un TP. */
export type BaremeOverride = Partial<Omit<Bareme, 'poids'>> & { poids?: Partial<Bareme['poids']> };

/** Conducteurs : L1/L2/L3/N/PE, C = commande 24 V (+), C0 = 0 V commande, DC+/DC- = photovoltaïque. */
/**
 * Nature d'un conducteur. `BAR` désigne une BARRETTE de couplage de la plaque à bornes du
 * moteur : ce n'est pas un fil tiré dans l'armoire, mais un pont que l'élève pose lui-même
 * selon le couplage imposé par la plaque signalétique.
 */
export type NetKind = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'C' | 'C0' | 'DC+' | 'DC-' | 'BAR';

export type DeviceKind =
  | 'main' | 'mcb' | 'rcd' | 'motorcb' | 'contactor' | 'thermal'
  | 'meter' | 'bus' | 'terminal' | 'lamp' | 'button' | 'sign' | 'misc'
  | 'trafo' | 'plc' | 'pv' | 'inverter' | 'battery' | 'dc';

/** Type d'installation : détermine le visuel de la platine (couleurs, goulottes, annexe). */
export type SceneKind = 'ind' | 'hab' | 'ter' | 'pv';
/** Contenu de la colonne de droite. */
export type AnnexKind = 'door' | 'room' | 'local' | 'roof';

/** A terminal position, relative to the device box (fractions 0..1). */
export interface TerminalDef {
  id: string;        // ex: "1", "2", "A1", "13", "95", "DC+"
  fx: number;
  fy: number;
}

/** Catalogue entry = one photo sprite (or SVG component) + its electrical identity. */
export interface CatalogueItem {
  key: string;             // sprite key (public/sprites/<key>.png, <key>-on.png, <key>-off.png) or library key
  name: string;
  ref: string;
  brand?: string;
  kind: DeviceKind;
  family: string;
  modules: number;
  poles: number;
  In?: number;
  range?: [number, number];
  coil?: number;
  terminals: TerminalDef[];
  switchable: boolean;
  w: number;               // display width px (logical panel units, 560×720)
  h: number;
  /**
   * Dimensions RÉELLES de l'appareil, relevées sur la fiche technique du
   * constructeur. Ce sont elles qui font foi pour la taille du sprite :
   * `w = largeur × ÉCHELLE_PX_PAR_MM`, jamais le nombre de modules. Un appareil
   * de 45 mm fait 65 px qu'on le compte 2,5 modules ou non.
   *
   * `source` dit d'où vient la valeur, pour qu'on ne confonde jamais une cote
   * lue chez le constructeur avec une cote déduite ou estimée :
   *   · `fiche`   — lue sur la fiche technique du constructeur ;
   *   · `norme`   — déduite du pas modulaire normalisé (18 mm par module,
   *                 85 mm de hauteur pour un appareil modulaire) ;
   *   · `arelever`— pas encore relevée : l'audit d'échelle la signale.
   */
  dims?: { largeur: number; hauteur: number; profondeur?: number; source: 'fiche' | 'norme' | 'arelever' };
  /** Rendu par un composant SVG (trafo, plc, pv…) plutôt qu'un <img>. */
  svg?: boolean;
  /** Source image (data URI) pour les éléments de bibliothèque chargés dynamiquement. */
  src?: string;
  /** Borne étroite (16 px) : bornier. */
  small?: boolean;
  /** Se pose en annexe (porte / pièce / toiture) plutôt que sur un rail. */
  door?: boolean;
}

/** Élément de bibliothèque (public/lib/<famille>.json). */
export interface LibraryItem {
  key: string;
  name: string;
  w: number;
  h: number;
  src: string;
  terminals: TerminalDef[];
  small: boolean;
  door: boolean;
}
export interface LibraryFamily { family: string; file: string; count: number; keys: string[] }

export interface Slot {
  id: string;              // Q1, KM1, F1, x1_1, x2_3, … (identifiant technique)
  label: string;
  key: string;             // catalogue / library key
  rail: number | null;     // null = annexe (porte, pièce, toiture) ; 3 = annexe en atelier libre
  x: number;
  y?: number;              // annexe : position absolue
  w?: number;              // annexe : taille imposée
  h?: number;
  /**
   * Décalage vertical par rapport au centrage sur le rail. Un appareil modulaire
   * n'en a pas besoin : il est centré. Un appareil **book** (variateur, démarreur)
   * descend bien plus bas que haut ; sans ce décalage il remonterait dans la
   * goulotte qui longe son propre rail.
   */
  dy?: number;
  /** Repère affiché (Q1, KM1, T1, DDR1, PV1…). */
  rep?: string;
  /**
   * Bloc auxiliaire clipsé sur un autre appareil (LADN11 sur un contacteur,
   * bloc de contacts sur un bouton). Sur une vraie platine il ne porte pas de
   * repère à lui : il est marqué comme l'appareil qui le porte. Le slot existe
   * séparément parce que ses bornes se câblent, mais le repère est légitimement
   * en double — d'où cette déclaration, qui dit lequel il prolonge.
   */
  auxDe?: string;
  /** Repérage court affiché sous une borne de bornier (« 1 », « 2 »…). */
  mark?: string;
  /** Conducteur repéré sous le repère (« L1 », « N », « PE », « U »…). */
  sub?: string;
  /** Bornier d'appartenance (« X1 », « X2 »). */
  group?: string;
  groupLabel?: string;
}

/** A wire the student must realise. Both ends are "<slotId>.<terminalId>", "RES.L1", "M.U1", "S1.21", "H1.X1"… */
export interface Liaison {
  a: string;
  b: string;
  net: NetKind;
  prewired?: boolean;      // fait par l'installateur (réseau → X1, câble moteur…)
  door?: boolean;          // liaison en porte
}

/**
 * Variateur de vitesse. Ce que le moteur de simulation doit savoir d'un
 * convertisseur de fréquence pour ne pas le traiter comme un démarrage direct :
 * il n'y a **pas de pointe de démarrage** — le variateur démarre à fréquence
 * nulle et monte en rampe — et la vitesse atteinte est fixée par la fréquence
 * de consigne, pas par le réseau.
 */
export interface VariateurDef {
  /** Identifiant du slot du variateur (`u1`). */
  slot: string;
  /** Fréquence nominale du moteur, paramètre `FrS` (Hz). */
  frs: number;
  /** Petite vitesse, paramètre `LSP` (Hz). */
  lsp: number;
  /** Grande vitesse, paramètre `HSP` (Hz) : c'est la consigne de ce TP. */
  hsp: number;
  /** Rampe d'accélération, paramètre `ACC` (s de 0 à FrS). */
  acc: number;
  /** Rampe de décélération, paramètre `dEC` (s). */
  dec: number;
}

/**
 * Transformateur de commande à prises (ABL6TS…). Le rapport de transformation est
 * fixé par les spires : `U2 = Uprise_secondaire × Uréseau / Uprise_primaire`. Se
 * tromper de prise ne bloque rien au câblage — ça se paie à l'essai.
 * Voir `src/lib/sim/trafo.ts`.
 */
export interface TrafoDef {
  /** Identifiant du slot du transformateur (`t1`). */
  slot: string;
  /** Tension qui alimente le primaire (400 V entre deux phases, 230 V phase-neutre…). */
  reseau: number;
  /** Prises du primaire : borne → tension marquée dessus. */
  primaire: Record<string, number>;
  /** Prises du secondaire : borne → tension marquée dessus. */
  secondaire: Record<string, number>;
  /**
   * Secondaire BI-TENSION à deux enroulements et barrettes de couplage
   * (Legrand 042872 : deux enroulements de 24 V, bornes 0 · 0 · 24 · 24).
   * La tension obtenue ne se lit alors plus sur les prises : elle dépend des
   * BARRETTES que l'élève a posées — parallèle donne 24 V, série donne 48 V.
   * Déclarer ici chaque enroulement par ses deux bornes et sa tension ; les
   * prises restent déclarées dans `secondaire` pour le repérage.
   */
  enroulements?: { bornes: [string, string]; u: number }[];
  /** Bornes du secondaire sur lesquelles la commande est prise (sortie). */
  sortie?: [string, string];
  /** Tension assignée des récepteurs de commande (bobine du contacteur, voyant). */
  bobine: number;
}

/* ------------------------------------------------------------------ folio
 *
 * Un folio est un DESSIN : son tracé s'écrit, il ne se déduit pas d'un réseau.
 * Mais on n'écrit pas des coordonnées — on écrit l'ORDRE des organes sur chaque
 * colonne, et le moteur de mise en page (`src/lib/schema/folio.ts`) place les y.
 * Un TP se décrit ainsi en une trentaine de lignes lisibles, et un déplacement
 * d'organe ne demande pas de recalculer tout le reste.
 *
 * L'état de chaque contact n'est PAS déclaré ici : il se lit dans le réseau de
 * `commande.ts`. Un contact que la panne a ouvert disparaît du réseau, et le
 * folio le dessine ouvert. Une seule vérité, donc aucun risque que le schéma
 * affiche autre chose que ce que mesure l'élève.
 */

/** Actionneur qui manœuvre un contact — c'est lui qui identifie l'appareil. */
export type ActionneurFolio = 'bilame' | 'came' | 'galet' | 'champignon' | 'poussoir';

/** Un organe posé sur une colonne du folio, de haut en bas. */
export interface FolioElement {
  type: 'contactNF' | 'contactNO' | 'bobine' | 'voyant' | 'disjoncteur' | 'borne' | 'fil'
    | 'entreeAPI' | 'sortieAPI';
  /** Nœud du réseau en entrée (haut). */
  a: string;
  /** Nœud en sortie (bas). Absent pour une borne, qui est un point unique. */
  b?: string;
  /** Repère gravé sur l'appareil. */
  rep?: string;
  /** Numéros des deux bornes du contact (« 95 » / « 96 »). */
  bornes?: [string, string];
  actionneur?: ActionneurFolio;
  /** Fonction de l'organe, écrite sous son repère. */
  legende?: string;
  /** Repère équipotentiel du conducteur qui SORT de cet organe. */
  conducteur?: string;
  /** Hauteur réservée, quand la valeur par défaut du type ne convient pas. */
  h?: number;
  /**
   * Borne commune d'une sortie d'automate (« COM0 »). Une sortie relais ne fait
   * rien si SON commun n'est pas alimenté, et les communs d'un M221 ne sont pas
   * reliés entre eux : le folio doit donc dire de quel commun chaque voie dépend.
   */
  commun?: string;
}

/** Une colonne du folio : la chaîne principale, ou une dérivation. */
export interface FolioColonne {
  id: string;
  /** Décalage horizontal en unités de colonne (0 = chaîne principale). */
  dx: number;
  /** Nœud d'où part la dérivation (absent : elle part du rail du haut). */
  depuis?: string;
  /** Nœud où elle rejoint (absent : elle rejoint le rail du bas). */
  vers?: string;
  elements: FolioElement[];
}

/** Cadre d'implantation : ce qui n'est pas dans l'armoire. */
export interface FolioCadre {
  titre: string;
  /** Premier et dernier organe enfermés, par leur nœud d'entrée. */
  de: string;
  a: string;
  /** Colonnes que le cadre englobe. Absent : la seule chaîne principale. */
  colonnes?: string[];
  /** Teinte : le capot de la machine, ou la porte de l'armoire. */
  couleur: 'capot' | 'porte';
}

/** Folio du circuit de commande d'un TP. */
export interface FolioDef {
  /** Intitulés des deux rails. */
  railHaut: string;
  railBas: string;
  /** Organe placé au-dessus du rail du haut (la protection du secondaire). */
  tete?: FolioElement;
  /**
   * Organe placé SOUS le rail du bas, sur le conducteur de retour. C'est là que
   * se dessine le pôle neutre d'une protection phase + neutre : un appareil 1P+N
   * coupe les DEUX conducteurs de la commande, et le folio doit le montrer —
   * sinon l'élève croit que le 0 V reste raccordé au secondaire quoi qu'il arrive.
   */
  pied?: FolioElement;
  /** Nœud d'arrivée du secondaire, au sommet, et son repère lisible. */
  source: string;
  repSource: string;
  /** Nœud de retour, sur le rail du bas, et son repère. */
  retour: string;
  repRetour: string;
  colonnes: FolioColonne[];
  cadres?: FolioCadre[];
}

/**
 * Une question de l'étape de PRÉPARATION.
 *
 * Avant de poser le premier appareil, l'élève doit savoir lire le dossier :
 * reconnaître les organes du schéma sous leur repère, et dire ce que chacun
 * fait. Ce sont deux gestes distincts — identifier n'est pas comprendre — d'où
 * les deux listes de `PreparationDef`.
 *
 * `why` n'est pas un corrigé caché : il s'affiche dès que l'élève a répondu,
 * juste ou faux, comme le `why` d'une option de l'étape matériel.
 */
export interface PrepQuestion {
  id: string;
  /** Ce qu'on demande : « À quoi correspond le repère Q1 ? », « Rôle du sectionneur ? ». */
  invite: string;
  /** Repère ou organe concerné, affiché en tête de la question. */
  rep?: string;
  options: string[];
  answer: number;
  why: string;
  /**
   * Repère à mettre en évidence sur le schéma pendant qu'on répond. Sans lui,
   * l'élève devrait deviner de quel organe on parle.
   */
  focus?: string;
  /** Schéma sur lequel chercher : la puissance ou la commande. */
  schema?: 'puissance' | 'commande';
}

/**
 * Un organe de la partie PUISSANCE, du réseau vers le récepteur.
 *
 * Le schéma ne porte aucune coordonnée : le TP déclare l'ORDRE des organes, le
 * tracé s'en déduit — même principe que le folio de commande.
 */
export interface PuissanceOrgane {
  type: 'sectionneur' | 'contacteur' | 'thermique' | 'bornier' | 'disjoncteur';
  /** Repère gravé, celui que l'élève doit reconnaître. */
  rep: string;
  legende?: string;
  /** Numéros des deux bornes de chaque phase, dans l'ordre des phases. */
  bornes?: [string, string][];
  /**
   * Second appareil d'un contacteur-INVERSEUR : deux corps identiques dont deux
   * phases sont croisées à l'amont. C'est ce croisement qui inverse le sens de
   * rotation — il se dessine, il ne se décrète pas.
   */
  paire?: { rep: string; legende?: string; bornes?: [string, string][] };
}

/** Partie puissance d'un TP, dessinée à l'étape de préparation. */
export interface PuissanceDef {
  /** Conducteurs dessinés, de gauche à droite. */
  phases: string[];
  /** Libellé du réseau, écrit au-dessus du rail. */
  reseau?: string;
  organes: PuissanceOrgane[];
  moteur?: { rep: string; legende?: string };
}

/** Les deux temps de la préparation : identifier, puis donner la fonction. */
export interface PreparationDef {
  /** Identifier les éléments du schéma sous leur repère. */
  identification: PrepQuestion[];
  /** Donner la fonction de chaque équipement. */
  fonctions: PrepQuestion[];
}

export interface PosteOption { ref: string; spec: string; ok?: boolean; half?: boolean; why: string; key: string; /** Photo propre à cette référence (sinon : sprite/dessin de `key`). */ img?: string }
export interface Poste { id: string; name: string; need: string; options: PosteOption[] }

export interface TestHorsTension { id: string; title: string; how: string; expected: string }

/** Instrument utilisable à l'étape mesures. */
export type InstrumentKind = 'mm' | 'clamp' | 'ctrl' | 'vat' | 'tach';

/** Mesure attendue dans une étape (hors ou sous tension). */
export interface ExpectedMeasure {
  id: string;
  title: string;
  stage: 'horsTension' | 'sousTension';
  instrument: InstrumentKind;
  /** Position du sélecteur attendue (« V~ », « Ω », « RISO 500 V », « A~ »…). */
  dial: string;
  /** Bornes attendues (ordre indifférent) ; pour la pince : identifiant de liaison « a>b ». */
  a?: string;
  b?: string;
  wire?: string;
  min: number;
  max: number;
  unit: string;
  /** Condition : moteur en marche, commande sous tension… */
  when?: 'run' | 'ctl' | 'off';
}

/**
 * Panne injectable par le professeur.
 *
 * `coupe` et `ouvre` disent ce que la panne fait AU RÉSEAU, pas seulement à
 * l'élève : sans eux, le simulateur ne pourrait que raconter le symptôme, et la
 * mesure ne servirait à rien. Avec eux, le solveur du circuit de commande
 * (`src/lib/sim/commande.ts`) rend ce qu'un appareil rendrait vraiment sur une
 * platine en panne — et l'élève doit chercher.
 */
export interface Fault {
  id: string;
  title: string;
  symptom: string;
  fix: string;
  /** Liaison supprimée du réseau, sous la forme « borne>borne » (ordre indifférent). */
  coupe?: string;
  /** Organe dont le contact reste ouvert : identifiant de slot (`f3`) ou repère de pupitre (`S1`). */
  ouvre?: string;
  /** Action de remise en état attendue, proposée à l'élève parmi d'autres. */
  action?: string;
}

/**
 * Lecture annoncée AVANT la mesure.
 *
 * Définir la vérification avant de la faire — quoi, comment, où, et surtout
 * quel résultat on attend — est ce qui sépare le diagnostic du tâtonnement.
 * Le simulateur confronte ensuite la prévision au relevé.
 */
export type Prevision = '24' | '0' | 'cont' | 'ol';

/** Un test d'hypothèse : la vérification définie, faite, et ce qu'elle a tranché. */
export interface HypTest {
  /** Hypothèse visée (identifiant de panne). */
  id: string;
  instrument: InstrumentKind;
  dial: string;
  a?: string;
  b?: string;
  /** Prévision annoncée avant de mesurer. */
  attendu: Prevision;
  /** Ce que l'appareil a affiché. */
  lu: string;
  value: number | null;
  /** Verdict retenu — celui que la mesure impose, pas celui que l'élève espérait. */
  verdict: 'out' | 'keep';
  /** L'élève avait-il prévu juste ? */
  prevu: boolean;
  /** Nombre d'hypothèses que cette mesure départage (une bonne en sépare plusieurs). */
  departage: number;
  at: string;
}

/** Réseau électrique d'une borne, pour le calcul des mesures (voir lib/sim/mesures.ts). */
export interface TerminalNet {
  /**
   * `TAP` désigne une PRISE INUTILISÉE d'un appareil à plusieurs prises (primaire 230 V d'un
   * transformateur alimenté en 400 V, secondaire 48 V d'une commande en 24 V). Elle n'est
   * équipotentielle à rien d'autre : la déclarer sur le 0 V ou le PE la rendrait
   * silencieusement reliée à la terre, et une faute de câblage dessus passerait inaperçue.
   */
  net: NetKind | 'U' | 'V' | 'W' | 'M2' | 'M' | 'I0' | 'I1' | 'I2' | 'Q0' | 'Q1' | 'Q2'
    | 'TAP-PRI-230' | 'TAP-SEC-48'
    // Réseaux propres au variateur de vitesse. L'entrée réseau du variateur
    // (VAR1-3) n'est PAS le même potentiel que sa sortie moteur (U V W) : entre
    // les deux il y a un redresseur, un bus continu et un onduleur. Et son 24 V
    // interne (P24 / P0) est une source distincte de celle du transformateur de
    // commande : les mettre en commun, c'est relier deux alimentations.
    | 'VAR1' | 'VAR2' | 'VAR3' | 'BUS+' | 'BUS-'
    | 'P24' | 'P0' | 'LI1' | 'LI2' | 'AI1' | 'RES-X2';
  /**
   * Condition de présence de tension.
   * 'q2' = SOURCE INDÉPENDANTE en aval du sectionneur f2 SEUL (champ PV : vif dès que
   * Q2 est fermé, que Q1 le soit ou non). À distinguer de 'f2' (aval de q1 ET f2, modèle
   * moteur où f2 est une protection en aval du sectionneur général).
   */
  live: 'always' | 'q1' | 'q2' | 'q3' | 'ctl' | 'run' | 'f2' | 'f3' | 'km1' | 'off';
}

/**
 * Élément d'annexe (pièce / local / toiture) ou du bloc récepteurs.
 * - dans `annexItems` : x / y absolus dans la scène (colonne de droite) ;
 * - dans `recvItems` : x / y relatifs au bloc récepteurs (voir `recvBox`), et `recv: true`.
 */
export interface AnnexItem {
  key: string; rep: string; name: string; x: number; y: number; w: number; h: number;
  /** Récepteur du bloc du bas : bornes sur le bord haut, cheminement par la goulotte 4 et un presse-étoupe. */
  recv?: boolean;
}

/**
 * Organe du coffret de porte (pupitre) : voyant ou bouton.
 * L'ordre de la liste est l'ordre de haut en bas sur le coffret ; les bornes
 * en découlent (`H1.X1` / `H1.X2`, `S4.13` / `S4.14`, `S3.21` / `S3.22`).
 */
export interface PupitreItem {
  /** Repère gravé : « H1 », « S4 »… Préfixe des bornes : 'S4.13' / 'S4.14', 'H1.X1' / 'H1.X2'. */
  rep: string;
  /** Voyant, bouton à contact NO (marche) ou bouton à contact NC (arrêt). */
  kind: 'lamp' | 'no' | 'nc';
  /** Couleur de la tête ou du voyant. */
  color: 'green' | 'red' | 'clear' | 'yellow' | 'white';
  /** Voyants seulement : ce que le voyant signale. */
  signals?: 'run' | 'ctl' | 'trip';
  /** Boutons NC seulement : coup de poing à verrouillage, à déverrouiller avant de redémarrer. */
  latching?: boolean;
  /** Libellé lisible, affiché en légende et dans l'aide. */
  label: string;
}

/**
 * Interrupteur de position (contact commandé par un carter, un écran de protection,
 * une trappe…). Il n'est pas sur le pupitre : il est câblé dans la chaîne d'arrêt,
 * entre deux bornes du bornier. Carter ouvert = commande coupée, comme un arrêt.
 */
export interface InterPosition {
  /** Repère de l'appareil : « S1 ». */
  rep: string;
  /** Libellé lisible : « interrupteur de position de l'écran de protection ». */
  label: string;
  /** Ce que commande le contact, à afficher à l'élève : « écran de protection en place ». */
  etat: string;
}

/**
 * Nature du parcours :
 * - `platine` (défaut) : les 11 étapes de câblage / mesures sur la platine ;
 * - `dimensionnement` : étude et dimensionnement (aucune platine, aucun câblage).
 */
export type TpKind = 'platine' | 'dimensionnement';

export interface TpDefinition {
  id: string;
  title: string;
  level: string;
  family: 'ind' | 'hab' | 'ter' | 'pv';
  /** Type de parcours ; absent = `'platine'`. */
  kind?: TpKind;
  scene: SceneKind;
  annex: AnnexKind;
  /** Jouable de bout en bout (liaisons + mesures définies). Sinon affiché « prévu ». */
  playable: boolean;
  competences: string[];
  summary: string;
  situation: string;
  plaque: Record<string, string>;
  cahierDesCharges: { k: string; v: string }[];
  /** Préparation (activité A1) : identification des organes et fonction de chacun. */
  preparation?: PreparationDef;
  /** Schéma de la partie puissance, dessiné à l'étape de préparation. */
  puissance?: PuissanceDef;
  postes: Poste[];
  rails: number[];               // y de chaque rail (unités logiques, 560×920)
  slots: Slot[];
  /** Éléments posés en annexe (pièce, local, toiture). Vide pour 'door' (station dessinée en code). */
  annexItems: AnnexItem[];
  /** Récepteurs du bloc sous la platine (hublot, chauffe-eau, VMC, réglettes, BAES, convecteur…). */
  recvItems?: AnnexItem[];
  liaisons: Liaison[];
  /** Table borne → réseau pour les mesures. Clé « slot.borne » ; les préfixes RES/M/S1/S2/H1/H2 sont gérés en code. */
  nets: Record<string, TerminalNet>;
  tests: TestHorsTension[];
  mesures: ExpectedMeasure[];
  faults: Fault[];
  quiz: { q: string; options: string[]; answer: number }[];
  motor: { P: number; U: number; In: number; n: number; ns: number; cosPhi: number } | null;
  /** Automate : affectation des E/S (TP M221). */
  plcIo?: { io: string; label: string; device: string }[];
  station: boolean;
  /**
   * Composition du coffret de porte, de haut en bas. Absent = pupitre historique
   * (H1 marche · H2 défaut · S2 marche · S1 arrêt), voir `DEFAULT_PUPITRE`.
   */
  pupitre?: PupitreItem[];
  /** Interrupteur de position câblé dans la chaîne d'arrêt (carter, écran de protection). */
  interPosition?: InterPosition;
  /** Transformateur de commande à prises : permet de simuler l'erreur de prise. */
  trafo?: TrafoDef;
  /** Variateur de vitesse : supprime la pointe de démarrage et impose la rampe. */
  variateur?: VariateurDef;
  /**
   * Hauteur de l'armoire, en unités de platine. 720 par défaut — la platine
   * d'origine. Un TP la relève quand un appareil ne tient pas autrement : un
   * variateur format book fait 471 px à l'échelle, et il lui faut de la place
   * sans quoi il faudrait le dessiner plus petit qu'il n'est.
   */
  armoire?: number;
  /**
   * Arrivée réseau (presse-étoupes L/N/PE en bas d'armoire + libellé « arrivée
   * réseau »). `false` pour une installation AUTONOME (off-grid) : il n'y a pas
   * de raccordement au réseau, l'énergie vient du champ PV et du parc batterie.
   */
  arriveeReseau?: boolean;
  /** Folio du circuit de commande, dessiné à l'étape de dépannage. */
  folio?: FolioDef;
  /**
   * Hypothèses PLAUSIBLES MAIS FAUSSES, proposées à l'élève au milieu des vraies
   * pannes à l'étape de dépannage. Elles rendent l'élimination plus formatrice —
   * écarter une piste crédible vaut mieux que cocher la seule qui reste. Aucune
   * n'est déclarée pour l'instant ; le champ est là pour le jour où on en écrit.
   */
  leurres?: { id: string; titre: string; pourquoiFaux: string }[];
  hasMotor: boolean;
  /** Diplômes visés par le TP (colonne `tps.diplomas` / bloc studio). */
  diplomas?: DiplomaId[];
  /** Barème propre au TP (surcharge partielle de `DEFAULT_BAREME`). */
  bareme?: BaremeOverride;
  /**
   * Bornes du VAT de consignation, paramétrées par le TP. Absent = comportement
   * moteur historique (source connue `RES.L1/RES.N`, trois paires en aval de Q1).
   */
  consignationVat?: {
    /**
     * Paire de bornes d'une source de tension CONNUE, prouvant que le VAT
     * fonctionne. `null` : pas de source à contrôler (installation autonome).
     */
    sourceConnue?: [string, string] | null;
    /** Paires de bornes en AVAL de l'appareil consigné, à contrôler en absence de tension. */
    avalPairs?: [string, string][];
    /**
     * Slot d'une SECONDE source d'énergie INDÉPENDANTE, qu'ouvrir Q1 ne coupe pas
     * (ex. le sectionneur du champ PV `f2` : les modules produisent tant qu'il fait
     * jour). Présent = double coupure : la séparation exige d'ouvrir Q1 ET cette
     * source, le champ ne « retombe » pas avec Q1, et son absence de tension doit
     * être contrôlée séparément (via une paire d'`avalPairs` côté champ).
     */
    champ?: string;
  };
}

/** Lecture d'instrument persistée. */
export interface ReadingRecord {
  instrument: InstrumentKind;
  dial: string;
  a?: string;
  b?: string;
  wire?: string;
  value: number | null;
  display: string;
  stage: number;
  at: string;
  /** Identifiant de la mesure attendue validée, s'il y en a une. */
  expectedId?: string;
}

/**
 * Mode de passage d'un TP.
 * - `entrainement` : aide illimitée, reprises libres, pas de chronomètre, note indicative ;
 * - `evaluation` : aide comptée et limitée, chronomètre affiché, une seule tentative, note retenue.
 */
export type EvaluationMode = 'entrainement' | 'evaluation';

/** Auto-évaluation de l'élève : code de compétence → niveau qu'il se donne. */
export type AutoEval = Record<string, 'acquis' | 'enCours' | 'nonAcquis'>;

/** Student progress persisted in attempts.state (JSON). */
export interface AttemptState {
  stage: number;
  done: Record<number, boolean>;
  /** Réponses de l'étape de préparation : identifiant de question → index choisi. */
  prep: Record<string, number>;
  choices: Record<string, number>;
  placed: Record<string, boolean>;
  wires: { a: string; b: string; net: NetKind }[];
  wireErrors: number;
  poseErrors: number;
  tests: Record<string, string>;
  /** EPI cochés. */
  epi: Record<string, boolean>;
  /** Consignation : séparation, condamnation, identification, VAT sur source, VAT aval (paires), re-vérification. */
  cons: { sep: boolean; lock: boolean; ident: boolean; vatRef: boolean; vat: [string, string][]; vatRef2: boolean };
  decons: { unlock: boolean; close: boolean; essai: boolean };
  /**
   * Sécurité des mesures sous tension (NF C 18-510) : EPI/EIS choisis et
   * contrôles d'état confirmés. Tant que l'équipement n'est pas bon, la mesure
   * sous tension est bloquée.
   */
  secu: { equip: Record<string, boolean>; checks: Record<string, boolean> };
  readings: ReadingRecord[];
  fault: string | null;
  /**
   * Hypothèses posées par l'élève à l'étape de dépannage. Il les pose AVANT de
   * mesurer : c'est ce qui oriente ses vérifications, et ce que le rapport montre
   * au professeur à la place d'un simple « trouvé en n essais ».
   */
  hypotheses: string[];
  /** Journal des tests d'hypothèse : la trace du raisonnement. */
  hypTests: HypTest[];
  /** Cause retenue par l'élève (identifiant de panne). */
  diagnosis: string | null;
  /**
   * Action de remise en état retenue par l'élève. Trouver la cause ne suffit pas :
   * un dépannage se termine par une intervention, et c'est le couple cause +
   * remède qui est jugé.
   */
  remede: string | null;
  diagTries: number;
  fixed: boolean;
  quiz: number | null;
  /** Nombre d'ouvertures de l'aide « rappel de cours », par étape (pèse sur l'évaluation). */
  helpUsed: Record<number, number>;
  /**
   * Fils retirés par l'élève depuis le début de la tentative (geste de correction).
   * Ajouté après coup : les tentatives déjà en base valent 0 (voir `normalizeState`).
   */
  wiresRemoved: number;
  /** Réinitialisations de câblage demandées (étape ou platine entière). */
  resets: number;
  /**
   * Mode choisi au lancement du TP. Absent = non encore choisi (l'élève choisit) ;
   * les tentatives enregistrées avant cette évolution sont relues en « entraînement »
   * (valeur sûre : aucune contrainte rétroactive) — voir `normalizeState`.
   */
  mode?: EvaluationMode;
  /** Mode imposé par le professeur au moment d'affecter le TP (l'élève ne peut pas en changer). */
  modeImpose?: boolean;
  /** Horodatage ISO du début de la tentative (chronomètre du mode évaluation). */
  startedAt?: string;
  /** Auto-évaluation faite par l'élève avant l'affichage du bilan. */
  autoEval?: AutoEval;
  /** L'auto-évaluation a été validée par l'élève. */
  autoEvalDone?: boolean;
}

/** Montage de l'atelier libre (table projects.data). */
export interface FreeProject {
  scene: SceneKind;
  slots: (Slot & { w: number; h: number; y: number })[];
  wires: { a: string; b: string; net: NetKind }[];
}
