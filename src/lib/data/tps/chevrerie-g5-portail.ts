/**
 * TP platine de service · sujet « Chèvrerie », partie G (le portail), question G.5 :
 * schéma de raccordement des périphériques de la motorisation STAR 24.
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `chevrerie`
 * (`src/components/sujet/CablageReel.tsx`). `hidden` : absent du catalogue, jouable par la
 * route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ câblage (corrigé, page 46)
 *  - récepteur GSM : Sortie 1 C → borne 3 (BP1, ouverture totale), Sortie 2 C → borne 5
 *    (BP2, ouverture partielle) ; les contacts NA des deux sorties au commun + 12 V ;
 *  - commun + 12 V (borne 4) → borne 6 (photo 1 « stop ouverture » : le portail n'a pas de
 *    cellules d'ouverture) et → COM de la cellule réceptrice ; OUT → borne 7 (photo 2, stop
 *    fermeture avec renvoi en ouverture) ;
 *  - + des cellules émettrice et réceptrice → borne 15 (+ 12 V TX, alimentation AVEC TEST) ;
 *    − des cellules et borne 4 du flash → borne 17 (0 V) ; borne 16 → borne 3 du flash
 *    (bornes 3-4 : alimentation 12 V, DTR 47) ;
 *  - moteur : borne 20 (−) → fil bleu, borne 21 (+) → fil rouge (tableau du DTR 45).
 * Non dessiné au sujet, donc posé par l'installateur : l'arrivée 230 V~ sur Q1, puis Q2 → boîtier
 * électronique STAR 24 (carte AKIA PU2M) et Q3 → alimentation L N du récepteur GSM.
 *
 * ------------------------------------------------------------ correspondance moteur
 *   · `q1` = Q1, départ du coffret du portail (organe de consignation) ;
 *   · `f2` = Q2, alimentation du boîtier STAR 24 (aval `f2`) ;
 *   · `f3` = Q3, alimentation du récepteur GSM (aval `q1f3`, en parallèle de Q2).
 * Les signaux de la carte (entrées BP1, BP2, sortie flash, moteur) ne sont pas des réseaux que le
 * parcours sait mesurer en fonctionnement : seuls le commun + 12 V (et la photo 2, fermée au repos),
 * le + 12 V « TX » et le 0 V sont déclarés. L'essai (commandes GSM, faisceau coupé) se fait dans le mode
 * câblage réel du sujet (`CablageReelModeles.ts`, modèle G5).
 */
