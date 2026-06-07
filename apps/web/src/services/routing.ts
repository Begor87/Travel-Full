import type { LatLng } from './geocode.ts';

export type TravelMode = 'walk' | 'cycle' | 'drive' | 'transit' | 'flight' | 'ferry';

export interface LegRoute {
  /** Ordered [lat, lng] pairs for the route line. */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  /** True when the geometry follows real roads/paths; false for straight lines. */
  routed: boolean;
}

// FOSSGIS community OSRM servers, one per profile — these respect the actual
// network for each mode (walking ignores one-way streets, etc).
const OSRM_PROFILE: Record<'walk' | 'cycle' | 'drive', { server: string; profile: string }> = {
  walk:  { server: 'routed-foot', profile: 'foot' },
  cycle: { server: 'routed-bike', profile: 'bike' },
  drive: { server: 'routed-car',  profile: 'driving' },
};

// Average speeds (m/s) for modes we can't route on the free OSM stack.
const STRAIGHT_SPEED: Record<'transit' | 'flight' | 'ferry', number> = {
  transit: 7,    // ~25 km/h urban average incl. stops
  ferry: 9.7,    // ~35 km/h
  flight: 222,   // ~800 km/h cruise (gross estimate; ignores airport time)
};

/** Whether a mode draws a real routed path or a straight line. */
export function isRouted(mode: TravelMode): mode is 'walk' | 'cycle' | 'drive' {
  return mode === 'walk' || mode === 'cycle' || mode === 'drive';
}

/**
 * Routes a single leg between two points using the right network for the mode.
 * walk/cycle/drive use the matching OSRM profile server. transit/flight/ferry
 * (which the free OSM stack can't route) fall back to a straight line with a
 * speed-based time estimate.
 */
export async function getLeg(from: LatLng, to: LatLng, mode: TravelMode): Promise<LegRoute> {
  if (isRouted(mode)) {
    const { server, profile } = OSRM_PROFILE[mode];
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `https://routing.openstreetmap.de/${server}/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        code: string;
        routes: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }>;
      };
      if (body.code === 'Ok' && body.routes[0]) {
        const r = body.routes[0];
        return {
          coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          distanceMeters: r.distance,
          durationSeconds: r.duration,
          routed: true,
        };
      }
    } catch {
      // fall through to straight line
    }
  }

  // Straight line (transit/flight/ferry, or routing failure)
  const distance = haversine(from, to);
  const speed = isRouted(mode) ? 1.4 : STRAIGHT_SPEED[mode];
  return {
    coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
    distanceMeters: distance,
    durationSeconds: distance / speed,
    routed: false,
  };
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
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
