import type { LatLng } from './geocode.ts';

export type TravelMode = 'walk' | 'cycle' | 'drive';

export interface RouteResult {
  /** Ordered [lng, lat] pairs for the route line (Leaflet wants [lat, lng]). */
  coordinates: [number, number][];
  /** Total distance in metres. */
  distanceMeters: number;
  /** Estimated duration in seconds for the chosen mode. */
  durationSeconds: number;
}

// Average speeds (m/s) used to estimate per-mode time from route distance.
const SPEED: Record<TravelMode, number> = {
  walk: 1.4,   // ~5 km/h
  cycle: 4.2,  // ~15 km/h
  drive: 11.1, // ~40 km/h city average
};

/**
 * Fetches a route through the given points (in order) from the public OSRM
 * demo server. OSRM's demo only exposes the driving network, so we take its
 * road geometry + distance and estimate the duration for the selected mode
 * from average speeds. Good enough for trip planning; not turn-by-turn.
 */
export async function getRoute(points: LatLng[], mode: TravelMode): Promise<RouteResult | null> {
  if (points.length < 2) return null;

  const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as {
      code: string;
      routes: Array<{ distance: number; geometry: { coordinates: [number, number][] } }>;
    };

    if (body.code !== 'Ok' || !body.routes[0]) return null;

    const route = body.routes[0];
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng],
    );

    return {
      coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.distance / SPEED[mode],
    };
  } catch {
    // Fallback: straight-line distance + estimate
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      distance += haversine(points[i - 1], points[i]);
    }
    return {
      coordinates: points.map((p) => [p.lat, p.lng]),
      distanceMeters: distance,
      durationSeconds: distance / SPEED[mode],
    };
  }
}

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
