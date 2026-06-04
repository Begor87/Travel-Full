import { z } from 'zod';

export const tripDestinationSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  countryCode: z.string().length(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
  order: z.number().int().min(0),
});

const tripBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(['leisure', 'business', 'family', 'adventure', 'cultural', 'other']),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  visibility: z.enum(['private', 'shared', 'public']).optional().default('private'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  timezone: z.string().min(1),
  destinations: z.array(tripDestinationSchema).min(1, 'At least one destination required'),
});

export const createTripSchema = tripBaseSchema.refine(
  (data) => data.endDate >= data.startDate,
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

export const updateTripSchema = tripBaseSchema.partial().extend({
  status: z.enum(['planning', 'active', 'completed', 'archived']).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
});

// Types re-exported from types/trip.ts to avoid duplicates
