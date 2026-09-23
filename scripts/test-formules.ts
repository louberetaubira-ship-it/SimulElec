/**
 * Tests de la correction des formules par ÉQUIVALENCE (sans runner) :
 *   npx tsx scripts/test-formules.ts
 * Couvre `src/lib/sujet/formules.ts` (analyse LaTeX, tirages cohérents, membre de gauche,
 * erreurs typiques, application numérique) et `formules-texte.ts` (transcription texte).
 */
import assert from 'node:assert/strict';
import {
  correspondA, equivalentes, formuleLisible, latexVersTexte, membres, normaliserLatex, valeurNumerique, valeursNumeriques,
} from '@/lib/sujet/formules';
import type { FormuleSpec } from '@/lib/sujet/types';

let n = 0;
const cas = (nom: string, fn: () => void) => {
  try { fn(); n += 1; } catch (e) { console.error(`✗ ${nom}`); throw e; }
};
const juste = (latex: string, spec: FormuleSpec) => cas(`juste : ${latex}`, () => assert.deepEqual(equivalentes(latex, spec), { ok: true }, latex));
const faux = (latex: string, spec: FormuleSpec, raison: 'membreGauche' | 'syntaxe' | 'different') =>
  cas(`${raison} : ${latex}`, () => assert.deepEqual(equivalentes(latex, spec), { ok: false, raison }, latex));
