/**
 * TP · Installation photovoltaïque 3 kWc raccordée au réseau (UTE C 15-712-1).
 *
 * Champ : 12 modules 250 Wc (Voc 38 V · Isc 8,8 A · k = −0,32 %/°C) en 2 strings de 6,
 * soit Uoc = 228 V par string (253 V corrigés à −10 °C) et Isc = 8,8 A par string.
 * Coffret DC : porte-fusibles gPV par string, interrupteur-sectionneur 1000 V, parafoudre DC type 2.
 * Onduleur string 3 kVA sans transformateur, coffret AC (parafoudre, disjoncteur 16 A,
 * différentiel 30 mA type A), compteur de production, injection en aval de l'AGCP.
 *
 * ----------------------------------------------------------------------------------
 * Adaptation du moteur de simulation (conçu pour une platine industrielle 400 V) :
 *  - identifiants de slots imposés : `q1` = interrupteur-sectionneur DC Q1 (organe de
 *    séparation et de condamnation), `f2` = disjoncteur AC Q2, `f3` = différentiel DDR1,
 *    `km1` (absent ici) est remplacé par le relais de découplage interne de l'onduleur :
 *    l'appui sur S2 en porte couple l'onduleur, S1 le découple ;
 *  - `f1` est le porte-fusibles du string 1 : ce préfixe est le seul, avec `q1` / `x1_1..3`,
 *    que la pince ampèremétrique du moteur reconnaît, ce qui permet de lire le courant
 *    de string (voir `clampCurrent` dans `src/lib/sim/mesures.ts`) ;
 *  - pannes injectables limitées à `a2 / s1 / l2 / x2 / f3` : seules `x2`, `a2` et `f3`
 *    sont exploitées, avec un scénario photovoltaïque plausible.
 *
 * Limites connues du moteur, contournées ici et signalées à l'élève :
 *  - la table `nets` ne connaît pas le continu : les potentiels DC+ sont déclarés en `V`
 *    (potentiel « phase ») et les DC− en `C0` (potentiel nul), ce qui donne 230 V entre
 *    DC+ et DC− — valeur cohérente avec l'Uoc réelle du champ choisi (228 V) ;
 *  - la position V⎓ du multimètre n'est pas instrumentée : les tensions continues se
 *    relèvent en position V~ (ligne « Simulateur » du cahier des charges) ;
 *  - la pince n'a pas de calibre A⎓ : le courant de string se lit sur le calibre A~ ;
 *  - les conducteurs `DC+` / `DC-` du tableau de câblage portent bien le bon conducteur :
 *    seule la table des potentiels utilise des équivalents alternatifs.
 */
import type { AnnexItem, Slot, TerminalNet, TpDefinition } from '@/lib/types';
import { BASE_TESTS, L } from './common';

/* ------------------------------------------------------------------ bornier AC */

