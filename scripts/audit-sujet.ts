/**
 * Contrôle de cohérence des sujets numériques (`src/lib/data/sujets/`) — à lancer avant
 * toute livraison :
 *
 *     npx tsx scripts/audit-sujet.ts
 *
 * Vérifie, pour chaque sujet (sujets complets ET sujets thématiques dérivés) : numérotation
 * des questions, repères hiérarchiques (`label`) uniques, pages DTR et pages du sujet existantes,
 * documents DTR (`doc`) cohérents (pages d'un même document contiguës), images présentes dans
 * `public/` sous le dossier d'images DU SUJET (déduit de ses pages : `/tp/<dossier>/`) et
 * dimensions déclarées des schémas / plans conformes au fichier, identifiants de TP platine
 * attendus, réponses attendues présentes pour les outils corrigés automatiquement, liens / rangs /
 * bulles / bornes / placements cohérents (attendus, zone, tolérance dans 0..1, `max` ≥ attendus),
 * tableaux de contexte réguliers ; pour un sujet thématique : questions reprises telles quelles du
 * sujet complet (ni copiées ni renumérotées), barème attendu, DTR réduit au thème (documents
 * entiers pour un DTR numéroté par document).
 *
 * Anonymisation : aucune donnée servie au navigateur ne doit permettre de retrouver l'origine
 * du sujet. Les termes d'origine ne sont écrits nulle part en clair : `termesInterdits`
 * (`scripts/anonymisation/verif.ts`) les reconnaît par empreinte. Sont contrôlés : toutes les
 * chaînes des sujets (récursivement), celles des TP platine, les fichiers sources du sujet
 * numérique (données, moteur, interface, routes, TP platine de chaque dossier) et les NOMS des
 * fichiers de chaque dossier d'images public.
 *
 * Corrigé côté serveur : le sujet PUBLIC (`sujetPublic`) de chaque sujet ne contient aucune clé
 * de corrigé ; aucun fichier `'use client'` n'importe, même indirectement, les données
 * (`src/lib/data/sujets`) ni les modules serveur (`src/lib/sujet/server`) ; les métadonnées
 * servies aux pages clientes (`src/lib/sujet/meta.ts`, FICHIER GÉNÉRÉ) sont à jour — sinon :
 *
 *     npx tsx scripts/audit-sujet.ts --meta     (régénère meta.ts)
 *
 * Images de corrigé : dans `private/corriges/<sujet>/` (route gardée `/api/sujet/image`), aucune
 * dans les dossiers publics des sujets ni dans les documents des TP platine.
 *
 * Aides graduées : 3 par question (données ou défaut) ; avertissement si une aide contient une
 * réponse acceptée de la question.
 *
 * Les TP platine eux-mêmes (câblage, mesures) sont vérifiés par `audit-tps.ts`.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { SUJETS, TOUS_SUJETS, sujetById } from '@/lib/data/sujets';
import { tpById } from '@/lib/data/tps';
import type { CelluleSaisie, SujetNumerique, SujetQuestion } from '@/lib/sujet/types';
import { clesCorrigePresentes, sujetPublic } from '@/lib/sujet/public';
import { aidesQuestion } from '@/lib/sujet/server/aides';
import { normTexte } from '@/lib/sujet/normalize';
import { termesInterdits } from './anonymisation/verif';

const RACINE = join(__dirname, '..');
const PUBLIC = join(RACINE, 'public');

/**
 * TP platine attendus par sujet complet (mode « câblage réel » des questions schéma). Un sujet
 * absent de cette table : ses TP platine doivent au moins être préfixés par son identifiant.
 */
