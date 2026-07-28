import { createAdminClient } from "@/lib/supabase/admin";

import { matchesEventFilter } from "./sign";
import type { WebhookPayload } from "./types";

export async function listActiveWebhookEndpoints(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_endpoints")
    .select("id, organization_id, name, url, secret, events_filter, status")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    url: row.url,
    secret: row.secret ?? "",
    eventsFilter: row.events_filter ?? [],
    status: row.status as "active" | "inactive",
  }));
}

export async function queueWebhookEvent(input: {
  organizationId: string;
  eventType: string;
  payload: WebhookPayload;
  idempotencyKey: string;
}): Promise<void> {
  const endpoints = await listActiveWebhookEndpoints(input.organizationId);
  if (endpoints.length === 0) return;

  const admin = createAdminClient();

  for (const endpoint of endpoints) {
    if (!endpoint.url.trim()) continue;
    if (!matchesEventFilter(input.eventType, endpoint.eventsFilter)) continue;

    await admin.from("webhook_outbox").upsert(
      {
        organization_id: input.organizationId,
        endpoint_id: endpoint.id,
        event_type: input.eventType,
        payload: input.payload,
        destination_url: endpoint.url,
        status: "pending",
        idempotency_key: `${endpoint.id}:${input.idempotencyKey}`,
      },
      { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true },
    );
  }
}

export function buildWebhookPayload(input: {
  event: string;
  organizationId: string;
  data: Record<string, unknown>;
  occurredAt?: string;
}): WebhookPayload {
  return {
    event: input.event,
    organizationId: input.organizationId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    data: input.data,
  };
}
