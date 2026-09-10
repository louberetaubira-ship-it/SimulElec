/**
 * TP · Pompe de relevage à flotteurs (marche automatique, marche forcée, alarme niveau très haut).
 *
 * Puissance : Q1 GV2 → KM1 → F1 → bornier X1 → pompe immergée (câble 4 G 1,5 mm²).
 * Commande 24 V par T1 (F2 primaire, F3 secondaire) : arrêt S1 et marche forcée S2 en porte,
 * trois flotteurs dans la fosse raccordés sur X2 (SF1 niveau haut, SF2 niveau bas,
 * SF3 niveau très haut), relais de mémorisation KA1 (bornes 1-2 = bobine, 3-4 = contact NO).
 *
 * Correspondances avec le moteur de simulation (identifiants imposés) :
 *  q1 = disjoncteur moteur · f2 = primaire de T1 · f3 = secondaire 24 V · f1 = relais thermique ·
 *  km1 = contacteur de la pompe. Le bouton vert S2 du coffret représente la marche forcée,
 *  le bouton rouge S1 l'arrêt général ; le basculement des flotteurs n'est pas animé par le
 *  simulateur, il se contrôle à l'ohmmètre et se raisonne sur le schéma.
 */
import type { Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, X1 } from './common';

/** Bornier X2 : 9 bornes de commande (porte et fosse), bornes étroites au pas de 17 px. */
function bornierX2(x0: number, rail = 2): Slot[] {
  const subs = ['S1', 'S1/S2', 'S2', 'SF+', 'SF1', 'SF2', 'H1', 'H2', '0V'];
  return subs.map((sub, i) => ({
    id: `x2_${i + 1}`,
    label: `X2:${i + 1}`,
    key: 'termgrey',
    rail,
    x: x0 + i * 17,
    mark: String(i + 1),
    sub,
    group: 'X2',
    ...(i === 0 ? { groupLabel: 'X2 · commande, porte et flotteurs' } : {}),
  }));
}

/** Flotteur de la fosse, figuré à droite de la platine avec les organes hors armoire. */
const flotteur = (id: string, rep: string, name: string, y: number): Slot => ({
  id, label: `${rep} · ${name}`, key: 'stopstart', rail: null, x: 452, y, w: 52, h: 77, rep,
});