const PLATINES: Record<string, string[]> = {
  eip: ['eip-q13-cumulus', 'eip-q58-myhome', 'eip-q67-vigik'],
  scierie: ['scierie-d31-atv340', 'scierie-e343-dc'],
};
/** Nombre de questions attendu par sujet complet. */
const NB_QUESTIONS: Record<string, number> = { eip: 72, scierie: 76 };
/** Barème attendu par sujet (complet et thématiques), quand il est arrêté. */
const POINTS: Record<string, number> = {
  eip: 98, 'eip-habilitations': 20, 'eip-eclairage': 31, 'eip-myhome': 28, 'eip-vigik': 19,
};
/** Sources servies au navigateur pour un sujet numérique (fichiers ou dossiers, depuis la racine) ; s'y ajoutent les TP platine. */
const SOURCES = ['src/lib/data/sujets', 'src/components/sujet', 'src/lib/sujet', 'src/app/sujet', 'src/app/prof/sujet'];

/**
 * Dossier public des images d'un sujet complet, déduit de ses pages : `/tp/<dossier>/` commun à la
 * première page DTR (ou du sujet). Un sujet thématique utilise celui de son parent.
 */
function dossierImages(s: SujetNumerique): string | null {
  const base = s.parent ? sujetById(s.parent) ?? s : s;
  const src = base.dtr[0]?.src ?? base.pagesSujet[0]?.src;
  const m = src?.match(/^(\/tp\/[^/]+\/)/);
  return m ? m[1] : null;
}

let erreurs = 0;
const err = (s: SujetNumerique, msg: string) => { erreurs += 1; console.error(`✗ [${s.id}] ${msg}`); };

/** Dimensions d'une image JPEG (marqueur SOF) ou PNG (en-tête IHDR), ou null. */
function tailleImage(fichier: string): { w: number; h: number } | null {
  const b = readFileSync(fichier);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
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
  const dossier = dossierImages(s);
  if (!dossier) err(s, `${ou} : dossier d'images du sujet introuvable (pages DTR sous /tp/<dossier>/)`);
  else if (!src.startsWith(dossier)) err(s, `${ou} : image hors du dossier ${dossier} « ${src} »`);
  if (!existsSync(join(PUBLIC, src))) { err(s, `${ou} : image absente de public/ « ${src} »`); return false; }
  return true;
}

const dans = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
const estNote = (c: { attendu?: number; acceptes?: string[] }) => c.attendu != null || (c.acceptes != null && c.acceptes.length > 0);

