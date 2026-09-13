/**
 * Transformateur de commande à prises — quelle prise l'élève a-t-il choisie,
 * et qu'est-ce que ça donne au secondaire ?
 *
 * Un transformateur de commande industriel (ABL6TS…) porte plusieurs prises au
 * primaire (0 · 230 · 400) et plusieurs au secondaire (0V · 24 · 48). Le rapport
 * de transformation est fixé par le nombre de spires : la tension du secondaire
 * vaut toujours
 *
 *     U2 = Uprise_secondaire × (Uréseau / Uprise_primaire)
 *
 * Se tromper de prise ne « ne marche pas » : ça marche, mal. Alimenter en 400 V
 * la prise 230 donne 400 × 24 / 230 ≈ 41,7 V au secondaire ; alimenter en 230 V
 * la prise 400 donne 230 × 24 / 400 ≈ 13,8 V. Dans les deux cas le montage a
 * l'air correct, l'élève ne le découvre qu'à la mesure ou à l'essai — c'est
 * exactement ce qu'on veut lui faire vivre.
 *
 * Trois fautes possibles, trois conséquences différentes — et il ne faut pas les
 * confondre, car ce n'est pas le même organe qui souffre :
 *
 * - Prise du PRIMAIRE trop haute (400 marqués, 230 appliqués) : le fer travaille
 *   en dessous du nominal, rien ne chauffe, mais le secondaire ne donne que
 *   13,8 V. La CEI 60947-4-1 (§8.2.1.2.1) ne garantit la fermeture d'un
 *   contacteur qu'entre 85 % et 110 % de la tension assignée d'alimentation de
 *   commande : à 57 %, la bobine ne colle pas. Rien ne se passe, rien ne casse.
 *
 * - Prise du PRIMAIRE trop basse (230 marqués, 400 appliqués) : le flux est
 *   proportionnel à U/f, donc à 174 % du nominal — très au-delà de la
 *   surexcitation permanente qu'un transformateur supporte, de l'ordre de 110 %.
 *   Le circuit magnétique sature, le courant magnétisant explose et la protection
 *   du primaire déclenche. C'est le transformateur qui est en cause.
 *
 * - Prise du SECONDAIRE trop haute (48 au lieu de 24) : le fer travaille
 *   normalement, le transformateur ne souffre pas. C'est la bobine qui reçoit
 *   200 % de sa tension assignée : elle colle, puis chauffe — les pertes varient
 *   comme le carré de la tension — et finit par griller.
 */

import type { TrafoDef } from '../types';

/** Diagnostic du transformateur tel qu'il est câblé. */
export type DiagTrafo =
  | 'absent'        // primaire ou secondaire pas encore raccordé
  | 'ok'            // prises correctes
  | 'sousexcite'    // prise primaire trop haute : tension trop faible, le contacteur ne colle pas
  | 'surexcite'     // prise primaire trop basse : le circuit magnétique sature
  | 'surtension';   // primaire juste, prise secondaire trop haute : la bobine est sur-alimentée

export interface EtatTrafo {
  /** Prises du primaire réellement raccordées. */
  primaire: [string, string] | null;
  /** Prises du secondaire réellement raccordées. */
  secondaire: [string, string] | null;
  /** Tension marquée sur la portion de primaire utilisée (V). */
  uPrise: number;
  /** Tension à vide au secondaire, telle que la mesurerait l'élève (V). */
  u2: number;
  /** Flux rapporté au nominal : 1 = correct, 1,74 = prise 230 sous 400 V. */
  exces: number;
  diag: DiagTrafo;
}

const ABSENT: EtatTrafo = {
  primaire: null, secondaire: null, uPrise: 0, u2: 0, exces: 0, diag: 'absent',
};

/** Une liaison posée, telle que la stocke le parcours. */
export interface Pose { a: string; b: string }

const borne = (id: string, slot: string): string | null => {
  const p = id.indexOf('.');
  return p > 0 && id.slice(0, p) === slot ? id.slice(p + 1) : null;
};

/**
 * Prises d'un même côté (primaire ou secondaire) qui portent un fil.
 * Deux au plus sont utiles : au-delà, l'élève a fait un court-circuit de spires
 * et on renvoie les deux extrêmes, ce qui donne la portion la plus contrainte.
 */
function prisesCablees(
  poses: readonly Pose[],
  slot: string,
  prises: Record<string, number>,
): [string, string] | null {
  const vues = new Set<string>();
  for (const w of poses) {
    for (const id of [w.a, w.b]) {
      const b = borne(id, slot);
      if (b != null && b in prises) vues.add(b);
    }
  }
  const liste = Array.from(vues).sort((x, y) => prises[x] - prises[y]);
  if (liste.length < 2) return null;
  return [liste[0], liste[liste.length - 1]];
}

/**
 * État du transformateur d'après les fils réellement posés.
 * Aucune constante : tout se déduit des prises marquées et du réseau.
 */
