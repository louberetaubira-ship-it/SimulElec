/**
 * TP · Inversion de sens de rotation (deux contacteurs verrouillés).
 *
 * Puissance : Q1 GV2 → KM1 (marche avant) et KM2 (marche arrière, L1 et L3 croisées),
 * départs réunis sur le relais thermique F1 puis sur le bornier X1.
 * Commande 24 V par T1 (F2 au primaire, F3 au secondaire), coffret de porte XALD
 * (S1 arrêt NC, S2 marche avant NO, H1 marche, H2 défaut) et une boîte à boutons
 * S3 « marche arrière » en porte.
 *
 * Correspondances avec le moteur de simulation (identifiants imposés) :
 *  q1 = disjoncteur moteur · f2 = protection du primaire · f3 = protection du secondaire ·
 *  f1 = relais thermique · km1 = contacteur de marche avant (celui que S2 enclenche).
 *  Le simulateur ne gère qu'un seul contacteur : la marche arrière est câblée, mesurée
 *  et verrouillée, mais c'est KM1 qui est manœuvré à l'essai (voir `docs`).
 *
 * Les contacts auxiliaires NF du verrouillage sont portés par les blocs additifs
 * LADN11 clipsés sur chaque contacteur : ils sont figurés par deux appareils du rail 2
 * (`kx1` = bloc de KM1, `kx2` = bloc de KM2) dont les bornes 21-22 sont le contact NF.
 */
import type { Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, X1, X2 } from './common';

/** Boîte à boutons « marche arrière » posée en porte, sous le coffret XALD. */
const S3_BOX: Slot = {
  id: 's3',
  label: 'S3 · Boîte à boutons marche arrière',
  key: 'stopstart',
  rail: null,
  x: 452,
  y: 330,
  w: 78,
  h: 116,
  rep: 'S3',
};

