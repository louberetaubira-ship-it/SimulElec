/**
 * Taxonomie des TP par DOMAINE PROFESSIONNEL — source unique.
 *
 * Module pur (ni React ni Node) : il s'importe aussi bien côté serveur (générateur,
 * pages serveur) que côté client (catalogue, studio, suivi).
 *
 * Quatre niveaux :
 * 1. le domaine professionnel (11 codes : HAB, TER, IND…) — obligatoire pour publier ;
 * 2. le sous-domaine, pris dans une liste FERMÉE propre au domaine (`IND.demarrage`) ;
 * 3. les activités du référentiel (préparation, réalisation, mise en service,
 *    maintenance, communication), déduites du TP et modifiables par le professeur ;
 * 4. diplômes, niveau et compétences — déjà portés par le TP (`tps.diplomas`, `level`,
 *    `competences`), ils ne sont pas dupliqués ici.
 *
 * À ne pas confondre avec le type `Domain` de `src/lib/data/competences.ts` (analyse,
 * pose, câblage…) : ce sont des domaines d'ACTIVITÉ qui mènent aux compétences. Le
 * domaine professionnel s'appelle ici `DomainePro`.
 *
 * « Mesures & maintenance » n'est pas un domaine : c'est une activité.
 */

/** Code d'un domaine professionnel. */
export type DomainePro = 'HAB' | 'TER' | 'IND' | 'DOM' | 'ENR' | 'RES' | 'INF' | 'SEC' | 'COM' | 'CVC' | 'EAU';

/** Activité du référentiel. */
export type ActivitePro = 'preparation' | 'realisation' | 'mise_en_service' | 'maintenance' | 'communication';

/** Scène (et `family` du TP) : pilote la platine et l'annexe dessinées. */
export type SceneDomaine = 'ind' | 'hab' | 'ter' | 'pv';

/** Sous-domaine : `id` = `${code}.${slug}`, par exemple `IND.demarrage`. */
export interface SousDomaine { id: string; label: string }

export interface DomaineDef {
  code: DomainePro;
  /** Libellé complet (« Industrie et systèmes automatisés »). */
  label: string;
  /** Libellé court, pour les puces et les badges (« Industrie »). */
  court: string;
  description: string;
  /** Couleur du domaine (hex, thème clair). */
  couleur: string;
  /** Scène par défaut d'un TP du domaine — et donc sa `family` par défaut. */
  scene: SceneDomaine;
  sous: SousDomaine[];
}

/** Classement d'un TP. Tous les champs sont toujours présents (tableaux vides, `null`). */
export interface Classement {
  /** Domaine principal : obligatoire pour publier, `null` tant qu'il n'est pas choisi. */
  domaine: DomainePro | null;
  /** Domaines secondaires (sans le principal). */
  domainesSecondaires: DomainePro[];
  /** Identifiant d'un sous-domaine du domaine principal (`IND.demarrage`), ou `null`. */
  sousDomaine: string | null;
  /** Activités travaillées, dans l'ordre de `ACTIVITES`. */
  activites: ActivitePro[];
  /** Mots-clés libres (recherche du catalogue). */
  motsCles: string[];
}

/** Construit la liste des sous-domaines d'un code : `[slug, libellé]` → `{ id, label }`. */
const sd = (code: DomainePro, liste: [string, string][]): SousDomaine[] =>
  liste.map(([slug, label]) => ({ id: `${code}.${slug}`, label }));