function auditQuestion(s: SujetNumerique, q: SujetQuestion, dtrNums: Set<number>) {
  const ou = q.label ? `${q.label} (Q${q.num})` : `Q${q.num}`;
  if (!s.parties.some(p => p.num === q.partie)) err(s, `${ou} : partie ${q.partie} inconnue`);
  const partie = s.parties.find(p => p.num === q.partie);
  if (partie && !partie.competences.includes(q.competence)) err(s, `${ou} : compétence ${q.competence} absente de la partie ${q.partie}`);
  if (!(q.points > 0)) err(s, `${ou} : points invalides (${q.points})`);
  if (!q.enonce.trim()) err(s, `${ou} : énoncé vide`);
  for (const d of q.dtr) {
    if (!Number.isInteger(d) || d < 1 || !dtrNums.has(d)) err(s, `${ou} : page DTR ${d} inexistante`);
  }
  if (new Set(q.dtr).size !== q.dtr.length) err(s, `${ou} : page DTR en double`);
  if (!s.pagesSujet.some(p => p.num === q.pageSujet)) err(s, `${ou} : page du sujet ${q.pageSujet} inexistante`);
  if (q.image) imageExiste(s, q.image.src, `${ou} image`);
  if (q.label != null && !/^[A-Z](\.\d+)+$/.test(q.label)) err(s, `${ou} : repère « ${q.label} » mal formé (attendu : « A.2.1.1 »)`);
  if (q.tableauContexte) {
    const t = q.tableauContexte;
    if (!t.colonnes.length || !t.lignes.length) err(s, `${ou} : tableau de contexte vide`);
    t.lignes.forEach((l, i) => { if (l.length !== t.colonnes.length) err(s, `${ou} : tableau de contexte, ligne ${i + 1} à ${l.length} cellules pour ${t.colonnes.length} colonnes`); });
  }

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
    case 'placement': {
      if (!['luminaire', 'croix', 'point'].includes(q.symbole)) err(s, `${ou} : symbole « ${q.symbole} » inconnu`);
      if (imageExiste(s, q.plan.src, `${ou} plan`)) {
        const t = tailleImage(join(PUBLIC, q.plan.src));
        if (t && (t.w !== q.plan.w || t.h !== q.plan.h)) err(s, `${ou} : dimensions du plan déclarées ${q.plan.w}×${q.plan.h} ≠ fichier ${t.w}×${t.h}`);
      }
      if (q.attendus.length === 0) err(s, `${ou} : aucun repère attendu`);
      const z = q.zone;
      if (z && (![z.x0, z.y0, z.x1, z.y1].every(v => dans(v, 0, 1)) || z.x0 >= z.x1 || z.y0 >= z.y1)) err(s, `${ou} : zone hors de 0..1 ou vide`);
      q.attendus.forEach((a, i) => {
        if (!dans(a.x, 0, 1) || !dans(a.y, 0, 1)) err(s, `${ou} : attendu ${i + 1} hors image (${a.x}, ${a.y})`);
        else if (z && (a.x < z.x0 || a.x > z.x1 || a.y < z.y0 || a.y > z.y1)) err(s, `${ou} : attendu ${i + 1} hors de la zone`);
      });
      if (!(q.tolerance.x > 0 && q.tolerance.x <= 1 && q.tolerance.y > 0 && q.tolerance.y <= 1)) err(s, `${ou} : tolérance hors de ]0..1]`);
      // Deux attendus dans la même ellipse de tolérance rendraient l'appariement ambigu.
      q.attendus.forEach((a, i) => q.attendus.slice(i + 1).forEach((b, k) => {
        if (Math.hypot((a.x - b.x) / q.tolerance.x, (a.y - b.y) / q.tolerance.y) <= 1) err(s, `${ou} : attendus ${i + 1} et ${i + k + 2} dans la même tolérance`);
      }));
      if (q.max != null && (!Number.isInteger(q.max) || q.max < q.attendus.length)) err(s, `${ou} : max ${q.max} < ${q.attendus.length} attendus`);
      const ids = new Set<string>();
      for (const c of q.champs ?? []) {
        if (ids.has(c.id)) err(s, `${ou} : champ « ${c.id} » en double`);
        ids.add(c.id);
        if (!estNote(c)) err(s, `${ou} : champ « ${c.id} » sans attendu ni acceptés`);
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
      const baseId = s.parent ?? s.id;
      const attendus = PLATINES[baseId];
      if (attendus && !attendus.includes(q.platineTpId)) err(s, `${ou} : platineTpId « ${q.platineTpId} » inattendu (attendus : ${attendus.join(', ')})`);
      if (!attendus && !q.platineTpId.startsWith(`${baseId}-`)) err(s, `${ou} : platineTpId « ${q.platineTpId} » non préfixé par « ${baseId}- »`);
      // Image du corrigé : dans le dossier PRIVÉ (`private/corriges/<sujet>/`), jamais dans public/.
      if (!q.corrigeImage.src.startsWith(`corriges/${baseId}/`)) err(s, `${ou} : image du corrigé hors de private/corriges/${baseId}/ « ${q.corrigeImage.src} »`);
      else if (!existsSync(join(RACINE, 'private', q.corrigeImage.src))) err(s, `${ou} : image du corrigé absente de private/ « ${q.corrigeImage.src} »`);
      const im = q.traits.image;
      if (imageExiste(s, im.src, `${ou} schéma`)) {
        const t = tailleImage(join(PUBLIC, im.src));
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
        console.log(`  ${ou} : ${q.traits.reseaux.length} réseaux, ${q.traits.attendues.length} liaisons attendues`);
      }
      break;
    }
  }
}

