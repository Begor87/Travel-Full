import { prisma } from '../../database/prisma.js';
import { assertTripAccess } from '../trips/trips.service.js';
import { getForecast, type ForecastResult } from '../../services/weather.js';

/**
 * Returns a weather forecast for a trip, anchored on its primary destination's
 * coordinates. Returns null when no destination has coordinates or no weather
 * API key is configured — the frontend treats that as "weather unavailable".
 */
export async function getTripWeather(tripId: string, userId: string): Promise<ForecastResult | null> {
  await assertTripAccess(tripId, userId);

  const [trip, destination] = await Promise.all([
    prisma.trip.findUnique({ where: { id: tripId }, select: { startDate: true, endDate: true } }),
    prisma.tripDestination.findFirst({
      where: { tripId, latitude: { not: null }, longitude: { not: null } },
      orderBy: { order: 'asc' },
    }),
  ]);

  if (!destination?.latitude || !destination?.longitude) return null;

  // One Call 4.0 covers the whole trip window, even months out — but only from
  // today onward (no past forecasts). Clamp the start to today.
  const today = new Date().toISOString().slice(0, 10);
  const start = trip ? trip.startDate.toISOString().slice(0, 10) : undefined;
  const end = trip ? trip.endDate.toISOString().slice(0, 10) : undefined;
  const effectiveStart = start && start > today ? start : today;

  return getForecast(destination.latitude, destination.longitude, effectiveStart, end);
}