export const TP_INVERSION: TpDefinition = {
  id: 'inversion',
  title: 'Inversion de sens de rotation',
  level: 'Tle Bac Pro MELEC',
  family: 'ind',
  scene: 'ind',
  annex: 'door',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Deux contacteurs KM1 / KM2 croisant deux phases, verrouillage électrique par contacts NF croisés (blocs LADN11) et verrouillage mécanique LAD4CM, commande 24 V par T1, trois boutons (arrêt S1, avant S2, arrière S3).',
  situation:
    'Un convoyeur de l\'atelier doit pouvoir avancer et reculer. Tu réalises un départ moteur à deux sens de marche : KM1 pour la marche avant, KM2 pour la marche arrière, avec un croisement de deux phases à l\'entrée de KM2 et un double verrouillage — électrique par contacts NF croisés, mécanique par bloc LAD4CM — interdisant l\'appel simultané des deux contacteurs. Tu câbles, tu contrôles hors tension, puis tu mets en service.',
  plaque: {
    P: '1,5 kW',
    U: '400 V Y · 50 Hz',
    In: '3,3 A',
    n: '1440 tr/min',
    'cos φ': '0,80',
    Pôles: '4',
    Classe: 'F · IP 55',
    Service: 'S4 · démarrages fréquents',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '3 × 400 V + N + PE, arrivée sur bornier X1' },
    { k: 'Puissance', v: 'Q1 GV2 réglé à In = 3,3 A · KM1 avant · KM2 arrière (L1 et L3 croisées) · F1 LRD classe 10 sur le départ commun' },
    { k: 'Commande', v: '24 V~ par T1 400/24 V · 63 VA, F2 bipolaire au primaire, F3 unipolaire au secondaire' },
    { k: 'Platine', v: '3 rails DIN · coffret de porte XALD + boîte à boutons S3' },
    { k: 'Rail 1', v: 'Q1 · KM1 · KM2 · F1' },
    { k: 'Rail 2', v: 'F2 · T1 · F3 · blocs auxiliaires LADN11 de KM1 et de KM2' },
    { k: 'Rail 3', v: 'X1 bornier puissance (9 bornes) · X2 bornier commande (7 bornes)' },
    { k: 'Verrouillage électrique', v: 'contact NF 21-22 du bloc de KM2 en série avec la bobine de KM1, et réciproquement' },
    { k: 'Verrouillage mécanique', v: 'bloc LAD4CM entre les deux contacteurs : un seul peut coller à la fois' },
    { k: 'Auto-maintien', v: 'KM1 13-14 pour l\'avant, KM2 13-14 pour l\'arrière' },
    { k: 'Porte', v: 'S1 arrêt NC · S2 avant NO · S3 arrière NO · H1 marche · H2 défaut thermique' },
    { k: 'Défaut thermique', v: 'F1 95-96 coupe les deux bobines, F1 97-98 allume H2' },
    { k: '0 V', v: 'point neutre du secondaire relié à la terre sur X1:5' },
    { k: 'Avant mise en service', v: 'consignation · VAT · continuité PE · isolement 500 V · essai du verrouillage' },
  ],
  postes: [
    {
      id: 'q1',
      name: 'Q1 · Disjoncteur moteur',
      need: 'Protection magnéto-thermique du moteur, réglable autour de In = 3,3 A',
      options: [
        { key: 'motorcb', ref: 'GV2ME08', spec: '2,5 – 4 A · déclencheur magnétique 51 A', ok: true, why: 'In = 3,3 A se règle dans la plage 2,5 – 4 A, et le magnétique laisse passer la pointe d\'inversion.' },
        { key: 'motorcb', ref: 'GV2ME06', spec: '1 – 1,6 A', why: 'Plage trop basse : le disjoncteur déclenchera dès le premier démarrage.' },
        { key: 'motorcb', ref: 'GV2ME14', spec: '6 – 10 A', why: 'Le réglage minimal (6 A) est supérieur à In : le moteur n\'est pas protégé.' },
      ],
    },
    {
      id: 'km',
      name: 'KM1 / KM2 · Contacteurs',
      need: 'Deux contacteurs identiques en AC-3, bobines 24 V~, aptes au verrouillage mécanique',
      options: [
        { key: 'kontakt', ref: '2 × LC1D09B7 + LAD4CM', spec: '9 A AC-3 · bobines 24 V~ · bloc de verrouillage', ok: true, why: 'AC-3 9 A ≥ 3,3 A, bobines à la tension de commande, et la paire identique accepte le bloc de verrouillage mécanique.' },
        { key: 'kontakt', ref: '2 × LC1D09P7', spec: '9 A AC-3 · bobines 230 V~', why: 'Bobines 230 V alors que la commande est en 24 V : les contacteurs ne colleront pas.' },
        { key: 'kontakt', ref: 'LC1D09B7 + LC1D32B7', spec: '9 A et 32 A · bobines 24 V~', why: 'Deux calibres différents : le bloc de verrouillage mécanique ne se monte pas, et l\'un des deux sens est surdimensionné.' },
      ],
    },
    {
      id: 'aux',
      name: 'Blocs de contacts auxiliaires',
      need: 'Un contact NF par contacteur pour le verrouillage électrique croisé',
      options: [
        { key: 'stopstart', ref: '2 × LADN11', spec: '1 NO + 1 NF additionnels par contacteur', ok: true, why: 'Le contact NF 21-22 de chaque bloc ouvre la bobine de l\'autre contacteur ; le NO reste disponible.' },
        { key: 'stopstart', ref: '2 × LADN20', spec: '2 NO par contacteur', why: 'Aucun contact NF : le verrouillage électrique est impossible.' },
        { key: 'stopstart', ref: 'Aucun bloc additif', spec: 'contacts intégrés 13-14 seulement', why: 'Le contact intégré 13-14 est déjà utilisé par l\'auto-maintien : il ne reste rien pour verrouiller.' },
      ],
    },
    {
      id: 'f1',
      name: 'F1 · Relais thermique',
      need: 'Protection contre les surcharges du départ commun, réglée à In = 3,3 A',
      options: [
        { key: 'therm', ref: 'LRD08', spec: '2,5 – 4 A · classe 10', ok: true, why: '3,3 A se règle dans la plage et la classe 10 convient à un démarrage direct, même avec des inversions.' },
        { key: 'therm', ref: 'LRD06', spec: '1 – 1,6 A · classe 10', why: 'Plage trop basse : déclenchement intempestif à chaque inversion.' },
        { key: 'therm', ref: 'LRD12', spec: '5,5 – 8 A · classe 10', why: 'Réglage minimal 5,5 A > In : la surcharge ne sera jamais vue.' },
      ],
    },
    {
      id: 't1',
      name: 'T1 · Transformateur de commande',
      need: 'Abaisser 400 V en 24 V pour deux bobines de 7 VA et deux voyants',
      options: [
        { key: 'trafo', ref: 'ABL6TS06U', spec: '400/24 V · 63 VA', ok: true, why: 'Primaire 400 V, secondaire 24 V, et 63 VA absorbent l\'appel de bobine (≈ 70 VA) d\'un seul contacteur à la fois.' },
        { key: 'trafo', ref: 'ABL6TS02U', spec: '400/24 V · 25 VA', half: true, why: 'Puissance trop juste : la chute de tension à l\'appel fait vibrer le contacteur.' },
        { key: 'trafo', ref: 'ABL6TS10U', spec: '230/12 V · 100 VA', why: 'Ni le primaire (230 V) ni le secondaire (12 V) ne correspondent au cahier des charges.' },
      ],
    },
    {
      id: 'cond',
      name: 'Section des conducteurs',
      need: 'Puissance jusqu\'à 3,3 A en armoire, commande 24 V, PE du moteur',
      options: [
        { key: 'termred', ref: 'H07V-K 2,5 mm² puissance · 1,5 mm² commande', spec: 'PE 2,5 mm² vert-jaune', ok: true, why: 'Sections minimales usuelles en armoire industrielle : 2,5 mm² pour la puissance et le PE, 1,5 mm² pour la commande.' },
        { key: 'termred', ref: 'H07V-K 1,5 mm² partout', spec: 'y compris puissance et PE', why: 'La liaison de puissance et le PE doivent être en 2,5 mm² : le 1,5 mm² n\'est pas admis ici.' },
        { key: 'termred', ref: 'H07V-K 6 mm² partout', spec: 'section unique', half: true, why: 'Électriquement sûr, mais impossible à raccorder proprement sur les bornes de commande et coûteux.' },
      ],
    },
    {
      id: 'box',
      name: 'S1 / S2 / S3 · Organes de commande',
      need: 'Un arrêt à contact NF, deux marches à contacts NO, deux voyants 24 V',
      options: [
        { key: 'stopstart', ref: 'XALD + boîte S3', spec: 'S1 arrêt NF · S2 avant NO · S3 arrière NO · H1 vert · H2 rouge 24 V', ok: true, why: 'Arrêt à ouverture (sécurité positive), une marche par sens, code couleur NF EN 60073 respecté.' },
        { key: 'stopstart', ref: '3 boutons NO', spec: 'arrêt également en NO', why: 'Arrêt en NO : une rupture de fil n\'arrête plus le moteur, c\'est interdit.' },
        { key: 'stopstart', ref: 'Commutateur 2 positions seul', spec: 'avant / arrière, sans arrêt', why: 'Aucune position d\'arrêt franche ni possibilité de temps mort entre les deux sens.' },
      ],
    },
    {
      id: 'x',
      name: 'X1 / X2 · Borniers',
      need: 'X1 : arrivée réseau et départ moteur ; X2 : liaisons de porte et boîte S3',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE', spec: 'X1 9 bornes · X2 7 bornes repérées', ok: true, why: 'Sections et repérage conformes, et toute liaison sortant de l\'armoire passe par une borne repérée.' },
        { key: 'termgrey', ref: 'UT 1,5 partout', spec: 'bornes 1,5 mm²', why: 'La puissance est en 2,5 mm² : les bornes 1,5 ne conviennent pas pour X1.' },
        { key: 'termgrey', ref: 'Dominos', spec: 'connecteurs à vis dans la goulotte', why: 'Interdit en armoire : les raccordements se font sur bornes montées sur rail.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur moteur', key: 'motorcb', rail: 0, x: 52, rep: 'Q1' },
    { id: 'km1', label: 'KM1 · Marche avant', key: 'kontakt', rail: 0, x: 112, rep: 'KM1' },
    { id: 'km2', label: 'KM2 · Marche arrière', key: 'kontakt', rail: 0, x: 180, rep: 'KM2' },
    { id: 'f1', label: 'F1 · Relais thermique', key: 'therm', rail: 0, x: 248, rep: 'F1' },
    { id: 'f2', label: 'F2 · Primaire T1', key: 'mcb2p', rail: 1, x: 52, rep: 'F2' },
    { id: 't1', label: 'T1 · Transformateur 400/24 V', key: 'trafo', rail: 1, x: 116, rep: 'T1' },
    { id: 'f3', label: 'F3 · Secondaire 24 V', key: 'mcb1p', rail: 1, x: 204, rep: 'F3' },
    { id: 'kx1', label: 'KM1 · Bloc auxiliaire LADN11 (NF 21-22)', key: 'stopstart', rail: 1, x: 240, rep: 'KM1' },
    { id: 'kx2', label: 'KM2 · Bloc auxiliaire LADN11 (NF 21-22)', key: 'stopstart', rail: 1, x: 308, rep: 'KM2' },
    ...X1(52),
    ...X2(238, 7, 2, { subs: ['S1', 'S1/S2', 'S2 av', 'S3 ar', 'H1', 'H2', '0V'] }),
    S3_BOX,
  ],
  annexItems: [],
  recvItems: [],
  liaisons: [
    // ---- puissance : arrivée et disjoncteur moteur ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.3', 'L2'), L('x1_3.a', 'q1.5', 'L3'),
    // ---- KM1 : marche avant, phases dans l'ordre ----
    L('q1.2', 'km1.1', 'L1'), L('q1.4', 'km1.3', 'L2'), L('q1.6', 'km1.5', 'L3'),
    // ---- KM2 : marche arrière, L1 et L3 croisées ----
    L('q1.2', 'km2.5', 'L1'), L('q1.4', 'km2.3', 'L2'), L('q1.6', 'km2.1', 'L3'),
    // ---- départs réunis puis relais thermique ----
    L('km2.2', 'km1.2', 'L1'), L('km2.4', 'km1.4', 'L2'), L('km2.6', 'km1.6', 'L3'),
    L('km1.2', 'f1.1', 'L1'), L('km1.4', 'f1.3', 'L2'), L('km1.6', 'f1.5', 'L3'),
    L('f1.2', 'x1_6.a', 'L1'), L('f1.4', 'x1_7.a', 'L2'), L('f1.6', 'x1_8.a', 'L3'),
    L('x1_5.a', 'x1_9.a', 'PE'),
    // ---- alimentation de la commande 24 V ----
    L('q1.2', 'f2.1', 'L1'), L('q1.4', 'f2.N', 'L2'),
    L('f2.2', 't1.400', 'L1'), L('f2.N', 't1.0', 'L2'),
    L('t1.24', 'f3.1', 'C'), L('f3.2', 'f1.95', 'C'), L('f1.96', 'x2_1.a', 'C'),
    // ---- commande : marche avant (KM1) ----
    L('x2_2.a', 'km1.13', 'C'), L('km1.13', 'km2.13', 'C'),
    L('km1.14', 'x2_3.a', 'C'), L('x2_3.a', 'kx2.21', 'C'), L('kx2.22', 'km1.A1', 'C'),
    // ---- commande : marche arrière (KM2) ----
    L('km2.14', 'x2_4.a', 'C'), L('x2_4.a', 'kx1.21', 'C'), L('kx1.22', 'km2.A1', 'C'),
    // ---- 0 V des bobines ----
    L('km1.A2', 'x2_7.a', 'C0'), L('km2.A2', 'km1.A2', 'C0'),
    // ---- signalisation ----
    L('km1.14', 'x2_5.a', 'C'), L('km2.14', 'x2_5.a', 'C'),
    L('f1.97', 'f3.2', 'C'), L('f1.98', 'x2_6.a', 'C'),
    // ---- 0 V et mise à la terre du secondaire ----
    L('t1.0V', 'x2_7.a', 'C0'), L('x2_7.a', 'x1_5.a', 'PE'),
    // ---- porte : arrêt, marche avant, marche arrière, voyants ----
    L('x2_1.b', 'S1.21', 'C', 'door'),
    L('S1.22', 'S2.13', 'C', 'door'), L('S1.22', 's3.13', 'C', 'door'), L('S1.22', 'x2_2.b', 'C', 'door'),
    L('S2.14', 'x2_3.b', 'C', 'door'), L('s3.14', 'x2_4.b', 'C', 'door'),
    L('x2_5.b', 'H1.X1', 'C', 'door'), L('x2_6.b', 'H2.X1', 'C', 'door'),
    L('x2_7.b', 'H1.X2', 'C0', 'door'), L('H1.X2', 'H2.X2', 'C0', 'door'),
    // ---- câblage installateur (réseau et câble moteur) ----
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
    // KM1 · marche avant
    'km1.1': { net: 'L1', live: 'q1' }, 'km1.3': { net: 'L2', live: 'q1' }, 'km1.5': { net: 'L3', live: 'q1' },
    'km1.2': { net: 'U', live: 'run' }, 'km1.4': { net: 'V', live: 'run' }, 'km1.6': { net: 'W', live: 'run' },
    'km1.13': { net: 'C', live: 'ctl' }, 'km1.14': { net: 'C', live: 'km1' },
    'km1.A1': { net: 'C', live: 'km1' }, 'km1.A2': { net: 'C0', live: 'always' },
    // KM2 · marche arrière (L1 et L3 croisées)
    'km2.1': { net: 'L3', live: 'q1' }, 'km2.3': { net: 'L2', live: 'q1' }, 'km2.5': { net: 'L1', live: 'q1' },
    'km2.2': { net: 'U', live: 'run' }, 'km2.4': { net: 'V', live: 'run' }, 'km2.6': { net: 'W', live: 'run' },
    'km2.13': { net: 'C', live: 'ctl' }, 'km2.14': { net: 'C', live: 'off' },
    'km2.A1': { net: 'C', live: 'off' }, 'km2.A2': { net: 'C0', live: 'always' },
    // blocs auxiliaires LADN11 (contacts NF 21-22 croisés, NO 13-14 disponibles)
    'kx1.21': { net: 'C', live: 'ctl' }, 'kx1.22': { net: 'C', live: 'ctl' },
    'kx1.13': { net: 'C', live: 'ctl' }, 'kx1.14': { net: 'C', live: 'km1' },
    'kx2.21': { net: 'C', live: 'ctl' }, 'kx2.22': { net: 'C', live: 'ctl' },
    'kx2.13': { net: 'C', live: 'ctl' }, 'kx2.14': { net: 'C', live: 'off' },
    // relais thermique
    'f1.1': { net: 'U', live: 'run' }, 'f1.3': { net: 'V', live: 'run' }, 'f1.5': { net: 'W', live: 'run' },
    'f1.2': { net: 'U', live: 'run' }, 'f1.4': { net: 'V', live: 'run' }, 'f1.6': { net: 'W', live: 'run' },
    'f1.95': { net: 'C', live: 'f3' }, 'f1.96': { net: 'C', live: 'ctl' },
    'f1.97': { net: 'C', live: 'f3' }, 'f1.98': { net: 'C', live: 'off' },
    // protection du primaire
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'L2', live: 'q1' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'L1', live: 'f2' },
    // transformateur
    't1.400': { net: 'L1', live: 'f2' }, 't1.0': { net: 'L2', live: 'f2' }, 't1.230': { net: 'C0', live: 'always' },
    't1.24': { net: 'C', live: 'f2' }, 't1.0V': { net: 'C0', live: 'always' }, 't1.48': { net: 'C0', live: 'always' },
    // protection du secondaire
    'f3.1': { net: 'C', live: 'f2' }, 'f3.2': { net: 'C', live: 'f3' },
    // bornier de commande
    'x2_1.a': { net: 'C', live: 'ctl' }, 'x2_1.b': { net: 'C', live: 'ctl' },
    'x2_2.a': { net: 'C', live: 'ctl' }, 'x2_2.b': { net: 'C', live: 'ctl' },
    'x2_3.a': { net: 'C', live: 'ctl' }, 'x2_3.b': { net: 'C', live: 'ctl' },
    'x2_4.a': { net: 'C', live: 'ctl' }, 'x2_4.b': { net: 'C', live: 'ctl' },
    'x2_5.a': { net: 'C', live: 'km1' }, 'x2_5.b': { net: 'C', live: 'km1' },
    'x2_6.a': { net: 'C', live: 'off' }, 'x2_6.b': { net: 'C', live: 'off' },
    'x2_7.a': { net: 'C0', live: 'always' }, 'x2_7.b': { net: 'C0', live: 'always' },
    // moteur, coffret de porte et boîte à boutons S3
    'M.U1': { net: 'U', live: 'run' }, 'M.V1': { net: 'V', live: 'run' }, 'M.W1': { net: 'W', live: 'run' },
    'M.PE': { net: 'PE', live: 'run' },
    'M.U2': { net: 'M2', live: 'run' }, 'M.V2': { net: 'M2', live: 'run' }, 'M.W2': { net: 'M2', live: 'run' },
    'S1.21': { net: 'C', live: 'ctl' }, 'S1.22': { net: 'C', live: 'ctl' },
    'S2.13': { net: 'C', live: 'ctl' }, 'S2.14': { net: 'C', live: 'ctl' },
    's3.13': { net: 'C', live: 'ctl' }, 's3.14': { net: 'C', live: 'ctl' },
    's3.21': { net: 'C', live: 'ctl' }, 's3.22': { net: 'C', live: 'ctl' },
    'H1.X1': { net: 'C', live: 'km1' }, 'H1.X2': { net: 'C0', live: 'always' },
    'H2.X1': { net: 'C', live: 'off' }, 'H2.X2': { net: 'C0', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'verr',
      title: 'Essai du verrouillage électrique',
      how: 'Multimètre en Ω sur la bobine de KM1 (kx2:22 – KM1 A1) : enfonce à la main l\'armature de KM2, le contact NF 21-22 de son bloc doit ouvrir le circuit. Recommence en croisant (KM1 enfoncé, bobine de KM2).',
      expected: 'continuité au repos, circuit ouvert (OL) dès que l\'autre contacteur est enfoncé',
    },
    {
      id: 'meca',
      title: 'Essai du verrouillage mécanique',
      how: 'Contacteurs hors tension : enfonce l\'armature de KM1 à la main, puis essaie d\'enfoncer celle de KM2. Le bloc LAD4CM doit s\'y opposer.',
      expected: 'un seul contacteur peut être enfoncé à la fois',
    },
    {
      id: 'croise',
      title: 'Vérification du croisement des phases',
      how: 'Multimètre en Ω, appareils au repos : contrôle que l\'entrée 1 de KM2 est reliée à la même phase que l\'entrée 5 de KM1 (L3) et l\'entrée 5 de KM2 à L1.',
      expected: 'continuité q1:6 – km2:1 et q1:2 – km2:5, aucune continuité entre phases',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du PE jusqu\'à la carcasse moteur', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_5.a', b: 'M.PE', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement U1 / PE sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'M.U1', b: 'M.PE', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'renr', title: 'Résistance d\'un enroulement (U1 – W2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'M.U1', b: 'M.W2', min: 3, max: 6, unit: 'Ω',
    },
    {
      id: 'rverr', title: 'Continuité du contact NF de verrouillage de KM2 (21-22)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'kx2.21', b: 'kx2.22', min: 0, max: 2, unit: 'Ω',
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
      instrument: 'clamp', dial: 'A~', wire: 'km1.2>f1.1', min: 2.5, max: 4, unit: 'A', when: 'run',
    },
    {
      id: 'n', title: 'Vitesse de rotation au tachymètre', stage: 'sousTension',
      instrument: 'tach', dial: 'tr/min', min: 1300, max: 1500, unit: 'tr/min', when: 'run',
    },
  ],
  faults: [
    { id: 'a2', title: 'Fil A2 de la bobine KM1 desserré', symptom: 'KM1 vibre et ne tient pas à l\'appui sur S2 ; la marche arrière se comporte normalement.', fix: 'Resserrer A2 et refaire la continuité KM1 A2 – X2:7.' },
    { id: 'x2', title: 'Fil kx2:22 → KM1 A1 débranché (sortie du verrouillage)', symptom: 'Rien ne se passe à l\'appui sur S2, alors que les 24 V sont bien présents sur X2:3 et sur le contact NF de KM2.', fix: 'Reconnecter la sortie 22 du bloc auxiliaire de KM2 sur la borne A1 de KM1.' },
    { id: 'l2', title: 'Phase L2 coupée entre F1:4 et X1:7', symptom: 'Le moteur ronfle sans démarrer dans les deux sens, courant anormal sur L1 et L3, F1 finit par déclencher.', fix: 'Refaire la liaison F1:4 → X1:7, puis réarmer F1.' },
  ],
  quiz: [
    { q: 'Comment obtient-on l\'inversion du sens de rotation d\'un moteur asynchrone triphasé ?', options: ['En inversant deux phases', 'En inversant les trois phases', 'En inversant le neutre et une phase'], answer: 0 },
    { q: 'Pourquoi doubler le verrouillage électrique par un verrouillage mécanique ?', options: ['Pour gagner du temps au câblage', 'Pour interdire le collage simultané même si un contact reste soudé', 'Pour économiser un contact auxiliaire'], answer: 1 },
    { q: 'Où place-t-on le relais thermique F1 ?', options: ['En amont de Q1', 'En aval des deux contacteurs, sur le départ moteur commun', 'Dans le circuit de commande 24 V'], answer: 1 },
  ],
  motor: { P: 1500, U: 400, In: 3.3, n: 1440, ns: 1500, cosPhi: 0.8 },
  station: true,
  hasMotor: true,
};