function auditSujet(s: SujetNumerique) {
  const nb = NB_QUESTIONS[s.id];
  if (nb != null && s.questions.length !== nb) err(s, `${s.questions.length} questions au lieu de ${nb}`);
  // Sujet complet : Q1, Q2… sans trou. Sujet thématique : numéros du papier, croissants.
  s.questions.forEach((q, i) => {
    if (!s.parent && q.num !== i + 1) err(s, `question en position ${i + 1} numérotée Q${q.num}`);
    if (i > 0 && q.num <= s.questions[i - 1].num) err(s, `Q${q.num} après Q${s.questions[i - 1].num}`);
  });

  // Repères hiérarchiques : uniques ; tous présents ou tous absents (sujet complet).
  const labels = s.questions.map(q => q.label).filter((l): l is string => l != null);
  if (labels.length && labels.length !== s.questions.length) err(s, `${s.questions.length - labels.length} question(s) sans repère alors que d'autres en ont`);
  const doublons = labels.filter((l, i) => labels.indexOf(l) !== i);
  if (doublons.length) err(s, `repère(s) en double : ${Array.from(new Set(doublons)).join(', ')}`);

  // Pages : numérotation du papier conservée (pages de garde retirées), strictement croissante.
  s.dtr.forEach((p, i) => {
    if (!Number.isInteger(p.num) || p.num < 1 || (i > 0 && p.num <= s.dtr[i - 1].num)) err(s, `DTR en position ${i + 1} numérotée ${p.num}`);
    if (!p.titre.trim()) err(s, `DTR ${p.num} sans titre`);
    imageExiste(s, p.src, `DTR ${p.num}`);
  });
  // DTR numéroté par document : documents croissants, pages d'un document contiguës ; une page sans
  // `doc` (sommaire…) est admise comme page hors numérotation (signalée).
  if (s.dtr.some(p => p.doc != null)) {
    const sansDoc = s.dtr.filter(p => p.doc == null).map(p => p.num);
    if (sansDoc.length && !s.parent) console.log(`  pages DTR hors numérotation (sans doc) : ${sansDoc.join(', ')}`);
    const vus = new Set<number>();
    s.dtr.forEach((p, i) => {
      if (p.doc == null) return;
      if (!Number.isInteger(p.doc) || p.doc < 1) err(s, `DTR page ${p.num} : document ${p.doc} invalide`);
      const prec = s.dtr[i - 1]?.doc;
      if (prec !== p.doc) {
        if (vus.has(p.doc)) err(s, `DTR ${p.doc} : pages non contiguës (reprise à la page ${p.num})`);
        if (prec != null && p.doc < prec) err(s, `DTR ${p.doc} après DTR ${prec} (page ${p.num})`);
        vus.add(p.doc);
      }
    });
  }
  s.pagesSujet.forEach((p, i) => {
    if (i > 0 && p.num <= s.pagesSujet[i - 1].num) err(s, `page du sujet en position ${i + 1} numérotée ${p.num}`);
    imageExiste(s, p.src, `page du sujet ${p.num}`);
  });
  s.parties.forEach((p, i) => {
    if (!s.parent && p.num !== i + 1) err(s, `partie en position ${i + 1} numérotée ${p.num}`);
    for (const d of p.dtrPages) if (!s.dtr.some(x => x.num === d)) err(s, `partie ${p.num} : page DTR ${d} inexistante`);
    if (!s.questions.some(q => q.partie === p.num)) err(s, `partie ${p.num} sans question`);
  });

  const dtrNums = new Set(s.dtr.map(p => p.num));
  for (const q of s.questions) auditQuestion(s, q, dtrNums);

  // Chaque TP platine attendu est utilisé une fois et une seule (sujet complet).
  const platines = s.questions.flatMap(q => (q.type === 'schema' ? [q.platineTpId] : []));
  for (const id of s.parent ? [] : PLATINES[s.id] ?? []) {
    const n = platines.filter(p => p === id).length;
    if (n !== 1) err(s, `TP platine « ${id} » utilisé ${n} fois`);
  }
  for (const id of Array.from(new Set(platines))) {
    if (!tpById(id)) err(s, `TP platine « ${id} » absent de TPS`);
    else if (!tpById(id)!.hidden) err(s, `TP platine « ${id} » non caché (hidden) : il apparaîtrait au catalogue`);
  }

  if (s.parent) auditDerive(s);

  const total = s.questions.reduce((a, q) => a + q.points, 0);
  if (POINTS[s.id] != null && Math.abs(total - POINTS[s.id]) > 1e-9) err(s, `barème ${total} points au lieu de ${POINTS[s.id]}`);
  const parType = s.questions.reduce<Record<string, number>>((a, q) => ({ ...a, [q.type]: (a[q.type] ?? 0) + 1 }), {});
  console.log(`• ${s.id} : ${s.questions.length} questions, ${s.dtr.length} pages DTR, ${s.pagesSujet.length} pages du sujet, ${total} points`);
  console.log(`  outils : ${Object.entries(parType).map(([t, n]) => `${t} ${n}`).join(' · ')}`);
  console.log(`  parties : ${s.parties.map(p => `P${p.num} ${s.questions.filter(q => q.partie === p.num).reduce((a, q) => a + q.points, 0)} pts`).join(' · ')}`);
}

