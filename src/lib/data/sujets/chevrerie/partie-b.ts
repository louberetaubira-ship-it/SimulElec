/**
 * Partie B — Alarme intrusion (51,5 points, pages 12 à 18 du sujet, DTR 9 à 14).
 *
 * Barème : le corrigé officiel ne détaille pas les points par question ; la répartition
 * ci-dessous est faite au prorata du travail demandé pour tomber juste sur 51,5 points.
 */
import type { FormuleSpec, QSchema, SujetPartie } from '@/lib/sujet/types';
import { IMG, num, txt, libre, formule, champTxt, ref, pageDtr, type QuestionSansNum } from './commun';

export const PARTIE_B: SujetPartie = {
  num: 2,
  titre: 'Alarme intrusion',
  objectifs: [
    'Définir le système de détection d’intrusion.',
    'Choisir le matériel à installer.',
    'Proposer un schéma de raccordement.',
  ],
  competences: ['C1', 'C3', 'C5', 'C11'],
  situation:
    'Suite à une tentative de cambriolage et des actes de vandalisme, le gérant est contraint par son assurance d’équiper les locaux d’un système de détection d’intrusion.',
  dtrPages: [pageDtr(9), pageDtr(10), pageDtr(11), pageDtr(12), pageDtr(13), pageDtr(14)],
};

/** Pages du DTR 11 (catalogue) : centrale, claviers + transmetteurs, détecteurs IR, contacts, sirènes. */
const DTR11 = { centrale: pageDtr(11) + 1, clavier: pageDtr(11) + 2, ir: pageDtr(11) + 3, contacts: pageDtr(11) + 4, sirenes: pageDtr(11) + 5 };

/* ───────────────────────────── Formules B.1.5 / B.1.6 ───────────────────────────── */

const RQ_GAUCHE = ['R_{q}', 'R_q', 'R_{eq}', 'R_{éq}', 'R', 'R_{q1}', 'R_{q2}', 'R_{q3}', 'R_{q4}', 'R_{E}'];

const RQ_SERIE: FormuleSpec = {
  attendues: ['R_{1}+R_{2}'],
  membreGauche: RQ_GAUCHE,
  variables: { 'R_{1}': { min: 1, max: 10 }, 'R_{2}': { min: 1, max: 10 } },
  affichage: 'Rq = R1 + R2 (AL ouvert : les deux résistances en série)',
};

const RQ_REPOS: FormuleSpec = {
  attendues: ['R_{1}'],
  membreGauche: RQ_GAUCHE,
  variables: { 'R_{1}': { min: 1, max: 10 }, 'R_{2}': { min: 1, max: 10 } },
  affichage: 'Rq = R1 (AL fermé court-circuite R2)',
};

const UEE: FormuleSpec = {
  attendues: ['\\frac{12\\times R_{q}}{R_{1}+R_{q}}'],
  membreGauche: ['U_{EE}', 'U_{ee}', 'U', 'U_{E}', 'UEE'],
  variables: { 'R_{1}': { min: 1, max: 10 }, 'R_{q}': { min: 0.5, max: 20 }, E: { min: 12, max: 12 }, U: { min: 12, max: 12 } },
  // I = courant du pont diviseur : « U_EE = I × Rq » est reconnue.
  derivees: { I: '\\frac{12}{R_{1}+R_{q}}' },
  affichage: 'U_EE = 12 × Rq / (R1 + Rq) (pont diviseur, courant dans R2 négligé)',
};

/* ───────────────────────────── B.4 : schéma de raccordement ───────────────────────────── */

/**
 * Le schéma à compléter s'étale sur DEUX pages du sujet : p. 17 (sirène, centrale, clavier) et
 * p. 18 (centrale — bornes de zones, deux détecteurs IR et quatre contacts magnétiques avec
 * leurs résistances d'équilibrage). Les deux recadrages sont assemblés l'un sous l'autre dans
 * `q-b4-schema.jpg` (séparés par un trait pointillé) : la centrale y figure donc deux fois,
 * comme sur le papier ; ses bornes 0V / +12V de la p. 18 sont des bornes distinctes (`C2.*`).
 * Le transmetteur est une carte enfichable : il n'apparaît pas sur le schéma.
 */
const B4_RESEAUX: { bornes: string[]; label: string }[] = [
  // p. 17 — sirène
  { label: 'Sirène : 0V centrale → CHARGE 0V et A.P. TAMPER', bornes: ['C.0VB', 'S.0V', 'S.AP1'] },
  { label: 'Sirène : 12V BELL → CHARGE +12V', bornes: ['C.12VBELL', 'S.12V'] },
  { label: 'Sirène : TR → A.P. TAMPER', bornes: ['C.TR', 'S.AP2'] },
  { label: 'Sirène : BELL → INPUTS I1', bornes: ['C.BELL', 'S.I1'] },
  // p. 17 — clavier (bus RS485)
  { label: 'Clavier : 0V', bornes: ['C.0V', 'K.0V'] },
  { label: 'Clavier : +12V', bornes: ['C.12V', 'K.12V'] },
  { label: 'Clavier : A', bornes: ['C.A', 'K.A'] },
  { label: 'Clavier : B', bornes: ['C.B', 'K.B'] },
  // p. 18 — alimentation des détecteurs IR
  { label: 'Détecteurs IR : 0V', bornes: ['C2.0V', 'IRM.-', 'IRF.-'] },
  { label: 'Détecteurs IR : +12V', bornes: ['C2.12V', 'IRM.+', 'IRF.+'] },
  // Magasin — Z0 : détecteur de mouvement
  { label: 'Z0 → IR magasin TAMPER', bornes: ['C.Z0', 'IRM.T2'] },
  { label: 'Commun Z0/Z1 → IR magasin ALARM, 4K7 et contact magasin 1 (AP)', bornes: ['C.COM01', 'IRM.A1', 'IRM.R47a', 'MM1.T1'] },
  { label: 'IR magasin : 4K7 / 2K2 / ALARM', bornes: ['IRM.R47b', 'IRM.R22a', 'IRM.A2'] },
  { label: 'IR magasin : 2K2 → TAMPER', bornes: ['IRM.R22b', 'IRM.T1'] },
  // Magasin — Z1 : deux contacts d'ouverture
  { label: 'Z1 → contact magasin 1 ALARME et 4K7', bornes: ['C.Z1', 'MM1.A1', 'MM1.R47a'] },
  { label: 'Contacts magasin : ALARME 1 ↔ ALARME 2 (4K7)', bornes: ['MM1.A2', 'MM1.R47b', 'MM2.A2', 'MM2.R47b'] },
  { label: 'Contact magasin 2 : ALARME / 2K2 / 4K7', bornes: ['MM2.A1', 'MM2.R22b', 'MM2.R47a'] },
  { label: 'Contact magasin 2 : 2K2 → AP TAMPER', bornes: ['MM2.R22a', 'MM2.T2'] },
  { label: 'Contacts magasin : AP TAMPER 2 ↔ AP TAMPER 1', bornes: ['MM2.T1', 'MM1.T2'] },
  // Fromagerie — Z2 : deux contacts d'ouverture
  { label: 'Z2 → contact fromagerie 1 AP TAMPER', bornes: ['C.Z2', 'MF1.T1'] },
  { label: 'Contacts fromagerie : AP TAMPER 1 ↔ AP TAMPER 2', bornes: ['MF1.T2', 'MF2.T1'] },
  { label: 'Commun Z2/Z3 → IR fromagerie TAMPER, contact fromagerie 1 ALARME et 4K7', bornes: ['C.COM23', 'IRF.T2', 'MF1.A1', 'MF1.R47a'] },
  { label: 'Contacts fromagerie : ALARME 1 ↔ ALARME 2 (4K7)', bornes: ['MF1.A2', 'MF1.R47b', 'MF2.A2', 'MF2.R47b'] },
  { label: 'Contact fromagerie 2 : ALARME / 2K2 / 4K7', bornes: ['MF2.A1', 'MF2.R22b', 'MF2.R47a'] },
  { label: 'Contact fromagerie 2 : 2K2 → AP TAMPER', bornes: ['MF2.R22a', 'MF2.T2'] },
  // Fromagerie — Z3 : détecteur de mouvement
  { label: 'Z3 → IR fromagerie ALARM et 4K7', bornes: ['C.Z3', 'IRF.A1', 'IRF.R47a'] },
  { label: 'IR fromagerie : 4K7 / 2K2 / ALARM', bornes: ['IRF.R47b', 'IRF.R22a', 'IRF.A2'] },
  { label: 'IR fromagerie : 2K2 → TAMPER', bornes: ['IRF.R22b', 'IRF.T1'] },
];

