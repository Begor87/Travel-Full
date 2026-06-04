export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

export const TOKEN_EXPIRY = {
  ACCESS: 15 * 60,           // 15 minutes in seconds
  REFRESH: 30 * 24 * 60 * 60, // 30 days in seconds
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

export const FILE_LIMITS = {
  MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
  ],
} as const;

export const TRIP_STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  flight: 'Flight',
  train: 'Train',
  bus: 'Bus',
  ferry: 'Ferry',
  car: 'Car',
  accommodation: 'Accommodation',
  activity: 'Activity',
  restaurant: 'Restaurant',
  sightseeing: 'Sightseeing',
  meeting: 'Meeting',
  free_time: 'Free Time',
  other: 'Other',
};

export const TRANSPORT_CATEGORIES = ['flight', 'train', 'bus', 'ferry', 'car'] as const;

export const INVITATION_EXPIRY_DAYS = 7;

export const SYNC_RETRY_DELAYS = [1000, 3000, 10000, 30000] as const; // ms