/** Sujet thématique : tiré de son parent sans copie ni renumérotation, DTR réduit au thème. */
function auditDerive(s: SujetNumerique) {
  const parent = sujetById(s.parent!);
  if (!parent || parent.parent) { err(s, `sujet parent « ${s.parent} » introuvable (ou lui-même dérivé)`); return; }
  const decl = parent.declinaisons?.find(d => d.id === s.id);
  if (!decl) { err(s, `absent des déclinaisons de « ${parent.id} »`); return; }
  if (!s.themes?.includes(decl.theme)) err(s, `thème « ${decl.theme} » non porté`);
  const attendues = parent.questions.filter(q => decl.parties.includes(q.partie));
  if (attendues.length !== s.questions.length || attendues.some((q, i) => s.questions[i] !== q)) {
    err(s, 'questions différentes de celles des parties du sujet complet (copie, oubli ou renumérotation)');
  }
  for (const q of s.questions) {
    for (const d of q.dtr) if (!s.dtr.some(p => p.num === d)) err(s, `Q${q.num} : page DTR ${d} absente du DTR du thème`);
  }
  const utiles = new Set([...s.parties.flatMap(p => p.dtrPages), ...s.questions.flatMap(q => q.dtr)]);
  // DTR par document : un document utile est gardé en entier.
  const docsUtiles = new Set(s.dtr.filter(p => utiles.has(p.num) && p.doc != null).map(p => p.doc!));
  for (const p of s.dtr) {
    if (!(p.doc != null ? docsUtiles.has(p.doc) : utiles.has(p.num))) err(s, `DTR ${p.num} sans rapport avec le thème`);
  }
  if (s.dtr.some(p => p.doc != null)) {
    for (const d of Array.from(docsUtiles)) {
      const n = parent.dtr.filter(p => p.doc === d).length;
      if (s.dtr.filter(p => p.doc === d).length !== n) err(s, `DTR ${d} incomplet dans le thème`);
    }
  }
  if (s.dureeMin !== decl.dureeMin) err(s, `durée ${s.dureeMin} min au lieu de ${decl.dureeMin}`);
}

/* ───────────────────────────── anonymisation ───────────────────────────── */