export function etatTrafo(def: TrafoDef | undefined, poses: readonly Pose[]): EtatTrafo {
  if (!def) return ABSENT;
  const pri = prisesCablees(poses, def.slot, def.primaire);
  const sec = prisesCablees(poses, def.slot, def.secondaire);
  if (!pri || !sec) return { ...ABSENT, primaire: pri, secondaire: sec };

  const uPrise = Math.abs(def.primaire[pri[1]] - def.primaire[pri[0]]);
  const uSec = Math.abs(def.secondaire[sec[1]] - def.secondaire[sec[0]]);
  if (!(uPrise > 0) || !(uSec > 0)) return { ...ABSENT, primaire: pri, secondaire: sec };

  const exces = def.reseau / uPrise;
  const u2 = Math.round(uSec * exces * 10) / 10;
  const rapport = u2 / def.bobine;
  // Deux fautes différentes, deux conséquences différentes — c'est ce que la
  // première version confondait :
  //  · prise du PRIMAIRE trop basse → le flux dépasse le nominal, le circuit
  //    magnétique sature et le courant magnétisant fait déclencher l'amont ;
  //  · prise du SECONDAIRE trop haute → le fer travaille normalement, c'est la
  //    bobine qui est sur-alimentée et qui chauffe jusqu'à la destruction.
  // Seuils : 110 % et 85 % de la tension assignée, limites de fermeture garantie
  // de la CEI 60947-4-1 §8.2.1.2.1, et ordre de grandeur de la surexcitation
  // permanente qu'un transformateur supporte.
  const diag: DiagTrafo = exces > 1.1 ? 'surexcite'
    : rapport > 1.1 ? 'surtension'
      : rapport < 0.85 ? 'sousexcite' : 'ok';
  return { primaire: pri, secondaire: sec, uPrise, u2, exces, diag };
}

/**
 * L'élève a-t-il raccordé une prise voisine à la place de celle du tableau ?
 *
 * On accepte la liaison au lieu de la refuser : sur une vraie platine, rien
 * n'empêche de serrer le fil sur la prise 230 au lieu de la 400. Le montage a
 * l'air fait, le tableau de câblage est complet — et la faute ne se découvre
 * qu'à la mesure du secondaire ou au premier essai. C'est tout l'intérêt.
 *
 * Renvoie la liaison attendue à laquelle celle-ci se substitue, ou `null`.
 */
export function substitutTrafo<T extends { a: string; b: string }>(
  def: TrafoDef | undefined,
  attendues: readonly T[],
  a: string,
  b: string,
): T | null {
  if (!def) return null;
  const cote = (id: string): Record<string, number> | null => {
    const t = borne(id, def.slot);
    if (t == null) return null;
    return t in def.primaire ? def.primaire : t in def.secondaire ? def.secondaire : null;
  };
  const ca = cote(a), cb = cote(b);
  // exactement une des deux pointes est une prise du transformateur
  if ((ca == null) === (cb == null)) return null;
  const prise = ca ? a : b;
  const autre = ca ? b : a;
  const prises = ca ?? cb!;
  return attendues.find(l => {
    const [x, y] = [l.a, l.b];
    const memeAutre = x === autre || y === autre;
    const cible = x === autre ? y : x;
    if (!memeAutre || cible === prise) return false;
    const t = borne(cible, def.slot);
    return t != null && t in prises;   // même côté du transformateur, autre prise
  }) ?? null;
}

/** La bobine colle-t-elle ? (85 % de la tension assignée, CEI 60947-4-1) */
export const bobineColle = (e: EtatTrafo, bobine: number): boolean =>
  e.diag === 'absent' ? true : e.u2 >= 0.85 * bobine;

/** Phrase d'explication destinée à l'élève, construite à partir des prises. */
export function expliqueTrafo(def: TrafoDef | undefined, e: EtatTrafo): string | null {
  if (!def || e.diag === 'absent' || e.diag === 'ok' || !e.primaire) return null;
  const [a, b] = e.primaire;
  const prises = `${a} et ${b}`;
  if (e.diag === 'surtension' && e.secondaire) {
    return `Le primaire est correct, mais le secondaire est pris sur ${e.secondaire.join(' et ')} : `
      + `${e.u2} V au lieu de ${def.bobine} V. La bobine colle, puis chauffe — les pertes varient `
      + `comme le carré de la tension, ici ${Math.round((e.u2 / def.bobine) ** 2 * 100)} % `
      + 'du nominal — et finit par griller.';
  }
  if (e.diag === 'surexcite') {
    return `Le primaire est raccordé sur ${prises}, soit une portion marquée ${e.uPrise} V, `
      + `alimentée sous ${def.reseau} V : ${Math.round(e.exces * 100)} % du flux nominal. `
      + `Le secondaire monte à ${e.u2} V au lieu de ${def.bobine} V, le circuit magnétique sature `
      + 'et le courant magnétisant fait déclencher la protection du primaire.';
  }
  return `Le primaire est raccordé sur ${prises}, soit une portion marquée ${e.uPrise} V, `
    + `alimentée sous ${def.reseau} V seulement : le secondaire ne donne que ${e.u2} V. `
    + `La bobine n'est plus qu'à ${Math.round((e.u2 / def.bobine) * 100)} % de sa tension assignée, `
    + 'en dessous des 85 % où la CEI 60947-4-1 garantit la fermeture : le contacteur ne colle pas.';
}