/** Les 11 domaines, dans l'ordre d'affichage. */
export const DOMAINES: DomaineDef[] = [
  {
    code: 'HAB',
    label: 'Habitat et installations résidentielles',
    court: 'Habitat',
    description: 'Logements individuels et collectifs : tableaux, circuits, protections, chauffage et ventilation.',
    couleur: '#2F80ED',
    scene: 'hab',
    sous: sd('HAB', [
      ['eclairage', 'Éclairage résidentiel'],
      ['prises', 'Prises et circuits spécialisés'],
      ['tableau', 'Tableaux électriques et protections'],
      ['chauffage', "Chauffage et production d'eau chaude"],
      ['ventilation', 'Ventilation résidentielle'],
      ['terre', 'Mise à la terre et liaison équipotentielle'],
      ['collectif', 'Installations électriques collectives'],
    ]),
  },
  {
    code: 'TER',
    label: 'Tertiaire et bâtiments professionnels',
    court: 'Tertiaire',
    description: 'Bureaux, commerces et ERP : distribution, éclairage des locaux, sécurité et gestion technique.',
    couleur: '#7B61C9',
    scene: 'ter',
    sous: sd('TER', [
      ['eclairage', 'Éclairage des locaux professionnels'],
      ['distribution', 'Distribution électrique et TGBT'],
      ['securite', 'Éclairage de sécurité'],
      ['erp', 'Installations électriques des ERP'],
      ['gtb', 'Gestion technique du bâtiment'],
      ['secours', 'Alimentations secourues et onduleurs'],
      ['commerces', 'Équipements électriques des commerces et bureaux'],
    ]),
  },
  {
    code: 'IND',
    label: 'Industrie et systèmes automatisés',
    court: 'Industrie',
    description: 'Moteurs, variateurs, automates, capteurs et armoires de commande des machines de production.',
    couleur: '#E0701A',
    scene: 'ind',
    sous: sd('IND', [
      ['demarrage', 'Démarrage et commande des moteurs'],
      ['variation', 'Variation de vitesse'],
      ['api', 'Automates programmables industriels'],
      ['capteurs', 'Capteurs et actionneurs'],
      ['pneumatique', 'Électropneumatique'],
      ['machines', 'Machines et systèmes de production'],
      ['convoyage', 'Convoyage, manutention et levage'],
      ['armoires', 'Armoires électriques industrielles'],
    ]),
  },
  {
    code: 'DOM',
    label: 'Domotique et bâtiments intelligents',
    court: 'Domotique',
    description: 'Bus KNX, scénarios, éclairage et volets pilotés, gestion énergétique et supervision.',
    couleur: '#0E9F8E',
    scene: 'ter',
    sous: sd('DOM', [
      ['knx', 'Bus KNX'],
      ['eclairage', 'Éclairage intelligent'],
      ['volets', 'Automatisation des volets roulants'],
      ['scenarios', 'Scénarios domotiques'],
      ['energie', 'Gestion énergétique'],
      ['supervision', 'Supervision des bâtiments'],
      ['iot', 'Objets connectés'],
    ]),
  },
  {
    code: 'ENR',
    label: 'Énergies renouvelables et stockage',
    court: 'Énergies renouvelables',
    description: 'Photovoltaïque autonome ou raccordé, stockage par batteries, onduleurs et autoconsommation.',
    couleur: '#2E9E4B',
    scene: 'pv',
    sous: sd('ENR', [
      ['pv-autonome', 'Photovoltaïque autonome'],
      ['pv-reseau', 'Photovoltaïque raccordé au réseau'],
      ['dimensionnement', 'Dimensionnement des panneaux solaires'],
      ['batteries', 'Stockage par batteries'],
      ['onduleurs', 'Onduleurs et régulateurs'],
      ['autoconsommation', 'Autoconsommation et gestion énergétique'],
      ['hybride', 'Production éolienne et systèmes hybrides'],
    ]),
  },
  {
    code: 'RES',
    label: "Réseaux électriques et distribution d'énergie",
    court: 'Réseaux électriques',
    description: 'Distribution HTA/BT, postes de transformation, branchements, comptage et protections des réseaux.',
    couleur: '#3D5A80',
    scene: 'ter',
    sous: sd('RES', [
      ['hta-bt', 'Distribution HTA/BT'],
      ['postes', 'Transformateurs et postes de distribution'],
      ['bt', 'Réseaux basse tension'],
      ['comptage', 'Branchements et comptage'],
      ['protections', 'Protections des réseaux'],
      ['triphase', 'Distribution triphasée et équilibrage'],
    ]),
  },
  {
    code: 'INF',
    label: 'Infrastructures et équipements extérieurs',
    court: 'Infrastructures',
    description: 'Éclairage public, signalisation, bornes de recharge et équipements électriques extérieurs.',
    couleur: '#8D6E63',
    scene: 'ind',
    sous: sd('INF', [
      ['eclairage-public', 'Éclairage public'],
      ['signalisation', 'Feux de signalisation'],
      ['irve', 'Bornes de recharge IRVE'],
      ['exterieur', 'Équipements électriques extérieurs'],
      ['commande', "Commande et programmation de l'éclairage public"],
    ]),
  },
  {
    code: 'SEC',
    label: 'Sécurité et sûreté des installations',
    court: 'Sécurité et sûreté',
    description: 'Sécurité incendie, intrusion, vidéosurveillance, contrôle d’accès et alimentations de sécurité.',
    couleur: '#C0392B',
    scene: 'ter',
    sous: sd('SEC', [
      ['incendie', 'Sécurité incendie et SSI'],
      ['intrusion', 'Alarmes intrusion'],
      ['video', 'Vidéosurveillance'],
      ['acces', "Contrôle d'accès"],
      ['eclairage', 'Éclairage de sécurité'],
      ['alimentation', 'Alimentations électriques de sécurité'],
    ]),
  },
  {
    code: 'COM',
    label: 'Réseaux de communication et systèmes connectés',
    court: 'Réseaux de communication',
    description: 'Câblage VDI et Ethernet, réseaux IP, communication industrielle, fibre optique et interphonie.',
    couleur: '#1E88A8',
    scene: 'ter',
    sous: sd('COM', [
      ['vdi', 'Réseaux VDI'],
      ['ethernet', 'Câblage Ethernet'],
      ['ip', 'Réseaux IP'],
      ['industriel', 'Communication industrielle'],
      ['fibre', 'Fibre optique'],
      ['interphonie', 'Interphonie et systèmes connectés'],
    ]),
  },
  {
    code: 'CVC',
    label: 'Génie climatique et équipements thermiques',
    court: 'Génie climatique',
    description: 'Climatisation, pompes à chaleur, ventilation, chauffage, eau chaude et régulation thermique.',
    couleur: '#5C9BD1',
    scene: 'hab',
    sous: sd('CVC', [
      ['clim', 'Climatisation'],
      ['pac', 'Pompes à chaleur'],
      ['vmc', 'Ventilation mécanique'],
      ['chauffage', 'Chauffage électrique'],
      ['ecs', "Production d'eau chaude"],
      ['regulation', 'Régulation et commande thermique'],
    ]),
  },
  {
    code: 'EAU',
    label: 'Pompage et traitement des eaux',
    court: 'Pompage et eaux',
    description: 'Stations de pompage et de relevage, commande et alternance des pompes, surpression et traitement.',
    couleur: '#1565C0',
    scene: 'ind',
    sous: sd('EAU', [
      ['stations', 'Stations de pompage'],
      ['commande', 'Commande des pompes'],
      ['capteurs', 'Capteurs de niveau et de pression'],
      ['alternance', 'Alternance de pompes'],
      ['surpression', "Surpression et distribution d'eau"],
      ['traitement', 'Traitement et assainissement'],
    ]),
  },
];