const proche = (a: number | null, b: number, eps = 1e-6) => assert.ok(a != null && Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

/* ───────────── puissance réactive Q = P tan φ ───────────── */
const Q: FormuleSpec = {
  attendues: ['P\\tan\\varphi', 'S\\sin\\varphi', '\\sqrt{3}UI\\sin\\varphi'],
  membreGauche: ['Q'],
  variables: { P: { min: 1000, max: 50000 }, '\\varphi': { min: 0.2, max: 1.3 }, "\\varphi'": { min: 0.05, max: 0.19 }, U: { min: 400, max: 400 } },
  derivees: { S: '\\frac{P}{\\cos\\varphi}', I: '\\frac{S}{\\sqrt{3}U}' },
  affichage: 'Q = P × tan φ',
};
juste('Q=P\\tan\\varphi', Q);
juste('Q = \\tan\\varphi\\times P', Q);
juste('Q=\\tan\\varphi P', Q);
juste('Q=S\\sin\\phi', Q);
juste('Q=\\sqrt{3}UI\\sin\\varphi', Q);
juste('Q=\\sqrt{3}\\cdot U\\cdot I\\cdot\\sin\\left(\\varphi\\right)', Q);
juste('Q=P\\cdot\\operatorname{tg}\\varphi', Q);
juste('Q = P × tan φ', Q);
juste('Q = √3 · U · I · sin(φ)', Q);
juste('P\\tan\\varphi', Q);
juste('P\\tan\\varphi=Q', Q);
juste('Q=\\frac{P\\sin\\varphi}{\\cos\\varphi}', Q);
juste('Q=\\sqrt{S^2-P^2}', Q);
juste('Q=\\sqrt{S^{2}-P^{2}}', Q);
faux('Q_{c}=P\\left(\\tan\\varphi-\\tan\\varphi^{\\prime}\\right)', Q, 'different');
faux('Q=P\\cos\\varphi', Q, 'different');
faux('Q=\\frac{P}{\\tan\\varphi}', Q, 'different');
faux("Q=P\\tan\\varphi'", Q, 'different');
faux('S=P\\tan\\varphi', Q, 'membreGauche');
faux('Q=P\\tan', Q, 'syntaxe');
faux('Q=', Q, 'syntaxe');
faux('\\frac{P}{', Q, 'syntaxe');
faux('', Q, 'syntaxe');
faux('Q=Q', Q, 'different');
faux('Q=x\\tan\\varphi', Q, 'different');

/* ───────────── erreurs typiques (formule) ───────────── */
cas('erreur typique : formule de Qc', () => {
  assert.equal(correspondA("Q_{c}=P\\left(\\tan\\varphi-\\tan\\varphi^{\\prime}\\right)", "P(\\tan\\varphi-\\tan\\varphi')", Q), true);
  assert.equal(correspondA("Q=P(\\tan\\phi-\\tan\\phi')", "P\\left(\\tan\\varphi-\\tan\\varphi'\\right)", Q), true);
  assert.equal(correspondA('Q=P\\tan\\varphi', "P(\\tan\\varphi-\\tan\\varphi')", Q), false);
});
cas('erreur typique : cos au lieu de tan, rapport inversé', () => {
  assert.equal(correspondA('Q=P\\cos\\varphi', 'P\\cos\\varphi', Q), true);
  assert.equal(correspondA('Q=\\frac{P}{\\tan\\varphi}', 'P\\cot\\varphi', Q), true);
  assert.equal(correspondA('Q=P\\tan\\varphi', 'P\\cos\\varphi', Q), false);
});
cas('erreur typique : symbole absent de la spec (tiré au hasard)', () => {
  assert.equal(correspondA('Q=P\\tan\\alpha', 'P\\tan\\alpha', Q), true);
  assert.equal(correspondA('Q=P\\tan\\varphi', 'P\\tan\\alpha', Q), false);
});
cas('erreur typique : saisie illisible → pas de correspondance, sans exception', () => {
  assert.equal(correspondA('Q=\\frac{', 'P\\cos\\varphi', Q), false);
  assert.equal(correspondA('Q=P\\cos\\varphi', '\\frac{', Q), false);
});

/* ───────────── S = √(P² + Q²) ───────────── */
const S: FormuleSpec = {
  attendues: ['\\sqrt{P^2+Q^2}'],
  membreGauche: ['S'],
  variables: { P: { min: 100, max: 10000 }, Q: { min: 100, max: 10000 } },
  affichage: 'S = √(P² + Q²)',
};
juste('S=\\sqrt{P^2+Q^2}', S);
juste('S=\\sqrt{Q^{2}+P^{2}}', S);
juste('S = √(P² + Q²)', S);
juste('S=\\left(P^2+Q^2\\right)^{\\frac{1}{2}}', S);
faux('S=P+Q', S, 'different');
faux('S=\\sqrt{P^2-Q^2}', S, 'different');

/* ───────────── I = S / (√3 U) ───────────── */
const I: FormuleSpec = {
  attendues: ['\\frac{S}{\\sqrt{3}U}'],
  membreGauche: ['I'],
  variables: { S: { min: 1000, max: 100000 }, U: { min: 380, max: 420 } },
  affichage: 'I = S / (√3 × U)',
};
juste('I=\\frac{S}{\\sqrt{3}U}', I);
juste('I=\\frac{S}{U\\sqrt3}', I);
juste('I=\\frac{S}{\\sqrt{3}\\times U}', I);
juste('I = S/(√3·U)', I);
juste('I=\\frac{\\sqrt{3}S}{3U}', I);
faux('I=\\frac{S}{U}', I, 'different');
cas('erreur typique : oubli de √3', () => assert.equal(correspondA('I=\\frac{S}{U}', '\\frac{S}{U}', I), true));

/* ───────────── k = L·l / ((L + l)(ht − hpu)) ───────────── */
const K: FormuleSpec = {
  attendues: ['\\frac{L\\cdot l}{(L+l)(h_{t}-h_{pu})}'],
  membreGauche: ['k', 'K'],
  variables: { L: { min: 5, max: 30 }, l: { min: 3, max: 20 }, 'h_{t}': { min: 3, max: 8 }, 'h_{pu}': { min: 0, max: 1 } },
  affichage: 'k = L × l / ((L + l) × (ht − hpu))',
};
juste('k=\\frac{L\\cdot l}{\\left(L+l\\right)\\left(h_{t}-h_{pu}\\right)}', K);
juste('k=\\frac{Ll}{(l+L)(h_t-h_{pu})}', K);
juste('K=\\frac{L l}{(L+l)\\times(h_{t}-h_{pu})}', K);
juste('k=\\frac{L\\times l}{L+l}\\times\\frac{1}{h_{t}-h_{pu}}', K);
faux('k=\\frac{L\\cdot l}{(L+l)\\cdot h_t}', K, 'different');
faux('k=\\frac{L+l}{L\\cdot l(h_{t}-h_{pu})}', K, 'different');

/* ───────────── f = n p / 60 ───────────── */
const F: FormuleSpec = {
  attendues: ['\\frac{np}{60}'],
  membreGauche: ['f'],
  variables: { n: { min: 500, max: 3000 }, p: { min: 1, max: 4 } },
  affichage: 'f = n × p / 60',
};
juste('f=\\frac{np}{60}', F);
juste('f=\\frac{n\\times p}{60}', F);
juste('f = n·p/60', F);
juste('f=\\frac{p}{60}n', F);
faux('f=\\frac{n}{60p}', F, 'different');
faux('f=\\frac{60}{np}', F, 'different');
faux('n=\\frac{np}{60}', F, 'membreGauche');

/* ───────────── indices et primes ───────────── */
const PV: FormuleSpec = {
  attendues: ['U_{MPPT}I_{MPPT}'],
  membreGauche: ['P_{MPPT}', 'P'],
  variables: { 'U_{MPPT}': { min: 20, max: 40 }, 'I_{MPPT}': { min: 5, max: 12 }, I: { min: 5, max: 12 } },
  affichage: 'P = U_MPPT × I_MPPT',
};
juste('P_{MPPT}=U_{\\mathrm{MPPT}}\\times I_{\\mathrm{MPPT}}', PV);
juste('P=I_{MPPT}\\cdot U_{MPPT}', PV);
juste('P_{\\mathrm{MPPT}}=U_{MPPT}I_{MPPT}', PV);
faux('P=U_{MPPT}I', PV, 'different');
faux('U=U_{MPPT}I_{MPPT}', PV, 'membreGauche');

const QC: FormuleSpec = {
  attendues: ["P(\\tan\\varphi-\\tan\\varphi')"],
  membreGauche: ['Q_{c}'],
  variables: { P: { min: 1000, max: 50000 }, '\\varphi': { min: 0.5, max: 1.2 }, "\\varphi'": { min: 0.05, max: 0.4 } },
  affichage: 'Qc = P × (tan φ − tan φ′)',
};
juste("Q_{c}=P\\left(\\tan\\varphi-\\tan\\varphi^{\\prime}\\right)", QC);
juste("Q_c=P\\tan\\varphi-P\\tan\\varphi'", QC);
juste("Qc=P(\\tan\\phi-\\tan\\phi')", QC);
juste("Q_{\\mathrm{c}}=P\\cdot(\\tan(\\varphi)-\\tan(\\varphi'))", QC);
faux("Q=P\\left(\\tan\\varphi-\\tan\\varphi'\\right)", QC, 'membreGauche');
faux("Q_{c}=P\\left(\\tan\\varphi'-\\tan\\varphi\\right)", QC, 'different');

/* ───────────── plusieurs membres, dérivées dans l'ordre ───────────── */
const PR: FormuleSpec = {
  attendues: ['\\frac{P_{u}}{\\eta}'],
  membreGauche: ['P_{a}'],
  variables: { 'P_{u}': { min: 1000, max: 20000 }, '\\eta': { min: 0.7, max: 0.95 } },
  derivees: { 'P_{a}': '\\frac{P_{u}}{\\eta}', 'P_{p}': 'P_{a}-P_{u}' },
  affichage: 'Pa = Pu / η',
};
juste('P_{a}=\\frac{P_{u}}{\\eta}', PR);
juste('P_{a}=P_{u}+P_{p}', PR);
juste('P_{a}=\\frac{P_u}{η}=P_u+P_p', PR);
faux('P_{a}=P_{u}\\eta', PR, 'different');
faux('P_{a}=P_{a}', PR, 'different');

/* ───────────── symboles D_x / d_x indicés, e variable ordinaire ───────────── */
const DV: FormuleSpec = {
  attendues: ['\\frac{D_{v}\\times 2}{d_{x}}'],
  membreGauche: ['D_{max}'],
  variables: { 'D_{v}': { min: 1, max: 50 }, 'd_{x}': { min: 0.5, max: 5 } },
  affichage: 'Dmax = 2 Dv / dx',
};
juste('D_{max}=\\frac{D_v\\times2}{d_x}', DV);
juste('D_{max}=2D_{v}\\div(d_{x})', DV);
juste('D_{max}=D_v\\cdot 2\\div d_{x}', DV);
juste('D_{\\mathrm{max}}=\\frac{2\\,\\mathrm{D_{v}}}{\\mathrm{d_{x}}}', DV);
faux('D_{max}=D_v\\times2\\times d_x', DV, 'different');
faux('D_{v}=\\frac{D_v\\times2}{d_x}', DV, 'membreGauche');
const FE: FormuleSpec = {
  attendues: ['F\\cdot e'],
  membreGauche: ['W'],
  variables: { F: { min: 10, max: 100 }, e: { min: 0.001, max: 0.02 } },
  affichage: 'W = F × e',
};
juste('W=Fe', FE);
juste('W=e\\times F', FE);
faux('W=F\\times\\exponentialE', FE, 'different');
faux('W=F', FE, 'different');
const EX: FormuleSpec = {
  attendues: ['U_{0}e^{-\\frac{t}{\\tau}}'],
  membreGauche: ['u'],
  variables: { 'U_{0}': { min: 10, max: 400 }, t: { min: 0, max: 5 }, '\\tau': { min: 0.5, max: 3 } },
  affichage: 'u = U0 e^(−t/τ)',
};
juste('u=U_0e^{-t/\\tau}', EX);
juste('u=\\frac{U_{0}}{e^{\\frac{t}{\\tau}}}', EX);
juste('u=U_{0}\\exp\\left(-\\frac{t}{\\tau}\\right)', EX);
faux('u=U_{0}e\\times(-\\frac{t}{\\tau})', EX, 'different');
cas('e : variable ordinaire hors e^{…}, D_x lisible', () => {
  assert.equal(valeurNumerique('e'), null);
  assert.equal(valeurNumerique('2e'), null);
  proche(valeurNumerique('e^{2}'), Math.exp(2));
  proche(valeurNumerique('\\exponentialE'), Math.E);
  assert.equal(formuleLisible('D_v\\times2'), true);
  assert.equal(formuleLisible('D_{v}\\div(3)'), true);
  assert.equal(formuleLisible('d_{x}\\cdot 2'), true);
  assert.equal(normaliserLatex('D_v\\times2'), '\\mathrm{D_v}\\times 2');
});

/* ───────────── application numérique ───────────── */
cas('valeurNumerique', () => {
  proche(valeurNumerique('410\\times63\\times0{,}85\\times\\sqrt{3}'), 410 * 63 * 0.85 * Math.sqrt(3));
  assert.equal(valeurNumerique('1\\,000\\cdot 2'), 2000);
  assert.equal(valeurNumerique('\\frac{3}{4}'), 0.75);
  assert.equal(valeurNumerique('2,5'), 2.5);
  assert.equal(valeurNumerique('P\\times 2'), null);
  assert.equal(valeurNumerique('\\frac{'), null);
  assert.equal(valeurNumerique(''), null);
  proche(valeurNumerique('\\cos(60^{\\circ})'), 0.5);
  proche(valeurNumerique('Q=12000\\times\\tan(30^{\\circ})=6928'), 12000 * Math.tan(Math.PI / 6));
  proche(valeurNumerique('Q = 410 × 63 × 0,85 × √3'), 410 * 63 * 0.85 * Math.sqrt(3));
  proche(valeurNumerique('\\frac{52\\,000}{\\sqrt{3}\\times400}'), 52000 / (Math.sqrt(3) * 400));
  proche(valeurNumerique('2\\times10^{3}'), 2000);
  proche(valeurNumerique('12\\,\\mathrm{kW}\\times0{,}5'), 6);
  proche(valeurNumerique('P=\\frac{230\\,\\mathrm{V}\\times10\\,\\mathrm{A}}{2}=1150\\,\\mathrm{W}'), 1150);
  proche(valeurNumerique('20\\,{}^{\\circ}\\mathrm{C}+5'), 25);
  proche(valeurNumerique('\\tan 36{,}87', 'deg'), Math.tan(36.87 * Math.PI / 180));
  assert.ok(valeursNumeriques('\\tan 36{,}87').some(v => Math.abs(v - 0.75) < 1e-4));
  assert.equal(valeursNumeriques('\\sqrt{3}').length, 1);
});

/* ───────────── normalisation, lisibilité, texte ───────────── */
cas('normaliserLatex / membres', () => {
  assert.equal(normaliserLatex('\\tan\\varphi\\times P'), '\\tan(\\varphi)\\times P');
  assert.equal(normaliserLatex('\\cos\\phi'), '\\cos(\\varphi)');
  assert.equal(normaliserLatex('0{,}85'), '0.85');
  assert.equal(normaliserLatex('\\operatorname{tg}\\varphi'), '\\tan(\\varphi)');
  assert.deepEqual(membres('Q=P\\tan\\varphi'), ['Q', 'P\\tan(\\varphi)']);
  assert.deepEqual(membres('\\frac{a=b}{c}').length, 1);
  assert.equal(formuleLisible('Q=P\\tan\\varphi'), true);
  assert.equal(formuleLisible('Q=P\\tan'), false);
});
cas('latexVersTexte', () => {
  assert.equal(latexVersTexte('Q=P\\tan\\varphi'), 'Q = P tan φ');
  assert.equal(latexVersTexte('I=\\frac{S}{\\sqrt{3}U}'), 'I = S/(√3U)');
  assert.equal(latexVersTexte('0{,}85'), '0,85');
  assert.equal(latexVersTexte("Q_{c}=P\\left(\\tan\\varphi-\\tan\\varphi^{\\prime}\\right)"), 'Q_c = P(tan φ − tan φ′)');
  assert.equal(latexVersTexte('texte simple'), 'texte simple');
});

/* ───────────── robustesse : jamais d'exception, verdict stable ───────────── */
cas('robustesse', () => {
  const bizarres = ['\\', '{{{', '}}}', '\\frac{}{}', '=', '==', 'Q==P', '\\sqrt', '^^', '_', '\\left(', '\\right)', '()', '1/0', '\\placeholder{}',
    'x'.repeat(500), '\\undefinedcommand{P}', '\\text{bonjour}', 'P(', '\\cos\\cos', '\\log_{}', '\u0000', 'NaN', 'Infinity'];
  for (const b of bizarres) {
    const r = equivalentes(b, Q);
    assert.equal(r.ok, false, b);
    assert.equal(typeof correspondA(b, 'P\\cos\\varphi', Q), 'boolean');
    const v = valeurNumerique(b);
    assert.ok(v === null || Number.isFinite(v), b);
    assert.equal(typeof latexVersTexte(b), 'string');
  }
  // spec abîmée : ni exception, ni « juste »
  const casse = { attendues: ['\\frac{'], variables: { P: { min: NaN, max: 3 } }, derivees: { S: '\\sqrt{' }, affichage: '' } as FormuleSpec;
  assert.deepEqual(equivalentes('P', casse), { ok: false, raison: 'different' });
  // même verdict à chaque appel (tirages déterministes)
  for (let i = 0; i < 3; i++) assert.deepEqual(equivalentes('Q=S\\sin\\varphi', Q), { ok: true });
});

cas('performance', () => {
  const t0 = Date.now();
  for (let i = 0; i < 200; i++) equivalentes(`Q=P\\tan\\varphi+${i}-${i}`, Q);
  const ms = (Date.now() - t0) / 200;
  assert.ok(ms < 20, `${ms} ms par formule`);
});

console.log(`✓ ${n} cas de formules (équivalence, erreurs typiques, application numérique) : tout est juste.`);
