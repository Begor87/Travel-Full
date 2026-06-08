import { api } from './client.ts';
import type { ApiResponse } from '@wanderlog/shared';

export interface DailyForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  main: string;
  description: string;
  icon: string;
  isEstimate: boolean;
}

export interface ForecastResult {
  location: string;
  units: 'metric';
  days: Record<string, DailyForecast>;
}

export const weatherApi = {
  getTripWeather: (tripId: string) =>
    api.get<ApiResponse<ForecastResult | null>>(`/trips/${tripId}/weather`),
};
