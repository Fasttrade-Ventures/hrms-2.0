import { queueNotification } from "@/lib/notifications/queue";

type ComplianceAudience = "employee" | "hr";

export async function queueDocumentComplianceNotice(input: {
  organizationId: string;
  recipientUserId: string;
  audience: ComplianceAudience;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<void> {
  const template =
    input.audience === "hr" ? "document_compliance_hr" : "document_compliance_employee";

  await Promise.all([
    queueNotification({
      organizationId: input.organizationId,
      recipientUserId: input.recipientUserId,
      channel: "email",
      template,
      payload: input.payload,
      idempotencyKey: `${input.idempotencyKey}:email`,
    }),
    queueNotification({
      organizationId: input.organizationId,
      recipientUserId: input.recipientUserId,
      channel: "in_app",
      template,
      payload: input.payload,
      idempotencyKey: `${input.idempotencyKey}:in_app`,
    }),
  ]);
}
