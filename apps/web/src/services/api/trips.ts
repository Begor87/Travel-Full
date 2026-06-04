import { api } from './client.ts';
import type { ApiResponse } from '@wanderlog/shared';
import type { Trip, CreateTripInput, UpdateTripInput } from '@wanderlog/shared';

export const tripsApi = {
  list: (status?: string) =>
    api.get<ApiResponse<Trip[]>>(`/trips${status ? `?status=${status}` : ''}`),

  getById: (tripId: string) =>
    api.get<ApiResponse<Trip>>(`/trips/${tripId}`),

  create: (data: CreateTripInput) =>
    api.post<ApiResponse<Trip>>('/trips', data),

  update: (tripId: string, data: UpdateTripInput) =>
    api.patch<ApiResponse<Trip>>(`/trips/${tripId}`, data),

  delete: (tripId: string) =>
    api.delete<void>(`/trips/${tripId}`),

  duplicate: (tripId: string) =>
    api.post<ApiResponse<Trip>>(`/trips/${tripId}/duplicate`),
};
