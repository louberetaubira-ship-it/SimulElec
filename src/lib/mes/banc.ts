/**
 * Banc de mesure du parcours « mise en service » : l'installation dessinée avec
 * ses vraies bornes, les cordons du contrôleur et les préparations à faire.
 *
 * L'élève pose lui-même les cordons ; `mesurer()` déduit de leur place ce qui
 * est mesuré (le point du tableau), la valeur lue et, si le branchement ou la
 * préparation est faux, une lecture fausse et une erreur comptée.
 */

import { MES, MESURES, positionOf, valeurLue, type Position } from './miseEnService';

export type CordId = 'r' | 'v' | 'b' | 'E' | 'S' | 'H' | 'P';

export interface Cordon { id: CordId; label: string; couleur: string }

const ROUGE = '#d6453d', VERT = '#1e9e5a', BLEU = '#2c6fd6';

export const CORDONS: Record<CordId, Cordon> = {
  r: { id: 'r', label: 'Rouge', couleur: ROUGE },
  v: { id: 'v', label: 'Vert', couleur: VERT },
  b: { id: 'b', label: 'Bleu', couleur: BLEU },
  E: { id: 'E', label: 'E', couleur: VERT },
  S: { id: 'S', label: 'S', couleur: BLEU },
  H: { id: 'H', label: 'H', couleur: ROUGE },
  P: { id: 'P', label: 'Fiche 2P+T', couleur: '#1b222c' },
};

/**
 * Borne logique d'un banc. `t` : borne réelle du coffret (identifiant du moteur
 * de scène, ex. `M.PE`, `q0.2`) ; ou `rel` + `dx`/`dy` : point ajouté par le
 * banc, placé par rapport à une borne réelle (masse sans borne dessinée,
 * piquet auxiliaire) — il suit la scène si la géométrie change.
 */
export interface Borne {
  id: string; label: string; t?: string;
  /** Point ajouté : décalé de (dx, dy) par rapport à la borne réelle `rel`. */
  rel?: string; dx?: number; dy?: number;
  dessin?: 'porte' | 'plaque' | 'tuyau' | 'garde' | 'piquet';
}

/** Préparation à faire sur le matériel (clic sur la zone de l'appareil). */
export interface ActionBanc {
  id: string;
  label: string;
  /** Libellé une fois faite. */
  fait: string;
  /** Bornes réelles qui délimitent la zone (boîte englobante + marge), ou boîte fixe. */
  autour?: string[];
  box?: { x: number; y: number; w: number; h: number };
}

export interface Banc {
  cordons: CordId[];
  bornes: Borne[];
  actions: ActionBanc[];
  /** Consigne affichée au-dessus du banc. */
  consigne: string;
  /** Q0 fermé (mesures sous tension) ou ouvert et consigné. */
  sousTension: boolean;
}

/** Bornes en aval de Q0 (départs L1 L2 L3 N). */
const AVAL_Q0: Borne[] = [
  { id: 'L1', label: 'Q0 · 2 (L1)', t: 'q0.2' },
  { id: 'L2', label: 'Q0 · 4 (L2)', t: 'q0.4' },
  { id: 'L3', label: 'Q0 · 6 (L3)', t: 'q0.6' },
  { id: 'N', label: 'Q0 · N', t: 'q0.N2' },
];

/** Bornes du conducteur de protection au bornier X1 : la barrette de terre de l'armoire. */
export const BORNES_PE = ['x1_5.a', 'x1_5.b', 'x1_9.a', 'x1_9.b'];