/** Toutes les chaînes d'une valeur (objets et tableaux parcourus récursivement). */
function chaines(v: unknown, out: string[] = [], vus = new Set<unknown>()): string[] {
  if (typeof v === 'string') out.push(v);
  else if (v && typeof v === 'object' && !vus.has(v)) {
    vus.add(v);
    for (const x of Array.isArray(v) ? v : Object.values(v)) chaines(x, out, vus);
  }
  return out;
}

function fichiers(chemin: string): string[] {
  if (!existsSync(chemin)) return [];
  if (!statSync(chemin).isDirectory()) return [chemin];
  return readdirSync(chemin).flatMap(f => fichiers(join(chemin, f)));
}

function auditAnonymat() {
  let ko = 0;
  // Les termes trouvés ne sont pas recopiés dans la sortie : on dit OÙ ils sont (ligne, question).
  const signaler = (ou: string, t: string[], ouPrecis = '') => {
    if (!t.length) return;
    ko += 1; erreurs += 1;
    console.error(`✗ [anonymat] ${ou} : ${t.length} terme(s) d'origine${ouPrecis ? ` — ${ouPrecis}` : ''}`);
  };
  const lignesFautives = (texte: string) => texte.split('\n')
    .map((l, i) => (termesInterdits(l).length ? i + 1 : 0)).filter(Boolean);
  // 1. Données des sujets (complets et thématiques).
  for (const s of TOUS_SUJETS) {
    const ou = s.questions.filter(q => termesInterdits(chaines(q).join('\n')).length).map(q => q.label ?? `Q${q.num}`);
    signaler(`sujet ${s.id}`, termesInterdits(chaines(s).join('\n')), ou.length ? `questions ${ou.join(', ')}` : 'hors questions');
  }
  // 2. TP platine : textes servis au navigateur.
  const platines = new Set(TOUS_SUJETS.flatMap(s => s.questions.flatMap(q => (q.type === 'schema' ? [q.platineTpId] : []))));
  for (const id of Array.from(platines)) {
    const tp = tpById(id);
    if (!tp) continue;
    const champs = [tp.id, tp.title, tp.level, tp.summary, tp.situation, tp.plaqueTitre, tp.plaque, tp.cahierDesCharges, tp.libelles, tp.schemaImage];
    signaler(`TP ${id}`, termesInterdits(chaines(champs).join('\n')));
  }
  // 3. Sources du sujet numérique (données, moteur, interface, routes, TP platine de chaque dossier).
  let nbSources = 0;
  const sourcesTp = Array.from(platines).map(id => `src/lib/data/tps/${id}.ts`).filter(f => existsSync(join(RACINE, f)));
  for (const f of [...SOURCES, ...sourcesTp].flatMap(x => fichiers(join(RACINE, x)))) {
    nbSources += 1;
    const texte = readFileSync(f, 'utf8');
    signaler(relative(RACINE, f), termesInterdits(texte), `ligne(s) ${lignesFautives(texte).join(', ')}`);
  }
  // 4. Noms des fichiers de chaque dossier d'images public (un par sujet complet).
  let nbImages = 0;
  const dossiers = Array.from(new Set(SUJETS.map(dossierImages).filter((d): d is string => !!d)));
  for (const d of dossiers) {
    for (const f of fichiers(join(PUBLIC, d))) {
      nbImages += 1;
      signaler(`public${d}${relative(join(PUBLIC, d), f)}`, termesInterdits(relative(PUBLIC, f).replace(/[/._-]+/g, ' ')));
    }
  }
  console.log(`• anonymat : ${TOUS_SUJETS.length} sujets, ${platines.size} TP platine, ${nbSources} fichiers sources, ${nbImages} noms d'images${ko ? ` — ${ko} en défaut` : ' — aucun terme d’origine'}`);
}

/* ───────────────────────────── corrigé côté serveur ───────────────────────────── */

const FICHIER_META = join(RACINE, 'src/lib/sujet/meta.ts');

