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

  const destination = await prisma.tripDestination.findFirst({
    where: { tripId, latitude: { not: null }, longitude: { not: null } },
    orderBy: { order: 'asc' },
  });

  if (!destination?.latitude || !destination?.longitude) return null;

  return getForecast(destination.latitude, destination.longitude);
}
