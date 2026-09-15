import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getReplacementCreditBalance,
  isReplacementLeaveType,
} from "@/lib/leave/replacement-credit";

export type LeaveBalanceSnapshot = {
  leaveTypeId: string;
  leaveTypeName: string;
  isUnpaid: boolean;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
};

export type BalanceClient = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

/**
 * Compute remaining entitlement for one leave type for an employee.
 * Counts approved + pending requests against entitlement (annual leave uses employee fields).
 */
export async function getLeaveBalanceForType(
  organizationId: string,
  employeeId: string,
  leaveTypeId: string,
  client?: BalanceClient,
  options?: { excludeRequestId?: string },
): Promise<LeaveBalanceSnapshot> {
  const supabase = client ?? (await createClient());

  let requestsQuery = supabase
    .from("leave_requests")
    .select("id, days, status")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("leave_type_id", leaveTypeId)
    .in("status", ["pending", "approved"]);

  if (options?.excludeRequestId) {
    requestsQuery = requestsQuery.neq("id", options.excludeRequestId);
  }

  const [typeResult, employeeResult, requestsResult] = await Promise.all([
    supabase
      .from("leave_types")
      .select("id, name, entitlement_days, is_unpaid")
      .eq("organization_id", organizationId)
      .eq("id", leaveTypeId)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("annual_leave_entitlement, annual_leave_carry_forward")
      .eq("organization_id", organizationId)
      .eq("id", employeeId)
      .maybeSingle(),
    requestsQuery,
  ]);

  if (typeResult.error) throw new Error(typeResult.error.message);
  if (!typeResult.data) throw new Error("Leave type not found.");
  if (requestsResult.error) throw new Error(requestsResult.error.message);

  const type = typeResult.data;

  if (isReplacementLeaveType(type.name)) {
    const repBal = await getReplacementCreditBalance(
      organizationId,
      employeeId,
      supabase,
      { excludeLeaveRequestId: options?.excludeRequestId },
    );
    return {
      leaveTypeId: type.id,
      leaveTypeName: type.name,
      isUnpaid: Boolean(type.is_unpaid),
      entitlementDays: repBal.totalApprovedCredits,
      usedDays: repBal.usedDays,
      pendingDays: repBal.pendingDays,
      remainingDays: repBal.remainingDays,
    };
  }

  const matching = requestsResult.data ?? [];
  const usedDays = matching
    .filter((row) => row.status === "approved")
    .reduce((sum, row) => sum + Number(row.days), 0);
  const pendingDays = matching
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + Number(row.days), 0);

  let entitlementDays = Number(type.entitlement_days);
  if (type.name.toLowerCase() === "annual leave" && employeeResult.data) {
    entitlementDays =
      Number(employeeResult.data.annual_leave_entitlement ?? 14) +
      Number(employeeResult.data.annual_leave_carry_forward ?? 0);
  }

  return {
    leaveTypeId: type.id,
    leaveTypeName: type.name,
    isUnpaid: Boolean(type.is_unpaid),
    entitlementDays,
    usedDays,
    pendingDays,
    remainingDays: Math.max(0, entitlementDays - usedDays - pendingDays),
  };
}

/**
 * Reject when requested days exceed remaining balance (paid leave only).
 * When `allowOverride` is true and an override reason is provided, over-balance is allowed.
 */
export async function assertLeaveBalance(params: {
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  days: number;
  allowOverride?: boolean;
  overrideReason?: string | null;
  client?: BalanceClient;
  excludeRequestId?: string;
}): Promise<LeaveBalanceSnapshot> {
  const balance = await getLeaveBalanceForType(
    params.organizationId,
    params.employeeId,
    params.leaveTypeId,
    params.client,
    { excludeRequestId: params.excludeRequestId },
  );

  if (balance.isUnpaid) {
    return balance;
  }

  if (params.days <= balance.remainingDays) {
    return balance;
  }

  const reason = params.overrideReason?.trim() ?? "";
  if (params.allowOverride && reason.length >= 3) {
    return balance;
  }

  if (params.allowOverride) {
    throw new Error(
      `Insufficient leave balance (remaining ${balance.remainingDays} day(s)). Provide an override reason (min 3 characters) to proceed.`,
    );
  }

  throw new Error(
    `Insufficient leave balance. Remaining: ${balance.remainingDays} day(s).`,
  );
}
