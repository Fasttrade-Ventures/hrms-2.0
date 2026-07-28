import { transition, type ApprovalEvent } from "@hrms/domain";

import { logAuditEvent } from "@/lib/audit/log-event";
import { employeeRequestDetailHref } from "@/lib/notifications/links";
import { queueNotification } from "@/lib/notifications/queue";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import type { ApprovalRequestType, ApprovalSourceTable } from "./types";

type SubmitApprovalInput = {
  organizationId: string;
  requesterEmployeeId: string;
  requestType: ApprovalRequestType;
  sourceTable: ApprovalSourceTable;
  sourceId: string;
  payload: Record<string, unknown>;
  actorUserId: string;
};

type ActOnApprovalInput = {
  stepId: string;
  actorEmployeeId: string | null;
  actorUserId: string;
  organizationId: string;
  event: Extract<ApprovalEvent, "approve" | "reject">;
  comment?: string;
  hrOverride?: boolean;
};

async function resolveApproverEmployeeId(
  organizationId: string,
  requesterEmployeeId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("manager_employee_id")
    .eq("organization_id", organizationId)
    .eq("id", requesterEmployeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.manager_employee_id ?? null;
}

async function resolveUserIdForEmployee(
  organizationId: string,
  employeeId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) return null;
  return data?.user_id ?? null;
}

export async function submitForApproval(input: SubmitApprovalInput): Promise<string> {
  const supabase = await createClient();
  const approverEmployeeId = await resolveApproverEmployeeId(
    input.organizationId,
    input.requesterEmployeeId,
  );

  const { data: request, error: requestError } = await supabase
    .from("approval_requests")
    .insert({
      organization_id: input.organizationId,
      request_type: input.requestType,
      requester_employee_id: input.requesterEmployeeId,
      status: "pending",
      payload: {
        ...input.payload,
        sourceTable: input.sourceTable,
        sourceId: input.sourceId,
      },
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message ?? "Failed to create approval request.");
  }

  const { data: step, error: stepError } = await supabase
    .from("approval_steps")
    .insert({
      approval_request_id: request.id,
      organization_id: input.organizationId,
      step_order: 1,
      approver_employee_id: approverEmployeeId,
      status: "pending",
    })
    .select("id")
    .single();

  if (stepError) throw new Error(stepError.message);

  const { error: linkError } = await supabase
    .from(input.sourceTable)
    .update({ approval_request_id: request.id, status: "pending" })
    .eq("id", input.sourceId)
    .eq("organization_id", input.organizationId);

  if (linkError) throw new Error(linkError.message);

  if (approverEmployeeId && step) {
    const managerUserId = await resolveUserIdForEmployee(input.organizationId, approverEmployeeId);
    await queueNotification({
      organizationId: input.organizationId,
      recipientUserId: managerUserId,
      channel: "in_app",
      template: "approval.pending",
      payload: {
        requestId: request.id,
        requestType: input.requestType,
        requesterEmployeeId: input.requesterEmployeeId,
        sourceId: input.sourceId,
        stepId: step.id,
        href: `/manager/approvals/${step.id}`,
      },
      idempotencyKey: `approval-pending-${request.id}`,
    });
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "approval.submitted",
    resourceType: input.requestType,
    resourceId: request.id,
    metadata: { sourceTable: input.sourceTable, sourceId: input.sourceId },
  });

  return request.id;
}

export async function actOnApproval(input: ActOnApprovalInput): Promise<void> {
  const supabase = await createClient();

  const { data: step, error: stepError } = await supabase
    .from("approval_steps")
    .select(
      "id, status, approver_employee_id, approval_request_id, approval_requests(id, status, request_type, requester_employee_id, payload)",
    )
    .eq("id", input.stepId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (stepError) throw new Error(stepError.message);
  if (!step) throw new Error("Approval step not found.");
  if (!input.hrOverride) {
    if (!input.actorEmployeeId) {
      throw new Error("Employee context is required to action this request.");
    }
    if (step.approver_employee_id !== input.actorEmployeeId) {
      throw new Error("You are not the approver for this request.");
    }
  }
  if (step.status !== "pending") {
    throw new Error("This approval step has already been actioned.");
  }

  const requestRaw = step.approval_requests;
  const request = (Array.isArray(requestRaw) ? requestRaw[0] : requestRaw) as {
    id: string;
    status: string;
    request_type: ApprovalRequestType;
    requester_employee_id: string;
    payload: Record<string, unknown>;
  };

  const nextStatus = transition(request.status as "pending", input.event);
  const now = new Date().toISOString();

  const { error: updateStepError } = await supabase
    .from("approval_steps")
    .update({
      status: nextStatus,
      acted_at: now,
      comment: input.comment ?? null,
    })
    .eq("id", input.stepId);

  if (updateStepError) throw new Error(updateStepError.message);

  const { error: updateRequestError } = await supabase
    .from("approval_requests")
    .update({
      status: nextStatus,
      resolved_at: now,
    })
    .eq("id", request.id);

  if (updateRequestError) throw new Error(updateRequestError.message);

  const sourceTable = request.payload.sourceTable as ApprovalSourceTable | undefined;
  const sourceId = request.payload.sourceId as string | undefined;

  if (sourceTable && sourceId) {
    const { error: sourceError } = await supabase
      .from(sourceTable)
      .update({ status: nextStatus })
      .eq("id", sourceId)
      .eq("organization_id", input.organizationId);

    if (sourceError) throw new Error(sourceError.message);
  }

  const requesterUserId = await resolveUserIdForEmployee(
    input.organizationId,
    request.requester_employee_id,
  );

  const detailHref =
    sourceId && request.request_type
      ? employeeRequestDetailHref(request.request_type, sourceId)
      : null;

  await queueNotification({
    organizationId: input.organizationId,
    recipientUserId: requesterUserId,
    channel: "in_app",
    template: `approval.${input.event}`,
    payload: {
      requestId: request.id,
      requestType: request.request_type,
      status: nextStatus,
      sourceId: sourceId ?? null,
      href: detailHref,
    },
    idempotencyKey: `approval-${input.event}-${request.id}`,
  });

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: `approval.${input.event}`,
    resourceType: request.request_type,
    resourceId: request.id,
    metadata: {
      stepId: input.stepId,
      comment: input.comment,
      hrOverride: input.hrOverride ?? false,
    },
  });

  if (request.request_type === "leave" && sourceId && (nextStatus === "approved" || nextStatus === "rejected")) {
    const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
    const event = nextStatus === "approved" ? "leave.approved" : "leave.rejected";
    await emitLeaveWebhook(
      input.organizationId,
      event,
      { requestId: sourceId, employeeId: request.requester_employee_id },
      `leave-${nextStatus}:${sourceId}`,
    );
  }
}

export async function submitSourceRecordForApproval(
  input: Omit<SubmitApprovalInput, "approverEmployeeId">,
): Promise<string> {
  return submitForApproval(input);
}
