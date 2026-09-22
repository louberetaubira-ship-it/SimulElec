/**
 * TP 4 · Réseau et supervision de l'Écobike (lycée L. Couffignal) — démarche en deux temps.
 *
 * Dernier TP du chantier Écobike, tiré du sujet CGM MELEC 2023, partie D (corrigé D.1 à D.8).
 * C'est le TP qui relie les trois autres : depuis la loge du gardien, à 150 m par fibre
 * optique, le poste de supervision voit les 4 caméras IP PoE, le NAS qui les enregistre, la
 * passerelle IP/KNX de l'éclairage (TP 3, 1.1.1 côté bus, 192.168.0.3 côté réseau), l'automate
 * M221 du portail (TP 2, 192.168.0.4) et l'onduleur IMEON 9.12 (TP 1, 192.168.0.5).
 *
 *  - Temps A · COMPRENDRE (préparation) : six blocs appuyés sur les DOCUMENTS RÉELS du dossier
 *    (`preparation.documents`) — synoptique DTR 1, réseaux locaux DTR 22, PoE et classes
 *    d'adresses DTR 23-24, `ipconfig` et `ping` DTR 25-26, micro-interrupteurs DIP du
 *    contrôleur (D.6, outil interactif `outil: 'dip'`), fiches Legrand LCS³ et Trendnet DT 52 à 56.
 *  - Temps B · RÉALISER sur une scène « courant faible » (`kind: 'reseau'`, `reseau`) : les
 *    mêmes 12 étapes, le même store et la même notation que les TP platine, mais la pose est la
 *    COMPOSITION de l'armoire 19" 12 U, le câblage porte sur la fibre, les câbles F/UTP et les
 *    cordons de brassage — plus le connecteur RJ45 en T568B fil par fil —, la consignation se
 *    fait sur le PDU différentiel, la mise en service paramètre l'automate et se valide au
 *    `ping`, et l'essai est l'écran de supervision de la loge.
 *
 * Choix d'automate (validé sur maquette) : le sujet paramètre un WAGO 750-891 par ses DIP ;
 * l'exercice binaire reste en Temps A comme notion (0011 0010 → 50 → 192.168.1.50 → mauvais
 * sous-réseau), mais on paramètre en Temps B le M221 (TM221CE16R, port Ethernet) du TP 2,
 * livré à la même adresse d'usine pour garder le problème du corrigé.
 *
 * Moteur : `src/lib/sim/reseau.ts`. Le seul organe « électrique » du TP est le PDU (slot `q1`,
 * repère PDU) : c'est lui qu'on consigne, et le VAT se pose sur ses bornes (réseau 230 V
 * d'arrivée, prises du switch et du NAS en aval).
 */
import type { Fault, Liaison, PrepQuestion, TpDefinition } from '@/lib/types';
import { L } from './common';

/** Documents du dossier, servis depuis `public/tp/ecobike-reseau/`. */
const DOC = (f: string) => `/tp/ecobike-reseau/${f}`;

/* ------------------------------------------------------------ liaisons */

/** Équipements desservis par le panneau de brassage, dans l'ordre des ports 1 à 8. */
const PAR_PANNEAU = ['NAS', 'GW', 'API', 'IMEON', 'CAM1', 'CAM2', 'CAM3', 'CAM4'];

const LIAISONS: Liaison[] = [
  // ① fibre monomode loge ↔ armoire, et cordon du poste de la loge vers son convertisseur
  L('CVL.FO', 'CVA.FO', 'FO'),
  L('PC.RJ', 'CVL.RJ', 'ETH'),
  // ② cordons 0,5 m : switch → panneau (ports 1 à 8), switch → routeur, switch → convertisseur
  ...PAR_PANNEAU.map((_, i) => L(`SW.${i + 1}`, `PP.${i + 1}`, 'ETH')),
  L('SW.9', 'RTR.LAN', 'ETH'),
  L('SW.10', 'CVA.RJ', 'ETH'),
  // ③ câbles F/UTP cat. 6 : arrière du panneau → prise RJ45 de chaque équipement
  ...PAR_PANNEAU.map((id, i) => L(`PPR.${i + 1}`, `${id}.RJ`, 'ETH')),
  // accès Internet : posé par l'opérateur
  L('RTR.WAN', 'FAI.RJ', 'ETH', 'pre'),
];

/* ------------------------------------------------------------ pannes */

const FAULTS: Fault[] = [
  {
    id: 'api-ip', title: 'Automate resté à son adresse d’usine 192.168.1.50',
    symptom: 'Depuis la loge, le portail n’apparaît plus sur l’écran de supervision. Les caméras, l’éclairage et l’onduleur, si.',
    fix: 'ping 192.168.0.4 : délai d’attente dépassé, alors que la LED du port 3 est à 1 Gbit/s — le lien est bon, c’est l’adresse. Reparamétrer l’automate en 192.168.0.4 / 255.255.255.0 / 192.168.0.1 / 89.2.0.1, puis refaire le ping.',
    action: 'Reparamétrer l’automate en 192.168.0.4 / 255.255.255.0, passerelle 192.168.0.1, DNS 89.2.0.1',
  },
  {
    id: 'poe-cam3', title: 'Port 7 du switch sans alimentation PoE (caméra 3)',
    symptom: 'L’image de la caméra 3 est noire en supervision, et la caméra ne s’allume plus la nuit (aucune LED infrarouge).',
    fix: 'LED du port 7 éteinte, 0 V⎓ entre les paires 1-2 et 3-6 à la prise de la caméra 3 (48 V sur les autres), testeur : lien 8/8. Rétablir le PoE sur le port, puis contrôler 44 à 57 V⎓ à la prise.',
    action: 'Rétablir l’alimentation PoE+ du port 7 (ou raccorder la caméra 3 sur un port PoE+)',
  },
  {
    id: 'paire-cam2', title: 'Paire marron (7-8) coupée au connecteur de la caméra 2',
    symptom: 'Les quatre caméras sont visibles, mais l’enregistrement de la caméra 2 saccade et le NAS signale un débit réduit sur ce flux.',
    fix: 'LED du port 6 à 100 Mbit/s au lieu de 1 Gbit/s : le gigabit exige les 4 paires. Testeur sur le lien du port 6 : brins 7 et 8 ouverts. Refaire le raccordement T568B du connecteur (paire blanc-marron / marron).',
    action: 'Refaire le raccordement T568B du lien de la caméra 2 (paire blanc-marron / marron)',
  },
  {
    id: 'fibre', title: 'Convertisseur fibre de l’armoire hors tension',
    symptom: 'Depuis la loge, plus rien : la supervision est hors ligne. Au local courant faible pourtant, le NAS enregistre et les caméras fonctionnent.',
    fix: 'Tout ping depuis la loge échoue (« défaillance générale ») ; LED du port 10 éteinte alors que les ports 1 à 9 sont à 1 Gbit/s. Rebrancher l’alimentation du convertisseur de l’armoire, contrôler ses voyants LINK FX / TX.',
    action: 'Rebrancher l’alimentation du convertisseur cuivre / fibre de l’armoire',
  },
  {
    id: 'ip-doublon', title: 'Passerelle IP/KNX réglée en 192.168.0.2, en doublon avec le NAS',
    symptom: 'L’éclairage du local à vélos n’apparaît plus en supervision. Les caméras, le portail et l’onduleur sont bien là.',
    fix: 'ping 192.168.0.3 : délai dépassé ; arp -a : 192.168.0.2 répond avec l’adresse physique de la passerelle (48-33-DD-00-95-5D), pas celle du NAS. Rendre à la passerelle son adresse 192.168.0.3.',
    action: 'Rendre à la passerelle IP/KNX son adresse 192.168.0.3',
  },
  {
    id: 'dns', title: 'DNS du poste de la loge non renseigné',
    symptom: 'La supervision fonctionne, mais depuis la loge plus aucun site ne s’ouvre par son nom : « hôte introuvable » à chaque mise à jour.',
    fix: 'ping par adresse : 4 reçus ; ping par nom : hôte introuvable ; ipconfig /all : aucune ligne « Serveurs DNS ». Renseigner 89.2.0.1 (et 89.2.0.2) sur la carte du poste.',
    action: 'Renseigner les serveurs DNS 89.2.0.1 / 89.2.0.2 sur la carte réseau du poste de la loge',
  },
];

