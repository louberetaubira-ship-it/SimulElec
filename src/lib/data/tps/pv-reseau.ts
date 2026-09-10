/**
 * TP · Installation photovoltaïque 3 kWc raccordée au réseau.
 * Liaisons complètes : deux strings de 4 modules, coffret DC, onduleur, coffret AC, comptage, AGCP.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, ROOF_ITEMS, ROOF_RECV, X2 } from './common';

export const TP_PV_RESEAU: TpDefinition = {
  id: 'pv-reseau',
  title: 'Installation photovoltaïque 3 kWc raccordée au réseau',
  level: 'Tle Bac Pro MELEC / BTS',
  family: 'pv',
  scene: 'pv',
  annex: 'roof',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Deux strings de 4 modules 375 Wc, coffret DC (fusibles gPV, sectionneur 1000 V, parafoudre), onduleur string 3 kVA, coffret AC (disjoncteur, différentiel type A, parafoudre), compteur de production et injection en aval de l\'AGCP.',
  situation:
    'Une maison individuelle est équipée de 8 modules photovoltaïques en toiture. Tu réalises le coffret DC, le raccordement de l\'onduleur, le coffret AC et le comptage de production, puis tu mets en service en respectant l\'ordre de manœuvre (DC avant AC à la mise en marche, AC avant DC à l\'arrêt).',
  plaque: {
    Puissance: '8 × 375 Wc = 3 kWc', Strings: '2 × 4 modules', Uoc: '4 × 49,5 V = 198 V',
    Impp: '9,2 A', Onduleur: '3 kVA · 2 MPPT · 1000 V DC', Câble: '6 mm² solaire · MC4',
  },
  cahierDesCharges: [
    { k: 'Champ', v: '2 strings de 4 modules 375 Wc, câble solaire 6 mm², connecteurs MC4' },
    { k: 'Coffret DC', v: 'un porte-fusible gPV par string, sectionneur 1000 V, parafoudre DC type 2' },
    { k: 'Onduleur', v: 'string 3 kVA, 2 MPPT, protection de découplage intégrée' },
    { k: 'Coffret AC', v: 'disjoncteur 20 A, différentiel 30 mA type A, parafoudre AC' },
    { k: 'Comptage', v: 'compteur de production en série sur le départ AC' },
    { k: 'Raccordement', v: 'injection en aval de l\'AGCP, sur le bornier X1' },
    { k: 'Mise en service', v: 'contrôle de polarité, Uoc à vide, ordre de manœuvre DC / AC' },
  ],
  postes: [
    {
      id: 'fus',
      name: 'F1 / F2 · Protection des strings',
      need: 'Protéger chaque string contre les courants inverses (2 strings en parallèle)',
      options: [
        { key: 'dcfuse', ref: 'Porte-fusible gPV 15 A · 1000 V DC', spec: '10 × 38 gPV', ok: true, why: 'Fusible gPV, calibré entre 1,4 × Isc et le courant admissible du câble, sur chaque polarité de chaque string.' },
        { key: 'dcfuse', ref: 'Fusible gG 16 A · 500 V AC', spec: 'gG alternatif', why: 'Un fusible alternatif ne coupe pas un arc continu de 200 V et n\'est pas prévu pour le PV.' },
        { key: 'dcfuse', ref: 'Aucun fusible', spec: '—', half: true, why: 'Admis avec un seul string, mais interdit dès que deux strings sont en parallèle.' },
      ],
    },
    {
      id: 'qdc',
      name: 'Q1 · Sectionneur DC',
      need: 'Isoler l\'onduleur du champ photovoltaïque pour toute intervention',
      options: [
        { key: 'dcswitch', ref: 'Interrupteur-sectionneur DC 1000 V · 32 A', spec: '2 pôles DC', ok: true, why: 'Coupure en charge des deux polarités sous 1000 V continu, obligatoire côté DC de l\'onduleur.' },
        { key: 'dcswitch', ref: 'Interrupteur 400 V AC 32 A', spec: 'appareil alternatif', why: 'Tenue à l\'arc insuffisante en courant continu.' },
        { key: 'dcswitch', ref: 'Sectionneur 1 pôle', spec: 'coupure du + seulement', why: 'Le − reste relié : l\'onduleur n\'est pas isolé.' },
      ],
    },
    {
      id: 'ac',
      name: 'DDR1 / Q2 · Coffret AC',
      need: 'Protéger le départ alternatif de l\'onduleur',
      options: [
        { key: 'l_protecti_disjoncteur_diff_a', ref: 'Disjoncteur 20 A + différentiel 30 mA type A', spec: '30 mA type A', ok: true, why: 'Le type A est exigé par les onduleurs sans transformateur, susceptibles d\'injecter une composante continue.' },
        { key: 'l_protecti_disjoncteur_diff_ac', ref: 'Différentiel 30 mA type AC', spec: 'type AC', why: 'Ne détecte pas la composante continue de l\'onduleur.' },
        { key: 'l_protecti_disjoncteur_20a', ref: 'Disjoncteur 20 A seul', spec: 'sans différentiel', why: 'Aucune protection des personnes sur le départ AC.' },
      ],
    },
    {
      id: 'spd',
      name: 'F3 / F4 · Parafoudres',
      need: 'Protéger l\'onduleur des surtensions côté DC et côté AC',
      options: [
        { key: 'dcspd', ref: 'Parafoudre DC type 2 1000 V + parafoudre AC type 2', spec: 'deux parafoudres', ok: true, why: 'Les deux côtés de l\'onduleur sont exposés ; les modèles DC sont spécifiques au continu.' },
        { key: 'dcspd', ref: 'Parafoudre AC seul', spec: 'côté réseau', why: 'Le champ en toiture est le plus exposé : le côté DC doit être protégé.' },
        { key: 'dcspd', ref: 'Parafoudre DC type 3', spec: 'type 3', why: 'Type 3 réservé à la protection fine en aval, pas à l\'arrivée du champ.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'qdc', label: 'Q1 · Sectionneur DC', key: 'dcswitch', rail: 0, x: 52, rep: 'Q1' },
    { id: 'fdc1', label: 'F1 · Fusibles string 1', key: 'dcfuse', rail: 0, x: 112, rep: 'F1' },
    { id: 'fdc2', label: 'F2 · Fusibles string 2', key: 'dcfuse', rail: 0, x: 170, rep: 'F2' },
    { id: 'spd', label: 'F3 · Parafoudre DC', key: 'dcspd', rail: 0, x: 228, rep: 'F3' },
    { id: 'ond', label: 'U1 · Onduleur 3 kVA', key: 'onduleur', rail: 1, x: 52, rep: 'U1' },
    { id: 'qac', label: 'Q2 · Disjoncteur AC', key: 'l_protecti_disjoncteur_20a', rail: 1, x: 180, rep: 'Q2' },
    { id: 'ddr', label: 'DDR1 · 30 mA type A', key: 'l_protecti_disjoncteur_diff_a', rail: 1, x: 214, rep: 'DDR1' },
    { id: 'spa', label: 'F4 · Parafoudre AC', key: 'l_modulair_parafoudre', rail: 1, x: 276, rep: 'F4' },
    { id: 'agcp', label: 'AGCP · Disjoncteur de branchement', key: 'agcp', rail: 2, x: 52, rep: 'AGCP' },
    { id: 'cpt', label: 'C1 · Compteur de production', key: 'l_autres_compteur_electronique', rail: 2, x: 130, rep: 'C1' },
    ...X2(240, 6, 2, {
      group: 'X1',
      groupLabel: 'X1 · bornier',
      subs: ['DC+', 'DC−', 'PE', 'L', 'N', 'PE'],
    }),
  ],
  annexItems: ROOF_ITEMS,
  recvItems: ROOF_RECV,
  liaisons: [
    // string 1 : 4 modules en série, ramené sur le bornier
    L('PV1.X1', 'x2_1.b', 'DC+'), L('PV1.X2', 'PV2.X1', 'DC+'), L('PV2.X2', 'PV3.X1', 'DC+'),
    L('PV3.X2', 'PV4.X1', 'DC+'), L('PV4.X2', 'x2_2.b', 'DC-'),
    L('x2_1.a', 'fdc1.1+', 'DC+'), L('x2_2.a', 'fdc1.3−', 'DC-'),
    // string 2 : 4 modules en série, directement au coffret DC
    L('PV5.X1', 'fdc2.1+', 'DC+'), L('PV5.X2', 'PV6.X1', 'DC+'), L('PV6.X2', 'PV7.X1', 'DC+'),
    L('PV7.X2', 'PV8.X1', 'DC+'), L('PV8.X2', 'fdc2.3−', 'DC-'),
    // coffret DC : fusibles → sectionneur → parafoudre → onduleur
    L('fdc1.2+', 'qdc.1+', 'DC+'), L('fdc1.4−', 'qdc.3−', 'DC-'),
    L('fdc2.2+', 'qdc.1+', 'DC+'), L('fdc2.4−', 'qdc.3−', 'DC-'),
    L('qdc.2+', 'spd.+', 'DC+'), L('qdc.4−', 'spd.−', 'DC-'), L('spd.PE', 'x2_3.a', 'PE'),
    L('qdc.2+', 'ond.DC+', 'DC+'), L('qdc.4−', 'ond.DC−', 'DC-'),
    // coffret AC
    L('ond.L', 'spa.1', 'L1'), L('spa.2', 'x2_6.a', 'PE'), L('ond.PE', 'x2_3.a', 'PE'),
    L('ond.L', 'ddr.1', 'L1'), L('ond.N', 'ddr.3', 'N'),
    L('ddr.2', 'qac.1', 'L1'), L('qac.2', 'x2_4.a', 'L1'), L('ddr.4', 'x2_5.a', 'N'),
    // comptage de production et injection en aval de l'AGCP
    L('x2_4.b', 'cpt.1', 'L1'), L('x2_5.b', 'cpt.3', 'N'),
    L('cpt.2', 'agcp.2', 'L1'), L('cpt.4', 'agcp.4', 'N'),
    // arrivée réseau (câblage du distributeur)
    L('RES.L1', 'agcp.1', 'L1', 'pre'), L('RES.N', 'agcp.3', 'N', 'pre'), L('RES.PE', 'x2_6.b', 'PE', 'pre'),
  ],
  nets: {},
  tests: [
    ...BASE_TESTS,
    {
      id: 'uoc',
      title: 'Tension à vide de chaque string',
      how: 'Sectionneur DC ouvert, multimètre en V⎓ entre DC+ et DC− de chaque string au bornier.',
      expected: '≈ 198 V (4 × 49,5 V), écart < 5 % entre strings',
    },
    {
      id: 'pol',
      title: 'Contrôle de polarité',
      how: 'Multimètre en V⎓ : le + doit donner une valeur positive par rapport au −, sur chaque string.',
      expected: 'polarités concordantes avant fermeture du sectionneur',
    },
  ],
  mesures: [],
  faults: [
    { id: 'pol', title: 'Polarité d\'un string inversée', symptom: 'Tension quasi nulle au coffret DC, l\'onduleur ne démarre pas.', fix: 'Reprendre les connecteurs MC4 du string concerné.' },
    { id: 'ordre', title: 'AC fermé avant le DC à la mise en service', symptom: 'Défaut de découplage, l\'onduleur reste en défaut.', fix: 'Respecter l\'ordre : DC puis AC à la mise en marche, AC puis DC à l\'arrêt.' },
    { id: 'type', title: 'Différentiel type AC sur le départ onduleur', symptom: 'Non-conformité relevée : composante continue non détectée.', fix: 'Remplacer par un différentiel 30 mA type A.' },
  ],
  quiz: [
    { q: 'Pourquoi un fusible gPV par string dès qu\'il y en a deux en parallèle ?', options: ['Pour limiter la tension', 'Pour protéger un string du courant inverse fourni par l\'autre', 'Pour améliorer le rendement'], answer: 1 },
    { q: 'Quel type de différentiel protège le départ AC d\'un onduleur sans transformateur ?', options: ['Type AC', 'Type A', 'Type B obligatoire'], answer: 1 },
    { q: 'Dans quel ordre met-on l\'installation en service ?', options: ['AC puis DC', 'DC puis AC', 'Peu importe'], answer: 1 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
