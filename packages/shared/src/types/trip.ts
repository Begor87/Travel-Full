import type { TripVisibility } from './user.js';

export type TripStatus = 'planning' | 'active' | 'completed' | 'archived';
export type TripCategory = 'leisure' | 'business' | 'family' | 'adventure' | 'cultural' | 'other';

export interface TripDestination {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  order: number;
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  status: TripStatus;
  category: TripCategory;
  tags: string[];
  visibility: TripVisibility;
  startDate: string;   // ISO 8601 date
  endDate: string;     // ISO 8601 date
  timezone: string;
  destinations: TripDestination[];
  ownerId: string;
  collaboratorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TripSummary {
  id: string;
  title: string;
  coverImageUrl?: string;
  status: TripStatus;
  startDate: string;
  endDate: string;
  destinations: Pick<TripDestination, 'name' | 'countryCode'>[];
  collaboratorCount: number;
}

export interface CreateTripInput {
  title: string;
  description?: string;
  category: TripCategory;
  tags?: string[];
  visibility?: TripVisibility;
  startDate: string;
  endDate: string;
  timezone: string;
  destinations: Omit<TripDestination, 'id'>[];
}

export interface UpdateTripInput extends Partial<CreateTripInput> {
  status?: TripStatus;
  coverImageUrl?: string;
}
