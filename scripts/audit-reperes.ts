/**
 * Audit des repères cités dans les textes d'un TP.
 *
 * Un élève lit « referme Q1, F2 puis F3 » et cherche F2 sur une platine qui porte Q2 : il ne
 * peut pas s'en sortir. Les identifiants internes du simulateur (`f2`, `f3`) ne sont pas des
 * repères ; le repère est ce qui est écrit sur l'appareil, et il change d'un TP à l'autre —
 * F2 sur le démarrage direct, Q2 sur la perceuse radiale.
 *
 * Ce contrôle parcourt toutes les chaînes de la définition d'un TP, y relève ce qui a la forme
 * d'un repère d'appareil, et signale ceux qui ne correspondent à rien sur cette platine.
 *
 *   npx tsx scripts/audit-reperes.ts
 */
import { readFileSync } from 'node:fs';
import { TPS } from '../src/lib/data/tps';
import { pupitreOf } from '../src/lib/scene/geometry';
import type { TpDefinition } from '../src/lib/types';

/**
 * Forme d'un repère d'appareil, lettres normalisées comprises. On s'en tient à ces préfixes :
 * une référence commerciale (iC60N C20, LRD08, GV2ME) ou un code de compétence (C5) n'est pas
 * un repère, et les ramasser noierait le contrôle sous les faux positifs.
 */
// Un repère est un mot ISOLÉ. « T2 » dans « V/T2 » n'est pas un appareil : c'est
// la seconde moitié du marquage d'une borne de variateur (R/L1, S/L2, U/T1…).
// Sans cette garde, l'audit réclamait un appareil « T2 » sur la platine.
// Le lookahead final écarte les REPÈRES DE BORNE d'un automate : « Q0.0 », « I0.2 »
// contiennent « Q0 » et « I0 », qui ne sont pas des repères d'appareil. Sans lui,
// l'audit réclamait un appareil « Q0 » sur une platine qui n'en a pas.
const FORME = /(?<![\w/-])(Q\d{1,2}|KM\d{1,2}|KA\d{1,2}|F\d{1,2}|T\d{1,2}|S\d{1,2}|H\d{1,2}|X\d{1,2}|M\d{1,2})\b(?!\.\d)/g;

/**
 * Repères qui ne désignent pas un appareil de la platine et n'ont donc pas à y figurer :
 * conducteurs, bornes de plaque moteur, bornes d'appareils, tensions.
 */
const HORS_APPAREILS = new Set([
  'L1', 'L2', 'L3', 'N', 'PE',                       // conducteurs
  'U1', 'U2', 'V1', 'V2', 'W1', 'W2',                // plaque à bornes du moteur
  'A1', 'A2',                                        // bobine de contacteur
  'M2',                                              // point commun de la plaque moteur
  'X1', 'X2',                                        // bornes de bobine d'un voyant (H1 X1-X2)
]);

/**
 * Champs qui portent des références produit, des codes de référentiel ou des adresses
 * réseau (MAC d'une interface KNX : « 00:24:C6:F1:C8:6D » n'est pas le repère F1), pas des repères.
 */
const HORS_TEXTES = /^(competences|postes\[\d+\]\.options\[\d+\]\.(ref|spec|key)|plaque\.|knxMiseEnService\.interfaces\[\d+\]\.(mac|ip|individuelle))/;

/** Tous les repères réellement présents sur la platine d'un TP. */
function reperesDuTp(tp: TpDefinition): Set<string> {
  const s = new Set<string>();
  for (const slot of tp.slots) {
    if (slot.rep) s.add(slot.rep);
    if (slot.group) s.add(slot.group);
  }
  for (const p of pupitreOf(tp)) s.add(p.rep);
  if (tp.interPosition) s.add(tp.interPosition.rep);
  if (tp.hasMotor) s.add('M1');
  return s;
}

/** Toutes les chaînes d'un objet, avec le chemin où on les a trouvées. */
function chaines(o: unknown, chemin: string, out: { chemin: string; txt: string }[] = []) {
  if (typeof o === 'string') { if (o.length > 2) out.push({ chemin, txt: o }); return out; }
  if (Array.isArray(o)) { o.forEach((v, i) => chaines(v, `${chemin}[${i}]`, out)); return out; }
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) chaines(v, chemin ? `${chemin}.${k}` : k, out);
  }
  return out;
}

