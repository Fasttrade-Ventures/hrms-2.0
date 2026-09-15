import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ORG_TIMEZONE, combineDateAndLocalTime } from "@/lib/datetime/org-timezone";

export type EmployeeShift = {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  graceMinutes: number;
};

export function formatShiftTime(value: string): string {
  return value.slice(0, 5);
}

export function isOvernightShift(
  shift?: { startTime: string; endTime: string } | null,
): boolean {
  if (!shift?.startTime || !shift?.endTime) return false;
  return shift.startTime > shift.endTime;
}

export function getPreviousDateString(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
}

export function getNextDateString(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

/**
 * Calculates the exact shift end ISO timestamp (UTC) for a given work date and shift.
 * If the shift is overnight (startTime > endTime), the shift ends on the following calendar day.
 * Defaults to "18:00" end time if no shift is assigned.
 */
export function getShiftEndTimestamp(options: {
  workDate: string;
  shift?: { startTime: string; endTime: string } | null;
  timeZone?: string;
}): string {
  const { workDate, shift, timeZone = DEFAULT_ORG_TIMEZONE } = options;
  const startTime = shift?.startTime || "09:00";
  const endTime = shift?.endTime || "18:00";
  const isOvernight = isOvernightShift({ startTime, endTime });
  const endDate = isOvernight ? getNextDateString(workDate) : workDate;
  return combineDateAndLocalTime(endDate, endTime, timeZone);
}

/**
 * Calculates the exact shift start ISO timestamp (UTC) for a given work date and shift.
 * Defaults to "09:00" start time if no shift is assigned.
 */
export function getShiftStartTimestamp(options: {
  workDate: string;
  shift?: { startTime?: string } | null;
  timeZone?: string;
}): string {
  const { workDate, shift, timeZone = DEFAULT_ORG_TIMEZONE } = options;
  const startTime = shift?.startTime || "09:00";
  return combineDateAndLocalTime(workDate, startTime, timeZone);
}

/**
 * Calculates the exact timestamp (UTC) when the grace period for a shift expires.
 * Defaults to 0 grace minutes if not configured.
 */
export function getShiftGraceCutoffTimestamp(options: {
  workDate: string;
  shift?: { startTime?: string; graceMinutes?: number | null } | null;
  timeZone?: string;
}): string {
  const { workDate, shift, timeZone = DEFAULT_ORG_TIMEZONE } = options;
  const startTime = shift?.startTime || "09:00";
  const graceMinutes = Number(shift?.graceMinutes ?? 0);
  const startIso = combineDateAndLocalTime(workDate, startTime, timeZone);
  return new Date(new Date(startIso).getTime() + graceMinutes * 60 * 1000).toISOString();
}

/**
 * Determines whether an evaluation timestamp has passed the shift start + grace period.
 */
export function isPastGraceCutoff(options: {
  asOf?: string | Date;
  workDate: string;
  shift?: { startTime?: string; graceMinutes?: number | null } | null;
  timeZone?: string;
}): boolean {
  const asOfMs = (options.asOf ? new Date(options.asOf) : new Date()).getTime();
  const cutoffIso = getShiftGraceCutoffTimestamp(options);
  return asOfMs > new Date(cutoffIso).getTime();
}

/**
 * Calculates whether a clock-in timestamp is late relative to the shift start time + grace minutes.
 * Defaults to 09:00 start time and 0 grace minutes if no shift is assigned.
 * If workDate is provided and clock-in is on the following calendar day (e.g. past midnight on an
 * overnight shift), relative day offset is factored in.
 */
export function isClockInLate(
  clockInAt: string | Date,
  shift?: { startTime: string; endTime?: string; graceMinutes?: number | null } | null,
  timeZone = DEFAULT_ORG_TIMEZONE,
  workDate?: string,
): boolean {
  const startTime = shift?.startTime || "09:00";
  const graceMinutes = Number(shift?.graceMinutes ?? 0);

  const [shiftHStr, shiftMStr, shiftSStr] = startTime.split(":");
  const shiftH = Number(shiftHStr ?? 0);
  const shiftM = Number(shiftMStr ?? 0);
  const shiftS = Number(shiftSStr ?? 0);

  const thresholdSeconds = shiftH * 3600 + (shiftM + graceMinutes) * 60 + shiftS;

  const date = typeof clockInAt === "string" ? new Date(clockInAt) : clockInAt;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const normalizedHour = hour === 24 ? 0 : hour;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);

  let clockInSeconds = normalizedHour * 3600 + minute * 60 + second;

  // If workDate is provided and the clock-in date is after workDate for an overnight shift,
  // add 24 hours (86,400 seconds) to evaluate lateness past midnight relative to shift start.
  if (workDate && shift?.endTime && isOvernightShift({ startTime, endTime: shift.endTime })) {
    const clockInDateStr = new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
    if (clockInDateStr > workDate) {
      clockInSeconds += 86400;
    }
  }

  return clockInSeconds > thresholdSeconds;
}

