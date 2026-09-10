/**
 * TP · Installation photovoltaïque avec stockage (UTE C 15-712-1 et 15-712-2).
 *
 * Champ : 1 string de 6 modules 250 Wc (Voc 38 V · Isc 8,8 A · k = −0,32 %/°C),
 * soit Uoc = 228 V (253 V corrigés à −10 °C). Régulateur MPPT 450/100, parc de
 * batteries LiFePO₄ 24 V (2 × 12,8 V · 200 Ah = 5,1 kWh) avec son sectionneur dédié,
 * onduleur-chargeur 24 V / 3 kVA, un départ continu 24 V et un départ alternatif 230 V.
 *
 * ----------------------------------------------------------------------------------
 * Adaptation du moteur de simulation (conçu pour une platine industrielle 400 V) :
 *  - identifiants de slots imposés : `q1` = interrupteur-sectionneur DC du champ
 *    (organe de séparation et de condamnation), `f2` = sectionneur-fusible de batterie Q3,
 *    `f3` = différentiel DDR1 du départ alternatif ; `km1` est remplacé par le relais de
 *    couplage interne de l'onduleur-chargeur (S2 = marche, S1 = arrêt en porte) ;
 *  - `f1` est le porte-fusibles du string : ce préfixe est le seul, avec `q1` / `x1_1..3`,
 *    que la pince ampèremétrique du moteur reconnaît (`clampCurrent`, `src/lib/sim/mesures.ts`) ;
 *  - pannes injectables limitées à `a2 / s1 / l2 / x2 / f3` : `x2`, `a2` et `s1` sont
 *    exploitées avec un scénario de stockage plausible.
 *
 * Limites connues du moteur, contournées ici et signalées à l'élève :
 *  - la table `nets` ne connaît pas le continu : les potentiels du champ sont déclarés en
 *    `V` / `C0` (230 V, cohérents avec l'Uoc de 228 V) et le bus batterie en `C` / `C0`
 *    (24 V, tension nominale du parc) ;
 *  - la position V⎓ du multimètre et le calibre A⎓ de la pince ne sont pas instrumentés :
 *    les grandeurs continues se relèvent sur V~ et A~ ;
 *  - aucun symbole de régulateur MPPT au catalogue : U1 est représenté par un appareil
 *    continu à quatre bornes (1+ / 3− côté champ, 2+ / 4− côté batterie).
 */
