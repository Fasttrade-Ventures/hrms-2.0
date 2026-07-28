export type SiemWebhookConfig = {
  url: string;
  secret: string;
  eventsFilter: string[];
  enabled: boolean;
};

export function matchesSiemEventFilter(action: string, eventsFilter: string[]): boolean {
  if (eventsFilter.length === 0) return true;
  return eventsFilter.some((pattern) => {
    if (pattern.endsWith("*")) {
      return action.startsWith(pattern.slice(0, -1));
    }
    return action === pattern;
  });
}

export function buildSiemPayload(input: {
  eventId: string;
  organizationId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
}) {
  return {
    eventId: input.eventId,
    organizationId: input.organizationId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    actorUserId: input.actorUserId,
    metadata: input.metadata,
    occurredAt: input.occurredAt,
  };
}

export function computeArchiveCutoff(asOf: string, retentionDays: number): string {
  const date = new Date(`${asOf}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - retentionDays);
  return date.toISOString();
}
