/**
 * Symboles normalisés du schéma développé — CEI 60617.
 *
 * Source unique : ces fonctions servent au schéma affiché dans l'application ET
 * à la maquette de `docs/maquettes/`, qui les charge via un paquet produit par
 * `npm run symboles`. Un symbole ne doit jamais être redessiné à la main
 * ailleurs : l'élève doit retrouver exactement le même tracé partout, sinon il
 * apprend deux langages au lieu d'un.
 *
 * Ce qui distingue un appareil d'un autre sur un folio, ce n'est pas le contact
 * — ils se ressemblent tous — mais son ACTIONNEUR : le bilame du relais
 * thermique, la came de l'interrupteur de position, le champignon du coup de
 * poing, le poussoir du bouton. C'est ce vocabulaire-là qu'il faut apprendre à
 * lire, et c'est pourquoi chaque actionneur est dessiné ici avec soin.
 *
 * Classes CEI 60617 des symboles repris ici :
 *   contact à fermeture 07-15-12 · contact à ouverture 07-15-13
 *   bouton-poussoir 07-07-02 (F) / 07-07-03 (O) · élément thermique 07-15-21
 *   disjoncteur 07-13-01 · fusible 07-21-01 · sectionneur 07-21-05
 *   transformateur 06-09-02 · machine asynchrone 06-04-01 (M 3~)
 *   lampe de signalisation 08-10-01 · borne 03-02-02 · prise de terre 02-15-01
 * La manœuvre positive d'ouverture relève de la CEI/EN 60947-5-1 annexe K.
 *
 * Le contact à fermeture et le contact à ouverture se distinguent par UNE seule
 * chose : la barre. Le contact à ouverture porte le contact fixe, que la lame
 * pontait au repos ; le contact à fermeture n'en a pas, sa lame ne touche rien
 * tant que l'organe n'est pas sollicité.
 *
 * Conventions de tracé :
 * · un symbole occupe un conducteur VERTICAL d'axe `x`, entre `y1` et `y2` ;
 * · l'actionneur se dessine à GAUCHE du conducteur, le repère à DROITE ;
 * · le repérage des bornes se lit le long du fil, comme sur un folio ;
 * · un organe qui coupe est tracé en rouge, un contact au repos en gris.
 */

/** Emplacement d'un symbole sur son conducteur vertical. */
export interface Pose {
  /** Axe du conducteur. */
  x: number;
  /** Haut et bas de l'emprise du symbole. */
  y1: number;
  y2: number;
}

export const TRAIT = {
  /** Conducteur et organe actif. */
  actif: '#2B2F36',
  /** Organe qui coupe : c'est lui qu'on cherche en dépannage. */
  coupe: '#D93A3A',
  /** Contact au repos, non sollicité. */
  repos: '#8E979F',
} as const;

/** Épaisseurs : le conducteur est plus épais que les traits de construction. */
const E_FIL = 2.4;
const E_MECA = 1.3;

/** Demi-hauteur de l'emprise d'un contact. */
const H = 13;
/** Décollement de la lame quand le contact est ouvert. */
const DECOL = 14;

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ligne = (x1: number, y1: number, x2: number, y2: number, col: string, w = E_FIL): string =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;

const pointille = (x1: number, y1: number, x2: number, y2: number, col: string): string =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${E_MECA}" stroke-dasharray="4 3"/>`;

/* ==================================================================== actionneurs
 *
 * C'est l'actionneur, et non le contact, qui dit de quel appareil il s'agit :
 * les contacts se ressemblent tous. Chacun se greffe à gauche, relié par le
 * trait mécanique en pointillés — « c'est cet organe qui manœuvre ce contact ».
 *
 * Classes CEI 60617 : bouton-poussoir 07-07-02 (fermeture) et 07-07-03
 * (ouverture) ; élément thermique 07-15-21 ; l'arrêt d'urgence est le
 * bouton-poussoir à ouverture coiffé d'une tête coup de poing.
 */

/** Bilame d'un relais thermique : le « Z » couché de l'élément chauffant (07-15-21). */
export function actBilame(x: number, ym: number, col: string): string {
  const b = x - 42;
  return pointille(x - 4, ym, b + 16, ym, col)
    + ligne(b, ym - 8, b + 8, ym - 8, col, 1.8)
    + ligne(b + 8, ym - 8, b + 8, ym + 8, col, 1.8)
    + ligne(b + 8, ym + 8, b + 16, ym + 8, col, 1.8);
}

