import { REQUEST_TYPE_LABELS, type ApprovalDetail, type ApprovalInboxRow, type ApprovalRequestType } from "@/lib/approvals/types";
import { requireManagerContext } from "@/lib/manager/context";
import { createClient } from "@/lib/supabase/server";

function summarizePayload(requestType: ApprovalRequestType, payload: Record<string, unknown>): string {
  switch (requestType) {
    case "leave":
      return `${payload.leaveTypeName ?? "Leave"} · ${payload.startDate ?? ""} → ${payload.endDate ?? ""}`;
    case "claim":
      return `${payload.claimTypeName ?? "Claim"} · RM ${payload.amount ?? "0"}`;
    case "overtime":
      return `${payload.workDate ?? ""} · ${payload.hours ?? "0"}h @ ${payload.rateType ?? "1.5"}x`;
    case "replacement_credit":
      return `${payload.workDate ?? ""} · ${payload.creditDays ?? "1"} day(s)`;
    case "late":
      return `${payload.requestDate ?? ""} · arrived ${payload.actualArrivalTime ?? ""}`;
    case "attendance":
      return `${payload.requestDate ?? ""} · manual attendance`;
    default:
      return "Pending request";
  }
}

function mapInboxRow(row: Record<string, unknown>): ApprovalInboxRow {
  const request = row.approval_requests as Record<string, unknown>;
  const requester = request.employees as Record<string, unknown> | null;
  const profile = requester?.employee_profiles as Record<string, unknown> | null;
  const requestType = request.request_type as ApprovalRequestType;
  const payload = (request.payload ?? {}) as Record<string, unknown>;

  return {
    stepId: String(row.id),
    requestId: String(request.id),
    requestType,
    requestTypeLabel: REQUEST_TYPE_LABELS[requestType] ?? requestType,
    requesterName: String(profile?.full_name ?? requester?.email ?? "Employee"),
    requesterEmployeeNumber: String(requester?.employee_number ?? "—"),
    submittedAt: String(request.submitted_at ?? request.created_at ?? ""),
    summary: summarizePayload(requestType, payload),
    status: String(row.status),
  };
}

export async function listManagerApprovals(): Promise<ApprovalInboxRow[]> {
  const { employeeId, organizationId } = await requireManagerContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("approval_steps")
    .select(
      `id, status, approval_requests!inner(
        id, request_type, status, submitted_at, created_at, payload,
        employees!approval_requests_requester_employee_id_fkey(
          employee_number, email,
          employee_profiles(full_name)
        )
      )`,
    )
    .eq("organization_id", organizationId)
    .eq("approver_employee_id", employeeId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapInboxRow(row as Record<string, unknown>));
}

export async function getManagerApprovalDetail(stepId: string): Promise<ApprovalDetail | null> {
  const { employeeId, organizationId } = await requireManagerContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("approval_steps")
    .select(
      `id, status, comment, approval_requests!inner(
        id, request_type, status, submitted_at, created_at, payload,
        employees!approval_requests_requester_employee_id_fkey(
          employee_number, email,
          employee_profiles(full_name)
        )
      )`,
    )
    .eq("id", stepId)
    .eq("organization_id", organizationId)
    .eq("approver_employee_id", employeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const base = mapInboxRow(data as Record<string, unknown>);
  const request = (data as Record<string, unknown>).approval_requests as Record<string, unknown>;

  return {
    ...base,
    payload: (request.payload ?? {}) as Record<string, unknown>,
    comment: (data as { comment?: string | null }).comment ?? null,
  };
}

export async function countPendingApprovals(): Promise<number> {
  const rows = await listManagerApprovals().catch(() => []);
  return rows.length;
}
