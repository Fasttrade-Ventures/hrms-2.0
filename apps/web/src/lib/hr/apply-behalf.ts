import type {
  ApplyBehalfLateInput,
  ApplyBehalfLeaveInput,
  ApplyBehalfListFilter,
} from "@hrms/validation";

import { logEmployeeEvent } from "@/lib/audit/log-employee-event";
import { calculateLeaveDays } from "@/lib/employee/leave";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

function startOfWeekIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export type BehalfApplicationRow = {
  id: string;
  type: "leave" | "late";
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  details: string;
  status: string;
  appliedAt: string;
  appliedOnBehalfBy: string | null;
};

export type BehalfListData = {
  rows: BehalfApplicationRow[];
  stats: {
    total: number;
    leaveCount: number;
    lateCount: number;
  };
};

export async function listActiveEmployeesForBehalf(): Promise<
  Array<{ id: string; full_name: string; employee_number: string }>
> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("full_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listLeaveTypesForBehalf(): Promise<Array<{ id: string; name: string }>> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("leave_types")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listBehalfApplications(
  filters: ApplyBehalfListFilter,
): Promise<BehalfListData> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();
  const weekStart = startOfWeekIso();

  const [leaveResult, lateResult] = await Promise.all([
    filters.type === "late"
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("leave_requests")
          .select(
            "id, employee_id, start_date, end_date, days, half_day, status, created_at, applied_on_behalf_by, leave_types(name), employees(full_name, employee_number)",
          )
          .eq("organization_id", organizationId)
          .not("applied_on_behalf_by", "is", null)
          .order("created_at", { ascending: false })
          .limit(100),
    filters.type === "leave"
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("late_requests")
          .select(
            "id, employee_id, request_date, actual_arrival_time, status, created_at, applied_on_behalf_by, employees(full_name, employee_number)",
          )
          .eq("organization_id", organizationId)
          .not("applied_on_behalf_by", "is", null)
          .order("created_at", { ascending: false })
          .limit(100),
  ]);

  if (leaveResult.error) throw new Error(leaveResult.error.message);
  if (lateResult.error) throw new Error(lateResult.error.message);

  const leaveRows: BehalfApplicationRow[] = (leaveResult.data ?? []).map((row) => {
    const employee = row.employees as { full_name?: string; employee_number?: string } | null;
    const leaveType = row.leave_types as { name?: string } | null;
    const half = row.half_day ? " · half-day" : "";
    return {
      id: row.id,
      type: "leave" as const,
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Employee",
      employeeNumber: employee?.employee_number ?? "",
      details: `${leaveType?.name ?? "Leave"} ${row.start_date}–${row.end_date} (${row.days}d)${half}`,
      status: row.status,
      appliedAt: row.created_at,
      appliedOnBehalfBy: row.applied_on_behalf_by,
    };
  });

  const lateRows: BehalfApplicationRow[] = (lateResult.data ?? []).map((row) => {
    const employee = row.employees as { full_name?: string; employee_number?: string } | null;
    const time = String(row.actual_arrival_time).slice(0, 5);
    return {
      id: row.id,
      type: "late" as const,
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Employee",
      employeeNumber: employee?.employee_number ?? "",
      details: `Late ${row.request_date} · arrived ${time}`,
      status: row.status,
      appliedAt: row.created_at,
      appliedOnBehalfBy: row.applied_on_behalf_by,
    };
  });

  let rows = [...leaveRows, ...lateRows].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );

  if (filters.range === "week") {
    rows = rows.filter((row) => row.appliedAt.slice(0, 10) >= weekStart);
  } else if (filters.range === "history") {
    rows = rows.filter((row) => row.appliedAt.slice(0, 10) < weekStart);
  }

  return {
    rows,
    stats: {
      total: leaveRows.length + lateRows.length,
      leaveCount: leaveRows.length,
      lateCount: lateRows.length,
    },
  };
}

export async function createBehalfLeave(
  input: ApplyBehalfLeaveInput,
  actorUserId: string,
): Promise<string> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const admin = createAdminClient();
  const days = calculateLeaveDays(input);

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found or inactive.");

  const { data, error } = await admin
    .from("leave_requests")
    .insert({
      organization_id: organizationId,
      employee_id: input.employeeId,
      leave_type_id: input.leaveTypeId,
      start_date: input.startDate,
      end_date: input.endDate,
      half_day: input.halfDay,
      days,
      reason: input.reason ?? null,
      status: "approved",
      applied_on_behalf_by: actorUserId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create leave on behalf.");

  await logEmployeeEvent({
    action: "hr.apply_behalf",
    actorUserId,
    organizationId,
    employeeId: input.employeeId,
    metadata: { type: "leave", requestId: data.id, days },
  });

  return data.id;
}

export async function createBehalfLate(
  input: ApplyBehalfLateInput,
  actorUserId: string,
): Promise<string> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const admin = createAdminClient();

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found or inactive.");

  const { data, error } = await admin
    .from("late_requests")
    .insert({
      organization_id: organizationId,
      employee_id: input.employeeId,
      request_date: input.requestDate,
      actual_arrival_time: normalizeTime(input.actualArrivalTime),
      reason: input.reason ?? null,
      status: "approved",
      applied_on_behalf_by: actorUserId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create late report on behalf.");

  await logEmployeeEvent({
    action: "hr.apply_behalf",
    actorUserId,
    organizationId,
    employeeId: input.employeeId,
    metadata: { type: "late", requestId: data.id },
  });

  return data.id;
}