import type { Liaison, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

const LIAISONS: Liaison[] = [
  // ---- installateur : arrivée → Q1 → Q2 (boîtier STAR 24) et Q3 (récepteur GSM) ----
  PRE('RES.L1', 'q1.1', 'L1'), PRE('RES.N', 'q1.N', 'N'),
  PRE('q1.2', 'f2.1', 'L1'), PRE('q1.N2', 'f2.N', 'N'),
  PRE('q1.2', 'f3.1', 'L1'), PRE('q1.N2', 'f3.N', 'N'),
  PRE('f2.2', 'car.L', 'L1'), PRE('f2.N2', 'car.N', 'N'),
  PRE('f3.2', 'gsm.L', 'L1'), PRE('f3.N2', 'gsm.N', 'N'),
  // ---- récepteur GSM : sorties vers les entrées de commande BP1 et BP2 ----
  L('gsm.C1', 'car.3', 'DC-'), L('gsm.C2', 'car.5', 'DC-'),
  L('gsm.NA1', 'gsm.NA2', 'DC+'), L('gsm.NA1', 'rx.COM', 'DC+'),
  // ---- commun + 12 V : photo 1 pontée, contact de la cellule réceptrice ----
  L('car.4', 'car.6', 'DC+'), L('car.4', 'rx.COM', 'DC+'), L('car.7', 'rx.OUT', 'DC+'),
  // ---- alimentation des cellules avec test (15) et 0 V (17) ----
  L('car.15', 'tx.2', 'DC+'), L('tx.2', 'rx.+', 'DC+'),
  L('car.17', 'tx.1', 'DC-'), L('tx.1', 'rx.−', 'DC-'),
  // ---- lampe flash : bornes 3 (+) et 4 (0 V), alimentation 12 V ----
  L('car.17', 'h1.4', 'DC-'), L('car.16', 'h1.3', 'DC+'),
  // ---- moteur 1 : 20 (−) fil bleu, 21 (+) fil rouge ----
  L('car.20', 'mot.bleu', 'DC-'), L('car.21', 'mot.rouge', 'DC+'),
];

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live'], u?: number) => {
    for (const id of ids) n[id] = { net, live, ...(u != null ? { u } : {}) };
  };
  // Q1 (`q1`)
  set(['q1.1'], 'L1', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2', 'f2.1', 'f3.1'], 'L1', 'q1'); set(['q1.N2', 'f2.N', 'f3.N'], 'N', 'q1');
  // Q2 (`f2`) → boîtier STAR 24
  set(['f2.2', 'car.L'], 'L1', 'f2'); set(['f2.N2', 'car.N'], 'N', 'f2');
  // Q3 (`f3`) → récepteur GSM
  set(['f3.2', 'gsm.L'], 'L1', 'q1f3'); set(['f3.N2', 'gsm.N'], 'N', 'q1f3');
  // Très basse tension de la carte : commun + 12 V (4, 8, 14), + 12 V TX (15), 0 V (13, 17, 19)
  set(['car.4', 'car.8', 'car.14', 'car.6', 'gsm.NA1', 'gsm.NA2', 'rx.COM'], 'DC+', 'f2', 12);
  // retour de la cellule (photo 2) : au + 12 V tant que le faisceau est reçu
  set(['car.7', 'rx.OUT'], 'DC+', 'f2', 12);
  set(['car.15', 'tx.2', 'rx.+'], 'DC+', 'f2', 12);
  set(['car.13', 'car.17', 'car.19', 'tx.1', 'rx.−', 'h1.4'], 'DC-', 'f2', 12);
  return n;
}

