import type { WeekendMode } from "../leave/working-days";
import { isWeekendDate } from "../calendar/events";

export type MalaysiaHolidayInput = {
  holidayDate: string;
  name: string;
};

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addLocalDays(iso: string, days: number): string {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Last rest day of the weekend for the branch mode (Sunday for KL/Selangor sat_sun). */
export function weekendEndWeekday(weekendMode: WeekendMode): number {
  switch (weekendMode) {
    case "fri_sat":
      return 6; // Saturday
    case "sun_only":
      return 0; // Sunday
    case "sat_sun":
    default:
      return 0; // Sunday
  }
}

export function nextWorkingDay(iso: string, weekendMode: WeekendMode): string {
  let cursor = addLocalDays(iso, 1);
  while (isWeekendDate(cursor, weekendMode)) {
    cursor = addLocalDays(cursor, 1);
  }
  return cursor;
}

/**
 * Malaysia practice for KL/Selangor (and similar sat_sun branches):
 * when a gazetted public holiday falls on the weekend-end day (Sunday),
 * the following Monday is a replacement holiday.
 *
 * Saturday-only holidays do not get a Monday replacement under sat_sun.
 */
export function expandMalaysiaReplacementHolidays<T extends MalaysiaHolidayInput>(
  holidays: T[],
  weekendMode: WeekendMode = "sat_sun",
): T[] {
  const byDate = new Map<string, T>();
  for (const holiday of holidays) {
    byDate.set(holiday.holidayDate, holiday);
  }

  const weekendEnd = weekendEndWeekday(weekendMode);
  const extras: T[] = [];

  for (const holiday of holidays) {
    const weekday = parseLocalDate(holiday.holidayDate).getDay();
    if (weekday !== weekendEnd) continue;

    const replacementDate = nextWorkingDay(holiday.holidayDate, weekendMode);
    if (byDate.has(replacementDate)) continue;

    const replacementName = holiday.name.includes("(Replacement)")
      ? holiday.name
      : `${holiday.name} (Replacement)`;

    const row = {
      ...holiday,
      holidayDate: replacementDate,
      name: replacementName,
    } as T;
    byDate.set(replacementDate, row);
    extras.push(row);
  }

  return [...holidays, ...extras].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
}

/** Expand a flat list of holiday date strings (names unknown). */
export function expandMalaysiaReplacementHolidayDates(
  dates: string[],
  weekendMode: WeekendMode = "sat_sun",
): string[] {
  const expanded = expandMalaysiaReplacementHolidays(
    dates.map((holidayDate) => ({ holidayDate, name: "Public holiday" })),
    weekendMode,
  );
  return [...new Set(expanded.map((row) => row.holidayDate))].sort();
}
