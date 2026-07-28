import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getSiemWebhookConfig, upsertSiemWebhookConfig } from "@/lib/audit/webhooks";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type AuditSettings = {
  retentionDays: number;
  archiveEnabled: boolean;
  siem: {
    url: string;
    secret: string;
    eventsFilter: string;
    enabled: boolean;
    configured: boolean;
  };
  archives: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    eventCount: number;
    createdAt: string;
  }>;
};

export async function getAuditSettings(): Promise<AuditSettings> {
  await requireRole("hr_administrator");
  await requireModule("audit");

  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const [{ data: org }, siem, { data: archives }] = await Promise.all([
    supabase
      .from("organizations")
      .select("audit_retention_days, audit_archive_enabled")
      .eq("id", organizationId)
      .maybeSingle(),
    getSiemWebhookConfig(organizationId),
    supabase
      .from("audit_event_archives")
      .select("id, period_start, period_end, event_count, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    retentionDays: org?.audit_retention_days ?? 2555,
    archiveEnabled: org?.audit_archive_enabled ?? false,
    siem: {
      url: siem?.url ?? "",
      secret: siem?.secret ? "••••••••" : "",
      eventsFilter: (siem?.eventsFilter ?? []).join(", "),
      enabled: siem?.enabled ?? false,
      configured: Boolean(siem?.url),
    },
    archives: (archives ?? []).map((row) => ({
      id: row.id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      eventCount: row.event_count,
      createdAt: row.created_at,
    })),
  };
}

export async function updateAuditRetentionSettings(input: {
  retentionDays: number;
  archiveEnabled: boolean;
}): Promise<void> {
  await requireRole("hr_administrator");
  await requireModule("audit");

  if (input.retentionDays < 365 || input.retentionDays > 3650) {
    throw new Error("Retention must be between 365 and 3650 days.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      audit_retention_days: input.retentionDays,
      audit_archive_enabled: input.archiveEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", getOrganizationId());

  if (error) throw new Error(error.message);
}

export async function updateSiemWebhookSettings(input: {
  url: string;
  secret: string;
  eventsFilter: string;
  enabled: boolean;
}): Promise<void> {
  await requireRole("hr_administrator");
  await requireModule("audit");
  await requireModule("integrations");

  const eventsFilter = input.eventsFilter
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const organizationId = getOrganizationId();
  const existing = await getSiemWebhookConfig(organizationId);
  const secret =
    input.secret && input.secret !== "••••••••"
      ? input.secret
      : existing?.secret ?? "";

  if (input.enabled && !input.url.trim()) {
    throw new Error("Webhook URL is required when SIEM delivery is enabled.");
  }

  await upsertSiemWebhookConfig(organizationId, {
    url: input.url.trim(),
    secret,
    eventsFilter,
    enabled: input.enabled,
  });
}
