import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Footprints, Bike, Car, TrainFront, Plane, Ship, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { geocodeSmart, type LatLng } from '@/services/geocode.ts';
import { getLeg, formatDistance, formatDuration, type TravelMode, type LegRoute } from '@/services/routing.ts';
import { formatEventTime } from '@/shared/utils/datetime.ts';
import type { ItineraryDay, ItineraryEvent } from '@wanderlog/shared';

// Marker hex colours by category — matches the badge palette
const MARKER_COLORS: Record<string, string> = {
  flight: '#0ea5e9', train: '#3b82f6', bus: '#6366f1', ferry: '#06b6d4', car: '#64748b',
  accommodation: '#8b5cf6', activity: '#10b981', restaurant: '#f97316',
  sightseeing: '#f59e0b', meeting: '#f43f5e', free_time: '#14b8a6', other: '#94a3b8',
};

function markerColor(category: string): string {
  return MARKER_COLORS[category.toLowerCase()] ?? MARKER_COLORS.other;
}

interface ModeMeta { label: string; Icon: React.ElementType; color: string; dashed: boolean }

const MODE_META: Record<TravelMode, ModeMeta> = {
  walk:    { label: 'Walk',    Icon: Footprints, color: '#10b981', dashed: false },
  cycle:   { label: 'Cycle',   Icon: Bike,       color: '#14b8a6', dashed: false },
  drive:   { label: 'Drive',   Icon: Car,        color: '#64748b', dashed: false },
  transit: { label: 'Transit', Icon: TrainFront, color: '#3b82f6', dashed: true },
  flight:  { label: 'Flight',  Icon: Plane,      color: '#0ea5e9', dashed: true },
  ferry:   { label: 'Ferry',   Icon: Ship,       color: '#06b6d4', dashed: true },
};

const MODE_ORDER: TravelMode[] = ['walk', 'cycle', 'drive', 'transit', 'flight', 'ferry'];

/** Infers a leg's mode from the activity you depart FROM. A transport activity
 *  (flight/train/ferry/…) describes the journey leaving its location; anything
 *  else defaults to walking. Always overridable per-leg. */
function inferMode(category: string): TravelMode {
  switch (category.toLowerCase()) {
    case 'flight': return 'flight';
    case 'ferry': return 'ferry';
    case 'train': case 'bus': return 'transit';
    case 'car': return 'drive';
    default: return 'walk';
  }
}

// Maps an app travel mode to Google Maps' travelmode parameter.
function googleTravelMode(mode: TravelMode): string {
  if (mode === 'walk') return 'walking';
  if (mode === 'cycle') return 'bicycling';
  if (mode === 'drive') return 'driving';
  return 'transit'; // transit / flight / ferry → Google transit
}

/** A universal Google Maps directions deep link (no API key, free, worldwide).
 *  Opens the native Maps app on mobile. Omitting origin lets Google use the
 *  user's current location — handy for "how do I get here right now". */
function googleDirUrl(to: LatLng, mode: TravelMode, from?: LatLng): string {
  const base = 'https://www.google.com/maps/dir/?api=1';
  const dest = `&destination=${to.lat},${to.lng}`;
  const origin = from ? `&origin=${from.lat},${from.lng}` : '';
  return `${base}${origin}${dest}&travelmode=${googleTravelMode(mode)}`;
}

function pinIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: 'wl-pin',
    html: `<div style="
      background:${color};width:26px;height:26px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:700;">${label}</span>
    </div>`,
    iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -26],
  });
}

