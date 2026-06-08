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
  location?: string;
}

export interface ForecastResult {
  units: 'metric';
  days: Record<string, DailyForecast>;
}

export interface TimeSlice {
  ts: number;
  temp: number;
  main: string;
  description: string;
  icon: string;
}

export interface DayDetail {
  date: string;
  location: string;
  granularity: 'hourly' | '3-hourly' | 'daily';
  slices: TimeSlice[];
  daily: DailyForecast | null;
}

export const weatherApi = {
  getTripWeather: (tripId: string) =>
    api.get<ApiResponse<ForecastResult | null>>(`/trips/${tripId}/weather`),

  getDayDetail: (tripId: string, date: string) =>
    api.get<ApiResponse<DayDetail | null>>(`/trips/${tripId}/weather/day/${date}`),
};
