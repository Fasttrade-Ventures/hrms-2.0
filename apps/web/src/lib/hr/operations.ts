import { mapApprovalDetail, mapApprovalInboxRow } from "@/lib/approvals/inbox";
import type { ApprovalDetail, ApprovalInboxRow } from "@/lib/approvals/types";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

const approvalStepSelect = `
  id, status, comment,
  approval_requests!inner(
    id, request_type, status, submitted_at, created_at, payload,
    employees!approval_requests_requester_employee_id_fkey(
      employee_number, email,
      employee_profiles(full_name)
    )
  )
`;

export async function listOrgPendingApprovals(): Promise<ApprovalInboxRow[]> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("approval_steps")
    .select(approvalStepSelect)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => {
      const request = (row as Record<string, unknown>).approval_requests as Record<string, unknown>;
      return request.status === "pending";
    })
    .map((row) => mapApprovalInboxRow(row as Record<string, unknown>));
}

export async function getHrApprovalDetail(stepId: string): Promise<ApprovalDetail | null> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("approval_steps")
    .select(approvalStepSelect)
    .eq("id", stepId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapApprovalDetail(data as Record<string, unknown>);
}

export async function countOrgPendingApprovals(): Promise<number> {
  const rows = await listOrgPendingApprovals().catch(() => []);
  return rows.length;
}
