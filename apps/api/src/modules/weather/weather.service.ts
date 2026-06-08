import { prisma } from '../../database/prisma.js';
import { assertTripAccess } from '../trips/trips.service.js';
import { getForecast, getDaySlices, type DailyForecast, type DayDetail } from '../../services/weather.js';
import { geocode } from '../../services/geocode.js';

interface DayLocation { label: string; lat: number; lng: number }

interface EventLite {
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
}

interface DestLite {
  name: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

/** A short, city-ish label from a location string ("Via Ricasoli 58, Florence" → "Florence"). */
function shortLabel(name: string): string {
  return name.includes(',') ? name.split(',').pop()!.trim() : name.trim();
}

/**
 * Resolves the representative weather location for a day from its activities:
 * the last located activity (where you end the day), using its stored
 * coordinates if present, otherwise geocoding its city. Falls back to the
 * trip's primary destination when a day has no located activities.
 */
async function resolveDayLocation(
  events: EventLite[],
  firstDest: DestLite | undefined,
  country: string | undefined,
): Promise<DayLocation | null> {
  const located = events.filter((e) => e.locationName);
  if (located.length) {
    const rep = located[located.length - 1];
    const name = rep.locationName!;
    const label = shortLabel(name);
    if (rep.locationLat != null && rep.locationLng != null) {
      return { label, lat: rep.locationLat, lng: rep.locationLng };
    }
    const geo = await geocode(country ? `${label}, ${country}` : label);
    if (geo) return { label, lat: geo.lat, lng: geo.lng };
  }
  if (firstDest?.latitude != null && firstDest?.longitude != null) {
    return { label: firstDest.name, lat: firstDest.latitude, lng: firstDest.longitude };
  }
  return null;
}

export interface TripWeather {
  units: 'metric';
  days: Record<string, DailyForecast>;
}

export async function getTripWeather(tripId: string, userId: string): Promise<TripWeather | null> {
  await assertTripAccess(tripId, userId);

  const [trip, days] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      include: { destinations: { orderBy: { order: 'asc' } } },
    }),
    prisma.itineraryDay.findMany({
      where: { tripId },
      include: {
        events: {
          orderBy: [{ order: 'asc' }, { startTime: 'asc' }],
          select: { locationName: true, locationLat: true, locationLng: true },
        },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  if (!trip) return null;
  const firstDest = trip.destinations.find((d) => d.latitude != null && d.longitude != null);
  const country = firstDest?.country;

  // Resolve each day's location
  const dayLocations = new Map<string, DayLocation>();
  for (const day of days) {
    const loc = await resolveDayLocation(day.events, firstDest, country);
    if (loc) dayLocations.set(day.date.toISOString().slice(0, 10), loc);
  }
  if (dayLocations.size === 0) return null;

  // One forecast fetch per distinct location, over the (future-clamped) range
  const today = new Date().toISOString().slice(0, 10);
  const start = trip.startDate.toISOString().slice(0, 10);
  const end = trip.endDate.toISOString().slice(0, 10);
  const effectiveStart = start > today ? start : today;

  const distinct = new Map<string, DayLocation>();
  for (const loc of dayLocations.values()) distinct.set(`${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`, loc);

  const forecasts = new Map<string, Awaited<ReturnType<typeof getForecast>>>();
  await Promise.all(
    Array.from(distinct.entries()).map(async ([k, loc]) => {
      forecasts.set(k, await getForecast(loc.lat, loc.lng, effectiveStart, end));
    }),
  );

  const out: Record<string, DailyForecast> = {};
  for (const [date, loc] of dayLocations.entries()) {
    const fc = forecasts.get(`${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`);
    const day = fc?.days[date];
    if (day) out[date] = { ...day, location: loc.label };
  }

  return { units: 'metric', days: out };
}

export interface DayDetailResult extends DayDetail {
  location: string;
  daily: DailyForecast | null;
}

export async function getDayDetail(tripId: string, userId: string, date: string): Promise<DayDetailResult | null> {
  await assertTripAccess(tripId, userId);

  const [trip, day] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      include: { destinations: { orderBy: { order: 'asc' } } },
    }),
    prisma.itineraryDay.findFirst({
      where: { tripId, date: new Date(date) },
      include: {
        events: {
          orderBy: [{ order: 'asc' }, { startTime: 'asc' }],
          select: { locationName: true, locationLat: true, locationLng: true },
        },
      },
    }),
  ]);

  if (!trip) return null;
  const firstDest = trip.destinations.find((d) => d.latitude != null && d.longitude != null);
  const loc = await resolveDayLocation(day?.events ?? [], firstDest, firstDest?.country);
  if (!loc) return null;

  const [slices, forecast] = await Promise.all([
    getDaySlices(loc.lat, loc.lng, date),
    getForecast(loc.lat, loc.lng, date, date),
  ]);

  return {
    location: loc.label,
    date,
    granularity: slices?.granularity ?? 'daily',
    slices: slices?.slices ?? [],
    daily: forecast?.days[date] ? { ...forecast.days[date], location: loc.label } : null,
  };
}
