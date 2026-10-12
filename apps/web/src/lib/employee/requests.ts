import { logAuditEvent } from "@/lib/audit/log-event";
import { queueNotification } from "@/lib/notifications/queue";
import { resolveUserIdForEmployee } from "@/lib/approvals/service";
import { createClient } from "@/lib/supabase/server";
import { requireEmployeeContext } from "@/lib/employee/leave";

export type TimelineStep = {
  stepOrder?: number;
  label: string;
  approverName?: string;
  status: string;
  actedAt: string | null;
  comment: string | null;
  isEscalated?: boolean;
  dueDate?: string | null;
};

export async function getApprovalTimeline(approvalRequestId: string): Promise<TimelineStep[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  // Get the requester and submitted info, scoped to organization and requesting employee
  const { data: request } = await supabase
    .from("approval_requests")
    .select(`
      created_at,
      status,
      requester_employee_id
    `)
    .eq("organization_id", organizationId)
    .eq("id", approvalRequestId)
    .eq("requester_employee_id", employeeId)
    .maybeSingle();

  if (!request) return [];

  let requesterName = "Employee";
  const { data: empRaw } = await supabase
    .from("employees")
    .select("full_name, email")
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();
  requesterName = empRaw?.full_name ?? empRaw?.email ?? "Employee";

  const timeline: TimelineStep[] = [
    {
      stepOrder: 0,
      label: "Submitted",
      approverName: requesterName,
      status: "completed",
      actedAt: request.created_at,
      comment: null,
    },
  ];

  const { data: steps, error: stepsError } = await supabase
    .from("approval_steps")
    .select(`
      id,
      step_order,
      step_label,
      status,
      acted_at,
      comment,
      approver_employee_id,
      is_escalated,
      due_date
    `)
    .eq("organization_id", organizationId)
    .eq("approval_request_id", approvalRequestId)
    .order("step_order", { ascending: true });

  if (stepsError) throw new Error(stepsError.message);

  for (const step of steps ?? []) {
    let approverName = "Approver";
    if (step.approver_employee_id) {
      const { data: empRaw } = await supabase
        .from("employees")
        .select("full_name, email")
        .eq("organization_id", organizationId)
        .eq("id", step.approver_employee_id)
        .maybeSingle();
      approverName = empRaw?.full_name ?? empRaw?.email ?? "Approver";
    }

    const stepLabel =
      step.step_label ||
      (step.step_order === 1
        ? "Line Manager Review"
        : step.step_order === 2
          ? "Head of Department Review"
          : `Step ${step.step_order} Review`);

    const stepStatus = step.status === "draft" ? "waiting" : step.status;

    timeline.push({
      stepOrder: step.step_order,
      label: stepLabel,
      approverName,
      status: stepStatus,
      actedAt: step.acted_at,
      comment: step.comment,
      isEscalated: Boolean(step.is_escalated),
      dueDate: step.due_date,
    });
  }

  // Add final step if approved/rejected/cancelled/revoked
  if (
    request &&
    (request.status === "approved" ||
      request.status === "rejected" ||
      request.status === "cancelled" ||
      request.status === "revoked")
  ) {
    const label =
      request.status === "approved"
        ? "Approved"
        : request.status === "rejected"
          ? "Rejected"
          : request.status === "cancelled"
            ? "Cancelled"
            : "Revoked";

    timeline.push({
      label,
      status: request.status,
      actedAt: timeline[timeline.length - 1]?.actedAt ?? null,
      comment: null,
    });
  }

  return timeline;
}

export async function listClaims() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claims")
    .select("id, amount, receipt_date, description, status, created_at, approval_request_id, is_mileage, distance_km, rate_per_km, origin, destination, claim_types(name)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    receiptDate: row.receipt_date,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
    claimTypeName: (row.claim_types as { name?: string } | null)?.name ?? "Claim",
    isMileage: Boolean(row.is_mileage),
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    ratePerKm: row.rate_per_km != null ? Number(row.rate_per_km) : null,
    origin: row.origin ?? null,
    destination: row.destination ?? null,
  }));
}

