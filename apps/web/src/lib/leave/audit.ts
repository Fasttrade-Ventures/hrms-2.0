import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log-event";
import { requireOrganizationId } from "@/lib/auth/organization-context";

export type LeaveBalanceAuditLogRow = {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  actionType:
    | "monthly_accrual"
    | "year_end_carry_forward"
    | "carry_forward_forfeited"
    | "carry_forward_expiry"
    | "manual_adjustment"
    | "request_deduction"
    | "request_reversal";
  previousBalance: number;
  deltaDays: number;
  newBalance: number;
  effectiveDate: string;
  reason: string | null;
  actorUserId: string | null;
  createdAt: string;
};

export type ListLeaveBalanceAuditLogsResult = {
  rows: LeaveBalanceAuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listLeaveBalanceAuditLogs(options?: {
  organizationId?: string;
  employeeId?: string;
  leaveTypeId?: string;
  actionType?: string;
  page?: number;
  pageSize?: number;
  client?: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;
}): Promise<ListLeaveBalanceAuditLogsResult> {
  const supabase = options?.client ?? (await createClient());
  const orgId = options?.organizationId ?? (await requireOrganizationId());
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, options?.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("leave_balance_audit_logs")
    .select(
      "id, organization_id, employee_id, leave_type_id, action_type, previous_balance, delta_days, new_balance, effective_date, reason, actor_user_id, created_at, employees(full_name, employee_number), leave_types(name)",
      { count: "exact" },
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (options?.employeeId) {
    query = query.eq("employee_id", options?.employeeId);
  }
  if (options?.leaveTypeId) {
    query = query.eq("leave_type_id", options?.leaveTypeId);
  }
  if (options?.actionType && options.actionType !== "all") {
    query = query.eq("action_type", options.actionType);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) throw new Error(error.message);

  type RawAuditLogRow = {
    id: string;
    organization_id: string;
    employee_id: string;
    leave_type_id: string;
    action_type: LeaveBalanceAuditLogRow["actionType"];
    previous_balance: number;
    delta_days: number;
    new_balance: number;
    effective_date: string;
    reason: string | null;
    actor_user_id: string | null;
    created_at: string;
    employees?: { full_name?: string; employee_number?: string | null } | null;
    leave_types?: { name?: string } | null;
  };

  const rows: LeaveBalanceAuditLogRow[] = ((data ?? []) as unknown as RawAuditLogRow[]).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    employeeId: row.employee_id,
    employeeName: row.employees?.full_name ?? "Unknown Employee",
    employeeNumber: row.employees?.employee_number ?? null,
    leaveTypeId: row.leave_type_id,
    leaveTypeName: row.leave_types?.name ?? "Leave",
    actionType: row.action_type,
    previousBalance: Number(row.previous_balance ?? 0),
    deltaDays: Number(row.delta_days ?? 0),
    newBalance: Number(row.new_balance ?? 0),
    effectiveDate: row.effective_date,
    reason: row.reason ?? null,
    actorUserId: row.actor_user_id ?? null,
    createdAt: row.created_at,
  }));

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

/**
 * Perform manual adjustment of an employee's leave balance with required reason and audit recording.
 */
export async function recordLeaveBalanceAdjustment(params: {
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  deltaDays: number;
  reason: string;
  actorUserId?: string | null;
  effectiveDate?: string;
  client?: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;
}): Promise<LeaveBalanceAuditLogRow> {
  const supabase = params.client ?? createAdminClient();
  const effectiveDate = params.effectiveDate ?? new Date().toISOString().slice(0, 10);

  if (!params.reason || params.reason.trim().length < 3) {
    throw new Error("A specific reason (minimum 3 characters) is required for manual leave balance adjustments.");
  }

  // Fetch leave type and employee
  const [ltRes, empRes] = await Promise.all([
    supabase
      .from("leave_types")
      .select("id, name, entitlement_days")
      .eq("id", params.leaveTypeId)
      .eq("organization_id", params.organizationId)
      .single(),
    supabase
      .from("employees")
      .select("id, annual_leave_entitlement, annual_leave_carry_forward")
      .eq("id", params.employeeId)
      .eq("organization_id", params.organizationId)
      .single(),
  ]);

  if (ltRes.error || !ltRes.data) throw new Error("Leave type not found.");
  if (empRes.error || !empRes.data) throw new Error("Employee not found.");

  const isAnnualLeave = ltRes.data.name.toLowerCase() === "annual leave";
  const currentEntitlement = isAnnualLeave
    ? Number(empRes.data.annual_leave_entitlement ?? 14)
    : Number(ltRes.data.entitlement_days ?? 0);

  const newBalance = Math.round((currentEntitlement + params.deltaDays) * 100) / 100;

  if (isAnnualLeave) {
    const { error: updateError } = await supabase
      .from("employees")
      .update({ annual_leave_entitlement: newBalance })
      .eq("id", params.employeeId);

    if (updateError) throw new Error(updateError.message);
  }

  const { data: logEntry, error: logError } = await supabase
    .from("leave_balance_audit_logs")
    .insert({
      organization_id: params.organizationId,
      employee_id: params.employeeId,
      leave_type_id: params.leaveTypeId,
      action_type: "manual_adjustment",
      previous_balance: currentEntitlement,
      delta_days: params.deltaDays,
      new_balance: newBalance,
      effective_date: effectiveDate,
      reason: params.reason.trim(),
      actor_user_id: params.actorUserId ?? null,
    })
    .select("id, created_at")
    .single();

  if (logError) throw new Error(logError.message);

  await logAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId ?? null,
    action: "leave.balance_adjusted",
    resourceType: "leave_type",
    resourceId: params.leaveTypeId,
    metadata: {
      employeeId: params.employeeId,
      deltaDays: params.deltaDays,
      previousBalance: currentEntitlement,
      newBalance,
      reason: params.reason.trim(),
    },
  });

  return {
    id: logEntry.id,
    organizationId: params.organizationId,
    employeeId: params.employeeId,
    employeeName: "",
    employeeNumber: null,
    leaveTypeId: params.leaveTypeId,
    leaveTypeName: ltRes.data.name,
    actionType: "manual_adjustment",
    previousBalance: currentEntitlement,
    deltaDays: params.deltaDays,
    newBalance,
    effectiveDate,
    reason: params.reason.trim(),
    actorUserId: params.actorUserId ?? null,
    createdAt: logEntry.created_at,
  };
}
