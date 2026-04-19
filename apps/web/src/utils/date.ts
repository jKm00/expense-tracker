/**
 * Normalizes a Date to noon UTC on the same calendar day (in the user's local timezone).
 * This prevents timezone offsets from shifting the stored date by ±1 day.
 *
 * Example: User in UTC+2 picks April 19 → JS Date is 2025-04-19T00:00:00+02:00
 *          → getFullYear()=2025, getMonth()=3, getDate()=19 (local time)
 *          → returns new Date("2025-04-19T12:00:00Z")
 */
export function normalizeToNoonUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
  );
}
