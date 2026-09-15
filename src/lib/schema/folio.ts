/**
 * Mise en page du folio — place les organes, tire les fils, rend le SVG.
 *
 * Le TP décrit l'ORDRE des organes sur chaque colonne ; ce module en déduit les
 * ordonnées, trace les conducteurs entre eux, et appelle la bibliothèque de
 * symboles. Aucune coordonnée n'est écrite dans un TP : déplacer un organe, en
 * insérer un, c'est changer une ligne de liste, pas recalculer un dessin.
 *
 * L'état de chaque contact vient du RÉSEAU (`commande.ts`), jamais d'une
 * déclaration : si la panne a ouvert un contact, l'arête disparaît du réseau et
 * le folio le dessine ouvert. Le schéma ne peut donc pas dire autre chose que ce
 * que l'élève mesure — c'était le risque à écarter en priorité.
 */
import type {
  FolioCadre, FolioColonne, FolioDef, FolioElement, TpDefinition,
} from '../types';
import type { Arete } from '../sim/commande';
import * as S from './symboles';

/* ------------------------------------------------------------- géométrie */

/** Pas horizontal entre deux colonnes. */
const PAS_X = 210;
/** Abscisse de la chaîne principale. */
const X0 = 400;
/** Ordonnées des deux rails. */
const Y_HAUT = 118;
/** Marge sous le dernier organe avant le rail du bas. */
const MARGE_BAS = 26;

/** Hauteur réservée par type d'organe. */
const HAUTEUR: Record<FolioElement['type'], number> = {
  contactNF: 46, contactNO: 46, disjoncteur: 48, bobine: 54, voyant: 60,
  borne: 0, fil: 30, entreeAPI: 54, sortieAPI: 58,
};
/** Écart entre deux organes consécutifs d'une colonne. */
const ECART = 30;

const xDe = (c: FolioColonne): number => X0 + c.dx * PAS_X;

/** Un point du folio où l'élève peut poser une pointe de touche. */
export interface PointFolio { id: string; x: number; y: number; rep: string }

interface Place { el: FolioElement; x: number; y1: number; y2: number }

/**
 * Attribue une ordonnée à chaque organe d'une colonne, de haut en bas.
 * Une borne n'occupe pas de hauteur : c'est un point sur le fil.
 */
function placer(c: FolioColonne, yDepart: number): Place[] {
  const x = xDe(c);
  const out: Place[] = [];
  let y = yDepart;
  for (const el of c.elements) {
    const h = el.h ?? HAUTEUR[el.type];
    y += ECART;
    out.push({ el, x, y1: y, y2: y + h });
    y += h;
  }
  return out;
}

/* ---------------------------------------------------------------- rendu */

const railTexte = (x: number, y: number, t: string, dessous: boolean): string =>
  `<text class="folio-rail" x="${x}" y="${dessous ? y + 21 : y - 11}">${t}</text>`;