export const TP_POMPE_RELEVAGE: TpDefinition = {
  id: 'pompe-relevage',
  title: 'Pompe de relevage à flotteurs',
  level: '1re Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Départ moteur d\'une pompe immergée : marche automatique par flotteur haut, arrêt par flotteur bas, mémorisation par le relais KA1, marche forcée par bouton maintenu et alarme de niveau très haut sur le voyant H2.',
  situation:
    'La fosse de relevage des eaux usées du lycée doit être vidée automatiquement. Tu câbles le départ de la pompe : en automatique, le flotteur haut SF1 démarre la pompe et le relais KA1 mémorise la demande jusqu\'à l\'ouverture du flotteur bas SF2 ; en marche forcée, la pompe ne tourne que tant que le bouton S2 est maintenu. Un défaut thermique ou le flotteur de niveau très haut SF3 allume le voyant d\'alarme H2.',
  plaque: {
    P: '1,1 kW',
    U: '400 V Y · 50 Hz',
    In: '2,6 A',
    n: '2850 tr/min',
    'cos φ': '0,82',
    Pôles: '2',
    Protection: 'IP 68 · immergée',
    Service: 'S3 · intermittent 40 %',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE, arrivée sur bornier X1' },
    { k: 'Puissance', v: 'Q1 GV2 réglé à In = 2,6 A · KM1 LC1D bobine 24 V · F1 LRD classe 10' },
    { k: 'Commande', v: '24 V~ par T1 400/24 V · 63 VA, F2 bipolaire au primaire, F3 unipolaire au secondaire' },
    { k: 'Automatique', v: 'SF1 niveau haut → marche, mémorisation par KA1 (contact 3-4 en série avec SF2), SF2 niveau bas → arrêt' },
    { k: 'Marche forcée', v: 'S2 maintenu enfoncé alimente directement la bobine de KM1, sans mémorisation' },
    { k: 'Alarme', v: 'SF3 niveau très haut ou F1 97-98 → voyant rouge H2' },
    { k: 'Signalisation', v: 'H1 vert = pompe en marche, piloté par KM1 13-14' },
    { k: 'Rail 1', v: 'Q1 · KM1 · F1' },
    { k: 'Rail 2', v: 'F2 · T1 · F3 · KA1' },
    { k: 'Rail 3', v: 'X1 bornier puissance (9 bornes) · X2 bornier commande (9 bornes)' },
    { k: 'Fosse', v: 'trois flotteurs à contact NO, câble en 1,5 mm² jusqu\'à X2, ponts réalisés en boîte de jonction IP 68' },
    { k: '0 V', v: 'point neutre du secondaire relié à la terre sur X1:5' },
    { k: 'Avant mise en service', v: 'consignation · VAT · continuité PE · isolement 500 V · essai des flotteurs' },
  ],
  postes: [
    {
      id: 'q1',
      name: 'Q1 · Disjoncteur moteur',
      need: 'Protection magnéto-thermique réglable autour de In = 2,6 A',
      options: [
        { key: 'motorcb', ref: 'GV2ME08', spec: '2,5 – 4 A', ok: true, why: 'In = 2,6 A se règle en début de plage 2,5 – 4 A.' },
        { key: 'motorcb', ref: 'GV2ME06', spec: '1 – 1,6 A', why: 'Plage trop basse : déclenchement dès le démarrage de la pompe.' },
        { key: 'motorcb', ref: 'GV2ME10', spec: '4 – 6,3 A', why: 'Réglage minimal 4 A > In : la pompe n\'est pas protégée.' },
      ],
    },
    {
      id: 'km1',
      name: 'KM1 · Contacteur de la pompe',
      need: 'Commande de puissance en AC-3, bobine alimentée par la commande 24 V',
      options: [
        { key: 'kontakt', ref: 'LC1D09B7', spec: '9 A AC-3 · bobine 24 V~', ok: true, why: '9 A AC-3 ≥ 2,6 A et bobine 24 V~ cohérente avec le secondaire de T1.' },
        { key: 'kontakt', ref: 'LC1D09P7', spec: '9 A AC-3 · bobine 230 V~', why: 'Bobine 230 V alors que la commande est en 24 V : le contacteur ne collera pas.' },
        { key: 'kontakt', ref: 'LC1D32B7', spec: '32 A AC-3 · bobine 24 V~', half: true, why: 'Fonctionne, mais très surdimensionné pour 2,6 A : encombrement et prix inutiles.' },
      ],
    },
    {
      id: 'f1',
      name: 'F1 · Relais thermique',
      need: 'Protection contre les surcharges (pompe bloquée, marche à sec), réglée à In = 2,6 A',
      options: [
        { key: 'therm', ref: 'LRD08', spec: '2,5 – 4 A · classe 10', ok: true, why: '2,6 A est dans la plage et la classe 10 convient au démarrage direct d\'une pompe.' },
        { key: 'therm', ref: 'LRD06', spec: '1 – 1,6 A · classe 10', why: 'Plage trop basse : le relais déclenchera en marche normale.' },
        { key: 'therm', ref: 'LRD16', spec: '9 – 13 A · classe 10', why: 'Plage sans rapport avec In : la surcharge ne sera jamais détectée.' },
      ],
    },
    {
      id: 'ka1',
      name: 'KA1 · Relais de mémorisation',
      need: 'Mémoriser la demande de SF1 jusqu\'à l\'ouverture du flotteur bas SF2',
      options: [
        { key: 'timer', ref: 'RXM2AB2BD + embase RXZE2', spec: '2 contacts inverseurs · bobine 24 V', ok: true, why: 'Bobine à la tension de commande et contacts suffisants pour l\'auto-maintien ; le relais reste enclenché jusqu\'à l\'ouverture de SF2.' },
        { key: 'timer', ref: 'RXM2AB2P7', spec: '2 RT · bobine 230 V~', why: 'Bobine hors tension de commande : elle ne collerait pas sous 24 V.' },
        { key: 'timer', ref: 'Relais temporisé au travail', spec: 'contact temporisé 0,1 – 30 s', why: 'C\'est une mémorisation qu\'il faut, pas une temporisation : la durée de pompage dépend du niveau, pas d\'un réglage.' },
      ],
    },
    {
      id: 'flot',
      name: 'SF1 / SF2 / SF3 · Flotteurs',
      need: 'Trois flotteurs immergés dans des eaux usées, contact sec compatible 24 V',
      options: [
        { key: 'stopstart', ref: '3 × flotteur à contact sec IP 68', spec: 'contact NO · câble néoprène 3 G 1,5', ok: true, why: 'Contact sec compatible avec la très basse tension de commande, indice IP 68 exigé pour l\'immersion permanente.' },
        { key: 'stopstart', ref: '3 × flotteur de puissance 230 V', spec: 'contact 16 A · IP 68', half: true, why: 'Mécaniquement adapté, mais un contact de puissance commute mal les 20 mA du 24 V : contacts qui s\'oxydent et démarrages aléatoires.' },
        { key: 'stopstart', ref: '2 × flotteur seulement', spec: 'niveau haut et niveau bas', why: 'Sans le flotteur de niveau très haut, aucune alarme de débordement n\'est possible.' },
      ],
    },
    {
      id: 'cond',
      name: 'Section des conducteurs',
      need: 'Départ pompe 2,6 A en câble immergé, commande et flotteurs en très basse tension',
      options: [
        { key: 'termred', ref: 'Puissance 4 G 1,5 mm² H07RN-F · commande 1,5 mm²', spec: 'câble souple néoprène pour l\'immergé', ok: true, why: '1,5 mm² suffit largement pour 2,6 A et le câble souple néoprène supporte l\'immersion et les mouvements de la pompe.' },
        { key: 'termred', ref: 'Puissance 4 G 1,5 mm² H07V-U rigide', spec: 'conducteurs rigides', why: 'Un conducteur rigide sous fourreau ne convient pas à une pompe immergée mobile : il faut un câble souple résistant à l\'eau.' },
        { key: 'termred', ref: 'Puissance 4 G 6 mm²', spec: 'section unique 6 mm²', half: true, why: 'Sans danger, mais surdimensionné et impossible à raccorder correctement sur les bornes du moteur.' },
      ],
    },
    {
      id: 'x',
      name: 'X1 / X2 · Borniers',
      need: 'X1 : arrivée et départ pompe ; X2 : porte et liaisons vers la fosse',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE', spec: 'X1 9 bornes · X2 9 bornes repérées', ok: true, why: 'Toutes les liaisons sortant de l\'armoire — porte et fosse — passent par une borne repérée, ce qui permet de déconnecter la fosse pour l\'isolement.' },
        { key: 'termgrey', ref: 'UT 2,5 · X2 4 bornes', spec: 'bornier de commande réduit', why: 'Quatre bornes ne suffisent pas : arrêt, marche, trois flotteurs, deux voyants et le 0 V doivent tous être repérés.' },
        { key: 'termgrey', ref: 'Boîte de dérivation dans l\'armoire', spec: 'connexions par bornes automatiques', why: 'Le raccordement des départs extérieurs se fait sur un bornier monté sur rail, pas dans une boîte de dérivation.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur moteur', key: 'motorcb', rail: 0, x: 52, rep: 'Q1' },
    { id: 'km1', label: 'KM1 · Contacteur pompe', key: 'kontakt', rail: 0, x: 112, rep: 'KM1' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 0, x: 180, rep: 'F1' },
    { id: 'f2', label: 'F2 · Primaire T1', key: 'mcb2p', rail: 1, x: 52, rep: 'F2' },
    { id: 't1', label: 'T1 · Transformateur 400/24 V', key: 'trafo', rail: 1, x: 116, rep: 'T1' },
    { id: 'f3', label: 'F3 · Secondaire 24 V', key: 'mcb1p', rail: 1, x: 204, rep: 'F3' },
    { id: 'ka1', label: 'KA1 · Relais de mémorisation (1-2 bobine · 3-4 contact NO)', key: 'timer', rail: 1, x: 240, rep: 'KA1' },
    ...X1(48),
    ...bornierX2(230),
    flotteur('sf1', 'SF1', 'Flotteur niveau haut · marche', 310),
    flotteur('sf2', 'SF2', 'Flotteur niveau bas · arrêt', 400),
    flotteur('sf3', 'SF3', 'Flotteur niveau très haut · alarme', 490),
  ],
  annexItems: [],
  recvItems: [],
  liaisons: [
    // ---- puissance ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),
    // ---- alimentation de la commande 24 V ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.N', 'L2'),
    L('f2.2', 't1.400', 'L1'), L('f2.N', 't1.0', 'L2'),
    L('t1.24', 'f3.1', 'C'), L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_1.a', 'C'),
    // ---- commande : marche forcée, départ vers les flotteurs ----
    L('x2_2.a', 'x2_4.a', 'C'), L('x2_3.a', 'km1.A1', 'C'),
    // ---- commande automatique : flotteur haut, mémorisation KA1, flotteur bas ----
    L('x2_5.a', 'ka1.1', 'C'), L('ka1.1', 'km1.A1', 'C'),
    L('x2_6.a', 'ka1.3', 'C'), L('ka1.4', 'ka1.1', 'C'),
    L('ka1.2', 'x2_9.a', 'C0'), L('km1.A2', 'ka1.2', 'C0'),
    // ---- signalisation ----
    L('x2_2.a', 'km1.13', 'C'), L('km1.14', 'x2_7.a', 'C'),
    L('f1.97', 'f3.2', 'C'), L('f1.98', 'x2_8.a', 'C'),
    // ---- 0 V et mise à la terre du secondaire ----
    L('t1.0V', 'x2_9.a', 'C0'), L('x2_9.a', 'x1_5.a', 'PE'),
    // ---- porte : arrêt, marche forcée, voyants ----
    L('x2_1.b', 'S1.21', 'C', 'door'), L('S1.22', 'S2.13', 'C', 'door'), L('S1.22', 'x2_2.b', 'C', 'door'),
    L('S2.14', 'x2_3.b', 'C', 'door'),
    L('x2_7.b', 'H1.X1', 'C', 'door'), L('x2_8.b', 'H2.X1', 'C', 'door'),
    L('x2_9.b', 'H1.X2', 'C0', 'door'), L('H1.X2', 'H2.X2', 'C0', 'door'),
    // ---- fosse : trois flotteurs, communs pontés en boîte de jonction ----
    L('x2_4.b', 'sf1.13', 'C', 'door'), L('sf1.13', 'sf2.13', 'C', 'door'), L('sf2.13', 'sf3.13', 'C', 'door'),
    L('sf1.14', 'x2_5.b', 'C', 'door'), L('sf2.14', 'x2_6.b', 'C', 'door'), L('sf3.14', 'x2_8.b', 'C', 'door'),
    // ---- câblage installateur (réseau et câble de la pompe) ----
    L('RES.L1', 'x1_1.b', 'L1', 'pre'), L('RES.L2', 'x1_2.b', 'L2', 'pre'), L('RES.L3', 'x1_3.b', 'L3', 'pre'),
    L('RES.N', 'x1_4.b', 'N', 'pre'), L('RES.PE', 'x1_5.b', 'PE', 'pre'),
    L('x1_6.b', 'M.U1', 'L1', 'pre'), L('x1_7.b', 'M.V1', 'L2', 'pre'), L('x1_8.b', 'M.W1', 'L3', 'pre'),
    L('x1_9.b', 'M.PE', 'PE', 'pre'),
  ],
  nets: {
    // bornier de puissance
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'L2', live: 'always' }, 'x1_2.b': { net: 'L2', live: 'always' },
    'x1_3.a': { net: 'L3', live: 'always' }, 'x1_3.b': { net: 'L3', live: 'always' },
    'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
    'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
    'x1_6.a': { net: 'U', live: 'run' }, 'x1_6.b': { net: 'U', live: 'run' },
    'x1_7.a': { net: 'V', live: 'run' }, 'x1_7.b': { net: 'V', live: 'run' },
    'x1_8.a': { net: 'W', live: 'run' }, 'x1_8.b': { net: 'W', live: 'run' },
    'x1_9.a': { net: 'PE', live: 'always' }, 'x1_9.b': { net: 'PE', live: 'always' },
    // disjoncteur moteur
    'q1.1': { net: 'L1', live: 'always' }, 'q1.3': { net: 'L2', live: 'always' }, 'q1.5': { net: 'L3', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.4': { net: 'L2', live: 'q1' }, 'q1.6': { net: 'L3', live: 'q1' },
    // contacteur
    'km1.1': { net: 'L1', live: 'q1' }, 'km1.3': { net: 'L2', live: 'q1' }, 'km1.5': { net: 'L3', live: 'q1' },
    'km1.2': { net: 'U', live: 'run' }, 'km1.4': { net: 'V', live: 'run' }, 'km1.6': { net: 'W', live: 'run' },
    'km1.13': { net: 'C', live: 'ctl' }, 'km1.14': { net: 'C', live: 'km1' },
    'km1.A1': { net: 'C', live: 'km1' }, 'km1.A2': { net: 'C0', live: 'always' },
    // relais de mémorisation
    'ka1.1': { net: 'C', live: 'km1' }, 'ka1.2': { net: 'C0', live: 'always' },
    'ka1.3': { net: 'C', live: 'ctl' }, 'ka1.4': { net: 'C', live: 'km1' },
    // relais thermique
    'f1.1': { net: 'U', live: 'run' }, 'f1.3': { net: 'V', live: 'run' }, 'f1.5': { net: 'W', live: 'run' },
    'f1.2': { net: 'U', live: 'run' }, 'f1.4': { net: 'V', live: 'run' }, 'f1.6': { net: 'W', live: 'run' },
    'f1.95': { net: 'C', live: 'f3' }, 'f1.96': { net: 'C', live: 'ctl' },
    'f1.97': { net: 'C', live: 'f3' }, 'f1.98': { net: 'C', live: 'off' },
    // protections et transformateur de commande
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'L1', live: 'f2' },
    't1.400': { net: 'L1', live: 'f2' }, 't1.0': { net: 'L2', live: 'f2' }, 't1.230': { net: 'C0', live: 'always' },
    't1.24': { net: 'C', live: 'f2' }, 't1.0V': { net: 'C0', live: 'always' }, 't1.48': { net: 'C0', live: 'always' },
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    // bornier de commande
    'x2_1.a': { net: 'C', live: 'ctl' }, 'x2_1.b': { net: 'C', live: 'ctl' },
    'x2_2.a': { net: 'C', live: 'ctl' }, 'x2_2.b': { net: 'C', live: 'ctl' },
    'x2_3.a': { net: 'C', live: 'ctl' }, 'x2_3.b': { net: 'C', live: 'ctl' },
    'x2_4.a': { net: 'C', live: 'ctl' }, 'x2_4.b': { net: 'C', live: 'ctl' },
    'x2_5.a': { net: 'C', live: 'ctl' }, 'x2_5.b': { net: 'C', live: 'ctl' },
    'x2_6.a': { net: 'C', live: 'ctl' }, 'x2_6.b': { net: 'C', live: 'ctl' },
    'x2_7.a': { net: 'C', live: 'km1' }, 'x2_7.b': { net: 'C', live: 'km1' },
    'x2_8.a': { net: 'C', live: 'off' }, 'x2_8.b': { net: 'C', live: 'off' },
    'x2_9.a': { net: 'C0', live: 'always' }, 'x2_9.b': { net: 'C0', live: 'always' },
    // flotteurs de la fosse
    'sf1.13': { net: 'C', live: 'ctl' }, 'sf1.14': { net: 'C', live: 'ctl' },
    'sf2.13': { net: 'C', live: 'ctl' }, 'sf2.14': { net: 'C', live: 'ctl' },
    'sf3.13': { net: 'C', live: 'ctl' }, 'sf3.14': { net: 'C', live: 'off' },
    // moteur et coffret de porte
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S1.21': { net: 'C', live: 'ctl' }, 'S1.22': { net: 'C', live: 'ctl' },
    'S2.13': { net: 'C', live: 'ctl' }, 'S2.14': { net: 'C', live: 'ctl' },
    'H1.X1': { net: 'C', live: 'km1' }, 'H1.X2': { net: 'C0', live: 'always' },
    'H2.X1': { net: 'C', live: 'off' }, 'H2.X2': { net: 'C0', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'flot',
      title: 'Essai des flotteurs à l\'ohmmètre',
      how: 'Multimètre en Ω entre X2:4 et X2:5, puis entre X2:4 et X2:6 : bascule chaque flotteur à la main et vérifie que le contact se ferme dans le bon sens (SF1 se ferme au niveau haut, SF2 reste fermé tant que le niveau est au-dessus du bas).',
      expected: '< 2 Ω flotteur basculé, OL au repos',
    },
    {
      id: 'mem',
      title: 'Contrôle de l\'auto-maintien de KA1',
      how: 'Multimètre en Ω entre X2:6 et le nœud de bobine (KA1:1) : le chemin doit passer par le contact 3-4 de KA1, en série avec le flotteur bas SF2.',
      expected: 'continuité seulement quand le contact 3-4 est fermé',
    },
    {
      id: 'sens',
      title: 'Vérification du sens de rotation de la pompe',
      how: 'Après un bref essai, compare le débit obtenu au débit attendu : une pompe qui tourne à l\'envers refoule très peu. Le cas échéant, permuter deux phases sur X1:6 et X1:8.',
      expected: 'débit nominal, aucune vibration anormale',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du PE jusqu\'à la carcasse de la pompe', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'M.PE', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement U1 / PE sous 500 V (pompe immergée)', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'M.U1', b: 'M.PE', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'renr', title: 'Résistance d\'un enroulement (U1 – W2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.W2', min: 3, max: 6, unit: 'Ω',
    },
    {
      id: 'rflot', title: 'Continuité de la boucle du flotteur haut (X2:4 – X2:5)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'x2_4.a', b: 'x2_5.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'u400', title: 'Tension composée en aval de Q1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'q1.2', b: 'q1.4', min: 380, max: 420, unit: 'V', when: 'run',
    },
    {
      id: 'u24', title: 'Tension de commande au secondaire de T1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 't1.24', b: 't1.0V', min: 22, max: 26, unit: 'V', when: 'ctl',
    },
    {
      id: 'iL', title: 'Courant de ligne à la pince (KM1:2 → F1:1)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>f1.1', min: 1.8, max: 3, unit: 'A', when: 'run',
    },
    {
      id: 'n', title: 'Vitesse de rotation au tachymètre', stage: 'sousTension',
      instrument: 'tach', dial: 'tr/min', min: 2700, max: 3000, unit: 'tr/min', when: 'run',
    },
  ],
  faults: [
    { id: 's1', title: 'Contact NF de S1 (21-22) resté ouvert', symptom: 'Ni la marche forcée ni l\'automatique ne démarrent la pompe, alors que 24 V sont bien présents sur X2:1.', fix: 'Remplacer le bloc de contact NF de S1 et refaire la continuité X2:1 – X2:2.' },
    { id: 'a2', title: 'Fil A2 de la bobine KM1 desserré', symptom: 'KM1 vibre sans tenir dès que la demande arrive : la pompe démarre par à-coups.', fix: 'Resserrer A2 et refaire la continuité KM1 A2 – KA1:2 – X2:9.' },
    { id: 'l2', title: 'Phase L2 coupée entre F1:4 et X1:7', symptom: 'La pompe ronfle sans tourner, ne relève plus, courant anormal sur L1 et L3, F1 finit par déclencher.', fix: 'Refaire la liaison F1:4 → X1:7, puis réarmer F1.' },
  ],
  quiz: [
    { q: 'Pourquoi mémoriser la demande du flotteur haut par le relais KA1 ?', options: ['Pour vider la fosse jusqu\'au niveau bas au lieu de battre autour du niveau haut', 'Pour économiser un flotteur', 'Pour protéger le moteur contre les surcharges'], answer: 0 },
    { q: 'En marche forcée, quel est le risque principal ?', options: ['Faire tourner la pompe à sec et détruire la garniture', 'Déclencher le différentiel de l\'installation', 'Inverser le sens de rotation'], answer: 0 },
    { q: 'Pourquoi les flotteurs sont-ils alimentés en 24 V et non en 230 V ?', options: ['Pour que les contacts durent plus longtemps', 'Parce qu\'ils sont immergés et manipulables : la très basse tension limite le risque électrique', 'Parce que le contacteur l\'impose'], answer: 1 },
  ],
  motor: { P: 1100, U: 400, In: 2.6, n: 2850, ns: 3000, cosPhi: 0.82 },
  station: true,
  hasMotor: true,
};