/**
 * Commande par came : le triangle appuyé sur le contact.
 *
 * C'est le tracé du folio de référence du TP pour l'interrupteur de position de
 * l'écran de protection. Le galet proprement dit se dessine, lui, par un cercle
 * en bout de tige (`actGalet`) : les deux existent selon ce qui attaque le
 * contact, la came ou le galet.
 */
export function actCame(x: number, ym: number, col: string): string {
  const p = x - 7;
  return `<path d="M${p} ${ym} L${p - 17} ${ym - 10} L${p - 17} ${ym + 10} Z" `
    + `fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`;
}

/** Commande par galet : le cercle en bout de tige. */
export function actGalet(x: number, ym: number, col: string): string {
  const t = x - 24;
  return pointille(x - 4, ym, t, ym, col)
    + `<circle cx="${t - 7}" cy="${ym}" r="7" fill="none" stroke="${col}" stroke-width="1.8"/>`;
}

/** Tête coup de poing d'un arrêt d'urgence : la demi-galette sur sa tige. */
export function actChampignon(x: number, ym: number, col: string): string {
  const t = x - 26;
  return pointille(x - 4, ym, t, ym, col)
    + `<path d="M${t} ${ym - 10} a10 10 0 0 0 0 20 z" fill="none" stroke="${col}" stroke-width="1.8"/>`
    + ligne(t, ym - 10, t, ym + 10, col, 1.8);
}

/** Tête d'un bouton-poussoir : la tige et sa traverse (07-07-02 / 07-07-03). */
export function actPoussoir(x: number, ym: number, col: string): string {
  const t = x - 24;
  return pointille(x - 4, ym, t, ym, col)
    + ligne(t, ym - 8, t, ym + 8, col, 1.9);
}

/**
 * Manœuvre positive d'ouverture (CEI/EN 60947-5-1, annexe K) : la flèche
 * inscrite dans un cercle, posée sur le contact.
 *
 * Elle atteste que le mouvement de commande sépare inévitablement les contacts,
 * même soudés — c'est ce qui autorise un contact à assurer une fonction de
 * sécurité. Le TP l'exige pour l'interrupteur de position, mais le folio de
 * référence ne la porte pas : elle reste donc optionnelle, à activer par
 * `ouverturePositive`.
 */
export function marqueOuverturePositive(x: number, ym: number, col: string): string {
  const r = 8;
  return `<circle cx="${x}" cy="${ym}" r="${r}" fill="#fff" stroke="${col}" stroke-width="1.5"/>`
    + ligne(x, ym + 4, x, ym - 3, col, 1.6)
    + `<path d="M${x - 3} ${ym - 2} L${x} ${ym - 6} L${x + 3} ${ym - 2} Z" fill="${col}"/>`;
}

/** Déclencheur magnétique d'un disjoncteur : la croix. */
export function actMagnetique(x: number, y: number, col: string): string {
  const r = 5;
  return ligne(x - r, y - r, x + r, y + r, col, 1.7) + ligne(x - r, y + r, x + r, y - r, col, 1.7);
}

/** Déclencheur thermique d'un disjoncteur : le crochet. */
export function actThermique(x: number, y: number, col: string): string {
  return `<path d="M${x} ${y - 8} q9 0 9 5 q0 5 -9 5 q-9 0 -9 5 q0 5 9 5" `
    + `fill="none" stroke="${col}" stroke-width="1.8"/>`;
}

const ACTIONNEURS: Record<string, (x: number, ym: number, col: string) => string> = {
  bilame: actBilame, came: actCame, galet: actGalet,
  champignon: actChampignon, poussoir: actPoussoir,
};
export type Actionneur = 'bilame' | 'came' | 'galet' | 'champignon' | 'poussoir';

/* ==================================================================== textes */

/** Repère de l'appareil, à droite du symbole. */
const repere = (x: number, ym: number, rep: string, dx = 40): string =>
  `<text class="sym-rep" x="${x + dx}" y="${ym + 5}">${esc(rep)}</text>`;

/**
 * Numéros de bornes d'un contact, lus le long du fil comme sur un folio
 * (texte tourné d'un quart de tour).
 */
