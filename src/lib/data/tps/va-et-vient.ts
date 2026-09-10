/**
 * TP · Va-et-vient et télérupteur (scène habitat, 230 V mono).
 *
 * Deux circuits d'éclairage dans le même logement :
 *  - E1 (couloir) commandé de deux endroits par un vrai va-et-vient (SA1 / SA2, deux navettes) ;
 *  - E2 (séjour) commandé de trois endroits par un télérupteur KA1 et trois boutons poussoirs.
 *
 * Correspondances avec le moteur de simulation (identifiants imposés `q1`, `f2`, `f3`, `f1`, `km1`) :
 *  q1 = AGCP (séparation générale) · f2 = interrupteur différentiel 30 mA ·
 *  f3 = disjoncteur 2 A du circuit de commande · f1 = disjoncteur 10 A éclairage ·
 *  km1 = télérupteur KA1. Les boutons du bloc de commande (S2 vert = allumage,
 *  S1 rouge = extinction) représentent les poussoirs de l'entrée et du couloir.
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

/** Pièce : interrupteurs va-et-vient, bornes de navette et bouton poussoir. */
const ROOM: AnnexItem[] = [
  { key: 'l_commande_interrupteur_va_et_vient', rep: 'SA1', name: 'interrupteur va-et-vient (bornes L et 1)', x: 444, y: 300, w: 44, h: 44 },
  { key: 'l_borniers_wago_x2', rep: 'SA1B', name: 'SA1 · borne 2 (navette), boîte d\'encastrement', x: 444, y: 356, w: 34, h: 22 },
  { key: 'l_commande_interrupteur_va_et_vient', rep: 'SA2', name: 'interrupteur va-et-vient (bornes L et 1)', x: 444, y: 396, w: 44, h: 44 },
  { key: 'l_borniers_wago_x2', rep: 'SA2B', name: 'SA2 · borne 2 (navette), boîte d\'encastrement', x: 444, y: 452, w: 34, h: 22 },
  { key: 'l_commande_bouton_poussoir', rep: 'SB2', name: 'bouton poussoir du séjour', x: 444, y: 496, w: 44, h: 44 },
];

/** Récepteurs : deux points lumineux DCL. */
const RECV: AnnexItem[] = [
  { key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'point lumineux DCL · couloir', x: 40, y: 34, w: 60, h: 60, recv: true },
  { key: 'l_ampoule_plexo_hublot', rep: 'E2', name: 'point lumineux DCL · séjour', x: 180, y: 34, w: 60, h: 60, recv: true },
];

