import { useAuthStore } from '@/store/authStore.ts';
import type { UserPreferences } from '@wanderlog/shared';

/**
 * App-wide formatting defaults. These are the owner's preferred conventions and
 * act as the fallback when a user hasn't explicitly set a preference.
 */
export const DEFAULT_PREFERENCES: Pick<
  UserPreferences,
  'currency' | 'dateFormat' | 'timeFormat' | 'weekStartsOn' | 'distanceUnit' | 'timezone'
> = {
  currency: 'NOK',
  dateFormat: 'DD.MM.YYYY',
  timeFormat: '24h',
  weekStartsOn: 1, // Monday
  distanceUnit: 'km',
  timezone: 'Europe/Oslo',
};

export type ResolvedPreferences = typeof DEFAULT_PREFERENCES;

/** Reads the current user's formatting preferences, falling back to defaults. */
export function usePreferences(): ResolvedPreferences {
  const user = useAuthStore((s) => s.user);
  const prefs = (user?.preferences ?? {}) as Partial<UserPreferences>;
  return {
    currency: prefs.currency || DEFAULT_PREFERENCES.currency,
    dateFormat: prefs.dateFormat || DEFAULT_PREFERENCES.dateFormat,
    timeFormat: prefs.timeFormat || DEFAULT_PREFERENCES.timeFormat,
    weekStartsOn: prefs.weekStartsOn ?? DEFAULT_PREFERENCES.weekStartsOn,
    distanceUnit: prefs.distanceUnit || DEFAULT_PREFERENCES.distanceUnit,
    timezone: prefs.timezone || DEFAULT_PREFERENCES.timezone,
  };
}

/** True when the user prefers imperial units (miles, °F). */
export function isImperial(distanceUnit: string): boolean {
  return distanceUnit === 'mi';
}
