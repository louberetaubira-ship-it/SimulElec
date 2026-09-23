/**
 * Sujet numérique « Chèvrerie — diversification d’une exploitation agricole » : éléments
 * communs aux sept parties (aides de saisie, dossier technique, pages du sujet).
 *
 * Copie conforme d'un sujet d'examen papier (7 parties indépendantes, 5 h, 304 points) :
 * énoncés mot pour mot, valeurs de correction du corrigé officiel. Le sujet est anonymisé :
 * rien de ce qui est servi au navigateur ne permet d'en retrouver l'origine (contrôle par
 * `scripts/audit-sujet.ts`) ; l'entreprise d'électricité citée en F.5 s'appelle « DURAND ».
 *
 * Images : `public/tp/chevrerie/` — pages du sujet `sujet-02…46.jpg` et du dossier technique
 * `dtr-04…77.jpg` (pages de garde et sommaires retirés, numérotation des PAGES conservée ; les
 * 48 documents DTR s'étalent sur plusieurs pages : `doc`), plus les recadrages `q-*.jpg`.
 *
 * Un fichier par partie (`partie-a.ts` … `partie-g.ts`) ; `index.ts` assemble et numérote.
 */
import type { CelluleSaisie, ChampValeur, DtrPage, FormuleSpec, SujetQuestion } from '@/lib/sujet/types';

export const IMG = '/tp/chevrerie';
export const pad = (n: number) => String(n).padStart(2, '0');

/** Question d'une partie, avant numérotation séquentielle par `index.ts`. */
export type QuestionSansNum = SujetQuestion extends infer Q ? (Q extends SujetQuestion ? Omit<Q, 'num'> : never) : never;

/* ───────────────────────────── Aides de saisie ───────────────────────────── */

/** Cellule numérique (tolérance absolue, défaut ±1 % côté moteur si omise). */
export const num = (id: string, attendu: number, tolerance?: number, acceptes?: string[]): CelluleSaisie =>
  ({ id, attendu, ...(tolerance != null ? { tolerance } : {}), ...(acceptes ? { acceptes } : {}) });
/** Cellule texte : réponses acceptées (le moteur ignore casse, accents et espaces). */
export const txt = (id: string, acceptes: string[], placeholder?: string): CelluleSaisie =>
  ({ id, acceptes, ...(placeholder ? { placeholder } : {}) });
/** Cellule à choix fermé (liste déroulante). */
export const choix = (id: string, liste: string[], bonne: string): CelluleSaisie => ({ id, choix: liste, acceptes: [bonne] });
/** Cellule libre non notée (justification lue par le professeur dans la copie). */
export const libre = (id: string, placeholder = 'Justifier votre réponse…'): CelluleSaisie => ({ id, placeholder });
/** Cellule « formule » corrigée par équivalence (éditeur de maths). */
export const formule = (id: string, spec: FormuleSpec, placeholder?: string): CelluleSaisie =>
  ({ id, formule: spec, saisie: 'maths', ...(placeholder ? { placeholder } : {}) });
/** Cellule « application numérique » lue par le professeur (éditeur de maths, non notée). */
export const appli = (id: string, placeholder = 'Application numérique…'): CelluleSaisie => ({ id, placeholder, saisie: 'maths' });

/** Champ numérique d'une question `valeur`. */
export const champNum = (id: string, label: string, attendu: number, tolerance: number, unite?: string, acceptes?: string[]): ChampValeur =>
  ({ id, label, attendu, tolerance, ...(unite ? { unite } : {}), ...(acceptes ? { acceptes } : {}) });
/** Champ texte d'une question `valeur`. */
export const champTxt = (id: string, label: string, acceptes: string[], placeholder?: string): ChampValeur =>
  ({ id, label, acceptes, ...(placeholder ? { placeholder } : {}) });

/** Références constructeur : avec et sans espaces / tirets (« 0 675 52 » = « 067552 »). */
export const ref = (...r: string[]) => Array.from(new Set(r.flatMap(x => [x, x.replace(/[\s-]+/g, ''), x.replace(/^0\s*/, '')])));

/* ───────────────────────────── Dossier technique ───────────────────────────── */

/**
 * Documents DTR 1 à 48 : [document, première page, dernière page, titre, section].
 * Les pages sont celles du DOSSIER (1..77 ; garde et sommaires = 1..3, non servies). Les
 * pages 7 (DTR 4 et 5) et 70 (DTR 42 et 43) portent deux documents : elles sont rattachées
 * au premier.
 */
