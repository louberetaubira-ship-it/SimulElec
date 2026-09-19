/**
 * TP · Plateau tertiaire KNX — éclairage de deux zones sur bus KNX.
 *
 * Suite du TP papier « KNX-ETS5 1.1 » du banc DOMO-KNX de l'établissement. Le
 * TP 1.1 commandait UN point lumineux par UN poussoir : la fonction télérupteur
 * transposée en KNX. Celui-ci garde ce montage — la fonction F1 de l'accueil en
 * est la copie — et va chercher ce que le premier laissait de côté :
 *
 *  - DEUX circuits sur les deux sorties du même actionneur, donc une vraie
 *    structure d'adressage à trois niveaux (1/1/1, 1/1/2, 1/2/1, 1/2/2, 0/0/1) ;
 *  - le RETOUR D'ÉTAT : l'actionneur renvoie l'état de sa sortie vers la LED du
 *    poussoir. Le MGU3.531.18 en a quatre, le TP 1.1 n'en utilisait aucune ;
 *  - une fonction TERTIAIRE : temporisation d'escalier 5 min sur la salle de
 *    réunion, et extinction générale du plateau par une adresse centrale ;
 *  - des MESURES : 29 V DC sur le bus, polarité, 230 V en sortie d'actionneur ;
 *  - un DIAGNOSTIC : quatre pannes de natures différentes — bus, puissance,
 *    départ récepteur, protection.
 *
 * Tout l'appareillage existe sur le banc : alimentation MTN684032, interface USB
 * MTN681829, actionneur MTN649202, poussoir MGU3.531.18 et deux hublots. Rien à
 * acheter — et c'est justement ce que le bon de commande fait découvrir, puisque
 * l'actionneur du banc n'est plus fabriqué depuis le 31/12/2021.
 *
 * Particularités de modélisation, à lire avant de toucher aux `nets` :
 *
 *  - le bus KNX est un réseau CONTINU : ses bornes portent `DC+` / `DC−` et le TP
 *    déclare `uContinu: 29`. Le voltmètre ne le lit donc qu'en V⎓ — une pointe en
 *    V~ affiche 0, comme un vrai appareil ;
 *  - les trois protections du moteur de simulation sont ici Q1 (différentiel de
 *    tête, organe de consignation), Q2 (alimentation du bus) et Q3 (départs
 *    d'éclairage). Le bus est vif sous `'f2'` (Q1 + Q2) ; les sorties de
 *    l'actionneur sous `'f3'` (Q1 + Q2 + Q3), ce qui est exact : sans bus, pas de
 *    télégramme, et sans Q3 pas de 230 V ;
 *  - les sorties de l'actionneur sont déclarées vives dès la chaîne fermée : le
 *    MTN649202 porte une COMMANDE MANUELLE locale, et c'est elle que le
 *    simulateur reproduit — l'élève mesure ce qu'il mesurerait au banc en
 *    basculant les deux leviers verts.
 */
