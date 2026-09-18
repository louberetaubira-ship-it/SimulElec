/**
 * TP · Installation solaire autonome — Auberge du Charmant Som (24 V off-grid).
 *
 * TP « cycle complet » photovoltaïque autonome, joué en NATIF dans le moteur SimulElec
 * (les mêmes 12 étapes que la perceuse radiale), et non plus dans une page HTML séparée.
 * Le dimensionnement validé (référence `public/tp/pv-autonome.html`) est replié dans la
 * PRÉPARATION : bilan des récepteurs (Ej ≈ 4602 Wh/j), puissance simultanée 2300 W,
 * production visée Epv ≈ 7080 Wh/j, parc 24 V · 1200 Ah, couplage 3S4P de 12 modules,
 * MPPT 150/70, onduleur/chargeur MultiPlus 24/3000 (2400 W), fusible batterie MEGA 125 A.
 *
 * ------------------------------------------------------------------ topologie / moteur
 * Le moteur de simulation est « à démarrage moteur » : il connaît un sectionneur général
 * `q1`, deux protections en série `f2` et `f3`, un organe `km1` qui « colle » sur ordre du
 * pupitre, et il calcule les tensions du réseau ~ (230 V phase-neutre). On réutilise cette
 * mécanique pour l'off-grid, sans rien changer au moteur :
 *   · `q1` = sectionneur DC de PARC BATTERIE (Q1) — organe de consignation ; l'ouvrir met
 *     tout le bus continu et l'onduleur hors tension ;
 *   · `f2` = sectionneur DC du CHAMP PV (Q2) ;
 *   · `f3` = interrupteur DIFFÉRENTIEL 30 mA type A du départ AC (Q3) ;
 *   · `km1` = onduleur/chargeur MultiPlus « en service » : sa mise en marche établit le
 *     230 V du départ (rôle du contacteur dans un démarrage moteur).
 * Le parc batterie est EXTÉRIEUR au coffret (dessiné dans la colonne toiture, sous les
 * modules). La mise sous tension du départ 230 V se mesure au tableau (L-N = 230 V) ;
 * les mesures hors tension portent sur la continuité du PE et l'isolement 500 V, comme sur
 * toute installation. La partie continue (champ PV, MPPT, parc) n'est pas mesurée sous
 * tension : elle se contrôle au sectionnement et à la pose des protections.
 */
import type { AnnexItem, Fault, Slot, TerminalNet, TpDefinition } from '@/lib/types';
import { L, TEST_ISO, TEST_PE, TEST_VAT, TEST_VISU } from './common';

/* ------------------------------------------------------------------ toiture & parc
 * 12 modules 180 Wc couplés 3S4P (3 en série × 4 branches parallèles), calepinés 6 × 2
 * sur un pan de 4,5 × 3,2 m, et le parc batterie 24 V · 1200 Ah, EXTÉRIEUR au coffret. */
// Ordre de calepinage gauche → droite : rangée 0 (chaînes 1 & 2) puis rangée 1
// (chaînes 3 & 4). Les strings 3S sont ainsi groupés horizontalement dans le bandeau.
const ORDER = [1, 3, 5, 2, 4, 6, 7, 9, 11, 8, 10, 12];
const ROOF: AnnexItem[] = [
  // 12 modules en BANDEAU horizontal EN HAUT du coffret : 2 rangées × 6 modules.
  ...ORDER.map((n, j) => {
    const c = j % 6;
    const r = Math.floor(j / 6);
    return {
      key: 'pvpanel',
      rep: `PV${n}`,
      name: 'module 180 Wc · 3S4P',
      // Toiture AGRANDIE : deux rangées bien séparées (écart pour les couloirs de câbles),
      // modules plus grands. + à gauche / − à droite (voir annexTerminals) → la série est
      // un saut court dans l'écart, et les départs/retours sont rangés en couloirs.
      x: 16 + c * 54,
      y: 48 + r * 102,
      w: 44,
      h: 44,
    } as AnnexItem;
  }),
  // Boîte de jonction (combiner) à 4 fusibles gPV, à DROITE du bandeau : elle raccorde
  // le champ 3S4P (4 chaînes de 3 modules) et sort un couple bus + / − vers Q2.
  { key: 'combiner', rep: 'JB', name: 'boîte de jonction · 4 fusibles gPV', x: 344, y: 48, w: 158, h: 162 },
];

/**
 * Bloc du bas, HORS COFFRET : le PARC BATTERIES (4 batteries 12 V · 600 Ah couplées 2S2P
 * → 24 V · 1200 Ah), à GAUCHE, et les RÉCEPTEURS 230 V de l'auberge, à DROITE. Toutes ces
 * arrivées entrent dans le coffret par le BAS (presse-étoupes). L'élève réalise le couplage
 * du parc comme il a réalisé le couplage 3S4P du champ.
 */
const RECV: AnnexItem[] = [
  // Parc batteries — 2 rangées × 2 (2S2P), à gauche du bloc.
  { key: 'battery', rep: 'BT1', name: 'batterie 12 V · 600 Ah', x: 18, y: 22, w: 94, h: 52, recv: true },
  { key: 'battery', rep: 'BT2', name: 'batterie 12 V · 600 Ah', x: 120, y: 22, w: 94, h: 52, recv: true },
  { key: 'battery', rep: 'BT3', name: 'batterie 12 V · 600 Ah', x: 18, y: 100, w: 94, h: 52, recv: true },
  { key: 'battery', rep: 'BT4', name: 'batterie 12 V · 600 Ah', x: 120, y: 100, w: 94, h: 52, recv: true },
  // Récepteurs 230 V, à droite du bloc.
  { key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'éclairage LED · 6 × 10 W', x: 256, y: 30, w: 52, h: 52, recv: true },
  { key: 'l_recepteu_chauffe_eau', rep: 'FR', name: 'réfrigérateur 120 W', x: 322, y: 24, w: 44, h: 96, recv: true },
  { key: 'l_recepteu_vmc2', rep: 'VE', name: 'ventilation 2 × 60 W', x: 378, y: 30, w: 62, h: 80, recv: true },
  { key: 'l_recepteu_convecteur', rep: 'PO', name: 'pompe 750 W', x: 452, y: 44, w: 92, h: 60, recv: true },
];

