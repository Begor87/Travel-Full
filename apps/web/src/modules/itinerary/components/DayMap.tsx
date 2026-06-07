import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Footprints, Bike, Car, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { geocode, type LatLng } from '@/services/geocode.ts';
import { getRoute, formatDistance, formatDuration, type TravelMode, type RouteResult } from '@/services/routing.ts';
import { formatEventTime } from '@/shared/utils/datetime.ts';
import { cn } from '@/shared/utils/cn.ts';
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

function pinIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: 'wl-pin',
    html: `<div style="
      background:${color};
      width:26px;height:26px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:700;">${label}</span>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

interface GeoEvent {
  event: ItineraryEvent;
  pos: LatLng;
  index: number;
}

const TRAVEL_MODES: { mode: TravelMode; icon: React.ElementType; label: string }[] = [
  { mode: 'walk', icon: Footprints, label: 'Walk' },
  { mode: 'cycle', icon: Bike, label: 'Cycle' },
  { mode: 'drive', icon: Car, label: 'Drive' },
];

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

export function DayMap({ days, geocodeContext }: { days: ItineraryDay[]; geocodeContext?: string }) {
  // Day selector — default to the first day that has any locations
  const dayOptions = days.filter((d) => (d.events ?? []).some((e) => e.location?.name));
  const [selectedDayId, setSelectedDayId] = useState<string>(
    dayOptions[0]?.id ?? days[0]?.id ?? '',
  );
  const [mode, setMode] = useState<TravelMode>('walk');
  const [geoEvents, setGeoEvents] = useState<GeoEvent[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedDay = days.find((d) => d.id === selectedDayId);

  // Events with a location name, in itinerary order
  const locatedEvents = useMemo(
    () => (selectedDay?.events ?? []).filter((e) => e.location?.name),
    [selectedDay],
  );

  // Geocode all located events whenever the day changes
  useEffect(() => {
    let cancelled = false;
    setGeoEvents([]);
    setRoute(null);

    if (locatedEvents.length === 0) return;

    setLoading(true);
    (async () => {
      const resolved: GeoEvent[] = [];
      for (let i = 0; i < locatedEvents.length; i++) {
        const event = locatedEvents[i];
        // Use stored coords if present, otherwise geocode the name
        // Append the destination city/country to disambiguate place names
        // like "172 Blvd Saint-Germain" that geocode poorly on their own.
        const name = event.location!.name;
        const query =
          geocodeContext && !name.toLowerCase().includes(geocodeContext.split(',')[0].toLowerCase())
            ? `${name}, ${geocodeContext}`
            : name;
        let pos: LatLng | null =
          event.location?.latitude != null && event.location?.longitude != null
            ? { lat: event.location.latitude, lng: event.location.longitude }
            : await geocode(query);
        if (cancelled) return;
        if (pos) resolved.push({ event, pos, index: resolved.length + 1 });
      }
      if (!cancelled) {
        setGeoEvents(resolved);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [locatedEvents, geocodeContext]);

  // Recompute route when geocoded points or travel mode change
  useEffect(() => {
    let cancelled = false;
    if (geoEvents.length < 2) { setRoute(null); return; }
    (async () => {
      const r = await getRoute(geoEvents.map((g) => g.pos), mode);
      if (!cancelled) setRoute(r);
    })();
    return () => { cancelled = true; };
  }, [geoEvents, mode]);

  const points = geoEvents.map((g) => g.pos);
  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lng]
    : [48.8566, 2.3522]; // default Paris

  return (
    <div className="card overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
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

        {/* Travel mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {TRAVEL_MODES.map(({ mode: m, icon: Icon, label }) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                mode === m
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="map-container h-[420px]">
        {locatedEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 px-6 text-center">
            No events with locations on this day. Add a location to an event to see it on the map.
          </div>
        ) : (
          <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />

            {geoEvents.map((g) => (
              <Marker
                key={g.event.id}
                position={[g.pos.lat, g.pos.lng]}
                icon={pinIcon(markerColor(g.event.category), String(g.index))}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{g.event.title}</p>
                    <p className="text-xs text-slate-500 capitalize">{g.event.category.toLowerCase().replace('_', ' ')}</p>
                    {g.event.startTime && (
                      <p className="text-xs text-slate-500 mt-0.5">{formatEventTime(g.event.startTime)}</p>
                    )}
                    {g.event.location?.name && (
                      <p className="text-xs text-slate-500 mt-0.5">{g.event.location.name}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {route && route.coordinates.length > 1 && (
              <Polyline
                positions={route.coordinates}
                pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.7, dashArray: mode === 'walk' ? '6 8' : undefined }}
              />
            )}
          </MapContainer>
        )}
      </div>

      {/* Route summary */}
      {route && geoEvents.length >= 2 && (
        <div className="flex items-center justify-between gap-4 p-3 border-t border-slate-100 dark:border-slate-800 text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            {geoEvents.length} stops · {TRAVEL_MODES.find((t) => t.mode === mode)?.label.toLowerCase()}
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatDistance(route.distanceMeters)} · ~{formatDuration(route.durationSeconds)}
          </span>
        </div>
      )}
    </div>
  );
}