export const BANCS: Partial<Record<number, Banc>> = {
  [MES.CONT]: {
    cordons: ['r', 'v'],
    sousTension: false,
    consigne: 'Position RLO. Zéro des cordons : pose les deux cordons sur la même borne, puis ZÉRO. Ensuite vert sur la borne PE du bornier X1, rouge sur chaque masse.',
    bornes: [
      { id: 'bar', label: 'X1 · PE', t: 'x1_5.a' },
      { id: 'porte', label: 'Porte · tresse', rel: 'S2.14', dx: -18, dy: 70, dessin: 'porte' },
      { id: 'plaque', label: 'Plaque de fond', rel: 't1.PE', dx: 205, dy: 0, dessin: 'plaque' },
      { id: 't1', label: 'T1 · masse', t: 't1.PE' },
      { id: 'pc1', label: 'PC1 · terre', t: 'PC1.PE' },
      { id: 'm1', label: 'M1 · carcasse', t: 'M.PE' },
      { id: 'canal', label: 'Canalisation', rel: 'E1.PE', dx: 0, dy: 100, dessin: 'tuyau' },
      { id: 'garde', label: 'Garde-corps', rel: 'PC1.PE', dx: 30, dy: 100, dessin: 'garde' },
      { id: 'e1', label: 'E1 · masse', t: 'E1.PE' },
    ],
    actions: [],
  },
  [MES.ISO_I]: {
    cordons: ['r', 'v'],
    sousTension: false,
    consigne: 'Position RISO, Q0 et KM1 ouverts. Débranche d\'abord le primaire de T1 (clic sur ses bornes 0 · 400), puis mesure chaque couple de bornes en aval de Q0.',
    bornes: AVAL_Q0,
    actions: [{ id: 't1', label: 'Débrancher le primaire de T1', fait: 'Primaire de T1 débranché', autour: ['t1.0', 't1.400'] }],
  },
  [MES.ISO_M]: {
    cordons: ['r', 'v'],
    sousTension: false,
    consigne: 'Position RISO. Retire d\'abord les barrettes de couplage sur la plaque à bornes, puis mesure chaque enroulement vers la carcasse (PE) et les enroulements entre eux.',
    bornes: [
      { id: 'U1', label: 'U1', t: 'M.U1' }, { id: 'V1', label: 'V1', t: 'M.V1' }, { id: 'W1', label: 'W1', t: 'M.W1' },
      { id: 'W2', label: 'W2', t: 'M.W2' }, { id: 'U2', label: 'U2', t: 'M.U2' }, { id: 'V2', label: 'V2', t: 'M.V2' },
      { id: 'PE', label: 'PE carcasse', t: 'M.PE' },
    ],
    actions: [{ id: 'barrettes', label: 'Retirer les barrettes', fait: 'Barrettes retirées', autour: ['M.W2', 'M.V2'] }],
  },
  [MES.TERRE]: {
    cordons: ['E', 'S', 'H'],
    sousTension: false,
    consigne: 'Position RE. Ouvre la barrette de coupure BC1, puis E sur le piquet de terre PT1, S sur le piquet auxiliaire à 20 m, H sur celui à 40 m.',
    bornes: [
      { id: 'pt1', label: 'PT1', t: 'PT1.X1' },
      { id: 'bar', label: 'BC1', t: 'BC1.X1' },
      { id: 's20', label: 'Piquet S · 20 m', rel: 'PT1.X1', dx: 95, dy: 20, dessin: 'piquet' },
      { id: 'h40', label: 'Piquet H · 40 m', rel: 'PT1.X1', dx: 185, dy: 20, dessin: 'piquet' },
    ],
    actions: [{ id: 'bc1', label: 'Ouvrir BC1', fait: 'BC1 ouverte', autour: ['BC1.X1', 'BC1.X2'] }],
  },
  [MES.TENS]: {
    cordons: ['r', 'b'],
    sousTension: true,
    consigne: 'Position V. Rouge et bleu sur les bornes en aval de Q0 : chaque phase avec le neutre, puis les phases entre elles.',
    bornes: AVAL_Q0,
    actions: [],
  },
  [MES.DDR]: {
    cordons: ['P'],
    sousTension: true,
    consigne: 'Appuie d\'abord sur le bouton TEST de Q2. Branche ensuite la fiche du contrôleur sur la prise PC1, protégée par Q2 : seuil IΔN, puis temps ΔT à ×1 et à ×5.',
    bornes: [
      { id: 'pc1', label: 'PC1', t: 'PC1.X1' },
      { id: 'pc1', label: 'PC1', t: 'PC1.X2' },
      { id: 'pc1', label: 'PC1', t: 'PC1.PE' },
    ],
    actions: [{ id: 'testq2', label: 'TEST de Q2', fait: 'Q2 a déclenché', autour: ['q2.1', 'q2.2'] }],
  },
  [MES.PHASES]: {
    cordons: ['r', 'v', 'b'],
    sousTension: true,
    consigne: 'Position ⟳. Rouge sur L1, vert sur L2, bleu sur L3, en aval de Q0.',
    bornes: AVAL_Q0,
    actions: [],
  },
};

