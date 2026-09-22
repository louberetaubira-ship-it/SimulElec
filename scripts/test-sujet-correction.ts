/**
 * Tests unitaires du moteur de correction des sujets numériques (sans runner) :
 *   npx tsx scripts/test-sujet-correction.ts
 * Couvre `src/lib/sujet/normalize.ts`, `correction.ts` et `bilan.ts`.
 */
import assert from 'node:assert/strict';
import { normTexte, parseNombre, nombreJuste, texteAccepte, contientMotCle, estVide } from '@/lib/sujet/normalize';
import { corriger, corrigerCopie, estRepondue, etatTraits, scorePlatine, cleLiaison, correctionProf } from '@/lib/sujet/correction';
import { calculerBilan, evaluationSujet, scoreStocke } from '@/lib/sujet/bilan';
import { evaluer, afficherResultat } from '@/lib/sujet/calculatrice';
import type {
  QBulles, QCalcul, QCavaliers, QCocher, QOrdonner, QRedige, QRelier, QSchema, QTableau, QValeur,
  SujetAttemptState, SujetNumerique,
} from '@/lib/sujet/types';

let n = 0;
const test = (nom: string, fn: () => void) => {
  try { fn(); n += 1; } catch (e) { console.error(`✗ ${nom}`); throw e; }
};
const proche = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

/* ───────────── normalize ───────────── */
test('normTexte', () => {
  assert.equal(normTexte('  E46 ADCN '), 'e46adcn');
  assert.equal(normTexte('Émission de courant'), 'emissiondecourant');
  assert.equal(normTexte('2,5 mm²'), '2.5mm2');
  assert.equal(normTexte('L4669 2×0,35'), 'l46692x0.35');
  assert.equal(normTexte('F411/1NC'), 'f411/1nc');
  assert.equal(normTexte('—'), '-');
  assert.equal(normTexte('l’employeur'), "l'employeur");
  assert.equal(normTexte(null), '');
});
test('parseNombre', () => {
  assert.equal(parseNombre('1 234,5'), 1234.5);
  assert.equal(parseNombre('0,754'), 0.754);
  assert.equal(parseNombre('425 lux'), 425);
  assert.equal(parseNombre('49 116 lm'), 49116);
  assert.equal(parseNombre('1.234,5'), 1234.5);
  assert.equal(parseNombre('1,234.5'), 1234.5);
  assert.equal(parseNombre('k = 0.754'), 0.754);
  assert.equal(parseNombre('−3,5'), -3.5);
  assert.equal(parseNombre('1,2e3'), 1200);
  assert.equal(parseNombre('0,01127 €/h'), 0.01127);
  assert.equal(parseNombre('1 000'), 1000);
  assert.equal(parseNombre('abc'), null);
  assert.equal(parseNombre(''), null);
  assert.equal(parseNombre(12), 12);
});
test('nombreJuste / texteAccepte / motsClés', () => {
  assert.ok(nombreJuste('0,75', 0.754, 0.01));
  assert.ok(!nombreJuste('0,74', 0.754, 0.01));
  assert.ok(nombreJuste('425', 425));
  assert.ok(nombreJuste('429', 425)); // ±1 % par défaut
  assert.ok(!nombreJuste('430', 425));
  assert.ok(nombreJuste('563,28', 563.28, 0.01));
  assert.ok(texteAccepte('e46 adcn', ['E46ADCN']));
  assert.ok(!texteAccepte('', ['E46ADCN']));
  assert.ok(contientMotCle('Il faut une émission de courant', 'emission de courant'));
  assert.ok(estVide('   '));
});

/* ───────────── outils ───────────── */
const base = { partie: 1, enonce: '', competence: 'C1', points: 1, dtr: [2], pageSujet: 3 };

