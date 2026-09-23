/**
 * Claviers virtuels de l'éditeur de maths (MathLive) : « Électrotechnique », « 123 », « αβφ »,
 * « Unités ». Données pures (aucun import de mathlive) : `EditeurMaths` les installe dans
 * `window.mathVirtualKeyboard.layouts`.
 *
 * Syntaxe d'insertion MathLive : `#@` = sélection (ou ce qui précède), `#0` = emplacement du
 * curseur, `#?` = emplacement vide à remplir. Déplacement / effacement : commandes
 * MathLive (`moveToPreviousChar`, `moveToNextChar`, `deleteBackward`), `[hide-keyboard]`.
 */

/** Touche : sous-ensemble de `VirtualKeyboardKeycap` (types de mathlive, non importés ici). */
export interface Touche {
  label?: string;
  latex?: string;
  insert?: string;
  class?: string;
  tooltip?: string;
  /** Commande MathLive (« performWithFeedback(deleteBackward) »). */
  command?: string;
  width?: 0.5 | 1.0 | 1.5 | 2.0 | 5.0;
}
export type ToucheOuCommande = Touche | string;

export interface Clavier {
  id: string;
  label: string;
  tooltip: string;
  rows: ToucheOuCommande[][];
}

/** Grandeur (touche bleutée) : affichée et insérée telle quelle. */
const g = (latex: string, tooltip?: string): Touche => ({ latex, class: 'ml-grandeur', ...(tooltip ? { tooltip } : {}) });
/** Fonction / structure (touche orangée). */
const f = (label: string, insert: string, tooltip: string): Touche => ({ label, insert, tooltip, class: 'ml-fonction' });
/** Opérateur. */
const o = (label: string, insert: string, tooltip?: string): Touche => ({ label, insert, ...(tooltip ? { tooltip } : {}) });
/** Unité (insérée en droit, précédée d'une espace fine). */
const u = (label: string, latex: string): Touche => ({ label, insert: `\\,\\mathrm{${latex}}`, tooltip: `unité ${label}`, class: 'ml-unite' });

/** Déplacements et effacement communs à tous les claviers (libellés et noms accessibles). */
const NAV: ToucheOuCommande[] = [
  { label: '←', command: 'performWithFeedback(moveToPreviousChar)', tooltip: 'curseur à gauche', class: 'action' },
  { label: '→', command: 'performWithFeedback(moveToNextChar)', tooltip: 'curseur à droite', class: 'action' },
  { label: '⌫', command: 'performWithFeedback(deleteBackward)', tooltip: 'effacer', class: 'action' },
  '[hide-keyboard]',
];

export const CLAVIER_ELEC: Clavier = {
  id: 'electrotechnique',
  label: 'Électrotechnique',
  tooltip: 'Grandeurs et fonctions de l’électrotechnique',
  rows: [
    [g('P', 'puissance active'), g('Q', 'puissance réactive'), g('S', 'puissance apparente'), g('U', 'tension'),
      g('I', 'courant'), g('R', 'résistance'), g('\\eta', 'rendement η'), g('\\varphi', 'déphasage φ'),
      { latex: "\\varphi'", insert: "\\varphi'", class: 'ml-grandeur', tooltip: 'φ′ (après compensation)' }, o('=', '=')],
    [f('cos', '\\cos\\left(#0\\right)', 'cosinus'), f('sin', '\\sin\\left(#0\\right)', 'sinus'), f('tan', '\\tan\\left(#0\\right)', 'tangente'),
      f('√', '\\sqrt{#0}', 'racine carrée'), { latex: '\\sqrt{3}', insert: '\\sqrt{3}', tooltip: 'racine de 3', class: 'ml-fonction' },
      { latex: 'x^2', insert: '#@^{2}', tooltip: 'au carré' }, { latex: '\\frac{\\square}{\\square}', insert: '\\frac{#@}{#?}', tooltip: 'fraction' },
      { latex: 'x_{\\square}', insert: '#@_{#?}', tooltip: 'indice (Q_c, U_MPPT…)' }, o('(', '('), o(')', ')')],
    [o('×', '\\times', 'multiplier'), o('÷', '\\div', 'diviser'), o('+', '+'), o('−', '-', 'moins'),
      g('\\pi'), o(',', '{,}', 'virgule décimale'), ...NAV],
  ],
};

export const CLAVIER_123: Clavier = {
  id: 'chiffres',
  label: '123',
  tooltip: 'Chiffres et opérations',
  rows: [
    ['7', '8', '9', o('×', '\\times'), o('÷', '\\div'), { latex: '\\frac{\\square}{\\square}', insert: '\\frac{#@}{#?}', tooltip: 'fraction' }, o('(', '('), o(')', ')')],
    ['4', '5', '6', o('+', '+'), o('−', '-'), { latex: 'x^2', insert: '#@^{2}', tooltip: 'au carré' }, { latex: 'x^{\\square}', insert: '#@^{#?}', tooltip: 'puissance' }, o('=', '=')],
    ['1', '2', '3', f('√', '\\sqrt{#0}', 'racine carrée'), { latex: '\\sqrt{3}', insert: '\\sqrt{3}', tooltip: 'racine de 3' },
      { latex: '\\times10^{\\square}', insert: '\\times10^{#?}', tooltip: 'puissance de 10' }, g('\\pi'), { label: '°', insert: '^{\\circ}', tooltip: 'degré' }],
    ['0', o(',', '{,}', 'virgule décimale'), ...NAV],
  ],
};

export const CLAVIER_GREC: Clavier = {
  id: 'grec',
  label: 'αβφ',
  tooltip: 'Lettres grecques',
  rows: [
    [g('\\alpha'), g('\\beta'), g('\\gamma'), g('\\delta'), g('\\Delta'), g('\\varepsilon'), g('\\eta'), g('\\theta')],
    [g('\\lambda'), g('\\mu'), g('\\rho'), g('\\sigma'), g('\\tau'), g('\\varphi'), { latex: "\\varphi'", insert: "\\varphi'", class: 'ml-grandeur' }, g('\\omega')],
    [g('\\Omega'), g('\\Phi'), g('\\pi'), ...NAV],
  ],
};

export const CLAVIER_UNITES: Clavier = {
  id: 'unites',
  label: 'Unités',
  tooltip: 'Unités (écrites en droit)',
  rows: [
    [u('W', 'W'), u('kW', 'kW'), u('var', 'var'), u('kvar', 'kvar'), u('VA', 'VA'), u('kVA', 'kVA'), u('A', 'A'), u('V', 'V')],
    [u('kV', 'kV'), u('Ω', '\\Omega'), u('Hz', 'Hz'), u('lm', 'lm'), u('lx', 'lx'), { label: '%', insert: '\\%', tooltip: 'pour cent' },
      { label: '°C', insert: '\\,{}^{\\circ}\\mathrm{C}', tooltip: 'degré Celsius' }, u('m', 'm')],
    NAV,
  ],
};

/** Claviers dans l'ordre des onglets. */
export const CLAVIERS: Clavier[] = [CLAVIER_ELEC, CLAVIER_123, CLAVIER_GREC, CLAVIER_UNITES];

/** Feuille de style du clavier (touches colorées comme la maquette). */
export const STYLE_CLAVIER = `
.ml-grandeur { background: #eef3ff !important; }
.ml-fonction { background: #fff7e6 !important; }
.ml-unite { background: #f0faf4 !important; font-size: 15px !important; }
`;
