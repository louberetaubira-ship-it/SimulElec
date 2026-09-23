/**
 * TP platine de service · sujet Chèvrerie, partie B, question B.4 :
 * schéma de raccordement de l'alarme intrusion (centrale, clavier, sirène, détecteurs du
 * magasin et de la fromagerie).
 *
 * Mode « câblage réel » de la question schéma du sujet numérique `chevrerie`
 * (`src/components/sujet/CablageReel.tsx`). `hidden` : absent du catalogue, jouable par la
 * route standard `/tp/<id>`.
 *
 * ------------------------------------------------------------ matériel (réponses B.2)
 *  - centrale filaire 10 zones I-ON20EU (DTR 12) et sa batterie 12 V 7 Ah SCA00001 ;
 *    transmetteur COM-DATA-4G : carte ENFICHABLE dans la centrale, sans borne (dessinée
 *    sur la carte, rien à câbler) ;
 *  - clavier LCD filaire I-KP01 sur le bus RS485 (DTR 14) ;
 *  - sirène intérieure auto-alimentée SIMAX et sa batterie 2 Ah (DTR 13) ;
 *  - détecteurs IR XCELWPT (9 m, 90°) et contacts magnétiques 400-FR (DTR 11) ;
 *  - résistances d'équilibrage 4K7 (shunt de l'alarme) et 2K2 (fin de ligne) : câblage
 *    ZFS 2k2/4k7 (DTR 12, figure 2), deux contacts par zone en « doubles portes » (figure 5).
 *
 * ------------------------------------------------------------ câblage (corrigé, p. 17-18)
 *  - sirène : 0V → CHARGE 0V → A.P. TAMPER (1) ; 12V BELL → CHARGE +12V ; TR → A.P. TAMPER (2)
 *    (boucle d'autoprotection ramenée au 0 V) ; BELL → INPUTS I1 (commande) ;
 *  - clavier : 0V, +12V, A, B du bus → 0V, 12V, A, B du clavier ;
 *  - IR : 0V / +12V du bus → − / + de chaque IR ;
 *  - Z0 (IR magasin) : Z0 → TAMPER → 2K2 → ALARM (‖ 4K7) → commun Z0/Z1 ;
 *  - Z1 (2 contacts magasin, doubles portes) : Z1 → ALARME 1 (‖ 4K7) → ALARME 2 (‖ 4K7) →
 *    2K2 → AP TAMPER 2 → AP TAMPER 1 → commun Z0/Z1 ;
 *  - Z2 (2 contacts fromagerie) : Z2 → AP TAMPER 1 → AP TAMPER 2 → 2K2 → ALARME 2 (‖ 4K7) →
 *    ALARME 1 (‖ 4K7) → commun Z2/Z3 ;
 *  - Z3 (IR fromagerie) : Z3 → ALARM (‖ 4K7) → 2K2 → TAMPER → commun Z2/Z3.
 * Couleur non notée au sujet : la platine garde ses couleurs de réseau (+12 V rouge, 0 V noir,
 * bus A / B violet, boucles et commandes rouge commande).
 *
 * Pré-câblé (installateur, hors schéma du sujet) : réseau → Q1 (disjoncteur 1P+N 2 A) →
 * bornier secteur de la centrale (L, N, terre du coffret métallique) ; cordons de la batterie
 * BAT+ / BAT− → batterie. La batterie se « raccorde » à la mise sous tension (organe `bat`).
 *
 * ------------------------------------------------------------ correspondance papier → platine
 * Le schéma papier s'étale sur DEUX pages (17 et 18) : la centrale y figure deux fois. Sur la
 * platine il n'y a qu'UNE centrale ; les bornes 0V / +12V de la page 18 (`C2.0V`, `C2.12V`)
 * SONT les bornes 0V / +12V du bus de la page 17 (`C.0V`, `C.12V`) : même bornier, relevé deux
 * fois sur le papier. `C2.A` / `C2.B` ne servent à rien sur la page 18 (bus déjà câblé au clavier).
 *
 *   papier (`partie-b.ts`, B4_RESEAUX)       platine
 *   C.<b>   (page 17)                        cen.<b>        (LS-, LS+, AUXT1, AUXT2, STB, BELL,
 *                                                            TR, 12VBELL, 0VB, 0V, 12V, A, B,
 *                                                            Z0, COM01, Z1, Z2, COM23, Z3)
 *   C2.0V · C2.12V · C2.A · C2.B (page 18)   cen.0V · cen.12V · cen.A · cen.B
 *   S.<b>                                    sir.<b>        (BAT+, BAT-, 0V, 12V, I1, I2, O1, O2,
 *                                                            AP1, AP2)
 *   K.<b>                                    cla.<b>        (ET1, ET2, B, A, 12V, 0V)
 *   IRM.<b> · IRF.<b>                        irm.<b> · irf.<b>  (+, -, A1, A2, LED, T1, T2)
 *   MM1 · MM2 · MF1 · MF2 .<b>               mm1 · mm2 · mf1 · mf2 .<b>  (T1, T2, A1, A2)
 *   <D>.R47a / <D>.R47b                      <d>_r47.1 / <d>_r47.2   (résistance 4K7)
 *   <D>.R22a / <D>.R22b                      <d>_r22.1 / <d>_r22.2   (résistance 2K2)
 * Les résistances du papier sont des composants à part, dessinés à côté de chaque détecteur :
 * elles le restent sur la platine (repères R1 à R10), et chacune de leurs pattes se câble.
 * `LIAISONS` est construite À PARTIR des réseaux du corrigé écrits avec les identifiants du
 * papier (`RESEAUX_PAPIER`) et de cette table (`surPlatine`) : les liaisons attendues sont
 * celles de la question, dans le même ordre de chaîne (`attendues` de `partie-b.ts`), sauf
 * que `C2.*` et `C.*` désignent désormais la même borne.
 *
 * ------------------------------------------------------------ correspondance moteur
 *   · `q1` = Q1, disjoncteur 1P+N 2 A de la centrale (secteur, organe de consignation) ;
 *   · `bat` = batterie 12 V 7 Ah : organe SUPPLÉMENTAIRE (`sectionneurs`), « fermé » quand
 *     ses cosses sont raccordées. La centrale fonctionne sur secteur OU batterie ; la mise sous
 *     tension n'est réussie qu'avec les deux (voyant HB, pas de défaut d'alimentation).
 * Les boucles de zones ne sont pas des réseaux que le simulateur mesure (ni 230 V, ni 12 V
 * franc) : leurs bornes ne sont pas déclarées dans `nets`. Le fonctionnement (résistance de
 * chaque boucle, états normal / alarme / autoprotection de la centrale) est calculé par le
 * modèle `B4` de `CablageReelModeles.ts`.
 */
