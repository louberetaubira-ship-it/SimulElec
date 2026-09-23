/**
 * Sujet numérique « Espace d’innovation partagé (EIP) — rénovation électrique »
 * (Bac Pro MELEC, 4 parties, 72 questions, 5 h).
 *
 * Copie conforme d'un sujet d'examen papier : énoncés mot pour mot, valeurs de correction
 * du corrigé officiel (les écarts relevés sont signalés en commentaire « Corrigé officiel : … »).
 * Le sujet est anonymisé : rien de ce qui est servi au navigateur (textes, identifiants,
 * chemins, images) ne permet d'en retrouver l'origine — contrôle par `scripts/audit-sujet.ts`.
 *
 * Images : `public/tp/eip/` — pages du sujet `sujet-04…32.jpg` et du dossier technique
 * `dtr-02…52.jpg` (pages de garde et de présentation retirées, numérotation conservée),
 * recadrages des figures (schémas Q13 / Q58 / Q67, plan 3D Q39-Q40, cavaliers Q57…).
 * Positions des bornes et des bulles : en % de l'image recadrée.
 *
 * Sujets thématiques : `declinaisons` (une par partie), fabriqués par `src/lib/sujet/declinaisons.ts`.
 */
import type {
  CelluleSaisie, DeclinaisonSujet, DtrPage, QCocher, QSchema, SujetNumerique, SujetPartie, SujetQuestion,
} from '@/lib/sujet/types';

const IMG = '/tp/eip';
const pad = (n: number) => String(n).padStart(2, '0');

/* ───────────────────────────── Aides de saisie ───────────────────────────── */

/** Cellule numérique (tolérance absolue, défaut ±1 % côté moteur si omise). */
const num = (id: string, attendu: number, tolerance?: number, acceptes?: string[]): CelluleSaisie =>
  ({ id, attendu, ...(tolerance != null ? { tolerance } : {}), ...(acceptes ? { acceptes } : {}) });
/** Cellule texte : réponses acceptées (le moteur ignore casse, accents et espaces). */
const txt = (id: string, acceptes: string[], placeholder?: string): CelluleSaisie =>
  ({ id, acceptes, ...(placeholder ? { placeholder } : {}) });
/** Cellule à choix fermé (liste déroulante). */
const choix = (id: string, liste: string[], bonne: string): CelluleSaisie => ({ id, choix: liste, acceptes: [bonne] });
/** Cellule libre non notée (justification lue par le professeur dans la copie). */
const libre = (id: string, placeholder = 'Justifier votre réponse…'): CelluleSaisie => ({ id, placeholder });

/** Variantes d'écriture d'un nom d'agent (« RICHARD », « M. RICHARD », « Mr RICHARD »…). */
const variantesNom = (nom: string) => [nom, `M. ${nom}`, `M.${nom}`, `Mr ${nom}`, `Monsieur ${nom}`];
/** Un ou deux agents : chaque nom seul, et les deux ensemble dans les deux ordres. */
function noms(...liste: string[]): string[] {
  const out = new Set<string>();
  for (const n of liste) variantesNom(n).forEach(v => out.add(v));
  if (liste.length === 2) {
    const [a, b] = liste;
    for (const [x, y] of [[a, b], [b, a]]) {
      for (const sep of [' et ', ', ', ' - ', ' / ', ' + ']) {
        out.add(`${x}${sep}${y}`);
        out.add(`M. ${x}${sep}M. ${y}`);
        out.add(`M.${x}${sep}M.${y}`);
      }
    }
  }
  return Array.from(out);
}

/** Références Legrand : avec et sans le « 0 » de tête (« 0 675 52 » = « 675 52 »). */
const ref = (...r: string[]) => Array.from(new Set(r.flatMap(x => [x, x.replace(/^0\s*/, '')])));

/* ───────────────────────────── DTR et pages du sujet ───────────────────────────── */

/** Pages 2 à 52 du DTR (la page de garde est retirée ; la numérotation est conservée). */
const DTR_TITRES: [string, string][] = [
  ['Organigramme et habilitations de l’équipe', 'Habilitations / Sécurité'],
  ['Codification des habilitations (RUSST)', 'Habilitations / Sécurité'],
  ['Titre d’habilitation : avis', 'Habilitations / Sécurité'],
  ['Système UTE et contacteur heures creuses', 'Habilitations / Sécurité'],
  ['Interrupteur horaire', 'Habilitations / Sécurité'],
  ['Éclairage : cahier des charges', 'Éclairage'],
  ['Méthode d’éclairage : formules', 'Éclairage'],
  ['Éclairements recommandés', 'Éclairage'],
  ['Tableaux d’utilance', 'Éclairage'],
  ['Dalle LED PANEL 600', 'Éclairage'],
  ['MyHOME : cahier des charges', 'MyHOME'],
  ['Schéma architectural, zones A et PL', 'MyHOME'],
  ['Bus SCS : introduction au système', 'MyHOME'],
  ['Bus SCS : configuration des appareils', 'MyHOME'],
  ['Appareils de commande', 'MyHOME'],
  ['Structure d’un câblage MyHOME', 'MyHOME'],
  ['Bus SCS : distances et nombre d’appareils', 'MyHOME'],
  ['Modes de fonctionnement des commandes', 'MyHOME'],
  ['Alimentations, câbles et accessoires', 'MyHOME'],
  ['Actionneurs MyHOME_Up', 'MyHOME'],
  ['Choix des détecteurs', 'MyHOME'],
  ['Inter détecteur PIR SCS (1/4)', 'MyHOME'],
  ['Inter détecteur PIR SCS (2/4)', 'MyHOME'],
  ['Inter détecteur PIR SCS : réglages', 'MyHOME'],
  ['Inter détecteur PIR SCS : configurateurs', 'MyHOME'],
  ['Mécanismes Céliane', 'MyHOME'],
  ['Enjoliveurs Céliane', 'MyHOME'],
  ['Protection des personnes (différentiels)', 'MyHOME'],
  ['Protections par circuit', 'MyHOME'],
  ['Disjoncteurs DNX³ / DX³', 'MyHOME'],
  ['Actionneur 1 relais F411/1N', 'MyHOME'],
  ['F411/1N : mode et câblage', 'MyHOME'],
  ['Actionneur 2 relais F411U2', 'MyHOME'],
  ['F411U2 : configuration', 'MyHOME'],
  ['F411U2 : commande automatisation', 'MyHOME'],
  ['F411U2 : schémas de câblage', 'MyHOME'],
  ['Actionneur 4 relais F411/4', 'MyHOME'],
  ['F411/4 : configuration', 'MyHOME'],
  ['F411/4 : mode', 'MyHOME'],
  ['F411/4 : schémas de câblage', 'MyHOME'],
  ['VIGIK : cahier des charges', 'VIGIK'],
  ['Centrales Hexact et accessoires', 'VIGIK'],
  ['Badges et accessoires Vigik', 'VIGIK'],
  ['Boutons-poussoirs antivandales', 'VIGIK'],
  ['Gâches électriques', 'VIGIK'],
  ['Centrale Hexact Light II : caractéristiques', 'VIGIK'],
  ['Centrale Hexact Light II : branchements', 'VIGIK'],
  ['Centrale Hexact Light II : fonctions', 'VIGIK'],
  ['Contrôle d’accès : aide au choix', 'VIGIK'],
  ['Consommation des produits', 'VIGIK'],
  ['Verrouillage : tableau de choix', 'VIGIK'],
];

const DTR: DtrPage[] = DTR_TITRES.map(([titre, section], i) => ({
  num: i + 2, src: `${IMG}/dtr-${pad(i + 2)}.jpg`, titre, section,
}));

/** Pages 4 à 32 du sujet (pages de garde et de présentation retirées ; numérotation conservée). */
const SUJET_TITRES: [string, string][] = [
  ['Organisation de l’épreuve', 'Présentation'],
  ['Partie 1 — Q1 à Q2', 'Partie 1'],
  ['Q3 — Titres et spécificités', 'Partie 1'],
  ['Q4 — Titres des agents', 'Partie 1'],
  ['Q5 — Niveaux d’habilitation', 'Partie 1'],
  ['Q6 à Q8 — Consignation', 'Partie 1'],
  ['Q9 à Q12 — V.A.T., câble', 'Partie 1'],
  ['Q13 — Schéma du cumulus', 'Partie 1'],
  ['Partie 2 — Q14 à Q15', 'Partie 2'],
  ['Q16 à Q19', 'Partie 2'],
  ['Q20 à Q23', 'Partie 2'],
  ['Q24 à Q27 — Devis, énergie', 'Partie 2'],
  ['Q28 à Q30', 'Partie 2'],
  ['Q31 à Q34 — Anciens luminaires', 'Partie 2'],
  ['Q35 à Q38 — Rentabilité', 'Partie 2'],
  ['Partie 3 — Mise en situation', 'Partie 3'],
  ['Q39 à Q40 — Plan 3D', 'Partie 3'],
  ['Q41 à Q45 — Alimentation bus', 'Partie 3'],
  ['Q46 à Q50 — Actionneurs', 'Partie 3'],
  ['Q51 à Q53 — Détecteur', 'Partie 3'],
  ['Q54 à Q55 — Commandes, différentiel', 'Partie 3'],
  ['Q56 à Q57 — Protections', 'Partie 3'],
  ['Q57 — Cavaliers', 'Partie 3'],
  ['Q58 — Schéma MyHOME', 'Partie 3'],
  ['Partie 4 — Q59', 'Partie 4'],
  ['Q60 à Q64 — Centrale, gâche', 'Partie 4'],
  ['Q65 à Q67', 'Partie 4'],
  ['Q67 — Schéma VIGIK', 'Partie 4'],
  ['Q68 à Q72 — Badges', 'Partie 4'],
];

const PAGES_SUJET: DtrPage[] = SUJET_TITRES.map(([titre, section], i) => ({
  num: i + 4, src: `${IMG}/sujet-${pad(i + 4)}.jpg`, titre, section,
}));

/* ───────────────────────────── Parties ───────────────────────────── */

const PARTIES: SujetPartie[] = [
  {
    num: 1,
    titre: 'Préparation à la rénovation des sanitaires dans l’espace d’innovation partagé (EIP)',
    objectifs: ['Préparer la mise en sécurité de l’installation.', 'Préparer la réalisation.'],
    competences: ['C1', 'C3', 'C11'],
    situation:
      'Dans le cadre de la rénovation des sanitaires, le cumulus sera déplacé et le câblage doit être modifié afin de réduire le coût de sa consommation.\n'
      + 'L’équipe des agents est composée de 6 personnes.\n'
      + 'Problématique : préparer la mise en sécurité de l’installation ; préparer la réalisation.\n'
      + '(Dossier technique et ressources pages 2 à 6.)',
    dtrPages: [2, 3, 4, 5, 6],
  },
  {
    num: 2,
    titre: 'Éclairage de l’espace d’innovation partagé (EIP)',
    objectifs: [
      'Réaliser le projet d’éclairage pour l’atelier principal de l’EIP.',
      'Chiffrer le coût pour l’atelier principal de l’EIP.',
      'Choisir le nombre de luminaires.',
      'Calculer la rentabilité du projet.',
    ],
    competences: ['C1', 'C3', 'C11'],
    situation:
      'Dans le cadre de sa rénovation et dans le but de réduire sa consommation en énergie, le lycée souhaite remplacer les luminaires existants (L13, L14, L15, L16, L17 et L18) par des dalles à LED - PANEL600 dans l’atelier principal de l’espace d’innovation partagé (EIP).\n'
      + 'Problématique : réaliser le projet d’éclairage et chiffrer le coût du matériel pour l’atelier principal de l’espace d’innovation partagé (EIP) ; choisir le nombre de luminaires ; calculer la rentabilité du projet.\n'
      + '(Dossier technique et ressources pages 7 à 11.)',
    dtrPages: [7, 8, 9, 10, 11],
  },
  {
    num: 3,
    titre: 'Gestion domotique (MY HOME) de l’espace d’innovation partagé (EIP)',
    objectifs: [
      'Réaliser le projet de gestion MYHOME de l’EIP.',
      'Effectuer le choix du matériel.',
      'Paramétrer le matériel MYHOME.',
      'Réaliser le schéma de câblage.',
    ],
    competences: ['C1', 'C3', 'C6', 'C11'],
    situation:
      'Dans le cadre de la rénovation de la salle, il a été demandé afin d’améliorer les coûts énergétiques et le confort des utilisateurs, d’évoluer vers une gestion optimisée de l’éclairage et des volets. L’installation sera réalisée en technologie « MY HOME » proposée par la société LEGRAND.\n'
      + 'Problématique : réaliser le projet de gestion MYHOME de l’EIP ; effectuer le choix du matériel ; paramétrer le matériel MYHOME ; réaliser le schéma de câblage.\n'
      + '(Dossier technique pages 12 à 41.)',
    dtrPages: Array.from({ length: 30 }, (_, i) => 12 + i),
  },
  {
    num: 4,
    titre: 'Contrôle d’accès par badges « VIGIK » de l’espace d’innovation partagé (EIP)',
    objectifs: [
      'Réaliser le projet de contrôle d’accès de l’EIP.',
      'Effectuer le choix du matériel.',
      'Réaliser le schéma de câblage.',
    ],
    competences: ['C1', 'C3', 'C6', 'C11'],
    situation:
      'Pour des raisons de gestion et de surveillance de la salle, il a été demandé de pouvoir ouvrir l’accès de la salle avec des badges individuels programmés ; ce qui permet une gestion plus aisée (perte du badge, plusieurs utilisateurs, gestion des horaires, etc.). L’installation sera réalisée en produits « VIGIK » proposés par le fabricant LEGRAND.\n'
      + 'Problématique : réaliser le projet de contrôle d’accès de l’EIP ; effectuer le choix du matériel ; réaliser le schéma de câblage.\n'
      + '(Dossier technique pages 42 à 52.)',
    dtrPages: Array.from({ length: 11 }, (_, i) => 42 + i),
  },
];

/* ───────────────────────────── Listes réutilisées ───────────────────────────── */

/** Q4 : les cases du papier, agent par agent, dans l'ordre d'impression. */
const AGENTS_Q4 = ['BERNARD', 'MARTIN', 'PETIT', 'RICHARD', 'ROBERT', 'THOMAS'];
const TITRES_Q4 = [
  'B0', 'B1', 'B1V', 'B2', 'B2V', 'B2V Essai', 'BC', 'BS', 'BR', 'BE + Attribut',
  'H0', 'H0V', 'H1', 'H1V', 'H2', 'H2V', 'H2V Essai', 'HC', 'HE + Attribut',
];
/** Organigramme DTR 2 et corrigé Q4. */
const HABILITATIONS: Record<string, string[]> = {
  BERNARD: ['B1V'], MARTIN: ['B2V', 'BC', 'BR', 'H0'], PETIT: ['BS'], RICHARD: ['B0'], ROBERT: ['BS'], THOMAS: ['B1V'],
};
const OPTIONS_Q4 = AGENTS_Q4.flatMap(a => TITRES_Q4.map(t => `M. ${a} — ${t}`));
const BONNES_Q4 = AGENTS_Q4.flatMap((a, ia) => HABILITATIONS[a].map(t => ia * TITRES_Q4.length + TITRES_Q4.indexOf(t)));

/** Q5 : significations des caractères, telles qu'au DTR 3 (légende des codifications). */
const HAB = {
  B: 'Basse tension (BT) et très basse tension (TBT)',
  H: 'Haute tension (HTA ou HTB, > 1000 V)',
  zero: 'Exécutant ou chargé de chantier pour travaux d’ordre non électrique',
  un: 'Exécutant pour travaux d’ordre électrique',
  deux: 'Chargé de travaux pour travaux d’ordre électrique',
  R: 'Intervention BT d’entretien et de dépannage',
  S: 'Intervention BT de remplacement et de raccordement',
  C: 'Consignation électrique',
  E: 'Essai, vérification, mesurage ou manœuvre',
  V: 'Travaux réalisés dans la zone de voisinage',
  N: 'Nettoyage sous tension',
  X: 'Opération spéciale',
};
const CHOIX_HAB = Object.values(HAB);

