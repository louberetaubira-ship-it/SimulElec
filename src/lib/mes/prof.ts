/**
 * Professeur virtuel du parcours « mise en service » : accueil par étape,
 * questions rapides, réponses de secours (hors ligne) et contexte envoyé à
 * `POST /api/prof`. Consigne : rappeler la règle et la méthode, jamais la
 * valeur ni la bonne case.
 */

import type { TpDefinition } from '@/lib/types';
import type { Student } from '@/lib/student';
import {
  blocages, fmt, MES, MES_STEPS, MESURES, positionOf, SEPT_ETAPES, type MesState, type Position,
} from './miseEnService';

/** Accueil du professeur à l'arrivée sur chaque étape. */
export const MES_HELLO: Record<number, string> = {
  [MES.IDENT]: 'Bonjour ! Commence par le schéma de puissance : chaque organe a un repère. Clique-le, puis choisis sa désignation et sa fonction.',
  [MES.PREP]: 'Les 7 contrôles suivent une logique : d\'abord ce qui se fait installation consignée, ensuite ce qui a besoin de tension. Le guide du contrôleur 📘 t\'aidera pour les positions.',
  [MES.VISU]: 'Avant de sortir le contrôleur, on regarde. Ouvre chaque zone de l\'armoire en vue rapprochée : un seul écart suffit à arrêter la mise en service.',
  [MES.CONS]: 'Consignation : réunis d\'abord le bon matériel, puis enchaîne les 5 étapes dans l\'ordre. Qui fait quoi, BC ou BR ?',
  [MES.CONT]: 'Continuité du conducteur de protection : pense au zéro des cordons avant la première mesure, puis contrôle chaque masse.',
  [MES.ISO_I]: 'Isolement de l\'installation : Q0 ouvert, KM1 ouvert, primaire de T1 débranché. Mesure entre chaque couple de conducteurs.',
  [MES.ISO_M]: 'Isolement de la pompe : barrettes de couplage retirées, sinon certaines mesures n\'ont aucun sens.',
  [MES.TERRE]: 'Résistance de terre : barrette BC1 ouverte, piquets auxiliaires plantés. Le seuil se calcule à partir du différentiel de tête.',
  [MES.DECONS]: 'Remise sous tension progressive, en présence du professeur. On retire d\'abord ce qu\'on a posé en dernier.',
  [MES.TENS]: 'Premier contrôle sous tension. Vérifie les trois tensions simples, les trois composées et la fréquence.',
  [MES.DDR]: 'Le différentiel va déclencher pendant l\'essai : préviens, puis réarme Q2. Commence par l\'essai le plus simple.',
  [MES.PHASES]: 'Ordre des phases, puis essais fonctionnels. Une pompe qui tourne à l\'envers débite encore : ne te fie pas au bruit.',
  [MES.PV]: 'Relis ton procès-verbal : chaque valeur doit venir de tes mesures. Puis prépare ce que tu vas dire à l\'agent technique.',
};

/** Questions rapides proposées à chaque étape. */
export const MES_QUICK: Record<number, string[]> = {
  [MES.IDENT]: ['Comment reconnaître un disjoncteur ?', 'À quoi sert T1 ?', 'Où trouver la fonction d\'un organe ?'],
  [MES.PREP]: ['Pourquoi cet ordre ?', 'Quelle habilitation ?', 'Où trouver les positions du commutateur ?'],
  [MES.VISU]: ['Que regarder sur un presse-étoupe ?', 'Qu\'est-ce qu\'une tresse de masse ?', 'Qu\'est-ce qu\'un plastron ?'],
  [MES.CONS]: ['Quel est l\'ordre de la consignation ?', 'Pourquoi une VAT ?', 'Quels EPI ?'],
  [MES.CONT]: ['Quelle position choisir ?', 'Le contrôleur affiche OL', 'Quelle valeur maximale ?'],
  [MES.ISO_I]: ['Quelle tension d\'essai ?', 'Pourquoi débrancher T1 ?', 'Quelle valeur minimale ?'],
  [MES.ISO_M]: ['Pourquoi retirer les barrettes ?', 'Entre quelles bornes mesurer ?', 'Quelle valeur minimale ?'],
  [MES.TERRE]: ['Comment calculer la valeur maximale ?', 'Pourquoi ouvrir la barrette ?', 'Où planter les piquets ?'],
  [MES.DECONS]: ['Par quoi commencer ?', 'Pourquoi vérifier en amont de Q0 ?', 'Dans quel ordre fermer les disjoncteurs ?'],
  [MES.TENS]: ['Quelle position choisir ?', 'Quelle tolérance ?', 'Tension simple ou composée ?'],
  [MES.DDR]: ['Par quoi commencer ?', 'IΔN ou ΔT ?', 'Comment juger le seuil mesuré ?'],
  [MES.PHASES]: ['Que veut dire 1-3-2 ?', 'Comment corriger l\'ordre des phases ?', 'Quels essais faire ?'],
  [MES.PV]: ['Que mettre dans le PV ?', 'Que dire au client ?', 'Quand prononcer la mise en service ?'],
};