/** Le conducteur entre deux points : on descend, puis on traverse. */
function fil(x1: number, y1: number, x2: number, y2: number, coupe: boolean): string {
  const col = coupe ? S.TRAIT.coupe : S.TRAIT.actif;
  const d = x1 === x2
    ? `M${x1} ${y1} L${x2} ${y2}`
    : `M${x1} ${y1} L${x1} ${y2} L${x2} ${y2}`;
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" `
    + `${coupe ? 'stroke-dasharray="7 4" ' : ''}stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Le symbole d'un organe, dans l'état où le réseau le montre. */
function symbole(p: Place, vivante: (a: string, b: string) => boolean): string {
  const { el } = p;
  const pose = { x: p.x, y1: p.y1, y2: p.y2 };
  const relie = el.b ? vivante(el.a, el.b) : true;
  const o = {
    rep: el.rep ?? '',
    bornes: el.bornes,
    actionneur: el.actionneur,
    legende: el.legende,
  };
  switch (el.type) {
    case 'contactNF': return S.contactNF(pose, !relie, o);
    case 'contactNO': return S.contactNO(pose, relie, o);
    case 'disjoncteur': return S.disjoncteur(pose, !relie, o);
    case 'bobine': return S.bobine(pose, { rep: o.rep, legende: o.legende });
    case 'voyant': return S.voyant(pose, relie, { rep: o.rep, legende: o.legende });
    case 'entreeAPI': return S.entreeAPI(pose, relie, { rep: o.rep, legende: o.legende });
    case 'sortieAPI':
      return S.sortieAPI(pose, relie, { rep: o.rep, legende: o.legende, commun: el.commun });
    case 'borne': return '';
    case 'fil': return fil(p.x, p.y1, p.x, p.y2, false);
    default: return '';
  }
}

export interface RenduFolio {
  svg: string;
  /** Boîte du dessin, pour le viewBox. */
  largeur: number;
  hauteur: number;
  /** Tous les points de mesure, avec leur position. */
  points: PointFolio[];
}

/**
 * Dessine le folio.
 *
 * `reseau` est le réseau de commande dans l'état courant : c'est lui, et rien
 * d'autre, qui dit quel contact est ouvert et quel conducteur est coupé.
 */
export function rendreFolio(
  tp: Pick<TpDefinition, 'folio'>,
  reseau: readonly Arete[],
  opts: {
    zone?: readonly string[]; r?: string | null; k?: string | null;
    /** Repère à encadrer : l'organe dont on parle, dans un folio qui en porte trente. */
    focusRep?: string | null;
  } = {},
): RenduFolio | null {
  const f: FolioDef | undefined = tp.folio;
  if (!f) return null;

  // Un CONTACT est une arête unique : son état se lit directement.
  const vivante = (a: string, b: string): boolean =>
    reseau.some(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));

  /**
   * Un CONDUCTEUR du folio peut traverser plusieurs arêtes du réseau — les deux
   * faces d'une borne de bornier, par exemple. Tester l'arête unique le tracerait
   * rouge alors qu'il conduit très bien. On compare donc les composantes
   * connexes : deux points reliés par un chemin, quel qu'il soit, sont reliés.
   */
  // Seuls les FILS et les ponts de bornier comptent : suivre aussi les contacts
  // et les récepteurs laisserait le voyant refermer le circuit et un conducteur
  // coupé resterait tracé en noir.
  const comp = composantes(reseau.filter(x => x.nature === 'fil'));
  const coupe = (a: string, b: string): boolean => {
    const ca = comp.get(a);
    const cb = comp.get(b);
    return ca === undefined || cb === undefined || ca !== cb;
  };

  /* ---- placement
   * Les colonnes se placent dans l'ordre : une dérivation démarre à l'ordonnée
   * de son point de branchement, qui doit donc déjà être placé. Les placer
   * toutes depuis le rail du haut — première version — faisait remonter le
   * contact d'auto-maintien tout en haut du folio, loin de son origine. */
  const tete = f.tete
    ? [{ el: f.tete, x: X0, y1: 48, y2: 48 + (f.tete.h ?? HAUTEUR[f.tete.type]) }]
    : [];
  const colonnes: { c: FolioColonne; places: Place[] }[] = [];
  const yDe = (noeud: string): number | null => {
    for (const { places } of colonnes) {
      for (const p of places) {
        if (p.el.a === noeud) return p.y1;
        if (p.el.b === noeud) return p.y2;
      }
    }
    return null;
  };
  for (const c of f.colonnes) {
    const depart = c.depuis ? (yDe(c.depuis) ?? Y_HAUT) : Y_HAUT;
    colonnes.push({ c, places: placer(c, depart) });
  }
  const hPied = f.pied ? (f.pied.h ?? HAUTEUR[f.pied.type]) + 26 : 0;
  const yBas = Math.max(
    ...colonnes.flatMap(({ places }) => places.map(p => p.y2)),
  ) + MARGE_BAS;

  // Un folio à trois dérivations à gauche sortait du cadre : la largeur se
  // calculait depuis la colonne la plus à droite seulement. On mesure les deux
  // bords et on décale l'ensemble pour que tout tienne, quel que soit le nombre
  // de colonnes de part et d'autre de la chaîne.
  const xs = f.colonnes.map(xDe);
  const xMin = Math.min(...xs, X0);
  const xMax = Math.max(...xs, X0);
  const decalage = Math.max(0, 150 - (xMin - 100));
  const largeur = xMax + decalage + 190;
  const railG = xMin - 90;
  const railD = xMax + 120;

  /* ---- cadres d'implantation */
  const cadre = (c: FolioCadre): string => {
    const y1 = yDe(c.de);
    const y2 = yDe(c.a);
    if (y1 == null || y2 == null) return '';
    const teinte = c.couleur === 'capot'
      ? { f: '#FDF0DC', s: '#E39A00' } : { f: '#E8F1FB', s: '#3B7DD8' };
    // Le cadre ne s'étend qu'aux colonnes qu'il englobe : englober toute la
    // largeur y enfermait le contact d'auto-maintien, qui est dans l'armoire.
    const dedans = c.colonnes ?? [f.colonnes[0].id];
    const xs = f.colonnes.filter(cc => dedans.includes(cc.id)).map(xDe);
    const x = Math.min(...xs) - 82;
    const w = Math.max(...xs) - x + 92;
    const h = y2 - y1 + 36;
    return `<rect x="${x}" y="${y1 - 18}" width="${w}" height="${h}" rx="4" `
      + `fill="${teinte.f}" stroke="${teinte.s}" stroke-width="1.2" stroke-dasharray="6 3"/>`
      + `<text class="folio-cadre" fill="${teinte.s}" text-anchor="middle" `
      + `transform="translate(${x - 9} ${y1 - 18 + h / 2}) rotate(-90)">${c.titre}</text>`;
  };

  /* ---- assemblage, du fond vers le premier plan */
  let g = (f.cadres ?? []).map(cadre).join('');

  g += `<line x1="${railG}" y1="${Y_HAUT}" x2="${railD}" y2="${Y_HAUT}" `
    + `stroke="${S.TRAIT.actif}" stroke-width="3"/>` + railTexte(railG, Y_HAUT, f.railHaut, false)
    + `<line x1="${railG}" y1="${yBas}" x2="${railD}" y2="${yBas}" `
    + `stroke="${S.TRAIT.actif}" stroke-width="3"/>` + railTexte(railG, yBas, f.railBas, true);

  // tête : arrivée du secondaire et sa protection, au-dessus du rail
  for (const p of tete) {
    g += fil(X0, 26, X0, p.y1, coupe(f.source, p.el.a))
      + symbole(p, vivante)
      + fil(X0, p.y2, X0, Y_HAUT, false)
      + `<text class="folio-borne" x="${X0 - 14}" y="30" text-anchor="end">${f.repSource}</text>`;
  }

  /** Organes portant le repère désigné : de quoi les encadrer à la fin. */
  const cadresFocus: { x: number; y: number; w: number; h: number }[] = [];

  // colonnes : fils entre organes, puis symboles
  for (const { c, places } of colonnes) {
    const x = xDe(c);
    let haut = c.depuis ? (yDe(c.depuis) ?? Y_HAUT) : Y_HAUT;
    let xHaut = c.depuis ? X0 : x;
    for (const p of places) {
      g += fil(xHaut, haut, x, p.y1, coupe(dernierNoeud(places, p), p.el.a));
      haut = p.y2;
      xHaut = x;
    }
    const fin = c.vers ? (yDe(c.vers) ?? yBas) : yBas;
    const xFin = c.vers ? X0 : x;
    g += fil(x, haut, xFin, fin, false);
    for (const p of places) {
      g += symbole(p, vivante);
      if (opts.focusRep && p.el.rep === opts.focusRep) {
        cadresFocus.push({ x: x - 34, y: p.y1 - 14, w: 68, h: p.y2 - p.y1 + 28 });
      }
    }
    // Repérage équipotentiel du conducteur qui sort de chaque organe.
    // On le pose sous la borne suivante quand il y en a une : à mi-tronçon il
    // tombait pile sur son étiquette, tous deux étant à gauche du conducteur.
    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      if (!p.el.conducteur) continue;
      // On saute TOUTES les bornes consécutives : s'arrêter à la première
      // posait le repère sur l'étiquette de la seconde.
      let j = i + 1;
      while (places[j]?.el.type === 'borne') j++;
      const derniereBorne = j > i + 1 ? places[j - 1] : null;
      const suiv = places[j];
      const y = derniereBorne
        ? derniereBorne.y1 + 16
        : ((p.y2 + (suiv ? suiv.y1 : fin)) / 2);
      g += S.equipotentielle(x, y, p.el.conducteur);
    }
  }

  // bornes de bornier : le symbole normalisé, posé sur le fil
  const points: PointFolio[] = [];
  for (const { places } of colonnes) {
    for (const p of places) {
      if (p.el.type === 'borne') {
        g += S.borne(p.x, p.y1, p.el.rep ?? p.el.a, p.x > X0 ? 'd' : 'g');
      }
      points.push({ id: p.el.a, x: p.x, y: p.y1, rep: p.el.rep ?? p.el.a });
      if (p.el.b) points.push({ id: p.el.b, x: p.x, y: p.y2, rep: p.el.b });
    }
  }
  if (f.tete) {
    if (opts.focusRep && f.tete.rep === opts.focusRep) {
      cadresFocus.push({ x: X0 - 34, y: tete[0].y1 - 14, w: 68, h: tete[0].y2 - tete[0].y1 + 28 });
    }
    points.push({ id: f.source, x: X0, y: 26, rep: f.source });
    points.push({ id: f.tete.a, x: X0, y: 48, rep: f.tete.a });
    if (f.tete.b) points.push({ id: f.tete.b, x: X0, y: tete[0].y2, rep: f.tete.b });
  }
  // pied : pôle neutre de la protection phase + neutre, sous le rail de retour.
  if (f.pied) {
    const y1 = yBas + 26;
    const y2 = y1 + (f.pied.h ?? HAUTEUR[f.pied.type]);
    g += fil(X0, yBas, X0, y1, coupe(f.retour, f.pied.a))
      + symbole({ el: f.pied, x: X0, y1, y2 }, vivante)
      + fil(X0, y2, X0, y2 + 22, false)
      + `<text class="folio-borne" x="${X0 - 14}" y="${y2 + 20}" text-anchor="end">${f.repRetour}</text>`;
    if (opts.focusRep && f.pied.rep === opts.focusRep) {
      cadresFocus.push({ x: X0 - 34, y: y1 - 14, w: 68, h: y2 - y1 + 28 });
    }
    points.push({ id: f.pied.a, x: X0, y: y1, rep: f.pied.a });
    if (f.pied.b) points.push({ id: f.pied.b, x: X0, y: y2, rep: f.pied.b });
    points.push({ id: f.retour, x: X0, y: y2 + 22, rep: f.repRetour });
  } else {
    points.push({ id: f.retour, x: railG + 40, y: yBas, rep: f.repRetour });
    g += `<text class="folio-borne" x="${railG + 26}" y="${yBas - 10}" text-anchor="end">${f.repRetour}</text>`;
  }
  g += S.terre(railD - 40, yBas + 6);

  // L'organe dont parle la question, encadré : sur un folio à trente organes,
  // nommer le repère ne suffit pas, il faut le montrer.
  for (const z of cadresFocus) {
    g += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="8" fill="#E39A00" `
      + `fill-opacity=".14" stroke="#E39A00" stroke-width="2.4"/>`;
  }

  // points de mesure : discrets, le folio porte déjà tout le repérage utile
  const vus = new Set<string>();
  for (const pt of points) {
    if (vus.has(pt.id)) continue;
    vus.add(pt.id);
    const cls = ['folio-pt'];
    if (opts.zone?.includes(pt.id)) cls.push('zone');
    if (opts.r === pt.id) cls.push('r');
    if (opts.k === pt.id) cls.push('k');
    g += `<g class="${cls.join(' ')}" data-noeud="${pt.id}" role="button" tabindex="0">`
      + `<title>${pt.rep}</title><circle cx="${pt.x}" cy="${pt.y}" r="5"/></g>`;
  }

  // Tout le dessin est décalé d'un bloc : les coordonnées internes restent
  // lisibles, et le folio tient dans son cadre quel que soit son étalement.
  return {
    svg: decalage ? `<g transform="translate(${decalage} 0)">${g}</g>` : g,
    largeur,
    hauteur: yBas + 40 + hPied,
    points: points
      .filter(p => vus.delete(p.id))
      .map(p => ({ ...p, x: p.x + decalage })),
  };
}