const OUI_NON = ['OUI', 'NON'];

/** Q51 : caractéristique de contact d'un F411/1NC (corrigé : « 1 contact NO NC »). */
const CONTACT_NONC = [
  '1 contact NO NC', '1 contact NO/NC', '1 contact NO-NC', '1 NO NC', '1 NO/NC', '1 contact NO + NC',
  '1 contact inverseur', '1 inverseur', '1 contact NF', '1 relais NF', '1 contact normalement fermé',
];

/* ───────────────────────────── Schémas ───────────────────────────── */

const Q13_TRAITS: QSchema['traits'] = {
  image: { src: `${IMG}/q13-sujet.jpg`, alt: 'Schéma multifilaire à compléter : arrivée N/L, Q6, Q7, KM1, barrette PE, horloge programmable, sortie des câbles du chauffe-eau', w: 725, h: 650 },
  bornes: [
      { id: 'N', x: 14.1, y: 16, label: 'Arrivée N' },
      { id: 'L', x: 19.8, y: 16, label: 'Arrivée L' },
      { id: 'Q6.N1', x: 14.1, y: 29.5, label: 'Q6 — N amont' },
      { id: 'Q6.P1', x: 19.8, y: 29.5, label: 'Q6 — P amont' },
      { id: 'Q6.N2', x: 14.2, y: 41.8, label: 'Q6 — N aval' },
      { id: 'Q6.P2', x: 20.0, y: 41.8, label: 'Q6 — P aval' },
      { id: 'Q7.N1', x: 37.0, y: 29.5, label: 'Q7 — N amont' },
      { id: 'Q7.P1', x: 42.7, y: 29.5, label: 'Q7 — P amont' },
      { id: 'Q7.N2', x: 37.1, y: 41.8, label: 'Q7 — N aval' },
      { id: 'Q7.P2', x: 42.8, y: 41.8, label: 'Q7 — P aval' },
      { id: 'KM1.A1', x: 62.9, y: 31.3, label: 'KM1 — bobine A1' },
      { id: 'KM1.A2', x: 62.9, y: 40.5, label: 'KM1 — bobine A2' },
      { id: 'KM1.1', x: 71.4, y: 29.5, label: 'KM1 — contact 1' },
      { id: 'KM1.3', x: 77.3, y: 29.5, label: 'KM1 — contact 3' },
      { id: 'KM1.2', x: 71.4, y: 42.0, label: 'KM1 — contact 2' },
      { id: 'KM1.4', x: 77.3, y: 42.0, label: 'KM1 — contact 4' },
      { id: 'PE', x: 91.0, y: 34.0, label: 'Barrette PE' },
      { id: 'H.M1', x: 10.5, y: 58.5, label: 'Horloge — moteur (borne haute)' },
      { id: 'H.M2', x: 10.5, y: 69.0, label: 'Horloge — moteur (borne basse)' },
      { id: 'H.C1', x: 23.0, y: 57.8, label: 'Horloge — contact (borne haute)' },
      { id: 'H.C2', x: 23.0, y: 70.0, label: 'Horloge — contact (borne basse)' },
      { id: 'CE.N', x: 71.3, y: 86.7, label: 'Chauffe-eau — N' },
      { id: 'CE.PE', x: 74.1, y: 86.7, label: 'Chauffe-eau — PE' },
      { id: 'CE.L', x: 77.3, y: 86.7, label: 'Chauffe-eau — L' },
  ],
  couleurs: [
    { id: 'bleu', label: 'Bleu (neutre)', css: '#1f6fd6' },
    { id: 'rouge', label: 'Rouge (phase)', css: '#d62828' },
    { id: 'marron', label: 'Marron (phase)', css: '#7b4a1f' },
    { id: 'noir', label: 'Noir (phase / commande)', css: '#161616' },
    { id: 'vertjaune', label: 'Vert-jaune (PE)', css: '#3d9a2a' },
  ],
  // Liaisons du corrigé (p. 11). Neutre en bleu et PE en vert-jaune notés ; la couleur des
  // conducteurs de phase (rouge au corrigé, marron ou noir acceptables) n'est pas notée.
  attendues: [
    { a: 'N', b: 'Q6.N1', couleur: 'bleu' },
    { a: 'L', b: 'Q6.P1' },
    { a: 'N', b: 'Q7.N1', couleur: 'bleu' },
    { a: 'L', b: 'Q7.P1' },
    { a: 'Q6.N2', b: 'H.M2', couleur: 'bleu' },
    { a: 'Q6.N2', b: 'KM1.A1', couleur: 'bleu' },
    { a: 'Q6.P2', b: 'H.M1' },
    { a: 'Q6.P2', b: 'H.C1' },
    { a: 'H.C2', b: 'KM1.A2' },
    { a: 'Q7.N2', b: 'KM1.1', couleur: 'bleu' },
    { a: 'Q7.P2', b: 'KM1.3' },
    { a: 'KM1.2', b: 'CE.N', couleur: 'bleu' },
    { a: 'KM1.4', b: 'CE.L' },
    { a: 'PE', b: 'CE.PE', couleur: 'vertjaune' },
  ],
  // Correction par réseau (bornes au même potentiel). Neutre en bleu, PE en vert-jaune ;
  // couleur des phases et de la commande non notée.
  reseaux: [
    { label: 'Arrivée N', couleur: 'bleu', bornes: ['N', 'Q6.N1', 'Q7.N1'] },
    { label: 'Arrivée L', bornes: ['L', 'Q6.P1', 'Q7.P1'] },
    { label: 'Neutre aval Q6 (horloge, A1)', couleur: 'bleu', bornes: ['Q6.N2', 'H.M2', 'KM1.A1'] },
    { label: 'Phase aval Q6 (horloge)', bornes: ['Q6.P2', 'H.M1', 'H.C1'] },
    { label: 'Commande KM1 (contact d’horloge → A2)', bornes: ['H.C2', 'KM1.A2'] },
    { label: 'Neutre aval Q7', couleur: 'bleu', bornes: ['Q7.N2', 'KM1.1'] },
    { label: 'Phase aval Q7', bornes: ['Q7.P2', 'KM1.3'] },
    { label: 'Neutre chauffe-eau', couleur: 'bleu', bornes: ['KM1.2', 'CE.N'] },
    { label: 'Phase chauffe-eau', bornes: ['KM1.4', 'CE.L'] },
    { label: 'PE', couleur: 'vertjaune', bornes: ['PE', 'CE.PE'] },
  ],
};

/** Chaîne « a–b, b–c, c–d… » (lampes en parallèle, bus, peignes d'alimentation). */
const chaine = (ids: string[]) => ids.slice(1).map((b, i) => ({ a: ids[i], b }));