/**
 * Bornier du tableau de répartition (GTL, en aval de l'onduleur), 5 bornes :
 * L · N · PE en arrivée du différentiel, puis L' · N' au départ des récepteurs.
 */
const XT: Slot[] = ([
  ['x1_1', 'termred', '1', 'L'],
  ['x1_4', 'termblue', '2', 'N'],
  ['x1_5', 'earth', '3', 'PE'],
  ['x1_6', 'termred', '4', "L'"],
  ['x1_7', 'termblue', '5', "N'"],
] as const).map(([id, key, mark, sub], i) => ({
  id,
  label: `X1:${mark} · ${sub}`,
  key,
  rail: 2,
  x: 60 + i * 20,
  mark,
  sub,
  group: 'X1',
  ...(i === 0 ? { groupLabel: 'X1 · tableau de répartition' } : {}),
}));

const FAULTS: Fault[] = [
  {
    id: 'f3',
    title: 'Interrupteur différentiel 30 mA (Q3) déclenché',
    symptom: 'Aucun 230 V au tableau alors que l\'onduleur est en service et le bus continu présent.',
    fix: 'Chercher le défaut d\'isolement du départ AC (récepteur ou câble), puis réarmer Q3.',
    ouvre: 'f3',
    action: 'Chercher le défaut d\'isolement du départ 230 V, puis réarmer le différentiel Q3',
  },
  {
    id: 'a2',
    title: 'Fusible batterie MEGA fondu (parc déconnecté)',
    symptom: 'L\'onduleur ne tient pas : 0 V au tableau, le fusible MEGA est ouvert côté batterie.',
    fix: 'Vérifier le courant de court-circuit qui a fondu la cartouche, remplacer le MEGA 125 A et resserrer.',
    coupe: 'megafuse.2>q1.1+',
    action: 'Remplacer le fusible MEGA 125 A et resserrer les cosses du parc',
  },
  {
    id: 'x2',
    title: 'Alimentation continue de l\'onduleur coupée',
    symptom: 'L\'onduleur ne démarre pas : pas de tension continue à son entrée — le fil + du bus (q1.2+ → B+ de l\'onduleur) est débranché.',
    fix: 'Reconnecter le fil + du bus continu (q1.2+) sur l\'entrée B+ de l\'onduleur et resserrer.',
    coupe: 'km1.B+>q1.2+',
    action: 'Reconnecter l\'alimentation continue B+ de l\'onduleur et resserrer',
  },
];

const NETS: Record<string, TerminalNet> = {
  // ---- champ PV (toujours « vif » en journée : c'est le sectionneur Q2 qui l'isole) ----
  // Les éléments de toiture exposent leurs bornes sous les repères X1/X2 (moteur de scène).
  'PV1.X1': { net: 'DC+', live: 'always' }, 'PV1.X2': { net: 'DC-', live: 'always' },
  // Champ complet : les 12 modules exposent leur + (X1) et leur − (X2), tous vifs en journée.
  'PV2.X1': { net: 'DC+', live: 'always' }, 'PV2.X2': { net: 'DC-', live: 'always' },
  'PV3.X1': { net: 'DC+', live: 'always' }, 'PV3.X2': { net: 'DC-', live: 'always' },
  'PV4.X1': { net: 'DC+', live: 'always' }, 'PV4.X2': { net: 'DC-', live: 'always' },
  'PV5.X1': { net: 'DC+', live: 'always' }, 'PV5.X2': { net: 'DC-', live: 'always' },
  'PV6.X1': { net: 'DC+', live: 'always' }, 'PV6.X2': { net: 'DC-', live: 'always' },
  'PV7.X1': { net: 'DC+', live: 'always' }, 'PV7.X2': { net: 'DC-', live: 'always' },
  'PV8.X1': { net: 'DC+', live: 'always' }, 'PV8.X2': { net: 'DC-', live: 'always' },
  'PV9.X1': { net: 'DC+', live: 'always' }, 'PV9.X2': { net: 'DC-', live: 'always' },
  'PV10.X1': { net: 'DC+', live: 'always' }, 'PV10.X2': { net: 'DC-', live: 'always' },
  'PV11.X1': { net: 'DC+', live: 'always' }, 'PV11.X2': { net: 'DC-', live: 'always' },
  'PV12.X1': { net: 'DC+', live: 'always' }, 'PV12.X2': { net: 'DC-', live: 'always' },
  // Boîte de jonction : 4 entrées de fusibles + bus + (P), tous DC+ ; le bus − (M) est DC−.
  'JB.F1': { net: 'DC+', live: 'always' }, 'JB.F2': { net: 'DC+', live: 'always' },
  'JB.F3': { net: 'DC+', live: 'always' }, 'JB.F4': { net: 'DC+', live: 'always' },
  'JB.P': { net: 'DC+', live: 'always' }, 'JB.M': { net: 'DC-', live: 'always' },
  'f2.1+': { net: 'DC+', live: 'always' }, 'f2.3−': { net: 'DC-', live: 'always' },
  'f2.2+': { net: 'DC+', live: 'f2' }, 'f2.4−': { net: 'DC-', live: 'f2' },
  'dcspd.+': { net: 'DC+', live: 'f2' }, 'dcspd.−': { net: 'DC-', live: 'f2' }, 'dcspd.PE': { net: 'PE', live: 'always' },
  'dcfuse.1+': { net: 'DC+', live: 'f2' }, 'dcfuse.3−': { net: 'DC-', live: 'f2' },
  'dcfuse.2+': { net: 'DC+', live: 'f2' }, 'dcfuse.4−': { net: 'DC-', live: 'f2' },
  'mppt.PV+': { net: 'DC+', live: 'f2' }, 'mppt.PV−': { net: 'DC-', live: 'f2' },
  // ---- parc batteries (bloc du bas, hors coffret) : 4 batteries 12 V couplées 2S2P ----
  // Chaque batterie expose + (X1) et − (X2) ; toutes vives en permanence.
  'BT1.X1': { net: 'DC+', live: 'always' }, 'BT1.X2': { net: 'DC-', live: 'always' },
  'BT2.X1': { net: 'DC+', live: 'always' }, 'BT2.X2': { net: 'DC-', live: 'always' },
  'BT3.X1': { net: 'DC+', live: 'always' }, 'BT3.X2': { net: 'DC-', live: 'always' },
  'BT4.X1': { net: 'DC+', live: 'always' }, 'BT4.X2': { net: 'DC-', live: 'always' },
  'megafuse.1': { net: 'DC+', live: 'always' }, 'megafuse.2': { net: 'DC+', live: 'always' },
  'q1.1+': { net: 'DC+', live: 'always' }, 'q1.3−': { net: 'DC-', live: 'always' },
  'q1.2+': { net: 'DC+', live: 'q1' }, 'q1.4−': { net: 'DC-', live: 'q1' },
  'mppt.B+': { net: 'DC+', live: 'q1' }, 'mppt.B−': { net: 'DC-', live: 'q1' },
  'km1.B+': { net: 'DC+', live: 'q1' }, 'km1.B−': { net: 'DC-', live: 'q1' },
  // ---- départ 230 V ~ : onduleur → différentiel Q3 → tableau ----
  'km1.L': { net: 'L1', live: 'run' }, 'km1.N': { net: 'N', live: 'always' }, 'km1.PE': { net: 'PE', live: 'always' },
  'f3.L1': { net: 'L1', live: 'run' }, 'f3.N1': { net: 'N', live: 'always' },
  'f3.L2': { net: 'L1', live: 'run' }, 'f3.N2': { net: 'N', live: 'always' },
  'x1_1.a': { net: 'L1', live: 'run' }, 'x1_1.b': { net: 'L1', live: 'run' },
  'x1_4.a': { net: 'N', live: 'always' }, 'x1_4.b': { net: 'N', live: 'always' },
  'x1_5.a': { net: 'PE', live: 'always' }, 'x1_5.b': { net: 'PE', live: 'always' },
  'x1_6.a': { net: 'L1', live: 'run' }, 'x1_6.b': { net: 'L1', live: 'run' },
  'x1_7.a': { net: 'N', live: 'always' }, 'x1_7.b': { net: 'N', live: 'always' },
};

