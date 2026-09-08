import type { LeaveRequestInput } from "@hrms/validation";
import { countWorkingDays, transition } from "@hrms/domain";

import { submitForApproval, resolveUserIdForEmployee } from "@/lib/approvals/service";
import { logAuditEvent } from "@/lib/audit/log-event";
import { requireAuth } from "@/lib/auth/session";
import { queueNotification } from "@/lib/notifications/queue";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationIdForWrite } from "@/lib/auth/organization-context";
import { expireOverduePendingLeaves } from "@/lib/leave/expiry";


export type LeaveTypeOption = {
  id: string;
  name: string;
  entitlementDays: number;
  isUnpaid: boolean;
  requiresAttachment: boolean;
};

export type LeaveRequestRow = {
  id: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  days: number;
  reason: string | null;
  status: string;
  createdAt: string;
  attachmentFileId?: string | null;
  attachmentFileName?: string | null;
  approvalRequestId?: string | null;
};

export type LeaveBalanceRow = {
  leaveTypeId: string;
  leaveTypeName: string;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
};

export async function requireEmployeeContext() {
  const session = await requireAuth();
  const employeeId = session.membership.employeeId;

  if (!employeeId) {
    throw new Error("No employee record linked to this account.");
  }

  return {
    session,
    employeeId,
    organizationId: await requireOrganizationIdForWrite(),
  };
}

export async function listLeaveTypes(): Promise<LeaveTypeOption[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: allowedData } = await supabase
    .from("employee_allowed_leave_types")
    .select("leave_type_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId);

  const allowedIds = (allowedData ?? []).map((row) => row.leave_type_id);

  // Intentional policy: empty allow-list means all org leave types are available.
  const query = supabase
    .from("leave_types")
    .select("id, name, entitlement_days, is_unpaid, requires_attachment")
    .eq("organization_id", organizationId);

  if (allowedIds.length > 0) {
    query.in("id", allowedIds);
  }

  const { data, error } = await query.order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    entitlementDays: Number(row.entitlement_days),
    isUnpaid: row.is_unpaid,
    requiresAttachment: row.requires_attachment,
  }));
}

export async function listLeaveRequests(): Promise<LeaveRequestRow[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  await expireOverduePendingLeaves({ organizationId, employeeId }).catch(console.error);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, start_date, end_date, half_day, days, reason, status, created_at, leave_types(name), approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    leaveTypeName: (row.leave_types as { name?: string } | null)?.name ?? "Leave",
    startDate: row.start_date,
    endDate: row.end_date,
    halfDay: row.half_day,
    days: Number(row.days),
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
  }));
}

export async function getLeaveRequest(requestId: string): Promise<LeaveRequestRow | null> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  await expireOverduePendingLeaves({ organizationId, employeeId }).catch(console.error);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, start_date, end_date, half_day, days, reason, status, created_at, attachment_file_id, approval_request_id, leave_types(name), file_objects(file_name)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const file = Array.isArray(data.file_objects) ? data.file_objects[0] : data.file_objects;

  return {
    id: data.id,
    leaveTypeName: (data.leave_types as { name?: string } | null)?.name ?? "Leave",
    startDate: data.start_date,
    endDate: data.end_date,
    halfDay: data.half_day,
    days: Number(data.days),
    reason: data.reason,
    status: data.status,
    createdAt: data.created_at,
    attachmentFileId: data.attachment_file_id,
    attachmentFileName: (file as { file_name?: string } | null)?.file_name ?? null,
    approvalRequestId: data.approval_request_id,
  };
}