let defauts = 0;

for (const tp of TPS) {
  if (!tp.playable) continue;
  const valides = reperesDuTp(tp);
  console.log(`\n=== ${tp.title} (${tp.id})`);
  console.log(`    repères de la platine : ${Array.from(valides).sort().join(' ')}`);

  const vus = new Map<string, string[]>();
  for (const { chemin, txt } of chaines(tp, '')) {
    // les identifiants techniques (liaisons, nets, clés) ne sont pas des textes lus par l'élève
    if (/^(slots|liaisons|nets|terminals|recvItems|annexItems)\b/.test(chemin)) continue;
    if (HORS_TEXTES.test(chemin)) continue;
    for (const m of Array.from(txt.matchAll(FORME))) {
      const rep = m[1];
      if (HORS_APPAREILS.has(rep) || valides.has(rep)) continue;
      const l = vus.get(rep) ?? [];
      if (l.length < 3) l.push(chemin);
      vus.set(rep, l);
    }
  }

  if (vus.size === 0) {
    console.log('    ✓ aucun repère inconnu dans les textes');
  } else {
    for (const [rep, ou] of Array.from(vus).sort()) {
      defauts++;
      console.log(`    ✗ « ${rep} » n'existe pas sur cette platine`);
      ou.forEach(c => console.log(`        ${c}`));
    }
  }
}

/* ------------------------------------------- repères en dur dans l'interface
 *
 * Ces fichiers-là sont partagés par TOUS les TP : un repère écrit en dur y est juste pour
 * l'un et faux pour l'autre. Ils doivent demander le repère au TP (`repereSlot`,
 * `listeMiseSousTension`, `startButtons`), jamais l'écrire.
 */
const PARTAGES = [
  'src/components/mesures/Deconsignation.tsx',
  'src/components/mesures/Consignation.tsx',
  'src/components/parcours/MesureStage.tsx',
  'src/components/parcours/Validation.tsx',
  'src/lib/sim/engine.ts',
  'src/lib/sim/progress.ts',
  'src/lib/sim/context.ts',
  'src/app/tp/[id]/store.ts',
];
// `src/lib/data/cours.ts` n'y figure pas : une fiche de rappel décrit un montage de référence
// — et certaines parlent d'habitat ou d'automate, où « T3 » ou « Q0.0 » ne sont pas des repères
// de cette platine. Ses procédures ont été neutralisées à la main.

/** Repères d'appareil interdits dans un texte partagé (les bornes, elles, sont universelles). */
const INTERDITS = /\b(Q[1-9]|KM[1-9]|F[1-9]|T[1-9]|S[1-9]|H[1-9])\b/g;

console.log('\n=== Repères écrits en dur dans les textes partagés');
let durs = 0;
for (const f of PARTAGES) {
  let src: string;
  try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const lignes = src.split('\n');
  lignes.forEach((ligne, i) => {
    // commentaires : ce ne sont pas des textes lus par l'élève
    if (/^\s*(\/\/|\*|\/\*)/.test(ligne)) return;
    // valeur de repli (`?? 'H1'`) et tableaux d'identifiants (`['S1', 'S2']`) : du code, pas du texte
    if (/\?\?\s*'[A-Z]+\d'/.test(ligne)) return;
    if (/\[\s*'[A-Z]+\d'\s*(,\s*'[A-Z]+\d'\s*)*\]/.test(ligne)) return;
    const m = Array.from(ligne.matchAll(INTERDITS));
    if (!m.length) return;
    // un repère cité dans une chaîne de caractères, c'est ce qu'on traque
    if (!/['"`]/.test(ligne)) return;
    durs++;
    console.log(`    ✗ ${f}:${i + 1}`);
    console.log(`        ${ligne.trim().slice(0, 110)}`);
  });
}
if (!durs) console.log('    ✓ aucun repère en dur');
defauts += durs;

console.log(defauts === 0
  ? '\nTous les repères cités existent sur leur platine, et aucun n\'est écrit en dur.'
  : `\n${defauts} problème(s) de repère.`);
process.exit(defauts === 0 ? 0 : 1);
