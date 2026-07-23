export type WeekendMode = "sat_sun" | "fri_sat" | "sun_only";

function isWeekend(date: Date, mode: WeekendMode): boolean {
  const day = date.getDay();
  switch (mode) {
    case "sat_sun":
      return day === 0 || day === 6;
    case "fri_sat":
      return day === 5 || day === 6;
    case "sun_only":
      return day === 0;
    default:
      return day === 0 || day === 6;
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Count working days inclusive between two dates (Asia/KL calendar dates). */
export function countWorkingDays(
  start: Date,
  end: Date,
  options: {
    weekendMode: WeekendMode;
    holidays?: string[]; // YYYY-MM-DD
    halfDay?: boolean;
  },
): number {
  const holidaySet = new Set(options.holidays ?? []);
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  if (cursor > last) return 0;

  let days = 0;
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    if (!isWeekend(cursor, options.weekendMode) && !holidaySet.has(key)) {
      days += 1;
    }
    cursor = addDays(cursor, 1);
  }

  if (options.halfDay && days > 0) {
    return Math.max(0.5, days - 0.5);
  }
  return days;
}
