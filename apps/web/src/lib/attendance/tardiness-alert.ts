import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_ORG_TIMEZONE, orgLocalDateString } from "@/lib/datetime/org-timezone";
import {
  formatShiftTime,
  getShiftGraceCutoffTimestamp,
  type EmployeeShift,
} from "@/lib/attendance/shift";
import { queueNotification } from "@/lib/notifications/queue";

export interface TardinessAlertOptions {
  asOf?: string | Date;
  organizationId?: string;
}

export interface TardinessAlertDetail {
  employeeId: string;
  employeeName: string;
  organizationId: string;
  workDate: string;
  shiftName: string;
  shiftStart: string;
  graceMinutes: number;
  cutoffTime: string;
  userId: string | null;
}

export interface TardinessAlertResult {
  processed: number;
  alertsSent: number;
  details: TardinessAlertDetail[];
  elapsedMs?: number;
}

/**
 * Scans active employees across one or all organizations who have a scheduled shift
 * today and have not clocked in past their shift start + grace minutes threshold.
 * Safely excludes employees who are on approved leave or have already submitted late reports.
 * Dispatches an in-app notification idempotently via notification_outbox.
 */
export async function performTardinessAlertSweep(
  options: TardinessAlertOptions = {},
): Promise<TardinessAlertResult> {
  const admin = createAdminClient();
  const asOfDate = options.asOf ? new Date(options.asOf) : new Date();
  const asOfMs = asOfDate.getTime();

  let orgQuery = admin.from("organizations").select("id, timezone");
  if (options.organizationId) {
    orgQuery = orgQuery.eq("id", options.organizationId);
  }

  const { data: orgs, error: orgError } = await orgQuery;
  if (orgError) throw new Error(`Failed to query organizations: ${orgError.message}`);

  if (!orgs || orgs.length === 0) {
    return { processed: 0, alertsSent: 0, details: [] };
  }

  let totalProcessed = 0;
  const details: TardinessAlertDetail[] = [];

  for (const org of orgs) {
    const timeZone = org.timezone || DEFAULT_ORG_TIMEZONE;
    const workDate = orgLocalDateString(asOfDate, timeZone);

    // 1. Fetch active employees
    const { data: employees, error: empError } = await admin
      .from("employees")
      .select("id, organization_id, full_name, email, shift_id")
      .eq("organization_id", org.id)
      .eq("status", "active");

    if (empError) throw new Error(`Failed to query employees for org ${org.id}: ${empError.message}`);
    if (!employees || employees.length === 0) continue;

    totalProcessed += employees.length;

    // 2. Batch fetch roster entries for workDate
    const { data: rosterEntries } = await admin
      .from("roster_entries")
      .select("employee_id, shift_id, shifts(id, name, start_time, end_time, grace_minutes)")
      .eq("organization_id", org.id)
      .eq("work_date", workDate);

    // 3. Batch fetch default shifts referenced by employees
    const shiftIds = Array.from(
      new Set(employees.map((e) => e.shift_id).filter(Boolean)),
    ) as string[];

    const defaultShiftsMap = new Map<string, EmployeeShift>();
    if (shiftIds.length > 0) {
      const { data: shiftRows } = await admin
        .from("shifts")
        .select("id, name, start_time, end_time, grace_minutes")
        .in("id", shiftIds);

      for (const s of shiftRows ?? []) {
        defaultShiftsMap.set(s.id, {
          id: s.id,
          name: s.name,
          startTime: formatShiftTime(s.start_time),
          endTime: formatShiftTime(s.end_time),
          graceMinutes: Number(s.grace_minutes ?? 0),
        });
      }
    }

    // 4. Batch fetch today's attendance records where clock_in_at is not null
    const { data: attendanceRows } = await admin
      .from("attendance_records")
      .select("employee_id")
      .eq("organization_id", org.id)
      .eq("work_date", workDate)
      .not("clock_in_at", "is", null);

    const clockedInEmployeeIds = new Set((attendanceRows ?? []).map((r) => r.employee_id));

    // 5. Batch fetch approved leaves overlapping today
    const { data: leaveRows } = await admin
      .from("leave_requests")
      .select("employee_id")
      .eq("organization_id", org.id)
      .eq("status", "approved")
      .lte("start_date", workDate)
      .gte("end_date", workDate);

    const onLeaveEmployeeIds = new Set((leaveRows ?? []).map((l) => l.employee_id));

    // 6. Batch fetch late requests for today
    const { data: lateRows } = await admin
      .from("late_requests")
      .select("employee_id")
      .eq("organization_id", org.id)
      .eq("request_date", workDate)
      .in("status", ["pending", "approved"]);

    const lateReportEmployeeIds = new Set((lateRows ?? []).map((lr) => lr.employee_id));

    // 7. Batch fetch user memberships
    const { data: memberships } = await admin
      .from("organization_memberships")
      .select("employee_id, user_id")
      .eq("organization_id", org.id)
      .not("employee_id", "is", null);

    const userByEmployeeId = new Map<string, string>();
    for (const m of memberships ?? []) {
      if (m.employee_id && m.user_id) {
        userByEmployeeId.set(m.employee_id, m.user_id);
      }
    }

    // Build roster lookup
    const rosterMap = new Map<string, EmployeeShift>();
    for (const r of rosterEntries ?? []) {
      const shiftRaw = r.shifts;
      const shift = Array.isArray(shiftRaw) ? shiftRaw[0] : shiftRaw;
      if (shift) {
        rosterMap.set(r.employee_id, {
          id: shift.id,
          name: shift.name,
          startTime: formatShiftTime(shift.start_time),
          endTime: formatShiftTime(shift.end_time),
          graceMinutes: Number(shift.grace_minutes ?? 0),
        });
      }
    }

    // 8. Evaluate each employee
    for (const emp of employees) {
      // Must have an assigned shift
      const shift =
        rosterMap.get(emp.id) ?? (emp.shift_id ? defaultShiftsMap.get(emp.shift_id) : null);
      if (!shift) continue;

      // Has the shift grace cutoff passed?
      const cutoffIso = getShiftGraceCutoffTimestamp({ workDate, shift, timeZone });
      const cutoffMs = new Date(cutoffIso).getTime();
      if (asOfMs <= cutoffMs) continue;

      // Filter out already clocked in
      if (clockedInEmployeeIds.has(emp.id)) continue;

      // Filter out approved leave
      if (onLeaveEmployeeIds.has(emp.id)) continue;

      // Filter out submitted late report
      if (lateReportEmployeeIds.has(emp.id)) continue;

      const userId = userByEmployeeId.get(emp.id) ?? null;
      const idempotencyKey = `attendance-tardiness-${emp.id}-${workDate}`;

      if (userId) {
        await queueNotification({
          organizationId: org.id,
          recipientUserId: userId,
          channel: "in_app",
          template: "attendance.tardy",
          payload: {
            workDate,
            shiftName: shift.name,
            shiftStart: shift.startTime,
            graceMinutes: shift.graceMinutes,
            cutoffTime: cutoffIso,
            href: "/employee/attendance",
          },
          idempotencyKey,
        });
      }

      details.push({
        employeeId: emp.id,
        employeeName: emp.full_name || emp.email || "Employee",
        organizationId: org.id,
        workDate,
        shiftName: shift.name,
        shiftStart: shift.startTime,
        graceMinutes: shift.graceMinutes,
        cutoffTime: cutoffIso,
        userId,
      });
    }
  }

  return {
    processed: totalProcessed,
    alertsSent: details.length,
    details,
  };
}
