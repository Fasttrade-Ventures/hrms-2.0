import { mapApprovalDetail, mapApprovalInboxRow } from "@/lib/approvals/inbox";
import { escalateOverdueApprovalSteps } from "@/lib/approvals/escalation";
import type { ApprovalDetail, ApprovalInboxRow } from "@/lib/approvals/types";
import { expireOverduePendingLeaves } from "@/lib/leave/expiry";
import { requireManagerContext } from "@/lib/manager/context";
import { loadOrganizationCurrency } from "@/lib/organization-display";
import { createClient } from "@/lib/supabase/server";

const STEP_SELECT = `id, step_order, step_label, status, comment, timeout_days, due_date, is_escalated, escalated_at, escalated_from_employee_id, approver_employee_id, created_at, approval_requests!inner(
  id, request_type, status, submitted_at, created_at, payload, requester_employee_id,
  employees!approval_requests_requester_employee_id_fkey(
    employee_number, email, full_name
  )
)`;

const HISTORY_STATUSES = ["approved", "rejected", "cancelled", "revoked"] as const;

async function listDirectReportIds(
  organizationId: string,
  managerEmployeeId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("manager_employee_id", managerEmployeeId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

function historyOrFilteredStatus(status: string | undefined): string[] {
  if (status === "expired") return ["cancelled"];
  if (status && status !== "all" && status !== "pending") return [status];
  return [...HISTORY_STATUSES];
}

function mergeApprovalRows(
  batches: Array<Record<string, unknown>[]>,
  currency: Awaited<ReturnType<typeof loadOrganizationCurrency>>,
  options?: { status?: string },
): ApprovalInboxRow[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const batch of batches) {
    for (const row of batch) {
      byId.set(String(row.id), row);
    }
  }

  let rows = [...byId.values()]
    .sort((a, b) => {
      const aAt = String(a.created_at ?? "");
      const bAt = String(b.created_at ?? "");
      return bAt.localeCompare(aAt);
    })
    .map((row) => mapApprovalInboxRow(row, currency));

  if (options?.status === "expired") {
    rows = rows.filter((r) => r.status === "expired");
  }

  return rows;
}

export async function listManagerApprovals(options?: {
  status?: "all" | "pending" | "approved" | "rejected" | "expired" | string;
  limit?: number;
}): Promise<ApprovalInboxRow[]> {
  const { employeeId, organizationId } = await requireManagerContext();
  await Promise.all([
    expireOverduePendingLeaves({ organizationId }).catch(console.error),
    escalateOverdueApprovalSteps({ organizationId }).catch(console.error),
  ]);
  const supabase = await createClient();
  const limit = options?.limit ?? 200;
  const status = options?.status;
  const reportIds = await listDirectReportIds(organizationId, employeeId);

  // Pending: only steps currently assigned to this manager (actionable).
  if (status === "pending") {
    const query = supabase
      .from("approval_steps")
      .select(STEP_SELECT)
      .eq("organization_id", organizationId)
      .eq("approver_employee_id", employeeId)
      .eq("status", "pending");

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    const currency = await loadOrganizationCurrency(supabase, organizationId);
    return (data ?? []).map((row) => mapApprovalInboxRow(row as Record<string, unknown>, currency));
  }

  const historyStatuses = historyOrFilteredStatus(status);
  const mineStatuses =
    status && status !== "all"
      ? status === "expired"
        ? ["cancelled"]
        : [status]
      : ["pending", "approved", "rejected", "cancelled", "revoked"];

  // Assigned to me (any status in filter).
  const mineQuery = supabase
    .from("approval_steps")
    .select(STEP_SELECT)
    .eq("organization_id", organizationId)
    .eq("approver_employee_id", employeeId)
    .in("status", mineStatuses);

  // Escalated away from me — history only (not pending on someone else).
  const escalatedQuery = supabase
    .from("approval_steps")
    .select(STEP_SELECT)
    .eq("organization_id", organizationId)
    .eq("escalated_from_employee_id", employeeId)
    .in("status", historyStatuses);

  const batches: Array<Record<string, unknown>[]> = [];

  const [{ data: mine, error: mineError }, { data: escalated, error: escalatedError }] =
    await Promise.all([
      mineQuery.order("created_at", { ascending: false }).limit(limit),
      escalatedQuery.order("created_at", { ascending: false }).limit(limit),
    ]);

  if (mineError) throw new Error(mineError.message);
  if (escalatedError) throw new Error(escalatedError.message);
  batches.push((mine ?? []) as Record<string, unknown>[]);
  batches.push((escalated ?? []) as Record<string, unknown>[]);

  // Team requests (direct reports) — history only so Pending tab stays actionable-only.
  if (reportIds.length) {
    const { data: teamRequests, error: teamReqError } = await supabase
      .from("approval_requests")
      .select("id")
      .eq("organization_id", organizationId)
      .in("requester_employee_id", reportIds)
      .limit(500);
    if (teamReqError) throw new Error(teamReqError.message);

    const requestIds = (teamRequests ?? []).map((row) => row.id);
    if (requestIds.length) {
      const { data: team, error: teamError } = await supabase
        .from("approval_steps")
        .select(STEP_SELECT)
        .eq("organization_id", organizationId)
        .in("approval_request_id", requestIds)
        .in("status", historyStatuses)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (teamError) throw new Error(teamError.message);
      batches.push((team ?? []) as Record<string, unknown>[]);
    }
  }

  const currency = await loadOrganizationCurrency(supabase, organizationId);
  return mergeApprovalRows(batches, currency, options).slice(0, limit);
}

export async function getManagerApprovalDetail(stepId: string): Promise<ApprovalDetail | null> {
  const { employeeId, organizationId } = await requireManagerContext();
  await Promise.all([
    expireOverduePendingLeaves({ organizationId }).catch(console.error),
    escalateOverdueApprovalSteps({ organizationId }).catch(console.error),
  ]);
  const supabase = await createClient();
  const reportIds = await listDirectReportIds(organizationId, employeeId);

  const { data, error } = await supabase
    .from("approval_steps")
    .select(STEP_SELECT)
    .eq("id", stepId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const request = row.approval_requests as Record<string, unknown> | null;
  const requesterId = request ? String(request.requester_employee_id ?? "") : "";
  const approverId = String(row.approver_employee_id ?? "");
  const escalatedFrom = row.escalated_from_employee_id
    ? String(row.escalated_from_employee_id)
    : null;

  const canView =
    approverId === employeeId ||
    escalatedFrom === employeeId ||
    (requesterId !== "" && reportIds.includes(requesterId));

  if (!canView) return null;

  const detail = mapApprovalDetail(
    row,
    await loadOrganizationCurrency(supabase, organizationId),
  );
  return {
    ...detail,
    canDecide: detail.status === "pending" && approverId === employeeId,
  };
}

export async function countPendingApprovals(): Promise<number> {
  const { employeeId, organizationId } = await requireManagerContext();
  await Promise.all([
    expireOverduePendingLeaves({ organizationId }).catch(console.error),
    escalateOverdueApprovalSteps({ organizationId }).catch(console.error),
  ]);
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("approval_steps")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("approver_employee_id", employeeId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return count ?? 0;
}
