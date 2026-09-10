/**
 * TP · Chauffe-eau heures pleines / heures creuses (contacteur jour-nuit, scène habitat).
 *
 * Circuit spécialisé 2 000 W en 2,5 mm² : Q1 20 A, contacteur jour-nuit KM1 dont la bobine
 * est pilotée par le contact « heures creuses » du compteur, protégée par Q2 2 A, et une
 * télécommande trois positions (auto / marche forcée / arrêt).
 *
 * Correspondances avec le moteur de simulation (identifiants imposés) :
 *  q1 = AGCP (séparation générale) · f2 = interrupteur différentiel 30 mA type A ·
 *  f3 = Q2 disjoncteur 2 A du circuit de commande · f1 = Q1 disjoncteur 20 A du chauffe-eau ·
 *  km1 = contacteur jour-nuit. Le bouton vert S2 du bloc de commande représente la fermeture
 *  du contact heures creuses (ou la marche forcée), le bouton rouge S1 la position arrêt.
 */
import type { AnnexItem, Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/** Bornier X1 de l'habitat : bornes étroites au pas de 18 px sur le dernier rail. */
function bornier(x0: number, rows: [string, string, string][], rail = 2): Slot[] {
  return rows.map(([key, mark, sub], i) => ({
    id: `x1_${i + 1}`,
    label: `X1:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18,
    mark,
    sub,
    group: 'X1',
    ...(i === 0 ? { groupLabel: 'X1 · bornier de raccordement (gaines ICTA)' } : {}),
  }));
}

/** Pièce : télécommande du chauffe-eau. */
const ROOM: AnnexItem[] = [
  { key: 'l_commande_interrupteur', rep: 'SA1', name: 'télécommande auto / marche forcée / arrêt', x: 444, y: 320, w: 44, h: 44 },
];

/** Récepteur : le chauffe-eau, sous la platine. */
const RECV: AnnexItem[] = [
  { key: 'l_recepteu_chauffe_eau', rep: 'CE', name: 'chauffe-eau 200 L · 2 000 W', x: 70, y: 22, w: 50, h: 104, recv: true },
];

export const TP_CHAUFFE_EAU: TpDefinition = {
  id: 'chauffe-eau',
  title: 'Chauffe-eau HP / HC · contacteur jour-nuit',
  level: '2de Bac Pro MELEC',
  family: 'hab',
  scene: 'hab',
  annex: 'room',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  situation:
    'Le chauffe-eau du logement doit chauffer pendant les heures creuses. Tu câbles le circuit spécialisé : le contact heures creuses du compteur pilote la bobine du contacteur jour-nuit, protégée par Q2, et le contacteur alimente la résistance par un câble 2,5 mm². Une télécommande à trois positions permet la marche forcée depuis la cuisine. Tu contrôles ensuite l\'installation, tu la consignes, tu mesures, puis tu la remets en service.',
  summary:
    'Circuit spécialisé chauffe-eau 2 000 W : AGCP, différentiel 30 mA type A, Q1 20 A en 2,5 mm², contacteur jour-nuit KM1 piloté par le contact HC du compteur, Q2 2 A pour la commande, télécommande marche forcée / auto / arrêt et bornier X1.',
  plaque: {
    Récepteur: 'chauffe-eau 200 L · 2 000 W',
    U: '230 V ~ 50 Hz',
    I: '8,7 A',
    Circuit: 'spécialisé 2,5 mm² · Q1 20 A courbe C',
    Commande: 'contact HC du compteur · bobine 230 V',
    Protection: 'différentiel 30 mA type A',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE sur X1:1 · X1:2 · X1:3 (câblage installateur)' },
    { k: 'Puissance', v: 'I = P / U = 2 000 / 230 = 8,7 A → circuit spécialisé 2,5 mm², Q1 20 A courbe C' },
    { k: 'Différentiel', v: '30 mA type A : la résistance et son thermostat électronique peuvent générer des composantes continues' },
    { k: 'Commande', v: 'Q2 2 A protège la bobine du contacteur et le contact heures creuses du compteur' },
    { k: 'Contacteur', v: 'KM1 jour-nuit : bobine A1 / A2, pôle de puissance 1 / 2' },
    { k: 'Télécommande', v: 'SA1 trois positions — auto (contact HC), marche forcée (contact fermé), arrêt' },
    { k: 'Terre', v: 'PE 2,5 mm² obligatoire jusqu\'à la borne de terre de la cuve (X1:6)' },
    { k: 'Rangée 1', v: 'Q0 AGCP · ID1 différentiel 40 A 30 mA type A · Q1 20 A · Q2 2 A' },
    { k: 'Rangée 2', v: 'KM1 contacteur jour-nuit · H3 voyant de présence tension' },
    { k: 'Rangée 3', v: 'X1 · bornier de raccordement, 10 bornes étroites repérées' },
    { k: 'Avant mise en service', v: 'contrôle visuel · consignation · VAT · continuité PE · isolement 500 V' },
  ],
  postes: [
    {
      id: 'km',
      name: 'KM1 · Contacteur jour-nuit',
      need: 'Alimenter une résistance de 2 000 W (8,7 A) pendant les heures creuses',
      options: [
        { key: 'kontakt', ref: 'Contacteur J/N 20 A 1NO · bobine 230 V', spec: '20 A · bobine 230 V~', ok: true, why: '20 A ≥ 8,7 A et bobine 230 V pilotée par le contact heures creuses du compteur.' },
        { key: 'kontakt', ref: 'Contacteur 16 A 1NO · bobine 230 V', spec: '16 A', half: true, why: 'Passe en calibre, mais sans marge pour une résistance en service quotidien : c\'est le 20 A qui est normalisé pour ce départ.' },
        { key: 'timer', ref: 'Télérupteur 16 A', spec: 'bistable à impulsion', why: 'Un télérupteur bascule sur impulsion : il ne suit pas un contact maintenu comme le signal heures creuses.' },
      ],
    },
    {
      id: 'q',
      name: 'Q1 · Protection du circuit spécialisé',
      need: 'Protéger un circuit chauffe-eau de 8,7 A câblé en 2,5 mm²',
      options: [
        { key: 'mcb2p', ref: 'iC60N 1P+N C20', spec: '20 A · courbe C · 2,5 mm²', ok: true, why: 'Calibre normalisé du circuit chauffe-eau : 8,7 A < 20 A et le 2,5 mm² reste protégé.' },
        { key: 'mcb2p', ref: 'iC60N 1P+N C32', spec: '32 A · courbe C', why: 'Le 2,5 mm² n\'est plus protégé : 20 A est le calibre maximal pour cette section.' },
        { key: 'mcb2p', ref: 'iC60N 1P+N C10', spec: '10 A · courbe C', why: '8,7 A en service continu sur un calibre 10 A : déclenchements intempestifs assurés.' },
      ],
    },
    {
      id: 'id',
      name: 'ID1 · Interrupteur différentiel',
      need: 'Protection des personnes du circuit chauffe-eau',
      options: [
        { key: 'rcd2p', ref: 'iID 2P 40 A 30 mA type A', spec: '40 A · 30 mA · type A', ok: true, why: 'Le type A est imposé pour le chauffe-eau, la plaque et le lave-linge (composantes continues).' },
        { key: 'rcd2p', ref: 'iID 2P 40 A 30 mA type AC', spec: 'type AC', half: true, why: 'Protège les personnes, mais le type AC ne détecte pas les composantes continues de ce récepteur.' },
        { key: 'rcd2eaton', ref: 'HNC-25/2/003 · 25 A', spec: '25 A · 30 mA', half: true, why: 'Sensibilité correcte, mais calibre trop juste si d\'autres départs sont ajoutés à la rangée.' },
      ],
    },
    {
      id: 'cmd',
      name: 'Q2 · Protection du circuit de commande',
      need: 'Protéger la bobine du contacteur et le contact HC du compteur (≈ 0,05 A)',
      options: [
        { key: 'mcb1p', ref: 'iC60N 1P C2', spec: '2 A · courbe C', ok: true, why: 'Calibre adapté à la bobine et aux fils de commande, comme l\'exige le raccordement du contact HC.' },
        { key: 'mcb1p', ref: 'iC60N 1P C16', spec: '16 A · courbe C', why: 'Aucune protection réelle du contact du compteur ni du fil de commande.' },
        { key: 'mcb2p', ref: 'Aucune protection de commande', spec: '—', why: 'Le contact heures creuses du compteur doit être protégé : un court-circuit le détruirait.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q0 · AGCP 15/45 A', key: 'agcp', rail: 0, x: 52, rep: 'Q0' },
    { id: 'f2', label: 'ID1 · Différentiel 40 A 30 mA type A', key: 'rcd2p', rail: 0, x: 132, rep: 'ID1' },
    { id: 'f1', label: 'Q1 · Chauffe-eau 20 A', key: 'mcb2p', rail: 0, x: 194, rep: 'Q1' },
    { id: 'f3', label: 'Q2 · Commande 2 A', key: 'mcb1p', rail: 0, x: 256, rep: 'Q2' },
    { id: 'km1', label: 'KM1 · Contacteur jour-nuit 20 A', key: 'kontakt', rail: 1, x: 52, rep: 'KM1' },
    { id: 'h3', label: 'H3 · Voyant présence tension', key: 'lampG', rail: 1, x: 130, rep: 'H3' },
    ...bornier(52, [
      ['termred', '1', 'L'], ['termblue', '2', 'N'], ['earth', '3', 'PE'],
      ['termred', '4', 'CE-L'], ['termblue', '5', 'CE-N'], ['earth', '6', 'CE-PE'],
      ['termred', '7', 'HC1'], ['termred', '8', 'HC2'],
      ['termred', '9', 'H1'], ['termblue', '10', 'N-H'],
    ]),
  ],
  annexItems: ROOM,
  recvItems: RECV,
  liaisons: [
    // ---- arrivée branchement (câblage installateur)
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.N', 'x1_2.b', 'N', 'pre'), L('RES.PE', 'x1_3.b', 'PE', 'pre'),
    // ---- tête d'installation
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'N'),
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.N', 'N'),
    L('f2.2', 'f1.1', 'L1'), L('f2.N2', 'f1.N', 'N'),
    L('f2.2', 'f3.1', 'L1'),
    L('x1_3.a', 'x1_6.a', 'PE'),
    // ---- puissance : Q1 → contacteur → chauffe-eau
    L('f1.2', 'km1.1', 'L1'), L('km1.2', 'x1_4.a', 'L1'), L('x1_4.b', 'CE.X1', 'L1'),
    L('f1.N2', 'x1_5.a', 'N'), L('x1_5.b', 'CE.X2', 'N'),
    // ---- commande : contact HC du compteur et télécommande en parallèle
    L('f3.2', 'x1_7.a', 'L1'),
    L('x1_7.b', 'S2.13', 'L1', 'door'), L('S2.14', 'x1_8.b', 'L1', 'door'),
    L('x1_7.b', 'S1.21', 'L1', 'door'), L('S1.22', 'x1_8.b', 'L1', 'door'),
    L('x1_7.b', 'SA1.X1', 'L1'), L('SA1.X2', 'x1_8.b', 'L1'),
    L('x1_8.a', 'km1.A1', 'L1'), L('km1.A2', 'f2.N2', 'N'),
    // ---- signalisation
    L('km1.2', 'x1_9.a', 'L1'), L('x1_9.b', 'H1.X1', 'L1', 'door'),
    L('f2.N2', 'x1_10.a', 'N'), L('x1_10.b', 'H1.X2', 'N', 'door'),
    L('f2.2', 'h3.X1', 'L1'), L('h3.X2', 'f2.N2', 'N'),
  ],
  nets: {
    // amont de l'AGCP
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'N', live: 'always' }, 'x1_2.b': { net: 'N', live: 'always' },
    'x1_3.a': { net: 'PE', live: 'always' }, 'x1_3.b': { net: 'PE', live: 'always' },
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'N', live: 'always' },
    // aval de l'AGCP
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'N', live: 'q1' },
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'N', live: 'q1' },
    // aval du différentiel
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'N', live: 'f2' },
    'f1.1': { net: 'L1', live: 'f2' }, 'f1.N': { net: 'N', live: 'f2' },
    'f3.1': { net: 'L1', live: 'f2' },
    'h3.X1': { net: 'L1', live: 'f2' }, 'h3.X2': { net: 'N', live: 'f2' },
    'f1.2': { net: 'L1', live: 'f2' }, 'f1.N2': { net: 'N', live: 'f2' },
    'km1.1': { net: 'L1', live: 'f2' },
    // circuit de commande
    'f3.2': { net: 'L1', live: 'ctl' },
    'x1_7.a': { net: 'L1', live: 'ctl' }, 'x1_7.b': { net: 'L1', live: 'ctl' },
    'S1.21': { net: 'L1', live: 'ctl' }, 'S2.13': { net: 'L1', live: 'ctl' },
    'SA1.X1': { net: 'L1', live: 'ctl' },
    // aval du contact HC : sous tension seulement quand le contact est fermé
    'S1.22': { net: 'L1', live: 'km1' }, 'S2.14': { net: 'L1', live: 'km1' },
    'SA1.X2': { net: 'L1', live: 'km1' },
    'x1_8.a': { net: 'L1', live: 'km1' }, 'x1_8.b': { net: 'L1', live: 'km1' },
    'km1.A1': { net: 'L1', live: 'km1' }, 'km1.A2': { net: 'N', live: 'f2' },
    // aval du pôle de puissance du contacteur
    'km1.2': { net: 'L1', live: 'run' },
    'x1_4.a': { net: 'L1', live: 'run' }, 'x1_4.b': { net: 'L1', live: 'run' },
    'CE.X1': { net: 'L1', live: 'run' }, 'CE.X2': { net: 'N', live: 'f2' },
    'x1_5.a': { net: 'N', live: 'f2' }, 'x1_5.b': { net: 'N', live: 'f2' },
    'x1_9.a': { net: 'L1', live: 'run' }, 'x1_9.b': { net: 'L1', live: 'run' },
    'H1.X1': { net: 'L1', live: 'run' }, 'H1.X2': { net: 'N', live: 'f2' },
    'x1_10.a': { net: 'N', live: 'f2' }, 'x1_10.b': { net: 'N', live: 'f2' },
    // conducteur de protection
    'x1_6.a': { net: 'PE', live: 'always' }, 'x1_6.b': { net: 'PE', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'sect',
      title: 'Section et calibre du circuit spécialisé',
      how: 'Vérifie que le départ chauffe-eau est câblé en 2,5 mm² sur toute sa longueur et protégé par Q1 20 A, et que la commande est en 1,5 mm² protégée par Q2 2 A.',
      expected: '2,5 mm² / 20 A en puissance, 1,5 mm² / 2 A en commande',
    },
    {
      id: 'cmd',
      title: 'Contrôle du circuit de commande',
      how: 'Multimètre en Ω entre X1:8 et la borne A1 du contacteur, télécommande en position marche forcée : le chemin passe par le contact HC et la bobine.',
      expected: 'continuité franche, bobine ≈ quelques centaines d\'ohms',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du PE jusqu\'à la borne de terre du chauffe-eau', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'x1_6.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement du départ chauffe-eau sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_4.a', b: 'x1_3.a', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'cont', title: 'Continuité de la phase entre X1:4 et le chauffe-eau', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'x1_4.a', b: 'CE.X1', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'u230', title: 'Tension d\'arrivée au bornier X1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_1.a', b: 'x1_2.a', min: 225, max: 240, unit: 'V',
    },
    {
      id: 'ucmd', title: 'Tension aux bornes de la bobine, contact HC fermé', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'km1.A1', b: 'km1.A2', min: 225, max: 240, unit: 'V', when: 'run',
    },
    {
      id: 'uce', title: 'Tension aux bornes du chauffe-eau en chauffe', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'CE.X1', b: 'CE.X2', min: 225, max: 240, unit: 'V', when: 'run',
    },
  ],
  faults: [
    { id: 'x2', title: 'Fil X1:8 → A1 débranché', symptom: 'Le contacteur ne colle jamais, pourtant 230 V sont présents en X1:7 et le contact HC se ferme.', fix: 'Reconnecter le retour du contact heures creuses sur la borne A1 de la bobine.' },
    { id: 'a2', title: 'Neutre de la bobine (A2) desserré', symptom: 'KM1 vibre, claque et ne tient pas : le chauffe-eau ne chauffe pas.', fix: 'Resserrer A2 sur la sortie neutre du différentiel et refaire la continuité.' },
    { id: 'f3', title: 'Q2 (commande 2 A) déclenché', symptom: 'Aucune tension en X1:7, le contacteur reste ouvert même en marche forcée.', fix: 'Rechercher le court-circuit du circuit de commande, puis réarmer Q2.' },
  ],
  quiz: [
    { q: 'Que pilote le contact heures creuses du compteur ?', options: ['La résistance directement', 'La bobine du contacteur jour-nuit', 'Le disjoncteur différentiel'], answer: 1 },
    { q: 'Quel courant appelle un chauffe-eau de 2 000 W en 230 V ?', options: ['4,3 A', '8,7 A', '20 A'], answer: 1 },
    { q: 'Quelle section et quel calibre pour ce circuit spécialisé ?', options: ['1,5 mm² et 16 A', '2,5 mm² et 20 A', '6 mm² et 32 A'], answer: 1 },
  ],
  motor: null,
  station: true,
  hasMotor: false,
};
