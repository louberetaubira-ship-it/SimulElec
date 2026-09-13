/**
 * Plaque à bornes du moteur : ce que lit un ohmmètre entre deux bornes.
 *
 * Un enroulement, ce sont ses deux extrémités : U1–U2, V1–V2, W1–W2. Toute autre paire ne
 * conduit que si les barrettes de couplage la relient — c'est bien pour ça que l'élève pose
 * ses barrettes lui-même. On ne peut donc pas répondre par une constante : il faut résoudre
 * le réseau tel qu'il est à cet instant.
 *
 * Repères normalisés et couplages (voir `docs/maquettes/plaque-a-bornes-ohmmetre.html`) :
 *
 *   rangée haute   W2   U2   V2
 *   rangée basse   U1   V1   W1
 *
 * - barrettes retirées : U1–U2 = R, toute autre paire = circuit ouvert ;
 * - étoile   : barrettes W2–U2 et U2–V2 (le point neutre) ; entre deux bornes de ligne : 2 R ;
 * - triangle : barrettes W2–U1, U2–V1, V2–W1 ; entre deux bornes de ligne : ⅔ R.
 *
 * Les rapports 2 R et ⅔ R sortent du calcul ci-dessous ; ils recoupent la règle usuelle de
 * contrôle des machines (résistance de ligne = 2 × résistance de phase en étoile, ⅔ × en
 * triangle).
 */

/** Les six bornes de la plaque, dans l'ordre normalisé. */
export const BORNES_MOTEUR = ['M.W2', 'M.U2', 'M.V2', 'M.U1', 'M.V1', 'M.W1'] as const;

/** Les trois enroulements, par leurs deux extrémités. */
export const ENROULEMENTS: readonly (readonly [string, string])[] = [
  ['M.U1', 'M.U2'], ['M.V1', 'M.V2'], ['M.W1', 'M.W2'],
];

export const estBorneMoteur = (id: string | null | undefined): boolean =>
  id != null && (BORNES_MOTEUR as readonly string[]).includes(id);

/** Les deux bornes sont-elles les extrémités d'un même enroulement ? */
export const estEnroulement = (a: string, b: string): boolean =>
  ENROULEMENTS.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));

/** Fusion des bornes reliées par une barrette (union-find). */
function racines(barrettes: readonly (readonly [string, string])[]): Record<string, string> {
  const p: Record<string, string> = {};
  for (const b of BORNES_MOTEUR) p[b] = b;
  const find = (x: string): string => {
    let r = x;
    while (p[r] !== r) { p[r] = p[p[r]]; r = p[r]; }
    return r;
  };
  for (const [a, b] of barrettes) {
    if (p[a] === undefined || p[b] === undefined) continue;
    p[find(a)] = find(b);
  }
  const out: Record<string, string> = {};
  for (const b of BORNES_MOTEUR) out[b] = find(b);
  return out;
}

/**
 * Nœuds atteignables depuis `depart` en traversant les enroulements.
 *
 * La matrice de conductance ne doit porter QUE sur cette composante. Montée sur les six
 * bornes, elle est singulière dès qu'un enroulement flotte — barrettes retirées, V et W ne
 * touchent rien — et la résolution échoue alors même que le circuit mesuré, lui, est bon.
 * Un ohmmètre réel ne voit que ce qui pend à ses deux pointes ; celui-ci fait pareil.
 */
function composante(f: Record<string, string>, depart: string): string[] {
  const vus = [depart];
  const pile = [depart];
  while (pile.length) {
    const n = pile.pop() as string;
    for (const e of ENROULEMENTS) {
      const x = f[e[0]], y = f[e[1]];
      if (x === n && !vus.includes(y)) { vus.push(y); pile.push(y); }
      if (y === n && !vus.includes(x)) { vus.push(x); pile.push(x); }
    }
  }
  return vus;
}

/** Élimination de Gauss avec pivot partiel. `null` si le système est singulier. */
function gauss(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    if (Math.abs(A[piv][i]) < 1e-12) return null;
    [A[i], A[piv]] = [A[piv], A[i]];
    [b[i], b[piv]] = [b[piv], b[i]];
    for (let r = i + 1; r < n; r++) {
      const k = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= k * A[i][c];
      b[r] -= k * b[i];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

/**
 * Résistance lue entre deux bornes de la plaque.
 *
 * @param r          résistance d'un enroulement (Ω), déduite de la plaque signalétique
 * @param barrettes  paires de bornes reliées par une barrette *effectivement posée*
 * @returns          la valeur en ohms, `0` sur une barrette, `null` si le circuit est ouvert
 */
export function resistancePlaque(
  r: number,
  barrettes: readonly (readonly [string, string])[],
  a: string,
  b: string,
): number | null {
  if (!estBorneMoteur(a) || !estBorneMoteur(b) || a === b) return null;
  const f = racines(barrettes);
  if (f[a] === f[b]) return 0;

  const noeuds = composante(f, f[a]);
  if (!noeuds.includes(f[b])) return null;

  const idx: Record<string, number> = {};
  noeuds.forEach((n, i) => { idx[n] = i; });
  const n = noeuds.length;

  const G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const I = new Array<number>(n).fill(0);
  for (const e of ENROULEMENTS) {
    const x = idx[f[e[0]]], y = idx[f[e[1]]];
    if (x === undefined || y === undefined || x === y) continue;
    const g = 1 / r;
    G[x][x] += g; G[y][y] += g; G[x][y] -= g; G[y][x] -= g;
  }
  I[idx[f[a]]] = 1;
  I[idx[f[b]]] = -1;

  // potentiel du nœud b ancré à zéro : on retire sa ligne et sa colonne
  const ref = idx[f[b]];
  const m: number[][] = [];
  const rhs: number[] = [];
  const carte: number[] = [];
  for (let row = 0; row < n; row++) {
    if (row === ref) continue;
    const ligne: number[] = [];
    for (let col = 0; col < n; col++) if (col !== ref) ligne.push(G[row][col]);
    m.push(ligne); rhs.push(I[row]); carte.push(row);
  }
  const v = gauss(m, rhs);
  if (!v) return null;
  const ia = carte.indexOf(idx[f[a]]);
  return ia < 0 ? 0 : Math.round(v[ia] * 100) / 100;
}