export async function getClaim(id: string) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claims")
    .select("id, amount, receipt_date, description, status, created_at, approval_request_id, is_mileage, distance_km, rate_per_km, origin, destination, claim_types(name)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    amount: Number(data.amount),
    receiptDate: data.receipt_date,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    approvalRequestId: data.approval_request_id,
    claimTypeName: (data.claim_types as { name?: string } | null)?.name ?? "Claim",
    isMileage: Boolean(data.is_mileage),
    distanceKm: data.distance_km != null ? Number(data.distance_km) : null,
    ratePerKm: data.rate_per_km != null ? Number(data.rate_per_km) : null,
    origin: data.origin ?? null,
    destination: data.destination ?? null,
  };
}

export async function listOvertimeRequests() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("overtime_requests")
    .select("id, work_date, hours, rate_type, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    workDate: row.work_date,
    hours: Number(row.hours),
    rateType: row.rate_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
  }));
}

export async function getOvertimeRequest(id: string) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("overtime_requests")
    .select("id, work_date, hours, rate_type, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    workDate: data.work_date,
    hours: Number(data.hours),
    rateType: data.rate_type,
    reason: data.reason,
    status: data.status,
    createdAt: data.created_at,
    approvalRequestId: data.approval_request_id,
  };
}

export async function listLateReports() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("late_requests")
    .select("id, request_date, actual_arrival_time, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    requestDate: row.request_date,
    actualArrivalTime: row.actual_arrival_time,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
  }));
}

export async function getLateReport(id: string) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("late_requests")
    .select("id, request_date, actual_arrival_time, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    requestDate: data.request_date,
    actualArrivalTime: data.actual_arrival_time,
    reason: data.reason,
    status: data.status,
    createdAt: data.created_at,
    approvalRequestId: data.approval_request_id,
  };
}

export async function listAttendanceCorrections() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance_requests")
    .select("id, request_date, clock_in_time, clock_out_time, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    requestDate: row.request_date,
    clockInTime: row.clock_in_time,
    clockOutTime: row.clock_out_time,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
  }));
}

export async function getAttendanceCorrection(id: string) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance_requests")
    .select("id, request_date, clock_in_time, clock_out_time, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    requestDate: data.request_date,
    clockInTime: data.clock_in_time,
    clockOutTime: data.clock_out_time,
    reason: data.reason,
    status: data.status,
    createdAt: data.created_at,
    approvalRequestId: data.approval_request_id,
  };
}

