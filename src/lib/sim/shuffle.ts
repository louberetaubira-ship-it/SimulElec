/**
 * Mélange des propositions de réponse.
 *
 * Les TP déclarent souvent la bonne réponse en premier ; l'afficher toujours en
 * tête laisse l'élève cliquer la première case sans réfléchir. On permute donc
 * l'ordre d'AFFICHAGE, tout en gardant les INDICES D'ORIGINE : le clic renvoie
 * l'indice de la proposition dans le tableau source, donc la notation
 * (`answer`, `ok`/`half`) n'a pas à changer.
 *
 * La permutation est DÉTERMINISTE (graine = identifiant de la question) : même
 * ordre au rendu serveur et client (pas d'écart d'hydratation), et l'ordre ne
 * saute pas quand l'élève survole ou répond. Deux questions différentes ont des
 * graines différentes, donc la bonne réponse ne tombe pas systématiquement au
 * même endroit.
 */

function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ordre d'affichage : une permutation des indices `[0..n-1]`, stable pour une
 * même `key`. À utiliser tel quel dans un `.map`, en passant l'indice permuté
 * (donc l'indice d'ORIGINE) aux gestionnaires de clic.
 */
export function shuffledOrder(key: string, n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  const rnd = mulberry32(hash(key));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}