/** Borne logique posée sur une borne réelle du coffret (ou l'identifiant brut, préfixé). */
export function logique(step: number, termId: string): string {
  const b = BANCS[step];
  if (step === MES.CONT && BORNES_PE.includes(termId)) return 'bar';
  const x = b?.bornes.find((y) => y.t === termId || (!y.t && y.id === termId));
  return x ? x.id : `T:${termId}`;
}

/** Libellé lisible d'une borne logique. */
export function libelle(step: number, id: string): string {
  const x = BANCS[step]?.bornes.find((y) => y.id === id);
  return x ? x.label : id.replace(/^T:/, '');
}

/** Position attendue pour l'étape (la DDR accepte IΔN et ΔT). */
const posAttendues = (step: number): Position[] =>
  step === MES.DDR ? ['IDN', 'DT'] : MESURES[step] ? [MESURES[step]!.pos] : [];

export interface Lcd { v: string; unite: string; sub: string }

export interface ResultatMesure {
  lcd: Lcd;
  /** Point du tableau à enregistrer (branchement et préparation corrects). */
  point?: string;
  valeur?: number | string;
  /** Erreur de méthode comptée. */
  erreur: boolean;
  msg: string;
}

const paire = (a?: string, b?: string) => (a && b ? [a, b].sort().join('-') : '');
const vide = (sub = ''): Lcd => ({ v: '- - -', unite: '', sub });
const aff = (v: number | string, unite: string, sub = ''): Lcd => ({
  v: typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)).replace('.', ',') : v, unite, sub,
});

/** Résistance des cordons comptée tant que le zéro n'est pas fait. */
export const R_CORDONS = 0.35;

/**
 * Mesure au contrôleur. `conn` : borne sous chaque cordon ; `prep` : préparations
 * faites ; `mult` : multiple de IΔn pour ΔT.
 */
