import { createHmac } from "node:crypto";

import { buildSiemPayload, matchesSiemEventFilter, type SiemWebhookConfig } from "@/lib/audit/siem";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_WEBHOOK_ATTEMPTS = 5;

export async function getSiemWebhookConfig(organizationId: string): Promise<SiemWebhookConfig | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("integration_connections")
    .select("config, status")
    .eq("organization_id", organizationId)
    .eq("provider", "siem")
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const config = (data.config ?? {}) as Record<string, unknown>;
  const url = typeof config.url === "string" ? config.url.trim() : "";
  const secret = typeof config.secret === "string" ? config.secret : "";
  const eventsFilter = Array.isArray(config.eventsFilter)
    ? config.eventsFilter.filter((value): value is string => typeof value === "string")
    : [];

  if (!url) return null;

  return {
    url,
    secret,
    eventsFilter,
    enabled: config.enabled !== false,
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
  const config = await getSiemWebhookConfig(input.organizationId);
  if (!config?.enabled) return;
  if (!matchesSiemEventFilter(input.action, config.eventsFilter)) return;

  const admin = createAdminClient();
  const payload = buildSiemPayload(input);

  await admin.from("webhook_outbox").upsert(
    {
      organization_id: input.organizationId,
      event_type: "audit",
      payload,
      destination_url: config.url,
      status: "pending",
      idempotency_key: `audit:${input.eventId}`,
    },
    { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true },
  );
}

export async function processWebhookOutbox(limit = 25): Promise<{ processed: number; sent: number; failed: number }> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("webhook_outbox")
    .select("id, organization_id, payload, destination_url, attempts")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);

  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const config = await getSiemWebhookConfig(row.organization_id);
    const secret = config?.secret ?? "";

    try {
      const body = JSON.stringify(row.payload);
      const signature = secret
        ? createHmac("sha256", secret).update(body).digest("hex")
        : "";

      const response = await fetch(row.destination_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "X-HRMS-Signature": `sha256=${signature}` } : {}),
        },
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
    .from("integration_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider", "siem")
    .maybeSingle();

  const payload = {
    organization_id: organizationId,
    provider: "siem",
    status: input.enabled && input.url ? "active" : "inactive",
    config: {
      url: input.url,
      secret: input.secret,
      eventsFilter: input.eventsFilter,
      enabled: input.enabled,
    },
  };

  if (existing) {
    const { error } = await admin.from("integration_connections").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("integration_connections").insert(payload);
  if (error) throw new Error(error.message);
}
