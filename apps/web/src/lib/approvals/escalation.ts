import { logAuditEvent } from "@/lib/audit/log-event";
import { queueNotification } from "@/lib/notifications/queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserIdForEmployee } from "./service";

export type EscalationResult = {
  escalatedCount: number;
  escalatedStepIds: string[];
};

/**
 * Sweeps pending approval steps that have passed their timeout deadline (due_date < now),
 * reassigns them to the designated escalation approver, logs an audit event, and notifies
 * the new approver.
 */
export async function escalateOverdueApprovalSteps(options?: {
  organizationId?: string;
  asOfDate?: string;
}): Promise<EscalationResult> {
  const admin = createAdminClient();
  const now = options?.asOfDate ? new Date(options.asOfDate).toISOString() : new Date().toISOString();

  let query = admin
    .from("approval_steps")
    .select(`
      id,
      organization_id,
      approval_request_id,
      step_order,
      step_label,
      approver_employee_id,
      timeout_days,
      due_date,
      escalation_action,
      escalation_employee_id,
      approval_requests (
        id,
        request_type,
        requester_employee_id,
        payload
      )
    `)
    .eq("status", "pending");

  if (options?.organizationId) {
    query = query.eq("organization_id", options.organizationId);
  }

  const { data: overdueSteps, error } = await query
    .not("due_date", "is", null)
    .lt("due_date", now);
  if (error) throw new Error(error.message);

  if (!overdueSteps || overdueSteps.length === 0) {
    return { escalatedCount: 0, escalatedStepIds: [] };
  }

  const escalatedStepIds: string[] = [];

  for (const step of overdueSteps) {
    let fallbackEmployeeId: string | null = null;
    const action = step.escalation_action ?? "escalate_to_manager_of_manager";

    if (action === "escalate_to_employee" && step.escalation_employee_id) {
      fallbackEmployeeId = step.escalation_employee_id;
    } else if (action === "escalate_to_manager_of_manager" && step.approver_employee_id) {
      const { data: manager } = await admin
        .from("employees")
        .select("manager_employee_id")
        .eq("organization_id", step.organization_id)
        .eq("id", step.approver_employee_id)
        .maybeSingle();

      fallbackEmployeeId = manager?.manager_employee_id ?? null;
    }

    // If manager-of-manager is unavailable or action is escalate_to_hr, fallback to an HR administrator
    if (!fallbackEmployeeId) {
      const { data: hrMembership } = await admin
        .from("organization_memberships")
        .select("employee_id")
        .eq("organization_id", step.organization_id)
        .contains("roles", ["hr_administrator"])
        .not("employee_id", "is", null)
        .limit(1)
        .maybeSingle();

      fallbackEmployeeId = hrMembership?.employee_id ?? null;
    }

    // If no new fallback approver could be resolved or if fallback is already the approver, skip reassignment
    if (!fallbackEmployeeId || fallbackEmployeeId === step.approver_employee_id) {
      continue;
    }

    const timeoutDays = step.timeout_days ?? 3;
    const newDueDate = new Date(Date.now() + timeoutDays * 86400000).toISOString();

    const { error: updateError } = await admin
      .from("approval_steps")
      .update({
        is_escalated: true,
        escalated_from_employee_id: step.approver_employee_id,
        approver_employee_id: fallbackEmployeeId,
        escalated_at: now,
        due_date: newDueDate,
        comment: "Escalated due to approval timeout.",
      })
      .eq("id", step.id);

    if (updateError) {
      console.error(`Failed to escalate approval step ${step.id}:`, updateError);
      continue;
    }

    escalatedStepIds.push(step.id);

    const requestRaw = step.approval_requests;
    const request = (Array.isArray(requestRaw) ? requestRaw[0] : requestRaw) as {
      id: string;
      request_type: string;
      requester_employee_id: string;
      payload: Record<string, unknown>;
    } | null;

    await logAuditEvent({
      organizationId: step.organization_id,
      actorUserId: null,
      action: "approval.escalated",
      resourceType: request?.request_type ?? "approval",
      resourceId: step.approval_request_id,
      metadata: {
        stepId: step.id,
        stepOrder: step.step_order,
        previousApproverEmployeeId: step.approver_employee_id,
        newApproverEmployeeId: fallbackEmployeeId,
        reason: "Approval timeout threshold reached.",
      },
    });

    const newApproverUserId = await resolveUserIdForEmployee(step.organization_id, fallbackEmployeeId, admin);
    if (newApproverUserId && request) {
      await queueNotification({
        organizationId: step.organization_id,
        recipientUserId: newApproverUserId,
        channel: "in_app",
        template: "approval.pending",
        payload: {
          requestId: request.id,
          requestType: request.request_type,
          requesterEmployeeId: request.requester_employee_id,
          stepId: step.id,
          isEscalated: true,
          href: `/manager/approvals/${step.id}`,
        },
        idempotencyKey: `approval-escalated-${step.id}-${now}`,
      });
    }
  }

  return {
    escalatedCount: escalatedStepIds.length,
    escalatedStepIds,
  };
}
