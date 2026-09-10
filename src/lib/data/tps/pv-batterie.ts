/**
 * TP · Autoconsommation photovoltaïque avec batterie (onduleur hybride).
 * Prévu : implanté et documenté, câblage non encore jouable.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, ROOF_ITEMS, ROOF_RECV, X2 } from './common';

export const TP_PV_BATTERIE: TpDefinition = {
  id: 'pv-batterie',
  title: 'Autoconsommation photovoltaïque avec batterie',
  level: 'BTS Électrotechnique',
  family: 'pv',
  scene: 'pv',
  annex: 'roof',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Onduleur hybride, string photovoltaïque, batterie LiFePO₄ 48 V avec son propre sectionneur DC, coffret AC et compteur de production : autoconsommation avec stockage.',
  situation:
    'Une installation existante de 3 kWc doit être complétée par un stockage. Tu remplaces l\'onduleur par un modèle hybride, tu ajoutes la batterie 48 V avec son sectionneur et sa protection dédiés, puis tu contrôles les seuils de charge et de décharge avant la mise en service.',
  plaque: {
    Champ: '4 × 375 Wc = 1,5 kWc', Batterie: 'LiFePO₄ 48 V · 5 kWh',
    Onduleur: 'hybride 3 kVA', 'I charge': '50 A max', Autoconsommation: '≈ 70 %',
  },
  cahierDesCharges: [
    { k: 'Champ', v: 'string de 4 modules, fusible gPV et parafoudre DC' },
    { k: 'Batterie', v: 'LiFePO₄ 48 V 5 kWh, sectionneur DC Q3 dédié au plus près' },
    { k: 'Onduleur', v: 'hybride 3 kVA, entrées PV et batterie séparées' },
    { k: 'Coffret AC', v: 'disjoncteur 20 A et différentiel 30 mA type A' },
    { k: 'Comptage', v: 'compteur de production, injection en aval de l\'AGCP' },
    { k: 'Sécurité', v: 'signalisation batterie, ventilation du local, ordre de manœuvre affiché' },
  ],
  postes: [
    {
      id: 'bat',
      name: 'B1 · Batterie de stockage',
      need: 'Stocker 5 kWh en 48 V, avec BMS communiquant',
      options: [
        { key: 'battery', ref: 'LiFePO₄ 48 V · 5 kWh · BMS CAN', spec: 'lithium fer phosphate', ok: true, why: 'Chimie stable, profondeur de décharge élevée et BMS dialoguant avec l\'onduleur hybride.' },
        { key: 'battery', ref: 'Plomb ouvert 48 V · 5 kWh', spec: 'plomb ouvert', why: 'Dégagement d\'hydrogène, entretien et profondeur de décharge limitée à 50 %.' },
        { key: 'battery', ref: 'LiFePO₄ 24 V · 5 kWh', spec: '24 V', why: 'Tension incompatible avec l\'entrée batterie 48 V de l\'onduleur.' },
      ],
    },
    {
      id: 'qb',
      name: 'Q3 · Sectionneur batterie',
      need: 'Isoler la batterie de l\'onduleur, au plus près de la batterie',
      options: [
        { key: 'dcswitch', ref: 'Sectionneur DC 63 A · 1000 V + fusible', spec: 'coupure en charge', ok: true, why: 'Calibré pour le courant de charge / décharge, il permet d\'isoler la batterie pour toute intervention.' },
        { key: 'dcswitch', ref: 'Sectionneur DC 16 A', spec: '16 A', why: 'Sous-calibré : le courant de décharge atteint 50 A.' },
        { key: 'dcswitch', ref: 'Aucun sectionneur', spec: '—', why: 'Une batterie ne peut pas être mise hors tension : l\'organe de coupure est obligatoire.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'qdc', label: 'Q1 · Sectionneur DC', key: 'dcswitch', rail: 0, x: 52, rep: 'Q1' },
    { id: 'fdc1', label: 'F1 · Fusible string', key: 'dcfuse', rail: 0, x: 112, rep: 'F1' },
    { id: 'spd', label: 'F3 · Parafoudre DC', key: 'dcspd', rail: 0, x: 170, rep: 'F3' },
    { id: 'qb', label: 'Q3 · Sectionneur batterie', key: 'dcswitch', rail: 0, x: 228, rep: 'Q3' },
    { id: 'ond', label: 'U1 · Onduleur hybride', key: 'onduleur', rail: 1, x: 52, rep: 'U1' },
    { id: 'bat', label: 'B1 · Batterie 48 V', key: 'battery', rail: 1, x: 170, rep: 'B1' },
    { id: 'qac', label: 'Q2 · Disjoncteur AC', key: 'l_protecti_disjoncteur_20a', rail: 1, x: 280, rep: 'Q2' },
    { id: 'ddr', label: 'DDR1 · 30 mA type A', key: 'l_protecti_disjoncteur_diff_a', rail: 1, x: 314, rep: 'DDR1' },
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
  liaisons: [],
  nets: {},
  tests: [
    ...BASE_TESTS,
    {
      id: 'ubat',
      title: 'Tension de la batterie au repos',
      how: 'Sectionneur Q3 ouvert, multimètre en V⎓ aux bornes de la batterie.',
      expected: '48 à 54 V selon l\'état de charge',
    },
  ],
  mesures: [],
  faults: [
    { id: 'pol', title: 'Polarité batterie inversée', symptom: 'Onduleur en défaut, protection interne ou fusible fondu.', fix: 'Consigner, vérifier le repérage + / − avant tout raccordement.' },
    { id: 'bms', title: 'Liaison BMS non raccordée', symptom: 'La batterie ne se charge pas ou l\'onduleur limite la puissance.', fix: 'Raccorder le bus CAN et déclarer le modèle de batterie dans l\'onduleur.' },
  ],
  quiz: [
    { q: 'Pourquoi placer un organe de coupure au plus près de la batterie ?', options: ['Parce qu\'une batterie ne peut pas être mise hors tension à distance', 'Pour limiter la tension', 'Pour améliorer le rendement'], answer: 0 },
    { q: 'Quel avantage principal du LiFePO₄ face au plomb ouvert ?', options: ['Il est moins cher', 'Profondeur de décharge élevée, pas de dégagement d\'hydrogène, sans entretien', 'Il ne nécessite pas de protection'], answer: 1 },
    { q: 'Que fait un onduleur hybride de plus qu\'un onduleur string ?', options: ['Il gère une entrée batterie et arbitre charge, autoconsommation et injection', 'Il produit du continu', 'Il remplace le compteur'], answer: 0 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