const DTR_DOCS: [number, number, number, string, string][] = [
  [1, 4, 4, 'Plan des locaux', 'Sécurité incendie'],
  [2, 5, 5, 'Type d’établissement', 'Sécurité incendie'],
  [3, 6, 6, 'Type de SSI et d’équipement d’alarme', 'Sécurité incendie'],
  [4, 7, 7, 'Implantation des DM · classe du diffuseur sonore', 'Sécurité incendie'],
  [6, 8, 8, 'Équipement d’alarme', 'Sécurité incendie'],
  [7, 9, 9, 'Choix des déclencheurs manuels', 'Sécurité incendie'],
  [8, 10, 12, 'Notice du tableau d’alarme type 4', 'Sécurité incendie'],
  [9, 13, 13, 'Bouclier alarme NFa2p', 'Alarme intrusion'],
  [10, 14, 15, 'Analyse des risques', 'Alarme intrusion'],
  [11, 16, 21, 'Systèmes anti-intrusion', 'Alarme intrusion'],
  [12, 22, 25, 'Notice de la centrale d’alarme intrusion', 'Alarme intrusion'],
  [13, 26, 26, 'Sirène intérieure auto-alimentée', 'Alarme intrusion'],
  [14, 27, 27, 'Clavier I-KP 01', 'Alarme intrusion'],
  [15, 28, 28, 'Tableau des modes de pose', 'Alimentation du hangar'],
  [16, 29, 29, 'Facteur de correction K4', 'Alimentation du hangar'],
  [17, 30, 30, 'Facteurs de correction K5 / K6', 'Alimentation du hangar'],
  [18, 31, 31, 'Facteur de correction K7', 'Alimentation du hangar'],
  [19, 32, 32, 'Dénomination symbolique des câbles', 'Alimentation du hangar'],
  [20, 33, 33, 'Courants admissibles (canalisations enterrées)', 'Alimentation du hangar'],
  [21, 34, 34, 'Chute de tension', 'Alimentation du hangar'],
  [22, 35, 35, 'Conduits et mode de pose', 'Alimentation du hangar'],
  [23, 36, 36, 'Dimensions des câbles', 'Alimentation du hangar'],
  [24, 37, 38, 'Conduit Janoflex', 'Alimentation du hangar'],
  [25, 39, 39, 'Guide de protection contre la foudre', 'Parafoudre'],
  [26, 40, 40, 'Guide de protection', 'Parafoudre'],
  [27, 41, 44, 'Choix d’un parafoudre', 'Parafoudre'],
  [28, 45, 46, 'L’éolienne', 'Éolienne'],
  [29, 47, 53, 'Redresseur / régulateur de tension', 'Éolienne'],
  [30, 54, 57, 'Onduleur', 'Éolienne'],
  [31, 58, 58, 'Résistances de charge', 'Éolienne'],
  [32, 59, 60, 'Disjoncteurs différentiels', 'Éolienne'],
  [33, 61, 61, 'Vitesses de vent sur un site', 'Éolienne'],
  [34, 62, 62, 'Chute de tension et pertes dans un câble', 'Éolienne'],
  [35, 63, 63, 'Chauffe-eau à accumulation', 'Eau chaude sanitaire'],
  [36, 64, 64, 'Grille tarifaire de l’électricité', 'Eau chaude sanitaire'],
  [37, 65, 65, 'Chauffe-eau thermodynamique', 'Eau chaude sanitaire'],
  [38, 66, 66, 'Devis : chauffe-eau à accumulation', 'Eau chaude sanitaire'],
  [39, 67, 67, 'Devis : chauffe-eau thermodynamique', 'Eau chaude sanitaire'],
  [40, 68, 68, 'Règles d’enfouissement d’une gaine', 'Portail'],
  [41, 69, 69, 'Kits de motorisation', 'Portail'],
  [42, 70, 70, 'Plan du hangar · charpente traditionnelle', 'Portail'],
  [44, 71, 71, 'Conduits de cheminement', 'Portail'],
  [45, 72, 74, 'Notice de la motorisation STAR 24', 'Portail'],
  [46, 75, 75, 'Cellule photo-électrique', 'Portail'],
  [47, 76, 76, 'Lampe flash', 'Portail'],
  [48, 77, 77, 'Commande GSM', 'Portail'],
];

export const DTR: DtrPage[] = DTR_DOCS.flatMap(([doc, p0, p1, titre, section]) => {
  const pages: DtrPage[] = [];
  for (let p = p0; p <= p1; p += 1) pages.push({ num: p, doc, src: `${IMG}/dtr-${pad(p)}.jpg`, titre, section });
  return pages;
});