const Q58_TRAITS: QSchema['traits'] = {
  image: { src: `${IMG}/q58-sujet.jpg`, alt: 'Schéma électrique MyHOME à compléter : Q1, Q2, AL1, Q3 à Q8, actionneurs KA1 à KA6, lampes L1 à L14, volets V1 à V5', w: 1991, h: 1240 },
  bornes: [
      { id: 'Q1.N2', x: 45.2, y: 8.71, label: 'Q1 — N aval' },
      { id: 'Q1.P2', x: 46.71, y: 8.71, label: 'Q1 — Ph aval' },
      { id: 'Q2.N1', x: 3.26, y: 13.71, label: 'Q2 — N amont' },
      { id: 'Q2.P1', x: 4.77, y: 13.71, label: 'Q2 — Ph amont' },
      { id: 'Q2.N2', x: 3.26, y: 20.73, label: 'Q2 — N aval' },
      { id: 'Q2.P2', x: 4.77, y: 20.73, label: 'Q2 — Ph aval' },
      { id: 'Q3.N1', x: 37.62, y: 20.97, label: '-Q3 — N amont' },
      { id: 'Q3.P1', x: 39.18, y: 20.97, label: '-Q3 — Ph amont' },
      { id: 'Q3.N2', x: 37.62, y: 28.06, label: '-Q3 — N aval' },
      { id: 'Q3.P2', x: 39.18, y: 28.06, label: '-Q3 — Ph aval' },
      { id: 'Q8.N1', x: 48.22, y: 20.97, label: '-Q8 — N amont' },
      { id: 'Q8.P1', x: 49.72, y: 20.97, label: '-Q8 — Ph amont' },
      { id: 'Q8.N2', x: 48.22, y: 28.06, label: '-Q8 — N aval' },
      { id: 'Q8.P2', x: 49.72, y: 28.06, label: '-Q8 — Ph aval' },
      { id: 'Q6.N1', x: 58.76, y: 20.97, label: 'Q6 — N amont' },
      { id: 'Q6.P1', x: 60.32, y: 20.97, label: 'Q6 — Ph amont' },
      { id: 'Q6.N2', x: 58.76, y: 28.06, label: 'Q6 — N aval' },
      { id: 'Q6.P2', x: 60.32, y: 28.06, label: 'Q6 — Ph aval' },
      { id: 'Q4.N1', x: 69.36, y: 20.97, label: '-Q4 — N amont' },
      { id: 'Q4.P1', x: 70.87, y: 20.97, label: '-Q4 — Ph amont' },
      { id: 'Q4.N2', x: 69.36, y: 28.06, label: '-Q4 — N aval' },
      { id: 'Q4.P2', x: 70.87, y: 28.06, label: '-Q4 — Ph aval' },
      { id: 'Q5.N1', x: 79.91, y: 20.97, label: '-Q5 — N amont' },
      { id: 'Q5.P1', x: 81.42, y: 20.97, label: '-Q5 — Ph amont' },
      { id: 'Q5.N2', x: 79.91, y: 28.06, label: '-Q5 — N aval' },
      { id: 'Q5.P2', x: 81.42, y: 28.06, label: '-Q5 — Ph aval' },
      { id: 'Q7.N1', x: 89.35, y: 20.97, label: '-Q6 (Q7, volets atelier électronique) — N amont' },
      { id: 'Q7.P1', x: 90.86, y: 20.97, label: '-Q6 (Q7, volets atelier électronique) — Ph amont' },
      { id: 'Q7.N2', x: 89.35, y: 28.06, label: '-Q6 (Q7, volets atelier électronique) — N aval' },
      { id: 'Q7.P2', x: 90.86, y: 28.06, label: '-Q6 (Q7, volets atelier électronique) — Ph aval' },
      { id: 'AL1.PRI1', x: 7.38, y: 34.11, label: 'AL1 — primaire 230 V (borne 1)' },
      { id: 'AL1.PRI2', x: 9.04, y: 34.11, label: 'AL1 — primaire 230 V (borne 2)' },
      { id: 'AL1.BUS1', x: 28.03, y: 34.11, label: 'AL1 — sortie BUS (borne 1)' },
      { id: 'AL1.BUS2', x: 29.63, y: 34.11, label: 'AL1 — sortie BUS (borne 2)' },
      { id: 'AL1.BUS3', x: 30.99, y: 34.11, label: 'AL1 — sortie BUS (borne 3)' },
      { id: 'AL1.BUS4', x: 32.65, y: 34.11, label: 'AL1 — sortie BUS (borne 4)' },
      { id: 'KA1.1', x: 27.98, y: 50.16, label: 'KA1 — borne 1' },
      { id: 'KA1.2', x: 29.08, y: 50.16, label: 'KA1 — borne 2' },
      { id: 'KA1.3', x: 30.19, y: 50.16, label: 'KA1 — borne 3' },
      { id: 'KA1.BUS1', x: 28.23, y: 69.52, label: 'KA1 — BUS (borne gauche)' },
      { id: 'KA1.BUS2', x: 29.33, y: 69.52, label: 'KA1 — BUS (borne droite)' },
      { id: 'KA4.1', x: 39.28, y: 50.16, label: 'KA4 — borne 1' },
      { id: 'KA4.2', x: 40.43, y: 50.16, label: 'KA4 — borne 2' },
      { id: 'KA4.3', x: 41.54, y: 50.16, label: 'KA4 — borne 3' },
      { id: 'KA4.BUS1', x: 39.53, y: 69.52, label: 'KA4 — BUS (borne gauche)' },
      { id: 'KA4.BUS2', x: 40.63, y: 69.52, label: 'KA4 — BUS (borne droite)' },
      { id: 'KA5.1', x: 49.62, y: 50.32, label: 'KA5 — borne 1' },
      { id: 'KA5.2', x: 50.78, y: 50.32, label: 'KA5 — borne 2' },
      { id: 'KA5.3', x: 51.93, y: 50.32, label: 'KA5 — borne 3' },
      { id: 'KA5.BUS1', x: 49.92, y: 69.76, label: 'KA5 — BUS (borne gauche)' },
      { id: 'KA5.BUS2', x: 51.08, y: 69.76, label: 'KA5 — BUS (borne droite)' },
      { id: 'KA2.1', x: 61.78, y: 50.08, label: 'KA2 — borne 1' },
      { id: 'KA2.2', x: 62.88, y: 50.08, label: 'KA2 — borne 2' },
      { id: 'KA2.3', x: 63.99, y: 50.08, label: 'KA2 — borne 3' },
      { id: 'KA2.4', x: 65.09, y: 50.08, label: 'KA2 — borne 4' },
      { id: 'KA2.5', x: 66.25, y: 50.08, label: 'KA2 — borne 5' },
      { id: 'KA2.BUS1', x: 61.93, y: 69.44, label: 'KA2 — BUS (borne gauche)' },
      { id: 'KA2.BUS2', x: 63.08, y: 69.44, label: 'KA2 — BUS (borne droite)' },
      { id: 'KA3.1', x: 76.9, y: 50.08, label: 'KA3 — borne 1' },
      { id: 'KA3.2', x: 78.0, y: 50.08, label: 'KA3 — borne 2' },
      { id: 'KA3.3', x: 79.16, y: 50.08, label: 'KA3 — borne 3' },
      { id: 'KA3.4', x: 80.26, y: 50.08, label: 'KA3 — borne 4' },
      { id: 'KA3.5', x: 81.37, y: 50.08, label: 'KA3 — borne 5' },
      { id: 'KA3.BUS1', x: 77.05, y: 69.44, label: 'KA3 — BUS (borne gauche)' },
      { id: 'KA3.BUS2', x: 78.2, y: 69.44, label: 'KA3 — BUS (borne droite)' },
      { id: 'KA6.L', x: 88.7, y: 50.08, label: 'KA6 (CAD C1) — borne L' },
      { id: 'KA6.1', x: 89.75, y: 50.08, label: 'KA6 (CAD C1) — borne 1' },
      { id: 'KA6.N', x: 90.86, y: 50.08, label: 'KA6 (CAD C1) — borne N' },
      { id: 'KA6.2', x: 91.96, y: 50.08, label: 'KA6 (CAD C1) — borne 2' },
      { id: 'KA6.3', x: 93.12, y: 50.08, label: 'KA6 (CAD C1) — borne 3' },
      { id: 'KA6.BUS1', x: 88.85, y: 69.44, label: 'KA6 (CAD C1) — BUS (borne gauche)' },
      { id: 'KA6.BUS2', x: 89.95, y: 69.44, label: 'KA6 (CAD C1) — BUS (borne droite)' },
      { id: 'L11.1', x: 10.45, y: 83.63, label: 'L11 — borne 1' },
      { id: 'L11.2', x: 10.45, y: 88.47, label: 'L11 — borne 2' },
      { id: 'L12.1', x: 13.46, y: 83.63, label: 'L12 — borne 1' },
      { id: 'L12.2', x: 13.46, y: 88.47, label: 'L12 — borne 2' },
      { id: 'L13.1', x: 16.47, y: 83.63, label: 'L13 — borne 1' },
      { id: 'L13.2', x: 16.47, y: 88.47, label: 'L13 — borne 2' },
      { id: 'L14.1', x: 19.49, y: 83.63, label: 'L14 — borne 1' },
      { id: 'L14.2', x: 19.49, y: 88.47, label: 'L14 — borne 2' },
      { id: 'L1.1', x: 24.06, y: 83.95, label: 'L1 — borne 1' },
      { id: 'L1.2', x: 24.06, y: 88.79, label: 'L1 — borne 2' },
      { id: 'L2.1', x: 27.07, y: 83.95, label: 'L2 — borne 1' },
      { id: 'L2.2', x: 27.07, y: 88.79, label: 'L2 — borne 2' },
      { id: 'L3.1', x: 30.09, y: 83.95, label: 'L3 — borne 1' },
      { id: 'L3.2', x: 30.09, y: 88.79, label: 'L3 — borne 2' },
      { id: 'L4.1', x: 33.1, y: 83.95, label: 'L4 — borne 1' },
      { id: 'L4.2', x: 33.1, y: 88.79, label: 'L4 — borne 2' },
      { id: 'L5.1', x: 36.11, y: 83.95, label: 'L5 — borne 1' },
      { id: 'L5.2', x: 36.11, y: 88.79, label: 'L5 — borne 2' },
      { id: 'L6.1', x: 39.18, y: 83.95, label: 'L6 — borne 1' },
      { id: 'L6.2', x: 39.18, y: 88.79, label: 'L6 — borne 2' },
      { id: 'L7.1', x: 45.2, y: 83.95, label: 'L7 — borne 1' },
      { id: 'L7.2', x: 45.2, y: 88.79, label: 'L7 — borne 2' },
      { id: 'L8.1', x: 48.22, y: 83.95, label: 'L8 — borne 1' },
      { id: 'L8.2', x: 48.22, y: 88.79, label: 'L8 — borne 2' },
      { id: 'L9.1', x: 51.23, y: 83.95, label: 'L9 — borne 1' },
      { id: 'L9.2', x: 51.23, y: 88.79, label: 'L9 — borne 2' },
      { id: 'L10.1', x: 54.24, y: 83.95, label: 'L10 — borne 1' },
      { id: 'L10.2', x: 54.24, y: 88.79, label: 'L10 — borne 2' },
      { id: 'V1.L1', x: 61.83, y: 84.03, label: 'V1 — L1' },
      { id: 'V1.L2', x: 63.39, y: 84.03, label: 'V1 — L2' },
      { id: 'V1.N', x: 62.53, y: 91.05, label: 'V1 — N' },
      { id: 'V2.L1', x: 67.45, y: 84.03, label: 'V2 — L1' },
      { id: 'V2.L2', x: 69.06, y: 84.03, label: 'V2 — L2' },
      { id: 'V2.N', x: 68.21, y: 91.05, label: 'V2 — N' },
      { id: 'V3.L1', x: 73.88, y: 84.27, label: 'V3 — L1' },
      { id: 'V3.L2', x: 75.39, y: 84.27, label: 'V3 — L2' },
      { id: 'V3.N', x: 74.64, y: 91.37, label: 'V3 — N' },
      { id: 'V4.L1', x: 82.22, y: 84.19, label: 'V4 — L1' },
      { id: 'V4.L2', x: 83.78, y: 84.19, label: 'V4 — L2' },
      { id: 'V4.N', x: 82.97, y: 91.37, label: 'V4 — N' },
      { id: 'V5.L1', x: 93.52, y: 83.95, label: 'V5 — L1' },
      { id: 'V5.L2', x: 95.03, y: 83.95, label: 'V5 — L2' },
      { id: 'V5.N', x: 94.17, y: 91.05, label: 'V5 — N' },
  ],
  couleurs: [
    { id: 'noir', label: 'Noir (phase)', css: '#161616' },
    { id: 'bleu', label: 'Bleu (neutre)', css: '#1f6fd6' },
    { id: 'rouge', label: 'Rouge (bus SCS)', css: '#d62828' },
    { id: 'marron', label: 'Marron (phase)', css: '#7b4a1f' },
  ],
  // Liaisons du corrigé (p. 27, tracé noir : couleurs non notées). Les « peignes » et les
  // barres du corrigé sont décrits comme des chaînes de proche en proche, dans l'ordre du dessin.
  attendues: [
    // Alimentation depuis Q1 (N à gauche, phase à droite sur chaque disjoncteur 1P+N)
    { a: 'Q1.N2', b: 'Q2.N1' }, { a: 'Q1.P2', b: 'Q2.P1' },
    { a: 'Q1.N2', b: 'Q3.N1' }, { a: 'Q1.N2', b: 'Q8.N1' },
    ...chaine(['Q8.N1', 'Q6.N1', 'Q4.N1', 'Q5.N1', 'Q7.N1']),
    { a: 'Q1.P2', b: 'Q3.P1' }, { a: 'Q1.P2', b: 'Q8.P1' },
    ...chaine(['Q8.P1', 'Q6.P1', 'Q4.P1', 'Q5.P1', 'Q7.P1']),
    // Primaire de l'alimentation bus
    { a: 'Q2.N2', b: 'AL1.PRI1' }, { a: 'Q2.P2', b: 'AL1.PRI2' },
    // Bus SCS (2 fils) : AL1 → KA1 → KA4 → KA5 → KA2 → KA3 → KA6
    ...chaine(['AL1.BUS1', 'KA1.BUS1', 'KA4.BUS1', 'KA5.BUS1', 'KA2.BUS1', 'KA3.BUS1', 'KA6.BUS1']),
    ...chaine(['AL1.BUS2', 'KA1.BUS2', 'KA4.BUS2', 'KA5.BUS2', 'KA2.BUS2', 'KA3.BUS2', 'KA6.BUS2']),
    // Éclairage atelier (Q3, KA1, L11 à L14)
    { a: 'Q3.P2', b: 'KA1.1' }, { a: 'KA1.2', b: 'L14.1' }, { a: 'Q3.N2', b: 'L14.2' },
    ...chaine(['L11.1', 'L12.1', 'L13.1', 'L14.1']), ...chaine(['L11.2', 'L12.2', 'L13.2', 'L14.2']),
    // Éclairage sanitaire (Q8, KA4, L1 à L6)
    { a: 'Q8.P2', b: 'KA4.1' }, { a: 'KA4.2', b: 'L6.1' }, { a: 'Q8.N2', b: 'L6.2' },
    ...chaine(['L1.1', 'L2.1', 'L3.1', 'L4.1', 'L5.1', 'L6.1']), ...chaine(['L1.2', 'L2.2', 'L3.2', 'L4.2', 'L5.2', 'L6.2']),
    // Éclairage atelier électronique (Q6, KA5, L7 à L10) — phase arrivant au niveau de L8 au corrigé
    { a: 'Q6.P2', b: 'KA5.1' }, { a: 'KA5.2', b: 'L8.1' }, { a: 'Q6.N2', b: 'L10.2' },
    ...chaine(['L7.1', 'L8.1', 'L9.1', 'L10.1']), ...chaine(['L7.2', 'L8.2', 'L9.2', 'L10.2']),
    // Volets atelier V1-V2 (Q4, KA2)
    { a: 'Q4.P2', b: 'KA2.1' }, { a: 'KA2.2', b: 'V1.L1' }, { a: 'KA2.3', b: 'V1.L2' },
    { a: 'KA2.4', b: 'V2.L1' }, { a: 'KA2.5', b: 'V2.L2' }, { a: 'Q4.N2', b: 'V2.N' }, { a: 'V1.N', b: 'V2.N' },
    // Volets atelier V3-V4 (Q5, KA3)
    { a: 'Q5.P2', b: 'KA3.1' }, { a: 'KA3.2', b: 'V3.L1' }, { a: 'KA3.3', b: 'V3.L2' },
    { a: 'KA3.4', b: 'V4.L1' }, { a: 'KA3.5', b: 'V4.L2' }, { a: 'Q5.N2', b: 'V4.N' }, { a: 'V3.N', b: 'V4.N' },
    // Volet atelier électronique V5 (disjoncteur repéré « -Q6 » sur le dessin = Q7, KA6 CAD C1)
    { a: 'Q7.N2', b: 'KA6.N' }, { a: 'Q7.N2', b: 'V5.N' }, { a: 'Q7.P2', b: 'KA6.L' }, { a: 'Q7.P2', b: 'KA6.3' },
    { a: 'KA6.1', b: 'V5.L1' }, { a: 'KA6.2', b: 'V5.L2' },
  ],
  // Correction par réseau (couleurs non notées : corrigé en noir). Bus SCS non polarisé :
  // ses deux conducteurs sont laissés tels que dessinés au corrigé (BUS1 ↔ bornes gauches).
  reseaux: [
    { label: 'Neutre aval Q1 (peigne)', bornes: ['Q1.N2', 'Q2.N1', 'Q3.N1', 'Q8.N1', 'Q6.N1', 'Q4.N1', 'Q5.N1', 'Q7.N1'] },
    { label: 'Phase aval Q1 (peigne)', bornes: ['Q1.P2', 'Q2.P1', 'Q3.P1', 'Q8.P1', 'Q6.P1', 'Q4.P1', 'Q5.P1', 'Q7.P1'] },
    { label: 'Primaire AL1 — neutre', bornes: ['Q2.N2', 'AL1.PRI1'] },
    { label: 'Primaire AL1 — phase', bornes: ['Q2.P2', 'AL1.PRI2'] },
    { label: 'Bus SCS — conducteur 1', bornes: ['AL1.BUS1', 'KA1.BUS1', 'KA4.BUS1', 'KA5.BUS1', 'KA2.BUS1', 'KA3.BUS1', 'KA6.BUS1'] },
    { label: 'Bus SCS — conducteur 2', bornes: ['AL1.BUS2', 'KA1.BUS2', 'KA4.BUS2', 'KA5.BUS2', 'KA2.BUS2', 'KA3.BUS2', 'KA6.BUS2'] },
    { label: 'Phase Q3 → KA1', bornes: ['Q3.P2', 'KA1.1'] },
    { label: 'Éclairage atelier — phase commandée', bornes: ['KA1.2', 'L11.1', 'L12.1', 'L13.1', 'L14.1'] },
    { label: 'Éclairage atelier — neutre', bornes: ['Q3.N2', 'L11.2', 'L12.2', 'L13.2', 'L14.2'] },
    { label: 'Phase Q8 → KA4', bornes: ['Q8.P2', 'KA4.1'] },
    { label: 'Éclairage sanitaire — phase commandée', bornes: ['KA4.2', 'L1.1', 'L2.1', 'L3.1', 'L4.1', 'L5.1', 'L6.1'] },
    { label: 'Éclairage sanitaire — neutre', bornes: ['Q8.N2', 'L1.2', 'L2.2', 'L3.2', 'L4.2', 'L5.2', 'L6.2'] },
    { label: 'Phase Q6 → KA5', bornes: ['Q6.P2', 'KA5.1'] },
    { label: 'Éclairage atelier électronique — phase commandée', bornes: ['KA5.2', 'L7.1', 'L8.1', 'L9.1', 'L10.1'] },
    { label: 'Éclairage atelier électronique — neutre', bornes: ['Q6.N2', 'L7.2', 'L8.2', 'L9.2', 'L10.2'] },
    { label: 'Phase Q4 → KA2', bornes: ['Q4.P2', 'KA2.1'] },
    { label: 'V1 — L1', bornes: ['KA2.2', 'V1.L1'] },
    { label: 'V1 — L2', bornes: ['KA2.3', 'V1.L2'] },
    { label: 'V2 — L1', bornes: ['KA2.4', 'V2.L1'] },
    { label: 'V2 — L2', bornes: ['KA2.5', 'V2.L2'] },
    { label: 'Neutre volets V1-V2', bornes: ['Q4.N2', 'V1.N', 'V2.N'] },
    { label: 'Phase Q5 → KA3', bornes: ['Q5.P2', 'KA3.1'] },
    { label: 'V3 — L1', bornes: ['KA3.2', 'V3.L1'] },
    { label: 'V3 — L2', bornes: ['KA3.3', 'V3.L2'] },
    { label: 'V4 — L1', bornes: ['KA3.4', 'V4.L1'] },
    { label: 'V4 — L2', bornes: ['KA3.5', 'V4.L2'] },
    { label: 'Neutre volets V3-V4', bornes: ['Q5.N2', 'V3.N', 'V4.N'] },
    { label: 'Neutre Q7 (KA6, V5)', bornes: ['Q7.N2', 'KA6.N', 'V5.N'] },
    { label: 'Phase Q7 (KA6 L et 3)', bornes: ['Q7.P2', 'KA6.L', 'KA6.3'] },
    { label: 'V5 — L1', bornes: ['KA6.1', 'V5.L1'] },
    { label: 'V5 — L2', bornes: ['KA6.2', 'V5.L2'] },
  ],
};

