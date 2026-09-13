/**
 * Couplage de la plaque à bornes, DÉDUIT des barrettes posées par l'élève.
 *
 * Les barrettes n'apparaissent plus d'office sur la boîte à bornes et aucun bouton ne donne
 * le couplage : l'élève lit la plaque signalétique (400 V Y · 230 V Δ), compare à la tension
 * du réseau, puis relie les bornes lui-même. Le simulateur constate ce qu'il a ponté.
 *
 * Étoile : U2, V2 et W2 réunis entre eux.
 * Triangle : U1–W2, V1–U2, W1–V2.
 */
import type { Coupling } from './engine';

const cle = (a: string, b: string): string => [a, b].sort().join('|');

/** Les trois bornes de la rangée haute sont-elles réunies en un seul point ? */
function reuniesEnEtoile(ponts: Set<string>): boolean {
  const voisins = new Map<string, string[]>();
  const relier = (a: string, b: string) => {
    const l = voisins.get(a);
    if (l) l.push(b); else voisins.set(a, [b]);
  };
  Array.from(ponts).forEach((p) => {
    const [a, b] = p.split('|');
    relier(a, b);
    relier(b, a);
  });
  const vus = new Set<string>(['M.U2']);
  const file = ['M.U2'];
  while (file.length) {
    const x = file.shift() as string;
    for (const v of voisins.get(x) ?? []) {
      if (!vus.has(v)) { vus.add(v); file.push(v); }
    }
  }
  return vus.has('M.V2') && vus.has('M.W2');
}

/**
 * Couplage réalisé, ou `null` si les barrettes sont absentes, incomplètes ou incohérentes —
 * auquel cas le moteur n'a tout simplement pas ses enroulements refermés.
 */
export function couplageDesBarrettes(wires: { a: string; b: string }[]): Coupling | null {
  const ponts = new Set<string>(
    wires
      .filter((w) => w.a.startsWith('M.') && w.b.startsWith('M.'))
      .map((w) => cle(w.a, w.b)),
  );
  if (!ponts.size) return null;

  const triangle = [cle('M.U1', 'M.W2'), cle('M.V1', 'M.U2'), cle('M.W1', 'M.V2')];
  if (triangle.every((t) => ponts.has(t))) return 'D';

  // Deux barrettes suffisent à réunir les trois bornes ; la troisième est redondante.
  if (reuniesEnEtoile(ponts)) return 'Y';

  return null;
}