/** Codes des domaines, dans l'ordre d'affichage. */
export const CODES_DOMAINES: DomainePro[] = DOMAINES.map((d) => d.code);

export const DOMAINE_BY_CODE = Object.fromEntries(DOMAINES.map((d) => [d.code, d])) as Record<DomainePro, DomaineDef>;

/** Les 5 activités du référentiel, dans l'ordre d'affichage (et de tri). */
export const ACTIVITES: { id: ActivitePro; label: string }[] = [
  { id: 'preparation', label: 'Préparation' },
  { id: 'realisation', label: 'Réalisation' },
  { id: 'mise_en_service', label: 'Mise en service' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'communication', label: 'Communication' },
];

/** Libellé d'une activité (« Mise en service »). */
export const ACTIVITE_LABEL = Object.fromEntries(ACTIVITES.map((a) => [a.id, a.label])) as Record<ActivitePro, string>;

/** Classement vide : aucun domaine choisi. */
export const CLASSEMENT_VIDE: Classement = Object.freeze({
  domaine: null,
  domainesSecondaires: [],
  sousDomaine: null,
  activites: [],
  motsCles: [],
}) as Classement;

/** Tous les sous-domaines, par identifiant. */
const SOUS_BY_ID: Record<string, SousDomaine> = Object.fromEntries(
  DOMAINES.flatMap((d) => d.sous).map((s) => [s.id, s]),
);

export function isDomainePro(x: unknown): x is DomainePro {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(DOMAINE_BY_CODE, x);
}

export function isActivitePro(x: unknown): x is ActivitePro {
  return typeof x === 'string' && ACTIVITES.some((a) => a.id === x);
}

/** Sous-domaines d'un domaine (liste fermée). */
export function sousDomainesDe(code: DomainePro): SousDomaine[] {
  return DOMAINE_BY_CODE[code]?.sous ?? [];
}

/** Libellé d'un sous-domaine, `''` si l'identifiant est absent ou inconnu. */
export function labelSousDomaine(id: string | null | undefined): string {
  if (!id) return '';
  return SOUS_BY_ID[id]?.label ?? '';
}

/** Domaine d'un sous-domaine (`IND.demarrage` → `IND`), `null` si inconnu. */
export function domaineDuSousDomaine(id: string | null | undefined): DomainePro | null {
  if (!id || !SOUS_BY_ID[id]) return null;
  const code = id.split('.')[0];
  return isDomainePro(code) ? code : null;
}

/** Domaine par défaut d'une famille historique : ind→IND, hab→HAB, ter→TER, pv→ENR. */
export function domaineParFamily(family: SceneDomaine): DomainePro {
  switch (family) {
    case 'hab': return 'HAB';
    case 'ter': return 'TER';
    case 'pv': return 'ENR';
    case 'ind':
    default: return 'IND';
  }
}

/** Trie des activités selon `ACTIVITES` en supprimant les doublons. */
export function ordonnerActivites(liste: readonly ActivitePro[]): ActivitePro[] {
  const vues = new Set(liste);
  return ACTIVITES.map((a) => a.id).filter((id) => vues.has(id));
}