interface GeoEvent { event: ItineraryEvent; pos: LatLng; index: number }
interface Leg { from: GeoEvent; to: GeoEvent; mode: TravelMode; route: LegRoute; key: string }

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    } else {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

export function DayMap({ days, geocodeContext }: { days: ItineraryDay[]; geocodeContext?: string }) {
  const dayOptions = days.filter((d) => (d.events ?? []).some((e) => e.location?.name));
  const [selectedDayId, setSelectedDayId] = useState<string>(dayOptions[0]?.id ?? days[0]?.id ?? '');
  const [geoEvents, setGeoEvents] = useState<GeoEvent[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  // Per-leg mode overrides, keyed by "fromEventId__toEventId" so they survive re-renders
  const [overrides, setOverrides] = useState<Record<string, TravelMode>>({});
  const [loading, setLoading] = useState(false);

  const selectedDay = days.find((d) => d.id === selectedDayId);
  const locatedEvents = useMemo(
    () => (selectedDay?.events ?? []).filter((e) => e.location?.name),
    [selectedDay],
  );

  // Geocode all located events when the day changes (raw name first, context fallback)
  useEffect(() => {
    let cancelled = false;
    setGeoEvents([]);
    setLegs([]);
    if (locatedEvents.length === 0) return;

    setLoading(true);
    (async () => {
      const resolved: GeoEvent[] = [];
      for (const event of locatedEvents) {
        const pos: LatLng | null =
          event.location?.latitude != null && event.location?.longitude != null
            ? { lat: event.location.latitude, lng: event.location.longitude }
            : await geocodeSmart(event.location!.name, geocodeContext);
        if (cancelled) return;
        if (pos) resolved.push({ event, pos, index: resolved.length + 1 });
      }
      if (!cancelled) { setGeoEvents(resolved); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [locatedEvents, geocodeContext]);

  // Compute each leg's route using its (inferred or overridden) mode
  useEffect(() => {
    let cancelled = false;
    if (geoEvents.length < 2) { setLegs([]); return; }
    (async () => {
      const out: Leg[] = [];
      for (let i = 0; i < geoEvents.length - 1; i++) {
        const from = geoEvents[i];
        const to = geoEvents[i + 1];
        const key = `${from.event.id}__${to.event.id}`;
        const mode = overrides[key] ?? inferMode(from.event.category);
        const route = await getLeg(from.pos, to.pos, mode);
        if (cancelled) return;
        out.push({ from, to, mode, route, key });
      }
      if (!cancelled) setLegs(out);
    })();
    return () => { cancelled = true; };
  }, [geoEvents, overrides]);

  const points = geoEvents.map((g) => g.pos);
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : [48.8566, 2.3522];

  const totals = legs.reduce(
    (acc, l) => ({ dist: acc.dist + l.route.distanceMeters, dur: acc.dur + l.route.durationSeconds }),
    { dist: 0, dur: 0 },
  );

  return (
    <div className="card overflow-hidden">
      {/* Day selector */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
        <select
          className="input py-1.5 text-sm w-auto"
          value={selectedDayId}
          onChange={(e) => setSelectedDayId(e.target.value)}
        >
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {format(new Date(d.date), 'EEE, MMM d')}{d.title ? ` — ${d.title}` : ''}
            </option>
          ))}
        </select>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {/* Map */}
      <div className="map-container h-[420px]">
        {locatedEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 px-6 text-center">
            No events with locations on this day. Add a location to an event to see it on the map.
          </div>
        ) : (
          <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds points={points} />

            {geoEvents.map((g) => (
              <Marker key={g.event.id} position={[g.pos.lat, g.pos.lng]} icon={pinIcon(markerColor(g.event.category), String(g.index))}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{g.event.title}</p>
                    <p className="text-xs text-slate-500 capitalize">{g.event.category.toLowerCase().replace('_', ' ')}</p>
                    {g.event.startTime && <p className="text-xs text-slate-500 mt-0.5">{formatEventTime(g.event.startTime)}</p>}
                    {g.event.location?.name && <p className="text-xs text-slate-500 mt-0.5">{g.event.location.name}</p>}
                    <a
                      href={googleDirUrl(g.pos, 'transit')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-brand-600 hover:underline"
                    >
                      Directions here <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}

            {legs.map((l) => (
              <Polyline
                key={l.key}
                positions={l.route.coordinates}
                pathOptions={{
                  color: MODE_META[l.mode].color,
                  weight: 4,
                  opacity: 0.75,
                  dashArray: MODE_META[l.mode].dashed ? '6 8' : undefined,
                }}
              />
            ))}
          </MapContainer>
        )}
      </div>

      {/* Per-leg list with mode selectors */}
      {legs.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
          {legs.map((l) => {
            const meta = MODE_META[l.mode];
            const Icon = meta.Icon;
            return (
              <div key={l.key} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0" style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    <span className="text-slate-400">{l.from.index}.</span> {l.from.event.title}
                    <span className="text-slate-400 mx-1">→</span>
                    <span className="text-slate-400">{l.to.index}.</span> {l.to.event.title}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {formatDistance(l.route.distanceMeters)} · {formatDuration(l.route.durationSeconds)}
                    {!l.route.routed && <span className="ml-1 italic">(est.)</span>}
                  </p>
                </div>
                <select
                  className="input py-1 text-xs w-auto flex-shrink-0"
                  value={l.mode}
                  onChange={(e) => setOverrides((o) => ({ ...o, [l.key]: e.target.value as TravelMode }))}
                  title="Change travel mode for this leg"
                >
                  {MODE_ORDER.map((m) => (
                    <option key={m} value={m}>{MODE_META[m].label}</option>
                  ))}
                </select>
                <a
                  href={googleDirUrl(l.to.pos, l.mode, l.from.pos)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Open these directions in Google Maps"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}

          {/* Day total */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50/60 dark:bg-slate-800/30">
            <span className="text-xs text-slate-500 dark:text-slate-400">{legs.length} leg{legs.length !== 1 ? 's' : ''}</span>
            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
              {formatDistance(totals.dist)} · ~{formatDuration(totals.dur)} total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
