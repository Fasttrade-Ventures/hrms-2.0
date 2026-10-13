import type {
  ApplyBehalfClaimInput,
  ApplyBehalfLateInput,
  ApplyBehalfLeaveInput,
  ApplyBehalfListFilter,
  ApplyBehalfOvertimeInput,
  ApplyBehalfReplacementCreditInput,
} from "@hrms/validation";

import { logEmployeeEvent } from "@/lib/audit/log-employee-event";
import { calculateLeaveDays } from "@/lib/employee/leave";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  requireOrganizationId,
  requireOrganizationIdForWrite,
} from "@/lib/auth/organization-context";

export type {
  BehalfApplicationDetail,
  BehalfApplicationRow,
  BehalfApplicationType,
  BehalfClaimDetail,
  BehalfLateDetail,
  BehalfLeaveDetail,
  BehalfListData,
  BehalfOvertimeDetail,
  BehalfReplacementDetail,
} from "@/lib/hr/apply-behalf-shared";
export { getBehalfApplicationPath } from "@/lib/hr/apply-behalf-shared";

import type {
  BehalfApplicationRow,
  BehalfClaimDetail,
  BehalfLateDetail,
  BehalfLeaveDetail,
  BehalfListData,
  BehalfOvertimeDetail,
  BehalfReplacementDetail,
} from "@/lib/hr/apply-behalf-shared";

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

function resolveBranchScopeIds(options?: {
  branchId?: string;
  branchIds?: string[];
}): string[] | null {
  if (options?.branchIds && options.branchIds.length > 0) return options.branchIds;
  if (options?.branchId) return [options.branchId];
  return null;
}

function employeeInBranchScope(
  employeeBranchId: string | null | undefined,
  options?: { branchId?: string; branchIds?: string[] },
): boolean {
  const scope = resolveBranchScopeIds(options);
  if (!scope) return true;
  return Boolean(employeeBranchId && scope.includes(employeeBranchId));
}

export async function listActiveEmployeesForBehalf(options?: {
  branchId?: string;
  branchIds?: string[];
}): Promise<Array<{ id: string; full_name: string; employee_number: string }>> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  let query = supabase
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("full_name");

  const scopeIds = resolveBranchScopeIds(options);
  if (scopeIds) {
    query = query.in("branch_id", scopeIds);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listLeaveTypesForBehalf(): Promise<Array<{ id: string; name: string }>> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("leave_types")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listClaimTypesForBehalf(): Promise<
  Array<{
    id: string;
    name: string;
    max_amount: number | null;
    is_mileage?: boolean | null;
    rate_per_km?: number | null;
  }>
> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("claim_types")
    .select("id, name, max_amount, is_mileage, rate_per_km")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    max_amount: row.max_amount != null ? Number(row.max_amount) : null,
    is_mileage: Boolean(row.is_mileage),
    rate_per_km: row.rate_per_km != null ? Number(row.rate_per_km) : null,
  }));
}