export async function listReplacementCredits() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: credits, error: creditsError } = await supabase
    .from("replacement_credits")
    .select("id, work_date, credit_days, description, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false });

  if (creditsError) throw new Error(creditsError.message);

  const { data: usages, error: usagesError } = await supabase
    .from("replacement_credit_usages")
    .select("replacement_credit_id, days, leave_requests!inner(id, status, start_date, end_date)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId);

  if (usagesError) throw new Error(usagesError.message);

  const consumedMap = new Map<string, number>();
  for (const usage of usages ?? []) {
    const leaveReq = Array.isArray(usage.leave_requests)
      ? usage.leave_requests[0]
      : usage.leave_requests;
    if (leaveReq?.status === "approved" || leaveReq?.status === "pending") {
      const prev = consumedMap.get(usage.replacement_credit_id) ?? 0;
      consumedMap.set(usage.replacement_credit_id, prev + Number(usage.days));
    }
  }

  return (credits ?? []).map((row) => {
    const totalDays = Number(row.credit_days);
    const consumed = consumedMap.get(row.id) ?? 0;
    const remaining = Math.max(0, Number((totalDays - consumed).toFixed(2)));
    return {
      id: row.id,
      workDate: row.work_date,
      creditDays: totalDays,
      consumedDays: consumed,
      remainingDays: remaining,
      isConsumed: consumed >= totalDays && row.status === "approved",
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      approvalRequestId: row.approval_request_id,
    };
  });
}

export async function getReplacementCreditStats() {
  const list = await listReplacementCredits();
  const currentYear = new Date().getFullYear().toString();

  let available = 0;
  let pending = 0;
  let approvedYtd = 0;
  let rejected = 0;

  for (const row of list) {
    if (row.status === "approved") {
      available += row.remainingDays;
      if (row.workDate.startsWith(currentYear) || row.createdAt.startsWith(currentYear)) {
        approvedYtd += row.creditDays;
      }
    } else if (row.status === "pending" || row.status === "draft") {
      pending += row.creditDays;
    } else if (row.status === "rejected") {
      rejected += row.creditDays;
    }
  }

  return {
    available: Number(available.toFixed(1)),
    pending: Number(pending.toFixed(1)),
    approvedYtd: Number(approvedYtd.toFixed(1)),
    rejected: Number(rejected.toFixed(1)),
  };
}

export async function cancelClaimRequest(requestId: string, reason?: string): Promise<void> {
  const { employeeId, organizationId, session } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: request, error: fetchError } = await supabase
    .from("claims")
    .select("id, status, approval_request_id, amount")
    .eq("id", requestId)
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!request) throw new Error("Claim request not found.");

  if (request.status !== "pending") {
    throw new Error(
      `Cannot cancel a claim request with status "${request.status}". Only pending requests can be cancelled.`,
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("claims")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", requestId)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  let approverEmployeeId: string | null = null;
  let pendingStepId: string | null = null;

  if (request.approval_request_id) {
    const { data: appReq } = await supabase
      .from("approval_requests")
      .select("id, payload")
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    await supabase
      .from("approval_requests")
      .update({
        status: "cancelled",
        resolved_at: now,
        payload: {
          ...(typeof appReq?.payload === "object" && appReq?.payload !== null
            ? appReq.payload
            : {}),
          cancellationReason: reason ?? null,
          cancelledByUserId: session.user.id,
          cancelledAt: now,
        },
      })
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId);

    const { data: pendingStep } = await supabase
      .from("approval_steps")
      .select("id, approver_employee_id")
      .eq("approval_request_id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingStep) {
      approverEmployeeId = pendingStep.approver_employee_id;
      pendingStepId = pendingStep.id;
      await supabase
        .from("approval_steps")
        .update({
          status: "cancelled",
          acted_at: now,
          comment: reason ? `Cancelled by employee: ${reason}` : "Cancelled by employee",
        })
        .eq("id", pendingStep.id);
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "claim.cancelled",
    resourceType: "claim",
    resourceId: requestId,
    metadata: { reason: reason ?? null, amount: request.amount },
  });

  if (approverEmployeeId && pendingStepId) {
    const managerUserId = await resolveUserIdForEmployee(organizationId, approverEmployeeId);
    if (managerUserId) {
      const actorName = session.user.fullName || session.user.email || "Employee";
      await queueNotification({
        organizationId,
        recipientUserId: managerUserId,
        channel: "in_app",
        template: "approval.cancel",
        payload: {
          requestId: request.approval_request_id,
          requestType: "claim",
          sourceId: requestId,
          stepId: pendingStepId,
          actorName,
          reason: reason ?? null,
          href: `/manager/approvals/${pendingStepId}`,
        },
        idempotencyKey: `claim-cancelled-${requestId}`,
      });

      const { sendWebPushNotification } = await import("@/lib/notifications/web-push");
      await sendWebPushNotification({
        organizationId,
        recipientUserId: managerUserId,
        title: "Claim Request Cancelled",
        body: reason
          ? `${actorName} cancelled their claim: "${reason}"`
          : `${actorName} cancelled their claim.`,
        url: `/manager/approvals/${pendingStepId}`,
        tag: `claim-cancelled-${requestId}`,
      }).catch(() => undefined);
    }
  }
}

