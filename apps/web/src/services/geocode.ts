/**
 * Client-side geocoding via OpenStreetMap Nominatim. Results are cached in
 * localStorage so a place is only ever looked up once — Nominatim asks for
 * max 1 request/second, so we also serialise lookups through a queue.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const CACHE_KEY = 'wanderlog-geocode-cache';

function loadCache(): Record<string, LatLng | null> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, LatLng | null>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota — ignore */
  }
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  // Space requests ~1.1s apart to respect Nominatim's usage policy
  queue = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  );
  return run;
}

export async function geocode(query: string): Promise<LatLng | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  const cache = loadCache();
  if (key in cache) return cache[key];

  return enqueue(async () => {
    // Re-check cache in case a duplicate query resolved while queued
    const fresh = loadCache();
    if (key in fresh) return fresh[key];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const results = (await res.json()) as Array<{ lat: string; lon: string }>;

      const result: LatLng | null = results[0]
        ? { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
        : null;

      const updated = loadCache();
      updated[key] = result;
      saveCache(updated);
      return result;
    } catch {
      return null;
    }
  });
}
