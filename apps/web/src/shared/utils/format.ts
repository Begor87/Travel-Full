import { format as dfFormat, getISOWeek } from 'date-fns';
import type { ResolvedPreferences } from '@/shared/hooks/usePreferences.ts';

// Maps a stored dateFormat preference to a date-fns pattern.
const DATE_PATTERNS: Record<string, string> = {
  'DD.MM.YYYY': 'dd.MM.yyyy',
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

/** Full date in the user's preferred format, e.g. "10.06.2026". */
export function formatDate(date: string | Date, prefs: ResolvedPreferences): string {
  const pattern = DATE_PATTERNS[prefs.dateFormat] ?? 'dd.MM.yyyy';
  return dfFormat(toDate(date), pattern);
}

/** Day + month only, e.g. "10.06" — derived from the preferred separator. */
export function formatDayMonth(date: string | Date, prefs: ResolvedPreferences): string {
  const sep = prefs.dateFormat.includes('.') ? '.' : prefs.dateFormat.includes('-') ? '-' : '/';
  return dfFormat(toDate(date), `dd${sep}MM`);
}

/** Full weekday name, e.g. "Wednesday". */
export function formatWeekday(date: string | Date): string {
  return dfFormat(toDate(date), 'EEEE');
}

/** Short weekday, e.g. "Wed". */
export function formatWeekdayShort(date: string | Date): string {
  return dfFormat(toDate(date), 'EEE');
}

/** ISO 8601 week number (the European convention, Monday-based). */
export function weekNumber(date: string | Date): number {
  return getISOWeek(toDate(date));
}

/** A compact range like "10.06 – 24.06.2026" for trip date spans. */
export function formatDateRange(start: string | Date, end: string | Date, prefs: ResolvedPreferences): string {
  return `${formatDayMonth(start, prefs)} – ${formatDate(end, prefs)}`;
}