/** Valeur d'une clé camelCase, ou à défaut de son écriture snake_case (ligne SQL). */
function champ(o: Record<string, unknown>, camel: string, snake: string): unknown {
  return o[camel] !== undefined ? o[camel] : o[snake];
}

/** Liste de chaînes : accepte un tableau ou un texte séparé par des virgules. */
function chaines(v: unknown): string[] {
  const brut: unknown[] = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return brut.filter((x): x is string => typeof x === 'string');
}

/**
 * Relecture DÉFENSIVE d'un classement (jsonb, fichier importé, réponse du générateur).
 * Accepte un objet partiel, les clés camelCase (`domainesSecondaires`, `sousDomaine`,
 * `motsCles`) comme snake_case (`domaines_sec`, `sous_domaine`, `mots_cles`). Un code
 * inconnu devient `null` / disparaît ; un sous-domaine qui n'appartient pas au domaine
 * principal est écarté ; les secondaires excluent le principal ; les activités sont
 * dédupliquées et ordonnées ; les mots-clés sont nettoyés et dédupliqués.
 */
export function normaliserClassement(x: unknown): Classement {
  if (!x || typeof x !== 'object' || Array.isArray(x)) {
    return { ...CLASSEMENT_VIDE, domainesSecondaires: [], activites: [], motsCles: [] };
  }
  const o = x as Record<string, unknown>;

  const brutDomaine = o.domaine;
  const domaine: DomainePro | null = isDomainePro(brutDomaine)
    ? brutDomaine
    : typeof brutDomaine === 'string' && isDomainePro(brutDomaine.trim().toUpperCase())
      ? (brutDomaine.trim().toUpperCase() as DomainePro)
      : null;

  const secondaires: DomainePro[] = [];
  for (const s of chaines(champ(o, 'domainesSecondaires', 'domaines_sec'))) {
    const code = s.trim().toUpperCase();
    if (isDomainePro(code) && code !== domaine && !secondaires.includes(code)) secondaires.push(code);
  }

  const brutSous = champ(o, 'sousDomaine', 'sous_domaine');
  const sousDomaine = typeof brutSous === 'string'
    && SOUS_BY_ID[brutSous]
    && domaine !== null
    && domaineDuSousDomaine(brutSous) === domaine
    ? brutSous
    : null;

  const activites = ordonnerActivites(chaines(o.activites).filter(isActivitePro));

  const motsCles: string[] = [];
  const vus = new Set<string>();
  for (const m of chaines(champ(o, 'motsCles', 'mots_cles'))) {
    const mot = m.trim().replace(/\s+/g, ' ');
    const cle = mot.toLowerCase();
    if (!mot || vus.has(cle)) continue;
    vus.add(cle);
    motsCles.push(mot);
  }

  return { domaine, domainesSecondaires: secondaires, sousDomaine, activites, motsCles };
}

/**
 * Activités déduites de la nature du TP :
 * - `dimensionnement` → préparation, communication (note de calcul) ;
 * - `miseEnService` → préparation, mise en service, maintenance ;
 * - `reseau` → préparation, réalisation, mise en service, maintenance ;
 * - platine (défaut) → préparation, réalisation, mise en service, et maintenance si le
 *   TP déclare des pannes.
 */
export function activitesDeduites(tp: { kind?: string; playable?: boolean; faults?: unknown[]; mesures?: unknown[] }): ActivitePro[] {
  switch (tp.kind) {
    case 'dimensionnement':
      return ordonnerActivites(['preparation', 'communication']);
    case 'miseEnService':
      return ordonnerActivites(['preparation', 'mise_en_service', 'maintenance']);
    case 'reseau':
      return ordonnerActivites(['preparation', 'realisation', 'mise_en_service', 'maintenance']);
    default: {
      const liste: ActivitePro[] = ['preparation', 'realisation', 'mise_en_service'];
      if (Array.isArray(tp.faults) && tp.faults.length > 0) liste.push('maintenance');
      return ordonnerActivites(liste);
    }
  }
}

/**
 * Taxonomie compacte pour un prompt (générateur) : une ligne par domaine, code, libellé,
 * puis les identifiants de sous-domaines et leur libellé ; enfin les activités.
 */
export function taxonomiePourPrompt(): string {
  const lignes = DOMAINES.map((d) =>
    `${d.code} — ${d.label} : ${d.sous.map((s) => `${s.id} (${s.label})`).join(' ; ')}`,
  );
  const activites = ACTIVITES.map((a) => `${a.id} (${a.label})`).join(' ; ');
  return [
    'Domaines professionnels (code — libellé : sous-domaines) :',
    ...lignes,
    `Activités : ${activites}`,
  ].join('\n');
}