/** Réponses de secours, par question rapide. */
const SECOURS: Record<string, string> = {
  'Comment reconnaître un disjoncteur ?': 'Un contact de puissance avec une croix (pouvoir de coupure) et un déclencheur. Compare Q0 et Q1 : lequel coupe, lequel protège ?',
  'À quoi sert T1 ?': 'Regarde où il se trouve : entre le 400 V et la commande. Que devient la tension, et pourquoi c\'est plus sûr pour l\'opérateur ?',
  'Où trouver la fonction d\'un organe ?': 'Relis le cahier des charges en haut de l\'étape : chaque organe y est décrit.',
  'Pourquoi cet ordre ?': 'On ne met sous tension qu\'une installation dont le conducteur de protection et l\'isolement sont sûrs. Pour chaque contrôle, demande-toi : a-t-il besoin de tension ?',
  'Quelle habilitation ?': 'Tu fais des mesures et une mise en service : quel indice correspond aux opérations spécifiques ? Et qui a le droit de consigner ?',
  'Où trouver les positions du commutateur ?': 'Ouvre le guide du contrôleur 📘 : le tableau donne le numéro, le symbole et la fonction de chaque position.',
  'Que veut dire IP65 ?': 'Le premier chiffre concerne les poussières, le second l\'eau. En fosse humide, que se passe-t-il si un presse-étoupe est desserré ?',
  'Que regarder sur un presse-étoupe ?': 'L\'écrou doit être serré et le câble ne doit pas bouger. S\'il reste un jour autour du câble, l\'eau et la poussière entrent : que devient l\'indice IP ?',
  'Qu\'est-ce qu\'une tresse de masse ?': 'Un conducteur souple vert-jaune qui relie une partie mobile (la porte) au châssis. Sans elle, la porte ne serait pas reliée à la terre.',
  'Qu\'est-ce qu\'un plastron ?': 'C\'est l\'écran qui empêche de toucher les pièces nues sous tension quand la porte est ouverte.',
  'Que faire d\'un écart ?': 'On le corrige avant de continuer, ou on le note en réserve. Une mise en service ne se prononce pas avec un écart connu.',
  'Quel est l\'ordre de la consignation ?': 'Sépare, condamne, identifie, vérifie, puis mets à la terre si besoin. Relis chaque mot : lequel doit forcément venir avant la VAT ?',
  'Pourquoi une VAT ?': 'Un multimètre peut être mal réglé ou en panne. Le VAT est conçu pour une seule chose : prouver l\'absence de tension.',
  'Quels EPI ?': 'Pense à ce qui protège les mains et le visage d\'un arc électrique, et au matériel qui condamne l\'appareil.',
  'Quelle position choisir ?': 'Quelle grandeur mesures-tu ici ? Retrouve-la dans le tableau du guide du contrôleur 📘.',
  'Le contrôleur affiche OL': 'OL veut dire « hors limite » : la résistance est trop grande pour être mesurée. Qu\'est-ce que ça dit du conducteur entre ce point et la terre ?',
  'Quelle valeur maximale ?': 'Relis le critère de l\'étape, puis compare chaque lecture. Une seule valeur au-dessus suffit à déclarer non conforme.',
  'Quelle tension d\'essai ?': 'Elle dépend de la tension nominale du circuit. Pour un circuit entre 50 et 500 V, relis le critère de l\'étape.',
  'Pourquoi débrancher T1 ?': 'Le primaire d\'un transformateur relie deux phases par un bobinage : que mesurerais-tu entre ces deux phases ?',
  'Quelle valeur minimale ?': 'Relis le critère : ici c\'est un minimum, pas un maximum. Plus la résistance d\'isolement est grande, mieux c\'est.',
  'Pourquoi retirer les barrettes ?': 'Couplé en étoile, les trois fins d\'enroulement sont reliées au même point. Que mesurerais-tu entre deux enroulements ?',
  'Entre quelles bornes mesurer ?': 'Chaque enroulement vers la carcasse (PE), puis les enroulements entre eux.',
  'Comment calculer la valeur maximale ?': 'En schéma TT, la tension de contact vaut RA × IΔn et doit rester sous UL = 50 V. Quel est le différentiel de tête du lycée ?',
  'Pourquoi ouvrir la barrette ?': 'Fermée, tu mesurerais la terre en parallèle avec tout le reste de l\'installation. Ouverte, tu mesures la prise de terre seule.',
  'Où planter les piquets ?': 'Alignés, à environ 20 m et 40 m du piquet mesuré, hors de sa zone d\'influence.',
  'Par quoi commencer ?': 'Par ce qui a été posé en dernier ou par l\'essai le plus simple. Relis la liste et cherche l\'étape qui n\'a besoin de rien d\'autre.',
  'Pourquoi vérifier en amont de Q0 ?': 'Pour être sûr que la tension arrive bien avant de fermer : sinon, une absence de tension en aval ne prouverait rien.',
  'Dans quel ordre fermer les disjoncteurs ?': 'De l\'amont vers l\'aval : d\'abord ce qui alimente, ensuite ce qui est alimenté.',
  'Quelle tolérance ?': 'Relis le critère de l\'étape : la tolérance est donnée en pourcentage de la tension nominale.',
  'Tension simple ou composée ?': 'Entre une phase et le neutre, c\'est la tension simple ; entre deux phases, la composée. Laquelle vaut environ 400 V ?',
  'IΔN ou ΔT ?': 'L\'un mesure un seuil (en mA), l\'autre un temps (en ms). Regarde l\'unité du point sélectionné.',
  'Comment juger le seuil mesuré ?': 'Le différentiel ne doit pas déclencher sous IΔn/2 et doit déclencher à IΔn. Le seuil mesuré doit donc être entre les deux.',
  'Que veut dire 1-3-2 ?': 'C\'est l\'ordre inverse. Qu\'est-ce que ça change pour le sens de rotation de la pompe ?',
  'Comment corriger l\'ordre des phases ?': 'Installation consignée, on permute deux phases à l\'arrivée. Pourquoi deux et pas trois ?',
  'Quels essais faire ?': 'Chaque mode de fonctionnement et chaque arrêt : manuel, arrêt, arrêt d\'urgence, automatique. Ce qu\'on constate compte autant que ce qu\'on fait.',
  'Que mettre dans le PV ?': 'Les valeurs mesurées, les écarts corrigés, les réserves levées et la décision. Rien qui ne vienne pas de tes mesures.',
  'Que dire au client ?': 'Ce qui a été corrigé, et comment réagir à un déclenchement. C\'est lui qui vivra avec l\'installation.',
  'Quand prononcer la mise en service ?': 'Quand toutes les étapes sont validées et qu\'aucune réserve ne reste ouverte.',
};