/**
 * Resolves an employee's applicable shift for a given work date.
 * Highest priority: date-specific roster entry.
 * Fallback: employee's default shift assignment.
 */
export async function resolveEmployeeShift(
  supabase: SupabaseClient,
  organizationId: string,
  employeeId: string,
  workDate: string,
): Promise<EmployeeShift | null> {
  // 1. Check roster entry for this work_date
  const { data: roster } = await supabase
    .from("roster_entries")
    .select("shift_id, shifts(id, name, start_time, end_time, grace_minutes)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("work_date", workDate)
    .maybeSingle();

  const rosterShiftRaw = roster?.shifts;
  const rosterShift = Array.isArray(rosterShiftRaw) ? rosterShiftRaw[0] : rosterShiftRaw;
  if (rosterShift) {
    return {
      id: rosterShift.id,
      name: rosterShift.name,
      startTime: formatShiftTime(rosterShift.start_time),
      endTime: formatShiftTime(rosterShift.end_time),
      graceMinutes: Number(rosterShift.grace_minutes ?? 0),
    };
  }

  // 2. Fall back to employee default shift
  const { data: employee } = await supabase
    .from("employees")
    .select("shift_id, shifts(id, name, start_time, end_time, grace_minutes)")
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  const empShiftRaw = employee?.shifts;
  const empShift = Array.isArray(empShiftRaw) ? empShiftRaw[0] : empShiftRaw;
  if (empShift) {
    return {
      id: empShift.id,
      name: empShift.name,
      startTime: formatShiftTime(empShift.start_time),
      endTime: formatShiftTime(empShift.end_time),
      graceMinutes: Number(empShift.grace_minutes ?? 0),
    };
  }

  return null;
}

/**
 * Resolves shifts for multiple work dates in batch for an employee.
 */
export async function resolveEmployeeShiftsBatch(
  supabase: SupabaseClient,
  organizationId: string,
  employeeId: string,
  workDates: string[],
): Promise<Map<string, EmployeeShift | null>> {
  const result = new Map<string, EmployeeShift | null>();
  if (workDates.length === 0) return result;

  const [{ data: rosterEntries }, { data: employee }] = await Promise.all([
    supabase
      .from("roster_entries")
      .select("work_date, shift_id, shifts(id, name, start_time, end_time, grace_minutes)")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .in("work_date", workDates),
    supabase
      .from("employees")
      .select("shift_id, shifts(id, name, start_time, end_time, grace_minutes)")
      .eq("organization_id", organizationId)
      .eq("id", employeeId)
      .maybeSingle(),
  ]);

  const empShiftRaw = employee?.shifts;
  const defaultShift = Array.isArray(empShiftRaw) ? empShiftRaw[0] : empShiftRaw;
  const formattedDefault: EmployeeShift | null = defaultShift
    ? {
        id: defaultShift.id,
        name: defaultShift.name,
        startTime: formatShiftTime(defaultShift.start_time),
        endTime: formatShiftTime(defaultShift.end_time),
        graceMinutes: Number(defaultShift.grace_minutes ?? 0),
      }
    : null;

  const rosterByDate = new Map<string, EmployeeShift>();
  for (const row of rosterEntries ?? []) {
    const shiftRaw = row.shifts;
    const shift = Array.isArray(shiftRaw) ? shiftRaw[0] : shiftRaw;
    if (shift) {
      rosterByDate.set(row.work_date, {
        id: shift.id,
        name: shift.name,
        startTime: formatShiftTime(shift.start_time),
        endTime: formatShiftTime(shift.end_time),
        graceMinutes: Number(shift.grace_minutes ?? 0),
      });
    }
  }

  for (const date of workDates) {
    result.set(date, rosterByDate.get(date) ?? formattedDefault);
  }

  return result;
}
