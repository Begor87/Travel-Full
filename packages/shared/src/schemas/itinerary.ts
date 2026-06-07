import { z } from 'zod';

/**
 * Accepts any datetime string the browser's `datetime-local` input or a full
 * ISO timestamp can produce, e.g. "2026-01-15T14:00", "2026-01-15T14:00:00",
 * or "2026-01-15T14:00:00.000Z". Validates it is parseable. The server
 * normalises it to a Date on write.
 */
export const flexibleDateTime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date or time');

export const eventLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
});

export const bookingReferenceSchema = z.object({
  provider: z.string().min(1),
  reference: z.string().min(1),
  url: z.string().url().optional(),
});

export const checklistItemSchema = z.object({
  text: z.string().min(1).max(500),
  checked: z.boolean().default(false),
});

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional(),
  category: z.enum([
    'flight', 'train', 'bus', 'ferry', 'car',
    'accommodation', 'activity', 'restaurant',
    'sightseeing', 'meeting', 'free_time', 'other',
  ]),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional().default('confirmed'),
  startTime: flexibleDateTime.optional(),
  endTime: flexibleDateTime.optional(),
  allDay: z.boolean().optional().default(false),
  duration: z.number().int().min(1).optional(),
  location: eventLocationSchema.optional(),
  notes: z.string().max(10000).optional(),
  cost: z.number().min(0).optional(),
  costCurrency: z.string().length(3).optional(),
  bookingReferences: z.array(bookingReferenceSchema).optional().default([]),
  checklistItems: z.array(checklistItemSchema).optional().default([]),
  reminderMinutes: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional().default(0),
});

export const updateEventSchema = createEventSchema.partial();

// Types re-exported from types/itinerary.ts to avoid duplicates
