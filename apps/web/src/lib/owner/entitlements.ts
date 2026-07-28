import type { ModuleKey, ProductTier } from "@hrms/platform";
import { CORE_MODULES, ENTERPRISE_MODULES, PROFESSIONAL_MODULES } from "@hrms/platform";

import { logAuditEvent } from "@/lib/audit/log-event";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type OwnerModuleSetting = {
  key: ModuleKey;
  label: string;
  tier: "Core" | "Professional" | "Enterprise";
  enabled: boolean;
  locked: boolean;
};

const MODULE_LABELS: Record<ModuleKey, string> = {
  announcements: "Announcements",
  calendar: "Calendar",
  documents: "Documents",
  assets: "Assets",
  performance: "Performance",
  payroll: "Payroll",
  ot: "Overtime",
  claims: "Claims",
  replacement: "Replacement credit",
  location: "GPS / location",
  import: "Bulk import",
  payouts: "Payouts",
  audit: "Audit",
  api: "API access",
  analytics: "Analytics",
  recruitment: "Recruitment",
  integrations: "Integrations",
};

function tierForModule(key: ModuleKey): OwnerModuleSetting["tier"] {
  if (ENTERPRISE_MODULES.includes(key)) return "Enterprise";
  if (PROFESSIONAL_MODULES.includes(key)) return "Professional";
  return "Core";
}

function defaultEnabledForTier(tier: ProductTier, key: ModuleKey): boolean {
  if (CORE_MODULES.includes(key)) return true;
  if (PROFESSIONAL_MODULES.includes(key)) return tier === "professional" || tier === "enterprise";
  if (ENTERPRISE_MODULES.includes(key)) return tier === "enterprise";
  return false;
}

export async function getOwnerEntitlementSettings(): Promise<{
  productTier: ProductTier;
  modules: OwnerModuleSetting[];
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("organizations")
    .select("product_tier, module_flags")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? "Organization not found.");

  const flags = (data.module_flags ?? {}) as Partial<Record<ModuleKey, boolean>>;
  const allModules = [...CORE_MODULES, ...PROFESSIONAL_MODULES, ...ENTERPRISE_MODULES];

  const modules = allModules.map((key) => {
    const defaultEnabled = defaultEnabledForTier(data.product_tier, key);
    const explicit = flags[key];
    return {
      key,
      label: MODULE_LABELS[key],
      tier: tierForModule(key),
      enabled: explicit === undefined ? defaultEnabled : explicit,
      locked: tierForModule(key) === "Core",
    };
  });

  return { productTier: data.product_tier, modules };
}

export async function updateOwnerModuleFlag(
  module: ModuleKey,
  enabled: boolean,
  actorUserId?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("organizations")
    .select("module_flags")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? "Organization not found.");

  const moduleFlags = {
    ...((data.module_flags ?? {}) as Record<string, boolean>),
    [module]: enabled,
  };

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ module_flags: moduleFlags, updated_at: new Date().toISOString() })
    .eq("id", organizationId);

  if (updateError) throw new Error(updateError.message);

  await logAuditEvent({
    actorUserId: actorUserId ?? null,
    action: "organization.module_flag_updated",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: { module, enabled },
  });
}

export async function updateOwnerProductTier(
  tier: ProductTier,
  actorUserId?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { error } = await supabase
    .from("organizations")
    .update({ product_tier: tier, updated_at: new Date().toISOString() })
    .eq("id", organizationId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: actorUserId ?? null,
    action: "organization.tier_updated",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: { tier },
  });
}
