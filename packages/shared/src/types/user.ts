export type UserRole = 'admin' | 'user';

export type UserPreferenceTheme = 'light' | 'dark' | 'system';
export type UserPreferenceCurrency = string; // ISO 4217
export type UserPreferenceLocale = string;   // BCP 47

export interface UserPreferences {
  theme: UserPreferenceTheme;
  currency: UserPreferenceCurrency;
  locale: UserPreferenceLocale;
  timezone: string;
  distanceUnit: 'km' | 'mi';
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1 | 6; // 0=Sun, 1=Mon, 6=Sat
  defaultTripVisibility: TripVisibility;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  tripCount: number;
  upcomingTripCount: number;
}

export type TripVisibility = 'private' | 'shared' | 'public';
