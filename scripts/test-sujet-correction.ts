/**
 * Tests unitaires du moteur de correction des sujets numériques (sans runner) :
 *   npx tsx scripts/test-sujet-correction.ts
 * Couvre `src/lib/sujet/normalize.ts`, `correction.ts`, `bilan.ts`, `format.ts` (repères, placement),
 * `dtr.ts` (DTR numéroté par document) et `declinaisons.ts`.
 */
import assert from 'node:assert/strict';
import { normTexte, parseNombre, nombreJuste, texteAccepte, contientMotCle, estVide } from '@/lib/sujet/normalize';
import { corriger, corrigerCopie, estRepondue, etatTraits, scorePlatine, cleLiaison, correctionProf, etatPlacement } from '@/lib/sujet/correction';
import { intervalleReperes, repere, sousSection, texteAttendu, texteReponse, LIBELLE_OUTIL } from '@/lib/sujet/format';
import { documentsDtr, dtrParDocument, nomPageDtr, nomsPagesDtr, positionPage, resumeDtr } from '@/lib/sujet/dtr';
import { calculerBilan, evaluationSujet, scoreStocke } from '@/lib/sujet/bilan';
import { evaluer, afficherResultat } from '@/lib/sujet/calculatrice';
import { resumeSujet, sujetDerive, sujetsDerives } from '@/lib/sujet/declinaisons';
import { SUJETS, TOUS_SUJETS, sujetById, sujetsParDossier } from '@/lib/data/sujets';
import type {
  DtrPage, QBulles, QCalcul, QCavaliers, QCocher, QOrdonner, QPlacement, QRedige, QRelier, QSchema, QTableau, QValeur,
  ReponseSujet, SujetAttemptState, SujetNumerique, SujetQuestion,
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
/* ───────────── placement ───────────── */

/** Grille 5 × 3 (B.1.16) : 3 colonnes (largeur), 5 rangées (longueur), tolérance ± 1 m. */
const GRILLE: QPlacement = {
  ...base, num: 29, points: 4, type: 'placement', label: 'B.1.16',
  plan: { src: '/tp/x/plan.jpg', alt: 'plan', w: 630, h: 845 },
  symbole: 'luminaire',
  zone: { x0: 0.08, y0: 0.06, x1: 0.96, y1: 0.98 },
  attendus: Array.from({ length: 15 }, (_, i) => ({ x: 0.08 + 0.88 * ((i % 3) + 0.5) / 3, y: 0.06 + 0.92 * (Math.floor(i / 3) + 0.5) / 5 })),
  // ± 1 m : largeur 15,2 m sur 0,88 de l'image, longueur 35 m sur 0,92
  tolerance: { x: 0.88 / 15.2, y: 0.92 / 35 },
  max: 16,
};
const parfaite = () => GRILLE.attendus.map(a => ({ x: a.x, y: a.y }));

test('placement : grille parfaite, en trop, hors tolérance', () => {
  assert.equal(LIBELLE_OUTIL.placement, 'Placer sur un plan');
  const ok = corriger(GRILLE, { type: 'placement', points: parfaite() });
  assert.equal(ok.score, 1);
  assert.equal(ok.statut, 'auto');
  assert.equal(ok.detail, '15/15 luminaires bien placés');
  // ordre de pose indifférent, petits écarts dans la tolérance
  const decales = parfaite().reverse().map(p => ({ x: p.x + 0.02, y: p.y - 0.01 }));
  assert.equal(corriger(GRILLE, { type: 'placement', points: decales }).score, 1);
  // un seizième luminaire : (15 − 1) / 15
  const trop = corriger(GRILLE, { type: 'placement', points: [...parfaite(), { x: 0.5, y: 0.5 }] });
  proche(trop.score, 14 / 15, 1e-4);
  assert.match(trop.detail!, /15\/15 luminaires bien placés, 1 en trop/);
  // un luminaire hors tolérance (> 1 m) : 14 / 15, mal placé (pas pénalisé deux fois)
  const hors = parfaite();
  hors[4] = { x: hors[4].x + 0.07, y: hors[4].y };
  const h = corriger(GRILLE, { type: 'placement', points: hors });
  proche(h.score, 14 / 15, 1e-4);
  assert.match(h.detail!, /14\/15 luminaires bien placés, 1 mal placé/);
  const e = etatPlacement(GRILLE, hors);
  assert.deepEqual(e.manquants, [4]);
  assert.equal(e.apparies[4], null);
  assert.equal(e.apparies[0], 0);
  // au bord exact de l'ellipse : accepté ; juste au-delà : refusé
  const bord = parfaite(); bord[0] = { x: bord[0].x + GRILLE.tolerance.x, y: bord[0].y };
  assert.equal(corriger(GRILLE, { type: 'placement', points: bord }).score, 1);
  const diag = parfaite(); diag[0] = { x: diag[0].x + 0.8 * GRILLE.tolerance.x, y: diag[0].y + 0.8 * GRILLE.tolerance.y };
  proche(corriger(GRILLE, { type: 'placement', points: diag }).score, 14 / 15, 1e-4);
  // appariement glouton au plus proche : deux repères près du même attendu → un seul compte
  const g = etatPlacement(GRILLE, [{ x: GRILLE.attendus[0].x + 0.01, y: GRILLE.attendus[0].y }, { x: GRILLE.attendus[0].x, y: GRILLE.attendus[0].y }]);
  assert.equal(g.bien, 1);
  assert.deepEqual(g.apparies, [null, 0]);
  // vide : sans réponse ; plus de repères en trop que de bien placés : 0
  assert.equal(corriger(GRILLE, { type: 'placement', points: [] }).statut, 'sansReponse');
  assert.ok(!estRepondue(GRILLE, { type: 'placement', points: [] }));
  assert.ok(estRepondue(GRILLE, { type: 'placement', points: [{ x: 0.5, y: 0.5 }] }));
  const spam = Array.from({ length: 30 }, (_, i) => ({ x: (i % 6) / 6, y: Math.floor(i / 6) / 5 }));
  assert.equal(corriger({ ...GRILLE, max: 30 }, { type: 'placement', points: spam }).score, 0);
  // texte de la copie
  assert.deepEqual(texteReponse(GRILLE, { type: 'placement', points: hors }), ['15 luminaires posés — 14/15 luminaires bien placés, 1 mal placé']);
  assert.equal(texteAttendu(GRILLE)[0], '15 luminaires placés (voir le plan)');
});

test('placement : croix + champs complémentaires (½ + ½)', () => {
  const q: QPlacement = {
    ...base, num: 59, points: 4, type: 'placement', label: 'E.1.3',
    plan: { src: '/tp/x/disque.jpg', alt: 'disque', w: 345, h: 270 }, symbole: 'croix',
    attendus: [{ x: 0.383, y: 0.574, label: 'Sud, 15°' }], tolerance: { x: 0.04, y: 0.05 },
    champs: [
      { id: 'r', label: 'Rendement', unite: '%', attendu: 97.5, tolerance: 2.5 },
      { id: 'v', label: 'Viabilité', acceptes: ['oui'] },
    ],
  };
  const croix = [{ x: 0.39, y: 0.58 }];
  const tout = corriger(q, { type: 'placement', points: croix, valeurs: { r: '96 %', v: 'Oui' } });
  assert.equal(tout.score, 1);
  assert.equal(tout.detail, '1/1 croix bien placée · 2/2 valeurs justes');
  proche(corriger(q, { type: 'placement', points: croix, valeurs: { r: '90', v: 'oui' } }).score, 0.75);
  proche(corriger(q, { type: 'placement', points: [{ x: 0.9, y: 0.1 }], valeurs: { r: '100', v: 'oui' } }).score, 0.5);
  proche(corriger(q, { type: 'placement', points: croix }).score, 0.5);
  // champs seuls (aucune croix) : répondu, ½ au mieux
  const seuls = { type: 'placement' as const, points: [], valeurs: { r: '97', v: 'oui' } };
  assert.ok(estRepondue(q, seuls));
  proche(corriger(q, seuls).score, 0.5);
  assert.deepEqual(texteReponse(q, { type: 'placement', points: croix, valeurs: { r: '96', v: 'oui' } }),
    ['1 croix posée — 1/1 croix bien placée', 'Rendement : 96 %', 'Viabilité : oui']);
  assert.deepEqual(texteAttendu(q), ['1 croix placée (voir le plan) : Sud, 15°', 'Rendement : 97,5 %', 'Viabilité : oui']);
});

test('bulles en saisie libre : références normalisées', () => {
  const q: QBulles = {
    ...base, num: 70, type: 'bulles', plan: { src: '/x.jpg', alt: '' },
    bulles: [{ id: 'a', x: 10, y: 10, attendu: 'SYM 12.5-3-M (2)' }, { id: 'b', x: 50, y: 50, attendu: 'DC+1', acceptes: ['DC +1'] }],
  };
  assert.equal(corriger(q, { type: 'bulles', valeurs: { a: 'sym 12,5–3-m(2)', b: 'dc+ 1' } }).score, 1);
  assert.equal(corriger(q, { type: 'bulles', valeurs: { a: 'SYM 12.5-3-M', b: 'DC+1' } }).score, 0.5);
});

/* ───────────── repères hiérarchiques ───────────── */
test('repères : label ?? Q{num}, intervalles, sous-sections', () => {
  assert.equal(repere({ num: 12 }), 'Q12');
  assert.equal(repere({ num: 2, label: 'A.2.1.1' }), 'A.2.1.1');
  assert.equal(intervalleReperes([{ num: 38 }, { num: 14 }, { num: 20 }]), 'Q14 à Q38');
  assert.equal(intervalleReperes([{ num: 14, label: 'B.1.1' }, { num: 39, label: 'B.2.9' }], ' → '), 'B.1.1 → B.2.9');
  assert.equal(intervalleReperes([{ num: 76, label: 'F.1' }]), 'F.1');
  assert.equal(intervalleReperes([]), '');
  assert.equal(sousSection({ label: 'A.2.1.1' }), 'A.2');
  assert.equal(sousSection({ label: 'E.4.2.1.1' }), 'E.4');
  assert.equal(sousSection({ label: 'A.1' }), 'A');
  assert.equal(sousSection({ label: 'C.3' }), 'C');
  assert.equal(sousSection({}), null);
});

/* ───────────── DTR numéroté par document ───────────── */
const pageDtr = (num: number, doc?: number, section?: string): DtrPage => ({ num, src: `/tp/x/dtr-${num}.jpg`, titre: `Titre ${num}`, section, ...(doc != null ? { doc } : {}) });
test('DTR par document : regroupement, « DTR 28 · p. 2/4 », dérivés en documents entiers', () => {
  const sans = [pageDtr(2), pageDtr(3)];
  assert.ok(!dtrParDocument(sans));
  assert.equal(nomPageDtr({ dtr: sans }, 3), 'DTR 3');
  assert.equal(resumeDtr(sans), '2 pages');
  const pages = [pageDtr(1, 1, 'A'), pageDtr(2, 2, 'A'), pageDtr(3, 2, 'A'), pageDtr(4, 3, 'D'), pageDtr(5, 3, 'D'), pageDtr(6, 3, 'D'), pageDtr(7, 3, 'D'), pageDtr(8, 4, 'D')];
  assert.ok(dtrParDocument(pages));
  const docs = documentsDtr(pages);
  assert.deepEqual(docs.map(d => [d.num, d.pages.length]), [[1, 1], [2, 2], [3, 4], [4, 1]]);
  assert.equal(docs[2].titre, 'Titre 4');
  assert.deepEqual(positionPage(pages, 6) && { doc: positionPage(pages, 6)!.doc.num, rang: positionPage(pages, 6)!.rang, total: positionPage(pages, 6)!.total }, { doc: 3, rang: 3, total: 4 });
  assert.equal(nomPageDtr({ dtr: pages }, 5), 'DTR 3 · p. 2/4');
  assert.equal(nomPageDtr({ dtr: pages }, 1), 'DTR 1');
  assert.equal(nomsPagesDtr({ dtr: pages }, [8, 3]), 'DTR 4, DTR 2 · p. 2/2');
  assert.equal(resumeDtr(pages), '4 documents · 8 pages');
  // Sujet dérivé : une page citée d'un document → tout le document ; repères dans les consignes
  const q = (num: number, partie: number, dtr: number[], label: string): QRedige => ({
    ...base, num, partie, dtr, label, type: 'redige', motsCles: ['x'], minMotsCles: 1, corrige: 'x',
  });
  const s: SujetNumerique = {
    id: 't', titre: 'T', sousTitre: '', diploma: SUJETS[0].diploma, dureeMin: 60, consignes: [], problematique: 'P',
    dtr: pages, pagesSujet: [{ num: 3, src: '/tp/x/s3.jpg', titre: 's' }],
    parties: [
      { num: 1, titre: 'A', objectifs: [], competences: ['C1'], situation: '', dtrPages: [1] },
      { num: 2, titre: 'D', objectifs: [], competences: ['C1'], situation: '', dtrPages: [] },
    ],
    questions: [q(1, 1, [2], 'A.1'), q(2, 2, [6], 'D.1.1'), q(3, 2, [8], 'D.1.2')],
  };
  const d = sujetDerive(s, { id: 't-d', theme: 'moteur', titre: 'D', parties: [2], dureeMin: 30 });
  assert.deepEqual(d.dtr.map(p => p.num), [4, 5, 6, 7, 8]);
  assert.ok(d.consignes[1].includes('(D.1.1 à D.1.2)'), d.consignes[1]);
  const r = resumeSujet(s);
  assert.equal(r.intervalle, 'A.1 → D.1.2');
  assert.equal(r.dtrDe, 1);
  const a = sujetDerive(s, { id: 't-a', theme: 'distribution', titre: 'A', parties: [1], dureeMin: 30 });
  assert.deepEqual(a.dtr.map(p => p.num), [1, 2, 3]);
  // Page hors numérotation (sommaire, sans `doc`) : document à part, nommé par son titre, jamais fondu dans « DTR 2 ».
  const avecSommaire = [{ ...pageDtr(2), titre: 'Sommaire' }, pageDtr(3, 1), pageDtr(4, 2), pageDtr(5, 2)];
  const ds = documentsDtr(avecSommaire);
  assert.deepEqual(ds.map(d => [d.cle, d.num, d.pages.length]), [['p2', null, 1], ['1', 1, 1], ['2', 2, 2]]);
  assert.equal(nomPageDtr({ dtr: avecSommaire }, 2), 'Sommaire');
  assert.equal(nomPageDtr({ dtr: avecSommaire }, 5), 'DTR 2 · p. 2/2');
  assert.equal(resumeDtr(avecSommaire), '2 documents · 4 pages');
});

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

/* ───────────── sujets thématiques (déclinaisons) ───────────── */

/** Réponse parfaite à une question, tirée de ses données de correction. */
function reponseParfaite(q: SujetQuestion): ReponseSujet {
  switch (q.type) {
    case 'cocher': return { type: 'cocher', choix: [...q.bonnes] };
    case 'relier': return { type: 'relier', liens: [...q.liens] };
    case 'ordonner': return { type: 'ordonner', rangs: [...q.rangs] };
    case 'valeur': return {
      type: 'valeur',
      valeurs: Object.fromEntries(q.champs.map(c => [c.id, c.acceptes?.[0] ?? String(c.attendu ?? '')])),
    };
    case 'calcul': return { type: 'calcul', formule: q.formule, application: '', resultat: String(q.attendu) };
    case 'tableau': {
      const cellules: Record<string, string> = {};
      for (const l of q.lignes) for (const c of l.cellules) {
        if (typeof c === 'string') continue;
        const v = c.acceptes?.[0] ?? (c.attendu != null ? String(c.attendu) : 'justification');
        cellules[c.id] = v;
      }
      return { type: 'tableau', cellules };
    }
    case 'redige': return { type: 'redige', texte: q.motsCles.join(' ') };
    case 'bulles': return { type: 'bulles', valeurs: Object.fromEntries(q.bulles.map(x => [x.id, x.attendu])) };
    case 'placement': return {
      type: 'placement',
      points: q.attendus.map(a => ({ x: a.x, y: a.y })),
      ...(q.champs ? { valeurs: Object.fromEntries(q.champs.map(c => [c.id, c.acceptes?.[0] ?? String(c.attendu ?? '')])) } : {}),
    };
    case 'cavaliers': return {
      type: 'cavaliers',
      valeurs: Object.fromEntries(q.composants.flatMap(c => c.positions.map(p => [`${c.id}.${p.id}`, p.attendu]))),
    };
    case 'schema': {
      const reseauDe = (b: string) => q.traits.reseaux?.find(r => r.bornes.includes(b));
      const traits = q.traits.attendues.map(l => ({
        a: l.a, b: l.b, couleur: l.couleur ?? reseauDe(l.a)?.couleur ?? q.traits.couleurs[0].id,
      }));
      const n = q.traits.attendues.length;
      return { type: 'schema', traits, platine: { conformes: n, total: n, sousTension: true, essai: true } };
    }
  }
}

const copieParfaite = (s: SujetNumerique): SujetAttemptState => ({
  kind: 'sujet', sujetId: s.id, mode: 'examen', courante: s.questions[0].num, marquees: [], debut: null,
  secondesEcoulees: 0, remise: false, remiseAt: null, annotations: {}, corrections: {},
  reponses: Object.fromEntries(s.questions.map(q => [q.num, reponseParfaite(q)])),
});

test('sujets thématiques : dérivation sans copie ni renumérotation', () => {
  const base = sujetById('eip')!;
  assert.ok(base && !base.parent && SUJETS.includes(base));
  const derives = sujetsDerives(base);
  assert.deepEqual(derives.map(d => d.id), ['eip-habilitations', 'eip-eclairage', 'eip-myhome', 'eip-vigik']);
  assert.equal(TOUS_SUJETS.filter(s => (s.parent ?? s.id) === 'eip').length, 5);
  for (const d of derives) {
    assert.equal(sujetById(d.id)?.id, d.id);
    assert.equal(d.parent, 'eip');
    assert.equal(d.declinaisons, undefined);
    // mêmes objets question que le sujet complet (aucune copie), numéros du papier conservés
    for (const q of d.questions) assert.equal(base.questions.find(x => x.num === q.num), q);
    // chaque page DTR citée par une question est dans le DTR du thème ; chaque page du sujet aussi
    for (const q of d.questions) {
      for (const p of q.dtr) assert.ok(d.dtr.some(x => x.num === p), `${d.id} Q${q.num} DTR ${p}`);
      assert.ok(d.pagesSujet.some(x => x.num === q.pageSujet), `${d.id} Q${q.num} page ${q.pageSujet}`);
    }
    assert.ok(d.consignes[0].startsWith('Durée'));
    assert.ok(d.titre.startsWith('EIP · '));
  }
  // les questions des thèmes couvrent exactement le sujet complet, sans doublon
  const nums = derives.flatMap(d => d.questions.map(q => q.num)).sort((a, b) => a - b);
  assert.deepEqual(nums, base.questions.map(q => q.num));
  const ecl = sujetById('eip-eclairage')!;
  assert.equal(ecl.questions[0].num, 14);
  assert.equal(ecl.questions[ecl.questions.length - 1].num, 38);
  assert.equal(ecl.questions.length, 25);
  assert.deepEqual(ecl.dtr.map(p => p.num), [7, 8, 9, 10, 11]);
  assert.equal(ecl.dureeMin, 95);
  assert.deepEqual(ecl.themes, ['eclairage']);
  assert.deepEqual(sujetsParDossier().filter(g => g.base.id === 'eip').map(g => [g.base.id, g.derives.length]), [['eip', 4]]);
  // chaque dossier : sujet complet + ses déclinaisons, toutes enregistrées
  for (const g of sujetsParDossier()) assert.equal(g.derives.length, g.base.declinaisons?.length ?? 0, g.base.id);
  // dérivation directe (déclinaison sur deux parties) : DTR = union, numéros conservés
  const deux = sujetDerive(base, { id: 'x', theme: 'domotique', titre: 'X', parties: [3, 4], dureeMin: 145 });
  assert.equal(deux.questions[0].num, 39);
  assert.equal(deux.questions.length, 34);
});

test('sujets thématiques : barème, copie parfaite = 20/20, bilan limité au thème', () => {
  const attendus: Record<string, number> = { eip: 98, 'eip-habilitations': 20, 'eip-eclairage': 31, 'eip-myhome': 28, 'eip-vigik': 19 };
  for (const s of TOUS_SUJETS) {
    const total = s.questions.reduce((a, q) => a + q.points, 0);
    if (attendus[s.id] != null) assert.equal(total, attendus[s.id], `${s.id} : ${total} points`);
    const st = copieParfaite(s);
    const c = corrigerCopie(s, st);
    for (const q of s.questions) {
      // Rédigé : pré-note à valider ; la copie « parfaite » doit tout de même avoir 1.
      assert.equal(c[q.num].score, 1, `${s.id} ${repere(q)} : ${c[q.num].detail}`);
    }
    const b = calculerBilan(s, c);
    assert.equal(b.total, Math.round(total * 100) / 100);
    assert.equal(b.note20, 20, `${s.id} : ${b.note20}/20`);
    assert.equal(scoreStocke(b), 100);
    assert.deepEqual(b.parties.map(p => p.num), s.parties.map(p => p.num));
    // compétences du bilan = compétences des seules questions du thème
    const comps = new Set(s.questions.map(q => q.competence));
    assert.deepEqual(new Set(b.competences.map(k => k.code)), comps);
    assert.deepEqual(new Set(evaluationSujet(s, b).map(e => e.code)), comps);
  }
  // T1 et T2 n'évaluent pas C6 (domotique, accès) ; le sujet complet, si
  for (const id of ['eip-habilitations', 'eip-eclairage']) {
    const s = sujetById(id)!;
    assert.ok(!calculerBilan(s, corrigerCopie(s, copieParfaite(s))).competences.some(k => k.code === 'C6'), id);
  }
  // copie à moitié : note /20 recalculée sur le barème du thème (31 pts)
  const ecl = sujetById('eip-eclairage')!;
  const moitie = copieParfaite(ecl);
  for (const q of ecl.questions.filter(q => q.num >= 27)) delete moitie.reponses[q.num];
  const bm = calculerBilan(ecl, corrigerCopie(ecl, moitie));
  const pts = ecl.questions.filter(q => q.num < 27).reduce((a, q) => a + q.points, 0);
  proche(bm.note20, Math.round((pts / 31) * 20 * 100) / 100);
  assert.equal(bm.sansReponse.length, ecl.questions.filter(q => q.num >= 27).length);
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