test('cocher simple et multiple', () => {
  const q: QCocher = { ...base, num: 1, type: 'cocher', options: ['a', 'b', 'c', 'd'], bonnes: [0] };
  assert.equal(corriger(q, { type: 'cocher', choix: [0] }).score, 1);
  assert.equal(corriger(q, { type: 'cocher', choix: [1] }).score, 0);
  assert.equal(corriger(q, { type: 'cocher', choix: [0, 1] }).score, 0);
  assert.equal(corriger(q, { type: 'cocher', choix: [] }).statut, 'sansReponse');
  assert.equal(corriger(q, undefined).statut, 'sansReponse');
  const m: QCocher = { ...q, num: 4, multiple: true, options: ['B0', 'B2V', 'BC', 'BR', 'BS'], bonnes: [1, 2, 3] };
  assert.equal(corriger(m, { type: 'cocher', choix: [1, 2, 3] }).score, 1);
  proche(corriger(m, { type: 'cocher', choix: [1, 2] }).score, 0.6667, 1e-4);
  proche(corriger(m, { type: 'cocher', choix: [1, 2, 0] }).score, 0.3333, 1e-4);
  assert.equal(corriger(m, { type: 'cocher', choix: [0, 4] }).score, 0);
});
test('relier / ordonner', () => {
  const r: QRelier = { ...base, num: 3, type: 'relier', gauche: ['a', 'b', 'c', 'd'], droite: ['1', '2', '3', '4'], liens: [2, 0, 3, 1] };
  assert.equal(corriger(r, { type: 'relier', liens: [2, 0, 3, 1] }).score, 1);
  assert.equal(corriger(r, { type: 'relier', liens: [2, 0, null, null] }).score, 0.5);
  assert.equal(corriger(r, { type: 'relier', liens: [null, null, null, null] }).statut, 'sansReponse');
  const o: QOrdonner = { ...base, num: 6, type: 'ordonner', items: ['a', 'b', 'c', 'd'], rangs: [4, 2, 3, 1] };
  assert.equal(corriger(o, { type: 'ordonner', rangs: [4, 2, 3, 1] }).score, 1);
  assert.equal(corriger(o, { type: 'ordonner', rangs: [1, 2, 3, 4] }).score, 0.5);
});
test('valeur / tableau', () => {
  const v: QValeur = {
    ...base, num: 60, type: 'valeur', champs: [
      { id: 'u', label: 'Tension', unite: 'V', attendu: 27, tolerance: 0.5 },
      { id: 'ref', label: 'Réf.', acceptes: ['E46ADCN', 'E46 ADCN'] },
      { id: 'libre', label: 'non noté' },
    ],
  };
  assert.equal(corriger(v, { type: 'valeur', valeurs: { u: '27 V DC', ref: 'e46 adcn' } }).score, 1);
  assert.equal(corriger(v, { type: 'valeur', valeurs: { u: '24', ref: 'E46ADCN' } }).score, 0.5);
  assert.equal(corriger(v, { type: 'valeur', valeurs: { u: ' ' } }).statut, 'sansReponse');
  const t: QTableau = {
    ...base, num: 24, type: 'tableau', colonnes: ['Désignation', 'PU', 'Qté', 'Total'], lignes: [
      { cellules: ['Dalle', { id: 'pu', attendu: 46.94, tolerance: 0.01 }, { id: 'q', attendu: 12, tolerance: 0 }, { id: 'ht', attendu: 563.28, tolerance: 0.01 }] },
      { cellules: ['Oui/non', { id: 'on', choix: ['oui', 'non'], acceptes: ['oui'] }, '', ''] },
    ],
  };
  assert.equal(corriger(t, { type: 'tableau', cellules: { pu: '46,94', q: '12', ht: '563,28', on: 'oui' } }).score, 1);
  assert.equal(corriger(t, { type: 'tableau', cellules: { pu: '46,94', q: '11', ht: '563,28', on: 'non' } }).score, 0.5);
});
test('calcul formule / résultat', () => {
  const c: QCalcul = {
    ...base, num: 16, type: 'calcul', grandeur: 'k', formule: 'k = (L × l) / ((L + l) × (ht − hpu))',
    formuleMotsCles: ['L', 'l', 'ht', 'hpu'], attendu: 0.754, tolerance: 0.01,
  };
  assert.equal(corriger(c, { type: 'calcul', formule: '', application: '', resultat: '0,754' }).score, 1);
  assert.equal(corriger(c, { type: 'calcul', formule: 'k = L*l/((L+l)*(ht-hpu))', application: '', resultat: '0,9' }).score, 0.5);
  assert.equal(corriger(c, { type: 'calcul', formule: 'k = L/l', application: '', resultat: '0,9' }).score, 0);
  assert.equal(corriger(c, { type: 'calcul', formule: '', application: '', resultat: '' }).statut, 'sansReponse');
});
test('rédigé : pré-note par mots-clés, à valider', () => {
  const r: QRedige = { ...base, num: 62, type: 'redige', motsCles: ['émission', 'courant'], minMotsCles: 2, corrige: 'À émission de courant' };
  const a = corriger(r, { type: 'redige', texte: 'Gâche à émission de courant' });
  assert.equal(a.score, 1); assert.equal(a.statut, 'aValider');
  assert.equal(corriger(r, { type: 'redige', texte: 'à émission' }).score, 0.5);
  assert.equal(corriger(r, { type: 'redige', texte: 'je ne sais pas' }).score, 0);
  assert.equal(corriger(r, { type: 'redige', texte: '' }).statut, 'sansReponse');
});
test('bulles / cavaliers', () => {
  const b: QBulles = {
    ...base, num: 39, type: 'bulles', plan: { src: '', alt: '' },
    bulles: [{ id: 'b1', x: 10, y: 10, attendu: '1' }, { id: 'b2', x: 20, y: 20, attendu: '3' }], choix: ['1', '2', '3'],
  };
  assert.equal(corriger(b, { type: 'bulles', valeurs: { b1: '1', b2: '3' } }).score, 1);
  assert.equal(corriger(b, { type: 'bulles', valeurs: { b1: '1', b2: '2' } }).score, 0.5);
  const k: QCavaliers = {
    ...base, num: 57, type: 'cavaliers', composants: [
      { id: 'S3', label: 'S3', positions: [{ id: 'A', label: 'A', attendu: '3' }, { id: 'PL', label: 'PL', attendu: '1' }] },
      { id: 'S1', label: 'S1', positions: [{ id: 'M', label: 'M', attendu: 'GEN' }, { id: 'X', label: 'X', attendu: '—' }] },
    ],
  };
  assert.equal(corriger(k, { type: 'cavaliers', valeurs: { 'S3.A': '3', 'S3.PL': '1', 'S1.M': 'gen' } }).score, 1);
  assert.equal(corriger(k, { type: 'cavaliers', valeurs: { 'S3.A': '3', 'S3.PL': '2', 'S1.M': 'GEN', 'S1.X': '-' } }).score, 0.75);
});
test('schéma : traits + câblage réel', () => {
  const s: QSchema = {
    ...base, num: 13, points: 4, type: 'schema', platineTpId: 'x', corrigeImage: { src: '', alt: '' },
    traits: {
      image: { src: '', alt: '', w: 100, h: 100 },
      bornes: [{ id: 'N', x: 0, y: 0, label: 'N' }, { id: 'L', x: 0, y: 0, label: 'L' }, { id: 'a', x: 0, y: 0, label: 'a' }, { id: 'b', x: 0, y: 0, label: 'b' }],
      couleurs: [{ id: 'bleu', label: 'bleu', css: '#00f' }, { id: 'marron', label: 'marron', css: '#840' }],
      attendues: [{ a: 'N', b: 'a', couleur: 'bleu' }, { a: 'L', b: 'b', couleur: 'marron' }, { a: 'a', b: 'b' }, { a: 'N', b: 'b' }],
    },
  };
  // 4 justes (dont une orientée à l'envers) → traits = 1 ; platine nulle → 0,5
  const ok = corriger(s, { type: 'schema', traits: [
    { a: 'a', b: 'N', couleur: 'bleu' }, { a: 'L', b: 'b', couleur: 'marron' }, { a: 'a', b: 'b', couleur: 'bleu' }, { a: 'N', b: 'b', couleur: 'marron' },
  ], platine: null });
  assert.equal(ok.score, 0.5);
  // mauvaise couleur sur une liaison → ½ ; une fausse en plus → −1 : (3 + 0,5 − 1) / 4 = 0,625 → ×½
  const e = etatTraits(s, [
    { a: 'N', b: 'a', couleur: 'marron' }, { a: 'L', b: 'b', couleur: 'marron' }, { a: 'a', b: 'b', couleur: 'bleu' },
    { a: 'N', b: 'b', couleur: 'bleu' }, { a: 'N', b: 'L', couleur: 'bleu' },
  ]);
  proche(e.score, 0.625);
  assert.ok(e.mauvaiseCouleur.has(cleLiaison('a', 'N')));
  assert.ok(e.fausses.has(cleLiaison('L', 'N')));
  // traits : min 0
  assert.equal(etatTraits(s, [{ a: 'N', b: 'L', couleur: 'bleu' }]).score, 0);
  // platine
  assert.equal(scorePlatine(null), 0);
  assert.equal(scorePlatine({ conformes: 14, total: 14, sousTension: true, essai: true }), 1);
  assert.equal(scorePlatine({ conformes: 7, total: 14, sousTension: true, essai: false }), 0.5);
  const tout = corriger(s, { type: 'schema', traits: [], platine: { conformes: 14, total: 14, sousTension: true, essai: true } });
  assert.equal(tout.score, 0.5);
  assert.equal(corriger(s, { type: 'schema', traits: [], platine: null }).statut, 'sansReponse');
  assert.ok(estRepondue(s, { type: 'schema', traits: [], platine: { conformes: 0, total: 1, sousTension: false, essai: false } }));
});