export function mesurer(
  step: number,
  conn: Partial<Record<CordId, string>>,
  prep: string[],
  pos: Position,
  mult: 1 | 5,
  levee: boolean,
): ResultatMesure {
  const e = MESURES[step];
  if (!e) return { lcd: vide(), erreur: false, msg: '' };
  if (!posAttendues(step).includes(pos)) {
    return { lcd: vide(positionOf(pos).fonction), erreur: true, msg: `Position ${positionOf(pos).symbole} : l'appareil ne mesure pas la grandeur demandée à cette étape. Erreur comptée.` };
  }
  const val = (id: string) => valeurLue(step, id, levee)!;
  const bad = (msg: string, lcd = vide()): ResultatMesure => ({ lcd, erreur: true, msg });
  /** Branchement incomplet : rien n'est mesuré, pas d'erreur comptée. */
  const info = (msg: string): ResultatMesure => ({ lcd: vide(), erreur: false, msg });

  switch (step) {
    case MES.CONT: {
      const { r, v } = conn;
      if (!r || !v) return info('Place les deux cordons avant de lancer la mesure.');
      if (r === v) return { lcd: aff(prep.includes('zero') ? 0 : R_CORDONS, 'Ω', 'cordons en court-circuit'), erreur: false, msg: prep.includes('zero') ? 'Cordons en court-circuit : 0,00 Ω, le zéro est bon.' : `Cordons en court-circuit : ${R_CORDONS.toFixed(2).replace('.', ',')} Ω, c'est la résistance des cordons. Fais le ZÉRO.` };
      if (r !== 'bar' && v !== 'bar') return bad('Aucun cordon sur la barrette de terre : cette mesure ne dit rien de la liaison à la terre. Erreur comptée.');
      const m = r === 'bar' ? v : r;
      if (!MESURES[step]!.points.some((p) => p.id === m)) {
        return info('Cette borne n\'est pas une masse à contrôler : pose le cordon rouge sur une masse (T1, PC1, M1, E1, porte, plaque, canalisation, garde-corps).');
      }
      const brut = val(m);
      if (!prep.includes('zero')) {
        const lu = typeof brut === 'number' ? brut + R_CORDONS : brut;
        return bad('Zéro des cordons non fait : la valeur lue comprend la résistance des cordons. Fais le ZÉRO, puis refais la mesure. Erreur comptée.', aff(lu, 'Ω'));
      }
      return { lcd: aff(brut, 'Ω'), point: m, valeur: brut, erreur: false, msg: brut === 'OL' ? 'OL : résistance infinie, cette masse n\'est reliée à rien.' : 'Lecture enregistrée.' };
    }
    case MES.ISO_I: {
      const k = paire(conn.r, conn.v);
      if (!k) return info('Place les deux cordons avant de lancer la mesure.');
      if (conn.r === conn.v) return bad('Les deux cordons sont sur la même borne : rien n\'est mesuré.', aff(0, 'MΩ'));
      if (k === 'L1-L2' && !prep.includes('t1')) {
        return bad('0,01 MΩ : le primaire de T1 relie L1 et L2 par son bobinage. Débranche-le avant de mesurer. Erreur comptée.', aff(0.01, 'MΩ', '500 V DC'));
      }
      const map: Record<string, string> = { 'L1-N': 'l1n', 'L2-N': 'l2n', 'L3-N': 'l3n', 'L1-L2': 'l1l2', 'L1-L3': 'l1l3', 'L2-L3': 'l2l3' };
      const p = map[k];
      return { lcd: aff(val(p), 'MΩ', '500 V DC'), point: p, valeur: val(p), erreur: false, msg: 'Lecture enregistrée.' };
    }
    case MES.ISO_M: {
      const { r, v } = conn;
      if (!r || !v) return info('Place les deux cordons avant de lancer la mesure.');
      if (r === v) return bad('Les deux cordons sont sur la même borne : rien n\'est mesuré.', aff(0, 'MΩ'));
      const k = paire(r, v);
      const enr = (b: string) => b.slice(0, 1); // U, V ou W
      if (!k.includes('PE') && enr(r) === enr(v)) {
        return bad('Les deux bornes appartiennent au même enroulement : c\'est une continuité (quelques ohms), pas un isolement.', aff(0, 'MΩ'));
      }
      if (!k.includes('PE') && !prep.includes('barrettes')) {
        return bad('0,00 MΩ : les barrettes de couplage relient les enroulements entre eux. Retire-les avant de mesurer. Erreur comptée.', aff(0, 'MΩ', '500 V DC'));
      }
      const map: Record<string, string> = { 'PE-U2': 'u2pe', 'PE-V2': 'v2pe', 'PE-W2': 'w2pe', 'U2-V1': 'u2v1', 'V2-W1': 'w1v2', 'U1-W1': 'u1w1' };
      const p = map[k];
      if (!p) return { lcd: vide(), erreur: false, msg: 'Ce couple de bornes ne fait pas partie des mesures demandées : relis le tableau.' };
      return { lcd: aff(val(p), 'MΩ', '500 V DC'), point: p, valeur: val(p), erreur: false, msg: 'Lecture enregistrée.' };
    }
    case MES.TERRE: {
      const { E, S, H } = conn;
      if (!E || !S || !H) return info('Branche les trois cordons E, S et H avant de lancer la mesure.');
      if (E !== 'pt1' || S !== 's20' || H !== 'h40') {
        return bad('Branchement faux : E sur la prise de terre mesurée, S sur le piquet intermédiaire, H sur le piquet le plus éloigné. Erreur comptée.');
      }
      if (!prep.includes('bc1')) {
        return bad('2,1 Ω : barrette BC1 fermée, tu mesures la terre en parallèle avec toute l\'installation. Ouvre BC1. Erreur comptée.', aff(2.1, 'Ω'));
      }
      return { lcd: aff(val('ra'), 'Ω'), point: 'ra', valeur: val('ra'), erreur: false, msg: 'Lecture enregistrée.' };
    }
    case MES.TENS: {
      const k = paire(conn.r, conn.b);
      if (!k) return info('Place les deux cordons avant de lancer la mesure.');
      if (conn.r === conn.b) return bad('Les deux cordons sont sur la même borne : 0 V.', aff(0, 'V'));
      const map: Record<string, string> = { 'L1-N': 'l1n', 'L2-N': 'l2n', 'L3-N': 'l3n', 'L1-L2': 'l1l2', 'L1-L3': 'l1l3', 'L2-L3': 'l2l3' };
      const p = map[k];
      return { lcd: aff(val(p), 'V', `${String(val('f')).replace('.', ',')} Hz`), point: p, valeur: val(p), erreur: false, msg: 'Lecture enregistrée (la fréquence aussi).' };
    }
    case MES.DDR: {
      if (!conn.P) return info('Branche la fiche du contrôleur sur une prise avant de lancer l\'essai.');
      if (conn.P !== 'pc1') return bad('La fiche du contrôleur se branche sur une prise : ici PC1, la prise protégée par Q2. Erreur comptée.');
      if (pos === 'IDN') return { lcd: aff(val('idn'), 'mA', 'rampe · Q2 déclenche'), point: 'idn', valeur: val('idn'), erreur: false, msg: 'Seuil enregistré. Réarme Q2.' };
      const p = mult === 1 ? 'dt1' : 'dt5';
      return { lcd: aff(val(p), 'ms', `${mult === 1 ? '30' : '150'} mA · Q2 déclenche`), point: p, valeur: val(p), erreur: false, msg: `Temps à ${mult === 1 ? 'IΔn' : '5 × IΔn'} enregistré. Réarme Q2.` };
    }
    case MES.PHASES: {
      const { r, v, b } = conn;
      if (!r || !v || !b) return info('Branche les trois cordons avant de lancer la mesure.');
      if (new Set([r, v, b]).size < 3 || [r, v, b].includes('N')) return bad('Chaque cordon doit être sur une phase différente (pas sur le neutre). Erreur comptée.');
      // phase réelle présente sur chaque borne : L2 et L3 permutées tant que la réserve n'est pas levée
      const reelle: Record<string, string> = levee ? { L1: '1', L2: '2', L3: '3' } : { L1: '1', L2: '3', L3: '2' };
      const lu = reelle[r] + reelle[v] + reelle[b];
      const lcd = aff(lu.split('').join('-'), '', lu === '123' ? 'sens direct' : 'sens inverse');
      if (r !== 'L1' || v !== 'L2' || b !== 'L3') {
        return bad('Cordons croisés : l\'ordre lu dépend de l\'ordre des cordons. Rouge sur L1, vert sur L2, bleu sur L3. Erreur comptée.', lcd);
      }
      return { lcd, point: 'rot', valeur: lu, erreur: false, msg: lu === '123' ? 'Sens direct : lecture enregistrée.' : 'Sens inverse : lecture enregistrée.' };
    }
    default:
      return { lcd: vide(), erreur: false, msg: '' };
  }
}