const Q67_TRAITS: QSchema['traits'] = {
  image: { src: `${IMG}/q67-sujet.jpg`, alt: 'Schéma électrique VIGIK à compléter : Q10, Q11, AL2, AL3, centrale CEN 1, bouton S7, tête de lecture U1, gâche GA1', w: 1818, h: 1080 },
  bornes: [
      { id: 'Q11.N2', x: 5.34, y: 26.39, label: '-Q11 — N aval' },
      { id: 'Q11.P2', x: 7.21, y: 26.39, label: '-Q11 — Ph aval' },
      { id: 'Q10.N2', x: 22.39, y: 26.39, label: '-Q10 — N aval' },
      { id: 'Q10.P2', x: 24.2, y: 26.39, label: '-Q10 — Ph aval' },
      { id: 'AL2.+V', x: 36.74, y: 26.85, label: 'AL2 — +V' },
      { id: 'AL2.-V', x: 38.23, y: 26.85, label: 'AL2 — −V' },
      { id: 'AL2.L', x: 34.43, y: 52.31, label: 'AL2 — L' },
      { id: 'AL2.N', x: 36.03, y: 52.31, label: 'AL2 — N' },
      { id: 'AL3.S1', x: 9.19, y: 57.59, label: 'AL3 — sortie 12 V~ (borne gauche)' },
      { id: 'AL3.S2', x: 19.14, y: 57.59, label: 'AL3 — sortie 12 V~ (borne droite)' },
      { id: 'AL3.P1', x: 9.35, y: 86.3, label: 'AL3 — entrée 230 V (borne gauche)' },
      { id: 'AL3.P2', x: 18.87, y: 86.3, label: 'AL3 — entrée 230 V (borne droite)' },
      { id: 'CEN1.AC1', x: 55.01, y: 47.5, label: 'CEN 1 — AC (1re)' },
      { id: 'CEN1.AC2', x: 56.44, y: 47.5, label: 'CEN 1 — AC (2e)' },
      { id: 'CEN1.BP', x: 57.81, y: 47.5, label: 'CEN 1 — BP' },
      { id: 'CEN1.M', x: 59.3, y: 47.5, label: 'CEN 1 — −' },
      { id: 'CEN1.L+', x: 60.62, y: 47.5, label: 'CEN 1 — L+' },
      { id: 'CEN1.L-', x: 62.16, y: 47.5, label: 'CEN 1 — L−' },
      { id: 'CEN1.C', x: 63.59, y: 47.5, label: 'CEN 1 — C' },
      { id: 'CEN1.R', x: 64.96, y: 47.5, label: 'CEN 1 — R' },
      { id: 'CEN1.T', x: 66.45, y: 47.5, label: 'CEN 1 — T' },
      { id: 'S7.1', x: 57.92, y: 61.2, label: 'S7 — borne haute' },
      { id: 'S7.2', x: 57.92, y: 67.04, label: 'S7 — borne basse' },
      { id: 'U1.L+', x: 60.84, y: 87.13, label: 'U1 — L+' },
      { id: 'U1.L-', x: 62.16, y: 89.54, label: 'U1 — L−' },
      { id: 'GA1.1', x: 80.8, y: 58.7, label: 'GA1 — fil haut' },
      { id: 'GA1.2', x: 80.8, y: 61.11, label: 'GA1 — fil bas' },
  ],
  couleurs: [
    { id: 'noir', label: 'Noir (230 V phase, U1 et S7)', css: '#161616' },
    { id: 'bleu', label: 'Bleu (230 V neutre, 12 VAC, 12 VDC −)', css: '#1f6fd6' },
    { id: 'vert', label: 'Vert (12 VDC +)', css: '#2e9e3e' },
  ],
  // Liaisons du corrigé (p. 31) et couleurs imposées par l'énoncé Q67.
  attendues: [
    { a: 'Q10.N2', b: 'AL2.N', couleur: 'bleu' },
    { a: 'Q10.P2', b: 'AL2.L', couleur: 'noir' },
    { a: 'Q11.N2', b: 'AL3.P1', couleur: 'bleu' },
    { a: 'Q11.P2', b: 'AL3.P2', couleur: 'noir' },
    { a: 'AL2.+V', b: 'CEN1.AC1', couleur: 'vert' },
    { a: 'AL2.-V', b: 'CEN1.AC2', couleur: 'bleu' },
    { a: 'AL3.S1', b: 'CEN1.C', couleur: 'bleu' },
    { a: 'CEN1.T', b: 'GA1.1', couleur: 'bleu' },
    { a: 'AL3.S2', b: 'GA1.2', couleur: 'bleu' },
    { a: 'CEN1.BP', b: 'S7.1', couleur: 'noir' },
    { a: 'CEN1.M', b: 'S7.2', couleur: 'noir' },
    { a: 'CEN1.L+', b: 'U1.L+', couleur: 'noir' },
    { a: 'CEN1.L-', b: 'U1.L-', couleur: 'noir' },
  ],
  // Correction par réseau, couleurs imposées par l'énoncé. Non exprimable en réseaux : la
  // permutation des deux sorties 12 V~ d'AL3 (C ↔ gâche) et celle des entrées AC/AC de la
  // centrale, électriquement équivalentes : réseaux tels que dessinés au corrigé.
  reseaux: [
    { label: '230 V AL2 — neutre', couleur: 'bleu', bornes: ['Q10.N2', 'AL2.N'] },
    { label: '230 V AL2 — phase', couleur: 'noir', bornes: ['Q10.P2', 'AL2.L'] },
    { label: '230 V AL3 — neutre', couleur: 'bleu', bornes: ['Q11.N2', 'AL3.P1'] },
    { label: '230 V AL3 — phase', couleur: 'noir', bornes: ['Q11.P2', 'AL3.P2'] },
    { label: '12 VDC +', couleur: 'vert', bornes: ['AL2.+V', 'CEN1.AC1'] },
    { label: '12 VDC −', couleur: 'bleu', bornes: ['AL2.-V', 'CEN1.AC2'] },
    { label: '12 VAC → commun C', couleur: 'bleu', bornes: ['AL3.S1', 'CEN1.C'] },
    { label: '12 VAC commandé T → gâche', couleur: 'bleu', bornes: ['CEN1.T', 'GA1.1'] },
    { label: '12 VAC → gâche', couleur: 'bleu', bornes: ['AL3.S2', 'GA1.2'] },
    { label: 'S7 — BP', couleur: 'noir', bornes: ['CEN1.BP', 'S7.1'] },
    { label: 'S7 — −', couleur: 'noir', bornes: ['CEN1.M', 'S7.2'] },
    { label: 'U1 — L+', couleur: 'noir', bornes: ['CEN1.L+', 'U1.L+'] },
    { label: 'U1 — L−', couleur: 'noir', bornes: ['CEN1.L-', 'U1.L-'] },
  ],
};

/* ───────────────────────────── Questions ───────────────────────────── */

const Q4: QCocher = {
  num: 4, partie: 1, type: 'cocher', multiple: true,
  enonce: '**Indiquer** les titres d’habilitation des agents.',
  contexte: 'Pour chaque agent, cocher toutes les cases correspondant à ses titres d’habilitation (grille du sujet : B0, B1, B1V, B2, B2V, B2V Essai, BC, BS, BR, BE + Attribut, H0, H0V, H1, H1V, H2, H2V, H2V Essai, HC, HE + Attribut).',
  competence: 'C11', points: 2, dtr: [2], pageSujet: 7,
  options: OPTIONS_Q4, bonnes: BONNES_Q4,
  indice: 'L’organigramme des agents (DTR 2) donne les titres de chacun : ne cocher que ceux-là.',
  explication: 'Organigramme DTR 2 : M. BERNARD B1V ; M. MARTIN B2V, BC, BR et H0 ; M. PETIT BS ; M. RICHARD B0 ; M. ROBERT BS ; M. THOMAS B1V.',
};