/** Bornier X1 (alternatif) : bornes étroites au pas de 18 px sur le dernier rail. */
function bornierAC(x0: number, rows: [string, string, string][], rail = 2): Slot[] {
  return rows.map(([key, mark, sub], i) => ({
    id: `x1_${i + 1}`,
    label: `X1:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18,
    mark,
    sub,
    group: 'X1',
    ...(i === 0 ? { groupLabel: 'X1 · alternatif' } : {}),
  }));
}

/** Bornier X2 (continu) : bornes étroites, un couple + / − par string, plus la terre. */
function bornierDC(x0: number, rows: [string, string, string][], rail = 2): Slot[] {
  return rows.map(([key, mark, sub], i) => ({
    id: `x2_${i + 1}`,
    label: `X2:${mark} · ${sub}`,
    key,
    rail,
    x: x0 + i * 18,
    mark,
    sub,
    group: 'X2',
    ...(i === 0 ? { groupLabel: 'X2 · continu' } : {}),
  }));
}

/* --------------------------------------------------------------------- toiture */

/** Un module du champ : 48 × 44 px, hors de l'emprise du coffret de porte. */
const module_ = (n: number, x: number, y: number): AnnexItem => ({
  key: 'pvpanel', rep: `PV${n}`, name: 'module 250 Wc polycristallin', x, y, w: 40, h: 44,
});

/** Toiture : 2 strings de 6 modules et la barrette de mise à la terre des cadres. */
const ROOF: AnnexItem[] = [
  ...[0, 1, 2, 3, 4, 5].map((i) => module_(i + 1, 436, 300 + i * 52)),
  ...[0, 1, 2, 3, 4, 5].map((i) => module_(i + 7, 496, 300 + i * 52)),
  { key: 'l_borniers_wago_x2', rep: 'MT', name: 'barrette de mise à la terre des cadres', x: 436, y: 624, w: 30, h: 26 },
];

/** Charges alimentées par l'installation (autoconsommation). */
const RECV: AnnexItem[] = [
  { key: 'l_recepteu_chauffe_eau', rep: 'CE', name: 'chauffe-eau 2000 W', x: 60, y: 22, w: 50, h: 104, recv: true },
  { key: 'l_recepteu_convecteur', rep: 'R1', name: 'convecteur 1500 W', x: 170, y: 50, w: 150, h: 70, recv: true },
  { key: 'l_ampoule_plexo_hublot', rep: 'E1', name: 'éclairage du logement', x: 380, y: 34, w: 60, h: 60, recv: true },
];

/* ----------------------------------------------------------- potentiels du champ */

/** Potentiels d'un string : tous les modules au potentiel « + », le dernier − au potentiel nul. */
function stringNets(first: number, last: number): Record<string, TerminalNet> {
  const out: Record<string, TerminalNet> = {};
  for (let i = first; i <= last; i++) {
    out[`PV${i}.X1`] = { net: 'V', live: 'always' };
    out[`PV${i}.X2`] = i === last ? { net: 'C0', live: 'always' } : { net: 'V', live: 'always' };
  }
  return out;
}

export const TP_PV_RESEAU: TpDefinition = {
  id: 'pv-reseau',
  title: 'Installation photovoltaïque 3 kWc raccordée au réseau',
  level: 'Tle Bac Pro MELEC / BTS',
  family: 'pv',
  scene: 'pv',
  annex: 'roof',
  playable: true,
  station: true,
  competences: ['C5 Réaliser', 'C6 Mettre en service', 'C7 Maintenir'],
  summary:
    '12 modules 250 Wc en 2 strings de 6 (Uoc 228 V, Isc 8,8 A), coffret DC (fusibles gPV 15 A, interrupteur-sectionneur 1000 V, parafoudre type 2), onduleur string 3 kVA sans transformateur, coffret AC (parafoudre, disjoncteur 16 A, différentiel 30 mA type A), compteur de production et injection en aval de l\'AGCP.',
  situation:
    'Une maison individuelle est équipée de 12 modules photovoltaïques en toiture, câblés en deux strings de six et déjà descendus jusqu\'au local technique. Tu dois réaliser le coffret continu, raccorder l\'onduleur, monter le coffret alternatif et le comptage de production, puis mettre l\'installation en service en respectant l\'ordre de manœuvre imposé par l\'UTE C 15-712-1 : le continu avant l\'alternatif à la mise en marche, l\'alternatif avant le continu à l\'arrêt.',
  plaque: {
    Champ: '12 × 250 Wc = 3 kWc',
    Strings: '2 strings de 6 modules',
    Voc: '38,0 V par module · 228 V par string',
    'Voc à −10 °C': '253 V (k = −0,32 %/°C)',
    Isc: '8,8 A par string · 17,6 A au total',
    Onduleur: '3 kVA · 2 MPPT · 1000 V DC max · 125 – 800 V · 20 A par entrée',
    'Câble DC': '6 mm² solaire double isolation · connecteurs MC4',
    Régime: 'TT · UTE C 15-712-1',
  },
  cahierDesCharges: [
    { k: 'Champ', v: '2 strings de 6 modules 250 Wc, câble solaire 6 mm², connecteurs MC4 de même marque' },
    { k: 'Coffret DC', v: 'F1 / F2 porte-fusibles gPV sur les deux polarités de chaque string, Q1 interrupteur-sectionneur 1000 V bipolaire, F3 parafoudre DC type 2' },
    { k: 'Calibre des fusibles', v: '1,25 × Isc ≤ In ≤ 2,4 × Isc, soit 11 A ≤ In ≤ 21 A pour Isc = 8,8 A → gPV 15 A' },
    { k: 'Tension maximale', v: 'Voc corrigée à −10 °C = 228 × (1 + 0,0032 × 35) = 253 V, à comparer à la tension d\'entrée maximale de l\'onduleur' },
    { k: 'Onduleur', v: 'U1, string 3 kVA sans transformateur, 2 entrées MPPT ; les deux strings, de même orientation, sont mis en parallèle sur l\'entrée MPPT 1, ce qui impose un fusible par string' },
    { k: 'Coffret AC', v: 'F4 parafoudre AC type 2, Q2 disjoncteur 16 A courbe C (I = 3000 / 230 = 13 A), DDR1 différentiel 30 mA type A' },
    { k: 'Comptage', v: 'C1 compteur de production en série sur le départ, injection en aval de l\'AGCP Q0' },
    { k: 'Charges du logement', v: 'chauffe-eau, convecteur et éclairage sont alimentés par le tableau existant : ils sont représentés mais hors périmètre du câblage' },
    { k: 'Rail 1', v: 'coffret continu : F1 · F2 · Q1 · F3' },
    { k: 'Rail 2', v: 'onduleur et coffret alternatif : U1 · F4 · Q2 · DDR1' },
    { k: 'Rail 3', v: 'Q0 AGCP · C1 comptage · X2 bornier continu (5 bornes) · X1 bornier alternatif (3 bornes)' },
    { k: 'Porte', v: 'S2 couplage de l\'onduleur · S1 découplage · H1 production · H2 défaut' },
    { k: 'Mise en service', v: 'fermer Q1 (continu), puis Q2 et DDR1 (alternatif) ; à l\'arrêt, l\'ordre inverse' },
    { k: 'Avant mise en service', v: 'contrôle visuel · polarités · isolement 500 V côté continu · continuité de la liaison équipotentielle' },
    { k: 'Simulateur', v: 'la position V⎓ du multimètre et le calibre A⎓ de la pince ne sont pas instrumentés : les grandeurs continues se relèvent sur V~ et A~' },
  ],
  postes: [
    {
      id: 'ond',
      name: 'U1 · Onduleur',
      need: 'Convertir 3 kWc continus en 230 V alternatif, avec Uoc corrigée à froid de 253 V',
      options: [
        { key: 'smart', ref: 'ONDU-3000-250', spec: '3 kVA · 250 V d\'entrée maximale', why: 'La Voc corrigée à −10 °C atteint 253 V : l\'entrée de l\'onduleur serait détruite au premier matin d\'hiver.' },
        { key: 'smart', ref: 'ONDU-3000-2M', spec: '3 kVA · 2 MPPT · 125 – 800 V · 1000 V max', ok: true, why: '253 V à froid restent très en dessous des 1000 V admis, 228 V à vide et 183 V au point de puissance maximale tombent dans la plage MPPT, et 3 kVA correspondent aux 3 kWc du champ.' },
        { key: 'meter', ref: 'ONDU-1500', spec: '1,5 kVA · 1000 V max', why: 'Puissance deux fois trop faible pour un champ de 3 kWc : écrêtage permanent et vieillissement prématuré.' },
      ],
    },
    {
      id: 'fus',
      name: 'F1 / F2 · Fusibles de string',
      need: 'Protéger chaque string du courant inverse fourni par l\'autre (Isc = 8,8 A)',
      options: [
        { key: 'mcb2p', ref: 'Porte-fusible gPV 15 A · 1000 V DC', spec: '10 × 38 gPV, une polarité par fusible', ok: true, why: '1,25 × 8,8 = 11 A ≤ 15 A ≤ 2,4 × 8,8 = 21 A, et 15 A reste sous les 44 A admissibles par le 6 mm².' },
        { key: 'mcb2p', ref: 'Porte-fusible gPV 10 A · 1000 V DC', spec: '10 A', why: 'En dessous de 1,25 × Isc : le fusible fondra par beau temps alors que le string est sain.' },
        { key: 'mcb1p', ref: 'Fusible gG 25 A · 500 V AC', spec: 'cartouche alternative', why: 'Un fusible alternatif ne coupe pas un arc continu, et 25 A dépasse 2,4 × Isc : le câble n\'est plus protégé.' },
      ],
    },
    {
      id: 'qdc',
      name: 'Q1 · Interrupteur-sectionneur DC',
      need: 'Séparer et condamner le champ pour toute intervention sur l\'onduleur',
      options: [
        { key: 'steck2p', ref: 'Interrupteur 400 V AC · 32 A', spec: 'appareil alternatif', why: 'En continu l\'arc ne s\'éteint pas au passage par zéro : l\'appareil se souderait.' },
        { key: 'mcb1p', ref: 'Sectionneur DC unipolaire', spec: 'coupure du + seulement', why: 'Le pôle − reste raccordé : l\'onduleur n\'est pas isolé du champ.' },
        { key: 'steck2p', ref: 'Interrupteur-sectionneur DC 1000 V · 32 A', spec: '2 pôles, coupure en charge, condamnable', ok: true, why: 'Coupure en charge des deux polarités sous 1000 V continu et cadenassable : c\'est l\'organe de séparation exigé côté continu.' },
      ],
    },
    {
      id: 'cab',
      name: 'Câbles de string',
      need: 'Descendre 8,8 A par string depuis la toiture, en extérieur, sur 25 m',
      options: [
        { key: 'termblue', ref: 'H07V-U 6 mm²', spec: 'bonne section, isolant PVC', half: true, why: 'La section convient, mais l\'isolant PVC ne tient ni les UV ni la température de la toiture.' },
        { key: 'termred', ref: 'Câble solaire 6 mm²', spec: 'double isolation, tenue UV et ozone, − 40 / + 90 °C', ok: true, why: 'Section et qualité imposées par l\'UTE C 15-712-1 : chute de tension inférieure à 3 % et tenue aux UV en toiture.' },
        { key: 'termred', ref: 'H07V-U 1,5 mm²', spec: 'fil rigide 1,5 mm²', why: 'Section quatre fois trop faible (chute de tension) et isolant non prévu pour l\'extérieur.' },
      ],
    },
    {
      id: 'spd',
      name: 'F3 / F4 · Parafoudres',
      need: 'Protéger l\'onduleur des surtensions venant du champ et du réseau',
      options: [
        { key: 'mcb2p', ref: 'Parafoudre DC type 2 1000 V + parafoudre AC type 2', spec: 'un de chaque côté de l\'onduleur', ok: true, why: 'Le champ en toiture et la ligne réseau sont tous deux exposés ; les modèles DC sont spécifiques au continu (Ucpv).' },
        { key: 'mcb1p', ref: 'Parafoudre DC type 3', spec: 'type 3', why: 'Le type 3 ne s\'installe qu\'en protection fine, en complément d\'un type 1 ou 2 placé à l\'origine.' },
        { key: 'mcb2p', ref: 'Parafoudre AC type 2 seul', spec: 'côté réseau uniquement', why: 'Le côté le plus exposé est justement le champ : l\'entrée continue de l\'onduleur resterait sans protection.' },
      ],
    },
    {
      id: 'ac',
      name: 'Q2 / DDR1 · Protection du départ alternatif',
      need: 'Protéger le câble 2,5 mm² et les personnes en sortie d\'un onduleur sans transformateur',
      options: [
        { key: 'rcd2eaton', ref: 'Disjoncteur 16 A + différentiel 30 mA type AC', spec: 'type AC', why: 'Le type AC est aveugle aux courants de défaut à composante continue : il peut rester bloqué et ne plus protéger.' },
        { key: 'rcd2p', ref: 'Disjoncteur 16 A courbe C + différentiel 30 mA type A', spec: '16 A · 30 mA type A', ok: true, why: 'I = 3000 / 230 = 13 A, donc 16 A pour du 2,5 mm² ; le type A détecte les composantes continues des onduleurs sans transformateur.' },
        { key: 'mcb2p', ref: 'Disjoncteur 32 A seul', spec: 'sans différentiel', why: 'Le 2,5 mm² n\'est plus protégé et les personnes ne le sont pas du tout.' },
      ],
    },
  ],
  rails: [150, 346, 542],
  slots: [
    // rail 1 · coffret continu
    { id: 'f1', label: 'F1 · Porte-fusibles gPV string 1', key: 'dcfuse', rail: 0, x: 52, rep: 'F1' },
    { id: 'fus2', label: 'F2 · Porte-fusibles gPV string 2', key: 'dcfuse', rail: 0, x: 112, rep: 'F2' },
    { id: 'q1', label: 'Q1 · Interrupteur-sectionneur DC 1000 V', key: 'dcswitch', rail: 0, x: 172, rep: 'Q1' },
    { id: 'spd', label: 'F3 · Parafoudre DC type 2', key: 'dcspd', rail: 0, x: 232, rep: 'F3' },
    // rail 2 · onduleur et coffret alternatif
    { id: 'ond', label: 'U1 · Onduleur string 3 kVA', key: 'onduleur', rail: 1, x: 52, rep: 'U1' },
    { id: 'spa', label: 'F4 · Parafoudre AC type 2', key: 'l_modulair_parafoudre', rail: 1, x: 172, rep: 'F4' },
    { id: 'f2', label: 'Q2 · Disjoncteur AC 16 A courbe C', key: 'mcb2p', rail: 1, x: 208, rep: 'Q2' },
    { id: 'f3', label: 'DDR1 · Différentiel 30 mA type A', key: 'l_protecti_disjoncteur_diff_a', rail: 1, x: 268, rep: 'DDR1' },
    // rail 3 · branchement, comptage et borniers
    { id: 'agcp', label: 'Q0 · Disjoncteur de branchement', key: 'agcp', rail: 2, x: 52, rep: 'Q0' },
    { id: 'cpt', label: 'C1 · Compteur de production', key: 'l_autres_compteur_electronique', rail: 2, x: 126, rep: 'C1' },
    ...bornierDC(232, [
      ['termred', '1', '+S1'], ['termblue', '2', '−S1'],
      ['termred', '3', '+S2'], ['termblue', '4', '−S2'],
      ['earth', '5', 'PE'],
    ]),
    ...bornierAC(326, [['termred', '1', 'L'], ['termblue', '2', 'N'], ['earth', '3', 'PE']]),
  ],
  annexItems: ROOF,
  recvItems: RECV,
  liaisons: [
    // ---- toiture : couplage série des strings et descente (câblage installateur)
    ...[1, 2, 3, 4, 5].map((i) => L(`PV${i}.X2`, `PV${i + 1}.X1`, 'DC+', 'pre')),
    ...[7, 8, 9, 10, 11].map((i) => L(`PV${i}.X2`, `PV${i + 1}.X1`, 'DC+', 'pre')),
    L('PV1.X1', 'x2_1.b', 'DC+', 'pre'), L('PV6.X2', 'x2_2.b', 'DC-', 'pre'),
    L('PV7.X1', 'x2_3.b', 'DC+', 'pre'), L('PV12.X2', 'x2_4.b', 'DC-', 'pre'),
    L('MT.X1', 'x2_5.b', 'PE', 'pre'),
    // ---- arrivée du réseau (câblage du distributeur)
    L('RES.L1', 'agcp.1', 'L1', 'pre'), L('RES.N', 'agcp.3', 'N', 'pre'), L('RES.PE', 'x1_3.b', 'PE', 'pre'),
    // ---- coffret continu : bornier → fusibles → sectionneur → parafoudre → onduleur
    L('x2_1.a', 'f1.1+', 'DC+'), L('x2_2.a', 'f1.3−', 'DC-'),
    L('x2_3.a', 'fus2.1+', 'DC+'), L('x2_4.a', 'fus2.3−', 'DC-'),
    L('f1.2+', 'q1.1+', 'DC+'), L('f1.4−', 'q1.3−', 'DC-'),
    L('fus2.2+', 'q1.1+', 'DC+'), L('fus2.4−', 'q1.3−', 'DC-'),
    L('q1.2+', 'spd.+', 'DC+'), L('q1.4−', 'spd.−', 'DC-'), L('spd.PE', 'x2_5.a', 'PE'),
    L('q1.2+', 'ond.DC+', 'DC+'), L('q1.4−', 'ond.DC−', 'DC-'),
    // ---- coffret alternatif : onduleur → parafoudre → disjoncteur → différentiel
    L('ond.L', 'f2.2', 'L1'), L('ond.N', 'f2.N2', 'N'), L('ond.PE', 'x1_3.a', 'PE'),
    L('spa.1', 'f2.2', 'L1'), L('spa.2', 'x1_3.a', 'PE'),
    L('f2.1', 'f3.2', 'L1'), L('f2.N', 'f3.4', 'N'),
    L('f3.1', 'x1_1.a', 'L1'), L('f3.3', 'x1_2.a', 'N'),
    // ---- comptage de production et injection en aval de l'AGCP
    L('x1_1.b', 'cpt.2', 'L1'), L('x1_2.b', 'cpt.4', 'N'),
    L('cpt.1', 'agcp.2', 'L1'), L('cpt.3', 'agcp.4', 'N'),
    // ---- mise à la terre des masses continues
    L('x2_5.a', 'x1_3.a', 'PE'),
  ],
  nets: {
    // ---- champ photovoltaïque : sous tension dès qu'il fait jour
    ...stringNets(1, 6),
    ...stringNets(7, 12),
    'MT.X1': { net: 'PE', live: 'always' }, 'MT.X2': { net: 'PE', live: 'always' },
    // ---- bornier continu
    'x2_1.a': { net: 'V', live: 'always' }, 'x2_1.b': { net: 'V', live: 'always' },
    'x2_2.a': { net: 'C0', live: 'always' }, 'x2_2.b': { net: 'C0', live: 'always' },
    'x2_3.a': { net: 'V', live: 'always' }, 'x2_3.b': { net: 'V', live: 'always' },
    'x2_4.a': { net: 'C0', live: 'always' }, 'x2_4.b': { net: 'C0', live: 'always' },
    'x2_5.a': { net: 'PE', live: 'always' }, 'x2_5.b': { net: 'PE', live: 'always' },
    // ---- fusibles de string (toujours alimentés par le champ)
    'f1.1+': { net: 'V', live: 'always' }, 'f1.2+': { net: 'V', live: 'always' },
    'f1.3−': { net: 'C0', live: 'always' }, 'f1.4−': { net: 'C0', live: 'always' },
    'fus2.1+': { net: 'V', live: 'always' }, 'fus2.2+': { net: 'V', live: 'always' },
    'fus2.3−': { net: 'C0', live: 'always' }, 'fus2.4−': { net: 'C0', live: 'always' },
    // ---- interrupteur-sectionneur : l'aval est hors tension quand Q1 est ouvert
    'q1.1+': { net: 'V', live: 'always' }, 'q1.3−': { net: 'C0', live: 'always' },
    'q1.2+': { net: 'V', live: 'q1' }, 'q1.4−': { net: 'C0', live: 'q1' },
    'spd.+': { net: 'V', live: 'q1' }, 'spd.−': { net: 'C0', live: 'q1' },
    'spd.PE': { net: 'PE', live: 'always' },
    // ---- onduleur
    'ond.DC+': { net: 'V', live: 'q1' }, 'ond.DC−': { net: 'C0', live: 'q1' },
    'ond.L': { net: 'L1', live: 'ctl' }, 'ond.N': { net: 'N', live: 'always' },
    'ond.PE': { net: 'PE', live: 'always' },
    // ---- coffret alternatif
    'spa.1': { net: 'L1', live: 'ctl' }, 'spa.2': { net: 'PE', live: 'always' },
    'f2.1': { net: 'L1', live: 'ctl' }, 'f2.2': { net: 'L1', live: 'ctl' },
    'f2.N': { net: 'N', live: 'always' }, 'f2.N2': { net: 'N', live: 'always' },
    'f3.1': { net: 'L1', live: 'always' }, 'f3.3': { net: 'N', live: 'always' },
    'f3.2': { net: 'L1', live: 'ctl' }, 'f3.4': { net: 'N', live: 'always' },
    // ---- bornier alternatif, comptage et branchement
    'x1_1.a': { net: 'L1', live: 'always' }, 'x1_1.b': { net: 'L1', live: 'always' },
    'x1_2.a': { net: 'N', live: 'always' }, 'x1_2.b': { net: 'N', live: 'always' },
    'x1_3.a': { net: 'PE', live: 'always' }, 'x1_3.b': { net: 'PE', live: 'always' },
    'cpt.1': { net: 'L1', live: 'always' }, 'cpt.2': { net: 'L1', live: 'always' },
    'cpt.3': { net: 'N', live: 'always' }, 'cpt.4': { net: 'N', live: 'always' },
    'agcp.1': { net: 'L1', live: 'always' }, 'agcp.2': { net: 'L1', live: 'always' },
    'agcp.3': { net: 'N', live: 'always' }, 'agcp.4': { net: 'N', live: 'always' },
    // ---- charges du logement
    'CE.X1': { net: 'L1', live: 'always' }, 'CE.X2': { net: 'N', live: 'always' },
    'R1.X1': { net: 'L1', live: 'always' }, 'R1.X2': { net: 'N', live: 'always' },
    'E1.X1': { net: 'L1', live: 'always' }, 'E1.X2': { net: 'N', live: 'always' },
  },
  tests: [
    ...BASE_TESTS,
    {
      id: 'pol',
      title: 'Contrôle de polarité des strings',
      how: 'Sectionneur Q1 ouvert, multimètre en tension continue au bornier X2 : pointe rouge sur le +, pointe noire sur le −, pour chaque string.',
      expected: 'valeur positive ≈ 228 V sur les deux strings, écart inférieur à 5 %',
    },
    {
      id: 'isodc',
      title: 'Isolement du champ sous 500 V',
      how: 'Sectionneur Q1 ouvert et strings déconnectés de l\'onduleur, contrôleur en RISO 500 V entre DC+ et PE, puis entre DC− et PE.',
      expected: '≥ 1 MΩ pour un champ dont Uoc est inférieure à 500 V (UTE C 15-712-1)',
    },
    {
      id: 'eqp',
      title: 'Continuité de la liaison équipotentielle des masses',
      how: 'Contrôleur en RPE 200 mA entre la barrette de terre des cadres en toiture (MT) et la borne X2:5 du coffret continu.',
      expected: '< 2 Ω, conducteur 6 mm² vert-jaune sans interruption',
    },
    {
      id: 'arc',
      title: 'Connecteurs MC4 et risque de défaut d\'arc',
      how: 'Contrôle visuel de chaque connecteur : même marque des deux côtés, verrouillage entendu, sertissage contrôlé, aucune trace de brunissement ni de fusion.',
      expected: 'connecteurs appairés et verrouillés, aucun échauffement',
    },
  ],
  mesures: [
    {
      id: 'rpe', title: 'Continuité de la liaison équipotentielle (MT → X2:5)', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RPE 200 mA', a: 'MT.X1', b: 'x2_5.a', min: 0, max: 2, unit: 'Ω',
    },
    {
      id: 'riso', title: 'Isolement DC+ / PE sous 500 V à l\'entrée de l\'onduleur', stage: 'horsTension',
      instrument: 'ctrl', dial: 'RISO 500 V', a: 'ond.DC+', b: 'ond.PE', min: 0.5, max: 9999, unit: 'MΩ',
    },
    {
      id: 'uoc1', title: 'Tension à vide du string 1 au bornier X2 (≈ 228 V)', stage: 'horsTension',
      instrument: 'mm', dial: 'V~', a: 'x2_1.a', b: 'x2_2.a', min: 200, max: 250, unit: 'V',
    },
    {
      id: 'uoc2', title: 'Tension à vide du string 2 au bornier X2 (≈ 228 V)', stage: 'horsTension',
      instrument: 'mm', dial: 'V~', a: 'x2_3.a', b: 'x2_4.a', min: 200, max: 250, unit: 'V',
    },
    {
      id: 'udc', title: 'Tension continue à l\'entrée de l\'onduleur, Q1 fermé', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'ond.DC+', b: 'ond.DC−', min: 200, max: 250, unit: 'V', when: 'ctl',
    },
    {
      id: 'uac', title: 'Tension alternative en sortie d\'onduleur', stage: 'sousTension',
      instrument: 'mm', dial: 'V~', a: 'ond.L', b: 'ond.N', min: 207, max: 253, unit: 'V', when: 'ctl',
    },
    {
      id: 'idc', title: 'Courant du string 1 à la pince (F1:2+ → Q1:1+)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'f1.2+>q1.1+', min: 1, max: 5, unit: 'A', when: 'run',
    },
    {
      id: 'iac', title: 'Courant injecté à la pince (DDR1:1 → X1:1)', stage: 'sousTension',
      instrument: 'clamp', dial: 'A~', wire: 'f3.1>x1_1.a', min: 1, max: 5, unit: 'A', when: 'run',
    },
  ],
  faults: [
    {
      id: 'x2',
      title: 'Conducteur DC− non serré dans le bornier de l\'onduleur',
      symptom: 'Q1, Q2 et DDR1 sont fermés, 228 V se lisent au coffret continu, mais l\'onduleur ne se couple jamais et H1 reste éteint.',
      fix: 'Reprendre le serrage de la borne DC− de l\'onduleur, puis contrôler la tension entre DC+ et DC− à son entrée.',
    },
    {
      id: 'a2',
      title: 'Neutre alternatif mal serré sur l\'onduleur',
      symptom: 'L\'onduleur démarre, se couple une seconde puis se découple aussitôt, en boucle : la tension réseau qu\'il mesure s\'effondre à chaque couplage.',
      fix: 'Resserrer la borne N de l\'onduleur et contrôler la continuité du neutre jusqu\'au différentiel.',
    },
    {
      id: 'f3',
      title: 'Différentiel DDR1 déclenché par un défaut d\'isolement côté alternatif',
      symptom: 'La manette de DDR1 paraît en position fermée, mais aucune tension n\'est mesurée en aval : l\'onduleur ne peut pas se coupler.',
      fix: 'Rechercher le défaut d\'isolement du départ alternatif, puis réarmer franchement le différentiel après l\'avoir ouvert.',
    },
  ],
  quiz: [
    {
      q: 'Pourquoi corrige-t-on la tension Voc du champ à −10 °C avant de choisir l\'onduleur ?',
      options: [
        'Parce que la tension d\'un module augmente quand la température baisse',
        'Parce que le courant augmente au froid',
        'Parce que le rendement de l\'onduleur baisse au froid',
      ],
      answer: 0,
    },
    {
      q: 'Quel calibre de fusible gPV pour un string dont Isc vaut 8,8 A ?',
      options: ['10 A', '15 A', '32 A'],
      answer: 1,
    },
    {
      q: 'Dans quel ordre manœuvre-t-on une installation photovoltaïque raccordée au réseau ?',
      options: [
        'Alternatif puis continu à la mise en marche, continu puis alternatif à l\'arrêt',
        'Continu puis alternatif à la mise en marche, alternatif puis continu à l\'arrêt',
        'L\'ordre est indifférent, l\'onduleur gère seul',
      ],
      answer: 1,
    },
  ],
  motor: null,
  hasMotor: false,
};
