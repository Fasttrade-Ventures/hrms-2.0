import { logAuditEvent } from "@/lib/audit/log-event";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * When an employee's manager changes, move pending approval steps that were
 * assigned to the old manager for this report onto the new manager.
 */
export async function reassignPendingApprovalsForManagerChange(params: {
  organizationId: string;
  reportEmployeeId: string;
  oldManagerEmployeeId: string;
  newManagerEmployeeId: string;
  actorUserId: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: requests, error: requestsError } = await admin
    .from("approval_requests")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("requester_employee_id", params.reportEmployeeId)
    .eq("status", "pending");

  if (requestsError) throw new Error(requestsError.message);
  const requestIds = (requests ?? []).map((row) => row.id);
  if (requestIds.length === 0) return;

  const { data: steps, error: stepsError } = await admin
    .from("approval_steps")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("status", "pending")
    .eq("approver_employee_id", params.oldManagerEmployeeId)
    .in("approval_request_id", requestIds);

  if (stepsError) throw new Error(stepsError.message);
  const stepIds = (steps ?? []).map((row) => row.id);
  if (stepIds.length === 0) return;

  const { error: updateError } = await admin
    .from("approval_steps")
    .update({ approver_employee_id: params.newManagerEmployeeId })
    .in("id", stepIds);

  if (updateError) throw new Error(updateError.message);

  await logAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "approvals.reassigned_manager_change",
    resourceType: "employee",
    resourceId: params.reportEmployeeId,
    metadata: {
      oldManagerEmployeeId: params.oldManagerEmployeeId,
      newManagerEmployeeId: params.newManagerEmployeeId,
      stepIds,
    },
  });
}
