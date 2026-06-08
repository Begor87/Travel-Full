import { logger } from '../shared/utils/logger.js';

export interface LatLng { lat: number; lng: number }

// In-memory geocode cache (persists for the process lifetime). Keys are
// lowercased query strings. null means "looked up, not found".
const cache = new Map<string, LatLng | null>();

// Nominatim asks for ≤1 request/second, so serialise lookups through a queue.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  );
  return run;
}

/** Geocodes a place string to coordinates via OpenStreetMap Nominatim, cached. */
export async function geocode(query: string): Promise<LatLng | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  return enqueue(async () => {
    if (cache.has(key)) return cache.get(key)!;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Wanderlog/1.0', 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const results = (await res.json()) as Array<{ lat: string; lon: string }>;
      const result: LatLng | null = results[0]
        ? { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
        : null;
      cache.set(key, result);
      return result;
    } catch (err) {
      logger.warn('Server geocode failed', { query, error: err instanceof Error ? err.message : String(err) });
      cache.set(key, null);
      return null;
    }
  });
}
