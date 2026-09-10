/**
 * Bibliothèque d'éléments (pack « Realistic Electrical Panels 2026 » + Logelec2).
 * Les planches détourées sont servies en JSON statique depuis `public/lib/<famille>.json`
 * et chargées à la demande (data URI), famille par famille.
 *
 * Contrat public :
 *   libraryIndex()                     → familles (41) et clés
 *   loadFamily(file)                   → charge (et met en cache) une famille
 *   loadLibraryItem(key)               → CatalogueItem, en chargeant sa famille si besoin
 *   libraryItemSync(key)               → CatalogueItem si la famille est déjà chargée, sinon null
 *   searchLibrary(q)                   → recherche par clé, nom (familles chargées) et famille
 */
import type { CatalogueItem, DeviceKind, LibraryFamily, LibraryItem } from '@/lib/types';
import index from './library-index.json';

const INDEX = index as LibraryFamily[];

/** Index des familles de la bibliothèque (41 familles). */
export function libraryIndex(): LibraryFamily[] {
  return INDEX;
}

/** Nature électrique plausible d'un élément, déduite de sa famille. */
const FAMILY_KIND: { re: RegExp; kind: DeviceKind }[] = [
  { re: /disjoncteurs? moteur/i, kind: 'motorcb' },
  { re: /différentiels|protections/i, kind: 'rcd' },
  { re: /disjoncteurs|fusibles|sectionneurs/i, kind: 'mcb' },
  { re: /contacteurs|commande industrielle|variateurs|démarreurs/i, kind: 'contactor' },
  { re: /automates|ihm|réseaux/i, kind: 'plc' },
  { re: /alimentations|transfo/i, kind: 'trafo' },
  { re: /comptage|mesure|contrôle|appareils de mesure/i, kind: 'meter' },
  { re: /borniers|répartition|barrettes|connecteurs/i, kind: 'terminal' },
  { re: /voyants|colonnes/i, kind: 'lamp' },
  { re: /boutons|commutateurs|capteurs|détecteurs|commande tertiaire/i, kind: 'button' },
  { re: /signalétique|repérage/i, kind: 'sign' },
  { re: /batteries|recharge/i, kind: 'battery' },
  { re: /ampoule|architectural|recepteurs|récepteurs|alarmes/i, kind: 'misc' },
  { re: /prises|interrupteurs|domotique|horloges|modulaire/i, kind: 'misc' },
];

export function kindForFamily(family: string): DeviceKind {
  return FAMILY_KIND.find((f) => f.re.test(family))?.kind ?? 'misc';
}

/** Nom lisible : « l_protecti_disjoncteur_16a » / « Disjoncteur · pl. 10 n°1 » → texte propre. */
function prettyName(it: LibraryItem): string {
  const raw = (it.name || it.key).replace(/_/g, ' ').trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Référence commerciale de substitution, stable et lisible (« DISJONCTEUR-16A », « PL.010-00 »). */
function refOf(key: string): string {
  const l = /^l_[a-z]+_(.+)$/.exec(key);
  if (l) return l[1].replace(/_/g, '-').toUpperCase();
  const p = /^p(\d+)_(\d+)$/.exec(key);
  if (p) return `PL.${p[1]}-${p[2]}`;
  return key.toUpperCase();
}

const cache = new Map<string, Record<string, LibraryItem>>();
/** file → famille, pour retrouver le libellé d'une famille chargée. */
const familyOfFile = new Map<string, string>(INDEX.map((f) => [f.file, f.family]));

/** Charge une famille (`/lib/<famille>.json`) et la met en cache. */
export async function loadFamily(file: string): Promise<Record<string, LibraryItem>> {
  const hit = cache.get(file);
  if (hit) return hit;
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Bibliothèque : ${file} indisponible (${res.status})`);
  const data = (await res.json()) as { family: string; items: LibraryItem[] };
  const byKey: Record<string, LibraryItem> = {};
  for (const it of data.items) byKey[it.key] = it;
  cache.set(file, byKey);
  familyOfFile.set(file, data.family);
  return byKey;
}

/** Convertit un élément de bibliothèque en appareil de catalogue. */
export function toCatalogueItem(it: LibraryItem, family: string): CatalogueItem {
  return {
    key: it.key,
    name: prettyName(it),
    ref: refOf(it.key),
    kind: kindForFamily(family),
    family,
    modules: Math.max(1, Math.round(it.w / 18)),
    poles: 0,
    terminals: it.terminals ?? [],
    switchable: false,
    w: Math.round(it.w),
    h: Math.round(it.h),
    src: it.src,
    small: it.small,
    door: it.door,
  };
}

/** Charge un élément de bibliothèque par sa clé, en chargeant sa famille si besoin. */
export async function loadLibraryItem(key: string): Promise<CatalogueItem | null> {
  const fam = INDEX.find((f) => f.keys.includes(key));
  if (!fam) return null;
  try {
    const items = await loadFamily(fam.file);
    const it = items[key];
    return it ? toCatalogueItem(it, fam.family) : null;
  } catch {
    return null;
  }
}

/** Élément de bibliothèque déjà en cache (famille chargée), sinon `null` — usage synchrone (rendu). */
export function libraryItemSync(key: string): CatalogueItem | null {
  const fam = INDEX.find((f) => f.keys.includes(key));
  if (!fam) return null;
  const items = cache.get(fam.file);
  const it = items?.[key];
  return it ? toCatalogueItem(it, fam.family) : null;
}

export interface LibrarySearchHit {
  key: string;
  family: string;
  file: string;
  /** Nom lisible si la famille est déjà chargée. */
  name?: string;
}

/**
 * Recherche dans la bibliothèque : clé, famille, et nom des éléments dont la famille
 * est déjà en cache. Résultats triés (correspondance de clé d'abord), limités à 60.
 */
export function searchLibrary(q: string, limit = 60): LibrarySearchHit[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: { hit: LibrarySearchHit; score: number }[] = [];
  for (const fam of INDEX) {
    const items = cache.get(fam.file);
    const famMatch = fam.family.toLowerCase().includes(needle);
    for (const key of fam.keys) {
      const it = items?.[key];
      const name = it ? prettyName(it) : undefined;
      const keyMatch = key.toLowerCase().includes(needle);
      const nameMatch = name ? name.toLowerCase().includes(needle) : false;
      if (!keyMatch && !nameMatch && !famMatch) continue;
      hits.push({ hit: { key, family: fam.family, file: fam.file, name }, score: nameMatch ? 0 : keyMatch ? 1 : 2 });
    }
  }
  hits.sort((a, b) => a.score - b.score || a.hit.key.localeCompare(b.hit.key));
  return hits.slice(0, limit).map((h) => h.hit);
}
