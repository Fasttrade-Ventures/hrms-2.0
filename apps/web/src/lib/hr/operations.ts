import { mapApprovalDetail, mapApprovalInboxRow } from "@/lib/approvals/inbox";
import type { ApprovalDetail, ApprovalInboxRow } from "@/lib/approvals/types";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";


const approvalStepSelect = `
  id, status, comment,
  approval_requests!inner(
    id, request_type, status, submitted_at, created_at, payload,
    employees!approval_requests_requester_employee_id_fkey(
      employee_number, email, full_name
    )
  )
`;

export async function listOrgApprovals(options?: {
  status?: "all" | "pending" | "approved" | "rejected" | "expired" | string;
  limit?: number;
}): Promise<ApprovalInboxRow[]> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  let query = supabase
    .from("approval_steps")
    .select(approvalStepSelect)
    .eq("organization_id", organizationId);

  if (options?.status && options.status !== "all") {
    if (options.status === "expired") {
      query = query.eq("status", "cancelled");
    } else {
      query = query.eq("status", options.status);
    }
  } else {
    query = query.in("status", ["pending", "approved", "rejected", "cancelled"]);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 200);

  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((row) => mapApprovalInboxRow(row as Record<string, unknown>));

  if (options?.status === "expired") {
    return rows.filter((r) => r.status === "expired");
  }

  return rows;
}

export async function listOrgPendingApprovals(): Promise<ApprovalInboxRow[]> {
  return listOrgApprovals({ status: "pending" });
}

export async function getHrApprovalDetail(stepId: string): Promise<ApprovalDetail | null> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
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
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("approval_steps")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return count ?? 0;
}
