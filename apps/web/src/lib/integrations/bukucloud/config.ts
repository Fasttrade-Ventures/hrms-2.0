import { createAdminClient } from "@/lib/supabase/admin";

import type { BukucloudConnectionConfig } from "./types";

const PROVIDER = "bukucloud";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

function parseConfig(raw: Record<string, unknown>): BukucloudConnectionConfig | null {
  const baseUrl = typeof raw.baseUrl === "string" ? raw.baseUrl.trim() : "";
  const apiKey = typeof raw.apiKey === "string" ? raw.apiKey.trim() : "";
  const signingKey = typeof raw.signingKey === "string" ? raw.signingKey.trim() : "";
  const bankAccountCode = typeof raw.bankAccountCode === "string" ? raw.bankAccountCode.trim() : "";

  if (!baseUrl || !apiKey || !signingKey || !bankAccountCode) return null;

  return {
    baseUrl,
    apiKey,
    signingKey,
    bankAccountCode,
    tenantLabel: typeof raw.tenantLabel === "string" ? raw.tenantLabel : undefined,
    autoSyncOnLock: raw.autoSyncOnLock === true,
    enabled: raw.enabled !== false,
  };
}

export type BukucloudSettingsView = {
  baseUrl: string;
  apiKey: string;
  signingKey: string;
  bankAccountCode: string;
  tenantLabel: string;
  autoSyncOnLock: boolean;
  enabled: boolean;
  configured: boolean;
};

export async function getBukucloudSettings(): Promise<BukucloudSettingsView> {
  const config = await getBukucloudConnectionConfig();
  return {
    baseUrl: config?.baseUrl ?? process.env.BUKUCLOUD_DEFAULT_BASE_URL ?? "",
    apiKey: config?.apiKey ? maskSecret(config.apiKey) : "",
    signingKey: config?.signingKey ? "••••••••" : "",
    bankAccountCode: config?.bankAccountCode ?? "",
    tenantLabel: config?.tenantLabel ?? "",
    autoSyncOnLock: config?.autoSyncOnLock ?? false,
    enabled: config?.enabled ?? false,
    configured: Boolean(config),
  };
}

export async function getBukucloudConnectionConfig(
  organizationId = getOrganizationId(),
): Promise<BukucloudConnectionConfig | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("integration_connections")
    .select("config, status")
    .eq("organization_id", organizationId)
    .eq("provider", PROVIDER)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  const config = parseConfig((data.config ?? {}) as Record<string, unknown>);
  if (!config?.enabled) return null;
  return config;
}

export async function upsertBukucloudConnection(input: {
  baseUrl: string;
  apiKey: string;
  signingKey: string;
  bankAccountCode: string;
  tenantLabel?: string;
  autoSyncOnLock: boolean;
  enabled: boolean;
}): Promise<void> {
  const organizationId = getOrganizationId();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("integration_connections")
    .select("id, config")
    .eq("organization_id", organizationId)
    .eq("provider", PROVIDER)
    .maybeSingle();

  const previous = (existing?.config ?? {}) as Record<string, unknown>;
  const apiKey =
    input.apiKey && !input.apiKey.includes("••••") ? input.apiKey : String(previous.apiKey ?? "");
  const signingKey =
    input.signingKey && input.signingKey !== "••••••••"
      ? input.signingKey
      : String(previous.signingKey ?? "");

  if (input.enabled && (!input.baseUrl.trim() || !apiKey || !signingKey || !input.bankAccountCode.trim())) {
    throw new Error("Base URL, API key, signing key, and bank account code are required when enabled.");
  }

  const payload = {
    organization_id: organizationId,
    provider: PROVIDER,
    status: input.enabled ? "active" : "inactive",
    config: {
      baseUrl: input.baseUrl.trim().replace(/\/+$/, ""),
      apiKey,
      signingKey,
      bankAccountCode: input.bankAccountCode.trim(),
      tenantLabel: input.tenantLabel?.trim() || null,
      autoSyncOnLock: input.autoSyncOnLock,
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

function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 8)}••••`;
}
