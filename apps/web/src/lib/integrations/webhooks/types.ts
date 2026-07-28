export const WEBHOOK_EVENT_TYPES = [
  "audit.*",
  "employee.created",
  "employee.updated",
  "employee.deactivated",
  "leave.submitted",
  "leave.approved",
  "leave.rejected",
  "payroll.payrun_locked",
  "recruitment.offer_accepted",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export type WebhookEndpoint = {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  secret: string;
  eventsFilter: string[];
  status: "active" | "inactive";
};

export type WebhookPayload = {
  event: string;
  occurredAt: string;
  organizationId: string;
  data: Record<string, unknown>;
};
