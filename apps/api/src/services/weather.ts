import { logger } from '../shared/utils/logger.js';

export interface DailyForecast {
  date: string;        // YYYY-MM-DD
  tempMin: number;
  tempMax: number;
  /** Representative midday condition. */
  main: string;        // e.g. "Rain", "Clear", "Clouds"
  description: string; // e.g. "light rain"
  icon: string;        // OpenWeatherMap icon code, e.g. "10d"
}

export interface ForecastResult {
  location: string;
  units: 'metric';
  days: Record<string, DailyForecast>;
}

interface OwmForecastResponse {
  cod: string;
  city: { name: string };
  list: Array<{
    dt_txt: string;
    main: { temp: number; temp_min: number; temp_max: number };
    weather: Array<{ main: string; description: string; icon: string }>;
  }>;
}

// Cache forecasts per coordinate for 1 hour — OWM updates infrequently and the
// free tier is rate-limited.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { result: ForecastResult; fetchedAt: number }>();

/**
 * Fetches a 5-day / 3-hour forecast from OpenWeatherMap and aggregates it into
 * per-day summaries (min/max temperature plus the midday condition). Returns
 * null when no API key is configured. Only the next ~5 days are available on
 * the free tier; dates beyond that simply won't appear in `days`.
 */
export async function getForecast(lat: number, lng: number): Promise<ForecastResult | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as OwmForecastResponse;

    if (body.cod !== '200' || !Array.isArray(body.list)) {
      throw new Error(`Unexpected response (cod ${body.cod})`);
    }

    const byDate = new Map<string, { min: number; max: number; midday?: OwmForecastResponse['list'][number] }>();

    for (const entry of body.list) {
      const date = entry.dt_txt.slice(0, 10);
      const hour = parseInt(entry.dt_txt.slice(11, 13), 10);
      const current = byDate.get(date) ?? { min: Infinity, max: -Infinity };
      current.min = Math.min(current.min, entry.main.temp_min);
      current.max = Math.max(current.max, entry.main.temp_max);
      // Prefer the reading closest to 12:00 as the representative condition
      if (!current.midday || Math.abs(hour - 12) < Math.abs(parseInt(current.midday.dt_txt.slice(11, 13), 10) - 12)) {
        current.midday = entry;
      }
      byDate.set(date, current);
    }

    const days: Record<string, DailyForecast> = {};
    for (const [date, agg] of byDate) {
      const w = agg.midday?.weather[0];
      days[date] = {
        date,
        tempMin: Math.round(agg.min),
        tempMax: Math.round(agg.max),
        main: w?.main ?? 'Unknown',
        description: w?.description ?? '',
        icon: w?.icon ?? '01d',
      };
    }

    const result: ForecastResult = { location: body.city.name, units: 'metric', days };
    cache.set(key, { result, fetchedAt: Date.now() });
    return result;
  } catch (err) {
    logger.warn('Weather fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