const B4_TRAITS: QSchema['traits'] = {
  image: {
    src: `${IMG}/q-b4-schema.jpg`,
    alt: 'Schéma de raccordement à compléter, sur deux pages : sirène, centrale et clavier (haut) ; centrale, détecteurs infrarouges du magasin et de la fromagerie, contacts magnétiques et résistances 4K7 / 2K2 (bas)',
    w: 1130, h: 1699,
  },
  bornes: [
    { id: 'S.BAT+', x: 50.73, y: 10.82, label: 'Sirène — BAT +' },
    { id: 'S.BAT-', x: 53.01, y: 10.82, label: 'Sirène — BAT −' },
    { id: 'S.0V', x: 58.92, y: 10.82, label: 'Sirène — CHARGE 0V' },
    { id: 'S.12V', x: 61.24, y: 10.82, label: 'Sirène — CHARGE +12V' },
    { id: 'S.I1', x: 63.56, y: 10.82, label: 'Sirène — INPUTS I1' },
    { id: 'S.I2', x: 65.88, y: 10.82, label: 'Sirène — INPUTS I2' },
    { id: 'S.O1', x: 68.32, y: 10.82, label: 'Sirène — OUTPUTS O1' },
    { id: 'S.O2', x: 70.64, y: 10.82, label: 'Sirène — OUTPUTS O2' },
    { id: 'S.AP1', x: 72.96, y: 10.82, label: 'Sirène — A.P. TAMPER (1)' },
    { id: 'S.AP2', x: 75.29, y: 10.82, label: 'Sirène — A.P. TAMPER (2)' },
    { id: 'C.LS-', x: 32.3, y: 23.98, label: 'Centrale — LS-' },
    { id: 'C.LS+', x: 33.69, y: 23.98, label: 'Centrale — LS+' },
    { id: 'C.AUXT1', x: 35.11, y: 23.98, label: 'Centrale — AUX TAMP (1)' },
    { id: 'C.AUXT2', x: 36.53, y: 23.98, label: 'Centrale — AUX TAMP (2)' },
    { id: 'C.STB', x: 38.01, y: 23.98, label: 'Centrale — STB' },
    { id: 'C.BELL', x: 39.49, y: 23.98, label: 'Centrale — BELL' },
    { id: 'C.TR', x: 40.91, y: 23.98, label: 'Centrale — TR' },
    { id: 'C.12VBELL', x: 42.28, y: 23.98, label: 'Centrale — 12V BELL' },
    { id: 'C.0VB', x: 43.69, y: 23.98, label: 'Centrale — 0V' },
    { id: 'C.0V', x: 23.52, y: 38.67, label: 'Centrale — bus 0V' },
    { id: 'C.12V', x: 24.91, y: 38.67, label: 'Centrale — bus +12V' },
    { id: 'C.A', x: 26.28, y: 38.67, label: 'Centrale — bus A' },
    { id: 'C.B', x: 27.72, y: 38.67, label: 'Centrale — bus B' },
    { id: 'K.ET1', x: 69.42, y: 55.29, label: 'Clavier — ET (1)' },
    { id: 'K.ET2', x: 70.81, y: 55.29, label: 'Clavier — ET (2)' },
    { id: 'K.B', x: 72.19, y: 55.29, label: 'Clavier — B' },
    { id: 'K.A', x: 73.61, y: 55.29, label: 'Clavier — A' },
    { id: 'K.12V', x: 75.01, y: 55.29, label: 'Clavier — 12V' },
    { id: 'K.0V', x: 76.45, y: 55.29, label: 'Clavier — 0V' },
    { id: 'C2.0V', x: 30.6, y: 69.1, label: 'Centrale (page 18) — 0V' },
    { id: 'C2.12V', x: 31.92, y: 69.1, label: 'Centrale (page 18) — +12V' },
    { id: 'C2.A', x: 33.25, y: 69.1, label: 'Centrale (page 18) — A' },
    { id: 'C2.B', x: 34.62, y: 69.1, label: 'Centrale (page 18) — B' },
    { id: 'C.Z0', x: 51.55, y: 69.72, label: 'Centrale — zone Z0' },
    { id: 'C.COM01', x: 52.94, y: 69.72, label: 'Centrale — zone commun Z0/Z1' },
    { id: 'C.Z1', x: 54.34, y: 69.72, label: 'Centrale — zone Z1' },
    { id: 'C.Z2', x: 55.71, y: 69.72, label: 'Centrale — zone Z2' },
    { id: 'C.COM23', x: 57.12, y: 69.72, label: 'Centrale — zone commun Z2/Z3' },
    { id: 'C.Z3', x: 58.56, y: 69.72, label: 'Centrale — zone Z3' },
    { id: 'IRM.R47a', x: 9.51, y: 74.07, label: 'IR magasin — résistance 4K7 (gauche)' },
    { id: 'IRM.R47b', x: 12.76, y: 74.07, label: 'IR magasin — résistance 4K7 (droite)' },
    { id: 'IRM.R22a', x: 13.83, y: 74.07, label: 'IR magasin — résistance 2K2 (gauche)' },
    { id: 'IRM.R22b', x: 16.96, y: 74.07, label: 'IR magasin — résistance 2K2 (droite)' },
    { id: 'IRM.+', x: 7.52, y: 77.93, label: 'IR magasin — 12 VDC +' },
    { id: 'IRM.-', x: 8.45, y: 77.93, label: 'IR magasin — 12 VDC −' },
    { id: 'IRM.A1', x: 12.54, y: 77.93, label: 'IR magasin — ALARM NC (1)' },
    { id: 'IRM.A2', x: 13.47, y: 77.93, label: 'IR magasin — ALARM NC (2)' },
    { id: 'IRM.LED', x: 14.41, y: 77.93, label: 'IR magasin — LED' },
    { id: 'IRM.T1', x: 15.34, y: 77.93, label: 'IR magasin — TAMPER NC (1)' },
    { id: 'IRM.T2', x: 16.3, y: 77.93, label: 'IR magasin — TAMPER NC (2)' },
    { id: 'IRF.R47a', x: 87.94, y: 73.83, label: 'IR fromagerie — résistance 4K7 (gauche)' },
    { id: 'IRF.R47b', x: 91.12, y: 73.83, label: 'IR fromagerie — résistance 4K7 (droite)' },
    { id: 'IRF.R22a', x: 92.19, y: 73.83, label: 'IR fromagerie — résistance 2K2 (gauche)' },
    { id: 'IRF.R22b', x: 95.35, y: 73.83, label: 'IR fromagerie — résistance 2K2 (droite)' },
    { id: 'IRF.+', x: 85.77, y: 77.93, label: 'IR fromagerie — 12 VDC +' },
    { id: 'IRF.-', x: 86.73, y: 77.93, label: 'IR fromagerie — 12 VDC −' },
    { id: 'IRF.A1', x: 90.68, y: 77.93, label: 'IR fromagerie — ALARM NC (1)' },
    { id: 'IRF.A2', x: 91.62, y: 77.93, label: 'IR fromagerie — ALARM NC (2)' },
    { id: 'IRF.LED', x: 92.59, y: 77.93, label: 'IR fromagerie — LED' },
    { id: 'IRF.T1', x: 93.58, y: 77.93, label: 'IR fromagerie — TAMPER NC (1)' },
    { id: 'IRF.T2', x: 94.51, y: 77.93, label: 'IR fromagerie — TAMPER NC (2)' },
    { id: 'MM1.R47a', x: 12.74, y: 92.54, label: 'Magnétique magasin 1 — résistance 4K7 (gauche)' },
    { id: 'MM1.R47b', x: 16.43, y: 92.54, label: 'Magnétique magasin 1 — résistance 4K7 (droite)' },
    { id: 'MM1.T1', x: 8.35, y: 96.41, label: 'Magnétique magasin 1 — AP TAMPER (1)' },
    { id: 'MM1.T2', x: 9.44, y: 96.41, label: 'Magnétique magasin 1 — AP TAMPER (2)' },
    { id: 'MM1.A1', x: 13.72, y: 96.41, label: 'Magnétique magasin 1 — ALARME (1)' },
    { id: 'MM1.A2', x: 14.81, y: 96.41, label: 'Magnétique magasin 1 — ALARME (2)' },
    { id: 'MM2.R22a', x: 29.09, y: 92.54, label: 'Magnétique magasin 2 — résistance 2K2 (gauche)' },
    { id: 'MM2.R22b', x: 32.3, y: 92.54, label: 'Magnétique magasin 2 — résistance 2K2 (droite)' },
    { id: 'MM2.R47a', x: 33.39, y: 92.54, label: 'Magnétique magasin 2 — résistance 4K7 (gauche)' },
    { id: 'MM2.R47b', x: 36.52, y: 92.54, label: 'Magnétique magasin 2 — résistance 4K7 (droite)' },
    { id: 'MM2.T1', x: 29.05, y: 96.37, label: 'Magnétique magasin 2 — AP TAMPER (1)' },
    { id: 'MM2.T2', x: 30.0, y: 96.37, label: 'Magnétique magasin 2 — AP TAMPER (2)' },
    { id: 'MM2.A1', x: 34.31, y: 96.37, label: 'Magnétique magasin 2 — ALARME (1)' },
    { id: 'MM2.A2', x: 35.31, y: 96.37, label: 'Magnétique magasin 2 — ALARME (2)' },
    { id: 'MF1.R47a', x: 57.43, y: 92.35, label: 'Magnétique fromagerie 1 — résistance 4K7 (gauche)' },
    { id: 'MF1.R47b', x: 61.21, y: 92.35, label: 'Magnétique fromagerie 1 — résistance 4K7 (droite)' },
    { id: 'MF1.T1', x: 53.25, y: 96.31, label: 'Magnétique fromagerie 1 — AP TAMPER (1)' },
    { id: 'MF1.T2', x: 54.27, y: 96.31, label: 'Magnétique fromagerie 1 — AP TAMPER (2)' },
    { id: 'MF1.A1', x: 58.56, y: 96.31, label: 'Magnétique fromagerie 1 — ALARME (1)' },
    { id: 'MF1.A2', x: 59.58, y: 96.31, label: 'Magnétique fromagerie 1 — ALARME (2)' },
    { id: 'MF2.R22a', x: 73.83, y: 92.35, label: 'Magnétique fromagerie 2 — résistance 2K2 (gauche)' },
    { id: 'MF2.R22b', x: 77.05, y: 92.35, label: 'Magnétique fromagerie 2 — résistance 2K2 (droite)' },
    { id: 'MF2.R47a', x: 78.17, y: 92.35, label: 'Magnétique fromagerie 2 — résistance 4K7 (gauche)' },
    { id: 'MF2.R47b', x: 81.27, y: 92.35, label: 'Magnétique fromagerie 2 — résistance 4K7 (droite)' },
    { id: 'MF2.T1', x: 73.83, y: 96.31, label: 'Magnétique fromagerie 2 — AP TAMPER (1)' },
    { id: 'MF2.T2', x: 74.84, y: 96.31, label: 'Magnétique fromagerie 2 — AP TAMPER (2)' },
    { id: 'MF2.A1', x: 79.05, y: 96.31, label: 'Magnétique fromagerie 2 — ALARME (1)' },
    { id: 'MF2.A2', x: 80.15, y: 96.31, label: 'Magnétique fromagerie 2 — ALARME (2)' },
  ],
  couleurs: [
    { id: 'rouge', label: 'Rouge', css: '#d62828' },
    { id: 'noir', label: 'Noir', css: '#161616' },
    { id: 'bleu', label: 'Bleu', css: '#1f6fd6' },
    { id: 'vert', label: 'Vert', css: '#2e9a3a' },
  ],
  // Liaisons du corrigé (p. 17 et 18), en chaîne dans chaque réseau ; couleur non notée.
  attendues: B4_RESEAUX.flatMap(r => r.bornes.slice(1).map((b, i) => ({ a: r.bornes[i], b }))),
  // Corrigé officiel : l'ordre des éléments dans chaque boucle (IR / contacts, contact 1 / contact 2,
  // sens ALARM ↔ TAMPER) est celui du corrigé ; un autre ordre série, électriquement équivalent,
  // n'est pas reconnu par la correction automatique.
  reseaux: B4_RESEAUX,
};

