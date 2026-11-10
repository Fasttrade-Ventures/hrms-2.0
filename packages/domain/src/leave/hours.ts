/**
 * Leave is stored in days. Australia displays and accepts hours, using the
 * organization's standard day length (7.6 hours by default).
 */

function assertStandardDayHours(standardDayHours: number): void {
  if (!Number.isFinite(standardDayHours) || standardDayHours <= 0) {
    throw new Error("standardDayHours must be greater than 0.");
  }
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Converts stored days to display hours (2 decimal places). */
export function daysToHours(days: number, standardDayHours: number): number {
  assertStandardDayHours(standardDayHours);
  return round(days * standardDayHours, 2);
}

/** Converts entered hours to days (4 decimal places). The database column keeps 2. */
export function hoursToDays(hours: number, standardDayHours: number): number {
  assertStandardDayHours(standardDayHours);
  return round(hours / standardDayHours, 4);
}
