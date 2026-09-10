/**
 * Ressource solaire réelle du site (TP 14 · dimensionnement PV).
 *
 * `GET /api/pvgis?lat=4.94&lon=-52.33` interroge PVGIS (JRC, Commission européenne) côté serveur,
 * met le résultat en cache 24 h et retombe **silencieusement** sur la table locale du catalogue
 * (`src/lib/data/pv/catalogue.ts`) si l'API est injoignable — le TP reste utilisable hors-ligne.
 *
 * PVGIS renvoie, pour 1 kWc installé, la production mensuelle `E_m` (kWh/mois) et journalière
 * `E_d` (kWh/j), pertes système comprises. On en déduit les heures d'ensoleillement équivalentes :
 *
 *     HSP ≈ E_d / (1 − pertes)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { nearestLocality } from '@/lib/data/pv/catalogue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Pertes système déclarées à PVGIS (%). */
const LOSS = 14;
const TTL = 24 * 60 * 60 * 1000;
const TIMEOUT = 6000;

export interface PvgisMonth { month: number; em: number; ed: number; hsp: number }

export interface PvgisPayload {
  source: 'pvgis' | 'table';
  /** HSP moyenne annuelle (h/j). */
  hsp: number;
  /** HSP du mois le plus défavorable (h/j). */
  min: number;
  /** Mois le plus défavorable (1..12), null en repli. */
  worstMonth: number | null;
  monthly: PvgisMonth[];
  loss: number;
  /** Ville de la table locale la plus proche (repère affiché). */
  locality: string;
}

interface PvgisMonthlyRow { month?: number; E_m?: number; E_d?: number }
interface PvgisResponse { outputs?: { monthly?: { fixed?: PvgisMonthlyRow[] } } }

const cache = new Map<string, { at: number; payload: PvgisPayload }>();

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** Repli hors-ligne : valeurs indicatives de la localité du catalogue la plus proche. */
function fallback(lat: number, lon: number): PvgisPayload {
  const loc = nearestLocality(lat, lon);
  return {
    source: 'table',
    hsp: loc.hsp,
    min: loc.min,
    worstMonth: null,
    monthly: [],
    loss: LOSS,
    locality: loc.ville,
  };
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lon = Number(request.nextUrl.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.payload);
  }

  const url =
    'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc' +
    `?lat=${lat}&lon=${lon}&peakpower=1&loss=${LOSS}&outputformat=json`;

  let payload: PvgisPayload;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`pvgis ${res.status}`);
    const data = (await res.json()) as PvgisResponse;
    const rows = data.outputs?.monthly?.fixed ?? [];
    const monthly: PvgisMonth[] = rows
      .filter((r): r is Required<PvgisMonthlyRow> => typeof r.E_d === 'number' && typeof r.E_m === 'number')
      .map(r => ({
        month: r.month,
        em: round(r.E_m, 1),
        ed: round(r.E_d, 2),
        hsp: round(r.E_d / (1 - LOSS / 100), 2),
      }));
    if (monthly.length < 12) throw new Error('pvgis incomplet');

    const year = monthly.reduce((a, m) => a + m.em, 0);
    const worst = monthly.reduce((a, m) => (m.hsp < a.hsp ? m : a), monthly[0]);
    payload = {
      source: 'pvgis',
      hsp: round(year / 365 / (1 - LOSS / 100), 2),
      min: worst.hsp,
      worstMonth: worst.month,
      monthly,
      loss: LOSS,
      locality: nearestLocality(lat, lon).ville,
    };
  } catch {
    // API injoignable (réseau coupé, quota, format inattendu) : valeurs indicatives locales
    payload = fallback(lat, lon);
  }

  // seuls les vrais relevés sont mis en cache : un repli ne doit pas geler 24 h de valeurs indicatives
  if (payload.source === 'pvgis') cache.set(key, { at: Date.now(), payload });
  return NextResponse.json(payload);
}
