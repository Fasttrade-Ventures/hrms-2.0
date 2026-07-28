import { createHmac } from "node:crypto";

import { buildSiemPayload, type SiemWebhookConfig } from "@/lib/audit/siem";
import { buildWebhookSignatureHeader } from "@/lib/integrations/webhooks/sign";
import { buildWebhookPayload, queueWebhookEvent } from "@/lib/integrations/webhooks/dispatch";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_WEBHOOK_ATTEMPTS = 5;

export async function getSiemWebhookConfig(organizationId: string): Promise<SiemWebhookConfig | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_endpoints")
    .select("url, secret, events_filter, status")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    url: data.url,
    secret: data.secret ?? "",
    eventsFilter: data.events_filter ?? [],
    enabled: data.status === "active",
  };
}

export async function queueAuditSiemWebhook(input: {
  organizationId: string;
  eventId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
}): Promise<void> {
  await queueWebhookEvent({
    organizationId: input.organizationId,
    eventType: `audit.${input.action}`,
    idempotencyKey: `audit:${input.eventId}`,
    payload: buildWebhookPayload({
      event: `audit.${input.action}`,
      organizationId: input.organizationId,
      occurredAt: input.occurredAt,
      data: buildSiemPayload(input),
    }),
  });
}

export async function processWebhookOutbox(limit = 25): Promise<{ processed: number; sent: number; failed: number }> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("webhook_outbox")
    .select("id, organization_id, payload, destination_url, attempts, endpoint_id")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);

  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    let secret = "";
    if (row.endpoint_id) {
      const { data: endpoint } = await admin
        .from("webhook_endpoints")
        .select("secret")
        .eq("id", row.endpoint_id)
        .maybeSingle();
      secret = endpoint?.secret ?? "";
    } else {
      const legacy = await getSiemWebhookConfig(row.organization_id);
      secret = legacy?.secret ?? "";
    }

    try {
      const body = JSON.stringify(row.payload);
      const timestamp = String(Date.now());
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) {
        headers["X-HRMS-Timestamp"] = timestamp;
        headers["X-HRMS-Signature"] = buildWebhookSignatureHeader(secret, body, timestamp);
      }

      const response = await fetch(row.destination_url, {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      await admin
        .from("webhook_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: row.attempts + 1,
          last_error: null,
        })
        .eq("id", row.id);
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const message = error instanceof Error ? error.message : "Webhook delivery failed";
      await admin
        .from("webhook_outbox")
        .update({
          status: attempts >= MAX_WEBHOOK_ATTEMPTS ? "failed" : "pending",
          attempts,
          last_error: message,
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return { processed: rows?.length ?? 0, sent, failed };
}

export async function upsertSiemWebhookConfig(
  organizationId: string,
  input: { url: string; secret: string; eventsFilter: string[]; enabled: boolean },
): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("webhook_endpoints")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "SIEM")
    .maybeSingle();

  if (existing) {
    const update: Record<string, unknown> = {
      name: "SIEM",
      url: input.url,
      events_filter: input.eventsFilter.length > 0 ? input.eventsFilter : ["audit.*"],
      status: input.enabled && input.url ? "active" : "inactive",
      updated_at: new Date().toISOString(),
    };
    if (input.secret) update.secret = input.secret;
    const { error } = await admin.from("webhook_endpoints").update(update).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("webhook_endpoints").insert({
    organization_id: organizationId,
    name: "SIEM",
    url: input.url,
    secret: input.secret || createHmac("sha256", organizationId).update("siem").digest("hex").slice(0, 32),
    events_filter: input.eventsFilter.length > 0 ? input.eventsFilter : ["audit.*"],
    status: input.enabled && input.url ? "active" : "inactive",
  });
  if (error) throw new Error(error.message);
}