/* ------------------------------------------------------------ préparation */

/** Question de préparation : la bonne réponse est toujours la première (l'ordre est mélangé à l'affichage). */
const Q = (id: string, rep: string, doc: string, invite: string, options: string[], why: string): PrepQuestion =>
  ({ id, rep, doc, invite, options, answer: 0, why });

export const TP_ECOBIKE_RESEAU: TpDefinition = {
  id: 'ecobike-reseau',
  title: 'Écobike · Réseau et supervision (TP 4)',
  level: 'Tle Bac Pro MELEC',
  family: 'ter',
  classement: {
    domaine: 'COM',
    domainesSecondaires: ['TER', 'DOM'],
    sousDomaine: 'COM.ip',
    activites: [], // déduites par classementDe()
    motsCles: ['Ethernet', 'supervision', 'CGM 2023', 'Écobike'],
  },
  kind: 'reseau',
  scene: 'ter',
  annex: 'local',
  playable: true,
  competences: ['C1 Analyser', 'C2 Organiser', 'C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir', 'C8 Communiquer'],
  diplomas: ['bacpro'],
  summary:
    'Chantier Écobike (sujet CGM MELEC 2023, partie D). Réseau local et supervision : armoire de brassage '
    + 'LCS³ 12 U, switch PoE+ 24 ports, 4 caméras dôme 4 MP PoE, NAS, passerelle IP/KNX (TP 3), automate '
    + 'M221 du portail (TP 2), onduleur IMEON (TP 1) et poste de la loge relié par 150 m de fibre. Temps A : '
    + 'comprendre sur les documents réels (synoptique, DTR 22 à 26, DIP, fiches DT 52 à 56). Temps B : composer '
    + 'l’armoire, câbler fibre, F/UTP, cordons et un connecteur RJ45 en T568B, paramétrer l’automate, valider au '
    + 'ping puis superviser toute l’installation depuis la loge.',
  situation:
    'Le lycée Louis Couffignal met en service le réseau de l’Écobike : depuis la loge du gardien, à 150 m, tout '
    + 'doit être supervisé — les quatre caméras et leur enregistrement, l’éclairage KNX du local à vélos, le '
    + 'portail et l’onduleur. Tu étudies d’abord le réseau sur les documents du dossier : rôle de chaque '
    + 'équipement, fibre ou cuivre, PoE, adresses IP, micro-interrupteurs du contrôleur, catalogues. Puis tu le '
    + 'réalises comme sur un chantier courant faible : choix du matériel, composition de l’armoire 19", câblage '
    + 'et connecteur T568B, tests, consignation du PDU, paramétrage de l’automate, ping depuis la loge et essai '
    + 'de la supervision.',
  plaqueTitre: 'RÉSEAU LOCAL · SUPERVISION ÉCOBIKE',
  plaque: {
    'Réseau': 'classe C · 192.168.0.0 / 255.255.255.0',
    'Routeur': '192.168.0.1 · DNS 89.2.0.1',
    'Armoire': 'Legrand LCS³ 12 U · prof. 580 mm',
    'Switch': 'PoE+ (type 2) · 24 ports · 10 utilisés',
    'Câblage': 'F/UTP cat. 6 · 1 Gbit/s · T568B',
    'Loge': 'fibre monomode 150 m · 2 convertisseurs',
    'Caméras': '4 dômes 4 MP PoE · .6 à .9',
    'Supervision': 'PC_LOGE · 192.168.0.10',
  },
  cahierDesCharges: [
    { k: 'Supervision', v: 'depuis la loge du gardien (PC_LOGE, 192.168.0.10) : 4 caméras, enregistrement NAS, éclairage KNX, portail, onduleur' },
    { k: 'Adressage', v: 'classe C, IP statiques : routeur .1 · NAS .2 · passerelle IP/KNX .3 · automate .4 · onduleur .5 · caméras 4 à 1 : .6 à .9 · PC loge .10' },
    { k: 'Liaison loge', v: '150 m entre l’armoire et la loge : fibre optique monomode, un convertisseur cuivre / fibre à chaque extrémité' },
    { k: 'Câblage', v: 'câble F/UTP 4 paires cat. 6 (1 Gbit/s, 250 MHz), connecteurs RJ45 cat. 6 raccordés en T568B, cordons 0,5 m' },
    { k: 'Armoire', v: 'coffret LCS³ 19" fixe, profondeur 580 mm : obturateur, PDU différentiel, passe-fils, switch, passe-fils, panneau 24 ports, réserve, tablette NAS, réserve' },
    { k: 'Switch', v: 'PoE+ (type 2) pour les caméras ; 10 ports utilisés + 80 % de réserve = 18 ports au moins' },
    { k: 'Caméras', v: '4 dômes 4 MP PoE (Trendnet TV-IP1315PI), aucune alimentation extérieure' },
    { k: 'Automate', v: 'M221 du portail (TP 2), livré en 192.168.1.50 : à reparamétrer en 192.168.0.4 / 255.255.255.0 / 192.168.0.1 / 89.2.0.1' },
    { k: 'Liens avec le chantier', v: 'passerelle IP/KNX = interface 1.1.1 du TP 3 · automate M221 du TP 2 · onduleur IMEON 9.12 du TP 1' },
    { k: 'Avant mise en service', v: 'testeur de câble sur chaque lien (8 brins, câble droit), fibre contrôlée au stylo optique, consignation du PDU' },
    { k: 'Réception', v: 'ping de chaque équipement depuis la loge (4 envoyés, 4 reçus, 0 perdu), PoE 44 à 57 V⎓, ports à 1 Gbit/s, supervision complète' },
  ],
  libelles: { recv: 'Local à vélos · entrée · armoire onduleur' },
  schemaImage: {
    src: DOC('reseau.jpg'),
    legende: 'DTR 1 · synoptique du réseau local de l’Écobike',
  },
  preparation: {
    documents: [
      { id: 'dtr1', titre: 'DTR 1 · synoptique', src: DOC('reseau.jpg'), legende: 'DTR 1 : structure du réseau — loge du gardien, local courant faible, entrée, local à vélos, armoire onduleur, et l’adresse IP de chaque équipement', enonce: true },
      { id: 'dtr22', titre: 'DTR 22 · réseaux', src: DOC('dtr22.jpg'), legende: 'DTR 22 : blindages des câbles Ethernet (U/UTP, F/UTP…), câblage des connecteurs T568A / T568B, catégories et longueurs maxi en cuivre' },
      { id: 'dtr2324', titre: 'DTR 23-24 · PoE, classes', src: DOC('dtr23_24.jpg'), legende: 'DTR 23 : les quatre types de PoE et leur puissance par port · DTR 24 : classes d’adresses A, B, C et masques de sous-réseau' },
      { id: 'dtr2526', titre: 'DTR 25-26 · ipconfig', src: DOC('dtr25_26.jpg'), legende: 'DTR 25 : réponse à « ipconfig /all » sur le poste de la loge · DTR 26 : réponse à la commande « ping »' },
      { id: 'dip', titre: 'D.6 · DIP', src: DOC('dip.jpg'), legende: 'D.6.2 : micro-interrupteurs DIP du contrôleur — DIP 1 (2⁰) en bas, DIP 8 (2⁷) en haut ; ils fixent le dernier octet de l’adresse 192.168.1.X' },
      {
        id: 'd21', titre: 'D.2.1 · armoire', legende: 'D.2.1 : occupation de l’armoire de brassage (coffret LCS³ 19" fixe) — à compléter',
        tableau: {
          entetes: ['Élément', 'Référence', 'Nombre de U'],
          lignes: [
            ['Plaque obturatrice', '0 465 32', '1'],
            ['PDU avec protection différentielle', '?', '1'],
            ['Panneau passe-fils', '0 465 28', '1'],
            ['Emplacement du switch Ethernet', '—', '1'],
            ['Panneau passe-fils', '0 465 28', '1'],
            ['Panneau de brassage (4 cassettes)', '?', '1'],
            ['Réserve', '—', '2'],
            ['Tablette fixe 360 mm pour le NAS', '?', '2'],
            ['Réserve', '—', '2'],
            ['Total · armoire profondeur 580 mm', '?', '? U'],
          ],
        },
      },
      { id: 'dt52', titre: 'DT 52 · armoires', src: DOC('dt52.jpg'), legende: 'DTR 52 : coffrets 19" LCS³ fixes (profondeurs 400 et 580 mm, 6 à 21 U), tablettes fixes' },
      { id: 'dt53', titre: 'DT 53 · PDU', src: DOC('dt53.jpg'), legende: 'DTR 53 : PDU 19" 1 U — avec interrupteur, standards, avec protection (disjoncteur ou différentiel 16 A 30 mA), parasurtenseur' },
      { id: 'dt54', titre: 'DT 54 · panneaux', src: DOC('dt54.jpg'), legende: 'DTR 54 : panneaux de brassage LCS³ 1 U (avec cassettes, nus, haute densité) et connecteurs RJ45 cat. 5e à 8' },
      { id: 'dt55', titre: 'DT 55 · câbles', src: DOC('dt55.jpg'), legende: 'DTR 55 : cordons de brassage RJ45 cat. 6 (SF/UTP, F/UTP, U/UTP, 0,5 à 5 m) et câbles cat. 6 (305 m en boîte, 500 m en touret)' },
      { id: 'dt56', titre: 'DT 56 · switch, caméras', src: DOC('dt56.jpg'), legende: 'DTR 56 : switches PoE+ Trendnet (5 à 24 ports), switches D-Link, caméras IP dôme et bullet Trendnet' },
    ],
    intitules: {
      identification: {
        titre: '① Identifier · le synoptique (DTR 1)',
        consigne: 'Le synoptique du réseau est affiché à gauche. Pour chaque équipement, choisis sa fonction (D.1.1), puis relève son adresse IP.',
      },
      fonctions: {
        titre: '② Le média · fibre ou cuivre (DTR 22)',
        consigne: 'Pourquoi une fibre vers la loge, à quoi servent les convertisseurs, que veulent dire les lettres du câble, quelle catégorie.',
      },
    },
    identification: [
      Q('id-rtr', 'Routeur', 'dtr1', 'Le routeur permet…', [
        'à un réseau local de communiquer avec Internet',
        'd’enregistrer la vidéo',
        'à un réseau local de communiquer avec le bus KNX',
      ], 'C’est la seule porte vers l’extérieur : il relie 192.168.0.x au fournisseur d’accès. C’est pour ça qu’il est la « passerelle par défaut » de tous les équipements.'),
      Q('id-arm', 'Armoire de brassage', 'dtr1', 'L’armoire de brassage est l’armoire…', [
        'informatique où se font les interconnexions du réseau local',
        'générale basse tension de l’installation',
        'des courants forts',
      ], 'Courant FAIBLE : switch, panneau de brassage, cordons. Le tableau général basse tension, lui, est ailleurs — et les deux ne partagent pas les mêmes cheminements.'),
      Q('id-eth', 'Câbles Ethernet', 'dtr1', 'Les câbles Ethernet…', [
        'font la liaison entre un équipement informatique et le switch',
        'alimentent en courant alternatif les équipements du réseau local',
        'transmettent les données série RS 232 vers les équipements',
      ], 'Chaque trait rouge du synoptique relie un équipement à l’armoire, donc au switch. (Le PoE y ajoute une alimentation… continue, pas alternative.)'),
      Q('id-gw', 'Passerelle IP/KNX', 'dtr1', 'La passerelle IP/KNX…', [
        'permet au réseau local de communiquer avec le bus KNX',
        'attribue les adresses de groupe dans le bus KNX',
        'attribue les adresses IP dans le réseau local',
      ], 'C’est l’interface MTN6502-0105 du TP 3 : adresse 1.1.1 côté bus, 192.168.0.3 côté réseau. Les adresses de groupe se programment dans ETS ; les IP sont ici statiques.'),
      Q('ip-rtr', 'Routeur', 'dtr1', 'Quelle est l’adresse IP du routeur ?', ['192.168.0.1', '192.168.0.10', '192.168.1.1', '192.168.0.255'],
        '.1 : c’est la passerelle par défaut que tu retrouveras dans ipconfig et dans le paramétrage de l’automate.'),
      Q('ip-nas', 'NAS', 'dtr1', 'Quelle est l’adresse IP du NAS d’enregistrement ?', ['192.168.0.2', '192.168.0.3', '192.168.0.9', '192.168.0.1'],
        '.2. Deux équipements ne partagent jamais une adresse : c’est l’une des pannes du TP.'),
      Q('ip-gw', 'Passerelle', 'dtr1', 'Et la passerelle IP/KNX ?', ['192.168.0.3', '192.168.0.2', '192.168.0.4', '1.1.1'],
        '192.168.0.3 côté réseau ; 1.1.1 est son adresse individuelle côté bus KNX — deux mondes, deux adresses.'),
      Q('ip-api', 'Automate', 'dtr1', 'Quelle adresse le synoptique donne-t-il à l’automate du portail ?', ['192.168.0.4', '192.168.1.50', '192.168.0.5', '192.168.1.4'],
        '192.168.0.4. Son adresse d’usine, elle, sera 192.168.1.50 : tout le bloc ⑤ tourne autour de cet écart.'),
      Q('ip-imeon', 'Onduleur', 'dtr1', 'Et l’onduleur IMEON du TP 1 ?', ['192.168.0.5', '192.168.0.6', '192.168.0.4', '192.168.0.10'],
        '.5, dans l’armoire onduleur : sa production et l’état des batteries remontent à la loge.'),
      Q('ip-cam', 'Caméras', 'dtr1', 'Quelles adresses portent les caméras 1 à 4 ?', ['Caméra 1 : .9 · 2 : .8 · 3 : .7 · 4 : .6', 'Caméra 1 : .6 · 2 : .7 · 3 : .8 · 4 : .9', 'Toutes .9', 'Caméra 1 : .5 à caméra 4 : .8'],
        'Numérotation à rebours : la caméra 1, à l’entrée, est en .9 ; la caméra 4, au fond du local à vélos, en .6. On lit le DTR 1, on ne devine pas.'),
      Q('ip-pc', 'Ordinateur', 'dtr1', 'Quelle est l’adresse IP de l’ordinateur de la loge ?', ['192.168.0.10', '192.168.0.1', '192.168.0.100', '10.0.0.10'],
        '.10 : c’est depuis lui que tu lanceras ipconfig et ping.'),
    ],
    fonctions: [
      Q('me-fibre', 'D.1.2', 'dtr22', 'Pourquoi passer en fibre optique entre l’armoire et la loge du gardien ?', [
        '150 m séparent l’armoire de la loge : au-delà de 100 m, un lien cuivre cat. 6 n’est plus garanti',
        'La fibre transporte aussi l’alimentation du PC',
        'La fibre est moins chère que le cuivre',
        'Le cuivre est interdit à l’extérieur',
      ], 'Le tableau du DTR 22 limite un lien cuivre à 100 m, quelle que soit la catégorie. La fibre va bien au-delà — et elle est insensible aux perturbations.'),
      Q('me-conv', 'D.1.3', 'dtr1', 'À quoi servent les convertisseurs cuivre / fibre optique ?', [
        'Transformer un signal réseau fibre optique en Ethernet cuivre RJ45, et inversement',
        'Alimenter les caméras en PoE',
        'Convertir le 230 V en 48 V',
        'Attribuer une adresse IP au PC de la loge',
      ], 'Un à chaque bout : le switch et le PC n’ont que des prises RJ45. Chacun a sa propre alimentation — si elle manque, la loge est coupée du réseau.'),
      Q('me-f', 'F/UTP', 'dtr22', 'Dans « F/UTP », que signifie la première lettre ?', [
        'F = Foiled : un écran général en feuillard d’aluminium sous la gaine',
        'F = Fibre : un conducteur optique au centre',
        'F = Flexible',
        'F = Filaire, par opposition au Wi-Fi',
      ], 'Première lettre : le blindage GÉNÉRAL. F = feuillard, S = tresse, U = rien. Il protège des émissions des câbles 230 V voisins.'),
      Q('me-utp', 'F/UTP', 'dtr22', 'Et « UTP » ?', [
        'Paires non blindées (U), torsadées (TP)',
        'Câble universel pour téléphone',
        'Paires blindées une à une',
        'Câble réservé aux liaisons UTP extérieures',
      ], 'Après la barre, le blindage de chaque PAIRE : U, aucun. TP, Twisted Pairs : c’est la torsade elle-même qui rejette les parasites.'),
      Q('me-cat', 'D.3.2', 'dtr22', 'Il faut 1 Gbit/s à 250 MHz : quelle catégorie de réseau retenir ?', ['Cat. 6', 'Cat. 5e', 'Cat. 6A', 'Cat. 8'],
        'Colonne « fréquence » : 100 MHz en cat. 5e, 250 MHz en cat. 6. La 6A (500 MHz) et la 8 conviendraient mais surdimensionnent tout le câblage.'),
      Q('me-t568', 'T568B', 'dtr22', 'Raccordement T568B : quelle paire sur les broches 1 et 2 ?', [
        'Blanc-orange sur 1, orange sur 2',
        'Blanc-vert sur 1, vert sur 2',
        'Blanc-bleu sur 1, bleu sur 2',
        'Blanc-marron sur 1, marron sur 2',
      ], 'T568B : orange en 1-2, vert en 3-6, bleu en 4-5, marron en 7-8 — le blanc d’abord, sur la broche impaire. T568A échange simplement l’orange et le vert.'),
    ],
    blocs: [
      {
        id: 'poe',
        titre: '③ PoE · alimenter par le câble (DTR 23, DT 56)',
        consigne: 'Les caméras n’ont pas de prise de courant : tout passe par le câble réseau. Le DTR 23 et la fiche DT 56 sont affichés à gauche.',
        questions: [
          Q('poe-sig', 'D.4.1', 'dtr2324', 'Que signifie PoE ?', ['Power over Ethernet', 'Protection of Equipment', 'Port of Entry', 'Power of Electricity'],
            'L’alimentation voyage sur les paires du câble, avec les données : un seul câble par caméra.'),
          Q('poe-ext', 'D.4.2', 'dtr2324', 'Une caméra PoE a-t-elle besoin d’une alimentation extérieure ?', [
            'Non : le switch fournit l’alimentation au travers du câble Ethernet',
            'Oui : un bloc 12 V à côté de chaque caméra',
            'Oui : le PoE ne transporte que les données',
            'Non : elle a une batterie',
          ], 'Le switch PoE injecte environ 48 V⎓ sur les paires 1-2 et 3-6 ; la caméra en tire ses 12 V. Pas de prise, pas de bloc secteur au plafond du local.'),
          Q('poe-type', 'D.4.4', 'dtr2324', 'Quel type de PoE conseiller pour un switch qui alimente des caméras ?', ['Type 2 ou PoE+ (30 W par port)', 'Type 1 ou PoE (15,4 W)', 'Type 3 ou PoE++ (60 W)', 'Type 4 ou High Power PoE (90 W)'],
            'Le DTR 23 range les caméras IP dans le cadre violet : PoE+, IEEE 802.3at, jusqu’à 30 W par port. C’est ce qu’offre le Trendnet TPE-TG240G.'),
          Q('poe-cam', 'D.4.3', 'dt56', 'Combien de caméras, et quelle référence (dôme, 4 MP) ?', ['4 × 21.22.1462', '4 × 21.22.1463', '4 × 21.22.1464', '1 × 21.22.1462'],
            'TV-IP1315PI : dôme, 4 MP, PoE. La 1463 est une bullet 8 MP, la 1464 un dôme 8 MP 4K : ni la forme, ni la résolution demandées.'),
          Q('poe-u', 'PoE', 'dtr2324', 'Quelle tension mesure-t-on sur la prise d’une caméra, entre les paires 1-2 et 3-6 ?', ['Environ 48 V continu (44 à 57 V)', '230 V alternatif', '12 V continu', '5 V continu'],
            'Le switch injecte environ 48 V⎓ ; la caméra le convertit en 12 V. C’est une mesure de la mise en service — et de la maintenance.'),
        ],
      },
      {
        id: 'adressage',
        titre: '④ Adressage IP · DTR 24, DTR 25',
        consigne: 'Le routeur impose une classe C (192.168.0.1). Tous les équipements ont des IP statiques. Lis le DTR 24, puis la fenêtre ipconfig du DTR 25.',
        questions: [
          Q('ad-stat', 'D.5.1', 'dtr2324', 'Une adresse IP statique est une adresse…', [
            'qui ne change pas tant qu’on ne la modifie pas volontairement',
            'qui ne peut plus jamais être modifiée',
            'qui se renouvelle rarement',
            'imposée par le fabricant',
          ], 'Pour la maintenance et la supervision, chaque équipement doit toujours répondre à la même adresse : pas de DHCP ici.'),
          Q('ad-masq', 'D.5.2', 'dtr2324', 'À quoi sert le masque de sous-réseau ?', [
            'À définir la plage d’adresses IP disponibles dans le réseau : quelle partie est le réseau, quelle partie l’hôte',
            'À cacher l’adresse IP sur Internet',
            'À chiffrer les communications',
            'À donner l’adresse du routeur',
          ], 'Le masque dit quels octets doivent être identiques pour que deux machines se parlent directement.'),
          Q('ad-c', 'D.5.3', 'dtr2324', 'Masque par défaut d’un réseau de classe C ?', ['255.255.255.0', '255.255.0.0', '255.0.0.0', '255.255.255.255'],
            'Classe C : trois octets pour le réseau, le dernier pour les hôtes — DTR 24.'),
          Q('ad-254', 'D.5.4', 'dtr2324', 'Combien d’équipements au maximum dans ce réseau de classe C ?', ['254', '256', '255', '10'],
            '256 − 2 : l’adresse du réseau (192.168.0.0) et celle du broadcast (192.168.0.255) sont réservées.'),
          Q('ad-ok', 'D.5.5', 'dtr2324', 'Ce réseau est-il adapté à l’Écobike ?', [
            'Oui : 10 équipements, bien moins que 254',
            'Non : il faudrait une classe A',
            'Non : 254 adresses ne suffisent pas pour 4 caméras',
            'Oui, mais seulement sans le NAS',
          ], 'Dix équipements connectés (DTR 1) : la classe C laisse une large réserve.'),
          Q('ic-nom', 'D.5.6', 'dtr2526', 'ipconfig /all : nom de l’équipement ?', ['PC_LOGE', 'Realtek PCIe GbE Family Controller', 'LOGE-192', 'Hybride'],
            'Ligne « Nom de l’hôte ». « Realtek… » est la description de la carte réseau, « Hybride » le type de nœud.'),
          Q('ic-ip', 'D.5.6', 'dtr2526', 'ipconfig /all : adresse IPv4 du poste ?', ['192.168.0.10', '192.168.0.1', 'fe80::3da6:a812:2a2:1861%12', '89.2.0.1'],
            'Ligne « Adresse IPv4 ». La ligne fe80:: est l’adresse IPv6 de lien local.'),
          Q('ic-masq', 'D.5.6', 'dtr2526', 'ipconfig /all : masque de sous-réseau ?', ['255.255.255.0', '255.255.225.0', '255.255.0.0', '192.168.0.1'],
            '255.255.255.0 : la classe C. (Méfie-toi d’une recopie trop rapide : 225 n’est pas un octet de masque valide.)'),
          Q('ic-gw', 'D.5.6', 'dtr2526', 'ipconfig /all : passerelle par défaut ?', ['192.168.0.1', '192.168.0.10', '89.2.0.1', '192.168.0.255'],
            'Le routeur : tout ce qui n’est pas dans 192.168.0.x lui est envoyé.'),
          Q('ic-dns', 'D.5.6', 'dtr2526', 'ipconfig /all : serveur DNS ?', ['89.2.0.1 (et 89.2.0.2)', '192.168.0.1', '192.168.0.2', 'aucun'],
            'Les serveurs du fournisseur d’accès. Sans eux, un site ne s’ouvre plus par son nom — une des pannes du TP.'),
          Q('ic-role', 'D.5.7', 'dtr2526', 'Quel est l’intérêt du DNS dans un réseau local ?', [
            'Faire le lien entre les noms de domaine et les adresses IP',
            'Attribuer les adresses IP automatiquement',
            'Protéger le réseau des virus',
            'Alimenter les équipements',
          ], 'On tape un nom, le DNS rend l’adresse. Le ping par ADRESSE marche sans DNS ; le ping par NOM, non.'),
        ],
      },
      {
        id: 'automate',
        titre: '⑤ Le contrôleur du portail · DIP et adresse (D.6, D.7, D.8)',
        consigne: 'Le sujet règle le dernier octet d’un contrôleur par micro-interrupteurs. Bascule-les ci-dessous : la valeur se calcule en direct. Le TP 2 utilise un M221, livré lui aussi en 192.168.1.50 : même problème, même solution.',
        outil: 'dip',
        questions: [
          Q('dip-moyen', 'D.6.1', 'dip', 'Quel moyen permet de configurer le dernier octet de l’adresse du contrôleur ?', [
            'Les micro-interrupteurs DIP',
            'Le switch',
            'Le routeur, par DHCP',
            'Un cavalier sur l’alimentation',
          ], 'Huit interrupteurs, huit bits : chacun a son poids, de 2⁰ (DIP 1) à 2⁷ (DIP 8).'),
          Q('dip-bin', 'D.6.2', 'dip', 'Lecture du DTR : DIP 8 à DIP 1 = ?', ['0 0 1 1 0 0 1 0', '0 1 0 0 1 1 0 0', '1 1 0 0 1 1 0 1', '0 0 1 1 0 0 0 1'],
            'DIP 6, 5 et 2 à 1, les autres à 0 : 0011 0010, lu de DIP 8 vers DIP 1.'),
          Q('dip-dec', 'D.6.3', 'dip', 'Valeur décimale de cet octet ?', ['50', '76', '32', '49'],
            '2⁵ + 2⁴ + 2¹ = 32 + 16 + 2 = 50. Vérifie avec les interrupteurs ci-dessus.'),
          Q('dip-ip', 'D.6.4', 'dip', 'Adresse IP complète du contrôleur ?', ['192.168.1.50', '192.168.0.50', '192.168.1.32', '192.168.50.1'],
            'Adresse par défaut 192.168.1.X : le DIP ne fixe que X, donc 192.168.1.50.'),
          Q('dip-com', 'D.6.5', 'dip', 'Avec 192.168.1.50, le contrôleur communique-t-il avec le réseau local ?', [
            'Non : en classe C, le 3ᵉ octet doit être identique (1 ≠ 0)',
            'Oui : le dernier octet 50 est libre',
            'Oui, grâce au routeur',
            'Non : 50 est une adresse réservée',
          ], 'Masque 255.255.255.0 : les trois premiers octets forment le réseau. 192.168.1 n’est pas 192.168.0 — le ping restera sans réponse.'),
          Q('dip-croise', 'D.7.1', 'dip', 'Pour paramétrer le contrôleur directement depuis un ordinateur, quel câble ?', [
            'Un câble RJ45 croisé : deux machines reliées sans switch',
            'Un câble RJ45 droit',
            'Un câble USB-série RS 232',
            'Un cordon fibre',
          ], 'Sans switch entre elles, l’émission de l’une doit arriver sur la réception de l’autre : câble croisé. Avec un switch au milieu : câble droit.'),
          Q('dip-new', 'D.7.2', 'dtr1', 'Quels réglages donner au contrôleur pour qu’il communique ?', [
            '192.168.0.4 · 255.255.255.0 · passerelle 192.168.0.1 · DNS 89.2.0.1',
            '192.168.1.4 · 255.255.255.0 · passerelle 192.168.1.1 · DNS 89.2.0.1',
            '192.168.0.4 · 255.0.0.0 · passerelle 192.168.0.10 · sans DNS',
            '192.168.0.1 · 255.255.255.0 · passerelle 192.168.0.4 · DNS 89.2.0.1',
          ], 'L’adresse du DTR 1, le masque de la classe C, le routeur en passerelle, le DNS du fournisseur d’accès — exactement ce que tu saisiras à la mise en service.'),
          Q('dip-droit', 'D.8.1', 'dip', 'Une fois paramétré, quel câble entre le contrôleur et sa prise RJ45 ?', ['Un câble RJ45 droit', 'Un câble RJ45 croisé', 'Un cordon fibre', 'Aucun : il est en Wi-Fi'],
            'Il passe désormais par le switch : câble droit, comme tous les équipements.'),
          Q('dip-ping', 'D.8.3', 'dtr2526', 'Quelle commande, depuis la loge, pour s’assurer qu’il communique ?', [
            'ping 192.168.0.4 — attendu : envoyés 4, reçus 4, perdus 0',
            'ipconfig 192.168.0.4',
            'ping 192.168.1.50',
            'tracert 89.2.0.1',
          ], 'Le DTR 26 montre la réponse attendue : quatre réponses, 0 % de perte.'),
        ],
      },
      {
        id: 'dimensionner',
        titre: '⑥ Dimensionner · fiches DT 52 à 56',
        consigne: 'Chaque référence se lit sur sa fiche, affichée à gauche. Le tableau D.2.1 récapitule l’occupation de l’armoire.',
        questions: [
          Q('di-u', 'D.2.1', 'd21', 'Nombre total d’emplacements U nécessaires ?', ['12 U', '9 U', '8 U', '16 U'],
            '1 + 1 + 1 + 1 + 1 + 1 + 2 + 2 + 2 = 12 U, réserves comprises.'),
          Q('di-arm', 'D.2.2', 'dt52', 'Référence de l’armoire (profondeur 580 mm) ?', ['0 462 07', '0 462 06', '0 462 02', '0 462 12'],
            'Coffrets fixes, profondeur 580 mm : 9 U = 0 462 06, 12 U = 0 462 07. La 0 462 02 est un 12 U de 400 mm ; la 0 462 12 un coffret pivotant.'),
          Q('di-pdu', 'D.2.1', 'dt53', 'Référence du PDU avec protection différentielle ?', ['6 468 33', '6 468 30', '6 468 22', '6 468 35'],
            '« PDU avec protection » : 6 468 30 a un disjoncteur 16 A, 6 468 33 un disjoncteur DIFFÉRENTIEL 16 A 30 mA — c’est lui qu’on consignera.'),
          Q('di-pp', 'D.2.1', 'dt54', 'Référence du panneau de brassage (panneau droit avec 4 cassettes) ?', ['0 337 90', '0 337 91', '0 337 93', '0 337 63'],
            '0 337 90 : livré avec ses 4 cassettes, 24 connecteurs. Le 0 337 91 est nu ; 0 337 63 est un connecteur, pas un panneau.'),
          Q('di-tab', 'D.2.1', 'dt52', 'Référence de la tablette fixe 360 mm pour le NAS ?', ['0 465 02', '0 465 00', '0 465 01', '0 465 32'],
            'Tablettes fixes 2 U : 115, 200 ou 360 mm de profondeur. 360 mm → 0 465 02, pour coffrets de 580 et 600 mm.'),
          Q('di-cable', 'D.3.3', 'dt55', 'Référence du câble 4 paires (environ 400 m nécessaires) ?', ['0 327 56 (F/UTP, touret 500 m)', '0 328 56 (F/UTP, boîte 305 m)', '0 327 54 (U/UTP, boîte 305 m)', '0 327 57 (SF/UTP, 500 m)'],
            'F/UTP 4 paires, et 400 m : la boîte de 305 m ne suffit pas, le touret de 500 m oui (0 327 56, ou 0 338 53).'),
          Q('di-cordon', 'D.3.4', 'dt55', 'Référence des cordons de brassage (40 cm entre switch et panneau) ?', ['0 518 15 (F/UTP 0,5 m)', '0 517 63 (F/UTP 2 m)', '0 518 18 (U/UTP 0,5 m)', '0 517 52 (SF/UTP 1 m)'],
            '40 cm → 0,5 m, écranté F/UTP comme le câble. 2 m de cordon pour 40 cm, c’est une boucle dans l’armoire.'),
          Q('di-rj', 'D.3.5', 'dt54', 'Référence des connecteurs de brassage RJ45 ?', ['0 337 63 (cat. 6)', '0 337 53 (cat. 5e)', '0 337 85 (cat. 8)', '0 337 73 (cat. 6A)'],
            'Connecteurs RJ45 haute densité cat. 6, comme le câble. La cat. 5e limiterait tout le lien à 100 MHz.'),
          Q('di-ports', 'D.4.5', 'dt56', '10 ports utilisés + 80 % de réserve : quel switch ?', ['18 ports → 21.22.1176 (PoE+ 24 ports)', '10 ports → 21.22.1175 (PoE+ 16 ports)', '18 ports → 62486024 (D-Link 8 ports)', '8 ports → 21.22.1322'],
            '10 × 1,8 = 18 ports : le plus petit switch PoE+ qui les offre est le 24 ports 21.22.1176. Le 16 ports ne tient pas la réserve.'),
        ],
      },
    ],
  },
  postes: [
    {
      id: 'armoire', name: 'Armoire de brassage', need: 'Coffret 19" fixe, profondeur 580 mm, 12 U (D.2)',
      options: [
        { key: 'misc', img: DOC('p_armoire.jpg'), ref: 'Legrand LCS³ 0 462 07', spec: 'coffret fixe 12 U · prof. 580 mm · 36 kg admissibles', ok: true, why: '12 U exactement, profondeur 580 mm : la référence du corrigé D.2.2.' },
        { key: 'misc', img: DOC('p_armoire.jpg'), ref: 'Legrand LCS³ 0 462 06', spec: 'coffret fixe 9 U · prof. 580 mm', why: '9 U pour 12 U d’équipements et de réserves : la tablette du NAS ne rentre plus.' },
        { key: 'misc', img: DOC('p_armoire.jpg'), ref: 'Legrand LCS³ 0 462 09', spec: 'coffret fixe 21 U · prof. 580 mm', half: true, why: 'Tout rentre, mais 9 U payés et accrochés au mur pour rien : 12 U suffisent, réserves comprises.' },
      ],
    },
    {
      id: 'pdu', name: 'PDU (multiprise 19")', need: 'Alimenter les équipements actifs, avec protection différentielle (D.2.1)',
      options: [
        { key: 'misc', img: DOC('p_pdu.jpg'), ref: 'Legrand 6 468 33', spec: 'PDU 1 U · 6 prises 2P+T · disjoncteur différentiel 16 A 30 mA', ok: true, why: 'Protection des personnes intégrée, et un organe de coupure cadenassable : c’est lui qu’on consigne.' },
        { key: 'misc', img: DOC('p_pdu.jpg'), ref: 'Legrand 6 468 30', spec: 'PDU 1 U · 6 prises 2P+T · disjoncteur 16 A', half: true, why: 'Protège les conducteurs, pas les personnes : le cahier des charges veut la protection différentielle.' },
        { key: 'misc', img: DOC('p_pdu.jpg'), ref: 'Legrand 6 468 22', spec: 'PDU 1 U · 8 prises · interrupteur à voyant', why: 'Un interrupteur n’est pas une protection : aucun défaut ne serait coupé.' },
      ],
    },
    {
      id: 'panneau', name: 'Panneau de brassage', need: 'Panneau droit 1 U, 4 cassettes, 24 connecteurs RJ45 cat. 6',
      options: [
        { key: 'misc', img: DOC('p_panneau.jpg'), ref: 'Legrand LCS³ 0 337 90', spec: 'panneau droit 1 U · 4 cassettes · 24 RJ45', ok: true, why: 'Livré avec ses 4 cassettes : il ne reste qu’à y clipser les connecteurs 0 337 63.' },
        { key: 'misc', img: DOC('p_panneau.jpg'), ref: 'Legrand LCS³ 0 337 91', spec: 'panneau droit 1 U nu', half: true, why: 'Panneau nu : il faudrait commander les cassettes en plus.' },
        { key: 'misc', img: DOC('p_panneau.jpg'), ref: 'Legrand LCS³ 0 337 93', spec: 'panneau haute densité 48 RJ45', why: '48 connecteurs pour 8 liens : surdimensionné, et ce n’est pas le panneau du corrigé.' },
      ],
    },
    {
      id: 'cable', name: 'Câble réseau', need: 'F/UTP 4 paires cat. 6, environ 400 m (D.3)',
      options: [
        { key: 'misc', img: DOC('p_cable.jpg'), ref: 'Legrand 0 327 56', spec: 'F/UTP 4 paires cat. 6 · touret 500 m · LSZH', ok: true, why: 'Écran général, cat. 6 (250 MHz, 1 Gbit/s), 500 m pour 400 m de liens.' },
        { key: 'misc', img: DOC('p_cable.jpg'), ref: 'Legrand 0 328 56', spec: 'F/UTP 4 paires cat. 6 · boîte 305 m', half: true, why: 'Le bon câble, mais 305 m pour environ 400 m : il manquera une centaine de mètres.' },
        { key: 'misc', img: DOC('p_cable.jpg'), ref: 'Câble U/UTP cat. 5e', spec: 'non écranté · 100 MHz · 305 m', why: 'Ni écran contre les perturbations des câbles 230 V, ni les 250 MHz de la cat. 6.' },
      ],
    },
    {
      id: 'cordons', name: 'Cordons de brassage', need: 'Switch ↔ panneau : 40 cm, écrantés, cat. 6',
      options: [
        { key: 'misc', img: DOC('p_cordon.jpg'), ref: 'Legrand 0 518 15', spec: 'cordon F/UTP cat. 6 · 0,5 m', ok: true, why: '40 cm à franchir : 0,5 m, écranté comme le câble.' },
        { key: 'misc', img: DOC('p_cordon.jpg'), ref: 'Legrand 0 517 63', spec: 'cordon F/UTP cat. 6 · 2 m', why: '2 m pour 40 cm : 1,60 m de boucle par port dans une armoire de 12 U, dix fois.' },
        { key: 'misc', img: DOC('p_cordon.jpg'), ref: 'Legrand 0 518 18', spec: 'cordon U/UTP cat. 6 · 0,5 m', half: true, why: 'La bonne longueur, mais sans écran : le lien perd sa continuité de blindage.' },
      ],
    },
    {
      id: 'connecteurs', name: 'Connecteurs RJ45', need: 'Connecteurs de brassage cat. 6 pour le panneau (D.3.5)',
      options: [
        { key: 'misc', img: DOC('p_connecteurs.jpg'), ref: 'Legrand LCS³ 0 337 63', spec: 'RJ45 haute densité cat. 6 · repérage T568A / B', ok: true, why: 'Catégorie 6, raccordement sans outil avec code couleur T568B : la référence du corrigé.' },
        { key: 'misc', img: DOC('p_connecteurs.jpg'), ref: 'Legrand LCS³ 0 337 53', spec: 'RJ45 cat. 5e', why: 'Un seul maillon en cat. 5e ramène tout le lien à 100 MHz.' },
        { key: 'misc', img: DOC('p_connecteurs.jpg'), ref: 'Legrand LCS³ 0 337 85', spec: 'RJ45 cat. 8 STP', half: true, why: 'Fonctionnerait, mais cat. 8 sur un câblage cat. 6 : payé pour rien.' },
      ],
    },
    {
      id: 'switch', name: 'Switch', need: 'PoE+ (type 2) pour les caméras, 10 ports + 80 % de réserve (D.4.5)',
      options: [
        { key: 'misc', img: DOC('p_switch.jpg'), ref: 'Trendnet TPE-TG240G · 21.22.1176', spec: 'switch PoE+ Gigabit 24 ports · 19" 1 U', ok: true, why: '18 ports nécessaires → 24 ports ; PoE+ type 2 pour les caméras.' },
        { key: 'misc', img: DOC('p_switch.jpg'), ref: 'Trendnet TPE-TG160g · 21.22.1175', spec: 'switch PoE+ Gigabit 16 ports', half: true, why: 'Les 10 ports d’aujourd’hui passent, mais pas les 18 exigés avec la réserve de 80 %.' },
        { key: 'misc', img: DOC('p_switch_dlink.jpg'), ref: 'D-Link DGS-1008D · 62486024', spec: 'switch Gigabit 8 ports · sans PoE', why: 'Pas de PoE : les quatre caméras resteraient éteintes. Et 8 ports pour 10 équipements.' },
      ],
    },
    {
      id: 'cameras', name: 'Caméras IP', need: '4 caméras dôme 4 MP, alimentées par le câble (D.4.3)',
      options: [
        { key: 'misc', img: DOC('p_dome.jpg'), ref: '4 × Trendnet TV-IP1315PI · 21.22.1462', spec: 'dôme IR PoE · 4 MP · H.265 · IP67', ok: true, why: 'Dôme, 4 MP, PoE : les trois exigences, quatre fois.' },
        { key: 'misc', img: DOC('p_bullet.jpg'), ref: '4 × Trendnet TV-IP1318PI · 21.22.1463', spec: 'bullet IR PoE · 8 MP 4K', why: 'Une bullet, pas un dôme — et 8 MP qui chargeront le NAS pour rien.' },
        { key: 'misc', img: DOC('p_dome.jpg'), ref: '4 × caméra dôme 4 MP Wi-Fi', spec: 'alimentation 12 V par bloc secteur · sans PoE', why: 'Sans PoE, il faudrait une prise 230 V au plafond de chaque caméra.' },
      ],
    },
    {
      id: 'convertisseurs', name: 'Convertisseurs cuivre / fibre', need: 'Relier l’armoire à la loge sur 150 m de fibre monomode',
      options: [
        { key: 'misc', img: DOC('p_convertisseur.jpg'), ref: '2 × convertisseur 1000BASE-LX monomode SC ↔ RJ45', spec: 'Gigabit · fibre monomode · un à chaque extrémité', ok: true, why: 'Un à chaque bout : le switch et le PC de la loge n’ont que des prises RJ45.' },
        { key: 'misc', img: DOC('p_convertisseur.jpg'), ref: '1 × convertisseur 1000BASE-LX monomode', spec: 'côté armoire seulement', half: true, why: 'Côté loge, le PC n’a pas d’entrée fibre : il en faut un second.' },
        { key: 'misc', img: DOC('p_cordon.jpg'), ref: 'Câble F/UTP cat. 6 de 150 m', spec: 'liaison cuivre directe', why: '150 m > 100 m : au-delà, un lien cuivre cat. 6 n’est plus garanti (DTR 22).' },
      ],
    },
  ],
  rails: [],
  // Le seul organe électrique : le PDU, organe de consignation (voir `nets`).
  slots: [
    { id: 'q1', label: 'PDU · 6 468 33 · 6 prises 2P+T, différentiel 16 A 30 mA (consignation)', key: 'misc', rail: null, x: 0, rep: 'PDU' },
  ],
  annexItems: [],
  liaisons: LIAISONS,
  // Bornes du PDU pour le VAT : arrivée 230 V (toujours vive) et deux prises en aval.
  nets: {
    'q1.L': { net: 'L1', live: 'always' },
    'q1.N': { net: 'N', live: 'always' },
    'q1.1L': { net: 'L1', live: 'q1' },
    'q1.1N': { net: 'N', live: 'q1' },
    'q1.2L': { net: 'L1', live: 'q1' },
    'q1.2N': { net: 'N', live: 'q1' },
  },
  reseau: {
    equipements: [
      { id: 'PC', nom: 'Ordinateur de la loge', role: 'Poste de supervision : caméras, éclairage, portail, onduleur', ip: '192.168.0.10', zone: 'loge' },
      { id: 'CVL', nom: 'Convertisseur loge', role: 'Fibre ↔ RJ45, côté loge', ip: null, zone: 'loge' },
      { id: 'RTR', nom: 'Routeur', role: 'Relie le réseau local à Internet · passerelle par défaut', ip: '192.168.0.1', zone: 'local', port: 9, mac: '34-27-92-5B-10-01' },
      { id: 'CVA', nom: 'Convertisseur armoire', role: 'Fibre ↔ RJ45, côté armoire', ip: null, zone: 'local', port: 10 },
      { id: 'NAS', nom: 'NAS', role: 'Enregistrement de la vidéo des 4 caméras', ip: '192.168.0.2', zone: 'local', port: 1, mac: '00-11-32-A4-7B-10' },
      { id: 'GW', nom: 'Passerelle IP/KNX', role: 'Réseau local ↔ bus KNX (TP 3, 1.1.1)', ip: '192.168.0.3', zone: 'local', port: 2, mac: '48-33-DD-00-95-5D' },
      { id: 'API', nom: 'Automate M221', role: 'Gestion du portail (TP 2)', ip: '192.168.0.4', zone: 'local', port: 3, mac: '00-80-F4-12-3A-C5' },
      { id: 'IMEON', nom: 'Onduleur IMEON', role: 'Production PV et batteries (TP 1)', ip: '192.168.0.5', zone: 'onduleur', port: 4, mac: '70-B3-D5-6C-41-22' },
      { id: 'CAM1', nom: 'Caméra 1', role: 'Dôme 4 MP PoE · entrée', ip: '192.168.0.9', zone: 'entree', port: 5, poe: true, mac: '3C-8C-F8-01-00-09' },
      { id: 'CAM2', nom: 'Caméra 2', role: 'Dôme 4 MP PoE · local à vélos', ip: '192.168.0.8', zone: 'velos', port: 6, poe: true, mac: '3C-8C-F8-01-00-08' },
      { id: 'CAM3', nom: 'Caméra 3', role: 'Dôme 4 MP PoE · local à vélos', ip: '192.168.0.7', zone: 'velos', port: 7, poe: true, mac: '3C-8C-F8-01-00-07' },
      { id: 'CAM4', nom: 'Caméra 4', role: 'Dôme 4 MP PoE · local à vélos', ip: '192.168.0.6', zone: 'velos', port: 8, poe: true, mac: '3C-8C-F8-01-00-06' },
    ],
    rackU: 12,
    // Ordre du corrigé D.2.1. Tolérance : les deux passe-fils, identiques, sont
    // interchangeables, comme les deux réserves 2 U ; le reste de l'ordre est imposé.
    rack: [
      { id: 'obt', label: 'Plaque obturatrice', ref: '0 465 32', u: 1, debut: [1] },
      { id: 'pdu', label: 'PDU différentiel', ref: '6 468 33', u: 1, debut: [2] },
      { id: 'pf1', label: 'Passe-fils', ref: '0 465 28', u: 1, debut: [3, 5] },
      { id: 'sw', label: 'Switch PoE+ 24 ports', ref: '21.22.1176', u: 1, debut: [4] },
      { id: 'pf2', label: 'Passe-fils', ref: '0 465 28', u: 1, debut: [3, 5] },
      { id: 'pp', label: 'Panneau de brassage 24 RJ45', ref: '0 337 90', u: 1, debut: [6] },
      { id: 'res1', label: 'Réserve', u: 2, debut: [7, 11] },
      { id: 'tab', label: 'Tablette NAS 360 mm', ref: '0 465 02', u: 2, debut: [9] },
      { id: 'res2', label: 'Réserve', u: 2, debut: [7, 11] },
    ],
    automate: {
      id: 'API',
      ref: 'Modicon M221 · TM221CE16R',
      defaut: { ip: '192.168.1.50', masque: '255.255.255.0', passerelle: '', dns: '' },
      attendu: { ip: '192.168.0.4', masque: '255.255.255.0', passerelle: '192.168.0.1', dns: '89.2.0.1' },
    },
    poste: { id: 'PC', nom: 'PC_LOGE', description: 'Realtek PCIe GbE Family Controller', mac: '00-23-24-C0-54-EF', dns: ['89.2.0.1', '89.2.0.2'] },
    t568b: ['blanc-orange', 'orange', 'blanc-vert', 'bleu', 'blanc-bleu', 'vert', 'blanc-marron', 'marron'],
    portT568b: 3,
  },
  tests: [
    {
      id: 'visuel', title: 'Contrôle visuel du brassage et du repérage',
      how: 'Chaque port du panneau et du switch porte son repère (1 NAS · 2 passerelle · 3 automate · 4 onduleur · 5 à 8 caméras · 9 routeur · 10 convertisseur) ; cordons de 0,5 m sans boucle ni écrasement, rayons de courbure respectés.',
      expected: 'repérage conforme, aucun cordon écrasé',
    },
    {
      id: 'separation', title: 'Séparation courant fort / courant faible',
      how: 'Les câbles F/UTP ne cheminent pas dans le même conduit que les câbles 230 V ; croisements à angle droit ; écran du câble repris sur le connecteur.',
      expected: 'cheminements séparés, croisements à 90°',
    },
    {
      id: 'testeur-t568', title: 'Testeur de câble sur le lien de l’automate (connecteur T568B)',
      how: 'Injecteur sur la prise RJ45 de l’automate, récepteur sur le port 3 du panneau : les huit LED doivent s’allumer dans l’ordre, 1-1 … 8-8.',
      expected: '8/8 · 1-1 … 8-8 · câble droit',
    },
    {
      id: 'fibre-vfl', title: 'Continuité de la fibre au stylo optique (VFL)',
      how: 'Stylo à lumière rouge sur le connecteur SC de la loge, observation du connecteur de l’armoire ; bouchons remis aussitôt, jamais de regard dans une fibre raccordée à un convertisseur.',
      expected: 'lumière rouge visible à l’autre extrémité',
    },
  ],
  mesures: [
    { id: 'lan-api', title: 'Testeur : lien permanent de l’automate (port 3 → prise RJ45)', stage: 'horsTension', instrument: 'lan', dial: 'test', a: 'PPR.3', b: 'API.RJ', min: 8, max: 8, unit: 'brins' },
    { id: 'lan-cam3', title: 'Testeur : lien permanent de la caméra 3 (port 7 → prise RJ45)', stage: 'horsTension', instrument: 'lan', dial: 'test', a: 'PPR.7', b: 'CAM3.RJ', min: 8, max: 8, unit: 'brins' },
    { id: 'lan-cordon', title: 'Testeur : cordon switch → panneau du port 1', stage: 'horsTension', instrument: 'lan', dial: 'test', a: 'SW.1', b: 'PP.1', min: 8, max: 8, unit: 'brins' },
    { id: 'upoe', title: 'Tension PoE à la prise de la caméra 3 (paires 1-2 / 3-6)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'CAM3.12', b: 'CAM3.36', min: 44, max: 57, unit: 'V' },
    { id: 'led', title: 'Débit négocié sur le port 5 du switch (caméra 1)', stage: 'sousTension', instrument: 'net', dial: 'LED', a: 'SW.5', min: 1000, max: 1000, unit: 'Mbit/s' },
    { id: 'ping9', title: 'Ping de chacun des 9 équipements depuis la loge', stage: 'sousTension', instrument: 'net', dial: 'ping', min: 9, max: 9, unit: 'équipements' },
  ],
  faults: FAULTS,
  quiz: [
    { q: 'Que signifie PoE ?', options: ['Power over Ethernet : l’alimentation passe par le câble réseau', 'Protection over Ethernet', 'Port of Entry', 'Power of Electricity'], answer: 0 },
    { q: 'Pourquoi une catégorie 6 pour le câblage de l’Écobike ?', options: ['1 Gbit/s à 250 MHz', 'C’est la seule qui accepte le PoE', 'Pour dépasser 100 m', 'Pour la fibre'], answer: 0 },
    { q: 'Masque de sous-réseau par défaut d’une classe C ?', options: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.255'], answer: 2 },
    { q: 'Combien d’équipements au plus dans 192.168.0.0 / 255.255.255.0 ?', options: ['256', '255', '254', '10'], answer: 2 },
    { q: 'Pourquoi une fibre entre l’armoire et la loge ?', options: ['150 m, au-delà des 100 m d’un lien cuivre', 'Pour alimenter le PC', 'Parce qu’elle est moins chère', 'Pour le PoE'], answer: 0 },
    { q: 'Quel câble entre un PC et l’automate reliés directement, sans switch ?', options: ['Un câble droit', 'Un câble croisé', 'Une fibre', 'Un cordon USB'], answer: 1 },
    { q: 'T568B : quelle paire sur les broches 3 et 6 ?', options: ['Orange', 'Verte (blanc-vert en 3, vert en 6)', 'Bleue', 'Marron'], answer: 1 },
    { q: 'Le ping par adresse IP répond, le ping par nom échoue : que soupçonner ?', options: ['Le câble', 'Le DNS du poste', 'Le PoE', 'Le masque'], answer: 1 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  // Consignation sur le PDU différentiel : VAT sur son arrivée 230 V (source connue), absence
  // de tension sur les prises du switch et du NAS.
  consignationVat: {
    sourceConnue: ['q1.L', 'q1.N'],
    avalPairs: [['q1.1L', 'q1.1N'], ['q1.2L', 'q1.2N']],
  },
};
