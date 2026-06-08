import { logger } from '../shared/utils/logger.js';

export interface DailyForecast {
  date: string;        // YYYY-MM-DD
  tempMin: number;
  tempMax: number;
  main: string;        // e.g. "Rain", "Clear" — empty for climate estimates
  description: string;
  icon: string;        // OWM icon code; empty for climate estimates
  /** True when this is a climatological estimate (far-future), not a real
   *  forecast — temperature only, no conditions. */
  isEstimate: boolean;
}

export interface ForecastResult {
  location: string;
  units: 'metric';
  days: Record<string, DailyForecast>;
}

const MAX_RANGE_DAYS = 32; // safety net; trips are short
const DAY = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { result: ForecastResult; fetchedAt: number }>();

interface OwmTimelineDay {
  dt: number;
  temp: { min: number; max: number };
}

/**
 * One Call API 4.0 daily timeline — temperature aggregates for any date range
 * up to ~1.5 years ahead. No weather conditions (those come from the 5-day
 * forecast for near dates). Returns date → {min,max} or null on failure.
 */
async function fetchDailyTemps(
  lat: number, lng: number, startTs: number, endTs: number, apiKey: string,
): Promise<Record<string, { tempMin: number; tempMax: number }> | null> {
  try {
    const url =
      `https://api.openweathermap.org/data/4.0/onecall/timeline/1day` +
      `?lat=${lat}&lon=${lng}&units=metric&start=${startTs}&end=${endTs}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { data?: OwmTimelineDay[] };
    if (!Array.isArray(body.data)) return null;

    const out: Record<string, { tempMin: number; tempMax: number }> = {};
    for (const d of body.data) {
      const date = new Date(d.dt * 1000).toISOString().slice(0, 10);
      out[date] = { tempMin: Math.round(d.temp.min), tempMax: Math.round(d.temp.max) };
    }
    return out;
  } catch (err) {
    logger.warn('One Call daily fetch failed', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

interface OwmForecastResponse {
  cod: string;
  city: { name: string };
  list: Array<{
    dt_txt: string;
    main: { temp_min: number; temp_max: number };
    weather: Array<{ main: string; description: string; icon: string }>;
  }>;
}

/**
 * Free 5-day / 3-hour forecast — real conditions + icons for the near term.
 * Aggregated into per-day summaries (min/max + midday condition).
 */
async function fetchNearConditions(
  lat: number, lng: number, apiKey: string,
): Promise<{ location: string; days: Record<string, DailyForecast> } | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as OwmForecastResponse;
    if (body.cod !== '200' || !Array.isArray(body.list)) return null;

    const agg = new Map<string, { min: number; max: number; midday?: OwmForecastResponse['list'][number] }>();
    for (const entry of body.list) {
      const date = entry.dt_txt.slice(0, 10);
      const hour = parseInt(entry.dt_txt.slice(11, 13), 10);
      const cur = agg.get(date) ?? { min: Infinity, max: -Infinity };
      cur.min = Math.min(cur.min, entry.main.temp_min);
      cur.max = Math.max(cur.max, entry.main.temp_max);
      if (!cur.midday || Math.abs(hour - 12) < Math.abs(parseInt(cur.midday.dt_txt.slice(11, 13), 10) - 12)) {
        cur.midday = entry;
      }
      agg.set(date, cur);
    }

    const days: Record<string, DailyForecast> = {};
    for (const [date, a] of agg) {
      const w = a.midday?.weather[0];
      days[date] = {
        date,
        tempMin: Math.round(a.min),
        tempMax: Math.round(a.max),
        main: w?.main ?? '',
        description: w?.description ?? '',
        icon: w?.icon ?? '',
        isEstimate: false,
      };
    }
    return { location: body.city.name, days };
  } catch (err) {
    logger.warn('5-day forecast fetch failed', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * Trip forecast: One Call 4.0 daily temps across the whole (possibly far-future)
 * range, overlaid with real conditions from the 5-day forecast for near days.
 * Far days are temperature-only climate estimates (isEstimate). Returns null
 * when no API key is configured.
 */
export async function getForecast(
  lat: number,
  lng: number,
  startDate?: string,
  endDate?: string,
): Promise<ForecastResult | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  const start = startDate ? new Date(`${startDate}T00:00:00Z`) : new Date();
  let end = endDate ? new Date(`${endDate}T23:59:59Z`) : new Date(start.getTime() + 10 * DAY);
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY) {
    end = new Date(start.getTime() + MAX_RANGE_DAYS * DAY);
  }
  const startTs = Math.floor(start.getTime() / 1000);
  const endTs = Math.floor(end.getTime() / 1000);

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}:${startTs}:${endTs}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.result;

  const [temps, near] = await Promise.all([
    fetchDailyTemps(lat, lng, startTs, endTs, apiKey),
    fetchNearConditions(lat, lng, apiKey),
  ]);

  if (!temps && !near) return null;

  const days: Record<string, DailyForecast> = {};

  // Base layer: One Call daily temps for the whole range (estimates).
  if (temps) {
    for (const [date, t] of Object.entries(temps)) {
      days[date] = {
        date, tempMin: t.tempMin, tempMax: t.tempMax,
        main: '', description: 'Seasonal estimate', icon: '', isEstimate: true,
      };
    }
  }

  // Overlay: real conditions for near days that fall inside the requested range.
  if (near) {
    for (const [date, f] of Object.entries(near.days)) {
      if (temps && !(date in days)) continue; // only within the One Call range
      days[date] = f;
    }
  }

  const result: ForecastResult = {
    location: near?.location ?? 'Forecast',
    units: 'metric',
    days,
  };
  cache.set(key, { result, fetchedAt: Date.now() });
  return result;
}
