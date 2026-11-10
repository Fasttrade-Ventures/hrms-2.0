import { buildAuPayFileCsv, mapAuPayFileLines, type AuPayFileEmployee } from "@hrms/domain";

import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { loadLeaveUnits } from "@/lib/leave/units";
import { createClient } from "@/lib/supabase/server";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function fail<T>(error: { message: string } | null, data: T[] | null): T[] {
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type AuPayFileResult = { fileName: string; csv: string };

/**
 * Builds the Xero and MYOB pay file for an Australian organization.
 * Time, leave, and allowances only. No tax, super, or award calculation.
 * Returns null when the organization is not Australian.
 */
export async function generateAuPayFile(
  periodStart: string,
  periodEnd: string,
): Promise<AuPayFileResult | null> {
  await requireModule("payroll");
  await requireRole("hr_administrator");

  if (!ISO_DATE.test(periodStart) || !ISO_DATE.test(periodEnd) || periodStart > periodEnd) {
    throw new Error("Choose a valid period.");
  }

  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const units = await loadLeaveUnits(supabase, organizationId);
  if (units.country !== "AU") return null;

  const employeeRows = await supabase
    .from("employees")
    .select("id, employee_number, full_name, employee_profiles(hourly_rate)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("employee_number")
    .then(({ data, error }) => fail(error, data));

  const employees: AuPayFileEmployee[] = employeeRows.map((row) => {
    const profile = one(row.employee_profiles) as { hourly_rate: number | string | null } | null;
    const rate = profile?.hourly_rate == null ? null : Number(profile.hourly_rate);
    return {
      id: row.id,
      employeeNumber: row.employee_number,
      fullName: row.full_name,
      hourlyRate: rate !== null && Number.isFinite(rate) ? rate : null,
    };
  });

  const [sessionRows, overtimeRows, leaveRows, allowanceRows] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("employee_id, clock_in_at, clock_out_at")
      .eq("organization_id", organizationId)
      .not("clock_in_at", "is", null)
      .not("clock_out_at", "is", null)
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .then(({ data, error }) => fail(error, data)),
    supabase
      .from("overtime_requests")
      .select("employee_id, hours, rate_type")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .then(({ data, error }) => fail(error, data)),
    supabase
      .from("leave_requests")
      .select("employee_id, days, leave_types(name, is_unpaid)")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .gte("start_date", periodStart)
      .lte("start_date", periodEnd)
      .then(({ data, error }) => fail(error, data)),
    supabase
      .from("employee_recurring_allowances")
      .select("employee_id, amount")
      .eq("organization_id", organizationId)
      .lte("effective_from", periodEnd)
      .or(`effective_to.is.null,effective_to.gte.${periodStart}`)
      .then(({ data, error }) => fail(error, data)),
  ]);

  const lines = mapAuPayFileLines({
    periodStart,
    periodEnd,
    standardDayHours: units.standardDayHours,
    employees,
    sessions: sessionRows.map((row) => ({
      employeeId: row.employee_id,
      clockInAt: row.clock_in_at,
      clockOutAt: row.clock_out_at,
    })),
    overtime: overtimeRows.map((row) => ({
      employeeId: row.employee_id,
      hours: Number(row.hours),
      rateType: String(row.rate_type),
      // overtime_requests stores only a multiplier today.
      hourlyRate: null,
    })),
    leave: leaveRows.map((row) => {
      const type = one(row.leave_types) as { name?: string; is_unpaid?: boolean } | null;
      return {
        employeeId: row.employee_id,
        days: Number(row.days),
        leaveTypeName: type?.name ?? "",
        // Unknown leave types are left out rather than paid by guess.
        isUnpaid: !type || type.is_unpaid === true,
      };
    }),
    allowances: allowanceRows.map((row) => ({
      employeeId: row.employee_id,
      amount: Number(row.amount),
    })),
  });

  return {
    fileName: `pay-file-${periodStart}-to-${periodEnd}.csv`,
    csv: buildAuPayFileCsv(lines),
  };
}
