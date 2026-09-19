/**
 * Schéma de la partie PUISSANCE, dessiné à partir de ce que le TP déclare.
 *
 * Le folio de commande existait déjà ; la puissance, non — l'élève ne la voyait
 * que sur la photo de la platine. Or le premier geste de la préparation est de
 * RECONNAÎTRE un organe sur un schéma : demander « quel appareil porte le repère
 * Q1 ? » sans le schéma sous les yeux, c'est demander de deviner.
 *
 * Comme le folio, ce schéma ne porte aucune coordonnée : le TP déclare l'ORDRE
 * des organes du réseau vers le récepteur, et le tracé s'en déduit. Les symboles
 * viennent tous de `symboles.ts` — l'élève doit retrouver le même tracé partout.
 */
import type { PuissanceDef, PuissanceOrgane } from '../types';
import * as S from './symboles';

/** Entraxe entre deux phases. */
const PAS = 46;
/** Hauteur réservée à un organe. */
const H_ORGANE = 96;
/** Supplément de hauteur pour la bande d'un inverseur (croisement + retours). */
const H_INVERSEUR = 58;
/** x de la première phase. */
const X0 = 78;
/** y du rail des phases. */
const Y_RAIL = 44;

export interface RenduPuissance {
  svg: string;
  largeur: number;
  hauteur: number;
  /** Boîte de chaque organe, par repère : de quoi l'entourer quand on le désigne. */
  zones: { rep: string; x: number; y: number; w: number; h: number }[];
}

export interface OptionsPuissance {
  /** Repère à mettre en évidence (question de préparation en cours). */
  focus?: string | null;
}

/** Nombre de colonnes occupées par un organe : deux pour un inverseur. */
const largeurOrgane = (o: PuissanceOrgane, nPhases: number): number =>
  o.paire ? nPhases * 2 + 3 : nPhases;

