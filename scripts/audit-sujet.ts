/**
 * Contrôle de cohérence des sujets numériques (`src/lib/data/sujets/`) — à lancer avant
 * toute livraison :
 *
 *     npx tsx scripts/audit-sujet.ts
 *
 * Vérifie, pour chaque sujet : numérotation continue des questions, pages DTR et pages du
 * sujet existantes, images présentes dans `public/` (et dimensions déclarées des schémas
 * conformes au fichier), identifiants de TP platine attendus, réponses attendues présentes
 * pour les outils corrigés automatiquement, liens / rangs / bulles / bornes cohérents.
 *
 * N'importe PAS `TPS` : les TP platine sont vérifiés par `audit-tps.ts`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SUJETS } from '@/lib/data/sujets';
import type { CelluleSaisie, SujetNumerique, SujetQuestion } from '@/lib/sujet/types';

const PUBLIC = join(__dirname, '..', 'public');

/** TP platine attendus par sujet (mode « câblage réel » des questions schéma). */
const PLATINES: Record<string, string[]> = {
  'cgm2021-eip': ['cgm2021-q13-cumulus', 'cgm2021-q58-myhome', 'cgm2021-q67-vigik'],
};
/** Nombre de questions attendu par sujet. */
const NB_QUESTIONS: Record<string, number> = { 'cgm2021-eip': 72 };

let erreurs = 0;
const err = (s: SujetNumerique, msg: string) => { erreurs += 1; console.error(`✗ [${s.id}] ${msg}`); };

