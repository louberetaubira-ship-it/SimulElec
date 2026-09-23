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
      valeurs: Object.fromEntries(q.champs.map(c => [c.id, c.formule ? c.formule.attendues[0] : c.acceptes?.[0] ?? String(c.attendu ?? '')])),
    };
    case 'calcul': return { type: 'calcul', formule: q.formuleSpec ? q.formuleSpec.attendues[0] : q.formule, application: '', resultat: String(q.attendu) };
    case 'tableau': {
      const cellules: Record<string, string> = {};
      for (const l of q.lignes) for (const c of l.cellules) {
        if (typeof c === 'string') continue;
        const v = c.formule ? c.formule.attendues[0] : c.acceptes?.[0] ?? (c.attendu != null ? String(c.attendu) : 'justification');
        cellules[c.id] = v;
      }
      return { type: 'tableau', cellules };
    }
    case 'redige': return { type: 'redige', texte: q.motsCles.join(' ') };
    case 'bulles': return { type: 'bulles', valeurs: Object.fromEntries(q.bulles.map(x => [x.id, x.attendu])) };
    case 'placement': return {
      type: 'placement',
      points: q.attendus.map(a => ({ x: a.x, y: a.y })),
      ...(q.champs ? { valeurs: Object.fromEntries(q.champs.map(c => [c.id, c.formule ? c.formule.attendues[0] : c.acceptes?.[0] ?? String(c.attendu ?? '')])) } : {}),
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
  // chaque dossier : le sujet complet et ses déclinaisons, toutes enregistrées
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

/* ═══════════════ Corrigé côté serveur (agent SERVEUR) : sujet public, routes, aides ═══════════════
 * Bloc asynchrone séparé : les handlers des routes `/api/sujet/*` sont appelés directement
 * (mode démonstration, sans session), puis la logique d'accès avec une session simulée. */
void (async () => {
  const { sujetPublic, clesCorrigePresentes, estReponduePublique, texteReponsePublique, CLES_CORRIGE } = await import('@/lib/sujet/public');
  const { aidesQuestion } = await import('@/lib/sujet/server/aides');
  const { routeCorriger, routeCorrige } = await import('@/lib/sujet/server/routes');
  const { POST: postCorriger } = await import('@/app/api/sujet/corriger/route');
  const { POST: postAide } = await import('@/app/api/sujet/aide/route');
  const { POST: postRemettre } = await import('@/app/api/sujet/remettre/route');
  const { GET: getSolution } = await import('@/app/api/sujet/solution/route');
  type Session = NonNullable<Awaited<ReturnType<typeof import('@/lib/sujet/server/acces').lireSession>>>;
  let m = 0;
  const cas = async (nom: string, fn: () => void | Promise<void>) => {
    try { await fn(); m += 1; } catch (e) { console.error(`✗ ${nom}`); throw e; }
  };
  const json = (url: string, body: unknown) => new Request(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  const ancienDemo = process.env.NEXT_PUBLIC_DEMO_MODE;
  process.env.NEXT_PUBLIC_DEMO_MODE = '1';

  await cas('sujetPublic : aucune clé de corrigé (récursif, 19 sujets)', () => {
    assert.equal(TOUS_SUJETS.length, 19);
    for (const s of TOUS_SUJETS) {
      const p = sujetPublic(s);
      assert.deepEqual(clesCorrigePresentes(p), [], s.id);
      // Contrôle du contrôle : le sujet complet, lui, en contient.
      assert.ok(clesCorrigePresentes(s).length > 0, s.id);
      assert.deepEqual(p.questions.map(q => [q.num, q.type, q.points, q.partie]), s.questions.map(q => [q.num, q.type, q.points, q.partie]), s.id);
      const texte = JSON.stringify(p);
      for (const q of s.questions) {
        if (q.explication && q.explication.length > 25) assert.ok(!texte.includes(JSON.stringify(q.explication).slice(1, -1)), `${s.id} Q${q.num} explication servie`);
        if (q.type === 'redige') assert.ok(!texte.includes(JSON.stringify(q.corrige).slice(1, -1)), `${s.id} Q${q.num} corrigé rédigé servi`);
        if (q.type === 'schema') assert.ok(!texte.includes(q.corrigeImage.src), `${s.id} Q${q.num} image du corrigé servie`);
        for (const a of q.aides ?? []) assert.ok(!texte.includes(JSON.stringify(a).slice(1, -1)), `${s.id} Q${q.num} aide servie`);
      }
    }
    assert.ok(CLES_CORRIGE.includes('acceptes') && CLES_CORRIGE.includes('bonnes'));
  });

  await cas('sujetPublic : ce que l’interface garde (formule, saisie, choix, platine, plafond de placement)', () => {
    for (const s of SUJETS) {
      const p = sujetPublic(s);
      s.questions.forEach((q, i) => {
        const pq = p.questions[i];
        assert.equal(pq.nbAides, 3);
        if (q.type === 'schema' && pq.type === 'schema') assert.equal(pq.platineTpId, q.platineTpId);
        if (q.type === 'placement' && pq.type === 'placement') assert.ok(pq.max >= q.attendus.length);
        if (q.type === 'cocher' && pq.type === 'cocher') assert.equal(pq.multiple, !!q.multiple || q.bonnes.length > 1);
        if (q.type === 'valeur' && pq.type === 'valeur') q.champs.forEach((c, j) => {
          assert.equal(!!pq.champs[j].estFormule, !!c.formule);
          assert.equal(pq.champs[j].saisie, c.saisie);
        });
        if (q.type === 'tableau' && pq.type === 'tableau') q.lignes.forEach((l, j) => l.cellules.forEach((c, k) => {
          const pc = pq.lignes[j].cellules[k];
          if (typeof c === 'string') assert.equal(pc, c);
          else assert.ok(typeof pc !== 'string' && pc.id === c.id && JSON.stringify(pc.choix) === JSON.stringify(c.choix) && !!pc.estFormule === !!c.formule);
        }));
        if (q.type === 'calcul' && pq.type === 'calcul') assert.equal(pq.estFormule, !!q.formuleSpec);
        // Réponse de l'élève : même verdict « répondue » et lignes lisibles sans le corrigé.
        const r = reponseParfaite(q);
        assert.equal(estReponduePublique(pq, r), estRepondue(q, r), `${s.id} Q${q.num}`);
        assert.ok(texteReponsePublique(pq, r).length > 0);
      });
    }
  });

  await cas('aides : 3 par question, sans l’explication du corrigé', () => {
    for (const s of SUJETS) {
      for (const q of s.questions) {
        const a = aidesQuestion(s, q);
        assert.equal(a.length, 3, `${s.id} Q${q.num}`);
        assert.ok(a.every(t => t.trim().length > 10), `${s.id} Q${q.num}`);
        if (q.explication && q.explication.length > 25) assert.ok(!a.some(t => t.includes(q.explication!)), `${s.id} Q${q.num}`);
      }
    }
    // Aides par défaut (question sans aides) : DTR, indice ou méthode, forme.
    const q = { ...SUJETS[0].questions.find(x => x.dtr.length > 0)!, aides: undefined, indice: undefined };
    const d = aidesQuestion(SUJETS[0], q);
    assert.match(d[0], /DTR/);
    assert.match(d[1], /Méthode/);
    assert.match(d[2], /Forme de la réponse/);
  });

  await cas('POST /api/sujet/corriger (handler, démonstration)', async () => {
    const s = sujetById('eip')!;
    for (const q of s.questions.filter(x => x.type !== 'redige' && x.type !== 'schema').slice(0, 30)) {
      const res = await postCorriger(json('/api/sujet/corriger', { sujetId: 'eip', num: q.num, reponse: reponseParfaite(q) }));
      assert.equal(res.status, 200);
      const c = await res.json() as { score: number; num: number };
      assert.equal(c.num, q.num);
      assert.equal(c.score, corriger(q, reponseParfaite(q)).score, `Q${q.num}`);
    }
    const q1 = s.questions.find(x => x.type === 'cocher')!;
    const faux = await (await postCorriger(json('/api/sujet/corriger', { sujetId: 'eip', num: q1.num, reponse: { type: 'cocher', choix: [99] } }))).json() as { score: number };
    assert.equal(faux.score, 0);
    const vide = await (await postCorriger(json('/api/sujet/corriger', { sujetId: 'eip', num: q1.num, reponse: null }))).json() as { statut: string };
    assert.equal(vide.statut, 'sansReponse');
    assert.equal((await postCorriger(json('/api/sujet/corriger', { sujetId: 'inconnu', num: 1, reponse: null }))).status, 404);
    assert.equal((await postCorriger(json('/api/sujet/corriger', { sujetId: 'eip', num: 9999, reponse: null }))).status, 404);
    assert.equal((await postCorriger(json('/api/sujet/corriger', { num: 1 }))).status, 400);
    assert.equal((await postCorriger(new Request('http://localhost/api/sujet/corriger', { method: 'POST', body: 'pas du json' }))).status, 400);
    // Réponse malformée : pas d'exception vers l'appelant.
    const r = await postCorriger(json('/api/sujet/corriger', { sujetId: 'eip', num: q1.num, reponse: { type: 'cocher', choix: 'x' } }));
    assert.ok(r.status === 200 || r.status === 400);
  });

  await cas('POST /api/sujet/aide (handler, démonstration)', async () => {
    const s = sujetById('scierie')!;
    const q = s.questions[3];
    const attendues = aidesQuestion(s, q);
    for (const niveau of [1, 2, 3]) {
      const res = await postAide(json('/api/sujet/aide', { sujetId: 'scierie', num: q.num, niveau }));
      assert.equal(res.status, 200);
      const a = await res.json() as { niveau: number; total: number; texte: string };
      assert.deepEqual(a, { niveau, total: 3, texte: attendues[niveau - 1] });
    }
    assert.equal((await postAide(json('/api/sujet/aide', { sujetId: 'scierie', num: q.num, niveau: 4 }))).status, 400);
    assert.equal((await postAide(json('/api/sujet/aide', { sujetId: 'scierie', num: q.num, niveau: 0 }))).status, 400);
    assert.equal((await postAide(json('/api/sujet/aide', { sujetId: 'scierie', num: -1, niveau: 1 }))).status, 404);
  });

  await cas('POST /api/sujet/remettre (handler) = corrigerCopie', async () => {
    for (const id of ['eip-eclairage', 'scierie']) {
      const s = sujetById(id)!;
      const st = copieParfaite(s);
      const res = await postRemettre(json('/api/sujet/remettre', { sujetId: id, reponses: st.reponses }));
      assert.equal(res.status, 200);
      const { corrections } = await res.json() as { corrections: Record<number, { score: number }> };
      const ref = corrigerCopie(s, st);
      assert.deepEqual(Object.keys(corrections).sort(), Object.keys(ref).sort());
      proche(calculerBilan(sujetPublic(s), corrections as never).note20, calculerBilan(s, ref).note20);
    }
    assert.equal((await postRemettre(json('/api/sujet/remettre', { sujetId: 'eip' }))).status, 400);
  });

  await cas('GET /api/sujet/solution : 403 sans publication, 200 publié / professeur', async () => {
    assert.equal((await getSolution(new Request('http://localhost/api/sujet/solution?sujetId=eip'))).status, 403);
    const ok = await getSolution(new Request('http://localhost/api/sujet/solution?sujetId=eip-vigik&demo=publie'));
    assert.equal(ok.status, 200);
    const c = await ok.json() as { sujetId: string; questions: Record<string, { attendu: string[] }> };
    assert.equal(c.sujetId, 'eip-vigik');
    assert.equal(Object.keys(c.questions).length, sujetById('eip-vigik')!.questions.length);
    assert.equal((await getSolution(new Request('http://localhost/api/sujet/solution?sujetId=zzz'))).status, 404);
    // Hors démonstration : pas de session → 401 ; le paramètre de démo est ignoré.
    assert.equal((await routeCorrige(new URLSearchParams('sujetId=eip&demo=publie'), { demo: false, session: async () => null })).status, 401);
    // Session simulée : table `sujet_corriges` lue sous RLS (faux client).
    const faux = (lignes: unknown[], attempts: unknown = null): Session['supabase'] => {
      const chaine = (table: string) => {
        const res = table === 'attempts' ? { data: attempts, error: null } : table === 'assignments' ? { data: null, error: null } : { data: lignes, error: null };
        const c: Record<string, unknown> = {};
        for (const k of ['select', 'eq', 'in', 'neq', 'not', 'order', 'limit']) c[k] = () => c;
        c.maybeSingle = () => Promise.resolve(res);
        c.then = (ok: (v: unknown) => unknown) => Promise.resolve(res).then(ok);
        return c;
      };
      return { from: chaine } as unknown as Session['supabase'];
    };
    const eleve = (lignes: unknown[], attempts: unknown = null): Session => ({ supabase: faux(lignes, attempts), userId: 'u', role: 'eleve', classId: 'c1' });
    const prof: Session = { supabase: faux([]), userId: 'p', role: 'professeur', classId: null };
    const url = new URLSearchParams('sujetId=eip-eclairage');
    assert.equal((await routeCorrige(url, { demo: false, session: async () => eleve([]) })).status, 403);
    assert.equal((await routeCorrige(url, { demo: false, session: async () => eleve([{ sujet_id: 'eip' }]) })).status, 200);
    assert.equal((await routeCorrige(url, { demo: false, session: async () => prof })).status, 200);
    // Épreuve d'examen en cours : pas de vérification.
    const examen = { status: 'en_cours', state: { kind: 'sujet', mode: 'examen', remise: false } };
    const q = sujetById('eip')!.questions[0];
    const corps = { sujetId: 'eip', num: q.num, reponse: reponseParfaite(q) };
    assert.equal((await routeCorriger(corps, { demo: false, session: async () => eleve([], examen) })).status, 403);
    assert.equal((await routeCorriger(corps, { demo: false, session: async () => eleve([], { ...examen, state: { ...examen.state, mode: 'entrainement' } }) })).status, 200);
    assert.equal((await routeCorriger(corps, { demo: false, session: async () => null })).status, 401);
  });

  await cas('GET /api/sujet/image : image du corrigé privée, mêmes droits que le corrigé', async () => {
    const { GET: getImage } = await import('@/app/api/sujet/image/route');
    const { routeImage } = await import('@/lib/sujet/server/routes');
    const { existsSync } = await import('node:fs');
    for (const s of SUJETS) for (const q of s.questions) {
      if (q.type !== 'schema') continue;
      assert.ok(!q.corrigeImage.src.startsWith('/'), `${s.id} Q${q.num} : image du corrigé publique`);
      assert.ok(existsSync(`private/${q.corrigeImage.src}`), `${s.id} Q${q.num} : image absente de private/`);
    }
    const q = sujetById('eip')!.questions.find(x => x.type === 'schema')!;
    assert.equal((await getImage(new Request(`http://localhost/api/sujet/image?sujetId=eip&num=${q.num}`))).status, 403);
    const ok = await getImage(new Request(`http://localhost/api/sujet/image?sujetId=eip-myhome&num=${sujetById('eip-myhome')!.questions.find(x => x.type === 'schema')!.num}&demo=publie`));
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/jpeg');
    assert.ok((await ok.arrayBuffer()).byteLength > 1000);
    assert.equal((await getImage(new Request('http://localhost/api/sujet/image?sujetId=eip&num=1&demo=publie'))).status, 404);
    // Le corrigé servi pointe vers la route, jamais vers le fichier.
    const c = await (await getSolution(new Request('http://localhost/api/sujet/solution?sujetId=eip&demo=publie'))).json() as { questions: Record<string, { corrigeImage?: { src: string } }> };
    assert.match(c.questions[q.num].corrigeImage!.src, /^\/api\/sujet\/image\?sujetId=eip&num=\d+&demo=publie$/);
    const prof = { supabase: {} as never, userId: 'p', role: 'professeur' as const, classId: null };
    assert.equal((await routeImage(new URLSearchParams(`sujetId=eip&num=${q.num}`), { demo: false, session: async () => prof })).status, 200);
    assert.equal((await routeImage(new URLSearchParams(`sujetId=eip&num=${q.num}`), { demo: false, session: async () => null })).status, 401);
  });

  if (ancienDemo === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE; else process.env.NEXT_PUBLIC_DEMO_MODE = ancienDemo;
  console.log(`✓ ${m} groupes de tests du corrigé côté serveur (sujet public, routes, aides, publication).`);
})().catch(e => { console.error(e); process.exit(1); });

/* ═════════════ Formules (agent MATHS) : équivalence, erreurs typiques, verdicts par champ ═════════════ */
{
  let f = 0;
  const tf = (nom: string, fn: () => void) => {
    try { fn(); f += 1; } catch (e) { console.error(`✗ ${nom}`); throw e; }
  };
  const specQ = {
    attendues: ['P\\tan\\varphi', 'S\\sin\\varphi'],
    membreGauche: ['Q'],
    variables: { P: { min: 1000, max: 50000 }, '\\varphi': { min: 0.2, max: 1.3 }, "\\varphi'": { min: 0.05, max: 0.19 } },
    derivees: { S: '\\frac{P}{\\cos\\varphi}' },
    affichage: 'Q = P × tan φ',
  };
  const base = { partie: 1, enonce: 'x', competence: 'C3', points: 1, dtr: [1], pageSujet: 1 };

  tf('valeur : champ formule jugé par équivalence + erreur typique formule', () => {
    const q: QValeur = {
      ...base, num: 901, type: 'valeur',
      champs: [{ id: 'f', label: 'Formule', formule: specQ }],
      erreursTypiques: [
        { id: 'qc', message: 'Formule de la puissance à compenser.', formule: "P(\\tan\\varphi-\\tan\\varphi')" },
        { id: 'cos', message: 'Pas le cosinus.', champ: 'f', formule: 'P\\cos\\varphi' },
      ],
    };
    const ok = corriger(q, { type: 'valeur', valeurs: { f: 'Q=\\tan\\varphi\\times P' } });
    assert.equal(ok.score, 1);
    assert.equal(ok.detail, 'Valeur juste');
    assert.deepEqual(ok.champs, { f: true });
    assert.equal(ok.erreurs, undefined);
    assert.equal(corriger(q, { type: 'valeur', valeurs: { f: 'Q = S × sin φ' } }).score, 1);
    const qc = corriger(q, { type: 'valeur', valeurs: { f: "Q_{c}=P\\left(\\tan\\varphi-\\tan\\varphi^{\\prime}\\right)" } });
    assert.equal(qc.score, 0);
    assert.deepEqual(qc.erreurs, ['qc']);
    assert.equal(qc.message, 'Formule de la puissance à compenser.');
    assert.deepEqual(qc.champs, { f: false });
    assert.deepEqual(corriger(q, { type: 'valeur', valeurs: { f: 'Q=P\\cos\\varphi' } }).erreurs, ['cos']);
    // membre de gauche faux : faux, sans erreur typique
    const mg = corriger(q, { type: 'valeur', valeurs: { f: 'S=P\\tan\\varphi' } });
    assert.equal(mg.score, 0);
    assert.equal(mg.erreurs, undefined);
    // texte transcrit pour la copie
    assert.deepEqual(texteReponse(q, { type: 'valeur', valeurs: { f: 'Q=P\\tan\\varphi' } }), ['Formule : Q = P tan φ']);
    assert.deepEqual(texteAttendu(q), ['Formule : Q = P × tan φ']);
  });

  tf('valeur : saisie maths numérique, erreurs typiques nombre / valeurs, rétrocompatibilité', () => {
    const q: QValeur = {
      ...base, num: 902, type: 'valeur',
      champs: [
        { id: 'cos', label: 'cos φ', attendu: 0.85, tolerance: 0.005, saisie: 'maths' },
        { id: 'ref', label: 'Référence', acceptes: ['B2V'] },
      ],
      erreursTypiques: [
        { id: 'b1v', message: 'Titre insuffisant.', champ: 'ref', valeurs: ['B1V'] },
        { id: 'inv', message: 'Rapport inversé.', champ: 'cos', nombre: { valeur: 1.18, tolerance: 0.01 } },
      ],
    };
    const c = corriger(q, { type: 'valeur', valeurs: { cos: '\\frac{17}{20}', ref: 'b1v' } });
    assert.equal(c.score, 0.5);
    assert.deepEqual(c.champs, { cos: true, ref: false });
    assert.deepEqual(c.erreurs, ['b1v']);
    assert.equal(c.message, 'Titre insuffisant.');
    assert.equal(corriger(q, { type: 'valeur', valeurs: { cos: '0{,}85' } }).score, 0.5);
    assert.deepEqual(corriger(q, { type: 'valeur', valeurs: { cos: '1{,}18' } }).erreurs, ['inv']);
    // une erreur typique n'est jamais signalée sur un champ juste
    assert.equal(corriger(q, { type: 'valeur', valeurs: { ref: 'B2V' } }).erreurs, undefined);
    // sans formule ni erreurs typiques : même score et même détail qu'avant
    const ancien: QValeur = { ...base, num: 903, type: 'valeur', champs: [{ id: 'u', label: 'U', attendu: 400, tolerance: 1 }] };
    const r = corriger(ancien, { type: 'valeur', valeurs: { u: '400 V' } });
    assert.equal(r.score, 1);
    assert.equal(r.detail, 'Valeur juste');
    assert.equal(r.erreurs, undefined);
    assert.equal(r.message, undefined);
  });

  tf('tableau : cellule formule + application maths cohérente avec le résultat', () => {
    const q: QTableau = {
      ...base, num: 904, type: 'tableau', colonnes: ['', 'Formule', 'Application', 'Résultat'],
      lignes: [{ cellules: ['Q', { id: 'f', formule: specQ }, { id: 'a', saisie: 'maths' }, { id: 'r', attendu: 9000, tolerance: 50 }] }],
    };
    const c = corriger(q, { type: 'tableau', cellules: { f: 'Q=P\\tan\\varphi', a: '12\\,000\\times0{,}75', r: '8000' } });
    assert.equal(c.score, 0.5);
    assert.deepEqual(c.champs, { f: true, r: false });
    assert.equal(c.detail, '1/2 cases justes · application cohérente');
    assert.equal(corriger(q, { type: 'tableau', cellules: { f: 'Q=P', a: '12\\,000\\times0{,}5', r: '9000' } }).detail, '1/2 cases justes');
  });

  tf('calcul : formule par équivalence (formuleSpec), application cohérente, erreur typique nombre', () => {
    const q: QCalcul = {
      ...base, num: 905, type: 'calcul', grandeur: 'Q', unite: 'var', formule: 'Q = P × tan φ', formuleMotsCles: ['tan'],
      attendu: 9000, tolerance: 50, formuleSpec: specQ,
      erreursTypiques: [
        { id: 'cos', message: 'Pas le cosinus.', formule: 'P\\cos\\varphi' },
        { id: 'kvar', message: 'Unité : en var.', nombre: { valeur: 9, tolerance: 0.1 } },
      ],
    };
    const juste = corriger(q, { type: 'calcul', formule: 'Q=S\\sin\\varphi', application: '12000\\times0{,}75', resultat: '9000' });
    assert.equal(juste.score, 1);
    assert.equal(juste.detail, 'Résultat juste · application cohérente');
    assert.deepEqual(juste.champs, { formule: true, resultat: true });
    const report = corriger(q, { type: 'calcul', formule: 'Q = tan φ × P', application: '12000\\times0{,}75', resultat: '900' });
    assert.equal(report.score, 0.5);
    assert.equal(report.detail, 'Formule juste (équivalente), résultat faux · application cohérente (erreur de report ou d’arrondi ?)');
    const cos = corriger(q, { type: 'calcul', formule: 'Q=P\\cos\\varphi', application: '', resultat: '9' });
    assert.equal(cos.score, 0);
    assert.deepEqual(cos.erreurs, ['cos', 'kvar']);
    assert.equal(cos.message, 'Pas le cosinus.');
    assert.deepEqual(cos.champs, { formule: false, resultat: false });
    // Mots-clés ignorés quand la spec existe : « tan » seul ne suffit plus.
    assert.equal(corriger(q, { type: 'calcul', formule: 'Q = tan', application: '', resultat: '' }).score, 0);
    // Sans formuleSpec : mots-clés, comme avant.
    const { formuleSpec: _, ...sansSpec } = q;
    void _;
    assert.equal(corriger(sansSpec as QCalcul, { type: 'calcul', formule: 'Q = P tan φ', application: '', resultat: '1' }).detail, 'Formule juste, résultat faux');
  });

  tf('cocher : erreur typique sur une case cochée, verdict des seules cases cochées', () => {
    const q: QCocher = {
      ...base, num: 906, type: 'cocher', options: ['B1V', 'B2V', 'BR'], bonnes: [1],
      erreursTypiques: [{ id: 'b1v', message: 'Un exécutant ne suffit pas.', valeurs: ['B1V'] }],
    };
    const c = corriger(q, { type: 'cocher', choix: [0] });
    assert.deepEqual(c.champs, { 0: false });
    assert.deepEqual(c.erreurs, ['b1v']);
    assert.deepEqual(corriger(q, { type: 'cocher', choix: [1] }).champs, { 1: true });
  });

  console.log(`✓ ${f} groupes de tests des formules dans la correction (équivalence, erreurs typiques, verdicts).`);
}