export const TP_SOLAIRE_AUTONOME: TpDefinition = {
  id: 'solaire-autonome',
  title: 'Installation solaire autonome · Auberge 24 V',
  level: 'Bac Pro MELEC · BTS Électrotechnique',
  family: 'pv',
  scene: 'pv',
  annex: 'roof',
  playable: true,
  competences: ['C3 Préparer', 'C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  diplomas: ['bacpro', 'bts'],
  summary:
    'Site isolé 24 V off-grid (Auberge du Charmant Som). Champ PV 12 modules 180 Wc couplés 3S4P (4 chaînes de 3 modules en série) raccordées par une BOÎTE DE JONCTION à 4 fusibles gPV, protections DC (sectionneur 1000 V, parafoudre type 2), régulateur MPPT 150/70, parc batterie 24 V · 1200 Ah EXTÉRIEUR protégé par fusible MEGA 125 A, onduleur/chargeur MultiPlus 24/3000, départ 230 V protégé par différentiel 30 mA type A et tableau de répartition. Dimensionnement, câblage, mise en service, mesures et dépannage.',
  situation:
    'L\'Auberge du Charmant Som n\'est pas raccordée au réseau : elle est alimentée par une installation solaire autonome en 24 V. Tu dois dimensionner la chaîne (bilan des récepteurs, couplage des modules, choix du régulateur, du parc et de l\'onduleur), câbler le champ regroupé en toiture en 3S4P — 4 chaînes de 3 modules en série ramenées sur une BOÎTE DE JONCTION à 4 fusibles gPV, dont le bus + / − part vers le coffret — puis câbler le coffret sur la platine habitat/tertiaire (protections DC, régulateur, onduleur/chargeur, différentiel et tableau de répartition en aval) en laissant le parc batterie à l\'extérieur, puis mettre en service et mesurer le départ 230 V avant de traiter une panne.',
  plaque: {
    'Type': 'Site isolé (off-grid)',
    'Tension parc': '24 V',
    'Champ PV': '12 × 180 Wc · 3S4P',
    'Besoin Ej': '≈ 4602 Wh/j',
    'Production Epv': '≈ 7080 Wh/j',
    'P simultanée': '2300 W',
    'Régulateur': 'MPPT 150/70',
    'Onduleur': 'MultiPlus 24/3000 · 2400 W',
  },
  cahierDesCharges: [
    { k: 'Site', v: 'Auberge du Charmant Som, non raccordée au réseau : production et stockage sur place, aucun secours EDF.' },
    { k: 'Bilan des récepteurs', v: 'éclairage LED 6 × 10 W, réfrigérateur 120 W, ventilation 2 × 60 W, pompe 750 W. Besoin Ej ≈ 4602 Wh/j, puissance simultanée retenue 2300 W.' },
    { k: 'Production', v: 'ressource Guyane (HSP ≈ 4,6 h/j) et pertes de chaîne : production à viser Epv ≈ 7080 Wh/j, soit un champ de 12 modules 180 Wc.' },
    { k: 'Champ PV', v: '12 modules 180 Wc couplés 3S4P — 3 en série (Voc string ≈ 71 V à froid, sous les 150 V du MPPT) × 4 branches en parallèle. Calepinage 6 × 2 sur un pan de 4,5 × 3,2 m.' },
    { k: 'Protection DC PV', v: 'sectionneur DC 1000 V (Q2), parafoudre DC type 2, porte-fusibles gPV — tri porté par la tension continue, jamais par du matériel AC.' },
    { k: 'Régulateur', v: 'MPPT 150/70 : recherche du point de puissance maximale, 150 V d\'entrée PV admissibles, 70 A de charge vers le parc 24 V.' },
    { k: 'Parc batterie', v: 'parc 24 V · 1200 Ah, À L\'EXTÉRIEUR du coffret (ventilation, masse, accès). Protégé par un fusible MEGA 125 A au plus près des bornes (I batt ≈ 95 A).' },
    { k: 'Onduleur/chargeur', v: 'MultiPlus 24/3000 : 2400 W continus > 2300 W simultanés. Il produit le 230 V de l\'auberge à partir du parc 24 V.' },
    { k: 'Départ 230 V', v: 'interrupteur différentiel 30 mA type A (Q3) puis tableau de répartition (GTL) EN AVAL de l\'onduleur : c\'est de là que partent les récepteurs.' },
    { k: 'Sectionnement', v: 'Q1 sectionneur DC de parc : c\'est LUI qui isole et consigne toute l\'installation continue et l\'onduleur.' },
    { k: 'Rail 1 (DC)', v: 'Q2 sectionneur PV · parafoudre DC · fusibles gPV · MPPT 150/70 · Q1 sectionneur parc · fusible MEGA' },
    { k: 'Rail 2 (AC)', v: 'onduleur MultiPlus · différentiel 30 mA Q3' },
    { k: 'Rail 3', v: 'X1 tableau de répartition (L · N · PE · départs)' },
    { k: 'Mise en service', v: 'refermer Q1, Q2 puis Q3 et mettre l\'onduleur en marche : le 230 V doit apparaître au tableau.' },
    { k: 'Avant mise en service', v: 'consignation sur Q1 · VAT · continuité PE · isolement 500 V du départ AC.' },
  ],
  // Pas de pupitre moteur (voyant/bouton) sur une installation PV : la mise en
  // service se fait en enclenchant l'onduleur MultiPlus directement sur la platine.
  preparation: {
    identification: [
      {
        id: 'id-mppt', rep: 'MPPT', focus: 'MPPT',
        invite: 'Quel appareil relie le champ PV au parc batterie en cherchant le point de puissance maximale ?',
        options: ['Un régulateur MPPT', 'Un onduleur réseau', 'Un parafoudre', 'Un disjoncteur de branchement'],
        answer: 0,
        why: 'Le MPPT 150/70 est le régulateur de charge : il adapte en permanence la tension du champ pour tirer le maximum de puissance et charger le parc 24 V.',
      },
      {
        id: 'id-onduleur', rep: 'MultiPlus', focus: 'ONDU',
        invite: 'Quel appareil fabrique le 230 V de l\'auberge à partir du parc 24 V ?',
        options: ['L\'onduleur/chargeur MultiPlus', 'Le régulateur MPPT', 'Le parafoudre DC', 'Le sectionneur PV'],
        answer: 0,
        why: 'Le MultiPlus 24/3000 est l\'onduleur : il convertit le 24 V continu du parc en 230 V alternatif pour les récepteurs.',
      },
      {
        id: 'id-mega', rep: 'MEGA', focus: 'FB',
        invite: 'Que protège le fusible MEGA 125 A placé au plus près du parc ?',
        options: ['La liaison batterie ↔ onduleur contre le court-circuit', 'Les modules PV', 'Le départ éclairage', 'Le régulateur contre la foudre'],
        answer: 0,
        why: 'Le parc peut débiter un très fort courant de court-circuit : le fusible MEGA 125 A protège la liaison batterie ↔ onduleur, au plus près des bornes.',
      },
      {
        id: 'id-diff', rep: 'Q3', focus: 'Q3',
        invite: 'Sur le départ 230 V, ce repère désigne :',
        options: ['Un interrupteur différentiel 30 mA', 'Un sectionneur DC', 'Un parafoudre DC', 'Un régulateur'],
        answer: 0,
        why: 'Q3 est l\'interrupteur différentiel 30 mA type A : il protège les personnes sur le départ alternatif de l\'onduleur.',
      },
      {
        id: 'id-q2', rep: 'Q2', focus: 'Q2',
        invite: 'En tête du champ PV, quel organe isole les modules côté continu ?',
        options: ['Un sectionneur DC 1000 V', 'Un différentiel AC', 'Un contacteur', 'Un porte-fusible AC'],
        answer: 0,
        why: 'Q2 est le sectionneur DC 1000 V : il coupe et sépare le champ PV. Le matériel DC est spécifique — un appareil AC ne coupe pas un arc continu.',
      },
      {
        id: 'id-spd', rep: 'Parafoudre DC', focus: 'PF1',
        invite: 'À quoi sert le parafoudre DC type 2 du coffret ?',
        options: ['Écouler les surtensions atmosphériques côté continu', 'Réguler la charge du parc', 'Mesurer le courant PV', 'Découpler les branches'],
        answer: 0,
        why: 'Le parafoudre DC type 2 écoule vers la terre les surtensions (foudre) qui remontent du champ PV, en amont du régulateur.',
      },
      {
        id: 'id-jb', rep: 'JB', focus: 'JB',
        invite: 'À quoi sert la boîte de jonction (repère JB) placée en toiture ?',
        options: [
          'Regrouper les 4 chaînes du champ 3S4P, chacune protégée par un fusible gPV, sur un bus + / −',
          'Convertir le continu du champ en 230 V alternatif',
          'Sectionner et consigner le parc batterie',
          'Mesurer le courant de charge du parc',
        ],
        answer: 0,
        why: 'La boîte de jonction (combiner) réunit les 4 chaînes de 3 modules du couplage 3S4P : chaque chaîne passe par son fusible gPV, et les bus + / − repartent d\'un seul câble vers le sectionneur DC Q2.',
      },
    ],
    fonctions: [
      {
        id: 'fn-3s4p', focus: 'PV',
        invite: '12 modules 180 Wc en 3S4P : combien de branches en parallèle, et pourquoi 3 en série ?',
        options: [
          '4 branches ; 3 en série pour rester sous les 150 V d\'entrée du MPPT',
          '3 branches ; 4 en série pour augmenter le courant',
          '12 branches ; aucune série',
          '1 branche ; tout en série pour monter à 150 V',
        ],
        answer: 0,
        why: '3S4P = 3 modules en série (Voc string ≈ 71 V à froid, bien sous 150 V) × 4 branches en parallèle. La série fixe la tension, le parallèle additionne le courant.',
      },
      {
        id: 'fn-24v', focus: 'BT1',
        invite: 'Pourquoi choisir un parc 24 V plutôt que 12 V pour cette puissance ?',
        options: [
          'À puissance égale, 24 V divise le courant par deux : câbles, fusibles et pertes plus faibles',
          'Le 24 V stocke plus d\'énergie à capacité égale',
          'Le 24 V est obligatoire pour tout MPPT',
          'Le 24 V supprime le besoin de fusible batterie',
        ],
        answer: 0,
        why: 'P = U × I : pour 2300 W, le courant en 24 V est deux fois plus faible qu\'en 12 V. Les sections, le calibre du MEGA et les pertes en ligne diminuent d\'autant.',
      },
      {
        id: 'fn-mppt-pwm', focus: 'MPPT',
        invite: 'MPPT ou PWM pour ce site ?',
        options: [
          'MPPT : il convertit la tension et récupère la puissance quand Vmp ≫ Ubat',
          'PWM : moins cher et sans perte quel que soit l\'écart de tension',
          'Indifférent, les deux ont le même rendement',
          'PWM : obligatoire au-dessus de 100 V PV',
        ],
        answer: 0,
        why: 'Un PWM relie quasi directement le champ au parc : toute la différence Vmp − Ubat est perdue. Le MPPT convertit et va chercher le point de puissance maximale — indispensable ici.',
      },
      {
        id: 'fn-onduleur', focus: 'ONDU',
        invite: 'Pourquoi un MultiPlus 24/3000 et non un 24/1600 ?',
        options: [
          'Ses 2400 W continus couvrent les 2300 W simultanés du bilan',
          'Parce qu\'il est moins cher',
          'Parce que 1600 VA suffisent largement',
          'Parce qu\'il fonctionne en 12 V',
        ],
        answer: 0,
        why: 'Puissance simultanée 2300 W : le 24/3000 (2400 W continus) passe, le 24/1600 (≈ 1300 W) décrocherait dès que la pompe et le réfrigérateur démarrent ensemble.',
      },
      {
        id: 'fn-parc-ext', focus: 'BT1',
        invite: 'Pourquoi le parc batterie est-il posé à l\'EXTÉRIEUR du coffret ?',
        options: [
          'Ventilation, masse et accès : les batteries dégagent de la chaleur et doivent être accessibles',
          'Pour rallonger les câbles et augmenter les pertes',
          'Parce que le coffret ne supporte pas le 24 V',
          'Pour supprimer le fusible MEGA',
        ],
        answer: 0,
        why: 'Un parc dégage de la chaleur (et de l\'hydrogène pour le plomb), doit être ventilé, mis à la masse et rester accessible : il ne se met pas dans le coffret des protections.',
      },
      {
        id: 'fn-gtl-aval', focus: 'X1',
        invite: 'Où se trouve le tableau de répartition (GTL) par rapport à l\'onduleur ?',
        options: [
          'EN AVAL de l\'onduleur : c\'est de là que partent les récepteurs 230 V',
          'En amont, entre le parc et l\'onduleur',
          'Sur le champ PV, côté continu',
          'Directement sur les bornes batterie',
        ],
        answer: 0,
        why: 'L\'onduleur fabrique le 230 V ; il passe par le différentiel Q3 puis arrive au tableau de répartition en aval, d\'où repartent les circuits de l\'auberge.',
      },
    ],
  },
  postes: [
    {
      id: 'panneaux',
      name: 'Champ PV · couplage des modules',
      need: 'Alimenter un MPPT 150/70 (parc 24 V) avec 12 modules 180 Wc sans dépasser 150 V d\'entrée',
      options: [
        { key: 'pvpanel', ref: '12 modules 180 Wc · 3S4P', spec: '3 en série × 4 parallèles · Voc string ≈ 71 V', ok: true, why: '3 en série tiennent la tension sous les 150 V du MPPT même à froid ; 4 branches en parallèle additionnent le courant pour la puissance visée.' },
        { key: 'pvpanel', ref: '12 modules 180 Wc · 6S2P', spec: '6 en série × 2 parallèles · Voc string ≈ 141 V', half: true, why: 'Ça fonctionne l\'été, mais à froid la Voc grimpe et frôle les 150 V du MPPT : marge insuffisante en Guyane comme en montagne.' },
        { key: 'pvpanel', ref: '12 modules 180 Wc · 12S1P', spec: '12 en série · Voc string ≈ 282 V', why: 'Voc bien au-dessus des 150 V admissibles par le MPPT 150/70 : le régulateur serait détruit.' },
      ],
    },
    {
      id: 'mppt',
      name: 'Régulateur de charge',
      need: 'Charger le parc 24 V depuis un champ ≈ 1500 Wc, entrée PV jusqu\'à ≈ 150 V',
      options: [
        { key: 'mppt', ref: 'MPPT 150/70', spec: '150 V PV · 70 A · 24 V', ok: true, why: '150 V d\'entrée couvrent le string 3S, et 70 A de charge conviennent à un champ de ≈ 1500 Wc sur un parc 24 V.' },
        { key: 'mppt', ref: 'PWM 30 A', spec: 'régulateur PWM · sans conversion', why: 'Un PWM relie le champ presque directement au parc : la différence de tension est perdue, et 30 A ne suffisent pas.' },
        { key: 'mppt', ref: 'MPPT 75/15', spec: '75 V PV · 15 A', why: 'Entrée 75 V insuffisante pour un string 3S, et 15 A de charge très en-dessous du besoin.' },
      ],
    },
    {
      id: 'onduleur',
      name: 'Onduleur / chargeur',
      need: 'Produire le 230 V de l\'auberge (2300 W simultanés) depuis le parc 24 V',
      options: [
        { key: 'multiplus', ref: 'MultiPlus 24/3000', spec: '24 V · 2400 W continus', ok: true, why: '2400 W continus couvrent les 2300 W simultanés, et la tension d\'entrée 24 V correspond au parc.' },
        { key: 'multiplus', ref: 'MultiPlus 24/1600', spec: '24 V · ≈ 1300 W continus', why: 'Trop faible : il décroche dès que la pompe démarre avec le réfrigérateur.' },
        { key: 'multiplus', ref: 'MultiPlus 12/3000', spec: '12 V · 2400 W', why: 'Mauvaise tension d\'entrée : le parc est en 24 V, pas en 12 V.' },
      ],
    },
    {
      id: 'secpv',
      name: 'Sectionnement DC · champ PV (Q2)',
      need: 'Isoler le champ PV côté continu, jusqu\'à 150 V DC',
      options: [
        { key: 'dcswitch', ref: 'Sectionneur DC 1000 V · 2P 32 A', spec: 'coupure sous charge continue', ok: true, why: 'Matériel DC : ses chambres de coupure éteignent l\'arc continu, qui ne s\'auto-éteint pas comme en alternatif.' },
        { key: 'dcswitch', ref: 'Interrupteur AC 400 V', spec: 'matériel alternatif', why: 'Un appareil AC ne coupe pas un arc continu : il se détruit en ouvrant sous charge PV.' },
        { key: 'dcswitch', ref: 'Bornier de jonction', spec: 'simples bornes', why: 'Une borne n\'est pas un organe de coupure : rien à sectionner.' },
      ],
    },
    {
      id: 'parafoudre',
      name: 'Parafoudre DC type 2',
      need: 'Écouler les surtensions atmosphériques côté continu, en amont du régulateur',
      options: [
        { key: 'dcspd', ref: 'Parafoudre DC type 2 · 1000 V', spec: 'Up adapté au champ', ok: true, why: 'Type 2 en tête d\'installation PV : il écrête les surtensions vers la terre et protège le régulateur.' },
        { key: 'dcspd', ref: 'Parafoudre AC type 2', spec: 'matériel alternatif', why: 'Un parafoudre AC n\'est pas prévu pour la tension continue du champ : mauvaise technologie.' },
        { key: 'dcspd', ref: 'Aucun parafoudre', spec: 'liaison directe', why: 'Sans parafoudre, une surtension foudre remonte jusqu\'au régulateur et le détruit.' },
      ],
    },
    {
      id: 'fuspv',
      name: 'Porte-fusibles gPV',
      need: 'Protéger chaque polarité du champ PV contre les courants de retour',
      options: [
        { key: 'dcfuse', ref: 'Porte-fusibles gPV 15 A · 10 × 38', spec: 'cartouches gPV', ok: true, why: 'Les cartouches gPV sont calibrées pour le photovoltaïque : elles supportent l\'Isc et coupent les courants de retour entre branches.' },
        { key: 'dcfuse', ref: 'Porte-fusibles gG 15 A', spec: 'cartouches gG (AC)', why: 'Les gG sont pour l\'alternatif : elles ne tiennent pas la tension continue du champ.' },
        { key: 'dcfuse', ref: 'Pont sans protection', spec: 'liaison directe', why: 'Sans fusible, un défaut sur une branche reçoit le courant de retour des trois autres.' },
      ],
    },
    {
      id: 'fusbat',
      name: 'Fusible batterie (MEGA)',
      need: 'Protéger la liaison parc ↔ onduleur au plus près des bornes (I batt ≈ 95 A)',
      options: [
        { key: 'megafuse', ref: 'Fusible MEGA 125 A', spec: 'très fort pouvoir de coupure DC', ok: true, why: 'Juste au-dessus du courant de service (≈ 95 A) et capable de couper l\'énorme courant de court-circuit d\'un parc batterie.' },
        { key: 'megafuse', ref: 'Fusible MEGA 40 A', spec: 'calibre trop faible', why: 'Il fond en service normal dès que l\'onduleur monte en charge.' },
        { key: 'megafuse', ref: 'Fusible verre 10 A', spec: 'faible pouvoir de coupure', why: 'Aucun pouvoir de coupure face à un court-circuit de batterie : il explose sans couper.' },
      ],
    },
    {
      id: 'diff',
      name: 'Différentiel du départ 230 V (Q3)',
      need: 'Protéger les personnes sur le départ alternatif de l\'onduleur',
      options: [
        { key: 'iddr', ref: 'Interrupteur différentiel 30 mA type A · 2P', spec: '30 mA · type A', ok: true, why: '30 mA pour la protection des personnes, type A adapté aux composants électroniques de l\'onduleur et des récepteurs.' },
        { key: 'iddr', ref: 'Différentiel 300 mA type AC', spec: '300 mA', why: '300 mA protège contre l\'incendie, pas les personnes ; et le type AC ne « voit » pas les défauts à composante continue.' },
        { key: 'iddr', ref: 'Aucun différentiel', spec: 'départ direct', why: 'Un départ 230 V sans différentiel 30 mA n\'est pas admissible : aucune protection des personnes.' },
      ],
    },
    {
      id: 'batterie',
      name: 'Parc batterie',
      need: 'Stocker l\'énergie du bilan sous 24 V, à l\'extérieur du coffret',
      options: [
        { key: 'battery', ref: 'Parc 24 V · 1200 Ah', spec: '24 V · autonomie du bilan', ok: true, why: 'Tension 24 V et capacité 1200 Ah dimensionnées sur le besoin Ej et l\'autonomie visée, posé à l\'extérieur ventilé.' },
        { key: 'battery', ref: 'Parc 12 V · 1200 Ah', spec: '12 V', why: 'Mauvaise tension de parc : l\'onduleur 24 V et le MPPT sont réglés pour 24 V.' },
        { key: 'battery', ref: 'Parc 48 V · 600 Ah', spec: '48 V', why: 'Tension incompatible avec le MultiPlus 24/3000 et le MPPT réglé sur 24 V.' },
      ],
    },
    {
      id: 'sectparc',
      name: 'Sectionnement DC · parc (Q1)',
      need: 'Isoler et consigner tout le bus continu et l\'onduleur',
      options: [
        { key: 'dcswitch', ref: 'Sectionneur DC de parc · cadenassable', spec: 'coupure DC · consignation', ok: true, why: 'Cadenassable en position ouverte : c\'est l\'organe de consignation de toute la partie continue et de l\'onduleur.' },
        { key: 'dcswitch', ref: 'Interrupteur AC', spec: 'matériel alternatif', why: 'Il ne coupe pas l\'arc continu du parc et n\'est pas conçu pour la consignation DC.' },
        { key: 'dcswitch', ref: 'Bornier', spec: 'simples bornes', why: 'Aucune coupure : impossible de consigner.' },
      ],
    },
  ],
  // Scène en 5 blocs empilés (haut → bas) : ① toiture (bandeau PV, en annexe) ·
  // ② coffret DC (rail 0) · ③ onduleur + batterie (rail 1) · ④ tableau de
  // répartition (rail 2) · ⑤ récepteurs (bloc sous la platine). Les rails sont
  // descendus pour laisser à la toiture une zone propre, sans chevauchement.
  rails: [352, 548, 744],
  armoire: 884,
  arriveeReseau: false,
  slots: [
    // ② Coffret DC (rail 0) : champ PV → protections → MPPT → sectionneur parc → MEGA
    { id: 'f2', label: 'Q2 · Sectionneur DC champ PV', key: 'dcswitch', rail: 0, x: 40, rep: 'Q2' },
    { id: 'dcspd', label: 'Parafoudre DC type 2', key: 'dcspd', rail: 0, x: 96, rep: 'PF1' },
    { id: 'dcfuse', label: 'Porte-fusibles gPV', key: 'dcfuse', rail: 0, x: 152, rep: 'F1' },
    { id: 'mppt', label: 'MPPT 150/70', key: 'mppt', rail: 0, x: 212, rep: 'MPPT' },
    { id: 'q1', label: 'Q1 · Sectionneur DC parc (consignation)', key: 'dcswitch', rail: 0, x: 330, rep: 'Q1' },
    { id: 'megafuse', label: 'Fusible batterie MEGA 125 A', key: 'megafuse', rail: 0, x: 392, rep: 'FB' },
    // ③ Onduleur + batterie (rail 1) : l'onduleur sur la platine, le parc à sa DROITE (annexe)
    { id: 'km1', label: 'Onduleur/chargeur MultiPlus 24/3000', key: 'multiplus', rail: 1, x: 50, rep: 'ONDU' },
    // ④ Tableau de répartition (rail 2) : différentiel Q3 en tête, puis bornier X1
    { id: 'f3', label: 'Q3 · Différentiel 30 mA type A', key: 'iddr', rail: 2, x: 232, rep: 'Q3' },
    ...XT,
  ],
  annexItems: ROOF,
  recvItems: RECV,
  liaisons: [
    // ---- champ PV câblé en 3S4P par l'élève : 4 chaînes de 3 modules en série ----
    // Séries (− X2 d'un module → + X1 du suivant) — 4 chaînes de 3 modules :
    L('PV1.X2', 'PV3.X1', 'DC+'), L('PV3.X2', 'PV5.X1', 'DC+'),
    L('PV7.X2', 'PV9.X1', 'DC+'), L('PV9.X2', 'PV11.X1', 'DC+'),
    L('PV2.X2', 'PV4.X1', 'DC+'), L('PV4.X2', 'PV6.X1', 'DC+'),
    L('PV8.X2', 'PV10.X1', 'DC+'), L('PV10.X2', 'PV12.X1', 'DC+'),
    // + de chaque chaîne (X1 du 1er module) → un fusible gPV de la boîte de jonction :
    L('PV1.X1', 'JB.F1', 'DC+'), L('PV7.X1', 'JB.F2', 'DC+'),
    L('PV2.X1', 'JB.F3', 'DC+'), L('PV8.X1', 'JB.F4', 'DC+'),
    // − de chaque chaîne (X2 du dernier module) → bus − de la boîte de jonction :
    L('PV5.X2', 'JB.M', 'DC-'), L('PV11.X2', 'JB.M', 'DC-'),
    L('PV6.X2', 'JB.M', 'DC-'), L('PV12.X2', 'JB.M', 'DC-'),
    // Sortie de la boîte de jonction (bus + / bus −) → sectionneur DC du champ Q2 :
    L('JB.P', 'f2.1+', 'DC+'), L('JB.M', 'f2.3−', 'DC-'),
    // ---- protections DC : Q2 → fusibles gPV, parafoudre en parallèle, → MPPT ----
    L('f2.2+', 'dcfuse.1+', 'DC+'), L('f2.4−', 'dcfuse.3−', 'DC-'),
    L('dcfuse.1+', 'dcspd.+', 'DC+'), L('dcfuse.3−', 'dcspd.−', 'DC-'),
    L('dcspd.PE', 'x1_5.a', 'PE'),
    L('dcfuse.2+', 'mppt.PV+', 'DC+'), L('dcfuse.4−', 'mppt.PV−', 'DC-'),
    // ---- bus continu : MPPT et onduleur sur l'aval du sectionneur parc Q1 ----
    L('mppt.B+', 'q1.2+', 'DC+'), L('mppt.B−', 'q1.4−', 'DC-'),
    L('km1.B+', 'q1.2+', 'DC+'), L('km1.B−', 'q1.4−', 'DC-'),
    // ---- parc batteries HORS COFFRET, couplage 2S2P réalisé par l'élève ----
    // 2 mises en série (− d'une batterie → + de la voisine) : deux strings de 24 V.
    L('BT1.X2', 'BT2.X1', 'DC+'), L('BT3.X2', 'BT4.X1', 'DC+'),
    // 2 mises en parallèle : les + de tête ensemble (bus +), les − de queue ensemble (bus −).
    L('BT1.X1', 'BT3.X1', 'DC+'), L('BT2.X2', 'BT4.X2', 'DC-'),
    // Bus + du parc → fusible MEGA → sectionneur parc Q1 ; bus − → Q1. Entrée par le bas.
    L('BT1.X1', 'megafuse.1', 'DC+'), L('megafuse.2', 'q1.1+', 'DC+'),
    L('BT2.X2', 'q1.3−', 'DC-'),
    // ---- départ 230 V ~ : onduleur → différentiel Q3 → tableau de répartition ----
    L('km1.L', 'f3.L1', 'L1'), L('km1.N', 'f3.N1', 'N'), L('km1.PE', 'x1_5.a', 'PE'),
    L('f3.L2', 'x1_1.a', 'L1'), L('f3.N2', 'x1_4.a', 'N'),
    // ---- départ des récepteurs depuis le tableau (repérage L' / N') ----
    L('x1_1.b', 'x1_6.a', 'L1'), L('x1_4.b', 'x1_7.a', 'N'),
  ],
  nets: NETS,
  tests: [
    TEST_VAT,
    TEST_VISU,
    TEST_PE,
    TEST_ISO,
    {
      id: 'dc-polarite',
      title: 'Contrôle de polarité et de tension à vide du champ PV',
      how: 'Sectionneur Q2 ouvert, multimètre en V⎓ sur l\'arrivée des strings : vérifie la polarité (+ / −) et que la tension à vide reste sous les 150 V admissibles par le MPPT.',
      expected: 'polarité correcte, Voc string < 150 V (≈ 71 V à froid pour 3S)',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du PE onduleur → tableau', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'km1.PE', b: 'x1_5.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement L / PE du départ sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_1.a', b: 'x1_5.a', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'u230', title: 'Tension du départ 230 V au tableau (L – N)', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_1.a', b: 'x1_4.a', min: 218, max: 242, unit: 'V', when: 'run',
    },
    {
      id: 'u230pe', title: 'Tension L – PE au tableau', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_1.a', b: 'x1_5.a', min: 218, max: 242, unit: 'V', when: 'run',
    },
  ],
  faults: FAULTS,
  quiz: [
    {
      q: '12 modules 180 Wc sont couplés en 3S4P. Combien de branches en parallèle ?',
      options: ['4 branches de 3 modules', '3 branches de 4 modules', '12 branches', '1 seule branche'],
      answer: 0,
    },
    {
      q: 'Pourquoi 3 modules en série et pas 6 pour ce MPPT 150/70 ?',
      options: [
        'Pour rester sous les 150 V d\'entrée, même à froid où la Voc augmente',
        'Pour augmenter le courant de chaque branche',
        'Pour diminuer la puissance du champ',
        'Parce que le MPPT impose exactement 3 modules',
      ],
      answer: 0,
    },
    {
      q: 'Quel appareil isole et consigne toute la partie continue et l\'onduleur ?',
      options: ['Le sectionneur DC de parc Q1', 'Le différentiel Q3', 'Le parafoudre DC', 'Le fusible gPV'],
      answer: 0,
    },
    {
      q: 'Le parc batterie 24 V est posé à l\'extérieur du coffret. Pourquoi ?',
      options: [
        'Chaleur, ventilation, masse et accès',
        'Pour allonger les câbles',
        'Parce que le coffret ne tient pas 24 V',
        'Pour éviter le fusible MEGA',
      ],
      answer: 0,
    },
    {
      q: 'Le fusible MEGA 125 A protège :',
      options: [
        'La liaison parc ↔ onduleur contre le court-circuit de batterie',
        'Les modules PV',
        'Le départ éclairage',
        'Le régulateur contre la foudre',
      ],
      answer: 0,
    },
    {
      q: 'Où se trouve le tableau de répartition (GTL) ?',
      options: [
        'En aval de l\'onduleur, d\'où partent les récepteurs',
        'Entre le parc et l\'onduleur',
        'Sur le champ PV',
        'Directement aux bornes de la batterie',
      ],
      answer: 0,
    },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  // VAT de consignation adapté à l'off-grid : plus de points fantômes hérités du
  // moteur (RES.L1/RES.N du réseau, borne q1.6 inexistante). La SOURCE CONNUE est le
  // parc batterie (BAT.X1/BAT.X2), toujours présent — on choisit cette option plutôt
  // que de supprimer l'étape (`sourceConnue: null`) car la batterie prouve réellement
  // que le VAT fonctionne. L'ABSENCE se contrôle sur les deux bornes DC réellement en
  // aval du sectionneur de parc Q1 (q1.2+ / q1.4−). Toutes ces bornes existent et sont
  // mesurables (voir NETS : BAT.X1/X2, q1.2+/q1.4−).
  consignationVat: { sourceConnue: ['BT1.X1', 'BT2.X2'], avalPairs: [['q1.2+', 'q1.4−']] },
};