/** Dimensions d'un JPEG (lecture du marqueur SOF), ou null. */
function tailleJpeg(fichier: string): { w: number; h: number } | null {
  const b = readFileSync(fichier);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const m = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function imageExiste(s: SujetNumerique, src: string, ou: string) {
  if (!src.startsWith('/')) { err(s, `${ou} : chemin d'image non absolu « ${src} »`); return false; }
  if (!existsSync(join(PUBLIC, src))) { err(s, `${ou} : image absente de public/ « ${src} »`); return false; }
  return true;
}

const dans = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
const estNote = (c: { attendu?: number; acceptes?: string[] }) => c.attendu != null || (c.acceptes != null && c.acceptes.length > 0);

function auditQuestion(s: SujetNumerique, q: SujetQuestion, dtrNums: Set<number>) {
  const ou = `Q${q.num}`;
  if (!s.parties.some(p => p.num === q.partie)) err(s, `${ou} : partie ${q.partie} inconnue`);
  const partie = s.parties.find(p => p.num === q.partie);
  if (partie && !partie.competences.includes(q.competence)) err(s, `${ou} : compétence ${q.competence} absente de la partie ${q.partie}`);
  if (!(q.points > 0)) err(s, `${ou} : points invalides (${q.points})`);
  if (!q.enonce.trim()) err(s, `${ou} : énoncé vide`);
  for (const d of q.dtr) {
    if (!dans(d, 1, 52) || !dtrNums.has(d)) err(s, `${ou} : page DTR ${d} inexistante`);
  }
  if (new Set(q.dtr).size !== q.dtr.length) err(s, `${ou} : page DTR en double`);
  if (!s.pagesSujet.some(p => p.num === q.pageSujet)) err(s, `${ou} : page du sujet ${q.pageSujet} inexistante`);
  if (q.image) imageExiste(s, q.image.src, `${ou} image`);

  switch (q.type) {
    case 'cocher': {
      if (q.bonnes.length === 0) err(s, `${ou} : aucune bonne réponse`);
      if (q.bonnes.some(i => !dans(i, 0, q.options.length - 1))) err(s, `${ou} : index de bonne réponse hors options`);
      if (q.bonnes.length > 1 && !q.multiple) err(s, `${ou} : plusieurs bonnes réponses sans « multiple »`);
      break;
    }
    case 'relier': {
      if (q.liens.length !== q.gauche.length) err(s, `${ou} : ${q.liens.length} liens pour ${q.gauche.length} éléments à gauche`);
      if (q.liens.some(l => !dans(l, 0, q.droite.length - 1))) err(s, `${ou} : lien vers un élément de droite inexistant`);
      break;
    }
    case 'ordonner': {
      const tri = [...q.rangs].sort((a, b) => a - b);
      if (q.rangs.length !== q.items.length || tri.some((r, i) => r !== i + 1)) err(s, `${ou} : rangs non conformes (${q.rangs.join(', ')})`);
      break;
    }
    case 'valeur': {
      if (q.champs.length === 0) err(s, `${ou} : aucun champ`);
      const ids = new Set<string>();
      for (const c of q.champs) {
        if (ids.has(c.id)) err(s, `${ou} : champ « ${c.id} » en double`);
        ids.add(c.id);
        if (!estNote(c)) err(s, `${ou} : champ « ${c.id} » sans attendu ni acceptés`);
      }
      break;
    }
    case 'calcul': {
      if (!Number.isFinite(q.attendu)) err(s, `${ou} : attendu manquant`);
      if (!(q.tolerance >= 0)) err(s, `${ou} : tolérance invalide`);
      if (!q.formule.trim()) err(s, `${ou} : formule vide`);
      break;
    }
    case 'tableau': {
      const ids = new Set<string>();
      let notees = 0;
      q.lignes.forEach((l, il) => {
        if (l.cellules.length !== q.colonnes.length) err(s, `${ou} : ligne ${il + 1} à ${l.cellules.length} cellules pour ${q.colonnes.length} colonnes`);
        for (const c of l.cellules) {
          if (typeof c === 'string') continue;
          const cs = c as CelluleSaisie;
          if (ids.has(cs.id)) err(s, `${ou} : cellule « ${cs.id} » en double`);
          ids.add(cs.id);
          if (estNote(cs)) notees += 1;
          // Seules les cellules « libres » (justification) sont non notées : elles portent un placeholder.
          else if (!cs.placeholder) err(s, `${ou} : cellule « ${cs.id} » sans attendu (ni placeholder de cellule libre)`);
          if (cs.choix && cs.acceptes && !cs.acceptes.every(a => cs.choix!.includes(a))) err(s, `${ou} : cellule « ${cs.id} » : réponse acceptée hors de la liste de choix`);
        }
      });
      if (notees === 0) err(s, `${ou} : tableau sans aucune cellule notée`);
      break;
    }
    case 'redige': {
      if (q.motsCles.length === 0) err(s, `${ou} : aucun mot-clé`);
      if (q.minMotsCles < 1 || q.minMotsCles > q.motsCles.length) err(s, `${ou} : minMotsCles hors bornes`);
      if (!q.corrige.trim()) err(s, `${ou} : corrigé vide`);
      break;
    }
    case 'bulles': {
      imageExiste(s, q.plan.src, `${ou} plan`);
      const ids = new Set<string>();
      for (const b of q.bulles) {
        if (ids.has(b.id)) err(s, `${ou} : bulle « ${b.id} » en double`);
        ids.add(b.id);
        if (!dans(b.x, 0, 100) || !dans(b.y, 0, 100)) err(s, `${ou} : bulle « ${b.id} » hors image (${b.x}, ${b.y})`);
        if (!b.attendu) err(s, `${ou} : bulle « ${b.id} » sans attendu`);
        if (q.choix && !q.choix.includes(b.attendu)) err(s, `${ou} : bulle « ${b.id} » : attendu hors des choix`);
      }
      break;
    }
    case 'cavaliers': {
      for (const c of q.composants) {
        for (const p of c.positions) {
          if (p.attendu == null || p.attendu === '') err(s, `${ou} : ${c.id}.${p.id} sans attendu`);
          if (q.valeurs && !q.valeurs.includes(p.attendu)) err(s, `${ou} : ${c.id}.${p.id} = « ${p.attendu} » absent des valeurs proposées`);
        }
      }
      break;
    }
    case 'schema': {
      const attendus = PLATINES[s.id] ?? [];
      if (!attendus.includes(q.platineTpId)) err(s, `${ou} : platineTpId « ${q.platineTpId} » inattendu (attendus : ${attendus.join(', ')})`);
      imageExiste(s, q.corrigeImage.src, `${ou} corrigé`);
      const im = q.traits.image;
      if (imageExiste(s, im.src, `${ou} schéma`)) {
        const t = tailleJpeg(join(PUBLIC, im.src));
        if (t && (t.w !== im.w || t.h !== im.h)) err(s, `${ou} : dimensions déclarées ${im.w}×${im.h} ≠ fichier ${t.w}×${t.h}`);
      }
      const bornes = new Set<string>();
      for (const b of q.traits.bornes) {
        if (bornes.has(b.id)) err(s, `${ou} : borne « ${b.id} » en double`);
        bornes.add(b.id);
        if (!dans(b.x, 0, 100) || !dans(b.y, 0, 100)) err(s, `${ou} : borne « ${b.id} » hors image (${b.x}, ${b.y})`);
      }
      const couleurs = new Set(q.traits.couleurs.map(c => c.id));
      const vues = new Set<string>();
      for (const l of q.traits.attendues) {
        if (!bornes.has(l.a) || !bornes.has(l.b)) err(s, `${ou} : liaison ${l.a}–${l.b} vers une borne inconnue`);
        if (l.a === l.b) err(s, `${ou} : liaison ${l.a}–${l.b} sur elle-même`);
        const k = l.a < l.b ? `${l.a}|${l.b}` : `${l.b}|${l.a}`;
        if (vues.has(k)) err(s, `${ou} : liaison ${l.a}–${l.b} en double`);
        vues.add(k);
        if (l.couleur && !couleurs.has(l.couleur)) err(s, `${ou} : couleur « ${l.couleur} » non proposée`);
      }
      // Réseaux (correction par équipotentielle) : bornes connues, disjoints, et chaque
      // liaison attendue interne à un seul réseau.
      if (q.traits.reseaux) {
        const reseauDe = new Map<string, number>();
        q.traits.reseaux.forEach((r, ir) => {
          const nom = r.label ?? `réseau ${ir + 1}`;
          if (r.bornes.length < 2) err(s, `${ou} : ${nom} a moins de 2 bornes`);
          if (r.couleur && !couleurs.has(r.couleur)) err(s, `${ou} : ${nom} : couleur « ${r.couleur} » non proposée`);
          for (const b of r.bornes) {
            if (!bornes.has(b)) err(s, `${ou} : ${nom} : borne « ${b} » inconnue`);
            if (reseauDe.has(b)) err(s, `${ou} : borne « ${b} » dans deux réseaux (${reseauDe.get(b)! + 1} et ${ir + 1})`);
            else reseauDe.set(b, ir);
          }
        });
        for (const l of q.traits.attendues) {
          const ra = reseauDe.get(l.a);
          const rb = reseauDe.get(l.b);
          if (ra == null || rb == null) err(s, `${ou} : liaison attendue ${l.a}–${l.b} hors de tout réseau`);
          else if (ra !== rb) err(s, `${ou} : liaison attendue ${l.a}–${l.b} entre deux réseaux (${ra + 1} et ${rb + 1})`);
          else {
            const rc = q.traits.reseaux[ra].couleur;
            if (l.couleur && rc && l.couleur !== rc) err(s, `${ou} : liaison ${l.a}–${l.b} en « ${l.couleur} » dans un réseau « ${rc} »`);
          }
        }
        console.log(`  Q${q.num} : ${q.traits.reseaux.length} réseaux, ${q.traits.attendues.length} liaisons attendues`);
      }
      break;
    }
  }
}

function auditSujet(s: SujetNumerique) {
  const nb = NB_QUESTIONS[s.id];
  if (nb != null && s.questions.length !== nb) err(s, `${s.questions.length} questions au lieu de ${nb}`);
  s.questions.forEach((q, i) => { if (q.num !== i + 1) err(s, `question en position ${i + 1} numérotée Q${q.num}`); });

  s.dtr.forEach((p, i) => {
    if (p.num !== i + 1) err(s, `DTR en position ${i + 1} numérotée ${p.num}`);
    if (!p.titre.trim()) err(s, `DTR ${p.num} sans titre`);
    imageExiste(s, p.src, `DTR ${p.num}`);
  });
  s.pagesSujet.forEach((p, i) => {
    if (p.num !== i + 1) err(s, `page du sujet en position ${i + 1} numérotée ${p.num}`);
    imageExiste(s, p.src, `page du sujet ${p.num}`);
  });
  s.parties.forEach((p, i) => {
    if (p.num !== i + 1) err(s, `partie en position ${i + 1} numérotée ${p.num}`);
    for (const d of p.dtrPages) if (!s.dtr.some(x => x.num === d)) err(s, `partie ${p.num} : page DTR ${d} inexistante`);
    if (!s.questions.some(q => q.partie === p.num)) err(s, `partie ${p.num} sans question`);
  });

  const dtrNums = new Set(s.dtr.map(p => p.num));
  for (const q of s.questions) auditQuestion(s, q, dtrNums);

  // Chaque TP platine attendu est utilisé une fois et une seule.
  const platines = s.questions.flatMap(q => (q.type === 'schema' ? [q.platineTpId] : []));
  for (const id of PLATINES[s.id] ?? []) {
    const n = platines.filter(p => p === id).length;
    if (n !== 1) err(s, `TP platine « ${id} » utilisé ${n} fois`);
  }

  const total = s.questions.reduce((a, q) => a + q.points, 0);
  const parType = s.questions.reduce<Record<string, number>>((a, q) => ({ ...a, [q.type]: (a[q.type] ?? 0) + 1 }), {});
  console.log(`• ${s.id} : ${s.questions.length} questions, ${s.dtr.length} pages DTR, ${s.pagesSujet.length} pages du sujet, ${total} points`);
  console.log(`  outils : ${Object.entries(parType).map(([t, n]) => `${t} ${n}`).join(' · ')}`);
  console.log(`  parties : ${s.parties.map(p => `P${p.num} ${s.questions.filter(q => q.partie === p.num).reduce((a, q) => a + q.points, 0)} pts`).join(' · ')}`);
}

if (SUJETS.length === 0) { console.error('✗ aucun sujet enregistré dans SUJETS'); process.exit(1); }
const idsVus = new Set<string>();
for (const s of SUJETS) {
  if (idsVus.has(s.id)) err(s, 'identifiant de sujet en double');
  idsVus.add(s.id);
  auditSujet(s);
}

if (erreurs) { console.error(`\n${erreurs} erreur(s).`); process.exit(1); }
console.log('\n✓ Sujets numériques cohérents.');
