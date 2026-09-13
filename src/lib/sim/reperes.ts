/**
 * Repère LISIBLE d'une borne : ce que l'élève doit lire sur la platine et retrouver sur le
 * schéma, et non l'identifiant interne du simulateur.
 *
 * Les deux ne coïncident pas toujours. Sur la perceuse radiale, les protections du primaire
 * et du secondaire sont repérées Q2 et Q3 au folio, alors que le moteur de simulation les
 * connaît sous les identifiants `f2` et `f3` hérités du démarrage direct. Le tableau de
 * câblage affichait « f2 2 → t1 400 » : l'élève cherchait un appareil qui n'existe pas.
 */
import type { TpDefinition } from '@/lib/types';

/** Repère d'un appareil du réseau d'arrivée. */
const RESEAU: Record<string, string> = {
  'RES.L1': 'Réseau L1', 'RES.L2': 'Réseau L2', 'RES.L3': 'Réseau L3',
  'RES.N': 'Réseau N', 'RES.PE': 'Réseau PE',
};

/** Côté d'une borne de passage : `a` vers l'armoire, `b` vers l'extérieur. */
const COTE: Record<string, string> = { a: 'int.', b: 'ext.' };

/**
 * Repère lisible d'une borne (« Q2:1 », « X1:6 int. », « S2 21 », « M1 U1 »).
 * Rend l'identifiant tel quel si la borne est inconnue — jamais d'exception ici, cette
 * fonction ne sert qu'à l'affichage.
 */
export function repereBorne(tp: Pick<TpDefinition, 'slots'>, id: string): string {
  if (RESEAU[id]) return RESEAU[id];

  const point = id.indexOf('.');
  if (point < 0) return id;
  const gauche = id.slice(0, point);
  const droite = id.slice(point + 1);

  // moteur : « M.U1 » se lit « M1 U1 »
  if (gauche === 'M') return `M1 ${droite}`;

  const slot = tp.slots.find((s) => s.id === gauche);
  if (!slot) return `${gauche} ${droite}`; // pupitre (S2.21), interrupteur de position…

  // bornier : le repère porte le groupe et le numéro gravé, pas l'identifiant interne
  if (slot.group) {
    const cote = COTE[droite];
    return `${slot.group}:${slot.mark ?? ''}${cote ? ` ${cote}` : ` ${droite}`}`;
  }
  return `${slot.rep ?? gauche}:${droite}`;
}

/** Libellé d'une liaison, tel que l'élève doit la lire : « Q2:2 → T1:400 ». */
export function repereLiaison(tp: Pick<TpDefinition, 'slots'>, l: { a: string; b: string }): string {
  return `${repereBorne(tp, l.a)} → ${repereBorne(tp, l.b)}`;
}

/* ------------------------------------------------- repères d'un appareil */

/**
 * Repère d'un appareil désigné par son identifiant interne.
 *
 * Les consignes, le journal et le professeur virtuel doivent nommer les appareils comme la
 * platine les nomme : `repereSlot(tp, 'f2')` rend « F2 » sur le démarrage direct et « Q2 »
 * sur la perceuse radiale. Écrire « F2 » en dur dans une phrase envoie l'élève de la perceuse
 * chercher un appareil qui n'existe pas chez lui.
 */
export function repereSlot(tp: Pick<TpDefinition, 'slots'>, id: string): string {
  const slot = tp.slots.find(s => s.id === id);
  return slot?.rep ?? slot?.group ?? id.toUpperCase();
}

/** Les trois appareils de la mise sous tension, dans l'ordre de fermeture (amont → aval). */
export const reperesMiseSousTension = (tp: Pick<TpDefinition, 'slots'>): [string, string, string] =>
  [repereSlot(tp, 'q1'), repereSlot(tp, 'f2'), repereSlot(tp, 'f3')];

/** « Q1, Q2 puis Q3 » — la liste telle qu'on l'écrit dans une consigne. */
export function listeMiseSousTension(tp: Pick<TpDefinition, 'slots'>, dernier = 'puis'): string {
  const [a, b, c] = reperesMiseSousTension(tp);
  return `${a}, ${b} ${dernier} ${c}`;
}