const bornes = (x: number, ym: number, b: [string, string] | undefined): string => {
  if (!b) return '';
  // À DROITE du conducteur : la gauche est occupée par l'actionneur, et les
  // numéros s'y cognaient au bilame comme au champignon.
  const t = (y: number, s: string) =>
    `<text class="sym-brn" transform="translate(${x + 10} ${y}) rotate(-90)" text-anchor="middle">${esc(s)}</text>`;
  return t(ym - H - 10, b[0]) + t(ym + H + 10, b[1]);
};

/**
 * Repérage équipotentiel d'un conducteur : le numéro que l'élève lit
 * physiquement sur le fil dans l'armoire. Écrit le long du conducteur.
 */
export const equipotentielle = (x: number, y: number, n: string): string =>
  `<text class="sym-eq" transform="translate(${x - 11} ${y}) rotate(-90)" text-anchor="middle">${esc(n)}</text>`;

/* ==================================================================== contacts */

export interface OptContact {
  rep: string;
  /** Numéros des deux bornes (« 95 » / « 96 », « 13 » / « 14 »…). */
  bornes?: [string, string];
  actionneur?: Actionneur;
  /** Légende sous le repère (fonction de l'organe, renvoi de folio). */
  legende?: string;
}

/**
 * Contact à ouverture (NC, « contact de repos »).
 *
 * La barre horizontale est ce qui le distingue du contact à fermeture : elle
 * figure le contact fixe, sur lequel la lame repose au repos. Ouvert, la lame
 * se soulève et s'écarte — c'est ce que l'élève doit reconnaître d'un coup d'œil
 * quand une chaîne d'arrêt est coupée.
 */
export function contactNF(p: Pose, ouvert: boolean, o: OptContact): string {
  const col = ouvert ? TRAIT.coupe : TRAIT.actif;
  const ym = (p.y1 + p.y2) / 2;
  const bas = ym + H;
  return ligne(p.x, p.y1, p.x, ym - H, col)
    + ligne(p.x, bas, p.x, p.y2, col)
    + ligne(p.x - 11, bas, p.x + 11, bas, col)                       // contact fixe
    + ligne(p.x, ym - H, ouvert ? p.x + DECOL : p.x, bas, col)       // lame
    + (o.actionneur ? ACTIONNEURS[o.actionneur](p.x, ym, col) : '')
    + bornes(p.x, ym, o.bornes)
    + repere(p.x, ym, o.rep)
    + (o.legende ? `<text class="sym-leg" x="${p.x + 40}" y="${ym + 19}">${esc(o.legende)}</text>` : '');
}

/**
 * Contact à fermeture (NO, « contact de travail »).
 *
 * Pas de barre : au repos la lame est écartée et ne touche rien. Elle se rabat
 * sur le conducteur quand l'organe est sollicité.
 */
export function contactNO(p: Pose, ferme: boolean, o: OptContact): string {
  const col = ferme ? TRAIT.actif : TRAIT.repos;
  const ym = (p.y1 + p.y2) / 2;
  return ligne(p.x, p.y1, p.x, ym - H, col)
    + ligne(p.x, ym + H, p.x, p.y2, col)
    + ligne(p.x, ym - H, ferme ? p.x : p.x + DECOL, ym + H, col)
    + (o.actionneur ? ACTIONNEURS[o.actionneur](p.x, ym, col) : '')
    + bornes(p.x, ym, o.bornes)
    + repere(p.x, ym, o.rep)
    + (o.legende ? `<text class="sym-leg" x="${p.x + 40}" y="${ym + 19}">${esc(o.legende)}</text>` : '');
}

/* ==================================================================== organes */

/** Bobine de contacteur : le rectangle, bornes A1 et A2. */
export function bobine(p: Pose, o: { rep: string; legende?: string }): string {
  const ym = (p.y1 + p.y2) / 2;
  const h = p.y2 - p.y1 - 16;
  return ligne(p.x, p.y1, p.x, p.y1 + 8, TRAIT.actif)
    + ligne(p.x, p.y2 - 8, p.x, p.y2, TRAIT.actif)
    + `<rect x="${p.x - 24}" y="${p.y1 + 8}" width="48" height="${h}" fill="#fff" `
    + `stroke="${TRAIT.actif}" stroke-width="${E_FIL}"/>`
    + `<text class="sym-brn" x="${p.x - 28}" y="${p.y1 + 16}" text-anchor="end">A1</text>`
    + `<text class="sym-brn" x="${p.x - 28}" y="${p.y2 - 4}" text-anchor="end">A2</text>`
    + repere(p.x, ym, o.rep, 32)
    + (o.legende ? `<text class="sym-leg" x="${p.x + 32}" y="${ym + 19}">${esc(o.legende)}</text>` : '');
}