/* ───────────────────────────── Questions ───────────────────────────── */

export const QUESTIONS_B: QuestionSansNum[] = [
  /* ═══════════════ B.1 Réglementation ═══════════════ */
  {
    label: 'B.1.1', partie: 2, type: 'valeur',
    enonce: '**Définir** le type de matériel labélisé NFa2p que l’on doit installer pour protéger les différents espaces.',
    competence: 'C1', points: 1, dtr: [pageDtr(9)], pageSujet: 12,
    champs: [champTxt('nfa2p', 'Niveau NFa2p', [
      'NFa2p 2 boucliers', 'NF a2p 2 boucliers', 'NF&A2P 2 boucliers', 'NF A2P 2 boucliers', '2 boucliers', 'deux boucliers', 'NFa2p deux boucliers',
    ])],
    indice: 'Un magasin de vente est un petit commerce facilement accessible.',
    aides: [
      '📖 Ouvre le DTR 9 : « Concernant les matériels anti-intrusion on peut définir le degré de sécurité de la manière suivante ».',
      '🧭 Méthode : compare les locaux de l’exploitation (petit commerce, de plain-pied, avec des produits à vendre) aux trois descriptions du DTR 9.',
      '✏️ Forme de la réponse : NFa2p … bouclier(s).',
    ],
    erreursTypiques: [
      {
        id: 'b11-3-boucliers', champ: 'nfa2p', valeurs: ['NFa2p 3 boucliers', '3 boucliers', 'trois boucliers'],
        message: 'Trois boucliers concernent les bâtiments contenant des objets de grande valeur (bijouterie…) : ce n’est pas le cas ici.',
      },
      {
        id: 'b11-1-bouclier', champ: 'nfa2p', valeurs: ['NFa2p 1 bouclier', '1 bouclier', 'un bouclier'],
        message: 'Un bouclier est réservé aux locaux sans objets de valeur et difficilement accessibles : le magasin est de plain-pied.',
      },
    ],
    explication: 'NFa2p 2 boucliers (petit commerce facilement accessible).',
  },
  {
    label: 'B.1.2', partie: 2, type: 'redige',
    enonce: '**Citer** les trois types de détection d’intrusion.',
    competence: 'C1', points: 1.5, dtr: [pageDtr(10)], pageSujet: 12,
    motsCles: ['peripherique', 'approche', 'perimetrique', 'penetration', 'volumetrique', 'mouvement'],
    minMotsCles: 3, lignes: 3,
    corrige: '– Périphérique (d’approche) ; – Périmétrique (de pénétration) ; – Volumétrique (de mouvement).',
    indice: 'Le DTR 10 définit trois types de surveillance : SA, SP et SM.',
    aides: [
      '📖 Ouvre le DTR 10 : « Trois types de surveillance sont définis » (SA, SP, SM).',
      '🧭 Méthode : pour chaque sigle, retrouve ce qui est surveillé (les abords du site, les ouvertures du bâtiment, l’intérieur des locaux) et le nom de la détection correspondante.',
      '✏️ Forme de la réponse : trois tirets : détection … (d’…), détection … (de …), détection … (de …).',
    ],
    explication: 'Détection périphérique (surveillance d’approche SA), périmétrique (surveillance des pénétrations SP) et volumétrique (surveillance de mouvement SM).',
  },
  {
    label: 'B.1.3', partie: 2, type: 'valeur',
    enonce: 'La plupart des fabricants de centrale de détection d’intrusion proposent le schéma de raccordement suivant. **Donner** le nom de ce montage.',
    competence: 'C1', points: 1, dtr: [pageDtr(12)], pageSujet: 13,
    image: { src: `${IMG}/q-b15-schema1.jpg`, alt: 'Raccordement d’un détecteur (E+, E−, AP TAMPER, ALARME, R1, R2) et schéma 1 : schéma de principe, R1 = R2 = 4,7 kΩ' },
    champs: [champTxt('montage', 'Nom du montage', [
      'Montage en double équilibrage', 'double équilibrage', 'double equilibrage', 'montage équilibré à deux résistances', 'équilibré à deux résistances',
      'ZFS', 'montage ZFS', 'double équilibrage résistif', 'boucle à double équilibrage', 'câblage ZFS',
    ])],
    indice: 'Deux résistances permettent de distinguer plusieurs états de la boucle : la notice de la centrale donne le nom de ce câblage.',
    aides: [
      '📖 Ouvre le DTR 12 : « Types de câblage de détecteur (zone) » : ZFS, 4 fils NF, 2 fils NF.',
      '🧭 Méthode : repère le type de câblage qui utilise une seule paire de fils et des résistances dans le contact d’alarme et en fin de ligne.',
      '✏️ Forme de la réponse : montage en … (ou son sigle).',
    ],
    explication: 'Montage en double équilibrage (montage équilibré à deux résistances, câblage ZFS).',
  },
  {
    label: 'B.1.4', partie: 2, type: 'redige',
    enonce: '**Citer** les avantages de ce type de câblage.',
    competence: 'C1', points: 2, dtr: [pageDtr(12)], pageSujet: 13,
    motsCles: ['coupure', 'court', 'conducteur', 'fils', 'seule zone', 'une zone', 'sabotage', 'falsification'],
    minMotsCles: 3, lignes: 4,
    corrige: '– Surveillance de la coupure du câble ; – Surveillance du court-circuit de la boucle ; – Utilisation de 2 ou 4 conducteurs au lieu de 4 ou 6 conducteurs ; – L’alarme (AL) et l’autoprotection (AP) sont raccordées sur une seule zone.',
    indice: 'Les résistances permettent de contrôler le court-circuit et le circuit ouvert (DTR 12) ; pense aussi au nombre de fils.',
    aides: [
      '📖 DTR 12, paragraphe « ZFS » : ce que les résistances permettent au système de contrôler.',
      '🧭 Méthode : compare avec un câblage 4 fils NF (une paire pour l’alarme, une paire pour l’autoprotection) : que gagne-t-on en surveillance, en câble et en nombre de zones ?',
      '✏️ Forme de la réponse : quatre tirets : surveillance de …, surveillance de …, moins de …, … sur une seule zone.',
    ],
    explication: 'Surveillance de la coupure du câble ; surveillance du court-circuit de la boucle ; 2 ou 4 conducteurs au lieu de 4 ou 6 ; alarme et autoprotection raccordées sur une seule zone.',
  },
  {
    label: 'B.1.5', partie: 2, type: 'tableau',
    enonce: '**Calculer** la valeur de la résistance équivalente vue des bornes E+ et E− (Schéma 1) pour les différents cas suivants et **détailler** les calculs.',
    contexte: 'Schéma 1 : E+ — contact AP — R1 — (contact AL en parallèle sur R2) — E−, avec R1 = R2 = 4,7 kΩ. Écrire la formule littérale quand il y a un calcul.',
    competence: 'C5', points: 4, dtr: [pageDtr(12)], pageSujet: 13,
    image: { src: `${IMG}/q-b15-schema1.jpg`, alt: 'Raccordement d’un détecteur et schéma 1 : E+, contact AP, R1, contact AL en parallèle avec R2, E− ; R1 = R2 = 4,7 kΩ' },
    colonnes: ['Cas', 'État des contacts (justification)', 'Formule de Rq', 'Rq (kΩ)'],
    lignes: [
      { cellules: ['Intrusion', libre('b15-intr-just', 'AL … , AP …'), formule('b15-intr-f', RQ_SERIE, 'R_q = …'),
        num('b15-intr', 9.4, 0.05, ['9400 Ω', '9400', '9,4 kΩ', '9.4 kΩ'])] },
      { cellules: ['Ouverture du détecteur', libre('b15-ouv-just', 'AL … , AP …'), '—',
        txt('b15-ouv', ['infinie', 'infini', '∞', 'Rq infinie', 'circuit ouvert', 'infinie (circuit ouvert)'])] },
      { cellules: ['Pas d’intrusion et ni de sabotage', libre('b15-repos-just', 'AL … , AP …'), formule('b15-repos-f', RQ_REPOS, 'R_q = …'),
        num('b15-repos', 4.7, 0.05, ['4700 Ω', '4700', '4,7 kΩ', '4.7 kΩ'])] },
      { cellules: ['Sabotage par court-circuit', libre('b15-cc-just', 'Justifier…'), '—',
        num('b15-cc', 0, 0, ['0 Ω', '0 kΩ', 'nulle', 'zéro'])] },
    ],
    indice: 'Un contact fermé court-circuite ce qui est en parallèle avec lui ; un contact ouvert en série coupe la boucle.',
    aides: [
      '📖 Regarde le schéma 1 (au-dessus) : AP est en série dans la boucle, AL est en parallèle sur R2 ; la figure 2 du DTR 12 montre le même principe.',
      '🧭 Méthode : pour chaque cas, écris l’état des deux contacts (ouvert / fermé) : AL fermé court-circuite R2 ; AL ouvert laisse R2 en série avec R1 ; AP ouvert (ouverture du capot) coupe la boucle ; un court-circuit relie directement E+ à E−.',
      '✏️ Forme de la réponse : pour chaque cas, l’état des deux contacts, la formule R_q = … quand il y a un calcul, puis la valeur en kΩ.',
    ],
    erreursTypiques: [
      {
        id: 'b15-intr-parallele', champ: 'b15-intr', nombre: { valeur: 2.35, tolerance: 0.05 },
        message: 'Tu as mis R1 et R2 en parallèle : quand AL s’ouvre, le courant traverse R1 PUIS R2.',
      },
      {
        id: 'b15-repos-serie', champ: 'b15-repos', nombre: { valeur: 9.4, tolerance: 0.05 },
        message: 'Au repos, le contact AL est fermé : il court-circuite R2.',
      },
      {
        id: 'b15-ouv-zero', champ: 'b15-ouv', valeurs: ['0', '0 Ω', 'nulle'],
        message: 'L’ouverture du détecteur ouvre le contact d’autoprotection, placé en série : la boucle est coupée.',
      },
    ],
    explication: 'Intrusion : AL ouvert, les deux résistances s’additionnent : Rq = R1 + R2 = 9,4 kΩ. Ouverture du détecteur : AP ouvert, circuit ouvert : Rq infinie. Pas d’intrusion ni de sabotage : AL et AP fermés, une seule résistance : Rq = R1 = 4,7 kΩ. Sabotage par court-circuit : conducteur entre E+ et E− : Rq = 0 Ω.',
  },
  {
    label: 'B.1.6', partie: 2, type: 'tableau',
    enonce: '**Calculer** la tension U_EE en entrée de la centrale pour les cas suivants.',
    contexte: 'Le schéma modélise les entrées zone filaire d’une centrale. On sait que le courant circulant dans R2 est négligeable. Rq représente la résistance équivalente d’un détecteur. Données : 12 V ; R1 = 4,7 kΩ ; R2 = 100 kΩ.',
    competence: 'C5', points: 4, dtr: [pageDtr(12)], pageSujet: 14,
    image: { src: `${IMG}/q-b16-schema2.jpg`, alt: 'Schéma interne de la centrale : 12 V, R1 = 4,7 kΩ, R2 = 100 kΩ, bornes E+ et E−, détecteur Rq et tension UEE' },
    colonnes: ['Cas', 'Rq (kΩ)', 'Formule de U_EE', 'U_EE (V)'],
    lignes: [
      { cellules: ['Intrusion', num('b16-intr-rq', 9.4, 0.05, ['9400 Ω', '9,4 kΩ']), formule('b16-intr-f', UEE, 'U_{EE} = …'), num('b16-intr-u', 8, 0.05, ['8 V'])] },
      { cellules: ['Pas d’intrusion et ni de sabotage', num('b16-repos-rq', 4.7, 0.05, ['4700 Ω', '4,7 kΩ']), formule('b16-repos-f', UEE, 'U_{EE} = …'), num('b16-repos-u', 6, 0.05, ['6 V'])] },
    ],
    indice: 'R1 et Rq forment un pont diviseur alimenté sous 12 V (R2 ne consomme pas de courant).',
    aides: [
      '📖 Regarde le schéma de la centrale (au-dessus) et reprends les valeurs de Rq trouvées en B.1.5.',
      '🧭 Méthode : comme le courant dans R2 est négligeable, R1 et Rq sont en série sous 12 V : calcule le courant I = 12 / (R1 + Rq), puis la tension aux bornes de Rq (pont diviseur).',
      '✏️ Forme de la réponse : Rq = … kΩ ; U_EE = 12 × R_q / (R_1 + R_q) = … = … V.',
    ],
    erreursTypiques: [
      {
        id: 'b16-tension-r1', champ: 'b16-intr-u', nombre: { valeur: 4, tolerance: 0.05 },
        message: 'Tu as calculé la tension aux bornes de R1 : U_EE est la tension aux bornes du détecteur Rq.',
      },
      {
        id: 'b16-formule-r1', formule: '\\frac{12\\times R_{1}}{R_{1}+R_{q}}',
        message: 'Au numérateur du pont diviseur, on met la résistance aux bornes de laquelle on mesure la tension : ici le détecteur.',
      },
    ],
    explication: 'Pont diviseur R1 / Rq : U_EE = I × Rq avec I = 12 / (R1 + Rq). Intrusion : Rq = 9,4 kΩ ; U_EE = 12 × 9,4 / (4,7 + 9,4) = 8 V. Pas d’intrusion ni de sabotage : Rq = 4,7 kΩ ; U_EE = 12 × 4,7 / (4,7 + 4,7) = 6 V.',
  },

  /* ═══════════════ B.2 Choix du matériel ═══════════════ */
  {
    label: 'B.2.1', partie: 2, type: 'tableau',
    enonce: '**Définir** le nombre de détecteurs par espaces puis le nombre de zones de détection pour la centrale.',
    contexte: 'En fonction de l’analyse du risque, du descriptif général et des exigences de l’exploitant, vous devez définir le matériel. Les détecteurs de chaque espace seront répartis sur 2 zones : une zone surveillance pénétration et une zone surveillance mouvement. Prévoir un transmetteur téléphonique. L’analyse du risque de la chèvrerie impose une surveillance de classification SP3 et SM1.',
    competence: 'C3', points: 2, dtr: [pageDtr(10), pageDtr(1)], pageSujet: 14,
    colonnes: ['Espace', 'SP', 'SM'],
    lignes: [
      { cellules: ['Magasin', num('b21-mag-sp', 2, 0), num('b21-mag-sm', 1, 0)] },
      { cellules: ['Fromagerie', num('b21-fro-sp', 2, 0), num('b21-fro-sm', 1, 0)] },
      { cellules: ['Transformation et sas chambres froides', num('b21-zt-sp', 2, 0), num('b21-zt-sm', 1, 0)] },
      { cellules: ['Nombre de zones', num('b21-zones', 6, 0), '—'] },
    ],
    indice: 'SP3 : issues principales, secondaires et ouvrants ; SM1 : lieux de passage obligé. Deux zones par espace.',
    aides: [
      '📖 DTR 10 (analyse des risques : tableaux SP et SM) et plan du DTR 1 pour les portes de chaque espace ; la page suivante du DTR 10 précise la baie vitrée du magasin.',
      '🧭 Méthode : SP = un détecteur d’ouverture par issue donnant sur l’extérieur (la baie vitrée à barreaux n’en demande pas) ; SM = un détecteur de mouvement par lieu de passage obligé de l’espace ; puis 2 zones par espace (pénétration + mouvement).',
      '✏️ Forme de la réponse : un nombre de détecteurs par case, puis le nombre total de zones.',
    ],
    erreursTypiques: [
      {
        id: 'b21-zones-detecteurs', champ: 'b21-zones', nombre: { valeur: 9, tolerance: 0 },
        message: 'Tu as compté les détecteurs, pas les zones : l’énoncé répartit les détecteurs de chaque espace sur 2 zones.',
      },
    ],
    explication: 'SP / SM : magasin 2 / 1 ; fromagerie 2 / 1 ; transformation et sas 2 / 1. Nombre de zones : 6 (2 par espace).',
  },
  {
    label: 'B.2.2', partie: 2, type: 'tableau',
    enonce: '**Choisir** la centrale et son accessoire.',
    competence: 'C3', points: 2, dtr: [DTR11.centrale, pageDtr(11)], pageSujet: 15,
    colonnes: ['Désignation', 'Référence'],
    lignes: [
      { cellules: [
        txt('b22-cen-des', ['Centrale d’alarme anti-intrusion 10 zones', "Centrale d'alarme anti-intrusion 10 zones", 'Centrale d’alarme anti-intrusion 10 zones (sans clavier)', 'Centrale d’alarme filaire 10 zones', 'Centrale 10 zones']),
        txt('b22-cen-ref', ref('I-ON20EU', 'ION20EU', 'I-ON 20EU')),
      ] },
      { cellules: [
        txt('b22-bat-des', ['Batterie 12 V', 'Batterie 12V', 'Batterie 12 volts 7 ampères', 'Batterie 12 V 7 Ah', 'Batterie 12 volts 7 ampères à prévoir']),
        txt('b22-bat-ref', ref('SCA00001')),
      ] },
    ],
    indice: 'Comparatif des centrales (1re page du DTR 11) : zones filaires, usage ; la batterie est « à prévoir ».',
    aides: [
      '📖 DTR 11 : « Comparatif Centrales I-ON », puis la page de la centrale retenue (tableau Référence / Désignation).',
      '🧭 Méthode : vérifie que la centrale gère le nombre de zones trouvé en B.2.1 et accepte un transmetteur ; son accessoire obligatoire est la batterie indiquée « à prévoir ».',
      '✏️ Forme de la réponse : deux lignes : la centrale (désignation + référence I-ON…) et la batterie (désignation + référence SCA…).',
    ],
    erreursTypiques: [
      {
        id: 'b22-surdim', champ: 'b22-cen-ref', valeurs: ref('I-ON200FR', 'I-ONG3LM'),
        message: 'Cette centrale est prévue pour le tertiaire et beaucoup plus de zones : une centrale 10 zones suffit.',
      },
      {
        id: 'b22-batterie-sirene', champ: 'b22-bat-ref', valeurs: ref('SCA00002'),
        message: 'Cette batterie 12 V / 2 Ah est celle des sirènes : la centrale demande une batterie 7 Ah.',
      },
    ],
    explication: 'Centrale d’alarme anti-intrusion 10 zones : I-ON20EU ; batterie 12 V (7 Ah) : SCA00001.',
  },
  {
    label: 'B.2.3', partie: 2, type: 'tableau',
    enonce: '**Choisir** les détecteurs d’ouverture.',
    competence: 'C3', points: 1.5, dtr: [DTR11.contacts, pageDtr(10) + 1], pageSujet: 15,
    colonnes: ['Désignation', 'Référence'],
    lignes: [{ cellules: [
      txt('b23-des', [
        'Contact magnétique en plastique montage saillie', 'Contact magnétique en plastique à montage en saillie', 'contact magnétique plastique saillie',
        'contact magnétique en plastique à montage en saillie NF A2P', 'Contact cylindrique en plastique saillie / encastré', 'contact cylindrique en plastique saillie',
      ]),
      // Corrigé officiel : « 410-FR ou TF-M » (410-TF-M) ; or le descriptif (DTR 10) demande un
      // contact NFa2p en plastique à montage en saillie, ce qui désigne le 400-FR du DTR 11 :
      // les trois références sont acceptées.
      txt('b23-ref', ref('410-FR', '410-TF-M', 'TF-M', '400-FR')),
    ] }],
    indice: 'Descriptif général (2e page du DTR 10) : détecteur d’ouverture filaire en plastique à montage en saillie NFa2p.',
    aides: [
      '📖 Descriptif général (2e page du DTR 10), puis DTR 11 « Détecteurs d’ouverture ».',
      '🧭 Méthode : retiens les critères du descriptif (filaire, plastique, montage en saillie, NFa2p) et cherche le contact qui les remplit tous.',
      '✏️ Forme de la réponse : la désignation du contact et sa référence (…-FR).',
    ],
    erreursTypiques: [
      {
        id: 'b23-encastrable', champ: 'b23-ref', valeurs: ref('423-TF'),
        message: 'Ce contact est encastrable : le descriptif demande un montage en saillie.',
      },
    ],
    explication: 'Corrigé officiel : contact magnétique en plastique montage saillie, 410-FR ou 410-TF-M. (Le 400-FR, seul contact du DTR 11 marqué NF A2P, est aussi accepté.)',
  },
  {
    label: 'B.2.4', partie: 2, type: 'tableau',
    enonce: '**Choisir** les détecteurs de mouvement.',
    competence: 'C3', points: 1.5, dtr: [DTR11.ir, pageDtr(10) + 1], pageSujet: 15,
    colonnes: ['Désignation', 'Référence'],
    lignes: [{ cellules: [
      txt('b24-des', [
        'Détecteur volumétrique filaire infrarouge', 'Détecteur volumétrique filaire infrarouge passif', 'Détecteur infrarouge XCELWPT',
        'détecteur volumétrique infrarouge filaire', 'détecteur infrarouge 9 m 90°',
      ]),
      txt('b24-ref', ref('XCELWPT', 'XCEL WPT')),
    ] }],
    indice: 'Descriptif : infrarouge filaire, fixation murale, portée 9 m sur 90°.',
    aides: [
      '📖 Descriptif général (2e page du DTR 10), puis DTR 11 « Détecteurs volumétriques infrarouge ».',
      '🧭 Méthode : élimine les détecteurs de plafond (360°) et les longues portées ; garde celui dont la portée et l’angle correspondent au descriptif.',
      '✏️ Forme de la réponse : la désignation du détecteur et sa référence.',
    ],
    erreursTypiques: [
      {
        id: 'b24-plafond', champ: 'b24-ref', valeurs: ref('SX360Z', 'FX-360'),
        message: 'Ce détecteur se fixe au plafond (360°) : le descriptif demande une fixation murale, 9 m sur 90°.',
      },
      {
        id: 'b24-cx702', champ: 'b24-ref', valeurs: ref('CX702', 'CDX-NAM'),
        message: 'Sa portée ne correspond pas au descriptif (9 m sur un angle de 90°).',
      },
    ],
    explication: 'Détecteur volumétrique filaire infrarouge (passif), 9 m / 90° : XCELWPT.',
  },
  {
    label: 'B.2.5', partie: 2, type: 'tableau',
    enonce: '**Choisir** le clavier.',
    competence: 'C3', points: 1.5, dtr: [DTR11.clavier, pageDtr(10) + 1], pageSujet: 15,
    colonnes: ['Désignation', 'Référence'],
    lignes: [{ cellules: [
      txt('b25-des', [
        'Clavier LCD filaire avec badges', 'Clavier LCD filaire avec lecteur de badges intégré', 'Clavier LCD filaire avec lecteur de badges',
        'clavier filaire LCD avec badges',
      ]),
      txt('b25-ref', ref('I-KP01', 'IKP01', 'I-KP 01')),
    ] }],
    indice: 'Descriptif : clavier LCD filaire de commande intérieur, avec lecteur de badges intégré.',
    aides: [
      '📖 Descriptif général (2e page du DTR 10), puis DTR 11 « Clavier filaire de commande intérieur ».',
      '🧭 Méthode : le clavier doit être filaire (pas radio) ; parmi les claviers filaires, écarte les accessoires (lecteur externe, badges) et choisis le clavier indiqué par le DTR 14.',
      '✏️ Forme de la réponse : la désignation du clavier et sa référence.',
    ],
    erreursTypiques: [
      {
        id: 'b25-radio', champ: 'b25-ref', valeurs: ref('KEY-RKPZ', 'KEY-RKPZ-KIT', 'KEY-RAS'),
        message: 'Ce clavier est radio : le descriptif demande un clavier filaire.',
      },
    ],
    explication: 'Clavier LCD filaire avec lecteur de badges intégré : I-KP01.',
  },
  {
    label: 'B.2.6', partie: 2, type: 'tableau',
    enonce: '**Choisir** la sirène et son accessoire.',
    competence: 'C3', points: 2, dtr: [DTR11.sirenes, pageDtr(10) + 1], pageSujet: 15,
    colonnes: ['Désignation', 'Référence'],
    lignes: [
      { cellules: [
        txt('b26-sir-des', ['Sirène autoalimentée intérieure', 'Sirène autoalimentée intérieure métal', 'Sirène auto alimentée intérieure', 'Sirène d’alarme intérieure', "Sirène d'alarme intérieure NF A2P 3 boucliers"]),
        txt('b26-sir-ref', ref('SIMAX', 'SI-MAX')),
      ] },
      { cellules: [
        txt('b26-bat-des', ['Batterie 12V', 'Batterie 12 V', 'Batterie 12V 2Ah', 'Batterie 12 V / 2 Ah', 'Batterie 12V/ 2Ah (obligatoire)']),
        txt('b26-bat-ref', ref('SCA00002')),
      ] },
    ],
    indice: 'Descriptif : sirène filaire d’intérieur NFa2p 3 boucliers auto-alimentée ; la batterie est obligatoire.',
    aides: [
      '📖 Descriptif général (2e page du DTR 10), puis DTR 11 « Sirènes intérieures et extérieures ».',
      '🧭 Méthode : garde la sirène d’intérieur (pas celles d’extérieur ni les sirènes PPMS) ; son accessoire est la batterie marquée « obligatoire » sur la même ligne.',
      '✏️ Forme de la réponse : deux lignes : la sirène (désignation + référence) et sa batterie (désignation + référence SCA…).',
    ],
    erreursTypiques: [
      {
        id: 'b26-exterieure', champ: 'b26-sir-ref', valeurs: ref('SIREXF', 'SIRUS'),
        message: 'Cette sirène est extérieure : le descriptif demande une sirène d’intérieur.',
      },
      {
        id: 'b26-batterie-centrale', champ: 'b26-bat-ref', valeurs: ref('SCA00001'),
        message: 'Cette batterie 7 Ah est celle de la centrale : la sirène demande sa propre batterie 2 Ah.',
      },
    ],
    explication: 'Sirène autoalimentée intérieure : SIMAX ; batterie 12 V / 2 Ah : SCA00002.',
  },
  {
    label: 'B.2.7', partie: 2, type: 'tableau',
    enonce: '**Choisir** le transmetteur.',
    competence: 'C3', points: 1.5, dtr: [DTR11.clavier, pageDtr(10) + 1], pageSujet: 15,
    colonnes: ['Désignation', 'Référence'],
    lignes: [{ cellules: [
      txt('b27-des', [
        'Data & application GSM', 'Data et application GSM', 'Data & application en GSM', 'Data & application en GSM prévoir carte micro SIM data',
        'transmetteur data application GSM', 'Data, application, email et télésurveillance en IP en 4G',
      ]),
      txt('b27-ref', ref('COM-DATA-4G', 'COMDATA4G', 'COM-DATA 4G')),
    ] }],
    indice: 'Descriptif : transmetteur enfichable dans la centrale, transmission en IP et 4G GSM.',
    aides: [
      '📖 Descriptif général (2e page du DTR 10), puis DTR 11 « Carte transmetteurs téléphonique enfichable dans la centrale ».',
      '🧭 Méthode : lis les trois lignes de présentation au-dessus du tableau : une seule carte transmet en IP et en 4G.',
      '✏️ Forme de la réponse : la désignation du transmetteur et sa référence COM-….',
    ],
    erreursTypiques: [
      {
        id: 'b27-rtc-gsm', champ: 'b27-ref', valeurs: ref('COM-SD-GSM', 'COM-SD-PSTN'),
        message: 'Cette carte ne transmet pas en IP / 4G : relis les lignes de présentation au-dessus du tableau.',
      },
    ],
    explication: 'Data & application GSM (IP en 4G et 2G) : COM-DATA-4G.',
  },

  /* ═══════════════ B.3 Implantation ═══════════════ */
  {
    label: 'B.3', partie: 2, type: 'placement',
    enonce: '**Implanter** l’ensemble des détecteurs sur le plan ci-dessous en utilisant les symboles donnés dans la légende.',
    contexte: 'Légende : détecteur d’ouverture ; détecteur de mouvement. Pose un repère à l’emplacement de chaque détecteur.',
    competence: 'C11', points: 6, dtr: [pageDtr(1), pageDtr(10)], pageSujet: 16,
    plan: { src: `${IMG}/q-b3-plan.jpg`, alt: 'Plan des locaux : fromagerie, magasin de vente, zone de transformation, SAS et chambre froide, avec la légende détecteur d’ouverture / détecteur de mouvement', w: 655, h: 720 },
    symbole: 'point',
    // Positions du corrigé (p. 16) : 5 détecteurs d'ouverture et 3 détecteurs de mouvement.
    // Corrigé officiel : le plan corrigé ne place qu'UN contact dans la fromagerie (porte du haut),
    // alors que B.2.1 et le schéma B.4 en comptent deux ; on garde le plan du corrigé.
    attendus: [
      { x: 0.281, y: 0.045, label: 'Ouverture — fromagerie (porte du haut)' },
      { x: 0.123, y: 0.074, label: 'Mouvement — fromagerie' },
      { x: 0.767, y: 0.189, label: 'Ouverture — magasin (porte du haut)' },
      { x: 0.435, y: 0.227, label: 'Mouvement — magasin' },
      { x: 0.934, y: 0.268, label: 'Ouverture — magasin (porte de droite)' },
      { x: 0.435, y: 0.419, label: 'Mouvement — zone de transformation' },
      { x: 0.942, y: 0.598, label: 'Ouverture — zone de transformation' },
      { x: 0.475, y: 0.887, label: 'Ouverture — SAS chambre froide' },
    ],
    tolerance: { x: 0.06, y: 0.06 },
    max: 10,
    indice: 'Un détecteur d’ouverture sur chaque issue extérieure ; un détecteur de mouvement dans un angle de chaque espace, orienté vers les passages.',
    aides: [
      '📖 Reprends ta réponse B.2.1 (détecteurs par espace) et le plan du DTR 1 ; portée du détecteur de mouvement : DTR 11 (9 m sur 90°).',
      '🧭 Méthode : place les détecteurs d’ouverture sur les portes donnant sur l’extérieur ; place chaque détecteur de mouvement dans un angle de l’espace, de façon à couvrir les passages obligés.',
      '✏️ Forme de la réponse : un repère par détecteur, posé sur la porte (ouverture) ou dans l’angle du local (mouvement).',
    ],
    explication: 'Corrigé : détecteurs d’ouverture sur la porte du haut de la fromagerie, les deux portes extérieures du magasin, la porte extérieure de la zone de transformation et la porte extérieure du SAS ; détecteurs de mouvement dans l’angle haut gauche de la fromagerie, du magasin et de la zone de transformation.',
  },

  /* ═══════════════ B.4 Schéma de raccordement ═══════════════ */
  {
    label: 'B.4', partie: 2, type: 'schema',
    enonce: '**Compléter** le schéma de raccordement suivant avec soin (traits à la règle).\n- Clavier\n- Sirène\n- Espace magasin : Z0 détecteur mouvement et Z1 détecteur ouverture\n- Espace fromagerie : Z2 détecteur ouverture et Z3 détecteur mouvement',
    contexte: 'NB : Le détecteur de mouvement et les deux détecteurs magnétiques de la zone de transformation et du sas chambre froide ne sont pas à raccorder. Le schéma occupe deux pages du sujet (17 et 18), assemblées l’une sous l’autre : la centrale y apparaît deux fois.',
    competence: 'C11', points: 20, dtr: [pageDtr(12), pageDtr(13), pageDtr(14), pageDtr(12) + 3], pageSujet: 17,
    traits: B4_TRAITS,
    platineTpId: 'chevrerie-b4-intrusion',
    corrigeImage: { src: 'corriges/chevrerie/q-b4-corrige.jpg', alt: 'Schéma de raccordement de l’alarme intrusion (sirène, clavier, détecteurs du magasin et de la fromagerie) — corrigé' },
    indice: 'Clavier sur le bus (0V, +12V, A, B) ; sirène : 0V, 12V BELL, BELL, TR ; chaque zone en double équilibrage : 4K7 en parallèle sur l’alarme, 2K2 en fin de ligne, autoprotection en série.',
    aides: [
      '📖 Clavier : DTR 14 (figure 6) ; sirène : DTR 13 (câblage) et 4e page du DTR 12 (bornes STB, BELL, TR, 12V BELL, 0V) ; zones : DTR 12, figures 2 et 5 (double équilibrage, doubles portes).',
      '🧭 Méthode : 1) clavier : relie borne à borne le bus de la centrale (0V, +12V, A, B) ; 2) sirène : alimentation de charge, commande, autoprotection ; 3) alimente les deux IR en 12 V ; 4) pour chaque zone, pars de la borne Z, traverse l’alarme (4K7 en parallèle), la 2K2 puis l’autoprotection, et reviens au commun de la zone ; deux contacts sur une même zone se câblent en série (doubles portes).',
      '✏️ Forme de la réponse : des traits borne à borne (4 pour le clavier, 5 pour la sirène, 4 pour l’alimentation des IR, puis les boucles Z0 à Z3 avec leurs résistances) ; puis le même câblage sur la platine.',
    ],
    explication: 'Corrigé : sirène : 0V centrale → CHARGE 0V et une borne A.P. TAMPER, 12V BELL → +12V, TR → l’autre borne A.P. TAMPER, BELL → I1. Clavier : 0V, +12V, A, B de la centrale → 0V, 12V, A, B du clavier. IR magasin et IR fromagerie alimentés par 0V / +12V. Z0 : IR magasin (TAMPER — 2K2 — ALARM ‖ 4K7) jusqu’au commun Z0/Z1. Z1 : les deux contacts magnétiques du magasin en série (ALARME ‖ 4K7 de chaque contact, 2K2 de fin de ligne, puis les deux AP TAMPER) jusqu’au commun. Z2 : les deux contacts de la fromagerie, câblés de même, jusqu’au commun Z2/Z3. Z3 : IR fromagerie jusqu’au commun Z2/Z3.',
  },
];
