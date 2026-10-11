import { revalidatePath } from "next/cache";
import type { ApprovalEvent } from "@hrms/domain";

import { logAuditEvent } from "@/lib/audit/log-event";
import { employeeRequestDetailHref } from "@/lib/notifications/links";
import { queueNotification } from "@/lib/notifications/queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type {
  ApprovalRequestType,
  ApprovalSourceTable,
  ApproverType,
  ApprovalWorkflowConfig,
  EscalationAction,
} from "./types";

type SubmitApprovalInput = {
  organizationId: string;
  requesterEmployeeId: string;
  requestType: ApprovalRequestType;
  sourceTable: ApprovalSourceTable;
  sourceId: string;
  payload: Record<string, unknown>;
  actorUserId: string;
  client?: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;
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

export type ResolvedApprovalStep = {
  stepOrder: number;
  stepLabel: string;
  approverEmployeeId: string | null;
  timeoutDays: number | null;
  escalationAction: EscalationAction;
  escalationEmployeeId: string | null;
};

export async function resolveUserIdForEmployee(
  organizationId: string,
  employeeId: string,
  client?: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  let admin: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;
  try {
    admin = client ?? createAdminClient();
  } catch {
    return null;
  }
  const { data, error } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) return null;
  return data?.user_id ?? null;
}

export async function resolveApprovalChain(params: {
  organizationId: string;
  requesterEmployeeId: string;
  requestType: ApprovalRequestType;
  client?: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;
}): Promise<ResolvedApprovalStep[]> {
  const supabase = params.client ?? (await createClient());

  const { data: requester } = await supabase
    .from("employees")
    .select("id, manager_employee_id, department_id")
    .eq("organization_id", params.organizationId)
    .eq("id", params.requesterEmployeeId)
    .maybeSingle();

  const { data: workflow } = await supabase
    .from("approval_workflows")
    .select(`
      id,
      name,
      approval_workflow_steps (
        id,
        step_order,
        step_label,
        approver_type,
        specific_employee_id,
        timeout_days,
        escalation_action,
        escalation_employee_id
      )
    `)
    .eq("organization_id", params.organizationId)
    .eq("request_type", params.requestType)
    .eq("is_active", true)
    .maybeSingle();

  const workflowSteps = (workflow?.approval_workflow_steps ?? []) as {
    step_order: number;
    step_label: string;
    approver_type: ApproverType;
    specific_employee_id: string | null;
    timeout_days: number | null;
    escalation_action: EscalationAction;
    escalation_employee_id: string | null;
  }[];

  if (workflowSteps.length > 0) {
    workflowSteps.sort((a, b) => a.step_order - b.step_order);
    const resolvedSteps: ResolvedApprovalStep[] = [];

    for (const step of workflowSteps) {
      let approverId: string | null = null;

      if (step.approver_type === "manager") {
        if (step.step_order === 1) {
          approverId = requester?.manager_employee_id ?? null;
        } else {
          const prevApproverId = resolvedSteps[step.step_order - 2]?.approverEmployeeId ?? requester?.manager_employee_id;
          if (prevApproverId) {
            const { data: mgr } = await supabase
              .from("employees")
              .select("manager_employee_id")
              .eq("organization_id", params.organizationId)
              .eq("id", prevApproverId)
              .maybeSingle();
            approverId = mgr?.manager_employee_id ?? prevApproverId;
          }
        }
      } else if (step.approver_type === "department_head") {
        if (requester?.department_id) {
          const { data: dept } = await supabase
            .from("departments")
            .select("head_employee_id")
            .eq("organization_id", params.organizationId)
            .eq("id", requester.department_id)
            .maybeSingle();
          approverId = dept?.head_employee_id ?? null;
        }
        if (!approverId) {
          approverId = requester?.manager_employee_id ?? null;
        }
      } else if (step.approver_type === "specific_employee") {
        approverId = step.specific_employee_id;
      } else if (step.approver_type === "hr_admin") {
        const { data: hrMembership } = await supabase
          .from("organization_memberships")
          .select("employee_id")
          .eq("organization_id", params.organizationId)
          .contains("roles", ["hr_administrator"])
          .not("employee_id", "is", null)
          .limit(1)
          .maybeSingle();
        approverId = hrMembership?.employee_id ?? null;
      }

      resolvedSteps.push({
        stepOrder: step.step_order,
        stepLabel: step.step_label || `Step ${step.step_order}`,
        approverEmployeeId: approverId,
        timeoutDays: step.timeout_days ?? 3,
        escalationAction: step.escalation_action ?? "escalate_to_manager_of_manager",
        escalationEmployeeId: step.escalation_employee_id ?? null,
      });
    }

    return resolvedSteps;
  }

  return [
    {
      stepOrder: 1,
      stepLabel: "Line Manager",
      approverEmployeeId: requester?.manager_employee_id ?? null,
      timeoutDays: 3,
      escalationAction: "escalate_to_manager_of_manager",
      escalationEmployeeId: null,
    },
  ];
}