/** Contenu de `src/lib/sujet/meta.ts` : métadonnées (sans corrigé) de chaque sujet. */
function contenuMeta(): string {
  const metas = TOUS_SUJETS.map(s => ({
    id: s.id, titre: s.titre, parent: s.parent ?? null, dureeMin: s.dureeMin,
    questions: s.questions.length, points: Math.round(s.questions.reduce((a, q) => a + q.points, 0) * 100) / 100,
  }));
  return `/**
 * Métadonnées des sujets numériques pour les pages CLIENTES (catalogue élève, espace élève,
 * tableau de bord et bilans professeur) : titre, parent, durée, nombre de questions, barème.
 * Aucun corrigé : les données complètes (\`src/lib/data/sujets\`) restent côté serveur.
 *
 * FICHIER GÉNÉRÉ — ne pas modifier à la main : \`npx tsx scripts/audit-sujet.ts --meta\`
 * (l'audit vérifie qu'il est à jour).
 */

export interface SujetMeta {
  id: string;
  titre: string;
  /** Sujet complet dont un sujet thématique est tiré. */
  parent: string | null;
  dureeMin: number;
  questions: number;
  points: number;
}

export const META_SUJETS: SujetMeta[] = ${JSON.stringify(metas, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:').replace(/"/g, "'")};

const PAR_ID = new Map(META_SUJETS.map(s => [s.id, s]));

/** Métadonnées d'un sujet numérique (complet ou thématique), ou undefined (TP). */
export const metaSujet = (id: string): SujetMeta | undefined => PAR_ID.get(id);
`;
}

/** Le sujet public ne révèle aucune réponse ; les aides sont complètes et ne recopient pas la réponse. */
function auditPublic() {
  let avert = 0;
  for (const s of TOUS_SUJETS) {
    const fautes = clesCorrigePresentes(sujetPublic(s));
    if (fautes.length) err(s, `sujet public : clé(s) de corrigé ${fautes.slice(0, 5).join(', ')}${fautes.length > 5 ? '…' : ''}`);
    if (s.parent) continue;
    for (const q of s.questions) {
      const ou = q.label ? `${q.label} (Q${q.num})` : `Q${q.num}`;
      if (q.aides && q.aides.length !== 3) err(s, `${ou} : ${q.aides.length} aide(s) au lieu de 3`);
      const aides = aidesQuestion(s, q);
      if (aides.length !== 3 || aides.some(a => !a.trim())) err(s, `${ou} : aides incomplètes`);
      const reponses = new Set<string>();
      const ajouter = (v?: string[]) => (v ?? []).forEach(x => { const n = normTexte(x); if (n.length >= 4) reponses.add(n); });
      if (q.type === 'valeur' || q.type === 'placement') (q.champs ?? []).forEach(c => ajouter(c.acceptes));
      if (q.type === 'tableau') q.lignes.forEach(l => l.cellules.forEach(c => { if (typeof c !== 'string' && !c.choix) ajouter(c.acceptes); }));
      if (q.type === 'bulles') q.bulles.forEach(b => ajouter([b.attendu, ...(b.acceptes ?? [])]));
      for (const [i, a] of Array.from((q.aides ?? []).entries())) {
        const n = normTexte(a);
        const trouvees = Array.from(reponses).filter(r => n.includes(r));
        if (trouvees.length) { avert += 1; console.warn(`⚠ [${s.id}] ${ou} : l'aide ${i + 1} contient une réponse acceptée`); }
      }
    }
  }
  // Images de corrigé : aucune dans les dossiers publics des sujets ; TP platine sans image de corrigé.
  for (const d of Array.from(new Set(SUJETS.map(dossierImages).filter((x): x is string => !!x)))) {
    for (const f of fichiers(join(PUBLIC, d))) {
      if (/corrig/i.test(relative(PUBLIC, f))) { erreurs += 1; console.error(`✗ [corrigé] image de corrigé publique : public/${relative(PUBLIC, f)}`); }
    }
  }
  const platines = new Set(TOUS_SUJETS.flatMap(s => s.questions.flatMap(q => (q.type === 'schema' ? [q.platineTpId] : []))));
  for (const id of Array.from(platines)) {
    const tp = tpById(id);
    const images = chaines([tp?.schemaImage, tp?.preparation]).filter(x => /\.(jpe?g|png|webp)$/i.test(x));
    for (const im of images) if (/corrig/i.test(im)) { erreurs += 1; console.error(`✗ [corrigé] TP platine ${id} : document montré à l'élève « ${im} »`); }
  }
  console.log(`• sujet public : ${TOUS_SUJETS.length} sujets sans clé de corrigé, images de corrigé privées${avert ? ` — ${avert} aide(s) à relire` : ''}`);
}