/** Numéro de page du dossier (1..77) du document DTR n (première page du document). */
export const pageDtr = (doc: number): number => {
  const d = DTR_DOCS.find(x => x[0] === doc) ?? DTR_DOCS.find(x => x[0] === doc - 1);
  if (!d) throw new Error(`DTR ${doc} inconnu`);
  return d[1];
};
/** Toutes les pages du document DTR n. */
export const pagesDtr = (doc: number): number[] => {
  const d = DTR_DOCS.find(x => x[0] === doc) ?? DTR_DOCS.find(x => x[0] === doc - 1);
  if (!d) throw new Error(`DTR ${doc} inconnu`);
  return Array.from({ length: d[2] - d[1] + 1 }, (_, i) => d[1] + i);
};

/* ───────────────────────────── Pages du sujet ───────────────────────────── */

/** Pages 2 à 46 du sujet (page de garde retirée ; numérotation conservée). */
const SUJET_TITRES: [string, string][] = [
  ['Conseils aux candidats et barème', 'Présentation'],
  ['Sommaire', 'Présentation'],
  ['Contexte', 'Présentation'],
  ['Description du site', 'Présentation'],
  ['Partie A — mise en situation', 'Partie 1'],
  ['A.1.1 à A.1.5 — Réglementation', 'Partie 1'],
  ['A.1.6 à A.2.2 — DM, diffuseurs, tableau T4', 'Partie 1'],
  ['A.2.3 à A.2.5 — Tableau, DM, câbles', 'Partie 1'],
  ['A.3 — Implantation du matériel', 'Partie 1'],
  ['A.4 — Schéma de raccordement', 'Partie 1'],
  ['A.5 — Micro-switchs · Partie B — mise en situation', 'Partie 2'],
  ['B.1.3 à B.1.5 — Boucles résistives', 'Partie 2'],
  ['B.1.6 à B.2.1 — Entrées zone, détecteurs', 'Partie 2'],
  ['B.2.2 à B.2.7 — Choix du matériel', 'Partie 2'],
  ['B.3 et B.4 — Implantation et schéma', 'Partie 2'],
  ['B.4 — Schéma de raccordement (suite)', 'Partie 2'],
  ['B.4 — Schéma de raccordement (fin)', 'Partie 2'],
  ['Partie C — mise en situation · C.1.1', 'Partie 3'],
  ['C.1.2 et C.1.3 — Facteurs de correction', 'Partie 3'],
  ['C.1.3.1 à C.1.4.2 — IB, In, Iz, section', 'Partie 3'],
  ['C.2 — Chute de tension', 'Partie 3'],
  ['C.2.5 à C.3.2.3 — Câble et conduit', 'Partie 3'],
  ['C.3.2.4 à C.3.2.7 — Conduit et mise en œuvre', 'Partie 3'],
  ['Partie D — mise en situation · D.1.1 à D.1.4', 'Partie 4'],
  ['D.1.5 à D.2.2 — Choix du parafoudre', 'Partie 4'],
  ['Partie E — mise en situation', 'Partie 5'],
  ['E.1 — L’éolienne', 'Partie 5'],
  ['E.2.1 — Structure de base', 'Partie 5'],
  ['E.2.1.4 à E.2.2.1.4 — Onduleurs et protections', 'Partie 5'],
  ['E.2.2.2 — Schéma de raccordement', 'Partie 5'],
  ['E.2.2.2 — Schéma de raccordement (suite)', 'Partie 5'],
  ['E.3 — Production et pertes en ligne', 'Partie 5'],
  ['E.3.3.2 à E.4 — Rendements, production finale', 'Partie 5'],
  ['E.4.1 à E.4.3.4 — Rentabilité', 'Partie 5'],
  ['Partie F — mise en situation · F.1', 'Partie 6'],
  ['F.2 et F.3.1 — Accumulation, thermodynamique', 'Partie 6'],
  ['F.3.2 à F.4.2 — Consommations et coûts', 'Partie 6'],
  ['F.4.3 à F.5 — Seuil de rentabilité, travaux', 'Partie 6'],
  ['F.5.1 à F.5.3 — Habilitations', 'Partie 6'],
  ['Partie G — mise en situation · G.1', 'Partie 7'],
  ['G.1.3 à G.2.3 — Motorisation, tranchée', 'Partie 7'],
  ['G.2.4 à G.3.2 — Conduit, cellules', 'Partie 7'],
  ['G.3.3 à G.3.5 — Lampe flash', 'Partie 7'],
  ['G.4 — Commande GSM', 'Partie 7'],
  ['G.5 — Schéma de câblage des périphériques', 'Partie 7'],
];

export const PAGES_SUJET: DtrPage[] = SUJET_TITRES.map(([titre, section], i) => ({
  num: i + 2, src: `${IMG}/sujet-${pad(i + 2)}.jpg`, titre, section,
}));