export async function submitForApproval(input: SubmitApprovalInput): Promise<string> {
  const supabase = input.client ?? (await createClient());

  const chain = await resolveApprovalChain({
    organizationId: input.organizationId,
    requesterEmployeeId: input.requesterEmployeeId,
    requestType: input.requestType,
    client: supabase,
  });

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

  const stepRows = chain.map((stepConfig) => {
    const isFirstStep = stepConfig.stepOrder === 1;
    const dueDate = isFirstStep && stepConfig.timeoutDays
      ? new Date(Date.now() + stepConfig.timeoutDays * 86400000).toISOString()
      : null;

    return {
      approval_request_id: request.id,
      organization_id: input.organizationId,
      step_order: stepConfig.stepOrder,
      step_label: stepConfig.stepLabel,
      approver_employee_id: stepConfig.approverEmployeeId,
      status: isFirstStep ? "pending" : "draft",
      timeout_days: stepConfig.timeoutDays,
      due_date: dueDate,
      escalation_action: stepConfig.escalationAction,
      escalation_employee_id: stepConfig.escalationEmployeeId,
    };
  });

  const { data: createdSteps, error: stepsError } = await supabase
    .from("approval_steps")
    .insert(stepRows)
    .select("id, step_order, approver_employee_id, status");

  if (stepsError) throw new Error(stepsError.message);

  const { error: linkError } = await supabase
    .from(input.sourceTable)
    .update({ approval_request_id: request.id, status: "pending" })
    .eq("id", input.sourceId)
    .eq("organization_id", input.organizationId);

  if (linkError) throw new Error(linkError.message);

  const firstStep = (createdSteps ?? []).find((s) => s.step_order === 1);
  if (firstStep?.approver_employee_id) {
    const managerUserId = await resolveUserIdForEmployee(
      input.organizationId,
      firstStep.approver_employee_id,
      supabase,
    );
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
        stepId: firstStep.id,
        href: `/manager/approvals/${firstStep.id}`,
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
    metadata: {
      sourceTable: input.sourceTable,
      sourceId: input.sourceId,
      totalSteps: chain.length,
    },
  });

  return request.id;
}

