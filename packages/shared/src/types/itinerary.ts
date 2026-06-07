export type EventCategory =
  | 'flight'
  | 'train'
  | 'bus'
  | 'ferry'
  | 'car'
  | 'accommodation'
  | 'activity'
  | 'restaurant'
  | 'sightseeing'
  | 'meeting'
  | 'free_time'
  | 'other';

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface EventLocation {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface BookingReference {
  id: string;
  provider: string;
  reference: string;
  url?: string;
}

export interface ItineraryEvent {
  id: string;
  tripId: string;
  dayId: string;
  title: string;
  description?: string;
  category: EventCategory;
  status: EventStatus;
  startTime?: string;  // ISO 8601 datetime
  endTime?: string;
  allDay: boolean;
  duration?: number;   // minutes
  location?: EventLocation;
  notes?: string;
  cost?: number;
  costCurrency?: string;
  bookingReferences: BookingReference[];
  checklistItems: ChecklistItem[];
  attachmentIds: string[];
  reminderMinutes?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  date: string;        // ISO 8601 date
  title?: string;
  notes?: string;
  events: ItineraryEvent[];
}

export interface CreateEventInput {
  title: string;
  description?: string;
  category: EventCategory;
  status?: EventStatus;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  duration?: number;
  location?: EventLocation;
  notes?: string;
  cost?: number;
  costCurrency?: string;
  bookingReferences?: Omit<BookingReference, 'id'>[];
  checklistItems?: Omit<ChecklistItem, 'id'>[];
  reminderMinutes?: number;
  order?: number;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus;
}

export interface ScheduleConflict {
  eventA: string;
  eventB: string;
  type: 'overlap' | 'tight_transfer' | 'unrealistic_travel';
  severity: 'warning' | 'error';
  message: string;
}
