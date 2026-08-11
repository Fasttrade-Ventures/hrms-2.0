import { mapApprovalDetail, mapApprovalInboxRow } from "@/lib/approvals/inbox";
import type { ApprovalDetail, ApprovalInboxRow } from "@/lib/approvals/types";
import { requireManagerContext } from "@/lib/manager/context";
import { createClient } from "@/lib/supabase/server";

export async function listManagerApprovals(): Promise<ApprovalInboxRow[]> {
  const { employeeId, organizationId } = await requireManagerContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("approval_steps")
    .select(
      `id, status, approval_requests!inner(
        id, request_type, status, submitted_at, created_at, payload,
        employees!approval_requests_requester_employee_id_fkey(
          employee_number, email, full_name
        )
      )`,
    )
    .eq("organization_id", organizationId)
    .eq("approver_employee_id", employeeId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapApprovalInboxRow(row as Record<string, unknown>));
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
          employee_number, email, full_name
        )
      )`,
    )
    .eq("id", stepId)
    .eq("organization_id", organizationId)
    .eq("approver_employee_id", employeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapApprovalDetail(data as Record<string, unknown>);
}

export async function countPendingApprovals(): Promise<number> {
  const rows = await listManagerApprovals().catch(() => []);
  return rows.length;
}