const QUESTIONS: SujetQuestion[] = [
  /* ═══════════════ PARTIE 1 ═══════════════ */
  {
    num: 1, partie: 1, type: 'cocher',
    enonce: '**Préciser** qui doit signer le titre d’habilitation.',
    competence: 'C1', points: 1, dtr: [4], pageSujet: 5,
    options: ['L’employeur', 'Le chef d’équipe', 'Le client', 'Le chef de service'], bonnes: [0],
    indice: 'Lire l’« AVIS » au verso du titre d’habilitation (DTR 4).',
    explication: 'Le titre d’habilitation est établi et signé par l’employeur ou son représentant, puis remis à l’intéressé qui doit également le signer (DTR 4).',
  },
  {
    num: 2, partie: 1, type: 'cocher',
    enonce: '**Indiquer** si ce titre est attribué définitivement.',
    competence: 'C1', points: 1, dtr: [4], pageSujet: 5,
    options: ['OUI', 'NON'], bonnes: [1],
    indice: 'Une habilitation se maintient (recyclage) et peut être retirée ou modifiée.',
    explication: 'NON : le titre n’est pas attribué définitivement ; il est révisé périodiquement (recyclage) et à chaque changement de fonction ou d’aptitude.',
  },
  {
    num: 3, partie: 1, type: 'relier',
    enonce: '**Relier** les spécificités en fonction des titres (**Utiliser** des stylos de couleurs).',
    competence: 'C1', points: 2, dtr: [3, 2], pageSujet: 6,
    gauche: ['B0 · H0 · H0V', 'BS', 'B1 · B1V · B2 · B2V', 'BC', 'BR', 'BE · HE', 'H1 · H1V · H2 · H2V', 'HC'],
    droite: [
      'Il est chargé de consignation Haute Tension. Il assure la consignation d’ouvrages ou d’installations afin que ses collègues puissent travailler en sécurité sur les installations consignées au préalable.',
      'Il est chargé d’intervention générale. Il possède les connaissances pratiques du métier d’électricien et il sait lire un schéma électrique. Il a la possibilité d’intervenir seul pour des opérations d’entretien et de dépannages, de raccordement et remplacement. Mais il y a certaines limites supplémentaires en courant, en tension et en section de conducteurs.',
      'Il est chargé de consignation basse tension. Il assure la consignation d’ouvrages ou d’installations afin que ses collègues puissent travailler hors tension, en sécurité sur les installations consignées au préalable.',
      'Il est électricien et exerce des fonctions d’exécutant ou de chargé de travaux, éventuellement de chargé d’essais en Basse Tension.',
      'Il est chargé d’opérations de mesurage, de vérification, d’essai ou de manœuvre.',
      'Il est chargé d’intervention élémentaire. Il ne peut effectuer que des opérations électriques simples de remplacement et de raccordement.',
      'Cette habilitation signifie qu’il n’est pas électricien mais son travail nécessite une connaissance des risques liés à l’électricité, ainsi que des moyens de s’en munir. Il peut être exécutant ou chargé de chantier (non électrique).',
      'Il est électricien et exerce des fonctions d’exécutant ou de chargé de travaux, éventuellement de chargé d’essais en Haute Tension.',
    ],
    liens: [6, 5, 3, 2, 1, 4, 7, 0],
    indice: 'Utiliser la légende des codifications (DTR 3) : 0 = non électricien, 1/2 = exécutant/chargé de travaux, C = consignation, R = intervention générale, S = intervention élémentaire, E = essais/mesurages.',
    explication: 'B0-H0-H0V → non électricien ; BS → intervention élémentaire ; B1-B1V-B2-B2V → électricien BT exécutant ou chargé de travaux ; BC → consignation BT ; BR → intervention générale ; BE-HE → mesurage, vérification, essai, manœuvre ; H1-H1V-H2-H2V → électricien HT ; HC → consignation HT.',
  },
  Q4,
  {
    num: 5, partie: 1, type: 'tableau',
    enonce: '**Donner** la signification du niveau d’habilitation des agents.',
    contexte: 'M. BERNARD - M. MARTIN - M. PETIT - M. RICHARD - M. ROBERT - M. THOMAS. Pour chaque niveau, écrire le nom de l’agent concerné puis choisir la signification de chaque caractère (légende du DTR 3).',
    competence: 'C1', points: 2, dtr: [3, 2], pageSujet: 8,
    colonnes: ['Niveau', 'Nom', '1er caractère', '2e caractère', 'Lettre additionnelle'],
    lignes: [
      { cellules: ['B0', txt('q5-b0-nom', noms('RICHARD')), choix('q5-b0-1', CHOIX_HAB, HAB.B), choix('q5-b0-2', CHOIX_HAB, HAB.zero), '—'] },
      { cellules: ['B1V', txt('q5-b1v-nom', noms('BERNARD', 'THOMAS')), choix('q5-b1v-1', CHOIX_HAB, HAB.B), choix('q5-b1v-2', CHOIX_HAB, HAB.un), choix('q5-b1v-3', CHOIX_HAB, HAB.V)] },
      { cellules: ['B2V', txt('q5-b2v-nom', noms('MARTIN')), choix('q5-b2v-1', CHOIX_HAB, HAB.B), choix('q5-b2v-2', CHOIX_HAB, HAB.deux), choix('q5-b2v-3', CHOIX_HAB, HAB.V)] },
      { cellules: ['BS', txt('q5-bs-nom', noms('PETIT', 'ROBERT')), choix('q5-bs-1', CHOIX_HAB, HAB.B), choix('q5-bs-2', CHOIX_HAB, HAB.S), '—'] },
      { cellules: ['BC', txt('q5-bc-nom', noms('MARTIN')), choix('q5-bc-1', CHOIX_HAB, HAB.B), choix('q5-bc-2', CHOIX_HAB, HAB.C), '—'] },
      { cellules: ['BR', txt('q5-br-nom', noms('MARTIN')), choix('q5-br-1', CHOIX_HAB, HAB.B), choix('q5-br-2', CHOIX_HAB, HAB.R), '—'] },
      { cellules: ['H0', txt('q5-h0-nom', noms('MARTIN')), choix('q5-h0-1', CHOIX_HAB, HAB.H), choix('q5-h0-2', CHOIX_HAB, HAB.zero), '—'] },
    ],
    indice: 'Les noms se lisent sur l’organigramme (DTR 2), les significations sur la légende des codifications (DTR 3).',
    explication: 'B : basse tension (BT) et très basse tension (TBT), tension entre 0 et 1000 V ; H : HTA ou HTB, haute tension (> 1000 V). 0 : exécutant ou chargé de chantier pour travaux d’ordre non électrique ; 1 : exécutant pour travaux d’ordre électrique ; 2 : chargé de travaux pour travaux d’ordre électrique ; V : travaux réalisés dans la zone de voisinage ; S : intervention BT de remplacement et de raccordement ; C : consignation électrique ; R : intervention BT d’entretien et de dépannage. Agents : B0 RICHARD, B1V BERNARD et THOMAS, B2V-BC-BR-H0 MARTIN, BS PETIT et ROBERT.',
  },
  {
    num: 6, partie: 1, type: 'ordonner',
    enonce: 'Une consignation sur l’un des circuits « Basse tension » doit être réalisée dans l’ancienne armoire pour permettre le travail. Elle permet d’assurer la protection des personnes et se décompose en 4 étapes. **Indiquer** l’ordre des étapes à réaliser (1, 2, 3, 4) en écrivant les chiffres dans les cases.',
    competence: 'C1', points: 1, dtr: [3], pageSujet: 9,
    items: [
      'Vérification d’absence de tension.',
      'Condamnation en position d’ouverture des organes de protection.',
      'Séparation de l’ouvrage des sources de tension.',
      'Identification de l’ouvrage pour être certain que les travaux seront effectués hors tension.',
    ],
    // Corrigé officiel : 4 - 2 - 3 - 1 (l'ordre usuel de la NF C18-510 est séparation,
    // condamnation, identification, VAT ; la correction suit le corrigé officiel).
    rangs: [4, 2, 3, 1],
    indice: 'La vérification d’absence de tension est toujours la dernière étape.',
    explication: 'Corrigé : 1 identification de l’ouvrage, 2 condamnation en position d’ouverture, 3 séparation des sources de tension, 4 vérification d’absence de tension.',
  },
  {
    num: 7, partie: 1, type: 'tableau',
    enonce: '**Indiquer** le nom de la personne autorisée à effectuer la consignation. **Justifier** votre réponse.',
    competence: 'C1', points: 1, dtr: [2, 3], pageSujet: 9,
    colonnes: ['Personne autorisée', 'Justification'],
    lignes: [{ cellules: [
      choix('q7-nom', ['M. BERNARD', 'M. MARTIN', 'M. PETIT', 'M. THOMAS', 'M. RICHARD', 'M. ROBERT'], 'M. MARTIN'),
      libre('q7-just'),
    ] }],
    indice: 'Quelle lettre du titre d’habilitation autorise la consignation (DTR 3) ?',
    explication: 'M. MARTIN est le seul à avoir le titre d’habilitation BC pour pouvoir effectuer cette opération d’ordre électrique.',
  },
  {
    num: 8, partie: 1, type: 'redige',
    enonce: '**Indiquer** 3 équipements de protection individuels et 3 équipements individuels de sécurité nécessaires à la personne devant effectuer la consignation.',
    contexte: 'Deux colonnes : « Équipements de protection individuelle » et « Équipements individuels de sécurité ».',
    competence: 'C1', points: 1, dtr: [3], pageSujet: 9,
    motsCles: ['gant', 'casque', 'ecran', 'visiere', 'tenue', 'vetement', 'chaussure', 'tapis', 'tabouret', 'cadenas', 'absence', 'vat', 'pancarte'],
    minMotsCles: 5, lignes: 6,
    corrige: 'EPI : gants isolants ; casque + écran facial ; tenue de travail. Équipements individuels de sécurité : tapis isolant ; cadenas de consignation ; contrôleur (vérificateur) d’absence de tension.',
    indice: 'EPI = ce que l’on porte sur soi ; équipements individuels de sécurité = ce que l’on utilise (tapis, cadenas, VAT…).',
    explication: 'EPI : gants isolants, casque + écran facial, tenue de travail. EIS : tapis isolant, cadenas de consignation, contrôleur d’absence de tension.',
  },
  {
    num: 9, partie: 1, type: 'tableau',
    enonce: 'La personne responsable de la consignation devra effectuer une V.A.T. **Indiquer** ci-dessous, la désignation de chaque lettre.',
    competence: 'C1', points: 1, dtr: [3], pageSujet: 10,
    colonnes: ['V', 'A', 'T'],
    lignes: [{ cellules: [
      txt('q9-v', ['VÉRIFICATION', 'vérifier', 'vérificateur']),
      txt('q9-a', ['ABSENCE', 'd’absence', "d'absence", 'absence de']),
      txt('q9-t', ['TENSION', 'de tension']),
    ] }],
    explication: 'V : VÉRIFICATION — A : ABSENCE — T : TENSION (vérification d’absence de tension).',
  },
  {
    num: 10, partie: 1, type: 'redige',
    enonce: '**Compléter** les lignes ci-dessous en précisant les 3 étapes de la V.A.T.',
    competence: 'C1', points: 1, dtr: [3], pageSujet: 10,
    motsCles: ['test', 'fonctionnement', 'absence'], minMotsCles: 3, lignes: 3,
    corrige: '1. Tester le fonctionnement du VAT selon le mode d’emploi. 2. Vérifier l’absence de tension. 3. Tester le fonctionnement du VAT selon le mode d’emploi.',
    indice: 'Le VAT se contrôle avant ET après la vérification.',
    explication: '1 : tester le fonctionnement du VAT selon le mode d’emploi ; 2 : vérifier l’absence de tension ; 3 : tester de nouveau le fonctionnement du VAT.',
  },
  {
    num: 11, partie: 1, type: 'tableau',
    enonce: 'D’après son habilitation, **préciser** si M. RICHARD peut déconnecter le câble d’alimentation du cumulus. **Justifier** votre réponse.',
    competence: 'C1', points: 1, dtr: [2, 3], pageSujet: 10,
    colonnes: ['OUI / NON', 'Justification'],
    lignes: [{ cellules: [choix('q11-rep', OUI_NON, 'NON'), libre('q11-just')] }],
    indice: 'M. RICHARD est habilité B0 : que signifie l’indice 0 ?',
    explication: 'NON : M. RICHARD (B0) ne peut pas effectuer un travail d’ordre électrique.',
  },
  {
    num: 12, partie: 1, type: 'tableau',
    enonce: 'Le câble utilisé pour alimenter le cumulus est de type : U 1000 R O 2V 3 G 2,5. **Donner** la signification de la dénomination.',
    competence: 'C1', points: 2, dtr: [5], pageSujet: 10,
    colonnes: ['Symbole', 'Signification'],
    lignes: [
      { cellules: ['U', txt('q12-u', ['Câble faisant l’objet d’une norme UTE', "Câble faisant l'objet d'une norme UTE", 'norme UTE', 'UTE', 'câble normalisé UTE', 'câble de la série UTE', 'type de la série UTE', 'câble conforme à une norme UTE'])] },
      { cellules: ['1000', txt('q12-1000', ['Tension 1000 V', '1000 V', '1000 volts', 'tension nominale 1000 V', 'tension de 1000 V', 'tension U0 1000 V', 'tension assignée 1000 V', 'tension maximale 1000 V'])] },
      { cellules: ['(aucune lettre)', txt('q12-ame', ['Âme rigide en cuivre', 'âme rigide cuivre', 'âme cuivre rigide', 'rigide cuivre', 'cuivre rigide', 'âme en cuivre rigide', 'rigide en cuivre', 'âme rigide et en cuivre', 'souplesse rigide nature cuivre'])] },
      { cellules: ['R', txt('q12-r', ['Enveloppe isolante en polyéthylène réticulé', 'polyéthylène réticulé', 'PR', 'isolant en polyéthylène réticulé', 'enveloppe isolante polyéthylène réticulé', 'isolant polyéthylène réticulé', 'isolation en polyéthylène réticulé'])] },
      { cellules: ['O', txt('q12-o', ['Aucun bourrage ou bourrage ne formant pas de gaine', 'aucun bourrage', 'sans bourrage', 'pas de bourrage', 'bourrage ne formant pas de gaine', 'absence de bourrage'])] },
      { cellules: ['2V', txt('q12-2v', ['Gaine épaisse en PVC', 'gaine PVC épaisse', 'gaine épaisse PVC', 'gaine de protection épaisse en PVC', 'gaine de protection en PVC', 'gaine en PVC', 'gaine PVC', 'gaine épaisse en polychlorure de vinyle'])] },
      { cellules: ['3', txt('q12-3', ['3 conducteurs', 'trois conducteurs', 'nombre de conducteurs 3', '3 conducteurs actifs'])] },
      { cellules: ['G', txt('q12-g', ['Présence de fil vert/jaune', 'présence d’un fil vert/jaune', "présence d'un fil vert/jaune", 'présence du conducteur vert/jaune', 'avec conducteur vert/jaune', 'avec fil vert/jaune', 'conducteur vert/jaune', 'fil vert/jaune', 'vert/jaune', 'vert-jaune', 'vert et jaune', 'présence de vert/jaune', 'avec vert/jaune', 'conducteur de protection vert/jaune'])] },
      { cellules: ['2,5', txt('q12-25', ['Section des conducteurs 2,5 mm²', 'section 2,5 mm²', '2,5 mm²', '2,5 mm2', 'section de 2,5 mm²', '2,5', 'section 2,5'])] },
    ],
    indice: 'Le système UTE (DTR 5) décode chaque position : type de série, tension, âme, enveloppe isolante, bourrage, gaine, conducteurs.',
    explication: 'U : câble faisant l’objet d’une norme UTE ; 1000 : tension 1000 V ; (pas de lettre) : âme rigide en cuivre ; R : enveloppe isolante en polyéthylène réticulé ; O : aucun bourrage ou bourrage ne formant pas de gaine ; 2V : gaine épaisse en PVC ; 3 : 3 conducteurs ; G : présence de fil vert/jaune ; 2,5 : section des conducteurs 2,5 mm².',
  },
  {
    num: 13, partie: 1, type: 'schema',
    enonce: 'Avant la réalisation, **compléter** le schéma multifilaire de l’alimentation du cumulus piloté par un contact d’horloge programmable. **Commencer** le schéma en amont de Q6 (protection de l’horloge programmable) et Q7 (protection du contacteur). (**Utiliser** des stylos de couleurs)',
    competence: 'C11', points: 4, dtr: [5, 6], pageSujet: 11,
    image: { src: `${IMG}/q13-sujet.jpg`, alt: 'Schéma multifilaire du cumulus à compléter' },
    traits: Q13_TRAITS,
    platineTpId: 'eip-q13-cumulus',
    corrigeImage: { src: `${IMG}/q13-corrige.jpg`, alt: 'Schéma multifilaire du cumulus — corrigé' },
    indice: 'Q6 alimente l’horloge (moteur et contact) ; le contact de l’horloge pilote la bobine de KM1 ; Q7 alimente les pôles de puissance 1-3 de KM1, qui alimentent le chauffe-eau par 2-4. Le PE va directement au chauffe-eau.',
    explication: 'Corrigé : N et L en amont de Q6 et Q7 ; Q6 aval : N vers le moteur de l’horloge et vers A1 de KM1, P vers le moteur de l’horloge et vers le commun du contact ; sortie du contact d’horloge vers A2 ; Q7 aval : N vers 1, P vers 3 de KM1 ; 2 vers N et 4 vers L du chauffe-eau ; barrette PE vers le PE du chauffe-eau.',
  },

  /* ═══════════════ PARTIE 2 ═══════════════ */
  {
    num: 14, partie: 2, type: 'tableau',
    enonce: '**Relever** les informations concernant l’atelier principal de l’espace d’innovation partagé (EIP).',
    competence: 'C1', points: 1, dtr: [7], pageSujet: 12,
    image: { src: `${IMG}/q14-atelier.jpg`, alt: 'Atelier principal de l’EIP : vue 3D et plan (DTR 7)' },
    colonnes: ['L : longueur (m)', 'l : largeur (m)', 'ht : hauteur (m)', 'hpu : hauteur du plan utile (m)'],
    lignes: [{ cellules: [num('q14-L', 8.1, 0.001), num('q14-l', 6.3, 0.001), num('q14-ht', 5.5, 0.001), num('q14-hpu', 0.8, 0.001)] }],
    indice: 'Cahier des charges de l’éclairage (DTR 7).',
    explication: 'L = 8,10 m ; l = 6,30 m ; ht = 5,50 m ; hpu = 0,80 m.',
  },
  {
    num: 15, partie: 2, type: 'valeur',
    enonce: '**Relever** le niveau d’éclairement recommandé "E".',
    competence: 'C3', points: 1, dtr: [9, 7], pageSujet: 12,
    champs: [{ id: 'E', label: 'E : Éclairement recommandé', unite: 'lux', attendu: 425, tolerance: 0 }],
    indice: 'L’atelier sera considéré comme une salle de classe (DTR 7) : chercher « Salles de classe » dans le tableau des éclairements recommandés (DTR 9).',
    explication: 'E = 425 lux (salle de classe).',
  },
  {
    num: 16, partie: 2, type: 'calcul',
    enonce: '**Calculer** l’indice du local "k" de l’atelier principal de l’espace d’innovation partagé (EIP).',
    competence: 'C3', points: 2, dtr: [8], pageSujet: 13,
    grandeur: 'k',
    formule: 'k = (L × l) / [(L + l) × (ht − hpu)]',
    formuleMotsCles: ['l+l', 'ht-hpu'],
    attendu: 0.754, tolerance: 0.0075, arrondi: '3 décimales',
    indice: 'Formule de l’indice du local au DTR 8 ; attention : ht − hpu = 5,5 − 0,8.',
    explication: 'k = (8,1 × 6,3) / [(8,1 + 6,3) × (5,5 − 0,8)] = 51,03 / 67,68 = 0,754. Pour la suite, on prend k = 0,8.',
  },
  {
    num: 17, partie: 2, type: 'tableau',
    enonce: '**Déterminer** le facteur de réflexion de l’atelier principal de l’espace d’innovation partagé (EIP).',
    contexte: 'Pour la suite, nous prendrons un indice de local "k" égal à 0,8.',
    competence: 'C3', points: 1, dtr: [8, 7], pageSujet: 13,
    colonnes: ['Réflexion du plafond', 'Réflexion des murs', 'Réflexion du plan utile', 'Facteur de réflexion'],
    lignes: [{ cellules: [num('q17-plafond', 7, 0), num('q17-murs', 5, 0), num('q17-plan', 3, 0), num('q17-facteur', 753, 0)] }],
    indice: 'Plafond et murs clairs, tables claires (DTR 7) ; tableau des facteurs de réflexion au DTR 8.',
    explication: 'Plafond clair : 7 ; murs clairs : 5 ; plan utile clair : 3 → facteur de réflexion 753.',
  },
  {
    num: 18, partie: 2, type: 'tableau',
    enonce: '**Rechercher** le facteur d’utilance "U".',
    competence: 'C3', points: 2, dtr: [10, 7], pageSujet: 13,
    colonnes: ['Donnée', 'Valeur', 'Donnée', 'Valeur'],
    lignes: [
      { cellules: ['Classe du luminaire', txt('q18-classe', ['C', 'classe C']), 'Facteur de réflexion', num('q18-reflexion', 753, 0)] },
      { cellules: ['Rapport de suspension J', num('q18-j', 0, 0), 'Indice du local', num('q18-k', 0.8, 0)] },
      { cellules: ['Facteur d’utilance en % U =', num('q18-u-pct', 68, 0), 'Facteur d’utilance en décimale U =', num('q18-u', 0.68, 0)] },
    ],
    indice: 'Tableau d’utilance « Luminaire classe C, J = 0 » (DTR 10), ligne k = 0,80, colonne 753.',
    // Corrigé officiel : il écrit « 756 » pour le facteur de réflexion ici (coquille : Q17 donne 753).
    explication: 'Classe C ; J = 0 ; facteur de réflexion 753 ; indice du local 0,8 → U = 68 %, soit U = 0,68.',
  },
  {
    num: 19, partie: 2, type: 'calcul',
    enonce: '**Calculer** le facteur de dépréciation "d".',
    competence: 'C3', points: 2, dtr: [8, 7], pageSujet: 13,
    grandeur: 'd',
    formule: 'd = (1 / Fe) × (1 / FL) × (1 / Fm)',
    formuleMotsCles: ['fe', 'fl', 'fm'],
    attendu: 1.54, tolerance: 0.01, arrondi: '2 décimales',
    indice: 'Critères de dépréciation faibles (DTR 7) : Fe = 0,9 ; FL = 0,9 ; Fm = 0,8 (DTR 8).',
    explication: 'd = (1/0,9) × (1/0,9) × (1/0,8) = 1,54.',
  },
  {
    num: 20, partie: 2, type: 'valeur',
    enonce: '**Rechercher** le rendement du luminaire "η".',
    competence: 'C3', points: 1, dtr: [7], pageSujet: 14,
    champs: [{ id: 'eta', label: 'Rendement du luminaire η =', attendu: 1, tolerance: 0, acceptes: ['100 %', '100%', '1 (100 %)', '100 % soit 1'] }],
    indice: 'Caractéristiques des luminaires de l’atelier (DTR 7).',
    explication: 'Le rendement des dalles à LED est de 100 % : η = 1.',
  },
  {
    num: 21, partie: 2, type: 'calcul',
    enonce: '**Calculer** le flux lumineux total à produire "F" en lumen.',
    competence: 'C3', points: 2, dtr: [8], pageSujet: 14,
    grandeur: 'F', unite: 'lm',
    formule: 'F = (E × L × l × d) / (U × η)',
    formuleMotsCles: ['d', 'u', '/'],
    attendu: 49116, tolerance: 491,
    indice: 'F = E × L × l × d / (U × η) avec E = 425 lux, d = 1,54, U = 0,68, η = 1.',
    explication: 'F = (425 × 8,1 × 6,3 × 1,54) / (0,68 × 1) = 49 116 lumens. Pour la suite, on prend F = 49 200 lm.',
  },
  {
    num: 22, partie: 2, type: 'valeur',
    enonce: '**Rechercher** le flux lumineux d’une dalle à LED "f".',
    contexte: 'Pour la suite, nous prendrons le flux lumineux "F" égal à 49 200.',
    competence: 'C3', points: 1, dtr: [11], pageSujet: 14,
    champs: [{ id: 'f', label: 'Flux lumineux d’une dalle en lumen f =', unite: 'lm', attendu: 4320, tolerance: 0 }],
    indice: 'Fiche de données du PANEL 600 (DTR 11), données photométriques.',
    explication: 'f = 4 320 lumens.',
  },
  {
    num: 23, partie: 2, type: 'calcul',
    enonce: '**Déterminer** le nombre de luminaires "N" à commander.',
    competence: 'C3', points: 2, dtr: [8, 11], pageSujet: 14,
    grandeur: 'N',
    formule: 'N = F / (η × f)',
    formuleMotsCles: ['f', '/'],
    // 11,38 (non arrondi) et 12 (luminaires à commander) sont acceptés.
    attendu: 12, tolerance: 0.65, arrondi: 'nombre entier de luminaires (arrondi au supérieur)',
    indice: 'N = F / (η × f) avec F = 49 200 lm ; un nombre de luminaires s’arrondit toujours au supérieur.',
    explication: 'N = 49 200 / (1 × 4 320) = 11,38, soit 12 dalles à LED.',
  },
  {
    num: 24, partie: 2, type: 'tableau',
    enonce: '**Chiffrer** le devis "éclairage" de l’atelier principal de l’espace d’innovation partagé (EIP), sachant que le coût d’une dalle à LED est de 46,94 € HT.',
    contexte: 'Pour la suite, nous prendrons 12 dalles à LED. Devis du matériel d’éclairage de l’atelier principal du FABLAB.',
    competence: 'C11', points: 2, dtr: [11], pageSujet: 15,
    colonnes: ['Désignation', 'Référence', 'PU HT (€)', 'Quantité', 'Prix total HT (€)'],
    lignes: [
      { cellules: ['DALLE à LED', 'PANEL 600', num('q24-pu', 46.94, 0.005), num('q24-qte', 12, 0), num('q24-ht', 563.28, 0.02)] },
      { cellules: ['', '', '', 'TVA (20 %)', num('q24-tva', 112.66, 0.02)] },
      { cellules: ['', '', '', 'Prix total TTC', num('q24-ttc', 675.94, 0.02)] },
    ],
    explication: '12 × 46,94 = 563,28 € HT ; TVA 20 % = 112,66 € ; total TTC = 675,94 €.',
  },
  {
    num: 25, partie: 2, type: 'calcul',
    enonce: '**Calculer** la puissance consommée "Pt" par l’ensemble des dalles si elles fonctionnent à 100 % de leur puissance.',
    competence: 'C3', points: 1, dtr: [11], pageSujet: 15,
    grandeur: 'Pt', unite: 'W',
    formule: 'Pt = N × P',
    formuleMotsCles: ['n', 'p'],
    attendu: 432, tolerance: 0,
    indice: 'Puissance nominale d’une dalle : DTR 11.',
    explication: 'Pt = 12 × 36 = 432 W.',
  },
  {
    num: 26, partie: 2, type: 'calcul',
    enonce: '**Calculer** l’énergie consommée "W" (en kWh) pour une heure de fonctionnement.',
    competence: 'C3', points: 1, dtr: [11], pageSujet: 15,
    grandeur: 'W', unite: 'kWh',
    formule: 'W = Pt × t',
    formuleMotsCles: ['pt', 't'],
    attendu: 0.432, tolerance: 0.0005,
    indice: 'Convertir la puissance en kW avant de multiplier par 1 h.',
    explication: 'W = 0,432 × 1 = 0,432 kWh.',
  },
  {
    num: 27, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût d’achat (€/h) de l’ensemble des luminaires pour une heure de fonctionnement, sachant que les luminaires ont une durée de vie de 60 000 heures. (Arrondir à 5 chiffres après la virgule)',
    competence: 'C1', points: 1, dtr: [], pageSujet: 15,
    grandeur: 'coût d’achat', unite: '€/h',
    formule: 'coût d’achat horaire = prix total TTC / durée de vie',
    formuleMotsCles: [],
    attendu: 0.01127, tolerance: 0.00001, arrondi: '5 chiffres après la virgule',
    indice: 'Diviser le prix total TTC du devis (Q24) par la durée de vie.',
    explication: '675,94 / 60 000 = 0,01127 €/h.',
  },
  {
    num: 28, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût de la consommation (€/h) des dalles pour une heure de fonctionnement, sachant que le prix du kWh est de 0,13 euro. (Arrondir à 5 chiffres après la virgule)',
    competence: 'C1', points: 1, dtr: [], pageSujet: 16,
    grandeur: 'coût de consommation', unite: '€/h',
    formule: 'coût de consommation = W × prix du kWh',
    formuleMotsCles: [],
    attendu: 0.05616, tolerance: 0.00001, arrondi: '5 chiffres après la virgule',
    explication: '0,432 × 0,13 = 0,05616 €/h.',
  },
  {
    num: 29, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût total achat + consommation (€/h) des dalles par heure de fonctionnement. (Arrondir à 5 chiffres après la virgule)',
    competence: 'C1', points: 1, dtr: [], pageSujet: 16,
    grandeur: 'coût total', unite: '€/h',
    formule: 'coût total = coût d’achat + coût de consommation',
    formuleMotsCles: [],
    attendu: 0.06743, tolerance: 0.00001, arrondi: '5 chiffres après la virgule',
    explication: '0,01127 + 0,05616 = 0,06743 €/h.',
  },
  {
    num: 30, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût total annuel (achat + consommation) des dalles (€/an).',
    contexte: 'Sachant que l’atelier principal de l’espace d’innovation partagé (EIP) est éclairé 8 heures par jour, 5 jours par semaine et sur une moyenne de 36 semaines par an.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 16,
    grandeur: 'coût annuel', unite: '€/an',
    formule: 'coût annuel = coût total horaire × 8 × 5 × 36',
    formuleMotsCles: [],
    attendu: 97.1, tolerance: 0.97,
    explication: '0,06743 × 8 × 5 × 36 = 97,10 €/an.',
  },
  {
    num: 31, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût d’achat des anciens luminaires pour ces 6 luminaires.',
    contexte: 'Les anciens luminaires (L13, L14, L15, L16, L17 et L18) avaient une puissance totale de 900 W, une consommation énergétique de 0,9 kWh ainsi qu’une durée de vie de 10 000 heures pour un prix unitaire de 19,90 € TTC.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 17,
    grandeur: 'coût d’achat', unite: '€',
    formule: 'coût d’achat = prix unitaire × 6',
    formuleMotsCles: [],
    attendu: 119.4, tolerance: 0.01,
    explication: '19,90 × 6 = 119,40 €.',
  },
  {
    num: 32, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût d’achat (€/h) des anciens luminaires par heure de fonctionnement, sachant que ces lampes ont une durée de vie de 10 000 heures. (Arrondir à 5 chiffres après la virgule)',
    competence: 'C1', points: 1, dtr: [], pageSujet: 17,
    grandeur: 'coût d’achat horaire', unite: '€/h',
    formule: 'coût d’achat horaire = coût d’achat / durée de vie',
    formuleMotsCles: [],
    attendu: 0.01194, tolerance: 0.00001, arrondi: '5 chiffres après la virgule',
    explication: '119,40 / 10 000 = 0,01194 €/h.',
  },
  {
    num: 33, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût de la consommation (€/h) de ces anciens luminaires pour une heure de fonctionnement, sachant que le prix du kWh est de 0,13 euro.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 17,
    grandeur: 'coût de consommation', unite: '€/h',
    formule: 'coût de consommation = W × prix du kWh',
    formuleMotsCles: [],
    attendu: 0.117, tolerance: 0.0012,
    explication: '0,9 × 0,13 = 0,117 €/h.',
  },
  {
    num: 34, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût total achat + consommation (€/h) des anciens luminaires par heure de fonctionnement. (Arrondir à 5 chiffres après la virgule)',
    competence: 'C1', points: 1, dtr: [], pageSujet: 17,
    grandeur: 'coût total', unite: '€/h',
    formule: 'coût total = coût d’achat + coût de consommation',
    formuleMotsCles: [],
    attendu: 0.12894, tolerance: 0.00001, arrondi: '5 chiffres après la virgule',
    explication: '0,117 + 0,01194 = 0,12894 €/h.',
  },
  {
    num: 35, partie: 2, type: 'calcul',
    enonce: '**Calculer** le coût total annuel achat + consommation (€/an) des anciens luminaires.',
    contexte: 'Sachant que l’atelier principal de l’espace d’innovation partagé (EIP) est éclairé 8 heures par jour, 5 jours par semaine et sur une moyenne de 36 semaines par an.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 18,
    grandeur: 'coût annuel', unite: '€/an',
    formule: 'coût annuel = coût total horaire × 8 × 5 × 36',
    formuleMotsCles: [],
    attendu: 185.67, tolerance: 1.86,
    explication: '0,12894 × 8 × 5 × 36 = 185,67 €/an.',
  },
  {
    num: 36, partie: 2, type: 'calcul',
    enonce: '**Calculer** la durée de vie en année pour les anciens luminaires.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 18,
    grandeur: 'durée de vie', unite: 'ans',
    formule: 'durée de vie (ans) = durée de vie (h) / (5 × 8 × 36)',
    formuleMotsCles: [],
    attendu: 6.94, tolerance: 0.07,
    explication: '10 000 / (5 × 8 × 36) = 6,94 ans.',
  },
  {
    num: 37, partie: 2, type: 'calcul',
    enonce: '**Calculer** la durée de vie en année pour les dalles à LED.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 18,
    grandeur: 'durée de vie', unite: 'ans',
    formule: 'durée de vie (ans) = durée de vie (h) / (5 × 8 × 36)',
    formuleMotsCles: [],
    // Corrigé officiel : 41,66 (troncature) ; 41,67 accepté.
    attendu: 41.66, tolerance: 0.42,
    explication: '60 000 / (5 × 8 × 36) = 41,66 ans.',
  },
  {
    num: 38, partie: 2, type: 'redige',
    enonce: '**Conclure** sur l’intérêt du changement des anciens luminaires par des dalles à LED.',
    competence: 'C1', points: 1, dtr: [], pageSujet: 18,
    motsCles: ['econom', 'energie', 'moins', 'duree', 'cout', 'rentab', 'main'], minMotsCles: 2, lignes: 4,
    corrige: 'Le lycée va économiser de l’énergie. Il faudra changer les dalles 7 fois moins souvent d’où un gain important en termes de main d’œuvre. (Accepter les réponses qui démontrent une bonne capacité d’analyse du candidat.)',
    indice: 'Comparer les coûts annuels (Q30 / Q35) et les durées de vie (Q36 / Q37).',
    explication: 'Économie d’énergie (97,10 €/an contre 185,67 €/an) et durée de vie 6 fois plus longue : moins de remplacements, gain de main d’œuvre.',
  },

  /* ═══════════════ PARTIE 3 ═══════════════ */
  {
    num: 39, partie: 3, type: 'bulles',
    enonce: '**Identifier** les ambiances ou zones (A). Sur le plan 3D ci-dessous, **noter** le chiffre correspondant à la zone (A) dans les bulles.',
    contexte: 'L’objectif est de répondre aux questions suivantes à l’aide de la documentation technique et des informations de la page précédente.',
    competence: 'C1', points: 1, dtr: [13, 12], pageSujet: 20,
    plan: { src: `${IMG}/q39-plan.jpg`, alt: 'Plan 3D du rez-de-chaussée de l’EIP avec les bulles A et PL' },
    bulles: [
      { id: 'A-atelier', x: 4.74, y: 7.85, attendu: '1' },
      { id: 'A-sanitaire', x: 76.68, y: 7.85, attendu: '3' },
      { id: 'A-electronique', x: 96.05, y: 47.1, attendu: '2' },
    ],
    choix: ['1', '2', '3'],
    indice: 'Tableau « Ambiance ou zone (A) » du cahier des charges (DTR 13) : atelier principal, atelier électronique, sanitaire.',
    explication: 'Atelier principal : A = 1 ; atelier électronique : A = 2 ; sanitaire : A = 3.',
  },
  {
    num: 40, partie: 3, type: 'bulles',
    enonce: '**Identifier** les circuits électriques dans les ambiances ou zones (PL). **Noter** le chiffre correspondant au circuit électrique de la zone (PL) dans les bulles.',
    competence: 'C1', points: 2, dtr: [13, 12], pageSujet: 20,
    plan: { src: `${IMG}/q40-plan.jpg`, alt: 'Plan 3D du rez-de-chaussée de l’EIP avec les bulles PL' },
    bulles: [
      { id: 'PL-sanitaire', x: 67.98, y: 27.3, attendu: '1' },
      { id: 'PL-elec-eclairage', x: 75.63, y: 46.08, attendu: '1' },
      { id: 'PL-elec-volet', x: 81.82, y: 58.53, attendu: '2' },
      { id: 'PL-atelier-eclairage', x: 37.55, y: 53.75, attendu: '1' },
      { id: 'PL-atelier-v1v2', x: 13.83, y: 67.41, attendu: '2' },
      { id: 'PL-atelier-v3v4', x: 43.87, y: 75.26, attendu: '3' },
    ],
    choix: ['1', '2', '3'],
    indice: 'Colonne « Point Ligne (PL) » du DTR 13 : éclairage, volets circuit 1, volets circuit 2…',
    explication: 'Atelier principal : éclairage PL 1, volets V1-V2 PL 2, volets V3-V4 PL 3 ; atelier électronique : éclairage PL 1, volet V5 PL 2 ; sanitaire : éclairage PL 1.',
  },
  {
    num: 41, partie: 3, type: 'valeur',
    enonce: '**Donner** la tension d’alimentation fournie par le bus SCS (MY HOME).',
    contexte: 'Implantation du tableau électrique (partie étudiée). L’objectif est de répondre aux questions suivantes à l’aide de la documentation technique.',
    competence: 'C1', points: 1, dtr: [14, 20], pageSujet: 21,
    image: { src: `${IMG}/q41-tableau.jpg`, alt: 'Implantation du tableau électrique : AL1 et actionneurs KA1 à KA6' },
    champs: [{ id: 'U', label: 'Tension :', unite: 'V DC', attendu: 27, tolerance: 0, acceptes: ['27 VDC', '27 V DC', '27 Vcc', '27 V continu', '27 V='] }],
    explication: 'Tension : 27 V DC (très basse tension continue).',
  },
  {
    num: 42, partie: 3, type: 'valeur',
    enonce: '**Donner** le courant maximal que peut fournir l’alimentation sur le bus SCS (MY HOME).',
    competence: 'C1', points: 1, dtr: [18, 20], pageSujet: 21,
    champs: [{ id: 'I', label: 'I =', unite: 'A', attendu: 1.2, tolerance: 0, acceptes: ['1200 mA'] }],
    explication: 'I = 1,2 A.',
  },
  {
    num: 43, partie: 3, type: 'valeur',
    enonce: '**Donner** la longueur maximale de câble entre l’alimentation et l’actionneur le plus éloigné.',
    competence: 'C1', points: 1, dtr: [18], pageSujet: 21,
    champs: [{ id: 'Lmax', label: 'Longueur max :', unite: 'm', attendu: 250, tolerance: 0 }],
    explication: 'Longueur max : 250 m.',
  },
  {
    num: 44, partie: 3, type: 'redige',
    enonce: 'Pour une répartition optimale des courants de la ligne de bus, **préciser** l’endroit où l’alimentation doit-être câblée.',
    competence: 'C1', points: 1, dtr: [18], pageSujet: 21,
    motsCles: ['centre', 'milieu'], minMotsCles: 1, lignes: 1,
    corrige: 'L’alimentation doit être placée au centre.',
    explication: 'L’alimentation doit être placée au centre de la ligne de bus (DTR 18).',
  },
  {
    num: 45, partie: 3, type: 'valeur',
    enonce: '**Déterminer** la référence et la section du câble bus SCS (100 m) à utiliser.',
    competence: 'C3', points: 1, dtr: [20], pageSujet: 21,
    champs: [
      { id: 'ref', label: 'Référence :', acceptes: ['L4669', 'L 4669'] },
      { id: 'section', label: 'Section :', acceptes: ['2 x 0,35 mm²', '2 x 0,35 mm2', '2 x 0,35', '2x0,35mm²', '2 × 0,35 mm²', '2 conducteurs de 0,35 mm²', '0,35 mm²', '0,35 mm2', '0,35'] },
    ],
    explication: 'Référence : L4669 (couronne de 100 m) ; section : 2 × 0,35 mm².',
  },
  {
    num: 46, partie: 3, type: 'tableau',
    enonce: '**Compléter** le tableau suivant, en choisissant l’alimentation, à l’aide des informations trouvées précédemment (on prendra en compte le courant maximum).',
    competence: 'C3', points: 1, dtr: [20], pageSujet: 22,
    colonnes: ['Repère', 'Alimentation — Entrée', 'Alimentation — Sortie', 'Référence'],
    lignes: [{ cellules: [
      'AL1',
      num('q46-entree', 230, 0, ['230 VAC', '230 V~', '230 V AC', '230 V alternatif']),
      num('q46-sortie', 27, 0, ['27 VDC 1,2 A', '27 V DC 1,2 A', '27 Vcc 1,2 A', '27 V= 1,2 A']),
      txt('q46-ref', ['E46ADCN', 'E46 ADCN']),
    ] }],
    explication: 'AL1 : entrée 230 VAC — sortie 27 VDC 1,2 A — référence E46ADCN.',
  },
  {
    num: 47, partie: 3, type: 'valeur',
    enonce: '**Choisir** la référence de l’actionneur qui permet d’alimenter l’éclairage ; on choisira un actionneur à une sortie.',
    contexte: 'L’objectif est de répondre aux questions suivantes à l’aide de la documentation technique.',
    competence: 'C3', points: 1, dtr: [21, 32], pageSujet: 22,
    champs: [{ id: 'ref', label: 'Référence', acceptes: ['F411/1NC', 'F411 / 1NC', 'F4111NC', 'F411/1N', 'F411 1NC'] }],
    explication: 'Référence F411/1NC (actionneur DIN 1 relais, 1 sortie 10 A).',
  },
  {
    num: 48, partie: 3, type: 'valeur',
    enonce: '**Indiquer** le nombre de lampes LED que l’on peut alimenter.',
    competence: 'C3', points: 1, dtr: [21], pageSujet: 22,
    champs: [{ id: 'n', label: 'Nombre de lampes LED', attendu: 10, tolerance: 0 }],
    explication: 'Fluocompacte et LED : maxi 10 lampes.',
  },
  {
    num: 49, partie: 3, type: 'valeur',
    enonce: '**Préciser** le courant admissible pour la sortie.',
    competence: 'C3', points: 1, dtr: [21, 32], pageSujet: 22,
    champs: [{ id: 'I', label: 'I =', unite: 'A', attendu: 10, tolerance: 0 }],
    explication: 'I = 10 A.',
  },
  {
    num: 50, partie: 3, type: 'tableau',
    enonce: '**Choisir** les références des actionneurs qui permettent d’alimenter des volets roulants et **donner** le courant admissible pour chaque sortie.',
    competence: 'C3', points: 1, dtr: [21, 34, 38], pageSujet: 22,
    colonnes: ['Local', 'Référence', 'Courant'],
    lignes: [
      { cellules: ['atelier principal', txt('q50-ref-atelier', ['F411/4', 'F411 / 4', 'F4114']), num('q50-i-atelier', 2, 0)] },
      { cellules: ['atelier électronique', txt('q50-ref-elec', ['F411U2', 'F411 U2', 'F411/U2']), num('q50-i-elec', 10, 0)] },
    ],
    explication: 'Atelier principal : F411/4 (4 sorties 2 A) ; atelier électronique : F411U2 (2 sorties 10 A).',
  },
  {
    num: 51, partie: 3, type: 'tableau',
    enonce: '**Compléter** le tableau suivant des actionneurs.',
    competence: 'C3', points: 2, dtr: [21, 32, 34, 38], pageSujet: 23,
    colonnes: ['Charge', 'Repère', 'Référence', 'Caractéristiques contacts'],
    lignes: [
      { cellules: ['Éclairage Atelier', 'KA1', txt('q51-ref-ka1', ['F411/1NC', 'F411 / 1NC', 'F411/1N']), txt('q51-c-ka1', CONTACT_NONC)] },
      { cellules: ['Volets de l’Atelier', 'KA2 et KA3', txt('q51-ref-ka23', ['F411/4', 'F411 / 4']), txt('q51-c-ka23', ['4 contacts NO', '4 contacts', '4 NO', '4 sorties', '4 contacts NO 2 A', '4 contacts à fermeture', '4 relais NO'])] },
      { cellules: ['Éclairage de l’Atelier électronique', 'KA5', txt('q51-ref-ka5', ['F411/1NC', 'F411 / 1NC', 'F411/1N']), txt('q51-c-ka5', CONTACT_NONC)] },
      { cellules: ['Volets de l’atelier électronique', 'KA6', txt('q51-ref-ka6', ['F411U2', 'F411 U2', 'F411/U2']), txt('q51-c-ka6', ['2 contacts NO', '2 contacts', '2 NO', '2 sorties', '2 contacts NO 10 A', '2 contacts à fermeture', '2 relais NO'])] },
      { cellules: ['Éclairage sanitaire', 'KA4', txt('q51-ref-ka4', ['F411/1NC', 'F411 / 1NC', 'F411/1N']), txt('q51-c-ka4', CONTACT_NONC)] },
    ],
    explication: 'KA1, KA5, KA4 : F411/1NC — 1 contact NO NC ; KA2 et KA3 : F411/4 — 4 contacts NO ; KA6 : F411U2 — 2 contacts NO.',
  },
  {
    num: 52, partie: 3, type: 'valeur',
    enonce: '**Déterminer** le détecteur de présence à utiliser.',
    contexte: 'Cahier des charges : détecteur bus/SCS pour petit local (toilettes) ; montage encastré.',
    competence: 'C3', points: 1, dtr: [22, 23], pageSujet: 23,
    champs: [{ id: 'ref', label: 'Détecteur de présence S3 — Référence', acceptes: ref('0 784 85', '078485') }],
    explication: 'Détecteur de présence S3 : référence 078485 (0 784 85).',
  },
  {
    num: 53, partie: 3, type: 'redige',
    enonce: '**Compléter** le tableau en donnant les paramètres de configuration.',
    contexte: 'L’objectif est de répondre aux questions suivantes à l’aide de la documentation technique. Tableau « Paramètres de configuration » (6 lignes) du détecteur S3.',
    competence: 'C6', points: 1, dtr: [25, 26], pageSujet: 23,
    motsCles: ['area', 'ambiance', 'point', 'modalit', 'sensibilit', 'time', 'tempo', 'seuil', 'lumin'], minMotsCles: 5, lignes: 6,
    corrige: 'A : Area (0 – A) ; PL : Point light (0 – F) ; M : Modalité (0 – 4) ; S : Sensibilité du détecteur de mouvement (0 – 3) ; T : Time delay (0 – 9) ; D : Seuil de luminosité ou daylight set point (0 – 5).',
    indice: 'Configuration physique du détecteur (DTR 25-26) : configurateurs A, PL, M, S, T, D.',
    explication: 'A : Area (0 – A) ; PL : Point light (0 – F) ; M : Modalité (0 – 4) ; S : Sensibilité (0 – 3) ; T : Time delay (0 – 9) ; D : seuil de luminosité (0 – 5).',
  },
  {
    num: 54, partie: 3, type: 'tableau',
    enonce: '**Compléter** le tableau suivant des commandes.',
    contexte: 'Cahier des charges : série celiane blanc.',
    competence: 'C3', points: 2, dtr: [27, 28], pageSujet: 24,
    colonnes: ['Repère', 'Fonction', 'Mécanisme', 'Enjoliveur', 'Bague'],
    lignes: [
      { cellules: ['Bouton poussoir S1 (1 fonction)', 'Générale GEN', txt('q54-s1-meca', ref('0 675 52')), txt('q54-s1-enj', ref('0 681 80')), txt('q54-bague', ref('0 680 00'))] },
      { cellules: ['Bouton poussoir S2 (2 fonctions)', 'Éclairage Cde gauche', txt('q54-s2-meca', ref('0 675 52')), txt('q54-s2-enj-g', ref('0 681 48')), ''] },
      { cellules: ['', 'Volets Cde droite', '', txt('q54-s2-enj-d', ref('0 682 69')), ''] },
      { cellules: ['Bouton poussoir S4 (2 fonctions)', 'Éclairage Cde gauche', txt('q54-s4-meca', ref('0 675 52')), txt('q54-s4-enj-g', ref('0 681 48')), ''] },
      { cellules: ['', 'Volets Cde droite', '', txt('q54-s4-enj-d', ref('0 682 69')), ''] },
    ],
    indice: 'Mécanisme de commande BUS (DTR 27) + enjoliveurs et bague blancs (DTR 28).',
    explication: 'Mécanisme 0 675 52 pour S1, S2 et S4 ; enjoliveurs : S1 GEN 0 681 80 ; S2 et S4 éclairage (gauche) 0 681 48, volets (droite) 0 682 69 ; bague 0 680 00.',
  },
  {
    num: 55, partie: 3, type: 'tableau',
    enonce: '**Déterminer** le type du disjoncteur différentiel en amont. **Justifier** votre réponse.',
    contexte: 'Implantation du tableau électrique (partie étudiée) : Q1 différentiel 30 mA, Q2 à Q8.',
    competence: 'C3', points: 1, dtr: [29], pageSujet: 24,
    image: { src: `${IMG}/q55-tableau.jpg`, alt: 'Implantation du tableau : Q1 différentiel 30 mA et disjoncteurs Q2 à Q8' },
    colonnes: ['Type', 'Justification'],
    lignes: [{ cellules: [choix('q55-type', ['AC', 'A'], 'A'), libre('q55-just')] }],
    indice: 'Le différentiel amont protège des circuits spécialisés (alimentation électronique, actionneurs) : voir « La protection des personnes » (DTR 29).',
    explication: 'Type A : protection des circuits spéciaux, prévu pour être associé à des appareils particuliers ; ce différentiel détecte les défauts à composantes alternative et continue.',
  },
  {
    num: 56, partie: 3, type: 'tableau',
    enonce: '**Proposer** le choix des protections (normes C15-100). On choisira des connexions de type vis/vis.',
    competence: 'C3', points: 2, dtr: [30, 31, 29], pageSujet: 25,
    colonnes: ['Protection circuit', 'Repère', 'Calibre', 'Référence'],
    lignes: [
      { cellules: ['Disjoncteur différentiel — courant', 'Q1', num('q56-q1-i', 40, 0), txt('q56-q1-ref', ref('0 928 98'))] },
      { cellules: ['Disjoncteur différentiel — sensibilité', 'Q1', num('q56-q1-sens', 30, 0, ['30 mA', '0,03 A']), ''] },
      { cellules: ['Alimentation Bus MY HOME', 'Q2', num('q56-q2-i', 2, 0), txt('q56-q2-ref', ref('4 067 71'))] },
      { cellules: ['Éclairage Atelier', 'Q3', num('q56-q3-i', 16, 0), txt('q56-q3-ref', ref('4 067 74'))] },
      { cellules: ['Volets atelier', 'Q4 et Q5', num('q56-q45-i', 16, 0), txt('q56-q45-ref', ref('4 067 74'))] },
      { cellules: ['Éclairage Atelier électronique', 'Q6', num('q56-q6-i', 16, 0), txt('q56-q6-ref', ref('4 067 74'))] },
      { cellules: ['Volets Atelier électronique', 'Q7', num('q56-q7-i', 16, 0), txt('q56-q7-ref', ref('4 067 74'))] },
      { cellules: ['Éclairage sanitaire', 'Q8', num('q56-q8-i', 16, 0), txt('q56-q8-ref', ref('4 067 74'))] },
    ],
    indice: 'Protections par circuit (DTR 30) puis références des disjoncteurs DNX³ vis/vis (DTR 31).',
    explication: 'Q1 : 40 A, 30 mA, 0 928 98 ; Q2 : 2 A, 4 067 71 ; Q3 à Q8 : 16 A, 4 067 74.',
  },
  {
    num: 57, partie: 3, type: 'cavaliers',
    enonce: '**Configuration** des composants MY HOME. **Compléter** les tableaux ci-dessous en fixant les cavaliers correspondant à la configuration de l’installation.',
    contexte: 'Configuration du détecteur de présence S3 — Modalités : mode On/Off automatique & sans régulation & avec détection de présence ; Sensibilité : moyenne ; Time delay : 15 mn ; Seuil luminosité : 300 lux.',
    competence: 'C6', points: 2, dtr: [13, 17, 19, 26], pageSujet: 26,
    image: { src: `${IMG}/q57-cavaliers.jpg`, alt: 'Tableaux de configuration des cavaliers : commandes S1 à S4 et actionneurs KA1 à KA6' },
    composants: [
      { id: 'S1', label: 'S1', positions: [
        { id: 'A', label: 'A', attendu: 'GEN' }, { id: 'PL', label: 'PL', attendu: '—' }, { id: 'M', label: 'M', attendu: 'OFF' },
      ] },
      { id: 'S2-1', label: 'S2-1', positions: [
        { id: 'A', label: 'A', attendu: '1' }, { id: 'PL', label: 'PL', attendu: '1' }, { id: 'M', label: 'M', attendu: 'O/I' },
      ] },
      { id: 'S2-2', label: 'S2-2', positions: [
        { id: 'A', label: 'A', attendu: '1' }, { id: 'PL', label: 'PL', attendu: '2' }, { id: 'M', label: 'M', attendu: '↑↓' },
      ] },
      { id: 'S3', label: 'S3', positions: [
        { id: 'A', label: 'A', attendu: '3' }, { id: 'PL', label: 'PL', attendu: '1' }, { id: 'M', label: 'M', attendu: '—' },
        { id: 'S', label: 'S', attendu: '1' }, { id: 'T', label: 'T', attendu: '6' }, { id: 'D', label: 'D', attendu: '3' },
      ] },
      { id: 'S4-1', label: 'S4-1', positions: [
        { id: 'A', label: 'A', attendu: '2' }, { id: 'PL', label: 'PL', attendu: '1' }, { id: 'M', label: 'M', attendu: 'O/I' },
      ] },
      { id: 'S4-2', label: 'S4-2', positions: [
        { id: 'A', label: 'A', attendu: '2' }, { id: 'PL', label: 'PL', attendu: '2' }, { id: 'M', label: 'M', attendu: '↑↓' },
      ] },
      { id: 'KA1', label: 'KA1', positions: [{ id: 'A', label: 'A', attendu: '1' }, { id: 'PL1', label: 'PL1', attendu: '1' }] },
      { id: 'KA2', label: 'KA2', positions: [
        { id: 'A', label: 'A', attendu: '1' }, { id: 'PL1', label: 'PL1', attendu: '2' }, { id: 'PL2', label: 'PL2', attendu: '2' },
        { id: 'PL3', label: 'PL3', attendu: '2' }, { id: 'PL4', label: 'PL4', attendu: '2' },
      ] },
      // Corrigé officiel : KA3 en PL 2 (comme KA2, commandé par S2-2), alors que Q40 / DTR 13 donnent PL 3 aux volets V3-V4.
      { id: 'KA3', label: 'KA3', positions: [
        { id: 'A', label: 'A', attendu: '1' }, { id: 'PL1', label: 'PL1', attendu: '2' }, { id: 'PL2', label: 'PL2', attendu: '2' },
        { id: 'PL3', label: 'PL3', attendu: '2' }, { id: 'PL4', label: 'PL4', attendu: '2' },
      ] },
      { id: 'KA4', label: 'KA4', positions: [{ id: 'A', label: 'A', attendu: '3' }, { id: 'PL1', label: 'PL1', attendu: '1' }] },
      { id: 'KA5', label: 'KA5', positions: [{ id: 'A', label: 'A', attendu: '2' }, { id: 'PL1', label: 'PL1', attendu: '1' }] },
      { id: 'KA6', label: 'KA6', positions: [
        { id: 'A', label: 'A', attendu: '2' }, { id: 'PL1', label: 'PL1', attendu: '2' }, { id: 'PL2', label: 'PL2', attendu: '2' },
      ] },
    ],
    valeurs: ['—', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'GEN', 'AMB', 'GR', 'O/I', 'ON', 'OFF', 'PUL', '↑↓'],
    indice: 'A et PL : zones et points lumineux (Q39-Q40, DTR 13) ; M : mode de fonctionnement (DTR 19) ; S, T, D du détecteur : DTR 26 (moyenne, 15 min, 300 lux).',
    explication: 'S1 : A = GEN, M = OFF ; S2-1 : A1 PL1 M O/I ; S2-2 : A1 PL2 M ↑↓ ; S3 : A3 PL1 S1 T6 D3 ; S4-1 : A2 PL1 M O/I ; S4-2 : A2 PL2 M ↑↓ ; KA1 : A1 PL1 ; KA2 et KA3 : A1, PL1 à PL4 = 2 ; KA4 : A3 PL1 ; KA5 : A2 PL1 ; KA6 : A2, PL1 = PL2 = 2.',
  },
  {
    num: 58, partie: 3, type: 'schema',
    enonce: '**Compléter** le schéma électrique de l’installation.',
    competence: 'C11', points: 4, dtr: [17, 20, 32, 37, 41], pageSujet: 27,
    image: { src: `${IMG}/q58-sujet.jpg`, alt: 'Schéma électrique MyHOME à compléter' },
    traits: Q58_TRAITS,
    platineTpId: 'eip-q58-myhome',
    corrigeImage: { src: `${IMG}/q58-corrige.jpg`, alt: 'Schéma électrique MyHOME — corrigé' },
    indice: 'Q1 alimente Q2 (primaire de AL1) et les disjoncteurs Q3 à Q8 ; AL1 alimente le bus (2 fils) qui passe par tous les actionneurs ; chaque disjoncteur envoie la phase sur la borne commune de son actionneur et le neutre directement aux récepteurs ; les lampes d’un même circuit sont en parallèle.',
    explication: 'Corrigé p. 27 : Q1 → Q2 → AL1 (primaire) ; Q1 → Q3…Q8 ; bus AL1 → KA1 → KA4 → KA5 → KA2 → KA3 → KA6 ; Q3/KA1 → L11-L14 ; Q8/KA4 → L1-L6 ; Q6/KA5 → L7-L10 ; Q4/KA2 → V1-V2 ; Q5/KA3 → V3-V4 ; Q7 (repéré -Q6)/KA6 → V5 (L et 3 de KA6 à la phase, N de KA6 au neutre).',
  },

  /* ═══════════════ PARTIE 4 ═══════════════ */
  {
    num: 59, partie: 4, type: 'tableau',
    enonce: '**Compléter** le tableau suivant afin de recenser le matériel nécessaire à la préparation du chantier.',
    contexte: 'Pour la suite de l’étude, il faudra s’appuyer sur le cahier des charges et la documentation technique.',
    competence: 'C3', points: 2, dtr: [42, 43, 44, 45, 46, 50], pageSujet: 28,
    colonnes: ['Matériel', 'Repère', 'Référence', 'Fonction'],
    lignes: [
      { cellules: ['Centrale', 'CEN 1', txt('q59-cen', ['BT348043', 'BT 348043', '348043']), libre('q59-cen-f', 'Fonction…')] },
      { cellules: ['Tête de lecture', 'U1', txt('q59-u1', ['BT348704', 'BT 348704', '348704']), libre('q59-u1-f', 'Fonction…')] },
      { cellules: ['Boitier inox encastré', '', txt('q59-boitier', ['004862', '0 048 62', '04862', '4862']), libre('q59-boitier-f', 'Fonction…')] },
      { cellules: ['Badge bleu', '', txt('q59-badge', ['BT348243', 'BT 348243', '348243']), libre('q59-badge-f', 'Fonction…')] },
      { cellules: ['Bouton poussoir anti vandale', 'S7', txt('q59-bp', ['005522', '0 055 22', '05522', '5522']), libre('q59-bp-f', 'Fonction…')] },
      { cellules: ['Gâche', 'GA1', txt('q59-gache', ['003033', '0 030 33', '03033', '3033']), libre('q59-gache-f', 'Fonction…')] },
    ],
    indice: 'Centrale pour gestion autonome (DTR 42-43), badges et boîtiers (DTR 44), boutons antivandales (DTR 45), gâches à encastrer (DTR 46).',
    explication: 'CEN 1 : BT348043, gestion de l’accès d’une porte à l’aide de badges ; U1 : BT348704, lecture du badge en radiofréquence (RFID) ; boîtier inox encastré : 004862, maintien de la tête de lecture ; badge bleu : BT348243, clé codée (RFID) ; S7 : 005522, permet de sortir de la salle ; GA1 : 003033, déverrouille la porte électriquement.',
  },
  {
    num: 60, partie: 4, type: 'valeur',
    enonce: '**Donner** les caractéristiques de tension d’alimentation et de courant consommé par la centrale.',
    contexte: 'Répondre aux questions suivantes à l’aide de la documentation technique.',
    competence: 'C1', points: 1, dtr: [47], pageSujet: 29,
    champs: [
      { id: 'udc', label: 'Tension (continu) :', acceptes: ['10 - 20 VDC', '10-20 VDC', '10 à 20 VDC', '10-20 V DC', '10 à 20 V DC', '10-20 V', '10 à 20 V', '10-20 Vcc', '10 à 20 Vcc', '10/20 VDC'] },
      { id: 'uac', label: 'Tension (alternatif) :', acceptes: ['12 - 15 VAC 50 Hz', '12-15 VAC 50 Hz', '12-15 VAC', '12 à 15 VAC', '12-15 V AC', '12 à 15 V AC', '12-15 V', '12 à 15 V', '12 à 15 VAC 50 Hz', '12-15 V~', '12/15 VAC'] },
      { id: 'i', label: 'Courant :', unite: 'mA', attendu: 400, tolerance: 0, acceptes: ['400 mA en DC', '0,4 A'] },
    ],
    explication: 'Tension : 10 – 20 VDC / 12 – 15 VAC 50 Hz ; courant : 400 mA en DC.',
  },
  {
    num: 61, partie: 4, type: 'valeur',
    enonce: '**Donner** la tension d’alimentation et le courant consommé par la gâche.',
    competence: 'C1', points: 1, dtr: [46], pageSujet: 29,
    champs: [
      { id: 'u', label: 'Tension :', unite: 'V AC/DC', attendu: 12, tolerance: 0, acceptes: ['12 VAC/DC', '12 V AC/DC', '12 V~/='] },
      { id: 'iac', label: 'Courant en AC :', unite: 'mA', attendu: 300, tolerance: 0, acceptes: ['0,3 A'] },
      { id: 'idc', label: 'Courant en DC :', unite: 'mA', attendu: 400, tolerance: 0, acceptes: ['0,4 A'] },
    ],
    explication: 'Tension : 12 VAC/DC ; courant : 300 mA en AC / 400 mA en DC (gâche 003033).',
  },
  {
    num: 62, partie: 4, type: 'redige',
    enonce: '**Donner** le mode de fonctionnement de la gâche choisie précédemment.',
    competence: 'C1', points: 1, dtr: [46], pageSujet: 29,
    motsCles: ['emission'], minMotsCles: 1, lignes: 1,
    corrige: 'Gâche à émission de courant.',
    explication: 'Gâche à émission de courant.',
  },
  {
    num: 63, partie: 4, type: 'redige',
    enonce: '**Expliquer** succinctement le fonctionnement.',
    competence: 'C1', points: 1, dtr: [46, 52], pageSujet: 29,
    motsCles: ['tension', 'ouvr', 'deverrouill', 'pendant'], minMotsCles: 2, lignes: 3,
    corrige: 'Ouvre la porte lors d’une application d’une tension. Ne reste déverrouillée que pendant la mise sous tension.',
    explication: 'La gâche ouvre la porte lorsqu’on lui applique une tension et ne reste déverrouillée que pendant la mise sous tension.',
  },
  {
    num: 64, partie: 4, type: 'tableau',
    enonce: '**Compléter** le tableau suivant afin de recenser le matériel nécessaire à la préparation du chantier.',
    contexte: '5.2 Choix des alimentations et protection. Pour la suite de l’étude, il faudra s’appuyer sur le cahier des charges et la documentation technique.',
    competence: 'C3', points: 2, dtr: [51, 52, 31], pageSujet: 29,
    colonnes: ['Matériel', 'Repère', 'Calibre', 'Référence'],
    lignes: [
      { cellules: ['Alimentation centrale', 'AL2', '', txt('q64-al2', ref('1 467 11'))] },
      { cellules: ['Disjoncteur', 'Q10', num('q64-q10-i', 2, 0), txt('q64-q10-ref', ref('4 067 71'))] },
      { cellules: ['Alimentation gâche', 'AL3', '', txt('q64-al3', ['336842', '336 842', '3 368 42'])] },
      { cellules: ['Disjoncteur', 'Q11', num('q64-q11-i', 2, 0), txt('q64-q11-ref', ref('4 067 71'))] },
    ],
    explication: 'AL2 : 1 467 11 ; Q10 : 2 A, 4 067 71 ; AL3 : 336842 ; Q11 : 2 A, 4 067 71.',
  },
  {
    num: 65, partie: 4, type: 'valeur',
    enonce: '**Donner** la section minimale du câble reliant l’alimentation et la centrale.',
    competence: 'C3', points: 1, dtr: [48], pageSujet: 30,
    champs: [{ id: 's', label: 'Section minimale', unite: 'mm', attendu: 0.9, tolerance: 0, acceptes: ['9/10', '9/10e', '9/10ème', '9/10 ème', '9/10 mm', '9/10ème de mm', '9/10e mini'] }],
    explication: '9/10ème (0,9 mm), d’après le schéma de branchement de la centrale.',
  },
  {
    num: 66, partie: 4, type: 'tableau',
    enonce: '**Indiquer** s’il est utile de mettre un câble blindé pour relier la tête de lecture. **Justifier** votre réponse.',
    competence: 'C1', points: 1, dtr: [48], pageSujet: 30,
    colonnes: ['oui / non', 'Justification'],
    lignes: [{ cellules: [choix('q66-rep', ['oui', 'non'], 'oui'), libre('q66-just')] }],
    indice: 'Regarder le raccordement de la tête de lecture sur le schéma de branchement (DTR 48).',
    explication: 'Oui : sur le schéma de branchement, la tresse (blindage) est mise au moins.',
  },
  {
    num: 67, partie: 4, type: 'schema',
    enonce: '**Compléter** le schéma électrique de l’installation (page suivante). **Tracer** les fils en couleur : 230 V en noir et bleu ; 12 VAC en bleu ; 12 VDC + vert et – bleu ; U1 et S7 en noir.',
    competence: 'C11', points: 4, dtr: [48, 47, 46, 51, 52], pageSujet: 31,
    image: { src: `${IMG}/q67-sujet.jpg`, alt: 'Schéma électrique VIGIK à compléter' },
    traits: Q67_TRAITS,
    platineTpId: 'eip-q67-vigik',
    corrigeImage: { src: `${IMG}/q67-corrige.jpg`, alt: 'Schéma électrique VIGIK — corrigé' },
    indice: 'AL2 (12 V continu) alimente la centrale par AC-AC ; AL3 (12 V alternatif) alimente la gâche à travers le contact C-T de la centrale ; S7 entre BP et − ; U1 sur L+ et L−.',
    explication: 'Corrigé p. 31 : Q10 → AL2 (L, N) ; Q11 → AL3 (230 V) ; AL2 +V → AC, −V → AC ; AL3 12 V~ → C de la centrale et → gâche ; T de la centrale → gâche ; BP et − → S7 ; L+ et L− → U1.',
  },
  {
    num: 68, partie: 4, type: 'valeur',
    enonce: 'Répondre aux questions suivantes à l’aide de la documentation technique. **Indiquer** le nombre de badges résidents que l’on peut enregistrer.',
    competence: 'C1', points: 1, dtr: [43], pageSujet: 32,
    champs: [{ id: 'n', label: 'Nombre de badges résidents', attendu: 1000, tolerance: 0 }],
    explication: '1 000 badges (jusqu’à 1000 ajouts/suppressions de badges).',
  },
  {
    num: 69, partie: 4, type: 'redige',
    enonce: '**Donner** les deux manières différentes permettant de mettre cela à jour (programmation des badges).',
    competence: 'C6', points: 1, dtr: [50, 49, 47], pageSujet: 32,
    motsCles: ['brocher', 'memoire', 'terminal', '348409'], minMotsCles: 3, lignes: 2,
    corrige: '1. Par débrochage / rebrochage de la mémoire de la centrale. 2. Avec le terminal de programmation réf. BT 348409.',
    explication: '1 : par débrochage / rebrochage de la mémoire de la centrale ; 2 : avec le terminal de programmation réf. BT 348409.',
  },
  {
    num: 70, partie: 4, type: 'tableau',
    enonce: 'Dans le cadre d’une extension future, on se questionne sur l’ajout d’une nouvelle centrale sur l’issue donnant sur l’extérieur. **Préciser** si les badges autorisés fonctionneront sur les deux centrales. **Justifier** votre réponse.',
    competence: 'C6', points: 1, dtr: [49], pageSujet: 32,
    colonnes: ['oui / non', 'Justification'],
    lignes: [{ cellules: [choix('q70-rep', ['oui', 'non'], 'oui'), libre('q70-just')] }],
    explication: 'Oui, un badge peut fonctionner sur 10 centrales différentes.',
  },
  {
    num: 71, partie: 4, type: 'tableau',
    enonce: '**Préciser** si on peut autoriser le rajout d’un badge directement sur la centrale. **Justifier** votre réponse.',
    competence: 'C6', points: 1, dtr: [49], pageSujet: 32,
    colonnes: ['oui / non', 'Justification'],
    lignes: [{ cellules: [choix('q71-rep', ['oui', 'non'], 'oui'), libre('q71-just')] }],
    explication: 'Oui : après la mise sous tension de la centrale, il suffit de débrocher puis rebrocher la mémoire sur la centrale.',
  },
  {
    num: 72, partie: 4, type: 'tableau',
    enonce: '**Indiquer** si on peut supprimer l’accès d’un badge directement sur la centrale. **Justifier** votre réponse.',
    competence: 'C6', points: 1, dtr: [49], pageSujet: 32,
    colonnes: ['oui / non', 'Justification'],
    lignes: [{ cellules: [choix('q72-rep', ['oui', 'non'], 'non'), libre('q72-just')] }],
    explication: 'Non : pour supprimer l’accès d’un badge, il faut un terminal de programmation portatif.',
  },
];

