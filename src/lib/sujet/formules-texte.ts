/**
 * Transcription TEXTE d'une saisie LaTeX de l'éditeur de maths (module pur et léger, sans la
 * Compute Engine : importable côté client). « Q=P\\tan\\varphi » → « Q = P tan φ ».
 */

const GREC: Record<string, string> = {
  '\\varphi': 'φ', '\\phi': 'φ', '\\eta': 'η', '\\pi': 'π', '\\omega': 'ω', '\\Omega': 'Ω', '\\alpha': 'α', '\\beta': 'β',
  '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\rho': 'ρ', '\\Delta': 'Δ', '\\delta': 'δ', '\\sigma': 'σ', '\\tau': 'τ',
  '\\gamma': 'γ', '\\epsilon': 'ε', '\\varepsilon': 'ε', '\\Phi': 'Φ', '\\times': '×', '\\cdot': '·', '\\div': '÷',
  '\\approx': '≈', '\\pm': '±', '\\circ': '°', '\\prime': '′', '\\le': '≤', '\\ge': '≥', '\\leq': '≤', '\\geq': '≥', '\\neq': '≠',
  '\\sin': ' sin ', '\\cos': ' cos ', '\\tan': ' tan ', '\\ln': ' ln ', '\\log': ' log ', '\\exp': ' exp ', '\\%': '%',
  '\\left': '', '\\right': '', '\\,': ' ', '\\;': ' ', '\\:': ' ', '\\ ': ' ', '\\!': '', '\\quad': ' ',
};
const EXPOSANT: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };

/**
 * Transcription lisible (texte brut) d'une saisie LaTeX : « Q = P × tan φ », « I = S / (√3 U) »,
 * « 0,85 ». Pour les copies en texte (PDF, exports) ; l'affichage à l'écran passe par `Formule.tsx`.
 */
export function latexVersTexte(latex: string): string {
  try {
    let s = String(latex ?? '');
    if (!/[\\^_{}]/.test(s)) return s.trim();
    // \frac{a}{b} (imbriqués) → (a)/(b)
    for (let k = 0; k < 20 && /\\[dtc]?frac/.test(s); k++) {
      s = s.replace(/\\[dtc]?frac\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/, (_, a: string, b: string) => {
        const pa = /^[\w.\\]+$/.test(a.trim()) ? a : `(${a})`;
        const pb = /^[\w.\\]+$/.test(b.trim()) ? b : `(${b})`;
        return `${pa}/${pb}`;
      });
    }
    s = s.replace(/\\sqrt\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g, (_, a: string) => (/^\w$/.test(a.trim()) ? `√${a}` : `√(${a})`));
    s = s.replace(/\\(?:operatorname|mathrm|text|textrm|mathit|mathbf)\s*\{([^{}]*)\}/g, '$1');
    s = s.replace(/\^\{\\circ\}|\^\\circ/g, '°').replace(/\^\{\\prime\}|\^\\prime/g, '′');
    s = s.replace(/\^\{?([0-9-]+)\}?/g, (_, e: string) => e.split('').map(c => EXPOSANT[c] ?? c).join(''));
    s = s.replace(/\\[a-zA-Z]+|\\./g, x => (x in GREC ? GREC[x] : x.replace(/^\\/, '')));
    s = s.replace(/\{,\}/g, ',').replace(/_\{([^{}]*)\}/g, '_$1').replace(/[{}]/g, '');
    s = s.replace(/(sin|cos|tan|ln|log|exp) ([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/g, '$1$2 ');
    s = s.replace(/\s*([=×÷+·])\s*/g, ' $1 ').replace(/([^\s(=×÷+·−-])\s*-\s*/g, '$1 − ').replace(/-/g, '−').replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    return s.trim();
  } catch {
    return String(latex ?? '');
  }
}