export function rendrePuissance(
  def: PuissanceDef | undefined,
  opts: OptionsPuissance = {},
): RenduPuissance | null {
  if (!def) return null;
  const phases = def.phases;
  const n = phases.length;
  const xs = phases.map((_, i) => X0 + i * PAS);
  /** Colonnes du second appareil d'un inverseur, décalées à droite. */
  const xsPaire = phases.map((_, i) => X0 + (n + 3 + i) * PAS);

  const largeurMax = Math.max(...def.organes.map(o => largeurOrgane(o, n)));
  /**
   * La marge de droite doit contenir la LÉGENDE la plus longue, pas une constante.
   *
   * Les 210 px d'origine suffisaient tant que tous les schémas étaient triphasés :
   * trois colonnes poussent déjà le texte loin. Sur un départ monophasé — un
   * tableau tertiaire — le texte commençait à 100 px et se faisait couper net.
   * On estime la largeur du texte à 5,6 px par caractère (classe `sym-leg`, 11 px).
   */
  const legendeMax = Math.max(0, ...def.organes.flatMap(o => [
    (o.legende ?? '').length, (o.paire?.legende ?? '').length,
  ]));
  const largeur = X0 + largeurMax * PAS + Math.max(210, Math.round(legendeMax * 5.6) + 90);
  const hBas = def.moteur ? 150 : 40;
  const nInv = def.organes.filter(o => o.paire).length;
  const hauteur = Y_RAIL + def.organes.length * H_ORGANE + nInv * H_INVERSEUR + hBas;

  let g = '';
  const zones: RenduPuissance['zones'] = [];

  // ---- rails des phases, en tête
  const xFin = X0 + (largeurMax - 1) * PAS + 40;
  g += `<line x1="${X0 - 34}" y1="${Y_RAIL - 26}" x2="${xFin}" y2="${Y_RAIL - 26}" `
    + `stroke="${S.TRAIT.actif}" stroke-width="3"/>`;
  phases.forEach((p, i) => {
    g += `<text class="sym-rep" x="${xs[i]}" y="${Y_RAIL - 34}" text-anchor="middle">${p}</text>`
      + `<line x1="${xs[i]}" y1="${Y_RAIL - 26}" x2="${xs[i]}" y2="${Y_RAIL}" `
      + `stroke="${S.TRAIT.actif}" stroke-width="2.4"/>`;
  });
  g += `<text class="sym-leg" x="${xFin + 8}" y="${Y_RAIL - 22}">${def.reseau ?? 'réseau'}</text>`;

  // ---- organes, du réseau vers le récepteur
  let y = Y_RAIL;
  for (const o of def.organes) {
    // Le croisement des phases d'un inverseur demande de la place : trois
    // chemins qui se croisent sur 18 px se confondent en un seul trait.
    const y1 = y + (o.paire ? 52 : 18);
    const y2 = y + H_ORGANE - 18 + (o.paire ? H_INVERSEUR - 34 : 0);
    g += dessineOrgane(o, xs, y1, y2, false);
    zones.push({ rep: o.rep, x: X0 - 26, y: y1 - 16, w: (n - 1) * PAS + 52, h: y2 - y1 + 32 });
    if (o.paire) {
      // Second appareil d'un inverseur : mêmes phases, deux d'entre elles croisées.
      g += dessineOrgane({ ...o.paire, type: o.type }, xsPaire, y1, y2, true);
      zones.push({
        rep: o.paire.rep, x: xsPaire[0] - 26, y: y1 - 16,
        w: (n - 1) * PAS + 52, h: y2 - y1 + 32,
      });
      // amenée croisée : la première et la dernière phase sont permutées, et
      // c'est CE croisement qui fait l'inversion du sens de rotation.
      // Deux phases permutées : c'est CE croisement qui inverse le sens de
      // rotation. Chaque chemin prend sa propre hauteur, sinon les trois se
      // confondent en un seul trait oblique.
      const croise: [number, number][] = [[0, n - 1], [1, 1], [n - 1, 0]].slice(0, n) as [number, number][];
      croise.forEach(([src, dst], k) => {
        const yk = y + 14 + k * 11;
        g += `<path d="M${xs[src]} ${y} L${xs[src]} ${yk} L${xsPaire[dst]} ${yk} L${xsPaire[dst]} ${y1}" `
          + `fill="none" stroke="${S.TRAIT.actif}" stroke-width="2.4" stroke-linejoin="round"/>`
          + S.noeud(xs[src], yk);
      });
      // retour des départs vers le tronc commun, étagé de la même façon
      for (let i = 0; i < n; i++) {
        const yk = y2 + 10 + i * 9;
        g += `<path d="M${xsPaire[i]} ${y2} L${xsPaire[i]} ${yk} L${xs[i]} ${yk} L${xs[i]} ${y + H_ORGANE}" `
          + `fill="none" stroke="${S.TRAIT.actif}" stroke-width="2.4" stroke-linejoin="round"/>`
          + S.noeud(xs[i], yk);
      }
    } else {
      for (let i = 0; i < n; i++) {
        g += `<line x1="${xs[i]}" y1="${y}" x2="${xs[i]}" y2="${y1}" stroke="${S.TRAIT.actif}" stroke-width="2.4"/>`;
      }
    }
    if (!o.paire) {
      for (let i = 0; i < n; i++) {
        g += `<line x1="${xs[i]}" y1="${y2}" x2="${xs[i]}" y2="${y + H_ORGANE}" stroke="${S.TRAIT.actif}" stroke-width="2.4"/>`;
      }
    }
    y += H_ORGANE + (o.paire ? H_INVERSEUR : 0);
  }

  // ---- récepteur
  if (def.moteur) {
    const cx = X0 + ((n - 1) * PAS) / 2;
    const cy = y + 58;
    for (let i = 0; i < n; i++) {
      g += `<path d="M${xs[i]} ${y} L${xs[i]} ${y + 20} L${cx} ${cy - 22}" `
        + `fill="none" stroke="${S.TRAIT.actif}" stroke-width="2.4" stroke-linejoin="round"/>`;
    }
    g += S.moteur(cx, cy, { rep: def.moteur.rep });
    if (def.moteur.legende) {
      g += `<text class="sym-leg" x="${cx + 34}" y="${cy + 4}">${def.moteur.legende}</text>`;
    }
    g += S.terre(cx, cy + 34);
    zones.push({ rep: def.moteur.rep, x: cx - 42, y: cy - 42, w: 84, h: 100 });
  }

  // ---- mise en évidence de l'organe désigné par la question
  if (opts.focus) {
    for (const z of zones.filter(x => x.rep === opts.focus)) {
      g += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="8" fill="#E39A00" `
        + `fill-opacity=".12" stroke="#E39A00" stroke-width="2.4"/>`;
    }
  }

  return { svg: g, largeur, hauteur, zones };
}

/** Un organe sur les trois phases, selon sa nature. */
function dessineOrgane(
  o: Pick<PuissanceOrgane, 'type' | 'rep' | 'legende' | 'bornes'>,
  xs: readonly number[],
  y1: number,
  y2: number,
  decale: boolean,
): string {
  const ym = (y1 + y2) / 2;
  const xRep = xs[xs.length - 1] + 26;
  // `contactsPuissance` écrit son repère 40 px à droite du dernier pôle : la
  // légende doit s'aligner dessous, sinon les deux textes partent en escalier.
  const xLeg = o.type === 'contacteur' ? xs[xs.length - 1] + 40 : xRep;
  const leg = o.legende
    ? `<text class="sym-leg" x="${xLeg}" y="${ym + 19}">${o.legende}</text>`
    : '';
  switch (o.type) {
    case 'sectionneur':
      return xs.map((x, i) => S.sectionneurFusible({ x, y1, y2 }, false, { rep: '' })
        + bornesPhase(x, y1, y2, o.bornes?.[i])).join('')
        + `<text class="sym-rep" x="${xRep}" y="${ym + 5}">${o.rep}</text>` + leg
        + S.lienMecanique(xs[0], xs[xs.length - 1], ym + 6, S.TRAIT.repos);
    case 'contacteur':
      return S.contactsPuissance(xs, y1, y2, false, { rep: o.rep, bornes: o.bornes }) + leg;
    case 'thermique':
      return xs.map((x, i) => S.bilamePuissance({ x, y1, y2 }, {})
        + bornesPhase(x, y1, y2, o.bornes?.[i])).join('')
        + `<text class="sym-rep" x="${xRep}" y="${ym + 5}">${o.rep}</text>` + leg
        + S.lienMecanique(xs[0], xs[xs.length - 1], ym, S.TRAIT.repos);
    case 'bornier':
      return xs.map((x, i) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" `
        + `stroke="${S.TRAIT.actif}" stroke-width="2.4"/>`
        + S.borne(x, ym, o.bornes?.[i]?.[0] ?? '', decale ? 'd' : 'g')).join('')
        + `<text class="sym-rep" x="${xRep}" y="${ym + 5}">${o.rep}</text>` + leg;
    default:
      return xs.map((x) => S.disjoncteur({ x, y1, y2 }, false, { rep: '' })).join('')
        + `<text class="sym-rep" x="${xRep}" y="${ym + 5}">${o.rep}</text>` + leg;
  }
}

/** Numéros des deux bornes d'une phase, lus le long du conducteur. */
function bornesPhase(x: number, y1: number, y2: number, b: [string, string] | undefined): string {
  if (!b) return '';
  const t = (y: number, s: string) =>
    `<text class="sym-brn" transform="translate(${x + 10} ${y}) rotate(-90)" text-anchor="middle">${s}</text>`;
  return t(y1 + 12, b[0]) + t(y2 - 12, b[1]);
}
