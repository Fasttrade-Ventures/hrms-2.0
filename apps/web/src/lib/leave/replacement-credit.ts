import { logAuditEvent } from "@/lib/audit/log-event";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type BalanceClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

export interface ReplacementCreditBalance {
  totalApprovedCredits: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export interface LinkedReplacementCredit {
  id: string;
  replacementCreditId: string;
  workDate: string;
  creditDays: number;
  consumedDays: number;
  description: string | null;
}

/**
 * Returns true if the leave type name signifies replacement leave.
 */
export function isReplacementLeaveType(name: string | null | undefined): boolean {
  return Boolean(name && name.toLowerCase().includes("replacement"));
}

/**
 * Compute real-time replacement credit balance for an employee based on the
 * replacement_credits and replacement_credit_usages ledgers.
 */
export async function getReplacementCreditBalance(
  organizationId: string,
  employeeId: string,
  client?: BalanceClient,
  options?: { excludeLeaveRequestId?: string },
): Promise<ReplacementCreditBalance> {
  const supabase = client ?? (await createClient());

  // 1. Fetch approved replacement credits
  const { data: credits, error: creditsError } = await supabase
    .from("replacement_credits")
    .select("id, credit_days")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("status", "approved");

  if (creditsError) throw new Error(creditsError.message);

  const totalApprovedCredits = (credits ?? []).reduce(
    (sum, c) => sum + Number(c.credit_days),
    0,
  );

  // 2. Fetch usages linked to active (pending or approved) leave requests
  let usagesQuery = supabase
    .from("replacement_credit_usages")
    .select(`
      id,
      days,
      leave_request_id,
      leave_requests!inner(id, status)
    `)
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId);

  if (options?.excludeLeaveRequestId) {
    usagesQuery = usagesQuery.neq("leave_request_id", options.excludeLeaveRequestId);
  }

  const { data: usages, error: usagesError } = await usagesQuery;
  if (usagesError) throw new Error(usagesError.message);

  let usedDays = 0;
  let pendingDays = 0;

  for (const usage of usages ?? []) {
    const leaveReq = Array.isArray(usage.leave_requests)
      ? usage.leave_requests[0]
      : usage.leave_requests;

    if (leaveReq?.status === "approved") {
      usedDays += Number(usage.days);
    } else if (leaveReq?.status === "pending") {
      pendingDays += Number(usage.days);
    }
  }

  const remainingDays = Math.max(
    0,
    Number((totalApprovedCredits - usedDays - pendingDays).toFixed(2)),
  );

  return {
    totalApprovedCredits,
    usedDays: Number(usedDays.toFixed(2)),
    pendingDays: Number(pendingDays.toFixed(2)),
    remainingDays,
  };
}

/**
 * Consume approved replacement credits for a leave request in FIFO order (by work_date ASC).
 */