export async function actOnApproval(input: ActOnApprovalInput): Promise<void> {
  const supabase = await createClient();

  const { data: step, error: stepError } = await supabase
    .from("approval_steps")
    .select(
      "id, step_order, status, approver_employee_id, approval_request_id, timeout_days, approval_requests(id, status, request_type, requester_employee_id, payload)",
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

  const now = new Date().toISOString();
  const sourceTable = request.payload.sourceTable as ApprovalSourceTable | undefined;
  const sourceId = request.payload.sourceId as string | undefined;

  if (input.event === "approve") {
    // Check if there are subsequent approval steps in this chain
    const { data: nextSteps, error: nextStepsError } = await supabase
      .from("approval_steps")
      .select("id, step_order, approver_employee_id, timeout_days, status")
      .eq("approval_request_id", request.id)
      .eq("organization_id", input.organizationId)
      .gt("step_order", step.step_order)
      .order("step_order", { ascending: true });

    if (nextStepsError) throw new Error(nextStepsError.message);

    const nextStep = nextSteps && nextSteps.length > 0 ? nextSteps[0] : null;

    if (nextStep) {
      // Step 1 Approved -> Step 2 Pending
      const { error: updateCurrentStepError } = await supabase
        .from("approval_steps")
        .update({
          status: "approved",
          acted_at: now,
          comment: input.comment ?? null,
        })
        .eq("id", input.stepId);

      if (updateCurrentStepError) throw new Error(updateCurrentStepError.message);

      const nextDueDate = nextStep.timeout_days
        ? new Date(Date.now() + nextStep.timeout_days * 86400000).toISOString()
        : null;

      const { error: updateNextStepError } = await supabase
        .from("approval_steps")
        .update({
          status: "pending",
          due_date: nextDueDate,
        })
        .eq("id", nextStep.id);

      if (updateNextStepError) throw new Error(updateNextStepError.message);

      // Notify next approver
      if (nextStep.approver_employee_id) {
        const nextApproverUserId = await resolveUserIdForEmployee(
          input.organizationId,
          nextStep.approver_employee_id,
          supabase,
        );
        await queueNotification({
          organizationId: input.organizationId,
          recipientUserId: nextApproverUserId,
          channel: "in_app",
          template: "approval.pending",
          payload: {
            requestId: request.id,
            requestType: request.request_type,
            requesterEmployeeId: request.requester_employee_id,
            sourceId: sourceId ?? null,
            stepId: nextStep.id,
            href: `/manager/approvals/${nextStep.id}`,
          },
          idempotencyKey: `approval-pending-${nextStep.id}`,
        });
      }

      await logAuditEvent({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "approval.step_approved",
        resourceType: request.request_type,
        resourceId: request.id,
        metadata: {
          stepId: input.stepId,
          stepOrder: step.step_order,
          nextStepId: nextStep.id,
          nextStepOrder: nextStep.step_order,
          comment: input.comment,
          hrOverride: input.hrOverride ?? false,
        },
      });

      revalidateAllApprovalCaches(sourceId, request.request_type);
      return;
    }

    // Final Approval (last step completed)
    if (sourceTable === "leave_requests" && sourceId) {
      const admin = createAdminClient();
      const { data: leaveReq, error: leaveFetchError } = await admin
        .from("leave_requests")
        .select("employee_id, leave_type_id, days")
        .eq("id", sourceId)
        .eq("organization_id", input.organizationId)
        .maybeSingle();

      if (leaveFetchError) throw new Error(leaveFetchError.message);
      if (leaveReq) {
        const { assertLeaveBalance } = await import("@/lib/leave/balance");
        await assertLeaveBalance({
          organizationId: input.organizationId,
          employeeId: leaveReq.employee_id,
          leaveTypeId: leaveReq.leave_type_id,
          days: Number(leaveReq.days),
          allowOverride: input.hrOverride,
          overrideReason: input.comment,
          client: admin,
          excludeRequestId: sourceId,
        });
      }
    }

    const { error: updateStepError } = await supabase
      .from("approval_steps")
      .update({
        status: "approved",
        acted_at: now,
        comment: input.comment ?? null,
      })
      .eq("id", input.stepId);

    if (updateStepError) throw new Error(updateStepError.message);

    const { error: updateRequestError } = await supabase
      .from("approval_requests")
      .update({
        status: "approved",
        resolved_at: now,
      })
      .eq("id", request.id);

    if (updateRequestError) throw new Error(updateRequestError.message);

    if (sourceTable && sourceId) {
      const { error: sourceError } = await supabase
        .from(sourceTable)
        .update({ status: "approved" })
        .eq("id", sourceId)
        .eq("organization_id", input.organizationId);

      if (sourceError) throw new Error(sourceError.message);

      if (sourceTable === "attendance_requests") {
        const { applyApprovedAttendanceRequest } = await import(
          "@/lib/attendance/apply-approved-request"
        );
        await applyApprovedAttendanceRequest(input.organizationId, sourceId);
      }
    }

    const requesterUserId = await resolveUserIdForEmployee(
      input.organizationId,
      request.requester_employee_id,
      supabase,
    );

    const detailHref =
      sourceId && request.request_type
        ? employeeRequestDetailHref(request.request_type, sourceId)
        : null;

    await queueNotification({
      organizationId: input.organizationId,
      recipientUserId: requesterUserId,
      channel: "in_app",
      template: "approval.approve",
      payload: {
        requestId: request.id,
        requestType: request.request_type,
        status: "approved",
        sourceId: sourceId ?? null,
        href: detailHref,
      },
      idempotencyKey: `approval-approve-${request.id}`,
    });

    await logAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "approval.approved",
      resourceType: request.request_type,
      resourceId: request.id,
      metadata: {
        stepId: input.stepId,
        comment: input.comment,
        hrOverride: input.hrOverride ?? false,
      },
    });

    if (request.request_type === "leave" && sourceId) {
      const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
      await emitLeaveWebhook(
        input.organizationId,
        "leave.approved",
        { requestId: sourceId, employeeId: request.requester_employee_id },
        `leave-approved:${sourceId}`,
      );
    }

    revalidateAllApprovalCaches(sourceId, request.request_type);
    return;
  }

  // Handle Rejection: reject current step and cancel all subsequent steps
  const { error: updateStepError } = await supabase
    .from("approval_steps")
    .update({
      status: "rejected",
      acted_at: now,
      comment: input.comment ?? null,
    })
    .eq("id", input.stepId);

  if (updateStepError) throw new Error(updateStepError.message);

  await supabase
    .from("approval_steps")
    .update({
      status: "cancelled",
      acted_at: now,
      comment: "Cancelled due to rejection in prior approval step.",
    })
    .eq("approval_request_id", request.id)
    .gt("step_order", step.step_order);

  const { error: updateRequestError } = await supabase
    .from("approval_requests")
    .update({
      status: "rejected",
      resolved_at: now,
    })
    .eq("id", request.id);

  if (updateRequestError) throw new Error(updateRequestError.message);

  if (sourceTable && sourceId) {
    const { error: sourceError } = await supabase
      .from(sourceTable)
      .update({ status: "rejected" })
      .eq("id", sourceId)
      .eq("organization_id", input.organizationId);

    if (sourceError) throw new Error(sourceError.message);

    if (sourceTable === "leave_requests") {
      const { restoreReplacementCredits } = await import(
        "@/lib/leave/replacement-credit"
      );
      await restoreReplacementCredits({
        organizationId: input.organizationId,
        leaveRequestId: sourceId,
        actorUserId: input.actorUserId,
        client: supabase,
      });
    }
  }

  const requesterUserId = await resolveUserIdForEmployee(
    input.organizationId,
    request.requester_employee_id,
    supabase,
  );

  const detailHref =
    sourceId && request.request_type
      ? employeeRequestDetailHref(request.request_type, sourceId)
      : null;

  await queueNotification({
    organizationId: input.organizationId,
    recipientUserId: requesterUserId,
    channel: "in_app",
    template: "approval.reject",
    payload: {
      requestId: request.id,
      requestType: request.request_type,
      status: "rejected",
      sourceId: sourceId ?? null,
      href: detailHref,
    },
    idempotencyKey: `approval-reject-${request.id}`,
  });

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "approval.rejected",
    resourceType: request.request_type,
    resourceId: request.id,
    metadata: {
      stepId: input.stepId,
      comment: input.comment,
      hrOverride: input.hrOverride ?? false,
    },
  });

  if (request.request_type === "leave" && sourceId) {
    const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
    await emitLeaveWebhook(
      input.organizationId,
      "leave.rejected",
      { requestId: sourceId, employeeId: request.requester_employee_id },
      `leave-rejected:${sourceId}`,
    );
  }

  revalidateAllApprovalCaches(sourceId, request.request_type);
}

