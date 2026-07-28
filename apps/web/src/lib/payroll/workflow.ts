import { requireRoleOrPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

async function transitionPayrun(
  payrunId: string,
  actorUserId: string,
  fromStatuses: string[],
  toStatus: string,
): Promise<void> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: payrun, error } = await supabase
    .from("payroll_payruns")
    .select("status, period_year, period_month")
    .eq("id", payrunId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payrun) throw new Error("Payrun not found.");
  if (!fromStatuses.includes(payrun.status)) {
    throw new Error(`Payrun cannot move from ${payrun.status} to ${toStatus}.`);
  }

  const patch: Record<string, string | null> = { status: toStatus };
  if (toStatus === "in_review") {
    patch.submitted_at = new Date().toISOString();
    patch.submitted_by = actorUserId;
  }
  if (toStatus === "approved") {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = actorUserId;
  }

  const { error: updateError } = await supabase
    .from("payroll_payruns")
    .update(patch)
    .eq("id", payrunId);

  if (updateError) throw new Error(updateError.message);

  await supabase.from("payroll_payrun_status_log").insert({
    payrun_id: payrunId,
    organization_id: organizationId,
    from_status: payrun.status,
    to_status: toStatus,
    actor_user_id: actorUserId,
  });

  const { logAuditEvent } = await import("@/lib/audit/log-event");
  await logAuditEvent({
    organizationId,
    actorUserId,
    action: `payroll.payrun_${toStatus === "in_review" ? "submitted" : toStatus}`,
    resourceType: "payroll_payrun",
    resourceId: payrunId,
    metadata: {
      fromStatus: payrun.status,
      toStatus,
      periodYear: payrun.period_year,
      periodMonth: payrun.period_month,
    },
  });
}

export async function submitPayrunForReview(payrunId: string, actorUserId: string): Promise<void> {
  await requireRoleOrPermission(["hr_administrator"], ["payroll_processor"]);
  await transitionPayrun(payrunId, actorUserId, ["draft"], "in_review");
}

export async function approvePayrun(payrunId: string, actorUserId: string): Promise<void> {
  await requireRoleOrPermission(["hr_administrator", "director"], ["payroll_approver"]);
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("payroll_duty_segregation")
    .eq("id", organizationId)
    .maybeSingle();

  const { data: payrunMeta } = await supabase
    .from("payroll_payruns")
    .select("last_edited_by")
    .eq("id", payrunId)
    .maybeSingle();

  if (org?.payroll_duty_segregation && payrunMeta?.last_edited_by === actorUserId) {
    throw new Error("Duty segregation: another user must approve this payrun.");
  }

  const { count } = await supabase
    .from("payroll_payrun_items")
    .select("id", { count: "exact", head: true })
    .eq("payrun_id", payrunId)
    .eq("requires_resolution", true);

  if ((count ?? 0) > 0) {
    throw new Error("Resolve all flagged pay lines before approving.");
  }

  await transitionPayrun(payrunId, actorUserId, ["in_review"], "approved");
}

export async function deletePayrun(payrunId: string, actorUserId: string): Promise<void> {
  await requireRoleOrPermission(["hr_administrator"], ["payroll_processor"]);
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: payrun, error } = await supabase
    .from("payroll_payruns")
    .select("id, status, period_year, period_month")
    .eq("id", payrunId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payrun) throw new Error("Payrun not found.");
  if (payrun.status === "locked") {
    throw new Error("Locked payruns cannot be deleted.");
  }

  const { error: deleteError } = await supabase.from("payroll_payruns").delete().eq("id", payrunId);

  if (deleteError) throw new Error(deleteError.message);

  const { logAuditEvent } = await import("@/lib/audit/log-event");
  await logAuditEvent({
    organizationId,
    actorUserId,
    action: "payroll.payrun_deleted",
    resourceType: "payroll_payrun",
    resourceId: payrunId,
    metadata: {
      periodYear: payrun.period_year,
      periodMonth: payrun.period_month,
      status: payrun.status,
    },
  });
}
