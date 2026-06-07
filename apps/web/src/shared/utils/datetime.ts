/**
 * Event times in Wanderlog are treated as "wall-clock time at the destination" —
 * a floating local time, not an instant tied to a timezone. This keeps the
 * planner intuitive: if you type 14:00 for a Tokyo dinner, it shows 14:00
 * everywhere, regardless of the device or server timezone.
 *
 * We achieve this by always storing the wall-clock value as a UTC instant
 * (suffix Z) and always reading it back with UTC accessors. The Z is a storage
 * convention here, not a real timezone claim.
 */

/**
 * Convert a `<input type="datetime-local">` value ("2026-01-15T14:00") into the
 * normalised ISO string the API stores ("2026-01-15T14:00:00.000Z").
 * Returns undefined for empty input.
 */
export function toServerDateTime(localValue?: string): string | undefined {
  if (!localValue) return undefined;
  // datetime-local may or may not include seconds
  const withSeconds = localValue.length === 16 ? `${localValue}:00` : localValue;
  return `${withSeconds}.000Z`;
}

/**
 * Convert a stored ISO string back into a value a datetime-local input accepts
 * ("2026-01-15T14:00"), preserving the wall-clock time.
 */
export function toLocalInputValue(serverIso?: string | null): string {
  if (!serverIso) return '';
  const d = new Date(serverIso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm in UTC
}

/** Format the time portion as HH:mm (24h), reading the stored wall-clock value. */
export function formatEventTime(serverIso?: string | null): string {
  if (!serverIso) return '';
  const d = new Date(serverIso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 16);
}

/** Format a time range "14:00 – 16:00", or just the start if no end. */
export function formatTimeRange(start?: string | null, end?: string | null): string {
  const s = formatEventTime(start);
  if (!s) return '';
  const e = formatEventTime(end);
  return e ? `${s} – ${e}` : s;
}