export async function revokeClaimRequest(requestId: string, reason?: string): Promise<void> {
  const { employeeId, organizationId, session } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: request, error: fetchError } = await supabase
    .from("claims")
    .select("id, status, approval_request_id, amount")
    .eq("id", requestId)
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!request) throw new Error("Claim request not found.");

  if (request.status !== "approved") {
    throw new Error(
      `Cannot revoke a claim with status "${request.status}". Only approved claims can be revoked.`,
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("claims")
    .update({ status: "revoked", updated_at: now })
    .eq("id", requestId)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  let approverEmployeeId: string | null = null;
  let lastStepId: string | null = null;

  if (request.approval_request_id) {
    const { data: appReq } = await supabase
      .from("approval_requests")
      .select("id, payload")
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    await supabase
      .from("approval_requests")
      .update({
        status: "revoked",
        resolved_at: now,
        payload: {
          ...(typeof appReq?.payload === "object" && appReq?.payload !== null
            ? appReq.payload
            : {}),
          revokeReason: reason ?? null,
          revokedByUserId: session.user.id,
          revokedAt: now,
        },
      })
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId);

    const { data: lastStep } = await supabase
      .from("approval_steps")
      .select("id, approver_employee_id")
      .eq("approval_request_id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .order("step_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastStep) {
      approverEmployeeId = lastStep.approver_employee_id;
      lastStepId = lastStep.id;
      await supabase
        .from("approval_steps")
        .update({
          status: "revoked",
          acted_at: now,
          comment: reason ? `Revoked by employee: ${reason}` : "Revoked by employee",
        })
        .eq("id", lastStep.id);
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "claim.revoked",
    resourceType: "claim",
    resourceId: requestId,
    metadata: { reason: reason ?? null, amount: request.amount },
  });

  if (approverEmployeeId) {
    const managerUserId = await resolveUserIdForEmployee(organizationId, approverEmployeeId);
    if (managerUserId) {
      const actorName = session.user.fullName || session.user.email || "Employee";
      await queueNotification({
        organizationId,
        recipientUserId: managerUserId,
        channel: "in_app",
        template: "approval.revoke",
        payload: {
          requestId: request.approval_request_id,
          requestType: "claim",
          sourceId: requestId,
          stepId: lastStepId,
          actorName,
          reason: reason ?? null,
          href: lastStepId ? `/manager/approvals/${lastStepId}` : `/employee/claims/${requestId}`,
        },
        idempotencyKey: `claim-revoked-${requestId}`,
      });

      const { sendWebPushNotification } = await import("@/lib/notifications/web-push");
      await sendWebPushNotification({
        organizationId,
        recipientUserId: managerUserId,
        title: "Claim Revoked",
        body: reason
          ? `${actorName} revoked their approved claim: "${reason}"`
          : `${actorName} revoked their approved claim.`,
        url: lastStepId ? `/manager/approvals/${lastStepId}` : "/manager/approvals",
        tag: `claim-revoked-${requestId}`,
      }).catch(() => undefined);
    }
  }
}

export async function cancelOvertimeRequest(requestId: string, reason?: string): Promise<void> {
  const { employeeId, organizationId, session } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: request, error: fetchError } = await supabase
    .from("overtime_requests")
    .select("id, status, approval_request_id, hours")
    .eq("id", requestId)
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!request) throw new Error("Overtime request not found.");

  if (request.status !== "pending") {
    throw new Error(
      `Cannot cancel an overtime request with status "${request.status}". Only pending requests can be cancelled.`,
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("overtime_requests")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", requestId)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  let approverEmployeeId: string | null = null;
  let pendingStepId: string | null = null;

  if (request.approval_request_id) {
    const { data: appReq } = await supabase
      .from("approval_requests")
      .select("id, payload")
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    await supabase
      .from("approval_requests")
      .update({
        status: "cancelled",
        resolved_at: now,
        payload: {
          ...(typeof appReq?.payload === "object" && appReq?.payload !== null
            ? appReq.payload
            : {}),
          cancellationReason: reason ?? null,
          cancelledByUserId: session.user.id,
          cancelledAt: now,
        },
      })
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId);

    const { data: pendingStep } = await supabase
      .from("approval_steps")
      .select("id, approver_employee_id")
      .eq("approval_request_id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingStep) {
      approverEmployeeId = pendingStep.approver_employee_id;
      pendingStepId = pendingStep.id;
      await supabase
        .from("approval_steps")
        .update({
          status: "cancelled",
          acted_at: now,
          comment: reason ? `Cancelled by employee: ${reason}` : "Cancelled by employee",
        })
        .eq("id", pendingStep.id);
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "overtime.cancelled",
    resourceType: "overtime",
    resourceId: requestId,
    metadata: { reason: reason ?? null, hours: request.hours },
  });

  if (approverEmployeeId && pendingStepId) {
    const managerUserId = await resolveUserIdForEmployee(organizationId, approverEmployeeId);
    if (managerUserId) {
      const actorName = session.user.fullName || session.user.email || "Employee";
      await queueNotification({
        organizationId,
        recipientUserId: managerUserId,
        channel: "in_app",
        template: "approval.cancel",
        payload: {
          requestId: request.approval_request_id,
          requestType: "overtime",
          sourceId: requestId,
          stepId: pendingStepId,
          actorName,
          reason: reason ?? null,
          href: `/manager/approvals/${pendingStepId}`,
        },
        idempotencyKey: `overtime-cancelled-${requestId}`,
      });

      const { sendWebPushNotification } = await import("@/lib/notifications/web-push");
      await sendWebPushNotification({
        organizationId,
        recipientUserId: managerUserId,
        title: "Overtime Request Cancelled",
        body: reason
          ? `${actorName} cancelled their overtime request: "${reason}"`
          : `${actorName} cancelled their overtime request.`,
        url: `/manager/approvals/${pendingStepId}`,
        tag: `overtime-cancelled-${requestId}`,
      }).catch(() => undefined);
    }
  }
}