export async function getLeaveBalances(): Promise<LeaveBalanceRow[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  await expireOverduePendingLeaves({ organizationId, employeeId }).catch(console.error);
  const supabase = await createClient();

  const { data: allowedData } = await supabase
    .from("employee_allowed_leave_types")
    .select("leave_type_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId);

  const allowedIds = (allowedData ?? []).map((row) => row.leave_type_id);

  const typesQuery = supabase
    .from("leave_types")
    .select("id, name, entitlement_days")
    .eq("organization_id", organizationId);

  if (allowedIds.length > 0) {
    typesQuery.in("id", allowedIds);
  }

  const [employeeResult, typesResult, requestsResult] = await Promise.all([
    supabase
      .from("employees")
      .select("annual_leave_entitlement, annual_leave_carry_forward")
      .eq("organization_id", organizationId)
      .eq("id", employeeId)
      .maybeSingle(),
    typesQuery,
    supabase
      .from("leave_requests")
      .select("leave_type_id, days, status")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .in("status", ["pending", "approved"]),
  ]);

  if (typesResult.error) throw new Error(typesResult.error.message);
  if (requestsResult.error) throw new Error(requestsResult.error.message);

  return (typesResult.data ?? []).map((type) => {
    const matching = (requestsResult.data ?? []).filter((row) => row.leave_type_id === type.id);
    const usedDays = matching
      .filter((row) => row.status === "approved")
      .reduce((sum, row) => sum + Number(row.days), 0);
    const pendingDays = matching
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + Number(row.days), 0);

    let entitlementDays = Number(type.entitlement_days);
    if (type.name.toLowerCase() === "annual leave" && employeeResult?.data) {
      entitlementDays = Number(employeeResult.data.annual_leave_entitlement ?? 14) +
                        Number(employeeResult.data.annual_leave_carry_forward ?? 0);
    }

    return {
      leaveTypeId: type.id,
      leaveTypeName: type.name,
      entitlementDays,
      usedDays,
      pendingDays,
      remainingDays: Math.max(0, entitlementDays - usedDays - pendingDays),
    };
  });
}

export function calculateLeaveDays(
  input: LeaveRequestInput,
  options?: { holidays?: string[] },
): number {
  const start = new Date(`${input.startDate}T00:00:00`);
  const end = new Date(`${input.endDate}T00:00:00`);

  if (end < start) {
    throw new Error("End date must be on or after start date.");
  }

  return countWorkingDays(start, end, {
    weekendMode: "sat_sun",
    halfDay: input.halfDay,
    holidays: options?.holidays,
  });
}