export const TP_CHEVRERIE_G5_PORTAIL: TpDefinition = {
  id: 'chevrerie-g5-portail',
  title: 'Chèvrerie · Périphériques de la motorisation du portail (câblage réel)',
  level: 'Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  hidden: true,
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  arriveeMono: true,
  uContinu: 12,
  summary:
    'Sujet Chèvrerie, partie G : portail à un vantail motorisé par le kit STAR 24 (motoréducteur à roue '
    + '24 V⎓). Raccorder sur la carte de gestion AKIA PU2M le moteur, les deux cellules photoélectriques '
    + '(alimentation avec test), la lampe flash en 12 V et les deux sorties du récepteur GSM (ouverture '
    + 'totale, ouverture partielle). Câbler le schéma, mettre sous tension, essayer les commandes.',
  situation:
    'Le portail agricole, à l’entrée du site, est motorisé par un kit STAR 24 dont le boîtier électronique '
    + 'est fixé sur le mur du hangar, à côté du portail. Le propriétaire veut l’ouvrir par appel téléphonique : '
    + 'un récepteur GSM à deux sorties commande l’ouverture totale et l’ouverture partielle (passage piéton). '
    + 'Deux cellules photoélectriques protègent la fermeture ; une lampe flash signale le mouvement. Le '
    + 'portail n’est pas équipé de cellules de sécurité d’ouverture : la borne 6 est raccordée au + 12 V. '
    + 'Compléter le schéma de raccordement de l’ensemble des périphériques : ici, il se câble sur la platine.',
  plaqueTitre: 'MOTORISATION DE PORTAIL · STAR 24',
  plaque: {
    'Motorisation': 'Akia Star 24 · motoréducteur 24 V⎓ à roue · 300 W max · batteries de secours 2 × 12 V 2,3 Ah',
    'Carte': 'AKIA PU2M · commun + 12 V : 4, 8 · + 12 V TX (test) : 15 · flash : 16 · 0 V : 13, 17, 19 · moteur 1 : 20 −, 21 +',
    'Cellules': 'EMA-15L · 12 à 24 V AC/DC · RX 15 mA, TX 30 mA · 15 m · relais 1 A 36 V NO/NC',
    'Flash': 'FEBO-LIGHT · 12 V (bornes 3-4), 24 V (3-5), 230 V~ (1-2) · fixe ou clignotant (JP1)',
    'Commande GSM': 'GSM800 · 230 V~ · 2 sorties relais NC C NA · 10 A',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: 'depuis le TGBT sur Q1, puis Q2 (boîtier STAR 24) et Q3 (récepteur GSM), pré-câblée' },
    { k: 'Moteur', v: 'moteur 1 sur 20 (−, fil bleu) et 21 (+, fil rouge), ouverture vers l’intérieur' },
    { k: 'Cellules', v: 'protègent la fermeture : contact de la cellule réceptrice entre le commun + 12 V (borne 4) et la photo 2 (borne 7) ; + des deux cellules sur la borne 15 (alimentation avec test), − sur le 0 V' },
    { k: 'Photo 1', v: 'pas de cellules d’ouverture : borne 6 raccordée au + 12 V' },
    { k: 'Flash', v: 'alimenté en 12 V par la borne 16 (+) et le 0 V, sur ses bornes 3 et 4 ; cavalier JP1 en mode clignotant' },
    { k: 'GSM', v: 'Sortie 1 → BP1 (borne 3, ouverture totale), Sortie 2 → BP2 (borne 5, ouverture partielle), contacts à fermeture (NA) au commun + 12 V' },
    { k: 'Couleurs du schéma', v: '+ en rouge, − en noir de préférence (très basse tension : couleurs non notées)' },
  ],
  libelles: {
    rangees: ['goulotte 1', 'goulotte 2'],
    recv: 'Portail : cellules réceptrice et émettrice, lampe flash et motoréducteur dans la colonne de droite',
  },
  schemaImage: {
    src: '/tp/chevrerie/q-g5-schema.jpg',
    legende: 'G.5 · schéma de raccordement des périphériques du portail (à compléter, page du sujet)',
  },
  postes: [
    {
      id: 'car', name: 'A1 · Carte de gestion de la motorisation', need: 'Motoréducteur 24 V⎓ du kit STAR 24, entrées BP1 / BP2, photo 1 / photo 2, sortie flash',
      options: [
        { key: 'akiapu2m', ref: 'AKIA PU2M (boîtier STAR 24)', spec: 'moteurs 24 V⎓ · commun + 12 V · alimentation des cellules avec test', ok: true, why: 'La carte du kit retenu : ses bornes sont celles du tableau de branchement du DTR 45.' },
        { key: 'akiapu2m', ref: 'Centrale de commande 230 V~ pour moteurs 230 V', spec: 'sorties moteur 230 V~', why: 'Le motoréducteur du kit est en 24 V⎓ : une centrale 230 V~ le détruirait.' },
      ],
    },
    {
      id: 'gsm', name: 'A2 · Récepteur GSM', need: 'Deux commandes par téléphone : ouverture totale et ouverture partielle',
      options: [
        { key: 'gsm800', ref: 'Teleco GSM800', spec: '2 sorties relais NC C NA · 230 V~ · rail DIN 4 modules', ok: true, why: 'Deux sorties : une par entrée de commande (BP1 et BP2).' },
        { key: 'gsm800', ref: 'Teleco GSM700', spec: '1 sortie relais', why: 'Une seule sortie : l’ouverture partielle ne pourrait pas être commandée par téléphone.' },
      ],
    },
    {
      id: 'cel', name: 'RX et TX · Cellules photoélectriques', need: 'Protection de la fermeture, alimentation 12 V avec test, contact sec',
      options: [
        { key: 'celrx', ref: 'EMA-15L (récepteur + émetteur)', spec: '12 à 24 V AC/DC · relais NO/NC · 15 m', ok: true, why: 'Alimentables en 12 V par la carte, contact de relais entre COM et OUT pour l’entrée photo 2.' },
        { key: 'cellule', ref: 'Détecteur reflex 3 fils PNP · XUB1BPANL2', spec: 'sortie transistor PNP 24 V⎓', why: 'Sortie statique en 24 V⎓, pas un contact sec : elle ne se raccorde pas entre le commun + 12 V et la photo 2.' },
      ],
    },
    {
      id: 'fl', name: 'H1 · Lampe flash', need: 'Signalisation du mouvement, alimentée par la sortie flash de la carte (12 V)',
      options: [
        { key: 'febolight', ref: 'Prastel FEBO-LIGHT', spec: '12 / 24 V AC/DC ou 230 V~ · fixe ou clignotante', ok: true, why: 'Alimentable en 12 V (bornes 3-4) ; le cavalier JP1 la fait clignoter.' },
        { key: 'feuorange', ref: 'Feu orange clignotant 24 V · Legrand 0 413 81', spec: '24 V', why: 'Prévu pour 24 V : la sortie flash de la carte ne donne que 12 V.' },
      ],
    },
    {
      id: 'mot', name: 'M1 · Motoréducteur', need: 'Portail d’environ 120 kg, ouverture de 130° au moins',
      options: [
        { key: 'motstar24', ref: 'Motoréducteur à roue 24 V⎓ du kit STAR 24', spec: '24 V⎓ · 300 W max', ok: true, why: 'Le moteur du kit retenu en G.1 : angle et poids sans limite.' },
        { key: 'motstar24', ref: 'Moteur 230 V~ à bras articulé', spec: '230 V~', why: 'Ni la bonne tension ni la bonne cinématique pour ce portail et cette carte.' },
      ],
    },
    {
      id: 'q123', name: 'Q1, Q2 et Q3 · Protections', need: 'Sectionner le coffret, protéger le boîtier STAR 24 et le récepteur GSM',
      options: [
        { key: 'dx3pn', ref: 'DX3 1P+N · 16 A (Q1), 10 A (Q2), 2 A (Q3)', spec: 'phase + neutre · 1 module', ok: true, why: 'Coupure de la phase et du neutre ; calibres adaptés au transformateur du boîtier et au GSM.' },
        { key: 'dx3pn', ref: 'Fusibles 10 A sans neutre', spec: 'coupure de la phase seule', why: 'Ne sectionne pas le neutre : la consignation n’est pas possible.' },
      ],
    },
  ],
  // Coffret du portail. Rail 0 : Q1, Q2, Q3 et le récepteur GSM ; rail 1 : la carte AKIA PU2M
  // (176 px de haut : pas de goulotte de pied, elle y mordrait). Colonne de droite : les organes
  // du portail, de haut en bas cellule réceptrice, cellule émettrice, lampe flash, motoréducteur.
  rails: [150, 360],
  armoire: 660,
  goulotteDePied: false,
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur phase + neutre · départ du coffret du portail (consignation)', key: 'dx3pn', rail: 0, x: 52, rep: 'Q1' },
    { id: 'f2', label: 'Q2 · Disjoncteur phase + neutre · boîtier électronique STAR 24', key: 'dx3pn', rail: 0, x: 96, rep: 'Q2' },
    { id: 'f3', label: 'Q3 · Disjoncteur phase + neutre · récepteur GSM', key: 'dx3pn', rail: 0, x: 130, rep: 'Q3' },
    { id: 'gsm', label: 'A2 · Récepteur GSM 2 sorties · GSM800', key: 'gsm800', rail: 0, x: 190, rep: 'A2' },
    { id: 'car', label: 'A1 · Carte de gestion AKIA PU2M · boîtier électronique STAR 24', key: 'akiapu2m', rail: 1, x: 44, rep: 'A1' },
    // organes du portail (colonne de droite)
    { id: 'rx', label: 'RX · Cellule photoélectrique réceptrice EMA-15L', key: 'celrx', rail: null, x: 441, y: 20, rep: 'RX' },
    { id: 'tx', label: 'TX · Cellule photoélectrique émettrice EMA-15L', key: 'celtx', rail: null, x: 441, y: 150, rep: 'TX' },
    { id: 'h1', label: 'H1 · Lampe flash FEBO-LIGHT · 12 V · clignotante', key: 'febolight', rail: null, x: 435, y: 280, rep: 'H1' },
    { id: 'mot', label: 'M1 · Motoréducteur à roue 24 V⎓ · STAR 24', key: 'motstar24', rail: null, x: 436, y: 545, rep: 'M1' },
  ],
  annexItems: [],
  recvItems: [],
  liaisons: LIAISONS,
  nets: nets(),
  tests: BASE_TESTS.filter(t => t.id !== 'pe'),
  mesures: [
    { id: 'c0V', title: 'Continuité du 0 V des cellules (borne 17 → − de la réceptrice)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'car.17', b: 'rx.−', min: 0, max: 2, unit: 'Ω' },
    { id: 'uCarte', title: 'Tension d’alimentation du boîtier STAR 24', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'car.L', b: 'car.N', min: 220, max: 240, unit: 'V', when: 'ctl' },
    { id: 'uGSM', title: 'Tension d’alimentation du récepteur GSM', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 'gsm.L', b: 'gsm.N', min: 220, max: 240, unit: 'V', when: 'ctl' },
    { id: 'uTX', title: 'Alimentation de la cellule émettrice (+ 12 V TX)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'tx.2', b: 'tx.1', min: 11, max: 13, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'photo2', title: 'Retour de la cellule réceptrice (OUT) non raccordé à la borne 7',
      symptom: 'Le portail s’ouvre sur appel, mais refuse de se refermer : la carte voit la photo 2 coupée en permanence.',
      fix: 'Hors tension, contrôler la continuité entre OUT de la cellule réceptrice et la borne 7 : OL. Reprendre le conducteur.',
      coupe: 'car.7>rx.OUT',
      nets: { 'car.7': { live: 'off' } },
      action: 'Raccorder la sortie OUT de la cellule réceptrice sur la borne 7 (photo 2)',
    },
    {
      id: 'zeroV', title: 'Conducteur 0 V des cellules débranché de la borne 17',
      symptom: 'Les cellules restent éteintes ; le portail s’ouvre mais ne se referme pas, et le flash fonctionne normalement.',
      fix: 'Sous tension, mesurer 12 V⎓ entre 15 et 17 sur la carte, puis 0 V entre les bornes 2 et 1 de l’émettrice : reprendre le conducteur 0 V entre la borne 17 et les cellules.',
      coupe: 'car.17>tx.1',
      nets: { 'tx.1': { live: 'off' }, 'rx.−': { live: 'off' } },
      action: 'Reprendre le conducteur 0 V entre la borne 17 et la cellule émettrice',
    },
  ],
  quiz: [
    { q: 'Pourquoi la borne 6 est-elle reliée au + 12 V ?', options: ['Le portail n’a pas de cellules d’ouverture : l’entrée photo 1 doit rester fermée', 'Pour alimenter la lampe flash', 'Pour commander l’ouverture partielle', 'Pour tester les cellules'], answer: 0 },
    { q: 'Sur quelle borne alimenter les cellules pour qu’elles soient testées avant chaque mouvement ?', options: ['15 (+ 12 V TX)', '14 (+ alimentation permanente)', '16 (flash)', '4 (commun)'], answer: 0 },
    { q: 'Quel contact de la sortie du GSM relie-t-on à l’entrée de commande ?', options: ['C et NA : un contact à fermeture, comme un bouton-poussoir', 'C et NC', 'NA et NC', 'L et N'], answer: 0 },
    { q: 'Que fait la carte si le faisceau est coupé pendant la fermeture ?', options: ['Elle arrête le portail et le rouvre (photo 2 : renvoi en ouverture)', 'Elle accélère la fermeture', 'Rien', 'Elle coupe le flash seulement'], answer: 0 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2'], ['f2.2', 'f2.N2'], ['f3.2', 'f3.N2']],
  },
};
