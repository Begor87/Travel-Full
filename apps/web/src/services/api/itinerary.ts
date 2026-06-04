import { api } from './client.ts';
import type { ApiResponse, ItineraryDay, ItineraryEvent, ScheduleConflict, CreateEventInput, UpdateEventInput } from '@wanderlog/shared';

export const itineraryApi = {
  getItinerary: (tripId: string) =>
    api.get<ApiResponse<ItineraryDay[]>>(`/trips/${tripId}/itinerary`),

  getConflicts: (tripId: string) =>
    api.get<ApiResponse<ScheduleConflict[]>>(`/trips/${tripId}/itinerary/conflicts`),

  createEvent: (tripId: string, dayId: string, data: CreateEventInput) =>
    api.post<ApiResponse<ItineraryEvent>>(`/trips/${tripId}/itinerary/days/${dayId}/events`, data),

  updateEvent: (tripId: string, eventId: string, data: UpdateEventInput) =>
    api.patch<ApiResponse<ItineraryEvent>>(`/trips/${tripId}/itinerary/events/${eventId}`, data),

  deleteEvent: (tripId: string, eventId: string) =>
    api.delete<void>(`/trips/${tripId}/itinerary/events/${eventId}`),

  reorderEvents: (tripId: string, dayId: string, ids: string[]) =>
    api.post<void>(`/trips/${tripId}/itinerary/days/${dayId}/events/reorder`, { ids }),
};