/** Voyant de signalisation : le cercle barré d'une croix. */
export function voyant(p: Pose, allume: boolean, o: { rep: string; legende?: string }): string {
  const ym = (p.y1 + p.y2) / 2;
  const r = 17;
  const d = r * 0.71;
  return ligne(p.x, p.y1, p.x, ym - r, TRAIT.actif)
    + ligne(p.x, ym + r, p.x, p.y2, TRAIT.actif)
    + `<circle cx="${p.x}" cy="${ym}" r="${r}" fill="${allume ? '#FFE9A8' : '#fff'}" `
    + `stroke="${TRAIT.actif}" stroke-width="${E_FIL}"/>`
    + ligne(p.x - d, ym - d, p.x + d, ym + d, TRAIT.actif, 2)
    + ligne(p.x - d, ym + d, p.x + d, ym - d, TRAIT.actif, 2)
    + repere(p.x, ym, o.rep, r + 10)
    + (o.legende ? `<text class="sym-leg" x="${p.x + r + 10}" y="${ym + 19}">${esc(o.legende)}</text>` : '');
}

/**
 * Disjoncteur magnétothermique : contact, croix du déclencheur magnétique,
 * crochet du déclencheur thermique. Les deux déclencheurs sont ce qui le
 * distingue d'un simple interrupteur — et ce que l'élève doit savoir nommer.
 */
export function disjoncteur(p: Pose, ouvert: boolean, o: { rep: string; legende?: string }): string {
  const col = ouvert ? TRAIT.coupe : TRAIT.actif;
  const ym = (p.y1 + p.y2) / 2;
  return ligne(p.x, p.y1, p.x, ym - H, col)
    + ligne(p.x, ym + H, p.x, p.y2, col)
    + ligne(p.x, ym - H, ouvert ? p.x + DECOL : p.x, ym + H, col)
    + actMagnetique(p.x, ym - H - 9, col)
    + actThermique(p.x, ym + H + 12, col)
    + repere(p.x, ym, o.rep, 26)
    + (o.legende ? `<text class="sym-leg" x="${p.x + 26}" y="${ym + 19}">${esc(o.legende)}</text>` : '');
}

/** Sectionneur porte-fusibles : le contact et sa cartouche. */
export function sectionneurFusible(p: Pose, ouvert: boolean, o: { rep: string }): string {
  const col = ouvert ? TRAIT.coupe : TRAIT.actif;
  const ym = (p.y1 + p.y2) / 2;
  return ligne(p.x, p.y1, p.x, ym - H - 12, col)
    + `<rect x="${p.x - 6}" y="${ym - H - 12}" width="12" height="20" fill="#fff" `
    + `stroke="${col}" stroke-width="1.8"/>`
    + ligne(p.x, ym - H + 8, p.x, ym - H, col)
    + ligne(p.x, ym + H, p.x, p.y2, col)
    + ligne(p.x, ym - H, ouvert ? p.x + DECOL : p.x, ym + H, col)
    + repere(p.x, ym, o.rep, 24);
}

/** Élément bilame d'un relais thermique sur une phase de puissance. */
export function bilamePuissance(p: Pose, o: { rep?: string }): string {
  const ym = (p.y1 + p.y2) / 2;
  return ligne(p.x, p.y1, p.x, ym - 9, TRAIT.actif)
    + ligne(p.x, ym + 9, p.x, p.y2, TRAIT.actif)
    + `<rect x="${p.x - 9}" y="${ym - 9}" width="18" height="18" fill="#fff" `
    + `stroke="${TRAIT.actif}" stroke-width="1.8"/>`
    + ligne(p.x - 5, ym, p.x + 5, ym, TRAIT.actif, 1.6)
    + (o.rep ? repere(p.x, ym, o.rep, 18) : '');
}