export async function revokeOvertimeRequest(requestId: string, reason?: string): Promise<void> {
  const { employeeId, organizationId, session } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: request, error: fetchError } = await supabase
    .from("overtime_requests")
    .select("id, status, approval_request_id, hours")
    .eq("id", requestId)
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!request) throw new Error("Overtime request not found.");

  if (request.status !== "approved") {
    throw new Error(
      `Cannot revoke an overtime request with status "${request.status}". Only approved overtime requests can be revoked.`,
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("overtime_requests")
    .update({ status: "revoked", updated_at: now })
    .eq("id", requestId)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  let approverEmployeeId: string | null = null;
  let lastStepId: string | null = null;

  if (request.approval_request_id) {
    const { data: appReq } = await supabase
      .from("approval_requests")
      .select("id, payload")
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    await supabase
      .from("approval_requests")
      .update({
        status: "revoked",
        resolved_at: now,
        payload: {
          ...(typeof appReq?.payload === "object" && appReq?.payload !== null
            ? appReq.payload
            : {}),
          revokeReason: reason ?? null,
          revokedByUserId: session.user.id,
          revokedAt: now,
        },
      })
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId);

    const { data: lastStep } = await supabase
      .from("approval_steps")
      .select("id, approver_employee_id")
      .eq("approval_request_id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .order("step_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastStep) {
      approverEmployeeId = lastStep.approver_employee_id;
      lastStepId = lastStep.id;
      await supabase
        .from("approval_steps")
        .update({
          status: "revoked",
          acted_at: now,
          comment: reason ? `Revoked by employee: ${reason}` : "Revoked by employee",
        })
        .eq("id", lastStep.id);
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "overtime.revoked",
    resourceType: "overtime",
    resourceId: requestId,
    metadata: { reason: reason ?? null, hours: request.hours },
  });

  if (approverEmployeeId) {
    const managerUserId = await resolveUserIdForEmployee(organizationId, approverEmployeeId);
    if (managerUserId) {
      const actorName = session.user.fullName || session.user.email || "Employee";
      await queueNotification({
        organizationId,
        recipientUserId: managerUserId,
        channel: "in_app",
        template: "approval.revoke",
        payload: {
          requestId: request.approval_request_id,
          requestType: "overtime",
          sourceId: requestId,
          stepId: lastStepId,
          actorName,
          reason: reason ?? null,
          href: lastStepId ? `/manager/approvals/${lastStepId}` : `/employee/overtime/${requestId}`,
        },
        idempotencyKey: `overtime-revoked-${requestId}`,
      });

      const { sendWebPushNotification } = await import("@/lib/notifications/web-push");
      await sendWebPushNotification({
        organizationId,
        recipientUserId: managerUserId,
        title: "Overtime Request Revoked",
        body: reason
          ? `${actorName} revoked their approved overtime: "${reason}"`
          : `${actorName} revoked their approved overtime.`,
        url: lastStepId ? `/manager/approvals/${lastStepId}` : "/manager/approvals",
        tag: `overtime-revoked-${requestId}`,
      }).catch(() => undefined);
    }
  }
}