export const TP_VA_ET_VIENT: TpDefinition = {
  id: 'va-et-vient',
  title: 'Va-et-vient et télérupteur',
  level: '2de Bac Pro MELEC',
  family: 'hab',
  scene: 'hab',
  annex: 'room',
  playable: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    'Deux circuits d\'éclairage 230 V mono : le couloir en va-et-vient (SA1 / SA2, deux navettes en 1,5 mm²), le séjour par télérupteur KA1 commandé de trois endroits. AGCP, interrupteur différentiel 30 mA, disjoncteurs 10 A et 2 A, bornier X1 de raccordement.',
  situation:
    'Dans un logement neuf, tu dois câbler l\'éclairage du couloir et celui du séjour. Le couloir est commandé de deux endroits par un va-et-vient classique : deux interrupteurs à trois bornes reliés par deux navettes. Le séjour, commandé de trois endroits, ne peut plus l\'être en va-et-vient : tu installes un télérupteur dans le tableau, dont la bobine reçoit une impulsion des trois boutons poussoirs câblés en parallèle. Tu réalises ensuite les tests, la consignation, les mesures et la mise en service.',
  plaque: {
    Circuits: '2 circuits éclairage 230 V ~ 50 Hz',
    'Points lumineux': '2 DCL (couloir · séjour)',
    Section: '1,5 mm² · PE 1,5 mm²',
    Protection: 'Q1 10 A courbe C · différentiel 30 mA type AC',
    Commande: 'télérupteur 16 A bobine 230 V · 3 poussoirs',
    Régime: 'TT · liaison équipotentielle',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE sur X1:1 · X1:2 · X1:3 (câblage installateur)' },
    { k: 'Rangée 1', v: 'Q0 AGCP 15/45 A · ID1 différentiel 40 A 30 mA · Q1 éclairage 10 A · Q2 commande 2 A' },
    { k: 'Rangée 2', v: 'KA1 télérupteur 16 A bobine 230 V · H3 voyant de présence tension' },
    { k: 'Rangée 3', v: 'X1 · bornier de raccordement, 12 bornes étroites repérées' },
    { k: 'Éclairage', v: '1,5 mm², protection 10 A (16 A maximum, 8 points par circuit — NF C 15-100)' },
    { k: 'Va-et-vient', v: 'phase au commun de SA1, deux navettes SA1 → SA2, retour lampe par le commun de SA2' },
    { k: 'Bornes de navette', v: 'les interrupteurs ont trois bornes ; sur la maquette la borne 2 est déportée sur le bloc SA1B / SA2B de la boîte d\'encastrement' },
    { k: 'Télérupteur', v: 'bobine sur bornes 1 (impulsion) et 3 (neutre), contact de puissance sur bornes 2 et 4' },
    { k: 'Boutons poussoirs', v: 'S2 (entrée) et S1 (couloir) du bloc de commande + SB2 (séjour), tous en parallèle sur X1:8 / X1:9' },
    { k: 'Signalisation', v: 'H1 indique l\'état du circuit séjour, H3 la présence de tension au tableau' },
    { k: 'Avant mise en service', v: 'contrôle visuel · consignation · VAT · continuité PE · isolement 500 V' },
  ],
  postes: [
    {
      id: 'q',
      name: 'Q1 · Protection du circuit d\'éclairage',
      need: 'Protéger deux circuits d\'éclairage câblés en 1,5 mm²',
      options: [
        { key: 'mcb2p', ref: 'iC60N 1P+N C10', spec: '10 A · courbe C · 1P+N', ok: true, why: 'Calibre usuel de l\'éclairage : 1,5 mm² protégé (16 A maximum admis), coupure du neutre incluse.' },
        { key: 'mcb2p', ref: 'iC60N 1P+N C20', spec: '20 A · courbe C', why: 'Le 1,5 mm² n\'est plus protégé : 16 A est le calibre maximal pour cette section.' },
        { key: 'mcb1p', ref: 'iC60N 1P C10', spec: '10 A · unipolaire', why: 'En habitat le neutre doit être coupé : la protection est 1P+N ou 2P.' },
      ],
    },
    {
      id: 'id',
      name: 'ID1 · Interrupteur différentiel',
      need: 'Protection des personnes en tête de rangée (régime TT)',
      options: [
        { key: 'rcd2p', ref: 'iID 2P 40 A 30 mA type AC', spec: '40 A · 30 mA', ok: true, why: '30 mA obligatoire pour les circuits terminaux ; 40 A couvre la somme des départs de la rangée.' },
        { key: 'rcd2eaton', ref: 'HNC-25/2/003', spec: '25 A · 30 mA', half: true, why: 'Sensibilité correcte, mais 25 A est juste pour une rangée complète.' },
        { key: 'rcd2p', ref: 'iID 2P 40 A 300 mA', spec: '40 A · 300 mA', why: '300 mA ne protège pas les personnes : c\'est une protection contre l\'incendie.' },
      ],
    },
    {
      id: 'tl',
      name: 'KA1 · Appareil de commande',
      need: 'Commander un point lumineux depuis trois endroits',
      options: [
        { key: 'timer', ref: 'Télérupteur 16 A · bobine 230 V', spec: '1 module · silencieux', ok: true, why: 'Au-delà de deux points de commande, le télérupteur remplace avantageusement les navettes du va-et-vient.' },
        { key: 'timer', ref: 'Minuterie 16 A', spec: 'extinction temporisée', why: 'Une minuterie éteint toute seule : ce n\'est pas la fonction demandée dans un séjour.' },
        { key: 'timer', ref: 'Contacteur jour-nuit 20 A', spec: 'contact maintenu', why: 'Le contacteur suit un contact maintenu (heures creuses), pas des impulsions de poussoirs.' },
      ],
    },
    {
      id: 'sect',
      name: 'Conducteurs du va-et-vient',
      need: 'Alimenter le point lumineux du couloir et les deux navettes',
      options: [
        { key: 'termred', ref: 'H07V-U 1,5 mm²', spec: 'phase brun · navettes noir/gris · neutre bleu · PE vert-jaune', ok: true, why: 'Section réglementaire de l\'éclairage ; le vert-jaune reste strictement réservé au PE.' },
        { key: 'termred', ref: 'H07V-U 2,5 mm²', spec: 'tout en 2,5 mm²', half: true, why: 'Fonctionne mais surcoût inutile et bornes d\'appareillage difficiles à serrer.' },
        { key: 'termred', ref: 'H07V-U 1,5 mm² · navettes vert-jaune', spec: 'navettes en vert-jaune', why: 'Interdit : le vert-jaune est réservé au conducteur de protection.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q0 · AGCP 15/45 A', key: 'agcp', rail: 0, x: 52, rep: 'Q0' },
    { id: 'f2', label: 'ID1 · Différentiel 40 A 30 mA', key: 'rcd2p', rail: 0, x: 132, rep: 'ID1' },
    { id: 'f1', label: 'Q1 · Éclairage 10 A', key: 'mcb2p', rail: 0, x: 194, rep: 'Q1' },
    { id: 'f3', label: 'Q2 · Commande 2 A', key: 'mcb1p', rail: 0, x: 256, rep: 'Q2' },
    { id: 'km1', label: 'KA1 · Télérupteur 16 A', key: 'timer', rail: 1, x: 52, rep: 'KA1' },
    { id: 'h3', label: 'H3 · Voyant présence tension', key: 'lampG', rail: 1, x: 120, rep: 'H3' },
    ...bornier(52, [
      ['termred', '1', 'L'], ['termblue', '2', 'N'], ['earth', '3', 'PE'],
      ['termred', '4', 'L-VV'], ['termred', '5', 'RET'], ['termblue', '6', 'N-ECL'],
      ['termred', '7', 'L-TL'], ['termred', '8', 'CMD'], ['termred', '9', 'RET-C'],
      ['termred', '10', 'H1'], ['termblue', '11', 'N-H'], ['earth', '12', 'PE'],
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
    L('x1_3.a', 'x1_12.a', 'PE'),
    // ---- circuit 1 : va-et-vient du couloir
    L('f1.2', 'x1_4.a', 'L1'), L('x1_4.b', 'SA1.X1', 'L1'),
    L('SA1.X2', 'SA2.X2', 'L1'), L('SA1B.X1', 'SA2B.X1', 'L1'),
    L('SA2.X1', 'x1_5.b', 'L1'), L('x1_5.a', 'E1.X1', 'L1'),
    L('f1.N2', 'x1_6.a', 'N'), L('x1_6.b', 'E1.X2', 'N'),
    // ---- circuit 2 : télérupteur du séjour
    L('f1.2', 'km1.2', 'L1'), L('km1.4', 'x1_7.a', 'L1'), L('x1_7.b', 'E2.X1', 'L1'),
    L('x1_6.b', 'E2.X2', 'N'),
    // ---- commande du télérupteur : trois poussoirs en parallèle
    L('f3.2', 'x1_8.a', 'L1'),
    L('x1_8.b', 'S2.13', 'L1', 'door'), L('S2.14', 'x1_9.b', 'L1', 'door'),
    L('x1_8.b', 'S1.21', 'L1', 'door'), L('S1.22', 'x1_9.b', 'L1', 'door'),
    L('x1_8.b', 'SB2.X1', 'L1'), L('SB2.X2', 'x1_9.b', 'L1'),
    L('x1_9.a', 'km1.1', 'L1'), L('km1.3', 'f2.N2', 'N'),
    // ---- signalisation
    L('km1.4', 'x1_10.a', 'L1'), L('x1_10.b', 'H1.X1', 'L1', 'door'),
    L('f2.N2', 'x1_11.a', 'N'), L('x1_11.b', 'H1.X2', 'N', 'door'),
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
    // circuit d'éclairage (interrupteurs fermés)
    'f1.2': { net: 'L1', live: 'f2' }, 'f1.N2': { net: 'N', live: 'f2' },
    'x1_4.a': { net: 'L1', live: 'f2' }, 'x1_4.b': { net: 'L1', live: 'f2' },
    'SA1.X1': { net: 'L1', live: 'f2' }, 'SA1.X2': { net: 'L1', live: 'f2' },
    'SA1B.X1': { net: 'L1', live: 'f2' }, 'SA1B.X2': { net: 'L1', live: 'f2' },
    'SA2.X2': { net: 'L1', live: 'f2' }, 'SA2B.X1': { net: 'L1', live: 'f2' },
    'SA2B.X2': { net: 'L1', live: 'f2' }, 'SA2.X1': { net: 'L1', live: 'f2' },
    'x1_5.a': { net: 'L1', live: 'f2' }, 'x1_5.b': { net: 'L1', live: 'f2' },
    'E1.X1': { net: 'L1', live: 'f2' }, 'E1.X2': { net: 'N', live: 'f2' },
    'x1_6.a': { net: 'N', live: 'f2' }, 'x1_6.b': { net: 'N', live: 'f2' },
    'km1.2': { net: 'L1', live: 'f2' },
    // commande du télérupteur
    'f3.2': { net: 'L1', live: 'ctl' },
    'x1_8.a': { net: 'L1', live: 'ctl' }, 'x1_8.b': { net: 'L1', live: 'ctl' },
    'S1.21': { net: 'L1', live: 'ctl' }, 'S2.13': { net: 'L1', live: 'ctl' },
    'SB2.X1': { net: 'L1', live: 'ctl' },
    // aval des poussoirs : au repos, aucun potentiel
    'S1.22': { net: 'L1', live: 'off' }, 'S2.14': { net: 'L1', live: 'off' },
    'SB2.X2': { net: 'L1', live: 'off' },
    'x1_9.a': { net: 'L1', live: 'off' }, 'x1_9.b': { net: 'L1', live: 'off' },
    'km1.1': { net: 'L1', live: 'off' }, 'km1.3': { net: 'N', live: 'f2' },
    // aval du contact du télérupteur
    'km1.4': { net: 'L1', live: 'run' },
    'x1_7.a': { net: 'L1', live: 'run' }, 'x1_7.b': { net: 'L1', live: 'run' },
    'E2.X1': { net: 'L1', live: 'run' }, 'E2.X2': { net: 'N', live: 'f2' },
    'x1_10.a': { net: 'L1', live: 'run' }, 'x1_10.b': { net: 'L1', live: 'run' },
    'H1.X1': { net: 'L1', live: 'run' }, 'H1.X2': { net: 'N', live: 'f2' },
    'x1_11.a': { net: 'N', live: 'f2' }, 'x1_11.b': { net: 'N', live: 'f2' },
    // conducteur de protection
    'x1_12.a': { net: 'PE', live: 'always' }, 'x1_12.b': { net: 'PE', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'nav',
      title: 'Contrôle des navettes du va-et-vient',
      how: 'Multimètre en Ω : vérifie qu\'une seule navette est fermée à la fois entre SA1 et SA2, puis que le commun de SA2 revient bien sur X1:5.',
      expected: 'basculement franc, aucune continuité entre les deux navettes',
    },
    {
      id: 'rep',
      title: 'Repérage et sections',
      how: 'Vérifie que l\'éclairage est en 1,5 mm², la phase en brun, le neutre en bleu clair, le PE en vert-jaune, et que chaque borne du bornier X1 porte son repère.',
      expected: 'repérage conforme NF C 15-100',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du conducteur de protection', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'x1_12.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement du circuit éclairage sous 500 V', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'x1_4.a', b: 'x1_3.a', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'nav', title: 'Continuité de la navette 1 (SA1 → SA2)', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'SA1.X2', b: 'SA2.X2', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'u230', title: 'Tension d\'arrivée au bornier X1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'x1_1.a', b: 'x1_2.a', min: 225, max: 240, unit: 'V',
    },
    {
      id: 'uid', title: 'Tension en aval du différentiel ID1', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'f2.2', b: 'f2.N2', min: 225, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'ue2', title: 'Tension au point lumineux du séjour, télérupteur enclenché', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'E2.X1', b: 'E2.X2', min: 225, max: 240, unit: 'V', when: 'run',
    },
  ],
  faults: [
    { id: 'x2', title: 'Fil X1:9 → KA1 borne 1 débranché', symptom: 'Aucun appui de poussoir n\'allume le séjour, pourtant la commande est sous tension en X1:8.', fix: 'Reconnecter le retour des poussoirs sur la borne 1 (bobine) du télérupteur.' },
    { id: 'a2', title: 'Neutre de la bobine (KA1 borne 3) mal serré', symptom: 'Le télérupteur claque sans basculer, la lampe du séjour clignote.', fix: 'Resserrer le neutre de la bobine sur la sortie neutre du différentiel.' },
    { id: 'f3', title: 'Q2 (commande 2 A) déclenché', symptom: 'Les poussoirs sont sans effet et aucune tension n\'est mesurée en X1:8.', fix: 'Chercher le défaut du circuit de commande (bobine ou poussoir en court-circuit), puis réarmer Q2.' },
  ],
  quiz: [
    { q: 'Combien de conducteurs relient les deux interrupteurs d\'un va-et-vient ?', options: ['Un seul', 'Deux navettes', 'Trois navettes'], answer: 1 },
    { q: 'À partir de combien de points de commande le télérupteur devient-il préférable au va-et-vient ?', options: ['Deux', 'Trois', 'Cinq'], answer: 1 },
    { q: 'Quelle section et quel calibre maximal pour un circuit d\'éclairage en habitat ?', options: ['1,5 mm² et 16 A', '2,5 mm² et 20 A', '1,5 mm² et 20 A'], answer: 0 },
  ],
  motor: null,
  station: true,
  hasMotor: false,
};
