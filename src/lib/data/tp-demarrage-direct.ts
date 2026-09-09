import type { TpDefinition } from '../types';

/**
 * TP 4 — Démarrage direct un sens de marche.
 * Platine industrielle réaliste : 3 rails DIN, bornier de puissance X1 (arrivée réseau + départ moteur),
 * bornier de commande X2 (liaison vers la boîte à boutons en porte), boîte S1/S2 sur la porte,
 * moteur en dehors de l'armoire.
 *
 * Coordonnées en unités logiques du panneau (PANEL_W × PANEL_H, voir lib/sim/layout.ts).
 */
export const PANEL_W = 540;
export const PANEL_H = 700;

export const TP_DEMARRAGE_DIRECT: TpDefinition = {
  id: 'demarrage-direct',
  title: 'Démarrage direct un sens de marche',
  level: '1re Bac Pro MELEC',
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary: 'Ventilateur d\'extraction 1,5 kW. GV2 + LC1D + LRD, commande 230 V, boîte à boutons en porte, borniers X1 / X2.',
  situation: 'L\'atelier de soudure du lycée est équipé d\'un extracteur d\'air entraîné par un moteur asynchrone triphasé. Tu dois réaliser dans l\'armoire le départ moteur en démarrage direct, un seul sens de marche, avec commande par boîte à boutons marche / arrêt en façade et signalisation marche / défaut, puis le mettre en service.',
  plaque: { 'P': '1,5 kW', 'U': '400 V Y · 50 Hz', 'In': '3,3 A', 'n': '1440 tr/min', 'cos φ': '0,80', 'Pôles': '4', 'Classe': 'F · IP 55', 'Service': 'S1 continu' },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE, arrivée sur bornier X1' },
    { k: 'Commande', v: '230 V~ phase-neutre, protégée par F2' },
    { k: 'Platine', v: '3 rails DIN · porte' },
    { k: 'Rail 1', v: 'Q1 · KM1 · F1' },
    { k: 'Rail 2', v: 'F2 · H1 · H2' },
    { k: 'Rail 3', v: 'X1 bornier puissance · X2 bornier commande' },
    { k: 'Porte', v: 'S1 arrêt NC · S2 marche NO, raccordés sur X2' },
    { k: 'Protection moteur', v: 'GV2 magnéto-thermique + relais thermique classe 10' },
    { k: 'Auto-maintien', v: 'contact KM1 13-14' },
    { k: 'Défaut thermique', v: 'F1 95-96 coupe KM1, F1 97-98 allume H2' },
    { k: 'Avant mise en service', v: 'VAT · continuité PE · isolement 500 V' },
  ],
  postes: [
    { id: 'q1', name: 'Q1 · Disjoncteur moteur', need: 'Protection magnéto-thermique du moteur, réglable autour de In = 3,3 A', options: [
      { key: 'motorcb', ref: 'GV2ME06', spec: '1 – 1,6 A', why: 'Plage trop basse : déclenchera au démarrage.' },
      { key: 'motorcb', ref: 'GV2ME08', spec: '2,5 – 4 A', ok: true, why: 'In = 3,3 A dans la plage 2,5 – 4 A.' },
      { key: 'motorcb', ref: 'GV2ME14', spec: '6 – 10 A', why: 'Plage trop haute : ne protège pas le moteur.' } ] },
    { id: 'km1', name: 'KM1 · Contacteur', need: 'Commande de puissance, bobine sous la tension de commande', options: [
      { key: 'kontakt', ref: 'LC1D09B7', spec: '9 A AC-3 · bobine 24 V~', why: 'Bobine 24 V alors que la commande est en 230 V.' },
      { key: 'kontakt', ref: 'LC1D09P7', spec: '9 A AC-3 · bobine 230 V~', ok: true, why: '9 A ≥ 3,3 A, bobine 230 V comme la commande.' },
      { key: 'kontakt', ref: 'LC1D32P7', spec: '32 A AC-3 · bobine 230 V~', half: true, why: 'Fonctionne mais surdimensionné : coût et encombrement.' } ] },
    { id: 'f1', name: 'F1 · Relais thermique', need: 'Protection contre les surcharges, réglé à In', options: [
      { key: 'therm', ref: 'LRD06', spec: '1 – 1,6 A', why: 'Plage trop basse.' },
      { key: 'therm', ref: 'LRD08', spec: '2,5 – 4 A', ok: true, why: '3,3 A réglable dans la plage.' },
      { key: 'therm', ref: 'LRD12', spec: '5,5 – 8 A', why: 'Réglage minimal 5,5 A > In : ne protège pas.' } ] },
    { id: 'f2', name: 'F2 · Protection commande', need: 'Protection du circuit de commande 230 V (bobine + voyants ≈ 0,1 A)', options: [
      { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · courbe C', ok: true, why: 'Calibre adapté à un circuit de commande.' },
      { key: 'mcb1p', ref: 'iC60N 1P C16', spec: '16 A · courbe C', why: 'Trop élevé pour des conducteurs 1,5 mm² de commande.' },
      { key: 'mcb1p', ref: 'iC60N 1P C32', spec: '32 A · courbe C', why: 'Sans rapport avec le circuit de commande.' } ] },
    { id: 'h', name: 'H1 / H2 · Voyants', need: 'Signalisation marche (vert) et défaut thermique (rouge)', options: [
      { key: 'lampG', ref: 'Voyants 24 V', spec: 'vert + rouge · 24 V', why: 'Tension de commande 230 V : ils grilleront.' },
      { key: 'lampG', ref: 'Voyants 230 V', spec: 'vert + rouge · 230 V', ok: true, why: 'Bonne tension, bonnes couleurs (NF EN 60073).' },
      { key: 'lampR', ref: 'Voyants 230 V', spec: 'rouge = marche, vert = défaut', why: 'Vert = marche, rouge = défaut.' } ] },
    { id: 'x', name: 'X1 / X2 · Borniers', need: 'X1 : arrivée réseau et départ moteur (2,5 mm²) ; X2 : liaison commande vers la porte (1,5 mm²)', options: [
      { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE', spec: 'bornes 2,5 mm² · PE vert-jaune · X2 en 2,5', ok: true, why: 'Sections et repérage PE conformes ; X2 en 2,5 mm² accepte le 1,5.' },
      { key: 'termgrey', ref: 'UT 1,5 partout', spec: 'bornes 1,5 mm²', why: 'Puissance en 2,5 mm² : les bornes 1,5 ne conviennent pas pour X1.' },
      { key: 'termgrey', ref: 'Dominos', spec: 'connecteurs à vis', why: 'Interdit en armoire industrielle : bornes sur rail obligatoires.' } ] },
    { id: 'box', name: 'S1 / S2 · Boîte à boutons', need: 'Arrêt à contact NC, marche à contact NO', options: [
      { key: 'stopstart', ref: 'XALD213', spec: 'S1 arrêt NC · S2 marche NO', ok: true, why: 'Arrêt NC : sécurité positive, marche NO.' },
      { key: 'stopstart', ref: 'XALD211', spec: '2 × NO', why: 'Arrêt NO : la coupure d\'un fil n\'arrête plus le moteur.' },
      { key: 'stopstart', ref: 'XALK178', spec: 'arrêt d\'urgence seul', why: 'Pas de bouton marche.' } ] },
  ],
  rails: [140, 335, 525],
  slots: [
    { id: 'q1', label: 'Q1 · Disj. moteur', key: 'motorcb', rail: 0, x: 26 },
    { id: 'km1', label: 'KM1 · Contacteur', key: 'kontakt', rail: 0, x: 84 },
    { id: 'f1', label: 'F1 · Thermique', key: 'therm', rail: 0, x: 150 },
    { id: 'f2', label: 'F2 · Cde', key: 'mcb1p', rail: 1, x: 26 },
    { id: 'h1', label: 'H1 · Marche', key: 'lampG', rail: 1, x: 66 },
    { id: 'h2', label: 'H2 · Défaut', key: 'lampR', rail: 1, x: 106 },
    // X1 — bornier puissance : arrivée réseau (1-5) puis départ moteur (6-9)
    { id: 'x1_1', label: 'X1:1 L1', key: 'termred', rail: 2, x: 26, mark: '1', sub: 'L1', group: 'X1', groupLabel: 'X1 · bornier puissance' },
    { id: 'x1_2', label: 'X1:2 L2', key: 'termred', rail: 2, x: 54, mark: '2', sub: 'L2', group: 'X1' },
    { id: 'x1_3', label: 'X1:3 L3', key: 'termred', rail: 2, x: 82, mark: '3', sub: 'L3', group: 'X1' },
    { id: 'x1_4', label: 'X1:4 N', key: 'termblue', rail: 2, x: 110, mark: '4', sub: 'N', group: 'X1' },
    { id: 'x1_5', label: 'X1:5 PE', key: 'earth', rail: 2, x: 138, mark: '5', sub: 'PE', group: 'X1' },
    { id: 'x1_6', label: 'X1:6 U', key: 'termred', rail: 2, x: 178, mark: '6', sub: 'U', group: 'X1' },
    { id: 'x1_7', label: 'X1:7 V', key: 'termred', rail: 2, x: 206, mark: '7', sub: 'V', group: 'X1' },
    { id: 'x1_8', label: 'X1:8 W', key: 'termred', rail: 2, x: 234, mark: '8', sub: 'W', group: 'X1' },
    { id: 'x1_9', label: 'X1:9 PE', key: 'earth', rail: 2, x: 262, mark: '9', sub: 'PE', group: 'X1' },
    // X2 — bornier commande vers la porte
    { id: 'x2_1', label: 'X2:1', key: 'termgrey', rail: 2, x: 296, mark: '1', group: 'X2', groupLabel: 'X2 · commande' },
    { id: 'x2_2', label: 'X2:2', key: 'termgrey', rail: 2, x: 324, mark: '2', group: 'X2' },
    { id: 'x2_3', label: 'X2:3', key: 'termgrey', rail: 2, x: 352, mark: '3', group: 'X2' },
    // Porte
    { id: 'box', label: 'S1 / S2 · Boîte à boutons', key: 'stopstart', rail: null, x: 440, y: 150 },
  ],
  liaisons: [
    // Arrivée réseau (câblage installateur, déjà fait) et départ moteur
    { a: 'RES.L1', b: 'x1_1.b', net: 'L1', prewired: true }, { a: 'RES.L2', b: 'x1_2.b', net: 'L2', prewired: true }, { a: 'RES.L3', b: 'x1_3.b', net: 'L3', prewired: true },
    { a: 'RES.N', b: 'x1_4.b', net: 'N', prewired: true }, { a: 'RES.PE', b: 'x1_5.b', net: 'PE', prewired: true },
    { a: 'x1_6.b', b: 'M.U1', net: 'L1', prewired: true }, { a: 'x1_7.b', b: 'M.V1', net: 'L2', prewired: true }, { a: 'x1_8.b', b: 'M.W1', net: 'L3', prewired: true }, { a: 'x1_9.b', b: 'M.PE', net: 'PE', prewired: true },
    // Puissance
    { a: 'x1_1.a', b: 'q1.1', net: 'L1' }, { a: 'x1_2.a', b: 'q1.3', net: 'L2' }, { a: 'x1_3.a', b: 'q1.5', net: 'L3' },
    { a: 'q1.2', b: 'km1.1', net: 'L1' }, { a: 'q1.4', b: 'km1.3', net: 'L2' }, { a: 'q1.6', b: 'km1.5', net: 'L3' },
    { a: 'km1.2', b: 'f1.1', net: 'L1' }, { a: 'km1.4', b: 'f1.3', net: 'L2' }, { a: 'km1.6', b: 'f1.5', net: 'L3' },
    { a: 'f1.2', b: 'x1_6.a', net: 'L1' }, { a: 'f1.4', b: 'x1_7.a', net: 'L2' }, { a: 'f1.6', b: 'x1_8.a', net: 'L3' },
    { a: 'x1_5.a', b: 'x1_9.a', net: 'PE' },
    // Commande
    { a: 'q1.2', b: 'f2.1', net: 'C' }, { a: 'f2.2', b: 'f1.95', net: 'C' }, { a: 'f1.96', b: 'x2_1.a', net: 'C' },
    { a: 'x2_1.b', b: 'S1.21', net: 'C' }, { a: 'S1.22', b: 'S2.13', net: 'C' }, { a: 'S1.22', b: 'x2_2.b', net: 'C' }, { a: 'S2.14', b: 'x2_3.b', net: 'C' },
    { a: 'x2_2.a', b: 'km1.13', net: 'C' }, { a: 'x2_3.a', b: 'km1.A1', net: 'C' }, { a: 'km1.14', b: 'km1.A1', net: 'C' },
    { a: 'km1.A2', b: 'x1_4.a', net: 'N' },
    { a: 'km1.14', b: 'h1.X1', net: 'C' }, { a: 'h1.X2', b: 'x1_4.a', net: 'N' },
    { a: 'f2.2', b: 'f1.97', net: 'C' }, { a: 'f1.98', b: 'h2.X1', net: 'C' }, { a: 'h2.X2', b: 'x1_4.a', net: 'N' },
  ],
  tests: [
    { id: 'vat', title: 'VAT · vérification d\'absence de tension', how: 'Multimètre V~ sur X1:1-2 puis aval Q1 : le réseau est consigné (Q amont cadenassé).', expected: '0 V · 0 V' },
    { id: 'visu', title: 'Contrôle visuel', how: 'Serrage des bornes, repérage des conducteurs, sections 2,5 mm² puissance / 1,5 mm² commande, PE vert-jaune.', expected: 'conforme' },
    { id: 'pe', title: 'Continuité PE moteur', how: 'Contrôleur 200 mA entre X1:5 et la carcasse du moteur.', expected: '0,31 Ω' },
    { id: 'iso', title: 'Isolement 500 V', how: 'Contrôleur entre chaque phase (X1:6-7-8) et PE, moteur raccordé.', expected: '> 999 MΩ' },
    { id: 'cont', title: 'Continuité du circuit de commande', how: 'Ω entre F2:2 et KM1:A1, S2 appuyé : le chemin passe par F1 95-96, X2, S1 et S2.', expected: '1 180 Ω (bobine)' },
  ],
  measurePoints: [
    { id: 'l1', label: 'Pince · L1 aval F1', instrument: 'clamp' }, { id: 'l2', label: 'Pince · L2 aval F1', instrument: 'clamp' }, { id: 'l3', label: 'Pince · L3 aval F1', instrument: 'clamp' },
    { id: 'uamont', label: 'V~ · X1:1 – X1:2 (amont Q1)', instrument: 'dmm' }, { id: 'ul', label: 'V~ · X1:6 – X1:7 (moteur)', instrument: 'dmm' },
    { id: 'ua', label: 'V~ · KM1 A1 – A2', instrument: 'dmm' }, { id: 'u9596', label: 'V~ · F1 95 – 96', instrument: 'dmm' }, { id: 'us1', label: 'V~ · X2:1 – X2:2 (S1)', instrument: 'dmm' }, { id: 'us2', label: 'V~ · X2:2 – X2:3 (S2)', instrument: 'dmm' },
    { id: 'arbre', label: 'Tachymètre · bout d\'arbre', instrument: 'tacho' },
  ],
  expected: [
    { id: 'uamont', title: 'U amont Q1 ≈ 400 V', point: 'uamont', min: 360, max: 440, unit: 'V', stage: 'service' },
    { id: 'ua', title: 'U bobine A1-A2 ≈ 230 V en marche', point: 'ua', min: 207, max: 253, unit: 'V', stage: 'service' },
    { id: 'i', title: 'I ligne ≈ 2,8 A à 80 % de charge', point: 'l1', min: 1.5, max: 4.5, unit: 'A', stage: 'service' },
    { id: 'n', title: 'n ≈ 1440 tr/min', point: 'arbre', min: 1350, max: 1500, unit: 'tr/min', stage: 'service' },
  ],
  faults: [
    { id: 'a2', title: 'Fil A2 de la bobine KM1 desserré', symptom: 'KM1 vibre et ne tient pas quand on appuie sur S2.', fix: 'Resserrer A2 et refaire la continuité A2 – X1:4.' },
    { id: 's1', title: 'Contact NC de S1 (21-22) resté ouvert', symptom: 'Rien ne se passe à l\'appui sur S2.', fix: 'Remplacer le bloc contact de S1.' },
    { id: 'l2', title: 'Phase L2 coupée entre F1 et X1:7', symptom: 'Le moteur ronfle, tourne mal, I anormal sur L1 et L3, F1 finit par déclencher.', fix: 'Refaire la liaison F1:4 → X1:7 et réarmer F1.' },
    { id: 'x2', title: 'Fil X2:3 → KM1 A1 débranché', symptom: 'Rien ne se passe à l\'appui sur S2, mais 230 V présent sur X2:3.', fix: 'Reconnecter X2:3 sur A1.' },
  ],
  quiz: [
    { q: 'Quel contact assure l\'auto-maintien après relâchement de S2 ?', options: ['F1 95-96', 'KM1 13-14', 'S1 21-22'], answer: 1 },
    { q: 'Pourquoi le bouton d\'arrêt S1 est-il à contact NC ?', options: ['Pour économiser un fil', 'Pour qu\'une coupure de fil provoque l\'arrêt (sécurité positive)', 'Parce que le contacteur l\'impose'], answer: 1 },
  ],
  motor: { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 },
};

/** Fixed external points (réseau, moteur) in panel coordinates. */
export const EXTERNAL_POINTS: Record<string, { x: number; y: number; label: string }> = {
  'RES.L1': { x: 39, y: 680, label: 'L1' }, 'RES.L2': { x: 67, y: 680, label: 'L2' }, 'RES.L3': { x: 95, y: 680, label: 'L3' }, 'RES.N': { x: 123, y: 680, label: 'N' }, 'RES.PE': { x: 151, y: 680, label: 'PE' },
  'M.U1': { x: 441, y: 494, label: 'U1' }, 'M.V1': { x: 455, y: 494, label: 'V1' }, 'M.W1': { x: 469, y: 494, label: 'W1' }, 'M.PE': { x: 411, y: 588, label: 'PE' },
};
export const MOTOR_BOX = { x: 385, y: 470, w: 150, h: 150 };

export const TPS: TpDefinition[] = [TP_DEMARRAGE_DIRECT];