test('schéma : correction par réseau', () => {
  const b = (id: string) => ({ id, x: 0, y: 0, label: id });
  const s: QSchema = {
    ...base, num: 58, points: 4, type: 'schema', platineTpId: 'x', corrigeImage: { src: '', alt: '' },
    traits: {
      image: { src: '', alt: '', w: 100, h: 100 },
      bornes: ['N', 'Q6N', 'Q7N', 'L', 'Q6P', 'Q7P', 'X'].map(b),
      couleurs: [{ id: 'bleu', label: 'bleu', css: '#00f' }, { id: 'marron', label: 'marron', css: '#840' }],
      // le corrigé dessine un peigne N → Q6N → Q7N et L → Q6P → Q7P
      attendues: [{ a: 'N', b: 'Q6N' }, { a: 'Q6N', b: 'Q7N' }, { a: 'L', b: 'Q6P' }, { a: 'Q6P', b: 'Q7P' }],
      reseaux: [{ bornes: ['N', 'Q6N', 'Q7N'], couleur: 'bleu', label: 'Neutre' }, { bornes: ['L', 'Q6P', 'Q7P'], label: 'Phase' }],
    },
  };
  // autre tracé (étoile depuis N / L) : réseaux complets → 1
  const etoile = etatTraits(s, [
    { a: 'N', b: 'Q6N', couleur: 'bleu' }, { a: 'N', b: 'Q7N', couleur: 'bleu' },
    { a: 'L', b: 'Q6P', couleur: 'marron' }, { a: 'Q7P', b: 'L', couleur: 'bleu' },
  ]);
  assert.equal(etoile.score, 1);
  assert.deepEqual(etoile.reseaux, { complets: 2, total: 2, couleurFausse: 0, fautes: 0 });
  assert.equal(etoile.manquantes.size, 0);
  assert.equal(corriger(s, { type: 'schema', traits: [
    { a: 'N', b: 'Q6N', couleur: 'bleu' }, { a: 'N', b: 'Q7N', couleur: 'bleu' },
    { a: 'L', b: 'Q6P', couleur: 'marron' }, { a: 'Q7P', b: 'L', couleur: 'bleu' },
  ], platine: null }).detail?.startsWith('traits : 2/2 réseaux'), true);
  // réseau partiel : N–Q6N seul → (2−1)/(3−1) = ½ ; phase complète → moyenne 0,75
  const partiel = etatTraits(s, [
    { a: 'N', b: 'Q6N', couleur: 'bleu' },
    { a: 'L', b: 'Q6P', couleur: 'marron' }, { a: 'Q6P', b: 'Q7P', couleur: 'marron' },
  ]);
  proche(partiel.score, 0.75);
  assert.ok(partiel.manquantes.has(cleLiaison('Q6N', 'Q7N')));
  // couleur fausse dans le neutre (réseau complet) → ½ pour ce réseau : (0,5 + 1)/2
  const couleur = etatTraits(s, [
    { a: 'N', b: 'Q6N', couleur: 'marron' }, { a: 'Q6N', b: 'Q7N', couleur: 'bleu' },
    { a: 'L', b: 'Q6P', couleur: 'marron' }, { a: 'Q6P', b: 'Q7P', couleur: 'marron' },
  ]);
  proche(couleur.score, 0.75);
  assert.equal(couleur.reseaux?.couleurFausse, 1);
  assert.ok(couleur.mauvaiseCouleur.has(cleLiaison('N', 'Q6N')));
  // trait entre deux réseaux (court-circuit N–L) : 1 − 1/2 ; vers une borne hors réseau : faute aussi
  const cc = etatTraits(s, [
    { a: 'N', b: 'Q6N', couleur: 'bleu' }, { a: 'Q6N', b: 'Q7N', couleur: 'bleu' },
    { a: 'L', b: 'Q6P', couleur: 'marron' }, { a: 'Q6P', b: 'Q7P', couleur: 'marron' },
    { a: 'N', b: 'L', couleur: 'bleu' },
  ]);
  proche(cc.score, 0.5);
  assert.ok(cc.fausses.has(cleLiaison('N', 'L')));
  const hors = etatTraits(s, [
    { a: 'N', b: 'Q6N', couleur: 'bleu' }, { a: 'Q6N', b: 'Q7N', couleur: 'bleu' },
    { a: 'L', b: 'Q6P', couleur: 'marron' }, { a: 'Q6P', b: 'Q7P', couleur: 'marron' },
    { a: 'Q7P', b: 'X', couleur: 'marron' }, { a: 'N', b: 'L', couleur: 'bleu' },
  ]);
  assert.equal(hors.score, 0); // 1 − 2 × ½
  assert.equal(hors.reseaux?.fautes, 2);
  // sans réseaux : comportement inchangé (trait par trait)
  const sans: QSchema = { ...s, traits: { ...s.traits, reseaux: undefined } };
  assert.equal(etatTraits(sans, [{ a: 'N', b: 'Q6N', couleur: 'bleu' }, { a: 'N', b: 'Q7N', couleur: 'bleu' }]).score, 0);
  assert.equal(etatTraits(sans, [{ a: 'N', b: 'Q6N', couleur: 'bleu' }]).reseaux, undefined);
});