export async function listBehalfApplications(
  filters: ApplyBehalfListFilter,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<BehalfListData> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  let branchEmployeeIds: string[] | null = null;
  const scopeIds = resolveBranchScopeIds(options);
  if (scopeIds) {
    const { data: branchEmployees, error: branchError } = await supabase
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .in("branch_id", scopeIds);
    if (branchError) throw new Error(branchError.message);
    branchEmployeeIds = (branchEmployees ?? []).map((row) => row.id);
    if (branchEmployeeIds.length === 0) {
      return {
        rows: [],
        total: 0,
        page: filters.page,
        pageSize: filters.pageSize,
        stats: {
          total: 0,
          leaveCount: 0,
          lateCount: 0,
          claimCount: 0,
          otCount: 0,
          replacementCount: 0,
        },
      };
    }
  }

  const queryLeave = filters.type === "all" || filters.type === "leave";
  const queryLate = filters.type === "all" || filters.type === "late";
  const queryClaim = filters.type === "all" || filters.type === "claim";
  const queryOt = filters.type === "all" || filters.type === "overtime";
  const queryReplacement = filters.type === "all" || filters.type === "replacement";

  async function fetchLeaveRecords() {
    if (!queryLeave) return [];
    let q = supabase
      .from("leave_requests")
      .select(
        "id, employee_id, start_date, end_date, days, half_day, status, created_at, applied_on_behalf_by, leave_types(name), employees(full_name, employee_number)",
      )
      .eq("organization_id", organizationId)
      .not("applied_on_behalf_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (branchEmployeeIds) {
      q = q.in("employee_id", branchEmployeeIds);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async function fetchLateRecords() {
    if (!queryLate) return [];
    let q = supabase
      .from("late_requests")
      .select(
        "id, employee_id, request_date, actual_arrival_time, status, created_at, applied_on_behalf_by, employees(full_name, employee_number)",
      )
      .eq("organization_id", organizationId)
      .not("applied_on_behalf_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (branchEmployeeIds) {
      q = q.in("employee_id", branchEmployeeIds);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async function fetchClaimRecords() {
    if (!queryClaim) return [];
    let q = supabase
      .from("claims")
      .select(
        "id, employee_id, amount, receipt_date, description, status, created_at, applied_on_behalf_by, claim_types(name), employees(full_name, employee_number)",
      )
      .eq("organization_id", organizationId)
      .not("applied_on_behalf_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (branchEmployeeIds) {
      q = q.in("employee_id", branchEmployeeIds);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async function fetchOtRecords() {
    if (!queryOt) return [];
    let q = supabase
      .from("overtime_requests")
      .select(
        "id, employee_id, work_date, hours, rate_type, status, created_at, applied_on_behalf_by, employees(full_name, employee_number)",
      )
      .eq("organization_id", organizationId)
      .not("applied_on_behalf_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (branchEmployeeIds) {
      q = q.in("employee_id", branchEmployeeIds);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async function fetchReplacementRecords() {
    if (!queryReplacement) return [];
    let q = supabase
      .from("replacement_credits")
      .select(
        "id, employee_id, work_date, credit_days, description, status, created_at, applied_on_behalf_by, employees(full_name, employee_number)",
      )
      .eq("organization_id", organizationId)
      .not("applied_on_behalf_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (branchEmployeeIds) {
      q = q.in("employee_id", branchEmployeeIds);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const [leaveData, lateData, claimData, otData, replacementData] = await Promise.all([
    fetchLeaveRecords(),
    fetchLateRecords(),
    fetchClaimRecords(),
    fetchOtRecords(),
    fetchReplacementRecords(),
  ]);

  const leaveRows: BehalfApplicationRow[] = leaveData.map((row) => {
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

  const lateRows: BehalfApplicationRow[] = lateData.map((row) => {
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

  const claimRows: BehalfApplicationRow[] = claimData.map((row) => {
    const employee = row.employees as { full_name?: string; employee_number?: string } | null;
    const claimType = row.claim_types as { name?: string } | null;
    const amountNum = Number(row.amount).toFixed(2);
    return {
      id: row.id,
      type: "claim" as const,
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Employee",
      employeeNumber: employee?.employee_number ?? "",
      details: `${claimType?.name ?? "Claim"} RM ${amountNum} (${row.receipt_date})`,
      status: row.status,
      appliedAt: row.created_at,
      appliedOnBehalfBy: row.applied_on_behalf_by,
    };
  });

  const otRows: BehalfApplicationRow[] = otData.map((row) => {
    const employee = row.employees as { full_name?: string; employee_number?: string } | null;
    return {
      id: row.id,
      type: "overtime" as const,
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Employee",
      employeeNumber: employee?.employee_number ?? "",
      details: `OT ${row.work_date} · ${row.hours}h (@${row.rate_type}x)`,
      status: row.status,
      appliedAt: row.created_at,
      appliedOnBehalfBy: row.applied_on_behalf_by,
    };
  });

  const replacementRows: BehalfApplicationRow[] = replacementData.map((row) => {
    const employee = row.employees as { full_name?: string; employee_number?: string } | null;
    return {
      id: row.id,
      type: "replacement" as const,
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Employee",
      employeeNumber: employee?.employee_number ?? "",
      details: `Credit ${row.credit_days}d (${row.work_date})`,
      status: row.status,
      appliedAt: row.created_at,
      appliedOnBehalfBy: row.applied_on_behalf_by,
    };
  });

  let rows = [...leaveRows, ...lateRows, ...claimRows, ...otRows, ...replacementRows].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );

  if (filters.dateFrom) {
    rows = rows.filter((row) => row.appliedAt.slice(0, 10) >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    rows = rows.filter((row) => row.appliedAt.slice(0, 10) <= filters.dateTo!);
  }

  const total = rows.length;
  const pageSize = filters.pageSize;
  const page = filters.page;
  const from = (page - 1) * pageSize;
  const pagedRows = rows.slice(from, from + pageSize);

  return {
    rows: pagedRows,
    total,
    page,
    pageSize,
    stats: {
      total: leaveRows.length + lateRows.length + claimRows.length + otRows.length + replacementRows.length,
      leaveCount: leaveRows.length,
      lateCount: lateRows.length,
      claimCount: claimRows.length,
      otCount: otRows.length,
      replacementCount: replacementRows.length,
    },
  };
}

async function notifyBehalfEmployee(
  client: ReturnType<typeof createAdminClient>,
  organizationId: string,
  employeeId: string,
  type: string,
  requestId: string,
) {
  try {
    const { data: emp } = await client
      .from("employees")
      .select("user_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (emp?.user_id) {
      const { queueNotification } = await import("@/lib/notifications/queue");
      await queueNotification({
        organizationId,
        recipientUserId: emp.user_id,
        channel: "in_app",
        template: "approval.approve",
        payload: { requestType: type, requestId },
        idempotencyKey: `behalf-${type}-${requestId}`,
      });
    }
  } catch {
    // Notifications must not block primary flows.
  }
}

export async function createBehalfLeave(
  input: ApplyBehalfLeaveInput,
  actorUserId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<string> {
  const session = await requireRole("hr_administrator", "branch_admin");
  const isHr = session.membership.roles.includes("hr_administrator");
  const organizationId = await requireOrganizationIdForWrite();
  const admin = createAdminClient();

  const { loadLeaveHolidayDates } = await import("@/lib/leave/holidays");
  const holidays = await loadLeaveHolidayDates(organizationId);
  const days = calculateLeaveDays(input, { holidays });

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, branch_id")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found or inactive.");
  if (!employeeInBranchScope(employee.branch_id, options)) {
    throw new Error("Employee is outside your branch scope.");
  }

  const { assertLeaveDatesAllowed } = await import("@/lib/leave/blackout");
  await assertLeaveDatesAllowed(organizationId, input.leaveTypeId, input.startDate, input.endDate);

  const { assertLeaveBalance } = await import("@/lib/leave/balance");
  await assertLeaveBalance({
    organizationId,
    employeeId: input.employeeId,
    leaveTypeId: input.leaveTypeId,
    days,
    allowOverride: isHr,
    overrideReason: input.overrideReason,
    client: admin,
  });

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

  const { data: leaveType } = await admin
    .from("leave_types")
    .select("name")
    .eq("id", input.leaveTypeId)
    .maybeSingle();

  const { isReplacementLeaveType, consumeReplacementCredits } = await import(
    "@/lib/leave/replacement-credit"
  );
  if (isReplacementLeaveType(leaveType?.name)) {
    try {
      await consumeReplacementCredits({
        organizationId,
        employeeId: input.employeeId,
        leaveRequestId: data.id,
        days,
        actorUserId,
        client: admin,
      });
    } catch (err) {
      await admin.from("leave_requests").delete().eq("id", data.id);
      throw err;
    }
  }

  await logEmployeeEvent({
    action: "hr.apply_behalf",
    actorUserId,
    organizationId,
    employeeId: input.employeeId,
    metadata: {
      type: "leave",
      requestId: data.id,
      days,
      overrideReason: input.overrideReason?.trim() || null,
    },
  });

  await notifyBehalfEmployee(admin, organizationId, input.employeeId, "leave", data.id);

  return data.id;
}

export async function createBehalfLate(
  input: ApplyBehalfLateInput,
  actorUserId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<string> {
  await requireRole("hr_administrator", "branch_admin");
  const organizationId = await requireOrganizationIdForWrite();
  const admin = createAdminClient();

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, branch_id")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found or inactive.");
  if (!employeeInBranchScope(employee.branch_id, options)) {
    throw new Error("Employee is outside your branch scope.");
  }

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

  await notifyBehalfEmployee(admin, organizationId, input.employeeId, "late", data.id);

  return data.id;
}

export async function createBehalfClaim(
  input: ApplyBehalfClaimInput,
  actorUserId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<string> {
  await requireRole("hr_administrator", "branch_admin");
  const organizationId = await requireOrganizationIdForWrite();
  const admin = createAdminClient();

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, branch_id")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found or inactive.");
  if (!employeeInBranchScope(employee.branch_id, options)) {
    throw new Error("Employee is outside your branch scope.");
  }

  const { data: claimType, error: claimTypeError } = await admin
    .from("claim_types")
    .select("id, name, max_amount, is_mileage, rate_per_km")
    .eq("id", input.claimTypeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (claimTypeError) throw new Error(claimTypeError.message);
  if (!claimType) throw new Error("Claim type not found.");

  const isMileage = Boolean(claimType.is_mileage || input.isMileage);
  let finalAmount = Number(input.amount);
  let distanceKm: number | null = null;
  let ratePerKm: number | null = null;
  let origin: string | null = null;
  let destination: string | null = null;

  if (isMileage) {
    distanceKm = input.distanceKm ? Number(input.distanceKm) : null;
    if (!distanceKm || distanceKm <= 0) {
      throw new Error("Please enter a valid travel distance in km.");
    }
    origin = input.origin?.trim() || null;
    destination = input.destination?.trim() || null;
    if (!origin || !destination) {
      throw new Error("Please enter both origin and destination for mileage claims.");
    }
    ratePerKm =
      claimType.rate_per_km != null
        ? Number(claimType.rate_per_km)
        : Number(input.ratePerKm ?? 0);
    finalAmount = Number((distanceKm * ratePerKm).toFixed(2));
  }

  if (claimType.max_amount != null && finalAmount > Number(claimType.max_amount)) {
    throw new Error(
      `Amount exceeds maximum allowed (RM ${Number(claimType.max_amount).toFixed(2)}).`,
    );
  }

  const { data, error } = await admin
    .from("claims")
    .insert({
      organization_id: organizationId,
      employee_id: input.employeeId,
      claim_type_id: input.claimTypeId,
      amount: finalAmount.toFixed(2),
      receipt_date: input.receiptDate,
      description: input.description ?? null,
      is_mileage: isMileage,
      distance_km: distanceKm,
      rate_per_km: ratePerKm,
      origin,
      destination,
      receipt_file_id: input.attachmentFileId ?? null,
      status: "approved",
      applied_on_behalf_by: actorUserId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create claim on behalf.");

  await logEmployeeEvent({
    action: "hr.apply_behalf",
    actorUserId,
    organizationId,
    employeeId: input.employeeId,
    metadata: {
      type: "claim",
      requestId: data.id,
      amount: finalAmount,
      isMileage,
    },
  });

  await notifyBehalfEmployee(admin, organizationId, input.employeeId, "claim", data.id);

  return data.id;
}

export async function createBehalfOvertime(
  input: ApplyBehalfOvertimeInput,
  actorUserId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<string> {
  await requireRole("hr_administrator", "branch_admin");
  const organizationId = await requireOrganizationIdForWrite();
  const admin = createAdminClient();

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, branch_id")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found or inactive.");
  if (!employeeInBranchScope(employee.branch_id, options)) {
    throw new Error("Employee is outside your branch scope.");
  }

  const { data, error } = await admin
    .from("overtime_requests")
    .insert({
      organization_id: organizationId,
      employee_id: input.employeeId,
      work_date: input.workDate,
      hours: input.hours,
      rate_type: input.rateType,
      reason: input.reason ?? null,
      status: "approved",
      applied_on_behalf_by: actorUserId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create overtime on behalf.");

  await logEmployeeEvent({
    action: "hr.apply_behalf",
    actorUserId,
    organizationId,
    employeeId: input.employeeId,
    metadata: {
      type: "overtime",
      requestId: data.id,
      workDate: input.workDate,
      hours: input.hours,
      rateType: input.rateType,
    },
  });

  await notifyBehalfEmployee(admin, organizationId, input.employeeId, "overtime", data.id);

  return data.id;
}

export async function createBehalfReplacementCredit(
  input: ApplyBehalfReplacementCreditInput,
  actorUserId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<string> {
  await requireRole("hr_administrator", "branch_admin");
  const organizationId = await requireOrganizationIdForWrite();
  const admin = createAdminClient();

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, branch_id")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found or inactive.");
  if (!employeeInBranchScope(employee.branch_id, options)) {
    throw new Error("Employee is outside your branch scope.");
  }

  const { data, error } = await admin
    .from("replacement_credits")
    .insert({
      organization_id: organizationId,
      employee_id: input.employeeId,
      work_date: input.workDate,
      credit_days: input.creditDays,
      description: input.description ?? null,
      status: "approved",
      applied_on_behalf_by: actorUserId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create replacement credit on behalf.");
  }

  await logEmployeeEvent({
    action: "hr.apply_behalf",
    actorUserId,
    organizationId,
    employeeId: input.employeeId,
    metadata: {
      type: "replacement",
      requestId: data.id,
      workDate: input.workDate,
      creditDays: input.creditDays,
    },
  });

  await notifyBehalfEmployee(admin, organizationId, input.employeeId, "replacement", data.id);

  return data.id;
}

async function resolveSubmitterName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("organization_memberships")
    .select("employees(full_name)")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const employee = data?.employees as { full_name?: string } | null;
  return employee?.full_name ?? null;
}

export async function getBehalfLeaveDetail(
  requestId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<BehalfLeaveDetail | null> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "id, employee_id, start_date, end_date, half_day, days, reason, status, created_at, applied_on_behalf_by, leave_types(name), employees(full_name, employee_number, branch_id)",
    )
    .eq("organization_id", organizationId)
    .eq("id", requestId)
    .not("applied_on_behalf_by", "is", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const employee = data.employees as {
    full_name?: string;
    employee_number?: string;
    branch_id?: string | null;
  } | null;
  if (!employeeInBranchScope(employee?.branch_id, options)) {
    return null;
  }

  const leaveType = data.leave_types as { name?: string } | null;
  const submittedByName = await resolveSubmitterName(
    supabase,
    organizationId,
    data.applied_on_behalf_by,
  );

  return {
    type: "leave",
    id: data.id,
    employeeId: data.employee_id,
    employeeName: employee?.full_name ?? "Employee",
    employeeNumber: employee?.employee_number ?? "",
    leaveTypeName: leaveType?.name ?? "Leave",
    startDate: data.start_date,
    endDate: data.end_date,
    halfDay: data.half_day,
    days: Number(data.days),
    reason: data.reason,
    status: data.status,
    appliedAt: data.created_at,
    appliedOnBehalfBy: data.applied_on_behalf_by,
    submittedByName,
  };
}

export async function getBehalfLateDetail(
  requestId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<BehalfLateDetail | null> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("late_requests")
    .select(
      "id, employee_id, request_date, actual_arrival_time, reason, status, created_at, applied_on_behalf_by, employees(full_name, employee_number, branch_id)",
    )
    .eq("organization_id", organizationId)
    .eq("id", requestId)
    .not("applied_on_behalf_by", "is", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const employee = data.employees as {
    full_name?: string;
    employee_number?: string;
    branch_id?: string | null;
  } | null;
  if (!employeeInBranchScope(employee?.branch_id, options)) {
    return null;
  }

  const submittedByName = await resolveSubmitterName(
    supabase,
    organizationId,
    data.applied_on_behalf_by,
  );

  return {
    type: "late",
    id: data.id,
    employeeId: data.employee_id,
    employeeName: employee?.full_name ?? "Employee",
    employeeNumber: employee?.employee_number ?? "",
    requestDate: data.request_date,
    actualArrivalTime: String(data.actual_arrival_time).slice(0, 5),
    reason: data.reason,
    status: data.status,
    appliedAt: data.created_at,
    appliedOnBehalfBy: data.applied_on_behalf_by,
    submittedByName,
  };
}

export async function getBehalfClaimDetail(
  requestId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<BehalfClaimDetail | null> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("claims")
    .select(
      "id, employee_id, amount, receipt_date, description, is_mileage, distance_km, rate_per_km, origin, destination, status, created_at, applied_on_behalf_by, receipt_file_id, claim_types(name), employees(full_name, employee_number, branch_id)",
    )
    .eq("organization_id", organizationId)
    .eq("id", requestId)
    .not("applied_on_behalf_by", "is", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const employee = data.employees as {
    full_name?: string;
    employee_number?: string;
    branch_id?: string | null;
  } | null;
  if (!employeeInBranchScope(employee?.branch_id, options)) {
    return null;
  }

  const claimType = data.claim_types as { name?: string } | null;
  const submittedByName = await resolveSubmitterName(
    supabase,
    organizationId,
    data.applied_on_behalf_by,
  );

  return {
    type: "claim",
    id: data.id,
    employeeId: data.employee_id,
    employeeName: employee?.full_name ?? "Employee",
    employeeNumber: employee?.employee_number ?? "",
    claimTypeName: claimType?.name ?? "Claim",
    amount: Number(data.amount),
    receiptDate: data.receipt_date,
    description: data.description,
    isMileage: Boolean(data.is_mileage),
    distanceKm: data.distance_km != null ? Number(data.distance_km) : null,
    ratePerKm: data.rate_per_km != null ? Number(data.rate_per_km) : null,
    origin: data.origin,
    destination: data.destination,
    receiptFileId: data.receipt_file_id,
    status: data.status,
    appliedAt: data.created_at,
    appliedOnBehalfBy: data.applied_on_behalf_by,
    submittedByName,
  };
}

export async function getBehalfOvertimeDetail(
  requestId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<BehalfOvertimeDetail | null> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("overtime_requests")
    .select(
      "id, employee_id, work_date, hours, rate_type, reason, status, created_at, applied_on_behalf_by, employees(full_name, employee_number, branch_id)",
    )
    .eq("organization_id", organizationId)
    .eq("id", requestId)
    .not("applied_on_behalf_by", "is", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const employee = data.employees as {
    full_name?: string;
    employee_number?: string;
    branch_id?: string | null;
  } | null;
  if (!employeeInBranchScope(employee?.branch_id, options)) {
    return null;
  }

  const submittedByName = await resolveSubmitterName(
    supabase,
    organizationId,
    data.applied_on_behalf_by,
  );

  return {
    type: "overtime",
    id: data.id,
    employeeId: data.employee_id,
    employeeName: employee?.full_name ?? "Employee",
    employeeNumber: employee?.employee_number ?? "",
    workDate: data.work_date,
    hours: Number(data.hours),
    rateType: data.rate_type,
    reason: data.reason,
    status: data.status,
    appliedAt: data.created_at,
    appliedOnBehalfBy: data.applied_on_behalf_by,
    submittedByName,
  };
}

export async function getBehalfReplacementDetail(
  requestId: string,
  options?: { branchId?: string; branchIds?: string[] },
): Promise<BehalfReplacementDetail | null> {
  await requireRole("hr_administrator", "branch_admin");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("replacement_credits")
    .select(
      "id, employee_id, work_date, credit_days, description, status, created_at, applied_on_behalf_by, employees(full_name, employee_number, branch_id)",
    )
    .eq("organization_id", organizationId)
    .eq("id", requestId)
    .not("applied_on_behalf_by", "is", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const employee = data.employees as {
    full_name?: string;
    employee_number?: string;
    branch_id?: string | null;
  } | null;
  if (!employeeInBranchScope(employee?.branch_id, options)) {
    return null;
  }

  const submittedByName = await resolveSubmitterName(
    supabase,
    organizationId,
    data.applied_on_behalf_by,
  );

  return {
    type: "replacement",
    id: data.id,
    employeeId: data.employee_id,
    employeeName: employee?.full_name ?? "Employee",
    employeeNumber: employee?.employee_number ?? "",
    workDate: data.work_date,
    creditDays: Number(data.credit_days),
    description: data.description,
    status: data.status,
    appliedAt: data.created_at,
    appliedOnBehalfBy: data.applied_on_behalf_by,
    submittedByName,
  };
}

