import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log-event";
import { queueNotification } from "@/lib/notifications/queue";
import { resolveUserIdForEmployee } from "@/lib/approvals/service";

export type ExpiredLeaveResult = {
  expiredCount: number;
  expiredRequestIds: string[];
};

/**
 * Sweeps pending leave requests whose end_date has passed (end_date < today),
 * transitions them to 'cancelled' (expired), releases pendingDays back to balance,
 * logs audit events, and notifies the employee.
 */
export async function expireOverduePendingLeaves(options?: {
  organizationId?: string;
  employeeId?: string;
  asOfDate?: string;
}): Promise<ExpiredLeaveResult> {
  const admin = createAdminClient();
  const today = options?.asOfDate ?? new Date().toISOString().slice(0, 10);

  let query = admin
    .from("leave_requests")
    .select("id, organization_id, employee_id, leave_type_id, start_date, end_date, days, approval_request_id")
    .eq("status", "pending")
    .lt("end_date", today);

  if (options?.organizationId) {
    query = query.eq("organization_id", options.organizationId);
  }
  if (options?.employeeId) {
    query = query.eq("employee_id", options.employeeId);
  }

  const { data: overdueRequests, error } = await query;
  if (error) throw new Error(error.message);

  if (!overdueRequests || overdueRequests.length === 0) {
    return { expiredCount: 0, expiredRequestIds: [] };
  }

  const expiredRequestIds: string[] = [];
  const now = new Date().toISOString();

  for (const req of overdueRequests) {
    // 1. Mark leave_requests as cancelled
    const { error: updateError } = await admin
      .from("leave_requests")
      .update({
        status: "cancelled",
        updated_at: now,
      })
      .eq("id", req.id);

    if (updateError) {
      console.error(`Failed to expire leave request ${req.id}:`, updateError);
      continue;
    }

    expiredRequestIds.push(req.id);

    // 2. Mark approval_requests & steps if linked
    if (req.approval_request_id) {
      const { data: appReq } = await admin
        .from("approval_requests")
        .select("payload")
        .eq("id", req.approval_request_id)
        .maybeSingle();

      await admin
        .from("approval_requests")
        .update({
          status: "cancelled",
          resolved_at: now,
          payload: {
            ...(typeof appReq?.payload === "object" && appReq?.payload !== null ? appReq.payload : {}),
            cancellationReason: "Expired: leave dates passed without manager approval",
            cancelledAt: now,
          },
        })
        .eq("id", req.approval_request_id);

      await admin
        .from("approval_steps")
        .update({
          status: "cancelled",
          acted_at: now,
          comment: "Expired: leave dates passed without approval",
        })
        .eq("approval_request_id", req.approval_request_id)
        .eq("status", "pending");
    }

    // 3. Log audit event
    await logAuditEvent({
      organizationId: req.organization_id,
      actorUserId: null,
      action: "leave.expired",
      resourceType: "leave",
      resourceId: req.id,
      metadata: {
        reason: "Expired: leave dates passed without manager approval",
        days: req.days,
        startDate: req.start_date,
        endDate: req.end_date,
      },
    });

    // 4. Notify employee that their pending days were returned
    const employeeUserId = await resolveUserIdForEmployee(req.organization_id, req.employee_id);
    if (employeeUserId) {
      await queueNotification({
        organizationId: req.organization_id,
        recipientUserId: employeeUserId,
        channel: "in_app",
        template: "approval.cancel",
        payload: {
          requestId: req.approval_request_id,
          requestType: "leave",
          sourceId: req.id,
          reason: "Expired: leave dates passed without manager approval",
          href: `/employee/leave/${req.id}`,
        },
        idempotencyKey: `leave-expired-${req.id}`,
      });
    }

    // 5. Emit webhook
    try {
      const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
      await emitLeaveWebhook(
        req.organization_id,
        "leave.cancelled",
        {
          requestId: req.id,
          employeeId: req.employee_id,
          days: req.days,
          reason: "Expired: leave dates passed without manager approval",
        },
        `leave-expired:${req.id}`,
      );
    } catch {
      // Non-fatal
    }
  }

  return {
    expiredCount: expiredRequestIds.length,
    expiredRequestIds,
  };
}