/* ───────────── copie et bilan ───────────── */
test('corrigerCopie + bilan + évaluation', () => {
  const q1: QCocher = { ...base, num: 1, type: 'cocher', options: ['a', 'b'], bonnes: [0] };
  const q2: QRedige = { ...base, num: 2, partie: 2, competence: 'C11', type: 'redige', motsCles: ['bc'], minMotsCles: 1, corrige: 'BC' };
  const q3: QCalcul = { ...base, num: 3, partie: 2, competence: 'C3', points: 2, type: 'calcul', grandeur: 'k', formule: '', formuleMotsCles: [], attendu: 1, tolerance: 0 };
  const sujet: SujetNumerique = {
    id: 't', titre: 'T', sousTitre: '', diploma: 'bacpro', dureeMin: 60, consignes: [], problematique: '', dtr: [], pagesSujet: [],
    parties: [
      { num: 1, titre: 'P1', objectifs: [], competences: ['C1'], situation: '', dtrPages: [] },
      { num: 2, titre: 'P2', objectifs: [], competences: ['C3', 'C11'], situation: '', dtrPages: [] },
    ],
    questions: [q1, q2, q3],
  };
  const st: SujetAttemptState = {
    kind: 'sujet', sujetId: 't', mode: 'examen', courante: 1, marquees: [], debut: null, secondesEcoulees: 0,
    remise: false, remiseAt: null, annotations: {},
    reponses: { 1: { type: 'cocher', choix: [0] }, 2: { type: 'redige', texte: 'le chargé BC' } },
    corrections: {},
  };
  const c = corrigerCopie(sujet, st);
  assert.equal(c[1].score, 1);
  assert.equal(c[2].statut, 'aValider');
  assert.equal(c[3].statut, 'sansReponse');
  const b = calculerBilan(sujet, c);
  assert.equal(b.total, 4);
  assert.equal(b.points, 2);
  assert.equal(b.note20, 10);
  assert.deepEqual(b.aValider, [2]);
  assert.deepEqual(b.sansReponse, [3]);
  assert.deepEqual(b.parties.map(p => [p.points, p.total]), [[1, 1], [1, 3]]);
  assert.deepEqual(b.competences.map(k => k.code), ['C1', 'C3', 'C11']);
  const ev = evaluationSujet(sujet, b);
  assert.equal(ev.find(e => e.code === 'C1')?.mastery, 'acquis');
  assert.equal(ev.find(e => e.code === 'C3')?.mastery, 'nonAcquis');
  assert.ok(ev.every(e => e.label.length > 3 && Array.isArray(e.domains)));
  assert.equal(scoreStocke(b), 50);
  // note du professeur conservée
  const c2 = corrigerCopie(sujet, { ...st, corrections: { 2: correctionProf(2, 0.5) } });
  assert.equal(c2[2].statut, 'prof');
  assert.equal(calculerBilan(sujet, c2).points, 1.5);
});

/* ───────────── calculatrice ───────────── */
test('calculatrice', () => {
  proche(evaluer('8,1×6,3/((8,1+6,3)×(5,5−0,8))'), 0.75399, 1e-4);
  assert.equal(evaluer('2+3×4'), 14);
  assert.equal(evaluer('(2+3)×4'), 20);
  assert.equal(evaluer('√9+2²'), 7);
  assert.equal(evaluer('-3²'), -9);
  assert.equal(evaluer('2(3+1)'), 8);
  proche(evaluer('2π'), 2 * Math.PI);
  assert.equal(evaluer('10÷4'), 2.5);
  assert.equal(evaluer('2^3'), 8);
  assert.equal(evaluer('(1+2'), 3);
  assert.throws(() => evaluer('1÷0'));
  assert.throws(() => evaluer('2+'));
  assert.throws(() => evaluer('abc'));
  assert.equal(afficherResultat(0.1 + 0.2), '0,3');
});

console.log(`✓ ${n} groupes de tests du moteur de correction : tout est juste.`);
