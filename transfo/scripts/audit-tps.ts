/**
 * Contrôle de cohérence des TP du catalogue — à lancer avant toute livraison :
 *
 *     npx tsx scripts/audit-tps.ts
 *
 * Ce que l'élève ne doit jamais rencontrer : une liaison vers une borne qui n'existe pas,
 * un doublon, deux bornes de réseaux différents reliées sans raison, une borne déclarée dans
 * la table des réseaux mais absente de la platine, deux appareils portant le même repère, ou
 * un appareil dont le repère affiché ne correspond pas à son identifiant interne.
 *
 * La mise à la terre du 0 V (C0 relié au PE) est la seule liaison inter-réseaux légitime :
 * elle est donc explicitement tolérée.
 */
import { TPS } from '@/lib/data/tps';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { sceneContext, annexTerminals, recvTerminals } from '@/lib/scene/route';
import { MTERM, MT2, RES, pupitreOf, pupitreTerminals, resIds, term } from '@/lib/scene/geometry';

let total = 0;
for (const tp of TPS) {
  const pb: string[] = [];
  const ctx = sceneContext(tp, CATALOGUE_BY_KEY);

  // toutes les bornes réellement existantes
  const bornes = new Set<string>();
  for (const s of ctx.slots) for (const t of s.terminals) bornes.add(`${s.id}.${t.id}`);
  for (const id of resIds(tp.scene)) bornes.add(id);
  for (const it of tp.recvItems ?? []) Object.keys(recvTerminals(it)).forEach((k) => bornes.add(k));
  for (const it of tp.annexItems ?? []) Object.keys(annexTerminals(it)).forEach((k) => bornes.add(k));
  if (tp.station) Object.keys(pupitreTerminals(pupitreOf(tp))).forEach((k) => bornes.add(k));
  if (tp.hasMotor) Object.keys({ ...MTERM, ...MT2 }).forEach((k) => bornes.add(k));

  // 1. bornes inexistantes dans les liaisons
  tp.liaisons.forEach((l, i) => {
    if (!bornes.has(l.a)) pb.push(`liaison ${i} : borne « ${l.a} » inexistante`);
    if (!bornes.has(l.b)) pb.push(`liaison ${i} : borne « ${l.b} » inexistante`);
    if (l.a === l.b) pb.push(`liaison ${i} : boucle sur ${l.a}`);
  });

  // 2. doublons
  const vus = new Map<string, number>();
  tp.liaisons.forEach((l, i) => {
    const k = [l.a, l.b].sort().join('|');
    if (vus.has(k)) pb.push(`liaisons ${vus.get(k)} et ${i} : doublon ${l.a} ↔ ${l.b}`);
    else vus.set(k, i);
  });

  // 3. cohérence avec la table des réseaux
  const nets = tp.nets ?? {};
  tp.liaisons.forEach((l, i) => {
    const na = nets[l.a]?.net;
    const nb = nets[l.b]?.net;
    if (!na || !nb || na === nb) return;
    // mise à la terre du point neutre de la commande : liaison C0 ↔ PE voulue
    const terre = (na === 'C0' && nb === 'PE') || (na === 'PE' && nb === 'C0');
    if (!terre) pb.push(`liaison ${i} : ${l.a} (${na}) et ${l.b} (${nb}) ne sont pas du même réseau`);
  });

  // 4. bornes déclarées dans nets mais inexistantes
  for (const id of Object.keys(nets)) if (!bornes.has(id)) pb.push(`nets : borne « ${id} » déclarée mais inexistante`);

  // 5. bornes jamais raccordées (normal sur les prises inutilisées d'un appareil)
  const utilisees = new Set(tp.liaisons.flatMap((l) => [l.a, l.b]));
  const orphelines = Array.from(bornes).filter((b) => !utilisees.has(b));

  // 6. borne NON raccordée mais déclarée sur un réseau commun (0 V ou PE) : elle serait vue
  //    comme équipotentielle à la terre, et une erreur de câblage dessus passerait inaperçue.
  //    C'est la faute qui rendait la prise 230 V du primaire équivalente au 0 V de commande.
  const COMMUNS = ['C0', 'PE', 'N'];
  for (const b of Array.from(bornes)) {
    const n = nets[b]?.net;
    if (!n || utilisees.has(b) || !COMMUNS.includes(n)) continue;
    // Les deux faces d'une borne de passage (« x1_4.a » / « x1_4.b ») sont LE MÊME point :
    // si l'une est raccordée, l'autre est légitimement sur le même réseau.
    const face = b.endsWith('.a') ? `${b.slice(0, -2)}.b` : b.endsWith('.b') ? `${b.slice(0, -2)}.a` : null;
    if (face && utilisees.has(face)) continue;
    pb.push(`borne « ${b} » non raccordée mais déclarée sur ${n} : une faute de câblage dessus passerait inaperçue`);
  }

  // 7. repères des appareils : doublons ?
  const reps = new Map<string, string>();
  for (const s of tp.slots) {
    if (!s.rep) continue;
    if (reps.has(s.rep)) pb.push(`repère « ${s.rep} » porté par ${reps.get(s.rep)} ET ${s.id}`);
    reps.set(s.rep, s.id);
  }

  // 8. identifiant interne ≠ repère affiché (piège pour l'élève)
  const ecarts = tp.slots.filter((s) => s.rep && s.rep.toLowerCase() !== s.id.toLowerCase()).map((s) => `${s.id} affiché « ${s.rep} »`);

  console.log(`\n═══ ${tp.id} · ${tp.liaisons.length} liaisons · ${bornes.size} bornes`);
  if (ecarts.length) console.log('  identifiant interne ≠ repère :', ecarts.join(', '));
  if (orphelines.length) console.log(`  ${orphelines.length} bornes non raccordées : ${orphelines.slice(0, 14).join(' ')}${orphelines.length > 14 ? ' …' : ''}`);
  if (pb.length) { pb.forEach((x) => console.log('  ✗ ' + x)); total += pb.length; }
  else console.log('  ✓ aucune incohérence');
}
console.log(`\n${total} incohérence(s)`);