export async function consumeReplacementCredits(params: {
  organizationId: string;
  employeeId: string;
  leaveRequestId: string;
  days: number;
  actorUserId?: string | null;
  client?: BalanceClient;
}): Promise<void> {
  const { organizationId, employeeId, leaveRequestId, days } = params;
  if (days <= 0) return;

  const supabase = params.client ?? (await createClient());

  // Fetch approved replacement credits ordered FIFO
  const { data: credits, error: creditsError } = await supabase
    .from("replacement_credits")
    .select("id, work_date, credit_days, created_at")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .order("work_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (creditsError) throw new Error(creditsError.message);
  if (!credits || credits.length === 0) {
    throw new Error("No approved replacement credits available to consume.");
  }

  // Fetch existing usages on these credits from active leave requests (excluding current request)
  const creditIds = credits.map((c) => c.id);
  const { data: existingUsages, error: usagesError } = await supabase
    .from("replacement_credit_usages")
    .select(`
      replacement_credit_id,
      days,
      leave_requests!inner(status)
    `)
    .eq("organization_id", organizationId)
    .in("replacement_credit_id", creditIds)
    .neq("leave_request_id", leaveRequestId);

  if (usagesError) throw new Error(usagesError.message);

  // Map consumed days per replacement credit
  const consumedPerCredit = new Map<string, number>();
  for (const usage of existingUsages ?? []) {
    const leaveReq = Array.isArray(usage.leave_requests)
      ? usage.leave_requests[0]
      : usage.leave_requests;

    if (leaveReq?.status === "approved" || leaveReq?.status === "pending") {
      const current = consumedPerCredit.get(usage.replacement_credit_id) ?? 0;
      consumedPerCredit.set(
        usage.replacement_credit_id,
        current + Number(usage.days),
      );
    }
  }

  // Calculate available days per credit
  const eligibleCredits = credits
    .map((credit) => {
      const totalDays = Number(credit.credit_days);
      const consumed = consumedPerCredit.get(credit.id) ?? 0;
      const available = Math.max(0, Number((totalDays - consumed).toFixed(2)));
      return {
        ...credit,
        available,
      };
    })
    .filter((c) => c.available > 0);

  const totalAvailable = eligibleCredits.reduce((sum, c) => sum + c.available, 0);
  if (days > totalAvailable) {
    throw new Error(
      `Insufficient replacement credit balance. Requested: ${days} day(s), available: ${totalAvailable} day(s).`,
    );
  }

  // Allocate FIFO
  let remainingToAllocate = days;
  const usagesToInsert: Array<{
    organization_id: string;
    employee_id: string;
    replacement_credit_id: string;
    leave_request_id: string;
    days: number;
  }> = [];

  for (const credit of eligibleCredits) {
    if (remainingToAllocate <= 0) break;
    const consumeAmount = Math.min(remainingToAllocate, credit.available);
    usagesToInsert.push({
      organization_id: organizationId,
      employee_id: employeeId,
      replacement_credit_id: credit.id,
      leave_request_id: leaveRequestId,
      days: Number(consumeAmount.toFixed(2)),
    });
    remainingToAllocate = Number((remainingToAllocate - consumeAmount).toFixed(2));
  }

  if (usagesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("replacement_credit_usages")
      .insert(usagesToInsert);

    if (insertError) throw new Error(insertError.message);

    if (params.actorUserId) {
      await logAuditEvent({
        organizationId,
        actorUserId: params.actorUserId,
        action: "replacement_credit.consumed",
        resourceType: "leave",
        resourceId: leaveRequestId,
        metadata: {
          requestedDays: days,
          usages: usagesToInsert,
        },
      });
    }
  }
}

/**
 * Restore (unlink) replacement credits consumed by a leave request when it is
 * cancelled, revoked, or rejected.
 */
export async function restoreReplacementCredits(params: {
  organizationId: string;
  leaveRequestId: string;
  actorUserId?: string | null;
  client?: BalanceClient;
}): Promise<{ restoredDays: number }> {
  const { organizationId, leaveRequestId } = params;
  const supabase = params.client ?? (await createClient());

  const { data: usages, error: fetchError } = await supabase
    .from("replacement_credit_usages")
    .select("id, days, replacement_credit_id")
    .eq("organization_id", organizationId)
    .eq("leave_request_id", leaveRequestId);

  if (fetchError) throw new Error(fetchError.message);
  if (!usages || usages.length === 0) {
    return { restoredDays: 0 };
  }

  const restoredDays = usages.reduce((sum, u) => sum + Number(u.days), 0);

  const { error: deleteError } = await supabase
    .from("replacement_credit_usages")
    .delete()
    .eq("organization_id", organizationId)
    .eq("leave_request_id", leaveRequestId);

  if (deleteError) throw new Error(deleteError.message);

  if (params.actorUserId) {
    await logAuditEvent({
      organizationId,
      actorUserId: params.actorUserId,
      action: "replacement_credit.restored",
      resourceType: "leave",
      resourceId: leaveRequestId,
      metadata: {
        restoredDays: Number(restoredDays.toFixed(2)),
        usageIds: usages.map((u) => u.id),
      },
    });
  }

  return { restoredDays: Number(restoredDays.toFixed(2)) };
}

/**
 * Get details of replacement credits linked to a leave request.
 */
export async function getLinkedReplacementCredits(
  organizationId: string,
  leaveRequestId: string,
  client?: BalanceClient,
): Promise<LinkedReplacementCredit[]> {
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase
    .from("replacement_credit_usages")
    .select(`
      id,
      days,
      replacement_credit_id,
      replacement_credits(id, work_date, credit_days, description)
    `)
    .eq("organization_id", organizationId)
    .eq("leave_request_id", leaveRequestId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const credit = Array.isArray(row.replacement_credits)
      ? row.replacement_credits[0]
      : row.replacement_credits;

    return {
      id: row.id,
      replacementCreditId: row.replacement_credit_id,
      workDate: credit?.work_date ?? "",
      creditDays: Number(credit?.credit_days ?? 0),
      consumedDays: Number(row.days),
      description: credit?.description ?? null,
    };
  });
}
