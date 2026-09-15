import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_ORG_TIMEZONE } from "@/lib/datetime/org-timezone";
import { getShiftEndTimestamp, resolveEmployeeShift } from "@/lib/attendance/shift";

export interface AutoClockOutOptions {
  asOf?: string | Date;
  organizationId?: string;
  bufferMinutes?: number;
}

export interface AutoClockOutResult {
  processed: number;
  autoClockedOut: number;
  details: Array<{
    id: string;
    employeeId: string;
    organizationId: string;
    workDate: string;
    clockOutAt: string;
  }>;
}

/**
 * Scans open attendance records across one or all organizations, checks if the scheduled shift
 * has ended (plus buffer), and automatically clocks out the record at the scheduled shift end time.
 * Idempotent and concurrency-safe via atomic conditional update.
 */
export async function performAutoClockOut(
  options: AutoClockOutOptions = {},
): Promise<AutoClockOutResult> {
  const admin = createAdminClient();
  const asOfDate = options.asOf ? new Date(options.asOf) : new Date();
  const asOfMs = asOfDate.getTime();
  const bufferMinutes = options.bufferMinutes ?? 30; // default 30-minute buffer after shift end for scheduled runs

  // 1. Fetch open attendance records where clock_out_at is null
  let query = admin
    .from("attendance_records")
    .select("id, organization_id, employee_id, work_date, session, clock_in_at, clock_out_at, status")
    .is("clock_out_at", null)
    .not("clock_in_at", "is", null);

  if (options.organizationId) {
    query = query.eq("organization_id", options.organizationId);
  }

  const { data: records, error } = await query;
  if (error) throw new Error(`Failed to query open attendance records: ${error.message}`);

  if (!records || records.length === 0) {
    return { processed: 0, autoClockedOut: 0, details: [] };
  }

  // 2. Fetch org timezones in batch
  const orgIds = Array.from(new Set(records.map((r) => r.organization_id)));
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, timezone")
    .in("id", orgIds);

  const tzByOrg = new Map<string, string>();
  for (const org of orgs ?? []) {
    tzByOrg.set(org.id, org.timezone || DEFAULT_ORG_TIMEZONE);
  }

  const details: AutoClockOutResult["details"] = [];

  // 3. Evaluate each open record
  for (const record of records) {
    if (!record.clock_in_at) continue;

    const timeZone = tzByOrg.get(record.organization_id) || DEFAULT_ORG_TIMEZONE;
    const shift = await resolveEmployeeShift(
      admin,
      record.organization_id,
      record.employee_id,
      record.work_date,
    );

    const shiftEndIso = getShiftEndTimestamp({
      workDate: record.work_date,
      shift,
      timeZone,
    });

    const shiftEndMs = new Date(shiftEndIso).getTime();
    const cutoffMs = shiftEndMs + bufferMinutes * 60 * 1000;

    // Has the shift end (+ buffer) passed relative to asOf?
    if (asOfMs >= cutoffMs) {
      // Safety guard: Ensure clock_out_at is not earlier than clock_in_at
      let targetClockOutAt = shiftEndIso;
      const clockInMs = new Date(record.clock_in_at).getTime();
      if (shiftEndMs < clockInMs) {
        targetClockOutAt = record.clock_in_at;
      }

      // Atomic idempotent update: only update if clock_out_at is still null
      const { data: updated, error: updateError } = await admin
        .from("attendance_records")
        .update({
          clock_out_at: targetClockOutAt,
          is_auto_clock_out: true,
        })
        .eq("id", record.id)
        .is("clock_out_at", null)
        .select("id");

      if (!updateError && updated && updated.length > 0) {
        details.push({
          id: record.id,
          employeeId: record.employee_id,
          organizationId: record.organization_id,
          workDate: record.work_date,
          clockOutAt: targetClockOutAt,
        });
      }
    }
  }

  return {
    processed: records.length,
    autoClockedOut: details.length,
    details,
  };
}
