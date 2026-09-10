/**
 * TP · Va-et-vient et télérupteur (scène habitat).
 * Liaisons complètes : arrivée mono L/N/PE, télérupteur commandé par trois boutons,
 * point lumineux DCL en pièce, voyants de tableau.
 */
import type { TpDefinition } from '@/lib/types';
import { BASE_TESTS, L, ROOM_ITEMS, X2 } from './common';

export const TP_VA_ET_VIENT: TpDefinition = {
  id: 'va-et-vient',
  title: 'Va-et-vient et télérupteur',
  level: '2de Bac Pro MELEC',
  family: 'hab',
  scene: 'hab',
  annex: 'room',
  playable: false,
  competences: ['C5 Réaliser', 'C6 Mettre en service'],
  summary:
    'Commande d\'un point lumineux depuis trois endroits : télérupteur KA1 sur rail, boutons poussoirs en pièce, bornier X1 de départ, voyants de tableau.',
  situation:
    'Le couloir du logement doit être commandé depuis trois endroits. Plutôt que de multiplier les navettes d\'un va-et-vient, tu installes un télérupteur dans le tableau : les trois boutons poussoirs sont raccordés en parallèle sur la bobine, et le contact du télérupteur alimente le point lumineux DCL.',
  plaque: {
    Circuit: 'éclairage 230 V mono', Protection: 'Q1 10 A courbe C',
    Section: '1,5 mm²', Télérupteur: 'bobine 230 V · contact 16 A', Points: '1 DCL · 3 boutons',
  },
  cahierDesCharges: [
    { k: 'Arrivée', v: '230 V mono L + N + PE sur le bornier X1' },
    { k: 'Protection', v: 'Q1 10 A courbe C, circuit éclairage 1,5 mm²' },
    { k: 'Commande', v: 'trois boutons poussoirs en parallèle sur la bobine du télérupteur' },
    { k: 'Puissance', v: 'contact du télérupteur → borne 4 du bornier → point lumineux E1' },
    { k: 'Signalisation', v: 'H1 état de l\'éclairage, H2 présence tension tableau' },
    { k: 'Bornier X1', v: '6 bornes : L · N · PE · éclairage · neutre éclairage · retour boutons' },
  ],
  postes: [
    {
      id: 'tl',
      name: 'KA1 · Télérupteur',
      need: 'Commander un point lumineux depuis plus de deux endroits',
      options: [
        { key: 'timer', ref: 'TL 16 A · bobine 230 V', spec: '1 module · silencieux', ok: true, why: 'Au-delà de deux points de commande, le télérupteur remplace avantageusement les navettes.' },
        { key: 'timer', ref: 'Minuterie 16 A', spec: 'extinction temporisée', why: 'Une minuterie éteint toute seule : ce n\'est pas la fonction demandée.' },
        { key: 'timer', ref: 'Contacteur J/N', spec: 'contacteur heures creuses', why: 'Destiné au chauffe-eau, piloté par le compteur, pas par des boutons.' },
      ],
    },
    {
      id: 'q',
      name: 'Q1 · Protection du circuit',
      need: 'Protéger un circuit d\'éclairage en 1,5 mm²',
      options: [
        { key: 'mcb2p', ref: 'iC60N 1P+N C10', spec: '10 A · courbe C', ok: true, why: 'Calibre maximal admis pour l\'éclairage en 1,5 mm², coupure du neutre incluse.' },
        { key: 'mcb2p', ref: 'iC60N 1P+N C20', spec: '20 A · courbe C', why: 'Le 1,5 mm² n\'est plus protégé.' },
        { key: 'mcb2p', ref: 'iC60N 1P+N C2', spec: '2 A · courbe C', half: true, why: 'Protège, mais un calibre aussi faible n\'a pas de justification pour huit points lumineux.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q', label: 'Q1 · Éclairage', key: 'mcb2p', rail: 0, x: 52, rep: 'Q1' },
    { id: 'tl', label: 'KA1 · Télérupteur', key: 'timer', rail: 0, x: 120, rep: 'KA1' },
    { id: 'h1', label: 'H1 · État éclairage', key: 'lampG', rail: 1, x: 52, rep: 'H1' },
    { id: 'h2', label: 'H2 · Présence tension', key: 'lampG', rail: 1, x: 84, rep: 'H2' },
    ...X2(52, 6, 2, { group: 'X1', groupLabel: 'X1 · bornier de départ' }),
  ],
  annexItems: ROOM_ITEMS,
  liaisons: [
    // arrivée branchement (câblage installateur)
    L('RES.L1', 'x2_1.b', 'L1', 'pre'), L('RES.N', 'x2_2.b', 'N', 'pre'), L('RES.PE', 'x2_3.b', 'PE', 'pre'),
    // protection et distribution
    L('x2_1.a', 'q.1', 'L1'), L('x2_2.a', 'q.N', 'N'),
    // boucle des boutons poussoirs (phase permanente prise sur la borne d'arrivée)
    L('x2_1.b', 'BP.X1', 'L1'), L('x2_1.b', 'S1.X1', 'L1'), L('x2_1.b', 'S2.X1', 'L1'),
    L('BP.X2', 'x2_6.b', 'L1'), L('S1.X2', 'x2_6.b', 'L1'), L('S2.X2', 'x2_6.b', 'L1'),
    // bobine du télérupteur
    L('x2_6.a', 'tl.1', 'L1'), L('tl.2', 'q.N2', 'N'),
    // contact du télérupteur → point lumineux
    L('q.2', 'tl.3', 'L1'), L('tl.4', 'x2_4.a', 'L1'),
    L('x2_4.b', 'E1.X1', 'L1'), L('E1.X2', 'x2_5.b', 'N'), L('x2_5.a', 'q.N2', 'N'),
    // signalisation
    L('tl.4', 'h1.X1', 'L1'), L('h1.X2', 'q.N2', 'N'),
    L('q.2', 'h2.X1', 'L1'), L('h2.X2', 'q.N2', 'N'),
  ],
  nets: {},
  tests: BASE_TESTS,
  mesures: [],
  faults: [
    { id: 'bob', title: 'Bobine du télérupteur alimentée en permanence', symptom: 'Le télérupteur bourdonne et chauffe, l\'éclairage bascule sans arrêt.', fix: 'Reprendre la boucle des boutons : la bobine ne doit être alimentée qu\'à l\'impulsion.' },
    { id: 'bp', title: 'Un bouton poussoir câblé en interrupteur', symptom: 'Depuis ce point, la lumière ne s\'éteint plus tant que l\'on n\'a pas relâché.', fix: 'Remplacer par un poussoir et vérifier le retour sur X1:6.' },
  ],
  quiz: [
    { q: 'À partir de combien de points de commande le télérupteur devient-il préférable au va-et-vient ?', options: ['2', '3', '5'], answer: 1 },
    { q: 'Que reçoit la bobine du télérupteur ?', options: ['Une tension permanente', 'Une impulsion à chaque appui sur un bouton', 'Le courant de la lampe'], answer: 1 },
    { q: 'Quelle section et quel calibre pour un circuit d\'éclairage ?', options: ['1,5 mm² et 16 A maximum', '2,5 mm² et 20 A', '1,5 mm² et 10 A'], answer: 2 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