function revalidateAllApprovalCaches(sourceId?: string, requestType?: ApprovalRequestType): void {
  try {
    revalidatePath("/employee/dashboard");
    revalidatePath("/employee/leave");
    revalidatePath("/employee/claims");
    revalidatePath("/employee/overtime");
    revalidatePath("/employee/replacement-credit");
    revalidatePath("/employee/report-late");
    revalidatePath("/employee/manual-attendance");
    revalidatePath("/manager/approvals");
    revalidatePath("/manager/dashboard");
    revalidatePath("/hr/operations");
    if (sourceId && requestType) {
      const href = employeeRequestDetailHref(requestType, sourceId);
      if (href) {
        revalidatePath(href);
      }
    }
  } catch {
    // Graceful fallback if outside Next.js request context (e.g. tests)
  }
}

export async function submitSourceRecordForApproval(
  input: Omit<SubmitApprovalInput, "approverEmployeeId">,
): Promise<string> {
  return submitForApproval(input);
}

export async function saveApprovalWorkflow(config: ApprovalWorkflowConfig): Promise<string> {
  const admin = createAdminClient();

  const { data: existingWorkflow } = await admin
    .from("approval_workflows")
    .select("id")
    .eq("organization_id", config.organizationId)
    .eq("request_type", config.requestType)
    .maybeSingle();

  let workflowId = existingWorkflow?.id;

  if (workflowId) {
    const { error: updateError } = await admin
      .from("approval_workflows")
      .update({
        name: config.name,
        is_active: config.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workflowId);

    if (updateError) throw new Error(updateError.message);
  } else {
    const { data: newWorkflow, error: insertError } = await admin
      .from("approval_workflows")
      .insert({
        organization_id: config.organizationId,
        request_type: config.requestType,
        name: config.name,
        is_active: config.isActive,
      })
      .select("id")
      .single();

    if (insertError || !newWorkflow) throw new Error(insertError?.message ?? "Failed to create workflow.");
    workflowId = newWorkflow.id;
  }

  // Replace workflow steps
  await admin
    .from("approval_workflow_steps")
    .delete()
    .eq("workflow_id", workflowId);

  if (config.steps && config.steps.length > 0) {
    const stepRows = config.steps.map((step, idx) => ({
      workflow_id: workflowId,
      organization_id: config.organizationId,
      step_order: step.stepOrder ?? idx + 1,
      step_label: step.stepLabel || `Step ${step.stepOrder ?? idx + 1}`,
      approver_type: step.approverType,
      specific_employee_id: step.specificEmployeeId ?? null,
      timeout_days: step.timeoutDays ?? null,
      escalation_action: step.escalationAction ?? "none",
      escalation_employee_id: step.escalationEmployeeId ?? null,
    }));

    const { error: stepsInsertError } = await admin
      .from("approval_workflow_steps")
      .insert(stepRows);

    if (stepsInsertError) throw new Error(stepsInsertError.message);
  }

  return workflowId;
}

export async function getApprovalWorkflow(
  organizationId: string,
  requestType: ApprovalRequestType,
): Promise<ApprovalWorkflowConfig | null> {
  const supabase = await createClient();

  const { data: workflow, error } = await supabase
    .from("approval_workflows")
    .select(`
      id,
      organization_id,
      request_type,
      name,
      is_active,
      approval_workflow_steps (
        id,
        step_order,
        step_label,
        approver_type,
        specific_employee_id,
        timeout_days,
        escalation_action,
        escalation_employee_id
      )
    `)
    .eq("organization_id", organizationId)
    .eq("request_type", requestType)
    .maybeSingle();

  if (error || !workflow) return null;

  const rawSteps = (workflow.approval_workflow_steps ?? []) as {
    step_order: number;
    step_label: string;
    approver_type: ApproverType;
    specific_employee_id: string | null;
    timeout_days: number | null;
    escalation_action: EscalationAction;
    escalation_employee_id: string | null;
  }[];

  rawSteps.sort((a, b) => a.step_order - b.step_order);

  return {
    id: workflow.id,
    organizationId: workflow.organization_id,
    requestType: workflow.request_type as ApprovalRequestType,
    name: workflow.name,
    isActive: workflow.is_active,
    steps: rawSteps.map((s) => ({
      stepOrder: s.step_order,
      stepLabel: s.step_label,
      approverType: s.approver_type,
      specificEmployeeId: s.specific_employee_id,
      timeoutDays: s.timeout_days,
      escalationAction: s.escalation_action,
      escalationEmployeeId: s.escalation_employee_id,
    })),
  };
}