/** Transformateur à deux enroulements : les deux cercles sécants. */
export function transformateur(
  p: Pose,
  o: { rep: string; u1: string; u2: string; va?: string },
): string {
  const ym = (p.y1 + p.y2) / 2;
  const r = 20;
  return ligne(p.x, p.y1, p.x, ym - r * 1.5, TRAIT.actif)
    + ligne(p.x, ym + r * 1.5, p.x, p.y2, TRAIT.actif)
    + `<circle cx="${p.x}" cy="${ym - r * 0.55}" r="${r}" fill="none" stroke="${TRAIT.actif}" stroke-width="${E_FIL}"/>`
    + `<circle cx="${p.x}" cy="${ym + r * 0.55}" r="${r}" fill="none" stroke="${TRAIT.actif}" stroke-width="${E_FIL}"/>`
    + `<text class="sym-val" x="${p.x + r + 6}" y="${ym - r * 0.55}">${esc(o.u1)}</text>`
    + `<text class="sym-val" x="${p.x + r + 6}" y="${ym + r * 0.55 + 10}">${esc(o.u2)}</text>`
    + repere(p.x, ym + 4, o.rep, r + 6)
    + (o.va ? `<text class="sym-leg" x="${p.x + r + 40}" y="${ym + 4}">${esc(o.va)}</text>` : '');
}

/** Moteur asynchrone triphasé : le cercle, M et 3~. */
export function moteur(cx: number, cy: number, o: { rep: string }): string {
  const r = 20;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${TRAIT.actif}" stroke-width="${E_FIL}"/>`
    + `<text class="sym-moteur" x="${cx}" y="${cy - 1}" text-anchor="middle">M</text>`
    + `<text class="sym-brn" x="${cx}" y="${cy + 11}" text-anchor="middle">3 ~</text>`
    + `<text class="sym-rep" x="${cx}" y="${cy + r + 14}" text-anchor="middle">${esc(o.rep)}</text>`;
}

/**
 * Borne de bornier : le cercle traversé par le conducteur, barré d'un trait.
 *
 * C'est le symbole le plus utile du folio en dépannage : il marque la frontière
 * entre l'armoire et ce qui est en porte, et c'est là qu'on pose ses pointes.
 */
export function borne(x: number, y: number, rep: string, cote: 'g' | 'd' = 'g'): string {
  const r = 5.5;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${TRAIT.actif}" stroke-width="1.7"/>`
    + ligne(x - r, y + r, x + r, y - r, TRAIT.actif, 1.7)
    + `<text class="sym-borne" x="${cote === 'd' ? x + 11 : x - 11}" y="${y - 8}" `
    + `text-anchor="${cote === 'd' ? 'start' : 'end'}">${esc(rep)}</text>`;
}

/** Prise de terre. */
export function terre(x: number, y: number): string {
  return ligne(x, y - 10, x, y, TRAIT.actif, 1.8)
    + ligne(x - 11, y, x + 11, y, TRAIT.actif, 2)
    + ligne(x - 7, y + 4, x + 7, y + 4, TRAIT.actif, 1.8)
    + ligne(x - 3, y + 8, x + 3, y + 8, TRAIT.actif, 1.8);
}

/** Trait mécanique reliant des contacts manœuvrés ensemble. */
export const lienMecanique = (x1: number, x2: number, y: number, col = TRAIT.actif): string =>
  pointille(x1, y, x2, y, col);

/** Point de jonction électrique. */
export const noeud = (x: number, y: number): string =>
  `<circle cx="${x}" cy="${y}" r="3.4" fill="${TRAIT.actif}"/>`;

/** Feuille de style des textes du schéma, à inclure dans le SVG ou la page. */
export const STYLE_SYMBOLES = `
.sym-rep{font:700 13px/1 "Barlow Condensed",system-ui,sans-serif;fill:#141A21;letter-spacing:.04em}
.sym-leg{font:400 10px/1 "IBM Plex Sans",system-ui,sans-serif;fill:#66717F}
.sym-brn{font:500 8.5px/1 "IBM Plex Mono",ui-monospace,monospace;fill:#66717F}
.sym-borne{font:600 9px/1 "IBM Plex Mono",ui-monospace,monospace;fill:#66717F}
.sym-eq{font:700 10px/1 "IBM Plex Mono",ui-monospace,monospace;fill:#E39A00}
.sym-val{font:600 9.5px/1 "IBM Plex Mono",ui-monospace,monospace;fill:#141A21}
.sym-moteur{font:700 15px/1 "Barlow Condensed",system-ui,sans-serif;fill:#141A21}
`;
