import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ORG_TIMEZONE } from "@/lib/datetime/org-timezone";

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

/**
 * Calculates whether a clock-in timestamp is late relative to the shift start time + grace minutes.
 * Defaults to 09:00 start time and 0 grace minutes if no shift is assigned.
 */
export function isClockInLate(
  clockInAt: string | Date,
  shift?: { startTime: string; graceMinutes?: number | null } | null,
  timeZone = DEFAULT_ORG_TIMEZONE,
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

  const clockInSeconds = normalizedHour * 3600 + minute * 60 + second;
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