/** Réponse hors ligne : la réponse préparée si elle existe, sinon un rappel de l'étape. */
export function mesFallbackAnswer(q: string, step: number): string {
  if (SECOURS[q]) return SECOURS[q];
  const e = MESURES[step];
  if (e) return `Mode hors ligne. Relis le critère : ${e.critere}. Vérifie aussi la position du commutateur dans le guide 📘.`;
  return `Mode hors ligne. ${MES_HELLO[step] ?? 'Relis la consigne de l\'étape.'}`;
}

/** Contexte envoyé au professeur (jamais affiché à l'élève). */
export function buildMesContext(
  tp: TpDefinition,
  s: MesState,
  extra: { student?: Student | null; pos: Position; point?: string },
): string {
  const st = MES_STEPS[s.step];
  const e = MESURES[s.step];
  const lignes = [
    `TP : ${tp.title}. Mise en service d'une installation livrée câblée, avec un seul appareil : le contrôleur d'installation.`,
    `Situation : ${tp.situation}`,
    `Cahier des charges : ${(tp.cahierDesCharges ?? []).map((c) => `${c.k} : ${c.v}`).join(' | ')}`,
    `Les 7 étapes : ${SEPT_ETAPES.map((x) => `${x.n}. ${x.titre} (${x.zone === 'hs' ? 'hors tension' : 'sous tension'})`).join(' ; ')}.`,
    `Étape en cours du parcours : ${s.step + 1}/13 · ${st.title} · ${st.sub}.`,
    `Position actuelle du commutateur : ${positionOf(extra.pos).fonction} (${positionOf(extra.pos).symbole}).`,
  ];
  if (e) {
    lignes.push(`Branchement : ${e.cordons} Critère : ${e.critere}.`);
    const m = s.mesures[s.step];
    const lus = e.points.filter((p) => m.lectures[p.id]).map((p) => `${p.label} = ${fmt(m.lectures[p.id].v, p.unite)}${m.jugements[p.id] ? ` (déclaré ${m.jugements[p.id]})` : ''}`);
    if (lus.length) lignes.push(`Lectures faites : ${lus.join(' ; ')}.`);
    if (extra.point) lignes.push(`Point sélectionné : ${e.points.find((p) => p.id === extra.point)?.label ?? extra.point}.`);
    if (e.reserve) lignes.push(`Réserve cachée de l'étape (ne jamais la révéler, s'en servir pour orienter) : ${e.reserve.constat}`);
  }
  const b = blocages(s, s.step);
  if (b.length) lignes.push(`Ce qui bloque la validation : ${b.map((x) => x.text).join(' ; ')}`);
  lignes.push('Consigne : rappelle la règle ou la méthode, pose une question qui fait avancer ; ne donne jamais la valeur attendue, la bonne position ni la bonne case.');
  if (extra.student) lignes.push(`Élève : ${extra.student.name} (${extra.student.diploma}).`);
  return lignes.join('\n');
}