export async function createLeaveRequest(input: LeaveRequestInput): Promise<string> {
  const session = await requireAuth();
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { assertLeaveTypeAllowed } = await import("@/lib/leave/allowlist");
  await assertLeaveTypeAllowed({ organizationId, employeeId, leaveTypeId: input.leaveTypeId });

  const { assertNoOverlappingLeave } = await import("@/lib/leave/overlap");
  await assertNoOverlappingLeave({
    organizationId,
    employeeId,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  const { loadLeaveHolidayDates } = await import("@/lib/leave/holidays");
  const holidays = await loadLeaveHolidayDates(organizationId);
  const days = calculateLeaveDays(input, { holidays });

  const { assertLeaveDatesAllowed } = await import("@/lib/leave/blackout");
  await assertLeaveDatesAllowed(organizationId, input.leaveTypeId, input.startDate, input.endDate);

  const { assertLeaveBalance } = await import("@/lib/leave/balance");
  await assertLeaveBalance({
    organizationId,
    employeeId,
    leaveTypeId: input.leaveTypeId,
    days,
  });

  const { data: leaveType } = await supabase
    .from("leave_types")
    .select("name")
    .eq("organization_id", organizationId)
    .eq("id", input.leaveTypeId)
    .maybeSingle();

  let attachmentFileName = null;
  if (input.attachmentFileId) {
    const { data: fileObj } = await supabase
      .from("file_objects")
      .select("file_name")
      .eq("organization_id", organizationId)
      .eq("id", input.attachmentFileId)
      .maybeSingle();
    attachmentFileName = fileObj?.file_name ?? null;
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      organization_id: organizationId,
      employee_id: employeeId,
      leave_type_id: input.leaveTypeId,
      start_date: input.startDate,
      end_date: input.endDate,
      half_day: input.halfDay,
      days,
      reason: input.reason ?? null,
      status: "draft",
      attachment_file_id: input.attachmentFileId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create leave request.");
  }

  await submitForApproval({
    organizationId,
    requesterEmployeeId: employeeId,
    requestType: "leave",
    sourceTable: "leave_requests",
    sourceId: data.id,
    actorUserId: session.user.id,
    payload: {
      leaveTypeName: leaveType?.name ?? "Leave",
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      reason: input.reason ?? null,
      attachmentFileId: input.attachmentFileId ?? null,
      attachmentFileName,
    },
  });

  const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
  await emitLeaveWebhook(
    organizationId,
    "leave.submitted",
    { requestId: data.id, employeeId, days },
    `leave-submitted:${data.id}`,
  );

  return data.id;
}

export async function cancelLeaveRequest(requestId: string, reason?: string): Promise<void> {
  const { employeeId, organizationId, session } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: request, error: fetchError } = await supabase
    .from("leave_requests")
    .select("id, status, approval_request_id, start_date, end_date, days")
    .eq("id", requestId)
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!request) throw new Error("Leave request not found.");

  if (request.status !== "pending" && request.status !== "draft") {
    throw new Error(`Cannot cancel a leave request with status "${request.status}". Only pending requests can be cancelled.`);
  }

  const nextStatus = transition(request.status as "pending" | "draft", "cancel");
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("leave_requests")
    .update({
      status: nextStatus,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  let approverEmployeeId: string | null = null;
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
        status: nextStatus,
        resolved_at: now,
        payload: {
          ...(typeof appReq?.payload === "object" && appReq?.payload !== null ? appReq.payload : {}),
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
      await supabase
        .from("approval_steps")
        .update({
          status: nextStatus,
          acted_at: now,
          comment: reason ? `Cancelled by employee: ${reason}` : "Cancelled by employee",
        })
        .eq("id", pendingStep.id);
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "leave.cancelled",
    resourceType: "leave",
    resourceId: requestId,
    metadata: { reason: reason ?? null, days: request.days },
  });

  if (approverEmployeeId) {
    const managerUserId = await resolveUserIdForEmployee(organizationId, approverEmployeeId);
    if (managerUserId) {
      await queueNotification({
        organizationId,
        recipientUserId: managerUserId,
        channel: "in_app",
        template: "approval.cancel",
        payload: {
          requestId: request.approval_request_id,
          requestType: "leave",
          sourceId: requestId,
          actorName: session.user.fullName || session.user.email || "Employee",
          reason: reason ?? null,
          href: `/employee/leave/${requestId}`,
        },
        idempotencyKey: `leave-cancelled-${requestId}`,
      });
    }
  }

  const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
  await emitLeaveWebhook(
    organizationId,
    "leave.cancelled",
    { requestId, employeeId, days: request.days, reason: reason ?? null },
    `leave-cancelled:${requestId}`,
  );
}

export async function revokeLeaveRequest(requestId: string, reason?: string): Promise<void> {
  const { employeeId, organizationId, session } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: request, error: fetchError } = await supabase
    .from("leave_requests")
    .select("id, status, approval_request_id, start_date, end_date, days")
    .eq("id", requestId)
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!request) throw new Error("Leave request not found.");

  if (request.status !== "approved") {
    throw new Error(`Cannot revoke a leave request with status "${request.status}". Only approved requests can be revoked.`);
  }

  const nextStatus = transition("approved", "revoke");
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("leave_requests")
    .update({
      status: nextStatus,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  let approverEmployeeId: string | null = null;
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
        status: nextStatus,
        resolved_at: now,
        payload: {
          ...(typeof appReq?.payload === "object" && appReq?.payload !== null ? appReq.payload : {}),
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
      await supabase
        .from("approval_steps")
        .update({
          comment: reason ? `Revoked by employee: ${reason}` : "Revoked by employee",
        })
        .eq("id", lastStep.id);
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "leave.revoked",
    resourceType: "leave",
    resourceId: requestId,
    metadata: { reason: reason ?? null, days: request.days },
  });

  if (approverEmployeeId) {
    const managerUserId = await resolveUserIdForEmployee(organizationId, approverEmployeeId);
    if (managerUserId) {
      await queueNotification({
        organizationId,
        recipientUserId: managerUserId,
        channel: "in_app",
        template: "approval.revoke",
        payload: {
          requestId: request.approval_request_id,
          requestType: "leave",
          sourceId: requestId,
          actorName: session.user.fullName || session.user.email || "Employee",
          reason: reason ?? null,
          href: `/employee/leave/${requestId}`,
        },
        idempotencyKey: `leave-revoked-${requestId}`,
      });
    }
  }

  const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
  await emitLeaveWebhook(
    organizationId,
    "leave.revoked",
    { requestId, employeeId, days: request.days, reason: reason ?? null },
    `leave-revoked:${requestId}`,
  );
}

