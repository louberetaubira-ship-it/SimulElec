/**
 * TP platine de service · sujet Chèvrerie, partie A, question A.4.2 :
 * schéma de raccordement du système de sécurité incendie (équipement d'alarme de type 4).
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `chevrerie`
 * (`src/components/sujet/CablageReel.tsx`). `hidden` : absent du catalogue, jouable par la
 * route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ câblage (corrigé, page 11)
 *  - disjoncteur phase + neutre C2 (A.4.1) : son amont est au tableau (installateur) ;
 *    aval P → Secteur P, N → Secteur N du tableau T4 ;
 *  - boucle 1 = le DM du magasin (DM3) : + → 3A, − → 1A, résistance de fin de ligne entre
 *    1 et 2 ;
 *  - boucle 2 = les deux DM de la zone de transformation : + → 3A de DM1, 2A de DM1 → 3A de
 *    DM2, − → 1A de DM2, résistance de fin de ligne entre 1 et 2 de DM2 (dernier DM) ;
 *  - lignes protégées : la résistance de fin de ligne (3,9 kΩ, DTR 8 § 1) sur le dernier DM
 *    de chaque boucle. Au sujet, un trait de stylo dédié ; sur la platine, c'est un composant
 *    (R1, R2) dont les deux pattes se serrent sur les bornes 1 et 2 du DM : deux liaisons.
 * Le schéma du sujet ne demande ni le diffuseur ni les contacts : le diffuseur sonore DS1
 * (classe B, A.1.8) est raccordé par l'installateur sur la sortie Diffuseur sonore du T4,
 * les contacts auxiliaire et dérangement restent libres (asservissements non demandés).
 *
 * ------------------------------------------------------------ correspondance moteur
 *   · `q1` = Q1, disjoncteur C2 d'alimentation du tableau (organe de consignation) ;
 *   · le tableau, les DM et le diffuseur ne sont pas des organes : l'essai (déclencher un DM,
 *     ouvrir une boucle) se fait dans le mode câblage réel du sujet (`CablageReelModeles.ts`).
 */
import type { Liaison, TerminalNet, TpDefinition } from '@/lib/types';
import { L, TEST_ISO, TEST_VAT, TEST_VISU } from './common';

const PRE = (a: string, b: string, net: Parameters<typeof L>[2]): Liaison => L(a, b, net, 'pre');

/** Résistance de fin de ligne (Ω) : 3,9 kΩ, orange blanc rouge (DTR 8 § 1). */
export const R_FIN_DE_LIGNE = 3900;

const LIAISONS: Liaison[] = [
  // ---- amont du disjoncteur (tableau, installateur) ----
  PRE('RES.L1', 'q1.1', 'L1'), PRE('RES.N', 'q1.N', 'N'),
  // ---- diffuseur sonore DS1 sur la sortie Diffuseur sonore du T4 (installateur) ----
  PRE('t4.DS+', 'ds1.+', 'DC+'), PRE('t4.DS−', 'ds1.−', 'DC-'),
  // ---- alimentation : aval du disjoncteur → Secteur ----
  L('q1.2', 't4.P', 'L1'), L('q1.N2', 't4.N', 'N'),
  // ---- boucle 1 : DM3 du magasin, résistance de fin de ligne R1 entre 1 et 2 ----
  L('t4.B1+', 'dm3.3A', 'DC+'), L('t4.B1−', 'dm3.1A', 'DC-'),
  L('dm3.1', 'r1.1', 'DC-'), L('r1.2', 'dm3.2', 'DC+'),
  // ---- boucle 2 : DM1 puis DM2 (zone de transformation), R2 sur le dernier DM ----
  L('t4.B2+', 'dm1.3A', 'DC+'), L('dm1.2A', 'dm2.3A', 'DC+'), L('t4.B2−', 'dm2.1A', 'DC-'),
  L('dm2.1', 'r2.1', 'DC-'), L('r2.2', 'dm2.2', 'DC+'),
];

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live'], u?: number) => {
    for (const id of ids) n[id] = { net, live, ...(u != null ? { u } : {}) };
  };
  set(['q1.1'], 'L1', 'always'); set(['q1.N'], 'N', 'always');
  set(['q1.2', 't4.P'], 'L1', 'q1'); set(['q1.N2', 't4.N'], 'N', 'q1');
  // boucles de DM : + jusqu'au contact NF (3 → 2) et à la résistance, − par le 1A / 1
  set(['t4.B1+', 'dm3.3A', 'dm3.3', 'dm3.2', 'dm3.2A', 'r1.2'], 'DC+', 'q1');
  set(['t4.B1−', 'dm3.1A', 'dm3.1', 'r1.1'], 'DC-', 'q1');
  set(['t4.B2+', 'dm1.3A', 'dm1.3', 'dm1.2', 'dm1.2A', 'dm2.3A', 'dm2.3', 'dm2.2', 'dm2.2A', 'r2.2'], 'DC+', 'q1');
  set(['t4.B2−', 'dm2.1A', 'dm2.1', 'r2.1'], 'DC-', 'q1');
  // ligne des diffuseurs : 24 V⎓ en alarme seulement (DTR 8 § 2.5), rien en veille
  set(['t4.DS+', 'ds1.+'], 'DC+', 'off', 24); set(['t4.DS−', 'ds1.−'], 'DC-', 'off', 24);
  return n;
}

