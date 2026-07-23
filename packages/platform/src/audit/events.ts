export type AuditEvent = {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
};

export function createAuditEvent(
  input: Omit<AuditEvent, "occurredAt">,
): AuditEvent {
  return { ...input, occurredAt: new Date() };
}