/* ───────────────────────────── Sujet ───────────────────────────── */

/**
 * Sujets thématiques : une partie = un sujet jouable seul, avec sa durée (prorata des
 * points : 300 min × points / 98, arrondi), ses pages de DTR, sa copie et son bilan.
 */
const DECLINAISONS: DeclinaisonSujet[] = [
  { id: 'eip-habilitations', theme: 'securite', titre: 'Habilitations & sécurité', sousTitre: 'Préparation à la rénovation des sanitaires de l’EIP', parties: [1], dureeMin: 60 },
  { id: 'eip-eclairage', theme: 'eclairage', titre: 'Éclairage LED de l’atelier', sousTitre: 'Projet d’éclairage de l’atelier principal de l’EIP', parties: [2], dureeMin: 95 },
  { id: 'eip-myhome', theme: 'domotique', titre: 'Domotique MyHOME (bus SCS)', sousTitre: 'Gestion domotique de l’espace d’innovation partagé', parties: [3], dureeMin: 85 },
  { id: 'eip-vigik', theme: 'acces', titre: 'Contrôle d’accès VIGIK', sousTitre: 'Accès par badges de l’espace d’innovation partagé', parties: [4], dureeMin: 60 },
];

export const SUJET_EIP: SujetNumerique = {
  id: 'eip',
  nomCourt: 'EIP',
  titre: 'Espace d’innovation partagé (EIP) — rénovation électrique',
  sousTitre: 'Sujet d’examen numérique · Bac Pro MELEC · 4 parties · 5 h',
  diploma: 'bacpro',
  dureeMin: 300,
  consignes: [
    'Durée : 5 heures.',
    'L’usage de calculatrice avec mode examen actif est autorisé.',
    'L’usage de calculatrice sans mémoire, « type collège » est autorisé.',
    'L’utilisation de tout autre document est interdite.',
    'Les candidats doivent rendre l’intégralité des documents de ce dossier à l’issue de l’épreuve.',
    'Les 4 parties de ce sujet sont indépendantes ; toutefois, pour une meilleure compréhension du thème, il est préférable de les traiter dans l’ordre chronologique.',
    'Les candidats sont priés de rédiger sur le sujet et de présenter clairement les réponses. La qualité de la rédaction sera prise en compte dans l’évaluation.',
  ],
  problematique:
    'L’ancienne salle des professeurs devient un espace d’innovation partagé (EIP) qui met à disposition des élèves et des professeurs une zone de créativité, une zone de conception et une zone de réalisation. Afin d’accueillir les différentes machines et préparer des espaces de travail différents, il est nécessaire de revoir les installations électriques et informatiques aux niveaux : éclairages, gestion des salles, contrôles d’accès, vidéo surveillance.\n'
    + 'Comment améliorer l’installation électrique de l’espace d’innovation partagé (EIP) d’un lycée professionnel ?',
  dtr: DTR,
  pagesSujet: PAGES_SUJET,
  parties: PARTIES,
  questions: QUESTIONS,
  themes: ['securite', 'eclairage', 'domotique', 'acces'],
  declinaisons: DECLINAISONS,
};