import type { Slot, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/**
 * Bornier X1 du tableau tertiaire : arrivée (L · N · PE) puis les deux départs
 * d'éclairage, chacun avec sa phase coupée et son neutre. Pas de X2 : il n'y a
 * pas de circuit de commande filaire — c'est tout l'intérêt du bus.
 */
const X1_TER: Slot[] = ([
  ['x1_1', 'termred', '1', 'L', 'Arrivée phase'],
  ['x1_2', 'termblue', '2', 'N', 'Arrivée neutre'],
  ['x1_3', 'earth', '3', 'PE', 'Terre'],
  ['x1_4', 'termred', '4', 'L1', 'Accueil · phase coupée'],
  ['x1_5', 'termblue', '5', 'N1', 'Accueil · neutre'],
  ['x1_6', 'termred', '6', 'L2', 'Réunion · phase coupée'],
  ['x1_7', 'termblue', '7', 'N2', 'Réunion · neutre'],
] as const).map(([id, key, mark, sub, label], i) => ({
  id,
  label: `X1:${mark} · ${label}`,
  key,
  rail: 2,
  x: 46 + i * 18 + (i >= 3 ? 10 : 0),
  mark,
  sub,
  group: 'X1',
  ...(i === 0 ? { groupLabel: 'X1 · bornier tertiaire' } : {}),
}));

export const TP_KNX_TERTIAIRE: TpDefinition = {
  id: 'knx-tertiaire',
  title: 'Plateau tertiaire KNX · éclairage deux zones',
  level: 'BTS Électrotechnique · Tle Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  competences: ['C1 Analyser', 'C3 Concevoir', 'C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  diplomas: ['bts', 'bacpro'],
  // Tension continue du bus : 29 V, valeur normalisée KNX. C'est elle que lit le
  // voltmètre en V⎓, et elle contredit deux réponses du corrigé du TP 1.1.
  uContinu: 29,
  summary:
    'Plateau de bureaux KNX sur banc DOMO-KNX. Alimentation de bus MTN684032, interface USB MTN681829, '
    + 'actionneur de commutation MTN649202 (2 × 230 V / 10 A) et poussoir Unica KNX MGU3.531.18. '
    + 'Deux circuits d’éclairage — accueil et salle de réunion — commandés par le bus, avec retour '
    + 'd’état, temporisation d’escalier et extinction générale du plateau.',
  situation:
    'Le cabinet KOUROU CONSEIL emménage au 1er étage d’un immeuble de bureaux. Il te confie '
    + 'l’installation et la programmation de son système KNX. Depuis un seul poussoir placé dans la '
    + 'circulation, il veut commander l’éclairage de l’accueil et celui de la salle de réunion, voir '
    + 'sur le poussoir si une lampe est restée allumée, que la salle de réunion s’éteigne seule au bout '
    + 'de cinq minutes, et pouvoir éteindre tout le plateau d’un seul appui en fin de journée.',
  plaque: {
    'Bus KNX': '29 V DC · paire torsadée',
    'Alimentation': '230 V AC → 320 mA',
    'Participants': '64 par ligne',
    'Actionneur': '2 × 230 V · 10 A par voie',
    'Poussoir': '2 touches · 4 poussoirs · LED d’état',
    'Récepteurs': '2 hublots E27 · 2 × 60 W',
    'Logiciel': 'ETS5 Professional',
    'Topologie': 'ligne unique 1.1 · guirlande, jamais en boucle',
  },
  cahierDesCharges: [
    { k: 'Réseau', v: '230 V + N + PE, 50 Hz, arrivée sur bornier X1' },
    { k: 'Bus KNX', v: 'paire torsadée 29 V DC issue de l’alimentation MTN684032 · conducteur (+) rouge, (−) noir' },
    { k: 'Topologie', v: 'câblage en guirlande ou en étoile — JAMAIS EN BOUCLE, contrôle avant mise sous tension' },
    { k: 'F1 · Accueil', v: 'touche 1 du poussoir → sortie A de l’actionneur → hublot L1, fonctionnement télérupteur' },
    { k: 'F1 · Retour d’état', v: 'la sortie A renvoie son état vers la LED de la touche 1 : la LED suit la lampe, pas le bouton' },
    { k: 'F2 · Salle de réunion', v: 'touche 2 → sortie B → hublot L2, avec TEMPORISATION D’ESCALIER 5 min paramétrée dans l’application de l’actionneur ; appui long = maintien forcé' },
    { k: 'F3 · Extinction générale', v: 'appui long sur la touche 2 bas → adresse de groupe centrale → les DEUX sorties retombent' },
    { k: 'Adressage', v: 'adresses individuelles 1.1.1 actionneur · 1.1.2 poussoir · 1.1.250 interface USB ; l’alimentation n’en porte pas' },
    { k: 'Adresses de groupe', v: '1/1/1 et 1/1/2 accueil (commande + état) · 1/2/1 et 1/2/2 réunion · 0/0/1 extinction générale' },
    { k: 'Protections', v: 'Q1 différentiel 30 mA en tête (consignation) · Q2 alimentation du bus · Q3 départs éclairage' },
    { k: 'Couleurs', v: 'bus (+) rouge · bus (−) noir · phase rouge · phase coupée noir · neutre bleu · PE vert-jaune' },
    { k: 'Avant mise en service', v: 'consignation sur Q1 · VAT · continuité PE · contrôle de polarité et d’absence de boucle sur le bus' },
  ],
  preparation: {
    identification: [
      {
        id: 'id-a1', rep: 'A1', focus: 'A1',
        invite: 'Quel appareil porte ce repère, entre le 230 V et la paire torsadée ?',
        options: [
          'L’alimentation de bus KNX',
          'Un transformateur de commande 24 V',
          'Un variateur d’éclairage',
          'Un parafoudre',
        ],
        answer: 0,
        why: 'MTN684032 : elle transforme le 230 V AC en 29 V DC pour le bus et alimente jusqu’à 64 participants. Sans elle, aucun appareil ne communique, même alimenté en 230 V.',
      },
      {
        id: 'id-k1', rep: 'K1', focus: 'K1',
        invite: 'Ce module à prise USB type B sert à :',
        options: [
          'Relier le PC et son logiciel ETS5 au bus KNX',
          'Alimenter le bus',
          'Commander l’éclairage',
          'Mesurer la consommation du plateau',
        ],
        answer: 0,
        why: 'MTN681829 : c’est l’interface de mise en service. C’est par elle qu’ETS5 attribue les adresses individuelles et télécharge les programmes — sans elle, pas d’adressage.',
      },
      {
        id: 'id-k2', rep: 'K2', focus: 'K2',
        invite: 'Cet appareil à deux leviers verts en façade est :',
        options: [
          'L’actionneur de commutation, à deux sorties 230 V',
          'Un contacteur de puissance',
          'Un détecteur de présence',
          'Un coupleur de ligne',
        ],
        answer: 0,
        why: 'MTN649202, actionneur 2 × 230 V / 10 A. Les deux leviers sont sa commande manuelle locale : il ferme ses contacts même sans télégramme.',
      },
      {
        id: 'id-bp', rep: 'BP1', focus: 'BP1',
        invite: 'Combien de fonctions différentes ce poussoir peut-il commander ?',
        options: ['Quatre', 'Une', 'Deux', 'Huit'],
        answer: 0,
        why: 'MGU3.531.18 : deux bascules, donc quatre poussoirs indépendants — et une LED d’état par touche. Le TP 1.1 n’en utilisait qu’un seul.',
      },
    ],
    fonctions: [
      {
        id: 'fn-ug', rep: 'A1', focus: 'A1',
        invite: 'Quelle tension mesure-t-on entre les deux conducteurs du bus KNX ?',
        options: ['29 V continu', '50 V continu', '24 V alternatif', '230 V alternatif'],
        answer: 0,
        why: '29 V DC. Le 230 V alternatif n’est présent QUE sur l’alimentation de bus et sur les sorties de l’actionneur : les capteurs, eux, ne voient jamais que le bus.',
      },
      {
        id: 'fn-boucle', rep: 'BUS', focus: 'K2',
        invite: 'Pourquoi le bus ne doit-il jamais être câblé en boucle ?',
        options: [
          'La boucle perturbe la transmission des télégrammes et fausse la topologie',
          'Elle provoque un court-circuit immédiat',
          'Elle double la tension du bus',
          'Elle empêche l’alimentation de démarrer',
        ],
        answer: 0,
        why: 'La topologie KNX admet la guirlande, l’étoile et l’arbre, jamais l’anneau : une boucle crée des chemins multiples et rend la transmission aléatoire. C’est la consigne en rouge du TP 1.1.',
      },
      {
        id: 'fn-etat', rep: 'BP1', focus: 'BP1',
        invite: 'À quoi sert l’adresse de groupe 1/1/2 « Accueil — État L1 » ?',
        options: [
          'L’actionneur y publie l’état réel de sa sortie, que la LED du poussoir affiche',
          'Elle commande la lampe de l’accueil',
          'Elle éteint tout le plateau',
          'Elle donne l’adresse individuelle du poussoir',
        ],
        answer: 0,
        why: 'C’est le retour d’état : l’émetteur est l’actionneur, le récepteur est la LED. La LED suit donc la LAMPE, et non l’appui sur le bouton — elle reste juste même si quelqu’un a éteint à la main.',
      },
      {
        id: 'fn-central', rep: 'K2', focus: 'K2',
        invite: 'Comment une seule adresse de groupe peut-elle éteindre les deux circuits ?',
        options: [
          'Les deux sorties sont associées à la même adresse 0/0/1 et reçoivent le même télégramme',
          'En coupant la protection Q3',
          'En envoyant deux télégrammes successifs',
          'En inversant la polarité du bus',
        ],
        answer: 0,
        why: 'Un télégramme est diffusé : tous les objets associés à 0/0/1 le reçoivent au même instant. C’est ce qui rend l’extinction générale instantanée, sans câble supplémentaire — l’argument de vente du bus en tertiaire.',
      },
    ],
  },
  postes: [
    {
      id: 'a1', name: 'A1 · Alimentation de bus KNX',
      need: 'Fournir le 29 V DC du bus à partir du 230 V, pour une ligne de moins de 64 participants',
      options: [
        { key: 'knxalim', ref: 'Schneider MTN684032', spec: '230 V AC → bus 320 mA · 64 participants · bobine d’inductance intégrée', ok: true, why: 'C’est l’appareil du banc. 320 mA couvrent très largement les trois participants du TP, et la bobine d’inductance est intégrée — rien à ajouter.' },
        { key: 'knxalim', ref: 'Schneider MTN683832', spec: '230 V AC → bus 160 mA', half: true, why: 'Elle fonctionnerait ici — trois participants consomment moins de 50 mA — mais elle interdit toute extension du plateau. Pour du tertiaire, on prend la 320 mA.' },
        { key: 'knxalim', ref: 'Phaseo ABL8RPS24030', spec: 'alimentation 230 V AC → 24 V DC · 3 A', why: 'Alimentation à découpage ordinaire : elle ne délivre ni les 29 V du bus, ni la bobine d’inductance qui permet aux télégrammes de circuler. Le bus ne communiquerait pas.' },
      ],
    },
    {
      id: 'k1', name: 'K1 · Interface de mise en service',
      need: 'Relier le PC et ETS5 au bus pour adresser les participants et télécharger les programmes',
      options: [
        { key: 'knxusb', ref: 'Schneider MTN681829', spec: 'interface USB KNX · rail DIN · alimentée par le bus', ok: true, why: 'C’est le module du banc, et la réponse à la question 12 du TP 1.1 : sans lui, ETS5 ne peut ni adresser ni télécharger.' },
        { key: 'knxusb', ref: 'Schneider MTN680329', spec: 'interface IP KNX · raccordement Ethernet', half: true, why: 'Elle ferait le travail, mais par le réseau informatique du lycée : il faudrait une adresse IP et l’accord du gestionnaire. L’USB est autonome.' },
        { key: 'knxusb', ref: 'Convertisseur USB / RS485', spec: 'adaptateur série générique', why: 'Un convertisseur série ne parle pas le protocole KNX : ETS5 ne verra aucun participant.' },
      ],
    },
    {
      id: 'k2', name: 'K2 · Actionneur de commutation',
      need: 'Commuter les deux circuits d’éclairage 230 V, avec temporisation d’escalier et retour d’état',
      options: [
        { key: 'knxact', ref: 'Schneider MTN6705-0008S', spec: 'actionneur KNX 2 × 230 V / 10 A · commande manuelle', ok: true, why: 'C’est le produit de substitution du MTN649202 du banc, arrêté de production le 31/12/2021 : c’est LUI qu’il faut porter au bon de commande, pas la référence gravée sur le module.' },
        { key: 'knxact', ref: 'Schneider MTN649202', spec: 'actionneur KNX 2 × 230 V / 10 A · commande manuelle', half: true, why: 'C’est l’appareil réellement posé sur le banc et il convient techniquement — mais il n’est plus fabriqué depuis le 31/12/2021. On ne commande pas une référence obsolète.' },
        { key: 'knxact', ref: 'Schneider LC1D09B7', spec: 'contacteur tripolaire · bobine 24 V', why: 'Un contacteur n’est pas un participant KNX : il n’a ni adresse, ni objet de communication, et il faudrait lui câbler une commande filaire — exactement ce que le bus supprime.' },
      ],
    },
    {
      id: 'bp1', name: 'BP1 · Point de commande',
      need: 'Commander quatre fonctions depuis la circulation, et afficher l’état réel des deux lampes',
      options: [
        { key: 'knxbp', ref: 'Schneider MGU3.531.18', spec: 'Unica KNX · 2 touches, 4 poussoirs · LED d’état par touche', ok: true, why: 'C’est le module du banc. Quatre poussoirs pour marche, arrêt, réunion et extinction générale, et les LED portent le retour d’état.' },
        { key: 'knxbp', ref: 'Schneider MGU3.530.18', spec: 'Unica KNX · 1 touche, 2 poussoirs', half: true, why: 'Deux poussoirs suffisent pour F1, mais il n’en reste aucun pour la salle de réunion ni pour l’extinction générale.' },
        { key: 'knxbp', ref: 'Interrupteur va-et-vient 10 A', spec: 'appareillage classique 230 V', why: 'Un interrupteur classique coupe le 230 V dans le mur : il n’émet aucun télégramme et n’a pas sa place sur un bus 29 V.' },
      ],
    },
    {
      id: 'q1', name: 'Q1 · Protection de tête',
      need: 'Protéger les personnes et assurer la consignation du tableau',
      options: [
        { key: 'rcd2p', ref: 'Acti9 iID 2P 40 A 30 mA type AC', spec: 'interrupteur différentiel 30 mA', ok: true, why: '30 mA pour la protection des personnes, cadenassable : c’est l’organe de consignation du TP.' },
        { key: 'rcd2p', ref: 'Acti9 iID 2P 40 A 300 mA', spec: 'différentiel 300 mA', why: '300 mA protège contre l’incendie, pas les personnes. Sur des circuits terminaux, 30 mA est exigé.' },
        { key: 'mcb2p', ref: 'Disjoncteur 2P C16', spec: 'sans différentiel', why: 'Un disjoncteur protège les conducteurs, pas les personnes : il n’y a plus de détection de courant de défaut.' },
      ],
    },
    {
      id: 'q23', name: 'Q2 / Q3 · Protections divisionnaires',
      need: 'Q2 : l’alimentation de bus (quelques dizaines de mA) · Q3 : les deux départs d’éclairage',
      options: [
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C2 et C10', spec: 'phase + neutre · 2 A et 10 A', ok: true, why: 'Phase + neutre : les deux conducteurs s’ouvrent d’un geste pour intervenir. 2 A pour l’alimentation de bus, 10 A pour l’éclairage.' },
        { key: 'mcb1p', ref: 'iC60N 1P C2 et C10', spec: 'unipolaire', half: true, why: 'Protège correctement, mais laisse le neutre raccordé pendant l’intervention sur le tableau.' },
        { key: 'mcb1pn', ref: 'Acti9 iC60N 1P+N C20 et C20', spec: 'phase + neutre · 20 A', why: 'Calibre sans rapport : 20 A pour une alimentation de bus qui consomme quelques dizaines de milliampères, et pour deux hublots de 60 W.' },
      ],
    },
    {
      id: 'x1', name: 'X1 · Bornier tertiaire',
      need: 'Arrivée L / N / PE et deux départs d’éclairage en 1,5 mm²',
      options: [
        { key: 'termgrey', ref: 'UT 2,5 + UT 2,5-PE', spec: 'bornes sur rail · PE vert-jaune', ok: true, why: 'Bornes sur rail, borne PE identifiée : le repérage des phases coupées reste lisible pour la maintenance.' },
        { key: 'termgrey', ref: 'Bornes automatiques en fond de coffret', spec: 'sans rail', half: true, why: 'Admis en logement, mais en tertiaire on veut un bornier repéré, contrôlable au tournevis dynamométrique.' },
        { key: 'termgrey', ref: 'Dominos', spec: 'connecteurs à vis', why: 'Interdit en armoire : bornes sur rail obligatoires.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    { id: 'q1', label: 'Q1 · Interrupteur différentiel 30 mA (consignation)', key: 'rcd2p', rail: 0, x: 46, rep: 'Q1' },
    { id: 'f2', label: 'Q2 · Protection de l’alimentation de bus', key: 'mcb1pn', rail: 0, x: 110, rep: 'Q2' },
    { id: 'f3', label: 'Q3 · Protection des départs d’éclairage', key: 'mcb1pn', rail: 0, x: 174, rep: 'Q3' },
    { id: 'a1', label: 'A1 · Alimentation de bus KNX 320 mA · MTN684032', key: 'knxalim', rail: 0, x: 240, rep: 'A1' },
    { id: 'k1', label: 'K1 · Interface USB KNX · MTN681829', key: 'knxusb', rail: 1, x: 46, rep: 'K1' },
    { id: 'k2', label: 'K2 · Actionneur de commutation 2 × 10 A · MTN649202', key: 'knxact', rail: 1, x: 110, rep: 'K2' },
    ...X1_TER,
  ],
  // Le poussoir est dans la CIRCULATION, au mur : hors armoire, raccordé au bus par
  // la même paire torsadée que les modules du tableau.
  annexItems: [
    { key: 'knxbp', rep: 'BP1', name: 'poussoir Unica KNX 4 poussoirs · circulation', x: 468, y: 250, w: 56, h: 56 },
  ],
  recvItems: [
    { key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'hublot E27 · accueil', x: 90, y: 30, w: 66, h: 66, recv: true },
    { key: 'l_ampoule_plexo_hublot', rep: 'E2', name: 'hublot E27 · salle de réunion', x: 310, y: 30, w: 66, h: 66, recv: true },
  ],
  liaisons: [
    // ---- arrivée réseau : câblage de l'installateur, déjà en place ----
    L('RES.L1', 'x1_1.b', 'L1', 'pre'),
    L('RES.N', 'x1_2.b', 'N', 'pre'),
    L('RES.PE', 'x1_3.b', 'PE', 'pre'),
    // ---- tête de tableau : bornier → Q1 ----
    L('x1_1.a', 'q1.1', 'L1'), L('x1_2.a', 'q1.N', 'N'),
    // ---- répartition en aval de Q1 vers les deux divisionnaires ----
    L('q1.2', 'f2.1', 'L1'), L('q1.N2', 'f2.N', 'N'),
    L('q1.2', 'f3.1', 'L1'), L('q1.N2', 'f3.N', 'N'),
    // ---- alimentation de bus : 230 V en entrée, terre au bornier ----
    L('f2.2', 'a1.L', 'L1'), L('f2.N2', 'a1.N', 'N'), L('x1_3.a', 'a1.PE', 'PE'),
    // ---- BUS KNX en guirlande : alimentation → interface → actionneur → poussoir.
    // Aucun retour vers l'alimentation : la boucle est précisément ce qui est interdit.
    L('a1.+', 'k1.+', 'DC+'), L('a1.−', 'k1.−', 'DC-'),
    L('k1.+', 'k2.+', 'DC+'), L('k1.−', 'k2.−', 'DC-'),
    L('k2.+', 'BP1.X1', 'DC+'), L('k2.−', 'BP1.X2', 'DC-'),
    // ---- puissance de l'actionneur : phase commune en entrée, deux phases coupées en sortie ----
    L('f3.2', 'k2.L', 'L1'),
    L('k2.1', 'x1_4.a', 'L1'), L('k2.2', 'x1_6.a', 'L1'),
    L('f3.N2', 'x1_5.a', 'N'), L('f3.N2', 'x1_7.a', 'N'),
    // ---- départs vers les deux hublots ----
    L('x1_4.b', 'E1.X1', 'L1'), L('x1_5.b', 'E1.X2', 'N'),
    L('x1_6.b', 'E2.X1', 'L1'), L('x1_7.b', 'E2.X2', 'N'),
  ],
  nets: {
    // bornier X1 — arrivée toujours vive, départs sous Q3
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'N', live: 'always' }, 'x1_2.b': { net: 'N', live: 'always' },
    'x1_3.a': { net: 'PE', live: 'always' }, 'x1_3.b': { net: 'PE', live: 'always' },
    'x1_4.a': { net: 'L1', live: 'f3' }, 'x1_4.b': { net: 'L1', live: 'f3' },
    'x1_5.a': { net: 'N', live: 'always' }, 'x1_5.b': { net: 'N', live: 'always' },
    'x1_6.a': { net: 'L1', live: 'f3' }, 'x1_6.b': { net: 'L1', live: 'f3' },
    'x1_7.a': { net: 'N', live: 'always' }, 'x1_7.b': { net: 'N', live: 'always' },
    // Q1 · différentiel de tête (organe de consignation)
    'q1.1': { net: 'L1', live: 'always' }, 'q1.N': { net: 'N', live: 'always' },
    'q1.2': { net: 'L1', live: 'q1' }, 'q1.N2': { net: 'N', live: 'always' },
    // Q2 · protection de l'alimentation de bus
    'f2.1': { net: 'L1', live: 'q1' }, 'f2.N': { net: 'N', live: 'always' },
    'f2.2': { net: 'L1', live: 'f2' }, 'f2.N2': { net: 'N', live: 'always' },
    // Q3 · protection des départs d'éclairage
    'f3.1': { net: 'L1', live: 'q1' }, 'f3.N': { net: 'N', live: 'always' },
    'f3.2': { net: 'L1', live: 'f3' }, 'f3.N2': { net: 'N', live: 'always' },
    // A1 · alimentation de bus : 230 V en entrée, 29 V DC en sortie dès Q1 + Q2
    'a1.L': { net: 'L1', live: 'f2' }, 'a1.N': { net: 'N', live: 'always' },
    'a1.PE': { net: 'PE', live: 'always' },
    'a1.+': { net: 'DC+', live: 'f2' }, 'a1.−': { net: 'DC-', live: 'f2' },
    // K1 · interface USB, alimentée par le bus
    'k1.+': { net: 'DC+', live: 'f2' }, 'k1.−': { net: 'DC-', live: 'f2' },
    // K2 · actionneur : bus d'un côté, 230 V de l'autre. Les sorties sont vives dès
    // que la chaîne est fermée — c'est la commande manuelle locale de l'appareil.
    'k2.+': { net: 'DC+', live: 'f2' }, 'k2.−': { net: 'DC-', live: 'f2' },
    'k2.L': { net: 'L1', live: 'f3' },
    'k2.1': { net: 'L1', live: 'f3' }, 'k2.2': { net: 'L1', live: 'f3' },
    // BP1 · poussoir au mur de la circulation, alimenté par le bus
    'BP1.X1': { net: 'DC+', live: 'f2' }, 'BP1.X2': { net: 'DC-', live: 'f2' },
    // hublots
    'E1.X1': { net: 'L1', live: 'f3' }, 'E1.X2': { net: 'N', live: 'always' },
    'E2.X1': { net: 'L1', live: 'f3' }, 'E2.X2': { net: 'N', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'polarite',
      title: 'Contrôle de polarité du bus KNX',
      how: 'Multimètre en V⎓ aux bornes de bus du poussoir, pointe rouge sur (+). Une lecture négative signale deux conducteurs croisés quelque part dans la guirlande.',
      expected: '+29 V DC, jamais −29 V',
    },
    {
      id: 'boucle',
      title: 'Absence de boucle sur le bus',
      how: 'Suis la paire torsadée de l’alimentation au dernier participant : chaque appareil doit être traversé une seule fois. Aucun conducteur ne doit revenir vers un appareil déjà raccordé.',
      expected: 'guirlande ou étoile, jamais d’anneau',
    },
    {
      id: 'contbus',
      title: 'Continuité du conducteur (+) jusqu’au poussoir',
      how: 'Installation consignée, ohmmètre entre la borne (+) de l’actionneur et la borne de bus (+) du poussoir.',
      expected: '< 1 Ω',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité du conducteur de protection', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'x1_3.a', b: 'RES.PE', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'contbus', title: 'Continuité du (+) du bus jusqu’au poussoir', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'k2.+', b: 'BP1.X1', min: 0, max: 1, unit: 'Ω',
    },
    {
      id: 'contA', title: 'Continuité de la sortie A jusqu’au bornier', stage: 'horsTension',
      instrument: 'mm', dial: 'Ω', a: 'k2.1', b: 'x1_4.a', min: 0, max: 1, unit: 'Ω',
    },
    {
      id: 'ubus', title: 'Tension du bus KNX en sortie d’alimentation', stage: 'sousTension',
      instrument: 'mm', dial: 'V⎓', a: 'a1.+', b: 'a1.−', min: 28, max: 30, unit: 'V', when: 'ctl',
    },
    {
      id: 'ubp', title: 'Tension du bus aux bornes du poussoir', stage: 'sousTension',
      instrument: 'mm', dial: 'V⎓', a: 'BP1.X1', b: 'BP1.X2', min: 28, max: 30, unit: 'V', when: 'ctl',
    },
    {
      id: 'u230', title: 'Tension d’alimentation en aval de Q3', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'f3.2', b: 'f3.N2', min: 220, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'uA', title: 'Tension en sortie A de l’actionneur (accueil)', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'k2.1', b: 'x1_5.a', min: 220, max: 240, unit: 'V', when: 'ctl',
    },
    {
      id: 'uB', title: 'Tension en sortie B de l’actionneur (salle de réunion)', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'k2.2', b: 'x1_7.a', min: 220, max: 240, unit: 'V', when: 'ctl',
    },
  ],
  faults: [
    {
      id: 'bus',
      title: 'Conducteur (+) du bus débranché au poussoir',
      symptom: 'Le poussoir ne commande plus rien et ses LED restent éteintes — mais l’actionneur répond encore à ses leviers de commande manuelle, et les deux lampes s’allument à la main.',
      fix: 'Reprendre le conducteur rouge entre la borne (+) de l’actionneur et la borne de bus du poussoir, puis contrôler sa continuité.',
      coupe: 'k2.+>BP1.X1',
      action: 'Reprendre le conducteur (+) du bus entre l’actionneur et le poussoir',
    },
    {
      id: 'sortieA',
      title: 'Sortie A de l’actionneur non raccordée au bornier',
      symptom: 'La salle de réunion s’allume normalement, l’accueil non. Le relais de la voie 1 claque pourtant à chaque appui : la panne n’est ni dans le bus ni dans la programmation.',
      fix: 'Refaire la liaison K2:1 → X1:4 et contrôler le serrage des deux bornes.',
      coupe: 'k2.1>x1_4.a',
      action: 'Refaire la liaison K2:1 → X1:4 et contrôler le serrage',
    },
    {
      id: 'neutreE2',
      title: 'Neutre du hublot de la salle de réunion coupé',
      symptom: 'La sortie B donne bien 230 V au bornier, et le hublot reste éteint. Rien ne bouge côté bus.',
      fix: 'Reprendre le conducteur bleu entre X1:7 et le hublot E2.',
      coupe: 'x1_7.b>E2.X2',
      action: 'Reprendre le neutre entre X1:7 et le hublot de la salle de réunion',
    },
    {
      id: 'f3',
      title: 'Q3 déclenché (défaut sur les départs d’éclairage)',
      symptom: 'Aucune lampe ne s’allume, ni par le poussoir ni à la main, alors que les LED du poussoir répondent et que le bus est bien à 29 V.',
      fix: 'Chercher le défaut d’isolement sur les deux départs d’éclairage, puis réarmer Q3.',
      ouvre: 'f3',
      action: 'Chercher le défaut d’isolement des départs d’éclairage, puis réarmer Q3',
    },
  ],
  quiz: [
    {
      q: 'Quelle est la tension du bus KNX ?',
      options: ['50 V continu', '29 V continu', '230 V alternatif', '24 V alternatif'],
      answer: 1,
    },
    {
      q: 'Quelle est la tension d’alimentation des actionneurs KNX ?',
      options: ['29 V continu', '24 V alternatif', '230 V alternatif', '12 V continu'],
      answer: 2,
    },
    {
      q: 'Combien de participants peut-on raccorder sur une ligne KNX ?',
      options: ['12', '28', '64', '255'],
      answer: 2,
    },
    {
      q: 'Quel module est indispensable pour adresser les participants depuis ETS5 ?',
      options: ['L’alimentation de bus', 'L’interface USB', 'L’actionneur de commutation', 'Le bouton-poussoir'],
      answer: 1,
    },
    {
      q: 'Quelle est la différence entre une adresse individuelle et une adresse de groupe ?',
      options: [
        'L’adresse individuelle identifie un appareil, l’adresse de groupe relie une fonction entre plusieurs appareils',
        'Ce sont deux noms pour la même chose',
        'L’adresse de groupe identifie un appareil, l’individuelle une fonction',
        'L’adresse de groupe ne sert qu’au téléchargement',
      ],
      answer: 0,
    },
    {
      q: 'Comment le bus doit-il être câblé ?',
      options: ['En boucle fermée', 'En guirlande ou en étoile, jamais en boucle', 'Uniquement en étoile', 'Peu importe, le protocole corrige'],
      answer: 1,
    },
    {
      q: 'Un appareil KNX peut-il être reconfiguré après son installation ?',
      options: [
        'Non, la configuration est définitive',
        'Oui, mais seulement certains produits',
        'Oui, tous les produits se reconfigurent depuis ETS5 sans toucher au câblage',
        'Seulement en remplaçant l’alimentation',
      ],
      answer: 2,
    },
    {
      q: 'La LED de la touche 1 est associée à l’adresse 1/1/2. Que montre-t-elle ?',
      options: [
        'Que le bouton vient d’être appuyé',
        'L’état réel de la sortie de l’actionneur, donc de la lampe',
        'La présence du 29 V sur le bus',
        'Le déclenchement de Q3',
      ],
      answer: 1,
    },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  // Consignation d'un tableau tertiaire : la source connue est l'arrivée réseau,
  // toujours vive en amont de Q1 ; l'absence de tension se contrôle sur l'unique
  // paire en aval du différentiel. Rien à voir avec les trois paires du modèle
  // moteur, dont les bornes n'existent pas ici.
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2']],
  },
};