export const TP_CHEVRERIE_A4_SSI: TpDefinition = {
  id: 'chevrerie-a4-ssi',
  title: 'Chèvrerie · Alarme incendie de type 4 (câblage réel)',
  level: 'Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  hidden: true,
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  arriveeMono: true,
  summary:
    'Sujet Chèvrerie, partie A : système de sécurité incendie du magasin et de la zone de '
    + 'transformation. Tableau d’alarme Type 4 Planète 2 boucles alimenté par un disjoncteur C2, '
    + 'boucle 1 sur le déclencheur manuel du magasin, boucle 2 sur les deux déclencheurs étanches de '
    + 'la zone de transformation, résistance de fin de ligne sur le dernier DM de chaque boucle. '
    + 'Câbler le schéma, mettre sous tension, déclencher un DM de chaque boucle, ouvrir une boucle.',
  situation:
    'Le magasin peut accueillir 10 personnes à la fois ; la zone de transformation est carrelée et lavée '
    + 'au jet d’eau sous pression. L’équipement d’alarme retenu est un Type 4 à deux boucles, une zone de '
    + 'détection par espace, installé dans le magasin (local sec). Compléter le schéma de raccordement : '
    + 'raccorder l’alimentation, intégrer le DM du magasin à la boucle 1, ceux de la zone de transformation '
    + 'à la boucle 2, et protéger les lignes de DM. Ici, il se câble sur la platine.',
  plaqueTitre: 'SÉCURITÉ INCENDIE · ÉQUIPEMENT D’ALARME TYPE 4',
  plaque: {
    'Tableau': 'T4 · Type 4 Planète 2 boucles NUG31220 · 230 V~ · ≈ 30 mA · batterie NiCd 6 V',
    'Déclencheurs': 'DM3 MDS3000 (magasin, IP24) · DM1 et DM2 BGES3000 (zone de transformation, IP66)',
    'Protection': 'Q1 · disjoncteur phase + neutre C2',
    'Lignes': 'câble 1 paire 8/10ᵉ ou 9/10ᵉ · fin de ligne 3,9 kΩ (orange, blanc, rouge) · pas de câblage en étoile',
  },
  cahierDesCharges: [
    { k: 'Alimentation', v: 'aval du disjoncteur C2 : P → Secteur P, N → Secteur N du tableau (l’amont est au tableau général)' },
    { k: 'Boucle 1', v: 'le DM du magasin : + → 3A, − → 1A' },
    { k: 'Boucle 2', v: 'les DM de la zone de transformation en série : + → 3A du premier DM, 2A → 3A du DM suivant, − → 1A du dernier DM' },
    { k: 'Lignes protégées', v: 'résistance de fin de ligne 3,9 kΩ entre les bornes 1 et 2 du dernier DM de chaque boucle (surveillance de ligne, switchs 5 et 6 sur OFF)' },
    { k: 'Diffuseur', v: 'diffuseur sonore de classe B déjà raccordé sur la sortie Diffuseur sonore + / − du tableau' },
    { k: 'Couleurs', v: 'le sujet ne les impose pas : la platine garde ses couleurs de réseau' },
  ],
  libelles: {
    rangees: ['goulotte 1', 'goulotte 2'],
    recv: 'Organes de terrain : déclencheurs manuels et diffuseur sonore dans la colonne du local',
  },
  schemaImage: {
    src: '/tp/chevrerie/q-a4-schema.jpg',
    legende: 'A.4 · schéma de raccordement du tableau d’alarme type 4 (à compléter, page du sujet)',
  },
  postes: [
    {
      id: 't4', name: 'T4 · Équipement d’alarme', need: 'Diffuseurs < 400 mA, moins de 32 DM, pas de flash, une zone de détection par espace (A.2.1)',
      options: [
        { key: 't4planete', ref: 'Type 4 Planète 2 boucles · NUG31220', spec: '2 boucles de DM · diffuseur intégré · 230 V~', ok: true, why: 'Deux boucles : le magasin et la zone de transformation ont chacun leur visualisation, sans flash.' },
        { key: 't4planete', ref: 'Type 4 Planète 1 boucle', spec: '1 boucle de DM', why: 'Une seule boucle : les deux espaces ne seraient pas signalés séparément.' },
        { key: 't4planete', ref: 'Type 4 Planète 2 boucles FLASH', spec: '2 boucles · flash intégré', half: true, why: 'Il convient, mais le flash n’est pas demandé : ce n’est pas le choix du corrigé.' },
      ],
    },
    {
      id: 'dmmag', name: 'DM3 · Déclencheur manuel du magasin', need: 'Local sec (A.2.4)',
      options: [
        { key: 'dmmds3000', ref: 'MDS3000 · NUG30316', spec: 'saillie · membrane déformable · IP24', ok: true, why: 'Le DM standard convient au magasin, local sec.' },
        { key: 'dmmds3000', ref: 'MDVS3000 · NUG30325', spec: 'avec voyant', why: 'Le DM à voyant n’est pas celui retenu en A.2.4, et il demande une autre configuration de la ligne (§ 6.6).' },
        { key: 'dmmds3000', ref: 'DM Radio · NUG30317', spec: 'radio', why: 'Réservé au Type 4 Radio : il n’a pas de bornier de boucle.' },
      ],
    },
    {
      id: 'dmzt', name: 'DM1 et DM2 · Déclencheurs de la zone de transformation', need: 'Local lavé au jet d’eau sous pression (A.2.4)',
      options: [
        { key: 'dmbges3000', ref: 'BGES3000 · NUG30312 (× 2)', spec: 'saillie étanche · IP66', ok: true, why: 'IP66 : il résiste aux jets d’eau du nettoyage quotidien.' },
        { key: 'dmbges3000', ref: 'MDS3000 · NUG30316 (× 2)', spec: 'IP24', why: 'IP24 ne protège que des projections : le lavage au jet le noierait.' },
      ],
    },
    {
      id: 'q1', name: 'Q1 · Protection de l’alimentation du tableau', need: 'Courant absorbé sur le secteur ≈ 30 mA (DTR 8 § 2.2), A.4.1',
      options: [
        { key: 'mcb1pn', ref: 'iC60N 1P+N C2 · A9F74602', spec: 'phase + neutre · 2 A', ok: true, why: 'Le plus petit calibre usuel, au-dessus des 30 mA absorbés : C2 du corrigé.' },
        { key: 'mcb1pn', ref: 'Disjoncteur 1P+N C16', spec: '16 A', why: 'Calibre d’un circuit de prises : la ligne du tableau ne serait plus protégée.' },
        { key: 'mcb1pn', ref: 'Disjoncteur unipolaire C2', spec: 'sans coupure du neutre', why: 'Le neutre ne serait pas sectionné.' },
      ],
    },
    {
      id: 'rfl', name: 'R1 et R2 · Résistances de fin de ligne', need: 'Surveillance des lignes de DM (DTR 8 § 6.6)',
      options: [
        { key: 'rfl39k', ref: '3,9 kΩ · orange, blanc, rouge (× 2)', spec: 'livrées avec le tableau', ok: true, why: 'La valeur que le tableau surveille : une ligne coupée ou en court-circuit s’en écarte et passe en dérangement.' },
        { key: 'rfl39k', ref: '910 Ω · 2 W', spec: 'résistance de charge livrée avec le DM', why: 'Ce n’est pas la résistance de fin de ligne : le tableau signalerait un dérangement.' },
        { key: 'rfl39k', ref: 'Aucune résistance', spec: 'ligne sans surveillance', why: 'La consigne demande des lignes protégées : sans fin de ligne, la boucle est ouverte et le tableau reste en dérangement.' },
      ],
    },
  ],
  // Rail 0 : Q1 ; rail 1 : le tableau T4, descendu sous son rail (dy) pour dégager la goulotte
  // du rail. Pas de goulotte de pied : les lignes partent vers la colonne du local.
  rails: [150, 340],
  armoire: 560,
  goulotteDePied: false,
  slots: [
    { id: 'q1', label: 'Q1 · Disjoncteur phase + neutre C2 · alimentation du tableau d’alarme', key: 'mcb1pn', rail: 0, x: 70, rep: 'Q1' },
    { id: 't4', label: 'T4 · Tableau d’alarme Type 4 · 2 boucles', key: 't4planete', rail: 1, x: 42, dy: 28, rep: 'T4' },
    // organes de terrain (colonne du local), dans l'ordre du schéma du sujet
    { id: 'dm1', label: 'DM1 · Déclencheur manuel étanche · zone de transformation (boucle 2, 1er DM)', key: 'dmbges3000', rail: null, x: 432, y: 12, rep: 'DM1' },
    { id: 'dm2', label: 'DM2 · Déclencheur manuel étanche · zone de transformation (boucle 2, dernier DM)', key: 'dmbges3000', rail: null, x: 432, y: 146, rep: 'DM2' },
    { id: 'r2', label: 'R2 · Résistance de fin de ligne 3,9 kΩ · boucle 2', key: 'rfl39k', rail: null, x: 440, y: 276, rep: 'R2' },
    { id: 'dm3', label: 'DM3 · Déclencheur manuel · magasin (boucle 1)', key: 'dmmds3000', rail: null, x: 432, y: 300, rep: 'DM3' },
    { id: 'r1', label: 'R1 · Résistance de fin de ligne 3,9 kΩ · boucle 1', key: 'rfl39k', rail: null, x: 440, y: 430, rep: 'R1' },
    { id: 'ds1', label: 'DS1 · Diffuseur sonore classe B · 24 V⎓', key: 'diffsonore', rail: null, x: 452, y: 458, rep: 'DS1' },
  ],
  annexItems: [],
  recvItems: [],
  liaisons: LIAISONS,
  nets: nets(),
  // Valeur des résistances de fin de ligne, lue à l'ohmmètre avant la pose.
  resistances: { 'r1.1|r1.2': R_FIN_DE_LIGNE, 'r2.1|r2.2': R_FIN_DE_LIGNE },
  // Tableau de classe 2, sans borne de terre : pas de continuité du PE à contrôler.
  tests: [TEST_VAT, TEST_VISU, TEST_ISO],
  mesures: [
    { id: 'rR1', title: 'Valeur de la résistance de fin de ligne R1 (boucle 1)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'r1.1', b: 'r1.2', min: 3700, max: 4100, unit: 'Ω' },
    { id: 'rR2', title: 'Valeur de la résistance de fin de ligne R2 (boucle 2)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'r2.1', b: 'r2.2', min: 3700, max: 4100, unit: 'Ω' },
    { id: 'cB2', title: 'Continuité de la liaison entre DM1 et DM2 (2A → 3A)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'dm1.2A', b: 'dm2.3A', min: 0, max: 2, unit: 'Ω' },
    { id: 'uT4', title: 'Tension au bornier Secteur du tableau (P – N)', stage: 'sousTension', instrument: 'mm', dial: 'V~', a: 't4.P', b: 't4.N', min: 220, max: 240, unit: 'V', when: 'ctl' },
  ],
  faults: [
    {
      id: 'secteurN', title: 'Neutre du Secteur non raccordé au tableau',
      symptom: 'Q1 est fermé mais le voyant « sous tension » du tableau reste éteint : il signale un défaut secteur et fonctionne sur batterie.',
      fix: 'Mesurer 230 V entre les bornes aval de Q1, puis 0 V entre Secteur P et N du tableau : reprendre le conducteur de neutre.',
      coupe: 'q1.N2>t4.N',
      nets: { 't4.N': { live: 'off' } },
      action: 'Raccorder le neutre de l’aval de Q1 sur la borne Secteur N du tableau',
    },
    {
      id: 'boucle2', title: 'Liaison DM1 → DM2 débranchée (boucle 2 ouverte)',
      symptom: 'Le tableau signale un dérangement : voyant jaune allumé, contact dérangement basculé. Les DM de la zone de transformation ne déclenchent plus l’alarme.',
      fix: 'Hors tension, contrôler la continuité de la boucle 2 de DM en DM : OL entre le 2A de DM1 et le 3A de DM2. Reprendre le conducteur.',
      coupe: 'dm1.2A>dm2.3A',
      action: 'Raccorder le 2A de DM1 sur le 3A de DM2',
    },
  ],
  quiz: [
    { q: 'Sur quelles bornes du dernier DM se pose la résistance de fin de ligne ?', options: ['1 et 2', '3A et 1A', '3 et 2', '2A et 3A'], answer: 0 },
    { q: 'À quoi sert la résistance de fin de ligne ?', options: ['À surveiller la ligne : une coupure ou un court-circuit passe en dérangement', 'À limiter le courant du diffuseur', 'À déclencher l’alarme', 'À réarmer les DM'], answer: 0 },
    { q: 'Deux DM sur la même boucle : comment les raccorder ?', options: ['En série, du 2A du premier au 3A du suivant', 'En étoile depuis le tableau', 'En parallèle sur + et −', 'Chacun sur sa boucle'], answer: 0 },
    { q: 'Pourquoi un DM IP66 dans la zone de transformation ?', options: ['Elle est lavée au jet d’eau sous pression', 'Elle est plus grande', 'Il y a plus de public', 'Il y fait froid'], answer: 0 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2'], ['t4.P', 't4.N']],
  },
};