import type { AnnexItem, Slot, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/* --------------------------------------------------------------------- borniers */

/** Bornier X1 (alternatif) : bornes étroites au pas de 18 px sur le dernier rail. */
function bornierAC(x0: number, rows: [string, string, string][], rail = 2): Slot[] {
  return rows.map(([key, mark, sub], i) => ({
    id: `x1_${i + 1}`,
    label: `X1:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18,
    mark,
    sub,
    group: 'X1',
    ...(i === 0 ? { groupLabel: 'X1 · alternatif' } : {}),
  }));
}

/** Bornier X2 (continu) : champ photovoltaïque, départ continu 24 V et terre. */
function bornierDC(x0: number, rows: [string, string, string][], rail = 2): Slot[] {
  return rows.map(([key, mark, sub], i) => ({
    id: `x2_${i + 1}`,
    label: `X2:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18,
    mark,
    sub,
    group: 'X2',
    ...(i === 0 ? { groupLabel: 'X2 · continu' } : {}),
  }));
}

/* --------------------------------------------------------------------- toiture */

const module_ = (n: number, x: number, y: number): AnnexItem => ({
  key: 'pvpanel', rep: `PV${n}`, name: 'module 250 Wc polycristallin', x, y, w: 40, h: 44,
});

/** Toiture : un string de 6 modules et la barrette de terre des cadres. */
const ROOF: AnnexItem[] = [
  ...[0, 1, 2, 3, 4, 5].map((i) => module_(i + 1, 466, 300 + i * 52)),
  { key: 'l_borniers_wago_x2', rep: 'MT', name: 'barrette de mise à la terre des cadres', x: 466, y: 624, w: 30, h: 26 },
];

/** Récepteurs : un départ continu 24 V et un départ alternatif 230 V. */
const RECV: AnnexItem[] = [
  { key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'éclairage LED 24 V continu', x: 60, y: 34, w: 60, h: 60, recv: true },
  { key: 'l_recepteu_convecteur', rep: 'R1', name: 'charges 230 V du logement', x: 200, y: 50, w: 150, h: 70, recv: true },
];

/* ----------------------------------------------------------- potentiels du champ */

function stringNets(first: number, last: number): Record<string, TerminalNet> {
  const out: Record<string, TerminalNet> = {};
  for (let i = first; i <= last; i++) {
    out[`PV${i}.X1`] = { net: 'V', live: 'always' };
    out[`PV${i}.X2`] = i === last ? { net: 'C0', live: 'always' } : { net: 'V', live: 'always' };
  }
  return out;
}

export const TP_PV_BATTERIE: TpDefinition = {
  id: 'pv-batterie',
  title: 'Autoconsommation photovoltaïque avec batterie',
  level: 'BTS Électrotechnique / CS TER',
  family: 'pv',
  scene: 'pv',
  annex: 'roof',
  playable: true,
  station: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'String de 6 modules 250 Wc (Uoc 228 V), régulateur MPPT 450/100, parc LiFePO₄ 24 V · 5,1 kWh avec sectionneur-fusible dédié, onduleur-chargeur 24 V / 3 kVA, départ continu 24 V et départ alternatif 230 V protégé par un différentiel 30 mA type A.',
  situation:
    'Un local technique isolé du réseau une bonne partie de la journée doit être équipé d\'une production photovoltaïque avec stockage. Tu câbles le coffret continu du champ, le régulateur MPPT, le parc de batteries et son organe de coupure, l\'onduleur-chargeur, puis les deux départs : l\'éclairage 24 V continu et les prises 230 V. Attention : contrairement au champ, que le sectionneur Q1 met hors tension, la batterie ne peut jamais être mise hors tension — c\'est le point dur de la consignation.',
  plaque: {
    Champ: '6 × 250 Wc = 1,5 kWc',
    Voc: '38,0 V par module · 228 V pour le string',
    'Voc à −10 °C': '253 V (k = −0,32 %/°C)',
    Isc: '8,8 A',
    Régulateur: 'MPPT 450/100 · 450 V PV max · 100 A de charge',
    Batterie: 'LiFePO₄ 24 V · 200 Ah · 5,1 kWh · BMS CAN',
    'Onduleur-chargeur': '24 V / 3 kVA · I ≈ 136 A côté batterie',
    Régime: 'TT · UTE C 15-712-2',
  },
  cahierDesCharges: [
    { k: 'Champ', v: 'string de 6 modules 250 Wc, câble solaire 6 mm², F1 porte-fusibles gPV et F2 parafoudre DC type 2' },
    { k: 'Calibre du fusible', v: '1,25 × Isc ≤ In ≤ 2,4 × Isc, soit 11 A ≤ In ≤ 21 A pour Isc = 8,8 A → gPV 15 A' },
    { k: 'Tension maximale', v: 'Voc corrigée à −10 °C = 228 × (1 + 0,0032 × 35) = 253 V, à comparer à la tension PV maximale du régulateur' },
    { k: 'Régulateur', v: 'U1, MPPT, entrée champ sur 1+ / 3−, sortie parc sur 2+ / 4−' },
    { k: 'Batterie', v: 'B1, parc LiFePO₄ 24 V 200 Ah, câbles souples 50 mm² de moins de 2 m, BMS communiquant' },
    { k: 'Coupure batterie', v: 'Q3 sectionneur-fusible au plus près du parc : I = 3000 / (24 × 0,92) ≈ 136 A → fusible 160 A' },
    { k: 'Onduleur-chargeur', v: 'U2, 24 V / 3 kVA, entrée batterie et port alternatif réseau / charges' },
    { k: 'Départ continu', v: 'Q4 disjoncteur bipolaire 16 A pour l\'éclairage 24 V, les deux polarités coupées' },
    { k: 'Départ alternatif', v: 'DDR1 différentiel 30 mA type A et Q2 disjoncteur 16 A courbe C' },
    { k: 'Rail 1', v: 'coffret continu du champ : F1 · Q1 · F2 · U1' },
    { k: 'Rail 2', v: 'stockage et conversion : B1 · Q3 · U2' },
    { k: 'Rail 3', v: 'DDR1 · Q2 · Q4 · X2 bornier continu (5 bornes) · X1 bornier alternatif (5 bornes)' },
    { k: 'Porte', v: 'S2 marche de l\'onduleur-chargeur · S1 arrêt · H1 en service · H2 défaut' },
    { k: 'Mise en service', v: 'fermer Q1 (champ), puis Q3 (batterie), puis DDR1 et Q2 ; à l\'arrêt, l\'ordre inverse' },
    { k: 'Sécurité', v: 'la batterie reste sous tension en permanence : écran facial, outils isolés, aucune boucle métallique au poignet' },
    { k: 'Simulateur', v: 'la position V⎓ du multimètre et le calibre A⎓ de la pince ne sont pas instrumentés : les grandeurs continues se relèvent sur V~ et A~ ; les dessins génériques du catalogue portent d\'autres inscriptions (B1 « 48 V », U1 et U2 « sectionneur » et « onduleur string ») : ce sont bien le parc 24 V, le régulateur MPPT et l\'onduleur-chargeur du cahier des charges' },
  ],
  postes: [
    {
      id: 'mppt',
      name: 'U1 · Régulateur de charge',
      need: 'Charger un parc 24 V à partir d\'un string dont la Voc atteint 253 V à froid',
      options: [
        { key: 'smart', ref: 'MPPT 250/60', spec: '250 V PV max · 60 A', why: 'La Voc corrigée à −10 °C vaut 253 V : elle dépasse les 250 V admis, l\'étage d\'entrée serait détruit.' },
        { key: 'smart', ref: 'MPPT 450/100', spec: '450 V PV max · 100 A · parcs 12 / 24 / 48 V', ok: true, why: '253 V à froid restent largement sous les 450 V admis, et 100 A de charge couvrent les 1,5 kWc du champ sur un parc 24 V.' },
        { key: 'meter', ref: 'Régulateur PWM 30 A', spec: '50 V PV max', why: 'Un régulateur PWM impose une tension de champ voisine de celle du parc : un string de 228 V lui est fatal, et il n\'exploite pas le point de puissance maximale.' },
      ],
    },
    {
      id: 'bat',
      name: 'B1 · Parc de batteries',
      need: 'Stocker environ 5 kWh sous 24 V, avec un BMS dialoguant avec l\'onduleur',
      options: [
        { key: 'trafo', ref: '2 × LiFePO₄ 12,8 V · 200 Ah', spec: '24 V · 5,1 kWh · BMS CAN', ok: true, why: 'Chimie stable, 80 % de profondeur de décharge, aucun dégagement d\'hydrogène et un BMS qui communique les seuils à l\'onduleur.' },
        { key: 'trafo', ref: 'Plomb ouvert 24 V · 200 Ah', spec: 'plomb ouvert', why: 'Dégagement d\'hydrogène imposant une ventilation permanente, entretien du niveau d\'électrolyte et 50 % de décharge utile seulement.' },
        { key: 'trafo', ref: 'LiFePO₄ 51,2 V · 100 Ah', spec: '48 V · 5,1 kWh', why: 'Bonne énergie mais mauvaise tension : le régulateur et l\'onduleur-chargeur sont configurés pour un parc 24 V.' },
      ],
    },
    {
      id: 'fus',
      name: 'F1 · Fusible du string',
      need: 'Protéger le câble du champ (Isc = 8,8 A) contre les défauts venant du parc',
      options: [
        { key: 'mcb2p', ref: 'Porte-fusible gPV 10 A', spec: '10 A', why: 'Calibre inférieur à 1,25 × Isc : le fusible fondra par fort ensoleillement alors que l\'installation est saine.' },
        { key: 'mcb1p', ref: 'Fusible gG 25 A · 500 V AC', spec: 'cartouche alternative', why: 'Une cartouche alternative n\'éteint pas un arc continu, et 25 A dépasse 2,4 × Isc.' },
        { key: 'mcb2p', ref: 'Porte-fusible gPV 15 A · 1000 V DC', spec: '10 × 38 gPV, une polarité par fusible', ok: true, why: '1,25 × 8,8 = 11 A ≤ 15 A ≤ 2,4 × 8,8 = 21 A, et 15 A reste sous les 44 A admissibles par le 6 mm².' },
      ],
    },
    {
      id: 'qb',
      name: 'Q3 · Coupure de la batterie',
      need: 'Isoler le parc de l\'onduleur-chargeur, au plus près des bornes (I ≈ 136 A)',
      options: [
        { key: 'steck2p', ref: 'Aucun organe de coupure', spec: '—', why: 'Interdit : sans coupure au plus près, aucune intervention n\'est possible sur l\'installation continue.' },
        { key: 'steck2p', ref: 'Sectionneur DC 160 A + fusible gG 160 A', spec: 'coupure en charge, à moins de 2 m du parc', ok: true, why: 'Calibré au-dessus des 136 A appelés par l\'onduleur, il permet d\'isoler la seule source qu\'on ne peut pas mettre hors tension autrement.' },
        { key: 'mcb1p', ref: 'Sectionneur DC 16 A', spec: '16 A', why: 'Très largement sous-calibré : il fondrait au premier appel de puissance de l\'onduleur.' },
      ],
    },
    {
      id: 'cab',
      name: 'Câbles de batterie',
      need: 'Relier le parc à l\'onduleur-chargeur pour 136 A sur moins de 2 m',
      options: [
        { key: 'termred', ref: 'Câble souple 50 mm² à cosses serties', spec: '50 mm² · Iz = 168 A', ok: true, why: '168 A admissibles pour 136 A appelés, et une chute de tension acceptable sur un bus 24 V, très sensible aux pertes.' },
        { key: 'termred', ref: 'Câble souple 70 mm²', spec: '70 mm² · Iz = 213 A', half: true, why: 'Fonctionne, mais coût, rayon de courbure et cosses inutilement surdimensionnés.' },
        { key: 'termblue', ref: 'Câble souple 16 mm²', spec: '16 mm² · Iz = 82 A', why: 'Courant admissible inférieur au courant appelé : échauffement, chute de tension et coupure de l\'onduleur en sous-tension.' },
      ],
    },
    {
      id: 'spd',
      name: 'F2 · Parafoudre continu',
      need: 'Protéger le régulateur des surtensions venant du champ en toiture',
      options: [
        { key: 'mcb1p', ref: 'Parafoudre DC type 3', spec: 'type 3', why: 'Le type 3 ne s\'installe qu\'en protection fine, en aval d\'un type 1 ou 2 : seul, il ne protège rien ici.' },
        { key: 'mcb2p', ref: 'Parafoudre DC type 2 · 1000 V', spec: 'Ucpv adaptée au champ', ok: true, why: 'Le champ en toiture est l\'élément le plus exposé ; un parafoudre continu type 2 est exigé dès que la liaison dépasse 10 m.' },
        { key: 'mcb2p', ref: 'Parafoudre AC type 2', spec: 'appareil alternatif', why: 'Un parafoudre alternatif n\'a pas la tenue en tension continue requise et ne se coordonne pas avec le régulateur.' },
      ],
    },
    {
      id: 'ac',
      name: 'DDR1 / Q2 · Départ alternatif',
      need: 'Protéger le départ 230 V de l\'onduleur-chargeur et les personnes',
      options: [
        { key: 'rcd2p', ref: 'Différentiel 30 mA type A + disjoncteur 16 A', spec: '30 mA type A · 16 A courbe C', ok: true, why: 'Le type A détecte les composantes continues des convertisseurs sans transformateur ; 16 A protège le 2,5 mm² du départ.' },
        { key: 'rcd4p', ref: 'Différentiel 30 mA type B', spec: 'type B', half: true, why: 'Le type B convient toujours, mais il coûte cinq fois plus cher : il n\'est exigé que si le constructeur de l\'onduleur l\'impose (courant continu lisse).' },
        { key: 'rcd2eaton', ref: 'Différentiel 30 mA type AC', spec: 'type AC', why: 'Le type AC est aveugle aux courants de défaut à composante continue : il peut rester bloqué.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    // rail 1 · coffret continu du champ
    { id: 'f1', label: 'F1 · Porte-fusibles gPV du string', key: 'dcfuse', rail: 0, x: 52, rep: 'F1' },
    { id: 'q1', label: 'Q1 · Interrupteur-sectionneur DC du champ', key: 'dcswitch', rail: 0, x: 112, rep: 'Q1' },
    { id: 'spd', label: 'F2 · Parafoudre DC type 2', key: 'dcspd', rail: 0, x: 172, rep: 'F2' },
    { id: 'mppt', label: 'U1 · Régulateur MPPT 450/100', key: 'dcswitch', rail: 0, x: 232, rep: 'U1' },
    // rail 2 · stockage et conversion
    { id: 'bat', label: 'B1 · Parc LiFePO₄ 24 V · 5,1 kWh', key: 'battery', rail: 1, x: 52, rep: 'B1' },
    { id: 'f2', label: 'Q3 · Sectionneur-fusible de batterie', key: 'dcswitch', rail: 1, x: 162, rep: 'Q3' },
    { id: 'ond', label: 'U2 · Onduleur-chargeur 24 V / 3 kVA', key: 'onduleur', rail: 1, x: 224, rep: 'U2' },
    // rail 3 · départs et borniers
    { id: 'f3', label: 'DDR1 · Différentiel 30 mA type A', key: 'l_protecti_disjoncteur_diff_a', rail: 2, x: 50, rep: 'DDR1' },
    { id: 'qac', label: 'Q2 · Disjoncteur AC 16 A courbe C', key: 'l_protecti_disjoncteur_20a', rail: 2, x: 110, rep: 'Q2' },
    { id: 'q4', label: 'Q4 · Départ continu 24 V · 16 A', key: 'mcb2p', rail: 2, x: 143, rep: 'Q4' },
    ...bornierDC(200, [
      ['termred', '1', 'PV+'], ['termblue', '2', 'PV−'],
      ['termred', '3', 'BAT+'], ['termblue', '4', 'BAT−'],
      ['earth', '5', 'PE'],
    ]),
    ...bornierAC(294, [
      ['termred', '1', 'L'], ['termblue', '2', 'N'], ['earth', '3', 'PE'],
      ['termred', '4', 'L-ch'], ['termblue', '5', 'N-ch'],
    ]),
  ],
  annexItems: ROOF,
  recvItems: RECV,
  liaisons: [
    // ---- toiture : couplage série du string et descente (câblage installateur)
    ...[1, 2, 3, 4, 5].map((i) => L(`PV${i}.X2`, `PV${i + 1}.X1`, 'DC+', 'pre')),
    L('PV1.X1', 'x2_1.b', 'DC+', 'pre'), L('PV6.X2', 'x2_2.b', 'DC-', 'pre'),
    L('MT.X1', 'x2_5.b', 'PE', 'pre'),
    // ---- arrivée du réseau et câbles des récepteurs (câblage installateur)
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.N', 'x1_2.b', 'N', 'pre'), L('RES.PE', 'x1_3.b', 'PE', 'pre'),
    L('x2_3.b', 'E1.X1', 'DC+', 'pre'), L('x2_4.b', 'E1.X2', 'DC-', 'pre'),
    L('x1_4.b', 'R1.X1', 'L1', 'pre'), L('x1_5.b', 'R1.X2', 'N', 'pre'),
    // ---- coffret continu du champ : bornier → fusible → sectionneur → parafoudre → MPPT
    L('x2_1.a', 'f1.1+', 'DC+'), L('x2_2.a', 'f1.3−', 'DC-'),
    L('f1.2+', 'q1.1+', 'DC+'), L('f1.4−', 'q1.3−', 'DC-'),
    L('q1.2+', 'spd.+', 'DC+'), L('q1.4−', 'spd.−', 'DC-'), L('spd.PE', 'x2_5.a', 'PE'),
    L('q1.2+', 'mppt.1+', 'DC+'), L('q1.4−', 'mppt.3−', 'DC-'),
    // ---- parc de batteries et bus continu 24 V
    L('bat.+', 'f2.1+', 'DC+'), L('bat.−', 'f2.3−', 'DC-'),
    L('mppt.2+', 'f2.2+', 'DC+'), L('mppt.4−', 'f2.4−', 'DC-'),
    L('ond.DC+', 'f2.2+', 'DC+'), L('ond.DC−', 'f2.4−', 'DC-'),
    L('q4.1', 'f2.2+', 'DC+'), L('q4.N', 'f2.4−', 'DC-'),
    // ---- départ continu 24 V vers l'éclairage
    L('q4.2', 'x2_3.a', 'DC+'), L('q4.N2', 'x2_4.a', 'DC-'),
    // ---- port alternatif : bornier → différentiel → disjoncteur → onduleur-chargeur
    L('x1_1.a', 'f3.1', 'L1'), L('x1_2.a', 'f3.3', 'N'),
    L('f3.2', 'qac.1', 'L1'), L('qac.2', 'ond.L', 'L1'), L('f3.4', 'ond.N', 'N'),
    L('x1_3.a', 'ond.PE', 'PE'),
    // ---- départ alternatif vers les charges du logement
    L('f3.2', 'x1_4.a', 'L1'), L('f3.4', 'x1_5.a', 'N'),
    // ---- mise à la terre des masses continues
    L('x2_5.a', 'x1_3.a', 'PE'),
  ],
  nets: {
    // ---- champ photovoltaïque : sous tension dès qu'il fait jour
    ...stringNets(1, 6),
    'MT.X1': { net: 'PE', live: 'always' }, 'MT.X2': { net: 'PE', live: 'always' },
    // ---- bornier continu
    'x2_1.a': { net: 'V', live: 'always' }, 'x2_1.b': { net: 'V', live: 'always' },
    'x2_2.a': { net: 'C0', live: 'always' }, 'x2_2.b': { net: 'C0', live: 'always' },
    'x2_3.a': { net: 'C', live: 'f2' }, 'x2_3.b': { net: 'C', live: 'f2' },
    'x2_4.a': { net: 'C0', live: 'always' }, 'x2_4.b': { net: 'C0', live: 'always' },
    'x2_5.a': { net: 'PE', live: 'always' }, 'x2_5.b': { net: 'PE', live: 'always' },
    // ---- fusible du string et sectionneur du champ
    'f1.1+': { net: 'V', live: 'always' }, 'f1.2+': { net: 'V', live: 'always' },
    'f1.3−': { net: 'C0', live: 'always' }, 'f1.4−': { net: 'C0', live: 'always' },
    'q1.1+': { net: 'V', live: 'always' }, 'q1.3−': { net: 'C0', live: 'always' },
    'q1.2+': { net: 'V', live: 'q1' }, 'q1.4−': { net: 'C0', live: 'q1' },
    'spd.+': { net: 'V', live: 'q1' }, 'spd.−': { net: 'C0', live: 'q1' },
    'spd.PE': { net: 'PE', live: 'always' },
    // ---- régulateur MPPT : entrée champ (1+ / 3−), sortie parc (2+ / 4−)
    'mppt.1+': { net: 'V', live: 'q1' }, 'mppt.3−': { net: 'C0', live: 'q1' },
    'mppt.2+': { net: 'C', live: 'always' }, 'mppt.4−': { net: 'C0', live: 'always' },
    // ---- parc de batteries : jamais hors tension
    'bat.+': { net: 'C', live: 'always' }, 'bat.−': { net: 'C0', live: 'always' },
    'f2.1+': { net: 'C', live: 'always' }, 'f2.3−': { net: 'C0', live: 'always' },
    'f2.2+': { net: 'C', live: 'f2' }, 'f2.4−': { net: 'C0', live: 'always' },
    // ---- onduleur-chargeur
    'ond.DC+': { net: 'C', live: 'f2' }, 'ond.DC−': { net: 'C0', live: 'always' },
    'ond.L': { net: 'L1', live: 'ctl' }, 'ond.N': { net: 'N', live: 'always' },
    'ond.PE': { net: 'PE', live: 'always' },
    // ---- départ continu 24 V
    'q4.1': { net: 'C', live: 'f2' }, 'q4.2': { net: 'C', live: 'f2' },
    'q4.N': { net: 'C0', live: 'always' }, 'q4.N2': { net: 'C0', live: 'always' },
    'E1.X1': { net: 'C', live: 'f2' }, 'E1.X2': { net: 'C0', live: 'always' },
    // ---- départ alternatif
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'N', live: 'always' }, 'x1_2.b': { net: 'N', live: 'always' },
    'x1_3.a': { net: 'PE', live: 'always' }, 'x1_3.b': { net: 'PE', live: 'always' },
    'f3.1': { net: 'L1', live: 'always' }, 'f3.3': { net: 'N', live: 'always' },
    'f3.2': { net: 'L1', live: 'ctl' }, 'f3.4': { net: 'N', live: 'always' },
    'qac.1': { net: 'L1', live: 'ctl' }, 'qac.2': { net: 'L1', live: 'ctl' },
    'x1_4.a': { net: 'L1', live: 'ctl' }, 'x1_4.b': { net: 'L1', live: 'ctl' },
    'x1_5.a': { net: 'N', live: 'always' }, 'x1_5.b': { net: 'N', live: 'always' },
    'R1.X1': { net: 'L1', live: 'ctl' }, 'R1.X2': { net: 'N', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'pol',
      title: 'Polarité et tension à vide du string',
      how: 'Sectionneur Q1 ouvert, multimètre en tension continue au bornier X2 : pointe rouge sur X2:1 (+), pointe noire sur X2:2 (−).',
      expected: 'valeur positive ≈ 228 V, inférieure aux 450 V admis par le régulateur',
    },
    {
      id: 'polbat',
      title: 'Polarité et tension du parc avant raccordement',
      how: 'Q3 ouvert, multimètre en tension continue sur les bornes du parc, avant de présenter les cosses à l\'onduleur : repérer + en rouge et − en noir.',
      expected: '24 à 29 V, polarités repérées : une inversion détruit l\'onduleur-chargeur',
    },
    {
      id: 'isodc',
      title: 'Isolement du champ sous 500 V',
      how: 'Q1 ouvert et string déconnecté du régulateur, contrôleur en RISO 500 V entre DC+ et PE, puis entre DC− et PE.',
      expected: '≥ 1 MΩ (UTE C 15-712-1) ; ne jamais appliquer 500 V sur le bus batterie',
    },
    {
      id: 'eqp',
      title: 'Continuité de la liaison équipotentielle des masses',
      how: 'Contrôleur en RPE 200 mA entre la barrette de terre des cadres en toiture (MT) et la borne X2:5.',
      expected: '< 2 Ω, conducteur 6 mm² vert-jaune sans interruption',
    },
    {
      id: 'arc',
      title: 'Connecteurs, serrages et risque de défaut d\'arc',
      how: 'Connecteurs MC4 de même marque et verrouillés ; cosses de batterie serrées au couple constructeur ; aucune trace de brunissement sur les bornes du bus continu.',
      expected: 'aucun échauffement, aucun jeu, couples respectés',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité de la liaison équipotentielle (MT → X2:5)', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'MT.X1', b: 'x2_5.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement du champ / PE sous 500 V à l\'entrée du régulateur', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'mppt.1+', b: 'x2_5.a', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'uoc', title: 'Tension à vide du string au bornier X2 (≈ 228 V)', stage: 'horsTension',
      instrument: 'mm', dial: 'V~', a: 'x2_1.a', b: 'x2_2.a', min: 200, max: 250, unit: 'V',
    },
    {
      id: 'ubat', title: 'Tension du parc de batteries au repos (24 V nominal)', stage: 'horsTension',
      instrument: 'mm', dial: 'V~', a: 'bat.+', b: 'bat.−', min: 21, max: 30, unit: 'V',
    },
    {
      id: 'umppt', title: 'Tension d\'entrée du régulateur MPPT, Q1 fermé', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'mppt.1+', b: 'mppt.3−', min: 200, max: 250, unit: 'V', when: 'ctl',
    },
    {
      id: 'ubus', title: 'Tension du bus continu à l\'entrée de l\'onduleur-chargeur', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'ond.DC+', b: 'ond.DC−', min: 21, max: 30, unit: 'V', when: 'ctl',
    },
    {
      id: 'uac', title: 'Tension alternative en sortie de l\'onduleur-chargeur', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'ond.L', b: 'ond.N', min: 207, max: 253, unit: 'V', when: 'ctl',
    },
    {
      id: 'ipv', title: 'Courant du string à la pince (F1:2+ → Q1:1+)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'f1.2+>q1.1+', min: 1, max: 5, unit: 'A', when: 'run',
    },
  ],
  faults: [
    {
      id: 'x2',
      title: 'Câble DC+ de la batterie non serré dans l\'onduleur-chargeur',
      symptom: 'Q1, Q3, DDR1 et Q2 sont fermés, 26 V se lisent aux bornes du parc, mais l\'onduleur ne démarre pas et H1 reste éteint.',
      fix: 'Consigner le champ, ouvrir Q3, reprendre le sertissage et le serrage de la cosse + côté onduleur, puis refermer dans l\'ordre.',
    },
    {
      id: 'a2',
      title: 'Chute de tension sur le câble batterie (section ou serrage insuffisants)',
      symptom: 'L\'onduleur démarre, appelle son courant, puis se coupe aussitôt en sous-tension : le cycle recommence en boucle.',
      fix: 'Contrôler la section (50 mm² pour 136 A), la longueur et le couple de serrage des cosses, puis refaire l\'essai en charge.',
    },
    {
      id: 's1',
      title: 'Le BMS a ouvert son contact de sécurité (parc en sous-tension)',
      symptom: 'Rien ne démarre : la tension du parc est basse, le voyant du BMS clignote et le contact de validation vers l\'onduleur est ouvert.',
      fix: 'Recharger le parc par le régulateur, contrôler les seuils déclarés dans l\'onduleur et le câblage du bus de communication.',
    },
  ],
  quiz: [
    {
      q: 'Pourquoi place-t-on un sectionneur-fusible au plus près du parc de batteries ?',
      options: [
        'Parce qu\'une batterie ne peut pas être mise hors tension : c\'est le seul moyen d\'isoler le bus continu',
        'Pour limiter la tension du parc',
        'Pour améliorer le rendement de la charge',
      ],
      answer: 0,
    },
    {
      q: 'Un onduleur-chargeur 3 kVA sur un parc 24 V : quel ordre de grandeur du courant côté batterie ?',
      options: ['13 A', '60 A', '136 A'],
      answer: 2,
    },
    {
      q: 'Quelle grandeur compare-t-on à la tension PV maximale du régulateur MPPT ?',
      options: [
        'La tension au point de puissance maximale à 25 °C',
        'La tension à vide du string corrigée à la température minimale du site',
        'La tension nominale du parc de batteries',
      ],
      answer: 1,
    },
  ],
  motor: null,
  hasMotor: false,
};