import type { Liaison, NetKind, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

const PRE = (a: string, b: string, net: NetKind): Liaison => L(a, b, net, 'pre');

/**
 * Réseaux du corrigé, écrits avec les identifiants de bornes du SCHÉMA PAPIER
 * (`src/lib/data/sujets/chevrerie/partie-b.ts`, `B4_RESEAUX`), dans le même ordre.
 */
export const RESEAUX_PAPIER: { bornes: string[]; net: NetKind; label: string }[] = [
  // p. 17 — sirène
  { net: 'DC-', label: 'Sirène : 0V centrale → CHARGE 0V et A.P. TAMPER', bornes: ['C.0VB', 'S.0V', 'S.AP1'] },
  { net: 'DC+', label: 'Sirène : 12V BELL → CHARGE +12V', bornes: ['C.12VBELL', 'S.12V'] },
  { net: 'C', label: 'Sirène : TR → A.P. TAMPER', bornes: ['C.TR', 'S.AP2'] },
  { net: 'C', label: 'Sirène : BELL → INPUTS I1', bornes: ['C.BELL', 'S.I1'] },
  // p. 17 — clavier (bus RS485)
  { net: 'DC-', label: 'Clavier : 0V', bornes: ['C.0V', 'K.0V'] },
  { net: 'DC+', label: 'Clavier : +12V', bornes: ['C.12V', 'K.12V'] },
  { net: 'C0', label: 'Clavier : A', bornes: ['C.A', 'K.A'] },
  { net: 'C0', label: 'Clavier : B', bornes: ['C.B', 'K.B'] },
  // p. 18 — alimentation des détecteurs IR
  { net: 'DC-', label: 'Détecteurs IR : 0V', bornes: ['C2.0V', 'IRM.-', 'IRF.-'] },
  { net: 'DC+', label: 'Détecteurs IR : +12V', bornes: ['C2.12V', 'IRM.+', 'IRF.+'] },
  // Magasin — Z0 : détecteur de mouvement
  { net: 'C', label: 'Z0 → IR magasin TAMPER', bornes: ['C.Z0', 'IRM.T2'] },
  { net: 'C', label: 'Commun Z0/Z1 → IR magasin ALARM, 4K7 et contact magasin 1 (AP)', bornes: ['C.COM01', 'IRM.A1', 'IRM.R47a', 'MM1.T1'] },
  { net: 'C', label: 'IR magasin : 4K7 / 2K2 / ALARM', bornes: ['IRM.R47b', 'IRM.R22a', 'IRM.A2'] },
  { net: 'C', label: 'IR magasin : 2K2 → TAMPER', bornes: ['IRM.R22b', 'IRM.T1'] },
  // Magasin — Z1 : deux contacts d'ouverture
  { net: 'C', label: 'Z1 → contact magasin 1 ALARME et 4K7', bornes: ['C.Z1', 'MM1.A1', 'MM1.R47a'] },
  { net: 'C', label: 'Contacts magasin : ALARME 1 ↔ ALARME 2 (4K7)', bornes: ['MM1.A2', 'MM1.R47b', 'MM2.A2', 'MM2.R47b'] },
  { net: 'C', label: 'Contact magasin 2 : ALARME / 2K2 / 4K7', bornes: ['MM2.A1', 'MM2.R22b', 'MM2.R47a'] },
  { net: 'C', label: 'Contact magasin 2 : 2K2 → AP TAMPER', bornes: ['MM2.R22a', 'MM2.T2'] },
  { net: 'C', label: 'Contacts magasin : AP TAMPER 2 ↔ AP TAMPER 1', bornes: ['MM2.T1', 'MM1.T2'] },
  // Fromagerie — Z2 : deux contacts d'ouverture
  { net: 'C', label: 'Z2 → contact fromagerie 1 AP TAMPER', bornes: ['C.Z2', 'MF1.T1'] },
  { net: 'C', label: 'Contacts fromagerie : AP TAMPER 1 ↔ AP TAMPER 2', bornes: ['MF1.T2', 'MF2.T1'] },
  { net: 'C', label: 'Commun Z2/Z3 → IR fromagerie TAMPER, contact fromagerie 1 ALARME et 4K7', bornes: ['C.COM23', 'IRF.T2', 'MF1.A1', 'MF1.R47a'] },
  { net: 'C', label: 'Contacts fromagerie : ALARME 1 ↔ ALARME 2 (4K7)', bornes: ['MF1.A2', 'MF1.R47b', 'MF2.A2', 'MF2.R47b'] },
  { net: 'C', label: 'Contact fromagerie 2 : ALARME / 2K2 / 4K7', bornes: ['MF2.A1', 'MF2.R22b', 'MF2.R47a'] },
  { net: 'C', label: 'Contact fromagerie 2 : 2K2 → AP TAMPER', bornes: ['MF2.R22a', 'MF2.T2'] },
  // Fromagerie — Z3 : détecteur de mouvement
  { net: 'C', label: 'Z3 → IR fromagerie ALARM et 4K7', bornes: ['C.Z3', 'IRF.A1', 'IRF.R47a'] },
  { net: 'C', label: 'IR fromagerie : 4K7 / 2K2 / ALARM', bornes: ['IRF.R47b', 'IRF.R22a', 'IRF.A2'] },
  { net: 'C', label: 'IR fromagerie : 2K2 → TAMPER', bornes: ['IRF.R22b', 'IRF.T1'] },
];

/** Préfixes du papier → slot de la platine. */
const PREFIXES: Record<string, string> = {
  C: 'cen', C2: 'cen', S: 'sir', K: 'cla',
  IRM: 'irm', IRF: 'irf', MM1: 'mm1', MM2: 'mm2', MF1: 'mf1', MF2: 'mf2',
};

/** Borne du schéma papier → borne de la platine (voir la table de l'en-tête). */
export function surPlatine(papier: string): string {
  const i = papier.indexOf('.');
  const pre = papier.slice(0, i);
  const borne = papier.slice(i + 1);
  const slot = PREFIXES[pre];
  if (!slot) throw new Error(`chevrerie-b4 : préfixe inconnu « ${pre} » (${papier})`);
  // résistances d'équilibrage : composants à part, patte a → 1, patte b → 2
  const r = /^R(47|22)([ab])$/.exec(borne);
  if (r) return `${slot}_r${r[1]}.${r[2] === 'a' ? '1' : '2'}`;
  return `${slot}.${borne}`;
}

const LIAISONS: Liaison[] = [
  // ---- installateur : réseau → Q1 → bornier secteur de la centrale ; terre du coffret ----
  PRE('RES.L1', 'q1.1', 'L1'), PRE('RES.N', 'q1.N', 'N'),
  PRE('q1.2', 'cen.L', 'L1'), PRE('q1.N2', 'cen.N', 'N'),
  PRE('RES.PE', 'cen.PE', 'PE'),
  // ---- installateur : cordons de la batterie (cosses à raccorder à la mise sous tension) ----
  PRE('cen.BAT+', 'bat.+', 'DC+'), PRE('cen.BAT-', 'bat.-', 'DC-'),
  // ---- élève : le corrigé de B.4, réseau par réseau, en chaîne ----
  ...RESEAUX_PAPIER.flatMap(r => r.bornes.slice(1).map((b, i) => L(surPlatine(r.bornes[i]), surPlatine(b), r.net))),
];

function nets(): Record<string, TerminalNet> {
  const n: Record<string, TerminalNet> = {};
  const set = (ids: string[], net: TerminalNet['net'], live: TerminalNet['live']) => {
    for (const id of ids) n[id] = { net, live };
  };
  // secteur : Q1 → bornier de la centrale
  set(['RES.L1', 'q1.1'], 'L1', 'always'); set(['RES.N', 'q1.N'], 'N', 'always');
  set(['q1.2', 'cen.L'], 'L1', 'q1'); set(['q1.N2', 'cen.N'], 'N', 'q1');
  set(['RES.PE', 'cen.PE'], 'PE', 'always');
  // batterie : présente dès que ses cosses sont raccordées
  set(['bat.+', 'cen.BAT+'], 'DC+', 'aux:bat'); set(['bat.-', 'cen.BAT-'], 'DC-', 'aux:bat');
  // 12 V⎓ de la centrale (bus, sirène, IR) — déclaré sur secteur, le cas nominal
  set(['cen.12V', 'cen.12VBELL', 'cla.12V', 'sir.12V', 'irm.+', 'irf.+'], 'DC+', 'q1');
  set(['cen.0V', 'cen.0VB', 'cla.0V', 'sir.0V', 'sir.AP1', 'irm.-', 'irf.-'], 'DC-', 'q1');
  return n;
}

/** Détecteurs de terrain : colonne du local, par espace (magasin en haut, fromagerie en bas). */
const COL = 432;

export const TP_CHEVRERIE_B4_INTRUSION: TpDefinition = {
  id: 'chevrerie-b4-intrusion',
  title: 'Chèvrerie · Alarme intrusion (câblage réel)',
  level: 'Bac Pro MELEC',
  family: 'ter',
  scene: 'ter',
  annex: 'local',
  playable: true,
  hidden: true,
  competences: ['C6', 'C11'],
  diplomas: ['bacpro'],
  arriveeMono: true,
  uContinu: 12,
  goulotteDePied: false,
  sectionneurs: ['bat'],
  summary:
    'Sujet Chèvrerie, partie B : alarme intrusion du magasin et de la fromagerie. Centrale filaire '
    + '10 zones I-ON20EU (secteur par Q1 + batterie 12 V 7 Ah), clavier I-KP01 sur le bus RS485, sirène '
    + 'intérieure auto-alimentée SIMAX, deux détecteurs IR et quatre contacts d’ouverture en double '
    + 'équilibrage 2K2 / 4K7. Câbler le schéma, mettre sous tension, mettre en service au clavier, essayer '
    + 'chaque détecteur et l’autoprotection.',
  situation:
    'Suite à une tentative de cambriolage, l’assurance impose un système de détection d’intrusion. La '
    + 'centrale est posée dans le local technique avec sa batterie et son transmetteur enfichable ; le clavier '
    + 'à l’entrée, la sirène à l’intérieur. Le magasin est surveillé par un détecteur de mouvement (Z0) et deux '
    + 'contacts d’ouverture (Z1), la fromagerie par deux contacts (Z2) et un détecteur de mouvement (Z3). '
    + 'Compléter le schéma de raccordement : ici, il se câble sur la platine.',
  plaqueTitre: 'ALARME INTRUSION · MAGASIN ET FROMAGERIE',
  plaque: {
    'Centrale': 'I-ON20EU · 10 zones filaires · 230 V~ · sorties 12 V⎓ · batterie SCA00001 12 V 7 Ah · transmetteur COM-DATA-4G enfiché',
    'Clavier': 'I-KP01 · LCD + lecteur de badges · bus RS485 (0V, 12V, A, B)',
    'Sirène': 'SIMAX · intérieure auto-alimentée NF A2P 3 boucliers · batterie 12 V 2 Ah · 9 à 16 V⎓',
    'Détecteurs': 'IR XCELWPT (9 m, 90°) × 2 · contacts magnétiques 400-FR × 4 · câblage ZFS 2K2 / 4K7',
  },
  cahierDesCharges: [
    { k: 'Alimentation', v: 'secteur 230 V~ par Q1 (1P+N 2 A), pré-câblé ; batterie 12 V 7 Ah à raccorder à la mise sous tension' },
    { k: 'Clavier', v: 'bus RS485 : 0V, +12V, A, B de la centrale sur 0V, 12V, A, B du clavier' },
    { k: 'Sirène', v: 'CHARGE 0V / +12V sur 0V / 12V BELL ; commande I1 sur BELL ; autoprotection A.P. TAMPER entre 0V et TR' },
    { k: 'Magasin', v: 'Z0 : détecteur de mouvement ; Z1 : deux détecteurs d’ouverture (doubles portes)' },
    { k: 'Fromagerie', v: 'Z2 : deux détecteurs d’ouverture (doubles portes) ; Z3 : détecteur de mouvement' },
    { k: 'Équilibrage', v: 'ZFS 2K2 / 4K7 : 4K7 en parallèle sur chaque contact d’alarme, 2K2 de fin de ligne, autoprotection en série' },
    { k: 'Hors câblage', v: 'le détecteur de mouvement et les deux contacts de la zone de transformation et du SAS ne sont pas à raccorder ; transmetteur enfichable sans borne' },
  ],
  libelles: {
    rangees: ['goulotte 1', 'goulotte 2', 'goulotte 3', 'goulotte 4'],
    recv: 'Magasin (en haut) et fromagerie (en bas) : détecteurs dans la colonne du local',
  },
  schemaImage: {
    src: '/tp/chevrerie/q-b4-schema.jpg',
    legende: 'Schéma de raccordement de l’alarme intrusion (à compléter, pages 17 et 18 du sujet assemblées : la centrale y figure deux fois)',
  },
  postes: [
    {
      id: 'cen', name: 'Centrale d’alarme', need: 'Zones filaires en nombre suffisant, transmetteur enfichable (B.2.2)',
      options: [
        { key: 'ion20eu', ref: 'I-ON20EU', spec: 'centrale filaire 10 zones · bus RS485 · résistances d’équilibrage fournies', ok: true, why: 'La centrale du corrigé : 10 zones filaires pour 4 zones utiles, connecteurs pour transmetteur enfichable.' },
        { key: 'ion20eu', ref: 'EXP-W10FR', spec: 'module d’extension 10 zones filaires', why: 'C’est une extension de bus : elle ne gère ni la mise en service ni la sirène sans centrale.' },
        { key: 'ion20eu', ref: 'Tableau d’alarme incendie type 4', spec: '1 boucle · déclencheurs manuels', why: 'Alarme incendie, pas intrusion : aucune zone équilibrée ni autoprotection.' },
      ],
    },
    {
      id: 'bat', name: 'Batterie de la centrale', need: 'Accessoire obligatoire de la centrale (B.2.2)',
      options: [
        { key: 'sca00001', ref: 'SCA00001', spec: '12 V · 7 Ah · 151 × 95 × 65 mm', ok: true, why: 'La batterie « à prévoir » de la centrale : elle assure le secours en cas de coupure secteur.' },
        { key: 'sca00001', ref: 'SCA00002', spec: '12 V · 2 Ah', why: 'C’est la batterie de la sirène : trop faible pour la centrale.' },
      ],
    },
    {
      id: 'cla', name: 'Clavier de commande', need: 'Clavier LCD filaire intérieur avec lecteur de badges (descriptif)',
      options: [
        { key: 'ikp01', ref: 'I-KP01', spec: 'clavier LCD filaire · lecteur de badges intégré · 160 × 120 × 30 mm', ok: true, why: 'Filaire, LCD, badges : le clavier du descriptif, raccordé au bus 0V / 12V / A / B.' },
        { key: 'ikp01', ref: 'KEY-RKPZ', spec: 'clavier radio LCD', why: 'Radio : il demande une interface bus, le descriptif veut un clavier filaire.' },
        { key: 'ikp01', ref: 'KEY-EP', spec: 'lecteur de badge externe', why: 'Un simple lecteur de badges : ni écran ni touches pour la mise en service.' },
      ],
    },
    {
      id: 'sir', name: 'Sirène', need: 'Sirène filaire d’intérieur NF A2P 3 boucliers auto-alimentée (descriptif)',
      options: [
        { key: 'simax', ref: 'SIMAX + batterie SCA00002', spec: 'intérieure métal · auto-alimentée · 9 à 16 V⎓ · 117 dB', ok: true, why: 'La sirène du corrigé, avec sa batterie 2 Ah obligatoire : elle ne déclenche qu’en présence de sa batterie.' },
        { key: 'simax', ref: 'SIREXF', spec: 'sirène et flash extérieure', why: 'Extérieure : le descriptif demande une sirène d’intérieur.' },
        { key: 'simax', ref: 'SDRI-PPMS', spec: 'sirène d’alerte et messages', why: 'Sirène PPMS (mise en sûreté), pas une sirène d’alarme intrusion.' },
      ],
    },
    {
      id: 'ir', name: 'Détecteurs de mouvement', need: 'Infrarouge filaire mural, 9 m sur 90° (descriptif)',
      options: [
        { key: 'xcelwpt', ref: 'XCELWPT (× 2)', spec: 'IR passif · 9 m · 90° · 64 × 95 × 49 mm', ok: true, why: 'Portée et angle du descriptif ; contacts ALARM et TAMPER NF.' },
        { key: 'xcelwpt', ref: 'CX702', spec: 'IR 21 m 90° ou 45 m 10°', why: 'Longue portée : surdimensionné pour le magasin et la fromagerie.' },
        { key: 'xcelwpt', ref: 'SX360Z', spec: 'IR plafond 360°', why: 'Montage au plafond : le descriptif demande une fixation murale.' },
      ],
    },
    {
      id: 'ouv', name: 'Détecteurs d’ouverture', need: 'Contact filaire en plastique à montage en saillie NF A2P (descriptif)',
      options: [
        { key: 'fr400', ref: '400-FR (× 4)', spec: 'contact magnétique saillie · NF · 4 bornes alarme + autoprotection', ok: true, why: 'Plastique, en saillie, NF A2P : 4 bornes ALARME et AP TAMPER.' },
        { key: 'fr400', ref: '410-FR', spec: 'contact cylindrique à câble', why: 'Pas de bornier : il sort en câble, et il n’est pas NF A2P.' },
        { key: 'fr400', ref: '423-TF', spec: 'contact encastrable', why: 'Encastrable : le descriptif demande un montage en saillie.' },
      ],
    },
    {
      id: 'eol', name: 'Résistances d’équilibrage', need: 'Câblage ZFS de la centrale (DTR 12, figures 2 et 5)',
      options: [
        { key: 'reol4k7', ref: '4K7 (shunt) + 2K2 (fin de ligne)', spec: 'fournies avec la centrale · ZFS 2k2/4k7', ok: true, why: 'Le couple de la centrale : 2,2 kΩ au repos, 6,9 kΩ en alarme, court-circuit et coupure en autoprotection.' },
        { key: 'reol4k7', ref: '8K2 / 8K2', spec: 'résistances FSL', why: 'Autre méthode de câblage (DTR 12, figure 3), pas celle du corrigé.' },
        { key: 'reol2k2', ref: 'Aucune (2 fils NF)', spec: 'sans résistance', why: 'Sans équilibrage, la centrale ne distingue plus l’alarme de l’autoprotection sur une même paire.' },
      ],
    },
    {
      id: 'q1', name: 'Q1 · Protection de la centrale', need: 'Circuit spécialisé 230 V~ de la centrale',
      options: [
        { key: 'dx3pn', ref: 'DX3 1P+N 2 A · 4 067 71', spec: 'phase + neutre · 2 A', ok: true, why: 'Un circuit dédié, sectionnable, calibré pour la petite alimentation de la centrale.' },
        { key: 'dx3pn', ref: 'DX3 1P+N 16 A', spec: '16 A', why: 'Le transformateur de la centrale ne serait plus protégé.' },
      ],
    },
  ],
  // Sirène + Q1 · centrale (book, décalée sous son rail) · batterie · clavier.
  rails: [150, 450, 848, 1040],
  armoire: 1160,
  slots: [
    { id: 'sir', label: 'SIR · Sirène intérieure auto-alimentée SIMAX (batterie 2 Ah)', key: 'simax', rail: 0, x: 44, dy: 46, rep: 'SIR' },
    { id: 'q1', label: 'Q1 · Disjoncteur 1P+N 2 A · secteur de la centrale', key: 'dx3pn', rail: 0, x: 350, rep: 'Q1' },
    { id: 'cen', label: 'CEN · Centrale d’alarme I-ON20EU (transmetteur COM-DATA-4G enfiché)', key: 'ion20eu', rail: 1, x: 42, dy: 94, rep: 'CEN' },
    { id: 'bat', label: 'BAT · Batterie 12 V 7 Ah SCA00001 de la centrale', key: 'sca00001', rail: 2, x: 90, rep: 'BAT' },
    { id: 'cla', label: 'CLA · Clavier LCD I-KP01', key: 'ikp01', rail: 3, x: 80, rep: 'CLA' },
    // ---- magasin (colonne du local, en haut) ----
    { id: 'irm', label: 'IRM · Détecteur IR XCELWPT · magasin (Z0)', key: 'xcelwpt', rail: null, x: COL + 12, y: 8, rep: 'IRM' },
    { id: 'irm_r47', label: 'R1 · 4K7 · shunt de l’alarme de l’IR magasin', key: 'reol4k7', rail: null, x: COL + 6, y: 156, rep: 'R1' },
    { id: 'irm_r22', label: 'R2 · 2K2 · fin de ligne de Z0', key: 'reol2k2', rail: null, x: COL + 64, y: 156, rep: 'R2' },
    { id: 'mm1', label: 'MM1 · Contact d’ouverture 400-FR · magasin, porte 1 (Z1)', key: 'fr400', rail: null, x: COL + 14, y: 182, rep: 'MM1' },
    { id: 'mm1_r47', label: 'R3 · 4K7 · shunt de l’alarme du contact magasin 1', key: 'reol4k7', rail: null, x: COL + 41, y: 224, rep: 'R3' },
    { id: 'mm2', label: 'MM2 · Contact d’ouverture 400-FR · magasin, porte 2 (Z1)', key: 'fr400', rail: null, x: COL + 14, y: 250, rep: 'MM2' },
    { id: 'mm2_r22', label: 'R4 · 2K2 · fin de ligne de Z1', key: 'reol2k2', rail: null, x: COL + 6, y: 292, rep: 'R4' },
    { id: 'mm2_r47', label: 'R5 · 4K7 · shunt de l’alarme du contact magasin 2', key: 'reol4k7', rail: null, x: COL + 64, y: 292, rep: 'R5' },
    // ---- fromagerie (colonne du local, en bas) ----
    { id: 'irf', label: 'IRF · Détecteur IR XCELWPT · fromagerie (Z3)', key: 'xcelwpt', rail: null, x: COL + 12, y: 338, rep: 'IRF' },
    { id: 'irf_r47', label: 'R6 · 4K7 · shunt de l’alarme de l’IR fromagerie', key: 'reol4k7', rail: null, x: COL + 6, y: 486, rep: 'R6' },
    { id: 'irf_r22', label: 'R7 · 2K2 · fin de ligne de Z3', key: 'reol2k2', rail: null, x: COL + 64, y: 486, rep: 'R7' },
    { id: 'mf1', label: 'MF1 · Contact d’ouverture 400-FR · fromagerie, porte 1 (Z2)', key: 'fr400', rail: null, x: COL + 14, y: 512, rep: 'MF1' },
    { id: 'mf1_r47', label: 'R8 · 4K7 · shunt de l’alarme du contact fromagerie 1', key: 'reol4k7', rail: null, x: COL + 41, y: 554, rep: 'R8' },
    { id: 'mf2', label: 'MF2 · Contact d’ouverture 400-FR · fromagerie, porte 2 (Z2)', key: 'fr400', rail: null, x: COL + 14, y: 580, rep: 'MF2' },
    { id: 'mf2_r22', label: 'R9 · 2K2 · fin de ligne de Z2', key: 'reol2k2', rail: null, x: COL + 6, y: 622, rep: 'R9' },
    { id: 'mf2_r47', label: 'R10 · 4K7 · shunt de l’alarme du contact fromagerie 2', key: 'reol4k7', rail: null, x: COL + 64, y: 622, rep: 'R10' },
  ],
  annexItems: [],
  recvItems: [],
  liaisons: LIAISONS,
  nets: nets(),
  // TBT et électronique : pas d'essai d'isolement 500 V sur les boucles de détection.
  tests: BASE_TESTS.filter(t => t.id !== 'iso'),
  mesures: [
    { id: 'cBus0V', title: 'Continuité du 0 V du bus (centrale → clavier)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'cen.0V', b: 'cla.0V', min: 0, max: 2, unit: 'Ω' },
    { id: 'cIR0V', title: 'Continuité du 0 V des détecteurs (centrale → IR fromagerie)', stage: 'horsTension', instrument: 'mm', dial: 'Ω', a: 'cen.0V', b: 'irf.-', min: 0, max: 2, unit: 'Ω' },
    { id: 'uBus', title: 'Tension du bus au clavier (12V – 0V)', stage: 'sousTension', instrument: 'mm', dial: 'V⎓', a: 'cla.12V', b: 'cla.0V', min: 11, max: 14, unit: 'V' },
  ],
  faults: [
    {
      id: 'busA', title: 'Conducteur A du bus débranché au clavier',
      symptom: 'Le clavier s’allume mais affiche un défaut de communication : la centrale ne le reconnaît pas, impossible de mettre en service.',
      fix: 'Le clavier est alimenté (12 V entre 12V et 0V) : le défaut est sur la liaison de données. Hors tension, contrôler la continuité A → A et B → B du bus.',
      coupe: 'cen.A>cla.A',
      action: 'Reprendre le conducteur A du bus entre la centrale et le clavier',
    },
    {
      id: 'tr', title: 'Retour d’autoprotection de la sirène non raccordé sur TR',
      symptom: 'Dès la mise sous tension, même hors service, la centrale signale une autoprotection sirène et déclenche l’alarme.',
      fix: 'La boucle 0V → A.P. TAMPER → TR doit être fermée capot fermé. Hors tension, continuité TR → A.P. TAMPER : OL. Reprendre le conducteur.',
      coupe: 'cen.TR>sir.AP2',
      action: 'Raccorder la borne TR de la centrale sur l’A.P. TAMPER de la sirène',
    },
  ],
  quiz: [
    { q: 'Câblage ZFS 2K2 / 4K7 : quelle résistance voit la centrale au repos (contacts fermés) ?', options: ['2,2 kΩ', '4,7 kΩ', '6,9 kΩ', '0 Ω'], answer: 0 },
    { q: 'Un contact d’alarme s’ouvre : la 4K7 n’est plus shuntée. Que mesure la centrale ?', options: ['6,9 kΩ : alarme', '2,2 kΩ : normal', '0 Ω : autoprotection', 'Circuit ouvert'], answer: 0 },
    { q: 'On coupe le câble d’une zone, centrale hors service. Que se passe-t-il ?', options: ['Alarme d’autoprotection : elle est surveillée en permanence', 'Rien, la centrale est hors service', 'Seul le clavier bippe', 'La zone est ignorée'], answer: 0 },
    { q: 'Deux contacts d’ouverture sur la même zone (doubles portes) se câblent :', options: ['en série, chacun avec sa 4K7, une seule 2K2 de fin de ligne', 'en parallèle, sans résistance', 'chacun avec sa 2K2', 'sur deux zones différentes'], answer: 0 },
  ],
  motor: null,
  station: false,
  hasMotor: false,
  consignationVat: {
    sourceConnue: ['RES.L1', 'RES.N'],
    avalPairs: [['q1.2', 'q1.N2']],
  },
};