/** Imports d'exécution (hors \`import type\`) d'un fichier source. */
function importsDe(texte: string): string[] {
  const out: string[] = [];
  const re = /(?:^|\n)\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texte))) out.push(m[1]);
  const dyn = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dyn.exec(texte))) out.push(m[1]);
  return out;
}

function resoudre(depuis: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(RACINE, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(depuis), spec);
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Aucun fichier \`'use client'\` n'atteint les données des sujets ni les modules serveur. */
function auditImportsClient() {
  const interdits = [join(RACINE, 'src/lib/data/sujets'), join(RACINE, 'src/lib/sujet/server')];
  const sources = fichiers(join(RACINE, 'src')).filter(f => /\.tsx?$/.test(f));
  const client = sources.filter(f => /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(readFileSync(f, 'utf8')));
  let ko = 0;
  for (const f of client) {
    // Parcours en largeur des imports d'exécution, avec le chemin pour le message.
    const vus = new Map<string, string | null>([[f, null]]);
    const file = [f];
    let fautif: string | null = null;
    while (file.length && !fautif) {
      const cur = file.shift()!;
      for (const spec of importsDe(readFileSync(cur, 'utf8'))) {
        const cible = resoudre(cur, spec);
        if (!cible || vus.has(cible)) continue;
        vus.set(cible, cur);
        if (interdits.some(d => cible.startsWith(d))) { fautif = cible; break; }
        file.push(cible);
      }
    }
    if (fautif) {
      ko += 1; erreurs += 1;
      const chaine: string[] = [];
      for (let x: string | null | undefined = fautif; x; x = vus.get(x)) chaine.unshift(relative(RACINE, x));
      console.error(`✗ [client] ${relative(RACINE, f)} importe le corrigé : ${chaine.join(' → ')}`);
    }
  }
  console.log(`• imports client : ${client.length} fichiers 'use client'${ko ? ` — ${ko} importent le corrigé` : ', aucun n’atteint src/lib/data/sujets ni src/lib/sujet/server'}`);
}

function auditMeta() {
  const attendu = contenuMeta();
  if (process.argv.includes('--meta')) {
    writeFileSync(FICHIER_META, attendu);
    console.log('• meta.ts régénéré');
    return;
  }
  if (!existsSync(FICHIER_META) || readFileSync(FICHIER_META, 'utf8') !== attendu) {
    erreurs += 1;
    console.error('✗ [meta] src/lib/sujet/meta.ts n’est pas à jour : npx tsx scripts/audit-sujet.ts --meta');
  } else console.log(`• meta.ts à jour (${TOUS_SUJETS.length} sujets)`);
}

if (SUJETS.length === 0) { console.error('✗ aucun sujet enregistré dans SUJETS'); process.exit(1); }
const idsVus = new Set<string>();
for (const s of TOUS_SUJETS) {
  if (idsVus.has(s.id)) err(s, 'identifiant de sujet en double');
  idsVus.add(s.id);
  auditSujet(s);
}
auditAnonymat();
auditPublic();
auditImportsClient();
auditMeta();

if (erreurs) { console.error(`\n${erreurs} erreur(s).`); process.exit(1); }
console.log('\n✓ Sujets numériques cohérents.');