/** Composante connexe de chaque nœud du réseau (union-find par parcours). */
function composantes(reseau: readonly Arete[]): Map<string, number> {
  const voisins = new Map<string, string[]>();
  const ajoute = (a: string, b: string) => {
    const l = voisins.get(a) ?? [];
    l.push(b);
    voisins.set(a, l);
  };
  for (const x of reseau) { ajoute(x.a, x.b); ajoute(x.b, x.a); }
  const out = new Map<string, number>();
  let n = 0;
  for (const depart of Array.from(voisins.keys())) {
    if (out.has(depart)) continue;
    const pile = [depart];
    out.set(depart, n);
    while (pile.length) {
      const cur = pile.pop()!;
      for (const v of voisins.get(cur) ?? []) {
        if (out.has(v)) continue;
        out.set(v, n);
        pile.push(v);
      }
    }
    n++;
  }
  return out;
}

/** Nœud de sortie de l'organe précédent, pour savoir si le fil qui suit est coupé. */
function dernierNoeud(places: Place[], p: Place): string {
  const i = places.indexOf(p);
  if (i <= 0) return p.el.a;
  const prec = places[i - 1];
  return prec.el.b ?? prec.el.a;
}

/** Feuille de style du folio, à joindre à celle des symboles. */
export const STYLE_FOLIO = `
.folio-rail{font:600 10px/1 "Barlow Condensed",system-ui,sans-serif;fill:#66717F;letter-spacing:.12em;text-transform:uppercase}
.folio-cadre{font:600 10px/1 "Barlow Condensed",system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.folio-borne{font:600 9px/1 "IBM Plex Mono",ui-monospace,monospace;fill:#66717F}
.folio-pt{cursor:pointer}
.folio-pt circle{fill:#fff;fill-opacity:.85;stroke:#8E979F;stroke-width:1.3;transition:.12s}
.folio-pt:hover circle{stroke:#E39A00;stroke-width:2.4;fill-opacity:1}
.folio-pt.zone circle{stroke:#E39A00;stroke-width:2.4;fill:#FFE2A8;fill-opacity:1}
.folio-pt.r circle{fill:#D93A3A;stroke:#D93A3A;fill-opacity:1}
.folio-pt.k circle{fill:#2B2F36;stroke:#2B2F36;fill-opacity:1}
`;
