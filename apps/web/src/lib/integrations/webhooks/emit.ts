import { buildWebhookPayload, queueWebhookEvent } from "@/lib/integrations/webhooks/dispatch";

export async function emitEmployeeWebhook(
  organizationId: string,
  event: "employee.created" | "employee.updated" | "employee.deactivated",
  data: Record<string, unknown>,
  idempotencyKey: string,
): Promise<void> {
  await queueWebhookEvent({
    organizationId,
    eventType: event,
    idempotencyKey,
    payload: buildWebhookPayload({ event, organizationId, data }),
  });
}

export async function emitLeaveWebhook(
  organizationId: string,
  event: "leave.submitted" | "leave.approved" | "leave.rejected",
  data: Record<string, unknown>,
  idempotencyKey: string,
): Promise<void> {
  await queueWebhookEvent({
    organizationId,
    eventType: event,
    idempotencyKey,
    payload: buildWebhookPayload({ event, organizationId, data }),
  });
}

export async function emitPayrollWebhook(
  organizationId: string,
  event: "payroll.payrun_locked",
  data: Record<string, unknown>,
  idempotencyKey: string,
): Promise<void> {
  await queueWebhookEvent({
    organizationId,
    eventType: event,
    idempotencyKey,
    payload: buildWebhookPayload({ event, organizationId, data }),
  });
}

export async function emitRecruitmentWebhook(
  organizationId: string,
  event: "recruitment.offer_accepted",
  data: Record<string, unknown>,
  idempotencyKey: string,
): Promise<void> {
  await queueWebhookEvent({
    organizationId,
    eventType: event,
    idempotencyKey,
    payload: buildWebhookPayload({ event, organizationId, data }),
  });
}
